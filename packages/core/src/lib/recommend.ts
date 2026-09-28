import type { Opportunity, OpportunityIntentRecord, User, Stage, PeopleWant } from '@core/types';
import { t } from '@core/i18n';
import type { Snapshot } from '@core/api/types';
import { GOAL_LABELS, PERSON_ROLE_LABELS, INTEREST_LABELS } from './labels';
import { freeBlocks, overlapBlocks, todayIdx, fmtBlock } from './timetable';
import { profileCompletion } from '@core/data/prompts';
import { sameResearch, researchMatchesCareer } from './stage';
import { stageOf, isAlumniStage, isGradStage, isStudentStage, sameSchool, majorOf, sameCity, sameField, cityOf, shortSchool } from './network';
import { mutualFriends } from './relations';

/**
 * 추천 이유의 종류.
 * school 같은 학교 · alumni 같은 학교 동문 · major 같은 전공 · city 같은 지역 · field 같은 분야(업종·직무) · group 같은 그룹 · meet 같은 모임 참여
 * mutual 공통 연결 · interest 관심사 · class 같은 수업 · time 공강 겹침 · living 생활권 · goal 목표 · new 다른 분야(새로운 사람) · opportunity/role 은 카드에 숨김
 */
export type ReasonKind = 'school' | 'alumni' | 'major' | 'city' | 'field' | 'group' | 'meet' | 'mutual' | 'interest' | 'class' | 'time' | 'living' | 'goal' | 'new' | 'opportunity' | 'role' | 'research';
export interface Reason { text: string; weight: number; kind: ReasonKind }

/**
 * 단계별 기본 가중치 — 같은 앱이지만 우선순위만 다르다.
 * 학부생: 학교·전공·수업·공강 비중 높음 / 대학원생: 연구 분야가 가장 크고 다른 학교도 가깝게 / 졸업생: 지역·분야·직무 비중 높고 학교는 여러 요소 중 하나로 내려간다.
 */
export const REASON_WEIGHTS: Record<'student' | 'grad' | 'alumni', Record<ReasonKind, number>> = {
  student: { school: 3, alumni: 1, major: 3, city: 1, field: 1, group: 2, meet: 2, mutual: 2, interest: 2, class: 3, time: 3, living: 2, goal: 3, new: 1, opportunity: 5, role: 4, research: 2 },
  grad: { school: 2, alumni: 2, major: 2, city: 1, field: 2, group: 2, meet: 2, mutual: 2, interest: 1.5, class: 1, time: 1, living: 1, goal: 2, new: 2, opportunity: 4, role: 3, research: 5 },
  alumni: { school: 2, alumni: 2, major: 1, city: 4, field: 4, group: 2, meet: 2, mutual: 2, interest: 2, class: 0, time: 0, living: 1, goal: 1, new: 1, opportunity: 3, role: 2, research: 2 },
};
const weightsFor = (s: Stage) => (s === 'alumni' || s === 'professional' ? REASON_WEIGHTS.alumni : s === 'masters' || s === 'phd' ? REASON_WEIGHTS.grad : REASON_WEIGHTS.student);

/** 어떤 사람을 찾는지(wants.people) → 해당 이유의 가중치 ×2 */
const WANT_KINDS: Record<PeopleWant, ReasonKind[]> = {
  same_major: ['major'], same_interest: ['interest'], other_school: ['new'], senior_mentor: [], alumni: ['alumni'], same_city: ['city'], same_field: ['field', 'research'], new_people: ['new'], same_research: ['research'],
};

const STAGE_RANK: Record<Stage, number> = { undergrad: 0, masters: 1, phd: 2, alumni: 3, professional: 3 };
const schoolNameOf = (u: User) => (u.affiliation.type === 'university' ? u.affiliation.schoolName : '');

