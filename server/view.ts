/**
 * 사용자 관점으로 스냅샷·패치를 걸러낸다.
 * - 알림·신고는 본인 것만
 * - 채팅방·1:1 제안은 당사자에게만 (예전엔 모든 접속자에게 모든 대화가 내려갔다)
 * - 다른 사람의 시간표 강의실(room)은 절대 내려보내지 않는다
 * - 아이스브레이커: 게임은 당사자에게만, 다른 사람 프로필의 정답(거짓 위치·이모지 뜻·맞혀봐 답)은 지운다,
 *   this_or_that은 둘 다 답하기 전까지 상대 선택을 지운다
 * - 오늘의 질문 답(dailyAnswer)은 그 사람의 availability 공개 범위 안에서만 (비율은 엔진이 5명 이상일 때 집계로)
 * - 동아리는 내 학교 것 + 내가 속했거나 화면이 참조하는 것만 (전체 5만 개를 내려보내면 첫 화면이 수 초 걸린다)
 * - 시간표: 다른 사람 것은 그 사람의 timetable 공개 범위 안에서 '바쁜 시간'만 (수업 이름·교수·링크는 지운다)
 * - 같은 수업 학생: 수업별 목록(classRosters)을 그 수업을 듣는 사람에게만 계산해 보낸다 (@core/lib/classmates).
 *   다른 사람의 '보이기' 설정·스터디 그룹 거절 목록·파트너 찾기 기록은 지운다
 * - Lumi 가 제안한 스터디 그룹(activity.studyGroup)과 그 참가 기록은 초대받은 사람에게만
 * - 링크로 묻는 약속(timePoll.link)은 주최자와 Lumi 로 답한 사람에게만, 손님 토큰 해시는 절대 안 보낸다
 * - 예시(sample) 콘텐츠는 데모 계정에게만, 그것도 자기 학교 것만 (server/samples.ts). 실제 계정의 스냅샷·패치에는
 *   예시 프로필·모임·글·같이 타기·약속·동아리·공고가 하나도 없고, 수업 명단도 예시를 뺀 사람들로 계산한다
 * - 운영 조치 (server/moderation.ts): 정지된 계정과 그 콘텐츠는 다른 사람에게 안 보이고, 실제 계정 3명 이상이 신고한
 *   글·댓글은 작성자 외에게 숨긴다. 신고는 낸 사람에게만, 운영 기록(log·excerpt·targetOwnerId)은 지운 채로
 * - 다른 사람 프로필은 공개 범위가 허락하는 항목만 (@core/lib/privacy profileFor) — 닫힌 항목은 키째 빠진다.
 *   나를 차단한 사람은 아예 안 보낸다. 관계는 내가 한 쪽인 것만 (relationshipsFor), 함께 아는 친구는 수만
 * - 게시물·활동은 공개 범위 안의 것만 (예전엔 친구 공개 글도 모두에게 내려갔다). 익명 글은 글쓴이 id 를 지우고,
 *   누가 공감·저장했는지 대신 내 것 + 공감 수 (postFor)
 * - 참가 기록: 내 것 + 내가 연 활동의 것 + 다른 사람은 승인된 것만(신청 메시지 없이)
 * - 동아리 지원자 목록은 운영진과 본인에게만, 다른 사람의 저장(saved)은 안 보낸다, 시간 투표는 초대받은 사람에게만
 */
import { withoutEmoji, stripEmoji } from '@core/lib/orglinks';
import { noEmojiView } from './noemoji';
/** 공고·행사 주최 이름에도 이모지 없이 */
const hostNoEmoji = <T extends { host?: string }>(o: T): T => (o.host && stripEmoji(o.host) !== o.host ? { ...o, host: stripEmoji(o.host) } : o);
import type { Patch, Snapshot } from '@core/api/types';
import type { Activity, ActivityProposal, ChatRoom, Game, ID, Organization, Participation, Post, TimePoll, User } from '@core/types';
import { gameFor } from '@core/lib/icebreakers';
import { canViewActivity, canViewPost } from '@core/lib/relations';
import { blockedBy, intentFor, membershipFilter, postFor, profileFor, relationshipsFor } from '@core/lib/privacy';
import { planVisibleTo, stripPlanSecrets } from '@core/lib/plans';
import { buildClassIndex, classRostersFor, schoolOf, type ClassIndex } from '@core/lib/classmates';
import { ridesFor, ridesPatchFor } from '@core/lib/rides';
import { hiddenSamplesFor, stripRelationships, stripSamples, type HiddenSamples } from './samples';
import { moderatePatch, moderateView } from './moderation';

