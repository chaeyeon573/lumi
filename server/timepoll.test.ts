/**
 * 시간 투표 (Harness A S032–S036) — 한 주 격자, 장소 후보와 장소 표, 표에서 나온 Best match, 주최자 확정, 권한.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Snapshot } from '@core/api/types';
import * as seed from '@core/data/seed.en';
import { createEngine } from '@core/api/engine';
import { tally } from '@core/lib/together';
import { mondayOf, placeTally, pollPlaceNames, weekGridOptions, optionCell, votersOf, addDaysTo } from '@core/lib/pollgrid';
import { eraseUser } from '@core/lib/account';
import { snapshotFor } from './view';

const db = (): Snapshot => structuredClone({
  users: seed.users, schools: seed.schools, organizations: seed.organizations, activities: seed.activities,
  participations: seed.participations, posts: seed.posts, relationships: seed.relationships, proposals: seed.proposals,
  chatRooms: seed.chatRooms, notifications: seed.notifications, reports: [], opportunities: seed.opportunities,
  opportunityIntents: seed.opportunityIntents, timePolls: [], games: [], rides: [],
});
const engineFor = (d: Snapshot) => createEngine({ db: d, t: (s) => s, demo: false, push: () => {} });
const WEEK = mondayOf(addDaysTo(new Date().toISOString().slice(0, 10), 14));
const HOST = 'u_me', A = seed.users[1].id, B = seed.users[2].id, OUT = seed.users[3].id;

function makePoll(d: Snapshot, extra: { placeOptions?: string[] } = {}) {
  return engineFor(d).together.create(HOST, {
    title: 'Group project catch-up', category: 'study', inviteeIds: [A, B],
    options: weekGridOptions(WEEK, 60), window: { weekStart: WEEK, minutes: 60 },
    closesAt: new Date(Date.now() + 48 * 3600_000).toISOString(), placeOptions: ['Café', ' Library ', 'café', 'Online'], ...extra,
  }).poll;
}

test('week grid: Mon–Fri, hourly starts, ends by 6 PM, past cells skipped', () => {
  assert.equal(mondayOf('2026-11-05'), '2026-11-02'); // Thu → Mon
  assert.equal(mondayOf('2026-11-08'), '2026-11-02'); // Sun → the Monday before
  assert.equal(weekGridOptions('2026-11-09', 60).length, 45);
  assert.equal(weekGridOptions('2026-11-09', 120).length, 40);
  const two = weekGridOptions('2026-11-09', 120);
  assert.equal(two[two.length - 1].endTime, '18:00');
  assert.ok(weekGridOptions('2026-11-09', 60, '2026-11-11T12:30').every((o) => `${o.date}T${o.startTime}` >= '2026-11-11T12:30'));
  assert.deepEqual(optionCell('2026-11-09', { date: '2026-11-11', startTime: '14:00' }), { day: 2, hour: 14 });
  assert.deepEqual(pollPlaceNames([' Café ', 'café', '', 'Library', 1, 'a', 'b', 'c', 'd', 'e']), ['Café', 'Library', '1', 'a', 'b', 'c']);
});

test('time poll with a week grid: host starts with no votes, places are deduped, best match comes from votes only', () => {
  const d = db(); const e = engineFor(d);
  const p = makePoll(d);
  assert.deepEqual(p.window, { weekStart: WEEK, minutes: 60 });
  assert.deepEqual(p.votes[HOST], [], 'host marks their own cells like everyone else');
  assert.deepEqual(p.placeOptions!.map((x) => x.name), ['Café', 'Library', 'Online']);
  assert.equal(tally(p).best, undefined, 'no votes → no best match (nothing is picked from timetables)');
  assert.equal(votersOf(p), 0);
  const wed2 = p.options.find((o) => o.date === addDaysTo(WEEK, 2) && o.startTime === '14:00')!;
  const tue1 = p.options.find((o) => o.date === addDaysTo(WEEK, 1) && o.startTime === '13:00')!;
  e.together.vote(p.id, A, [wed2.id, tue1.id, 'not-an-option']);
  e.together.vote(p.id, B, [wed2.id]);
  e.together.vote(p.id, HOST, [wed2.id, tue1.id]);
  assert.deepEqual(p.votes[A], [wed2.id, tue1.id], 'unknown ids are dropped');
  const t = tally(p);
  assert.equal(t.best?.option.id, wed2.id);
  assert.equal(t.best?.count, 3);
  assert.equal(t.voted, 3);
  // places
  const [cafe, library] = p.placeOptions!;
  e.together.votePlace(p.id, A, [cafe.id]);
  e.together.votePlace(p.id, B, [cafe.id, library.id]);
  assert.equal(placeTally(p).best?.place.id, cafe.id);
  assert.equal(placeTally(p).best?.count, 2);
});

test('time poll: only the host and invitees vote; only the host confirms; confirm makes the plan with the chosen place', () => {
  const d = db(); const e = engineFor(d);
  const p = makePoll(d);
  assert.throws(() => e.together.vote(p.id, OUT, [p.options[0].id]));
  assert.throws(() => e.together.votePlace(p.id, OUT, [p.placeOptions![0].id]));
  const o = p.options[3];
  e.together.vote(p.id, A, [o.id]);
  assert.throws(() => e.together.decide(p.id, o.id, 'pl_nope'), 'unknown place');
  const r = e.together.decide(p.id, o.id, p.placeOptions![1].id);
  assert.equal(r.activity.place.name, 'Library');
  assert.equal(r.activity.date, o.date);
  assert.equal(r.activity.startTime, o.startTime);
  assert.equal(p.status, 'decided');
  assert.equal(p.decidedPlaceId, p.placeOptions![1].id);
  // the person who voted for that time is in; group chat exists with them
  assert.ok(d.participations.some((x) => x.activityId === r.activity.id && x.userId === A && x.status === 'approved'));
  const room = d.chatRooms.find((x) => x.activityId === r.activity.id)!;
  assert.ok(room.memberIds.includes(A) && room.memberIds.includes(HOST));
  assert.throws(() => e.together.decide(p.id, o.id), 'cannot confirm twice');
  assert.throws(() => e.together.votePlace(p.id, A, []), 'closed poll');
  // both the host and the voter see the plan (and the poll) in their snapshot
  for (const who of [HOST, A]) {
    const s = snapshotFor(d, who);
    assert.ok(s.activities.some((x) => x.id === r.activity.id), `${who} sees the plan`);
    assert.ok(s.timePolls.some((x) => x.id === p.id && x.status === 'decided'), `${who} sees the decided poll`);
  }
  assert.ok(!snapshotFor(d, OUT).timePolls.some((x) => x.id === p.id), 'not shown to people outside the poll');
});

test('time poll: old-style polls (explicit times, no grid) keep the host on every option', () => {
  const d = db();
  const p = engineFor(d).together.create(HOST, { title: 'Dinner', category: 'meal', inviteeIds: [A], options: [{ date: WEEK, startTime: '18:00', endTime: '19:30' }, { date: addDaysTo(WEEK, 1), startTime: '18:00', endTime: '19:30' }], closesAt: new Date(Date.now() + 86400_000).toISOString() }).poll;
  assert.equal(p.votes[HOST].length, 2);
  assert.equal(p.placeOptions, undefined);
  assert.equal(p.window, undefined);
});

test('time poll: bad window is refused; deleting an account removes their place votes', () => {
  const d = db(); const e = engineFor(d);
  assert.throws(() => e.together.create(HOST, { title: 'x', category: 'study', inviteeIds: [A], options: weekGridOptions(WEEK, 60), window: { weekStart: 'next week', minutes: 60 }, closesAt: '' }));
  assert.throws(() => e.together.create(HOST, { title: 'x', category: 'study', inviteeIds: [A], options: weekGridOptions(WEEK, 60), window: { weekStart: WEEK, minutes: 45 }, closesAt: '' }));
  const p = makePoll(d);
  e.together.votePlace(p.id, A, [p.placeOptions![0].id]);
  eraseUser(d, A);
  const after = d.timePolls.find((x) => x.id === p.id)!;
  assert.equal(after.placeVotes?.[A], undefined);
});
