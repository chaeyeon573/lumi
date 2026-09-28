/**
 * 디자인 v3 — twrnc 색 이름. 값은 packages/core/src/theme/tokens.ts PALETTES 에서 가져온다 (hex 를 여기 쓰지 않는다).
 * 예전 이름은 웹 src/index.css `@theme inline` 과 같은 새 의미로 이어 붙인다:
 * primary = 맑은 파랑, primary-soft / accent-soft / sky-soft = tint, accent = tint2, brand = ink, verify = link.
 * 팔레트를 바꾸면 src/tw.ts 가 twColors(PALETTES[id]) 로 다시 만든다.
 */
const { PALETTES, DEFAULT_PALETTE } = require('../../packages/core/src/theme/tokens');

const twColors = (p) => ({
  bg: p.bg, surface: p.surface, 'surface-2': p.surface2, line: p.line,
  ink: p.ink, 'ink-2': p.ink2, 'ink-3': p.ink3,
  primary: p.primary, 'primary-deep': p.primaryPress, 'primary-soft': p.tint, 'on-primary': p.onPrimary, brand: p.ink,
  tint: p.tint, 'tint-2': p.tint2, accent: p.tint2, 'accent-soft': p.tint, 'sky-soft': p.tint,
  link: p.link, verify: p.link,
  mint: p.ok, 'mint-soft': p.okSoft, gold: p.warn, 'gold-soft': p.warnSoft, 'gold-ink': p.warn,
  danger: p.danger, 'danger-soft': p.dangerSoft, 'input-line': p.line,
});

module.exports = {
  theme: { extend: { colors: twColors(PALETTES[DEFAULT_PALETTE]) } },
  twColors,
};
