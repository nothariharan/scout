import assert from 'node:assert/strict';
import { createServer } from '../server/http-server.js';

const movingRequest = { vertical: 'moving', origin: { area: 'Austin', city: 'Austin', lat: 30.2672, lng: -97.7431 }, destination: { area: 'Round Rock', city: 'Round Rock' }, move_date: '2026-08-01', home_size: '1_bed', budget: { ideal: 1900, ceiling: 2200, currency: 'USD' }, negotiation_posture: 'balanced' };
const discovery = async () => ({ candidates: [{ listing_id: 'mover_1', listing_name: 'Clearline Movers', phone: '+15555550101', service_type: 'moving' }] });
const { server } = createServer({ discovery, callProvider: async () => ({ placed: false, reason: 'outbound calling is disabled' }) });
await new Promise((resolve) => server.listen(0, resolve));
const base = `http://127.0.0.1:${server.address().port}`;
async function api(method, path, body) { const headers = { 'content-type': 'application/json' }; if (process.env.SCOUT_AGENT_TOOL_SECRET) headers['x-scout-agent-secret'] = process.env.SCOUT_AGENT_TOOL_SECRET; const response = await fetch(base + path, { method, headers, body: body ? JSON.stringify(body) : undefined }); return { status: response.status, body: await response.json() }; }

const request = await api('POST', '/requirements', { spec: movingRequest });
await api('POST', `/requirements/${request.body.id}/confirm`);
await api('POST', `/requirements/${request.body.id}/discover`);
const manual = await api('POST', `/requirements/${request.body.id}/candidates`, { listing_name: 'Consented test line', phone: '+15555550102' });
assert.equal(manual.status, 201);
assert.match(manual.body.candidate.listing_id, /^manual_consented_test_line_/);
const dispatched = await api('POST', `/requirements/${request.body.id}/dispatch`, { listing_ids: ['mover_1'] });
const callId = dispatched.body.calls[0].call_id;
assert.match(callId, /^moving_req_/);
await api('POST', `/calls/${callId}/quote`, { base_price: 1600, packing: 120, stairs: 60, long_carry: 40, fuel: 50, insurance: 30, first_quoted_total: 2050, binding_total: 1900 });
const strategy = await api('POST', `/calls/${callId}/strategy`, {});
assert.ok(strategy.body.strategy.next_action);
const closed = await api('POST', `/calls/${callId}/outcome`, { status: 'itemized_quote' });
assert.equal(closed.body.quote.binding_total, 1900);
const report = await api('GET', `/requirements/${request.body.id}/report`);
assert.equal(report.body.ranked[0].vendor_id, 'mover_1');
server.close();
console.log('moving-workflow.smoke.js: moving request -> quote -> strategy -> ranked report is wired');
