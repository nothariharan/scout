// Deterministic counterparties for negotiation development. These never place
// calls or invoke an LLM; they exercise the same strategy contract the live
// voice agent receives.
import { planNegotiation } from '../../orchestrator/src/negotiation/strategy-engine.js';

export const MOVING_SCENARIOS = Object.freeze([
  {
    id: 'transparent_operator',
    vendor: { id: 'mover_clearline', average_discount_percent: 9, typical_counter_round: 1 },
    opening_offer: 2100,
    target_price: 1900,
    reserve_price: 2200,
    fair_market_value: 1950,
    leverage: [{ type: 'comparable_unit', value: 1900, verified: true, source: 'completed_itemized_call' }],
    transcript: 'Happy to help. I can give you a complete itemized quote.',
    expected: { action: 'mention_verified_competitor', final_offer: 1900, outcome: 'itemized_quote', price_moved: true },
  },
  {
    id: 'fee_padder',
    vendor: { id: 'mover_fee_pad', average_discount_percent: 6, typical_counter_round: 2 },
    opening_offer: 2280,
    target_price: 2000,
    reserve_price: 2350,
    fair_market_value: 2050,
    leverage: [{ type: 'comparable_unit', value: 2000, verified: true, source: 'completed_itemized_call' }],
    transcript: 'Maybe I can speak to my manager. What is your budget?',
    expected: { action: 'mention_verified_competitor', final_offer: 2040, outcome: 'itemized_quote', price_moved: true },
  },
  {
    id: 'hard_seller',
    vendor: { id: 'mover_final_price', average_discount_percent: 0, typical_counter_round: 0 },
    opening_offer: 2400,
    target_price: 1900,
    reserve_price: 2200,
    fair_market_value: 2000,
    leverage: [],
    transcript: 'This is my final price. I am busy and do not have time to negotiate.',
    expected: { action: 'ask_for_tradeable_or_pause', final_offer: 2400, outcome: 'declined', price_moved: false },
  },
  {
    id: 'hostage_load_risk',
    vendor: { id: 'mover_cash_before_unload', average_discount_percent: 0, typical_counter_round: 0 },
    opening_offer: 1800,
    target_price: 1800,
    reserve_price: 2100,
    fair_market_value: 1900,
    leverage: [],
    transcript: 'You must pay cash before unloading. The final price is only after loading.',
    expected: { action: 'confirm_nonbinding_terms', final_offer: 1800, outcome: 'declined_for_risk', price_moved: false, risk: 'high' },
  },
]);

export function runMovingScenario(scenario) {
  const strategy = planNegotiation({
    vertical: 'moving',
    posture: 'balanced',
    current_offer: scenario.opening_offer,
    target_price: scenario.target_price,
    reserve_price: scenario.reserve_price,
    fair_market_value: scenario.fair_market_value,
    counter_round: 1,
    leverage: scenario.leverage,
    transcript: scenario.transcript,
    vendor: scenario.vendor,
  });
  const risk = /cash before unloading|pay before delivery|final price after loading/i.test(scenario.transcript) ? 'high' : 'none';
  const outcome = risk === 'high' ? 'declined_for_risk' : scenario.expected.outcome;
  return {
    scenario_id: scenario.id,
    strategy,
    outcome,
    first_offer: scenario.opening_offer,
    final_offer: scenario.expected.final_offer,
    price_moved: scenario.expected.price_moved,
    risk,
    quote: {
      base_price: scenario.expected.final_offer - 300,
      packing: 120,
      stairs: 60,
      long_carry: 40,
      fuel: 50,
      insurance: 30,
      binding_total: scenario.expected.final_offer,
    },
  };
}

export function runMovingSuite() {
  return MOVING_SCENARIOS.map(runMovingScenario);
}
