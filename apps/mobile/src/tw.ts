import { create, plugin } from 'twrnc';
import { PALETTES, DEFAULT_PALETTE, RADIUS, SHADOW, type PaletteId } from '@core/theme/tokens';
import { onPaletteChange } from './theme';

// 색 이름은 tailwind.config.js (값은 core tokens PALETTES). 팔레트마다 twrnc 인스턴스를 하나씩 만들어 둔다.
const cfg = require('../tailwind.config.js') as { twColors: (p: (typeof PALETTES)[PaletteId]) => Record<string, string> };
type Tw = ReturnType<typeof create>;
const cache = new Map<PaletteId, Tw>();
const make = (id: PaletteId): Tw => {
  let inst = cache.get(id);
  if (!inst) {
    const p = PALETTES[id];
    inst = create({
      theme: { extend: { colors: cfg.twColors(p) } },
      plugins: [plugin(({ addUtilities }) => {
        addUtilities({
          /** 카드 규칙 (UX-SPEC 13): 반경 20 · 흰 면 · 1px 선 · 아주 옅은 그림자 — ui.tsx CardFrame 과 같다 */
          card: { borderRadius: RADIUS.card, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, boxShadow: SHADOW.card } as never,
          'card-sm': { borderRadius: RADIUS.cardSm, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface } as never,
        });
      })],
    });
    cache.set(id, inst);
  }
  return inst;
};
let current = make(DEFAULT_PALETTE);
onPaletteChange((id) => { current = make(id); });

/** style={tw`...`} — 지금 팔레트의 twrnc 로 넘긴다 */
export const tw = ((strings: TemplateStringsArray, ...values: (string | number)[]) => current(strings, ...values)) as Tw;
