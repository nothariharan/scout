import { createCallSessionStore } from '../calls/call-session.js';
import { planNegotiation } from '../negotiation/strategy-engine.js';
import { createVendorIntelligenceStore } from '../negotiation/vendor-intelligence.js';
import { normalizeMovingQuote, rankMovingQuotes } from './moving-quote.js';

export function createMovingNegotiationService({ request, benchmark, idPrefix = 'moving_call' } = {}) {
  const sessions = createCallSessionStore({ prefix: idPrefix }); const vendorIntelligence = createVendorIntelligenceStore(); const quotes = []; const comparableQuotes = [];
  function startCall(candidate) { return sessions.create(candidate); }
  function listCalls() { return sessions.all(); }
  function writeQuoteFields(callId, fields) { return sessions.patchFields(callId, fields); }
  function getLeverage() { return comparableQuotes.map((quote) => ({ type: 'comparable_unit', value: quote.binding_total, verified: true, source: 'completed_itemized_call', vendor_id: quote.vendor_id })); }
  function fairMarketValue() { const values = comparableQuotes.map((quote) => Number(quote.binding_total)).filter(Number.isFinite).sort((a, b) => a - b); if (!values.length) return undefined; const middle = Math.floor(values.length / 2); return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2; }
  function getStrategy(callId, fields = {}) {
    if (Object.keys(fields).length) sessions.patchFields(callId, fields);
    const session = sessions.get(callId); if (!session) throw new Error(`unknown call ${callId}`);
    const raw = session.rawFields;
    return planNegotiation({ vertical: 'moving', posture: request?.negotiation_posture ?? 'balanced', current_offer: raw.binding_total ?? raw.first_quoted_total ?? raw.base_price, target_price: request?.budget?.ideal, reserve_price: request?.budget?.ceiling, fair_market_value: benchmark?.binding_total ?? fairMarketValue(), counter_round: fields.counter_round ?? raw.counter_rounds ?? 0, leverage: getLeverage(), transcript: session.transcript, vendor: vendorIntelligence.get(session.listing_id) });
  }
  function closeCall(callId, outcome = {}) {
    const session = sessions.get(callId); if (!session) throw new Error(`unknown call ${callId}`); sessions.setOutcome(callId, outcome);
    if (session.rawFields.base_price == null && session.rawFields.binding_total == null) return { session: sessions.get(callId), quote: null };
    const quote = normalizeMovingQuote({ ...session.rawFields, vendor_id: session.listing_id, vendor_name: session.listing_name, transcript: session.transcript, call_outcome: outcome.status });
    quotes.push(quote); if (outcome.status === 'itemized_quote' && quote.risk_flag !== 'high_risk') comparableQuotes.push(quote);
    vendorIntelligence.recordOutcome({ vendor_id: quote.vendor_id, first_offer: quote.first_quoted_total, final_offer: quote.binding_total, counter_rounds: session.rawFields.counter_rounds, outcome: outcome.status, signals: quote.risk_signals });
    return { session: sessions.get(callId), quote };
  }
  async function report() { const ranked = rankMovingQuotes(quotes, request); const top = ranked[0]; return { ranked, recommendation: top ? { headline: `${top.vendor_name}: ${top.binding_total} ${request?.budget?.currency ?? ''}, ${top.risk_flag}`, top_pick: top.vendor_id } : { headline: 'No moving quotes captured yet.' }, benchmark }; }
  return { startCall, listCalls, writeQuoteFields, getLeverage, getStrategy, closeCall, report, sessions, vendorIntelligence };
}
