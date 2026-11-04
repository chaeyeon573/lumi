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
    else if ((first === 'groups' || first === 'pages') ? pathPart.split('/').length >= 2 : !FB_SKIP.test(first)) { const page = first === 'pages' ? pathPart.split('/').slice(0, 3).join('/') : first === 'groups' ? pathPart.split('/').slice(0, 2).join('/') : first; /* pages/<이름>/<번호> 는 번호까지 있어야 열린다 */ const u = `https://www.facebook.com/${page}`; if (!fb.includes(u)) fb.push(u); }
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
/**
 * 계정 이름이 그 단체와 이어지는지 — 이름의 낱말(4자 이상)·머리글자·사이트 주소 앞부분 중 하나가 계정에 들어 있어야 한다.
 * 동아리 사이트에 회장 개인 페이스북이 걸려 있던 경우(facebook.com/Sitara.Bellam)를 거른다 (2026-11-02 검사)
 */
const STOPW = new Set(['berkeley', 'stanford', 'club', 'society', 'association', 'student', 'students', 'the', 'and', 'for', 'california', 'university', 'organization', 'group', 'team', 'formerly', 'known']);
export function relatedHandle(url: string, name: string, site?: string): boolean {
  const h = url.replace(/^https?:\/\/(www\.|m\.)?(instagram|facebook|fb)\.com\//i, '').replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (!h) return false;
  const clean = name.replace(/\([^)]*\)/g, ' ').replace(/[^A-Za-z0-9 ]/g, ' ');
  const words = clean.toLowerCase().split(/\s+/).filter((w) => w.length >= 4 && !STOPW.has(w));
  const acronym = clean.split(/\s+/).filter((w) => w && !/^(of|the|at|and|for|in)$/i.test(w)).map((w) => w[0]).join('').toLowerCase();
  const sub = site ? (() => { try { return new URL(site).hostname.split('.')[0].toLowerCase(); } catch { return ''; } })() : '';
  return words.some((w) => h.includes(w)) || (acronym.length >= 3 && h.includes(acronym)) || (sub.length >= 3 && sub !== 'www' && h.includes(sub));
}

