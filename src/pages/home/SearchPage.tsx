import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, CalendarDays, Trophy, Users, Coffee, X } from 'lucide-react';
import { lang } from '@core/i18n';
import { BackHeader, PageTitle, SearchField, SegTabs, RowCard, SectionHeader, CategoryGrid, CategoryTile, CATEGORY_TONE, EmptyCard } from '@/components/ha';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { campusDate } from '@core/lib/listings';
import { campusToday } from '@core/lib/withpeople';
import { formatDate, formatTime } from '@core/lib/format';
import { ORG_TYPE_LABELS } from '@core/lib/labels';
import { PersonItem } from '@/components/people/PeopleBits';
import { MeetupItem, studentMeetups } from '@/components/social/MeetupBits';
import { matchesPerson } from '@/pages/social/SocialPage';

const en = lang === 'en';
type Tab = 'all' | 'people' | 'events' | 'clubs';
/** 최근 검색 — 이 기기의 편의 기능 (서버에 보내지 않는다) */
const RECENT_KEY = 'lumi.search.recent.v1';
const readRecent = (): string[] => { try { const x = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); return Array.isArray(x) ? x.filter((s) => typeof s === 'string').slice(0, 5) : []; } catch { return []; } };
const writeRecent = (list: string[]) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 5))); } catch { /* 사생활 보호 모드 */ } };

/**
 * Search Lumi (PDF S056) — 검색 칸, All · People · Events · Clubs, 검색 전에는 최근 검색 + Explore more 2×2.
 * 사람은 보이는 항목으로만 (서버가 공개 범위 밖은 보내지 않는다), 행사는 앞으로 있는 것만, 동아리는 내 학교 것.
 */
