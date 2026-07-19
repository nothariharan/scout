// negotiation-service.js
// The backend service behind the mid-call tool API + agent webhooks. Holds the
// confirmed RequirementSpec (intake), call sessions, the confirmed-quotes store
// (real leverage), and every assessed quote (for the report). Emits lifecycle
// events so the UI's live activity feed can subscribe.

import { EventEmitter } from 'node:events';
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
import { discoverCandidates } from '../discovery/places-client.js';
import { resolveBenchmark } from '../benchmark/benchmark-service.js';

/**
 * @param {object} args
 * @param {object} [args.requirement] - initial RequirementSpec (optional; set via intake)
 * @param {object} [args.benchmark] - area benchmark { effective_monthly, source }
 * @param {Object} [args.fallbackByPincode] - benchmark fallback for refreshBenchmark()
 */
export function createNegotiationService({ requirement, benchmark, fallbackByPincode = {} } = {}) {
  const sessions = createCallSessionStore();
  const store = createQuotesStore(); // itemized, non-fraud quotes => real leverage
  const events = new EventEmitter();
  events.setMaxListeners(0); // many SSE subscribers is fine

  let assessedQuotes = []; // every closed call with fields => the report
  let currentRequirement = requirement ?? null;
  let currentBenchmark = benchmark ?? null;
  let reqCounter = requirement ? 1 : 0;
  let requirementId = requirement ? 'req_1' : null;

  const benchmarkValue = () => currentBenchmark?.effective_monthly ?? undefined;
  const emit = (type, payload) => events.emit('event', { type, at: new Date().toISOString(), ...payload });

  // --- Intake -----------------------------------------------------------------
  /** Confirm a RequirementSpec (reused verbatim across every call). */
  function setRequirement(spec) {
    if (!spec || typeof spec !== 'object') throw new Error('setRequirement: spec object required');
    reqCounter += 1;
    requirementId = `req_${reqCounter}`;
    currentRequirement = spec;
    emit('requirement_confirmed', { requirement_id: requirementId });
    return { id: requirementId, spec };
  }
  function getRequirement() {
    return currentRequirement ? { id: requirementId, spec: currentRequirement } : null;
  }
  /** Re-resolve the area benchmark for the current requirement (Tavily/fallback). */
  async function refreshBenchmark() {
    if (!currentRequirement) return currentBenchmark;
    currentBenchmark = await resolveBenchmark(currentRequirement, { fallbackByPincode });
    emit('benchmark_updated', { benchmark: currentBenchmark });
    return currentBenchmark;
  }
  const getBenchmark = () => currentBenchmark;

  // --- Discovery --------------------------------------------------------------
  /** Build the call list (Google Places + commute geofence). */
  async function discover() {
    const result = await discoverCandidates({
      location: currentRequirement?.location,
      dealType: currentRequirement?.deal_type ?? 'pg',
    });
    return { requirement_id: requirementId, ...result };
  }

  // --- Calls ------------------------------------------------------------------
  function startCall(candidate) {
    const session = sessions.create(candidate);
    emit('call_started', {
      call_id: session.call_id,
      listing_id: session.listing_id,
      listing_name: session.listing_name,
      state: session.state,
    });
    return session;
  }

  function writeQuoteFields(callId, fields) {
    const session = sessions.patchFields(callId, fields);
    emit('quote_updated', { call_id: callId, listing_id: session.listing_id, rawFields: session.rawFields });
    return session;
  }

  function listCalls() {
    return sessions.all().map((s) => ({
      call_id: s.call_id,
      listing_id: s.listing_id,
      listing_name: s.listing_name,
      state: s.state,
      seller_language: s.seller_language,
      outcome: s.outcome,
      quote: assessedQuotes.find((q) => q.listing_id === s.listing_id) ?? null,
    }));
  }

  function getCall(callId) {
    const s = sessions.get(callId);
    if (!s) return null;
    return { ...s, quote: assessedQuotes.find((q) => q.listing_id === s.listing_id) ?? null };
  }

  /** Mid-call: what REAL leverage can the Negotiator cite for this listing? */
  function getLeverage(callId) {
    const session = callId ? sessions.get(callId) : null;
    const targetQuote = session ? { listing_id: session.listing_id, ...session.rawFields } : undefined;
    return buildLeverage({ store, benchmark: currentBenchmark, targetQuote });
  }

  /** Call-start personalization webhook: return conversation_initiation_client_data. */
  function personalize({ call_sid } = {}) {
    const session = call_sid ? sessions.getByCallSid(call_sid) : null;
    return buildInitiationData(currentRequirement ?? {}, {
      callId: session?.call_id ?? null,
      listingId: session?.listing_id ?? null,
    });
  }

  /** Associate an ElevenLabs conversation id with a session (post-call matching). */
  function linkConversation(callId, conversationId) {
    return sessions.linkConversation(callId, conversationId);
  }

  /** Post-call webhook: attach transcript + recording evidence; recover fields. */
  async function ingestPostCall(event = {}) {
    const data = event?.data ?? {};
    const conversationId = data.conversation_id;
    const session = conversationId ? sessions.getByConversationId(conversationId) : null;
    if (!session) return { ok: true, matched: false };

    const transcriptText = extractTranscript(data);
    sessions.appendTranscript(session.call_id, transcriptText);

    // Attach evidence links when the webhook provides them.
    const evidence = {};
    const recordingUrl = data.recording_url ?? data.metadata?.recording_url;
    const transcriptUrl = data.transcript_url ?? data.metadata?.transcript_url;
    if (recordingUrl) evidence.recording_url = recordingUrl;
    if (transcriptUrl) evidence.transcript_url = transcriptUrl;
    if (Object.keys(evidence).length) sessions.patchFields(session.call_id, evidence);

    // If nothing was captured mid-call, recover structured fields from the
    // transcript (OpenAI Structured Outputs when keyed; regex fallback keyless).
    if (session.rawFields.base_rent == null && transcriptText) {
      const parsed = await parseTranscriptToQuote(transcriptText, { listingId: session.listing_id });
      sessions.patchFields(session.call_id, parsed);
    }

    emit('transcript_ingested', { call_id: session.call_id, listing_id: session.listing_id });
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
      emit('call_closed', { call_id: callId, listing_id: session.listing_id, outcome, quote: null });
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
    const risk = assessRisk({ quote, transcript: session.transcript, benchmark: benchmarkValue() });
    quote = { ...quote, ...risk };

    assessedQuotes = [...assessedQuotes, quote]; // appears in the report

    // Only real, non-fraud itemized quotes become citable leverage.
    if (outcome?.status === 'itemized_quote' && quote.risk_flag !== 'high_risk') {
      store.addConfirmed(quote);
    }

    emit('call_closed', { call_id: callId, listing_id: session.listing_id, outcome, quote });
    return { session: sessions.get(callId), quote };
  }

  /** Ranked comparison + plain-language recommendation across all calls. */
  async function report() {
    const ranked = rankQuotes(assessedQuotes, { requirement: currentRequirement });
    const recommendation = await generateRecommendation(ranked, currentRequirement);
    return { requirement_id: requirementId, ranked, recommendation, benchmark: currentBenchmark };
  }

  return {
    setRequirement,
    getRequirement,
    refreshBenchmark,
    getBenchmark,
    discover,
    startCall,
    writeQuoteFields,
    listCalls,
    getCall,
    getLeverage,
    personalize,
    linkConversation,
    ingestPostCall,
    closeCall,
    report,
    events,
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
