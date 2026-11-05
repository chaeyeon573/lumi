import type { ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, Compass, CalendarDays, Home, MessageCircle, MoreHorizontal, Search, Settings, User, Users } from 'lucide-react';
import { lang } from '@core/i18n';
import { cn } from '@core/lib/cn';
import { useUnreadCounts } from '@/components/layout/TopBar';

const en = lang === 'en';

/* ─────────────────────────── Bottom tab bar (PDF: every tab root) ─────────────────────────── */

/**
 * 아래 탭 5개 — Home · Explore · Schedule · Social · Profile (PDF S012 등).
 * `also` 는 그 탭이 맡는 하위 주소 — 하위 화면은 탭 바 없이 열리지만, 탭 바가 보이는 화면에서 어느 탭이 켜질지 정한다.
 */
export const TABS = [
  { to: '/', label: en ? 'Home' : '홈', Icon: Home, also: ['/recreation', '/dining'] },
  { to: '/explore', label: en ? 'Explore' : '탐색', Icon: Compass, also: ['/explore'] },
  { to: '/schedule', label: en ? 'Schedule' : '일정', Icon: CalendarDays, also: ['/schedule'] },
  { to: '/social', label: en ? 'Social' : '소셜', Icon: Users, also: ['/social'] },
  { to: '/profile', label: en ? 'Profile' : '프로필', Icon: User, also: ['/profile'] },
] as const;

export function activeTab(pathname: string): string {
  const under = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  for (const t of TABS) if (t.to === '/' ? pathname === '/' || t.also.some(under) : t.also.some(under)) return t.to;
  return '';
}

