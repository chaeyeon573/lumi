/**
 * Reports and moderation (App Store guideline 1.2 — report content, block users, act on reports within 24 hours).
 *
 *   POST /api/rpc/reports/create        { args: [me, targetType, targetId, reason] } — replaces the generic RPC for this one
 *                                        method (registered before it): validates, de-duplicates, alerts, auto-hides
 *   GET  /admin/reports                 small moderation page (no data in it — it asks for the admin key and calls the API)
 *   GET  /api/admin/reports?status=open|all          x-admin-key: ADMIN_KEY
 *   POST /api/admin/reports/:id/dismiss              { note? }
 *   POST /api/admin/reports/:id/remove               { note?, messageId? }  — delete the reported post/comment/meetup/listing/ride/chat message
 *   POST /api/admin/reports/:id/suspend              { note?, userId? }     — suspend the owner (or userId, e.g. a chat sender)
 *   POST /api/admin/users/:id/unsuspend              { note? }
 *
 * What happens on a report:
 * 1. Saved in `reports` (status open) with a snapshot of the content (`excerpt`, `targetOwnerId`) so it can still be
 *    reviewed after the author edits or deletes it. Same person + same target while still open → the existing report, no new alert.
 * 2. Alert e-mail to FEEDBACK_EMAIL through Resend (server/mail.ts sendMail) + one `[report]` log line. Unset → logged, never thrown.
 * 3. A post or comment reported by AUTO_HIDE_REPORTS distinct real accounts (not sample/demo profiles, not the author) is
 *    hidden from everyone except its author until an admin dismisses (→ visible again) or removes it.
 *
 * Who sees what (server/view.ts calls moderateView/moderatePatch for every snapshot and patch):
 * - Suspended users: gone for everyone else — profile, posts, comments, meetups they host and their chats/rooms, rides,
 *   chat messages, proposals, games, plans, Q&A. Their own sessions stop working (sessionAuth) and sign-in is refused
 *   (signInBlock). Unsuspend sends everything back. Nothing is deleted by a suspension.
 * - Patches convert anything newly hidden into removed.<collection> so open screens drop it; restoring re-sends it.
 * - Reports go only to the person who filed them, without log/excerpt/targetOwnerId.
 *
 * Every admin action appends { at, by, action, note } to the report's `log` — `by` is the name typed on the admin page.
 * Env: ADMIN_KEY (required for every admin call), FEEDBACK_EMAIL (alert recipient), PUBLIC_URL (optional, link base).
 */
import type { Express, NextFunction, Request, Response } from 'express';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Patch, Snapshot } from '@core/api/types';
import type { Activity, ChatRoom, Comment, ID, Post, Report, ReportLogEntry, ReportTargetType, User } from '@core/types';
import { DEMO_USER_ID } from '@core/data/seed.en';
import { sampleFreeFor, stripRelationships } from './samples';
import { legalConfig } from './legal';
import { adminPageHtml } from './moderation-page';
import { awaitingVerification } from '@core/lib/verification';

/** distinct real accounts that must report a post/comment before it is hidden pending review (Terms §3 says the same) */
export const AUTO_HIDE_REPORTS = 3;
export const REPORT_TARGETS: readonly ReportTargetType[] = ['user', 'activity', 'post', 'comment', 'message', 'ride'];
/** the shared demo logins — never suspended (App Review signs in with them) */
const DEMO_LOGINS: ReadonlySet<ID> = new Set([DEMO_USER_ID, `${DEMO_USER_ID}_ucmerced`]);

export class ModerationError extends Error { constructor(public status: number, message: string) { super(message); } }

const isOpen = (r: Report) => !r.status || r.status === 'open';
export const isSuspended = (u?: Pick<User, 'suspended'> | null) => !!u?.suspended;
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

// ─── where a reported thing lives ───────────────────────────────────────────
export type TargetKind = 'user' | 'post' | 'comment' | 'activity' | 'opportunity' | 'ride' | 'room' | 'message';
export interface TargetInfo {
  exists: boolean;
  kind?: TargetKind;
  ownerId?: ID;
  /** short readable text of the content right now */
  excerpt: string;
  /** a comment's post/meetup/listing, a message's room */
  parent?: { type: 'post' | 'activity' | 'opportunity' | 'room'; id: ID };
}

type Db = Pick<Snapshot, 'users' | 'posts' | 'activities' | 'opportunities' | 'chatRooms' | 'reports'> & { rides?: Snapshot['rides'] };

function findComment(db: Db, id: ID): { c: Comment; parent: { type: 'post' | 'activity' | 'opportunity'; id: ID } } | undefined {
  for (const p of db.posts) { const c = p.comments.find((x) => x.id === id); if (c) return { c, parent: { type: 'post', id: p.id } }; }
  for (const a of db.activities) { const c = a.comments.find((x) => x.id === id); if (c) return { c, parent: { type: 'activity', id: a.id } }; }
  for (const o of db.opportunities) { const c = o.qna.find((x) => x.id === id); if (c) return { c, parent: { type: 'opportunity', id: o.id } }; }
  return undefined;
}
function findMessage(db: Db, id: ID) {
  for (const r of db.chatRooms) { const m = r.messages.find((x) => x.id === id); if (m) return { m, room: r }; }
  return undefined;
}

