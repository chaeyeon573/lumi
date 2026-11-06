/**
 * Club "Ask to join" (owner 2026-11-06) — server/clubs.ts + engine orgs.* + server/view.ts.
 *   - consent is recorded with each request; without it nothing is stored
 *   - requester name · year · major reach only that club's organizers (verified through the club's official e-mail), never other
 *     students or another club's organizers; the club's contact e-mail never leaves the server
 *   - setup tokens: only the hash is stored, one club each, they expire, the account claim uses them up
 *   - outreach e-mail: off unless CLUB_OUTREACH=1, needs ≥3 waiting, one per club per 30 days, opt-out is final, no student names
 *   - the student's wording follows real delivery: "saved" until an e-mail really went out or an organizer arrived
 *   - waiting students hear when the club posts how to join
 *   - organizers message only students who consented, as the club, in the existing direct conversation; blocks and withdraw stop it
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Patch, Snapshot } from '@core/api/types';
import type { Organization } from '@core/types';
import * as seed from '@core/data/seed.en';
import { t } from '@core/i18n';
import { createEngine } from '@core/api/engine';
import { CONSENT_VERSION, requestStatus } from '@core/lib/clubjoin';
import { CLUB_OUTREACH, CLUB_TOKENS, createClubsService, type ClubToken } from './clubs';
import { snapshotFor } from './view';

const ME = 'u_me', MAYA = 'u_jimin', DANIEL = 'u_dohyun', SOFIA = 'u_seoyeon', EMMA = 'u_yuna', LILY = 'u_sua', WILL = 'u_woojin';
const BASE = 'https://lumi.example';
const CONTACT = 'chaos.officers@berkeley.edu';

const chaos = (extra: Partial<Organization> = {}): Organization => ({
  id: 'oc_chaos', name: 'CHAOS', description: 'Hiking and outdoor trips', logo: { emoji: 'CH', hue: 120 }, type: 'club', schoolId: 's_berkeley', verified: false,
  gallery: [], regularActivities: [], notices: [], followerIds: [], memberIds: [], adminIds: [], applicantIds: [],
  contact: { email: CONTACT, source: 'callink.berkeley.edu' }, ...extra,
});
const other = (extra: Partial<Organization> = {}): Organization => ({ ...chaos(), id: 'oc_other', name: 'Other Club', contact: { email: 'other@berkeley.edu', source: 'test' }, ...extra });

function setup(opts: { orgs?: Organization[]; env?: Record<string, string>; mailOk?: boolean } = {}) {
  const db = structuredClone({
    users: seed.users, schools: seed.schools, organizations: opts.orgs ?? [chaos(), other()], activities: [], participations: [], posts: [], relationships: seed.relationships, proposals: [],
    chatRooms: [], notifications: [], reports: [], opportunities: [], opportunityIntents: [], timePolls: [], games: [], rides: [],
  }) as Snapshot;
  db.relationships.blocks = [];
  const docs = new Map<string, Map<string, { id: string }>>();
  const media: string[] = [];
  const store = {
    async listDocs<T>(c: string) { return [...(docs.get(c)?.values() ?? [])] as T[]; },
    async putDocs(c: string, items: { id: string }[]) { const m = docs.get(c) ?? new Map(); for (const i of items) m.set(i.id, structuredClone(i)); docs.set(c, m); },
    async removeDocs(c: string, ids: string[]) { for (const i of ids) docs.get(c)?.delete(i); },
    async putMedia(m: { id: string }) { media.push(m.id); },
  };
  const engine = createEngine({ db, t, demo: false, push: () => {} });
  const mails: { to: string; subject: string; text: string; html?: string }[] = [];
  const pushed: Patch[] = [];
  let clock = new Date('2026-11-06T18:00:00Z');
  const env = { ...(opts.env ?? {}) };
  const svc = createClubsService({
    db: () => db, store, engine: engine.orgs, push: (p) => pushed.push(p),
    sendMail: async (to, subject, text, html) => { mails.push({ to, subject, text, html }); return opts.mailOk ?? true; },
    env: () => env, now: () => clock,
  });
  const org = (id = 'oc_chaos') => db.organizations.find((o) => o.id === id)!;
  return { db, svc, engine, mails, pushed, docs, media, env, org, tick: (days: number) => { clock = new Date(clock.getTime() + days * 86400_000); } };
}
/** a raw setup token the way a click on an e-mail link would bring it */
async function tokenFor(s: ReturnType<typeof setup>, orgId = 'oc_chaos'): Promise<string> {
  s.mails.length = 0;
  const r = await s.svc.manageLink(orgId, 'tester', BASE);
  assert.equal(r.sent, true);
  const m = s.mails.at(-1)!.text.match(/\/club-setup\/([A-Za-z0-9_-]+)/);
  assert.ok(m, 'the e-mail carries the link');
  return m![1];
}
const ON = { CLUB_OUTREACH: '1' };

