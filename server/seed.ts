/**
 * 서버 시드 — 언어(AROUNDU_LANG)에 맞는 데이터를 스냅샷으로 만든다.
 * - SEED=full (기본): 데모와 같은 예시 사람·글·모임까지 전부
 * - SEED=base (실제 출시): 학교·조직(동아리 등) 목록과 심사용 데모 계정만. 예시 사람·글·모임·공고는 넣지 않는다
 */
import type { Snapshot } from '@core/api/types';
import { lang } from '@core/i18n';

export async function loadSeed(): Promise<Snapshot> {
  const seed = lang === 'en' ? await import('@core/data/seed.en') : await import('@core/data/seed');
  const full: Snapshot = structuredClone({
    users: seed.users, schools: seed.schools, organizations: seed.organizations, activities: seed.activities,
    participations: seed.participations, posts: seed.posts, relationships: seed.relationships, proposals: seed.proposals,
    chatRooms: seed.chatRooms, notifications: seed.notifications, reports: [], opportunities: seed.opportunities,
    opportunityIntents: seed.opportunityIntents, timePolls: seed.timePolls, savedSearches: [], networkRequests: seed.networkRequests, introRequests: seed.introRequests,
  });
  if (process.env.SEED !== 'base') return full;

  // 심사용 데모 계정만 남기고 예시 사람과의 관계·기록은 지운다
  const demo = full.users.find((u) => u.id === seed.DEMO_USER_ID);
  const users = demo ? [{ ...demo, savedPeople: [], hiddenPeople: [], savedLists: [], trips: [], openStatuses: [], status: undefined }] : [];
  const ids = new Set(users.map((u) => u.id));
  const keep = (xs: string[] | undefined) => (xs ?? []).filter((x) => ids.has(x));
  return {
    users,
    schools: full.schools,
    organizations: full.organizations.map((o) => ({ ...o, memberIds: keep(o.memberIds), followerIds: keep(o.followerIds), adminIds: keep(o.adminIds), applicantIds: keep(o.applicantIds), notices: [] })),
    activities: [], participations: [], posts: [], proposals: [], chatRooms: [], notifications: [], reports: [],
    relationships: { likes: [], follows: [], friendRequests: [], friends: [], blocks: [] },
    opportunities: [], opportunityIntents: [], timePolls: [], savedSearches: [], networkRequests: [], introRequests: [],
  };
}
