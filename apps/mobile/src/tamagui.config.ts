/**
 * Tamagui 설정 (디자인 v3 — Timeleft 느낌). 색·반경·간격은 packages/core/src/theme/tokens.ts 에서 가져온다.
 * 테마: light(= mist) · light_mist · light_harbor · light_glacier — <Theme name="harbor"> 처럼 쓴다.
 * 컴파일러(babel 플러그인) 없이 런타임만 쓴다.
 */
import { Platform } from 'react-native';
import { createFont, createTamagui, createTokens } from 'tamagui';
import { tokens as v5Tokens, shorthands, media } from '@tamagui/config/v5';
import { animations } from '@tamagui/config/v5-rn';
import { PALETTES, RADIUS, SPACE, TYPE, type Palette } from '@core/theme/tokens';
import { alpha } from './theme';

/** 팔레트 → Tamagui 테마 값 (Tamagui 기본 키 + 팔레트 이름 그대로) */
function themeOf(p: Palette) {
  return {
    // Tamagui 컴포넌트(Switch · Sheet · Input …)가 읽는 기본 키
    background: p.bg, backgroundHover: p.surface2, backgroundPress: p.tint, backgroundFocus: p.surface2, backgroundStrong: p.surface, backgroundTransparent: alpha(p.bg, 0),
    color: p.ink, colorHover: p.ink, colorPress: p.ink, colorFocus: p.ink, colorTransparent: alpha(p.ink, 0),
    borderColor: p.line, borderColorHover: p.tint2, borderColorPress: p.tint2, borderColorFocus: p.primary,
    placeholderColor: p.ink3, outlineColor: alpha(p.primary, 0.3), shadowColor: alpha(p.ink, 0.1), shadowColorStrong: alpha(p.ink, 0.22),
    color1: p.bg, color2: p.surface2, color3: p.tint, color4: p.tint2, color5: p.line, color6: p.tint2,
    color7: p.ink3, color8: p.ink3, color9: p.primary, color10: p.primaryPress, color11: p.ink2, color12: p.ink,
    // 팔레트 이름 ($primary · $tint · $ink …)
    bg: p.bg, surface: p.surface, surface2: p.surface2, line: p.line, tint: p.tint, tint2: p.tint2,
    primary: p.primary, primaryPress: p.primaryPress, onPrimary: p.onPrimary,
    ink: p.ink, ink2: p.ink2, ink3: p.ink3, link: p.link,
    ok: p.ok, okSoft: p.okSoft, warn: p.warn, warnSoft: p.warnSoft, danger: p.danger, dangerSoft: p.dangerSoft,
    scrim: alpha(p.ink, 0.35),
  };
}

const tokens = createTokens({
  ...v5Tokens,
  color: {},
  radius: { ...v5Tokens.radius, card: RADIUS.card, cardSm: RADIUS.cardSm, input: RADIUS.input, pill: RADIUS.pill },
  space: { ...v5Tokens.space, cardPad: SPACE.cardPad, cardGap: SPACE.cardGap, section: SPACE.section, screenX: SPACE.screenX },
});

/** Plus Jakarta Sans — 네이티브는 굵기별 패밀리(src/fonts.ts 가 불러온 것), 웹은 fonts.ts 가 묶은 "PJS" */
const isWeb = Platform.OS === 'web';
const face = (name: string) => ({ normal: name, italic: name });
const lh = (size: number, ratio: number) => Math.round(size * ratio);
const sans = createFont({
  family: isWeb ? '"PJS", "Plus Jakarta Sans", "Noto Sans KR", system-ui, -apple-system, sans-serif' : 'PlusJakartaSans_400Regular',
  // 1 캡션 12 · 2 보조 13 · 3 14 · 4 본문 15 · 5 카드 제목 17 · 6 섹션 제목 20 · 7 title 22 · 8 display 30
  size: { 1: TYPE.caption.size, 2: TYPE.label.size, 3: 14, 4: TYPE.body.size, true: TYPE.body.size, 5: TYPE.headline.size, 6: 20, 7: TYPE.title.size, 8: TYPE.display.size },
  lineHeight: { 1: lh(12, 1.4), 2: lh(13, 1.3), 3: lh(14, 1.45), 4: lh(15, 1.5), true: lh(15, 1.5), 5: lh(17, 1.35), 6: lh(20, 1.25), 7: lh(22, 1.25), 8: lh(30, 1.15) },
  weight: { 1: '500', 2: '600', 3: '400', 4: '400', true: '400', 5: '700', 6: '700', 7: '700', 8: '800' },
  letterSpacing: { 1: 0, 4: 0, true: 0, 5: -0.17, 6: -0.4, 7: -0.44, 8: -0.6 },
  ...(isWeb ? {} : {
    face: {
      400: face('PlusJakartaSans_400Regular'), 500: face('PlusJakartaSans_500Medium'), 600: face('PlusJakartaSans_600SemiBold'),
      700: face('PlusJakartaSans_700Bold'), 800: face('PlusJakartaSans_800ExtraBold'),
    },
  }),
});

const mist = themeOf(PALETTES.mist);
export const config = createTamagui({
  animations,
  tokens,
  media,
  shorthands,
  fonts: { body: sans, heading: sans },
  themes: {
    light: mist,
    light_mist: mist,
    light_harbor: themeOf(PALETTES.harbor),
    light_glacier: themeOf(PALETTES.glacier),
  },
  defaultFont: 'body',
  settings: { allowedStyleValues: false, onlyAllowShorthands: false, styleCompat: 'react-native', fastSchemeChange: true },
});

export type AppTamaguiConfig = typeof config;
declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppTamaguiConfig {}
}
export default config;
