import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AlarmClock, Armchair, Bell, BookOpen, CalendarCheck, CalendarX, CheckCheck, Clock, Dumbbell, Heart, Inbox, MapPin, Megaphone, MessageCircle, Sparkles, ThumbsUp, UserCheck, UserPlus, Users, Utensils, Vote } from 'lucide-react';
import { lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { relativeTime } from '@core/lib/format';
import { isSampleNotification } from '@core/lib/sampleorgs';
import type { NotificationType } from '@core/types';
import { BottomSheet } from '@/components/ui';
import { EmptyState, RowCard, SegTabs, cardCls, type Tone } from '@/components/ha';
import { cn } from '@core/lib/cn';
import { SubScreen } from '@/pages/profile/shared';

const en = lang === 'en';

/** 알림 종류 → 색 칸 아이콘 (PDF S070: 친구 요청 rose · 약속 확정 ice · 답글 lav · 공고 peach) */
const ICONS: Record<NotificationType, { Icon: typeof Heart; tone: Tone }> = {
  friend_accepted: { Icon: UserCheck, tone: 'rose' },
  mutual_like: { Icon: Heart, tone: 'rose' },
  follow: { Icon: UserPlus, tone: 'rose' },
  participation_approved: { Icon: CalendarCheck, tone: 'ice' },
  participation_rejected: { Icon: CalendarX, tone: 'neutral' },
  participation_request: { Icon: Inbox, tone: 'ice' },
  activity_reminder: { Icon: Clock, tone: 'ice' },
  plan_vote: { Icon: Vote, tone: 'ice' },
  plan_decided: { Icon: CalendarCheck, tone: 'ice' },
  comment: { Icon: MessageCircle, tone: 'lav' },
  like: { Icon: ThumbsUp, tone: 'lav' },
  proposal: { Icon: Sparkles, tone: 'lav' },
  proposal_result: { Icon: Sparkles, tone: 'lav' },
  game_received: { Icon: Sparkles, tone: 'lav' },
  game_result: { Icon: Sparkles, tone: 'lav' },
  study_group: { Icon: BookOpen, tone: 'ice' },
  org_event: { Icon: Megaphone, tone: 'mint' },
  nearby_activity: { Icon: MapPin, tone: 'mint' },
  opportunity_match: { Icon: Users, tone: 'peach' },
  deadline: { Icon: AlarmClock, tone: 'peach' },
  seat_alert: { Icon: Armchair, tone: 'mint' },
  dining_favorite: { Icon: Utensils, tone: 'peach' },
  gym_alert: { Icon: Dumbbell, tone: 'mint' },
};

/**
 * Notifications (PDF S070) + 빈 상태 (S095 "You're all caught up") — SegTabs All · Unread (주소 ?tab=unread),
 * 줄마다 색 칸 아이콘 + 제목 + 한 줄. 누르면 읽음 + 그곳으로. ··· = 모두 읽음. 푸시 켜기·끄기는 설정 › 알림.
 */
export function NotificationsPage() {
  const nav = useNavigate();
  const me = useAppStore((s) => s.currentUserId)!;
  const run = useAppStore((s) => s.run);
  const all = useAppStore((s) => s.notifications).filter((n) => n.userId === me).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [params, setParams] = useSearchParams();
  const [menu, setMenu] = useState(false);
  const tab = params.get('tab') === 'unread' ? 'unread' : 'all';
  const unread = all.filter((n) => !n.read);
  const list = tab === 'unread' ? unread : all;
  const open = async (id: string, read: boolean, link?: string) => {
    if (!read) await run(() => api.notifications.markRead(id)).catch(() => {});
    if (link) nav(link);
  };
  return (
    <SubScreen title={en ? 'Notifications' : '알림'} onMore={() => setMenu(true)}>
      <SegTabs className="-mx-4 px-2 mb-4" value={tab} onChange={(k) => setParams(k === 'unread' ? { tab: k } : {}, { replace: true })}
        tabs={[{ key: 'all', label: en ? 'All' : '전체' }, { key: 'unread', label: en ? 'Unread' : '안 읽음', count: unread.length || undefined }]} />
      {list.length === 0
        ? <EmptyState icon={<Bell size={28} />} title={en ? 'You’re all caught up' : '새 소식을 다 봤어요'} sub={en ? 'New replies, friend requests, and plan updates will appear here.' : '새 답글·친구 요청·약속 소식이 여기에 와요.'} />
        : <div className="space-y-3">{list.map((n) => {
            const { Icon, tone } = ICONS[n.type] ?? { Icon: Bell, tone: 'neutral' as Tone };
            return (
              <RowCard key={n.id} tone={tone} icon={<Icon size={21} />} onClick={() => open(n.id, n.read, n.link)}
                className={cn(!n.read && 'border-sel-line')}
                title={<>{isSampleNotification(n.id) && <span className="text-ink-3 font-semibold">{en ? 'Sample · ' : '예시 · '}</span>}{n.title}</>}
                sub={<>{n.body}<span className="block text-[11.5px] text-ink-3 mt-1">{relativeTime(n.createdAt)}</span></>} />
            );
          })}</div>}
      <BottomSheet open={menu} onClose={() => setMenu(false)} title={en ? 'Notifications' : '알림'}>
        <div className="space-y-2 pb-2">
          <button disabled={unread.length === 0} onClick={async () => { setMenu(false); await run(() => api.notifications.markAllRead(me)).catch(() => {}); }}
            className={cn(cardCls, 'w-full h-12 px-4 flex items-center gap-3 text-left text-[15px] press disabled:opacity-40')}><CheckCheck size={19} />{en ? 'Mark all as read' : '모두 읽음'}</button>
          <button onClick={() => { setMenu(false); nav('/settings/notifications'); }} className={cn(cardCls, 'w-full h-12 px-4 flex items-center gap-3 text-left text-[15px] press')}><Bell size={19} />{en ? 'Notification settings' : '알림 설정'}</button>
        </div>
      </BottomSheet>
    </SubScreen>
  );
}
