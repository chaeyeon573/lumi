/**
 * Student ID photo verification (server/idverify.ts) — the fallback when a school e-mail can't be used.
 *   - sign-up without a verified e-mail starts pending; under-16 is still refused on this path
 *   - a pending account can't post, join, message, befriend, request a group, make plans, upload or ask in class Q&A
 *     (server-side gate), and other people don't see it — until an admin approves
 *   - only the admin key reads the photo; EXIF is stripped; non-images are refused; the photo is deleted after a decision
 *   - submissions are rate-limited
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Patch, Snapshot } from '@core/api/types';
import type { ID, User } from '@core/types';
import * as seed from '@core/data/seed.en';
import { awaitingVerification, verificationStep } from '@core/lib/verification';
import { sanitizeSelfUpdate } from '@core/lib/selfupdate';
import { FileStore } from './store';
import { sessionAuth } from './moderation';
import { snapshotFor } from './view';
import { acceptIdPhoto, cleanJpeg, createIdVerify, ID_PHOTOS, ID_REQUESTS, PENDING_MESSAGE, PHOTOS_PER_USER_DAY, pendingGate, registerIdVerifyRoutes, registerProblem } from './idverify';

const KEY = 'test-admin-key-idv-71c3';
const PENDING = 'u_idv_pending';
const VIEWER = 'u_idv_viewer';
const LEGACY = 'u_idv_legacy';

/** a structurally valid JPEG: JFIF, an EXIF block with GPS text, a comment, SOF0 (w×h), one scan with a stuffed 0xFF00 */
function jpeg(w = 800, h = 500, withExif = true): Buffer {
  const seg = (marker: number, payload: Buffer) => { const head = Buffer.alloc(4); head[0] = 0xff; head[1] = marker; head.writeUInt16BE(payload.length + 2, 2); return Buffer.concat([head, payload]); };
  const sof = Buffer.alloc(15); sof[0] = 8; sof.writeUInt16BE(h, 1); sof.writeUInt16BE(w, 3); sof[5] = 3;
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    seg(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'binary')),
    ...(withExif ? [seg(0xe1, Buffer.from('Exif\0\0GPSLatitude 37.8719 N GPSLongitude 122.2585 W iPhone 15', 'binary')), seg(0xfe, Buffer.from('taken at 2650 Durant Ave'))] : []),
    seg(0xdb, Buffer.alloc(65, 1)),
    seg(0xc0, sof),
    seg(0xc4, Buffer.alloc(20, 2)),
    seg(0xda, Buffer.from([1, 1, 0, 0, 0x3f, 0])),
    Buffer.from([0x12, 0x34, 0xff, 0x00, 0x56, 0xff, 0xd0, 0x78]),
    Buffer.from([0xff, 0xd9]),
  ]);
}
const b64 = (b: Buffer) => `data:image/jpeg;base64,${b.toString('base64')}`;

