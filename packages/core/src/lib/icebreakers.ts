/**
 * 아이스브레이커 게임 — 순수 로직 (엔진·서버 view·화면이 같이 쓴다).
 * - 누구에게 어떤 게임을 보낼 수 있는지
 * - 결과 계산
 * - 보는 사람별로 비밀 지우기 (two_truths 거짓 위치, 이모지 뜻, 맞혀봐 답, 답하기 전 상대 선택)
 * - 채팅방에 남기는 결과 한 줄
 */
import type { Snapshot } from '@core/api/types';
import type { Game, GameKind, GameResult, ID, User } from '@core/types';
import { t, tr } from '@core/i18n';
import { guessQuestionById, pairById } from '@core/data/icebreakers';
import { canViewField, isBlocked, isFriend } from './relations';

type Rel = Pick<Snapshot, 'relationships' | 'participations' | 'proposals' | 'users'>;

export const GAME_KINDS: GameKind[] = ['this_or_that', 'guess_pick', 'hot_take', 'two_truths', 'emoji_week'];
export const GAME_LABELS: Record<GameKind, string> = tr({
  this_or_that: '이것 또는 저것', guess_pick: '내 답 맞혀봐', hot_take: '핫테이크', two_truths: '두 개의 진실과 하나의 거짓', emoji_week: '이모지로 본 한 주',
});

/** 남용 방지 — 한 사람이 한 시간에 보낼 수 있는 게임 수, 한 상대에게 답을 기다리는 게임 수 */
export const GAME_LIMITS = { perHour: 30, pendingPerPair: 3, noteMax: 140, guessMax: 80, textMax: 140 } as const;

/**
 * 게임을 보낼 수 있는지. 채팅 열기(canMessage)와 같은 차단·수신 설정 규칙을 따르되,
 * 게임은 처음 말을 거는 수단이라 "이미 연결된 사이" 조건은 요구하지 않는다.
 */
export function canSendGame(s: Rel, fromId: ID, toId: ID): { ok: boolean; reason: string } {
  if (fromId === toId) return { ok: false, reason: t('자기 자신에게는 보낼 수 없어요.') };
  if (isBlocked(s, fromId, toId)) return { ok: false, reason: t('차단된 사용자와는 대화할 수 없어요.') };
  const target = s.users.find((u) => u.id === toId);
  if (!target || !s.users.some((u) => u.id === fromId)) return { ok: false, reason: t('사용자를 찾을 수 없어요.') };
  if (target.settings.messagePolicy === 'none') return { ok: false, reason: t('상대가 메시지 수신을 제한했어요.') };
  if (target.settings.messagePolicy === 'friends_only' && !isFriend(s, fromId, toId)) return { ok: false, reason: t('상대가 친구에게만 메시지를 허용했어요.') };
  return { ok: true, reason: '' };
}

/** 상대 프로필에 그 게임에 쓸 항목이 있는지 (공개 범위는 prompts를 따른다) */
function hasGameData(s: Rel, viewer: User, target: User, kind: GameKind): boolean {
  if (kind === 'this_or_that') return true;
  if (!canViewField(s, viewer, target, 'prompts')) return false;
  switch (kind) {
    case 'guess_pick': return (target.pickAnswers ?? []).some((a) => !!guessQuestionById(a.questionId));
    case 'hot_take': return !!target.hotTake?.text.trim();
    case 'two_truths': return (target.twoTruths?.statements.length ?? 0) === 3;
    case 'emoji_week': return (target.emojiWeek?.emojis.length ?? 0) > 0;
  }
}

/** 이 사람 카드에 띄울 수 있는 게임들. 보낼 수 없는 사이면 빈 배열 */
export function offeredGames(s: Rel, viewer: User, target: User): GameKind[] {
  if (!canSendGame(s, viewer.id, target.id).ok) return [];
  return GAME_KINDS.filter((k) => hasGameData(s, viewer, target, k));
}

// ─── 결과 계산 ─────────────────────────────────────────────────────────────
export const thisOrThatResult = (a: 0 | 1, b: 0 | 1): GameResult => (a === b ? 'same' : 'different');
export const guessPickResult = (guess: string, answer: string): GameResult => (guess === answer ? 'right' : 'wrong');
export const twoTruthsResult = (guessIndex: number, lieIndex: number): GameResult => (guessIndex === lieIndex ? 'right' : 'wrong');

// ─── 비밀 지우기 ───────────────────────────────────────────────────────────
/** 다른 사람에게 내려보낼 때 게임 정답을 지운다 (본인이면 그대로) */
export function stripGameSecrets(u: User, viewerId: ID): User {
  if (u.id === viewerId) return u;
  if (!u.pickAnswers && !u.twoTruths && !u.emojiWeek) return u;
  const out: User = { ...u };
  if (u.pickAnswers) out.pickAnswers = u.pickAnswers.map((a) => ({ questionId: a.questionId }));
  if (u.twoTruths) { const { lieIndex: _l, ...rest } = u.twoTruths; out.twoTruths = rest; }
  if (u.emojiWeek) { const { meaning: _m, ...rest } = u.emojiWeek; out.emojiWeek = rest; }
  return out;
}

