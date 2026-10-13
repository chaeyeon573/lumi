/**
 * 같이 가기 · 팀원 찾기 · 오늘의 질문 — 엔진 규칙과 권한, 의사 표시·답의 공개 범위.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Snapshot } from '@core/api/types';
import type { Opportunity, User } from '@core/types';
import * as seed from '@core/data/seed.en';
import { createEngine } from '@core/api/engine';
import { campusToday, crewMembers, socialSummary, visibleIntents, DAILY_MIN_ANSWERS, MEETUP_CAPACITY, percentages } from '@core/lib/withpeople';
import { snapshotFor, patchFor } from './view';
import { TOGETHER_RULES, ruleAllows } from './together-rules';

const db = (): Snapshot => structuredClone({
  users: seed.users, schools: seed.schools, organizations: seed.organizations, activities: seed.activities,
  participations: seed.participations, posts: seed.posts, relationships: seed.relationships, proposals: seed.proposals,
  chatRooms: seed.chatRooms, notifications: seed.notifications, reports: [], opportunities: seed.opportunities,
  opportunityIntents: seed.opportunityIntents, timePolls: seed.timePolls, games: [],
});
const engineFor = (d: Snapshot) => createEngine({ db: d, t: (s) => s, demo: false, push: () => {} });
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

/** 내일 낮 12시, 버클리 행사 */
function withEvent(d: Snapshot, extra: Partial<Opportunity> = {}): Opportunity {
  const o: Opportunity = {
    id: 'op_t_event', type: 'event', title: 'Free food at Sproul', host: 'ASUC', description: '', cover: { emoji: '🍕', hue: 20 },
    date: addDays(campusToday(), 1), startTime: '12:00', place: { name: 'Lower Sproul', lat: 37.869, lng: -122.259 },
    eligibility: 'Anyone', sourceUrl: '', sourceLabel: '', tags: ['free food'], interests: [], goals: [], schoolId: 's_berkeley',
    lastVerified: '2026-10-01', qna: [], reviews: [], createdAt: '2026-10-01T00:00:00Z', ...extra,
  };
  d.opportunities.push(o);
  return o;
}
/** 실제 사용자(예시 아님)를 하나 만든다 */
function person(d: Snapshot, id: string, over: Partial<User> = {}, school = 's_berkeley'): User {
  const base = structuredClone(d.users.find((u) => u.id === 'u_sua')!);
  const u: User = { ...base, id, nickname: id, sample: false, dailyAnswer: undefined, affiliation: { ...base.affiliation, schoolId: school } as User['affiliation'], ...over };
  d.users.push(u);
  return u;
}

// ─── 같이 가기 ────────────────────────────────────────────────────────────
test('go together: first tap opens a meetup a few minutes before, at the event place; tapping again does not make another', () => {
  const d = db(); const e = engineFor(d); const o = withEvent(d);
  const before = d.activities.length;
  const r1 = e.opportunities.goTogether(o.id, 'u_me');
  assert.equal(r1.created, true);
  assert.equal(r1.activity.opportunityId, o.id);
  assert.equal(r1.activity.listingCrew, 'go');
  assert.equal(r1.activity.startTime, '11:55');
  assert.equal(r1.activity.place.name, 'Lower Sproul');
  assert.equal(r1.activity.date, o.date);
  assert.equal(d.opportunityIntents.find((i) => i.opportunityId === o.id && i.userId === 'u_me')?.intent, 'going');
  const room = d.chatRooms.find((x) => x.id === r1.roomId)!;
  assert.ok(room.memberIds.includes('u_me'));
  // 두 번째 탭 — 같은 모임, 새 모임·참가 기록 없음
  const parts = d.participations.length;
  const r2 = e.opportunities.goTogether(o.id, 'u_me');
  assert.equal(r2.created, false);
  assert.equal(r2.activity.id, r1.activity.id);
  assert.equal(d.activities.length, before + 1);
  assert.equal(d.participations.length, parts);
});

test('go together: the next person joins the same meetup (and its chat) instead of opening a new one', () => {
  const d = db(); const e = engineFor(d); const o = withEvent(d);
  const a = e.opportunities.goTogether(o.id, 'u_me').activity;
  const r = e.opportunities.goTogether(o.id, 'u_sua');
  assert.equal(r.created, false);
  assert.equal(r.activity.id, a.id);
  assert.deepEqual(crewMembers(d, a).sort(), ['u_me', 'u_sua']);
  assert.ok(d.chatRooms.find((x) => x.id === r.roomId)!.memberIds.includes('u_sua'));
  // 다시 눌러도 참가 기록은 하나
  e.opportunities.goTogether(o.id, 'u_sua');
  assert.equal(d.participations.filter((p) => p.activityId === a.id && p.userId === 'u_sua').length, 1);
});

