import { t, lang } from '@core/i18n';
import { NavLink } from 'react-router-dom';
import { Home, User, Users, CalendarDays, MessageSquareText } from 'lucide-react';
import { cn } from '@core/lib/cn';

/** PRD 4절: Home | People | Meet | Feed | Profile. 가운데 + 버튼 없음 — 만들기는 Meet › + Create, Feed › 컴포저 */
const items = [
  { to: '/', label: lang === 'en' ? 'Home' : t('홈'), Icon: Home },
  { to: '/people', label: lang === 'en' ? 'People' : t('사람'), Icon: Users },
  { to: '/meet', label: lang === 'en' ? 'Meet' : t('모임'), Icon: CalendarDays },
  { to: '/feed', label: lang === 'en' ? 'Feed' : t('피드'), Icon: MessageSquareText },
  { to: '/profile', label: lang === 'en' ? 'Profile' : t('프로필'), Icon: User },
];

/** 마지막으로 본 사람 (People 카드) — 초대·제안 화면에서 기본값으로 사용 */
export const LAST_SEEN_KEY = 'aroundu.people.last';

export function BottomNav() {
  return (
    <nav className="shrink-0 bg-surface/95 backdrop-blur border-t border-line safe-bottom">
      <div className="grid grid-cols-5 h-[64px] items-center">
        {items.map((it) => <NavItem key={it.to} {...it} />)}
      </div>
    </nav>
  );
}

function NavItem({ to, label, Icon }: { to: string; label: string; Icon: typeof Users }) {
  return (
    <NavLink to={to} end={to === '/'} className={({ isActive }) => cn('flex flex-col items-center justify-center gap-1 h-full text-[11px] font-semibold', isActive ? 'text-primary' : 'text-ink-3')}>
      {({ isActive }) => (<><Icon size={24} strokeWidth={isActive ? 2.4 : 1.8} />{label}</>)}
    </NavLink>
  );
}
