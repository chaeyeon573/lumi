import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { uclaSummaryToCourses } from './sources/courses';

test('UCLA GetCourseSummary (COM SCI 31, Winter 2027): lectures with days, times, room, instructor', () => {
  const html = readFileSync(new URL('./fixtures/ucla-comsci31.html', import.meta.url), 'utf8');
  const out = uclaSummaryToCourses(html, { subject: 'COM SCI', catalog: '0031', title: 'Introduction to Computer Science I' }, '27W', 'Winter 2027');
  assert.equal(out.length, 2);
  assert.equal(out[0].code, 'COM SCI 31');
  assert.equal(out[0].title, 'Introduction to Computer Science I (Lec 1)');
  assert.deepEqual(out[0].meetings, [{ day: 1, start: '16:00', end: '17:50' }, { day: 3, start: '16:00', end: '17:50' }]);
  assert.deepEqual(out[1].meetings, [{ day: 1, start: '18:00', end: '19:50' }, { day: 3, start: '18:00', end: '19:50' }]);
  assert.equal(out[0].location, 'Haines Hall 39');
  assert.equal(out[0].units, 4);
  assert.match(out[0].url ?? '', /class_id=187093200/);
});
