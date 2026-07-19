import assert from 'node:assert/strict';
import { planNegotiation } from './strategy-engine.js';

const walkAway = planNegotiation({
  vertical: 'moving', posture: 'balanced', current_offer: 2200, target_price: 1900, reserve_price: 2100,
  fair_market_value: 1950, counter_round: 1,
  leverage: [{ type: 'comparable_unit', value: 1900, verified: true }],
  transcript: 'Sure, let me see what I can do.', vendor: { average_discount_percent: 12, typical_counter_round: 2 },
});
assert.equal(walkAway.state, 'walk_away_or_trade_terms');
assert.equal(walkAway.next_action.action, 'ask_for_tradeable_or_pause');

const competitor = planNegotiation({
  vertical: 'moving', posture: 'balanced', current_offer: 2050, target_price: 1900, reserve_price: 2100,
  fair_market_value: 1950, leverage: [{ type: 'comparable_unit', value: 1900, verified: true }],
  vendor: { average_discount_percent: 12 },
});
assert.equal(competitor.next_action.action, 'mention_verified_competitor');
assert.match(competitor.next_action.verbalization_brief, /verified comparable quote/i);
assert.ok(competitor.guardrails.some((rule) => rule.includes('verified leverage')));

console.log('strategy.smoke.js: decisions stay bounded, truthful, and vertical-configured');
