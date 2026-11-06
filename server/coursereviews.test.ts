/**
 * 수업 리뷰 · 시험 정보 — 누가 쓰나(인증·시간표·8주차), 하나만, 익명(글쓴이 id 없음), 잠금, 3개 규칙, 신고 3번 숨김,
 * 텍스트 거르기, 계정 삭제, 학기 말 안내(한 번 + 다시 한 번까지), HTTP 주소.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Snapshot } from '@core/api/types';
import type { Course, ID, User } from '@core/types';
import * as seed from '@core/data/seed.en';
import { REVIEW_LIMITS, ReviewError, checkText, type ReviewInput } from '@core/lib/coursereviews';
import { TERM_DATES, termDatesFor } from '@core/data/termdates';
import { createCourseReviewsService, registerCourseReviewRoutes, COURSE_REVIEWS, EXAM_INFOS, REVIEW_PROMPTS } from './coursereviews';
import { AUTO_HIDE_REPORTS, dismissReport, fileReport, hideReported, removeReported } from './moderation';
import { pendingGate } from './idverify';

const FALL = 'Fall 2026';
/** 2026-11-06 낮 (캠퍼스 시간) — Fall 2026 8주차(10/12) 이후 */
const NOV6 = new Date('2026-11-06T20:00:00Z');
const OCT1 = new Date('2026-10-01T20:00:00Z');

const cls = (code: string, name: string, term = FALL, day = 0, extra: Partial<Course> = {}): Course => ({ id: `${code}_${term}_${day}`.replace(/\s/g, ''), name: `${code} ${name}`, code, term, day, start: '13:00', end: '14:00', hue: 220, ...extra });
const cs61a = cls('CS 61A', 'Structure and Interpretation', FALL, 0, { professor: 'John DeNero' });
const math1a = cls('MATH 1A', 'Calculus', FALL, 1);
const spring = cls('CS 61B', 'Data Structures', 'Spring 2027', 2);

function student(id: string, timetable: Course[], extra: Partial<User> = {}, verified = true, schoolId = 's_berkeley'): User {
  const base = structuredClone(seed.users.find((u) => u.id === 'u_jimin')!);
  return { ...base, id, nickname: id.toUpperCase(), sample: false, timetable, ...extra,
    affiliation: { ...base.affiliation, schoolId, schoolName: 'UC Berkeley', emailVerified: verified } as User['affiliation'] };
}

function setup(now = NOV6) {
  const clock = { now };
  const users = [
    student('u_a', [cs61a, math1a]), student('u_b', [cs61a]), student('u_c', [cs61a]), student('u_d', [cs61a]), student('u_e', [cs61a]),
    student('u_x', [math1a]),
    student('u_n', [cs61a], {}, false),
    student('u_p', [cs61a], { verification: { method: 'student_id', status: 'pending' } }, false),
    student('u_s', [cs61a], { sample: true }),
    student('u_m', [cls('CSE 15', 'Intro')], {}, true, 's_ucmerced'),
    student('u_fresh', [cs61a]),
  ];
  const d = { users, reports: [], notifications: [], posts: [], activities: [], opportunities: [], chatRooms: [], rides: [], participations: [], opportunityIntents: [],
    relationships: { ...structuredClone(seed.relationships), blocks: [] } } as unknown as Snapshot;
  const docs = new Map<string, Map<string, { id: string }>>();
  const col = (c: string) => docs.get(c) ?? docs.set(c, new Map()).get(c)!;
  const store = {
    async listDocs<T>(c: string) { return [...col(c).values()] as T[]; },
    async putDocs(c: string, items: { id: string }[]) { for (const i of items) col(c).set(i.id, structuredClone(i)); },
    async removeDocs(c: string, ids: string[]) { for (const i of ids) col(c).delete(i); },
  };
  const pushed: { notifications?: unknown[]; reports?: unknown[] }[] = [];
  const catalog = [{ id: 'k1', schoolId: 's_berkeley', code: 'CS 61A', title: 'SICP', department: 'CS', instructor: 'John DeNero', meetings: [], term: FALL }];
  const svc = createCourseReviewsService({ db: () => d, store, push: (p) => pushed.push(p as never), now: () => clock.now, catalog: () => catalog });
  return { d, svc, docs: col, pushed, clock };
}
const text = (s = 'Weekly labs and projects. Go to discussion and start the projects early — the last one takes a full week.') => s;
const review = (code = 'CS 61A', extra: Partial<ReviewInput> = {}): ReviewInput => ({ code, term: FALL, rating: 5, text: text(), ...extra });
const denied = (fn: () => unknown, status: number, msg?: RegExp) => assert.throws(fn, (e: unknown) => e instanceof ReviewError && e.status === status && (!msg || msg.test(e.message)));

