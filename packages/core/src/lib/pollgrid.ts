/**
 * 한 주 격자 시간 투표 (Harness A S032 Create a meeting · S034 Find a Time · S036 Time poll).
 *
 * 주최자가 "어느 주"와 "얼마나 길게"만 고르면 그 주 월~금 9시~18시를 한 시간 간격 칸으로 나눠 후보를 만든다.
 * 각자 되는 칸을 고르고(투표), 주최자가 표를 보고 확정한다. 시간표를 모아 자동으로 고르지 않는다 (docs/PRODUCT_TASTE.md) —
 * "Best match" 는 사람들이 직접 고른 표에서만 나온다.
 * 장소 후보(S033)도 같은 방식: 주최자가 아이디어를 몇 개 올리고, 각자 괜찮은 곳에 표를 준다.
 */
import type { ID, TimeOption, TimePoll } from '@core/types';

export const POLL_GRID = { fromHour: 9, toHour: 18, days: 5 } as const;
/** 30분 모임이라도 칸은 한 시간마다 — 5일 × 9칸 = 45. 서버는 이보다 많으면 받지 않는다 */
export const POLL_MAX_GRID_OPTIONS = 120;
export const POLL_DURATIONS = [30, 60, 90, 120] as const;
export const POLL_MAX_PLACES = 6;

const pad = (n: number) => String(n).padStart(2, '0');
const hhmm = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`;
/** 'YYYY-MM-DD' 에 n 일 (UTC 정오 기준이라 서머타임에 흔들리지 않는다) */
export const addDaysTo = (iso: string, n: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
/** 그 날이 속한 주의 월요일 */
export function mondayOf(iso: string): string {
  const dow = new Date(`${iso}T12:00:00Z`).getUTCDay(); // 0=일
  return addDaysTo(iso, dow === 0 ? -6 : 1 - dow);
}

/** 장소 후보 이름 정리 — 앞뒤 공백, 60자, 같은 이름(대소문자 무시) 하나, 최대 6개 */
export function pollPlaceNames(names: unknown): string[] {
  if (!Array.isArray(names)) return [];
  const out: string[] = [];
  for (const n of names) {
    const s = String(n ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (s && !out.some((x) => x.toLowerCase() === s.toLowerCase())) out.push(s);
    if (out.length >= POLL_MAX_PLACES) break;
  }
  return out;
}

/**
 * 그 주의 후보 칸 — 월~금, 9시부터 한 시간마다 시작, 18시 전에 끝나는 것만.
 * nowLocal ('YYYY-MM-DDTHH:MM', 캠퍼스 시각) 이전에 시작하는 칸은 뺀다 (이번 주를 고르면 지난 시간은 묻지 않는다).
 */
export function weekGridOptions(weekStart: string, minutes: number, nowLocal = ''): Omit<TimeOption, 'id'>[] {
  const out: Omit<TimeOption, 'id'>[] = [];
  for (let d = 0; d < POLL_GRID.days; d++) {
    const date = addDaysTo(weekStart, d);
    for (let h = POLL_GRID.fromHour; h * 60 + minutes <= POLL_GRID.toHour * 60; h++) {
      const start = hhmm(h * 60);
      if (nowLocal && `${date}T${start}` < nowLocal) continue;
      out.push({ date, startTime: start, endTime: hhmm(h * 60 + minutes) });
    }
  }
  return out;
}

/** 칸 하나 = (요일 0~4, 시작 시) */
export const optionCell = (weekStart: string, o: Pick<TimeOption, 'date' | 'startTime'>) => ({
  day: Math.round((Date.parse(`${o.date}T12:00:00Z`) - Date.parse(`${weekStart}T12:00:00Z`)) / 86_400_000),
  hour: Number(o.startTime.slice(0, 2)),
});

export interface PlaceTally { place: { id: ID; name: string }; voterIds: ID[]; count: number }
/** 장소별 표 — 많은 순, 같으면 주최자가 적은 순서 */
export function placeTally(poll: Pick<TimePoll, 'placeOptions' | 'placeVotes'>): { rows: PlaceTally[]; best?: PlaceTally } {
  const rows = (poll.placeOptions ?? []).map((place) => {
    const voterIds = Object.entries(poll.placeVotes ?? {}).filter(([, ids]) => ids.includes(place.id)).map(([u]) => u);
    return { place, voterIds, count: voterIds.length };
  });
  const best = [...rows].sort((a, b) => b.count - a.count)[0];
  return { rows, best: best && best.count > 0 ? best : rows.length === 1 ? rows[0] : undefined };
}

/** 표를 낸 사람 수 (빈 표는 안 낸 것) */
export const votersOf = (poll: Pick<TimePoll, 'votes'>) => Object.values(poll.votes).filter((ids) => ids.length > 0).length;
