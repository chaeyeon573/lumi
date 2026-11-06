/**
 * Club "Ask to join" — the server side (owner decisions 2026-11-06). Rules shared with the screens: @core/lib/clubjoin.
 *
 * Students (signed in):
 *   POST /api/clubs/ask       { orgId, consent }   → record the request with the consent line the student saw (engine orgs.apply),
 *                                                    then maybe the outreach e-mail. Returns { patch, status } — status is only what
 *                                                    really happened ('saved' | 'sent' | 'told')
 *   POST /api/clubs/withdraw  { orgId }            → withdraw (the club can no longer message them)
 *   POST /api/clubs/manage-link { orgId }          → "Are you an organizer? Manage this page": a magic link to the club's OFFICIAL
 *                                                    directory e-mail (org.contact). Never to an address the visitor types.
 * Organizers without an account — the magic link (token in the path):
 *   POST /api/club-setup/:token/view               → the club, what is published, how many are waiting
 *   POST /api/club-setup/:token/how-to-join  { signupUrl?, who?, whoNote?, next? }  → publish "How to join", notify waiting students
 *   POST /api/club-setup/:token/photo { kind: 'logo'|'cover', data }                → a real logo / cover (media table, club-owned)
 *   POST /api/club-setup/:token/claim   (signed in) → the signed-in person becomes a Lumi organizer of that club (token used up)
 * Organizers with an account (admins of the club):
 *   POST /api/clubs/how-to-join { orgId, info } · POST /api/clubs/photo { orgId, kind, data }
 *   POST /api/clubs/message { orgId, studentIds, text } → as the club, into each student's direct conversation (rate-limited)
 * Outreach e-mail (CLUB_OUTREACH=1 only, off by default — no sending domain yet):
 *   a club with no organizers on Lumi and ≥3 waiting requests gets at most one e-mail per 30 days at its official address.
 *   GET  /api/admin/clubs/:id/outreach-preview[?format=html]   x-admin-key: ADMIN_KEY
 *   GET  /club-optout/:orgId/:token  (confirm page) · POST /api/club-optout/:orgId/:token  → never e-mail that club again
 * The Lumi team's own outreach (Instagram DM for now): GET /admin/clubs (ADMIN_KEY) · GET /api/admin/clubs ·
 *   POST /api/admin/clubs/:id/dm (fresh setup link + DM text, never stored) · POST /api/admin/clubs/:id/contacted { channel }
 * 3-day follow-up: startClubFollowUpJob → engine orgs.followUps (one in-app update per saved request)
 *
 * Tokens: 32 random bytes, only the SHA-256 is stored (doc collection clubTokens), one club each, expire (manage link 24 h,
 * e-mail link 7 days), the account claim uses the token up. Lookups and sends are rate-limited. The outreach log (clubOutreach,
 * one doc per club: sends + opt-out) lives in the store so throttling survives restarts.
 */
import { createHash, randomBytes } from 'node:crypto';
import type { Express, Request, Response, NextFunction } from 'express';
import type { Patch, Snapshot } from '@core/api/types';
import type { ID, Organization } from '@core/types';
import type { Engine } from '@core/api/engine';
import { ClubJoinError, cleanHowToJoin, clubShort, CONSENT_VERSION, dmText, pendingRequests, requestStatus, TOLD_WINDOW_DAYS, type RequestStatus } from '@core/lib/clubjoin';
import { publicLinks } from '@core/lib/orglinks';
import { acceptUpload } from './media';
import type { MediaFile, Store } from './store';
import { adminName, checkAdmin, ModerationError } from './moderation';
import { clubsAdminPageHtml } from './clubs-admin-page';

export const CLUB_TOKENS = 'clubTokens';
export const CLUB_OUTREACH = 'clubOutreach';
export const OUTREACH_MIN_REQUESTS = 3;
export const OUTREACH_GAP_DAYS = 30;
export const MANAGE_TTL_MS = 24 * 3600_000;
export const OUTREACH_TTL_MS = 7 * 24 * 3600_000;
const DAY = 24 * 3600_000;

