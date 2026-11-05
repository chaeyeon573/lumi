/**
 * 수업 질문 (S030 Class space › Questions) — 누가 보고 쓰는지, 차단, 한도, 지우기, 계정 삭제, HTTP 주소.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import type { Snapshot } from '@core/api/types';
import type { Course, ID, User } from '@core/types';
import * as seed from '@core/data/seed.en';
import { classKey, nowTermLabel } from '@core/lib/classmates';
import { CLASS_QA_LIMITS, CLASS_QA_REASONS, ClassQaError } from '@core/lib/classqa';
import { createClassQaService, registerClassQaRoutes, CLASS_QA } from './classqa';

const TERM = nowTermLabel();
const KEY = classKey('s_berkeley', 'CS 61A', TERM);
const cs61a: Course[] = [0, 2].map((day) => ({ id: `c61a_${day}`, name: 'CS 61A Structure and Interpretation', code: 'CS 61A', term: TERM, day, start: '13:00', end: '14:00', hue: 220 }));
const econ1: Course[] = [{ id: 'econ1', name: 'ECON 1 Introduction to Economics', code: 'ECON 1', term: TERM, day: 1, start: '11:00', end: '12:30', hue: 100 }];

function student(id: string, timetable: Course[], extra: Partial<User> = {}, verified = true): User {
  const base = structuredClone(seed.users.find((u) => u.id === 'u_jimin')!);
  return { ...base, id, nickname: id.toUpperCase(), sample: false, timetable, showToClassmates: undefined, ...extra,
    affiliation: { ...base.affiliation, schoolId: 's_berkeley', schoolName: 'UC Berkeley', emailVerified: verified } as User['affiliation'] };
}

function setup() {
  const d = { users: [student('u_a', cs61a), student('u_b', cs61a), student('u_x', econ1), student('u_n', cs61a, {}, false), student('u_h', cs61a, { showToClassmates: false })],
    relationships: structuredClone(seed.relationships), notifications: [] } as unknown as Snapshot;
  d.relationships.blocks = [];
  const docs = new Map<string, { id: string }>();
  const store = {
    async listDocs<T>() { return [...docs.values()] as T[]; },
    async putDocs(_c: string, items: { id: string }[]) { for (const i of items) docs.set(i.id, structuredClone(i)); },
    async removeDocs(_c: string, ids: string[]) { for (const i of ids) docs.delete(i); },
  };
  const pushed: unknown[] = [];
  const qa = createClassQaService({ db: () => d, store, push: (p) => pushed.push(p) });
  return { d, qa, docs, pushed };
}
const denied = (fn: () => unknown, status: number) => assert.throws(fn, (e: unknown) => e instanceof ClassQaError && e.status === status);

test('class questions: only verified classmates who show themselves see and write them', () => {
  const { qa } = setup();
  const list = qa.ask('u_a', KEY, '  Is the midterm cumulative?  ');
  assert.equal(list.length, 1);
  assert.equal(list[0].text, 'Is the midterm cumulative?');
  assert.equal(list[0].author.id, 'u_a');
  assert.equal(list[0].mine, true);
  // same class, verified → sees it, not "mine"
  const b = qa.list('u_b', KEY);
  assert.equal(b.length, 1); assert.equal(b[0].mine, false);
  // other class, unverified, hidden → refused with a readable reason
  assert.throws(() => qa.list('u_x', KEY), { message: CLASS_QA_REASONS.not_enrolled });
  assert.throws(() => qa.list('u_n', KEY), { message: CLASS_QA_REASONS.unverified });
  assert.throws(() => qa.list('u_h', KEY), { message: CLASS_QA_REASONS.hidden });
  denied(() => qa.ask('u_x', KEY, 'let me in'), 403);
  // the view carries name + face only — no timetable, email or school details
  const author = b[0].author as unknown as Record<string, unknown>;
  assert.deepEqual(Object.keys(author).sort(), ['avatar', 'id', 'nickname']);
});

test('class questions: answers, notification to the asker, blocks hide both ways', () => {
  const { qa, d, pushed } = setup();
  const [q] = qa.ask('u_a', KEY, 'Anyone want to review recursion?');
  const after = qa.answer('u_b', q.id, 'Yes — Thursday after lecture?');
  assert.equal(after[0].answers.length, 1);
  assert.equal(after[0].answers[0].author.id, 'u_b');
  assert.equal(d.notifications.length, 1, 'asker is told');
  assert.equal(d.notifications[0].userId, 'u_a');
  assert.match(d.notifications[0].link ?? '', /^\/classes\/CS%2061A.*\?tab=questions$/);
  assert.equal(pushed.length, 1);
  // answering your own question does not notify you
  qa.answer('u_a', q.id, 'Thanks!');
  assert.equal(d.notifications.length, 1);
  // a block hides the other person's question and answers, and they can't answer each other
  d.relationships.blocks.push({ id: 'blk', fromId: 'u_b', toId: 'u_a', createdAt: '2026-11-01T00:00:00Z' } as Snapshot['relationships']['blocks'][number]);
  assert.equal(qa.list('u_b', KEY).length, 0);
  const forA = qa.list('u_a', KEY);
  assert.equal(forA[0].answers.some((x) => x.author.id === 'u_b'), false);
  denied(() => qa.answer('u_b', q.id, 'still here'), 404);
});

test('class questions: empty text, daily limit, delete only your own', () => {
  const { qa } = setup();
  denied(() => qa.ask('u_a', KEY, '   '), 400);
  const long = qa.ask('u_a', KEY, 'x'.repeat(2000));
  assert.equal(long[0].text.length, CLASS_QA_LIMITS.text);
  for (let i = 1; i < CLASS_QA_LIMITS.perDay; i++) qa.ask('u_a', KEY, `question ${i}`);
  denied(() => qa.ask('u_a', KEY, 'one too many'), 429);
  const [q] = qa.list('u_b', KEY);
  denied(() => qa.remove('u_b', q.id), 403);
  const withAnswer = qa.answer('u_b', q.id, 'an answer');
  const ans = withAnswer.find((x) => x.id === q.id)!.answers[0];
  denied(() => qa.remove('u_a', q.id, ans.id), 403);
  assert.equal(qa.remove('u_b', q.id, ans.id).find((x) => x.id === q.id)!.answers.length, 0);
  const n = qa.list('u_a', KEY).length;
  assert.equal(qa.remove('u_a', q.id).length, n - 1);
});

test('class questions: deleting an account removes their questions and answers (docs too)', async () => {
  const { qa, docs } = setup();
  const [q] = qa.ask('u_a', KEY, 'Office hours moved?');
  qa.answer('u_b', q.id, 'Yes, to Soda 341');
  const q2 = qa.ask('u_b', KEY, 'Lab 3 due date?').find((x) => x.text === 'Lab 3 due date?')!;
  qa.answer('u_a', q2.id, 'Friday');
  assert.deepEqual(qa.forgetUser('u_a'), { classQuestions: 1, classAnswers: 1 });
  await new Promise((r) => setImmediate(r));
  assert.equal(docs.size, 1);
  const left = qa.list('u_b', KEY);
  assert.equal(left.length, 1);
  assert.equal(left[0].answers.length, 0);
  // reload from the store keeps the same state
  await qa.load();
  assert.equal(qa.size(), 1);
});

test('class questions: HTTP routes need a session and return readable refusals', async () => {
  const { qa } = setup();
  const app = express();
  app.use(express.json());
  const auth = (req: express.Request & { userId?: ID }, _res: express.Response, next: express.NextFunction) => { req.userId = req.get('x-user') || undefined; next(); };
  class HttpError extends Error { constructor(public status: number, m: string) { super(m); } }
  const bad = (m: string, s = 400) => new HttpError(s, m);
  const wrap = (fn: (req: express.Request & { userId?: ID }, res: express.Response) => unknown) => async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try { const out = await fn(req, res); if (!res.headersSent) res.json(out ?? {}); } catch (e) { next(e); }
  };
  registerClassQaRoutes(app, qa, { auth, wrap, bad, requireUser: (req) => { if (!req.userId) throw bad('Sign in first', 401); return req.userId; } });
  app.use((e: HttpError, _req: express.Request, res: express.Response, _next: express.NextFunction) => { res.status(e.status ?? 500).json({ error: e.message }); });
  const server = app.listen(0);
  const port = (server.address() as { port: number }).port;
  const post = (path: string, body: unknown, user?: string) => fetch(`http://127.0.0.1:${port}/api/classqa/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(user ? { 'x-user': user } : {}) }, body: JSON.stringify(body) });
  try {
    assert.equal((await post('list', { key: KEY })).status, 401);
    const r = await post('ask', { key: KEY, text: 'Where is discussion 104?' }, 'u_a');
    assert.equal(r.status, 200);
    assert.equal(((await r.json()) as unknown[]).length, 1);
    const x = await post('list', { key: KEY }, 'u_x');
    assert.equal(x.status, 403);
    assert.equal(((await x.json()) as { error: string }).error, CLASS_QA_REASONS.not_enrolled);
  } finally { server.close(); }
  assert.equal(CLASS_QA, 'classQuestions');
});
