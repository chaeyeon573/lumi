import { Navigate, useParams } from 'react-router-dom';
import { CalendarDays, Trophy, Users } from 'lucide-react';
import { lang } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { Screen, TitleHeader, SegTabs, ErrorScreen, LoadingCards, TONE, CATEGORY_TONE } from '@/components/ha';
import { EventsList } from './EventsList';
import { OpportunitiesList } from './OpportunitiesList';
import { ClubsList } from './ClubsList';

const en = lang === 'en';

/** Explore 의 세 칸 — 홈의 카테고리 타일도 같은 주소로 온다 (PDF S017·S018·S019) */
export const EXPLORE_SECTIONS = {
  events: { title: en ? 'Events' : '행사', sub: en ? 'Campus events and happenings' : '캠퍼스 행사와 소식', Icon: CalendarDays, tone: TONE[CATEGORY_TONE.events] },
  opportunities: { title: en ? 'Opportunities' : '기회', sub: en ? 'Internships, research, competitions' : '인턴·연구·장학금·공모전', Icon: Trophy, tone: TONE[CATEGORY_TONE.opportunities] },
  clubs: { title: en ? 'Clubs' : '동아리', sub: en ? 'Find your community' : '나에게 맞는 모임 찾기', Icon: Users, tone: TONE[CATEGORY_TONE.clubs] },
} as const;
export type ExploreSection = keyof typeof EXPLORE_SECTIONS;
const SECTIONS = Object.keys(EXPLORE_SECTIONS) as ExploreSection[];

/** /explore → 첫 칸(Events). PDF 의 Explore 는 늘 칸 하나가 열려 있다 */
export function ExploreIndex() {
  return <Navigate to="/explore/events" replace />;
}

/**
 * Explore 탭 (PDF S017 Events · S018 Opportunities · S019 Clubs) — 큰 제목 + 검색·알림·메시지, 밑줄 탭.
 * 칸마다 검색 + 필터 한 줄(FilterBar → FilterSheet) + 카드 (EventsList · OpportunitiesList · ClubsList).
 * 탭은 주소(/explore/:section), 검색·필터는 쿼리(?q · ?sort · ?type · ?region · ?when …) — 상세에서 뒤로 오면 같은 칸·필터로.
 * 탭을 바꾸면 검색·칩은 새로 (칸마다 칩 종류가 다르다).
 */
export function ExplorePage() {
  const { section } = useParams();
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  if (!SECTIONS.includes(section as ExploreSection)) return <Navigate to="/explore/events" replace />;
  const k = section as ExploreSection;
  return (
    <Screen>
      <TitleHeader title={en ? 'Explore' : '탐색'}>
        <SegTabs value={k} tabs={SECTIONS.map((s) => ({ key: s, label: EXPLORE_SECTIONS[s].title, to: `/explore/${s}` }))} />
      </TitleHeader>
      {status === 'loading' && <LoadingCards className="px-4 pt-4" />}
      {status === 'error' && <ErrorScreen message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && (
        <div className="px-4 pt-4">
          {k === 'events' && <EventsList />}
          {k === 'opportunities' && <OpportunitiesList />}
          {k === 'clubs' && <ClubsList />}
        </div>
      )}
    </Screen>
  );
}
