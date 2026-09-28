import { Pressable, Text, View } from 'react-native';
import { MapPin, Users, Lock } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import type { Activity } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { CATEGORY_COLORS, CATEGORY_EMOJI } from '@core/lib/labels';
import { placeLabel } from '@core/lib/relations';
import { formatTime } from '@core/lib/format';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { Avatar, Tag, C } from '@/ui';
import { JoinButton } from '@/components/JoinButton';

/** 지금 열린 만남 한 줄 카드 (웹 cards/NowActivityRow) — 사람 사진은 작게, 무엇·언제·어디가 먼저 */
export function NowActivityRow({ activity: a, inMin }: { activity: Activity; inMin: number }) {
  const v = useViewer();
  const participations = useAppStore((s) => s.participations);
  const host = v.userById(a.hostId);
  const approved = participations.filter((p) => p.activityId === a.id && p.status === 'approved');
  const mine = v.myParticipation(a.id);
  const place = placeLabel(a, v.me, mine?.status === 'approved');
  const when = inMin <= 0 ? t('진행 중') : inMin < 60 ? (lang === 'en' ? `in ${inMin} min` : `${inMin}분 후`) : formatTime(a.startTime);
  const faces = [a.hostId, ...approved.map((p) => p.userId)].slice(0, 4).map((id) => v.userById(id)).filter((u): u is NonNullable<typeof u> => !!u);
  const open = () => nav(`/activities/${a.id}`);
  return (
    <View style={tw`rounded-[24px] border border-line bg-white p-3 flex-row items-center mb-2`}>
      <Pressable onPress={open}>
        <Avatar emoji={host?.avatar.emoji ?? '👤'} hue={host?.avatar.hue ?? 200} url={host?.avatar.url} size={40} />
        <View style={[tw`absolute -bottom-1 -right-1 h-5 w-5 rounded-full items-center justify-center border-2 border-white`, { backgroundColor: CATEGORY_COLORS[a.category] }]}><Text style={tw`text-[10px]`}>{CATEGORY_EMOJI[a.category]}</Text></View>
      </Pressable>
      <Pressable onPress={open} style={tw`flex-1 min-w-0 mx-3`}>
        <Text numberOfLines={1} style={tw`text-[14px] font-bold text-ink`}>{a.title}</Text>
        <View style={tw`flex-row items-center`}>
          <Text style={tw`text-[12px] ${inMin <= 30 ? 'text-verify font-semibold' : 'text-ink-2'}`}>{when} · </Text>
          <MapPin size={11} color={C.ink3} />
          <Text numberOfLines={1} style={tw`ml-0.5 text-[12px] text-ink-2 shrink`}>{place.name}</Text>
          {place.approximate ? <Lock size={10} color={C.ink3} style={tw`ml-0.5`} /> : null}
        </View>
        <View style={tw`mt-1 flex-row items-center`}>
          <View style={tw`flex-row mr-1.5`}>{faces.map((u, i) => <Avatar key={u.id} emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={18} style={i ? { marginLeft: -6 } : undefined} />)}</View>
          <Users size={10} color={C.ink3} /><Text style={tw`ml-0.5 text-[11px] text-ink-3`}>{approved.length + 1}/{a.capacity}</Text>
          {a.openSlot ? <View style={tw`ml-1.5`}><Tag>{t('공강')}</Tag></View> : null}
        </View>
      </Pressable>
      <JoinButton activity={a} size="sm" label={t('같이 가기')} />
    </View>
  );
}
