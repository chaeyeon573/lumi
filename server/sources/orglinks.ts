/**
 * 동아리·학생회 연락 링크 — 공식 사이트 · 인스타그램 · 페이스북 · 링크드인 · X · 유튜브 · 틱톡.
 * 디렉터리가 공개로 주는 값만 쓴다 (지어내지 않는다). 2026-11-02 사장님: "정보 얻을 수 있는 사이트 링크도 가져와야"
 */
import type { Organization } from '@core/types';
import { decodeNumericEntities } from './entities';
import { stripEmoji } from '@core/lib/orglinks';

type Link = { label: string; url: string };

const clean = (u?: string | null): string | undefined => {
  const s = (u ?? '').trim();
  if (!s || /^hidden$/i.test(s)) return undefined;
  const withScheme = /^https?:\/\//i.test(s) ? s : /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(s) ? `https://${s}` : '';
  try { const url = new URL(withScheme); return url.protocol.startsWith('http') ? url.href : undefined; } catch { return undefined; }
};

/** 라벨 순서는 화면에 보이는 순서 */
export function socialLinks(v: { website?: string | null; instagram?: string | null; facebook?: string | null; linkedin?: string | null; twitter?: string | null; youtube?: string | null; tiktok?: string | null }): Link[] {
  const out: Link[] = [];
  const add = (label: string, raw?: string | null, must?: RegExp) => { const u = clean(raw); if (u && (!must || must.test(u)) && !out.some((l) => l.url === u)) out.push({ label, url: u }); };
  add('Website', v.website);
  add('Instagram', v.instagram, /instagram\.com/i);
  add('Facebook', v.facebook, /facebook\.com|fb\.com/i);
  add('LinkedIn', v.linkedin, /linkedin\.com/i);
  add('X', v.twitter, /twitter\.com|x\.com/i);
  add('YouTube', v.youtube, /youtube\.com|youtu\.be/i);
  add('TikTok', v.tiktok, /tiktok\.com/i);
  return out;
}

/** CampusLabs Engage 조직 상세(/api/discovery/organization/bykey/<key>)의 socialMedia */
export interface EngageSocial { ExternalWebsite?: string | null; InstagramUrl?: string | null; FacebookUrl?: string | null; LinkedInUrl?: string | null; TwitterUrl?: string | null; YoutubeUrl?: string | null }
export const engageLinks = (sm?: EngageSocial | null): Link[] => (sm ? socialLinks({ website: sm.ExternalWebsite, instagram: sm.InstagramUrl, facebook: sm.FacebookUrl, linkedin: sm.LinkedInUrl, twitter: sm.TwitterUrl, youtube: sm.YoutubeUrl }) : []);

/** CampusGroups 목록 한 줄 안의 바깥 링크(그 단체 사이트) — 디렉터리 자기 주소는 빼고 첫 번째 것 */
export function campusGroupsWebsite(itemHtml: string, host: string): string | undefined {
  const own = new URL(host).hostname;
  for (const m of itemHtml.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    try { const u = new URL(m[1]); if (u.hostname !== own && !/campusgroups\.com$/i.test(u.hostname)) return u.href; } catch { /* skip */ }
  }
  return undefined;
}

/** 학생회·학생 정부 — 이름이나 분류에 이게 있으면 council 로 */
export const COUNCIL_RE = /student government|student senate|\bsenate\b|associated students|student assembly|undergraduate assembly|undergraduate association|graduate student (council|assembly|government)|\bASSU\b|class council|\bcouncil\b/i;
/**
 * 학생회인지 — 이름은 COUNCIL_RE(단, “History Undergraduate Association” 같은 학과 모임은 빼고 학교 이름 + Undergraduate Association 만),
 * 분류는 학생회 뜻인 것만: Student Government·Senate·Governing Councils·“Councils”(복수).
 * 단수 “Multicultural Leadership Council”·“Interfaith Council Organizations” 같은 분류는 그 협의회에 속한 동아리라는 뜻이라 학생회가 아니다 (Vanderbilt MASA, 2026-11-03 점검)
 */
const COUNCIL_NAME_RE = new RegExp(COUNCIL_RE.source.replace('undergraduate association|', '').replace('\\bcouncil\\b', '\\bcouncils?\\b'), 'i');
const GOV_CATEGORY_RE = /^government\b|government\s*\/\s*council|student government|student senate|associated students|student assembly|undergraduate assembly|governing|student governance|class council|\bcouncils\b/i;
export function isCouncil(name: string, categories: (string | undefined)[] = [], schoolId = ''): boolean {
  const n = notCouncil(name);
  if (COUNCIL_NAME_RE.test(n)) return true;
  const ua = /^(?:the )?(\S+) undergraduate association$/i.exec(n.trim());
  if (ua && schoolId && ua[1].toLowerCase() === schoolId.replace(/^s_/, '').toLowerCase()) return true;
  return categories.some((c) => !!c && GOV_CATEGORY_RE.test(notCouncil(c)));
}
/** CampusGroups 묶음 유형 중 그 자체가 학생회인 것만 — “Divisional Council”(Emory 대학원 학생회)·“Student Government”(Duke). “Homewood: Student Government Association”(JHU) 은 학생회에 등록한 동아리 묶음이라 아님 */
export const GOV_GROUP_TYPE_RE = /^(student government|class councils?|divisional councils?|governing (body|bodies|councils?)|government\s*\/\s*council|student councils?)$/i;
/** 분류 이름에 붙은 “council” 이 학생회 뜻이 아닌 것 — Dartmouth 의 승인 기관 Council on Student Organizations(COSO) 등 */
export const notCouncil = (text: string) => text
  .replace(/council on student organizations|\bCOSO\b/gi, ' ')
  // “Student Government Recognized Organizations”(CMU)·“Student Senate Recognized Organization”(Lehigh)·“funded by …” = 학생회가 승인·지원한 동아리라는 뜻
  .replace(/(?:student government|student senate|senate|student association|associated students|student union|council)\s+(?:recognized|registered|funded|sponsored|chartered)\b[\w ]*/gi, ' ')
  .replace(/(?:recognized|registered|funded|sponsored|chartered)\s+by\s+(?:the\s+)?[\w ]*?(?:student government|senate|council)\b/gi, ' ');

