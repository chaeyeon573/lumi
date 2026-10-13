/**
 * 좌석 알림 — 수업 페이지 JSON 읽기(저장한 HTML), 변화 감지, 알림 한도, 폴링 한 바퀴(중복 제거·간격·마감 뒤 중지·백오프).
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Patch } from '@core/api/types';
import type { AcademicDate } from '@core/lib/academic';
import { seatLine, seatState, seatSourceOk, type SeatSnapshot } from '@core/lib/seats';
import { parseSeatPage, detectSeatChange, canNotify, seatMessage, pollSeats, pollIntervalMin, seatView, statusId, SeatFetchError, type SeatStatusDoc, type SeatWatchDoc, type SeatStore } from './seats';
import { mergeWorkerNotifications } from './campus-api';
import { parseIcs, toAcademicDates } from './sources/academic-calendar';

const here = path.dirname(fileURLToPath(import.meta.url));
const fx = (f: string) => readFileSync(path.join(here, 'fixtures', f), 'utf8');
const DATES = toAcademicDates('s_berkeley', parseIcs(fx('berkeley-enrollment-calendar.ics')), 'x');
const snap = (o: Partial<SeatSnapshot>): SeatSnapshot => ({ code: 'O', label: 'Open', enrolled: 0, max: 100, waitlisted: 0, maxWaitlist: 50, openReserved: 0, at: '2026-10-26T17:00:00Z', ...o });

test('reads enrollmentStatus from saved class pages', () => {
  const open = parseSeatPage(fx('berkeley-class-2027-spring-compsci-61b.html'), 'T')!;
  assert.equal(open.term, 'Spring 2027');
  assert.deepEqual(open.seats, { code: 'O', label: 'Open', enrolled: 0, max: 481, waitlisted: 0, maxWaitlist: 555, openReserved: 0, at: 'T' });
  assert.equal(seatLine(open.seats), 'Open 481/481 · Waitlist 0/555');
  const closed = parseSeatPage(fx('berkeley-class-2026-fall-econ-1.html'), 'T')!;
  assert.deepEqual([closed.seats.code, closed.seats.enrolled, closed.seats.max, closed.seats.maxWaitlist], ['C', 510, 510, 170]);
  assert.equal(seatState(closed.seats), 'waitlist');
  assert.equal(seatLine(closed.seats), 'Closed · Waitlist 0/170');
  assert.equal(parseSeatPage('<html>no data</html>'), null);
  // 설정 JSON 이 없어도 enrollmentStatus 객체만 있으면
  const loose = parseSeatPage('<div data-x=\'{"enrollmentStatus":{"status":{"code":"C","description":"Closed"},"enrolledCount":40,"waitlistedCount":7,"maxEnroll":40,"maxWaitlist":10,"openReserved":0}}\'></div>', 'T')!;
  assert.deepEqual([loose.seats.code, loose.seats.waitlisted], ['C', 7]);
});

test('only public Berkeley class pages are fetched', () => {
  assert.ok(seatSourceOk('https://classes.berkeley.edu/content/2027-spring-compsci-61b-001-lec-001'));
  assert.ok(!seatSourceOk('https://evil.example.com/content/x'));
  assert.ok(!seatSourceOk('http://classes.berkeley.edu/content/x'));
  assert.ok(!seatSourceOk('https://classes.berkeley.edu/content/../admin?x=1'));
});

test('change detection: closed→open, seats appear, nearly full, waitlist drop', () => {
  assert.equal(detectSeatChange(undefined, snap({})), null, 'first look never notifies');
  assert.equal(detectSeatChange(snap({ code: 'C', enrolled: 100 }), snap({ code: 'O', enrolled: 97 })), 'opened');
  assert.equal(detectSeatChange(snap({ enrolled: 100 }), snap({ enrolled: 98 })), 'seats');
  assert.equal(detectSeatChange(snap({ enrolled: 90 }), snap({ enrolled: 96 })), 'nearly_full'); // 4 left of 100 → ≤ 5
  assert.equal(detectSeatChange(snap({ enrolled: 96 }), snap({ enrolled: 97 })), null, 'already nearly full');
  assert.equal(detectSeatChange(snap({ code: 'C', enrolled: 100, waitlisted: 30 }), snap({ code: 'C', enrolled: 100, waitlisted: 24 }), 5), 'waitlist_drop');
  assert.equal(detectSeatChange(snap({ code: 'C', enrolled: 100, waitlisted: 30 }), snap({ code: 'C', enrolled: 100, waitlisted: 27 }), 5), null);
  assert.equal(detectSeatChange(snap({ enrolled: 10 }), snap({ enrolled: 11 })), null);
  const m = seatMessage('seats', 'CS 61B', 'Spring 2027', snap({ enrolled: 100 }), snap({ enrolled: 97 }));
  assert.equal(m.title, 'CS 61B has 3 open seats — enroll on CalCentral');
  assert.match(m.body, /can't enroll for you/);
});

test('notification rate limit per class per user', () => {
  const t0 = Date.parse('2026-10-26T17:00:00Z');
  assert.equal(canNotify(undefined, 'seats', t0), true);
  const last = { at: new Date(t0).toISOString(), kind: 'seats' as const };
  assert.equal(canNotify(last, 'seats', t0 + 20 * 60_000), false);
  assert.equal(canNotify(last, 'opened', t0 + 46 * 60_000), true);
  assert.equal(canNotify(last, 'waitlist_drop', t0 + 2 * 3_600_000), false);
  assert.equal(canNotify(last, 'nearly_full', t0 + 3 * 3_600_000), true);
});

test('poll interval: hourly before Phase 1, every 15 min during enrollment, stop after add deadline', () => {
  assert.equal(pollIntervalMin(DATES, 's_berkeley', 'Spring 2027', '2026-10-13'), 60);
  assert.equal(pollIntervalMin(DATES, 's_berkeley', 'Spring 2027', '2026-10-26'), 15);
  assert.equal(pollIntervalMin(DATES, 's_berkeley', 'Spring 2027', '2027-02-19'), 15);
  assert.equal(pollIntervalMin(DATES, 's_berkeley', 'Spring 2027', '2027-02-20'), null);
});

/** 메모리 store */
function memStore(seed: Record<string, { id: string }[]>) {
  const docs = new Map<string, Map<string, unknown>>(Object.entries(seed).map(([k, v]) => [k, new Map(v.map((x) => [x.id, structuredClone(x)]))]));
  const patches: Patch[] = [];
  const store: SeatStore = {
    async listDocs<T extends { id: string }>(c: string) { return [...(docs.get(c)?.values() ?? [])].map((x) => structuredClone(x) as T); },
    async putDocs(c, items) { const m = docs.get(c) ?? docs.set(c, new Map()).get(c)!; for (const x of items) m.set(x.id, structuredClone(x)); },
    async applyPatch(p) { patches.push(p); },
  };
  return { store, docs, patches };
}
const URL61B = 'https://classes.berkeley.edu/content/2027-spring-compsci-61b-001-lec-001';
const URLECON = 'https://classes.berkeley.edu/content/2027-spring-econ-1-001-lec-001';
const watch = (userId: string, url: string, code: string): SeatWatchDoc => ({ id: `sw_${userId}_${url.split('/').pop()}`, userId, schoolId: 's_berkeley', courseId: 'cc', code, title: 'T', term: 'Spring 2027', url, createdAt: '2026-10-13T00:00:00Z' });
const page = (s: Partial<SeatSnapshot>) => { const x = snap(s); return `<script type="application/json" data-drupal-selector="drupal-settings-json">${JSON.stringify({ ucb: { enrollment: { available: { enrollmentStatus: { status: { code: x.code, description: x.code === 'O' ? 'Open' : 'Closed' }, enrolledCount: x.enrolled, waitlistedCount: x.waitlisted, maxEnroll: x.max, maxWaitlist: x.maxWaitlist, openReserved: 0 } } } } })}</script>`; };

