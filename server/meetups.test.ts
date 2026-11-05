/**
 * 모임 (S045–S048, S055) — 학적 audience, 공개 범위(모임 회원·수업), 대기 명단, 정원을 넘지 않는 승인, 차단.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ActivityInput, Snapshot } from '@core/api/types';
import type { Organization, User } from '@core/types';
import * as seed from '@core/data/seed.en';
import { createEngine } from '@core/api/engine';
import { audienceFits, reachInput, reachOf, waitlistOf } from '@core/lib/meetups';
import { snapshotFor } from './view';
import { ruleAllows } from './together-rules';
import { MEETUP_RULES } from './meetup-rules';

const db = (): Snapshot => structuredClone({
  users: seed.users, schools: seed.schools, organizations: seed.organizations, activities: seed.activities,
  participations: seed.participations, posts: seed.posts, relationships: seed.relationships, proposals: seed.proposals,
  chatRooms: seed.chatRooms, notifications: seed.notifications, reports: [], opportunities: seed.opportunities,
  opportunityIntents: seed.opportunityIntents, timePolls: seed.timePolls, games: [],
});
const engineFor = (d: Snapshot) => createEngine({ db: d, t: (s) => s, demo: false, push: () => {} });

/** 실제 사용자(예시 아님) */
function person(d: Snapshot, id: string, role: 'undergraduate' | 'graduate' | 'alumni' = 'undergraduate', over: Partial<User> = {}): User {
  const base = structuredClone(d.users.find((u) => u.id === 'u_sua')!);
  const u: User = { ...base, id, nickname: id, sample: false, affiliation: { ...base.affiliation, schoolId: 's_berkeley', schoolName: 'UC Berkeley', role } as User['affiliation'], ...over };
  d.users.push(u);
  return u;
}
const tomorrow = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const meetup = (over: Partial<ActivityInput> = {}): ActivityInput => ({
  kind: 'personal', category: 'coffee', title: 'Coffee after class', description: 'A little break.', cover: { emoji: '☕', hue: 30 },
  date: tomorrow(), startTime: '15:00', endTime: '16:00', place: { name: 'Caffe Strada', lat: 37.869, lng: -122.2547 },
  capacity: 2, fee: 0, joinPolicy: 'open', visibility: 'school', visibilityTargets: [], invitedIds: [], ...over,
});

test('rules: joinWaitlist only as yourself', () => {
  assert.equal(ruleAllows(MEETUP_RULES.activities.joinWaitlist, 'u_a', ['act', 'u_a']), true);
  assert.equal(ruleAllows(MEETUP_RULES.activities.joinWaitlist, 'u_a', ['act', 'u_b']), false);
});

test('audience: only the chosen academic status can join; the host always can; everyone can still see it', () => {
  const d = db(); const e = engineFor(d);
  person(d, 'host'); person(d, 'grad', 'graduate'); person(d, 'ug');
  const { activity } = e.activities.create('host', meetup({ audience: 'graduate' }));
  assert.equal(activity.audience, 'graduate');
  assert.throws(() => e.activities.join(activity.id, 'ug'), /학적/);
  assert.throws(() => e.activities.joinWaitlist(activity.id, 'ug'), /학적/);
  e.activities.join(activity.id, 'grad');
  assert.equal(d.participations.find((p) => p.activityId === activity.id && p.userId === 'grad')?.status, 'approved');
  assert.equal(audienceFits(activity, d.users.find((u) => u.id === 'host')!), true);
  // 보기는 공개 범위를 따른다 — 학부생도 같은 학교면 보인다 (참가만 막힌다)
  assert.ok(snapshotFor(d, 'ug').activities.some((a) => a.id === activity.id));
});

test('waitlist: full → waitlisted in order; a freed seat goes to the first person (open meetup joins, chat room)', () => {
  const d = db(); const e = engineFor(d);
  for (const id of ['host', 'a', 'b', 'c', 'd2']) person(d, id);
  const { activity } = e.activities.create('host', meetup({ capacity: 2 }));
  e.activities.join(activity.id, 'a'); e.activities.join(activity.id, 'b');
  assert.throws(() => e.activities.join(activity.id, 'c'), /모집 인원/);
  e.activities.joinWaitlist(activity.id, 'c');
  e.activities.joinWaitlist(activity.id, 'd2');
  assert.deepEqual(waitlistOf(d.participations, activity.id).map((p) => p.userId), ['c', 'd2']);
  // 대기 명단은 자리를 차지하지 않는다
  assert.equal(d.participations.filter((p) => p.activityId === activity.id && p.status === 'approved').length, 2);
  const patch = e.activities.cancel(activity.id, 'a');
  assert.equal(d.participations.find((p) => p.activityId === activity.id && p.userId === 'c')?.status, 'approved');
  assert.equal(d.participations.find((p) => p.activityId === activity.id && p.userId === 'd2')?.status, 'waitlisted');
  assert.ok(patch.participations?.some((p) => p.userId === 'c' && p.status === 'approved'));
  const room = d.chatRooms.find((r) => r.activityId === activity.id)!;
  assert.ok(room.memberIds.includes('c') && !room.memberIds.includes('a'));
  // 대기 중인 사람이 빠져도 아무도 올라가지 않는다
  e.activities.cancel(activity.id, 'd2');
  assert.equal(d.participations.find((p) => p.activityId === activity.id && p.userId === 'd2')?.status, 'cancelled');
});

