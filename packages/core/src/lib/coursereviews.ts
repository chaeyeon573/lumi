/**
 * 수업 리뷰 · 시험 정보 (course reviews / exam info) — 학생이 쓰는 우리 리뷰. 모든 학교에 같은 규칙.
 * Owner 2026-11-06: Berkeleytime 같은 게 없는 학교가 대부분이라 직접 모은다. 별점 + 긴 글 + 시험 정보.
 * Berkeleytime · Rate My Professors 는 링크로만 — 그쪽 데이터는 절대 복사하지 않는다.
 *
 * 누가 쓰나
 *   - 인증한 학생만 (학교 이메일, 또는 승인된 학생증). 검토 대기 계정·예시 프로필은 못 쓴다
 *   - 그 학기 Lumi 시간표에 그 수업이 있어야 한다 (수업 키 = 학교 + 과목 코드 + 학기, @core/lib/classmates)
 *   - 그 학기 8주차부터 (@core/data/termdates). 학기 날짜를 모르는 학교는 열지 않는다 — 솔직하게 말한다
 *   - 한 사람 · 한 수업 · 한 학기에 리뷰 하나, 시험 정보 하나 (다시 쓰면 고친다). 글쓴이는 고치고 지울 수 있다
 *   - 하루 쓰기(새로 쓰기 + 고치기) REVIEW_LIMITS.writesPerDay 번까지
 *
 * 보기 (잠금 규칙 — 쓰면 열린다)
 *   - 누구나: 요약 카드 + 리뷰 1개 (시험 정보도 요약 + 팁 1개)
 *   - 나머지: 아무 수업이든 리뷰를 1개 이상 쓴 사람만. 잠겨 있으면 지금 쓸 수 있는 내 수업을, 없으면 언제부터인지 보여 준다
 *
 * 익명
 *   - 글쓴이 id 는 서버에만. 화면에 내려가는 모양(…View)에는 id·이름·도움돼요 누른 사람 목록이 없다 — 수와 mine/helpedByMe 만
 *   - 날짜 대신 학기("Fall 2026 student"). 그 수업·학기 리뷰가 3개 미만이면 학기도 빼고 "Student"
 *   - 목록 줄의 별점은 리뷰 3개 이상일 때만
 *
 * 걸러내기
 *   - 전화번호·이메일·URL 은 거절 (이유를 그대로 보여 준다)
 *   - 학생 이름을 부르는 것 같은 글(간단한 규칙) · 실제 시험 문제처럼 보이는 팁 → 저장은 하되 관리자가 볼 때까지 숨김(held)
 *   - 신고 3명(서로 다른 실제 계정)이면 관리자 확인 전까지 숨김 (server/moderation.ts 와 같은 수)
 *
 * 저장은 스냅샷 밖 문서 묶음 (server/coursereviews.ts). 이 파일은 순수 규칙 + 엔진 — 서버와 목업이 같이 쓴다.
 */
import type { ID, User } from '@core/types';
import { campusDate, formatAcademicDate } from './academic';
import { codeSlug, enrollments, normalizeCode, schoolOf, type Enrollment } from './classmates';
import { termOrder } from './terms';
import { awaitingVerification } from './verification';
import { termDatesFor, TERM_DATES, type TermDates } from '@core/data/termdates';

// ─── 값 ──────────────────────────────────────────────────────────────────────
export const REVIEW_LIMITS = {
  textMin: 50, textMax: 2000, tipMax: 500,
  /** 새로 쓰기 + 고치기, 24시간 */
  writesPerDay: 10,
  /** 도움돼요 누르기·취소, 24시간 */
  helpfulPerDay: 100,
  /** 목록 줄 별점·카드의 학기 표시가 나오는 최소 리뷰 수 */
  minForStars: 3, minForTerm: 3,
  /** 서로 다른 실제 계정 신고 수 → 관리자 확인 전까지 숨김 */
  autoHide: 3,
  maxTags: 5,
} as const;

export const WORKLOADS = ['0-3', '3-6', '6-10', '10+'] as const;
export type Workload = typeof WORKLOADS[number];
export const WORKLOAD_LABEL: Record<Workload, string> = { '0-3': '0–3 hrs', '3-6': '3–6 hrs', '6-10': '6–10 hrs', '10+': '10+ hrs' };

export const GRADINGS = ['curved', 'fixed', 'unsure'] as const;
export type Grading = typeof GRADINGS[number];
export const GRADING_LABEL: Record<Grading, string> = { curved: 'Curved', fixed: 'Fixed scale', unsure: 'Not sure' };

export const REVIEW_TAGS = [
  'group_project', 'lots_of_reading', 'problem_sets', 'essays', 'labs', 'coding_projects',
  'weekly_quizzes', 'presentations', 'participation', 'discussion_sections', 'clear_lectures', 'helpful_office_hours',
] as const;
export type ReviewTag = typeof REVIEW_TAGS[number];
export const TAG_LABEL: Record<ReviewTag, string> = {
  group_project: 'Group project', lots_of_reading: 'Lots of reading', problem_sets: 'Problem sets', essays: 'Essays', labs: 'Labs',
  coding_projects: 'Coding projects', weekly_quizzes: 'Weekly quizzes', presentations: 'Presentations', participation: 'Participation counts',
  discussion_sections: 'Discussion sections', clear_lectures: 'Clear lectures', helpful_office_hours: 'Helpful office hours',
};

