import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Plus, X, EyeOff } from 'lucide-react';
import { t } from '@core/i18n';
import type { Trip } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { aroundCityOptions, weekRange } from '@core/lib/around';
import { localeContext } from '@core/lib/locale-context';
import { privacyOf } from '@core/lib/privacy';
import { todayISO } from '@core/lib/format';
import { BottomSheet, Button, Chip, Input } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';

/** "5/12–5/15" */
export const shortRange = (from: string, to: string) => {
  const f = (d: string) => { const [, m, day] = d.split('-'); return `${Number(m)}/${Number(day)}`; };
  return from === to ? f(from) : `${f(from)}–${f(to)}`;
};

/**
 * 내 방문 예정 — 도시와 날짜만. 정확한 장소·실시간 위치는 받지 않는다.
 * 목록을 편집한 뒤 [저장]으로 한 번에 setTrips.
 */
export function TripsSheet({ open, onClose, defaultCity }: { open: boolean; onClose: () => void; defaultCity?: string }) {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const cities = aroundCityOptions(v.me, localeContext().cities);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [city, setCity] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const hiddenTrips = !privacyOf(v.me).showTrips;

  useEffect(() => {
    if (!open) return;
    const [s, e] = weekRange('next');
    setTrips([...(v.me.trips ?? [])].sort((a, b) => a.from.localeCompare(b.from)));
    setCity(defaultCity ?? cities[0] ?? ''); setFrom(s); setTo(e); setErr('');
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = () => {
    if (!city.trim()) { setErr(t('도시를 골라주세요')); return; }
    if (!from || !to || from > to) { setErr(t('날짜를 확인해주세요')); return; }
    if (to < todayISO()) { setErr(t('이미 지난 날짜예요')); return; }
    setTrips((xs) => [...xs, { id: '', city: city.trim(), from, to }].sort((a, b) => a.from.localeCompare(b.from)));
    setErr('');
  };
  const remove = (i: number) => setTrips((xs) => xs.filter((_, j) => j !== i));
  const save = async () => {
    setBusy(true);
    try { await run(() => api.users.setTrips(v.me.id, trips), t('방문 예정을 저장했어요')); onClose(); }
    catch { /* toast by run */ } finally { setBusy(false); }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t('내 방문 예정')} tall>
      <div className="rounded-2xl bg-surface-2 px-3 py-2.5 flex items-start gap-2 text-[12px] text-ink-2">
        <Lock size={13} className="mt-0.5 shrink-0 text-primary" />{t('도시와 날짜만 보여요. 정확한 장소·실시간 위치는 공유되지 않아요')}
      </div>
      {hiddenTrips && (
        <button onClick={() => { onClose(); nav('/settings/privacy'); }} className="mt-2 w-full rounded-2xl border border-dashed border-line px-3 py-2.5 flex items-center gap-2 text-left text-[12px] text-ink-2 press">
          <EyeOff size={13} className="shrink-0" /><span className="flex-1">{t('방문 예정 공개가 꺼져 있어요 · 지금은 아무에게도 보이지 않아요')}</span><span className="font-semibold text-primary">{t('설정')}</span>
        </button>
      )}

      <div className="mt-4 text-[13px] font-semibold text-ink-2">{t('도시')}</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{cities.map((c) => <Chip key={c} size="sm" active={city === c} onClick={() => setCity(c)}>{c}</Chip>)}</div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <label className="block"><span className="text-[12px] text-ink-3">{t('시작')}</span><Input type="date" value={from} min={todayISO()} onChange={(e) => setFrom(e.target.value)} className="mt-1" /></label>
        <label className="block"><span className="text-[12px] text-ink-3">{t('끝')}</span><Input type="date" value={to} min={from || todayISO()} onChange={(e) => setTo(e.target.value)} className="mt-1" /></label>
      </div>
      {err && <p className="mt-1.5 text-[12px] text-danger" role="alert">{err}</p>}
      <Button size="sm" variant="secondary" className="mt-3" icon={<Plus size={14} />} onClick={add}>{t('추가')}</Button>

      <div className="mt-4 text-[13px] font-semibold text-ink-2">{t('예정된 방문')} {trips.length}</div>
      {trips.length === 0
        ? <p className="mt-1.5 text-[12px] text-ink-3">{t('아직 방문 예정이 없어요')}</p>
        : (
          <ul className="mt-1.5 space-y-1.5">
            {trips.map((tr, i) => (
              <li key={`${tr.id}-${i}`} className="h-11 rounded-full bg-surface-2 pl-4 pr-1.5 flex items-center gap-2">
                <span className="flex-1 min-w-0 truncate text-[13px]"><b className="text-primary">{tr.city}</b> · {shortRange(tr.from, tr.to)}</span>
                <button onClick={() => remove(i)} className="h-8 w-8 rounded-full grid place-items-center text-ink-3 hover:bg-white press" aria-label={t('삭제')}><X size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      <Button full size="lg" className="mt-5" loading={busy} onClick={save}>{t('저장')}</Button>
    </BottomSheet>
  );
}
