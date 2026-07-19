// parse-transcript.js
// Parse a raw call transcript into structured quote fields. Uses OpenAI
// Structured Outputs (response_format: json_schema, strict) when OPENAI_API_KEY
// is set; otherwise falls back to a deterministic regex parser so the pipeline
// stays runnable in a demo without keys.
//
// Grounded in the OpenAI Structured Outputs guide
// (https://platform.openai.com/docs/guides/structured-outputs).

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

// strict Structured Outputs schema: every property is required; optional values
// are expressed as nullable via a [type, 'null'] union.
const QUOTE_EXTRACTION_SCHEMA = {
  name: 'quote_fields',
  strict: true,
  schema: {
    type: 'object',
    additionalProperties: false,
    properties: {
      base_rent: { type: ['number', 'null'] },
      deposit: { type: ['number', 'null'] },
      maintenance_monthly: { type: ['number', 'null'] },
      brokerage_onetime: { type: ['number', 'null'] },
      hidden_charges: { type: ['number', 'null'] },
      lease_duration_months: { type: ['integer', 'null'] },
      amenities_included: { type: 'array', items: { type: 'string' } },
    },
    required: [
      'base_rent',
      'deposit',
      'maintenance_monthly',
      'brokerage_onetime',
      'hidden_charges',
      'lease_duration_months',
      'amenities_included',
    ],
  },
};

/**
 * @param {string} transcript
 * @param {object} [opts]
 * @param {string} [opts.listingId]
 * @param {string} [opts.model]
 * @returns {Promise<object>} raw quote fields (feed to normalizeQuote)
 */
export async function parseTranscriptToQuote(transcript, { listingId, model = DEFAULT_MODEL } = {}) {
  if (!transcript || typeof transcript !== 'string') {
    throw new TypeError('parseTranscriptToQuote: transcript string required');
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    return parseWithOpenAI(transcript, { listingId, model, apiKey });
  }
  return fallbackParse(transcript, listingId);
}

// Extract ONLY fees the seller explicitly stated; null for anything unstated.
async function parseWithOpenAI(transcript, { listingId, model, apiKey }) {
  const res = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'Extract only fees explicitly stated by the seller in the call transcript. ' +
            'Use null for anything not stated. Never guess or infer a number.',
        },
        { role: 'user', content: transcript },
      ],
      response_format: { type: 'json_schema', json_schema: QUOTE_EXTRACTION_SCHEMA },
    }),
  });
  if (!res.ok) {
    throw new Error(`parseTranscriptToQuote: openai ${res.status}`);
  }
  const data = await res.json();
  const parsed = JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
  return { listing_id: listingId ?? 'unknown', lease_duration_months: 12, ...stripNulls(parsed) };
}

const FIELD_PATTERNS = {
  base_rent: /rent[^0-9]{0,20}([0-9][0-9,]{2,})/i,
  deposit: /deposit[^0-9]{0,20}([0-9][0-9,]{2,})/i,
  maintenance_monthly: /maintenance[^0-9]{0,20}([0-9][0-9,]{2,})/i,
  brokerage_onetime: /(?:brokerage|broker fee)[^0-9]{0,20}([0-9][0-9,]{2,})/i,
};

/** Deterministic keyword+number extraction — good enough for demo transcripts. */
function fallbackParse(transcript, listingId) {
  const fields = { listing_id: listingId ?? 'unknown', lease_duration_months: 12 };
  for (const [field, pattern] of Object.entries(FIELD_PATTERNS)) {
    const match = transcript.match(pattern);
    if (match) fields[field] = Number(match[1].replace(/,/g, ''));
  }
  return fields;
}

function stripNulls(obj) {
  const out = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined) out[key] = value;
  }
  return out;
}
