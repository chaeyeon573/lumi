// ux-sim compare — before/after sets of runs (e.g. before and after a fix): outcomes per persona×scenario,
// actions-to-goal, friction by type, findings resolved / still present / new (by fingerprint).
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { REPORTS_DIR, ensureDir, rel, today } from './paths.mjs';
import { readJson, FRICTION_TYPES } from './util.mjs';
import { resolveRuns } from './report.mjs';
import { cluster, DISCLAIMER } from './findings.mjs';

const load = (inputs) => resolveRuns(inputs).map((f) => readJson(f)).filter((r) => r.status === 'finished');
const median = (xs) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

export async function compare(before, after, { out, labels = {} } = {}) {
  if (!before.length || !after.length) throw new Error('compare needs --before <runs…> and --after <runs…> (run dirs, or folders of runs)');
  const B = load(before); const A = load(after);
  const key = (r) => `${r.persona.id} × ${r.scenario.id}`;
  const cells = new Map();
  for (const [side, runs] of [['before', B], ['after', A]]) for (const r of runs) { const c = cells.get(key(r)) ?? { persona: r.persona.id, scenario: r.scenario.id, before: [], after: [] }; c[side].push(r); cells.set(key(r), c); }
  const pairs = [...cells.values()].map((c) => {
    const sum = (runs) => ({
      runs: runs.map((r) => r.runId), outcomes: runs.map((r) => r.outcome), goalAchieved: runs.filter((r) => r.goalAchieved).length,
      actionsToGoal: median(runs.filter((r) => r.goalAchieved).map((r) => r.stepsToGoal)),
      friction: Object.fromEntries(FRICTION_TYPES.map((t) => [t, runs.reduce((n, r) => n + r.frictionEvents.filter((f) => f.type === t && !f.environmentLimited).length, 0)]).filter(([, n]) => n)),
      frustration: median(runs.map((r) => r.counters.frustration)),
    });
    const b = sum(c.before); const a = sum(c.after);
    let change = 'not comparable';
    if (c.before.length && c.after.length) {
      const rate = (s, n) => (n ? s.goalAchieved / n : 0);
      const d = rate(a, c.after.length) - rate(b, c.before.length);
      change = d > 0 ? 'better (goal reached more often)' : d < 0 ? 'worse (goal reached less often)' : (a.actionsToGoal !== null && b.actionsToGoal !== null && a.actionsToGoal < b.actionsToGoal ? 'better (fewer actions to goal)' : a.actionsToGoal !== null && b.actionsToGoal !== null && a.actionsToGoal > b.actionsToGoal ? 'worse (more actions to goal)' : 'same');
    }
    return { persona: c.persona, scenario: c.scenario, before: b, after: a, change };
  }).sort((x, y) => (x.persona + x.scenario).localeCompare(y.persona + y.scenario));
  const fb = cluster(B).findings; const fa = cluster(A).findings;
  const afterFp = new Set(fa.map((f) => f.fingerprint)); const beforeFp = new Set(fb.map((f) => f.fingerprint));
  const retested = new Set(A.map((r) => r.scenario.id));
  const brief = (f) => ({ fingerprint: f.fingerprint, title: f.title, severityMax: f.severityMax, personas: f.personas, scenarios: f.scenarios });
  const findings = {
    resolved: fb.filter((f) => !afterFp.has(f.fingerprint) && f.scenarios.some((s) => retested.has(s))).map(brief),
    notRetested: fb.filter((f) => !afterFp.has(f.fingerprint) && !f.scenarios.some((s) => retested.has(s))).map(brief),
    stillPresent: fa.filter((f) => beforeFp.has(f.fingerprint)).map((f) => ({ ...brief(f), severityMaxBefore: fb.find((x) => x.fingerprint === f.fingerprint).severityMax })),
    new: fa.filter((f) => !beforeFp.has(f.fingerprint)).map(brief),
  };
  // what was compared: the app commit per side, and whether both sides ran the same harness/accounts/catalog
  const side = (runs, label) => ({
    label: label ?? null,
    runs: runs.map((r) => r.runId),
    appCommits: [...new Set(runs.map((r) => r.target.stack?.stamp ?? r.target.baseUrl))],
    worktrees: [...new Set(runs.map((r) => r.target.stack?.worktree).filter(Boolean))],
    harness: [...new Set(runs.map((r) => r.harness?.hash ?? 'unknown'))],
    auth: [...new Set(runs.map((r) => r.auth?.mode ?? r.scenario.setup?.auth ?? 'unknown'))],
    catalog: [...new Set(runs.map((r) => r.target.stack?.catalog?.kind ?? 'unknown'))],
    modes: [...new Set(runs.map((r) => r.target.mode))],
  });
  const sb = side(B, labels.before); const sa = side(A, labels.after);
  const warnings = [];
  const same = (k) => JSON.stringify([...sb[k]].sort()) === JSON.stringify([...sa[k]].sort());
  if (!same('harness') || sb.harness.length > 1 || sb.harness.includes('unknown')) warnings.push(`harness differs or is unknown (before ${sb.harness.join(',')} · after ${sa.harness.join(',')}) — a change in outcome may come from the harness, not the app. Re-run both sides with the same tools/ux-sim checkout.`);
  for (const k of ['auth', 'catalog', 'modes']) if (!same(k)) warnings.push(`${k} differs between sides (before ${sb[k].join(',')} · after ${sa[k].join(',')})`);
  if (JSON.stringify(sb.appCommits) === JSON.stringify(sa.appCommits)) warnings.push(`both sides ran the same app version (${sb.appCommits.join(',')}) — this compares repeat runs, not two versions`);
  const unpaired = pairs.filter((p) => !p.before.runs.length || !p.after.runs.length).map((p) => `${p.persona} × ${p.scenario}`);
  if (unpaired.length) warnings.push(`cells on one side only (not compared): ${unpaired.join(', ')}`);
  const data = { schemaVersion: 1, generatedAt: new Date().toISOString(), disclaimer: DISCLAIMER, before: B.map((r) => r.runId), after: A.map((r) => r.runId), sides: { before: sb, after: sa }, warnings, pairs, findings };
  const dir = ensureDir(path.resolve(out ?? path.join(REPORTS_DIR, today())));
  const stamp = new Date().toISOString().slice(11, 16).replace(':', '');
  const jf = path.join(dir, `compare-${stamp}.json`); const mf = path.join(dir, `compare-${stamp}.md`);
  writeFileSync(jf, JSON.stringify(data, null, 2));
  const L = [`# ux-sim compare — ${data.generatedAt.slice(0, 16).replace('T', ' ')} UTC`, '', `> **${DISCLAIMER}** One run per cell is an anecdote, not a trend — re-run a cell a few times before trusting a change.`, '', `Before${sb.label ? ` (${sb.label})` : ''}: ${B.length} run(s), app ${sb.appCommits.join(', ')} · After${sa.label ? ` (${sa.label})` : ''}: ${A.length} run(s), app ${sa.appCommits.join(', ')} · harness ${[...new Set([...sb.harness, ...sa.harness])].join(', ')}`, '', ...(warnings.length ? ['**Warnings**', '', ...warnings.map((w) => `- ⚠ ${w}`), ''] : []), '## Persona × scenario', '', '| persona | scenario | before | after | actions to goal (before → after) | friction before → after | change |', '|---|---|---|---|---|---|---|'];
  const fr = (o) => Object.entries(o).map(([k, v]) => `${k} ${v}`).join(', ') || '—';
  for (const p of pairs) L.push(`| ${p.persona} | ${p.scenario} | ${p.before.outcomes.join(', ') || '—'} | ${p.after.outcomes.join(', ') || '—'} | ${p.before.actionsToGoal ?? '—'} → ${p.after.actionsToGoal ?? '—'} | ${fr(p.before.friction)} → ${fr(p.after.friction)} | ${p.change} |`);
  for (const [name, list] of [['Resolved (not seen again in re-tested scenarios)', findings.resolved], ['Still present', findings.stillPresent], ['New', findings.new], ['Not re-tested (scenario not in the after set)', findings.notRetested]]) {
    L.push('', `## ${name} — ${list.length}`, '');
    for (const f of list) L.push(`- \`${f.fingerprint}\` ${f.title} — sev ${f.severityMaxBefore !== undefined ? `${f.severityMaxBefore} → ` : ''}${f.severityMax}, ${f.personas.join(', ')}`);
  }
  writeFileSync(mf, L.join('\n') + '\n');
  return { compare: rel(mf), json: rel(jf), warnings, pairs: pairs.length, resolved: findings.resolved.length, stillPresent: findings.stillPresent.length, new: findings.new.length };
}
