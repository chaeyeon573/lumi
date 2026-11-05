/**
 * Berkeley Student Cooperative(BSC) 하우스·아파트 — 공식 사이트(bsc.coop/housing/our-houses-apartments, 로그인 없음)의 목록과 각 집 페이지 첫 소개.
 * → organizations (type: coop, id oo_berkeley_bsc_…). Explore › Clubs & Groups 의 Co-ops 칸, 온보딩 “Co-op Housing”.
 * 소개는 집 페이지 본문의 첫 문장 두어 개만(지어내지 않는다). 집이 목록에서 빠지면 아무도 안 따르는 것만 지운다.
 */
import type { Organization } from '@core/types';
import { decodeNumericEntities } from './entities';

const SITE = 'https://www.bsc.coop';
export const COOP_PREFIX = 'oo_berkeley_bsc_';
const UA = { 'user-agent': 'Mozilla/5.0 AroundU-importer' };
const plain = (s: string) => decodeNumericEntities(s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#039;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ')).replace(/\s+/g, ' ').trim();

/** 목록 쪽 → [slug, 이름] (메뉴와 본문에 같은 링크가 여러 번 있다 — 이름이 ‘Read More’ 가 아닌 첫 것) */
export function parseHouseList(html: string): { slug: string; name: string }[] {
  const out = new Map<string, string>();
  for (const m of html.matchAll(/href="\/housing\/our-houses-apartments\/([a-z0-9-]+)"[^>]*>([^<]{2,80})<\/a>/g)) {
    const name = plain(m[2]);
    if (!/read more/i.test(name) && !out.has(m[1])) out.set(m[1], name);
  }
  return [...out].map(([slug, name]) => ({ slug, name }));
}

/** 집 페이지 본문 첫 소개 — 제목을 빼고 280자 안에서 문장 단위로 */
export function houseSummary(html: string, name: string): string {
  const i = html.indexOf('field--name-field-content-area');
  if (i < 0) return '';
  // 본문 맨 위 제목(<p><strong>Casa Zimbabwe</strong></p>, h2·h3)은 빼고 문단만
  let t = plain(html.slice(i, i + 8000).replace(/^[^>]*>/, '').replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/g, ' ').replace(/^\s*<p>\s*<(strong|b)>[^<]{1,60}<\/\1>\s*<\/p>/, ' '));
  // 제목처럼 이름만 따로 붙어 있을 때만 뺀다 — “Casa Zimbabwe (known as CZ) has…”, “The Convent is…” 처럼 문장의 주어면 그대로
  if (t.toLowerCase().startsWith(name.toLowerCase()) && /^\s+[A-Z0-9]/.test(t.slice(name.length))) t = t.slice(name.length).trim();
  const sentences = t.split(/(?<=[.!?])\s+(?=[A-Z])/);
  let out = '';
  for (const s of sentences) { if ((out + ' ' + s).length > 280) break; out = `${out} ${s}`.trim(); }
  return out || t.slice(0, 280);
}

export function houseToOrg(h: { slug: string; name: string }, summary: string): Organization {
  const words = h.name.replace(/\(.*?\)/g, ' ').split(/\s+/).filter((w) => w && !/^(the|house|hall|of|apartments?)$/i.test(w));
  return {
    id: `${COOP_PREFIX}${h.slug.replace(/-/g, '_')}`.slice(0, 120), name: h.name,
    logo: { emoji: (words.slice(0, 2).map((w) => w[0]).join('') || 'BSC').toUpperCase(), hue: Math.abs([...h.name].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7)) % 360 },
    type: 'coop', schoolId: 's_berkeley', parent: 'Berkeley Student Cooperative', verified: true,
    description: summary || 'A Berkeley Student Cooperative house.',
    gallery: [], regularActivities: [], notices: [], followerIds: [], memberIds: [], adminIds: [], applicantIds: [],
    links: [{ label: 'Website', url: `${SITE}/housing/our-houses-apartments/${h.slug}` }],
  };
}

export async function fetchCoops(): Promise<Organization[]> {
  const r = await fetch(`${SITE}/housing/our-houses-apartments`, { headers: UA });
  if (!r.ok) throw new Error(`bsc list → ${r.status}`);
  const houses = parseHouseList(await r.text());
  if (houses.length < 10) throw new Error(`only ${houses.length} BSC houses — page layout changed?`);
  const out: Organization[] = [];
  for (const h of houses) {
    let summary = '';
    try { const p = await fetch(`${SITE}/housing/our-houses-apartments/${h.slug}`, { headers: UA }); if (p.ok) summary = houseSummary(await p.text(), h.name); } catch { /* 소개 없이 */ }
    out.push(houseToOrg(h, summary));
    await new Promise((res) => setTimeout(res, 250));
  }
  return out;
}

/** server/data/coops-berkeley.csv (slug,name,summary,checked) → 조직 — BSC 사이트가 서버 자동 요청을 막아서(503), 공식 페이지에서 확인한 목록을 저장소에 둔다 */
export function coopsFromCsv(csv: string): Organization[] {
  const rows: string[][] = [];
  for (const line of csv.trim().split('\n').slice(1)) {
    const cells: string[] = []; let cur = ''; let q = false;
    for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; } else if (ch === '"') q = true; else if (ch === ',') { cells.push(cur); cur = ''; } else cur += ch; }
    cells.push(cur); rows.push(cells);
  }
  return rows.filter((r) => r[0] && r[1]).map(([slug, name, summary]) => houseToOrg({ slug, name }, summary ?? ''));
}
