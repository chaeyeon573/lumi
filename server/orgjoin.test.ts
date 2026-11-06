/**
 * 동아리 가입 버튼 (2026-11-06 사장님: 모든 동아리에 "Ask to join") — 주 버튼이 무엇인지, 요청이 누구에게 가는지,
 * 운영진이 Lumi에 없으면 요청이 저장되는지, 동의 없이는 기록되지 않는지.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Snapshot } from '@core/api/types';
import type { Organization } from '@core/types';
import * as seed from '@core/data/seed.en';
import { t } from '@core/i18n';
import { createEngine } from '@core/api/engine';
import { orgJoinState } from '@core/lib/orgjoin';
import { CONSENT_VERSION, requestStatus } from '@core/lib/clubjoin';

const club = (extra: Partial<Organization> = {}): Organization => ({
  id: 'o_t', name: 'Test Running Club', description: 'Group runs', logo: { emoji: '', hue: 0 }, type: 'club', schoolId: 's_berkeley', verified: false,
  gallery: [], regularActivities: ['Group runs Tue/Thu 5pm'], notices: [], followerIds: [], memberIds: [], adminIds: [], applicantIds: [], ...extra,
});

test('orgJoinState: "Ask to join" for every club, with or without organizers on Lumi and whatever the directory says about recruiting', () => {
  assert.deepEqual(orgJoinState(club(), 'u_me'), { kind: 'ask', organizers: 0 });
  assert.deepEqual(orgJoinState(club({ recruitment: { title: 'Fall', period: 'Now', open: false } }), 'u_me'), { kind: 'ask', organizers: 0 });
  assert.deepEqual(orgJoinState(club({ adminIds: ['u_a', 'u_b'] }), 'u_me'), { kind: 'ask', organizers: 2 });
  assert.deepEqual(orgJoinState(club({ type: 'council' }), 'u_me'), { kind: 'follow', why: 'not_joinable' });
  assert.deepEqual(orgJoinState(club({ adminIds: ['u_me'] }), 'u_me'), { kind: 'admin' });
  assert.deepEqual(orgJoinState(club({ memberIds: ['u_me'] }), 'u_me'), { kind: 'member' });
  assert.deepEqual(orgJoinState(club({ applicantIds: ['u_me'] }), 'u_me'), { kind: 'applied' });
});

function setup(org: Organization) {
  const db: Snapshot = structuredClone({
    users: seed.users, schools: seed.schools, organizations: [org], activities: [], participations: [], posts: [], relationships: seed.relationships, proposals: [],
    chatRooms: [], notifications: [], reports: [], opportunities: [], opportunityIntents: [], timePolls: [], games: [], rides: [],
  });
  db.relationships.blocks = [];
  return { db, engine: createEngine({ db, t, demo: false, push: () => {} }) };
}

test('orgs.apply: with organizers on Lumi the request goes to every organizer (S091) and is delivered at once', () => {
  const { db, engine } = setup(club({ adminIds: ['u_lily', 'u_maya'] }));
  const patch = engine.orgs.apply('o_t', 'u_me', true);
  assert.deepEqual(db.organizations[0].applicantIds, ['u_me']);
  assert.deepEqual(patch.notifications?.map((n) => n.userId).sort(), ['u_lily', 'u_maya']);
  assert.ok(patch.notifications?.every((n) => n.link === '/orgs/o_t/requests'));
  assert.equal(requestStatus(db.organizations[0], 'u_me'), 'sent');
  // 두 번 눌러도 한 번
  engine.orgs.apply('o_t', 'u_me', true);
  assert.deepEqual(db.organizations[0].applicantIds, ['u_me']);
  assert.equal(db.notifications.length, 2);
});

test('orgs.apply: a directory club with no organizers saves the request (never "sent") and notifies nobody', () => {
  const { db, engine } = setup(club());
  const patch = engine.orgs.apply('o_t', 'u_me', CONSENT_VERSION);
  assert.deepEqual(db.organizations[0].applicantIds, ['u_me']);
  assert.equal(patch.notifications?.length, 0);
  const r = db.organizations[0].joinRequests?.[0];
  assert.equal(r?.userId, 'u_me');
  assert.equal(r?.consent, CONSENT_VERSION);
  assert.equal(r?.deliveredAt, undefined);
  assert.equal(requestStatus(db.organizations[0], 'u_me'), 'saved');
});

test('orgs.apply: without the consent the request is not recorded; councils are not joinable', () => {
  const { db, engine } = setup(club());
  assert.throws(() => engine.orgs.apply('o_t', 'u_me'), /organizers will see/i);
  assert.throws(() => engine.orgs.apply('o_t', 'u_me', 'yes'), /organizers will see/i);
  assert.deepEqual(db.organizations[0].applicantIds, []);
  assert.equal(db.organizations[0].joinRequests, undefined);
  const council = setup(club({ type: 'council' }));
  assert.throws(() => council.engine.orgs.apply('o_t', 'u_me', true), /follow/);
});

test('orgs.withdraw: the request and its consent are gone', () => {
  const { db, engine } = setup(club());
  engine.orgs.apply('o_t', 'u_me', true);
  engine.orgs.withdraw('o_t', 'u_me');
  assert.deepEqual(db.organizations[0].applicantIds, []);
  assert.deepEqual(db.organizations[0].joinRequests, []);
  assert.equal(requestStatus(db.organizations[0], 'u_me'), 'none');
});
