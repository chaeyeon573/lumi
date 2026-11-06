/**
 * Explore filter sheet (owner 2026-11-06) — URL ⇄ filters, and the sheet's live "Show N results" count.
 * The count must be the number of cards the list shows: both go through filterOpportunities / filterEvents / filterClubs.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Activity, Opportunity, Organization } from '@core/types';
import { readExploreQuery, writeExploreQuery, type ExploreQuery } from '@/pages/explore/exploreData';
import {
  clubGroups, eventGroups, filterClubs, filterEvents, filterOpportunities, inDue, opportunityGroups, sortOpportunities, whenRange, type Day,
} from '@/pages/explore/exploreFilters';
import { appliedChips, pickValues, resetValues, sortLabel, toggleValue } from '@/components/ha/filterModel';

const read = (s: string) => readExploreQuery(new URLSearchParams(s));
const opp = (x: Partial<Opportunity> & Pick<Opportunity, 'id' | 'type'>): Opportunity => ({
  title: x.id, host: 'Host', description: '', tags: [], eligibility: '', location: '', ...x,
} as Opportunity);

// Thursday 2026-11-05 on campus
const THU: Day = { date: '2026-11-05', weekday: 4 };

test('URL → filters: today\'s names, and old links still open the same thing', () => {
  assert.deepEqual(read('type=internship&region=Bay%20Area&kind=phd&sort=newest&due=week&saved=1&q=ml'), {
    q: 'ml', sort: 'newest', type: 'internship', region: 'Bay Area', kind: 'phd', due: 'week', saved: '1', when: '',
  });
  // Saved used to be a type, and BrowseTab's ?sub=
  assert.equal(read('type=saved').saved, '1');
  assert.equal(read('type=saved').type, '');
  assert.equal(read('sub=saved').saved, '1');
  assert.equal(read('sub=phd').kind, 'phd');
  assert.equal(read('sub=lab').type, 'research');
  // Clubs' "all groups" is no type now; old sort name
  assert.equal(read('type=all').type, '');
  assert.equal(read('sort=deadline').sort, 'ending');
  // unknown values are dropped, not guessed
  const bad = read('region=Mars&when=someday&due=year&sort=hot&saved=yes');
  assert.deepEqual([bad.region, bad.when, bad.due, bad.sort, bad.saved], ['', '', '', 'recommended', '']);
  assert.equal(read('when=weekend').when, 'weekend');
});

test('filters → URL: defaults leave the URL, other params stay, and it reads back the same', () => {
  const start = new URLSearchParams('school=s_berkeley&q=ai&type=saved&sub=x');
  const next = writeExploreQuery(start, { sort: 'recommended', type: 'internship', region: 'Bay Area', due: '', kind: '' });
  assert.equal(next.get('school'), 's_berkeley');
  assert.equal(next.get('q'), 'ai');
  assert.equal(next.get('sort'), null);
  assert.equal(next.get('sub'), null);
  assert.equal(next.get('due'), null);
  assert.equal(next.get('saved'), '1', 'an old ?type=saved survives as ?saved=1 when another filter is written');
  assert.equal(next.get('type'), 'internship');

  const f: Partial<ExploreQuery> = { sort: 'ending', type: 'hackathon', region: 'Remote', kind: 'phd', due: 'month', saved: '1', when: '' };
  const back = read(writeExploreQuery(new URLSearchParams(), f).toString());
  for (const [k, v] of Object.entries(f)) assert.equal(back[k as keyof ExploreQuery], v, k);
  // clearing a filter (× on its chip) removes it from the URL
  assert.equal(writeExploreQuery(new URLSearchParams('region=Remote&saved=1'), { region: '' }).toString(), 'saved=1');
});

test('When and Deadline windows count in campus days', () => {
  assert.deepEqual(whenRange('today', THU), ['2026-11-05', '2026-11-05']);
  assert.deepEqual(whenRange('week', THU), ['2026-11-05', '2026-11-11']);
  assert.deepEqual(whenRange('weekend', THU), ['2026-11-07', '2026-11-08']);
  assert.deepEqual(whenRange('weekend', { date: '2026-11-07', weekday: 6 }), ['2026-11-07', '2026-11-08']);
  assert.deepEqual(whenRange('weekend', { date: '2026-11-08', weekday: 0 }), ['2026-11-08', '2026-11-08']);
  assert.equal(whenRange('', THU), null);

  assert.equal(inDue({ deadline: '2026-11-12' }, 'week', THU), true);
  assert.equal(inDue({ deadline: '2026-11-13' }, 'week', THU), false);
  assert.equal(inDue({ deadline: '2026-11-13' }, 'month', THU), true);
  assert.equal(inDue({ deadline: undefined }, 'month', THU), false, 'no deadline is not "closing this month"');
  assert.equal(inDue({ deadline: undefined }, '', THU), true);
});

const OPPS = [
  opp({ id: 'sf-intern', type: 'internship', location: 'San Francisco, CA', deadline: '2026-11-10' }),
  opp({ id: 'remote-intern', type: 'internship', location: 'Remote, US', deadline: '2026-12-20' }),
  opp({ id: 'la-hack', type: 'hackathon', location: 'Los Angeles, CA', deadline: '2026-11-20' }),
  opp({ id: 'phd-lab', type: 'lab', title: 'PhD research assistant', location: 'Berkeley, CA' }),
  opp({ id: 'scholar', type: 'scholarship' }),
];

test('Opportunities: the sheet offers only what is there, and its count is the list length', () => {
  const groups = opportunityGroups(OPPS, {}, { grad: true, savedCount: 1 });
  assert.deepEqual(groups.map((g) => g.key), ['sort', 'type', 'region', 'due', 'kind', 'saved']);
  assert.deepEqual(groups[0].options.map((o) => o.label), ['Recommended', 'Newest', 'Closing soon']);
  assert.deepEqual(groups.find((g) => g.key === 'type')!.options.map((o) => o.value), ['internship', 'research', 'scholarship', 'hackathon']);
  assert.deepEqual(groups.find((g) => g.key === 'region')!.options.map((o) => o.value), ['Bay Area', 'Los Angeles', 'Remote'], 'Bay Area first, Remote last, no empty places');
  // For (PhD/MS) only for grad students; Saved only once something is saved
  const undergrad = opportunityGroups(OPPS, {}, { grad: false, savedCount: 0 }).map((g) => g.key);
  assert.ok(!undergrad.includes('kind') && !undergrad.includes('saved'));

  const ctx = { saved: new Set(['remote-intern']), today: THU };
  const f = { type: 'internship', region: 'Bay Area' };
  const list = sortOpportunities(filterOpportunities(OPPS, f, ctx), 'recommended');
  assert.deepEqual(list.map((o) => o.id), ['sf-intern']);
  // the sheet's draft count goes through the same function
  const draft = toggleValue(groups, pickValues(groups, f), 'region', 'Remote');
  assert.equal(draft.region, 'Remote');
  assert.equal(filterOpportunities(OPPS, draft, ctx).length, 1);
  assert.equal(filterOpportunities(OPPS, { saved: '1' }, ctx).map((o) => o.id).join(), 'remote-intern');
  assert.equal(filterOpportunities(OPPS, { due: 'week' }, ctx).map((o) => o.id).join(), 'sf-intern');
  assert.equal(filterOpportunities(OPPS, { kind: 'phd' }, ctx).map((o) => o.id).join(), 'phd-lab');
  assert.equal(filterOpportunities(OPPS, resetValues(groups), ctx).length, OPPS.length, 'Reset shows everything');

  // the chips row: applied filters only (not the sort), in sheet order, with short names
  assert.deepEqual(appliedChips(groups, { sort: 'newest', type: 'internship', region: 'Bay Area', saved: '1' }).map((c) => c.label), ['Internships', 'Bay Area', 'Saved']);
  assert.deepEqual(sortLabel(groups, { sort: 'newest' }), { label: 'Newest', isDefault: false });
  assert.deepEqual(sortLabel(groups, {}), { label: 'Recommended', isDefault: true });
  // a chip tapped again turns off; the sort never turns off
  assert.equal(toggleValue(groups, { type: 'internship' }, 'type', 'internship').type, '');
  assert.equal(toggleValue(groups, { sort: 'newest' }, 'sort', 'newest').sort, 'newest');
});

test('Events: When and Kind; club events have no kind, so a Kind filter leaves them out', () => {
  const ev = [
    opp({ id: 'talk-today', type: 'event', tags: ['talk'], date: '2026-11-05' }),
    opp({ id: 'food-sat', type: 'event', tags: ['free food'], date: '2026-11-07T20:00:00Z' }),
    opp({ id: 'later', type: 'event', tags: ['social'], date: '2026-11-20' }),
  ];
  const club = [{ id: 'club-sun', title: 'Club picnic', date: '2026-11-08', startTime: '12:00', description: '' } as unknown as Activity];
  assert.deepEqual(eventGroups(ev, {}).map((g) => g.key), ['sort', 'when', 'type']);
  assert.deepEqual(eventGroups(ev, {})[0].options.map((o) => o.label), ['Recommended', 'Newest', 'Soonest']);
  assert.deepEqual(eventGroups(ev, {})[2].options.map((o) => o.value), ['free_food', 'talk', 'social']);
  const ids = (f: Record<string, string>) => filterEvents(ev, club, f, THU).map((x) => x.key);
  assert.deepEqual(ids({}), ['talk-today', 'food-sat', 'later', 'club-sun']);
  assert.deepEqual(ids({ when: 'today' }), ['talk-today']);
  assert.deepEqual(ids({ when: 'weekend' }), ['food-sat', 'club-sun']);
  assert.deepEqual(ids({ when: 'weekend', type: 'free_food' }), ['food-sat']);
});

test('Clubs: no type is every kind; Type narrows; no "Closing soon"', () => {
  const orgs = [
    { id: 'a', name: 'Chess Club', type: 'club' }, { id: 'b', name: 'Alpha Beta', type: 'greek' },
    { id: 'c', name: 'Vision Lab', type: 'lab' }, { id: 'd', name: 'Student Senate', type: 'council' },
  ] as Organization[];
  assert.deepEqual(clubGroups()[0].options.map((o) => o.value), ['recommended', 'newest']);
  assert.equal(filterClubs(orgs, {}).length, 4);
  assert.deepEqual(filterClubs(orgs, { type: 'club' }).map((o) => o.id), ['a', 'd']);
  assert.deepEqual(filterClubs(orgs, { type: 'greek', q: 'alpha' }).map((o) => o.id), ['b']);
  assert.deepEqual(filterClubs(orgs, read('type=all')).length, 4, 'old "all groups" link');
});
