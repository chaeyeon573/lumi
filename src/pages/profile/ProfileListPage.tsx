import { useNavigate, useParams } from 'react-router-dom';
import { t } from '@core/i18n';
import { Star } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, EmptyState, VerifiedBadge } from '@/components/ui';
import { affiliationText } from '@/components/cards/PersonCard';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { friendsOf, followersOf, followingOf } from '@core/lib/relations';

const TITLES: Record<string, string> = { friends: t('친구'), followers: t('팔로워'), following: t('팔로잉'), likes: t('관심 목록') };

export function ProfileListPage() {
  const { list = 'friends' } = useParams();
  const nav = useNavigate();
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const me = v.me;
  const ids = list === 'friends' ? friendsOf(v.snap, me.id) : list === 'followers' ? followersOf(v.snap, me.id) : list === 'following' ? followingOf(v.snap, me.id) : v.snap.relationships.likes.filter((l) => l.fromId === me.id).map((l) => l.toId);
  return (
    <div className="min-h-full">
      <TopBar back title={TITLES[list] ?? t('목록')} />
      {list === 'likes' && <p className="px-4 pt-3 text-[12px] text-ink-3 flex items-center gap-1"><Star size={12} className="text-primary" />{t('관심은 상대에게 보이지 않아요. 서로 관심이 있으면 메시지를 보낼 수 있어요.')}</p>}
      <div className="px-4 py-3">
        {ids.length === 0 ? <EmptyState emoji="🙋" title={t('아직 아무도 없어요')} /> : (
          <div className="card divide-y divide-line">
            {ids.map((id) => {
              const u = v.userById(id); const o = orgs.find((x) => x.id === id);
              if (o) return <button key={id} onClick={() => nav(`/orgs/${id}`)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left press"><Avatar emoji={o.logo.emoji} hue={o.logo.hue} url={o.logo.url} size={40} className="!rounded-xl" /><div className="flex-1"><b className="text-[14px]">{o.name}</b><div className="text-[12px] text-ink-3">{t('조직')}</div></div></button>;
              if (!u) return null;
              return <button key={id} onClick={() => nav(`/users/${id}`)} className="w-full flex items-center gap-3 px-3.5 py-3 text-left press"><Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={40} /><div className="flex-1 min-w-0"><b className="text-[14px] flex items-center gap-1">{u.nickname}{u.affiliation.type === 'university' && u.affiliation.emailVerified && <VerifiedBadge />}</b><div className="text-[12px] text-ink-3 truncate">{affiliationText(u)}</div></div>{list === 'likes' && v.isMutual(id) && <span className="text-[11px] font-bold text-primary">{t('서로 관심')}</span>}</button>;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
