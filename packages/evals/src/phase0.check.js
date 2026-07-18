// phase0.check.js  (@scout/evals)
// -----------------------------------------------------------------------------
// Golden-call check for the Phase 0 contracts. Enforces the team rule
// "no schema change without a matching fixture": every sample quote's stored
// effective_monthly_cost and risk_flag must match what the @scout/contracts
// scoring functions produce, using the @scout/vertical-config threshold.
//
// Runnable now without `pnpm install` (relative imports). Once the workspace is
// linked, these can switch to the '@scout/contracts' / '@scout/vertical-config'
// package specifiers.
// -----------------------------------------------------------------------------

import assert from 'node:assert';
import { createRequire } from 'node:module';
import { effectiveMonthlyCost, riskFlag } from '../../contracts/src/index.js';
import config from '../../vertical-config/src/index.js';

const require = createRequire(import.meta.url);
const quotes = require('./fixtures/sample_quotes.json');

// Market benchmark for a comparable Koramangala PG (matches sample_requirement).
const BENCHMARK = 14000;

let checked = 0;
for (const q of quotes) {
  const cost = effectiveMonthlyCost(q);
  assert.strictEqual(
    cost,
    q.effective_monthly_cost,
    `${q.listing_id}: effective_monthly_cost ${q.effective_monthly_cost} != computed ${cost}`
  );

  const flag = riskFlag(q, BENCHMARK, config.red_flag_threshold_percent);
  assert.strictEqual(
    flag,
    q.risk_flag,
    `${q.listing_id}: risk_flag '${q.risk_flag}' != computed '${flag}'`
  );

  checked += 1;
}

// Fixture-coverage guarantees for the demo requirements.
assert.ok(quotes.some((q) => q.price_moved === true), 'expected at least one price_moved quote');
assert.ok(
  quotes.some((q) => q.risk_flag === 'high_risk' && q.fraud_signals.length > 0),
  'expected at least one fraud-flagged high_risk quote'
);

console.log(`phase0.check.js: ${checked} quotes verified against contracts + vertical-config`);
