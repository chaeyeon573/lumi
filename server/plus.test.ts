/**
 * Lumi+ (S087 · S088) — the entitlement is server-only, the flag decides gating, limits come from one place.
 *   - self-update can never grant (or remove) Lumi+, sample accounts included; other people never see it
 *   - LUMI_PLUS off (default): nothing is gated — today's group limit, no meetup cap, filters and folders for everyone
 *   - LUMI_PLUS on: limits, advanced filters and folders/notes are enforced on the server
 *   - checkout never reports success; admin grants need ADMIN_KEY
 *   - the price and the limits are written only in @core/lib/plus
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { ActivityInput, OrgInput, Snapshot } from '@core/api/types';
import type { ID, User } from '@core/types';
import * as seed from '@core/data/seed.en';
import { t } from '@core/i18n';
import { createEngine } from '@core/api/engine';
import { sanitizeSelfUpdate } from '@core/lib/selfupdate';
import { hasPlus, limitsFor, PAYMENTS_CLOSED, PLAN_LIMITS, PLUS_PRICE, PLUS_PRICE_LABEL, PLUS_REQUIRED, plusUnlocked } from '@core/lib/plus';
import { campusToday } from '@core/lib/withpeople';
import { patchFor, snapshotFor } from './view';
import { plusAllowed, plusEnabled, plusStatusFor, registerPlusRoutes, setPlus, startCheckout } from './plus';
import { createSavedPeopleService, registerSavedPeopleRoutes } from './savedpeople';

const ON = { LUMI_PLUS: '1' } as NodeJS.ProcessEnv;
const OFF = {} as NodeJS.ProcessEnv;
const ME = 'u_me', MAYA = 'u_jimin';

function setup(env: NodeJS.ProcessEnv = OFF) {
  const db: Snapshot = structuredClone({
    users: seed.users, schools: seed.schools, organizations: [], activities: [], participations: [], posts: [], relationships: seed.relationships, proposals: [],
    chatRooms: [], notifications: [], reports: [], opportunities: [], opportunityIntents: [], timePolls: [], games: [], rides: [],
  }) as Snapshot;
  return { db, engine: createEngine({ db, t, demo: false, push: () => {}, plusEnabled: () => plusEnabled(env) }) };
}
const grant = (db: Snapshot, id: ID, until?: string) => setPlus(db, id, true, until);
const day = (n: number) => { const d = new Date(`${campusToday()}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const meetup = (n = 1, extra: Partial<ActivityInput> = {}): ActivityInput => ({
  kind: 'personal', category: 'coffee', title: `Coffee ${n}`, description: 'x', cover: { emoji: 'C', hue: 10 }, date: day(1 + (n % 5)), startTime: '15:00', endTime: '16:00',
  place: { name: 'Free Speech Cafe', lat: 0, lng: 0 }, capacity: 6, fee: 0, joinPolicy: 'open', visibility: 'school', ...extra,
});
const group = (n: number): OrgInput => ({ name: `Sunday Sketch Walks ${n}`, description: '', type: 'club', joinPolicy: 'open' });

test('self-update can’t grant, extend or remove Lumi+ — sample accounts included', () => {
  const { db } = setup();
  const me = db.users.find((u) => u.id === ME)!;
  const forged = { plus: { since: '2020-01-01T00:00:00Z', source: 'admin' }, bio: 'hi' } as unknown as Partial<User>;
  const out = sanitizeSelfUpdate(me, forged);
  assert.equal('plus' in out, false);
  assert.equal(out.bio, 'hi');
  assert.equal('plus' in sanitizeSelfUpdate({ ...me, sample: true }, forged), false);
  // removing it by sending plus: undefined doesn't work either
  grant(db, ME);
  assert.equal('plus' in sanitizeSelfUpdate(me, { plus: undefined } as Partial<User>), false);
});

test('Lumi+ is owner-only: the member sees it, everyone else’s copy of their profile never has it', () => {
  const { db } = setup();
  const patch = grant(db, MAYA);
  assert.ok(hasPlus(db.users.find((u) => u.id === MAYA)));
  assert.ok(snapshotFor(db, MAYA).users.find((u) => u.id === MAYA)?.plus);
  assert.equal(snapshotFor(db, ME).users.find((u) => u.id === MAYA)?.plus, undefined);
  assert.equal(patchFor(patch, ME, db)?.users?.find((u) => u.id === MAYA)?.plus, undefined);
  assert.ok(patchFor(patch, MAYA, db)?.users?.find((u) => u.id === MAYA)?.plus);
});

test('entitlement dates: until in the past or since in the future means no Lumi+', () => {
  const now = new Date('2026-11-06T12:00:00Z');
  assert.equal(hasPlus({ plus: { since: '2026-11-01T00:00:00Z', source: 'admin' } }, now), true);
  assert.equal(hasPlus({ plus: { since: '2026-11-01T00:00:00Z', until: '2026-11-05T00:00:00Z', source: 'admin' } }, now), false);
  assert.equal(hasPlus({ plus: { since: '2026-12-01T00:00:00Z', source: 'admin' } }, now), false);
  assert.equal(hasPlus({}, now), false);
});

test('flag off (default): nothing is gated — today’s group limit, no meetup cap, extras open to everyone', () => {
  assert.equal(plusEnabled(OFF), false);
  assert.equal(plusEnabled({ LUMI_PLUS: '0' } as NodeJS.ProcessEnv), false);
  const { db, engine } = setup(OFF);
  const me = db.users.find((u) => u.id === ME)!;
  assert.deepEqual(limitsFor(me, false), { groups: PLAN_LIMITS.free.groups, upcomingMeetups: null });
  assert.equal(plusUnlocked(me, false), true);
  assert.equal(plusAllowed(me, OFF), true);
  // more upcoming meetups than any cap — all allowed, as today
  for (let i = 0; i < PLAN_LIMITS.plus.upcomingMeetups + 2; i++) engine.activities.create(ME, meetup(i));
  // groups: today's rule (10 per person) is unchanged
  for (let i = 0; i < PLAN_LIMITS.free.groups; i++) engine.orgs.create(ME, group(i));
  assert.throws(() => engine.orgs.create(ME, group(99)), (e: Error) => e.message === `You can create up to ${PLAN_LIMITS.free.groups} groups.`);
  assert.deepEqual(plusStatusFor(me, OFF), { enabled: false, active: false, payments: { open: false, providers: [] } });
});

test('flag on: free and Lumi+ meetup and group limits come from PLAN_LIMITS, enforced by the engine', () => {
  const { db, engine } = setup(ON);
  const free = PLAN_LIMITS.free, plus = PLAN_LIMITS.plus;
  for (let i = 0; i < free.upcomingMeetups; i++) engine.activities.create(ME, meetup(i));
  assert.throws(() => engine.activities.create(ME, meetup(99)), (e: Error) => e.message.includes(`up to ${free.upcomingMeetups} upcoming meetups`) && e.message.includes('Lumi+'));
  // past meetups, "go together" crews and group events don't count
  engine.activities.create(ME, meetup(50, { listingCrew: 'go' }));
  db.activities.filter((a) => a.hostId === ME && !a.listingCrew)[0].date = day(-3);
  engine.activities.create(ME, meetup(51));
  for (let i = 0; i < free.groups; i++) engine.orgs.create(ME, group(i));
  assert.throws(() => engine.orgs.create(ME, group(99)), (e: Error) => e.message.includes(`Lumi+ raises that to ${plus.groups}`));
  // Lumi+ raises both
  grant(db, ME);
  for (let i = free.upcomingMeetups; i < plus.upcomingMeetups; i++) engine.activities.create(ME, meetup(100 + i));
  assert.throws(() => engine.activities.create(ME, meetup(999)), (e: Error) => e.message === `You can host up to ${plus.upcomingMeetups} upcoming meetups at a time.`);
  for (let i = free.groups; i < plus.groups; i++) engine.orgs.create(ME, group(i));
  assert.throws(() => engine.orgs.create(ME, group(999)), (e: Error) => e.message === `You can create up to ${plus.groups} groups.`);
  assert.ok(plus.groups > free.groups && plus.upcomingMeetups > free.upcomingMeetups);
});

test('checkout never succeeds without a payment provider, and never grants Lumi+', () => {
  const { db } = setup(ON);
  const me = db.users.find((u) => u.id === ME)!;
  for (const env of [ON, OFF]) for (const platform of ['web', 'ios']) assert.deepEqual(startCheckout(me, platform, env), { status: 'unavailable', message: PAYMENTS_CLOSED });
  assert.equal(hasPlus(me), false);
  assert.deepEqual(plusStatusFor(me, ON).payments, { open: false, providers: [] });
});

// ─── HTTP ─────────────────────────────────────────────────────────────────────

async function serve(env: NodeJS.ProcessEnv) {
  const { db } = setup(env);
  const docs = new Map<string, { id: string }>();
  const store = {
    async listDocs<T>() { return [...docs.values()] as T[]; },
    async putDocs(_c: string, items: { id: string }[]) { for (const i of items) docs.set(i.id, structuredClone(i)); },
    async removeDocs(_c: string, ids: string[]) { for (const i of ids) docs.delete(i); },
  };
  const saved = createSavedPeopleService({ db: () => db, store });
  const pushed: unknown[] = [];
  const app = express();
  app.use(express.json());
  const auth = (req: express.Request & { userId?: ID }, _res: express.Response, next: express.NextFunction) => { req.userId = req.get('x-user') || undefined; next(); };
  class HttpError extends Error { constructor(public status: number, m: string) { super(m); } }
  const bad = (m: string, s = 400) => new HttpError(s, m);
  const wrap = (fn: (req: express.Request & { userId?: ID }, res: express.Response) => unknown) => async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try { const out = await fn(req, res); if (!res.headersSent) res.json(out ?? {}); } catch (e) { next(e); }
  };
  const requireUser = (req: express.Request & { userId?: ID }) => { if (!req.userId) throw bad('Sign in first', 401); return req.userId; };
  registerPlusRoutes(app, { db: () => db, auth, wrap, requireUser, bad, viewFor: (me) => snapshotFor(db, me), push: (p) => pushed.push(p), env: () => env });
  registerSavedPeopleRoutes(app, saved, { db: () => db, auth, wrap, requireUser, bad, env: () => env });
  app.use((e: HttpError, _req: express.Request, res: express.Response, _next: express.NextFunction) => { res.status(e.status ?? 500).json({ error: e.message }); });
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const post = async (p: string, body: unknown, headers: Record<string, string> = {}) => {
    const r = await fetch(`http://127.0.0.1:${port}/api/${p}`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) });
    return { status: r.status, body: await r.json() as Record<string, unknown> };
  };
  const as = (user: ID) => ({ 'x-user': user });
  return { db, post, as, pushed, close: () => server.close() };
}

test('HTTP, flag off: advanced People filter and saved-people folders work for everyone', async () => {
  const s = await serve(OFF);
  try {
    const me = s.db.users.find((u) => u.id === ME)!;
    const someone = s.db.users.find((u) => u.id !== ME && (u.interests ?? []).length)!;
    const r = await s.post('plus/people-match', { filter: { interests: [someone.interests![0]] } }, s.as(ME));
    assert.equal(r.status, 200);
    assert.ok((r.body.ids as ID[]).includes(someone.id));
    assert.equal((r.body.ids as ID[]).includes(ME), false);
    assert.equal((await s.post('saved-people/view', {}, s.as(ME))).status, 200);
    assert.equal((await s.post('saved-people/folder', { name: 'Study' }, s.as(ME))).status, 200);
    assert.equal(hasPlus(me), false);
    const st = await s.post('plus/status', {}, s.as(ME));
    assert.equal(st.body.enabled, false);
  } finally { s.close(); }
});

test('HTTP, flag on: the server refuses the extras to non-members and allows them to members', async () => {
  const s = await serve(ON);
  try {
    const filter = { interests: ['music'] };
    const no = await s.post('plus/people-match', { filter }, s.as(ME));
    assert.equal(no.status, 403);
    assert.equal(no.body.error, PLUS_REQUIRED.filters);
    // a filter without the Lumi+ part needs nothing
    assert.equal((await s.post('plus/people-match', { filter: {} }, s.as(ME))).status, 200);
    for (const p of ['saved-people/view', 'saved-people/folder', 'saved-people/entry']) {
      const r = await s.post(p, { name: 'x', personId: 'u_yuna', note: 'x' }, s.as(ME));
      assert.equal(r.status, 403, p);
      assert.equal(r.body.error, PLUS_REQUIRED.saved_folders);
    }
    const checkout = await s.post('plus/checkout', { platform: 'web' }, s.as(ME));
    assert.deepEqual(checkout.body, { status: 'unavailable', message: PAYMENTS_CLOSED });
    grant(s.db, ME);
    assert.equal((await s.post('plus/people-match', { filter }, s.as(ME))).status, 200);
    assert.equal((await s.post('saved-people/folder', { name: 'Study' }, s.as(ME))).status, 200);
    const st = await s.post('plus/status', {}, s.as(ME));
    assert.equal(st.body.enabled, true);
    assert.equal(st.body.active, true);
    // still no success from checkout, even for a member
    assert.equal((await s.post('plus/checkout', { platform: 'ios' }, s.as(ME))).body.status, 'unavailable');
    assert.equal((await s.post('plus/checkout', {}, {})).status, 401);
  } finally { s.close(); }
});

test('HTTP: advanced filter matches only what the viewer may see (a language someone keeps private never matches)', async () => {
  const s = await serve(OFF);
  try {
    const maya = s.db.users.find((u) => u.id === MAYA)!;
    maya.spokenLanguages = ['Korean'];
    maya.extraVisibility = { languages: 'private' };
    assert.deepEqual((await s.post('plus/people-match', { filter: { language: 'korean' } }, s.as(ME))).body.ids, []);
    maya.extraVisibility = { languages: 'public' };
    assert.deepEqual((await s.post('plus/people-match', { filter: { language: 'korean' } }, s.as(ME))).body.ids, [MAYA]);
  } finally { s.close(); }
});

test('HTTP admin: granting Lumi+ needs ADMIN_KEY; the grant reaches only that person', async () => {
  const env = { ...ON, ADMIN_KEY: 'test-admin-key' } as NodeJS.ProcessEnv;
  const s = await serve(env);
  try {
    assert.equal((await s.post(`admin/users/${ME}/plus`, { on: true })).status, 403);
    assert.equal((await s.post(`admin/users/${ME}/plus`, { on: true }, { 'x-admin-key': 'wrong' })).status, 403);
    assert.equal(hasPlus(s.db.users.find((u) => u.id === ME)), false);
    const ok = await s.post(`admin/users/${ME}/plus`, { on: true }, { 'x-admin-key': 'test-admin-key' });
    assert.equal(ok.status, 200);
    assert.equal(hasPlus(s.db.users.find((u) => u.id === ME)), true);
    assert.equal(s.pushed.length, 1);
    assert.equal(patchFor(s.pushed[0] as never, MAYA, s.db)?.users?.find((u) => u.id === ME)?.plus, undefined);
    assert.equal((await s.post(`admin/users/${ME}/plus`, { on: true, until: '2001-01-01' }, { 'x-admin-key': 'test-admin-key' })).status, 400);
    assert.equal((await s.post(`admin/users/nobody/plus`, { on: true }, { 'x-admin-key': 'test-admin-key' })).status, 404);
    await s.post(`admin/users/${ME}/plus`, { on: false }, { 'x-admin-key': 'test-admin-key' });
    assert.equal(hasPlus(s.db.users.find((u) => u.id === ME)), false);
  } finally { s.close(); }
});

test('the price and the plan limits are written only in @core/lib/plus', () => {
  assert.equal(PLUS_PRICE.amount, 2.99);
  assert.equal(PLUS_PRICE_LABEL, 'US$2.99 / month');
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const f of readdirSync(dir)) {
      const p = path.join(dir, f);
      if (f === 'node_modules' || f === 'data' || f.startsWith('.')) continue;
      if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(f) && !f.endsWith('.test.ts')) files.push(p);
    }
  };
  for (const d of ['src', 'packages/core/src', 'server']) walk(path.join(root, d));
  const offenders = files.filter((f) => !f.endsWith(path.join('lib', 'plus.ts')) && /2\.99|upcomingMeetups:\s*\d|groups:\s*\d/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(offenders, []);
  // the engine no longer carries its own group number
  assert.doesNotMatch(readFileSync(path.join(root, 'packages/core/src/api/engine.ts'), 'utf8'), /createdBy === creatorId\)\.length >= \d/);
});
