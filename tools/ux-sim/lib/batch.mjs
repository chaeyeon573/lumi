// batch-plan — which persona × scenario cells to run next. Used by ORCHESTRATE.md batches and scheduled runs.
//   --all                  every matrix cell
//   --scenario a,b         cells of these scenarios        --persona x,y   cells of these personas
//   --rotate N             the N cells run least recently (never-run first), from ux-sim/runs history
//   --repeat K             each picked cell K times (one cell once is an anecdote)
// Selectors combine: `--scenario lunch-today --rotate 2` = the 2 stalest lunch-today cells.
import path from 'node:path';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { RUNS_DIR } from './paths.mjs';
import { personas as loadPersonas, scenarios as loadScenarios } from './util.mjs';

const list = (v) => [].concat(v ?? []).flatMap((x) => String(x).split(',')).map((x) => x.trim()).filter(Boolean);

/** last finished run per cell: { "<persona>|<scenario>": { lastRunAt, runs, lastRunId, lastOutcome } } */
export function runHistory(runsDir = RUNS_DIR, { mode } = {}) {
  const h = {};
  if (!existsSync(runsDir)) return h;
  for (const d of readdirSync(runsDir)) {
    const f = path.join(runsDir, d, 'run.json');
    if (!existsSync(f)) continue;
    let r; try { r = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
    if (r.status !== 'finished' || r.endedBy === 'harness:setup_error') continue;
    if (mode && r.target?.mode !== mode) continue;
    const k = `${r.persona?.id}|${r.scenario?.id}`;
    const at = r.createdAt ?? '';
    const c = h[k] ?? { lastRunAt: null, runs: 0, lastRunId: null, lastOutcome: null };
    c.runs++;
    if (!c.lastRunAt || at > c.lastRunAt) Object.assign(c, { lastRunAt: at, lastRunId: r.runId, lastOutcome: r.outcome });
    h[k] = c;
  }
  return h;
}

export function plan(opts = {}, { personas = loadPersonas(), scenarios = loadScenarios(), history = runHistory(opts.runsDir, { mode: opts.mode }) } = {}) {
  const wantS = list(opts.scenario); const wantP = list(opts.persona);
  for (const s of wantS) if (!scenarios.some((x) => x.id === s)) throw new Error(`unknown scenario "${s}"`);
  for (const p of wantP) if (!personas.some((x) => x.id === p)) throw new Error(`unknown persona "${p}"`);
  if (!opts.all && !wantS.length && !wantP.length && !opts.rotate) throw new Error('pick cells: --all, --scenario <id,…>, --persona <id,…> and/or --rotate N');
  let cells = [];
  for (const s of scenarios) for (const p of s.personas ?? []) {
    if (wantS.length && !wantS.includes(s.id)) continue;
    if (wantP.length && !wantP.includes(p)) continue;
    const hh = history[`${p}|${s.id}`] ?? { lastRunAt: null, runs: 0, lastRunId: null, lastOutcome: null };
    cells.push({ persona: p, scenario: s.id, auth: s.setup?.auth ?? 'fresh', ...hh });
  }
  // least recently run first; never run before anything; then fewer runs; then a stable order
  cells.sort((a, b) => (a.lastRunAt ?? '').localeCompare(b.lastRunAt ?? '') || a.runs - b.runs || `${a.scenario}|${a.persona}`.localeCompare(`${b.scenario}|${b.persona}`));
  if (opts.rotate) cells = cells.slice(0, Number(opts.rotate));
  const repeat = Math.max(1, Number(opts.repeat ?? 1));
  const batch = opts.batch ?? `batch-${new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 13)}`;
  const extra = [opts.worktree ? `--worktree ${opts.worktree}` : null, opts.catalog ? `--catalog ${opts.catalog}` : null].filter(Boolean).join(' ');
  const runs = cells.flatMap((c) => Array.from({ length: repeat }, (_, i) => {
    const runId = `${batch}-${c.persona.split('-')[0]}-${c.scenario}${repeat > 1 ? `-r${i + 1}` : ''}`;
    return { ...c, runId, start: `ux-sim start --persona ${c.persona} --scenario ${c.scenario} --run-id ${runId}${extra ? ` ${extra}` : ''}`, subagentPrompt: `Follow docs/ux-sim/PERSONA_RUN.md exactly. Persona: \`${c.persona}\`. Scenario: \`${c.scenario}\`. Run id: \`${runId}\`${opts.worktree ? `. App worktree: \`${opts.worktree}\` (pass --worktree ${opts.worktree})` : ''}. Repo: \`<repo>\`.` };
  }));
  return { batch, selector: { all: !!opts.all, scenario: wantS, persona: wantP, rotate: opts.rotate ? Number(opts.rotate) : null, repeat, worktree: opts.worktree ?? null }, cells: cells.length, runs };
}

export function planText(p) {
  const L = [`batch ${p.batch} — ${p.runs.length} run(s) over ${p.cells} cell(s)`, ''];
  const w = Math.max(...p.runs.map((r) => r.persona.length), 7);
  L.push(`${'persona'.padEnd(w)}  ${'scenario'.padEnd(26)} auth   last run          runs  run id`);
  for (const r of p.runs) L.push(`${r.persona.padEnd(w)}  ${r.scenario.padEnd(26)} ${r.auth.padEnd(6)} ${(r.lastRunAt ? r.lastRunAt.slice(0, 16).replace('T', ' ') : 'never').padEnd(17)} ${String(r.runs).padStart(4)}  ${r.runId}`);
  L.push('', 'One subagent per line (docs/ux-sim/ORCHESTRATE.md), then: ux-sim report --all · write analysis.json · ux-sim issues --analysis …');
  return L.join('\n');
}
