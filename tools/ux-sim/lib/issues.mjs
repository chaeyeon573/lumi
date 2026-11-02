// ux-sim issues — turn findings.json into GitHub issue CANDIDATES (a JSON file). Nothing is posted.
// Only findings with severity ≥ 3 or seen by ≥ 2 personas. Each body carries <!-- ux-sim:fp=<hash> --> so a later
// step (human or bot) can search existing issues for the marker and update instead of duplicating.
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { GITHUB_BLOB, REPO_ROOT, rel } from './paths.mjs';
import { readJson, SEVERITY } from './util.mjs';
import { validate } from './validate.mjs';
import { DISCLAIMER, TYPE_LABEL } from './findings.mjs';

const blob = (p) => `${GITHUB_BLOB}/${String(p).split('/').map(encodeURIComponent).join('/')}`;

export async function issues(file, { out } = {}) {
  if (!file) throw new Error('usage: ux-sim issues <findings.json>');
  const abs = path.resolve(file);
  const data = readJson(abs);
  const errs = validate('findings', data);
  if (errs.length) throw new Error(`${file} is not a valid findings.json: ${errs.slice(0, 3).join('; ')}`);
  const picked = data.findings.filter((f) => f.severityMax >= 3 || f.personaCount >= 2);
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
  writeFileSync(dest, JSON.stringify({ generatedAt: new Date().toISOString(), source: rel(abs), rule: 'severity ≥ 3 or ≥ 2 personas; environment-limited events excluded', dedupe: 'search existing issues for the body marker <!-- ux-sim:fp=<fingerprint> --> before creating', note: 'Candidates only — ux-sim never creates issues.', candidates }, null, 2));
  return { candidates: candidates.length, of: data.findings.length, file: path.relative(REPO_ROOT, dest) };
}
