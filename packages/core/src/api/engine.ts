/**
 * Lumi 도메인 엔진 — 브라우저(mock, localStorage)와 서버(Postgres)가 같은 로직을 공유한다.
 *
 * 스냅샷 모양의 in-memory DB(`ctx.db`)를 직접 변경하고, 바뀐 엔티티만 담은 Patch를 돌려준다.
 * 저장(localStorage / DB 영속화), 지연, 세션, 인증은 호출하는 쪽의 책임이다.
 */
import type { Patch, Snapshot, RegisterInput, ActivityInput, PostInput, OpportunityInput, TimePollInput, GoTogetherResult, DailyResults, OrgInput } from './types';
import type {
  Activity, ActivityProposal, Availability, ChatRoom, ID, Notification, OpportunityIntent, Participation, Post, User, Opportunity, TimePoll, TimeOption, ReportTargetType,
  Game, GameInput, GameKind, Role, Organization, JoinRequest, HowToJoin,
} from '@core/types';
import { freeBlocks, jsDayToIdx, toMin } from '@core/lib/timetable';
import { uid, pairKey } from '@core/lib/format';
import { CATEGORY_LABELS } from '@core/lib/labels';
import { canMessage, canViewField, isBlocked } from '@core/lib/relations';
import { canSendGame, gameProfileError, gameSummary, guessPickResult, thisOrThatResult, twoTruthsResult, GAME_LABELS, GAME_LIMITS } from '@core/lib/icebreakers';
import { pairById, guessQuestionById } from '@core/data/icebreakers';
import { DAILY_QUESTIONS, PERSON_ROLE_LABELS } from '@core/lib/labels';
import { campusDate } from '@core/lib/listings';
import { pollPlaceNames, POLL_MAX_GRID_OPTIONS } from '@core/lib/pollgrid';
import { orgJoinState } from '@core/lib/orgjoin';
import { CONSENT_VERSION, deliverSaved, ORG_MESSAGE_MAX, requestOf } from '@core/lib/clubjoin';
import { audienceFits, isFull, waitlistOf } from '@core/lib/meetups';
import { initialsOf } from '@core/lib/orglinks';
import { groupLimitReason, hasPlus, limitsFor, meetupLimitReason, upcomingHosted } from '@core/lib/plus';
import { canGoTogether, campusToday, crewMembers, crewsFor, dailyTally, meetTimeFor, DAILY_MIN_ANSWERS, MEETUP_CAPACITY } from '@core/lib/withpeople';

export interface EngineContext {
  /** 변경 가능한 데이터. 엔진은 이 객체를 직접 수정한다 */
  db: Snapshot;
  /** 번역 함수 (알림·시스템 메시지 문구) */
  t: (ko: string) => string;
  /** 데모 자동 응답(친구 수락·채팅 답장·자동 승인·자동 투표)을 켤지 */
  demo: boolean;
  /** 지연 후 발생한 변경(자동 응답)을 밖으로 내보낸다 */
  push: (patch: Patch) => void;
  /** Lumi+ 플래그 (서버 LUMI_PLUS). 없거나 false 면 아무것도 막지 않고 지금 한도 그대로 (@core/lib/plus) */
  plusEnabled?: () => boolean;
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

