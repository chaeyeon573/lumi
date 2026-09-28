/**
 * 모바일 색 토큰 (디자인 v3) — 값의 원본은 packages/core/src/theme/tokens.ts 의 PALETTES.
 * 여기서는 hex 를 새로 만들지 않고 팔레트에서 이름만 이어 붙인다 (웹 src/index.css 의 `@theme inline` 과 같은 매핑).
 *
 * - `C` : 예전 이름(primary · soft · accent …)을 그대로 쓰는 색 객체. 팔레트가 바뀌면 같은 객체의 값이 바뀐다.
 * - `usePalette()` : 지금 팔레트 id (Tamagui <Theme name> · 다시 그리기용).
 * - `setPalette(id)` : 설정 › 데모 도구 › 색 조합. 저장은 platform 어댑터(`aroundu.palette`).
 */
import { create } from 'zustand';
import { PALETTES, DEFAULT_PALETTE, type Palette, type PaletteId } from '@core/theme/tokens';
import { getPlatform } from '@core/platform';

export const PALETTE_KEY = 'aroundu.palette';
export const PALETTE_IDS = Object.keys(PALETTES) as PaletteId[];

const hex = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const; };
/** 팔레트 색에 투명도만 입힌다 */
export const alpha = (h: string, a: number) => { const [r, g, b] = hex(h); return `rgba(${r}, ${g}, ${b}, ${a})`; };
/** 두 팔레트 색을 섞는다 (0 = a, 1 = b) */
export const mix = (a: string, b: string, t: number) => {
  const x = hex(a), y = hex(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('').toUpperCase();
};

/** 예전 이름 → 새 의미 (웹과 같은 매핑): primary=맑은 파랑, soft/accentSoft=tint, accent=tint2, verify=link, ink*=회청 글자 */
export function colorsOf(p: Palette) {
  return {
    primary: p.primary, primaryPress: p.primaryPress, onPrimary: p.onPrimary,
    soft: p.tint, accent: p.tint2, accentSoft: p.tint, tint: p.tint, tint2: p.tint2,
    bg: p.bg, surface: p.surface, surface2: p.surface2, line: p.line,
    ink: p.ink, ink2: p.ink2, ink3: p.ink3, verify: p.link, link: p.link,
    danger: p.danger, dangerSoft: p.dangerSoft, mint: p.ok, mintSoft: p.okSoft, gold: p.warn, goldSoft: p.warnSoft,
    ok: p.ok, okSoft: p.okSoft, warn: p.warn, warnSoft: p.warnSoft,
    goldInk: p.warn, goldLine: mix(p.warnSoft, p.warn, 0.35), skySoft: p.tint, inputLine: p.line,
    glass: alpha(p.surface, 0.88), glassSoft: alpha(p.surface, 0.85), glassDim: alpha(p.surface, 0.4), onDarkBtn: alpha(p.surface, 0.15),
    scrim: alpha(p.ink, 0.35), shadow: p.ink,
  };
}
export type Colors = ReturnType<typeof colorsOf>;

/** 화면 코드가 쓰는 색 객체 — 팔레트가 바뀌면 값만 바뀐다(참조는 같다) */
export const C: Colors = { ...colorsOf(PALETTES[DEFAULT_PALETTE]) };

type Listener = (id: PaletteId) => void;
const listeners = new Set<Listener>();
/** tw(twrnc) 처럼 팔레트마다 다시 만들어야 하는 것들이 구독한다 */
export const onPaletteChange = (fn: Listener) => { listeners.add(fn); return () => listeners.delete(fn); };

export function storedPalette(): PaletteId {
  try {
    const v = getPlatform().getItem(PALETTE_KEY);
    if (v && (PALETTE_IDS as string[]).includes(v)) return v as PaletteId;
  } catch { /* 저장소가 아직 없을 때 */ }
  return DEFAULT_PALETTE;
}

const usePaletteStore = create<{ id: PaletteId }>(() => ({ id: DEFAULT_PALETTE }));
export const usePalette = () => usePaletteStore((s) => s.id);
export const currentPalette = () => usePaletteStore.getState().id;

/** 팔레트를 적용한다 (C 값 · tw · Tamagui Theme). persist=false 는 부팅 때 저장값을 읽어 올 때 */
export function setPalette(id: PaletteId, persist = true) {
  Object.assign(C, colorsOf(PALETTES[id]));
  listeners.forEach((fn) => fn(id));
  if (persist) { try { getPlatform().setItem(PALETTE_KEY, id); } catch { /* */ } }
  usePaletteStore.setState({ id });
}
