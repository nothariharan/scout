// connectors.test.js
// Verify the REAL (key-gated) connector code paths produce requests that match
// each vendor's documented API contract. We mock global fetch, activate the
// path with a fake key, and assert URL / method / auth / body against the docs:
//   Tavily search        https://docs.tavily.com/api-reference/endpoint/search
//   OpenAI chat          https://platform.openai.com/docs/api-reference/chat
//   OpenAI struct output https://platform.openai.com/docs/guides/structured-outputs
//   ElevenLabs outbound  https://elevenlabs.io/docs/api-reference/twilio/outbound-call
//   ElevenLabs batch     https://elevenlabs.io/docs/api-reference/batch-calling/create

import test from 'node:test';
import assert from 'node:assert/strict';

import { fetchAreaRentData } from '../src/benchmark/tavily-client.js';
import { createBenchmarkService } from '../src/benchmark/benchmark-service.js';
import { parseTranscriptToQuote } from '../src/transcripts/parse-transcript.js';
import { generateRecommendation } from '../src/transcripts/recommend.js';
import { placeCall, placeBatch } from '../src/telephony/elevenlabs-telephony.js';
import { discoverCandidates } from '../src/discovery/places-client.js';
import { createNegotiationService } from '../src/server/negotiation-service.js';

// Replace global fetch with a request-capturing stub.
function mockFetch(handler) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url, options, body: options.body ? JSON.parse(options.body) : undefined });
    return handler(url, options);
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}

const ok = (json) => async () => ({ ok: true, status: 200, json: async () => json });
const fail = (status) => async () => ({ ok: false, status, json: async () => ({}) });

test('tavily-client: request matches Tavily REST docs (Bearer auth, snake_case body)', async () => {
  process.env.TAVILY_API_KEY = 'tvly-test';
  const m = mockFetch(ok({ answer: 'Average rent is ₹14,000 per month', results: [{ content: 'PGs near ₹13,500 per month' }] }));
  try {
    const out = await fetchAreaRentData({ area: 'Koramangala', city: 'Bengaluru', pincode: '560034', dealType: 'pg' });
    const call = m.calls[0];
    assert.equal(call.url, 'https://api.tavily.com/search');
    assert.equal(call.options.method, 'POST');
    assert.equal(call.options.headers.authorization, 'Bearer tvly-test');
    assert.equal(call.body.search_depth, 'advanced');
    assert.equal(call.body.include_answer, 'advanced');
    assert.equal(call.body.topic, 'general');
    assert.ok(call.body.query.includes('Koramangala'));
    assert.equal(out.available, true);
    assert.ok(out.answer.includes('14,000'));
  } finally {
    m.restore();
    delete process.env.TAVILY_API_KEY;
  }
});

test('benchmark-service: parses median monthly price from Tavily response', async () => {
  process.env.TAVILY_API_KEY = 'tvly-test';
  const m = mockFetch(ok({ answer: 'Rents are around ₹12,000, ₹14,000 and ₹16,000 per month', results: [] }));
  try {
    const svc = createBenchmarkService({});
    const bm = await svc.getBenchmark({ pincode: '560034', area: 'Koramangala', city: 'Bengaluru' }, 'pg');
    assert.equal(bm.source, 'tavily');
    assert.equal(bm.effective_monthly, 14000); // median of 12000/14000/16000
  } finally {
    m.restore();
    delete process.env.TAVILY_API_KEY;
  }
});

