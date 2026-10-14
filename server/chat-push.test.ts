/**
 * Chat message push (server/chat-push.ts through server/push.ts) — Expo Push API is a mocked fetch, timers are fake.
 *   - 1:1, group (meetup / study group) and ride chats push to the other members with first name + preview
 *   - never to the sender, a blocked pair, suspended or sample accounts, notifications-off, someone viewing that room,
 *     or for a message they already read
 *   - one push per room per 30 s per recipient, then one "N new messages" summary (same collapseId)
 *   - suspended accounts can't register a token and get no notification pushes either
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express, { type Request, type Response, type NextFunction } from 'express';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Patch, Snapshot } from '@core/api/types';
import type { Activity, ChatRoom, ID, Notification, User } from '@core/types';
import * as seed from '@core/data/seed.en';
import { t } from '@core/i18n';
import { createEngine } from '@core/api/engine';
import { FileStore } from './store';
import { createPush, registerPushRoutes, EXPO_PUSH_URL, type ExpoMessage } from './push';
import { CHAT_WINDOW_MS, VIEWING_TTL_MS, firstName, preview } from './chat-push';
import { moderationChanged } from './moderation';

const LILY = 'u_cp_lily', BEN = 'u_cp_ben', OFF = 'u_cp_off', BLOCKER = 'u_cp_blocker', SUS = 'u_cp_sus', SAMPLE = 'u_cp_sample';
const tok = (s: string) => `ExponentPushToken[${s.padEnd(22, 'x')}]`;

function person(id: ID, nickname: string, extra: Partial<User> = {}): User {
  const base = structuredClone(seed.users.find((u) => u.id === 'u_me')!) as User;
  return { ...base, id, nickname, sample: undefined, settings: { ...base.settings, notifications: true }, ...extra };
}
const room = (id: ID, type: ChatRoom['type'], memberIds: ID[], extra: Partial<ChatRoom> = {}): ChatRoom =>
  ({ id, type, memberIds, messages: [], lastReadAt: {}, createdAt: new Date().toISOString(), ...extra });

async function setup() {
  const db: Snapshot = structuredClone({
    users: seed.users, schools: seed.schools, organizations: seed.organizations, activities: seed.activities,
    participations: [], posts: [], relationships: { likes: [], follows: [], friendRequests: [], friends: [], blocks: [] }, proposals: [],
    chatRooms: [], notifications: [], reports: [], opportunities: [], opportunityIntents: [], timePolls: [], games: [], rides: [],
  }) as unknown as Snapshot;
  for (const u of db.users) u.sample = true;
  db.users.push(person(LILY, 'Lily Chen'), person(BEN, 'Ben'), person(OFF, 'Off'), person(BLOCKER, 'Blocker'), person(SUS, 'Sus'), person(SAMPLE, 'Sample', { sample: true }));
  (db.users.find((u) => u.id === OFF)!.settings).notifications = false;
  db.relationships.blocks.push({ fromId: BLOCKER, toId: LILY });
  const meetup: Activity = { ...structuredClone(seed.activities[0]), id: 'a_cp_meetup', hostId: LILY, title: 'Sunset hike at the Big C', sample: undefined };
  const sampleMeetup: Activity = { ...structuredClone(seed.activities[0]), id: 'a_cp_sample', hostId: LILY, title: 'Sample meetup', sample: true };
  db.activities.push(meetup, sampleMeetup);
  db.chatRooms.push(
    room('cr_dm', 'direct', [LILY, BEN]),
    room('cr_group', 'activity', [LILY, BEN, OFF, BLOCKER, SUS, SAMPLE], { activityId: meetup.id, title: meetup.title }),
    room('cr_ride', 'activity', [BEN, LILY], { rideId: 'rd_cp', title: 'Ride to SFO · Fri 3:00 PM' }),
    room('cr_study', 'activity', [LILY, BEN], { activityId: 'a_cp_study' }), // study group — title from the activity
    room('cr_sample', 'activity', [LILY, BEN], { activityId: sampleMeetup.id, title: 'Sample meetup' }),
  );
  db.activities.push({ ...structuredClone(seed.activities[0]), id: 'a_cp_study', hostId: BEN, title: 'CS 61A study group', sample: undefined });

  const store = new FileStore(path.join(mkdtempSync(path.join(tmpdir(), 'lumi-chatpush-')), 'db.json')); await store.init();
  const sent: ExpoMessage[][] = [];
  const fetchMock = (async (url: string, init: RequestInit) => {
    assert.equal(url, EXPO_PUSH_URL);
    const msgs = JSON.parse(String(init.body)) as ExpoMessage[];
    sent.push(msgs);
    return new Response(JSON.stringify({ data: msgs.map((_, i) => ({ status: 'ok', id: `t${sent.length}_${i}` })) }), { status: 200 });
  }) as typeof fetch;
  let clock = Date.now();
  const timers: { fn: () => Promise<unknown>; ms: number }[] = [];
  const push = createPush({
    store, db: () => db, fetch: fetchMock, now: () => clock, log: () => {},
    allow: (id) => id !== 'u_me',
    chat: { setTimer: (fn, ms) => timers.push({ fn, ms }), clearTimer: () => {} },
  });
  await push.load();
  for (const id of [LILY, BEN, OFF, BLOCKER, SUS]) await push.register(id, tok(`${id}-phone`), 'ios', '1');
  // suspended after their phone registered — they must stop getting pushes
  db.users.find((u) => u.id === SUS)!.suspended = { at: new Date().toISOString(), by: 'test', reason: 'test' };
  moderationChanged();
  const engine = createEngine({ db, t, demo: false, push: () => {} });
  const say = (roomId: ID, from: ID, text: string) => push.onPatch(engine.chats.send(roomId, from, text));
  const to = (msgs: ExpoMessage[]) => msgs.map((m) => m.to);
  return { db, push, sent, timers, say, to, tick: (ms: number) => { clock += ms; }, engine };
}

test('first name and preview', () => {
  assert.equal(firstName({ nickname: 'Lily Chen' }), 'Lily');
  assert.equal(firstName({ nickname: '  ' }), 'Someone');
  assert.equal(preview('are   you\nstill coming?'), 'are you still coming?');
  const long = preview('x'.repeat(300));
  assert.equal(long.length, 100);
  assert.ok(long.endsWith('…'));
});

test('1:1: the other person gets "Lily" / the message, tap opens the room, grouped and collapsed per room; never the sender', async () => {
  const { sent, say, to } = await setup();
  const r = await say('cr_dm', LILY, 'are you still coming?');
  assert.equal(r.sent, 1);
  assert.deepEqual(to(sent[0]), [tok(`${BEN}-phone`)]);
  const m = sent[0][0];
  assert.equal(m.title, 'Lily');
  assert.equal(m.body, 'are you still coming?');
  assert.deepEqual(m.data, { path: '/chats/cr_dm', roomId: 'cr_dm' });
  assert.equal(m.threadId, 'chat-cr_dm');
  assert.equal(m.collapseId, 'chat-cr_dm');
  assert.equal(m.sound, 'default');
});

test('group: room title + "Lily: …" — not to notifications-off, a blocked pair, suspended or sample members', async () => {
  const { sent, say, to, tick } = await setup();
  await say('cr_group', LILY, 'meet at the trailhead at 6');
  assert.equal(sent.length, 1);
  assert.deepEqual(to(sent[0]), [tok(`${BEN}-phone`)]);
  assert.equal(sent[0][0].title, 'Sunset hike at the Big C');
  assert.equal(sent[0][0].body, 'Lily: meet at the trailhead at 6');
  // a message from the person who blocked Lily doesn't reach Lily either
  tick(CHAT_WINDOW_MS);
  await say('cr_group', BLOCKER, 'hello all');
  assert.deepEqual(to(sent[1]), [tok(`${BEN}-phone`)]);
});

test('ride and study-group chats push too; sample rooms and system lines never do', async () => {
  const { sent, say, db, push } = await setup();
  await say('cr_ride', BEN, 'I am at the curb');
  assert.equal(sent[0][0].title, 'Ride to SFO · Fri 3:00 PM');
  assert.equal(sent[0][0].body, 'Ben: I am at the curb');
  await say('cr_study', BEN, 'room 120 in Moffitt?');
  assert.equal(sent[1][0].title, 'CS 61A study group');
  assert.equal(sent.length, 2);
  await say('cr_sample', LILY, 'sample room');
  const r = db.chatRooms.find((x) => x.id === 'cr_dm')!;
  r.messages.push({ id: 'm_sys', senderId: LILY, text: 'Lily joined', createdAt: new Date().toISOString(), system: true });
  await push.onPatch({ chatRooms: [r] });
  assert.equal(sent.length, 2, 'nothing for a sample meetup room or a system line');
});

test('not while viewing that room (until the viewing entry expires); not for a message already read', async () => {
  const { sent, say, push, tick, db } = await setup();
  push.setViewing(BEN, 'phone', 'cr_dm');
  await say('cr_dm', LILY, 'one');
  assert.equal(sent.length, 0, 'Ben has the room open');
  push.setViewing(BEN, 'phone', 'cr_group'); // another room open → this one pushes
  await say('cr_dm', LILY, 'two');
  assert.equal(sent.length, 1);
  tick(CHAT_WINDOW_MS);
  push.setViewing(BEN, 'phone', 'cr_dm');
  tick(VIEWING_TTL_MS + 1); // the phone went to sleep without saying so
  await say('cr_dm', LILY, 'three');
  assert.equal(sent.length, 2);
  tick(CHAT_WINDOW_MS);
  // Ben read it on another device before the broadcast reached us
  const dm = db.chatRooms.find((x) => x.id === 'cr_dm')!;
  const at = new Date().toISOString();
  dm.messages.push({ id: 'm_read', senderId: LILY, text: 'four', createdAt: at });
  dm.lastReadAt[BEN] = at;
  await push.onPatch({ chatRooms: [dm] } as Patch);
  assert.equal(sent.length, 2);
});

test('rate limit: one push per room per 30 s, then one summary that replaces it — only if still unread', async () => {
  const { sent, say, timers, tick, db, push } = await setup();
  await say('cr_dm', LILY, 'hey');
  await say('cr_dm', LILY, 'are you there?');
  await say('cr_dm', LILY, 'are you still coming?');
  assert.equal(sent.length, 1, 'only the first one right away');
  assert.equal(timers.length, 1, 'one summary scheduled');
  assert.ok(timers[0].ms <= CHAT_WINDOW_MS && timers[0].ms >= 0);
  tick(CHAT_WINDOW_MS);
  await timers[0].fn();
  assert.equal(sent.length, 2);
  assert.equal(sent[1][0].title, 'Lily');
  assert.equal(sent[1][0].body, '3 new messages\nare you still coming?');
  assert.equal(sent[1][0].collapseId, sent[0][0].collapseId);

  // more within the next window, but Ben opens the room before the summary is due → no summary
  await say('cr_dm', LILY, 'ok see you');
  assert.equal(sent.length, 2);
  assert.equal(timers.length, 2);
  const dm = db.chatRooms.find((x) => x.id === 'cr_dm')!;
  dm.lastReadAt[BEN] = dm.messages.at(-1)!.createdAt;
  tick(CHAT_WINDOW_MS);
  await timers[1].fn();
  assert.equal(sent.length, 2, 'already read');

  // a different room is limited separately; after the window the next message pushes at once
  await say('cr_ride', LILY, 'leaving now');
  assert.equal(sent.length, 3);
  tick(CHAT_WINDOW_MS + 1);
  await new Promise((r) => setTimeout(r, 5)); // a later createdAt than what Ben read
  await say('cr_dm', LILY, 'new day');
  assert.equal(sent.length, 4);
  assert.equal(sent[3][0].body, 'new day');
  void push;
});

test('suspended sender, a room whose host is suspended, and a suspended recipient → no push', async () => {
  const { sent, say, db, push } = await setup();
  // SUS was suspended after registering: no chat push and no notification push
  const n: Notification = { id: 'n_cp_sus', userId: SUS, type: 'comment', title: 'x', body: 'y', read: false, createdAt: new Date().toISOString() };
  db.notifications.push(n);
  await push.onPatch({ notifications: [n] });
  assert.equal(sent.length, 0);
  // Lily (host of the group meetup) gets suspended — her room and her messages disappear for others
  db.users.find((u) => u.id === LILY)!.suspended = { at: new Date().toISOString(), by: 'test', reason: 'test' };
  moderationChanged();
  await say('cr_group', BEN, 'anyone?');
  const dm = db.chatRooms.find((x) => x.id === 'cr_dm')!;
  dm.messages.push({ id: 'm_from_sus', senderId: LILY, text: 'still here', createdAt: new Date().toISOString() });
  await push.onPatch({ chatRooms: [dm] });
  assert.equal(sent.length, 0);
});

test('Settings → Notifications off and PUSH_DISABLED stop chat pushes; deleting the account forgets its state', async () => {
  const { sent, say, db, push } = await setup();
  db.users.find((u) => u.id === BEN)!.settings.notifications = false;
  await say('cr_dm', LILY, 'hello?');
  assert.equal(sent.length, 0);
  db.users.find((u) => u.id === BEN)!.settings.notifications = true;
  await push.forgetUser(BEN);
  await say('cr_dm', LILY, 'hello again');
  assert.equal(sent.length, 0, 'no device left');

  const store = new FileStore(path.join(mkdtempSync(path.join(tmpdir(), 'lumi-chatpush-')), 'db.json')); await store.init();
  let called = 0;
  const off = createPush({ store, db: () => db, fetch: (async () => { called++; return new Response('{}'); }) as typeof fetch, disabled: true, log: () => {} });
  await off.load();
  await off.register(BEN, tok('ben2'), 'ios', '1');
  const engine = createEngine({ db, t, demo: false, push: () => {} });
  assert.deepEqual(await off.onPatch(engine.chats.send('cr_dm', LILY, 'x')), { sent: 0, dropped: 0 });
  assert.equal(called, 0);
});

test('suspended and sample accounts cannot register a token', async () => {
  const { push } = await setup();
  assert.deepEqual(await push.register(SUS, tok('sus-new'), 'ios', '1'), { ok: true, registered: false, reason: 'suspended' });
  assert.deepEqual(await push.register(SAMPLE, tok('sample'), 'ios', '1'), { ok: true, registered: false, reason: 'shared account' });
  assert.equal(push.tokensOf(SAMPLE).length, 0);
});

test('HTTP: POST /api/chats/viewing needs sign-in; one entry per session so a laptop does not cancel the phone', async () => {
  const { push, say, sent } = await setup();
  const app = express(); app.use(express.json());
  const auth = (req: Request & { userId?: ID }, _res: Response, next: NextFunction) => { if (req.headers.authorization?.startsWith('Bearer ben')) req.userId = BEN; next(); };
  registerPushRoutes(app, push, { auth });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (body: unknown, token?: string) => fetch(`${base}/api/chats/viewing`, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  try {
    assert.equal((await post({ roomId: 'cr_dm' })).status, 401);
    assert.equal((await post({ roomId: 'cr_dm' }, 'ben-phone')).status, 200);
    assert.equal((await post({ roomId: null }, 'ben-laptop')).status, 200);
    assert.ok(push.isViewing(BEN, 'cr_dm'), 'the laptop closing its chat does not clear the phone');
    await say('cr_dm', LILY, 'x');
    assert.equal(sent.length, 0);
    assert.equal((await post({ roomId: null }, 'ben-phone')).status, 200);
    assert.ok(!push.isViewing(BEN, 'cr_dm'));
  } finally { server.close(); }
});
