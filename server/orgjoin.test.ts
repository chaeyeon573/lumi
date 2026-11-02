/**
 * 동아리 가입 버튼 — 화면의 주 버튼이 상태와 맞는지('모집 안 함'인데 '가입 문의'가 크게 있지 않게),
 * 가입 요청이 누구에게 가는지(Lumi에 있는 운영진 알림), 받을 사람이 없으면 보내지 않는지.
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

const club = (extra: Partial<Organization> = {}): Organization => ({
  id: 'o_t', name: 'Test Running Club', description: 'Group runs', logo: { emoji: '', hue: 0 }, type: 'club', schoolId: 's_berkeley', verified: false,
  gallery: [], regularActivities: ['Group runs Tue/Thu 5pm'], notices: [], followerIds: [], memberIds: [], adminIds: [], applicantIds: [], ...extra,
});

test('orgJoinState: follow is the main action unless the club recruits and has organizers on Lumi', () => {
  assert.deepEqual(orgJoinState(club(), 'u_me'), { kind: 'follow', why: 'not_recruiting' });
  assert.deepEqual(orgJoinState(club({ adminIds: ['u_a'] }), 'u_me'), { kind: 'follow', why: 'not_recruiting' });
  assert.deepEqual(orgJoinState(club({ recruitment: { title: 'Fall', period: 'Now', open: false }, adminIds: ['u_a'] }), 'u_me'), { kind: 'follow', why: 'not_recruiting' });
  assert.deepEqual(orgJoinState(club({ recruitment: { title: 'Fall', period: 'Now', open: true } }), 'u_me'), { kind: 'follow', why: 'no_organizers' });
  assert.deepEqual(orgJoinState(club({ recruitment: { title: 'Fall', period: 'Now', open: true }, adminIds: ['u_a', 'u_b'] }), 'u_me'), { kind: 'apply', organizers: 2 });
  assert.deepEqual(orgJoinState(club({ adminIds: ['u_me'] }), 'u_me'), { kind: 'admin' });
  assert.deepEqual(orgJoinState(club({ memberIds: ['u_me'] }), 'u_me'), { kind: 'member' });
  assert.deepEqual(orgJoinState(club({ applicantIds: ['u_me'] }), 'u_me'), { kind: 'applied' });
});

function setup(org: Organization) {
  const db: Snapshot = structuredClone({
    users: seed.users, schools: seed.schools, organizations: [org], activities: [], participations: [], posts: [], relationships: seed.relationships, proposals: [],
    chatRooms: [], notifications: [], reports: [], opportunities: [], opportunityIntents: [], timePolls: [], games: [], rides: [],
  });
  return { db, engine: createEngine({ db, t, demo: false, push: () => {} }) };
}

test('orgs.apply: the join request goes to every organizer on Lumi as a notification that opens the applicant', () => {
  const { db, engine } = setup(club({ recruitment: { title: 'Fall', period: 'Now', open: true }, adminIds: ['u_lily', 'u_maya'] }));
  const patch = engine.orgs.apply('o_t', 'u_me');
  assert.deepEqual(db.organizations[0].applicantIds, ['u_me']);
  assert.deepEqual(patch.notifications?.map((n) => n.userId).sort(), ['u_lily', 'u_maya']);
  assert.ok(patch.notifications?.every((n) => n.link === '/users/u_me'));
  // 두 번 눌러도 한 번
  engine.orgs.apply('o_t', 'u_me');
  assert.deepEqual(db.organizations[0].applicantIds, ['u_me']);
  assert.equal(db.notifications.length, 2);
});

test('orgs.apply: refuses (with a readable reason) when nobody would receive it or the club is not recruiting', () => {
  for (const org of [club(), club({ adminIds: ['u_lily'] }), club({ recruitment: { title: 'Fall', period: 'Now', open: true } })]) {
    const { db, engine } = setup(org);
    assert.throws(() => engine.orgs.apply('o_t', 'u_me'), /join requests|organizers/);
    assert.deepEqual(db.organizations[0].applicantIds, []);
    assert.equal(db.notifications.length, 0);
  }
});
