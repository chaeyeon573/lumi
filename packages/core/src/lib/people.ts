/**
 * 사람 탭 — 추천 · 찾기.
 * - recommendPeople: 학교로 나누지 않고 모든 사람을 현재 맥락(단계·wants·학교·전공·지역·분야·관심사·그룹·모임·연결)으로 순위 매김
 * - searchPeople / isAdvancedSearch: 찾기. 무료 = 키워드 + 필터 1그룹, 유료 = 복수 조건 · 상세 조건(회사·업종·직무·졸업연도·활동 지역)
 */
import type { Snapshot } from '@core/api/types';
import type { PeopleSearch, Stage, User, Interest } from '@core/types';
import { t } from '@core/i18n';
import { INTEREST_LABELS } from './labels';
import { matchScore, shareableReasons, type Reason } from './recommend';
import { isBlocked } from './relations';
import { cityOf, gradYearOf, majorOf, schoolIdOf, stageOf, isAlumniStage, isGradStage, shortSchool, citiesOf } from './network';

export interface RecommendedPerson { user: User; reasons: Reason[]; score: number }

/** 추천 — 이유가 하나도 없는 사람은 뒤로 보낸다. 다른 학교 사람도 포함(무료) */
export function recommendPeople(snap: Snapshot, me: User, users: User[], canSeeTimetable: (u: User) => boolean, limit = 20): RecommendedPerson[] {
  return users
    .filter((u) => u.id !== me.id && !isBlocked(snap, me.id, u.id))
    .map((u) => { const r = matchScore(me, u, snap, canSeeTimetable(u)); return { user: u, reasons: shareableReasons(r.reasons), score: r.score }; })
    .sort((a, b) => b.score - a.score || a.user.nickname.localeCompare(b.user.nickname))
    .slice(0, limit);
}

export const EMPTY_SEARCH: PeopleSearch = { q: '', schools: [], majors: [], homeCities: [], activityCities: [], companies: [], industries: [], roles: [], interests: [], stages: [] };
export const emptySearch = (): PeopleSearch => ({ ...EMPTY_SEARCH, schools: [], majors: [], homeCities: [], activityCities: [], companies: [], industries: [], roles: [], interests: [], stages: [] });

/** 필터 그룹 — 상세(유료) 그룹은 detailed: true */
export type SearchGroup = 'schools' | 'majors' | 'gradYear' | 'homeCities' | 'activityCities' | 'companies' | 'industries' | 'roles' | 'interests' | 'stages';
export const SEARCH_GROUPS: { key: SearchGroup; label: string; detailed: boolean }[] = [
  { key: 'schools', label: t('학교'), detailed: false },
  { key: 'majors', label: t('전공'), detailed: false },
  { key: 'gradYear', label: t('졸업연도'), detailed: true },
  { key: 'homeCities', label: t('거주 지역'), detailed: false },
  { key: 'activityCities', label: t('활동 지역'), detailed: true },
  { key: 'companies', label: t('회사'), detailed: true },
  { key: 'industries', label: t('업종'), detailed: true },
  { key: 'roles', label: t('직무'), detailed: true },
  { key: 'interests', label: t('관심사'), detailed: false },
  { key: 'stages', label: t('사용자 상태'), detailed: false },
];

export function groupsUsed(c: PeopleSearch): SearchGroup[] {
  const out: SearchGroup[] = [];
  if (c.schools.length) out.push('schools');
  if (c.majors.length) out.push('majors');
  if (c.gradYearFrom || c.gradYearTo) out.push('gradYear');
  if (c.homeCities.length) out.push('homeCities');
  if (c.activityCities.length) out.push('activityCities');
  if (c.companies.length) out.push('companies');
  if (c.industries.length) out.push('industries');
  if (c.roles.length) out.push('roles');
  if (c.interests.length) out.push('interests');
  if (c.stages.length) out.push('stages');
  return out;
}
export const isEmptySearch = (c: PeopleSearch) => !c.q?.trim() && groupsUsed(c).length === 0;
/** AroundU+ 필요: 필터 2그룹 이상 또는 상세 그룹 사용 */
export function isAdvancedSearch(c: PeopleSearch): boolean {
  const used = groupsUsed(c);
  return used.length >= 2 || used.some((g) => SEARCH_GROUPS.find((x) => x.key === g)?.detailed);
}
/** 왜 유료인지 — 'multi' 복수 조건 / 'detailed' 상세 조건 / null */
export function advancedReason(c: PeopleSearch): 'multi' | 'detailed' | null {
  const used = groupsUsed(c);
  if (used.some((g) => SEARCH_GROUPS.find((x) => x.key === g)?.detailed)) return 'detailed';
  if (used.length >= 2) return 'multi';
  return null;
}