test('term dates: Berkeley Fall 2026 comes from the registrar calendar and week 8 is a Monday after instruction begins', () => {
  const fall = termDatesFor('s_berkeley', FALL)!;
  assert.equal(fall.verified, true);
  assert.equal(fall.start, '2026-08-26');
  assert.equal(fall.lastInstruction, '2026-12-11');
  assert.equal(new Date(`${fall.week8}T12:00:00Z`).getUTCDay(), 1);
  for (const t of TERM_DATES) assert.ok(t.start < t.week8 && t.week8 < t.lastInstruction, t.term);
  assert.equal(termDatesFor('s_ucmerced', FALL), undefined);
});

test('reviews: only verified students with the class in that term, from week 8', () => {
  const { svc, clock } = setup(OCT1);
  denied(() => svc.saveReview('u_a', review()), 409, /from Mon, Oct 12/);
  clock.now = NOV6;
  assert.equal(svc.saveReview('u_a', review()).mine.length, 1);
  denied(() => svc.saveReview('u_n', review()), 403, /Verify your school email/);
  denied(() => svc.saveReview('u_p', review()), 403, /student ID/);
  denied(() => svc.saveReview('u_s', review()), 403);
  denied(() => svc.saveReview('u_x', review()), 403, /Add this class/);
  // the class is in the schedule, but for another term
  denied(() => svc.saveReview('u_a', review('CS 61A', { term: 'Spring 2027' })), 403);
  // a school without confirmed term dates does not open reviews (and says so)
  denied(() => svc.saveReview('u_m', review('CSE 15')), 409, /term dates/);
  // required fields
  denied(() => svc.saveReview('u_b', review('CS 61A', { rating: 0 })), 400, /stars/);
  denied(() => svc.saveReview('u_b', review('CS 61A', { text: 'Too short.' })), 400, /50/);
  denied(() => svc.saveReview('u_b', review('CS 61A', { text: 'x'.repeat(2001) })), 400, /2000/);
  denied(() => svc.saveReview('u_b', review('CS 61A', { instructor: 'Someone Else' })), 400, /instructor/);
  assert.deepEqual(svc.instructorsFor('u_b', 'CS 61A', FALL), ['John DeNero']);
  assert.equal(svc.saveReview('u_b', review('CS 61A', { instructor: 'John DeNero', workload: '10+', grading: 'curved', tags: ['labs', 'labs', 'nope'] })).mine[0].instructor, 'John DeNero');
});

test('reviews: one per person, course and term — writing again edits it; the author can delete it', () => {
  const { svc, docs } = setup();
  const first = svc.saveReview('u_a', review());
  const again = svc.saveReview('u_a', review('cs61a', { rating: 3, text: text('Second take: still lots of projects but the exams were fair if you did the practice ones.') }));
  assert.equal(docs(COURSE_REVIEWS).size, 1);
  assert.equal(again.mine.length, 1);
  assert.equal(again.mine[0].id, first.mine[0].id);
  assert.equal(again.mine[0].rating, 3);
  denied(() => svc.removeReview('u_b', first.mine[0].id), 403);
  assert.equal(svc.removeReview('u_a', first.mine[0].id).mine.length, 0);
  assert.equal(docs(COURSE_REVIEWS).size, 0);
});

