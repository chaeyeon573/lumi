/**
 * Merge a server Patch into the client's snapshot — the same rules the app store uses (useAppStore.applyPatch).
 * Kept free of React/zustand so server tests can check what a viewer's screen ends up holding.
 */
import type { Patch, Snapshot } from '@core/api/types';
import type { ID } from '@core/types';

export function upsert<T extends { id: ID }>(list: T[], items?: T[], removed?: ID[]) {
  if (!items && !removed) return list;
  const byId = new Map(list.map((i) => [i.id, i]));
  items?.forEach((i) => byId.set(i.id, i));
  removed?.forEach((id) => byId.delete(id));
  return [...byId.values()];
}

export function mergePatch(s: Snapshot, patch: Patch): Snapshot {
  const r = patch.removed;
  return {
    ...s,
    users: upsert(s.users, patch.users, r?.users),
    schools: upsert(s.schools, patch.schools, r?.schools),
    organizations: upsert(s.organizations, patch.organizations, r?.organizations),
    activities: upsert(s.activities, patch.activities, r?.activities),
    participations: upsert(s.participations, patch.participations, r?.participations),
    posts: upsert(s.posts, patch.posts, r?.posts),
    proposals: upsert(s.proposals, patch.proposals, r?.proposals),
    chatRooms: upsert(s.chatRooms, patch.chatRooms, r?.chatRooms),
    notifications: upsert(s.notifications, patch.notifications, r?.notifications),
    reports: upsert(s.reports, patch.reports),
    opportunities: upsert(s.opportunities, patch.opportunities, r?.opportunities),
    opportunityIntents: upsert(s.opportunityIntents, patch.opportunityIntents, r?.opportunityIntents),
    timePolls: upsert(s.timePolls, patch.timePolls, r?.timePolls),
    rides: patch.rides || r?.rides ? upsert(s.rides ?? [], patch.rides, r?.rides) : s.rides,
    games: upsert(s.games ?? [], patch.games, r?.games),
    // 같은 수업 목록은 서버가 보는 사람마다 통째로 다시 계산해 보낸다
    classRosters: patch.classRosters ?? s.classRosters,
    relationships: patch.relationships ? structuredClone(patch.relationships) : s.relationships,
  };
}
