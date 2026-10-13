/**
 * 체육관 혼잡도 (Gym crowd) — 서버(server/gym.ts)와 화면이 같이 쓰는 모양과 순수 함수.
 * 숫자는 공식 크라우드 미터에서 읽은 것만. 최근에 못 읽었으면 'unavailable' — 지난 숫자를 지금 것처럼 보이지 않는다.
 */
import { addDaysISO, toMin, type CampusClock } from './campusclock';

/** 하루치 기록 한 문서 (공간 × 캠퍼스 날짜). samples = [unix 초, 인원] */
export interface GymDayDoc {
  id: string;
  schoolId: string;
  displayId: string;
  name: string;
  date: string;
  capacity: number;
  samples: [number, number][];
}

export interface GymHourBar { hour: number; percent: number | null; usual: number | null }
export interface GymSpaceView {
  id: string;
  name: string;
  capacity: number;
  status: 'live' | 'unavailable';
  /** live 일 때만 */
  count?: number;
  percent?: number;
  /** 마지막으로 읽은 시각 (live 가 아니면 그 시각만 알려 준다) */
  updatedAt?: string;
  /** 오늘 시간대별 평균 % + 같은 요일 평소 % (기록이 7일 이상일 때) */
  today: GymHourBar[];
  usualNow: number | null;
  /** 기록이 있는 날 수 — 7일이 되면 '평소' 선을 그린다 */
  historyDays: number;
}

export interface GymAlert {
  id: string;
  userId: string;
  schoolId: string;
  displayId: string;
  /** 이 % 미만이 되면 */
  below: number;
  /** 0 = 일요일 */
  days: number[];
  /** "HH:MM" 캠퍼스 시간, start < end */
  start: string;
  end: string;
  enabled: boolean;
  createdAt: string;
  lastFiredAt?: string;
  lastFiredDate?: string;
}

export const GYM_ATTRIBUTION = 'Live count from the RSF crowd meter (RecWell)';
/** 이보다 오래된 읽기는 지금 숫자로 보이지 않는다 (5분 폴링 × 2 + 여유) */
export const GYM_FRESH_MIN = 15;
/** '평소' 선을 그리기 시작하는 기록 일수 */
export const GYM_USUAL_MIN_DAYS = 7;
export const GYM_FIRST_HOUR = 6;
export const GYM_LAST_HOUR = 23;

export const percentOf = (count: number, capacity: number) => (capacity > 0 ? Math.max(0, Math.round((count / capacity) * 100)) : 0);
export const isFresh = (updatedAtMs: number | undefined, nowMs: number, maxAgeMin = GYM_FRESH_MIN) => updatedAtMs != null && nowMs - updatedAtMs <= maxAgeMin * 60_000 && updatedAtMs <= nowMs + 60_000;

export type CrowdLevel = 'quiet' | 'moderate' | 'busy' | 'packed';
export const crowdLevel = (p: number): CrowdLevel => (p < 35 ? 'quiet' : p < 65 ? 'moderate' : p < 90 ? 'busy' : 'packed');
export const CROWD_LABELS: Record<CrowdLevel, string> = { quiet: 'Quiet', moderate: 'Moderate', busy: 'Busy', packed: 'Packed' };

/** unix 초 → 캠퍼스 시(0–23) — 시간대 계산은 호출하는 쪽이 넘긴 함수로 (테스트에서 고정) */
export type HourOf = (unixSec: number) => number;
export const campusHourOf = (tz = 'America/Los_Angeles'): HourOf => {
  const f = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hourCycle: 'h23' });
  return (s) => Number(f.format(new Date(s * 1000))) % 24;
};

/** 하루 기록 → 시간대별 평균 % */
export function hourlyPercents(doc: Pick<GymDayDoc, 'samples' | 'capacity'>, hourOf: HourOf): Map<number, number> {
  const sum = new Map<number, { s: number; n: number }>();
  for (const [t, c] of doc.samples) { const h = hourOf(t); const x = sum.get(h) ?? { s: 0, n: 0 }; x.s += percentOf(c, doc.capacity); x.n++; sum.set(h, x); }
  return new Map([...sum].map(([h, x]) => [h, Math.round(x.s / x.n)]));
}

const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

