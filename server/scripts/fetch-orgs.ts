/**
 * 학생 조직 목록을 CampusLabs Engage 디렉터리에서 직접 가져온다.
 *
 * CampusLabs Engage 디렉터리는 로그인 없이 공개 검색 API 가 열려 있다 (실제 확인됨):
 *   Berkeley  callink.berkeley.edu            → 1,550개
 *   SF State  sfsu.campuslabs.com/engage      → 289개
 * Stanford 는 CampusGroups(Cardinal Engage) — 공개 목록 페이지(club_signup)가 서버 렌더링이고 range=N 으로 30개씩 넘어간다 (814개, 실제 확인됨).
 *   Stanford  cardinalengage.stanford.edu     → 814개 표시, 공개 id 있는 767개
 *   MIT       engage.mit.edu                  → 514개 (FSILG 유형 = greek, Residential Life = 기숙사라 제외)
 *   CAMPUSGROUPS_HOSTS="s_xxx=https://xxx.campusgroups.com" 으로 같은 방식의 학교를 더 붙인다
 * UCLA(SOLE) 는 둘 다 아니라 CSV 로 넣는다(import-orgs.ts).
 * Engage 를 쓰는 다른 학교를 추가하려면 ENGAGE_HOSTS="s_xxx=https://xxx.campuslabs.com/engage" 로 지정한다.
 *
 *   npm run fetch:orgs                     # 모든 학교 → orgs CSV 출력 + DB 반영
 *   npm run fetch:orgs -- s_berkeley       # 한 학교만
 *   FETCH_DRY=1 npm run fetch:orgs         # DB 에 넣지 않고 server/.data/orgs-<school>.csv 만 만든다
 *
 * ⚠️ 이 스크립트는 인터넷이 열린 환경(로컬 PC, Railway shell)에서 실행해야 한다. Engage API 의 응답 필드는
 *    `@odata.count`, `value[].{Id,Name,ShortName,WebsiteKey,Summary,Description,CategoryNames,Status}` 기준이며
 *    학교가 UI 를 바꾸면 필드명이 달라질 수 있다 → 그럴 땐 아래 mapOrg 만 고치면 된다.
 */
import { decodeNumericEntities } from '../sources/entities';
import { COUNCIL_RE, notCouncil, campusGroupsWebsite, engageLinks, pennClubToOrg, type EngageSocial, type PennClub } from '../sources/orglinks';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Organization } from '@core/types';
import { createStore, emptySnapshot } from '../store';

const ENGAGE_HOSTS: Record<string, string> = {
  s_berkeley: 'https://callink.berkeley.edu',
  s_sfsu: 'https://sfsu.campuslabs.com/engage',
  ...(process.env.ENGAGE_HOSTS ? Object.fromEntries(process.env.ENGAGE_HOSTS.split(',').map((p) => p.split('=') as [string, string])) : {}),
};

const CAMPUSGROUPS_HOSTS: Record<string, string> = {
  s_stanford: 'https://cardinalengage.stanford.edu',
  s_mit: 'https://engage.mit.edu',
  ...(process.env.CAMPUSGROUPS_HOSTS ? Object.fromEntries(process.env.CAMPUSGROUPS_HOSTS.split(',').map((p) => p.split('=') as [string, string])) : {}),
};
/** Penn Clubs (UPenn 공식 디렉터리) — PENNCLUBS_HOSTS="s_upenn=https://pennclubs.com" */
const PENNCLUBS_HOSTS: Record<string, string> = process.env.PENNCLUBS_HOSTS ? Object.fromEntries(process.env.PENNCLUBS_HOSTS.split(',').map((p) => p.split('=') as [string, string])) : {};

/** 목록을 n 개씩 나란히 — 상세 페이지를 하나씩 더 읽을 때 (사이트에 무리가 없게 사이마다 쉰다) */
async function eachLimited<T>(items: T[], n: number, fn: (x: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const x = items[i++]; try { await fn(x); } catch { /* 한 곳 실패는 건너뛴다 */ } await new Promise((r) => setTimeout(r, 120)); } }));
}

interface CampusGroupsOrg { id: string; name: string; groupType: string; tags: string[]; mission: string; website?: string }

