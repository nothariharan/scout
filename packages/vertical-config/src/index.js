// @scout/vertical-config - public entrypoint.
// Loads the swappable real-estate config as data. Uses createRequire so JSON
// loading works across Node versions without import-assertion syntax.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const config = require('./vertical.config.json');

export default config;

// Named convenience exports for the values consumers read most often.
export const {
  vertical_name,
  currency,
  effective_cost_formula,
  red_flag_threshold_percent,
  fraud_rules,
  leverage_types,
  benchmark_source,
  seller_personas,
} = config;
