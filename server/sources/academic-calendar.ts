/**
 * 학사 일정 수집 — 학교 registrar 가 공개한 캘린더(ICS)를 읽어 AcademicDate 로 바꾼다.
 *
 *   schools.csv 의 academic_calendar 열:  ics:<공개 ICS 주소>
 *     UC Berkeley = Student Enrollment Calendar (Google Calendar 공개 ICS, registrar.berkeley.edu/calendars/enrollment-calendar)
 *   server/data/academic-calendar-<short>.csv (있으면): 공식 학사 일정 PDF 에서 옮긴, ICS 에 없는 날 (휴일·졸업식·여름 학기)
 *
 * ICS 는 직접 파싱한다 (RFC 5545 중 필요한 만큼): 접힌 줄(CRLF + 공백) 펴기, 하루 종일 일정(DTSTART;VALUE=DATE, DTEND 는 다음 날 = 제외),
 * TZID 붙은 시각 · UTC(Z) 시각 → 캠퍼스(태평양) 날짜·시각, 텍스트 이스케이프(\, \; \n \\).
 * 주간 "Week N" 채움 일정과 학과 담당자용 마감은 버린다. 반복 일정(RRULE)은 첫 회만 쓴다 (registrar 캘린더는 쓰지 않는다).
 */
import { readFileSync, existsSync } from 'node:fs';
import type { AcademicDate, AcademicDateKind } from '@core/lib/academic';
import { CAMPUS_TZ, addDays, campusDate } from '@core/lib/academic';
import { parseCSV } from '../scripts/csv';

export interface IcsEvent {
  uid: string;
  summary: string;
  /** 캠퍼스 날짜 YYYY-MM-DD */
  start: string;
  /** 마지막 날 (포함) */
  end: string;
  /** 시각이 있는 일정이면 캠퍼스 시각 HH:MM */
  time?: string;
  allDay: boolean;
  status?: string;
  rrule?: string;
}

/** 접힌 줄 펴기 — 줄 끝(CRLF/LF) 다음에 공백·탭으로 시작하는 줄은 앞 줄에 이어 붙인다 */
export function unfoldIcs(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

export const unescapeIcsText = (s: string) => s.replace(/\\([\\,;nN])/g, (_m, c: string) => (c === 'n' || c === 'N' ? '\n' : c));

/** 이 시각(UTC ms)에 tz 의 벽시계가 UTC 보다 얼마나 앞서는지 (ms) */
function tzOffset(t: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(t));
  const g = (k: string) => Number(parts.find((p) => p.type === k)?.value);
  return Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - Math.floor(t / 1000) * 1000;
}
/** tz 의 벽시계 시각 → UTC ms */
export function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, tz: string): number {
  const wall = Date.UTC(y, mo - 1, d, h, mi, s);
  let t = wall - tzOffset(wall, tz);
  const again = wall - tzOffset(t, tz);
  if (again !== t) t = again;
  return t;
}
const campusParts = (t: number) => {
  const date = campusDate(new Date(t));
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: CAMPUS_TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(t));
  return { date, time };
};

/** DTSTART/DTEND 한 줄 → 캠퍼스 날짜·시각 */
export function parseIcsDate(params: string, value: string): { date: string; time?: string; allDay: boolean } | null {
  const v = value.trim();
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  if (dateOnly || /VALUE=DATE(;|$)/i.test(params)) {
    const m = dateOnly ?? /^(\d{4})(\d{2})(\d{2})/.exec(v);
    return m ? { date: `${m[1]}-${m[2]}-${m[3]}`, allDay: true } : null;
  }
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/.exec(v);
  if (!m) return null;
  const [y, mo, d, h, mi, s] = [m[1], m[2], m[3], m[4], m[5], m[6] ?? '0'].map(Number);
  let t: number;
  if (m[7]) t = Date.UTC(y, mo - 1, d, h, mi, s);
  else {
    const tz = /TZID="?([^";:]+)"?/i.exec(params)?.[1];
    try { t = zonedToUtc(y, mo, d, h, mi, s, tz || CAMPUS_TZ); } catch { t = zonedToUtc(y, mo, d, h, mi, s, CAMPUS_TZ); } // 모르는 TZID 는 캠퍼스 시간으로
  }
  return { ...campusParts(t), allDay: false };
}

