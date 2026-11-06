import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import { lang } from '@core/i18n';
import { cn } from '@core/lib/cn';
import { shellEl } from '@/components/ui/Sheet';
import { Btn, Chip } from './Controls';
import { appliedChips, pickValues, resetValues, sortGroup, sortLabel, toggleValue, type FilterGroup, type FilterValues } from './filterModel';

const en = lang === 'en';

/**
 * 검색칸 아래 한 줄 (owner 2026-11-06, 보드의 B안): [슬라이더 "Filters" n] + 적용된 필터만 × 칩.
 * 아무것도 안 골랐으면 Filters 버튼만, 오른쪽에 지금 정렬을 조용히 ("Recommended ▾") — 누르면 같은 시트의 Sort 로.
 * 정렬이 기본이 아니면 칩이 있어도 오른쪽에 남는다 (목록 순서를 숨기지 않는다).
 * 값은 부르는 쪽이 들고 있다 (Explore 는 URL) — 시트에서 "Show N results" 를 눌러야 onApply.
 * count(draft) 는 목록과 같은 거르기 함수로 센다 (부르는 쪽 책임).
 */
export function FilterBar({ groups, values, onApply, count, className }: {
  groups: FilterGroup[]; values: FilterValues; onApply: (next: FilterValues) => void; count: (draft: FilterValues) => number; className?: string;
}) {
  const [open, setOpen] = useState<{ focus?: string } | null>(null);
  const cur = pickValues(groups, values);
  const chips = appliedChips(groups, cur);
  const sort = sortLabel(groups, cur);
  const sg = sortGroup(groups);
  const showSort = !!sort && (chips.length === 0 || !sort.isDefault);
  const n = chips.length;
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 min-w-0 flex items-center gap-2 overflow-x-auto hide-scrollbar -ml-4 pl-4', !showSort && '-mr-4 pr-4')}>
        <button type="button" onClick={() => setOpen({})} aria-haspopup="dialog" aria-expanded={!!open}
          aria-label={n ? (en ? `Filters, ${n} applied` : `필터 ${n}개 적용됨`) : (en ? 'Filters' : '필터')}
          className={cn('shrink-0 inline-flex items-center gap-1.5 h-9 pl-3 pr-3.5 rounded-full border text-[13px] font-semibold whitespace-nowrap press',
            n ? 'bg-sel-soft border-sel-line text-sel-fg' : 'bg-surface border-line text-ink')}>
          <SlidersHorizontal size={15} />
          <span>{en ? 'Filters' : '필터'}{n > 0 && ` (${n})`}</span>
        </button>
        {chips.map((c) => (
          <button key={c.key} type="button" onClick={() => onApply({ ...cur, [c.key]: '' })} aria-label={en ? `Remove ${c.label}` : `${c.label} 빼기`}
            className="shrink-0 inline-flex items-center gap-1 h-9 pl-3.5 pr-2.5 rounded-full border bg-sel-soft border-sel-line text-sel-fg text-[13px] font-semibold whitespace-nowrap press">
            {c.label}<X size={14} strokeWidth={2.5} />
          </button>
        ))}
      </div>
      {showSort && sg && (
        <button type="button" onClick={() => setOpen({ focus: sg.key })} aria-haspopup="dialog" aria-label={en ? `Sort: ${sort!.label}` : `정렬: ${sort!.label}`}
          className="shrink-0 inline-flex items-center gap-0.5 h-9 pl-1 text-[13px] font-semibold text-ink-2 whitespace-nowrap press">
          {sort!.label}<ChevronDown size={15} />
        </button>
      )}
      <FilterSheet open={!!open} focus={open?.focus} groups={groups} values={cur} count={count}
        onClose={() => setOpen(null)} onApply={(v) => { setOpen(null); onApply(v); }} />
    </div>
  );
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * 필터 시트 (owner 2026-11-06, 보드의 1안) — 지금 화면 위로 올라오는 아래 시트.
 * 머리 "Filters" + Reset, 칩 묶음(고른 칩 = 핑크), 맨 아래 붙은 라벤더 "Show N results"(고르는 대로 수가 바뀐다).
 * 고르는 동안은 초안 — Show 를 눌러야 적용, Esc · 아래로 밀기 · 바깥 누르기 · × 는 그냥 닫는다.
 * 포커스는 시트 안에서만 돈다. focus 를 주면 그 묶음으로 스크롤하고 고른 칩에 포커스.
 */
export function FilterSheet({ open, ...rest }: {
  open: boolean; onClose: () => void; onApply: (next: FilterValues) => void; groups: FilterGroup[]; values: FilterValues; count: (draft: FilterValues) => number; focus?: string; title?: string;
}) {
  if (!open) return null;
  return createPortal(<SheetBody {...rest} />, shellEl());
}

