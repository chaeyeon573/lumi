/**
 * 학사 일정 (Academic calendar) — 수강신청 단계·추가/취소 마감·휴일·기말고사.
 *
 * 공고(opportunities)와 따로 둔다 — Browse·For you 를 어지럽히지 않게. 워커가 학교 공식 캘린더(ICS)에서 매일 가져오고
 * (server/sources/academic-calendar.ts), 화면은 Me 의 Key dates 카드와 /academic-calendar 목록에서, Lumi 는
 * search_academic_calendar 도구로 같은 데이터를 본다.
 *
 * 날짜는 캠퍼스 달력 날짜(YYYY-MM-DD, 태평양 시간)다. end 는 마지막 날을 포함한다.
 */
import type { ID } from '@core/types';

export type AcademicDateKind = 'enrollment' | 'deadline' | 'holiday' | 'finals' | 'instruction' | 'other';

export interface AcademicDate {
  /** acd_<school>_<start>_<slug> */
  id: string;
  schoolId: ID;
  /** 화면에 그대로 쓰는 제목 — "Spring 2027 · Phase 1 enrollment begins (continuing students)" */
  title: string;
  /** 학기 없이 — "Phase 1 enrollment begins (continuing students)" */
  label: string;
  /** "Spring 2027" (모르면 '') */
  term: string;
  start: string;
  /** 마지막 날 (포함). 하루짜리면 start 와 같다 */
  end: string;
  /** 시간이 있는 일정만 (HH:MM, 캠퍼스 시간) */
  time?: string;
  kind: AcademicDateKind;
  /** 1 = Key dates 카드 후보 · 2 = 알아 두면 좋은 날 · 3 = 사소한 날 */
  priority: 1 | 2 | 3;
  /** 원본 (registrar 캘린더 · 학사 일정 PDF) */
  source: string;
  /** 원본 제목 (그대로) */
  raw?: string;
}

export const CAMPUS_TZ = 'America/Los_Angeles';

/** 캠퍼스(태평양) 기준 오늘 YYYY-MM-DD */
export function campusDate(now: Date = new Date(), tz = CAMPUS_TZ): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

const dayMs = 86_400_000;
const utcNoon = (d: string) => Date.parse(`${d}T12:00:00Z`);
/** to - from (일) */
export const daysBetween = (from: string, to: string) => Math.round((utcNoon(to) - utcNoon(from)) / dayMs);
export const addDays = (d: string, n: number) => new Date(utcNoon(d) + n * dayMs).toISOString().slice(0, 10);

/** "D-13" · "Today" · "Now" (기간 중) · "Ended" */
export function dDay(x: Pick<AcademicDate, 'start' | 'end'>, today: string): string {
  const n = daysBetween(today, x.start);
  if (n > 0) return `D-${n}`;
  if (n === 0) return 'Today';
  return x.end >= today ? 'Now' : 'Ended';
}

/** "Mon, Oct 26" · 기간이면 "Mon, Dec 14 – Fri, Dec 18" */
export function formatAcademicDate(x: Pick<AcademicDate, 'start' | 'end' | 'time'>, opts: { year?: boolean } = {}): string {
  const f = (d: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'short', month: 'short', day: 'numeric', ...(opts.year ? { year: 'numeric' } : {}) }).format(new Date(utcNoon(d)));
  const base = x.end && x.end !== x.start ? `${f(x.start)} – ${f(x.end)}` : f(x.start);
  return x.time ? `${base}, ${x.time}` : base;
}

/** 아직 끝나지 않은 일정 (진행 중 포함), 날짜순 */
export function upcomingDates(list: AcademicDate[], today: string, schoolId?: ID): AcademicDate[] {
  return list
    .filter((x) => (!schoolId || x.schoolId === schoolId) && x.end >= today)
    .sort((a, b) => a.start.localeCompare(b.start) || a.priority - b.priority || a.title.localeCompare(b.title));
}

/**
 * Key dates 카드 — 다가오는 중요한 날 n 개. 한 종류가 자리를 다 차지하지 않게
 * 다음 수강신청 단계 · 다음 학생 마감 · 다음 기말고사를 먼저 하나씩 고르고, 남는 자리는 날짜순으로 채운다.
 * 이미 시작한 기간(기말고사 주간 등)은 진행 중이면 넣는다.
 */
export function keyDates(list: AcademicDate[], today: string, n = 3, schoolId?: ID): AcademicDate[] {
  const up = upcomingDates(list, today, schoolId).filter((x) => x.priority === 1);
  const picked: AcademicDate[] = [];
  for (const kind of ['enrollment', 'deadline', 'finals'] as AcademicDateKind[]) {
    const x = up.find((d) => d.kind === kind && !picked.includes(d));
    if (x && picked.length < n) picked.push(x);
  }
  for (const x of up) { if (picked.length >= n) break; if (!picked.includes(x)) picked.push(x); }
  return picked.sort((a, b) => a.start.localeCompare(b.start));
}

/** 이 학기에 수업을 더할 수 있는 마지막 날 (학생용 add 마감 중 가장 늦은 날). 일정이 없으면 학기 시작 + 6주 정도로 어림 */
export function addDeadline(list: AcademicDate[], schoolId: ID, term: string): string {
  const mine = list.filter((x) => x.schoolId === schoolId && x.term === term && x.kind === 'deadline' && /\badd\b/i.test(x.label));
  if (mine.length) return mine.map((x) => x.end).sort().at(-1)!;
  const m = /^(Spring|Summer|Fall|Winter) (\d{4})$/.exec(term);
  if (!m) return '';
  const y = Number(m[2]);
  return ({ Winter: `${y}-01-31`, Spring: `${y}-02-28`, Summer: `${y}-07-15`, Fall: `${y}-09-30` } as Record<string, string>)[m[1]];
}

/**
 * 수강신청 기간 — 그 학기 첫 'Phase … begins' 부터 add 마감까지. 이 안에서는 좌석을 더 자주(15분) 본다.
 * 일정이 없으면 null.
 */
export function enrollmentWindow(list: AcademicDate[], schoolId: ID, term: string): { start: string; end: string } | null {
  const begins = list.filter((x) => x.schoolId === schoolId && x.term === term && x.kind === 'enrollment' && /^phase \d.*begins/i.test(x.label)).map((x) => x.start).sort();
  const end = addDeadline(list, schoolId, term);
  return begins.length && end ? { start: begins[0], end } : null;
}

export const KIND_LABELS: Record<AcademicDateKind, string> = {
  enrollment: 'Enrollment', deadline: 'Deadline', holiday: 'Holiday', finals: 'Finals', instruction: 'Classes', other: 'Other',
};
