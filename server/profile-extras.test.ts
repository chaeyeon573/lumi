/**
 * Harness A profile fields (S072 · S082 · S083 · S085 · S086): spoken languages, country of origin, next chapter,
 * membership display — who receives them (server/view.ts · @core/lib/privacy), how a self-update cleans them
 * (@core/lib/selfupdate), and Download your data (@core/lib/exportdata · POST /api/auth/export-data).
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { AddressInfo } from 'node:net';
import type { Snapshot } from '@core/api/types';
import type { User } from '@core/types';
import * as seed from '@core/data/seed.en';
import { createEngine } from '@core/api/engine';
import { cleanProfileExtras, sanitizeSelfUpdate } from '@core/lib/selfupdate';
import { exportUserData } from '@core/lib/exportdata';
import { EXTRA_VISIBILITY_DEFAULTS } from '@core/lib/privacy';
import { snapshotFor, patchFor } from './view';
import { registerAccountRoutes } from './account';
import type { Store } from './store';

const db = (): Snapshot => {
  const d: Snapshot = structuredClone({
    users: seed.users, schools: seed.schools, organizations: seed.organizations, activities: seed.activities,
    participations: seed.participations, posts: seed.posts, relationships: seed.relationships, proposals: seed.proposals,
    chatRooms: seed.chatRooms, notifications: seed.notifications, reports: [], opportunities: seed.opportunities,
    opportunityIntents: seed.opportunityIntents, timePolls: seed.timePolls, games: [],
  });
  d.relationships = { likes: [], follows: [], friendRequests: [], friends: [], blocks: [] };
  return d;
};
const user = (d: Snapshot, id: string) => d.users.find((u) => u.id === id)!;
const OWNER = 'u_jimin', VIEWER = 'u_me', OTHER = 'u_sua';
const seenBy = (d: Snapshot, viewer: string, owner: string) => [
  snapshotFor(d, viewer).users.find((u) => u.id === owner),
  patchFor({ users: [user(d, owner)] }, viewer, d)?.users?.find((u) => u.id === owner),
];
/** a person at another school, so "My school" can be told apart from "Everyone" */
function addOutsider(d: Snapshot) {
  const x = structuredClone(user(d, OTHER));
  x.id = 'u_outsider'; x.affiliation = { ...x.affiliation, schoolId: 's_ucmerced', schoolName: 'UC Merced' } as User['affiliation'];
  d.users.push(x);
  return x.id;
}

test('languages, country and next chapter: my school by default, nobody else; the owner sees everything', () => {
  const d = db();
  const outsider = addOutsider(d);
  Object.assign(user(d, OWNER), { spokenLanguages: ['English', 'Korean'], countryOfOrigin: 'Korea', nextChapter: { city: 'Seattle', company: 'Acme' } });
  assert.deepEqual(EXTRA_VISIBILITY_DEFAULTS, { languages: 'school', country: 'school', nextChapter: 'school', memberships: 'public' });
  for (const u of seenBy(d, VIEWER, OWNER)) { assert.deepEqual(u!.spokenLanguages, ['English', 'Korean']); assert.equal(u!.countryOfOrigin, 'Korea'); assert.equal(u!.nextChapter?.company, 'Acme'); }
  for (const u of seenBy(d, outsider, OWNER)) for (const k of ['spokenLanguages', 'countryOfOrigin', 'nextChapter'] as const) assert.equal(k in (u ?? {}), false, `${k} leaked to another school`);
  // private country, friends-only next chapter
  user(d, OWNER).extraVisibility = { country: 'private', nextChapter: 'friends' };
  for (const u of seenBy(d, VIEWER, OWNER)) { assert.equal('countryOfOrigin' in u!, false); assert.equal('nextChapter' in u!, false); assert.ok(u!.spokenLanguages); assert.equal('extraVisibility' in u!, false, 'settings are owner-only'); }
  d.relationships.friends.push({ a: OWNER, b: VIEWER, since: '2026-10-01' });
  for (const u of seenBy(d, VIEWER, OWNER)) { assert.equal(u!.nextChapter?.city, 'Seattle'); assert.equal('countryOfOrigin' in u!, false); }
  const mine = snapshotFor(d, OWNER).users.find((u) => u.id === OWNER)!;
  assert.equal(mine.countryOfOrigin, 'Korea'); assert.deepEqual(mine.extraVisibility, { country: 'private', nextChapter: 'friends' });
});