const lc = (s?: string) => (s ?? '').toLowerCase();
const anyMatch = (values: string[], target: string) => values.some((v) => lc(target).includes(lc(v)) || lc(v).includes(lc(target)));

export function matchesSearch(u: User, c: PeopleSearch): boolean {
  if (c.schools.length && !c.schools.includes(schoolIdOf(u))) return false;
  if (c.majors.length && !anyMatch(c.majors, majorOf(u))) return false;
  const gy = gradYearOf(u);
  if ((c.gradYearFrom || c.gradYearTo) && (!gy || (c.gradYearFrom && gy < c.gradYearFrom) || (c.gradYearTo && gy > c.gradYearTo))) return false;
  if (c.homeCities.length && !c.homeCities.some((city) => lc(cityOf(u)) === lc(city))) return false;
  if (c.activityCities.length && !c.activityCities.some((city) => citiesOf(u).some((x) => lc(x) === lc(city)))) return false;
  if (c.companies.length && !anyMatch(c.companies, u.career?.company ?? (u.affiliation.type === 'company' ? u.affiliation.companyName : ''))) return false;
  if (c.industries.length && !anyMatch(c.industries, u.career?.industry ?? '')) return false;
  if (c.roles.length && !anyMatch(c.roles, u.career?.role ?? (u.affiliation.type === 'company' ? u.affiliation.jobTitle ?? '' : ''))) return false;
  if (c.interests.length && !c.interests.some((i) => u.interests.includes(i))) return false;
  if (c.stages.length && !c.stages.includes(normalizeStage(stageOf(u)))) return false;
  if (c.q?.trim()) {
    const q = lc(c.q.trim());
    const hay = [u.nickname, u.affiliation.type === 'university' ? u.affiliation.schoolName : u.affiliation.companyName, majorOf(u), cityOf(u), u.activityCity, u.career?.company, u.career?.industry, u.career?.role, u.research?.field, u.research?.lab, ...(u.research?.keywords ?? []), u.bio, ...u.interests.map((i) => INTEREST_LABELS[i])].filter(Boolean).map(lc);
    if (!hay.some((h) => h!.includes(q))) return false;
  }
  return true;
}
/** 검색 상태 칩은 학생 / 대학원 / 졸업생 3종 */
export const normalizeStage = (s: Stage): Stage => (s === 'professional' ? 'alumni' : s === 'phd' ? 'masters' : s);

export function searchPeople(users: User[], me: User, c: PeopleSearch): User[] {
  return users.filter((u) => u.id !== me.id && matchesSearch(u, c));
}

/** "뉴욕 + 금융 + 연세대" — 저장한 검색 이름 기본값·칩 라벨 */
export function searchLabel(c: PeopleSearch, schoolName: (id: string) => string): string {
  const parts: string[] = [];
  if (c.q?.trim()) parts.push(c.q.trim());
  c.homeCities.forEach((x) => parts.push(x));
  c.activityCities.forEach((x) => parts.push(`${x}${t('(활동)')}`));
  c.industries.forEach((x) => parts.push(x));
  c.roles.forEach((x) => parts.push(x));
  c.companies.forEach((x) => parts.push(x));
  c.schools.forEach((s) => parts.push(shortSchool(schoolName(s))));
  c.majors.forEach((x) => parts.push(x));
  c.interests.forEach((i) => parts.push(INTEREST_LABELS[i]));
  if (c.gradYearFrom || c.gradYearTo) parts.push(`${c.gradYearFrom ?? ''}–${c.gradYearTo ?? ''}`);
  c.stages.forEach((s) => parts.push(s === 'alumni' ? t('졸업생') : s === 'masters' ? t('대학원') : t('학생')));
  return parts.join(' + ') || t('전체');
}

