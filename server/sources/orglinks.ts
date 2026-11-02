/**
 * 동아리·학생회 연락 링크 — 공식 사이트 · 인스타그램 · 페이스북 · 링크드인 · X · 유튜브 · 틱톡.
 * 디렉터리가 공개로 주는 값만 쓴다 (지어내지 않는다). 2026-11-02 사장님: "정보 얻을 수 있는 사이트 링크도 가져와야"
 */
import type { Organization } from '@core/types';

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
const strip = (h = '') => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
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
