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
import { lang } from '@core/i18n';
import {
  campusToday, fareText, matchRides, rideDestinations, rideEligibility, ridePickups, schoolOf, validateRideInput,
  CUSTOM, MATCH_WINDOW_MIN, MAX_NOTE, RIDE_KIND_EMOJI, RIDE_KIND_LABELS, SAFETY_NOTE, type RideInput, type RideKind,
} from '@core/lib/rides';

const L = (en: string, ko: string) => (lang === 'en' ? en : ko);
const KIND_HINT: Record<RideKind, string> = {
  driving: L('You have a car and seats to share', '차가 있고 자리를 나눌 수 있어요'),
  splitting: L('Share one Uber/Lyft and split the fare', 'Uber/Lyft 한 대를 같이 타고 요금을 나눠요'),
  looking: L('You need a ride — drivers and splitters can pick you up', '탈 차가 필요해요 — 운전자나 같이 탈 사람이 연락해요'),
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

  if (!eligible.ok) return <div className="min-h-full"><TopBar back title={L('Post a ride', '같이 타기 올리기')} /><EmptyState emoji="🎓" title={eligible.minor ? L('18 and older', '만 18세 이상') : L('Students only', '학생 전용')} description={eligible.reason} action={eligible.minor ? undefined : <Button onClick={() => nav('/settings')}>{L('Verify school email', '학교 이메일 인증')}</Button>} /></div>;

  const fullCount = form.kind === 'looking' ? form.seats + 1 : form.seats + 1;
  const submit = async () => {
    setTouched(true);
    if (problem) return;
    setBusy(true);
    try {
      const r = await run(() => api.rides.create(v.me.id, input), L('Ride posted — share the link so people can join.', '올렸어요 — 링크를 공유하면 사람들이 함께 탈 수 있어요.'));
      nav(`/rides/${r.ride.id}`, { replace: true });
    } catch { setBusy(false); }
  };

  return (
    <div className="min-h-full pb-28 bg-bg">
      <TopBar back title={L('Post a ride', '같이 타기 올리기')} />
      <div className="px-4 pt-2 space-y-5">
        <Field label={L('Ride type', '종류')}>
          <div className="grid gap-2">
            {(['driving', 'splitting', 'looking'] as RideKind[]).map((k) => (
              <button key={k} type="button" onClick={() => set({ kind: k, seats: Math.min(form.seats, k === 'looking' ? 4 : 5) })}
                className={cn('rounded-2xl border px-3.5 py-2.5 flex items-center gap-3 text-left press', form.kind === k ? 'border-primary bg-primary-soft' : 'border-line bg-surface')}>
                <span className="text-[22px]">{RIDE_KIND_EMOJI[k]}</span>
                <span className="flex-1"><span className="block text-[14px] font-bold text-ink">{RIDE_KIND_LABELS[k]}{k === 'driving' ? L(' (seats available)', ' (빈자리 있음)') : ''}</span><span className="block text-[12px] text-ink-3">{KIND_HINT[k]}</span></span>
              </button>
            ))}
          </div>
        </Field>

        <Field label={L('Pickup spot', '탑승 장소')} hint={L('Public spots only — never share a home address.', '공개된 장소만 — 집 주소는 절대 적지 마세요.')}>
          <div className="flex flex-wrap gap-2">{pickups.map((p) => <Chip key={p.key} active={form.from === p.key} onClick={() => set({ from: p.key })}>{p.label}</Chip>)}</div>
        </Field>

        <Field label={L('Going to', '목적지')}>
          <div className="flex flex-wrap gap-2">
            {dests.map((d) => <Chip key={d.key} active={form.to === d.key} onClick={() => set({ to: d.key })}>{d.emoji} {d.label}</Chip>)}
            <Chip active={form.to === CUSTOM} onClick={() => set({ to: CUSTOM })}>{L('Other…', '기타…')}</Chip>
          </div>
          {form.to === CUSTOM && <Input className="mt-2" placeholder={L('A place name, e.g. "Napa" or "Golden 1 Center"', '장소 이름, 예: "Napa", "Golden 1 Center"')} maxLength={60} value={form.toCustom} onChange={(e) => set({ toCustom: e.target.value })} />}
        </Field>

        <Field label={L('Date', '날짜')}><Input type="date" min={today} value={form.date} onChange={(e) => set({ date: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={L('Leave from', '출발 시간')}><Input type="time" value={form.start} onChange={(e) => set({ start: e.target.value, end: e.target.value > form.end ? e.target.value : form.end })} /></Field>
          <Field label={L('Until', '늦어도')}><Input type="time" value={form.end} onChange={(e) => set({ end: e.target.value })} /></Field>
        </div>

        <Field label={form.kind === 'driving' ? L('Seats for riders', '태울 수 있는 자리') : form.kind === 'splitting' ? L('People to split with (besides you)', '같이 나눌 사람 (나 빼고)') : L('People who need a ride', '타야 하는 사람 수')}>
          <div className="flex items-center gap-3">
            <button type="button" aria-label={L('Fewer', '줄이기')} onClick={() => set({ seats: Math.max(1, form.seats - 1) })} className="h-11 w-11 rounded-full bg-surface-2 grid place-items-center text-ink press"><Minus size={18} /></button>
            <span className="text-[22px] font-extrabold w-8 text-center text-ink">{form.seats}</span>
            <button type="button" aria-label={L('More', '늘리기')} onClick={() => set({ seats: Math.min(maxSeats, form.seats + 1) })} className="h-11 w-11 rounded-full bg-surface-2 grid place-items-center text-ink press"><Plus size={18} /></button>
          </div>
        </Field>

        <Field label={L('Estimated total (optional)', '예상 총액 (선택)')} hint={L('What the whole trip should cost — fare, gas or tolls. We never guess prices; leave blank to just split evenly.', '요금·기름값·통행료 등 전체 비용이에요. Lumi는 가격을 짐작하지 않아요 — 비워 두면 똑같이 나눠요.')}>
          <div className="flex items-center gap-2">
            <span className="text-[18px] font-bold text-ink-2">$</span>
            <Input inputMode="numeric" placeholder={L('e.g. 60', '예: 60')} value={estText} onChange={(e) => setEstText(e.target.value.replace(/[^\d.]/g, '').slice(0, 6))} />
          </div>
          <p className="mt-1.5 text-[13px] font-semibold text-primary">{input.estTotal ? fareText({ estTotal: input.estTotal, memberCount: 0 }, fullCount) + (fullCount > 2 ? L(' (if full)', ' (꽉 차면)') : '') : L('Split evenly', '똑같이 나눠요')}</p>
        </Field>

        <Field label={L('Note (optional)', '메모 (선택)')} hint={`${(form.note ?? '').length}/${MAX_NOTE} · ${L('flight time, luggage, music… Share numbers in the ride chat, not here.', '비행기 시간, 짐, 음악… 전화번호는 여기 말고 라이드 채팅에서.')}`}>
          <Textarea rows={2} maxLength={MAX_NOTE} placeholder={L('Flight at 1:30pm, one big suitcase', '오후 1:30 비행기, 큰 캐리어 하나')} value={form.note ?? ''} onChange={(e) => set({ note: e.target.value })} />
        </Field>

        {matches.length > 0 && (
          <section>
            <h2 className="text-[14px] font-bold text-ink mb-1">{L('Already going around then', '비슷한 시간에 가는 차')}</h2>
            <p className="text-[12px] text-ink-3 mb-2">{L(`${matches.length} ride${matches.length === 1 ? '' : 's'} to the same place within ${MATCH_WINDOW_MIN} min — join one instead?`, `같은 곳으로 ${MATCH_WINDOW_MIN}분 안에 출발하는 차가 ${matches.length}대 있어요 — 같이 탈래요?`)}</p>
            <div className="space-y-2">{matches.slice(0, 3).map((r) => <RideCard key={r.id} ride={r} />)}</div>
          </section>
        )}

        <p className="flex gap-2 text-[12px] text-ink-3 leading-snug"><ShieldCheck size={15} className="shrink-0 text-mint" />{SAFETY_NOTE}</p>
        {touched && problem && <p className="text-[13px] font-semibold text-danger flex gap-1.5"><MapPin size={15} className="shrink-0 mt-0.5" />{problem}</p>}
      </div>
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 safe-bottom z-20">
        <Button full size="lg" loading={busy} onClick={submit}>{L('Post ride', '올리기')}</Button>
      </div>
    </div>
  );
}