// ─── Penn Clubs (pennclubs.com, UPenn 공식 학생 단체 디렉터리 · 공개 JSON) ───────────
export interface PennClub { accepting_members?: boolean; application_required?: number; recruiting_cycle?: number; applications?: { name?: string; application_start_time?: string; application_end_time?: string; external_url?: string | null }[]; code: string; name: string; subtitle?: string; description?: string; image_url?: string | null; active?: boolean; approved?: boolean | null; tags?: { name: string }[]; website?: string | null; instagram?: string | null; facebook?: string | null; linkedin?: string | null; twitter?: string | null; youtube?: string | null; tiktok?: string | null }
const GREEK_RE = /fraternit|sororit|greek|panhellenic|interfraternity|nphc|multicultural greek/i;
// 학교 목록 페이지의 글자 코드(&#039; &#8211; &#038; &oacute; …)를 모두 푼다 — 이름에 그대로 보이던 것 (2026-11-02 검사)
const NAMED: Record<string, string> = { amp: '&', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', hellip: '…', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', uuml: 'ü', ouml: 'ö', auml: 'ä', ccedil: 'ç' };
const decodeHtmlText = (h: string) => decodeNumericEntities(h.replace(/&([A-Za-z]+);/g, (m, n: string) => NAMED[n] ?? m)).replace(/&amp;/g, '&');
const strip = (h = '') => decodeHtmlText(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
/**
 * Penn Clubs 모집 상태 — 사이트 코드값(pennlabs/penn-clubs models.py): recruiting_cycle 1 모름·2 가을·3 봄·4 둘 다·5 상시,
 * application_required 1 누구나·2 트라이아웃·3 오디션·4 지원서·5 지원서+면접. 마감일은 그 동아리의 공개 지원서(application_end_time)에서만
 */
const PENN_HOW: Record<number, string> = { 2: 'Tryout', 3: 'Audition', 4: 'Application', 5: 'Application + interview' };
const PENN_CYCLE: Record<number, string> = { 2: 'Fall', 3: 'Spring', 4: 'Fall and spring' };
export function pennRecruitment(c: PennClub, now = new Date()): Organization['recruitment'] {
  if (c.accepting_members === false) return { title: 'Not taking new members', period: '', open: false, mode: 'closed', source: 'pennclubs' };
  const how = c.application_required ? PENN_HOW[c.application_required] : undefined;
  if (c.application_required === 1) return { title: 'Open to join anytime', period: '', open: true, mode: 'rolling', source: 'pennclubs' };
  const next = (c.applications ?? []).map((a) => a.application_end_time).filter((t): t is string => !!t && new Date(t) > now).sort()[0];
  if (next) return { title: 'Applications open', period: '', open: true, mode: 'deadline', deadline: next.slice(0, 10), ...(how ? { how } : {}), source: 'pennclubs' };
  if (c.recruiting_cycle === 5) return { title: 'Open to join anytime', period: '', open: true, mode: 'rolling', ...(how ? { how } : {}), source: 'pennclubs' };
  if (c.recruiting_cycle && PENN_CYCLE[c.recruiting_cycle]) return { title: `Recruits in ${PENN_CYCLE[c.recruiting_cycle]}`, period: PENN_CYCLE[c.recruiting_cycle], open: false, mode: 'cycle', ...(how ? { how } : {}), source: 'pennclubs' };
  return undefined;
}
export function pennClubToOrg(c: PennClub, schoolId = 's_upenn'): Organization {
  const tags = (c.tags ?? []).map((t) => t.name);
  const text = `${tags.join(' ')} ${c.name}`;
  const type: Organization['type'] = GREEK_RE.test(text) ? 'greek' : COUNCIL_RE.test(text) ? 'council' : 'club';
  const name = strip(c.name);
  const initials = name.replace(/[^A-Za-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w && !/^(of|the|at|and|for|in|penn|upenn|club)$/i.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '•';
  return {
    id: `${type === 'greek' ? 'og' : 'oc'}_${schoolId.replace('s_', '')}_pc_${c.code.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    name,
    logo: { emoji: initials, hue: Math.abs([...name].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7)) % 360, ...(c.image_url ? { url: c.image_url } : {}) },
    type, schoolId, parent: tags[0], verified: false,
    description: (strip(c.description) || strip(c.subtitle)).slice(0, 600),
    gallery: [], regularActivities: [], notices: [], followerIds: [], memberIds: [], adminIds: [], applicantIds: [],
    links: [{ label: 'Penn Clubs', url: `https://pennclubs.com/club/${encodeURIComponent(c.code)}` }, ...socialLinks(c)],
    ...(pennRecruitment(c) ? { recruitment: pennRecruitment(c) } : {}),
  };
}

/** 학교 디렉터리에 학생회가 없을 때 손으로 확인한 공식 학생회 (server/data/student-governments.csv) — 공식 사이트에서 확인한 것만 */
export interface StudentGovRow { school_id: string; name: string; description?: string; website?: string; instagram?: string; facebook?: string; checked?: string }
export function studentGovToOrg(r: StudentGovRow): Organization {
  const name = r.name.trim();
  return {
    id: `oc_${r.school_id.replace('s_', '')}_sg_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    name,
    logo: { emoji: name.replace(/[^A-Za-z ]+/g, ' ').split(/\s+/).filter((w) => w && !/^(of|the|and)$/i.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'SG', hue: Math.abs([...name].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7)) % 360 },
    type: 'council', schoolId: r.school_id, parent: 'Student Government', verified: true,
    description: (r.description ?? '').trim(),
    gallery: [], regularActivities: [], notices: [], followerIds: [], memberIds: [], adminIds: [], applicantIds: [],
    links: socialLinks({ website: r.website, instagram: r.instagram, facebook: r.facebook }),
  };
}

// ─── UC Santa Cruz Get Involved (WordPress + FacetWP 목록, getinvolved.ucsc.edu/student-organizations/join/) ───
/** 등록 단체 카드: 이름(h2) · 소개(첫 문단) · “Instagram:” / “Website:” / “Facebook:” 링크. 한 페이지에 전부 온다(per_page 200, 2026-11-02 109개) */
export interface FacetCard { name: string; description: string; links: Link[] }
export function parseFacetWpCards(html: string): FacetCard[] {
  const out: FacetCard[] = [];
  for (const raw of html.split('<div class="fwpl-result r').slice(1)) {
    const block = raw.split('<div class="fwpl-result')[0];
    const name = strip(/<h2[^>]*>([\s\S]*?)<\/h2>/.exec(block)?.[1] ?? '');
    if (!name) continue;
    const paras = [...block.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => m[1]);
    const description = strip(paras.find((p) => !/<strong>/.test(p) && strip(p)) ?? '');
    const field = (label: RegExp) => { const p = paras.find((x) => label.test(strip(/<strong>([\s\S]*?)<\/strong>/.exec(x)?.[1] ?? ''))); return p ? /href="([^"]+)"/.exec(p)?.[1]?.replace(/&amp;/g, '&') : undefined; };
    out.push({ name, description, links: socialLinks({ website: field(/^website/i), instagram: field(/^instagram/i), facebook: field(/^facebook/i), linkedin: field(/^linkedin/i), tiktok: field(/^tiktok/i) }) });
  }
  return out;
}
export function facetCardToOrg(c: FacetCard, schoolId: string, listUrl: string): Organization {
  const text = `${c.name} ${c.description}`;
  // 그릭 협의회(Panhellenic Council 등)는 council, 지부는 greek — 소개에 “sorority/fraternity” 라고만 적은 곳도 greek
  const type: Organization['type'] = /\bcouncil\b/i.test(c.name) && GREEK_RE.test(text) ? 'council' : GREEK_RE.test(text) ? 'greek' : COUNCIL_RE.test(c.name) ? 'council' : 'club';
  const words = c.name.replace(/\([^)]*\)/g, ' ').replace(/[^A-Za-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w && !/^(of|the|at|and|for|in|ucsc|uc|santa|cruz|club)$/i.test(w));
  return {
    id: `${type === 'greek' ? 'og' : 'oc'}_${schoolId.replace('s_', '')}_gi_${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60)}`,
    name: c.name,
    logo: { emoji: words.slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '•', hue: Math.abs([...c.name].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7)) % 360 },
    type, schoolId, verified: false, description: c.description.slice(0, 600),
    gallery: [], regularActivities: [], notices: [], followerIds: [], memberIds: [], adminIds: [], applicantIds: [],
    links: [{ label: 'Directory', url: listUrl }, ...c.links],
  };
}

// ─── 분류별 이름 목록 (Santa Clara CSI RSO directory: 펼침 제목 = 분류, 문단 안 <br> 로 이름) ───
export interface NamedOrg { name: string; category: string }
export function parseAccordionDirectory(html: string): NamedOrg[] {
  const out: NamedOrg[] = [];
  // Caltech SFE 클럽 페이지: 이름만 <p> 로 두 칸에 나열 (two-column-text-block) — 설명·연락처는 학교 로그인 뒤라 이름만
  const at = html.search(/list of approved clubs/i);
  const section = at < 0 ? '' : html.slice(at, (html.indexOf('</section>', html.indexOf('two-column-text-block__row', at)) + 1 || html.length));
  for (const col of section.matchAll(/<div class="two-column-text-block__(?:left|right)-column-text[^"]*">\s*<div class="rich-text">([\s\S]*?)<\/div>/g)) {
    for (const p of col[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) { const name = strip(p[1]); if (name && name.length < 120) out.push({ name, category: '' }); }
  }
  for (const m of html.matchAll(/<div id="d\.en\.\d+" class="default-accordion[\s\S]*?(?=<div id="d\.en\.\d+" class="default-accordion|$)/g)) {
    const block = m[0];
    const category = strip(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/.exec(block)?.[1] ?? '');
    const body = /<div id="accordion-panel-[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(block)?.[1] ?? '';
    for (const line of body.split(/<br\s*\/?>|<\/p>\s*<p[^>]*>/i)) { const name = strip(line); if (name && name.length < 120) out.push({ name, category }); }
  }
  return out;
}
export function namedOrgToOrg(o: NamedOrg, schoolId: string, listUrl: string): Organization {
  const text = `${o.name} ${o.category}`;
  // “(Business Coed Fraternity)” 처럼 이름 뒤 괄호 설명은 분류 말 — 직업·학술 그릭(전문 프래터니티)도 greek 으로
  const type: Organization['type'] = /\bcouncil\b/i.test(o.name) && GREEK_RE.test(text) ? 'council' : GREEK_RE.test(o.name) ? 'greek' : COUNCIL_RE.test(o.name) && !/^organization of\b/i.test(o.name) ? 'council' : 'club';
  const words = o.name.replace(/\([^)]*\)/g, ' ').replace(/[^A-Za-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w && !/^(of|the|at|and|for|in|scu|santa|clara|caltech|club)$/i.test(w));
  return {
    id: `${type === 'greek' ? 'og' : 'oc'}_${schoolId.replace('s_', '')}_dir_${o.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60)}`,
    name: o.name,
    logo: { emoji: words.slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '•', hue: Math.abs([...o.name].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7)) % 360 },
    type, schoolId, parent: o.category || undefined, verified: false, description: '',
    gallery: [], regularActivities: [], notices: [], followerIds: [], memberIds: [], adminIds: [], applicantIds: [],
    links: [{ label: 'Directory', url: listUrl }],
  };
}

// ─── USF myUSF 단체 목록 (Drupal 펼침 카드: 제목 h2 · 소개 문단 · INSTAGRAM | website 링크) ───
export interface CardOrg { name: string; description: string; links: Link[]; category: string }
export function parseDrupalAccordionCards(html: string, category: string): CardOrg[] {
  const out: CardOrg[] = [];
  for (const raw of html.split('<div class="card-header panel-heading"').slice(1)) {
    const name = strip(/<h2 class="accordion-title-h">([\s\S]*?)<\/h2>/.exec(raw)?.[1] ?? '');
    if (!name) continue;
    const body = /<div class="clearfix text-formatted[^>]*>([\s\S]*?)<\/div>/.exec(raw)?.[1] ?? '';
    const paras = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => m[1]);
    const description = paras.filter((p) => !/<a [^>]*class="diamond_link/.test(p)).map(strip).filter(Boolean).join(' ');
    const anchors = [...body.matchAll(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => ({ url: m[1].replace(/&amp;/g, '&'), text: strip(m[2]) }));
    const pick = (re: RegExp, host?: RegExp) => anchors.find((a) => re.test(a.text) || (host && host.test(a.url)))?.url;
    const links = socialLinks({ instagram: pick(/^instagram$/i, /instagram\.com/i), facebook: pick(/^facebook$/i, /facebook\.com/i), linkedin: pick(/^linkedin$/i, /linkedin\.com/i), website: pick(/^(website|web site|site)$/i) });
    out.push({ name, description, links, category });
  }
  return out;
}
export function cardOrgToOrg(c: CardOrg, schoolId: string, listUrl: string): Organization {
  const text = `${c.name} ${c.category} ${c.description}`;
  const type: Organization['type'] = /\bcouncil\b/i.test(c.name) && GREEK_RE.test(text) ? 'council' : GREEK_RE.test(`${c.name} ${c.category}`) ? 'greek' : COUNCIL_RE.test(c.name) ? 'council' : 'club';
  const words = c.name.replace(/\([^)]*\)/g, ' ').replace(/[^A-Za-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w && !/^(of|the|at|and|for|in|usf|club)$/i.test(w));
  return {
    id: `${type === 'greek' ? 'og' : 'oc'}_${schoolId.replace('s_', '')}_dir_${c.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60)}`,
    name: c.name,
    logo: { emoji: words.slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '•', hue: Math.abs([...c.name].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7)) % 360 },
    type, schoolId, parent: c.category || undefined, verified: false, description: c.description.slice(0, 600),
    gallery: [], regularActivities: [], notices: [], followerIds: [], memberIds: [], adminIds: [], applicantIds: [],
    links: [{ label: 'Directory', url: listUrl }, ...c.links],
  };
}

/**
 * 학교 디렉터리 분류 중 학생 단체가 아닌 학교 부서·사무실·직원 모임 (2026-11-03 검사: Tufts “Orientation & Student Experience”, JHU “Pava Center” 가 동아리로 보였다).
 * 지우지 않고 type 'department' 로 둔다 (사장님: 모은 데이터는 지우지 않는다) — 동아리 목록에는 안 나온다.
 * “Department Sponsored Student Organization” 처럼 학생 단체라고 적힌 분류는 해당 없음.
 */
const STRONG_OFFICE = /^residence halls?$|^residential (community|life|halls?)$|non[- ]student org|staff[- ]only|faculty\/staff|university committee|student affairs unit|university unit|president'?s office|\bdepartments? (&|and) programs?\b/i; // Illinois "Grainger Departments & Programs" = 공대 학과·사무실 32곳 (2026-11-03)
const WEAK_OFFICE = /\b(university|academic|campus) (department|office|unit)s?\b|^departments?( and programs| or program)?$|departmental programs|department ?office|department\/office|\boffices$|university offices?|career services|campus centers, museums|group management|admin(istrative)? group|\badministration\b|^administrative$|dean'?s office/i;
const OFFICE_NAME = /\b(center|centre|office|department|dept\.?|program|programs|services?|museum|institute|faculty|staff|committee|division|school of|college of|library|libraries|admissions|advising|registrar|recreation|housing|dining|alumni|career|campus life|student life|student affairs|dean|residential|ministry office|initiative|orientation|student experience|engagement|wellness|well-?being|support|success|equity|inclusion|operations|affairs|conduct|accountability)\b|\bschool$/i;
const CLUB_NAME = /^american (institute|society) of\b|\b(club|society|association|team|magazine|journal|chapter|alliance|collective|ensemble|choir|band|league|union|coalition|students for|student group|fraternity|sorority)\b|@/i;
/** 이름과 분류로 학교 부서인가 — 분류가 확실하면(직원 전용·비학생 단체 등) 이름과 상관없이, 애매한 분류(“Department”)면 이름도 부서 같을 때만 */
export function isOfficeOrg(name: string, category?: string): boolean {
  if (COUNCIL_RE.test(name)) return false;
  // 분류가 없어도(Engage) 이름이 "Office of … / Department of … / Division of … / Center for …" 이고 학생 단체 말이 없으면 학교 부서 (UMD "Department of Environmental Safety…")
  if (/^(department|office|division|center|centre) (of|for)\b/i.test(name) && !CLUB_NAME.test(name)) return true;
  // "School of …"/"College of …" 는 학생 모임이 많다(Graduate Student Organization, Student Board, Ambassadors, Class of 2027 …) — 학생 말이 하나도 없을 때만 학교 부서
  if (/^(school|college) of\b/i.test(name) && !CLUB_NAME.test(name) && !/\b(students?|board|ambassadors?|class of|committee|council|mentor(ing|s)?|program|productions?|foodies|peer|chapter|alliance|network|group)\b/i.test(name)) return true;
  // "University … Services/Center/Office" (UW-Madison University Health Services, UVA University Career Center …) — 학생 단체 말이 없으면 학교 부서. Michigan "University Activities Center" 는 학생 단체라 activities 는 뺀다 (2026-11-04)
  if (/^(the )?university\b.*\b(services|center|centre|office|offices|department)$/i.test(name.trim()) && !CLUB_NAME.test(name) && !/\b(activities|students?)\b/i.test(name)) return true;
  // 학교 서비스 이름으로 끝나면 (Emory Bookstore, UTPD, University Registrar …) — "Bookstore Basketball Commission"(학생 대회)은 끝이 아니라 해당 없음
  if (/\b(bookstore|book store|police department|dining services|registrar('s office)?|transportation services|parking services|parking and transportation)\s*(\([^)]*\))?$/i.test(name.trim())) return true;
  if (!category || /student org(anization)?s?\b/i.test(category.replace(/non[- ]student org[^)]*\)?/i, ''))) return false;
  if (STRONG_OFFICE.test(category)) return true;
  return WEAK_OFFICE.test(category) && OFFICE_NAME.test(name) && !CLUB_NAME.test(name);
}

/**
 * 단체 소개 글 안의 주소만 (Presence 목록은 링크 칸이 없다 — WashU 640개 중 72개가 소개에 사이트·인스타를 적어 둔다).
 * "@handle" 처럼 주소가 아닌 것은 어느 서비스인지 몰라 쓰지 않는다. 신청서·드라이브·메일·줌·음악 링크는 뺀다.
 */
export function descriptionLinks(textOrHtml: string): Link[] {
  const t = (textOrHtml ?? '').replace(/&#34;?|&#x22;?|&quot;?|&#39;?|&apos;?/gi, '"').replace(/&amp;/g, '&');
  const urls = [...new Set([...t.matchAll(/https?:\/\/[^\s"'<>)\]]+/gi)].map((m) => m[0].replace(/[.,;:!]+$/, '')))];
  const skip = /forms\.gle|typeform\.com|chat\.whatsapp\.com|wa\.me|join\.slack\.com|t\.me\/|jotform\.com|docs\.google|drive\.google|forms\.office|mailto:|gmail\.com|zoom\.us|calendly|spotify\.com|apple\.com\/music|groupme|discord\.(gg|com)|presence\.io|campuslabs|campusgroups/i;
  const by = (re: RegExp) => urls.find((u) => re.test(u));
  return socialLinks({ instagram: by(/instagram\.com\/[A-Za-z0-9_.]+/i), facebook: by(/(facebook|fb)\.com\//i), linkedin: by(/linkedin\.com\//i), youtube: by(/youtube\.com|youtu\.be/i), tiktok: by(/tiktok\.com/i),
    website: urls.find((u) => !skip.test(u) && !/instagram|facebook|fb\.com|linkedin|twitter|x\.com\/|youtube|youtu\.be|tiktok/i.test(u)) });
}

// ─── Brown Student Activities 단체 목록 (studentactivities.brown.edu/dsf_orgs_undergrad) — 412개, 이름·분류·소개 + 단체별 공개 페이지(SNS 아이콘) ───
export interface BrownRow { name: string; category: string; description: string; path: string }
export function parseBrownDsf(html: string): BrownRow[] {
  const out: BrownRow[] = [];
  for (const raw of html.split('<div class="views-row">').slice(1)) {
    const name = strip(/<span class="dsf-title-text">([\s\S]*?)<\/span>/.exec(raw)?.[1] ?? '');
    const path = /<h3 class="dsf-title">\s*<a href="(\/organizations\/[^"]+)"/.exec(raw)?.[1] ?? '';
    if (!name || !path) continue;
    const category = strip(/term-item hidden"><a [^>]*>([\s\S]*?)<\/a>/.exec(raw)?.[1] ?? '');
    const description = strip(/<div class="dsf-intro[^"]*">([\s\S]*?)<\/div>/.exec(raw)?.[1] ?? '');
    out.push({ name, category, description, path });
  }
  return out;
}
/** 단체 페이지의 SNS 아이콘 칸 (social-media-icons) 안 링크만 — 머리·꼬리의 학교 링크는 빼고 */
export function parseBrownOrgLinks(html: string): Link[] {
  const i = html.indexOf('social-media-icons'); if (i < 0) return [];
  const block = html.slice(i, html.indexOf('</main>', i) > 0 ? html.indexOf('</main>', i) : i + 4000);
  const urls = [...block.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  const by = (re: RegExp) => urls.find((u) => re.test(u));
  return socialLinks({ instagram: by(/instagram\.com/i), facebook: by(/facebook\.com|fb\.com/i), linkedin: by(/linkedin\.com/i), twitter: by(/twitter\.com|\/\/x\.com/i), youtube: by(/youtube\.com|youtu\.be/i), tiktok: by(/tiktok\.com/i),
    website: urls.find((u) => /^https?:/.test(u) && !/instagram|facebook|fb\.com|linkedin|twitter|x\.com|youtube|youtu\.be|tiktok|mailto:/i.test(u)) });
}
export function brownRowToOrg(r: BrownRow, links: Link[], schoolId: string, origin: string): Organization {
  const o = cardOrgToOrg({ name: r.name, category: r.category, description: r.description, links }, schoolId, origin + r.path);
  // 분류 “Student Governance” 는 학생회, 이름만으로 정하지 않는다
  return /student governance/i.test(r.category) ? { ...o, type: 'council' } : o;
}

// ─── UCLA SOLE 등록 단체 공개 검색 (sa.ucla.edu/RCO, POST /Public/SearchOrganizations) — 1,451개, 사이트·SNS 링크 포함 ───
export interface UclaOrg { OrganizationID: number; OrganizationName: string; OrganizationDescription?: string | null; OrganizationWebSite?: string | null; Category1Name?: string | null; Category2Name?: string | null; MemberType?: string | null; SocialMediaLink?: string | null }
export function uclaOrgToOrg(o: UclaOrg, schoolId = 's_ucla'): Organization {
  const name = strip(o.OrganizationName);
  const cat = o.Category1Name ?? '';
  const type: Organization['type'] = /student government/i.test(cat) ? 'council' : /greek life/i.test(cat) ? (/\bcouncil\b/i.test(name) ? 'council' : 'greek') : COUNCIL_RE.test(name) ? 'council' : 'club';
  const social = [...(o.SocialMediaLink ?? '').matchAll(/href='([^']+)'/g)].map((m) => m[1]);
  const pick = (re: RegExp) => social.find((u) => re.test(u));
  const words = name.replace(/\([^)]*\)/g, ' ').replace(/[^A-Za-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w && !/^(of|the|at|and|for|in|ucla|bruin|bruins|club)$/i.test(w));
  return {
    id: `${type === 'greek' ? 'og' : 'oc'}_${schoolId.replace('s_', '')}_rco${o.OrganizationID}`,
    name,
    logo: { emoji: words.slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '•', hue: Math.abs([...name].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7)) % 360 },
    type, schoolId, parent: [cat, o.Category2Name].filter(Boolean).join(' · ') || undefined, verified: false,
    description: strip(o.OrganizationDescription ?? ''),
    gallery: [], regularActivities: [], notices: [], followerIds: [], memberIds: [], adminIds: [], applicantIds: [],
    links: [{ label: 'Directory', url: `https://sa.ucla.edu/RCO/public/search?q=${encodeURIComponent(name)}` }, ...socialLinks({ website: o.OrganizationWebSite, instagram: pick(/instagram\.com/i), facebook: pick(/facebook\.com/i), linkedin: pick(/linkedin\.com/i), twitter: pick(/twitter\.com|x\.com/i), youtube: pick(/youtube\.com|youtu\.be/i), tiktok: pick(/tiktok\.com/i) })],
  };
}

