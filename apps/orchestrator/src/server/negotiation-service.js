// negotiation-service.js
// The backend service behind the mid-call tool API + agent webhooks. Holds the
// confirmed RequirementSpec (intake), call sessions with indexed transcripts,
// the confirmed-quotes store (real leverage), and every assessed quote (for the
// report). Emits lifecycle + transcript-line events for the UI's live feed, and
// produces a contract-shaped Recommendation with real transcript evidence_refs.

import { EventEmitter } from 'node:events';
import { createCallSessionStore } from '../calls/call-session.js';
import { createQuotesStore } from '../store/quotes-store.js';
import { normalizeQuote } from '../normalize/normalize-quote.js';
import { assessRisk } from '../risk/risk-service.js';
import { capturePriceDrop } from '../negotiation/price-drop.js';
import { buildLeverage } from '../leverage/leverage-builder.js';
import { rankQuotes } from '../ranking/rank-quotes.js';
import { generateReasoning } from '../transcripts/recommend.js';
import { buildInitiationData } from '../agent/initiation-data.js';
import { parseTranscriptToQuote } from '../transcripts/parse-transcript.js';
import { isValidOutcome, CALL_OUTCOME_STATUSES } from '../outcomes/call-outcome.js';
import { discoverCandidates } from '../discovery/places-client.js';
import { resolveBenchmark } from '../benchmark/benchmark-service.js';
import { placeCall } from '../telephony/elevenlabs-telephony.js';
import { fraud_rules } from '../lib/config.js';