const handle = (url: string) => url.replace(/^https:\/\/www\.(instagram|facebook)\.com\//, '').replace(/\/$/, '').toLowerCase();

/**
 * Website 링크가 있고 인스타·페북이 비어 있는 단체마다 사이트 첫 페이지를 한 번 읽는다.
 * fetchPage 는 실패하면 '' 를 돌려준다. 결과: 고친 단체 목록 + 통계
 */
/** “Website” 칸에 인스타·페북 주소가 들어 있으면 그 이름으로 바꾼다 (사이트로 읽지 않는다) */
export function relabelSocialWebsites(o: Organization): Organization {
  // 신청서(Google Form·Typeform·Jotform·MS Forms)는 웹사이트가 아니다 — 'Sign-up form' 으로 (Lehigh Inspire Her 등 45곳, 2026-11-04)
  const FORM = /^https?:\/\/(docs\.google\.com\/forms|forms\.gle|[^/]*typeform\.com|[^/]*jotform\.com|forms\.office\.com)/i;
  if (o.links?.some((l) => l.label === 'Website' && FORM.test(l.url))) o = { ...o, links: o.links.map((l) => (l.label === 'Website' && FORM.test(l.url) ? { label: 'Sign-up form', url: l.url } : l)) };
  // 단톡방 초대(WhatsApp·Slack·Telegram)도 웹사이트가 아니다 — 'Group chat' (UT·WashU·UW 등 27곳, 2026-11-04)
  const CHAT = /^https?:\/\/(chat\.whatsapp\.com|wa\.me|join\.slack\.com|t\.me)\//i;
  if (o.links?.some((l) => l.label === 'Website' && CHAT.test(l.url))) o = { ...o, links: o.links.map((l) => (l.label === 'Website' && CHAT.test(l.url) ? { label: 'Group chat', url: l.url } : l)) };
  if (!o.links?.some((l) => l.label === 'Website' && /(^|\.)(instagram|facebook|fb|discord)\.(com|gg)$/i.test(hostOf(l.url)))) return o;
  const links = o.links.map((l) => {
    if (l.label !== 'Website') return l;
    const h = hostOf(l.url);
    if (/instagram\.com$/i.test(h)) { const u = extractAllSocial(`href="${l.url}"`).instagram[0]; return u ? { label: 'Instagram', url: u } : l; }
    if (/(facebook|fb)\.com$/i.test(h)) { const u = extractAllSocial(`href="${l.url}"`).facebook[0]; return u ? { label: 'Facebook', url: u } : l; }
    if (/(^|\.)discord\.(gg|com)$/i.test(h)) return { label: 'Discord', url: l.url };
    return l;
  });
  return { ...o, links: links.filter((l, i) => links.findIndex((x) => x.label === l.label) === i || l.label === 'Directory') };
}
const hostOf = (u: string) => { try { return new URL(u).hostname; } catch { return ''; } };

/** 사이트가 없어졌다고 확실한 응답(404·410, Wix 의 “404 Error: Page Not Found”) — 이런 Website 링크는 뺀다. 연결 실패·타임아웃은 모르는 것으로 보고 둔다 */
export const DEAD = '__dead__';
export function isDeadPage(status: number, html: string): boolean { return status === 404 || status === 410 || /<title[^>]*>\s*404 Error: Page Not Found/i.test(html); }

/** 동아리가 '웹사이트 없음' 대신 적은 가짜 주소 (Cornell 16곳 idonothaveawebsite.com, 2026-11-04) — 응답 없는 주소처럼 화면에서 빼고 deadlinks 에 남긴다 */
export const isPlaceholderSite = (url: string) => /^https?:\/\/(www\.)?(idonothaveawebsite|nowebsite|example|website|none|tbd|test)\.(com|org|net)\/?$/i.test(url.trim());
export async function enrichFromWebsites(orgs: Organization[], fetchPage: (url: string) => Promise<string>, concurrency = 6): Promise<{ orgs: Organization[]; checked: number; found: number; droppedShared: string[]; deadLinks: number; deadList: { orgId: string; url: string }[] }> {
  orgs = orgs.map(relabelSocialWebsites);
  const want = orgs.filter((o) => o.links?.some((l) => l.label === 'Website') && !(o.links?.some((l) => l.label === 'Instagram') && o.links?.some((l) => l.label === 'Facebook')));
  const got = new Map<string, { instagram: string[]; facebook: string[] }>(); const dead = new Set<string>();
  let i = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (i < want.length) {
      const o = want[i++]; const site = o.links!.find((l) => l.label === 'Website')!.url;
      if (isPlaceholderSite(site)) { dead.add(o.id); continue; }
      try { const html = await fetchPage(site); if (html === DEAD) dead.add(o.id); else if (html) got.set(o.id, extractAllSocial(html)); } catch { /* skip */ }
    }
  }));
  // 학교 바닥글 계정 거르기
  const count = new Map<string, number>();
  for (const s of got.values()) for (const u of [...s.instagram, ...s.facebook]) count.set(handle(u), (count.get(handle(u)) ?? 0) + 1);
  const shared = new Set([...count].filter(([, n]) => n >= 3).map(([h]) => h));
  let found = 0;
  const next = orgs.map((o0) => {
    const o = dead.has(o0.id) ? { ...o0, links: o0.links?.filter((l) => l.label !== 'Website') } : o0;
    const s = got.get(o.id); if (!s) return o;
    const add: Link[] = [];
    const site = o.links?.find((l) => l.label === 'Website')?.url;
    const ok = (u: string) => !shared.has(handle(u)) && relatedHandle(u, o.name, site);
    const ig = s.instagram.find(ok); const fb = s.facebook.find(ok);
    if (ig && !o.links?.some((l) => l.label === 'Instagram')) add.push({ label: 'Instagram', url: ig });
    if (fb && !o.links?.some((l) => l.label === 'Facebook')) add.push({ label: 'Facebook', url: fb });
    if (!add.length) return o;
    found++;
    return { ...o, links: [...(o.links ?? []), ...add] };
  });
  // 응답 없는 웹사이트 주소는 화면 링크에서 빼되 버리지 않고 돌려준다(호출하는 쪽이 <id>.deadlinks.json 에 남긴다 — 모은 데이터는 지우지 않는다)
  const deadList = orgs.filter((o) => dead.has(o.id)).map((o) => ({ orgId: o.id, url: o.links!.find((l) => l.label === 'Website')!.url }));
  return { orgs: next, checked: got.size, found, droppedShared: [...shared], deadLinks: dead.size, deadList };
}
