import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createServer } from '../src/server/http-server.js';

const requirement = { budget: { ceiling: 16000, currency: 'INR' }, location: { area: 'Koramangala', city: 'Bengaluru' } };
const benchmark = { effective_monthly: 14000, source: 'fallback_estimate' };

async function withServer(fn) {
  const { server } = createServer({ requirement, benchmark });
  await new Promise((resolve) => server.listen(0, resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    server.close();
  }
}

function client(base) {
  return async (method, path, body, headers = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, json: await res.json().catch(() => ({})) };
  };
}

test('health + full mid-call flow over HTTP', async () => {
  await withServer(async (base) => {
    const call = client(base);
    assert.equal((await call('GET', '/health')).status, 200);

    const c1 = await call('POST', '/calls', { listing_id: 'a', listing_name: 'A' });
    assert.equal(c1.status, 201);
    await call('POST', `/calls/${c1.json.call_id}/quote`, { base_rent: 12000, deposit: 24000, maintenance_monthly: 1000, brokerage_onetime: 6000, lease_duration_months: 12 });
    await call('POST', `/calls/${c1.json.call_id}/outcome`, { status: 'itemized_quote' });

    const c2 = await call('POST', '/calls', { listing_id: 'b' });
    await call('POST', `/calls/${c2.json.call_id}/quote`, { base_rent: 11000, deposit: 22000, maintenance_monthly: 1500, brokerage_onetime: 4000, lease_duration_months: 12 });
    const lev = await call('GET', `/calls/${c2.json.call_id}/leverage`);
    assert.ok(lev.json.leverage.some((l) => l.type === 'comparable_unit'));
    await call('POST', `/calls/${c2.json.call_id}/outcome`, { status: 'itemized_quote' });

    const report = await call('GET', '/report');
    assert.equal(report.status, 200);
    assert.ok(Array.isArray(report.json.ranked));
  });
});

test('personalization webhook returns initiation data', async () => {
  await withServer(async (base) => {
    const call = client(base);
    const c = await call('POST', '/calls', { listing_id: 'a', call_sid: 'CA1' });
    const p = await call('POST', '/agent/personalization', { caller_id: '+1', agent_id: 'ag', called_number: '+2', call_sid: 'CA1' });
    assert.equal(p.status, 200);
    assert.equal(p.json.type, 'conversation_initiation_client_data');
    assert.equal(p.json.dynamic_variables.call_id, c.json.call_id);
  });
});

test('webhook signature enforced when secret is set', async () => {
  process.env.ELEVENLABS_WEBHOOK_SECRET = 'shh';
  try {
    await withServer(async (base) => {
      const call = client(base);
      const bad = await call('POST', '/agent/post-call', { data: { conversation_id: 'x' } });
      assert.equal(bad.status, 401);

      const raw = JSON.stringify({ data: { conversation_id: 'x' } });
      const t = Math.floor(Date.now() / 1000);
      const hmac = crypto.createHmac('sha256', 'shh').update(`${t}.${raw}`).digest('hex');
      const res = await fetch(base + '/agent/post-call', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'elevenlabs-signature': `t=${t},v0=${hmac}` },
        body: raw,
      });
      assert.equal(res.status, 200);
    });
  } finally {
    delete process.env.ELEVENLABS_WEBHOOK_SECRET;
  }
});

test('intake + discovery + calls list + CORS over HTTP', async () => {
  await withServer(async (base) => {
    const call = client(base);
    const spec = { deal_type: 'pg', budget: { ceiling: 16000, currency: 'INR' }, location: { pincode: '560034', area: 'Koramangala', city: 'Bengaluru' } };
    const r = await call('POST', '/requirement', { spec });
    assert.equal(r.status, 201);
    assert.match(r.json.id, /^req_/);

    const g = await call('GET', '/requirement');
    assert.equal(g.json.spec.deal_type, 'pg');

    const cand = await call('GET', '/candidates');
    assert.equal(cand.status, 200);
    assert.ok(Array.isArray(cand.json.candidates));

    const c1 = await call('POST', '/calls', { listing_id: 'a', listing_name: 'A' });
    const list = await call('GET', '/calls');
    assert.ok(list.json.some((x) => x.call_id === c1.json.call_id));

    const one = await call('GET', `/calls/${c1.json.call_id}`);
    assert.equal(one.json.listing_id, 'a');
    assert.equal((await call('GET', '/calls/nope')).status, 404);

    const res = await fetch(base + '/report');
    assert.equal(res.headers.get('access-control-allow-origin'), '*');
  });
});

test('GET /events streams a snapshot', async () => {
  await withServer(async (base) => {
    const res = await fetch(base + '/events', { headers: { accept: 'text/event-stream' } });
    const reader = res.body.getReader();
    const { value } = await reader.read();
    const text = new TextDecoder().decode(value);
    assert.match(text, /"type":"snapshot"/);
    await reader.cancel();
  });
});
