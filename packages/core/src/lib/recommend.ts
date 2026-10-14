import { audienceOf, audienceFits, isGradStudent } from './listings';
import type { ClassRoster, Opportunity, OpportunityIntentRecord, User } from '@core/types';
import { sharedClassWith } from './classmates';
import { t } from '@core/i18n';
import type { Snapshot } from '@core/api/types';
import { GOAL_LABELS, PERSON_ROLE_LABELS, INTEREST_LABELS } from './labels';
import { freeBlocks, overlapBlocks, todayIdx, fmtBlock } from './timetable';
import { profileCompletion } from '@core/data/prompts';

export interface Reason { text: string; weight: number; kind: 'opportunity' | 'goal' | 'role' | 'time' | 'school' | 'living' | 'interest' | 'class' | 'new' }

/** 두 사람이 왜 잘 맞는지 — 카드에 이유를 그대로 보여준다 */
/** classRosters: 서버가 보내 준 같은 수업 목록 — 다른 사람의 수업 이름은 내려오지 않으므로 '같은 수업'은 이것으로만 안다 */
type ReasonSnap = Pick<Snapshot, 'opportunities' | 'opportunityIntents'> & { classRosters?: ClassRoster[] };
export function matchReasons(me: User, other: User, snap: ReasonSnap, canSeeTimetable: boolean): Reason[] {
  const out: Reason[] = [];
  const myOpps = new Set(snap.opportunityIntents.filter((i) => i.userId === me.id).map((i) => i.opportunityId));
  const shared = snap.opportunityIntents.filter((i) => i.userId === other.id && myOpps.has(i.opportunityId));
  for (const s of shared.slice(0, 1)) {
    const o = snap.opportunities.find((x) => x.id === s.opportunityId);
    if (o) out.push({ kind: 'opportunity', weight: 5, text: `${o.title}${t('에 ')}${s.intent === 'going' ? t('지원 예정') : t('관심')}` });
  }
  const roleMatch = other.canOffer.filter((r) => me.lookingFor.includes(r));
  if (roleMatch.length) out.push({ kind: 'role', weight: 4, text: `${t('당신이 찾는 ')}${PERSON_ROLE_LABELS[roleMatch[0]]}${t(' 역할을 할 수 있어요')}` });
  const roleMatch2 = me.canOffer.filter((r) => other.lookingFor.includes(r));
  if (roleMatch2.length) out.push({ kind: 'role', weight: 3, text: `${PERSON_ROLE_LABELS[roleMatch2[0]]}${t('을(를) 찾고 있어요')}` });
  const goals = (me.goals ?? []).filter((g) => (other.goals ?? []).includes(g));
  if (goals.length) out.push({ kind: 'goal', weight: 3, text: `${t('이번 학기 목표가 같아요: ')}${goals.slice(0, 2).map((g) => GOAL_LABELS[g]).join(', ')}` });
  if (canSeeTimetable && me.timetable?.length && other.timetable?.length) {
    const ov = overlapBlocks(freeBlocks(me.timetable, todayIdx()), freeBlocks(other.timetable, todayIdx()));
    if (ov.length) { const b = ov.sort((a, c) => (c.end - c.start) - (a.end - a.start))[0]; out.push({ kind: 'time', weight: 3, text: `${t('오늘 ')}${fmtBlock(b)}${t(' 공강이 겹쳐요')}` }); }
  }
  if (me.living && other.living && me.living.zone === other.living.zone) out.push({ kind: 'living', weight: 2, text: `${t('같은 생활권이에요 (')}${me.living.zone})` });
  const interests = (me.interests ?? []).filter((i) => (other.interests ?? []).includes(i));
  if (interests.length >= 2) out.push({ kind: 'interest', weight: 2, text: `${interests.slice(0, 3).map((i) => INTEREST_LABELS[i]).join('·')}${t('에 관심')}` });
  const sharedCourse = sharedClassWith(snap.classRosters, other.id);
  if (sharedCourse) out.push({ kind: 'class', weight: 3, text: `${t('같은 수업을 들어요: ')}${sharedCourse.code}` });
  if (me.affiliation.type === 'university' && other.affiliation.type === 'university') {
    if (me.affiliation.schoolId && me.affiliation.schoolId === other.affiliation.schoolId) out.push({ kind: 'school', weight: 1, text: t('같은 학교') });
    if (me.affiliation.department && other.affiliation.department && me.affiliation.department !== other.affiliation.department && interests.length === 0) out.push({ kind: 'new', weight: 1, text: `${t('다른 분야 (')}${other.affiliation.department})` });
  }
  // 어떤 사람을 만나고 싶은지에 따라 가중치 조정
  const pref = me.meetPreference ?? [];
  if (pref.length) {
    const boost: Record<string, number> = { same_hobby: pref.includes('same_hobby') ? 2 : 1, same_class: pref.includes('same_class') ? 2 : 1, same_goal: pref.includes('same_goal') ? 2 : 1, same_living: pref.includes('same_living') ? 2 : 1, new_people: pref.includes('new_people') ? 2 : 1 };
    const kindToPref: Record<string, string> = { interest: 'same_hobby', class: 'same_class', goal: 'same_goal', opportunity: 'same_goal', role: 'same_goal', living: 'same_living', new: 'new_people' };
    out.forEach((r) => { const p = kindToPref[r.kind]; if (p) r.weight *= boost[p]; if (pref.includes('new_people') && (r.kind === 'interest' || r.kind === 'class')) r.weight *= 0.5; });
  }
  // 카드에는 '역할·기회'가 아니라 같은 수업·관심사·시간처럼 공유하는 것을 먼저 보여준다
  const order: Record<Reason['kind'], number> = { class: 0, interest: 1, time: 2, living: 3, goal: 4, new: 5, school: 6, opportunity: 7, role: 8 };
  return out.sort((a, b) => order[a.kind] - order[b.kind] || b.weight - a.weight);
}

