// red_flag.js  (@scout/contracts)
// -----------------------------------------------------------------------------
// FROZEN CONTRACT (logic). Pure function: Quote + market benchmark -> risk_flag.
// Returns exactly one of the risk_flag enum values from schemas/quote.json:
//   "verified" | "caution" | "high_risk"
//
// Two independent risk sources are combined; the WORST wins:
//   1) Fraud signals - any explicit fraud signal on the quote => high_risk
//                      (these come from @scout/vertical-config fraud_rules).
//   2) Price sanity  - a quote priced FAR BELOW the benchmark is
//                      "too good to be true": >= thresholdPercent below => high_risk;
//                      a milder discount (>= half the threshold) => caution.
//
// Pure: never mutates inputs.
// -----------------------------------------------------------------------------

import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { effectiveMonthlyCost } from './effective_cost.js';

// Default matches @scout/vertical-config -> red_flag_threshold_percent.
// Callers that load the config should pass it explicitly.
const DEFAULT_THRESHOLD_PERCENT = 30;

/**
 * Classify a quote's risk.
 * @param {object} quote - shape matches schemas/quote.json
 * @param {number} benchmark - market effective monthly cost for a comparable unit
 * @param {number} [thresholdPercent=30] - config red_flag_threshold_percent
 * @returns {"verified"|"caution"|"high_risk"}
 */
export function riskFlag(quote, benchmark, thresholdPercent = DEFAULT_THRESHOLD_PERCENT) {
  if (!quote || typeof quote !== 'object') {
    throw new TypeError('riskFlag: quote object is required');
  }

  // 1) Fraud signals are decisive.
  const signals = Array.isArray(quote.fraud_signals) ? quote.fraud_signals : [];
  if (signals.length > 0) {
    return 'high_risk';
  }

  // 2) Price-sanity check. Skip if we have no usable benchmark.
  if (!Number.isFinite(Number(benchmark)) || Number(benchmark) <= 0) {
    return 'verified';
  }

  // Prefer the precomputed value; recompute if absent so the check never
  // silently no-ops on a partially-filled quote.
  const effective = Number.isFinite(Number(quote.effective_monthly_cost))
    ? Number(quote.effective_monthly_cost)
    : effectiveMonthlyCost(quote);

  // How far below benchmark is this quote? Positive = cheaper than market.
  const percentBelow = ((benchmark - effective) / benchmark) * 100;

  if (percentBelow >= thresholdPercent) {
    return 'high_risk';
  }
  if (percentBelow >= thresholdPercent / 2) {
    return 'caution';
  }
  return 'verified';
}

// -----------------------------------------------------------------------------
// Unit-test examples (runnable: `node src/red_flag.js`)
// -----------------------------------------------------------------------------
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const BENCHMARK = 14000;

  // A: normal quote near benchmark => verified
  assert.strictEqual(riskFlag({ effective_monthly_cost: 13500, fraud_signals: [] }, BENCHMARK), 'verified');

  // B: 39% below benchmark (8500 vs 14000) => high_risk (too good to be true)
  assert.strictEqual(riskFlag({ effective_monthly_cost: 8500, fraud_signals: [] }, BENCHMARK), 'high_risk');

  // C: any fraud signal overrides everything => high_risk
  assert.strictEqual(
    riskFlag({ effective_monthly_cost: 13500, fraud_signals: ['pre_visit_deposit'] }, BENCHMARK),
    'high_risk'
  );

  // D: mild discount (~18% below: 11500 vs 14000) => caution
  assert.strictEqual(riskFlag({ effective_monthly_cost: 11500, fraud_signals: [] }, BENCHMARK), 'caution');

  console.log('red_flag.js: all examples passed');
}
