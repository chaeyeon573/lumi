import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cmuToCourses, resolveCourseSource } from './sources/courses';

test('CMU Schedule of Classes: lectures (recitations left out), extra meeting rows, 12h→24h, graduate courses', () => {
  const out = cmuToCourses(readFileSync(new URL('./fixtures/cmu-soc.html', import.meta.url), 'utf8'), 'F26', 'Fall 2026');
  const by = (code: string) => out.filter((c) => c.code === code);
  assert.deepEqual(by('15-122').map((c) => c.title), ['Principles of Imperative Computation (Lec 1)', 'Principles of Imperative Computation (Lec 2)']);
  assert.deepEqual(by('15-122')[0].meetings, [{ day: 1, start: '09:30', end: '10:50' }, { day: 3, start: '09:30', end: '10:50' }, { day: 1, start: '19:00', end: '20:20' }]);
  assert.deepEqual(by('10-701')[0].meetings, [{ day: 0, start: '14:00', end: '15:20' }, { day: 2, start: '14:00', end: '15:20' }, { day: 4, start: '14:00', end: '15:20' }]);
  assert.ok(by('76-101').length > 1); // no lecture: every lettered section is the class
  assert.ok(resolveCourseSource('s_cmu', 'cmu'));
});

test('CMU: sections marked "This Section Cancelled" are left out', () => {
  const td = (x: string) => `<td>${x}</td>`;
  const row = (t: string) => `<tr>${td('<a onclick="x(\'/SOC/SOCServlet/courseDetails?COURSE=53607&SEMESTER=F26\')">53607</a>')}${td(t)}${td('12')}${td('A')}${td('')}${td('MWF')}${td('03:00PM')}${td('05:50PM')}${td('Pittsburgh')}${td('In person')}</tr>`;
  assert.equal(cmuToCourses(`<tbody>${row('ETC Interdisciplinary Project II This Section Cancelled')}</tbody>`, 'F26', 'Fall 2026').length, 0);
  assert.equal(cmuToCourses(`<tbody>${row('ETC Interdisciplinary Project II')}</tbody>`, 'F26', 'Fall 2026').length, 1);
});
