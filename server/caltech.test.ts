import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { caltechToCourses, resolveCourseSource } from './sources/courses';

test('Caltech schedule export: course, title, 24h meeting times; variable "+" units; times split over two cells', () => {
  const out = caltechToCourses(readFileSync(new URL('./fixtures/caltech-schedule.html', import.meta.url), 'utf8'), 'FA2026-27', 'Fall 2026');
  const by = (code: string) => out.find((c) => c.code === code)!;
  assert.equal(by('CS 024').title, 'Introduction to Computing Systems');
  assert.deepEqual(by('CS 024').meetings, [{ day: 0, start: '11:00', end: '11:55' }, { day: 2, start: '11:00', end: '11:55' }, { day: 4, start: '11:00', end: '11:55' }]);
  assert.deepEqual(by('HPS/H 173').meetings, [{ day: 3, start: '19:00', end: '21:55' }]);
  const f = (t: string) => `<font face="verdana">${t}</font>`;
  const syn = caltechToCourses([f('Ph 199'), f('+'), f('Special Topics'), f('01'), f('Doe, J'), f('OM,W 16:00 -'), f('16:55')].join(''), 'FA2026-27', 'Fall 2026');
  assert.deepEqual(syn.map((c) => [c.code, c.meetings]), [['Ph 199', [{ day: 2, start: '16:00', end: '16:55' }]]]);
  assert.ok(resolveCourseSource('s_caltech', 'caltech'));
});
