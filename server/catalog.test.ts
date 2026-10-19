/**
 * 수업 목록 학기 — 날짜로 지금/다음 학기를 고르는지, 검색·학과 목록이 학기별로 나뉘는지.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CatalogCourse } from '@core/api/types';
import { catalogTermLabels, currentTerm, nextTerm, normalizeTermLabel, termLabel, termSlug } from '@core/lib/terms';
import { searchCatalog, catalogDepartments, catalogTerms, resolveCatalogTerm, courseTerm } from '@core/data/catalog/courses';
import type { User } from '@core/types';
import { searchCourses } from './ai-search';

const at = (iso: string) => new Date(`${iso}T12:00:00`);

test('current term is the one in session by date; next is the following regular term', () => {
  assert.deepEqual(catalogTermLabels(at('2026-10-12')), ['Fall 2026', 'Spring 2027']);
  assert.deepEqual(catalogTermLabels(at('2027-01-15')), ['Spring 2027', 'Fall 2027']);
  assert.deepEqual(catalogTermLabels(at('2027-05-20')), ['Spring 2027', 'Fall 2027']);
  assert.deepEqual(catalogTermLabels(at('2026-08-20')), ['Fall 2026', 'Spring 2027']);
  // 12월(가을 기말) 에도 가을 — 예전처럼 다음 봄으로 넘어가지 않는다
  assert.deepEqual(catalogTermLabels(at('2026-12-10')), ['Fall 2026', 'Spring 2027']);
  // 6~7월 방학엔 다가오는 가을
  assert.equal(termLabel(currentTerm(at('2026-07-01'))), 'Fall 2026');
  assert.deepEqual(nextTerm({ season: 'Spring', year: 2027 }), { season: 'Fall', year: 2027 });
});

test('term labels: legacy source codes read as "Fall 2026"; slugs for ids', () => {
  assert.equal(normalizeTermLabel('Fall 2026'), 'Fall 2026');
  assert.equal(normalizeTermLabel('2026 Fall'), 'Fall 2026');
  assert.equal(normalizeTermLabel('FA26'), 'Fall 2026');
  assert.equal(normalizeTermLabel('SP27'), 'Spring 2027');
  assert.equal(normalizeTermLabel('202630'), '202630');
  assert.equal(normalizeTermLabel('2026-2027 Autumn'), 'Autumn 2026', 'Stanford quarters: autumn is the first year');
  assert.equal(normalizeTermLabel('Autumn 2026-2027'), 'Autumn 2026', 'rows saved before the fix');
  assert.equal(normalizeTermLabel('2026-2027 Winter'), 'Winter 2027');
  assert.equal(normalizeTermLabel('202608'), 'Fall 2026', 'UMD term id');
  assert.equal(normalizeTermLabel('202701'), 'Spring 2027');
  assert.equal(normalizeTermLabel('202610'), '202610', 'a Banner code, not a month');
  assert.equal(termSlug('Spring 2027'), 'sp27');
  assert.equal(termSlug('Fall 2026'), 'fa26');
});

const course = (id: string, code: string, term: string, department = 'Mathematics'): CatalogCourse => ({
  id, schoolId: 's_berkeley', code, title: code, department, meetings: [{ day: 0, start: '10:00', end: '11:00' }], term,
});
const CATALOG: CatalogCourse[] = [
  course('cc_berkeley_math51', 'MATH 51', 'Fall 2026'),
  course('cc_berkeley_math51_sp27', 'MATH 51', 'Spring 2027'),
  course('cc_berkeley_math56_sp27', 'MATH 56', 'Spring 2027'),
  course('cc_berkeley_cs61a', 'CS 61A', 'Fall 2026', 'Computer Science'),
  course('cc_berkeley_cs61a_sp27', 'CS 61A', 'Spring 2027', 'Computer Science'),
  course('cc_berkeley_cs61b_sp27', 'CS 61B', 'Spring 2027', 'Computer Science'),
  course('cc_berkeley_ugba10', 'UGBA 10', 'Spring 2027', 'Haas'),
  { ...course('cc_cornell_cs1110', 'CS 1110', 'FA26', 'CS'), schoolId: 's_cornell' },
  { ...course('cc_stanford_cs106a', 'CS 106A', 'Autumn 2026', 'CS'), schoolId: 's_stanford' },
];

test('search filters by term; default is the current term', () => {
  const oct = at('2026-10-12');
  const term = resolveCatalogTerm(CATALOG, 's_berkeley', '', oct);
  assert.equal(term, 'Fall 2026');
  assert.deepEqual(searchCatalog(CATALOG, 's_berkeley', 'CS 61', 30, '', term).map((c) => c.id), ['cc_berkeley_cs61a']);
  assert.deepEqual(searchCatalog(CATALOG, 's_berkeley', 'CS 61', 30, '', 'Spring 2027').map((c) => c.id), ['cc_berkeley_cs61a_sp27', 'cc_berkeley_cs61b_sp27']);
  assert.deepEqual(searchCatalog(CATALOG, 's_berkeley', '', 30, 'Mathematics', 'Spring 2027').map((c) => c.code), ['MATH 51', 'MATH 56']);
  // 학기를 안 주면 (예전 호출) 두 학기 다
  assert.equal(searchCatalog(CATALOG, 's_berkeley', 'MATH 51').length, 2);
  // 1월엔 봄이 기본
  assert.equal(resolveCatalogTerm(CATALOG, 's_berkeley', '', at('2027-01-20')), 'Spring 2027');
  // 요청한 학기가 우선
  assert.equal(resolveCatalogTerm(CATALOG, 's_berkeley', 'Spring 2027', oct), 'Spring 2027');
});

test('departments and terms are per term; schools without the current term show everything', () => {
  assert.deepEqual(catalogDepartments(CATALOG, 's_berkeley', 'Fall 2026'), [{ name: 'Computer Science', count: 1 }, { name: 'Mathematics', count: 1 }]);
  assert.deepEqual(catalogDepartments(CATALOG, 's_berkeley', 'Spring 2027').map((d) => d.name), ['Computer Science', 'Haas', 'Mathematics']);
  assert.deepEqual(catalogTerms(CATALOG, 's_berkeley'), ['Fall 2026', 'Spring 2027']);
  // Cornell 옛 행(FA26)도 Fall 2026 으로 읽힌다
  assert.equal(courseTerm(CATALOG[7]), 'Fall 2026');
  assert.equal(resolveCatalogTerm(CATALOG, 's_cornell', '', at('2026-10-12')), 'Fall 2026');
  // 쿼터제(Stanford)는 가을을 Autumn 이라 부른다 — 지금 학기로 본다 (겨울·봄 쿼터와 섞이지 않게)
  assert.equal(resolveCatalogTerm(CATALOG, 's_stanford', '', at('2026-10-12')), 'Autumn 2026');
  assert.equal(searchCatalog(CATALOG, 's_stanford', 'CS', 30, '', '').length, 1);
});

test('Ask Lumi search_courses: current term by default, says which term, other term on request', () => {
  const viewer = { affiliation: { type: 'university', schoolId: 's_berkeley' } } as unknown as User;
  const oct = at('2026-10-12');
  const now = searchCourses(CATALOG, viewer, { query: 'CS 61' }, oct);
  assert.equal(now.term, 'Fall 2026');
  assert.deepEqual(now.terms, ['Fall 2026', 'Spring 2027']);
  assert.deepEqual(now.rows.map((r) => r.forModel.code), ['CS 61A']);
  assert.ok(now.rows.every((r) => r.forModel.term === 'Fall 2026' && r.card.term === 'Fall 2026'));
  const next = searchCourses(CATALOG, viewer, { query: 'CS 61', term: 'Spring 2027' }, oct);
  assert.equal(next.term, 'Spring 2027');
  assert.deepEqual(next.rows.map((r) => r.forModel.code), ['CS 61A', 'CS 61B']);
  // 없는 학기를 물으면 지어내지 않고 지금 학기로 찾고 알려 준다
  const missing = searchCourses(CATALOG, viewer, { query: 'CS 61', term: 'Fall 2027' }, oct);
  assert.equal(missing.term, 'Fall 2026');
  assert.equal(missing.requestedTermMissing, true);
  // 5월엔 아직 봄 학기
  assert.equal(searchCourses(CATALOG, viewer, { query: 'CS 61' }, at('2027-05-10')).term, 'Spring 2027');
});
