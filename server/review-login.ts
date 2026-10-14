/**
 * App Review sign-in — Apple's reviewers can't receive a code at a school inbox.
 *
 * Env (both, or the feature is off and that address is an ordinary e-mail like any other):
 *   REVIEW_LOGIN_EMAIL   the address the reviewer types (any domain — it gets no mail)
 *   REVIEW_LOGIN_CODE    exactly 6 digits (the sign-in and sign-up code fields take 6 digits)
 *
 * With them set, that exact address (case-insensitive):
 *   - POST /api/schools/send-code → answers like a sent code, but sends no mail and stores no code
 *   - POST /api/auth/login        → accepts REVIEW_LOGIN_CODE (constant-time compare) and signs in to the review
 *     account — created on first use as a normal account: not a sample/demo profile, UC Berkeley, school e-mail
 *     verified, so the reviewer sees what a real student sees (no sample people or listings)
 *   - POST /api/schools/verify-code → accepts it too (the sign-up path)
 * Wrong codes: 10 per address per 15 min, and 50 in total per hour, then 429 until the window passes.
 * Log lines start with [review] and never contain the code.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import type { RegisterInput, Snapshot } from '@core/api/types';
import type { ID, User } from '@core/types';

export const REVIEW_SCHOOL_ID = 's_berkeley';
const PER_IP = { max: 10, windowMs: 15 * 60 * 1000 };
const TOTAL = { max: 50, windowMs: 60 * 60 * 1000 };

export interface ReviewConfig { email: string; code: string }

const norm = (email: unknown) => String(email ?? '').trim().toLowerCase();

/** null = off (unset, or a code that isn't 6 digits — logged once at start-up) */
export function reviewConfig(env: NodeJS.ProcessEnv = process.env, log: (m: string) => void = (m) => console.warn(m)): ReviewConfig | null {
  const email = norm(env.REVIEW_LOGIN_EMAIL);
  const code = String(env.REVIEW_LOGIN_CODE ?? '').trim();
  if (!email && !code) return null;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !/^\d{6}$/.test(code)) {
    log('[review] REVIEW_LOGIN_EMAIL / REVIEW_LOGIN_CODE ignored — need an e-mail address and a 6-digit code');
    return null;
  }
  return { email, code };
}

const digest = (s: string) => createHash('sha256').update(s).digest();
/** constant time, whatever the input length */
export const codeMatches = (cfg: ReviewConfig, code: unknown) => timingSafeEqual(digest(String(code ?? '').trim()), digest(cfg.code));

/** the review account's profile — an ordinary Berkeley undergrad with enough filled in for recommendations */
export function reviewAccountInput(email: string, at = new Date()): RegisterInput {
  const y = at.getFullYear();
  return {
    email, nickname: 'Lumi Review', birthYear: y - 20, gender: 'private', avatar: { emoji: '🐻', hue: 210, photoType: 'face' },
    schoolId: REVIEW_SCHOOL_ID, role: 'undergraduate', department: 'Computer Science', year: y - 1, emailVerified: true,
    showSchool: true, showDepartment: true,
    interests: ['coffee', 'study', 'exercise', 'club'], purposes: ['friend', 'study'],
    bio: 'App Store review account.', likes: 'Coffee, hiking, hackathons', freeTime: 'Afternoons', availability: 'after18',
    fieldVisibility: { bio: 'school', likes: 'school', freeTime: 'school', height: 'private', availability: 'school', preferredPartner: 'private', purposes: 'school', interests: 'public', posts: 'school', prompts: 'public', timetable: 'friends', goals: 'school', living: 'friends' },
    prompts: [], goals: ['friends', 'join_club', 'internship'], lookingFor: ['friend', 'study_partner'], canOffer: ['developer'], meetPreference: [],
    locationPermission: 'undecided', notifications: true,
  };
}

export class ReviewLoginError extends Error { constructor(public status: number, message: string) { super(message); } }

export interface ReviewLoginDeps {
  config: ReviewConfig | null;
  db: () => Snapshot;
  findAccount(email: string): Promise<{ userId: ID } | null>;
  createAccount(a: { email: string; userId: ID; createdAt: string }): Promise<void>;
  /** engine.register — adds the user to db */
  register(input: RegisterInput): User;
  /** persist + broadcast the new user and their welcome notification */
  saved(user: User): Promise<void>;
  /** message for a wrong/expired code — the same one normal sign-in uses */
  wrongCode: string;
  now?: () => number;
  log?: (m: string) => void;
}

export function createReviewLogin(deps: ReviewLoginDeps) {
  const now = deps.now ?? Date.now;
  const log = deps.log ?? ((m: string) => console.log(m));
  const fails = new Map<string, number[]>();
  let all: number[] = [];

  /** this address is the review address (and the feature is on) */
  const matches = (email: unknown) => !!deps.config && norm(email) === deps.config.email;

  function check(code: unknown, ip: string) {
    const t0 = now();
    const mine = (fails.get(ip) ?? []).filter((t) => t0 - t < PER_IP.windowMs);
    all = all.filter((t) => t0 - t < TOTAL.windowMs);
    if (mine.length >= PER_IP.max || all.length >= TOTAL.max) {
      log(`[review] sign-in refused — too many wrong codes (${mine.length >= PER_IP.max ? `from ${ip}` : 'in total'})`);
      throw new ReviewLoginError(429, 'Too many attempts. Please wait a few minutes and try again.');
    }
    if (!codeMatches(deps.config!, code)) {
      fails.set(ip, [...mine, t0]); all.push(t0);
      log(`[review] wrong code from ${ip} (${mine.length + 1}/${PER_IP.max})`);
      throw new ReviewLoginError(400, deps.wrongCode);
    }
    fails.delete(ip);
  }

  /** the review account, created on first use */
  async function account(): Promise<{ user: User; created: boolean }> {
    const email = deps.config!.email;
    const acc = await deps.findAccount(email);
    const existing = acc ? deps.db().users.find((u) => u.id === acc.userId) : undefined;
    if (existing) return { user: existing, created: false };
    if (acc) throw new ReviewLoginError(404, 'This account no longer exists.'); // deleted in Settings — the e-mail row is gone with it, so this is rare
    const user = deps.register(reviewAccountInput(email, new Date(now())));
    await deps.createAccount({ email, userId: user.id, createdAt: new Date(now()).toISOString() });
    await deps.saved(user);
    return { user, created: true };
  }

  /** POST /api/auth/login for the review address → the user to issue a session for */
  async function signIn(code: unknown, ip: string): Promise<User> {
    check(code, ip);
    const { user, created } = await account();
    log(`[review] signed in as ${user.id}${created ? ' (account created)' : ''} from ${ip}`);
    return user;
  }

  /** POST /api/schools/verify-code for the review address (sign-up path) */
  function verify(code: unknown, ip: string): boolean {
    try { check(code, ip); log(`[review] code verified from ${ip}`); return true; } catch (e) { if (e instanceof ReviewLoginError && e.status === 429) throw e; return false; }
  }

  return { enabled: !!deps.config, matches, signIn, verify };
}
export type ReviewLogin = ReturnType<typeof createReviewLogin>;