/** 같은 요일 지난 기록들의 시간대별 평균 (오늘 제외). 기록이 GYM_USUAL_MIN_DAYS 일 미만이면 전부 null */
export function usualByHour(history: GymDayDoc[], date: string, hourOf: HourOf): Map<number, number> {
  const days = new Set(history.filter((d) => d.date < date && d.samples.length).map((d) => d.date));
  if (days.size < GYM_USUAL_MIN_DAYS) return new Map();
  const wd = weekdayOf(date);
  const acc = new Map<number, { s: number; n: number }>();
  for (const d of history) {
    if (d.date >= date || weekdayOf(d.date) !== wd) continue;
    for (const [h, p] of hourlyPercents(d, hourOf)) { const x = acc.get(h) ?? { s: 0, n: 0 }; x.s += p; x.n++; acc.set(h, x); }
  }
  return new Map([...acc].map(([h, x]) => [h, Math.round(x.s / x.n)]));
}

/** 화면 한 칸 — 마지막 읽기·기록으로 */
export function gymView(input: { displayId: string; name: string; capacity: number; last?: { at: number; count: number }; history: GymDayDoc[]; clock: CampusClock; nowMs: number; hourOf: HourOf }): GymSpaceView {
  const { displayId, name, capacity, last, history, clock, nowMs, hourOf } = input;
  const todayDoc = history.find((d) => d.date === clock.date);
  const hours = todayDoc ? hourlyPercents(todayDoc, hourOf) : new Map<number, number>();
  const usual = usualByHour(history, clock.date, hourOf);
  const today: GymHourBar[] = [];
  // 보통 6시부터 — 그보다 이른 기록이 있으면 그 시부터
  const first = Math.min(GYM_FIRST_HOUR, ...[...hours.keys()]);
  for (let h = first; h <= GYM_LAST_HOUR; h++) today.push({ hour: h, percent: hours.get(h) ?? null, usual: usual.get(h) ?? null });
  const live = !!last && isFresh(last.at, nowMs);
  const historyDays = new Set(history.filter((d) => d.samples.length).map((d) => d.date)).size;
  return {
    id: displayId, name, capacity,
    status: live ? 'live' : 'unavailable',
    ...(live ? { count: last!.count, percent: percentOf(last!.count, capacity) } : {}),
    updatedAt: last ? new Date(last.at).toISOString() : undefined,
    today, usualNow: usual.get(Math.floor(clock.min / 60)) ?? null, historyDays,
  };
}

/** 오래된 기록 정리 기준 (기본 8주) */
export const gymKeepFrom = (today: string, weeks = 8) => addDaysISO(today, -weeks * 7);

// ─── 알림 ─────────────────────────────────────────────────────────────────────
export const MAX_GYM_ALERTS = 6;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** 사용자가 보낸 알림 설정 → 정리된 값 또는 이유 */
export function normalizeAlert(input: { below?: unknown; days?: unknown; start?: unknown; end?: unknown; enabled?: unknown }): { below: number; days: number[]; start: string; end: string; enabled: boolean } | { error: string } {
  const below = Math.round(Number(input.below));
  if (!Number.isFinite(below) || below < 5 || below > 95) return { error: 'Pick a level between 5% and 95%.' };
  const days = Array.isArray(input.days) ? [...new Set(input.days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort() : [];
  if (!days.length) return { error: 'Pick at least one day.' };
  const start = String(input.start ?? ''); const end = String(input.end ?? '');
  if (!HHMM.test(start) || !(HHMM.test(end) || end === '24:00')) return { error: 'Pick a start and end time.' };
  if (toMin(end) - toMin(start) < 30) return { error: 'The time window needs to be at least 30 minutes.' };
  return { below, days, start, end, enabled: input.enabled !== false };
}

/** 지금 알려야 하나 — 살아 있는 숫자, 고른 요일·시간 안, 기준 미만, 그 알림은 하루 한 번까지 */
export function alertDue(a: GymAlert, clock: CampusClock, view: Pick<GymSpaceView, 'status' | 'percent'>): boolean {
  if (!a.enabled || view.status !== 'live' || view.percent == null) return false;
  if (!a.days.includes(clock.weekday)) return false;
  if (clock.min < toMin(a.start) || clock.min >= toMin(a.end)) return false;
  if (a.lastFiredDate === clock.date) return false;
  return view.percent < a.below;
}

export const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