/** 디렉터리에 남은 시험용 가짜 단체("Test Club", "Test Org One", "Test CIO"…) — 파일에는 두고 화면·DB 로는 보내지 않는다 (2026-11-05 점검 15개). "Test Prep Club"·"Testing Center" 는 해당 없음 */
// 디렉터리 관리자가 만든 시험·견본 단체 (2026-11-08 점검: "Engage Test Org", "RSO Test Group", "Sandbox GT", "Peabody Institute: RSO Template", "DOSO - TEST", "(Inactive)" …).
// 진짜 단체는 남긴다: "Sandbox Improvisation"(즉흥극), "Singh Sandbox Makerspace", "The Archive", "Yale Film Archive"
export const isPlaceholderOrg = (name: string) => {
  const n = name.trim();
  return /^test\s+(club|org(anization)?|group|cio|clp|test)\b/i.test(n) || /^(asdf|do not use|delete me|to be archived)\b/i.test(n)
    || /\btest\s*(club|org(anization)?|group)\s*\d*$/i.test(n) || /^test-\w+$/i.test(n) || /[-:]\s*test$|\btest$/i.test(n) && !/\b(prep|kitchen|lab|labs|drive|pilots?|bench|flight|engineering|society)\s+test$/i.test(n)
    || /^(sandbox( gt| rso)?|.* sandbox)$/i.test(n) || /\brso template$/i.test(n) || /\(inactive\)$/i.test(n) || /\btest sample organization$/i.test(n);
};

