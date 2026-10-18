/**
 * For you 추천 — 관심사대로 고르는지, 이유가 맞는지, 지원한 것·대상 아닌 것은 빼는지.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Opportunity, Organization, User } from '@core/types';
import * as seed from '@core/data/seed.en';
import { forYou, interestProfile, parseAsk, scoreListings, topicsOfText, whyLine } from '@core/lib/foryou';

const NOW = new Date('2026-10-12T18:00:00Z');
const base = seed.users.find((u) => u.id === 'u_me')!;
const person = (dept: string, p: Partial<User> = {}): User => structuredClone({
  ...base, id: 'u_t', bio: '', likes: '', freeTime: '', nowWant: '', prompts: [], hotTake: undefined, goals: [], interests: [], canOffer: [], lookingFor: [], interestedOrgIds: [], ...p,
  affiliation: { ...base.affiliation, department: dept, role: 'undergraduate' },
} as User);
const opp = (id: string, type: Opportunity['type'], title: string, extra: Partial<Opportunity> = {}): Opportunity => ({
  id, type, title, host: id, description: '', cover: { emoji: '', hue: 0 }, eligibility: '', sourceUrl: '', sourceLabel: '', tags: [], interests: [], goals: [],
  lastVerified: '2026-10-01', qna: [], reviews: [], createdAt: '2026-09-01T00:00:00Z', ...extra,
});
const club = (id: string, name: string, description: string, extra: Partial<Organization> = {}): Organization => ({
  id, name, description, logo: { emoji: '', hue: 0 }, type: 'club', schoolId: base.affiliation.type === 'university' ? base.affiliation.schoolId ?? '' : '', verified: false,
  gallery: [], regularActivities: [], notices: [], followerIds: [], memberIds: [], adminIds: [], applicantIds: [], ...extra,
});
const snap = (opportunities: Opportunity[], organizations: Organization[] = [], intents: { userId: string; opportunityId: string; intent: 'interested' | 'applied'; saved: boolean }[] = []) => ({
  opportunities, organizations, schools: seed.schools, relationships: structuredClone(seed.relationships),
  opportunityIntents: intents.map((i, n) => ({ id: `i${n}`, createdAt: '2026-10-10T00:00:00Z', ...i })),
});

const ITEMS = [
  opp('swe', 'internship', 'Software Engineer Intern', { field: 'Software', location: 'San Francisco, CA' }),
  opp('ib', 'internship', 'Investment Banking Summer Analyst', { field: 'Finance & Consulting', location: 'New York, NY' }),
  opp('hack', 'hackathon', 'AI Hackathon', { tags: ['hackathon', 'online', 'Machine Learning/AI'], deadline: '2026-10-20T06:59:00Z' }),
  opp('bio', 'lab', 'Neuroscience research assistant', { description: 'Clinical neuroscience lab' }),
  opp('gone', 'internship', 'Software Engineer Intern (closed)', { field: 'Software', deadline: '2026-10-01T00:00:00Z' }),
];
const CLUBS = [club('c_code', 'Codeology', 'We build software projects and teach web development.'), club('c_hike', 'Cal Hiking and Outdoor Society', 'Hiking, camping and backpacking trips most weekends.'), club('c_fin', 'Undergraduate Finance Association', 'Investment banking and finance recruiting.')];

test('topic matching avoids look-alike words', () => {
  assert.equal(topicsOfText('learn language skills').outdoors, undefined); // "skill" is not skiing
  assert.equal(topicsOfText('surface chemistry').outdoors, undefined);
  assert.ok(topicsOfText('weekend hiking trips').outdoors);
  assert.equal(topicsOfText('Summer Global Internships info sessions are running now.').sports, undefined); // "running now" is not jogging
  assert.ok(topicsOfText('Easy 5k running group').sports);
});

test('a CS student gets software first; a Haas student gets finance first', () => {
  const s = snap(ITEMS, CLUBS);
  const cs = forYou(s, person('Computer Science', { goals: ['internship'] }), { now: NOW, mix: false });
  assert.equal(cs[0].id, 'swe');
  assert.match(whyLine(cs[0].reasons), /major/i);
  const haas = forYou(s, person('Business (Haas)', { goals: ['internship'] }), { now: NOW, types: ['internship'], mix: false });
  assert.equal(haas[0].id, 'ib');
  const clubs = forYou(s, person('Business (Haas)'), { now: NOW, types: ['club'], mix: false });
  assert.equal(clubs[0].id, 'c_fin');
});

test('free-text likes pull in matching clubs', () => {
  const r = forYou(snap(ITEMS, CLUBS), person('Psychology', { likes: 'hiking and camping on weekends' }), { now: NOW, types: ['club'], mix: false });
  assert.equal(r[0].id, 'c_hike');
  assert.match(whyLine(r[0].reasons), /outdoors/i);
});

test('what you save changes what comes next, and says so', () => {
  const me = person('Psychology');
  const before = forYou(snap(ITEMS, CLUBS), me, { now: NOW, types: ['internship', 'lab', 'hackathon'], mix: false });
  const after = forYou(snap([...ITEMS, opp('ml', 'internship', 'Machine Learning Intern', { field: 'Data & AI' })], CLUBS, [{ userId: me.id, opportunityId: 'hack', intent: 'interested', saved: true }]), me, { now: NOW, types: ['internship'], mix: false });
  assert.notEqual(before[0]?.id, 'ml');
  assert.equal(after[0].id, 'ml');
  assert.match(whyLine(after[0].reasons), /AI Hackathon/);
});

test('applied, closed and wrong-audience items are left out; joined clubs too', () => {
  const me = person('Computer Science', { goals: ['internship'] });
  const grad = opp('phd', 'internship', 'PhD Research Intern', { field: 'Research & Science' });
  const s = snap([...ITEMS, grad], [...CLUBS.map((c) => (c.id === 'c_code' ? { ...c, memberIds: [me.id] } : c))], [{ userId: me.id, opportunityId: 'swe', intent: 'applied', saved: false }]);
  const ids = forYou(s, me, { now: NOW }).map((r) => r.id);
  for (const gone of ['swe', 'gone', 'phd', 'c_code']) assert.ok(!ids.includes(gone), gone);
  assert.equal(scoreListings(s, me, ITEMS, NOW).get('gone'), null);
});

test('no signal → still a sensible list (deadline-first), no made-up interest reasons', () => {
  const r = forYou(snap(ITEMS, CLUBS), person(''), { now: NOW, mix: false });
  assert.ok(interestProfile(snap(ITEMS, CLUBS), person('')).cold);
  assert.equal(r[0].id, 'hack');
  assert.ok(r.every((x) => x.reasons.every((y) => y.kind !== 'topic' && y.kind !== 'major')));
});

test('mixing keeps one kind from filling the whole top', () => {
  const many = Array.from({ length: 12 }, (_, i) => opp(`swe${i}`, 'internship', `Software Engineer Intern ${i}`, { field: 'Software', host: `Co${i}` }));
  const r = forYou(snap([...many, ...ITEMS], CLUBS), person('Computer Science', { goals: ['internship', 'hackathon'] }), { now: NOW, limit: 6 });
  assert.ok(new Set(r.map((x) => x.type)).size >= 2);
});

test('what the student says leads: a CS student asking for finance gets finance, not software', () => {
  const me = person('Computer Science', { goals: ['internship'] });
  const r = forYou(snap(ITEMS, CLUBS), me, { now: NOW, types: ['internship'], query: 'I want a finance internship', mix: false });
  assert.equal(r[0].id, 'ib');
  assert.ok(!r.some((x) => x.id === 'swe'), 'software intern should not match a finance ask');
  assert.match(whyLine(r[0].reasons), /finance/i);
  const ko = forYou(snap(ITEMS, CLUBS), me, { now: NOW, types: ['internship'], query: '나 금융 쪽 인턴 하고 싶어', mix: false });
  assert.equal(ko[0]?.id, 'ib');
});

test('"near berkeley" keeps Bay Area items only', () => {
  const me = person('Computer Science', { goals: ['internship'] });
  const r = forYou(snap(ITEMS, CLUBS), me, { now: NOW, types: ['internship'], query: 'internship near berkeley', mix: false });
  assert.deepEqual(r.map((x) => x.id), ['swe']);
  assert.equal(parseAsk('any internships near campus?', 'Bay Area').region, 'Bay Area');
  assert.equal(parseAsk('remote data internships').region, 'Remote');
});

test('the same reason is not repeated for every item', () => {
  const me = person('Computer Science');
  const many = Array.from({ length: 6 }, (_, i) => opp(`s${i}`, 'internship', `Software Engineer Intern ${i}`, { field: 'Software', host: `Co${i}` }));
  const r = forYou(snap(many), me, { now: NOW, limit: 6 });
  const major = r.filter((x) => x.reasons.some((y) => y.kind === 'major')).length;
  assert.ok(major <= 2, `major reason shown ${major} times`);
});

test('a hackathon already in its submission window is not called "This week"', () => {
  const started = opp('run', 'hackathon', 'Ongoing Hackathon', { tags: ['hackathon', 'online'], date: '2026-09-20T12:00:00Z', deadline: '2026-11-01T23:59:00Z' });
  const r = forYou(snap([started]), person('Computer Science'), { now: NOW, mix: false });
  assert.equal(r[0].id, 'run');
  assert.ok(!r[0].reasons.some((x) => x.kind === 'soon'));
});

test('a passed deadline reads "Closed", not "Full" (that word is for a full meetup)', async () => {
  const { dday } = await import('@core/lib/recommend');
  assert.equal(dday('2020-01-01T07:59:00.000Z'), 'Closed');
});

test("another department's award sinks below general ones for a CS student", () => {
  const items = [
    opp('psy', 'scholarship', 'Swan Award for Undergraduate Research (Psychology)', { schoolId: base.affiliation.type === 'university' ? base.affiliation.schoolId : undefined, host: 'UC Berkeley Department of Psychology', tags: ['research', 'scholarship'], deadline: '2026-10-30T06:59:00Z' }),
    opp('gw', 'scholarship', 'Barry Goldwater Scholarship', { host: 'Goldwater Foundation', tags: ['research', 'scholarship', 'STEM'], deadline: '2026-12-01T06:59:00Z' }),
    opp('mmuf', 'scholarship', 'Mellon Mays Undergraduate Fellowship', { schoolId: base.affiliation.type === 'university' ? base.affiliation.schoolId : undefined, host: 'UC Berkeley Division of Arts & Humanities', tags: ['research', 'scholarship'], deadline: '2026-12-01T06:59:00Z' }),
    opp('eecs', 'scholarship', 'EECS Undergraduate Research Award', { schoolId: base.affiliation.type === 'university' ? base.affiliation.schoolId : undefined, host: 'UC Berkeley Department of Electrical Engineering and Computer Sciences', tags: ['research', 'scholarship'], deadline: '2026-12-01T06:59:00Z' }),
  ];
  const cs = forYou(snap(items), person('Computer Science', { goals: ['scholarship'] }), { now: NOW, types: ['scholarship'], mix: false }).map((r) => r.id);
  assert.ok(cs.indexOf('psy') > cs.indexOf('gw') && cs.indexOf('mmuf') > cs.indexOf('gw'), cs.join(','));
  // 연방 ‘Department of Energy … Office of Science’ 는 우리 학과가 아니다 — ‘science’ 한 단어로 ‘내 학과’가 되면 안 된다
  const doe = opp('doe', 'lab', 'DOE Science Undergraduate Laboratory Internships (SULI)', { host: 'U.S. Department of Energy Office of Science', deadline: '2026-12-01T06:59:00Z' });
  const r = forYou(snap([doe]), person('Computer Science'), { now: NOW, mix: false })[0];
  assert.ok(!r || !r.reasons.some((x) => /your department/i.test(x.text)), JSON.stringify(r?.reasons));
  const psych = forYou(snap(items), person('Psychology', { goals: ['scholarship'] }), { now: NOW, types: ['scholarship'], mix: false }).map((r) => r.id);
  assert.equal(psych[0], 'psy', 'a psych major still gets it first');
});
