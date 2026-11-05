import { Navigate, useParams } from 'react-router-dom';
import { CalendarDays, Trophy, Users } from 'lucide-react';
import { lang } from '@core/i18n';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { BrowseTab } from '@/pages/community/BrowseTab';
import { MeetupRow } from '@/pages/meet/MeetPage';
import { useMemo, useState } from 'react';
import { Chip } from '@/components/ui';
import { Screen, TitleHeader, SegTabs, ErrorScreen, LoadingCards, TONE, CATEGORY_TONE } from '@/components/ha';
import { todayISO } from '@core/lib/format';
import { nowMin, toMin } from '@core/lib/timetable';

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
 * 칸 안의 목록은 아직 예전 찾기 목록(BrowseTab)을 그대로 쓴다 — Explore 작업 묶음(PLAN.md WP2)이 PDF 카드로 바꾼다.
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
          {k === 'events' && <><OrgEvents /><BrowseTab only={['event']} defaultSub="event" extras={false} /></>}
          {k === 'opportunities' && <BrowseTab only={['foryou', 'internship', 'research', 'scholarship', 'hackathon', 'startup', 'exchange']} defaultSub="foryou" />}
          {k === 'clubs' && <BrowseTab only={['clubs']} defaultSub="clubs" extras={false} />}
        </div>
      )}
    </Screen>
  );
}

/** 동아리·Greek 이 Lumi 에 올린 행사 — 학교 공식 행사 목록 위에 (사장님 시안: 조직 행사 → 발견 → RSVP). 없으면 칸을 숨긴다 */
function OrgEvents() {
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const [f, setF] = useState<'' | 'clubs' | 'greek' | 'coop'>('');
  const today = todayISO();
  const list = useMemo(() => v.visibleActivities
    .filter((a) => a.kind === 'org_event' && a.orgId)
    .filter((a) => a.date > today || (a.date === today && toMin(a.endTime || a.startTime) > nowMin()))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)), [v, today]);
  const typeOf = (id?: string) => orgs.find((o) => o.id === id)?.type;
  const shown = list.filter((a) => !f || (f === 'clubs' ? !['greek', 'coop'].includes(typeOf(a.orgId) ?? '') : typeOf(a.orgId) === f));
  if (!list.length) return null;
  return (
    <section className="mb-5">
      <h2 className="text-[17px] font-bold mb-2">{en ? 'From clubs, Greek life & co-ops' : '동아리·Greek·코업 행사'}</h2>
      <div className="flex gap-1.5 mb-2.5">
        <Chip size="sm" active={!f} onClick={() => setF('')}>{en ? 'All' : '전체'}</Chip>
        <Chip size="sm" active={f === 'clubs'} onClick={() => setF('clubs')}>{en ? 'Clubs' : '동아리'}</Chip>
        <Chip size="sm" active={f === 'greek'} onClick={() => setF('greek')}>Greek</Chip>
        <Chip size="sm" active={f === 'coop'} onClick={() => setF('coop')}>{en ? 'Co-ops' : '코업'}</Chip>
      </div>
      <div className="space-y-2.5">{shown.slice(0, 5).map((a) => <MeetupRow key={a.id} a={a} />)}</div>
      {shown.length === 0 && <p className="text-[13px] text-ink-3">{en ? 'Nothing here yet.' : '아직 없어요.'}</p>}
    </section>
  );
}
