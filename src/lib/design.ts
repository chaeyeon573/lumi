import { useSyncExternalStore } from 'react';

/**
 * 디자인 스위치 — 지금 디자인(classic)과 Lumi v2(docs/design/lumi-v2)를 같은 링크에서 비교한다.
 * - 아무 주소에 `?design=v2` / `?design=classic` 을 붙이면 바뀌고 이 브라우저에 기억된다.
 * - <html data-design="v2"> 로 걸리고, src/index.css 가 그 아래에서 토큰을 갈아 끼운다.
 * 기본값은 v2 (2026-10-19 사장님 결정). 2026-10-30 사장님 결정: New(v2) 하나로 정하고 화면의 비교 알약은 없앤다 —
 * 예전에 classic 을 고른 브라우저도 v2 로 오게 키를 다시 바꾼다. ?design=classic 은 내부 비교용으로만 남는다.
 * 2026-11-02: 떠 있는 비교 알약은 버튼을 가려서 뺐고, 웹에서는 설정 → 디자인 한 줄에서 바꾼다 (SettingsPage).
 */
export type Design = 'classic' | 'v2';

const KEY = 'lumi.design.3';
const THEME_COLOR: Record<Design, string> = { classic: '#FFFFFF', v2: '#08070C' };
const listeners = new Set<() => void>();
let current: Design = 'v2';

const parse = (v: string | null | undefined): Design | null => (v === 'v2' || v === 'new' ? 'v2' : v === 'classic' || v === 'old' ? 'classic' : null);

function fromUrl(): Design | null {
  const search = new URLSearchParams(window.location.search).get('design');
  // 해시 라우팅(정적 빌드)에서는 #/path?design=v2
  const hashQuery = window.location.hash.includes('?') ? new URLSearchParams(window.location.hash.slice(window.location.hash.indexOf('?') + 1)).get('design') : null;
  return parse(search ?? hashQuery);
}

function apply(d: Design) {
  const root = document.documentElement;
  if (d === 'v2') root.dataset.design = 'v2'; else delete root.dataset.design;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[d]);
}

/** 앱 시작 전에 한 번 — 주소의 ?design= 이 있으면 그것을, 없으면 기억된 값을 쓴다 */
export function initDesign() {
  let saved: Design | null = null;
  try { saved = parse(localStorage.getItem(KEY)); } catch { /* 사생활 보호 모드 등 */ }
  const asked = fromUrl();
  current = asked ?? saved ?? 'v2';
  if (asked) { try { localStorage.setItem(KEY, asked); } catch { /* */ } }
  apply(current);
}

export function getDesign(): Design { return current; }
/** 화면 바탕색 — 브라우저 theme-color, iPhone 앱 상태 표시줄·바탕 (src/components/native) */
export const themeColor = (d: Design) => THEME_COLOR[d];

export function setDesign(d: Design) {
  current = d;
  try { localStorage.setItem(KEY, d); } catch { /* */ }
  apply(d);
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

/** 지금 디자인 — 토큰으로 안 되는 화면(Welcome 등)만 분기에 쓴다 */
export function useDesign(): Design {
  return useSyncExternalStore(subscribe, getDesign, getDesign);
}
