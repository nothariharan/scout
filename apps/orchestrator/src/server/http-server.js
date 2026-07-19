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
import { EventEmitter } from 'node:events';
import { createNegotiationService } from './negotiation-service.js';
import { createMovingNegotiationService } from '../moving/moving-negotiation-service.js';
import { planNegotiation } from '../negotiation/strategy-engine.js';
import { discoverCandidates } from '../discovery/places-client.js';
import { createRequirementStore } from '../requests/requirement-store.js';
import { placeCall } from '../telephony/twilio-client.js';
import { verifyElevenLabsSignature } from './verify-signature.js';
import { createBenchmarkService } from '../benchmark/benchmark-service.js';

export function createServer({ requirement, benchmark, discovery = discoverCandidates, callProvider = placeCall, requirementStore = createRequirementStore({ filePath: process.env.SCOUT_LOCAL_STATE_PATH }), benchmarkService = createBenchmarkService() } = {}) {
  const service = createNegotiationService({ requirement, benchmark });
  const services = new Map();
  if (requirement) services.set('default', service);
  const bus = new EventEmitter();
  bus.setMaxListeners(0); // many SSE subscribers is fine

  const server = http.createServer(async (req, res) => {
    try {
      await route(req, res, { service, services, benchmark, discovery, callProvider, requirementStore, benchmarkService, bus });
    } catch (err) {
      send(res, 400, { error: String(err?.message ?? err) });
    }
  });

  return { server, service, services, requirementStore, bus };
}

function createWorkflowService(spec, benchmark, idPrefix) {
  return spec?.vertical === 'moving'
    ? createMovingNegotiationService({ request: spec, benchmark, idPrefix: `moving_${idPrefix ?? 'call'}` })
    : createNegotiationService({ requirement: spec, benchmark });
}

function workflowForCall(services, defaultService, callId) {
  if (defaultService.sessions.get(callId)) return defaultService;
  return [...services.values()].find((candidate) => candidate.sessions.get(callId)) ?? null;
}

