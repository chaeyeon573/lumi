/**
 * 예시(sample) 콘텐츠는 데모 계정에게만 — "가짜 데이터를 진짜처럼 보여주지 않는다".
 *
 * 예시 콘텐츠 = 데모용으로 넣어 둔 것 전부:
 *   - 예시 프로필 (user.sample — 시드 사용자, 데모 계정 u_me·u_me_ucmerced 포함, server/demo.ts)
 *   - 그 사람들이 연 모임·글·약속(timePoll)·같이 타기·게임·1:1 제안·채팅방, 참가·좋아요·팔로우·댓글·후기
 *   - 예시 모임(activity.sample)·예시 같이 타기(ride.sample, server/rides.ts)
 *   - 시드에만 있는 데모 동아리(o_band …)와 시드 공고(op_intern …) — 링크가 example.com 인 지어낸 것
 *
 * 누가 무엇을 받나:
 *   - 실제 계정: 위의 것을 하나도 받지 않는다. 다른 사람 기록에 섞인 예시 사용자 id(좋아요·멤버·투표)도 지운다.
 *     → 사람 카드·숫자·"누가 가요" 줄·추천·오늘의 질문·수업 명단·스터디 그룹·Ask Lumi 에 예시가 섞이지 않는다
 *   - 데모 계정(user.sample): 자기 학교의 예시만 ('Sample' 표시 그대로). 다른 학교 예시 프로필은 안 보인다
 *     (버클리 데모에 UC Merced 예시 프로필이 뜨던 문제)
 *
 * server/view.ts(snapshotFor·patchFor)와 AI(server/ai*.ts 에 넘기는 db)가 이 함수로 거른다.
 */
import type { Patch, Snapshot } from '@core/api/types';
import type { Comment, ID, Relationships, User } from '@core/types';
import { organizations as seedOrganizations, opportunities as seedOpportunities } from '@core/data/seed.en';
import { catalogOrganizations } from '@core/data/catalog/orgs';
import { schoolOf } from '@core/lib/classmates';

/** 시드에만 있는 데모 동아리 (캠퍼스 동아리 목록에 없는 것) — 회원·링크를 지어낸 것이다 */
const catalogOrgIds = new Set(catalogOrganizations.map((o) => o.id));
export const SAMPLE_ORG_IDS: ReadonlySet<ID> = new Set(seedOrganizations.filter((o) => !catalogOrgIds.has(o.id)).map((o) => o.id));
/** 시드 공고 (op_*) — 출처가 example.com 인 데모용. 실제 공고는 데이터 에이전트가 넣는다 */
export const SAMPLE_OPPORTUNITY_IDS: ReadonlySet<ID> = new Set(seedOpportunities.map((o) => o.id));

/** 데모 로그인 계정과 예시 프로필 — 이 사람들만 예시 콘텐츠를 본다 */
export const isDemoViewer = (u?: Pick<User, 'sample'>) => !!u?.sample;

/** 이 사람에게 숨길 예시 콘텐츠의 id */
export interface HiddenSamples {
  users: Set<ID>;
  activities: Set<ID>;
  organizations: ReadonlySet<ID>;
  opportunities: ReadonlySet<ID>;
  rides: Set<ID>;
  posts: Set<ID>;
  timePolls: Set<ID>;
  chatRooms: Set<ID>;
  /** 숨긴 예시 프로필의 이름 — 데모 계정의 예시 알림 글(“Hannah and Lily asked to join”)에 나오면 그 알림을 뺀다 */
  names: string[];
  /** 데모 계정 — 자기 학교 예시는 그대로 본다 */
  demo: boolean;
  /** 숨길 것이 하나도 없다 (데모 계정이 자기 학교 예시만 있는 데이터를 볼 때) */
  none: boolean;
}

const NONE: ReadonlySet<ID> = new Set();

/**
 * viewer 가 없으면(로그인 전 화면·가입 중) 실제 계정과 같이 다 숨긴다.
 * 데모 계정은 자기 학교 예시 프로필만 남기고, 데모 동아리·공고는 그대로 본다.
 */