export function locate(db: Db, type: ReportTargetType, id: ID): TargetInfo {
  const out = (kind: TargetKind, ownerId: ID | undefined, text: string, parent?: TargetInfo['parent']): TargetInfo => ({ exists: true, kind, ownerId, excerpt: clip(oneLine(text), 400), parent });
  switch (type) {
    case 'user': {
      const u = db.users.find((x) => x.id === id);
      return u ? out('user', u.id, [u.nickname, u.bio, u.nowWant, ...(u.prompts ?? []).map((p) => p.answer)].filter(Boolean).join(' · ')) : { exists: false, excerpt: '' };
    }
    case 'post': {
      const p = db.posts.find((x) => x.id === id);
      return p ? out('post', p.authorId, `${p.anonymous ? '[anonymous] ' : ''}${p.text}`) : { exists: false, excerpt: '' };
    }
    case 'comment': {
      const f = findComment(db, id);
      return f ? out('comment', f.c.authorId, f.c.text, f.parent) : { exists: false, excerpt: '' };
    }
    case 'activity': {
      const a = db.activities.find((x) => x.id === id);
      if (a) return out('activity', a.hostId, `${a.title} — ${a.description}`);
      // listings (opportunities) are reported with type "activity" from their detail page
      const o = db.opportunities.find((x) => x.id === id);
      return o ? out('opportunity', undefined, `${o.title} (${o.host}) — ${o.description}`) : { exists: false, excerpt: '' };
    }
    case 'ride': {
      const r = (db.rides ?? []).find((x) => x.id === id);
      return r ? out('ride', r.hostId, `${r.kind} ${r.from} → ${r.to === 'custom' ? r.toCustom ?? '' : r.to} ${r.date} ${r.start}-${r.end}${r.note ? ` — ${r.note}` : ''}`) : { exists: false, excerpt: '' };
    }
    case 'message': {
      const room = db.chatRooms.find((x) => x.id === id);
      if (room) {
        const last = room.messages.filter((m) => !m.system).slice(-5).map((m) => `${db.users.find((u) => u.id === m.senderId)?.nickname ?? m.senderId}: ${m.text}`);
        return out('room', undefined, `${room.title ?? room.type} — ${last.join(' / ')}`);
      }
      const f = findMessage(db, id);
      return f ? out('message', f.m.senderId, f.m.text, { type: 'room', id: f.room.id }) : { exists: false, excerpt: '' };
    }
  }
  return { exists: false, excerpt: '' };
}

// ─── who/what is hidden right now ─────────────────────────────────────────
export interface ModState {
  suspended: Set<ID>;
  /** auto-hidden post or comment id → its author (the author still sees it) */
  hidden: Map<ID, ID>;
  /** meetups / rides hosted by a suspended user → host */
  hostedBy: Map<ID, ID>;
  empty: boolean;
}
let version = 0;
/** call after any change to report status or user.suspended so the cached state is rebuilt */
export const moderationChanged = () => { version++; };
const stateCache = new WeakMap<object, { key: string; st: ModState }>();

const targetKey = (r: Pick<Report, 'targetType' | 'targetId'>) => `${r.targetType}:${r.targetId}`;

/** distinct real accounts (exists, not a sample/demo profile, not the owner) with an open report on this target */
export function realReporters(db: Pick<Snapshot, 'users' | 'reports'>, type: ReportTargetType, id: ID, ownerId?: ID): Set<ID> {
  const out = new Set<ID>();
  for (const r of db.reports) {
    if (r.targetType !== type || r.targetId !== id || !isOpen(r) || r.reporterId === (ownerId ?? r.targetOwnerId)) continue;
    const u = db.users.find((x) => x.id === r.reporterId);
    if (u && !u.sample) out.add(u.id);
  }
  return out;
}

export function moderationState(db: Db): ModState {
  const key = `${version}|${db.reports.length}|${db.users.length}`;
  const hit = stateCache.get(db.reports);
  if (hit && hit.key === key) return hit.st;
  // accounts still waiting for their student ID to be checked (server/idverify.ts) are hidden from everyone else the
  // same way — not in People, search, class lists or member lists — until an admin approves them
  const suspended = new Set(db.users.filter((u) => u.suspended || awaitingVerification(u)).map((u) => u.id));
  const real = new Map(db.users.filter((u) => !u.sample).map((u) => [u.id, u]));
  const counts = new Map<string, Set<ID>>();
  for (const r of db.reports) {
    if ((r.targetType !== 'post' && r.targetType !== 'comment') || !isOpen(r) || !real.has(r.reporterId)) continue;
    const k = targetKey(r);
    (counts.get(k) ?? counts.set(k, new Set()).get(k)!).add(r.reporterId);
  }
  const hidden = new Map<ID, ID>();
  for (const [k, who] of counts) {
    if (who.size < AUTO_HIDE_REPORTS) continue;
    const [type, id] = [k.slice(0, k.indexOf(':')) as ReportTargetType, k.slice(k.indexOf(':') + 1)];
    const t = locate(db, type, id);
    if (!t.exists || !t.ownerId) continue;
    who.delete(t.ownerId);
    if (who.size >= AUTO_HIDE_REPORTS) hidden.set(id, t.ownerId);
  }
  const hostedBy = new Map<ID, ID>();
  if (suspended.size) {
    for (const a of db.activities) if (suspended.has(a.hostId)) hostedBy.set(a.id, a.hostId);
    for (const r of db.rides ?? []) if (suspended.has(r.hostId)) hostedBy.set(r.id, r.hostId);
  }
  const st: ModState = { suspended, hidden, hostedBy, empty: !suspended.size && !hidden.size };
  stateCache.set(db.reports, { key, st });
  return st;
}

