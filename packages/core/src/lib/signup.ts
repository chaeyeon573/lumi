import type { ID, Organization } from '@core/types';

/**
 * Sign-up rules shared by the server (`/api/auth/register`, `/api/schools/orgs`) and the mock API.
 * WP1 Onboarding (S008–S011) — docs/design/harness-a/PLAN.md.
 */

/** Lumi is 16+ (Terms §1, owner 2026-10-14: some freshmen start college at 16). Birth year only — a floor, not proof */
export const MIN_AGE = 16;

/** null when the birth year is acceptable, otherwise why not ('invalid' | 'under_16') */
export function birthYearProblem(birthYear: unknown, now = new Date()): null | 'invalid' | 'under_16' {
  const y = Number(birthYear);
  if (!Number.isInteger(y) || y < 1900 || y > now.getFullYear()) return 'invalid';
  if (y > now.getFullYear() - MIN_AGE) return 'under_16';
  return null;
}

/** The academic year a student entered, from "1st / 2nd / 3rd / 4th+" (the year turns in August — same as yearMajor()) */
export function entryYearFor(yearInSchool: number | undefined, now = new Date()): number {
  const academic = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1;
  const y = Math.min(4, Math.max(1, Math.round(yearInSchool || 1)));
  return academic - y + 1;
}

/** One row of the sign-up org search (S010) — public facts only: no members, followers or counts */
export interface OrgHit { id: ID; name: string; type: Organization['type'] }

/**
 * Organizations of one school matching `query` (S010 "Search organizations", before an account exists).
 * Name prefix first, then a word that starts with the query, then anywhere in the name. School offices
 * (`department`) and ids in `hide` (demo orgs) are left out. Needs 2+ characters.
 */
export function searchOrgs(orgs: readonly Organization[], schoolId: ID, query: string, opts: { hide?: ReadonlySet<ID>; limit?: number } = {}): OrgHit[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' ');
  if (q.length < 2 || !schoolId) return [];
  const limit = Math.max(1, Math.min(opts.limit ?? 8, 20));
  const rank = (name: string) => {
    const n = name.toLowerCase();
    if (n.startsWith(q)) return 0;
    if (n.split(/[\s\-–—/(),.&]+/).some((w) => w.startsWith(q))) return 1;
    return n.includes(q) ? 2 : -1;
  };
  return orgs
    .filter((o) => o.schoolId === schoolId && o.type !== 'department' && !opts.hide?.has(o.id))
    .map((o) => ({ o, r: rank(o.name) }))
    .filter((x) => x.r >= 0)
    .sort((a, b) => a.r - b.r || a.o.name.length - b.o.name.length || a.o.name.localeCompare(b.o.name))
    .slice(0, limit)
    .map(({ o }) => ({ id: o.id, name: o.name, type: o.type }));
}
