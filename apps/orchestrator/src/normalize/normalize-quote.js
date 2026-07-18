// normalize-quote.js
// Convert raw fields extracted from ONE call into a normalized Quote object
// (schemas/quote.json). Computes the single comparable effective_monthly_cost.
// Immutable: returns a new object. Does NOT decide risk (see risk-service).

import { effectiveMonthlyCost } from '../lib/contracts.js';

const NUMERIC_DEFAULTS = {
  base_rent: 0,
  deposit: 0,
  maintenance_monthly: 0,
  brokerage_onetime: 0,
  hidden_charges: 0,
};

/**
 * @param {object} raw - loosely-shaped fields from transcript parsing
 * @returns {object} normalized Quote
 */
export function normalizeQuote(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new TypeError('normalizeQuote: raw quote fields required');
  }
  if (!raw.listing_id) {
    throw new Error('normalizeQuote: listing_id is required');
  }
  const months = Number(raw.lease_duration_months);
  if (!Number.isFinite(months) || months < 1) {
    throw new RangeError('normalizeQuote: lease_duration_months must be >= 1');
  }

  const base = {
    listing_id: raw.listing_id,
    listing_name: raw.listing_name ?? '',
    seller_language: raw.seller_language ?? 'en',
    ...NUMERIC_DEFAULTS,
    ...pickNumbers(raw),
    lease_duration_months: months,
    amenities_included: Array.isArray(raw.amenities_included) ? [...raw.amenities_included] : [],
    fraud_signals: Array.isArray(raw.fraud_signals) ? [...raw.fraud_signals] : [],
    ...(Number.isFinite(Number(raw.commute_minutes)) ? { commute_minutes: Number(raw.commute_minutes) } : {}),
    transcript_url: raw.transcript_url ?? '',
    recording_url: raw.recording_url ?? '',
  };

  const effective = effectiveMonthlyCost(base);

  return {
    ...base,
    effective_monthly_cost: effective,
    first_quoted_effective: numberOr(raw.first_quoted_effective, effective),
    final_quoted_effective: numberOr(raw.final_quoted_effective, effective),
    price_moved: Boolean(raw.price_moved),
    risk_flag: raw.risk_flag ?? 'verified',
    call_outcome: raw.call_outcome ?? { status: 'itemized_quote' },
  };
}

function pickNumbers(raw) {
  const out = {};
  for (const key of Object.keys(NUMERIC_DEFAULTS)) {
    if (raw[key] !== undefined) out[key] = Number(raw[key]) || 0;
  }
  return out;
}

function numberOr(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}
