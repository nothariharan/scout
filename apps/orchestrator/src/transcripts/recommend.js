// recommend.js
// Generate the plain-language recommendation for the ranked shortlist. Uses
// OpenAI when OPENAI_API_KEY is set (falling back to a deterministic template on
// any error), so the demo always renders. Grounded in the OpenAI Chat
// Completions API (https://platform.openai.com/docs/api-reference/chat).

import { currency } from '../lib/config.js';

const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

/**
 * @param {object[]} rankedQuotes - output of rankQuotes()
 * @param {object} requirement - RequirementSpec
 * @param {object} [opts]
 * @returns {Promise<{headline:string, options:object[], narrative?:string}>}
 */
export async function generateRecommendation(rankedQuotes, requirement, { model = DEFAULT_MODEL } = {}) {
  const top = rankedQuotes?.[0];
  if (!top) return { headline: 'No viable listings found.', options: [] };

  const base = templateRecommendation(rankedQuotes, requirement);

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return base;

  try {
    const narrative = await phraseWithOpenAI(rankedQuotes, requirement, { model, apiKey });
    return { ...base, narrative };
  } catch {
    // Never let a model hiccup break the report — fall back to the template.
    return base;
  }
}

// Ask the model to explain the trade-offs in one honest paragraph, grounded ONLY
// in the quotes we pass (no invented listings, fees, or competing bids).
async function phraseWithOpenAI(rankedQuotes, requirement, { model, apiKey }) {
  const res = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You explain a ranked shortlist of rental quotes in one short, honest paragraph. ' +
            'Use ONLY the data provided. Never invent listings, fees, or competing offers. ' +
            'Call out risk flags and budget trade-offs plainly.',
        },
        {
          role: 'user',
          content: JSON.stringify({ budget: requirement?.budget, ranked: rankedQuotes }),
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`recommend: openai ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? '';
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
