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

test('Caltech: "Course Cancelled" in the note drops the course, "Section 03 cancelled" drops only that section', () => {
  const f = (t: string) => `<font face="verdana">${t}</font>`;
  const html = [
    f('EE/MedE&nbsp;124'), f('3-0-6'), f('Mixed-mode Integrated Circuits'), f('<b><i>Course&nbsp;Cancelled</i></b>'), f('01'), f('Staff'), f('MW 10:30 - 11:55'),
    f('EE/Ma/CS 126A'), f('3-0-6'), f('Information Theory'), f('01'), f('Effros, M'), f('MW 10:30 - 11:55'),
    f('Ma 1a'), f('9-0-0'), f('Calculus'), f('Regular: Sections 1-2 // Section 03 cancelled'), f('01'), f('Doe, J'), f('MWF 09:00 - 09:55'), f('02'), f('Roe, R'), f('MWF 10:00 - 10:55'), f('03'), f('Poe, P'), f('MWF 11:00 - 11:55'),
    f('Bi 1'), f('9-0-0'), f('Biology'), f('Units (1.5-0-1.5) // Course cancelled // maximum enrollment: 24 students'), f('01'), f('Staff'), f('TR 13:00 - 14:25'),
  ].join('');
  const out = caltechToCourses(html, 'FA2026-27', 'Fall 2026');
  assert.deepEqual(out.map((c) => c.code), ['EE/Ma/CS 126A', 'Ma 1a', 'Ma 1a']);
  assert.deepEqual(out.filter((c) => c.code === 'Ma 1a').map((c) => c.meetings![0].start), ['09:00', '10:00']);
});
