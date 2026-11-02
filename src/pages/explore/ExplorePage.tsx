import { useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, Trophy, Users, ChevronRight, Search } from 'lucide-react';
import { lang } from '@core/i18n';
import { AppHeader } from '@/components/layout/AppHeader';
import { TopBar } from '@/components/layout/TopBar';
import { CardSkeleton, ErrorState } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { cn } from '@core/lib/cn';
import { BrowseTab } from '@/pages/community/BrowseTab';
import { schoolLabel } from '@/pages/home/HomeDashboard';
import { MeetupRow } from '@/pages/meet/MeetPage';
import { useMemo, useState } from 'react';
import { Chip } from '@/components/ui';
import { todayISO } from '@core/lib/format';
import { nowMin, toMin } from '@core/lib/timetable';

const en = lang === 'en';

/** Explore 에서 들어가는 세 곳 — 홈의 카드도 같은 주소로 온다 */
export const EXPLORE_SECTIONS = {
  events: { title: en ? 'Events' : '행사', sub: en ? 'Campus events and happenings' : '캠퍼스 행사와 소식', Icon: CalendarDays, tone: 'bg-[#EAF0FF] text-[#4B63D8] v2:bg-[#1D2140] v2:text-[#9DB0FF]' },
  opportunities: { title: en ? 'Opportunities' : '기회', sub: en ? 'Internships, research, competitions' : '인턴·연구·장학금·공모전', Icon: Trophy, tone: 'bg-[#FFF3E2] text-[#D98A12] v2:bg-[#2E2416] v2:text-[#FFC266]' },
  clubs: { title: en ? 'Clubs & Groups' : '동아리·그룹', sub: en ? 'Find your community' : '나에게 맞는 모임 찾기', Icon: Users, tone: 'bg-[#E6F6F3] text-[#1F9A86] v2:bg-[#14292A] v2:text-[#6FE0CB]' },
} as const;
export type ExploreSection = keyof typeof EXPLORE_SECTIONS;

/** Explore — 캠퍼스 정보 카테고리를 모은 허브 (2026-11-02 사장님 시안, Discover 칸은 빼기로) */
export function ExplorePage() {
  const nav = useNavigate();
  const me = useViewer().me;
  return (
    <div className="min-h-full pb-8 bg-bg">
      <AppHeader />
      <div className="px-4 pt-2">
        <h1 className="font-display text-[28px] font-extrabold tracking-tight">{en ? 'Explore' : '탐색'}</h1>
        <p className="text-[14px] text-ink-3 mt-1">{en ? `Discover more at ${schoolLabel(me) ?? 'your campus'}.` : `${schoolLabel(me) ?? '우리 학교'}에서 더 찾아보기`}</p>
        <button onClick={() => nav('/search')} className="mt-4 w-full h-12 rounded-2xl border border-line bg-surface flex items-center gap-2.5 px-4 text-left text-[14px] text-ink-3 press">
          <Search size={18} />{en ? 'Search events, opportunities, clubs…' : '행사·기회·동아리 검색'}
        </button>
        <div className="mt-4 space-y-2.5">
          {(Object.keys(EXPLORE_SECTIONS) as ExploreSection[]).map((k) => { const s = EXPLORE_SECTIONS[k]; return (
            <button key={k} onClick={() => nav(`/explore/${k}`)} className="w-full card rounded-[20px] p-4 flex items-center gap-3.5 text-left press">
              <span className={cn('h-12 w-12 rounded-2xl grid place-items-center shrink-0', s.tone)}><s.Icon size={22} /></span>
              <span className="flex-1 min-w-0"><span className="block text-[16px] font-bold">{s.title}</span><span className="block text-[13px] text-ink-3 truncate">{s.sub}</span></span>
              <ChevronRight size={18} className="text-ink-3 shrink-0" />
            </button>); })}
        </div>
      </div>
    </div>
  );
}

/** Explore › Events / Opportunities / Clubs & Groups — 캠퍼스 › 찾기 목록을 그 칸의 칩만 남겨 다시 쓴다 */
export function ExploreSectionPage() {
  const { section } = useParams();
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const k: ExploreSection = section === 'events' || section === 'clubs' ? section : 'opportunities';
  return (
    <div className="min-h-full pb-8 bg-bg">
      <TopBar back title={EXPLORE_SECTIONS[k].title} />
      {status === 'loading' && <CardSkeleton />}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && (
        <div className="px-4 pt-3">
          {k === 'events' && <><OrgEvents /><BrowseTab only={['event']} defaultSub="event" extras={false} /></>}
          {k === 'opportunities' && <BrowseTab only={['foryou', 'internship', 'research', 'scholarship', 'hackathon', 'startup', 'exchange']} defaultSub="foryou" />}
          {k === 'clubs' && <BrowseTab only={['clubs']} defaultSub="clubs" extras={false} />}
        </div>
      )}
    </div>
  );
}

/** 동아리·Greek 이 Lumi 에 올린 행사 — 학교 공식 행사 목록 위에 (사장님 시안: 조직 행사 → 발견 → RSVP). 없으면 칸을 숨긴다 */
function OrgEvents() {
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const [f, setF] = useState<'' | 'clubs' | 'greek'>('');
  const today = todayISO();
  const list = useMemo(() => v.visibleActivities
    .filter((a) => a.kind === 'org_event' && a.orgId)
    .filter((a) => a.date > today || (a.date === today && toMin(a.endTime || a.startTime) > nowMin()))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)), [v, today]);
  const typeOf = (id?: string) => orgs.find((o) => o.id === id)?.type;
  const shown = list.filter((a) => !f || (f === 'greek' ? typeOf(a.orgId) === 'greek' : typeOf(a.orgId) !== 'greek'));
  if (!list.length) return null;
  return (
    <section className="mb-5">
      <h2 className="text-[17px] font-bold mb-2">{en ? 'From clubs & Greek life' : '동아리·Greek 행사'}</h2>
      <div className="flex gap-1.5 mb-2.5">
        <Chip size="sm" active={!f} onClick={() => setF('')}>{en ? 'All' : '전체'}</Chip>
        <Chip size="sm" active={f === 'clubs'} onClick={() => setF('clubs')}>{en ? 'Clubs' : '동아리'}</Chip>
        <Chip size="sm" active={f === 'greek'} onClick={() => setF('greek')}>Greek</Chip>
      </div>
      <div className="space-y-2.5">{shown.slice(0, 5).map((a) => <MeetupRow key={a.id} a={a} />)}</div>
      {shown.length === 0 && <p className="text-[13px] text-ink-3">{en ? 'Nothing here yet.' : '아직 없어요.'}</p>}
    </section>
  );
}
