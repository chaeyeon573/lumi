/**
 * 자연어 사람 찾기 — "뉴욕 금융권 연세대 동문", "서울 AI 창업 관심 있는 대학원생" 같은 한 줄을 조건 칩으로 바꾼다.
 * 규칙 기반(도시·업종·직무·학교·관심사·상태·졸업연도 사전). 민감한 조건(성별·나이·종교·정치·외모·출신지역 등)은 버리고 알려준다.
 * 결과는 공개 프로필만으로 계산한다 (searchPeople).
 */
import type { Interest, PeopleSearch, School, Stage } from '@core/types';
import { INTEREST_LABELS } from './labels';
import { LOCALE_CONTEXT } from './locale-context';
import { emptySearch } from './people';
import { shortSchool } from './network';

export type ChipKind = 'school' | 'city' | 'industry' | 'role' | 'interest' | 'stage' | 'gradYear' | 'keyword';
export interface QueryChip { kind: ChipKind; label: string; value: string }
export interface ParsedQuery { criteria: PeopleSearch; chips: QueryChip[]; dropped: string[] }

const SENSITIVE = /(여자|여성|남자|남성|female|male|woman|women|\bman\b|\bmen\b|나이|살\b|\d{2}\s?살|age|종교|기독|불교|천주교|religion|christian|muslim|정치|진보|보수|politic|외모|키\s?\d|예쁜|잘생긴|pretty|handsome|고향|출신\s?지역|결혼|싱글|single|married)/i;

