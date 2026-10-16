import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, ChevronRight, Car } from 'lucide-react';
import { Avatar } from '@/components/ui';
import { SampleTag } from '@/components/ui/SampleTag';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { useAcademicDates } from '@/hooks/useCampusData';
import { cn } from '@core/lib/cn';
import type { User } from '@core/types';
import {
  bannerSeason, campusToday, clock, dayLabel, destLabel, fareText, isInRide, isVerifiedStudent, pickupLabel, schoolOf, seatsText, isFull,
  RIDE_KIND_EMOJI, RIDE_KIND_SHORT, type Ride, type RideSeason,
} from '@core/lib/rides';

/** The school's academic calendar (registrar) for the break banner — undefined while loading or when the school has none */
export function useRideCalendar(schoolId: string) {
  const d = useAcademicDates(schoolId);
  return Array.isArray(d) && d.length ? d : undefined;
}

export const firstName = (u?: Pick<User, 'nickname'>) => (u?.nickname ?? 'Someone').trim().split(/\s+/)[0];

/**
 * Rides this viewer may see. The server already filters (school, blocks, riders) — this repeats the block and
 * school check so a block takes effect on screen before the next patch arrives.
 */
export function useRides(): Ride[] {
  const rides = useAppStore((s) => s.rides);
  const v = useViewer();
  return useMemo(() => {
    const school = schoolOf(v.me);
    return (rides ?? []).filter((r) => isInRide(r, v.me.id) || (r.schoolId === school && r.status !== 'cancelled' && !v.isBlocked(r.hostId) && !r.memberIds.some((id) => v.isBlocked(id))));
  }, [rides, v]);
}

/** Verified-student check or Sample label next to a name */
export function StudentMark({ user, className }: { user?: User; className?: string }) {
  if (!user) return null;
  if (user.sample) return <SampleTag className={cn('ml-1 mr-0', className)} />;
  if (isVerifiedStudent(user)) return <BadgeCheck size={14} strokeWidth={2.4} className={cn('inline text-verify shrink-0', className)} aria-label="Verified student" />;
  return null;
}

/** One ride in a list — "Lily → SFO", when · from, the split, seats left */
export function RideCard({ ride, className }: { ride: Ride; className?: string }) {
  const nav = useNavigate();
  const v = useViewer();
  const host = v.userById(ride.hostId);
  const mine = ride.hostId === v.me.id;
  const joined = ride.memberIds.includes(v.me.id);
  const full = isFull(ride);
  const status = ride.status === 'cancelled' ? 'Cancelled' : ride.status === 'closed' ? 'Closed' : full ? 'Full' : seatsText(ride);
  return (
    <button onClick={() => nav(`/rides/${ride.id}`)} className={cn('card w-full rounded-[22px] p-3 flex items-center gap-3 text-left press', ride.status === 'cancelled' && 'opacity-60', className)}>
      <span className="relative shrink-0">
        <Avatar emoji={host?.avatar.emoji ?? '🙂'} hue={host?.avatar.hue ?? 210} url={host?.avatar.url} size={48} />
        <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-surface border border-line grid place-items-center text-[13px]">{RIDE_KIND_EMOJI[ride.kind]}</span>
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1 text-[15px] font-bold text-ink truncate">
          <span className="truncate">{mine ? 'You' : firstName(host)} → {destLabel(ride)}</span>
          {!host?.sample && <StudentMark user={host} />}
        </span>
        <span className="block text-[13px] text-ink-2 truncate">{(ride.sample || host?.sample) && <SampleTag className="h-[18px]" />}{dayLabel(ride.date).split(' ')[0]} {clock(ride.start)} · from {pickupLabel(ride)}</span>
        <span className="block text-[12.5px] font-semibold text-primary truncate">{ride.kind === 'looking' ? `${RIDE_KIND_SHORT.looking} · ${fareText(ride)}` : `${fareText(ride)}`}</span>
      </span>
      <span className="flex flex-col items-end gap-1 shrink-0">
        <span className={cn('h-9 px-4 rounded-full grid place-items-center text-[13px] font-bold', mine || joined ? 'bg-primary-soft text-primary' : full || ride.status !== 'open' ? 'bg-surface-2 text-ink-3' : 'bg-primary text-on-primary')}>
          {mine ? 'Yours' : joined ? 'Joined' : ride.kind === 'looking' ? 'Help' : full || ride.status !== 'open' ? 'View' : 'Join'}
        </span>
        <span className="text-[11.5px] text-ink-3 font-medium">{status}</span>
      </span>
    </button>
  );
}