/**
 * 다른 사람 프로필 — 공개 범위 밖 항목은 키째 빠진다 (@core/lib/privacy). 시간표는 바쁜 시간 블록만, 오늘의 질문 답은
 * availability 공개 범위 안에서만 (학교 전체 비율은 엔진의 users.dailyResults 가 5명 이상일 때만 집계로).
 * 나를 차단한 사람은 null (아예 안 보낸다). 보는 사람을 모르면(db 없음) 본인 것 말고는 보내지 않는다
 */
function sanitizeUser(u: User, viewerId: ID, db?: Snapshot): User | null {
  if (u.id === viewerId) return u;
  const viewer = db?.users.find((x) => x.id === viewerId);
  if (!db || !viewer || blockedBy(db, viewerId, u.id)) return null;
  return profileFor(db, viewer, u);
}
const usersFor = (list: User[], viewerId: ID, db?: Snapshot) => list.map((u) => sanitizeUser(u, viewerId, db)).filter((u): u is User => !!u);

/**
 * 게시물: 글쓴이 본인이거나 공개 범위 안 (차단은 양쪽 다 안 보인다). 공감·저장은 내 것만, 익명 글은 글쓴이를 지운다
 */
function postsFor(list: Post[], viewerId: ID, db?: Snapshot): Post[] {
  const viewer = db?.users.find((x) => x.id === viewerId);
  if (!db || !viewer) return [];
  return list.filter((p) => p.authorId === viewerId || canViewPost(db, viewer, p)).map((p) => postFor(p, viewerId, db.users.find((u) => u.id === p.authorId)));
}

/** 내가 관련된 활동 — 공개 범위가 바뀌었거나 친구가 끊겨도 내 모임은 보인다 */
function involvedActivities(db: Snapshot, viewerId: ID): Set<ID> {
  const ids = new Set<ID>();
  for (const p of db.participations) if (p.userId === viewerId) ids.add(p.activityId);
  for (const r of db.chatRooms) if (r.activityId && r.memberIds.includes(viewerId)) ids.add(r.activityId);
  for (const t of db.timePolls) if (t.activityId && pollOk(viewerId)(t)) ids.add(t.activityId);
  return ids;
}
/**
 * 활동: 연 사람·참가자·초대받은 사람·공개 범위 안의 사람에게만. Lumi 가 제안한 스터디 그룹은 초대받은 사람에게만.
 * 다른 사람에게는 초대 명단·'선택한 사람' 명단에서 나 말고는 지운다
 */
function activityCheck(db: Snapshot | undefined, viewerId: ID) {
  const viewer = db?.users.find((x) => x.id === viewerId);
  const involved = db ? involvedActivities(db, viewerId) : new Set<ID>();
  return (a: Activity) => !!db && !!viewer && studyGroupOk(viewerId)(a)
    && (a.hostId === viewerId || involved.has(a.id) || !!a.studyGroup || canViewActivity(db, viewer, a));
}
function activityFor(a: Activity, viewerId: ID): Activity {
  if (a.hostId === viewerId) return a;
  const out = { ...a };
  if (a.invitedIds) out.invitedIds = a.invitedIds.filter((id) => id === viewerId);
  if (a.interestedIds) out.interestedIds = a.interestedIds.filter((id) => id === viewerId);
  if (a.visibility === 'selected' && a.visibilityTargets) out.visibilityTargets = a.visibilityTargets.filter((id) => id === viewerId);
  return out;
}
const activitiesFor = (list: Activity[], viewerId: ID, db?: Snapshot) => { const ok = activityCheck(db, viewerId); return list.filter(ok).map((a) => activityFor(a, viewerId)); };

