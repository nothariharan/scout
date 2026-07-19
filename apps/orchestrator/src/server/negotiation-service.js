// negotiation-service.js
// The backend service behind the mid-call tool API + agent webhooks. Holds call
// sessions, the confirmed-quotes store (real leverage), and every assessed quote
// (for the report). Resolves benchmark + leverage on demand for the Negotiator.

import { createCallSessionStore } from '../calls/call-session.js';
import { createQuotesStore } from '../store/quotes-store.js';
import { normalizeQuote } from '../normalize/normalize-quote.js';
import { assessRisk } from '../risk/risk-service.js';
import { capturePriceDrop } from '../negotiation/price-drop.js';
import { buildLeverage } from '../leverage/leverage-builder.js';
import { rankQuotes } from '../ranking/rank-quotes.js';
import { generateRecommendation } from '../transcripts/recommend.js';
import { buildInitiationData } from '../agent/initiation-data.js';
import { parseTranscriptToQuote } from '../transcripts/parse-transcript.js';
import { isValidOutcome, CALL_OUTCOME_STATUSES } from '../outcomes/call-outcome.js';

/**
 * @param {object} args
 * @param {object} args.requirement - RequirementSpec (reused across all calls)
 * @param {object} [args.benchmark] - area benchmark { effective_monthly, source }
 */
export function createNegotiationService({ requirement, benchmark } = {}) {
  const sessions = createCallSessionStore();
  const store = createQuotesStore(); // itemized, non-fraud quotes => real leverage
  let assessedQuotes = []; // every closed call with fields => the report
  const benchmarkValue = benchmark?.effective_monthly ?? undefined;

  /** Start a call session for one discovered candidate. */
  function startCall(candidate) {
    return sessions.create(candidate);
  }

  /** Mid-call: agent writes structured fields into the session (immutable). */
  function writeQuoteFields(callId, fields) {
    return sessions.patchFields(callId, fields);
  }

  /** Mid-call: what REAL leverage can the Negotiator cite for this listing? */
  function getLeverage(callId) {
    const session = callId ? sessions.get(callId) : null;
    const targetQuote = session
      ? { listing_id: session.listing_id, ...session.rawFields }
      : undefined;
    return buildLeverage({ store, benchmark, targetQuote });
  }

  /** Call-start personalization webhook: return conversation_initiation_client_data. */
  function personalize({ call_sid } = {}) {
    const session = call_sid ? sessions.getByCallSid(call_sid) : null;
    return buildInitiationData(requirement, {
      callId: session?.call_id ?? null,
      listingId: session?.listing_id ?? null,
    });
  }

  /** Associate an ElevenLabs conversation id with a session (post-call matching). */
  function linkConversation(callId, conversationId) {
    return sessions.linkConversation(callId, conversationId);
  }

  /** Post-call webhook: attach transcript evidence + recover fields via OpenAI. */
  async function ingestPostCall(event = {}) {
    const data = event?.data ?? {};
    const conversationId = data.conversation_id;
    const session = conversationId ? sessions.getByConversationId(conversationId) : null;
    if (!session) return { ok: true, matched: false };

    const transcriptText = extractTranscript(data);
    sessions.appendTranscript(session.call_id, transcriptText);

    // If nothing was captured mid-call, recover structured fields from the
    // transcript (OpenAI Structured Outputs when keyed; regex fallback keyless).
    if (session.rawFields.base_rent == null && transcriptText) {
      const parsed = await parseTranscriptToQuote(transcriptText, { listingId: session.listing_id });
      sessions.patchFields(session.call_id, parsed);
    }

    return { ok: true, matched: true, call_id: session.call_id };
  }

  /** Finalize a call into a structured outcome; assess + record the quote. */
  function closeCall(callId, outcome) {
    const session = sessions.get(callId);
    if (!session) throw new Error(`unknown call ${callId}`);

    // Enforce the 3-outcome contract: every call ends itemized / callback / declined.
    if (!isValidOutcome(outcome)) {
      throw new Error(`invalid call outcome; must be one of ${CALL_OUTCOME_STATUSES.join(', ')}`);
    }
    if ((outcome.status === 'callback_scheduled' || outcome.status === 'declined') && !outcome.reason) {
      throw new Error(`call outcome '${outcome.status}' requires a reason`);
    }

    sessions.setOutcome(callId, outcome);

    // No pricing captured (e.g. pure callback) => nothing to score.
    if (session.rawFields.base_rent == null) {
      return { session: sessions.get(callId), quote: null };
    }

    let quote = normalizeQuote({
      ...session.rawFields,
      seller_language: session.seller_language,
      listing_name: session.listing_name,
      call_outcome: outcome,
    });

    // Price-drop capture (money-shot) if both endpoints were written mid-call.
    if (session.rawFields.first_quoted_effective != null && session.rawFields.final_quoted_effective != null) {
      const drop = capturePriceDrop({
        firstEffective: session.rawFields.first_quoted_effective,
        finalEffective: session.rawFields.final_quoted_effective,
        evidenceLine: session.rawFields.price_drop_evidence,
      });
      quote = { ...quote, ...drop };
    }

    // Risk from transcript fraud scan + below-benchmark check.
    const risk = assessRisk({ quote, transcript: session.transcript, benchmark: benchmarkValue });
    quote = { ...quote, ...risk };

    assessedQuotes = [...assessedQuotes, quote]; // appears in the report

    // Only real, non-fraud itemized quotes become citable leverage.
    if (outcome?.status === 'itemized_quote' && quote.risk_flag !== 'high_risk') {
      store.addConfirmed(quote);
    }

    return { session: sessions.get(callId), quote };
  }

  /** Ranked comparison + plain-language recommendation across all calls. */
  async function report() {
    const ranked = rankQuotes(assessedQuotes, { requirement });
    const recommendation = await generateRecommendation(ranked, requirement);
    return { ranked, recommendation, benchmark };
  }

  return {
    startCall,
    writeQuoteFields,
    getLeverage,
    personalize,
    linkConversation,
    ingestPostCall,
    closeCall,
    report,
    sessions,
    store,
  };
}

// Flatten an ElevenLabs post-call transcript array into plain text.
function extractTranscript(data) {
  const turns = Array.isArray(data.transcript) ? data.transcript : [];
  return turns
    .map((turn) => turn?.message ?? turn?.text ?? '')
    .filter(Boolean)
    .join(' ')
    .trim();
}
