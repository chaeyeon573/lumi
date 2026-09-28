import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Lock, Plus, X, EyeOff } from 'lucide-react-native';
import { t } from '@core/i18n';
import type { Trip } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { aroundCityOptions, weekRange } from '@core/lib/around';
import { localeContext } from '@core/lib/locale-context';
import { privacyOf } from '@core/lib/privacy';
import { todayISO } from '@core/lib/format';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { BottomSheet, Button, Input, C } from '@/ui';
import { Row, Wrap, WChip } from './Forms';

/** "5/12–5/15" */
export const shortRange = (from: string, to: string) => {
  const f = (d: string) => { const [, m, day] = d.split('-'); return `${Number(m)}/${Number(day)}`; };
  return from === to ? f(from) : `${f(from)}–${f(to)}`;
};
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 내 방문 예정 (웹 around_TripsSheet) — 도시와 날짜만. 정확한 장소·실시간 위치는 받지 않는다.
 * 목록을 편집한 뒤 [저장]으로 한 번에 setTrips.
 */
export function TripsSheet({ open, onClose, defaultCity }: { open: boolean; onClose: () => void; defaultCity?: string }) {
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
    if (!ISO.test(from) || !ISO.test(to) || from > to) { setErr(t('날짜를 확인해주세요')); return; }
    if (to < todayISO()) { setErr(t('이미 지난 날짜예요')); return; }
    setTrips((xs) => [...xs, { id: '', city: city.trim(), from, to }].sort((a, b) => a.from.localeCompare(b.from)));
    setErr('');
  };
  const save = async () => {
    setBusy(true);
    try { await run(() => api.users.setTrips(v.me.id, trips), t('방문 예정을 저장했어요')); onClose(); }
    catch { /* toast by run */ } finally { setBusy(false); }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t('내 방문 예정')} tall>
      <View style={tw`rounded-2xl bg-surface-2 px-3 py-2.5 flex-row items-start`}>
        <Lock size={13} color={C.primary} style={tw`mt-0.5`} /><Text style={tw`ml-2 flex-1 text-[12px] text-ink-2`}>{t('도시와 날짜만 보여요. 정확한 장소·실시간 위치는 공유되지 않아요')}</Text>
      </View>
      {hiddenTrips ? (
        <Pressable onPress={() => { onClose(); nav('/settings/privacy'); }} style={[tw`mt-2 rounded-2xl border border-line px-3 py-2.5 flex-row items-center`, { borderStyle: 'dashed' }]}>
          <EyeOff size={13} color={C.ink2} /><Text style={tw`ml-2 flex-1 text-[12px] text-ink-2`}>{t('방문 예정 공개가 꺼져 있어요 · 지금은 아무에게도 보이지 않아요')}</Text><Text style={tw`text-[12px] font-semibold text-primary`}>{t('설정')}</Text>
        </Pressable>
      ) : null}

      <Text style={tw`mt-4 mb-1.5 text-[13px] font-semibold text-ink-2`}>{t('도시')}</Text>
      <Wrap>{cities.map((c) => <WChip key={c} active={city === c} onPress={() => setCity(c)}>{c}</WChip>)}</Wrap>
      <Row style={tw`mt-2`}>
        <View style={tw`flex-1 mr-1`}><Text style={tw`text-[12px] text-ink-3 mb-1`}>{t('시작')}</Text><Input placeholder="YYYY-MM-DD" value={from} onChangeText={setFrom} /></View>
        <View style={tw`flex-1 ml-1`}><Text style={tw`text-[12px] text-ink-3 mb-1`}>{t('끝')}</Text><Input placeholder="YYYY-MM-DD" value={to} onChangeText={setTo} /></View>
      </Row>
      {err ? <Text accessibilityRole="alert" style={tw`mt-1.5 text-[12px] text-danger`}>{err}</Text> : null}
      <Row style={tw`mt-3`}><Button size="sm" variant="secondary" icon={<Plus size={14} color={C.primary} />} onPress={add}>{t('추가')}</Button></Row>

      <Text style={tw`mt-4 text-[13px] font-semibold text-ink-2`}>{t('예정된 방문')} {trips.length}</Text>
      {trips.length === 0
        ? <Text style={tw`mt-1.5 text-[12px] text-ink-3`}>{t('아직 방문 예정이 없어요')}</Text>
        : trips.map((tr, i) => (
          <View key={`${tr.id}-${i}`} style={tw`mt-1.5 h-11 rounded-full bg-surface-2 pl-4 pr-1.5 flex-row items-center`}>
            <Text numberOfLines={1} style={tw`flex-1 text-[13px] text-ink`}><Text style={tw`font-bold text-primary`}>{tr.city}</Text> · {shortRange(tr.from, tr.to)}</Text>
            <Pressable onPress={() => setTrips((xs) => xs.filter((_, j) => j !== i))} accessibilityLabel={t('삭제')} style={tw`h-8 w-8 rounded-full items-center justify-center`}><X size={15} color={C.ink3} /></Pressable>
          </View>
        ))}
      <Row style={tw`mt-5`}><Button full size="lg" loading={busy} onPress={save}>{t('저장')}</Button></Row>
    </BottomSheet>
  );
}
