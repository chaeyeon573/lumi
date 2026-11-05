/**
 * 수업 질문 (Harness A S030 Class space › Questions) — 같은 수업을 듣는 학생끼리만 묻고 답한다.
 *
 * 규칙
 *   - 보고 쓰는 사람: 학교 이메일을 인증했고(verifiedForClassmates), 같은 수업 학생에게 보이기를 켰고(showsToClassmates),
 *     내 시간표에 그 수업(같은 학기 키)이 있는 사람만. 명단과 같은 기준 — 아무나 수업을 넣어 엿보지 못하게.
 *   - 수업 키는 학기까지 포함한다 (lib/classmates classKey) — 지난 학기 질문은 이번 학기 수업에 섞이지 않는다.
 *   - 차단한·차단당한 사람의 질문·답은 서로 보이지 않는다. 계정을 지운 사람의 글은 서버가 지운다 (server/classqa.ts forgetUser).
 *   - 한 줄이 아니라 짧은 글 (최대 500자). 하루 질문·답 합쳐 30개까지.
 * 저장은 스냅샷 밖 문서 묶음(classQuestions) — 수업마다 쌓이므로 모든 사람의 bootstrap 에 싣지 않는다.
 */
import type { ID, User } from '@core/types';
import { enrollments, showsToClassmates, verifiedForClassmates, type Enrollment } from './classmates';

export interface ClassAnswer { id: ID; authorId: ID; text: string; createdAt: string }
export interface ClassQuestion { id: ID; key: string; authorId: ID; text: string; createdAt: string; answers: ClassAnswer[] }

/** 화면에 내려가는 모양 — 글쓴이는 이름·얼굴만 */
export interface ClassQaPerson { id: ID; nickname: string; avatar: User['avatar']; sample?: boolean }
export interface ClassAnswerView { id: ID; text: string; createdAt: string; author: ClassQaPerson; mine: boolean }
export interface ClassQuestionView { id: ID; key: string; text: string; createdAt: string; author: ClassQaPerson; mine: boolean; answers: ClassAnswerView[] }

export const CLASS_QA_LIMITS = { text: 500, perDay: 30, perClass: 300 } as const;

export type ClassQaDenied = 'unverified' | 'hidden' | 'not_enrolled';
export const CLASS_QA_REASONS: Record<ClassQaDenied, string> = {
  unverified: 'Verify your school email to see questions from your classmates.',
  hidden: 'Turn on “Show me to classmates” to ask and see class questions.',
  not_enrolled: 'Add this class to your schedule to see its questions.',
};

/** 이 사람이 이 수업의 질문을 보고 쓸 수 있는지 */
export function classQaAccess(user: Pick<User, 'affiliation' | 'timetable' | 'sample' | 'showToClassmates'> | undefined, key: string, now = new Date()):
  { ok: true; enrollment: Enrollment } | { ok: false; reason: ClassQaDenied } {
  if (!user || !verifiedForClassmates(user)) return { ok: false, reason: 'unverified' };
  if (!showsToClassmates(user)) return { ok: false, reason: 'hidden' };
  const e = enrollments(user, now).find((x) => x.key === key);
  return e ? { ok: true, enrollment: e } : { ok: false, reason: 'not_enrolled' };
}

/** 앞뒤 공백·연속 빈 줄 정리, 길이 제한. 비면 '' */
export const cleanQaText = (s: unknown) => String(s ?? '').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, CLASS_QA_LIMITS.text);

type Blocks = { fromId: ID; toId: ID }[];
const blocked = (blocks: Blocks, a: ID, b: ID) => blocks.some((x) => (x.fromId === a && x.toId === b) || (x.fromId === b && x.toId === a));

/** 한 수업의 질문 — 보는 사람 기준 (새 질문 먼저, 답은 오래된 것부터) */
export function classQuestionsFor(all: ClassQuestion[], key: string, viewerId: ID, users: Pick<User, 'id' | 'nickname' | 'avatar' | 'sample'>[], blocks: Blocks): ClassQuestionView[] {
  const byId = new Map(users.map((u) => [u.id, u]));
  const person = (id: ID): ClassQaPerson | null => { const u = byId.get(id); return u ? { id: u.id, nickname: u.nickname, avatar: u.avatar, ...(u.sample ? { sample: true } : {}) } : null; };
  const ok = (id: ID) => id === viewerId || (byId.has(id) && !blocked(blocks, viewerId, id));
  return all.filter((q) => q.key === key && ok(q.authorId))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((q) => ({
      id: q.id, key: q.key, text: q.text, createdAt: q.createdAt, author: person(q.authorId)!, mine: q.authorId === viewerId,
      answers: q.answers.filter((a) => ok(a.authorId)).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((a) => ({ id: a.id, text: a.text, createdAt: a.createdAt, author: person(a.authorId)!, mine: a.authorId === viewerId })),
    }))
    .filter((q) => !!q.author);
}

/** 오늘(24시간 안) 이 사람이 쓴 질문·답 수 */
export function postsInLastDay(all: ClassQuestion[], userId: ID, now = new Date()): number {
  const since = new Date(now.getTime() - 86_400_000).toISOString();
  let n = 0;
  for (const q of all) {
    if (q.authorId === userId && q.createdAt >= since) n++;
    for (const a of q.answers) if (a.authorId === userId && a.createdAt >= since) n++;
  }
  return n;
}