export function hiddenSamplesFor(db: Pick<Snapshot, 'users' | 'activities' | 'posts' | 'timePolls' | 'chatRooms'> & { rides?: Snapshot['rides'] }, viewer?: User): HiddenSamples {
  const demo = isDemoViewer(viewer);
  const school = viewer ? schoolOf(viewer) : '';
  const users = new Set(db.users.filter((u) => u.sample && u.id !== viewer?.id && !(demo && !!school && schoolOf(u) === school)).map((u) => u.id));
  const organizations = demo ? NONE : SAMPLE_ORG_IDS;
  const opportunities = demo ? NONE : SAMPLE_OPPORTUNITY_IDS;
  const activities = new Set(db.activities.filter((a) => users.has(a.hostId) || (!demo && !!a.sample) || (!!a.orgId && organizations.has(a.orgId))).map((a) => a.id));
  const rides = new Set((db.rides ?? []).filter((r) => users.has(r.hostId) || (!demo && !!r.sample)).map((r) => r.id));
  const posts = new Set(db.posts.filter((p) => (!!p.authorId && users.has(p.authorId)) || (!!p.orgId && organizations.has(p.orgId))).map((p) => p.id));
  const timePolls = new Set(db.timePolls.filter((p) => users.has(p.hostId)).map((p) => p.id));
  const chatRooms = new Set(db.chatRooms.filter((r) => (!!r.activityId && activities.has(r.activityId)) || (!!r.orgId && organizations.has(r.orgId))
    || (!!r.rideId && rides.has(r.rideId)) || (r.type === 'direct' && r.memberIds.some((m) => users.has(m)))).map((r) => r.id));
  const none = demo && !users.size && !activities.size && !rides.size && !posts.size && !timePolls.size && !chatRooms.size;
  const names = demo ? db.users.filter((u) => users.has(u.id)).map((u) => u.nickname) : [];
  return { users, activities, organizations, opportunities, rides, posts, timePolls, chatRooms, names, demo, none };
}

// ─── 거르기 ────────────────────────────────────────────────────────────────
/** 바뀐 것이 없으면 같은 배열을 돌려준다 (5만 개 동아리를 매번 복사하지 않게) */
const dropIds = (ids: ID[] | undefined, h: Set<ID>): ID[] | undefined => (ids?.some((id) => h.has(id)) ? ids.filter((id) => !h.has(id)) : ids);
const dropAuthored = <T extends Pick<Comment, 'authorId'>>(list: T[], h: Set<ID>) => (list.some((c) => !!c.authorId && h.has(c.authorId)) ? list.filter((c) => !c.authorId || !h.has(c.authorId)) : list);
function dropKeys<V>(rec: Record<ID, V>, h: Set<ID>): Record<ID, V> {
  if (!Object.keys(rec).some((k) => h.has(k))) return rec;
  return Object.fromEntries(Object.entries(rec).filter(([k]) => !h.has(k)));
}
/** 알림 링크(/activities/a_x, /users/u_x?game=…, /chats/cr_x)가 숨긴 것을 가리키는지 */
function linksHidden(link: string | undefined, h: HiddenSamples): boolean {
  if (!link) return false;
  return link.split(/[/?&=#]/).some((seg) => !!seg && (h.users.has(seg) || h.activities.has(seg) || h.organizations.has(seg) || h.opportunities.has(seg)
    || h.rides.has(seg) || h.posts.has(seg) || h.timePolls.has(seg) || h.chatRooms.has(seg)));
}

/** 데모 계정만 — 실제 계정의 알림은 실제 사람 이름이라, 예시 프로필과 이름이 같아도 건드리지 않는다 */
function namesHidden(text: string, h: HiddenSamples): boolean {
  return h.demo && h.names.some((name) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text));
}

export function stripRelationships(r: Relationships, u: Set<ID>, orgs: ReadonlySet<ID> = NONE): Relationships {
  const two = (x: { fromId: ID; toId: ID }) => !u.has(x.fromId) && !u.has(x.toId);
  return {
    likes: r.likes.filter(two),
    follows: r.follows.filter((f) => two(f) && !orgs.has(f.toId)),
    friendRequests: r.friendRequests.filter(two),
    friends: r.friends.filter((f) => !u.has(f.a) && !u.has(f.b)),
    blocks: r.blocks.filter(two),
  };
}

/**
 * 스냅샷이나 패치에서 숨길 예시 콘텐츠를 뺀다. 있는 컬렉션만 건드리고, 나머지(removed·schools·reports)는 그대로.
 */
