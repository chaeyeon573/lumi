/**
 * 링크로 묻는 약속 (/p/<id>) — 두 모드, 확정, 계정 없는 답의 제한, .ics, 로그인 없이 보이는 것.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Snapshot } from '@core/api/types';
import type { ID, TimePoll } from '@core/types';
import * as seed from '@core/data/seed.en';
import { createPlansEngine, type PlanInput } from '@core/api/plans';
import { cleanText, firstName, isPlanId, newPlanId, planIcs, planMeta, publicPlan, zonedToUtc, PLAN_LIMITS } from '@core/lib/plans';
import { snapshotFor, patchFor } from './view';
import { hashToken, planPageHtml, registerPlanRoutes, resetPlanLimits, PLAN_RATE } from './plans';

const db = (): Snapshot => structuredClone({
  users: seed.users, schools: seed.schools, organizations: seed.organizations, activities: seed.activities,
  participations: seed.participations, posts: seed.posts, relationships: seed.relationships, proposals: seed.proposals,
  chatRooms: seed.chatRooms, notifications: [], reports: [], opportunities: seed.opportunities,
  opportunityIntents: seed.opportunityIntents, timePolls: seed.timePolls, games: [],
});
const engineFor = (d: Snapshot) => createPlansEngine({ db: d, t: (s) => s, demo: false, push: () => {} }, { hash: hashToken });
const HOST = 'u_me';
const FRIEND = 'u_sua';
/** 오늘부터 n일 뒤 (UTC 날짜) */
const day = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

const fixedInput = (over: Partial<PlanInput> = {}): PlanInput => ({ title: 'Boba after midterms', emoji: '🧋', mode: 'fixed', place: { name: 'Asha Tea', lat: 0, lng: 0 }, options: [{ date: day(3), startTime: '14:00', endTime: '15:00' }], ...over });
const voteInput = (over: Partial<PlanInput> = {}): PlanInput => ({
  title: 'Dinner this week', emoji: '🍜', mode: 'vote', placeOptions: ['Imm Thai', 'Gypsy’s'],
  options: [{ date: day(2), startTime: '18:00', endTime: '19:30' }, { date: day(3), startTime: '18:00', endTime: '19:30' }, { date: day(4), startTime: '19:00', endTime: '20:30' }], ...over,
});

// ─── 두 모드 ────────────────────────────────────────────────────────────────
test('fixed time: Going / Maybe / Can’t from guests and Lumi users; the page shows first names for going/maybe and only a count for can’t', () => {
  const d = db(); const e = engineFor(d);
  const { poll } = e.create(HOST, fixedInput());
  assert.ok(isPlanId(poll.id), 'unguessable id');
  assert.equal(poll.options.length, 1);
  assert.equal(poll.link!.responses[0].userId, HOST);
  assert.equal(poll.link!.responses[0].rsvp, 'going');
  const a = e.guestRespond(poll.id, { name: 'Asha Patel', rsvp: 'going' });
  e.guestRespond(poll.id, { name: 'Ben', rsvp: 'maybe' });
  e.guestRespond(poll.id, { name: 'Cleo', rsvp: 'no' });
  e.respond(poll.id, FRIEND, { rsvp: 'going' });
  const v = e.view(poll.id, { token: a.token })!;
  assert.equal(v.mode, 'fixed');
  assert.deepEqual(v.going.slice(1), ['Asha', 'Lily']); // 주최자 + 손님(첫 단어) + Lumi(닉네임 첫 단어)
  assert.deepEqual(v.maybe, ['Ben']);
  assert.equal(v.no, 1);
  assert.equal(v.me?.name, 'Asha');
  assert.equal(v.me?.rsvp, 'going');
  assert.equal(v.final?.startTime, '14:00');
  assert.equal(v.status, 'open');
  // 같은 토큰으로 다시 답하면 고친다 (새 답이 아니라)
  const again = e.guestRespond(poll.id, { name: 'Asha', rsvp: 'maybe' }, a.token);
  assert.equal(again.created, false);
  assert.equal(again.token, a.token);
  assert.equal(e.view(poll.id)!.responded, 5);
  assert.throws(() => e.guestRespond(poll.id, { name: 'Dan', rsvp: 'yes' as never }), /Going, Maybe/);
  assert.throws(() => e.create(HOST, fixedInput({ options: [] })), /Pick one time/);
});

