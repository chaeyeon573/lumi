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
  if (process.env.SEED === 'full') { full.users = full.users.map((u) => ({ ...u, dataOrigin: 'demo', classmateOptIn: true })); return full; }

  // A fresh real environment contains no fictional people, memberships or listings.
  return { ...full, users: [], organizations: [], activities: [], participations: [], posts: [],
    proposals: [], chatRooms: [], notifications: [], reports: [], opportunities: [], opportunityIntents: [],
    timePolls: [], savedSearches: [], networkRequests: [], introRequests: [],
    relationships: { likes: [], follows: [], friendRequests: [], friends: [], blocks: [] } };
}
