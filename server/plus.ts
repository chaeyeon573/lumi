/**
 * Lumi+ on the server (S087 · S088) — the flag, the entitlement, checkout, the advanced People filter and the admin switch.
 * What Lumi+ is (price, limits, which filters) lives in @core/lib/plus; this file only decides and enforces.
 *
 *   POST /api/plus/status        (session optional) → PlusStatus — flag, my entitlement, whether payments are open
 *   POST /api/plus/checkout      { platform: 'web'|'ios' } → CheckoutResult. Until a provider is configured: always
 *                                 { status: 'unavailable' } — never a success, nothing is charged, nothing is granted
 *   POST /api/plus/people-match  { filter: AdvancedPeopleFilter } → { ids } — S059 language / interests / communities.
 *                                 Flag on: Lumi+ only (403 otherwise). Matches only what the caller is allowed to see
 *   POST /api/admin/users/:id/plus  x-admin-key: ADMIN_KEY · { on: boolean, until?: ISO date } — testing grants, no client path
 *
 * Env: LUMI_PLUS=1 turns gating on (default off: nothing is gated, everyone keeps today's features and limits).
 *      Read on every call, so flipping it needs only a restart — no data migration either way.
 * Payment providers are not wired yet (docs/LUMI_PLUS.md says what each one needs). `paymentProviders()` is the one
 * place that will report them.
 */
import type { Express, Request, Response, NextFunction } from 'express';
import type { Patch, Snapshot } from '@core/api/types';
import type { ID, User } from '@core/types';
import {
  cleanAdvancedFilter, hasAdvancedFilter, hasPlus, matchesAdvanced, PAYMENTS_CLOSED, PLUS_REQUIRED,
  type CheckoutResult, type PaymentProvider, type PlusStatus,
} from '@core/lib/plus';
import { checkAdmin, ModerationError } from './moderation';

export const plusEnabled = (env: NodeJS.ProcessEnv = process.env) => env.LUMI_PLUS === '1' || env.LUMI_PLUS === 'true';

/**
 * Providers that can take a payment right now. Empty until one is configured — Stripe (web) needs a server-side
 * checkout session + a signed webhook that grants `user.plus`; Apple IAP (iOS shell) needs StoreKit in the app +
 * App Store Server Notifications verified here. Nothing is configured today, so this stays empty.
 */
export function paymentProviders(_env: NodeJS.ProcessEnv = process.env): PaymentProvider[] {
  return [];
}

export function plusStatusFor(user: User | undefined, env: NodeJS.ProcessEnv = process.env, now = new Date()): PlusStatus {
  const providers = paymentProviders(env);
  const active = hasPlus(user, now);
  return {
    enabled: plusEnabled(env),
    active,
    ...(active && user?.plus?.until ? { until: user.plus.until } : {}),
    payments: { open: providers.length > 0, providers },
  };
}

/** the person may use the Lumi+ extras: flag off → everyone; flag on → active Lumi+ only */
export const plusAllowed = (user: User | undefined, env: NodeJS.ProcessEnv = process.env, now = new Date()) => !plusEnabled(env) || hasPlus(user, now);

/** checkout (S088 Continue Securely). Until a provider exists the answer is always 'unavailable' */
export function startCheckout(_user: User, platform: string, env: NodeJS.ProcessEnv = process.env): CheckoutResult {
  const providers = paymentProviders(env);
  const want: PaymentProvider = platform === 'ios' ? 'apple_iap' : 'stripe';
  if (!plusEnabled(env) || !providers.includes(want)) return { status: 'unavailable', message: PAYMENTS_CLOSED };
  // a configured provider plugs in here (Stripe: create a Checkout Session → { status: 'redirect', url };
  // Apple: { status: 'native', provider: 'apple_iap', productId }). Lumi+ is granted only by the provider's
  // confirmed webhook / receipt, never by this call.
  return { status: 'unavailable', message: PAYMENTS_CLOSED };
}

/** ids of the people (as the viewer sees them) who match the advanced filter */
export function matchPeople(view: Pick<Snapshot, 'users' | 'organizations'>, me: ID, raw: unknown): ID[] {
  const f = cleanAdvancedFilter(raw);
  return view.users.filter((u) => u.id !== me && matchesAdvanced(u, f, view.organizations)).map((u) => u.id);
}

/** admin switch — on: Lumi+ from now (until the given date, or open-ended); off: removed */
export function setPlus(db: Pick<Snapshot, 'users'>, userId: ID, on: boolean, until?: string, now = new Date()): Patch {
  const u = db.users.find((x) => x.id === userId);
  if (!u) throw new ModerationError(404, 'No such user.');
  if (u.sample) throw new ModerationError(409, 'Sample profiles can’t have Lumi+.');
  if (on) {
    const end = until ? new Date(until) : undefined;
    if (end && (Number.isNaN(end.getTime()) || end.getTime() <= now.getTime())) throw new ModerationError(400, '`until` must be a future date.');
    u.plus = { since: now.toISOString(), ...(end ? { until: end.toISOString() } : {}), source: 'admin' };
  } else delete u.plus;
  return { users: [u] };
}

type Req = Request & { userId?: ID };
type Handler = (req: Req, res: Response) => Promise<unknown> | unknown;
export interface PlusDeps {
  db: () => Snapshot;
  auth: (req: Request, res: Response, next: NextFunction) => unknown;
  wrap: (fn: Handler) => (req: Request, res: Response, next: NextFunction) => unknown;
  requireUser: (req: Req) => ID;
  bad: (msg: string, status?: number) => Error;
  /** what this viewer is allowed to see (server/view.ts snapshotFor) */
  viewFor: (me: ID) => Pick<Snapshot, 'users' | 'organizations'>;
  /** save + broadcast (the user patch reaches only that person with `plus` — lib/privacy OWNER_ONLY_KEYS) */
  push: (patch: Patch) => void;
  env?: () => NodeJS.ProcessEnv;
}

export function registerPlusRoutes(app: Express, deps: PlusDeps) {
  const env = () => deps.env?.() ?? process.env;
  const user = (id?: ID) => (id ? deps.db().users.find((u) => u.id === id) : undefined);

  app.post('/api/plus/status', deps.auth, deps.wrap((req) => plusStatusFor(user(req.userId), env())));

  app.post('/api/plus/checkout', deps.auth, deps.wrap((req) => {
    const me = user(deps.requireUser(req))!;
    return startCheckout(me, String(req.body?.platform ?? 'web'), env());
  }));

  app.post('/api/plus/people-match', deps.auth, deps.wrap((req) => {
    const me = deps.requireUser(req);
    const filter = cleanAdvancedFilter(req.body?.filter);
    if (!hasAdvancedFilter(filter)) return { ids: [] };
    if (!plusAllowed(user(me), env())) throw deps.bad(PLUS_REQUIRED.filters, 403);
    return { ids: matchPeople(deps.viewFor(me), me, filter) };
  }));

  app.post('/api/admin/users/:id/plus', deps.wrap((req) => {
    try {
      checkAdmin(req, env());
      const patch = setPlus(deps.db(), String(req.params.id), req.body?.on === true, typeof req.body?.until === 'string' ? req.body.until : undefined);
      deps.push(patch);
      const u = patch.users![0];
      return { id: u.id, plus: u.plus ?? null };
    } catch (e) { throw e instanceof ModerationError ? deps.bad(e.message, e.status) : e; }
  }));
}
