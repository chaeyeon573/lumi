/**
 * 수업 리뷰 · 시험 정보 (course page › Reviews · Exam info) — 저장, 주소, 신고 연결, 학기 말 안내.
 * 규칙은 @core/lib/coursereviews (서버와 목업이 같이 쓴다). 학기 날짜는 @core/data/termdates.
 *
 *   POST /api/reviews/view          { code, instructor?, term? }  → CourseReviewsView (보는 사람 기준, 글쓴이 id 없음)
 *   POST /api/reviews/save          ReviewInput                   → CourseReviewsView (한 사람·수업·학기에 하나 — 다시 쓰면 고친다)
 *   POST /api/reviews/remove        { id }                        → CourseReviewsView
 *   POST /api/reviews/helpful       { id }                        → CourseReviewsView (누르기·취소, 한 사람 한 번)
 *   POST /api/reviews/exam          { code }                      → ExamInfoView
 *   POST /api/reviews/exam/save     ExamInput                     → ExamInfoView
 *   POST /api/reviews/exam/remove   { id }                        → ExamInfoView
 *   POST /api/reviews/instructors   { code, term }                → { instructors } (그 학기 학교 수업 목록 + 내 시간표)
 *   POST /api/reviews/term          { term }                      → TermPromptView (학기 말 안내의 단계 화면)
 *   POST /api/reviews/stars         { codes? }                    → { stars: { [slug]: { avg, count } } } (리뷰 3개 이상인 수업만)
 *   POST /api/reviews/past          {}                            → PastClassesView (리뷰용 지난 수업 — 시간표·같은 수업 학생·수에는 없다)
 *   POST /api/reviews/past/add      { code, term, name? }         → PastClassesView (최근 4학기, 인증 학생, 하루 10개 · 모두 30개)
 *   POST /api/reviews/past/remove   { code, term }                → PastClassesView
 *   GET  /admin/reviews · GET /api/admin/reviews/metrics (x-admin-key) → 학기별 수: 안내 · 14일 안에 쓴 학생 · 리뷰 · 글 % · 3개 이상 수업
 *
 * 저장: store 문서 묶음 courseReviews · examInfos · reviewPrompts (스냅샷 밖 — 모든 사람의 bootstrap 에 싣지 않는다).
 * 글쓴이 id 는 이 파일과 /admin/reports 에만 있다. 화면에 가는 모양은 @core/lib/coursereviews 의 …View 뿐.
 *
 * 신고: POST /api/rpc/reports/create 의 targetType 'review' · 'exam' (server/moderation.ts registerReportTarget).
 *   서로 다른 실제 계정 3명이 신고하면 관리자 확인 전까지 숨김. 관리자는 /admin/reports 에서 Dismiss(다시 보임) · Hide(글쓴이만) · Remove(삭제).
 *   자동 거르기(학생 이름 · 시험 문제 같은 글)에 걸리면 숨긴 채 저장하고 'system' 신고를 하나 남겨 같은 목록에 올린다.
 *
 * 학기 말 안내 (startReviewPromptJob, 한 시간마다, 캠퍼스 시간 10–20시):
 *   마지막 수업일부터 60일 동안, 그 학기 Lumi 시간표에 과목 코드가 있는 수업이 있는 인증 학생에게 학기당 알림 하나
 *   ("How were your classes?" / "Review CS 61A, MATH 1A…") → /reviews/term?term=… (수업마다 Skip 이 있는 단계 화면).
 *   7일 뒤에도 그 학기 리뷰·시험 정보를 하나도 안 썼으면 한 번 더 — 그 뒤로는 없다. 보낸 기록은 reviewPrompts (재시작해도 다시 보내지 않는다).
 *
 * 계정을 지우면 forgetUser 가 그 사람의 리뷰·시험 정보·안내 기록과 남의 리뷰에 누른 도움돼요를 지운다.
 */
