/**
 * 미국 전역 학생 채용 — 회사들이 지원자용으로 공개한 채용 게시판 API 만 읽는다 (로그인 없음, 긁기 사이트 없음).
 *   Greenhouse  https://boards-api.greenhouse.io/v1/boards/<token>/jobs
 *   Lever       https://api.lever.co/v0/postings/<company>?mode=json
 *   Ashby       https://api.ashbyhq.com/posting-api/job-board/<org>
 * 미국 근무지 + 학생·졸업생 대상(인턴·PhD·석사·신입·포닥·펠로십) 공고만 남기고, 누구 대상인지 표시한다.
 * 게시판에 올라 있는 공고 = 지금 지원 가능한 공고 (내려가면 다음 수집에서 빠진다).
 */

export type JobPlatform = 'greenhouse' | 'lever' | 'ashby' | 'workday' | 'amazon';
export type Audience = 'phd' | 'masters' | 'undergrad' | 'newgrad' | 'postdoc';
export interface StudentJob {
  id: string; company: string; sector?: string; title: string; location: string; url: string;
  kind: 'internship' | 'job' | 'fellowship'; audience: Audience[]; updatedAt?: string; source: JobPlatform;
}
interface RawJob { id: string; title: string; location: string; url: string; updatedAt?: string }

export function parseGreenhouse(d: unknown): RawJob[] {
  const jobs = (d as { jobs?: { id: number; title: string; location?: { name?: string }; absolute_url: string; updated_at?: string }[] })?.jobs ?? [];
  return jobs.map((j) => ({ id: String(j.id), title: j.title, location: j.location?.name ?? '', url: j.absolute_url, updatedAt: j.updated_at }));
}
export function parseLever(d: unknown): RawJob[] {
  const jobs = Array.isArray(d) ? (d as { id: string; text: string; categories?: { location?: string; allLocations?: string[] }; hostedUrl: string; createdAt?: number }[]) : [];
  return jobs.map((j) => ({ id: j.id, title: j.text, location: (j.categories?.allLocations?.length ? j.categories.allLocations.join('; ') : j.categories?.location) ?? '', url: j.hostedUrl, updatedAt: j.createdAt ? new Date(j.createdAt).toISOString() : undefined }));
}
export function parseAshby(d: unknown): RawJob[] {
  const jobs = (d as { jobs?: { id: string; title: string; location?: string; secondaryLocations?: { location?: string }[]; address?: { postalAddress?: { addressCountry?: string } }; jobUrl: string; publishedAt?: string; isListed?: boolean }[] })?.jobs ?? [];
  return jobs.filter((j) => j.isListed !== false).map((j) => ({ id: j.id, title: j.title, location: [j.location, ...(j.secondaryLocations ?? []).map((s) => s.location), j.address?.postalAddress?.addressCountry].filter(Boolean).join('; '), url: j.jobUrl, updatedAt: j.publishedAt }));
}

const STATES = 'Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming';
const ABBR = 'AL|AK|AZ|AR|CA|CO|CT|DE|DC|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY';
const CITIES = 'San Francisco|New York City|NYC|Seattle|Boston|Cambridge|Chicago|Austin|Los Angeles|Palo Alto|Mountain View|Menlo Park|Sunnyvale|San Jose|San Diego|Redmond|Washington,? D\\.?C|Pittsburgh|Atlanta|Denver|Philadelphia|Princeton|Bay Area|Silicon Valley';
const US_RE = new RegExp(`\\b(United States|${STATES}|${CITIES})\\b`, 'i');
const US_CODE = new RegExp(`\\b(USA|US)\\b|U\\.S\\.|,\\s*(${ABBR})\\b`); // 대문자만 — "join us" 같은 말을 미국으로 보지 않게
const NON_US_ONLY = /\b(Canada|London|UK|United Kingdom|India|Germany|Ireland|Singapore|Japan|Tokyo|Paris|France|Amsterdam|Netherlands|Toronto|Vancouver|Berlin|Sydney|Australia|Israel|Tel Aviv|Zurich|Switzerland|Dublin|Bangalore|Bengaluru|Hong Kong|Shanghai|Beijing|Seoul|Korea|Mexico|Brazil|Poland|Spain|Madrid|Warsaw)\b/i;
/** 미국 근무지가 하나라도 있으면 미국 공고 ("Remote" 만 있으면 미국으로 보지 않는다 — 나라가 안 적혀 있으니) */
export function isUS(location: string): boolean {
  return location.split(/;|\|| or /).some((p) => (US_RE.test(p) || US_CODE.test(p)) && !(NON_US_ONLY.test(p) && !/\b(United States|USA|US)\b/.test(p)));
}

