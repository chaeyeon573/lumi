/**
 * "오늘 주변에서" — 앱이 알아서 가볍게 발견시켜 주는 조용한 요약.
 * 목표·완성도·"네트워크를 확장하세요" 같은 숙제 문구 없이 사실만:
 *   아는 사람을 통해 이어진 사람 3명 · 이번 주 서울에 있는 사람 2명 · 지금 커피에 열려 있는 사람 1명
 * 그리고 사람을 추천할 때 1:1 대신 "둘 다 참여할 수 있는 작은 모임"을 함께 보여준다.
 */
import type { Snapshot } from '@core/api/types';
import type { Activity, User } from '@core/types';
import { degreesFrom } from './graph';
import { citiesOf, cityOf, sameCity } from './network';
import { activeStatus } from './status';
import { isBlocked, mutualFriends } from './relations';
import { todayISO, addDaysISO } from './format';

export interface AroundToday {
  /** 아는 사람(1촌)을 통해 이어진 사람 — 2촌 */
  viaFriends: { user: User; via: User[] }[];
  /** 이번 주 내 도시(거주·활동)에 있는 사람 */
  inCity: User[];
  city: string;
  /** 지금/오늘 무언가에 열려 있는 사람 (상태가 켜져 있는) */
  openNow: User[];
}

export function aroundToday(snap: Snapshot, me: User): AroundToday {
  const deg = degreesFrom(snap, me.id, 2);
  const others = snap.users.filter((u) => u.id !== me.id && !isBlocked(snap, me.id, u.id));
  const viaFriends = others.filter((u) => deg.get(u.id) === 2)
    .map((u) => ({ user: u, via: mutualFriends(snap, me.id, u.id).map((id) => snap.users.find((x) => x.id === id)).filter((x): x is User => !!x) }))
    .sort((a, b) => b.via.length - a.via.length);
  const inCity = others.filter((u) => deg.get(u.id) !== 1 && sameCity(u, me));
  const openNow = others.filter((u) => !!activeStatus(u) && (sameCity(u, me) || deg.has(u.id)));
  return { viaFriends, inCity, city: cityOf(me) ?? citiesOf(me)[0] ?? '', openNow };
}

const SMALL = 6;
/** 작은 모임 — 4~6명 규모 (1:1 커피챗보다 부담이 적다) */
export const isSmallTable = (a: Activity) => a.capacity >= 3 && a.capacity <= SMALL && a.category !== 'store_deal';

/**
 * 나와 상대가 둘 다 참여할 수 있는 작은 모임.
 * 상대가 이미 참여 중이거나 주최하는 작은 모임, 또는 둘의 관심사·도시에 맞는 작은 모임 (2주 이내, 자리가 남은 것)
 */
export function sharedSmallTables(snap: Snapshot, me: User, other: User, visible: Activity[], limit = 2): Activity[] {
  const today = todayISO(); const until = addDaysISO(14);
  const approved = (aid: string, uid: string) => snap.participations.some((p) => p.activityId === aid && p.userId === uid && p.status === 'approved');
  const filled = (a: Activity) => snap.participations.filter((p) => p.activityId === a.id && p.status === 'approved').length + 1;
  const shared = new Set(me.interests.filter((i) => other.interests.includes(i)));
  return visible
    .filter((a) => isSmallTable(a) && a.date >= today && a.date <= until && a.hostId !== me.id && !approved(a.id, me.id) && filled(a) < a.capacity)
    .map((a) => {
      let s = 0;
      if (a.hostId === other.id || approved(a.id, other.id)) s += 5;
      const host = snap.users.find((u) => u.id === a.hostId);
      if (host && host.interests.some((i) => shared.has(i))) s += 2;
      if (citiesOf(me).some((c) => (a.place.area ?? a.place.name).includes(c))) s += 1;
      return { a, s };
    })
    .filter((x) => x.s >= 2)
    .sort((x, y) => y.s - x.s || x.a.date.localeCompare(y.a.date))
    .slice(0, limit)
    .map((x) => x.a);
}

/** DM 위 작은 카드 — "둘이 겹치는 것": 학교 · 관심사 · 도시 · 공통 연결 n명 */
export function overlapChips(snap: Snapshot, me: User, other: User, interestLabel: (i: string) => string): string[] {
  const out: string[] = [];
  if (me.affiliation.type === 'university' && other.affiliation.type === 'university' && me.affiliation.schoolId === other.affiliation.schoolId) out.push(me.affiliation.schoolName.replace(/대학교$/, '대'));
  me.interests.filter((i) => other.interests.includes(i)).slice(0, 2).forEach((i) => out.push(interestLabel(i)));
  if (sameCity(me, other)) out.push(cityOf(other));
  const m = mutualFriends(snap, me.id, other.id).length;
  return m ? [...out, `__mutual:${m}`] : out;
}
