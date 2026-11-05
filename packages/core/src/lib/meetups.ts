/**
 * 모임(meetup) 규칙 — 누가 보는지(reach), 누가 참가할 수 있는지(학적 audience), 대기 명단(waitlist).
 * 화면(S045–S048)·엔진(activities.join / joinWaitlist / cancel / approve)·테스트(server/meetups.test.ts)가 같은 함수를 쓴다.
 */
import type { Activity, ID, Organization, Participation, UniversityRole, User, Visibility, JoinPolicy } from '@core/types';

/** S045 공개 범위 칩: Campus-wide · My verified groups · Class · Invite only */
export type MeetupReach = 'campus' | 'groups' | 'class' | 'invite';

/** 학적 (S045 All statuses · Undergraduate · Graduate · Alumni) — 없으면 모두 */
export const AUDIENCE_ROLES: UniversityRole[] = ['undergraduate', 'graduate', 'alumni'];

/** 이 사람이 이 모임에 참가할 수 있는 학적인지. 주최자는 늘 된다 */
export function audienceFits(a: Pick<Activity, 'audience' | 'hostId'>, u: Pick<User, 'id' | 'affiliation'>): boolean {
  if (!a.audience || a.hostId === u.id) return true;
  return u.affiliation.type === 'university' && u.affiliation.role === a.audience;
}

/** 저장된 활동 → 화면의 공개 범위 칩. 다른 방식(친구·선택한 사람 등)으로 연 것은 'other' */
export function reachOf(a: Pick<Activity, 'visibility' | 'visibilityTargets' | 'joinPolicy'>): MeetupReach | 'other' {
  if (a.joinPolicy === 'invite') return 'invite';
  const tg = a.visibilityTargets ?? [];
  if (a.visibility === 'department' && tg.length && tg.every((x) => x.startsWith('course:'))) return 'class';
  if (a.visibility === 'department' && tg.length && tg.every((x) => x.startsWith('org:'))) return 'groups';
  if (a.visibility === 'school' || a.visibility === 'public') return 'campus';
  return 'other';
}

/** 칩 → 저장할 값. groups 는 고른 모임 id, class 는 시간표의 수업 이름 */
export function reachInput(reach: MeetupReach, opts: { orgIds?: ID[]; course?: string; joinPolicy?: JoinPolicy } = {}): { visibility: Visibility; visibilityTargets: string[]; joinPolicy: JoinPolicy } {
  const keep: JoinPolicy = opts.joinPolicy === 'approval' ? 'approval' : 'open';
  switch (reach) {
    case 'campus': return { visibility: 'school', visibilityTargets: [], joinPolicy: keep };
    case 'groups': return { visibility: 'department', visibilityTargets: (opts.orgIds ?? []).map((id) => `org:${id}`), joinPolicy: keep };
    case 'class': return { visibility: 'department', visibilityTargets: opts.course ? [`course:${opts.course}`] : [], joinPolicy: keep };
    case 'invite': return { visibility: 'private', visibilityTargets: [], joinPolicy: 'invite' };
  }
}

/** 공개 범위 칩을 쓸 수 있는지 — 모임에 들지 않았으면 groups, 시간표에 수업이 없으면 class 는 못 고른다 */
export function reachReady(reach: MeetupReach, input: { visibilityTargets?: string[] }): boolean {
  if (reach === 'groups' || reach === 'class') return (input.visibilityTargets ?? []).length > 0;
  return true;
}

/** 내가 회원·운영진인 모임 (팔로우만 한 것은 아니다) — S045 My verified groups, S038 Your groups */
export const myGroups = (orgs: Organization[], userId: ID) => orgs.filter((o) => o.memberIds.includes(userId) || o.adminIds.includes(userId));

/** 정원 — 999 이상은 '제한 없음' (Capacity 를 비워 둔 모임) */
export const NO_LIMIT = 999;
export const hasLimit = (a: Pick<Activity, 'capacity'>) => a.capacity < NO_LIMIT;

export const approvedOf = (parts: Participation[], activityId: ID) => parts.filter((p) => p.activityId === activityId && p.status === 'approved');
/** 대기 명단 — 먼저 온 순서 */
export const waitlistOf = (parts: Participation[], activityId: ID) =>
  parts.filter((p) => p.activityId === activityId && p.status === 'waitlisted').sort((x, y) => x.createdAt.localeCompare(y.createdAt));
/** 주최자는 참가 기록 없이 모임에 있으므로 정원은 참가자(승인)만 센다 — 예전 join 과 같은 셈 */
export const isFull = (a: Pick<Activity, 'id' | 'capacity'>, parts: Participation[]) => approvedOf(parts, a.id).length >= a.capacity;
