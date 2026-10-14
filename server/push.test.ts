/**
 * iPhone push (server/push.ts) and universal links (server/app-links.ts) — Expo Push API is a mocked fetch.
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
import type { ID, Notification, User } from '@core/types';
import * as seed from '@core/data/seed.en';
import { FileStore } from './store';
import { createPush, registerPushRoutes, mask, pushPath, isExpoPushToken, EXPO_PUSH_URL, EXPO_RECEIPTS_URL, PUSH_TOKENS, type ExpoMessage, type PushTokenDoc } from './push';
import { appSiteAssociation, registerAppLinkRoutes } from './app-links';

const A = 'u_push_a', B = 'u_push_b', OFF = 'u_push_off';
const tok = (s: string) => `ExponentPushToken[${s.padEnd(22, 'x')}]`;

function user(id: ID, notifications = true): User {
  const base = structuredClone(seed.users.find((u) => u.id === 'u_me')!) as User;
  return { ...base, id, nickname: id, sample: undefined, settings: { ...base.settings, notifications } };
}

async function setup(opts: { tickets?: (msgs: ExpoMessage[]) => unknown[]; receipts?: Record<string, unknown>; status?: number } = {}) {
  const db = { users: [user(A), user(B), user(OFF, false)], notifications: [] as Notification[] } as unknown as Snapshot;
  db.notifications.push({ id: 'n_old', userId: A, type: 'comment', title: 'old', body: 'x', read: false, createdAt: new Date().toISOString() });
  const store = new FileStore(path.join(mkdtempSync(path.join(tmpdir(), 'lumi-push-')), 'db.json')); await store.init();
  const calls: { url: string; body: unknown; headers: Record<string, string> }[] = [];
  const logs: string[] = [];
  let seq = 0;
  const fetchMock = (async (url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    calls.push({ url, body, headers: init.headers as Record<string, string> });
    if (url === EXPO_PUSH_URL) {
      const msgs = body as ExpoMessage[];
      const data = opts.tickets ? opts.tickets(msgs) : msgs.map(() => ({ status: 'ok', id: `t${++seq}` }));
      return new Response(JSON.stringify({ data }), { status: opts.status ?? 200 });
    }
    if (url === EXPO_RECEIPTS_URL) return new Response(JSON.stringify({ data: opts.receipts ?? {} }), { status: 200 });
    throw new Error(`unexpected ${url}`);
  }) as typeof fetch;
  const push = createPush({ store, db: () => db, fetch: fetchMock, allow: (id) => id !== 'u_me', accessToken: 'expo-access', log: (m) => logs.push(m) });
  await push.load();
  const note = (userId: ID, id: string, extra: Partial<Notification> = {}): Notification => {
    const n: Notification = { id, userId, type: 'participation_approved', title: `Title ${id}`, body: `Body ${id}`, link: `/activities/${id}`, read: false, createdAt: new Date().toISOString(), ...extra };
    db.notifications.push(n);
    return n;
  };
  return { db, store, push, calls, logs, note };
}

test('token format, masking and tap paths', () => {
  assert.ok(isExpoPushToken('ExponentPushToken[abcdefghijk123]'));
  assert.ok(isExpoPushToken('ExpoPushToken[abcdefghijk123]'));
  assert.ok(!isExpoPushToken('abc'));
  assert.ok(!isExpoPushToken('ExponentPushToken[<script>]'));
  assert.ok(!isExpoPushToken(42));
  assert.equal(mask('ExponentPushToken[abcdefghijk123]'), 'ExponentPushToken[abcd…]');
  assert.equal(pushPath('/chats/r1'), '/chats/r1');
  assert.equal(pushPath('https://evil.example'), '/notifications');
  assert.equal(pushPath('//evil.example'), '/notifications');
  assert.equal(pushPath(undefined), '/notifications');
});

test('register stores one doc per device; another account on the same phone takes it over; shared accounts are refused', async () => {
  const { push, store } = await setup();
  assert.equal((await push.register(A, 'nope', 'ios', '1.0')).ok, false);
  assert.deepEqual(await push.register('u_me', tok('demo'), 'ios', '1.0'), { ok: true, registered: false, reason: 'shared account' });
  await push.register(A, tok('phone1'), 'ios', '1.0.0');
  await push.register(A, tok('phone1'), 'ios', '1.0.1'); // same device again
  assert.equal(push.tokensOf(A).length, 1);
  assert.equal(push.tokensOf(A)[0].appVersion, '1.0.1');
  await push.register(B, tok('phone1'), 'ios', '1.0.1'); // B signs in on A's phone
  assert.equal(push.tokensOf(A).length, 0);
  assert.equal(push.tokensOf(B).length, 1);
  const docs = await store.listDocs<PushTokenDoc>(PUSH_TOKENS);
  assert.deepEqual(docs.map((d) => d.userId), [B]);
  await push.unregister(tok('phone1'));
  assert.equal((await store.listDocs(PUSH_TOKENS)).length, 0);
});

test('a new notification → one push per device of that user, with the deep link; never twice; never for old/read/opted-out', async () => {
  const { push, calls, note, logs } = await setup();
  await push.register(A, tok('a-phone'), 'ios', '1');
  await push.register(A, tok('a-ipad'), 'ios', '1');
  await push.register(B, tok('b-phone'), 'ios', '1');
  await push.register(OFF, tok('off-phone'), 'ios', '1');

  const n = note(A, 'n1');
  const r = await push.onPatch({ notifications: [n] });
  assert.equal(r.sent, 2);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].headers.authorization, 'Bearer expo-access');
  const msgs = calls[0].body as ExpoMessage[];
  assert.deepEqual(msgs.map((m) => m.to).sort(), [tok('a-ipad'), tok('a-phone')].sort());
  assert.deepEqual(msgs[0].data, { path: '/activities/n1', notificationId: 'n1' });
  assert.equal(msgs[0].title, 'Title n1');

  // the same notification coming back (markRead, a re-broadcast) does not push again
  await push.onPatch({ notifications: [{ ...n, read: true }] });
  await push.onPatch({ notifications: [n] });
  // notifications that existed at startup, read ones, stale ones, opted-out users, users without a device
  const old = note(A, 'n_stale', { createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() });
  await push.onPatch({ notifications: [{ ...note(A, 'n_old_dup'), id: 'n_old' }, note(A, 'n_read', { read: true }), old, note(OFF, 'n_off'), note('u_nobody', 'n_x')] });
  // patches without notifications never call out
  await push.onPatch({ activities: [] } as Patch);
  assert.equal(calls.length, 1, 'nothing else was sent');
  assert.ok(logs.every((l) => !l.includes('a-phone'.padEnd(22, 'x'))), `a full token was logged: ${logs.join(' | ')}`);
});

test('batches of 100', async () => {
  const { push, calls, note, db } = await setup();
  for (let u = 0; u < 15; u++) {
    const id = `u_many_${u}`;
    (db.users as User[]).push(user(id));
    for (let d = 0; d < 10; d++) await push.register(id, tok(`m${u}d${d}`), 'ios', '1');
  }
  const r = await push.onPatch({ notifications: Array.from({ length: 15 }, (_, u) => note(`u_many_${u}`, `nb${u}`)) });
  assert.equal(r.sent, 150);
  assert.deepEqual(calls.map((c) => (c.body as unknown[]).length), [100, 50]);
});

test('DeviceNotRegistered in a ticket drops the token; other ticket errors keep it', async () => {
  const { push, store, note } = await setup({
    tickets: (msgs) => msgs.map((m, i) => (m.to === tok('dead') ? { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } }
      : m.to === tok('flaky') ? { status: 'error', message: 'rate', details: { error: 'MessageRateExceeded' } }
      : { status: 'ok', id: `ok${i}` })),
  });
  for (const t of ['dead', 'flaky', 'fine']) await push.register(A, tok(t), 'ios', '1');
  const r = await push.onPatch({ notifications: [note(A, 'n2')] });
  assert.deepEqual(r, { sent: 1, dropped: 1 });
  assert.deepEqual(push.tokensOf(A).map((d) => d.token).sort(), [tok('flaky'), tok('fine')].sort());
  assert.deepEqual((await store.listDocs<PushTokenDoc>(PUSH_TOKENS)).map((d) => d.token).sort(), [tok('flaky'), tok('fine')].sort());
});

test('a receipt saying DeviceNotRegistered (Apple answers later) drops the token too', async () => {
  const ticket = (t: string) => `ticket-${t}`;
  const { push, store, note, calls } = await setup({
    tickets: (msgs) => msgs.map((m) => ({ status: 'ok', id: ticket(m.to) })),
    receipts: { [ticket(tok('later'))]: { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } }, [ticket(tok('fine'))]: { status: 'ok' } },
  });
  for (const t of ['later', 'fine']) await push.register(A, tok(t), 'ios', '1');
  await push.onPatch({ notifications: [note(A, 'n3')] });
  assert.deepEqual(await push.checkReceipts(), { checked: 0, dropped: 0 }, 'not due yet (15 min)');
  const rc = await push.checkReceipts(true);
  assert.deepEqual(rc, { checked: 2, dropped: 1 });
  assert.deepEqual((calls.at(-1)!.body as { ids: string[] }).ids.sort(), [ticket(tok('fine')), ticket(tok('later'))].sort());
  assert.deepEqual((await store.listDocs<PushTokenDoc>(PUSH_TOKENS)).map((d) => d.token), [tok('fine')]);
  assert.deepEqual(await push.checkReceipts(true), { checked: 0, dropped: 0 }, 'each receipt checked once');
});

test('Expo being down never throws into the broadcast path', async () => {
  const { push, note } = await setup({ status: 500 });
  await push.register(A, tok('p'), 'ios', '1');
  const r = await push.onPatch({ notifications: [note(A, 'n4')] });
  assert.equal(r.sent, 0);
  const store = new FileStore(path.join(mkdtempSync(path.join(tmpdir(), 'lumi-push-')), 'db.json')); await store.init();
  const db = { users: [user(A)], notifications: [] } as unknown as Snapshot;
  const throwing = createPush({ store, db: () => db, fetch: (async () => { throw new Error('ECONNRESET'); }) as typeof fetch, log: () => {} });
  await throwing.register(A, tok('p'), 'ios', '1');
  const n: Notification = { id: 'n5', userId: A, type: 'comment', title: 't', body: 'b', read: false, createdAt: new Date().toISOString() };
  assert.deepEqual(await throwing.onPatch({ notifications: [n] }), { sent: 0, dropped: 0 });
});

test('forgetUser removes every device of the person', async () => {
  const { push, store } = await setup();
  await push.register(A, tok('a1'), 'ios', '1');
  await push.register(A, tok('a2'), 'ios', '1');
  await push.register(B, tok('b1'), 'ios', '1');
  assert.deepEqual(await push.forgetUser(A), { pushTokens: 2 });
  assert.deepEqual((await store.listDocs<PushTokenDoc>(PUSH_TOKENS)).map((d) => d.userId), [B]);
});

test('HTTP: register needs sign-in, unregister does not', async () => {
  const { push } = await setup();
  const app = express(); app.use(express.json());
  const auth = (req: Request & { userId?: ID }, _res: Response, next: NextFunction) => { if (req.headers.authorization === 'Bearer tok_a') req.userId = A; next(); };
  registerPushRoutes(app, push, { auth });
  const server = app.listen(0);
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (p: string, body: unknown, token?: string) => fetch(`${base}${p}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  try {
    assert.equal((await post('/api/push/register', { token: tok('h') })).status, 401);
    assert.equal((await post('/api/push/register', { token: 'bad' }, 'tok_a')).status, 400);
    const ok = await post('/api/push/register', { token: tok('h'), platform: 'ios', appVersion: '1.0.0 (3)' }, 'tok_a');
    assert.equal(ok.status, 200);
    assert.deepEqual(await ok.json(), { ok: true, registered: true });
    assert.equal(push.tokensOf(A).length, 1);
    assert.equal((await post('/api/push/unregister', { token: tok('h') })).status, 200);
    assert.equal(push.tokensOf(A).length, 0);
  } finally { server.close(); }
});

test('apple-app-site-association: 404 until APPLE_TEAM_ID + IOS_BUNDLE_ID are set, then JSON before the SPA catch-all', async () => {
  assert.equal(appSiteAssociation({}), null);
  assert.equal(appSiteAssociation({ APPLE_TEAM_ID: 'short', IOS_BUNDLE_ID: 'app.lumi.campus' }), null);
  const body = appSiteAssociation({ APPLE_TEAM_ID: 'ABCDE12345', IOS_BUNDLE_ID: 'app.lumi.campus' }) as { applinks: { details: { appIDs: string[]; components: { '/': string }[]; paths: string[] }[] } };
  assert.deepEqual(body.applinks.details[0].appIDs, ['ABCDE12345.app.lumi.campus']);
  assert.deepEqual(body.applinks.details[0].paths, ['/c/*', '/r/*', '/p/*', '/welcome']);

  const app = express();
  registerAppLinkRoutes(app);
  app.get(/^(?!\/api\/).*/, (_req, res) => { res.type('html').send('<!doctype html>spa'); });
  const server = app.listen(0);
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/.well-known/apple-app-site-association`;
  const saved = { team: process.env.APPLE_TEAM_ID, bundle: process.env.IOS_BUNDLE_ID };
  try {
    delete process.env.APPLE_TEAM_ID; delete process.env.IOS_BUNDLE_ID;
    assert.equal((await fetch(url)).status, 404);
    process.env.APPLE_TEAM_ID = 'ABCDE12345'; process.env.IOS_BUNDLE_ID = 'app.lumi.campus';
    const r = await fetch(url, { redirect: 'manual' });
    assert.equal(r.status, 200);
    assert.match(r.headers.get('content-type') ?? '', /^application\/json/);
    assert.deepEqual((await r.json() as { applinks: { details: { appIDs: string[] }[] } }).applinks.details[0].appIDs, ['ABCDE12345.app.lumi.campus']);
  } finally {
    server.close();
    if (saved.team === undefined) delete process.env.APPLE_TEAM_ID; else process.env.APPLE_TEAM_ID = saved.team;
    if (saved.bundle === undefined) delete process.env.IOS_BUNDLE_ID; else process.env.IOS_BUNDLE_ID = saved.bundle;
  }
});
