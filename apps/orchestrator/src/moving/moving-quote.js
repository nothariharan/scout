const PRICE_FIELDS = ['base_price', 'packing', 'unpacking', 'stairs', 'long_carry', 'fuel', 'insurance', 'storage', 'other_fees'];

export function normalizeMovingQuote(raw = {}) {
  if (!raw.vendor_id && !raw.listing_id) throw new Error('moving quote requires vendor_id');
  const fields = Object.fromEntries(PRICE_FIELDS.map((field) => [field, positive(raw[field])]));
  const calculated = PRICE_FIELDS.reduce((total, field) => total + fields[field], 0);
  const bindingTotal = finite(raw.binding_total) ? Number(raw.binding_total) : calculated;
  const transcript = String(raw.transcript ?? raw.transcript_append ?? '').toLowerCase();
  const riskSignals = [...new Set([
    ...(Array.isArray(raw.risk_signals) ? raw.risk_signals : []),
    ...(transcript.includes('cash before unloading') || transcript.includes('pay before delivery') ? ['hostage_load_risk'] : []),
    ...(transcript.includes('final price after loading') || raw.quote_status === 'estimate_only' ? ['non_binding_quote'] : []),
  ])];
  return {
    vendor_id: raw.vendor_id ?? raw.listing_id,
    vendor_name: raw.vendor_name ?? raw.listing_name ?? '',
    ...fields,
    binding_total: bindingTotal,
    first_quoted_total: finite(raw.first_quoted_total) ? Number(raw.first_quoted_total) : bindingTotal,
    price_moved: Boolean(raw.price_moved) || Number(raw.first_quoted_total) > bindingTotal,
    quote_status: raw.quote_status ?? 'binding',
    risk_flag: riskSignals.includes('hostage_load_risk') ? 'high_risk' : riskSignals.length ? 'caution' : 'verified',
    risk_signals: riskSignals,
    call_outcome: raw.call_outcome ?? 'itemized_quote',
    transcript: String(raw.transcript ?? raw.transcript_append ?? ''),
    transcript_url: raw.transcript_url ?? '',
    recording_url: raw.recording_url ?? '',
  };
}

export function rankMovingQuotes(quotes, request = {}) {
  const ceiling = Number(request?.budget?.ceiling) || Infinity;
  return [...quotes].sort((a, b) => (a.risk_flag === 'high_risk') - (b.risk_flag === 'high_risk') || a.binding_total - b.binding_total)
    .map((quote, index) => ({ ...quote, rank: index + 1, over_budget: quote.binding_total > ceiling, reasoning: `${quote.quote_status} total ${quote.binding_total}; ${quote.risk_flag}${quote.price_moved ? '; price negotiated down' : ''}` }));
}

function positive(value) { return finite(value) ? Math.max(0, Number(value)) : 0; }
function finite(value) { return Number.isFinite(Number(value)); }
