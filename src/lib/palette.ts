import { PALETTES, DEFAULT_PALETTE, type PaletteId } from '@core/theme/tokens';

/** 색 조합(data-palette) — 데모에서 3개를 비교하려고 둔다. 저장은 이 브라우저에만 */
const KEY = 'aroundu.palette';
const ids = Object.keys(PALETTES) as PaletteId[];

export function currentPalette(): PaletteId {
  try {
    const q = new URLSearchParams(window.location.search).get('palette') ?? new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('palette');
    if (q && ids.includes(q as PaletteId)) { localStorage.setItem(KEY, q); return q as PaletteId; }
    const v = localStorage.getItem(KEY);
    if (v && ids.includes(v as PaletteId)) return v as PaletteId;
  } catch { /* 저장소 접근이 막힌 경우 */ }
  return DEFAULT_PALETTE;
}

export function applyPalette(id: PaletteId = currentPalette()) {
  document.documentElement.dataset.palette = id;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', PALETTES[id].bg);
}

export function setPalette(id: PaletteId) {
  try { localStorage.setItem(KEY, id); } catch { /* */ }
  applyPalette(id);
}

export const PALETTE_IDS = ids;
