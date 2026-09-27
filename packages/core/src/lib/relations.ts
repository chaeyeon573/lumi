import type { Snapshot } from '@core/api/types';
import { t } from '@core/i18n';
import type { Activity, ID, Post, User, Visibility, ProfileField } from '@core/types';
import { pairKey } from './format';

type Rel = Pick<Snapshot, 'relationships' | 'participations' | 'proposals' | 'users'> & { organizations?: Snapshot['organizations'] };

export const isFriend = (s: Rel, a: ID, b: ID) => s.relationships.friends.some((f) => pairKey(f.a, f.b) === pairKey(a, b));
export const isBlocked = (s: Rel, a: ID, b: ID) => s.relationships.blocks.some((x) => (x.fromId === a && x.toId === b) || (x.fromId === b && x.toId === a));
export const hasBlocked = (s: Rel, from: ID, to: ID) => s.relationships.blocks.some((x) => x.fromId === from && x.toId === to);
export const iLike = (s: Rel, from: ID, to: ID) => s.relationships.likes.some((l) => l.fromId === from && l.toId === to);
export const isMutualLike = (s: Rel, a: ID, b: ID) => iLike(s, a, b) && iLike(s, b, a);
export const isFollowing = (s: Rel, from: ID, to: ID) => s.relationships.follows.some((f) => f.fromId === from && f.toId === to);
export const pendingRequestFrom = (s: Rel, from: ID, to: ID) => s.relationships.friendRequests.find((q) => q.fromId === from && q.toId === to && q.status === 'pending');
export const friendsOf = (s: Rel, id: ID): ID[] => s.relationships.friends.filter((f) => f.a === id || f.b === id).map((f) => (f.a === id ? f.b : f.a));
export const followersOf = (s: Rel, id: ID) => s.relationships.follows.filter((f) => f.toId === id && f.targetType === 'user').map((f) => f.fromId);
export const followingOf = (s: Rel, id: ID) => s.relationships.follows.filter((f) => f.fromId === id).map((f) => f.toId);

export const sharesApprovedActivity = (s: Rel, a: ID, b: ID) => {
  const mine = new Set(s.participations.filter((p) => p.userId === a && p.status === 'approved').map((p) => p.activityId));
  return s.participations.some((p) => p.userId === b && p.status === 'approved' && mine.has(p.activityId));
};

export const hasAcceptedProposal = (s: Rel, a: ID, b: ID) =>
  s.proposals.some((p) => p.status === 'accepted' && pairKey(p.fromId, p.toId) === pairKey(a, b));

/** 연결 상태 요약 */
export type ConnectionState = 'friend' | 'matched' | 'activity' | 'proposal' | 'none';
export function connectionState(s: Rel, a: ID, b: ID, activities?: Activity[]): ConnectionState {
  if (isFriend(s, a, b)) return 'friend';
  if (isMutualLike(s, a, b)) return 'matched';
  if (sharesApprovedActivity(s, a, b) || hostsSharedActivity(s, a, b, activities)) return 'activity';
  if (hasAcceptedProposal(s, a, b)) return 'proposal';
  return 'none';
}

function hostsSharedActivity(s: Rel, a: ID, b: ID, activities?: Activity[]) {
  if (!activities) return false;
  return activities.some((act) =>
    (act.hostId === a && s.participations.some((p) => p.activityId === act.id && p.userId === b && p.status === 'approved')) ||
    (act.hostId === b && s.participations.some((p) => p.activityId === act.id && p.userId === a && p.status === 'approved')));
}

/** 직접 메시지 가능 여부: 친구 / 상호 관심 / 활동 참가 승인 / 제안 수락 중 하나 + 차단·수신 설정 확인 */
export function canMessage(s: Rel & { activities?: Activity[] }, from: ID, to: ID): { ok: boolean; reason: string } {
  if (from === to) return { ok: false, reason: t('자기 자신에게는 보낼 수 없어요.') };
  if (isBlocked(s, from, to)) return { ok: false, reason: t('차단된 사용자와는 대화할 수 없어요.') };
  const target = s.users.find((u) => u.id === to);
  if (!target) return { ok: false, reason: t('사용자를 찾을 수 없어요.') };
  if (target.settings.messagePolicy === 'none') return { ok: false, reason: t('상대가 메시지 수신을 제한했어요.') };
  const state = connectionState(s, from, to, s.activities);
  if (target.settings.messagePolicy === 'friends_only' && state !== 'friend') return { ok: false, reason: t('상대가 친구에게만 메시지를 허용했어요.') };
  if (state === 'none') return { ok: false, reason: t('친구 요청 수락, 상호 관심, 활동 참가 승인 중 하나가 성립해야 대화할 수 있어요.') };
  return { ok: true, reason: '' };
}

