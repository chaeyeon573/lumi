// analysis.json (curated layer) → schema, coverage check, issue candidates. Runs in a temp UX_SIM_HOME.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const home = mkdtempSync(path.join(os.tmpdir(), 'uxsim-test-'));
process.env.UX_SIM_HOME = home;
const { checkAnalysis, issuesFromAnalysis, scaffoldAnalysis } = await import('../lib/issues.mjs');
const { validate } = await import('../lib/validate.mjs');
const { rel } = await import('../lib/paths.mjs');

mkdirSync(path.join(home, 'runs', 'r1'), { recursive: true });
writeFileSync(path.join(home, 'runs', 'r1', 'run.json'), JSON.stringify({ runId: 'r1', steps: [{ index: 0, kind: 'start', screenshot: 'ux-sim/runs/r1/shots/000-start.jpg', annotatedScreenshot: 'ux-sim/runs/r1/shots/000-start-som.jpg' }, { index: 1, kind: 'note', about: 0 }] }));
const rep = path.join(home, 'reports', '2026-11-02');
mkdirSync(rep, { recursive: true });
const findingsFile = path.join(rep, 'findings.json');
writeFileSync(findingsFile, JSON.stringify({ runs: [{ runId: 'r1', harness: 'abc', commit: 'deadbeef' }], findings: [{ fingerprint: 'aaaaaaaaaaaa', title: 'Confusing UI on /', severityMax: 3, personaCount: 1 }, { fingerprint: 'bbbbbbbbbbbb', title: 'Bug on /x', severityMax: 1, personaCount: 1 }, { fingerprint: 'cccccccccccc', title: 'Copy on /y', severityMax: 1, personaCount: 1 }] }));

const problem = (over = {}) => ({
  key: 'im-in-unclear', title: "People card: 'I'm in' doesn't say what you're joining", summary: 'Personas tapped I\'m in without knowing it joins a plan.',
  rootCauseHypothesis: 'The plan title is small and the button sits under a large face photo.', severity: 3, confidence: 'medium', frictionTypes: ['ux_confusion'],
  personas: ['minji-freshman-17'], scenarios: ['lunch-today'], evidence: [{ runId: 'r1', step: 1, quote: 'in what?' }],
  environmentLimited: false, environmentNote: null, suggestedFix: "Label the button with the plan: 'Join lunch at 12:30'.", fingerprints: ['aaaaaaaaaaaa'], ...over,
});
const analysis = (problems, extra = {}) => ({ schemaVersion: 1, kind: 'ux-sim-analysis', date: '2026-11-02', generatedAt: new Date().toISOString(), author: 'test', disclaimer: 'AI simulation — hypotheses, not measured user behaviour.', sources: { findings: rel(findingsFile), runs: ['r1'] }, problems, ...extra });

test('schema rejects generic or incomplete problems', () => {
  assert.deepEqual(validate('analysis', analysis([problem()])), []);
  assert.ok(validate('analysis', analysis([problem({ title: 'UI' })])).length, 'title too short');
  assert.ok(validate('analysis', analysis([problem({ evidence: [] })])).length, 'evidence required');
  assert.ok(validate('analysis', analysis([problem({ fingerprints: ['xyz'] })])).length, 'fingerprint format');
  const { rootCauseHypothesis: _r, ...noCause } = problem();
  assert.ok(validate('analysis', analysis([noCause])).length, 'root cause required');
});

test('check: evidence must exist, coverage lists unassigned fingerprints', () => {
  const f = path.join(rep, 'analysis.json');
  writeFileSync(f, JSON.stringify(analysis([problem()], { dismissed: [{ fingerprints: ['bbbbbbbbbbbb'], reason: 'persona over-read' }] })));
  const c = checkAnalysis(f);
  assert.equal(c.valid, true, c.errors.join('; '));
  assert.equal(c.coverage.grouped, 1); assert.equal(c.coverage.dismissed, 1);
  assert.deepEqual(c.coverage.unassigned, ['cccccccccccc Copy on /y']);
  writeFileSync(f, JSON.stringify(analysis([problem({ evidence: [{ runId: 'r1', step: 99 }] })])));
  assert.equal(checkAnalysis(f).valid, false);
});

test('issues --analysis: curated titles, evidence links, problem + fingerprint markers; env-limited skipped', async () => {
  const f = path.join(rep, 'analysis.json');
  writeFileSync(f, JSON.stringify(analysis([
    problem(),
    problem({ key: 'catalog-names', title: 'Course names differ from the real catalog', environmentLimited: true, environmentNote: 'built-in catalog', fingerprints: ['cccccccccccc'] }),
    problem({ key: 'tiny', title: 'Small wording nit on the feed', severity: 1, fingerprints: ['bbbbbbbbbbbb'] }),
  ])));
  const out = path.join(rep, 'ic.json');
  const r = await issuesFromAnalysis(f, { out });
  assert.equal(r.candidates, 1); assert.equal(r.skipped, 2);
  const data = JSON.parse(readFileSync(out, 'utf8'));
  const c = data.candidates[0];
  assert.equal(c.title, "[ux-sim] People card: 'I'm in' doesn't say what you're joining");
  assert.match(c.body, /<!-- ux-sim:problem=im-in-unclear -->/);
  assert.match(c.body, /<!-- ux-sim:fp=aaaaaaaaaaaa -->/);
  assert.match(c.body, /Root cause \(hypothesis\)/);
  assert.match(c.body, /000-start\.jpg/, 'screenshot resolved from the note step\'s screen');
  assert.deepEqual(c.labels, ['ux-sim', 'severity:3', 'ux_confusion']);
  assert.deepEqual(data.skipped.map((s) => s.why).sort(), ['environment-limited', 'severity < 3 and a single persona']);
});

test('analysis init writes a draft that lists every finding', () => {
  const r = scaffoldAnalysis(findingsFile);
  const d = JSON.parse(readFileSync(path.join(rep, 'analysis.draft.json'), 'utf8'));
  assert.equal(r.findings, 3);
  assert.match(d.notes, /aaaaaaaaaaaa/);
  assert.deepEqual(d.sources.runs, ['r1']);
});
