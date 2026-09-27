import { useNavigate } from 'react-router-dom';
import { UserPlus, MapPin } from 'lucide-react';
import { t, lang } from '@core/i18n';
import type { User } from '@core/types';
import type { Reason } from '@core/lib/recommend';
import { Avatar, Button, Tag } from '@/components/ui';
import { INTEREST_LABELS } from '@core/lib/labels';
import { personLine, cityOf } from '@core/lib/network';
import { commonInterests } from '@core/lib/relations';
import { useViewer } from '@/hooks/useViewer';
import { ReasonChips } from '@/components/people_ReasonChips';
import { SchoolBadge } from '@/components/people_SchoolBadge';
import { cn } from '@core/lib/cn';

/**
 * 사람 행 — 검색 결과·연결 목록·홈 미니 카드에 공통.
 * 사진 · 이름 · 학교 'YY ✓ · 직무/전공 · 도시 · 관심사 · 이유 칩 · [+ 연결]
 */
export function PersonRow({ user, reasons = [], onConnect, busy, compact, className }: { user: User; reasons?: Reason[]; onConnect?: (u: User) => void; busy?: boolean; compact?: boolean; className?: string }) {
  const nav = useNavigate();
  const v = useViewer();
  const common = commonInterests(v.me, user);
  const connected = v.isFriend(user.id);
  const requested = !!v.pendingOut(user.id);
  return (
    <article className={cn('flex items-start gap-3 rounded-[20px] border border-line bg-white p-3', className)}>
      <button onClick={() => nav(`/users/${user.id}`)} className="shrink-0 press" aria-label={user.nickname}><Avatar emoji={user.avatar.emoji} hue={user.avatar.hue} url={user.avatar.url} size={compact ? 44 : 56} /></button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <button onClick={() => nav(`/users/${user.id}`)} className="text-[15px] font-bold truncate">{user.nickname}</button>
          <SchoolBadge user={user} withYear size="sm" className="min-w-0" />
        </div>
        <div className="text-[12px] text-ink-2 truncate">{personLine(user, lang)}</div>
        {!compact && (
          <div className="text-[12px] text-ink-3 mt-0.5 flex items-center gap-1 flex-wrap"><MapPin size={11} />{cityOf(user)}{user.activityCity && user.activityCity !== cityOf(user) ? ` · ${t('활동')} ${user.activityCity}` : ''}
            {(common.length ? common : user.interests).slice(0, 2).map((i) => <Tag key={i} tone={common.includes(i) ? 'primary' : 'neutral'} className="ml-0.5">{INTEREST_LABELS[i]}</Tag>)}
          </div>
        )}
        <ReasonChips reasons={reasons} max={2} className="mt-1.5" />
      </div>
      {onConnect && (
        <Button size="sm" variant={connected || requested ? 'secondary' : 'primary'} icon={<UserPlus size={14} />} loading={busy} disabled={connected || requested} onClick={() => onConnect(user)} className="shrink-0 self-center">
          {connected ? t('연결됨') : requested ? t('요청됨') : t('연결')}
        </Button>
      )}
    </article>
  );
}
