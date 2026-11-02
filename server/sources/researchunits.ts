/**
 * UC Berkeley 연구소 — 연구 담당 부총장실(VCR)의 공식 Research Units 목록(vcresearch.berkeley.edu/research-units, 로그인 없음)을 쪽마다 읽는다.
 * 목록 한 줄 = 연구소 이름 + 책임자. 연구소 상세 페이지는 자동 요청을 막아 두어서(“Request blocked”) 열지 않고, 목록에 적힌 것만 쓴다.
 * 책임자 이메일·전화는 목록에 있어도 넣지 않는다(학생은 연구소 페이지에서 본다).
 * → organizations (type: lab, id ol_berkeley_ru_…, 공식 목록이라 verified). Campus › 동아리 › 연구실 칸.
 */
import type { Organization } from '@core/types';
import { decodeNumericEntities } from './entities';

const SITE = 'https://vcresearch.berkeley.edu';
export const RU_PREFIX = 'ol_berkeley_ru_';
const plain = (s: string) => decodeNumericEntities(s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#039;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')).replace(/\s+/g, ' ').trim();

export interface ResearchUnitRow { slug: string; name: string; director: string; url: string }

export function parseResearchUnits(html: string): ResearchUnitRow[] {
  const out: ResearchUnitRow[] = [];
  for (const art of html.match(/<article[^>]*node--type-research-unit[\s\S]*?<\/article>/g) ?? []) {
    // 대부분 /research-unit/<slug>, 몇 곳은 /index%2ephp/research-unit/<slug> 나 /index%2ephp/bampfa 같은 주소
    const a = /<a href="(\/[^"]*?)"[^>]*>([\s\S]*?)<\/a>/.exec(art);
    if (!a) continue;
    const href = a[1].replace(/^\/index%2ephp/i, '');
    const slug = href.split('/').filter(Boolean).pop() ?? '';
    if (!/^[a-z0-9-]+$/.test(slug)) continue;
    const cols = [...art.matchAll(/<div class="col-xs-12[^"]*">([\s\S]*?)<\/div>/g)].map((m) => plain(m[1]));
    const name = plain(a[2]);
    const director = cols[1] && !cols[1].includes('@') ? cols[1] : '';
    if (name) out.push({ slug, name, director, url: SITE + href });
  }
  return out;
}

export function researchUnitToOrg(r: ResearchUnitRow): Organization {
  const words = r.name.replace(/\(.*?\)/g, ' ').replace(/[^A-Za-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w && !/^(of|the|for|and|in|on|at|uc|berkeley|center|institute)$/i.test(w));
  const abbr = /\(([A-Z][A-Za-z0-9-]{1,7})\)/.exec(r.name)?.[1];
  return {
    id: `${RU_PREFIX}${r.slug.replace(/-/g, '_')}`.slice(0, 120), name: r.name,
    logo: { emoji: abbr ?? (words.slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '🔬'), hue: Math.abs([...r.name].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7)) % 360 },
    type: 'lab', schoolId: 's_berkeley', parent: 'Research center', verified: true,
    description: `Official UC Berkeley research unit (VCR list).${r.director ? ` Director: ${r.director}.` : ''}`,
    gallery: [], regularActivities: [], notices: [], followerIds: [], memberIds: [], adminIds: [], applicantIds: [],
    links: [{ label: 'Website', url: r.url }],
  };
}

/** 이미 있는 연구소는 팔로워·멤버를 지키고 이름·책임자·링크만 고친다. 목록에서 빠지고 아무도 안 따르는 것은 지운다 */
export function mergeResearchUnits(fresh: Organization[], existing: Organization[]): { organizations: Organization[]; removed: string[] } {
  const byId = new Map(existing.map((o) => [o.id, o]));
  const organizations = fresh.flatMap((o) => {
    const prev = byId.get(o.id);
    const next = prev ? { ...prev, name: o.name, description: o.description, links: o.links, verified: true, logo: prev.logo.url ? prev.logo : o.logo } : o;
    return prev && JSON.stringify(prev) === JSON.stringify(next) ? [] : [next];
  });
  const freshIds = new Set(fresh.map((o) => o.id));
  const removed = existing.filter((o) => o.id.startsWith(RU_PREFIX) && !freshIds.has(o.id) && !o.followerIds.length && !o.memberIds.length).map((o) => o.id);
  return { organizations, removed };
}

export async function fetchResearchUnits(maxPages = 10): Promise<Organization[]> {
  const rows = new Map<string, ResearchUnitRow>();
  for (let page = 0; page < maxPages; page++) {
    const r = await fetch(`${SITE}/research-units?page=${page}`, { headers: { 'user-agent': 'Mozilla/5.0 AroundU-importer' } });
    if (!r.ok) throw new Error(`research-units page ${page} → ${r.status}`);
    const list = parseResearchUnits(await r.text());
    const before = rows.size;
    for (const x of list) rows.set(x.slug, x);
    if (!list.length || rows.size === before) break;
    await new Promise((res) => setTimeout(res, 300));
  }
  if (rows.size < 30) throw new Error(`only ${rows.size} research units — page layout changed?`);
  return [...rows.values()].map(researchUnitToOrg);
}
