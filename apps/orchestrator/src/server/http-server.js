// http-server.js
// Dependency-free HTTP surface for intake, discovery, the mid-call tool API, the
// ElevenLabs agent webhooks, a live SSE event stream, and the report.
// Framework-free (node:http) so the app stays independently runnable.
//
// Intake:            POST /requirement, GET /requirement
// Discovery:         GET /candidates
// Mid-call tools:    POST /calls, POST /calls/:id/quote,
//                    GET /calls/:id/leverage, POST /calls/:id/outcome
// Read/live:         GET /calls, GET /calls/:id, GET /events (SSE)
// ElevenLabs hooks:  POST /agent/personalization, POST /agent/post-call (HMAC)
// Reporting:         GET /report

import http from 'node:http';
import { createNegotiationService } from './negotiation-service.js';
import { verifyElevenLabsSignature } from './verify-signature.js';
import { loadState, saveState } from '../store/persistence.js';

export function createServer({ requirement, benchmark, fallbackByPincode = {}, statePath } = {}) {
  const initial = statePath ? loadState(statePath) : null;
  const service = createNegotiationService({ requirement, benchmark, fallbackByPincode, initial });

  // Optional persistence: snapshot to disk whenever state changes.
  if (statePath) {
    service.events.on('event', () => saveState(statePath, service.snapshot()));
  }

  const server = http.createServer(async (req, res) => {
    try {
      await route(req, res, service);
    } catch (err) {
      send(res, 400, { error: String(err?.message ?? err) });
    }
  });

  return { server, service };
}

async function route(req, res, service) {
  const url = new URL(req.url, 'http://localhost');
  const { pathname } = url;
  const { method } = req;

  // CORS preflight (the web app is a separate origin).
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type,elevenlabs-signature',
    });
    return res.end();
  }

  if (method === 'GET' && pathname === '/health') {
    return send(res, 200, { ok: true });
  }

  // --- Intake ---
  if (method === 'POST' && pathname === '/requirement') {
    const { json } = await readBody(req);
    const confirmed = service.setRequirement(json.spec ?? json);
    const bm = await service.refreshBenchmark();
    return send(res, 201, { ...confirmed, benchmark: bm });
  }
  if (method === 'GET' && pathname === '/requirement') {
    return send(res, 200, service.getRequirement());
  }

  // --- Discovery ---
  if (method === 'GET' && pathname === '/candidates') {
    return send(res, 200, await service.discover());
  }

  // --- ElevenLabs agent webhooks (HMAC-verified) ---
  if (method === 'POST' && pathname === '/agent/personalization') {
    const { raw, json } = await readBody(req);
    if (!verifySignature(req, raw)) return send(res, 401, { error: 'invalid signature' });
    return send(res, 200, service.personalize(json));
  }
  if (method === 'POST' && pathname === '/agent/post-call') {
    const { raw, json } = await readBody(req);
    if (!verifySignature(req, raw)) return send(res, 401, { error: 'invalid signature' });
    return send(res, 200, await service.ingestPostCall(json));
  }

  // --- Live event stream (SSE) ---
  if (method === 'GET' && pathname === '/events') {
    res.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      'access-control-allow-origin': '*',
    });
    res.write(`data: ${JSON.stringify({ type: 'snapshot', at: new Date().toISOString(), calls: service.listCalls() })}\n\n`);
    const listener = (e) => res.write(`data: ${JSON.stringify(e)}\n\n`);
    service.events.on('event', listener);
    req.on('close', () => service.events.off('event', listener));
    return; // keep the connection open
  }

  // --- Mid-call tool API ---
  if (method === 'POST' && pathname === '/calls') {
    const { json } = await readBody(req);
    return send(res, 201, service.startCall(json));
  }

  const quoteMatch = pathname.match(/^\/calls\/([^/]+)\/quote$/);
  if (method === 'POST' && quoteMatch) {
    const { json } = await readBody(req);
    return send(res, 200, service.writeQuoteFields(quoteMatch[1], json));
  }

  const leverageMatch = pathname.match(/^\/calls\/([^/]+)\/leverage$/);
  if (method === 'GET' && leverageMatch) {
    return send(res, 200, { leverage: service.getLeverage(leverageMatch[1]) });
  }

  const outcomeMatch = pathname.match(/^\/calls\/([^/]+)\/outcome$/);
  if (method === 'POST' && outcomeMatch) {
    const { json } = await readBody(req);
    return send(res, 200, service.closeCall(outcomeMatch[1], json));
  }

  const dialMatch = pathname.match(/^\/calls\/([^/]+)\/dial$/);
  if (method === 'POST' && dialMatch) {
    return send(res, 200, await service.dial(dialMatch[1]));
  }

  // --- Read models ---
  if (method === 'GET' && pathname === '/calls') {
    return send(res, 200, service.listCalls());
  }
  const callMatch = pathname.match(/^\/calls\/([^/]+)$/);
  if (method === 'GET' && callMatch) {
    const call = service.getCall(callMatch[1]);
    return call ? send(res, 200, call) : send(res, 404, { error: 'unknown call' });
  }

  // --- Reporting ---
  if (method === 'GET' && pathname === '/report') {
    return send(res, 200, await service.report());
  }

  return send(res, 404, { error: 'not found' });
}

function verifySignature(req, raw) {
  return verifyElevenLabsSignature(raw, req.headers['elevenlabs-signature'], process.env.ELEVENLABS_WEBHOOK_SECRET);
}

// Read the raw body once and parse JSON from it (raw is needed for HMAC verify).
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) return resolve({ raw: '', json: {} });
      try {
        resolve({ raw, json: JSON.parse(raw) });
      } catch {
        reject(new Error('invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json', 'access-control-allow-origin': '*' });
  res.end(JSON.stringify(payload));
}
