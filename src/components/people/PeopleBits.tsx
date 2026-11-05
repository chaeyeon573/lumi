import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { lang } from '@core/i18n';
import type { ClassRoster, Organization, Self, User } from '@core/types';
import { Btn, PersonCard } from '@/components/ha';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api, type Patch } from '@core/api';
import { INTEREST_LABELS } from '@core/lib/labels';
import { sharedClassWith } from '@core/lib/classmates';

const en = lang === 'en';

/** 학년·학적 (PDF S039·S059 칩: 1st · 2nd · 3rd · 4th+ · Graduate · Alumni) */
export type YearKey = '1' | '2' | '3' | '4' | 'grad' | 'alumni';
export const YEAR_CHIPS: { key: YearKey; label: string }[] = [
  { key: '1', label: en ? '1st' : '1학년' }, { key: '2', label: en ? '2nd' : '2학년' }, { key: '3', label: en ? '3rd' : '3학년' },
  { key: '4', label: en ? '4th+' : '4학년+' }, { key: 'grad', label: en ? 'Graduate' : '대학원' }, { key: 'alumni', label: en ? 'Alumni' : '졸업생' },
];
/** 학년은 가을(8월)에 바뀐다. affiliation.year 는 학부생은 입학 연도 */
export function yearKey(u: Pick<User, 'affiliation'>, d = new Date()): YearKey | undefined {
  if (u.affiliation.type !== 'university') return undefined;
  const a = u.affiliation;
  if (a.role === 'graduate') return 'grad';
  if (a.role === 'alumni') return 'alumni';
  const academic = d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1;
  const y = Math.max(1, academic - a.year + 1);
  return y >= 4 ? '4' : (String(y) as YearKey);
}
const YEAR_LINE: Record<YearKey, string> = en
  ? { 1: 'First-year', 2: 'Second-year', 3: 'Third-year', 4: 'Fourth-year', grad: 'Graduate', alumni: 'Alumni' }
  : { 1: '1학년', 2: '2학년', 3: '3학년', 4: '4학년', grad: '대학원생', alumni: '졸업생' };

/** "Second-year · Design" — 학과는 그 사람이 보이게 한 경우에만 (서버가 안 보낸다) */
export function personMeta(u: User): string {
  if (u.affiliation.type !== 'university') return u.affiliation.companyName;
  const y = yearKey(u);
  return [y ? YEAR_LINE[y] : '', u.affiliation.showDepartment ? u.affiliation.department : ''].filter(Boolean).join(' · ');
}

/**
 * 둘이 함께 가진 것 (S061 Something in common) — 같은 수업 · 같은 모임 · 같은 관심사 · 같은 학기 목표.
 * 보이는 것만: 관심사·목표는 서버가 공개 범위 밖이면 보내지 않고, 수업은 서로 보이는 명단(classRosters)으로만, 모임은 상대가
 * 숨기지 않은 회원 명단으로만 센다
 */
export interface Common { kind: 'class' | 'group' | 'interest' | 'goal'; text: string }
export function commonGround(me: Self, u: User, ctx: { rosters?: ClassRoster[]; orgs: Organization[] }): Common[] {
  const out: Common[] = [];
  const cls = sharedClassWith(ctx.rosters, u.id);
  if (cls) out.push({ kind: 'class', text: en ? `Both in ${cls.code}` : `${cls.code} 같이 들어요` });
  const both = ctx.orgs.find((o) => (o.memberIds.includes(me.id) || o.adminIds.includes(me.id)) && (o.memberIds.includes(u.id) || o.adminIds.includes(u.id)));
  if (both) out.push({ kind: 'group', text: en ? `Both in ${both.name}` : `${both.name} 같이 해요` });
  const ints = (me.interests ?? []).filter((i) => (u.interests ?? []).includes(i));
  if (ints.length) out.push({ kind: 'interest', text: en ? `Also into ${ints.slice(0, 2).map((i) => INTEREST_LABELS[i].toLowerCase()).join(', ')}` : `${ints.slice(0, 2).map((i) => INTEREST_LABELS[i]).join('·')} 좋아해요` });
  return out;
}

/** 친구 버튼 — Add Friend · Requested(누르면 취소) · Accept · Friends */
export function FriendButton({ user }: { user: User }) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [busy, setBusy] = useState(false);
  const go = async (fn: () => Promise<Patch>, msg?: string) => { setBusy(true); try { await run(fn, msg); } catch { /* toast */ } finally { setBusy(false); } };
  const out = v.pendingOut(user.id); const inc = v.pendingIn(user.id);
  if (v.isFriend(user.id)) return <Btn size="sm" variant="outline" icon={<Check size={14} />} className="pointer-events-none">{en ? 'Friends' : '친구'}</Btn>;
  if (inc) return <Btn size="sm" variant="outline" loading={busy} onClick={() => go(() => api.relationships.respondFriendRequest(inc.id, true), en ? `You and ${user.nickname} are friends now.` : '친구가 되었어요!')}>{en ? 'Accept' : '수락'}</Btn>;
  if (out) return <Btn size="sm" variant="outline" loading={busy} className="text-ink-3" onClick={() => go(() => api.relationships.cancelFriendRequest(out.id), en ? 'Request canceled.' : '요청을 취소했어요.')}>{en ? 'Requested' : '요청함'}</Btn>;
  return <Btn size="sm" variant="outline" loading={busy} onClick={() => go(() => api.relationships.sendFriendRequest(v.me.id, user.id), en ? 'Friend request sent.' : '친구 요청을 보냈어요.')}>{en ? 'Add Friend' : '친구 추가'}</Btn>;
}

/**
 * 사람 카드 (PDF S039·S058·S061): 얼굴 · 이름 · "Second-year · Design" · 한 줄 · Add Friend.
 * 한 줄은 그 사람이 보이게 한 소개 — 없으면 둘이 함께 가진 것 하나. 예시 프로필은 "Sample" 이 붙는다 (데모 계정에만 온다)
 */
export function PersonItem({ user, line, lead = 'bio' }: { user: User; line?: string; /** common: 함께 가진 것을 소개보다 먼저 */ lead?: 'bio' | 'common' }) {
  const nav = useNavigate();
  const v = useViewer();
  const bio = v.canSeeField(user, 'bio') ? user.bio?.trim() : '';
  const meta = [user.sample ? (en ? 'Sample' : '예시') : '', personMeta(user)].filter(Boolean).join(' · ');
  return <PersonCard avatar={user.avatar} name={user.nickname} meta={meta} bio={lead === 'common' ? line || bio : bio || line} action={<FriendButton user={user} />} onClick={() => nav(`/users/${user.id}`)} />;
}
