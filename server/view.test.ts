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