/** ICS 본문 → 일정 목록 (VEVENT 만) */
export function parseIcs(text: string): IcsEvent[] {
  const out: IcsEvent[] = [];
  let cur: Record<string, { params: string; value: string }> | null = null;
  for (const line of unfoldIcs(text)) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') {
      if (cur?.DTSTART) {
        const s = parseIcsDate(cur.DTSTART.params, cur.DTSTART.value);
        const e = cur.DTEND ? parseIcsDate(cur.DTEND.params, cur.DTEND.value) : null;
        if (s) {
          // 하루 종일 일정의 DTEND 는 '다음 날'(제외) — 마지막 날은 하루 앞
          let end = e ? (s.allDay && e.allDay ? addDays(e.date, -1) : e.date) : s.date;
          if (end < s.date) end = s.date;
          out.push({ uid: cur.UID?.value ?? '', summary: unescapeIcsText(cur.SUMMARY?.value ?? '').replace(/\s+/g, ' ').trim(), start: s.date, end, time: s.allDay ? undefined : s.time, allDay: s.allDay, status: cur.STATUS?.value, rrule: cur.RRULE?.value });
        }
      }
      cur = null; continue;
    }
    if (!cur) continue;
    const m = /^([A-Za-z-]+)((?:;[^:]*)?):(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1].toUpperCase();
    if (!(key in cur)) cur[key] = { params: m[2], value: m[3] };
  }
  return out;
}

// ─── 제목 다듬기 ────────────────────────────────────────────────────────────
const SEASON: Record<string, string> = { FA: 'Fall', SP: 'Spring', SU: 'Summer', WI: 'Winter' };