test('poll: dedupes watchers, spaces requests, notifies each watcher once, then rate-limits', async () => {
  const prev: SeatStatusDoc = { id: statusId(URL61B), url: URL61B, schoolId: 's_berkeley', term: 'Spring 2027', code: 'CS 61B', title: 'T', latest: snap({ code: 'C', enrolled: 100 }), checkedAt: '2026-10-26T16:00:00Z', history: [], errors: 0, notified: {} };
  const { store, docs, patches } = memStore({ seatWatches: [watch('u1', URL61B, 'CS 61B'), watch('u2', URL61B, 'CS 61B'), watch('u1', URLECON, 'ECON 1')], academicDates: DATES, seatStatus: [prev] });
  const fetched: string[] = []; const sleeps: number[] = [];
  let now = new Date('2026-10-26T17:00:00Z');
  const opts = { now: () => now, sleep: async (ms: number) => { sleeps.push(ms); }, fetchPage: async (u: string) => { fetched.push(u); return u === URL61B ? page({ code: 'O', enrolled: 97 }) : page({ enrolled: 10 }); } };
  const s = await pollSeats(store, opts);
  assert.deepEqual(fetched.sort(), [URLECON, URL61B].sort(), 'one request per class, not per watcher');
  assert.deepEqual(sleeps, [1100], 'polite spacing between requests');
  assert.equal(s.notified, 2);
  const notes = patches.flatMap((p) => p.notifications ?? []);
  assert.deepEqual(notes.map((n) => n.userId).sort(), ['u1', 'u2']);
  assert.equal(notes[0].title, 'CS 61B has 3 open seats — enroll on CalCentral');
  assert.equal(notes[0].type, 'seat_alert');
  const st = docs.get('seatStatus')!.get(statusId(URL61B)) as SeatStatusDoc;
  assert.equal(st.latest!.enrolled, 97); assert.equal(st.history.length, 1);
  // 15분 뒤: 다시 닫혔다 열려도 45분 안에는 같은 사람에게 또 보내지 않는다
  now = new Date('2026-10-26T17:16:00Z'); fetched.length = 0;
  (docs.get('seatStatus')!.get(statusId(URL61B)) as SeatStatusDoc).latest = snap({ code: 'C', enrolled: 100 });
  const s2 = await pollSeats(store, opts);
  assert.equal(s2.due, 2); assert.equal(s2.notified, 0);
  // 5분 뒤에는 아직 볼 때가 아니다
  now = new Date('2026-10-26T17:21:00Z');
  assert.equal((await pollSeats(store, opts)).due, 0);
});

