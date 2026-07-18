// risk-service.js
// Combine transcript fraud detection with the below-benchmark red-flag check.
// Returns { risk_flag, fraud_signals } — a new object; never mutates the quote.

import { riskFlag } from '../lib/contracts.js';
import config, { red_flag_threshold_percent } from '../lib/config.js';
import { detectFraudSignals } from './fraud-signals.js';

/**
 * @param {object} args
 * @param {object} args.quote - normalized quote
 * @param {string} [args.transcript] - raw call transcript (fraud scan)
 * @param {number} [args.benchmark] - area effective monthly cost
 * @returns {{risk_flag:string, fraud_signals:string[]}}
 */
export function assessRisk({ quote, transcript = '', benchmark } = {}) {
  if (!quote) throw new Error('assessRisk: quote required');

  const detected = detectFraudSignals(transcript, config.fraud_rules);
  const fraud_signals = dedupe([...(quote.fraud_signals ?? []), ...detected]);

  const flag = riskFlag({ ...quote, fraud_signals }, benchmark, red_flag_threshold_percent);
  return { risk_flag: flag, fraud_signals };
}

function dedupe(arr) {
  return [...new Set(arr)];
}