async function route(req, res, context) {
  const { service, services, benchmark, discovery, callProvider, requirementStore, benchmarkService, bus } = context;
  const url = new URL(req.url, 'http://localhost');
  const { pathname } = url;
  const { method } = req;

  if (method === 'OPTIONS') {
    return send(res, 204, null);
  }

  if (method === 'GET' && pathname === '/health') {
    return send(res, 200, { ok: true });
  }

  // Live activity stream for the web ledger (Server-Sent Events). Emits an
  // initial snapshot of all sessions, then every call lifecycle event.
  if (method === 'GET' && pathname === '/events') {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      'access-control-allow-origin': process.env.WEB_ORIGIN || '*',
    });
    const uniq = new Set([service, ...services.values()]);
    const calls = [...uniq].flatMap((s) => s.listCalls());
    res.write(`data: ${JSON.stringify({ type: 'snapshot', at: new Date().toISOString(), calls })}\n\n`);
    const listener = (e) => res.write(`data: ${JSON.stringify(e)}\n\n`);
    bus.on('event', listener);
    req.on('close', () => bus.off('event', listener));
    return;
  }

  // ElevenLabs webhook tools carry this secret once Scout is deployed. Keeping
  // it optional lets the local smoke tests and localhost development work,
  // while a public endpoint is never left writable by an arbitrary caller.
  if (isAgentToolPath(method, pathname) && !hasAgentToolAccess(req)) {
    return send(res, 401, { error: 'unauthorized agent tool request' });
  }

  if (method === 'POST' && pathname === '/calls') {
    const body = await readBody(req);
    const session = service.startCall(body);
    emit(bus, 'call_started', { call_id: session.call_id, listing_id: session.listing_id, listing_name: session.listing_name, state: session.state });
    return send(res, 201, session);
  }

  if (method === 'GET' && pathname === '/calls') {
    return send(res, 200, { calls: service.listCalls() });
  }

  const quoteMatch = pathname.match(/^\/calls\/([^/]+)\/quote$/);
  if (method === 'POST' && quoteMatch) {
    const body = await readBody(req);
    const workflow = workflowForCall(services, service, quoteMatch[1]);
    if (!workflow) return send(res, 404, { error: 'call not found' });
    const updated = workflow.writeQuoteFields(quoteMatch[1], body);
    emit(bus, 'quote_updated', { call_id: quoteMatch[1], listing_id: updated.listing_id, rawFields: updated.rawFields });
    return send(res, 200, updated);
  }

  const leverageMatch = pathname.match(/^\/calls\/([^/]+)\/leverage$/);
  if (method === 'GET' && leverageMatch) {
    const workflow = workflowForCall(services, service, leverageMatch[1]);
    if (!workflow) return send(res, 404, { error: 'call not found' });
    return send(res, 200, { leverage: workflow.getLeverage(leverageMatch[1]) });
  }

  if (method === 'POST' && pathname === '/requirements') {
    const record = await requirementStore.create(await readBody(req));
    services.set(record.id, createWorkflowService(record.spec, benchmark, record.id));
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
    const isMoving = record.spec.vertical === 'moving';
    const serviceType = body.service_type ?? (isMoving ? 'moving' : record.spec.deal_type === 'hostel' ? 'hostel' : 'property_agent');
    const result = await discovery({ location: record.spec.origin ?? record.spec.location, serviceType, radiusMeters: body.radius_meters, limit: body.limit });
    if (!isMoving && record.spec.location) {
      const liveBenchmark = await benchmarkService.getBenchmark(record.spec.location, record.spec.deal_type);
      services.set(record.id, createWorkflowService(record.spec, liveBenchmark, record.id));
      result.market_research = liveBenchmark;
    }
    await requirementStore.setCandidates(record.id, result.candidates);
    return send(res, 200, result);
  }

  const candidatesMatch = pathname.match(/^\/requirements\/([^/]+)\/candidates$/);
  if (method === 'GET' && candidatesMatch) {
    const record = await requirementStore.get(candidatesMatch[1]);
    return record ? send(res, 200, { candidates: record.candidates ?? [] }) : send(res, 404, { error: 'requirement not found' });
  }
  if (method === 'POST' && candidatesMatch) {
    const record = await requirementStore.get(candidatesMatch[1]);
    if (!record) return send(res, 404, { error: 'requirement not found' });
    if (!record.confirmed_at) return send(res, 409, { error: 'confirm the requirement before adding a call candidate' });
    const body = await readBody(req);
    const candidate = createManualCandidate({ ...body, service_type: body.service_type ?? record.spec.deal_type ?? 'property_agent' }, record.candidates ?? []);
    await requirementStore.setCandidates(record.id, [...(record.candidates ?? []), candidate]);
    return send(res, 201, { candidate });
  }

  const requestCallsMatch = pathname.match(/^\/requirements\/([^/]+)\/calls$/);
  if (method === 'GET' && requestCallsMatch) {
    const workflow = services.get(requestCallsMatch[1]);
    return send(res, 200, { calls: workflow ? workflow.listCalls() : [] });
  }

  const requestReportMatch = pathname.match(/^\/requirements\/([^/]+)\/report$/);
  if (method === 'GET' && requestReportMatch) {
    const workflow = services.get(requestReportMatch[1]);
    return send(res, 200, workflow ? await workflow.report() : { ranked: [], recommendation: { headline: 'No calls have been dispatched yet.' } });
  }

  const dispatchMatch = pathname.match(/^\/requirements\/([^/]+)\/dispatch$/);
  if (method === 'POST' && dispatchMatch) {
    const record = await requirementStore.get(dispatchMatch[1]);
    if (!record) return send(res, 404, { error: 'requirement not found' });
    if (!record.confirmed_at) return send(res, 409, { error: 'confirm the requirement before dispatch' });
    const body = await readBody(req); const selected = new Set(body.listing_ids ?? []);
    const candidateList = (record.candidates ?? []).filter((candidate) => selected.has(candidate.listing_id));
    const workflow = services.get(record.id) ?? createWorkflowService(record.spec, benchmark, record.id);
    services.set(record.id, workflow);
    const calls = await Promise.all(candidateList.map(async (candidate) => {
      const session = workflow.startCall(candidate);
      emit(bus, 'call_started', { call_id: session.call_id, listing_id: candidate.listing_id, listing_name: candidate.listing_name, state: session.state });
      if (!candidate.phone) return { call_id: session.call_id, listing_id: candidate.listing_id, placed: false, reason: 'candidate has no published phone number' };
      const strategy = workflow.getStrategy(session.call_id, { vertical: record.spec.vertical ?? candidate.service_type ?? 'real_estate' });
      const result = await callProvider({ to: candidate.phone, metadata: callMetadata({ callId: session.call_id, request: record.spec, strategy }) });
      workflow.sessions.setProvider(session.call_id, { provider_conversation_id: result.conversationId, provider_call_sid: result.sid, state: result.placed ? 'in_progress' : 'queued' });
      return { call_id: session.call_id, listing_id: candidate.listing_id, ...result };
    }));
    return send(res, 200, { calls });
  }

  if (method === 'POST' && pathname === '/webhooks/elevenlabs') {
    const { raw, json: event } = await readRawBody(req);
    if (!verifyElevenLabsSignature(raw, req.headers['elevenlabs-signature'], process.env.ELEVENLABS_WEBHOOK_SECRET)) {
      return send(res, 401, { error: 'invalid signature' });
    }
    const conversationId = event.conversation_id ?? event.data?.conversation_id;
    const workflow = [...services.values()].find((candidate) => candidate.sessions.findByConversation(conversationId));
    const session = workflow?.sessions.findByConversation(conversationId);
    if (!workflow || !session) return send(res, 202, { accepted: true, matched: false });
    const transcript = transcriptFromEvent(event);
    const evidence = evidenceFromEvent(event);
    if (transcript || evidence.transcript_url || evidence.recording_url) {
      workflow.writeQuoteFields(session.call_id, { ...(transcript ? { transcript_append: transcript } : {}), ...evidence });
      emit(bus, 'quote_updated', { call_id: session.call_id, listing_id: session.listing_id, rawFields: workflow.sessions.get(session.call_id)?.rawFields ?? {} });
    }
    if ((event.status === 'completed' || event.type === 'post_call_transcription') && session.state !== 'completed') {
      const outcome = providerOutcome(event, workflow.sessions.get(session.call_id));
      const result = workflow.closeCall(session.call_id, outcome);
      emit(bus, 'call_closed', { call_id: session.call_id, listing_id: session.listing_id, outcome, quote: result.quote ?? null });
    }
    return send(res, 200, { accepted: true, matched: true });
  }

  const strategyMatch = pathname.match(/^\/calls\/([^/]+)\/strategy$/);
  if (method === 'POST' && strategyMatch) {
    const body = await readBody(req);
    const workflow = workflowForCall(services, service, strategyMatch[1]);
    if (!workflow) return send(res, 404, { error: 'call not found' });
    return send(res, 200, { strategy: workflow.getStrategy(strategyMatch[1], body) });
  }

  if (method === 'POST' && pathname === '/strategy') {
    const body = await readBody(req);
    return send(res, 200, { strategy: planNegotiation(body) });
  }

  const outcomeMatch = pathname.match(/^\/calls\/([^/]+)\/outcome$/);
  if (method === 'POST' && outcomeMatch) {
    const body = await readBody(req);
    const workflow = workflowForCall(services, service, outcomeMatch[1]);
    if (!workflow) return send(res, 404, { error: 'call not found' });
    const result = workflow.closeCall(outcomeMatch[1], body);
    emit(bus, 'call_closed', { call_id: outcomeMatch[1], listing_id: result.session?.listing_id, outcome: body, quote: result.quote ?? null });
    return send(res, 200, result);
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

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve({ raw, json: raw ? JSON.parse(raw) : {} });
      } catch {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function emit(bus, type, payload) {
  bus.emit('event', { type, at: new Date().toISOString(), ...payload });
}

function send(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json',
    // The Next.js app normally proxies these routes. This also keeps local
    // development usable when the browser talks to the orchestrator directly.
    'access-control-allow-origin': process.env.WEB_ORIGIN || '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type, x-scout-agent-secret',
  });
  res.end(payload == null ? '' : JSON.stringify(payload));
}

