/**
 * 공고 목록 규칙 — 분야·지역 분류, 마감 표시, 같은 회사가 줄줄이 붙지 않게 섞기.
 * 서버(수집)와 화면이 같은 분류를 쓰도록 여기 한 곳에 둔다.
 */
import type { Opportunity, OpportunityType, Organization, User } from '@core/types';
import { daysUntil } from './recommend';

export const FIELDS = ['Software', 'Data & AI', 'Hardware', 'Quant & Trading', 'Finance & Consulting', 'Product & Design', 'Business & Marketing', 'Research & Science', 'Other'] as const;
export type Field = typeof FIELDS[number];

const FIELD_RULES: [Field, RegExp][] = [
  ['Quant & Trading', /\bquant|trading|trader\b/i],
  ['Data & AI', /\bdata\b|machine learning|\bml\b|\bai\b|analytics|data scien|\bnlp\b|computer vision|deep learning/i],
  ['Hardware', /hardware|electrical|mechanical|fpga|robotic|firmware|embedded|asic|silicon|manufacturing/i],
  ['Research & Science', /research|scientist|biolog|chemi|\blab\b|clinical|bioinformatic|genomic/i],
  ['Product & Design', /product|design|\bux\b|\bui\b/i],
  ['Finance & Consulting', /financ|investment|summer analyst|consult|accounting|banking|economic|strategy|portfolio|capital markets|restructuring|\brisk\b|credit|brokerage|treasury|tax\b/i],
  ['Business & Marketing', /marketing|sales|business|operations|growth|communication|partnership|people|recruit|legal|policy|content|editorial|journalis|social media|vendor|special projects|programs?\b|workplace|employee|learning & development|alumni|events?\b/i],
  ['Software', /software|\bswe\b|engineer|developer|frontend|front-end|backend|back-end|full.?stack|mobile|ios|android|infrastructure|platform|security|devops|\bsre\b/i],
];
export function fieldOf(title: string, team = ''): Field {
  for (const [f, re] of FIELD_RULES) if (re.test(title)) return f;
  for (const [f, re] of FIELD_RULES) if (re.test(team)) return f;
  return 'Other';
}

export const REGIONS = ['Bay Area', 'Los Angeles', 'Seattle', 'New York', 'Boston', 'Chicago', 'Texas', 'Remote'] as const;
export type Region = typeof REGIONS[number];
const REGION_RULES: [Region, RegExp][] = [
  ['Bay Area', /san francisco|bay area|palo alto|mountain view|menlo park|sunnyvale|san jose|san mateo|redwood city|oakland|berkeley|emeryville|south san francisco|foster city|santa clara|cupertino|fremont|\bsf\b/i],
  ['Los Angeles', /los angeles|santa monica|irvine|pasadena|culver city|el segundo|burbank|san diego/i],
  ['Seattle', /seattle|bellevue|redmond|kirkland/i],
  ['New York', /new york|\bnyc\b|brooklyn|manhattan|jersey city/i],
  ['Boston', /boston|cambridge, ma|somerville|waltham/i],
  ['Chicago', /chicago/i],
  ['Texas', /austin|dallas|houston|texas|, tx\b/i],
  ['Remote', /remote/i],
];
export const regionsOf = (o: Pick<Opportunity, 'location' | 'remote' | 'description' | 'type'>): Region[] => {
  const loc = locationOf(o);
  const out = REGION_RULES.filter(([, re]) => re.test(loc)).map(([r]) => r);
  if (o.remote && !out.includes('Remote')) out.push('Remote');
  return out;
};

/** 근무지 — 예전 수집분은 설명 첫 줄에 들어 있었다 */
export function locationOf(o: Pick<Opportunity, 'location' | 'description' | 'type'>): string {
  if (o.location) return o.location;
  if (o.type === 'internship') return o.description.split(' · ')[0].replace(/\s*[•|]\s*/g, ' · ').trim();
  return '';
}

/** 캠퍼스(태평양) 날짜 YYYY-MM-DD — 날짜만 있으면 그대로 */
export const campusDate = (iso: string) => (/T/.test(iso) ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso)) : iso.slice(0, 10));

