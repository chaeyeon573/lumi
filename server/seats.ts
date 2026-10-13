/**
 * 좌석 알림 — 학생이 관심 수업을 걸어 두면(seatWatches) 워커가 그 수업 페이지만 정중하게 다시 읽어 좌석 수를 기록하고(seatStatus),
 * 의미 있는 변화가 있으면 알림(notifications, type seat_alert)을 보낸다.
 *
 * 원본: classes.berkeley.edu 수업 페이지에 박힌 drupal-settings JSON 의 ucb.enrollment.available.enrollmentStatus
 *   { status: { code: O|C, description }, enrolledCount, waitlistedCount, maxEnroll, maxWaitlist, openReserved, seatReservations … }
 *
 * 폴링 규칙
 *   - 누군가 걸어 둔 수업만 본다 (같은 페이지는 사용자 수와 상관없이 한 번)
 *   - 요청 사이 최소 1.1초, 하나씩 차례로. 429/503 이면 이번 바퀴를 멈추고 전체를 쉬었다가(10분부터 두 배씩, 최대 2시간) 다시
 *   - 수업마다: 학사 일정의 수강신청 기간(첫 Phase 시작 ~ add 마감)이면 15분, 아니면 60분마다. 실패하면 그 수업만 간격 × 2^실패 (최대 6시간)
 *   - 그 학기 add 마감이 지나면 더 보지 않는다 (화면에는 "ended")
 * 알림 규칙 (detectSeatChange)
 *   - Closed → Open, 빈자리 0 → 생김, 거의 다 참(남은 자리 ≤ max(3, 정원 5%)으로 처음 내려감), 대기자 N명(기본 5) 이상 줄어듦
 *   - 같은 사람·같은 수업: 자리 생김(opened/seats)은 45분, 나머지는 3시간에 한 번까지
 *   - 첫 확인(이전 값 없음)에는 알리지 않는다. 우리는 대신 신청하지 않는다 — CalCentral 로 안내만
 */
import type { Notification, ID } from '@core/types';
import type { Patch } from '@core/api/types';
import type { AcademicDate } from '@core/lib/academic';
import { addDeadline, campusDate, enrollmentWindow } from '@core/lib/academic';
import { openSeats, seatSourceOk, type SeatSnapshot, type SeatWatchItem, type SeatWatchView } from '@core/lib/seats';

export interface SeatWatchDoc { id: string; userId: ID; schoolId: ID; courseId: ID; code: string; title: string; term: string; url: string; createdAt: string }
export interface SeatStatusDoc {
  id: string; url: string; schoolId: ID; term: string; code: string; title: string;
  latest?: SeatSnapshot;
  /** 원본을 마지막으로 읽은 시각 (성공) */
  checkedAt?: string;
  /** 좌석 수가 마지막으로 바뀐 시각 */
  changedAt?: string;
  /** 바뀔 때마다 한 줄 (최근 100개) */
  history: SeatSnapshot[];
  errors: number;
  lastError?: string;
  /** 실패 뒤 다음 시도 시각 */
  nextCheckAt?: string;
  /** 사용자별 마지막 알림 — 서버 안에서만 쓴다 (화면으로 내려보내지 않는다) */
  notified: Record<string, { at: string; kind: SeatEventKind }>;
}

export const WATCHES = 'seatWatches';
export const STATUS = 'seatStatus';
export const DATES = 'academicDates';

/** https://classes.berkeley.edu/content/2027-spring-compsci-61b-001-lec-001 → 2027-spring-compsci-61b-001-lec-001 */
export const pageSlug = (url: string) => url.replace(/\/+$/, '').split('/').pop()!.toLowerCase();
export const statusId = (url: string) => `seat_${pageSlug(url)}`;
export const watchId = (userId: ID, url: string) => `sw_${userId}_${pageSlug(url)}`;

