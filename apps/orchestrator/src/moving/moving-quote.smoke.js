import assert from 'node:assert/strict';
import { normalizeMovingQuote, rankMovingQuotes } from './moving-quote.js';

const negotiated = normalizeMovingQuote({ vendor_id: 'clearline', vendor_name: 'Clearline Movers', base_price: 1600, packing: 120, stairs: 60, long_carry: 40, fuel: 50, insurance: 30, first_quoted_total: 2050, binding_total: 1900 });
const risky = normalizeMovingQuote({ vendor_id: 'cash-only', base_price: 1500, transcript_append: 'cash before unloading and final price after loading' });
assert.equal(negotiated.binding_total, 1900);
assert.equal(negotiated.price_moved, true);
assert.equal(risky.risk_flag, 'high_risk');
const ranked = rankMovingQuotes([risky, negotiated], { budget: { ceiling: 2000 } });
assert.equal(ranked[0].vendor_id, 'clearline');
assert.equal(ranked[1].risk_flag, 'high_risk');
console.log('moving-quote.smoke.js: moving totals, risk, and ranking remain comparable');
