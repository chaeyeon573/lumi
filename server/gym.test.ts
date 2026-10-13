/**
 * 체육관 혼잡도 — RecWell 페이지(토큰을 가린 사본)에서 표시판을 찾고, Density 응답을 읽고,
 * %·평소·알림·오래된 숫자 처리가 맞는지. 지난 숫자를 지금 것처럼 내보내지 않는다.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { parseCrowdMeterPage, parseDensityDisplay, DensityError, type DensityDisplay } from './sources/density';
import { percentOf, crowdLevel, isFresh, gymView, usualByHour, alertDue, normalizeAlert, type GymAlert, type GymDayDoc } from '@core/lib/gym';
import { addDaysISO, campusClock } from '@core/lib/campusclock';
import { addSample, backoffMinutes, createGym, GYM_SOURCES } from './gym';
import { gymAnswer } from './ai-live';
import { FileStore } from './store';

const FIX = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const RSF = 'dsp_956223069054042646';
const CMS = 'dsp_1160333760881754703';
const json = (id: string) => JSON.parse(readFileSync(path.join(FIX, `density-${id}.json`), 'utf8'));
/** 테스트용 시각 → 시: unix 초를 UTC 시로 (시간대와 무관하게 고정) */
const utcHour = (s: number) => new Date(s * 1000).getUTCHours();
const sec = (iso: string) => Date.parse(iso) / 1000;

test('crowd meter page: Density display ids and share tokens from the iframes', () => {
  const html = gunzipSync(readFileSync(path.join(FIX, 'recwell-crowd-meter.html.gz'))).toString('utf8');
  const list = parseCrowdMeterPage(html);
  assert.deepEqual(list.map((d) => d.displayId), [RSF, CMS]);
  assert.deepEqual(list.map((d) => d.token), ['shr_FIXTURE_TOKEN_1', 'shr_FIXTURE_TOKEN_2']);
  assert.deepEqual(list.map((d) => d.title), ['Weightroom Capacity', 'CMS Fitness Capacity']);
  assert.deepEqual(parseCrowdMeterPage('<iframe src="https://www.googletagmanager.com/ns.html?id=X"></iframe>'), []);
});

test('Density response: count, capacity and a clean name; bad shapes throw instead of guessing', () => {
  assert.deepEqual(parseDensityDisplay(json(RSF), RSF), { displayId: RSF, spaceId: 'spc_863128347956216317', name: 'RSF Weight Rooms', count: 2, capacity: 150 });
  assert.deepEqual(parseDensityDisplay(json(CMS), CMS), { displayId: CMS, spaceId: 'spc_1160313045122023975', name: 'CMS Fitness Center', count: 0, capacity: 55 });
  const bad = (patch: Record<string, unknown>) => () => parseDensityDisplay({ ...json(RSF), dedicated_space: { ...json(RSF).dedicated_space, ...patch } }, RSF);
  assert.throws(bad({ current_count: null }), /current_count/);
  assert.throws(bad({ current_count: -3 }), /current_count/);
  assert.throws(bad({ capacity: 0 }), /capacity/);
  assert.throws(() => parseDensityDisplay({}, RSF), /dedicated_space/);
  assert.throws(() => parseDensityDisplay(json(RSF), CMS), /mismatch/);
});

test('percent, level, freshness', () => {
  assert.equal(percentOf(45, 150), 30);
  assert.equal(percentOf(160, 150), 107);
  assert.equal(percentOf(3, 0), 0);
  assert.deepEqual([10, 40, 70, 95].map(crowdLevel), ['quiet', 'moderate', 'busy', 'packed']);
  const now = Date.parse('2026-10-13T18:00:00Z');
  assert.equal(isFresh(now - 6 * 60_000, now), true);
  assert.equal(isFresh(now - 16 * 60_000, now), false);
  assert.equal(isFresh(undefined, now), false);
});

const doc = (date: string, samples: [number, number][], capacity = 100): GymDayDoc => ({ id: `gym_${RSF}_${date}`, schoolId: 's_berkeley', displayId: RSF, name: 'RSF Weight Rooms', date, capacity, samples });

