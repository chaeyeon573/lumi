// Local full stack (Lumi server + built web app) from any git worktree, with an isolated, freshly seeded data file.
//
// How the app is wired (read from server/index.ts, server/store.ts, server/seed.ts, server/demo.ts):
//   - no DATABASE_URL  → FileStore at $DATA_FILE (default server/.data/db.json). We always pass our own DATA_FILE.
//   - empty store      → first boot seeds src/data/seed.en (AROUNDU_LANG=en) + built-in course catalog;
//                        server/demo.ts creates the Berkeley/Merced demo accounts and rolls sample dates to "now".
//   - opportunities    → the live worker imports server/data/opportunities-*.csv; we run the same import script.
//   - the server serves <worktree>/dist (built with VITE_API_MODE=remote) and the API on one port.
// A "template" data file is made once per worktree state and copied per run, so every run starts from the same seed.
import { spawn, spawnSync, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, copyFileSync, readdirSync, unlinkSync, openSync, statSync, mkdirSync, rmSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { REPO_ROOT, STACK_DIR, ensureDir } from './paths.mjs';

const log = (...a) => process.stderr.write(`[local-stack] ${a.join(' ')}\n`);

/** Env for the app server: nothing secret or remote leaks in from the shell. */
function serverEnv(extra) {
  const env = { ...process.env };
  for (const k of ['DATABASE_URL', 'OPENAI_API_KEY', 'API_KEY', 'RESEND_API_KEY', 'ADMIN_KEY', 'EXPO_ACCESS_TOKEN', 'FEEDBACK_EMAIL', 'AGENT_NOTIFY_EMAIL', 'REVIEW_LOGIN_EMAIL', 'REVIEW_LOGIN_CODE', 'BERKELEY_APP_ID', 'BERKELEY_APP_KEY', 'CORS_ORIGIN']) delete env[k];
  return {
    ...env,
    AROUNDU_LANG: 'en',
    CAMPUS_LIVE: '0', // dining / gym pollers hit live campus sources — off locally
    PUSH_DISABLED: '1',
    ALLOW_DEMO_LOGIN: '1',
    ALLOW_RESET: '',
    DEMO_AUTOREPLY: '0', // production value
    HIDE_DEV_CODE: '', // no mail locally → the sign-up code is shown in the on-screen hint
    ...extra,
  };
}

const git = (wt, ...args) => { try { return execFileSync('git', ['-C', wt, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; } };

/** HEAD + a hash of uncommitted changes, so the build/template cache follows the worktree's actual contents. */
export function worktreeState(wt) {
  const head = git(wt, 'rev-parse', 'HEAD') || 'nogit';
  const dirty = git(wt, 'status', '--porcelain', '--untracked-files=normal', '--', '.', ':(exclude)ux-sim', ':(exclude)tools/ux-sim', ':(exclude)docs');
  const diff = dirty ? git(wt, 'diff', 'HEAD', '--', '.', ':(exclude)ux-sim', ':(exclude)tools/ux-sim', ':(exclude)docs') + dirty : '';
  const stamp = diff ? `${head.slice(0, 12)}-dirty-${createHash('sha1').update(diff).digest('hex').slice(0, 8)}` : head.slice(0, 12);
  return { head, dirty: !!diff, stamp };
}

export async function freePort(preferred) {
  const tryPort = (p) => new Promise((res) => { const s = net.createServer(); s.once('error', () => res(null)); s.listen(p, '127.0.0.1', () => { const port = s.address().port; s.close(() => res(port)); }); });
  if (preferred) { const p = await tryPort(preferred); if (p) return p; throw new Error(`port ${preferred} is in use`); }
  return tryPort(0);
}

async function waitHealthy(url, ms, child) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (child && child.exitCode !== null) throw new Error(`server exited with code ${child.exitCode}`);
    try { const r = await fetch(url); if (r.ok) return await r.json(); } catch { /* not yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`timed out waiting for ${url}`);
}

function checkWorktree(wt) {
  const pkg = path.join(wt, 'package.json');
  if (!existsSync(pkg) || !existsSync(path.join(wt, 'server', 'index.ts'))) throw new Error(`${wt} is not a Lumi worktree (package.json + server/index.ts expected)`);
  if (!existsSync(path.join(wt, 'node_modules', '.bin', 'tsx')) || !existsSync(path.join(wt, 'node_modules', '.bin', 'vite'))) {
    log(`node_modules missing in ${wt} — running npm ci (one time)`);
    const r = spawnSync('npm', ['ci', '--no-audit', '--no-fund'], { cwd: wt, stdio: ['ignore', 2, 2] });
    if (r.status !== 0) throw new Error('npm ci failed');
  }
}

function build(wt, state, force) {
  const stampFile = path.join(wt, 'dist', '.ux-sim-build');
  const have = existsSync(stampFile) ? readFileSync(stampFile, 'utf8').trim() : '';
  if (!force && have === state.stamp) return false;
  log(`building web app (VITE_API_MODE=remote) in ${wt}/dist …`);
  const r = spawnSync(path.join(wt, 'node_modules', '.bin', 'vite'), ['build', '--logLevel', 'warn'], { cwd: wt, env: { ...process.env, VITE_API_MODE: 'remote', VITE_API_URL: '' }, stdio: ['ignore', 2, 2] });
  if (r.status !== 0) throw new Error('vite build failed');
  writeFileSync(stampFile, state.stamp + '\n');
  return true;
}

function startServer(wt, { port, dataFile, logFile, env }) {
  const out = openSync(logFile, 'a');
  const child = spawn(path.join(wt, 'node_modules', '.bin', 'tsx'), ['--tsconfig', 'server/tsconfig.json', 'server/index.ts'], {
    cwd: wt, env: serverEnv({ PORT: String(port), DATA_FILE: dataFile, ...env }), stdio: ['ignore', out, out], detached: true,
  });
  child.unref();
  return child;
}

// ─── course catalog cache ────────────────────────────────────────────────────
// The live worker imports the current Berkeley Class Schedule (server/agent/run.ts → server/sources/courses.ts →
// store.replaceCatalog). A fresh local store only has the built-in sample catalog (MATH 1A …). `local-stack catalog fetch`
// runs the same adapter once (server/scripts/fetch-courses.ts, ~5 min, no key needed) into a scratch store and keeps the
// result in ux-sim/stack/catalog/<school>.json; every template made afterwards gets it via the same replace-by-school step.
const CATALOG_DIR = () => ensureDir(path.join(STACK_DIR, 'catalog'));
const CATALOG_SCHOOLS = { berkeley: 's_berkeley' };
export const CATALOG_MAX_AGE_DAYS = Number(process.env.UX_SIM_CATALOG_MAX_AGE_DAYS ?? 30);

export function catalogCache(school = 'berkeley') {
  const f = path.join(CATALOG_DIR(), `${CATALOG_SCHOOLS[school] ?? school}.json`);
  if (!existsSync(f)) return null;
  const meta = JSON.parse(readFileSync(f, 'utf8'));
  const ageDays = (Date.now() - Date.parse(meta.fetchedAt)) / 86400000;
  return { file: f, ...meta, courses: undefined, count: meta.courses.length, ageDays: Math.round(ageDays * 10) / 10, stale: ageDays > CATALOG_MAX_AGE_DAYS, stamp: createHash('sha1').update(`${meta.fetchedAt}:${meta.courses.length}`).digest('hex').slice(0, 8) };
}

/** Run the worktree's own course adapter (same code the worker runs) and cache the result. */
export function fetchCatalog({ worktree, school = 'berkeley' } = {}) {
  const wt = path.resolve(worktree ?? REPO_ROOT);
  checkWorktree(wt);
  const schoolId = CATALOG_SCHOOLS[school];
  if (!schoolId) throw new Error(`no course adapter mapping for "${school}" (have: ${Object.keys(CATALOG_SCHOOLS).join(', ')})`);
  const tmp = path.join(CATALOG_DIR(), `.fetch-${process.pid}.json`);
  if (existsSync(tmp)) unlinkSync(tmp);
  log(`fetching the ${school} course catalog with ${wt}/server/scripts/fetch-courses.ts (takes ~5 minutes) …`);
  const t0 = Date.now();
  const r = spawnSync(path.join(wt, 'node_modules', '.bin', 'tsx'), ['--tsconfig', 'server/tsconfig.json', 'server/scripts/fetch-courses.ts', school], { cwd: wt, env: serverEnv({ DATA_FILE: tmp }), stdio: ['ignore', 2, 2], timeout: 40 * 60_000 });
  if (r.status !== 0 || !existsSync(tmp)) throw new Error(`fetch-courses ${school} failed (exit ${r.status})`);
  const data = JSON.parse(readFileSync(tmp, 'utf8'));
  unlinkSync(tmp);
  const courses = (data.catalog ?? []).filter((c) => c.schoolId === schoolId);
  if (courses.length < 500) throw new Error(`fetch returned only ${courses.length} ${schoolId} courses — not caching`);
  const terms = [...new Set(courses.map((c) => c.term))];
  const out = { schoolId, source: `${school} course adapter (server/sources/courses.ts) via server/scripts/fetch-courses.ts`, fetchedAt: new Date().toISOString(), fetchedWith: worktreeState(wt).stamp, seconds: Math.round((Date.now() - t0) / 1000), terms, courses };
  const f = path.join(CATALOG_DIR(), `${schoolId}.json`);
  writeFileSync(f, JSON.stringify(out));
  log(`cached ${courses.length} courses (${terms.join(', ')}) → ${f}`);
  return catalogCache(school);
}

/** store.replaceCatalog(schoolId, courses) on a FileStore data file that no server has open */
function applyCatalog(dataFile, cacheFile) {
  const cache = JSON.parse(readFileSync(cacheFile, 'utf8'));
  const data = JSON.parse(readFileSync(dataFile, 'utf8'));
  const next = new Map(cache.courses.map((c) => [c.id, c]));
  const had = new Set((data.catalog ?? []).map((c) => c.id));
  data.catalog = [...(data.catalog ?? []).filter((c) => c.schoolId !== cache.schoolId || next.has(c.id)).map((c) => next.get(c.id) ?? c), ...cache.courses.filter((c) => !had.has(c.id))];
  writeFileSync(dataFile, JSON.stringify(data));
  return { schoolId: cache.schoolId, count: cache.courses.length, terms: cache.terms, fetchedAt: cache.fetchedAt };
}

/** What catalog a template gets: the cached real one unless UX_SIM_CATALOG=builtin or the cache is missing/stale. */
export function catalogPlan(choice = process.env.UX_SIM_CATALOG ?? 'auto') {
  if (choice === 'builtin') return { kind: 'builtin', why: 'UX_SIM_CATALOG=builtin' };
  const c = catalogCache('berkeley');
  if (!c) return { kind: 'builtin', why: 'no cached catalog — run `local-stack catalog fetch` once (about 5 minutes) to test with the real Berkeley schedule' };
  if (c.stale && choice !== 'cached') return { kind: 'builtin', why: `cached catalog is ${c.ageDays} days old (> ${CATALOG_MAX_AGE_DAYS}) — run \`local-stack catalog fetch\`, or set UX_SIM_CATALOG=cached to use it anyway` };
  return { kind: 'cached', cache: c };
}

// ─── live events / listings snapshot ─────────────────────────────────────────
// A fresh real account on a local stack sees no campus events or free food: sample events are hidden from real accounts
// and the worker that fetches CalLink / UC Berkeley Events / Presence / careers boards does not run locally.
// `local-stack events fetch` READS the live server once — demo sign-in (POST /api/auth/demo) + POST /api/bootstrap, nothing
// else; it never writes content to live — keeps Berkeley + national real opportunities (events, free food, internships,
// hackathons, scholarships, labs, study abroad), drops sample/demo rows and past events, and caches them in
// ux-sim/stack/events/<school>.json. Every new template upserts them, so base and fix sides of a compare get identical
// real content.
export const LIVE_URL = process.env.UX_SIM_LIVE_URL ?? 'https://heetz.up.railway.app';
const EVENTS_DIR = () => ensureDir(path.join(STACK_DIR, 'events'));
export const EVENTS_MAX_AGE_DAYS = Number(process.env.UX_SIM_EVENTS_MAX_AGE_DAYS ?? 7);
const pacificDay = (offsetDays = 0) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + offsetDays * 86400000));
const dayOf = (iso) => (/T/.test(iso ?? '') ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso)) : String(iso ?? '').slice(0, 10));

