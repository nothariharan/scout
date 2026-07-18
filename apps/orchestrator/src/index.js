// @scout/orchestrator — backend public API.
// Person B modules, all wired to @scout/contracts + @scout/vertical-config.

export { normalizeQuote } from './normalize/normalize-quote.js';
export { createQuotesStore } from './store/quotes-store.js';
export { createBenchmarkService } from './benchmark/benchmark-service.js';
export { fetchAreaRentData } from './benchmark/tavily-client.js';
export { detectFraudSignals } from './risk/fraud-signals.js';
export { assessRisk } from './risk/risk-service.js';
export { buildLeverage } from './leverage/leverage-builder.js';
export { capturePriceDrop } from './negotiation/price-drop.js';
export { rankQuotes } from './ranking/rank-quotes.js';
export { parseTranscriptToQuote } from './transcripts/parse-transcript.js';
export { generateRecommendation } from './transcripts/recommend.js';
export { runComparison } from './pipeline.js';
export * as outcomes from './outcomes/call-outcome.js';

// Call orchestration + integration surface (mid-call tool API, telephony, discovery).
export { createCallSessionStore } from './calls/call-session.js';
export { createNegotiationService } from './server/negotiation-service.js';
export { createServer } from './server/http-server.js';
export { discoverCandidates } from './discovery/places-client.js';
export { placeCall, placeBatch } from './telephony/twilio-client.js';
