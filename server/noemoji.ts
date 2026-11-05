/**
 * 앱으로 보내는 모든 화면 데이터에서 이모지를 뺀다 (사장님 2026-11-03: "이모지는 그냥 없애셈").
 * DB 는 그대로 두고(라이브 DB 쓰기 없음) 보낼 때만 — 예시 글, 사용자 글·댓글·프로필, 모임·공고 제목 모두.
 *   - 글자 칸(제목·본문·이름·소개 등): 이모지 문자를 지운다
 *   - 그림 칸(avatar/logo/cover 의 emoji): 사람은 이름 머리글자, 나머지는 빈칸
 * 키(예: 반응 이모지를 키로 쓰는 맵)와 id·주소 등 다른 값은 건드리지 않는다.
 */
import { stripEmoji, initialsOf } from '@core/lib/orglinks';

const PICTO = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}\u{20E3}\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}]/u;
const TEXT_KEYS = new Set(['title', 'body', 'content', 'text', 'description', 'nickname', 'name', 'bio', 'host', 'answer', 'caption', 'comment', 'message', 'note', 'notes', 'tagline', 'headline', 'question', 'prompt', 'label', 'location', 'eligibility', 'benefit', 'period', 'how', 'preview', 'lastMessage']);
const PICTURE_KEYS = new Set(['avatar', 'logo', 'cover', 'icon']);

function clean(v: unknown, key: string | undefined, owner: Record<string, unknown> | undefined): unknown {
  if (typeof v === 'string') {
    if (key && TEXT_KEYS.has(key) && PICTO.test(v)) return stripEmoji(v);
    if (key && TEXT_KEYS.has(key)) return v;
    return v;
  }
  if (Array.isArray(v)) {
    let changed = false; const out = v.map((x) => { const y = clean(x, key, owner); if (y !== x) changed = true; return y; });
    return changed ? out : v;
  }
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>; let out: Record<string, unknown> | undefined;
    for (const [k, x] of Object.entries(o)) {
      let y: unknown;
      if (PICTURE_KEYS.has(k) && x && typeof x === 'object' && typeof (x as { emoji?: unknown }).emoji === 'string' && PICTO.test((x as { emoji: string }).emoji)) {
        const who = typeof o.nickname === 'string' ? o.nickname : typeof o.name === 'string' ? o.name : '';
        y = { ...(x as object), emoji: k === 'avatar' || k === 'logo' ? initialsOf(who) : '' };
      } else y = clean(x, k, o);
      if (y !== x) (out ??= { ...o })[k] = y;
    }
    return out ?? v;
  }
  return v;
}

/** 이모지 없는 사본 (바뀐 곳만 새 객체 — 나머지는 그대로 공유) */
export function noEmojiView<T>(x: T): T { return clean(x, undefined, undefined) as T; }