// ─── 수업 페이지 읽기 ─────────────────────────────────────────────────────────
interface RawStatus { status?: { code?: string; description?: string }; enrolledCount?: number; waitlistedCount?: number; maxEnroll?: number; maxWaitlist?: number; openReserved?: number }
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);

/** 수업 페이지 HTML → 좌석 수 (+ 페이지가 말하는 학기). 못 읽으면 null */
export function parseSeatPage(html: string, at: string = new Date().toISOString()): { seats: SeatSnapshot; term?: string } | null {
  let raw: RawStatus | undefined; let term: string | undefined;
  const json = /<script[^>]*data-drupal-selector="drupal-settings-json"[^>]*>([\s\S]*?)<\/script>/.exec(html)?.[1];
  if (json) {
    try {
      const d = JSON.parse(json) as { ucb?: { enrollment?: { available?: { enrollmentStatus?: RawStatus }; history?: { enrollmentStatus?: RawStatus } }; termDetails?: { sessionDescription?: string } } };
      raw = d.ucb?.enrollment?.available?.enrollmentStatus ?? d.ucb?.enrollment?.history?.enrollmentStatus;
      term = d.ucb?.termDetails?.sessionDescription ?? undefined;
    } catch { /* 아래 정규식으로 */ }
  }
  if (!raw) {
    // 설정 JSON 모양이 바뀌어도 enrollmentStatus 객체만 찾으면 읽는다
    const m = /"enrollmentStatus":(\{"status":\{[^}]*\}[^{}]*)/.exec(html);
    if (m) { try { raw = JSON.parse(`${m[1].replace(/,$/, '')}}`) as RawStatus; } catch { /* */ } }
  }
  if (!raw?.status?.code || raw.maxEnroll == null) return null;
  return {
    seats: { code: String(raw.status.code).toUpperCase(), label: raw.status.description ?? '', enrolled: n(raw.enrolledCount), max: n(raw.maxEnroll), waitlisted: n(raw.waitlistedCount), maxWaitlist: n(raw.maxWaitlist), openReserved: n(raw.openReserved), at },
    term,
  };
}

export class SeatFetchError extends Error { constructor(public status: number, message: string) { super(message); } }

/** 공개 수업 페이지 한 장 (허용한 주소만). 캐시에 없는 페이지는 30초쯤 걸려서 90초까지 기다린다 */
export async function fetchSeatPage(url: string): Promise<string> {
  if (!seatSourceOk(url)) throw new SeatFetchError(400, 'not a public class page');
  let r: Response;
  try { r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; Lumi-campus-app; seat alerts for watched classes)' }, signal: AbortSignal.timeout(90_000) }); } catch (e) { throw new SeatFetchError(0, (e as Error).message); }
  if (!r.ok) throw new SeatFetchError(r.status, `class page → ${r.status}`);
  return r.text();
}

// ─── 변화 감지 · 알림 ──────────────────────────────────────────────────────────
export type SeatEventKind = 'opened' | 'seats' | 'nearly_full' | 'waitlist_drop';
const isOpen = (s: SeatSnapshot) => s.code === 'O' && openSeats(s) > 0;
/** 거의 다 참 — 남은 자리가 max(3, 정원의 5%) 이하 */
const nearlyFull = (s: SeatSnapshot) => isOpen(s) && openSeats(s) <= Math.max(3, Math.ceil(s.max * 0.05));
export const WAITLIST_DROP = () => Number(process.env.SEAT_WAITLIST_DROP ?? 5);

