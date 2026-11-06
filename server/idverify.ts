/**
 * Student ID photo verification — the fallback when a school e-mail can't be used (owner 2026-11-06:
 * "메일로 인증하고, 안되면 그냥 학생증사진찍어달라고하셈"). E-mail first; alumni without a school address, or anyone whose
 * code never arrives, sends a photo of their student ID (alumni: alumni card or diploma) and an admin checks it.
 *
 *   POST /api/verification/student-id        { data: base64 JPEG }  signed in, account in the ID flow → { user }
 *   GET  /admin/verifications                review page (no data in the HTML — it asks for ADMIN_KEY and calls the API)
 *   GET  /api/admin/verifications            x-admin-key — requests waiting for review (no image in the list)
 *   GET  /api/admin/verifications/:id/photo  x-admin-key — the image, no-store
 *   POST /api/admin/verifications/:id/approve { note? }
 *   POST /api/admin/verifications/:id/reject  { reason }   (shown to the student)
 *
 * Rules (tests: server/idverify.test.ts):
 * - Sign-up without a verified school e-mail creates the account with verification { status: 'pending' } (registerProblem).
 *   Birth year is checked first — 16+ stays the rule on this path too.
 * - While pending or rejected the account can sign in and look around, but it is hidden from everyone else
 *   (server/moderation.ts moderationState treats it like a suspended account for other viewers) and the server refuses
 *   anything that reaches another person: posting, meetups, messages, friend requests, group requests, plans,
 *   photos, class Q&A (pendingGate — an allowlist, so a new RPC is refused until someone decides otherwise).
 * - The photo is stored outside the snapshot (store docs `idPhotos`, never in /api/media), re-encoded on the phone and
 *   stripped of EXIF/XMP/comments again here (cleanJpeg). Only the admin API serves it, with no-store.
 * - Approve → affiliation.emailVerified = true (the school badge), verification.status = 'approved', the account
 *   appears to others. Reject → status 'rejected' + reason, still hidden, may send a new photo. Either way the photo is
 *   deleted right away and the student gets an in-app notification. The request record (no image) stays as an audit line.
 * - 5 photos per account per day, 20 per network per day. Deleting the account deletes its requests and photo.
 */
