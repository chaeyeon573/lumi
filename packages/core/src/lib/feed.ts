import type { Post, PostAudience, User, Organization, Relationships } from '@core/types';
import { sameSchool, isStudentStage, isGradStage, isAlumniStage, sameCity, sameField } from './network';
import { stageKind, promptStageOf, sameResearch, researchMatchesCareer, type CampusScope } from './stage';

const byNew = (a: Post, b: Post) => b.createdAt.localeCompare(a.createdAt);

/** 모두에게 보이는 글 종류 — 후배 질문 받아요 · 채용 · 학교 소식 */
const OPEN_TOPICS = ['ama', 'hiring', 'info_scholar'];
const STUDENT_TOPICS = ['class_q', 'together_meal', 'club_review'];
const STUDENT_TEXT = /(팀원 모집|해커톤 팀|혼밥|looking for teammates|hackathon team|eating alone)/i;
const STUDENT_TAGS = /^(팀원모집|해커톤|혼밥|시험기간|공강|hackathon|teammates?|study ?group)$/i;
/**
 * 글이 속한 공간 — 재학생(학부·대학원) / 동문 / 모두.
 * 작성자가 고른 값이 있으면 그대로, 없으면: 동아리·학교 조직 글과 '후배 질문 받아요'·채용 글은 모두, 그 외에는 작성자 단계.
 * → 졸업생 피드에 "해커톤 팀 구해요"·"혼밥" 같은 재학생 글이 섞이지 않는다.
 */
export function postAudienceOf(p: Post, author?: User): PostAudience {
  if (p.audience) return p.audience;
  if (p.authorType === 'org' || p.sponsored) return 'all';
  if ((p.topics ?? []).some((tp) => OPEN_TOPICS.includes(tp))) return 'all';
  // 수업 질문 · 같이 밥/공부 · 동아리 후기 · 팀원 모집은 누가 써도 재학생 공간
  if ((p.topics ?? []).some((tp) => STUDENT_TOPICS.includes(tp)) || (p.tags ?? []).some((tg) => STUDENT_TAGS.test(tg)) || STUDENT_TEXT.test(p.text)) return 'students';
  if (!author) return 'all';
  return isAlumniStage(author) ? 'alumni' : 'students';
}
/** 이 사람의 피드에 보여도 되는 글인가 (팔로잉·내 학교 '학교 전체'는 예외로 모두 보인다) */
export function inMySpace(p: Post, me: User, author?: User): boolean {
  const a = postAudienceOf(p, author);
  if (a === 'all') return true;
  return a === (isAlumniStage(me) ? 'alumni' : 'students');
}
/** 글쓰기 기본 공간 — 단계와 시작점(topic)에 따라 */
export function defaultAudience(me: User, topic?: string): PostAudience {
  if (topic && OPEN_TOPICS.includes(topic)) return 'all';
  return isAlumniStage(me) ? 'alumni' : 'students';
}

/** 내 학교 — 인증된 학교 구성원·학교 조직의 글. scope: 'students' 재학생(학부+대학원) · 'grads' 대학원생 · 'alumni' 동문 · 'all' 학교 전체 */
export function feedCampus(posts: Post[], me: User, users: User[], orgs: Organization[], scope: CampusScope = 'all'): Post[] {
  const mySchool = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  return posts.filter((p) => {
    if (p.orgId) return (scope === 'all' || scope === 'students') && orgs.find((o) => o.id === p.orgId)?.schoolId === mySchool;
    const a = users.find((u) => u.id === p.authorId);
    if (!a || !sameSchool(a, me)) return false;
    // 작성자 단계 + 글 공간 (졸업생이 재학생에게 쓴 팀원 모집 글은 '동문'에 안 뜬다)
    const aud = postAudienceOf(p, a);
    if (scope === 'students') return (isStudentStage(a) && aud !== 'alumni') || aud === 'students';
    if (scope === 'grads') return isGradStage(a);
    if (scope === 'alumni') return isAlumniStage(a) && aud !== 'students';
    return true;
  }).sort(byNew);
}

