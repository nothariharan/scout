// http-server.js
// Dependency-free HTTP surface for the mid-call tool API + report. ElevenLabs
// agent tools POST structured fields during the call; the frontend GETs the
// report. Framework-free (node:http) so the app stays independently runnable.
//
// Routes:
//   GET  /health
//   GET  /calls                    -> active/completed sessions for the live ledger
//   POST /calls                    { listing_id, listing_name?, phone? } -> session
//   POST /calls/:id/quote          partial quote fields written mid-call
//   GET  /calls/:id/leverage       real leverage for the Negotiator
//   POST /calls/:id/strategy       bounded next-action decision for the voice agent
//   POST /calls/:id/outcome        { status, reason?, callback_at? }
//   GET  /report                   ranked comparison + recommendation

import http from 'node:http';
import { createNegotiationService } from './negotiation-service.js';
import { planNegotiation } from '../negotiation/strategy-engine.js';
import { discoverCandidates } from '../discovery/places-client.js';
import { createRequirementStore } from '../requests/requirement-store.js';
import { placeCall } from '../telephony/twilio-client.js';

export function createServer({ requirement, benchmark, discovery = discoverCandidates, callProvider = placeCall, requirementStore = createRequirementStore({ filePath: process.env.SCOUT_LOCAL_STATE_PATH }) } = {}) {
  const service = createNegotiationService({ requirement, benchmark });
  const services = new Map();
  if (requirement) services.set('default', service);

  const server = http.createServer(async (req, res) => {
    try {
      await route(req, res, { service, services, benchmark, discovery, callProvider, requirementStore });
    } catch (err) {
      send(res, 400, { error: String(err?.message ?? err) });
    }
  });

  return { server, service, services, requirementStore };
}

