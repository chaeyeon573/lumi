/**
 * Plus Jakarta Sans 를 모든 <Text>의 기본 글꼴로. 네이티브는 fontWeight 로 굵기를 고르지 못하므로
 * Text.render 를 감싸 fontWeight → 해당 굵기의 폰트 패밀리로 바꿔 준다.
 */
import { Platform, StyleSheet, Text, type TextStyle } from 'react-native';
import React from 'react';
import {
  PlusJakartaSans_400Regular, PlusJakartaSans_400Regular_Italic, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';

export const FONTS = { PlusJakartaSans_400Regular, PlusJakartaSans_400Regular_Italic, PlusJakartaSans_500Medium, PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold, PlusJakartaSans_800ExtraBold };

const family = (w?: TextStyle['fontWeight'], italic?: boolean) => {
  const n = w === 'bold' ? 700 : w === 'normal' || !w ? 400 : Number(w);
  if (italic && n <= 400) return 'PlusJakartaSans_400Regular_Italic';
  if (n >= 800) return 'PlusJakartaSans_800ExtraBold';
  if (n >= 700) return 'PlusJakartaSans_700Bold';
  if (n >= 600) return 'PlusJakartaSans_600SemiBold';
  if (n >= 500) return 'PlusJakartaSans_500Medium';
  return 'PlusJakartaSans_400Regular';
};

let patched = false;
export function applyDefaultFont() {
  if (patched) return; patched = true;
  if (Platform.OS === 'web') { applyWebFont(); return; }
  const T = Text as unknown as { render?: (...args: unknown[]) => React.ReactElement<{ style?: TextStyle }> };
  const orig = T.render;
  if (!orig) return;
  T.render = function (this: unknown, ...args: unknown[]) {
    const el = orig.apply(this, args) as React.ReactElement<{ style?: TextStyle }>;
    const flat = (StyleSheet.flatten(el.props.style) ?? {}) as TextStyle;
    if (flat.fontFamily) return el;
    return React.cloneElement(el, { style: [{ fontFamily: family(flat.fontWeight, flat.fontStyle === 'italic') }, el.props.style] as unknown as TextStyle });
  };
}

/** 웹: 굵기별 @font-face 를 한 패밀리("PJS")로 묶고 전역 기본 글꼴로 지정한다 (RN-web 은 fontWeight 를 CSS 로 그대로 쓰므로) */
function applyWebFont() {
  if (typeof document === 'undefined') return;
  const uriOf = (mod: unknown) => (typeof mod === 'string' ? mod : (mod as { uri?: string } | null)?.uri ?? '');
  const faces = Object.entries(FONTS).map(([name, mod]) => {
    const w = Number(name.match(/_(\d{3})/)?.[1] ?? 400);
    const italic = name.endsWith('Italic');
    return `@font-face{font-family:"PJS";src:url("${uriOf(mod)}");font-weight:${w};font-style:${italic ? 'italic' : 'normal'};font-display:swap}`;
  }).join('\n');
  const el = document.createElement('style');
  el.id = 'aroundu-web-font';
  el.textContent = `${faces}\ndiv,span,p,input,textarea,button{font-family:"PJS",system-ui,-apple-system,sans-serif !important}\ninput:focus,textarea:focus{outline:none}`;
  document.head.appendChild(el);
}
