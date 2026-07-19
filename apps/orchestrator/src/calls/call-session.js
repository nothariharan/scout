// call-session.js
// Tracks the lifecycle + accumulating quote fields for one outbound call.
// The orchestrator owns call state; the ElevenLabs agent writes fields into a
// session *during* the call via the mid-call tool API (not after hang-up).

export const CALL_STATES = ['queued', 'in_progress', 'completed'];

// Fields an agent tool is allowed to write mid-call. Anything else is ignored
// so a chatty agent can't inject arbitrary keys into a quote.
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
  'transcript_url',
  'recording_url',
  'base_price',
  'packing',
  'unpacking',
  'stairs',
  'long_carry',
  'fuel',
  'insurance',
  'storage',
  'other_fees',
  'binding_total',
  'first_quoted_total',
  'quote_status',
  'risk_signals',
  'counter_rounds',
  'labor', 'materials', 'transport', 'demolition_prep', 'permits_taxes', 'other_fees',
  'warranty_months', 'timeline_days', 'scope_complete', 'exclusions',
]);

export function createCallSessionStore({ prefix = 'call' } = {}) {
  const sessions = new Map(); // call_id -> session
  let counter = 0;

  function nextId() {
    counter += 1;
      return `${prefix}_${counter}`;
  }

  return {
    create({ listing_id, listing_name = '', phone = '', seller_language = 'en' } = {}) {
      if (!listing_id) throw new Error('call-session: listing_id required');
      const id = nextId();
      const session = {
        call_id: id,
        listing_id,
        listing_name,
        phone,
        seller_language,
        state: 'queued',
        rawFields: { listing_id, listing_name, lease_duration_months: 12 },
        transcript: '',
        outcome: null,
      };
      sessions.set(id, session);
      return { ...session };
    },

    get(id) {
      const s = sessions.get(id);
      return s ? { ...s } : null;
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

    setOutcome(id, outcome) {
      const s = sessions.get(id);
      if (!s) throw new Error(`call-session: unknown call ${id}`);
      const updated = { ...s, state: 'completed', outcome };
      sessions.set(id, updated);
      return { ...updated };
    },

    setProvider(id, provider = {}) {
      const s = sessions.get(id);
      if (!s) throw new Error(`call-session: unknown call ${id}`);
      const updated = { ...s, ...provider, state: provider.state ?? s.state };
      sessions.set(id, updated);
      return { ...updated };
    },

    findByConversation(conversationId) {
      for (const session of sessions.values()) {
        if (session.provider_conversation_id === conversationId) return { ...session };
      }
      return null;
    },

    all() {
      return [...sessions.values()].map((s) => ({ ...s }));
    },

    get size() {
      return sessions.size;
    },
  };
}

function sanitize(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (ALLOWED_FIELDS.has(key)) out[key] = value;
  }
  return out;
}