test('view: live only when fresh; stale shows unavailable with no number; usual after 7 days', () => {
  const clock = { date: '2026-10-13', min: 18 * 60, weekday: 2 };
  const nowMs = Date.parse('2026-10-13T18:00:00Z');
  const today = doc('2026-10-13', [[sec('2026-10-13T17:00:00Z'), 40], [sec('2026-10-13T17:30:00Z'), 60], [sec('2026-10-13T17:55:00Z'), 50]]);
  const live = gymView({ displayId: RSF, name: 'RSF Weight Rooms', capacity: 100, last: { at: nowMs - 5 * 60_000, count: 50 }, history: [today], clock, nowMs, hourOf: utcHour });
  assert.equal(live.status, 'live'); assert.equal(live.percent, 50); assert.equal(live.count, 50);
  assert.equal(live.today.find((h) => h.hour === 17)?.percent, 50);
  assert.equal(live.usualNow, null); assert.equal(live.historyDays, 1);
  const stale = gymView({ displayId: RSF, name: 'RSF Weight Rooms', capacity: 100, last: { at: nowMs - 40 * 60_000, count: 50 }, history: [today], clock, nowMs, hourOf: utcHour });
  assert.equal(stale.status, 'unavailable');
  assert.equal(stale.percent, undefined); assert.equal(stale.count, undefined);
  assert.ok(stale.updatedAt);
  // 지난 7일 + 오늘 — 지난주 화요일 18시는 80%
  const past = Array.from({ length: 7 }, (_, i) => addDaysISO('2026-10-13', -(i + 1))).map((d) => doc(d, [[sec(`${d}T18:10:00Z`), d === '2026-10-06' ? 80 : 20]]));
  assert.equal(usualByHour(past.slice(0, 6), '2026-10-13', utcHour).size, 0, 'needs 7 days');
  const usual = usualByHour(past, '2026-10-13', utcHour);
  assert.equal(usual.get(18), 80, 'same weekday only');
  const v = gymView({ displayId: RSF, name: 'x', capacity: 100, last: { at: nowMs, count: 30 }, history: [...past, today], clock, nowMs, hourOf: utcHour });
  assert.equal(v.usualNow, 80); assert.equal(v.historyDays, 8);
});

test('alerts: live, in the window, under the level, once a day', () => {
  const a: GymAlert = { id: 'ga', userId: 'u1', schoolId: 's_berkeley', displayId: RSF, below: 30, days: [1, 2, 3], start: '17:00', end: '20:00', enabled: true, createdAt: '' };
  const clock = { date: '2026-10-13', min: 18 * 60, weekday: 2 };
  assert.equal(alertDue(a, clock, { status: 'live', percent: 25 }), true);
  assert.equal(alertDue(a, clock, { status: 'live', percent: 30 }), false, 'not under');
  assert.equal(alertDue(a, clock, { status: 'unavailable' }), false, 'never on stale data');
  assert.equal(alertDue(a, { ...clock, min: 20 * 60 }, { status: 'live', percent: 5 }), false, 'window end is exclusive');
  assert.equal(alertDue(a, { ...clock, weekday: 5 }, { status: 'live', percent: 5 }), false, 'other day');
  assert.equal(alertDue({ ...a, lastFiredDate: '2026-10-13' }, clock, { status: 'live', percent: 5 }), false, 'already today');
  assert.equal(alertDue({ ...a, enabled: false }, clock, { status: 'live', percent: 5 }), false);
  assert.deepEqual(normalizeAlert({ below: '25', days: [3, 1, 1, 9], start: '06:00', end: '09:30' }), { below: 25, days: [1, 3], start: '06:00', end: '09:30', enabled: true });
  assert.match((normalizeAlert({ below: 2, days: [1], start: '06:00', end: '09:00' }) as { error: string }).error, /5% and 95%/);
  assert.match((normalizeAlert({ below: 30, days: [], start: '06:00', end: '09:00' }) as { error: string }).error, /day/);
  assert.match((normalizeAlert({ below: 30, days: [1], start: '09:00', end: '09:10' }) as { error: string }).error, /30 minutes/);
});

test('samples and backoff', () => {
  const d = addSample(addSample(doc('2026-10-13', []), 1000, 5), 1030, 6);
  assert.deepEqual(d.samples, [[1030, 6]], 'within a minute replaces');
  assert.deepEqual(addSample(d, 1400, 9).samples.length, 2);
  assert.deepEqual([0, 1, 2, 3, 5, 9].map((n) => backoffMinutes(n)), [0, 5, 10, 20, 60, 60]);
});

