/**
 * 홈 — 게시글 피드가 아니라 "지금 나의 상황에서 볼 가치가 높은 것"을 2~4개씩 압축한 화면.
 * 학생: 오늘 일정 → 지금 연결할 수 있는 사람 → 학교에서 일어나는 것 → 나에게 맞는 모임 → 새로운 사람 → 추천 기회
 * 졸업생: 새롭게 연결할 사람 → 내 지역 사람 → 내 분야 사람 → 이번 주 참여 가능한 모임 → 내 관계망 소식 → 기회
 */
import type { Activity, Opportunity, User, Organization, Post } from '@core/types';
import type { Snapshot } from '@core/api/types';
import { todayISO, addDaysISO } from './format';
import { freeBlocks, todayIdx, nowMin, coursesOn, statusNow, type Block } from './timetable';
import { nowActivities } from './discover';
import { opportunityScore, daysUntil, type Reason } from './recommend';
import { recommendPeople, type RecommendedPerson } from './people';
import { recommendMeets, type RecommendedMeet } from './meet';
import { myNetwork, sameSchool, sameCity, sameField, cityOf, isGradStage, isAlumniStage, stageOf } from './network';
import { friendsOf } from './relations';

export interface HomeToday {
  classes: ReturnType<typeof coursesOn>;
  nextFree: Block | null;
  freeTogether: number;
  /** 지금 연결할 수 있는 사람 (2~4) — 공강 겹침·같은 학교·전공·관심사 우선 */
  connectNow: RecommendedPerson[];
  /** 학교에서 일어나는 것 — 행사·동아리·공고 (3) */
  happening: ({ kind: 'activity'; a: Activity } | { kind: 'opportunity'; o: Opportunity })[];
  /** 나에게 맞는 모임 (3) — 타학교 공개 모임 포함 */
  meets: RecommendedMeet[];
  /** 지금 열린 만남 (기존 Now) */
  now: Activity[];
  /** 새로운 사람 (3) — 다른 학교이거나 관심사가 겹치는 사람 */
  newPeople: RecommendedPerson[];
  opportunities: Opportunity[];
}

const CAMPUS_CATS = new Set(['school_event', 'club', 'performance', 'seminar', 'networking']);

/** 학생·대학원생 홈 */
export function homeToday(snap: Snapshot, me: User, visibleActivities: Activity[], canSeeTimetable: (u: User) => boolean): HomeToday {
  const today = todayISO(); const day = todayIdx(); const now = nowMin();
  const classes = coursesOn(me.timetable, day);
  const myFree = freeBlocks(me.timetable, day).filter((b) => b.end > now);
  const nextFree = myFree[0] ? { start: Math.max(myFree[0].start, now), end: myFree[0].end } : null;
  const network = myNetwork(snap.users, me);
  const freeTogether = nextFree ? network.filter((u) => u.timetable.length && canSeeTimetable(u) && freeBlocks(u.timetable, day).some((b) => b.start <= nextFree.start + 30 && b.end >= nextFree.start + 60)).length : 0;
  const mySchool = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  const ranked = recommendPeople(snap, me, snap.users, canSeeTimetable, 40);
  const connectNow = ranked.filter((p) => p.reasons.some((r) => r.kind === 'time') || sameSchool(p.user, me)).slice(0, 4);
  const taken = new Set(connectNow.map((p) => p.user.id));
  const newPeople = ranked.filter((p) => !taken.has(p.user.id) && (!sameSchool(p.user, me) || p.reasons.some((r) => r.kind === 'interest'))).slice(0, 3);
  const happening: HomeToday['happening'] = [
    ...visibleActivities.filter((a) => a.date === today && a.category !== 'store_deal' && (CAMPUS_CATS.has(a.category) || a.kind === 'org_event')).map((a) => ({ kind: 'activity' as const, a })),
    ...snap.opportunities.filter((o) => o.date === today && (!o.schoolId || o.schoolId === mySchool)).map((o) => ({ kind: 'opportunity' as const, o })),
  ].slice(0, 3);
  const meets = recommendMeets(visibleActivities, me, snap.users, snap.organizations, snap.participations, 3);
  const nowList = nowActivities(visibleActivities, me.id).slice(0, 3).map((x) => x.a);
  const opportunities = snap.opportunities.filter((o) => (!o.schoolId || o.schoolId === mySchool) && (!o.deadline || daysUntil(o.deadline) >= 0))
    .map((o) => ({ o, ...opportunityScore(me, o, snap.opportunityIntents) })).sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.o);
  return { classes, nextFree, freeTogether, connectNow, happening, meets, now: nowList, newPeople, opportunities };
}

