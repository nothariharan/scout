// @scout/vertical-config - public entrypoint.
// Loads swappable vertical profiles as data. Uses createRequire so JSON loading
// works across Node versions without import-assertion syntax.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const legacyRealEstate = require('./vertical.config.json');
const moving = require('./profiles/moving.config.json');
const config = legacyRealEstate;

const profiles = Object.freeze({
  [legacyRealEstate.vertical_name]: legacyRealEstate,
  // Retain the original profile id for old fixtures and saved local data.
  real_estate_pg: legacyRealEstate,
  [moving.vertical_name]: moving,
});

export default config;

/**
 * Resolve product behavior from configuration, not from a vertical-specific
 * branch of orchestrator code. The default remains compatible with the legacy
 * package API; the moving product path always requests the `moving` profile.
 */
export function getVerticalProfile(name = config.vertical_name) {
  const profile = profiles[name];
  if (!profile) throw new Error(`Unknown Scout vertical: ${name}`);
  return profile;
}

export function listVerticalProfiles() {
  return Object.values(profiles).map(({ vertical_name, display_name, currency }) => ({
    vertical_name,
    display_name: display_name ?? vertical_name,
    currency,
  }));
}

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