import type { Express, NextFunction, Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import type { Patch, RegisterInput, Snapshot } from '@core/api/types';
import type { ID, Notification, User } from '@core/types';
import { birthYearProblem } from '@core/lib/signup';
import { awaitingVerification, ID_PHOTO_MAX_BYTES, ID_PHOTO_MIN_SIDE, ID_REASON_MAX } from '@core/lib/verification';
import { uid } from '@core/lib/format';
import type { Store } from './store';
import { adminName, checkAdmin, footprint, moderationChanged, ModerationError } from './moderation';
import { verificationPageHtml } from './idverify-page';

export const ID_REQUESTS = 'idVerifications';
export const ID_PHOTOS = 'idPhotos';
export const PHOTOS_PER_USER_DAY = 5;
export const PHOTOS_PER_IP_DAY = 20;
/** what a waiting account is told when it tries something that reaches other people */
export const PENDING_MESSAGE = 'We’re still checking your student ID — you can do this once you’re verified (usually within a day).';

/** one photo sent for review. The image lives in ID_PHOTOS under the same id until the decision */
export interface IdRequest {
  id: ID;
  userId: ID;
  schoolId: ID;
  submittedAt: string;
  bytes: number;
  width: number;
  height: number;
  /** set when an admin decides — the photo is gone by then */
  decision?: { status: 'approved' | 'rejected' | 'withdrawn'; by: string; at: string; note?: string };
}
interface IdPhoto { id: ID; mime: 'image/jpeg'; data: string }

export class IdVerifyError extends Error { constructor(public status: number, message: string) { super(message); } }

// ─── sign-up ──────────────────────────────────────────────────────────────────
/**
 * /api/auth/register: why this sign-up is refused, or what verification state the new account starts with.
 * Birth year first (16+), then: a verified school e-mail → verified; no e-mail → waits for a student ID photo.
 */
export function registerProblem(input: Pick<RegisterInput, 'birthYear'>, emailVerified: boolean, now = new Date()):
  { error: 'under_16' | 'invalid' } | { verification: User['verification'] } {
  const age = birthYearProblem(input.birthYear, now);
  if (age) return { error: age };
  return { verification: emailVerified ? undefined : { method: 'student_id', status: 'pending' } };
}

// ─── the photo ────────────────────────────────────────────────────────────────
/**
 * Walk a JPEG's segments and drop everything that can carry personal data: APP1–APP13 and APP15 (EXIF with GPS, XMP,
 * IPTC, ICC, maker notes) and comments. APP0 (JFIF) and APP14 (Adobe colour transform) stay. Scans are copied as they are.
 * Returns null when the bytes aren't a well-formed JPEG (so a renamed file or a truncated upload is refused).
 */
export function cleanJpeg(b: Buffer): { data: Buffer; width: number; height: number } | null {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  const out: Buffer[] = [b.subarray(0, 2)];
  let i = 2; let width = 0; let height = 0; let scans = 0;
  while (i < b.length) {
    if (b[i] !== 0xff) return null;
    let m = b[i + 1];
    while (m === 0xff) { i++; m = b[i + 1]; } // fill bytes
    if (m === undefined) return null;
    if (m === 0xd9) { out.push(Buffer.from([0xff, 0xd9])); i += 2; break; } // EOI
    if ((m >= 0xd0 && m <= 0xd7) || m === 0x01) { out.push(b.subarray(i, i + 2)); i += 2; continue; }
    if (i + 4 > b.length) return null;
    const len = b.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > b.length) return null;
    const seg = b.subarray(i, i + 2 + len);
    const isSof = m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;
    if (isSof) { if (len < 7) return null; height = b.readUInt16BE(i + 5); width = b.readUInt16BE(i + 7); }
    const drop = (m >= 0xe1 && m <= 0xef && m !== 0xee) || m === 0xfe;
    if (!drop) out.push(seg);
    i += 2 + len;
    if (m === 0xda) {
      // entropy-coded data runs until the next marker that isn't a stuffed 0x00 or a restart marker
      scans++;
      let j = i;
      while (j < b.length - 1 && !(b[j] === 0xff && b[j + 1] !== 0x00 && !(b[j + 1] >= 0xd0 && b[j + 1] <= 0xd7))) j++;
      if (j >= b.length - 1) return null;
      out.push(b.subarray(i, j));
      i = j;
    }
  }
  if (!width || !height || !scans) return null;
  return { data: Buffer.concat(out), width, height };
}

/** base64 or data: URL → a cleaned JPEG, or a sentence the student can act on */
export function acceptIdPhoto(raw: unknown): { data: Buffer; width: number; height: number } | { error: string } {
  if (typeof raw !== 'string' || !raw) return { error: 'Add a photo of your student ID first.' };
  const b64 = raw.replace(/^data:[^,]*,/, '');
  if (b64.length > Math.ceil(ID_PHOTO_MAX_BYTES / 3) * 4 + 8) return { error: 'That photo is too large — try again from the camera.' };
  if (!/^[A-Za-z0-9+/=\s]+$/.test(b64)) return { error: 'That file couldn’t be read. Please take a photo instead.' };
  const buf = Buffer.from(b64, 'base64');
  if (buf.length > ID_PHOTO_MAX_BYTES) return { error: 'That photo is too large — try again from the camera.' };
  const clean = cleanJpeg(buf);
  if (!clean) return { error: 'Only photos can be sent (JPEG). Please take a photo of the card.' };
  if (Math.max(clean.width, clean.height) < ID_PHOTO_MIN_SIDE) return { error: 'That photo is too small to read — move closer and try again.' };
  return clean;
}

// ─── service ─────────────────────────────────────────────────────────────────
export interface IdVerifyDeps {
  db: () => Snapshot;
  store: Pick<Store, 'listDocs' | 'getDoc' | 'putDocs' | 'removeDocs'>;
  /** persist + broadcast (each viewer's copy is filtered by server/view.ts) */
  push(patch: Patch): void;
  now?: () => Date;
}

