import test from 'node:test';
import assert from 'node:assert/strict';
import { plan } from '../lib/batch.mjs';

const personas = [{ id: 'minji-freshman-17' }, { id: 'diego-transfer-commuter' }, { id: 'aisha-firstgen-anxious' }];
const scenarios = [{ id: 'lunch-today', personas: ['minji-freshman-17', 'diego-transfer-commuter', 'aisha-firstgen-anxious'] }, { id: 'find-a-club', setup: { auth: 'fresh' }, personas: ['aisha-firstgen-anxious'] }];
const history = {
  'minji-freshman-17|lunch-today': { lastRunAt: '2026-11-02T06:00:00Z', runs: 2 },
  'diego-transfer-commuter|lunch-today': { lastRunAt: '2026-11-01T06:00:00Z', runs: 1 },
  'aisha-firstgen-anxious|lunch-today': { lastRunAt: '2026-11-02T01:00:00Z', runs: 1 },
};
const P = (o) => plan({ batch: 'b', ...o }, { personas, scenarios, history });

test('--all lists every matrix cell, never-run first', () => {
  const p = P({ all: true });
  assert.equal(p.cells, 4);
  assert.deepEqual(p.runs.map((r) => `${r.persona.split('-')[0]}/${r.scenario}`), ['aisha/find-a-club', 'diego/lunch-today', 'aisha/lunch-today', 'minji/lunch-today']);
});

test('--rotate N picks the N least recently run cells', () => {
  assert.deepEqual(P({ rotate: 2 }).runs.map((r) => r.runId), ['b-aisha-find-a-club', 'b-diego-lunch-today']);
});

test('--scenario + --repeat, with worktree passed to the start command', () => {
  const p = P({ scenario: 'lunch-today', repeat: 2, worktree: '../fix' });
  assert.equal(p.runs.length, 6);
  assert.equal(p.runs[0].runId, 'b-diego-lunch-today-r1');
  assert.match(p.runs[0].start, /--worktree \.\.\/fix$/);
  assert.match(p.runs[0].subagentPrompt, /PERSONA_RUN\.md/);
});

test('selectors are required and validated', () => {
  assert.throws(() => P({}), /pick cells/);
  assert.throws(() => P({ scenario: 'nope' }), /unknown scenario/);
});
