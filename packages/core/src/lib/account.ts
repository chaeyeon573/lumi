/**
 * Account deletion — erase one person from the snapshot (App Store guideline 5.1.1(v)).
 *
 * Pure logic shared by the server (server/account.ts → POST /api/auth/delete-account) and the
 * browser mock. It mutates `db` in place (like the engines) and returns one Patch that, once
 * filtered per viewer by server/view.ts, removes the person from everyone else's screens.
 *
 * What happens to each kind of data (see server/account.ts for the stores outside the snapshot):
 * - Their profile (incl. timetable, partner search, daily answer, game answers, photos) → deleted.
 * - Friends / follows / likes / friend requests / blocks, in both directions → deleted.
 * - Activities they host → cancelled: participants get a notice (no name), then the activity,
 *   its participations and its group chat are deleted. A Lumi study group that other people
 *   already joined is handed to the next member instead of being cancelled.
 * - Their participations, proposals, opportunity intents/saves, ice-breaker games → deleted.
 * - Their posts → deleted. Their comments, likes, saves and tags on other posts → removed.
 * - Chats: 1:1 rooms with them are deleted for both sides (a conversation with someone who no
 *   longer exists cannot continue, and half of it is gone anyway). In group rooms they are
 *   removed from the members and **their messages are deleted** — not re-labelled "Deleted user":
 *   their words are their personal data, and on a small campus a message under "Deleted user"
 *   in a 5-person meetup chat still identifies them. System lines that name them go too.
 * - Plans (time polls) they host → cancelled with a notice to invitees, then deleted. Their
 *   invites, votes and link responses on other people's plans → removed.
 * - Rides they host → cancelled with a notice to riders, then deleted with the ride chat.
 *   Rides they joined → they leave (seat freed).
 * - Notifications to them → deleted. Notifications to others about them (linking to their
 *   profile, to something deleted above, or naming them) → deleted.
 * - Reports they filed → kept for safety review, but the reporter is replaced by
 *   DELETED_REPORTER so nothing links back to them. Reports about them → kept unchanged: they
 *   carry only an opaque id that no longer resolves to any profile, plus the reporter's reason.
 * - Organizations / opportunities → their id is removed from member, follower, admin and
 *   applicant lists, Q&A and reviews; a listing they shared under their nickname shows
 *   "A Lumi student" as host.
 */
import type { Patch, Snapshot } from '@core/api/types';
import type { ActivityProposal, Activity, ChatRoom, Game, ID, Notification, OpportunityIntentRecord, Post, Report, TimePoll, User, Organization, Opportunity } from '@core/types';
import type { Ride } from './rides';
import { uid } from './format';

/** reporterId on reports filed by someone who deleted their account */
export const DELETED_REPORTER = 'u_deleted';
/** What a typed confirmation must say */
export const DELETE_CONFIRM_WORD = 'DELETE';
/** Shown when someone tries to delete a shared demo account or a sample profile */
export const DEMO_DELETE_REFUSED = 'This is a shared demo account — it can’t be deleted. Create your own account to use account deletion.';
export const deleteConfirmOk = (typed: unknown) => String(typed ?? '').trim().toUpperCase() === DELETE_CONFIRM_WORD;

/** Shared demo accounts and sample profiles cannot be deleted — everyone signs in to them */
export function isProtectedAccount(u: Pick<User, 'id' | 'sample'>, protectedIds: ReadonlySet<ID> = new Set()): boolean {
  return !!u.sample || protectedIds.has(u.id);
}

export interface EraseSummary {
  activitiesCancelled: number; activitiesHandedOver: number; participations: number; posts: number; proposals: number;
  chatRoomsDeleted: number; messagesDeleted: number; games: number; opportunityIntents: number; timePollsCancelled: number;
  ridesCancelled: number; ridesLeft: number; notificationsDeleted: number; reportsAnonymized: number; peopleNotified: number;
}

export interface EraseResult { patch: Patch; summary: EraseSummary }

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Remove `userId` and every trace of them from `db`. Throws if the user does not exist.
 * Returns the Patch to persist (store.applyPatch) and broadcast (server/view.ts filters it per viewer).
 */
