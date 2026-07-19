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

test('setRequirement / getRequirement (intake)', () => {
  const svc = createNegotiationService({});
  assert.equal(svc.getRequirement(), null);
  const r = svc.setRequirement({ deal_type: 'pg', budget: { ceiling: 16000 }, location: { pincode: '560034' } });
  assert.match(r.id, /^req_/);
  assert.equal(svc.getRequirement().spec.deal_type, 'pg');
});

test('listCalls / getCall', () => {
  const svc = createNegotiationService({ requirement, benchmark });
  const c = svc.startCall({ listing_id: 'a', listing_name: 'A' });
  assert.equal(svc.listCalls().length, 1);
  assert.equal(svc.getCall(c.call_id).listing_id, 'a');
  assert.equal(svc.getCall('nope'), null);
});

test('service emits lifecycle events', () => {
  const svc = createNegotiationService({ requirement, benchmark });
  const seen = [];
  svc.events.on('event', (e) => seen.push(e.type));
  const c = svc.startCall({ listing_id: 'a' });
  svc.writeQuoteFields(c.call_id, { base_rent: 10000, lease_duration_months: 12 });
  svc.closeCall(c.call_id, { status: 'itemized_quote' });
  assert.ok(seen.includes('call_started'));
  assert.ok(seen.includes('quote_updated'));
  assert.ok(seen.includes('call_closed'));
});

test('discover returns candidate shape (empty without key)', async () => {
  const svc = createNegotiationService({ requirement, benchmark });
  const d = await svc.discover();
  assert.ok(Array.isArray(d.candidates));
});

test('report builds a contract-shaped Recommendation with real evidence_refs', async () => {
  const svc = createNegotiationService({ requirement, benchmark });
  const c = svc.startCall({ listing_id: 'a', listing_name: 'A' });
  svc.writeQuoteFields(c.call_id, {
    base_rent: 11000, lease_duration_months: 12,
    first_quoted_effective: 15000, final_quoted_effective: 13500,
    price_drop_evidence: 'Owner caved on maintenance',
  });
  svc.closeCall(c.call_id, { status: 'itemized_quote' });
  const rep = await svc.report();
  assert.equal(rep.recommendation.requirement_spec_id, 'req_1');
  assert.deepEqual(rep.recommendation.ranked_listing_ids, ['a']);
  assert.equal(rep.recommendation.top_pick.listing_id, 'a');
  const ref = rep.recommendation.top_pick.evidence_refs[0];
  assert.equal(ref.listing_id, 'a');
  assert.equal(typeof ref.line_index, 'number');
  assert.equal(ref.quote_field, 'price_moved');
  // the referenced transcript line resolves to the concession utterance
  const call = svc.getCall(c.call_id);
  assert.equal(call.transcript[ref.line_index].text, 'Owner caved on maintenance');
});

test('snapshot -> hydrate restores calls + report + counter', async () => {
  const svc = createNegotiationService({ requirement, benchmark });
  const c = svc.startCall({ listing_id: 'a', listing_name: 'A' });
  svc.writeQuoteFields(c.call_id, {
    base_rent: 11000, lease_duration_months: 12,
    first_quoted_effective: 15000, final_quoted_effective: 13500, price_moved: true,
    price_drop_evidence: 'caved on maintenance',
  });
  svc.closeCall(c.call_id, { status: 'itemized_quote' });

  // Simulate a disk round-trip (JSON) then rehydrate a fresh service.
  const snap = JSON.parse(JSON.stringify(svc.snapshot()));
  const svc2 = createNegotiationService({ initial: snap });

  const rep = await svc2.report();
  assert.equal(rep.recommendation.top_pick.listing_id, 'a');
  assert.equal(svc2.listCalls().length, 1);
  assert.ok(svc2.getCall(c.call_id).transcript.length >= 1);
  // the id counter resumes so new calls don't collide with restored ones
  const c2 = svc2.startCall({ listing_id: 'b' });
  assert.notEqual(c2.call_id, c.call_id);
});

test('personalize creates a session for an unknown call_sid', () => {
  const svc = createNegotiationService({ requirement, benchmark });
  const before = svc.listCalls().length;
  const data = svc.personalize({ caller_id: '+1', called_number: '+911234', call_sid: 'CA-new' });
  assert.equal(data.type, 'conversation_initiation_client_data');
  assert.ok(data.dynamic_variables.call_id);
  assert.equal(svc.listCalls().length, before + 1);
  assert.equal(svc.sessions.getByCallSid('CA-new').listing_id, '+911234');
});
