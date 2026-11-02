import type { ID, Organization } from '@core/types';

/**
 * 동아리 페이지의 주 버튼이 지금 상태와 맞게 — '모집 안 함'이라고 써 놓고 '가입 문의' 버튼을 크게 두지 않는다.
 * 가입 요청은 그 동아리 운영진이 Lumi에 있을 때만 의미가 있다(받는 사람이 운영진이다).
 * 학교 공식 목록에서 가져온 동아리는 대부분 운영진이 Lumi에 없다 — 그때는 팔로우(소식 받기)가 주 버튼이다.
 * (ux-sim baseline-aisha steps 26–28: “Not recruiting right now” 인데 큰 “Ask to join” 버튼이 그대로)
 */
export type OrgJoin =
  | { kind: 'admin' }
  | { kind: 'member' }
  | { kind: 'applied' }
  /** 모집 중이고 운영진이 Lumi에 있다 — 가입 요청이 운영진(organizers명)에게 알림으로 간다 */
  | { kind: 'apply'; organizers: number }
  /** 가입 요청을 받을 사람이 없거나 모집하지 않는다 — 팔로우가 주 버튼 */
  | { kind: 'follow'; why: 'not_recruiting' | 'no_organizers' };

export function orgJoinState(org: Pick<Organization, 'adminIds' | 'memberIds' | 'applicantIds' | 'recruitment'>, userId: ID): OrgJoin {
  if (org.adminIds.includes(userId)) return { kind: 'admin' };
  if (org.memberIds.includes(userId)) return { kind: 'member' };
  if (org.applicantIds.includes(userId)) return { kind: 'applied' };
  if (!org.recruitment?.open) return { kind: 'follow', why: 'not_recruiting' };
  const organizers = org.adminIds.filter((a) => a !== userId).length;
  if (!organizers) return { kind: 'follow', why: 'no_organizers' };
  return { kind: 'apply', organizers };
}