/** 이전 → 지금 사이에 알릴 만한 변화 (없으면 null). 이전 값이 없으면 알리지 않는다 */
export function detectSeatChange(prev: SeatSnapshot | undefined, next: SeatSnapshot, waitlistDrop = WAITLIST_DROP()): SeatEventKind | null {
  if (!prev) return null;
  if (!isOpen(prev) && isOpen(next)) return prev.code !== 'O' ? 'opened' : 'seats';
  if (nearlyFull(next) && !nearlyFull(prev) && isOpen(prev)) return 'nearly_full';
  if (!isOpen(next) && prev.waitlisted - next.waitlisted >= waitlistDrop) return 'waitlist_drop';
  return null;
}
const URGENT: SeatEventKind[] = ['opened', 'seats'];
/** 같은 사람·같은 수업에 다시 알려도 되는지 */
export function canNotify(last: { at: string; kind: SeatEventKind } | undefined, kind: SeatEventKind, now: number): boolean {
  if (!last) return true;
  const gapMin = URGENT.includes(kind) ? Number(process.env.SEAT_NOTIFY_GAP_URGENT_MIN ?? 45) : Number(process.env.SEAT_NOTIFY_GAP_MIN ?? 180);
  return now - Date.parse(last.at) >= gapMin * 60_000;
}
const plural = (k: number, w: string) => `${k} ${w}${k === 1 ? '' : 's'}`;
/** 알림 문구 — 우리가 신청해 준다고 말하지 않는다 */
export function seatMessage(kind: SeatEventKind, code: string, term: string, prev: SeatSnapshot | undefined, next: SeatSnapshot): { title: string; body: string } {
  const open = openSeats(next);
  const lag = 'Numbers come from the public class schedule and may lag.';
  switch (kind) {
    case 'opened': return { title: `${code} has ${plural(open, 'open seat')} — enroll on CalCentral`, body: `${term} · It was closed and just opened. Lumi can't enroll for you — go to CalCentral now. ${lag}` };
    case 'seats': return { title: `${code} has ${plural(open, 'open seat')} — enroll on CalCentral`, body: `${term} · Seats just opened up. Lumi can't enroll for you — go to CalCentral now. ${lag}` };
    case 'nearly_full': return { title: `${code} is almost full — ${plural(open, 'seat')} left`, body: `${term} · If you want it, enroll on CalCentral soon. ${lag}` };
    case 'waitlist_drop': return { title: `${code} waitlist moved: ${prev?.waitlisted ?? '?'} → ${next.waitlisted}`, body: `${term} · ${plural((prev?.waitlisted ?? 0) - next.waitlisted, 'person')} left the waitlist. Check your spot on CalCentral. ${lag}` };
  }
}

// ─── 폴링 간격 ────────────────────────────────────────────────────────────────
/** 이 학기 수업을 몇 분마다 볼지 — add 마감이 지났으면 null (그만 본다) */
export function pollIntervalMin(dates: AcademicDate[], schoolId: ID, term: string, today: string): number | null {
  const until = addDeadline(dates, schoolId, term);
  if (until && today > until) return null;
  const w = enrollmentWindow(dates, schoolId, term);
  const fast = Number(process.env.SEAT_POLL_FAST_MIN ?? 15); const slow = Number(process.env.SEAT_POLL_SLOW_MIN ?? 60);
  return w && today >= w.start && today <= w.end ? fast : slow;
}
/** 이 학교에서 지금 걸 수 있는 학기 — 카탈로그에 있는 학기 중 add 마감 전 */
export const watchableTerms = (dates: AcademicDate[], schoolId: ID, terms: string[], today: string) => terms.filter((t) => pollIntervalMin(dates, schoolId, t, today) !== null);

// ─── 한 바퀴 (워커) ────────────────────────────────────────────────────────────
export interface SeatStore {
  listDocs<T extends { id: string }>(collection: string): Promise<T[]>;
  putDocs(collection: string, items: { id: string }[]): Promise<void>;
  applyPatch(patch: Patch): Promise<void>;
}
export interface PollOptions {
  now?: () => Date;
  force?: boolean;
  dry?: boolean;
  fetchPage?: (url: string) => Promise<string>;
  sleep?: (ms: number) => Promise<void>;
  /** 요청 사이 간격 (ms, 기본 1100) */
  spacingMs?: number;
}
export interface PollSummary { watches: number; classes: number; ended: number; due: number; fetched: number; changed: number; errors: number; notified: number; throttled?: number }