export function createNegotiationService({ requirement, benchmark, fallbackByPincode = {}, initial } = {}) {
  const sessions = createCallSessionStore({ initial: initial?.sessions });
  const store = createQuotesStore({ initial: initial?.store }); // itemized, non-fraud quotes => real leverage
  const events = new EventEmitter();
  events.setMaxListeners(0);

  let assessedQuotes = initial?.assessedQuotes ? initial.assessedQuotes.map((q) => ({ ...q })) : [];
  const evidenceIndex = new Map(initial?.evidenceIndex ?? []); // listing_id -> { line_index, quote_field }
  let currentRequirement = initial?.requirement ?? requirement ?? null;
  let currentBenchmark = initial?.benchmark ?? benchmark ?? null;
  let reqCounter = initial?.reqCounter ?? (requirement ? 1 : 0);
  let requirementId = initial?.requirementId ?? (requirement ? 'req_1' : null);

  const benchmarkValue = () => currentBenchmark?.effective_monthly ?? undefined;
  const emit = (type, payload) => events.emit('event', { type, at: new Date().toISOString(), ...payload });

  // --- Intake -----------------------------------------------------------------
  function setRequirement(spec) {
    if (!spec || typeof spec !== 'object') throw new Error('setRequirement: spec object required');
    reqCounter += 1;
    requirementId = `req_${reqCounter}`;
    currentRequirement = spec;
    emit('requirement_confirmed', { requirement_id: requirementId });
    return { id: requirementId, spec };
  }
  function getRequirement() {
    return currentRequirement ? { id: requirementId, spec: currentRequirement } : null;
  }
  async function refreshBenchmark() {
    if (!currentRequirement) return currentBenchmark;
    currentBenchmark = await resolveBenchmark(currentRequirement, { fallbackByPincode });
    emit('benchmark_updated', { benchmark: currentBenchmark });
    return currentBenchmark;
  }
  const getBenchmark = () => currentBenchmark;

  // --- Discovery --------------------------------------------------------------
  async function discover() {
    const result = await discoverCandidates({
      location: currentRequirement?.location,
      dealType: currentRequirement?.deal_type ?? 'pg',
    });
    return { requirement_id: requirementId, ...result };
  }

  // --- Calls ------------------------------------------------------------------
  function startCall(candidate) {
    const session = sessions.create(candidate);
    emit('call_started', {
      call_id: session.call_id,
      listing_id: session.listing_id,
      listing_name: session.listing_name,
      state: session.state,
    });
    return session;
  }

  function writeQuoteFields(callId, fields) {
    sessions.patchFields(callId, fields);
    // transcript_append + price_drop_evidence become indexed transcript lines.
    if (fields.transcript_append) {
      const { line } = sessions.appendLine(callId, { speaker: 'seller', text: fields.transcript_append });
      emit('line', { call_id: callId, line });
    }
    if (fields.price_drop_evidence) {
      const { index, line } = sessions.appendLine(callId, {
        speaker: 'seller',
        text: fields.price_drop_evidence,
        tag: 'concession',
      });
      const session = sessions.get(callId);
      evidenceIndex.set(session.listing_id, { line_index: index, quote_field: 'price_moved' });
      emit('line', { call_id: callId, line });
    }
    const session = sessions.get(callId);
    emit('quote_updated', { call_id: callId, listing_id: session.listing_id, rawFields: session.rawFields });
    return session;
  }

  function listCalls() {
    return sessions.all().map((s) => ({
      call_id: s.call_id,
      listing_id: s.listing_id,
      listing_name: s.listing_name,
      state: s.state,
      seller_language: s.seller_language,
      outcome: s.outcome,
      transcript: s.transcriptLines,
      quote: assessedQuotes.find((q) => q.listing_id === s.listing_id) ?? null,
    }));
  }

  function getCall(callId) {
    const s = sessions.get(callId);
    if (!s) return null;
    // Expose transcript as the indexed line array (matches listCalls + the
    // frontend CallRecord.transcript); evidence_refs.line_index points into it.
    const { transcript, transcriptLines, ...rest } = s;
    return {
      ...rest,
      transcript: transcriptLines,
      quote: assessedQuotes.find((q) => q.listing_id === s.listing_id) ?? null,
    };
  }

  function getLeverage(callId) {
    const session = callId ? sessions.get(callId) : null;
    const targetQuote = session ? { listing_id: session.listing_id, ...session.rawFields } : undefined;
    return buildLeverage({ store, benchmark: currentBenchmark, targetQuote });
  }

  // --- ElevenLabs webhooks ----------------------------------------------------
  function personalize({ called_number, call_sid } = {}) {
    let session = call_sid ? sessions.getByCallSid(call_sid) : null;
    if (!session && call_sid) {
      session = sessions.create({ listing_id: called_number ?? call_sid, phone: called_number ?? '', call_sid });
      emit('call_started', {
        call_id: session.call_id,
        listing_id: session.listing_id,
        listing_name: session.listing_name,
        state: session.state,
      });
    }
    return buildInitiationData(currentRequirement ?? {}, {
      callId: session?.call_id ?? null,
      listingId: session?.listing_id ?? null,
    });
  }

  function linkConversation(callId, conversationId) {
    return sessions.linkConversation(callId, conversationId);
  }

  async function dial(callId) {
    const session = sessions.get(callId);
    if (!session) throw new Error(`unknown call ${callId}`);
    const initiationData = buildInitiationData(currentRequirement ?? {}, {
      callId: session.call_id,
      listingId: session.listing_id,
    });
    const result = await placeCall({ toNumber: session.phone, initiationData });
    if (result.callSid) sessions.linkCallSid(callId, result.callSid);
    if (result.conversationId) sessions.linkConversation(callId, result.conversationId);
    emit('call_dialed', { call_id: callId, placed: result.placed, call_sid: result.callSid ?? null });
    return { call_id: callId, ...result };
  }

  async function ingestPostCall(event = {}) {
    const data = event?.data ?? {};
    const conversationId = data.conversation_id;
    const session = conversationId ? sessions.getByConversationId(conversationId) : null;
    if (!session) return { ok: true, matched: false };

    // Append each transcript turn as an indexed line.
    for (const turn of Array.isArray(data.transcript) ? data.transcript : []) {
      const text = turn?.message ?? turn?.text ?? '';
      if (!text) continue;
      const { line } = sessions.appendLine(session.call_id, {
        speaker: turn.role === 'agent' ? 'scout' : 'seller',
        text,
      });
      emit('line', { call_id: session.call_id, line });
    }

    // Attach evidence links when the webhook provides them.
    const evidence = {};
    const recordingUrl = data.recording_url ?? data.metadata?.recording_url;
    const transcriptUrl = data.transcript_url ?? data.metadata?.transcript_url;
    if (recordingUrl) evidence.recording_url = recordingUrl;
    if (transcriptUrl) evidence.transcript_url = transcriptUrl;
    if (Object.keys(evidence).length) sessions.patchFields(session.call_id, evidence);

    // Recover structured fields from the transcript if none were captured mid-call.
    const cur = sessions.get(session.call_id);
    if (cur.rawFields.base_rent == null && cur.transcript) {
      const parsed = await parseTranscriptToQuote(cur.transcript, { listingId: session.listing_id });
      sessions.patchFields(session.call_id, parsed);
    }

    emit('transcript_ingested', { call_id: session.call_id, listing_id: session.listing_id });
    return { ok: true, matched: true, call_id: session.call_id };
  }

  // --- Close + report ---------------------------------------------------------
  function closeCall(callId, outcome) {
    const session = sessions.get(callId);
    if (!session) throw new Error(`unknown call ${callId}`);

    if (!isValidOutcome(outcome)) {
      throw new Error(`invalid call outcome; must be one of ${CALL_OUTCOME_STATUSES.join(', ')}`);
    }
    if ((outcome.status === 'callback_scheduled' || outcome.status === 'declined') && !outcome.reason) {
      throw new Error(`call outcome '${outcome.status}' requires a reason`);
    }

    sessions.setOutcome(callId, outcome);

    if (session.rawFields.base_rent == null) {
      emit('call_closed', { call_id: callId, listing_id: session.listing_id, outcome, quote: null });
      return { session: sessions.get(callId), quote: null };
    }

    let quote = normalizeQuote({
      ...session.rawFields,
      seller_language: session.seller_language,
      listing_name: session.listing_name,
      call_outcome: outcome,
    });

    if (session.rawFields.first_quoted_effective != null && session.rawFields.final_quoted_effective != null) {
      const drop = capturePriceDrop({
        firstEffective: session.rawFields.first_quoted_effective,
        finalEffective: session.rawFields.final_quoted_effective,
        evidenceLine: session.rawFields.price_drop_evidence,
      });
      quote = { ...quote, ...drop };
    }

    const risk = assessRisk({ quote, transcript: session.transcript, benchmark: benchmarkValue() });
    quote = { ...quote, ...risk };

    // Guarantee at least one evidence line for this listing (Recommendation needs it).
    ensureEvidenceLine(callId, quote);

    assessedQuotes = [...assessedQuotes, quote];
    if (outcome?.status === 'itemized_quote' && quote.risk_flag !== 'high_risk') {
      store.addConfirmed(quote);
    }

    emit('call_closed', { call_id: callId, listing_id: session.listing_id, outcome, quote });
    return { session: sessions.get(callId), quote };
  }

  // Record an evidence line index for a listing if we don't have one yet.
  function ensureEvidenceLine(callId, quote) {
    const session = sessions.get(callId);
    if (evidenceIndex.has(session.listing_id)) return;

    // Prefer a real fraud line if this quote was flagged.
    if ((quote.fraud_signals ?? []).length > 0) {
      const idx = fraudLineIndex(session.transcriptLines);
      if (idx != null) {
        evidenceIndex.set(session.listing_id, { line_index: idx, quote_field: 'fraud_signals' });
        return;
      }
    }
    // Otherwise append a synthesized summary line so evidence always resolves.
    const summary = `Itemised quote for ${session.listing_name || session.listing_id}: rent ${quote.base_rent}, deposit ${quote.deposit}, effective ${quote.effective_monthly_cost}.`;
    const { index, line } = sessions.appendLine(callId, { speaker: 'scout', text: summary, tag: 'guardrail' });
    evidenceIndex.set(session.listing_id, { line_index: index, quote_field: 'base_rent' });
    emit('line', { call_id: callId, line });
  }

  /** Ranked comparison + contract-shaped Recommendation across all calls. */
  async function report() {
    const ranked = rankQuotes(assessedQuotes, { requirement: currentRequirement });
    const reasoning = await generateReasoning(ranked, currentRequirement);
    const recommendation = buildRecommendation(ranked, reasoning);
    return { requirement_id: requirementId, ranked, recommendation, benchmark: currentBenchmark };
  }

  function buildRecommendation(ranked, reasoning) {
    if (ranked.length === 0) return null;
    const top = ranked[0];
    const ev = evidenceIndex.get(top.listing_id);
    const evidence_refs = [
      ev
        ? { listing_id: top.listing_id, line_index: ev.line_index, quote_field: ev.quote_field }
        : { listing_id: top.listing_id, line_index: 0 },
    ];
    return {
      requirement_spec_id: requirementId ?? 'req_unknown',
      ranked_listing_ids: [...new Set(ranked.map((q) => q.listing_id))],
      top_pick: {
        listing_id: top.listing_id,
        reasoning: reasoning || `${top.listing_name || top.listing_id} is the recommended option.`,
        evidence_refs,
      },
      generated_at: new Date().toISOString(),
    };
  }

  /** Serializable snapshot of all state (for JSON persistence). */
  function snapshot() {
    return {
      requirementId,
      reqCounter,
      requirement: currentRequirement,
      benchmark: currentBenchmark,
      assessedQuotes,
      evidenceIndex: [...evidenceIndex.entries()],
      store: store.snapshot(),
      sessions: sessions.snapshot(),
    };
  }

  return {
    setRequirement,
    getRequirement,
    refreshBenchmark,
    getBenchmark,
    discover,
    snapshot,
    startCall,
    writeQuoteFields,
    listCalls,
    getCall,
    getLeverage,
    personalize,
    linkConversation,
    dial,
    ingestPostCall,
    closeCall,
    report,
    events,
    sessions,
    store,
  };
}

// Find the first transcript line that contains a configured fraud keyword.
function fraudLineIndex(transcriptLines) {
  const keywords = (fraud_rules ?? []).flatMap((r) => r.trigger_keywords ?? []).map((k) => String(k).toLowerCase());
  for (const line of transcriptLines) {
    const text = (line.text || '').toLowerCase();
    if (keywords.some((k) => text.includes(k))) return line.index;
  }
  return null;
}
