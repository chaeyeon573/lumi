import { Pressable, Text, View } from 'react-native';
import { Users } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import type { RecommendedMeet } from '@core/lib/meet';
import { CATEGORY_EMOJI, CATEGORY_COLORS } from '@core/lib/labels';
import { formatTime, formatDate } from '@core/lib/format';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { C } from '@/ui';
import { JoinButton } from '@/components/JoinButton';

/** 추천 모임 행 (웹 HomePage MeetRow) — 제목 · 언제·어디 · 이유 · [참여] */
export function MeetRow({ m, last }: { m: RecommendedMeet; last?: boolean }) {
  const v = useViewer();
  const a = m.a;
  const open = () => nav(`/activities/${a.id}`);
  return (
    <View style={tw`flex-row items-center px-3.5 py-3 ${last ? '' : 'border-b border-line'}`}>
      <Pressable onPress={open} style={[tw`h-10 w-10 rounded-xl items-center justify-center`, { backgroundColor: `${CATEGORY_COLORS[a.category]}1A` }]}><Text style={tw`text-[18px]`}>{CATEGORY_EMOJI[a.category]}</Text></Pressable>
      <Pressable onPress={open} style={tw`flex-1 min-w-0 mx-3`}>
        <Text numberOfLines={1} style={tw`text-[14px] font-bold text-ink`}>{a.title}</Text>
        <Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{formatDate(a.date)} {formatTime(a.startTime)} · {a.place.name}</Text>
        <View style={tw`flex-row items-center mt-0.5`}>
          <Text numberOfLines={1} style={tw`text-[11px] font-semibold text-primary shrink`}>{m.reason} · </Text>
          <Users size={10} color={C.primary} />
          <Text style={tw`ml-0.5 text-[11px] font-semibold text-primary`}>{v.approvedCount(a.id)}/{a.capacity >= 999 ? '∞' : a.capacity}</Text>
        </View>
      </Pressable>
      <JoinButton activity={a} size="sm" label={lang === 'en' ? 'Join' : t('참여')} />
    </View>
  );
}
