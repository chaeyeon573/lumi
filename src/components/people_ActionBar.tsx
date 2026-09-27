import { useState } from 'react';
import { Bookmark, Check, Eye, Unlock, UserPlus } from 'lucide-react';
import { t } from '@core/i18n';
import type { ConnectionStatus, User } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { isPlus, swipesLeft } from '@core/lib/monetization';
import { connectionStatus } from '@core/lib/privacy';
import { cn } from '@core/lib/cn';
import { Button } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { PaywallSheet } from '@/components/social/PaywallSheet';

/**
 * 사람에 대한 세 가지 강도의 행동 — 보기 → 저장 → 나중에 연결.
 *   저장  : 가장 가벼움 · 나만 봄 · 상대에게 알리지 않음 (기본)
 *   관심  : 팔로우 · 새 글을 피드에서 봄
 *   연결  : 실제 관계 (요청 → 수락)
 * 연결 상태(connectionStatus)에 따라: 차단됨 → 차단 해제만 / 비공개·팔로우 가능 → 저장·관심만 / 그 외 → 저장·관심·연결
 */

export function useConnectionStatus(user: User): ConnectionStatus {
  const v = useViewer();
  return connectionStatus(v.snap, v.me, user);
}

/** 저장 토글 — 상대에게 알리지 않는다. 저장 해제 시 사용자 목록에서도 뺀다 */
export function useSavePerson(user: User) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const saved = !!v.me.savedPeople?.includes(user.id);
  const toggle = async () => {
    try {
      if (saved && (v.me.savedLists ?? []).some((l) => l.memberIds.includes(user.id))) await run(() => api.users.moveSaved(v.me.id, user.id, null));
      await run(() => api.users.toggleSavePerson(v.me.id, user.id), saved ? t('저장을 취소했어요') : t('저장했어요 · 상대에게 알리지 않아요'));
    } catch { /* toast by run */ }
  };
  return { saved, toggle };
}

/** 관심(팔로우) 토글 */
export function useFollow(user: User) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const following = v.isFollowing(user.id);
  const toggle = () => run(() => api.relationships.toggleFollow(v.me.id, user.id, 'user'), following ? t('관심 표시를 거뒀어요') : t('관심 표시했어요 · 새 글을 피드에서 볼 수 있어요')).catch(() => undefined);
  return { following, toggle };
}

/** 연결 요청 — 하루 한도(무료)는 API 가 강제, 한도면 페이월 */
function useConnect(user: User) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [busy, setBusy] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const connect = async () => {
    if (!isPlus(v.me) && swipesLeft(v.me) <= 0) { setPaywall(true); return; }
    setBusy(true);
    try { await run(() => api.relationships.sendFriendRequest(v.me.id, user.id), t('연결 요청을 보냈어요.')); }
    catch {
      const fresh = useAppStore.getState().users.find((x) => x.id === v.me.id) ?? v.me;
      if (!isPlus(fresh) && swipesLeft(fresh) <= 0) setPaywall(true);
    } finally { setBusy(false); }
  };
  return { busy, connect, paywall, closePaywall: () => setPaywall(false) };
}

/** 행(row)용 아이콘 저장 버튼 */
export function SaveButton({ user, className }: { user: User; className?: string }) {
  const { saved, toggle } = useSavePerson(user);
  return (
    <button type="button" onClick={toggle} aria-pressed={saved} aria-label={saved ? t('저장됨') : t('저장')}
      className={cn('h-9 w-9 shrink-0 rounded-full grid place-items-center press transition', saved ? 'bg-primary text-white' : 'bg-primary-soft text-primary', className)}>
      <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
    </button>
  );
}

