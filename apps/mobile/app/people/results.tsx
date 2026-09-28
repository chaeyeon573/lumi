import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Star, Bell, Pencil, Lock } from 'lucide-react-native';
import { t } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { emptySearch, searchPeople, searchLabel } from '@core/lib/people';
import { matchScore, shareableReasons } from '@core/lib/recommend';
import { isPlus } from '@core/lib/monetization';
import type { PeopleSearch } from '@core/types';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Button, BottomSheet, Field, Input, Toggle, C } from '@/ui';
import { PaywallSheet, type PaywallReason } from '@/components/PaywallSheet';
import { useSectionState } from '@/v2/useSectionState';
import { Section, SectionEmpty, SectionSkeleton } from '@/v2/SectionState';
import { PersonRow } from '@/v2/PersonRow';
import { Row } from '@/v2/Forms';

function parseCriteria(raw?: string | null): PeopleSearch {
  const base = emptySearch();
  if (!raw) return base;
  try { return { ...base, ...(JSON.parse(raw) as Partial<PeopleSearch>) }; } catch { return base; }
}
const criteriaParam = (c: PeopleSearch) => encodeURIComponent(JSON.stringify(c));

/** /people/results?c=<JSON>&saved=<id> (웹 PeopleResultsPage) — 조건에 맞는 사람 목록. ☆ 저장(Plus) · 저장한 검색이면 알림 토글 */
export default function PeopleResultsScreen() {
  const params = useLocalSearchParams<{ c?: string; saved?: string }>();
  const run = useAppStore((s) => s.run);
  const schools = useAppStore((s) => s.schools);
  const savedAll = useAppStore((s) => s.savedSearches);
  const v = useViewer();
  const me = v.me;
  const plus = isPlus(me);
  const saved = params.saved ? savedAll.find((s) => s.id === params.saved && s.userId === me.id) : undefined;
  const criteria = useMemo(() => (params.c ? parseCriteria(params.c) : saved ? saved.criteria : parseCriteria(null)), [params.c, saved]);
  const schoolName = (id: string) => schools.find((s) => s.id === id)?.name ?? id;
  const label = searchLabel(criteria, schoolName);
  const [paywall, setPaywall] = useState<PaywallReason | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [name, setName] = useState('');
  const [alert, setAlert] = useState(true);
  const [saving, setSaving] = useState(false);
  const sec = useSectionState(`results:${params.c ?? params.saved ?? ''}`);

  const results = useMemo(() => searchPeople(v.visibleUsers, me, criteria)
    .map((u) => { const m = matchScore(me, u, v.snap, v.canSeeField(u, 'timetable')); return { u, score: m.score, reasons: shareableReasons(m.reasons) }; })
    .sort((a, b) => b.score - a.score), [v, me, criteria]);

  const openSave = (withAlert: boolean) => {
    if (!plus) { setPaywall(withAlert ? 'alert' : 'save'); return; }
    setName(label); setAlert(withAlert); setSaveOpen(true);
  };
  const save = async () => {
    setSaving(true);
    try { await run(() => api.searches.save(me.id, name.trim() || label, criteria, alert), alert ? t('검색을 저장하고 새 사람 알림을 켰어요.') : t('검색을 저장했어요.')); setSaveOpen(false); }
    catch { /* toast */ } finally { setSaving(false); }
  };
  const edit = () => nav(`/people?tab=search&c=${criteriaParam(criteria)}`);

  return (
    <Screen title={t('검색 결과')} right={!saved ? (
      <Pressable onPress={() => openSave(false)} accessibilityLabel={t('검색 저장')} style={tw`h-10 px-2 flex-row items-center`}>
        {plus ? <Star size={16} color={C.primary} /> : <Lock size={14} color={C.primary} />}<Text style={tw`ml-1 text-[13px] font-bold text-primary`}>{t('검색 저장')}</Text>
      </Pressable>
    ) : undefined}>
      {saved ? (
        <View style={tw`mb-3 rounded-[24px] bg-primary-soft px-4 pt-3`}>
          <View style={tw`flex-row items-center`}><Star size={11} color={C.primary} fill={C.primary} /><Text style={tw`ml-1 text-[11px] font-bold text-ink-3`}>{t('저장한 검색')}</Text></View>
          <Text style={tw`text-[16px] font-bold text-primary mt-0.5`}>{saved.name}</Text>
          <Toggle label={t('새 사람 알림')} description={t('조건에 맞는 사람이 새로 들어오면 알려드려요')} checked={saved.alert} onChange={(on) => { run(() => api.searches.setAlert(saved.id, on), on ? t('새 사람 알림을 켰어요.') : t('새 사람 알림을 껐어요.')).catch(() => undefined); }} />
        </View>
      ) : null}
      <Pressable onPress={edit} style={tw`flex-row flex-wrap items-center`}>
        {label.split(' + ').map((x, i) => <View key={`${x}${i}`} style={tw`h-7 px-2.5 mr-1.5 mb-1.5 rounded-full bg-accent-soft justify-center`}><Text style={tw`text-[12px] font-bold text-primary`}>{x}</Text></View>)}
        <View style={tw`h-7 px-2 mb-1.5 flex-row items-center`}><Pencil size={11} color={C.ink3} /><Text style={tw`ml-1 text-[12px] font-semibold text-ink-3`}>{t('편집')}</Text></View>
      </Pressable>
      <Section loading={sec.loading} error={sec.error} onRetry={sec.retry} skeleton={<SectionSkeleton count={3} />}
        empty={results.length === 0 && (
          <SectionEmpty emoji="🔎" title={t('조건에 맞는 사람이 아직 없어요')} description={t('조건을 줄이거나 알림을 켜두세요. 새 사람이 들어오면 알려드려요.')}
            action={<View style={tw`flex-row`}><Button size="sm" variant="outline" onPress={edit}>{t('조건 줄이기')}</Button>{!saved ? <><View style={tw`w-2`} /><Button size="sm" icon={<Bell size={14} color={C.onPrimary} />} onPress={() => openSave(true)}>{t('알림 켜두기')}</Button></> : null}</View>} />
        )}>
        <Text style={tw`mt-1 mb-2 text-[15px] font-bold text-ink`}>{results.length}{t('명의 사람을 찾았어요')}</Text>
        {results.map((x) => <View key={x.u.id} style={tw`mb-2`}><PersonRow user={x.u} reasons={x.reasons} actions /></View>)}
      </Section>

      <BottomSheet open={saveOpen} onClose={() => setSaveOpen(false)} title={t('검색 저장')}>
        <Field label={t('이름')}><Input value={name} onChangeText={setName} placeholder={label} /></Field>
        <View style={tw`rounded-2xl bg-surface-2 px-4`}><Toggle label={t('새 사람 알림')} description={t('조건에 맞는 사람이 새로 들어오면 알려드려요')} checked={alert} onChange={setAlert} /></View>
        <Row style={tw`mt-4`}><Button full size="lg" loading={saving} onPress={save} icon={<Star size={16} color={C.onPrimary} />}>{t('저장')}</Button></Row>
      </BottomSheet>
      <PaywallSheet open={!!paywall} onClose={() => setPaywall(null)} reason={paywall ?? undefined} />
    </Screen>
  );
}
