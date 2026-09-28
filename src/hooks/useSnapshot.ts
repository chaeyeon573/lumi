import { useMemo } from 'react';
import { useAppStore } from '@core/store/useAppStore';
import type { Snapshot } from '@core/api/types';

/** 스토어의 전체 스냅샷 — core 순수 함수(recommendPeople · homeToday · requestsForMe …)에 그대로 넘긴다 */
export function useSnapshot(): Snapshot {
  const allUsers = useAppStore((s) => s.users);
  /** 탈퇴·이용 정지 사용자는 추천·네트워크 계산에서 뺀다 (대화 기록 표시는 userById 가 전체 목록으로 찾는다) */
  const users = useMemo(() => allUsers.filter((u) => !u.deleted && !u.suspended), [allUsers]);
  const schools = useAppStore((s) => s.schools);
  const organizations = useAppStore((s) => s.organizations);
  const activities = useAppStore((s) => s.activities);
  const participations = useAppStore((s) => s.participations);
  const posts = useAppStore((s) => s.posts);
  const relationships = useAppStore((s) => s.relationships);
  const proposals = useAppStore((s) => s.proposals);
  const chatRooms = useAppStore((s) => s.chatRooms);
  const notifications = useAppStore((s) => s.notifications);
  const reports = useAppStore((s) => s.reports);
  const opportunities = useAppStore((s) => s.opportunities);
  const opportunityIntents = useAppStore((s) => s.opportunityIntents);
  const timePolls = useAppStore((s) => s.timePolls);
  const savedSearches = useAppStore((s) => s.savedSearches);
  const networkRequests = useAppStore((s) => s.networkRequests);
  const introRequests = useAppStore((s) => s.introRequests);
  return useMemo(() => ({ users, schools, organizations, activities, participations, posts, relationships, proposals, chatRooms, notifications, reports, opportunities, opportunityIntents, timePolls, savedSearches, networkRequests, introRequests }),
    [users, schools, organizations, activities, participations, posts, relationships, proposals, chatRooms, notifications, reports, opportunities, opportunityIntents, timePolls, savedSearches, networkRequests, introRequests]);
}
