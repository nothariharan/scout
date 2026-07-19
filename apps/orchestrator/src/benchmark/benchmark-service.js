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
  const parsed = raw.available ? parseBenchmark(raw) : null;
  const effective = parsed ?? fallback;

  return {
    effective_monthly: effective,
    source: parsed != null ? 'tavily' : fallback != null ? 'fallback_estimate' : 'unavailable',
    sample_size: raw.available ? raw.results?.length ?? 0 : 0,
    fetched_at: new Date().toISOString(),
  };
}

/** Parse a median monthly price from Tavily's synthesized answer + result text. */
function parseBenchmark(raw) {
  const text = [raw.answer, ...(raw.results ?? []).map((r) => r.content ?? '')].join(' ');
  const prices = extractMonthlyPrices(text);
  return prices.length > 0 ? median(prices) : null;
}

// Pull plausible monthly rent figures: currency-prefixed (₹/Rs/INR 12,000) or
// suffixed (12000 per month). Filter to a sane rent band to drop stray numbers.
function extractMonthlyPrices(text) {
  const prices = [];
  const re = /(?:₹|rs\.?|inr)\s*([0-9][0-9,]{2,})|([0-9][0-9,]{3,})\s*(?:per month|\/month|monthly|p\.?m\.?)/gi;
  let match;
  while ((match = re.exec(text)) !== null) {
    const digits = (match[1] ?? match[2] ?? '').replace(/,/g, '');
    const value = Number(digits);
    if (Number.isFinite(value) && value >= 3000 && value <= 200000) prices.push(value);
  }
  return prices;
}

function median(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;
}

/**
 * Convenience: resolve the area benchmark for a requirement in one call.
 * Uses Tavily when TAVILY_API_KEY is set; otherwise the per-pincode fallback.
 * @param {object} requirement - RequirementSpec (reads location + deal_type)
 * @param {object} [opts]
 * @param {Object} [opts.fallbackByPincode]
 * @returns {Promise<{effective_monthly:number|null, source:string, sample_size:number, fetched_at:string}>}
 */
export async function resolveBenchmark(requirement = {}, { fallbackByPincode = {} } = {}) {
  const service = createBenchmarkService({ fallbackByPincode });
  return service.getBenchmark(requirement.location ?? {}, requirement.deal_type ?? 'pg');
}
