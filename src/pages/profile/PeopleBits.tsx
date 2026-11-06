import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import type { ID, User } from '@core/types';
import { Btn, PersonCard, cardCls } from '@/components/ha';
import { useViewer } from '@/hooks/useViewer';
import { en, majorYear } from './shared';

/** 사람 카드 하나 (PDF S075 · S077) — 오른쪽 버튼은 지금 관계에서 할 수 있는 것 하나만. footer: 카드 아래 칸 (S077 폴더·메모) */
export function PersonRow({ user, action, footer }: { user: User; action: 'message' | 'friend'; footer?: ReactNode }) {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [busy, setBusy] = useState(false);
  const message = async () => {
    setBusy(true);
    try { const r = await run(() => api.chats.openDirect(v.me.id, user.id)); nav(`/chats/${r.room.id}`); } catch { setBusy(false); }
  };
  const addFriend = async () => {
    setBusy(true);
    try { await run(() => api.relationships.sendFriendRequest(v.me.id, user.id), en ? 'Friend request sent' : '친구 요청을 보냈어요'); } finally { setBusy(false); }
  };
  const canMsg = v.canMessage(user.id).ok;
  const btn = (label: string, onClick?: () => void, disabled?: boolean) => <Btn size="sm" variant="outline" loading={busy} disabled={disabled} onClick={onClick}>{label}</Btn>;
  let right = null;
  if (action === 'message' && canMsg) right = btn(en ? 'Message' : '메시지', message);
  else if (action === 'friend') {
    if (v.isFriend(user.id)) right = canMsg ? btn(en ? 'Message' : '메시지', message) : null;
    else if (v.pendingOut(user.id)) right = btn(en ? 'Requested' : '요청함', undefined, true);
    else if (!v.pendingIn(user.id)) right = btn(en ? 'Add Friend' : '친구 추가', addFriend);
  }
  const bio = v.canSeeField(user, 'bio') ? user.bio : undefined;
  const card = <PersonCard avatar={user.avatar} name={user.nickname} meta={user.sample ? `${en ? 'Sample' : '예시'} · ${majorYear(user)}` : majorYear(user)} bio={bio} action={right} onClick={() => nav(`/users/${user.id}`)}
    className={footer ? '!border-0 !rounded-none !bg-transparent' : undefined} />;
  if (!footer) return card;
  return <div className={cardCls}>{card}<div className="px-4 pb-3.5 -mt-1">{footer}</div></div>;
}

/** 이름·전공으로 찾기 */
export const matches = (u: User, q: string) => {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const a = u.affiliation.type === 'university' ? u.affiliation.department ?? '' : '';
  return u.nickname.toLowerCase().includes(s) || a.toLowerCase().includes(s);
};

export const usersOf = (ids: ID[], byId: (id: ID) => User | undefined) => ids.map(byId).filter((u): u is User => !!u);