export function SearchPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (['people', 'events', 'clubs'].includes(params.get('tab') ?? '') ? params.get('tab') : 'all') as Tab;
  const q = params.get('q') ?? '';
  const setQ = (next: string) => setParams((p) => { const n = new URLSearchParams(p); if (next) n.set('q', next); else n.delete('q'); return n; }, { replace: true });
  const setTab = (t: string) => setParams((p) => { const n = new URLSearchParams(p); if (t === 'all') n.delete('tab'); else n.set('tab', t); return n; }, { replace: true });
  const [recent, setRecent] = useState(readRecent);
  const remember = (s: string) => { const x = s.trim(); if (!x) return; const next = [x, ...recent.filter((r) => r.toLowerCase() !== x.toLowerCase())].slice(0, 5); setRecent(next); writeRecent(next); };
  const forget = (s: string) => { const next = recent.filter((r) => r !== s); setRecent(next); writeRecent(next); };
  const v = useViewer();
  const parts = useAppStore((s) => s.participations);
  const orgs = useAppStore((s) => s.organizations);
  const opps = useAppStore((s) => s.opportunities);
  const norm = q.trim().toLowerCase();
  const school = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : '';
  const res = useMemo(() => {
    if (!norm) return { people: [], meetups: [], events: [], clubs: [] };
    const has = (...xs: (string | undefined)[]) => xs.some((s) => !!s && s.toLowerCase().includes(norm));
    const today = campusToday();
    return {
      people: v.visibleUsers.filter((u) => matchesPerson(u, norm)).slice(0, 30),
      meetups: studentMeetups(v.visibleActivities, v.me, parts).filter((a) => has(a.title, a.description, a.place?.name)).slice(0, 20),
      events: opps.filter((o) => o.type === 'event' && !!o.date && campusDate(o.date) >= today && (!o.schoolId || o.schoolId === school) && has(o.title, o.host, o.place?.name, ...o.tags))
        .sort((a, b) => `${campusDate(a.date!)}${a.startTime}`.localeCompare(`${campusDate(b.date!)}${b.startTime}`)).slice(0, 20),
      clubs: orgs.filter((o) => (!o.schoolId || o.schoolId === school) && has(o.name, o.description)).slice(0, 20),
    };
  }, [norm, v, parts, opps, orgs, school]);
  const total = res.people.length + res.meetups.length + res.events.length + res.clubs.length;
  const go = (path: string) => { remember(q); nav(path); };

  const people = (n: number) => res.people.slice(0, n).map((u) => <div key={u.id} onClickCapture={() => remember(q)}><PersonItem user={u} /></div>);
  const events = (n: number) => [
    ...res.events.slice(0, n).map((o) => <RowCard key={o.id} tone="ice" icon={<CalendarDays size={20} />} title={o.title} sub={[`${formatDate(campusDate(o.date!))}${o.startTime ? ` ${formatTime(o.startTime)}` : ''}`, o.place?.name].filter(Boolean).join(' · ')} onClick={() => go(`/opportunities/${o.id}`)} />),
    ...res.meetups.slice(0, n).map((a) => <div key={a.id} onClickCapture={() => remember(q)}><MeetupItem a={a} /></div>),
  ];
  const clubs = (n: number) => res.clubs.slice(0, n).map((o) => <RowCard key={o.id} tone="mint" icon={<Users size={20} />} title={o.name} sub={ORG_TYPE_LABELS[o.type]} onClick={() => go(`/orgs/${o.id}`)} />);

  return (
    <div className="min-h-full bg-bg pb-8">
      <BackHeader title={en ? 'Search Lumi' : 'Lumi 검색'} />
      <PageTitle title={en ? 'Search Lumi' : 'Lumi 검색'} className="pb-3" />
      <div className="px-4">
        <form onSubmit={(e) => { e.preventDefault(); remember(e.currentTarget.querySelector('input')?.value ?? q); }}><SearchField autoFocus placeholder={en ? 'Search events, people, clubs…' : '행사, 사람, 동아리 검색…'} value={q} onChange={setQ} /></form>
      </div>
      <SegTabs value={tab} onChange={setTab} className="mx-4 mt-3" tabs={[{ key: 'all', label: en ? 'All' : '전체' }, { key: 'people', label: en ? 'People' : '사람' }, { key: 'events', label: en ? 'Events' : '행사' }, { key: 'clubs', label: en ? 'Clubs' : '동아리' }]} />
      <div className="px-4 pt-5">
        {!norm ? (
          <>
            {recent.length > 0 && (
              <section className="mb-7">
                <SectionHeader title={en ? 'Recent searches' : '최근 검색'} />
                <div className="space-y-3">{recent.map((r, i) => (
                  <RowCard key={r} tone={i % 2 ? 'rose' : 'ice'} icon={<Search size={20} />} title={r} sub={en ? 'Your recent search' : '최근 검색'} onClick={() => setQ(r)}
                    right={<span role="button" tabIndex={0} aria-label={en ? `Remove ${r}` : `${r} 지우기`} onClick={(e) => { e.stopPropagation(); forget(r); }} className="h-8 w-8 grid place-items-center text-ink-3"><X size={16} /></span>} />
                ))}</div>
              </section>
            )}
            <SectionHeader title={en ? 'Explore more' : '더 둘러보기'} />
            <CategoryGrid>
              <CategoryTile tone={CATEGORY_TONE.events} icon={<CalendarDays size={26} />} label={en ? 'Events' : '행사'} onClick={() => nav('/explore/events')} />
              <CategoryTile tone={CATEGORY_TONE.opportunities} icon={<Trophy size={26} />} label={en ? 'Opportunities' : '기회'} onClick={() => nav('/explore/opportunities')} />
              <CategoryTile tone={CATEGORY_TONE.clubs} icon={<Users size={26} />} label={en ? 'Clubs' : '동아리'} onClick={() => nav('/explore/clubs')} />
              <CategoryTile tone={CATEGORY_TONE.meetups} icon={<Coffee size={26} />} label={en ? 'Meetups' : '모임'} onClick={() => nav('/social/meetups')} />
            </CategoryGrid>
          </>
        ) : tab === 'all' ? (
          total ? (
            <div className="space-y-7">
              {res.people.length > 0 && <section><SectionHeader title={en ? 'People' : '사람'} action={res.people.length > 3 ? (en ? 'See all' : '모두 보기') : undefined} onAction={() => setTab('people')} /><div className="space-y-3">{people(3)}</div></section>}
              {(res.events.length + res.meetups.length) > 0 && <section><SectionHeader title={en ? 'Events & meetups' : '행사·모임'} action={(res.events.length + res.meetups.length) > 3 ? (en ? 'See all' : '모두 보기') : undefined} onAction={() => setTab('events')} /><div className="space-y-3">{events(2).slice(0, 3)}</div></section>}
              {res.clubs.length > 0 && <section><SectionHeader title={en ? 'Clubs' : '동아리'} action={res.clubs.length > 3 ? (en ? 'See all' : '모두 보기') : undefined} onAction={() => setTab('clubs')} /><div className="space-y-3">{clubs(3)}</div></section>}
            </div>
          ) : <NoResults q={q} />
        ) : (
          <div className="space-y-3">
            {tab === 'people' && (res.people.length ? people(30) : <NoResults q={q} />)}
            {tab === 'events' && (res.events.length + res.meetups.length ? events(20) : <NoResults q={q} />)}
            {tab === 'clubs' && (res.clubs.length ? clubs(20) : <NoResults q={q} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function NoResults({ q }: { q: string }) {
  return <EmptyCard title={en ? `Nothing for “${q.trim()}” yet` : `“${q.trim()}” 결과가 없어요`} sub={en ? 'Try a shorter word, a club name or a building.' : '짧은 단어, 동아리 이름, 건물 이름으로 찾아보세요.'} />;
}
