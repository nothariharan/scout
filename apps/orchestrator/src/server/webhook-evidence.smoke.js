import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createServer } from './http-server.js';

const priorSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;
process.env.ELEVENLABS_WEBHOOK_SECRET = 'webhook-test-secret';
const requirement = { vertical: 'moving', origin: { area: 'Austin', city: 'Austin' }, destination: { area: 'Round Rock', city: 'Round Rock' }, move_date: '2026-08-01', home_size: '1_bed', budget: { ideal: 1900, ceiling: 2200, currency: 'USD' } };
const { server } = createServer({ callProvider: async () => ({ placed: true, conversationId: 'conv_evidence', sid: 'sid_evidence' }) });
await new Promise((resolve) => server.listen(0, resolve));
const base = `http://127.0.0.1:${server.address().port}`;
async function api(method, path, body, headers = {}) { const response = await fetch(base + path, { method, headers: { 'content-type': 'application/json', ...headers }, body: body == null ? undefined : typeof body === 'string' ? body : JSON.stringify(body) }); return { status: response.status, body: await response.json() }; }

const created = await api('POST', '/requirements', { spec: requirement });
await api('POST', `/requirements/${created.body.id}/confirm`);
await api('POST', `/requirements/${created.body.id}/candidates`, { listing_name: 'Evidence Movers', phone: '+15555550107' });
const dispatched = await api('POST', `/requirements/${created.body.id}/dispatch`, { listing_ids: ['manual_evidence_movers_1'] });
const callId = dispatched.body.calls[0].call_id;
await api('POST', `/calls/${callId}/quote`, { base_price: 1600, binding_total: 1900 });
const event = JSON.stringify({ status: 'completed', data: { conversation_id: 'conv_evidence', transcript: [{ role: 'agent', message: 'Scout disclosed its AI role.' }, { role: 'user', message: 'The all-in binding total is 1900.' }], recording_url: 'https://evidence.test/call.mp3', outcome: { status: 'itemized_quote' } } });
const timestamp = Math.floor(Date.now() / 1000);
const signature = crypto.createHmac('sha256', process.env.ELEVENLABS_WEBHOOK_SECRET).update(`${timestamp}.${event}`).digest('hex');
const webhook = await api('POST', '/webhooks/elevenlabs', event, { 'elevenlabs-signature': `t=${timestamp},v0=${signature}` });
assert.equal(webhook.status, 200);
const report = await api('GET', `/requirements/${created.body.id}/report`);
assert.equal(report.body.ranked[0].call_outcome, 'itemized_quote');
assert.match(report.body.ranked[0].transcript, /Scout disclosed/);
assert.equal(report.body.ranked[0].recording_url, 'https://evidence.test/call.mp3');
const rejected = await api('POST', '/webhooks/elevenlabs', event, { 'elevenlabs-signature': 't=1,v0=invalid' });
assert.equal(rejected.status, 401);
server.close();
if (priorSecret == null) delete process.env.ELEVENLABS_WEBHOOK_SECRET; else process.env.ELEVENLABS_WEBHOOK_SECRET = priorSecret;
console.log('webhook-evidence.smoke.js: verified provider webhook stores transcript + recording evidence with a valid outcome');