import type { Express, Request, Response, NextFunction } from 'express';
import type { CatalogCourse, Patch, Snapshot } from '@core/api/types';
import type { ID, Notification, User } from '@core/types';
import {
  createCourseReviews, promptBody, ReviewError, verifiedStudent,
  type CourseReview, type ExamInfo, type ExamInput, type PastClass, type ReviewInput,
} from '@core/lib/coursereviews';
import { codeSlug, enrollments, normalizeCode, schoolOf } from '@core/lib/classmates';
import { addDays, campusDate } from '@core/lib/academic';
import { normalizeTermLabel, termOrder as termOrderOf } from '@core/lib/terms';
import { TERM_DATES, type TermDates } from '@core/data/termdates';
import { uid } from '@core/lib/format';
import type { Store } from './store';
import { AUTO_HIDE_REPORTS, adminName, checkAdmin, fileReport, ModerationError, moderationState, realReporters, registerReportTarget, type TargetInfo } from './moderation';
import { reviewsAdminPageHtml } from './coursereviews-page';

export const COURSE_REVIEWS = 'courseReviews';
export const EXAM_INFOS = 'examInfos';
export const REVIEW_PROMPTS = 'reviewPrompts';
/** 리뷰용으로 넣은 지난 수업 — 사람마다 문서 하나 { id: userId, classes }. 시간표(user.timetable)가 아니다 */
export const REVIEW_CLASSES = 'reviewClasses';
/** 측정: 안내를 받고 며칠 안에 썼는지 */
export const METRIC_WINDOW_DAYS = 14;
interface PastClassesDoc { id: ID; classes: PastClass[] }
/** 마지막 수업일 뒤 며칠까지 첫 안내를 보내나 (그 뒤에 처음 시간표를 넣은 사람에게는 보내지 않는다) */
export const PROMPT_WINDOW_DAYS = 60;
export const REMINDER_AFTER_DAYS = 7;

/** 학기 말 안내 기록 — 사람·학기마다 하나. 알림은 첫 안내 하나 + 다시 한 번까지 */
export interface ReviewPromptDoc { id: string; userId: ID; schoolId: ID; term: string; sentAt?: string; remindedAt?: string; skipped?: 'nothing_left' }

type Db = Pick<Snapshot, 'users' | 'reports' | 'notifications'> & Partial<Snapshot>;
export interface CourseReviewsDeps {
  db: () => Db;
  store: Pick<Store, 'listDocs' | 'putDocs' | 'removeDocs'>;
  /** 저장하고 보낸다 (알림·시스템 신고) */
  push?(patch: Patch): void;
  /** 그 학교 수업 목록 (강사 이름) */
  catalog?(schoolId: ID): CatalogCourse[];
  now?(): Date;
  termDates?: readonly TermDates[];
  /** 같이 쓰는 데모 로그인 (App Review) — 볼 수는 있어도 리뷰를 쓰지 않고 학기 말 안내도 받지 않는다 (예시 프로필처럼) */
  sharedLogins?: ReadonlySet<ID>;
}

