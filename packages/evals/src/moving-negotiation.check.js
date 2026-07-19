import assert from 'node:assert/strict';
import { MOVING_SCENARIOS, runMovingSuite } from '../../../apps/simulated-market/src/moving-scenarios.js';

const results = runMovingSuite();
assert.equal(results.length, MOVING_SCENARIOS.length, 'every seller persona must be evaluated');
assert.equal(results.filter((result) => result.outcome === 'itemized_quote').length, 2, 'two vendors must provide comparable itemized outcomes');
assert.equal(results.filter((result) => result.price_moved).length, 2, 'the suite must demonstrate verified price movement');
assert.equal(results.find((result) => result.risk === 'high')?.outcome, 'declined_for_risk', 'hostage-load risk must be declined');
for (const result of results) {
  assert.ok(result.strategy.guardrails.some((rule) => rule.includes('verified leverage')), 'every scenario must prohibit fabricated leverage');
}
console.log('moving-negotiation.check.js: simulated moving calls meet the negotiation acceptance criteria');