/** a report as its reporter sees it — no moderation log, snapshot or owner */
export function publicReport(r: Report): Report {
  if (r.log === undefined && r.excerpt === undefined && r.targetOwnerId === undefined) return r;
  const { log: _l, excerpt: _e, targetOwnerId: _o, ...rest } = r;
  return rest;
}

type Viewable = Partial<Snapshot> & Pick<Patch, 'removed'>;
type RemovedKey = keyof NonNullable<Patch['removed']>;

/**
 * Hide what moderation hides from `viewerId`. With asPatch, anything dropped from a collection is also listed in
 * removed.<collection> so a screen that already has it drops it.
 */
function filterFor<T extends Viewable>(src: T, viewerId: ID, st: ModState, asPatch: boolean): T {
  const out: T = { ...src };
  if (src.reports) out.reports = src.reports.map(publicReport);
  if (st.empty) return out;
  const sus = (id?: ID) => !!id && id !== viewerId && st.suspended.has(id);
  const hid = (id: ID) => { const owner = st.hidden.get(id); return owner !== undefined && owner !== viewerId; };
  const hostHidden = (id?: ID) => !!id && sus(st.hostedBy.get(id));
  const gone: Partial<Record<RemovedKey, ID[]>> = {};
  function keep<X extends { id: ID }>(key: RemovedKey, list: X[], drop: (x: X) => boolean): X[] {
    if (!list.some(drop)) return list;
    const kept: X[] = [];
    for (const x of list) { if (drop(x)) (gone[key] ??= []).push(x.id); else kept.push(x); }
    return kept;
  }
  const badComment = (c: Comment) => sus(c.authorId) || hid(c.id);
  const cleanComments = <X extends { comments: Comment[] }>(x: X): X => (x.comments.some(badComment) ? { ...x, comments: x.comments.filter((c) => !badComment(c)) } : x);

  if (src.users) out.users = keep('users', src.users, (u) => sus(u.id));
  if (src.posts) out.posts = keep('posts', src.posts, (p) => sus(p.authorId) || hid(p.id)).map(cleanComments);
  if (src.activities) out.activities = keep('activities', src.activities, (a) => sus(a.hostId)).map(cleanComments);
  if (src.participations) out.participations = keep('participations', src.participations, (p) => sus(p.userId) || hostHidden(p.activityId));
  if (src.rides) out.rides = keep('rides', src.rides, (r) => sus(r.hostId));
  if (src.proposals) out.proposals = keep('proposals', src.proposals, (p) => sus(p.fromId) || sus(p.toId));
  if (src.games) out.games = keep('games', src.games, (g) => sus(g.fromId) || sus(g.toId));
  if (src.timePolls) out.timePolls = keep('timePolls', src.timePolls, (p) => sus(p.hostId));
  if (src.chatRooms) {
    out.chatRooms = keep('chatRooms', src.chatRooms, (r) => (r.type === 'direct' && r.memberIds.some(sus)) || hostHidden(r.activityId) || hostHidden(r.rideId))
      .map((r) => (r.messages.some((m) => sus(m.senderId)) ? { ...r, messages: r.messages.filter((m) => !sus(m.senderId)) } : r));
  }
  if (src.opportunities) {
    out.opportunities = src.opportunities.map((o) => (o.qna.some(badComment) || o.reviews.some((r) => sus(r.authorId))
      ? { ...o, qna: o.qna.filter((c) => !badComment(c)), reviews: o.reviews.filter((r) => !sus(r.authorId)) } : o));
  }
  if (src.relationships && st.suspended.size) {
    const others = new Set([...st.suspended].filter((id) => id !== viewerId));
    if (others.size) out.relationships = stripRelationships(src.relationships, others);
  }
  if (src.classRosters && st.suspended.size) {
    out.classRosters = src.classRosters.map((c) => (c.members.some((m) => sus(m.userId)) || c.partners.some((m) => sus(m.userId))
      ? { ...c, members: c.members.filter((m) => !sus(m.userId)), partners: c.partners.filter((m) => !sus(m.userId)), count: c.count - c.members.filter((m) => sus(m.userId)).length } : c));
  }
  if (asPatch && Object.keys(gone).length) {
    const removed = { ...out.removed };
    for (const [k, ids] of Object.entries(gone) as [RemovedKey, ID[]][]) removed[k] = [...(removed[k] ?? []), ...ids];
    out.removed = removed;
  }
  return out;
}

