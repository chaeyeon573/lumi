import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cmuToCourses, resolveCourseSource } from './sources/courses';

test('CMU Schedule of Classes: lectures (recitations left out), extra meeting rows, 12h→24h, graduate courses', () => {
  const out = cmuToCourses(readFileSync(new URL('./fixtures/cmu-soc.html', import.meta.url), 'utf8'), 'F26', 'Fall 2026');
  const by = (code: string) => out.filter((c) => c.code === code);
  assert.deepEqual(by('15-122').map((c) => c.title), ['Principles of Imperative Computation (Lec 1)', 'Principles of Imperative Computation (Lec 2)']);
  assert.deepEqual(by('15-122')[0].meetings, [{ day: 1, start: '09:30', end: '10:50' }, { day: 3, start: '09:30', end: '10:50' }, { day: 1, start: '19:00', end: '20:20' }]);
  assert.deepEqual(by('10-701')[0].meetings, [{ day: 0, start: '14:00', end: '15:20' }, { day: 2, start: '14:00', end: '15:20' }, { day: 4, start: '14:00', end: '15:20' }]);
  assert.ok(by('76-101').length > 1); // no lecture: every lettered section is the class
  assert.ok(resolveCourseSource('s_cmu', 'cmu'));
});