export interface SearchPreset { label: string; criteria: Partial<PeopleSearch> }
/** 단계별 프리셋 — 학교는 여러 조건 중 하나 */
export function searchPresets(me: User, lang: 'ko' | 'en'): SearchPreset[] {
  const mySchool = schoolIdOf(me);
  const myMajor = majorOf(me);
  const city = cityOf(me);
  if (isAlumniStage(me)) {
    return lang === 'en'
      ? [
        { label: `${city} + Finance`, criteria: { homeCities: [city], industries: ['Finance'] } },
        { label: `Berkeley + SF + AI`, criteria: { schools: [mySchool], homeCities: ['San Francisco'], interests: ['ai'] } },
        { label: `Product + New York`, criteria: { roles: ['Product'], homeCities: ['New York'] } },
        { label: `${shortSchool(me.affiliation.type === 'university' ? me.affiliation.schoolName : '')} alumni + ${city}`, criteria: { schools: [mySchool], stages: ['alumni'], homeCities: [city] } },
      ]
      : [
        { label: `뉴욕 + 금융`, criteria: { homeCities: ['뉴욕'], industries: ['금융'] } },
        { label: `연세대 + 서울 + AI`, criteria: { schools: [mySchool], homeCities: ['서울'], interests: ['ai'] } },
        { label: `Product + 도쿄`, criteria: { roles: ['Product'], homeCities: ['도쿄'] } },
        { label: `동문 + ${city}`, criteria: { schools: [mySchool], stages: ['alumni'], homeCities: [city] } },
      ];
  }
  if (isGradStage(me)) {
    const field = me.research?.field ?? (lang === 'en' ? 'AI' : 'AI');
    const industry = lang === 'en' ? 'AI' : 'AI';
    return lang === 'en'
      ? [
        { label: `${field} grad students`, criteria: { q: field, stages: ['masters', 'phd'] } },
        { label: `Other schools' labs`, criteria: { stages: ['masters', 'phd'] } },
        { label: `PhDs`, criteria: { stages: ['phd'] } },
        { label: `Alumni working in ${industry}`, criteria: { stages: ['alumni'], industries: [industry] } },
      ]
      : [
        { label: `${field} 대학원생`, criteria: { q: field, stages: ['masters', 'phd'] } },
        { label: `다른 학교 연구실`, criteria: { stages: ['masters', 'phd'] } },
        { label: `박사과정`, criteria: { stages: ['phd'] } },
        { label: `${industry} 업계 선배`, criteria: { stages: ['alumni'], industries: [industry] } },
      ];
  }
  return lang === 'en'
    ? [
      { label: `Same major`, criteria: { majors: [myMajor] } },
      { label: `Other schools + Startups`, criteria: { interests: ['startup'] } },
      { label: `Alumni in ${city}`, criteria: { stages: ['alumni'], homeCities: [city] } },
      { label: `AI + ${city}`, criteria: { interests: ['ai'], homeCities: [city] } },
    ]
    : [
      { label: `같은 전공`, criteria: { majors: [myMajor] } },
      { label: `다른 학교 + 창업`, criteria: { interests: ['startup'] } },
      { label: `${city} 동문`, criteria: { stages: ['alumni'], homeCities: [city] } },
      { label: `AI + ${city}`, criteria: { interests: ['ai'], homeCities: [city] } },
    ];
}

/** 검색 결과 행에 보여줄 이유 칩 (최대 n) */
export const reasonChips = (rs: Reason[], n = 2) => rs.slice(0, n).map((r) => r.text);

/** 필터 선택지: 시드에서 실제 값들을 모은다 */
export function searchOptions(users: User[]) {
  const set = (xs: (string | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x && x.trim().length > 0))].sort();
  return {
    majors: set(users.map(majorOf)),
    homeCities: set(users.map(cityOf)),
    activityCities: set(users.flatMap((u) => [u.activityCity, cityOf(u)])),
    companies: set(users.map((u) => u.career?.company)),
    industries: set(users.map((u) => u.career?.industry)),
    roles: set(users.map((u) => u.career?.role)),
    interests: [...new Set(users.flatMap((u) => u.interests))] as Interest[],
    gradYears: [...new Set(users.map(gradYearOf).filter((y): y is number => !!y))].sort(),
  };
}

/**
 * 의외의 연결 — 같은 학교·같은 전공처럼 뻔한 이유가 아니라, 다른 학교·다른 분야인데 의미 있는 공통점이 2개 이상인 사람.
 * (관심사·그룹·모임·공통 연결·도시·분야). 숨긴 카드는 빠진다.
 */
export function unexpectedConnections(snap: Snapshot, me: User, users: User[], canSeeTimetable: (u: User) => boolean, limit = 12): RecommendedPerson[] {
  const hidden = new Set(me.hiddenPeople ?? []);
  const meaningful = new Set(['interest', 'group', 'meet', 'mutual', 'city', 'field']);
  return users
    .filter((u) => u.id !== me.id && !hidden.has(u.id) && !isBlocked(snap, me.id, u.id))
    .map((u) => { const r = matchScore(me, u, snap, canSeeTimetable(u)); return { user: u, reasons: shareableReasons(r.reasons), score: r.score }; })
    .filter((x) => {
      const kinds = new Set(x.reasons.map((r) => r.kind));
      const obvious = kinds.has('school') || kinds.has('major') || kinds.has('class');
      const hits = [...kinds].filter((k) => meaningful.has(k)).length;
      return !obvious && hits >= 1 && x.reasons.length >= 2;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
