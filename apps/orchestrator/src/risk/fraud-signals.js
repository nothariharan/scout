// fraud-signals.js
// Scan a call transcript for fraud patterns defined in the vertical config.
// Pure: returns an array of matched rule ids (e.g. 'pre_visit_deposit').
// The headline signal for the demo is the pre-visit deposit request.

import { fraud_rules as defaultRules } from '../lib/config.js';

/**
 * @param {string} transcript
 * @param {Array}  [rules] - defaults to config.fraud_rules
 * @returns {string[]} matched rule ids
 */
export function detectFraudSignals(transcript, rules = defaultRules) {
  if (!transcript || typeof transcript !== 'string') return [];
  const text = transcript.toLowerCase();

  const matched = [];
  for (const rule of rules ?? []) {
    const hit = (rule.trigger_keywords ?? []).some((kw) => text.includes(String(kw).toLowerCase()));
    if (hit) matched.push(rule.id);
  }
  return matched;
}
