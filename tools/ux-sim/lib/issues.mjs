// ux-sim issues — turn findings.json into GitHub issue CANDIDATES (a JSON file). Nothing is posted.
// Only findings with severity ≥ 3 or seen by ≥ 2 personas. Each body carries <!-- ux-sim:fp=<hash> --> so a later
// step (human or bot) can search existing issues for the marker and update instead of duplicating.
import path from 'node:path';
import { writeFileSync, existsSync } from 'node:fs';
import { GITHUB_BLOB, REPO_ROOT, RUNS_DIR, rel } from './paths.mjs';
import { readJson, SEVERITY } from './util.mjs';
import { validate } from './validate.mjs';
import { DISCLAIMER, TYPE_LABEL } from './findings.mjs';

const blob = (p) => `${GITHUB_BLOB}/${String(p).split('/').map(encodeURIComponent).join('/')}`;

export async function issues(file, { out, analysis } = {}) {
  if (analysis) return issuesFromAnalysis(analysis, { out });
  if (!file) throw new Error('usage: ux-sim issues <findings.json> | --analysis <analysis.json>');
  const abs = path.resolve(file);
  const data = readJson(abs);
  const errs = validate('findings', data);
  if (errs.length) throw new Error(`${file} is not a valid findings.json: ${errs.slice(0, 3).join('; ')}`);
  const picked = data.findings.filter((f) => (f.severityMax ?? 0) >= 3 || f.personaCount >= 2);
  const candidates = picked.map((f) => {
    const L = [];
    L.push(`> **${DISCLAIMER}** Found by AI personas driving a real browser — a hypothesis to confirm, not measured behaviour.`, '');
    L.push('### Problem', '', `${TYPE_LABEL[f.frictionType]} on \`${f.screen}\`${f.keyElementLabel || f.keyElement ? ` around “${f.keyElementLabel || f.keyElement}”` : ''}. Seen by **${f.personaCount} simulated persona(s)** across ${f.scenarioCount} scenario(s); severity max **${f.severityMax}** (${SEVERITY[f.severityMax]}), median ${f.severityMedian}.`, '');
    L.push('### Evidence', '');
    for (const e of f.events.slice(0, 6)) {
      const shots = e.evidence.map((p, i) => `[${i ? 'marked' : 'screenshot'}](${blob(p)})`).join(' · ');
      L.push(`- **${e.persona}** · \`${e.scenario}\` · run \`${e.runId}\` step ${e.step} · sev ${e.severity} — “${e.quote}” ${shots}`);
    }
    if (f.events.length > 6) L.push(`- … and ${f.events.length - 6} more (see findings.json)`);
    L.push('', `Runs: ${f.runs.map((r) => `[\`${r}\`](${blob(`ux-sim/runs/${r}/report.md`)})`).join(', ')}`, '');
    L.push('### Personas affected', '', f.personas.map((p) => `\`${p}\``).join(', '), '');
    if (f.environmentCaveats?.length) L.push('### Environment caveat', '', ...f.environmentCaveats.map((c) => `- ${c}`), '');
    L.push('### Suggestion (hypothesis)', '', f.suggestedImprovement.text, '');
    L.push('### Note', '', f.hypothesisNote, '', `<!-- ux-sim:fp=${f.fingerprint} -->`);
    return {
      fingerprint: f.fingerprint,
      title: `[ux-sim] ${f.title}`,
      body: L.join('\n'),
      labels: ['ux-sim', `severity:${f.severityMax}`, f.frictionType],
      personas: f.personas, severityMax: f.severityMax, personaCount: f.personaCount,
    };
  });
  const dest = path.resolve(out ?? path.join(path.dirname(abs), 'issue-candidates.json'));
  writeFileSync(dest, JSON.stringify({ generatedAt: new Date().toISOString(), source: rel(abs), layer: 'heuristic (findings.json fingerprints) — prefer `ux-sim issues --analysis analysis.json`', rule: 'severity ≥ 3 or ≥ 2 personas; environment-limited events excluded', dedupe: 'search existing issues for the body marker <!-- ux-sim:fp=<fingerprint> --> before creating', note: 'Candidates only — ux-sim never creates issues.', candidates }, null, 2));
  return { candidates: candidates.length, of: data.findings.length, file: path.relative(REPO_ROOT, dest) };
}

