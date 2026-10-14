/**
 * Account deletion (POST /api/auth/delete-account) — the person's data is gone from every collection and
 * store, other viewers' screens drop them via server/view.ts patches, demo/sample accounts and signed-out
 * callers are refused.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express, { type Response, type NextFunction, type Request } from 'express';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Patch, Snapshot } from '@core/api/types';
import type { ChatRoom, Game, ID, User } from '@core/types';
import * as seed from '@core/data/seed.en';
import { t } from '@core/i18n';
import { createEngine } from '@core/api/engine';
import { createRidesEngine } from '@core/api/rides';
import { createPlansEngine } from '@core/api/plans';
import { DELETED_REPORTER, eraseUser } from '@core/lib/account';
import { mergePatch } from '@core/store/merge';
import type { GymAlert } from '@core/lib/gym';
import { snapshotFor, patchFor } from './view';
import { FileStore } from './store';
import { registerAccountRoutes, PROTECTED_IDS } from './account';
import { createCampusData } from './campus-api';
import { createDining, type FavoriteDoc } from './dining';
import { createGym } from './gym';
import { createPush } from './push';
import { hashToken } from './plans';
import type { SeatStatusDoc, SeatWatchDoc } from './seats';

const Z = 'u_zdel_7f3a9c';      // the person deleting their account
const NICK = 'Zephyrine';
const LILY = 'u_sua';           // sample profile, Berkeley
const MAYA = 'u_jimin';         // sample profile, Berkeley
const KEEP = 'u_zkeep_9d1e';     // a real account that keeps its push token
const EMAIL = 'zephyrine@berkeley.edu';
const TODAY = new Date().toISOString().slice(0, 10);
const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

/** Everything in `x` as text, for "is this person still anywhere?" checks */
const text = (x: unknown) => JSON.stringify(x);

