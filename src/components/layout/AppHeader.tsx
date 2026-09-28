import { useNavigate } from 'react-router-dom';
import { Bell, MessageCircle, Search, GraduationCap, BadgeCheck, User } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { schoolBadge, isVerified } from '@core/lib/network';
import { useUnreadCounts } from '@/components/layout/TopBar';
import { useViewer } from '@/hooks/useViewer';
import { Avatar } from '@/components/ui';

/**
 * 루트 탭 공통 헤더 — 워드마크 + 학교 알약("연세대학교 ✓" → /profile) + 검색·알림·메시지·프로필.
 * 컴팩트하게 유지: 상태 한 줄(contextLine)은 홈이 그린다.
 */
export function AppHeader({ search, right }: { search?: boolean; right?: React.ReactNode }) {
  const nav = useNavigate();
  const counts = useUnreadCounts();
  const v = useViewer();
  const hasSchool = v.me.affiliation.type === 'university';
  const school = hasSchool ? schoolBadge(v.me, lang) : t('학교 선택');
  const verified = hasSchool && isVerified(v.me);
  const Btn = ({ onClick, badge, label, children }: { onClick: () => void; badge?: number; label: string; children: React.ReactNode }) => (
    <button onClick={onClick} aria-label={label} className="relative h-10 w-10 rounded-full grid place-items-center text-ink-2 press">{children}{badge ? <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-danger" /> : null}</button>
  );
  return (
    <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur-xl h-16 pl-4 pr-3 flex items-center gap-1.5">
      <span className="font-display text-[22px] font-extrabold tracking-tight text-brand shrink-0">AroundU</span>
      <button onClick={() => nav('/profile')} aria-label={t('내 학교')} title={school} className="flex items-center gap-1 h-8 pl-2 pr-2.5 rounded-full bg-accent-soft text-ink-2 text-[12px] font-semibold max-w-[128px]">
        <GraduationCap size={13} className="shrink-0" /><span className="truncate">{school}</span>{verified && <BadgeCheck size={13} className="shrink-0 text-verify" aria-label={t('학교 인증')} />}
      </button>
      <span className="flex-1" />
      {right}
      {search && <Btn onClick={() => nav('/search?tab=people')} label={t('검색')}><Search size={22} /></Btn>}
      <Btn onClick={() => nav('/notifications')} badge={counts.bell} label={t('알림')}><Bell size={22} /></Btn>
      <Btn onClick={() => nav('/chats')} badge={counts.chats} label={t('메시지')}><MessageCircle size={22} /></Btn>
      <button onClick={() => nav('/profile')} aria-label={t('프로필')} className="ml-1 shrink-0">{v.me.avatar.url ? <Avatar emoji={v.me.avatar.emoji} hue={v.me.avatar.hue} url={v.me.avatar.url} size={32} /> : <span className="h-8 w-8 rounded-full bg-primary text-white grid place-items-center"><User size={17} /></span>}</button>
    </header>
  );
}
