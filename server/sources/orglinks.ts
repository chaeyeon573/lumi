/**
 * 동아리·학생회 연락 링크 — 공식 사이트 · 인스타그램 · 페이스북 · 링크드인 · X · 유튜브 · 틱톡.
 * 디렉터리가 공개로 주는 값만 쓴다 (지어내지 않는다). 2026-11-02 사장님: "정보 얻을 수 있는 사이트 링크도 가져와야"
 */
import type { Organization } from '@core/types';
import { decodeNumericEntities } from './entities';

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
/** 분류 이름에 붙은 “council” 이 학생회 뜻이 아닌 것 — Dartmouth 의 승인 기관 Council on Student Organizations(COSO) 등 */
export const notCouncil = (text: string) => text.replace(/council on student organizations|\bCOSO\b/gi, ' ');

// ─── Penn Clubs (pennclubs.com, UPenn 공식 학생 단체 디렉터리 · 공개 JSON) ───────────
export interface PennClub { code: string; name: string; subtitle?: string; description?: string; image_url?: string | null; active?: boolean; approved?: boolean | null; tags?: { name: string }[]; website?: string | null; instagram?: string | null; facebook?: string | null; linkedin?: string | null; twitter?: string | null; youtube?: string | null; tiktok?: string | null }
const GREEK_RE = /fraternit|sororit|greek|panhellenic|interfraternity|nphc|multicultural greek/i;
// 학교 목록 페이지의 글자 코드(&#039; &#8211; &#038; &oacute; …)를 모두 푼다 — 이름에 그대로 보이던 것 (2026-11-02 검사)
const NAMED: Record<string, string> = { amp: '&', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', hellip: '…', aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ', uuml: 'ü', ouml: 'ö', auml: 'ä', ccedil: 'ç' };
const decodeHtmlText = (h: string) => decodeNumericEntities(h.replace(/&([A-Za-z]+);/g, (m, n: string) => NAMED[n] ?? m)).replace(/&amp;/g, '&');
const strip = (h = '') => decodeHtmlText(h.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
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
  const type: Organization['type'] = /\bcouncil\b/i.test(o.name) && GREEK_RE.test(text) ? 'council' : GREEK_RE.test(o.name) ? 'greek' : COUNCIL_RE.test(o.name) ? 'council' : 'club';
  const words = o.name.replace(/\([^)]*\)/g, ' ').replace(/[^A-Za-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w && !/^(of|the|at|and|for|in|scu|santa|clara|club)$/i.test(w));
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
