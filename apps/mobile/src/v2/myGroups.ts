import type { ID, Organization } from '@core/types';

/**
 * 내 그룹 두 목록 (웹 MyGroupsPage) — 멤버·운영진 | 팔로우만. 프로필의 "그룹" 수는 이 두 목록의 합과 같다.
 * (`@core/lib/meet` myGroups 는 멤버·운영진만 — 모임 만들기에서 쓴다)
 */
export function myGroupLists(orgs: Organization[], meId: ID) {
  const mine = orgs.filter((o) => o.memberIds.includes(meId) || o.adminIds.includes(meId));
  const following = orgs.filter((o) => !mine.includes(o) && o.followerIds.includes(meId));
  return { mine, following, total: mine.length + following.length };
}
