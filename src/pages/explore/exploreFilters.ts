/**
 * Explore filters (S017–S019, S089) — what each tab's filter sheet offers and the ONE function per tab that applies it.
 * The list on screen and the sheet's live "Show N results" both call filterOpportunities / filterEvents / filterClubs,
 * so the number on the button is always the number of cards you get (owner 2026-11-06). Pure: no React, no store —
 * the signed-in lists, the guest list (S089) and server/explorefilters.test.ts share it.
 */
import { lang } from '@core/i18n';
import type { Activity, Opportunity, Organization } from '@core/types';
import { audienceOf, campusDate, categoriesOf, eventKindsOf, spreadByHost } from '@core/lib/listings';
import { addDaysISO, campusClock, schoolTz } from '@core/lib/campusclock';
import type { FilterGroup, FilterOption } from '@/components/ha/filterModel';
import {
  CLUB_KINDS, clubKindOf, clubMatches, EVENT_KINDS, inEventKind, inKind, inOppType, inRegion, listingMatches, activityMatches,
  OPP_TYPES, regionLabel, regionsIn, SORTS, sortListings, type ExploreQuery, type ExploreSort,
} from './exploreData';

const en = lang === 'en';
const L = (e: string, k: string) => (en ? e : k);

/** what the filter functions read — the URL query or the sheet's draft (strings; '' = not set) */
export type ExploreFilter = Partial<Record<Exclude<keyof ExploreQuery, 'sort'>, string>>;

/* ─────────────── days (campus time) ─────────────── */

/** campus today: YYYY-MM-DD + weekday (0 = Sunday) */
export interface Day { date: string; weekday: number }
export const campusToday = (now = new Date()): Day => { const c = campusClock(now, schoolTz()); return { date: c.date, weekday: c.weekday }; };
const dayDiff = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

/** Events · When — Today; This week = the next 7 days; This weekend = the coming Sat–Sun (Sunday: just today) */
export function whenRange(when: string, t: Day): [string, string] | null {
  if (when === 'today') return [t.date, t.date];
  if (when === 'week') return [t.date, addDaysISO(t.date, 6)];
  if (when === 'weekend') {
    if (t.weekday === 0) return [t.date, t.date];
    const sat = addDaysISO(t.date, 6 - t.weekday);
    return [t.weekday === 6 ? t.date : sat, addDaysISO(sat, 1)];
  }
  return null;
}
export const inWhen = (day: string | undefined, when: string | undefined, t: Day) => {
  const r = when ? whenRange(when, t) : null;
  return !r || (!!day && day >= r[0] && day <= r[1]);
};

/** Opportunities · Deadline — closes within 7 days / within 30 days; a listing with no deadline matches neither */
export function inDue(o: Pick<Opportunity, 'deadline'>, due: string | undefined, t: Day) {
  if (!due) return true;
  if (!o.deadline) return false;
  const d = dayDiff(t.date, campusDate(o.deadline));
  return d >= 0 && d <= (due === 'week' ? 7 : 30);
}

/* ─────────────── Opportunities ─────────────── */

export function filterOpportunities(base: Opportunity[], f: ExploreFilter, ctx: { saved?: ReadonlySet<string>; today: Day }): Opportunity[] {
  return base.filter((o) => listingMatches(o, f.q ?? '') && inOppType(o, f.type ?? '') && (!f.saved || !!ctx.saved?.has(o.id))
    && inRegion(o, f.region ?? '') && inKind(o, f.kind ?? '') && inDue(o, f.due, ctx.today));
}
/** Recommended spreads hosts (the same company ten times in a row reads like an ad board) — signed-in list only */
export function sortOpportunities(list: Opportunity[], sort: ExploreSort, score?: (o: Opportunity) => number, spread = false): Opportunity[] {
  const sorted = sortListings(list, sort, score);
  return spread && sort === 'recommended' ? spreadByHost(sorted) : sorted;
}

const sortGroup = (labels: Partial<Record<ExploreSort, string>> = {}, without?: ExploreSort): FilterGroup => ({
  key: 'sort', title: L('Sort', '정렬'), required: true,
  options: SORTS.filter((s) => s.key !== without).map((s) => ({ value: s.key, label: labels[s.key] ?? s.label })),
});
const group = (key: string, title: string, options: FilterOption[]): FilterGroup[] => (options.length ? [{ key, title, options }] : []);

/**
 * Sort · Type · Location · Deadline · For · Saved. Options come from `base` (every open listing on this tab, before
 * search and filters) so chips don't jump while you pick; the live count shows what a mix leaves.
 * For (PhD/MS) only for graduate students; Saved only once something is saved — as the chip rows did.
 */
