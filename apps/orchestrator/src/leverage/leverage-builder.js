// leverage-builder.js
// Build the three leverage types the Negotiator is allowed to cite. Every value
// traces back to a REAL confirmed quote or a REAL benchmark — nothing invented.
//
//   comparable_unit : cheapest confirmed competing quote from the store
//   benchmark       : area going-rate from the Tavily benchmark
//   fee_attack      : the single largest non-rent fee to push down

import { leverage_types } from '../lib/config.js';

/**
 * @param {object} args
 * @param {object} args.store - confirmed-quotes store
 * @param {object} [args.benchmark] - { effective_monthly, source }
 * @param {object} [args.targetQuote] - the listing currently being negotiated
 * @returns {Array} leverage items (only types enabled for this vertical)
 */
export function buildLeverage({ store, benchmark, targetQuote } = {}) {
  const leverage = [];

  const best = store?.best?.() ?? null;
  if (best && (!targetQuote || best.listing_id !== targetQuote.listing_id)) {
    leverage.push({
      type: 'comparable_unit',
      value: best.effective_monthly_cost,
      evidence: { listing_id: best.listing_id, listing_name: best.listing_name },
    });
  }

  if (benchmark && Number.isFinite(Number(benchmark.effective_monthly))) {
    leverage.push({
      type: 'benchmark',
      value: Number(benchmark.effective_monthly),
      source: benchmark.source,
    });
  }

  if (targetQuote) {
    const feeAttack = biggestFee(targetQuote);
    if (feeAttack) leverage.push(feeAttack);
  }

  const allowed = new Set(leverage_types ?? []);
  return leverage.filter((item) => allowed.has(item.type));
}

/** Find the fee with the largest monthly impact (amortizing one-time fees). */
function biggestFee(quote) {
  const months = quote.lease_duration_months || 1;
  const candidates = [
    { fee: 'brokerage_onetime', monthly_impact: (quote.brokerage_onetime || 0) / months },
    { fee: 'maintenance_monthly', monthly_impact: quote.maintenance_monthly || 0 },
    { fee: 'hidden_charges', monthly_impact: quote.hidden_charges || 0 },
    { fee: 'deposit', monthly_impact: (quote.deposit || 0) / months },
  ].filter((c) => c.monthly_impact > 0);

  if (candidates.length === 0) return null;
  const top = candidates.reduce((a, b) => (b.monthly_impact > a.monthly_impact ? b : a));
  return { type: 'fee_attack', target_fee: top.fee, monthly_impact: round2(top.monthly_impact) };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