/** CampusGroups club_signup 목록: <li class="list-group-item"> 마다 club_id · 이름 · "그룹유형 - 태그, 태그" · Mission 본문 */
/** 5xx·네트워크 오류는 2s·4s·8s 로 세 번 더 시도한다 (MIT Engage 가 가끔 503 을 준다) */
async function getWithRetry(url: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 AroundU-importer' } });
      if (res.ok) return await res.text();
      if (res.status < 500 || attempt >= 3) throw new Error(`${url} → ${res.status}`);
    } catch (e) { if (attempt >= 3) throw e; }
    await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
  }
}

async function fetchCampusGroups(host: string): Promise<CampusGroupsOrg[]> {
  const out: CampusGroupsOrg[] = [];
  const seen = new Set<string>();
  // 중간에 빈 페이지가 섞여 나온다(MIT: range=270 이 비고 300 은 찬다) — 첫 페이지의 총 개수까지 끝까지 걷고, 빈 페이지로 멈추지 않는다
  let total = Infinity;
  for (let range = 0; range < Math.min(total + 60, 20000); range += 30) {
    const html = await getWithRetry(`${host}/club_signup?ax=1&range=${range}`);
    if (range === 0) total = Number(/clubsCount'\)\.innerHTML = '\((\d+)\)'/.exec(html)?.[1] ?? '') || 3000;
    const items = html.split('<li class="list-group-item"').slice(1);
    let added = 0;
    for (const it of items) {
      const id = /club_id=(\d+)/.exec(it)?.[1];
      const name = strip(/<h2 class="media-heading[^"]*">\s*<a[^>]*>([\s\S]*?)<\/a>/.exec(it)?.[1] ?? '');
      if (!id || !name || seen.has(id)) continue;
      seen.add(id); added++;
      const catLine = strip(/<p class="h5 media-heading grey-element">([\s\S]*?)<\/p>/.exec(it)?.[1] ?? '');
      const [groupType, tagText = ''] = catLine.split(/\s+-\s+/, 2);
      const mission = strip(new RegExp(`id="club_${id}"[^>]*>\\s*<strong>Mission</strong><br>([\\s\\S]*?)</p>`).exec(it)?.[1] ?? '');
      out.push({ id, name, groupType: groupType.trim(), tags: tagText.split(',').map((t) => t.trim()).filter(Boolean), mission, website: campusGroupsWebsite(it, host) });
    }
    void added;
    await new Promise((r) => setTimeout(r, 200));
  }
  return out;
}

/** 학교 부서·행정 조직·기숙사 단위는 학생 단체가 아니라 뺀다 */
const CAMPUSGROUPS_SKIP = /^(Campus Departments|Residential Life)$/i;
function mapCampusGroupsOrg(schoolId: ID, host: string, o: CampusGroupsOrg): Organization {
  const catText = notCouncil(`${o.groupType} ${o.tags.join(' ')} ${o.name}`);
  const type: Organization['type'] = /\b(council|association)\b/i.test(o.name) && /fratern|soror|greek|panhel|living group|fsilg/i.test(o.name) ? 'council' : GREEK_RE.test(catText) ? 'greek' : COUNCIL_RE.test(catText) || /^Associated Students/i.test(o.groupType) ? 'council' : 'club';
  return {
    id: `${type === 'greek' ? 'og' : 'oc'}_${schoolId.replace('s_', '')}_cg${o.id}`,
    name: o.name,
    logo: { emoji: initials(o.name), hue: Math.abs([...o.name].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7)) % 360 },
    type, schoolId, parent: o.tags[0] || o.groupType || undefined, verified: false,
    description: o.mission.slice(0, 600),
    gallery: [], regularActivities: [], notices: [], followerIds: [], memberIds: [], adminIds: [], applicantIds: [],
    links: [{ label: schoolId === 's_mit' ? 'MIT Engage' : schoolId === 's_stanford' ? 'Cardinal Engage' : 'Directory', url: `${host}/student_community?club_id=${o.id}` }, ...(o.website ? [{ label: 'Website', url: o.website }] : [])],
  };
}