export function createIdVerify(deps: IdVerifyDeps) {
  const requests = new Map<ID, IdRequest>();
  const now = () => deps.now?.() ?? new Date();
  const sent = new Map<string, number[]>();
  const user = (id: ID) => deps.db().users.find((u) => u.id === id);
  const open = (r: IdRequest) => !r.decision;

  function limited(key: string, max: number): boolean {
    const t = now().getTime();
    const recent = (sent.get(key) ?? []).filter((x) => x > t - 86400_000);
    sent.set(key, recent);
    return recent.length >= max;
  }
  const count = (key: string) => { (sent.get(key) ?? sent.set(key, []).get(key)!).push(now().getTime()); };

  function notify(userId: ID, title: string, body: string, link: string): Notification {
    const n: Notification = { id: uid('nt'), userId, type: 'verification', title, body, link, read: false, createdAt: now().toISOString() };
    deps.db().notifications.unshift(n);
    return n;
  }

  /** drop the image and close every open request of this person (one with `except` stays open) */
  async function closeOpen(userId: ID, decision: IdRequest['decision'], except?: ID) {
    const closing = [...requests.values()].filter((r) => r.userId === userId && open(r) && r.id !== except);
    for (const r of closing) r.decision = decision;
    if (closing.length) {
      await deps.store.removeDocs(ID_PHOTOS, closing.map((r) => r.id));
      await deps.store.putDocs(ID_REQUESTS, closing);
    }
    return closing;
  }

  return {
    async load() {
      requests.clear();
      for (const r of await deps.store.listDocs<IdRequest>(ID_REQUESTS)) requests.set(r.id, r);
      const waiting = [...requests.values()].filter(open).length;
      if (waiting) console.log(`[idverify] ${waiting} student ID photos waiting for review`);
    },

    /** a student sends (or re-sends) a photo. Returns the updated user */
    async submit(userId: ID, raw: unknown, ip: string): Promise<User> {
      const u = user(userId);
      if (!u) throw new IdVerifyError(401, 'Please sign in first.');
      if (u.sample) throw new IdVerifyError(400, 'Example accounts can’t send a student ID.');
      if (!awaitingVerification(u)) throw new IdVerifyError(409, u.verification?.status === 'approved' || (u.affiliation.type === 'university' && u.affiliation.emailVerified) ? 'You’re already verified.' : 'This account doesn’t need a student ID check.');
      if (u.affiliation.type !== 'university' || !u.affiliation.schoolId) throw new IdVerifyError(400, 'Pick your school first.');
      if (limited(`u:${userId}`, PHOTOS_PER_USER_DAY)) throw new IdVerifyError(429, 'You’ve sent a few photos today — please try again tomorrow.');
      if (limited(`ip:${ip}`, PHOTOS_PER_IP_DAY)) throw new IdVerifyError(429, 'Too many photos from this network today — please try again tomorrow.');
      const photo = acceptIdPhoto(raw);
      if ('error' in photo) throw new IdVerifyError(400, photo.error);
      count(`u:${userId}`); count(`ip:${ip}`);
      const at = now().toISOString();
      const req: IdRequest = { id: `iv_${randomBytes(12).toString('hex')}`, userId, schoolId: u.affiliation.schoolId, submittedAt: at, bytes: photo.data.length, width: photo.width, height: photo.height };
      const file: IdPhoto = { id: req.id, mime: 'image/jpeg', data: photo.data.toString('base64') };
      await deps.store.putDocs(ID_PHOTOS, [file]);
      await deps.store.putDocs(ID_REQUESTS, [req]);
      requests.set(req.id, req);
      // a newer photo replaces the one still waiting
      await closeOpen(userId, { status: 'withdrawn', by: 'student', at, note: 'replaced by a newer photo' }, req.id);
      u.verification = { method: 'student_id', status: 'pending', submittedAt: at };
      deps.push({ users: [u] });
      console.log(`[idverify] ${userId} sent a student ID photo (${req.width}×${req.height}, ${Math.round(req.bytes / 1024)} KB)`);
      return u;
    },

    /** waiting requests, oldest first, with what the reviewer compares the card against */
    pending() {
      return [...requests.values()].filter(open).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt)).map((r) => {
        const u = user(r.userId);
        const school = deps.db().schools.find((s) => s.id === r.schoolId);
        const aff = u?.affiliation.type === 'university' ? u.affiliation : undefined;
        return {
          id: r.id, submittedAt: r.submittedAt, width: r.width, height: r.height, bytes: r.bytes,
          user: u ? { id: u.id, nickname: u.nickname, birthYear: u.birthYear, role: aff?.role ?? null, createdAt: u.createdAt, previousReason: u.verification?.status === 'pending' ? null : u.verification?.reason ?? null } : null,
          school: { id: r.schoolId, name: school?.name ?? aff?.schoolName ?? r.schoolId, emailDomain: school?.emailDomain ?? null },
          schoolChanged: !!aff && aff.schoolId !== r.schoolId,
        };
      });
    },

    /** the image — admin API only */
    async photo(id: ID): Promise<{ mime: string; data: Buffer } | null> {
      const r = requests.get(id);
      if (!r || !open(r)) return null;
      const p = await deps.store.getDoc<IdPhoto>(ID_PHOTOS, id);
      return p ? { mime: p.mime, data: Buffer.from(p.data, 'base64') } : null;
    },

    async approve(id: ID, by: string, note?: string): Promise<Patch> {
      const r = requests.get(id);
      if (!r) throw new IdVerifyError(404, 'No request with that id.');
      if (!open(r)) throw new IdVerifyError(409, `Already decided (${r.decision!.status} by ${r.decision!.by}).`);
      const u = user(r.userId);
      if (!u) throw new IdVerifyError(404, 'That account no longer exists.');
      if (u.affiliation.type !== 'university' || u.affiliation.schoolId !== r.schoolId) throw new IdVerifyError(409, 'They changed school after sending this photo — reject it and ask for a new one.');
      const at = now().toISOString();
      await closeOpen(u.id, { status: 'approved', by, at, ...(note ? { note: note.slice(0, 500) } : {}) });
      u.affiliation = { ...u.affiliation, emailVerified: true };
      u.verification = { method: 'student_id', status: 'approved', submittedAt: r.submittedAt, decidedAt: at };
      moderationChanged();
      const n = notify(u.id, 'You’re verified', 'Thanks for your patience — your student ID checked out. Say hi to people on campus!', '/');
      const patch: Patch = { ...footprint(deps.db(), u.id), users: [u], notifications: [n] };
      deps.push(patch);
      console.log(`[idverify] ${by} approved ${u.id} for ${r.schoolId}`);
      return patch;
    },

    async reject(id: ID, by: string, reason: string): Promise<Patch> {
      const why = reason.replace(/\s+/g, ' ').trim().slice(0, ID_REASON_MAX);
      if (!why) throw new IdVerifyError(400, 'Write a short reason — the student sees it.');
      const r = requests.get(id);
      if (!r) throw new IdVerifyError(404, 'No request with that id.');
      if (!open(r)) throw new IdVerifyError(409, `Already decided (${r.decision!.status} by ${r.decision!.by}).`);
      const u = user(r.userId);
      const at = now().toISOString();
      await closeOpen(r.userId, { status: 'rejected', by, at, note: why });
      if (!u) return {};
      u.verification = { method: 'student_id', status: 'rejected', submittedAt: r.submittedAt, decidedAt: at, reason: why };
      const n = notify(u.id, 'We couldn’t verify your student ID', `${why} You can send a new photo.`, '/verify-id');
      const patch: Patch = { users: [u], notifications: [n] };
      deps.push(patch);
      console.log(`[idverify] ${by} rejected the photo from ${u.id}`);
      return patch;
    },

    /** the student verified a school e-mail after all (attach-email) — no photo needed any more */
    async verifiedByEmail(userId: ID): Promise<void> {
      const u = user(userId);
      await closeOpen(userId, { status: 'withdrawn', by: 'student', at: now().toISOString(), note: 'verified with school e-mail' });
      if (u && awaitingVerification(u)) { delete u.verification; moderationChanged(); deps.push({ ...footprint(deps.db(), userId), users: [u] }); }
    },

    /** account deletion — the photo and every request line */
    async forgetUser(userId: ID): Promise<void> {
      const mine = [...requests.values()].filter((r) => r.userId === userId).map((r) => r.id);
      if (!mine.length) return;
      mine.forEach((id) => requests.delete(id));
      await deps.store.removeDocs(ID_PHOTOS, mine);
      await deps.store.removeDocs(ID_REQUESTS, mine);
    },

    /** tests */
    requests: () => [...requests.values()],
  };
}
export type IdVerify = ReturnType<typeof createIdVerify>;

