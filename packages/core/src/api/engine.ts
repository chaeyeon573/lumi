/**
 * AroundU 도메인 엔진 — 브라우저(mock, localStorage)와 서버(Postgres)가 같은 로직을 공유한다.
 *
 * 스냅샷 모양의 in-memory DB(`ctx.db`)를 직접 변경하고, 바뀐 엔티티만 담은 Patch를 돌려준다.
 * 저장(localStorage / DB 영속화), 지연, 세션, 인증은 호출하는 쪽의 책임이다.
 */
import type { Patch, Snapshot, RegisterInput, ActivityInput, PostInput, OpportunityInput, TimePollInput } from './types';
import type {
  Activity, ActivityProposal, Availability, ChatRoom, ID, Notification, OpportunityIntent, Participation, Post, User, Opportunity, TimePoll, TimeOption, ReportTargetType,
} from '@core/types';
import { freeBlocks, jsDayToIdx, toMin } from '@core/lib/timetable';
import { uid, pairKey } from '@core/lib/format';
import { CATEGORY_LABELS } from '@core/lib/labels';
import { canMessage } from '@core/lib/relations';

export interface EngineContext {
  /** 변경 가능한 데이터. 엔진은 이 객체를 직접 수정한다 */
  db: Snapshot;
  /** 번역 함수 (알림·시스템 메시지 문구) */
  t: (ko: string) => string;
  /** 데모 자동 응답(친구 수락·채팅 답장·자동 승인·자동 투표)을 켤지 */
  demo: boolean;
  /** 지연 후 발생한 변경(자동 응답)을 밖으로 내보낸다 */
  push: (patch: Patch) => void;
}

/** 데모용 자동 응답 대상 — 실제 서버에서는 상대 사용자의 행동으로 대체된다 */
const AUTO_ACCEPT_FRIEND = new Set(['u_jimin', 'u_hana', 'u_yuna', 'u_seoyeon']);
const AUTO_ACCEPT_PROPOSAL = new Set(['u_jimin', 'u_sua', 'u_seoyeon']);
const AUTO_APPROVE_HOSTS = new Set(['u_woojin', 'u_hana']);

export const CATEGORY_EMOJI = { coffee: '☕', meal: '🍽️', study: '📖', exercise: '🏃', club: '🎸', performance: '🎤', school_event: '🎓', seminar: '🧪', networking: '🤝', store_deal: '🏷️', etc: '✨' } as const;
export const OPPORTUNITY_EMOJI = { event: '🎪', club: '🎸', lab: '🔬', internship: '💼', scholarship: '🎓', hackathon: '💡', startup: '🚀', activity: '☕', exchange: '✈️' } as const;

