// call-session.js
// Tracks the lifecycle, accumulating quote fields, and an INDEXED transcript for
// one outbound call. Line indices are load-bearing: Recommendation.evidence_refs
// points at them. Also maps a session to its ElevenLabs/Twilio identifiers
// (call_sid, conversation_id) so mid-call writes and post-call webhooks land in
// the right session.

export const CALL_STATES = ['queued', 'in_progress', 'completed'];

// Fields an agent tool is allowed to write mid-call. Anything else is ignored so
// a chatty agent can't inject arbitrary keys into a quote. (transcript_append /
// price_drop_evidence are handled as transcript lines, not quote fields.)
const ALLOWED_FIELDS = new Set([
  'base_rent',
  'deposit',
  'maintenance_monthly',
  'brokerage_onetime',
  'hidden_charges',
  'lease_duration_months',
  'amenities_included',
  'first_quoted_effective',
  'final_quoted_effective',
  'price_moved',
  'price_drop_evidence',
  'commute_minutes',
  'seller_language',
  'listing_name',
  'transcript_url',
  'recording_url',
]);

export function createCallSessionStore({ initial } = {}) {
  const sessions = new Map(); // call_id -> session
  const byCallSid = new Map(); // twilio call_sid -> call_id
  const byConversationId = new Map(); // elevenlabs conversation_id -> call_id
  let counter = 0;

  // Hydrate from a prior snapshot() (indices are derived from the session list).
  if (initial) {
    counter = initial.counter ?? 0;
    for (const s of initial.list ?? []) {
      sessions.set(s.call_id, clone(s));
      if (s.call_sid) byCallSid.set(s.call_sid, s.call_id);
      if (s.conversation_id) byConversationId.set(s.conversation_id, s.call_id);
    }
  }

  const nextId = () => `call_${(counter += 1)}`;

  const api = {
    create({ listing_id, listing_name = '', phone = '', seller_language = 'en', call_sid = null } = {}) {
      if (!listing_id) throw new Error('call-session: listing_id required');
      const id = nextId();
      const session = {
        call_id: id,
        listing_id,
        listing_name,
        phone,
        seller_language,
        call_sid,
        conversation_id: null,
        state: 'queued',
        rawFields: { listing_id, listing_name, lease_duration_months: 12 },
        transcriptLines: [], // [{ index, speaker, text, tag? }]
        transcript: '',
        outcome: null,
      };
      sessions.set(id, session);
      if (call_sid) byCallSid.set(call_sid, id);
      return clone(session);
    },

    get(id) {
      const s = sessions.get(id);
      return s ? clone(s) : null;
    },

    getByCallSid(callSid) {
      const id = byCallSid.get(callSid);
      return id ? api.get(id) : null;
    },

    getByConversationId(conversationId) {
      const id = byConversationId.get(conversationId);
      return id ? api.get(id) : null;
    },

    /** Merge partial structured fields written mid-call (immutable update). */
    patchFields(id, fields = {}) {
      const s = sessions.get(id);
      if (!s) throw new Error(`call-session: unknown call ${id}`);
      const updated = { ...s, state: 'in_progress', rawFields: { ...s.rawFields, ...sanitize(fields) } };
      sessions.set(id, updated);
      return clone(updated);
    },

    /** Append one indexed transcript line; returns its index + the line object. */
    appendLine(id, { speaker = 'seller', text = '', tag } = {}) {
      const s = sessions.get(id);
      if (!s) throw new Error(`call-session: unknown call ${id}`);
      const index = s.transcriptLines.length;
      const newLine = tag ? { index, speaker, text, tag } : { index, speaker, text };
      const transcriptLines = [...s.transcriptLines, newLine];
      const updated = { ...s, transcriptLines, transcript: transcriptLines.map((l) => l.text).join(' ').trim() };
      sessions.set(id, updated);
      return { index, line: { ...newLine }, session: clone(updated) };
    },

    linkCallSid(id, callSid) {
      const s = sessions.get(id);
      if (!s) throw new Error(`call-session: unknown call ${id}`);
      sessions.set(id, { ...s, call_sid: callSid });
      byCallSid.set(callSid, id);
      return api.get(id);
    },

    linkConversation(id, conversationId) {
      const s = sessions.get(id);
      if (!s) throw new Error(`call-session: unknown call ${id}`);
      sessions.set(id, { ...s, conversation_id: conversationId });
      byConversationId.set(conversationId, id);
      return api.get(id);
    },

    setOutcome(id, outcome) {
      const s = sessions.get(id);
      if (!s) throw new Error(`call-session: unknown call ${id}`);
      const updated = { ...s, state: 'completed', outcome };
      sessions.set(id, updated);
      return clone(updated);
    },

    all() {
      return [...sessions.values()].map(clone);
    },

    /** Serializable copy for persistence (indices rebuild from the list). */
    snapshot() {
      return { list: [...sessions.values()].map(clone), counter };
    },

    get size() {
      return sessions.size;
    },
  };

  return api;
}

function clone(s) {
  return { ...s, rawFields: { ...s.rawFields }, transcriptLines: s.transcriptLines.map((l) => ({ ...l })) };
}

function sanitize(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (ALLOWED_FIELDS.has(key)) out[key] = value;
  }
  return out;
}
