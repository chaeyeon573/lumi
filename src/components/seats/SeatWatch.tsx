import { useNavigate } from 'react-router-dom';
import { Armchair, BellRing, Bell, ExternalLink, ChevronRight, X } from 'lucide-react';
import { Button, Tag } from '@/components/ui';
import { useAppStore } from '@core/store/useAppStore';
import { useCampusStore, useSeatWatches } from '@/hooks/useCampusData';
import { CALCENTRAL_URL, agoText, seatLine, seatSourceOk, seatState, type SeatWatchItem } from '@core/lib/seats';
import type { CatalogCourse } from '@core/api/types';
import { cn } from '@core/lib/cn';

/** 수업 목록의 "Watch seats" — 다음 학기(add 마감 전) 공개 시간표가 있는 수업에만 보인다 */
export function WatchSeatsButton({ course, className }: { course: Pick<CatalogCourse, 'id' | 'code' | 'term' | 'url'>; className?: string }) {
  const { seats } = useSeatWatches();
  const busy = useCampusStore((s) => s.busy);
  const watch = useCampusStore((s) => s.watch);
  const unwatch = useCampusStore((s) => s.unwatch);
  const toast = useAppStore((s) => s.showToast);
  if (!seats?.supported || !seatSourceOk(course.url) || !seats.watchableTerms.includes(course.term)) return null;
  const mine = seats.watches.find((w) => w.url === course.url);
  const on = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (mine) { await unwatch(mine.id); toast(`Stopped watching ${course.code}.`); }
      else {
        const v = await watch(course.id);
        const w = v.watches.find((x) => x.url === course.url);
        toast(w?.latest ? `Watching ${course.code} — ${seatLine(w.latest)}. We’ll tell you when seats open.` : `Watching ${course.code}. We’ll tell you when seats open.`, 'success');
      }
    } catch (err) { toast((err as Error).message, 'error'); }
  };
  return (
    <button type="button" onClick={on} disabled={!!busy} aria-pressed={!!mine}
      className={cn('h-8 px-3 rounded-full text-[12px] font-semibold inline-flex items-center gap-1 shrink-0 press disabled:opacity-60', mine ? 'bg-mint-soft text-mint' : 'bg-surface-2 text-primary', className)}>
      {mine ? <BellRing size={13} /> : <Bell size={13} />}{busy === course.id || (mine && busy === mine.id) ? '…' : mine ? 'Watching' : 'Watch seats'}
    </button>
  );
}

function StatusTag({ w }: { w: SeatWatchItem }) {
  if (w.ended) return <Tag className="rounded-full">Ended</Tag>;
  if (!w.latest) return <Tag className="rounded-full">Checking…</Tag>;
  const s = seatState(w.latest);
  return <Tag tone={s === 'open' ? 'mint' : s === 'waitlist' ? 'gold' : 'danger'} className="rounded-full">{s === 'open' ? 'Open' : s === 'waitlist' ? 'Waitlist' : 'Closed'}</Tag>;
}

export function SeatWatchRow({ w }: { w: SeatWatchItem }) {
  const unwatch = useCampusStore((s) => s.unwatch);
  const busy = useCampusStore((s) => s.busy);
  const toast = useAppStore((s) => s.showToast);
  return (
    <div className="py-3">
      <div className="flex items-start gap-3">
        <span className="flex-1 min-w-0">
          <span className="block text-[14px] font-semibold text-primary leading-snug">{w.code} <span className="font-medium text-ink-2">{w.title}</span></span>
          <span className="block text-[12px] text-ink-2 mt-0.5">{w.latest ? seatLine(w.latest) : w.ended ? '' : 'First check in progress'}{w.latest && w.latest.openReserved > 0 ? ` · ${w.latest.openReserved} reserved` : ''}</span>
          <span className="block text-[11px] text-ink-3">{w.term}{w.checkedAt ? ` · updated ${agoText(w.checkedAt)}` : ''}{w.ended ? ' · add deadline passed — no longer watching' : w.until ? ` · watching until ${w.until.slice(5).replace('-', '/')}` : ''}{w.error ? ` · ${w.error}` : ''}</span>
        </span>
        <StatusTag w={w} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 whitespace-nowrap">
        <a href={CALCENTRAL_URL} target="_blank" rel="noreferrer" className="h-8 px-3 rounded-full bg-primary text-white v2:text-on-primary text-[12px] font-semibold inline-flex items-center gap-1">Enroll on CalCentral<ExternalLink size={12} /></a>
        <a href={w.url} target="_blank" rel="noreferrer" className="h-8 px-3 rounded-full bg-surface-2 text-primary text-[12px] font-semibold inline-flex items-center gap-1">Class page<ExternalLink size={12} /></a>
        <button type="button" disabled={busy === w.id} onClick={async () => { try { await unwatch(w.id); toast(`Stopped watching ${w.code}.`); } catch (e) { toast((e as Error).message, 'error'); } }} className="ml-auto h-8 w-8 rounded-full text-ink-3 grid place-items-center press" aria-label={`Unwatch ${w.code}`} title="Unwatch"><X size={16} /></button>
      </div>
    </div>
  );
}

const LAG_NOTE = 'Seat numbers come from the public class schedule and may lag. Lumi can’t enroll for you — use CalCentral.';

/** Me · Seat alerts 카드 (좌석 알림을 지원하는 학교만) */
export function SeatWatchCard() {
  const nav = useNavigate();
  const { seats } = useSeatWatches(true);
  if (!seats?.supported) return null;
  const active = seats.watches.filter((w) => !w.ended);
  return (
    <section className="card p-5" aria-label="Seat alerts">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display text-[20px] font-bold text-primary flex items-center gap-2"><Armchair size={18} />Seat alerts</h2>
        {seats.watches.length > 0 && <button onClick={() => nav('/seats')} className="text-[13px] font-semibold text-verify flex items-center">All ({seats.watches.length})<ChevronRight size={15} /></button>}
      </div>
      {active.length === 0 ? (
        <>
          <p className="text-[13px] text-ink-2">{seats.watchableTerms.length ? `Watch a ${seats.watchableTerms.join(' / ')} class and Lumi tells you when seats open, the waitlist moves, or it’s almost full.` : 'Seat alerts open when next term’s class schedule is out.'}</p>
          {seats.watchableTerms.length > 0 && <Button size="sm" variant="secondary" className="mt-3" onClick={() => nav(`/timetable?add=1&term=${encodeURIComponent(seats.watchableTerms[0])}`)}>Find a class to watch</Button>}
        </>
      ) : (
        <div className="divide-y divide-line">{active.slice(0, 3).map((w) => <SeatWatchRow key={w.id} w={w} />)}</div>
      )}
      <p className="mt-2 text-[11px] text-ink-3">{LAG_NOTE}</p>
    </section>
  );
}

export { LAG_NOTE };
