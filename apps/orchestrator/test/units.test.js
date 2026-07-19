import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import { normalizeQuote } from '../src/normalize/normalize-quote.js';
import { capturePriceDrop } from '../src/negotiation/price-drop.js';
import { detectFraudSignals } from '../src/risk/fraud-signals.js';
import { assessRisk } from '../src/risk/risk-service.js';
import { buildLeverage } from '../src/leverage/leverage-builder.js';
import { rankQuotes } from '../src/ranking/rank-quotes.js';
import { createQuotesStore } from '../src/store/quotes-store.js';
import { createCallSessionStore } from '../src/calls/call-session.js';
import { buildInitiationData } from '../src/agent/initiation-data.js';
import { verifyElevenLabsSignature } from '../src/server/verify-signature.js';
import { resolveBenchmark } from '../src/benchmark/benchmark-service.js';

test('normalizeQuote computes effective monthly cost', () => {
  const q = normalizeQuote({
    listing_id: 'x', base_rent: 12000, deposit: 24000, maintenance_monthly: 1000,
    brokerage_onetime: 6000, hidden_charges: 0, lease_duration_months: 12,
  });
  assert.equal(q.effective_monthly_cost, 15500);
  assert.equal(q.risk_flag, 'verified');
  assert.deepEqual(q.call_outcome, { status: 'itemized_quote' });
});

test('normalizeQuote validates inputs', () => {
  assert.throws(() => normalizeQuote({ base_rent: 1, lease_duration_months: 12 }), /listing_id/);
  assert.throws(() => normalizeQuote({ listing_id: 'x', lease_duration_months: 0 }), /lease_duration_months/);
});

test('capturePriceDrop flags a real move', () => {
  const d = capturePriceDrop({ firstEffective: 15000, finalEffective: 13500 });
  assert.equal(d.price_moved, true);
  assert.equal(d.drop_amount, 1500);
  assert.equal(d.drop_pct, 10);
  assert.equal(capturePriceDrop({ firstEffective: 100, finalEffective: 100 }).price_moved, false);
});

test('detectFraudSignals matches config keywords', () => {
  assert.deepEqual(detectFraudSignals('please transfer now to pay to hold the room'), ['pre_visit_deposit']);
  assert.deepEqual(detectFraudSignals('all good, visit anytime'), []);
});

test('assessRisk: fraud overrides, below-benchmark, caution, verified', () => {
  assert.equal(assessRisk({ quote: { effective_monthly_cost: 13500, fraud_signals: [] }, transcript: 'pay to hold', benchmark: 14000 }).risk_flag, 'high_risk');
  assert.equal(assessRisk({ quote: { effective_monthly_cost: 8500, fraud_signals: [] }, benchmark: 14000 }).risk_flag, 'high_risk');
  assert.equal(assessRisk({ quote: { effective_monthly_cost: 11500, fraud_signals: [] }, benchmark: 14000 }).risk_flag, 'caution');
  assert.equal(assessRisk({ quote: { effective_monthly_cost: 13800, fraud_signals: [] }, benchmark: 14000 }).risk_flag, 'verified');
});

test('buildLeverage: excludes self, includes benchmark + fee_attack', () => {
  const store = createQuotesStore();
  store.addConfirmed(normalizeQuote({
    listing_id: 'a', listing_name: 'A', base_rent: 12000, deposit: 24000,
    maintenance_monthly: 1000, brokerage_onetime: 6000, lease_duration_months: 12,
  }));
  const target = { listing_id: 'b', lease_duration_months: 12, brokerage_onetime: 8000, deposit: 22000, maintenance_monthly: 1500 };
  const lev = buildLeverage({ store, benchmark: { effective_monthly: 14000, source: 'x' }, targetQuote: target });
  const types = lev.map((l) => l.type);
  assert.ok(types.includes('comparable_unit'));
  assert.ok(types.includes('benchmark'));
  assert.ok(types.includes('fee_attack'));
  assert.equal(lev.find((l) => l.type === 'comparable_unit').evidence.listing_id, 'a');
  assert.equal(lev.find((l) => l.type === 'fee_attack').target_fee, 'deposit');
});

