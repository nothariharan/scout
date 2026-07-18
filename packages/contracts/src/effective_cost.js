// effective_cost.js  (@scout/contracts)
// -----------------------------------------------------------------------------
// FROZEN CONTRACT (logic). Pure function: one normalized Quote -> a single
// comparable "effective monthly cost" number. This is THE number every quote is
// ranked by, so all workstreams must import this rather than re-deriving it.
//
// Formula (see @scout/vertical-config -> effective_cost_formula):
//   base_rent
//   + (deposit / lease_duration_months)          // one-time, amortized
//   + maintenance_monthly                          // recurring
//   + (brokerage_onetime / lease_duration_months)  // one-time, amortized
//   + hidden_charges                               // recurring
//
// Pure: never mutates its input; returns a new number.
// -----------------------------------------------------------------------------

import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

/**
 * Compute the effective monthly cost of a normalized quote.
 * @param {object} quote - shape matches schemas/quote.json
 * @returns {number} effective monthly cost, rounded to 2 decimals
 */
export function effectiveMonthlyCost(quote) {
  if (!quote || typeof quote !== 'object') {
    throw new TypeError('effectiveMonthlyCost: quote object is required');
  }

  // Missing optional charge -> 0 (treated as "no charge", never NaN).
  const baseRent = Number(quote.base_rent) || 0;
  const deposit = Number(quote.deposit) || 0;
  const maintenance = Number(quote.maintenance_monthly) || 0;
  const brokerage = Number(quote.brokerage_onetime) || 0;
  const hidden = Number(quote.hidden_charges) || 0;
  const months = Number(quote.lease_duration_months);

  // Guard the divisor: amortization is meaningless with a zero/negative lease.
  if (!Number.isFinite(months) || months < 1) {
    throw new RangeError('effectiveMonthlyCost: lease_duration_months must be >= 1');
  }

  const cost = baseRent + deposit / months + maintenance + brokerage / months + hidden;

  // Round to 2 decimals for stable, comparable currency values.
  return Math.round(cost * 100) / 100;
}

// -----------------------------------------------------------------------------
// Unit-test examples (runnable: `node src/effective_cost.js`)
// -----------------------------------------------------------------------------
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  // Example 1: 12000 + 24000/12 + 1000 + 6000/12 + 0 = 15500
  assert.strictEqual(
    effectiveMonthlyCost({
      base_rent: 12000,
      deposit: 24000,
      maintenance_monthly: 1000,
      brokerage_onetime: 6000,
      hidden_charges: 0,
      lease_duration_months: 12,
    }),
    15500
  );

  // Example 2: 6000 + 30000/12 + 0 + 0/12 + 0 = 8500
  assert.strictEqual(
    effectiveMonthlyCost({
      base_rent: 6000,
      deposit: 30000,
      maintenance_monthly: 0,
      brokerage_onetime: 0,
      hidden_charges: 0,
      lease_duration_months: 12,
    }),
    8500
  );

  console.log('effective_cost.js: all examples passed');
}
