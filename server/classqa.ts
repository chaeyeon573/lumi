/**
 * 수업 질문 (Harness A S030 Class space › Questions) — 서버 쪽 저장과 주소.
 *
 *   POST /api/classqa/list    { key }                    → 그 수업 질문 (보는 사람 기준)
 *   POST /api/classqa/ask     { key, text }              → 질문 올리기 → 목록
 *   POST /api/classqa/answer  { questionId, text }       → 답 달기 → 목록 (질문한 사람에게 알림)
 *   POST /api/classqa/remove  { questionId, answerId? }  → 내가 쓴 것 지우기 → 목록
 *
 * 누가 보는지·쓰는지 규칙은 @core/lib/classqa (인증한 학생 + 같은 수업 + 보이기 켬). 클라이언트가 보낸 수업 이름은 믿지 않는다 —
 * 수업 키는 서버가 그 사람의 시간표로 다시 확인한다.
 * 저장: store 문서 묶음 classQuestions (스냅샷 밖). 계정을 지우면 forgetUser 가 그 사람의 질문·답을 지운다.
 */
import type { Express, Request, Response, NextFunction } from 'express';
import type { Patch, Snapshot } from '@core/api/types';
import type { ID, Notification } from '@core/types';
import { createClassQa, ClassQaError, type ClassQuestion } from '@core/lib/classqa';
import { uid } from '@core/lib/format';
import type { Store } from './store';

export const CLASS_QA = 'classQuestions';

type Req = Request & { userId?: ID };
type Handler = (req: Req, res: Response) => Promise<unknown> | unknown;
export interface ClassQaDeps {
  db: () => Pick<Snapshot, 'users' | 'relationships' | 'notifications'>;
  store: Pick<Store, 'listDocs' | 'putDocs' | 'removeDocs'>;
  /** 알림을 저장하고 보낸다 */
  push?(patch: Patch): void;
  now?(): Date;
}

export function createClassQaService(deps: ClassQaDeps) {
  const items = new Map<ID, ClassQuestion>();
  const engine = createClassQa({
    all: () => [...items.values()],
    put(q) { items.set(q.id, q); void deps.store.putDocs(CLASS_QA, [q]).catch((e) => console.error('[classqa] save failed', e)); },
    drop(id) { items.delete(id); void deps.store.removeDocs(CLASS_QA, [id]).catch((e) => console.error('[classqa] delete failed', e)); },
    user: (id) => deps.db().users.find((u) => u.id === id),
    users: () => deps.db().users,
    blocks: () => deps.db().relationships.blocks,
    uid,
    notify(userId, n) {
      const nt: Notification = { id: uid('nt'), userId, type: 'comment', title: n.title, body: n.body, link: n.link, read: false, createdAt: (deps.now?.() ?? new Date()).toISOString() };
      deps.db().notifications.unshift(nt);
      deps.push?.({ notifications: [nt] });
    },
    now: deps.now,
  });
  return {
    ...engine,
    async load() {
      items.clear();
      for (const q of await deps.store.listDocs<ClassQuestion>(CLASS_QA)) items.set(q.id, q);
      console.log(`[classqa] ${items.size} class questions`);
    },
    /** 테스트용 */
    size: () => items.size,
  };
}
export type ClassQaService = ReturnType<typeof createClassQaService>;

export function registerClassQaRoutes(app: Express, qa: ClassQaService, deps: {
  auth: (req: Request, res: Response, next: NextFunction) => unknown;
  wrap: (fn: Handler) => (req: Request, res: Response, next: NextFunction) => unknown;
  requireUser: (req: Req) => ID;
  bad: (msg: string, status?: number) => Error;
}) {
  const route = (path: string, fn: (me: ID, body: Record<string, unknown>) => unknown) =>
    app.post(`/api/classqa/${path}`, deps.auth, deps.wrap((req) => {
      const me = deps.requireUser(req);
      try { return fn(me, (req.body ?? {}) as Record<string, unknown>); } catch (e) { throw e instanceof ClassQaError ? deps.bad(e.message, e.status) : e; }
    }));
  route('list', (me, b) => qa.list(me, String(b.key ?? '')));
  route('ask', (me, b) => qa.ask(me, String(b.key ?? ''), b.text));
  route('answer', (me, b) => qa.answer(me, String(b.questionId ?? ''), b.text));
  route('remove', (me, b) => qa.remove(me, String(b.questionId ?? ''), b.answerId ? String(b.answerId) : undefined));
}
