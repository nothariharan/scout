// @scout/contracts - public entrypoint.
// Re-exports the pure scoring functions. JSON Schemas live in ./schemas and can
// be imported by path via the package "exports" map (@scout/contracts/schemas/*).
export { effectiveMonthlyCost } from './effective_cost.js';
export { riskFlag } from './red_flag.js';
