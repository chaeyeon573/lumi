import { useMemo } from 'react';
import { useAppStore } from '@core/store/useAppStore';
import type { Activity, ID, Post, User } from '@core/types';
import {
  canMessage, canViewActivity, canViewField, canViewPost, connectionState, iLike, isFollowing, isFriend, isMutualLike, pendingRequestFrom, hasBlocked, isBlocked,
} from '@core/lib/relations';

/** 현재 사용자 관점의 데이터 접근 헬퍼 (웹 src/hooks/useViewer 와 동일) */
export function useViewer() {
  const users = useAppStore((s) => s.users);
  const relationships = useAppStore((s) => s.relationships);
  const participations = useAppStore((s) => s.participations);
  const proposals = useAppStore((s) => s.proposals);
  const activities = useAppStore((s) => s.activities);
  const posts = useAppStore((s) => s.posts);
  const organizations = useAppStore((s) => s.organizations);
  const opportunities = useAppStore((s) => s.opportunities);
  const opportunityIntents = useAppStore((s) => s.opportunityIntents);
  const timePolls = useAppStore((s) => s.timePolls);
  const currentUserId = useAppStore((s) => s.currentUserId);

  return useMemo(() => {
    // 추천·관계 계산용 스냅샷에서는 탈퇴·이용 정지 사용자를 뺀다 (userById 는 전체 — 대화 기록의 "탈퇴한 사용자" 표시용)
    const snap = { users: users.filter((u) => !u.deleted && !u.suspended), relationships, participations, proposals, activities, opportunities, opportunityIntents, timePolls, organizations };
    const me = users.find((u) => u.id === currentUserId) as User;
    const userById = (id: ID) => users.find((u) => u.id === id);
    const orgById = (id: ID) => organizations.find((o) => o.id === id);
    const blockedIds = new Set(relationships.blocks.filter((b) => b.fromId === me?.id).map((b) => b.toId));
    const blockedByIds = new Set(relationships.blocks.filter((b) => b.toId === me?.id).map((b) => b.fromId));
    const hidden = (id: ID) => blockedIds.has(id) || blockedByIds.has(id);

    const visibleActivities: Activity[] = me ? activities.filter((a) => !hidden(a.hostId) && canViewActivity(snap, me, a)) : [];
    const visiblePosts: Post[] = me ? posts.filter((p) => !hidden(p.authorId) && canViewPost(snap, me, p)) : [];
    const visibleUsers: User[] = me ? users.filter((u) => u.id !== me.id && !u.deleted && !u.suspended && !hidden(u.id)) : [];

    const approvedCount = (activityId: ID) => participations.filter((p) => p.activityId === activityId && p.status === 'approved').length;
    const myParticipation = (activityId: ID) => participations.find((p) => p.activityId === activityId && p.userId === me?.id && (p.status === 'approved' || p.status === 'pending' || p.status === 'waitlisted'));

    return {
      me, users, userById, orgById, snap,
      visibleActivities, visiblePosts, visibleUsers,
      approvedCount, myParticipation,
      iLike: (to: ID) => iLike(snap, me.id, to),
      isMutual: (to: ID) => isMutualLike(snap, me.id, to),
      isFollowing: (to: ID) => isFollowing(snap, me.id, to),
      isFriend: (to: ID) => isFriend(snap, me.id, to),
      pendingOut: (to: ID) => pendingRequestFrom(snap, me.id, to),
      pendingIn: (from: ID) => pendingRequestFrom(snap, from, me.id),
      connection: (to: ID) => connectionState(snap, me.id, to, activities),
      canMessage: (to: ID) => canMessage(snap, me.id, to),
      canSeeField: (owner: User, field: keyof User['fieldVisibility']) => canViewField(snap, me, owner, field),
      hasBlocked: (to: ID) => hasBlocked(snap, me.id, to),
      isBlocked: (to: ID) => isBlocked(snap, me.id, to),
    };
  }, [users, relationships, participations, proposals, activities, posts, organizations, opportunities, opportunityIntents, timePolls, currentUserId]);
}