test('go together: a full meetup makes the next person open a new one', () => {
  const d = db(); const e = engineFor(d); const o = withEvent(d);
  const a = e.opportunities.goTogether(o.id, 'u_me').activity;
  for (let i = 0; i < MEETUP_CAPACITY; i++) { person(d, `u_fill${i}`); e.opportunities.goTogether(o.id, `u_fill${i}`); }
  assert.equal(d.participations.filter((p) => p.activityId === a.id && p.status === 'approved').length, MEETUP_CAPACITY);
  person(d, 'u_late');
  const r = e.opportunities.goTogether(o.id, 'u_late');
  assert.equal(r.created, true);
  assert.notEqual(r.activity.id, a.id);
});

test('go together: never joins a meetup the person cannot see or whose host blocked them', () => {
  const d = db(); const e = engineFor(d); const o = withEvent(d);
  const a = e.opportunities.goTogether(o.id, 'u_me').activity;
  d.relationships.blocks.push({ fromId: 'u_me', toId: 'u_jimin' });
  const r = e.opportunities.goTogether(o.id, 'u_jimin');
  assert.notEqual(r.activity.id, a.id);
  assert.ok(!d.chatRooms.find((x) => x.activityId === a.id)!.memberIds.includes('u_jimin'));
  // 초대제로 바뀐 모임에는 들어가지 않는다
  d.relationships.blocks = [];
  const b = d.activities.find((x) => x.id === r.activity.id)!;
  b.joinPolicy = 'invite'; b.visibility = 'selected'; b.visibilityTargets = [];
  a.joinPolicy = 'invite'; a.visibility = 'selected'; a.visibilityTargets = [];
  const r2 = e.opportunities.goTogether(o.id, 'u_yuna');
  assert.equal(r2.created, true);
});

test('go together: rejects other campuses, past events and events with no time', () => {
  const d = db(); const e = engineFor(d);
  const o = withEvent(d);
  person(d, 'u_merced', {}, 's_ucmerced');
  assert.throws(() => e.opportunities.goTogether(o.id, 'u_merced'));
  const past = withEvent(d, { id: 'op_past', date: addDays(campusToday(), -2) });
  assert.throws(() => e.opportunities.goTogether(past.id, 'u_me'));
  const notime = withEvent(d, { id: 'op_notime', startTime: undefined });
  assert.throws(() => e.opportunities.goTogether(notime.id, 'u_me'));
  const allDay = withEvent(d, { id: 'op_allday', startTime: '00:00' });
  assert.throws(() => e.opportunities.goTogether(allDay.id, 'u_me'));
  const internship = withEvent(d, { id: 'op_job', type: 'internship', tags: [] });
  assert.throws(() => e.opportunities.goTogether(internship.id, 'u_me'));
});

test('maybe: a guest leaves; a host alone closes it; a host with people hands it over', () => {
  const d = db(); const e = engineFor(d); const o = withEvent(d);
  const a = e.opportunities.goTogether(o.id, 'u_me').activity;
  e.opportunities.goTogether(o.id, 'u_sua');
  e.opportunities.goTogether(o.id, 'u_yuna');
  e.opportunities.leaveTogether(o.id, 'u_yuna');
  assert.ok(!crewMembers(d, a).includes('u_yuna'));
  assert.equal(d.opportunityIntents.find((i) => i.opportunityId === o.id && i.userId === 'u_yuna')?.intent, 'interested');
  // 주최자가 빠지면 다음 사람이 주최
  e.opportunities.leaveTogether(o.id, 'u_me');
  assert.equal(a.hostId, 'u_sua');
  assert.deepEqual(crewMembers(d, a), ['u_sua']);
  assert.ok(!d.chatRooms.find((x) => x.activityId === a.id)!.memberIds.includes('u_me'));
  // 혼자 남은 주최자가 빠지면 모임이 닫힌다
  e.opportunities.leaveTogether(o.id, 'u_sua');
  assert.ok(!d.activities.some((x) => x.id === a.id));
});

