/**
 * Harness A 색 묶음 — PDF 의 4 카테고리 틴트(+보라)를 어두운 바탕용으로 옮긴 것 (src/index.css `--color-t-*`).
 * 아이콘 칸·홈 타일·배지가 같은 쌍을 쓴다. 색 이름이 아니라 "무엇의 색"으로 고른다:
 *   events → ice · opportunities → peach · clubs/communities → mint · meetups/people → rose · campus life/AI → lav
 */
export type Tone = 'ice' | 'peach' | 'mint' | 'rose' | 'lav' | 'neutral' | 'sel';

/** 바탕 + 아이콘(글자)색 */
export const TONE: Record<Tone, string> = {
  ice: 'bg-t-ice text-t-ice-fg',
  peach: 'bg-t-peach text-t-peach-fg',
  mint: 'bg-t-mint text-t-mint-fg',
  rose: 'bg-t-rose text-t-rose-fg',
  lav: 'bg-t-lav text-t-lav-fg',
  neutral: 'bg-surface-2 text-ink-2',
  sel: 'bg-sel-soft text-sel-fg',
};

/** 아이콘색만 (바탕 없이) */
export const TONE_FG: Record<Tone, string> = {
  ice: 'text-t-ice-fg', peach: 'text-t-peach-fg', mint: 'text-t-mint-fg', rose: 'text-t-rose-fg', lav: 'text-t-lav-fg', neutral: 'text-ink-2', sel: 'text-sel-fg',
};

/**
 * 글 카드 왼쪽 3px 색 줄 (2026-11-06 사장님 option C) — 칩과 같은 색. 사진이 있는 카드도 같이 (목록이 한 모양으로 보이게)
 */
export const TONE_STRIPE: Record<Tone, string> = {
  ice: 'border-l-[3px] border-l-t-ice-fg', peach: 'border-l-[3px] border-l-t-peach-fg', mint: 'border-l-[3px] border-l-t-mint-fg',
  rose: 'border-l-[3px] border-l-t-rose-fg', lav: 'border-l-[3px] border-l-t-lav-fg', neutral: '', sel: 'border-l-[3px] border-l-sel-fg',
};

/** 카테고리 → 색 (홈 타일·Explore 배지·검색의 Explore more 가 같은 표를 쓴다) */
export const CATEGORY_TONE = { events: 'ice', opportunities: 'peach', clubs: 'mint', meetups: 'rose' } as const satisfies Record<string, Tone>;