/** "SP27 Phase 1 …" / "Spring 2023 - Final Examinations" / "Fall - Academic holiday" → 학기 + 나머지 */
export function splitTerm(summary: string, start: string): { term: string; rest: string } {
  let m = /^(FA|SP|SU|WI)\s?(\d{2})\b\s*[-–:]?\s*/i.exec(summary);
  if (m) return { term: `${SEASON[m[1].toUpperCase()]} 20${m[2]}`, rest: summary.slice(m[0].length) };
  m = /^(Fall|Spring|Summer|Winter)\s+(\d{4})\s*[-–:]\s*/i.exec(summary);
  if (m) return { term: `${cap(m[1])} ${m[2]}`, rest: summary.slice(m[0].length) };
  m = /^(Fall|Spring|Summer|Winter)\s*[-–:]\s*/i.exec(summary);
  if (m) {
    const season = cap(m[1]); const y = Number(start.slice(0, 4)); const mo = Number(start.slice(5, 7));
    // 봄 학기 일정이 전년도 가을에 나오기도 한다 (거주 신고 마감 등)
    return { term: `${season} ${(season === 'Spring' || season === 'Winter') && mo >= 9 ? y + 1 : y}`, rest: summary.slice(m[0].length) };
  }
  return { term: '', rest: summary };
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

type Rule = [RegExp, string, AcademicDateKind, 1 | 2 | 3];
/** 알려진 registrar 제목 → 학생이 읽기 쉬운 제목. 위에서부터 처음 맞는 것 */
const RULES: Rule[] = [
  [/^phase 1 continuing students? enrollment begins/i, 'Phase 1 enrollment begins (continuing students)', 'enrollment', 1],
  [/^phase 1 continuing students? enrollment ends/i, 'Phase 1 enrollment ends (continuing students)', 'enrollment', 1],
  [/^phase 1 new undergraduate transfer students? enrollment begins/i, 'Phase 1 enrollment begins (new transfer students)', 'enrollment', 2],
  [/^phase 1 new undergraduate freshman students? enrollment begins/i, 'Phase 1 enrollment begins (new freshmen)', 'enrollment', 2],
  [/^phase 1 new graduate students? enrollment begins/i, 'Phase 1 enrollment begins (new grad students)', 'enrollment', 2],
  [/^phase 1 new students? enrollment ends/i, 'Phase 1 enrollment ends (new students)', 'enrollment', 2],
  [/^phase 2 continuing (students? )?enrollment begins/i, 'Phase 2 enrollment begins (continuing students)', 'enrollment', 1],
  [/^phase 2 enrollment ends/i, 'Phase 2 enrollment ends', 'enrollment', 1],
  [/^adjustment period begins/i, 'Adjustment period begins (add/drop/swap open)', 'enrollment', 2],
  [/^adjustment period ends/i, 'Adjustment period ends', 'enrollment', 2],
  [/^appointments released/i, 'Enrollment appointments released on CalCentral', 'enrollment', 2],
  [/^schedule of classes published/i, 'Class schedule published', 'enrollment', 2],
  [/^last day automatic waitlist runs\s*-?\s*(.*)$/i, 'Last day the automatic waitlist runs', 'enrollment', 2],
  [/^waitlist purge/i, 'Waitlists are cleared (waitlist purge)', 'enrollment', 2],
  [/^semester begins?$/i, 'Semester begins', 'instruction', 2],
  [/^week 1\s*-\s*instruction begins/i, 'Instruction begins', 'instruction', 1],
  [/^last day of formal instruction/i, 'Last day of formal classes', 'instruction', 2],
  [/^rrr week/i, 'RRR week (reading, review, recitation)', 'instruction', 2],
  [/^(finals? week|final examinations?)\.?$/i, 'Final exams', 'finals', 1],
  [/^semester ends/i, 'Semester ends', 'instruction', 2],
  [/^spring recess/i, 'Spring recess (no classes)', 'holiday', 2],
  [/^last day to drop classes without a fee/i, 'Last day to drop classes without a fee', 'deadline', 1],
  [/^last day to add (classes )?without a fee/i, 'Last day to add classes without a fee', 'deadline', 1],
  [/^last day to drop early drop deadline/i, 'Last day to drop Early Drop Deadline (EDD) classes', 'deadline', 2],
  [/^last day for undergraduates to add\/drop/i, 'Last day for undergrads to add/drop classes or change units', 'deadline', 1],
  [/^last day for graduates to add\/drop/i, 'Last day for grad students to add/drop classes or change units', 'deadline', 2],
  [/^undergraduate and graduate students grading option deadline/i, 'Grading option deadline (letter grade ↔ P/NP)', 'deadline', 1],
  [/^last day for undergraduates in engineering to change the grading option/i, 'Engineering undergrads: last day to change grading option in technical courses', 'deadline', 3],
  [/^fee payment deadline/i, 'Fee payment deadline (in full or first installment)', 'deadline', 2],
  [/^last day to withdraw for full refund/i, 'Last day to withdraw for a full refund (before instruction begins)', 'deadline', 2],
  [/^deadline to become officially registered/i, 'Deadline to be officially registered (enrolled + 20% of fees paid)', 'deadline', 2],
  [/^deadline for students to be enrolled/i, 'Deadline to be enrolled (record is cancelled if not)', 'deadline', 2],
  [/^instructor drop deadline/i, 'Instructor drop deadline', 'deadline', 3],
  [/^census date/i, 'Census date', 'other', 3],
  [/^assess registration fees/i, 'Registration fees assessed (tentative)', 'other', 3],
  [/^academic (and|&) administrative holiday/i, 'Academic & administrative holiday (no classes)', 'holiday', 2],
];
/** 학생이 아닌 담당자용 마감 — 버린다 */
const STAFF = /^(department(al)? schedulers?|gsao'?s?|college advisers?)|enrollment managers/i;
/** 주간 채움 일정 ("FA26 Week 7") — 버린다. "Week 1 - Instruction Begins" 는 남는다 */
export const isWeekFiller = (rest: string) => /^week\s+\d+\.?$/i.test(rest.trim());

/** registrar 제목 → { 학기, 읽기 쉬운 제목, 종류, 중요도 } — 버릴 일정이면 null */
export function normalizeSummary(summary: string, start: string): { term: string; label: string; kind: AcademicDateKind; priority: 1 | 2 | 3 } | null {
  const { term, rest: raw } = splitTerm(summary.replace(/\s+/g, ' ').trim(), start);
  const rest = raw.replace(/\s*\\n\s*$/i, '').trim();
  if (!rest || isWeekFiller(rest) || STAFF.test(rest)) return null;
  for (const [re, label, kind, priority] of RULES) {
    const m = re.exec(rest);
    if (m) return { term, label: re.source.includes('waitlist runs') && m[1] ? `${label} (${m[1].replace(/(\d)(AM|PM)/i, '$1 $2')})` : label, kind, priority };
  }
  const label = cap1(rest.replace(/\.$/, ''));
  const kind: AcademicDateKind = /final exam|finals/i.test(rest) ? 'finals'
    : /holiday|recess|non-instructional/i.test(rest) ? 'holiday'
      : /enroll|phase \d|appointment|waitlist|adjustment period/i.test(rest) ? 'enrollment'
        : /deadline|last day/i.test(rest) ? 'deadline'
          : /instruction|semester|classes (begin|end)|rrr|reading/i.test(rest) ? 'instruction' : 'other';
  return { term, label, kind, priority: kind === 'finals' ? 1 : kind === 'other' ? 3 : 2 };
}
const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 48);

export const academicTitle = (term: string, label: string) => (term ? `${term} · ${label}` : label);
const make = (schoolId: string, x: Omit<AcademicDate, 'id' | 'schoolId' | 'title'>): AcademicDate => ({
  id: `acd_${schoolId.replace(/^s_/, '')}_${x.start}_${slug(`${x.term} ${x.label}`)}`, schoolId, title: academicTitle(x.term, x.label), ...x,
});

/** ICS 일정 → AcademicDate (버릴 것·취소된 것 제외, 같은 날 같은 제목은 하나로) */
export function toAcademicDates(schoolId: string, events: IcsEvent[], source: string): AcademicDate[] {
  const byId = new Map<string, AcademicDate>();
  for (const e of events) {
    if (/^cancelled$/i.test(e.status ?? '')) continue;
    const n = normalizeSummary(e.summary, e.start);
    if (!n) continue;
    // "Week 1 - Instruction Begins" 는 그 주 전체로 들어 있다 — 시작·끝을 말하는 일정은 첫날 하루로
    const end = /\b(begins?|ends?)\b/i.test(n.label) ? e.start : e.end;
    const d = make(schoolId, { label: n.label, term: n.term, start: e.start, end, time: e.time, kind: n.kind, priority: n.priority, source, raw: e.summary });
    if (!byId.has(d.id)) byId.set(d.id, d);
  }
  return [...byId.values()].sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
}

/** server/data/academic-calendar-<short>.csv — start,end,term,kind,priority,title,source (PDF 에서 옮긴 것) */
export function loadCalendarSupplement(schoolId: string, file: string): AcademicDate[] {
  if (!existsSync(file)) return [];
  const KINDS: AcademicDateKind[] = ['enrollment', 'deadline', 'holiday', 'finals', 'instruction', 'other'];
  return parseCSV(readFileSync(file, 'utf8'))
    .filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r.start) && r.title)
    .map((r) => make(schoolId, {
      label: r.title, term: r.term ?? '', start: r.start, end: /^\d{4}-\d{2}-\d{2}$/.test(r.end ?? '') ? r.end : r.start,
      kind: (KINDS as string[]).includes(r.kind) ? (r.kind as AcademicDateKind) : 'other', priority: (Number(r.priority) || 2) as 1 | 2 | 3, source: r.source || '',
    }));
}

