/**
 * 공고 목록 규칙 — 분야·지역 분류, 마감 표시, 같은 회사가 줄줄이 붙지 않게 섞기.
 * 서버(수집)와 화면이 같은 분류를 쓰도록 여기 한 곳에 둔다.
 */
import type { Opportunity, User } from '@core/types';
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

/** 목록 오른쪽 배지 — 마감 D-day, 없으면 행사 날짜, 없으면 올라온 지 며칠 */
export function badgeOf(o: Pick<Opportunity, 'deadline' | 'date' | 'postedAt' | 'createdAt' | 'type'>, en: boolean): { text: string; tone: 'urgent' | 'soon' | 'normal' | 'muted' } {
  if (o.deadline) {
    const d = daysUntil(o.deadline);
    if (d < 0) return { text: en ? 'Closed' : '마감', tone: 'muted' };
    return { text: d === 0 ? 'D-Day' : `D-${d}`, tone: d <= 3 ? 'urgent' : d <= 14 ? 'soon' : 'normal' };
  }
  if (o.date) {
    const d = daysUntil(o.date);
    return { text: d === 0 ? (en ? 'Today' : '오늘') : d === 1 ? (en ? 'Tomorrow' : '내일') : new Date(`${o.date}T12:00:00`).toLocaleDateString(en ? 'en-US' : 'ko-KR', { month: 'short', day: 'numeric' }), tone: d <= 1 ? 'soon' : 'normal' };
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
