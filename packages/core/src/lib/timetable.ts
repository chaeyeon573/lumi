import type { Course, User } from '@core/types';
import type { CatalogCourse } from '@core/api/types';
import { uid } from './format';
import { t } from '@core/i18n';
import { AVAILABILITY_LABELS } from './labels';

export const DAY_LABELS = [t('월'), t('화'), t('수'), t('목'), t('금'), t('토'), t('일')];
export const GRID_START = 9;   // 09:00
export const GRID_END = 21;    // 21:00

export const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
/** JS getDay(0=일) → 우리 요일(0=월) */
export const jsDayToIdx = (d: number) => (d + 6) % 7;
export const todayIdx = () => jsDayToIdx(new Date().getDay());
export const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

export interface Block { start: number; end: number }

export function coursesOn(courses: Course[], day: number) {
  return courses.filter((c) => c.day === day).sort((a, b) => toMin(a.start) - toMin(b.start));
}

/** 하루의 공강 블록 (수업 사이 + 마지막 수업 이후, 09:00~21:00 기준) */
export function freeBlocks(courses: Course[], day: number, from = GRID_START * 60, to = GRID_END * 60): Block[] {
  const busy = coursesOn(courses, day).map((c) => ({ start: toMin(c.start), end: toMin(c.end) }));
  const out: Block[] = [];
  let cursor = from;
  for (const b of busy) {
    if (b.start > cursor) out.push({ start: cursor, end: Math.min(b.start, to) });
    cursor = Math.max(cursor, b.end);
  }
  if (cursor < to) out.push({ start: cursor, end: to });
  return out.filter((b) => b.end - b.start >= 30);
}

export function overlapBlocks(a: Block[], b: Block[], minLen = 60): Block[] {
  const out: Block[] = [];
  for (const x of a) for (const y of b) {
    const s = Math.max(x.start, y.start), e = Math.min(x.end, y.end);
    if (e - s >= minLen) out.push({ start: s, end: e });
  }
  return out;
}

export type NowStatus =
  | { kind: 'in_class'; course: Course; until: number }
  | { kind: 'free'; until: number | null; next?: Course }
  | { kind: 'done' }
  | { kind: 'none' };

/** 지금 이 순간 상태 */
export function statusNow(courses: Course[], day = todayIdx(), min = nowMin()): NowStatus {
  if (courses.length === 0) return { kind: 'none' };
  const today = coursesOn(courses, day);
  const cur = today.find((c) => toMin(c.start) <= min && min < toMin(c.end));
  if (cur) return { kind: 'in_class', course: cur, until: toMin(cur.end) };
  const next = today.find((c) => toMin(c.start) > min);
  if (next) return { kind: 'free', until: toMin(next.start), next };
  if (today.length > 0) return { kind: 'done' };
  return { kind: 'free', until: null };
}

export function statusLabel(s: NowStatus): string {
  switch (s.kind) {
    case 'in_class': return `${t('수업 중 · ')}${toHHMM(s.until)}${t('까지')}`;
    case 'free': return s.until ? `${t('공강 · ')}${toHHMM(s.until)}${t('까지')}` : t('오늘 수업 없음');
    case 'done': return t('오늘 수업 끝');
    case 'none': return '';
  }
}

/** 카드·프로필에 보여줄 활동 가능 시간. 시간표가 있으면 자동 계산, 없으면 수동 설정 */
export function availabilityText(u: Pick<User, 'timetable' | 'availability'>, canSeeTimetable: boolean): { text: string; auto: boolean } {
  if (canSeeTimetable && u.timetable.length > 0) {
    const s = statusNow(u.timetable);
    if (s.kind !== 'none') return { text: statusLabel(s), auto: true };
  }
  return { text: AVAILABILITY_LABELS[u.availability], auto: false };
}

export function fmtBlock(b: Block) { return `${toHHMM(b.start)}–${toHHMM(b.end)}`; }
export function fmtHours(b: Block) { const h = (b.end - b.start) / 60; return h % 1 === 0 ? `${h}${t('시간')}` : `${h.toFixed(1)}${t('시간')}`; }

// ─── 학교 수업 목록 → 내 시간표 ─────────────────────────────────────────────
/** 시간표 블록 색 */
export const COURSE_HUES = [220, 160, 15, 280, 45, 330, 120, 200, 60, 300];
/** 시간표에 들어가는 수업 이름 — 같은 과목을 두 번 넣었는지도 이 이름으로 본다 */
export const catalogCourseName = (c: Pick<CatalogCourse, 'code' | 'title'>) => `${c.code} ${c.title}`.slice(0, 60);
/** 수업 목록의 한 과목을 요일별 시간표 줄로 펼친다 (시간표 화면의 "수업 목록에서 찾기"와 같은 규칙) */
export function coursesFromCatalog(c: CatalogCourse, hue = COURSE_HUES[0]): Course[] {
  const name = catalogCourseName(c);
  return c.meetings.map((m) => ({ id: uid('c'), name, day: m.day, start: m.start, end: m.end, room: c.location, professor: c.instructor, url: c.url, syllabusUrl: c.syllabusUrl, hue }));
}
export const hasCatalogCourse = (timetable: Course[], c: Pick<CatalogCourse, 'code' | 'title'>) => timetable.some((x) => x.name === catalogCourseName(c));
/** 이미 있는 수업과 겹치는 시간 (추가 전에 알려 주기용) */
export function clashesWith(timetable: Course[], c: Pick<CatalogCourse, 'meetings'>): Course[] {
  return timetable.filter((x) => c.meetings.some((m) => m.day === x.day && toMin(m.start) < toMin(x.end) && toMin(x.start) < toMin(m.end)));
}