/** snapshot for one viewer (server/view.ts snapshotFor) */
export const moderateView = <T extends Viewable>(src: T, viewerId: ID, db: Db): T => filterFor(src, viewerId, moderationState(db), false);
/** patch for one viewer, in place on the already-filtered `out` (server/view.ts patchFor) */
export function moderatePatch(out: Patch, viewerId: ID, db: Db): void {
  Object.assign(out, filterFor(out, viewerId, moderationState(db), true));
}

/**
 * The data Ask Lumi, sign-up suggestions and recommendations (lib/foryou via server/ai-search.ts) work from:
 * no sample content for real accounts (server/samples.ts) and nothing moderation hides from this viewer —
 * suspended people, their meetups/rides/posts/comments/messages, auto-hidden posts. No viewer (sign-up) = hide all.
 */
export function aiViewFor(full: Snapshot, viewer?: User): Snapshot {
  return moderateView(sampleFreeFor(full, viewer), viewer?.id ?? '', full);
}

// ─── filing a report ────────────────────────────────────────────────────────
export interface FiledReport { report: Report; created: boolean; autoHidden: boolean; target: TargetInfo; patch: Patch; openOnTarget: number; realOnTarget: number }

/** the post/meetup/listing whose screen changes when this target is hidden or shown again */
function carrier(db: Snapshot, type: ReportTargetType, id: ID): Patch {
  if (type === 'post') { const p = db.posts.find((x) => x.id === id); return p ? { posts: [p] } : {}; }
  if (type === 'comment') {
    const f = findComment(db, id);
    if (f?.parent.type === 'post') return { posts: db.posts.filter((p) => p.id === f.parent.id) };
    if (f?.parent.type === 'activity') return { activities: db.activities.filter((a) => a.id === f.parent.id) };
    if (f?.parent.type === 'opportunity') return { opportunities: db.opportunities.filter((o) => o.id === f.parent.id) };
  }
  return {};
}

export function fileReport(db: Snapshot, reporterId: ID, targetType: ReportTargetType, targetId: ID, reason: string, now = new Date()): FiledReport {
  const target = locate(db, targetType, targetId);
  const counts = () => {
    const open = db.reports.filter((r) => r.targetType === targetType && r.targetId === targetId && isOpen(r));
    return { openOnTarget: open.length, realOnTarget: realReporters(db, targetType, targetId, target.ownerId).size };
  };
  const dup = db.reports.find((r) => r.reporterId === reporterId && r.targetType === targetType && r.targetId === targetId && isOpen(r));
  if (dup) return { report: dup, created: false, autoHidden: false, target, patch: { reports: [dup] }, ...counts() };

  const wasHidden = moderationState(db).hidden.has(targetId);
  const report: Report = {
    id: `rp_${randomBytes(6).toString('hex')}`, reporterId, targetType, targetId, reason, createdAt: now.toISOString(), status: 'open',
    excerpt: target.excerpt || undefined, targetOwnerId: target.ownerId, log: [],
  };
  db.reports.push(report);
  moderationChanged();
  const patch: Patch = { reports: [report] };
  const autoHidden = !wasHidden && moderationState(db).hidden.has(targetId);
  if (autoHidden) {
    const entry: ReportLogEntry = { at: now.toISOString(), by: 'system', action: 'auto_hidden', note: `${AUTO_HIDE_REPORTS}+ people reported it — hidden from everyone but the author until reviewed` };
    const same = db.reports.filter((r) => r.targetType === targetType && r.targetId === targetId && isOpen(r));
    for (const r of same) r.log = [...(r.log ?? []), entry];
    Object.assign(patch, carrier(db, targetType, targetId), { reports: same });
  }
  return { report, created: true, autoHidden, target, patch, ...counts() };
}

// ─── admin actions ──────────────────────────────────────────────────────────
function mustFind(db: Snapshot, reportId: ID): Report {
  const r = db.reports.find((x) => x.id === reportId);
  if (!r) throw new ModerationError(404, 'No report with that id.');
  return r;
}

/** close every open report on the same target (and always the given one), with one log entry each */
function close(db: Snapshot, report: Report, status: 'dismissed' | 'actioned', entry: ReportLogEntry): Report[] {
  const same = db.reports.filter((r) => r === report || (r.targetType === report.targetType && r.targetId === report.targetId && isOpen(r)));
  for (const r of same) { r.status = status; r.log = [...(r.log ?? []), entry]; }
  moderationChanged();
  return same;
}

const entryOf = (action: ReportLogEntry['action'], by: string, note?: string, at = new Date()): ReportLogEntry => ({ at: at.toISOString(), by, action, ...(note ? { note: clip(note, 500) } : {}) });

export function dismissReport(db: Snapshot, reportId: ID, by: string, note?: string): Patch {
  const report = mustFind(db, reportId);
  const wasHidden = moderationState(db).hidden.has(report.targetId);
  const reports = close(db, report, 'dismissed', entryOf('dismissed', by, note));
  // auto-hidden and now cleared → send it to everyone again
  const back = wasHidden && !moderationState(db).hidden.has(report.targetId) ? carrier(db, report.targetType, report.targetId) : {};
  return { ...back, reports };
}