export const EXAM_FORMATS = ['multiple_choice', 'short_answer', 'essay', 'coding', 'problem_solving', 'take_home'] as const;
export type ExamFormat = typeof EXAM_FORMATS[number];
export const EXAM_FORMAT_LABEL: Record<ExamFormat, string> = {
  multiple_choice: 'Multiple choice', short_answer: 'Short answer', essay: 'Essay', coding: 'Coding', problem_solving: 'Problem solving', take_home: 'Take-home',
};
export type ExamNotes = 'open' | 'closed';
export const EXAM_NOTES_LABEL: Record<ExamNotes, string> = { open: 'Open notes', closed: 'Closed notes' };
/** 0 · 1 · 2 · 3 (= 3 이상) */
export const MIDTERM_CHOICES = [0, 1, 2, 3] as const;
export const midtermLabel = (n: number) => (n === 0 ? 'No midterm' : n >= 3 ? '3+ midterms' : n === 1 ? '1 midterm' : `${n} midterms`);

/** 화면 문구 (영어 — 앱의 다른 Harness A 화면과 같이) */
export const REVIEW_COPY = {
  placeholder: 'What should a classmate know before taking this?',
  rules: 'About the course and teaching. No personal attacks, no real exam questions.',
  examRule: 'Describe the format and how to prepare — never post actual exam questions.',
  lockedTitle: 'Write one review to unlock all reviews',
} as const;

// ─── 저장 모양 (서버에만) ─────────────────────────────────────────────────────
interface Held { reason: string; at: string }
interface Hidden { by: string; at: string }
interface Base {
  id: ID; schoolId: ID;
  /** 과목 코드 slug ("cs61a") — 수업을 가리키는 키 */
  slug: string;
  /** 화면용 과목 코드 ("CS 61A") */
  code: string;
  /** "Fall 2026" */
  term: string;
  /** 서버에만. 어떤 View 에도 넣지 않는다 */
  authorId: ID;
  createdAt: string; updatedAt: string;
  /** 자동 거르기에 걸려 관리자 확인 전까지 숨김 */
  held?: Held;
  /** 관리자가 숨김 */
  hidden?: Hidden;
}
export interface CourseReview extends Base {
  rating: number;
  text: string;
  difficulty?: number;
  workload?: Workload;
  grading?: Grading;
  attendance?: 'taken' | 'not_taken';
  recorded?: boolean;
  tags: ReviewTag[];
  instructor?: string;
  /** 도움돼요 누른 사람 — 서버에만 (화면에는 수만) */
  helpful: ID[];
}
export interface ExamInfo extends Base {
  midterms: number;
  final: boolean;
  formats: ExamFormat[];
  notes?: ExamNotes;
  tip?: string;
}

// ─── 화면에 내려가는 모양 (글쓴이 id 없음) ──────────────────────────────────
export interface ReviewCardView {
  id: ID;
  /** "Fall 2026" — 그 수업·학기 리뷰가 3개 미만이면 null (카드는 "Student") */
  term: string | null;
  rating: number; text: string;
  difficulty?: number; workload?: Workload; grading?: Grading; attendance?: 'taken' | 'not_taken'; recorded?: boolean;
  tags: ReviewTag[]; instructor?: string;
  helpful: number; helpedByMe: boolean; mine: boolean;
  /** 내 글이 숨겨져 있을 때만 — 'checking' (관리자 확인 중) */
  status?: 'checking';
}
export interface ReviewSummary {
  count: number;
  /** 소수 둘째 자리까지. 리뷰가 없으면 null */
  avg: number | null;
  /** 소수 첫째 자리, 답한 사람이 없으면 null */
  difficulty: number | null;
  workload: Record<Workload, number>;
  topTags: { tag: ReviewTag; count: number }[];
  /** 4–5★ 비율 (0–100 정수) */
  recommendedPct: number | null;
}
/** 내 시간표의, 지금 쓸 수 있는 수업 */
export interface ReviewableClass { code: string; slug: string; name: string; term: string; reviewed: boolean; examShared: boolean }
export type WriteDenied = 'signed_out' | 'unverified' | 'pending' | 'not_enrolled' | 'not_open' | 'no_dates';
export type WriteState = { ok: true; term: string } | { ok: false; reason: WriteDenied; message: string; opensOn?: string };
export interface UnlockInfo { reviewable: ReviewableClass[]; /** 아직 쓸 수 있는 수업이 없을 때, 가장 빨리 열리는 날 (YYYY-MM-DD) */ opensOn: string | null; message: string }
export interface MyReview extends Omit<ReviewCardView, 'helpedByMe' | 'mine' | 'term'> { term: string; code: string }
export interface CourseReviewsView {
  course: { schoolId: ID; code: string; slug: string };
  summary: ReviewSummary;
  /** 보이는 리뷰 전체 수 (필터 전) */
  total: number;
  locked: boolean;
  /** 필터를 적용한 목록. 잠겨 있으면 1개 */
  reviews: ReviewCardView[];
  filters: { instructors: string[]; terms: string[] };
  /** 이 수업에 내가 쓴 리뷰 (학기별) */
  mine: MyReview[];
  /** 이 수업을 지금 내가 쓸 수 있는지 (내 시간표의 가장 최근 학기 기준) */
  write: WriteState;
  unlock?: UnlockInfo;
}
export interface ExamSummary {
  count: number;
  /** 가장 많이 답한 중간고사 수 */
  midterms: number | null;
  /** 기말이 있다고 답한 비율 (0–100), 없으면 null */
  finalPct: number | null;
  formats: { format: ExamFormat; count: number }[];
  notes: { open: number; closed: number };
}
export interface ExamTipView { id: ID; term: string | null; midterms: number; final: boolean; formats: ExamFormat[]; notes?: ExamNotes; tip?: string; mine: boolean; status?: 'checking' }
export interface MyExamInfo extends Omit<ExamTipView, 'mine' | 'term'> { term: string; code: string }
export interface ExamInfoView {
  course: { schoolId: ID; code: string; slug: string };
  summary: ExamSummary;
  total: number;
  locked: boolean;
  /** 팁이 있는 것 먼저. 잠겨 있으면 1개 */
  tips: ExamTipView[];
  mine: MyExamInfo[];
  write: WriteState;
  unlock?: UnlockInfo;
}
/** 학기 말 안내 (S030 리뷰 쓰기 단계) — 그 학기 내 수업과 쓴 것 */
export interface TermPromptView { term: string; classes: ReviewableClass[]; write: Record<string, WriteState> }

