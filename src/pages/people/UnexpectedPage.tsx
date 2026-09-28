import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, EyeOff, Sparkles } from 'lucide-react';
import { t } from '@core/i18n';
import type { User } from '@core/types';
import type { Reason } from '@core/lib/recommend';
import { unexpectedConnections } from '@core/lib/people';
import { profileView } from '@core/lib/privacy';
import { cn } from '@core/lib/cn';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, Button, Section, SectionEmpty, SectionSkeleton, PrivacyNote } from '@/components/ui';
import { useSectionState } from '@/hooks/useSectionState';
import { useSnapshot } from '@/hooks/useSnapshot';
import { useViewer } from '@/hooks/useViewer';
import { ReasonChips, ReasonList } from '@/components/people_ReasonChips';
import { SchoolBadge } from '@/components/people_SchoolBadge';
import { SaveButton } from '@/components/people_ActionBar';
import { StatusPill } from '@/components/people_StatusPill';
import { ClosenessTag, ConnectStatusButton, maskedCity, maskedLine, useCloseness, useHideWithUndo, type Closeness } from '@/components/people_Network';

/**
 * 다른 학교, 비슷한 사람 (/people/unexpected) — 같은 학교·같은 전공처럼 뻔한 이유가 아니라,
 * 다른 학교·다른 분야인데 의미 있게 겹치는 사람. 카드 위쪽에 "어떤 점이 비슷한지"가 먼저, 사람은 그다음.
 */
export function UnexpectedPage() {
  const nav = useNavigate();
  const v = useViewer();
  const snap = useSnapshot();
  const sec = useSectionState('unexpected');
  const closeness = useCloseness(snap, v.me.id);
  const { hide, bar } = useHideWithUndo();
  const list = useMemo(() => unexpectedConnections(snap, v.me, v.visibleUsers, (u) => v.canSeeField(u, 'timetable'), 20), [snap, v]);

  return (
    <div className="min-h-full pb-10 bg-bg">
      <TopBar back title={t('다른 학교, 비슷한 사람')} messages />
      <div className="px-4 pt-1 pb-3">
        <p className="text-[13px] text-ink-2 flex items-start gap-1.5"><Sparkles size={14} className="text-primary shrink-0 mt-0.5" />{t('다른 학교·다른 분야인데 겹치는 게 있는 사람이에요. 둘러보기만 해도 괜찮아요.')}</p>
      </div>
      <div className="px-4 space-y-3">
        <Section loading={sec.loading} error={sec.error} onRetry={sec.retry} skeleton={<SectionSkeleton count={3} />}
          empty={list.length === 0 && (
            <SectionEmpty emoji="🌿" title={t('새로운 추천이 없어요')} description={t('찾는 사람을 조정하거나 프로필을 채우면 새로운 사람이 보여요.')}
              action={<div className="flex gap-2"><Button size="sm" onClick={() => nav('/profile/wants')}>{t('찾는 사람 조정')}</Button><Button size="sm" variant="outline" onClick={() => nav('/profile/edit')}>{t('프로필 보완')}</Button></div>} />
          )}>
          {list.map((c) => <UnexpectedCard key={c.user.id} user={c.user} reasons={c.reasons} closeness={closeness(c.user.id)} onHide={() => hide(c.user)} />)}
          <p className="pt-1 text-center text-[11px] text-ink-3">{t('숨긴 사람은 상대에게 알리지 않아요')}</p>
        </Section>
      </div>
      {bar}
    </div>
  );
}

/** 다른 학교, 비슷한 사람 카드 — 위: 어떤 점이 비슷한지(이유 칩 · 거리 · 펼치면 이유 전부) → 아래: 사진·이름·학교(공개 범위 적용) → 행동 */
export function UnexpectedCard({ user, reasons, closeness, onHide, compact }: { user: User; reasons: Reason[]; closeness: Closeness; onHide?: () => void; compact?: boolean }) {
  const nav = useNavigate();
  const v = useViewer();
  const [open, setOpen] = useState(false);
  const view = profileView(v.snap, v.me, user);
  const line = maskedLine(user, view);
  const city = maskedCity(user, view);
  const openProfile = () => nav(`/users/${user.id}`);

  return (
    <article className="rounded-[24px] border border-line bg-white overflow-hidden">
      {/* 1. 어떤 점이 비슷한지 — 사람보다 먼저 */}
      <div className="bg-[#F4F9FF] px-3.5 pt-3 pb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-ink-3 flex-1">{t('어떤 점이 비슷한지')}</span>
          <ClosenessTag c={closeness} />
        </div>
        <ReasonChips reasons={reasons} max={3} className="mt-1.5" />
        {!compact && reasons.length > 0 && (
          <button onClick={() => setOpen((x) => !x)} aria-expanded={open} className="mt-1.5 text-[11px] font-semibold text-primary flex items-center gap-0.5 press">
            {open ? t('접기') : t('이유 전부 보기')}<ChevronDown size={12} className={cn('transition-transform', open && 'rotate-180')} />
          </button>
        )}
        {open && <ReasonList reasons={reasons} max={8} className="mt-2 bg-white" />}
      </div>
      {/* 2. 사람 */}
      <div className="px-3.5 pt-3 flex items-center gap-3">
        <button onClick={openProfile} className="shrink-0 press" aria-label={user.nickname}><Avatar emoji={user.avatar.emoji} hue={user.avatar.hue} url={user.avatar.url} size={compact ? 44 : 52} /></button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <button onClick={openProfile} className="text-[15px] font-bold truncate text-left">{user.nickname}</button>
            <SchoolBadge user={user} withYear={view.gradYear} size="sm" className="min-w-0" />
          </div>
          {(line || city) && <div className="text-[12px] text-ink-2 truncate">{[line, city].filter(Boolean).join(' · ')}</div>}
          <StatusPill user={user} size="sm" className="mt-0.5" />
          {!view.full && view.reason && <PrivacyNote text={view.reason} className="mt-0.5" />}
        </div>
      </div>
      {/* 3. 행동 — 저장이 가장 가볍다 */}
      <div className="px-3.5 pt-2.5 pb-3 flex items-center gap-1.5">
        <Button size="sm" variant="outline" onClick={openProfile}>{t('프로필 보기')}</Button>
        <SaveButton user={user} />
        <span className="flex-1" />
        {onHide && <button onClick={onHide} aria-label={t('숨기기')} title={t('숨기기')} className="h-9 w-9 rounded-full grid place-items-center text-ink-3 hover:bg-surface-2 press"><EyeOff size={16} /></button>}
        <ConnectStatusButton user={user} />
      </div>
    </article>
  );
}
