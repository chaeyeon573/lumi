import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, ShieldCheck } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Chip, EmptyState, Button, Segmented } from '@/components/ui';
import { SchoolEmailCard } from '@/components/settings/SchoolEmailCard';
import { RideCard, SeasonCard, useRideCalendar, useRides } from '@/components/rides/RideBits';
import { useViewer } from '@/hooks/useViewer';
import {
  campusToday, dayLabel, departMin, filterGroupOf, isInRide, rideDestinations, rideEligibility, schoolOf, upcomingSeason, RIDE_FILTERS, SAFETY_NOTE, type Ride,
} from '@core/lib/rides';

type View = 'all' | 'mine';

/** /rides — browse by destination and time · /rides?mine=1 — My rides (Me › My rides) */
export function RidesPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const v = useViewer();
  const rides = useRides();
  const view: View = params.get('mine') ? 'mine' : 'all';
  const filter = params.get('filter') ?? 'all';
  const to = params.get('to') ?? '';
  const set = (p: Record<string, string>) => { const n = new URLSearchParams(params); for (const [k, val] of Object.entries(p)) { if (val) n.set(k, val); else n.delete(k); } setParams(n, { replace: true }); };
  const today = campusToday();
  const school = schoolOf(v.me);
  const eligible = rideEligibility(v.me);
  const season = upcomingSeason(school, today, useRideCalendar(school));
  const dests = rideDestinations(school);

  const list = useMemo(() => {
    const groups = RIDE_FILTERS.find((f) => f.key === filter)?.groups ?? null;
    const base = view === 'mine'
      ? rides.filter((r) => isInRide(r, v.me.id))
      : rides.filter((r) => r.status !== 'cancelled' && r.date >= today && (!groups || groups.includes(filterGroupOf(r))) && (!to || r.to === to));
    return base.sort((a, b) => departMin(a) - departMin(b));
  }, [rides, view, filter, to, today, v.me.id]);
  const upcoming = view === 'mine' ? list.filter((r) => r.date >= today && r.status !== 'cancelled') : list;
  const past = view === 'mine' ? list.filter((r) => r.date < today || r.status === 'cancelled').reverse() : [];

  const byDay = (xs: Ride[]) => { const m = new Map<string, Ride[]>(); for (const r of xs) (m.get(r.date) ?? m.set(r.date, []).get(r.date)!).push(r); return [...m.entries()]; };
  const toLabel = dests.find((d) => d.key === to)?.label;

  return (
    <div className="min-h-full pb-28 bg-bg">
      <TopBar back title="Rides" />
      <div className="px-4 pt-2">
        <Segmented value={view} onChange={(x) => set({ mine: x === 'mine' ? '1' : '', filter: '', to: '' })} options={[{ value: 'all', label: 'Find a ride' }, { value: 'mine', label: 'My rides' }]} />
        {!eligible.ok && <div className="mt-3"><p className="text-[13px] text-ink-2 mb-2">{eligible.reason}</p>{!eligible.minor && <SchoolEmailCard />}</div>}

        {view === 'all' && (
          <>
            {season && <SeasonCard season={season} className="mt-3" onPick={(k) => set({ to: to === k ? '' : k, filter: 'airports' })} />}
            <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mt-4">
              {RIDE_FILTERS.map((f) => <Chip key={f.key} active={filter === f.key && !to} onClick={() => set({ filter: f.key === 'all' ? '' : f.key, to: '' })}>{f.label}</Chip>)}
            </div>
            {toLabel && <div className="mt-2 flex items-center gap-2 text-[13px] text-ink-2">Showing rides to <b className="text-ink">{toLabel}</b><button className="text-primary font-semibold" onClick={() => set({ to: '' })}>Clear</button></div>}
          </>
        )}

        <div className="mt-4 space-y-5">
          {upcoming.length === 0 && (
            <EmptyState emoji={view === 'mine' ? '🚗' : '🛣️'} title={view === 'mine' ? 'No rides yet' : toLabel ? `No rides to ${toLabel} yet` : 'No rides here yet'}
              description={view === 'mine' ? 'Rides you post or join show up here.' : 'Post yours — students leaving within 90 minutes of you will see it as a match.'}
              action={eligible.ok ? <Button size="sm" onClick={() => nav(`/rides/new${to ? `?to=${to}` : ''}`)}>Post a ride</Button> : undefined} />
          )}
          {byDay(upcoming).map(([day, xs]) => (
            <section key={day}>
              <h2 className="font-display text-[17px] font-bold text-primary mb-2">{day === today ? 'Today' : dayLabel(day)}</h2>
              <div className="space-y-2.5">{xs.map((r) => <RideCard key={r.id} ride={r} />)}</div>
            </section>
          ))}
          {past.length > 0 && (
            <section>
              <h2 className="font-display text-[17px] font-bold text-ink-3 mb-2">Past & cancelled</h2>
              <div className="space-y-2.5">{past.map((r) => <RideCard key={r.id} ride={r} />)}</div>
            </section>
          )}
        </div>
        <p className="mt-6 flex gap-2 text-[12px] text-ink-3 leading-snug"><ShieldCheck size={15} className="shrink-0 text-mint" />{SAFETY_NOTE}</p>
      </div>
      {eligible.ok && (
        <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-3 safe-bottom z-20 bg-gradient-to-t from-bg via-bg/90 to-transparent">
          <Button full size="lg" icon={<Plus size={18} />} onClick={() => nav(`/rides/new${to ? `?to=${to}` : ''}`)}>Post a ride</Button>
        </div>
      )}
    </div>
  );
}
