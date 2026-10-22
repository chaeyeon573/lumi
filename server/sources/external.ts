/**
 * 학교 밖 대학생 대상 기회 — schoolId 없이 넣어 모든 학교 학생에게 보인다.
 *   devpost  Devpost 공개 API (devpost.com/api/hackathons) — 진행 중·예정 해커톤. 온라인 또는 캘리포니아 대면만, 초대제 제외
 *   jobs     기업 공개 채용 API (Greenhouse · Lever · Ashby) 에서 제목에 Intern / Co-op 이 들어간 공고 — 미국·원격만.
 *            기업 목록은 server/data/internship-boards.csv (ats,slug,company) — 줄 하나로 추가한다
 * MLH 해커톤 대부분이 Devpost 에도 올라온다.
 */
import { fieldOf } from '@core/lib/listings';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Opportunity } from '@core/types';

const UA = { 'user-agent': 'Mozilla/5.0 AroundU-importer', accept: 'application/json' };
const text = (raw: unknown) => (raw == null ? '' : String(raw)).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const MONTHS: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
/** "Oct 10 - 11, 2026" / "Sep 01 - Dec 01, 2026" / "Dec 28, 2026 - Jan 03, 2027" → 시작·끝 */
export function parseDevpostDates(s: string): { start?: Date; end?: Date } {
  const m = /^([A-Z][a-z]{2}) (\d{1,2})(?:, (\d{4}))? - (?:([A-Z][a-z]{2}) )?(\d{1,2}), (\d{4})$/.exec(s.trim());
  if (!m) return {};
  const endYear = Number(m[6]); const startYear = m[3] ? Number(m[3]) : endYear;
  const start = new Date(Date.UTC(startYear, MONTHS[m[1]], Number(m[2]), 12));
  const end = new Date(Date.UTC(endYear, MONTHS[m[4] ?? m[1]], Number(m[5]), 23, 59));
  return { start, end };
}
interface DevpostHackathon { id: number; title: string; url: string; open_state: string; invite_only?: boolean; displayed_location?: { location?: string }; submission_period_dates?: string; prize_amount?: string; themes?: { name: string }[]; organization_name?: string; registrations_count?: number }
const CA_RE = /online|california|\bca\b|berkeley|san francisco|stanford|palo alto|san jose|merced|los angeles|san diego|oakland|bay area|santa clara|irvine|davis|santa cruz|sacramento/i;

// 주최자 칸에 'nill', 'N/A' 같은 자리 채움 글자를 적은 해커톤이 있다 — 그럴 땐 없는 것으로 본다
const realName = (s?: string) => { const v = text(s ?? ''); return v && !/^(nil+|null|none|n\/?a|tbd|-+|\.+)$/i.test(v) ? v : undefined; };

/**
 * 해커톤 페이지의 'Who can participate' 칸 — 목록 API 에는 나이·자격 칸이 없어서 제목에 'high school'이 없으면
 * 고등학생 대회(“Ages 14 to 18 only”)가 그대로 들어왔다. 나이 상한이 18 이하이거나 고등·중학생 전용이면 true.
 */
