/**
 * 수업 검색 — 바뀐 과목 번호("formerly MATH 1A")로도 찾는다 (S029 Add a class).
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CatalogCourse } from '@core/api/types';
import { searchCatalog } from '@core/data/catalog/courses';

const c = (id: string, code: string, title: string): CatalogCourse => ({ id, schoolId: 's_berkeley', code, title, department: code.split(' ')[0], meetings: [{ day: 1, start: '09:30', end: '11:00' }] } as CatalogCourse);
const list = [
  c('m51', 'MATH 51', 'Calculus I (formerly MATH 1A)'),
  c('m1a', 'MATH 10A', 'Methods of Mathematics'),
  c('m52', 'MATH 52', 'Calculus II (formerly MATH 1B)'),
];

test('catalog search finds a renumbered course by its old code', () => {
  assert.equal(searchCatalog(list, 's_berkeley', 'MATH 1A')[0].id, 'm51');
  assert.equal(searchCatalog(list, 's_berkeley', 'math1b')[0].id, 'm52');
  // the current code still wins
  assert.equal(searchCatalog(list, 's_berkeley', 'MATH 51')[0].id, 'm51');
  assert.equal(searchCatalog(list, 's_berkeley', 'calculus').length, 2);
});
