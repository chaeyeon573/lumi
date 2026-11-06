/**
 * A personal sign-in e-mail for accounts verified (or waiting) with a student ID photo (server/idverify.ts).
 * They have no school address, so without this the phone they signed up on is their only way back in.
 *
 *   POST /api/auth/signin-email  { email, code }  signed in, student-ID account → { user }
 *
 * The code is sent the same way as a sign-in code (POST /api/schools/send-code with no school — the login path).
 * Rules (tests: server/signin-email.test.ts):
 * - Only for accounts in the student-ID flow (user.verification set). Any address; checked with the 6-digit code.
 * - It is a sign-in address only: it never sets affiliation.emailVerified, never changes verification, never gives
 *   the badge. /api/auth/register and /api/auth/attach-email accept only the school's own domain (schoolEmailOk), so
 *   a personal address can't be turned into school verification through them either.
 * - One per account — a new one replaces the old (the old address stops signing in). Login by code finds it through
 *   the accounts table like a school address. user.signInEmail is owner-only (lib/privacy OWNER_ONLY_KEYS) and the
 *   accounts row goes with account deletion (store.forgetUser).
 */
import type { Express, NextFunction, Request, Response } from 'express';
import type { Patch, Snapshot } from '@core/api/types';
import type { ID, School } from '@core/types';
import type { Store } from './store';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** is this address on the school's own domain (or a subdomain)? VERIFY_EMAIL_DOMAIN=0 turns the check off (local testing) */
export function schoolEmailOk(email: string, school: Pick<School, 'emailDomain'> | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.VERIFY_EMAIL_DOMAIN === '0') return true;
  const d = school?.emailDomain?.trim().toLowerCase();
  if (!d) return false;
  const e = email.trim().toLowerCase();
  return e.endsWith(`@${d}`) || e.endsWith(`.${d}`);
}

export class SignInEmailError extends Error { constructor(public status: number, message: string) { super(message); } }

export interface SignInEmailDeps {
  db: () => Snapshot;
  store: Pick<Store, 'takeCode' | 'findAccount' | 'createAccount' | 'deleteAccount'>;
  auth: (req: Request & { userId?: ID }, res: Response, next: NextFunction) => unknown;
  push(patch: Patch): void;
  /** the App Review address is never somebody's personal sign-in e-mail */
  reserved?: (email: string) => boolean;
  now?: () => Date;
}

export async function addSignInEmail(deps: Omit<SignInEmailDeps, 'auth'>, userId: ID, rawEmail: unknown, rawCode: unknown) {
  const u = deps.db().users.find((x) => x.id === userId);
  if (!u) throw new SignInEmailError(401, 'Please sign in first.');
  if (!u.verification) throw new SignInEmailError(409, 'Your account signs in with your school email.');
  const email = String(rawEmail ?? '').trim().toLowerCase();
  const code = String(rawCode ?? '').trim();
  if (!EMAIL_RE.test(email) || email.length > 200) throw new SignInEmailError(400, 'Check the email address.');
  if (deps.reserved?.(email)) throw new SignInEmailError(409, 'That email can’t be used here.');
  const saved = await deps.store.takeCode(email);
  if (!saved || saved.code !== code || Date.parse(saved.expiresAt) < (deps.now?.() ?? new Date()).getTime()) throw new SignInEmailError(400, 'That code didn’t match. Check the latest email and try again.');
  const owner = await deps.store.findAccount(email);
  if (owner && owner.userId !== userId) throw new SignInEmailError(409, 'That email already belongs to another Lumi account.');
  if (u.signInEmail && u.signInEmail !== email) await deps.store.deleteAccount(u.signInEmail);
  if (!owner) await deps.store.createAccount({ email, userId, createdAt: (deps.now?.() ?? new Date()).toISOString() });
  u.signInEmail = email;
  deps.push({ users: [u] });
  console.log(`[signin-email] ${userId} added a personal sign-in email`);
  return u;
}

export function registerSignInEmailRoutes(app: Express, deps: SignInEmailDeps) {
  app.post('/api/auth/signin-email', deps.auth, async (req: Request & { userId?: ID; suspended?: boolean }, res: Response) => {
    try {
      if (req.suspended || !req.userId) throw new SignInEmailError(401, 'Please sign in first.');
      res.json({ user: await addSignInEmail(deps, req.userId, req.body?.email, req.body?.code) });
    } catch (e) {
      const status = e instanceof SignInEmailError ? e.status : 500;
      if (status === 500) console.error('[signin-email] failed', e);
      res.status(status).json({ error: e instanceof SignInEmailError ? e.message : 'Something went wrong — please try again.' });
    }
  });
}