export interface NetworkNews {
  kind: 'post' | 'meet' | 'group';
  post?: Post; meet?: Activity; group?: Organization;
  /** 누가 (연결·그룹) */
  who: string;
  at: string;
}

export interface AlumniHome {
  /** 새롭게 연결할 만한 사람 (4) */
  connect: RecommendedPerson[];
  /** 내 지역에서 활동하는 사람 (3) */
  nearby: RecommendedPerson[];
  /** 현재 분야와 관련 있는 사람 (3) */
  field: RecommendedPerson[];
  /** 이번 주 참여 가능한 모임 (3) */
  thisWeek: RecommendedMeet[];
  /** 내가 속한 관계망에서 새롭게 생긴 것 (3) — 연결·그룹의 새 글·모임 */
  news: NetworkNews[];
  groups: Organization[];
  opportunities: Opportunity[];
}

/** 졸업생 홈 — "내 관계망에 지금 어떤 변화가 있는가" */
export function alumniHome(snap: Snapshot, me: User, visibleActivities: Activity[], visiblePosts: Post[], canSeeTimetable: (u: User) => boolean): AlumniHome {
  const ranked = recommendPeople(snap, me, snap.users, canSeeTimetable, 40);
  const connect = ranked.slice(0, 4);
  const used = new Set(connect.map((p) => p.user.id));
  const nearby = ranked.filter((p) => !used.has(p.user.id) && sameCity(p.user, me)).slice(0, 3);
  nearby.forEach((p) => used.add(p.user.id));
  const field = ranked.filter((p) => !used.has(p.user.id) && sameField(p.user, me)).slice(0, 3);
  const week = addDaysISO(7); const today = todayISO();
  const thisWeek = recommendMeets(visibleActivities.filter((a) => a.date <= week), me, snap.users, snap.organizations, snap.participations, 3);
  const friends = new Set(friendsOf(snap, me.id));
  const myOrgs = snap.organizations.filter((o) => o.memberIds.includes(me.id) || o.followerIds.includes(me.id));
  const orgIds = new Set(myOrgs.map((o) => o.id));
  const news: NetworkNews[] = [
    ...visiblePosts.filter((p) => !p.sponsored && (friends.has(p.authorId) || (p.orgId && orgIds.has(p.orgId)) || (p.groupId && orgIds.has(p.groupId)))).slice(0, 3)
      .map((p) => ({ kind: 'post' as const, post: p, who: p.orgId ? (snap.organizations.find((o) => o.id === p.orgId)?.name ?? '') : (snap.users.find((u) => u.id === p.authorId)?.nickname ?? ''), at: p.createdAt })),
    ...visibleActivities.filter((a) => a.date >= today && ((a.orgId && orgIds.has(a.orgId)) || friends.has(a.hostId))).slice(0, 3)
      .map((a) => ({ kind: 'meet' as const, meet: a, who: a.orgId ? (snap.organizations.find((o) => o.id === a.orgId)?.name ?? '') : (snap.users.find((u) => u.id === a.hostId)?.nickname ?? ''), at: a.createdAt })),
  ].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3);
  const opportunities = snap.opportunities.filter((o) => ['internship', 'startup', 'lab', 'event', 'hackathon'].includes(o.type) && (!o.deadline || daysUntil(o.deadline) >= 0)).slice(0, 3);
  return { connect, nearby, field, thisWeek, news, groups: myOrgs.slice(0, 3), opportunities };
}