const PRESENCE_HOSTS: Record<string, string> = {
  ...(process.env.PRESENCE_HOSTS ? Object.fromEntries(process.env.PRESENCE_HOSTS.split(',').map((p) => p.split('=') as [string, string])) : {}),
};
interface PresenceOrg { name: string; uri: string; description?: string; categories?: string[]; memberCount?: number; regularMeetingTime?: string; regularMeetingLocation?: string }
/** Presence(presence.io) 공개 JSON: api.presence.io/<subdomain>/v1/organizations — 한 번에 전부 온다 */
async function fetchPresence(sub: string): Promise<PresenceOrg[]> {
  const res = await fetch(`https://api.presence.io/${sub}/v1/organizations`, { headers: { 'user-agent': 'AroundU-importer', accept: 'application/json' } });
  if (!res.ok) throw new Error(`presence ${sub} → ${res.status}`);
  return (await res.json()) as PresenceOrg[];
}
function mapPresenceOrg(schoolId: ID, sub: string, o: PresenceOrg): Organization {
  const cats = o.categories ?? [];
  const catText = `${cats.join(' ')} ${o.name}`;
  const type: Organization['type'] = /\b(council|association)\b/i.test(o.name) && /fratern|soror|greek|panhel/i.test(o.name) ? 'council' : GREEK_RE.test(catText) ? 'greek' : COUNCIL_RE.test(catText) ? 'council' : 'club';
  const meet = [o.regularMeetingTime, o.regularMeetingLocation].filter(Boolean).join(' · ');
  return {
    id: `${type === 'greek' ? 'og' : 'oc'}_${schoolId.replace('s_', '')}_ps${o.uri.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`,
    name: o.name,
    logo: { emoji: initials(o.name), hue: Math.abs([...o.name].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7)) % 360 },
    type, schoolId, parent: cats.find((c) => !/undergraduate student organization|graduate student organization/i.test(c)) ?? cats[0], verified: false,
    description: strip(o.description ?? '').slice(0, 600),
    gallery: [], regularActivities: meet ? [meet] : [], notices: [], followerIds: [], memberIds: [], adminIds: [], applicantIds: [],
    links: [{ label: 'Presence', url: `https://${sub}.presence.io/organization/${o.uri}` }],
  };
}

interface EngageOrg { Id: string; Name: string; ShortName?: string; WebsiteKey?: string; Summary?: string; Description?: string; CategoryNames?: string[]; Status?: string; ProfilePicture?: string | null }

async function fetchAll(host: string): Promise<EngageOrg[]> {
  const out: EngageOrg[] = [];
  for (let skip = 0; ; skip += 100) {
    const url = `${host}/api/discovery/search/organizations?top=100&skip=${skip}&orderBy%5B0%5D=UpperName%20asc`;
    const res = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'AroundU-importer' } });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    const data = (await res.json()) as { '@odata.count'?: number; value: EngageOrg[] };
    out.push(...data.value);
    if (data.value.length < 100) break;
  }
  return out;
}

