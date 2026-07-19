// call-session.js
// Tracks the lifecycle + accumulating quote fields for one outbound call, and
// maps a session to its ElevenLabs/Twilio identifiers (call_sid, conversation_id)
// so mid-call tool writes and post-call webhooks land in the right session.
// The ElevenLabs agent writes fields into a session *during* the call.

export const CALL_STATES = ['queued', 'in_progress', 'completed'];

// Fields an agent tool is allowed to write mid-call. Anything else is ignored so
// a chatty agent can't inject arbitrary keys into a quote.
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
  'commute_minutes',
  'seller_language',
  'listing_name',
  'price_drop_evidence',
  'transcript_url',
  'recording_url',
]);

export function createCallSessionStore() {
  const sessions = new Map(); // call_id -> session
  const byCallSid = new Map(); // twilio call_sid -> call_id
  const byConversationId = new Map(); // elevenlabs conversation_id -> call_id
  let counter = 0;

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
        transcript: '',
        outcome: null,
      };
      sessions.set(id, session);
      if (call_sid) byCallSid.set(call_sid, id);
      return { ...session };
    },

    get(id) {
      const s = sessions.get(id);
      return s ? { ...s } : null;
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
      const appended = fields.transcript_append
        ? `${s.transcript} ${fields.transcript_append}`.trim()
        : s.transcript;
      const updated = {
        ...s,
        state: 'in_progress',
        rawFields: { ...s.rawFields, ...sanitize(fields) },
        transcript: appended,
      };
      sessions.set(id, updated);
      return { ...updated };
    },

    /** Link the Twilio call SID to a session (from the outbound-call response). */
    linkCallSid(id, callSid) {
      const s = sessions.get(id);
      if (!s) throw new Error(`call-session: unknown call ${id}`);
      sessions.set(id, { ...s, call_sid: callSid });
      byCallSid.set(callSid, id);
      return api.get(id);
    },

    /** Link the ElevenLabs conversation id (for post-call webhook matching). */
    linkConversation(id, conversationId) {
      const s = sessions.get(id);
      if (!s) throw new Error(`call-session: unknown call ${id}`);
      sessions.set(id, { ...s, conversation_id: conversationId });
      byConversationId.set(conversationId, id);
      return api.get(id);
    },

    /** Append transcript text (used by the post-call webhook). */
    appendTranscript(id, text) {
      const s = sessions.get(id);
      if (!s) throw new Error(`call-session: unknown call ${id}`);
      const updated = { ...s, transcript: `${s.transcript} ${text ?? ''}`.trim() };
      sessions.set(id, updated);
      return { ...updated };
    },

    setOutcome(id, outcome) {
      const s = sessions.get(id);
      if (!s) throw new Error(`call-session: unknown call ${id}`);
      const updated = { ...s, state: 'completed', outcome };
      sessions.set(id, updated);
      return { ...updated };
    },

    all() {
      return [...sessions.values()].map((s) => ({ ...s }));
    },

    get size() {
      return sessions.size;
    },
  };

  return api;
}

function sanitize(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (ALLOWED_FIELDS.has(key)) out[key] = value;
  }
  return out;
}