test('parse-transcript: OpenAI request matches Structured Outputs docs', async () => {
  process.env.OPENAI_API_KEY = 'sk-test';
  const content = JSON.stringify({
    base_rent: 12000, deposit: 24000, maintenance_monthly: 1000, brokerage_onetime: 6000,
    hidden_charges: 0, lease_duration_months: 12, amenities_included: ['wifi'],
  });
  const m = mockFetch(ok({ choices: [{ message: { content } }] }));
  try {
    const fields = await parseTranscriptToQuote('rent is 12000, deposit 24000', { listingId: 'pg_a' });
    const call = m.calls[0];
    assert.equal(call.url, 'https://api.openai.com/v1/chat/completions');
    assert.equal(call.options.headers.authorization, 'Bearer sk-test');
    assert.equal(call.body.response_format.type, 'json_schema');
    assert.equal(call.body.response_format.json_schema.strict, true);
    assert.equal(fields.base_rent, 12000);
    assert.equal(fields.listing_id, 'pg_a');
  } finally {
    m.restore();
    delete process.env.OPENAI_API_KEY;
  }
});

test('recommend: OpenAI narrative attached, falls back on error', async () => {
  process.env.OPENAI_API_KEY = 'sk-test';
  const ranked = [{ rank: 1, listing_id: 'a', listing_name: 'A', effective_monthly_cost: 13500, risk_flag: 'verified', reasoning: 'x' }];
  const requirement = { budget: { ceiling: 16000, currency: 'INR' } };
  let m = mockFetch(ok({ choices: [{ message: { content: 'A is the best pick.' } }] }));
  try {
    const rec = await generateRecommendation(ranked, requirement);
    assert.equal(m.calls[0].url, 'https://api.openai.com/v1/chat/completions');
    assert.equal(rec.narrative, 'A is the best pick.');
    assert.ok(rec.headline.includes('13500'));
  } finally {
    m.restore();
  }
  m = mockFetch(fail(500));
  try {
    const rec = await generateRecommendation(ranked, requirement);
    assert.equal(rec.narrative, undefined); // model failure => template only
    assert.ok(rec.headline.includes('A'));
  } finally {
    m.restore();
    delete process.env.OPENAI_API_KEY;
  }
});

test('elevenlabs-telephony: outbound-call request matches docs (xi-api-key)', async () => {
  process.env.ELEVENLABS_API_KEY = 'xi-test';
  process.env.ELEVENLABS_NEGOTIATOR_AGENT_ID = 'agent_1';
  process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID = 'phone_1';
  const m = mockFetch(ok({ success: true, message: 'ok', conversation_id: 'conv_1', callSid: 'CA1' }));
  try {
    const out = await placeCall({
      toNumber: '+911234567890',
      initiationData: { type: 'conversation_initiation_client_data', dynamic_variables: { call_id: 'call_1' } },
    });
    const call = m.calls[0];
    assert.equal(call.url, 'https://api.elevenlabs.io/v1/convai/twilio/outbound-call');
    assert.equal(call.options.headers['xi-api-key'], 'xi-test');
    assert.equal(call.body.agent_id, 'agent_1');
    assert.equal(call.body.agent_phone_number_id, 'phone_1');
    assert.equal(call.body.to_number, '+911234567890');
    assert.equal(call.body.conversation_initiation_client_data.dynamic_variables.call_id, 'call_1');
    assert.equal(out.placed, true);
    assert.equal(out.conversationId, 'conv_1');
    assert.equal(out.callSid, 'CA1');
  } finally {
    m.restore();
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_NEGOTIATOR_AGENT_ID;
    delete process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID;
  }
});

test('elevenlabs-telephony: batch-calling request matches docs', async () => {
  process.env.ELEVENLABS_API_KEY = 'xi-test';
  process.env.ELEVENLABS_NEGOTIATOR_AGENT_ID = 'agent_1';
  const m = mockFetch(ok({ id: 'batch_1', status: 'pending' }));
  try {
    const out = await placeBatch({ callName: 'scout-test', recipients: [{ phone_number: '+9111' }] });
    const call = m.calls[0];
    assert.equal(call.url, 'https://api.elevenlabs.io/v1/convai/batch-calling/submit');
    assert.equal(call.options.headers['xi-api-key'], 'xi-test');
    assert.equal(call.body.call_name, 'scout-test');
    assert.equal(call.body.agent_id, 'agent_1');
    assert.deepEqual(call.body.recipients, [{ phone_number: '+9111' }]);
    assert.equal(out.submitted, true);
  } finally {
    m.restore();
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_NEGOTIATOR_AGENT_ID;
  }
});