export interface ClubToken { id: string; orgId: ID; via: 'manage' | 'outreach'; createdAt: string; expiresAt: string; usedAt?: string }
/** one doc per club: e-mails sent, the Lumi team's own contacts (who/when/channel — never the message), opt-out */
export interface OutreachLog { id: ID; sends: { at: string; count: number; to: string }[]; contacts?: ClubContact[]; optOutHashes: string[]; optedOutAt?: string }
export type ContactChannel = 'instagram' | 'email' | 'other';
export interface ClubContact { at: string; by: string; channel: ContactChannel; waiting: number }
export const CONTACT_CHANNELS: ContactChannel[] = ['instagram', 'email', 'other'];
export const FOLLOW_UP_EVERY_MS = 60 * 60 * 1000;

const sha = (raw: string) => createHash('sha256').update(raw).digest('hex');
const newToken = () => randomBytes(32).toString('base64url');
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const outreachOn = (env: NodeJS.ProcessEnv) => env.CLUB_OUTREACH === '1';
/** the club's official directory e-mail, if we have a valid one */
export const contactOf = (o: Pick<Organization, 'contact'>) => (o.contact?.email && EMAIL_RE.test(o.contact.email.trim()) ? o.contact.email.trim().toLowerCase() : undefined);

/** a tiny sliding-window limiter (in memory — a restart forgets, which only ever loosens a limit for a moment) */
export function limiter(now: () => number) {
  const hits = new Map<string, number[]>();
  return (key: string, max: number, windowMs: number): boolean => {
    const t = now();
    const arr = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
    if (arr.length >= max) { hits.set(key, arr); return false; }
    arr.push(t); hits.set(key, arr);
    return true;
  };
}

export interface ClubsDeps {
  db: () => Snapshot;
  store: Pick<Store, 'listDocs' | 'putDocs' | 'removeDocs' | 'putMedia'>;
  engine: Pick<Engine['orgs'], 'apply' | 'withdraw' | 'claim' | 'markTold' | 'followUps' | 'setHowToJoin' | 'setImage' | 'messageRequesters'>;
  push: (patch: Patch) => void;
  sendMail: (to: string, subject: string, text: string, html?: string) => Promise<boolean>;
  env?: () => NodeJS.ProcessEnv;
  now?: () => Date;
}

export interface OutreachMail { to: string; subject: string; text: string; html: string }