export function youthOnly(page: string): boolean {
  const t = text(page.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')).replace(/&#39;|&rsquo;/g, "'");
  const i = t.search(/who can participate/i);
  if (i < 0) return false;
  const block = t.slice(i, i + 400).split(/view full rules/i)[0];
  const range = block.match(/ages?\s+(\d{1,2})\s*(?:to|-|–)\s*(\d{1,2})/i);
  if (range && Number(range[2]) <= 18) return true;
  // 'High school and college students' 처럼 대학생도 되는 것은 남긴다 — '…만' 일 때만
  return /(high|middle|secondary) school(ers| students)? only|only (open to )?(high|middle|secondary) school|k-12 (students )?only/i.test(block);
}
const youthChecked = new Map<number, boolean>(); // 서버가 켜져 있는 동안 해커톤마다 한 번만 연다
/** 페이지를 못 열면(Cloudflare 'Just a moment' 등) 지금처럼 남기고, 이번 가져오기에서는 더 열지 않는다 — 다음 때 다시 본다 */
async function isYouthOnly(h: DevpostHackathon, state: { blocked: boolean }): Promise<boolean> {
  const known = youthChecked.get(h.id);
  if (known !== undefined || state.blocked) return known ?? false;
  try {
    await new Promise((res) => setTimeout(res, 1500)); // 천천히 — 몰아서 열면 막힌다
    const r = await fetch(h.url, { headers: { 'user-agent': UA['user-agent'], accept: 'text/html' } });
    const page = r.ok ? await r.text() : '';
    if (!/who can participate/i.test(page)) { state.blocked = true; return false; }
    const v = youthOnly(page);
    youthChecked.set(h.id, v);
    return v;
  } catch { state.blocked = true; return false; }
}

export async function fetchDevpost(maxPages = 40): Promise<Opportunity[]> {
  const now = new Date().toISOString(); const out: Opportunity[] = []; const seen = new Set<number>(); const pageState = { blocked: false };
  for (let page = 1; page <= maxPages; page++) {
    const r = await fetch(`https://devpost.com/api/hackathons?status[]=upcoming&status[]=open&order_by=deadline&page=${page}`, { headers: UA });
    if (!r.ok) throw new Error(`devpost page ${page} → ${r.status}`);
    const d = (await r.json()) as { hackathons?: DevpostHackathon[] };
    const list = d.hackathons ?? []; if (!list.length) break;
    for (const h of list) {
      if (seen.has(h.id)) continue; seen.add(h.id);
      const where = text(h.displayed_location?.location ?? '');
      if (h.invite_only || !CA_RE.test(where)) continue;
      // 대학생 대상이 아닌 고등학생·청소년 대회는 뺀다
      if (/high school|middle school|k-12|\bhs\b|secondary school|teen|youth|kids/i.test(`${h.title} ${h.organization_name ?? ''}`)) continue;
      if (await isYouthOnly(h, pageState)) continue;
      const { start, end } = parseDevpostDates(h.submission_period_dates ?? '');
      const online = /online/i.test(where);
      const prize = text(h.prize_amount ?? '');
      out.push({
        id: `op_ext_devpost_${h.id}`, type: 'hackathon', title: text(h.title), host: realName(h.organization_name) ?? 'Devpost',
        description: `${online ? 'Online' : where} hackathon · ${h.submission_period_dates ?? ''}${h.registrations_count ? ` · ${h.registrations_count} registered` : ''}`,
        cover: { emoji: '💡', hue: 230 }, deadline: end?.toISOString(), date: start?.toISOString(),
        place: online ? undefined : { name: where, lat: 37.8719, lng: -122.2585 },
        eligibility: 'Check eligibility on the hackathon page', benefit: prize && prize !== '$0' ? `Prizes ${prize}` : undefined,
        rolesNeeded: ['developer', 'designer'], teamSize: undefined,
        sourceUrl: h.url, sourceLabel: 'Devpost', tags: ['hackathon', online ? 'online' : 'in person', ...(h.themes ?? []).map((t) => t.name).slice(0, 3)],
        interests: ['startup', 'study'], goals: ['hackathon'], official: false, lastVerified: now, qna: [], reviews: [], createdAt: now,
      });
    }
    await new Promise((res) => setTimeout(res, 200));
  }
  return out;
}

const INTERN_RE = /\bintern(ship)?s?\b|\bco-?op\b|summer (analyst|associate)/i;
/** 학생용 인턴·코업 공고 제목인가 — “Staff Credit Policy Analyst – Condo, Co-op & Project Review”(집 ‘co-op’, 정규직)가 인턴으로 들어왔다 */
export function isInternTitle(title: string): boolean {
  if (!INTERN_RE.test(title) || /\binternal\b|high school|\bhs\b|^interested in/i.test(title)) return false;
  if (/\bintern(ship)?s?\b/i.test(title)) return true;
  // ‘co-op’ 만 걸린 제목: 주택 조합(condo·housing) 이나 경력직 직함이면 학생 코업이 아니다
  return !/\bcondo|housing|\b(staff|senior|sr\.?|principal|lead|manager|director|head)\b/i.test(title);
}
// 미국 지명(도시·주 이름)이나 원격이 확인된 공고만 남긴다. 주 약칭은 대문자로 ", CA" 꼴만 인정 (in/or/me 같은 단어와 헷갈리지 않게)
const US_WORDS = /united states|\busa\b|\bu\.s\.|remote|new york|nyc|san francisco|bay area|seattle|austin|boston|chicago|los angeles|palo alto|mountain view|menlo park|sunnyvale|san jose|san mateo|south san francisco|redwood city|oakland|berkeley|denver|atlanta|miami|washington|philadelphia|pittsburgh|san diego|irvine|portland|salt lake|dallas|houston|phoenix|detroit|ann arbor|minneapolis|nashville|raleigh|columbus|california|texas|massachusetts|virginia|colorado|illinois|florida|georgia|arizona|michigan|ohio|oregon/i;
const US_STATE = /(?:,|\s)(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC)\b/;
const isUS = (loc: string) => US_WORDS.test(loc) || US_STATE.test(loc);
interface Job { id: string; title: string; location: string; url: string; team?: string; updated?: string }
async function jobsFor(ats: string, slug: string): Promise<Job[]> {
  const get = async (u: string) => { const r = await fetch(u, { headers: UA }); if (!r.ok) throw new Error(`${ats}/${slug} → ${r.status}`); return r.json() as Promise<unknown>; };
  if (ats === 'greenhouse') {
    const d = (await get(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`)) as { jobs?: { id: number; title: string; location?: { name?: string }; absolute_url: string; updated_at?: string; departments?: { name: string }[] }[] };
    return (d.jobs ?? []).map((j) => ({ id: String(j.id), title: j.title, location: j.location?.name ?? '', url: j.absolute_url, team: j.departments?.[0]?.name, updated: j.updated_at }));
  }
  if (ats === 'lever') {
    const d = (await get(`https://api.lever.co/v0/postings/${slug}?mode=json`)) as { id: string; text: string; hostedUrl: string; categories?: { location?: string; team?: string; allLocations?: string[] }; createdAt?: number }[];
    return d.map((j) => ({ id: j.id, title: j.text, location: j.categories?.allLocations?.join(' / ') || j.categories?.location || '', url: j.hostedUrl, team: j.categories?.team, updated: j.createdAt ? new Date(j.createdAt).toISOString() : undefined }));
  }
  if (ats === 'ashby') {
    const d = (await get(`https://api.ashbyhq.com/posting-api/job-board/${slug}`)) as { jobs?: { id: string; title: string; location?: string; isRemote?: boolean; jobUrl: string; department?: string; publishedAt?: string; secondaryLocations?: { location: string }[] }[] };
    return (d.jobs ?? []).map((j) => ({ id: j.id, title: j.title, location: [j.location, ...(j.secondaryLocations ?? []).map((x) => x.location), j.isRemote ? 'Remote' : ''].filter(Boolean).join(' / '), url: j.jobUrl, team: j.department, updated: j.publishedAt }));
  }
  return [];
}

export async function fetchInternships(): Promise<Opportunity[]> {
  const now = new Date().toISOString(); const out: Opportunity[] = [];
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'internship-boards.csv');
  const boards = readFileSync(file, 'utf8').trim().split('\n').slice(1).map((l) => l.split(',')).map(([ats, slug, ...name]) => ({ ats, slug, company: name.join(',').trim() }));
  let failed = 0;
  for (const b of boards) {
    let jobs: Job[] = [];
    try { jobs = await jobsFor(b.ats, b.slug); } catch { failed++; continue; }
    for (const j of jobs) {
      if (!isInternTitle(j.title)) continue;
      if (!isUS(j.location)) continue;
      out.push({
        id: `op_ext_job_${b.ats}_${b.slug}_${j.id}`.slice(0, 120), type: 'internship', title: j.title.trim(), host: b.company,
        description: [j.location, j.team].filter(Boolean).join(' · '), cover: { emoji: '💼', hue: 215 },
        location: j.location.replace(/\s*[•|/;]\s*/g, ' · ').trim(), remote: /remote/i.test(j.location), field: fieldOf(j.title, j.team), postedAt: j.updated,
        eligibility: 'See the posting for class year, major and work authorization', sourceUrl: j.url, sourceLabel: `${b.company} careers`,
        tags: ['internship', b.company, ...(/remote/i.test(j.location) ? ['remote'] : [])], interests: ['startup', 'networking'], goals: ['internship'],
        official: true, lastVerified: now, qna: [], reviews: [], createdAt: j.updated ?? now,
      });
    }
    await new Promise((res) => setTimeout(res, 150));
  }
  if (failed > boards.length / 2) throw new Error(`${failed}/${boards.length} job boards failed`);
  return out;
}

/** 자동으로 가져온 공고 중 이미 다른 출처(직접 확인한 CSV 등)에 같은 제목이 있는 것은 뺀다 — 같은 해커톤이 두 줄로 보였다 (Technica 2026) */
const titleKey = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, '');
export function dropDuplicateTitles<T extends { id: string; title: string }>(items: T[], existing: { id: string; title: string }[], idPrefix: string): T[] {
  const taken = new Set(existing.filter((o) => !o.id.startsWith(idPrefix)).map((o) => titleKey(o.title)));
  return items.filter((o) => !taken.has(titleKey(o.title)));
}