export function opportunityGroups(base: Opportunity[], f: ExploreFilter, opt: { grad?: boolean; savedCount?: number } = {}): FilterGroup[] {
  const has = new Set(base.flatMap((o) => categoriesOf(o)));
  return [
    sortGroup(),
    ...group('type', L('Type', '종류'), OPP_TYPES.filter((t) => has.has(t.key) || f.type === t.key).map((t) => ({ value: t.key, label: t.label }))),
    ...group('region', L('Location', '지역'), regionsIn(base, f.region ?? '').map((r) => ({ value: r, label: regionLabel(r) }))),
    { key: 'due', title: L('Deadline', '마감'), options: [
      { value: '', label: L('Any', '전체') },
      { value: 'week', label: L('Closes this week', '이번 주 마감') },
      { value: 'month', label: L('This month', '이번 달 마감'), chip: L('Closes this month', '이번 달 마감') },
    ] },
    ...group('kind', L('For', '대상'), opt.grad && (f.kind === 'phd' || base.some((o) => audienceOf(o) === 'grad')) ? [{ value: 'phd', label: L('PhD/MS', '대학원') }] : []),
    ...group('saved', L('Saved', '저장'), (opt.savedCount ?? 0) > 0 || f.saved ? [{ value: '1', label: L(`Only saved (${opt.savedCount ?? 0})`, `저장한 것만 (${opt.savedCount ?? 0})`), chip: L('Saved', '저장') }] : []),
  ];
}

/* ─────────────── Events ─────────────── */

export type EventItem = { kind: 'listing'; o: Opportunity; key: string } | { kind: 'club'; a: Activity; key: string };
const eventDay = (o: Opportunity) => (o.date ? campusDate(o.date) : undefined);

/** official events + club events posted on Lumi. Club events have no kind tags — a Kind filter leaves them out */
export function filterEvents(events: Opportunity[], clubEvents: Activity[], f: ExploreFilter, today: Day): EventItem[] {
  const q = f.q ?? '';
  const listings = events.filter((o) => inEventKind(o, f.type ?? '') && inWhen(eventDay(o), f.when, today) && listingMatches(o, q));
  const clubs = f.type ? [] : clubEvents.filter((a) => inWhen(a.date, f.when, today) && activityMatches(a, q));
  return [...listings.map((o) => ({ kind: 'listing' as const, o, key: o.id })), ...clubs.map((a) => ({ kind: 'club' as const, a, key: a.id }))];
}

/**
 * Recommended: club events posted on Lumi (people you can meet) first — the ones from clubs I follow before the rest —
 * then listings by score; Newest / Soonest merge both kinds by posted time / day.
 */
export function sortEvents(items: EventItem[], sort: ExploreSort, opt: { score?: (o: Opportunity) => number; mine?: (a: Activity) => boolean } = {}): EventItem[] {
  const listings = sortListings(items.flatMap((x) => (x.kind === 'listing' ? [x.o] : [])), sort, opt.score).map((o) => ({ kind: 'listing' as const, o, key: o.id }));
  const clubs = items.flatMap((x) => (x.kind === 'club' ? [x.a] : []));
  if (!clubs.length) return listings;
  const at = (a: Activity) => `${a.date} ${a.startTime}`;
  if (sort === 'recommended') {
    const mine = (a: Activity) => Number(!!opt.mine?.(a));
    return [...[...clubs].sort((a, b) => mine(b) - mine(a) || at(a).localeCompare(at(b))).map((a) => ({ kind: 'club' as const, a, key: a.id })), ...listings];
  }
  const keyOf = (x: EventItem) => (x.kind === 'club' ? (sort === 'newest' ? x.a.createdAt : at(x.a)) : (sort === 'newest' ? (x.o.postedAt ?? x.o.createdAt) : (x.o.deadline ?? x.o.date ?? '9999')));
  const all: EventItem[] = [...listings, ...clubs.map((a) => ({ kind: 'club' as const, a, key: a.id }))];
  return all.sort((a, b) => (sort === 'newest' ? keyOf(b).localeCompare(keyOf(a)) : keyOf(a).localeCompare(keyOf(b))));
}

/** Sort · When · Kind (only kinds some event has) */
export function eventGroups(events: Opportunity[], f: ExploreFilter): FilterGroup[] {
  const has = new Set(events.flatMap((o) => eventKindsOf(o)));
  return [
    sortGroup({ ending: L('Soonest', '가까운 순') }),
    { key: 'when', title: L('When', '언제'), options: [
      { value: 'today', label: L('Today', '오늘') }, { value: 'week', label: L('This week', '이번 주') }, { value: 'weekend', label: L('This weekend', '이번 주말') },
    ] },
    ...group('type', L('Kind', '종류'), EVENT_KINDS.filter((k) => has.has(k.key) || f.type === k.key).map((k) => ({ value: k.key, label: k.label }))),
  ];
}

/* ─────────────── Clubs ─────────────── */

/** no type = every kind (Student Clubs · Greek Life · Research Labs · Co-op) */
export function filterClubs(base: Organization[], f: ExploreFilter): Organization[] {
  const kind = clubKindOf(f.type ?? '');
  return base.filter((o) => (!kind || kind.types.includes(o.type)) && clubMatches(o, f.q ?? ''));
}
/** Sort (Recommended · Newest — "Closing soon" means nothing for a club) · Type */
export function clubGroups(): FilterGroup[] {
  return [sortGroup({}, 'ending'), { key: 'type', title: L('Type', '종류'), options: CLUB_KINDS.map((k) => ({ value: k.key, label: k.label })) }];
}
