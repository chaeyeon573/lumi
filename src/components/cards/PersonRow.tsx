import { useNavigate } from 'react-router-dom';
import { MapPin, MoreHorizontal } from 'lucide-react';
import { t, lang } from '@core/i18n';
import type { User } from '@core/types';
import type { Reason } from '@core/lib/recommend';
import { Avatar, Tag } from '@/components/ui';
import { INTEREST_LABELS } from '@core/lib/labels';
import { commonInterests, mutualFriends } from '@core/lib/relations';
import { profileView } from '@core/lib/privacy';
import { degreeOf } from '@core/lib/graph';
import { useViewer } from '@/hooks/useViewer';
import { ReasonChips } from '@/components/people_ReasonChips';
import { SchoolBadge } from '@/components/people_SchoolBadge';
import { SaveButton, ConnectTextButton } from '@/components/people_ActionBar';
import { StatusPill } from '@/components/people_StatusPill';
import { maskedCity, maskedPersonLine } from '@/components/people_view';
import { cn } from '@core/lib/cn';

/**
 * 사람 행 — 검색 결과·연결 목록·홈 미니 카드에 공통.
 * 순서: 왜 추천됐나(이유 칩) → 얼마나 가까운가(2촌 · 공통 연결) → 이름 · 학교 'YY ✓ · 상태 · 소속 · 도시 · 관심사 → [저장] (작은 '연결')
 * 저장이 기본 행동(조용히, 나만 봄). 연결은 작은 텍스트로 남겨 둔다. 회사·도시·졸업연도는 공개 범위(profileView)대로 가린다.
 * `onConnect` 를 넘기면 호출자의 연결 로직을, `actions` 만 켜면 기본 연결 로직을 쓴다. `onMore` 는 행 오른쪽 ⋯.
 */
export function PersonRow({ user, reasons = [], onConnect, busy, compact, actions, onMore, className }: { user: User; reasons?: Reason[]; onConnect?: (u: User) => void; busy?: boolean; compact?: boolean; actions?: boolean; onMore?: (u: User) => void; className?: string }) {
  const nav = useNavigate();
  const v = useViewer();
  const common = commonInterests(v.me, user);
  const connected = v.isFriend(user.id);
  const requested = !!v.pendingOut(user.id);
  const view = profileView(v.snap, v.me, user);
  const city = maskedCity(user, view);
  const degree = connected ? 1 : degreeOf(v.snap, v.me.id, user.id, 2);
  const mutual = degree === 2 ? mutualFriends(v.snap, v.me.id, user.id).length : 0;
  return (
    <article className={cn('flex items-start gap-3 rounded-[20px] border border-line bg-white p-3', className)}>
      <button onClick={() => nav(`/users/${user.id}`)} className="shrink-0 press" aria-label={user.nickname}><Avatar emoji={user.avatar.emoji} hue={user.avatar.hue} url={user.avatar.url} size={compact ? 44 : 56} /></button>
      <div className="min-w-0 flex-1">
        <ReasonChips reasons={reasons} max={2} className="mb-1" />
        {degree === 2 && <div className="text-[11px] font-semibold text-verify">{t('2촌')}{mutual ? ` · ${t('공통 연결')} ${mutual}${t('명')}` : ''}</div>}
        <div className="flex items-center gap-1.5 min-w-0">
          <button onClick={() => nav(`/users/${user.id}`)} className="text-[15px] font-bold truncate shrink-0 max-w-[70%]">{user.nickname}</button>
          <SchoolBadge user={user} withYear={view.gradYear} size="sm" className="min-w-0" />
        </div>
        <StatusPill user={user} size="sm" className="mt-0.5" />
        <div className="text-[12px] text-ink-2 truncate">{maskedPersonLine(user, view, lang)}</div>
        {!compact && (
          <div className="text-[12px] text-ink-3 mt-0.5 flex items-center gap-1 flex-wrap">{city && <><MapPin size={11} />{city}{view.city && user.activityCity && user.activityCity !== city ? ` · ${t('활동')} ${user.activityCity}` : ''}</>}
            {(common.length ? common : user.interests).slice(0, 2).map((i) => <Tag key={i} tone={common.includes(i) ? 'primary' : 'neutral'} className="ml-0.5">{INTEREST_LABELS[i]}</Tag>)}
          </div>
        )}
      </div>
      {(onConnect || actions) && (
        <div className="shrink-0 self-center flex flex-col items-center gap-0.5">
          <SaveButton user={user} />
          {onConnect ? (
            <button type="button" onClick={() => onConnect(user)} disabled={connected || requested || busy}
              className={cn('h-7 px-1.5 text-[12px] font-bold whitespace-nowrap press disabled:pointer-events-none', connected || requested ? 'text-ink-3' : 'text-verify')}>
              {busy ? '…' : connected ? t('연결됨') : requested ? t('요청됨') : t('연결')}
            </button>
          ) : <ConnectTextButton user={user} />}
        </div>
      )}
      {onMore && <button type="button" onClick={() => onMore(user)} className="shrink-0 h-8 w-8 -mr-1 rounded-full grid place-items-center text-ink-3 press hover:bg-surface-2" aria-label={t('더보기')}><MoreHorizontal size={17} /></button>}
    </article>
  );
}