test('connectors no-op safely without credentials (no fetch attempted)', async () => {
  delete process.env.TAVILY_API_KEY;
  delete process.env.ELEVENLABS_API_KEY;
  let fetched = false;
  const original = globalThis.fetch;
  globalThis.fetch = async () => { fetched = true; return ok({})(); };
  try {
    const tav = await fetchAreaRentData({ city: 'x' });
    assert.equal(tav.available, false);
    const call = await placeCall({ toNumber: '+91' });
    assert.equal(call.placed, false);
    assert.equal(fetched, false); // guarded before any network call
  } finally {
    globalThis.fetch = original;
  }
});

test('places-client: searchNearby request matches Places API (New) docs', async () => {
  process.env.GOOGLE_PLACES_API_KEY = 'gpk-test';
  const m = mockFetch(ok({
    places: [{
      id: 'ChIJ1', displayName: { text: 'Zolo Nest PG' }, nationalPhoneNumber: '090000 00001',
      location: { latitude: 12.9345, longitude: 77.6265 }, formattedAddress: '5th Block',
    }],
  }));
  try {
    const out = await discoverCandidates({ location: { lat: 12.9352, lng: 77.6245 }, dealType: 'pg', radiusMeters: 3000, limit: 5 });
    const call = m.calls[0];
    assert.equal(call.url, 'https://places.googleapis.com/v1/places:searchNearby');
    assert.equal(call.options.headers['x-goog-api-key'], 'gpk-test');
    assert.match(call.options.headers['x-goog-fieldmask'], /places\.nationalPhoneNumber/);
    assert.equal(call.body.locationRestriction.circle.center.latitude, 12.9352);
    assert.equal(call.body.locationRestriction.circle.radius, 3000);
    assert.equal(out.available, true);
    assert.equal(out.candidates[0].listing_id, 'ChIJ1');
    assert.equal(out.candidates[0].listing_name, 'Zolo Nest PG');
    assert.equal(out.candidates[0].phone, '090000 00001');
    assert.equal(out.candidates[0].source, 'google_places');
  } finally {
    m.restore();
    delete process.env.GOOGLE_PLACES_API_KEY;
  }
});

test('places-client: no key or no coords -> available false', async () => {
  delete process.env.GOOGLE_PLACES_API_KEY;
  assert.equal((await discoverCandidates({ location: { lat: 1, lng: 2 } })).available, false);
  process.env.GOOGLE_PLACES_API_KEY = 'gpk-test';
  try {
    const noCoords = await discoverCandidates({ location: { area: 'x' } });
    assert.equal(noCoords.available, false);
  } finally {
    delete process.env.GOOGLE_PLACES_API_KEY;
  }
});

test('dial: places outbound call and links callSid/conversationId', async () => {
  process.env.ELEVENLABS_API_KEY = 'xi-test';
  process.env.ELEVENLABS_NEGOTIATOR_AGENT_ID = 'agent_1';
  process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID = 'phone_1';
  const m = mockFetch(ok({ success: true, conversation_id: 'conv_9', callSid: 'CA9' }));
  try {
    const svc = createNegotiationService({ requirement: { location: {} } });
    const c = svc.startCall({ listing_id: 'a', phone: '+9111' });
    const r = await svc.dial(c.call_id);
    assert.equal(r.placed, true);
    assert.equal(r.callSid, 'CA9');
    assert.equal(svc.sessions.getByCallSid('CA9').call_id, c.call_id);
    assert.equal(svc.sessions.getByConversationId('conv_9').call_id, c.call_id);
  } finally {
    m.restore();
    delete process.env.ELEVENLABS_API_KEY;
    delete process.env.ELEVENLABS_NEGOTIATOR_AGENT_ID;
    delete process.env.ELEVENLABS_AGENT_PHONE_NUMBER_ID;
  }
});