/** 두 사람이 왜 잘 맞는지 — 카드에 이유를 그대로 보여준다 */
export function matchReasons(me: User, other: User, snap: Pick<Snapshot, 'opportunities' | 'opportunityIntents'> & Partial<Pick<Snapshot, 'organizations' | 'participations' | 'relationships' | 'users'>>, canSeeTimetable: boolean): Reason[] {
  const W = weightsFor(stageOf(me));
  const out: Reason[] = [];
  const bothUni = me.affiliation.type === 'university' && other.affiliation.type === 'university';

  // 학교 · 동문
  if (bothUni && sameSchool(me, other)) {
    if (isAlumniStage(other) && isAlumniStage(me)) out.push({ kind: 'alumni', weight: W.alumni + W.school, text: `${shortSchool(schoolNameOf(other))} ${t('동문')}` });
    else if (isAlumniStage(other)) out.push({ kind: 'alumni', weight: W.alumni + 1, text: `${t('같은 학교 선배')} · ${shortSchool(schoolNameOf(other))}` });
    else out.push({ kind: 'school', weight: W.school, text: t('같은 학교') });
  }
  // 전공
  if (bothUni && majorOf(me) && majorOf(me) === majorOf(other)) out.push({ kind: 'major', weight: W.major, text: `${t('같은 전공')} · ${majorOf(other)}` });
  // 지역 (거주 또는 활동)
  if (sameCity(me, other)) out.push({ kind: 'city', weight: W.city, text: `${t('같은 지역')} · ${cityOf(other)}` });
  // 분야 (업종·직무)
  if (sameField(me, other)) out.push({ kind: 'field', weight: W.field, text: `${t('같은 분야')} · ${other.career?.industry ?? other.career?.role}` });
  // 연구 분야 — 대학원생끼리 · 대학원생 ↔ 그 분야에서 일하는 사람
  if (sameResearch(me, other)) out.push({ kind: 'research', weight: W.research, text: `${t('같은 연구 분야')} · ${other.research!.field}` });
  else if (me.research && isAlumniStage(other) && researchMatchesCareer(me.research, other.career)) out.push({ kind: 'research', weight: W.research * 0.8, text: `${t('내 연구 분야에서 일해요')} · ${other.career?.role ?? other.career?.industry}` });
  else if (other.research && isAlumniStage(me) && researchMatchesCareer(other.research, me.career)) out.push({ kind: 'research', weight: W.research, text: `${t('내 분야를 연구해요')} · ${other.research.field}` });
  // 그룹
  const sharedOrg = snap.organizations?.find((o) => o.memberIds.includes(me.id) && o.memberIds.includes(other.id));
  if (sharedOrg) out.push({ kind: 'group', weight: W.group, text: `${t('같은 그룹')} · ${sharedOrg.name}` });
  // 모임 참여
  if (snap.participations) {
    const mine = new Set(snap.participations.filter((p) => p.userId === me.id && p.status === 'approved').map((p) => p.activityId));
    if (snap.participations.some((p) => p.userId === other.id && p.status === 'approved' && mine.has(p.activityId))) out.push({ kind: 'meet', weight: W.meet, text: t('같은 모임에 참여했어요') });
  }
  // 공통 연결
  if (snap.relationships && snap.users) {
    const m = mutualFriends({ relationships: snap.relationships, participations: snap.participations ?? [], proposals: [], users: snap.users }, me.id, other.id);
    if (m.length) out.push({ kind: 'mutual', weight: W.mutual, text: `${t('공통 연결')} ${m.length}${t('명')}` });
  }
  // 관심사
  const interests = me.interests.filter((i) => other.interests.includes(i));
  if (interests.length) out.push({ kind: 'interest', weight: W.interest * Math.min(interests.length, 3) / 2 + 0.5, text: `${t('같은 관심사')} · ${interests.slice(0, 3).map((i) => INTEREST_LABELS[i]).join('·')}` });
  // 수업 · 공강 (재학생끼리만)
  if (isStudentStage(me) && isStudentStage(other)) {
    const myCourses = new Set(me.timetable.map((c) => c.name));
    const sharedCourse = other.timetable.find((c) => myCourses.has(c.name));
    if (sharedCourse) out.push({ kind: 'class', weight: W.class, text: `${t('같은 수업을 들어요: ')}${sharedCourse.name}` });
    if (canSeeTimetable && me.timetable.length && other.timetable.length) {
      const ov = overlapBlocks(freeBlocks(me.timetable, todayIdx()), freeBlocks(other.timetable, todayIdx()));
      if (ov.length) { const b = ov.sort((a, c) => (c.end - c.start) - (a.end - a.start))[0]; out.push({ kind: 'time', weight: W.time, text: `${t('오늘 ')}${fmtBlock(b)}${t(' 공강이 겹쳐요')}` }); }
    }
    if (me.living && other.living && me.living.zone === other.living.zone) out.push({ kind: 'living', weight: W.living, text: `${t('같은 생활권이에요 (')}${me.living.zone})` });
  }
  // 목표 · 역할 · 기회 (기존)
  const goals = isStudentStage(me) && isStudentStage(other) ? me.goals.filter((g) => other.goals.includes(g)) : [];
  if (goals.length) out.push({ kind: 'goal', weight: W.goal, text: `${t('이번 학기 목표가 같아요: ')}${goals.slice(0, 2).map((g) => GOAL_LABELS[g]).join(', ')}` });
  const myOpps = new Set(snap.opportunityIntents.filter((i) => i.userId === me.id).map((i) => i.opportunityId));
  const shared = snap.opportunityIntents.filter((i) => i.userId === other.id && myOpps.has(i.opportunityId));
  for (const s of shared.slice(0, 1)) {
    const o = snap.opportunities.find((x) => x.id === s.opportunityId);
    if (o) out.push({ kind: 'opportunity', weight: W.opportunity, text: `${o.title}${t('에 ')}${s.intent === 'going' ? t('지원 예정') : t('관심')}` });
  }
  const roleMatch = other.canOffer.filter((r) => me.lookingFor.includes(r));
  if (roleMatch.length) out.push({ kind: 'role', weight: W.role, text: `${t('당신이 찾는 ')}${PERSON_ROLE_LABELS[roleMatch[0]]}${t(' 역할을 할 수 있어요')}` });
  // 새로운 사람 — 다른 학교 또는 다른 분야
  if (bothUni && !sameSchool(me, other)) out.push({ kind: 'new', weight: W.new, text: `${t('다른 학교')} · ${shortSchool(schoolNameOf(other))}` });
  else if (bothUni && majorOf(me) !== majorOf(other) && interests.length === 0) out.push({ kind: 'new', weight: W.new * 0.5, text: `${t('다른 분야 (')}${majorOf(other)})` });

  // wants 부스트
  const wants = me.wants?.people ?? [];
  if (wants.length) {
    const boosted = new Set(wants.flatMap((w) => WANT_KINDS[w]));
    out.forEach((r) => { if (boosted.has(r.kind)) r.weight *= 2; });
    if (wants.includes('senior_mentor') && STAGE_RANK[stageOf(other)] > STAGE_RANK[stageOf(me)]) out.push({ kind: 'alumni', weight: 3, text: t('선배·멘토가 될 수 있어요') });
  }
  // 기존 meetPreference 도 약하게 반영
  const pref = me.meetPreference;
  if (pref.length) {
    const kindToPref: Partial<Record<ReasonKind, string>> = { interest: 'same_hobby', class: 'same_class', goal: 'same_goal', opportunity: 'same_goal', role: 'same_goal', living: 'same_living', new: 'new_people' };
    out.forEach((r) => { const p = kindToPref[r.kind]; if (p && pref.includes(p as never)) r.weight *= 1.5; });
  }
  // 표시 순서: 단계별로 사람이 먼저 이해할 맥락부터
  const order: ReasonKind[] = isAlumniStage(me)
    ? ['city', 'field', 'research', 'alumni', 'school', 'mutual', 'group', 'meet', 'interest', 'major', 'new', 'goal', 'living', 'class', 'time', 'opportunity', 'role']
    : isGradStage(me)
      ? ['research', 'school', 'major', 'mutual', 'group', 'meet', 'new', 'interest', 'alumni', 'field', 'city', 'goal', 'class', 'time', 'living', 'opportunity', 'role']
      : ['school', 'major', 'class', 'time', 'interest', 'group', 'meet', 'mutual', 'city', 'alumni', 'research', 'field', 'goal', 'living', 'new', 'opportunity', 'role'];
  const rank = (k: ReasonKind) => order.indexOf(k);
  return out.sort((a, b) => rank(a.kind) - rank(b.kind) || b.weight - a.weight);
}