export function eraseUser(db: Snapshot, userId: ID, opts: { now?: () => string } = {}): EraseResult {
  const now = opts.now ?? (() => new Date().toISOString());
  const user = db.users.find((u) => u.id === userId);
  if (!user) throw new Error('Account not found.');
  const nick = user.nickname.trim();
  // whole-word mention of their nickname (for system lines / notifications that name them)
  const names = nick.length >= 2 ? new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRe(nick)}($|[^\\p{L}\\p{N}_])`, 'u') : null;
  const mentions = (s?: string) => !!s && !!names && names.test(s);
  // the notices quote the event's title so people know which one is off — unless the title names the person
  const quote = (title: string, fallback: string) => (mentions(title) ? fallback : `“${title}”`);

  const summary: EraseSummary = { activitiesCancelled: 0, activitiesHandedOver: 0, participations: 0, posts: 0, proposals: 0, chatRoomsDeleted: 0, messagesDeleted: 0, games: 0, opportunityIntents: 0, timePollsCancelled: 0, ridesCancelled: 0, ridesLeft: 0, notificationsDeleted: 0, reportsAnonymized: 0, peopleNotified: 0 };
  const gone = { activities: new Set<ID>(), participations: new Set<ID>(), posts: new Set<ID>(), chatRooms: new Set<ID>(), proposals: new Set<ID>(), opportunityIntents: new Set<ID>(), timePolls: new Set<ID>(), rides: new Set<ID>(), games: new Set<ID>(), notifications: new Set<ID>() };
  const changed = { users: new Map<ID, User>(), activities: new Map<ID, Activity>(), posts: new Map<ID, Post>(), chatRooms: new Map<ID, ChatRoom>(), organizations: new Map<ID, Organization>(), opportunities: new Map<ID, Opportunity>(), timePolls: new Map<ID, TimePoll>(), rides: new Map<ID, Ride>(), reports: new Map<ID, Report>() };

  // notices to the people affected (never names the person who left)
  const fresh: Notification[] = [];
  const notify = (to: ID, n: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>) => {
    if (to === userId || !db.users.some((u) => u.id === to)) return;
    const nt: Notification = { id: uid('nt'), userId: to, read: false, createdAt: now(), ...n };
    fresh.push(nt);
  };

  // ─── activities they host ────────────────────────────────────────────────
  const dropActivity = (a: Activity) => {
    gone.activities.add(a.id);
    db.participations.filter((p) => p.activityId === a.id).forEach((p) => gone.participations.add(p.id));
    db.chatRooms.filter((r) => r.activityId === a.id).forEach((r) => gone.chatRooms.add(r.id));
  };
  for (const a of db.activities) {
    if (a.hostId !== userId) continue;
    const others = db.participations.filter((p) => p.activityId === a.id && p.userId !== userId && (p.status === 'approved' || p.status === 'pending'));
    const nextHost = a.studyGroup ? others.find((p) => p.status === 'approved') : undefined;
    if (nextHost) { a.hostId = nextHost.userId; changed.activities.set(a.id, a); summary.activitiesHandedOver++; continue; }
    for (const p of others) notify(p.userId, { type: 'activity_reminder', title: `${quote(a.title, 'A meetup you joined')} was cancelled`, body: 'The host deleted their Lumi account, so this meetup is off.', link: '/' });
    summary.peopleNotified += others.length;
    dropActivity(a); summary.activitiesCancelled++;
  }
  for (const a of db.activities) {
    if (gone.activities.has(a.id)) continue;
    let touched = false;
    if (a.invitedIds?.includes(userId)) { a.invitedIds = a.invitedIds.filter((x) => x !== userId); touched = true; }
    if (a.interestedIds?.includes(userId)) { a.interestedIds = a.interestedIds.filter((x) => x !== userId); touched = true; }
    if (a.visibilityTargets?.includes(userId)) { a.visibilityTargets = a.visibilityTargets.filter((x) => x !== userId); touched = true; }
    if (a.comments.some((c) => c.authorId === userId)) { a.comments = a.comments.filter((c) => c.authorId !== userId); touched = true; }
    const sg = a.studyGroup;
    if (sg && (sg.invitedIds.includes(userId) || userId in sg.responses || (sg.preferred && userId in sg.preferred))) {
      sg.invitedIds = sg.invitedIds.filter((x) => x !== userId);
      const { [userId]: _r, ...responses } = sg.responses; sg.responses = responses;
      if (sg.preferred) { const { [userId]: _p, ...preferred } = sg.preferred; sg.preferred = preferred; }
      touched = true;
    }
    if (touched) changed.activities.set(a.id, a);
  }
  db.participations.filter((p) => p.userId === userId).forEach((p) => { gone.participations.add(p.id); summary.participations++; });

  // ─── plans (time polls) ──────────────────────────────────────────────────
  for (const p of db.timePolls) {
    if (p.hostId === userId) {
      if (p.status !== 'cancelled') {
        const to = new Set([...p.inviteeIds, ...(p.link?.responses ?? []).map((r) => r.userId).filter((x): x is ID => !!x)]);
        to.forEach((id) => notify(id, { type: 'plan_decided', title: `${quote(p.title, 'A plan you were in')} was cancelled`, body: 'The host deleted their Lumi account, so this plan is off.', link: '/' }));
        summary.peopleNotified += [...to].filter((id) => id !== userId).length;
      }
      gone.timePolls.add(p.id); summary.timePollsCancelled++;
      continue;
    }
    let touched = false;
    if (p.inviteeIds.includes(userId)) { p.inviteeIds = p.inviteeIds.filter((x) => x !== userId); touched = true; }
    if (userId in p.votes) { const { [userId]: _v, ...votes } = p.votes; p.votes = votes; touched = true; }
    if (p.placeVotes && userId in p.placeVotes) { const { [userId]: _pv, ...placeVotes } = p.placeVotes; p.placeVotes = placeVotes; touched = true; }
    if (p.link?.responses.some((r) => r.userId === userId)) { p.link.responses = p.link.responses.filter((r) => r.userId !== userId); touched = true; }
    if (p.activityId && gone.activities.has(p.activityId)) { delete p.activityId; touched = true; }
    if (touched) changed.timePolls.set(p.id, p);
  }

  // ─── rides ───────────────────────────────────────────────────────────────
  for (const r of (db.rides ?? []) as Ride[]) {
    if (r.hostId === userId) {
      if (r.status !== 'cancelled') {
        r.memberIds.forEach((id) => notify(id, { type: 'activity_reminder', title: 'A ride you joined was cancelled', body: 'The driver deleted their Lumi account — look for another ride going the same way.', link: `/rides?to=${encodeURIComponent(r.to)}` }));
        summary.peopleNotified += r.memberIds.filter((id) => id !== userId).length;
      }
      gone.rides.add(r.id); if (r.roomId) gone.chatRooms.add(r.roomId); summary.ridesCancelled++;
    } else if (r.memberIds.includes(userId)) {
      r.memberIds = r.memberIds.filter((x) => x !== userId); r.memberCount = r.memberIds.length; r.updatedAt = now();
      changed.rides.set(r.id, r); summary.ridesLeft++;
    }
  }

  // ─── posts ───────────────────────────────────────────────────────────────
  for (const p of db.posts) {
    if (p.authorId === userId) { gone.posts.add(p.id); summary.posts++; continue; }
    let touched = false;
    const strip = (k: 'likeIds' | 'savedIds' | 'taggedUserIds' | 'tagApprovedIds') => { const list = p[k]; if (list?.includes(userId)) { p[k] = list.filter((x) => x !== userId); touched = true; } };
    strip('likeIds'); strip('savedIds'); strip('taggedUserIds'); strip('tagApprovedIds');
    if (p.comments.some((c) => c.authorId === userId)) { p.comments = p.comments.filter((c) => c.authorId !== userId); touched = true; }
    if (p.relatedActivityId && gone.activities.has(p.relatedActivityId)) { delete p.relatedActivityId; touched = true; }
    if (touched) changed.posts.set(p.id, p);
  }

  // ─── relationships · organizations · opportunities ───────────────────────
  const rel = db.relationships;
  rel.likes = rel.likes.filter((l) => l.fromId !== userId && l.toId !== userId);
  rel.follows = rel.follows.filter((f) => f.fromId !== userId && f.toId !== userId);
  rel.friendRequests = rel.friendRequests.filter((q) => q.fromId !== userId && q.toId !== userId);
  rel.friends = rel.friends.filter((f) => f.a !== userId && f.b !== userId);
  rel.blocks = rel.blocks.filter((b) => b.fromId !== userId && b.toId !== userId);

  for (const o of db.organizations) {
    let touched = false;
    for (const k of ['followerIds', 'memberIds', 'adminIds', 'applicantIds'] as const) if (o[k].includes(userId)) { o[k] = o[k].filter((x) => x !== userId); touched = true; }
    if (touched) changed.organizations.set(o.id, o);
  }
  for (const o of db.opportunities) {
    let touched = false;
    if (o.qna.some((c) => c.authorId === userId)) { o.qna = o.qna.filter((c) => c.authorId !== userId); touched = true; }
    if (o.reviews.some((c) => c.authorId === userId)) { o.reviews = o.reviews.filter((c) => c.authorId !== userId); touched = true; }
    if (!o.official && !o.orgId && nick && o.host === nick) { o.host = 'A Lumi student'; touched = true; }
    if (touched) changed.opportunities.set(o.id, o);
  }
  db.opportunityIntents.filter((i) => i.userId === userId).forEach((i) => { gone.opportunityIntents.add(i.id); summary.opportunityIntents++; });
  db.proposals.filter((p) => p.fromId === userId || p.toId === userId).forEach((p) => { gone.proposals.add(p.id); summary.proposals++; });
  (db.games ?? []).filter((g) => g.fromId === userId || g.toId === userId).forEach((g) => { gone.games.add(g.id); if (g.roomId) gone.chatRooms.add(g.roomId); summary.games++; });

  // ─── chats ───────────────────────────────────────────────────────────────
  for (const r of db.chatRooms) {
    if (gone.chatRooms.has(r.id)) continue;
    if (r.type === 'direct' && (r.memberIds.includes(userId) || r.messages.some((m) => m.senderId === userId))) { gone.chatRooms.add(r.id); continue; }
    const before = r.messages.length;
    const keep = r.messages.filter((m) => m.senderId !== userId && !(m.system && mentions(m.text)));
    const inRoom = r.memberIds.includes(userId) || userId in r.lastReadAt;
    if (keep.length === before && !inRoom) continue;
    summary.messagesDeleted += before - keep.length;
    r.messages = keep;
    r.memberIds = r.memberIds.filter((x) => x !== userId);
    const { [userId]: _l, ...lastReadAt } = r.lastReadAt; r.lastReadAt = lastReadAt;
    changed.chatRooms.set(r.id, r);
  }
  for (const id of gone.chatRooms) { const r = db.chatRooms.find((x) => x.id === id); if (r) summary.messagesDeleted += r.messages.filter((m) => m.senderId === userId).length; }
  summary.chatRoomsDeleted = [...gone.chatRooms].filter((id) => db.chatRooms.some((r) => r.id === id)).length;

  // ─── reports ─────────────────────────────────────────────────────────────
  for (const r of db.reports) if (r.reporterId === userId) { r.reporterId = DELETED_REPORTER; changed.reports.set(r.id, r); summary.reportsAnonymized++; }

  // ─── other people's profiles (votes on their profile poll) ────────────────
  for (const u of db.users) {
    if (u.id === userId || !u.poll || !(userId in u.poll.votes)) continue;
    const { [userId]: _v, ...votes } = u.poll.votes; u.poll = { ...u.poll, votes };
    changed.users.set(u.id, u);
  }

  // ─── notifications ───────────────────────────────────────────────────────
  // to them, or to others about them: a link to their profile or to anything deleted above, or naming them
  const deadIds = [userId, ...gone.activities, ...gone.chatRooms, ...gone.timePolls, ...gone.rides, ...gone.posts, ...gone.proposals, ...gone.games];
  const linksTo = (link?: string) => !!link && deadIds.some((id) => new RegExp(`/${escapeRe(id)}(?:[/?#]|$)`).test(link));
  for (const n of db.notifications) {
    if (n.userId === userId || linksTo(n.link) || mentions(n.title) || mentions(n.body)) gone.notifications.add(n.id);
  }
  summary.notificationsDeleted = gone.notifications.size;

  // ─── apply removals ──────────────────────────────────────────────────────
  const keepOut = <T extends { id: ID }>(list: T[], ids: Set<ID>) => list.filter((x) => !ids.has(x.id));
  db.users = db.users.filter((u) => u.id !== userId);
  db.activities = keepOut(db.activities, gone.activities);
  db.participations = keepOut(db.participations, gone.participations);
  db.posts = keepOut(db.posts, gone.posts);
  db.chatRooms = keepOut(db.chatRooms, gone.chatRooms);
  db.proposals = keepOut<ActivityProposal>(db.proposals, gone.proposals);
  db.opportunityIntents = keepOut<OpportunityIntentRecord>(db.opportunityIntents, gone.opportunityIntents);
  db.timePolls = keepOut(db.timePolls, gone.timePolls);
  db.games = keepOut<Game>(db.games ?? [], gone.games);
  if (db.rides) db.rides = keepOut(db.rides, gone.rides);
  db.notifications = [...fresh, ...keepOut(db.notifications, gone.notifications)];

  const list = <T>(m: Map<ID, T>, dead?: Set<ID>) => [...m.entries()].filter(([id]) => !dead?.has(id)).map(([, v]) => v);
  const ids = (s: Set<ID>) => [...s];
  const patch: Patch = {
    users: list(changed.users),
    activities: list(changed.activities, gone.activities),
    posts: list(changed.posts, gone.posts),
    chatRooms: list(changed.chatRooms, gone.chatRooms),
    organizations: list(changed.organizations),
    opportunities: list(changed.opportunities),
    timePolls: list(changed.timePolls, gone.timePolls),
    rides: list(changed.rides, gone.rides),
    reports: list(changed.reports),
    notifications: fresh,
    relationships: rel,
    removed: {
      users: [userId], activities: ids(gone.activities), participations: ids(gone.participations), posts: ids(gone.posts), chatRooms: ids(gone.chatRooms),
      proposals: ids(gone.proposals), opportunityIntents: ids(gone.opportunityIntents), timePolls: ids(gone.timePolls), rides: ids(gone.rides), games: ids(gone.games), notifications: ids(gone.notifications),
    },
  };
  return { patch, summary };
}