export function eventsCache(school = 'berkeley') {
  const f = path.join(EVENTS_DIR(), `${CATALOG_SCHOOLS[school] ?? school}.json`);
  if (!existsSync(f)) return null;
  const meta = JSON.parse(readFileSync(f, 'utf8'));
  const ageDays = (Date.now() - Date.parse(meta.fetchedAt)) / 86400000;
  return { file: f, ...meta, opportunities: undefined, count: meta.opportunities.length, ageDays: Math.round(ageDays * 10) / 10, stale: ageDays > EVENTS_MAX_AGE_DAYS, stamp: createHash('sha1').update(`${meta.fetchedAt}:${meta.opportunities.length}`).digest('hex').slice(0, 8) };
}

/** sample/demo opportunity ids as the worktree's server/samples.ts defines them (run inside the worktree for its tsconfig paths) */
function sampleOpportunityIds(wt) {
  const dir = ensureDir(path.join(wt, 'server', '.data')); // git-ignored in the app repo
  const f = path.join(dir, `ux-sim-sample-ids-${process.pid}.ts`);
  writeFileSync(f, `import { SAMPLE_OPPORTUNITY_IDS } from '../samples';\nconsole.log(JSON.stringify([...SAMPLE_OPPORTUNITY_IDS]));\nprocess.exit(0);\n`);
  try {
    const r = spawnSync(path.join(wt, 'node_modules', '.bin', 'tsx'), ['--tsconfig', 'server/tsconfig.json', f], { cwd: wt, env: serverEnv({ DATA_FILE: path.join(dir, 'ux-sim-unused.json') }), encoding: 'utf8', timeout: 120_000 });
    const line = (r.stdout ?? '').trim().split('\n').reverse().find((l) => l.startsWith('['));
    if (!line) throw new Error(`could not read SAMPLE_OPPORTUNITY_IDS from ${wt}/server/samples.ts: ${(r.stderr ?? '').slice(0, 300)}`);
    return new Set(JSON.parse(line));
  } finally { try { unlinkSync(f); } catch { /* */ } }
}

