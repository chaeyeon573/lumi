/**
 * Lumi+ (Harness A S087 Lumi+ · S088 Checkout) — the ONE place that says what Lumi+ is.
 * Owner decisions 2026-11-06:
 *   - extras: (1) advanced People filters — spoken language, interests, communities (year/status chips, Same campus
 *     and search stay free); (2) folders + private notes for saved people; (3) more groups and meetups than free.
 *   - price US$2.99 / month. Payments are not open yet (no Stripe, no Apple IAP) — nothing may pretend to sell it.
 *   - safety, basic people finding, meetups and the timetable stay free.
 *
 * The server flag LUMI_PLUS (server/plus.ts) decides whether any of this is gated. Off (the default): nothing is
 * gated — everyone keeps today's features and today's limits. On: the extras need an active `user.plus`.
 * Screens, engine and server all read the numbers below; don't repeat them anywhere else.
 */
import type { ID, Interest, Organization, PlusEntitlement, User } from '@core/types';

/** US$2.99 a month, renewing monthly until cancelled */
export const PLUS_PRICE = { amount: 2.99, currency: 'USD', interval: 'month' } as const;
export const PLUS_PRICE_LABEL = `US$${PLUS_PRICE.amount.toFixed(2)} / ${PLUS_PRICE.interval}`;

export interface PlanLimits {
  /** groups one person may create (orgs.create) */
  groups: number;
  /** upcoming meetups one person may host at the same time (activities.create); null = no limit */
  upcomingMeetups: number | null;
}

/**
 * Free = today's rules (10 groups per person). Free meetups only get a cap when the flag is on — 5 upcoming at once
 * is more than an active student hosts in a normal week; Lumi+ raises both.
 */
export const PLAN_LIMITS = {
  free: { groups: 10, upcomingMeetups: 5 },
  plus: { groups: 30, upcomingMeetups: 20 },
} as const satisfies Record<'free' | 'plus', PlanLimits>;

/** Limits before Lumi+ is switched on — exactly what everyone has today */
const TODAY: PlanLimits = { groups: PLAN_LIMITS.free.groups, upcomingMeetups: null };

/** this person has Lumi+ right now (granted and not past `until`) */
export function hasPlus(u: { plus?: PlusEntitlement } | undefined | null, now: Date = new Date()): boolean {
  const p = u?.plus;
  if (!p?.since) return false;
  if (new Date(p.since).getTime() > now.getTime()) return false;
  return !p.until || new Date(p.until).getTime() > now.getTime();
}

/** the extras are open to this person: everyone while the flag is off, Lumi+ members while it is on */
export const plusUnlocked = (u: { plus?: PlusEntitlement } | undefined | null, enabled: boolean, now?: Date) => !enabled || hasPlus(u, now);

export function limitsFor(u: { plus?: PlusEntitlement } | undefined | null, enabled: boolean, now?: Date): PlanLimits {
  if (!enabled) return TODAY;
  return hasPlus(u, now) ? PLAN_LIMITS.plus : PLAN_LIMITS.free;
}

/** meetups this person hosts that haven't happened yet (auto "go together" crews, study groups and samples don't count) */
export function upcomingHosted(activities: readonly { hostId: ID; hostType: string; date: string; sample?: boolean; listingCrew?: string; studyGroup?: unknown }[], userId: ID, today: string): number {
  return activities.filter((a) => a.hostId === userId && a.hostType === 'user' && !a.sample && !a.listingCrew && !a.studyGroup && a.date >= today).length;
}

/* ─────────────── refusals (one sentence the person can read; the screen shows it as is) ─────────────── */

export type PlusFeature = 'filters' | 'saved_folders';
export const PLUS_REQUIRED: Record<PlusFeature, string> = {
  filters: 'Language, interest and community filters are part of Lumi+.',
  saved_folders: 'Folders and private notes for saved people are part of Lumi+.',
};

