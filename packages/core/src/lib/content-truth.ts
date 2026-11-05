import type { Opportunity, Organization, User } from '../types';
/** Treat provider ingestion as a trust boundary. A URL alone is not a verified listing. */
export function currentOpportunities(
  items: Opportunity[],
  demo = false,
  now = new Date(),
): Opportunity[] {
  const today = now.toISOString().slice(0, 10);
  const seen = new Set<string>();
  return items.filter((o) => {
    if (!demo && o.sourceVerified !== true) return false;
    if (!/^https:\/\//i.test(o.sourceUrl)) return false;
    if (
      !o.lastVerified ||
      !Number.isFinite(Date.parse(o.lastVerified)) ||
      Date.parse(o.lastVerified) > now.getTime()
    )
      return false;
    const end = o.deadline || o.date;
    if (end && end.slice(0, 10) < today) return false;
    const key =
      o.sourceUrl.replace(/\/$/, '') + '|' + o.title.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
export function verifiedMemberships(orgs: Organization[], userId: string) {
  return orgs.filter((o) => o.memberIds.includes(userId));
}
export function discoverableClassmate(user: User) {
  return user.classmateOptIn === true && !user.deleted && !user.suspended;
}