export function createClubsService(deps: ClubsDeps) {
  const env = () => deps.env?.() ?? process.env;
  const now = () => deps.now?.() ?? new Date();
  const allow = limiter(() => now().getTime());
  const tokens = new Map<string, ClubToken>();
  const logs = new Map<ID, OutreachLog>();
  const sending = new Set<ID>();
  const err = (msg: string, status = 400) => new ClubJoinError(msg, status);
  const orgOf = (orgId: unknown) => {
    const o = deps.db().organizations.find((x) => x.id === orgId);
    if (!o) throw err('That club isn’t on Lumi.', 404);
    return o;
  };
  const schoolOf = (o: Organization) => deps.db().schools.find((s) => s.id === o.schoolId);
  const save = (c: string, doc: { id: string }) => deps.store.putDocs(c, [doc]).catch((e) => console.error(`[clubs] save ${c} failed`, e));
  const logOf = (orgId: ID): OutreachLog => logs.get(orgId) ?? { id: orgId, sends: [], optOutHashes: [] };

  function issue(orgId: ID, via: ClubToken['via']): string {
    const raw = newToken();
    const at = now();
    const t: ClubToken = { id: sha(raw), orgId, via, createdAt: at.toISOString(), expiresAt: new Date(at.getTime() + (via === 'manage' ? MANAGE_TTL_MS : OUTREACH_TTL_MS)).toISOString() };
    tokens.set(t.id, t); void save(CLUB_TOKENS, t);
    return raw;
  }
  /** a live token for one club — expired or used tokens say so in words the organizer can act on */
  function tokenOf(raw: unknown, opts: { allowUsed?: boolean } = {}): ClubToken {
    const s = String(raw ?? '');
    const t = /^[A-Za-z0-9_-]{30,64}$/.test(s) ? tokens.get(sha(s)) : undefined;
    if (!t) throw err('This link doesn’t work. Ask for a new one from the club’s page on Lumi.', 404);
    if (Date.parse(t.expiresAt) <= now().getTime()) throw err('This link has expired. Ask for a new one from the club’s page on Lumi.', 410);
    if (t.usedAt && !opts.allowUsed) throw err('This link was already used to set up an organizer account. Sign in to Lumi to manage the club.', 410);
    return t;
  }
  const optedOut = (orgId: ID) => !!logs.get(orgId)?.optedOutAt;
  /** the latest time the club was told (e-mail sent or contacted by the Lumi team) within TOLD_WINDOW_DAYS */
  const lastTold = (orgId: ID): { at: string; via: 'email' | 'contacted' } | undefined => {
    const log = logs.get(orgId);
    const all = [...(log?.sends ?? []).map((x) => ({ at: x.at, via: 'email' as const })), ...(log?.contacts ?? []).map((x) => ({ at: x.at, via: 'contacted' as const }))].sort((a, b) => b.at.localeCompare(a.at));
    const last = all[0];
    return last && now().getTime() - Date.parse(last.at) < TOLD_WINDOW_DAYS * DAY ? last : undefined;
  };

  /** what a student's request status is right now (only what really happened) */
  const statusOf = (orgId: ID, userId: ID): RequestStatus => requestStatus(orgOf(orgId), userId);

  // ─── outreach e-mail ────────────────────────────────────────────────────
  /** why this club would not get an outreach e-mail now ('' = it would) */
  function outreachBlocker(o: Organization): string {
    if (!outreachOn(env())) return 'CLUB_OUTREACH is off';
    if (o.adminIds.length) return 'organizers are on Lumi';
    if (!contactOf(o)) return 'no official contact e-mail in the directory';
    if (optedOut(o.id)) return 'the club asked not to be e-mailed';
    const n = pendingRequests(o).length;
    if (n < OUTREACH_MIN_REQUESTS) return `${n} waiting (needs ${OUTREACH_MIN_REQUESTS})`;
    const last = logOf(o.id).sends.at(-1);
    if (last && now().getTime() - Date.parse(last.at) < OUTREACH_GAP_DAYS * DAY) return `e-mailed ${last.at.slice(0, 10)} (one per ${OUTREACH_GAP_DAYS} days)`;
    if (sending.has(o.id)) return 'sending';
    return '';
  }

  function outreachMail(o: Organization, count: number, links: { setup: string; account: string; optOut: string }): OutreachMail {
    const school = schoolOf(o)?.name ?? 'your school';
    const short = school.replace(/^UC\s+/i, '');
    const subject = `${count} ${short} students asked to join ${o.name} on Lumi`;
    const text = [
      `Hi ${o.name} team,`,
      '',
      `${count} ${school} students asked to join your club on Lumi, a campus app where students find people to do things with.`,
      '',
      'How can they join? Tell them in 2 minutes — no account needed:',
      `Add how to join → ${links.setup}`,
      '(your sign-up form or link, who can join, next info session)',
      '',
      'We’ll send it to everyone who’s waiting.',
      '',
      'Want to see who asked? With a free organizer account you can see each student’s name, year and major, message them, accept requests, and post your events.',
      `See who asked → ${links.account}`,
      '',
      '— Lumi',
      '',
      `You’re getting this because your e-mail is listed for ${o.name} in the ${school} student organization directory.`,
      `Don’t e-mail us again: ${links.optOut}`,
    ].join('\n');
    const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const btn = (href: string, label: string) => `<p style="margin:18px 0"><a href="${esc(href)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#C4B5FD;color:#140F24;font-weight:700;text-decoration:none">${esc(label)}</a></p>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:24px 16px;font:15px/1.55 -apple-system,Segoe UI,Helvetica,Arial,sans-serif">
<div style="max-width:520px;margin:0 auto">
<p>Hi ${esc(o.name)} team,</p>
<p><b>${count} ${esc(school)} students</b> asked to join your club on Lumi, a campus app where students find people to do things with.</p>
<p>How can they join? Tell them in 2 minutes — no account needed:</p>
${btn(links.setup, 'Add how to join →')}
<p style="margin-top:-8px;font-size:13px;opacity:.75">Your sign-up form or link, who can join, next info session</p>
<p>We’ll send it to everyone who’s waiting.</p>
<p>Want to see who asked? With a free organizer account you can see each student’s name, year and major, message them, accept requests, and post your events.</p>
<p><a href="${esc(links.account)}" style="font-weight:700">See who asked →</a></p>
<p>— Lumi</p>
<p style="margin-top:28px;font-size:12px;opacity:.7">You’re getting this because your e-mail is listed for ${esc(o.name)} in the ${esc(school)} student organization directory. <a href="${esc(links.optOut)}">Don’t e-mail us again</a></p>
</div></body></html>`;
    return { to: contactOf(o) ?? '', subject, text, html };
  }

  /**
   * after a request: if the club qualifies (flag on, no organizers, official e-mail, not opted out, ≥3 waiting, none in 30 days),
   * send one e-mail and only then mark the requests it counted as told. Returns whether an e-mail went out.
   */
  async function maybeOutreach(orgId: ID, base: string): Promise<boolean> {
    const o = orgOf(orgId);
    if (outreachBlocker(o)) return false;
    sending.add(o.id);
    try {
      const at = now().toISOString();
      const count = pendingRequests(o).length;
      const setupRaw = issue(o.id, 'outreach');
      const optRaw = newToken();
      const log = logOf(o.id);
      const mail = outreachMail(o, count, { setup: `${base}/club-setup/${setupRaw}`, account: `${base}/club-setup/${setupRaw}?step=account`, optOut: `${base}/club-optout/${encodeURIComponent(o.id)}/${optRaw}` });
      const sent = await deps.sendMail(mail.to, mail.subject, mail.text, mail.html).catch(() => false);
      if (!sent) return false; // nothing reached the club — nobody's status changes
      const next: OutreachLog = { ...log, sends: [...log.sends, { at, count, to: mail.to }], optOutHashes: [...log.optOutHashes, sha(optRaw)].slice(-12) };
      logs.set(o.id, next); await save(CLUB_OUTREACH, next);
      const patch = deps.engine.markTold(o.id, 'email', at);
      if (Object.keys(patch).length) deps.push(patch);
      return true;
    } finally { sending.delete(o.id); }
  }

  const svc = {
    async load() {
      tokens.clear(); logs.clear();
      const t = now().getTime();
      const stale: string[] = [];
      for (const x of await deps.store.listDocs<ClubToken>(CLUB_TOKENS)) { if (Date.parse(x.expiresAt) + DAY < t) stale.push(x.id); else tokens.set(x.id, x); }
      if (stale.length) void deps.store.removeDocs(CLUB_TOKENS, stale).catch(() => {});
      for (const x of await deps.store.listDocs<OutreachLog>(CLUB_OUTREACH)) logs.set(x.id, x);
      console.log(`[clubs] ${tokens.size} setup links, ${logs.size} outreach logs`);
    },

    /** "Ask to join" with the consent the student saw → { patch, status } */
    async ask(orgId: ID, me: ID, consent: unknown, base: string): Promise<{ patch: Patch; status: RequestStatus }> {
      if (!allow(`ask:${me}`, 30, 3600_000)) throw err('You’ve sent a lot of requests in the last hour — try again a bit later.', 429);
      const patch = deps.engine.apply(orgId, me, consent);
      deps.push(patch);
      // the club was told about waiting requests in the last 30 days (an e-mail, or the Lumi team contacted it) and has no
      // organizers on Lumi yet → this request counts as passed on too (owner 2026-11-06). The toast says so; no extra notification
      const o = orgOf(orgId);
      const told = lastTold(o.id);
      if (!o.adminIds.length && told && requestStatus(o, me) === 'saved') {
        const p = deps.engine.markTold(o.id, told.via, undefined, me);
        if (Object.keys(p).length) { deps.push(p); Object.assign(patch, { organizations: p.organizations }); }
      }
      await maybeOutreach(orgId, base).catch((e) => console.error('[clubs] outreach failed', e));
      return { patch, status: statusOf(orgId, me) };
    },
    withdraw(orgId: ID, me: ID): Patch { orgOf(orgId); const p = deps.engine.withdraw(orgId, me); deps.push(p); return p; },
    status: statusOf,

    /** "Manage this page" — a link to the club's official directory e-mail only */
    async manageLink(orgId: ID, who: string, base: string): Promise<{ sent: boolean; message: string }> {
      const o = orgOf(orgId);
      const to = contactOf(o);
      if (!to) return { sent: false, message: 'This club has no e-mail in the campus directory, so we can’t check who runs it yet. Organizers can write to us from Settings › Feedback.' };
      if (optedOut(o.id)) return { sent: false, message: 'This club asked us not to e-mail it.' };
      if (!allow(`manage:${who}`, 5, 3600_000) || !allow(`manage-org:${o.id}`, 3, DAY)) throw err('A link was sent to this club recently. Check the club’s inbox, or try again tomorrow.', 429);
      const raw = issue(o.id, 'manage');
      const link = `${base}/club-setup/${raw}`;
      const subject = `Manage ${o.name} on Lumi`;
      const text = `Someone asked to manage ${o.name} on Lumi, a campus app where students find people to do things with.\n\nIf that’s you, open this link within 24 hours:\n\n${link}\n\nYou can add how to join (your sign-up link, who can join, the next info session), and with a free organizer account see who asked to join.\n\nIf it wasn’t you, ignore this e-mail.\n\n— Lumi\n\nYou’re getting this because your e-mail is listed for ${o.name} in the student organization directory.`;
      const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
      const html = `<!doctype html><html><body style="font:15px/1.55 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px 16px">${text.split('\n\n').map((p) => `<p>${p === link ? `<a href="${esc(link)}">Manage ${esc(o.name)} on Lumi →</a>` : esc(p).replace(/\n/g, '<br>')}</p>`).join('')}</body></html>`;
      // html too, so an unconfigured server never prints the one-time link to its logs (server/mail.ts)
      const sent = await deps.sendMail(to, subject, text, html).catch(() => false);
      const domain = to.split('@')[1];
      return sent
        ? { sent: true, message: `We e-mailed a link to the club’s address in the campus directory (…@${domain}).` }
        : { sent: false, message: 'We can’t send e-mail yet. Please try again later.' };
    },

    /** what the setup page shows (no account needed) */
    setupView(raw: unknown) {
      const t = tokenOf(raw, { allowUsed: true });
      const o = orgOf(t.orgId);
      return {
        org: { id: o.id, name: o.name, type: o.type, logo: o.logo.url ? { url: o.logo.url } : undefined, cover: o.cover },
        school: schoolOf(o)?.name ?? '',
        howToJoin: o.howToJoin ?? null, waiting: pendingRequests(o).length, organizers: o.adminIds.length,
        used: !!t.usedAt, expiresAt: t.expiresAt,
      };
    },
    saveHowToJoin(raw: unknown, input: unknown, who: string) {
      const t = tokenOf(raw);
      if (!allow(`setup:${t.orgId}`, 30, 3600_000) || !allow(`setup-ip:${who}`, 60, 3600_000)) throw err('Too many changes — try again in a bit.', 429);
      const patch = deps.engine.setHowToJoin(t.orgId, cleanHowToJoin(input, now()));
      deps.push(patch);
      return svc.setupView(raw);
    },
    /** organizer with an account (admin of the club) */
    saveHowToJoinAsAdmin(orgId: ID, me: ID, input: unknown) {
      const o = orgOf(orgId);
      if (!o.adminIds.includes(me)) throw err('Only this club’s organizers can do that.', 403);
      if (!allow(`setup:${o.id}`, 30, 3600_000)) throw err('Too many changes — try again in a bit.', 429);
      const patch = deps.engine.setHowToJoin(o.id, cleanHowToJoin(input, now()));
      deps.push(patch);
      return patch;
    },
    async photo(orgId: ID, kind: unknown, data: unknown): Promise<{ url: string | null; patch: Patch }> {
      if (kind !== 'logo' && kind !== 'cover') throw err('Logo or cover?');
      if (!allow(`photo:${orgId}`, 12, DAY)) throw err('That’s a lot of photos today — try again tomorrow.', 429);
      if (data === null) { const patch = deps.engine.setImage(orgId, kind, null); deps.push(patch); return { url: null, patch }; }
      // the club owns the photo (not a person) — server/media.ts serves it only while the club page uses it
      const r = acceptUpload(`club:${orgId}`, data, now());
      if ('error' in r) throw err(r.error);
      await deps.store.putMedia(r.file as MediaFile);
      const url = `api/media/${r.file.id}`;
      const patch = deps.engine.setImage(orgId, kind, url);
      deps.push(patch);
      return { url, patch };
    },
    photoByToken(raw: unknown, kind: unknown, data: unknown) { const t = tokenOf(raw); return svc.photo(t.orgId, kind, data); },
    photoAsAdmin(orgId: ID, me: ID, kind: unknown, data: unknown) {
      if (!orgOf(orgId).adminIds.includes(me)) throw err('Only this club’s organizers can do that.', 403);
      return svc.photo(orgId, kind, data);
    },
    /** the signed-in person becomes an organizer of the token's club — the token is used up */
    claim(raw: unknown, me: ID): { orgId: ID; patch: Patch } {
      const t = tokenOf(raw);
      const used: ClubToken = { ...t, usedAt: now().toISOString() };
      tokens.set(t.id, used); void save(CLUB_TOKENS, used);
      const patch = deps.engine.claim(t.orgId, me);
      deps.push(patch);
      return { orgId: t.orgId, patch };
    },
    /** organizer → requesters, as the club (one or all). Rate-limited per organizer and per club */
    message(orgId: ID, me: ID, studentIds: unknown, text: unknown) {
      const ids = Array.isArray(studentIds) ? studentIds.map(String).slice(0, 500) : [];
      if (!ids.length) throw err('Pick who to message.');
      if (!orgOf(orgId).adminIds.includes(me)) throw err('Only this club’s organizers can message students who asked to join.', 403);
      if (!allow(`msg:${me}`, 40, 3600_000)) throw err('You’ve sent a lot of messages in the last hour — try again a bit later.', 429);
      if (ids.length > 1 && !allow(`msg-all:${orgId}`, 3, DAY)) throw err('You can message everyone waiting up to 3 times a day.', 429);
      const r = deps.engine.messageRequesters(orgId, me, ids, String(text ?? ''));
      deps.push(r.patch);
      return r;
    },

    // ─── "update you within 3 days" (startClubFollowUpJob, hourly) ───
    followUps(): Patch { const p = deps.engine.followUps(now().toISOString()); if (Object.keys(p).length) deps.push(p); return p; },

    // ─── /admin/clubs — the Lumi team contacts clubs itself (Instagram DM for now) ───
    /** clubs with requests waiting and no organizers on Lumi, oldest request first */
    adminList() {
      const t = now().getTime();
      return deps.db().organizations
        .filter((o) => !o.adminIds.length && pendingRequests(o).length)
        .map((o) => {
          const reqs = pendingRequests(o);
          const oldest = reqs.map((r) => r.askedAt).sort()[0];
          const log = logs.get(o.id);
          return {
            id: o.id, name: o.name, short: clubShort(o.name), waiting: reqs.length, saved: reqs.filter((r) => !r.deliveredAt).length,
            oldestAskedAt: oldest, oldestDays: Math.floor((t - Date.parse(oldest)) / DAY),
            links: [...(o.howToJoin?.signupUrl ? [{ label: 'Sign-up form', url: o.howToJoin.signupUrl }] : []), ...publicLinks(o.links)],
            hasContactEmail: !!contactOf(o), optedOut: !!log?.optedOutAt,
            contacts: log?.contacts ?? [], lastEmailAt: log?.sends.at(-1)?.at ?? null,
          };
        })
        .sort((a, b) => a.oldestAskedAt.localeCompare(b.oldestAskedAt));
    },
    /** a fresh setup link for ONE club (minted on click) and the DM text around it — the DM is never stored */
    adminDm(orgId: ID, base: string) {
      const o = orgOf(orgId);
      const raw = issue(o.id, 'outreach');
      const link = `${base}/club-setup/${raw}`;
      const school = schoolOf(o)?.name.replace(/^UC\s+/i, '') ?? 'Berkeley';
      return { link, dm: dmText(o.name, pendingRequests(o).length, link, school) };
    },
    /** "Mark contacted": every request waiting right now counts as passed on; who/when/channel stored, never the message */
    async markContacted(orgId: ID, by: string, channel: unknown) {
      const o = orgOf(orgId);
      if (!CONTACT_CHANNELS.includes(channel as ContactChannel)) throw err('Pick Instagram, e-mail or other.');
      const at = now().toISOString();
      const log = logOf(o.id);
      const next: OutreachLog = { ...log, contacts: [...(log.contacts ?? []), { at, by: String(by).slice(0, 60), channel: channel as ContactChannel, waiting: pendingRequests(o).length }] };
      logs.set(o.id, next); await save(CLUB_OUTREACH, next);
      const patch = deps.engine.markTold(o.id, 'contacted', at);
      if (Object.keys(patch).length) deps.push(patch);
      return { told: patch.notifications?.length ?? 0 };
    },

    // ─── outreach ───
    maybeOutreach,
    outreachBlocker: (orgId: ID) => outreachBlocker(orgOf(orgId)),
    /** admin preview — the e-mail as it would go out now, with placeholder links (no token is created) */
    preview(orgId: ID, base: string) {
      const o = orgOf(orgId);
      const count = pendingRequests(o).length;
      const mail = outreachMail(o, count, { setup: `${base}/club-setup/<token>`, account: `${base}/club-setup/<token>?step=account`, optOut: `${base}/club-optout/${encodeURIComponent(o.id)}/<token>` });
      return { ...mail, to: mail.to || '(no official e-mail on file)', waiting: count, wouldSend: !outreachBlocker(o), blocker: outreachBlocker(o) || null, sends: logOf(o.id).sends, optedOut: optedOut(o.id) };
    },
    /** "Don't e-mail us again" — any link from an e-mail we sent that club */
    async optOut(orgId: ID, raw: unknown): Promise<string> {
      const log = logs.get(orgId);
      const h = sha(String(raw ?? ''));
      if (!log || !log.optOutHashes.includes(h)) throw err('This link doesn’t work.', 404);
      if (!log.optedOutAt) { const next = { ...log, optedOutAt: now().toISOString() }; logs.set(orgId, next); await save(CLUB_OUTREACH, next); }
      return orgOf(orgId).name;
    },
    optOutValid: (orgId: ID, raw: unknown) => !!logs.get(orgId)?.optOutHashes.includes(sha(String(raw ?? ''))),
    /** tests */
    raw: { tokens, logs },
    CONSENT_VERSION,
  };
  return svc;
}
export type ClubsService = ReturnType<typeof createClubsService>;

