/**
 * Ask Lumi 의 search_academic_calendar — "Phase 1 언제 시작해?", "drop 마감?", "기말고사 언제?"를 학사 일정(academicDates)에서만 답한다.
 * (ai-search.ts 와 같은 모양: 검색 결과만 모델에 넘기고, 모델은 그 날짜만 인용한다)
 */
import type { AcademicDate, AcademicDateKind } from '@core/lib/academic';
import { daysBetween } from '@core/lib/academic';

const STOP = new Set('a an the and or of for to in on at is are was be do does did when what which whats what\'s how will can i my me we our this next that there day date dates deadline deadlines calendar uc berkeley cal semester term'.split(' '));
/** 같은 뜻 → 일정 제목에 실제로 나오는 말 */
const SYN: Record<string, string> = {
  start: 'begin', starts: 'begin', starting: 'begin', open: 'begin', opens: 'begin', begin: 'begin', begins: 'begin', beginning: 'begin',
  end: 'end', ends: 'end', close: 'end', closes: 'end', over: 'end',
  finals: 'final', final: 'final', exam: 'final', exams: 'final', examinations: 'final',
  break: 'holiday', vacation: 'holiday', holidays: 'holiday', off: 'holiday', recess: 'recess',
  pnp: 'grading', 'p/np': 'grading', pass: 'grading', grading: 'grading', grade: 'grading',
  enroll: 'enrollment', enrolling: 'enrollment', enrollment: 'enrollment', registration: 'registered', register: 'registered',
  classes: 'class', instruction: 'instruction', lectures: 'instruction',
  dropping: 'drop', adding: 'add', withdraw: 'withdraw', refund: 'refund', waitlist: 'waitlist',
};
const tokens = (q: string) => q.toLowerCase().replace(/[^a-z0-9/&\s-]/g, ' ').split(/[\s-]+/).filter((w) => w && !STOP.has(w)).map((w) => SYN[w] ?? w);
const KIND_WORDS: Record<AcademicDateKind, string> = { enrollment: 'enrollment phase', deadline: 'deadline last', holiday: 'holiday', finals: 'final', instruction: 'instruction class', other: '' };

export function searchAcademicCalendar(dates: AcademicDate[], schoolId: string, today: string, input: { query?: string; kinds?: AcademicDateKind[]; term?: string; from?: string; to?: string; include_past?: boolean; limit?: number }) {
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 20);
  const mine = dates.filter((d) => d.schoolId === schoolId);
  const terms = [...new Set(mine.map((d) => d.term).filter(Boolean))];
  const term = input.term ? terms.find((t) => t.toLowerCase() === input.term!.trim().toLowerCase()) : undefined;
  const q = tokens(input.query ?? '');
  const rows = mine
    .filter((d) => input.include_past || input.from ? true : d.end >= today)
    .filter((d) => !term || d.term === term)
    .filter((d) => !input.kinds?.length || input.kinds.includes(d.kind))
    .filter((d) => (!input.from || d.end >= input.from) && (!input.to || d.start <= input.to))
    .map((d) => {
      const hay = `${d.title} ${d.raw ?? ''} ${KIND_WORDS[d.kind]}`.toLowerCase();
      const hit = q.filter((w) => hay.includes(w)).length;
      return { d, s: q.length ? hit / q.length : 1, hit };
    })
    .filter((x) => !q.length || (x.hit > 0 && x.s >= 0.5))
    .filter((x) => q.length || input.kinds?.length || x.d.priority <= 2)
    .sort((a, b) => b.s - a.s || a.d.start.localeCompare(b.d.start) || a.d.priority - b.d.priority)
    .slice(0, limit);
  const weekday = (d: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long' }).format(new Date(`${d}T12:00:00Z`));
  return {
    today,
    calendar_terms: terms,
    requested_term_missing: !!input.term && !term,
    results: rows.map(({ d }) => ({
      title: d.title, term: d.term || undefined, kind: d.kind,
      date: d.start, weekday: weekday(d.start), end: d.end !== d.start ? d.end : undefined, time: d.time,
      days_from_today: daysBetween(today, d.start),
      source: d.source,
    })),
    note: rows.length ? undefined : mine.length ? 'No matching dates. Try other words (e.g. "drop", "phase 2", "finals") or include_past.' : 'Lumi has no academic calendar for this school yet.',
  };
}
