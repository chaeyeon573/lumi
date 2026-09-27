import { useNavigate } from 'react-router-dom';
import { UserPlus, MapPin, Lock, CheckCircle2 } from 'lucide-react';
import { t, lang } from '@core/i18n';
import type { User } from '@core/types';
import type { Reason } from '@core/lib/recommend';
import { Portrait, VerifiedBadge, Tag, Button } from '@/components/ui';
import { INTEREST_LABELS } from '@core/lib/labels';
import { networkLabel } from '@core/lib/network';
import { commonInterests } from '@core/lib/relations';
import { useViewer } from '@/hooks/useViewer';
import { cn } from '@core/lib/cn';

export const cityOf = (u: Pick<User, 'career' | 'region'>) => u.career?.city ?? u.region;

/** Beyond / 고급 검색 결과 카드 — 사진·이름·소속·학과·도시·관심사·연결 이유·Connect. locked 면 흐리게 + AroundU+ 오버레이 */
export function BeyondCard({ user, reasons, locked, busy, onConnect, className }: { user: User; reasons: Reason[]; locked?: boolean; busy?: boolean; onConnect: (u: User) => void; className?: string }) {
  const nav = useNavigate();
  const v = useViewer();
  const common = commonInterests(v.me, user);
  const dept = user.affiliation.type === 'university' && user.affiliation.showDepartment ? user.affiliation.department : '';
  const connected = v.isFriend(user.id);
  const requested = !!v.pendingOut(user.id);
  const open = () => { if (!locked) nav(`/users/${user.id}`); };
  return (
    <article className={cn('relative rounded-[24px] border border-line bg-white overflow-hidden', className)} aria-hidden={locked || undefined}>
      <div className={cn(locked && 'blur-sm pointer-events-none select-none')}>
        <button onClick={open} className="block w-full text-left" tabIndex={locked ? -1 : undefined}>
          <Portrait emoji={user.avatar.emoji} hue={user.avatar.hue} url={user.avatar.url} photoType={user.avatar.photoType} className="h-[200px]" />
        </button>
        <div className="p-4">
          <div className="flex items-center gap-1.5">
            <button onClick={open} className="text-[17px] font-bold" tabIndex={locked ? -1 : undefined}>{user.nickname}</button>
            {user.affiliation.type === 'university' && user.affiliation.emailVerified && <VerifiedBadge kind="school" />}
          </div>
          <div className="text-[13px] text-primary font-semibold mt-0.5">{networkLabel(user, lang)}{dept ? ` · ${dept}` : ''}</div>
          <div className="text-[12px] text-ink-3 mt-0.5 flex items-center gap-1"><MapPin size={11} />{cityOf(user)}</div>
          <div className="mt-2.5 flex flex-wrap gap-1">{(common.length ? [...common, ...user.interests.filter((i) => !common.includes(i))] : user.interests).slice(0, 3).map((i) => <Tag key={i} tone={common.includes(i) ? 'primary' : 'neutral'}>{INTEREST_LABELS[i]}</Tag>)}</div>
          {reasons.length > 0 && (
            <div className="mt-3">
              <div className="text-[11px] font-bold text-ink-3">{t('이런 이유로 맞아요')}</div>
              <ul className="mt-1 space-y-0.5">{reasons.slice(0, 2).map((r) => <li key={r.text} className="text-[12px] text-ink-2 flex items-start gap-1"><CheckCircle2 size={12} className="text-primary shrink-0 mt-0.5" /><span className="line-clamp-1">{r.text}</span></li>)}</ul>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" className="flex-1" variant={connected || requested ? 'secondary' : 'primary'} icon={<UserPlus size={15} />} loading={busy} disabled={connected || requested} onClick={() => onConnect(user)} tabIndex={locked ? -1 : undefined}>{connected ? t('친구') : requested ? t('요청됨') : t('연결')}</Button>
            <Button size="sm" variant="outline" onClick={open} tabIndex={locked ? -1 : undefined}>{t('프로필 보기')}</Button>
          </div>
        </div>
      </div>
      {locked && (
        <div className="absolute inset-0 grid place-items-center bg-white/35">
          <span className="h-9 px-3.5 rounded-full bg-white/90 backdrop-blur text-primary text-[12px] font-bold flex items-center gap-1.5 shadow-sm"><Lock size={13} />{t('AroundU+ 전용')}</span>
        </div>
      )}
    </article>
  );
}