async function setup() {
  const db: Snapshot = structuredClone({
    users: seed.users, schools: seed.schools, organizations: seed.organizations, activities: seed.activities,
    participations: seed.participations, posts: seed.posts, relationships: seed.relationships, proposals: seed.proposals,
    chatRooms: seed.chatRooms, notifications: seed.notifications, reports: [], opportunities: seed.opportunities,
    opportunityIntents: seed.opportunityIntents, timePolls: seed.timePolls, games: [], rides: [],
  });
  for (const u of db.users) u.sample = true; // server/demo.ts migrateDemo marks every seed profile
  const me = structuredClone(db.users.find((u) => u.id === 'u_me')!) as User;
  const z: User = { ...me, id: Z, nickname: NICK, sample: undefined, bio: 'zephyrine-bio', dailyAnswer: { questionId: 'q1', answer: 'yes', date: TODAY }, partnerSearch: [{ key: 's_berkeley|CS 61A|Fall 2026', code: 'CS 61A', term: 'Fall 2026', note: 'zephyrine pairs', since: TODAY }], photos: ['photos/c_cafe_laptop.jpg'], createdAt: new Date().toISOString() };
  db.users.push(z);
  // another real (non-sample) account with an iPhone — sample profiles can't hold push tokens (server/push.ts)
  db.users.push({ ...me, id: KEEP, nickname: 'Keeper', sample: undefined, createdAt: new Date().toISOString() });

  const engine = createEngine({ db, t, demo: false, push: () => {} });
  const rides = createRidesEngine({ db, t, demo: false, push: () => {} }, { today: () => TODAY });
  const plans = createPlansEngine({ db, t, demo: false, push: () => {} }, { hash: hashToken });

  // ── Z's footprint across every collection ────────────────────────────────
  // an activity Z hosts with Lily in it (→ cancelled, Lily notified) and one Z joined
  const hosted = engine.activities.create(Z, { kind: 'personal', category: 'coffee', title: 'Zephyrine coffee hour', description: 'x', cover: { emoji: '☕', hue: 10 }, date: day(2), startTime: '15:00', endTime: '16:00', place: { name: 'Free Speech Cafe', lat: 0, lng: 0 }, capacity: 6, fee: 0, joinPolicy: 'open', visibility: 'school' }).activity;
  engine.activities.join(hosted.id, LILY);
  const other = engine.activities.create(MAYA, { kind: 'personal', category: 'study', title: 'Maya study', description: 'x', cover: { emoji: '📖', hue: 10 }, date: day(3), startTime: '15:00', endTime: '16:00', place: { name: 'Moffitt', lat: 0, lng: 0 }, capacity: 6, fee: 0, joinPolicy: 'open', visibility: 'school', invitedIds: [Z] }).activity;
  engine.activities.join(other.id, LILY);
  engine.activities.comment(other.id, Z, 'zephyrine was here');
  const otherRoom = db.chatRooms.find((r) => r.activityId === other.id)!;
  engine.chats.send(otherRoom.id, Z, 'hi from zephyrine');
  engine.chats.send(otherRoom.id, LILY, 'hi all');
  // a Lumi study group Z was invited to (hosted by Maya)
  db.activities.push({ ...structuredClone(other), id: 'a_sg_test', hostId: MAYA, studyGroup: { key: 'k', code: 'CS 61A', term: 'Fall 2026', invitedIds: [MAYA, LILY, Z], responses: { [MAYA]: 'in', [Z]: 'in' }, preferred: { [Z]: { day: 1, start: '10:00', end: '11:00' } }, alternatives: [], status: 'suggested' }, comments: [] });
  // posts: Z's own, and a comment/like/save/tag on Maya's
  engine.posts.create(Z, { text: 'zephyrine post', media: [], tags: [], visibility: 'school' });
  const mayaPost = engine.posts.create(MAYA, { text: 'maya post', media: [], tags: [], visibility: 'school', taggedUserIds: [Z] }).post;
  engine.posts.comment(mayaPost.id, Z, 'nice — zephyrine');
  engine.posts.toggleLike(mayaPost.id, Z); engine.posts.toggleSave(mayaPost.id, Z);
  // relationships in both directions
  engine.relationships.toggleFollow(Z, LILY, 'user');
  engine.relationships.toggleFollow(MAYA, Z, 'user');
  engine.relationships.toggleLike(LILY, Z);
  engine.relationships.sendFriendRequest(Z, 'u_yuna');
  db.relationships.friends.push({ a: Z, b: MAYA, since: TODAY });
  engine.relationships.block(Z, 'u_dohyun');
  const org = db.organizations.find((o) => o.schoolId === 's_berkeley')!;
  engine.relationships.toggleFollow(Z, org.id, 'org');
  engine.orgs.apply(org.id, Z);
  // proposal, 1:1 chat, ice-breaker game (with its 1:1 room)
  engine.proposals.create(Z, LILY, { category: 'coffee', message: 'coffee? — zephyrine', when: 'tomorrow' });
  const dm = engine.chats.openDirect(Z, MAYA).room;
  engine.chats.send(dm.id, Z, 'secret from zephyrine'); engine.chats.send(dm.id, MAYA, 'reply');
  const game: Game = { id: 'g_test', kind: 'hot_take', fromId: LILY, toId: Z, round: 1, status: 'done', result: 'agree', statement: 'x', reaction: 'agree', roomId: dm.id, createdAt: TODAY };
  db.games.push(game);
  // opportunities: intent, saved, Q&A
  const opp = db.opportunities[0];
  engine.opportunities.setIntent(opp.id, Z, 'going');
  engine.opportunities.ask(opp.id, Z, 'question from zephyrine');
  // a vote on Lily's profile poll
  const lily = db.users.find((u) => u.id === LILY)!;
  lily.poll = { questionId: 'p', options: ['a', 'b'], ownChoice: 0, votes: { [Z]: 1, [MAYA]: 0 } };
  // plans: Z hosts one Lily answered, Z answered Maya's
  const zPlan = plans.create(Z, { title: 'Zephyrine boba', mode: 'fixed', place: { name: 'Asha', lat: 0, lng: 0 }, options: [{ date: day(3), startTime: '14:00', endTime: '15:00' }] }).poll;
  plans.respond(zPlan.id, LILY, { rsvp: 'going' });
  const mayaPlan = plans.create(MAYA, { title: 'Maya dinner', mode: 'fixed', place: { name: 'Imm Thai', lat: 0, lng: 0 }, options: [{ date: day(3), startTime: '18:00', endTime: '19:00' }] }).poll;
  plans.respond(mayaPlan.id, Z, { rsvp: 'going' });
  // rides: Z hosts one Lily joined, Z joined Maya's
  const zRide = rides.create(Z, { kind: 'driving', from: 'unit2', to: 'sfo', date: day(5), start: '09:00', end: '09:30', seats: 3 }).ride;
  rides.join(zRide.id, LILY);
  const mayaRide = rides.create(MAYA, { kind: 'splitting', from: 'unit1', to: 'oak', date: day(6), start: '09:00', end: '09:30', seats: 3 }).ride;
  rides.join(mayaRide.id, Z);
  // reports: one Z filed, one about Z
  engine.reports.create(Z, 'user', 'u_dohyun', 'spam');
  engine.reports.create(LILY, 'user', Z, 'rude in chat');
  // a notification to Z and one to Maya about Z
  engine.notify(Z, { type: 'comment', title: 'hi', body: 'x', link: '/' });
  engine.notify(MAYA, { type: 'follow', title: 'New follower', body: `${NICK} started following you.`, link: `/users/${Z}` });

  // ── store: snapshot + everything outside it ──────────────────────────────
  const file = path.join(mkdtempSync(path.join(tmpdir(), 'lumi-account-')), 'db.json');
  const store = new FileStore(file); await store.init();
  await store.replaceAll(db);
  await store.createAccount({ email: EMAIL, userId: Z, createdAt: TODAY });
  await store.createSession({ token: 'tok_z', userId: Z, createdAt: TODAY });
  await store.createSession({ token: 'tok_z2', userId: Z, createdAt: TODAY });
  await store.createSession({ token: 'tok_demo', userId: 'u_me', createdAt: TODAY });
  await store.createSession({ token: 'tok_lily', userId: LILY, createdAt: TODAY });
  await store.setCode({ email: EMAIL, code: '123456', expiresAt: new Date(Date.now() + 60000).toISOString() });
  await store.addAiLog({ id: 'ai1', kind: 'ask', userId: Z, input: 'where is zephyrine', output: 'x', ok: true, createdAt: TODAY });
  await store.addAiLog({ id: 'ai2', kind: 'starters', userId: MAYA, input: Z, output: 'ask about zephyrine', ok: true, createdAt: TODAY });
  await store.addAiLog({ id: 'ai3', kind: 'ask', userId: MAYA, input: 'gym?', output: 'x', ok: true, createdAt: TODAY });
  await store.addFeedback({ id: 'fb1', userId: Z, page: '/', message: 'zephyrine feedback', createdAt: TODAY });
  const watch: SeatWatchDoc = { id: `sw_${Z}_cs61a`, userId: Z, schoolId: 's_berkeley', courseId: 'c1', code: 'CS 61A', title: 'x', term: 'Fall 2026', url: 'https://example.edu/cs61a', createdAt: TODAY };
  await store.putDocs('seatWatches', [watch, { ...watch, id: `sw_${MAYA}_cs61a`, userId: MAYA } as SeatWatchDoc]);
  await store.putDocs('seatStatus', [{ id: 'ss_cs61a', url: watch.url, schoolId: 's_berkeley', term: 'Fall 2026', code: 'CS 61A', title: 'x', notified: { [Z]: { at: TODAY, kind: 'open' }, [MAYA]: { at: TODAY, kind: 'open' } } } as unknown as SeatStatusDoc]);
  await store.putDocs('diningFavorites', [{ id: `df_${Z}`, userId: Z, schoolId: 's_berkeley', dishes: [{ key: 'pho', name: 'Pho', addedAt: TODAY }], notified: {} } as FavoriteDoc]);
  const alert = { id: `ga_${Z}_d1`, userId: Z, schoolId: 's_berkeley', displayId: 'd1', below: 40, days: [1], start: 600, end: 1200, createdAt: TODAY } as unknown as GymAlert;
  await store.putDocs('gymAlerts', [alert]);

  const campus = createCampusData(store); await campus.load();
  const notify = () => {};
  const userExists = (id: ID) => db.users.some((u) => u.id === id);
  const dining = createDining({ store, notify, userExists }); await dining.load();
  const gym = createGym({ store, notify, userExists }); await gym.load();
  const push = createPush({ store, db: () => db, fetch: (async () => { throw new Error('no network in tests'); }) as typeof fetch, log: () => {} }); await push.load();
  await push.register(Z, 'ExponentPushToken[zdel-phone-0001]', 'ios', '1.0.0');
  await push.register(KEEP, 'ExponentPushToken[keep-phone-0001]', 'ios', '1.0.0');

  // ── server: the same auth rule as server/index.ts ────────────────────────
  const broadcasts: Patch[] = []; const disconnected: ID[] = [];
  const app = express(); app.use(express.json());
  const auth = async (req: Request & { userId?: ID }, _res: Response, next: NextFunction) => {
    const h = req.headers.authorization ?? ''; const token = h.startsWith('Bearer ') ? h.slice(7) : undefined;
    if (token) { const s = await store.findSession(token); if (s && db.users.some((u) => u.id === s.userId)) req.userId = s.userId; }
    next();
  };
  registerAccountRoutes(app, {
    db: () => db, store, auth, broadcast: (p) => broadcasts.push(p), disconnect: (id) => disconnected.push(id),
    forget: [(id) => campus.forgetUser(id), (id) => dining.forgetUser(id), (id) => gym.forgetUser(id), (id) => push.forgetUser(id)],
  });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const del = async (token?: string, confirm: unknown = 'DELETE') => {
    const r = await fetch(`${base}/api/auth/delete-account`, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ confirm }) });
    return { status: r.status, body: await r.json() as { ok?: boolean; error?: string; deleted?: Record<string, number> } };
  };
  return { db, store, file, server, del, broadcasts, disconnected, campus, dining, gym, push, ids: { hosted: hosted.id, other: other.id, otherRoom: otherRoom.id, dm: dm.id, zPlan: zPlan.id, mayaPlan: mayaPlan.id, zRide: zRide.id, mayaRide: mayaRide.id, mayaPost: mayaPost.id, org: org.id, opp: opp.id } };
}

