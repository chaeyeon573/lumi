import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CatalogCourse } from '@core/api/types';
import { associatedIdFromPage, createSectionReader, parseAssociatedSections } from './sections';

const here = path.dirname(fileURLToPath(import.meta.url));
const fx = (f: string) => readFileSync(path.join(here, 'fixtures', f), 'utf8');
const ASSOC = 'berkeley-associated-sections-2026-fall-compsci-61a.html';

test('associated sections: real DIS/LAB rows with day, time and room; placeholders dropped', () => {
  const s = parseAssociatedSections(fx(ASSOC));
  assert.deepEqual(s.map((x) => x.label), ['DIS 101', 'DIS 118', 'LAB 119L'], 'the 999 / 999L placeholders (Sunday 12:00–12:01 am) are not sections anyone attends');
  assert.deepEqual(s.find((x) => x.label === 'DIS 118'), { label: 'DIS 118', kind: 'DIS', meetings: [{ day: 3, start: '12:30', end: '13:59' }], location: 'Dwinelle 189' });
  assert.deepEqual(s.find((x) => x.label === 'LAB 119L')!.meetings, [{ day: 1, start: '18:30', end: '19:59' }]);
});

test('class page → the id its Associated Sections box loads', () => {
  const page = '<div class="detail-class-associated-sections"\n                data-element="associated_sections"\n                data-section-id="517627">';
  assert.equal(associatedIdFromPage(page), '517627');
  assert.equal(associatedIdFromPage('<div data-section-id="29147">'), undefined, 'the textbook box also has a data-section-id (the class number) — not that one');
});

const course = (over: Partial<CatalogCourse> = {}): CatalogCourse => ({ id: 'cc_berkeley_cs61a', schoolId: 's_berkeley', code: 'CS 61A', title: 'SICP', department: 'EECS', meetings: [], term: 'Fall 2026', url: 'https://classes.berkeley.edu/content/2026-fall-compsci-61a-001-lec-001', ...over });

test('section reader: uses the stored id, else the class page; one request per class while fresh; other schools get nothing', async () => {
  const calls: string[] = [];
  let t = 0;
  const read = createSectionReader(async (url) => {
    calls.push(url);
    if (url.includes('/sections/associated/')) return fx(ASSOC);
    return '<div data-element="associated_sections" data-section-id="517627"></div>';
  }, () => t);

  assert.equal((await read(course({ sourceId: '517627' }))).length, 3);
  assert.deepEqual(calls, ['https://classes.berkeley.edu/sections/associated/517627']);
  await read(course({ sourceId: '517627' }));
  assert.equal(calls.length, 1, 'remembered');

  calls.length = 0;
  const old = course({ id: 'cc_berkeley_cs61a_old' });
  assert.equal((await read(old)).length, 3);
  assert.deepEqual(calls, [old.url, 'https://classes.berkeley.edu/sections/associated/517627'], 'catalog rows from before sourceId: read the id off the class page');

  calls.length = 0;
  assert.deepEqual(await read(course({ id: 'cc_stanford_cs106a', schoolId: 's_stanford', sourceId: '1' })), []);
  assert.equal(calls.length, 0);

  t += 7 * 3_600_000;
  await read(course({ sourceId: '517627' }));
  assert.equal(calls.length, 1, 'read again after 6 hours');
});

test('section reader: a failed read is an empty list (the class still adds), retried after 10 minutes', async () => {
  let fail = true; let t = 0; let n = 0;
  const read = createSectionReader(async () => { n++; if (fail) throw new Error('504'); return fx(ASSOC); }, () => t);
  assert.deepEqual(await read(course({ sourceId: '517627' })), []);
  fail = false;
  assert.deepEqual(await read(course({ sourceId: '517627' })), [], 'not hammering the school site');
  t += 11 * 60_000;
  assert.equal((await read(course({ sourceId: '517627' }))).length, 3);
  assert.equal(n, 2);
});