test('poll: stops after add deadline; backs off on errors and stops the round on 429', async () => {
  const { store, docs } = memStore({ seatWatches: [watch('u1', URL61B, 'CS 61B'), watch('u1', URLECON, 'ECON 1')], academicDates: DATES, seatStatus: [] });
  const after = await pollSeats(store, { now: () => new Date('2027-03-01T18:00:00Z'), fetchPage: async () => { throw new Error('should not fetch'); }, sleep: async () => {} });
  assert.deepEqual([after.ended, after.due], [2, 0]);
  let calls = 0;
  const r = await pollSeats(store, { now: () => new Date('2026-10-26T17:00:00Z'), sleep: async () => {}, fetchPage: async () => { calls++; throw new SeatFetchError(429, 'slow down'); } });
  assert.equal(calls, 1, 'stops the round after 429');
  assert.equal(r.throttled, 429);
  const st = [...docs.get('seatStatus')!.values()][0] as SeatStatusDoc;
  assert.equal(st.errors, 1);
  assert.equal(st.nextCheckAt, '2026-10-26T17:30:00.000Z'); // 15분 × 2
});

test('seat view hides other users and notification history; worker notifications merge once', () => {
  const st: SeatStatusDoc = { id: statusId(URL61B), url: URL61B, schoolId: 's_berkeley', term: 'Spring 2027', code: 'CS 61B', title: 'T', latest: snap({}), checkedAt: 'x', history: [], errors: 0, notified: { u2: { at: 'x', kind: 'seats' } } };
  const v = seatView('u1', 's_berkeley', [watch('u1', URL61B, 'CS 61B'), watch('u2', URL61B, 'CS 61B')], new Map([[st.id, st]]), DATES as AcademicDate[], ['Fall 2026', 'Spring 2027'], '2026-10-13');
  assert.equal(v.watches.length, 1);
  assert.ok(!JSON.stringify(v).includes('u2'));
  assert.deepEqual(v.watchableTerms, ['Spring 2027']);
  assert.equal(v.watches[0].until, '2027-02-19');
  const db = { notifications: [{ id: 'n1' }] } as unknown as Parameters<typeof mergeWorkerNotifications>[0];
  const stored = [{ id: 'n1' }, { id: 'n_seat_a_u1_1', userId: 'u1' }, { id: 'n_other' }] as unknown as Parameters<typeof mergeWorkerNotifications>[1];
  assert.equal(mergeWorkerNotifications(db, stored)!.notifications!.length, 1);
  assert.equal(mergeWorkerNotifications(db, stored), null);
});