// ─── what a waiting account may do ───────────────────────────────────────────
/**
 * RPCs a waiting account may still call — its own profile and settings, private bookmarks, reading notifications,
 * blocking and reporting (safety stays open), following a club (sign-up follows the picked clubs). Everything else
 * that reaches another person is refused until approval. An allowlist: a new method is refused until it is added here.
 */
const PENDING_RPC: Record<string, Record<string, true | ((args: unknown[]) => boolean)>> = {
  users: { update: true, setAvailability: true, dailyResults: true },
  relationships: { block: true, unblock: true, toggleFollow: (args) => args[2] === 'org' },
  posts: { toggleSave: true },
  opportunities: { toggleSave: true },
  chats: { markRead: true },
  notifications: { markRead: true, markAllRead: true },
  reports: { create: true },
};
export function pendingMayCall(group: string, method: string, args: unknown[]): boolean {
  const rule = Object.prototype.hasOwnProperty.call(PENDING_RPC, group) && Object.prototype.hasOwnProperty.call(PENDING_RPC[group], method) ? PENDING_RPC[group][method] : undefined;
  return rule === true || (typeof rule === 'function' && rule(args));
}

type Req = Request & { userId?: ID };
/**
 * Mounted on /api/rpc, /api/media and /api/classqa after the session middleware (server/index.ts), before their routes.
 * A waiting account gets 403 with PENDING_MESSAGE for anything outside the allowlist.
 */
