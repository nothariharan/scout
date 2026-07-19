import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

// Local-dev persistence behind a deliberately replaceable interface.
export function createRequirementStore({ filePath } = {}) {
  const records = new Map(); let counter = 0; let ready = false;
  async function hydrate() { if (ready) return; ready = true; if (!filePath) return; try { const saved = JSON.parse(await readFile(filePath, 'utf8')); for (const record of saved.records ?? []) records.set(record.id, record); counter = Number(saved.counter) || records.size; } catch (error) { if (error?.code !== 'ENOENT') throw error; } }
  async function persist() { if (!filePath) return; await mkdir(dirname(filePath), { recursive: true }); const temp = `${filePath}.tmp`; await writeFile(temp, JSON.stringify({ counter, records: [...records.values()] }, null, 2)); await rename(temp, filePath); }
  return {
    async create({ spec, source_path = 'text' } = {}) { await hydrate(); if (!spec?.location?.area) throw new Error('requirement location.area is required'); const id = `req_${Date.now().toString(36)}_${++counter}`; const record = { id, spec, source_path, confirmed_at: null, candidates: [], created_at: new Date().toISOString() }; records.set(id, record); await persist(); return structuredClone(record); },
    async confirm(id) { await hydrate(); const record = records.get(id); if (!record) throw new Error(`unknown requirement ${id}`); record.confirmed_at = new Date().toISOString(); await persist(); return structuredClone(record); },
    async get(id) { await hydrate(); const record = records.get(id); return record ? structuredClone(record) : null; },
    async setCandidates(id, candidates) { await hydrate(); const record = records.get(id); if (!record) throw new Error(`unknown requirement ${id}`); record.candidates = candidates; record.discovered_at = new Date().toISOString(); await persist(); return structuredClone(record); },
  };
}
