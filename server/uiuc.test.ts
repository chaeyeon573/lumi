import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { uiucToCourses } from './sources/courses';

test('Illinois course explorer XML (CS, Fall 2026): lecture sections with days, times, room, instructors', () => {
  const out = uiucToCourses(readFileSync(new URL('./fixtures/uiuc-cs.xml', import.meta.url), 'utf8'), '2026-fall', 'Fall 2026');
  const c100 = out.find((c) => c.code === 'CS 100');
  assert.equal(c100?.title, 'Computer Science Orientation');
  assert.deepEqual(c100?.meetings, [{ day: 3, start: '15:30', end: '16:45' }]);
  assert.equal(c100?.location, 'Campus Instructional Facility 3039');
  assert.equal(c100?.url, 'https://courses.illinois.edu/schedule/2026/fall/CS/100');
  assert.deepEqual(out.find((c) => c.code === 'CS 101')?.meetings, [{ day: 0, start: '10:00', end: '10:50' }, { day: 2, start: '10:00', end: '10:50' }]);
  assert.ok(out.filter((c) => c.code === 'CS 173').every((c) => /\(Sec [A-Z]+\d\)$/.test(c.title)));
});
