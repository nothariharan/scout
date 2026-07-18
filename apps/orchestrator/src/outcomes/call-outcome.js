// call-outcome.js
// Helpers to build the structured CallOutcome every call must resolve to.
// Mirrors @scout/contracts/schemas/call_outcome.json (3 product endings).
// NOTE: team decision pending on a 4th 'error' status for transport failures
// — see packages/contracts/README.md.

export const CALL_OUTCOME_STATUSES = ['itemized_quote', 'callback_scheduled', 'declined'];

export function itemizedQuote() {
  return { status: 'itemized_quote' };
}

export function callbackScheduled(reason, callbackAt) {
  if (!reason) throw new Error('callbackScheduled: reason required');
  const outcome = { status: 'callback_scheduled', reason };
  if (callbackAt) outcome.callback_at = callbackAt;
  return outcome;
}

export function declined(reason) {
  if (!reason) throw new Error('declined: reason required');
  return { status: 'declined', reason };
}

export function isValidOutcome(outcome) {
  return Boolean(outcome) && CALL_OUTCOME_STATUSES.includes(outcome.status);
}