test('decide together: tap every time that works, counts per time, best time, optional place options', () => {
  const d = db(); const e = engineFor(d);
  const { poll } = e.create(HOST, voteInput());
  assert.equal(poll.options.length, 3);
  assert.equal(poll.link!.placeOptions!.length, 2);
  const [o1, o2, o3] = poll.options.map((o) => o.id);
  const [p1] = poll.link!.placeOptions!.map((p) => p.id);
  // 주최자는 모든 시간이 된다고 시작한다
  assert.deepEqual(poll.link!.responses[0].optionIds, [o1, o2, o3]);
  e.guestRespond(poll.id, { name: 'Asha', optionIds: [o2, o3, 'to_not_here'], placeIds: [p1] });
  e.guestRespond(poll.id, { name: 'Ben', optionIds: [o2] });
  e.respond(poll.id, FRIEND, { optionIds: [o2, o3] });
  const v = e.view(poll.id)!;
  assert.deepEqual(v.options.map((o) => o.count), [1, 4, 3]);
  assert.equal(v.best?.id, o2);
  assert.deepEqual(v.options[1].names.slice(1), ['Asha', 'Ben', 'Lily']);
  assert.equal(v.places[0].count, 1);
  assert.equal(v.final, undefined);
  assert.equal(v.status, 'open');
  assert.throws(() => e.create(HOST, voteInput({ options: voteInput().options.slice(0, 1) })), /at least 2/);
  assert.throws(() => e.create(HOST, voteInput({ options: Array.from({ length: 7 }, (_, i) => ({ date: day(i + 1), startTime: '10:00', endTime: '11:00' })) })), /Up to 6/);
});

test('lock: the host picks the final time (and place) → Lumi respondents get a notification, the page shows the final time, voting stops', () => {
  const d = db(); const e = engineFor(d);
  const { poll } = e.create(HOST, voteInput());
  const [, o2] = poll.options.map((o) => o.id);
  const [, p2] = poll.link!.placeOptions!.map((p) => p.id);
  const g = e.guestRespond(poll.id, { name: 'Asha', optionIds: [o2] });
  e.respond(poll.id, FRIEND, { optionIds: [o2] });
  e.respond(poll.id, 'u_jimin', { optionIds: [] });
  const patch = e.lock(poll.id, o2, p2);
  const nts = patch.notifications ?? [];
  assert.deepEqual(nts.map((n) => n.userId).sort(), [FRIEND, 'u_jimin'].sort(), 'every Lumi respondent except the host');
  assert.ok(nts.every((n) => n.type === 'plan_decided' && n.link === `/p/${poll.id}`));
  assert.match(nts[0].body, /Gypsy’s/);
  const v = e.view(poll.id, { token: g.token })!;
  assert.equal(v.status, 'locked');
  assert.equal(v.final?.optionId, o2);
  assert.equal(v.place, 'Gypsy’s');
  assert.throws(() => e.guestRespond(poll.id, { name: 'Late', optionIds: [o2] }), /already set/);
  assert.throws(() => e.respond(poll.id, FRIEND, { optionIds: [] }), /already set/);
  assert.throws(() => e.edit(poll.id, { options: voteInput().options }), /already set/);
  // 다시 확정하면 '시간이 바뀌었어요'
  const again = e.lock(poll.id, poll.options[0].id);
  assert.match(again.notifications![0].title, /Time changed/);
  // fixed 는 확정이 없다
  const fixed = e.create(HOST, fixedInput()).poll;
  assert.throws(() => e.lock(fixed.id, fixed.options[0].id), /already has a set time/);
});

test('host tools: edit options keeps votes on unchanged times, close stops answers, remove a response', () => {
  const d = db(); const e = engineFor(d);
  const { poll } = e.create(HOST, voteInput());
  const [o1, o2] = poll.options;
  const g = e.guestRespond(poll.id, { name: 'Asha', optionIds: [o1.id, o2.id] });
  e.edit(poll.id, { title: 'Dinner <b>Friday</b>', options: [{ ...o1 }, { date: day(5), startTime: '12:00', endTime: '13:00' }] });
  const p = d.timePolls.find((x) => x.id === poll.id)!;
  assert.equal(p.title, 'Dinner Friday');
  assert.equal(p.options.length, 2);
  assert.equal(p.options.find((o) => o.date === o1.date)?.id, o1.id, 'unchanged time keeps its id');
  const asha = p.link!.responses.find((r) => r.name === 'Asha')!;
  assert.deepEqual(asha.optionIds, [o1.id], 'votes on removed times are dropped');
  e.close(poll.id, true);
  assert.equal(e.view(poll.id)!.status, 'closed');
  assert.throws(() => e.guestRespond(poll.id, { name: 'Ben', optionIds: [o1.id] }), /closed/);
  e.close(poll.id, false);
  e.removeResponse(poll.id, asha.id);
  assert.equal(e.view(poll.id, { token: g.token })!.me, undefined);
  const hostResp = p.link!.responses.find((r) => r.userId === HOST)!;
  assert.throws(() => e.removeResponse(poll.id, hostResp.id), /own answer/);
});

