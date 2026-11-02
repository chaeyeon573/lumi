// ux-sim report — per-run report.md + aggregate summary.md / findings.json (validated against the JSON Schemas).
import path from 'node:path';
import { existsSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { RUNS_DIR, REPORTS_DIR, REPO_ROOT, ensureDir, rel, today } from './paths.mjs';
import { readJson, SEVERITY } from './util.mjs';
import { validate } from './validate.mjs';
import { cluster, DISCLAIMER, TYPE_LABEL, maxSeverity, severityHistogram } from './findings.mjs';

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ');
/** link from a markdown file to a repo-relative path */
const linkFrom = (mdFile, p) => (p ? path.relative(path.dirname(mdFile), path.join(REPO_ROOT, p)).split(path.sep).join('/') : '');

/** Accepts run dirs, run.json files, or directories that contain run dirs. */
export function resolveRuns(inputs, { all } = {}) {
  const files = [];
  const add = (p) => {
    const abs = path.resolve(p);
    if (!existsSync(abs)) throw new Error(`no such file or directory: ${p}`);
    if (statSync(abs).isFile()) { files.push(abs); return; }
    if (existsSync(path.join(abs, 'run.json'))) { files.push(path.join(abs, 'run.json')); return; }
    for (const d of readdirSync(abs)) if (existsSync(path.join(abs, d, 'run.json'))) files.push(path.join(abs, d, 'run.json'));
  };
  if (all) add(RUNS_DIR);
  for (const i of inputs) add(i);
  return [...new Set(files)];
}

function hypothesisLine(d) {
  if (!d) return '—';
  return `**${d.level}** _(AI hypothesis, ${d.source === 'persona-agent' ? 'persona agent' : 'harness heuristic'})_ — ${esc(d.rationale)}${d.basis?.length ? ` · basis: steps ${d.basis.join(', ')}` : ''}`;
}

export function runReport(run, runFile) {
  const md = path.join(path.dirname(runFile), 'report.md');
  const L = [];
  const p = run.persona; const s = run.scenario;
  L.push(`# ux-sim run \`${run.runId}\``, '', `> **${DISCLAIMER}** One simulated persona; nothing here is a rate or a measurement of real students.`, '');
  L.push('| | |', '|---|---|');
  L.push(`| Persona | **${esc(p.name)}**, ${p.age} — ${esc(p.year)} · ${p.device.type} ${p.device.viewport.width}×${p.device.viewport.height} · prefers ${p.language.preferred} · tech ${p.techFamiliarity} (\`${p.id}\`) |`);
  L.push(`| Scenario | **${esc(s.title ?? s.id)}** — ${esc(s.goal)} (\`${s.id}\`) |`);
  L.push(`| Target | ${run.target.mode} · ${run.target.baseUrl}${run.target.stack ? ` · worktree commit \`${run.target.stack.stamp}\`` : ''}${run.target.liveGuard?.enabled ? ' · **live write guard on**' : ''} |`);
  L.push(`| Outcome | **${run.outcome}**${run.reportedOutcome && run.reportedOutcome !== run.outcome ? ` (persona said ${run.reportedOutcome})` : ''} · ended by ${run.endedBy} |`);
  const am = run.auth?.mode ?? run.scenario.setup?.auth ?? null;
  L.push(`| Account | ${am === 'fresh' ? `fresh real account \`${esc(run.auth.email)}\` (${esc(run.auth.profile?.nickname)}, ${esc(run.auth.profile?.department)}, born ${run.auth.profile?.birthYear}; sample: ${run.auth.sample})${run.auth.peers?.length ? ` · peers seeded: ${run.auth.peers.map((x) => esc(x.nickname)).join(', ')}` : ''}` : am === 'demo' ? 'shared demo account (sample profile with someone else\'s data)' : am === 'none' ? 'signed out at start' : '—'} |`);
  L.push(`| Goal check (fixed, by harness) | ${run.goalAchieved ? `met at step ${run.goalFirstMetAtStep} after ${run.stepsToGoal} action(s)${run.goalEvidence?.matched?.length ? ` — evidence: ${run.goalEvidence.matched.map((m) => esc(m.description ?? m.record ?? JSON.stringify(m))).join('; ')}` : ''}` : 'not met'} — _${esc(s.success?.description ?? '')}_ |`);
  if (run.patienceExhaustedAtStep !== null && run.patienceExhaustedAtStep !== undefined) L.push(`| Patience | exhausted at step ${run.patienceExhaustedAtStep}; ${run.actionsAfterPatienceExhausted} action(s) after${run.overrodePatience ? ' — **overrodePatience**' : ''} |`);
  if (run.falseSuccess) L.push('| ⚠ false success | The persona believed it succeeded but the scenario check did not pass. |');
  if (run.unnoticedSuccess) L.push('| ⚠ unnoticed success | The check passed but the persona did not realise it had succeeded. |');
  L.push(`| Persona's reason | “${esc(run.outcomeReason)}” |`);
  L.push(`| Effort | ${run.counters.actions}/${run.limits.maxSteps} actions · objective frustration ${run.counters.frustration.toFixed(2)}/${run.limits.frustrationThreshold} · ${run.counters.confusionNotes} confused note(s) · ~${Math.round(run.counters.simTimeSec)}s simulated |`);
  L.push(`| Drop-off risk | ${hypothesisLine(run.dropoffRisk)} |`, '');
  if (run.environment?.knownLimits?.length) { L.push('<details><summary>Known environment limits (not UX findings)</summary>', '', ...run.environment.knownLimits.map((k) => `- ${k}`), '', '</details>', ''); }

  L.push('## Friction', '');
  if (!run.frictionEvents.length) L.push('_No friction events were logged._', '');
  else {
    L.push('| # | step | type | sev | persona says | screen | element | env-limited | evidence |', '|---|---|---|---|---|---|---|---|---|');
    for (const f of run.frictionEvents) {
      L.push(`| ${f.id} | ${f.step} | ${TYPE_LABEL[f.type]} | ${f.severity} | “${esc(f.quote)}”${f.wish ? ` _wish: ${esc(f.wish)}_` : ''} | \`${f.route}\` | ${esc(f.element?.name || (f.element?.icon ? `icon ${f.element.icon}` : ''))} | ${f.environmentLimited ? `yes — ${esc(f.environmentLimitedReason)}` : f.environmentCaveat ? `caveat — ${esc(f.environmentCaveat)}` : 'no'} | ${f.evidence.map((e, i) => `[${i ? 'marked' : 'shot'}](${linkFrom(md, e)})`).join(' ')} |`);
    }
    L.push('', `<sub>Severity: ${Object.entries(SEVERITY).map(([k, v]) => `${k} = ${v}`).join(' · ')}</sub>`, '');
  }
  if (run.abandonPoint) {
    L.push('## Where it ended', '', `Step ${run.abandonPoint.step} on \`${run.abandonPoint.route ?? run.abandonPoint.url}\`.`, '');
    if (run.abandonPoint.screenshot) L.push(`<img src="${linkFrom(md, run.abandonPoint.screenshot)}" width="260" alt="abandon point">`, '');
  }

  L.push('## Timeline', '', '| step | what | screen | ms | signals / notes | shot |', '|---|---|---|---|---|---|');
  const notesFor = new Map();
  for (const st of run.steps) if (st.kind === 'note') (notesFor.get(st.about) ?? notesFor.set(st.about, []).get(st.about)).push(st);
  for (const st of run.steps) {
    if (st.kind === 'note') continue;
    const what = st.kind === 'action'
      ? `${st.command}${st.target ? ` ${st.target.name ? `“${esc(String(st.target.name).slice(0, 40))}”` : st.target.icon ? `(icon ${st.target.icon})` : st.target.at ? `@${st.target.at.x},${st.target.at.y}` : `[${st.target.id}]`}` : ''}${st.args?.text ? ` ← “${esc(st.args.text)}”` : ''}${st.args?.direction ? ` ${st.args.direction}` : ''}${st.args?.url ? ` ${st.args.url}` : ''}${st.result === 'error' ? ` ❌ ${esc(st.error)}` : ''}`
      : st.kind;
    const bits = [];
    if (st.intent) bits.push(`expects: “${esc(st.intent.expectedOutcome)}” (${st.intent.confidence ?? '?'})`);
    if (st.reflection) bits.push(st.reflection.mismatch ? `**mismatch**${st.reflection.actualOutcome ? `: ${esc(st.reflection.actualOutcome)}` : ''}` : 'as expected');
    for (const sg of st.signals ?? []) bits.push(`⚑ ${sg.type}`);
    for (const n of notesFor.get(st.index) ?? []) bits.push(`_${n.feeling}_: “${esc(n.thought)}”${n.frictionId ? ` → ${n.frictionId}` : ''}`);
    if (st.consoleErrors?.length) bits.push(`console errors: ${st.consoleErrors.length}`);
    if (st.failedRequests?.length) bits.push(`failed requests: ${st.failedRequests.map((f) => `${f.status} ${esc(f.url.replace(/^https?:\/\/[^/]+/, ''))}`).slice(0, 3).join(', ')}`);
    if (st.blockedRequests?.length) bits.push(`blocked by live guard: ${st.blockedRequests.length}`);
    const shot = st.screenshot ? `<a href="${linkFrom(md, st.annotatedScreenshot)}"><img src="${linkFrom(md, st.screenshot)}" width="110"></a>` : '';
    L.push(`| ${st.index} | ${what} | \`${st.route ?? ''}\` | ${st.latencyMs ?? ''} | ${bits.join('<br>')} | ${shot} |`);
  }
  L.push('');
  if (run.autoChecks?.length) {
    const byRoute = new Map();
    for (const c of run.autoChecks) { const r = byRoute.get(c.route) ?? { tap: 0, ex: [], overflow: 0, broken: 0 }; r.tap = Math.max(r.tap, c.smallTapTargets); r.ex = r.ex.length ? r.ex : c.smallTapTargetExamples; r.overflow = Math.max(r.overflow, c.horizontalOverflowPx); r.broken = Math.max(r.broken, c.brokenImages); byRoute.set(c.route, r); }
    L.push('## Automatic checks (harness, not persona)', '', '| screen | tap targets < 44px | sideways overflow | broken images |', '|---|---|---|---|');
    for (const [r, c] of byRoute) L.push(`| \`${r}\` | ${c.tap}${c.ex.length ? ` (${c.ex.map((e) => `${esc(e.name)} ${e.w}×${e.h}`).join(', ')})` : ''} | ${c.overflow ? `${c.overflow}px` : '—'} | ${c.broken || '—'} |`);
    L.push('');
  }
  const slow = run.steps.filter((st) => (st.latencyMs ?? 0) >= 3000);
  const loads = run.steps.filter((st) => st.checks?.navLoadMs).map((st) => st.checks.navLoadMs);
  if (slow.length || loads.length) {
    L.push('## Timing (harness)', '');
    if (loads.length) L.push(`- Full page load (navigation timing): ${[...new Set(loads)].map((x) => `${x} ms`).join(', ')}`);
    for (const st of slow) L.push(`- Step ${st.index} \`${st.command}\` took ${st.latencyMs} ms until the network was quiet on \`${st.route}\``);
    L.push('');
  }
  writeFileSync(md, L.join('\n'));
  return md;
}

export async function report(inputs, { all, out } = {}) {
  const files = resolveRuns(inputs, { all });
  if (!files.length) throw new Error('no runs given — pass run directories or --all');
  const runs = []; const problems = []; const reports = [];
  for (const f of files) {
    const run = readJson(f);
    if (run.status !== 'finished') { problems.push({ run: rel(f), problem: 'still running — skipped' }); continue; }
    const errs = validate('run', run);
    if (errs.length) { problems.push({ run: rel(f), problem: 'schema', errors: errs.slice(0, 10) }); continue; }
    reports.push(rel(runReport(run, f)));
    runs.push({ run, file: f });
  }
  if (!runs.length) return { reports, problems };
  const dir = ensureDir(path.resolve(out ?? path.join(REPORTS_DIR, today())));
  const { findings, environmentLimited } = cluster(runs.map((r) => r.run));
  const data = {
    schemaVersion: 1, generatedAt: new Date().toISOString(), disclaimer: DISCLAIMER,
    runs: runs.map(({ run, file }) => {
      const ux = run.frictionEvents.filter((f) => !f.environmentLimited);
      return {
        runId: run.runId, persona: run.persona.id, scenario: run.scenario.id, outcome: run.outcome, reportedOutcome: run.reportedOutcome, goalAchieved: run.goalAchieved, stepsToGoal: run.stepsToGoal, actions: run.counters.actions,
        frictionCount: ux.length, maxSeverity: maxSeverity(ux.map((f) => f.severity)),
        mode: run.target.mode, auth: run.auth?.mode ?? run.scenario.setup?.auth ?? null, commit: run.target.stack?.stamp ?? null, harness: run.harness?.hash ?? null, catalog: run.target.stack?.catalog?.kind ?? null,
        overrodePatience: !!run.overrodePatience, dropoffRisk: run.dropoffRisk, runFile: rel(file), report: rel(path.join(path.dirname(file), 'report.md')),
      };
    }),
    totals: (() => {
      const ux = runs.flatMap(({ run }) => run.frictionEvents.filter((f) => !f.environmentLimited).map((f) => f.severity));
      return { runs: runs.length, findings: findings.length, frictionEvents: ux.length, environmentLimitedEvents: environmentLimited.length, maxSeverity: maxSeverity(ux), bySeverity: severityHistogram(ux), multiPersonaFindings: findings.filter((f) => f.personaCount >= 2).length, singletonFindings: findings.filter((f) => f.occurrences === 1).length };
    })(),
    findings, environmentLimited,
    falseSuccesses: runs.filter(({ run }) => run.falseSuccess).map(({ run }) => run.runId),
    autoChecks: aggregateChecks(runs.map((r) => r.run)),
  };
  const errs = validate('findings', data);
  if (errs.length) throw new Error(`findings.json failed its schema: ${errs.slice(0, 5).join('; ')}`);
  const fj = path.join(dir, 'findings.json');
  writeFileSync(fj, JSON.stringify(data, null, 2));
  const sm = path.join(dir, 'summary.md');
  const af = path.join(dir, 'analysis.json');
  const analysis = existsSync(af) ? readJson(af) : null;
  writeFileSync(sm, summaryMd(data, sm, analysis));
  return { reports, summary: rel(sm), findings: rel(fj), runs: runs.length, findingsCount: findings.length, environmentLimited: environmentLimited.length, problems };
}

function aggregateChecks(runs) {
  const m = new Map();
  for (const r of runs) for (const c of r.autoChecks ?? []) {
    const k = `${c.route}|${r.persona.device.type}`;
    const x = m.get(k) ?? { route: c.route, device: r.persona.device.type, smallTapTargetsMax: 0, examples: [], horizontalOverflowPxMax: 0, brokenImagesMax: 0, evidence: c.screenshot };
    x.smallTapTargetsMax = Math.max(x.smallTapTargetsMax, c.smallTapTargets);
    if (!x.examples.length) x.examples = c.smallTapTargetExamples ?? [];
    x.horizontalOverflowPxMax = Math.max(x.horizontalOverflowPxMax, c.horizontalOverflowPx);
    x.brokenImagesMax = Math.max(x.brokenImagesMax, c.brokenImages);
    m.set(k, x);
  }
  return [...m.values()].sort((a, b) => b.smallTapTargetsMax - a.smallTapTargetsMax);
}

function summaryMd(d, sm, analysis) {
  const L = [];
  L.push(`# ux-sim summary — ${d.generatedAt.slice(0, 10)}`, '', `> **${DISCLAIMER}** AI personas drove a real browser. Counts are simulated personas, never rates; every risk below is a hypothesis to check with real students.`, '');
  if (analysis?.problems?.length) {
    L.push('## Curated problems (analysis.json)', '', `_Written by ${esc(analysis.author)}. Heuristic clusters are below._`, '', '| sev | problem | personas | env-limited | fingerprints |', '|---|---|---|---|---|');
    for (const p of [...analysis.problems].sort((a, b) => b.severity - a.severity || b.personas.length - a.personas.length)) L.push(`| ${p.severity} | **${esc(p.title)}** — ${esc(p.rootCauseHypothesis).slice(0, 160)} | ${p.personas.length} | ${p.environmentLimited ? 'yes' : 'no'} | ${p.fingerprints.map((f) => `\`${f}\``).join(' ')} |`);
    L.push('');
  }
  L.push(`${d.runs.length} run(s) · ${d.findings.length} finding(s) (${d.totals.multiPersonaFindings} seen by ≥ 2 personas, ${d.totals.singletonFindings} single events) · max severity **${d.totals.maxSeverity ?? '—'}** · severity 1/2/3/4: ${[1, 2, 3, 4].map((k) => d.totals.bySeverity[k]).join(' / ')} · ${d.environmentLimited.length} environment-limited event(s) kept out of findings.`, '');
  L.push('_These clusters are mechanical (screen + type + element). The curated problem list is `analysis.json` next to this file, written by the orchestrating session — see docs/ux-sim/ORCHESTRATE.md._', '');
  L.push('## Runs', '', '| persona | scenario | auth | outcome | goal check | actions | friction (max sev) | drop-off risk (hypothesis) | report |', '|---|---|---|---|---|---|---|---|---|');
  for (const r of d.runs) L.push(`| ${r.persona} | ${r.scenario} | ${r.auth ?? '—'} | ${r.outcome}${r.reportedOutcome && r.reportedOutcome !== r.outcome ? ` (said ${r.reportedOutcome})` : ''}${r.overrodePatience ? ' ⚠ overrode patience' : ''} | ${r.goalAchieved ? `met (${r.stepsToGoal} actions)` : 'not met'} | ${r.actions} | ${r.frictionCount} (${r.maxSeverity ?? '—'}) | ${r.dropoffRisk ? `${r.dropoffRisk.level} — ${esc(r.dropoffRisk.rationale).slice(0, 140)}` : '—'} | [report](${linkFrom(sm, r.report)}) |`);
  L.push('');
  if (d.falseSuccesses.length) L.push(`**False successes** (persona believed it was done, the fixed check disagreed): ${d.falseSuccesses.map((x) => `\`${x}\``).join(', ')}`, '');
  L.push('## Findings', '', '_Clustered by screen + friction type + key element. Sorted by number of personas, then severity._', '');
  if (!d.findings.length) L.push('_None._', '');
  for (const [i, f] of d.findings.entries()) {
    L.push(`### ${i + 1}. ${f.title}`, '');
    L.push(`- **Type** ${TYPE_LABEL[f.frictionType]} · **severity** max ${f.severityMax}, median ${f.severityMedian} · **${f.personaCount} persona(s)**: ${f.personas.join(', ')} · scenarios: ${f.scenarios.join(', ')} · fingerprint \`${f.fingerprint}\``);
    for (const e of f.events.slice(0, 4)) L.push(`- ${e.persona} (step ${e.step}, sev ${e.severity}): “${esc(e.quote)}” — ${e.evidence[0] ? `[screenshot](${linkFrom(sm, e.evidence[0])})` : ''}${e.evidence[1] ? ` · [marked](${linkFrom(sm, e.evidence[1])})` : ''}`);
    if (f.events.length > 4) L.push(`- … ${f.events.length - 4} more`);
    if (f.environmentCaveats.length) L.push(`- ⚠ environment caveat: ${f.environmentCaveats.join(' ')}`);
    L.push(`- **Suggested improvement (hypothesis):** ${f.suggestedImprovement.text}`, '');
  }
  if (d.environmentLimited.length) {
    L.push('## Environment-limited (not UX findings)', '', '| run | step | type | persona says | why |', '|---|---|---|---|---|');
    for (const e of d.environmentLimited) L.push(`| ${e.runId} | ${e.step} | ${e.type} | “${esc(e.quote)}” | ${esc(e.reason)} |`);
    L.push('');
  }
  if (d.autoChecks.length) {
    L.push('## Automatic checks (harness)', '', '| screen | device | tap targets < 44px (max) | sideways overflow | broken images |', '|---|---|---|---|---|');
    for (const c of d.autoChecks) L.push(`| \`${c.route}\` | ${c.device} | ${c.smallTapTargetsMax}${c.examples.length ? ` — e.g. ${c.examples.slice(0, 3).map((e) => `${esc(e.name)} ${e.w}×${e.h}`).join(', ')}` : ''} | ${c.horizontalOverflowPxMax ? `${c.horizontalOverflowPxMax}px` : '—'} | ${c.brokenImagesMax || '—'} |`);
    L.push('');
  }
  return L.join('\n');
}
