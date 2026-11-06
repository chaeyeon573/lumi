/**
 * Explore lists (S017–S019, S089) — URL state, search, sorts and the filter vocabularies (the sheet itself: exploreFilters.ts).
 * Pure helpers: the signed-in lists (store data) and the signed-out list (GET /api/public/explore) share them,
 * so a guest and a student see the same order for the same data.
 */
import { lang } from '@core/i18n';
import type { Activity, Opportunity, Organization } from '@core/types';
import { audienceOf, badgeOf, campusDate, categoriesOf, eventKindsOf, locationOf, regionsOf, REGIONS, type Category, type EventKind, type Region } from '@core/lib/listings';
import { daysUntil } from '@core/lib/recommend';
import { formatDate, formatTime } from '@core/lib/format';
import { ORG_TYPE_LABELS } from '@core/lib/labels';
import type { Tone } from '@/components/ha/tones';

const en = lang === 'en';

/* ─────────────── URL ─────────────── */

export type ExploreSort = 'recommended' | 'newest' | 'ending';
/** "ending" reads "Closing soon" on Opportunities, "Soonest" on Events (an event doesn't close); Clubs have no third sort */
export const SORTS: { key: ExploreSort; label: string }[] = [
  { key: 'recommended', label: en ? 'Recommended' : '추천' },
  { key: 'newest', label: en ? 'Newest' : '최신' },
  { key: 'ending', label: en ? 'Closing soon' : '마감 임박' },
];

export type ExploreQuery = {
  q: string; sort: ExploreSort;
  /** Opportunities: internship · research … · Events: free_food · talk … (event kind) · Clubs: club · greek · lab · coop */
  type: string;
  /** Opportunities: ?region=Bay Area · ?kind=phd (PhD/MS) · ?due=week|month · ?saved=1 */
  region: string; kind: string; due: string; saved: string;
  /** Events: ?when=today|week|weekend */
  when: string;
};
/**
 * ?q=…&sort=newest|ending&type=… (recommended / no type = absent) — and the old ?sub= links from BrowseTab.
 * Opportunities also keep ?region=Bay Area and ?kind=phd (the live BrowseTab's names, so its links still work).
 * Saved used to be a type (?type=saved, ?sub=saved) — it is its own filter now (?saved=1) so it can go with a type;
 * the old links still open Saved. Clubs' old ?type=all (every kind) is the same as no type now.
 */
export function readExploreQuery(params: URLSearchParams): ExploreQuery {
  const s = params.get('sort');
  const sort: ExploreSort = s === 'newest' ? 'newest' : s === 'ending' || s === 'deadline' ? 'ending' : 'recommended';
  const region = params.get('region') ?? '';
  const sub = params.get('sub') ?? '';
  const rawType = params.get('type') ?? LEGACY_SUB[sub] ?? '';
  const when = params.get('when') ?? '';
  const due = params.get('due') ?? '';
  return {
    q: params.get('q') ?? '', sort, type: rawType === 'saved' || rawType === 'all' ? '' : rawType,
    region: (REGIONS as readonly string[]).includes(region) ? region : '', kind: params.get('kind') === 'phd' || sub === 'phd' ? 'phd' : '',
    due: due === 'week' || due === 'month' ? due : '', saved: params.get('saved') === '1' || rawType === 'saved' ? '1' : '',
    when: when === 'today' || when === 'week' || when === 'weekend' ? when : '',
  };
}
/** old BrowseTab chips (/profile/saved used to send ?sub=saved) */
const LEGACY_SUB: Record<string, string> = { phd: 'internship', saved: 'saved', internship: 'internship', research: 'research', lab: 'research', scholarship: 'scholarship', funding: 'scholarship', hackathon: 'hackathon', startup: 'startup', exchange: 'exchange', free_food: 'free_food' };

/** '' (and Recommended) = the key leaves the URL; ?sub= and the old ?type=saved go once anything is written */
export function writeExploreQuery(params: URLSearchParams, patch: Partial<ExploreQuery>): URLSearchParams {
  const next = new URLSearchParams(params);
  next.delete('sub');
  if (next.get('type') === 'saved' && !('saved' in patch)) next.set('saved', '1');
  if (next.get('type') === 'saved' || next.get('type') === 'all') next.delete('type');
  for (const [k, v] of Object.entries(patch)) {
    if (!v || (k === 'sort' && v === 'recommended')) next.delete(k); else next.set(k, String(v));
  }
  return next;
}

/* ─────────────── search ─────────────── */

const words = (q: string) => q.toLowerCase().split(/\s+/).filter(Boolean);
export const matches = (text: (string | undefined)[], q: string) => {
  const ws = words(q);
  if (!ws.length) return true;
  const hay = text.filter(Boolean).join(' ').toLowerCase();
  return ws.every((w) => hay.includes(w));
};
export const listingMatches = (o: Opportunity, q: string) => matches([o.title, o.host, o.description, o.place?.name, o.location, ...o.tags], q);
export const clubMatches = (o: Organization, q: string) => matches([o.name, o.description, o.parent, ORG_TYPE_LABELS[o.type]], q);

