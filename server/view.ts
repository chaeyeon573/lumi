/**
 * 사용자 관점으로 스냅샷·패치를 걸러낸다.
 * - 알림·신고는 본인 것만
 * - 다른 사람의 시간표 강의실(room)은 절대 내려보내지 않는다
 */
import type { Patch, Snapshot } from '@core/api/types';
import type { ID, User, NetworkRequest } from '@core/types';

function sanitizeUser(u: User, viewerId: ID): User {
  if (u.id === viewerId) return u;
  // 다른 사람의 요금제·연결 요청 사용량·검색 취향은 내려보내지 않는다
  const { plan: _p, swipes: _s, savedPeople: _sp, ...rest } = u;
  return { ...rest, timetable: u.timetable.map(({ room: _room, ...c }) => c) };
}

/** 네트워크 요청: 응답·추천 목록은 요청자와 당사자에게만. 추천받은 후보는 '관심 있어요' 전까지 요청자에게 보이지 않는다 */
function sanitizeRequest(r: NetworkRequest, viewerId: ID): NetworkRequest {
  if (r.authorId === viewerId) return { ...r, referrals: r.referrals.filter((x) => x.status !== 'pending' || x.referrerId === viewerId).map((x) => (x.status === 'pending' ? { ...x, candidateId: '' } : x)) };
  return { ...r, dismissedIds: r.dismissedIds.filter((id) => id === viewerId), responses: r.responses.filter((x) => x.userId === viewerId), referrals: r.referrals.filter((x) => x.candidateId === viewerId || x.referrerId === viewerId) };
}

export function snapshotFor(db: Snapshot, viewerId: ID): Snapshot {
  return {
    ...db,
    users: db.users.map((u) => sanitizeUser(u, viewerId)),
    notifications: db.notifications.filter((n) => n.userId === viewerId),
    reports: db.reports.filter((r) => r.reporterId === viewerId),
    savedSearches: db.savedSearches.filter((s) => s.userId === viewerId),
    networkRequests: db.networkRequests.map((r) => sanitizeRequest(r, viewerId)),
  };
}

export function patchFor(patch: Patch, viewerId: ID): Patch | null {
  const out: Patch = { ...patch };
  if (patch.users) out.users = patch.users.map((u) => sanitizeUser(u, viewerId));
  if (patch.notifications) out.notifications = patch.notifications.filter((n) => n.userId === viewerId);
  if (patch.reports) out.reports = patch.reports.filter((r) => r.reporterId === viewerId);
  if (patch.savedSearches) out.savedSearches = patch.savedSearches.filter((s) => s.userId === viewerId);
  if (patch.networkRequests) out.networkRequests = patch.networkRequests.map((r) => sanitizeRequest(r, viewerId));
  const hasContent = Object.entries(out).some(([k, v]) => (k === 'relationships' ? !!v : k === 'removed' ? !!v && Object.values(v).some((ids) => ids && ids.length) : Array.isArray(v) && v.length > 0));
  return hasContent ? out : null;
}