test('service: one request per space per poll, records, re-reads the page on 403, alerts once, unavailable when stale', async () => {
  const file = path.join(mkdtempSync(path.join(os.tmpdir(), 'lumi-gym-')), 'db.json');
  const store = new FileStore(file); await store.init();
  const real = GYM_SOURCES.s_berkeley;
  let discovers = 0; const reads: string[] = []; let count = 20; let fail403 = false;
  GYM_SOURCES.s_berkeley = { ...real, discover: async () => { discovers++; return [{ displayId: RSF, token: `shr_T${discovers}`, title: 'Weightroom' }, { displayId: CMS, token: `shr_T${discovers}` }]; },
    read: async (d: DensityDisplay) => { reads.push(`${d.displayId}:${d.token}`); if (fail403 && d.displayId === RSF) throw new DensityError(403, 'density → HTTP 403'); return parseDensityDisplay({ ...json(d.displayId), dedicated_space: { ...json(d.displayId).dedicated_space, current_count: count } }, d.displayId); } };
  try {
    // 화요일 18:00 PT
    let now = new Date('2026-10-14T01:00:00Z');
    const sent: { userId: string; title: string }[] = [];
    const users = new Set(['u1', 'u2']);
    const gym = createGym({ store, notify: (n) => sent.push(...n), userExists: (id) => users.has(id), now: () => now });
    await gym.load();
    await gym.poll();
    assert.equal(discovers, 1); assert.deepEqual(reads, [`${RSF}:shr_T1`, `${CMS}:shr_T1`]);
    let v = gym.views('s_berkeley');
    assert.deepEqual(v.map((x) => [x.name, x.status, x.percent]), [['RSF Weight Rooms', 'live', 13], ['CMS Fitness Center', 'live', 36]]);
    // 알림 — 30% 미만, 화요일 17~20시
    const r = await gym.setAlert('u1', 's_berkeley', { displayId: RSF, below: 30, days: [2], start: '17:00', end: '20:00' });
    assert.ok(Array.isArray(r) && r.length === 1);
    assert.match(((await gym.setAlert('u1', 's_berkeley', { displayId: 'dsp_nope', below: 30, days: [2], start: '17:00', end: '20:00' })) as { error: string }).error, /crowd meter/);
    await gym.poll();
    assert.equal(sent.length, 1); assert.equal(sent[0].userId, 'u1');
    assert.match(sent[0].title, /^RSF Weight Rooms is at 13% right now$/);
    await gym.poll(); await gym.poll();
    assert.equal(sent.length, 1, 'once a day');
    // 토큰이 바뀜 → 403 → 다음 폴링 때 페이지를 다시 읽는다 (30분 지난 뒤)
    fail403 = true; reads.length = 0;
    now = new Date('2026-10-14T01:05:00Z');
    await gym.poll();
    assert.equal(reads.filter((x) => x.startsWith(RSF)).length, 1);
    fail403 = false;
    // 403 뒤 RSF 는 쉬고(백오프 5분) — 페이지 다시 읽기는 30분에 한 번까지
    now = new Date('2026-10-14T01:20:00Z');
    await gym.poll();
    assert.equal(discovers, 1, 'page re-read at most every 30 min');
    assert.ok(!reads.includes(`${RSF}:shr_T2`));
    now = new Date('2026-10-14T01:45:00Z');
    await gym.poll();
    assert.equal(discovers, 2, 'page re-read after 403');
    assert.ok(reads.includes(`${RSF}:shr_T2`), 'new token used');
    // 기록이 저장됐고 재시작해도 남는다 (토큰은 저장하지 않는다)
    const saved = await store.listDocs<GymDayDoc>('gymDays');
    assert.ok(saved.some((d) => d.displayId === RSF && d.samples.length >= 1 && d.date === campusClock(now).date));
    assert.ok(!readFileSync(file, 'utf8').includes('shr_T'), 'tokens never stored');
    const later = createGym({ store, notify: () => {}, userExists: () => true, now: () => new Date(now.getTime() + 3 * 3_600_000) });
    await later.load();
    v = later.views('s_berkeley');
    assert.ok(v.length === 2 && v.every((x) => x.status === 'unavailable' && x.percent === undefined), 'after a restart with old readings: unavailable, no number');
  } finally { GYM_SOURCES.s_berkeley = real; }
});

test('Ask Lumi gym_crowd: numbers only when live', () => {
  const nowMs = Date.parse('2026-10-13T18:00:00Z');
  const base = { capacity: 150, today: [], usualNow: null, historyDays: 2 };
  const r = gymAnswer([{ ...base, id: RSF, name: 'RSF Weight Rooms', status: 'live', count: 45, percent: 30, updatedAt: new Date(nowMs - 3 * 60_000).toISOString() }, { ...base, id: CMS, name: 'CMS Fitness Center', status: 'unavailable', updatedAt: new Date(nowMs - 3_600_000).toISOString() }], undefined, 'Live count from the RSF crowd meter (RecWell)', nowMs);
  assert.deepEqual(r.results.map((x) => [x.space, x.status, 'percent_full' in x ? x.percent_full : undefined]), [['RSF Weight Rooms', 'live', 30], ['CMS Fitness Center', 'unavailable', undefined]]);
  assert.equal((r.results[0] as { updated_minutes_ago: number }).updated_minutes_ago, 3);
  assert.match(JSON.stringify(r.results[0]), /Not enough history yet/);
  assert.equal(gymAnswer([{ ...base, id: RSF, name: 'RSF Weight Rooms', status: 'live', count: 45, percent: 30 }, { ...base, id: CMS, name: 'CMS Fitness Center', status: 'live', count: 5, percent: 9 }], 'rsf', '', nowMs).results.length, 1);
  assert.match(gymAnswer([], undefined, '', nowMs).note ?? '', /never guess/);
});