/** 참가 기록: 내 것, 내가 연 활동의 것, 그 밖에는 내가 볼 수 있는 활동의 승인된 참가만 (신청 메시지는 연 사람만 본다) */
function participationsFor(list: Participation[], viewerId: ID, db?: Snapshot, extra: Activity[] = []): Participation[] {
  if (!db) return list.filter((p) => p.userId === viewerId);
  const byId = new Map([...db.activities, ...extra].map((a) => [a.id, a]));
  const ok = activityCheck(db, viewerId);
  const seen = new Map<ID, boolean>();
  const visible = (id: ID) => { let v = seen.get(id); if (v === undefined) { const a = byId.get(id); v = !!a && ok(a); seen.set(id, v); } return v; };
  const out: Participation[] = [];
  for (const p of list) {
    if (p.userId === viewerId || byId.get(p.activityId)?.hostId === viewerId) out.push(p);
    else if (p.status === 'approved' && visible(p.activityId)) { const { message: _m, ...rest } = p; out.push(rest); }
  }
  return out;
}

/** 동아리 지원자 명단은 운영진에게만 — 다른 사람에게는 나만 남긴다 */
// 화면에는 이모지 없이 — 이름 끝 💙 등은 빼고, 이모지 로고는 머리글자로 (packages/core/src/lib/orglinks.ts withoutEmoji)
// 멤버·팔로워 목록은 각자의 멤버십 공개 범위(extraVisibility.memberships) 안에서만 (@core/lib/privacy membershipFilter)
const orgFor = (viewerId: ID, db?: Snapshot) => {
  const viewer = db?.users.find((u) => u.id === viewerId);
  const members = db && viewer ? membershipFilter(db, viewer) : (o: Organization) => o;
  return (o: Organization): Organization =>
    withoutEmoji(o.adminIds.includes(viewerId) ? o : members({ ...o, applicantIds: o.applicantIds.filter((id) => id === viewerId) }));
};

/** 이 사용자에게 보낼 동아리인지 */
export function orgFilter(db: Snapshot, viewerId: ID): (o: Organization) => boolean {
  const me = db.users.find((u) => u.id === viewerId);
  const school = me?.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  const referenced = new Set<ID>();
  for (const u of db.users) u.interestedOrgIds?.forEach((id) => referenced.add(id));
  for (const x of [...db.activities, ...db.posts, ...db.opportunities] as { orgId?: ID }[]) if (x.orgId) referenced.add(x.orgId);
  return (o) => !o.schoolId || o.schoolId === school || referenced.has(o.id)
    || o.memberIds.includes(viewerId) || o.followerIds.includes(viewerId) || o.adminIds.includes(viewerId) || o.applicantIds.includes(viewerId);
}

/**
 * 이 사용자에게 보낼 공고인지 — 학교가 없는 공고(전국 인턴·장학금)와 내 학교 공고만.
 * 데이터만 모으는 학교(schools-collect.csv)의 행사·연구가 다른 학교 학생에게 내려가지 않게 (2026-11-02).
 * 학교를 모르는 사용자(가입 전 등)는 예전처럼 거르지 않는다. 내가 저장·관심 표시한 공고는 남긴다
 */
export function opportunityFilter(db: Snapshot, viewerId: ID): (o: { id: ID; schoolId?: ID }) => boolean {
  const me = db.users.find((u) => u.id === viewerId);
  const school = me?.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  if (!school) return () => true;
  const mine = new Set(db.opportunityIntents.filter((i) => i.userId === viewerId).map((i) => i.opportunityId));
  return (o) => !o.schoolId || o.schoolId === school || mine.has(o.id);
}

/** 이 사람이 볼 수 있는 게임만, 비밀을 지운 모양으로 */
export const gamesFor = (games: Game[] | undefined, viewerId: ID): Game[] => (games ?? []).map((g) => gameFor(g, viewerId)).filter((g): g is Game => !!g);