// ─── 팀원 찾기 ────────────────────────────────────────────────────────────
test('looking for a team: sets intent team with the roles you need; only real Role values', () => {
  const d = db(); const e = engineFor(d);
  e.opportunities.lookForTeam('op_hackathon', 'u_me', ['designer', 'data']);
  const rec = d.opportunityIntents.find((i) => i.opportunityId === 'op_hackathon' && i.userId === 'u_me')!;
  assert.equal(rec.intent, 'team');
  assert.deepEqual(rec.roles, ['designer', 'data']);
  assert.throws(() => e.opportunities.lookForTeam('op_hackathon', 'u_me', ['wizard' as never]));
  assert.throws(() => e.opportunities.lookForTeam('op_hackathon', 'u_me', ['designer', 'data', 'developer', 'video', 'marketing']));
});

// ─── 권한 ─────────────────────────────────────────────────────────────────
test('rpc rules: you can only go together, leave, look for a team or read results as yourself', () => {
  const { opportunities: o, users: u } = TOGETHER_RULES;
  assert.equal(ruleAllows(o.goTogether, 'u_me', ['op_x', 'u_me']), true);
  assert.equal(ruleAllows(o.goTogether, 'u_me', ['op_x', 'u_sua']), false);
  assert.equal(ruleAllows(o.leaveTogether, 'u_me', ['op_x', 'u_sua']), false);
  assert.equal(ruleAllows(o.lookForTeam, 'u_me', ['op_x', 'u_sua', []]), false);
  assert.equal(ruleAllows(u.dailyResults, 'u_me', ['u_sua', 'd_free2h', '2026-10-13']), false);
  assert.equal(ruleAllows(u.dailyResults, 'u_me', ['u_me', 'd_free2h', '2026-10-13']), true);
});

// ─── 오늘의 질문 (k-익명) ─────────────────────────────────────────────────
test('today\'s question: no breakdown under 5 answers at the school; samples and other schools do not count', () => {
  const d = db(); const e = engineFor(d);
  const date = '2026-10-13'; const q = 'd_free2h';
  const answer = (id: string, a: string, school = 's_berkeley', sample = false) => person(d, id, { sample, dailyAnswer: { questionId: q, answer: a, date } }, school);
  for (const u of d.users) delete u.dailyAnswer;
  answer('u_a1', 'coffee'); answer('u_a2', 'coffee'); answer('u_a3', 'nap'); answer('u_a4', 'lunch');
  answer('u_s1', 'coffee', 's_berkeley', true); // 예시 프로필 — 안 센다
  answer('u_m1', 'coffee', 's_ucmerced');       // 다른 학교 — 안 센다
  answer('u_old', 'coffee'); d.users.find((u) => u.id === 'u_old')!.dailyAnswer!.date = '2026-10-12'; // 어제 답 — 안 센다
  let r = e.users.dailyResults('u_a1', q, date);
  assert.equal(r.total, 4);
  assert.equal(r.counts, null);
  assert.equal(r.min, DAILY_MIN_ANSWERS);
  answer('u_a5', 'exercise');
  r = e.users.dailyResults('u_a1', q, date);
  assert.equal(r.total, 5);
  assert.deepEqual(r.counts, { coffee: 2, nap: 1, lunch: 1, exercise: 1 });
  // 결과에는 누가 무엇을 골랐는지가 없다
  assert.ok(!JSON.stringify(r).includes('u_a'));
  // 예시 프로필인 본인(데모 계정)은 자기 답이 센다
  const demo = d.users.find((u) => u.id === 'u_me')!; demo.sample = true; demo.dailyAnswer = { questionId: q, answer: 'nap', date };
  assert.equal(e.users.dailyResults('u_me', q, date).total, 6);
  assert.equal(e.users.dailyResults('u_a1', q, date).total, 5);
  assert.throws(() => e.users.dailyResults('u_a1', 'nope', date));
  assert.throws(() => e.users.dailyResults('u_a1', q, 'today'));
  const pct = percentages(r.counts!, ['coffee', 'nap', 'lunch', 'exercise', 'new_people']);
  assert.equal(Object.values(pct).reduce((s, v) => s + v, 0), 100);
  assert.equal(pct.coffee, 40);
});