export function TabBar() {
  const { pathname } = useLocation();
  const on = activeTab(pathname);
  return (
    <nav aria-label={en ? 'Main' : '메인'} className="shrink-0 bg-bg/95 backdrop-blur border-t border-line safe-bottom">
      <div className="grid grid-cols-5 h-[64px] items-center">
        {TABS.map((t) => {
          const active = on === t.to;
          return (
            <NavLink key={t.to} to={t.to} end={t.to === '/'} aria-current={active ? 'page' : undefined}
              className={cn('flex flex-col items-center justify-center gap-1 h-full text-[11px] font-semibold', active ? 'text-sel-fg' : 'text-ink-3')}>
              <t.Icon size={23} strokeWidth={active ? 2.3 : 1.8} />
              {t.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

/* ─────────────────────────── Headers ─────────────────────────── */

/** Lumi 글자 로고 — PDF 처럼 "Lumi" (Welcome 에서는 dot) */
export function Wordmark({ size = 24, dot = false, className }: { size?: number; dot?: boolean; className?: string }) {
  return (
    <span className={cn('font-display font-extrabold tracking-[-0.03em] text-ink leading-none relative inline-block', className)} style={{ fontSize: size }}>
      Lumi{dot && <span className="absolute rounded-full bg-sel" style={{ width: size * 0.16, height: size * 0.16, right: -size * 0.22, top: size * 0.02 }} />}
    </span>
  );
}

type ActionKey = 'search' | 'bell' | 'messages' | 'settings';
export type HeaderAction = ActionKey | { key: string; label: string; icon: ReactNode; onClick: () => void; badge?: number };

/** 오른쪽 아이콘 줄 — search · bell · messages · settings 는 정해진 곳으로 간다 */
function Actions({ actions }: { actions: HeaderAction[] }) {
  const nav = useNavigate();
  const counts = useUnreadCounts();
  const preset: Record<ActionKey, { label: string; icon: ReactNode; onClick: () => void; badge?: number }> = {
    search: { label: en ? 'Search' : '검색', icon: <Search size={22} />, onClick: () => nav('/search') },
    bell: { label: en ? 'Notifications' : '알림', icon: <Bell size={22} />, onClick: () => nav('/notifications'), badge: counts.bell },
    messages: { label: en ? 'Messages' : '메시지', icon: <MessageCircle size={22} />, onClick: () => nav('/chats'), badge: counts.chats },
    settings: { label: en ? 'Settings' : '설정', icon: <Settings size={22} />, onClick: () => nav('/settings') },
  };
  return (
    <div className="flex items-center -mr-2">
      {actions.map((a) => {
        const x = typeof a === 'string' ? { key: a, ...preset[a] } : a;
        return <HeaderIcon key={x.key} label={x.label} onClick={x.onClick} badge={x.badge}>{x.icon}</HeaderIcon>;
      })}
    </div>
  );
}

export function HeaderIcon({ label, onClick, badge, children }: { label: string; onClick: () => void; badge?: number; children: ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} className="relative h-10 w-10 rounded-full grid place-items-center text-ink press">
      {children}
      {badge ? <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-sel ring-2 ring-bg" /> : null}
    </button>
  );
}

/**
 * 탭 첫 화면 머리 (PDF S012·S037·S071): 왼쪽 "Lumi", 오른쪽 아이콘.
 * title 을 주면 그 아래에 큰 제목(Social 처럼)이 온다.
 */
export function BrandHeader({ actions = ['search', 'bell', 'messages'], title, children }: { actions?: HeaderAction[]; title?: string; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur-xl px-4">
      <div className="h-14 flex items-center gap-2"><Wordmark size={24} /><span className="flex-1" /><Actions actions={actions} /></div>
      {title && <h1 className="ha-title pt-2 pb-1">{title}</h1>}
      {children}
    </header>
  );
}

/**
 * 큰 제목이 곧 머리인 탭 첫 화면 (PDF S017 Explore · S027 Schedule): 왼쪽 큰 제목, 오른쪽 아이콘.
 * children 에는 보통 밑줄 탭(SegTabs)을 넣는다 — 같이 위에 붙는다.
 */
export function TitleHeader({ title, actions = ['search', 'bell', 'messages'], children }: { title: string; actions?: HeaderAction[]; children?: ReactNode }) {
  return (
    <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur-xl px-4">
      <div className="h-16 flex items-center gap-2"><h1 className="ha-title flex-1 min-w-0 truncate">{title}</h1><Actions actions={actions} /></div>
      {children}
    </header>
  );
}

/**
 * 하위 화면 머리 (PDF S015 등): "‹  Title  ···". title 없이 ‹ 와 ··· 만 둘 수도 있다 (S020 상세).
 * onMore 가 없으면 ··· 를 그리지 않는다 — 누를 게 없는 점 세 개는 두지 않는다.
 */
export function BackHeader({ title, onBack, onMore, right }: { title?: string; onBack?: () => void; onMore?: () => void; right?: ReactNode }) {
  const nav = useNavigate();
  const back = onBack ?? (() => (window.history.length > 1 ? nav(-1) : nav('/')));
  return (
    <header className="sticky top-0 z-30 bg-bg/90 backdrop-blur-xl h-14 px-2 flex items-center gap-1">
      <button onClick={back} aria-label={en ? 'Back' : '뒤로'} className="h-10 w-10 rounded-full grid place-items-center text-ink press"><ChevronLeft size={24} /></button>
      <div className="flex-1 min-w-0 truncate text-[17px] font-bold tracking-[-0.01em]">{title}</div>
      {right}
      {onMore && <button onClick={onMore} aria-label={en ? 'More' : '더 보기'} className="h-10 w-10 rounded-full grid place-items-center text-ink press"><MoreHorizontal size={22} /></button>}
    </header>
  );
}

/** 하위 화면의 큰 제목 + 한 줄 설명 (PDF: 머리 아래 "Recreation" / "Your university · Recreation") */
export function PageTitle({ title, sub, className }: { title: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={cn('px-4 pt-2 pb-4', className)}>
      <h1 className="ha-title">{title}</h1>
      {sub && <p className="text-[15px] text-ink-2 mt-2 leading-snug">{sub}</p>}
    </div>
  );
}

/** 온보딩 머리 (PDF S003): "‹  Lumi · 1 of 6            Skip" */
export function OnboardingHeader({ step, total, onBack, onSkip }: { step: number; total: number; onBack?: () => void; onSkip?: () => void }) {
  return (
    <header className="h-14 px-2 flex items-center gap-1">
      {onBack ? <button onClick={onBack} aria-label={en ? 'Back' : '뒤로'} className="h-10 w-10 rounded-full grid place-items-center text-ink press"><ChevronLeft size={24} /></button> : <span className="w-10" />}
      <span className="flex-1 text-[13px] text-ink-3 font-medium">Lumi · {en ? `${step} of ${total}` : `${step}/${total}`}</span>
      {onSkip && <button onClick={onSkip} className="h-10 px-3 text-[14px] font-semibold text-sel-fg press">{en ? 'Skip' : '건너뛰기'}</button>}
    </header>
  );
}

/** 탭 바가 있는 화면의 바탕 — 위 머리 + 내용 (아래 여백은 탭 바 위로) */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('min-h-full bg-bg pb-8', className)}>{children}</div>;
}