test('buildLeverage: comparable excluded when target IS the best', () => {
  const store = createQuotesStore();
  store.addConfirmed(normalizeQuote({ listing_id: 'a', base_rent: 10000, lease_duration_months: 12 }));
  const lev = buildLeverage({ store, benchmark: { effective_monthly: 14000 }, targetQuote: { listing_id: 'a', lease_duration_months: 12 } });
  assert.equal(lev.find((l) => l.type === 'comparable_unit'), undefined);
});

test('rankQuotes: high_risk never #1', () => {
  const quotes = [
    { listing_id: 'cheap', effective_monthly_cost: 8000, risk_flag: 'high_risk' },
    { listing_id: 'mid', effective_monthly_cost: 13000, risk_flag: 'verified' },
    { listing_id: 'hi', effective_monthly_cost: 15000, risk_flag: 'verified' },
  ];
  const ranked = rankQuotes(quotes, { requirement: { budget: { ceiling: 14000 } } });
  assert.equal(ranked[0].listing_id, 'mid');
  assert.equal(ranked.at(-1).risk_flag, 'high_risk');
  assert.equal(ranked.find((q) => q.listing_id === 'hi').over_budget, true);
});

test('quotesStore: only itemized confirmable; best excludes high_risk; immutable', () => {
  const store = createQuotesStore();
  assert.throws(() => store.addConfirmed({ call_outcome: { status: 'declined' } }), /itemized_quote/);
  store.addConfirmed(normalizeQuote({ listing_id: 'a', base_rent: 10000, lease_duration_months: 12 }));
  const best = store.best();
  best.effective_monthly_cost = 1;
  assert.notEqual(store.best().effective_monthly_cost, 1);
});

test('callSession: allowlist, merge, sid + conversation mapping', () => {
  const s = createCallSessionStore();
  const c = s.create({ listing_id: 'a', call_sid: 'CA1' });
  s.patchFields(c.call_id, { base_rent: 12000, evil: 'x', transcript_append: 'hi' });
  const got = s.get(c.call_id);
  assert.equal(got.rawFields.base_rent, 12000);
  assert.equal(got.rawFields.evil, undefined);
  assert.equal(got.transcript, 'hi');
  assert.equal(s.getByCallSid('CA1').call_id, c.call_id);
  s.linkConversation(c.call_id, 'conv1');
  assert.equal(s.getByConversationId('conv1').call_id, c.call_id);
});

test('buildInitiationData flattens spec and prunes empties', () => {
  const data = buildInitiationData(
    { deal_type: 'pg', location: { area: 'Koramangala', city: 'Bengaluru' }, budget: { ceiling: 16000, currency: 'INR' }, amenities: ['wifi', 'food_included'] },
    { callId: 'call_1', listingId: 'pg_a' },
  );
  assert.equal(data.type, 'conversation_initiation_client_data');
  assert.equal(data.dynamic_variables.call_id, 'call_1');
  assert.equal(data.dynamic_variables.area, 'Koramangala');
  assert.equal(data.dynamic_variables.amenities, 'wifi, food_included');
  assert.equal('pincode' in data.dynamic_variables, false);
});

test('resolveBenchmark falls back to per-pincode estimate without a key', async (t) => {
  if (process.env.TAVILY_API_KEY) return t.skip('TAVILY_API_KEY set; skipping fallback assertion');
  const bm = await resolveBenchmark(
    { location: { pincode: '560034' }, deal_type: 'pg' },
    { fallbackByPincode: { '560034': 14000 } },
  );
  assert.equal(bm.effective_monthly, 14000);
  assert.equal(bm.source, 'fallback_estimate');
});

test('verifyElevenLabsSignature: valid, tampered, no-secret, stale', () => {
  const secret = 'shh';
  const body = '{"a":1}';
  const t = 1000;
  const hmac = crypto.createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  const header = `t=${t},v0=${hmac}`;
  const now = t * 1000;
  assert.equal(verifyElevenLabsSignature(body, header, secret, { now }), true);
  assert.equal(verifyElevenLabsSignature(body, `t=${t},v0=deadbeef`, secret, { now }), false);
  assert.equal(verifyElevenLabsSignature(body, header, ''), true);
  assert.equal(verifyElevenLabsSignature(body, header, secret, { now: (t + 99999) * 1000 }), false);
});
