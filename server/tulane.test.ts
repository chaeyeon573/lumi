import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tulaneResultsToCourses, tulaneHasPage } from './sources/courses';

const html = readFileSync(new URL('./fixtures/tulane-cmps-spring2027.html', import.meta.url), 'utf8');

test('Tulane results page: lecture sections with days/times, lab sections left out, section label when a course has several', () => {
  const out = tulaneResultsToCourses(html, 'Spring 2027');
  // 15 blocks on the page: CMPS 1501 / 1601 are lab-only sections (Laboratory) and are left out
  assert.ok(out.every((c) => c.code !== 'CMPS 1501' && c.code !== 'CMPS 1601'));
  const c1100 = out.find((c) => c.code === 'CMPS 1100');
  assert.ok(c1100);
  assert.equal(c1100.title, 'Foundations of Programming');
  assert.deepEqual(c1100.meetings, [{ day: 0, start: '13:00', end: '13:50' }, { day: 2, start: '13:00', end: '13:50' }, { day: 4, start: '13:00', end: '13:50' }]);
  assert.equal(c1100.term, 'Spring 2027');
  assert.equal(c1100.termCode, '202710');
  const s01 = out.find((c) => c.code === 'CMPS 1500' && c.title.endsWith('(Sec 01)'));
  assert.ok(s01, 'CMPS 1500 has three sections, so each title carries its section');
  assert.equal(s01.meetings[0].start, '11:00');
  assert.equal(s01.units, 4);
  assert.equal(s01.url, 'https://classschedule.tulane.edu/Results.aspx?course=CMPS1500');
  assert.equal(new Set(out.map((c) => c.id)).size, out.length);
});

test('Tulane pager: page links are found', () => {
  assert.equal(tulaneHasPage(html, 2), true);
  assert.equal(tulaneHasPage(html, 9), false);
});

test('Tulane raw server HTML (single-quoted attributes, &#39; in pager links) reads the same way', () => {
  const raw = readFileSync(new URL('./fixtures/tulane-raw-a-spring2027.html', import.meta.url), 'utf8');
  const out = tulaneResultsToCourses(raw, 'Spring 2027');
  assert.ok(out.length >= 10, `read ${out.length}`);
  const a = out.find((c) => c.code === 'ACCN 2010');
  assert.ok(a);
  assert.match(a.title, /^Financial Accounting \(Sec \d+\)$/);
  assert.ok(a.meetings.length > 0 && a.meetings.every((m) => /^\d{2}:\d{2}$/.test(m.start)));
  assert.equal(tulaneHasPage(raw, 2), true);
});