test('membership display: hidden members leave memberIds/followerIds for others (counts stay), not for themselves or the group admins', () => {
  const d = db();
  // a real (non-sample) group: Maya is a member + follower, Lily runs it
  const org = { ...structuredClone(d.organizations[0]), id: 'o_real_club', schoolId: 's_berkeley', memberIds: [OWNER, OTHER], followerIds: [OWNER, OTHER], adminIds: [OTHER], applicantIds: [] };
  d.organizations.push(org);
  const admin = org.adminIds[0];
  const orgSeenBy = (viewer: string) => [snapshotFor(d, viewer).organizations.find((o) => o.id === org.id)!, patchFor({ organizations: [org] }, viewer, d)!.organizations!.find((o) => o.id === org.id)!];
  // default = public, as before
  for (const o of orgSeenBy(VIEWER)) { assert.ok(o.memberIds.includes(OWNER)); assert.equal(o.memberCount, undefined); }
  user(d, OWNER).extraVisibility = { memberships: 'private' };
  for (const o of orgSeenBy(VIEWER)) {
    assert.equal(o.memberIds.includes(OWNER), false); assert.equal(o.followerIds.includes(OWNER), false);
    assert.equal(o.memberCount, org.memberIds.length); assert.equal(o.followerCount, org.followerIds.length);
  }
  for (const o of orgSeenBy(OWNER)) { assert.ok(o.memberIds.includes(OWNER)); assert.ok(o.followerIds.includes(OWNER)); }
  for (const o of orgSeenBy(admin)) assert.ok(o.memberIds.includes(OWNER), 'group admins still see their members');
  // friends only
  user(d, OWNER).extraVisibility = { memberships: 'friends' };
  for (const o of orgSeenBy(VIEWER)) assert.equal(o.memberIds.includes(OWNER), false);
  d.relationships.friends.push({ a: OWNER, b: VIEWER, since: '2026-10-01' });
  for (const o of orgSeenBy(VIEWER)) assert.ok(o.memberIds.includes(OWNER));
});

test('changing membership display re-sends my groups so open screens update', () => {
  const d = db();
  d.organizations.push({ ...structuredClone(d.organizations[0]), id: 'o_real_club', schoolId: 's_berkeley', memberIds: [OWNER], followerIds: [], adminIds: [OTHER], applicantIds: [] });
  const engine = createEngine({ db: d, t: (s) => s, demo: false, push: () => {} });
  const patch = engine.users.update(OWNER, { extraVisibility: { memberships: 'private' } });
  const mine = d.organizations.filter((o) => o.memberIds.includes(OWNER) || o.followerIds.includes(OWNER)).map((o) => o.id).sort();
  assert.deepEqual(patch.organizations?.map((o) => o.id).sort(), mine);
  const forViewer = patchFor(patch, VIEWER, d)!;
  assert.ok(forViewer.organizations?.some((o) => o.id === 'o_real_club'));
  for (const o of forViewer.organizations ?? []) { assert.equal(o.memberIds.includes(OWNER), false); assert.equal(o.followerIds.includes(OWNER), false); }
  assert.equal(engine.users.update(OWNER, { bio: 'x' }).organizations, undefined, 'other edits send only the profile');
});

test('self-update cleans the new fields: trims, drops empties, unknown visibility values and impossible years', () => {
  assert.deepEqual(cleanProfileExtras({ spokenLanguages: ['  English ', '', 'English', 'Korean'] }).spokenLanguages, ['English', 'Korean']);
  assert.equal(cleanProfileExtras({ spokenLanguages: [] }).spokenLanguages, undefined);
  assert.equal(cleanProfileExtras({ countryOfOrigin: '   ' }).countryOfOrigin, undefined);
  assert.deepEqual(cleanProfileExtras({ nextChapter: { gradYear: 1800, city: ' Oakland ', company: '', role: 'PM', industry: undefined } }).nextChapter, { city: 'Oakland', role: 'PM' });
  assert.deepEqual(cleanProfileExtras({ nextChapter: { gradYear: 2027 } }).nextChapter, { gradYear: 2027 });
  assert.equal(cleanProfileExtras({ nextChapter: {} }).nextChapter, undefined);
  assert.deepEqual(cleanProfileExtras({ extraVisibility: { memberships: 'friends', country: 'everyone' as never, languages: 'selected' as never } }).extraVisibility, { memberships: 'friends' });
  assert.equal('nextChapter' in cleanProfileExtras({ bio: 'x' }), false, 'untouched fields stay untouched');
  const me = structuredClone(seed.users.find((u) => u.id === OWNER)!) as User; me.sample = undefined;
  assert.equal(sanitizeSelfUpdate(me, { countryOfOrigin: 'x'.repeat(200) }).countryOfOrigin?.length, 56);
});

