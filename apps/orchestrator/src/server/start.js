// start.js
// Boot the mid-call tool API. Requirement + benchmark are placeholders for the
// hackathon; wire real intake output + the Tavily benchmark here.
//   node apps/orchestrator/src/server/start.js   (or: npm run serve)

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from './http-server.js';
import { createRequirementStore } from '../requests/requirement-store.js';

// Auto-load the repo-root .env (Node 20.6+) so keys placed there just work.
try {
  process.loadEnvFile(fileURLToPath(new URL('../../../../.env', import.meta.url)));
} catch {
  // No .env present — rely on the ambient environment.
}

const PORT = Number(process.env.PORT) || 8787;

const { server } = createServer({
  // Live requirements are created by the confirmed intake paths. Do not seed
  // a rental fixture or a fabricated monthly benchmark into moving calls.
  // Ignored local state for development; production supplies a database adapter.
  requirementStore: createRequirementStore({ filePath: process.env.SCOUT_LOCAL_STATE_PATH ?? resolve('data/local/scout-state.json') }),
});
server.listen(PORT, () => {
  console.log(`@scout/orchestrator mid-call tool API listening on :${PORT}`);
});
