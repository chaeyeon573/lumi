/**
 * 모임 탭 — 추천 | 그룹 | 일정.
 * 모임은 목적이 아니라 사람 사이의 연결을 행동으로 잇는 수단: 추천은 wants.activities · 관심사 · 지역 · 내 학교 · 같은 그룹 순.
 */
import type { Activity, Organization, User, Participation, GroupScope } from '@core/types';
import { t } from '@core/i18n';
import { todayISO, addDaysISO } from './format';
import { ACTIVITY_WANT_CATEGORIES } from './wants';
import { cityOf, citiesOf, sameSchool, isAlumniStage } from './network';

export interface RecommendedMeet { a: Activity; score: number; reason: string }

const lc = (s?: string) => (s ?? '').toLowerCase();
const inCity = (a: Activity, me: User) => citiesOf(me).some((c) => lc(a.place.name).includes(lc(c)) || lc(a.place.address).includes(lc(c)) || lc(a.place.area).includes(lc(c)));

/** 추천 모임 — 참여하지 않은 다가오는 모임을 현재 맥락으로 순위 매김 (타학교 공개 모임 포함) */
export function recommendMeets(acts: Activity[], me: User, users: User[], orgs: Organization[], participations: Participation[], limit = 12): RecommendedMeet[] {
  const today = todayISO();
  const joined = new Set(participations.filter((p) => p.userId === me.id && (p.status === 'approved' || p.status === 'pending')).map((p) => p.activityId));
  const wantCats = new Set((me.wants?.activities ?? []).flatMap((w) => ACTIVITY_WANT_CATEGORIES[w]));
  const myOrgs = new Set(orgs.filter((o) => o.memberIds.includes(me.id)).map((o) => o.id));
  return acts
    .filter((a) => a.date >= today && a.hostId !== me.id && !joined.has(a.id) && a.category !== 'store_deal')
    .map((a) => {
      let s = 0; const why: string[] = [];
      if (wantCats.has(a.category)) { s += 4; why.push(t('하고 싶은 활동')); }
      if (a.orgId && myOrgs.has(a.orgId)) { s += 3; why.push(t('내 그룹')); }
      const host = users.find((u) => u.id === a.hostId);
      if (host && sameSchool(host, me)) { s += isAlumniStage(me) ? 1 : 2; why.push(t('내 학교')); }
      if (inCity(a, me)) { s += isAlumniStage(me) ? 3 : 1; why.push(cityOf(me)); }
      if (host && host.interests.some((i) => me.interests.includes(i))) { s += 1; if (!why.length) why.push(t('관심사가 비슷한 주최자')); }
      if (a.date === today) s += 1;
      return { a, score: s, reason: why.slice(0, 2).join(' · ') || t('공개 모임') };
    })
    .sort((x, y) => y.score - x.score || x.a.date.localeCompare(y.a.date) || x.a.startTime.localeCompare(y.a.startTime))
    .slice(0, limit);
}

export const GROUP_SCOPE_LABELS: Record<GroupScope, string> = { school: t('학교'), city: t('지역'), interest: t('관심사'), career: t('직업') };
export const GROUP_SCOPE_EMOJI: Record<GroupScope, string> = { school: '🏫', city: '📍', interest: '🎯', career: '💼' };

/** 그룹의 성격 — 자유 그룹은 scope, 기존 조직(동아리·학과·연구실…)은 학교 */
export const scopeOf = (o: Organization): GroupScope => o.scope ?? 'school';

export interface RecommendedGroup { o: Organization; reason: string; score: number }
/** 추천 그룹 — 가입하지 않은 그룹을 관심사·지역·학교·직업 맥락으로 */
export function recommendGroups(orgs: Organization[], me: User, limit = 8): RecommendedGroup[] {
  const mySchool = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  return orgs
    .filter((o) => !o.memberIds.includes(me.id) && !o.adminIds.includes(me.id))
    .map((o) => {
      let s = 0; const why: string[] = [];
      const shared = (o.interests ?? []).filter((i) => me.interests.includes(i));
      if (shared.length) { s += 2 * shared.length; why.push(t('같은 관심사')); }
      if (o.city && citiesOf(me).some((c) => lc(c) === lc(o.city))) { s += isAlumniStage(me) ? 3 : 1; why.push(o.city); }
      if (o.schoolId && o.schoolId === mySchool) { s += isAlumniStage(me) ? 1 : 2; why.push(t('내 학교')); }
      if (scopeOf(o) === 'career' && me.career?.industry && lc(o.description).includes(lc(me.career.industry))) { s += 3; why.push(t('같은 분야')); }
      if (o.followerIds.includes(me.id)) { s += 1; why.push(t('팔로우 중')); }
      return { o, reason: why.slice(0, 2).join(' · ') || GROUP_SCOPE_LABELS[scopeOf(o)], score: s };
    })
    .sort((a, b) => b.score - a.score || b.o.memberIds.length - a.o.memberIds.length)
    .slice(0, limit);
}

