// recommend.js
// Generate the plain-language recommendation for the ranked shortlist. Uses
// OpenAI when available; otherwise a deterministic template so the demo renders.

import { currency } from '../lib/config.js';

/**
 * @param {object[]} rankedQuotes - output of rankQuotes()
 * @param {object} requirement - RequirementSpec
 * @param {object} [opts]
 * @returns {Promise<{headline:string, options:object[]}>}
 */
export async function generateRecommendation(rankedQuotes, requirement, { model = 'gpt-4o-mini' } = {}) {
  const top = rankedQuotes?.[0];
  if (!top) return { headline: 'No viable listings found.', options: [] };

  // TODO(person-b): when OPENAI_API_KEY is set, call OpenAI to phrase the
  // trade-offs ("8% over budget but 12 min closer and verified").
  return templateRecommendation(rankedQuotes, requirement);
}

function templateRecommendation(rankedQuotes, requirement) {
  const ceiling = requirement?.budget?.ceiling;
  const top = rankedQuotes[0];
  const over = ceiling && top.effective_monthly_cost > ceiling
    ? ` (${pctOver(top.effective_monthly_cost, ceiling)}% over budget)`
    : '';
  const headline = `${top.listing_name || top.listing_id}: ${currency} ${top.effective_monthly_cost}/mo, ${top.risk_flag}${over}`;

  return {
    headline,
    options: rankedQuotes.map((q) => ({
      rank: q.rank,
      listing_id: q.listing_id,
      effective_monthly_cost: q.effective_monthly_cost,
      risk_flag: q.risk_flag,
      reasoning: q.reasoning,
    })),
  };
}

function pctOver(value, ceiling) {
  return Math.round(((value - ceiling) / ceiling) * 100);
}
