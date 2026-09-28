import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Check, X, MessageCircle, Pencil } from 'lucide-react-native';
import { t } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { relativeTime } from '@core/lib/format';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { Screen, Avatar, Button, Empty, Tag, C } from '@/ui';
import { affiliationText } from '@/components/a_shared';

/** 주최자용 참가 승인·거절 화면 (웹 ManageActivityPage) */
export default function ManageActivityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const participations = useAppStore((s) => s.participations);
  const rooms = useAppStore((s) => s.chatRooms);
  const a = v.visibleActivities.find((x) => x.id === id);
  if (!a || a.hostId !== v.me.id) return <Screen title={t('참가자 관리')}><Empty title={`🔒 ${t('주최자만 볼 수 있어요')}`} /></Screen>;
  const pending = participations.filter((p) => p.activityId === a.id && p.status === 'pending');
  const approved = participations.filter((p) => p.activityId === a.id && p.status === 'approved');
  const rejected = participations.filter((p) => p.activityId === a.id && p.status === 'rejected');
  const room = rooms.find((r) => r.activityId === a.id);

  return (
    <Screen title={t('참가자 관리')} right={<Button size="sm" variant="outline" icon={<Pencil size={14} color={C.ink2} />} onPress={() => nav(`/activities/${a.id}/edit`)}>{t('수정')}</Button>}>
      <View style={tw`pt-2`}>
        <View style={tw`card p-4`}>
          <Text style={tw`text-[15px] font-bold text-ink`}>{a.title}</Text>
          <Text style={tw`text-[12px] text-ink-3 mt-1`}>{t('승인')} {approved.length} {t('/ 모집')} {a.capacity >= 999 ? t('제한 없음') : a.capacity} {t('· 대기')} {pending.length}</Text>
          {room && <View style={tw`flex-row mt-3`}><Button size="sm" variant="secondary" icon={<MessageCircle size={14} color={C.primary} />} onPress={() => nav(`/chats/${room.id}`)}>{t('그룹 채팅 열기')}</Button></View>}
        </View>

        <Text style={tw`text-[15px] font-bold text-ink mt-5 mb-2`}>{t('참가 요청')} {pending.length}</Text>
        {pending.length === 0 && <View style={tw`card p-4`}><Text style={tw`text-[13px] text-ink-3`}>{t('대기 중인 요청이 없어요.')}</Text></View>}
        {pending.map((p) => { const u = v.userById(p.userId); if (!u) return null; return (
          <View key={p.id} style={tw`card p-3.5 mb-2`}>
            <Pressable onPress={() => nav(`/users/${u.id}`)} style={tw`flex-row items-center`}>
              <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={44} />
              <View style={tw`flex-1 min-w-0 ml-3`}><Text style={tw`text-[14px] font-bold text-ink`}>{u.nickname}</Text><Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{affiliationText(u)}</Text></View>
              <Text style={tw`text-[11px] text-ink-3`}>{relativeTime(p.createdAt)}</Text>
            </Pressable>
            {p.message ? <View style={tw`mt-2 rounded-xl bg-surface-2 px-3 py-2`}><Text style={tw`text-[13px] text-ink`}>“{p.message}”</Text></View> : null}
            <View style={tw`flex-row mt-3`}>
              <Button full variant="outline" icon={<X size={16} color={C.ink2} />} onPress={() => run(() => api.activities.reject(p.id), t('요청을 거절했어요.'))}>{t('거절')}</Button>
              <View style={tw`w-2`} />
              <Button full icon={<Check size={16} color={C.onPrimary} />} disabled={approved.length >= a.capacity} onPress={() => run(() => api.activities.approve(p.id), `${u.nickname}${t('님을 승인했어요. 그룹 채팅방에 입장해요.')}`)}>{t('승인')}</Button>
            </View>
          </View>
        ); })}

        <Text style={tw`text-[15px] font-bold text-ink mt-5 mb-2`}>{t('참가자')} {approved.length}</Text>
        <View style={tw`card overflow-hidden`}>
          {approved.length === 0 && <View style={tw`p-4`}><Text style={tw`text-[13px] text-ink-3`}>{t('아직 승인된 참가자가 없어요.')}</Text></View>}
          {approved.map((p, i) => { const u = v.userById(p.userId); if (!u) return null; return (
            <View key={p.id} style={tw`flex-row items-center px-3.5 py-3 ${i < approved.length - 1 ? 'border-b border-line' : ''}`}><Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={36} /><View style={tw`flex-1 min-w-0 mx-3`}><Text style={tw`text-[14px] font-bold text-ink`}>{u.nickname}</Text><Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{affiliationText(u)}</Text></View><Tag tone="mint">{t('참가 확정')}</Tag></View>
          ); })}
        </View>
        {rejected.length > 0 && <Text style={tw`text-[12px] text-ink-3 mt-3`}>{t('거절')} {rejected.length}{t('건 — 거절 사유는 요청자에게 표시되지 않아요.')}</Text>}
      </View>
    </Screen>
  );
}
