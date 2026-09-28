import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { t } from '@core/i18n';
import type { User } from '@core/types';
import { mutualPeople } from '@core/lib/prompts-fun';
import { mutualFriends } from '@core/lib/relations';
import { canShowInPath } from '@core/lib/privacy';
import { Avatar } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { cn } from '@core/lib/cn';
import { fmt } from './people_Network';

/** 서로 아는 사람 — 경로 공개를 끈 사람은 이름 없이 숫자에만 들어간다 */
export function useMutualPeople(user: User | undefined): { shown: User[]; total: number } {
  const v = useViewer();
  return useMemo(() => {
    if (!user) return { shown: [], total: 0 };
    return { shown: mutualPeople(v.snap, v.me.id, user.id, canShowInPath), total: mutualFriends(v.snap, v.me.id, user.id).length };
  }, [v.snap, v.me.id, user]);
}

/** 겹친 아바타 (최대 3) */
export function AvatarStack({ people, size = 22, className }: { people: User[]; size?: number; className?: string }) {
  if (people.length === 0) return null;
  return (
    <span className={cn('flex shrink-0', className)} style={{ marginRight: 2 }}>
      {people.slice(0, 3).map((m, i) => (
        <span key={m.id} className="rounded-full ring-2 ring-card bg-card" style={{ marginLeft: i === 0 ? 0 : -size * 0.35, zIndex: 3 - i }}>
          <Avatar emoji={m.avatar.emoji} hue={m.avatar.hue} url={m.avatar.url} size={size} />
        </span>
      ))}
    </span>
  );
}

/** "서로 아는 사람 N명 · 지민, 민준" — 겹친 아바타와 함께. 아무도 없으면 그리지 않는다 */
export function mutualText(shown: User[], total: number): string {
  const names = shown.slice(0, 2).map((u) => u.nickname).join(', ');
  return `${fmt(t('서로 아는 사람 {n}명'), { n: total })}${names ? ` · ${names}` : ''}`;
}

export function MutualLine({ user, size = 'sm', onClick, className }: { user: User; size?: 'sm' | 'md'; onClick?: () => void; className?: string }) {
  const { shown, total } = useMutualPeople(user);
  if (total === 0) return null;
  const body = (
    <>
      <AvatarStack people={shown} size={size === 'md' ? 26 : 20} />
      <span className={cn('min-w-0 truncate font-semibold text-verify', size === 'md' ? 'text-[13px]' : 'text-[12px]')}>{mutualText(shown, total)}</span>
      {onClick && <ChevronRight size={size === 'md' ? 16 : 14} className="text-ink-3 shrink-0" />}
    </>
  );
  if (!onClick) return <div className={cn('flex items-center gap-1.5 min-w-0', className)}>{body}</div>;
  return <button type="button" onClick={onClick} className={cn('flex items-center gap-1.5 min-w-0 text-left press', className)}>{body}</button>;
}