const save = (store: CourseReviewsDeps['store'], col: string, item: { id: string }) => void store.putDocs(col, [item]).catch((e) => console.error(`[reviews] save ${col} failed`, e));
const drop = (store: CourseReviewsDeps['store'], col: string, id: string) => void store.removeDocs(col, [id]).catch((e) => console.error(`[reviews] delete ${col} failed`, e));
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function createCourseReviewsService(deps: CourseReviewsDeps) {
  const reviews = new Map<ID, CourseReview>();
  const exams = new Map<ID, ExamInfo>();
  const prompts = new Map<string, ReviewPromptDoc>();
  const past = new Map<ID, PastClass[]>();
  const now = () => deps.now?.() ?? new Date();
  const table = () => deps.termDates ?? TERM_DATES;
  const userOf = (id: ID) => { const u = deps.db().users.find((x) => x.id === id); return u && deps.sharedLogins?.has(id) ? { ...u, sample: true } : u; };

  const engine = createCourseReviews({
    reviews: () => [...reviews.values()],
    exams: () => [...exams.values()],
    putReview(r) { reviews.set(r.id, r); save(deps.store, COURSE_REVIEWS, r); },
    dropReview(id) { reviews.delete(id); drop(deps.store, COURSE_REVIEWS, id); },
    putExam(x) { exams.set(x.id, x); save(deps.store, EXAM_INFOS, x); },
    dropExam(id) { exams.delete(id); drop(deps.store, EXAM_INFOS, id); },
    user: userOf,
    instructors(schoolId, slug, term) {
      return (deps.catalog?.(schoolId) ?? []).filter((c) => codeSlug(c.code) === slug && normalizeTermLabel(c.term) === term && c.instructor).map((c) => c.instructor!);
    },
    // 정지·검토 대기·지운 계정의 글은 다른 사람에게 보이지 않는다
    authorHidden(authorId) { const db = deps.db(); return !db.users.some((u) => u.id === authorId) || moderationState(db as Snapshot).suspended.has(authorId); },
    reportCount: (type, id, authorId) => realReporters(deps.db(), type, id, authorId).size,
    onHeld(type, item, reason) {
      // 관리자 목록(/admin/reports)에 올린다 — 'system' 신고 하나. 알림 메일은 보내지 않는다 (모아서 보는 목록)
      const filed = fileReport(deps.db() as Snapshot, 'system', type, item.id, `Auto-filter: ${reason} — hidden until an admin checks it`, now());
      if (filed.created) { deps.push?.(filed.patch); console.log(`[reviews] held ${type} ${item.id} (${reason}) → ${filed.report.id}`); }
    },
    pastClasses: (userId) => past.get(userId) ?? [],
    putPastClasses(userId, list) {
      if (list.length) { past.set(userId, list); save(deps.store, REVIEW_CLASSES, { id: userId, classes: list } as PastClassesDoc); }
      else { past.delete(userId); drop(deps.store, REVIEW_CLASSES, userId); }
    },
    uid,
    now,
    termDates: deps.termDates,
  });

  // ─── /admin/reports 연결 ───
  const stateOf = (type: 'review' | 'exam', x: CourseReview | ExamInfo): TargetInfo['state'] =>
    x.hidden ? 'hidden' : x.held ? 'held' : realReporters(deps.db(), type, x.id, x.authorId).size >= AUTO_HIDE_REPORTS ? 'auto_hidden' : 'visible';
  const target = (type: 'review' | 'exam') => ({
    locate(id: ID): TargetInfo {
      const x = type === 'review' ? reviews.get(id) : exams.get(id);
      if (!x) return { exists: false, excerpt: '' };
      const body = 'rating' in x ? `${x.rating}★${x.tags.length ? ` [${x.tags.join(', ')}]` : ''}${x.text ? ` — ${x.text}` : ' (no text)'}` : `exam info — ${x.midterms} midterm(s), final ${x.final ? 'yes' : 'no'}${x.tip ? ` — ${x.tip}` : ''}`;
      return { exists: true, kind: type, ownerId: x.authorId, excerpt: clip(`${x.code} · ${x.term}${x.held ? ` [held: ${x.held.reason}]` : ''} · ${body}`.replace(/\s+/g, ' '), 400), state: stateOf(type, x) };
    },
    remove(id: ID) {
      if (type === 'review' ? !reviews.has(id) : !exams.has(id)) return false;
      if (type === 'review') { reviews.delete(id); drop(deps.store, COURSE_REVIEWS, id); } else { exams.delete(id); drop(deps.store, EXAM_INFOS, id); }
      return true;
    },
    hide(id: ID, by: string) {
      const at = now().toISOString();
      if (type === 'review') { const r = reviews.get(id); if (!r) return false; const n = { ...r, hidden: { by, at } }; reviews.set(id, n); save(deps.store, COURSE_REVIEWS, n); }
      else { const x = exams.get(id); if (!x) return false; const n = { ...x, hidden: { by, at } }; exams.set(id, n); save(deps.store, EXAM_INFOS, n); }
      return true;
    },
    /** Dismiss — 거르기 보류를 푼다 (관리자가 숨긴 것은 그대로) */
    release(id: ID) {
      if (type === 'review') { const r = reviews.get(id); if (r?.held) { const { held: _h, ...n } = r; reviews.set(id, n); save(deps.store, COURSE_REVIEWS, n); } }
      else { const x = exams.get(id); if (x?.held) { const { held: _h, ...n } = x; exams.set(id, n); save(deps.store, EXAM_INFOS, n); } }
    },
  });
  registerReportTarget('review', target('review'));
  registerReportTarget('exam', target('exam'));

  // ─── 학기 말 안내 ───
  const notify = (userId: ID, title: string, body: string, link: string): Notification => {
    const nt: Notification = { id: uid('nt'), userId, type: 'course_review', title, body, link, read: false, createdAt: now().toISOString() };
    deps.db().notifications.unshift(nt);
    return nt;
  };
  /** 그 학기에 리뷰나 시험 정보를 하나라도 썼는지 */
  const wroteFor = (userId: ID, term: string) => [...reviews.values()].some((r) => r.authorId === userId && r.term === term) || [...exams.values()].some((x) => x.authorId === userId && x.term === term);

  /**
   * 한 바퀴 — 보낸 알림. 학기마다: 마지막 수업일 ≤ 오늘 ≤ +60일, 인증 학생, 그 학기 과목 코드 수업이 있는 사람.
   * 첫 안내 한 번, 7일 뒤 아무것도 안 썼으면 한 번 더. 기록이 있으면 다시 보내지 않는다.
   */
  function promptRound(): Notification[] {
    const t = now();
    const today = campusDate(t);
    const sent: Notification[] = [];
    for (const td of table()) {
      if (!td.verified || today < td.lastInstruction || today > addDays(td.lastInstruction, PROMPT_WINDOW_DAYS)) continue;
      const link = `/reviews/term?term=${encodeURIComponent(td.term)}`;
      for (const u of deps.db().users) {
        if (deps.sharedLogins?.has(u.id)) continue;
        if (schoolOf(u) !== td.schoolId || !verifiedStudent(u) || u.suspended) continue;
        const id = `${u.id}|${td.schoolId}|${td.term}`;
        const rec = prompts.get(id);
        if (rec?.remindedAt || rec?.skipped) continue;
        const classes = enrollments(u, t).filter((e) => e.term === td.term);
        if (!classes.length) continue;
        if (!rec) {
          // 이미 다 썼으면 보내지 않고 끝 (기록만)
          const left = classes.filter((e) => ![...reviews.values()].some((r) => r.authorId === u.id && r.slug === codeSlug(e.code) && r.term === td.term));
          if (!left.length) { const doc: ReviewPromptDoc = { id, userId: u.id, schoolId: td.schoolId, term: td.term, skipped: 'nothing_left' }; prompts.set(id, doc); save(deps.store, REVIEW_PROMPTS, doc); continue; }
          sent.push(notify(u.id, 'How were your classes?', promptBody(left.map((e) => e.code)), link));
          const doc: ReviewPromptDoc = { id, userId: u.id, schoolId: td.schoolId, term: td.term, sentAt: t.toISOString() };
          prompts.set(id, doc); save(deps.store, REVIEW_PROMPTS, doc);
        } else if (rec.sentAt && t.getTime() - Date.parse(rec.sentAt) >= REMINDER_AFTER_DAYS * 86_400_000) {
          const doc: ReviewPromptDoc = { ...rec, remindedAt: t.toISOString() };
          prompts.set(id, doc); save(deps.store, REVIEW_PROMPTS, doc);
          if (wroteFor(u.id, td.term)) continue; // 썼으면 다시 묻지 않는다 — 기록만 닫는다
          sent.push(notify(u.id, `A minute for your ${td.term} classes?`, `${promptBody(classes.map((e) => e.code))} — it unlocks everyone’s reviews.`, link));
        }
      }
    }
    if (sent.length) deps.push?.({ notifications: sent });
    return sent;
  }

  return {
    ...engine,
    promptRound,
    async load() {
      reviews.clear(); exams.clear(); prompts.clear();
      for (const r of await deps.store.listDocs<CourseReview>(COURSE_REVIEWS)) reviews.set(r.id, r);
      for (const x of await deps.store.listDocs<ExamInfo>(EXAM_INFOS)) exams.set(x.id, x);
      for (const p of await deps.store.listDocs<ReviewPromptDoc>(REVIEW_PROMPTS)) prompts.set(p.id, p);
      past.clear();
      for (const d of await deps.store.listDocs<PastClassesDoc>(REVIEW_CLASSES)) if (d.classes?.length) past.set(d.id, d.classes);
      console.log(`[reviews] ${reviews.size} course reviews, ${exams.size} exam infos, ${prompts.size} term prompts`);
    },
    /** 계정 삭제 — 리뷰·시험 정보·도움돼요 + 안내 기록 */
    forgetUser(userId: ID) {
      const out = engine.forgetUser(userId);
      if (past.delete(userId)) drop(deps.store, REVIEW_CLASSES, userId);
      for (const p of [...prompts.values()]) if (p.userId === userId) { prompts.delete(p.id); drop(deps.store, REVIEW_PROMPTS, p.id); }
      return out;
    },
    /** Download your data — 내가 쓴 것만 (도움돼요 누른 사람 목록은 수로) */
    exportFor(userId: ID) {
      return {
        courseReviews: [...reviews.values()].filter((r) => r.authorId === userId).map(({ authorId: _a, helpful, ...r }) => ({ ...r, helpful: helpful.length })),
        examInfos: [...exams.values()].filter((x) => x.authorId === userId).map(({ authorId: _a, ...x }) => x),
        pastClassesForReview: past.get(userId) ?? [],
      };
    },
    /**
     * /admin/reviews — 학기별 수만 (글쓴이 정보 없음): 안내 받은 학생 · 14일 안에 1개 이상 쓴 학생(수·%) · 리뷰 수 ·
     * 글이 있는 리뷰 % · 리뷰 3개 이상인 수업 수. 관리자가 지운 리뷰는 없으니 세지 않는다. 숨긴 것도 리뷰로 센다 (쓴 것)
     */
    metrics(): ReviewMetrics {
      const all = [...reviews.values()];
      const terms = new Set<string>([...all.map((r) => r.term), ...[...prompts.values()].filter((p) => p.sentAt).map((p) => p.term)]);
      const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : null);
      const courses3 = (list: CourseReview[]) => {
        const m = new Map<string, number>();
        for (const r of list) m.set(`${r.schoolId}|${r.slug}`, (m.get(`${r.schoolId}|${r.slug}`) ?? 0) + 1);
        return [...m.values()].filter((n) => n >= 3).length;
      };
      const rows = [...terms].sort((a, b) => termOrderOf(b) - termOrderOf(a)).map((term) => {
        const sent = [...prompts.values()].filter((p) => p.term === term && p.sentAt);
        const wrote = sent.filter((p) => {
          const from = Date.parse(p.sentAt!), to = from + METRIC_WINDOW_DAYS * 86_400_000;
          return all.some((r) => r.authorId === p.userId && Date.parse(r.createdAt) >= from && Date.parse(r.createdAt) <= to);
        }).length;
        const list = all.filter((r) => r.term === term);
        return { term, prompted: sent.length, wroteWithin14Days: wrote, wrotePct: pct(wrote, sent.length), reviews: list.length, withTextPct: pct(list.filter((r) => r.text).length, list.length), coursesWith3Plus: courses3(list) };
      });
      return { windowDays: METRIC_WINDOW_DAYS, terms: rows, total: { reviews: all.length, withTextPct: pct(all.filter((r) => r.text).length, all.length), coursesWith3Plus: courses3(all), examInfos: exams.size } };
    },
    /** 테스트용 */
    raw: () => ({ reviews: [...reviews.values()], exams: [...exams.values()], prompts: [...prompts.values()], past: [...past.entries()] }),
  };
}
export type CourseReviewsService = ReturnType<typeof createCourseReviewsService>;
export interface ReviewMetrics {
  windowDays: number;
  terms: { term: string; prompted: number; wroteWithin14Days: number; wrotePct: number | null; reviews: number; withTextPct: number | null; coursesWith3Plus: number }[];
  total: { reviews: number; withTextPct: number | null; coursesWith3Plus: number; examInfos: number };
}

