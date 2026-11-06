import type { ID, Opportunity, Organization, School } from '@core/types';
import { daysUntil } from './recommend';
import { publicLinks, withoutEmoji } from './orglinks';
import { regionsOf, type Region } from './listings';

/**
 * Explore without an account (S089) — what a signed-out visitor may see of one open school.
 *
 * Only public listings that came from an official source, and the school's club directory.
 * No people: no follower / member / admin / applicant ids, no Q&A or reviews (authors), no notices,
 * no user-created groups or user-shared links, no sample (demo) content. The server serves this at
 * `GET /api/public/explore?school=`; the mock API runs the same function on its local data.
 */
export interface PublicExplore {
  school: Pick<School, 'id' | 'name'> | null;
  events: Opportunity[];
  opportunities: Opportunity[];
  clubs: Organization[];
}

export interface PublicExploreOptions {
  /** demo content that must never reach the public view (server/samples.ts) */
  sampleOpportunityIds?: ReadonlySet<ID>;
  sampleOrgIds?: ReadonlySet<ID>;
  /** caps keep the response small (the visitor can sign up for the full lists) */
  maxEvents?: number;
  maxOpportunities?: number;
  /** per listing type (internship, exchange …) inside maxOpportunities */
  maxPerType?: number;
  maxClubs?: number;
}

/** links people paste in the app (opportunities.create) — not an official listing */
const SHARED_LINK = new Set(['Shared link', '공유된 링크']);
const isHttp = (u?: string) => !!u && /^https?:\/\//i.test(u);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export const isPublicListing = (o: Opportunity, schoolId: ID, samples?: ReadonlySet<ID>) =>
  (!o.schoolId || o.schoolId === schoolId)
  && !samples?.has(o.id)
  && o.type !== 'activity' && o.type !== 'club'
  && isHttp(o.sourceUrl) && !SHARED_LINK.has(o.sourceLabel)
  // still open: deadline not passed, or the event day not passed
  && (o.deadline ? daysUntil(o.deadline) >= 0 : !o.date || daysUntil(o.date) >= 0);

export const isPublicClub = (o: Organization, schoolId: ID, samples?: ReadonlySet<ID>) =>
  o.schoolId === schoolId && !samples?.has(o.id) && !o.createdBy && o.type !== 'department';

/** a listing without anything that points at a person */
export const publicListing = (o: Opportunity): Opportunity => ({
  ...o, description: clip(o.description ?? '', 600), qna: [], reviews: [], interests: [], goals: [],
});

/** a club without its people (ids, notices, gallery) and without login-only links */
export const publicClub = (o: Organization): Organization => withoutEmoji({
  ...o, description: clip(o.description ?? '', 280), followerIds: [], memberIds: [], adminIds: [], applicantIds: [], notices: [], gallery: [],
  links: publicLinks(o.links), createdBy: undefined,
});

/** the school's region from its name ("UC Berkeley" → Bay Area) — the same city rules as the location chips */
export const homeRegionOf = (schoolName: string): Region | undefined =>
  regionsOf({ location: schoolName, remote: false, description: '', type: 'internship' }).find((r) => r !== 'Remote');
/** a visitor has no profile: campus listings and ones in the school's region come first */
export const nearCampus = (o: Opportunity, schoolId: ID, home?: Region) => (!!o.schoolId && o.schoolId === schoolId) || (!!home && regionsOf(o).includes(home));
/** closing today — nothing a visitor can still do with it (ux-sim 2026-11-06: a guest's first internships were all closing today) */
export const closesToday = (o: Opportunity) => !!o.deadline && daysUntil(o.deadline) === 0;

export function publicExplore(db: { schools: School[]; opportunities: Opportunity[]; organizations: Organization[] }, schoolId: ID, opts: PublicExploreOptions = {}): PublicExplore {
  const school = db.schools.find((s) => s.id === schoolId);
  if (!school) return { school: null, events: [], opportunities: [], clubs: [] };
  const open = db.opportunities.filter((o) => isPublicListing(o, schoolId, opts.sampleOpportunityIds));
  const when = (o: Opportunity) => `${o.date ?? o.deadline ?? '9999'} ${o.startTime ?? ''}`;
  const events = open.filter((o) => o.type === 'event').sort((a, b) => when(a).localeCompare(when(b))).slice(0, opts.maxEvents ?? 200);
  const due = (o: Opportunity) => o.deadline ?? o.date ?? '9999';
  // the cap used to keep only the soonest deadlines, so internships without one (most Bay Area companies) never reached a
  // visitor and federal listings in DC closing today did. Now: nothing closing today, campus / home region first, then due
  const home = homeRegionOf(school.name);
  const near = (o: Opportunity) => (nearCampus(o, schoolId, home) ? 0 : 1);
  // the cap is per kind, so 300 campus study-abroad pages can't push every internship out
  const perType = new Map<string, number>();
  const opportunities = open.filter((o) => o.type !== 'event' && !closesToday(o))
    .sort((a, b) => near(a) - near(b) || due(a).localeCompare(due(b)))
    .filter((o) => { const n = perType.get(o.type) ?? 0; perType.set(o.type, n + 1); return n < (opts.maxPerType ?? 80); })
    .slice(0, opts.maxOpportunities ?? 400);
  const clubs = db.organizations.filter((o) => isPublicClub(o, schoolId, opts.sampleOrgIds))
    .sort((a, b) => Number(!!b.recruitment?.open) - Number(!!a.recruitment?.open) || a.name.localeCompare(b.name))
    .slice(0, opts.maxClubs ?? 2000);
  return { school: { id: school.id, name: school.name }, events: events.map(publicListing), opportunities: opportunities.map(publicListing), clubs: clubs.map(publicClub) };
}
