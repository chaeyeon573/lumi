/**
 * 동아리 공식 웹사이트·소셜 링크 — CalLink(동아리 명부)는 이제 CalNet 로그인 없이는 안 열려서, 학생이 동아리를 볼 길이 없다.
 * 버클리 동아리 상당수는 학교가 주는 `<이름>.studentorg.berkeley.edu` 사이트를 쓰고, 이름은 CalLink 주소의 이름(websiteKey)과 같다.
 * 그 사이트가 열리면 웹사이트로 넣고, 동아리가 사이트에 직접 걸어 둔 인스타·페이스북·디스코드·링크드인·TikTok·Linktree 를 가져온다
 * (남이 만든 비슷한 계정을 검색으로 고르지 않는다 — 동아리가 걸어 둔 것만).
 */
import type { Organization } from '@core/types';

const PLATFORMS: [string, RegExp][] = [
  ['Instagram', /^https?:\/\/(?:www\.)?instagram\.com\/([A-Za-z0-9_.]+)\/?$/],
  ['Discord', /^https?:\/\/(?:www\.)?(?:discord\.gg\/[A-Za-z0-9-]+|discord\.com\/invite\/[A-Za-z0-9-]+)\/?$/],
  ['Facebook', /^https?:\/\/(?:www\.)?facebook\.com\/(?!sharer|share|dialog|plugins|tr\b|\d{4}\/)[A-Za-z0-9_.\-/]+$/],
  ['LinkedIn', /^https?:\/\/(?:www\.)?linkedin\.com\/company\/[A-Za-z0-9_\-]+\/?$/],
  ['TikTok', /^https?:\/\/(?:www\.)?tiktok\.com\/@[A-Za-z0-9_.]+\/?$/],
  ['Linktree', /^https?:\/\/(?:www\.)?linktr\.ee\/[A-Za-z0-9_.]+\/?$/],
];
const NOT_A_PROFILE = /^(p|reel|reels|explore|stories|accounts|share|embed|tv)$/i;

/** 사이트 HTML 에 걸린 소셜 링크 — 플랫폼마다 첫 번째 프로필 하나 (게시물·공유 버튼 링크는 아니다) */
export function socialLinksIn(html: string): { label: string; url: string }[] {
  const found = new Map<string, string>();
  for (const m of html.matchAll(/https?:\/\/(?:www\.)?(?:instagram\.com|facebook\.com|discord\.gg|discord\.com\/invite|linkedin\.com\/company|tiktok\.com|linktr\.ee)\/[A-Za-z0-9_.@\-/]+/g)) {
    // 인스타 게시물(/p/…)·임베드(/embed)는 계정 주소로 줄인다
    let url = m[0].replace(/\/+$/, '').replace(/^http:/, 'https:');
    const ig = /^https:\/\/(?:www\.)?instagram\.com\/([^/]+)/.exec(url);
    if (ig) { if (NOT_A_PROFILE.test(ig[1])) continue; url = `https://www.instagram.com/${ig[1]}`; }
    for (const [label, re] of PLATFORMS) if (!found.has(label) && re.test(url)) { found.set(label, url); break; }
  }
  return [...found].map(([label, url]) => ({ label, url }));
}

/** CalLink 버튼은 그대로 두되 맨 뒤로, 웹사이트·소셜을 앞에 */
export function withSiteLinks(org: Organization, site: string, social: { label: string; url: string }[]): Organization | null {
  const old = org.links ?? [];
  const keep = old.filter((l) => l.label !== 'Website' && !/studentorg\.berkeley\.edu|instagram\.com|facebook\.com|discord\.(gg|com)|linkedin\.com|tiktok\.com|linktr\.ee/.test(l.url));
  const next = [{ label: 'Website', url: site }, ...social, ...keep];
  if (JSON.stringify(next) === JSON.stringify(old)) return null;
  return { ...org, links: next };
}

const keyOf = (o: Organization) => (o.links ?? []).map((l) => /callink\.berkeley\.edu\/organization\/([a-z0-9-]+)\/?$/i.exec(l.url)?.[1]).find(Boolean)?.toLowerCase();

/**
 * studentorg 주소를 안 쓰는 동아리 — 사람이(또는 PM agent 가) 공식 사이트임을 확인한 주소 목록 (server/data/org-sites-berkeley.csv: org_id,site,checked,evidence).
 * 소셜 링크는 똑같이 그 사이트에 동아리가 걸어 둔 것만 가져온다.
 */
export function knownSites(csv: string): Map<string, string> {
  const rows = csv.trim().split('\n').slice(1).map((l) => l.split(','));
  return new Map(rows.filter((r) => r[0] && /^https:\/\//.test(r[1] ?? '')).map((r) => [r[0].trim(), r[1].trim()]));
}

/** 바뀐 동아리만 돌려준다. 사이트가 없거나 안 열리면 건드리지 않는다 */
export async function findStudentOrgSites(orgs: Organization[], concurrency = 12, known: Map<string, string> = new Map()): Promise<Organization[]> {
  const todo = orgs.filter((o) => o.schoolId === 's_berkeley' && (known.has(o.id) || keyOf(o)));
  const out: Organization[] = []; let i = 0;
  const worker = async () => {
    while (i < todo.length) {
      const o = todo[i++];
      try {
        const listed = known.get(o.id);
        const r = await fetch(listed ?? `https://${keyOf(o)}.studentorg.berkeley.edu/`, { signal: AbortSignal.timeout(8000) });
        if (!r.ok) continue;
        const site = listed ?? r.url.replace(/\/+$/, '/');
        if (!listed && !/\.studentorg\.berkeley\.edu\//.test(site)) continue; // 다른 곳으로 넘어가면 그 동아리 사이트인지 모른다
        const next = withSiteLinks(o, site, socialLinksIn(await r.text()));
        if (next) out.push(next);
      } catch { /* 없으면 그대로 */ }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return out;
}