export interface GradHome extends HomeToday {
  /** 이번 주 연구 일정 — 세미나 · 리딩 그룹 · 학회 같이 가기 (3) */
  researchWeek: Activity[];
  /** 같은 연구 분야 사람 (4) — 다른 학교 연구실 포함 */
  researchPeople: RecommendedPerson[];
  /** 먼저 간 사람 (3) — 박사과정 · 그 분야에서 일하는 선배 */
  ahead: RecommendedPerson[];
}

const RESEARCH_CATS = new Set(['seminar', 'study']);

/** 대학원생 홈 — 수업·공강보다 연구 분야 · 연구 일정 · 먼저 간 사람 */
export function gradHome(snap: Snapshot, me: User, visibleActivities: Activity[], canSeeTimetable: (u: User) => boolean): GradHome {
  const base = homeToday(snap, me, visibleActivities, canSeeTimetable);
  const ranked = recommendPeople(snap, me, snap.users, canSeeTimetable, 60);
  const researchPeople = ranked.filter((p) => isGradStage(p.user) && p.reasons.some((r) => r.kind === 'research')).slice(0, 4);
  if (researchPeople.length < 2) researchPeople.push(...ranked.filter((p) => isGradStage(p.user) && !researchPeople.includes(p)).slice(0, 3 - researchPeople.length));
  const used = new Set(researchPeople.map((p) => p.user.id));
  const myRank = stageOf(me) === 'phd' ? 2 : 1;
  const ahead = ranked.filter((p) => !used.has(p.user.id) && ((isAlumniStage(p.user) && p.reasons.some((r) => r.kind === 'research' || r.kind === 'field' || r.kind === 'alumni')) || (stageOf(p.user) === 'phd' && myRank === 1))).slice(0, 3);
  const week = addDaysISO(7); const today = todayISO();
  const hostGrad = (a: Activity) => { const h = snap.users.find((u) => u.id === a.hostId); return !!h && isGradStage(h); };
  const researchWeek = visibleActivities.filter((a) => a.date >= today && a.date <= week && RESEARCH_CATS.has(a.category) && (hostGrad(a) || a.kind === 'org_event'))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)).slice(0, 3);
  const taken = new Set([...researchPeople, ...ahead].map((p) => p.user.id));
  // 모임은 세미나·스터디(대학원생이 여는 것) 먼저, 이번 주 연구 일정과 겹치지 않게
  const weekIds = new Set(researchWeek.map((a) => a.id));
  // 대학원생이 여는 모임 · 세미나 · 작은 모임을 먼저, 학부생이 여는 시험 스터디는 뒤로
  const hostUndergrad = (a: Activity) => { const h = snap.users.find((u) => u.id === a.hostId); return !!h && !isGradStage(h) && !isAlumniStage(h); };
  const gradScore = (a: Activity) => (hostGrad(a) ? 3 : 0) + (a.category === 'seminar' ? 2 : 0) + (a.category === 'networking' || a.category === 'coffee' ? 1 : 0) - (hostUndergrad(a) && a.category === 'study' ? 2 : 0);
  const meets = recommendMeets(visibleActivities.filter((a) => !weekIds.has(a.id)), me, snap.users, snap.organizations, snap.participations, 12)
    .map((m, i) => ({ m, s: gradScore(m.a) * 2 - i * 0.2 })).sort((a, b) => b.s - a.s).slice(0, 3).map((x) => x.m);
  return { ...base, meets, connectNow: base.connectNow.filter((p) => !taken.has(p.user.id)).slice(0, 3), researchWeek, researchPeople, ahead,
    opportunities: base.opportunities.filter((o) => ['lab', 'internship', 'hackathon', 'event', 'scholarship', 'exchange'].includes(o.type)) };
}

export const isInClass = (me: User) => statusNow(me.timetable).kind === 'in_class';
export const homeCityLabel = (me: User) => cityOf(me);
export type { Reason };