/** delete the reported content. A room report needs messageId (which message); a profile can't be removed — suspend instead */
export function removeReported(db: Snapshot, reportId: ID, by: string, opts: { note?: string; messageId?: ID } = {}): Patch {
  const report = mustFind(db, reportId);
  // a chat report points at the room — the admin picks the message
  const id = report.targetType === 'message' && opts.messageId ? opts.messageId : report.targetId;
  if (id !== report.targetId && !db.chatRooms.some((r) => r.id === report.targetId && r.messages.some((m) => m.id === id))) throw new ModerationError(400, 'That message is not in the reported chat.');
  const t = locate(db, report.targetType, id);
  if (t.kind === 'user') throw new ModerationError(400, "A profile can't be removed — suspend the account instead.");
  if (t.kind === 'room') throw new ModerationError(400, 'Pick the message to remove (messageId) — the report points at the whole chat.');
  if (!t.exists) throw new ModerationError(409, 'That content is already gone (deleted by its author or another admin). Dismiss the report instead.');
  const patch: Patch = {};
  switch (t.kind) {
    case 'post':
      db.posts = db.posts.filter((p) => p.id !== id);
      patch.removed = { posts: [id] };
      break;
    case 'comment': {
      const parent = t.parent!;
      const list = (parent.type === 'post' ? db.posts : parent.type === 'activity' ? db.activities : db.opportunities) as (Post | Activity | Snapshot['opportunities'][number])[];
      const holder = list.find((x) => x.id === parent.id)!;
      if ('qna' in holder) { holder.qna = holder.qna.filter((c) => c.id !== id); patch.opportunities = [holder]; }
      else { holder.comments = holder.comments.filter((c) => c.id !== id); if (parent.type === 'post') patch.posts = [holder as Post]; else patch.activities = [holder as Activity]; }
      break;
    }
    case 'activity': {
      db.activities = db.activities.filter((a) => a.id !== id);
      const parts = db.participations.filter((p) => p.activityId === id).map((p) => p.id);
      db.participations = db.participations.filter((p) => p.activityId !== id);
      const rooms = db.chatRooms.filter((r) => r.activityId === id).map((r) => r.id);
      db.chatRooms = db.chatRooms.filter((r) => r.activityId !== id);
      const touched = db.posts.filter((p) => p.relatedActivityId === id);
      touched.forEach((p) => { delete p.relatedActivityId; });
      Object.assign(patch, { posts: touched, removed: { activities: [id], participations: parts, chatRooms: rooms } });
      break;
    }
    case 'opportunity': {
      db.opportunities = db.opportunities.filter((o) => o.id !== id);
      const intents = db.opportunityIntents.filter((i) => i.opportunityId === id).map((i) => i.id);
      db.opportunityIntents = db.opportunityIntents.filter((i) => i.opportunityId !== id);
      patch.removed = { opportunities: [id], opportunityIntents: intents };
      break;
    }
    case 'ride': {
      const ride = (db.rides ?? []).find((r) => r.id === id)!;
      db.rides = (db.rides ?? []).filter((r) => r.id !== id);
      const rooms = db.chatRooms.filter((r) => r.rideId === id || r.id === ride.roomId).map((r) => r.id);
      db.chatRooms = db.chatRooms.filter((r) => !rooms.includes(r.id));
      patch.removed = { rides: [id], chatRooms: rooms };
      break;
    }
    case 'message': {
      const room = db.chatRooms.find((r) => r.id === t.parent!.id)!;
      room.messages = room.messages.filter((m) => m.id !== id);
      patch.chatRooms = [room];
      break;
    }
  }
  const what = `${t.kind} ${id}: "${clip(t.excerpt, 200)}"`;
  patch.reports = close(db, report, 'actioned', entryOf('removed', by, [opts.note, `removed ${what}`].filter(Boolean).join(' — ')));
  return patch;
}

/** everything of this user's that other people can see — re-sent on suspend (→ removed.* for others) and unsuspend (→ back) */
export function footprint(db: Snapshot, uid: ID): Patch {
  const mine = (c: Comment) => c.authorId === uid;
  const hostedActivities = new Set(db.activities.filter((a) => a.hostId === uid).map((a) => a.id));
  const hostedRides = new Set((db.rides ?? []).filter((r) => r.hostId === uid).map((r) => r.id));
  const rooms = db.chatRooms.filter((r: ChatRoom) => (r.type === 'direct' && r.memberIds.includes(uid)) || r.messages.some((m) => m.senderId === uid)
    || (!!r.activityId && hostedActivities.has(r.activityId)) || (!!r.rideId && hostedRides.has(r.rideId)));
  const rel = db.relationships;
  const inRel = [...rel.likes, ...rel.follows, ...rel.friendRequests, ...rel.blocks].some((x) => x.fromId === uid || x.toId === uid) || rel.friends.some((f) => f.a === uid || f.b === uid);
  return {
    posts: db.posts.filter((p) => p.authorId === uid || p.comments.some(mine)),
    activities: db.activities.filter((a) => a.hostId === uid || a.comments.some(mine)),
    participations: db.participations.filter((p) => p.userId === uid || hostedActivities.has(p.activityId)),
    rides: (db.rides ?? []).filter((r) => r.hostId === uid),
    chatRooms: rooms,
    proposals: db.proposals.filter((p) => p.fromId === uid || p.toId === uid),
    games: (db.games ?? []).filter((g) => g.fromId === uid || g.toId === uid),
    timePolls: db.timePolls.filter((p) => p.hostId === uid),
    opportunities: db.opportunities.filter((o) => o.qna.some(mine) || o.reviews.some((r) => r.authorId === uid)),
    ...(inRel ? { relationships: rel } : {}),
  };
}