test('consent: "Ask to join" records the consent line the student saw; without it nothing is stored', async () => {
  const s = setup();
  await assert.rejects(() => s.svc.ask('oc_chaos', ME, undefined, BASE), /organizers will see/i);
  assert.deepEqual(s.org().applicantIds, []);
  const r = await s.svc.ask('oc_chaos', ME, CONSENT_VERSION, BASE);
  assert.equal(r.status, 'saved'); // no organizers, no e-mail → never "sent"
  const req = s.org().joinRequests?.find((x) => x.userId === ME);
  assert.equal(req?.consent, CONSENT_VERSION);
  assert.ok(req?.askedAt && !Number.isNaN(Date.parse(req.askedAt)), 'when they agreed');
});

test('requester name · year · major only reach organizers of that club; the club e-mail never leaves the server', async () => {
  const s = setup();
  for (const u of [ME, SOFIA]) await s.svc.ask('oc_chaos', u, true, BASE);
  // an organizer of ANOTHER club and plain students see no details
  s.org('oc_other').adminIds.push(EMMA);
  for (const viewer of [EMMA, MAYA, ME]) {
    const view = snapshotFor(s.db, viewer).organizations.find((o) => o.id === 'oc_chaos')!;
    assert.equal(view.requesters, undefined, `${viewer} must not get requesters`);
    assert.equal(view.requestCount, 2);
    assert.ok(!(view.joinRequests ?? []).some((r) => r.userId !== viewer), 'only your own request record');
    assert.ok(!view.applicantIds.some((id) => id !== viewer));
  }
  // the organizer verified through the club's e-mail sees both — Sofia's major too (hidden on her profile, but she consented)
  const raw = await tokenFor(s);
  s.svc.claim(raw, LILY);
  const forLily = snapshotFor(s.db, LILY).organizations.find((o) => o.id === 'oc_chaos')!;
  assert.deepEqual(forLily.requesters?.map((r) => [r.userId, r.name, r.year, r.major]).sort(), [[ME, 'Alex', 'Senior', 'Computer Science'], [SOFIA, 'Sofia', 'Senior', 'Psychology']].sort());
  for (const viewer of [ME, MAYA, LILY, EMMA]) assert.doesNotMatch(JSON.stringify(snapshotFor(s.db, viewer)), /chaos\.officers@/);
  assert.equal(snapshotFor(s.db, ME).organizations.find((o) => o.id === 'oc_chaos')!.hasContact, true);
});

test('tokens: only a hash at rest, scoped to one club, short-lived, and the account claim uses them up', async () => {
  const s = setup();
  const raw = await tokenFor(s);
  const stored = [...(s.docs.get(CLUB_TOKENS)?.values() ?? [])] as ClubToken[];
  assert.equal(stored.length, 1);
  assert.ok(!JSON.stringify(stored).includes(raw), 'the raw token is never stored');
  assert.equal(stored[0].orgId, 'oc_chaos');
  // the link always means its own club — it can never write to another one
  s.svc.saveHowToJoin(raw, { signupUrl: 'https://forms.gle/abc123', who: 'open' }, 'ip');
  assert.equal(s.org().howToJoin?.signupUrl, 'https://forms.gle/abc123');
  assert.equal(s.org('oc_other').howToJoin, undefined);
  // garbage or a token of the right shape that we never issued
  assert.throws(() => s.svc.setupView('x'), /doesn’t work/);
  assert.throws(() => s.svc.setupView('A'.repeat(43)), /doesn’t work/);
  // a reload from the store still knows it (throttles and links survive restarts)
  await s.svc.load();
  assert.equal(s.svc.setupView(raw).org.id, 'oc_chaos');
  // claim → organizer of that club only, the token is used up
  const r = s.svc.claim(raw, LILY);
  assert.equal(r.orgId, 'oc_chaos');
  assert.ok(s.org().adminIds.includes(LILY));
  assert.ok(!s.org('oc_other').adminIds.includes(LILY));
  assert.throws(() => s.svc.claim(raw, WILL), /already used/);
  assert.throws(() => s.svc.saveHowToJoin(raw, { who: 'open' }, 'ip'), /already used/);
  // expiry (manage links last 24 hours)
  const raw2 = await tokenFor(s, 'oc_other');
  s.tick(1.01);
  assert.throws(() => s.svc.setupView(raw2), /expired/);
  assert.throws(() => s.svc.claim(raw2, WILL), /expired/);
});

