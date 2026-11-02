/**
 * 다른 사람에게 무엇을 보여도 되는지 — 서버(server/view.ts)가 보내기 전에 지우고, 화면은 같은 규칙으로 읽는다.
 *
 * - 프로필: 공개 범위(fieldVisibility)가 허락하지 않는 항목은 아예 보내지 않는다 (빈 값으로 채우지 않는다).
 *   어떤 항목이 열렸는지는 viewable 로 같이 보내고, 화면은 canViewField 로 그것을 읽는다
 * - 본인만 보는 것: 출생 연도(나이), 성별, 관심 조직, 만나고 싶은 사람 취향, 같은 수업 숨김·스터디 거절·파트너 기록, 알림·위치 설정, 정지 기록
 * - 학교명(showSchool 꺼짐 — 같은 학교 사람에게만), 학과(showDepartment 꺼짐 — 아무에게도)
 * - 투표형 질문: 누가 무엇을 골랐는지 대신 내 표 + 보기별 집계
 * - 관계: 내가 한 쪽인 것만. 받은 관심(♥)은 서로 관심일 때만, 차단은 내가 한 것만 (차단당한 사실은 절대 안 보낸다)
 * - 나를 차단한 사람은 아예 보내지 않는다
 * - 게시물: 누가 공감·저장했는지 대신 내 것 + 공감 수. 익명 글은 글쓴이 본인이 아니면 글쓴이 id 를 지우고,
 *   댓글도 본인 것 말고는 누가 썼는지 지운다 (글쓴이 댓글은 byAuthor 표시만). 운영진은 서버에 남은 글쓴이로 신고를 처리한다
 */
import type { Snapshot } from '@core/api/types';
import type { ID, OpportunityIntentRecord, PollPrompt, Post, ProfileField, Relationships, User } from '@core/types';
import { canViewField, mutualFriends } from './relations';
import { stripGameSecrets } from './icebreakers';

type Rel = Pick<Snapshot, 'relationships' | 'participations' | 'proposals' | 'users'>;

export const PROFILE_FIELDS: ProfileField[] = ['bio', 'likes', 'freeTime', 'height', 'availability', 'preferredPartner', 'purposes', 'interests', 'posts', 'prompts', 'timetable', 'goals', 'living'];

/** 공개 범위 항목 하나가 담고 있는 프로필 키 — 이 항목이 닫혀 있으면 이 키들을 보내지 않는다 */
export const FIELD_KEYS: Record<ProfileField, readonly (keyof User)[]> = {
  bio: ['bio'],
  likes: ['likes'],
  freeTime: ['freeTime'],
  height: ['height'],
  // 오늘의 질문 답은 '지금 시간 되는지'와 같은 성격이라 availability 를 따른다
  availability: ['availability', 'dailyAnswer'],
  preferredPartner: ['preferredPartner'],
  purposes: ['purposes'],
  interests: ['interests'],
  posts: [], // 프로필의 게시물 그리드 — 글 자체는 글마다의 공개 범위로 거른다
  // 질문 답변(텍스트·음성·투표)과 아이스브레이커 프로필 항목
  prompts: ['prompts', 'voicePrompt', 'poll', 'pickAnswers', 'hotTake', 'twoTruths', 'emojiWeek'],
  timetable: ['timetable'],
  goals: ['goals'],
  living: ['living'],
};

/**
 * 공개 범위와 상관없이 본인에게만.
 * birthYear: 가입 때 "Only you see this" 라고 말한다 (StartPage) — 16세 이상 확인·같이 타기 18세 이상 확인은 서버가 원본으로 한다
 */
export const OWNER_ONLY_KEYS = ['birthYear', 'gender', 'interestedOrgIds', 'meetPreference', 'showToClassmates', 'studyGroupOptOut', 'partnerSearch', 'suspended'] as const satisfies readonly (keyof User)[];

/** owner 가 viewer 를 차단했으면 viewer 는 owner 에 대해 아무것도 받지 않는다 */
export const blockedBy = (s: Pick<Snapshot, 'relationships'>, viewerId: ID, ownerId: ID) =>
  s.relationships.blocks.some((b) => b.fromId === ownerId && b.toId === viewerId);

/** 이 사람이 owner 프로필에서 볼 수 있는 항목 */
export const visibleFields = (s: Rel, viewer: User, owner: User): ProfileField[] =>
  PROFILE_FIELDS.filter((f) => canViewField(s, viewer, owner, f));

const sameSchool = (a: User, b: User) =>
  a.affiliation.type === 'university' && b.affiliation.type === 'university' && !!a.affiliation.schoolId && a.affiliation.schoolId === b.affiliation.schoolId;

/** 투표형 질문 보기별 표 수 — 서버가 보낸 집계가 있으면 그것, 없으면(본인·오프라인 데모) 표에서 센다 */
export const pollCounts = (poll: PollPrompt) => poll.tally ?? poll.options.map((_, i) => Object.values(poll.votes).filter((v) => v === i).length);

