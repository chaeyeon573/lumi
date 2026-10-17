/**
 * 예시(sample) 콘텐츠는 데모 계정에게만 — 실제 계정의 스냅샷·패치·Ask Lumi 검색에는 하나도 없다.
 * 데모 계정은 자기 학교 예시만 'Sample' 표시 그대로 받는다.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Patch, Snapshot } from '@core/api/types';
import type { User } from '@core/types';
import * as seed from '@core/data/seed.en';
import { t } from '@core/i18n';
import { createEngine } from '@core/api/engine';
import { snapshotFor, patchFor } from './view';
import { migrateDemo, rollSampleActivities, rollSampleContent, demoUserIdFor, seniorClassYear } from './demo';
import { ensureSampleRides } from './rides';
import { SAMPLE_OPPORTUNITY_IDS, SAMPLE_ORG_IDS, hiddenSamplesFor, sampleFreeFor } from './samples';
import { searchActivities, searchClubs, searchListings } from './ai-search';

const REAL = 'u_real';
const DEMO = 'u_me';
const DEMO_MERCED = demoUserIdFor('s_ucmerced');

/** 서버가 켜질 때와 같은 상태: 시드 → 데모 정리(예시 표시·UC Merced 이동·Merced 데모 계정) → 예시 모임 날짜 → 예시 같이 타기 + 실제 학생 1명 */
function world() {
  const db: Snapshot = structuredClone({
    users: seed.users, schools: seed.schools, organizations: seed.organizations, activities: seed.activities,
    participations: seed.participations, posts: seed.posts, relationships: seed.relationships, proposals: seed.proposals,
    chatRooms: seed.chatRooms, notifications: seed.notifications, reports: [], opportunities: seed.opportunities,
    opportunityIntents: seed.opportunityIntents, timePolls: seed.timePolls, games: [], rides: [],
  });
  migrateDemo(db);
  rollSampleActivities(db);
  ensureSampleRides(db);
  const base = structuredClone(db.users.find((u) => u.id === 'u_jimin')!);
  // 버클리 실제 학생 — 예시 프로필들과 같은 수업(CS 186)을 듣고, 학교 인증을 마쳤다
  const real: User = {
    ...base, id: REAL, nickname: 'Sam', sample: undefined, dailyAnswer: undefined, poll: undefined, interestedOrgIds: [],
    affiliation: { ...base.affiliation, schoolId: 's_berkeley', schoolName: 'UC Berkeley', emailVerified: true } as User['affiliation'],
    timetable: [{ id: 't1', name: 'CS 186 Databases', day: 0, start: '10:00', end: '11:00', hue: 220 }, { id: 't2', name: 'CS 186 Databases', day: 2, start: '10:00', end: '11:00', hue: 220 }],
  };
  db.users.push(real);
  return db;
}
const sampleUserIds = (db: Snapshot) => db.users.filter((u) => u.sample).map((u) => u.id);

/** 이 결과(스냅샷·패치)에 예시 콘텐츠가 하나라도 있는지 — id 가 어디에든(좋아요·멤버·투표·링크) 나오면 실패 */
function assertNoSamples(out: unknown, db: Snapshot, label: string) {
  const json = JSON.stringify(out ?? {});
  assert.ok(!json.includes('"sample":true'), `${label}: something flagged sample`);
  const ids = [
    ...sampleUserIds(db), ...db.activities.filter((a) => a.sample).map((a) => a.id), ...(db.rides ?? []).filter((r) => r.sample).map((r) => r.id),
    ...SAMPLE_ORG_IDS, ...SAMPLE_OPPORTUNITY_IDS, ...db.posts.filter((p) => db.users.find((u) => u.id === p.authorId)?.sample).map((p) => p.id),
    ...db.timePolls.filter((p) => db.users.find((u) => u.id === p.hostId)?.sample).map((p) => p.id),
  ];
  for (const id of ids) assert.ok(!json.includes(`"${id}"`) && !json.includes(`/${id}`), `${label}: leaked ${id}`);
}

test('the seed world really has sample content (otherwise the tests below prove nothing)', () => {
  const db = world();
  assert.ok(sampleUserIds(db).length >= 10);
  assert.ok(db.activities.filter((a) => a.sample).length >= 10);
  assert.ok((db.rides ?? []).filter((r) => r.sample).length >= 3);
  assert.ok(db.organizations.some((o) => SAMPLE_ORG_IDS.has(o.id)) && db.opportunities.some((o) => SAMPLE_OPPORTUNITY_IDS.has(o.id)));
});