// ─── curated layer: analysis.json → issue candidates ─────────────────────────
// A problem groups heuristic fingerprints; the body carries one marker per fingerprint plus a problem marker, so a
// poster can find an existing issue by either (the problem key is stable across dates, fingerprints across runs).
const runFileOf = (runId) => path.join(RUNS_DIR, runId, 'run.json');
function stepShot(runId, step) {
  const f = runFileOf(runId);
  if (!existsSync(f)) return null;
  const run = readJson(f);
  const st = run.steps?.find((s) => s.index === step);
  const about = st?.kind === 'note' ? run.steps.find((s) => s.index === st.about) : st;
  return about?.screenshot ? { screenshot: about.screenshot, annotated: about.annotatedScreenshot } : null;
}

/** schema + references: every evidence run/step exists, every findings fingerprint is grouped or dismissed */
export function checkAnalysis(file) {
  const abs = path.resolve(file);
  const data = readJson(abs);
  const errors = validate('analysis', data);
  const warnings = [];
  if (errors.length) return { file: rel(abs), valid: false, errors, warnings };
  for (const p of data.problems) for (const e of p.evidence) {
    if (!existsSync(runFileOf(e.runId))) { warnings.push(`${p.key}: evidence run ${e.runId} not found under ux-sim/runs`); continue; }
    const run = readJson(runFileOf(e.runId));
    if (!run.steps?.some((s) => s.index === e.step)) errors.push(`${p.key}: run ${e.runId} has no step ${e.step}`);
  }
  const keys = data.problems.map((p) => p.key);
  for (const k of new Set(keys)) if (keys.filter((x) => x === k).length > 1) errors.push(`problem key "${k}" is used twice`);
  const fAbs = path.resolve(REPO_ROOT, data.sources.findings);
  let coverage = null;
  if (existsSync(fAbs)) {
    const findings = readJson(fAbs).findings ?? [];
    const grouped = new Set(data.problems.flatMap((p) => p.fingerprints));
    const dismissed = new Set((data.dismissed ?? []).flatMap((d) => d.fingerprints));
    const known = new Set(findings.map((f) => f.fingerprint));
    const unassigned = findings.filter((f) => !grouped.has(f.fingerprint) && !dismissed.has(f.fingerprint));
    for (const fp of [...grouped, ...dismissed]) if (!known.has(fp)) warnings.push(`fingerprint ${fp} is not in ${data.sources.findings}`);
    coverage = { findings: findings.length, grouped: findings.filter((f) => grouped.has(f.fingerprint)).length, dismissed: findings.filter((f) => dismissed.has(f.fingerprint)).length, unassigned: unassigned.map((f) => `${f.fingerprint} ${f.title}`) };
    if (unassigned.length) warnings.push(`${unassigned.length} finding(s) are neither grouped into a problem nor dismissed`);
  } else warnings.push(`sources.findings ${data.sources.findings} not found — coverage not checked`);
  return { file: rel(abs), valid: errors.length === 0, errors, warnings, coverage, problems: data.problems.length };
}

/** a starting point for the analyst: every finding listed as unassigned, runs and outcomes filled in */
export function scaffoldAnalysis(findingsFile, { out } = {}) {
  const abs = path.resolve(findingsFile);
  const f = readJson(abs);
  const dest = path.resolve(out ?? path.join(path.dirname(abs), 'analysis.draft.json'));
  const draft = {
    schemaVersion: 1, kind: 'ux-sim-analysis', date: path.basename(path.dirname(abs)).match(/^\d{4}-\d{2}-\d{2}$/) ? path.basename(path.dirname(abs)) : new Date().toISOString().slice(0, 10),
    generatedAt: new Date().toISOString(), author: 'TODO: orchestrating Claude session (link)', disclaimer: DISCLAIMER,
    sources: { findings: rel(abs), runs: f.runs.map((r) => r.runId), harness: [...new Set(f.runs.map((r) => r.harness).filter(Boolean))].join(',') || null, appCommits: [...new Set(f.runs.map((r) => r.commit).filter(Boolean))] },
    problems: [],
    dismissed: [],
    harnessIssues: [],
    notes: `TODO — group these ${f.findings.length} heuristic findings into problems (or dismiss them), then delete this note and save as analysis.json:\n` + f.findings.map((x) => `${x.fingerprint} | sev ${x.severityMax} | ${x.personaCount}p | ${x.title}`).join('\n'),
  };
  writeFileSync(dest, JSON.stringify(draft, null, 2));
  return { draft: rel(dest), findings: f.findings.length, runs: f.runs.length, next: 'fill problems[] / dismissed[], save as analysis.json, then `ux-sim analysis check` and `ux-sim issues --analysis`' };
}

