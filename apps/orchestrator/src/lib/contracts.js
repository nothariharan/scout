// Single import point for the shared scoring functions from @scout/contracts.
// Relative import for zero-install runnability; switch to '@scout/contracts'
// once the pnpm workspace is installed.
export { effectiveMonthlyCost, riskFlag } from '../../../../packages/contracts/src/index.js';