export const myGroups = (orgs: Organization[], me: User) => orgs.filter((o) => o.memberIds.includes(me.id) || o.adminIds.includes(me.id));

export interface ScheduleBucket { key: 'today' | 'week' | 'later'; label: string; items: Activity[] }
/** 내 일정 — 주최하거나 참여(승인·대기)한 모임을 오늘 / 이번 주 / 이후로 */
export function mySchedule(acts: Activity[], me: User, participations: Participation[]): ScheduleBucket[] {
  const today = todayISO(); const week = addDaysISO(7);
  const mine = new Set(participations.filter((p) => p.userId === me.id && (p.status === 'approved' || p.status === 'pending')).map((p) => p.activityId));
  const list = acts.filter((a) => a.date >= today && (a.hostId === me.id || mine.has(a.id))).sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
  return [
    { key: 'today', label: t('오늘'), items: list.filter((a) => a.date === today) },
    { key: 'week', label: t('이번 주'), items: list.filter((a) => a.date > today && a.date <= week) },
    { key: 'later', label: t('이후'), items: list.filter((a) => a.date > week) },
  ];
}

/** 참여 상태 */
export const joinStateOf = (a: Activity, me: User, participations: Participation[]): 'host' | 'approved' | 'pending' | 'none' => {
  if (a.hostId === me.id) return 'host';
  const p = participations.find((x) => x.activityId === a.id && x.userId === me.id && (x.status === 'approved' || x.status === 'pending'));
  return p ? (p.status === 'approved' ? 'approved' : 'pending') : 'none';
};

/** Small Table 추천 — 4~6명 작은 모임을 나와의 공통점으로. 숨긴 모임 제외, 자리 남은 것만 */
export interface SmallTableRec { a: Activity; reasons: string[]; filled: number; sharedPeople: User[] }
export function recommendSmallTables(acts: Activity[], me: User, users: User[], participations: Participation[], limit = 10): SmallTableRec[] {
  const today = todayISO();
  const hidden = new Set(me.hiddenActivities ?? []);
  const wantCats = new Set((me.wants?.activities ?? []).flatMap((w) => ACTIVITY_WANT_CATEGORIES[w]));
  return acts
    .filter((a) => a.capacity >= 3 && a.capacity <= 6 && a.category !== 'store_deal' && a.date >= today && !hidden.has(a.id) && a.hostId !== me.id)
    .map((a) => {
      const partIds = participations.filter((p) => p.activityId === a.id && p.status === 'approved').map((p) => p.userId);
      const people = [a.hostId, ...partIds].map((id) => users.find((u) => u.id === id)).filter((u): u is User => !!u);
      const filled = people.length;
      const reasons: string[] = [];
      if (wantCats.has(a.category)) reasons.push(t('하고 싶은 활동'));
      const sharedPeople = people.filter((u) => u.interests.some((i) => me.interests.includes(i)));
      if (sharedPeople.length) reasons.push(`${t('관심사가 겹치는 사람')} ${sharedPeople.length}${t('명')}`);
      if (people.some((u) => sameSchool(u, me))) reasons.push(t('같은 학교 사람'));
      if (inCity(a, me)) reasons.push(cityOf(me));
      return { a, reasons, filled, sharedPeople, score: reasons.length * 2 + sharedPeople.length };
    })
    .filter((x) => x.filled < x.a.capacity && x.reasons.length > 0)
    .sort((x, y) => y.score - x.score || x.a.date.localeCompare(y.a.date))
    .slice(0, limit)
    .map(({ a, reasons, filled, sharedPeople }) => ({ a, reasons, filled, sharedPeople }));
}
