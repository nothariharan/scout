import { createCallSessionStore } from '../calls/call-session.js';
import { planNegotiation } from '../negotiation/strategy-engine.js';
import { assessRenovationRisk, normalizeRenovationQuote, rankRenovationQuotes } from './renovation-quote.js';

export function createRenovationNegotiationService({ request, idPrefix = 'renovation_call' } = {}) {
  const sessions = createCallSessionStore({ prefix: idPrefix }); let quotes = [];
  function startCall(candidate) { return sessions.create(candidate); }
  function listCalls() { return sessions.all(); }
  function writeQuoteFields(id, fields) { return sessions.patchFields(id, fields); }
  function getLeverage() { return quotes.filter((quote) => quote.risk_flag !== 'high_risk').map((quote) => ({ type: 'comparable_unit', value: quote.binding_total, verified: true, evidence: { listing_id: quote.vendor_id, listing_name: quote.vendor_name } })); }
  function getStrategy(id, fields = {}) { const session = sessions.get(id); if (!session) throw new Error(`unknown call ${id}`); if (Object.keys(fields).length) sessions.patchFields(id, fields); const raw = sessions.get(id).rawFields; return planNegotiation({ vertical: 'home_renovation', posture: request?.negotiation_posture ?? 'balanced', current_offer: raw.binding_total ?? raw.first_quoted_total, target_price: request?.budget?.ideal, reserve_price: request?.budget?.ceiling, counter_round: fields.counter_round ?? 0, leverage: getLeverage(), transcript: sessions.get(id).transcript }); }
  function closeCall(id, outcome) { const session = sessions.get(id); if (!session) throw new Error(`unknown call ${id}`); sessions.setOutcome(id, outcome); if (session.rawFields.binding_total == null && session.rawFields.labor == null) return { session: sessions.get(id), quote: null }; const quote = { ...normalizeRenovationQuote({ ...session.rawFields, vendor_id: session.listing_id, vendor_name: session.listing_name, transcript: session.transcript, call_outcome: outcome }), ...assessRenovationRisk({ ...session.rawFields, scope_complete: session.rawFields.scope_complete }, session.transcript) }; quotes = [...quotes, quote]; return { session: sessions.get(id), quote }; }
  async function report() { const ranked = rankRenovationQuotes(quotes, request); return { ranked, recommendation: ranked[0] ? { headline: `${ranked[0].vendor_name}: INR ${ranked[0].binding_total}, ${ranked[0].risk_flag}`, top_pick: ranked[0].vendor_id } : { headline: 'No contractor quotes captured yet.' } }; }
  return { startCall, listCalls, writeQuoteFields, getLeverage, getStrategy, closeCall, report, sessions };
}