test('reviews: the author id never reaches a client — views, counts, helpful lists, exam info, stars, prompts, HTTP', async () => {
  const { svc, d } = setup();
  for (const u of ['u_a', 'u_b', 'u_c']) svc.saveReview(u, review());
  svc.saveExam('u_a', { code: 'CS 61A', term: FALL, midterms: 2, final: true, formats: ['coding', 'short_answer'], notes: 'closed', tip: 'Do every past exam under time.' });
  const r = svc.view('u_b', 'CS 61A').reviews.find((x) => !x.mine)!;
  svc.helpful('u_b', r.id);
  const payloads = [svc.view('u_b', 'CS 61A'), svc.view('u_x', 'CS 61A'), svc.examView('u_b', 'CS 61A'), svc.examView('u_x', 'CS 61A'), svc.stars('s_berkeley'), svc.termPrompt('u_b', FALL)];
  for (const p of payloads) {
    const json = JSON.stringify(p);
    for (const id of ['u_a', 'u_c']) assert.ok(!json.includes(id), `${id} leaked in ${json.slice(0, 120)}`);
    assert.ok(!/authorId|nickname/.test(json));
  }
  // helpful = a count and "did I", never who
  const card = svc.view('u_b', 'CS 61A').reviews.find((x) => x.id === r.id)!;
  assert.equal(card.helpful, 1); assert.equal(card.helpedByMe, true);
  assert.equal(svc.view('u_c', 'CS 61A').reviews.find((x) => x.id === r.id)!.helpedByMe, false);
  // HTTP: same shape on the wire
  const app = express();
  app.use(express.json());
  const auth = (req: express.Request & { userId?: ID }, _res: express.Response, next: express.NextFunction) => { req.userId = req.get('x-user') || undefined; next(); };
  class HttpError extends Error { constructor(public status: number, m: string) { super(m); } }
  const bad = (m: string, s = 400) => new HttpError(s, m);
  const wrap = (fn: (req: express.Request & { userId?: ID }, res: express.Response) => unknown) => async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try { const out = await fn(req, res); if (!res.headersSent) res.json(out ?? {}); } catch (e) { next(e); }
  };
  app.use('/api/reviews', auth, pendingGate(() => d));
  registerCourseReviewRoutes(app, svc, { auth, wrap, bad, db: () => d, requireUser: (req) => { if (!req.userId) throw bad('Sign in first', 401); return req.userId; } });
  app.use((e: HttpError, _req: express.Request, res: express.Response, _next: express.NextFunction) => { res.status(e.status ?? 500).json({ error: e.message }); });
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const post = (path: string, body: unknown, user?: string) => fetch(`http://127.0.0.1:${port}/api/reviews/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(user ? { 'x-user': user } : {}) }, body: JSON.stringify(body) });
  try {
    assert.equal((await post('view', { code: 'CS 61A' })).status, 401);
    for (const [path, body] of [['view', { code: 'CS 61A' }], ['exam', { code: 'CS 61A' }], ['stars', {}], ['term', { term: FALL }]] as const) {
      const res = await post(path, body, 'u_b');
      assert.equal(res.status, 200, path);
      const json = await res.text();
      assert.ok(!json.includes('u_a') && !json.includes('u_c'), path);
    }
    // a pending account can read, not write (pendingGate)
    assert.equal((await post('view', { code: 'CS 61A' }, 'u_p')).status, 200);
    assert.equal((await post('save', review(), 'u_p')).status, 403);
    assert.equal((await post('helpful', { id: r.id }, 'u_p')).status, 403);
    const refused = await post('save', review('CS 61A', { text: 'Email me at someone@berkeley.edu for my notes, they cover everything you need for the midterm.' }), 'u_d');
    assert.equal(refused.status, 400);
    assert.match(((await refused.json()) as { error: string }).error, /email address/);
  } finally { server.close(); }
});

test('reviews: summary + one review for everyone; the rest after writing one review of any course', () => {
  const { svc } = setup();
  svc.saveReview('u_b', review('CS 61A', { rating: 5, difficulty: 4, workload: '10+', tags: ['labs', 'coding_projects'] }));
  svc.saveReview('u_c', review('CS 61A', { rating: 4, difficulty: 5, workload: '6-10', tags: ['labs'] }));
  svc.saveReview('u_d', review('CS 61A', { rating: 2, workload: '10+' }));
  const locked = svc.view('u_a', 'CS 61A');
  assert.equal(locked.locked, true);
  assert.equal(locked.reviews.length, 1);
  assert.equal(locked.total, 3);
  assert.equal(locked.summary.count, 3);
  assert.equal(locked.summary.avg, 3.67);
  assert.equal(locked.summary.difficulty, 4.5);
  assert.equal(locked.summary.recommendedPct, 67);
  assert.deepEqual(locked.summary.workload, { '0-3': 0, '3-6': 0, '6-10': 1, '10+': 2 });
  assert.equal(locked.summary.topTags[0].tag, 'labs');
  // what they can write now, to unlock
  assert.deepEqual(locked.unlock!.reviewable.map((c) => c.code).sort(), ['CS 61A', 'MATH 1A']);
  // exam info follows the same rule
  svc.saveExam('u_b', { code: 'CS 61A', term: FALL, midterms: 2, final: true, formats: ['coding'] });
  svc.saveExam('u_c', { code: 'CS 61A', term: FALL, midterms: 2, final: true, formats: ['coding'], tip: 'Practice old exams.' });
  const lockedExam = svc.examView('u_a', 'CS 61A');
  assert.equal(lockedExam.locked, true); assert.equal(lockedExam.tips.length, 1); assert.equal(lockedExam.summary.count, 2); assert.equal(lockedExam.summary.midterms, 2);
  // write one review of ANOTHER course → everything opens
  svc.saveReview('u_a', review('MATH 1A'));
  const open = svc.view('u_a', 'CS 61A');
  assert.equal(open.locked, false); assert.equal(open.reviews.length, 3); assert.equal(open.unlock, undefined);
  assert.equal(svc.examView('u_a', 'CS 61A').tips.length, 2);
  // filters
  assert.deepEqual(open.filters.terms, [FALL]);
  assert.equal(svc.view('u_a', 'CS 61A', { term: 'Spring 2027' }).reviews.length, 0);
});

test('reviews: before week 8 the locked state says when, never a dead end', () => {
  const { svc } = setup(OCT1);
  const v = svc.view('u_fresh', 'CS 61A');
  assert.equal(v.locked, true);
  assert.deepEqual(v.unlock!.reviewable, []);
  assert.equal(v.unlock!.opensOn, '2026-10-12');
  assert.equal(v.unlock!.message, 'You can review your classes from Mon, Oct 12.');
  assert.equal(v.write.ok, false);
});

test('reviews: list stars and term labels need at least 3 reviews', () => {
  const { svc } = setup();
  svc.saveReview('u_b', review('CS 61A', { rating: 5 }));
  svc.saveReview('u_c', review('CS 61A', { rating: 4 }));
  svc.saveReview('u_a', review('MATH 1A'));
  assert.deepEqual(svc.stars('s_berkeley'), {});
  assert.ok(svc.view('u_a', 'CS 61A').reviews.every((r) => r.term === null));
  svc.saveReview('u_d', review('CS 61A', { rating: 4 }));
  assert.deepEqual(svc.stars('s_berkeley'), { cs61a: { avg: 4.33, count: 3 } });
  assert.deepEqual(svc.stars('s_berkeley', ['math1a']), {});
  assert.ok(svc.view('u_a', 'CS 61A').reviews.every((r) => r.term === FALL));
});

test('reviews: 3 reports from distinct real accounts hide a review until an admin acts', () => {
  const { svc, d } = setup();
  for (const u of ['u_b', 'u_c']) svc.saveReview(u, review());
  svc.saveReview('u_a', review('MATH 1A'));
  const id = svc.view('u_a', 'CS 61A').reviews.find((r) => !r.mine)!.id;
  const author = svc.raw().reviews.find((r) => r.id === id)!.authorId;
  assert.equal(REVIEW_LIMITS.autoHide, AUTO_HIDE_REPORTS);
  const reporters = ['u_a', 'u_d', 'u_e', 'u_x'].filter((u) => u !== author);
  fileReport(d, reporters[0], 'review', id, 'Harassment');
  fileReport(d, reporters[0], 'review', id, 'Harassment'); // same person twice counts once
  fileReport(d, 'u_s', 'review', id, 'Spam'); // sample profile doesn't count
  assert.ok(svc.view('u_a', 'CS 61A').reviews.some((r) => r.id === id));
  fileReport(d, reporters[1], 'review', id, 'Harassment');
  const third = fileReport(d, reporters[2], 'review', id, 'Harassment');
  assert.equal(third.autoHidden, true);
  assert.equal(third.target.kind, 'review');
  assert.equal(third.target.ownerId, author); // admin side only
  assert.ok(!svc.view('u_a', 'CS 61A').reviews.some((r) => r.id === id));
  const own = svc.view(author, 'CS 61A').mine[0];
  assert.equal(own.status, 'checking');
  // admin: dismiss → visible again
  dismissReport(d, third.report.id, 'admin');
  assert.ok(svc.view('u_a', 'CS 61A').reviews.some((r) => r.id === id));
  // admin: hide → only the author sees it
  const again = fileReport(d, 'u_e', 'review', id, 'Other');
  hideReported(d, again.report.id, 'admin');
  assert.ok(!svc.view('u_a', 'CS 61A').reviews.some((r) => r.id === id));
  assert.equal(svc.view(author, 'CS 61A').mine[0].status, 'checking');
  // admin: remove → gone
  const last = fileReport(d, 'u_d', 'review', id, 'Other');
  removeReported(d, last.report.id, 'admin');
  assert.equal(svc.raw().reviews.some((r) => r.id === id), false);
});

test('reviews: text filters reject contact details and hold text that names a student', () => {
  for (const bad of ['Call me at (510) 555-0123 about the projects, I have every solution from last year saved.', 'Notes at https://example.com', 'See www.notes.com', 'grab them on notes.io/cs61a', 'email a.b@berkeley.edu']) {
    assert.equal(checkText(bad, 'review').ok, false, bad);
  }
  for (const fine of ['CS 61A takes 10+ hrs a week; 3.5 hours of lab, Project 4 is long. Exam 2 was curved to a B.', 'Professor DeNero and the TAs were great. Lab partner matters.', 'Office hours on Mon 5-7 pm help. Grade was 93.5/100.']) {
    const c = checkText(fine, 'review');
    assert.ok(c.ok && !('hold' in c && c.hold), fine);
  }
  for (const held of ['My classmate Jason never did his part of the project.', 'There was a student named Kim who kept talking.', 'Ask @jason.lee for help']) {
    const c = checkText(held, 'review');
    assert.ok(c.ok && c.hold, held);
  }
  const tip = checkText('Q3: write a function that reverses a linked list', 'tip');
  assert.ok(tip.ok && tip.hold);

  const { svc, d, pushed } = setup();
  svc.saveReview('u_b', review('CS 61A', { text: 'My classmate Jason never did his part of the group project, so pick your partner carefully.' }));
  const held = svc.raw().reviews[0];
  assert.equal(held.held?.reason, 'May name a student');
  assert.equal(svc.view('u_a', 'CS 61A').total, 0); // hidden from others until an admin checks it
  assert.equal(svc.view('u_b', 'CS 61A').mine[0].status, 'checking');
  // it waits in /admin/reports as a system report
  const rep = d.reports.find((r) => r.targetType === 'review' && r.targetId === held.id)!;
  assert.equal(rep.reporterId, 'system');
  assert.ok(pushed.some((p) => p.reports));
  dismissReport(d, rep.id, 'admin');
  assert.equal(svc.view('u_a', 'CS 61A').total, 1);
  assert.equal(svc.raw().reviews[0].held, undefined);
  // exam tips: the format, never the questions
  svc.saveExam('u_c', { code: 'CS 61A', term: FALL, midterms: 1, final: true, tip: 'Question 2 was about recursion trees, the answer is 3' });
  assert.ok(svc.raw().exams[0].held);
  denied(() => svc.saveExam('u_d', { code: 'CS 61A', term: FALL, midterms: 1, final: true, tip: 'old exams at cs61a.org' }), 400, /link/);
});

test('reviews: rate limit on writing', () => {
  const { svc } = setup();
  for (let i = 0; i < REVIEW_LIMITS.writesPerDay; i++) svc.saveReview('u_b', review('CS 61A', { rating: (i % 5) + 1 }));
  denied(() => svc.saveReview('u_b', review()), 429);
});

test('reviews: deleting an account removes its reviews, exam info, helpful votes and prompt record', () => {
  const { svc, docs, clock } = setup();
  svc.saveReview('u_a', review());
  svc.saveReview('u_b', review());
  svc.saveExam('u_a', { code: 'CS 61A', term: FALL, midterms: 2, final: true });
  const bId = svc.raw().reviews.find((r) => r.authorId === 'u_b')!.id;
  svc.helpful('u_a', bId);
  clock.now = new Date('2026-12-11T20:00:00Z');
  svc.promptRound();
  assert.ok(svc.raw().prompts.some((p) => p.userId === 'u_a'));
  const out = svc.forgetUser('u_a');
  assert.deepEqual(out, { courseReviews: 1, examInfos: 1, helpfulVotes: 1 });
  assert.equal([...docs(COURSE_REVIEWS).values()].length, 1);
  assert.equal(docs(EXAM_INFOS).size, 0);
  assert.ok(![...docs(REVIEW_PROMPTS).values()].some((p) => (p as unknown as { userId: string }).userId === 'u_a'));
  assert.deepEqual(svc.raw().reviews[0].helpful, []);
});

test('end-of-term prompt: one notification per student per term, at most one reminder 7 days later', () => {
  const { svc, d, clock } = setup(new Date('2026-12-10T20:00:00Z'));
  assert.equal(svc.promptRound().length, 0); // before the last day of instruction
  clock.now = new Date('2026-12-11T20:00:00Z');
  const first = svc.promptRound();
  const who = first.map((n) => n.userId).sort();
  // verified students with Fall 2026 classes; not unverified, pending, sample, or another school without dates
  assert.deepEqual(who, ['u_a', 'u_b', 'u_c', 'u_d', 'u_e', 'u_fresh', 'u_x']);
  const a = first.find((n) => n.userId === 'u_a')!;
  assert.equal(a.title, 'How were your classes?');
  assert.equal(a.body, 'Review CS 61A, MATH 1A');
  assert.equal(a.link, '/reviews/term?term=Fall%202026');
  assert.equal(a.type, 'course_review');
  assert.equal(svc.promptRound().length, 0); // same day again → nothing
  // u_b writes something; nobody else does
  svc.saveReview('u_b', review());
  clock.now = new Date('2026-12-15T20:00:00Z');
  assert.equal(svc.promptRound().length, 0); // < 7 days
  clock.now = new Date('2026-12-18T20:00:00Z');
  const reminders = svc.promptRound();
  assert.deepEqual(reminders.map((n) => n.userId).sort(), ['u_a', 'u_c', 'u_d', 'u_e', 'u_fresh', 'u_x']);
  clock.now = new Date('2026-12-26T20:00:00Z');
  assert.equal(svc.promptRound().length, 0); // never more
  clock.now = new Date('2027-01-20T20:00:00Z');
  assert.equal(svc.promptRound().length, 0);
  // total per student ≤ 2
  const per = new Map<string, number>();
  for (const n of d.notifications) per.set(n.userId, (per.get(n.userId) ?? 0) + 1);
  assert.ok([...per.values()].every((n) => n <= 2));
  assert.equal(per.get('u_b'), 1);
});

test('end-of-term prompt: survives a restart (records are stored) and skips students with nothing left to review', async () => {
  const { svc, docs, clock } = setup(new Date('2026-12-11T20:00:00Z'));
  svc.saveReview('u_b', review());
  const first = svc.promptRound();
  assert.ok(!first.some((n) => n.userId === 'u_b')); // already reviewed every Fall class
  assert.ok(docs(REVIEW_PROMPTS).size > 0);
  await svc.load();
  clock.now = new Date('2026-12-12T20:00:00Z');
  assert.equal(svc.promptRound().length, 0);
});

test('term prompt view: steps through the term’s classes with what is done', () => {
  const { svc } = setup();
  svc.saveReview('u_a', review('MATH 1A'));
  const v = svc.termPrompt('u_a', FALL);
  assert.deepEqual(v.classes.map((c) => [c.code, c.reviewed]), [['CS 61A', false], ['MATH 1A', true]]);
  assert.equal(v.write.cs61a.ok, true);
  const next = svc.termPrompt('u_a', 'Spring 2027');
  assert.equal(next.classes.length, 0);
  void spring;
});

test('reviews: the shared demo login can read but not write, and gets no term prompt', () => {
  const d = { users: [student('u_me', [cs61a])], reports: [], notifications: [], posts: [], activities: [], opportunities: [], chatRooms: [], rides: [], relationships: { ...structuredClone(seed.relationships), blocks: [] } } as unknown as Snapshot;
  const store = { async listDocs<T>() { return [] as T[]; }, async putDocs() {}, async removeDocs() {} };
  const clock = { now: NOV6 };
  const svc = createCourseReviewsService({ db: () => d, store, now: () => clock.now, sharedLogins: new Set(['u_me']) });
  assert.equal(svc.view('u_me', 'CS 61A').total, 0);
  denied(() => svc.saveReview('u_me', review()), 403);
  clock.now = new Date('2026-12-11T20:00:00Z');
  assert.equal(svc.promptRound().length, 0);
});