export interface ReviewInput {
  code: string; term: string; rating: number; text: string;
  difficulty?: number | null; workload?: Workload | null; grading?: Grading | null; attendance?: 'taken' | 'not_taken' | null; recorded?: boolean | null;
  tags?: string[]; instructor?: string | null;
}
export interface ExamInput { code: string; term: string; midterms: number; final: boolean; formats?: string[]; notes?: ExamNotes | null; tip?: string | null }

// ─── 규칙 ────────────────────────────────────────────────────────────────────
type Writer = Pick<User, 'id' | 'affiliation' | 'timetable' | 'sample' | 'verification'>;

/** 리뷰를 쓸 수 있는 학생 — 학교 이메일 인증(학생증 승인도 이 표시를 켠다), 검토 대기 아님, 예시 프로필 아님 */
export function verifiedStudent(u?: Pick<User, 'affiliation' | 'sample' | 'verification'> | null): boolean {
  return !!u && !u.sample && u.affiliation.type === 'university' && !!u.affiliation.emailVerified && !awaitingVerification(u);
}

const fmtDay = (d: string) => formatAcademicDate({ start: d, end: d });

/** 이 사람이 이 수업(slug)·학기의 리뷰를 지금 쓸 수 있는지 */
export function writeState(u: Writer | undefined, slug: string, term: string, now: Date, table: readonly TermDates[] = TERM_DATES): WriteState {
  if (!u) return { ok: false, reason: 'signed_out', message: 'Sign in to write a review.' };
  if (awaitingVerification(u)) return { ok: false, reason: 'pending', message: 'We’re still checking your student ID — you can review once you’re verified.' };
  if (!verifiedStudent(u)) return { ok: false, reason: 'unverified', message: 'Verify your school email to write reviews.' };
  const e = enrollments(u, now).find((x) => codeSlug(x.code) === slug && x.term === term);
  if (!e) return { ok: false, reason: 'not_enrolled', message: `Add this class to your ${term} schedule to review it.` };
  const td = termDatesFor(e.schoolId, term, table);
  if (!td) return { ok: false, reason: 'no_dates', message: 'Reviews open in week 8. We don’t have your school’s term dates yet.' };
  if (campusDate(now) < td.week8) return { ok: false, reason: 'not_open', message: `You can review ${e.code} from ${fmtDay(td.week8)}.`, opensOn: td.week8 };
  return { ok: true, term };
}

/** 내 시간표에서 이 수업의 학기들 (최근 학기 먼저) */
const myTermsFor = (u: Writer, slug: string, now: Date) => enrollments(u, now).filter((e) => codeSlug(e.code) === slug).sort((a, b) => termOrder(b.term) - termOrder(a.term));

/** 이 수업에 대한 쓰기 상태 — 쓸 수 있는 학기가 있으면 그것, 없으면 가장 최근 학기의 이유 */
function courseWrite(u: Writer | undefined, slug: string, now: Date, table: readonly TermDates[]): WriteState {
  if (!u) return writeState(u, slug, '', now, table);
  const terms = myTermsFor(u, slug, now);
  if (!terms.length) {
    // 인증 안 함·검토 대기면 그 이유가 먼저, 아니면 "이 수업을 듣는 학생만"
    const base = writeState(u, slug, '', now, table);
    return !base.ok && base.reason === 'not_enrolled' ? { ok: false, reason: 'not_enrolled', message: 'Only students who take this class on Lumi can review it.' } : base;
  }
  const states = terms.map((e) => writeState(u, slug, e.term, now, table));
  return states.find((s) => s.ok) ?? states[0];
}

