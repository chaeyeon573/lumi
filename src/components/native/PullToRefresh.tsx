import { useEffect, useRef, useState, type RefObject } from 'react';
import { RotateCw } from 'lucide-react';
import { useAppStore } from '@core/store/useAppStore';
import { haptic } from '@/lib/native';

const THRESHOLD = 64;
const MAX = 110;

/** Is anything between the finger and the page scrolled down, or does it want the drag (map, data-no-ptr)? */
function blocked(target: EventTarget | null, root: HTMLElement): boolean {
  for (let el = target as HTMLElement | null; el && el !== root; el = el.parentElement) {
    if (el.closest?.('.leaflet-container, [data-no-ptr]')) return true;
    if (el.scrollTop > 0) return true;
  }
  return root.scrollTop > 0;
}

/**
 * Pull-to-refresh for the iPhone app (AppShell renders it only there). The app scrolls inside #scroll-root,
 * not the document, so WKWebView's own refresh control never sees the pull — this does it in the page.
 * Refresh = re-fetch everything (store.refresh) + a `lumi:refresh` event for screens that load their own data.
 */
export function PullToRefresh({ target }: { target: RefObject<HTMLElement | null> }) {
  const [pull, setPull] = useState(0);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  useEffect(() => {
    const el = target.current;
    if (!el) return;
    let startY: number | null = null;
    let dist = 0;
    let armed = false;
    const onStart = (e: TouchEvent) => { startY = !busyRef.current && e.touches.length === 1 && !blocked(e.target, el) ? e.touches[0].clientY : null; dist = 0; armed = false; };
    const onMove = (e: TouchEvent) => {
      if (startY === null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy <= 0 || el.scrollTop > 0) { if (dist) { dist = 0; setPull(0); } return; }
      dist = Math.min(MAX, dy * 0.5);
      setPull(dist);
      if (dist >= THRESHOLD && !armed) { armed = true; haptic('light'); }
      if (dist < THRESHOLD) armed = false;
    };
    const onEnd = async () => {
      if (startY === null) return;
      startY = null;
      if (dist >= THRESHOLD) {
        busyRef.current = true; setBusy(true); setPull(THRESHOLD);
        try { await useAppStore.getState().refresh(); window.dispatchEvent(new Event('lumi:refresh')); }
        finally { busyRef.current = false; setBusy(false); }
      }
      dist = 0; setPull(0);
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [target]);
  if (!pull && !busy) return null;
  return (
    <div className="absolute top-0 inset-x-0 z-[1040] flex justify-center pointer-events-none" style={{ transform: `translateY(${Math.max(8, pull - 28)}px)` }} aria-hidden data-testid="ptr">
      <span className="h-9 w-9 rounded-full bg-surface border border-line shadow-[var(--shadow-float)] grid place-items-center text-ink-2" style={{ opacity: Math.min(1, pull / THRESHOLD) || 1 }}>
        <RotateCw size={16} className={busy ? 'animate-spin' : ''} style={busy ? undefined : { transform: `rotate(${pull * 3}deg)` }} />
      </span>
    </div>
  );
}