test('today\'s question: individual answers only reach people who can see that person\'s availability', () => {
  const d = db();
  const date = '2026-10-13';
  const sofia = d.users.find((u) => u.id === 'u_yuna')!; // 버클리, availability: school
  sofia.dailyAnswer = { questionId: 'd_free2h', answer: 'coffee', date };
  person(d, 'u_other_school', {}, 's_ucmerced');
  const has = (viewer: string, owner = sofia.id) => !!snapshotFor(d, viewer).users.find((u) => u.id === owner)?.dailyAnswer;
  assert.equal(has('u_me'), true);             // 같은 학교
  assert.equal(has('u_other_school'), false);   // 다른 학교
  assert.equal(has(sofia.id), true);            // 본인
  sofia.fieldVisibility = { ...sofia.fieldVisibility, availability: 'friends' };
  assert.equal(has('u_me'), false);             // 친구가 아니다
  d.relationships.friends.push({ a: 'u_me', b: sofia.id, since: '2026-10-01' });
  assert.equal(has('u_me'), true);
  d.relationships.blocks.push({ fromId: sofia.id, toId: 'u_me' });
  assert.equal(has('u_me'), false);             // 차단
  // 패치도 같은 규칙 (db 없이 오면 지운다)
  assert.equal(patchFor({ users: [sofia] }, 'u_me', d)?.users?.[0].dailyAnswer, undefined);
  assert.equal(patchFor({ users: [sofia] }, 'u_me')?.users?.[0].dailyAnswer, undefined);
});

// ─── 의사 표시 공개 범위 ──────────────────────────────────────────────────
test('social line: blocked people (either way) never show up; sample people are flagged', () => {
  const d = db(); const o = withEvent(d);
  const me = d.users.find((u) => u.id === 'u_me')!;
  d.opportunityIntents.push(
    { id: 'x1', opportunityId: o.id, userId: 'u_sua', intent: 'going', saved: false, createdAt: '2026-10-12T00:00:00Z' },
    { id: 'x2', opportunityId: o.id, userId: 'u_jimin', intent: 'going', saved: false, createdAt: '2026-10-12T00:00:00Z' },
    { id: 'x3', opportunityId: o.id, userId: 'u_yuna', intent: 'company', saved: true, createdAt: '2026-10-12T00:00:00Z' },
  );
  let s = socialSummary(d, me, o, true);
  assert.equal(s.kind, 'go');
  assert.match(s.text, /going$/);
  assert.equal(s.faces.length, 3);
  assert.equal(s.faces[0].id, 'u_sua'); // 친구가 먼저
  assert.equal(s.sample, false);
  d.relationships.blocks.push({ fromId: 'u_jimin', toId: 'u_me' }); // 상대가 나를 차단
  d.relationships.blocks.push({ fromId: 'u_me', toId: 'u_yuna' });  // 내가 상대를 차단
  s = socialSummary(d, me, o, true);
  assert.deepEqual(s.faces.map((u) => u.id), ['u_sua']);
  assert.equal(s.text, 'Lily going');
  assert.deepEqual(visibleIntents(d, me, o.id).map((x) => x.u.id), ['u_sua']);
  // 같이 가기 모임의 차단된 주최자도 안 보인다
  d.users.find((u) => u.id === 'u_sua')!.sample = true;
  assert.equal(socialSummary(d, me, o, true).sample, true);
  // 아무도 없으면 첫 번째 버튼
  const empty = withEvent(d, { id: 'op_empty' });
  const e = socialSummary(d, me, empty, true);
  assert.equal(e.first, true);
  assert.equal(e.cta, 'Be the first — go together');
});

test('social line: wording by kind', () => {
  const d = db();
  const me = d.users.find((u) => u.id === 'u_me')!;
  d.opportunityIntents.push({ id: 'y1', opportunityId: 'op_hackathon', userId: 'u_taeho', intent: 'team', saved: false, createdAt: '2026-10-12T00:00:00Z' });
  const hack = socialSummary(d, me, d.opportunities.find((o) => o.id === 'op_hackathon')!, true);
  assert.equal(hack.kind, 'team');
  assert.equal(hack.text, '2 looking for a team');
  assert.equal(hack.cta, 'Find teammates');
  // 인턴: 같은 학과 두 명이 저장 → "2 CS students saved this"
  const intern = d.opportunities.find((o) => o.id === 'op_intern')!;
  d.opportunityIntents = d.opportunityIntents.filter((i) => i.opportunityId !== intern.id);
  d.opportunityIntents.push(
    { id: 'y2', opportunityId: intern.id, userId: 'u_sua', intent: 'interested', saved: true, createdAt: '2026-10-12T00:00:00Z' },
    { id: 'y3', opportunityId: intern.id, userId: 'u_junho', intent: 'interested', saved: true, createdAt: '2026-10-12T00:00:00Z' },
  );
  const s = socialSummary(d, me, intern, true);
  assert.equal(s.kind, 'prep');
  assert.equal(s.text, '2 CS students saved this');
  assert.equal(s.cta, 'Prep together');
});
