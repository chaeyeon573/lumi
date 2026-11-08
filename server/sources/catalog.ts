/**
 * 공개 과목 카탈로그(코드·이름·학점) 수집 — 학기 시간표가 비공개인 학교도 "어떤 수업이 있나"는 공개한다.
 *
 * CourseLeaf 카탈로그(미국 대학 다수)는 설치마다 페이지 구조가 달라도 서버 API 는 같다:
 *   GET <catalog>/ribbit/index.cgi?page=getcourse.rjs&subject=AFST  → 그 학과 전체 과목이 XML(courseblock HTML 포함)로 온다
 * 학과 코드 목록만 알면 되므로, 사이트를 조금 돌며(상한 있음) 링크·본문에서 "(AFST)" / "AFST 1234" 꼴의 코드를 모은 뒤
 * 코드마다 한 번씩 API 를 부른다. 결과는 meetings 가 빈 CatalogCourse — 시간은 학생이 넣거나 시간표 소스가 덮어쓴다.
 */
import type { CatalogCourse } from '@core/api/types';

const UA = 'Mozilla/5.0 AroundU-importer';
const strip = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#8203;|​/g, '').replace(/\s+/g, ' ').trim();
const courseId = (schoolId: string, code: string) => `cc_${schoolId.replace('s_', '')}_${code.toLowerCase().replace(/[^a-z0-9]+/g, '')}`;

async function get(url: string): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20_000) });
      if (r.ok) return await r.text();
      if (r.status < 500) return null;
    } catch { /* retry */ }
    await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
  }
  return null;
}

