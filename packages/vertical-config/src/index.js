// @scout/vertical-config - public entrypoint.
// Loads the swappable real-estate config as data. Uses createRequire so JSON
// loading works across Node versions without import-assertion syntax.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const config = require('./vertical.config.json');
const moving = require('./profiles/moving.config.json');

const profiles = Object.freeze({
  [config.vertical_name]: config,
  [moving.vertical_name]: moving,
});

export default config;

/**
 * Resolve product behavior from configuration, not from a vertical-specific
 * branch of orchestrator code. The existing real-estate profile remains the
 * default while Moving is the hackathon demo profile.
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