/** 로고가 없을 때 쓰는 머리글자 — "Climbing Team of Berkeley" → "CT" (모든 동아리가 같은 🎯 로 보이지 않게) */
const initials = (name: string) => {
  const words = name.replace(/[^A-Za-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w && !/^(of|the|at|and|for|in|uc|cal|berkeley|merced|club|campus|dept)$/i.test(w));
  const greek = name.match(/[ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ]/g);
  if (greek && greek.length >= 2) return greek.slice(0, 3).join('');
  return (words.length ? words : name.split(/\s+/)).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '•';
};

const GREEK_RE = /fraternit|sororit|greek|panhellenic|interfraternity|nphc|multicultural greek|fsilg/i;
// 명단 이름·소개에 HTML 글자 코드가 그대로 온다(“Entrepreneurship &amp; Technology”, “&#8212;”, “&#43;”) — 화면에 그대로 보이던 것
const strip = (html = '') => decodeNumericEntities(html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;|&quot;|&#39;/g, (m) => ({ '&nbsp;': ' ', '&amp;': '&', '&quot;': '"', '&#39;': "'" }[m] ?? ' '))).replace(/\s+/g, ' ').trim();

function mapOrg(schoolId: ID, host: string, o: EngageOrg): Organization {
  const cats = o.CategoryNames ?? [];
  const catText = `${cats.join(' ')} ${o.Name}`;
  const type: Organization['type'] = GREEK_RE.test(catText) ? 'greek' : COUNCIL_RE.test(catText) ? 'council' : 'club';
  const council = cats.find((c) => /IFC|Interfraternity/i.test(c)) ? 'IFC' : cats.find((c) => /Panhellenic/i.test(c)) ? 'Panhellenic' : cats.find((c) => /NPHC|Black Greek/i.test(c)) ? 'NPHC' : cats.find((c) => /Multicultural Greek|MGC/i.test(c)) ? 'MGC' : undefined;
  return {
    id: `${type === 'greek' ? 'og' : 'oc'}_${schoolId.replace('s_', '')}_${(o.WebsiteKey || o.Name).toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
    name: strip(o.Name),
    logo: { emoji: initials(strip(o.Name)), hue: Math.abs([...o.Name].reduce((h, ch) => h * 31 + ch.charCodeAt(0), 7)) % 360, ...(o.ProfilePicture ? { url: `https://se-images.campuslabs.com/clink/images/${o.ProfilePicture}?preset=small-sq` } : {}) },
    type, schoolId, parent: council ?? cats[0], verified: false,
    description: strip(o.Summary || o.Description || '').slice(0, 600),
    gallery: [], regularActivities: [], notices: [], followerIds: [], memberIds: [], adminIds: [], applicantIds: [],
    links: o.WebsiteKey ? [{ label: 'Directory', url: `${host}/organization/${o.WebsiteKey}` }] : undefined,
  };
}

type ID = string;
const only = process.argv[2];
const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.data');
mkdirSync(dataDir, { recursive: true });

const store = createStore();
await store.init();
const snap = (await store.loadSnapshot()) ?? emptySnapshot();
const existing = new Map(snap.organizations.map((o) => [`${o.schoolId}::${o.name.toLowerCase()}`, o]));
const existingById = new Map(snap.organizations.map((o) => [o.id, o]));
/** 이미 있는 조직(id 우선, 없으면 이름)은 멤버·팔로워·인증 상태를 유지한다. 공식 명단으로 인증된 greek 은 이름·분류·카운슬·설명도 그대로 두고 링크만 합친다 */
function mergeExisting(o: Organization): Organization {
  // id 앞머리가 분류(oc_/og_)라서 공식 명단이 greek 으로 올린 항목은 다음 실행에서 id 가 달라진다 — 반대 접두어도 찾아본다
  const twin = o.id.startsWith('og_') ? `oc_${o.id.slice(3)}` : `og_${o.id.slice(3)}`;
  const prev = existingById.get(o.id) ?? existingById.get(twin) ?? existing.get(`${o.schoolId}::${o.name.toLowerCase()}`);
  if (!prev) return o;
  const links = [...(prev.links ?? []), ...(o.links ?? []).filter((l) => !prev.links?.some((p) => p.url === l.url))];
  if (prev.verified && prev.type === 'greek') return { ...prev, links };
  // 로고: 디렉터리에 사진이 있으면 그걸로, 없으면 이전 사진(손으로 넣은 것), 그것도 없으면 머리글자
  const logo = o.logo.url ? o.logo : prev.logo.url ? prev.logo : o.logo;
  // 예전 가져오기가 글자 코드째 넣은 이름(“&amp;”)은 고친 이름으로
  const name = /&(?:#\d+|#x[0-9a-f]+|[a-z]+);/i.test(prev.name) ? o.name : prev.name;
  return { ...prev, name, type: o.type, description: o.description || prev.description, links, parent: o.parent ?? prev.parent, logo };
}

/** 디렉터리에서 받은 뒤, 같은 학교의 손으로 넣어 둔 추정 항목(디렉터리 링크 없음 · 멤버/관리자 없음 · 이번에 안 맞음)은 지운다. greek 은 fetch-greeks 가 담당 */
function staleSeed(schoolId: ID, fresh: Organization[]): ID[] {
  const freshIds = new Set(fresh.map((o) => o.id));
  const hasDirLink = (o: Organization) => !!o.links?.some((l) => /callink\.berkeley\.edu|campuslabs\.com|campusgroups\.com|cardinalengage\.stanford\.edu|engage\.mit\.edu|presence\.io|pennclubs\.com|dartmouthgroups\.dartmouth\.edu/.test(l.url));
  return snap.organizations.filter((o) => o.schoolId === schoolId && o.type !== 'greek' && !freshIds.has(o.id) && !hasDirLink(o) && o.memberIds.length === 0 && o.adminIds.length === 0).map((o) => o.id);
}

for (const [schoolId, host] of Object.entries(ENGAGE_HOSTS)) {
  if (only && only !== schoolId) continue;
  process.stdout.write(`${schoolId} ← ${host} … `);
  let raw: EngageOrg[];
  try { raw = await fetchAll(host); } catch (e) { console.log(`실패: ${(e as Error).message}`); continue; }
  const active = raw.filter((o) => !o.Status || /active/i.test(o.Status));
  // 상세에서 공식 사이트·인스타·페북 등 (socialMedia) — 공개 값만
  const social = new Map<string, ReturnType<typeof engageLinks>>();
  await eachLimited(active.filter((o) => o.WebsiteKey), 4, async (o) => {
    const res = await fetch(`${host}/api/discovery/organization/bykey/${encodeURIComponent(o.WebsiteKey!)}`, { headers: { accept: 'application/json', 'user-agent': 'AroundU-importer' } });
    if (res.ok) social.set(o.Id, engageLinks(((await res.json()) as { socialMedia?: EngageSocial }).socialMedia));
  });
  const orgs = active.map((o) => { const m = mapOrg(schoolId, host, o); const extra = social.get(o.Id) ?? []; return extra.length ? { ...m, links: [...(m.links ?? []), ...extra] } : m; })
    .map(mergeExisting);
  console.log(`링크 있는 곳 ${[...social.values()].filter((l) => l.length).length}/${active.length} · `);
  const csv = ['school_id,name,type,category,description', ...orgs.map((o) => [o.schoolId, o.name, o.type, o.parent ?? '', o.description].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
  writeFileSync(path.join(dataDir, `orgs-${schoolId}.csv`), csv);
  const linked = snap.organizations.filter((o) => o.schoolId === schoolId && o.links?.some((l) => l.url.startsWith(host)));
  const ratio = linked.length ? orgs.length / linked.length : 1;
  if (ratio < 0.5) { console.log(`${orgs.length}개 — 지난번 ${linked.length}개의 절반도 안 돼 반영하지 않음 (사이트 확인 필요)`); process.exitCode = 2; continue; }
  const stale = staleSeed(schoolId, orgs);
  console.log(`${orgs.length}개 (greek ${orgs.filter((o) => o.type === 'greek').length})${stale.length ? `, 추정 항목 ${stale.length}개 삭제` : ''}${ratio < 0.8 ? ` — 지난번 ${linked.length}개보다 줄었음` : ''}`);
  if (process.env.FETCH_DRY !== '1') await store.applyPatch({ organizations: orgs, removed: { organizations: stale } });
}
for (const [schoolId, host] of Object.entries(CAMPUSGROUPS_HOSTS)) {
  if (only && only !== schoolId) continue;
  process.stdout.write(`${schoolId} ← ${host} (CampusGroups) … `);
  let raw: CampusGroupsOrg[];
  try { raw = await fetchCampusGroups(host); } catch (e) { console.log(`실패: ${(e as Error).message}`); continue; }
  const orgs = raw.filter((o) => !CAMPUSGROUPS_SKIP.test(o.groupType)).map((o) => mapCampusGroupsOrg(schoolId, host, o))
    .map(mergeExisting);
  const csv = ['school_id,name,type,category,description', ...orgs.map((o) => [o.schoolId, o.name, o.type, o.parent ?? '', o.description].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
  writeFileSync(path.join(dataDir, `orgs-${schoolId}.csv`), csv);
  const freshIds = new Set(orgs.map((o) => o.id));
  const linked = snap.organizations.filter((o) => o.schoolId === schoolId && o.links?.some((l) => l.url.startsWith(host)));
  // 안전장치: 디렉터리 응답이 지난번보다 크게 줄면 사이트 쪽 문제로 보고 — 20% 넘게 줄면 삭제를 건너뛰고, 50% 넘게 줄면 반영하지 않는다
  const ratio = linked.length ? orgs.length / linked.length : 1;
  if (ratio < 0.5) { console.log(`${orgs.length}개 — 지난번 ${linked.length}개의 절반도 안 돼 반영하지 않음 (사이트 확인 필요)`); process.exitCode = 2; continue; }
  const gone = ratio < 0.8 ? [] : linked.filter((o) => !freshIds.has(o.id) && o.memberIds.length === 0 && o.adminIds.length === 0).map((o) => o.id);
  const stale = [...staleSeed(schoolId, orgs), ...gone];
  console.log(`${orgs.length}개 (greek ${orgs.filter((o) => o.type === 'greek').length})${stale.length ? `, 추정·제외 항목 ${stale.length}개 삭제` : ''}${ratio < 0.8 ? ` — 지난번 ${linked.length}개보다 줄어 삭제는 건너뜀` : ''}`);
  if (process.env.FETCH_DRY !== '1') await store.applyPatch({ organizations: orgs, removed: { organizations: stale } });
}
for (const [schoolId, sub] of Object.entries(PRESENCE_HOSTS)) {
  if (only && only !== schoolId) continue;
  const host = `https://${sub}.presence.io`;
  process.stdout.write(`${schoolId} ← ${host} (Presence) … `);
  let raw: PresenceOrg[];
  try { raw = await fetchPresence(sub); } catch (e) { console.log(`실패: ${(e as Error).message}`); continue; }
  const orgs = raw.filter((o) => o.name && o.uri).map((o) => mapPresenceOrg(schoolId, sub, o)).map(mergeExisting);
  const linked = snap.organizations.filter((o) => o.schoolId === schoolId && o.links?.some((l) => l.url.startsWith(host)));
  const ratio = linked.length ? orgs.length / linked.length : 1;
  if (ratio < 0.5) { console.log(`${orgs.length}개 — 지난번 ${linked.length}개의 절반도 안 돼 반영하지 않음 (사이트 확인 필요)`); process.exitCode = 2; continue; }
  const stale = staleSeed(schoolId, orgs);
  const csv = ['school_id,name,type,category,description', ...orgs.map((o) => [o.schoolId, o.name, o.type, o.parent ?? '', o.description].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
  writeFileSync(path.join(dataDir, `orgs-${schoolId}.csv`), csv);
  console.log(`${orgs.length}개 (greek ${orgs.filter((o) => o.type === 'greek').length})${stale.length ? `, 추정 항목 ${stale.length}개 삭제` : ''}`);
  if (process.env.FETCH_DRY !== '1') await store.applyPatch({ organizations: orgs, removed: { organizations: stale } });
}
for (const [schoolId, host] of Object.entries(PENNCLUBS_HOSTS)) {
  if (only && only !== schoolId) continue;
  process.stdout.write(`${schoolId} ← ${host} (Penn Clubs) … `);
  let list: PennClub[];
  try { list = JSON.parse(await getWithRetry(`${host}/api/clubs/?format=json`)) as PennClub[]; } catch (e) { console.log(`실패: ${(e as Error).message}`); continue; }
  const live = list.filter((c) => c.active !== false && c.approved !== false && c.code && c.name);
  const detailed: PennClub[] = [];
  await eachLimited(live, 4, async (c) => { detailed.push({ ...c, ...(JSON.parse(await getWithRetry(`${host}/api/clubs/${encodeURIComponent(c.code)}/?format=json`)) as PennClub) }); });
  const byCode = new Map(detailed.map((c) => [c.code, c]));
  const orgs = live.map((c) => pennClubToOrg(byCode.get(c.code) ?? c, schoolId)).map(mergeExisting);
  const linked = snap.organizations.filter((o) => o.schoolId === schoolId && o.links?.some((l) => l.url.startsWith(host)));
  const ratio = linked.length ? orgs.length / linked.length : 1;
  if (ratio < 0.5) { console.log(`${orgs.length}개 — 지난번 ${linked.length}개의 절반도 안 돼 반영하지 않음 (사이트 확인 필요)`); process.exitCode = 2; continue; }
  console.log(`${orgs.length}개 (학생회 ${orgs.filter((o) => o.type === 'council').length}, 링크 상세 ${detailed.length})`);
  if (process.env.FETCH_DRY !== '1') await store.applyPatch({ organizations: orgs });
}
console.log(process.env.FETCH_DRY === '1' ? `CSV 만 생성: ${dataDir}` : 'DB 반영 완료');
process.exit(0);
