// price-drop.js
// Capture the negotiation money-shot: the seller's first effective monthly cost
// vs the post-leverage effective monthly cost, plus the transcript line where it
// changed. This before/after is what the demo score hinges on.

/**
 * @param {object} args
 * @param {number} args.firstEffective - effective monthly cost first quoted
 * @param {number} args.finalEffective - effective monthly cost after leverage
 * @param {string} [args.evidenceLine] - transcript line where the price moved
 * @returns {object} price-drop fields (matches Quote price-drop fields)
 */
export function capturePriceDrop({ firstEffective, finalEffective, evidenceLine = '' } = {}) {
  const first = Number(firstEffective);
  const final = Number(finalEffective);
  if (!Number.isFinite(first) || !Number.isFinite(final)) {
    throw new TypeError('capturePriceDrop: firstEffective and finalEffective must be numbers');
  }

  const drop = round2(first - final);
  return {
    first_quoted_effective: round2(first),
    final_quoted_effective: round2(final),
    price_moved: final < first,
    drop_amount: drop,
    drop_pct: first > 0 ? round2((drop / first) * 100) : 0,
    evidence_line: evidenceLine,
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
