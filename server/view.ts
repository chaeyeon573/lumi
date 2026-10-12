/**
 * 사용자 관점으로 스냅샷·패치를 걸러낸다.
 * - 알림·신고는 본인 것만
 * - 다른 사람의 시간표 강의실(room)은 절대 내려보내지 않는다
 * - 아이스브레이커: 게임은 당사자에게만, 다른 사람 프로필의 정답(거짓 위치·이모지 뜻·맞혀봐 답)은 지운다,
 *   this_or_that은 둘 다 답하기 전까지 상대 선택을 지운다
 * - 동아리는 내 학교 것 + 내가 속했거나 화면이 참조하는 것만 (전체 5만 개를 내려보내면 첫 화면이 수 초 걸린다)
 */
import type { Patch, Snapshot } from '@core/api/types';
import type { Game, ID, Organization, User } from '@core/types';
import { gameFor, stripGameSecrets } from '@core/lib/icebreakers';

function sanitizeUser(u: User, viewerId: ID): User {
  if (u.id === viewerId) return u;
  return { ...stripGameSecrets(u, viewerId), timetable: u.timetable.map(({ room: _room, ...c }) => c) };
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

/** 이 사람이 볼 수 있는 게임만, 비밀을 지운 모양으로 */
export const gamesFor = (games: Game[] | undefined, viewerId: ID): Game[] => (games ?? []).map((g) => gameFor(g, viewerId)).filter((g): g is Game => !!g);

export function snapshotFor(db: Snapshot, viewerId: ID): Snapshot {
  return {
    ...db,
    organizations: db.organizations.filter(orgFilter(db, viewerId)),
    users: db.users.map((u) => sanitizeUser(u, viewerId)),
    notifications: db.notifications.filter((n) => n.userId === viewerId),
    reports: db.reports.filter((r) => r.reporterId === viewerId),
    games: gamesFor(db.games, viewerId),
  };
}

export function patchFor(patch: Patch, viewerId: ID, db?: Snapshot): Patch | null {
  const out: Patch = { ...patch };
  if (patch.organizations && db) out.organizations = patch.organizations.filter(orgFilter(db, viewerId));
  if (patch.users) out.users = patch.users.map((u) => sanitizeUser(u, viewerId));
  if (patch.notifications) out.notifications = patch.notifications.filter((n) => n.userId === viewerId);
  if (patch.reports) out.reports = patch.reports.filter((r) => r.reporterId === viewerId);
  if (patch.games) out.games = gamesFor(patch.games, viewerId);
  const hasContent = Object.entries(out).some(([k, v]) => (k === 'relationships' ? !!v : k === 'removed' ? !!v && Object.values(v).some((ids) => ids && ids.length) : Array.isArray(v) && v.length > 0));
  return hasContent ? out : null;
}