/** 읽을 수 있는 이유와 함께 거절 (서버는 status 로 HTTP 코드, 화면은 message 를 그대로 보여 준다) */
export class ClassQaError extends Error { constructor(public status: number, message: string) { super(message); } }

export interface ClassQaIO {
  all(): ClassQuestion[];
  /** 새로 만들거나 바뀐 질문 저장 */
  put(q: ClassQuestion): void;
  drop(id: ID): void;
  user(id: ID): User | undefined;
  users(): Pick<User, 'id' | 'nickname' | 'avatar' | 'sample'>[];
  blocks(): Blocks;
  uid(prefix: string): ID;
  /** 내 질문에 답이 달리면 알림 (선택) */
  notify?(userId: ID, n: { title: string; body: string; link: string }): void;
  now?(): Date;
}

/** 서버(server/classqa.ts)와 mock 이 같이 쓰는 규칙 */
export function createClassQa(io: ClassQaIO) {
  const now = () => io.now?.() ?? new Date();
  const must = (me: ID, key: string) => {
    const r = classQaAccess(io.user(me), key, now());
    if (!r.ok) throw new ClassQaError(403, CLASS_QA_REASONS[r.reason]);
    return r.enrollment;
  };
  const view = (me: ID, key: string) => classQuestionsFor(io.all(), key, me, io.users(), io.blocks());
  const findQ = (id: ID) => { const q = io.all().find((x) => x.id === id); if (!q) throw new ClassQaError(404, 'This question is gone.'); return q; };
  const text = (s: unknown) => {
    const t = cleanQaText(s);
    if (t.length < 2) throw new ClassQaError(400, 'Write a little more first.');
    return t;
  };
  const budget = (me: ID) => { if (postsInLastDay(io.all(), me, now()) >= CLASS_QA_LIMITS.perDay) throw new ClassQaError(429, 'That’s a lot for one day — try again tomorrow.'); };
  return {
    list(me: ID, key: string): ClassQuestionView[] { must(me, String(key)); return view(me, String(key)); },
    ask(me: ID, key: string, body: unknown): ClassQuestionView[] {
      const k = String(key); must(me, k); const t = text(body); budget(me);
      if (io.all().filter((q) => q.key === k).length >= CLASS_QA_LIMITS.perClass) throw new ClassQaError(429, 'This class has a lot of questions — answer one first.');
      io.put({ id: io.uid('cq'), key: k, authorId: me, text: t, createdAt: now().toISOString(), answers: [] });
      return view(me, k);
    },
    answer(me: ID, questionId: ID, body: unknown): ClassQuestionView[] {
      const q = findQ(String(questionId)); const e = must(me, q.key); const t = text(body); budget(me);
      if (q.authorId !== me && io.blocks().some((b) => (b.fromId === me && b.toId === q.authorId) || (b.fromId === q.authorId && b.toId === me))) throw new ClassQaError(404, 'This question is gone.');
      const next = { ...q, answers: [...q.answers, { id: io.uid('ca'), authorId: me, text: t, createdAt: now().toISOString() }] };
      io.put(next);
      if (q.authorId !== me && io.notify) {
        // 링크는 글쓴이 시간표의 수업 이름으로 — 같은 키의 수업이 아직 있을 때만
        const author = io.user(q.authorId); const mine = author ? enrollments(author, now()).find((x) => x.key === q.key) : undefined;
        if (mine) io.notify(q.authorId, { title: `New answer in ${e.code}`, body: t.length > 80 ? `${t.slice(0, 79)}…` : t, link: `/classes/${encodeURIComponent(mine.name)}?tab=questions` });
      }
      return view(me, q.key);
    },
    remove(me: ID, questionId: ID, answerId?: ID): ClassQuestionView[] {
      const q = findQ(String(questionId));
      if (answerId) {
        const a = q.answers.find((x) => x.id === answerId);
        if (!a || a.authorId !== me) throw new ClassQaError(403, 'You can only delete what you wrote.');
        io.put({ ...q, answers: q.answers.filter((x) => x.id !== answerId) });
      } else {
        if (q.authorId !== me) throw new ClassQaError(403, 'You can only delete what you wrote.');
        io.drop(q.id);
      }
      // 지운 뒤 목록 — 그새 수업을 뺐으면 빈 목록
      return classQaAccess(io.user(me), q.key, now()).ok ? view(me, q.key) : [];
    },
    /** 계정 삭제 — 이 사람의 질문(답 포함)과 다른 질문에 단 답을 지운다. 지운 개수 */
    forgetUser(userId: ID): { classQuestions: number; classAnswers: number } {
      let questions = 0, answers = 0;
      for (const q of [...io.all()]) {
        if (q.authorId === userId) { io.drop(q.id); questions++; continue; }
        const keep = q.answers.filter((a) => a.authorId !== userId);
        if (keep.length !== q.answers.length) { answers += q.answers.length - keep.length; io.put({ ...q, answers: keep }); }
      }
      return { classQuestions: questions, classAnswers: answers };
    },
  };
}
