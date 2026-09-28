import type { Post, User, Organization, Relationships } from '@core/types';
import { sameSchool, isStudentStage, isGradStage, isAlumniStage, sameCity, sameField } from './network';
import { stageKind, promptStageOf, sameResearch, researchMatchesCareer, type CampusScope } from './stage';

const byNew = (a: Post, b: Post) => b.createdAt.localeCompare(a.createdAt);

/** 내 학교 — 인증된 학교 구성원·학교 조직의 글. scope: 'students' 재학생(학부+대학원) · 'grads' 대학원생 · 'alumni' 동문 · 'all' 학교 전체 */
export function feedCampus(posts: Post[], me: User, users: User[], orgs: Organization[], scope: CampusScope = 'all'): Post[] {
  const mySchool = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  return posts.filter((p) => {
    if (p.orgId) return (scope === 'all' || scope === 'students') && orgs.find((o) => o.id === p.orgId)?.schoolId === mySchool;
    const a = users.find((u) => u.id === p.authorId);
    if (!a || !sameSchool(a, me)) return false;
    if (scope === 'students') return isStudentStage(a);
    if (scope === 'grads') return isGradStage(a);
    if (scope === 'alumni') return isAlumniStage(a);
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
  return [...posts].sort((a, b) => score(b) - score(a));
}

/** 글쓰기 공개 범위 4종 (v2): 전체 / 내 학교 / 특정 그룹 / 팔로워 */
export const POST_VISIBILITIES = ['public', 'school', 'group', 'followers'] as const;