export function makeStatus(w: Pick<SeatWatchDoc, 'url' | 'schoolId' | 'term' | 'code' | 'title'>): SeatStatusDoc {
  return { id: statusId(w.url), url: w.url, schoolId: w.schoolId, term: w.term, code: w.code, title: w.title, history: [], errors: 0, notified: {} };
}
/** 새로 읽은 값을 상태에 반영 — 바뀌었으면 history 에 한 줄 */
export function applySnapshot(st: SeatStatusDoc, seats: SeatSnapshot): { prev?: SeatSnapshot; changed: boolean } {
  const prev = st.latest;
  const same = !!prev && prev.code === seats.code && prev.enrolled === seats.enrolled && prev.max === seats.max && prev.waitlisted === seats.waitlisted && prev.maxWaitlist === seats.maxWaitlist && prev.openReserved === seats.openReserved;
  st.latest = seats; st.checkedAt = seats.at; st.errors = 0; st.lastError = undefined; st.nextCheckAt = undefined;
  if (!same) { st.changedAt = seats.at; st.history = [...(st.history ?? []), seats].slice(-100); }
  return { prev, changed: !same };
}

export async function pollSeats(store: SeatStore, opts: PollOptions = {}): Promise<PollSummary> {
  const now = opts.now ?? (() => new Date());
  const fetchPage = opts.fetchPage ?? fetchSeatPage;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const spacing = opts.spacingMs ?? 1100;
  const [watches, dates, statuses] = await Promise.all([store.listDocs<SeatWatchDoc>(WATCHES), store.listDocs<AcademicDate>(DATES), store.listDocs<SeatStatusDoc>(STATUS)]);
  const byStatus = new Map(statuses.map((s) => [s.id, s]));
  const groups = new Map<string, SeatWatchDoc[]>();
  for (const w of watches) if (seatSourceOk(w.url)) (groups.get(statusId(w.url)) ?? groups.set(statusId(w.url), []).get(statusId(w.url))!).push(w);
  const today = campusDate(now());
  const sum: PollSummary = { watches: watches.length, classes: groups.size, ended: 0, due: 0, fetched: 0, changed: 0, errors: 0, notified: 0 };
  const dueList: { st: SeatStatusDoc; watchers: SeatWatchDoc[]; interval: number }[] = [];
  for (const [id, ws] of groups) {
    const interval = pollIntervalMin(dates, ws[0].schoolId, ws[0].term, today);
    if (interval === null) { sum.ended++; continue; }
    const st = byStatus.get(id) ?? makeStatus(ws[0]);
    const t = now().getTime();
    const waitUntil = st.nextCheckAt ? Date.parse(st.nextCheckAt) : st.checkedAt ? Date.parse(st.checkedAt) + interval * 60_000 - 30_000 : 0;
    if (opts.force || t >= waitUntil) dueList.push({ st, watchers: ws, interval });
  }
  // 오래 안 본 것부터
  dueList.sort((a, b) => (a.st.checkedAt ?? '').localeCompare(b.st.checkedAt ?? ''));
  sum.due = dueList.length;
  const notes: Notification[] = []; const touched: SeatStatusDoc[] = [];
  for (let i = 0; i < dueList.length; i++) {
    const { st, watchers, interval } = dueList[i];
    if (i > 0) await sleep(spacing);
    const at = now().toISOString();
    try {
      const html = await fetchPage(st.url);
      const parsed = parseSeatPage(html, at);
      if (!parsed) throw new SeatFetchError(422, 'seat numbers not found on the class page');
      sum.fetched++;
      const { prev, changed } = applySnapshot(st, parsed.seats);
      if (changed) sum.changed++;
      const kind = detectSeatChange(prev, parsed.seats);
      if (kind) {
        for (const w of watchers) {
          if (!canNotify(st.notified[w.userId], kind, now().getTime())) continue;
          const msg = seatMessage(kind, w.code, w.term, prev, parsed.seats);
          notes.push({ id: `n_seat_${pageSlug(st.url)}_${w.userId}_${now().getTime()}`, userId: w.userId, type: 'seat_alert', title: msg.title, body: msg.body, link: '/seats', read: false, createdAt: at });
          st.notified[w.userId] = { at, kind };
        }
      }
      touched.push(st);
    } catch (e) {
      const status = e instanceof SeatFetchError ? e.status : 0;
      st.errors = (st.errors ?? 0) + 1; st.lastError = (e as Error).message.slice(0, 200);
      st.nextCheckAt = new Date(now().getTime() + Math.min(interval * 2 ** st.errors, 360) * 60_000).toISOString();
      sum.errors++; touched.push(st);
      // 서버가 그만 하라고 하면(429/503) 이번 바퀴는 여기서 멈춘다
      if (status === 429 || status === 503) { sum.throttled = status; break; }
    }
  }
  sum.notified = notes.length;
  if (!opts.dry) {
    if (touched.length) await store.putDocs(STATUS, touched);
    if (notes.length) await store.applyPatch({ notifications: notes });
  }
  return sum;
}

