import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays } from 'lucide-react';
import { lang } from '@core/i18n';
import type { Activity, Opportunity } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { api } from '@core/api';
import { scoreListings } from '@core/lib/foryou';
import { audienceFits } from '@core/lib/listings';
import { todayISO } from '@core/lib/format';
import { nowMin, toMin } from '@core/lib/timetable';
import { EmptyCard, EmptyState, type FilterValues } from '@/components/ha';
import { ClubEventItem, ExploreControls, ListingItem, MoreButton } from './ExploreItems';
import { isOpen, PAGE, readExploreQuery, writeExploreQuery, type ExploreQuery } from './exploreData';
import { campusToday, eventGroups, filterEvents, sortEvents } from './exploreFilters';

const en = lang === 'en';

/**
 * URL-owned Explore state (?q · ?sort · ?type · ?region · ?kind · ?due · ?saved · ?when) — back from a detail returns to the
 * same search and filters. `apply` takes the filter sheet's values.
 */
export function useExploreParams() {
  const [params, setParams] = useSearchParams();
  const query = readExploreQuery(params);
  const set = (patch: Partial<ExploreQuery>) => setParams(writeExploreQuery(params, patch), { replace: true });
  const apply = (v: FilterValues) => set(v as Partial<ExploreQuery>);
  return { ...query, query, set, apply };
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

/**
 * Explore · Events (PDF S017) — campus events from official sources (ListingCards) and events clubs posted on Lumi
 * (MeetupCards), one list with search; Sort · When · Kind live in the filter sheet (exploreFilters).
 */
export function EventsList() {
  const nav = useNavigate();
  const v = useViewer();
  const me = v.me;
  const { q, sort, type: kind, when, query, set, apply } = useExploreParams();
  const opps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const orgs = useAppStore((s) => s.organizations);
  const relationships = useAppStore((s) => s.relationships);
  const schools = useAppStore((s) => s.schools);
  const saved = useSaved();
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [q, sort, kind, when]);
  const mySchool = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';

  const events = useMemo(() => opps.filter((o) => o.type === 'event' && (!o.schoolId || o.schoolId === mySchool) && isOpen(o) && audienceFits(me, o)), [opps, mySchool, me]);
  const scores = useMemo(() => scoreListings({ opportunities: opps, opportunityIntents: intents, organizations: orgs, relationships, schools }, me, events), [opps, intents, orgs, relationships, schools, me, events]);
  const today = todayISO();
  const clubEvents = useMemo(() => v.visibleActivities
    .filter((a) => a.kind === 'org_event' && a.orgId && (a.date > today || (a.date === today && toMin(a.endTime || a.startTime) > nowMin()))), [v, today]);
  const day = useMemo(() => campusToday(), [today]); // eslint-disable-line react-hooks/exhaustive-deps
  const groups = useMemo(() => eventGroups(events, query), [events, query.type]); // eslint-disable-line react-hooks/exhaustive-deps

  const items = useMemo(() => {
    const mine = (a: Activity) => orgs.some((o) => o.id === a.orgId && (o.memberIds.includes(me.id) || o.adminIds.includes(me.id) || o.followerIds.includes(me.id)));
    return sortEvents(filterEvents(events, clubEvents, query, day), sort, { score: (o) => scores.get(o.id)?.score ?? -1, mine });
  }, [events, clubEvents, q, kind, when, sort, scores, orgs, me.id, day]); // eslint-disable-line react-hooks/exhaustive-deps

  const empty = events.length === 0 && clubEvents.length === 0;
  return (
    <div>
      <ExploreControls placeholder={en ? 'Search events' : '행사 검색'} q={q} onQ={(x) => set({ q: x })}
        filters={{ groups, values: query, onApply: apply, count: (d) => filterEvents(events, clubEvents, { ...query, ...d }, day).length }} />
      {empty ? (
        <EmptyState icon={<CalendarDays size={30} />} tone="ice" title={en ? 'Nothing coming up yet' : '다가오는 행사가 아직 없어요'} sub={en ? 'Campus events appear here as soon as the school lists them.' : '학교가 행사를 올리면 바로 여기에 보여요.'} />
      ) : items.length === 0 ? (
        <EmptyCard title={en ? 'No events match that' : '맞는 행사가 없어요'} sub={q ? (en ? `Nothing for “${q}”.` : `“${q}” 검색 결과가 없어요.`) : undefined}
          secondary={{ label: en ? 'Clear filters' : '필터 지우기', onClick: () => set({ q: '', type: '', when: '' }) }} />
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
