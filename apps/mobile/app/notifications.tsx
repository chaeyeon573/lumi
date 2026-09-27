import { Pressable, Text, View } from 'react-native';
import { UserCheck, Heart, CalendarCheck, CalendarX, Inbox, Clock, MessageSquare, ThumbsUp, UserPlus, Megaphone, MapPin, Sparkles, CheckCheck, AlarmClock, Users, Vote } from 'lucide-react-native';
import { t } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { relativeTime } from '@core/lib/format';
import type { NotificationType } from '@core/types';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { Screen, Button, Empty, Loading, C } from '@/ui';
import { ErrorState } from '@/components/b_States';

const GOLD = '#B57A0E';
const ICONS: Record<NotificationType, { Icon: typeof Heart; bg: string; fg: string }> = {
  friend_accepted: { Icon: UserCheck, bg: C.mintSoft, fg: C.mint },
  mutual_like: { Icon: Heart, bg: C.accent, fg: C.primary },
  participation_approved: { Icon: CalendarCheck, bg: C.mintSoft, fg: C.mint },
  participation_rejected: { Icon: CalendarX, bg: C.surface2, fg: C.ink3 },
  participation_request: { Icon: Inbox, bg: C.soft, fg: C.primary },
  activity_reminder: { Icon: Clock, bg: C.goldSoft, fg: GOLD },
  comment: { Icon: MessageSquare, bg: C.soft, fg: C.primary },
  like: { Icon: ThumbsUp, bg: C.accent, fg: C.primary },
  follow: { Icon: UserPlus, bg: C.soft, fg: C.primary },
  org_event: { Icon: Megaphone, bg: C.goldSoft, fg: GOLD },
  nearby_activity: { Icon: MapPin, bg: C.accentSoft, fg: C.accent },
  proposal: { Icon: Sparkles, bg: C.soft, fg: C.primary },
  proposal_result: { Icon: Sparkles, bg: C.mintSoft, fg: C.mint },
  deadline: { Icon: AlarmClock, bg: '#FFDAD6', fg: C.danger },
  opportunity_match: { Icon: Users, bg: C.soft, fg: C.primary },
  plan_vote: { Icon: Vote, bg: C.accentSoft, fg: C.accent },
  plan_decided: { Icon: CalendarCheck, bg: C.mintSoft, fg: C.mint },
  new_people:{ Icon: CalendarCheck, bg: C.mintSoft, fg: C.mint },
  group_joined:{ Icon: CalendarCheck, bg: C.mintSoft, fg: C.mint },
};

/** 알림 목록 (웹 NotificationsPage) */
export default function NotificationsScreen() {
  const me = useAppStore((s) => s.currentUserId)!;
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const run = useAppStore((s) => s.run);
  const list = useAppStore((s) => s.notifications).filter((n) => n.userId === me).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = list.filter((n) => !n.read).length;

  return (
    <Screen title={t('알림')} right={unread > 0 ? <Button size="sm" variant="outline" icon={<CheckCheck size={15} color={C.ink2} />} onPress={() => run(() => api.notifications.markAllRead(me))}>{t('모두 읽음')}</Button> : undefined}>
      {status === 'loading' && <Loading />}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && (list.length === 0 ? <Empty title={t('알림이 없어요')} description={t('참가 승인, 친구 요청 수락, 활동 시작 전 알림이 여기에 표시돼요.')} /> : (
        <View style={tw`my-3 rounded-[24px] border border-line bg-white overflow-hidden`}>
          {list.map((n, idx) => { const { Icon, bg, fg } = ICONS[n.type]; return (
            <Pressable key={n.id} onPress={async () => { if (!n.read) await run(() => api.notifications.markRead(n.id)); if (n.link) nav(n.link); }} style={[tw`flex-row items-start px-3.5 py-3 ${idx === 0 ? '' : 'border-t border-line'}`, !n.read ? { backgroundColor: 'rgba(210,228,255,0.4)' } : null]}>
              <View style={[tw`h-10 w-10 rounded-xl items-center justify-center`, { backgroundColor: bg }]}><Icon size={18} color={fg} /></View>
              <View style={tw`flex-1 min-w-0 ml-3`}>
                <Text style={tw`text-[14px] font-semibold text-ink`}>{n.title}</Text>
                <Text style={tw`text-[13px] text-ink-2 leading-4 mt-0.5`}>{n.body}</Text>
                <Text style={tw`text-[11px] text-ink-3 mt-1`}>{relativeTime(n.createdAt)}</Text>
              </View>
              {!n.read && <View style={tw`h-2 w-2 rounded-full bg-accent mt-2 ml-2`} />}
            </Pressable>
          ); })}
        </View>
      ))}
    </Screen>
  );
}
