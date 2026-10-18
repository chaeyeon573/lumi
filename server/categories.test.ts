/**
 * 분류 — 한 공고가 여러 칸에 들어가는지 (연구 장학금 = 연구 + 장학금), 칩·AI 검색·For you가 같은 분류를 쓰는지,
 * 학교 행사 목록의 동아리 모임이 그 동아리로 이어지는지, 수업 목록 → 시간표 변환.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Snapshot } from '@core/api/types';
import type { Opportunity, Organization } from '@core/types';
import * as seed from '@core/data/seed.en';
import { categoriesOf, eventKindsOf, inCategory, isOfType, listingsOfOrg, orgLinker, orgOfListing, regionsOf } from '@core/lib/listings';
import { coursesFromCatalog, clashesWith, hasCatalogCourse } from '@core/lib/timetable';
import { forYou } from '@core/lib/foryou';
import { recommendFor, searchListings } from './ai-search';

const me = seed.users.find((u) => u.id === 'u_me')!;
const SCHOOL = me.affiliation.type === 'university' ? me.affiliation.schoolId ?? '' : '';
const opp = (id: string, type: Opportunity['type'], title: string, tags: string[] = [], extra: Partial<Opportunity> = {}): Opportunity => ({
  id, type, title, tags, host: id, description: '', cover: { emoji: '', hue: 0 }, eligibility: '', sourceUrl: '', sourceLabel: '', interests: [], goals: [],
  lastVerified: '2026-10-01', qna: [], reviews: [], createdAt: '2026-09-01T00:00:00Z', ...extra,
});
const org = (id: string, name: string, schoolId = SCHOOL): Organization => ({
  id, name, schoolId, description: 'A student group that meets weekly.', logo: { emoji: '', hue: 0 }, type: 'club', verified: false,
  gallery: [], regularActivities: [], notices: [], followerIds: [], memberIds: [], adminIds: [], applicantIds: [],
});

// 실서버 데이터에서 가져온 모양 그대로
const SURF = opp('surf', 'scholarship', 'SURF L&S — Summer Undergraduate Research Fellowship 2027', ['research', 'summer', 'stipend'], { schoolId: SCHOOL });
const UROC = opp('uroc', 'lab', 'UROC Academic Year Research Funding Awards', ['research', 'funding'], { schoolId: SCHOOL });
const GSR = opp('gsr', 'lab', 'Graduate Student Researcher (GSR) appointments', ['graduate', 'GSR', 'research'], { schoolId: SCHOOL });
const HERTZ = opp('hertz', 'scholarship', 'Hertz Fellowship', ['graduate', 'fellowship', 'STEM', 'national']);
const CAA = opp('caa', 'scholarship', 'Cal Alumni Association — Leadership Award & Achievement Award', ['scholarship', 'leadership'], { schoolId: SCHOOL });
const BIGIDEAS = opp('bigideas', 'startup', 'Big Ideas Contest — pre-proposal round (fall)', ['social impact', 'startup', 'teams'], { schoolId: SCHOOL });
const SKYDECK = opp('skydeck', 'startup', 'Berkeley SkyDeck Accelerator — Batch 24', ['startup', 'accelerator', 'funding'], { schoolId: SCHOOL });
const ABROAD = opp('abroad', 'exchange', 'Berkeley Study Abroad — Summer 2027 & Global Internships', ['study abroad', 'exchange', 'internship'], { schoolId: SCHOOL });
const FAIR = opp('fair', 'event', 'Berkeley Career Engagement — Career Fairs (Engineering & Tech)', ['career fair', 'internship', 'recruiting'], { schoolId: SCHOOL, date: '2026-10-20' });
const COLLOQ = opp('colloq', 'event', 'EECS Colloquium with Partha Ranganathan', ['event', 'free food', 'talk', 'academic', 'lectures'], { schoolId: SCHOOL, date: '2026-10-14' });
const GAMES = opp('games', 'event', 'Board Games Weekly Game Nights', ['event', 'social'], { schoolId: SCHOOL, date: '2026-10-15', host: 'Board Games at Berkeley 💙' });
const MEETING = opp('meeting', 'event', 'VSA General Meeting 10/15/26', ['event'], { schoolId: SCHOOL, date: '2026-10-16', host: 'Vietnamese Student Association' });
const SWE = opp('swe', 'internship', 'Software Engineer Intern', ['internship'], { field: 'Software' });
const ALL = [SURF, UROC, GSR, HERTZ, CAA, BIGIDEAS, SKYDECK, ABROAD, FAIR, COLLOQ, GAMES, MEETING, SWE];

test('an item can sit in more than one category', () => {
  assert.deepEqual(categoriesOf(SURF).sort(), ['research', 'scholarship']);       // research fellowship → also Research & RA
  assert.deepEqual(categoriesOf(UROC).sort(), ['research', 'scholarship']);       // research funding award → also Scholarships
  assert.deepEqual(categoriesOf(GSR), ['research']);                              // a job, not funding
  assert.deepEqual(categoriesOf(HERTZ), ['scholarship']);                          // fellowship with no research in it stays put
  assert.deepEqual(categoriesOf(CAA), ['scholarship']);
  assert.deepEqual(categoriesOf(BIGIDEAS).sort(), ['hackathon', 'startup']);      // a contest → Hackathons & competitions
  assert.deepEqual(categoriesOf(SKYDECK), ['startup']);
  assert.deepEqual(categoriesOf(ABROAD).sort(), ['exchange', 'internship']);
  assert.deepEqual(categoriesOf(FAIR), ['event']);                                 // a career fair is an event, not an internship
  assert.deepEqual(categoriesOf(COLLOQ).sort(), ['event', 'free_food']);
  assert.deepEqual(categoriesOf(opp('a', 'activity', 'Coffee')), []);
});

test('event sub-kinds come only from tags and titles in the data', () => {
  assert.deepEqual(eventKindsOf(COLLOQ), ['talk', 'free_food']);
  assert.deepEqual(eventKindsOf(GAMES), ['social']);
  assert.deepEqual(eventKindsOf(FAIR), ['career']);
  assert.deepEqual(eventKindsOf(MEETING), []);
  assert.deepEqual(eventKindsOf(SWE), []);
});

test('type lookups follow the categories', () => {
  assert.ok(isOfType(SURF, 'lab'));
  assert.ok(isOfType(UROC, 'scholarship'));
  assert.ok(!isOfType(GSR, 'scholarship'));
  assert.ok(isOfType(BIGIDEAS, 'hackathon'));
  assert.ok(inCategory(COLLOQ, 'free_food') && !inCategory(GAMES, 'free_food'));
});

const db = (opportunities: Opportunity[], organizations: Organization[] = []): Snapshot => structuredClone({
  users: seed.users, schools: seed.schools, organizations, activities: [], participations: [], posts: [], relationships: seed.relationships, proposals: [],
  chatRooms: [], notifications: [], reports: [], opportunities, opportunityIntents: [], timePolls: [], games: [],
});

test('Ask Lumi search uses the same categories as the chips', () => {
  const d = db(ALL);
  const ids = (types: Opportunity['type'][], extra: { free_food?: boolean } = {}) => searchListings(d, me, '2026-10-12', { types, limit: 15, ...extra }).map((r) => r.card.id).sort();
  assert.deepEqual(ids(['scholarship']), ['caa', 'hertz', 'surf', 'uroc']);
  assert.deepEqual(ids(['lab']), ['gsr', 'surf', 'uroc']);
  assert.deepEqual(ids(['hackathon']), ['bigideas']);
  assert.deepEqual(ids([], { free_food: true }), ['colloq']);
});

test('For you type filter uses the same categories', () => {
  const recs = forYou(db(ALL), me, { types: ['scholarship'], now: new Date('2026-10-12T18:00:00Z'), mix: false }).map((r) => r.id).sort();
  assert.ok(recs.includes('uroc') && recs.includes('surf') && !recs.includes('gsr'), recs.join(','));
});

test('Ask Lumi recommendations list an item in two categories only once', () => {
  const ids = recommendFor(db(ALL), me, { limit: 10 }).map((r) => r.card.id);
  assert.equal(new Set(ids).size, ids.length, ids.join(','));
});

test('club meetings from the campus calendar link to the club by name', () => {
  const vsa = org('o_vsa', 'Vietnamese Student Association');
  const games = org('o_games', 'Board Games at Berkeley 💙');
  const elsewhere = org('o_vsa2', 'Vietnamese Student Association', 's_other');
  const orgs = [elsewhere, vsa, games];
  assert.equal(orgOfListing(MEETING, orgs)?.id, 'o_vsa');                          // same school, not the namesake elsewhere
  assert.equal(orgOfListing({ ...GAMES, host: 'Board Games at Berkeley' }, orgs)?.id, 'o_games'); // emoji/punctuation don't matter
  assert.equal(orgOfListing(SWE, orgs), undefined);                                 // no school → never guessed
  assert.equal(orgOfListing({ ...MEETING, orgId: 'o_games' }, orgs)?.id, 'o_games'); // explicit orgId wins
  const link = orgLinker(orgs);
  assert.equal(link(MEETING)?.id, 'o_vsa');
  assert.deepEqual(listingsOfOrg(vsa, ALL).map((o) => o.id), ['meeting']);
});

test('adding a class from the catalog makes one timetable row per meeting', () => {
  const c = { id: 'k1', schoolId: SCHOOL, code: 'COMPSCI 61A', title: 'Structure and Interpretation of Computer Programs', department: 'Computer Science', instructor: 'DeNero', location: 'Wheeler 150', term: 'Fall 2026', meetings: [{ day: 0, start: '13:00', end: '14:00' }, { day: 2, start: '13:00', end: '14:00' }] };
  const rows = coursesFromCatalog(c, 200);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows.map((r) => [r.day, r.start, r.end, r.room, r.professor, r.hue]), [[0, '13:00', '14:00', 'Wheeler 150', 'DeNero', 200], [2, '13:00', '14:00', 'Wheeler 150', 'DeNero', 200]]);
  assert.ok(rows[0].id !== rows[1].id);
  assert.ok(hasCatalogCourse(rows, c));
  assert.equal(clashesWith([{ ...rows[0], id: 'x', name: 'Other', start: '13:30', end: '15:00' }], c).length, 1);
  assert.equal(clashesWith([{ ...rows[0], id: 'x', name: 'Other', start: '14:00', end: '15:00' }], c).length, 0);
});

test('a hackathon that already started stays listed until its submission deadline', () => {
  const live = opp('live', 'hackathon', 'All you can do with AI', ['hackathon', 'online'], { date: '2026-10-07T12:00:00.000Z', deadline: '2026-10-20T23:59:00.000Z', rolesNeeded: ['developer'] });
  const over = opp('over', 'event', 'Yesterday talk', ['event', 'talk'], { schoolId: SCHOOL, date: '2026-10-11' });
  const ids = forYou(db([live, over]), me, { now: new Date('2026-10-12T18:00:00Z'), mix: false }).map((r) => r.id);
  assert.ok(ids.includes('live') && !ids.includes('over'), ids.join(','));
  assert.deepEqual(searchListings(db([live, over]), me, '2026-10-12', { types: ['hackathon'] }).map((r) => r.card.id), ['live']);
});

test('"free food today" finds events later today (ISO times compared as campus dates)', () => {
  // 오후 3시(PT) 행사 = 2026-10-15T22:00Z — 예전엔 'to: 2026-10-15' 보다 큰 문자열이라 빠졌다
  const food = opp('food', 'event', 'Open source meetup', ['event', 'free food'], { schoolId: SCHOOL, date: '2026-10-15T22:00:00.000Z', startTime: '15:00' });
  const late = opp('late', 'event', 'Late talk', ['event', 'free food'], { schoolId: SCHOOL, date: '2026-10-16T04:30:00.000Z', startTime: '21:30' }); // 같은 날 PT 밤
  const ids = searchListings(db([food, late]), me, '2026-10-15', { free_food: true, from: '2026-10-15', to: '2026-10-15' }).map((r) => r.card.id).sort();
  assert.deepEqual(ids, ['food', 'late']);
});

test('internship region "Remote" — only remote a US student can take (not "Berlin · Remote")', () => {
  const r = (location: string, remote = false) => regionsOf({ location, remote, description: '', type: 'internship' } as Opportunity);
  assert.deepEqual(r('Remote'), ['Remote']);
  assert.deepEqual(r('Remote, US'), ['Remote']);
  assert.deepEqual(r('Foster City, CA · Remote'), ['Bay Area', 'Remote']);
  assert.deepEqual(r('New York, NY (HQ) · Remote'), ['New York', 'Remote']);
  assert.deepEqual(r('Denver, CO · Remote'), ['Remote']);
  assert.deepEqual(r('Remote · Portland, United States'), ['Remote']);
  assert.deepEqual(r('Berlin · Remote'), []);
  assert.deepEqual(r('Belgrade · Remote'), []);
  assert.deepEqual(r('London, UK', true), []);
  assert.deepEqual(r('San Francisco, CA', true), ['Bay Area', 'Remote']);
});
