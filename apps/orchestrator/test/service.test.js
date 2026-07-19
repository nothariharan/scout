import test from 'node:test';
import assert from 'node:assert/strict';
import { createNegotiationService } from '../src/server/negotiation-service.js';

const requirement = { budget: { ceiling: 16000, currency: 'INR' }, location: { area: 'Koramangala', city: 'Bengaluru' } };
const benchmark = { effective_monthly: 14000, source: 'fallback_estimate' };

test('full flow: quote -> leverage -> price move -> report', async () => {
  const svc = createNegotiationService({ requirement, benchmark });

  const c1 = svc.startCall({ listing_id: 'a', listing_name: 'A' });
  svc.writeQuoteFields(c1.call_id, { base_rent: 12000, deposit: 24000, maintenance_monthly: 1000, brokerage_onetime: 6000, lease_duration_months: 12 });
  svc.closeCall(c1.call_id, { status: 'itemized_quote' });

  const c2 = svc.startCall({ listing_id: 'b', listing_name: 'B' });
  svc.writeQuoteFields(c2.call_id, { base_rent: 11000, deposit: 22000, maintenance_monthly: 1500, brokerage_onetime: 8000, lease_duration_months: 12 });
  const lev = svc.getLeverage(c2.call_id);
  assert.ok(lev.some((l) => l.type === 'comparable_unit' && l.evidence.listing_id === 'a'));

  svc.writeQuoteFields(c2.call_id, { brokerage_onetime: 4000, first_quoted_effective: 15000, final_quoted_effective: 13500, price_moved: true });
  const closed = svc.closeCall(c2.call_id, { status: 'itemized_quote' });
  assert.equal(closed.quote.price_moved, true);

  const report = await svc.report();
  assert.equal(report.ranked[0].listing_id, 'b');
});

test('fraud decline: high_risk in report, never in leverage', async () => {
  const svc = createNegotiationService({ requirement, benchmark });
  const c = svc.startCall({ listing_id: 'scam' });
  svc.writeQuoteFields(c.call_id, { base_rent: 6000, deposit: 30000, lease_duration_months: 12, transcript_append: 'please transfer now, pay to hold before any visit' });
  svc.closeCall(c.call_id, { status: 'declined', reason: 'pre-visit deposit' });

  assert.equal(svc.store.best(), null);
  const report = await svc.report();
  const scam = report.ranked.find((q) => q.listing_id === 'scam');
  assert.equal(scam.risk_flag, 'high_risk');
  assert.deepEqual(scam.fraud_signals, ['pre_visit_deposit']);
});

test('callback outcome with no pricing yields no quote', () => {
  const svc = createNegotiationService({ requirement, benchmark });
  const c = svc.startCall({ listing_id: 'busy' });
  const closed = svc.closeCall(c.call_id, { status: 'callback_scheduled', reason: 'call back at 5pm' });
  assert.equal(closed.quote, null);
});

test('personalize returns initiation data for the call', () => {
  const svc = createNegotiationService({ requirement, benchmark });
  const c = svc.startCall({ listing_id: 'a', call_sid: 'CA9' });
  const data = svc.personalize({ call_sid: 'CA9' });
  assert.equal(data.type, 'conversation_initiation_client_data');
  assert.equal(data.dynamic_variables.call_id, c.call_id);
  assert.equal(data.dynamic_variables.listing_id, 'a');
});

test('ingestPostCall attaches transcript + recovers fields from it', async () => {
  const svc = createNegotiationService({ requirement, benchmark });
  const c = svc.startCall({ listing_id: 'a' });
  svc.linkConversation(c.call_id, 'conv-1');
  const r = await svc.ingestPostCall({
    type: 'post_call_transcription',
    data: { conversation_id: 'conv-1', transcript: [{ role: 'agent', message: 'hello' }, { role: 'user', message: 'rent is 12000' }] },
  });
  assert.equal(r.matched, true);
  assert.ok(svc.sessions.get(c.call_id).transcript.includes('rent is 12000'));
  // OpenAI/regex parse recovered the fee from the transcript.
  assert.equal(svc.sessions.get(c.call_id).rawFields.base_rent, 12000);
  assert.deepEqual(await svc.ingestPostCall({ data: { conversation_id: 'nope' } }), { ok: true, matched: false });
});

test('closeCall enforces the 3-outcome contract', () => {
  const svc = createNegotiationService({ requirement, benchmark });
  const c1 = svc.startCall({ listing_id: 'a' });
  assert.throws(() => svc.closeCall(c1.call_id, { status: 'nonsense' }), /outcome/);
  const c2 = svc.startCall({ listing_id: 'b' });
  assert.throws(() => svc.closeCall(c2.call_id, { status: 'declined' }), /reason/);
});

test('price-drop evidence line is captured on close', () => {
  const svc = createNegotiationService({ requirement, benchmark });
  const c = svc.startCall({ listing_id: 'a' });
  svc.writeQuoteFields(c.call_id, {
    base_rent: 11000, lease_duration_months: 12,
    first_quoted_effective: 15000, final_quoted_effective: 13500,
    price_drop_evidence: 'Owner: I will drop the maintenance if you commit today',
  });
  const closed = svc.closeCall(c.call_id, { status: 'itemized_quote' });
  assert.equal(closed.quote.price_moved, true);
  assert.equal(closed.quote.evidence_line, 'Owner: I will drop the maintenance if you commit today');
});