/* ─────────────── listings ─────────────── */

/** still open for this person — same rule as Home's For you (deadline not passed, or the event day not passed) */
export const isOpen = (o: Opportunity) => (o.deadline ? daysUntil(o.deadline) >= 0 : !o.date || daysUntil(o.date) >= 0);

/** the one-word badge on a card (PDF: "Campus event", "Internship", "Research", "Hackathon") */
const BADGE: Record<Opportunity['type'], [string, string]> = {
  event: ['Campus event', '학교 행사'], internship: ['Internship', '인턴'], lab: ['Research', '연구'], scholarship: ['Scholarship', '장학금'],
  hackathon: ['Hackathon', '해커톤'], startup: ['Startup', '창업'], exchange: ['Study abroad', '교환학생'], club: ['Club', '동아리'], activity: ['Activity', '활동'],
};
export const badgeLabel = (o: Pick<Opportunity, 'type'>) => BADGE[o.type][en ? 0 : 1];
/**
 * the type chip's tint — and the card's 3px stripe (owner 2026-11-06, option C): events and hackathons ice, internships /
 * startups peach, research and study abroad lavender, scholarships mint
 */
const TYPE_TONE: Record<Opportunity['type'], Tone> = { event: 'ice', hackathon: 'ice', internship: 'peach', startup: 'peach', lab: 'lav', exchange: 'lav', scholarship: 'mint', club: 'mint', activity: 'rose' };
export const badgeTone = (o: Pick<Opportunity, 'type'>): Tone => TYPE_TONE[o.type] ?? 'peach';

/** the time chip on a card (option A): an event's day · time, otherwise the deadline as D-n / D-Day (D-3 or less is urgent → pink) */
export function listingChip(o: Opportunity): { text: string; urgent: boolean } | undefined {
  if (o.type === 'event') {
    const day = o.date ? formatDate(campusDate(o.date)) : '';
    const time = o.startTime && o.startTime !== '00:00' ? formatTime(o.startTime) : '';
    const text = [day, time].filter(Boolean).join(' · ');
    return text ? { text, urgent: false } : undefined;
  }
  if (!o.deadline) return undefined;
  const b = badgeOf(o, en);
  return { text: b.text, urgent: b.tone === 'urgent' };
}
/** host · place under the title (option A) — events carry their place here, the rest have their own location line */
export const listingHostLine = (o: Opportunity): string => (o.type === 'event' ? [o.host, o.place?.name].filter(Boolean).join(' · ') : o.host ?? '');

/** one meta line: "Thu, Nov 6 · 5 PM · Sproul Plaza" for events, "D-12 · Google" for the rest (the place is its own line, listingWhere) */
export function listingMeta(o: Opportunity): string {
  if (o.type === 'event') {
    const day = o.date ? formatDate(campusDate(o.date)) : '';
    const time = o.startTime && o.startTime !== '00:00' ? formatTime(o.startTime) : '';
    return [day, time, o.place?.name || o.host].filter(Boolean).join(' · ');
  }
  return [badgeOf(o, en).text, o.host].filter(Boolean).join(' · ');
}

/**
 * Where a listing you apply to is — its own card line, so it is never the truncated end of the meta line
 * (ux-sim 2026-11-06: "Mountain Vie…"). ", USA" is dropped; events carry their place in listingMeta.
 */
export function listingWhere(o: Opportunity): string {
  if (o.type === 'event') return '';
  return locationOf(o).replace(/,\s*(USA|U\.S\.A?\.?|US|United States( of America)?)\s*$/i, '').trim();
}

/* ─────────────── opportunity filters: location + PhD/MS ─────────────── */

/** the location chips (live BrowseTab's region select) — region names stay English except these two */
export const regionLabel = (r: string) => (en ? r : ({ 'Bay Area': '베이 지역', Remote: '원격' } as Record<string, string>)[r] ?? r);
export const inRegion = (o: Opportunity, region: string) => !region || regionsOf(o).includes(region as Region);
/** PhD/MS chip — listings written for graduate students (the same audienceOf that keeps them out of undergrad lists) */
export const inKind = (o: Opportunity, kind: string) => kind !== 'phd' || audienceOf(o) === 'grad';
/** regions that have at least one listing in `list`, in REGIONS order (Bay Area first) — plus the chosen one */
export function regionsIn(list: Opportunity[], chosen: string): Region[] {
  const has = new Set(list.flatMap((o) => regionsOf(o)));
  return REGIONS.filter((r) => has.has(r) || r === chosen);
}

const due = (o: Opportunity) => o.deadline ?? o.date ?? '9999';
const posted = (o: Opportunity) => o.postedAt ?? o.createdAt ?? '';
const when = (o: Opportunity) => `${o.date ?? o.deadline ?? '9999'} ${o.startTime ?? ''}`;