const STAGE_WORDS: { re: RegExp; stage: Stage; label: string }[] = [
  { re: /(동문|졸업생|선배|alumni|alum\b|graduates?)/i, stage: 'alumni', label: 'alumni' },
  { re: /(대학원생|석사|박사|대학원|grad(uate)? students?|phd|master'?s)/i, stage: 'masters', label: 'grad' },
  { re: /(학부생|재학생|undergrad|students?)/i, stage: 'undergrad', label: 'student' },
];

const EXTRA_CITIES = ['서울', '성남', '판교', '부산', '인천', '대전', '대구', '광주', '수원', '뉴욕', '도쿄', '샌프란시스코', '런던', 'New York', 'NYC', 'San Francisco', 'SF', 'Los Angeles', 'LA', 'Boston', 'Berkeley', 'Seattle', 'Chicago', 'Austin', 'Seoul', 'Tokyo', 'London', 'Oakland', 'Palo Alto'];
const CITY_ALIAS: Record<string, string> = { NYC: 'New York', SF: 'San Francisco', LA: 'Los Angeles', 판교: '성남' };
const INDUSTRY_ALIAS: Record<string, string> = { 금융권: '금융', 핀테크: '금융', fintech: 'Finance', 투자: '금융', vc: 'Finance', 유통: '유통', 식품: '유통', 테크: 'IT', 개발: 'IT', 스타트업: '스타트업' };
const ROLE_ALIAS: Record<string, string> = { pm: 'Product', 기획: 'Product', 프로덕트: 'Product', 창업자: '창업자', 파운더: '창업자', founder: 'Founder', founders: 'Founder', 개발자: '개발', engineer: 'Engineer', engineers: 'Engineer', 디자이너: '디자인', designer: 'Designer', 연구원: '연구원', researcher: 'Researcher', 마케터: '마케팅' };

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();

export function parseQuery(text: string, schools: School[], lang: 'ko' | 'en'): ParsedQuery {
  const ctx = LOCALE_CONTEXT[lang];
  const c = emptySearch();
  const chips: QueryChip[] = [];
  const dropped: string[] = [];
  let rest = ` ${text} `;
  const take = (re: RegExp) => { const m = rest.match(re); if (m) rest = rest.replace(m[0], ' '); return m; };

  // 민감한 조건 제거
  let m: RegExpMatchArray | null;
  while ((m = rest.match(SENSITIVE))) { dropped.push(m[0].trim()); rest = rest.replace(m[0], ' '); }

  // 학교 (정식명 · 짧은 이름 · 이메일 도메인 앞부분)
  for (const s of schools) {
    const names = [s.name, shortSchool(s.name), shortSchool(s.name) + '대', s.emailDomain.split('.')[0]].filter((x) => x && x.length >= 2);
    for (const n of names) {
      const re = new RegExp(`(^|[\\s,+/])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(대학교|대|\\b)?`, 'i');
      if (re.test(rest)) { take(re); if (!c.schools.includes(s.id)) { c.schools.push(s.id); chips.push({ kind: 'school', label: shortSchool(s.name), value: s.id }); } break; }
    }
  }
  // 상태
  for (const w of STAGE_WORDS) if (take(w.re)) { if (!c.stages.includes(w.stage)) { c.stages.push(w.stage); chips.push({ kind: 'stage', label: w.stage === 'alumni' ? (lang === 'en' ? 'Alumni' : '동문') : w.stage === 'masters' ? (lang === 'en' ? 'Grad' : '대학원') : (lang === 'en' ? 'Student' : '학생'), value: w.stage }); } }
  // 졸업연도 '18 / 2018 / class of 2018
  const y = take(/(class of\s*)?('?(\d{2})\b학번?|20\d{2}\s?(년)?\s?(졸업|학번)?)/i);
  if (y) { const raw = y[0].match(/\d{2,4}/)![0]; const yr = raw.length === 2 ? 2000 + Number(raw) : Number(raw); if (yr > 1980 && yr < 2040) { c.gradYearFrom = yr; c.gradYearTo = yr; chips.push({ kind: 'gradYear', label: String(yr), value: String(yr) }); } }
  // 도시
  for (const city of [...new Set([...ctx.cities, ...EXTRA_CITIES])]) {
    const re = new RegExp(`(^|[\\s,+/])${city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(에|에서|의|\\b)`, 'i');
    if (re.test(rest)) { take(re); const v = CITY_ALIAS[city] ?? city; if (!c.homeCities.includes(v)) { c.homeCities.push(v); chips.push({ kind: 'city', label: v, value: v }); } }
  }
  // 업종
  for (const ind of [...ctx.industries, ...Object.keys(INDUSTRY_ALIAS)]) {
    const re = new RegExp(`(^|[\\s,+/])${ind.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(권|업계|쪽|\\b)?`, 'i');
    if (re.test(rest) && ind.length >= 2) { take(re); const v = INDUSTRY_ALIAS[ind] ?? INDUSTRY_ALIAS[ind.toLowerCase()] ?? ind; if (!c.industries.includes(v)) { c.industries.push(v); chips.push({ kind: 'industry', label: v, value: v }); } }
  }
  // 직무
  for (const r of [...ctx.roles, ...Object.keys(ROLE_ALIAS)]) {
    const re = new RegExp(`(^|[\\s,+/])${r.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(\\b|s\\b)?`, 'i');
    if (re.test(rest) && r.length >= 2) { take(re); const v = ROLE_ALIAS[r] ?? ROLE_ALIAS[r.toLowerCase()] ?? r; if (!c.roles.includes(v)) { c.roles.push(v); chips.push({ kind: 'role', label: v, value: v }); } }
  }
  // 관심사
  (Object.keys(INTEREST_LABELS) as Interest[]).forEach((i) => {
    const label = INTEREST_LABELS[i];
    const re = new RegExp(`(^|[\\s,+/])(${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}|${i})(\\b|에|을|를)?`, 'i');
    if (label.length >= 2 && re.test(rest)) { take(re); if (!c.interests.includes(i)) { c.interests.push(i); chips.push({ kind: 'interest', label, value: i }); } }
  });
  // 남은 의미 있는 단어는 키워드로
  const leftover = norm(rest).replace(/(관심\s?있는|하는|있는|사람|분|찾아요|찾고|싶어요|who|people|someone|looking for|in|at|the|and|with|of|a|이|가|을|를|은|는|에서|에)(?=\s|$)/gi, ' ').replace(/\s+/g, ' ').trim();
  if (leftover.length >= 2) { c.q = leftover; chips.push({ kind: 'keyword', label: leftover, value: leftover }); }
  return { criteria: c, chips, dropped };
}

/** 칩 하나 제거 → 조건 갱신 */
export function removeChip(criteria: PeopleSearch, chip: QueryChip): PeopleSearch {
  const c: PeopleSearch = { ...criteria, schools: [...criteria.schools], homeCities: [...criteria.homeCities], industries: [...criteria.industries], roles: [...criteria.roles], interests: [...criteria.interests], stages: [...criteria.stages] };
  if (chip.kind === 'school') c.schools = c.schools.filter((x) => x !== chip.value);
  if (chip.kind === 'city') c.homeCities = c.homeCities.filter((x) => x !== chip.value);
  if (chip.kind === 'industry') c.industries = c.industries.filter((x) => x !== chip.value);
  if (chip.kind === 'role') c.roles = c.roles.filter((x) => x !== chip.value);
  if (chip.kind === 'interest') c.interests = c.interests.filter((x) => x !== chip.value);
  if (chip.kind === 'stage') c.stages = c.stages.filter((x) => x !== chip.value);
  if (chip.kind === 'gradYear') { c.gradYearFrom = undefined; c.gradYearTo = undefined; }
  if (chip.kind === 'keyword') c.q = '';
  return c;
}

/** 결과가 없을 때 조건 완화 제안 — 가장 좁은 조건부터 하나씩 뺀 버전 */
export function relaxations(chips: QueryChip[]): QueryChip[] {
  const order: ChipKind[] = ['keyword', 'gradYear', 'role', 'school', 'industry', 'interest', 'stage', 'city'];
  return [...chips].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind)).slice(0, 3);
}

/** 무료 사용자 자연어 검색 하루 한도 */
export const FREE_NL_SEARCHES_PER_DAY = 5;
export const EXAMPLE_QUERIES = {
  ko: ['뉴욕 금융권 연세대 동문', '서울 AI 창업 관심 있는 대학원생', '도쿄 Product', '러닝 좋아하는 같은 전공'],
  en: ['Berkeley alumni in NYC finance', 'Grad students in SF into AI startups', 'Product in Tokyo', 'Runners in my major'],
};
