/**
 * 사람 탭 공통 (웹 people_Network + around_PersonCard + NaturalSearchPage MaskedPersonRow 의 모바일판).
 * 원칙: 사람을 보여줄 때 이유와 거리 → 경로 → 이름·프로필 순서. 공개 범위는 core `profileView` / `connectionStatus` 로만 가린다.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ArrowRight, Check, ChevronDown, Eye, Lock, MapPin, UserPlus } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import type { Snapshot } from '@core/api/types';
import type { User } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { profileView, connectionStatus, canShowInPath, CONNECTION_LABELS, type ProfileView } from '@core/lib/privacy';
import { mutualFriends, commonInterests } from '@core/lib/relations';
import { degreeOf, pathBetween } from '@core/lib/graph';
import { degreeLabel } from '@core/lib/requests';
import { cityOf, gradYearOf, isAlumniStage, majorOf, networkLabel, personLine, shortSchool, yy } from '@core/lib/network';
import { INTEREST_LABELS } from '@core/lib/labels';
import { isPlus, swipesLeft } from '@core/lib/monetization';
import type { Reason } from '@core/lib/recommend';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { Avatar, Button, Tag, C } from '@/ui';
import { PaywallSheet } from '@/components/PaywallSheet';
import { PersonRow } from './PersonRow';
import { SchoolBadge } from './SchoolBadge';
import { SaveButton, ConnectTextButton } from './PersonActions';
import { PrivacyNote } from './SectionState';
import { closenessText, fmt, type Closeness } from './personView';

export function ClosenessTag({ c }: { c: Closeness }) {
  return <View style={tw`h-6 px-2.5 rounded-full bg-white border border-primary-soft justify-center`}><Text numberOfLines={1} style={tw`text-[11px] font-bold text-primary`}>{closenessText(c)}</Text></View>;
}

/** 카드 맨 위 — 이유/거리 알약 */
export function DegreePill({ text, solid }: { text: string; solid?: boolean }) {
  return <View style={tw`h-6 px-2.5 mr-1.5 rounded-full justify-center ${solid ? 'bg-primary' : 'bg-accent-soft'}`}><Text numberOfLines={1} style={tw`text-[11px] font-bold ${solid ? 'text-white' : 'text-primary'}`}>{text}</Text></View>;
}

/** "2촌 · 서로 아는 사람 1명" — 서로 아는 사람은 경로 노출을 허용한 사람만 센다 */
export function degreeLine(snap: Snapshot, me: User, u: User, degree?: number): string {
  if (degree === 1) return t('1촌 · 연결됨');
  if (degree === 2) {
    const n = mutualFriends(snap, me.id, u.id).map((id) => snap.users.find((x) => x.id === id)).filter((x): x is User => !!x && canShowInPath(x)).length;
    if (!n) return t('2촌');
    return lang === 'en' ? `2nd · ${n} mutual` : `2촌 · 서로 아는 사람 ${n}명`;
  }
  if (degree === 3) return t('3촌 · 건너건너 아는 사람');
  return t('새로운 사람');
}

/** 공개 범위를 지킨 한 줄 — 자세히 볼 수 없으면 학교만, 회사·졸업연도는 허용된 경우에만 */
export function maskedLine(u: User, view: ProfileView): string {
  if (!view.full) return u.affiliation.type === 'university' ? networkLabel(u, lang) : '';
  if (view.company && view.gradYear) return personLine(u, lang);
  if (u.affiliation.type === 'company') return view.company ? [u.affiliation.companyName, u.affiliation.jobTitle].filter(Boolean).join(' · ') : (u.affiliation.jobTitle ?? '');
  const short = shortSchool(u.affiliation.schoolName);
  if (isAlumniStage(u)) {
    const year = view.gradYear ? yy(gradYearOf(u)) : '';
    const job = [u.career?.role, view.company ? u.career?.company : undefined].filter(Boolean).join(' @ ') || majorOf(u);
    return `${short} ${year}${job ? ` · ${job}` : ''}`.replace(/\s+/g, ' ').trim();
  }
  const major = u.affiliation.showDepartment ? majorOf(u) : '';
  return `${networkLabel(u, lang)}${major ? ` · ${major}` : ''}`;
}

/**
 * 연결 상태에 맞는 버튼 — [연결] · 요청 보냄 · 연결됨 · [수락] · [관심 표시] · 비공개/차단은 비활성.
 * 무료 하루 한도는 API 가 강제하고, 한도면 페이월(reason 'limit').
 */