test('manage link: only ever to the club’s official directory e-mail; no address → nothing is sent', async () => {
  const s = setup({ orgs: [chaos(), other({ contact: undefined })] });
  const r = await s.svc.manageLink('oc_chaos', 'visitor', BASE);
  assert.equal(r.sent, true);
  assert.deepEqual(s.mails.map((m) => m.to), [CONTACT]);
  assert.doesNotMatch(r.message, /chaos\.officers/); // the visitor is not told the address
  const none = await s.svc.manageLink('oc_other', 'visitor', BASE);
  assert.equal(none.sent, false);
  assert.equal(s.mails.length, 1);
});

test('outreach: off by default — nothing is sent and nobody is ever told "delivered"', async () => {
  const s = setup();
  for (const u of [ME, MAYA, DANIEL, SOFIA, EMMA]) await s.svc.ask('oc_chaos', u, true, BASE);
  assert.equal(s.mails.length, 0);
  assert.equal(s.svc.outreachBlocker('oc_chaos'), 'CLUB_OUTREACH is off');
  for (const u of [ME, MAYA, DANIEL, SOFIA, EMMA]) assert.equal(requestStatus(s.org(), u), 'saved');
  assert.ok(!s.db.notifications.some((n) => /We told/.test(n.title)));
  // the preview still renders, and says why it would not go out
  const p = s.svc.preview('oc_chaos', BASE);
  assert.equal(p.wouldSend, false);
  assert.equal(p.subject, '5 Berkeley students asked to join CHAOS on Lumi');
});