async function setup() {
  const db: Snapshot = structuredClone({
    users: seed.users, schools: seed.schools, organizations: seed.organizations, activities: seed.activities,
    participations: seed.participations, posts: seed.posts, relationships: seed.relationships, proposals: seed.proposals,
    chatRooms: seed.chatRooms, notifications: [], reports: [], opportunities: seed.opportunities,
    opportunityIntents: seed.opportunityIntents, timePolls: seed.timePolls, games: [], rides: [],
  });
  for (const u of db.users) u.sample = true;
  const base = db.users.find((u) => u.id === 'u_me')!;
  const real = (id: ID, nickname: string, extra: Partial<User> = {}): User => ({ ...structuredClone(base), id, nickname, sample: undefined, createdAt: new Date().toISOString(), ...extra });
  const unverified = { ...base.affiliation, emailVerified: false } as User['affiliation'];
  db.users.push(
    real(PENDING, 'Penny', { affiliation: unverified, birthYear: 2001, verification: { method: 'student_id', status: 'pending' } }),
    real(VIEWER, 'Viv'),
    real(LEGACY, 'Leo', { affiliation: unverified }),
  );
  const store = new FileStore(path.join(mkdtempSync(path.join(tmpdir(), 'lumi-idv-')), 'db.json')); await store.init();
  const pushed: Patch[] = [];
  const iv = createIdVerify({ db: () => db, store, push: (p) => pushed.push(p) });
  await iv.load();

  const tokens: Record<ID, string> = { [PENDING]: 'tok-pending', [VIEWER]: 'tok-viewer', [LEGACY]: 'tok-legacy' };
  const auth = sessionAuth({ db: () => db, findSession: async (t) => { const id = Object.keys(tokens).find((k) => tokens[k] === t); return id ? { userId: id } : null; } });
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '2mb' }));
  app.use(['/api/rpc', '/api/media', '/api/classqa'], auth, pendingGate(() => db));
  // stand-ins for the real routes behind the gate (server/index.ts, plans.ts, media, classqa.ts)
  const ok = (_req: express.Request, res: express.Response) => { res.json({ ok: true }); };
  app.post('/api/rpc/:group/:method', ok);
  app.post('/api/media', ok);
  app.post('/api/classqa/:what', ok);
  registerIdVerifyRoutes(app, iv, { auth, env: { ADMIN_KEY: KEY } });
  const server = app.listen(0);
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const call = async (p: string, opts: { as?: ID; body?: unknown; admin?: string; method?: string; ip?: string } = {}) => {
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    if (opts.as) headers.authorization = `Bearer ${tokens[opts.as]}`;
    if (opts.admin) headers['x-admin-key'] = opts.admin;
    if (opts.ip) headers['x-forwarded-for'] = opts.ip;
    const res = await fetch(url + p, { method: opts.method ?? (opts.body === undefined ? 'GET' : 'POST'), headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
    const type = res.headers.get('content-type') ?? '';
    return { status: res.status, headers: res.headers, json: type.includes('json') ? await res.json() as Record<string, unknown> : null, bytes: type.includes('json') ? null : Buffer.from(await res.arrayBuffer()) };
  };
  const rpc = (as: ID, group: string, method: string, args: unknown[]) => call(`/api/rpc/${group}/${method}`, { as, body: { args } });
  const user = (id: ID) => db.users.find((u) => u.id === id)!;
  return { db, store, iv, pushed, call, rpc, user, close: () => server.close() };
}

test('sign-up: a verified school e-mail starts verified, no e-mail starts pending, under-16 is refused either way', () => {
  const now = new Date('2026-11-06T12:00:00Z');
  assert.deepEqual(registerProblem({ birthYear: 2004 }, true, now), { verification: undefined });
  assert.deepEqual(registerProblem({ birthYear: 2004 }, false, now), { verification: { method: 'student_id', status: 'pending' } });
  assert.deepEqual(registerProblem({ birthYear: 2011 }, false, now), { error: 'under_16' });
  assert.deepEqual(registerProblem({ birthYear: 2011 }, true, now), { error: 'under_16' });
  assert.deepEqual(registerProblem({ birthYear: 1850 }, false, now), { error: 'invalid' });
});

test('state helpers: what the app asks for next', () => {
  assert.equal(verificationStep({}), 'none');
  assert.equal(verificationStep({ verification: { method: 'student_id', status: 'pending' } }), 'photo');
  assert.equal(verificationStep({ verification: { method: 'student_id', status: 'pending', submittedAt: 'x' } }), 'review');
  assert.equal(verificationStep({ verification: { method: 'student_id', status: 'rejected', reason: 'blurry' } }), 'retake');
  assert.equal(awaitingVerification({ verification: { method: 'student_id', status: 'approved' } }), false);
});

test('a student cannot set their own verification through a profile update', () => {
  const u = { id: 'u1', affiliation: { type: 'university', schoolId: 's_berkeley', emailVerified: false }, verification: { method: 'student_id', status: 'pending' } } as unknown as User;
  const out = sanitizeSelfUpdate(u, { verification: { method: 'student_id', status: 'approved' }, nickname: 'x' } as Partial<User>);
  assert.equal('verification' in out, false);
  assert.equal(out.nickname, 'x');
});

test('photo: EXIF/GPS and comments are stripped, the image data stays; non-images and tiny images are refused', () => {
  const raw = jpeg();
  assert.match(raw.toString('binary'), /GPSLatitude/);
  const clean = cleanJpeg(raw)!;
  assert.ok(clean);
  assert.equal(clean.width, 800); assert.equal(clean.height, 500);
  assert.doesNotMatch(clean.data.toString('binary'), /GPS|Exif|Durant/);
  assert.match(clean.data.toString('binary'), /JFIF/);
  assert.equal(clean.data.subarray(-2).toString('hex'), 'ffd9');
  assert.ok(clean.data.includes(Buffer.from([0x12, 0x34, 0xff, 0x00, 0x56, 0xff, 0xd0, 0x78])), 'scan data copied as is');

  const png = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
  assert.match((acceptIdPhoto(png.toString('base64')) as { error: string }).error, /Only photos/);
  assert.match((acceptIdPhoto(Buffer.from('<script>alert(1)</script>').toString('base64')) as { error: string }).error, /Only photos/);
  assert.match((acceptIdPhoto('not base64 at all !!') as { error: string }).error, /couldn’t be read/);
  assert.match((acceptIdPhoto(b64(jpeg(120, 90))) as { error: string }).error, /too small/);
  assert.match((acceptIdPhoto(b64(Buffer.concat([jpeg(), Buffer.alloc(1_600_000)]))) as { error: string }).error, /too large/);
  // a JPEG cut off in the middle of a segment
  assert.equal(cleanJpeg(jpeg().subarray(0, 40)), null);
  assert.equal('error' in acceptIdPhoto(b64(jpeg())), false);
});

test('a pending account can look around but not reach other people — the server refuses, not just the screen', async () => {
  const s = await setup();
  try {
    const blocked: [string, string, unknown[]][] = [
      ['posts', 'create', [PENDING, { text: 'hi', media: [], tags: [], visibility: 'school' }]],
      ['posts', 'comment', ['p1', PENDING, 'hi']],
      ['activities', 'create', [PENDING, {}]],
      ['activities', 'join', ['a1', PENDING]],
      ['activities', 'joinWaitlist', ['a1', PENDING]],
      ['chats', 'send', ['room', PENDING, 'hey']],
      ['chats', 'openDirect', [PENDING, VIEWER]],
      ['relationships', 'sendFriendRequest', [PENDING, VIEWER]],
      ['relationships', 'toggleFollow', [PENDING, VIEWER, 'user']],
      ['relationships', 'toggleLike', [PENDING, VIEWER]],
      ['orgs', 'apply', ['o1', PENDING]],
      ['orgs', 'create', [PENDING, {}]],
      ['proposals', 'create', [PENDING, {}]],
      ['games', 'send', [PENDING, {}]],
      ['together', 'create', [PENDING, {}]],
      ['plans', 'create', [PENDING, {}]],
      ['rides', 'create', [PENDING, {}]],
      ['opportunities', 'goTogether', ['o', PENDING]],
      ['opportunities', 'ask', ['o', PENDING, 'q']],
      ['users', 'votePoll', [VIEWER, PENDING, 0]],
      ['classes', 'respond', ['g', PENDING, 'yes']],
      ['somethingNew', 'later', [PENDING]],
    ];
    for (const [g, m, args] of blocked) {
      const r = await s.rpc(PENDING, g, m, args);
      assert.equal(r.status, 403, `${g}.${m} should be refused`);
      assert.equal(r.json?.error, PENDING_MESSAGE);
    }
    assert.equal((await s.call('/api/media', { as: PENDING, body: { data: 'x' } })).status, 403);
    assert.equal((await s.call('/api/classqa/ask', { as: PENDING, body: { key: 'k', text: 'q' } })).status, 403);
    assert.equal((await s.call('/api/classqa/answer', { as: PENDING, body: {} })).status, 403);

    const allowed: [string, string, unknown[]][] = [
      ['users', 'update', [PENDING, { bio: 'hi' }]],
      ['users', 'setAvailability', [PENDING, 'now']],
      ['relationships', 'toggleFollow', [PENDING, 'org_1', 'org']],
      ['relationships', 'block', [PENDING, VIEWER]],
      ['posts', 'toggleSave', ['p1', PENDING]],
      ['opportunities', 'toggleSave', ['o1', PENDING]],
      ['notifications', 'markAllRead', [PENDING]],
      ['reports', 'create', [PENDING, 'user', VIEWER, 'spam']],
    ];
    for (const [g, m, args] of allowed) assert.equal((await s.rpc(PENDING, g, m, args)).status, 200, `${g}.${m} should be allowed`);
    assert.equal((await s.call('/api/classqa/list', { as: PENDING, body: { key: 'k' } })).status, 200);

    // everyone else is unaffected — including an old unverified account that never entered the ID flow
    assert.equal((await s.rpc(VIEWER, 'posts', 'create', [VIEWER, {}])).status, 200);
    assert.equal((await s.rpc(LEGACY, 'activities', 'join', ['a1', LEGACY])).status, 200);

    // not in other people's lists; still sees themselves
    assert.equal(snapshotFor(s.db, VIEWER).users.some((u) => u.id === PENDING), false);
    assert.equal(snapshotFor(s.db, PENDING).users.some((u) => u.id === PENDING), true);
    assert.equal(snapshotFor(s.db, PENDING).users.find((u) => u.id === PENDING)!.verification?.status, 'pending');
  } finally { s.close(); }
});

test('only the admin key reads the photo; it is never in a snapshot; approve deletes it and opens the account', async () => {
  const s = await setup();
  try {
    const sent = await s.call('/api/verification/student-id', { as: PENDING, body: { data: b64(jpeg()) } });
    assert.equal(sent.status, 200, JSON.stringify(sent.json));
    assert.equal((sent.json!.user as User).verification?.status, 'pending');
    assert.ok((sent.json!.user as User).verification?.submittedAt);
    const [req] = s.iv.requests();
    assert.equal(req.userId, PENDING);
    // stored without metadata, outside the snapshot
    const stored = await s.store.getDoc<{ id: string; data: string }>(ID_PHOTOS, req.id);
    assert.ok(stored);
    assert.doesNotMatch(Buffer.from(stored!.data, 'base64').toString('binary'), /GPS|Exif|Durant/);
    assert.doesNotMatch(JSON.stringify(snapshotFor(s.db, PENDING)), new RegExp(req.id));
    assert.doesNotMatch(JSON.stringify(s.pushed), /base64|idPhotos|\/9j\//);

    // who can read it
    const photo = `/api/admin/verifications/${req.id}/photo`;
    assert.equal((await s.call(photo)).status, 403);
    assert.equal((await s.call(photo, { as: PENDING })).status, 403);
    assert.equal((await s.call(photo, { as: VIEWER })).status, 403);
    assert.equal((await s.call(photo, { admin: 'wrong' })).status, 403);
    assert.equal((await s.call('/api/admin/verifications', { as: VIEWER })).status, 403);
    const ok = await s.call(photo, { admin: KEY });
    assert.equal(ok.status, 200);
    assert.equal(ok.headers.get('content-type'), 'image/jpeg');
    assert.match(ok.headers.get('cache-control') ?? '', /no-store/);
    assert.equal(ok.bytes!.subarray(0, 2).toString('hex'), 'ffd8');

    // the review list: name, school, birth year — and no image
    const list = await s.call('/api/admin/verifications', { admin: KEY });
    const item = (list.json!.requests as { id: string; user: { nickname: string; birthYear: number }; school: { name: string } }[])[0];
    assert.equal(item.id, req.id); assert.equal(item.user.nickname, 'Penny'); assert.equal(item.user.birthYear, 2001); assert.equal(item.school.name, 'UC Berkeley');
    assert.doesNotMatch(JSON.stringify(list.json), /data:|base64/);

    // a student can't approve themselves
    assert.equal((await s.call(`/api/admin/verifications/${req.id}/approve`, { as: PENDING, body: {} })).status, 403);

    const approved = await s.call(`/api/admin/verifications/${req.id}/approve`, { admin: KEY, body: {} });
    assert.equal(approved.status, 200);
    assert.equal(await s.store.getDoc(ID_PHOTOS, req.id), null, 'photo deleted after approval');
    assert.equal((await s.call(photo, { admin: KEY })).status, 404);
    const u = s.user(PENDING);
    assert.equal(u.verification?.status, 'approved');
    assert.equal(u.affiliation.type === 'university' && u.affiliation.emailVerified, true);
    assert.ok(s.db.notifications.some((n) => n.userId === PENDING && n.type === 'verification' && /verified/i.test(n.title)));
    // the audit line stays (no image), and the queue is empty
    const kept = await s.store.listDocs<{ id: string; decision?: { status: string } }>(ID_REQUESTS);
    assert.equal(kept[0].decision?.status, 'approved');
    assert.equal(((await s.call('/api/admin/verifications', { admin: KEY })).json!.requests as unknown[]).length, 0);
    // deciding twice is refused
    assert.equal((await s.call(`/api/admin/verifications/${req.id}/reject`, { admin: KEY, body: { reason: 'x' } })).status, 409);

    // the gate opens and other people see them now
    assert.equal((await s.rpc(PENDING, 'posts', 'create', [PENDING, {}])).status, 200);
    assert.equal(snapshotFor(s.db, VIEWER).users.some((x) => x.id === PENDING), true);
  } finally { s.close(); }
});

test('reject: needs a reason, deletes the photo, tells the student why, keeps the gate; a new photo can follow', async () => {
  const s = await setup();
  try {
    await s.call('/api/verification/student-id', { as: PENDING, body: { data: b64(jpeg()) } });
    const [req] = s.iv.requests();
    assert.equal((await s.call(`/api/admin/verifications/${req.id}/reject`, { admin: KEY, body: { reason: '  ' } })).status, 400);
    const r = await s.call(`/api/admin/verifications/${req.id}/reject`, { admin: KEY, body: { reason: 'The name on the card is too blurry to read.' } });
    assert.equal(r.status, 200);
    assert.equal(await s.store.getDoc(ID_PHOTOS, req.id), null, 'photo deleted after rejection');
    const u = s.user(PENDING);
    assert.equal(u.verification?.status, 'rejected');
    assert.equal(u.verification?.reason, 'The name on the card is too blurry to read.');
    assert.equal(u.affiliation.type === 'university' && u.affiliation.emailVerified, false);
    const n = s.db.notifications.find((x) => x.userId === PENDING && x.type === 'verification')!;
    assert.match(n.body, /too blurry/); assert.equal(n.link, '/verify-id');
    assert.equal((await s.rpc(PENDING, 'chats', 'send', ['r', PENDING, 'hi'])).status, 403);
    assert.equal(snapshotFor(s.db, VIEWER).users.some((x) => x.id === PENDING), false);
    // the reason reaches only the student
    assert.equal(snapshotFor(s.db, VIEWER).users.some((x) => x.verification), false);

    const again = await s.call('/api/verification/student-id', { as: PENDING, body: { data: b64(jpeg(900, 600)) } });
    assert.equal(again.status, 200);
    assert.equal(s.user(PENDING).verification?.status, 'pending');
    assert.equal(((await s.call('/api/admin/verifications', { admin: KEY })).json!.requests as unknown[]).length, 1);
  } finally { s.close(); }
});

test('submissions: rate-limited, non-images refused, a newer photo replaces the waiting one, accounts outside the flow refused', async () => {
  const s = await setup();
  try {
    assert.equal((await s.call('/api/verification/student-id', { body: { data: b64(jpeg()) } })).status, 401);
    assert.equal((await s.call('/api/verification/student-id', { as: PENDING, body: { data: Buffer.from('GIF89a....').toString('base64') } })).status, 400);
    assert.equal((await s.call('/api/verification/student-id', { as: LEGACY, body: { data: b64(jpeg()) } })).status, 409);
    assert.equal((await s.call('/api/verification/student-id', { as: VIEWER, body: { data: b64(jpeg()) } })).status, 409);
    for (let i = 0; i < PHOTOS_PER_USER_DAY; i++) assert.equal((await s.call('/api/verification/student-id', { as: PENDING, body: { data: b64(jpeg()) } })).status, 200);
    const limited = await s.call('/api/verification/student-id', { as: PENDING, body: { data: b64(jpeg()) } });
    assert.equal(limited.status, 429);
    // only the newest photo is kept and waiting
    const waiting = s.iv.requests().filter((r) => !r.decision);
    assert.equal(waiting.length, 1);
    const photos = await s.store.listDocs(ID_PHOTOS);
    assert.deepEqual(photos.map((p) => p.id), [waiting[0].id]);
  } finally { s.close(); }
});

test('deleting the account deletes the photo and the request lines; e-mail verification later clears the wait', async () => {
  const s = await setup();
  try {
    await s.call('/api/verification/student-id', { as: PENDING, body: { data: b64(jpeg()) } });
    await s.iv.verifiedByEmail(PENDING);
    assert.equal(awaitingVerification(s.user(PENDING)), false);
    assert.equal((await s.store.listDocs(ID_PHOTOS)).length, 0);
    await s.iv.forgetUser(PENDING);
    assert.equal((await s.store.listDocs(ID_REQUESTS)).length, 0);
    assert.equal(s.iv.requests().length, 0);
  } finally { s.close(); }
});

test('the review page holds no data and is locked down', async () => {
  const s = await setup();
  try {
    const page = await s.call('/admin/verifications');
    assert.equal(page.status, 200);
    assert.match(page.headers.get('content-security-policy') ?? '', /img-src blob:/);
    assert.equal(page.headers.get('cache-control'), 'no-store');
    assert.match(page.headers.get('x-robots-tag') ?? '', /noindex/);
    const html = page.bytes!.toString('utf8');
    assert.match(html, /Student ID review/);
    assert.doesNotMatch(html, new RegExp(KEY));
    assert.doesNotMatch(html, /innerHTML/);
  } finally { s.close(); }
});

test('admin alert: "N waiting" + the review link only, at most once an hour, through sendMail', async () => {
  const s = await setup();
  s.close();
  const mails: { to: string; subject: string; text: string }[] = [];
  let clock = new Date('2026-11-06T10:00:00Z');
  const iv = createIdVerify({
    db: () => s.db, store: s.store, push: () => {}, now: () => clock,
    sendMail: async (to, subject, text) => { mails.push({ to, subject, text }); return true; },
    env: { FEEDBACK_EMAIL: 'team@example.com', PUBLIC_URL: 'https://lumi.example.com/' },
  });
  await iv.load();
  try {
    await iv.submit(PENDING, b64(jpeg()), '10.0.0.1');
    assert.equal(mails.length, 1);
    assert.equal(mails[0].to, 'team@example.com');
    assert.match(mails[0].subject, /1 student ID waiting/);
    assert.match(mails[0].text, /^1 waiting for review\./);
    assert.match(mails[0].text, /https:\/\/lumi\.example\.com\/admin\/verifications/);
    const u = s.user(PENDING);
    for (const leak of [u.nickname, 'Berkeley', String(u.birthYear), PENDING, 'iv_', 'base64', 'image/jpeg']) assert.equal(`${mails[0].subject} ${mails[0].text}`.includes(leak), false, `alert must not contain ${leak}`);

    // a second photo inside the hour: no second e-mail now
    clock = new Date('2026-11-06T10:20:00Z');
    await iv.submit(PENDING, b64(jpeg()), '10.0.0.1');
    assert.equal(mails.length, 1);
    // after the hour the next photo alerts again, with the current count
    clock = new Date('2026-11-06T11:05:00Z');
    iv.stopAlerts();
    await iv.submit(PENDING, b64(jpeg()), '10.0.0.1');
    assert.equal(mails.length, 2);
    assert.match(mails[1].text, /^1 waiting/);
  } finally { iv.stopAlerts(); }
});

test('admin alert: no FEEDBACK_EMAIL → no e-mail, the photo is still taken', async () => {
  const s = await setup();
  s.close();
  let sent = 0;
  const iv = createIdVerify({ db: () => s.db, store: s.store, push: () => {}, sendMail: async () => { sent++; return true; }, env: {} });
  await iv.submit(PENDING, b64(jpeg()), '10.0.0.2');
  assert.equal(sent, 0);
  assert.equal(iv.requests().length, 1);
});