/**
 * viewer 에게 보낼 owner 프로필. 본인이면 그대로.
 * 닫힌 항목·본인 전용 항목은 키째 빠진다. 시간표는 열려 있어도 바쁜 시간 블록만 (수업 이름·강의실·교수·링크·분반은 절대 안 보낸다).
 */
export function profileFor(s: Rel, viewer: User, owner: User): User {
  if (viewer.id === owner.id) return owner;
  const seen = visibleFields(s, viewer, owner);
  const out = { ...stripGameSecrets(owner, viewer.id) } as User;
  const bag = out as unknown as Record<string, unknown>;
  for (const k of OWNER_ONLY_KEYS) delete bag[k];
  for (const f of PROFILE_FIELDS) if (!seen.includes(f)) for (const k of FIELD_KEYS[f]) delete bag[k];
  if (out.timetable) out.timetable = out.timetable.map((c) => ({ id: c.id, name: '', day: c.day, start: c.start, end: c.end, hue: c.hue }));
  if (out.poll) {
    const mine = out.poll.votes[viewer.id];
    out.poll = { ...out.poll, votes: mine === undefined ? {} : { [viewer.id]: mine }, tally: pollCounts(out.poll) };
  }
  if (owner.affiliation.type === 'university') {
    const a = { ...owner.affiliation };
    if (!a.showSchool && !sameSchool(viewer, owner)) { delete a.schoolId; delete a.schoolName; }
    if (!a.showDepartment) delete a.department;
    out.affiliation = a;
  }
  out.settings = { messagePolicy: owner.settings.messagePolicy };
  out.viewable = seen;
  const mutual = mutualFriends(s, viewer.id, owner.id).length;
  if (mutual) out.mutualFriendCount = mutual; else delete out.mutualFriendCount;
  return out;
}

/**
 * viewer 가 받을 관계: 내가 한 쪽인 것만.
 * 받은 관심(♥)은 상대에게 공개되지 않으므로 서로 관심일 때만, 차단은 내가 한 것만.
 */
export function relationshipsFor(r: Relationships, viewerId: ID): Relationships {
  const iLike = new Set(r.likes.filter((l) => l.fromId === viewerId).map((l) => l.toId));
  return {
    likes: r.likes.filter((l) => l.fromId === viewerId || (l.toId === viewerId && iLike.has(l.fromId))),
    follows: r.follows.filter((f) => f.fromId === viewerId || (f.toId === viewerId && f.targetType === 'user')),
    friendRequests: r.friendRequests.filter((q) => q.fromId === viewerId || q.toId === viewerId),
    friends: r.friends.filter((f) => f.a === viewerId || f.b === viewerId),
    blocks: r.blocks.filter((b) => b.fromId === viewerId),
  };
}

/** 익명 글의 학교명 (글쓴이가 학교명을 숨겼으면 없다) */
const anonSchoolOf = (author?: User) => (author?.affiliation.type === 'university' && author.affiliation.showSchool ? author.affiliation.schoolName : undefined);

/**
 * viewer 에게 보낼 게시물 (공개 범위 검사는 부르는 쪽에서).
 * 공감·저장은 내 것만 + 공감 수. 익명 글은 글쓴이가 아니면 글쓴이 id 대신 학교명만, 댓글은 내 것만 누가 썼는지 남긴다.
 */
export function postFor(p: Post, viewerId: ID, author?: User): Post {
  const out: Post = { ...p, likeIds: p.likeIds.includes(viewerId) ? [viewerId] : [], savedIds: p.savedIds.includes(viewerId) ? [viewerId] : [], likeCount: p.likeIds.length };
  if (!p.anonymous) return out;
  if (p.authorId !== viewerId) {
    delete out.authorId;
    const school = anonSchoolOf(author);
    if (school) out.anonSchool = school; else delete out.anonSchool;
  }
  out.comments = p.comments.map(({ authorId, byAuthor: _b, ...c }) => ({
    ...c, ...(authorId === viewerId ? { authorId } : {}), ...(authorId && authorId === p.authorId ? { byAuthor: true } : {}),
  }));
  return out;
}

/** 공감 수 — 서버가 보낸 수가 있으면 그것 */
export const likeCount = (p: Post) => p.likeCount ?? p.likeIds.length;

/**
 * 다른 사람의 기회 RSVP. 저장(saved)은 본인만 보는 것 — 저장만 해 둔 기록(저장하면 '관심'으로 만들어진다)은 아예 보내지 않는다.
 */
export function intentFor(i: OpportunityIntentRecord, viewerId: ID): OpportunityIntentRecord | null {
  if (i.userId === viewerId) return i;
  if (i.saved && i.intent === 'interested') return null;
  const { saved: _s, ...rest } = i;
  return rest;
}
