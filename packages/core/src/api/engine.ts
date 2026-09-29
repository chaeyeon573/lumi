/**
 * AroundU 도메인 엔진 — 브라우저(mock, localStorage)와 서버(Postgres)가 같은 로직을 공유한다.
 *
 * 스냅샷 모양의 in-memory DB(`ctx.db`)를 직접 변경하고, 바뀐 엔티티만 담은 Patch를 돌려준다.
 * 저장(localStorage / DB 영속화), 지연, 세션, 인증은 호출하는 쪽의 책임이다.
 */
import { FREE_SWIPES_PER_DAY } from '@core/lib/monetization';
import { todayISO as todayISO_ } from '@core/lib/format';
import type { Patch, Snapshot, RegisterInput, ActivityInput, PostInput, OpportunityInput, TimePollInput, GroupInput, NetworkRequestInput } from './types';
import type {
  Activity, ActivityProposal, Availability, ChatRoom, ID, Notification, OpportunityIntent, Participation, Post, User, Opportunity, TimePoll, TimeOption, ReportTargetType, Plan, Stage, Career, BoostTier,
  Wants, VerificationMethod, PeopleSearch, SavedSearch, Organization, NetworkRequest, RequestResponse, RequestReferral, StatusKind, StatusWhen, UserStatus, PrivacySettings, Trip, IntroRequest, ShareField, Research, FriendNote, Relationships, LifeUpdate } from '@core/types';
import { STAGE_ROLE } from '@core/types';
import { freeBlocks, jsDayToIdx, toMin } from '@core/lib/timetable';
import { uid, pairKey } from '@core/lib/format';
import { CATEGORY_LABELS } from '@core/lib/labels';
import { canMessage } from '@core/lib/relations';
import { searchPeople } from '@core/lib/people';
import { openToFromWants } from '@core/lib/wants';
import { makeStatus } from '@core/lib/status';
import { containsContact } from '@core/lib/privacy';
import { FREE_OPEN_REQUESTS, PLUS_OPEN_REQUESTS } from '@core/lib/monetization';
import { audienceForRequest, matchesForRequest, relevanceToRequest, referralCandidates } from '@core/lib/requests';

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
/** 데모: 네트워크 요청에 잠시 후 '저예요' 로 응답하거나 지인을 추천하는 사람 */
const AUTO_REQUEST_RESPONDERS = ['u_taeho', 'u_b_snu2', 'u_a_seoul_ai', 'u_a_sf_ai', 'u_b_stan2', 'u_jimin'];
const AUTO_REQUEST_REFERRERS = ['u_sua', 'u_junho', 'u_seoyeon'];

export const CATEGORY_EMOJI = { coffee: '☕', meal: '🍽️', study: '📖', exercise: '🏃', club: '🎸', performance: '🎤', school_event: '🎓', seminar: '🧪', networking: '🤝', store_deal: '🏷️', etc: '✨' } as const;
export const OPPORTUNITY_EMOJI = { event: '🎪', club: '🎸', lab: '🔬', internship: '💼', scholarship: '🎓', hackathon: '💡', startup: '🚀', activity: '☕', exchange: '✈️' } as const;