/** keeps the "update you within 3 days" promise — hourly in the web server (like startStudyGroupJob), once at start */
export function startClubFollowUpJob(svc: Pick<ClubsService, 'followUps'>, everyMs = FOLLOW_UP_EVERY_MS) {
  const run = () => { try { const p = svc.followUps(); if (p.notifications?.length) console.log(`[clubs] ${p.notifications.length} 3-day follow-ups`); } catch (e) { console.error('[clubs] follow-ups failed', e); } };
  setTimeout(run, 30_000).unref?.();
  return setInterval(run, everyMs).unref?.();
}

type Req = Request & { userId?: ID; suspended?: boolean };
type Handler = (req: Req, res: Response) => Promise<unknown> | unknown;

export function registerClubRoutes(app: Express, svc: ClubsService, deps: {
  auth: (req: Request, res: Response, next: NextFunction) => unknown;
  requireUser: (req: Req) => ID;
  patchFor: (patch: Patch, me: ID) => Patch | null;
  env?: () => NodeJS.ProcessEnv;
}) {
  const env = () => deps.env?.() ?? process.env;
  const base = (req: Request) => env().PUBLIC_URL?.trim().replace(/\/+$/, '') || `${req.protocol}://${req.get('host')}`;
  const lookups = limiter(() => Date.now());
  const handle = (fn: Handler) => async (req: Req, res: Response) => {
    try { const out = await fn(req, res); if (!res.headersSent) res.json(out ?? {}); }
    catch (e) {
      const status = e instanceof ClubJoinError ? e.status : e instanceof ModerationError ? e.status : (e as { status?: number })?.status ?? 500;
      if (status === 500) console.error('[clubs] failed', e);
      res.status(status).json({ error: e instanceof Error && status !== 500 ? e.message : 'Something went wrong — please try again.' });
    }
  };
  const mine = (patch: Patch, me: ID) => deps.patchFor(patch, me) ?? {};
  const body = (req: Req) => (req.body ?? {}) as Record<string, unknown>;
  const tokenRoute = (fn: Handler) => handle((req, res) => {
    if (!lookups(`tok:${req.ip}`, 120, 3600_000)) throw new ClubJoinError('Too many tries — wait a bit.', 429);
    return fn(req, res);
  });
  const noStore = (res: Response) => res.set({ 'cache-control': 'no-store', 'referrer-policy': 'no-referrer', 'x-robots-tag': 'noindex' });

  // students
  app.post('/api/clubs/ask', deps.auth, handle(async (req) => {
    const me = deps.requireUser(req);
    const r = await svc.ask(String(body(req).orgId ?? ''), me, body(req).consent, base(req));
    return { patch: mine(r.patch, me), status: svc.status(String(body(req).orgId), me) };
  }));
  app.post('/api/clubs/withdraw', deps.auth, handle((req) => { const me = deps.requireUser(req); return mine(svc.withdraw(String(body(req).orgId ?? ''), me), me); }));
  // works signed out too (the organizer may not have an account) — the link only ever goes to the club's directory e-mail
  app.post('/api/clubs/manage-link', deps.auth, handle((req) => svc.manageLink(String(body(req).orgId ?? ''), req.userId ?? `ip:${req.ip}`, base(req))));

  // organizers with an account
  app.post('/api/clubs/how-to-join', deps.auth, handle((req) => { const me = deps.requireUser(req); return mine(svc.saveHowToJoinAsAdmin(String(body(req).orgId ?? ''), me, body(req).info), me); }));
  app.post('/api/clubs/photo', deps.auth, handle(async (req) => { const me = deps.requireUser(req); const r = await svc.photoAsAdmin(String(body(req).orgId ?? ''), me, body(req).kind, body(req).data); return { url: r.url, patch: mine(r.patch, me) }; }));
  app.post('/api/clubs/message', deps.auth, handle((req) => {
    const me = deps.requireUser(req);
    const r = svc.message(String(body(req).orgId ?? ''), me, body(req).studentIds, body(req).text);
    return { sent: r.sent, skipped: r.skipped, patch: mine(r.patch, me) };
  }));

  // the magic link (no account)
  app.post('/api/club-setup/:token/view', tokenRoute((req, res) => { noStore(res); return svc.setupView(req.params.token); }));
  app.post('/api/club-setup/:token/how-to-join', tokenRoute((req, res) => { noStore(res); return svc.saveHowToJoin(req.params.token, body(req), `ip:${req.ip}`); }));
  app.post('/api/club-setup/:token/photo', tokenRoute(async (req, res) => { noStore(res); const r = await svc.photoByToken(req.params.token, body(req).kind, body(req).data); return { url: r.url }; }));
  app.post('/api/club-setup/:token/claim', deps.auth, tokenRoute((req, res) => {
    noStore(res);
    const me = deps.requireUser(req);
    const r = svc.claim(req.params.token, me);
    return { orgId: r.orgId, patch: mine(r.patch, me) };
  }));

  // the Lumi team's own outreach (owner 2026-11-06 — Instagram DMs for now): /admin/clubs + its API (ADMIN_KEY)
  app.get('/admin/clubs', (_req, res) => {
    res.set({
      'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer',
      'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    });
    res.type('html').send(clubsAdminPageHtml());
  });
  app.get('/api/admin/clubs', handle((req, res) => { checkAdmin(req, env()); noStore(res); return { clubs: svc.adminList() }; }));
  app.post('/api/admin/clubs/:id/dm', handle((req, res) => { checkAdmin(req, env()); noStore(res); return svc.adminDm(String(req.params.id), base(req)); }));
  app.post('/api/admin/clubs/:id/contacted', handle((req, res) => { checkAdmin(req, env()); noStore(res); return svc.markContacted(String(req.params.id), adminName(req), body(req).channel); }));

  // outreach: admin preview + opt-out
  app.get('/api/admin/clubs/:id/outreach-preview', handle((req, res) => {
    checkAdmin(req, env());
    noStore(res);
    const p = svc.preview(String(req.params.id), base(req));
    if (req.query.format === 'html') { res.type('html').send(p.html); return; }
    return p;
  }));
  const optPage = (title: string, inner: string) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head><body style="font:16px/1.5 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:480px;margin:40px auto;padding:0 16px">${inner}</body></html>`;
  const esc = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // GET only shows a button (mail scanners open links); the POST records the opt-out
  app.get('/club-optout/:orgId/:token', (req, res) => {
    noStore(res);
    const ok = svc.optOutValid(String(req.params.orgId), req.params.token);
    if (!ok) { res.status(404).type('html').send(optPage('Link not found', '<h1>This link doesn’t work</h1>')); return; }
    res.type('html').send(optPage('Stop e-mails from Lumi', `<h1>Stop e-mails from Lumi?</h1><p>We won’t e-mail this club again.</p><form method="post" action="/api/club-optout/${esc(encodeURIComponent(String(req.params.orgId)))}/${esc(String(req.params.token))}"><button type="submit" style="font:inherit;padding:10px 18px;border-radius:999px">Don’t e-mail us again</button></form>`));
  });
  app.post('/api/club-optout/:orgId/:token', async (req, res) => {
    noStore(res);
    try { const name = await svc.optOut(String(req.params.orgId), req.params.token); res.type('html').send(optPage('Done', `<h1>Done</h1><p>We won’t e-mail ${esc(name)} again.</p>`)); }
    catch { res.status(404).type('html').send(optPage('Link not found', '<h1>This link doesn’t work</h1>')); }
  });
}
