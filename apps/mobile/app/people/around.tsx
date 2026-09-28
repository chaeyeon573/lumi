import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarDays, MapPinOff, Pencil, Plane, ChevronRight } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import type { User } from '@core/types';
import { whoIsAround, weekRange, aroundCityOptions, type AroundPerson, type AroundWindow } from '@core/lib/around';
import { localeContext } from '@core/lib/locale-context';
import { profileView, privacyOf } from '@core/lib/privacy';
import { activeStatuses } from '@core/lib/status';
import { todayISO } from '@core/lib/format';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Button, Chip, Segmented, C } from '@/ui';
import { useSnapshot } from '@/v2/useSnapshot';
import { useSectionState } from '@/v2/useSectionState';
import { Section, SectionEmpty, SectionSkeleton, PrivacyNote } from '@/v2/SectionState';
import { StatusPill } from '@/v2/StatusPill';
import { MaskedPersonCard, DegreePill, degreeLine, SubTitle } from '@/v2/Network';
import { TripsSheet, shortRange } from '@/v2/TripsSheet';

/**
 * Who's Around This Week (웹 AroundPage) — 도시(권역) 단위로 이번 주/다음 주에 여기 있는 사람 · 방문 예정인 사람.
 * 지도·핀·정확한 위치·실시간 위치는 쓰지 않는다. 사람은 거리(촌수) 순. ?city=&week=this|next&open=1
 */
