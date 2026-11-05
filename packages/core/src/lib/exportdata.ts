/**
 * Download your data (S086) — everything Lumi keeps about one person, as a JSON file they can save.
 *
 * Only the person's own records: their profile (everything, including owner-only fields), what they wrote
 * (posts, comments, chat messages they sent, questions, reviews), what they did (meetups hosted and joined,
 * RSVPs and saves, polls they host and their votes, proposals, reports they filed) and their notifications.
 * Other people appear only as ids (+ display name for friends) — never another person's profile, messages or votes.
 * Reports keep only what the reporter wrote (no moderation log). The server answers it for the signed-in caller only.
 */
import type { Snapshot } from '@core/api/types';
import type { ID, User } from '@core/types';

export const EXPORT_VERSION = 1;

export interface AccountExport {
  version: number;
  exportedAt: string;
  profile: Omit<User, 'suspended' | 'viewable' | 'mutualFriendCount'>;
  connections: {
    friends: { id: ID; name?: string; since: string }[];
    following: { id: ID; type: 'user' | 'org' }[];
    followers: ID[];
    friendRequests: { id: ID; fromId: ID; toId: ID; status: string; createdAt: string }[];
    likesGiven: ID[];
    blocked: ID[];
  };
  communities: { id: ID; name: string; role: 'admin' | 'member' | 'follower' | 'applicant' }[];
  posts: { id: ID; text: string; visibility: string; anonymous?: boolean; createdAt: string; commentCount: number }[];
  comments: { on: 'post' | 'activity'; targetId: ID; text: string; createdAt: string }[];
  messages: { roomId: ID; text: string; createdAt: string }[];
  meetupsHosted: { id: ID; title: string; date: string; startTime: string; place: string }[];
  participations: { activityId: ID; status: string; createdAt: string }[];
  listings: { opportunityId: ID; intent: string; saved?: boolean; createdAt: string }[];
  questionsAndReviews: { opportunityId: ID; kind: 'question' | 'review'; text: string; createdAt: string }[];
  timePolls: { id: ID; title: string; host: boolean; myVotes: ID[]; status: string }[];
  proposals: { id: ID; fromId: ID; toId: ID; message: string; when: string; status: string; createdAt: string }[];
  reportsFiled: { targetType: string; targetId: ID; reason: string; status: string; createdAt: string }[];
  notifications: { title: string; body: string; read: boolean; createdAt: string }[];
}

type Db = Pick<Snapshot, 'users' | 'relationships' | 'organizations' | 'posts' | 'activities' | 'participations' | 'chatRooms' | 'opportunities' | 'opportunityIntents' | 'timePolls' | 'proposals' | 'reports' | 'notifications'>;

export function exportUserData(db: Db, userId: ID, now = new Date().toISOString()): AccountExport {
  const me = db.users.find((u) => u.id === userId);
  if (!me) throw new Error('Account not found.');
  const { suspended: _s, viewable: _v, mutualFriendCount: _m, ...profile } = me;
  const r = db.relationships;
  const nameOf = (id: ID) => db.users.find((u) => u.id === id)?.nickname;
  const role = (o: Db['organizations'][number]) =>
    o.adminIds.includes(userId) ? 'admin' as const : o.memberIds.includes(userId) ? 'member' as const : o.followerIds.includes(userId) ? 'follower' as const : o.applicantIds.includes(userId) ? 'applicant' as const : null;
  return {
    version: EXPORT_VERSION,
    exportedAt: now,
    profile: structuredClone(profile),
    connections: {
      friends: r.friends.filter((f) => f.a === userId || f.b === userId).map((f) => { const id = f.a === userId ? f.b : f.a; return { id, name: nameOf(id), since: f.since }; }),
      following: r.follows.filter((f) => f.fromId === userId).map((f) => ({ id: f.toId, type: f.targetType })),
      followers: r.follows.filter((f) => f.toId === userId && f.targetType === 'user').map((f) => f.fromId),
      friendRequests: r.friendRequests.filter((q) => q.fromId === userId || q.toId === userId).map((q) => ({ id: q.id, fromId: q.fromId, toId: q.toId, status: q.status, createdAt: q.createdAt })),
      likesGiven: r.likes.filter((l) => l.fromId === userId).map((l) => l.toId),
      blocked: r.blocks.filter((b) => b.fromId === userId).map((b) => b.toId),
    },
    communities: db.organizations.flatMap((o) => { const x = role(o); return x ? [{ id: o.id, name: o.name, role: x }] : []; }),
    posts: db.posts.filter((p) => p.authorId === userId).map((p) => ({ id: p.id, text: p.text, visibility: p.visibility, ...(p.anonymous ? { anonymous: true } : {}), createdAt: p.createdAt, commentCount: p.comments.length })),
    comments: [
      ...db.posts.flatMap((p) => p.comments.filter((c) => c.authorId === userId).map((c) => ({ on: 'post' as const, targetId: p.id, text: c.text, createdAt: c.createdAt }))),
      ...db.activities.flatMap((a) => (a.comments ?? []).filter((c) => c.authorId === userId).map((c) => ({ on: 'activity' as const, targetId: a.id, text: c.text, createdAt: c.createdAt }))),
    ],
    messages: db.chatRooms.flatMap((room) => room.messages.filter((m) => m.senderId === userId && !m.system).map((m) => ({ roomId: room.id, text: m.text, createdAt: m.createdAt }))),
    meetupsHosted: db.activities.filter((a) => a.hostId === userId).map((a) => ({ id: a.id, title: a.title, date: a.date, startTime: a.startTime, place: a.place.name })),
    participations: db.participations.filter((p) => p.userId === userId).map((p) => ({ activityId: p.activityId, status: p.status, createdAt: p.createdAt })),
    listings: db.opportunityIntents.filter((i) => i.userId === userId).map((i) => ({ opportunityId: i.opportunityId, intent: i.intent, ...(i.saved ? { saved: true } : {}), createdAt: i.createdAt })),
    questionsAndReviews: db.opportunities.flatMap((o) => [
      ...o.qna.filter((c) => c.authorId === userId).map((c) => ({ opportunityId: o.id, kind: 'question' as const, text: c.text, createdAt: c.createdAt })),
      ...o.reviews.filter((c) => c.authorId === userId).map((c) => ({ opportunityId: o.id, kind: 'review' as const, text: c.text, createdAt: c.createdAt })),
    ]),
    timePolls: db.timePolls.filter((p) => p.hostId === userId || p.inviteeIds.includes(userId) || userId in p.votes)
      .map((p) => ({ id: p.id, title: p.title, host: p.hostId === userId, myVotes: p.votes[userId] ?? [], status: p.status })),
    proposals: db.proposals.filter((p) => p.fromId === userId || p.toId === userId).map((p) => ({ id: p.id, fromId: p.fromId, toId: p.toId, message: p.message, when: p.when, status: p.status, createdAt: p.createdAt })),
    reportsFiled: db.reports.filter((x) => x.reporterId === userId).map((x) => ({ targetType: x.targetType, targetId: x.targetId, reason: x.reason, status: x.status ?? 'open', createdAt: x.createdAt })),
    notifications: db.notifications.filter((n) => n.userId === userId).map((n) => ({ title: n.title, body: n.body, read: n.read, createdAt: n.createdAt })),
  };
}
