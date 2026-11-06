/**
 * Groups (orgs) — RPC permissions for S026 Create a group / S091 Membership requests, and the
 * signed-out Explore (S089).
 *
 *   POST /api/rpc/orgs/apply               [orgId, me]              — anyone, as themselves (unchanged)
 *   POST /api/rpc/orgs/create              [me, OrgInput]           — a signed-in student creates a group (engine checks school + name)
 *   POST /api/rpc/orgs/respondApplication  [orgId, userId, accept]  — only that group's admins
 *   POST /api/rpc/orgs/leave               [orgId, me]              — a member leaves (the last organizer can't — engine says why)
 *   GET  /api/public/explore?school=<id>                            — no session; public listings + club directory, no people
 *
 * The RULES table in index.ts spreads ORG_RULES in; orgs.test.ts checks the same table.
 */
import type { Express, Request, Response, NextFunction } from 'express';
import type { Snapshot } from '@core/api/types';
import type { ID } from '@core/types';
import { publicExplore, type PublicExplore } from '@core/lib/publicexplore';
import type { Rule } from './together-rules';
import { SAMPLE_OPPORTUNITY_IDS, SAMPLE_ORG_IDS } from './samples';

export const orgRules = (db: () => Pick<Snapshot, 'organizations'>) => ({
  apply: 1,
  create: 0,
  respondApplication: (me: ID, args: unknown[]) => !!db().organizations.find((o) => o.id === args[0])?.adminIds.includes(me),
  leave: 1,
}) satisfies Record<string, Rule>;

/** same school, same answer for a minute — the page is public, so it must stay cheap */
const CACHE_MS = 60_000;

export function publicExploreFor(db: Pick<Snapshot, 'schools' | 'opportunities' | 'organizations'>, schoolId: ID): PublicExplore {
  return publicExplore(db, schoolId, { sampleOpportunityIds: SAMPLE_OPPORTUNITY_IDS, sampleOrgIds: SAMPLE_ORG_IDS });
}

type Wrap = (fn: (req: Request, res: Response) => Promise<unknown> | unknown) => (req: Request, res: Response, next: NextFunction) => unknown;

export function registerPublicExploreRoute(app: Express, deps: { db: () => Snapshot; wrap: Wrap; bad: (msg: string, status?: number) => Error }) {
  const cache = new Map<ID, { at: number; out: PublicExplore }>();
  app.get('/api/public/explore', deps.wrap(async (req, res) => {
    const schoolId = String(req.query.school ?? 's_berkeley').slice(0, 64);
    const hit = cache.get(schoolId);
    const out = hit && Date.now() - hit.at < CACHE_MS ? hit.out : publicExploreFor(deps.db(), schoolId);
    if (!out.school) throw deps.bad('This school isn’t open on Lumi yet.', 404);
    if (out !== hit?.out) cache.set(schoolId, { at: Date.now(), out });
    res.setHeader('cache-control', 'public, max-age=120');
    return out;
  }));
}
