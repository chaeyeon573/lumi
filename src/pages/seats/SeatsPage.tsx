import { useNavigate } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';
import { Button, CardSkeleton, EmptyState, ErrorState } from '@/components/ui';
import { SeatWatchRow, LAG_NOTE } from '@/components/seats/SeatWatch';
import { useCampusStore, useSeatWatches } from '@/hooks/useCampusData';

/** 좌석 알림 전체 — 알림을 누르면 여기로 온다 */
export function SeatsPage() {
  const nav = useNavigate();
  const { seats, status } = useSeatWatches(true);
  const reload = useCampusStore((s) => s.loadSeats);
  return (
    <div className="min-h-full pb-10">
      <TopBar back title="Seat alerts" />
      {status === 'loading' && !seats && <CardSkeleton count={2} />}
      {status === 'error' && !seats && <ErrorState onRetry={() => reload(true)} />}
      {seats && (seats.watches.length === 0 ? (
        <EmptyState emoji="🪑" title="No classes watched yet" description={seats.watchableTerms.length ? `Watch a ${seats.watchableTerms.join(' / ')} class from Timetable › Add class.` : 'Seat alerts open when next term’s class schedule is out.'}
          action={seats.watchableTerms.length ? <Button size="sm" onClick={() => nav(`/timetable?add=1&term=${encodeURIComponent(seats.watchableTerms[0])}`)}>Find a class</Button> : undefined} />
      ) : (
        <div className="px-4 space-y-3">
          <div className="card px-4 divide-y divide-line">{seats.watches.map((w) => <SeatWatchRow key={w.id} w={w} />)}</div>
          <p className="text-[11px] text-ink-3">{LAG_NOTE} Lumi checks watched classes every 15 minutes during enrollment phases and hourly otherwise, and stops after the term’s add deadline.</p>
        </div>
      ))}
    </div>
  );
}