export default function AroundScreen() {
  const v = useViewer();
  const snap = useSnapshot();
  const me = v.me;
  const params = useLocalSearchParams<{ city?: string; week?: string; open?: string }>();
  const cities = useMemo(() => aroundCityOptions(me, localeContext().cities), [me]);
  const city = params.city || cities[0] || '';
  const win: AroundWindow = params.week === 'next' ? 'next' : 'this';
  const openOnly = params.open === '1';
  const [tripsOpen, setTripsOpen] = useState(false);
  const set = (patch: Record<string, string | null>) => router.setParams(Object.fromEntries(Object.entries(patch).map(([k, val]) => [k, val ?? ''])) as never);
  const s = useSectionState(`around:${city}:${win}`);

  const all = useMemo(() => {
    const hidden = new Set(me.hiddenPeople ?? []);
    return whoIsAround(snap, me, city, win, (u: User) => profileView(snap, me, u).trips).filter((p) => !hidden.has(p.user.id));
  }, [snap, me, city, win]);
  const list = openOnly ? all.filter((p) => activeStatuses(p.user).length > 0) : all;
  const here = list.filter((p) => p.kind === 'here');
  const visiting = list.filter((p) => p.kind === 'visiting');
  const [from, to] = weekRange(win);
  const neighbor = cities.find((c) => c !== city);
  const myTrips = [...(me.trips ?? [])].filter((tr) => tr.to >= todayISO()).sort((a, b) => a.from.localeCompare(b.from));
  const denied = me.settings.locationPermission === 'denied';

  const emptyTitle = lang === 'en' ? `No one in ${city} for these dates yet` : `이 기간에 ${city}에는 아직 없어요`;
  const empty = list.length === 0 && (
    openOnly && all.length > 0
      ? <SectionEmpty emoji="☕" title={t('지금 시간 되는 사람이 없어요')} description={t('상태를 켠 사람만 보고 있어요')} action={<Button size="sm" variant="outline" onPress={() => set({ open: null })}>{t('필터 끄기')}</Button>} />
      : <SectionEmpty emoji="🌙" title={emptyTitle} description={t('방문 예정은 공개한 사람만 보여요')} action={
        <View style={tw`flex-row flex-wrap justify-center`}>
          {win === 'this' ? <View style={tw`m-1`}><Button size="sm" variant="outline" onPress={() => set({ week: 'next' })}>{t('다음 주 보기')}</Button></View> : null}
          {neighbor ? <View style={tw`m-1`}><Button size="sm" variant="outline" onPress={() => set({ city: neighbor })}>{`${t('인접 도시')} · ${neighbor}`}</Button></View> : null}
        </View>
      } />
  );

  return (
    <Screen title={t('이번 주 주변')}>
      <View style={tw`pt-2`}>
        {denied ? <View style={tw`mb-3 rounded-2xl bg-surface-2 px-3.5 py-2.5 flex-row items-center`}><MapPinOff size={14} color={C.primary} /><Text style={tw`ml-2 flex-1 text-[12px] text-ink-2`}>{t('위치 권한 없이도 도시로 찾을 수 있어요')}</Text></View> : null}

        {/* 1. 내 방문 예정 */}
        <View style={tw`rounded-[20px] bg-primary-soft p-4`}>
          <View style={tw`flex-row items-center`}>
            <Plane size={16} color={C.primary} />
            <Text style={tw`ml-2 flex-1 text-[14px] font-bold text-ink`}>{t('내 방문 예정')}</Text>
            <Pressable onPress={() => setTripsOpen(true)} style={tw`h-8 px-3 rounded-full bg-white flex-row items-center`}><Pencil size={12} color={C.primary} /><Text style={tw`ml-1 text-[12px] font-semibold text-primary`}>{t('추가·수정')}</Text></Pressable>
          </View>
          {myTrips.length === 0
            ? <Text style={tw`mt-1.5 text-[12px] text-ink-2`}>{t('다른 도시에 갈 일이 있으면 도시와 날짜만 남겨 두세요')}</Text>
            : <View style={tw`mt-2 flex-row flex-wrap`}>{myTrips.map((tr) => (
              <Pressable key={tr.id} onPress={() => set({ city: tr.city })} style={[tw`h-7 px-3 mr-1.5 mb-1.5 rounded-full justify-center`, { backgroundColor: C.glass }]}><Text style={tw`text-[12px] font-semibold text-primary`}>{tr.city} · {shortRange(tr.from, tr.to)}</Text></Pressable>
            ))}</View>}
          <PrivacyNote text={privacyOf(me).showTrips ? t('도시와 날짜만 보여요') : t('방문 예정 공개가 꺼져 있어요')} />
        </View>

        {/* 2. 도시 · 기간 · 필터 */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`-mx-4 mt-4`} contentContainerStyle={tw`px-4 py-1`}>
          {cities.map((c) => <Chip key={c} active={c === city} onPress={() => set({ city: c })}>{c}</Chip>)}
        </ScrollView>
        <View style={tw`mt-2`}><Segmented<AroundWindow> value={win} onChange={(w) => set({ week: w === 'this' ? null : w })} options={[['this', t('이번 주')], ['next', t('다음 주')]]} /></View>
        <View style={tw`mt-2 flex-row items-center`}>
          <Chip size="sm" active={openOnly} onPress={() => set({ open: openOnly ? null : '1' })}>☕ {t('지금 시간 되는 사람만')}</Chip>
          <View style={tw`flex-1`} />
          <CalendarDays size={11} color={C.ink3} /><Text style={tw`ml-1 text-[11px] text-ink-3`}>{shortRange(from, to)}</Text>
        </View>

        {/* 3. 사람 */}
        <View style={tw`mt-4`}>
          <Section loading={s.loading} error={s.error} onRetry={s.retry} skeleton={<SectionSkeleton count={3} />} empty={empty}>
            {here.length > 0 ? <View><SubTitle>{`${t('여기 있는 사람')} ${here.length}`}</SubTitle>{here.map((p) => <AroundCard key={p.user.id} p={p} city={city} />)}</View> : null}
            {visiting.length > 0 ? <View style={tw`mt-3`}><SubTitle>{`${t('방문 예정')} ${visiting.length}`}</SubTitle>{visiting.map((p) => <AroundCard key={p.user.id} p={p} city={city} />)}</View> : null}
            <View style={tw`items-center`}><PrivacyNote text={t('도시 단위로만 보여요 · 정확한 위치·실시간 위치는 쓰지 않아요')} /></View>
          </Section>
        </View>

        {/* 더 보기 — 작은 모임 */}
        <Pressable onPress={() => nav('/meet/tables')} style={tw`mt-4 rounded-[20px] border border-line bg-white px-4 py-3 flex-row items-center`}>
          <View style={tw`flex-1`}>
            <Text style={tw`text-[14px] font-bold text-ink`}>{t('작은 모임 · 4~6명')}</Text>
            <Text style={tw`text-[12px] text-ink-3 mt-0.5`}>{t('4~6명이 모이는 작은 모임이 1:1보다 편해요')}</Text>
          </View>
          <ChevronRight size={16} color={C.ink3} />
        </Pressable>
      </View>
      <TripsSheet open={tripsOpen} onClose={() => setTripsOpen(false)} defaultCity={city} />
    </Screen>
  );
}

function AroundCard({ p, city }: { p: AroundPerson; city: string }) {
  const snap = useSnapshot();
  const v = useViewer();
  const visitLine = p.kind === 'visiting' && p.tripFrom && p.tripTo
    ? (lang === 'en' ? `Visiting ${city} ${shortRange(p.tripFrom, p.tripTo)}` : `${shortRange(p.tripFrom, p.tripTo)} ${city} 방문 예정`)
    : null;
  return (
    <MaskedPersonCard
      user={p.user}
      top={<><DegreePill text={degreeLine(snap, v.me, p.user, p.degree)} /><StatusPill user={p.user} size="sm" /></>}
      sub={visitLine ? <View style={tw`mt-0.5 flex-row items-center`}><Plane size={11} color={C.verify} /><Text style={tw`ml-1 text-[12px] font-semibold text-verify`}>{visitLine}</Text></View> : undefined}
    />
  );
}