/** what of a live snapshot goes into fixtures: my school + national, no samples/demo rows, events only near today */
export function filterLiveOpportunities(all, { schoolId, samples = new Set(), from, to }) {
  const dropped = { otherSchool: 0, sample: 0, demoUrl: 0, pastOrFarEvent: 0 };
  const kept = [];
  for (const o of all) {
    if (o.schoolId && o.schoolId !== schoolId) { dropped.otherSchool++; continue; }
    if (o.sample || samples.has(o.id)) { dropped.sample++; continue; }
    if (o.sourceUrl && (/(^|[./])example\.com(\/|$)/.test(o.sourceUrl) || /instagram\.com\/example/.test(o.sourceUrl))) { dropped.demoUrl++; continue; }
    if (o.type === 'event' && o.date && (dayOf(o.date) < from || dayOf(o.date) > to)) { dropped.pastOrFarEvent++; continue; }
    // no other students' words in fixtures: Q&A and reviews are emptied
    kept.push({ ...o, qna: [], reviews: [] });
  }
  return { kept, dropped };
}

export async function fetchEvents({ worktree, school = 'berkeley', baseUrl = LIVE_URL, pastDays = 1, aheadDays = 21 } = {}) {
  const wt = path.resolve(worktree ?? REPO_ROOT);
  checkWorktree(wt);
  const schoolId = CATALOG_SCHOOLS[school];
  if (!schoolId) throw new Error(`unknown school "${school}"`);
  const origin = new URL(baseUrl).origin;
  const call = async (p, body, token) => {
    const res = await fetch(`${origin}${p}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body ?? {}), signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`${origin}${p} → ${res.status} ${(await res.text()).slice(0, 200)}`);
    return res.json();
  };
  log(`reading live events/listings from ${origin} (demo sign-in + bootstrap, read-only) …`);
  // the only two calls: demo sign-in issues a session token for the shared demo account; bootstrap reads its snapshot
  const { token } = await call('/api/auth/demo', { schoolId });
  const snap = await call('/api/bootstrap', {}, token);
  const samples = sampleOpportunityIds(wt);
  const from = pacificDay(-pastDays); const to = pacificDay(aheadDays);
  const all = snap.opportunities ?? [];
  const { kept, dropped } = filterLiveOpportunities(all, { schoolId, samples, from, to });
  if (kept.length < 50) throw new Error(`only ${kept.length} real opportunities kept — not caching (live returned ${all.length})`);
  const byType = {}; for (const o of kept) byType[o.type] = (byType[o.type] ?? 0) + 1;
  const week = pacificDay(7);
  const out = {
    schoolId, source: `${origin} POST /api/auth/demo + POST /api/bootstrap (read-only), worker-fetched opportunities`, baseUrl: origin,
    fetchedAt: new Date().toISOString(), window: { eventsFrom: from, eventsTo: to },
    counts: { kept: kept.length, live: all.length, byType, eventsThisWeek: kept.filter((o) => o.type === 'event' && o.date && dayOf(o.date) >= pacificDay(0) && dayOf(o.date) <= week).length, freeFoodThisWeek: kept.filter((o) => (o.tags ?? []).includes('free food') && o.date && dayOf(o.date) >= pacificDay(0) && dayOf(o.date) <= week).length, dropped },
    sources: [...new Set(kept.map((o) => o.sourceLabel).filter(Boolean))].sort(),
    opportunities: kept,
  };
  const f = path.join(EVENTS_DIR(), `${schoolId}.json`);
  writeFileSync(f, JSON.stringify(out));
  log(`cached ${kept.length} real opportunities (${Object.entries(byType).map(([k, v]) => `${k} ${v}`).join(', ')}; ${out.counts.eventsThisWeek} events / ${out.counts.freeFoodThisWeek} free food this week) → ${f}`);
  return eventsCache(school);
}

/** upsert the cached live opportunities into a FileStore data file that no server has open */
function applyEvents(dataFile, cacheFile) {
  const cache = JSON.parse(readFileSync(cacheFile, 'utf8'));
  const data = JSON.parse(readFileSync(dataFile, 'utf8'));
  const byId = new Map((data.snapshot.opportunities ?? []).map((o) => [o.id, o]));
  let updated = 0;
  for (const o of cache.opportunities) { if (byId.has(o.id)) updated++; byId.set(o.id, o); }
  data.snapshot.opportunities = [...byId.values()];
  writeFileSync(dataFile, JSON.stringify(data));
  return { count: cache.opportunities.length, updated, fetchedAt: cache.fetchedAt, counts: cache.counts, baseUrl: cache.baseUrl };
}

export function eventsPlan(choice = process.env.UX_SIM_EVENTS ?? 'auto') {
  if (choice === 'none') return { kind: 'none', why: 'UX_SIM_EVENTS=none' };
  const c = eventsCache('berkeley');
  if (!c) return { kind: 'none', why: 'no cached live events — run `local-stack events fetch` (read-only, ~10 s) so fresh accounts see real campus events' };
  if (c.stale && choice !== 'cached') return { kind: 'none', why: `cached live events are ${c.ageDays} days old (> ${EVENTS_MAX_AGE_DAYS}) — run \`local-stack events fetch\`, or UX_SIM_EVENTS=cached to use them anyway` };
  return { kind: 'cached', cache: c };
}

/** Seeded data file for this worktree state: boot once on an empty file (seed + catalog + demo accounts), then import the opportunity CSVs and the cached course catalog. */
async function template(wt, state, force, plan, evPlan = { kind: 'none', why: 'not requested' }) {
  const dir = ensureDir(path.join(STACK_DIR, 'templates'));
  const file = path.join(dir, `${path.basename(wt)}-${state.stamp}${plan.kind === 'cached' ? `-cat${plan.cache.stamp}` : ''}${evPlan.kind === 'cached' ? `-ev${evPlan.cache.stamp}` : ''}.json`);
  const metaFile = file.replace(/\.json$/, '.meta.json');
  if (!force && existsSync(file) && existsSync(metaFile)) return { file, meta: JSON.parse(readFileSync(metaFile, 'utf8')) };
  const tmp = `${file}.tmp`;
  if (existsSync(tmp)) unlinkSync(tmp);
  const port = await freePort();
  const logFile = path.join(dir, `${path.basename(file, '.json')}.seed.log`);
  log(`seeding template data on :${port} → ${file}`);
  const child = startServer(wt, { port, dataFile: tmp, logFile });
  try {
    await waitHealthy(`http://127.0.0.1:${port}/api/health`, 120_000, child);
    await new Promise((r) => setTimeout(r, 2000)); // let FileStore flush
  } finally { try { process.kill(-child.pid, 'SIGTERM'); } catch { /* gone */ } }
  await new Promise((r) => setTimeout(r, 800));
  const csvs = readdirSync(path.join(wt, 'server', 'data')).filter((f) => /^opportunities-.*\.csv$/.test(f)).sort();
  for (const csv of csvs) {
    const r = spawnSync(path.join(wt, 'node_modules', '.bin', 'tsx'), ['--tsconfig', 'server/tsconfig.json', 'server/scripts/import-opportunities.ts', path.join('server', 'data', csv)], { cwd: wt, env: serverEnv({ DATA_FILE: tmp }), encoding: 'utf8' });
    log(`import ${csv}: ${r.status === 0 ? (r.stdout.split('\n').filter((l) => !l.startsWith('[store]'))[0] || 'ok') : 'FAILED ' + (r.stderr || '').slice(0, 300)}`);
  }
  let catalog;
  if (plan.kind === 'cached') {
    const a = applyCatalog(tmp, plan.cache.file);
    catalog = { kind: 'cached', source: plan.cache.source, schoolId: a.schoolId, courses: a.count, terms: a.terms, fetchedAt: a.fetchedAt };
    log(`catalog: ${a.count} real ${a.schoolId} courses (${a.terms.join(', ')}, fetched ${a.fetchedAt.slice(0, 10)})`);
  } else {
    catalog = { kind: 'builtin', source: 'built-in sample catalog (packages/core/src/data/catalog)', why: plan.why };
    log(`catalog: built-in sample (${plan.why})`);
  }
  let events;
  if (evPlan.kind === 'cached') {
    const e = applyEvents(tmp, evPlan.cache.file);
    events = { kind: 'cached', source: evPlan.cache.source, baseUrl: e.baseUrl, fetchedAt: e.fetchedAt, stamp: evPlan.cache.stamp, opportunities: e.count, updatedExisting: e.updated, byType: e.counts.byType, eventsThisWeek: e.counts.eventsThisWeek, freeFoodThisWeek: e.counts.freeFoodThisWeek };
    log(`events: ${e.count} real live opportunities (snapshot ${e.fetchedAt.slice(0, 16)}Z, ${e.counts.eventsThisWeek} events this week)`);
  } else {
    events = { kind: 'none', why: evPlan.why };
    log(`events: none (${evPlan.why})`);
  }
  const meta = { worktree: wt, stamp: state.stamp, createdAt: new Date().toISOString(), catalog, events };
  copyFileSync(tmp, file); unlinkSync(tmp);
  writeFileSync(metaFile, JSON.stringify(meta, null, 2));
  return { file, meta };
}

const pidFile = (port) => path.join(ensureDir(path.join(STACK_DIR, 'ports')), `${port}.json`);
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

/**
 * Start a stack. Options: worktree, port, dataFile (copied from the template unless it exists and keep=true),
 * rebuild, reseed, dev (vite dev server on webPort instead of a build), autoreply.
 * Returns { baseUrl, apiUrl, port, webPort, pid, webPid, dataFile, log, worktree, commit, dirty }.
 */
export async function up(opts = {}) {
  const wt = path.resolve(opts.worktree ?? REPO_ROOT);
  checkWorktree(wt);
  const state = worktreeState(wt);
  // parallel persona runs share one build + template: the first one makes them, the others wait
  const lock = path.join(ensureDir(STACK_DIR), `.lock-${createHash('sha1').update(wt).digest('hex').slice(0, 8)}`);
  const t0 = Date.now();
  for (;;) {
    try { mkdirSync(lock); break; } catch {
      if (Date.now() - t0 > 600_000) { rmSync(lock, { recursive: true, force: true }); continue; } // stale lock
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  let tpl; let tplMeta;
  try {
    if (!opts.dev) build(wt, state, !!opts.rebuild);
    ({ file: tpl, meta: tplMeta } = await template(wt, state, !!opts.reseed, catalogPlan(opts.catalog), eventsPlan(opts.events)));
  } finally { rmSync(lock, { recursive: true, force: true }); }
  const port = await freePort(opts.port ? Number(opts.port) : undefined);
  const dataFile = path.resolve(opts.dataFile ?? path.join(ensureDir(path.join(STACK_DIR, 'data')), `${port}-${Date.now()}.json`));
  ensureDir(path.dirname(dataFile));
  if (!(opts.keep && existsSync(dataFile))) copyFileSync(tpl, dataFile);
  const logFile = opts.log ?? dataFile.replace(/\.json$/, '') + '.server.log';
  const child = startServer(wt, { port, dataFile, logFile, env: opts.autoreply ? { DEMO_AUTOREPLY: '1' } : {} });
  await waitHealthy(`http://127.0.0.1:${port}/api/health`, 120_000, child);
  let web;
  let webPort;
  if (opts.dev) {
    webPort = await freePort(opts.webPort ? Number(opts.webPort) : undefined);
    const out = openSync(logFile, 'a');
    web = spawn(path.join(wt, 'node_modules', '.bin', 'vite'), ['--port', String(webPort), '--strictPort', '--host', '127.0.0.1'], { cwd: wt, env: { ...process.env, VITE_API_MODE: 'remote', VITE_API_URL: `http://localhost:${port}` }, stdio: ['ignore', out, out], detached: true });
    web.unref();
    await waitHealthy(`http://127.0.0.1:${webPort}/`, 60_000, web).catch(async () => { /* vite returns html, not json */ });
  }
  const info = {
    baseUrl: opts.dev ? `http://localhost:${webPort}` : `http://localhost:${port}`, apiUrl: `http://localhost:${port}`,
    port, webPort, pid: child.pid, webPid: web?.pid, dataFile, template: tpl, catalog: tplMeta.catalog, events: tplMeta.events ?? { kind: 'none', why: 'template made before events snapshots existed' }, log: logFile, worktree: wt, commit: state.head, stamp: state.stamp, dirty: state.dirty,
    mode: opts.dev ? 'dev' : 'build', startedAt: new Date().toISOString(),
  };
  writeFileSync(pidFile(port), JSON.stringify(info, null, 2));
  return info;
}

export function down(port) {
  const f = pidFile(port);
  if (!existsSync(f)) return false;
  const info = JSON.parse(readFileSync(f, 'utf8'));
  for (const pid of [info.webPid, info.pid].filter(Boolean)) { try { process.kill(-pid, 'SIGTERM'); } catch { try { process.kill(pid, 'SIGTERM'); } catch { /* gone */ } } }
  unlinkSync(f);
  return true;
}

export function status() {
  const dir = path.join(STACK_DIR, 'ports');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => {
    const info = JSON.parse(readFileSync(path.join(dir, f), 'utf8'));
    return { ...info, alive: alive(info.pid), dataBytes: existsSync(info.dataFile) ? statSync(info.dataFile).size : 0 };
  });
}