/** 학기 말 안내 — 한 시간마다, 캠퍼스 시간 10–20시에만 (밤에 알림이 가지 않게). REVIEW_PROMPT_MINUTES=0 이면 끔 */
export function startReviewPromptJob(svc: Pick<CourseReviewsService, 'promptRound'>, env: NodeJS.ProcessEnv = process.env) {
  const minutes = Number(env.REVIEW_PROMPT_MINUTES ?? 60);
  if (!minutes) { console.log('[reviews] term prompts off'); return; }
  const tick = () => {
    try {
      const hour = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Los_Angeles', hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
      if (hour < 10 || hour >= 20) return;
      const n = svc.promptRound();
      if (n.length) console.log(`[reviews] ${n.length} end-of-term review prompts`);
    } catch (e) { console.error('[reviews] term prompts failed', e); }
  };
  setTimeout(tick, 90_000).unref?.();
  return setInterval(tick, minutes * 60_000).unref?.();
}

type Req = Request & { userId?: ID };
type Handler = (req: Req, res: Response) => Promise<unknown> | unknown;
/** 검토 대기 계정도 읽기는 된다 (server/idverify.ts pendingGate 가 이 경로만 통과시킨다) */
export const REVIEW_READ_PATHS: ReadonlySet<string> = new Set(['/view', '/exam', '/instructors', '/term', '/stars', '/past']);

