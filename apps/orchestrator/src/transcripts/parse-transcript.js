// parse-transcript.js
// Parse a raw call transcript into structured quote fields. Uses OpenAI when
// OPENAI_API_KEY is set; otherwise falls back to a deterministic regex parser so
// the pipeline stays runnable in a demo without keys.

/**
 * @param {string} transcript
 * @param {object} [opts]
 * @param {string} [opts.listingId]
 * @param {string} [opts.model]
 * @returns {Promise<object>} raw quote fields (feed to normalizeQuote)
 */
export async function parseTranscriptToQuote(transcript, { listingId, model = 'gpt-4o-mini' } = {}) {
  if (!transcript || typeof transcript !== 'string') {
    throw new TypeError('parseTranscriptToQuote: transcript string required');
  }

  if (process.env.OPENAI_API_KEY) {
    return parseWithOpenAI(transcript, { listingId, model });
  }
  return fallbackParse(transcript, listingId);
}

// TODO(person-b): call OpenAI with a JSON-schema-constrained prompt that extracts
// base_rent, deposit, maintenance_monthly, brokerage_onetime, hidden_charges,
// lease_duration_months, and amenities_included from the transcript.
async function parseWithOpenAI(/* transcript, opts */) {
  throw new Error(
    'parseWithOpenAI not implemented yet — unset OPENAI_API_KEY to use the fallback parser'
  );
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