/** 도와줄 수 있어요 · 찾고 있어요 태그 — 공백 정리, 중복 제거, 20자 · 5개까지 */
function cleanTags(tags: string[]): string[] {
  const out: string[] = [];
  for (const x of tags) { const v = String(x ?? '').trim().slice(0, 20); if (v && !out.includes(v)) out.push(v); }
  return out.slice(0, 5);
}
/** 도시·회사가 바뀌면 새 소식을 남긴다 (최근 5개) */
function noteLifeChanges(u: User, before: { city?: string; company?: string }) {
  const at = new Date().toISOString();
  const add: LifeUpdate[] = [];
  if (u.homeCity && before.city && u.homeCity !== before.city) add.push({ kind: 'moved', value: u.homeCity, at });
  const co = u.career?.company?.trim();
  if (co && co !== before.company && !/창업|startup/i.test(co)) add.push({ kind: 'joined', value: co, at });
  if (add.length) u.updates = [...add, ...(u.updates ?? [])].slice(0, 5);
}

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
  const AUTO_ACCEPT_FRIEND_LIST = [...AUTO_ACCEPT_FRIEND];

  function introForward(it: IntroRequest, pass: boolean): Patch {
    it.status = pass ? 'passed' : 'forwarded';
    if (pass) return { introRequests: [it] }; // 넘기기 — 요청자에게 따로 알리지 않는다
    const from = find(db().users, it.fromId); const via = find(db().users, it.viaId);
    const nts = [notify(it.toId, { type: 'intro_forwarded', title: `${t('연결 제안')} · ${from.nickname}`, body: `${via.nickname}${t('님이 이어주고 싶어해요')}${it.note ? ` · "${it.note.slice(0, 50)}"` : ''}`, link: '/people/second?tab=asks' })];
    return { introRequests: [it], notifications: nts };
  }
  function introRespond(it: IntroRequest, accept: boolean): { roomId?: ID; patch: Patch } {
    it.status = accept ? 'accepted' : 'declined';
    if (!accept) return { patch: { introRequests: [it] } };
    const r = db().relationships;
    if (!r.friends.some((f) => pairKey(f.a, f.b) === pairKey(it.fromId, it.toId))) r.friends.push({ a: it.fromId, b: it.toId, since: now() });
    const room = ensureDirectRoom(it.fromId, it.toId);
    const via = find(db().users, it.viaId); const to = find(db().users, it.toId);
    room.messages.push({ id: uid('m'), senderId: it.viaId, text: `${via.nickname}${t('님이 이어줬어요')}`, createdAt: now(), system: true });
    const nts = [notify(it.fromId, { type: 'intro_accepted', title: `${to.nickname}${t('님과 대화가 열렸어요')}`, body: `${via.nickname}${t('님이 이어줬어요')}`, link: `/chats/${room.id}` })];
    return { roomId: room.id, patch: { introRequests: [it], relationships: r, chatRooms: [room], notifications: nts } };
  }

  /** "저예요" — 응답을 기록하고 요청자에게 알린다 (지인 추천을 거친 경우 viaId) */
  function engineRespond(req: NetworkRequest, userId: ID, note?: string, viaId?: ID): Patch {
    if (req.status !== 'open') throw new Error(t('마감된 요청이에요.'));
    const existing = req.responses.find((r) => r.userId === userId);
    if (existing) return { networkRequests: [req] };
    const res: RequestResponse = { id: uid('rr'), userId, note: note?.trim() || undefined, viaId, status: 'pending', createdAt: now() };
    req.responses.push(res);
    const who = find(db().users, userId);
    const { reasons } = relevanceToRequest(req, who);
    const nts = [notify(req.authorId, { type: 'request_response', title: `${who.nickname}${t('님이 손을 들었어요')}`, body: `${reasons[0] ?? req.text.slice(0, 40)}${viaId ? ` · ${find(db().users, viaId).nickname}${t('님 추천')}` : ''}`, link: `/people/requests/${req.id}` })];
    return { networkRequests: [req], notifications: nts };
  }
  /** "제가 아는 사람이 있어요" — 후보에게만 먼저 알린다. 요청자는 아직 후보를 볼 수 없다 */
  function engineRefer(req: NetworkRequest, referrerId: ID, candidateId: ID): Patch {
    if (req.status !== 'open') throw new Error(t('마감된 요청이에요.'));
    if (candidateId === req.authorId || req.referrals.some((r) => r.candidateId === candidateId) || req.responses.some((r) => r.userId === candidateId)) return { networkRequests: [req] };
    const ref: RequestReferral = { id: uid('rf'), referrerId, candidateId, status: 'pending', createdAt: now() };
    req.referrals.push(ref);
    const referrer = find(db().users, referrerId);
    const nts = [notify(candidateId, { type: 'request_referral', title: `${referrer.nickname}${t('님이 나를 떠올렸어요')}`, body: req.text.slice(0, 80), link: `/people/requests/${req.id}?referral=${ref.id}` })];
    // 데모: 추천받은 예시 사용자는 잠시 후 '관심 있어요'
    if (ctx.demo && AUTO_REQUEST_RESPONDERS.concat(AUTO_ACCEPT_FRIEND_LIST).includes(candidateId)) later(5000, () => { if (ref.status === 'pending' && req.status === 'open') { ref.status = 'interested'; ctx.push({ ...engineRespond(req, candidateId, undefined, referrerId) }); } });
    return { networkRequests: [req], notifications: nts };
  }


  /** 연결 요청 카운트 — 무료 플랜은 하루 FREE_SWIPES_PER_DAY 회. 어디서 보내든(추천·찾기·프로필) 같은 한도 */
  function recordConnect(id: ID) {
    const u = find(db().users, id);
    const today = todayISO_();
    const count = u.swipes?.date === today ? u.swipes.count : 0;
    if (u.plan !== 'plus' && count >= FREE_SWIPES_PER_DAY) throw new Error(`${t('오늘 연결 요청')} ${FREE_SWIPES_PER_DAY}${t('회를 다 썼어요. AroundU+에서 무제한으로.')}`);
    u.swipes = { date: today, count: count + 1 };
  }

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
      const verified = input.emailVerified || !!input.verification;
      const homeCity = input.homeCity?.trim() || school.region;
      const user: User = {
        id: uid('u'), nickname: input.nickname, birthYear: input.birthYear, gender: input.gender, avatar: input.avatar,
        identityVerified: false,
        affiliation: {
          type: 'university', schoolId: school.id, schoolName: school.name, role: input.role, department: input.department, year: input.year,
          emailVerified: verified, showSchool: input.showSchool, showDepartment: input.showDepartment,
        },
        bio: input.bio, likes: input.likes, freeTime: input.freeTime, height: input.height, availability: input.availability,
        interests: input.interests, purposes: input.purposes, preferredPartner: input.preferredPartner, region: homeCity,
        homeCity, activityCity: input.activityCity?.trim() || undefined, gradYear: input.gradYear,
        verification: input.verification ? { method: input.verification, at: now() } : verified ? { method: 'school_email', at: now() } : undefined,
        wants: input.wants,
        prompts: input.prompts, voicePrompt: input.voicePrompt, poll: input.poll, timetable: input.timetable ?? [],
        goals: input.goals, lookingFor: input.lookingFor ?? [], canOffer: input.canOffer ?? [], living: input.living, interestedOrgIds: [], meetPreference: input.meetPreference ?? [],
        fieldVisibility: input.fieldVisibility,
        settings: { messagePolicy: 'connected', notifications: input.notifications, locationPermission: input.locationPermission },
        stage: input.stage, openTo: input.openTo ?? (input.wants ? openToFromWants(input.wants) : undefined), career: input.career,
        research: (input.stage === 'masters' || input.stage === 'phd') && input.research?.field?.trim()
          ? { ...input.research, field: input.research.field.trim().slice(0, 40), showAdvisor: !!input.research.showAdvisor && !!input.research.advisor?.trim() } : undefined,
        createdAt: now(),
      };
      db().users.push(user);
      notify(user.id, { type: 'nearby_activity', title: t('AroundU에 오신 걸 환영해요'), body: t('사람 탭에서 지금 나와 관련 있는 사람을 먼저 만나보세요.'), link: '/people' });
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
        const before = { city: u.homeCity, company: u.career?.company };
        // id·생성일·새 소식은 직접 바꿀 수 없다
        const { id: _i, createdAt: _c, updates: _u, ...rest } = patch;
        Object.assign(u, rest);
        if (rest.helpWith) u.helpWith = cleanTags(rest.helpWith);
        if (rest.seeking) u.seeking = cleanTags(rest.seeking);
        noteLifeChanges(u, before);
        return { users: [u] };
      },
      /**
       * 계정 삭제 (앱스토어 필수) — 프로필 정보를 지우고 "탈퇴한 사용자"로 남긴다(대화 상대의 기록이 깨지지 않게).
       * 내 글·댓글·모임·참여·제안·저장한 검색·사람 찾기 요청·소개·관계는 모두 지운다.
       */
      deleteAccount(id: ID): Patch {
        const d = db();
        const u = find(d.users, id);
        const keep = { id: u.id, createdAt: u.createdAt, affiliation: u.affiliation, stage: u.stage };
        for (const k of Object.keys(u) as (keyof User)[]) delete (u as unknown as Record<string, unknown>)[k];
        Object.assign(u, keep, {
          nickname: t('탈퇴한 사용자'), birthYear: 2000, gender: 'private', avatar: { emoji: '👤', hue: 210, photoType: 'masked' },
          photos: [], bio: '', likes: '', freeTime: '', interests: [], prompts: [], timetable: [], goals: [], lookingFor: [], canOffer: [],
          purposes: [], fieldVisibility: {}, deleted: true, deletedAt: now(),
        });
        if (u.affiliation.type === 'university') u.affiliation = { ...u.affiliation, department: '', showDepartment: false };
        const patch: Patch = { users: [u], removed: {} };
        const rm = patch.removed!;
        const myActs = d.activities.filter((a) => a.hostId === id).map((a) => a.id);
        rm.activities = myActs;
        rm.participations = d.participations.filter((p) => p.userId === id || myActs.includes(p.activityId)).map((p) => p.id);
        rm.posts = d.posts.filter((p) => p.authorId === id).map((p) => p.id);
        rm.proposals = d.proposals.filter((p) => p.fromId === id || p.toId === id).map((p) => p.id);
        rm.opportunityIntents = d.opportunityIntents.filter((x) => x.userId === id).map((x) => x.id);
        rm.timePolls = d.timePolls.filter((x) => x.hostId === id).map((x) => x.id);
        rm.savedSearches = d.savedSearches.filter((x) => x.userId === id).map((x) => x.id);
        rm.networkRequests = d.networkRequests.filter((x) => x.authorId === id).map((x) => x.id);
        rm.introRequests = d.introRequests.filter((x) => x.fromId === id || x.viaId === id || x.toId === id).map((x) => x.id);
        const drop = <T extends { id: ID }>(xs: T[], ids: ID[] | undefined) => { const s = new Set(ids ?? []); for (let i = xs.length - 1; i >= 0; i--) if (s.has(xs[i].id)) xs.splice(i, 1); };
        drop(d.activities, rm.activities); drop(d.participations, rm.participations); drop(d.posts, rm.posts); drop(d.proposals, rm.proposals);
        drop(d.opportunityIntents, rm.opportunityIntents); drop(d.timePolls, rm.timePolls); drop(d.savedSearches, rm.savedSearches);
        drop(d.networkRequests, rm.networkRequests); drop(d.introRequests, rm.introRequests);
        // 남의 글에 단 댓글·반응
        const touched = d.posts.filter((p) => p.comments.some((c) => c.authorId === id) || p.likeIds.includes(id) || p.savedIds.includes(id));
        touched.forEach((p) => { p.comments = p.comments.filter((c) => c.authorId !== id); p.likeIds = p.likeIds.filter((x) => x !== id); p.savedIds = p.savedIds.filter((x) => x !== id); });
        if (touched.length) patch.posts = touched;
        // 그룹 멤버·팔로워
        const orgs = d.organizations.filter((o) => [o.memberIds, o.followerIds, o.adminIds, o.applicantIds].some((xs) => xs.includes(id)));
        orgs.forEach((o) => { o.memberIds = o.memberIds.filter((x) => x !== id); o.followerIds = o.followerIds.filter((x) => x !== id); o.adminIds = o.adminIds.filter((x) => x !== id); o.applicantIds = o.applicantIds.filter((x) => x !== id); });
        if (orgs.length) patch.organizations = orgs;
        // 관계 (차단은 상대가 한 것도 같이 정리)
        const r = d.relationships;
        r.likes = r.likes.filter((x) => x.fromId !== id && x.toId !== id);
        r.follows = r.follows.filter((x) => x.fromId !== id && x.toId !== id);
        r.friendRequests = r.friendRequests.filter((x) => x.fromId !== id && x.toId !== id);
        r.friends = r.friends.filter((x) => x.a !== id && x.b !== id);
        r.blocks = r.blocks.filter((x) => x.fromId !== id && x.toId !== id);
        patch.relationships = r;
        return patch;
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
      /** 연결 요청 1회 기록 — 무료 플랜은 하루 한도를 넘기면 거부 */
      recordSwipe(id: ID): Patch {
        recordConnect(id);
        return { users: [find(db().users, id)] };
      },
      /** 요금제 변경 (모의 결제 — 실제 과금 없음) */
      setPlan(id: ID, plan: Plan): Patch {
        const u = find(db().users, id);
        u.plan = plan;
        return { users: [u] };
      },
      /** 생애 단계 변경 — 졸업 전환은 온보딩을 다시 요구하지 않는다. 연결·글·그룹·학교 인증·활동 기록 모두 유지 */
      setStage(id: ID, stage: Stage, career?: Career, homeCity?: string, activityCity?: string): Patch {
        const u = find(db().users, id);
        const before = { city: u.homeCity, company: u.career?.company };
        u.stage = stage;
        if (u.affiliation.type === 'university') u.affiliation.role = STAGE_ROLE[stage];
        if (career) u.career = { ...u.career, ...career };
        if (homeCity?.trim()) { u.homeCity = homeCity.trim(); u.region = u.homeCity; }
        if (activityCity !== undefined) u.activityCity = activityCity.trim() || undefined;
        if ((stage === 'alumni' || stage === 'professional') && !homeCity && u.career?.city) { u.homeCity = u.career.city; u.region = u.career.city; }
        if (stage === 'alumni' || stage === 'professional') {
          if (!u.gradYear || u.gradYear > new Date().getFullYear()) u.gradYear = new Date().getFullYear();
          if (u.affiliation.type === 'university') u.affiliation.year = u.gradYear;
        }
        noteLifeChanges(u, before);
        return { users: [u] };
      },
      /** 대학원생 연구 정보 — 분야만 필수. 지도교수는 showAdvisor 를 켤 때만 다른 사람에게 보인다. null 이면 지운다 */
      setResearch(id: ID, research: Research | null): Patch {
        const u = find(db().users, id);
        if (!research) { u.research = undefined; return { users: [u] }; }
        const field = research.field?.trim();
        if (!field) throw new Error(t('연구 분야를 입력해주세요.'));
        const clean = (x?: string) => (x?.trim() ? x.trim().slice(0, 40) : undefined);
        u.research = { field: field.slice(0, 40), lab: clean(research.lab), advisor: clean(research.advisor), showAdvisor: !!research.showAdvisor && !!clean(research.advisor),
          year: research.year && research.year > 0 && research.year < 15 ? Math.round(research.year) : undefined,
          keywords: (research.keywords ?? []).map((k) => k.trim()).filter(Boolean).slice(0, 5) };
        return { users: [u] };
      },
      updateWants(id: ID, wants: Wants): Patch {
        const u = find(db().users, id);
        u.wants = { people: [...wants.people], activities: [...wants.activities] };
        u.openTo = openToFromWants(u.wants);
        return { users: [u] };
      },
      /** 학교 인증 완료 — 방법을 기록하고 emailVerified 를 켠다 (데모: 즉시) */
      verify(id: ID, method: VerificationMethod): Patch {
        const u = find(db().users, id);
        u.verification = { method, at: now() };
        if (u.affiliation.type === 'university') u.affiliation.emailVerified = true;
        return { users: [u] };
      },
      /** 저장 — 상대에게 알림 없음, 본인에게만 보인다 */
      toggleSavePerson(id: ID, targetId: ID): Patch {
        const u = find(db().users, id);
        const set = new Set(u.savedPeople ?? []);
        if (set.has(targetId)) set.delete(targetId); else set.add(targetId);
        u.savedPeople = [...set];
        return { users: [u] };
      },
      setStatus(id: ID, kind: StatusKind | null, when: StatusWhen = 'week'): Patch {
        const u = find(db().users, id);
        if (kind) u.status = makeStatus(kind, when); else delete u.status;
        return { users: [u] };
      },
      setOpenStatuses(id: ID, statuses: UserStatus[]): Patch {
        const u = find(db().users, id);
        u.openStatuses = statuses.map((x) => ({ ...x }));
        delete u.status; // 레거시 단일 상태는 Open To 로 합친다
        return { users: [u] };
      },
      setPrivacy(id: ID, privacy: PrivacySettings): Patch {
        const u = find(db().users, id); u.privacy = { ...privacy }; return { users: [u] };
      },
      setTrips(id: ID, trips: Trip[]): Patch {
        const u = find(db().users, id);
        u.trips = trips.filter((x) => x.city.trim() && x.from && x.to && x.from <= x.to).map((x) => ({ ...x, city: x.city.trim(), id: x.id || uid('tr') }));
        return { users: [u] };
      },
      hide(id: ID, kind: 'person' | 'activity', targetId: ID, unhide = false): Patch {
        const u = find(db().users, id);
        const key = kind === 'person' ? 'hiddenPeople' : 'hiddenActivities';
        const set = new Set(u[key] ?? []);
        if (unhide) set.delete(targetId); else set.add(targetId);
        u[key] = [...set];
        return { users: [u] };
      },
      pushRecentSearch(id: ID, q: string): Patch {
        const u = find(db().users, id); const v = q.trim();
        if (v) u.recentSearches = [v, ...(u.recentSearches ?? []).filter((x) => x !== v)].slice(0, 8);
        return { users: [u] };
      },
      createSavedList(id: ID, name: string): Patch {
        const u = find(db().users, id);
        if (!name.trim()) throw new Error(t('목록 이름을 적어주세요.'));
        u.savedLists = [...(u.savedLists ?? []), { id: uid('sl'), name: name.trim(), memberIds: [], notify: false }];
        return { users: [u] };
      },
      updateSavedList(id: ID, listId: ID, patch: { name?: string; notify?: boolean }): Patch {
        const u = find(db().users, id);
        u.savedLists = (u.savedLists ?? []).map((l) => (l.id === listId ? { ...l, ...(patch.name?.trim() ? { name: patch.name.trim() } : {}), ...(patch.notify !== undefined ? { notify: patch.notify } : {}) } : l));
        return { users: [u] };
      },
      deleteSavedList(id: ID, listId: ID): Patch {
        const u = find(db().users, id); u.savedLists = (u.savedLists ?? []).filter((l) => l.id !== listId); return { users: [u] };
      },
      moveSaved(id: ID, targetId: ID, listId: ID | null): Patch {
        const u = find(db().users, id);
        if (!(u.savedPeople ?? []).includes(targetId)) u.savedPeople = [...(u.savedPeople ?? []), targetId];
        u.savedLists = (u.savedLists ?? []).map((l) => ({ ...l, memberIds: l.id === listId ? [...new Set([...l.memberIds, targetId])] : l.memberIds.filter((m) => m !== targetId) }));
        return { users: [u] };
      },
    },

    /** 네트워크 요청 — 검색으로 잡히지 않는 사람까지 발견하는 장치. 프로필은 본인이 손 들기 전까지 요청자에게 공개되지 않는다 */
    requests: {
      create(authorId: ID, input: NetworkRequestInput): { request: NetworkRequest; matched: number; delivered: number; patch: Patch } {
        const author = find(db().users, authorId);
        if (!input.text.trim()) throw new Error(t('어떤 분을 찾는지 적어주세요.'));
        if (containsContact(input.text)) throw new Error(t('연락처(전화번호·이메일·메신저 ID)는 적을 수 없어요. 연결되면 대화에서 주고받아요.'));
        const open = db().networkRequests.filter((r) => r.authorId === authorId && r.status === 'open').length;
        const cap = author.plan === 'plus' ? PLUS_OPEN_REQUESTS : FREE_OPEN_REQUESTS;
        if (open >= cap) throw new Error(`${t('동시에 찾을 수 있는 건 ')}${cap}${t('개까지예요. 하나를 마치거나 AroundU+ 에서 늘릴 수 있어요.')}`);
        const req: NetworkRequest = {
          id: uid('nr'), authorId, text: input.text.trim(), city: input.city?.trim() || undefined, field: input.field?.trim() || undefined, interests: [...input.interests], reach: input.reach,
          status: 'open', dismissedIds: [], responses: [], referrals: [], createdAt: now(), expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
        };
        db().networkRequests.unshift(req);
        const audience = audienceForRequest(db(), req);
        const matched = matchesForRequest(db(), req).length;
        const nts = audience.slice(0, 30).map((a) => notify(a.userId, { type: 'request_received', title: t('혹시 여기에 해당되나요?'), body: `${req.text.slice(0, 60)} · ${author.nickname}${t('님')}`, link: `/people/requests/${req.id}` }));
        // 데모: 관련 있는 사람 1~2명이 잠시 후 손 들고, 1명은 지인을 추천한다
        if (ctx.demo) {
          const responders = audience.filter((a) => AUTO_REQUEST_RESPONDERS.includes(a.userId)).slice(0, 2);
          responders.forEach((a, i) => later(4000 + i * 2500, () => { if (req.status !== 'open' || req.responses.some((r) => r.userId === a.userId)) return; const who = find(db().users, a.userId); const line = [who.career?.role, who.career?.industry, who.career?.company].filter(Boolean).join(' · '); ctx.push(engineRespond(req, a.userId, line ? `${line} — ${t('이야기 나눠요!')}` : t('제가 도움이 될 것 같아요.'))); }));
          const referrer = audience.find((a) => AUTO_REQUEST_REFERRERS.includes(a.userId) && !responders.some((r) => r.userId === a.userId));
          if (referrer) later(9000, () => { if (req.status !== 'open') return; const cand = referralCandidates(db(), find(db().users, referrer.userId), req).find((c) => c.user.id !== authorId && c.score > 0); if (cand) ctx.push(engineRefer(req, referrer.userId, cand.user.id)); });
        }
        return { request: req, matched, delivered: audience.length, patch: { networkRequests: [req], notifications: nts } };
      },
      close(id: ID): Patch { const r = find(db().networkRequests, id); r.status = 'closed'; return { networkRequests: [r] }; },
      respond(requestId: ID, userId: ID, note?: string, matched?: string[], shared?: ShareField[]): Patch {
        const req = find(db().networkRequests, requestId);
        if (new Date(req.expiresAt).getTime() < Date.now()) throw new Error(t('마감된 요청이에요.'));
        if (req.responses.some((r) => r.userId === userId)) throw new Error(t('이미 손을 들었어요.'));
        if (note && containsContact(note)) throw new Error(t('연락처(전화번호·이메일·메신저 ID)는 적을 수 없어요. 연결되면 대화에서 주고받아요.'));
        const p = engineRespond(req, userId, note);
        const res = req.responses.find((r) => r.userId === userId);
        if (res) { if (matched?.length) res.matched = [...matched]; res.shared = shared ? [...shared] : ['school', 'interests']; }
        return p;
      },
      report(requestId: ID, userId: ID, reason: string): Patch {
        const req = find(db().networkRequests, requestId);
        if (!req.dismissedIds.includes(userId)) req.dismissedIds.push(userId);
        const r = { id: uid('rp'), reporterId: userId, targetType: 'post' as const, targetId: requestId, reason: `[request] ${reason}`, createdAt: now() };
        db().reports.push(r);
        return { networkRequests: [req], reports: [r] };
      },
      decide(requestId: ID, responseId: ID, accept: boolean): { roomId?: ID; patch: Patch } {
        const req = find(db().networkRequests, requestId);
        const res = find(req.responses, responseId);
        res.status = accept ? 'accepted' : 'declined';
        if (!accept) return { patch: { networkRequests: [req] } };
        // 서로 연결 + Mutual Room
        const r = db().relationships;
        if (!r.friends.some((f) => pairKey(f.a, f.b) === pairKey(req.authorId, res.userId))) r.friends.push({ a: req.authorId, b: res.userId, since: now() });
        const room = ensureDirectRoom(req.authorId, res.userId);
        const author = find(db().users, req.authorId);
        room.messages.push({ id: uid('m'), senderId: req.authorId, text: `${t('사람 찾아보기에서 이어졌어요: ')}"${req.text.slice(0, 40)}"`, createdAt: now(), system: true });
        const nts = [notify(res.userId, { type: 'request_accepted', title: `${author.nickname}${t('님과 대화가 열렸어요')}`, body: req.text.slice(0, 60), link: `/chats/${room.id}` })];
        return { roomId: room.id, patch: { networkRequests: [req], relationships: r, chatRooms: [room], notifications: nts } };
      },
      refer(requestId: ID, referrerId: ID, candidateId: ID): Patch { return engineRefer(find(db().networkRequests, requestId), referrerId, candidateId); },
      referralDecide(requestId: ID, referralId: ID, interested: boolean): Patch {
        const req = find(db().networkRequests, requestId);
        const ref = find(req.referrals, referralId);
        ref.status = interested ? 'interested' : 'declined';
        if (!interested) return { networkRequests: [req] };
        // 관심 있어요 → 이제서야 요청자에게 공개 (응답으로 전환)
        return engineRespond(req, ref.candidateId, undefined, ref.referrerId);
      },
      dismiss(requestId: ID, userId: ID): Patch {
        const req = find(db().networkRequests, requestId);
        if (!req.dismissedIds.includes(userId)) req.dismissedIds.push(userId);
        return { networkRequests: [req] };
      },
    },

    /** "소개해 줄 수 있어요?" — 요청자 → 서로 아는 사람(via) → 대상. via 가 전달하기 전까지 대상은 모른다 */
    intros: {
      create(fromId: ID, viaId: ID, toId: ID, note?: string): Patch {
        const r = db().relationships;
        const isF = (a: ID, b: ID) => r.friends.some((f) => pairKey(f.a, f.b) === pairKey(a, b));
        if (!isF(fromId, viaId) || !isF(viaId, toId)) throw new Error(t('서로 아는 사람을 통해서만 부탁할 수 있어요.'));
        if (isF(fromId, toId)) throw new Error(t('이미 연결된 사람이에요.'));
        if (note && containsContact(note)) throw new Error(t('연락처(전화번호·이메일·메신저 ID)는 적을 수 없어요. 연결되면 대화에서 주고받아요.'));
        if (db().introRequests.some((x) => x.fromId === fromId && x.toId === toId && (x.status === 'pending' || x.status === 'forwarded'))) throw new Error(t('이미 부탁했어요.'));
        const it: IntroRequest = { id: uid('ir'), fromId, viaId, toId, note: note?.trim() || undefined, status: 'pending', createdAt: now() };
        db().introRequests.unshift(it);
        const from = find(db().users, fromId); const to = find(db().users, toId);
        const nts = [notify(viaId, { type: 'intro_request', title: `${from.nickname}${t('님이 소개해 줄 수 있냐고 물어요')}`, body: `${to.nickname}${t('님과')}${it.note ? ` · "${it.note.slice(0, 50)}"` : ''}`, link: '/people/second?tab=asks' })];
        // 데모: 자동 수락 친구가 via 면 잠시 후 전달, 대상도 곧 수락
        if (ctx.demo && AUTO_ACCEPT_FRIEND.has(viaId)) later(4000, () => { if (it.status !== 'pending') return; ctx.push(introForward(it, false)); if (AUTO_ACCEPT_FRIEND.has(toId) || AUTO_REQUEST_RESPONDERS.includes(toId)) later(3500, () => { if (it.status === 'forwarded') ctx.push(introRespond(it, true).patch); }); });
        return { introRequests: [it], notifications: nts };
      },
      forward(introId: ID, viaId: ID, pass = false): Patch {
        const it = find(db().introRequests, introId);
        if (it.viaId !== viaId) throw new Error(t('권한이 없어요.'));
        return introForward(it, pass);
      },
      respond(introId: ID, toId: ID, accept: boolean): { roomId?: ID; patch: Patch } {
        const it = find(db().introRequests, introId);
        if (it.toId !== toId) throw new Error(t('권한이 없어요.'));
        return introRespond(it, accept);
      },
    },

    /** 저장한 사람 검색 — AroundU+ 기능. 조건 저장 · 새 사람 알림 */
    searches: {
      save(userId: ID, name: string, criteria: PeopleSearch, alert: boolean): Patch {
        const me = find(db().users, userId);
        const matched = searchPeople(db().users, me, criteria).length;
        const s: SavedSearch = { id: uid('ss'), userId, name: name.trim() || t('저장한 검색'), criteria: structuredClone(criteria), alert, lastMatched: matched, createdAt: now() };
        db().savedSearches.unshift(s);
        return { savedSearches: [s] };
      },
      remove(id: ID): Patch {
        db().savedSearches = db().savedSearches.filter((s) => s.id !== id);
        return { removed: { savedSearches: [id] } };
      },
      setAlert(id: ID, alert: boolean): Patch {
        const s = find(db().savedSearches, id); s.alert = alert; return { savedSearches: [s] };
      },
      /** 조건을 다시 실행 — 데모에서는 알림이 켜져 있으면 '새 사람 N명' 알림을 만든다 */
      run(userId: ID, id: ID): Patch {
        const s = find(db().savedSearches, id);
        const me = find(db().users, userId);
        const matched = searchPeople(db().users, me, s.criteria).length;
        const fresh = Math.max(1, matched - s.lastMatched);
        s.lastMatched = matched;
        const nts: Notification[] = s.alert ? [notify(userId, { type: 'new_people', title: t('조건에 맞는 새 사람'), body: `"${s.name}" ${t('조건에 맞는 사람이')} ${fresh}${t('명 새로 들어왔어요.')}`, link: `/people/results?saved=${s.id}` })] : [];
        return { savedSearches: [s], notifications: nts };
      },
    },

    activities: {
      create(hostId: ID, input: ActivityInput): { activity: Activity; patch: Patch } {
        // 그룹 안에서 만든 모임: hostType 은 org_event 일 때만 org. 개인이 그룹에 올리는 모임은 사람이 주최
        if (input.visibility === 'group' && !input.orgId) throw new Error(t('공개할 그룹을 골라주세요.'));
        const activity: Activity = { id: uid('a'), hostId, hostType: input.kind === 'org_event' && input.orgId ? 'org' : 'user', comments: [], createdAt: now(), ...input };
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
      /** Post Boost (모의 결제) — 7일간 관련 audience 에 추가 노출 */
      boost(postId: ID, tier: BoostTier, audiences: string[]): Patch {
        const p = find(db().posts, postId);
        if (p.sponsored) throw new Error(t('스폰서 글은 부스트할 수 없어요.'));
        const until = new Date(); until.setDate(until.getDate() + 7);
        p.boost = { tier, audiences, until: until.toISOString().slice(0, 10) };
        return { posts: [p] };
      },
      create(authorId: ID, input: PostInput): { post: Post; patch: Patch } {
        const post: Post = { id: uid('po'), authorId, authorType: input.orgId ? 'org' : 'user', likeIds: [], savedIds: [], comments: [], createdAt: now(), showOnProfile: true, showOnFeed: true, ...input };
        if (post.anonymous) { post.media = []; post.taggedUserIds = []; }
        if (post.visibility === 'group') {
          if (!post.groupId) throw new Error(t('공개할 그룹을 골라주세요.'));
          const g = find(db().organizations, post.groupId);
          if (!g.memberIds.includes(authorId) && !g.adminIds.includes(authorId)) throw new Error(t('가입한 그룹에만 글을 올릴 수 있어요.'));
        } else { delete post.groupId; }
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
      sendFriendRequest(fromId: ID, toId: ID, note?: FriendNote): Patch {
        const r = db().relationships;
        const text = note?.text?.trim().slice(0, 140);
        if (text && containsContact(text)) throw new Error(t('연락처는 한마디에 적을 수 없어요.'));
        if (r.friendRequests.some((q) => q.fromId === fromId && q.toId === toId && q.status === 'pending')) return { relationships: r };
        if (r.friends.some((f) => pairKey(f.a, f.b) === pairKey(fromId, toId))) return { relationships: r };
        recordConnect(fromId);
        const req: Relationships['friendRequests'][number] = { id: uid('fr'), fromId, toId, status: 'pending' as const, createdAt: now(), ...(text ? { note: { text, promptId: note?.promptId, quote: note?.quote?.slice(0, 120) } } : {}) };
        r.friendRequests.push(req);
        if (text) { const from = find(db().users, fromId); ctx.push({ notifications: [notify(toId, { type: 'comment', title: `${from.nickname}${t('님이 한마디와 함께 연결을 요청했어요')}`, body: note?.quote ? `“${note.quote.slice(0, 40)}” — ${text}` : text, link: `/users/${fromId}` })] }); }
        if (AUTO_ACCEPT_FRIEND.has(toId)) later(5000, () => { if (req.status === 'pending') ctx.push(acceptFriend(req.id)); });
        return { relationships: r, users: [find(db().users, fromId)] };
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
      /** 가입 — 자유 그룹(open)은 즉시 멤버, 승인제·기존 조직은 지원 목록 */
      apply(orgId: ID, userId: ID): Patch {
        const org = find(db().organizations, orgId);
        if (org.memberIds.includes(userId)) return { organizations: [org] };
        if (org.joinPolicy === 'open') {
          org.memberIds.push(userId);
          org.applicantIds = org.applicantIds.filter((i) => i !== userId);
          return { organizations: [org] };
        }
        if (!org.applicantIds.includes(userId)) org.applicantIds.push(userId);
        return { organizations: [org] };
      },
      leave(orgId: ID, userId: ID): Patch {
        const org = find(db().organizations, orgId);
        org.memberIds = org.memberIds.filter((i) => i !== userId);
        org.applicantIds = org.applicantIds.filter((i) => i !== userId);
        org.adminIds = org.adminIds.filter((i) => i !== userId);
        return { organizations: [org] };
      },
      /** 자유 그룹 만들기 — 학교·지역·관심사·직업 어느 기반이든. 만든 사람이 운영진이자 첫 멤버 */
      create(userId: ID, input: GroupInput): { org: Organization; patch: Patch } {
        const me = find(db().users, userId);
        const org: Organization = {
          id: uid('o'), name: input.name.trim(), logo: input.logo, type: 'community', scope: input.scope,
          city: input.scope === 'city' ? (input.city?.trim() || me.homeCity || me.region) : input.city?.trim() || undefined,
          schoolId: input.scope === 'school' ? (input.schoolId ?? (me.affiliation.type === 'university' ? me.affiliation.schoolId : undefined)) : undefined,
          joinPolicy: input.joinPolicy, interests: input.interests ?? [], verified: false, description: input.description.trim(),
          gallery: [], regularActivities: [], notices: [], followerIds: [], memberIds: [userId], adminIds: [userId], applicantIds: [],
        };
        db().organizations.unshift(org);
        const room: ChatRoom = { id: uid('cr'), type: 'org', orgId: org.id, memberIds: [userId], title: org.name, messages: [{ id: uid('m'), senderId: userId, text: t('그룹 채팅방이 열렸어요.'), createdAt: now(), system: true }], lastReadAt: {}, createdAt: now() };
        db().chatRooms.push(room);
        return { org, patch: { organizations: [org], chatRooms: [room] } };
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
          id: uid('a'), kind: 'group', category: p.category, title: p.title, description: `${t('같이 시간 정하기로 정한 약속이에요. ')}${goers.length}${t('명이 이 시간에 가능하다고 했어요.')}`,
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