function SheetBody({ onClose, onApply, groups, values, count, focus, title }: {
  onClose: () => void; onApply: (next: FilterValues) => void; groups: FilterGroup[]; values: FilterValues; count: (draft: FilterValues) => number; focus?: string; title?: string;
}) {
  const [draft, setDraft] = useState<FilterValues>(() => pickValues(groups, values));
  const [drag, setDrag] = useState<number | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const start = useRef<{ y: number; id: number; captured: boolean; dy: number } | null>(null);
  const id = useId();
  const n = count(draft);
  const blank = resetValues(groups);
  const isBlank = groups.every((g) => (draft[g.key] ?? '') === blank[g.key]);
  const label = n === 0 ? (en ? 'No results' : '결과 없음') : en ? `Show ${n} result${n === 1 ? '' : 's'}` : `결과 ${n}개 보기`;

  // 열릴 때: 고른 묶음으로 스크롤 + 포커스, 닫힐 때: 연 버튼으로 포커스를 돌려준다
  useLayoutEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const sec = focus ? panel.current?.querySelector<HTMLElement>(`[data-group="${focus}"]`) : null;
    if (sec && scroller.current) scroller.current.scrollTop = sec.offsetTop - scroller.current.offsetTop - 8;
    const target = sec?.querySelector<HTMLElement>('[aria-pressed="true"]') ?? panel.current;
    target?.focus({ preventScroll: true });
    return () => opener?.focus?.({ preventScroll: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab' || !panel.current) return;
    const els = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((x) => x.offsetParent !== null);
    if (!els.length) { e.preventDefault(); return; }
    const first = els[0], last = els[els.length - 1], at = document.activeElement;
    if (e.shiftKey && (at === first || at === panel.current)) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && at === last) { e.preventDefault(); first.focus(); }
  };

  // 아래로 밀어 닫기 — 손잡이·머리에서. 버튼 누르기를 막지 않게 6px 움직인 뒤에야 잡는다
  const down = (e: PointerEvent<HTMLDivElement>) => { start.current = { y: e.clientY, id: e.pointerId, captured: false, dy: 0 }; };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    s.dy = Math.max(0, e.clientY - s.y);
    if (!s.captured && s.dy > 6) { s.captured = true; e.currentTarget.setPointerCapture(e.pointerId); }
    if (s.captured) setDrag(s.dy);
  };
  const up = () => {
    const far = (start.current?.dy ?? 0) > 80;
    start.current = null;
    setDrag(null);
    if (far) onClose();
  };

  return (
    <div className="absolute inset-0 z-[1100] flex items-end animate-fade-in">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden />
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} tabIndex={-1} onKeyDown={onKeyDown}
        className={cn('relative w-full max-h-[88%] flex flex-col bg-surface border-t border-line rounded-t-[24px] shadow-[var(--shadow-sheet)] animate-sheet-up outline-none', drag == null && 'transition-transform duration-200')}
        style={drag ? { transform: `translateY(${drag}px)` } : undefined}>
        <div className="shrink-0 touch-none select-none" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line" aria-hidden />
          <div className="flex items-center gap-1 px-2 pt-1 pb-2">
            <button type="button" onClick={onClose} aria-label={en ? 'Close' : '닫기'} className="h-10 w-10 grid place-items-center rounded-full text-ink press"><X size={20} /></button>
            <h2 id={`${id}-t`} className="flex-1 text-[17px] font-bold tracking-[-0.01em]">{title ?? (en ? 'Filters' : '필터')}</h2>
            <button type="button" onClick={() => setDraft(blank)} disabled={isBlank} className="h-10 px-3 text-[14px] font-semibold text-sel-fg press disabled:opacity-40">{en ? 'Reset' : '초기화'}</button>
          </div>
        </div>
        <div ref={scroller} className="flex-1 min-h-0 overflow-y-auto overscroll-contain border-t border-line px-4 pb-5">
          {groups.map((g) => (
            <section key={g.key} data-group={g.key} aria-labelledby={`${id}-${g.key}`} className="pt-5">
              <h3 id={`${id}-${g.key}`} className="text-[13px] font-semibold text-ink-2 mb-2.5">{g.title}</h3>
              <div role="group" aria-labelledby={`${id}-${g.key}`} className="flex flex-wrap gap-2">
                {g.options.map((o) => (
                  <Chip key={o.value || '_'} active={(draft[g.key] ?? '') === o.value} onClick={() => setDraft((d) => toggleValue(groups, d, g.key, o.value))}>{o.label}</Chip>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="shrink-0 border-t border-line px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Btn full size="lg" disabled={n === 0} aria-label={label} onClick={() => onApply(draft)}>{label}</Btn>
          <span className="sr-only" aria-live="polite">{label}</span>
        </div>
      </div>
    </div>
  );
}
