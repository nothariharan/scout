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
//   POST /calls/:id/outcome        { status, reason?, callback_at? }
//   GET  /report                   ranked comparison + recommendation

import http from 'node:http';
import { createNegotiationService } from './negotiation-service.js';

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
