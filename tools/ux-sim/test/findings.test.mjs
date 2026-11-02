import test from 'node:test';
import assert from 'node:assert/strict';
import { cluster, toSeverity, maxSeverity, medianSeverity, severityHistogram } from '../lib/findings.mjs';

test('severity helpers never return -Infinity/NaN (JSON would write null)', () => {
  assert.equal(toSeverity('3'), 3);
  assert.equal(toSeverity(5), null);
  assert.equal(toSeverity(undefined), null);
  assert.equal(maxSeverity([]), null);
  assert.equal(maxSeverity(['2', 4, 'x']), 4);
  assert.equal(medianSeverity([1, 2, 3, 4]), 2.5);
  assert.deepEqual(severityHistogram([1, '2', 2, 9]), { 1: 1, 2: 2, 3: 0, 4: 0 });
});

const run = (id, persona, events) => ({ runId: id, persona: { id: persona }, scenario: { id: 's' }, frictionEvents: events });
const ev = (sev, extra = {}) => ({ id: 'f', step: 1, type: 'ux_confusion', severity: sev, quote: 'q', route: '/', element: { name: "I'm in" }, evidence: [], environmentLimited: false, ...extra });

test('cluster: severityMax / maxSeverity are numbers, environment-limited events are kept out', () => {
  const { findings, environmentLimited } = cluster([run('r1', 'a', [ev(2), ev('3')]), run('r2', 'b', [ev(4), ev(4, { environmentLimited: true, environmentLimitedReason: 'x' })])]);
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severityMax, 4);
  assert.equal(findings[0].maxSeverity, 4);
  assert.equal(findings[0].severityMedian, 3);
  assert.equal(findings[0].personaCount, 2);
  assert.equal(environmentLimited.length, 1);
  assert.ok(!JSON.stringify(findings).includes('null,"severityMedian"'));
});
