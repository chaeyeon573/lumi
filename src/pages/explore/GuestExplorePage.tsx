import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Bookmark, Users } from 'lucide-react';
import { lang } from '@core/i18n';
import { api } from '@core/api';
import type { Opportunity, Organization } from '@core/types';
import { closesToday, homeRegionOf, nearCampus, type PublicExplore } from '@core/lib/publicexplore';
import { recruitmentLabel } from '@core/lib/orglinks';
import { useAppStore } from '@core/store/useAppStore';
import { BottomSheet } from '@/components/ui';
import { BackHeader, PageTitle, SegTabs, BottomCTA, Btn, EmptyCard, ErrorScreen, LoadingCards, InfoNote, Badge } from '@/components/ha';
import { ClubItem, ExploreControls, ListingItem, MoreButton } from './ExploreItems';
import { badgeLabel, badgeTone, ORG_BADGE, clubSort, clubSub, listingMeta, listingWhere, PAGE, readExploreQuery, sortClubs, writeExploreQuery, type ExploreQuery } from './exploreData';
import { campusToday, clubGroups, eventGroups, filterClubs, filterEvents, filterOpportunities, opportunityGroups, sortEvents, sortOpportunities, type ExploreFilter } from './exploreFilters';

const en = lang === 'en';
const SECTIONS = ['events', 'opportunities', 'clubs'] as const;
type Section = typeof SECTIONS[number];
const TITLE: Record<Section, string> = { events: en ? 'Events' : '행사', opportunities: en ? 'Opportunities' : '기회', clubs: en ? 'Clubs' : '동아리' };

/**
 * Explore without an account (PDF S089) — the same Explore tabs, search and filter sheet, read-only, from
 * GET /api/public/explore (official listings + the club directory, no people). Saving, details and joining ask
 * the visitor to join Lumi first. A signed-in person is sent to the real Explore.
 */
