import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Minus, Plus, ShieldCheck, MapPin } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Chip, Field, Input, Textarea, EmptyState } from '@/components/ui';
import { RideCard } from '@/components/rides/RideBits';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { cn } from '@core/lib/cn';
import {
  campusToday, fareText, matchRides, rideDestinations, rideEligibility, ridePickups, schoolOf, validateRideInput,
  CUSTOM, MATCH_WINDOW_MIN, MAX_NOTE, RIDE_KIND_EMOJI, RIDE_KIND_LABELS, SAFETY_NOTE, type RideInput, type RideKind,
} from '@core/lib/rides';

const KIND_HINT: Record<RideKind, string> = {
  driving: 'You have a car and seats to share',
  splitting: 'Share one Uber/Lyft and split the fare',
  looking: 'You need a ride — drivers and splitters can pick you up',
};

/** /rides/new — ?to=sfo&date=2026-11-25 prefill */
export function PostRidePage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const allRides = useAppStore((s) => s.rides);
  const relationships = useAppStore((s) => s.relationships);
  const school = schoolOf(v.me);
  const pickups = ridePickups(school);
  const dests = rideDestinations(school);
  const today = campusToday();
  const initialTo = params.get('to') ?? '';
  const [form, setForm] = useState<RideInput>({
    kind: 'splitting', from: '', to: dests.some((d) => d.key === initialTo) ? initialTo : dests.length ? '' : CUSTOM, toCustom: '',
    date: params.get('date') && params.get('date')! >= today ? params.get('date')! : today, start: '09:00', end: '10:00', seats: 3,
  });
  const [estText, setEstText] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<RideInput>) => setForm((f) => ({ ...f, ...p }));
  const eligible = rideEligibility(v.me);

  const input: RideInput = { ...form, estTotal: estText.trim() ? Number(estText.replace(/[$,\s]/g, '')) : undefined };
  const problem = validateRideInput(input, school, today);
  const maxSeats = form.kind === 'looking' ? 4 : 5;
  const draftReady = !!form.to && (form.to !== CUSTOM || (form.toCustom ?? '').trim().length >= 2) && !!form.date && !!form.start;
  const matches = useMemo(() => (draftReady ? matchRides({ rides: allRides, relationships }, { schoolId: school, to: form.to, toCustom: form.toCustom, date: form.date, start: form.start }, v.me.id, today) : []),
    [draftReady, allRides, relationships, school, form.to, form.toCustom, form.date, form.start, v.me.id, today]);

  if (!eligible.ok) return <div className="min-h-full"><TopBar back title="Post a ride" /><EmptyState emoji="🎓" title="Students only" description={eligible.reason} action={<Button onClick={() => nav('/settings')}>Verify school email</Button>} /></div>;

  const fullCount = form.kind === 'looking' ? form.seats + 1 : form.seats + 1;
  const submit = async () => {
    setTouched(true);
    if (problem) return;
    setBusy(true);
    try {
      const r = await run(() => api.rides.create(v.me.id, input), 'Ride posted — share the link so people can join.');
      nav(`/rides/${r.ride.id}`, { replace: true });
    } catch { setBusy(false); }
  };

  return (
    <div className="min-h-full pb-28 bg-bg">
      <TopBar back title="Post a ride" />
      <div className="px-4 pt-2 space-y-5">
        <Field label="Ride type">
          <div className="grid gap-2">
            {(['driving', 'splitting', 'looking'] as RideKind[]).map((k) => (
              <button key={k} type="button" onClick={() => set({ kind: k, seats: Math.min(form.seats, k === 'looking' ? 4 : 5) })}
                className={cn('rounded-2xl border px-3.5 py-2.5 flex items-center gap-3 text-left press', form.kind === k ? 'border-primary bg-primary-soft' : 'border-line bg-surface')}>
                <span className="text-[22px]">{RIDE_KIND_EMOJI[k]}</span>
                <span className="flex-1"><span className="block text-[14px] font-bold text-ink">{RIDE_KIND_LABELS[k]}{k === 'driving' ? ' (seats available)' : ''}</span><span className="block text-[12px] text-ink-3">{KIND_HINT[k]}</span></span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="Pickup spot" hint="Public spots only — never share a home address.">
          <div className="flex flex-wrap gap-2">{pickups.map((p) => <Chip key={p.key} active={form.from === p.key} onClick={() => set({ from: p.key })}>{p.label}</Chip>)}</div>
        </Field>

        <Field label="Going to">
          <div className="flex flex-wrap gap-2">
            {dests.map((d) => <Chip key={d.key} active={form.to === d.key} onClick={() => set({ to: d.key })}>{d.emoji} {d.label}</Chip>)}
            <Chip active={form.to === CUSTOM} onClick={() => set({ to: CUSTOM })}>Other…</Chip>
          </div>
          {form.to === CUSTOM && <Input className="mt-2" placeholder='A place name, e.g. "Napa" or "Golden 1 Center"' maxLength={60} value={form.toCustom} onChange={(e) => set({ toCustom: e.target.value })} />}
        </Field>

        <Field label="Date"><Input type="date" min={today} value={form.date} onChange={(e) => set({ date: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Leave from"><Input type="time" value={form.start} onChange={(e) => set({ start: e.target.value, end: e.target.value > form.end ? e.target.value : form.end })} /></Field>
          <Field label="Until"><Input type="time" value={form.end} onChange={(e) => set({ end: e.target.value })} /></Field>
        </div>

        <Field label={form.kind === 'driving' ? 'Seats for riders' : form.kind === 'splitting' ? 'People to split with' : 'People who need a ride'}>
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Fewer" onClick={() => set({ seats: Math.max(1, form.seats - 1) })} className="h-11 w-11 rounded-full bg-surface-2 grid place-items-center text-ink press"><Minus size={18} /></button>
            <span className="text-[22px] font-extrabold w-8 text-center text-ink">{form.seats}</span>
            <button type="button" aria-label="More" onClick={() => set({ seats: Math.min(maxSeats, form.seats + 1) })} className="h-11 w-11 rounded-full bg-surface-2 grid place-items-center text-ink press"><Plus size={18} /></button>
          </div>
        </Field>

        <Field label="Estimated total (optional)" hint="What the whole trip should cost — fare, gas or tolls. We never guess prices; leave blank to just split evenly.">
          <div className="flex items-center gap-2">
            <span className="text-[18px] font-bold text-ink-2">$</span>
            <Input inputMode="numeric" placeholder="e.g. 60" value={estText} onChange={(e) => setEstText(e.target.value.replace(/[^\d.]/g, '').slice(0, 6))} />
          </div>
          <p className="mt-1.5 text-[13px] font-semibold text-primary">{input.estTotal ? fareText({ estTotal: input.estTotal, memberCount: 0 }, fullCount) + (fullCount > 2 ? ` (if full)` : '') : 'Split evenly'}</p>
        </Field>

        <Field label="Note (optional)" hint={`${(form.note ?? '').length}/${MAX_NOTE} · flight time, luggage, music… Share numbers in the ride chat, not here.`}>
          <Textarea rows={2} maxLength={MAX_NOTE} placeholder="Flight at 1:30pm, one big suitcase" value={form.note ?? ''} onChange={(e) => set({ note: e.target.value })} />
        </Field>

        {matches.length > 0 && (
          <section>
            <h2 className="text-[14px] font-bold text-ink mb-1">Already going around then</h2>
            <p className="text-[12px] text-ink-3 mb-2">{matches.length} ride{matches.length === 1 ? '' : 's'} to the same place within {MATCH_WINDOW_MIN} min — join one instead?</p>
            <div className="space-y-2">{matches.slice(0, 3).map((r) => <RideCard key={r.id} ride={r} />)}</div>
          </section>
        )}

        <p className="flex gap-2 text-[12px] text-ink-3 leading-snug"><ShieldCheck size={15} className="shrink-0 text-mint" />{SAFETY_NOTE}</p>
        {touched && problem && <p className="text-[13px] font-semibold text-danger flex gap-1.5"><MapPin size={15} className="shrink-0 mt-0.5" />{problem}</p>}
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 safe-bottom z-20">
        <Button full size="lg" loading={busy} onClick={submit}>Post ride</Button>
      </div>
    </div>
  );
}