const inRoom = (viewerId: ID) => (r: ChatRoom) => r.memberIds.includes(viewerId);
/** Lumi 가 제안한 스터디 그룹은 초대받은 사람에게만 (누가 어떤 수업에서 언제 비는지가 담겨 있다) */
const studyGroupOk = (viewerId: ID) => (a: Activity) => !a.studyGroup || a.studyGroup.invitedIds.includes(viewerId);
/**
 * 패치 하나를 모든 접속자에게 거를 때 숨길 예시·수업 색인은 한 번만 만든다.
 * 실제 계정은 모두 같은 것을 숨기고, 데모 계정은 학교마다 다르다 → 키: 'real' | 'demo:<학교>'
 */
type PerPatch = { hidden?: HiddenSamples; idx?: ClassIndex };
const patchCache = new WeakMap<Patch, Map<string, PerPatch>>();
const viewKey = (viewer?: User) => (viewer?.sample ? `demo:${schoolOf(viewer)}` : 'real');
function cacheFor(patch: Patch, viewer?: User): PerPatch {
  let m = patchCache.get(patch);
  if (!m) { m = new Map(); patchCache.set(patch, m); }
  const k = viewKey(viewer);
  let c = m.get(k);
  if (!c) { c = {}; m.set(k, c); }
  return c;
}
function rostersPatch(patch: Patch, viewerId: ID, db: Snapshot, hidden: HiddenSamples, cache: PerPatch) {
  const viewer = db.users.find((u) => u.id === viewerId);
  if (!viewer) return undefined;
  const school = schoolOf(viewer);
  const touches = !!patch.relationships || (patch.users ?? []).some((u) => u.id === viewerId || (!!school && schoolOf(u) === school));
  if (!touches) return undefined;
  // 수업 명단은 이 사람이 볼 수 있는 사람들로만 (실제 계정에게 예시 프로필이 같은 수업 학생으로 나오지 않게)
  const base = hidden.none ? db : { users: db.users.filter((u) => !hidden.users.has(u.id)), relationships: stripRelationships(db.relationships, hidden.users) };
  const idx = (cache.idx ??= buildClassIndex(base.users));
  const rosters = classRostersFor(base, viewerId, new Date(), idx);
  // 수업이 없는 사람에게는 보내지 않는다 (본인 시간표가 바뀐 경우는 빈 목록으로 지운다)
  return rosters.length || (patch.users ?? []).some((u) => u.id === viewerId) ? rosters : undefined;
}
const inProposal = (viewerId: ID) => (p: ActivityProposal) => p.fromId === viewerId || p.toId === viewerId;
/**
 * 시간 투표는 주최자·초대받은 사람·표를 던진 사람에게만 (예전엔 링크가 없는 투표가 모두에게 내려갔다).
 * 링크 약속(/p/<id>)은 주최자와 Lumi 로 답한 사람에게만, 손님 토큰 해시는 지운다 (@core/lib/plans)
 */
function pollOk(viewerId: ID) {
  return (p: TimePoll) => planVisibleTo(p, viewerId) && (!!p.link || p.hostId === viewerId || p.inviteeIds.includes(viewerId) || p.votes[viewerId] !== undefined);
}
const pollsFor = (polls: TimePoll[] | undefined, viewerId: ID) => (polls ?? []).filter(pollOk(viewerId)).map(stripPlanSecrets);
const intentsFor = (list: Snapshot['opportunityIntents'], viewerId: ID) => list.map((i) => intentFor(i, viewerId)).filter((i): i is NonNullable<typeof i> => !!i);

/**
 * 관계가 바뀐 패치(친구·팔로우·차단)에서 내가 당사자면, 상대의 글·활동을 다시 맞춘다 — 이제 보이는 것은 보내고
 * 안 보이게 된 것은 지운다. 익명 글은 건드리지 않는다 (관계가 바뀐 순간 생기고 사라지면 누가 썼는지 드러난다)
 */