export function pendingGate(db: () => Pick<Snapshot, 'users'>) {
  return (req: Req, res: Response, next: NextFunction) => {
    const u = req.userId ? db().users.find((x) => x.id === req.userId) : undefined;
    if (!awaitingVerification(u) || req.method !== 'POST') { next(); return; }
    let ok = false;
    if (req.baseUrl === '/api/rpc') {
      const [, group = '', method = ''] = req.path.split('/');
      ok = pendingMayCall(group, method, Array.isArray(req.body?.args) ? req.body.args : []);
    } else if (req.baseUrl === '/api/classqa') ok = req.path === '/list';
    if (ok) { next(); return; }
    res.status(403).json({ error: PENDING_MESSAGE, verification: 'pending' });
  };
}

// ─── routes ──────────────────────────────────────────────────────────────────
export interface IdVerifyRouteDeps {
  auth: (req: Req, res: Response, next: NextFunction) => unknown;
  env?: NodeJS.ProcessEnv;
}

export function registerIdVerifyRoutes(app: Express, iv: IdVerify, deps: IdVerifyRouteDeps) {
  const env = () => deps.env ?? process.env;
  const handle = (fn: (req: Req, res: Response) => unknown) => async (req: Req, res: Response) => {
    try { const out = await fn(req, res); if (!res.headersSent) res.json(out ?? {}); }
    catch (e) {
      const status = e instanceof IdVerifyError || e instanceof ModerationError ? e.status : 500;
      if (status === 500) console.error('[idverify] failed', e);
      res.status(status).json({ error: e instanceof Error && status !== 500 ? e.message : 'Something went wrong — please try again.' });
    }
  };

  app.post('/api/verification/student-id', deps.auth, handle(async (req) => {
    if ((req as { suspended?: boolean }).suspended) throw new IdVerifyError(403, 'This account is suspended.');
    if (!req.userId) throw new IdVerifyError(401, 'Please sign in first.');
    return { user: await iv.submit(req.userId, req.body?.data, req.ip ?? 'unknown') };
  }));

  app.get('/admin/verifications', (_req, res) => {
    res.set({
      'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer',
      'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src blob:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    });
    res.type('html').send(verificationPageHtml());
  });

  const admin = (fn: (req: Req, by: string, res: Response) => unknown) => handle((req, res) => { checkAdmin(req, env()); return fn(req, adminName(req), res); });
  const body = (req: Request) => (req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {});

  app.get('/api/admin/verifications', admin(() => ({ requests: iv.pending() })));
  app.get('/api/admin/verifications/:id/photo', admin(async (req, _by, res) => {
    const p = await iv.photo(String(req.params.id));
    if (!p) throw new IdVerifyError(404, 'No photo — it was decided already or never arrived.');
    res.set({ 'content-type': p.mime, 'cache-control': 'no-store, private', 'x-content-type-options': 'nosniff', 'content-disposition': 'inline' });
    res.end(p.data);
  }));
  app.post('/api/admin/verifications/:id/approve', admin(async (req, by) => {
    await iv.approve(String(req.params.id), by, typeof body(req).note === 'string' ? String(body(req).note).trim() || undefined : undefined);
    return { ok: true };
  }));
  app.post('/api/admin/verifications/:id/reject', admin(async (req, by) => {
    await iv.reject(String(req.params.id), by, typeof body(req).reason === 'string' ? String(body(req).reason) : '');
    return { ok: true };
  }));
}