export function suspendUser(db: Snapshot, opts: { reportId?: ID; userId?: ID; by: string; note?: string }): { patch: Patch; userId: ID } {
  const report = opts.reportId ? mustFind(db, opts.reportId) : undefined;
  const uid = opts.userId || (report && (locate(db, report.targetType, report.targetId).ownerId ?? report.targetOwnerId));
  if (!uid) throw new ModerationError(400, 'This report has no single owner (e.g. a group chat) — pass userId to say whom to suspend.');
  const user = db.users.find((u) => u.id === uid);
  if (!user) throw new ModerationError(404, 'That account no longer exists.');
  if (DEMO_LOGINS.has(uid)) throw new ModerationError(400, 'The shared demo account cannot be suspended (App Review signs in with it).');
  if (user.suspended) throw new ModerationError(409, `${user.nickname} is already suspended (since ${user.suspended.at}).`);
  const at = new Date();
  user.suspended = { at: at.toISOString(), by: opts.by, reason: clip(opts.note || report?.reason || 'Terms of Use violation', 500), ...(report ? { reportId: report.id } : {}) };
  moderationChanged();
  const patch: Patch = { ...footprint(db, uid), users: [user] };
  if (report) patch.reports = close(db, report, 'actioned', entryOf('suspended', opts.by, [opts.note, `suspended ${user.nickname} (${uid})`].filter(Boolean).join(' — '), at));
  return { patch, userId: uid };
}

export function unsuspendUser(db: Snapshot, userId: ID, by: string, note?: string): Patch {
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new ModerationError(404, 'That account no longer exists.');
  if (!user.suspended) throw new ModerationError(409, `${user.nickname} is not suspended.`);
  const reportId = user.suspended.reportId;
  delete user.suspended;
  moderationChanged();
  const patch: Patch = { ...footprint(db, userId), users: [user] };
  const report = reportId ? db.reports.find((r) => r.id === reportId) : undefined;
  if (report) { report.log = [...(report.log ?? []), entryOf('unsuspended', by, [note, `unsuspended ${user.nickname} (${userId})`].filter(Boolean).join(' — '))]; patch.reports = [report]; }
  return patch;
}

// ─── sign-in / session gate ─────────────────────────────────────────────────
export function suspendedMessage(env: NodeJS.ProcessEnv = process.env): string {
  const contact = legalConfig(env).contactEmail;
  return `This account is suspended for breaking the Lumi Terms of Use.${contact ? ` If you think this is a mistake, email ${contact}.` : ''}`;
}
/** why this person can't sign in, or null */
export const signInBlock = (user?: User | null, env: NodeJS.ProcessEnv = process.env): string | null => (isSuspended(user) ? suspendedMessage(env) : null);

type Req = Request & { userId?: ID; suspended?: boolean };
/**
 * The API's session middleware (server/index.ts `auth`). A suspended person's token resolves to no user
 * (req.suspended = true) — every route that needs a signed-in user refuses, including posting and the event stream.
 */
export function sessionAuth(deps: { db: () => Pick<Snapshot, 'users'>; findSession(token: string): Promise<{ userId: ID } | null> }) {
  return async (req: Req, _res: Response, next: NextFunction) => {
    try {
      const header = req.headers.authorization ?? '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : (req.query.token as string | undefined);
      if (token) {
        const s = await deps.findSession(token);
        const u = s ? deps.db().users.find((x) => x.id === s.userId) : undefined;
        if (u && u.suspended) req.suspended = true;
        else if (u) req.userId = u.id;
      }
      next();
    } catch (e) { next(e); }
  };
}

