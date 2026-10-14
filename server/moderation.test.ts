/**
 * Reports and moderation (server/moderation.ts) — App Store guideline 1.2.
 *   - every new report e-mails FEEDBACK_EMAIL (and survives FEEDBACK_EMAIL / Resend being unset)
 *   - admin endpoints need ADMIN_KEY; each action (dismiss · remove · suspend · unsuspend) leaves an audit entry
 *   - removal and suspension reach other people's open screens as removed.* (server/view.ts patchFor)
 *   - a suspended account can't sign in, use its session, report or post
 *   - 3 distinct real accounts reporting a post/comment hide it from everyone but its author
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express, { type Request, type Response } from 'express';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AddressInfo } from 'node:net';
import type { Patch, Snapshot } from '@core/api/types';
import type { ID, User } from '@core/types';
import * as seed from '@core/data/seed.en';
import { t } from '@core/i18n';
import { createEngine } from '@core/api/engine';
import { createRidesEngine } from '@core/api/rides';
import { mergePatch } from '@core/store/merge';
import { snapshotFor, patchFor } from './view';
import { FileStore } from './store';
import { AUTO_HIDE_REPORTS, registerModerationRoutes, sessionAuth, signInBlock } from './moderation';

const AUTHOR = 'u_mod_author';
const VIEWER = 'u_mod_viewer';
const R = ['u_mod_r1', 'u_mod_r2', 'u_mod_r3', 'u_mod_r4'];
const DEMO = 'u_me';
const KEY = 'test-admin-key-9f2c';
const TODAY = new Date().toISOString().slice(0, 10);
const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

async function setup(envOverride: Record<string, string | undefined> = {}) {
  const db: Snapshot = structuredClone({
    users: seed.users, schools: seed.schools, organizations: seed.organizations, activities: seed.activities,
    participations: seed.participations, posts: seed.posts, relationships: seed.relationships, proposals: seed.proposals,
    chatRooms: seed.chatRooms, notifications: seed.notifications, reports: [], opportunities: seed.opportunities,
    opportunityIntents: seed.opportunityIntents, timePolls: seed.timePolls, games: [], rides: [],
  });
  for (const u of db.users) u.sample = true; // server/demo.ts marks every seed profile (incl. the demo login u_me)
  const base = db.users.find((u) => u.id === DEMO)!;
  const real = (id: ID, nickname: string): User => ({ ...structuredClone(base), id, nickname, sample: undefined, bio: `${nickname} bio`, createdAt: new Date().toISOString() });
  db.users.push(real(AUTHOR, 'Ottoline'), real(VIEWER, 'Viv'), ...R.map((id, i) => real(id, `Rep${i + 1}`)));

  const engine = createEngine({ db, t, demo: false, push: () => {} });
  const rides = createRidesEngine({ db, t, demo: false, push: () => {} }, { today: () => TODAY });
  const post = engine.posts.create(AUTHOR, { text: 'buy my essays, cheap', media: [], tags: [], visibility: 'school' }).post;
  engine.posts.comment(post.id, VIEWER, 'viewer comment');
  const other = engine.posts.create(VIEWER, { text: 'study at Moffitt?', media: [], tags: [], visibility: 'school' }).post;
  engine.posts.comment(other.id, AUTHOR, 'nasty comment by author');
  const commentId = other.comments.find((c) => c.authorId === AUTHOR)!.id;
  const meetup = engine.activities.create(AUTHOR, { kind: 'personal', category: 'coffee', title: 'Shady meetup', description: 'bring cash', cover: { emoji: '☕', hue: 10 }, date: day(2), startTime: '15:00', endTime: '16:00', place: { name: 'Free Speech Cafe', lat: 0, lng: 0 }, capacity: 6, fee: 0, joinPolicy: 'open', visibility: 'school' }).activity;
  engine.activities.join(meetup.id, VIEWER);
  engine.activities.comment(meetup.id, AUTHOR, 'activity comment by author');
  const actComment = db.activities.find((a) => a.id === meetup.id)!.comments.at(-1)!.id;
  const room = db.chatRooms.find((r) => r.activityId === meetup.id)!;
  engine.chats.send(room.id, AUTHOR, 'threatening message');
  engine.chats.send(room.id, VIEWER, 'ok see you');
  const badMsg = room.messages.find((m) => m.text === 'threatening message')!.id;
  const ride = rides.create(AUTHOR, { kind: 'driving', from: 'unit2', to: 'sfo', date: day(5), start: '09:00', end: '09:30', seats: 3, note: 'cash only' }).ride;

  const file = path.join(mkdtempSync(path.join(tmpdir(), 'lumi-mod-')), 'db.json');
  const store = new FileStore(file); await store.init();
  await store.replaceAll(db);
  const tokens: Record<string, ID> = { tok_author: AUTHOR, tok_viewer: VIEWER, tok_demo: DEMO, ...Object.fromEntries(R.map((id, i) => [`tok_r${i + 1}`, id])) };
  for (const [token, userId] of Object.entries(tokens)) await store.createSession({ token, userId, createdAt: TODAY });

  // each person's open screen: snapshot, then every broadcast merged in (what the app's store does)
  const screens = new Map<ID, Snapshot>([AUTHOR, VIEWER, ...R, DEMO].map((id) => [id, snapshotFor(db, id)]));
  const pending: Promise<void>[] = [];
  const push = (patch: Patch) => {
    pending.push(store.applyPatch(patch));
    for (const [id, s] of screens) { const p = patchFor(patch, id, db); if (p) screens.set(id, mergePatch(s, p)); }
  };
  const mails: { to: string; subject: string; text: string }[] = [];
  const disconnected: ID[] = [];
  const env: Record<string, string | undefined> = { ADMIN_KEY: KEY, FEEDBACK_EMAIL: 'ops@example.com', PUBLIC_URL: 'https://lumi.example', ...envOverride };

  const app = express();
  app.use(express.json());
  const auth = sessionAuth({ db: () => db, findSession: (tk) => store.findSession(tk) });
  registerModerationRoutes(app, {
    db: () => db, auth, push, patchFor: (p, me) => patchFor(p, me, db), env,
    disconnect: (id) => { disconnected.push(id); },
    sendMail: async (to, subject, text) => { mails.push({ to, subject, text }); return true; },
  });
  // the generic posting RPC the way server/index.ts guards it (auth → requireUser)
  app.post('/api/rpc/posts/create', auth, (req: Request & { userId?: ID; suspended?: boolean }, res: Response) => {
    if (req.suspended) { res.status(403).json({ error: 'suspended' }); return; }
    if (!req.userId) { res.status(401).json({ error: 'sign in' }); return; }
    const out = engine.posts.create(req.userId, { text: String(req.body.text), media: [], tags: [], visibility: 'school' });
    push(out.patch); res.json(out.patch);
  });
  const server = app.listen(0);
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (method: string, p: string, opts: { token?: string; key?: string | null; name?: string; body?: unknown } = {}) => {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (opts.token) headers.authorization = `Bearer ${opts.token}`;
    if (opts.key !== null) headers['x-admin-key'] = opts.key ?? KEY;
    if (opts.name) headers['x-admin-name'] = opts.name;
    const res = await fetch(url + p, { method, headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
    return { status: res.status, body: await res.json().catch(() => ({})) as Record<string, any> };
  };
  const report = (token: string, me: ID, type: string, id: ID, reason = 'Spam or ads') => call('POST', '/api/rpc/reports/create', { token, key: null, body: { args: [me, type, id, reason] } });
  const sees = (viewer: ID) => screens.get(viewer)!;
  const done = async () => { await Promise.all(pending); server.close(); };
  return { db, store, env, url, screens, sees, mails, disconnected, call, report, done, ids: { post: post.id, other: other.id, commentId, meetup: meetup.id, actComment, room: room.id, badMsg, ride: ride.id } };
}

test('a new report is saved, logged and e-mailed to FEEDBACK_EMAIL with the content and an admin link', async () => {
  const s = await setup();
  const logs: string[] = []; const orig = console.log; console.log = (...a: unknown[]) => { logs.push(a.join(' ')); };
  try {
    const r = await s.report('tok_viewer', VIEWER, 'post', s.ids.post, 'Spam or ads — selling essays');
    assert.equal(r.status, 200);
    const saved = s.db.reports.find((x) => x.targetId === s.ids.post)!;
    assert.equal(saved.status, 'open');
    assert.equal(saved.targetOwnerId, AUTHOR);
    assert.match(saved.excerpt!, /buy my essays/);
    // the reporter's copy has no moderation internals
    assert.deepEqual(Object.keys(r.body.reports[0]).sort(), ['createdAt', 'id', 'reason', 'reporterId', 'status', 'targetId', 'targetType']);
    assert.equal(s.mails.length, 1);
    const m = s.mails[0];
    assert.equal(m.to, 'ops@example.com');
    assert.match(m.subject, /\[Lumi report\] post/);
    assert.match(m.text, /Reason: Spam or ads — selling essays/);
    assert.match(m.text, /Reporter: Viv \(u_mod_viewer\)/);
    assert.match(m.text, /Owner: Ottoline \(u_mod_author\)/);
    assert.match(m.text, /Content: "buy my essays, cheap"/);
    assert.ok(m.text.includes(`https://lumi.example/admin/reports#${saved.id}`));
    assert.ok(logs.some((l) => l.startsWith(`[report] ${saved.id} post ${s.ids.post}`)), 'one log line per report');
    assert.ok(!logs.join('\n').includes(KEY), 'admin key never logged');
    // the same person reporting the same thing again: no second report, no second e-mail
    const again = await s.report('tok_viewer', VIEWER, 'post', s.ids.post, 'again');
    assert.equal(again.status, 200);
    assert.equal(s.db.reports.length, 1);
    assert.equal(s.mails.length, 1);
    // the report reaches only the reporter's screen
    assert.equal(s.sees(VIEWER).reports.length, 1);
    assert.equal(s.sees(AUTHOR).reports.length, 0);
    assert.equal(s.sees(VIEWER).reports[0].log, undefined);
  } finally { console.log = orig; await s.done(); }
});

test('reports: FEEDBACK_EMAIL unset → saved and logged, no crash; bad input is refused', async () => {
  const s = await setup({ FEEDBACK_EMAIL: undefined });
  const warns: string[] = []; const orig = console.warn; console.warn = (...a: unknown[]) => { warns.push(a.join(' ')); };
  try {
    const r = await s.report('tok_viewer', VIEWER, 'ride', s.ids.ride);
    assert.equal(r.status, 200);
    assert.equal(s.mails.length, 0);
    assert.ok(warns.some((w) => /FEEDBACK_EMAIL is not set/.test(w)));
    assert.equal((await s.report('tok_viewer', AUTHOR, 'post', s.ids.post)).status, 403, 'on behalf of someone else');
    assert.equal((await s.report('tok_viewer', VIEWER, 'banana', s.ids.post)).status, 400);
    assert.equal((await s.report('tok_viewer', VIEWER, 'post', s.ids.post, '   ')).status, 400);
    assert.equal((await s.call('POST', '/api/rpc/reports/create', { key: null, body: { args: [VIEWER, 'post', s.ids.post, 'x'] } })).status, 401);
  } finally { console.warn = orig; await s.done(); }
});

test('admin endpoints need ADMIN_KEY — missing, wrong or unset key is refused and nothing changes', async () => {
  const s = await setup();
  try {
    await s.report('tok_viewer', VIEWER, 'post', s.ids.post);
    const id = s.db.reports[0].id;
    assert.equal((await s.call('GET', '/api/admin/reports', { key: null })).status, 403);
    assert.equal((await s.call('GET', '/api/admin/reports', { key: 'wrong' })).status, 403);
    for (const action of ['dismiss', 'remove', 'suspend']) assert.equal((await s.call('POST', `/api/admin/reports/${id}/${action}`, { key: 'wrong', body: {} })).status, 403);
    assert.equal((await s.call('POST', `/api/admin/users/${AUTHOR}/unsuspend`, { key: null, body: {} })).status, 403);
    assert.equal(s.db.reports[0].status, 'open');
    assert.ok(s.db.posts.some((p) => p.id === s.ids.post));
    assert.ok(!s.db.users.find((u) => u.id === AUTHOR)!.suspended);
    // a signed-in user's token is not an admin key
    assert.equal((await s.call('GET', '/api/admin/reports', { key: null, token: 'tok_viewer' })).status, 403);
    const ok = await s.call('GET', '/api/admin/reports');
    assert.equal(ok.status, 200);
    assert.equal(ok.body.reports[0].id, id);
    assert.match(ok.body.reports[0].target.excerpt, /buy my essays/);
    assert.equal(ok.body.reports[0].owner.id, AUTHOR);
  } finally { await s.done(); }
  const unset = await setup({ ADMIN_KEY: undefined });
  try { assert.equal((await unset.call('GET', '/api/admin/reports', { key: '' })).status, 503); } finally { await unset.done(); }
});

test('admin page: a static shell with no data, not cached or indexed, user content only via textContent', async () => {
  const s = await setup();
  try {
    await s.report('tok_viewer', VIEWER, 'post', s.ids.post);
    const res = await fetch(`${s.url}/admin/reports`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(res.headers.get('cache-control') ?? '', /no-store/);
    assert.match(res.headers.get('x-robots-tag') ?? '', /noindex/);
    assert.match(res.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);
    assert.ok(!html.includes('buy my essays') && !html.includes(KEY), 'no report data or key in the page');
    assert.ok(!/innerHTML/.test(html), 'never innerHTML');
    assert.match(html, /x-admin-key/);
  } finally { await s.done(); }
});

test('dismiss: the report closes with who/when in its log, the content stays', async () => {
  const s = await setup();
  try {
    await s.report('tok_viewer', VIEWER, 'post', s.ids.post);
    await s.report('tok_r1', R[0], 'post', s.ids.post);
    const [a, b] = s.db.reports;
    const r = await s.call('POST', `/api/admin/reports/${a.id}/dismiss`, { name: 'Dana', body: { note: 'satire, not spam' } });
    assert.equal(r.status, 200);
    for (const x of [a, b]) { // every open report on the same target is closed with it
      assert.equal(x.status, 'dismissed');
      assert.equal(x.log!.at(-1)!.action, 'dismissed');
      assert.equal(x.log!.at(-1)!.by, 'Dana');
      assert.equal(x.log!.at(-1)!.note, 'satire, not spam');
      assert.ok(Date.parse(x.log!.at(-1)!.at) > 0);
    }
    assert.ok(s.sees(VIEWER).posts.some((p) => p.id === s.ids.post));
    assert.equal(s.sees(VIEWER).reports[0].status, 'dismissed', "the reporter's list shows it as reviewed");
    const open = await s.call('GET', '/api/admin/reports');
    assert.equal(open.body.reports.length, 0);
    const all = await s.call('GET', '/api/admin/reports?status=all');
    assert.equal(all.body.reports.length, 2);
  } finally { await s.done(); }
});

test('remove: post, comment, meetup, ride and a chat message disappear from every open screen', async () => {
  const s = await setup();
  try {
    // everyone has them before
    assert.ok(s.sees(VIEWER).posts.some((p) => p.id === s.ids.post));
    assert.ok(s.sees(VIEWER).activities.some((a) => a.id === s.ids.meetup));
    assert.ok(s.sees(VIEWER).rides!.some((r) => r.id === s.ids.ride));

    const rm = async (type: string, id: ID, body: Record<string, unknown> = {}) => {
      await s.report('tok_viewer', VIEWER, type, id);
      const rep = s.db.reports.at(-1)!;
      const r = await s.call('POST', `/api/admin/reports/${rep.id}/remove`, { name: 'Dana', body });
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal(rep.status, 'actioned');
      assert.equal(rep.log!.at(-1)!.action, 'removed');
      assert.equal(rep.log!.at(-1)!.by, 'Dana');
      return rep;
    };
    await rm('post', s.ids.post);
    assert.ok(!s.db.posts.some((p) => p.id === s.ids.post));
    for (const v of [VIEWER, AUTHOR, R[0]]) assert.ok(!s.sees(v).posts.some((p) => p.id === s.ids.post), `post gone for ${v}`);

    await rm('comment', s.ids.commentId);
    assert.ok(!s.sees(VIEWER).posts.find((p) => p.id === s.ids.other)!.comments.some((c) => c.id === s.ids.commentId));
    await rm('comment', s.ids.actComment);
    assert.ok(!s.sees(VIEWER).activities.find((a) => a.id === s.ids.meetup)!.comments.some((c) => c.id === s.ids.actComment));

    // a chat report points at the room: the admin picks the message
    await s.report('tok_viewer', VIEWER, 'message', s.ids.room);
    const roomRep = s.db.reports.at(-1)!;
    assert.equal((await s.call('POST', `/api/admin/reports/${roomRep.id}/remove`, { body: {} })).status, 400);
    assert.equal((await s.call('POST', `/api/admin/reports/${roomRep.id}/remove`, { body: { messageId: s.ids.badMsg } })).status, 200);
    const room = s.sees(VIEWER).chatRooms.find((r) => r.id === s.ids.room)!;
    assert.ok(!room.messages.some((m) => m.id === s.ids.badMsg));
    assert.ok(room.messages.some((m) => m.text === 'ok see you'));

    await rm('activity', s.ids.meetup);
    assert.ok(!s.sees(VIEWER).activities.some((a) => a.id === s.ids.meetup));
    assert.ok(!s.sees(VIEWER).participations.some((p) => p.activityId === s.ids.meetup));
    assert.ok(!s.sees(VIEWER).chatRooms.some((r) => r.id === s.ids.room));

    await rm('ride', s.ids.ride);
    assert.ok(!s.sees(VIEWER).rides!.some((r) => r.id === s.ids.ride));
    assert.ok(!s.sees(AUTHOR).rides!.some((r) => r.id === s.ids.ride));

    // a profile can't be "removed" — suspend instead; already-gone content says so
    await s.report('tok_viewer', VIEWER, 'user', AUTHOR);
    assert.equal((await s.call('POST', `/api/admin/reports/${s.db.reports.at(-1)!.id}/remove`, { body: {} })).status, 400);
    await s.report('tok_r1', R[0], 'post', s.ids.post);
    const gone = await s.call('POST', `/api/admin/reports/${s.db.reports.at(-1)!.id}/remove`, { body: {} });
    assert.equal(gone.status, 409);
    assert.match(gone.body.error, /already gone/);
  } finally { await s.done(); }
  // deletions reach the store (removed.* deletes the rows)
  const snap = (await s.store.loadSnapshot())!;
  assert.ok(!snap.posts.some((p) => p.id === s.ids.post));
  assert.ok(!snap.activities.some((a) => a.id === s.ids.meetup));
  assert.ok(!(snap.rides ?? []).some((r) => r.id === s.ids.ride));
});

test('suspend: signed out, can not sign in, report or post; hidden from everyone; unsuspend brings it all back', async () => {
  const s = await setup();
  try {
    await s.report('tok_viewer', VIEWER, 'user', AUTHOR, 'Harassment or hate speech');
    const rep = s.db.reports.at(-1)!;
    const r = await s.call('POST', `/api/admin/reports/${rep.id}/suspend`, { name: 'Dana', body: { note: 'threats in chat' } });
    assert.equal(r.status, 200);
    const author = s.db.users.find((u) => u.id === AUTHOR)!;
    assert.equal(author.suspended!.by, 'Dana');
    assert.equal(author.suspended!.reportId, rep.id);
    assert.equal(rep.status, 'actioned');
    assert.equal(rep.log!.at(-1)!.action, 'suspended');
    assert.deepEqual(s.disconnected, [AUTHOR], 'open event streams closed');

    // can't sign in, the old session no longer works, can't report or post
    assert.match(signInBlock(author, { PRIVACY_CONTACT_EMAIL: 'safety@example.com' })!, /suspended.*safety@example\.com/);
    assert.equal(signInBlock(s.db.users.find((u) => u.id === VIEWER)), null);
    assert.equal((await s.report('tok_author', AUTHOR, 'user', VIEWER)).status, 403);
    assert.equal((await s.call('POST', '/api/rpc/posts/create', { token: 'tok_author', key: null, body: { text: 'still here' } })).status, 403);
    assert.ok(!s.db.posts.some((p) => p.text === 'still here'));
    assert.equal((await s.call('POST', '/api/rpc/posts/create', { token: 'tok_viewer', key: null, body: { text: 'viewer can post' } })).status, 200);

    // gone from other people's open screens and fresh snapshots — profile, posts, comments, meetups, rides, messages
    for (const view of [s.sees(VIEWER), snapshotFor(s.db, VIEWER), s.sees(R[1])]) {
      assert.ok(!view.users.some((u) => u.id === AUTHOR));
      assert.ok(!view.posts.some((p) => p.authorId === AUTHOR));
      assert.ok(!view.posts.some((p) => p.comments.some((c) => c.authorId === AUTHOR)));
      assert.ok(!view.activities.some((a) => a.hostId === AUTHOR || a.comments.some((c) => c.authorId === AUTHOR)));
      assert.ok(!(view.rides ?? []).some((x) => x.hostId === AUTHOR));
      assert.ok(!view.chatRooms.some((room) => room.messages.some((m) => m.senderId === AUTHOR)));
    }
    assert.ok(s.db.posts.some((p) => p.id === s.ids.post), 'nothing is deleted by a suspension');

    // the shared demo login can never be suspended
    await s.report('tok_viewer', VIEWER, 'user', DEMO);
    assert.equal((await s.call('POST', `/api/admin/reports/${s.db.reports.at(-1)!.id}/suspend`, { body: {} })).status, 400);
    assert.ok(!s.db.users.find((u) => u.id === DEMO)!.suspended);

    // unsuspend → back for everyone, session works again, log on the report
    assert.equal((await s.call('POST', `/api/admin/users/${AUTHOR}/unsuspend`, { name: 'Sam', body: {} })).status, 200);
    assert.equal(author.suspended, undefined);
    assert.equal(rep.log!.at(-1)!.action, 'unsuspended');
    assert.equal(rep.log!.at(-1)!.by, 'Sam');
    const v = s.sees(VIEWER);
    assert.ok(v.users.some((u) => u.id === AUTHOR));
    assert.ok(v.posts.some((p) => p.id === s.ids.post));
    assert.ok(v.posts.find((p) => p.id === s.ids.other)!.comments.some((c) => c.id === s.ids.commentId));
    assert.ok(v.activities.some((a) => a.id === s.ids.meetup));
    assert.ok(v.rides!.some((x) => x.id === s.ids.ride));
    assert.ok(v.chatRooms.find((room) => room.id === s.ids.room)!.messages.some((m) => m.id === s.ids.badMsg));
    assert.equal((await s.call('POST', '/api/rpc/posts/create', { token: 'tok_author', key: null, body: { text: 'back' } })).status, 200);
  } finally { await s.done(); }
});

test('suspension and report status are persisted (restart keeps them)', async () => {
  const s = await setup();
  try {
    await s.report('tok_viewer', VIEWER, 'post', s.ids.post);
    await s.call('POST', `/api/admin/reports/${s.db.reports[0].id}/suspend`, { name: 'Dana', body: {} });
  } finally { await s.done(); }
  const snap = (await s.store.loadSnapshot())!;
  assert.equal(snap.users.find((u) => u.id === AUTHOR)!.suspended!.by, 'Dana');
  assert.equal(snap.reports[0].status, 'actioned');
  assert.equal(snap.reports[0].log!.at(-1)!.action, 'suspended');
});

test(`auto-hide: ${AUTO_HIDE_REPORTS} distinct real accounts hide a post from everyone but its author; dismiss shows it again`, async () => {
  const s = await setup();
  try {
    const visible = (v: ID) => s.sees(v).posts.some((p) => p.id === s.ids.post);
    await s.report('tok_r1', R[0], 'post', s.ids.post);
    await s.report('tok_r1', R[0], 'post', s.ids.post);       // same person twice counts once
    await s.report('tok_demo', DEMO, 'post', s.ids.post);     // demo/sample accounts don't count
    await s.report('tok_author', AUTHOR, 'post', s.ids.post); // nor the author
    await s.report('tok_r2', R[1], 'post', s.ids.post);
    assert.ok(visible(VIEWER) && visible(R[3]), 'two real reports: still visible');
    assert.ok(!s.mails.some((m) => /AUTO-HIDDEN/.test(m.subject)));

    await s.report('tok_r3', R[2], 'post', s.ids.post);
    assert.ok(!visible(VIEWER) && !visible(R[3]) && !visible(R[0]), 'hidden from everyone else (open screens)');
    assert.ok(!snapshotFor(s.db, VIEWER).posts.some((p) => p.id === s.ids.post), 'and fresh snapshots');
    assert.ok(visible(AUTHOR), 'the author still sees it');
    assert.ok(s.db.posts.some((p) => p.id === s.ids.post), 'pending review, not deleted');
    assert.match(s.mails.at(-1)!.subject, /AUTO-HIDDEN/);
    assert.ok(s.db.reports.filter((r) => r.targetId === s.ids.post).every((r) => r.log!.some((l) => l.action === 'auto_hidden' && l.by === 'system')));
    const list = await s.call('GET', '/api/admin/reports');
    assert.ok(list.body.reports.every((r: { autoHidden: boolean }) => r.autoHidden));

    await s.call('POST', `/api/admin/reports/${s.db.reports.at(-1)!.id}/dismiss`, { body: {} });
    assert.ok(visible(VIEWER) && visible(R[3]), 'dismissed → visible again on open screens');
  } finally { await s.done(); }
});

test('auto-hide works for comments too, and removal keeps it gone', async () => {
  const s = await setup();
  try {
    const visible = (v: ID) => s.sees(v).posts.find((p) => p.id === s.ids.other)!.comments.some((c) => c.id === s.ids.commentId);
    for (let i = 0; i < AUTO_HIDE_REPORTS; i++) await s.report(`tok_r${i + 1}`, R[i], 'comment', s.ids.commentId);
    assert.ok(!visible(VIEWER), 'hidden from the post owner');
    assert.ok(!visible(R[3]));
    assert.ok(visible(AUTHOR), 'the comment author still sees it');
    assert.ok(s.sees(VIEWER).posts.some((p) => p.id === s.ids.other), 'the post itself stays');
    await s.call('POST', `/api/admin/reports/${s.db.reports[0].id}/remove`, { body: {} });
    assert.ok(!visible(AUTHOR) && !visible(VIEWER));
    assert.ok(s.db.reports.every((r) => r.status === 'actioned'));
  } finally { await s.done(); }
});

test('the Terms page states the same auto-hide threshold the server uses', () => {
  const terms = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src', 'pages', 'legal', 'LegalPages.tsx'), 'utf8');
  assert.match(terms, new RegExp(`When ${AUTO_HIDE_REPORTS} different people report the same post or comment, it's hidden from everyone except the person who wrote it`));
});
