import { useNavigate } from 'react-router-dom';
import { Bell, MessageCircle, Search, User } from 'lucide-react';
import { t } from '@core/i18n';
import { useUnreadCounts } from '@/components/layout/TopBar';
import { useViewer } from '@/hooks/useViewer';
import { Avatar } from '@/components/ui';

/** 루트 탭 공통 헤더 — 워드마크 + 검색·알림·메시지·프로필 */
export function AppHeader({ search, right }: { search?: boolean; right?: React.ReactNode }) {
  const nav = useNavigate();
  const counts = useUnreadCounts();
  const v = useViewer();
  const Btn = ({ onClick, badge, label, children }: { onClick: () => void; badge?: number; label: string; children: React.ReactNode }) => (
    <button onClick={onClick} aria-label={label} className="relative h-10 w-10 rounded-full grid place-items-center text-ink-2 press">{children}{badge ? <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-danger" /> : null}</button>
  );
  return (
    <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur-xl h-16 pl-4 pr-3 flex items-center gap-1.5">
      <span className="font-display text-[22px] font-extrabold tracking-tight text-primary shrink-0">Heetz</span>
      <span className="flex-1" />
      {right}
      {search && <Btn onClick={() => nav('/search?tab=people')} label={t('검색')}><Search size={22} /></Btn>}
      <Btn onClick={() => nav('/notifications')} badge={counts.bell} label={t('알림')}><Bell size={22} /></Btn>
      <Btn onClick={() => nav('/chats')} badge={counts.chats} label={t('메시지')}><MessageCircle size={22} /></Btn>
      <button onClick={() => nav('/profile')} aria-label={t('프로필')} className="ml-1 shrink-0">{v.me.avatar.url ? <Avatar emoji={v.me.avatar.emoji} hue={v.me.avatar.hue} url={v.me.avatar.url} size={32} /> : <span className="h-8 w-8 rounded-full bg-primary text-white grid place-items-center"><User size={17} /></span>}</button>
    </header>
  );
}
