/**
 * 공고 목록 규칙 — 분야·지역 분류, 마감 표시, 같은 회사가 줄줄이 붙지 않게 섞기.
 * 서버(수집)와 화면이 같은 분류를 쓰도록 여기 한 곳에 둔다.
 */
import type { Opportunity, OpportunityType, Organization, User } from '@core/types';
import { daysUntil } from './recommend';
import { schoolTz } from './campusclock';

// 문과·사회과학 학생 칸(정책·법, 언론·글, 비영리·교육, 보건)이 없어서 그쪽 공고가 Business 나 Other 에 묻혔다 (2026-11-02 사장님)
export const FIELDS = ['Software', 'Data & AI', 'Hardware', 'Quant & Trading', 'Finance & Consulting', 'Product & Design', 'Business & Marketing', 'Policy & Law', 'Media & Writing', 'Nonprofit & Education', 'Health', 'Research & Science', 'Other'] as const;
export type Field = typeof FIELDS[number];

const FIELD_RULES: [Field, RegExp][] = [
  // 사용자 리서치는 연구가 아니라 제품 쪽 — ‘research’ 규칙보다 먼저
  ['Product & Design', /user research|ux research|design research/i],
  ['Quant & Trading', /\bquant|trading|trader\b/i],
  ['Data & AI', /\bdata\b|machine learning|\bml\b|\bai\b|analytics|data scien|\bnlp\b|computer vision|deep learning/i],
  ['Hardware', /hardware|electrical|mechanical|fpga|robotic|firmware|embedded|asic|silicon|manufacturing|aerospace|flight|propulsion|avionics|spacecraft/i],
  ['Research & Science', /research|r&d|scientist|biolog|chemi|\blab\b|clinical|bioinformatic|genomic/i],
  ['Product & Design', /\bproducts?\b|design|\bux\b/i], // “Production Infrastructure”·“UI Software Engineer” 는 개발
  ['Finance & Consulting', /financ|investment|summer analyst|consult|accounting|banking|economic|strategy|portfolio|capital markets|restructuring|\brisk\b|credit|brokerage|treasury|tax\b/i],
  // 문과 쪽 — 금융(‘Tax … Reporting’) 다음, 경영·개발 전. 개발·디자인 제목(“Software Engineer, US Government”)은 fieldOf 가 건너뛴다
  ['Policy & Law', /\bpolicy\b|public policy|government|legislat|congress|\blegal\b|\blaw\b|paralegal|litigation|civil (rights|liberties)|advocacy|public affairs|regulatory|compliance|political|campaign|election|international affairs|diplomac/i],
  ['Media & Writing', /\bnews\b|photo|visuals|audience|sports|creative services|\bvideo\b|\bfilm\b|entertainment|publicity|journalis|editorial|\beditor\b|reporter|reporting|newsroom|writer|writing|copywrit|publishing|podcast|broadcast|video produc|\bmedia\b|communications?\b|public relations|\bpr\b|social media|content/i],
  ['Nonprofit & Education', /conservation|museum|archiv|park ranger|historic preservation|nonprofit|non-profit|education|teach|tutor|curriculum|community|outreach|volunteer|philanthrop|fundrais|development associate|social impact|youth|museum|library|arts? (admin|program)/i],
  ['Health', /\bhealth|public health|medical|hospital|patient|nurs|pharma(?!ceutical engineer)|clinical operations|epidemiolog/i],
  ['Business & Marketing', /contracting|procurement|acquisition|budget|human capital|human resources|logistics|administrative|marketing|sales|business|brand|merchandis|retail|store (leadership|executive|manager)|operations|growth|partnership|people|recruit|vendor|special projects|programs?\b|workplace|employee|learning & development|alumni|events?\b/i],
  ['Software', /software|information technology|computer scien|\bswe\b|engineer|developer|frontend|front-end|backend|back-end|full.?stack|mobile|ios|android|infrastructure|platform|security|devops|\bsre\b/i],
];
const HUMANITIES = new Set<Field>(['Policy & Law', 'Media & Writing', 'Nonprofit & Education', 'Health']);
const TECH_TITLE = /engineer|developer|software|designer|scientist|\bdata\b/i;
export function fieldOf(title: string, team = ''): Field {
  const ok = (f: Field) => !HUMANITIES.has(f) || !TECH_TITLE.test(title);
  for (const [f, re] of FIELD_RULES) if (re.test(title) && ok(f)) return f;
  for (const [f, re] of FIELD_RULES) if (re.test(team) && ok(f)) return f;
  return 'Other';
}

