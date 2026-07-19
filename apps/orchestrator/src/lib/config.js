// Single import point for the swappable vertical config in the backend, so the
// deep relative path to @scout/vertical-config lives in exactly one file.
// (Relative import keeps the app runnable with plain `node`, no install needed;
// switch to the '@scout/vertical-config' specifier once the workspace is linked.)
import config from '../../../../packages/vertical-config/src/index.js';

export default config;
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
