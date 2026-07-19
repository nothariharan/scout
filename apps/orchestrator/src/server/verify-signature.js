// verify-signature.js
// Verify the ElevenLabs webhook HMAC signature. Header format:
//   ElevenLabs-Signature: t={unix_timestamp},v0={hex_hmac_sha256}
// where the HMAC is computed over `${t}.${rawBody}` with the shared secret.
// Grounded in: https://elevenlabs.io/docs/eleven-api/resources/webhooks

import crypto from 'node:crypto';

/**
 * @param {string} rawBody - the exact raw request body string
 * @param {string} signatureHeader - value of the ElevenLabs-Signature header
 * @param {string} [secret] - shared webhook secret; if falsy, verification is
 *   skipped (returns true) so local/dev runs without a secret still work
 * @param {object} [opts]
 * @param {number} [opts.toleranceSecs]
 * @param {number} [opts.now] - current time in ms (injectable for tests)
 * @returns {boolean}
 */
export function verifyElevenLabsSignature(rawBody, signatureHeader, secret, { toleranceSecs = 1800, now = Date.now() } = {}) {
  if (!secret) return true; // no secret configured => skip (dev)
  if (!signatureHeader || typeof signatureHeader !== 'string') return false;

  const parts = parseHeader(signatureHeader);
  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp)) return false;
  if (Math.abs(Math.floor(now / 1000) - timestamp) > toleranceSecs) return false;

  const expected = `v0=${crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`;
  const provided = `v0=${parts.v0 ?? ''}`;
  return timingSafeEqual(expected, provided);
}

function parseHeader(header) {
  const out = {};
  for (const segment of header.split(',')) {
    const idx = segment.indexOf('=');
    if (idx > 0) out[segment.slice(0, idx).trim()] = segment.slice(idx + 1).trim();
  }
  return out;
}

function timingSafeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}
