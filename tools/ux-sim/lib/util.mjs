import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, renameSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { PERSONAS_DIR, SCENARIOS_DIR, HARNESS_DIR } from './paths.mjs';
import { traceSuccess } from './success.mjs';

export const sha1 = (s) => createHash('sha1').update(s).digest('hex');
export const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
export function writeJsonAtomic(f, data) { const tmp = `${f}.${process.pid}.tmp`; writeFileSync(tmp, JSON.stringify(data, null, 2)); renameSync(tmp, f); }
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const FEELINGS = ['confused', 'frustrated', 'bored', 'neutral', 'curious', 'delighted'];
export const FRICTION_TYPES = ['bug', 'ux_confusion', 'onboarding', 'discoverability', 'motivation', 'content_gap', 'performance', 'trust_privacy', 'copy'];
export const OUTCOMES = ['success', 'abandoned', 'failed', 'timeout'];
/** Severity scale — the same text goes into docs and reports. */
export const SEVERITY = {
  1: 'Minor — noticed it, cosmetic or a small annoyance; did not slow me down.',
  2: 'Moderate — slowed me down or made me hesitate; I recovered on my own.',
  3: 'Major — real confusion, a wrong path or many extra steps; I nearly gave up or only got through by guessing.',
  4: 'Blocker — I could not continue, gave up, or would stop using the app here.',
};

export function listJson(dir) { return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => readJson(path.join(dir, f))) : []; }
export const personas = () => listJson(PERSONAS_DIR);
export const scenarios = () => listJson(SCENARIOS_DIR);
export function persona(id) { const p = personas().find((x) => x.id === id); if (!p) throw new Error(`unknown persona "${id}" (have: ${personas().map((x) => x.id).join(', ')})`); return p; }
export function scenario(id) { const s = scenarios().find((x) => x.id === id); if (!s) throw new Error(`unknown scenario "${id}" (have: ${scenarios().map((x) => x.id).join(', ')})`); return s; }
export const environmentConfig = () => readJson(path.join(HARNESS_DIR, 'environment.json'));

/** /activities/a_123?x=1&tab=clubs → /activities/:id?tab=clubs — keeps only the `tab` query, ids become :id */
export function normalizeRoute(urlOrPath) {
  let u;
  try { u = new URL(urlOrPath, 'http://x'); } catch { return String(urlOrPath); }
  const segs = u.pathname.split('/').map((s, i, all) => {
    if (!s) return s;
    if (i === 2 && ['c'].includes(all[1])) return ':school';
    if (/\d/.test(s) && (s.length > 3 || /[_-]/.test(s))) return ':id';
    if (/^[a-z]+_[a-z0-9_]+$/i.test(s)) return ':id';
    if (/^[0-9a-f]{8,}$/i.test(s)) return ':id';
    return s;
  });
  if (u.pathname.startsWith('/c/') && segs.length > 3) segs[3] = ':code';
  const tab = u.searchParams.get('tab');
  return (segs.join('/') || '/') + (tab ? `?tab=${tab}` : '');
}

/** Evaluate a scenario success check against a URL + page text (no record leaves — see lib/success.mjs). */
export function checkSuccess(success, url, text, record) {
  return traceSuccess(success, { url, text, record }).met;
}

/**
 * What harness produced a run: a content hash over everything that shapes a run (lib, bin, personas, scenarios,
 * environment.json) plus the last commit that touched tools/ux-sim. `compare` uses it to check both sides ran the same
 * harness — the app under test can come from another worktree (--worktree), the harness always comes from here.
 */
export function harnessVersion() {
  const files = [];
  const walk = (d) => { for (const f of readdirSync(d, { withFileTypes: true })) { if (f.name === 'node_modules' || f.name === 'test') continue; const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(mjs|json)$|^(ux-sim|local-stack|batch-plan)$/.test(f.name) && f.name !== 'package-lock.json') files.push(p); } };
  for (const d of ['bin', 'lib', 'personas', 'scenarios']) if (existsSync(path.join(HARNESS_DIR, d))) walk(path.join(HARNESS_DIR, d));
  files.push(path.join(HARNESS_DIR, 'environment.json'));
  const h = createHash('sha1');
  for (const f of files.sort()) { h.update(path.relative(HARNESS_DIR, f)); h.update('\0'); h.update(readFileSync(f)); h.update('\0'); }
  let commit = null; let dirty = null;
  try {
    commit = execFileSync('git', ['-C', HARNESS_DIR, 'log', '-1', '--format=%H', '--', '.'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
    dirty = execFileSync('git', ['-C', HARNESS_DIR, 'status', '--porcelain', '--', '.'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().length > 0;
  } catch { /* not a git checkout */ }
  return { hash: h.digest('hex').slice(0, 12), commit, dirty };
}
