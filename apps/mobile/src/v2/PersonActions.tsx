import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { Bookmark } from 'lucide-react-native';
import { t } from '@core/i18n';
import type { ConnectionStatus, User } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { isPlus, swipesLeft } from '@core/lib/monetization';
import { connectionStatus } from '@core/lib/privacy';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { C } from '@/ui';
import { PaywallSheet } from '@/components/PaywallSheet';

/**
 * 사람에 대한 세 가지 강도의 행동 — 보기 → 저장 → 나중에 연결 (웹 people_ActionBar).
 * 저장: 나만 봄 · 상대에게 알리지 않음 / 관심: 팔로우 / 연결: 요청 → 수락. 하루 한도(무료)는 API 가 강제, 한도면 페이월.
 */
export function useConnectionStatus(user: User): ConnectionStatus {
  const v = useViewer();
  return connectionStatus(v.snap, v.me, user);
}

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

export function useFollow(user: User) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const following = v.isFollowing(user.id);
  const toggle = () => run(() => api.relationships.toggleFollow(v.me.id, user.id, 'user'), following ? t('관심 표시를 거뒀어요') : t('관심 표시했어요 · 새 글을 피드에서 볼 수 있어요')).catch(() => undefined);
  return { following, toggle };
}

/** 연결 요청 — 성공 여부를 돌려준다. 한도면 페이월을 연다 */
export function useConnect() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [busy, setBusy] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const connect = async (user: User): Promise<boolean> => {
    if (v.isFriend(user.id) || v.pendingOut(user.id)) return true;
    if (!isPlus(v.me) && swipesLeft(v.me) <= 0) { setPaywall(true); return false; }
    setBusy(true);
    try { await run(() => api.relationships.sendFriendRequest(v.me.id, user.id), `${user.nickname}${t('님에게 연결 요청을 보냈어요.')}`); return true; }
    catch {
      const fresh = useAppStore.getState().users.find((x) => x.id === v.me.id) ?? v.me;
      if (!isPlus(fresh) && swipesLeft(fresh) <= 0) setPaywall(true);
      return false;
    } finally { setBusy(false); }
  };
  const sheet = <PaywallSheet open={paywall} onClose={() => setPaywall(false)} reason="limit" />;
  return { busy, connect, sheet };
}

/** 행(row)용 아이콘 저장 버튼 */
export function SaveButton({ user }: { user: User }) {
  const { saved, toggle } = useSavePerson(user);
  return (
    <Pressable onPress={toggle} accessibilityLabel={saved ? t('저장됨') : t('저장')} hitSlop={4} style={[tw`h-9 w-9 rounded-full items-center justify-center bg-primary-soft border`, { borderColor: saved ? C.primary : 'transparent' }]}>
      <Bookmark size={16} color={C.primary} fill={saved ? C.primary : 'none'} />
    </Pressable>
  );
}

/** 행(row)용 작은 연결 텍스트 버튼 — 연결할 수 없는 상태면 관심(팔로우)으로 */
export function ConnectTextButton({ user }: { user: User }) {
  const status = useConnectionStatus(user);
  const { busy, connect, sheet } = useConnect();
  const { following, toggle } = useFollow(user);
  if (status === 'blocked') return <Text style={tw`h-7 px-1.5 text-[12px] font-bold text-ink-3`}>{t('차단됨')}</Text>;
  if (status === 'can_follow' || status === 'private') {
    return <Pressable onPress={toggle} style={tw`h-7 px-1.5 justify-center`}><Text style={tw`text-[12px] font-bold ${following ? 'text-ink-3' : 'text-verify'}`}>{following ? t('관심 표시함') : t('관심 표시')}</Text></Pressable>;
  }
  const off = status === 'connected' || status === 'requested';
  return (
    <>
      <Pressable onPress={() => connect(user)} disabled={off || busy} style={tw`h-7 px-1.5 justify-center`}>
        <Text style={tw`text-[12px] font-bold ${off ? 'text-ink-3' : 'text-verify'}`}>{busy ? '…' : status === 'connected' ? t('연결됨') : status === 'requested' ? t('요청됨') : t('연결')}</Text>
      </Pressable>
      {sheet}
    </>
  );
}
