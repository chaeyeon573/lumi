/**
 * 학교 공식 Greek 챕터 목록 → organizations (type: greek, verified: true)
 *
 *   npm run fetch:greeks                    # Berkeley (기본)
 *   npm run fetch:greeks -- s_stanford      # Stanford
 *   FETCH_DRY=1 npm run fetch:greeks        # CSV 만 만들고 DB 는 건드리지 않음
 *
 * 출처
 *   Berkeley  LEAD Center "Find A Chapter" (https://lead.berkeley.edu/cal-greeks/find-a-chapter/)
 *             IFC · MCGC · NPHC · PHC 4개 카운슬, 챕터마다 이름 · CalLink 링크 · 주소 · Fraternity/Sorority · 주류/하우징 정책 · SVSH 이수
 *   Stanford  Fraternity & Sorority Life "Our Community" (https://fsl.stanford.edu/our-community)
 *             IFC · ISC(Inter-Sorority, Panhellenic) · MGC · AAFSA(Divine Nine) 4개 카운슬, 챕터마다 이름 · 소개 한 단락
 *   MIT       Student Life FSILG 페이지 (fsilg.mit.edu 는 외부에서 막혀 있다) — Fraternities · Sororities · Independent Living Groups 목록,
 *             챕터마다 이름 · 자체 홈페이지 · 카운슬(IFC · Panhel · MGC · LGC)
 *
 * 병합 규칙
 *   - 모든 행에 CalLink 링크가 있으므로 그 websiteKey 로 fetch:orgs 가 만든 항목(oc_/og_berkeley_<key>)을 찾아
 *     같은 id 에 덮어쓴다 → 중복 없이 type 이 greek 으로 바뀌고 카운슬·주소·정책이 채워진다. 멤버·팔로워는 유지.
 *   - 학교가 공식 목록에 올린 챕터이므로 verified: true (앱에서 "공식 인증" 배지).
 *   - 시작용으로 손으로 넣어 둔 Berkeley greek 추정 항목(링크 없음·멤버 없음·공식 목록에 없음)은 지운다.
 *     CalLink 에서 온 professional/service 계열 greek 은 링크가 있으므로 남는다.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Organization } from '@core/types';
import { createStore, emptySnapshot } from '../store';

const SCHOOL_ID = process.argv[2] || 's_berkeley';
const SOURCES: Record<string, string> = { s_berkeley: 'https://lead.berkeley.edu/cal-greeks/find-a-chapter/', s_stanford: 'https://fsl.stanford.edu/our-community', s_mit: 'https://studentlife.mit.edu/campus-communities/fraternities-sororities-and-independent-living-groups/' };
const SOURCE = SOURCES[SCHOOL_ID];
if (!SOURCE) { console.error(`usage: npm run fetch:greeks -- <${Object.keys(SOURCES).join('|')}>`); process.exit(1); }
const SCHOOL_NAME: Record<string, string> = { s_berkeley: 'UC Berkeley', s_stanford: 'Stanford', s_mit: 'MIT' };

type Council = 'IFC' | 'MGC' | 'NPHC' | 'Panhellenic' | 'LGC' | 'FSILG';
const COUNCIL_BY_HEADING: [RegExp, Council][] = [[/Interfraternity/i, 'IFC'], [/Multi-?Cultural/i, 'MGC'], [/Pan-Hellenic/i, 'NPHC'], [/Panhellenic/i, 'Panhellenic']];
const COUNCIL_HUE: Record<Council, number> = { IFC: 215, Panhellenic: 335, NPHC: 30, MGC: 275, LGC: 150, FSILG: 190 };
const COUNCIL_EMOJI: Record<Council, string> = { IFC: '🏛️', Panhellenic: '🌸', NPHC: '👑', MGC: '🌎', LGC: '🏠', FSILG: '🏛️' };
const COUNCIL_LONG: Record<Council, string> = { IFC: 'Interfraternity Council', Panhellenic: 'Panhellenic Council', NPHC: 'National Pan-Hellenic Council', MGC: 'Multi-Cultural Greek Council', LGC: 'Living Group Council', FSILG: 'Fraternity, Sorority & Independent Living Group community' };
const COUNCIL_JOIN: Record<Council, string> = {
  IFC: 'IFC recruitment (rush) → bid',
  Panhellenic: 'Panhellenic formal recruitment (fall) or continuous open bidding',
  NPHC: 'Membership intake announced by the chapter; interest meetings open to all',
  MGC: 'Interest meeting → intake process (varies by chapter)',
  LGC: 'Visit during rush/open houses → membership offer from the house',
  FSILG: 'See the chapter website for recruitment details',
};

interface Row { council: Council; name: string; websiteKey?: string; address?: string; kind: 'Fraternity' | 'Sorority' | 'Independent living group'; policy?: string; svsh?: string; intro?: string; url?: string; website?: string }

// 숫자 문자 참조(&#8212; 등)도 푼다 — 주소 칸의 “&#8212;”(=—, 주소 없음)가 “Chapter house: &#8212;.” 로 화면에 나왔다
const strip = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;|&quot;|&#39;|&#8217;/g, (m) => ({ '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'", '&#8217;': '’' }[m] ?? ' ')).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/\s+/g, ' ').trim();

/** 카운슬별 <h2> 아래 첫 <table> 을 읽는다. 헤더 이름으로 열을 찾아 카운슬마다 열 수가 달라도 견딘다. */
function parse(html: string): Row[] {
  const out: Row[] = [];
  const sections = html.split(/<h2[^>]*>/).slice(1);
  for (const section of sections) {
    const heading = strip(section.split('</h2>')[0]);
    const council = COUNCIL_BY_HEADING.find(([re]) => re.test(heading))?.[1];
    if (!council) continue;
    const table = section.split('</table>')[0];
    const rows = [...table.matchAll(/<tr[^>]*>(.*?)<\/tr>/gs)].map((m) => m[1]);
    const headers = [...(rows[0] ?? '').matchAll(/<th[^>]*>(.*?)<\/th>/gs)].map((m) => strip(m[1]).toLowerCase());
    const col = (re: RegExp) => headers.findIndex((h) => re.test(h));
    const iName = col(/organization/), iAddr = col(/address/), iType = col(/^type/), iPolicy = col(/policy/), iSvsh = col(/svsh/);
    for (const r of rows.slice(1)) {
      const cells = [...r.matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map((m) => m[1]);
      if (!cells.length) continue;
      const name = strip(cells[iName] ?? '');
      const link = /href="([^"]+)"/.exec(cells[iName] ?? '')?.[1];
      const websiteKey = link ? new URL(link).pathname.split('/').filter(Boolean).pop() ?? '' : '';
      if (!name || !websiteKey) { console.warn('skip (no name/CalLink link):', name || cells[iName]); continue; }
      const kindText = strip(cells[iType] ?? '');
      const addr = strip(cells[iAddr] ?? '');
      const policy = iPolicy >= 0 ? strip(cells[iPolicy] ?? '') : '';
      const svsh = iSvsh >= 0 ? strip(cells[iSvsh] ?? '') : '';
      out.push({
        council, name, websiteKey,
        address: addr && !/^[—–-]$/.test(addr) && !/^n\/?a$/i.test(addr) ? addr : undefined,
        // Panhellenic 챕터(Tri Delta 등)는 표에 ‘Fraternity’(women's fraternity)로 적혀 있지만 학생들에게는 소로리티다 — Stanford 와 같은 규칙
        kind: /sorority/i.test(kindText) || council === 'Panhellenic' ? 'Sorority' : 'Fraternity',
        policy: policy && !/^~?see .* policy$/i.test(policy) ? policy.replace(/^~/, '') : undefined,
        svsh: svsh || undefined,
      });
    }
  }
  return out;
}