/**
 * 워커 안에서 계속 도는 좌석 루프 — 1분마다 할 일이 있는지 보고, 있으면 pollSeats.
 * 429/503 을 받으면 10분부터 두 배씩(최대 2시간) 전체를 쉰다. 기록은 6시간마다 한 줄 + 오류·알림이 있을 때만 (agent_runs 를 덮지 않게).
 */
export async function seatWatchLoop(store: SeatStore, opts: { dry?: boolean; force?: () => boolean; record: (status: 'applied' | 'error', summary: Record<string, unknown>) => Promise<unknown> }) {
  let pauseUntil = 0; let pauseMin = 0; let lastRecord = 0;
  for (;;) {
    const force = opts.force?.() ?? false;
    if (force || Date.now() >= pauseUntil) {
      try {
        const s = await pollSeats(store, { dry: opts.dry, force });
        if (s.throttled) { pauseMin = Math.min(pauseMin ? pauseMin * 2 : 10, 120); pauseUntil = Date.now() + pauseMin * 60_000; } else pauseMin = 0;
        if (s.due && (force || s.errors || s.notified || Date.now() - lastRecord > 6 * 3_600_000)) {
          lastRecord = Date.now();
          await opts.record(s.errors && !s.fetched ? 'error' : 'applied', { ...s, pausedMin: pauseMin || undefined });
        }
      } catch (e) {
        console.error('[seats] poll failed', e);
      }
    }
    await new Promise((r) => setTimeout(r, 60_000));
  }
}

// ─── 화면용 ──────────────────────────────────────────────────────────────────
/** 내 관심 수업 목록 (다른 사람 정보·알림 기록은 빼고) */
export function seatView(userId: ID, schoolId: ID, watches: SeatWatchDoc[], statuses: Map<string, SeatStatusDoc>, dates: AcademicDate[], terms: string[], today: string): SeatWatchView {
  const items: SeatWatchItem[] = watches.filter((w) => w.userId === userId).map((w) => {
    const st = statuses.get(statusId(w.url));
    const until = addDeadline(dates, w.schoolId, w.term) || undefined;
    return {
      id: w.id, courseId: w.courseId, code: w.code, title: w.title, term: w.term, url: w.url, createdAt: w.createdAt,
      ended: pollIntervalMin(dates, w.schoolId, w.term, today) === null, until,
      latest: st?.latest, checkedAt: st?.checkedAt, error: st?.errors ? 'Couldn’t reach the class schedule — retrying' : undefined,
    };
  }).sort((a, b) => Number(a.ended) - Number(b.ended) || b.createdAt.localeCompare(a.createdAt));
  return { watches: items, watchableTerms: watchableTerms(dates, schoolId, terms, today), supported: schoolId === 's_berkeley' };
}