/** 팔로잉 — 내가 팔로우한 사람·조직, 연결된 사람, 가입한 그룹의 글 */
export function feedFollowing(posts: Post[], me: User, rel: Relationships, orgs: Organization[]): Post[] {
  const followed = new Set(rel.follows.filter((f) => f.fromId === me.id).map((f) => f.toId));
  const friends = new Set(rel.friends.filter((f) => f.a === me.id || f.b === me.id).map((f) => (f.a === me.id ? f.b : f.a)));
  const myOrgs = new Set(orgs.filter((o) => o.memberIds.includes(me.id) || o.followerIds.includes(me.id)).map((o) => o.id));
  return posts.filter((p) => (p.groupId && myOrgs.has(p.groupId)) || (p.orgId ? myOrgs.has(p.orgId) || followed.has(p.orgId) : followed.has(p.authorId) || friends.has(p.authorId))).sort(byNew);
}

/**
 * 추천 — 학교·지역·관심사·연결·그룹·활동 기반 점수순 (최신성 보정).
 * 단계별: 같은 단계 사람의 글·내 단계의 글 종류(연구 질문·근황…)를 조금 더 위로. 학부생 수업 질문은 졸업생 추천에서 내려간다.
 */
export function feedForYou(posts: Post[], me: User, users: User[], rel: Relationships, orgs: Organization[]): Post[] {
  const following = new Set(feedFollowing(posts, me, rel, orgs).map((p) => p.id));
  const campus = new Set(feedCampus(posts, me, users, orgs).map((p) => p.id));
  const mine = new Set<string>(me.interests);
  const myOrgs = new Set(orgs.filter((o) => o.memberIds.includes(me.id)).map((o) => o.id));
  const myStage = stageKind(me);
  const score = (p: Post) => {
    let s = 0;
    (p.topics ?? []).forEach((tp) => { if (mine.has(tp)) s += 2; });
    if (following.has(p.id)) s += 3;
    if (campus.has(p.id)) s += 1.5;
    if (p.groupId && myOrgs.has(p.groupId)) s += 2;
    const a = users.find((u) => u.id === p.authorId);
    if (a && sameCity(a, me)) s += 1;
    if (a && a.interests.some((i) => mine.has(i))) s += 1;
    if (p.postType === 'question' || p.postType === 'together') s += 0.5;
    // 단계
    const postStage = promptStageOf(p.topics);
    if (postStage === myStage) s += 2.5;
    else if (myStage === 'alumni' && postStage === 'undergrad') s -= 1.5;
    if (a && stageKind(a) === myStage) s += 1;
    if (a && myStage === 'grad' && (sameResearch(a, me) || researchMatchesCareer(me.research, a.career))) s += 2;
    if (a && myStage === 'alumni' && sameField(a, me)) s += 1.5;
    // 졸업생의 "후배 질문 받아요"는 학생·대학원생에게 반가운 글
    if (myStage !== 'alumni' && (p.topics?.includes('ama') || p.topics?.includes('hiring'))) s += 1;
    s += Math.min(p.likeIds.length, 5) * 0.2;
    const ageH = (Date.now() - new Date(p.createdAt).getTime()) / 36e5;
    s -= Math.min(ageH / 24, 3);
    return s;
  };
  const byId = new Map(users.map((u) => [u.id, u]));
  // 추천은 내 공간(재학생 / 동문) + 모두에게 쓴 글만. 특정 사람 글을 다 보고 싶으면 팔로잉 탭
  return posts.filter((p) => inMySpace(p, me, byId.get(p.authorId)))
    .sort((a, b) => score(b) - score(a));
}

/** 글쓰기 공개 범위 4종 (v2): 전체 / 내 학교 / 특정 그룹 / 팔로워 */
export const POST_VISIBILITIES = ['public', 'school', 'group', 'followers'] as const;