test('real account: the snapshot has zero sample records anywhere', () => {
  const db = world();
  const s = snapshotFor(db, REAL);
  assertNoSamples(s, db, 'snapshot');
  assert.deepEqual(s.users.map((u) => u.id), [REAL], 'only me — nobody else at Berkeley is real yet');
  assert.equal(s.activities.length, 0);
  assert.equal(s.posts.length, 0);
  assert.equal(s.rides?.length, 0);
  assert.equal(s.opportunityIntents.length, 0);
  // classmates: the sample people taking CS 186 are not in my roster or its count
  const cs186 = s.classRosters?.find((r) => r.code === 'CS 186');
  assert.ok(cs186, 'I still get my CS 186 roster');
  assert.deepEqual(cs186!.members, []);
  assert.equal(cs186!.count, 1);
  // clubs keep their real data; sample ids are gone from member/follower lists
  assert.ok(s.organizations.length > 0);
});

test('real account: patches with sample content come through empty', () => {
  const db = world();
  const viewers = [REAL];
  // what the server broadcasts: the 15-minute roll of sample meetups, sample rides, demo migration, a sample user's change
  const sampleUser = db.users.find((u) => u.id === 'u_jimin')!;
  const roll: Patch = { activities: db.activities.filter((a) => a.sample).slice(0, 5) };
  const rides: Patch = { rides: (db.rides ?? []).filter((r) => r.sample) };
  for (const v of viewers) {
    assert.equal(patchFor(roll, v, db), null, 'sample meetups roll');
    assert.equal(patchFor(rides, v, db), null, 'sample rides (not even removals)');
    assert.equal(patchFor({ users: [sampleUser] }, v, db), null, 'a sample profile update');
    assert.equal(patchFor({ posts: db.posts.slice(0, 3) }, v, db), null, 'sample posts');
    assert.equal(patchFor({ opportunities: db.opportunities.filter((o) => SAMPLE_OPPORTUNITY_IDS.has(o.id)) }, v, db), null, 'seed listings');
  }
  // a mixed patch keeps only the real part, and relationships lose sample edges
  const mixed = patchFor({ users: [sampleUser, db.users.find((u) => u.id === REAL)!], relationships: db.relationships }, REAL, db)!;
  assertNoSamples(mixed, db, 'mixed patch');
  assert.deepEqual(mixed.users?.map((u) => u.id), [REAL]);
});

test('real account: what a sample profile does through the engine never reaches a real viewer', () => {
  const db = world();
  const engine = createEngine({ db, t, demo: false, push: () => {} });
  // a real student opens an activity; a sample profile joins it and comments
  const { activity, patch: created } = engine.activities.create(REAL, { kind: 'personal', category: 'coffee', title: 'Coffee at Strada?', description: '', cover: { emoji: '☕', hue: 30 }, date: '2030-01-01', startTime: '10:00', endTime: '11:00', place: { name: 'Caffe Strada', lat: 37.869, lng: -122.2547 }, capacity: 4, fee: 0, joinPolicy: 'open', visibility: 'school' });
  assert.ok(patchFor(created, REAL, db)?.activities?.some((a) => a.id === activity.id), 'my own activity comes through');
  const joined = engine.activities.join(activity.id, 'u_sua');
  const commented = engine.activities.comment(activity.id, 'u_sua', 'Count me in!');
  for (const p of [joined, commented]) assertNoSamples(patchFor(p, REAL, db), db, 'engine patch');
  const mine = snapshotFor(db, REAL).activities.find((a) => a.id === activity.id)!;
  assert.deepEqual(mine.comments, [], 'sample comment stripped from my activity');
  assert.ok(!snapshotFor(db, REAL).participations.some((p) => p.userId === 'u_sua'));
});

test('demo account: still gets its own school\'s samples, labelled', () => {
  const db = world();
  const s = snapshotFor(db, DEMO);
  assert.ok(s.users.filter((u) => u.id !== DEMO && u.sample).length >= 6, 'Berkeley sample profiles');
  assert.ok(s.users.some((u) => u.id === REAL), 'real students show up for the demo too');
  assert.ok(s.activities.some((a) => a.sample), 'sample meetups');
  assert.ok((s.rides ?? []).some((r) => r.sample), 'sample rides');
  assert.ok(s.organizations.some((o) => SAMPLE_ORG_IDS.has(o.id)), 'demo clubs');
  assert.ok(s.posts.length > 0 && s.chatRooms.length > 0);
  // patches too
  assert.ok(patchFor({ activities: db.activities.filter((a) => a.sample && a.hostId === 'u_jimin') }, DEMO, db)?.activities?.length);
  assert.ok(patchFor({ rides: (db.rides ?? []).filter((r) => r.sample) }, DEMO, db)?.rides?.length);
});