export function ConnectStatusButton({ user, size = 'sm' }: { user: User; size?: 'sm' | 'md' }) {
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

  let el: ReactNode;
  if (status === 'connected') el = <Button size={size} variant="outline" disabled icon={<Check size={icon} color={C.ink2} />}>{t('연결됨')}</Button>;
  else if (incoming && status !== 'blocked') el = <Button size={size} loading={busy} icon={<Check size={icon} color={C.onPrimary} />} onPress={accept}>{t('수락')}</Button>;
  else if (status === 'requested') el = <Button size={size} variant="outline" disabled>{t('요청 보냄')}</Button>;
  else if (status === 'can_request') el = <Button size={size} loading={busy} icon={<UserPlus size={icon} color={C.onPrimary} />} onPress={connect}>{t('연결')}</Button>;
  else if (status === 'can_follow') el = <Button size={size} variant={following ? 'secondary' : 'outline'} loading={busy} icon={following ? <Check size={icon} color={C.primary} /> : <Eye size={icon} color={C.ink2} />} onPress={follow}>{following ? t('관심 표시함') : t('관심 표시')}</Button>;
  else el = <Button size={size} variant="outline" disabled icon={<Lock size={icon} color={C.ink3} />}>{status === 'blocked' ? t('차단됨') : t('비공개')}</Button>;
  return <>{el}<PaywallSheet open={paywall} onClose={() => setPaywall(false)} reason="limit" /></>;
}

/** 숨기기 + 5초 되돌리기 — 숨기면 아래에 [되돌리기]가 뜬다 (웹 useHideWithUndo) */
export function useHideWithUndo() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [undo, setUndo] = useState<{ user: User; key: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const hide = async (user: User) => {
    try { await run(() => api.users.hide(v.me.id, 'person', user.id)); } catch { return; }
    if (timer.current) clearTimeout(timer.current);
    const key = Date.now();
    setUndo({ user, key });
    timer.current = setTimeout(() => setUndo((u) => (u?.key === key ? null : u)), 5000);
  };
  const restore = async () => {
    if (!undo) return;
    const u = undo.user; setUndo(null);
    try { await run(() => api.users.hide(v.me.id, 'person', u.id, true), t('다시 보이게 했어요')); } catch { /* toast */ }
  };
  const bar = undo ? <UndoBar text={fmt(t('{name}님을 숨겼어요 · 상대는 몰라요'), { name: undo.user.nickname })} onUndo={restore} /> : null;
  return { hide, bar };
}

/** 화면 아래 떠 있는 되돌리기 바 */
export function UndoBar({ text, onUndo }: { text: string; onUndo: () => void }) {
  return (
    <View style={tw`absolute left-4 right-4 bottom-4 items-center`}>
      <View style={tw`h-11 pl-4 pr-1.5 rounded-full bg-ink flex-row items-center max-w-full`}>
        <Text numberOfLines={1} style={tw`text-[13px] font-semibold text-white shrink`}>{text}</Text>
        <Pressable onPress={onUndo} style={[tw`ml-3 h-8 px-3 rounded-full justify-center`, { backgroundColor: C.onDarkBtn }]}><Text style={tw`text-[13px] font-bold text-accent-soft`}>{t('되돌리기')}</Text></Pressable>
      </View>
    </View>
  );
}

/** 경로 한 줄 — "나 → 서연 → 지민" (경로 노출을 끈 사람은 뺀다) */
export function PathText({ via, to, size = 11 }: { via: User[]; to: string; size?: number }) {
  return (
    <View style={tw`flex-row items-center flex-wrap`}>
      <Text style={[tw`font-semibold text-ink-2`, { fontSize: size }]}>{t('나')}</Text>
      {via.map((p) => <View key={p.id} style={tw`flex-row items-center`}><ArrowRight size={size - 1} color={C.ink3} style={tw`mx-0.5`} /><Text style={[tw`text-ink-2`, { fontSize: size }]}>{p.nickname}</Text></View>)}
      <ArrowRight size={size - 1} color={C.ink3} style={tw`mx-0.5`} />
      <Text style={[tw`font-semibold text-ink-2`, { fontSize: size }]}>{to}</Text>
    </View>
  );
}

/** 보기 권한이 없는 항목은 지운 복사본 — PersonRow 가 그대로 그려도 새지 않게 */
function maskUser(u: User, view: ProfileView): User {
  return {
    ...u,
    career: u.career ? { ...u.career, company: view.company ? u.career.company : undefined, city: view.city ? u.career.city : undefined } : u.career,
    homeCity: view.city ? u.homeCity : undefined,
    activityCity: view.city ? u.activityCity : undefined,
    region: view.city ? u.region : '',
    gradYear: view.gradYear ? u.gradYear : undefined,
    trips: view.trips ? u.trips : undefined,
  };
}

/**
 * 사람 한 명 (자연어 찾기 · 사람 찾아보기) — 왜(이유 칩) → 얼마나 가까운지(촌수 · 서로 아는 사람) → 경로 → 세부(공개 범위 안에서만).
 * 전화번호·개인 이메일·정확한 위치는 애초에 보여주지 않는다.
 */
