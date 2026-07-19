// negotiation-service.js
// The backend service behind the mid-call tool API. Holds call sessions, the
// confirmed-quotes store (real leverage), and every assessed quote (for the
// report). Resolves benchmark + leverage on demand for the Negotiator.

import { createCallSessionStore } from '../calls/call-session.js';
import { createQuotesStore } from '../store/quotes-store.js';
import { normalizeQuote } from '../normalize/normalize-quote.js';
import { assessRisk } from '../risk/risk-service.js';
import { capturePriceDrop } from '../negotiation/price-drop.js';
import { buildLeverage } from '../leverage/leverage-builder.js';
import { rankQuotes } from '../ranking/rank-quotes.js';
import { generateRecommendation } from '../transcripts/recommend.js';

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

  /** Snapshot for the web live-activity ledger. */
  function listCalls() {
    return sessions.all();
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

  /** Finalize a call into a structured outcome; assess + record the quote. */
  function closeCall(callId, outcome) {
    const session = sessions.get(callId);
    if (!session) throw new Error(`unknown call ${callId}`);
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

  return { startCall, listCalls, writeQuoteFields, getLeverage, closeCall, report, sessions, store };
}
