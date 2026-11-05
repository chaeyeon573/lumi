import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { riceToCourses, resolveCourseSource } from './sources/courses';

test('Rice courses.rice.edu: class meetings, 12h→24h times, title case, graduate courses', () => {
  const out = riceToCourses(readFileSync(new URL('./fixtures/rice-comp.html', import.meta.url), 'utf8'), '202710', 'Fall 2026');
  const by = (code: string) => out.find((c) => c.code === code)!;
  assert.deepEqual(by('COMP 182').meetings, [{ day: 1, start: '09:25', end: '10:40' }, { day: 3, start: '09:25', end: '10:40' }]);
  assert.equal(by('COMP 182').title, 'Algorithmic Thinking');
  assert.deepEqual(by('COMP 181').meetings, [{ day: 2, start: '13:00', end: '13:50' }]);
  assert.deepEqual(by('COMP 552').meetings, [{ day: 1, start: '16:00', end: '17:15' }, { day: 3, start: '16:00', end: '17:15' }]);
  assert.equal(by('COMP 510').title, 'Computer Ethics');
  assert.ok(resolveCourseSource('s_rice', 'rice'));
});