/** 목록 오른쪽 배지 — 마감 D-day, 없으면 행사 날짜, 없으면 올라온 지 며칠 */
export function badgeOf(o: Pick<Opportunity, 'deadline' | 'date' | 'postedAt' | 'createdAt' | 'type'>, en: boolean): { text: string; tone: 'urgent' | 'soon' | 'normal' | 'muted' } {
  if (o.deadline) {
    const d = daysUntil(o.deadline);
    if (d < 0) return { text: en ? 'Closed' : '마감', tone: 'muted' };
    return { text: d === 0 ? 'D-Day' : `D-${d}`, tone: d <= 3 ? 'urgent' : d <= 14 ? 'soon' : 'normal' };
  }
  if (o.date) {
    // 학교 행사 목록의 날짜는 UTC 시각("2026-10-16T02:00Z")으로 온다 — 캠퍼스(태평양) 날짜로 읽어야 저녁 행사가 다음 날로 밀리지 않는다
    const day = campusDate(o.date);
    const d = Math.round((Date.parse(`${day}T12:00:00Z`) - Date.parse(`${campusDate(new Date().toISOString())}T12:00:00Z`)) / 86400000);
    return { text: d === 0 ? (en ? 'Today' : '오늘') : d === 1 ? (en ? 'Tomorrow' : '내일') : new Date(`${day}T12:00:00`).toLocaleDateString(en ? 'en-US' : 'ko-KR', { month: 'short', day: 'numeric' }), tone: d <= 1 ? 'soon' : 'normal' };
  }
  if (o.type === 'internship') {
    const posted = o.postedAt ?? o.createdAt;
    const days = Math.max(0, Math.floor((Date.now() - new Date(posted).getTime()) / 86400000));
    return { text: en ? (days === 0 ? 'New today' : days < 30 ? `Posted ${days}d ago` : 'Rolling') : (days === 0 ? '오늘 올라옴' : days < 30 ? `${days}일 전` : '상시'), tone: days <= 3 ? 'soon' : 'muted' };
  }
  return { text: en ? 'No deadline' : '마감 미정', tone: 'muted' };
}

/**
 * 같은 회사(host)가 줄줄이 붙지 않게 섞는다 — 정렬 순서를 지키면서, 바로 앞 몇 개에 같은 회사가 있으면 다음 후보를 먼저 올린다.
 * (Handshake 처럼 관련도·마감 순을 유지하되 한 회사가 첫 화면을 다 차지하지 않게)
 */
export function spreadByHost<T extends { host: string }>(items: T[], gap = 3): T[] {
  const rest = [...items]; const out: T[] = [];
  while (rest.length) {
    const recent = new Set(out.slice(-gap).map((x) => x.host));
    const i = rest.findIndex((x) => !recent.has(x.host));
    out.push(rest.splice(i === -1 ? 0 : i, 1)[0]);
  }
  return out;
}

// ─── 누구를 위한 공고인가 (대학원생 / 학부생 / 모두) ─────────────────────────
export type Audience = 'grad' | 'undergrad' | 'all';
const GRAD_RE = /\bph\.?\s?d\b|ms\s?\/\s?ph\.?d|\bmasters?\b|master'?s\b|graduate students?|doctoral|dissertation|postdoc|\bgsr\b|\bgsi\b/i;
const UNDERGRAD_RE = /undergrad|bachelor'?s|freshm[ae]n|sophomore|high school|\bfirst[- ]year students?\b/i;
export function audienceOf(o: Pick<Opportunity, 'title' | 'tags' | 'eligibility' | 'description'>): Audience {
  if (o.tags.some((t) => /^graduate$/i.test(t))) return 'grad';
  const text = `${o.title} ${o.eligibility}`;
  const g = GRAD_RE.test(text), u = UNDERGRAD_RE.test(text);
  if (g && !u) return 'grad';
  if (u && !g) return 'undergrad';
  return 'all';
}
export const isGradStudent = (u: Pick<User, 'affiliation'>) => u.affiliation.type === 'university' && u.affiliation.role === 'graduate';
/** 이 학생에게 맞는 대상인가 (모두 대상이면 맞음) */
export const audienceFits = (u: Pick<User, 'affiliation'>, o: Pick<Opportunity, 'title' | 'tags' | 'eligibility' | 'description'>) => {
  const a = audienceOf(o);
  return a === 'all' || (a === 'grad') === isGradStudent(u);
};
/** 세미나·강연 (행사 중 talk 태그) */
export const isTalk = (o: Pick<Opportunity, 'type' | 'tags' | 'title'>) => o.type === 'event' && (o.tags.includes('talk') || /seminar|colloquium|lecture|talk\b|symposium|workshop/i.test(o.title));

// ─── 분류 (한 공고가 여러 칸에 들어갈 수 있다) ─────────────────────────────
/**
 * 캠퍼스 › 찾기 칩과 Ask Lumi 검색이 같이 쓰는 분류.
 * `type`은 수집할 때 하나만 고른 값이라, 연구 장학금(SURF)은 scholarship인데 연구 칸에도, 연구비 지원(UROC Funding Awards)은
 * lab인데 장학금 칸에도 보여야 한다 — 그래서 칩은 type 대신 이 함수로 거른다.
 */
