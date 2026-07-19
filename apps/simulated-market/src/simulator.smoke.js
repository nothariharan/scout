import assert from 'node:assert/strict';
import { MOVING_SCENARIOS, runMovingSuite } from './moving-scenarios.js';

const results = runMovingSuite();
assert.equal(results.length, 4);
for (const result of results) {
  const scenario = MOVING_SCENARIOS.find((item) => item.id === result.scenario_id);
  assert.equal(result.strategy.next_action.action, scenario.expected.action);
  assert.equal(result.outcome, scenario.expected.outcome);
  assert.equal(result.price_moved, scenario.expected.price_moved);
  assert.ok(result.strategy.guardrails.some((rule) => rule.includes('Never pay')));
}
assert.equal(results.find((result) => result.scenario_id === 'hostage_load_risk').risk, 'high');
assert.equal(results.filter((result) => result.price_moved).length, 2);
console.log('simulator.smoke.js: four moving-vendor behaviours remain bounded and repeatable');