/** 이 사람이 볼 수 있는 게임 모양. 당사자가 아니면 null. 답하기 전에는 상대 선택을 지운다 */
export function gameFor(g: Game, viewerId: ID): Game | null {
  if (g.fromId !== viewerId && g.toId !== viewerId) return null;
  if (g.kind === 'this_or_that' && g.status !== 'done') {
    if (viewerId === g.toId) { const { fromChoice: _f, ...rest } = g; return rest; }
    const { toChoice: _t, ...rest } = g; return rest;
  }
  return g;
}

// ─── 검증 ─────────────────────────────────────────────────────────────────
/** 프로필 게임 항목 저장 전 검사. 문제가 있으면 사용자에게 보여줄 이유, 없으면 null */
export function gameProfileError(p: Partial<User>): string | null {
  const bad = t('입력값을 확인해주세요.');
  if (p.hotTake !== undefined && p.hotTake !== null) {
    const text = p.hotTake.text?.trim() ?? '';
    if (!text || text.length > GAME_LIMITS.textMax) return bad;
  }
  if (p.twoTruths !== undefined && p.twoTruths !== null) {
    const { statements, lieIndex } = p.twoTruths;
    if (!Array.isArray(statements) || statements.length !== 3 || statements.some((x) => typeof x !== 'string' || !x.trim() || x.length > GAME_LIMITS.textMax)) return t('문장 세 개를 모두 써 주세요.');
    if (lieIndex === undefined || !Number.isInteger(lieIndex) || lieIndex < 0 || lieIndex > 2) return t('어느 것이 거짓인지 골라주세요.');
  }
  if (p.emojiWeek !== undefined && p.emojiWeek !== null) {
    const { emojis, meaning, chips } = p.emojiWeek;
    if (!Array.isArray(emojis) || emojis.length < 1 || emojis.length > 3 || emojis.some((e) => typeof e !== 'string' || !e.trim() || e.length > 16)) return bad;
    if (!meaning?.trim() || meaning.length > GAME_LIMITS.textMax) return t('이모지의 뜻을 써 주세요.');
    if (chips && (!Array.isArray(chips) || chips.length > 4 || chips.some((c) => typeof c !== 'string' || !c.trim() || c.length > GAME_LIMITS.guessMax))) return bad;
  }
  if (p.pickAnswers !== undefined && p.pickAnswers !== null) {
    if (!Array.isArray(p.pickAnswers)) return bad;
    const seen = new Set<string>();
    for (const a of p.pickAnswers) {
      const q = guessQuestionById(a?.questionId);
      if (!q || seen.has(q.id) || !q.options.some((o) => o.key === a.answer)) return bad;
      seen.add(q.id);
    }
  }
  return null;
}

// ─── 채팅방 결과 한 줄 ─────────────────────────────────────────────────────
const nick = (users: User[], id: ID) => users.find((u) => u.id === id)?.nickname ?? '';

/** 예: "This or that · Round 1: Alex 🍜 / Maya 🌮 — Different picks" */
export function gameSummary(g: Game, users: User[]): string {
  const a = nick(users, g.fromId), b = nick(users, g.toId);
  const head = `${GAME_LABELS[g.kind]} · ${t('라운드')} ${g.round}: `;
  switch (g.kind) {
    case 'this_or_that': {
      const pair = pairById(g.pairId);
      const opt = (c?: 0 | 1) => (pair && c !== undefined ? (c === 0 ? pair.a : pair.b).emoji : '?');
      const tail = g.result === 'same' ? t('같은 선택!') : t('서로 다른 선택');
      return `${head}${a} ${opt(g.fromChoice)} / ${b} ${opt(g.toChoice)} — ${tail}`;
    }
    case 'guess_pick': {
      const q = guessQuestionById(g.questionId);
      const label = (key: string) => { const o = q?.options.find((x) => x.key === key); return o ? `${o.emoji} ${o.label}` : key; };
      return `${head}${a}${t('님의 추측')} ${label(g.guess)} · ${b}${t('님의 답')} ${label(g.answer)} ${g.result === 'right' ? '✓' : '✗'}`;
    }
    case 'hot_take':
      return `${head}“${g.statement}” — ${a} ${g.reaction === 'agree' ? `🔥 ${t('동의')}` : `🧊 ${t('반대')}`}${g.note ? `: ${g.note}` : ''}`;
    case 'two_truths':
      return `${head}${a}${t('님의 선택')} #${g.guessIndex + 1} · ${g.result === 'right' ? t('정답! 거짓은') : t('아쉽! 거짓은')} “${g.statements[g.lieIndex]}”`;
    case 'emoji_week':
      return `${head}${g.emojis.join('')} — ${a}${t('님의 추측')} “${g.guess}” · ${b}: “${g.meaning}”`;
  }
}
