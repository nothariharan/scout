// persistence.js
// Minimal, dependency-free JSON-file persistence so state survives a restart.
// Optional: only active when a state path is configured (SCOUT_STATE_FILE).
// Best-effort — never throws into the request path.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';

/** Load a prior snapshot, or null if absent/unreadable. */
export function loadState(path) {
  try {
    if (!path || !existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/** Persist a snapshot to disk (creates the directory if needed). */
export function saveState(path, data) {
  if (!path) return;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(data));
  } catch {
    // Disk hiccup shouldn't crash a call — persistence is best-effort.
  }
}