test('demo account: only its own school\'s sample profiles (no UC Merced Hannah on the Berkeley deck)', () => {
  const db = world();
  const merced = new Set(db.users.filter((u) => u.affiliation.type === 'university' && u.affiliation.schoolId === 's_ucmerced').map((u) => u.id));
  assert.ok(merced.has('u_hana') && merced.has(DEMO_MERCED));
  const berkeley = snapshotFor(db, DEMO);
  assert.ok(!berkeley.users.some((u) => merced.has(u.id)), 'Berkeley demo sees no Merced sample profile');
  assert.ok(!berkeley.activities.some((a) => merced.has(a.hostId)));
  assert.ok(!berkeley.chatRooms.some((r) => r.memberIds.some((m) => merced.has(m))));
  assert.equal(patchFor({ users: [db.users.find((u) => u.id === 'u_hana')!] }, DEMO, db), null);
  const m = snapshotFor(db, DEMO_MERCED);
  assert.ok(m.users.some((u) => u.id === 'u_hana'), 'the Merced demo keeps Hannah');
  assert.ok(!m.users.some((u) => u.id === 'u_jimin'), 'and not Berkeley samples');
});

test('Ask Lumi: a real account\'s searches never return sample meetups, demo clubs or seed listings', () => {
  const db = world();
  const real = db.users.find((u) => u.id === REAL)!;
  const demo = db.users.find((u) => u.id === DEMO)!;
  const today = '2000-01-01';
  const view = sampleFreeFor(db, real);
  for (const q of ['coffee', 'lunch', 'run', 'study', 'badminton', '']) assert.deepEqual(searchActivities(view, real, today, { query: q }), [], q);
  assert.ok(!searchClubs(view, real, { query: 'band' }).some((r) => SAMPLE_ORG_IDS.has(r.card.id)));
  assert.ok(!searchListings(view, real, today, { query: 'internship' }).some((r) => SAMPLE_OPPORTUNITY_IDS.has(r.card.id)));
  // the demo account still finds its sample meetups, marked as samples for the model
  const demoHits = searchActivities(sampleFreeFor(db, demo), demo, today, { query: 'coffee' });
  assert.ok(demoHits.length && demoHits.every((r) => r.card.sample && r.forModel.sample_listing));
  // starters: a sample profile is not someone a real account can open
  assert.ok(hiddenSamplesFor(db, real).users.has('u_jimin'));
  assert.ok(!hiddenSamplesFor(db, demo).users.has('u_jimin'));
});

test('sample undergrads are not already graduated', () => {
  const db = world();
  const old = db.users.filter((u) => u.sample && u.affiliation.type === 'university' && u.affiliation.role === 'undergraduate' && u.affiliation.year + 4 < seniorClassYear());
  assert.deepEqual(old.map((u) => u.nickname), []);
  assert.equal(seniorClassYear(new Date('2026-10-14T00:00:00Z')), 2027);
  assert.equal(seniorClassYear(new Date('2027-03-01T00:00:00Z')), 2027);
});

test('sample activity wording follows the seed after a roll (live DBs keep old titles otherwise)', () => {
  const db = world();
  const a = db.activities.find((x) => x.id === 'a_now_lunch')!;
  a.title = 'Hate eating alone — lunch at Crossroads?';
  rollSampleActivities(db);
  assert.equal(db.activities.find((x) => x.id === 'a_now_lunch')!.title, seed.activities.find((x) => x.id === 'a_now_lunch')!.title);
  assert.doesNotMatch(db.activities.find((x) => x.id === 'a_now_lunch')!.title, /lunch/i);
});

