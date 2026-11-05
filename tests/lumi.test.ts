import test from 'node:test';
import assert from 'node:assert/strict';
import { setPlatform } from '../packages/core/src/platform';
const memory = new Map<string, string>();
setPlatform({
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => {
    memory.set(k, v);
  },
  removeItem: (k) => {
    memory.delete(k);
  },
  reload: () => {},
  locale: () => 'en-US',
  asset: (p) => p,
  env: () => undefined,
});
const { loadSeed } = await import('../server/seed');
const { createEngine } = await import('../packages/core/src/api/engine');
const { currentOpportunities } =
  await import('../packages/core/src/lib/content-truth');
const { classmates, friendsOf } =
  await import('../packages/core/src/lib/relations');
const { snapshotFor } = await import('../server/view');
const { socialRoute } = await import('../packages/core/src/brand');
const seed = await import('../packages/core/src/data/seed.en');
import type {
  ActivityInput,
  RegisterInput,
  Snapshot,
} from '../packages/core/src/api/types';
import type { Organization, User } from '../packages/core/src/types';
async function fixture() {
  process.env.SEED = 'base';
  const db = await loadSeed();
  const engine = createEngine({ db, t: (x) => x, demo: false, push: () => {} });
  const template = seed.users[0];
  const school = db.schools[0];
  const input: RegisterInput = {
    ...template,
    schoolId: school.id,
    role: 'undergraduate',
    department: '',
    year: 2026,
    emailVerified: false,
    showSchool: true,
    showDepartment: false,
    locationPermission: 'undecided',
    notifications: false,
  };
  const a = engine.register({ ...input, nickname: 'Test host' }),
    b = engine.register({ ...input, nickname: 'Test guest' }),
    c = engine.register({ ...input, nickname: 'Test third' });
  a.dataOrigin = b.dataOrigin = c.dataOrigin = 'registered';
  const activity: ActivityInput = {
    kind: 'personal',
    category: 'study',
    title: 'Test plan',
    description: '',
    cover: { emoji: '', hue: 220 },
    date: '2099-01-01',
    startTime: '10:00',
    endTime: '11:00',
    place: { name: 'Test place', lat: 0, lng: 0 },
    capacity: 1,
    fee: 0,
    visibility: 'public',
    visibilityTargets: [],
    joinPolicy: 'open',
    invitedIds: [],
  };
  return { db, engine, a, b, c, activity };
}
test('fresh real seed has no fictional social or organization records', async () => {
  process.env.SEED = 'base';
  const db = await loadSeed();
  for (const key of [
    'users',
    'organizations',
    'activities',
    'posts',
    'opportunities',
    'participations',
  ] as const)
    assert.equal(db[key].length, 0, key);
  assert(db.schools.length > 0);
});
test('full seed is explicit and tagged demo', async () => {
  process.env.SEED = 'full';
  const db = await loadSeed();
  assert(db.users.length > 1);
  assert(db.users.every((u) => u.dataOrigin === 'demo'));
  delete process.env.SEED;
});
test('source filtering rejects unverified, expired, future verification and duplicates', () => {
  const now = new Date('2026-11-05T10:00:00Z');
  const item = {
    ...seed.opportunities[0],
    sourceVerified: true,
    sourceUrl: 'https://example.edu/opportunity',
    lastVerified: '2026-11-01',
    deadline: '2026-12-01',
  };
  assert.equal(
    currentOpportunities(
      [
        item,
        item,
        { ...item, id: 'expired', deadline: '2020-01-01' },
        { ...item, id: 'unverified', sourceVerified: false },
        { ...item, id: 'future', lastVerified: '2099-01-01' },
      ],
      false,
      now,
    ).length,
    1,
  );
});
test('private group creation and join reject followers; approval grants membership', async () => {
  const { db, engine, a, b, activity } = await fixture();
  const org: Organization = {
    id: 'test-org',
    name: 'Private group',
    type: 'greek',
    verified: true,
    logo: { emoji: '', hue: 220 },
    description: '',
    gallery: [],
    regularActivities: [],
    notices: [],
    memberIds: [a.id],
    adminIds: [a.id],
    followerIds: [b.id],
    applicantIds: [],
    joinPolicy: 'open',
  };
  db.organizations.push(org);
  assert.throws(
    () =>
      engine.activities.create(b.id, {
        ...activity,
        visibility: 'group',
        orgId: org.id,
      }),
    /membership/,
  );
  engine.orgs.apply(org.id, b.id);
  assert(
    !org.memberIds.includes(b.id),
    'institutional open label cannot self-verify',
  );
  const created = engine.activities.create(a.id, {
    ...activity,
    visibility: 'group',
    orgId: org.id,
  }).activity;
  assert.throws(() => engine.activities.join(created.id, b.id), /private/);
  assert.throws(() => engine.orgs.review(org.id, b.id, b.id, true), /admins/);
  engine.orgs.review(org.id, a.id, b.id, true);
  assert(org.memberIds.includes(b.id));
  assert.equal(
    engine.activities.join(created.id, b.id).participations?.[0].status,
    'approved',
  );
});
test('full meetups add to waitlist without consuming another seat; approval cannot overfill', async () => {
  const { db, engine, a, b, c, activity } = await fixture();
  const created = engine.activities.create(a.id, activity).activity;
  engine.activities.join(created.id, b.id);
  const waiting = engine.activities.join(created.id, c.id).participations![0];
  assert.equal(waiting.status, 'waitlisted');
  assert.equal(
    db.participations.filter((p) => p.status === 'approved').length,
    1,
  );
  assert.throws(() => engine.activities.approve(waiting.id), /full/);
  engine.activities.cancel(created.id, c.id);
  assert.equal(waiting.status, 'cancelled');
});
test('UG/graduate friendship and unrestricted meetups work across status', async () => {
  const { engine, a, b, activity, db } = await fixture();
  if (b.affiliation.type === 'university') b.affiliation.role = 'graduate';
  const req = engine.relationships.sendFriendRequest(a.id, b.id);
  const id = req.relationships!.friendRequests[0].id;
  assert.equal(friendsOf(db, a.id).length, 0);
  engine.relationships.respondFriendRequest(id, true);
  assert.deepEqual(friendsOf(db, a.id), [b.id]);
  const created = engine.activities.create(a.id, activity).activity;
  assert.equal(
    engine.activities.join(created.id, b.id).participations![0].status,
    'approved',
  );
});
test('explicit audience restrictions enforced by engine', async () => {
  const { engine, a, b, activity } = await fixture();
  if (b.affiliation.type === 'university') b.affiliation.role = 'graduate';
  const created = engine.activities.create(a.id, {
    ...activity,
    attendeeRoles: ['undergraduate'],
  }).activity;
  assert.throws(
    () => engine.activities.join(created.id, b.id),
    /status restriction/,
  );
});
test('classmate discovery requires consent and visibility', async () => {
  const { db, a, b } = await fixture();
  a.timetable = b.timetable = [
    {
      id: 'c',
      name: 'Test class',
      day: 0,
      start: '10:00',
      end: '11:00',
      hue: 220,
    },
  ];
  assert.equal(classmates(db, a, 'Test class', () => true).length, 0);
  b.classmateOptIn = true;
  assert.equal(classmates(db, a, 'Test class', () => true).length, 1);
  assert.equal(classmates(db, a, 'Test class', () => false).length, 0);
});
test('server snapshot hides private posts, chat, room, housing and memberships', async () => {
  const { db, engine, a, b, activity } = await fixture();
  a.fieldVisibility.living = 'private';
  a.fieldVisibility.timetable = 'private';
  a.living = { residence: 'offcampus', zone: 'Private' };
  a.timetable = [
    {
      id: 'c',
      name: 'Private course',
      day: 0,
      start: '10:00',
      end: '11:00',
      hue: 220,
      room: 'Secret',
    },
  ];
  const created = engine.activities.create(a.id, {
    ...activity,
    visibility: 'private',
  }).activity;
  db.organizations.push({
    id: 'g',
    name: 'Group',
    type: 'greek',
    verified: true,
    logo: { emoji: '', hue: 0 },
    description: '',
    gallery: [],
    regularActivities: [],
    notices: [],
    memberIds: [a.id],
    adminIds: [a.id],
    followerIds: [],
    applicantIds: [],
  });
  const out = snapshotFor(db, b.id);
  assert(!out.activities.some((x) => x.id === created.id));
  assert.equal(out.chatRooms.length, 0);
  assert.equal(out.users.find((u) => u.id === a.id)?.living, undefined);
  assert.deepEqual(out.users.find((u) => u.id === a.id)?.timetable, []);
  assert.deepEqual(out.organizations[0].memberIds, []);
});
test('legacy root links map into the five-tab IA, details are preserved', () => {
  assert.equal(
    socialRoute('/people?tab=search'),
    '/social?section=people&tab=search',
  );
  assert.equal(socialRoute('/meet'), '/social?section=meetups');
  assert.equal(socialRoute('/feed'), '/social?section=feed');
  assert.equal(socialRoute('/feed/post-1'), '/feed/post-1');
  assert.equal(socialRoute('/timetable?add=1'), '/schedule?add=1');
});
test('mock demo is opt-in and separate from real local records', async () => {
  memory.clear();
  const { mockApi } = await import('../packages/core/src/api/mock');
  const publicBefore = await mockApi.publicContent();
  assert.equal(publicBefore.organizations.length, 0);
  assert.equal(await mockApi.auth.session(), null);
  const demo = await mockApi.auth.loginDemo();
  assert.equal(demo.dataOrigin, 'demo');
  assert((await mockApi.bootstrap(demo.id)).users.length > 1);
  await mockApi.auth.logout();
  assert.equal(await mockApi.auth.session(), null);
  assert.equal((await mockApi.publicContent()).opportunities.length, 0);
});
