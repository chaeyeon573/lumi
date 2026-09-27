/** 서버 시드 — 언어(AROUNDU_LANG)에 맞는 예시 데이터를 스냅샷으로 만든다 */
import type { Snapshot } from '@core/api/types';
import { lang } from '@core/i18n';

export async function loadSeed(): Promise<Snapshot> {
  const seed = lang === 'en' ? await import('@core/data/seed.en') : await import('@core/data/seed');
  return structuredClone({
    users: seed.users, schools: seed.schools, organizations: seed.organizations, activities: seed.activities,
    participations: seed.participations, posts: seed.posts, relationships: seed.relationships, proposals: seed.proposals,
    chatRooms: seed.chatRooms, notifications: seed.notifications, reports: [], opportunities: seed.opportunities,
    opportunityIntents: seed.opportunityIntents, timePolls: seed.timePolls, savedSearches: [], networkRequests: seed.networkRequests, introRequests: seed.introRequests,
  });
}