test('sample posts and chats move to recent times; real posts and chats someone joined stay put', () => {
  const db = world();
  const WEEKS = 21 * 86400000;
  const ago = (iso: string) => new Date(Date.parse(iso) - WEEKS).toISOString();
  // 3주 전에 시드된 라이브 DB 와 같은 상태
  db.posts = db.posts.map((p) => ({ ...p, createdAt: ago(p.createdAt), comments: p.comments.map((c) => ({ ...c, createdAt: ago(c.createdAt) })) }));
  db.notifications = db.notifications.map((n) => ({ ...n, createdAt: ago(n.createdAt) }));
  db.chatRooms = db.chatRooms.map((r) => ({ ...r, createdAt: ago(r.createdAt), messages: r.messages.map((m) => ({ ...m, createdAt: ago(m.createdAt) })), lastReadAt: Object.fromEntries(Object.entries(r.lastReadAt).map(([k, v]) => [k, ago(v)])) }));
  const realPost = { ...structuredClone(db.posts[0]), id: 'po_real', authorId: REAL, createdAt: ago(new Date().toISOString()), comments: [] };
  db.posts.push(realPost);
  const joined = db.chatRooms.find((r) => r.id === 'cr_junho')!;
  joined.messages.push({ id: 'm_visitor', senderId: DEMO, text: 'hi', createdAt: ago(new Date().toISOString()) });
  const before = structuredClone(joined);

  const patch = rollSampleContent(db);
  assert.ok(patch?.posts?.length && patch.chatRooms?.length && patch.notifications?.length);
  const deadline = db.notifications.find((n) => n.id === 'nt9')!; // 'Deadline in 4 days' — 10분 전
  assert.ok((Date.now() - Date.parse(deadline.createdAt)) / 60000 < 11);
  const hoursAgo = (iso: string) => (Date.now() - Date.parse(iso)) / 3600000;
  const coffee = db.posts.find((p) => p.id === 'po1')!; // "Hosting a coffee meetup here tonight" — 2시간 전
  assert.ok(Math.abs(hoursAgo(coffee.createdAt) - 2) < 0.1, `po1 is ${hoursAgo(coffee.createdAt)}h old`);
  assert.ok(Math.abs(hoursAgo(coffee.comments[0].createdAt) - 50 / 60) < 0.1);
  const tacos = db.chatRooms.find((r) => r.id === 'cr_seoyeon')!; // 마지막 메시지 2시간 전, 순서·간격 그대로
  assert.ok(Math.abs(hoursAgo(tacos.messages.at(-1)!.createdAt) - 2) < 0.1);
  assert.ok(Math.abs(hoursAgo(tacos.messages[0].createdAt) - 3) < 0.1);
  assert.ok(Date.parse(tacos.lastReadAt[DEMO]) < Date.parse(tacos.messages.at(-1)!.createdAt), 'the last message stays unread');
  assert.equal(db.posts.find((p) => p.id === 'po_real')!.createdAt, realPost.createdAt);
  assert.deepEqual(db.chatRooms.find((r) => r.id === 'cr_junho'), before);
  // 바로 다시 돌리면 바뀔 게 없다 (15분마다 모든 글을 다시 보내지 않는다)
  assert.equal(rollSampleContent(db), null);
});

test('sample meetup comments move to recent times too', () => {
  const db = world();
  const show = db.activities.find((a) => a.id === 'a_band_show')!;
  show.comments = show.comments.map((c) => ({ ...c, createdAt: new Date(Date.parse(c.createdAt) - 21 * 86400000).toISOString() }));
  const patch = rollSampleActivities(db);
  assert.ok(patch?.activities?.some((a) => a.id === 'a_band_show'));
  const reply = db.activities.find((a) => a.id === 'a_band_show')!.comments.find((c) => c.id === 'c4')!;
  assert.ok((Date.now() - Date.parse(reply.createdAt)) / 3600000 < 2.2, 'reply is about 2 hours old');
});

test('demo account: no sample notice names a sample person it can\'t see ("Hannah and Lily asked to join" with only Lily there)', () => {
  const db = world();
  const s = snapshotFor(db, DEMO);
  const hidden = db.users.filter((u) => u.sample && !s.users.some((x) => x.id === u.id)).map((u) => u.nickname);
  assert.ok(hidden.includes('Hannah'), 'the Berkeley deck hides Hannah (otherwise this proves nothing)');
  const named = s.notifications.filter((n) => hidden.some((name) => new RegExp(`\\b${name}\\b`).test(`${n.title} ${n.body}`)));
  assert.deepEqual(named.map((n) => n.id), []);
  assert.ok(s.notifications.some((n) => n.id === 'nt5'), 'notices about people it can see stay ("Maya started following you")');
});

test('the sample proposal does not expire on a long-running server (the "New proposal" notice would open an empty list)', () => {
  const db = world();
  const WEEKS = 21 * 86400000;
  const ago = (iso: string) => new Date(Date.parse(iso) - WEEKS).toISOString();
  db.proposals = db.proposals.map((p) => ({ ...p, status: 'expired' as const, createdAt: ago(p.createdAt), expiresAt: ago(p.expiresAt) }));
  const patch = rollSampleContent(db);
  assert.ok(patch?.proposals?.length);
  const pr = db.proposals.find((p) => p.id === 'pr1')!;
  assert.equal(pr.status, 'pending');
  assert.ok(Date.parse(pr.expiresAt) > Date.now() + 40 * 3600000);
  // 데모 방문자가 이미 답한 제안은 그대로
  db.proposals = db.proposals.map((p) => ({ ...p, status: 'declined' as const, createdAt: ago(p.createdAt), expiresAt: ago(p.expiresAt) }));
  rollSampleContent(db);
  assert.equal(db.proposals.find((p) => p.id === 'pr1')!.status, 'declined');
});