function isAgentToolPath(method, pathname) {
  return (method === 'POST' && /^\/calls\/[^/]+\/(quote|strategy|outcome)$/.test(pathname))
    || (method === 'GET' && /^\/calls\/[^/]+\/leverage$/.test(pathname));
}

function hasAgentToolAccess(req) {
  const secret = process.env.SCOUT_AGENT_TOOL_SECRET;
  return !secret || req.headers['x-scout-agent-secret'] === secret;
}

function createManualCandidate(input = {}, existing = []) {
  const listingName = String(input.listing_name ?? '').trim();
  const phone = String(input.phone ?? '').trim();
  if (!listingName) throw new Error('manual candidate requires a business name');
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error('manual candidate phone must use E.164 format, for example +16055550123');
  const stem = listingName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'test_contact';
  const listingId = `manual_${stem}_${existing.filter((candidate) => candidate.listing_id?.startsWith(`manual_${stem}_`)).length + 1}`;
  return {
    listing_id: listingId,
    listing_name: listingName,
    phone,
    service_type: String(input.service_type ?? 'property_agent'),
    source: 'manual_consented_test',
    address: String(input.address ?? 'Manually supplied test contact').trim(),
  };
}

function callMetadata({ callId, request = {}, strategy = {} }) {
  if (request.vertical !== 'moving') {
    const location = [request.location?.area, request.location?.city, request.location?.pincode].filter(Boolean).join(', ');
    const propertyScope = {
      deal_type: request.deal_type ?? '', location, occupancy: request.occupancy ?? '', furnishing: request.furnishing ?? '',
      amenities: request.amenities ?? [], move_in_date: request.move_in_date ?? '', lease_duration_months: request.lease_duration_months ?? '',
      deal_breakers: request.deal_breakers ?? [], ideal_budget: request.budget?.ideal ?? '', hard_ceiling: request.budget?.ceiling ?? '',
      currency: request.budget?.currency ?? 'INR', language_pref: request.language_pref ?? 'en',
    };
    return {
      call_id: callId,
      property_scope: JSON.stringify(propertyScope),
      location, deal_type: String(propertyScope.deal_type), furnishing: String(propertyScope.furnishing),
      occupancy: String(propertyScope.occupancy), move_in_date: String(propertyScope.move_in_date), lease_duration_months: String(propertyScope.lease_duration_months),
      budget_ideal: String(propertyScope.ideal_budget), budget_ceiling: String(propertyScope.hard_ceiling), currency: String(propertyScope.currency),
      strategy_brief: strategy.next_action?.verbalization_brief ?? strategy.next_action?.verbalization ?? 'Collect an itemized rental quote without pressure.',
      verified_leverage: JSON.stringify(strategy.verified_leverage ?? []),
    };
  }
  const origin = [request.origin?.area, request.origin?.city].filter(Boolean).join(', ');
  const destination = [request.destination?.area, request.destination?.city].filter(Boolean).join(', ');
  const scope = {
    origin, destination, move_date: request.move_date ?? '', home_size: request.home_size ?? '',
    inventory_notes: request.inventory_notes ?? '', services: request.services ?? {}, stairs: request.stairs ?? {},
    ideal_budget: request.budget?.ideal ?? '', hard_ceiling: request.budget?.ceiling ?? '', currency: request.budget?.currency ?? '',
  };
  return {
    call_id: callId,
    moving_scope: JSON.stringify(scope),
    origin, destination, move_date: String(scope.move_date), home_size: String(scope.home_size),
    inventory_notes: String(scope.inventory_notes), budget_ideal: String(scope.ideal_budget), budget_ceiling: String(scope.hard_ceiling), currency: String(scope.currency),
    strategy_brief: strategy.next_action?.verbalization_brief ?? strategy.next_action?.verbalization ?? 'Collect an itemized quote without pressure.',
    verified_leverage: JSON.stringify(strategy.verified_leverage ?? []),
  };
}