// 학교 로그인 뒤 단체 포털 — 열면 로그인 화면으로 넘어간다 (Rutgers-Newark raiderlink: /webapp/auth/login?msg=LOGIN_REQUIRED, 201개, 2026-11-07)
const LOGIN_ONLY_RE = /^https?:\/\/raiderlink\.newark\.rutgers\.edu\//i;
// 없어진 옛 단체 주소 — 모두 일반 안내 페이지로 넘어간다 (Penn State clubs.psu.edu → 학생단체 안내, Michigan ross.campusgroups.com → 업체 소개, 2026-11-07)
const RETIRED_RE = /^https?:\/\/(www\.)?clubs\.psu\.edu\/|^https?:\/\/ross\.campusgroups\.com\//i;
const ADMIN_RE = /^https?:\/\/(manage|editor)\.wix\.com\/|^https?:\/\/[a-z0-9]+\.admin\.mailchimp\.com\/|^https?:\/\/sites\.google\.com\/d\/[A-Za-z0-9_-]{20,}/i;
/** 로그인 화면 주소 안에 든 원래 주소를 꺼낸다 (instagram ?next=, linkedin ?session_redirect=, twitter ?redirect_after_login=) */
export function publicFix(url: string): string {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\./, '');
    const inner = host === 'instagram.com' && u.pathname.startsWith('/accounts/login') ? u.searchParams.get('next')
      : host === 'linkedin.com' && /^\/(uas\/login|login|authwall)/.test(u.pathname) ? u.searchParams.get('session_redirect')
      : (host === 'twitter.com' || host === 'x.com') && u.pathname.startsWith('/i/flow/login') ? u.searchParams.get('redirect_after_login') : null;
    if (inner) { const t = new URL(inner, `https://www.${host}`); if (t.pathname.length > 1) return `https://www.${host}${t.pathname}`; }
    if (/\/wp-admin\/?$/.test(u.pathname)) return `${u.origin}${u.pathname.replace(/wp-admin\/?$/, '')}`;
    if (/\.squarespace\.com$/.test(host) && /^\/config\/?/.test(u.pathname)) return `${u.origin}/`;
    // 광고 추적 꼬리표(fbclid, utm_*, igshid …)만 뗀다 — 다른 쿼리는 그대로 (UMass linktr.ee?fbclid=…, 2026-11-06 점검)
    const track = [...u.searchParams.keys()].filter((k) => /^(fbclid|gclid|igsh|igshid|mc_cid|mc_eid|ltsid|utm_[a-z]+)$/i.test(k));
    if (track.length) { for (const k of track) u.searchParams.delete(k); return u.toString(); }
  } catch { /* not a URL */ }
  return url;
}
/** 모은 동아리 파일 다듬기(collect 때마다, 2026-11-05 점검):
 *  - 이모지가 있는 이름·설명만 이모지를 뺀다(다른 띄어쓰기는 그대로)
 *  - 디렉터리가 두 번 감싼 HTML 문자(&amp; &#39;)를 푼다 (UW·Lehigh)
 *  - 링크 앞뒤 빈칸은 지우고, 가운데 빈칸이 있어 열리지 않는 주소("facebook.com/Alpha Omicron Pi - SJSU")는 badLinks 로 돌려준다(호출하는 쪽이 deadlinks 에 남긴다) */