export function registerCourseReviewRoutes(app: Express, svc: CourseReviewsService, deps: {
  auth: (req: Request, res: Response, next: NextFunction) => unknown;
  wrap: (fn: Handler) => (req: Request, res: Response, next: NextFunction) => unknown;
  requireUser: (req: Req) => ID;
  bad: (msg: string, status?: number) => Error;
  db: () => Pick<Snapshot, 'users'>;
  env?: () => NodeJS.ProcessEnv;
}) {
  const route = (path: string, fn: (me: ID, body: Record<string, unknown>) => unknown) =>
    app.post(`/api/reviews/${path}`, deps.auth, deps.wrap((req) => {
      const me = deps.requireUser(req);
      try { return fn(me, (req.body ?? {}) as Record<string, unknown>); } catch (e) { throw e instanceof ReviewError ? deps.bad(e.message, e.status) : e; }
    }));
  route('view', (me, b) => svc.view(me, b.code, { instructor: b.instructor, term: b.term }));
  route('save', (me, b) => svc.saveReview(me, b as unknown as ReviewInput));
  route('remove', (me, b) => svc.removeReview(me, b.id));
  route('helpful', (me, b) => svc.helpful(me, b.id));
  route('exam', (me, b) => svc.examView(me, b.code));
  route('exam/save', (me, b) => svc.saveExam(me, b as unknown as ExamInput));
  route('exam/remove', (me, b) => svc.removeExam(me, b.id));
  route('instructors', (me, b) => ({ instructors: svc.instructorsFor(me, b.code, b.term) }));
  route('term', (me, b) => svc.termPrompt(me, b.term));
  route('past', (me) => svc.pastClasses(me));
  route('past/add', (me, b) => svc.addPastClass(me, { code: b.code, term: b.term, name: b.name }));
  route('past/remove', (me, b) => svc.removePastClass(me, b.code, b.term));
  route('stars', (me, b) => {
    const u: User | undefined = deps.db().users.find((x) => x.id === me);
    const school = u ? schoolOf(u) : '';
    const codes = Array.isArray(b.codes) ? b.codes.slice(0, 500).map((c) => codeSlug(normalizeCode(String(c)))) : undefined;
    return { stars: school ? svc.stars(school, codes) : {} };
  });

  // ─── /admin/reviews — 수만 (ADMIN_KEY). 페이지에는 데이터가 없다: 키를 받아 API 를 부른다 ───
  app.get('/admin/reviews', (_req, res) => {
    res.set({
      'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer',
      'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    });
    res.type('html').send(reviewsAdminPageHtml());
  });
  app.get('/api/admin/reviews/metrics', (req, res) => {
    try { checkAdmin(req, deps.env?.() ?? process.env); void adminName(req); res.set('cache-control', 'no-store').json(svc.metrics()); }
    catch (e) { const status = e instanceof ModerationError ? e.status : 500; res.status(status).json({ error: e instanceof Error && status !== 500 ? e.message : 'Something went wrong.' }); }
  });
}
