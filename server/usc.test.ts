import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { uscToCourses, type UscCourse, resolveCourseSource } from './sources/courses';

test('USC classes.usc.edu: lecture times kept, labs left out, graduate courses included', () => {
  const { courses } = JSON.parse(readFileSync(new URL('./fixtures/usc-csci.json', import.meta.url), 'utf8')) as { courses: UscCourse[] };
  const out = uscToCourses(courses, '20263', 'Fall 2026');
  const by = (code: string) => out.filter((c) => c.code === code);
  assert.equal(by('CSCI 100').length, 1);
  assert.deepEqual(by('CSCI 100')[0].meetings, [{ day: 1, start: '11:00', end: '12:20' }, { day: 3, start: '11:00', end: '12:20' }]);
  assert.equal(by('CSCI 100')[0].title, 'Explorations in Computing');
  assert.deepEqual(by('CSCI 502A')[0].meetings, [{ day: 0, start: '09:00', end: '09:50' }, { day: 2, start: '09:00', end: '09:50' }, { day: 4, start: '09:00', end: '09:50' }]);
  assert.ok(resolveCourseSource('s_usc', 'usc'));
});
