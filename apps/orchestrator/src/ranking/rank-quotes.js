// rank-quotes.js
// Rank normalized quotes for the comparison table. Rules:
//   - a high_risk quote is never #1 (pushed below all non-high-risk quotes)
//   - otherwise the cheapest effective monthly cost wins
//   - the budget ceiling is annotated, not used to drop options
// Pure: returns a new sorted array with rank + short reasoning.

/**
 * @param {object[]} quotes - normalized + risk-assessed quotes
 * @param {object} [ctx]
 * @param {object} [ctx.requirement] - RequirementSpec (for budget ceiling)
 * @returns {object[]} ranked quotes
 */
export function rankQuotes(quotes, { requirement } = {}) {
  const ceiling = requirement?.budget?.ceiling ?? Infinity;

  const sorted = [...quotes].sort((a, b) => {
    const aRisk = a.risk_flag === 'high_risk' ? 1 : 0;
    const bRisk = b.risk_flag === 'high_risk' ? 1 : 0;
    if (aRisk !== bRisk) return aRisk - bRisk;
    return a.effective_monthly_cost - b.effective_monthly_cost;
  });

  return sorted.map((quote, index) => ({
    ...quote,
    rank: index + 1,
    over_budget: quote.effective_monthly_cost > ceiling,
    reasoning: buildReasoning(quote, ceiling),
  }));
}

function buildReasoning(quote, ceiling) {
  const parts = [`effective ${quote.effective_monthly_cost}/mo`, quote.risk_flag];
  if (quote.effective_monthly_cost > ceiling) parts.push('over budget ceiling');
  if (quote.price_moved) parts.push('price negotiated down');
  return parts.join('; ');
}