export function groupLimitReason(limits: PlanLimits, enabled: boolean, plus: boolean): string {
  const more = enabled && !plus ? ` Lumi+ raises that to ${PLAN_LIMITS.plus.groups}.` : '';
  return `You can create up to ${limits.groups} groups.${more}`;
}
export function meetupLimitReason(limits: PlanLimits, plus: boolean): string {
  const more = !plus ? ` Lumi+ raises that to ${PLAN_LIMITS.plus.upcomingMeetups}.` : '';
  return `You can host up to ${limits.upcomingMeetups} upcoming meetups at a time.${more}`;
}

/* ─────────────── advanced People filters (S059) ─────────────── */

/** the Lumi+ part of People filters. Year/status chips, Same campus, Shared interests and search are free */
export interface AdvancedPeopleFilter { language?: string; interests?: Interest[]; org?: ID }

export const hasAdvancedFilter = (f: AdvancedPeopleFilter) => !!(f.language?.trim() || f.interests?.length || f.org);

/** clean what a client sent — trimmed language, known-looking interests, one org id */
export function cleanAdvancedFilter(raw: unknown): AdvancedPeopleFilter {
  const r = (raw ?? {}) as Record<string, unknown>;
  const language = typeof r.language === 'string' ? r.language.replace(/\s+/g, ' ').trim().slice(0, 30) : '';
  const interests = Array.isArray(r.interests) ? [...new Set(r.interests.filter((i): i is Interest => typeof i === 'string' && /^[a-z_]{2,30}$/.test(i)))].slice(0, 20) : [];
  const org = typeof r.org === 'string' && /^[\w-]{1,64}$/.test(r.org) ? r.org : '';
  return { ...(language ? { language } : {}), ...(interests.length ? { interests } : {}), ...(org ? { org } : {}) };
}

/**
 * Does this person match the advanced part? Works on what the viewer was sent — a language someone didn't share
 * isn't there, so it never matches. Communities: members or admins of that group.
 */
export function matchesAdvanced(u: Pick<User, 'id' | 'spokenLanguages' | 'interests'>, f: AdvancedPeopleFilter, orgs: readonly Pick<Organization, 'id' | 'memberIds' | 'adminIds'>[]): boolean {
  if (f.language && !(u.spokenLanguages ?? []).some((l) => l.toLowerCase() === f.language!.toLowerCase())) return false;
  if (f.interests?.length && !f.interests.some((i) => (u.interests ?? []).includes(i))) return false;
  if (f.org) { const o = orgs.find((x) => x.id === f.org); if (!o || !(o.memberIds.includes(u.id) || o.adminIds.includes(u.id))) return false; }
  return true;
}

/* ─────────────── status the client reads (POST /api/plus/status) ─────────────── */

/**
 * Payment providers that can be plugged in later — Stripe Checkout on the web, Apple In-App Purchase inside the
 * iPhone app (App Store Review Guideline 3.1.1: digital subscriptions bought in an iOS app must use IAP).
 * See docs/LUMI_PLUS.md.
 */
export type PaymentProvider = 'stripe' | 'apple_iap';
export type CheckoutPlatform = 'web' | 'ios';

export interface PlusStatus {
  /** LUMI_PLUS flag — false: nothing is gated */
  enabled: boolean;
  /** the signed-in person has Lumi+ now */
  active: boolean;
  /** end of the current period, when there is one */
  until?: string;
  /** can anyone pay yet? false until a provider is configured */
  payments: { open: boolean; providers: PaymentProvider[] };
}

/** never a success without a provider's confirmation: 'unavailable' is the only answer until payments open */
export type CheckoutResult =
  | { status: 'unavailable'; message: string }
  | { status: 'redirect'; url: string }
  | { status: 'native'; provider: 'apple_iap'; productId: string };

export const PAYMENTS_CLOSED = 'Payments aren’t open yet. Nothing was charged.';

export const offlineStatus = (): PlusStatus => ({ enabled: false, active: false, payments: { open: false, providers: [] } });
