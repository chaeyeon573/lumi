import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { uwToCourses, resolveCourseSource } from './sources/courses';

test('UW time schedule: lectures only (quiz sections left out), no-AM/PM times read the UW way, graduate courses kept', () => {
  const out = uwToCourses(readFileSync(new URL('./fixtures/uw-cse.html', import.meta.url), 'utf8'), 'AUT2026', 'Fall 2026');
  const by = (code: string) => out.filter((c) => c.code === code);
  assert.equal(by('CSE 122').length, 2); // two lecture sections; 20+ quiz sections left out
  assert.deepEqual(by('CSE 122')[0].meetings, [{ day: 2, start: '12:30', end: '13:20' }, { day: 4, start: '12:30', end: '13:20' }]);
  assert.equal(by('CSE 122')[0].title, 'Comp Programming II (Sec A)');
  assert.deepEqual(by('CSE 122')[1].meetings, [{ day: 2, start: '14:30', end: '15:20' }, { day: 4, start: '14:30', end: '15:20' }]);
  assert.deepEqual(by('CSE 143')[0].meetings, [{ day: 0, start: '11:30', end: '12:20' }, { day: 2, start: '11:30', end: '12:20' }, { day: 4, start: '11:30', end: '12:20' }]);
  const g = by('CSE 599');
  assert.ok(g.length >= 2);
  assert.deepEqual(g.find((c) => c.title.endsWith('(Sec I)'))?.meetings, [{ day: 0, start: '15:00', end: '16:20' }, { day: 2, start: '15:00', end: '16:20' }]);
  assert.ok(resolveCourseSource('s_uw', 'uw'));
});
