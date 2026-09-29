/**
 * 단계별 "내 주변" — 같은 5개 탭이지만 안의 내용이 인생 단계에 따라 바뀐다.
 * 졸업생: 내 도시의 우리 학교 동문 · 같은 분야 동문 · 서로 아는 사람이 있는 동문 → 만나볼 만한 동문(소개 경로) → 새 소식(이사·입사)
 * 대학원생: 같은 연구 분야 대학원생 · 다른 학교 연구실 · 먼저 가 본 선배
 */
import type { Activity, LifeUpdate, User } from '@core/types';
import type { Snapshot } from '@core/api/types';
import { cityOf, sameCity, sameField, sameSchool, isAlumniStage, isGradStage, stageOf } from './network';
import { friendsOf, isBlocked, mutualFriends } from './relations';
import type { RecommendedPerson } from './people';

const visibleOthers = (snap: Snapshot, me: User) => snap.users.filter((u) => u.id !== me.id && !u.deleted && !u.suspended && !isBlocked(snap, me.id, u.id));

/** 분야 라벨 — 업종이 있으면 업종, 없으면 직무 */
export const fieldLabelOf = (u: Pick<User, 'career'>) => u.career?.industry || u.career?.role || '';

export interface AlumniAround {
  city: string;
  field: string;
  /** 내 도시(거주·활동)에 있는 우리 학교 동문 */
  inCity: User[];
  /** 같은 업종·직무의 우리 학교 동문 */
  sameField: User[];
  /** 서로 아는 사람이 있는 동문 (아직 연결 전) */
  withMutuals: User[];
}

export function alumniAround(snap: Snapshot, me: User): AlumniAround {
  const friends = new Set(friendsOf(snap, me.id));
  const alumni = visibleOthers(snap, me).filter((u) => isAlumniStage(u) && sameSchool(u, me));
  return {
    city: cityOf(me) ?? '',
    field: fieldLabelOf(me),
    inCity: alumni.filter((u) => sameCity(u, me)),
    sameField: alumni.filter((u) => sameField(u, me)),
    withMutuals: alumni.filter((u) => !friends.has(u.id) && mutualFriends(snap, me.id, u.id).length > 0),
  };
}

export interface AlumniPick extends RecommendedPerson {
  /** 소개를 부탁할 수 있는 서로 아는 사람 (첫 번째) */
  via?: User;
  mutualCount: number;
}

/** 만나볼 만한 동문 — 추천 순서를 유지하되 졸업생만, 서로 아는 사람(소개 경로)을 붙인다 */
export function alumniPicks(snap: Snapshot, me: User, ranked: RecommendedPerson[], n = 3): AlumniPick[] {
  const friends = new Set(friendsOf(snap, me.id));
  return ranked.filter((p) => isAlumniStage(p.user) && !friends.has(p.user.id))
    .map((p) => {
      const mids = mutualFriends(snap, me.id, p.user.id);
      const via = mids.map((id) => snap.users.find((u) => u.id === id)).find((u): u is User => !!u && !u.deleted);
      return { ...p, via, mutualCount: mids.length };
    })
    // 같은 학교 · 서로 아는 사람이 있는 동문을 조금 앞으로
    .map((p, i) => ({ p, s: (sameSchool(p.user, me) ? 2 : 0) + (p.via ? 2 : 0) - i * 0.5 }))
    .sort((a, b) => b.s - a.s).slice(0, n).map((x) => x.p);
}

export interface NetworkUpdate { user: User; update: LifeUpdate }

/** 새 소식 — 연결한 사람 · 우리 학교 동문의 이사·입사 (최근 것 먼저) */
export function networkUpdates(snap: Snapshot, me: User, n = 3): NetworkUpdate[] {
  const friends = new Set(friendsOf(snap, me.id));
  return visibleOthers(snap, me).filter((u) => friends.has(u.id) || (isAlumniStage(u) && sameSchool(u, me)))
    .flatMap((u) => (u.updates ?? []).map((update) => ({ user: u, update })))
    .sort((a, b) => b.update.at.localeCompare(a.update.at)).slice(0, n);
}

/** 이 도시에 새로 온 사람 환영 모임 (New in town) — 내 도시에서 열리는 것만 */
export const newcomerMeets = (acts: Activity[], me: User) => acts.filter((a) => a.newcomers && (!cityOf(me) || `${a.place.area ?? ''} ${a.place.address ?? ''}`.includes(cityOf(me)!)));

export interface GradAround {
  field: string;
  /** 같은 연구 분야 대학원생 (학교 무관) */
  sameField: User[];
  /** 그중 다른 학교 연구실 */
  otherSchool: User[];
  /** 먼저 가 본 선배 — 같은 분야 박사과정 · 졸업생 */
  ahead: User[];
}

const researchText = (u: User) => [u.research?.field, ...(u.research?.keywords ?? []), u.career?.industry, u.career?.role].filter(Boolean).join(' ').toLowerCase();
const matchesField = (u: User, field: string, keywords: string[]) => {
  const txt = researchText(u); if (!txt) return false;
  return [field, ...keywords].some((k) => k && txt.includes(k.toLowerCase()));
};

export function gradAround(snap: Snapshot, me: User): GradAround {
  const field = me.research?.field ?? '';
  if (!field) return { field, sameField: [], otherSchool: [], ahead: [] };
  const kws = me.research?.keywords ?? [];
  const others = visibleOthers(snap, me);
  const sameFieldGrad = others.filter((u) => isGradStage(u) && matchesField(u, field, kws));
  const myRank = stageOf(me) === 'phd' ? 2 : 1;
  const ahead = others.filter((u) => matchesField(u, field, kws) && ((isAlumniStage(u)) || (stageOf(u) === 'phd' && myRank === 1)));
  return { field, sameField: sameFieldGrad, otherSchool: sameFieldGrad.filter((u) => !sameSchool(u, me)), ahead };
}