// ─── 입력 정리 · id ──────────────────────────────────────────────────────────
test('names are a first name only, capped, with HTML removed; ids are long and random', () => {
  assert.equal(firstName('  <script>alert(1)</script> Asha  Patel'), 'alert(1)');
  assert.equal(firstName('<img src=x onerror=alert(1)>Zoe'), 'Zoe');
  assert.equal(firstName('Bartholomew-Maximilian-Alexander'), 'Bartholomew-Maximili');
  assert.equal(firstName('Bartholomew-Maximilian-Alexander').length, PLAN_LIMITS.nameMax);
  assert.equal(cleanText('a\u0000b‮c <i>d</i>', 50), 'a b c d');
  const ids = new Set(Array.from({ length: 2000 }, newPlanId));
  assert.equal(ids.size, 2000);
  for (const id of [...ids].slice(0, 50)) assert.match(id, /^p_[0-9A-Za-z]{16}$/);
  assert.equal(isPlanId('tp_abc'), false);
  const e = engineFor(db());
  const { poll } = e.create(HOST, fixedInput());
  assert.throws(() => e.guestRespond(poll.id, { name: '  <b></b> ', rsvp: 'going' }), /first name/);
});

// ─── .ics ─────────────────────────────────────────────────────────────────
test('ics: only once the time is set; UTC times from campus time, escaped text, CRLF and folded lines', () => {
  const d = db(); const e = engineFor(d);
  const { poll } = e.create(HOST, voteInput({ title: 'Dinner; with friends, finally', note: 'Bring cash\nsplit later' }));
  const ics0 = (p: TimePoll, url: string, now?: Date) => planIcs(publicPlan(p, d.users), url, now);
  assert.equal(ics0(poll, 'https://x/p/' + poll.id), null, 'not before lock');
  e.lock(poll.id, poll.options[1].id, poll.link!.placeOptions![0].id);
  const ics = ics0(d.timePolls.find((p) => p.id === poll.id)!, `https://x/p/${poll.id}`, new Date('2026-10-13T00:00:00Z'))!;
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(!/[^\r]\n/.test(ics), 'CRLF only');
  const start = zonedToUtc(poll.options[1].date, '18:00', 'America/Los_Angeles');
  assert.match(ics, new RegExp(`DTSTART:${start.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`));
  assert.match(ics, /SUMMARY:🍜 Dinner\\; with friends\\, finally/);
  assert.match(ics, /LOCATION:Imm Thai/);
  assert.match(ics, /DESCRIPTION:Bring cash\\nsplit later\\n\\nhttps:\/\/x\/p\//);
  assert.match(ics, new RegExp(`UID:${poll.id}@lumi`));
  assert.match(ics, /TRIGGER:-PT1H/);
  for (const line of ics.split('\r\n')) assert.ok(new TextEncoder().encode(line).length <= 75, `folded: ${line}`);
  // 시간대: 여름(PDT, -7)과 겨울(PST, -8)
  assert.equal(zonedToUtc('2026-07-01', '14:00', 'America/Los_Angeles').toISOString(), '2026-07-01T21:00:00.000Z');
  assert.equal(zonedToUtc('2026-12-01', '14:00', 'America/Los_Angeles').toISOString(), '2026-12-01T22:00:00.000Z');
  // fixed 는 처음부터 캘린더에 넣을 수 있다
  const fixed = e.create(HOST, fixedInput()).poll;
  assert.match(ics0(fixed, 'https://x')!, /LOCATION:Asha Tea/);
});

// ─── 미리보기 · 공개 모양 ────────────────────────────────────────────────────
test('Open Graph: "pick a time" / "Thu 2pm works for 4" / fixed summary — counts only, never names', () => {
  const d = db(); const e = engineFor(d);
  const { poll } = e.create(HOST, voteInput({ title: 'Boba after midterms', emoji: '🧋' }));
  let m = planMeta(poll, d.users, true);
  assert.equal(m.title, '🧋 Boba after midterms — pick a time');
  for (const name of ['Asha', 'Ben', 'Cleo']) e.guestRespond(poll.id, { name, optionIds: [poll.options[1].id] });
  m = planMeta(poll, d.users, true);
  assert.match(m.description, /^\w{3} 6pm works for 4 · 3 times to pick from/);
  assert.ok(!/Asha|Ben|Cleo|Lily/.test(m.title + m.description));
  const fixed = e.create(HOST, fixedInput()).poll;
  e.guestRespond(fixed.id, { name: 'Asha', rsvp: 'going' });
  m = planMeta(fixed, d.users, true);
  assert.match(m.title, /^🧋 Boba after midterms · \w{3} 2pm · Asha Tea$/);
  assert.match(m.description, /^2 going — tap/);
  const html = planPageHtml('<html><head><title>Lumi</title><meta property="og:title" content="Lumi" /></head><body></body></html>', { ...m, url: 'https://x/p/1', image: 'https://x/og-plan.png' });
  assert.equal((html.match(/og:title/g) ?? []).length, 1);
  assert.ok(html.includes('content="🧋 Boba after midterms'));
  assert.equal(planMeta(undefined, d.users, true).title, 'A plan on Lumi');
});

test('a signed-out page sees first names and counts — no user ids, tokens, hashes or the response list', () => {
  const d = db(); const e = engineFor(d);
  const { poll } = e.create(HOST, voteInput());
  const g = e.guestRespond(poll.id, { name: 'Asha', optionIds: [poll.options[0].id] });
  e.respond(poll.id, FRIEND, { optionIds: [poll.options[0].id] });
  const v = publicPlan(d.timePolls.find((p) => p.id === poll.id)!, d.users, {})!;
  const s = JSON.stringify(v);
  for (const secret of [HOST, FRIEND, g.token, hashToken(g.token), 'tokenHash', 'userId', 'u_']) assert.ok(!s.includes(secret), `leaks ${secret}`);
  assert.equal(v.responses, undefined);
  assert.equal(v.isHost, false);
  // 주최자는 지우기용 목록을 받는다 (그래도 토큰·해시는 없다)
  const h = publicPlan(d.timePolls.find((p) => p.id === poll.id)!, d.users, { userId: HOST })!;
  assert.equal(h.isHost, true);
  assert.equal(h.responses!.length, 3);
  assert.ok(!JSON.stringify(h).includes(hashToken(g.token)));
});

test('in the app: link plans go only to the host and Lumi respondents, without guest token hashes', () => {
  const d = db(); const e = engineFor(d);
  const { poll } = e.create(HOST, fixedInput());
  const g = e.guestRespond(poll.id, { name: 'Asha', rsvp: 'going' });
  const host = snapshotFor(d, HOST).timePolls.find((p) => p.id === poll.id)!;
  assert.ok(host);
  assert.ok(!JSON.stringify(host).includes(hashToken(g.token)));
  assert.equal(snapshotFor(d, FRIEND).timePolls.find((p) => p.id === poll.id), undefined, 'not answered yet');
  const patch = e.respond(poll.id, FRIEND, { rsvp: 'maybe' });
  assert.ok(patchFor(patch, FRIEND, d)?.timePolls?.some((p) => p.id === poll.id));
  assert.equal(patchFor(patch, 'u_jimin', d)?.timePolls?.length ?? 0, 0);
  assert.ok(!JSON.stringify(patchFor(patch, HOST, d)).includes('tokenHash'));
  // 예전 Plan Together 는 그대로
  assert.equal(snapshotFor(d, 'u_jimin').timePolls.filter((p) => !p.link).length, d.timePolls.filter((p) => !p.link).length);
});

test('reminders: an hour before the set time, once, to Lumi respondents who didn’t say no', () => {
  const d = db(); const e = engineFor(d);
  const { poll } = e.create(HOST, fixedInput());
  e.respond(poll.id, FRIEND, { rsvp: 'maybe' });
  e.respond(poll.id, 'u_jimin', { rsvp: 'no' });
  e.guestRespond(poll.id, { name: 'Asha', rsvp: 'going' });
  const start = zonedToUtc(poll.options[0].date, poll.options[0].startTime);
  assert.deepEqual(e.reminders(new Date(start.getTime() - 3 * 3600_000)), {}, 'too early');
  const p = e.reminders(new Date(start.getTime() - 30 * 60_000));
  assert.deepEqual(p.notifications!.map((n) => n.userId).sort(), [FRIEND, HOST].sort());
  assert.ok(p.notifications!.every((n) => n.type === 'activity_reminder' && n.link === `/p/${poll.id}`));
  assert.deepEqual(e.reminders(new Date(start.getTime() - 20 * 60_000)), {}, 'only once');
});

// ─── HTTP: 권한 · 계정 없는 답의 제한 ────────────────────────────────────────
async function server(d: Snapshot) {
  resetPlanLimits();
  const dist = mkdtempSync(path.join(tmpdir(), 'plans-'));
  writeFileSync(path.join(dist, 'index.html'), '<!doctype html><html><head><title>Lumi</title><meta name="description" content="x" /></head><body><div id="root"></div></body></html>');
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json());
  // 테스트용 인증: Bearer <userId>
  const auth = (req: express.Request & { userId?: ID }, _res: express.Response, next: express.NextFunction) => { const h = req.headers.authorization ?? ''; if (h.startsWith('Bearer ')) req.userId = h.slice(7); next(); };
  const pushed: unknown[] = [];
  const plans = registerPlanRoutes(app, { db: () => d, auth, push: (p) => pushed.push(p), patchFor: (p, me) => patchFor(p, me, d), dist, reminders: false });
  const srv = app.listen(0);
  await new Promise((r) => srv.once('listening', r));
  const base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`;
  const post = async (url: string, body: unknown, headers: Record<string, string> = {}) => { const r = await fetch(base + url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json() as Record<string, unknown> }; };
  return { base, post, plans, pushed, close: () => srv.close() };
}

test('http: create over RPC as yourself, only the host can lock/edit/close/remove, respond only as yourself', async () => {
  const d = db(); const s = await server(d);
  try {
    const as = (u: string) => ({ authorization: `Bearer ${u}` });
    assert.equal((await s.post('/api/rpc/plans/create', { args: [HOST, voteInput()] })).status, 401);
    assert.equal((await s.post('/api/rpc/plans/create', { args: [HOST, voteInput()] }, as(FRIEND))).status, 403);
    const c = await s.post('/api/rpc/plans/create', { args: [HOST, voteInput()] }, as(HOST));
    assert.equal(c.status, 200);
    const poll = c.body.poll as TimePoll;
    assert.equal((await s.post('/api/rpc/plans/lock', { args: [poll.id, poll.options[0].id] }, as(FRIEND))).status, 403);
    assert.equal((await s.post('/api/rpc/plans/close', { args: [poll.id, true] }, as(FRIEND))).status, 403);
    assert.equal((await s.post('/api/rpc/plans/respond', { args: [poll.id, HOST, { optionIds: [] }] }, as(FRIEND))).status, 403);
    assert.equal((await s.post('/api/rpc/plans/respond', { args: [poll.id, FRIEND, { optionIds: [poll.options[0].id] }] }, as(FRIEND))).status, 200);
    assert.equal((await s.post('/api/rpc/plans/view', { args: [poll.id] }, as(HOST))).status, 404, 'view/guestRespond are not RPC methods');
    assert.equal((await s.post('/api/rpc/plans/lock', { args: [poll.id, poll.options[0].id] }, as(HOST))).status, 200);
  } finally { s.close(); }
});

test('http: anonymous answers — rate limited per network, per plan and per device token; capped per plan', async () => {
  const d = db(); const s = await server(d);
  try {
    const { poll } = s.plans.create(HOST, fixedInput());
    const answer = (name: string) => ({ answer: { name, rsvp: 'going' } });
    const ip = (n: number) => ({ 'x-forwarded-for': `10.0.0.${n}` });
    // 같은 네트워크에서 같은 약속에 새 이름은 25개까지
    for (let i = 0; i < PLAN_RATE.newPerIpPerPlanHour; i++) assert.equal((await s.post(`/api/plans/${poll.id}/respond`, answer(`G${i}`), ip(1))).status, 200);
    const blocked = await s.post(`/api/plans/${poll.id}/respond`, answer('Spam'), ip(1));
    assert.equal(blocked.status, 429);
    assert.match(String(blocked.body.error), /new names/);
    // 다른 네트워크는 괜찮다. 토큰으로 내 답을 고치는 것도 횟수 제한
    const first = await s.post(`/api/plans/${poll.id}/respond`, answer('Asha'), ip(2));
    const token = String(first.body.token);
    assert.ok(token.length >= 32);
    let last = 0;
    for (let i = 0; i < PLAN_RATE.tokenPer10Min + 1; i++) last = (await s.post(`/api/plans/${poll.id}/respond`, { ...answer('Asha'), token }, ip(3))).status;
    assert.equal(last, 429);
    // 네트워크 전체 10분 60번
    resetPlanLimits();
    const statuses: number[] = [];
    for (let i = 0; i < PLAN_RATE.ipPer10Min + 1; i++) { const p2 = s.plans.create(HOST, fixedInput()).poll; statuses.push((await s.post(`/api/plans/${p2.id}/respond`, answer(`N${i}`), ip(4))).status); }
    assert.equal(statuses.filter((x) => x === 429).length, 1);
    // 약속마다 150개
    const big = s.plans.create(HOST, fixedInput()).poll;
    for (let i = 0; big.link!.responses.length < PLAN_LIMITS.maxResponses; i++) s.plans.guestRespond(big.id, { name: `P${i}`, rsvp: 'going' });
    resetPlanLimits();
    const full = await s.post(`/api/plans/${big.id}/respond`, answer('Late'), ip(5));
    assert.equal(full.status, 400);
    assert.match(String(full.body.error), /all the answers/);
    // 이름: 첫 단어 · HTML 제거
    const h = await s.post(`/api/plans/${poll.id}/respond`, answer('<b>Zoë</b> Kim'), ip(6));
    assert.equal((h.body.plan as { me: { name: string } }).me.name, 'Zoë');
    // 모르는 / 추측한 id
    assert.equal((await s.post('/api/plans/p_aaaaaaaaaaaaaaaa/respond', answer('X'), ip(7))).status, 404);
    assert.equal((await s.post('/api/plans/tp_1/view', {}, ip(7))).status, 404);
  } finally { s.close(); }
});

test('http: signed-out view, the /p/<id> page with OG tags, and the .ics download', async () => {
  const d = db(); const s = await server(d);
  try {
    const { poll } = s.plans.create(HOST, voteInput({ title: 'Boba after midterms', emoji: '🧋' }));
    const g = s.plans.guestRespond(poll.id, { name: 'Asha', optionIds: [poll.options[0].id] });
    const out = await s.post(`/api/plans/${poll.id}/view`, { token: g.token });
    const plan = out.body.plan as Record<string, unknown>;
    assert.equal((plan.me as { name: string }).name, 'Asha');
    assert.equal(plan.responses, undefined);
    assert.ok(!JSON.stringify(out.body).includes(HOST));
    const hostView = await s.post(`/api/plans/${poll.id}/view`, {}, { authorization: `Bearer ${HOST}` });
    assert.equal((hostView.body.plan as { isHost: boolean }).isHost, true);
    // 미리보기 (디스코드 봇처럼)
    const page = await fetch(`${s.base}/p/${poll.id}`, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)' } });
    const html = await page.text();
    assert.equal(page.status, 200);
    assert.match(html, /<meta property="og:title" content="🧋 Boba after midterms — pick a time" \/>/);
    assert.match(html, /works for 2/);
    assert.ok(!html.includes('Asha'), 'no names in previews');
    assert.match(html, /og:image" content="http:\/\/127\.0\.0\.1:\d+\/og-plan\.png"/);
    // 캘린더 — 확정 전에는 없고, 확정 뒤에는 파일
    assert.equal((await fetch(`${s.base}/api/plans/${poll.id}/ics`)).status, 404);
    s.plans.lock(poll.id, poll.options[0].id);
    const ics = await fetch(`${s.base}/api/plans/${poll.id}/ics`);
    assert.equal(ics.status, 200);
    assert.match(ics.headers.get('content-type') ?? '', /text\/calendar/);
    assert.match(ics.headers.get('content-disposition') ?? '', /boba-after-midterms\.ics/);
    assert.match(await ics.text(), /BEGIN:VEVENT/);
  } finally { s.close(); }
});