export type Category = 'internship' | 'research' | 'scholarship' | 'hackathon' | 'event' | 'free_food' | 'startup' | 'exchange' | 'club';
const TYPE_CATEGORY: Record<OpportunityType, Category | null> = {
  internship: 'internship', lab: 'research', scholarship: 'scholarship', hackathon: 'hackathon', event: 'event', startup: 'startup', exchange: 'exchange', club: 'club', activity: null,
};
const FUNDING_RE = /\b(funding|funds?|awards?|grants?|fellowships?|stipends?|scholarships?)\b/i;
const CONTEST_RE = /\b(contest|competition|challenge|pitch)/i;
type Classifiable = Pick<Opportunity, 'type' | 'title' | 'tags'>;
const hasTag = (o: Pick<Opportunity, 'tags'>, ...tags: string[]) => o.tags.some((t) => tags.includes(t.toLowerCase()));

export function categoriesOf(o: Classifiable): Category[] {
  const base = TYPE_CATEGORY[o.type];
  if (!base) return [];
  const out = new Set<Category>([base]);
  // 연구 장학금·연구 펠로십 (SURF, GRFP, UROC DSIG Research Fellowship) → 연구 칸에도
  if (o.type === 'scholarship' && (hasTag(o, 'research') || /\bresearch\b/i.test(o.title))) out.add('research');
  // 연구비·연구 펠로십을 주는 연구 프로그램 (UROC Research Funding Awards) → 장학금 칸에도
  if (o.type === 'lab' && FUNDING_RE.test(`${o.title} ${o.tags.join(' ')}`)) out.add('scholarship');
  // 창업 공모전 (Big Ideas Contest) → 해커톤·공모전 칸에도
  if (o.type === 'startup' && CONTEST_RE.test(o.title)) out.add('hackathon');
  // 해외 인턴십을 함께 뽑는 교환·연수 → 인턴 칸에도 (행사인 커리어 페어는 제외)
  if (o.type !== 'event' && o.type !== 'internship' && hasTag(o, 'internship')) out.add('internship');
  if (o.type === 'event' && hasTag(o, 'free food')) out.add('free_food');
  return [...out];
}
export const inCategory = (o: Classifiable, c: Category) => categoriesOf(o).includes(c);
/** "이 type의 것"을 찾을 때 — 같은 칸에 분류되는 다른 type도 포함 (AI 검색·For you 종류 필터) */
export const isOfType = (o: Classifiable, t: OpportunityType) => o.type === t || (!!TYPE_CATEGORY[t] && inCategory(o, TYPE_CATEGORY[t]!));

/** 행사 안의 작은 분류 — 데이터의 태그에서만 (지어내지 않는다) */
export type EventKind = 'talk' | 'social' | 'career' | 'free_food';
export function eventKindsOf(o: Classifiable): EventKind[] {
  if (o.type !== 'event') return [];
  const out: EventKind[] = [];
  if (isTalk(o) || hasTag(o, 'talk', 'academic', 'lectures')) out.push('talk');
  if (hasTag(o, 'social')) out.push('social');
  if (hasTag(o, 'career fair', 'recruiting') || /\bcareer\b|networking|info(rmation)? session/i.test(o.title)) out.push('career');
  if (hasTag(o, 'free food')) out.push('free_food');
  return out;
}

// ─── 공고 ↔ 동아리 ────────────────────────────────────────────────────────
/** 학교 행사 목록에서 온 동아리 모임(“General Meeting”)은 orgId가 없다 — 같은 학교의 같은 이름 단체로 잇는다 */
const orgKey = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
type OrgLike = Pick<Organization, 'id' | 'name' | 'schoolId'>;
type Hosted = Pick<Opportunity, 'orgId' | 'host' | 'schoolId'>;
/** 단체 목록으로 색인을 한 번 만들고, 공고마다 주최 단체를 찾는다 (목록 전체에 쓸 때) */
export function orgLinker<T extends OrgLike>(orgs: T[]): (o: Hosted) => T | undefined {
  const byId = new Map(orgs.map((x) => [x.id, x]));
  const byName = new Map<string, T>();
  for (const x of orgs) { const k = `${x.schoolId}|${orgKey(x.name)}`; if (!byName.has(k)) byName.set(k, x); }
  return (o) => (o.orgId ? byId.get(o.orgId) : o.schoolId ? byName.get(`${o.schoolId}|${orgKey(o.host)}`) : undefined);
}
export const orgOfListing = <T extends OrgLike>(o: Hosted, orgs: T[]) => orgLinker(orgs)(o);
/** 이 단체가 주최하는 공고·행사 */
export function listingsOfOrg<T extends Hosted>(org: OrgLike, opps: T[]): T[] {
  const k = orgKey(org.name);
  return opps.filter((o) => o.orgId === org.id || (!o.orgId && o.schoolId === org.schoolId && orgKey(o.host) === k));
}
