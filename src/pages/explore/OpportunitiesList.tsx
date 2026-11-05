import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bookmark, Trophy } from 'lucide-react';
import { lang } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { scoreListings } from '@core/lib/foryou';
import { categoriesOf, isGradStudent, spreadByHost } from '@core/lib/listings';
import { Chip, ChipRow, EmptyCard, EmptyState } from '@/components/ha';
import { ExploreControls, ListingItem, MoreButton } from './ExploreItems';
import { fitsAudience, inOppType, isOpen, listingMatches, OPP_TYPES, PAGE, sortListings } from './exploreData';
import { useExploreParams, useSaved } from './EventsList';

const en = lang === 'en';

/**
 * Explore · Opportunities (PDF S018) — internships, research, scholarships, hackathons, study abroad.
 * Search + Recommended / Newest / Ending soon; the type filter stays as a second chip row, with Saved when you have any.
 */
export function OpportunitiesList() {
  const nav = useNavigate();
  const me = useViewer().me;
  const { q, sort, type, set } = useExploreParams();
  const opps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const orgs = useAppStore((s) => s.organizations);
  const relationships = useAppStore((s) => s.relationships);
  const schools = useAppStore((s) => s.schools);
  const saved = useSaved();
  const [shown, setShown] = useState(PAGE);
  useEffect(() => setShown(PAGE), [q, sort, type]);
  const mySchool = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  const grad = isGradStudent(me);

  // open listings for my school or everyone; research / scholarships only for my level (undergrad vs grad)
  const base = useMemo(() => opps.filter((o) => o.type !== 'event' && o.type !== 'activity' && o.type !== 'club'
    && (!o.schoolId || o.schoolId === mySchool) && isOpen(o)
    && (!(categoriesOf(o).includes('research') || categoriesOf(o).includes('scholarship')) || fitsAudience(o, grad))), [opps, mySchool, grad]);
  const scores = useMemo(() => scoreListings({ opportunities: opps, opportunityIntents: intents, organizations: orgs, relationships, schools }, me, base), [opps, intents, orgs, relationships, schools, me, base]);
  const counts = useMemo(() => { const c = new Map<string, number>(); for (const o of base) for (const k of categoriesOf(o)) c.set(k, (c.get(k) ?? 0) + 1); return c; }, [base]);
  const savedCount = useMemo(() => base.filter((o) => saved.ids.has(o.id)).length, [base, saved.ids]);
  const types = OPP_TYPES.filter((t) => (counts.get(t.key) ?? 0) > 0 || type === t.key);

  const list = useMemo(() => {
    const xs = base.filter((o) => (type === 'saved' ? saved.ids.has(o.id) : inOppType(o, type)) && listingMatches(o, q));
    const sorted = sortListings(xs, sort, (o) => scores.get(o.id)?.score ?? -1);
    // the same company ten times in a row reads like an ad board — spread hosts in Recommended
    return sort === 'recommended' ? spreadByHost(sorted) : sorted;
  }, [base, type, q, sort, scores, saved.ids]);

  return (
    <div>
      <ExploreControls placeholder={en ? 'Search opportunities' : '기회 검색'} q={q} onQ={(x) => set({ q: x })} sort={sort} onSort={(s) => set({ sort: s })}>
        <ChipRow>
          {/* Saved first — /profile/saved lands here (?type=saved) and the chosen chip must be in view */}
          {(savedCount > 0 || type === 'saved') && <Chip size="sm" active={type === 'saved'} onClick={() => set({ type: type === 'saved' ? '' : 'saved' })} icon={<Bookmark size={13} fill={type === 'saved' ? 'currentColor' : 'none'} />}>{en ? `Saved ${savedCount}` : `저장 ${savedCount}`}</Chip>}
          {types.map((t) => <Chip key={t.key} size="sm" active={type === t.key} onClick={() => set({ type: type === t.key ? '' : t.key })}>{t.label}</Chip>)}
        </ChipRow>
      </ExploreControls>
      {base.length === 0 ? (
        <EmptyState icon={<Trophy size={30} />} tone="peach" title={en ? 'No open listings yet' : '열린 공고가 아직 없어요'} sub={en ? 'Internships, research and scholarships appear here while they are open.' : '인턴·연구·장학금이 열려 있는 동안 여기에 보여요.'} />
      ) : list.length === 0 ? (
        type === 'saved'
          ? <EmptyCard title={en ? 'Nothing saved yet' : '저장한 공고가 없어요'} sub={en ? 'Tap the bookmark on a listing to keep it here.' : '공고의 책갈피를 누르면 여기에 모여요.'} secondary={{ label: en ? 'See all' : '모두 보기', onClick: () => set({ type: '' }) }} />
          : <EmptyCard title={en ? 'No listings match that' : '맞는 공고가 없어요'} sub={q ? (en ? `Nothing for “${q}”.` : `“${q}” 검색 결과가 없어요.`) : undefined} secondary={{ label: en ? 'Clear filters' : '필터 지우기', onClick: () => set({ q: '', type: '' }) }} />
      ) : (
        <div className="space-y-3">
          {list.slice(0, shown).map((o) => <ListingItem key={o.id} o={o} saved={saved.ids.has(o.id)} onSave={() => saved.toggle(o)} onOpen={() => nav(`/opportunities/${o.id}`)} />)}
        </div>
      )}
      <MoreButton left={list.length - shown} onClick={() => setShown((n) => n + PAGE)} />
    </div>
  );
}
