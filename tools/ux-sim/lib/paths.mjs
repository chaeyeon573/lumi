// Shared paths. The harness lives in <repo>/tools/ux-sim; results go to <repo>/ux-sim/.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

export const HARNESS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const REPO_ROOT = path.resolve(HARNESS_DIR, '..', '..');
/** Results root. Override with UX_SIM_HOME (e.g. to keep runs outside the repo). */
export const OUT_ROOT = path.resolve(process.env.UX_SIM_HOME ?? path.join(REPO_ROOT, 'ux-sim'));
export const RUNS_DIR = path.join(OUT_ROOT, 'runs');
export const REPORTS_DIR = path.join(OUT_ROOT, 'reports');
export const STACK_DIR = path.join(OUT_ROOT, 'stack');
export const PERSONAS_DIR = path.join(HARNESS_DIR, 'personas');
export const SCENARIOS_DIR = path.join(HARNESS_DIR, 'scenarios');
export const SCHEMA_DIR = path.join(HARNESS_DIR, 'schema');
export const CHROMIUM = process.env.UX_SIM_CHROMIUM ?? '/opt/pw-browsers/chromium';
/** Where issue bodies link evidence (GitHub blob URLs). */
export const GITHUB_BLOB = process.env.UX_SIM_BLOB_BASE ?? 'https://github.com/chaeyeon573/AroundU/blob/claude/ux-sim';

export const ensureDir = (d) => { mkdirSync(d, { recursive: true }); return d; };
export const rel = (p) => path.relative(REPO_ROOT, p).split(path.sep).join('/');
export const today = () => new Date().toISOString().slice(0, 10);
