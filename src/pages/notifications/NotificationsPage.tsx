import { useNavigate } from 'react-router-dom';
import { t } from '@core/i18n';
import { Armchair, UserCheck, Heart, CalendarCheck, CalendarX, Inbox, Clock, MessageSquare, ThumbsUp, UserPlus, Megaphone, MapPin, Sparkles, CheckCheck, AlarmClock, Users, Vote, BookOpen } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Button, EmptyState, CardSkeleton, ErrorState } from '@/components/ui';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { relativeTime } from '@core/lib/format';
import type { NotificationType } from '@core/types';
import { cn } from '@core/lib/cn';

const ICONS: Record<NotificationType, { Icon: typeof Heart; cls: string }> = {
  friend_accepted: { Icon: UserCheck, cls: 'bg-mint-soft text-mint' },
  mutual_like: { Icon: Heart, cls: 'bg-heart-soft text-heart' },
  participation_approved: { Icon: CalendarCheck, cls: 'bg-mint-soft text-mint' },
  participation_rejected: { Icon: CalendarX, cls: 'bg-surface-2 text-ink-3' },
  participation_request: { Icon: Inbox, cls: 'bg-primary-soft text-primary' },
  activity_reminder: { Icon: Clock, cls: 'bg-gold-soft text-[#B57A0E]' },
  comment: { Icon: MessageSquare, cls: 'bg-primary-soft text-primary' },
  like: { Icon: ThumbsUp, cls: 'bg-heart-soft text-heart' },
  follow: { Icon: UserPlus, cls: 'bg-primary-soft text-primary' },
  org_event: { Icon: Megaphone, cls: 'bg-gold-soft text-[#B57A0E]' },
  nearby_activity: { Icon: MapPin, cls: 'bg-accent-soft text-accent' },
  proposal: { Icon: Sparkles, cls: 'bg-primary-soft text-primary' },
  proposal_result: { Icon: Sparkles, cls: 'bg-mint-soft text-mint' },
  deadline: { Icon: AlarmClock, cls: 'bg-danger-soft text-danger' },
  opportunity_match: { Icon: Users, cls: 'bg-primary-soft text-primary' },
  plan_vote: { Icon: Vote, cls: 'bg-accent-soft text-accent' },
  plan_decided: { Icon: CalendarCheck, cls: 'bg-mint-soft text-mint' },
  game_received: { Icon: Sparkles, cls: 'bg-primary-soft text-primary' },
  study_group: { Icon: BookOpen, cls: 'bg-primary-soft text-primary' },
  game_result: { Icon: Sparkles, cls: 'bg-mint-soft text-mint' },
  seat_alert: { Icon: Armchair, cls: 'bg-mint-soft text-mint' },
};

export function NotificationsPage() {
  const nav = useNavigate();
  const me = useAppStore((s) => s.currentUserId)!;
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const run = useAppStore((s) => s.run);
  const list = useAppStore((s) => s.notifications).filter((n) => n.userId === me).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = list.filter((n) => !n.read).length;

  return (
    <div className="min-h-full">
      <TopBar back title={t('알림')} messages right={unread > 0 && <Button size="sm" variant="ghost" icon={<CheckCheck size={15} />} onClick={() => run(() => api.notifications.markAllRead(me))}>{t('모두 읽음')}</Button>} />
      {status === 'loading' && <CardSkeleton count={3} />}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && (list.length === 0 ? <EmptyState emoji="🔔" title={t('알림이 없어요')} description={t('참가 승인, 친구 요청 수락, 활동 시작 전 알림이 여기에 표시돼요.')} /> : (
        <div className="px-4 py-3 card divide-y divide-line">
          {list.map((n) => { const { Icon, cls } = ICONS[n.type]; return (
            <button key={n.id} onClick={async () => { if (!n.read) await run(() => api.notifications.markRead(n.id)); if (n.link) nav(n.link); }} className={cn('w-full flex items-start gap-3 px-3.5 py-3 text-left press', !n.read && 'bg-primary-soft/40')}>
              <span className={cn('h-10 w-10 rounded-xl grid place-items-center shrink-0', cls)}><Icon size={18} /></span>
              <span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold">{n.title}</span><span className="block text-[13px] text-ink-2 leading-snug mt-0.5">{n.body}</span><span className="block text-[11px] text-ink-3 mt-1">{relativeTime(n.createdAt)}</span></span>
              {!n.read && <span className="h-2 w-2 rounded-full bg-accent mt-2" />}
            </button>
          ); })}
        </div>
      ))}
    </div>
  );
}
