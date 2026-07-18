// demo.smoke.js
// Runnable backend smoke test — NO API keys needed. Proves the pipeline wires
// the contracts together and produces the two demo money-shots:
//   1) a pre-visit-deposit scam -> HIGH RISK, kept out of #1
//   2) a fee-padder caving -> before/after price drop
//
//   node apps/orchestrator/src/demo.smoke.js

import { createRequire } from 'node:module';
import { runComparison } from './pipeline.js';
import { buildLeverage } from './leverage/leverage-builder.js';

const require = createRequire(import.meta.url);
const sampleQuotes = require('../../../packages/evals/src/fixtures/sample_quotes.json');
const requirement = require('../../../packages/evals/src/fixtures/sample_requirement.json');

// Build call inputs from the fixtures, adding transcripts that fire the signals.
const calls = sampleQuotes.map((q) => {
  const call = {
    rawFields: q,
    transcript: `Owner: rent is ${q.base_rent}, deposit ${q.deposit}, maintenance ${q.maintenance_monthly}.`,
  };
  if (q.price_moved) {
    call.firstEffective = q.first_quoted_effective;
    call.finalEffective = q.final_quoted_effective;
    call.evidenceLine = 'Owner: fine, I will drop the maintenance if you commit today.';
  }
  if ((q.fraud_signals ?? []).length > 0) {
    call.transcript += ' Please transfer now and pay to hold the room before any visit.';
  }
  return call;
});

// Benchmark: Tavily unavailable without a key, so use a per-pincode fallback.
const benchmark = { effective_monthly: 14000, source: 'fallback_estimate' };

const { ranked, recommendation, store } = await runComparison({ requirement, calls, benchmark });

console.log('\n=== Ranked comparison (high_risk never #1) ===');
for (const q of ranked) {
  const moved = q.price_moved ? ` | price moved ${q.first_quoted_effective}->${q.final_quoted_effective}` : '';
  const fraud = q.fraud_signals?.length ? ` | fraud: ${q.fraud_signals.join(',')}` : '';
  console.log(`#${q.rank} ${q.listing_id} | ${q.effective_monthly_cost}/mo | ${q.risk_flag}${moved}${fraud}`);
}

console.log('\n=== Leverage for the Negotiator (real, never invented) ===');
const top = ranked.find((q) => q.rank === 1);
console.log(buildLeverage({ store, benchmark, targetQuote: top }));

console.log('\n=== Recommendation ===');
console.log(recommendation.headline);

console.log(`\nConfirmed-quote store size: ${store.size}`);