/** 화면에 보이는 인턴 분야 — 제목으로 지금 규칙을 먼저(새 분야가 다음 가져오기 전에도 맞게), 못 고르면 가져올 때 팀 이름까지 보고 정한 값 */
export function listingField(o: Pick<Opportunity, 'title' | 'field'>): Field {
  const f = fieldOf(o.title);
  return f !== 'Other' ? f : ((FIELDS as readonly string[]).includes(o.field ?? '') ? o.field as Field : 'Other');
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
// 미국 안이라는 표시 — “Remote, US”, “Denver, CO”, “United States”
const US_WORD = /\b(us|usa|u\.s\.|united states)\b/i;
const US_STATE = /,\s*(AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/;
type RegionInput = Pick<Opportunity, 'location' | 'remote' | 'description' | 'type'> & Partial<Pick<Opportunity, 'place' | 'title' | 'tags'>>;
export const regionsOf = (o: RegionInput): Region[] => {
  // 근무지가 없으면 다른 단서로 — 장소(설명회 장소 등, 좌표가 베이 지역이면 Bay Area), 제목·태그에 적힌 도시.
  // 예전엔 근무지 칸만 봐서 SF 회사 공고도 'Bay Area'에서 0개가 나왔다 (ux-sim baseline-priya step 14)
  const known = locationOf(o);
  const loc = known || fallbackPlaceText(o);
  // 제목·태그의 ‘remote’ 는 근무 방식이 아닐 수 있다(“Remote Sensing Summer School”) — 원격은 근무지 칸·remote 표시로만
  const out = REGION_RULES.filter(([r, re]) => re.test(loc) && (known || r !== 'Remote')).map(([r]) => r);
  if (o.remote && !out.includes('Remote')) out.push('Remote');
  // ‘Remote’ 는 미국에서 할 수 있는 것만 — “Berlin · Remote” 는 그 나라 원격이라 버클리 학생에겐 아니다.
  // 원격 말고 다른 곳이 적혀 있으면 그곳이 미국(지역 규칙·US 표시)일 때만
  const others = known.split(/[·;|]|\s-\s/).map((x) => x.trim()).filter((x) => x && !/^remote\b/i.test(x));
  const usOk = !others.length || out.some((r) => r !== 'Remote') || others.some((x) => US_WORD.test(x) || US_STATE.test(x));
  return usOk ? out : out.filter((r) => r !== 'Remote');
};
// 베이 지역 대략의 네모 (Santa Rosa ~ Gilroy, 바다 ~ Livermore 동쪽)
const inBayArea = (lat: number, lng: number) => lat >= 36.9 && lat <= 38.6 && lng >= -123.2 && lng <= -121.2;
function fallbackPlaceText(o: RegionInput): string {
  const parts: string[] = [];
  if (o.place) { parts.push(o.place.name); if (Number.isFinite(o.place.lat) && Number.isFinite(o.place.lng) && (o.place.lat || o.place.lng) && inBayArea(o.place.lat, o.place.lng)) parts.push('Bay Area'); }
  // 제목·태그의 ‘Berkeley’ 는 대개 학교 이름이다(“Berkeley Study Abroad — Global Internships”) — 도시로 세지 않는다
  const text = [o.title ?? '', ...(o.tags ?? [])].join(' · ').replace(/\b(uc |cal )?berkeley\b/gi, '');
  if (text.trim()) parts.push(text);
  return parts.join(' · ');
}

/** 근무지 — 예전 수집분은 설명 첫 줄에 들어 있었다 (“San Francisco, CA · …”). 첫 줄이 문장이면(“12-week paid internship. …”) 근무지가 아니다 */
export function locationOf(o: Pick<Opportunity, 'location' | 'description' | 'type'>): string {
  if (o.location) return o.location;
  if (o.type === 'internship') {
    const first = o.description.split(' · ')[0].replace(/\s*[•|]\s*/g, ' · ').trim();
    if (first && first.length <= 60 && !/[.!?](\s|$)/.test(first)) return first;
  }
  return '';
}

/** 캠퍼스(학교 시간대) 날짜 YYYY-MM-DD — 날짜만 있으면 그대로 */
export const campusDate = (iso: string) => (/T/.test(iso) ? new Intl.DateTimeFormat('en-CA', { timeZone: schoolTz(), year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso)) : iso.slice(0, 10));

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
  // 마감이 안 알려진 것 — “No deadline” 은 마감이 없다(상시)로 읽혔다. URAP·REU 는 마감이 곧 나온다
  return { text: en ? 'Deadline TBA' : '마감 미정', tone: 'muted' };
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
const GRAD_RE = /\blaw students?\b|\bj\.?d\.? (students?|candidates?)|\bmba\b|\bph\.?\s?d\b|ms\s?\/\s?ph\.?d|\bmasters?\b|master'?s\b|graduate students?|doctoral|dissertation|postdoc|\bgsr\b|\bgsi\b/i;
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
