/**
 * 학교 밖 대학생 대상 기회 — schoolId 없이 넣어 모든 학교 학생에게 보인다.
 *   devpost  Devpost 공개 API (devpost.com/api/hackathons) — 진행 중·예정 해커톤. 온라인 또는 캘리포니아 대면만, 초대제 제외
 *   jobs     기업 공개 채용 API (Greenhouse · Lever · Ashby) 에서 제목에 Intern / Co-op 이 들어간 공고 — 미국·원격만.
 *            기업 목록은 server/data/internship-boards.csv (ats,slug,company) — 줄 하나로 추가한다
 * MLH 해커톤 대부분이 Devpost 에도 올라온다.
 */
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

export async function fetchDevpost(maxPages = 40): Promise<Opportunity[]> {
  const now = new Date().toISOString(); const out: Opportunity[] = []; const seen = new Set<number>();
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
      const { start, end } = parseDevpostDates(h.submission_period_dates ?? '');
      const online = /online/i.test(where);
      const prize = text(h.prize_amount ?? '');
      out.push({
        id: `op_ext_devpost_${h.id}`, type: 'hackathon', title: text(h.title), host: text(h.organization_name ?? 'Devpost'),
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

const INTERN_RE = /\bintern(ship)?s?\b|\bco-?op\b/i;
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
      if (!INTERN_RE.test(j.title) || /\binternal\b|high school|\bhs\b/i.test(j.title)) continue;
      if (!isUS(j.location)) continue;
      out.push({
        id: `op_ext_job_${b.ats}_${b.slug}_${j.id}`.slice(0, 120), type: 'internship', title: j.title.trim(), host: b.company,
        description: [j.location, j.team].filter(Boolean).join(' · '), cover: { emoji: '💼', hue: 215 },
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
