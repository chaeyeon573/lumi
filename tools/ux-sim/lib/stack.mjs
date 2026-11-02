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

/** Seeded data file for this worktree state: boot once on an empty file (seed + catalog + demo accounts), then import the opportunity CSVs. */
async function template(wt, state, force) {
  const dir = ensureDir(path.join(STACK_DIR, 'templates'));
  const file = path.join(dir, `${path.basename(wt)}-${state.stamp}.json`);
  if (!force && existsSync(file)) return file;
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
    log(`import ${csv}: ${r.status === 0 ? (r.stdout.split('\n')[0] || 'ok') : 'FAILED ' + (r.stderr || '').slice(0, 300)}`);
  }
  copyFileSync(tmp, file); unlinkSync(tmp);
  return file;
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
  let tpl;
  try {
    if (!opts.dev) build(wt, state, !!opts.rebuild);
    tpl = await template(wt, state, !!opts.reseed);
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
    port, webPort, pid: child.pid, webPid: web?.pid, dataFile, template: tpl, log: logFile, worktree: wt, commit: state.head, stamp: state.stamp, dirty: state.dirty,
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