/** db without the reports that are about Z (those are kept on purpose) */
const withoutReportsAboutZ = (s: Snapshot) => ({ ...s, reports: s.reports.filter((r) => r.targetId !== Z) });

test('the footprint is real before deletion (so the "gone" checks below mean something)', async () => {
  const { db, server } = await setup();
  try {
    const s = text(withoutReportsAboutZ(db));
    assert.ok(s.split(Z).length > 25, 'Z appears all over the snapshot');
    assert.ok(s.includes(NICK));
  } finally { server.close(); }
});

test('delete: every trace of the person is gone from the snapshot, the store and the doc collections', async () => {
  const { db, file, server, del, disconnected, campus, dining, gym, push, ids } = await setup();
  try {
    const r = await del('tok_z');
    assert.equal(r.status, 200, r.body.error);
    assert.equal(r.body.ok, true);
    assert.equal(r.body.deleted?.activitiesCancelled, 1);
    assert.equal(r.body.deleted?.ridesCancelled, 1);
    assert.equal(r.body.deleted?.ridesLeft, 1);
    assert.equal(r.body.deleted?.timePollsCancelled, 1);
    assert.equal(r.body.deleted?.loginEmails, 1);
    assert.deepEqual(disconnected, [Z], 'open event streams closed');

    // in memory: no id, no nickname anywhere (except reports about them, kept for safety)
    const left = text(withoutReportsAboutZ(db));
    assert.ok(!left.includes(Z), `Z still in: ${left.slice(Math.max(0, left.indexOf(Z) - 200), left.indexOf(Z) + 100)}`);
    assert.ok(!left.includes(NICK), `nickname still in: ${left.slice(Math.max(0, left.indexOf(NICK) - 200), left.indexOf(NICK) + 100)}`);
    assert.ok(!left.toLowerCase().includes('zephyrine'), 'no text they wrote survives');
    assert.ok(!db.activities.some((a) => a.id === ids.hosted), 'hosted activity cancelled');
    assert.ok(!db.chatRooms.some((c) => c.id === ids.dm), '1:1 room gone');
    const room = db.chatRooms.find((c) => c.id === ids.otherRoom)!;
    assert.deepEqual(room.messages.filter((m) => !m.system).map((m) => m.text), ['hi all'], 'group room keeps other people’s messages');
    assert.equal(db.rides!.find((x) => x.id === ids.mayaRide)!.memberCount, 0, 'seat freed on the ride they joined');
    assert.ok(!db.rides!.some((x) => x.id === ids.zRide));
    assert.ok(!db.timePolls.some((p) => p.id === ids.zPlan));
    assert.deepEqual(db.users.find((u) => u.id === LILY)!.poll!.votes, { [MAYA]: 0 });
    // people affected got a notice that does not name them
    const lilyNotes = db.notifications.filter((n) => n.userId === LILY && /cancelled/.test(n.title));
    assert.equal(lilyNotes.length, 3, 'meetup, plan and ride cancelled');
    // reports: the one they filed stays (anonymized), the one about them stays
    assert.ok(db.reports.some((x) => x.reporterId === DELETED_REPORTER && x.targetId === 'u_dohyun'));
    assert.ok(db.reports.some((x) => x.reporterId === LILY && x.targetId === Z));

    // persisted: reopen the file from disk
    const again = new FileStore(file); await again.init();
    const snap = (await again.loadSnapshot())!;
    assert.ok(!text(withoutReportsAboutZ(snap)).includes(Z), 'persisted snapshot is clean');
    assert.equal(await again.findSession('tok_z'), null);
    assert.equal(await again.findSession('tok_z2'), null);
    assert.equal(await again.findAccount(EMAIL), null);
    assert.equal(await again.takeCode(EMAIL), null);
    assert.deepEqual((await again.listAiLogs()).map((l) => l.id), ['ai3']);
    assert.equal((await again.listFeedback()).length, 0);
    assert.deepEqual((await again.listDocs<SeatWatchDoc>('seatWatches')).map((w) => w.userId), [MAYA]);
    assert.deepEqual(Object.keys((await again.listDocs<SeatStatusDoc>('seatStatus'))[0].notified), [MAYA]);
    assert.equal((await again.listDocs('diningFavorites')).length, 0);
    assert.equal((await again.listDocs('gymAlerts')).length, 0);
    assert.deepEqual((await again.listDocs<{ id: string; userId: string }>('pushTokens')).map((d) => d.userId), [KEEP], 'their iPhone push token is gone, others stay');
    assert.equal(r.body.deleted?.pushTokens, 1);
    // and the services' in-memory copies
    assert.equal(campus.myWatchCount(Z), 0);
    assert.deepEqual(dining.favoritesOf(Z), []);
    assert.deepEqual(gym.alertsOf(Z), []);
    assert.deepEqual(push.tokensOf(Z), []);
    assert.ok(!(await again.loadSnapshot())!.users.some((u) => u.id === Z));
    assert.ok((await again.findSession('tok_lily')), 'other people’s sessions untouched');

    // the old token no longer works
    const second = await del('tok_z');
    assert.equal(second.status, 401);
  } finally { server.close(); }
});

