/**
 * Personal sign-in e-mail for student-ID accounts (server/signin-email.ts).
 *   - only student-ID accounts, only with the right code
 *   - sign-in only: never school verification, never the badge, never changes the ID review
 *   - login by code finds it (accounts table); owner-only; a new one replaces the old; gone with the account
 *   - a personal address can't become school verification through register/attach-email (schoolEmailOk)
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Snapshot } from '@core/api/types';
import type { ID, User } from '@core/types';
import * as seed from '@core/data/seed.en';
import { FileStore } from './store';
import { sessionAuth } from './moderation';
import { snapshotFor } from './view';
import { registerSignInEmailRoutes, schoolEmailOk } from './signin-email';

const ID_USER = 'u_sie_id';
const SCHOOL_USER = 'u_sie_school';
const OTHER = 'u_sie_other';

async function setup() {
  const db: Snapshot = structuredClone({
    users: seed.users, schools: seed.schools, organizations: seed.organizations, activities: seed.activities,
    participations: seed.participations, posts: seed.posts, relationships: seed.relationships, proposals: seed.proposals,
    chatRooms: seed.chatRooms, notifications: [], reports: [], opportunities: seed.opportunities,
    opportunityIntents: seed.opportunityIntents, timePolls: seed.timePolls, games: [], rides: [],
  });
  for (const u of db.users) u.sample = true;
  const base = db.users.find((u) => u.id === 'u_me')!;
  const real = (id: ID, extra: Partial<User> = {}): User => ({ ...structuredClone(base), id, nickname: id, sample: undefined, ...extra });
  db.users.push(
    real(ID_USER, { affiliation: { ...base.affiliation, emailVerified: false } as User['affiliation'], verification: { method: 'student_id', status: 'pending', submittedAt: '2026-11-06T00:00:00Z' } }),
    real(SCHOOL_USER),
    real(OTHER),
  );
  const store = new FileStore(path.join(mkdtempSync(path.join(tmpdir(), 'lumi-sie-')), 'db.json')); await store.init();
  await store.createAccount({ email: 'taken@gmail.com', userId: OTHER, createdAt: '' });
  const tokens: Record<ID, string> = { [ID_USER]: 't-id', [SCHOOL_USER]: 't-school', [OTHER]: 't-other' };
  const auth = sessionAuth({ db: () => db, findSession: async (t) => { const id = Object.keys(tokens).find((k) => tokens[k] === t); return id ? { userId: id } : null; } });
  const app = express(); app.use(express.json());
  registerSignInEmailRoutes(app, { db: () => db, store, auth, push: () => {}, reserved: (e) => e === 'review@berkeley.edu' });
  const server = app.listen(0);
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const code = (email: string, c = '123456') => store.setCode({ email, code: c, expiresAt: new Date(Date.now() + 600_000).toISOString() });
  const add = async (as: ID | null, email: string, c: string) => {
    const res = await fetch(`${url}/api/auth/signin-email`, { method: 'POST', headers: { 'content-type': 'application/json', ...(as ? { authorization: `Bearer ${tokens[as]}` } : {}) }, body: JSON.stringify({ email, code: c }) });
    return { status: res.status, json: await res.json() as { user?: User; error?: string } };
  };
  return { db, store, code, add, user: (id: ID) => db.users.find((u) => u.id === id)!, close: () => server.close() };
}

test('a student-ID account adds any e-mail for signing in — it never verifies the school or changes the review', async () => {
  const s = await setup();
  try {
    await s.code('alex.personal@gmail.com');
    const r = await s.add(ID_USER, ' Alex.Personal@Gmail.com ', '123456');
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.user!.signInEmail, 'alex.personal@gmail.com');
    const u = s.user(ID_USER);
    assert.equal(u.affiliation.type === 'university' && u.affiliation.emailVerified, false, 'no school verification');
    assert.deepEqual(u.verification, { method: 'student_id', status: 'pending', submittedAt: '2026-11-06T00:00:00Z' }, 'review untouched');
    // login by code looks the address up in accounts — it now finds this person
    assert.equal((await s.store.findAccount('alex.personal@gmail.com'))?.userId, ID_USER);
    // owner-only
    assert.equal(snapshotFor(s.db, ID_USER).users.find((x) => x.id === ID_USER)!.signInEmail, 'alex.personal@gmail.com');
    const seen = { ...s.user(ID_USER), verification: { method: 'student_id' as const, status: 'approved' as const } };
    s.db.users[s.db.users.findIndex((x) => x.id === ID_USER)] = seen; // visible to others once approved — still no e-mail
    assert.equal(JSON.stringify(snapshotFor(s.db, OTHER)).includes('alex.personal@gmail.com'), false);
  } finally { s.close(); }
});

test('wrong or expired code, a used address, the review address, signed out and school-email accounts are refused', async () => {
  const s = await setup();
  try {
    await s.code('a@gmail.com');
    assert.equal((await s.add(ID_USER, 'a@gmail.com', '000000')).status, 400);
    assert.equal((await s.add(ID_USER, 'a@gmail.com', '123456')).status, 400, 'a wrong try uses the code up');
    await s.store.setCode({ email: 'old@gmail.com', code: '123456', expiresAt: new Date(Date.now() - 1000).toISOString() });
    assert.equal((await s.add(ID_USER, 'old@gmail.com', '123456')).status, 400);
    await s.code('taken@gmail.com');
    assert.equal((await s.add(ID_USER, 'taken@gmail.com', '123456')).status, 409);
    await s.code('review@berkeley.edu');
    assert.equal((await s.add(ID_USER, 'review@berkeley.edu', '123456')).status, 409);
    await s.code('b@gmail.com');
    assert.equal((await s.add(null, 'b@gmail.com', '123456')).status, 401);
    assert.equal((await s.add(SCHOOL_USER, 'b@gmail.com', '123456')).status, 409);
    assert.equal((await s.add(ID_USER, 'not-an-email', '123456')).status, 400);
    assert.equal(s.user(ID_USER).signInEmail, undefined);
  } finally { s.close(); }
});

test('a new sign-in e-mail replaces the old one; account deletion removes it', async () => {
  const s = await setup();
  try {
    await s.code('first@gmail.com'); await s.add(ID_USER, 'first@gmail.com', '123456');
    await s.code('second@proton.me'); await s.add(ID_USER, 'second@proton.me', '123456');
    assert.equal(await s.store.findAccount('first@gmail.com'), null, 'old address no longer signs in');
    assert.equal((await s.store.findAccount('second@proton.me'))?.userId, ID_USER);
    const { emails } = await s.store.forgetUser(ID_USER);
    assert.deepEqual(emails, ['second@proton.me']);
    assert.equal(await s.store.findAccount('second@proton.me'), null);
  } finally { s.close(); }
});

test('only the school’s own domain counts as school verification (register / attach-email)', () => {
  const berkeley = { emailDomain: 'berkeley.edu' };
  assert.equal(schoolEmailOk('alex@berkeley.edu', berkeley, {}), true);
  assert.equal(schoolEmailOk('Alex@EECS.Berkeley.edu', berkeley, {}), true);
  assert.equal(schoolEmailOk('alex@gmail.com', berkeley, {}), false);
  assert.equal(schoolEmailOk('alex@notberkeley.edu', berkeley, {}), false);
  assert.equal(schoolEmailOk('alex@berkeley.edu.evil.com', berkeley, {}), false);
  assert.equal(schoolEmailOk('alex@gmail.com', undefined, {}), false);
  assert.equal(schoolEmailOk('alex@gmail.com', berkeley, { VERIFY_EMAIL_DOMAIN: '0' }), true);
});