export function MaskedPersonRow({ user, reasons }: { user: User; reasons: Reason[] }) {
  const v = useViewer();
  const me = v.me;
  const view = profileView(v.snap, me, user);
  const masked = maskUser(user, view);
  const rs = reasons.filter((r) => (view.city || (r.kind !== 'city' && r.kind !== 'living')) && (view.groups || r.kind !== 'group'));
  const degree = degreeOf(v.snap, me.id, user.id, 3);
  const via = degree && degree >= 2 ? pathBetween(v.snap, me.id, user.id, 3).map((id) => v.userById(id)).filter((u): u is User => !!u && canShowInPath(u)) : [];
  return (
    <View style={tw`mb-3`}>
      <PersonRow user={masked} reasons={rs} actions compact={!view.city} />
      <View style={tw`px-3 mt-1 flex-row items-center flex-wrap`}>
        <Text style={tw`text-[11px] font-semibold text-ink-2`}>{degreeLabel(degree, lang)}</Text>
        {via.length > 0 ? <View style={tw`flex-row items-center`}><Text style={tw`text-[11px] text-ink-3`}> · </Text><PathText via={via} to={user.nickname} /></View> : null}
      </View>
      {!view.full && view.reason ? <View style={tw`px-2`}><PrivacyNote text={view.reason} /></View> : null}
    </View>
  );
}

/**
 * 공개 범위를 지킨 사람 카드 (웹 around_PersonCard MaskedPersonCard) — 위에 이유/거리(top), 아래에 이름·학교·(허용된) 직무·도시, 오른쪽에 [저장] · 연결.
 */
export function MaskedPersonCard({ user, top, sub }: { user: User; top?: ReactNode; sub?: ReactNode }) {
  const v = useViewer();
  const view = profileView(v.snap, v.me, user);
  const status = connectionStatus(v.snap, v.me, user);
  const common = commonInterests(v.me, user);
  const line = maskedLine(user, view);
  const open = () => nav(`/users/${user.id}`);
  return (
    <View style={tw`mb-2.5 rounded-[20px] border border-line bg-white p-3`}>
      {top ? <View style={tw`flex-row items-center flex-wrap mb-2`}>{top}</View> : null}
      <View style={tw`flex-row items-start`}>
        <Pressable onPress={open} accessibilityLabel={user.nickname}><Avatar emoji={user.avatar.emoji} hue={user.avatar.hue} url={user.avatar.url} size={48} /></Pressable>
        <Pressable onPress={open} style={tw`flex-1 min-w-0 ml-3`}>
          <View style={tw`flex-row items-center min-w-0`}>
            <Text numberOfLines={1} style={tw`text-[15px] font-bold text-ink shrink-0 max-w-[60%] mr-1.5`}>{user.nickname}</Text>
            <SchoolBadge user={user} size="sm" />
          </View>
          {line ? <Text numberOfLines={1} style={tw`text-[12px] text-ink-2`}>{line}</Text> : null}
          {sub}
          <View style={tw`mt-0.5 flex-row items-center flex-wrap`}>
            {view.city && cityOf(user) ? <View style={tw`flex-row items-center mr-1.5`}><MapPin size={11} color={C.ink3} /><Text style={tw`ml-0.5 text-[12px] text-ink-3`}>{cityOf(user)}</Text></View> : null}
            {common.slice(0, 2).map((i) => <View key={i} style={tw`mr-1`}><Tag tone="primary">{INTEREST_LABELS[i]}</Tag></View>)}
          </View>
          {!view.full && view.reason ? <PrivacyNote text={view.reason} /> : null}
        </Pressable>
        <View style={tw`ml-2 self-center items-center`}>
          <SaveButton user={user} />
          {status === 'private' ? <Text style={tw`h-7 px-1.5 text-[12px] font-bold text-ink-3`}>{CONNECTION_LABELS.private}</Text> : <ConnectTextButton user={user} />}
        </View>
      </View>
    </View>
  );
}

/** 섹션 제목 한 줄 — "여기 있는 사람 3" */
export function SubTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return <View style={tw`flex-row items-center mb-2 px-1`}><Text style={tw`flex-1 text-[13px] font-semibold text-ink-3`}>{children}</Text>{right}</View>;
}

/** "더 보기" 접이식 행 — 보조 기능을 한 줄 아래로 숨긴다 */
export function MoreRow({ open, onToggle, label }: { open: boolean; onToggle: () => void; label?: string }) {
  return (
    <Pressable onPress={onToggle} accessibilityState={{ expanded: open }} style={tw`h-11 my-2 rounded-full border border-line bg-white flex-row items-center justify-center`}>
      <Text style={tw`text-[13px] font-semibold text-primary`}>{open ? t('접기') : (label ?? t('더 보기'))}</Text>
      <View style={[tw`ml-1`, open ? { transform: [{ rotate: '180deg' }] } : null]}><ChevronDown size={14} color={C.primary} /></View>
    </Pressable>
  );
}
