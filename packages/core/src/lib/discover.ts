import type { Activity, ActivityCategory, Organization, Opportunity, Role } from '@core/types';
import { t } from '@core/i18n';
import { toMin, nowMin } from './timetable';
import { todayISO } from './format';
import { campusDate } from './listings';

/** 팀 성격의 활동: 역할 모집이 있거나 Study Crew */
export const isTeamActivity = (a: Activity) => (a.rolesNeeded?.length ?? 0) > 0 || !!a.courseName;

/** 오늘 안에 시작하고 아직 끝나지 않은 가벼운 활동 (Now 피드) */
export function nowActivities(acts: Activity[], meId: string) {
  const today = todayISO(); const now = nowMin();
  return acts.filter((a) => a.date === today && toMin(a.endTime) > now - 10 && a.hostId !== meId && !isTeamActivity(a) && a.category !== 'store_deal')
    .map((a) => ({ a, inMin: toMin(a.startTime) - now })).sort((x, y) => x.inMin - y.inMin);
}

export const NOW_TIME_CHIPS = [
  { key: 'now', label: t('지금'), max: 15 }, { key: '30', label: t('30분 이내'), max: 30 }, { key: '60', label: t('1시간 이내'), max: 60 }, { key: 'today', label: t('오늘'), max: 24 * 60 },
] as const;
export type NowTimeKey = typeof NOW_TIME_CHIPS[number]['key'];

export const NOW_CAT_CHIPS: { key: string; label: string; cats: ActivityCategory[] | null }[] = [
  { key: 'all', label: t('전체'), cats: null }, { key: 'meal', label: t('밥'), cats: ['meal'] }, { key: 'coffee', label: t('카페'), cats: ['coffee'] }, { key: 'walk', label: t('산책'), cats: ['etc'] },
  { key: 'study', label: t('공부'), cats: ['study', 'seminar'] }, { key: 'exercise', label: t('운동'), cats: ['exercise'] }, { key: 'etc', label: t('기타'), cats: ['club', 'performance', 'school_event', 'networking'] },
];

export const ACTIVITY_CHIPS: { key: string; label: string; cats: ActivityCategory[] | null; oppTypes?: Opportunity['type'][] }[] = [
  { key: 'all', label: t('전체'), cats: null },
  { key: 'food', label: t('식사·카페'), cats: ['meal', 'coffee'], oppTypes: ['activity'] },
  { key: 'exercise', label: t('운동'), cats: ['exercise'] },
  { key: 'show', label: t('공연·행사'), cats: ['performance', 'school_event', 'club'], oppTypes: ['event', 'club'] },
  { key: 'study', label: t('공부·세미나'), cats: ['study', 'seminar'] },
  { key: 'hobby', label: t('취미·나들이'), cats: ['etc'] },
  { key: 'network', label: t('네트워킹'), cats: ['networking'], oppTypes: ['startup'] },
];

export const TEAM_PURPOSE_CHIPS: { key: string; label: string }[] = [
  { key: 'all', label: t('전체') }, { key: 'study', label: t('스터디') }, { key: 'project', label: t('팀플·프로젝트') }, { key: 'hackathon', label: t('해커톤·공모전') },
  { key: 'startup', label: t('창업') }, { key: 'research', label: t('연구') }, { key: 'crew', label: t('운동 크루') }, { key: 'club', label: t('동아리') },
];

export type TeamItem =
  | { kind: 'activity'; id: string; when: string; activity: Activity; purpose: string; roles: Role[]; mode?: 'offline' | 'online'; open: boolean }
  | { kind: 'opp'; id: string; when: string; opp: Opportunity; purpose: string; roles: Role[]; open: boolean }
  | { kind: 'org'; id: string; when: string; org: Organization; purpose: 'club'; roles: Role[]; open: boolean };

function activityPurpose(a: Activity): string {
  if (a.courseName) return a.crewType === 'project' ? 'project' : 'study';
  if (a.opportunityId) return 'hackathon';
  if (a.category === 'exercise') return 'crew';
  if (a.category === 'networking') return 'startup';
  if (a.category === 'seminar') return 'research';
  if (a.category === 'club') return 'club';
  return 'project';
}

/** Teams 탭 항목: 팀원 모집 활동 + Study Crew + 팀 기반 기회 + 동아리 모집 */
export function teamItems(acts: Activity[], opps: Opportunity[], orgs: Organization[], meId: string, approvedCount: (id: string) => number): TeamItem[] {
  const today = todayISO();
  const out: TeamItem[] = [];
  acts.filter((a) => isTeamActivity(a) && a.date >= today).forEach((a) => out.push({ kind: 'activity', id: `a_${a.id}`, when: a.createdAt, activity: a, purpose: activityPurpose(a), roles: a.rolesNeeded ?? [], mode: a.mode, open: approvedCount(a.id) < a.capacity && a.hostId !== meId }));
  opps.filter((o) => (o.rolesNeeded?.length ?? 0) > 0).forEach((o) => out.push({ kind: 'opp', id: `o_${o.id}`, when: o.createdAt, opp: o, purpose: o.type === 'startup' ? 'startup' : o.type === 'lab' ? 'research' : 'hackathon', roles: o.rolesNeeded ?? [], open: !o.deadline || campusDate(o.deadline) >= today }));
  orgs.filter((o) => o.recruitment?.open).forEach((o) => out.push({ kind: 'org', id: `g_${o.id}`, when: o.notices[0]?.createdAt ?? '', org: o, purpose: 'club', roles: [], open: true }));
  return out.sort((x, y) => y.when.localeCompare(x.when));
}