test('other viewers: the broadcast patch removes the person from screens that already loaded them', async () => {
  const { db, server, del, broadcasts, ids } = await setup();
  try {
    // what Lily and Maya had on screen before
    const screens = new Map<ID, Snapshot>([LILY, MAYA].map((v) => [v, snapshotFor(db, v)]));
    for (const s of screens.values()) assert.ok(text(s).includes(Z));
    assert.equal((await del('tok_z')).status, 200);
    assert.equal(broadcasts.length, 1);
    for (const [viewer, before] of screens) {
      const p = patchFor(broadcasts[0], viewer, db);
      assert.ok(p, `${viewer} gets a patch`);
      assert.ok(p!.removed?.users?.includes(Z));
      const after = mergePatch(before, p!);
      const s = text({ ...after, reports: [] });
      assert.ok(!s.includes(Z), `${viewer}'s screen still shows Z: ${s.slice(Math.max(0, s.indexOf(Z) - 200), s.indexOf(Z) + 80)}`);
      assert.ok(!s.includes(NICK), `${viewer}'s screen still names Z`);
      // a fresh load agrees
      assert.ok(!text({ ...snapshotFor(db, viewer), reports: [] }).includes(Z));
    }
    // Maya's 1:1 with Z is gone from her screen; the group room is still there without Z
    const maya = mergePatch(screens.get(MAYA)!, patchFor(broadcasts[0], MAYA, db)!);
    assert.ok(!maya.chatRooms.some((r: ChatRoom) => r.id === ids.dm));
    assert.ok(maya.chatRooms.some((r: ChatRoom) => r.id === ids.otherRoom && !r.memberIds.includes(Z)));
    // Lily sees her cancellation notices
    const lily = mergePatch(screens.get(LILY)!, patchFor(broadcasts[0], LILY, db)!);
    assert.equal(lily.notifications.filter((n) => /cancelled/.test(n.title)).length, 3);
    assert.ok(!lily.rides!.some((r) => r.id === ids.zRide));
  } finally { server.close(); }
});

