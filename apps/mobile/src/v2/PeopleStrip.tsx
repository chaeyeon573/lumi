import { Pressable, ScrollView, Text, View } from 'react-native';
import { lang } from '@core/i18n';
import type { RecommendedPerson } from '@core/lib/people';
import { personLine } from '@core/lib/network';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { Avatar } from '@/ui';
import { SchoolBadge } from './SchoolBadge';
import { ReasonChips } from './ReasonChips';

/** 사람 미니 카드 가로 스트립 (웹 HomePage PeopleStrip) — 사진 · 이름 · 학교 ✓ · 한 줄 · 이유 칩 2 */
export function PeopleStrip({ people }: { people: RecommendedPerson[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`-mx-4`} contentContainerStyle={tw`px-4`}>
      {people.map(({ user: u, reasons }) => (
        <Pressable key={u.id} onPress={() => nav(`/users/${u.id}`)} style={tw`w-[196px] mr-2.5 rounded-[24px] border border-line bg-white p-3.5`}>
          <View style={tw`flex-row items-center`}>
            <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={44} />
            <View style={tw`flex-1 min-w-0 ml-2.5`}>
              <Text numberOfLines={1} style={tw`text-[14px] font-bold text-ink`}>{u.nickname}</Text>
              <SchoolBadge user={u} withYear size="sm" />
            </View>
          </View>
          <Text numberOfLines={1} style={tw`mt-2 text-[12px] text-ink-2`}>{personLine(u, lang)}</Text>
          <View style={tw`mt-2`}><ReasonChips reasons={reasons} max={2} /></View>
        </Pressable>
      ))}
    </ScrollView>
  );
}