export function stripSamples<T extends Partial<Snapshot> & Pick<Patch, 'removed'>>(src: T, h: HiddenSamples): T {
  if (h.none) return src;
  const U = h.users;
  const out: T = { ...src };
  if (src.users) out.users = src.users.filter((u) => !U.has(u.id)).map((u) => (u.poll && Object.keys(u.poll.votes).some((k) => U.has(k)) ? { ...u, poll: { ...u.poll, votes: dropKeys(u.poll.votes, U) } } : u));
  if (src.organizations) {
    out.organizations = src.organizations.filter((o) => !h.organizations.has(o.id)).map((o) => {
      const followerIds = dropIds(o.followerIds, U)!, memberIds = dropIds(o.memberIds, U)!, adminIds = dropIds(o.adminIds, U)!, applicantIds = dropIds(o.applicantIds, U)!;
      return followerIds === o.followerIds && memberIds === o.memberIds && adminIds === o.adminIds && applicantIds === o.applicantIds ? o : { ...o, followerIds, memberIds, adminIds, applicantIds };
    });
  }
  if (src.activities) {
    out.activities = src.activities.filter((a) => !h.activities.has(a.id) && !U.has(a.hostId) && !(a.sample && !h.demo) && !(a.orgId && h.organizations.has(a.orgId))).map((a) => {
      const comments = dropAuthored(a.comments, U), invitedIds = dropIds(a.invitedIds, U);
      return comments === a.comments && invitedIds === a.invitedIds ? a : { ...a, comments, invitedIds };
    });
  }
  if (src.participations) out.participations = src.participations.filter((p) => !U.has(p.userId) && !h.activities.has(p.activityId));
  if (src.posts) {
    out.posts = src.posts.filter((p) => !h.posts.has(p.id) && !(p.authorId && U.has(p.authorId)) && !(p.orgId && h.organizations.has(p.orgId))).map((p) => {
      const next = { ...p, likeIds: dropIds(p.likeIds, U)!, savedIds: dropIds(p.savedIds, U)!, comments: dropAuthored(p.comments, U), taggedUserIds: dropIds(p.taggedUserIds, U), tagApprovedIds: dropIds(p.tagApprovedIds, U) };
      if (p.relatedActivityId && h.activities.has(p.relatedActivityId)) delete next.relatedActivityId;
      if (p.relatedOpportunityId && h.opportunities.has(p.relatedOpportunityId)) delete next.relatedOpportunityId;
      return next;
    });
  }
  if (src.relationships) out.relationships = stripRelationships(src.relationships, U, h.organizations);
  if (src.proposals) out.proposals = src.proposals.filter((p) => !U.has(p.fromId) && !U.has(p.toId));
  if (src.chatRooms) {
    out.chatRooms = src.chatRooms.filter((r) => !h.chatRooms.has(r.id) && !(r.activityId && h.activities.has(r.activityId)) && !(r.rideId && h.rides.has(r.rideId)) && !(r.orgId && h.organizations.has(r.orgId)))
      .map((r) => (r.memberIds.some((m) => U.has(m)) || r.messages.some((m) => U.has(m.senderId))
        ? { ...r, memberIds: r.memberIds.filter((m) => !U.has(m)), messages: r.messages.filter((m) => !U.has(m.senderId)), lastReadAt: dropKeys(r.lastReadAt, U) }
        : r));
  }
  if (src.notifications) out.notifications = src.notifications.filter((n) => !linksHidden(n.link, h) && !namesHidden(`${n.title} ${n.body}`, h));
  if (src.opportunities) {
    out.opportunities = src.opportunities.filter((o) => !h.opportunities.has(o.id) && !(o.orgId && h.organizations.has(o.orgId))).map((o) => {
      const qna = dropAuthored(o.qna, U), reviews = dropAuthored(o.reviews, U);
      return qna === o.qna && reviews === o.reviews ? o : { ...o, qna, reviews };
    });
  }
  if (src.opportunityIntents) out.opportunityIntents = src.opportunityIntents.filter((i) => !U.has(i.userId) && !h.opportunities.has(i.opportunityId));
  if (src.timePolls) {
    out.timePolls = src.timePolls.filter((p) => !h.timePolls.has(p.id) && !U.has(p.hostId)).map((p) => {
      const inviteeIds = dropIds(p.inviteeIds, U)!, votes = dropKeys(p.votes, U);
      const responses = p.link?.responses.some((r) => r.userId && U.has(r.userId)) ? p.link.responses.filter((r) => !r.userId || !U.has(r.userId)) : p.link?.responses;
      return inviteeIds === p.inviteeIds && votes === p.votes && responses === p.link?.responses ? p : { ...p, inviteeIds, votes, ...(p.link ? { link: { ...p.link, responses: responses! } } : {}) };
    });
  }
  if (src.games) out.games = src.games.filter((g) => !U.has(g.fromId) && !U.has(g.toId));
  if (src.rides) {
    out.rides = src.rides.filter((r) => !h.rides.has(r.id) && !U.has(r.hostId) && !(r.sample && !h.demo)).map((r) => {
      const memberIds = dropIds(r.memberIds, U)!;
      return memberIds === r.memberIds ? r : { ...r, memberIds, memberCount: Math.max(0, r.memberCount - (r.memberIds.length - memberIds.length)) };
    });
  }
  return out;
}

/** 이 사람이 볼 수 있는 데이터 — Ask Lumi·추천처럼 서버가 db 를 직접 훑는 곳에 넘긴다 */
export function sampleFreeFor(db: Snapshot, viewer?: User): Snapshot {
  return stripSamples(db, hiddenSamplesFor(db, viewer));
}