export function createEngine(ctx: EngineContext) {
  const { t } = ctx;
  const now = () => new Date().toISOString();
  const db = () => ctx.db;

  const find = <T extends { id: ID }>(arr: T[], id: ID) => {
    const x = arr.find((i) => i.id === id);
    if (!x) throw new Error(t('항목을 찾을 수 없어요.'));
    return x;
  };

  function notify(userId: ID, n: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>): Notification {
    const nt: Notification = { id: uid('nt'), userId, read: false, createdAt: now(), ...n };
    db().notifications.unshift(nt);
    return nt;
  }

  function ensureActivityRoom(activity: Activity): ChatRoom {
    let room = db().chatRooms.find((r) => r.type === 'activity' && r.activityId === activity.id);
    if (!room) {
      room = {
        id: uid('cr'), type: 'activity', activityId: activity.id, memberIds: [activity.hostId], title: activity.title,
        messages: [{ id: uid('m'), senderId: activity.hostId, text: t('활동 그룹 채팅방이 열렸어요.'), createdAt: now(), system: true }],
        lastReadAt: {}, createdAt: now(),
      };
      db().chatRooms.push(room);
    }
    return room;
  }

  function addToRoom(room: ChatRoom, userId: ID) {
    if (!room.memberIds.includes(userId)) {
      room.memberIds.push(userId);
      const user = find(db().users, userId);
      room.messages.push({ id: uid('m'), senderId: userId, text: `${user.nickname}${t('님이 입장했어요.')}`, createdAt: now(), system: true });
    }
  }

  function ensureDirectRoom(a: ID, b: ID): ChatRoom {
    let room = db().chatRooms.find((r) => r.type === 'direct' && r.memberIds.length === 2 && r.memberIds.includes(a) && r.memberIds.includes(b));
    if (!room) {
      room = { id: uid('cr'), type: 'direct', memberIds: [a, b], messages: [], lastReadAt: {}, createdAt: now() };
      db().chatRooms.push(room);
    }
    return room;
  }

  function approveParticipation(p: Participation): Patch {
    p.status = 'approved';
    const activity = find(db().activities, p.activityId);
    const room = ensureActivityRoom(activity);
    addToRoom(room, p.userId);
    const nts = [notify(p.userId, { type: 'participation_approved', title: t('참가가 승인되었어요'), body: `"${activity.title}${t('" 그룹 채팅방에 입장할 수 있어요.')}`, link: `/chats/${room.id}` })];
    return { participations: [p], chatRooms: [room], notifications: nts };
  }

  function acceptFriend(reqId: ID): Patch {
    const r = db().relationships;
    const req = find(r.friendRequests, reqId);
    req.status = 'accepted';
    r.friends.push({ a: req.fromId, b: req.toId, since: now() });
    // 수락된 경우에만 요청자에게 알림
    const other = find(db().users, req.toId);
    const nts = [notify(req.fromId, { type: 'friend_accepted', title: t('친구 요청이 수락되었어요'), body: `${other.nickname}${t('님과 친구가 되었어요. 이제 메시지를 보낼 수 있어요.')}`, link: `/users/${other.id}` })];
    return { relationships: r, notifications: nts };
  }

  const later = (ms: number, fn: () => void) => { if (ctx.demo) setTimeout(fn, ms); };

  return {
    find,
    notify,

    /** 만료된 제안 처리 등 읽기 전 정리 */
    housekeeping(): Patch {
      const t0 = Date.now();
      const changed: ActivityProposal[] = [];
      db().proposals.forEach((p) => { if (p.status === 'pending' && new Date(p.expiresAt).getTime() < t0) { p.status = 'expired'; changed.push(p); } });
      return changed.length ? { proposals: changed } : {};
    },

    register(input: RegisterInput): User {
      const school = find(db().schools, input.schoolId);
      const user: User = {
        id: uid('u'), nickname: input.nickname, birthYear: input.birthYear, gender: input.gender, avatar: input.avatar,
        identityVerified: false,
        affiliation: {
          type: 'university', schoolId: school.id, schoolName: school.name, role: input.role, department: input.department, year: input.year,
          emailVerified: input.emailVerified, showSchool: input.showSchool, showDepartment: input.showDepartment,
        },
        bio: input.bio, likes: input.likes, freeTime: input.freeTime, height: input.height, availability: input.availability,
        interests: input.interests, purposes: input.purposes, preferredPartner: input.preferredPartner, region: school.region,
        prompts: input.prompts, voicePrompt: input.voicePrompt, poll: input.poll, timetable: input.timetable ?? [],
        goals: input.goals, lookingFor: input.lookingFor ?? [], canOffer: input.canOffer ?? [], living: input.living, interestedOrgIds: (input.interestedOrgIds ?? []).filter((id) => db().organizations.some((o) => o.id === id)).slice(0, 20), meetPreference: input.meetPreference ?? [],
        fieldVisibility: input.fieldVisibility,
        settings: { messagePolicy: 'connected', notifications: input.notifications, locationPermission: input.locationPermission },
        createdAt: now(),
      };
      db().users.push(user);
      notify(user.id, { type: 'nearby_activity', title: t('AroundU에 오신 걸 환영해요'), body: t('학교 주변에서 열리는 활동을 홈에서 확인해보세요.'), link: '/' });
      return user;
    },

    schools: {
      search(query: string) {
        const q = query.trim().toLowerCase();
        return db().schools.filter((s) => !q || s.name.toLowerCase().includes(q) || s.region.toLowerCase().includes(q));
      },
    },

    users: {
      update(id: ID, patch: Partial<User>): Patch {
        const u = find(db().users, id);
        // id·생성일은 바꿀 수 없다
        const { id: _i, createdAt: _c, ...rest } = patch;
        Object.assign(u, rest);
        return { users: [u] };
      },
      setAvailability(id: ID, availability: Availability): Patch {
        const u = find(db().users, id); u.availability = availability; return { users: [u] };
      },
      votePoll(ownerId: ID, voterId: ID, optionIndex: number): Patch {
        const u = find(db().users, ownerId);
        if (!u.poll) throw new Error(t('투표형 질문이 없어요.'));
        u.poll.votes[voterId] = optionIndex;
        return { users: [u] };
      },
    },

    activities: {
      create(hostId: ID, input: ActivityInput): { activity: Activity; patch: Patch } {
        const activity: Activity = { id: uid('a'), hostId, hostType: input.orgId ? 'org' : 'user', comments: [], createdAt: now(), ...input };
        db().activities.unshift(activity);
        const room = ensureActivityRoom(activity);
        // 초대된 사람은 바로 참가자로 등록
        const parts: Participation[] = (input.invitedIds ?? []).map((userId) => {
          const p: Participation = { id: uid('p'), activityId: activity.id, userId, status: 'approved', createdAt: now() };
          db().participations.push(p);
          addToRoom(room, userId);
          return p;
        });
        return { activity, patch: { activities: [activity], chatRooms: [room], participations: parts } };
      },
      update(id: ID, input: Partial<ActivityInput>): Patch {
        const a = find(db().activities, id);
        Object.assign(a, input);
        const room = db().chatRooms.find((r) => r.activityId === id);
        if (room) room.title = a.title;
        return { activities: [a], chatRooms: room ? [room] : [] };
      },
      remove(id: ID): Patch {
        const d = db();
        d.activities = d.activities.filter((a) => a.id !== id);
        const removedParts = d.participations.filter((p) => p.activityId === id).map((p) => p.id);
        d.participations = d.participations.filter((p) => p.activityId !== id);
        const rooms = d.chatRooms.filter((r) => r.activityId === id).map((r) => r.id);
        d.chatRooms = d.chatRooms.filter((r) => r.activityId !== id);
        const touched: Post[] = [];
        d.posts.forEach((p) => { if (p.relatedActivityId === id) { delete p.relatedActivityId; touched.push(p); } });
        return { posts: touched, removed: { activities: [id], participations: removedParts, chatRooms: rooms } };
      },
      join(activityId: ID, userId: ID, message?: string): Patch {
        const activity = find(db().activities, activityId);
        const existing = db().participations.find((p) => p.activityId === activityId && p.userId === userId && p.status !== 'cancelled' && p.status !== 'rejected');
        if (existing) return { participations: [existing] };
        const approvedCount = db().participations.filter((p) => p.activityId === activityId && p.status === 'approved').length;
        if (activity.joinPolicy === 'invite' && !(activity.invitedIds ?? []).includes(userId)) throw new Error(t('초대받은 사람만 참가할 수 있는 활동이에요.'));
        if (approvedCount >= activity.capacity) throw new Error(t('모집 인원이 모두 찼어요.'));
        const p: Participation = { id: uid('p'), activityId, userId, status: activity.joinPolicy === 'open' ? 'approved' : 'pending', message, createdAt: now() };
        db().participations.push(p);
        if (p.status === 'approved') {
          const room = ensureActivityRoom(activity);
          addToRoom(room, userId);
          return { participations: [p], chatRooms: [room] };
        }
        const requester = find(db().users, userId);
        const nts = activity.hostId === userId ? [] : [notify(activity.hostId, { type: 'participation_request', title: t('참가 요청'), body: `${requester.nickname}${t('님이 "')}${activity.title}${t('"에 참가를 신청했어요.')}`, link: `/activities/${activity.id}/manage` })];
        // 데모: 일부 주최자는 잠시 후 자동 승인
        if (AUTO_APPROVE_HOSTS.has(activity.hostId)) later(5000, () => { if (p.status === 'pending') ctx.push(approveParticipation(p)); });
        return { participations: [p], notifications: nts };
      },
      cancel(activityId: ID, userId: ID): Patch {
        const p = db().participations.find((x) => x.activityId === activityId && x.userId === userId && (x.status === 'approved' || x.status === 'pending'));
        if (!p) return {};
        p.status = 'cancelled';
        const room = db().chatRooms.find((r) => r.activityId === activityId);
        if (room) room.memberIds = room.memberIds.filter((m) => m !== userId);
        return { participations: [p], chatRooms: room ? [room] : [] };
      },
      approve(participationId: ID): Patch {
        return approveParticipation(find(db().participations, participationId));
      },
      reject(participationId: ID): Patch {
        const p = find(db().participations, participationId);
        p.status = 'rejected';
        const activity = find(db().activities, p.activityId);
        const nts = [notify(p.userId, { type: 'participation_rejected', title: t('이번 활동은 성사되지 않았어요'), body: `"${activity.title}${t('" 참가가 승인되지 않았어요.')}`, link: `/activities/${activity.id}` })];
        return { participations: [p], notifications: nts };
      },
      comment(activityId: ID, authorId: ID, text: string): Patch {
        const a = find(db().activities, activityId);
        a.comments.push({ id: uid('c'), authorId, text, createdAt: now() });
        const author = find(db().users, authorId);
        const nts = a.hostId === authorId ? [] : [notify(a.hostId, { type: 'comment', title: t('새 댓글'), body: `${author.nickname}${t('님이 "')}${a.title}${t('"에 댓글을 남겼어요.')}`, link: `/activities/${a.id}` })];
        return { activities: [a], notifications: nts };
      },
    },

    posts: {
      create(authorId: ID, input: PostInput): { post: Post; patch: Patch } {
        const post: Post = { id: uid('po'), authorId, authorType: input.orgId ? 'org' : 'user', likeIds: [], savedIds: [], comments: [], createdAt: now(), showOnProfile: true, showOnFeed: true, ...input };
        if (post.anonymous) { post.media = []; post.taggedUserIds = []; }
        db().posts.unshift(post);
        const author = find(db().users, authorId);
        const nts: Notification[] = [];
        (post.taggedUserIds ?? []).filter((u) => u !== authorId).forEach((taggedId) => {
          nts.push(notify(taggedId, { type: 'comment', title: t('게시물에 태그되었어요'), body: `${author.nickname}${t('님이 함께한 사람으로 태그했어요. 승인하면 내 프로필에도 보여요.')}`, link: '/community' }));
          // 데모: 예시 사용자는 잠시 후 자동 승인
          later(4000, () => { post.tagApprovedIds = [...new Set([...(post.tagApprovedIds ?? []), taggedId])]; ctx.push({ posts: [post] }); });
        });
        return { post, patch: { posts: [post], notifications: nts } };
      },
      remove(id: ID): Patch {
        db().posts = db().posts.filter((p) => p.id !== id); return { removed: { posts: [id] } };
      },
      toggleLike(postId: ID, userId: ID): Patch {
        const p = find(db().posts, postId);
        p.likeIds = p.likeIds.includes(userId) ? p.likeIds.filter((i) => i !== userId) : [...p.likeIds, userId];
        return { posts: [p] };
      },
      toggleSave(postId: ID, userId: ID): Patch {
        const p = find(db().posts, postId);
        p.savedIds = p.savedIds.includes(userId) ? p.savedIds.filter((i) => i !== userId) : [...p.savedIds, userId];
        return { posts: [p] };
      },
      comment(postId: ID, authorId: ID, text: string): Patch {
        const p = find(db().posts, postId);
        p.comments.push({ id: uid('c'), authorId, text, createdAt: now() });
        return { posts: [p] };
      },
      approveTag(postId: ID, userId: ID, approve: boolean): Patch {
        const p = find(db().posts, postId);
        const set = new Set(p.tagApprovedIds ?? []);
        if (approve) set.add(userId); else { set.delete(userId); p.taggedUserIds = (p.taggedUserIds ?? []).filter((i) => i !== userId); }
        p.tagApprovedIds = [...set];
        return { posts: [p] };
      },
    },

    relationships: {
      toggleLike(fromId: ID, toId: ID): { patch: Patch; mutual: boolean } {
        const r = db().relationships;
        const exists = r.likes.find((l) => l.fromId === fromId && l.toId === toId);
        let mutual = false;
        const nts: Notification[] = [];
        if (exists) {
          r.likes = r.likes.filter((l) => l !== exists);
        } else {
          r.likes.push({ fromId, toId, createdAt: now() });
          mutual = r.likes.some((l) => l.fromId === toId && l.toId === fromId);
          if (mutual) {
            const other = find(db().users, toId);
            const me = find(db().users, fromId);
            nts.push(notify(fromId, { type: 'mutual_like', title: t('서로 관심이 있어요'), body: `${other.nickname}${t('님과 서로 관심이 있어요. 이제 메시지를 보낼 수 있어요.')}`, link: `/users/${toId}` }));
            nts.push(notify(toId, { type: 'mutual_like', title: t('서로 관심이 있어요'), body: `${me.nickname}${t('님과 서로 관심이 있어요. 이제 메시지를 보낼 수 있어요.')}`, link: `/users/${fromId}` }));
          }
        }
        return { patch: { relationships: r, notifications: nts }, mutual };
      },
      toggleFollow(fromId: ID, toId: ID, targetType: 'user' | 'org'): Patch {
        const r = db().relationships;
        const exists = r.follows.find((f) => f.fromId === fromId && f.toId === toId);
        r.follows = exists ? r.follows.filter((f) => f !== exists) : [...r.follows, { fromId, toId, targetType }];
        const orgs = [];
        const nts: Notification[] = [];
        if (targetType === 'org') {
          const org = find(db().organizations, toId);
          org.followerIds = exists ? org.followerIds.filter((i) => i !== fromId) : [...org.followerIds, fromId];
          orgs.push(org);
        } else if (!exists) {
          const me = find(db().users, fromId);
          nts.push(notify(toId, { type: 'follow', title: t('새 팔로워'), body: `${me.nickname}${t('님이 회원님을 팔로우하기 시작했어요.')}`, link: `/users/${fromId}` }));
        }
        return { relationships: r, organizations: orgs, notifications: nts };
      },
      sendFriendRequest(fromId: ID, toId: ID): Patch {
        const r = db().relationships;
        if (r.friendRequests.some((q) => q.fromId === fromId && q.toId === toId && q.status === 'pending')) return { relationships: r };
        const req = { id: uid('fr'), fromId, toId, status: 'pending' as const, createdAt: now() };
        r.friendRequests.push(req);
        if (AUTO_ACCEPT_FRIEND.has(toId)) later(5000, () => { if (req.status === 'pending') ctx.push(acceptFriend(req.id)); });
        return { relationships: r };
      },
      cancelFriendRequest(requestId: ID): Patch {
        const r = db().relationships;
        r.friendRequests = r.friendRequests.filter((q) => q.id !== requestId);
        return { relationships: r };
      },
      respondFriendRequest(requestId: ID, accept: boolean): Patch {
        if (accept) return acceptFriend(requestId);
        const req = find(db().relationships.friendRequests, requestId);
        req.status = 'declined'; // 거절 알림은 보내지 않음
        return { relationships: db().relationships };
      },
      unfriend(a: ID, b: ID): Patch {
        const r = db().relationships;
        const k = pairKey(a, b);
        r.friends = r.friends.filter((f) => pairKey(f.a, f.b) !== k);
        return { relationships: r };
      },
      block(fromId: ID, toId: ID): Patch {
        const r = db().relationships;
        if (!r.blocks.some((b) => b.fromId === fromId && b.toId === toId)) r.blocks.push({ fromId, toId });
        const k = pairKey(fromId, toId);
        r.friends = r.friends.filter((f) => pairKey(f.a, f.b) !== k);
        r.follows = r.follows.filter((f) => !(f.fromId === fromId && f.toId === toId) && !(f.fromId === toId && f.toId === fromId));
        r.likes = r.likes.filter((l) => !(l.fromId === fromId && l.toId === toId) && !(l.fromId === toId && l.toId === fromId));
        r.friendRequests = r.friendRequests.filter((q) => pairKey(q.fromId, q.toId) !== k);
        return { relationships: r };
      },
      unblock(fromId: ID, toId: ID): Patch {
        const r = db().relationships;
        r.blocks = r.blocks.filter((b) => !(b.fromId === fromId && b.toId === toId));
        return { relationships: r };
      },
    },

    orgs: {
      apply(orgId: ID, userId: ID): Patch {
        const org = find(db().organizations, orgId);
        if (!org.applicantIds.includes(userId) && !org.memberIds.includes(userId)) org.applicantIds.push(userId);
        return { organizations: [org] };
      },
    },

    opportunities: {
      create(authorId: ID, input: OpportunityInput): { opportunity: Opportunity; patch: Patch } {
        const author = find(db().users, authorId);
        const o: Opportunity = {
          id: uid('op'), type: input.type, title: input.title, host: input.host || author.nickname, orgId: input.orgId, description: input.description,
          cover: { emoji: OPPORTUNITY_EMOJI[input.type], hue: 200 },
          deadline: input.deadline, date: input.date, eligibility: t('누구나'), rolesNeeded: input.rolesNeeded, sourceUrl: input.sourceUrl, sourceLabel: input.sourceUrl ? t('공유된 링크') : '',
          tags: [], interests: [], goals: [], schoolId: author.affiliation.type === 'university' ? author.affiliation.schoolId : undefined, lastVerified: now().slice(0, 10), qna: [], reviews: [], createdAt: now(),
        };
        db().opportunities.unshift(o);
        const rec = { id: uid('oi'), opportunityId: o.id, userId: authorId, intent: 'interested' as const, saved: true, createdAt: now() };
        db().opportunityIntents.push(rec);
        return { opportunity: o, patch: { opportunities: [o], opportunityIntents: [rec] } };
      },
      setIntent(opportunityId: ID, userId: ID, intent: OpportunityIntent | null): Patch {
        const d = db();
        const existing = d.opportunityIntents.find((i) => i.opportunityId === opportunityId && i.userId === userId);
        if (!intent) {
          if (!existing) return {};
          if (existing.saved) { existing.intent = 'interested'; return { opportunityIntents: [existing] }; }
          d.opportunityIntents = d.opportunityIntents.filter((i) => i.id !== existing.id);
          return { removed: { opportunityIntents: [existing.id] } };
        }
        if (existing) { existing.intent = intent; return { opportunityIntents: [existing] }; }
        const rec = { id: uid('oi'), opportunityId, userId, intent, saved: false, createdAt: now() };
        d.opportunityIntents.push(rec);
        return { opportunityIntents: [rec] };
      },
      toggleSave(opportunityId: ID, userId: ID): Patch {
        const existing = db().opportunityIntents.find((i) => i.opportunityId === opportunityId && i.userId === userId);
        if (existing) { existing.saved = !existing.saved; return { opportunityIntents: [existing] }; }
        const rec = { id: uid('oi'), opportunityId, userId, intent: 'interested' as const, saved: true, createdAt: now() };
        db().opportunityIntents.push(rec);
        return { opportunityIntents: [rec] };
      },
      ask(opportunityId: ID, authorId: ID, text: string): Patch {
        const o = find(db().opportunities, opportunityId); o.qna.push({ id: uid('c'), authorId, text, createdAt: now() }); return { opportunities: [o] };
      },
      review(opportunityId: ID, authorId: ID, text: string, result?: 'accepted' | 'rejected' | 'attended'): Patch {
        const o = find(db().opportunities, opportunityId); o.reviews.unshift({ id: uid('r'), authorId, text, result, createdAt: now() }); return { opportunities: [o] };
      },
    },

    proposals: {
      create(fromId: ID, toId: ID, input: Pick<ActivityProposal, 'category' | 'message' | 'when'>): Patch {
        const p: ActivityProposal = { id: uid('pr'), fromId, toId, status: 'pending', createdAt: now(), expiresAt: new Date(Date.now() + 48 * 3600000).toISOString(), ...input };
        db().proposals.push(p);
        const me = find(db().users, fromId);
        const nts = [notify(toId, { type: 'proposal', title: t('활동 제안이 도착했어요'), body: `${me.nickname}${t('님이 ')}${CATEGORY_LABELS[p.category]}${t('을(를) 제안했어요.')}`, link: '/chats?tab=requests' })];
        if (AUTO_ACCEPT_PROPOSAL.has(toId)) later(5000, () => {
          if (p.status !== 'pending') return;
          p.status = 'accepted';
          const room = ensureDirectRoom(fromId, toId);
          const other = find(db().users, toId);
          room.messages.push({ id: uid('m'), senderId: toId, text: `${CATEGORY_LABELS[p.category]}${t(' 제안 좋아요! ')}${p.when}${t('에 봐요 :)')}`, createdAt: now() });
          const nt = notify(fromId, { type: 'proposal_result', title: t('활동 제안이 수락되었어요'), body: `${other.nickname}${t('님이 제안을 수락했어요. 대화를 시작해보세요.')}`, link: `/chats/${room.id}` });
          ctx.push({ proposals: [p], chatRooms: [room], notifications: [nt] });
        });
        return { proposals: [p], notifications: nts };
      },
      respond(id: ID, accept: boolean): Patch {
        const p = find(db().proposals, id);
        p.status = accept ? 'accepted' : 'declined';
        if (!accept) return { proposals: [p] }; // 거절 사유·알림 없음
        const room = ensureDirectRoom(p.fromId, p.toId);
        room.messages.push({ id: uid('m'), senderId: p.toId, text: t('활동 제안을 수락했어요. 세부 일정 이야기해요!'), createdAt: now(), system: true });
        const other = find(db().users, p.toId);
        const nts = [notify(p.fromId, { type: 'proposal_result', title: t('활동 제안이 수락되었어요'), body: `${other.nickname}${t('님이 제안을 수락했어요. 대화를 시작해보세요.')}`, link: `/chats/${room.id}` })];
        return { proposals: [p], chatRooms: [room], notifications: nts };
      },
    },

    together: {
      create(hostId: ID, input: TimePollInput): { poll: TimePoll; patch: Patch } {
        const host = find(db().users, hostId);
        const poll: TimePoll = {
          id: uid('tp'), hostId, title: input.title, category: input.category, place: input.place, inviteeIds: input.inviteeIds,
          options: input.options.map((o) => ({ ...o, id: uid('to') })), votes: {}, status: 'open', closesAt: input.closesAt, createdAt: now(),
        };
        // 주최자는 모든 옵션에 가능한 것으로 시작
        poll.votes[hostId] = poll.options.map((o) => o.id);
        db().timePolls.unshift(poll);
        const nts = input.inviteeIds.map((u) => notify(u, { type: 'plan_vote', title: t('언제 만날지 골라주세요'), body: `${host.nickname}${t('님이 "')}${poll.title}${t('" 시간을 정하고 있어요.')}`, link: `/together/${poll.id}` }));
        // 데모: 초대받은 예시 사용자는 잠시 후 자기 시간표의 공강과 겹치는 시간에 자동 투표
        if (ctx.demo) input.inviteeIds.forEach((inviteeId, i) => later(3500 + i * 1800, () => {
          if (poll.status !== 'open' || poll.votes[inviteeId]) return;
          const u = db().users.find((x) => x.id === inviteeId); if (!u) return;
          const ok = poll.options.filter((o) => {
            if (!u.timetable.length) return Math.random() < 0.6;
            const day = jsDayToIdx(new Date(o.date).getDay());
            return freeBlocks(u.timetable, day).some((b) => b.start <= toMin(o.startTime) && b.end >= toMin(o.endTime));
          }).map((o) => o.id);
          poll.votes[inviteeId] = ok.length ? ok : [poll.options[0].id];
          ctx.push({ timePolls: [poll] });
        }));
        return { poll, patch: { timePolls: [poll], notifications: nts } };
      },
      vote(pollId: ID, userId: ID, optionIds: ID[]): Patch {
        const p = find(db().timePolls, pollId); p.votes[userId] = optionIds; return { timePolls: [p] };
      },
      addOption(pollId: ID, userId: ID, option: Omit<TimeOption, 'id'>): Patch {
        const p = find(db().timePolls, pollId);
        const o = { ...option, id: uid('to') };
        p.options.push(o);
        p.votes[userId] = [...new Set([...(p.votes[userId] ?? []), o.id])];
        return { timePolls: [p] };
      },
      decide(pollId: ID, optionId: ID): { activity: Activity; patch: Patch } {
        const p = find(db().timePolls, pollId);
        const opt = p.options.find((o) => o.id === optionId);
        if (!opt) throw new Error(t('항목을 찾을 수 없어요.'));
        const goers = [...new Set([p.hostId, ...Object.entries(p.votes).filter(([, ids]) => ids.includes(optionId)).map(([u]) => u)])];
        const host = find(db().users, p.hostId);
        const activity: Activity = {
          id: uid('a'), kind: 'group', category: p.category, title: p.title, description: `${t('Plan Together로 정한 약속이에요. ')}${goers.length}${t('명이 이 시간에 가능하다고 했어요.')}`,
          cover: { emoji: CATEGORY_EMOJI[p.category], hue: 200 },
          hostId: p.hostId, hostType: 'user', date: opt.date, startTime: opt.startTime, endTime: opt.endTime,
          place: p.place ?? { name: t('장소 미정'), lat: 0, lng: 0 }, capacity: Math.max(goers.length, p.inviteeIds.length + 1), visibility: 'selected', visibilityTargets: [...p.inviteeIds],
          joinPolicy: 'invite', fee: 0, invitedIds: [...p.inviteeIds], comments: [], createdAt: now(),
        };
        db().activities.unshift(activity);
        const room = ensureActivityRoom(activity);
        const parts: Participation[] = goers.filter((g) => g !== p.hostId).map((userId) => {
          const pt: Participation = { id: uid('p'), activityId: activity.id, userId, status: 'approved', createdAt: now() };
          db().participations.push(pt); addToRoom(room, userId); return pt;
        });
        p.status = 'decided'; p.decidedOptionId = optionId; p.activityId = activity.id;
        const nts = goers.filter((g) => g !== p.hostId).map((g) => notify(g, { type: 'plan_decided', title: t('약속 시간이 정해졌어요'), body: `${host.nickname}${t('님이 "')}${p.title}${t('" 시간을 확정했어요. 그룹 채팅방이 열렸어요.')}`, link: `/activities/${activity.id}` }));
        return { activity, patch: { timePolls: [p], activities: [activity], participations: parts, chatRooms: [room], notifications: nts } };
      },
      cancel(pollId: ID): Patch {
        const p = find(db().timePolls, pollId); p.status = 'cancelled'; return { timePolls: [p] };
      },
    },

    chats: {
      send(roomId: ID, senderId: ID, text: string): Patch {
        const room = find(db().chatRooms, roomId);
        if (!room.memberIds.includes(senderId)) throw new Error(t('이 채팅방의 멤버가 아니에요.'));
        room.messages.push({ id: uid('m'), senderId, text, createdAt: now() });
        room.lastReadAt[senderId] = now();
        // 데모: 1:1 채팅에서 상대가 잠시 후 답장
        if (room.type === 'direct') {
          const other = room.memberIds.find((m) => m !== senderId);
          const replies = [t('좋아요! 언제 만날까요?'), t('ㅋㅋㅋ 그러게요'), t('저도 그 생각 했어요'), t('알겠어요, 이따 봐요 :)'), t('오 좋다 👍')];
          if (other) later(2000 + Math.random() * 1500, () => {
            room.messages.push({ id: uid('m'), senderId: other, text: replies[Math.floor(Math.random() * replies.length)], createdAt: now() });
            ctx.push({ chatRooms: [room] });
          });
        }
        return { chatRooms: [room] };
      },
      markRead(roomId: ID, userId: ID): Patch {
        const room = find(db().chatRooms, roomId);
        room.lastReadAt[userId] = now();
        return { chatRooms: [room] };
      },
      openDirect(a: ID, b: ID): { room: ChatRoom; patch: Patch } {
        const check = canMessage(db(), a, b);
        if (!check.ok) throw new Error(check.reason);
        const room = ensureDirectRoom(a, b);
        return { room, patch: { chatRooms: [room] } };
      },
    },

    notifications: {
      markRead(id: ID): Patch {
        const n = find(db().notifications, id); n.read = true; return { notifications: [n] };
      },
      markAllRead(userId: ID): Patch {
        const mine = db().notifications.filter((n) => n.userId === userId);
        mine.forEach((n) => { n.read = true; });
        return { notifications: mine };
      },
    },

    reports: {
      create(reporterId: ID, targetType: ReportTargetType, targetId: ID, reason: string): Patch {
        const r = { id: uid('rp'), reporterId, targetType, targetId, reason, createdAt: now() };
        db().reports.push(r);
        return { reports: [r] };
      },
    },
  };
}

export type Engine = ReturnType<typeof createEngine>;
