import { getVerticalProfile } from '@scout/vertical-config';

const FEES = ['labor', 'materials', 'transport', 'demolition_prep', 'permits_taxes', 'other_fees'];

export function normalizeRenovationQuote(raw = {}) {
  if (!raw.vendor_id && !raw.listing_id) throw new Error('renovation quote requires vendor_id');
  const quote = Object.fromEntries(FEES.map((name) => [name, Math.max(0, Number(raw[name]) || 0)]));
  const itemized_total = Object.values(quote).reduce((sum, value) => sum + value, 0);
  const binding_total = Math.max(0, Number(raw.binding_total) || itemized_total);
  return { vendor_id: raw.vendor_id ?? raw.listing_id, vendor_name: raw.vendor_name ?? raw.listing_name ?? '', ...quote, itemized_total, binding_total, first_quoted_total: Math.max(0, Number(raw.first_quoted_total) || binding_total), warranty_months: Math.max(0, Number(raw.warranty_months) || 0), timeline_days: Math.max(0, Number(raw.timeline_days) || 0), scope_complete: Boolean(raw.scope_complete), exclusions: Array.isArray(raw.exclusions) ? raw.exclusions : [], transcript: raw.transcript ?? '', risk_signals: Array.isArray(raw.risk_signals) ? raw.risk_signals : [], call_outcome: raw.call_outcome ?? { status: 'itemized_quote' } };
}

export function assessRenovationRisk(quote, transcript = '') {
  const profile = getVerticalProfile('home_renovation'); const text = `${transcript} ${quote.transcript}`.toLowerCase();
  const signals = profile.fraud_rules.filter((rule) => rule.trigger_keywords.some((keyword) => text.includes(keyword))).map((rule) => rule.id);
  if (!quote.scope_complete) signals.push('scope_not_itemized');
  return { risk_signals: [...new Set(signals)], risk_flag: signals.some((signal) => ['large_upfront_payment', 'cash_no_invoice'].includes(signal)) ? 'high_risk' : signals.length ? 'caution' : 'verified' };
}

export function rankRenovationQuotes(quotes, request = {}) {
  const ceiling = Number(request?.budget?.ceiling) || Infinity;
  return [...quotes].sort((a, b) => (a.risk_flag === 'high_risk') - (b.risk_flag === 'high_risk') || a.binding_total - b.binding_total || b.scope_complete - a.scope_complete || b.warranty_months - a.warranty_months || a.timeline_days - b.timeline_days).map((quote, index) => ({ ...quote, rank: index + 1, over_budget: quote.binding_total > ceiling, reasoning: `binding project total ${quote.binding_total}; ${quote.scope_complete ? 'itemized scope' : 'scope incomplete'}; ${quote.risk_flag}` }));
}
