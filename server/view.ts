/**
 * 사용자 관점으로 스냅샷·패치를 걸러낸다.
 * - 알림·신고는 본인 것만
 * - 다른 사람의 시간표 강의실(room)은 절대 내려보내지 않는다
 * - 동아리는 내 학교 것 + 내가 속했거나 화면이 참조하는 것만 (전체 5만 개를 내려보내면 첫 화면이 수 초 걸린다)
 */
import type { Patch, Snapshot } from '@core/api/types';
import type { ID, Organization, User } from '@core/types';

function sanitizeUser(u: User, viewerId: ID): User {
  if (u.id === viewerId) return u;
  return { ...u, timetable: u.timetable.map(({ room: _room, ...c }) => c) };
}

/** 이 사용자에게 보낼 동아리인지 */
export function orgFilter(db: Snapshot, viewerId: ID): (o: Organization) => boolean {
  const me = db.users.find((u) => u.id === viewerId);
  const school = me?.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  const referenced = new Set<ID>();
  for (const u of db.users) u.interestedOrgIds?.forEach((id) => referenced.add(id));
  for (const x of [...db.activities, ...db.posts, ...db.opportunities] as { orgId?: ID }[]) if (x.orgId) referenced.add(x.orgId);
  return (o) => !o.schoolId || o.schoolId === school || referenced.has(o.id)
    || o.memberIds.includes(viewerId) || o.followerIds.includes(viewerId) || o.adminIds.includes(viewerId) || o.applicantIds.includes(viewerId);
}

export function snapshotFor(db: Snapshot, viewerId: ID): Snapshot {
  return {
    ...db,
    organizations: db.organizations.filter(orgFilter(db, viewerId)),
    users: db.users.map((u) => sanitizeUser(u, viewerId)),
    notifications: db.notifications.filter((n) => n.userId === viewerId),
    reports: db.reports.filter((r) => r.reporterId === viewerId),
  };
}

export function patchFor(patch: Patch, viewerId: ID, db?: Snapshot): Patch | null {
  const out: Patch = { ...patch };
  if (patch.organizations && db) out.organizations = patch.organizations.filter(orgFilter(db, viewerId));
  if (patch.users) out.users = patch.users.map((u) => sanitizeUser(u, viewerId));
  if (patch.notifications) out.notifications = patch.notifications.filter((n) => n.userId === viewerId);
  if (patch.reports) out.reports = patch.reports.filter((r) => r.reporterId === viewerId);
  const hasContent = Object.entries(out).some(([k, v]) => (k === 'relationships' ? !!v : k === 'removed' ? !!v && Object.values(v).some((ids) => ids && ids.length) : Array.isArray(v) && v.length > 0));
  return hasContent ? out : null;
}