async function route(req, res, context) {
  const { service, services, benchmark, discovery, callProvider, requirementStore } = context;
  const url = new URL(req.url, 'http://localhost');
  const { pathname } = url;
  const { method } = req;

  if (method === 'OPTIONS') {
    return send(res, 204, null);
  }

  if (method === 'GET' && pathname === '/health') {
    return send(res, 200, { ok: true });
  }

  if (method === 'POST' && pathname === '/calls') {
    const body = await readBody(req);
    return send(res, 201, service.startCall(body));
  }

  if (method === 'GET' && pathname === '/calls') {
    return send(res, 200, { calls: service.listCalls() });
  }

  const quoteMatch = pathname.match(/^\/calls\/([^/]+)\/quote$/);
  if (method === 'POST' && quoteMatch) {
    const body = await readBody(req);
    return send(res, 200, service.writeQuoteFields(quoteMatch[1], body));
  }

  const leverageMatch = pathname.match(/^\/calls\/([^/]+)\/leverage$/);
  if (method === 'GET' && leverageMatch) {
    return send(res, 200, { leverage: service.getLeverage(leverageMatch[1]) });
  }

  if (method === 'POST' && pathname === '/requirements') {
    const record = await requirementStore.create(await readBody(req));
    services.set(record.id, createNegotiationService({ requirement: record.spec, benchmark }));
    return send(res, 201, record);
  }

  const requirementMatch = pathname.match(/^\/requirements\/([^/]+)$/);
  if (method === 'GET' && requirementMatch) {
    const record = await requirementStore.get(requirementMatch[1]);
    return record ? send(res, 200, record) : send(res, 404, { error: 'requirement not found' });
  }

  const confirmMatch = pathname.match(/^\/requirements\/([^/]+)\/confirm$/);
  if (method === 'POST' && confirmMatch) return send(res, 200, await requirementStore.confirm(confirmMatch[1]));

  const discoverMatch = pathname.match(/^\/requirements\/([^/]+)\/discover$/);
  if (method === 'POST' && discoverMatch) {
    const record = await requirementStore.get(discoverMatch[1]);
    if (!record) return send(res, 404, { error: 'requirement not found' });
    if (!record.confirmed_at) return send(res, 409, { error: 'confirm the requirement before discovery' });
    const body = await readBody(req);
    const result = await discovery({ location: record.spec.location, serviceType: body.service_type ?? 'moving', radiusMeters: body.radius_meters, limit: body.limit });
    await requirementStore.setCandidates(record.id, result.candidates);
    return send(res, 200, result);
  }

  const candidatesMatch = pathname.match(/^\/requirements\/([^/]+)\/candidates$/);
  if (method === 'GET' && candidatesMatch) {
    const record = await requirementStore.get(candidatesMatch[1]);
    return record ? send(res, 200, { candidates: record.candidates ?? [] }) : send(res, 404, { error: 'requirement not found' });
  }

  const requestCallsMatch = pathname.match(/^\/requirements\/([^/]+)\/calls$/);
  if (method === 'GET' && requestCallsMatch) {
    const workflow = services.get(requestCallsMatch[1]);
    return send(res, 200, { calls: workflow ? workflow.listCalls() : [] });
  }

  const dispatchMatch = pathname.match(/^\/requirements\/([^/]+)\/dispatch$/);
  if (method === 'POST' && dispatchMatch) {
    const record = await requirementStore.get(dispatchMatch[1]);
    if (!record) return send(res, 404, { error: 'requirement not found' });
    if (!record.confirmed_at) return send(res, 409, { error: 'confirm the requirement before dispatch' });
    const body = await readBody(req); const selected = new Set(body.listing_ids ?? []);
    const candidateList = (record.candidates ?? []).filter((candidate) => selected.has(candidate.listing_id));
    const workflow = services.get(record.id) ?? createNegotiationService({ requirement: record.spec, benchmark });
    services.set(record.id, workflow);
    const calls = await Promise.all(candidateList.map(async (candidate) => {
      const session = workflow.startCall(candidate);
      if (!candidate.phone) return { call_id: session.call_id, listing_id: candidate.listing_id, placed: false, reason: 'candidate has no published phone number' };
      const strategy = workflow.getStrategy(session.call_id, { vertical: candidate.service_type ?? 'moving' });
      const result = await callProvider({ to: candidate.phone, metadata: { call_id: session.call_id, strategy_brief: strategy.next_action.verbalization, verified_leverage: JSON.stringify(strategy.verified_leverage ?? []) } });
      workflow.sessions.setProvider(session.call_id, { provider_conversation_id: result.conversationId, provider_call_sid: result.sid, state: result.placed ? 'in_progress' : 'queued' });
      return { call_id: session.call_id, listing_id: candidate.listing_id, ...result };
    }));
    return send(res, 200, { calls });
  }

  if (method === 'POST' && pathname === '/webhooks/elevenlabs') {
    const event = await readBody(req);
    const conversationId = event.conversation_id ?? event.data?.conversation_id;
    const workflow = [...services.values()].find((candidate) => candidate.sessions.findByConversation(conversationId));
    const session = workflow?.sessions.findByConversation(conversationId);
    if (!workflow || !session) return send(res, 202, { accepted: true, matched: false });
    const transcript = event.transcript ?? event.data?.transcript;
    if (typeof transcript === 'string') workflow.writeQuoteFields(session.call_id, { transcript_append: transcript });
    if (event.status === 'completed' || event.type === 'post_call_transcription') workflow.closeCall(session.call_id, { status: 'callback_required', reason: 'provider call completed; quote extraction pending' });
    return send(res, 200, { accepted: true, matched: true });
  }

  const strategyMatch = pathname.match(/^\/calls\/([^/]+)\/strategy$/);
  if (method === 'POST' && strategyMatch) {
    const body = await readBody(req);
    return send(res, 200, { strategy: service.getStrategy(strategyMatch[1], body) });
  }

  if (method === 'POST' && pathname === '/strategy') {
    const body = await readBody(req);
    return send(res, 200, { strategy: planNegotiation(body) });
  }

  const outcomeMatch = pathname.match(/^\/calls\/([^/]+)\/outcome$/);
  if (method === 'POST' && outcomeMatch) {
    const body = await readBody(req);
    return send(res, 200, service.closeCall(outcomeMatch[1], body));
  }

  if (method === 'GET' && pathname === '/report') {
    return send(res, 200, await service.report());
  }

  return send(res, 404, { error: 'not found' });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json',
    // The Next.js app normally proxies these routes. This also keeps local
    // development usable when the browser talks to the orchestrator directly.
    'access-control-allow-origin': process.env.WEB_ORIGIN || '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  res.end(payload == null ? '' : JSON.stringify(payload));
}