// ─── admin auth ─────────────────────────────────────────────────────────────
const digest = (s: string) => createHash('sha256').update(s).digest();
const failures = new Map<string, { n: number; until: number }>();
/** ADMIN_KEY in x-admin-key, compared in constant time; 10 wrong keys from one address → 15 min lockout */
export function checkAdmin(req: Request, env: NodeJS.ProcessEnv = process.env): void {
  const key = env.ADMIN_KEY;
  if (!key) throw new ModerationError(503, 'ADMIN_KEY is not set on the server.');
  const ip = req.ip ?? 'unknown';
  const f = failures.get(ip);
  if (f && f.n >= 10 && f.until > Date.now()) throw new ModerationError(429, 'Too many wrong keys — try again later.');
  const given = req.headers['x-admin-key'];
  if (typeof given === 'string' && timingSafeEqual(digest(given), digest(key))) { failures.delete(ip); return; }
  const next = f && f.until > Date.now() ? { n: f.n + 1, until: f.until } : { n: 1, until: Date.now() + 15 * 60 * 1000 };
  failures.set(ip, next);
  throw new ModerationError(403, 'forbidden');
}
export const adminName = (req: Request) => {
  const raw = String(req.headers['x-admin-name'] ?? '').replace(/[^\w .@'-]/g, '').trim().slice(0, 40);
  return raw || 'admin';
};

// ─── alert ───────────────────────────────────────────────────────────────────
export interface AlertInput { filed: FiledReport; reporter?: User; owner?: User; adminUrl: string }
export function alertText({ filed, reporter, owner, adminUrl }: AlertInput) {
  const r = filed.report;
  const label = filed.target.kind && filed.target.kind !== r.targetType ? `${r.targetType} (${filed.target.kind})` : r.targetType;
  const who = (u: User | undefined, id: ID | undefined) => (u ? `${u.nickname} (${u.id})${u.sample ? ' [sample/demo account]' : ''}${u.suspended ? ' [suspended]' : ''}` : id ?? '—');
  const subject = `[Lumi report] ${label} · ${clip(oneLine(r.reason), 60)}${filed.autoHidden ? ' · AUTO-HIDDEN' : ''}`;
  const text = [
    `New report — please review within 24 hours.`,
    ``,
    `Target: ${label} ${r.targetId}${filed.target.exists ? '' : ' (not found — already deleted?)'}`,
    `Owner: ${who(owner, filed.target.ownerId)}`,
    `Reason: ${r.reason}`,
    `Reporter: ${who(reporter, r.reporterId)}`,
    `Content: ${filed.target.excerpt ? `"${clip(filed.target.excerpt, 300)}"` : '—'}`,
    `Open reports on this target: ${filed.openOnTarget} (${filed.realOnTarget} from distinct real accounts; auto-hide at ${AUTO_HIDE_REPORTS} for posts/comments)`,
    ...(filed.autoHidden ? [`This ${r.targetType} is now hidden from everyone except its author until you dismiss or remove it.`] : []),
    ``,
    `Review: ${adminUrl}`,
  ].join('\n');
  return { subject, text };
}

// ─── routes ──────────────────────────────────────────────────────────────────
export interface ModerationDeps {
  db: () => Snapshot;
  auth: (req: Req, res: Response, next: NextFunction) => unknown;
  /** persist + broadcast (each viewer's copy is filtered by server/view.ts) */
  push(patch: Patch): void;
  /** the caller's own view of a patch (server/view.ts patchFor) */
  patchFor(patch: Patch, viewerId: ID): Patch | null;
  /** close a user's open event streams */
  disconnect(userId: ID): void;
  sendMail(to: string, subject: string, text: string): Promise<boolean>;
  env?: NodeJS.ProcessEnv;
}

const REPORTS_PER_HOUR = 30;

export function registerModerationRoutes(app: Express, deps: ModerationDeps) {
  const env = () => deps.env ?? process.env;
  const sent = new Map<ID, number[]>();
  const handle = (fn: (req: Req, res: Response) => unknown) => async (req: Req, res: Response) => {
    try { const out = await fn(req, res); if (!res.headersSent) res.json(out ?? {}); }
    catch (e) {
      const status = e instanceof ModerationError ? e.status : 500;
      if (status === 500) console.error('[moderation] failed', e);
      res.status(status).json({ error: e instanceof Error && status !== 500 ? e.message : 'Something went wrong — please try again.' });
    }
  };
  const origin = (req: Request) => (env().PUBLIC_URL?.replace(/\/+$/, '') || `${req.protocol}://${req.get('host')}`);

  // ── filing a report (before the generic /api/rpc/:group/:method) ──
  app.post('/api/rpc/reports/create', deps.auth, handle((req) => {
    if (req.suspended) throw new ModerationError(403, suspendedMessage(env()));
    const me = req.userId;
    if (!me) throw new ModerationError(401, 'Please sign in first.');
    const [reporterId, targetType, targetId, reason] = Array.isArray(req.body?.args) ? req.body.args : [];
    if (reporterId !== me) throw new ModerationError(403, "You can't report on someone else's behalf.");
    if (!REPORT_TARGETS.includes(targetType)) throw new ModerationError(400, 'Unknown report type.');
    if (typeof targetId !== 'string' || !targetId || targetId.length > 100) throw new ModerationError(400, 'What are you reporting? (missing id)');
    const why = typeof reason === 'string' ? reason.trim().slice(0, 1000) : '';
    if (!why) throw new ModerationError(400, 'Pick a reason for the report.');
    const now = Date.now();
    const recent = (sent.get(me) ?? []).filter((t) => t > now - 3600_000);
    if (recent.length >= REPORTS_PER_HOUR) throw new ModerationError(429, 'You have sent a lot of reports in the last hour — please try again later, or email us.');

    const db = deps.db();
    const filed = fileReport(db, me, targetType, targetId, why);
    if (filed.created) {
      sent.set(me, [...recent, now]);
      deps.push(filed.patch);
      const reporter = db.users.find((u) => u.id === me);
      const owner = filed.target.ownerId ? db.users.find((u) => u.id === filed.target.ownerId) : undefined;
      console.log(`[report] ${filed.report.id} ${targetType} ${targetId} by ${me}${reporter?.sample ? ' (demo/sample)' : ''} — open on target ${filed.openOnTarget}, real ${filed.realOnTarget}${filed.autoHidden ? ' — AUTO-HIDDEN pending review' : ''}`);
      const to = env().FEEDBACK_EMAIL?.trim();
      if (!to) console.warn(`[report] FEEDBACK_EMAIL is not set — no alert e-mail for ${filed.report.id}`);
      else {
        const { subject, text } = alertText({ filed, reporter, owner, adminUrl: `${origin(req)}/admin/reports#${filed.report.id}` });
        deps.sendMail(to, subject, text)
          .then((ok) => { if (!ok) console.warn(`[report] alert e-mail for ${filed.report.id} not sent (Resend not configured or refused)`); })
          .catch((e) => console.error(`[report] alert e-mail for ${filed.report.id} failed`, e instanceof Error ? e.message : e));
      }
    }
    return deps.patchFor(filed.patch, me) ?? {};
  }));

  // ── admin page (no data in the HTML; the page calls the API with the key the admin types) ──
  app.get('/admin/reports', (_req, res) => {
    res.set({
      'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer',
      'content-security-policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    });
    res.type('html').send(adminPageHtml(AUTO_HIDE_REPORTS));
  });

  const admin = (fn: (req: Req, by: string) => unknown) => handle((req) => { checkAdmin(req, env()); return fn(req, adminName(req)); });
  const userBrief = (db: Snapshot, id?: ID) => {
    const u = id ? db.users.find((x) => x.id === id) : undefined;
    return u ? { id: u.id, nickname: u.nickname, sample: !!u.sample, suspended: u.suspended ?? null } : id ? { id, nickname: null, sample: false, suspended: null } : null;
  };

  app.get('/api/admin/reports', admin((req) => {
    const db = deps.db();
    const all = req.query.status === 'all';
    const st = moderationState(db);
    const list = db.reports.filter((r) => all || isOpen(r)).sort((a, b) => (isOpen(b) ? 1 : 0) - (isOpen(a) ? 1 : 0) || b.createdAt.localeCompare(a.createdAt)).slice(0, 300);
    return {
      threshold: AUTO_HIDE_REPORTS,
      reports: list.map((r) => {
        const target = locate(db, r.targetType, r.targetId);
        const room = target.kind === 'room' ? db.chatRooms.find((x) => x.id === r.targetId) : undefined;
        return {
          ...r, status: r.status ?? 'open',
          reporter: userBrief(db, r.reporterId),
          owner: userBrief(db, target.ownerId ?? r.targetOwnerId),
          target,
          autoHidden: st.hidden.has(r.targetId),
          openOnTarget: db.reports.filter((x) => x.targetType === r.targetType && x.targetId === r.targetId && isOpen(x)).length,
          realOnTarget: realReporters(db, r.targetType, r.targetId, target.ownerId ?? r.targetOwnerId).size,
          messages: room ? room.messages.filter((m) => !m.system).slice(-30).map((m) => ({ id: m.id, senderId: m.senderId, sender: db.users.find((u) => u.id === m.senderId)?.nickname ?? m.senderId, text: m.text, createdAt: m.createdAt })) : undefined,
        };
      }),
      suspended: db.users.filter((u) => u.suspended).map((u) => ({ id: u.id, nickname: u.nickname, ...u.suspended! })),
    };
  }));

  const body = (req: Request) => (req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {});
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

  app.post('/api/admin/reports/:id/dismiss', admin((req, by) => {
    const patch = dismissReport(deps.db(), String(req.params.id), by, str(body(req).note));
    deps.push(patch);
    console.log(`[moderation] ${by} dismissed ${req.params.id}`);
    return { ok: true, reports: patch.reports };
  }));

  app.post('/api/admin/reports/:id/remove', admin((req, by) => {
    const patch = removeReported(deps.db(), String(req.params.id), by, { note: str(body(req).note), messageId: str(body(req).messageId) });
    deps.push(patch);
    console.log(`[moderation] ${by} removed content for ${req.params.id}`);
    return { ok: true, reports: patch.reports };
  }));

  app.post('/api/admin/reports/:id/suspend', admin((req, by) => {
    const { patch, userId } = suspendUser(deps.db(), { reportId: String(req.params.id), userId: str(body(req).userId), by, note: str(body(req).note) });
    deps.disconnect(userId);
    deps.push(patch);
    console.log(`[moderation] ${by} suspended ${userId} (report ${req.params.id})`);
    return { ok: true, userId, reports: patch.reports };
  }));

  app.post('/api/admin/users/:id/suspend', admin((req, by) => {
    const { patch, userId } = suspendUser(deps.db(), { userId: String(req.params.id), by, note: str(body(req).note) });
    deps.disconnect(userId);
    deps.push(patch);
    console.log(`[moderation] ${by} suspended ${userId}`);
    return { ok: true, userId };
  }));

  app.post('/api/admin/users/:id/unsuspend', admin((req, by) => {
    const patch = unsuspendUser(deps.db(), String(req.params.id), by, str(body(req).note));
    deps.push(patch);
    console.log(`[moderation] ${by} unsuspended ${req.params.id}`);
    return { ok: true };
  }));
}