/** 텍스트 거르기 — reject: 저장하지 않고 이유를 보여 준다 · hold: 저장하되 관리자 확인 전까지 숨김 */
const PHONE = /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;
const URL_RE = /\bhttps?:\/\/|\bwww\.|\b[a-z0-9-]+\.(?:com|org|net|edu|io|ly|gg|me|co|app|dev|xyz|info|us)\b(?:\/|\b)/i;
/** "my classmate Jason", "a student named Kim", "@handle", "my groupmate Priya" — 학생을 부르는 것 같은 글 */
const NAMES_STUDENT = [
  /\b(?:student|classmate|groupmate|teammate|lab partner|partner|roommate|guy|girl|kid|dude)s?\s+(?:named|called)\s+[A-Za-z]/i,
  /\b(?:[Mm]y|[Oo]ur|[Tt]his|[Tt]hat|[Aa]|[Oo]ne)\s+(?:[Cc]lassmate|[Gg]roupmate|[Tt]eammate|[Ll]ab partner|[Pp]roject partner|[Rr]oommate)\s+[A-Z][a-z]+/,
  /(?:^|\s)@[a-z0-9_.]{2,}/i,
];
/** 실제 시험 문제를 옮긴 것 같은 팁 ("Q3: …", "question 2 was …", "the answer is …") */
const EXAM_QUESTION = [/\bq(?:uestion)?\s?#?\d+\s*[:.)]/i, /\bquestion\s+\d+\s+(?:was|is|asked)\b/i, /\bthe (?:answer|solution) (?:is|was)\b/i];

export type TextCheck = { ok: true; hold?: string } | { ok: false; message: string };
export function checkText(text: string, kind: 'review' | 'tip'): TextCheck {
  if (EMAIL.test(text)) return { ok: false, message: 'Please remove the email address — reviews can’t include contact details.' };
  if (URL_RE.test(text)) return { ok: false, message: 'Please remove the link — reviews can’t include links.' };
  if (PHONE.test(text)) return { ok: false, message: 'Please remove the phone number — reviews can’t include contact details.' };
  if (NAMES_STUDENT.some((r) => r.test(text))) return { ok: true, hold: 'May name a student' };
  if (kind === 'tip' && EXAM_QUESTION.some((r) => r.test(text))) return { ok: true, hold: 'May quote an exam question' };
  return { ok: true };
}

/** 앞뒤 공백 · 연속 빈 줄 정리 */
export const cleanText = (s: unknown, max: number) => String(s ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

/** 요약 카드 — 보이는 리뷰로만 */
export function summarize(list: Pick<CourseReview, 'rating' | 'difficulty' | 'workload' | 'tags'>[]): ReviewSummary {
  const workload = Object.fromEntries(WORKLOADS.map((w) => [w, 0])) as Record<Workload, number>;
  const tags = new Map<ReviewTag, number>();
  let diffSum = 0, diffN = 0, rec = 0, sum = 0;
  for (const r of list) {
    sum += r.rating;
    if (r.rating >= 4) rec++;
    if (r.difficulty) { diffSum += r.difficulty; diffN++; }
    if (r.workload) workload[r.workload]++;
    for (const t of r.tags) tags.set(t, (tags.get(t) ?? 0) + 1);
  }
  const n = list.length;
  return {
    count: n,
    avg: n ? round(sum / n, 2) : null,
    difficulty: diffN ? round(diffSum / diffN, 1) : null,
    workload,
    topTags: [...tags].map(([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || REVIEW_TAGS.indexOf(a.tag) - REVIEW_TAGS.indexOf(b.tag)).slice(0, 4),
    recommendedPct: n ? Math.round((rec / n) * 100) : null,
  };
}

export function summarizeExams(list: Pick<ExamInfo, 'midterms' | 'final' | 'formats' | 'notes'>[]): ExamSummary {
  const mids = new Map<number, number>();
  const formats = new Map<ExamFormat, number>();
  const notes = { open: 0, closed: 0 };
  let finals = 0;
  for (const x of list) {
    mids.set(x.midterms, (mids.get(x.midterms) ?? 0) + 1);
    if (x.final) finals++;
    for (const f of x.formats) formats.set(f, (formats.get(f) ?? 0) + 1);
    if (x.notes) notes[x.notes]++;
  }
  const top = [...mids].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  return {
    count: list.length,
    midterms: top ? top[0] : null,
    finalPct: list.length ? Math.round((finals / list.length) * 100) : null,
    formats: [...formats].map(([format, count]) => ({ format, count })).sort((a, b) => b.count - a.count || EXAM_FORMATS.indexOf(a.format) - EXAM_FORMATS.indexOf(b.format)),
    notes,
  };
}

/** 목록 줄 별점 — 리뷰 3개 이상일 때만 (그 밑이면 아무것도 없다) */
export function listStars(count: number, avg: number | null): { avg: number; count: number } | null {
  return count >= REVIEW_LIMITS.minForStars && avg !== null ? { avg, count } : null;
}

// ─── 엔진 (서버 · 목업 공용) ──────────────────────────────────────────────────
export class ReviewError extends Error { constructor(public status: number, message: string) { super(message); } }

export interface ReviewsIO {
  reviews(): CourseReview[];
  exams(): ExamInfo[];
  putReview(r: CourseReview): void;
  dropReview(id: ID): void;
  putExam(x: ExamInfo): void;
  dropExam(id: ID): void;
  user(id: ID): (Writer & Pick<User, 'id'>) | undefined;
  /** 그 학기 그 수업의 강사 이름 (학교 수업 목록) */
  instructors?(schoolId: ID, slug: string, term: string): string[];
  /** 다른 사람에게 숨겨야 하는 글쓴이 (정지·검토 대기·없는 계정) */
  authorHidden?(authorId: ID): boolean;
  /** 서로 다른 실제 계정의 열린 신고 수 (server/moderation.ts realReporters) */
  reportCount?(type: 'review' | 'exam', id: ID, authorId: ID): number;
  /** 거르기에 걸린 글을 관리자 목록에 올린다 (server: 시스템 신고) */
  onHeld?(type: 'review' | 'exam', item: CourseReview | ExamInfo, reason: string): void;
  uid(prefix: string): ID;
  now?(): Date;
  termDates?: readonly TermDates[];
}

export function createCourseReviews(io: ReviewsIO) {
  const now = () => io.now?.() ?? new Date();
  const table = () => io.termDates ?? TERM_DATES;
  const writes = new Map<ID, number[]>();
  const helps = new Map<ID, number[]>();
  const budget = (m: Map<ID, number[]>, me: ID, max: number, msg: string) => {
    const t = now().getTime();
    const recent = (m.get(me) ?? []).filter((x) => x > t - 86_400_000);
    if (recent.length >= max) throw new ReviewError(429, msg);
    m.set(me, [...recent, t]);
  };

  const shown = (x: Base, type: 'review' | 'exam') => !x.held && !x.hidden && !io.authorHidden?.(x.authorId) && (io.reportCount?.(type, x.id, x.authorId) ?? 0) < REVIEW_LIMITS.autoHide;
  const courseOf = (me: Writer | undefined, code: unknown) => {
    const raw = String(code ?? '').trim();
    if (!raw || raw.length > 40) throw new ReviewError(400, 'Which class?');
    const schoolId = me ? schoolOf(me) : '';
    if (!schoolId) throw new ReviewError(403, 'Reviews are for students at a school on Lumi.');
    const norm = normalizeCode(raw);
    return { schoolId, code: norm, slug: codeSlug(norm) };
  };
  const mustUser = (me: ID) => { const u = io.user(me); if (!u) throw new ReviewError(401, 'Please sign in first.'); return u; };
  /** 아무 수업이든 리뷰를 1개 이상 썼으면 전부 열린다 (숨겨진 내 글도 센다 — 썼으니까) */
  const unlocked = (me: ID) => io.reviews().some((r) => r.authorId === me);

  const reviewable = (u: Writer): ReviewableClass[] => {
    const t = now();
    return enrollments(u, t).filter((e) => writeState(u, codeSlug(e.code), e.term, t, table()).ok).map((e) => cls(u, e));
  };
  const cls = (u: Writer, e: Enrollment): ReviewableClass => ({
    code: e.code, slug: codeSlug(e.code), name: e.name, term: e.term,
    reviewed: io.reviews().some((r) => r.authorId === u.id && r.slug === codeSlug(e.code) && r.term === e.term && r.schoolId === e.schoolId),
    examShared: io.exams().some((x) => x.authorId === u.id && x.slug === codeSlug(e.code) && x.term === e.term && x.schoolId === e.schoolId),
  });
  const unlockInfo = (u: Writer): UnlockInfo => {
    const t = now();
    const list = reviewable(u).filter((c) => !c.reviewed);
    if (list.length) return { reviewable: list, opensOn: null, message: REVIEW_COPY.lockedTitle };
    const opens = enrollments(u, t).map((e) => writeState(u, codeSlug(e.code), e.term, t, table())).flatMap((s) => (!s.ok && s.opensOn ? [s.opensOn] : [])).sort()[0] ?? null;
    if (opens) return { reviewable: [], opensOn: opens, message: `You can review your classes from ${fmtDay(opens)}.` };
    if (!verifiedStudent(u)) return { reviewable: [], opensOn: null, message: awaitingVerification(u) ? 'You can review your classes once your student ID is checked.' : 'Verify your school email to review your classes.' };
    return { reviewable: [], opensOn: null, message: enrollments(u, t).length ? 'Reviews open in week 8 of the term.' : 'Add your classes to your schedule to review them.' };
  };

  /** 그 수업·학기에 보이는 수가 3개 미만이면 학기를 빼고 "Student" */
  const termCounts = <X extends Base>(list: X[]) => {
    const m = new Map<string, number>();
    for (const x of list) m.set(x.term, (m.get(x.term) ?? 0) + 1);
    return (term: string) => ((m.get(term) ?? 0) >= REVIEW_LIMITS.minForTerm ? term : null);
  };

  const card = (r: CourseReview, me: ID, termOf: (t: string) => string | null): ReviewCardView => ({
    id: r.id, term: termOf(r.term), rating: r.rating, text: r.text,
    ...(r.difficulty ? { difficulty: r.difficulty } : {}), ...(r.workload ? { workload: r.workload } : {}), ...(r.grading ? { grading: r.grading } : {}),
    ...(r.attendance ? { attendance: r.attendance } : {}), ...(r.recorded !== undefined ? { recorded: r.recorded } : {}),
    tags: [...r.tags], ...(r.instructor ? { instructor: r.instructor } : {}),
    helpful: r.helpful.length, helpedByMe: r.helpful.includes(me), mine: r.authorId === me,
    ...(r.authorId === me && !shown(r, 'review') ? { status: 'checking' as const } : {}),
  });
  const mineOf = (r: CourseReview): MyReview => {
    const { helpedByMe: _h, mine: _m, term: _t, ...rest } = card(r, r.authorId, () => null);
    return { ...rest, term: r.term, code: r.code };
  };
  const tipView = (x: ExamInfo, me: ID, termOf: (t: string) => string | null): ExamTipView => ({
    id: x.id, term: termOf(x.term), midterms: x.midterms, final: x.final, formats: [...x.formats], ...(x.notes ? { notes: x.notes } : {}), ...(x.tip ? { tip: x.tip } : {}),
    mine: x.authorId === me, ...(x.authorId === me && !shown(x, 'exam') ? { status: 'checking' as const } : {}),
  });

  const helpfulFirst = (a: CourseReview, b: CourseReview) => b.helpful.length - a.helpful.length || termOrder(b.term) - termOrder(a.term) || b.createdAt.localeCompare(a.createdAt);

  function view(me: ID, code: unknown, filter: { instructor?: unknown; term?: unknown } = {}): CourseReviewsView {
    const u = mustUser(me);
    const c = courseOf(u, code);
    const all = io.reviews().filter((r) => r.schoolId === c.schoolId && r.slug === c.slug);
    const visible = all.filter((r) => shown(r, 'review'));
    const termOf = termCounts(visible);
    const isUnlocked = unlocked(me);
    const inst = typeof filter.instructor === 'string' ? filter.instructor : '';
    const term = typeof filter.term === 'string' ? filter.term : '';
    const filtered = visible.filter((r) => (!inst || r.instructor === inst) && (!term || r.term === term)).sort(helpfulFirst);
    const list = isUnlocked ? filtered : visible.filter((r) => r.authorId !== me).sort(helpfulFirst).slice(0, 1);
    return {
      course: { ...c, code: all[0]?.code ?? c.code },
      summary: summarize(visible),
      total: visible.length,
      locked: !isUnlocked,
      reviews: list.map((r) => card(r, me, termOf)),
      filters: {
        instructors: [...new Set(visible.flatMap((r) => (r.instructor ? [r.instructor] : [])))].sort(),
        terms: [...new Set(visible.map((r) => r.term))].sort((a, b) => termOrder(b) - termOrder(a)),
      },
      mine: all.filter((r) => r.authorId === me).sort((a, b) => termOrder(b.term) - termOrder(a.term)).map(mineOf),
      write: courseWrite(u, c.slug, now(), table()),
      ...(isUnlocked ? {} : { unlock: unlockInfo(u) }),
    };
  }

  function examView(me: ID, code: unknown): ExamInfoView {
    const u = mustUser(me);
    const c = courseOf(u, code);
    const all = io.exams().filter((x) => x.schoolId === c.schoolId && x.slug === c.slug);
    const visible = all.filter((x) => shown(x, 'exam'));
    const termOf = termCounts(visible);
    const isUnlocked = unlocked(me);
    const order = (a: ExamInfo, b: ExamInfo) => Number(!!b.tip) - Number(!!a.tip) || termOrder(b.term) - termOrder(a.term) || b.createdAt.localeCompare(a.createdAt);
    const list = isUnlocked ? [...visible].sort(order) : visible.filter((x) => x.authorId !== me).sort(order).slice(0, 1);
    return {
      course: { ...c, code: all[0]?.code ?? c.code },
      summary: summarizeExams(visible),
      total: visible.length,
      locked: !isUnlocked,
      tips: list.map((x) => tipView(x, me, termOf)),
      mine: all.filter((x) => x.authorId === me).map((x) => { const { mine: _m, term: _t, ...rest } = tipView(x, me, () => null); return { ...rest, term: x.term, code: x.code }; }),
      write: courseWrite(u, c.slug, now(), table()),
      ...(isUnlocked ? {} : { unlock: unlockInfo(u) }),
    };
  }

  /** 쓰기 전 공통 확인 — 수업·학기·인증·8주차 */
  const mayWrite = (me: ID, code: unknown, term: unknown) => {
    const u = mustUser(me);
    const c = courseOf(u, code);
    const t = String(term ?? '').trim();
    const st = writeState(u, c.slug, t, now(), table());
    if (!st.ok) throw new ReviewError(st.reason === 'not_open' || st.reason === 'no_dates' ? 409 : 403, st.message);
    const e = enrollments(u, now()).find((x) => codeSlug(x.code) === c.slug && x.term === t)!;
    return { u, c: { ...c, code: e.code }, term: t, e };
  };
  const oneOf = <T extends string>(v: unknown, list: readonly T[]): T | undefined => (typeof v === 'string' && (list as readonly string[]).includes(v) ? v as T : undefined);
  const scale = (v: unknown) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 5 ? n : undefined; };

  function saveReview(me: ID, input: ReviewInput): CourseReviewsView {
    const { c, term, e } = mayWrite(me, input?.code, input?.term);
    const rating = scale(input.rating);
    if (!rating) throw new ReviewError(400, 'Pick 1 to 5 stars.');
    const text = cleanText(input.text, REVIEW_LIMITS.textMax + 1);
    if (text.length < REVIEW_LIMITS.textMin) throw new ReviewError(400, `Write at least ${REVIEW_LIMITS.textMin} characters.`);
    if (text.length > REVIEW_LIMITS.textMax) throw new ReviewError(400, `Keep it under ${REVIEW_LIMITS.textMax} characters.`);
    const check = checkText(text, 'review');
    if (!check.ok) throw new ReviewError(400, check.message);
    const tags = [...new Set((Array.isArray(input.tags) ? input.tags : []).filter((t): t is ReviewTag => oneOf(t, REVIEW_TAGS) !== undefined))].slice(0, REVIEW_LIMITS.maxTags);
    const known = instructorsFor(me, c.code, term, e);
    const instructor = typeof input.instructor === 'string' && input.instructor.trim() ? input.instructor.trim() : undefined;
    if (instructor && !known.includes(instructor)) throw new ReviewError(400, 'Pick an instructor from the list.');
    budget(writes, me, REVIEW_LIMITS.writesPerDay, 'That’s a lot of reviews for one day — try again tomorrow.');
    const prev = io.reviews().find((r) => r.authorId === me && r.schoolId === c.schoolId && r.slug === c.slug && r.term === term);
    const at = now().toISOString();
    const recorded = input.recorded === true ? true : input.recorded === false ? false : undefined;
    const next: CourseReview = {
      id: prev?.id ?? io.uid('rv'), schoolId: c.schoolId, slug: c.slug, code: c.code, term, authorId: me,
      rating, text,
      ...(scale(input.difficulty) ? { difficulty: scale(input.difficulty) } : {}),
      ...(oneOf(input.workload, WORKLOADS) ? { workload: oneOf(input.workload, WORKLOADS) } : {}),
      ...(oneOf(input.grading, GRADINGS) ? { grading: oneOf(input.grading, GRADINGS) } : {}),
      ...(oneOf(input.attendance, ['taken', 'not_taken'] as const) ? { attendance: oneOf(input.attendance, ['taken', 'not_taken'] as const) } : {}),
      ...(recorded !== undefined ? { recorded } : {}),
      tags, ...(instructor ? { instructor } : {}),
      helpful: prev?.helpful ?? [],
      createdAt: prev?.createdAt ?? at, updatedAt: at,
      // 고친 글은 다시 거른다. 관리자가 숨긴 글은 고쳐도 숨김 그대로
      ...(check.hold ? { held: { reason: check.hold, at } } : {}),
      ...(prev?.hidden ? { hidden: prev.hidden } : {}),
    };
    io.putReview(next);
    if (check.hold && !prev?.held) io.onHeld?.('review', next, check.hold);
    return view(me, c.code);
  }

  function removeReview(me: ID, id: unknown): CourseReviewsView {
    const r = io.reviews().find((x) => x.id === String(id ?? ''));
    if (!r) throw new ReviewError(404, 'This review is gone.');
    if (r.authorId !== me) throw new ReviewError(403, 'You can only delete your own review.');
    io.dropReview(r.id);
    return view(me, r.code);
  }

  function helpful(me: ID, id: unknown): CourseReviewsView {
    const u = mustUser(me);
    if (awaitingVerification(u)) throw new ReviewError(403, 'You can do this once your student ID is checked.');
    const r = io.reviews().find((x) => x.id === String(id ?? ''));
    if (!r || !shown(r, 'review') || r.schoolId !== schoolOf(u)) throw new ReviewError(404, 'This review is gone.');
    if (r.authorId === me) throw new ReviewError(400, 'That’s your own review.');
    // 잠겨 있을 때는 보이는 한 개에만 누를 수 있다 — 볼 수 없는 리뷰에 누르지 못하게
    if (!unlocked(me) && view(me, r.code).reviews[0]?.id !== r.id) throw new ReviewError(403, REVIEW_COPY.lockedTitle);
    budget(helps, me, REVIEW_LIMITS.helpfulPerDay, 'Try again later.');
    const has = r.helpful.includes(me);
    io.putReview({ ...r, helpful: has ? r.helpful.filter((x) => x !== me) : [...r.helpful, me] });
    return view(me, r.code);
  }

  function saveExam(me: ID, input: ExamInput): ExamInfoView {
    const { c, term } = mayWrite(me, input?.code, input?.term);
    const midterms = Number(input.midterms);
    if (!Number.isInteger(midterms) || midterms < 0 || midterms > 3) throw new ReviewError(400, 'How many midterms?');
    if (typeof input.final !== 'boolean') throw new ReviewError(400, 'Was there a final?');
    const formats = [...new Set((Array.isArray(input.formats) ? input.formats : []).filter((f): f is ExamFormat => oneOf(f, EXAM_FORMATS) !== undefined))];
    const tip = cleanText(input.tip, REVIEW_LIMITS.tipMax + 1);
    if (tip.length > REVIEW_LIMITS.tipMax) throw new ReviewError(400, `Keep the tip under ${REVIEW_LIMITS.tipMax} characters.`);
    const check = tip ? checkText(tip, 'tip') : { ok: true as const };
    if (!check.ok) throw new ReviewError(400, check.message);
    const hold = 'hold' in check ? check.hold : undefined;
    budget(writes, me, REVIEW_LIMITS.writesPerDay, 'That’s a lot for one day — try again tomorrow.');
    const prev = io.exams().find((x) => x.authorId === me && x.schoolId === c.schoolId && x.slug === c.slug && x.term === term);
    const at = now().toISOString();
    const next: ExamInfo = {
      id: prev?.id ?? io.uid('ex'), schoolId: c.schoolId, slug: c.slug, code: c.code, term, authorId: me,
      midterms, final: input.final, formats, ...(oneOf(input.notes, ['open', 'closed'] as const) ? { notes: oneOf(input.notes, ['open', 'closed'] as const) } : {}),
      ...(tip ? { tip } : {}), createdAt: prev?.createdAt ?? at, updatedAt: at,
      ...(hold ? { held: { reason: hold, at } } : {}), ...(prev?.hidden ? { hidden: prev.hidden } : {}),
    };
    io.putExam(next);
    if (hold && !prev?.held) io.onHeld?.('exam', next, hold);
    return examView(me, c.code);
  }

  function removeExam(me: ID, id: unknown): ExamInfoView {
    const x = io.exams().find((e) => e.id === String(id ?? ''));
    if (!x) throw new ReviewError(404, 'This is gone.');
    if (x.authorId !== me) throw new ReviewError(403, 'You can only delete what you wrote.');
    io.dropExam(x.id);
    return examView(me, x.code);
  }

  /** 그 학기 그 수업 강사 — 학교 수업 목록 + 내 시간표에 적은 강사 */
  function instructorsFor(me: ID, code: unknown, term: unknown, e?: Enrollment): string[] {
    const u = mustUser(me);
    const c = courseOf(u, code);
    const t = String(term ?? '');
    const mine = (e ?? enrollments(u, now()).find((x) => codeSlug(x.code) === c.slug && x.term === t))?.meetings.flatMap((m) => (m.professor && !m.section ? [m.professor] : [])) ?? [];
    const names = [...(io.instructors?.(c.schoolId, c.slug, t) ?? []), ...mine].flatMap((s) => s.split(/\s*[;,]\s*|\s+and\s+/)).map((s) => s.trim()).filter((s) => s && s.length <= 80 && !/^(staff|tba|tbd|the staff)$/i.test(s));
    return [...new Set(names)].sort();
  }

  /** 학기 말 안내의 단계 화면 — 그 학기 내 수업 (코드가 있는 것) */
  function termPrompt(me: ID, term: unknown): TermPromptView {
    const u = mustUser(me);
    const t = String(term ?? '').trim();
    const list = enrollments(u, now()).filter((e) => e.term === t);
    return { term: t, classes: list.map((e) => cls(u, e)), write: Object.fromEntries(list.map((e) => [codeSlug(e.code), writeState(u, codeSlug(e.code), t, now(), table())])) };
  }

  /** 목록 줄 별점 — 학교 하나의 과목 slug → ★ (3개 이상만) */
  function stars(schoolId: ID, slugs?: string[]): Record<string, { avg: number; count: number }> {
    const want = slugs?.length ? new Set(slugs.map((s) => codeSlug(String(s)))) : null;
    const by = new Map<string, CourseReview[]>();
    for (const r of io.reviews()) {
      if (r.schoolId !== schoolId || (want && !want.has(r.slug)) || !shown(r, 'review')) continue;
      (by.get(r.slug) ?? by.set(r.slug, []).get(r.slug)!).push(r);
    }
    const out: Record<string, { avg: number; count: number }> = {};
    for (const [slug, list] of by) { const s = listStars(list.length, summarize(list).avg); if (s) out[slug] = s; }
    return out;
  }

  /** 계정 삭제 — 그 사람의 리뷰·시험 정보를 지우고, 남의 리뷰에 누른 도움돼요도 뺀다 */
  function forgetUser(userId: ID): { courseReviews: number; examInfos: number; helpfulVotes: number } {
    let reviews = 0, exams = 0, votes = 0;
    for (const r of [...io.reviews()]) {
      if (r.authorId === userId) { io.dropReview(r.id); reviews++; continue; }
      if (r.helpful.includes(userId)) { io.putReview({ ...r, helpful: r.helpful.filter((x) => x !== userId) }); votes++; }
    }
    for (const x of [...io.exams()]) if (x.authorId === userId) { io.dropExam(x.id); exams++; }
    writes.delete(userId); helps.delete(userId);
    return { courseReviews: reviews, examInfos: exams, helpfulVotes: votes };
  }

  return { view, examView, saveReview, removeReview, helpful, saveExam, removeExam, instructorsFor, termPrompt, stars, forgetUser, unlocked, reviewable: (me: ID) => { const u = io.user(me); return u ? reviewable(u) : []; } };
}
export type CourseReviewsEngine = ReturnType<typeof createCourseReviews>;

/** 학기 말 안내 문구 — "Review CS 61A, MATH 1A…" */
export function promptBody(codes: string[]): string {
  const head = codes.slice(0, 2).join(', ');
  return `Review ${head}${codes.length > 2 ? '…' : ''}`;
}
