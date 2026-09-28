import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { t, lang } from '@core/i18n';
import type { Snapshot } from '@core/api/types';
import type { User } from '@core/types';
import { profileView, connectionStatus, CONNECTION_LABELS, canShowInPath, type ProfileView } from '@core/lib/privacy';
import { mutualFriends, commonInterests } from '@core/lib/relations';
import { cityOf, gradYearOf, isAlumniStage, majorOf, networkLabel, shortSchool, yy } from '@core/lib/network';
import { INTEREST_LABELS } from '@core/lib/labels';
import { cn } from '@core/lib/cn';
import { Avatar, Tag, PrivacyNote } from '@/components/ui';
import { SchoolBadge } from '@/components/people_SchoolBadge';
import { StatusPill } from '@/components/people_StatusPill';
import { SaveButton, ConnectTextButton } from '@/components/people_ActionBar';
import { useSnapshot } from '@/hooks/useSnapshot';
import { useViewer } from '@/hooks/useViewer';

/** "2촌 · 공통 연결 1명" — 이유·거리가 먼저. 공통 연결은 경로 노출을 허용한 사람만 센다 */
export function degreeLine(snap: Snapshot, me: User, u: User, degree?: number): string {
  if (degree === 1) return t('1촌 · 연결됨');
  if (degree === 2) {
    const n = mutualFriends(snap, me.id, u.id).map((id) => snap.users.find((x) => x.id === id)).filter((x): x is User => !!x && canShowInPath(x)).length;
    if (!n) return t('2촌');
    return lang === 'en' ? `2nd · ${n} mutual` : `2촌 · 공통 연결 ${n}명`;
  }
  if (degree === 3) return t('3촌 · 건너건너 아는 사람');
  return t('새로운 사람');
}

/** 공개 범위를 적용한 두 번째 줄 — 회사·졸업연도는 허용된 경우에만 */
function maskedLine(u: User, view: ProfileView): string {
  if (!view.full) return u.affiliation.type === 'university' ? networkLabel(u, lang) : '';
  if (u.affiliation.type === 'company') return view.company ? [u.affiliation.companyName, u.affiliation.jobTitle].filter(Boolean).join(' · ') : (u.affiliation.jobTitle ?? '');
  const short = shortSchool(u.affiliation.schoolName);
  if (isAlumniStage(u)) {
    const year = view.gradYear ? yy(gradYearOf(u)) : '';
    const job = [u.career?.role, view.company ? u.career?.company : undefined].filter(Boolean).join(' @ ') || majorOf(u);
    return `${short} ${year}${job ? ` · ${job}` : ''}`.replace(/\s+/g, ' ').trim();
  }
  const major = u.affiliation.showDepartment ? majorOf(u) : '';
  return `${networkLabel(u, lang)}${major ? ` · ${major}` : ''}`;
}

/**
 * 공개 범위를 지킨 사람 카드 — 위에 이유/거리(top), 아래에 이름·학교·상태·(허용된) 직무·도시, 오른쪽에 [저장] · 연결.
 * 비공개 필드는 가리고 "같은 학교·2촌에게만 자세히 보여요" 한 줄을 남긴다.
 */
export function MaskedPersonCard({ user, top, sub, className }: { user: User; top?: ReactNode; sub?: ReactNode; className?: string }) {
  const nav = useNavigate();
  const snap = useSnapshot();
  const v = useViewer();
  const view = profileView(snap, v.me, user);
  const status = connectionStatus(snap, v.me, user);
  const common = commonInterests(v.me, user);
  const line = maskedLine(user, view);
  const open = () => nav(`/users/${user.id}`);
  return (
    <article className={cn('rounded-[20px] border border-line bg-white p-3', className)}>
      {top && <div className="flex items-center gap-1.5 flex-wrap mb-2">{top}</div>}
      <div className="flex items-start gap-3">
        <button onClick={open} className="shrink-0 press" aria-label={user.nickname}><Avatar emoji={user.avatar.emoji} hue={user.avatar.hue} url={user.avatar.url} size={48} /></button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <button onClick={open} className="text-[15px] font-bold truncate">{user.nickname}</button>
            <SchoolBadge user={user} size="sm" className="min-w-0" />
          </div>
          {line && <div className="text-[12px] text-ink-2 truncate">{line}</div>}
          {sub}
          <div className="text-[12px] text-ink-3 mt-0.5 flex items-center gap-1 flex-wrap">
            {view.city && <><MapPin size={11} />{cityOf(user)}</>}
            {common.slice(0, 2).map((i) => <Tag key={i} tone="primary" className="ml-0.5 h-5 text-[11px]">{INTEREST_LABELS[i]}</Tag>)}
          </div>
          {!view.full && view.reason && <PrivacyNote text={view.reason} className="mt-1" />}
        </div>
        <div className="shrink-0 self-center flex flex-col items-center gap-0.5">
          <SaveButton user={user} />
          {status === 'private' ? <span className="h-7 px-1.5 text-[12px] font-bold text-ink-3 grid place-items-center">{CONNECTION_LABELS.private}</span> : <ConnectTextButton user={user} />}
        </div>
      </div>
    </article>
  );
}

/** 카드 맨 위 — 이유/거리 알약 + 상태 */
export function DegreePill({ text }: { text: string }) {
  return <span className="h-6 px-2.5 rounded-full bg-accent-soft text-primary text-[11px] font-bold inline-flex items-center">{text}</span>;
}

export { StatusPill };
