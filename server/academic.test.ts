/**
 * 학사 일정 — ICS 파싱(접힌 줄 · 하루 종일 · 시간대), Week N 거르기, 읽기 쉬운 제목, Key dates, Ask Lumi 검색.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseIcs, unfoldIcs, toAcademicDates, normalizeSummary, isWeekFiller, fetchAcademicCalendar, loadCalendarSupplement, icsUrlOf } from './sources/academic-calendar';
import { keyDates, dDay, addDeadline, enrollmentWindow, formatAcademicDate } from '@core/lib/academic';
import { searchAcademicCalendar } from './ai-academic';

const here = path.dirname(fileURLToPath(import.meta.url));
const ICS = readFileSync(path.join(here, 'fixtures/berkeley-enrollment-calendar.ics'), 'utf8');
const SRC = 'https://calendar.google.com/calendar/ical/x/public/basic.ics';

test('unfolds folded lines (CRLF + space) and unescapes text', () => {
  const lines = unfoldIcs('BEGIN:VEVENT\r\nSUMMARY:Hello \r\n world\\, again\r\n\tand more\r\nEND:VEVENT\r\n');
  assert.equal(lines[1], 'SUMMARY:Hello world\\, againand more');
  const [e] = parseIcs('BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20261026\r\nSUMMARY:A\\, B\\; C\\nD\r\nEND:VEVENT\r\n');
  assert.equal(e.summary, 'A, B; C D');
});

test('all-day events: DTEND is exclusive, single and multi-day', () => {
  const evs = parseIcs(ICS);
  const p1 = evs.find((e) => e.summary === 'SP27 Phase 1 Continuing Students Enrollment Begins')!;
  assert.deepEqual([p1.start, p1.end, p1.allDay, p1.time], ['2026-10-26', '2026-10-26', true, undefined]);
  const finals = evs.find((e) => e.summary === 'FA26 Finals Week')!;
  assert.deepEqual([finals.start, finals.end], ['2026-12-14', '2026-12-18']);
  const folded = evs.find((e) => e.uid === 'test-folded@lumi')!;
  assert.equal(folded.summary, 'SP27 Last Day to Drop Classes Without a Fee');
  assert.equal(folded.start, '2026-12-03');
});

test('timed events: TZID and UTC times become campus (Pacific) date and time', () => {
  const evs = parseIcs(ICS);
  const ny = evs.find((e) => e.uid === 'test-tzid@lumi')!;
  assert.deepEqual([ny.start, ny.time, ny.allDay], ['2026-11-05', '10:00', false]); // 1pm New York = 10am Pacific
  const utc = evs.find((e) => e.uid === 'test-utc@lumi')!;
  assert.deepEqual([utc.start, utc.time], ['2026-11-30', '18:00']); // Dec 1 02:00Z = Nov 30 6pm PST
  // DST: July 02:00Z = previous day 7pm PDT
  const [summer] = parseIcs('BEGIN:VEVENT\nDTSTART:20270702T020000Z\nSUMMARY:x\nEND:VEVENT\n');
  assert.deepEqual([summer.start, summer.time], ['2027-07-01', '19:00']);
  // 모르는 TZID 는 캠퍼스 시간으로
  const [bad] = parseIcs('BEGIN:VEVENT\nDTSTART;TZID=Mars/Olympus:20261105T090000\nSUMMARY:x\nEND:VEVENT\n');
  assert.deepEqual([bad.start, bad.time], ['2026-11-05', '09:00']);
});

test('skips weekly "Week N" filler, staff-only deadlines and cancelled events; keeps "Week 1 - Instruction Begins"', () => {
  assert.equal(isWeekFiller('Week 10'), true);
  assert.equal(isWeekFiller('Week 1 - Instruction Begins'), false);
  const dates = toAcademicDates('s_berkeley', parseIcs(ICS), SRC);
  assert.ok(!dates.some((d) => /^Week \d+$/.test(d.label)), 'no Week N');
  assert.ok(!dates.some((d) => /scheduler|gsao|enrollment managers/i.test(d.raw ?? '')), 'no staff deadlines');
  assert.ok(!dates.some((d) => d.raw === 'SP27 Cancelled thing'));
  const ib = dates.find((d) => d.term === 'Spring 2027' && d.label === 'Instruction begins')!;
  assert.deepEqual([ib.start, ib.end], ['2027-01-19', '2027-01-19']); // 'Week 1' 기간이 아니라 첫날
});

test('readable titles with term, kind and priority', () => {
  const dates = toAcademicDates('s_berkeley', parseIcs(ICS), SRC);
  const p1 = dates.find((d) => d.raw === 'SP27 Phase 1 Continuing Students Enrollment Begins')!;
  assert.equal(p1.title, 'Spring 2027 · Phase 1 enrollment begins (continuing students)');
  assert.deepEqual([p1.kind, p1.priority, p1.term, p1.start], ['enrollment', 1, 'Spring 2027', '2026-10-26']);
  assert.equal(dates.find((d) => d.raw === 'SP27 Phase 2 Continuing Enrollment Begins')!.start, '2026-11-23');
  assert.equal(dates.find((d) => d.raw === 'SP27 Phase 2 Enrollment Ends')!.start, '2027-01-10');
  assert.equal(normalizeSummary('FA26 Finals Week', '2026-12-14')!.label, 'Final exams');
  assert.equal(normalizeSummary('Spring 2023 - Final Examinations', '2023-05-08')!.term, 'Spring 2023');
  // 학기 표기 없는 옛 형식 — 날짜로 학기를 정한다
  assert.equal(normalizeSummary('Spring - Deadline to submit Statement of Legal Residence.', '2026-12-10')!.term, 'Spring 2027');
  assert.equal(normalizeSummary('SP27 Last Day Automatic Waitlist Runs - 6:40PM', '2027-02-05')!.label, 'Last day the automatic waitlist runs (6:40 PM)');
  assert.equal(normalizeSummary('FA26 Week 8', '2026-10-12'), null);
  assert.equal(normalizeSummary("FA26 GSAO's/College Advisers Add/Drop/Swap/Grading Option/Unit Change Deadline", '2026-12-11'), null);
  // ICS 의 "\n" 꼬리가 제목에 남지 않는다
  const ug = dates.find((d) => d.raw?.startsWith('SP27 Last Day for Undergraduates'))!;
  assert.equal(ug.label, 'Last day for undergrads to add/drop classes or change units');
});

test('Key dates on Oct 13, 2026: Phase 1 (D-13) first, one deadline, one finals', () => {
  const dates = toAcademicDates('s_berkeley', parseIcs(ICS), SRC);
  const k = keyDates(dates, '2026-10-13', 3);
  assert.equal(k.length, 3);
  assert.equal(k[0].title, 'Spring 2027 · Phase 1 enrollment begins (continuing students)');
  assert.equal(dDay(k[0], '2026-10-13'), 'D-13');
  assert.deepEqual(k.map((x) => x.kind), ['enrollment', 'deadline', 'finals']);
  assert.equal(k[2].start, '2026-12-14');
  assert.equal(dDay({ start: '2026-12-14', end: '2026-12-18' }, '2026-12-15'), 'Now');
  assert.equal(formatAcademicDate(k[0]), 'Mon, Oct 26');
});

test('add deadline and enrollment window per term drive seat polling', () => {
  const dates = toAcademicDates('s_berkeley', parseIcs(ICS), SRC);
  assert.equal(addDeadline(dates, 's_berkeley', 'Spring 2027'), '2027-02-19');
  assert.deepEqual(enrollmentWindow(dates, 's_berkeley', 'Spring 2027'), { start: '2026-10-26', end: '2027-02-19' });
  assert.equal(addDeadline([], 's_berkeley', 'Fall 2026'), '2026-09-30'); // 일정이 없으면 어림값
});

test('fetchAcademicCalendar merges the PDF supplement, keeps a window around today', async () => {
  const sup = path.join(here, 'data/academic-calendar-berkeley.csv');
  assert.ok(loadCalendarSupplement('s_berkeley', sup).some((d) => d.start === '2026-11-11' && d.kind === 'holiday'));
  const r = await fetchAcademicCalendar('s_berkeley', SRC, sup, new Date('2026-10-13T18:00:00Z'), async () => ICS);
  assert.ok(r.dates.some((d) => d.title === 'Fall 2026 · Thanksgiving — academic & administrative holiday (no classes)' && d.end === '2026-11-27'));
  assert.ok(r.fillers > 10);
  assert.ok(r.dates.every((d) => d.end >= '2026-06-15'));
  assert.equal(icsUrlOf('ics:https://calendar.google.com/x.ics'), 'https://calendar.google.com/x.ics');
  await assert.rejects(fetchAcademicCalendar('s_berkeley', SRC, undefined, new Date(), async () => '<html>nope</html>'));
});

test('Ask Lumi search: phase 1, drop deadline, finals', () => {
  const dates = toAcademicDates('s_berkeley', parseIcs(ICS), SRC);
  const p1 = searchAcademicCalendar(dates, 's_berkeley', '2026-10-13', { query: 'when does phase 1 start' });
  assert.equal(p1.results[0].title, 'Spring 2027 · Phase 1 enrollment begins (continuing students)');
  assert.deepEqual([p1.results[0].date, p1.results[0].weekday, p1.results[0].days_from_today], ['2026-10-26', 'Monday', 13]);
  const drop = searchAcademicCalendar(dates, 's_berkeley', '2026-10-13', { query: 'last day to drop', term: 'Spring 2027' });
  assert.ok(drop.results.some((r) => r.title === 'Spring 2027 · Last day to drop classes without a fee' && r.date === '2027-01-29'));
  const finals = searchAcademicCalendar(dates, 's_berkeley', '2026-10-13', { query: 'when are finals' });
  assert.equal(finals.results[0].date, '2026-12-14');
  assert.equal(finals.results[0].end, '2026-12-18');
  assert.equal(searchAcademicCalendar(dates, 's_ucmerced', '2026-10-13', { query: 'finals' }).note, 'Lumi has no academic calendar for this school yet.');
});
