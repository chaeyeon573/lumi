import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { rochesterToCourses } from './sources/courses';

test('Rochester CDCS (CSC lectures, Fall 2026): days, times like "450 PM", instructor', () => {
  const out = rochesterToCourses(readFileSync(new URL('./fixtures/rochester-csc.html', import.meta.url), 'utf8'), 'Fall 2026');
  const c = out.find((x) => x.code === 'CSC 160');
  assert.equal(c?.title, 'AI for All');
  assert.equal(c?.term, 'Fall 2026');
  assert.deepEqual(c?.meetings, [{ day: 1, start: '16:50', end: '18:05' }, { day: 3, start: '16:50', end: '18:05' }]);
  assert.equal(c?.instructor, 'Adam Purtee');
  assert.deepEqual(out.find((x) => x.code === 'CSC 239')?.meetings, [{ day: 0, start: '09:00', end: '10:15' }, { day: 2, start: '09:00', end: '10:15' }]);
});