test('download your data: my own records only, nothing private about anyone else', () => {
  const d = db();
  const me = user(d, VIEWER);
  me.countryOfOrigin = 'Canada';
  d.relationships.friends.push({ a: VIEWER, b: OTHER, since: '2026-10-01' });
  d.reports.push({ id: 'r1', reporterId: VIEWER, targetType: 'user', targetId: OWNER, reason: 'Spam', createdAt: '2026-10-02T00:00:00Z', status: 'open', log: [{ at: 'x', by: 'admin', action: 'note' }] as never, excerpt: 'secret excerpt', targetOwnerId: OWNER });
  d.reports.push({ id: 'r2', reporterId: OTHER, targetType: 'user', targetId: VIEWER, reason: 'about me', createdAt: '2026-10-02T00:00:00Z' });
  const room = d.chatRooms.find((r) => r.memberIds.includes(VIEWER) && r.messages.some((m) => m.senderId !== VIEWER && !m.system));
  const out = exportUserData(d, VIEWER, '2026-11-05T00:00:00Z');
  const text = JSON.stringify(out);
  assert.equal(out.profile.birthYear, me.birthYear, 'owner-only fields are included for the owner');
  assert.equal(out.profile.countryOfOrigin, 'Canada');
  assert.deepEqual(out.connections.friends, [{ id: OTHER, name: user(d, OTHER).nickname, since: '2026-10-01' }]);
  assert.equal(String(user(d, OTHER).birthYear) !== String(me.birthYear) && text.includes(`"birthYear":${user(d, OTHER).birthYear}`), false, 'no one else’s profile');
  assert.deepEqual(out.reportsFiled, [{ targetType: 'user', targetId: OWNER, reason: 'Spam', status: 'open', createdAt: '2026-10-02T00:00:00Z' }]);
  assert.equal(text.includes('secret excerpt'), false); assert.equal(text.includes('about me'), false, 'reports about me are not mine to download');
  assert.ok(out.messages.every((m) => d.chatRooms.find((r) => r.id === m.roomId)!.messages.some((x) => x.senderId === VIEWER && x.text === m.text)));
  if (room) for (const m of room.messages.filter((x) => x.senderId !== VIEWER && !x.system)) assert.equal(out.messages.some((x) => x.text === m.text && !room.messages.some((y) => y.senderId === VIEWER && y.text === m.text)), false, 'other people’s messages stay out');
  assert.ok(out.notifications.length === d.notifications.filter((n) => n.userId === VIEWER).length);
  assert.throws(() => exportUserData(d, 'u_nobody'));
});

test('POST /api/auth/export-data answers for the signed-in caller only', async () => {
  const d = db();
  const app = express();
  app.use(express.json());
  const auth = (req: Request & { userId?: string }, _res: Response, next: NextFunction) => { req.userId = req.header('x-user') || undefined; next(); };
  registerAccountRoutes(app, { db: () => d, store: {} as Store, auth, broadcast() {}, disconnect() {} });
  const server = app.listen(0);
  try {
    const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/auth/export-data`;
    assert.equal((await fetch(url, { method: 'POST' })).status, 401);
    assert.equal((await fetch(url, { method: 'POST', headers: { 'x-user': 'u_ghost' } })).status, 401);
    const res = await fetch(url, { method: 'POST', headers: { 'x-user': VIEWER, 'content-type': 'application/json' }, body: JSON.stringify({ userId: OWNER }) });
    assert.equal(res.status, 200);
    const body = await res.json() as { profile: { id: string } };
    assert.equal(body.profile.id, VIEWER, 'a user id in the body is ignored');
  } finally { server.close(); }
});