/** Stanford FSL: 챕터 링크 경로에 카운슬이 들어 있고(/our-community%23<council>/<slug>), 본문에서 이름 다음 단락이 소개다 */
const STANFORD_COUNCIL: Record<string, Council> = { 'interfraternity-council': 'IFC', 'inter-sorority-council': 'Panhellenic', 'multicultural-greek-council': 'MGC', 'african-american-fraternal-and-sororal-association': 'NPHC' };
function parseStanford(html: string): Row[] {
  const text = html.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '');
  const lines = strip(text.replace(/<[^>]+>/g, '\n')).split('\n').map((l) => l.trim()).filter(Boolean);
  const plain = text.replace(/<[^>]+>/g, '\n').split('\n').map((l) => strip(l)).filter(Boolean);
  void lines;
  const out: Row[] = []; const seen = new Set<string>();
  for (const m of html.matchAll(/href="\/our-community%23([a-z-]+)\/([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const council = STANFORD_COUNCIL[m[1]]; const slug = m[2]; const name = strip(m[3]);
    if (!council || !name || seen.has(slug)) continue;
    seen.add(slug);
    const idx = plain.lastIndexOf(name);
    const intro = idx >= 0 ? plain[idx + 1] : undefined;
    out.push({ council, name, kind: /sorority|inter-sorority/i.test(`${name} ${m[1]}`) || council === 'Panhellenic' ? 'Sorority' : 'Fraternity', intro: intro && intro.length > 40 ? intro : undefined, url: `https://fsl.stanford.edu/our-community#${m[1]}` });
  }
  return out;
}

