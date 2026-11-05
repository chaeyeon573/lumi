import { useNavigate } from 'react-router-dom';
import { Bell, Flag, ShieldCheck, UserX } from 'lucide-react';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { relativeTime } from '@core/lib/format';
import type { User } from '@core/types';
import { Badge, Btn, EmptyState, IconTile, InfoNote, PersonCard, RowCard, Switch, TextCard, cardCls } from '@/components/ha';
import { SchoolEmailCard } from '@/components/settings/SchoolEmailCard';
import { PushSettingRow } from '@/components/native/PushSettingRow';
import { useViewer } from '@/hooks/useViewer';
import { cn } from '@core/lib/cn';
import { SubScreen, en, majorYear, useSaveSelf } from '@/pages/profile/shared';

/** Blocked accounts — 내가 차단한 사람과 차단 해제 */
export function BlockedAccountsPage() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const blocked = v.snap.relationships.blocks.filter((b) => b.fromId === v.me.id).map((b) => v.userById(b.toId)).filter((u): u is User => !!u);
  return (
    <SubScreen title={en ? 'Blocked accounts' : '차단한 계정'}>
      {blocked.length === 0
        ? <EmptyState className="pt-4" icon={<UserX size={28} />} tone="neutral" title={en ? 'No one blocked' : '차단한 사람이 없어요'} sub={en ? 'Block someone from ··· on their profile or in a chat.' : '프로필이나 채팅의 ··· 에서 차단할 수 있어요.'} />
        : <div className="space-y-3">{blocked.map((u) => (
            <PersonCard key={u.id} avatar={u.avatar} name={u.nickname} meta={majorYear(u)}
              action={<Btn size="sm" variant="outline" onClick={() => run(() => api.relationships.unblock(v.me.id, u.id), en ? 'Unblocked' : '차단을 풀었어요')}>{en ? 'Unblock' : '차단 해제'}</Btn>} />
          ))}</div>}
      <InfoNote className="mt-4">{en ? 'Blocked people can’t message you or see your profile. They aren’t told.' : '차단한 사람은 메시지를 보내거나 프로필을 볼 수 없어요. 상대에게 알리지 않아요.'}</InfoNote>
    </SubScreen>
  );
}

const TARGET = { user: en ? 'Person' : '사람', activity: en ? 'Meetup' : '모임', post: en ? 'Post' : '글', comment: en ? 'Comment' : '댓글', message: en ? 'Chat' : '채팅', ride: 'Ride' } as const;

/** Report a concern (S086 줄) — 신고는 그 사람·글·모임의 ··· 에서 한다. 여기서는 어떻게 하는지와 내가 낸 신고의 처리 상태 */
export function MyReportsPage() {
  const reports = useAppStore((s) => s.reports);
  const me = useAppStore((s) => s.currentUserId);
  const mine = reports.filter((r) => r.reporterId === me).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <SubScreen title={en ? 'Report a concern' : '신고하기'}>
      <TextCard title={en ? 'Report from where it happened' : '일어난 곳에서 신고해요'}>
        {en ? 'Tap ··· on a profile, post, meetup or chat and choose Report. Reports are not shared with the person you report.' : '프로필·글·모임·채팅의 ··· 를 누르고 신고를 고르세요. 신고한 사실은 상대에게 알리지 않아요.'}
      </TextCard>
      <h2 className="ha-h2 mt-7 mb-3">{en ? 'Your reports' : '내 신고'}</h2>
      {mine.length === 0 ? <p className="text-[14px] text-ink-3">{en ? 'You haven’t reported anything.' : '아직 신고한 것이 없어요.'}</p> : (
        <div className="space-y-3">{mine.map((r) => (
          <RowCard key={r.id} tone="rose" icon={<Flag size={20} />} title={r.reason.split(' — ')[0]} sub={`${TARGET[r.targetType]} · ${relativeTime(r.createdAt)}`}
            right={<Badge tone={!r.status || r.status === 'open' ? 'peach' : 'mint'}>{!r.status || r.status === 'open' ? (en ? 'In review' : '검토 중') : (en ? 'Reviewed' : '검토 완료')}</Badge>} />
        ))}</div>
      )}
    </SubScreen>
  );
}

/** Account security — 학교 이메일(로그인 수단)과 인증 상태 */
export function AccountSecurityPage() {
  const v = useViewer();
  const aff = v.me.affiliation.type === 'university' ? v.me.affiliation : null;
  return (
    <SubScreen title={en ? 'Account security' : '계정 보안'}>
      <div className="space-y-3">
        <SchoolEmailCard />
        <div className={cn(cardCls, 'p-4 flex items-center gap-3.5')}>
          <IconTile tone="mint"><ShieldCheck size={21} /></IconTile>
          <span className="flex-1 min-w-0">
            <span className="block text-[15px] font-bold">{en ? 'Sign-in' : '로그인'}</span>
            <span className="block text-[13px] text-ink-3 mt-0.5">{en ? 'A one-time code to your school email — no password to leak' : '학교 이메일로 받는 일회용 코드 — 새어 나갈 비밀번호가 없어요'}</span>
          </span>
        </div>
      </div>
      {aff && !aff.emailVerified && <InfoNote className="mt-4">{en ? 'Until you add your school email, this phone is your only way back in.' : '학교 이메일을 추가하기 전에는 이 기기로만 다시 들어올 수 있어요.'}</InfoNote>}
    </SubScreen>
  );
}

/** Notifications (S084 › App) — 알림 켜기·끄기 (끄면 푸시도 보내지 않는다 — server/push.ts), iPhone 앱이면 이 기기의 푸시 권한 */
export function NotificationSettingsPage() {
  const nav = useNavigate();
  const { me, busy, save } = useSaveSelf();
  const on = me.settings.notifications !== false;
  return (
    <SubScreen title={en ? 'Notifications' : '알림'}>
      <div className={cn(cardCls, 'p-4 flex items-center gap-3.5')}>
        <IconTile tone="ice"><Bell size={21} /></IconTile>
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-bold">{en ? 'Push notifications' : '푸시 알림'}</span>
          <span className="block text-[13px] text-ink-3 mt-0.5">{en ? 'Replies, friend requests and plan updates' : '답장·친구 요청·약속 소식'}</span>
        </span>
        <Switch checked={on} label={en ? 'Push notifications' : '푸시 알림'} onChange={(v) => { if (!busy) void save({ settings: { ...me.settings, notifications: v } }, v ? (en ? 'Notifications on' : '알림을 켰어요') : (en ? 'Notifications off' : '알림을 껐어요'), false); }} />
      </div>
      {/* iPhone 앱에서만 — 이 기기의 푸시 권한 */}
      <div className="px-1"><PushSettingRow /></div>
      <InfoNote className="mt-4">{on ? (en ? 'New activity still shows in your notifications list.' : '새 소식은 알림 목록에도 쌓여요.') : (en ? 'Off: nothing is pushed to your phone. Your notifications list still fills in.' : '끄면 폰으로 보내지 않아요. 알림 목록에는 그대로 쌓여요.')}</InfoNote>
      <Btn variant="link" className="mt-3" onClick={() => nav('/notifications')}>{en ? 'Open notifications' : '알림 보기'}</Btn>
    </SubScreen>
  );
}