export async function issuesFromAnalysis(file, { out } = {}) {
  const chk = checkAnalysis(file);
  if (!chk.valid) throw new Error(`${file} is not a valid analysis.json: ${chk.errors.slice(0, 5).join('; ')}`);
  const abs = path.resolve(file);
  const data = readJson(abs);
  const want = (p) => p.file ?? (!p.environmentLimited && (p.severity >= 3 || p.personas.length >= 2));
  const picked = data.problems.filter((p) => !p.environmentLimited && want(p));
  const skipped = data.problems.filter((p) => !picked.includes(p)).map((p) => ({ key: p.key, title: p.title, why: p.environmentLimited ? 'environment-limited' : p.file === false ? 'file: false' : 'severity < 3 and a single persona' }));
  const candidates = picked.map((p) => {
    const L = [];
    L.push(`> **${DISCLAIMER}** Curated from AI personas driving a real browser — a hypothesis to confirm with real students, not measured behaviour.`, '');
    L.push('### Problem', '', p.summary, '');
    L.push(`Severity **${p.severity}** (${SEVERITY[p.severity]})${p.confidence ? ` · analyst confidence ${p.confidence}` : ''} · **${p.personas.length} simulated persona(s)** across ${p.scenarios.length} scenario(s).`, '');
    L.push('### Root cause (hypothesis)', '', p.rootCauseHypothesis, '');
    L.push('### Evidence', '');
    for (const e of p.evidence.slice(0, 10)) {
      const shot = e.screenshot ? { screenshot: e.screenshot } : stepShot(e.runId, e.step);
      const links = shot ? [`[screenshot](${blob(shot.screenshot)})`, shot.annotated ? `[marked](${blob(shot.annotated)})` : null].filter(Boolean).join(' · ') : '';
      L.push(`- run \`${e.runId}\` step ${e.step}${e.quote ? ` — “${e.quote}”` : ''}${e.note ? ` _(${e.note})_` : ''} ${links}`.trimEnd());
    }
    if (p.evidence.length > 10) L.push(`- … and ${p.evidence.length - 10} more (see analysis.json)`);
    const runs = [...new Set(p.evidence.map((e) => e.runId))];
    L.push('', `Runs: ${runs.map((r) => `[\`${r}\`](${blob(`ux-sim/runs/${r}/report.md`)})`).join(', ')}`, '');
    L.push('### Who', '', `Personas: ${p.personas.map((x) => `\`${x}\``).join(', ')} · scenarios: ${p.scenarios.map((x) => `\`${x}\``).join(', ')}`, '');
    if (p.environmentNote) L.push('### Environment note', '', p.environmentNote, '');
    L.push('### Suggested fix (hypothesis)', '', p.suggestedFix, '');
    L.push('### Note', '', 'Severity and persona counts describe simulated personas, not rates of real students. Re-run the affected cells after a fix and compare (docs/ux-sim/ORCHESTRATE.md).', '');
    L.push(`<!-- ux-sim:problem=${p.key} -->`, ...p.fingerprints.map((fp) => `<!-- ux-sim:fp=${fp} -->`));
    return {
      key: p.key, fingerprints: p.fingerprints,
      title: `[ux-sim] ${p.title}`,
      body: L.join('\n'),
      labels: ['ux-sim', `severity:${p.severity}`, ...new Set(p.frictionTypes ?? [])],
      personas: p.personas, scenarios: p.scenarios, severity: p.severity,
    };
  });
  const dest = path.resolve(out ?? path.join(path.dirname(abs), 'issue-candidates.json'));
  writeFileSync(dest, JSON.stringify({ generatedAt: new Date().toISOString(), source: rel(abs), layer: 'curated (analysis.json)', rule: 'not environment-limited, and severity ≥ 3 or ≥ 2 personas, unless the problem sets file: true|false', dedupe: 'before creating, search existing issues for <!-- ux-sim:problem=<key> --> and for any <!-- ux-sim:fp=<fingerprint> --> marker; update the match instead of duplicating', note: 'Candidates only — ux-sim never creates issues.', coverage: chk.coverage, warnings: chk.warnings, candidates, skipped }, null, 2));
  return { candidates: candidates.length, of: data.problems.length, skipped: skipped.length, warnings: chk.warnings, file: path.relative(REPO_ROOT, dest) };
}
