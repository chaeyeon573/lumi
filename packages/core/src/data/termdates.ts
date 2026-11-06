/**
 * 학기 날짜 (학교별) — 수업 리뷰(@core/lib/coursereviews)가 언제 열리고 학기 말 안내가 언제 가는지를 정한다.
 *
 *   start           수업 시작일 (Instruction Begins)
 *   week8           8주차 첫날(월) — 리뷰 쓰기가 열리는 날. 1주차 = 수업이 시작하는 주 (Berkeley 캘린더의 "Week 1 - Instruction Begins")
 *   lastInstruction 마지막 수업일 (Last Day of Instruction) — 학기 말 리뷰 안내가 이날부터 간다
 *
 * 학교 공식 학사 일정에서 확인한 날짜만 넣는다 (지어내지 않는다). 확인하지 못한 날짜는 verified: false 와 TODO 를 단다 —
 * 그런 학기는 리뷰를 열지 않는다. 여기에 없는 학교·학기는 "아직 학기 날짜가 없어요"라고 솔직하게 말한다.
 */
import type { ID } from '@core/types';

export interface TermDates {
  schoolId: ID;
  /** "Fall 2026" */
  term: string;
  /** YYYY-MM-DD, 캠퍼스 날짜 */
  start: string;
  week8: string;
  lastInstruction: string;
  /** 공식 출처 */
  source: string;
  /** 공식 출처에서 확인했으면 true. false 면 쓰지 않는다 (TODO) */
  verified: boolean;
}

const BERKELEY_CAL = 'https://registrar.berkeley.edu/wp-content/uploads/UCB_AcademicCalendar_2026-27_a11y.pdf';

/**
 * UC Berkeley 2026-27 (Office of the Registrar 학사 일정 PDF, 2026-11-06 확인):
 *   Fall 2026   Instruction Begins Wed Aug 26 · Formal Classes End Fri Dec 4 · Last Day of Instruction Fri Dec 11 (RRR 주 끝)
 *   Spring 2027 Instruction Begins Tue Jan 19 · Formal Classes End Fri Apr 30 · Last Day of Instruction Fri May 7
 * 8주차: Fall 1주차 = Aug 24 주 → Mon Oct 12. Spring 1주차 = Jan 18 주 → Mon Mar 8.
 */
export const TERM_DATES: readonly TermDates[] = [
  { schoolId: 's_berkeley', term: 'Fall 2026', start: '2026-08-26', week8: '2026-10-12', lastInstruction: '2026-12-11', source: BERKELEY_CAL, verified: true },
  { schoolId: 's_berkeley', term: 'Spring 2027', start: '2027-01-19', week8: '2027-03-08', lastInstruction: '2027-05-07', source: BERKELEY_CAL, verified: true },
];

/** 이 학교·학기의 확인된 날짜 (없거나 확인 전이면 undefined) */
export function termDatesFor(schoolId: ID, term: string, table: readonly TermDates[] = TERM_DATES): TermDates | undefined {
  return table.find((t) => t.schoolId === schoolId && t.term === term && t.verified);
}