const INTERN = /\b(intern|internship|co-?op|summer associate|summer analyst)\b/i;
const FELLOW = /\b(fellow|fellowship|residency|resident)\b/i;
const PHD = /\b(ph\.?\s?d|doctoral|doctorate)\b/i;
const MASTERS = /\b(master'?s|mba|m\.?eng)\b/i;
const MS = /\bM\.?S\b/; // 대문자만
const NEWGRAD = /\b(new grad|new college grad(uate)?|college grad(uate)?|new graduate|university grad(uate)?|recent grad(uate)?|early career|entry[- ]level|graduate program|campus hire|20(2[6-9]) start)\b/i;
// 졸업 후 학부생이 갈 수 있는 신입 자리 — 제목에 “new grad”가 없어도 1단계 직급·주니어·신입 프로그램이면 신입으로 본다
const ENTRY = /\b(junior|jr\.?|rotational|rotation program|analyst program|development program|leadership program|graduate (scheme|program)|class of 20(2[6-9])|associate (product manager|consultant|software engineer|engineer|data scientist|data analyst|analyst|developer))\b/i;
const LEVEL1 = /\b(Engineer|Developer|Analyst|Scientist|Technician|Specialist|Associate|Accountant|Consultant|Coordinator|Representative|Designer|Researcher)[ ,-]+(I|1)(?![\w+])/;
const TRADE = /\b(technician|mechanics?|electricians?|machinist|welding|welder|assembler|operator|chef|cook|barista|cashier|custodian|janitor|driver|forklift|material handler|warehouse|maintenance|shift|contractor|temporary|skillbridge|security representative|receiving specialist|inventory specialist|logistics specialist|quality control specialist|laboratory associate)\b/i;
const POSTDOC = /\b(post-?doc(toral)?)\b/i;
const UNDERGRAD = /\b(undergrad(uate)?|bachelor'?s)\b|\bB\.?S\b/;
/** 학생·졸업생 대상만 — 아니면 null. 시니어·매니저급은 “new grad”가 섞여도 뺀다 */
export function classify(title: string): Pick<StudentJob, 'kind' | 'audience'> | null {
  const seniorWord = /\b(senior|sr\.?|staff|principal|lead|director|head of|vp)\b/i.test(title) || (/\bmanager\b/i.test(title) && !/\b(associate|rotational|junior) product manager\b/i.test(title));
  if (seniorWord && !INTERN.test(title)) return null;
  // 시급제·현장·교대 일자리(기술공·정비·교대근무·조리·계약직·창고)는 '대학 졸업 신입' 자리가 아니다 — 제목 끝 'I'·'Entry Level' 때문에 신입으로 잡히던 것 (2026-11-05 점검 50여 개: Relativity 교대 기술공, Target 정비, SpaceX 조리). 인턴은 학생 자리라 그대로 둔다
  if (!INTERN.test(title) && TRADE.test(title)) return null;
  const audience: Audience[] = [];
  if (PHD.test(title)) audience.push('phd');
  if (MASTERS.test(title) || MS.test(title)) audience.push('masters');
  if (POSTDOC.test(title)) audience.push('postdoc');
  // 인턴 공고의 “2027 start” 는 인턴 시작 시기일 뿐 — 인턴은 “new grad” 가 직접 적힐 때만 신입으로 본다
  const intern0 = INTERN.test(title);
  if (intern0 ? /\b(new grad|new college grad(uate)?|new graduate|university grad(uate)?|recent grad(uate)?)\b/i.test(title) : NEWGRAD.test(title) || ENTRY.test(title) || LEVEL1.test(title)) audience.push('newgrad');
  if (UNDERGRAD.test(title)) audience.push('undergrad');
  const intern = INTERN.test(title);
  if (!intern && !audience.length && !(FELLOW.test(title) && /\b(research|ai|ml|science|scientist|graduate|phd)\b/i.test(title))) return null;
  // 학위가 안 적힌 인턴은 학부·대학원 모두 지원 가능한 경우가 많다 — 대상은 비워 둔다(지어내지 않는다)
  return { kind: intern ? 'internship' : POSTDOC.test(title) || FELLOW.test(title) ? 'fellowship' : 'job', audience };
}

export function toStudentJobs(raw: RawJob[], b: { platform: JobPlatform; token: string; company: string; sector?: string }): StudentJob[] {
  const out: StudentJob[] = [];
  for (const j of raw) {
    if (!j.title || !j.url || !isUS(j.location)) continue;
    const c = classify(j.title);
    if (!c) continue;
    out.push({ id: `job_${b.platform}_${b.token}_${j.id}`.toLowerCase().replace(/[^a-z0-9_]+/g, '_'), company: b.company, sector: b.sector || undefined, title: j.title.trim(), location: j.location, url: j.url, ...c, updatedAt: j.updatedAt, source: b.platform });
  }
  return out;
}

/**
 * 회사·제목·장소가 모두 같은 공고는 학생에게 한 개로 보인다(채용 번호만 다른 같은 자리 — 2026-11-08 19건: Intel PhD 인턴, Boeing …).
 * 처음 것을 남기고 나머지는 repeats 로 돌려준다(부르는 쪽이 jobs-us.dropped.json 에 남긴다 — 지우지 않는다).
 */
export function splitRepeatJobs(list: StudentJob[]): { keep: StudentJob[]; repeats: (StudentJob & { reason: string })[] } {
  const first = new Map<string, string>(); const keep: StudentJob[] = []; const repeats: (StudentJob & { reason: string })[] = [];
  for (const j of list) {
    const k = `${j.company}|${j.title}|${j.location}`.toLowerCase().replace(/\s+/g, ' ').trim();
    const f = first.get(k);
    if (f) repeats.push({ ...j, reason: `same company, title and location as ${f}` }); else { first.set(k, j.id); keep.push(j); }
  }
  return { keep, repeats };
}

export const boardUrl = (platform: Exclude<JobPlatform, 'workday'> | JobPlatform, token: string) =>
  platform === 'greenhouse' ? `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs`
    : platform === 'lever' ? `https://api.lever.co/v0/postings/${encodeURIComponent(token)}?mode=json`
      : `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(token)}`;
export const parseBoard = (platform: JobPlatform, d: unknown) => (platform === 'greenhouse' ? parseGreenhouse(d) : platform === 'lever' ? parseLever(d) : parseAshby(d));

/**
 * Workday 공개 채용 사이트 (큰 은행·제약·제조·컨설팅이 많이 쓴다) — token = "host~tenant~site" (예: nvidia.wd5.myworkdayjobs.com~nvidia~NVIDIAExternalCareerSite).
 * POST <host>/wday/cxs/<tenant>/<site>/jobs {searchText} — 검색어 몇 개로 학생·신입 공고만 모은다(전체를 다 받지 않는다). 근무지가 "N Locations" 로 묶인 것은 나라를 알 수 없어 뺀다.
 */
export const WORKDAY_QUERIES = ['new grad', 'university graduate', 'graduate program', 'entry level', 'early career', 'intern', 'phd', 'analyst program'];
export function parseWorkday(d: unknown, host: string, site: string): RawJob[] {
  const list = (d as { jobPostings?: { title: string; externalPath: string; locationsText?: string; postedOn?: string; bulletFields?: string[] }[] })?.jobPostings ?? [];
  return list.filter((p) => p.title && p.externalPath).map((p) => ({ id: p.bulletFields?.[0] ?? p.externalPath.split('_').pop() ?? p.externalPath, title: p.title, location: /^\d+ Locations$/i.test(p.locationsText ?? '') ? '' : p.locationsText ?? '', url: `https://${host}/en-US/${site}${p.externalPath}` }));
}
export async function fetchWorkday(token: string, pages = 3): Promise<RawJob[]> {
  const [host, tenant, site] = token.split('~'); const api = `https://${host}/wday/cxs/${tenant}/${site}/jobs`;
  const byId = new Map<string, RawJob>();
  for (const q of WORKDAY_QUERIES) {
    for (let page = 0; page < pages; page++) {
      const r = await fetch(api, { method: 'POST', headers: { 'user-agent': 'AroundU-student-jobs', 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ appliedFacets: {}, limit: 20, offset: page * 20, searchText: q }) });
      if (!r.ok) throw new Error(`workday ${tenant} → ${r.status}`);
      const got = parseWorkday(await r.json(), host, site); for (const j of got) byId.set(j.id, j);
      if (got.length < 20) break;
      await new Promise((res) => setTimeout(res, 250));
    }
  }
  return [...byId.values()];
}

/** amazon.jobs 공개 검색 JSON (search.json?base_query=…&country=USA) — 학생·신입 검색어로만, 검색어당 100개씩 3쪽까지 */
export const AMAZON_QUERIES = ['intern', 'university graduate', 'new grad', 'phd', 'graduate', 'early career', 'entry level', 'student'];
export function parseAmazon(d: unknown): RawJob[] {
  const jobs = (d as { jobs?: { id_icims?: string; title?: string; normalized_location?: string; location?: string; job_path?: string; posted_date?: string }[] })?.jobs ?? [];
  return jobs.filter((j) => j.id_icims && j.title && j.job_path).map((j) => ({ id: j.id_icims!, title: j.title!, location: j.normalized_location || j.location || '', url: `https://www.amazon.jobs${j.job_path}`, updatedAt: j.posted_date ? new Date(j.posted_date).toISOString() : undefined }));
}
export async function fetchAmazon(pages = 3): Promise<RawJob[]> {
  const byId = new Map<string, RawJob>();
  for (const q of AMAZON_QUERIES) {
    for (let page = 0; page < pages; page++) {
      const r = await fetch(`https://www.amazon.jobs/en/search.json?base_query=${encodeURIComponent(q)}&country=USA&result_limit=100&offset=${page * 100}&sort=recent`, { headers: { 'user-agent': 'AroundU-student-jobs', accept: 'application/json' } });
      if (!r.ok) throw new Error(`amazon → ${r.status}`);
      const got = parseAmazon(await r.json()); for (const j of got) byId.set(j.id, j);
      if (got.length < 100) break;
      await new Promise((res) => setTimeout(res, 400));
    }
  }
  return [...byId.values()];
}
