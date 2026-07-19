// api.smoke.js
// Boots the API on an ephemeral port and exercises the full mid-call flow with
// NO external services — the ~40% integration checkpoint proven in code:
//   start calls -> write fields mid-call -> ask leverage -> price moves ->
//   close outcomes (incl. a fraud decline) -> ranked report.
//
//   node apps/orchestrator/src/server/api.smoke.js

import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { createServer } from './http-server.js';

const require = createRequire(import.meta.url);
const requirement = require('../../../../packages/evals/src/fixtures/sample_requirement.json');

const benchmark = { effective_monthly: 14000, source: 'fallback_estimate' };
const { server } = createServer({ requirement, benchmark });

await new Promise((resolve) => server.listen(0, resolve));
const base = `http://127.0.0.1:${server.address().port}`;

async function api(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// 1) A clean listing, quoted itemized -> becomes real leverage.
const c1 = await api('POST', '/calls', { listing_id: 'pg_a', listing_name: 'Zolo Nest', phone: '+9100000001' });
await api('POST', `/calls/${c1.call_id}/quote`, {
  base_rent: 12000, deposit: 24000, maintenance_monthly: 1000, brokerage_onetime: 6000, lease_duration_months: 12,
});
await api('POST', `/calls/${c1.call_id}/outcome`, { status: 'itemized_quote' });

// 2) A second listing. Mid-call the agent asks what leverage it has, uses it,
//    and the seller's price moves.
const c2 = await api('POST', '/calls', { listing_id: 'pg_b', listing_name: 'Comfort Stay', phone: '+9100000002' });
await api('POST', `/calls/${c2.call_id}/quote`, {
  base_rent: 11000, deposit: 22000, maintenance_monthly: 1500, brokerage_onetime: 8000, lease_duration_months: 12,
});
const lev = await api('GET', `/calls/${c2.call_id}/leverage`);
console.log('\nMid-call leverage offered to Negotiator for pg_b:');
console.log(JSON.stringify(lev.leverage, null, 2));
await api('POST', `/calls/${c2.call_id}/quote`, {
  brokerage_onetime: 4000, first_quoted_effective: 14833, final_quoted_effective: 13500, price_moved: true,
});
await api('POST', `/calls/${c2.call_id}/outcome`, { status: 'itemized_quote' });

// 3) A scam listing: pre-visit deposit demand mid-call -> documented decline.
const c3 = await api('POST', '/calls', { listing_id: 'pg_c', listing_name: 'Sunrise Luxury' });
await api('POST', `/calls/${c3.call_id}/quote`, {
  base_rent: 6000, deposit: 30000, lease_duration_months: 12,
  transcript_append: 'please transfer now and pay to hold the room before any visit',
});
await api('POST', `/calls/${c3.call_id}/outcome`, { status: 'declined', reason: 'pre-visit deposit demanded' });

const report = await api('GET', '/report');
const calls = await api('GET', '/calls');
assert.equal(calls.calls.length, 3, 'the live ledger must expose every call session');
assert.equal(report.ranked[0].listing_id, 'pg_b', 'the verified negotiated quote should rank first');
assert.equal(report.ranked.at(-1).risk_flag, 'high_risk', 'the deposit scam must rank last');
assert.equal(report.ranked[0].final_quoted_effective, 13500, 'the negotiated price drop must reach the report');
console.log('\n=== Ranked report ===');
for (const q of report.ranked) {
  const moved = q.price_moved ? ` | price moved ${q.first_quoted_effective}->${q.final_quoted_effective}` : '';
  const fraud = q.fraud_signals?.length ? ` | fraud: ${q.fraud_signals.join(',')}` : '';
  console.log(`#${q.rank} ${q.listing_id} | ${q.effective_monthly_cost}/mo | ${q.risk_flag} | ${q.call_outcome.status}${moved}${fraud}`);
}
console.log('Recommendation:', report.recommendation.headline);

server.close();
