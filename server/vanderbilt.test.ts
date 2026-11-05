import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { vanderbiltToCourses, resolveCourseSource } from './sources/courses';

test('Vanderbilt YES class search: lecture sections with days and a/p times', () => {
  const out = vanderbiltToCourses(readFileSync(new URL('./fixtures/vanderbilt-cs.html', import.meta.url), 'utf8'), '1075', 'Fall 2026');
  const cs1101 = out.filter((c) => c.code === 'CS 1101');
  assert.equal(cs1101.length, 4);
  assert.equal(cs1101[0].title, 'Programming and Problem Solving (Sec 01)');
  assert.deepEqual(cs1101[0].meetings, [{ day: 0, start: '13:25', end: '14:15' }, { day: 2, start: '13:25', end: '14:15' }, { day: 4, start: '13:25', end: '14:15' }]);
  assert.deepEqual(cs1101[1].meetings, [{ day: 0, start: '11:15', end: '12:05' }, { day: 2, start: '11:15', end: '12:05' }, { day: 4, start: '11:15', end: '12:05' }]);
  assert.ok(resolveCourseSource('s_vanderbilt', 'vanderbilt'));
});
