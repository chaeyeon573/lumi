/** 프로필 질문을 "대화 거리"로 쓰는 헬퍼 — 오늘의 질문 · 카드에 보여줄 답 · 서로 아는 사람 */
import type { ID, User } from '@core/types';
import { textPromptsFor, questionById, firstPromptIdFor, type PromptQuestion } from '@core/data/prompts';
import { mutualFriends } from './relations';
import { stageKind } from './stage';

type Rel = Parameters<typeof mutualFriends>[0];

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** 오늘의 질문 — 날짜마다 바뀌고, 단계에 맞는 질문만. 1번 고정 질문은 빼고 고른다 */
export function dailyPrompt(me: User, dateISO: string): PromptQuestion {
  const kind = stageKind(me);
  const pool = textPromptsFor(kind).filter((q) => q.id !== firstPromptIdFor(kind));
  return pool[hash(dateISO.slice(0, 10)) % pool.length];
}

export interface PromptAnswer { user: User; questionId: string; question: string; answer: string }

/** 이 질문에 답한 사람들 (나 제외, 답이 있는 사람만). 가까운 사람이 먼저 오도록 rank 로 정렬 */
export function answersTo(users: User[], questionId: string, meId: ID, rank: (u: User) => number = () => 0): PromptAnswer[] {
  const q = questionById(questionId);
  return users
    .filter((u) => u.id !== meId)
    .flatMap((u) => u.prompts.filter((p) => p.questionId === questionId && p.answer.trim()).map((p) => ({ user: u, questionId, question: q?.text ?? '', answer: p.answer })))
    .sort((a, b) => rank(b.user) - rank(a.user));
}

/** 카드에 한 줄로 보여줄 답 — 내 관심사·답과 겹치는 단어가 있는 답을 먼저, 없으면 첫 답 */
export function highlightPrompt(viewer: User, owner: User): PromptAnswer | undefined {
  const answered = owner.prompts.filter((p) => p.answer.trim());
  if (!answered.length) return undefined;
  const mine = viewer.prompts.map((p) => p.answer).join(' ');
  const words = new Set(mine.split(/[\s,.·/]+/).filter((w) => w.length >= 2));
  const score = (a: string) => a.split(/[\s,.·/]+/).filter((w) => words.has(w)).length;
  const best = [...answered].sort((a, b) => score(b.answer) - score(a.answer))[0];
  return { user: owner, questionId: best.questionId, question: questionById(best.questionId)?.text ?? '', answer: best.answer };
}

/** 서로 아는 사람 (둘 다와 연결된 사람). canShow 로 경로 공개를 끈 사람은 뺀다 */
export function mutualPeople(s: Rel & { users: User[] }, meId: ID, otherId: ID, canShow: (u: User) => boolean = () => true): User[] {
  return mutualFriends(s, meId, otherId)
    .map((id) => s.users.find((u) => u.id === id))
    .filter((u): u is User => !!u && canShow(u));
}

/** "지민, 민준 외 2명" 같은 짧은 이름 목록 */
export function namesLine(people: User[], max = 2, lang: 'ko' | 'en' = 'ko'): string {
  const head = people.slice(0, max).map((u) => u.nickname).join(', ');
  const rest = people.length - max;
  if (rest <= 0) return head;
  return lang === 'en' ? `${head} +${rest}` : `${head} 외 ${rest}명`;
}
