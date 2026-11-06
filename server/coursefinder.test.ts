/**
 * S029 "Add classes" — 검색(별칭·번호만·옛 번호·수업 번호), 학년 단계·학부생 기본값, 정렬, 겹침, "N on Lumi" 공개 규칙,
 * 학과 ★, 바깥 링크(학교별 설정), 수업 페이지 읽기, 목록 내려보내기.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CatalogCourse } from '@core/api/types';
import type { Course, User } from '@core/types';
import * as seed from '@core/data/seed.en';
import { browseCatalog, findCatalogRef, scoreCourse, searchCatalog } from '@core/data/catalog/courses';
import { courseLevel, findCourses, findOverlap, isCourseAdded, lumiCountLabel, lumiCounts, meetingLine, orderDepartments, overlapLine, timeRange, toggleFavorite } from '@core/lib/coursefinder';
import { berkeleySubject, berkeleytimeUrl, courseLinks, instructorNames, lectureSection, type SchoolCourseLinks } from '@core/lib/courseLinks';
import { codeSlug } from '@core/lib/classmates';
import { parseClassPage, createDetailsReader } from './sections';

const here = path.dirname(fileURLToPath(import.meta.url));
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TERM = 'Fall 2026';

let n = 0;
const cc = (code: string, title: string, over: Partial<CatalogCourse> = {}): CatalogCourse => ({
  id: `cc_${++n}`, schoolId: 's_berkeley', code, title, department: 'Electrical Engineering and Computer Sciences', term: TERM,
  meetings: [{ day: 0, start: '13:00', end: '13:59' }, { day: 2, start: '13:00', end: '13:59' }, { day: 4, start: '13:00', end: '13:59' }], ...over,
});
const CATALOG: CatalogCourse[] = [
  cc('CS 61A', 'The Structure and Interpretation of Computer Programs', { classNumber: '29147', instructor: 'John DeNero', url: 'https://classes.berkeley.edu/content/2026-fall-compsci-61a-001-lec-001' }),
  cc('CS 61B', 'Data Structures', { classNumber: '29150', meetings: [{ day: 0, start: '14:00', end: '14:59' }] }),
  cc('CS 161', 'Computer Security'),
  cc('CS 261', 'Security in Computer Systems'),
  cc('DATA C100', 'Principles and Techniques of Data Science', { department: 'Data Science' }),
  cc('DATA C8', 'Foundations of Data Science', { department: 'Data Science' }),
  cc('MATH 51', 'Calculus I (formerly MATH 1A) (Lec 001)', { department: 'Mathematics' }),
  cc('MATH 51', 'Calculus I (formerly MATH 1A) (Lec 002)', { department: 'Mathematics', id: 'cc_m51_002' }),
  cc('MATH 10A', 'Methods of Mathematics', { department: 'Mathematics' }),
  cc('POLSCI 1', 'Introduction to American Politics', { department: 'Political Science' }),
  cc('UGBA 10', 'Principles of Business', { department: 'Haas', instructor: 'Staff' }),
];
const codes = (list: CatalogCourse[]) => list.map((c) => c.code);

// ─── 검색 ────────────────────────────────────────────────────────────────────
test('search finds a class however a Berkeley student types it', () => {
  const top = (q: string) => findCourses(CATALOG, { q })[0]?.code;
  for (const q of ['cs61a', 'CS 61A', 'cs 61a', 'COMPSCI 61A', 'compsci61a', 'CompSci 61A']) assert.equal(top(q), 'CS 61A', q);
  assert.equal(top('61a'), 'CS 61A', 'the number alone');
  assert.equal(top('61b'), 'CS 61B');
  assert.equal(top('data c100'), 'DATA C100');
  assert.equal(top('c100'), 'DATA C100');
  assert.equal(top('math 1a'), 'MATH 51', 'the "formerly MATH 1A" alias still works');
  assert.equal(top('math1a'), 'MATH 51');
  assert.equal(top('29147'), 'CS 61A', 'the 5-digit class number from CalCentral');
  assert.deepEqual(codes(findCourses(CATALOG, { q: '29148' })), [], 'a class number matches exactly or not at all');
  assert.equal(top('pol sci 1'), 'POLSCI 1', 'the official two-word subject finds the short code');
  assert.equal(top('data structures'), 'CS 61B', 'by title');
  assert.equal(top('denero'), 'CS 61A', 'by instructor');
});

test('number-only search ranks the exact course number first, not every code containing it', () => {
  assert.deepEqual(codes(findCourses(CATALOG, { q: '61a' })), ['CS 61A']);
  assert.deepEqual(codes(findCourses(CATALOG, { q: '61' })).slice(0, 2), ['CS 61A', 'CS 61B']);
  assert.equal(scoreCourse(CATALOG[0], ''), 0);
});

test('the server search (searchCatalog) uses the same rules', () => {
  assert.equal(searchCatalog(CATALOG, 's_berkeley', 'COMPSCI 61A')[0].code, 'CS 61A');
  assert.equal(searchCatalog(CATALOG, 's_berkeley', '29147')[0].code, 'CS 61A');
  assert.equal(searchCatalog(CATALOG, 's_berkeley', 'MATH 1A')[0].code, 'MATH 51');
});

// ─── 학년 단계 ───────────────────────────────────────────────────────────────
test('level comes from the Berkeley course number', () => {
  assert.equal(courseLevel('CS 61A'), 'lower');
  assert.equal(courseLevel('DATA C100'), 'upper');
  assert.equal(courseLevel('CS 194-26'), 'upper');
  assert.equal(courseLevel('COLWRIT R1A'), 'lower');
  assert.equal(courseLevel('CS 261'), 'grad');
  assert.equal(courseLevel('PUBPOL 400'), 'grad');
  assert.equal(courseLevel('Lab seminar'), undefined);
  assert.deepEqual(codes(findCourses(CATALOG, { level: 'upper' })), ['CS 161', 'DATA C100']);
});

test('undergrads browsing don’t get graduate classes pushed at them, but can still search for one', () => {
  assert.ok(!codes(findCourses(CATALOG, { undergrad: true })).includes('CS 261'), 'browse: no grad classes by default');
  assert.ok(codes(findCourses(CATALOG, { undergrad: false })).includes('CS 261'), 'grad students see them');
  assert.ok(codes(findCourses(CATALOG, { undergrad: true, level: 'grad' })).includes('CS 261'), 'picking Graduate shows them');
  assert.equal(findCourses(CATALOG, { undergrad: true, q: 'CS 261' })[0].code, 'CS 261', 'typing the code finds it');
  assert.deepEqual(codes(findCourses(CATALOG, { undergrad: true, q: 'security' })), ['CS 161', 'CS 261'], 'equal matches: undergrad first');
});

// ─── 정렬 ────────────────────────────────────────────────────────────────────
test('sort: default / course code / name', () => {
  const dept = 'Data Science';
  assert.deepEqual(codes(findCourses(CATALOG, { dept })), ['DATA C8', 'DATA C100'], 'browse default = course code, numbers in numeric order');
  assert.deepEqual(codes(findCourses(CATALOG, { dept, sort: 'code' })), ['DATA C8', 'DATA C100']);
  assert.deepEqual(codes(findCourses(CATALOG, { dept, sort: 'name' })), ['DATA C8', 'DATA C100'], 'Foundations < Principles');
  assert.deepEqual(findCourses(CATALOG, { dept: 'Mathematics', sort: 'name' }).map((c) => c.title.slice(0, 10)), ['Calculus I', 'Calculus I', 'Methods of']);
  // searching: default keeps relevance, Course code re-orders
  assert.deepEqual(codes(findCourses(CATALOG, { q: 'computer' })), ['CS 61A', 'CS 161', 'CS 261', 'CS 61B'], 'title matches before a department-only match');
  assert.deepEqual(codes(findCourses(CATALOG, { q: 'data', sort: 'code' })), ['CS 61B', 'DATA C8', 'DATA C100']);
  assert.deepEqual(codes(findCourses(CATALOG, { q: 'data', sort: 'name' })).slice(0, 1), ['CS 61B'], 'Data Structures first by name');
});

// ─── 겹침 ────────────────────────────────────────────────────────────────────
const row = (code: string, day: number, start: string, end: string, extra: Partial<Course> = {}): Course => ({ id: `${code}_${day}`, name: `${code} Something`, code, term: TERM, day, start, end, hue: 1, ...extra });

test('overlap: first clash by day then time; touching edges and the same course don’t count', () => {
  const mine = [row('CS 61B', 0, '14:00', '14:59'), row('ECON 1', 1, '11:00', '12:29')];
  assert.equal(findOverlap(mine, [{ day: 0, start: '13:00', end: '13:59' }]), null, 'ends 13:59, next starts 14:00 — no clash');
  assert.equal(findOverlap(mine, [{ day: 0, start: '13:00', end: '14:00' }]), null, '14:00 end vs 14:00 start — touching, not overlapping');
  const o = findOverlap(mine, [{ day: 1, start: '12:00', end: '13:00' }, { day: 0, start: '14:30', end: '15:30' }]);
  assert.deepEqual(o, { label: 'CS 61B', day: 0, start: '14:30' }, 'Mon before Tue');
  assert.equal(overlapLine(findOverlap(mine, [{ day: 0, start: '13:30', end: '15:00' }])!, DAYS), 'Overlaps CS 61B · Mon 2 PM');
  assert.equal(findOverlap(mine, [{ day: 0, start: '14:00', end: '14:59' }], 'CS 61B'), null, 'previewing the class you already have');
  assert.equal(findOverlap([{ id: 'x', name: 'Lab seminar', day: 2, start: '09:00', end: '10:00', hue: 1 }], [{ day: 2, start: '09:30', end: '10:30' }])!.label, 'Lab seminar', 'hand-entered classes show by name');
});

test('already added: same name, or same code in the same term', () => {
  const c = CATALOG[0];
  assert.equal(isCourseAdded([row('CS 61A', 0, '13:00', '13:59')], c), true);
  assert.equal(isCourseAdded([row('CS 61A', 0, '13:00', '13:59', { term: 'Spring 2027' })], c), false, 'next term is a different class');
  assert.equal(isCourseAdded([row('CS 61B', 0, '13:00', '13:59')], c), false);
});

test('row text: days grouped by time, one AM/PM when both ends share it', () => {
  assert.equal(meetingLine(CATALOG[0].meetings, DAYS), 'Mon/Wed/Fri 1–1:59 PM');
  assert.equal(meetingLine([{ day: 1, start: '09:30', end: '10:59' }, { day: 3, start: '09:30', end: '10:59' }, { day: 4, start: '11:00', end: '12:29' }], DAYS), 'Tue/Thu 9:30–10:59 AM · Fri 11 AM–12:29 PM');
  assert.equal(timeRange('12:00', '12:59'), '12–12:59 PM');
});

// ─── N on Lumi ───────────────────────────────────────────────────────────────
const student = (id: string, timetable: Course[], extra: Partial<User> = {}, school = 's_berkeley', verified = true): User => {
  const base = structuredClone(seed.users.find((u) => u.id === 'u_jimin')!);
  return { ...base, id, sample: false, timetable, showToClassmates: undefined, ...extra, affiliation: { ...base.affiliation, schoolId: school, emailVerified: verified } as User['affiliation'] };
};

test('"N on Lumi": a count only, of opted-in verified real students at that school and term', () => {
  const users = [
    student('u_ana', [row('CS 61A', 0, '13:00', '13:59')]),
    student('u_ben', [row('CS 61A', 2, '13:00', '13:59'), row('CS 61A', 4, '13:00', '13:59')]),
    student('hidden', [row('CS 61A', 0, '13:00', '13:59')], { showToClassmates: false }),
    student('unverified', [row('CS 61A', 0, '13:00', '13:59')], {}, 's_berkeley', false),
    student('sample', [row('CS 61A', 0, '13:00', '13:59')], { sample: true }),
    student('stanford', [row('CS 61A', 0, '13:00', '13:59')], {}, 's_stanford'),
    student('spring', [row('CS 61A', 0, '13:00', '13:59', { term: 'Spring 2027' })]),
    student('u_cleo', [row('CS 61B', 0, '14:00', '14:59')]),
  ];
  const counts = lumiCounts(users, 's_berkeley', TERM);
  assert.deepEqual({ ...counts }, { cs61a: 2, cs61b: 1 }, 'hidden, unverified, sample, other school and other term are not counted; a student with two meetings counts once');
  const out = JSON.stringify(counts);
  assert.ok(users.every((u) => !out.includes(u.id) && !out.includes(u.nickname)) && Object.values(counts).every((v) => typeof v === 'number'), 'numbers only — no ids or names');
  assert.deepEqual(lumiCounts(users, 's_berkeley', 'Spring 2027'), { cs61a: 1 });
  assert.equal(lumiCountLabel(counts[codeSlug('CS 61A')]), '2 on Lumi');
  assert.equal(lumiCountLabel(counts[codeSlug('CS 161')]), null, 'nothing drawn under 1');
  assert.equal(lumiCountLabel(0), null);
});

// ─── 학과 ★ ─────────────────────────────────────────────────────────────────
test('department picker: favourites on top in starred order, then A–Z; search filters both', () => {
  const depts = [{ name: 'Mathematics' }, { name: 'Data Science' }, { name: 'Art Practice' }, { name: 'Electrical Engineering and Computer Sciences' }];
  assert.deepEqual(orderDepartments(depts, ['Mathematics', 'Data Science']).map((d) => d.name), ['Mathematics', 'Data Science', 'Art Practice', 'Electrical Engineering and Computer Sciences']);
  assert.deepEqual(orderDepartments(depts, ['Mathematics'], 'sci').map((d) => d.name), ['Data Science', 'Electrical Engineering and Computer Sciences']);
  assert.deepEqual(orderDepartments(depts, ['Gone Dept']).map((d) => d.name)[0], 'Art Practice', 'a starred department not offered this term is skipped');
  assert.deepEqual(toggleFavorite(['A'], 'B'), ['A', 'B']);
  assert.deepEqual(toggleFavorite(['A', 'B'], 'A'), ['B']);
});

// ─── 바깥 링크 ───────────────────────────────────────────────────────────────
test('Berkeleytime URL: official subject, capitalised term, 3-digit section, fallback to the term catalog', () => {
  const c61a = CATALOG[0];
  assert.equal(berkeleytimeUrl(c61a), 'https://berkeleytime.com/catalog/2026/Fall/COMPSCI/61A/001/1', 'CS → COMPSCI');
  assert.equal(berkeleytimeUrl({ ...c61a, term: 'spring 2027', url: 'https://classes.berkeley.edu/content/2027-spring-compsci-61a-002-lec-002' }), 'https://berkeleytime.com/catalog/2027/Spring/COMPSCI/61A/002/1');
  assert.equal(berkeleytimeUrl({ code: 'DATA C100', term: TERM, url: undefined }), 'https://berkeleytime.com/catalog/2026/Fall/DATA/C100/001/1', 'no class page → section 001');
  assert.equal(berkeleytimeUrl({ code: 'CS 194', term: TERM, url: 'https://classes.berkeley.edu/content/2026-fall-compsci-194-061a-lec-061a' }), 'https://berkeleytime.com/catalog/2026/Fall', 'a lettered section we haven’t checked → the catalog page');
  assert.equal(berkeleytimeUrl({ code: 'CHM ENG 140', term: TERM, url: undefined }), 'https://berkeleytime.com/catalog/2026/Fall', 'two-word subject → the catalog page');
  assert.equal(berkeleytimeUrl({ code: 'CS 61A', term: 'catalog', url: undefined }), 'https://berkeleytime.com/catalog', 'no real term → the catalog root');
  assert.equal(berkeleySubject('POLSCI 1'), null, 'POLSCI is "POL SCI" officially — two words, deep link not verified');
  assert.deepEqual(berkeleySubject('CS 61A'), { subject: 'COMPSCI', number: '61A' });
});

test('lecture section comes from the class page address', () => {
  assert.equal(lectureSection({ url: 'https://classes.berkeley.edu/content/2026-fall-compsci-61a-001-lec-001' }), '001');
  assert.equal(lectureSection({ url: 'https://classes.berkeley.edu/content/2026-fall-math-51-2-lec-2' }), '002', 'padded to 3 digits');
  assert.equal(lectureSection({ url: undefined }), '001');
  assert.equal(lectureSection({ url: 'https://classes.berkeley.edu/content/x-061a-lec-061a' }), null);
});

test('Rate My Professors: one link per real instructor, name URL-encoded, school id from config', () => {
  assert.deepEqual(instructorNames('Kay Ousterhout, John DeNero'), ['Kay Ousterhout', 'John DeNero']);
  assert.deepEqual(instructorNames('Staff'), []);
  assert.deepEqual(instructorNames('TBA'), []);
  assert.deepEqual(instructorNames(undefined), []);
  const links = courseLinks({ ...CATALOG[0], instructor: 'José Ñúñez, Staff' });
  assert.deepEqual(links.map((l) => l.kind), ['site', 'rmp']);
  assert.equal(links[1].url, 'https://www.ratemyprofessors.com/search/professors/1072?q=Jos%C3%A9%20%C3%91%C3%BA%C3%B1ez');
  assert.equal(links[1].name, 'José Ñúñez');
});

test('course links are per-school config: Berkeley both, unknown school none, RMP-only school only RMP', () => {
  const berkeley = courseLinks(CATALOG[0]);
  assert.deepEqual(berkeley.map((l) => [l.kind, l.label]), [['site', 'Berkeleytime'], ['rmp', 'Rate My Professors']]);
  assert.deepEqual(courseLinks({ ...CATALOG[0], schoolId: 's_stanford' }), [], 'no verified entry → nothing (no guessed URLs, no school-less RMP search)');
  const config: Record<string, SchoolCourseLinks> = { s_test: { rmpSchoolId: 42 } };
  const only = courseLinks({ ...CATALOG[0], schoolId: 's_test' }, config);
  assert.deepEqual(only.map((l) => l.url), ['https://www.ratemyprofessors.com/search/professors/42?q=John%20DeNero']);
  assert.deepEqual(courseLinks({ ...CATALOG[10] }).map((l) => l.kind), ['site'], '"Staff" gets no RMP link');
});

// ─── 수업 페이지 · 목록 ──────────────────────────────────────────────────────
test('class page: class number, requisites and class notes, as the school wrote them', () => {
  const d = parseClassPage(readFileSync(path.join(here, 'fixtures', 'berkeley-class-2026-fall-compsci-61a.html'), 'utf8'));
  assert.equal(d.classNumber, '29147');
  assert.deepEqual(d.requisites, ['Students not in the Master of Engineering Program']);
  assert.equal(d.notes?.[0], 'Time conflicts are allowed', 'bullets stripped, the full text (not the "show more" summary)');
  assert.equal(d.notes?.length, 6);
  assert.deepEqual(parseClassPage('<html></html>'), {}, 'nothing there → nothing invented');
});

test('details reader: Berkeley class pages only, remembered, falls back to the stored class number', async () => {
  let calls = 0;
  const read = createDetailsReader(async () => { calls++; return '<span>Class #:</span>12345'; });
  const c = { ...CATALOG[0], classNumber: '29147' };
  assert.deepEqual(await read(c), { classNumber: '12345' });
  await read(c);
  assert.equal(calls, 1, 'one request per class while fresh');
  assert.deepEqual(await read({ ...CATALOG[1], url: undefined }), { classNumber: '29150' }, 'no class page → just the stored number');
  assert.deepEqual(await read({ ...CATALOG[1], schoolId: 's_stanford', url: undefined, classNumber: undefined }), {});
});

test('browse list: one term, no attached sections or source ids; course lookup by id or code', () => {
  const all = [...CATALOG, cc('CS 61A', 'SICP', { term: 'Spring 2027', id: 'cc_sp', sourceId: '9', sections: [{ label: 'DIS 1', kind: 'DIS', meetings: [] }] })];
  const b = browseCatalog(all, 's_berkeley', 'Spring 2027');
  assert.deepEqual(b.map((c) => c.id), ['cc_sp']);
  assert.ok(!('sections' in b[0]) && !('sourceId' in b[0]));
  assert.equal(findCatalogRef(all, 's_berkeley', { id: 'cc_m51_002' })?.title, 'Calculus I (formerly MATH 1A) (Lec 002)');
  assert.equal(findCatalogRef(all, 's_berkeley', { code: 'cs 61a', term: 'Spring 2027' })?.id, 'cc_sp');
  assert.equal(findCatalogRef(all, 's_stanford', { code: 'CS 61A' }), undefined);
});
