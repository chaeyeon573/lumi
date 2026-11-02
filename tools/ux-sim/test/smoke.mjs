#!/usr/bin/env node
// Scripted smoke run (no persona, no LLM): a FRESH real account posts an SFO ride on the local stack through the CLI.
// Checks the 2026-11-02 harness fixes end to end:
//   - auth: fresh — a new, verified, non-sample account; its own ride is not tagged "Sample"; run.json records the mode
//   - typing into the half-covered Note field does not press the sticky "Post ride" bar (pilot step 29–30)
//   - the success check is met by a server-side record of the persona's own ride, not by seed text
//   - report + schema validation of the result
// Usage: npm run smoke [-- --worktree DIR] [--keep]   (builds/starts a local stack; ~1 min warm, longer cold)
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync, mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const UX = path.join(HERE, '..', 'bin', 'ux-sim');
const args = process.argv.slice(2);
const wt = args.includes('--worktree') ? ['--worktree', args[args.indexOf('--worktree') + 1]] : [];
const runId = `smoke-${new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13)}-fresh-ride`;
const ux = (...a) => JSON.parse(execFileSync(process.execPath, [UX, ...a, ...(a[0] === 'start' ? [] : ['--run', runId])], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], timeout: 600_000 }));
const idOf = (obs, re) => { const l = obs.elements.find((x) => re.test(x.replace(/^\*?\[\d+\]<[^>]*> /, ''))); if (!l) throw new Error(`no element matching ${re} on ${obs.url}:\n${obs.elements.join('\n')}`); return /\[(\d+)\]/.exec(l)[1]; };
const ok = (cond, msg) => { if (!cond) throw new Error(`SMOKE FAILED: ${msg}`); console.log(`  ✓ ${msg}`); };

let obs = ux('start', '--persona', 'seoyeon-exchange-korean', '--scenario', 'ride-sfo-thanksgiving', '--run-id', runId, ...wt).observation;
const runDir = path.join(HERE, '..', '..', '..', 'ux-sim', 'runs', runId);
const runJson = () => JSON.parse(readFileSync(path.join(runDir, 'run.json'), 'utf8'));
try {
  console.log(`run ${runId}`);
  let r = runJson();
  ok(r.auth.mode === 'fresh' && r.auth.sample === false && r.auth.emailVerified === true, `fresh verified non-sample account ${r.auth.email}`);
  ok(r.auth.peers?.[0]?.rideId, `peer ${r.auth.peers?.[0]?.nickname} posted an SFO ride`);
  ok(!r.goalAchieved, 'goal not met on the start screen');
  obs = ux('click', idOf(obs, /^Discover$/));
  obs = ux('click', idOf(obs, /^Rides\b/));
  ok(obs.url.startsWith('/rides'), `on ${obs.url}`);
  obs = ux('click', idOf(obs, /^Post (my|a) ride$/));
  ok(obs.url.startsWith('/rides/new'), `ride form ${obs.url}`);
  obs = ux('click', idOf(obs, /Splitting an Uber/));
  obs = ux('click', idOf(obs, /^Sproul Plaza$/));
  obs = ux('scroll', 'down');
  const note = idOf(obs, /^Flight at/);
  obs = ux('type', note, 'Flight at 11am, one suitcase.');
  ok(obs.url.startsWith('/rides/new'), `typing into the Note field stayed on the form (${obs.url})`);
  ok(obs.elements.some((l) => /<textarea>.*value="Flight at 11am/.test(l)), 'the note text is in the field');
  ok(!runJson().goalAchieved, 'goal not met before posting');
  obs = ux('click', idOf(obs, /^Post ride$/));
  ok(/^\/rides\/rd_/.test(obs.url), `posted → ${obs.url}`);
  ok(!/Sample ride|\bSample\b/.test(obs.text), 'own ride is not tagged Sample');
  r = runJson();
  ok(r.goalAchieved && r.goalEvidence?.matched?.some((m) => m.record === 'rides'), `goal met at step ${r.goalFirstMetAtStep} by a server-side ride record`);
  const fin = ux('finish', '--outcome', 'success', '--reason', 'scripted smoke run');
  ok(fin.outcome === 'success', 'finished as success');
  const out = mkdtempSync(path.join(os.tmpdir(), 'uxsim-smoke-'));
  const rep = JSON.parse(execFileSync(process.execPath, [UX, 'report', runDir, '--out', out], { encoding: 'utf8' }));
  ok(rep.runs === 1 && !rep.problems.length, 'report + schema validation');
  const f = JSON.parse(readFileSync(path.join(out, 'findings.json'), 'utf8'));
  ok(f.runs[0].auth === 'fresh' && f.totals && 'maxSeverity' in f.totals, 'findings.json has auth + totals.maxSeverity');
  rmSync(out, { recursive: true, force: true });
  console.log('smoke ok');
} catch (e) {
  try { ux('finish', '--outcome', 'failed', '--reason', `smoke failed: ${e.message.slice(0, 200)}`); } catch { /* already ended */ }
  console.error(e.message);
  process.exitCode = 1;
} finally {
  if (!args.includes('--keep') && process.exitCode !== 1) rmSync(runDir, { recursive: true, force: true });
}
