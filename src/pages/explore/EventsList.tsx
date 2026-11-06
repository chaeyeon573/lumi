import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { lang } from '@core/i18n';
import type { Activity, Opportunity } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { api } from '@core/api';
import { scoreListings } from '@core/lib/foryou';
import { audienceFits, eventKindsOf } from '@core/lib/listings';
import { todayISO } from '@core/lib/format';
import { nowMin, toMin } from '@core/lib/timetable';
import { Chip, ChipRow, EmptyCard, EmptyState } from '@/components/ha';
import { ClubEventItem, ExploreControls, ListingItem, MoreButton } from './ExploreItems';
import { activityMatches, EVENT_KINDS, inEventKind, isOpen, listingMatches, PAGE, readExploreQuery, sortListings, writeExploreQuery } from './exploreData';

const en = lang === 'en';

/** URL-owned Explore state (?q · ?sort · ?type) — back from a detail returns to the same chip and search */
export function useExploreParams() {
  const [params, setParams] = useSearchParams();
  const query = readExploreQuery(params);
  const set = (patch: Parameters<typeof writeExploreQuery>[1]) => setParams(writeExploreQuery(params, patch), { replace: true });
  return { ...query, set };
}

/** my saved / marked listings — the bookmark on every card (toggleSave) */
export function useSaved() {
  const me = useViewer().me;
  const intents = useAppStore((s) => s.opportunityIntents);
  const run = useAppStore((s) => s.run);
  const ids = useMemo(() => new Set(intents.filter((i) => i.userId === me.id && (i.saved || i.intent !== 'interested')).map((i) => i.opportunityId)), [intents, me.id]);
  const toggle = (o: Opportunity) => run(() => api.opportunities.toggleSave(o.id, me.id), ids.has(o.id) ? undefined : (en ? 'Saved' : '저장했어요'));
  return { ids, toggle };
}

type Item = { kind: 'listing'; o: Opportunity; key: string } | { kind: 'club'; a: Activity; key: string };

/**
 * Explore · Events (PDF S017) — campus events from official sources (ListingCards) and events clubs posted on Lumi
 * (MeetupCards), one list with search and Recommended / Newest / Ending soon. Kinds (free food, talks …) as a second row.
 */
export function EventsList() {
  const nav = useNavigate();
  const v = useViewer();
  const me = v.me;
  const { q, sort, type: kind, set } = useExploreParams();
  const opps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const orgs = useAppStore((s) => s.organizations);
  const relationships = useAppStore((s) => s.relationships);
  const schools = useAppStore((s) => s.schools);
  const saved = useSaved();
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [q, sort, kind]);
  const mySchool = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';

  const events = useMemo(() => opps.filter((o) => o.type === 'event' && (!o.schoolId || o.schoolId === mySchool) && isOpen(o) && audienceFits(me, o)), [opps, mySchool, me]);
  const scores = useMemo(() => scoreListings({ opportunities: opps, opportunityIntents: intents, organizations: orgs, relationships, schools }, me, events), [opps, intents, orgs, relationships, schools, me, events]);
  const today = todayISO();
  const clubEvents = useMemo(() => v.visibleActivities
    .filter((a) => a.kind === 'org_event' && a.orgId && (a.date > today || (a.date === today && toMin(a.endTime || a.startTime) > nowMin()))), [v, today]);
  const kinds = useMemo(() => { const has = new Set(events.flatMap(eventKindsOf)); return EVENT_KINDS.filter((k) => has.has(k.key)); }, [events]);

  const items = useMemo<Item[]>(() => {
    const listings = sortListings(events.filter((o) => inEventKind(o, kind) && listingMatches(o, q)), sort, (o) => scores.get(o.id)?.score ?? -1);
    // club events have no kind tags — they show only under "all"
    const mineOrg = (a: Activity) => orgs.some((o) => o.id === a.orgId && (o.memberIds.includes(me.id) || o.adminIds.includes(me.id) || o.followerIds.includes(me.id)));
    const clubs = kind ? [] : clubEvents.filter((a) => activityMatches(a, q));
    const at = (a: Activity) => `${a.date} ${a.startTime}`;
    const out: Item[] = listings.map((o) => ({ kind: 'listing', o, key: o.id }));
    if (!clubs.length) return out;
    // Recommended: club events posted on Lumi (people you can meet) come first — the ones from clubs I follow before the rest
    if (sort === 'recommended') {
      const club = [...clubs].sort((a, b) => Number(mineOrg(b)) - Number(mineOrg(a)) || at(a).localeCompare(at(b)));
      return [...club.map((a) => ({ kind: 'club' as const, a, key: a.id })), ...out];
    }
    const keyOf = (x: Item) => (x.kind === 'club' ? (sort === 'newest' ? x.a.createdAt : at(x.a)) : (sort === 'newest' ? (x.o.postedAt ?? x.o.createdAt) : (x.o.deadline ?? x.o.date ?? '9999')));
    const all = [...out, ...clubs.map((a) => ({ kind: 'club' as const, a, key: a.id }))];
    return all.sort((a, b) => (sort === 'newest' ? keyOf(b).localeCompare(keyOf(a)) : keyOf(a).localeCompare(keyOf(b))));
  }, [events, clubEvents, kind, q, sort, scores, orgs, me.id]);

  const empty = events.length === 0 && clubEvents.length === 0;
  return (
    <div>
      <ExploreControls placeholder={en ? 'Search events' : '행사 검색'} q={q} onQ={(x) => set({ q: x })} sort={sort} onSort={(s) => set({ sort: s })}>
        {kinds.length > 0 && (
          <ChipRow>
            {kinds.map((k) => <Chip key={k.key} size="sm" active={kind === k.key} onClick={() => set({ type: kind === k.key ? '' : k.key })}>{k.label}</Chip>)}
          </ChipRow>
        )}
      </ExploreControls>
      {empty ? (
        <EmptyState icon={<CalendarDays size={30} />} tone="ice" title={en ? 'Nothing coming up yet' : '다가오는 행사가 아직 없어요'} sub={en ? 'Campus events appear here as soon as the school lists them.' : '학교가 행사를 올리면 바로 여기에 보여요.'} />
      ) : items.length === 0 ? (
        <EmptyCard title={en ? 'No events match that' : '맞는 행사가 없어요'} sub={q ? (en ? `Nothing for “${q}”.` : `“${q}” 검색 결과가 없어요.`) : undefined}
          secondary={{ label: en ? 'Clear filters' : '필터 지우기', onClick: () => set({ q: '', type: '' }) }} />
      ) : (
        <div className="space-y-3">
          {items.slice(0, shown).map((x) => x.kind === 'club'
            ? <ClubEventItem key={x.key} a={x.a} />
            : <ListingItem key={x.key} o={x.o} saved={saved.ids.has(x.o.id)} onSave={() => saved.toggle(x.o)} onOpen={() => nav(`/opportunities/${x.o.id}`)} />)}
        </div>
      )}
      <MoreButton left={items.length - shown} onClick={() => setShown((n) => n + PAGE)} />
    </div>
  );
}
