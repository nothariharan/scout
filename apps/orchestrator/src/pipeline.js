// pipeline.js
// Run one requirement's worth of completed calls through the backend:
//   normalize -> price-drop capture -> risk assessment -> store -> rank -> recommend.
// `calls` is an array of already-extracted inputs (raw fields + transcript).

import { normalizeQuote } from './normalize/normalize-quote.js';
import { assessRisk } from './risk/risk-service.js';
import { capturePriceDrop } from './negotiation/price-drop.js';
import { rankQuotes } from './ranking/rank-quotes.js';
import { generateRecommendation } from './transcripts/recommend.js';
import { createQuotesStore } from './store/quotes-store.js';

/**
 * @param {object} args
 * @param {object} args.requirement - RequirementSpec
 * @param {object[]} args.calls - per-call inputs: { rawFields|..., transcript?, firstEffective?, finalEffective?, evidenceLine? }
 * @param {object} [args.benchmark] - area benchmark { effective_monthly }
 * @returns {Promise<{ranked:object[], recommendation:object, store:object}>}
 */
export async function runComparison({ requirement, calls, benchmark } = {}) {
  const store = createQuotesStore();
  const benchmarkValue = benchmark?.effective_monthly ?? undefined;

  const normalized = [];
  for (const call of calls ?? []) {
    let quote = normalizeQuote(call.rawFields ?? call);

    // Price-drop capture (money-shot) when both endpoints are provided.
    if (call.firstEffective != null && call.finalEffective != null) {
      const drop = capturePriceDrop({
        firstEffective: call.firstEffective,
        finalEffective: call.finalEffective,
        evidenceLine: call.evidenceLine,
      });
      quote = { ...quote, ...drop };
    }

    // Risk assessment from transcript fraud scan + below-benchmark check.
    const risk = assessRisk({ quote, transcript: call.transcript ?? '', benchmark: benchmarkValue });
    quote = { ...quote, ...risk };

    normalized.push(quote);

    // Only real itemized quotes become confirmed leverage.
    if (quote.call_outcome?.status === 'itemized_quote' && quote.risk_flag !== 'high_risk') {
      store.addConfirmed(quote);
    }
  }

  const ranked = rankQuotes(normalized, { requirement });
  const recommendation = await generateRecommendation(ranked, requirement);
  return { ranked, recommendation, store };
}
