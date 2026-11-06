/**
 * Groups — S026 Create a group, S091 Membership requests, S089 Explore without an account.
 *   - a student creates a group in their own school and becomes its admin; names don't collide with existing clubs
 *   - approval groups: the join request reaches the admins, admins approve / decline, the applicant hears only "you're in"
 *   - open groups: joining is immediate
 *   - only that group's admins may answer requests (RPC rule), and other members never see the applicant list
 *   - the public Explore payload has no people and no demo / user-made content
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Snapshot, OrgInput } from '@core/api/types';
import type { Opportunity, Organization } from '@core/types';
import * as seed from '@core/data/seed.en';
import { t } from '@core/i18n';
import { createEngine } from '@core/api/engine';
import { orgJoinState } from '@core/lib/orgjoin';
import { ruleAllows } from './together-rules';
import { orgRules, publicExploreFor } from './orgs';
import { patchFor } from './view';
import { SAMPLE_OPPORTUNITY_IDS, SAMPLE_ORG_IDS } from './samples';

function setup(orgs: Organization[] = [], opportunities: Opportunity[] = []) {
  const db: Snapshot = structuredClone({
    users: seed.users, schools: seed.schools, organizations: orgs, activities: [], participations: [], posts: [], relationships: seed.relationships, proposals: [],
    chatRooms: [], notifications: [], reports: [], opportunities, opportunityIntents: [], timePolls: [], games: [], rides: [],
  });
  return { db, engine: createEngine({ db, t, demo: false, push: () => {} }) };
}
const input = (extra: Partial<OrgInput> = {}): OrgInput => ({ name: 'Sunday Sketch Walks', description: 'We draw around campus on Sundays.', type: 'club', joinPolicy: 'approval', ...extra });

test('orgs.create: the creator becomes admin and member of a new, unverified group in their own school', () => {
  const { db, engine } = setup();
  const { org, patch } = engine.orgs.create('u_me', input());
  assert.equal(org.schoolId, 's_berkeley');
  assert.deepEqual(org.adminIds, ['u_me']);
  assert.deepEqual(org.memberIds, ['u_me']);
  assert.deepEqual(org.applicantIds, []);
  assert.equal(org.verified, false);
  assert.equal(org.joinPolicy, 'approval');
  assert.equal(org.createdBy, 'u_me');
  assert.equal(org.logo.emoji, 'SS'); // initials, never an emoji
  assert.equal(db.organizations.length, 1);
  assert.deepEqual(patch.organizations?.map((o) => o.id), [org.id]);
  assert.deepEqual(orgJoinState(org, 'u_me'), { kind: 'admin' });
});

test('orgs.create: refuses bad input with a reason, and never duplicates an existing group name in the school', () => {
  const band: Organization = { ...structuredClone(seed.organizations.find((o) => o.id === 'o_band')!) };
  const { db, engine } = setup([band]);
  assert.throws(() => engine.orgs.create('u_me', input({ name: 'ab' })), /3–60/);
  assert.throws(() => engine.orgs.create('u_me', input({ name: 'x'.repeat(61) })), /3–60/);
  assert.throws(() => engine.orgs.create('u_me', input({ description: 'x'.repeat(501) })), /500/);
  assert.throws(() => engine.orgs.create('u_me', input({ type: 'greek' as never })), /group type/);
  assert.throws(() => engine.orgs.create('u_me', input({ joinPolicy: 'invite' as never })), /join policy/);
  assert.throws(() => engine.orgs.create('u_me', input({ name: '  cal indie COLLECTIVE (band club) ' })), /already exists/);
  assert.equal(db.organizations.length, 1);
  // another school may use the same name
  engine.orgs.create('u_minjun', input({ name: band.name }));
  assert.equal(db.organizations.length, 2);
});

test('approval group: the request reaches the admins; approving makes a member and tells only the applicant', () => {
  const { db, engine } = setup();
  const { org } = engine.orgs.create('u_jimin', input());
  // no recruitment field — the join policy decides
  assert.deepEqual(orgJoinState(org, 'u_me'), { kind: 'apply', organizers: 1 });
  const p = engine.orgs.apply(org.id, 'u_me');
  assert.deepEqual(db.organizations[0].applicantIds, ['u_me']);
  assert.deepEqual(p.notifications?.map((n) => [n.userId, n.type]), [['u_jimin', 'participation_request']]);

  const r = engine.orgs.respondApplication(org.id, 'u_me', true);
  assert.deepEqual(db.organizations[0].applicantIds, []);
  assert.deepEqual(db.organizations[0].memberIds, ['u_jimin', 'u_me']);
  assert.deepEqual(r.notifications?.map((n) => [n.userId, n.type, n.link]), [['u_me', 'participation_approved', `/orgs/${org.id}`]]);
  assert.deepEqual(orgJoinState(db.organizations[0], 'u_me'), { kind: 'member' });
  // answering twice does nothing
  const again = engine.orgs.respondApplication(org.id, 'u_me', true);
  assert.equal(again.notifications, undefined);
  assert.deepEqual(db.organizations[0].memberIds, ['u_jimin', 'u_me']);
});

test('approval group: declining removes the request quietly (no notification) and the person may ask again', () => {
  const { db, engine } = setup();
  const { org } = engine.orgs.create('u_jimin', input());
  engine.orgs.apply(org.id, 'u_me');
  const before = db.notifications.length;
  const r = engine.orgs.respondApplication(org.id, 'u_me', false);
  assert.deepEqual(db.organizations[0].applicantIds, []);
  assert.deepEqual(db.organizations[0].memberIds, ['u_jimin']);
  assert.equal(r.notifications, undefined);
  assert.equal(db.notifications.length, before);
  assert.deepEqual(orgJoinState(db.organizations[0], 'u_me'), { kind: 'apply', organizers: 1 });
});

test('open group: joining is immediate and the admins get a "new member" note', () => {
  const { db, engine } = setup();
  const { org } = engine.orgs.create('u_jimin', input({ joinPolicy: 'open' }));
  assert.deepEqual(orgJoinState(org, 'u_me'), { kind: 'join' });
  const p = engine.orgs.apply(org.id, 'u_me');
  assert.deepEqual(db.organizations[0].memberIds, ['u_jimin', 'u_me']);
  assert.deepEqual(db.organizations[0].applicantIds, []);
  assert.deepEqual(p.notifications?.map((n) => n.userId), ['u_jimin']);
});

test('leave: a member leaves (still following); the last organizer can’t and is told why', () => {
  const { db, engine } = setup();
  const { org } = engine.orgs.create('u_jimin', input({ joinPolicy: 'open' }));
  engine.orgs.apply(org.id, 'u_me');
  db.organizations[0].followerIds.push('u_me');
  engine.orgs.leave(org.id, 'u_me');
  assert.deepEqual(db.organizations[0].memberIds, ['u_jimin']);
  assert.deepEqual(db.organizations[0].followerIds, ['u_me']);
  assert.deepEqual(orgJoinState(db.organizations[0], 'u_me'), { kind: 'join' });
  // leaving twice does nothing
  engine.orgs.leave(org.id, 'u_me');
  assert.deepEqual(db.organizations[0].memberIds, ['u_jimin']);
  // the only organizer can't leave — the reason is a sentence a person can read
  assert.throws(() => engine.orgs.leave(org.id, 'u_jimin'), /only organizer/);
  assert.deepEqual(db.organizations[0].adminIds, ['u_jimin']);
  assert.deepEqual(db.organizations[0].memberIds, ['u_jimin']);
  // with a second organizer, either one may leave
  db.organizations[0].adminIds.push('u_me'); db.organizations[0].memberIds.push('u_me');
  engine.orgs.leave(org.id, 'u_jimin');
  assert.deepEqual(db.organizations[0].adminIds, ['u_me']);
  assert.deepEqual(db.organizations[0].memberIds, ['u_me']);
  assert.throws(() => engine.orgs.leave(org.id, 'u_me'), /only organizer/);
  // RPC: only as yourself
  const rules = orgRules(() => db);
  assert.equal(ruleAllows(rules.leave, 'u_me', [org.id, 'u_me']), true);
  assert.equal(ruleAllows(rules.leave, 'u_me', [org.id, 'u_jimin']), false);
});

test('RPC rules: only that group’s admins answer requests; create and apply only as yourself', () => {
  const { db, engine } = setup();
  const { org } = engine.orgs.create('u_jimin', input());
  const rules = orgRules(() => db);
  assert.equal(ruleAllows(rules.respondApplication, 'u_jimin', [org.id, 'u_me', true]), true);
  assert.equal(ruleAllows(rules.respondApplication, 'u_me', [org.id, 'u_me', true]), false);
  assert.equal(ruleAllows(rules.respondApplication, 'u_jimin', ['o_missing', 'u_me', true]), false);
  assert.equal(ruleAllows(rules.create, 'u_me', ['u_me', input()]), true);
  assert.equal(ruleAllows(rules.create, 'u_me', ['u_jimin', input()]), false);
  assert.equal(ruleAllows(rules.apply, 'u_me', [org.id, 'u_me']), true);
  assert.equal(ruleAllows(rules.apply, 'u_me', [org.id, 'u_jimin']), false);
});

test('view: members who are not admins never see who else asked to join', () => {
  const { db, engine } = setup();
  const { org } = engine.orgs.create('u_jimin', input());
  engine.orgs.apply(org.id, 'u_me');
  engine.orgs.apply(org.id, 'u_dohyun');
  const toAdmin = patchFor({ organizations: [db.organizations[0]] }, 'u_jimin', db)!;
  const toApplicant = patchFor({ organizations: [db.organizations[0]] }, 'u_me', db)!;
  const toOther = patchFor({ organizations: [db.organizations[0]] }, 'u_yuna', db)!;
  assert.deepEqual(toAdmin.organizations?.[0].applicantIds, ['u_me', 'u_dohyun']);
  assert.deepEqual(toApplicant.organizations?.[0].applicantIds, ['u_me']);
  assert.deepEqual(toOther.organizations?.[0].applicantIds, []);
});

// ─── S089 public Explore ───────────────────────────────────────────────────────
const listing = (extra: Partial<Opportunity>): Opportunity => ({
  id: 'op_x', type: 'event', title: 'Open house', host: 'Career Center', description: 'Come by.', cover: { emoji: '', hue: 0 },
  date: '2099-01-10', eligibility: 'All students', sourceUrl: 'https://career.berkeley.edu/x', sourceLabel: 'Career Center', tags: [], interests: [], goals: ['internship'],
  schoolId: 's_berkeley', lastVerified: '2026-11-01', createdAt: '2026-11-01T00:00:00Z',
  qna: [{ id: 'c1', authorId: 'u_me', text: 'Is it free?', createdAt: '2026-11-01T00:00:00Z' }], reviews: [{ id: 'r1', authorId: 'u_me', text: 'Good', createdAt: '2026-11-01T00:00:00Z' }],
  ...extra,
});

test('public explore: only open, official listings and the school’s club directory — no people, no samples, no user-made content', () => {
  const sampleOrgId = [...SAMPLE_ORG_IDS][0];
  const sampleOppId = [...SAMPLE_OPPORTUNITY_IDS][0];
  const base = (id: string, extra: Partial<Organization> = {}): Organization => ({
    id, name: `Club ${id}`, description: 'About', logo: { emoji: '', hue: 0 }, type: 'club', schoolId: 's_berkeley', verified: false,
    gallery: [{ emoji: '', hue: 0, caption: 'us', url: 'https://x/y.jpg' }], regularActivities: ['Tue 5pm'], notices: [{ id: 'n', title: 'Hi', body: 'b', createdAt: '' }],
    followerIds: ['u_me'], memberIds: ['u_jimin'], adminIds: ['u_yuna'], applicantIds: ['u_dohyun'],
    links: [{ label: 'Website', url: 'https://club.example.org' }, { label: 'CalLink', url: 'https://callink.berkeley.edu/organization/x' }], ...extra,
  });
  const orgs = [
    base('o_a'), base('o_dept', { type: 'department' }), base('o_made', { createdBy: 'u_me' }), base('o_other', { schoolId: 's_stanford' }), base(sampleOrgId),
  ];
  const opps = [
    listing({ id: 'op_event' }),
    listing({ id: 'op_t_intern', type: 'internship', date: undefined, deadline: '2099-02-01', schoolId: undefined }),
    listing({ id: 'op_past', date: '2001-01-01' }),
    listing({ id: 'op_closed', type: 'scholarship', date: undefined, deadline: '2001-01-01' }),
    listing({ id: 'op_shared', sourceLabel: 'Shared link' }),
    listing({ id: 'op_nolink', sourceUrl: '' }),
    listing({ id: 'op_stanford', schoolId: 's_stanford' }),
    listing({ id: 'op_activity', type: 'activity' }),
    listing({ id: sampleOppId }),
  ];
  const { db } = setup(orgs, opps);
  const out = publicExploreFor(db, 's_berkeley');
  assert.deepEqual(out.school, { id: 's_berkeley', name: db.schools.find((s) => s.id === 's_berkeley')!.name });
  assert.deepEqual(out.events.map((o) => o.id), ['op_event']);
  assert.deepEqual(out.opportunities.map((o) => o.id), ['op_t_intern']);
  assert.deepEqual(out.clubs.map((o) => o.id), ['o_a']);
  for (const o of [...out.events, ...out.opportunities]) { assert.deepEqual(o.qna, []); assert.deepEqual(o.reviews, []); }
  const c = out.clubs[0];
  assert.deepEqual([c.followerIds, c.memberIds, c.adminIds, c.applicantIds, c.notices, c.gallery], [[], [], [], [], [], []]);
  assert.deepEqual(c.links?.map((l) => l.label), ['Website']); // login-only CalLink is dropped
  assert.ok(!JSON.stringify(out).includes('u_'), 'no user id anywhere in the public payload');
  // the stored data is untouched
  assert.equal(db.organizations[0].memberIds.length, 1);
  // unknown / not-open school
  assert.equal(publicExploreFor(db, 's_nowhere').school, null);
});