export function GuestExplorePage() {
  const { section = 'events' } = useParams();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const me = useAppStore((s) => s.currentUserId);
  const status = useAppStore((s) => s.status);
  const school = params.get('school') ?? 's_berkeley';
  const [data, setData] = useState<PublicExplore | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<{ title: string; body: string } | null>(null);
  const [peek, setPeek] = useState<{ kind: 'listing'; o: Opportunity } | { kind: 'club'; o: Organization } | null>(null);
  const load = () => { setError(null); api.guest.explore(school).then(setData).catch((e) => setError((e as Error).message)); };
  useEffect(load, [school]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === 'ready' && me) return <Navigate to={`/explore/${SECTIONS.includes(section as Section) ? section : 'events'}`} replace />;
  if (!SECTIONS.includes(section as Section)) return <Navigate to={`/guest/explore/events?${params}`} replace />;
  const k = section as Section;
  const keep = new URLSearchParams(); if (params.get('school')) keep.set('school', school);
  const join = () => nav('/start');
  const askToJoin = (what: 'save' | 'club') => setPrompt(what === 'save'
    ? { title: en ? 'Save it on Lumi' : 'Lumi에 저장하기', body: en ? 'Join with your school email to save listings and see who’s going.' : '학교 이메일로 가입하면 저장하고 누가 가는지 볼 수 있어요.' }
    : { title: en ? 'Follow clubs on Lumi' : 'Lumi에서 동아리 팔로우', body: en ? 'Join with your school email to follow clubs and ask to join.' : '학교 이메일로 가입하면 동아리를 팔로우하고 가입을 요청할 수 있어요.' });

  return (
    <div className="min-h-full flex flex-col bg-bg">
      <BackHeader title={en ? 'Explore without an account' : '가입 없이 둘러보기'} onBack={() => nav('/welcome')} />
      <PageTitle title={en ? 'Explore' : '탐색'} sub={data?.school ? (en ? `${data.school.name} · public listings` : `${data.school.name} · 공개 목록`) : undefined} className="pb-2" />
      <SegTabs className="mx-4" value={k} tabs={SECTIONS.map((s) => ({ key: s, label: TITLE[s], to: `/guest/explore/${s}${keep.toString() ? `?${keep}` : ''}` }))} />
      <div className="px-4 pt-4 pb-6 flex-1">
        {error ? <ErrorScreen message={error} onRetry={load} />
          : !data ? <LoadingCards />
          : <GuestList key={k} section={k} data={data} params={params} setParams={setParams} onSave={() => askToJoin('save')} onPeek={setPeek} />}
      </div>
      <BottomCTA note={<InfoNote>{en ? 'Read-only. People, meetups and chats are only for students who join.' : '읽기 전용이에요. 사람·모임·채팅은 가입한 학생만 봐요.'}</InfoNote>}>
        <Btn full size="lg" onClick={join}>{en ? 'Join Lumi' : 'Lumi 가입하기'}</Btn>
      </BottomCTA>

      <BottomSheet open={!!prompt} onClose={() => setPrompt(null)} title={prompt?.title ?? ''}>
        <p className="text-[14px] text-ink-2 -mt-1 mb-4">{prompt?.body}</p>
        <div className="grid grid-cols-2 gap-2.5">
          <Btn variant="outline" onClick={() => setPrompt(null)}>{en ? 'Not now' : '나중에'}</Btn>
          <Btn onClick={join}>{en ? 'Join Lumi' : '가입하기'}</Btn>
        </div>
      </BottomSheet>
      <BottomSheet open={!!peek} onClose={() => setPeek(null)} title={peek ? (peek.kind === 'listing' ? peek.o.title : peek.o.name) : ''}>
        {peek?.kind === 'listing' && (
          <div className="space-y-3 pb-1">
            <Badge tone={badgeTone(peek.o)}>{badgeLabel(peek.o)}</Badge>
            <p className="text-[13.5px] text-ink-3">{[listingMeta(peek.o), listingWhere(peek.o)].filter(Boolean).join(' · ')}</p>
            {peek.o.description && <p className="text-[14px] text-ink-2 leading-relaxed line-clamp-6 whitespace-pre-wrap">{peek.o.description}</p>}
            {peek.o.sourceUrl && <a href={peek.o.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[14px] font-semibold text-sel-fg">{en ? 'View source' : '원문 보기'}<ArrowUpRight size={15} /></a>}
            <Btn full variant="outline" icon={<Bookmark size={16} />} onClick={() => { setPeek(null); askToJoin('save'); }}>{en ? 'Save' : '저장'}</Btn>
          </div>
        )}
        {peek?.kind === 'club' && (
          <div className="space-y-3 pb-1">
            <Badge tone="mint">{ORG_BADGE[peek.o.type]}</Badge>
            {peek.o.description && <p className="text-[14px] text-ink-2 leading-relaxed line-clamp-6">{peek.o.description}</p>}
            {recruitmentLabel(peek.o.recruitment) && <p className="text-[13.5px] text-ink-3">{recruitmentLabel(peek.o.recruitment)!.text}</p>}
            {peek.o.links?.[0] && <a href={peek.o.links[0].url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[14px] font-semibold text-sel-fg">{peek.o.links[0].label}<ArrowUpRight size={15} /></a>}
            <Btn full variant="outline" icon={<Users size={16} />} onClick={() => { setPeek(null); askToJoin('club'); }}>{en ? 'Follow' : '팔로우'}</Btn>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

function GuestList({ section, data, params, setParams, onSave, onPeek }: {
  section: Section; data: PublicExplore; params: URLSearchParams; setParams: (p: URLSearchParams, o?: { replace?: boolean }) => void;
  onSave: () => void; onPeek: (x: { kind: 'listing'; o: Opportunity } | { kind: 'club'; o: Organization }) => void;
}) {
  const query = readExploreQuery(params);
  const { q, type } = query;
  const sort = section === 'clubs' ? clubSort(query.sort) : query.sort;
  const set = (patch: Partial<ExploreQuery>) => setParams(writeExploreQuery(params, patch), { replace: true });
  const [shown, setShown] = useState(PAGE);
  const key = params.toString();
  useEffect(() => setShown(PAGE), [key]);
  const day = useMemo(() => campusToday(), []);
  // a visitor has no profile to rank by: listings that close today are hidden (nothing left to do with them), and
  // Recommended puts campus / home-region (Bay Area) ones first (lib/publicexplore, same rule as the server's cap) — not a national listing in DC (ux-sim 2026-11-06, guest-internships-far-and-closing)
  const opps = useMemo(() => data.opportunities.filter((o) => !closesToday(o)), [data]);
  const groups = useMemo(() => (section === 'events' ? eventGroups(data.events, query) : section === 'opportunities' ? opportunityGroups(opps, query) : clubGroups()),
    [section, data, opps, type, query.region]); // eslint-disable-line react-hooks/exhaustive-deps
  /** the list and the sheet's live count go through the same filter */
  const count = (f: ExploreFilter) => (section === 'events' ? filterEvents(data.events, [], f, day).length
    : section === 'opportunities' ? filterOpportunities(opps, f, { today: day }).length : filterClubs(data.clubs, f).length);
  const listings = useMemo(() => {
    if (section === 'events') return sortEvents(filterEvents(data.events, [], query, day), sort).flatMap((x) => (x.kind === 'listing' ? [x.o] : []));
    if (section !== 'opportunities') return [];
    const home = data.school ? homeRegionOf(data.school.name) : undefined;
    const near = (o: Opportunity) => (data.school && nearCampus(o, data.school.id, home) ? 1 : 0);
    return sortOpportunities(filterOpportunities(opps, query, { today: day }), sort, near);
  }, [section, data, opps, key, day]); // eslint-disable-line react-hooks/exhaustive-deps
  const clubs = useMemo(() => (section === 'clubs' ? sortClubs(filterClubs(data.clubs, query), sort) : []), [section, data, key]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = section === 'clubs' ? clubs.length : listings.length;
  const placeholder = section === 'events' ? (en ? 'Search events' : '행사 검색') : section === 'opportunities' ? (en ? 'Search opportunities' : '기회 검색') : (en ? 'Search clubs' : '동아리 검색');
  return (
    <>
      <ExploreControls placeholder={placeholder} q={q} onQ={(x) => set({ q: x })}
        filters={{ groups, values: { ...query, sort }, onApply: (v) => set(v as Partial<ExploreQuery>), count: (d) => count({ ...query, ...d }) }} />
      {total === 0 ? (
        <EmptyCard title={q ? (en ? 'Nothing matches that' : '맞는 결과가 없어요') : section === 'events' ? (en ? 'Nothing coming up yet' : '다가오는 행사가 아직 없어요') : (en ? 'Nothing listed yet' : '아직 목록이 없어요')}
          sub={q ? (en ? `Nothing for “${q}”.` : `“${q}” 검색 결과가 없어요.`) : undefined} secondary={q ? { label: en ? 'Clear search' : '검색 지우기', onClick: () => set({ q: '' }) } : undefined} />
      ) : section === 'clubs' ? (
        <div className="space-y-3">{clubs.slice(0, shown).map((o) => <ClubItem key={o.id} o={o} sub={clubSub(o)} onClick={() => onPeek({ kind: 'club', o })} />)}</div>
      ) : (
        <div className="space-y-3">{listings.slice(0, shown).map((o) => <ListingItem key={o.id} o={o} people={false} saved={false} onSave={onSave} onOpen={() => onPeek({ kind: 'listing', o })} />)}</div>
      )}
      <MoreButton left={total - shown} onClick={() => setShown((n) => n + PAGE)} />
    </>
  );
}
