import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Eye, Lock, UserPlus } from 'lucide-react';
import { t, lang } from '@core/i18n';
import type { User } from '@core/types';
import type { Snapshot } from '@core/api/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { degreesFrom } from '@core/lib/graph';
import { mutualFriends } from '@core/lib/relations';
import { connectionStatus, type ProfileView } from '@core/lib/privacy';
import { personLine, majorOf, cityOf } from '@core/lib/network';
import { isPlus, swipesLeft } from '@core/lib/monetization';
import { cn } from '@core/lib/cn';
import { Button, shellEl } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { PaywallSheet } from '@/components/social/PaywallSheet';

/**
 * 사람 탭 공통 — "얼마나 가까운가"(촌수 · 공통 연결) · 공개 범위를 지킨 한 줄 · 연결 상태 버튼 · 숨기기 되돌리기.
 * 원칙: 사람을 보여줄 때 이유와 거리 → 경로 → 이름·프로필 순서.
 */

/** 문장 템플릿 — t('{name}님에게 물어봤어요') 처럼 영어 어순이 다른 문장에 */
export const fmt = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));

export interface Closeness { degree?: number; mutual: number }

/** 나로부터 모든 사람까지의 촌수 + 공통 연결 수 (렌더마다 BFS 한 번) */
export function useCloseness(snap: Snapshot, meId: string) {
  return useMemo(() => {
    const deg = degreesFrom(snap, meId, 3);
    return (id: string): Closeness => ({ degree: deg.get(id), mutual: mutualFriends(snap, meId, id).length });
  }, [snap, meId]);
}

/** "2촌 · 공통 연결 2명" / "1촌 · 연결됨" / "새로운 사람" */
export function closenessText(c: Closeness): string {
  const parts: string[] = [];
  if (c.degree === 1) parts.push(t('1촌'));
  else if (c.degree === 2) parts.push(t('2촌'));
  else if (c.degree === 3) parts.push(t('3촌'));
  if (c.mutual > 0) parts.push(fmt(t('공통 연결 {n}명'), { n: c.mutual }));
  return parts.length ? parts.join(' · ') : t('새로운 사람');
}

export function ClosenessTag({ c, className }: { c: Closeness; className?: string }) {
  return <span className={cn('h-6 px-2.5 rounded-full bg-white border border-[var(--tint)] text-primary text-[11px] font-bold inline-flex items-center whitespace-nowrap', className)}>{closenessText(c)}</span>;
}

/** 공개 범위를 지킨 한 줄 — 회사·졸업연도를 가린 경우 전공/직무만 */
export function maskedLine(u: User, view: ProfileView): string {
  if (view.company && view.gradYear) return personLine(u, lang);
  const role = u.career?.role ?? (u.affiliation.type === 'company' ? u.affiliation.jobTitle : undefined);
  const company = view.company ? (u.career?.company ?? (u.affiliation.type === 'company' ? u.affiliation.companyName : undefined)) : undefined;
  return [role, company, majorOf(u)].filter(Boolean).slice(0, 2).join(' · ');
}
export const maskedCity = (u: User, view: ProfileView) => (view.city ? cityOf(u) ?? '' : '');

/**
 * 연결 상태에 맞는 버튼 — 연결 요청 가능: [연결] · 요청 보냄 · 연결됨 · 팔로우 가능: [관심 표시] · 비공개/차단: 비활성.
 * 무료 하루 한도는 API 가 강제하고, 한도면 페이월(reason 'limit').
 */
