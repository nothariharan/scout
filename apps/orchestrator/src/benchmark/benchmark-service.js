// benchmark-service.js
// Area price benchmark with an in-memory TTL cache (shared quota — don't hit
// Tavily once per call). Returns the "going rate" effective monthly cost used
// both as a negotiation anchor and as the red-flag baseline.

import { fetchAreaRentData } from './tavily-client.js';

/**
 * @param {object} [opts]
 * @param {Function} [opts.client] - injectable fetcher (for tests/demo)
 * @param {number}   [opts.ttlMs] - cache lifetime
 * @param {Object}   [opts.fallbackByPincode] - pincode -> effective monthly cost
 */
export function createBenchmarkService({
  client = fetchAreaRentData,
  ttlMs = 1000 * 60 * 60,
  fallbackByPincode = {},
} = {}) {
  const cache = new Map(); // key -> { value, expiresAt }

  function keyOf(location) {
    return `${location.pincode || ''}|${(location.area || '').toLowerCase()}|${(location.city || '').toLowerCase()}`;
  }

  async function getBenchmark(location = {}, dealType = 'pg') {
    const key = keyOf(location);
    const hit = cache.get(key);
    if (hit && hit.expiresAt > Date.now()) {
      return hit.value;
    }

    const raw = await client({ ...location, dealType });
    const value = summarize(raw, location, fallbackByPincode);
    cache.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  return { getBenchmark };
}

/**
 * Reduce raw search results to a single benchmark number. Prefers parsed real
 * prices; falls back to a configured per-pincode estimate so the pipeline still
 * runs in a demo without Tavily.
 */
function summarize(raw, location, fallbackByPincode) {
  const fallback = fallbackByPincode[location.pincode] ?? null;
  const parsed = raw.available ? parsePrices(raw.results) : null;
  const effective = parsed ?? fallback;

  return {
    effective_monthly: effective,
    source: parsed != null ? 'tavily' : fallback != null ? 'fallback_estimate' : 'unavailable',
    sample_size: raw.available ? raw.results?.length ?? 0 : 0,
    fetched_at: new Date().toISOString(),
  };
}

/**
 * TODO(person-b): extract numeric monthly prices from Tavily result snippets and
 * return their median. Returns null until implemented.
 */
function parsePrices(_results) {
  return null;
}