/** Upcoming break shortcut on the Rides screen: "Thanksgiving break · Wed Nov 25" + airport chips */
export function SeasonCard({ season, onPick, className }: { season: RideSeason; onPick: (to: string) => void; className?: string }) {
  const nav = useNavigate();
  const postDay = season.breakStart > campusToday() ? season.breakStart : campusToday();
  return (
    <div className={cn('rounded-[26px] p-4 bg-primary-soft v2:bg-[linear-gradient(160deg,#4a1238_0%,#1F1B2B_70%)] v2:border v2:border-line', className)}>
      <div className="text-[11px] font-extrabold tracking-[0.12em] uppercase text-primary v2:text-pink-300">{season.title.replace(/ rides$/, '')} · no classes from {dayLabel(season.breakStart)}</div>
      <div className="font-display text-[24px] leading-[1.1] font-extrabold text-primary v2:text-ink mt-1.5">Split a ride to the airport ✈️</div>
      <p className="text-[13px] text-ink-2 mt-1">Post your ride once — we match you with students leaving ±90 min.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {['sfo', 'oak', 'sjc'].map((k) => <button key={k} onClick={() => onPick(k)} className="h-9 px-4 rounded-full bg-surface text-ink text-[13px] font-bold border border-line press">{k.toUpperCase()}</button>)}
        <button onClick={() => nav(`/rides/new?to=sfo&date=${postDay}`)} className="h-9 px-4 rounded-full bg-primary text-on-primary text-[13px] font-bold press">Post my ride</button>
      </div>
    </div>
  );
}

/** Browse: only the seasonal banner (Nov 10–25), nothing the rest of the year — the Rides chip covers that */
export function RideSeasonBanner({ className }: { className?: string }) {
  const v = useViewer();
  const calendar = useRideCalendar(schoolOf(v.me));
  return bannerSeason(schoolOf(v.me), campusToday(), calendar) ? <RidesEntry className={className} /> : null;
}

/**
 * Discover / Browse entry. Nov 10–25 it turns into the "Thanksgiving break rides" banner (academic calendar),
 * otherwise a one-line Rides row with how many rides are open.
 */
export function RidesEntry({ className, compact }: { className?: string; compact?: boolean }) {
  const nav = useNavigate();
  const v = useViewer();
  const rides = useRides();
  const today = campusToday();
  const school = schoolOf(v.me);
  const openRides = rides.filter((r) => r.status === 'open' && r.date >= today && !isFull(r));
  const open = openRides.length;
  // 열린 차가 가는 곳을 그대로 — 예전엔 'airports, Trader Joe's, Costco, SF, Tahoe' 고정 문구라 없는 행선지(SF·Tahoe)도 있어 보였다
  const dests = [...new Set(openRides.sort((a, b) => a.date.localeCompare(b.date)).map(destLabel))];
  const season = bannerSeason(school, today, useRideCalendar(school));
  if (season) {
    const airport = rides.filter((r) => r.status === 'open' && ['sfo', 'oak', 'sjc'].includes(r.to) && r.date >= season.showFrom && r.date <= season.breakEnd).length;
    return (
      <button onClick={() => nav('/rides?filter=airports')} className={cn('w-full rounded-[22px] p-3.5 flex items-center gap-3 text-left press bg-primary-soft v2:bg-[linear-gradient(120deg,#4a1238,#1F1B2B)] v2:border v2:border-line', className)}>
        <span className="h-11 w-11 rounded-full bg-surface grid place-items-center text-[22px] shrink-0">✈️</span>
        <span className="flex-1 min-w-0">
          <span className="block text-[11px] font-extrabold tracking-[0.1em] uppercase text-primary v2:text-pink-300">No classes from {dayLabel(season.breakStart)}</span>
          <span className="block text-[15px] font-bold text-ink truncate">{season.title}</span>
          <span className="block text-[12.5px] text-ink-2 truncate">{airport ? `${airport} airport ride${airport === 1 ? '' : 's'} posted · split SFO / OAK / SJC` : 'Split SFO / OAK / SJC with classmates'}</span>
        </span>
        <ChevronRight size={18} className="text-ink-3 shrink-0" />
      </button>
    );
  }
  return (
    <button onClick={() => nav('/rides')} className={cn('w-full card rounded-full flex items-center gap-3 text-left press', compact ? 'p-1.5 pr-3' : 'p-2 pr-3.5', className)}>
      <span className="h-10 w-10 rounded-full bg-primary-soft text-primary grid place-items-center shrink-0"><Car size={19} /></span>
      <span className="flex-1 min-w-0">
        <span className="block text-[14px] font-bold text-ink">Rides</span>
        <span className="block text-[12.5px] text-ink-2 truncate">{open ? `${open} open · ${dests.slice(0, 3).join(', ')}${dests.length > 3 ? '…' : ''}` : "Airports, Trader Joe's, Costco, SF, Tahoe"}</span>
      </span>
      <ChevronRight size={18} className="text-ink-3 shrink-0" />
    </button>
  );
}

