// generate-types.mjs  (@scout/contracts)
// -----------------------------------------------------------------------------
// Regenerates ../generated.d.ts from the JSON Schemas in ../src/schemas/*.json,
// so the JSON Schemas remain the single source of truth and TS apps consume
// derived types instead of hand-duplicating them.
//
// Usage: pnpm --filter @scout/contracts generate:types
//
// Requires the dev dependency `json-schema-to-typescript`. If it isn't installed
// yet, the committed ../generated.d.ts is kept in sync by hand until it is.
// -----------------------------------------------------------------------------

import { readFile, writeFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const schemaDir = path.join(here, '..', 'src', 'schemas');
const outFile = path.join(here, '..', 'generated.d.ts');

let compile;
try {
  ({ compile } = await import('json-schema-to-typescript'));
} catch {
  console.error(
    'json-schema-to-typescript is not installed. Run `pnpm add -D json-schema-to-typescript ' +
      '--filter @scout/contracts`, then re-run. The committed generated.d.ts is authoritative until then.'
  );
  process.exit(1);
}

const files = (await readdir(schemaDir)).filter((f) => f.endsWith('.json')).sort();

const header =
  '/**\n * @scout/contracts — generated TypeScript types.\n' +
  ' * SOURCE OF TRUTH = ./src/schemas/*.json. Regenerate with `pnpm --filter @scout/contracts generate:types`.\n */\n\n';

let out = header;
for (const file of files) {
  const schema = JSON.parse(await readFile(path.join(schemaDir, file), 'utf8'));
  // bannerComment '' — we emit one header above; unreachableDefinitions off.
  out += await compile(schema, schema.title ?? file, { bannerComment: '', additionalProperties: false });
  out += '\n';
}

// Shared UI aliases are derived from the enum values that appear in schemas.
// Keeping them here means regeneration never silently removes public type names.
out += "export type RiskFlag = 'verified' | 'caution' | 'high_risk';\n";
out += "export type CallStatus = CallOutcome['status'];\n";
out += "export type EvidenceRef = Recommendation['top_pick']['evidence_refs'][number];\n";

await writeFile(outFile, out, 'utf8');
console.log(`generate-types.mjs: wrote ${outFile} from ${files.length} schemas`);