/** 사이트를 조금 돌며 학과 코드 후보를 모은다 */
export async function discoverSubjects(rootUrl: string, maxPages = 80): Promise<string[]> {
  const root = new URL(rootUrl); const origin = root.origin;
  const seen = new Set<string>(); const queue = [root.href, `${origin}/azindex/`, `${origin}/courses/`]; const codes = new Map<string, number>();
  const interesting = (p: string) => /course|subject|bulletin|catalog|curricul|department|program|azindex|index/i.test(p) && !/\.(pdf|jpg|png|css|js)$/i.test(p) && !/archive|print|search/.test(p);
  while (queue.length && seen.size < maxPages) {
    const url = queue.shift()!; if (seen.has(url)) continue; seen.add(url);
    const html = await get(url); if (!html) continue;
    for (const m of html.matchAll(/\(([A-Z][A-Z&]{1,5})\)/g)) codes.set(m[1], (codes.get(m[1]) ?? 0) + 3);
    for (const m of html.matchAll(/title="([A-Z][A-Z&]{1,5})\s\d/g)) codes.set(m[1], (codes.get(m[1]) ?? 0) + 2);
    for (const m of html.matchAll(/\b([A-Z][A-Z&]{1,5})&#160;\d{2,4}/g)) codes.set(m[1], (codes.get(m[1]) ?? 0) + 1);
    // 과목 목록 주소가 /courses/<code>/ 또는 /course-descriptions/<code>/ (NC State, 2026-11-05)
    for (const m of html.matchAll(/href="\/(?:courses|course-descriptions)\/([a-z]{2,6})\/"/g)) codes.set(m[1].toUpperCase(), (codes.get(m[1].toUpperCase()) ?? 0) + 5);
    for (const href of html.matchAll(/href="([^"#?]+)"/g)) {
      let next: URL; try { next = new URL(href[1], url); } catch { continue; }
      if (next.origin !== origin || seen.has(next.href) || !interesting(next.pathname) || next.pathname.split('/').length > 5) continue;
      queue.push(next.href);
    }
    await new Promise((res) => setTimeout(res, 100));
  }
  const STOP = new Set(['AND', 'THE', 'FOR', 'PDF', 'HTML', 'USA', 'GPA', 'FAQ', 'TBA', 'TBD', 'ACT', 'SAT']);
  const found = [...codes.entries()].filter(([c, n]) => n >= 2 && !STOP.has(c)).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  // 입구를 못 찾은 사이트(Brown 처럼 /courses/ 가 없는 곳)를 위해 흔한 학과 코드도 시도한다 — API 호출 한 번씩이라 싸다
  return [...new Set([...found, ...SEED_SUBJECTS])];
}
/** 미국 대학에서 흔한 학과 코드 — 탐지가 빈약할 때의 보조 */
const SEED_SUBJECTS = ['CS', 'CSCI', 'COMP', 'CMSC', 'CMPSC', 'EECS', 'ECE', 'EE', 'MATH', 'STAT', 'STATS', 'PHYS', 'PHYSICS', 'CHEM', 'BIO', 'BIOL', 'BIOS', 'ECON', 'PSYC', 'PSYCH', 'SOC', 'SOCI', 'POLS', 'POLI', 'POLISCI', 'GOV', 'GOVT', 'HIST', 'ENGL', 'ENG', 'PHIL', 'PHL', 'LING', 'ANTH', 'ANTHRO', 'ART', 'ARTH', 'MUS', 'MUSIC', 'THEA', 'FREN', 'SPAN', 'GERM', 'CHIN', 'JAPN', 'KORE', 'KOR', 'ARAB', 'RELI', 'REL', 'CLAS', 'ENVS', 'ENVI', 'GEOL', 'EAS', 'EPS', 'ASTR', 'ASTRO', 'NEUR', 'NEURO', 'BUS', 'BUSN', 'MGMT', 'MKTG', 'FIN', 'FINC', 'ACCT', 'ENGR', 'MECH', 'ME', 'CE', 'CEE', 'CHE', 'CHEG', 'BME', 'BIOE', 'MSE', 'AERO', 'AE', 'IE', 'IEOR', 'EDUC', 'EDU', 'NURS', 'PH', 'PUBH', 'HLTH', 'KINE', 'PE', 'COMM', 'JOUR', 'FILM', 'DANC', 'ARCH', 'URBN', 'URBS', 'LAW', 'AFAM', 'AFST', 'AMST', 'WGS', 'WGSS', 'GEOG', 'INTL', 'IR', 'DATA', 'DS', 'INFO', 'IS', 'WRIT', 'LATN', 'GREK', 'ITAL', 'RUSS', 'PORT', 'HEBR', 'HIND', 'ESL'];

/** "AFST 5505a, The Making of … Staff" / "AERO 101. Title. 1 Credits." → 코드·이름·학점 */
const TITLE_RE = /^\[?\s*([A-Z][A-Z&]{1,5}\s?[A-Z]{0,2}\d{1,4}[A-Z]{0,4})\s*\]?[.,:\s–-]+\s*(.+?)\s*$/;
export function parseBlock(schoolId: string, block: string, origin?: string): CatalogCourse | null {
  const strong = /<strong>([\s\S]*?)<\/strong>/.exec(block)?.[1];
  const titleEl = /class="[^"]*courseblocktitle[^"]*"[^>]*>([\s\S]*?)<\/(?:p|div|h[1-6])>/.exec(block)?.[1];
  const detailTitle = /class="[^"]*detail-title[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/.exec(block)?.[1];
  const detailCode = /class="[^"]*detail-(?:course)?code[^"]*"[^>]*>([\s\S]*?)<\/(?:span|div)>/.exec(block)?.[1];
  let code = '', title = '';
  if (detailCode && detailTitle) { code = strip(detailCode).replace(/\.$/, ''); title = strip(detailTitle).replace(/\.$/, ''); }
  else {
    // 앞 400자만 자르면 태그가 반쯤 잘려 제목에 "3 Credits </d" 가 남는다(Penn State 696개, 2026-11-08) — 잘린 태그는 뗀다
    const text = strip(strong ?? titleEl ?? block.slice(0, 400).replace(/<[^>]*$/, ''));
    const m = TITLE_RE.exec(text); if (!m) return null;
    code = m[1].replace(/\s+/g, ' '); title = m[2].replace(/[.\s]+$/, '');
    // 교차 개설 번호가 제목 앞에 오는 경우("/ JST 120 / RLST 120 Title") — 번호들을 뗀다
    if (title.startsWith('/')) title = title.replace(/^(?:\/\s*[A-Z][A-Z&]{1,5}\s?\d{1,4}[A-Z]{0,2}\s*)+\/?\s*/, '');
  }
  // 교차 개설 "NR 421/ NR 521" → 학교 목록 머리처럼 첫 번호만 (NC State). Caltech 의 "ACM/EE 106A" 같은 공동 학과 번호는 그대로
  { const x = /^([A-Z][A-Z&]{1,5} \d{3,4}[A-Z]{0,2})\s*\/\s*[A-Z][A-Z&]{1,5} \d/.exec(code); if (x) code = x[1]; }
  // 제목 끝에 붙는 "3 Credits" / "0,3 Credits" / "1-4 Units" 는 학점이지 이름이 아니다
  title = title.replace(/[\s.,]*\(?\d+(?:[.,–-]\d+)*\)?\s*(?:units?|credits?|credit hours?|hours?|points?)\.?\s*$/i, '').replace(/[.\s]+$/, '').trim();
  // SF State 처럼 제목 뒤에 “(Units: 3)” 가 붙어 오는 카탈로그
  title = title.replace(/\s*\(Units?:\s*[\d.]+(?:\s*[-–]\s*[\d.]+)?\)\s*$/i, '').trim();
  // UC Davis 처럼 제목 앞에 “&#8212; ” (—) 가 붙어 오는 카탈로그 — 글자 코드를 풀고 앞의 대시를 뗀다
  title = title.replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&').replace(/^[\s—–-]+/, '').trim();
  if (!code || !title || title.length < 3) return null;
  const units = /\b(\d+(?:\.\d+)?)(?:\s*[-–]\s*\d+(?:\.\d+)?)?\s*(?:units?|credits?|credit hours?|hours?|points?)\b/i.exec(strip(titleEl ?? block.slice(0, 600)))?.[1];
  return { id: courseId(schoolId, code), schoolId, code, title: title.slice(0, 140), department: code.replace(/\s?\d.*$/, ''), meetings: [], term: 'catalog', units: units ? Number(units) : undefined, url: origin ? `${origin}/search/?P=${encodeURIComponent(code)}` : undefined };
}

export interface CatalogResult { courses: CatalogCourse[]; subjects: string[]; subjectsWithCourses: number; root: string }

/** maxSubjects: 표본만 (데이터만 모으는 학교의 시험 읽기) — 학과 목록에서 고르게 n 개 */
export async function fetchCourseLeaf(schoolId: string, rootUrl: string, maxSubjects?: number): Promise<CatalogResult> {
  const root = new URL(rootUrl);
  const all = await discoverSubjects(root.href);
  const subjects = maxSubjects && all.length > maxSubjects ? Array.from({ length: maxSubjects }, (_, i) => all[Math.floor((i * all.length) / maxSubjects)]) : all;
  const byId = new Map<string, CatalogCourse>(); let subjectsWithCourses = 0;
  for (const subj of subjects) {
    const xml = await get(`${root.origin}/ribbit/index.cgi?page=getcourse.rjs&subject=${encodeURIComponent(subj)}`);
    if (!xml) continue;
    const blocks = xml.split(/<div class="courseblock[^"]*">/).slice(1);
    if (!blocks.length) continue;
    subjectsWithCourses++;
    for (const b of blocks) { const c = parseBlock(schoolId, b, root.origin); if (c && !byId.has(c.id)) byId.set(c.id, c); }
    await new Promise((res) => setTimeout(res, 150));
  }
  return { courses: [...byId.values()], subjects, subjectsWithCourses, root: root.href };
}