function refreshAround(others: ID[], viewerId: ID, db: Snapshot, hidden: HiddenSamples) {
  const viewer = db.users.find((u) => u.id === viewerId);
  const set = new Set(others);
  const posts = db.posts.filter((p) => !!p.authorId && set.has(p.authorId) && !p.anonymous && !hidden.posts.has(p.id));
  const acts = db.activities.filter((a) => set.has(a.hostId) && !hidden.activities.has(a.id));
  const pOk = (p: Post) => !!viewer && canViewPost(db, viewer, p);
  const aOk = activityCheck(db, viewerId);
  return { posts: posts.filter(pOk), hiddenPosts: posts.filter((p) => !pOk(p)).map((p) => p.id), activities: acts.filter(aOk), hiddenActivities: acts.filter((a) => !aOk(a)).map((a) => a.id) };
}
const mergeById = <T extends { id: ID }>(a: T[] | undefined, b: T[]) => [...(a ?? []), ...b.filter((x) => !(a ?? []).some((y) => y.id === x.id))];

/** 알림이 가리키는 공고(/opportunities/:id)가 없어졌는지 — 마감·삭제된 공고 알림은 눌러도 “찾을 수 없어요”만 나온다 */
function goneOpportunity(link: string | undefined, db: Pick<Snapshot, 'opportunities'>): boolean {
  const id = link?.match(/^\/opportunities\/([^/?#]+)/)?.[1];
  return !!id && !db.opportunities.some((o) => o.id === id);
}

export function snapshotFor(full: Snapshot, viewerId: ID): Snapshot {
  // 예시 콘텐츠를 먼저 뺀다 — 아래의 동아리·수업 명단·같이 타기 계산도 뺀 데이터로 한다
  // 신고·정지 (server/moderation.ts) — 정지된 사람과 그 콘텐츠, 신고가 쌓여 숨긴 글·댓글을 뺀다.
  // 공개 범위로 거르기 전에 한 번 먼저 — 익명 글은 거른 뒤에는 글쓴이 id 가 없어 정지된 사람의 글인지 알 수 없다
  const db = moderateView(stripSamples(full, hiddenSamplesFor(full, full.users.find((u) => u.id === viewerId))), viewerId, full);
  return noEmojiView(moderateView({
    ...db,
    organizations: db.organizations.filter(orgFilter(db, viewerId)).map(orgFor(viewerId, db)),
    opportunities: db.opportunities.filter(opportunityFilter(db, viewerId)).map(hostNoEmoji),
    users: usersFor(db.users, viewerId, db),
    relationships: relationshipsFor(db.relationships, viewerId),
    posts: postsFor(db.posts, viewerId, db),
    opportunityIntents: intentsFor(db.opportunityIntents, viewerId),
    activities: activitiesFor(db.activities, viewerId, db),
    participations: participationsFor(db.participations, viewerId, db),
    classRosters: classRostersFor(db, viewerId),
    notifications: db.notifications.filter((n) => n.userId === viewerId && !goneOpportunity(n.link, db)),
    reports: db.reports.filter((r) => r.reporterId === viewerId),
    games: gamesFor(db.games, viewerId),
    chatRooms: db.chatRooms.filter(inRoom(viewerId)),
    proposals: db.proposals.filter(inProposal(viewerId)),
    rides: ridesFor(db, viewerId), // my school only · blocks both ways · riders & chat only to people in the ride
    timePolls: pollsFor(db.timePolls, viewerId),
  }, viewerId, full));
}

export function patchFor(original: Patch, viewerId: ID, db?: Snapshot): Patch | null {
  // 예시 콘텐츠를 먼저 뺀다 (db 가 없으면 누가 데모 계정인지 알 수 없어 그대로)
  const viewer = db?.users.find((u) => u.id === viewerId);
  const cache = cacheFor(original, viewer);
  const hidden = db ? (cache.hidden ??= hiddenSamplesFor(db, viewer)) : undefined;
  let patch = hidden ? stripSamples(original, hidden) : original;
  // 신고·정지는 공개 범위로 거르기 전에도 한 번 (익명 글·댓글은 거른 뒤에는 글쓴이 id 가 없다). 끝에서 한 번 더 (다시 맞춘 글·활동)
  if (db) { const m: Patch = { ...patch }; moderatePatch(m, viewerId, db); patch = m; }
  const out: Patch = { ...patch };
  if (patch.organizations) out.organizations = db ? patch.organizations.filter(orgFilter(db, viewerId)).map(orgFor(viewerId, db)) : [];
  if (patch.opportunities) out.opportunities = (db ? patch.opportunities.filter(opportunityFilter(db, viewerId)) : patch.opportunities).map(hostNoEmoji);
  if (patch.users) {
    out.users = usersFor(patch.users, viewerId, db);
    // 관계가 바뀐 패치(엔진이 두 당사자를 users 로 같이 보낸다): 나를 차단한 사람은 화면에서 지우고, 내가 당사자면 상대의 글·활동을 다시 맞춘다
    if (patch.relationships && db) {
      const gone = patch.users.filter((u) => u.id !== viewerId && blockedBy(db, viewerId, u.id)).map((u) => u.id);
      const others = patch.users.some((u) => u.id === viewerId) ? patch.users.map((u) => u.id).filter((id) => id !== viewerId) : [];
      if (gone.length || others.length) {
        const r = refreshAround([...others, ...gone], viewerId, db, hidden ?? hiddenSamplesFor(db, viewer));
        const removed = { ...out.removed };
        if (gone.length) removed.users = [...(removed.users ?? []), ...gone];
        if (r.hiddenPosts.length) removed.posts = [...(removed.posts ?? []), ...r.hiddenPosts];
        if (r.hiddenActivities.length) removed.activities = [...(removed.activities ?? []), ...r.hiddenActivities];
        if (Object.keys(removed).length) out.removed = removed;
        if (r.posts.length) patch = { ...patch, posts: mergeById(patch.posts, r.posts) };
        if (r.activities.length) patch = { ...patch, activities: mergeById(patch.activities, r.activities) };
      }
    }
  }
  if (patch.relationships) out.relationships = relationshipsFor(patch.relationships, viewerId);
  if (patch.posts) out.posts = postsFor(patch.posts, viewerId, db);
  if (patch.opportunityIntents) out.opportunityIntents = intentsFor(patch.opportunityIntents, viewerId);
  if (patch.activities) out.activities = activitiesFor(patch.activities, viewerId, db);
  if (patch.participations) out.participations = participationsFor(patch.participations, viewerId, db, patch.activities);
  if (db && hidden) { const r = rostersPatch(patch, viewerId, db, hidden, cache); if (r) out.classRosters = r; else delete out.classRosters; } else delete out.classRosters;
  if (patch.notifications) out.notifications = patch.notifications.filter((n) => n.userId === viewerId);
  if (patch.reports) out.reports = patch.reports.filter((r) => r.reporterId === viewerId);
  if (patch.games) out.games = gamesFor(patch.games, viewerId);
  if (patch.chatRooms) {
    out.chatRooms = patch.chatRooms.filter(inRoom(viewerId));
    // 방에서 나간 사람의 화면에 옛 방이 남지 않게 — 내용 대신 id만 지우라고 보낸다 (읽은 기록이 있는 = 있던 사람에게만)
    const left = patch.chatRooms.filter((r) => !r.memberIds.includes(viewerId) && r.lastReadAt[viewerId] !== undefined).map((r) => r.id);
    if (left.length) out.removed = { ...out.removed, chatRooms: [...(out.removed?.chatRooms ?? []), ...left] };
  }
  if (patch.proposals) out.proposals = patch.proposals.filter(inProposal(viewerId));
  if (patch.rides) { const r = db ? ridesPatchFor(db, patch.rides, viewerId) : { rides: [], removed: [] }; out.rides = r.rides; if (r.removed.length) out.removed = { ...out.removed, rides: [...(out.removed?.rides ?? []), ...r.removed] }; }
  if (patch.timePolls) out.timePolls = pollsFor(patch.timePolls, viewerId);
  // 신고·정지 (server/moderation.ts) — 새로 숨겨진 것은 removed.* 로 보내 열린 화면에서도 사라지게
  if (db) moderatePatch(out, viewerId, db);
  const hasContent = Object.entries(out).some(([k, v]) => (k === 'relationships' ? !!v : k === 'removed' ? !!v && Object.values(v).some((ids) => ids && ids.length) : Array.isArray(v) && v.length > 0));
  return hasContent ? noEmojiView(out) : null;
}