test('waitlist: with room it is a plain join; in an approval meetup the freed seat becomes a request for the host', () => {
  const d = db(); const e = engineFor(d);
  for (const id of ['host', 'a', 'b']) person(d, id);
  const open = e.activities.create('host', meetup({ capacity: 3 })).activity;
  e.activities.joinWaitlist(open.id, 'a');
  assert.equal(d.participations.find((p) => p.activityId === open.id && p.userId === 'a')?.status, 'approved');

  const ap = e.activities.create('host', meetup({ capacity: 1, joinPolicy: 'approval' })).activity;
  e.activities.join(ap.id, 'a');
  const req = d.participations.find((p) => p.activityId === ap.id && p.userId === 'a')!;
  e.activities.approve(req.id);
  e.activities.joinWaitlist(ap.id, 'b');
  assert.equal(d.participations.find((p) => p.activityId === ap.id && p.userId === 'b')?.status, 'waitlisted');
  const before = d.notifications.length;
  e.activities.cancel(ap.id, 'a');
  assert.equal(d.participations.find((p) => p.activityId === ap.id && p.userId === 'b')?.status, 'pending');
  assert.equal(d.notifications.length, before + 1);
  assert.equal(d.notifications[0].userId, 'host');
});

test('approve never goes over capacity — requests and waitlist alike', () => {
  const d = db(); const e = engineFor(d);
  for (const id of ['host', 'a', 'b']) person(d, id);
  const { activity } = e.activities.create('host', meetup({ capacity: 1, joinPolicy: 'approval' }));
  e.activities.join(activity.id, 'a'); e.activities.join(activity.id, 'b');
  const [pa, pb] = ['a', 'b'].map((u) => d.participations.find((p) => p.activityId === activity.id && p.userId === u)!);
  e.activities.approve(pa.id);
  assert.throws(() => e.activities.approve(pb.id), /모집 인원/);
  assert.equal(pb.status, 'pending');
});

test('reach: My verified groups is seen by members and officers only (not followers); Class by people in that class', () => {
  const d = db(); const e = engineFor(d);
  person(d, 'host'); person(d, 'member'); person(d, 'follower'); person(d, 'other');
  person(d, 'classmate', 'undergraduate', { timetable: [{ id: 'c1', name: 'CS 61A', day: 0, start: '10:00', end: '11:00', hue: 200 }] });
  const org: Organization = { ...structuredClone(d.organizations[0]), id: 'org_t', schoolId: 's_berkeley', memberIds: ['host', 'member'], adminIds: [], followerIds: ['follower'], applicantIds: [] };
  d.organizations.push(org);
  const groups = e.activities.create('host', meetup({ ...reachInput('groups', { orgIds: ['org_t'] }) })).activity;
  assert.equal(reachOf(groups), 'groups');
  const seen = (viewer: string, id: string) => snapshotFor(d, viewer).activities.some((a) => a.id === id);
  assert.equal(seen('member', groups.id), true);
  assert.equal(seen('follower', groups.id), false);
  assert.equal(seen('other', groups.id), false);
  const cls = e.activities.create('host', meetup({ ...reachInput('class', { course: 'CS 61A' }) })).activity;
  assert.equal(reachOf(cls), 'class');
  assert.equal(seen('classmate', cls.id), true);
  assert.equal(seen('other', cls.id), false);
  assert.equal(reachOf(e.activities.create('host', meetup({ ...reachInput('invite') })).activity), 'invite');
});

test('blocks: no join, no meetup suggestion, no friend request across a block; a repeated suggestion is not sent twice', () => {
  const d = db(); const e = engineFor(d);
  person(d, 'host'); person(d, 'x'); person(d, 'y');
  d.relationships.blocks.push({ fromId: 'host', toId: 'x' });
  const { activity } = e.activities.create('host', meetup());
  assert.throws(() => e.activities.join(activity.id, 'x'));
  assert.throws(() => e.proposals.create('x', 'host', { category: 'coffee', message: 'hi', when: 'Sat 6 PM' }));
  assert.throws(() => e.relationships.sendFriendRequest('x', 'host'));
  const n = d.proposals.length;
  e.proposals.create('y', 'host', { category: 'coffee', message: 'Coffee after class?', when: 'Sat 6 PM' });
  e.proposals.create('y', 'host', { category: 'coffee', message: 'Coffee after class?', when: 'Sat 6 PM' });
  assert.equal(d.proposals.length, n + 1);
});

test('view: other people never see who is waitlisted or requested — only the host and the person', () => {
  const d = db(); const e = engineFor(d);
  for (const id of ['host', 'a', 'b', 'c']) person(d, id);
  const { activity } = e.activities.create('host', meetup({ capacity: 1 }));
  e.activities.join(activity.id, 'a'); e.activities.joinWaitlist(activity.id, 'b');
  const forC = snapshotFor(d, 'c').participations.filter((p) => p.activityId === activity.id);
  assert.deepEqual(forC.map((p) => p.userId), ['a']);
  assert.ok(snapshotFor(d, 'host').participations.some((p) => p.activityId === activity.id && p.status === 'waitlisted'));
  assert.ok(snapshotFor(d, 'b').participations.some((p) => p.userId === 'b' && p.status === 'waitlisted'));
});
