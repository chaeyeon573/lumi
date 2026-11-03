import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { sfsuToCourses } from './sources/courses';

test('SF State class search JSON (CSC, Spring 2027): lectures with days/times/room, graduate courses kept, independent study left out', () => {
  const j = JSON.parse(readFileSync(new URL('./fixtures/sfsu-csc.json', import.meta.url), 'utf8'));
  const out = sfsuToCourses(j, '2273', 'Spring 2027');
  const c848 = out.find((c) => c.code === 'CSC 848');
  assert.equal(c848?.title, 'Software Engineering with AI (Sec 01)'); // 5 sections in the real data
  assert.deepEqual(c848?.meetings, [{ day: 3, start: '16:00', end: '18:45' }]);
  assert.equal(c848?.location, 'Thornton Hall 329');
  assert.equal(c848?.url, 'https://webapps.sfsu.edu/public/classservices/classsearch/detail/2273/REG/3402');
  const c340 = out.filter((c) => c.code === 'CSC 340');
  assert.ok(c340.length >= 2 && c340.every((c) => /\(Sec \w+\)$/.test(c.title)));
  assert.ok(c340.some((c) => JSON.stringify(c.meetings) === JSON.stringify([{ day: 1, start: '11:00', end: '12:15' }, { day: 3, start: '11:00', end: '12:15' }])));
  assert.ok(!out.some((c) => c.code === 'CSC 699'));
});