test('outreach: ≥3 waiting, one e-mail per club per 30 days, no student names; the requests it counted flip to "told"', async () => {
  const s = setup({ env: ON });
  await s.svc.ask('oc_chaos', ME, true, BASE);
  await s.svc.ask('oc_chaos', MAYA, true, BASE);
  assert.equal(s.mails.length, 0, 'two is not enough');
  const third = await s.svc.ask('oc_chaos', DANIEL, true, BASE);
  assert.equal(s.mails.length, 1);
  const m = s.mails[0];
  assert.equal(m.to, CONTACT);
  assert.equal(m.subject, '3 Berkeley students asked to join CHAOS on Lumi');
  assert.match(m.text, /3 UC Berkeley students asked to join your club on Lumi/);
  assert.match(m.text, /message them, accept requests, and post your events/);
  assert.match(m.text, /Don’t e-mail us again: https:\/\/lumi\.example\/club-optout\/oc_chaos\//);
  for (const u of seed.users) assert.ok(!m.text.includes(u.nickname) && !(m.html ?? '').includes(u.nickname), `no student name (${u.nickname}) in the e-mail`);
  assert.equal(third.status, 'told');
  for (const u of [ME, MAYA, DANIEL]) assert.equal(requestStatus(s.org(), u), 'told');
  assert.deepEqual(s.db.notifications.filter((n) => n.title === 'We told CHAOS you want to join').map((n) => n.userId).sort(), [ME, MAYA, DANIEL].sort());
  // a 4th request inside 30 days: no new e-mail; the club was told within 30 days, so it counts as passed on (owner
  // 2026-11-06) — the toast says so, no extra notification
  s.tick(10);
  const fourth = await s.svc.ask('oc_chaos', SOFIA, true, BASE);
  assert.equal(s.mails.length, 1);
  assert.equal(fourth.status, 'told');
  assert.ok(!s.db.notifications.some((n) => n.userId === SOFIA));
  // the log survives a restart
  assert.equal(([...(s.docs.get(CLUB_OUTREACH)?.values() ?? [])] as unknown as { sends: unknown[] }[])[0].sends.length, 1);
  await s.svc.load();
  s.tick(19); // day 29
  await s.svc.ask('oc_chaos', EMMA, true, BASE);
  assert.equal(s.mails.length, 1);
  s.tick(2); // day 31
  await s.svc.ask('oc_chaos', WILL, true, BASE);
  assert.equal(s.mails.length, 2);
  assert.equal(s.mails[1].subject, '6 Berkeley students asked to join CHAOS on Lumi');
  assert.equal(requestStatus(s.org(), SOFIA), 'told');
});

test('outreach: a mail that fails changes nobody’s status; a club with organizers or no e-mail gets none', async () => {
  const failing = setup({ env: ON, mailOk: false });
  for (const u of [ME, MAYA, DANIEL]) await failing.svc.ask('oc_chaos', u, true, BASE);
  assert.equal(failing.mails.length, 1);
  for (const u of [ME, MAYA, DANIEL]) assert.equal(requestStatus(failing.org(), u), 'saved');
  const s = setup({ env: ON, orgs: [chaos({ adminIds: [LILY], memberIds: [LILY] }), other({ contact: undefined })] });
  for (const u of [ME, MAYA, DANIEL]) { await s.svc.ask('oc_chaos', u, true, BASE); await s.svc.ask('oc_other', u, true, BASE); }
  assert.equal(s.mails.length, 0);
  assert.equal(requestStatus(s.org(), ME), 'sent'); // organizers on Lumi have it
  assert.equal(requestStatus(s.org('oc_other'), ME), 'saved');
});

test('opt-out: "Don’t e-mail us again" works and the club is never e-mailed again (outreach or manage link)', async () => {
  const s = setup({ env: ON });
  for (const u of [ME, MAYA, DANIEL]) await s.svc.ask('oc_chaos', u, true, BASE);
  const raw = s.mails[0].text.match(/club-optout\/oc_chaos\/([A-Za-z0-9_-]+)/)![1];
  await assert.rejects(() => s.svc.optOut('oc_chaos', 'wrong'), /doesn’t work/);
  assert.equal(await s.svc.optOut('oc_chaos', raw), 'CHAOS');
  assert.ok(!JSON.stringify([...(s.docs.get(CLUB_OUTREACH)?.values() ?? [])]).includes(raw), 'opt-out token stored hashed');
  s.tick(40);
  for (const u of [SOFIA, EMMA, WILL]) await s.svc.ask('oc_chaos', u, true, BASE);
  assert.equal(s.mails.length, 1);
  assert.match(s.svc.outreachBlocker('oc_chaos'), /asked not to be e-mailed/);
  const r = await s.svc.manageLink('oc_chaos', 'visitor', BASE);
  assert.equal(r.sent, false);
  assert.equal(s.mails.length, 1);
});

test('how to join: publishing it notifies every waiting student, opening the club page; bad links are refused', async () => {
  const s = setup();
  for (const u of [ME, MAYA]) await s.svc.ask('oc_chaos', u, true, BASE);
  await s.svc.ask('oc_other', DANIEL, true, BASE);
  const raw = await tokenFor(s);
  assert.throws(() => s.svc.saveHowToJoin(raw, { signupUrl: 'javascript:alert(1)' }, 'ip'), /https/);
  assert.throws(() => s.svc.saveHowToJoin(raw, { signupUrl: 'http://forms.gle/x' }, 'ip'), /https/);
  assert.throws(() => s.svc.saveHowToJoin(raw, {}, 'ip'), /sign-up link/);
  const v = s.svc.saveHowToJoin(raw, { signupUrl: 'https://forms.gle/chaos', who: 'open', next: { date: '2026-11-12', time: '19:00', place: 'MLK Pauley Room' } }, 'ip');
  assert.equal(v.waiting, 2);
  const notes = s.db.notifications.filter((n) => n.title === 'CHAOS posted how to join');
  assert.deepEqual(notes.map((n) => n.userId).sort(), [ME, MAYA].sort());
  assert.ok(notes.every((n) => n.link === '/orgs/oc_chaos'));
  // saving the same thing again doesn't notify twice
  s.svc.saveHowToJoin(raw, { signupUrl: 'https://forms.gle/chaos', who: 'open', next: { date: '2026-11-12', time: '19:00', place: 'MLK Pauley Room' } }, 'ip');
  assert.equal(s.db.notifications.filter((n) => n.title === 'CHAOS posted how to join').length, 2);
});

test('an organizer arriving delivers the saved requests: each waiting student hears "We told CHAOS you want to join"', async () => {
  const s = setup();
  for (const u of [ME, MAYA]) await s.svc.ask('oc_chaos', u, true, BASE);
  assert.equal(requestStatus(s.org(), ME), 'saved');
  s.svc.claim(await tokenFor(s), LILY);
  assert.equal(requestStatus(s.org(), ME), 'sent');
  assert.deepEqual(s.db.notifications.filter((n) => n.title === 'We told CHAOS you want to join').map((n) => n.userId).sort(), [ME, MAYA].sort());
});

test('messages: only verified organizers of that club, only students who consented, as the club in the direct conversation', async () => {
  const s = setup();
  await s.svc.ask('oc_chaos', ME, true, BASE);
  s.svc.claim(await tokenFor(s), LILY);
  // not an organizer (a student, or an organizer of another club)
  s.org('oc_other').adminIds.push(EMMA);
  assert.throws(() => s.svc.message('oc_chaos', MAYA, [ME], 'hi'), /organizers/);
  assert.throws(() => s.svc.message('oc_chaos', EMMA, [ME], 'hi'), /organizers/);
  // a student who never asked (no consent)
  assert.throws(() => s.svc.message('oc_chaos', LILY, [DANIEL], 'hi'), /asked to join/);
  // the requester — reuses (or opens) the plain direct conversation, signed as the club
  const r = s.svc.message('oc_chaos', LILY, [ME], 'Info session Thursday 7pm at MLK');
  assert.equal(r.sent, 1);
  const room = s.db.chatRooms.find((x) => x.type === 'direct' && x.memberIds.includes(LILY) && x.memberIds.includes(ME))!;
  assert.deepEqual(room.messages.at(-1)?.asOrg, { id: 'oc_chaos', name: 'CHAOS' });
  s.svc.message('oc_chaos', LILY, [ME], 'second');
  assert.equal(s.db.chatRooms.filter((x) => x.type === 'direct' && x.memberIds.includes(LILY) && x.memberIds.includes(ME)).length, 1, 'no new chat');
  // everyone at once: fans out to each consenting requester's direct conversation
  await s.svc.ask('oc_chaos', MAYA, true, BASE);
  const all = s.svc.message('oc_chaos', LILY, [ME, MAYA, DANIEL], 'Info session Thursday 7pm at MLK');
  assert.deepEqual([all.sent, all.skipped], [2, 1]);
});

test('messages: withdrawing stops new messages from that club', async () => {
  const s = setup();
  await s.svc.ask('oc_chaos', ME, true, BASE);
  s.svc.claim(await tokenFor(s), LILY);
  s.svc.message('oc_chaos', LILY, [ME], 'hello');
  s.svc.withdraw('oc_chaos', ME);
  assert.throws(() => s.svc.message('oc_chaos', LILY, [ME], 'still there?'), /asked to join/);
  // a decline ends it too
  await s.svc.ask('oc_chaos', MAYA, true, BASE);
  s.engine.orgs.respondApplication('oc_chaos', MAYA, false);
  assert.throws(() => s.svc.message('oc_chaos', LILY, [MAYA], 'hi'), /asked to join/);
});

test('blocks: a blocked pair never sees each other in requests, faces or messages, and the request is not delivered to that organizer', async () => {
  const s = setup({ orgs: [chaos({ adminIds: [LILY], memberIds: [LILY] }), other()] });
  s.db.relationships.blocks.push({ fromId: LILY, toId: ME, createdAt: '2026-11-01T00:00:00Z' } as never);
  const r = await s.svc.ask('oc_chaos', ME, true, BASE);
  assert.equal(r.status, 'saved', 'the only organizer blocked them — nothing was delivered');
  assert.ok(!s.db.notifications.some((n) => n.userId === LILY));
  await s.svc.ask('oc_chaos', MAYA, true, BASE);
  const forLily = snapshotFor(s.db, LILY).organizations.find((o) => o.id === 'oc_chaos')!;
  assert.deepEqual(forLily.requesters?.map((x) => x.userId), [MAYA]);
  assert.throws(() => s.svc.message('oc_chaos', LILY, [ME], 'hi'), /blocked/);
  // faces: a student who blocked another never sees them among "students who asked"
  s.db.relationships.blocks.push({ fromId: DANIEL, toId: MAYA, createdAt: '2026-11-01T00:00:00Z' } as never);
  const forDaniel = snapshotFor(s.db, DANIEL).organizations.find((o) => o.id === 'oc_chaos')!;
  assert.ok(!forDaniel.requestFaces?.includes(MAYA));
  assert.ok(forDaniel.requestFaces?.includes(ME));
  assert.equal(forDaniel.requestCount, 2);
});

test('account deletion removes the person’s requests and consent records', async () => {
  const s = setup();
  await s.svc.ask('oc_chaos', ME, true, BASE);
  const { eraseUser } = await import('@core/lib/account');
  eraseUser(s.db, ME);
  assert.deepEqual(s.org().applicantIds, []);
  assert.deepEqual(s.org().joinRequests, []);
});

test('wording: the club’s own acronym only; toast and status say "sent" only when it happened', async () => {
  const { clubShort, askedToast, statusLine } = await import('@core/lib/clubjoin');
  assert.equal(clubShort('Cal Hiking and Outdoor Society (CHAOS)'), 'CHAOS');
  assert.equal(clubShort('Korean Student Association (KSA)'), 'KSA');
  assert.equal(clubShort('Cal Indie Collective (band club)'), 'Cal Indie Collective (band club)');
  assert.equal(clubShort('Blueprint'), 'Blueprint');
  assert.equal(askedToast('sent', 'Cal Hiking and Outdoor Society (CHAOS)'), 'Sent to CHAOS ✓');
  assert.equal(askedToast('told', 'CHAOS'), 'Sent ✓ We passed it to CHAOS — you’ll hear here when they reply.');
  assert.equal(askedToast('saved', 'CHAOS'), 'Saved ✓ We’ll pass it to CHAOS and update you within 3 days.');
  assert.doesNotMatch(askedToast('saved', 'X Club') + statusLine('saved', 'X Club'), /sent|passed it|told|delivered/i);
  const askedAt = new Date().toISOString();
  assert.match(statusLine('saved', 'CHAOS', { askedAt }), /^You asked · we’ll update you by [A-Z][a-z]{2} \d{1,2}$/);
  assert.equal(statusLine('sent', 'CHAOS'), 'Sent to CHAOS');
  assert.equal(statusLine('told', 'CHAOS'), 'We passed it to CHAOS');
});

test('undo: withdrawing right after asking leaves nothing behind', async () => {
  const s = setup();
  await s.svc.ask('oc_chaos', ME, true, BASE);
  s.svc.withdraw('oc_chaos', ME);
  assert.deepEqual(s.org().applicantIds, []);
  assert.deepEqual(s.org().joinRequests, []);
  assert.equal(requestStatus(s.org(), ME), 'none');
});

test('mark contacted (/admin/clubs): every waiting request is passed on and told; later ones too for 30 days; nothing about the DM is stored', async () => {
  const s = setup();
  for (const u of [ME, MAYA]) await s.svc.ask('oc_chaos', u, true, BASE);
  await s.svc.ask('oc_other', DANIEL, true, BASE);
  s.tick(2);
  // the list: clubs without organizers with requests waiting, oldest first, with their public links
  s.org('oc_other').links = [{ label: 'Instagram', url: 'https://instagram.com/otherclub' }];
  const list = s.svc.adminList();
  assert.deepEqual(list.map((c) => [c.id, c.waiting]), [['oc_chaos', 2], ['oc_other', 1]]);
  assert.equal(list[0].oldestDays, 2);
  assert.deepEqual(list[1].links.map((l) => l.label), ['Instagram']);
  // DM text: a fresh link for that one club, the real count, no names
  const dm = s.svc.adminDm('oc_chaos', BASE);
  assert.match(dm.dm, /^Hi CHAOS! 2 Berkeley students asked to join you on Lumi \(a campus app for finding people to do things with\)\. Could you tell them how to join\? 2 minutes, no account needed: https:\/\/lumi\.example\/club-setup\/[A-Za-z0-9_-]+$/);
  const raw = dm.link.split('/club-setup/')[1];
  assert.equal(s.svc.setupView(raw).org.id, 'oc_chaos');
  // mark contacted
  await assert.rejects(() => s.svc.markContacted('oc_chaos', 'owner', 'carrier pigeon'), /Instagram/);
  const r = await s.svc.markContacted('oc_chaos', 'owner', 'instagram');
  assert.equal(r.told, 2);
  for (const u of [ME, MAYA]) assert.equal(requestStatus(s.org(), u), 'told');
  assert.equal(requestStatus(s.org('oc_other'), DANIEL), 'saved');
  assert.deepEqual(s.db.notifications.filter((n) => n.title === 'We told CHAOS you want to join').map((n) => n.userId).sort(), [ME, MAYA].sort());
  const stored = JSON.stringify([...(s.docs.get(CLUB_OUTREACH)?.values() ?? [])]);
  assert.match(stored, /"by":"owner","channel":"instagram"/);
  assert.ok(!stored.includes('Could you tell them') && !stored.includes(raw), 'the DM and its link are never stored');
  // a later request within 30 days: passed on at once (no extra notification — the toast says it); after 30 days: saved again
  s.tick(10);
  assert.equal((await s.svc.ask('oc_chaos', SOFIA, true, BASE)).status, 'told');
  assert.ok(!s.db.notifications.some((n) => n.userId === SOFIA));
  s.tick(25);
  assert.equal((await s.svc.ask('oc_chaos', EMMA, true, BASE)).status, 'saved');
  // clubs that got organizers drop off the list
  s.svc.claim(s.svc.adminDm('oc_chaos', BASE).link.split('/club-setup/')[1], LILY);
  assert.deepEqual(s.svc.adminList().map((c) => c.id), ['oc_other']);
});

test('3-day follow-up: exactly one update per saved request, with the club’s public link; none once it was passed on', async () => {
  const s = setup();
  s.org('oc_other').links = [{ label: 'Website', url: 'https://www.otherclub.org/' }, { label: 'Instagram', url: 'https://www.instagram.com/other_berkeley/' }];
  await s.svc.ask('oc_chaos', MAYA, true, BASE);   // passed on before day 3 (contacted) — she hears then, not again
  await s.svc.ask('oc_other', DANIEL, true, BASE); // still saved on day 3 → one follow-up
  await s.svc.ask('oc_other', EMMA, true, BASE);   // withdraws → nothing
  const by = s.org('oc_other').joinRequests!.find((r) => r.userId === DANIEL)!.promisedBy!;
  assert.ok(by, 'a saved request records the promised date');
  const at = (ms: number) => new Date(Date.parse(by) + ms).toISOString();
  assert.deepEqual(s.engine.orgs.followUps(at(-60_000)), {}, 'not before the 3 days are up');
  await s.svc.markContacted('oc_chaos', 'owner', 'email');
  s.svc.withdraw('oc_other', EMMA);
  const before = s.db.notifications.length;
  const notes = s.engine.orgs.followUps(at(60_000)).notifications ?? [];
  assert.deepEqual(notes.map((n) => n.userId), [DANIEL]);
  assert.equal(notes[0].title, 'Other Club isn’t on Lumi yet');
  assert.equal(notes[0].body, 'Here’s how they take members: instagram.com/other_berkeley. We’ll keep your request and tell you when they reply.');
  assert.equal(notes[0].link, '/orgs/oc_other');
  // exactly one — the hourly job running again sends nothing more
  assert.deepEqual(s.engine.orgs.followUps(at(3_600_000)), {});
  assert.equal(s.db.notifications.length, before + 1);
  // the job wrapper pushes it as a patch
  assert.deepEqual(s.svc.followUps(), {});
  // a request to a club with organizers never had a promise
  const t = setup({ orgs: [chaos({ adminIds: [LILY], memberIds: [LILY] })] });
  await t.svc.ask('oc_chaos', ME, true, BASE);
  assert.equal(t.org().joinRequests![0].promisedBy, undefined);
});