/** 행(row)용 작은 연결 텍스트 버튼 — 연결할 수 없는 상태면 관심(팔로우)으로 */
export function ConnectTextButton({ user, className }: { user: User; className?: string }) {
  const status = useConnectionStatus(user);
  const { busy, connect, paywall, closePaywall } = useConnect(user);
  const { following, toggle } = useFollow(user);
  const base = 'h-7 px-1.5 text-[12px] font-bold whitespace-nowrap press disabled:pointer-events-none';
  if (status === 'blocked') return <span className={cn(base, 'text-ink-3 grid place-items-center', className)}>{t('차단됨')}</span>;
  if (status === 'can_follow' || status === 'private') {
    return <button type="button" onClick={toggle} className={cn(base, following ? 'text-ink-3' : 'text-verify', className)}>{following ? t('관심 표시함') : t('관심 표시')}</button>;
  }
  const off = status === 'connected' || status === 'requested';
  return (
    <>
      <button type="button" onClick={connect} disabled={off || busy} className={cn(base, off ? 'text-ink-3' : 'text-verify', className)}>
        {status === 'connected' ? t('연결됨') : status === 'requested' ? t('요청됨') : t('연결')}
      </button>
      <PaywallSheet open={paywall} onClose={closePaywall} reason="limit" />
    </>
  );
}

export function ActionBar({ user, size = 'md', layout = 'row', className }: { user: User; size?: 'sm' | 'md'; layout?: 'row' | 'stack'; className?: string }) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const status = useConnectionStatus(user);
  const { saved, toggle } = useSavePerson(user);
  const { following, toggle: follow } = useFollow(user);
  const { busy, connect, paywall, closePaywall } = useConnect(user);
  const inReq = v.pendingIn(user.id);
  const stack = layout === 'stack';
  const icon = size === 'sm' ? 14 : 16;
  const grow = cn(!stack && 'flex-1 min-w-0');

  const accept = () => inReq && run(() => api.relationships.respondFriendRequest(inReq.id, true), `${user.nickname}${t('님과 연결되었어요.')}`).catch(() => undefined);

  if (status === 'blocked') {
    const mine = v.hasBlocked(user.id);
    return (
      <div className={cn('flex gap-2', className)}>
        {mine
          ? <Button size={size} variant="outline" full icon={<Unlock size={icon} />} onClick={() => run(() => api.relationships.unblock(v.me.id, user.id), t('차단을 해제했어요.')).catch(() => undefined)}>{t('차단 해제')}</Button>
          : <Button size={size} variant="outline" full disabled>{t('차단됨')}</Button>}
      </div>
    );
  }
  const canConnect = status === 'can_request' || status === 'requested' || status === 'connected' || !!inReq;

  return (
    <div className={cn(stack ? 'flex flex-col gap-2' : 'flex gap-2', className)}>
      <Button size={size} variant={saved ? 'primary' : 'secondary'} className={cn(grow, !saved && '!bg-primary-soft')} full={stack}
        icon={<Bookmark size={icon} fill={saved ? 'currentColor' : 'none'} />} onClick={toggle} aria-pressed={saved}>
        {saved ? t('저장됨') : t('저장')}
      </Button>
      <Button size={size} variant={following ? 'secondary' : 'ghost'} className={cn(grow, !following && 'border border-line')} full={stack}
        icon={following ? <Check size={icon} /> : <Eye size={icon} />} onClick={follow} aria-pressed={following}>
        {following ? t('관심 표시함') : t('관심 표시')}
      </Button>
      {canConnect && (inReq && status !== 'connected' ? (
        <Button size={size} className={grow} full={stack} icon={<Check size={icon} />} onClick={accept}>{t('수락')}</Button>
      ) : (
        <Button size={size} variant={status === 'can_request' ? 'primary' : 'outline'} className={grow} full={stack}
          icon={status === 'connected' ? <Check size={icon} /> : <UserPlus size={icon} />} loading={busy} disabled={status !== 'can_request'} onClick={connect}>
          {status === 'connected' ? t('연결됨') : status === 'requested' ? t('요청됨') : t('연결')}
        </Button>
      ))}
      <PaywallSheet open={paywall} onClose={closePaywall} reason="limit" />
    </div>
  );
}
