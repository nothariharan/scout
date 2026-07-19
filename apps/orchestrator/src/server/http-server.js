// http-server.js
// Dependency-free HTTP surface for the mid-call tool API, the ElevenLabs agent
// webhooks, and the report. Framework-free (node:http) so the app stays
// independently runnable.
//
// Mid-call tools (agent):    POST /calls, POST /calls/:id/quote,
//                            GET /calls/:id/leverage, POST /calls/:id/outcome
// ElevenLabs webhooks:       POST /agent/personalization, POST /agent/post-call
//                            (HMAC-verified when ELEVENLABS_WEBHOOK_SECRET is set)
// Reporting (frontend):      GET /report

import http from 'node:http';
import { createNegotiationService } from './negotiation-service.js';
import { verifyElevenLabsSignature } from './verify-signature.js';

export function createServer({ requirement, benchmark } = {}) {
  const service = createNegotiationService({ requirement, benchmark });

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

  if (method === 'GET' && pathname === '/health') {
    return send(res, 200, { ok: true });
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
    return send(res, 200, service.ingestPostCall(json));
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
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(payload));
}
