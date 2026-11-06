import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { wustlToCourses, resolveCourseSource } from './sources/courses';

test('WashU class schedule search: sections with days/times, 12h→24h, graduate courses, only the asked term', () => {
  const html = readFileSync(new URL('./fixtures/wustl-schedule.html', import.meta.url), 'utf8');
  const out = wustlToCourses(html, '2026 Fall', 'Fall 2026');
  const by = (code: string) => out.filter((c) => c.code === code);
  assert.equal(by('SDS 5521')[0].title, 'Advanced Linear Models I');
  assert.deepEqual(by('SDS 5521')[0].meetings, [{ day: 1, start: '13:00', end: '14:20' }, { day: 3, start: '13:00', end: '14:20' }]);
  assert.deepEqual(by('PUBHLTHSOC 4000')[0].meetings, [{ day: 4, start: '08:30', end: '09:50' }]);
  assert.equal(wustlToCourses(html, '2027 Spring', 'Spring 2027').length, 0);
  assert.ok(resolveCourseSource('s_wustl', 'wustl'));
});

test('WashU: lettered sections (A, B, C = discussions) are left out when numbered lecture sections exist (CLASSICS 3010, Spring 2027)', () => {
  const html = readFileSync(new URL('./fixtures/wustl-classics3010.html', import.meta.url), 'utf8');
  const out = wustlToCourses(html, '2027 Spring', 'Spring 2027');
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].meetings, [{ day: 0, start: '15:00', end: '15:50' }, { day: 2, start: '15:00', end: '15:50' }]);
});