/** 카드·프로필에 보여줄 이유 — 역할 매칭·기회는 숨긴다 (같은 학교는 v2부터 표시) */
export const shareableReasons = (rs: Reason[]) => rs.filter((r) => r.kind !== 'role' && r.kind !== 'opportunity');

/** 짧은 칩 텍스트 ("같은 학교", "같은 전공") — 카드 상단 이유 칩용 */
export const reasonChip = (r: Reason) => r.text.split(' · ')[0].split(':')[0].trim();

/** 추천 점수 = 이유 가중치 합 × 프로필 완성도 보너스 */
export function matchScore(me: User, other: User, snap: Parameters<typeof matchReasons>[2], canSeeTimetable: boolean) {
  const reasons = matchReasons(me, other, snap, canSeeTimetable);
  const base = reasons.reduce((a, r) => a + r.weight, 0);
  const boost = 1 + profileCompletion(other).percent / 200; // 완성도 100% → 1.5배 노출
  return { score: base * boost, reasons };
}

/** 기회 추천 점수: 목표·관심사·학교·마감 임박 */
export function opportunityScore(me: User, o: Opportunity, intents: OpportunityIntentRecord[]) {
  let s = 0;
  const reasons: string[] = [];
  const g = o.goals.filter((x) => me.goals.includes(x));
  if (g.length) { s += 5; reasons.push(`${t('목표: ')}${GOAL_LABELS[g[0]]}`); }
  const it = o.interests.filter((x) => me.interests.includes(x));
  if (it.length) { s += 2 * it.length; reasons.push(`${t('관심사: ')}${it.map((i) => INTEREST_LABELS[i]).join('·')}`); }
  if (o.rolesNeeded?.some((r) => me.canOffer.includes(r))) { s += 3; reasons.push(`${PERSON_ROLE_LABELS[o.rolesNeeded.find((r) => me.canOffer.includes(r))!]}${t(' 역할 필요')}`); }
  if (o.orgId && me.interestedOrgIds.includes(o.orgId)) { s += 4; reasons.push(t('관심 조직')); }
  if (o.schoolId && me.affiliation.type === 'university' && o.schoolId === me.affiliation.schoolId) s += 1;
  const peers = intents.filter((i) => i.opportunityId === o.id && i.userId !== me.id).length;
  s += Math.min(peers, 5) * 0.3;
  if (o.deadline) { const d = daysUntil(o.deadline); if (d >= 0 && d <= 7) { s += 1; } }
  return { score: s, reasons };
}

/** 같이 가는 종류(사람 찾기 의미 있음) vs 정보성 공고 */
export const isTogetherType = (type: import('@core/types').OpportunityType) => ['event', 'club', 'hackathon', 'startup', 'activity'].includes(type);

export function daysUntil(iso: string) {
  const today = new Date(new Date().toISOString().slice(0, 10));
  return Math.round((new Date(iso).getTime() - today.getTime()) / 86400000);
}
export function dday(iso: string) { const d = daysUntil(iso); return d < 0 ? t('마감') : d === 0 ? 'D-Day' : `D-${d}`; }