// ─── 공개 범위 ────────────────────────────────────────────────────────────
function sameSchool(a: User, b: User) {
  return a.affiliation.type === 'university' && b.affiliation.type === 'university' && a.affiliation.schoolId === b.affiliation.schoolId;
}
function dept(u: User) { return u.affiliation.type === 'university' ? u.affiliation.department : ''; }

export function canView(s: Rel, viewer: User, ownerId: ID, visibility: Visibility, targets?: string[]): boolean {
  if (viewer.id === ownerId) return true;
  if (isBlocked(s, viewer.id, ownerId)) return false;
  const owner = s.users.find((u) => u.id === ownerId);
  if (!owner) return visibility === 'public';
  switch (visibility) {
    case 'public': return true;
    case 'school': return sameSchool(viewer, owner);
    case 'department': {
      if (!sameSchool(viewer, owner)) return false;
      if (!targets?.length) return dept(viewer) === dept(owner);
      // 'course:<수업명>' 타깃은 같은 수업을 듣는 사람에게만
      return targets.some((tg) => tg.startsWith('course:') ? viewer.timetable.some((c) => c.name === tg.slice(7)) : tg === dept(viewer));
    }
    case 'friends': return isFriend(s, viewer.id, ownerId);
    case 'followers': return isFollowing(s, viewer.id, ownerId) || isFriend(s, viewer.id, ownerId);
    case 'selected': return (targets ?? []).includes(viewer.id);
    case 'group': return (targets ?? []).some((gid) => s.organizations?.some((o) => o.id === gid && (o.memberIds.includes(viewer.id) || o.adminIds.includes(viewer.id))));
    case 'private': return false;
  }
}

export const canViewActivity = (s: Rel, viewer: User, a: Activity) =>
  canView(s, viewer, a.hostId, a.visibility, a.visibility === 'group' ? (a.orgId ? [a.orgId] : []) : a.visibilityTargets) || (a.joinPolicy === 'invite' && (a.invitedIds ?? []).includes(viewer.id));

export const canViewPost = (s: Rel, viewer: User, p: Post) => canView(s, viewer, p.authorId, p.visibility, p.visibility === 'group' ? (p.groupId ? [p.groupId] : []) : undefined);

/** 같은 수업을 듣는 사람 (시간표 공개 범위를 지킨다) */
export const classmates = (s: Rel, viewer: User, courseName: string, canSee: (u: User) => boolean) =>
  s.users.filter((u) => u.id !== viewer.id && !isBlocked(s, viewer.id, u.id) && sameSchool(viewer, u) && u.timetable.some((c) => c.name === courseName) && canSee(u));

/** 활동 장소 표시 — 승인제는 승인 전까지 대략적인 위치만 */
export function placeLabel(a: Activity, viewer: User, approved: boolean): { name: string; approximate: boolean } {
  if (a.hostId === viewer.id || approved || a.joinPolicy === 'open') return { name: a.place.name, approximate: false };
  return { name: a.place.area ?? `${a.place.name.split(' ')[0]} ${t('근처')}`, approximate: true };
}

export const canViewField = (s: Rel, viewer: User, owner: User, field: ProfileField) =>
  canView(s, viewer, owner.id, owner.fieldVisibility[field]);

export function visibilityDescription(v: Visibility) {
  switch (v) {
    case 'public': return t('누구나 볼 수 있어요');
    case 'school': return t('같은 학교 인증 사용자만 볼 수 있어요');
    case 'department': return t('지정한 학과·조직 구성원만 볼 수 있어요');
    case 'friends': return t('친구만 볼 수 있어요');
    case 'followers': return t('나를 팔로우하는 사람과 친구만 볼 수 있어요');
    case 'selected': return t('선택한 사람만 볼 수 있어요');
    case 'group': return t('그룹 멤버만 볼 수 있어요');
    case 'private': return t('나만 볼 수 있어요');
  }
}

export function commonInterests(a: User, b: User) {
  return a.interests.filter((i) => b.interests.includes(i));
}

export function mutualFriends(s: Rel, a: ID, b: ID) {
  const fa = new Set(friendsOf(s, a));
  return friendsOf(s, b).filter((x) => fa.has(x));
}
