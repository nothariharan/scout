// vendor-intelligence.js
// In-memory seed for the future learning engine. The public API is intentionally
// persistence-agnostic: a database can replace it without changing strategy.

export function createVendorIntelligenceStore() {
  const vendors = new Map();

  function get(vendorId) {
    const profile = vendors.get(vendorId);
    return profile ? structuredClone(profile) : emptyProfile(vendorId);
  }

  function recordOutcome({ vendor_id, first_offer, final_offer, counter_rounds = 0, outcome, signals = [] } = {}) {
    if (!vendor_id) return null;
    const current = get(vendor_id);
    const improvement = number(first_offer) > 0 && number(final_offer) > 0
      ? Math.max(0, (number(first_offer) - number(final_offer)) / number(first_offer))
      : 0;
    const negotiated = improvement > 0;
    const calls = current.calls + 1;
    const updated = {
      ...current,
      calls,
      negotiated_calls: current.negotiated_calls + (negotiated ? 1 : 0),
      average_discount_percent: round(((current.average_discount_percent * current.calls) + improvement * 100) / calls),
      typical_counter_round: round(((current.typical_counter_round * current.calls) + number(counter_rounds)) / calls),
      last_outcome: outcome ?? 'unknown',
      observed_signals: [...new Set([...current.observed_signals, ...signals])],
    };
    vendors.set(vendor_id, updated);
    return structuredClone(updated);
  }

  return { get, recordOutcome };
}

function emptyProfile(vendor_id) {
  return {
    vendor_id,
    calls: 0,
    negotiated_calls: 0,
    average_discount_percent: 0,
    typical_counter_round: 0,
    last_outcome: 'unknown',
    observed_signals: [],
  };
}

function number(value) {
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function round(value) {
  return Math.round(value * 100) / 100;
}