/**
 * 소개 글에 "Instagram: @handle" 처럼 서비스 이름과 함께 적은 계정 → 인스타 주소 (동아리가 직접 적은 것. 2026-11-08 54곳).
 * 서비스 이름 없이 "@handle" 만 있으면 어느 서비스인지 몰라 쓰지 않는다(descriptionLinks 와 같다). 메일 주소(@gmail.com)는 아니다.
 */
export function descriptionInstagram(text?: string): string | undefined {
  const m = /\b(?:instagram|insta|ig)\b\s*(?:handle|account|page)?\s*(?:is|at)?\s*[:\-\u2013]?\s*@([A-Za-z0-9._]{2,30})/i.exec(text ?? '');
  if (!m) return undefined;
  const h = m[1].replace(/\.+$/, '');
  if (h.length < 2 || /\.(com|edu|org|net)$/i.test(h) || /@/.test((text ?? '').slice(m.index + m[0].length, m.index + m[0].length + 1))) return undefined;
  return `https://www.instagram.com/${h.toLowerCase()}/`;
}

/** UMN GopherLink 은 단체 이름 끝에 등록 번호를 붙인다("GopherHack #4489", 1,222개 중 1,214개) — 이름이 아니라 번호라 뗀다. UCLA "USAC General Representative #1" 같은 자리 이름은 그대로 (UMN 만) */
export const stripRegNumber = (schoolId: string | undefined, name: string) => (schoolId === 's_umn' ? name.replace(/\s*#\d{2,5}$/, '') : name);

export function cleanCollectedOrgs(list: Organization[], today: string): { orgs: Organization[]; badLinks: { orgId: string; url: string; checkedAt: string; note: string }[] } {
  const has = (t?: string) => !!t && /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}]/u.test(t);
  const ent = (t?: string) => (t && /&(amp|quot|lt|gt|apos|#\d+|#x[0-9a-f]+);/i.test(t) ? decodeNumericEntities(t.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')).replace(/&amp;/g, '&') : t);
  const badLinks: { orgId: string; url: string; checkedAt: string; note: string }[] = [];
  // 동아리 50곳 이상이 같은 웹사이트·SNS 를 적었으면 그건 학교 부서 홈이다(UMN 학생회관 홈 184곳) — 동아리 자기 링크가 아니니 뺀다. 기숙사·봉사 프로그램끼리 부서 페이지를 같이 쓰는 것(10~23곳)은 그 모임에 맞는 링크라 둔다
  const DIR = /^(Directory|Presence|Cardinal Engage|MIT Engage|Penn Clubs)$/;
  const uses = new Map<string, number>(); for (const o of list) for (const u of new Set((o.links ?? []).filter((l) => !DIR.test(l.label)).map((l) => l.url.trim()))) uses.set(u, (uses.get(u) ?? 0) + 1);
  const shared = new Set([...uses].filter(([, n]) => n >= 50).map(([u]) => u));
  const tags = (t?: string) => (t && /<\/?(p|b|strong|i|em|br|div|span|ul|li|a)\b[^>]*>/i.test(t) ? t.replace(/<br\s*\/?>|<\/p>|<\/li>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/[ \t]{2,}/g, ' ').trim() : t);
  const orgs = list.map((o0) => {
    // 로그인 화면으로 저장된 SNS 주소 → 원래 프로필(주소 안 next/redirect 값). 관리자 주소 꼬리(/wp-admin, Squarespace /config) → 공개 사이트
    // 공개가 아닌 관리·편집 주소(Wix 대시보드, Mailchimp 관리, Google Sites 편집 링크)는 badLinks 로 (2026-11-05 점검 30여 개)
    if ((o0.links ?? []).some((l) => publicFix(l.url) !== l.url || ADMIN_RE.test(l.url) || LOGIN_ONLY_RE.test(l.url) || RETIRED_RE.test(l.url))) {
      const links: typeof o0.links = [];
      for (const l of o0.links ?? []) { if (ADMIN_RE.test(l.url) && l.label !== 'Directory') { badLinks.push({ orgId: o0.id, url: l.url, checkedAt: today, note: 'admin / editor address, not a public page' }); continue; } if (LOGIN_ONLY_RE.test(l.url) && l.label !== 'Directory') { badLinks.push({ orgId: o0.id, url: l.url, checkedAt: today, note: 'school login portal, not a public page' }); continue; } if (RETIRED_RE.test(l.url) && l.label !== 'Directory') { badLinks.push({ orgId: o0.id, url: l.url, checkedAt: today, note: 'retired directory address, redirects to a generic page' }); continue; } links.push({ ...l, url: publicFix(l.url) }); }
      o0 = { ...o0, links };
    }
    let o = has(o0.name) || has(o0.description) ? { ...o0, name: has(o0.name) ? stripEmoji(o0.name) || o0.name : o0.name, ...(has(o0.description) ? { description: stripEmoji(o0.description!) } : {}) } : o0;
    if (ent(o.name) !== o.name || ent(o.description) !== o.description) o = { ...o, name: ent(o.name)!, ...(o.description ? { description: ent(o.description) } : {}) };
    if (tags(o.description) !== o.description) o = { ...o, description: tags(o.description)! };
    if ((o.links ?? []).some((l) => shared.has(l.url.trim()) && !DIR.test(l.label))) {
      for (const l of (o.links ?? []).filter((l) => shared.has(l.url.trim()) && !DIR.test(l.label))) badLinks.push({ orgId: o.id, url: l.url.trim(), checkedAt: today, note: `${l.label} is a school page shared by ${uses.get(l.url.trim())} clubs, not this club's own` });
      o = { ...o, links: (o.links ?? []).filter((l) => !(shared.has(l.url.trim()) && !DIR.test(l.label))) };
    }
    if ((o.links ?? []).some((l) => l.url !== l.url.trim() || /\s/.test(l.url.trim()))) {
      const links = (o.links ?? []).map((l) => ({ ...l, url: l.url.trim() }));
      for (const l of links.filter((l) => /\s/.test(l.url))) badLinks.push({ orgId: o.id, url: l.url, checkedAt: today, note: `${l.label} address has spaces - does not open` });
      o = { ...o, links: links.filter((l) => !/\s/.test(l.url)) };
    }
    if (stripRegNumber(o.schoolId, o.name) !== o.name) o = { ...o, name: stripRegNumber(o.schoolId, o.name) };
    // 인스타 링크가 없는데 소개에 "Instagram: @handle" 이 있으면 붙인다
    const ig = (o.type === 'club' || o.type === 'greek') && !(o.links ?? []).some((l) => l.label === 'Instagram') ? descriptionInstagram(o.description) : undefined;
    if (ig) o = { ...o, links: [...(o.links ?? []), { label: 'Instagram', url: ig }] };
    return o;
  });
  return { orgs, badLinks };
}
