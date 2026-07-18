// phase1.check.js  (@scout/evals)
// -----------------------------------------------------------------------------
// Structural checks for the additive contracts (CandidateListing, Recommendation).
// No external deps: verifies fixtures are internally consistent and reference the
// same listing_ids as the quote fixtures, so the discovery -> call -> ranking
// chain stays keyed on one stable id. Run: `node src/phase1.check.js`.
// -----------------------------------------------------------------------------

import assert from 'node:assert';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const quotes = require('./fixtures/sample_quotes.json');
const candidates = require('./fixtures/sample_candidates.json');
const rec = require('./fixtures/sample_recommendation.json');

const quoteIds = new Set(quotes.map((q) => q.listing_id));

// 1) Every candidate uses an id that a quote can key back to (demo coherence).
for (const c of candidates) {
  assert.ok(c.listing_id && c.listing_name && c.source && c.deal_type, `candidate ${c.listing_id}: missing required field`);
  assert.ok(quoteIds.has(c.listing_id), `candidate ${c.listing_id}: no matching quote fixture`);
}

// 2) Recommendation ranks only real quotes and its top pick is in the ranking.
assert.ok(rec.ranked_listing_ids.length >= 1, 'recommendation: ranked_listing_ids empty');
for (const id of rec.ranked_listing_ids) {
  assert.ok(quoteIds.has(id), `recommendation: ranked id ${id} has no quote`);
}
assert.ok(
  rec.ranked_listing_ids.includes(rec.top_pick.listing_id),
  'recommendation: top_pick not present in ranked_listing_ids'
);

// 3) The top pick must not be a high_risk quote (safety: never recommend a flagged listing).
const topQuote = quotes.find((q) => q.listing_id === rec.top_pick.listing_id);
assert.ok(topQuote, 'recommendation: top_pick has no quote');
assert.notStrictEqual(topQuote.risk_flag, 'high_risk', 'recommendation: top_pick is high_risk');

// 4) Every evidence_ref points at a real listing (evidence chain is not fabricated).
assert.ok(rec.top_pick.evidence_refs.length >= 1, 'recommendation: top_pick has no evidence_refs');
for (const e of rec.top_pick.evidence_refs) {
  assert.ok(quoteIds.has(e.listing_id), `recommendation: evidence_ref cites unknown listing ${e.listing_id}`);
  assert.ok(Number.isInteger(e.line_index) && e.line_index >= 0, `recommendation: bad line_index for ${e.listing_id}`);
}

console.log(
  `phase1.check.js: ${candidates.length} candidates + recommendation verified (top pick ${rec.top_pick.listing_id})`
);
