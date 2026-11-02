/**
 * 단체 웹사이트에서 공식 인스타그램·페이스북 찾기 — 사이트 첫 페이지의 링크만 본다 (공개 정보, 지어내지 않음).
 * 학교 사이트에 얹힌 동아리 페이지는 바닥글에 학교 계정(@ucdavis 등)이 붙는다 → 같은 학교에서 3곳 이상에 나온 계정은 학교 것으로 보고 버린다.
 */
import type { Organization } from '@core/types';

type Link = { label: string; url: string };
const IG_SKIP = /^(p|reel|reels|explore|accounts|stories|tv|about|developer|legal|direct|web)$/i;
const FB_SKIP = /^(sharer|sharer\.php|share|dialog|plugins|tr|login|login\.php|help|policies|privacy|groups\/?$|events\/?$|pages\/?$|profile\.php|recover|reg|r\.php|lite|watch|about|ad_campaign|careers|home\.php|marketplace|gaming|business|privacy_policy|terms|cookies|ads|legal)$/i;

/** 페이지 HTML → 인스타·페북 주소 전부 (나온 순서, 중복 없이) */
export function extractAllSocial(html: string): { instagram: string[]; facebook: string[] } {
  const ig: string[] = []; const fb: string[] = [];
  for (const m of html.matchAll(/href=["'](https?:\/\/(?:www\.|m\.)?(instagram\.com|facebook\.com|fb\.com)\/([^"'?#]+))[^"']*["']/gi)) {
    const host = m[2].toLowerCase(); const pathPart = m[3].replace(/\/+$/, ''); const first = pathPart.split('/')[0];
    if (!first) continue;
    if (host === 'instagram.com') { if (!IG_SKIP.test(first) && /^[A-Za-z0-9_.]{2,30}$/.test(first)) { const u = `https://www.instagram.com/${first.toLowerCase()}/`; if (!ig.includes(u)) ig.push(u); } }
    else if ((first === 'groups' || first === 'pages') ? pathPart.split('/').length >= 2 : !FB_SKIP.test(first)) { const page = first === 'groups' || first === 'pages' ? pathPart.split('/').slice(0, 2).join('/') : first; const u = `https://www.facebook.com/${page}`; if (!fb.includes(u)) fb.push(u); }
  }
  return { instagram: ig, facebook: fb };
}
/** 페이지 HTML → 인스타·페북 주소 (여럿이면 처음 것) */
export function extractSocial(html: string): { instagram?: string; facebook?: string } {
  const a = extractAllSocial(html); const out: { instagram?: string; facebook?: string } = {};
  if (a.instagram[0]) out.instagram = a.instagram[0];
  if (a.facebook[0]) out.facebook = a.facebook[0];
  return out;
}
const handle = (url: string) => url.replace(/^https:\/\/www\.(instagram|facebook)\.com\//, '').replace(/\/$/, '').toLowerCase();

/**
 * Website 링크가 있고 인스타·페북이 비어 있는 단체마다 사이트 첫 페이지를 한 번 읽는다.
 * fetchPage 는 실패하면 '' 를 돌려준다. 결과: 고친 단체 목록 + 통계
 */
/** “Website” 칸에 인스타·페북 주소가 들어 있으면 그 이름으로 바꾼다 (사이트로 읽지 않는다) */
export function relabelSocialWebsites(o: Organization): Organization {
  if (!o.links?.some((l) => l.label === 'Website' && /(^|\.)(instagram|facebook|fb)\.com$/i.test(hostOf(l.url)))) return o;
  const links = o.links.map((l) => {
    if (l.label !== 'Website') return l;
    const h = hostOf(l.url);
    if (/instagram\.com$/i.test(h)) { const u = extractAllSocial(`href="${l.url}"`).instagram[0]; return u ? { label: 'Instagram', url: u } : l; }
    if (/(facebook|fb)\.com$/i.test(h)) { const u = extractAllSocial(`href="${l.url}"`).facebook[0]; return u ? { label: 'Facebook', url: u } : l; }
    return l;
  });
  return { ...o, links: links.filter((l, i) => links.findIndex((x) => x.label === l.label) === i || l.label === 'Directory') };
}
const hostOf = (u: string) => { try { return new URL(u).hostname; } catch { return ''; } };

export async function enrichFromWebsites(orgs: Organization[], fetchPage: (url: string) => Promise<string>, concurrency = 6): Promise<{ orgs: Organization[]; checked: number; found: number; droppedShared: string[] }> {
  orgs = orgs.map(relabelSocialWebsites);
  const want = orgs.filter((o) => o.links?.some((l) => l.label === 'Website') && !(o.links?.some((l) => l.label === 'Instagram') && o.links?.some((l) => l.label === 'Facebook')));
  const got = new Map<string, { instagram: string[]; facebook: string[] }>();
  let i = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (i < want.length) {
      const o = want[i++]; const site = o.links!.find((l) => l.label === 'Website')!.url;
      try { const html = await fetchPage(site); if (html) got.set(o.id, extractAllSocial(html)); } catch { /* skip */ }
    }
  }));
  // 학교 바닥글 계정 거르기
  const count = new Map<string, number>();
  for (const s of got.values()) for (const u of [...s.instagram, ...s.facebook]) count.set(handle(u), (count.get(handle(u)) ?? 0) + 1);
  const shared = new Set([...count].filter(([, n]) => n >= 3).map(([h]) => h));
  let found = 0;
  const next = orgs.map((o) => {
    const s = got.get(o.id); if (!s) return o;
    const add: Link[] = [];
    const ig = s.instagram.find((u) => !shared.has(handle(u))); const fb = s.facebook.find((u) => !shared.has(handle(u)));
    if (ig && !o.links?.some((l) => l.label === 'Instagram')) add.push({ label: 'Instagram', url: ig });
    if (fb && !o.links?.some((l) => l.label === 'Facebook')) add.push({ label: 'Facebook', url: fb });
    if (!add.length) return o;
    found++;
    return { ...o, links: [...(o.links ?? []), ...add] };
  });
  return { orgs: next, checked: got.size, found, droppedShared: [...shared] };
}
