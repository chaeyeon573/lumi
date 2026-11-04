import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gwuToCourses } from './sources/courses';

test('GWU schedule of classes (CSCI, Spring 2027): main sections only, days/times/room, linked labs left out', () => {
  const out = gwuToCourses(readFileSync(new URL('./fixtures/gwu-csci.html', import.meta.url), 'utf8'), '202701', 'Spring 2027');
  const c = out.find((x) => x.code === 'CSCI 1111');
  assert.equal(c?.title, 'Introduction to Software Development');
  assert.deepEqual(c?.meetings, [{ day: 1, start: '11:10', end: '12:25' }, { day: 3, start: '11:10', end: '12:25' }]);
  assert.equal(c?.location, 'FNGR 222');
  assert.ok(!out.some((x) => /Laboratory/.test(x.title)));
  assert.equal(out.filter((x) => x.code === 'CSCI 1012').length, 2);
});