export function ConnectStatusButton({ user, size = 'sm', className }: { user: User; size?: 'sm' | 'md'; className?: string }) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const status = connectionStatus(v.snap, v.me, user);
  const incoming = v.pendingIn(user.id);
  const following = v.isFollowing(user.id);
  const [busy, setBusy] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const icon = size === 'sm' ? 14 : 16;

  const connect = async () => {
    if (!isPlus(v.me) && swipesLeft(v.me) <= 0) { setPaywall(true); return; }
    setBusy(true);
    try { await run(() => api.relationships.sendFriendRequest(v.me.id, user.id), `${user.nickname}${t('님에게 연결 요청을 보냈어요.')}`); }
    catch { const fresh = useAppStore.getState().users.find((x) => x.id === v.me.id) ?? v.me; if (!isPlus(fresh) && swipesLeft(fresh) <= 0) setPaywall(true); }
    finally { setBusy(false); }
  };
  const accept = async () => { if (!incoming) return; setBusy(true); try { await run(() => api.relationships.respondFriendRequest(incoming.id, true), `${user.nickname}${t('님과 연결되었어요.')}`); } catch { /* toast */ } finally { setBusy(false); } };
  const follow = async () => { setBusy(true); try { await run(() => api.relationships.toggleFollow(v.me.id, user.id, 'user'), following ? t('관심 표시를 거뒀어요') : t('관심 표시했어요 · 새 글을 피드에서 볼 수 있어요')); } catch { /* toast */ } finally { setBusy(false); } };

  let el: React.ReactNode;
  if (status === 'connected') el = <Button size={size} variant="outline" disabled icon={<Check size={icon} />} className={className}>{t('연결됨')}</Button>;
  else if (incoming && status !== 'blocked') el = <Button size={size} loading={busy} icon={<Check size={icon} />} onClick={accept} className={className}>{t('수락')}</Button>;
  else if (status === 'requested') el = <Button size={size} variant="outline" disabled className={className}>{t('요청 보냄')}</Button>;
  else if (status === 'can_request') el = <Button size={size} loading={busy} icon={<UserPlus size={icon} />} onClick={connect} className={className}>{t('연결')}</Button>;
  else if (status === 'can_follow') el = <Button size={size} variant={following ? 'secondary' : 'outline'} loading={busy} icon={following ? <Check size={icon} /> : <Eye size={icon} />} onClick={follow} className={className} title={t('자세한 프로필이 공개되지 않아 관심 표시만 할 수 있어요')}>{following ? t('관심 표시함') : t('관심 표시')}</Button>;
  else el = <Button size={size} variant="ghost" disabled icon={<Lock size={icon} />} className={className}>{status === 'blocked' ? t('차단됨') : t('비공개')}</Button>;
  return <>{el}<PaywallSheet open={paywall} onClose={() => setPaywall(false)} reason="limit" /></>;
}

/** 숨기기 + 되돌리기 — 숨기면 5초 동안 아래에 [되돌리기]가 뜬다 */
export function useHideWithUndo() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [undo, setUndo] = useState<{ user: User; key: number } | null>(null);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  const hide = async (user: User) => {
    try { await run(() => api.users.hide(v.me.id, 'person', user.id)); } catch { return; }
    if (timer.current) window.clearTimeout(timer.current);
    const key = Date.now();
    setUndo({ user, key });
    timer.current = window.setTimeout(() => setUndo((u) => (u?.key === key ? null : u)), 5000);
  };
  const restore = async () => {
    if (!undo) return;
    const u = undo.user; setUndo(null);
    try { await run(() => api.users.hide(v.me.id, 'person', u.id, true), t('다시 보이게 했어요')); } catch { /* toast */ }
  };
  const bar = undo ? createPortal(
    <div key={undo.key} role="status" style={{ transform: 'translateX(-50%)' }} className="absolute left-1/2 bottom-24 z-[1200] h-11 pl-4 pr-1.5 rounded-full bg-ink text-white text-[13px] font-semibold shadow-lg animate-toast-in flex items-center gap-3 max-w-[90%]">
      <span className="truncate">{fmt(t('{name}님을 숨겼어요 · 상대는 몰라요'), { name: undo.user.nickname })}</span>
      <button onClick={restore} className="h-8 px-3 rounded-full bg-white/15 text-[var(--tint)] font-bold shrink-0 press">{t('되돌리기')}</button>
    </div>, shellEl()) : null;
  return { hide, bar };
}