/** 카드·프로필에 보여줄 이유 — 역할 매칭·기회는 숨긴다 */
export const shareableReasons = (rs: Reason[]) => rs.filter((r) => r.kind !== 'role' && r.kind !== 'opportunity' && r.kind !== 'school');

/** 추천 점수 = 이유 가중치 합 × 프로필 완성도 보너스 */
export function matchScore(me: User, other: User, snap: ReasonSnap, canSeeTimetable: boolean) {
  const reasons = matchReasons(me, other, snap, canSeeTimetable);
  // 대학원생끼리는 먼저 — 연구실 밖에서 같은 처지의 사람을 만나기 어렵다
  if (isGradStudent(me) && isGradStudent(other)) reasons.push({ text: t('같은 대학원생'), weight: 3, kind: 'school' });
  const base = reasons.reduce((a, r) => a + r.weight, 0);
  const boost = 1 + profileCompletion(other).percent / 200; // 완성도 100% → 1.5배 노출
  return { score: base * boost, reasons };
}

/** 기회 추천 점수: 목표·관심사·학교·마감 임박 */
export function opportunityScore(me: User, o: Opportunity, intents: OpportunityIntentRecord[]) {
  let s = 0;
  const reasons: string[] = [];
  const g = o.goals.filter((x) => (me.goals ?? []).includes(x));
  if (g.length) { s += 5; reasons.push(`${t('목표: ')}${GOAL_LABELS[g[0]]}`); }
  const it = o.interests.filter((x) => (me.interests ?? []).includes(x));
  if (it.length) { s += 2 * it.length; reasons.push(`${t('관심사: ')}${it.map((i) => INTEREST_LABELS[i]).join('·')}`); }
  if (o.rolesNeeded?.some((r) => me.canOffer.includes(r))) { s += 3; reasons.push(`${PERSON_ROLE_LABELS[o.rolesNeeded.find((r) => me.canOffer.includes(r))!]}${t(' 역할 필요')}`); }
  if (o.orgId && me.interestedOrgIds?.includes(o.orgId)) { s += 4; reasons.push(t('관심 조직')); }
  if (o.schoolId && me.affiliation.type === 'university' && o.schoolId === me.affiliation.schoolId) s += 1;
  const peers = intents.filter((i) => i.opportunityId === o.id && i.userId !== me.id).length;
  s += Math.min(peers, 5) * 0.3;
  if (o.deadline) { const d = daysUntil(o.deadline); if (d >= 0 && d <= 7) { s += 1; } }
  // 대상(대학원생/학부생)이 맞으면 올리고, 아니면 맨 아래로
  const aud = audienceOf(o);
  if (aud !== 'all') { if (audienceFits(me, o)) { s += 4; if (aud === 'grad') reasons.push(t('대학원생 대상')); } else s -= 8; }
  return { score: s, reasons };
}

/** 같이 가는 종류(사람 찾기 의미 있음) vs 정보성 공고 */
export const isTogetherType = (type: import('@core/types').OpportunityType) => ['event', 'club', 'hackathon', 'startup', 'activity'].includes(type);

/** 캠퍼스(버클리) 달력 기준 남은 날 — 시각이 붙은 마감(…T23:59Z)도 그날 날짜로 센다. 반올림하면 내일 마감이 D-2 로 보였다 */
const campusDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
export function daysUntil(iso: string) {
  const day = /T/.test(iso) ? campusDay(new Date(iso)) : iso.slice(0, 10);
  return Math.round((Date.parse(`${day}T12:00:00Z`) - Date.parse(`${campusDay(new Date())}T12:00:00Z`)) / 86400000);
}
export function dday(iso: string) { const d = daysUntil(iso); return d < 0 ? t('마감') : d === 0 ? 'D-Day' : `D-${d}`; }
