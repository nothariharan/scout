// quotes-store.js
// Confirmed-quotes store. Holds quotes that came from a REAL itemized call so
// the Negotiator can cite them as genuine leverage — never invented numbers.
// In-memory for the hackathon; swap for a DATABASE_URL-backed store later.

/**
 * @returns {object} store with immutable access (never hands out internal refs)
 */
export function createQuotesStore() {
  let quotes = [];

  return {
    /** Add a confirmed quote. Only itemized_quote outcomes are real leverage. */
    addConfirmed(quote) {
      if (quote?.call_outcome?.status !== 'itemized_quote') {
        throw new Error('quotes-store: only itemized_quote outcomes are confirmable leverage');
      }
      quotes = [...quotes, { ...quote }];
      return this;
    },

    /** All confirmed quotes (copies). */
    all() {
      return quotes.map((q) => ({ ...q }));
    },

    /** Cheapest confirmed quote that is not high_risk — the usable leverage. */
    best() {
      const usable = quotes.filter((q) => q.risk_flag !== 'high_risk');
      if (usable.length === 0) return null;
      const winner = usable.reduce((a, b) =>
        b.effective_monthly_cost < a.effective_monthly_cost ? b : a
      );
      return { ...winner };
    },

    byListing(listingId) {
      const found = quotes.find((q) => q.listing_id === listingId);
      return found ? { ...found } : null;
    },

    get size() {
      return quotes.length;
    },
  };
}