const UA = { 'user-agent': 'Mozilla/5.0 (compatible; Lumi-campus-app; academic calendar)' };
async function getText(url: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(60_000) });
      if (r.ok) return await r.text();
      if (r.status < 500 || attempt >= 2) throw new Error(`${url} → ${r.status}`);
    } catch (e) { if (attempt >= 2) throw e; }
    await new Promise((res) => setTimeout(res, 3000 * 2 ** attempt));
  }
}

/** schools.csv 의 academic_calendar 값 → ICS 주소 ("ics:https://…") */
export const icsUrlOf = (source?: string) => /^ics:(https:\/\/\S+)$/.exec((source ?? '').trim())?.[1];

/**
 * 학교 하나의 학사 일정 — ICS + 보충 CSV. 지난 120일 ~ 앞으로 18개월만 남긴다 (오래된 학기는 버린다).
 */
export async function fetchAcademicCalendar(schoolId: string, icsUrl: string, supplementFile?: string, now: Date = new Date(), fetchText: (url: string) => Promise<string> = getText) {
  const text = await fetchText(icsUrl);
  if (!/BEGIN:VCALENDAR/.test(text)) throw new Error('not an iCalendar file');
  const events = parseIcs(text);
  const today = campusDate(now);
  const from = addDays(today, -120); const to = addDays(today, 540);
  const fromIcs = toAcademicDates(schoolId, events, icsUrl);
  const extra = supplementFile ? loadCalendarSupplement(schoolId, supplementFile) : [];
  const ids = new Set(fromIcs.map((x) => x.id));
  const all = [...fromIcs, ...extra.filter((x) => !ids.has(x.id))]
    .filter((x) => x.end >= from && x.start <= to)
    .sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title));
  const fillers = events.filter((e) => isWeekFiller(splitTerm(e.summary, e.start).rest)).length;
  return { dates: all, events: events.length, fillers, supplement: extra.length };
}
