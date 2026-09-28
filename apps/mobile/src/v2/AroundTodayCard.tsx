import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronRight, Link2, MapPin, Coffee } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import type { User } from '@core/types';
import type { Snapshot } from '@core/api/types';
import { aroundToday } from '@core/lib/around';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { Avatar, C } from '@/ui';
import { useSectionState } from './useSectionState';
import { SectionSkeleton, SectionError } from './SectionState';

/**
 * 오늘 주변에서 (웹 home_AroundToday) — 목표·숙제 없이 사실만 조용히.
 * "아는 사람을 통해 이어진 사람 3명 · 이번 주 서울에 있는 사람 2명 · 지금 무언가에 열려 있는 사람 1명"
 */
export function AroundTodayCard({ me, snap }: { me: User; snap: Snapshot }) {
  const st = useSectionState('home-around');
  const d = useMemo(() => aroundToday(snap, me), [snap, me]);
  const rows = [
    { key: 'via', Icon: Link2, n: d.viaFriends.length, label: t('아는 사람을 통해 이어진 사람'), people: d.viaFriends.map((x) => x.user), to: '/people/second' },
    { key: 'city', Icon: MapPin, n: d.inCity.length, label: lang === 'en' ? `People in ${d.city} this week` : `이번 주 ${d.city}에 있는 사람`, people: d.inCity, to: `/people/around?city=${encodeURIComponent(d.city)}` },
    { key: 'open', Icon: Coffee, n: d.openNow.length, label: t('지금 무언가에 열려 있는 사람'), people: d.openNow, to: '/people/around?open=1' },
  ].filter((r) => r.n > 0);
  if (st.loading) return <View style={tw`mt-3`}><SectionSkeleton count={1} /></View>;
  if (st.error) return <View style={tw`mt-3`}><SectionError onRetry={st.retry} /></View>;
  if (!rows.length) return null; // 아무것도 없으면 조용히 비워둔다
  return (
    <View accessibilityLabel={t('오늘 주변에서')} style={tw`mt-3 card p-3.5`}>
      <Text style={tw`px-0.5 text-[12px] font-bold text-ink-3`}>{t('오늘 주변에서')}</Text>
      <View style={tw`mt-1`}>
        {rows.map((r, i) => (
          <Pressable key={r.key} onPress={() => nav(r.to)} style={tw`flex-row items-center py-2.5 ${i ? 'border-t border-line' : ''}`}>
            <View style={tw`h-8 w-8 rounded-full bg-accent-soft items-center justify-center`}><r.Icon size={15} color={C.primary} /></View>
            <Text numberOfLines={1} style={tw`flex-1 ml-3 text-[14px] text-ink`}>{r.label} <Text style={tw`font-bold text-ink`}>{r.n}{t('명')}</Text></Text>
            <View style={tw`flex-row mx-1`}>{r.people.slice(0, 3).map((p, j) => <Avatar key={p.id} emoji={p.avatar.emoji} hue={p.avatar.hue} url={p.avatar.url} size={24} style={[{ borderWidth: 2, borderColor: C.onPrimary }, j ? { marginLeft: -8 } : null]} />)}</View>
            <ChevronRight size={15} color={C.ink3} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
