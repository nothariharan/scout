// start.js
// Boot the mid-call tool API. Resolves the area benchmark from Tavily (falling
// back to a per-pincode estimate without a key), then serves.
//   node apps/orchestrator/src/server/start.js   (or: npm run serve)

import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { createServer } from './http-server.js';
import { resolveBenchmark } from '../benchmark/benchmark-service.js';

// Auto-load the repo-root .env (Node 20.6+) so keys placed there just work.
try {
  process.loadEnvFile(fileURLToPath(new URL('../../../../.env', import.meta.url)));
} catch {
  // No .env file present — rely on the ambient environment.
}

const require = createRequire(import.meta.url);
const requirement = require('../../../../packages/evals/src/fixtures/sample_requirement.json');

const PORT = Number(process.env.PORT) || 8787;

// Tavily-backed area benchmark for this requirement (fallback keyless).
const benchmark = await resolveBenchmark(requirement, { fallbackByPincode: { '560034': 14000 } });

const { server } = createServer({ requirement, benchmark, fallbackByPincode: { '560034': 14000 } });
server.listen(PORT, () => {
  console.log(`@scout/orchestrator API on :${PORT} (benchmark ${benchmark.effective_monthly} via ${benchmark.source})`);
});
