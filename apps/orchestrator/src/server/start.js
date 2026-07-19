// start.js
// Boot the mid-call tool API. Requirement + benchmark are placeholders for the
// hackathon; wire real intake output + the Tavily benchmark here.
//   node apps/orchestrator/src/server/start.js   (or: npm run serve)

import { createRequire } from 'node:module';
import { createServer } from './http-server.js';

const require = createRequire(import.meta.url);
const requirement = require('../../../../packages/evals/src/fixtures/sample_requirement.json');

const PORT = Number(process.env.PORT) || 8787;
const benchmark = { effective_monthly: 14000, source: 'fallback_estimate' };

const { server } = createServer({ requirement, benchmark });
server.listen(PORT, () => {
  console.log(`@scout/orchestrator mid-call tool API listening on :${PORT}`);
});
