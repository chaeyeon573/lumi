/**
 * 채팅방·1:1 제안이 당사자에게만 내려가는지.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Snapshot } from '@core/api/types';
import type { ChatRoom } from '@core/types';
import * as seed from '@core/data/seed.en';
import { snapshotFor, patchFor } from './view';

const db = (): Snapshot => structuredClone({
  users: seed.users, schools: seed.schools, organizations: seed.organizations, activities: seed.activities,
  participations: seed.participations, posts: seed.posts, relationships: seed.relationships, proposals: seed.proposals,
  chatRooms: seed.chatRooms, notifications: seed.notifications, reports: [], opportunities: seed.opportunities,
  opportunityIntents: seed.opportunityIntents, timePolls: seed.timePolls, games: [],
});
const room = (id: string, memberIds: string[], lastReadAt: Record<string, string> = {}): ChatRoom =>
  ({ id, type: 'direct', memberIds, messages: [{ id: 'm1', senderId: memberIds[0], text: 'secret', createdAt: '2026-10-12T00:00:00Z' }], lastReadAt, createdAt: '2026-10-12T00:00:00Z' });

test('snapshot: only rooms and proposals the viewer is part of', () => {
  const d = db();
  d.chatRooms.push(room('r_ab', ['u_jimin', 'u_sua']));
  for (const u of d.users) {
    const s = snapshotFor(d, u.id);
    assert.ok(s.chatRooms.every((r) => r.memberIds.includes(u.id)), `${u.id} got someone else's room`);
    assert.ok(s.proposals.every((p) => p.fromId === u.id || p.toId === u.id), `${u.id} got someone else's proposal`);
  }
  assert.ok(!snapshotFor(d, 'u_me').chatRooms.some((r) => r.id === 'r_ab'));
  assert.ok(snapshotFor(d, 'u_sua').chatRooms.some((r) => r.id === 'r_ab'));
});

test('patch: outsiders get nothing, someone who left gets a removal', () => {
  const d = db();
  const r = room('r_ab', ['u_jimin', 'u_sua'], { u_jimin: 'x', u_sua: 'x', u_me: 'x' });
  assert.equal(patchFor({ chatRooms: [r] }, 'u_yuna', d), null);
  assert.deepEqual(patchFor({ chatRooms: [r] }, 'u_sua', d)?.chatRooms?.map((x) => x.id), ['r_ab']);
  const left = patchFor({ chatRooms: [r] }, 'u_me', d);
  assert.deepEqual(left?.chatRooms, []);
  assert.deepEqual(left?.removed?.chatRooms, ['r_ab']);
});

test('snapshot: a notification about an opportunity that is gone is dropped (it would open “not found”)', () => {
  const d = db();
  // 데모 계정(sample) — 예시 공고를 숨기지 않으니, 공고가 실제로 없어진 경우만 남는다
  d.users = d.users.map((u) => (u.id === 'u_me' ? { ...u, sample: true } : u));
  d.opportunities = d.opportunities.filter((o) => o.id !== 'op_scholarship');
  const ids = snapshotFor(d, 'u_me').notifications.map((n) => n.id);
  assert.ok(!ids.includes('nt9'), 'deadline notice for a removed listing');
  assert.ok(ids.includes('nt10') && ids.includes('nt1'), 'other notices stay');
});

test('meetup place: outsiders of an approval meetup get only the general area, members get the venue', () => {
  const d = db();
  const a = d.activities.find((x) => x.id === 'a_exhibit')!;
  assert.equal(a.joinPolicy, 'approval');
  const member = d.users.find((u) => u.id !== a.hostId && snapshotFor(d, u.id).activities.some((x) => x.id === a.id))!.id;
  d.participations.push({ id: 'p_member', activityId: a.id, userId: member, status: 'approved', createdAt: '2026-11-06T00:00:00Z' });
  const outsider = d.users.find((u) => u.id !== a.hostId && !d.participations.some((p) => p.activityId === a.id && p.userId === u.id)
    && snapshotFor(d, u.id).activities.some((x) => x.id === a.id))!;
  assert.ok(outsider, 'someone outside the meetup can see it');
  const seen = snapshotFor(d, outsider.id).activities.find((x) => x.id === a.id)!;
  // the list/detail screens still have a place to draw — just not the venue
  assert.ok(seen.place.name.length > 0);
  assert.notEqual(seen.place.name, a.place.name);
  assert.ok(!JSON.stringify(seen).includes(a.place.name), 'venue name leaked');
  assert.equal(seen.place.area, seen.place.name);
  assert.equal(seen.place.address, undefined);
  assert.ok(seen.place.lat !== a.place.lat || seen.place.lng !== a.place.lng, 'exact coordinates leaked');
  assert.ok(Math.abs(seen.place.lat - a.place.lat) <= 0.0015 + 1e-9 && Math.abs(seen.place.lng - a.place.lng) <= 0.0015 + 1e-9, 'still roughly in the right area');
  // host and approved participants get the exact venue
  assert.deepEqual(snapshotFor(d, a.hostId).activities.find((x) => x.id === a.id)!.place, a.place);
  assert.deepEqual(snapshotFor(d, member).activities.find((x) => x.id === a.id)!.place, a.place);
  // an open meetup shows its place to everyone (same rule as the screen)
  const open = d.activities.find((x) => x.joinPolicy === 'open' && x.hostId !== outsider.id && snapshotFor(d, outsider.id).activities.some((y) => y.id === x.id))!;
  assert.deepEqual(snapshotFor(d, outsider.id).activities.find((x) => x.id === open.id)!.place, open.place);
  // a pending applicant still only gets the area
  const pending = { id: 'p_pending', activityId: a.id, userId: outsider.id, status: 'pending' as const, createdAt: '2026-11-06T00:00:00Z' };
  d.participations.push(pending);
  assert.notEqual(snapshotFor(d, outsider.id).activities.find((x) => x.id === a.id)!.place.name, a.place.name);
  assert.ok(!JSON.stringify(patchFor({ activities: [a], participations: [pending] }, outsider.id, d)).includes(a.place.name));
  // getting approved sends the venue right away, even when the patch only carries the participation
  pending.status = 'approved' as never;
  const patched = patchFor({ participations: [pending] }, outsider.id, d);
  assert.deepEqual(patched?.activities?.find((x) => x.id === a.id)?.place, a.place);
});
