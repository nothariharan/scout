// strategy-engine.js
// Scout's decision layer. The voice/LLM receives the returned strategy brief
// and verbalizes it; it does not decide tactics or invent leverage itself.

import { getVerticalProfile } from '@scout/vertical-config';
import { assessConversationClimate } from './psychology.js';

export function planNegotiation({
  vertical = 'moving',
  posture = 'balanced',
  current_offer,
  target_price,
  reserve_price,
  fair_market_value,
  counter_round = 0,
  leverage = [],
  transcript = '',
  vendor = {},
} = {}) {
  const profile = getVerticalProfile(vertical);
  const policy = profile.negotiation_policy ?? defaultPolicy();
  const current = amount(current_offer);
  const target = amount(target_price) || current;
  const reserve = amount(reserve_price) || target;
  const market = amount(fair_market_value);
  const climate = assessConversationClimate(transcript);
  const verifiedLeverage = leverage.filter((item) => item?.verified !== false && item?.value != null);
  const maxRounds = policy.max_counter_rounds?.[posture] ?? 2;
  const vendorFlexibility = vendor.average_discount_percent >= 10 ? 'high'
    : vendor.average_discount_percent >= 4 ? 'medium'
      : 'unknown';

  const state = deriveState({ current, target, reserve, counter_round, maxRounds });
  const decision = chooseAction({ state, current, target, reserve, market, counter_round, maxRounds, verifiedLeverage, climate, vendorFlexibility });

  return {
    vertical: profile.vertical_name,
    state,
    current_state: {
      current_offer: current,
      fair_market_value: market || null,
      target_price: target,
      reserve_price: reserve,
      counter_round,
      max_counter_rounds: maxRounds,
    },
    vendor_intelligence: {
      flexibility: vendorFlexibility,
      historical_discount_percent: vendor.average_discount_percent ?? 0,
      typical_counter_round: vendor.typical_counter_round ?? 0,
      observed_signals: vendor.observed_signals ?? [],
    },
    conversation_climate: climate,
    verified_leverage: verifiedLeverage,
    next_action: decision,
    guardrails: [
      'Use only verified leverage supplied by Scout.',
      'Never claim a false competing bid, availability, or deadline.',
      'Never pay, sign, reserve, or make a binding commitment.',
      'If a price or term is unclear, clarify rather than guessing.',
    ],
  };
}

function deriveState({ current, target, reserve, counter_round, maxRounds }) {
  if (current > reserve) return 'walk_away_or_trade_terms';
  if (current <= target) return 'ready_to_close';
  if (counter_round >= maxRounds) return 'final_check';
  return 'counter_offer';
}

function chooseAction({ state, current, target, reserve, market, counter_round, maxRounds, verifiedLeverage, climate, vendorFlexibility }) {
  if (state === 'ready_to_close') {
    return decision('confirm_nonbinding_terms', 0.94, `Confirm the itemised total of ${current} and state that final confirmation remains with the customer.`, 'Before I take this back to my client, can you confirm that total and every included fee in writing?');
  }
  if (state === 'walk_away_or_trade_terms') {
    return decision('ask_for_tradeable_or_pause', 0.9, `The offer is above the reserve price of ${reserve}. Ask about terms instead of promising acceptance.`, 'That total is above our approved range. If the price cannot move, is there any flexibility on the itemised fees or included services?');
  }
  if (climate.annoyance >= 0.5) {
    return decision('de_escalate', 0.86, climate.guidance, 'I understand, and I appreciate your time. Could you let me know whether there is any final flexibility before I update my client?');
  }
  if (climate.urgency >= 0.5) {
    return decision('verify_urgency', 0.82, climate.guidance, 'I understand there is urgency. Before any decision, can you confirm the itemised total and whether that price is binding?');
  }
  const comparable = verifiedLeverage.find((item) => item.type === 'comparable_unit');
  if (comparable) {
    const anchor = Math.min(target, amount(comparable.value) || target);
    return decision('mention_verified_competitor', confidence(vendorFlexibility, counter_round), `Use the verified competing quote of ${anchor}; request a response, not a commitment.`, `We have a verified comparable quote around ${anchor}. Is there any flexibility if we bring this back for client confirmation today?`);
  }
  if (market && current > market) {
    return decision('anchor_to_market', 0.78, `Current offer is above the fair-market reference of ${market}. Ask for a move toward the target of ${target}.`, `Our market reference is closer to ${market}. Is there a way to bring the total nearer to ${target}?`);
  }
  if (counter_round + 1 >= maxRounds) {
    return decision('make_final_specific_ask', 0.74, `Use the final allowed counter round. Ask for ${target} once, then stop pushing.`, `If you can make the total ${target}, I can take that exact itemised offer back for client confirmation.`);
  }
  return decision('elicit_flexibility', 0.68, 'No verified leverage is available yet. Explore a lower total or a tradeable term without implying another bid.', 'What is the best itemised total you can offer for this exact scope?');
}

function decision(action, confidence, rationale, verbalization_brief) {
  return { action, confidence, rationale, verbalization_brief };
}

function confidence(vendorFlexibility, counterRound) {
  return Math.max(0.6, Math.min(0.9, (vendorFlexibility === 'high' ? 0.86 : 0.78) - counterRound * 0.04));
}

function amount(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function defaultPolicy() {
  return { max_counter_rounds: { aggressive: 3, balanced: 2, fast: 1 } };
}