test('the shared demo account and sample profiles cannot be deleted', async () => {
  const { db, server, del, broadcasts } = await setup();
  try {
    for (const token of ['tok_demo', 'tok_lily']) {
      const r = await del(token);
      assert.equal(r.status, 403);
      assert.match(r.body.error!, /demo account/);
    }
    assert.ok(db.users.some((u) => u.id === 'u_me'));
    assert.ok(db.users.some((u) => u.id === LILY));
    assert.equal(broadcasts.length, 0);
    assert.ok(PROTECTED_IDS.has('u_me') && PROTECTED_IDS.has('u_me_ucmerced'));
    // even straight through the library the server checks before calling it
    assert.throws(() => eraseUser(db, 'u_nobody'), /not found/);
  } finally { server.close(); }
});

test('signed-out callers and a missing confirmation are refused, nothing is deleted', async () => {
  const { db, server, del, broadcasts, store } = await setup();
  try {
    assert.equal((await del()).status, 401);
    assert.equal((await del('not-a-real-token')).status, 401);
    const r = await del('tok_z', 'yes');
    assert.equal(r.status, 400);
    assert.match(r.body.error!, /DELETE/);
    assert.ok(db.users.some((u) => u.id === Z));
    assert.ok(await store.findSession('tok_z'));
    assert.equal(broadcasts.length, 0);
    assert.equal((await del('tok_z', ' delete ')).status, 200, 'case and spaces do not matter');
  } finally { server.close(); }
});