/** Recommended = the For-you score (signed in) then soonest; Newest = posted; Ending soon = deadline / day */
export function sortListings(list: Opportunity[], sort: ExploreSort, score?: (o: Opportunity) => number): Opportunity[] {
  const xs = [...list];
  if (sort === 'newest') return xs.sort((a, b) => posted(b).localeCompare(posted(a)));
  if (sort === 'ending') return xs.sort((a, b) => due(a).localeCompare(due(b)));
  return xs.sort((a, b) => (score ? score(b) - score(a) : 0) || (a.type === 'event' ? when(a).localeCompare(when(b)) : due(a).localeCompare(due(b))));
}

/** Type on Opportunities (BrowseTab's type filter) — the sheet shows the ones that have listings */
export const OPP_TYPES: { key: Category; label: string }[] = [
  { key: 'internship', label: en ? 'Internships' : '인턴' },
  { key: 'research', label: en ? 'Research' : '연구' },
  { key: 'scholarship', label: en ? 'Scholarships' : '장학금' },
  { key: 'hackathon', label: en ? 'Hackathons' : '해커톤' },
  { key: 'exchange', label: en ? 'Study abroad' : '교환학생' },
  { key: 'startup', label: en ? 'Startups' : '창업' },
];
export const inOppType = (o: Opportunity, type: string) => !type || categoriesOf(o).includes(type as Category);

/** Kind on Events — the sheet shows only kinds that exist in the list */
export const EVENT_KINDS: { key: EventKind; label: string }[] = [
  { key: 'free_food', label: en ? 'Free food' : '무료 음식' },
  { key: 'talk', label: en ? 'Talks' : '강연' },
  { key: 'career', label: en ? 'Career' : '커리어' },
  { key: 'social', label: en ? 'Social' : '소셜' },
];
export const inEventKind = (o: Opportunity, kind: string) => !kind || eventKindsOf(o).includes(kind as EventKind);

/* ─────────────── club-posted events (Lumi activities) ─────────────── */

export const activityMatches = (a: Activity, q: string) => matches([a.title, a.description, a.place?.name], q);

/* ─────────────── clubs ─────────────── */

/** Type on Clubs (PDF S019): Student Clubs · Greek Life · Research Labs · Co-op (councils sit with clubs). No type = every kind */
export const CLUB_KINDS: { key: string; label: string; types: Organization['type'][] }[] = [
  { key: 'club', label: en ? 'Student Clubs' : '동아리', types: ['club', 'council'] },
  { key: 'greek', label: en ? 'Greek Life' : 'Greek', types: ['greek'] },
  { key: 'lab', label: en ? 'Research Labs' : '연구실', types: ['lab'] },
  { key: 'coop', label: en ? 'Co-op' : '코업', types: ['coop'] },
];
export const clubKindOf = (key: string) => CLUB_KINDS.find((k) => k.key === key);

/** Clubs sort by Recommended / Newest only — "Closing soon" means nothing for a club (ux-sim 2026-11-06); old ?sort=ending → Recommended */
export const clubSort = (sort: ExploreSort): ExploreSort => (sort === 'ending' ? 'recommended' : sort);
export function sortClubs(list: Organization[], sort: ExploreSort, score?: (o: Organization) => number): Organization[] {
  const xs = list.map((o, i) => ({ o, i }));
  // newest: groups started on Lumi first (their ids carry the time), then the directory's newest additions
  if (sort === 'newest') return xs.sort((a, b) => Number(!!b.o.createdBy) - Number(!!a.o.createdBy) || b.i - a.i).map((x) => x.o);
  // Recommended: student clubs and Greek life before research units and co-ops — the Clubs tab is about clubs; labs stay one filter away (live check 2026-11-06)
  const tier = (o: Organization) => (o.type === 'lab' ? 2 : o.type === 'coop' ? 1 : 0);
  return xs.sort((a, b) => tier(a.o) - tier(b.o) || (score ? score(b.o) - score(a.o) : 0) || Number(!!b.o.recruitment?.open) - Number(!!a.o.recruitment?.open) || a.o.name.localeCompare(b.o.name)).map((x) => x.o);
}

/** the badge under a group's name and the kind on its row (PDF: "Student club") */
export const ORG_BADGE: Record<Organization['type'], string> = en
  ? { club: 'Student club', council: 'Student association', greek: 'Greek life', lab: 'Research lab', coop: 'Co-op', department: 'School office' }
  : { club: '동아리', council: '학생회', greek: 'Greek', lab: '연구실', coop: '코업', department: '학교 부서' };

/** "Creative · Followed" / "Recreation · Public organization" — kind, then my relation (never a member count of 0) */
export function clubSub(o: Organization, rel: 'admin' | 'member' | 'following' | 'applied' | '' = ''): string {
  const kind = o.parent || ORG_BADGE[o.type];
  const r = rel === 'admin' ? (en ? 'Organizer' : '운영진') : rel === 'member' ? (en ? 'Member' : '회원') : rel === 'following' ? (en ? 'Followed' : '팔로우') : rel === 'applied' ? (en ? 'Requested' : '요청함')
    : o.createdBy ? (en ? 'Started on Lumi' : 'Lumi에서 시작') : (en ? 'Public organization' : '공개 단체');
  return `${kind} · ${r}`;
}

/** "Show more" page size */
export const PAGE = 30;
