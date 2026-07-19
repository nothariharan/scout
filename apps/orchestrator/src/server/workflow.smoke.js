import assert from 'node:assert/strict';
import { createServer } from './http-server.js';

const requirement = { location: { area: 'Koramangala', city: 'Bengaluru' }, budget: { ideal: 10000, ceiling: 12000 }, negotiation_posture: 'balanced' };
const discovery = async () => ({ available: true, candidates: [
  { listing_id: 'osm_node_1', listing_name: 'Published Mover', phone: '+15555550101', service_type: 'moving' },
  { listing_id: 'osm_node_2', listing_name: 'Research-only Mover', phone: '', service_type: 'moving' },
] });
const callProvider = async () => ({ placed: false, reason: 'outbound calling is disabled' });
const { server } = createServer({ discovery, callProvider });
await new Promise((resolve) => server.listen(0, resolve));
const base = `http://127.0.0.1:${server.address().port}`;
async function api(method, path, body) { const response = await fetch(base + path, { method, headers: body ? { 'content-type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }); return { status: response.status, body: await response.json() }; }

const created = await api('POST', '/requirements', { spec: requirement, source_path: 'text' });
assert.equal(created.status, 201);
const id = created.body.id;
assert.equal((await api('POST', `/requirements/${id}/discover`)).status, 409);
assert.equal((await api('POST', `/requirements/${id}/confirm`)).status, 200);
const found = await api('POST', `/requirements/${id}/discover`, { service_type: 'moving' });
assert.equal(found.body.candidates.length, 2);
const dispatched = await api('POST', `/requirements/${id}/dispatch`, { listing_ids: ['osm_node_1', 'osm_node_2'] });
assert.equal(dispatched.body.calls.length, 2);
assert.equal(dispatched.body.calls[0].reason, 'outbound calling is disabled');
assert.equal(dispatched.body.calls[1].reason, 'candidate has no published phone number');
assert.equal((await api('GET', `/requirements/${id}/calls`)).body.calls.length, 2);
server.close();
console.log('workflow.smoke.js: confirmation, OSM discovery, and guarded dispatch are wired');
