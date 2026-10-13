/** 캠퍼스(태평양) 시각 — 식당 영업시간·체육관 알림 창은 전부 캠퍼스 시간으로 본다 */
export const CAMPUS_TZ = 'America/Los_Angeles';

export interface CampusClock {
  /** YYYY-MM-DD */
  date: string;
  /** 자정부터 분 */
  min: number;
  /** 0 = 일요일 */
  weekday: number;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function campusClock(now: Date = new Date(), tz = CAMPUS_TZ): CampusClock {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', weekday: 'short' }).formatToParts(now).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, min: (Number(parts.hour) % 24) * 60 + Number(parts.minute), weekday: WEEKDAYS.indexOf(parts.weekday) };
}

export const addDaysISO = (date: string, n: number) => new Date(Date.parse(`${date}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
export const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + (m || 0); };
export const toHHMM = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
/** "16:30" → "4:30 PM" · "11:00" → "11 AM" */
export function fmtClock(hhmm: string): string {
  const m = toMin(hhmm); const h = Math.floor(m / 60) % 24; const mm = m % 60;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${mm ? `:${String(mm).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
}
export const fmtRange = (r: { start: string; end: string }) => `${fmtClock(r.start)}–${fmtClock(r.end)}`;
