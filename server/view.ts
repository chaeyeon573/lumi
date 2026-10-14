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
 */
import type { Patch, Snapshot } from '@core/api/types';
import type { Activity, ActivityProposal, ChatRoom, Game, ID, Organization, Participation, TimePoll, User } from '@core/types';
import { gameFor, stripGameSecrets } from '@core/lib/icebreakers';
import { canViewField } from '@core/lib/relations';
import { planVisibleTo, stripPlanSecrets } from '@core/lib/plans';
import { buildClassIndex, classRostersFor, schoolOf, type ClassIndex } from '@core/lib/classmates';
import { ridesFor, ridesPatchFor } from '@core/lib/rides';
import { hiddenSamplesFor, stripRelationships, stripSamples, type HiddenSamples } from './samples';

/**
 * 오늘의 질문 답은 '지금 시간 되는지'와 같은 성격이라 availability 공개 범위를 따른다 (차단 관계면 안 보인다).
 * 학교 전체 비율은 엔진의 users.dailyResults 가 5명 이상일 때만 집계로 내려준다.
 */
function canSeeDaily(db: Snapshot | undefined, viewerId: ID, u: User): boolean {
  if (!u.dailyAnswer || !db) return false;
  const viewer = db.users.find((x) => x.id === viewerId);
  return !!viewer && canViewField(db, viewer, u, 'availability');
}

/** 다른 사람의 시간표 — 공개 범위 안이면 바쁜 시간 블록만, 아니면 빈 목록. 수업 이름·강의실·교수·링크·분반은 절대 안 보낸다 */
function busyOnly(u: User, viewerId: ID, db?: Snapshot): User['timetable'] {
  const viewer = db?.users.find((x) => x.id === viewerId);
  if (!db || !viewer || !u.timetable.length || !canViewField(db, viewer, u, 'timetable')) return [];
  return u.timetable.map((c) => ({ id: c.id, name: '', day: c.day, start: c.start, end: c.end, hue: c.hue }));
}

function sanitizeUser(u: User, viewerId: ID, db?: Snapshot): User {
  if (u.id === viewerId) return u;
  const { showToClassmates: _s, studyGroupOptOut: _o, partnerSearch: _p, ...rest } = u;
  const out: User = { ...stripGameSecrets(rest as User, viewerId), timetable: busyOnly(u, viewerId, db) };
  if (out.dailyAnswer && !canSeeDaily(db, viewerId, u)) delete out.dailyAnswer;
  return out;
}

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

/** 이 사람이 볼 수 있는 게임만, 비밀을 지운 모양으로 */
export const gamesFor = (games: Game[] | undefined, viewerId: ID): Game[] => (games ?? []).map((g) => gameFor(g, viewerId)).filter((g): g is Game => !!g);

const inRoom = (viewerId: ID) => (r: ChatRoom) => r.memberIds.includes(viewerId);
/** Lumi 가 제안한 스터디 그룹은 초대받은 사람에게만 (누가 어떤 수업에서 언제 비는지가 담겨 있다) */
const studyGroupOk = (viewerId: ID) => (a: Activity) => !a.studyGroup || a.studyGroup.invitedIds.includes(viewerId);
function participationOk(db: Snapshot | undefined, viewerId: ID, extra: Activity[] = []) {
  const hidden = new Set([...(db?.activities ?? []), ...extra].filter((a) => a.studyGroup && !a.studyGroup.invitedIds.includes(viewerId)).map((a) => a.id));
  return (p: Participation) => !hidden.has(p.activityId);
}
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
/** 링크 약속(/p/<id>)은 주최자와 Lumi 로 답한 사람에게만, 손님 토큰 해시는 지운다 (@core/lib/plans) */
const pollsFor = (polls: TimePoll[] | undefined, viewerId: ID) => (polls ?? []).filter((p) => planVisibleTo(p, viewerId)).map(stripPlanSecrets);

export function snapshotFor(full: Snapshot, viewerId: ID): Snapshot {
  // 예시 콘텐츠를 먼저 뺀다 — 아래의 동아리·수업 명단·같이 타기 계산도 뺀 데이터로 한다
  const db = stripSamples(full, hiddenSamplesFor(full, full.users.find((u) => u.id === viewerId)));
  return {
    ...db,
    organizations: db.organizations.filter(orgFilter(db, viewerId)),
    users: db.users.map((u) => sanitizeUser(u, viewerId, db)),
    activities: db.activities.filter(studyGroupOk(viewerId)),
    participations: db.participations.filter(participationOk(db, viewerId)),
    classRosters: classRostersFor(db, viewerId),
    notifications: db.notifications.filter((n) => n.userId === viewerId),
    reports: db.reports.filter((r) => r.reporterId === viewerId),
    games: gamesFor(db.games, viewerId),
    chatRooms: db.chatRooms.filter(inRoom(viewerId)),
    proposals: db.proposals.filter(inProposal(viewerId)),
    rides: ridesFor(db, viewerId), // my school only · blocks both ways · riders & chat only to people in the ride
    timePolls: pollsFor(db.timePolls, viewerId),
  };
}

export function patchFor(original: Patch, viewerId: ID, db?: Snapshot): Patch | null {
  // 예시 콘텐츠를 먼저 뺀다 (db 가 없으면 누가 데모 계정인지 알 수 없어 그대로)
  const viewer = db?.users.find((u) => u.id === viewerId);
  const cache = cacheFor(original, viewer);
  const hidden = db ? (cache.hidden ??= hiddenSamplesFor(db, viewer)) : undefined;
  const patch = hidden ? stripSamples(original, hidden) : original;
  const out: Patch = { ...patch };
  if (patch.organizations && db) out.organizations = patch.organizations.filter(orgFilter(db, viewerId));
  if (patch.users) out.users = patch.users.map((u) => sanitizeUser(u, viewerId, db));
  if (patch.activities) out.activities = patch.activities.filter(studyGroupOk(viewerId));
  if (patch.participations) out.participations = patch.participations.filter(participationOk(db, viewerId, patch.activities));
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
  const hasContent = Object.entries(out).some(([k, v]) => (k === 'relationships' ? !!v : k === 'removed' ? !!v && Object.values(v).some((ids) => ids && ids.length) : Array.isArray(v) && v.length > 0));
  return hasContent ? out : null;
}
