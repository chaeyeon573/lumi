import { useMemo } from 'react';
import { useAppStore } from '@core/store/useAppStore';
import type { Activity, ID, Post, Self, User } from '@core/types';
import {
  canMessage, canViewActivity, canViewField, canViewPost, connectionState, iLike, isFollowing, isFriend, isMutualLike, pendingRequestFrom, hasBlocked, isBlocked,
} from '@core/lib/relations';

/** 현재 사용자 관점의 데이터 접근 헬퍼 */
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
  const classRosters = useAppStore((s) => s.classRosters);

  return useMemo(() => {
    const snap = { users, relationships, participations, proposals, activities, opportunities, opportunityIntents, timePolls, classRosters };
    // 내 프로필은 서버가 아무것도 빼지 않는다 (다른 사람 프로필만 공개 범위로 걸러 온다 — @core/lib/privacy)
    const me = users.find((u) => u.id === currentUserId) as Self;
    // 익명 글·댓글은 글쓴이 id 가 없다
    const userById = (id?: ID) => (id ? users.find((u) => u.id === id) : undefined);
    const orgById = (id: ID) => organizations.find((o) => o.id === id);
    const blockedIds = new Set(relationships.blocks.filter((b) => b.fromId === me?.id).map((b) => b.toId));
    // 서버는 나를 차단한 사람과 그 사람의 글을 아예 보내지 않는다 — 이 목록은 오프라인 데모(전체 데이터)에서만 찬다
    const blockedByIds = new Set(relationships.blocks.filter((b) => b.toId === me?.id).map((b) => b.fromId));
    const hidden = (id?: ID) => !!id && (blockedIds.has(id) || blockedByIds.has(id));

    // Lumi 가 제안만 한 스터디 그룹(아직 2명이 수락하지 않음)은 목록에 섞지 않는다 — /study/:id 와 수업 방에서만
    const visibleActivities: Activity[] = me ? activities.filter((a) => !hidden(a.hostId) && a.studyGroup?.status !== 'suggested' && a.studyGroup?.status !== 'expired' && canViewActivity(snap, me, a)) : [];
    const visiblePosts: Post[] = me ? posts.filter((p) => !hidden(p.authorId) && canViewPost(snap, me, p)) : [];
    const visibleUsers: User[] = me ? users.filter((u) => u.id !== me.id && !hidden(u.id)) : [];

    const approvedCount = (activityId: ID) => participations.filter((p) => p.activityId === activityId && p.status === 'approved').length;
    const myParticipation = (activityId: ID) => participations.find((p) => p.activityId === activityId && p.userId === me?.id && (p.status === 'approved' || p.status === 'pending'));

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
      /** 서버가 보낸 다른 사람 프로필은 서버가 계산한 열린 항목(viewable)을 따른다 */
      canSeeField: (owner: User, field: keyof User['fieldVisibility']) => canViewField(snap, me, owner, field),
      hasBlocked: (to: ID) => hasBlocked(snap, me.id, to),
      isBlocked: (to: ID) => isBlocked(snap, me.id, to),
    };
  }, [users, relationships, participations, proposals, activities, posts, organizations, opportunities, opportunityIntents, timePolls, currentUserId, classRosters]);
}