  /** "We told {club} you want to join" — the moment a saved join request really reaches the club (@core/lib/clubjoin) */
  function toldNote(org: Organization, userId: ID): Notification {
    return notify(userId, { type: 'org_event', title: t('{club}에 가입하고 싶다고 전했어요').replace('{club}', org.name), body: t('답이 오면 여기서 알려 드려요.'), link: `/orgs/${org.id}` });
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

  /** 참가할 수 있는지 — 초대 전용·차단·학적(S045 audience). 안 되면 사람이 읽을 이유로 던진다 */
  function canJoin(activity: Activity, userId: ID) {
    if (activity.joinPolicy === 'invite' && !(activity.invitedIds ?? []).includes(userId)) throw new Error(t('초대받은 사람만 참가할 수 있는 활동이에요.'));
    if (isBlocked(db(), userId, activity.hostId)) throw new Error(t('참가할 수 없는 활동이에요.'));
    const user = find(db().users, userId);
    if (!audienceFits(activity, user)) throw new Error(t('이 모임은 정해진 학적의 학생만 참가할 수 있어요.'));
  }

  function acceptFriend(reqId: ID): Patch {
    const r = db().relationships;
    const req = find(r.friendRequests, reqId);
    req.status = 'accepted';
    r.friends.push({ a: req.fromId, b: req.toId, since: now() });
    // 수락된 경우에만 요청자에게 알림
    const other = find(db().users, req.toId);
    const nts = [notify(req.fromId, { type: 'friend_accepted', title: t('친구 요청이 수락되었어요'), body: `${other.nickname}${t('님과 친구가 되었어요. 이제 메시지를 보낼 수 있어요.')}`, link: `/users/${other.id}` })];
    return { relationships: r, notifications: nts, users: pair(req.fromId, req.toId) };
  }
  /**
   * 친구·팔로우·차단이 바뀌면 두 사람 프로필도 같이 보낸다 — 서버는 보는 사람마다 공개 범위를 다시 계산해
   * 새로 열린 항목을 보내고 닫힌 항목은 지운다 (server/view.ts · lib/privacy)
   */
  function pair(a: ID, b: ID): User[] { return db().users.filter((u) => u.id === a || u.id === b); }

  const later = (ms: number, fn: () => void) => { if (ctx.demo) setTimeout(fn, ms); };

  // ─── 아이스브레이커 게임 ──────────────────────────────────────────────────
  /** 예전에 저장된 스냅샷에는 games가 없을 수 있다 */
  const games = (): Game[] => (db().games ??= []);
  const samePair = (g: Game, a: ID, b: ID) => (g.fromId === a && g.toId === b) || (g.fromId === b && g.toId === a);

  /** 결과를 확정하고 1:1 채팅방을 열어(있으면 재사용) 결과 메시지를 남긴다 — 다른 선택이어도 연다 (그게 대화거리) */
  function resolveGame(g: Game): ChatRoom {
    g.status = 'done';
    g.resolvedAt = now();
    const room = ensureDirectRoom(g.fromId, g.toId);
    g.roomId = room.id;
    room.messages.push({ id: uid('m'), senderId: g.fromId, text: gameSummary(g, db().users), createdAt: now(), system: true, gameId: g.id });
    return room;
  }

  function answerThisOrThat(g: Game & { kind: 'this_or_that' }, choice: 0 | 1): Patch {
    g.toChoice = choice;
    g.result = thisOrThatResult(g.fromChoice ?? 0, choice);
    const room = resolveGame(g);
    const other = find(db().users, g.toId);
    const nt = notify(g.fromId, { type: 'game_result', title: `${other.nickname}${t('님이 답했어요')}`, body: gameSummary(g, db().users), link: `/chats/${room.id}` });
    return { games: [g], chatRooms: [room], notifications: [nt] };
  }

  /** 두 Patch 를 합친다 — 같은 id 는 뒤의 것이 이긴다 */
  function mergePatch(a: Patch, b: Patch): Patch {
    const out: Record<string, unknown> = { ...a };
    for (const [k, v] of Object.entries(b)) {
      if (v === undefined) continue;
      if (k === 'removed') {
        const r: Record<string, ID[]> = { ...(out.removed as Record<string, ID[]> | undefined) };
        for (const [rk, ids] of Object.entries(v as Record<string, ID[]>)) r[rk] = [...new Set([...(r[rk] ?? []), ...ids])];
        out.removed = r;
      } else if (Array.isArray(v)) {
        const prev = (out[k] as { id: ID }[] | undefined) ?? [];
        const byId = new Map(prev.map((x) => [x.id, x]));
        for (const x of v as { id: ID }[]) byId.set(x.id, x);
        out[k] = [...byId.values()];
      } else out[k] = v;
    }
    return out as Patch;
  }
  const schoolOf = (u: User) => (u.affiliation.type === 'university' ? u.affiliation.schoolId ?? '' : '');

  const api = {
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
      notify(user.id, { type: 'nearby_activity', title: t('Lumi에 오신 걸 환영해요'), body: t('학교 주변에서 열리는 활동을 홈에서 확인해보세요.'), link: '/' });
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
        // id·생성일은 바꿀 수 없다. 서버가 보는 사람마다 계산해 붙이는 값(viewable·함께 아는 친구 수)은 저장하지 않는다
        const { id: _i, createdAt: _c, viewable: _v, mutualFriendCount: _m, ...rest } = patch;
        const gameErr = gameProfileError(rest);
        if (gameErr) throw new Error(gameErr);
        // 게임 항목은 저장 시각을 서버가 찍는다
        if (rest.hotTake) rest.hotTake = { text: rest.hotTake.text.trim(), updatedAt: now() };
        if (rest.twoTruths) rest.twoTruths = { statements: rest.twoTruths.statements.map((x) => x.trim()), lieIndex: rest.twoTruths.lieIndex, updatedAt: now() };
        if (rest.emojiWeek) rest.emojiWeek = { ...rest.emojiWeek, meaning: rest.emojiWeek.meaning?.trim(), updatedAt: now() };
        Object.assign(u, rest);
        // 멤버십 공개 범위가 바뀌면 내가 속한·팔로우하는 동아리도 다시 보낸다 — 보는 사람마다 목록이 달라진다 (server/view.ts)
        if (rest.extraVisibility) {
          const orgs = db().organizations.filter((o) => o.memberIds.includes(id) || o.followerIds.includes(id));
          if (orgs.length) return { users: [u], organizations: orgs };
        }
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
      /** 오늘의 질문 집계 — 같은 학교, 예시 프로필 제외(본인은 포함). DAILY_MIN_ANSWERS 미만이면 비율 없이 몇 명인지만 */
      dailyResults(viewerId: ID, questionId: string, date: string): DailyResults {
        const me = find(db().users, viewerId);
        if (!DAILY_QUESTIONS.some((q) => q.id === questionId) || !/^\d{4}-\d{2}-\d{2}$/.test(String(date))) throw new Error(t('입력값을 확인해주세요.'));
        const school = schoolOf(me);
        const { total, counts } = school ? dailyTally(db().users, school, questionId, date, viewerId) : { total: 0, counts: {} };
        return { questionId, date, total, min: DAILY_MIN_ANSWERS, counts: total >= DAILY_MIN_ANSWERS ? counts : null, patch: {} };
      },
    },

    activities: {
      create(hostId: ID, input: ActivityInput): { activity: Activity; patch: Patch } {
        // Lumi+ 한도 (플래그가 켜졌을 때만 — 꺼져 있으면 지금처럼 제한 없음). 행사에 같이 가기 자동 모임은 세지 않는다
        if (!input.listingCrew && !input.orgId) {
          const host = db().users.find((u) => u.id === hostId);
          const enabled = ctx.plusEnabled?.() ?? false;
          const lim = limitsFor(host, enabled);
          if (lim.upcomingMeetups !== null && upcomingHosted(db().activities, hostId, campusToday()) >= lim.upcomingMeetups) throw new Error(meetupLimitReason(lim, hasPlus(host)));
        }
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
      toggleInterest(activityId: ID, userId: ID): Patch {
        const a = find(db().activities, activityId);
        const ids = a.interestedIds ?? [];
        a.interestedIds = ids.includes(userId) ? ids.filter((i) => i !== userId) : [...ids, userId];
        return { activities: [a] };
      },
      join(activityId: ID, userId: ID, message?: string): Patch {
        const activity = find(db().activities, activityId);
        const existing = db().participations.find((p) => p.activityId === activityId && p.userId === userId && p.status !== 'cancelled' && p.status !== 'rejected');
        if (existing) return { participations: [existing] };
        const approvedCount = db().participations.filter((p) => p.activityId === activityId && p.status === 'approved').length;
        canJoin(activity, userId);
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
      /** 자리가 찼으면 대기 명단에 (S046 Join Waitlist), 자리가 있으면 join 과 같다 */
      joinWaitlist(activityId: ID, userId: ID): Patch {
        const activity = find(db().activities, activityId);
        const existing = db().participations.find((p) => p.activityId === activityId && p.userId === userId && p.status !== 'cancelled' && p.status !== 'rejected');
        if (existing) return { participations: [existing] };
        canJoin(activity, userId);
        if (!isFull(activity, db().participations)) return api.activities.join(activityId, userId);
        const p: Participation = { id: uid('p'), activityId, userId, status: 'waitlisted', createdAt: now() };
        db().participations.push(p);
        return { participations: [p] };
      },
      cancel(activityId: ID, userId: ID): Patch {
        const p = db().participations.find((x) => x.activityId === activityId && x.userId === userId && (x.status === 'approved' || x.status === 'pending' || x.status === 'waitlisted'));
        if (!p) return {};
        const wasIn = p.status === 'approved';
        p.status = 'cancelled';
        const room = db().chatRooms.find((r) => r.activityId === activityId);
        if (room) room.memberIds = room.memberIds.filter((m) => m !== userId);
        const out: Patch = { participations: [p], chatRooms: room ? [room] : [] };
        // 자리가 났다 — 대기 명단 맨 앞 사람이 올라간다 (바로 참가 모임은 참가, 승인제는 주최자에게 요청으로)
        const activity = db().activities.find((a) => a.id === activityId);
        const next = activity && wasIn ? waitlistOf(db().participations, activityId)[0] : undefined;
        if (!activity || !next || isFull(activity, db().participations)) return out;
        if (activity.joinPolicy === 'open') return mergePatch(out, approveParticipation(next));
        next.status = 'pending';
        const who = db().users.find((u) => u.id === next.userId);
        const nts = [notify(activity.hostId, { type: 'participation_request', title: t('참가 요청'), body: `${who?.nickname ?? ''}${t('님이 "')}${activity.title}${t('"에 참가를 신청했어요.')}`, link: `/activities/${activity.id}/manage` })];
        return mergePatch(out, { participations: [next], notifications: nts });
      },
      /** 승인은 정원을 넘지 못한다 (S048 "Approval cannot exceed capacity") — 요청·대기 명단 모두 */
      approve(participationId: ID): Patch {
        const p = find(db().participations, participationId);
        const activity = find(db().activities, p.activityId);
        if (p.status !== 'approved' && isFull(activity, db().participations)) throw new Error(t('모집 인원이 모두 찼어요.'));
        return approveParticipation(p);
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
        return { relationships: r, organizations: orgs, notifications: nts, ...(targetType === 'user' ? { users: pair(fromId, toId) } : {}) };
      },
      sendFriendRequest(fromId: ID, toId: ID): Patch {
        const r = db().relationships;
        if (isBlocked(db(), fromId, toId)) throw new Error(t('차단된 사용자예요.'));
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
        return { relationships: r, users: pair(a, b) };
      },
      block(fromId: ID, toId: ID): Patch {
        const r = db().relationships;
        if (!r.blocks.some((b) => b.fromId === fromId && b.toId === toId)) r.blocks.push({ fromId, toId });
        const k = pairKey(fromId, toId);
        r.friends = r.friends.filter((f) => pairKey(f.a, f.b) !== k);
        r.follows = r.follows.filter((f) => !(f.fromId === fromId && f.toId === toId) && !(f.fromId === toId && f.toId === fromId));
        r.likes = r.likes.filter((l) => !(l.fromId === fromId && l.toId === toId) && !(l.fromId === toId && l.toId === fromId));
        r.friendRequests = r.friendRequests.filter((q) => pairKey(q.fromId, q.toId) !== k);
        return { relationships: r, users: pair(fromId, toId) };
      },
      unblock(fromId: ID, toId: ID): Patch {
        const r = db().relationships;
        r.blocks = r.blocks.filter((b) => !(b.fromId === fromId && b.toId === toId));
        return { relationships: r, users: pair(fromId, toId) };
      },
    },

    orgs: {
      /**
       * 가입 요청 (2026-11-06 사장님: 모든 동아리에 "Ask to join") — 학생이 동의 문구("운영진이 이름·학년·전공을 보고 메시지를 보낼 수 있어요")를
       * 보고 누른 것만 받는다 (consent). 운영진이 Lumi에 있으면 바로 전해지고(알림 → S091), 없으면 저장해 두었다가 동아리 이메일이 가거나
       * 운영진이 오면 전해진다 (@core/lib/clubjoin). 열린 그룹은 바로 회원. 학생회·학교 부서는 가입하는 곳이 아니다
       */
      apply(orgId: ID, userId: ID, consent?: unknown): Patch {
        const org = find(db().organizations, orgId);
        const state = orgJoinState(org, userId);
        if (state.kind === 'admin' || state.kind === 'member' || state.kind === 'applied') return { organizations: [org] };
        if (state.kind === 'follow') throw new Error(t('가입하는 곳이 아니에요. 팔로우하면 새 소식을 받아요.'));
        const who = find(db().users, userId);
        // 열린 그룹 (S026 Join policy: Anyone can join) — 바로 회원, 운영진에게는 알림만
        if (state.kind === 'join') {
          org.memberIds.push(userId);
          const nts = org.adminIds.filter((a) => a !== userId).map((a) => notify(a, { type: 'follow', title: t('새 회원'), body: `${who.nickname} · ${org.name}`, link: `/orgs/${org.id}?tab=members` }));
          return { organizations: [org], notifications: nts };
        }
        if (consent !== true && consent !== CONSENT_VERSION) throw new Error(t('운영진에게 보일 정보를 확인하고 다시 눌러주세요.'));
        const at = now();
        // 나를 차단했거나 내가 차단한 운영진에게는 가지 않는다
        const organizers = org.adminIds.filter((a) => a !== userId && !isBlocked(db(), a, userId));
        org.applicantIds.push(userId);
        const req: JoinRequest = { userId, askedAt: at, consent: CONSENT_VERSION, ...(organizers.length ? { deliveredAt: at, deliveredVia: 'organizers' as const } : {}) };
        org.joinRequests = [...(org.joinRequests ?? []).filter((r) => r.userId !== userId), req];
        const nts = organizers.map((a) => notify(a, { type: 'participation_request', title: t('가입 요청'), body: `${who.nickname} · ${org.name}`, link: `/orgs/${org.id}/requests` }));
        return { organizations: [org], notifications: nts };
      },
      /** 가입 요청 거두기 — 기록(동의)도 지운다. 그 뒤로 이 동아리 운영진은 메시지를 보낼 수 없다 */
      withdraw(orgId: ID, userId: ID): Patch {
        const org = find(db().organizations, orgId);
        org.applicantIds = org.applicantIds.filter((a) => a !== userId);
        org.joinRequests = (org.joinRequests ?? []).filter((r) => r.userId !== userId);
        return { organizations: [org] };
      },
      /**
       * 운영진이 동아리 이름으로 요청한 학생에게 메시지 (S091) — 1:1 대화방을 그대로 쓴다 (새 채팅을 만들지 않는다).
       * 동의하고 요청한 학생(요청을 거두거나 거절되면 끝), 서로 차단하지 않은 사람에게만. 여러 명이면 각자의 1:1 대화방으로 나눠 보낸다.
       * 한 명에게 보낼 때 막히면 그 이유를 던지고, 여럿이면 보낸 수와 건너뛴 수를 돌려준다
       */
      messageRequesters(orgId: ID, organizerId: ID, studentIds: ID[], text: string): { patch: Patch; sent: number; skipped: number } {
        const org = find(db().organizations, orgId);
        if (!org.adminIds.includes(organizerId)) throw new Error(t('권한이 없어요.'));
        const body = String(text ?? '').trim();
        if (!body) throw new Error(t('메시지를 적어주세요.'));
        if (body.length > ORG_MESSAGE_MAX) throw new Error(t('메시지가 너무 길어요.'));
        const ids = [...new Set((Array.isArray(studentIds) ? studentIds : []).map(String))];
        const reasonFor = (sid: ID): string | null => {
          if (sid === organizerId) return t('자기 자신에게는 보낼 수 없어요.');
          if (!requestOf(org, sid) || !(org.applicantIds.includes(sid) || org.memberIds.includes(sid))) return t('이 동아리에 가입을 요청한 학생에게만 보낼 수 있어요.');
          if (isBlocked(db(), organizerId, sid)) return t('차단된 사용자와는 대화할 수 없어요.');
          if (!db().users.some((u) => u.id === sid)) return t('사용자를 찾을 수 없어요.');
          return null;
        };
        if (ids.length === 1) { const why = reasonFor(ids[0]); if (why) throw new Error(why); }
        const rooms: ChatRoom[] = [];
        let skipped = 0;
        for (const sid of ids) {
          if (reasonFor(sid)) { skipped++; continue; }
          const room = ensureDirectRoom(organizerId, sid);
          room.messages.push({ id: uid('m'), senderId: organizerId, text: body, createdAt: now(), asOrg: { id: org.id, name: org.name } });
          room.lastReadAt[organizerId] = now();
          rooms.push(room);
        }
        return { patch: { chatRooms: rooms }, sent: rooms.length, skipped };
      },
      /**
       * 서버 전용 (RPC 규칙에 없다) — 동아리 공식 이메일로 확인된 사람이 운영진이 된다 (server/clubs.ts). 저장돼 있던 요청이 이 순간 전해지고
       * 기다리던 학생마다 "We told {club} you want to join" 알림
       */
      claim(orgId: ID, userId: ID): Patch {
        const org = find(db().organizations, orgId);
        if (!org.adminIds.includes(userId)) org.adminIds.push(userId);
        if (!org.memberIds.includes(userId)) org.memberIds.push(userId);
        org.applicantIds = org.applicantIds.filter((a) => a !== userId);
        org.joinRequests = (org.joinRequests ?? []).filter((r) => r.userId !== userId);
        const told = deliverSaved(org, 'organizers', now());
        return { organizations: [org], notifications: told.map((sid) => toldNote(org, sid)) };
      },
      /** 서버 전용 — 안내 메일이 실제로 동아리 주소로 나갔다. 그 메일이 센 요청(until 까지)만 전해진 것으로 바꾸고 알린다 */
      markEmailed(orgId: ID, until: string): Patch {
        const org = find(db().organizations, orgId);
        const told = deliverSaved(org, 'email', now(), until);
        return told.length ? { organizations: [org], notifications: told.map((sid) => toldNote(org, sid)) } : {};
      },
      /**
       * 서버 전용 — 운영진이 /club-setup 에서 적은 가입 방법을 동아리 페이지에 올린다. 처음 올리거나 링크·설명회가 바뀌면
       * 기다리는 학생 모두에게 "{club} posted how to join" (동아리 페이지로)
       */
      setHowToJoin(orgId: ID, info: HowToJoin): Patch {
        const org = find(db().organizations, orgId);
        const before = org.howToJoin;
        org.howToJoin = info;
        const changed = !before || before.signupUrl !== info.signupUrl || JSON.stringify(before.next ?? null) !== JSON.stringify(info.next ?? null) || before.who !== info.who;
        const nts = changed ? org.applicantIds.filter((sid) => !org.adminIds.includes(sid)).map((sid) => notify(sid, { type: 'org_event', title: t('{club} 가입 방법을 올렸어요').replace('{club}', org.name), body: t('동아리 페이지에서 확인하세요.'), link: `/orgs/${org.id}` })) : [];
        return { organizations: [org], notifications: nts };
      },
      /** 서버 전용 — 운영진이 올린 진짜 로고·표지 사진 (null 이면 지운다). 사진이 없으면 화면은 자리도 그리지 않는다 */
      setImage(orgId: ID, kind: 'logo' | 'cover', url: string | null): Patch {
        const org = find(db().organizations, orgId);
        if (kind === 'logo') org.logo = { ...org.logo, url: url ?? undefined };
        else if (url) org.cover = { url }; else delete org.cover;
        if (kind === 'logo' && !url) delete org.logo.url;
        return { organizations: [org] };
      },
      /**
       * 그룹 만들기 (S026) — 학교를 인증한 학생만, 그 학교 안에. 만든 사람이 운영진·회원이 된다.
       * 같은 학교에 같은 이름의 단체가 있으면 만들지 않는다 (학교 공식 동아리와 헷갈리지 않게). 한 사람당 개수는 @core/lib/plus PLAN_LIMITS
       */
      create(creatorId: ID, input: OrgInput): { org: Organization; patch: Patch } {
        const me = find(db().users, creatorId);
        if (me.affiliation.type !== 'university' || !me.affiliation.schoolId) throw new Error(t('학교를 인증한 학생만 그룹을 만들 수 있어요.'));
        const schoolId = me.affiliation.schoolId;
        const name = String(input?.name ?? '').replace(/\s+/g, ' ').trim();
        const description = String(input?.description ?? '').trim();
        if (name.length < 3 || name.length > 60) throw new Error(t('그룹 이름은 3–60자로 적어주세요.'));
        if (description.length > 500) throw new Error(t('소개는 500자까지예요.'));
        if (!['club', 'lab', 'coop', 'council'].includes(input?.type)) throw new Error(t('그룹 종류를 골라주세요.'));
        if (input?.joinPolicy !== 'open' && input?.joinPolicy !== 'approval') throw new Error(t('가입 방식을 골라주세요.'));
        const key = (x: string) => x.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '');
        if (db().organizations.some((o) => o.schoolId === schoolId && key(o.name) === key(name))) throw new Error(t('같은 이름의 단체가 이미 있어요. 그 페이지에서 팔로우하거나 다른 이름을 써주세요.'));
        // 한도는 @core/lib/plus 한 곳에서 (무료 = 지금 그대로 10개, Lumi+ 플래그가 켜지면 Lumi+ 는 더)
        { const enabled = ctx.plusEnabled?.() ?? false; const lim = limitsFor(me, enabled);
          if (db().organizations.filter((o) => o.createdBy === creatorId).length >= lim.groups) throw new Error(groupLimitReason(lim, enabled, hasPlus(me))); }
        const hue = [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
        const org: Organization = {
          id: uid('org'), name, logo: { emoji: initialsOf(name), hue }, type: input.type, schoolId, verified: false, description,
          gallery: [], regularActivities: [], notices: [], followerIds: [], memberIds: [creatorId], adminIds: [creatorId], applicantIds: [],
          joinPolicy: input.joinPolicy, createdBy: creatorId,
        };
        db().organizations.push(org);
        return { org, patch: { organizations: [org] } };
      },
      /**
       * 가입 요청에 답하기 (S091) — 운영진만 (서버 권한 + 여기서 한 번 더). 승인하면 회원이 되고 본인에게 알림,
       * 거절은 알리지 않는다 (친구 요청과 같다). 이미 처리된 요청이면 아무것도 하지 않는다
       */
      respondApplication(orgId: ID, userId: ID, accept: boolean): Patch {
        const org = find(db().organizations, orgId);
        if (!org.applicantIds.includes(userId)) return { organizations: [org] };
        org.applicantIds = org.applicantIds.filter((a) => a !== userId);
        // 거절하면 요청 기록(동의)도 지운다 — 운영진이 계속 메시지를 보낼 수 없게. 승인하면 회원으로 남고 기록도 남는다
        if (!accept) { org.joinRequests = (org.joinRequests ?? []).filter((r) => r.userId !== userId); return { organizations: [org] }; }
        if (!org.memberIds.includes(userId)) org.memberIds.push(userId);
        const nt = notify(userId, { type: 'participation_approved', title: t('가입 승인'), body: `${org.name}${t('의 회원이 됐어요.')}`, link: `/orgs/${org.id}` });
        return { organizations: [org], notifications: [nt] };
      },
      /**
       * 그룹 나가기 (S022 ··· / Members) — 회원·운영진이 스스로 나간다. 팔로우는 그대로 둔다 (소식은 계속 받는다).
       * 마지막 운영진은 나갈 수 없다 — 가입 요청에 답할 사람이 없어진다. 이유를 사람이 읽을 문장으로 던진다
       */
      leave(orgId: ID, userId: ID): Patch {
        const org = find(db().organizations, orgId);
        const isAdmin = org.adminIds.includes(userId);
        if (!isAdmin && !org.memberIds.includes(userId)) return { organizations: [org] };
        if (isAdmin && !org.adminIds.some((a) => a !== userId)) throw new Error(t('이 그룹의 운영진은 나 혼자예요. 그룹에는 운영진이 한 명은 있어야 해서 지금은 나갈 수 없어요.'));
        org.adminIds = org.adminIds.filter((a) => a !== userId);
        org.memberIds = org.memberIds.filter((m) => m !== userId);
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

      /**
       * 같이 가기 — 한 번 누르면: 이 행사에 연결된 같이 가기 모임이 있으면 들어가고, 없거나 다 찼으면 새로 연다.
       * 만나는 시각은 행사 시작 몇 분 전, 장소는 행사 장소. 내 상태는 '갈 예정'. 이미 들어가 있으면 그 모임을 그대로 돌려준다 (두 번 눌러도 하나).
       * 볼 수 없는 모임(공개 범위·차단)에는 들어가지 않는다.
       */
      goTogether(opportunityId: ID, userId: ID): GoTogetherResult {
        const o = find(db().opportunities, opportunityId);
        const me = find(db().users, userId);
        if (!canGoTogether(o)) throw new Error(t('같이 가기는 날짜와 시간이 정해진 행사에서만 열 수 있어요.'));
        if (o.schoolId && o.schoolId !== schoolOf(me)) throw new Error(t('다른 학교 행사예요.'));
        const crews = crewsFor(db(), me, o.id, 'go').filter((a) => a.date >= campusToday());
        let a = crews.find((x) => crewMembers(db(), x).includes(userId));
        let patch: Patch = {};
        let created = false;
        if (!a) {
          const open = crews.filter((x) => x.joinPolicy === 'open' && db().participations.filter((p) => p.activityId === x.id && p.status === 'approved').length < x.capacity)
            .sort((x, y) => x.createdAt.localeCompare(y.createdAt))[0];
          if (open) {
            a = open;
            patch = api.activities.join(open.id, userId);
          } else {
            const date = campusDate(o.date!);
            const freeFood = o.tags.some((tg) => tg.toLowerCase() === 'free food');
            const r = api.activities.create(userId, {
              kind: 'group', category: freeFood ? 'meal' : 'school_event',
              title: `${t('같이 가요 · ')}${o.title}`.slice(0, 120),
              description: `${t('행사 시작 전에 만나서 같이 들어가요. 처음 가는 사람도 환영이에요.')}`,
              cover: { emoji: '🙋', hue: o.cover?.hue ?? 200 },
              date, startTime: meetTimeFor(o.startTime!), endTime: o.startTime!,
              place: o.place ?? { name: o.location || t('장소 미정'), lat: 0, lng: 0 },
              capacity: MEETUP_CAPACITY, fee: 0, joinPolicy: 'open',
              visibility: schoolOf(me) ? 'school' : 'public',
              opportunityId: o.id, listingCrew: 'go',
            });
            a = r.activity; patch = r.patch; created = true;
          }
        }
        patch = mergePatch(patch, api.opportunities.setIntent(o.id, userId, 'going'));
        const room = ensureActivityRoom(a);
        patch = mergePatch(patch, { activities: [a], chatRooms: [room] });
        return { activity: a, created, roomId: room.id, patch };
      },

      /** 같이 가기 → 아마도: 모임에서 빠지고 상태는 '관심'. 주최자가 빠지면 다음 사람에게 넘기고, 혼자였으면 모임을 닫는다 */
      leaveTogether(opportunityId: ID, userId: ID): Patch {
        find(db().opportunities, opportunityId);
        let patch: Patch = {};
        for (const a of db().activities.filter((x) => x.opportunityId === opportunityId && x.listingCrew === 'go')) {
          if (a.hostId === userId) {
            const next = db().participations.filter((p) => p.activityId === a.id && p.status === 'approved' && p.userId !== userId).sort((x, y) => x.createdAt.localeCompare(y.createdAt))[0];
            if (!next) { patch = mergePatch(patch, api.activities.remove(a.id)); continue; }
            a.hostId = next.userId;
            next.status = 'cancelled'; // 주최자는 참가 기록 없이 모임에 있다
            const room = db().chatRooms.find((r) => r.type === 'activity' && r.activityId === a.id);
            if (room) room.memberIds = room.memberIds.filter((m) => m !== userId);
            patch = mergePatch(patch, { activities: [a], participations: [next], chatRooms: room ? [room] : [] });
          } else if (db().participations.some((p) => p.activityId === a.id && p.userId === userId && (p.status === 'approved' || p.status === 'pending'))) {
            patch = mergePatch(patch, api.activities.cancel(a.id, userId));
          }
        }
        const mine = db().opportunityIntents.find((i) => i.opportunityId === opportunityId && i.userId === userId);
        if (!mine || mine.intent !== 'interested') patch = mergePatch(patch, api.opportunities.setIntent(opportunityId, userId, 'interested'));
        return patch;
      },

      /** 팀원 찾기 목록에 나를 올린다 — intent team + 이 공고에서 찾는 역할 (최대 4개, Role 값만) */
      lookForTeam(opportunityId: ID, userId: ID, roles: Role[]): Patch {
        find(db().opportunities, opportunityId);
        find(db().users, userId);
        const list = Array.isArray(roles) ? roles : [];
        if (list.length > 4 || list.some((r) => typeof r !== 'string' || !(r in PERSON_ROLE_LABELS))) throw new Error(t('입력값을 확인해주세요.'));
        const patch = api.opportunities.setIntent(opportunityId, userId, 'team');
        const rec = db().opportunityIntents.find((i) => i.opportunityId === opportunityId && i.userId === userId)!;
        rec.roles = [...new Set(list)];
        return mergePatch(patch, { opportunityIntents: [rec] });
      },
    },

    proposals: {
      create(fromId: ID, toId: ID, input: Pick<ActivityProposal, 'category' | 'message' | 'when'>): Patch {
        if (fromId === toId || isBlocked(db(), fromId, toId)) throw new Error(t('차단된 사용자예요.'));
        const dup = db().proposals.find((x) => x.fromId === fromId && x.toId === toId && x.status === 'pending' && x.expiresAt > now());
        if (dup) return { proposals: [dup] };
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
        // 장소 후보 (S033) · 한 주 격자 (S032) — 있을 때만 붙인다
        const places = pollPlaceNames(input.placeOptions);
        if (places.length) { poll.placeOptions = places.map((name) => ({ id: uid('pl'), name })); poll.placeVotes = {}; }
        if (input.window) {
          const w = input.window;
          if (!/^\d{4}-\d{2}-\d{2}$/.test(String(w.weekStart)) || ![30, 60, 90, 120].includes(Number(w.minutes)) || poll.options.length > POLL_MAX_GRID_OPTIONS) throw new Error(t('입력값을 확인해주세요.'));
          poll.window = { weekStart: w.weekStart, minutes: Number(w.minutes) };
        }
        // 주최자는 모든 옵션에 가능한 것으로 시작 — 한 주 격자는 주최자도 자기 칸을 직접 고른다 (모두 켜 두면 모든 칸에 한 표씩 얹힌다)
        poll.votes[hostId] = poll.window ? [] : poll.options.map((o) => o.id);
        db().timePolls.unshift(poll);
        const nts = input.inviteeIds.map((u) => notify(u, { type: 'plan_vote', title: t('언제 만날지 골라주세요'), body: `${host.nickname}${t('님이 "')}${poll.title}${t('" 시간을 정하고 있어요.')}`, link: `/together/${poll.id}` }));
        // 데모: 초대받은 예시 사용자는 잠시 후 자기 시간표의 공강과 겹치는 시간에 자동 투표
        if (ctx.demo) input.inviteeIds.forEach((inviteeId, i) => later(3500 + i * 1800, () => {
          if (poll.status !== 'open' || poll.votes[inviteeId]) return;
          const u = db().users.find((x) => x.id === inviteeId); if (!u) return;
          const ok = poll.options.filter((o) => {
            if (!u.timetable?.length) return Math.random() < 0.6;
            const day = jsDayToIdx(new Date(`${o.date}T12:00:00`).getDay());
            return freeBlocks(u.timetable, day).some((b) => b.start <= toMin(o.startTime) && b.end >= toMin(o.endTime));
          }).map((o) => o.id);
          poll.votes[inviteeId] = ok.length ? ok : [poll.options[0].id];
          ctx.push({ timePolls: [poll] });
        }));
        return { poll, patch: { timePolls: [poll], notifications: nts } };
      },
      vote(pollId: ID, userId: ID, optionIds: ID[]): Patch {
        const p = find(db().timePolls, pollId);
        // 주최자·초대받은 사람만, 이 투표의 칸만 (예전에는 아무 id 나 받았다)
        if (p.hostId !== userId && !p.inviteeIds.includes(userId)) throw new Error(t('초대받은 사람만 볼 수 있어요'));
        const known = new Set(p.options.map((o) => o.id));
        p.votes[userId] = [...new Set((Array.isArray(optionIds) ? optionIds : []).filter((x) => known.has(x)))];
        return { timePolls: [p] };
      },
      votePlace(pollId: ID, userId: ID, placeIds: ID[]): Patch {
        const p = find(db().timePolls, pollId);
        if (p.hostId !== userId && !p.inviteeIds.includes(userId)) throw new Error(t('초대받은 사람만 볼 수 있어요'));
        if (p.status !== 'open' || !p.placeOptions?.length) throw new Error(t('입력값을 확인해주세요.'));
        const known = new Set(p.placeOptions.map((o) => o.id));
        p.placeVotes = { ...(p.placeVotes ?? {}), [userId]: [...new Set((Array.isArray(placeIds) ? placeIds : []).filter((x) => known.has(x)))] };
        return { timePolls: [p] };
      },
      addOption(pollId: ID, userId: ID, option: Omit<TimeOption, 'id'>): Patch {
        const p = find(db().timePolls, pollId);
        const o = { ...option, id: uid('to') };
        p.options.push(o);
        p.votes[userId] = [...new Set([...(p.votes[userId] ?? []), o.id])];
        return { timePolls: [p] };
      },
      decide(pollId: ID, optionId: ID, placeId?: ID): { activity: Activity; patch: Patch } {
        const p = find(db().timePolls, pollId);
        const opt = p.options.find((o) => o.id === optionId);
        if (!opt) throw new Error(t('항목을 찾을 수 없어요.'));
        if (p.status !== 'open') throw new Error(t('입력값을 확인해주세요.'));
        const chosenPlace = placeId ? p.placeOptions?.find((x) => x.id === placeId) : undefined;
        if (placeId && !chosenPlace) throw new Error(t('항목을 찾을 수 없어요.'));
        const goers = [...new Set([p.hostId, ...Object.entries(p.votes).filter(([, ids]) => ids.includes(optionId)).map(([u]) => u)])];
        const host = find(db().users, p.hostId);
        const activity: Activity = {
          id: uid('a'), kind: 'group', category: p.category, title: p.title, description: `${t('Plan Together로 정한 약속이에요. ')}${goers.length}${t('명이 이 시간에 가능하다고 했어요.')}`,
          cover: { emoji: CATEGORY_EMOJI[p.category], hue: 200 },
          hostId: p.hostId, hostType: 'user', date: opt.date, startTime: opt.startTime, endTime: opt.endTime,
          place: chosenPlace ? { name: chosenPlace.name, lat: 0, lng: 0 } : p.place ?? { name: t('장소 미정'), lat: 0, lng: 0 }, capacity: Math.max(goers.length, p.inviteeIds.length + 1), visibility: 'selected', visibilityTargets: [...p.inviteeIds],
          joinPolicy: 'invite', fee: 0, invitedIds: [...p.inviteeIds], comments: [], createdAt: now(),
        };
        db().activities.unshift(activity);
        const room = ensureActivityRoom(activity);
        const parts: Participation[] = goers.filter((g) => g !== p.hostId).map((userId) => {
          const pt: Participation = { id: uid('p'), activityId: activity.id, userId, status: 'approved', createdAt: now() };
          db().participations.push(pt); addToRoom(room, userId); return pt;
        });
        p.status = 'decided'; p.decidedOptionId = optionId; p.activityId = activity.id;
        if (chosenPlace) p.decidedPlaceId = chosenPlace.id;
        const nts = goers.filter((g) => g !== p.hostId).map((g) => notify(g, { type: 'plan_decided', title: t('약속 시간이 정해졌어요'), body: `${host.nickname}${t('님이 "')}${p.title}${t('" 시간을 확정했어요. 그룹 채팅방이 열렸어요.')}`, link: `/activities/${activity.id}` }));
        return { activity, patch: { timePolls: [p], activities: [activity], participations: parts, chatRooms: [room], notifications: nts } };
      },
      cancel(pollId: ID): Patch {
        const p = find(db().timePolls, pollId); p.status = 'cancelled'; return { timePolls: [p] };
      },
    },

    games: {
      send(fromId: ID, toId: ID, input: GameInput): { game: Game; patch: Patch } {
        const check = canSendGame(db(), fromId, toId);
        if (!check.ok) throw new Error(check.reason);
        const me = find(db().users, fromId);
        const target = find(db().users, toId);
        const kind = input?.kind as GameKind;
        if (!GAME_LABELS[kind]) throw new Error(t('입력값을 확인해주세요.'));
        // 남용 방지
        const hourAgo = Date.now() - 3600000;
        if (games().filter((g) => g.fromId === fromId && Date.parse(g.createdAt) > hourAgo).length >= GAME_LIMITS.perHour) throw new Error(t('게임을 너무 많이 보냈어요. 잠시 후 다시 시도해주세요.'));
        if (games().filter((g) => g.fromId === fromId && g.toId === toId && g.status === 'pending').length >= GAME_LIMITS.pendingPerPair) throw new Error(t('상대가 아직 답하지 않은 게임이 있어요.'));
        // 게임 2~5는 상대가 프로필에 적어 둔 항목으로 한다 — 볼 수 없는 항목이면 없는 것과 같다
        if (kind !== 'this_or_that' && !canViewField(db(), me, target, 'prompts')) throw new Error(t('이 사람과는 아직 이 게임을 할 수 없어요.'));
        const base = { id: uid('g'), fromId, toId, round: games().filter((g) => g.kind === kind && samePair(g, fromId, toId) && g.status !== 'declined').length + 1, createdAt: now() };
        const already = (pred: (g: Game) => boolean) => games().some((g) => g.fromId === fromId && g.toId === toId && g.kind === kind && g.status === 'done' && pred(g));
        const replay = t('이미 해 본 게임이에요. 상대가 새로 바꾸면 다시 할 수 있어요.');
        const unavailable = t('이 사람과는 아직 이 게임을 할 수 없어요.');
        let game: Game;
        switch (input.kind) {
          case 'this_or_that': {
            if (!pairById(input.pairId) || (input.choice !== 0 && input.choice !== 1)) throw new Error(t('입력값을 확인해주세요.'));
            game = { ...base, kind: 'this_or_that', status: 'pending', pairId: input.pairId, fromChoice: input.choice };
            break;
          }
          case 'guess_pick': {
            const q = guessQuestionById(input.questionId);
            const real = (target.pickAnswers ?? []).find((a) => a.questionId === input.questionId);
            // 정답은 반드시 상대가 저장한 답 — 없으면 게임을 열지 않는다
            if (!q || !real?.answer || !q.options.some((o) => o.key === real.answer)) throw new Error(unavailable);
            if (!q.options.some((o) => o.key === input.guess)) throw new Error(t('입력값을 확인해주세요.'));
            if (already((g) => g.kind === 'guess_pick' && g.questionId === q.id && g.answer === real.answer)) throw new Error(replay);
            game = { ...base, kind: 'guess_pick', status: 'done', questionId: q.id, guess: input.guess, answer: real.answer, result: guessPickResult(input.guess, real.answer) };
            break;
          }
          case 'hot_take': {
            const statement = target.hotTake?.text.trim();
            if (!statement) throw new Error(unavailable);
            if (input.reaction !== 'agree' && input.reaction !== 'nope') throw new Error(t('입력값을 확인해주세요.'));
            const note = typeof input.note === 'string' ? input.note.trim().slice(0, GAME_LIMITS.noteMax) : '';
            if (already((g) => g.kind === 'hot_take' && g.statement === statement)) throw new Error(replay);
            game = { ...base, kind: 'hot_take', status: 'done', statement, reaction: input.reaction, ...(note ? { note } : {}), result: input.reaction };
            break;
          }
          case 'two_truths': {
            const tt = target.twoTruths;
            if (!tt || tt.statements.length !== 3 || tt.lieIndex === undefined) throw new Error(unavailable);
            if (!Number.isInteger(input.guessIndex) || input.guessIndex < 0 || input.guessIndex > 2) throw new Error(t('입력값을 확인해주세요.'));
            if (already((g) => g.kind === 'two_truths' && g.statements.join('\n') === tt.statements.join('\n'))) throw new Error(replay);
            game = { ...base, kind: 'two_truths', status: 'done', statements: [...tt.statements], guessIndex: input.guessIndex, lieIndex: tt.lieIndex, result: twoTruthsResult(input.guessIndex, tt.lieIndex) };
            break;
          }
          case 'emoji_week': {
            const ew = target.emojiWeek;
            if (!ew?.emojis.length || !ew.meaning) throw new Error(unavailable);
            const guess = typeof input.guess === 'string' ? input.guess.trim().slice(0, GAME_LIMITS.guessMax) : '';
            if (!guess) throw new Error(t('입력값을 확인해주세요.'));
            if (already((g) => g.kind === 'emoji_week' && g.emojis.join('') === ew.emojis.join('') && g.meaning === ew.meaning)) throw new Error(replay);
            game = { ...base, kind: 'emoji_week', status: 'done', emojis: [...ew.emojis], guess, meaning: ew.meaning, result: 'revealed' };
            break;
          }
          default: throw new Error(t('입력값을 확인해주세요.'));
        }
        games().unshift(game);
        if (game.status === 'pending') {
          const nt = notify(toId, { type: 'game_received', title: t('게임이 도착했어요'), body: `${me.nickname}${t('님이 게임을 보냈어요: ')}${GAME_LABELS[game.kind]}`, link: `/users/${fromId}?game=${game.id}` });
          // 데모: 예시 사용자는 잠시 후 아무거나 골라 답한다
          if (target.sample) later(4500, () => {
            const g = games().find((x) => x.id === game.id);
            if (!g || g.status !== 'pending' || g.kind !== 'this_or_that') return;
            ctx.push(answerThisOrThat(g, Math.random() < 0.5 ? 0 : 1));
          });
          return { game, patch: { games: [game], notifications: [nt] } };
        }
        const room = resolveGame(game);
        // 프로필 주인에게 누가 어떻게 맞혔는지/반응했는지 알린다
        const nt = notify(toId, { type: 'game_result', title: `${me.nickname}${t('님이 내 게임을 했어요')}`, body: gameSummary(game, db().users), link: `/chats/${room.id}` });
        return { game, patch: { games: [game], chatRooms: [room], notifications: [nt] } };
      },
      answer(gameId: ID, userId: ID, choice: 0 | 1): { game: Game; patch: Patch } {
        const g = find(games(), gameId);
        if (g.toId !== userId) throw new Error(t('권한이 없어요.'));
        if (g.kind !== 'this_or_that' || g.status !== 'pending') throw new Error(t('이미 끝난 게임이에요.'));
        if (choice !== 0 && choice !== 1) throw new Error(t('입력값을 확인해주세요.'));
        // 보낸 뒤에 차단했으면 채팅방을 열지 않는다
        if (isBlocked(db(), userId, g.fromId)) throw new Error(t('차단된 사용자와는 대화할 수 없어요.'));
        const patch = answerThisOrThat(g, choice);
        return { game: g, patch };
      },
      decline(gameId: ID, userId: ID): Patch {
        const g = find(games(), gameId);
        if (g.toId !== userId) throw new Error(t('권한이 없어요.'));
        if (g.status !== 'pending') return { games: [g] };
        g.status = 'declined';
        g.resolvedAt = now();
        return { games: [g] };
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
        if (!room.memberIds.includes(userId)) throw new Error(t('이 채팅방의 멤버가 아니에요.'));
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
  return api;
}

export type Engine = ReturnType<typeof createEngine>;