function transcriptFromEvent(event = {}) {
  const transcript = event.transcript ?? event.data?.transcript ?? event.data?.conversation?.transcript;
  if (typeof transcript === 'string') return transcript;
  if (!Array.isArray(transcript)) return '';
  return transcript.map((line) => typeof line === 'string' ? line : [line.role ?? line.speaker, line.message ?? line.text ?? line.content].filter(Boolean).join(': ')).filter(Boolean).join('\n');
}

function evidenceFromEvent(event = {}) {
  const data = event.data ?? event;
  return {
    transcript_url: data.transcript_url ?? data.transcriptUrl ?? data.conversation?.transcript_url,
    recording_url: data.recording_url ?? data.recordingUrl ?? data.audio_url ?? data.conversation?.recording_url,
  };
}

function providerOutcome(event = {}, session = {}) {
  const supplied = event.outcome?.status ?? event.data?.outcome?.status;
  if (['itemized_quote', 'callback_scheduled', 'declined'].includes(supplied)) {
    return { status: supplied, ...(event.outcome?.reason || event.data?.outcome?.reason ? { reason: event.outcome?.reason ?? event.data?.outcome?.reason } : {}), ...(event.outcome?.callback_at || event.data?.outcome?.callback_at ? { callback_at: event.outcome?.callback_at ?? event.data?.outcome?.callback_at } : {}) };
  }
  if (session?.rawFields?.base_price != null || session?.rawFields?.binding_total != null) return { status: 'itemized_quote' };
  return { status: 'callback_scheduled', reason: 'Provider call completed without an itemized quote; a reviewed follow-up is required.' };
}