/** MIT Student Life: Fraternities / Sororities / Independent Living Groups 아코디언 안에 <li><a href=홈페이지>이름</a> – 카운슬</li> */
const MIT_COUNCIL: Record<string, Council> = { IFC: 'IFC', Panhel: 'Panhellenic', MGC: 'MGC', LGC: 'LGC', Sorority: 'FSILG', Fraternity: 'FSILG' };
function parseMit(html: string): Row[] {
  const out: Row[] = []; const seen = new Set<string>();
  for (const sec of html.split(/<span class="bg-underline">/).slice(1)) {
    const heading = strip(sec.split('</span>')[0]);
    const kind: Row['kind'] | undefined = /^Fraternities/i.test(heading) ? 'Fraternity' : /^Sororities/i.test(heading) ? 'Sorority' : /Independent Living/i.test(heading) ? 'Independent living group' : undefined;
    if (!kind) continue;
    const list = sec.split('</ul>')[0];
    for (const m of list.matchAll(/<li>\s*<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>\s*(?:&#8211;|–|-)\s*([A-Za-z]+)/g)) {
      const name = strip(m[2]); const council = MIT_COUNCIL[m[3].trim()];
      if (!name || !council || seen.has(name)) continue;
      seen.add(name);
      out.push({ council, name, kind: council === 'FSILG' && /sorority|Sorority/.test(m[3]) ? 'Sorority' : kind, website: m[1].trim(), url: SOURCE });
    }
  }
  return out;
}

function toOrg(row: Row, prev?: Organization): Organization {
  const councilLabel = SCHOOL_ID === 's_stanford' && row.council === 'Panhellenic' ? 'Inter-Sorority Council (ISC)' : SCHOOL_ID === 's_stanford' && row.council === 'NPHC' ? 'African American Fraternal & Sororal Association (AAFSA)' : row.council === 'FSILG' ? COUNCIL_LONG.FSILG : `${COUNCIL_LONG[row.council]} (${row.council})`;
  const parts = [`${row.kind} · ${councilLabel} chapter at ${SCHOOL_NAME[SCHOOL_ID]}.`];
  if (row.address) parts.push(`Chapter house: ${row.address}.`);
  if (row.policy) parts.push(`${row.policy}.`);
  if (row.intro) parts.push(row.intro);
  const policyNote = [
    `Listed on the university's official Fraternity & Sorority Life chapter roster.`,
    row.svsh === 'Yes' ? 'Completed the 25-26 SVSH (sexual violence & harassment prevention) training.' : undefined,
    row.council === 'IFC' ? 'Dry recruitment and anti-hazing policies apply.' : undefined,
  ].filter(Boolean).join(' ');
  const links = row.websiteKey
    ? [{ label: 'CalLink', url: `https://callink.berkeley.edu/organization/${row.websiteKey}` }, { label: 'Cal Greeks', url: SOURCE }]
    : SCHOOL_ID === 's_mit'
      ? [...(prev?.links?.filter((l) => !/studentlife\.mit\.edu/.test(l.url) && l.url !== row.website) ?? []), ...(row.website ? [{ label: 'Website', url: row.website }] : []), { label: 'MIT FSILG', url: row.url ?? SOURCE }]
      : [...(prev?.links?.filter((l) => !/fsl\.stanford\.edu/.test(l.url)) ?? []), { label: 'Stanford FSL', url: row.url ?? SOURCE }];
  const slug = (row.websiteKey ?? row.name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return {
    id: prev?.id ?? `og_${SCHOOL_ID.replace('s_', '')}_${slug}`,
    name: row.name,
    logo: prev?.logo.url ? prev.logo : { emoji: COUNCIL_EMOJI[row.council], hue: COUNCIL_HUE[row.council] },
    type: 'greek', schoolId: SCHOOL_ID, parent: row.council, verified: true,
    description: prev?.description && prev.description.length > parts.join(' ').length ? `${parts.join(' ')}\n\n${prev.description}` : parts.join(' '),
    gallery: prev?.gallery ?? [], regularActivities: prev?.regularActivities?.length ? prev.regularActivities : ['Chapter meetings', 'Philanthropy events', 'Socials & formals'],
    notices: prev?.notices ?? [], recruitment: prev?.recruitment,
    followerIds: prev?.followerIds ?? [], memberIds: prev?.memberIds ?? [], adminIds: prev?.adminIds ?? [], applicantIds: prev?.applicantIds ?? [],
    links, dues: prev?.dues, joinProcess: prev?.joinProcess ?? COUNCIL_JOIN[row.council], policyNote,
  };
}

// ─── 실행 ───────────────────────────────────────────────────────────────────
console.log(`${SCHOOL_ID} ← ${SOURCE}`);
const res = await fetch(SOURCE, { headers: { 'user-agent': 'Mozilla/5.0 AroundU-importer' } });
if (!res.ok) { console.error(`fetch failed: ${res.status}`); process.exit(1); }
const rows = SCHOOL_ID === 's_stanford' ? parseStanford(await res.text()) : SCHOOL_ID === 's_mit' ? parseMit(await res.text()) : parse(await res.text());
const byCouncil = rows.reduce<Record<string, number>>((m, r) => ({ ...m, [r.council]: (m[r.council] ?? 0) + 1 }), {});
console.log(`${rows.length} chapters`, byCouncil);
if (rows.length < (SCHOOL_ID === 's_berkeley' ? 40 : 15)) { console.error('too few rows — page layout probably changed; not touching DB'); process.exit(1); }

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.data');
mkdirSync(dataDir, { recursive: true });
writeFileSync(path.join(dataDir, `greeks-${SCHOOL_ID.replace('s_', '')}.csv`), ['council,name,kind,callink,address,policy,svsh,intro', ...rows.map((r) => [r.council, r.name, r.kind, r.websiteKey ?? '', r.address ?? '', r.policy ?? '', r.svsh ?? '', r.intro ?? ''].map((v) => `"${v.replace(/"/g, '""')}"`).join(','))].join('\n'));

const store = createStore();
await store.init();
const snap = (await store.loadSnapshot()) ?? emptySnapshot();
const berkeley = snap.organizations.filter((o) => o.schoolId === SCHOOL_ID);
/** "FSL Sigma Nu Fraternity, Beta Chi Chapter" ≈ "Sigma Nu": 디렉터리 접두어·법인 표기·챕터 명칭을 떼고 비교한다 */
const normName = (n: string) => n.toLowerCase().replace(/^fsl\s+/, '').replace(/,?\s+[a-z]+(\s+[a-z]+)?\s+chapter\b/g, '').replace(/\b(fraternity|sorority|society|inc\.?|incorporated|chapter)\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const keyOf = (o: Organization) => o.links?.map((l) => /callink\.berkeley\.edu\/organization\/([^/?#]+)/i.exec(l.url)?.[1]?.toLowerCase()).find(Boolean);
const byKey = new Map(berkeley.map((o) => [keyOf(o) ?? '', o] as const).filter(([k]) => k));
// 같은 이름이 둘이면(공식 명단만으로 만든 항목 vs 디렉터리 항목) 디렉터리 링크가 있는 쪽을 남긴다 — 나중에 넣은 값이 이기므로 링크 있는 것을 뒤에 둔다
const hasDirLink = (o: Organization) => !!o.links?.some((l) => /callink\.berkeley\.edu|campuslabs\.com|cardinalengage\.stanford\.edu|engage\.mit\.edu/.test(l.url));
const byName = new Map([...berkeley].sort((a, b) => Number(hasDirLink(a)) - Number(hasDirLink(b))).map((o) => [normName(o.name), o] as const));

const orgs = rows.map((r) => toOrg(r, (r.websiteKey ? byKey.get(r.websiteKey.toLowerCase()) : undefined) ?? byName.get(normName(r.name))));
const officialIds = new Set(orgs.map((o) => o.id));
const hasDirectoryLink = (o: Organization) => !!keyOf(o) || !!o.links?.some((l) => /cardinalengage\.stanford\.edu|engage\.mit\.edu/.test(l.url));
const stale = berkeley.filter((o) => o.type === 'greek' && !officialIds.has(o.id) && !hasDirectoryLink(o) && o.memberIds.length === 0 && o.adminIds.length === 0);
const matched = rows.filter((r) => (r.websiteKey ? byKey.has(r.websiteKey.toLowerCase()) : false) || byName.has(normName(r.name))).length;
console.log(`merge: ${matched} matched existing, ${orgs.length - matched} new; remove ${stale.length} hand-curated guesses`);

if (process.env.FETCH_DRY === '1') { console.log(`CSV 만 생성: ${dataDir}/greeks-${SCHOOL_ID.replace('s_', '')}.csv`); process.exit(0); }
await store.applyPatch({ organizations: orgs, removed: { organizations: stale.map((o) => o.id) } });
console.log('DB 반영 완료');
process.exit(0);
