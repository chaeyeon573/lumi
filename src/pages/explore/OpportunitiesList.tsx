import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { lang } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { scoreListings } from '@core/lib/foryou';
import { audienceFits, isGradStudent } from '@core/lib/listings';
import { EmptyCard, EmptyState } from '@/components/ha';
import { ExploreControls, ListingItem, MoreButton } from './ExploreItems';
import { isOpen, PAGE } from './exploreData';
import { campusToday, filterOpportunities, opportunityGroups, sortOpportunities } from './exploreFilters';
import { useExploreParams, useSaved } from './EventsList';

const en = lang === 'en';

/**
 * Explore · Opportunities (PDF S018) — internships, research, scholarships, hackathons, study abroad.
 * Search + one filter row; the sheet holds Sort · Type · Location (?region=, only places that have listings) ·
 * Deadline (?due=) · For (PhD/MS, ?kind=phd, grad students only) · Saved (?saved=1, once something is saved).
 */
export function OpportunitiesList() {
  const nav = useNavigate();
  const me = useViewer().me;
  const { q, sort, type, region, kind, due, saved: onlySaved, query, set, apply } = useExploreParams();
  const opps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const orgs = useAppStore((s) => s.organizations);
  const relationships = useAppStore((s) => s.relationships);
  const schools = useAppStore((s) => s.schools);
  const saved = useSaved();
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [q, sort, type, region, kind, due, onlySaved]);
  const mySchool = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';

  // open listings for my school or everyone, only for my level (undergrad vs grad — @core/lib/listings audienceFits)
  const base = useMemo(() => opps.filter((o) => o.type !== 'event' && o.type !== 'activity' && o.type !== 'club'
    && (!o.schoolId || o.schoolId === mySchool) && isOpen(o) && audienceFits(me, o)), [opps, mySchool, me]);
  const scores = useMemo(() => scoreListings({ opportunities: opps, opportunityIntents: intents, organizations: orgs, relationships, schools }, me, base), [opps, intents, orgs, relationships, schools, me, base]);
  const savedCount = useMemo(() => base.filter((o) => saved.ids.has(o.id)).length, [base, saved.ids]);
  const day = useMemo(() => campusToday(), []);
  const ctx = useMemo(() => ({ saved: saved.ids, today: day }), [saved.ids, day]);
  const groups = useMemo(() => opportunityGroups(base, query, { grad: isGradStudent(me), savedCount }), [base, type, region, kind, onlySaved, me, savedCount]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = useMemo(() => sortOpportunities(filterOpportunities(base, query, ctx), sort, (o) => scores.get(o.id)?.score ?? -1, true),
    [base, q, type, region, kind, due, onlySaved, ctx, sort, scores]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <ExploreControls placeholder={en ? 'Search opportunities' : '기회 검색'} q={q} onQ={(x) => set({ q: x })}
        filters={{ groups, values: query, onApply: apply, count: (d) => filterOpportunities(base, { ...query, ...d }, ctx).length }} />
      {base.length === 0 ? (
        <EmptyState icon={<Trophy size={30} />} tone="peach" title={en ? 'No open listings yet' : '열린 공고가 아직 없어요'} sub={en ? 'Internships, research and scholarships appear here while they are open.' : '인턴·연구·장학금이 열려 있는 동안 여기에 보여요.'} />
      ) : list.length === 0 ? (
        onlySaved && savedCount === 0
          ? <EmptyCard title={en ? 'Nothing saved yet' : '저장한 공고가 없어요'} sub={en ? 'Tap the bookmark on a listing to keep it here.' : '공고의 책갈피를 누르면 여기에 모여요.'} secondary={{ label: en ? 'See all' : '모두 보기', onClick: () => set({ saved: '' }) }} />
          : <EmptyCard title={en ? 'No listings match that' : '맞는 공고가 없어요'} sub={q ? (en ? `Nothing for “${q}”.` : `“${q}” 검색 결과가 없어요.`) : undefined} secondary={{ label: en ? 'Clear filters' : '필터 지우기', onClick: () => set({ q: '', type: '', region: '', kind: '', due: '', saved: '' }) }} />
      ) : (
        <div className="space-y-3">
          {list.slice(0, shown).map((o) => <ListingItem key={o.id} o={o} saved={saved.ids.has(o.id)} onSave={() => saved.toggle(o)} onOpen={() => nav(`/opportunities/${o.id}`)} />)}
        </div>
      )}
      <MoreButton left={list.length - shown} onClick={() => setShown((n) => n + PAGE)} />
    </div>
  );
}
