import type { ID, Organization } from '@core/types';

/**
 * 동아리 페이지의 주 버튼 (2026-11-06 사장님: 모든 동아리에 "Ask to join").
 * 학교 공식 목록에서 가져온 동아리는 대부분 운영진이 Lumi에 없다 — 그래도 요청은 저장되고, 동아리 이메일이 가거나 운영진이 오면
 * 전해진다 (@core/lib/clubjoin). 저장된 요청이 동아리 운영진이 Lumi에 올 이유다.
 * 학생회(council)·학교 부서(department)는 가입하는 곳이 아니라 팔로우만.
 */
export type OrgJoin =
  | { kind: 'admin' }
  | { kind: 'member' }
  | { kind: 'applied' }
  /** 가입 요청 — organizers = Lumi에 있는 운영진 수 (0 이면 요청은 동아리에 전해질 때까지 저장된다) */
  | { kind: 'ask'; organizers: number }
  /** 가입하는 곳이 아니다 (학생회·학교 부서) — 팔로우가 주 버튼 */
  | { kind: 'follow'; why: 'not_joinable' }
  /** Lumi 에서 만든 열린 그룹 (joinPolicy open) — 누르면 바로 회원 */
  | { kind: 'join' };

export function orgJoinState(org: Pick<Organization, 'adminIds' | 'memberIds' | 'applicantIds' | 'joinPolicy' | 'type'>, userId: ID): OrgJoin {
  if (org.adminIds.includes(userId)) return { kind: 'admin' };
  if (org.memberIds.includes(userId)) return { kind: 'member' };
  if (org.applicantIds.includes(userId)) return { kind: 'applied' };
  // Lumi 에서 만든 그룹 — 만든 사람이 고른 가입 방식이 정한다
  if (org.joinPolicy === 'open') return { kind: 'join' };
  if (!org.joinPolicy && (org.type === 'council' || org.type === 'department')) return { kind: 'follow', why: 'not_joinable' };
  return { kind: 'ask', organizers: org.adminIds.filter((a) => a !== userId).length };
}
