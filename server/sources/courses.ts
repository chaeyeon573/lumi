/**
 * 학교별 수업 시간표 소스 — fetch:courses CLI 와 agent 가 같이 쓴다.
 *   stanford  ExploreCourses XML (키 불필요)
 *   mit       FireRoad API (키 불필요)
 *   berkeley  SIS Class API (키 있으면) → 없으면 공개 Class Schedule(classes.berkeley.edu)
 *   cornell   Class Roster 공개 JSON API (classes.cornell.edu/api/2.0, 키 불필요)
 *   umd       Testudo Schedule of Classes 공개 HTML (app.testudo.umd.edu/soc)
 *   harvard   my.harvard.edu 공개 과목 검색 + 섹션 조각 (FAS, 진행 중/다음 학기)
 * lookup(course) 는 한 과목을 원본에서 다시 읽어 온다 — agent 의 표본 검증용. 없으면 null.
 */
import type { CatalogCourse, CatalogSection } from '@core/api/types';
import { parseDays, parseTime } from '../scripts/csv';
import { decodeNumericEntities } from './entities';
import { catalogTermLabels, currentTerm, nextTerm, normalizeTermLabel, termLabel, termOrder, termSlug } from '@core/lib/terms';

type Meeting = { day: number; start: string; end: string };
const courseId = (schoolId: string, code: string) => `cc_${schoolId.replace('s_', '')}_${code.toLowerCase().replace(/[^a-z0-9]+/g, '')}`;
const uniq = (ms: Meeting[]) => ms.filter((m, i) => ms.findIndex((x) => x.day === m.day && x.start === m.start && x.end === m.end) === i);
/**
 * 두 학기를 같이 담으면 같은 과목이 두 번 나온다 — 지금 학기는 원래 id 그대로(cc_berkeley_cs61a), 다른 학기는 꼬리표를 붙인다(cc_berkeley_cs61a_sp27).
 * 사용자가 시간표에 넣은 수업은 요일·시간을 복사해 두므로 id 가 바뀌어도 영향이 없다.
 */
const tagTerm = (courses: CatalogCourse[], label: string, now = new Date()): CatalogCourse[] => {
  if (label === termLabel(currentTerm(now))) return courses;
  const slug = termSlug(label);
  return courses.map((c) => ({ ...c, id: `${c.id}_${slug}` }));
};

// ─── Stanford: ExploreCourses XML ──────────────────────────────────────────
/**
 * 과목마다 그 학년도의 모든 섹션이 온다 (Autumn·Winter·Spring, 강의 LEC + 토론 DIS · 랩 LAB …).
 *   - 쿼터마다 한 줄: 그 쿼터의 강의 섹션 시간이 시간표, 같은 쿼터의 토론·랩은 sections 로 (학생이 고른다)
 *   - 강의 섹션이 여럿이면 섹션마다 한 줄 (첫 섹션이 기본 id, 나머지는 _<섹션>) — Berkeley 와 같은 규칙
 *   - 학기 라벨은 "2026-2027 Autumn" → "Autumn 2026" (normalizeTermLabel). 지금 쿼터가 아닌 줄은 id 에 꼬리표
 */
export function stanfordCourses(xml: string, subj: string, now = new Date()): CatalogCourse[] {
  const unesc = (x: string) => x.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
  const g = (tag: string, src: string) => unesc(src.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1]?.trim() ?? '');
  const out: CatalogCourse[] = [];
  const current = normalizeTermLabel(termLabel(currentTerm(now))).replace(/^Fall /, 'Autumn ');
  for (const c of xml.matchAll(/<course>([\s\S]*?)<\/course>/g)) {
    const b = c[1];
    const subject = g('subject', b); if (subject !== subj) continue;
    const code = `${subject} ${g('code', b)}`;
    const title = g('title', b);
    type Sec = { term: string; component: string; no: string; meetings: Meeting[]; location?: string; instructor?: string };
    const secs: Sec[] = [];
    for (const m of b.matchAll(/<section>([\s\S]*?)<\/section>/g)) {
      const sec = m[1];
      const meetings: Meeting[] = []; let location = ''; let instructor = '';
      for (const sch of sec.matchAll(/<schedule>([\s\S]*?)<\/schedule>/g)) {
        const days = g('days', sch[1]).replace(/\s+/g, ' '); const st = g('startTime', sch[1]); const en = g('endTime', sch[1]);
        if (!days || !st || !en) continue;
        location ||= g('location', sch[1]);
        instructor ||= g('name', sch[1]);
        for (const day of parseDays(days)) meetings.push({ day, start: parseTime(st.replace(/:00 /, ' ')), end: parseTime(en.replace(/:00 /, ' ')) });
      }
      if (!meetings.length) continue;
      secs.push({ term: normalizeTermLabel(g('term', sec)), component: g('component', sec), no: g('sectionNumber', sec), meetings: uniq(meetings), location: location || undefined, instructor: instructor || undefined });
    }
    for (const term of [...new Set(secs.map((x) => x.term))]) {
      const inTerm = secs.filter((x) => x.term === term);
      const lectures = inTerm.filter((x) => x.component === 'LEC');
      const mains = (lectures.length ? lectures : [inTerm[0]]).sort((a, b2) => a.no.localeCompare(b2.no, 'en', { numeric: true }));
      const extras = inTerm.filter((x) => !mains.includes(x) && x.component !== 'LEC');
      const sections: CatalogSection[] | undefined = extras.length
        ? extras.map((x) => ({ label: `${x.component} ${x.no}`, kind: x.component, meetings: x.meetings, location: x.location }))
          .sort((a, b2) => a.kind.localeCompare(b2.kind) || a.label.localeCompare(b2.label, 'en', { numeric: true }))
        : undefined;
      const baseId = courseId('s_stanford', code);
      const slug = term === current ? '' : `_${termSlug(term)}`;
      mains.forEach((lec, i) => out.push({
        id: `${baseId}${i === 0 ? '' : `_${lec.no}`}${slug}`, schoolId: 's_stanford', code, title: mains.length > 1 ? `${title} (Sec ${lec.no})` : title, department: subject,
        instructor: lec.instructor, location: lec.location, meetings: lec.meetings, term, units: Number(g('unitsMax', b)) || undefined,
        url: `https://explorecourses.stanford.edu/search?view=catalog&q=${encodeURIComponent(code)}`, ...(sections ? { sections } : {}),
      }));
    }
  }
  return out;
}
async function stanford(): Promise<CatalogCourse[]> {
  const subjects = (process.env.STANFORD_SUBJECTS ?? 'CS,MATH,STATS,ECON,PSYCH,BIO,CHEM,PHYSICS,EE,ME,MS&E,ENGR,POLISCI,HISTORY,ENGLISH,MUSIC,ARTSTUDI,SYMSYS,PWR,KORLANG').split(',');
  const out: CatalogCourse[] = [];
  for (const subj of subjects) {
    // 학기 필터 없이 — 한 번에 그 학년도 세 쿼터가 다 온다
    const url = `https://explorecourses.stanford.edu/search?view=xml-20200810&filter-coursestatus-Active=on&q=${encodeURIComponent(subj)}`;
    const xml = await (await fetch(url, { headers: { 'user-agent': 'AroundU-importer' } })).text();
    out.push(...stanfordCourses(xml, subj));
    console.log(`  ${subj}: ${out.length}`);
  }
  return out;
}

// ─── MIT: FireRoad ─────────────────────────────────────────────────────────
/** schedule 예: "Lecture,32-123/MW/0/1-2.30,26-100/F/0/2;Recitation,..." → 요일 R=Thu, 시간은 8~12 오전·1~7 오후, 뒤 플래그 1 이면 저녁 */
function mitSchedule(s: string): { meetings: Meeting[]; location?: string } {
  const meetings: Meeting[] = []; let location: string | undefined;
  for (const part of s.split(';')) {
    const [kind, ...slots] = part.split(',');
    if (!/lecture/i.test(kind)) continue;
    for (const slot of slots) {
      const [room, days, evening, time] = slot.split('/');
      if (!days || !time) continue;
      location ||= room;
      // "7-9 PM" / "4-6.30 PM" 처럼 뒤에 AM/PM 이 붙기도 한다 — 떼어내고 PM 이면 저녁으로 본다
      const ampm = /\s*(AM|PM)\s*$/i.exec(time)?.[1]?.toUpperCase();
      const pm = evening === '1' || ampm === 'PM';
      const [a, bRaw] = time.replace(/\s*(AM|PM)\s*$/i, '').split('-');
      const toHM = (x: string) => { const [h, m = '0'] = x.trim().split('.'); let hh = Number(h); if (pm || (hh >= 1 && hh <= 7)) hh += hh < 12 ? 12 : 0; return `${String(hh).padStart(2, '0')}:${String(Number(m) * (m.length === 1 ? 10 : 1)).padStart(2, '0')}`; };
      const start = toHM(a); const end = bRaw ? toHM(bRaw) : (() => { const [h, m] = start.split(':').map(Number); return `${String(h + 1).padStart(2, '0')}:${String(m).padStart(2, '0')}`; })();
      for (const day of parseDays(days.replace(/R/g, 'Th'))) meetings.push({ day, start, end });
    }
  }
  return { meetings: uniq(meetings), location };
}
async function mit(): Promise<CatalogCourse[]> {
  const res = await fetch('https://fireroad.mit.edu/courses/all?full=true', { headers: { 'user-agent': 'AroundU-importer' } });
  const all = (await res.json()) as { subject_id: string; title: string; schedule?: string; instructors?: string[]; total_units?: number; offered_fall?: boolean; offered_spring?: boolean }[];
  // fireroad 의 schedule 은 지금 학기 시간표 하나뿐 — 다음 학기 시간을 지어내지 않는다 (MIT 가 다음 학기를 올리면 fireroad 가 바꿔 준다)
  const term = process.env.MIT_TERM ?? (currentTerm().season === 'Spring' ? 'spring' : 'fall');
  return all.filter((c) => c.schedule && (term === 'fall' ? c.offered_fall !== false : c.offered_spring !== false)).map((c) => {
    const { meetings, location } = mitSchedule(c.schedule!);
    return { id: courseId('s_mit', c.subject_id), schoolId: 's_mit', code: c.subject_id, title: c.title, department: c.subject_id.split('.')[0], instructor: c.instructors?.[0], location, meetings, term: `${term === 'fall' ? 'Fall' : 'Spring'} ${currentTerm().year}`, units: c.total_units, url: `https://student.mit.edu/catalog/search.cgi?search=${encodeURIComponent(c.subject_id)}` };
  }).filter((c) => c.meetings.length > 0);
}

// ─── Berkeley: 공개 수업 시간표 classes.berkeley.edu (키 불필요) ────────────────
/**
 * 학교가 공개로 운영하는 Class Schedule 사이트를 읽는다. 서버 렌더링이라 검색 결과 HTML 을 그대로 파싱한다.
 *   - 학기: 지금 학기 + 다음 학기 (BERKELEY_TERM="Fall 2026|Spring 2027" 로 지정 가능). 다음 학기가 아직 안 올라왔으면 건너뛴다
 *   - 학과: 전부. 학기 검색의 시작 시간대 필터로 읽어 시간이 정해진 수업만 받는다 (BERKELEY_PUBLIC_SUBJECTS 로 학과를 좁히면 학과별로, 이름에 쉼표가 있어 | 로 구분)
 *   - 검색 결과는 수업마다 대표 섹션(강의 LEC · 세미나 SEM · 리시테이션 REC …) 한 줄 — 딸린 토론·랩 섹션은 없다. 개별 연구(IND)와 시간이 없는 줄은 뺀다
 *   - 코드는 학생들이 부르는 약칭으로 (COMPSCI 61A → CS 61A) — 내장 예시 목록의 id 와 같아져 그대로 덮어쓴다
 * 요청마다 250ms 쉬고 5xx·타임아웃은 다시 시도한다 — 두 학기 전부면 요청 400번 안팎, 묶음 3개를 나란히 읽는다 (워커가 하루 한 번).
 * 학교 사이트는 캐시가 식은 페이지에 40초쯤 걸리기도 해서 요청 하나를 2분까지 기다린다
 */
const BERKELEY_PUBLIC = 'https://classes.berkeley.edu';
const BERKELEY_ABBR: Record<string, string> = { COMPSCI: 'CS', 'POL SCI': 'POLSCI', 'MCELLBI': 'MCB', 'INTEGBI': 'IB', 'PB HLTH': 'PBHLTH', 'IND ENG': 'IEOR', 'MEC ENG': 'ME', 'CIV ENG': 'CE', 'BIO ENG': 'BIOE', 'COG SCI': 'COGSCI', 'ART': 'ART', 'L & S': 'LS' };
/**
 * 번호가 바뀐 과목 — 학생들은 아직 옛 번호로 찾는다 ("MATH 1A"). 제목 뒤에 붙여 옛 번호로도 검색되게 한다.
 * 과목 페이지의 "Formerly Mathematics 1A" 문구로 확인 (2026-10-13, Fall 2025 부터 바뀜). 검색 결과 목록에는 이 문구가 없어 여기 적어 둔다
 */
const BERKELEY_FORMERLY: Record<string, string> = { 'MATH 51': 'MATH 1A', 'MATH 52': 'MATH 1B' };
const decode = (x: string) => x.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'").replace(/&nbsp;/g, ' ');
const text = (html: string) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
/** 학교 사이트(Pantheon)가 바쁘면 504 를 바로 돌려준다 — 5xx·네트워크 오류는 2s·4s·8s·16s·32s 간격으로 5번 더 시도하고, 요청 사이에 잠깐 쉰다 */
const berkeleyGet = async (url: string): Promise<string> => {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 AroundU-importer' }, signal: AbortSignal.timeout(120_000) });
      if (r.ok) { await new Promise((res) => setTimeout(res, 250)); return await r.text(); }
      if (r.status < 500 || attempt >= 5) throw new Error(`${url} → ${r.status}`);
    } catch (e) { if (attempt >= 5) throw e; }
    await new Promise((res) => setTimeout(res, 2000 * 2 ** attempt));
  }
};
/**
 * 오래 걸리는 가져오기의 중간 결과 — 워커는 배포마다 다시 뜨는데 Berkeley 전체는 한 시간 넘게 걸린다.
 * 다 읽은 묶음(학기 × 시작 시간대)을 저장해 두고, 다시 뜨면 읽은 묶음은 건너뛴다. run.ts 가 store 로 연결한다 (없으면 매번 처음부터)
 */
export interface ImportCheckpoint { load(key: string): Promise<unknown>; save(key: string, value: unknown): Promise<void> }
let checkpoint: ImportCheckpoint | undefined;
export const useImportCheckpoint = (c: ImportCheckpoint) => { checkpoint = c; };

/** 목록 한 페이지 — berkeleyGet 의 재시도(약 1분)로도 504 면 1분씩 쉬며 세 번 더. 50쪽짜리 묶음이 한 쪽 때문에 처음부터 다시 읽히지 않게 */
async function berkeleyPage(url: string): Promise<string> {
  for (let round = 0; ; round++) {
    try { return await berkeleyGet(url); } catch (e) {
      if (round >= 3) throw e;
      console.warn(`  ${url.replace(BERKELEY_PUBLIC, '')}: ${(e as Error).message.split(' → ').pop()} — 1분 뒤 다시`);
      await new Promise((res) => setTimeout(res, 60_000));
    }
  }
}
interface BerkeleyIndex { terms: Map<string, string>; subjects: Map<string, string> }
/** 홈페이지·학기 학과 필터는 무겁다 (2MB · 700KB) — 한 번 가져오기와 그 뒤 표본 재확인(12번)이 같이 쓰게 6시간 기억한다. 빈 결과는 기억하지 않는다 */
const berkeleyMemo = new Map<string, { at: number; value: unknown }>();
async function remembered<T>(key: string, load: () => Promise<T>, keep: (v: T) => boolean): Promise<T> {
  const hit = berkeleyMemo.get(key);
  if (hit && Date.now() - hit.at < 6 * 3_600_000) return hit.value as T;
  const value = await load();
  if (keep(value)) berkeleyMemo.set(key, { at: Date.now(), value });
  return value;
}
/** 홈페이지 필터: 학기 라벨 → term id, 학과 이름 → subject id */
const berkeleyIndex = () => remembered('index', berkeleyIndexFresh, (x) => x.terms.size > 0);
async function berkeleyIndexFresh(): Promise<BerkeleyIndex> {
  const home = await berkeleyGet(`${BERKELEY_PUBLIC}/`);
  const label = (h: string) => text(h).replace(/\s*\(\d+\)\s*$/, '');
  const terms = new Map<string, string>();
  for (const m of home.matchAll(/href="[^"]*term%3A(\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/g)) if (!terms.has(label(m[2]))) terms.set(label(m[2]), m[1]);
  const subjects = new Map([...home.matchAll(/href="\/search\/class\?f%5B0%5D=subject_area%3A(\d+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => [label(m[2]), m[1]] as const));
  return { terms, subjects };
}
/** 한 학기 검색 결과의 학과 필터: 학과 이름 → { subject id, 그 학기 줄 수 }. 못 읽으면 빈 Map (홈페이지 학과 전부로 대신한다) */
interface BerkeleyFacets { subjects: Map<string, { id: string; count: number }>; times: { id: string; count: number }[] }
const berkeleyFacets = (termId: string) => remembered(`facets:${termId}`, () => berkeleyFacetsFresh(termId), (x) => x.subjects.size > 0);
/**
 * 한 학기 검색 결과의 필터: 학과 이름 → { subject id, 줄 수 } · 시작 시간대(8·10·12·14·16·18시) → 줄 수.
 * 못 읽으면 빈 값 (홈페이지 학과 전부를 빈 페이지가 나올 때까지 읽는다)
 */
async function berkeleyFacetsFresh(termId: string): Promise<BerkeleyFacets> {
  const out: BerkeleyFacets = { subjects: new Map(), times: [] };
  // 학기 전체 검색 첫 페이지는 무거워서 사이트가 바쁘면 504 가 잦다 — 못 읽어도 실패로 보지 않는다
  let html: string;
  try { html = await berkeleyGet(`${BERKELEY_PUBLIC}/search/class?f%5B0%5D=term%3A${termId}`); } catch (e) { console.warn(`  berkeley term ${termId} 필터 못 읽음 (${(e as Error).message}) → 홈페이지 학과 전부`); return out; }
  for (const m of html.matchAll(/<a href="[^"]*subject_area%3A(\d+)"[^>]*data-drupal-facet-item-count="(\d+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    out.subjects.set(text(m[3]).replace(/\s*\(\d+\)\s*$/, ''), { id: m[1], count: Number(m[2]) });
  }
  const times = new Map<string, number>();
  for (const m of html.matchAll(/<a href="[^"]*start_time%3A(\d+)"[^>]*data-drupal-facet-item-count="(\d+)"/g)) times.set(m[1], Number(m[2]));
  out.times = [...times].map(([id, count]) => ({ id, count }));
  return out;
}
const berkeleyTermLabels = () => process.env.BERKELEY_TERM?.split('|').map((x) => x.trim()).filter(Boolean) ?? catalogTermLabels();

/**
 * 한 학기의 강의. id 는 학기 꼬리표 붙이기 전.
 *   - 전체 가져오기: 시작 시간대 필터(6묶음)로 읽는다 — 시간이 정해진 수업만 나오므로(Fall 2026: 6,145줄 중 3,444줄) 학과별로 읽을 때의 절반 이하 요청.
 *     사이트가 바쁘면 페이지 하나에 30초씩 걸려서 요청 수가 곧 걸리는 시간이다. 시간대 필터를 못 읽으면 학과별로 읽는다
 *   - only(학과 이름들): 표본 재확인용 — 그 학과만 학과 필터로 읽는다
 * 같은 과목의 강의 섹션이 여럿이면 섹션 번호가 가장 작은 것이 기본 id, 나머지는 _<섹션> — 읽는 순서와 상관없이 같은 id 가 나온다 (표본 재확인이 학과로 다시 읽어도 맞는다)
 */
async function berkeleyTerm(idx: BerkeleyIndex, termLabel: string, only?: string[]): Promise<CatalogCourse[]> {
  const termId = idx.terms.get(termLabel);
  if (!termId) throw new Error(`classes.berkeley.edu 에 "${termLabel}" 학기가 없어요 (BERKELEY_TERM 으로 지정)`);
  const facets = await berkeleyFacets(termId);
  const subjectListing = (name: string) => {
    const sub = facets.subjects.get(name) ?? (!facets.subjects.size && idx.subjects.has(name) ? { id: idx.subjects.get(name)!, count: Infinity } : undefined);
    return sub && { label: name, query: `f%5B0%5D=subject_area%3A${sub.id}&f%5B1%5D=term%3A${termId}`, count: sub.count, dept: name };
  };
  type Listing = { label: string; query: string; count: number; dept?: string };
  const listings: Listing[] = only
    ? only.map((name) => { const l = subjectListing(name); if (!l) console.warn(`  ${termLabel} · ${name}: 이 학기 학과 필터에 없음 (건너뜀)`); return l; }).filter((l): l is NonNullable<typeof l> => !!l)
    : facets.times.length
      ? facets.times.map((t) => ({ label: `start ${t.id}:00`, query: `f%5B0%5D=term%3A${termId}&f%5B1%5D=start_time%3A${t.id}`, count: t.count }))
      : [...(facets.subjects.size ? facets.subjects.keys() : idx.subjects.keys())].map(subjectListing).filter((l): l is NonNullable<typeof l> => !!l);
  const field = (row: string, cls: string) => text(row.match(new RegExp(`class="${cls}"[^>]*>([\\s\\S]*?)</div>`))?.[1] ?? '');
  type Section = { baseId: string; sectionNo: string; course: CatalogCourse };
  /** 과목·섹션별 한 줄 (교차 개설로 두 번 나오면 시간만 합친다) */
  const sections = new Map<string, Section>();
  const merge = (list: Section[]) => {
    for (const x of list) {
      const key = `${x.baseId}#${x.sectionNo}`; const prev = sections.get(key);
      if (prev) prev.course.meetings = uniq([...prev.course.meetings, ...x.course.meetings]); else sections.set(key, x);
    }
  };
  /** 한 묶음을 끝까지 읽어 그 묶음의 섹션들을 돌려준다 */
  const read = async (l: Listing): Promise<Section[]> => {
    const mine = new Map<string, Section>();
    let seen = 0;
    for (let page = 0; page < 400 && seen < l.count; page++) {
      const html = await berkeleyPage(`${BERKELEY_PUBLIC}/search/class?${l.query}&page=${page}`);
      const rows = html.split(/<div class="views-row[^"]*">/).slice(1);
      if (!rows.length) break;
      seen += rows.length;
      for (const row of rows) {
        const component = text(row.match(/class="st--section-code"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '');
        // 검색 결과는 수업마다 대표 섹션 한 줄이다 (토론·랩 같은 딸린 섹션은 안 나온다). 대표 섹션이 랩·리시테이션인 수업(ARABIC 1A REC 등)도 수업이므로 넣고, 개별 연구(IND)만 뺀다
        if (component === 'IND') continue;
        const rawCode = text(row.match(/class="st--section-name"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '');
        if (!rawCode) continue;
        const [subj, ...num] = rawCode.split(' ');
        const subjKey = rawCode.replace(/\s+\S+$/, '');
        const code = `${BERKELEY_ABBR[subjKey] ?? BERKELEY_ABBR[subj] ?? subjKey} ${num.length ? rawCode.slice(subjKey.length).trim() : ''}`.trim();
        const title0 = text(row.match(/class="st--title"[^>]*>\s*<h2>([\s\S]*?)<\/h2>/)?.[1] ?? '');
        const title = BERKELEY_FORMERLY[code] && title0 ? `${title0} (formerly ${BERKELEY_FORMERLY[code]})` : title0;
        const contentPath = /href="(\/content\/[^"]+)"/.exec(row)?.[1];
        const sourceId = /data-history-node-id="(\d+)"/.exec(row)?.[1];
        const instructor = field(row, 'st--instructors') || undefined;
        const department = text(row.match(/offered through[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? '') || l.dept || subjKey;
        const units = Number(text(row.match(/class="st--details-unit"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '').replace(/Units:\s*/i, '').split(/[^\d.]/)[0]) || undefined;
        const meetings: Meeting[] = []; let location: string | undefined;
        for (const det of row.split(/class="st--meeting-details"/).slice(1)) {
          const days = text(det.match(/class="st--meeting-days"[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>\s*<\/div>/)?.[1] ?? '');
          const time = text(det.match(/class="st--meeting-time"[^>]*>[\s\S]*?<span>([\s\S]*?)<\/span>\s*<\/div>/)?.[1] ?? '');
          const tm = time.match(/(\d{1,2}:\d{2}\s*[ap]m)\s*-\s*(\d{1,2}:\d{2}\s*[ap]m)/i);
          if (!days || !tm) continue;
          location ||= text(det.match(/class="st--location"[^>]*>([\s\S]*?)<\/div>/)?.[1] ?? '') || undefined;
          for (const day of parseDays(days)) meetings.push({ day, start: parseTime(tm[1]), end: parseTime(tm[2]) });
        }
        if (!meetings.length) continue;
        // 강의 섹션이 여러 개인 과목(KOREAN 1A 001~007 등)은 섹션마다 한 줄 — 학생이 자기 섹션을 고른다
        const sectionNo = text(row.match(/class="st--section-count"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '') || '001';
        const baseId = courseId('s_berkeley', code);
        const key = `${baseId}#${sectionNo}`;
        const prev = mine.get(key);
        if (prev) { prev.course.meetings = uniq([...prev.course.meetings, ...meetings]); continue; }
        mine.set(key, { baseId, sectionNo, course: { id: baseId, schoolId: 's_berkeley', code, title, department, instructor, location, meetings: uniq(meetings), term: termLabel, units, url: contentPath ? `${BERKELEY_PUBLIC}${contentPath}` : undefined, sourceId } });
      }
    }
    console.log(`  ${termLabel} · ${l.label}: ${mine.size}`);
    return [...mine.values()];
  };
  /** 전체 가져오기만 중간 저장한다 (표본 재확인은 짧다) */
  const readSaved = async (l: Listing) => {
    const key = `berkeley:${termId}:${l.query}`;
    const saved = !only && checkpoint ? ((await checkpoint.load(key).catch(() => undefined)) as Section[] | undefined) : undefined;
    if (saved?.length) { console.log(`  ${termLabel} · ${l.label}: ${saved.length} (saved earlier)`); merge(saved); return; }
    const got = await read(l);
    if (!only && checkpoint) await checkpoint.save(key, structuredClone(got)).catch((e) => console.warn(`  checkpoint save failed: ${(e as Error).message}`));
    merge(got);
  };
  const failed: Listing[] = [];
  // 묶음 몇 개를 나란히 읽는다 (BERKELEY_LANES, 기본 3) — 묶음 안의 페이지는 하나씩, 요청마다 쉬는 것도 그대로. 페이지 하나에 30~40초 걸려 한 줄로는 몇 시간이 걸린다
  const lanes = Math.max(1, Math.min(Number(process.env.BERKELEY_LANES ?? 3) || 1, listings.length));
  let next = 0;
  await Promise.all(Array.from({ length: lanes }, async () => {
    while (next < listings.length) {
      const l = listings[next++];
      try { await readSaved(l); } catch (e) { console.warn(`  ${termLabel} · ${l.label}: ${(e as Error).message} — 끝에 한 번 더`); failed.push(l); }
    }
  }));
  // 사이트가 오래 바빠(504) 못 읽은 묶음은 1분 쉬었다가 한 번 더. 그래도 안 되면 이번 가져오기는 실패로 끝낸다 — 한 묶음이 통째로 빠진 목록을 반영하지 않는다
  if (failed.length) {
    await new Promise((res) => setTimeout(res, 60_000));
    for (const l of failed) await readSaved(l);
  }
  // id: 섹션 번호가 가장 작은 섹션이 기본 id. 강의 섹션이 둘 이상이면 제목에 섹션 번호를 붙여 구분한다
  const byBase = new Map<string, { baseId: string; sectionNo: string; course: CatalogCourse }[]>();
  for (const x of sections.values()) (byBase.get(x.baseId) ?? byBase.set(x.baseId, []).get(x.baseId)!).push(x);
  const out: CatalogCourse[] = [];
  for (const group of byBase.values()) {
    group.sort((a, b) => a.sectionNo.localeCompare(b.sectionNo, 'en', { numeric: true }));
    group.forEach((x, i) => {
      x.course.id = i === 0 ? x.baseId : `${x.baseId}_${x.sectionNo}`;
      if (group.length > 1) x.course.title = `${x.course.title} (Lec ${x.sectionNo})`;
      out.push(x.course);
    });
  }
  console.log(`  berkeley ${termLabel}: ${listings.length} listings, ${out.length} lectures`);
  return out;
}

async function berkeleyPublic(): Promise<CatalogCourse[]> {
  const idx = await berkeleyIndex();
  const subjects = process.env.BERKELEY_PUBLIC_SUBJECTS?.split('|').map((x) => x.trim()).filter(Boolean);
  const [first, ...rest] = berkeleyTermLabels();
  const out = tagTerm(await berkeleyTerm(idx, first, subjects), first);
  for (const label of rest) {
    // 다음 학기 시간표는 학교가 올린 뒤에야 있다 — 없으면 이번에는 지금 학기만
    if (!idx.terms.has(label)) { console.warn(`  berkeley: "${label}" 은 아직 공개 전 (건너뜀)`); continue; }
    out.push(...tagTerm(await berkeleyTerm(idx, label, subjects), label));
  }
  return out;
}

// ─── Berkeley: SIS Class API (키 필요) ───────────────────────────────────────
async function berkeley(): Promise<CatalogCourse[]> {
  const { BERKELEY_APP_ID: id, BERKELEY_APP_KEY: key, BERKELEY_TERM_ID: termId } = process.env;
  if (!id || !key || !termId) { console.log('  SIS API 키 없음 → 공개 시간표(classes.berkeley.edu) 사용'); return berkeleyPublic(); }
  const subjects = (process.env.BERKELEY_SUBJECTS ?? 'COMPSCI,EECS,DATA,MATH,STAT,ECON,UGBA,PSYCH,BIOLOGY,CHEM,PHYSICS,POLSCI,HISTORY,ENGLISH,SOCIOL,ART,MUSIC').split(',');
  const out: CatalogCourse[] = [];
  for (const subj of subjects) {
    for (let page = 1; ; page++) {
      const url = `https://gateway.api.berkeley.edu/sis/v1/classes/sections?term-id=${termId}&subject-area-code=${encodeURIComponent(subj)}&page-number=${page}&page-size=100`;
      const res = await fetch(url, { headers: { app_id: id, app_key: key, accept: 'application/json' } });
      if (res.status === 404) break;
      if (!res.ok) throw new Error(`${url} → ${res.status}`);
      const data = (await res.json()) as { apiResponse?: { response?: { classSections?: Record<string, unknown>[] } } };
      const sections = data.apiResponse?.response?.classSections ?? [];
      for (const s of sections as { component?: { code?: string }; class?: { course?: { displayName?: string; title?: string; subjectArea?: { description?: string } }; number?: string }; meetings?: { meetsDays?: string; startTime?: string; endTime?: string; location?: { description?: string }; assignedInstructors?: { instructor?: { names?: { formattedName?: string }[] } }[] }[] }[]) {
        if (s.component?.code && s.component.code !== 'LEC') continue;
        const code = s.class?.course?.displayName; if (!code) continue;
        const meetings: Meeting[] = []; let location: string | undefined; let instructor: string | undefined;
        for (const m of s.meetings ?? []) {
          if (!m.meetsDays || !m.startTime || !m.endTime) continue;
          location ||= m.location?.description; instructor ||= m.assignedInstructors?.[0]?.instructor?.names?.[0]?.formattedName;
          for (const day of parseDays(m.meetsDays)) meetings.push({ day, start: m.startTime.slice(0, 5), end: m.endTime.slice(0, 5) });
        }
        if (!meetings.length) continue;
        const cid = courseId('s_berkeley', code);
        const prev = out.find((c) => c.id === cid);
        if (prev) { prev.meetings = uniq([...prev.meetings, ...meetings]); continue; }
        out.push({ id: cid, schoolId: 's_berkeley', code, title: s.class?.course?.title ?? '', department: s.class?.course?.subjectArea?.description ?? subj, instructor, location, meetings: uniq(meetings), term: termId });
      }
      if (sections.length < 100) break;
    }
    console.log(`  ${subj}: ${out.length}`);
  }
  return out;
}

// ─── Cornell: Class Roster 공개 JSON API (키 불필요) ───────────────────────
/**
 * 학기 slug(FA26 / SP27): 지금 학기 + 다음 학기(공개됐으면). 지금 학기가 아직 없으면 공개된 것 중 가장 최근 정규 학기(FA/SP) 하나 — 안 올라온 학기를 추측하지 않는다.
 * CORNELL_ROSTER="FA26,SP27" 로 지정 가능
 */
async function cornellRosters(): Promise<string[]> {
  if (process.env.CORNELL_ROSTER) return process.env.CORNELL_ROSTER.split(',').map((x) => x.trim()).filter(Boolean);
  const res = await fetch('https://classes.cornell.edu/api/2.0/config/rosters.json', { headers: { 'user-agent': 'AroundU-importer' } });
  if (!res.ok) throw new Error(`cornell rosters → ${res.status}`);
  const rosters = ((await res.json()) as { data?: { rosters?: { slug: string }[] } }).data?.rosters?.map((r) => r.slug) ?? [];
  const regular = rosters.filter((r) => /^(FA|SP)\d{2}$/.test(r));
  if (!regular.length) throw new Error('cornell: no FA/SP roster published');
  const slug = (t: { season: string; year: number }) => `${t.season === 'Fall' ? 'FA' : 'SP'}${String(t.year).slice(2)}`;
  const cur = currentTerm(); const want = slug(cur); const after = slug(nextTerm(cur));
  if (!regular.includes(want)) return [regular[regular.length - 1]];
  return regular.includes(after) ? [want, after] : [want];
}
interface CornellClass { subject: string; catalogNbr: string; titleLong: string; enrollGroups: { unitsMinimum?: number; classSections: { ssrComponent: string; section: string; meetings: { timeStart?: string; timeEnd?: string; pattern?: string; facilityDescr?: string | null; bldgDescr?: string | null; instructors?: { firstName?: string; lastName?: string }[] }[] }[] }[] }
async function cornellSubject(roster: string, subject: string): Promise<CatalogCourse[]> {
  const res = await fetch(`https://classes.cornell.edu/api/2.0/search/classes.json?roster=${roster}&subject=${encodeURIComponent(subject)}`, { headers: { 'user-agent': 'AroundU-importer' } });
  if (!res.ok) return [];
  const data = (await res.json()) as { data?: { classes?: CornellClass[] } };
  const out: CatalogCourse[] = []; const seen = new Set<string>();
  for (const c of data.data?.classes ?? []) {
    const code = `${c.subject} ${c.catalogNbr}`; const baseId = courseId('s_cornell', code);
    const lectures = c.enrollGroups.flatMap((g) => g.classSections.filter((sec) => sec.ssrComponent === 'LEC').map((sec) => ({ g, sec })));
    const picked = lectures.length ? lectures : c.enrollGroups.flatMap((g) => g.classSections.slice(0, 1).map((sec) => ({ g, sec })));
    for (const { g, sec } of picked) {
      const meetings: Meeting[] = []; let location: string | undefined; let instructor: string | undefined;
      for (const m of sec.meetings) {
        if (!m.pattern || !m.timeStart || !m.timeEnd) continue;
        location ||= [m.bldgDescr, m.facilityDescr].filter(Boolean).join(' ') || undefined;
        instructor ||= m.instructors?.[0] ? `${m.instructors[0].firstName ?? ''} ${m.instructors[0].lastName ?? ''}`.trim() : undefined;
        for (const day of parseDays(m.pattern)) meetings.push({ day, start: parseTime(m.timeStart), end: parseTime(m.timeEnd) });
      }
      if (!meetings.length) continue;
      const id = seen.has(baseId) ? `${baseId}_${sec.section}` : baseId;
      if (seen.has(id)) continue; seen.add(id);
      out.push({ id, schoolId: 's_cornell', code, title: seen.size > 1 && id !== baseId ? `${c.titleLong} (Lec ${sec.section})` : c.titleLong, department: c.subject, instructor, location, meetings: uniq(meetings), term: normalizeTermLabel(roster), termCode: roster, units: g.unitsMinimum, url: `https://classes.cornell.edu/browse/roster/${roster}/class/${c.subject}/${c.catalogNbr}` });
    }
  }
  // 섹션이 둘 이상인 과목은 첫 섹션 제목에도 번호를 붙인다
  for (const c of out) if (out.some((o) => o.id.startsWith(`${c.id}_`))) c.title = `${c.title} (Lec 001)`;
  return out;
}
async function cornell(): Promise<CatalogCourse[]> {
  const all: CatalogCourse[] = [];
  for (const roster of await cornellRosters()) {
    const res = await fetch(`https://classes.cornell.edu/api/2.0/config/subjects.json?roster=${roster}`, { headers: { 'user-agent': 'AroundU-importer' } });
    if (!res.ok) throw new Error(`cornell subjects ${roster} → ${res.status}`);
    const subjects = ((await res.json()) as { data?: { subjects?: { value: string }[] } }).data?.subjects?.map((s) => s.value) ?? [];
    const out: CatalogCourse[] = [];
    for (const subj of subjects) { out.push(...(await cornellSubject(roster, subj))); await new Promise((r) => setTimeout(r, 120)); }
    console.log(`  cornell ${roster}: ${subjects.length} subjects, ${out.length} lectures`);
    all.push(...tagTerm(out, normalizeTermLabel(roster)));
  }
  return all;
}
async function cornellLookup(c: CatalogCourse): Promise<CatalogCourse | null> {
  const roster = c.termCode ?? c.term;
  return tagTerm(await cornellSubject(roster, c.department), normalizeTermLabel(roster)).find((x) => x.id === c.id) ?? null;
}

// ─── Maryland: Testudo Schedule of Classes (공개 HTML, 키 불필요) ────────────
const UMD = 'https://app.testudo.umd.edu/soc';
const umdText = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
async function umdGet(url: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try { const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 AroundU-importer' } }); if (r.ok) return await r.text(); if (r.status < 500 || attempt >= 3) throw new Error(`${url} → ${r.status}`); }
    catch (e) { if (attempt >= 3) throw e; }
    await new Promise((res) => setTimeout(res, 2000 * 2 ** attempt));
  }
}
/** 학기 id (202608 = Fall 2026, 202701 = Spring 2027): 진행 중인 학기 (@core/lib/terms) */
function umdTerm(): string { if (process.env.UMD_TERM) return process.env.UMD_TERM; const c = currentTerm(); return `${c.year}${c.season === 'Spring' ? '01' : '08'}`; }
/** 202608 → "Fall 2026" */
const umdLabel = (code: string) => { const m = /^(\d{4})(\d{2})$/.exec(code); const season = m && ({ '01': 'Spring', '05': 'Summer', '08': 'Fall', '12': 'Winter' } as Record<string, string>)[m[2]]; return m && season ? `${season} ${m[1]}` : code; };
function umdParseSections(html: string, term: string, titles: Map<string, { title: string; units?: number }>): CatalogCourse[] {
  const out: CatalogCourse[] = []; const seen = new Set<string>();
  // 과목 묶음: <div id="CMSC131" class="course-sections"> … 다음 묶음 전까지
  const heads = [...html.matchAll(/<div id="([A-Z]{4}\d{3}[A-Z]{0,2})" class="course-sections">/g)];
  for (let h = 0; h < heads.length; h++) {
    const courseCode = heads[h][1];
    const courseHtml = html.slice(heads[h].index!, heads[h + 1]?.index ?? html.length);
    for (const secHtml of courseHtml.split(/<div class="section delivery-[^"]*"|<div class="section">/).slice(1)) {
      const sectionNo = umdText(/class="section-id">([\s\S]*?)<\/span>/.exec(secHtml)?.[1] ?? '');
      const instructor = umdText(/class="section-instructor">([\s\S]*?)<\/span>/.exec(secHtml)?.[1] ?? '') || undefined;
      const meetings: Meeting[] = []; let location: string | undefined;
      for (const row of secHtml.split(/<div class="row">/).slice(1)) {
        if (/class="class-type">/.test(row)) continue; // Discussion / Lab 은 시간표에 넣지 않는다
        const days = umdText(/class="section-days">([\s\S]*?)<\/span>/.exec(row)?.[1] ?? '');
        const st = umdText(/class="class-start-time">([\s\S]*?)<\/span>/.exec(row)?.[1] ?? ''); const en = umdText(/class="class-end-time">([\s\S]*?)<\/span>/.exec(row)?.[1] ?? '');
        if (!days || !st || !en) continue;
        const bld = umdText(/class="building-code">([\s\S]*?)<\/span>/.exec(row)?.[1] ?? ''); const room = umdText(/class="class-room">([\s\S]*?)<\/span>/.exec(row)?.[1] ?? '');
        location ||= [bld, room].filter(Boolean).join(' ') || undefined;
        try { for (const day of parseDays(days)) meetings.push({ day, start: parseTime(st), end: parseTime(en) }); } catch { /* skip odd time text */ }
      }
      if (!meetings.length) continue;
      const baseId = courseId('s_umd', courseCode);
      const id = seen.has(baseId) ? `${baseId}_${sectionNo}` : baseId;
      if (seen.has(id)) continue; seen.add(id);
      const t = titles.get(courseCode);
      out.push({ id, schoolId: 's_umd', code: courseCode, title: t?.title ?? courseCode, department: courseCode.slice(0, 4), instructor, location, meetings: uniq(meetings), term: umdLabel(term), termCode: term, units: t?.units, url: `${UMD}/${term}/${courseCode.slice(0, 4)}/${courseCode}` });
    }
  }
  for (const c of out) if (out.some((o) => o.id.startsWith(`${c.id}_`))) c.title = `${c.title} (Sec 0101)`;
  for (const c of out) { const m = /_(\d{4})$/.exec(c.id); if (m) c.title = `${c.title} (Sec ${m[1]})`; }
  return out;
}
async function umd(): Promise<CatalogCourse[]> {
  const term = umdTerm();
  const home = await umdGet(`${UMD}/`);
  const depts = [...new Set([...home.matchAll(/class="prefix-abbrev[^"]*">([A-Z]{4})<\/span>/g)].map((m) => m[1]))];
  if (!depts.length) throw new Error('umd: no departments on the schedule page');
  const out: CatalogCourse[] = [];
  for (const dept of depts) {
    // 검색 폼의 필드가 다 있어야 결과를 준다 (빠지면 빈 폼 페이지가 온다)
    const list = await umdGet(`${UMD}/search?courseId=${dept}&sectionId=&termId=${term}&_openSectionsOnly=on&creditCompare=&credits=&courseLevelFilter=ALL&instructor=&_facetoface=on&_blended=on&_online=on&courseStartCompare=&courseStartHour=&courseStartMin=&courseStartAM=&courseEndHour=&courseEndMin=&courseEndAM=&teachingCenter=ALL&_classDay1=on&_classDay2=on&_classDay3=on&_classDay4=on&_classDay5=on`);
    const titles = new Map<string, { title: string; units?: number }>();
    for (const m of list.matchAll(/class="course-id">\s*([A-Z]{4}\d{3}[A-Z]{0,2})\s*<[\s\S]*?class="course-title">([\s\S]*?)<\/span>[\s\S]*?class="course-min-credits">\s*(\d+)/g)) titles.set(m[1], { title: umdText(m[2]), units: Number(m[3]) || undefined });
    const ids = [...titles.keys()];
    for (let i = 0; i < ids.length; i += 20) {
      const html = await umdGet(`${UMD}/${term}/sections?courseIds=${ids.slice(i, i + 20).join(',')}`);
      out.push(...umdParseSections(html, term, titles));
      await new Promise((r) => setTimeout(r, 150));
    }
  }
  console.log(`  umd ${term}: ${depts.length} departments, ${out.length} lectures`);
  return out;
}
async function umdLookup(c: CatalogCourse): Promise<CatalogCourse | null> {
  const term = c.termCode ?? c.term;
  const html = await umdGet(`${UMD}/${term}/sections?courseIds=${c.code}`);
  return umdParseSections(html, term, new Map([[c.code, { title: c.title.replace(/ \(Sec \d{4}\)$/, ''), units: c.units }]])).find((x) => x.id === c.id) ?? null;
}

// ─── 플랫폼 어댑터: 학교마다 호스트만 다르고 API 가 같은 제품들 ──────────────
// schools.csv 의 courses_source 에 "fose:https://courses.upenn.edu" / "banner9:https://registrationssb.ucr.edu" 처럼 적는다
const UAH = { 'user-agent': 'Mozilla/5.0 AroundU-importer' };
const hhmm = (raw: string) => { const t = raw.trim().padStart(4, '0'); return `${t.slice(0, 2)}:${t.slice(2, 4)}`; };
/** 원본 학기 설명("Fall Semester 2026", "2026 Fall")에서 "Fall 2026" 라벨을 뽑는다. 못 뽑으면 설명 그대로 */
function labelOf(desc: string): string {
  const season = /(Spring|Summer|Fall|Winter|Autumn)/i.exec(desc)?.[1]; const year = /(20\d{2})/.exec(desc)?.[1];
  return season && year ? `${season[0].toUpperCase()}${season.slice(1).toLowerCase()} ${year}` : desc.trim();
}
/** 원본 학기 목록에서 라벨("Fall 2026")에 맞는 것 */
function findTerm<T>(terms: T[], label: (t: T) => string, want: string): T | undefined {
  return terms.find((t) => labelOf(label(t)) === want);
}
/** 지금 학기(날짜 기준, @core/lib/terms). 원본에 없으면 봄·가을 중 첫 것 */
function pickTerm<T>(terms: T[], label: (t: T) => string): T | undefined {
  return findTerm(terms, label, catalogTermLabels()[0]) ?? terms.find((t) => /fall|spring/i.test(label(t))) ?? terms[0];
}

// Fose (CourseLeaf Section Scheduler 공개 검색: courses.upenn.edu, classsearch.nd.edu, courses.dartmouth.edu …)
interface FoseRow { code: string; title: string; crn: string; no: string; schd: string; meetingTimes?: string; instr?: string; srcdb: string }
async function fosePost(host: string, route: string, body: unknown): Promise<unknown> {
  const r = await fetch(`${host}/api/?page=fose&route=${route}`, { method: 'POST', headers: { ...UAH, 'content-type': 'application/x-www-form-urlencoded' }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${host} fose ${route} → ${r.status}`);
  const text = await r.text(); if (!text.trim()) throw new Error(`${host} fose ${route} → empty body (bot check?)`);
  return JSON.parse(text);
}
function foseSource(schoolId: string, host: string): CourseSource {
  /**
   * 지금 학기 + 다음 학기 (원본 코드 + "Fall 2026" 라벨). 다음 학기 = 목록에서 지금 학기 바로 뒤의 정규 학기(여름 제외 — 쿼터제 Dartmouth 는 Winter).
   * 아직 안 올라왔으면 지금 학기만. FOSE_SRCDB="202610,202620" 로 지정 가능
   */
  async function terms(): Promise<{ code: string; label: string }[]> {
    const html = await (await fetch(`${host}/`, { headers: UAH })).text();
    const opts = [...html.matchAll(/<option value="(\d{4,6})"[^>]*>([^<]+)<\/option>/g)].map((m) => ({ code: m[1], label: m[2].trim() }));
    if (process.env.FOSE_SRCDB) return process.env.FOSE_SRCDB.split(',').map((code) => code.trim()).filter(Boolean).map((code) => { const o = opts.find((x) => x.code === code); return { code, label: o ? labelOf(o.label) : code }; });
    const t = pickTerm(opts, (o) => o.label); if (!t) throw new Error(`${host}: no term options on index page`);
    const now = termOrder(labelOf(t.label));
    const after = opts.filter((o) => !/summer/i.test(o.label) && termOrder(labelOf(o.label)) > now && termOrder(labelOf(o.label)) !== Number.MAX_SAFE_INTEGER)
      .sort((a, b) => termOrder(labelOf(a.label)) - termOrder(labelOf(b.label)))[0];
    return [{ code: t.code, label: labelOf(t.label) }, ...(after ? [{ code: after.code, label: labelOf(after.label) }] : [])];
  }
  function rowsToCourses(rows: FoseRow[], srcdb: string, label: string = srcdb): CatalogCourse[] {
    const byCourse = new Map<string, FoseRow[]>();
    for (const r of rows) { if (!r.code || !r.meetingTimes) continue; (byCourse.get(r.code) ?? byCourse.set(r.code, []).get(r.code)!).push(r); }
    const out: CatalogCourse[] = [];
    for (const [code, secs] of byCourse) {
      const lectures = secs.filter((x) => /^LEC|^SEM|^LAB$/.test(x.schd) && !/^LAB$/.test(x.schd)); const picked = lectures.length ? lectures : secs.slice(0, 1);
      const baseId = courseId(schoolId, code);
      picked.forEach((sec, i) => {
        let mts: { meet_day: string; start_time: string; end_time: string }[] = [];
        try { mts = JSON.parse(sec.meetingTimes!) as typeof mts; } catch { return; }
        const meetings = uniq(mts.filter((m) => m.start_time && m.end_time).map((m) => ({ day: Number(m.meet_day), start: hhmm(m.start_time), end: hhmm(m.end_time) })));
        if (!meetings.length) return;
        out.push({ id: i === 0 ? baseId : `${baseId}_${sec.no}`, schoolId, code, title: picked.length > 1 ? `${sec.title} (Sec ${sec.no})` : sec.title, department: code.replace(/\s?\d.*$/, ''), instructor: sec.instr?.replace(/\//g, ', ') || undefined, meetings, term: label, termCode: srcdb, url: `${host}/?details&srcdb=${srcdb}&code=${encodeURIComponent(code)}` });
      });
    }
    return out;
  }
  async function search(srcdb: string, criteria: unknown[]): Promise<FoseRow[]> {
    const d = (await fosePost(host, 'search', { other: { srcdb }, criteria })) as { results?: FoseRow[] };
    return d.results ?? [];
  }
  return {
    schoolId,
    async fetch() {
      const all: CatalogCourse[] = [];
      for (const { code: srcdb, label } of await terms()) {
      // 빈 조건으로 전부 받아 보고, 안 주면 글자별 키워드로 나눠 받아 crn 으로 합친다
      let rows = await search(srcdb, []);
      if (rows.length < 50) { const seen = new Map<string, FoseRow>(); for (const k of 'abcdefghijklmnopqrstuvwxyz') { for (const r of await search(srcdb, [{ field: 'keyword', value: k }])) seen.set(r.crn, r); await new Promise((res) => setTimeout(res, 120)); } rows = [...seen.values()]; }
      const courses = rowsToCourses(rows, srcdb, label);
      // 강의실: 섹션마다 details 한 번 (" in <a>ROOM</a>")
      const crnByCourseSec = new Map(rows.map((r) => [`${r.code}#${r.no}`, r.crn]));
      for (const c of courses) {
        const no = /_(\w+)$/.exec(c.id)?.[1] ?? rows.find((r) => r.code === c.code && r.meetingTimes)?.no; const crn = crnByCourseSec.get(`${c.code}#${no}`); if (!crn) continue;
        try {
          const d = (await fosePost(host, 'details', { group: `code:${c.code}`, key: `crn:${crn}`, srcdb, matched: `crn:${crn}` })) as { meeting_html?: string; syllabus?: string };
          const room = / in <a[^>]*>([^<]+)<\/a>/.exec(d.meeting_html ?? '')?.[1] ?? / in ([^<]+)</.exec(d.meeting_html ?? '')?.[1]; if (room) c.location = room.trim();
          const syl = /href="([^"]+)"/.exec(d.syllabus ?? '')?.[1]; if (syl) c.syllabusUrl = new URL(syl, host).href;
        } catch { /* no room */ }
        await new Promise((res) => setTimeout(res, 80));
      }
      console.log(`  ${schoolId} fose ${srcdb} (${label}): ${rows.length} sections → ${courses.length} lectures`);
      all.push(...tagTerm(courses, label));
      }
      return all;
    },
    async lookup(c) { const srcdb = c.termCode ?? c.term; const rows = await search(srcdb, [{ field: 'keyword', value: c.code }]); return tagTerm(rowsToCourses(rows.filter((r) => r.code === c.code), srcdb, c.term), c.term).find((x) => x.id === c.id) ?? null; },
  };
}

// Banner 9 (Ellucian StudentRegistrationSsb 공개 검색: registrationssb.ucr.edu …)
const decodeEntities = (x: string) => decodeNumericEntities(x.replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')).replace(/&amp;/g, '&').trim();
interface B9Section { subject: string; subjectDescription?: string; courseNumber: string; courseTitle: string; sequenceNumber: string; scheduleTypeDescription?: string; creditHours?: number; creditHourLow?: number; faculty?: { displayName?: string }[]; meetingsFaculty?: { meetingTime?: { beginTime?: string; endTime?: string; monday?: boolean; tuesday?: boolean; wednesday?: boolean; thursday?: boolean; friday?: boolean; saturday?: boolean; sunday?: boolean; building?: string; room?: string; meetingType?: string } }[] }
function banner9Source(schoolId: string, host: string): CourseSource {
  const H = `${host}/StudentRegistrationSsb/ssb`;
  let cookie = '';
  // 리다이렉트 중간 응답에서도 세션 쿠키를 받는 학교가 있어(UC Merced) 리다이렉트를 직접 따라가며 쿠키를 모은다
  const keep = (r: Response) => { const set = r.headers.getSetCookie?.() ?? []; if (!set.length) return; const jar = new Map(cookie.split('; ').filter(Boolean).map((c) => [c.split('=')[0], c] as const)); for (const c of set) { const kv = c.split(';')[0]; jar.set(kv.split('=')[0], kv); } cookie = [...jar.values()].join('; '); };
  async function call(path: string, init: RequestInit = {}): Promise<Response> {
    let url = path.startsWith('http') ? path : `${H}${path}`; let req: RequestInit = init;
    for (let hop = 0; hop < 6; hop++) {
      const r = await fetch(url, { ...req, redirect: 'manual', headers: { ...UAH, ...(cookie ? { cookie } : {}), ...(req.headers ?? {}) } });
      keep(r);
      const loc = r.headers.get('location');
      if (r.status >= 300 && r.status < 400 && loc) { url = new URL(loc, url).href; req = {}; continue; }
      return r;
    }
    throw new Error(`${host}: too many redirects`);
  }
  async function json<T>(path: string): Promise<T> {
    const r = await call(path); const text = await r.text();
    try { return JSON.parse(text) as T; } catch { throw new Error(`${host}${path.split('?')[0]} → not JSON (${r.status}): ${text.slice(0, 80)}`); }
  }
  /** 지금 학기 + 다음 학기 (원본 코드·라벨). 다음 학기가 아직 안 열렸으면 지금 학기만. BANNER_TERM="202630,202710" 으로 지정 가능 */
  async function terms(): Promise<{ code: string; label: string }[]> {
    const all = await json<{ code: string; description: string }[]>('/classSearch/getTerms?offset=1&max=20');
    const toTerm = (t: { code: string; description: string }) => ({ code: t.code, label: labelOf(t.description) });
    if (process.env.BANNER_TERM) return process.env.BANNER_TERM.split(',').map((code) => code.trim()).filter(Boolean).map((code) => toTerm(all.find((t) => t.code === code) ?? { code, description: code }));
    const regular = all.filter((x) => !/summer|winter/i.test(x.description));
    const [cur, next] = catalogTermLabels();
    const now = findTerm(regular, (x) => x.description, cur) ?? pickTerm(regular, (x) => x.description) ?? all[0]; if (!now) throw new Error(`${host}: no terms`);
    const after = findTerm(regular, (x) => x.description, next);
    return [toTerm(now), ...(after && after.code !== now.code ? [toTerm(after)] : [])];
  }
  function toCourses(secs: B9Section[], termCode: string, label: string = termCode): CatalogCourse[] {
    const out: CatalogCourse[] = []; const seen = new Set<string>();
    for (const s of secs) {
      if (s.scheduleTypeDescription && !/lecture|seminar|lecture\/discussion/i.test(s.scheduleTypeDescription)) continue;
      const code = `${s.subject} ${s.courseNumber.replace(/^0+(?=\d)/, '')}`; const baseId = courseId(schoolId, code);
      const meetings: Meeting[] = []; let location: string | undefined;
      for (const mf of s.meetingsFaculty ?? []) {
        const m = mf.meetingTime; if (!m?.beginTime || !m.endTime) continue;
        location ||= [m.building, m.room].filter(Boolean).join(' ') || undefined;
        const days = [m.monday, m.tuesday, m.wednesday, m.thursday, m.friday, m.saturday, m.sunday];
        days.forEach((on, day) => { if (on) meetings.push({ day, start: hhmm(m.beginTime!), end: hhmm(m.endTime!) }); });
      }
      if (!meetings.length) continue;
      const id = seen.has(baseId) ? `${baseId}_${s.sequenceNumber}` : baseId; if (seen.has(id)) continue; seen.add(id);
      out.push({ id, schoolId, code, title: decodeEntities(s.courseTitle), department: s.subjectDescription ? decodeEntities(s.subjectDescription) : s.subject, instructor: s.faculty?.[0]?.displayName, location, meetings: uniq(meetings), term: label, termCode, units: s.creditHours ?? s.creditHourLow, url: `${H}/classSearch/classSearch` });
    }
    for (const c of out) if (out.some((o) => o.id.startsWith(`${c.id}_`))) c.title = `${c.title} (Sec 001)`;
    for (const c of out) { const m = /_(\d{3})$/.exec(c.id); if (m) c.title = `${c.title} (Sec ${m[1]})`; }
    return tagTerm(out, label);
  }
  async function searchSubject(termCode: string, subject: string): Promise<B9Section[]> {
    await call('/classSearch/resetDataForm', { method: 'POST' });
    await call('/term/search?mode=search', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `term=${termCode}&studyPath=&studyPathText=&startDatepicker=&endDatepicker=` });
    const all: B9Section[] = [];
    for (let offset = 0; offset < 5000; offset += 500) {
      const d = await json<{ data?: B9Section[]; totalCount?: number }>(`/searchResults/searchResults?txt_term=${termCode}&txt_subject=${encodeURIComponent(subject)}&pageOffset=${offset}&pageMaxSize=500&sortColumn=subjectDescription&sortDirection=asc`);
      all.push(...(d.data ?? [])); if ((d.data?.length ?? 0) < 500) break;
    }
    return all;
  }
  return {
    schoolId,
    async fetch() {
      const out: CatalogCourse[] = [];
      for (const { code: termCode, label } of await terms()) {
        await call('/term/search?mode=search', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `term=${termCode}&studyPath=&studyPathText=&startDatepicker=&endDatepicker=` });
        await call('/classSearch/classSearch');
        const subjects = await json<{ code: string }[]>(`/classSearch/get_subject?searchTerm=&term=${termCode}&offset=1&max=500`);
        const before = out.length;
        for (const sub of subjects) { out.push(...toCourses(await searchSubject(termCode, sub.code), termCode, label)); await new Promise((r) => setTimeout(r, 120)); }
        console.log(`  ${schoolId} banner9 ${termCode} (${label}): ${subjects.length} subjects → ${out.length - before} lectures`);
      }
      return out;
    },
    // department 에는 학과 이름이 들어가므로 과목 코드 앞부분(예: CSE)으로 다시 찾는다
    async lookup(c) { const termCode = c.termCode ?? c.term; return toCourses(await searchSubject(termCode, c.code.split(' ')[0]), termCode, c.term).find((x) => x.id === c.id) ?? null; },
  };
}


// ─── PeopleSoft Campus Solutions "HCX" 공개 수업 검색 (Duke DukeHub, BU, UVA …) ─────────────────────
// <base>/s/WEBLIB_HCX_CM.H_CLASS_SEARCH.FieldFormula.IScript_ClassSearchOptions?institution=X → 학기·과목 목록
// <base>/s/WEBLIB_HCX_CM.H_CLASS_SEARCH.FieldFormula.IScript_ClassSearch?institution=X&term=T&subject=S&page=N → classes[] (100개씩, pageCount)
// 처음 요청에 손님 쿠키를 주며 같은 주소로 돌려보낸다 — 쿠키를 들고 따라간다. 학부·대학원(acad_career GRAD) 모두 온다.
export interface HcxClass { strm: string; class_section: string; component: string; subject: string; subject_descr?: string; catalog_nbr: string; descr: string; acad_career?: string; units?: string; class_nbr?: number;
  instructors?: { name?: string }[]; meetings?: { days?: string; start_time?: string; end_time?: string; facility_descr?: string; bldg_cd?: string; room?: string }[] }
const HCX_SECONDARY = /^(DIS|LAB|REC|DRS|TUT|QUI|QUZ)$/;
const HCX_DAY: Record<string, number> = { Mo: 0, Tu: 1, We: 2, Th: 3, Fr: 4, Sa: 5, Su: 6 };
/** "13.25.00.000000" → "13:25" */
const hcxTime = (t?: string) => { const m = /^(\d{1,2})[.:](\d{2})/.exec(t ?? ''); return m ? `${m[1].padStart(2, '0')}:${m[2]}` : ''; };
export function hcxToCourses(schoolId: string, classes: HcxClass[], termCode: string, label: string, url: string): CatalogCourse[] {
  const out: CatalogCourse[] = []; const seen = new Set<string>(); const secOf = new Map<string, string>();
  for (const s of classes) {
    // 토론·랩·리시테이션·튜토리얼은 학생이 고르는 딸린 섹션 — 뺀다. 그 밖의 유형은 수업 본 시간
    // (BU 는 대부분의 정규 수업이 “IND” 로 온다: CASEN 107 The Voice of Poetry, 화. 강의·세미나만 남겼더니 가을 452개뿐이었다)
    if (HCX_SECONDARY.test(s.component)) continue;
    const code = `${s.subject} ${s.catalog_nbr.trim()}`; const baseId = courseId(schoolId, code);
    const meetings: Meeting[] = []; let location: string | undefined;
    for (const m of s.meetings ?? []) {
      const start = hcxTime(m.start_time), end = hcxTime(m.end_time); if (!m.days || !start || !end || start === '00:00') continue;
      if (m.facility_descr && !/^\*+$|TBA/i.test(m.facility_descr)) location ||= m.facility_descr;
      for (const d of m.days.match(/Mo|Tu|We|Th|Fr|Sa|Su/g) ?? []) meetings.push({ day: HCX_DAY[d], start, end });
    }
    if (!meetings.length) continue;
    const id = seen.has(baseId) ? `${baseId}_${s.class_section.toLowerCase()}` : baseId; if (seen.has(id)) continue; seen.add(id); secOf.set(id, s.class_section);
    const instructor = s.instructors?.map((i) => i.name).find((n) => n && !/^\*+$|staff/i.test(n));
    out.push({ id, schoolId, code, title: s.descr, department: s.subject_descr ?? s.subject, instructor, location, meetings: uniq(meetings), term: label, termCode, units: s.units ? Number(s.units) || undefined : undefined, url });
  }
  // 같은 과목에 강의 섹션이 여럿이면 제목에 섹션을 붙여 구분한다
  for (const c of out) if (out.filter((o) => o.code === c.code).length > 1) c.title = `${c.title} (Sec ${secOf.get(c.id)})`;
  return tagTerm(out, label);
}
function hcxSource(schoolId: string, base: string, institution: string): CourseSource {
  const S = `${base}/s/WEBLIB_HCX_CM.H_CLASS_SEARCH.FieldFormula`;
  let cookie = '';
  const keep = (r: Response) => { const set = r.headers.getSetCookie?.() ?? []; if (!set.length) return; const jar = new Map(cookie.split('; ').filter(Boolean).map((c) => [c.split('=')[0], c] as const)); for (const c of set) { const kv = c.split(';')[0]; jar.set(kv.split('=')[0], kv); } cookie = [...jar.values()].join('; '); };
  async function json<T>(url: string, fresh = false): Promise<T> {
    const start = url;
    for (let hop = 0; hop < 6; hop++) {
      const r = await fetch(url, { redirect: 'manual', headers: { ...UAH, accept: 'application/json', ...(cookie ? { cookie } : {}) } }); keep(r);
      const loc = r.headers.get('location');
      if (r.status >= 300 && r.status < 400 && loc) {
        // 손님 세션이 끝나면 로그인 화면으로 보낸다 — 쿠키를 버리고 새 손님으로 한 번 더
        if (/login|signon|cmd=login/i.test(loc)) { if (fresh) throw new Error(`${base}: asks for login`); cookie = ''; return json<T>(start, true); }
        url = new URL(loc, url).href; continue;
      }
      const text = await r.text(); try { return JSON.parse(text) as T; } catch { throw new Error(`${base} → not JSON (${r.status}): ${text.slice(0, 80)}`); }
    }
    throw new Error(`${base}: too many redirects`);
  }
  async function options() { return json<{ terms: { strm: string; descr: string; institutions?: string[] }[]; subjects: { subject: string }[] }>(`${S}.IScript_ClassSearchOptions?institution=${institution}`); }
  function terms(all: { strm: string; descr: string; institutions?: string[] }[]) {
    const mine = all.filter((t) => !t.institutions || t.institutions.includes(institution));
    const regular = mine.filter((t) => !/summer|winter/i.test(t.descr));
    const [cur, next] = catalogTermLabels();
    const now = findTerm(regular, (t) => t.descr, cur) ?? pickTerm(regular, (t) => t.descr); if (!now) throw new Error(`${base}: no terms`);
    const after = findTerm(regular, (t) => t.descr, next);
    return [now, ...(after && after.strm !== now.strm ? [after] : [])].map((t) => ({ code: t.strm, label: labelOf(t.descr) }));
  }
  async function subject(term: string, subj: string): Promise<HcxClass[]> {
    const all: HcxClass[] = [];
    for (let page = 1; page <= 30; page++) {
      const d = await json<{ pageCount?: number; classes?: HcxClass[] }>(`${S}.IScript_ClassSearch?institution=${institution}&term=${term}&subject=${encodeURIComponent(subj)}&page=${page}`);
      all.push(...(d.classes ?? [])); if (!d.pageCount || page >= d.pageCount) break;
    }
    return all;
  }
  return {
    schoolId,
    async fetch() {
      const o = await options(); const out: CatalogCourse[] = [];
      for (const t of terms(o.terms)) {
        const before = out.length;
        for (const sub of o.subjects) { out.push(...hcxToCourses(schoolId, await subject(t.code, sub.subject), t.code, t.label, `${S}.IScript_ClassSearch?institution=${institution}&term=${t.code}&subject=${encodeURIComponent(sub.subject)}`)); await new Promise((r) => setTimeout(r, 150)); }
        console.log(`  ${schoolId} hcx ${t.code} (${t.label}): ${o.subjects.length} subjects → ${out.length - before} lectures`);
      }
      return out;
    },
    async lookup(c) { const termCode = c.termCode ?? c.term; return hcxToCourses(schoolId, await subject(termCode, c.code.split(' ')[0]), termCode, c.term, c.url ?? '').find((x) => x.id === c.id) ?? null; },
  };
}

// ─── USC: classes.usc.edu 공개 JSON (Terms/Active · Schools/TermCode · Courses/CoursesByTermSchoolProgram) ───
// 섹션마다 rnrMode(Lecture·Discussion·Lab·Quiz·Lecture/Lab)·요일 배열·24시간 시각. 학부·대학원 모두 (CSCI 502A 등).
const USC = 'https://classes.usc.edu/api';
export interface UscCourse { fullCourseName: string; name: string; scheduledCourseCode?: { prefix: string }; sections: { sisSectionId: string; rnrMode?: string; isCancelled?: boolean; schedule?: { days?: string[]; startTime?: string; endTime?: string }[]; instructors?: { firstName?: string; lastName?: string }[]; units?: string[] }[] }
const USC_DAY: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
const USC_SECONDARY = /^(discussion|lab|laboratory|quiz|recitation)$/i;
export function uscToCourses(courses: UscCourse[], termCode: string, label: string): CatalogCourse[] {
  const out: CatalogCourse[] = []; const seen = new Set<string>(); const secOf = new Map<string, string>();
  for (const c of courses) {
    const code = c.fullCourseName.replace(/\s+/g, ' ').trim(); const baseId = courseId('s_usc', code);
    for (const sec of c.sections ?? []) {
      if (sec.isCancelled || USC_SECONDARY.test(sec.rnrMode ?? '')) continue;
      const meetings: Meeting[] = [];
      for (const m of sec.schedule ?? []) { if (!m.startTime || !m.endTime || !m.days?.length) continue; for (const d of m.days) if (d in USC_DAY) meetings.push({ day: USC_DAY[d], start: m.startTime.slice(0, 5), end: m.endTime.slice(0, 5) }); }
      if (!meetings.length) continue;
      const id = seen.has(baseId) ? `${baseId}_${sec.sisSectionId}` : baseId; if (seen.has(id)) continue; seen.add(id); secOf.set(id, sec.sisSectionId);
      const ins = sec.instructors?.find((i) => i.lastName); const units = Number(sec.units?.[0]);
      out.push({ id, schoolId: 's_usc', code, title: c.name, department: c.scheduledCourseCode?.prefix ?? code.split(' ')[0], instructor: ins ? `${ins.firstName ?? ''} ${ins.lastName}`.trim() : undefined, meetings: uniq(meetings), term: label, termCode, units: Number.isFinite(units) && units > 0 ? units : undefined, url: `https://classes.usc.edu/term/${termCode}/course/${code.replace(' ', '-').toLowerCase()}` });
    }
  }
  for (const c of out) if (out.filter((o) => o.code === c.code).length > 1) c.title = `${c.title} (Sec ${secOf.get(c.id)})`;
  return tagTerm(out, label);
}
async function uscJson<T>(path: string): Promise<T> { const r = await fetch(`${USC}${path}`, { headers: { ...UAH, accept: 'application/json' } }); if (!r.ok) throw new Error(`usc ${path} → ${r.status}`); return (await r.json()) as T; }
async function uscTerms(): Promise<{ code: string; label: string }[]> {
  const all = await uscJson<{ termCode: number; season: string; year: number }[]>('/Terms/Active');
  const regular = all.filter((t) => /fall|spring/i.test(t.season)).map((t) => ({ code: String(t.termCode), label: `${t.season} ${t.year}` }));
  const [cur, next] = catalogTermLabels();
  const now = regular.find((t) => t.label === cur) ?? regular[0]; if (!now) throw new Error('usc: no terms');
  const after = regular.find((t) => t.label === next);
  return [now, ...(after && after.code !== now.code ? [after] : [])];
}
async function uscPrograms(termCode: string): Promise<{ school: string; program: string }[]> {
  const schools = await uscJson<{ prefix: string; programs?: { prefix: string }[] }[]>(`/Schools/TermCode?termCode=${termCode}`);
  const seen = new Set<string>(); const out: { school: string; program: string }[] = [];
  for (const s of schools) for (const p of s.programs ?? []) if (!seen.has(p.prefix)) { seen.add(p.prefix); out.push({ school: s.prefix, program: p.prefix }); }
  return out;
}
async function uscProgram(termCode: string, school: string, program: string): Promise<UscCourse[]> {
  return (await uscJson<{ courses?: UscCourse[] }>(`/Courses/CoursesByTermSchoolProgram?termCode=${termCode}&school=${school}&program=${program}`)).courses ?? [];
}
async function usc(): Promise<CatalogCourse[]> {
  const out: CatalogCourse[] = [];
  for (const t of await uscTerms()) {
    const progs = await uscPrograms(t.code); const before = out.length;
    for (const p of progs) { out.push(...uscToCourses(await uscProgram(t.code, p.school, p.program), t.code, t.label)); await new Promise((r) => setTimeout(r, 150)); }
    console.log(`  s_usc ${t.code} (${t.label}): ${progs.length} programs → ${out.length - before} classes`);
  }
  return out;
}
async function uscLookup(c: CatalogCourse): Promise<CatalogCourse | null> {
  const termCode = c.termCode ?? ''; const prefix = c.code.split(' ')[0];
  const p = (await uscPrograms(termCode)).find((x) => x.program === prefix); if (!p) return null;
  return uscToCourses(await uscProgram(termCode, p.school, p.program), termCode, c.term).find((x) => x.id === c.id) ?? null;
}

// ─── Rice: courses.rice.edu 공개 수업 검색 (!SWKSCAT.cat?p_action=QUERY&p_term=202710&p_subj=COMP) ───
// 과목마다 한 페이지, 한 줄 = 한 섹션(CRN·과목 번호·섹션·제목(대문자)·교수·수업 시간 "9:25AM - 10:40AM TR"·기말). 대학원 과목(500번대) 포함.
const RICE = 'https://courses.rice.edu/courses/courses/!SWKSCAT.cat';
const RICE_DAY: Record<string, number> = { M: 0, T: 1, W: 2, R: 3, F: 4, S: 5, U: 6 };
const SMALL = /^(a|an|and|as|at|by|for|in|of|on|or|the|to|vs|via|with)$/i;
const titleCase = (t: string) => (/[a-z]/.test(t) ? t : t.toLowerCase().split(/(\s+|-|\/)/).map((w, i) => (i > 0 && SMALL.test(w) ? w : /^(i|ii|iii|iv|v|vi)$/i.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(''));
const to24 = (t: string) => { const m = /^(\d{1,2}):(\d{2})(AM|PM)$/i.exec(t.trim()); if (!m) return ''; let h = Number(m[1]) % 12; if (/pm/i.test(m[3])) h += 12; return `${String(h).padStart(2, '0')}:${m[2]}`; };
export function riceToCourses(html: string, termCode: string, label: string): CatalogCourse[] {
  const out: CatalogCourse[] = []; const seen = new Set<string>(); const secOf = new Map<string, string>();
  const txt = (h = '') => decodeEntities(h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
  for (const row of html.match(/<tr><td data-label="CRN:[\s\S]*?<\/tr>/g) ?? []) {
    const crs = /class="cls-crs">([\s\S]*?)<\/td>/.exec(row)?.[1]; if (!crs) continue;
    const m = /^(\S+)\s+(\S+)\s+(\S+)$/.exec(txt(crs)); if (!m) continue;
    const code = `${m[1]} ${m[2]}`; const sec = m[3]; const baseId = courseId('s_rice', code);
    const meetings: Meeting[] = [];
    const clas = /data-mtg-type="CLAS">([\s\S]*?)<\/div><\/div>/.exec(row)?.[1] ?? '';
    for (const t of txt(clas).matchAll(/(\d{1,2}:\d{2}[AP]M)\s*-\s*(\d{1,2}:\d{2}[AP]M)\s+([MTWRFSU]+)/g)) {
      const start = to24(t[1]), end = to24(t[2]); if (!start || !end) continue;
      for (const ch of t[3]) meetings.push({ day: RICE_DAY[ch], start, end });
    }
    if (!meetings.length) continue;
    const id = seen.has(baseId) ? `${baseId}_${sec}` : baseId; if (seen.has(id)) continue; seen.add(id); secOf.set(id, sec);
    const instructor = txt(/class="cls-ins">([\s\S]*?)<\/td>/.exec(row)?.[1]).split(/\s{2,}/)[0] || undefined;
    const crn = /p_crn=(\d+)/.exec(row)?.[1];
    const units = Number(txt(/class="cls-crd"[^>]*>([\s\S]*?)<\/td>/.exec(row)?.[1]));
    out.push({ id, schoolId: 's_rice', code, title: titleCase(txt(/class="cls-ttl">([\s\S]*?)<\/td>/.exec(row)?.[1])), department: m[1], instructor, meetings: uniq(meetings), term: label, termCode, units: Number.isFinite(units) && units > 0 ? units : undefined, url: crn ? `${RICE}?p_action=COURSE&p_term=${termCode}&p_crn=${crn}` : `${RICE}?p_action=QUERY&p_term=${termCode}&p_subj=${m[1]}` });
  }
  for (const c of out) if (out.filter((o) => o.code === c.code).length > 1) c.title = `${c.title} (Sec ${secOf.get(c.id)})`;
  return tagTerm(out, label);
}
async function riceGet(q: string): Promise<string> { const r = await fetch(`${RICE}${q}`, { headers: UAH }); if (!r.ok) throw new Error(`rice ${q} → ${r.status}`); return r.text(); }
async function riceForm(): Promise<{ terms: { code: string; label: string }[]; subjects: string[] }> {
  const html = await riceGet('');
  const terms = [...html.matchAll(/<option value="(\d{6})">([^<]+)/g)].map((m) => ({ code: m[1], label: labelOf(m[2]) }));
  const sel = /<select id="p_subj_cd"[\s\S]*?<\/select>/.exec(html)?.[0] ?? '';
  return { terms, subjects: [...sel.matchAll(/<option value="([A-Z]{2,5})">/g)].map((m) => m[1]) };
}
async function rice(): Promise<CatalogCourse[]> {
  const { terms, subjects } = await riceForm(); const [cur, next] = catalogTermLabels();
  const pick = [terms.find((t) => t.label === cur), terms.find((t) => t.label === next)].filter((t): t is { code: string; label: string } => !!t);
  if (!pick.length) throw new Error('rice: current term not in the list');
  const out: CatalogCourse[] = [];
  for (const t of pick) {
    const before = out.length;
    for (const sub of subjects) { out.push(...riceToCourses(await riceGet(`?p_action=QUERY&p_term=${t.code}&p_subj=${sub}`), t.code, t.label)); await new Promise((r) => setTimeout(r, 200)); }
    console.log(`  s_rice ${t.code} (${t.label}): ${subjects.length} subjects → ${out.length - before} classes`);
  }
  return out;
}
async function riceLookup(c: CatalogCourse): Promise<CatalogCourse | null> {
  return riceToCourses(await riceGet(`?p_action=QUERY&p_term=${c.termCode}&p_subj=${c.code.split(' ')[0]}`), c.termCode ?? '', c.term).find((x) => x.id === c.id) ?? null;
}

// ─── University of Washington: 공개 시간표 washington.edu/students/timeschd/pub/<AUT2026>/<dept>.html (쿼터제) ───
// 고정폭 글자 표. 과목 머리줄 "CSE 122 COMP PROGRAMMING II", 섹션 줄 "SLN  A  4  WF  1230-120" (학점 자리에 QZ=퀴즈 섹션, LB=랩).
// 시각엔 AM/PM 이 없다: 8~11 오전, 12 정오, 1~7 오후, 끝에 P 가 붙으면 저녁. 대학원(500번대) 포함.
const UW = 'https://www.washington.edu/students/timeschd/pub';
const UW_SECONDARY = /^(QZ|LB)$/;
function uwTime(raw: string, pm: boolean): string { const d = raw.padStart(3, '0'); let h = Number(d.slice(0, -2)); const m = d.slice(-2); if (pm ? h < 12 : h >= 1 && h <= 7) h += 12; return `${String(h).padStart(2, '0')}:${m}`; }
/** page = 학과 시간표 파일 이름(anthro) — 과목 머리(ANTH)와 다를 수 있다(anth.html 은 404, 2026-11-03 점검). 없으면 머리 글자로 */
export function uwToCourses(html: string, termCode: string, label: string, page?: string): CatalogCourse[] {
  const out: CatalogCourse[] = []; const seen = new Set<string>(); const secOf = new Map<string, string>();
  for (const block of html.split(/(?=<table bgcolor='#ffcccc')/)) {
    const head = /<A NAME=[a-z0-9]+>([\s\S]*?)<\/A>&nbsp;<A [^>]*>([\s\S]*?)<\/A>/.exec(block); if (!head) continue;
    const code = decodeEntities(head[1].replace(/&nbsp;/g, ' ')).replace(/\s+/g, ' ').trim(); const title = titleCase(decodeEntities(head[2]).trim());
    if (!/^[A-Z&][A-Z& ]* \d{3}$/.test(code)) continue;
    const baseId = courseId('s_uw', code);
    for (const m of block.matchAll(/SLN=\d+>\d+<\/A>\s+([A-Z][A-Z0-9]?)\s+(\S+)\s+([MTWFhSau]+)\s+(\d{3,4})-(\d{3,4})(P?)/g)) {
      const [, sec, kind, days, a, b, p] = m; if (UW_SECONDARY.test(kind)) continue;
      const pm = p === 'P'; const start = uwTime(a, pm && Number(a.slice(0, -2)) < 12 && Number(a.slice(0, -2)) <= Number(b.slice(0, -2))); const end = uwTime(b, pm);
      const meetings = (days.match(/Th|Sa|Su|M|T|W|F/g) ?? []).map((d) => ({ day: { M: 0, T: 1, W: 2, Th: 3, F: 4, Sa: 5, Su: 6 }[d as 'M']!, start, end }));
      if (!meetings.length) continue;
      const id = seen.has(baseId) ? `${baseId}_${sec.toLowerCase()}` : baseId; if (seen.has(id)) continue; seen.add(id); secOf.set(id, sec);
      const units = Number(kind);
      out.push({ id, schoolId: 's_uw', code, title, department: code.replace(/ \d{3}$/, ''), meetings: uniq(meetings), term: label, termCode, units: Number.isFinite(units) && units > 0 ? units : undefined, url: ((a) => `${UW}/${termCode}/${page ?? a.replace(/\d+$/, '')}.html${page && a ? `#${a}` : ''}`)(/<A NAME=([a-z0-9]+)>/.exec(block)?.[1] ?? '') });
    }
  }
  for (const c of out) if (out.filter((o) => o.code === c.code).length > 1) c.title = `${c.title} (Sec ${secOf.get(c.id)})`;
  return tagTerm(out, label);
}
async function uwGet(path: string): Promise<string | null> { const r = await fetch(`${UW}/${path}`, { headers: UAH }); if (r.status === 404) return null; if (!r.ok) throw new Error(`uw ${path} → ${r.status}`); return r.text(); }
/** 지금 쿼터 + 다음 쿼터 (Autumn → Winter → Spring) */
function uwTerms(now = new Date()): { code: string; label: string }[] {
  const [cur] = catalogTermLabels(now); const y = Number(cur.split(' ')[1]);
  const seq = /Fall|Autumn/.test(cur) ? [[`AUT${y}`, `Fall ${y}`], [`WIN${y + 1}`, `Winter ${y + 1}`]] : /Spring/.test(cur) ? [[`SPR${y}`, `Spring ${y}`], [`AUT${y}`, `Fall ${y}`]] : [[`WIN${y}`, `Winter ${y}`], [`SPR${y}`, `Spring ${y}`]];
  return seq.map(([code, label]) => ({ code, label }));
}
async function uw(): Promise<CatalogCourse[]> {
  const out: CatalogCourse[] = [];
  for (const t of uwTerms()) {
    const index = await uwGet(`${t.code}/`); if (!index) { console.log(`  s_uw ${t.code}: not published`); continue; }
    const depts = [...new Set([...index.matchAll(/href="([a-z]+)\.html"/g)].map((m) => m[1]))]; const before = out.length;
    for (const d of depts) { const html = await uwGet(`${t.code}/${d}.html`); if (html) out.push(...uwToCourses(html, t.code, t.label, d)); await new Promise((r) => setTimeout(r, 200)); }
    console.log(`  s_uw ${t.code} (${t.label}): ${depts.length} departments → ${out.length - before} classes`);
  }
  return out;
}
async function uwLookup(c: CatalogCourse): Promise<CatalogCourse | null> {
  const page = /\/([a-z]+)\.html(?:#|$)/.exec(c.url ?? '')?.[1]; if (!page || !c.termCode) return null;
  const html = await uwGet(`${c.termCode}/${page}.html`); return html ? uwToCourses(html, c.termCode, c.term, page).find((x) => x.id === c.id) ?? null : null;
}

// ─── UCLA: sa.ucla.edu/ro/Public/SOC — 공개. 과목 목록은 25개씩(Results/CourseTitlesView), 분반 시간은 과목마다 한 번(Results/GetCourseSummary).
// 과목당 요청이 하나라 한 번에 다 읽지 않는다 — 하루 조금씩(server/scripts 쪽 배치). 여기는 GetCourseSummary 응답 한 개를 읽는 부분.
// 강의(primary-row)만 — 토론·실험(Dis/Lab)은 펼쳐야 나오고 학생이 하나 고르는 것이라 넣지 않는다(다른 학교와 같은 규칙).
export interface UclaCourseRef { subject: string; catalog: string; title: string; path?: string }
const UCLA_DAY: Record<string, number> = { M: 0, T: 1, W: 2, R: 3, F: 4, S: 5, U: 6 };
const uclaTime = (t: string) => { const m = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i.exec(t.trim()); if (!m) return ''; let h = Number(m[1]) % 12; if (/pm/i.test(m[3])) h += 12; return `${String(h).padStart(2, '0')}:${m[2] ?? '00'}`; };
/** 학교 내부 번호 "0104E M " → 화면 번호 "M104E" (뒤에 붙은 글자는 앞 글자: M = 여러 학과 공동, C = 학부·대학원 동시) */
export const uclaCatalog = (raw: string) => { const t = raw.trim(); const m = /^0*(\d+[A-Z]*)\s+([A-Z]+)$/.exec(t); return m ? `${m[2]}${m[1]}` : t.replace(/^0+(?=\d)/, ''); };
export function uclaSummaryToCourses(html: string, ref: UclaCourseRef, termCode: string, label: string): CatalogCourse[] {
  const out: CatalogCourse[] = []; const secOf = new Map<string, string>();
  const txt = (h = '') => decodeEntities(h.replace(/<wbr\s*\/?>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
  const code = `${ref.subject} ${uclaCatalog(ref.catalog)}`;
  // 같은 번호에 주제가 다른 과목(188 특강 등)이 여럿이라 학교 쪽 경로(Path)로 구분, 학기마다 따로
  const baseId = `cc_ucla_${(ref.path ?? `${ref.subject}${ref.catalog}`).toLowerCase().replace(/[^a-z0-9]+/g, '')}_${termCode.toLowerCase()}`;
  const rows = html.split(/<div class="row-fluid data_row primary-row/).slice(1);
  for (const row of rows) {
    const sec = txt(/title="Class Detail[^"]*">([^<]+)<\/a>/.exec(row)?.[1]); if (!sec || !/^(Lec|Sem|Sec|Stu|Tut|Act|Lab|Rec|Cli|Fld|Res)\b/i.test(sec)) continue;
    // 요일·시간이 여러 줄일 수 있다(ASL 1: "MF<br />TWR" + "11am-11:50am<br />11am-11:50am") — 줄끼리 짝지어 읽는다
    const dayLines = (/-days_data">\s*<p>\s*<button[^>]*>([\s\S]*?)<\/button>/.exec(row)?.[1] ?? '').split(/<br\s*\/?>/).map((x) => txt(x));
    const timeLines = (/class="timeColumn"[\s\S]*?<\/div>\s*<p>([\s\S]*?)<\/p>\s*<\/div>/.exec(row)?.[1] ?? '').split(/<br\s*\/?>/).map((x) => txt(x));
    const meetings: Meeting[] = [];
    dayLines.forEach((days, i) => {
      const tm = /(\d{1,2}(?::\d{2})?\s*[ap]m)\s*-\s*(\d{1,2}(?::\d{2})?\s*[ap]m)/i.exec(timeLines[i] ?? ''); if (!tm || !/^[MTWRFSU]+$/.test(days)) return;
      const start = uclaTime(tm[1]), end = uclaTime(tm[2]); if (!start || !end) return;
      for (const ch of days) meetings.push({ day: UCLA_DAY[ch], start, end });
    });
    if (!meetings.length) continue;
    const no = sec.replace(/^\S+\s*/, '');
    const id = out.length ? `${baseId}_${no.toLowerCase()}` : baseId; if (out.some((o) => o.id === id)) continue; secOf.set(id, sec);
    const location = txt(/class="locationColumn[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(row)?.[1]) || undefined;
    const units = Number(txt(/class="unitsColumn"[^>]*>([\s\S]*?)<\/div>/.exec(row)?.[1]));
    const instructor = txt(/class="instructorColumn[^"]*"[^>]*>([\s\S]*?)<\/div>/.exec(row)?.[1]) || undefined;
    // 학교 화면의 상세 링크 그대로(class_no 가 없으면 404 로 간다, 2026-11-03 점검)
    const href = /href="(\/ro\/Public\/SOC\/Results\/ClassDetail\?[^"]+)"/.exec(row)?.[1];
    out.push({ id, schoolId: 's_ucla', code, title: ref.title, department: ref.subject, instructor: instructor && !/^The Staff$/i.test(instructor) ? instructor : undefined, location, meetings: uniq(meetings), term: label, termCode, units: Number.isFinite(units) && units > 0 ? units : undefined,
      url: href ? `https://sa.ucla.edu${decodeEntities(href).replace(/ /g, '%20')}` : 'https://sa.ucla.edu/ro/Public/SOC' });
  }
  if (out.length > 1) for (const c of out) c.title = `${c.title} (${secOf.get(c.id)})`;
  return out;
}

// ─── SF State: webapps.sfsu.edu/public/classservices/classsearch — 공개. 빠른 검색(전공 이름) → results → searchresultsjson(DataTables aaData).
// 결과 주소는 어느 학기든 받는다(가을·봄 최근 두 학기). 강의(LEC)가 있는 과목은 강의만, 없으면 세미나 등 시간이 있는 것. 개별 연구(SUP 등 시간 없음)는 빠진다.
const SFSU = 'https://webapps.sfsu.edu/public/classservices';
const SFSU_DAY: Record<string, number> = { Mo: 0, Tu: 1, We: 2, Th: 3, Fr: 4, Sa: 5, Su: 6 };
export function sfsuToCourses(json: { aaData?: string[][] }, termCode: string, label: string): CatalogCourse[] {
  const txt = (h = '') => decodeEntities(h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
  const rows = (json.aaData ?? []).map((r) => {
    const m = /^(.+?)\s+\[(\w+)\]$/.exec(txt(r[0])); const meetings: Meeting[] = [];
    for (const b of (r[6] ?? '').split(/<div class='row'>/).slice(1)) {
      const days = txt(/col-md-5[^>]*>([\s\S]*?)<\/div>/.exec(b)?.[1]); const tm = /(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/i.exec(txt(/col-md-7[^>]*>([\s\S]*?)<\/div>/.exec(b)?.[1]));
      if (!tm) continue; const start = to24(tm[1].replace(/\s+/g, '')), end = to24(tm[2].replace(/\s+/g, '')); if (!start || !end) continue;
      for (const d of days.split(/\s+/)) if (d in SFSU_DAY) meetings.push({ day: SFSU_DAY[d], start, end });
    }
    const loc = txt(/col-md-12[^>]*>([\s\S]*?)<\/div>/.exec(r[6] ?? '')?.[1]);
    const href = /href="([^"]+)"/.exec(r[0] ?? '')?.[1]?.replace(/\\\//g, '/');
    return m ? { code: m[1], sec: m[2], kind: txt(r[1]), title: txt(r[2]), units: Number(txt(r[3]).split(/\s*-\s*/)[0]), meetings: uniq(meetings), location: loc || undefined, instructor: txt(r[8]) || undefined, url: href ? `https://webapps.sfsu.edu${href}` : undefined } : null;
  }).filter((x): x is NonNullable<typeof x> => !!x && x.meetings.length > 0);
  const out: CatalogCourse[] = [];
  for (const code of [...new Set(rows.map((r) => r.code))]) {
    const all = rows.filter((r) => r.code === code); const lec = all.filter((r) => r.kind === 'LEC'); const keep = lec.length ? lec : all.filter((r) => !/^(LAB|DIS|ACT)$/.test(r.kind)).length ? all.filter((r) => !/^(LAB|DIS|ACT)$/.test(r.kind)) : all;
    const baseId = `${courseId('s_sfsu', code)}_${termCode}`;
    keep.forEach((r, i) => out.push({ id: i === 0 ? baseId : `${baseId}_${r.sec.toLowerCase()}`, schoolId: 's_sfsu', code, title: keep.length > 1 ? `${r.title} (Sec ${r.sec})` : r.title, department: code.replace(/\s+\S+$/, ''), instructor: r.instructor && !/^(To be announced|Staff|TBA)$/i.test(r.instructor) ? r.instructor : undefined, location: r.location && !/^(To be (arranged|announced)|TBA)$/i.test(r.location) ? r.location : undefined, meetings: r.meetings, term: label, termCode, units: Number.isFinite(r.units) && r.units > 0 ? r.units : undefined, url: r.url }));
  }
  return out;
}
/** 쿠키(세션)를 들고 다니는 작은 요청기 — 빠른 검색은 같은 세션에서 결과 JSON 을 준다 */
function sfsuSession() {
  const jar = new Map<string, string>();
  const keep = (r: Response) => { for (const c of r.headers.getSetCookie?.() ?? []) { const [kv] = c.split(';'); const i = kv.indexOf('='); jar.set(kv.slice(0, i).trim(), kv.slice(i + 1)); } };
  const cookie = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  return async (url: string, body?: URLSearchParams): Promise<Response> => {
    const r = await fetch(url, { method: body ? 'POST' : 'GET', body, redirect: 'manual', headers: { ...UAH, cookie: cookie(), referer: `${SFSU}/classsearch`, ...(body ? { 'content-type': 'application/x-www-form-urlencoded' } : {}), ...(/json/.test(url) ? { 'x-requested-with': 'XMLHttpRequest' } : {}) }, signal: AbortSignal.timeout(45000) });
    keep(r); await new Promise((res) => setTimeout(res, 1000)); return r;
  };
}
async function sfsu(): Promise<CatalogCourse[]> {
  // 결과 주소(classsearch/results?searchFor=<전공>&term=<학기>&classCategory=REG)를 열면 같은 세션의 searchresultsjson 이 그 결과를 준다 — 폼 없이 전공당 2번
  const go = sfsuSession(); const form = await (await go(`${SFSU}/classsearch`)).text();
  const sel = /<select id="classScheduleAdvanced_subject"[\s\S]*?<\/select>/.exec(form)?.[0] ?? '';
  // SFSU_SUBJECTS=ECON,SOC 이면 그 전공만 다시 읽는다(지난번에 연결이 끊겨 빠진 것) — 나머지는 collect-courses 가 지난 파일 것을 그대로 둔다
  const only = process.env.SFSU_SUBJECTS?.split(',').map((x) => x.trim()).filter(Boolean);
  const subjects = [...sel.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]).filter((v) => v && v !== 'X' && (!only || only.includes(v)));
  const labels = Object.fromEntries([...form.matchAll(/<option value="(\d{4})">([^<]+)/g)].map((m) => [m[1], labelOf(m[2])]));
  // 가장 최근 가을·봄 두 학기(여름·겨울 계절학기 제외)
  const terms = Object.keys(labels).filter((t) => /Spring|Fall/.test(labels[t])).sort().reverse().slice(0, 2); if (!terms.length) throw new Error(`sfsu: no term (page ${form.length} chars, ${Object.keys(labels).length} options)`);
  const out: CatalogCourse[] = [];
  for (const term of terms) {
    const before = out.length;
    for (const subj of subjects) {
      // 연결이 끊기면 한 번 더 — 그래도 안 되면 그 전공은 건너뛰고(이전 파일의 것이 남는다) 기록
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const r = await go(`${SFSU}/classsearch/results?${new URLSearchParams({ searchFor: subj, term, classCategory: 'REG' })}`); if (!r.ok) throw new Error(String(r.status));
          const j = await go(`${SFSU}/searchresultsjson`); if (!j.ok) throw new Error(String(j.status));
          out.push(...sfsuToCourses(await j.json(), term, labels[term] ?? term).filter((c) => c.department === subj)); break;
        } catch (e) { if (attempt === 1) console.log(`  s_sfsu ${term} ${subj}: skipped (${(e as Error).message})`); else await new Promise((res) => setTimeout(res, 5000)); }
      }
    }
    console.log(`  s_sfsu ${labels[term]}: ${subjects.length} subjects → ${out.length - before} classes`);
  }
  return [...new Map(out.map((c) => [c.id, c])).values()];
}

// ─── Caltech: schedules.caltech.edu/<FA2026-27>.html — 쿼터마다 한 페이지(보고서를 HTML 로 내보낸 표, 글자 칸 순서대로 읽는다) ───
// 칸 순서: 과목 "CS 024" → 학점 "3-3-3" → 제목 → [섹션 "01" → 교수 → "MWF 11:00 - 11:55"(24시간) → 강의실]… 시각이 두 줄로 나뉘기도 한다("OM,W 16:00 -" + "16:55").
const CALTECH = 'https://schedules.caltech.edu';
export function caltechToCourses(html: string, termCode: string, label: string): CatalogCourse[] {
  const toks = [...html.matchAll(/<font face="verdana">([\s\S]*?)<\/font>/g)].map((m) => decodeEntities(m[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ')).replace(/\s+/g, ' ').trim()).filter(Boolean);
  for (let i = 0; i < toks.length - 1; i++) if (/\d{1,2}:\d{2} -$/.test(toks[i]) && /^\d{1,2}:\d{2}$/.test(toks[i + 1])) { toks[i] = `${toks[i]} ${toks[i + 1]}`; toks.splice(i + 1, 1); }
  const out: CatalogCourse[] = []; const seen = new Set<string>(); const secOf = new Map<string, string>();
  let code = '', title = '', sec = '', cur: CatalogCourse | undefined;
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (/^[A-Z][A-Za-z]*(\/[A-Z][A-Za-z]*)* \d+[A-Za-z]*$/.test(t) && /^\+$|^\+?[\d.]+(-[\d.]+)*$/.test(toks[i + 1] ?? '')) { code = t; title = toks[i + 2] ?? ''; sec = ''; cur = undefined; i += 2; continue; }
    if (!code) continue;
    if (/^\d{2}$/.test(t)) { sec = t; cur = undefined; continue; }
    const m = /(?:^|,)([MTWRFSU]+) (\d{1,2}:\d{2}) - (\d{1,2}:\d{2})$/.exec(t); if (!m) continue;
    const meetings = [...m[1]].map((ch) => ({ day: { M: 0, T: 1, W: 2, R: 3, F: 4, S: 5, U: 6 }[ch as 'M']!, start: m[2].padStart(5, '0'), end: m[3].padStart(5, '0') }));
    if (cur) { cur.meetings = uniq([...(cur.meetings ?? []), ...meetings]); continue; }
    const baseId = courseId('s_caltech', code); const id = seen.has(baseId) ? `${baseId}_${sec || 'x'}` : baseId; if (seen.has(id)) continue; seen.add(id); secOf.set(id, sec || '01');
    cur = { id, schoolId: 's_caltech', code, title, department: code.split(' ')[0], meetings: uniq(meetings), term: label, termCode, url: `${CALTECH}/${termCode}.html` };
    out.push(cur);
  }
  for (const c of out) if (out.filter((o) => o.code === c.code).length > 1) c.title = `${c.title} (Sec ${secOf.get(c.id)})`;
  return tagTerm(out, label);
}
function caltechTerms(now = new Date()): { code: string; label: string }[] {
  const [cur] = catalogTermLabels(now); const y = Number(cur.split(' ')[1]); const ay = (a: number) => `${a}-${String(a + 1).slice(2)}`;
  if (/Fall|Autumn/.test(cur)) return [{ code: `FA${ay(y)}`, label: `Fall ${y}` }, { code: `WI${ay(y)}`, label: `Winter ${y + 1}` }];
  if (/Spring/.test(cur)) return [{ code: `SP${ay(y - 1)}`, label: `Spring ${y}` }, { code: `FA${ay(y)}`, label: `Fall ${y}` }];
  return [{ code: `WI${ay(y - 1)}`, label: `Winter ${y}` }, { code: `SP${ay(y - 1)}`, label: `Spring ${y}` }];
}
async function caltech(): Promise<CatalogCourse[]> {
  const out: CatalogCourse[] = [];
  for (const t of caltechTerms()) {
    const r = await fetch(`${CALTECH}/${t.code}.html`, { headers: UAH }); if (!r.ok) { console.log(`  s_caltech ${t.code}: ${r.status} (not published)`); continue; }
    const got = caltechToCourses(await r.text(), t.code, t.label); out.push(...got); console.log(`  s_caltech ${t.code} (${t.label}): ${got.length} classes`);
  }
  return out;
}
async function caltechLookup(c: CatalogCourse): Promise<CatalogCourse | null> {
  if (!c.termCode) return null; const r = await fetch(`${CALTECH}/${c.termCode}.html`, { headers: UAH }); if (!r.ok) return null;
  return caltechToCourses(await r.text(), c.termCode, c.term).find((x) => x.id === c.id) ?? null;
}

// ─── Carnegie Mellon: enr-apps.as.cmu.edu/open/SOC (공개 Schedule of Classes) — 학기마다 POST 한 번(DEPT=All, 피츠버그)으로 전 과목 ───
// 줄 칸: 과목(15122) · 제목 · 학점 · 섹션("Lec 1"·"A") · 건물방 · 요일(TR) · 시작 09:30AM · 끝 · 캠퍼스 · 방식. 섹션 칸이 빈 줄은 위 섹션의 추가 시간.
// 과목에 "Lec" 섹션이 있으면 강의만(문자 섹션은 리시테이션), 없으면 모든 섹션. 대학원(10-701 등) 포함.
const CMU = 'https://enr-apps.as.cmu.edu/open/SOC/SOCServlet';
export function cmuToCourses(html: string, termCode: string, label: string): CatalogCourse[] {
  type Sec = { code: string; title: string; sec: string; units?: number; meetings: Meeting[] };
  const secs: Sec[] = []; let code = '', title = '', units: number | undefined, cur: Sec | undefined;
  const cellText = (h: string) => decodeEntities(h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')).replace(/\s+/g, ' ').trim();
  const body = html.slice(html.indexOf('<tbody') >= 0 ? html.indexOf('<tbody') : 0);
  for (const chunk of body.split('</tr>')) {
    const cells = [...chunk.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((m) => m[1]); if (cells.length < 8) continue;
    const num = /courseDetails\?COURSE=(\d{5})/.exec(cells[0])?.[1];
    if (num) { code = `${num.slice(0, 2)}-${num.slice(2)}`; title = cellText(cells[1]).replace(/\s*This Section Cancelled\s*$/i, ' [cancelled]'); const u = Number(cellText(cells[2])); units = Number.isFinite(u) && u > 0 ? u : undefined; cur = undefined; }
    if (!code) continue;
    const sec = cellText(cells[3]);
    if (sec) { cur = { code, title, sec, units, meetings: [] }; secs.push(cur); }
    if (!cur) continue;
    const days = cellText(cells[5]), a = to24(cellText(cells[6])), b = to24(cellText(cells[7]));
    if (!/^[MTWRFSU]+$/.test(days) || !a || !b) continue;
    for (const ch of days) cur.meetings.push({ day: { M: 0, T: 1, W: 2, R: 3, F: 4, S: 5, U: 6 }[ch as 'M']!, start: a, end: b });
  }
  const out: CatalogCourse[] = []; const seen = new Set<string>(); const secOf = new Map<string, string>();
  const hasLec = new Set(secs.filter((x) => /^Lec/i.test(x.sec)).map((x) => x.code));
  for (const x of secs) {
    if (hasLec.has(x.code) && !/^Lec/i.test(x.sec)) continue; if (!x.meetings.length) continue;
    if (/\[cancelled\]$/.test(x.title)) continue; // CMU 는 취소된 섹션을 제목 칸에 "This Section Cancelled" 로 적는다
    const baseId = courseId('s_cmu', x.code); const id = seen.has(baseId) ? `${baseId}_${x.sec.toLowerCase().replace(/\s+/g, '')}` : baseId; if (seen.has(id)) continue; seen.add(id); secOf.set(id, x.sec);
    out.push({ id, schoolId: 's_cmu', code: x.code, title: x.title, department: x.code.slice(0, 2), meetings: uniq(x.meetings), term: label, termCode, units: x.units, url: `${CMU}/courseDetails?COURSE=${x.code.replace('-', '')}&SEMESTER=${termCode}` });
  }
  for (const c of out) if (out.filter((o) => o.code === c.code).length > 1) c.title = `${c.title} (${secOf.get(c.id)})`;
  return tagTerm(out, label);
}
async function cmuSearch(termCode: string): Promise<string> {
  const r = await fetch(`${CMU}/search`, { method: 'POST', headers: { ...UAH, 'content-type': 'application/x-www-form-urlencoded' }, body: `SEMESTER=${termCode}&MINI=NO&GRAD_UNDER=All&PRG_LOCATION=PIT&DEPT=All&COURSE=&INSTRUCTOR=&DAYS=&BEG_TIME=All&KEYWORD=&TITLE_ONLY=NO&SUBMIT=` });
  if (!r.ok) throw new Error(`cmu ${termCode} → ${r.status}`); return r.text();
}
async function cmu(): Promise<CatalogCourse[]> {
  const form = await (await fetch(`${CMU}/search`, { headers: UAH })).text();
  const terms = [...(/name="SEMESTER"[\s\S]*?<\/select>/.exec(form)?.[0] ?? '').matchAll(/value="([A-Z]\d{2})"[^>]*>\s*([^<]+)/g)].map((m) => ({ code: m[1], label: labelOf(m[2]) }));
  const [cur, next] = catalogTermLabels(); const pick = [cur, next].map((l) => terms.find((t) => t.label === l)).filter((t): t is { code: string; label: string } => !!t);
  const out: CatalogCourse[] = [];
  for (const t of pick) { const got = cmuToCourses(await cmuSearch(t.code), t.code, t.label); out.push(...got); console.log(`  s_cmu ${t.code} (${t.label}): ${got.length} classes`); await new Promise((r) => setTimeout(r, 1000)); }
  return out;
}
const cmuPages = new Map<string, Promise<string>>();
async function cmuLookup(c: CatalogCourse): Promise<CatalogCourse | null> {
  if (!c.termCode) return null; if (!cmuPages.has(c.termCode)) cmuPages.set(c.termCode, cmuSearch(c.termCode));
  return cmuToCourses(await cmuPages.get(c.termCode)!, c.termCode, c.term).find((x) => x.id === c.id) ?? null;
}

// ─── WashU: registrar.washu.edu/classes-registration/class-schedule-search/ (Workday 에서 내보낸 공개 시간표, WordPress) ───
// POST term="2026 Fall" & paged=N — 쪽마다 과목 149개. 과목 블록(학과·제목·코드 "SDS 5521"·학점) 안에 섹션 블록(번호·학기·교수·요일 "Tue Thu"·시간 "1:00 PM-2:20 PM").
const WUSTL = 'https://registrar.washu.edu/classes-registration/class-schedule-search/';
const WU_DAY: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
export function wustlToCourses(html: string, termName: string, label: string): CatalogCourse[] {
  const val = (h: string, cls: string) => decodeEntities((new RegExp(`class="scpi-class__${cls}">([\\s\\S]*?)<\\/div>`).exec(h)?.[1] ?? '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  const out: CatalogCourse[] = []; const seen = new Set<string>(); const secOf = new Map<string, string>();
  for (const row of html.split('<div class="scpi__classes--row"').slice(1)) {
    const title = val(row, 'heading wide'), code = val(row, 'heading middle'), dept = val(row, 'department');
    const units = Number(/(\d+(?:\.\d+)?) Units?/.exec(val(row, 'heading narrow'))?.[1]);
    if (!/^[A-Z][A-Z0-9 &-]* \d{3,4}[A-Z]?$/.test(code)) continue;
    for (const sec of row.split('data-section-id=').slice(1)) {
      if (val(sec, 'value value-term') !== termName) continue;
      const num = val(sec, 'value value-section-number'), days = val(sec, 'value value-days'), time = val(sec, 'value value-time');
      const t = /^(\d{1,2}:\d{2}) ?([AP]M)\s*-\s*(\d{1,2}:\d{2}) ?([AP]M)$/i.exec(time); if (!t) continue;
      const start = to24(`${t[1]}${t[2]}`), end = to24(`${t[3]}${t[4]}`);
      const meetings = days.split(/\s+/).filter((d) => d in WU_DAY).map((d) => ({ day: WU_DAY[d], start, end })); if (!meetings.length) continue;
      const baseId = courseId('s_wustl', code); const id = seen.has(baseId) ? `${baseId}_${num.toLowerCase()}` : baseId; if (seen.has(id)) continue; seen.add(id); secOf.set(id, num);
      const instructor = val(sec, 'value value-instructor') || undefined;
      out.push({ id, schoolId: 's_wustl', code, title, department: dept || code.replace(/ \d.*$/, ''), instructor: instructor && !/^(TBA|Staff)$/i.test(instructor) ? instructor : undefined, meetings: uniq(meetings), term: label, termCode: termName, units: Number.isFinite(units) && units > 0 ? units : undefined, url: WUSTL });
    }
  }
  for (const c of out) if (out.filter((o) => o.code === c.code).length > 1) c.title = `${c.title} (Sec ${secOf.get(c.id)})`;
  return tagTerm(out, label);
}
async function wustlPage(termName: string, page: number): Promise<string> {
  const r = await fetch(WUSTL, { method: 'POST', headers: { ...UAH, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ term: termName, paged: String(page), filter_submit: '1' }).toString() });
  if (!r.ok) throw new Error(`wustl ${termName} p${page} → ${r.status}`); return r.text();
}
async function wustl(): Promise<CatalogCourse[]> {
  const first = await wustlPage('', 1);
  const names = [...(/name="term"[\s\S]*?<\/select>/.exec(first)?.[0] ?? '').matchAll(/value="(20\d{2} (?:Fall|Spring))"/g)].map((m) => m[1]);
  const [cur, next] = catalogTermLabels(); const want = (l: string) => names.find((n) => `${n.split(' ')[1]} ${n.split(' ')[0]}` === l);
  const out: CatalogCourse[] = [];
  for (const label of [cur, next]) {
    const termName = want(label); if (!termName) { console.log(`  s_wustl ${label}: not listed yet`); continue; }
    const seen = new Set<string>(); let n = 0;
    for (let page = 1; page <= 120; page++) {
      const html = await wustlPage(termName, page); const got = wustlToCourses(html, termName, label);
      const fresh = got.filter((c) => !seen.has(c.id)); fresh.forEach((c) => seen.add(c.id)); out.push(...fresh); n += fresh.length;
      if (!html.includes('Next Page') || !html.includes('scpi__classes--row')) break;
      await new Promise((r) => setTimeout(r, 800));
    }
    console.log(`  s_wustl ${termName} (${label}): ${n} classes`);
  }
  return out;
}

// ─── Vanderbilt: more.app.vanderbilt.edu (YES 공개 수업 검색) — 학기 선택(쿠키) → 과목별 검색 → 50개씩 switchPage ───
// 과목 머리 "CS 1101:" + 제목, 섹션 줄 칸 classSection·classType(Lecture/Laboratory/Discussion…)·classMeetingDays(MWF)·classMeetingTimes("01:25p - 02:15p").
const VANDY = 'https://more.app.vanderbilt.edu/more';
const ampm = (t: string) => to24(t.replace(/([ap])$/i, (_, x: string) => `${x.toUpperCase()}M`));
export function vanderbiltToCourses(html: string, termCode: string, label: string): CatalogCourse[] {
  type Sec = { code: string; title: string; sec: string; kind: string; meetings: Meeting[] };
  const secs: Sec[] = []; const txt = (h = '') => decodeEntities(h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')).replace(/\s+/g, ' ').trim();
  for (const block of html.split('<span class="classAbbreviation">').slice(1)) {
    const code = txt(block.slice(0, block.indexOf('</span>'))).replace(/:$/, ''); const title = txt(/<span class="classDescription">([\s\S]*?)<\/span>/.exec(block)?.[1]);
    if (!/^[A-Z]{2,5} \d{4}[A-Z]?$/.test(code)) continue;
    for (const row of block.split(/<tr [^>]*class="[^"]*classRow[^"]*"/).slice(1)) {
      const cell = (c: string) => txt(new RegExp(`<td[^>]*class="${c}"[^>]*>([\\s\\S]*?)<\\/td>`).exec(row)?.[1]);
      const sec = cell('classSection'), kind = cell('classType'), days = cell('classMeetingDays'), times = cell('classMeetingTimes');
      const t = /^(\d{1,2}:\d{2}[ap])\s*-\s*(\d{1,2}:\d{2}[ap])$/i.exec(times); const meetings: Meeting[] = [];
      if (t && /^[MTWRFSU]+$/.test(days)) { const a = ampm(t[1]), b = ampm(t[2]); for (const ch of days) meetings.push({ day: { M: 0, T: 1, W: 2, R: 3, F: 4, S: 5, U: 6 }[ch as 'M']!, start: a, end: b }); }
      if (sec) secs.push({ code, title, sec, kind, meetings });
    }
  }
  const hasLec = new Set(secs.filter((x) => /^lecture/i.test(x.kind)).map((x) => x.code));
  const out: CatalogCourse[] = []; const seen = new Set<string>(); const secOf = new Map<string, string>();
  for (const x of secs) {
    if ((hasLec.has(x.code) && !/^lecture/i.test(x.kind)) || !x.meetings.length) continue;
    const baseId = courseId('s_vanderbilt', x.code); const id = seen.has(baseId) ? `${baseId}_${x.sec.toLowerCase()}` : baseId; if (seen.has(id)) continue; seen.add(id); secOf.set(id, x.sec);
    out.push({ id, schoolId: 's_vanderbilt', code: x.code, title: x.title, department: x.code.split(' ')[0], meetings: uniq(x.meetings), term: label, termCode, url: `${VANDY}/SearchClasses!input.action` });
  }
  for (const c of out) if (out.filter((o) => o.code === c.code).length > 1) c.title = `${c.title} (Sec ${secOf.get(c.id)})`;
  return tagTerm(out, label);
}
async function vanderbilt(): Promise<CatalogCourse[]> {
  let cookie = '';
  const get = async (path: string) => {
    let url = `${VANDY}${path}`;
    for (let hop = 0; hop < 5; hop++) {
      const r = await fetch(url, { redirect: 'manual', headers: { ...UAH, ...(cookie ? { cookie } : {}) } });
      const set = r.headers.getSetCookie?.() ?? []; if (set.length) { const jar = new Map(cookie.split('; ').filter(Boolean).map((c) => [c.split('=')[0], c] as const)); for (const c of set) { const kv = c.split(';')[0]; jar.set(kv.split('=')[0], kv); } cookie = [...jar.values()].join('; '); }
      const loc = r.headers.get('location'); if (r.status >= 300 && r.status < 400 && loc) { url = new URL(loc, url).href; continue; }
      if (!r.ok) throw new Error(`vanderbilt ${path} → ${r.status}`); return r.text();
    }
    throw new Error('vanderbilt: too many redirects');
  };
  await get('/SearchClasses!input.action');
  const form = await get('/SearchClasses!input.action');
  const subjects = [...new Set([...form.matchAll(/name="searchCriteria\.subjectAreaCodes" type="checkbox" value="([^"]+)"/g)].map((m) => m[1]))];
  const terms = [...form.matchAll(/<option value="(\d{4})"(?: selected="selected")?>(20\d{2} (?:Fall|Spring))/g)].map((m) => ({ code: m[1], label: labelOf(m[2]) }));
  const [cur, next] = catalogTermLabels();
  // 지금 학기는 목록에 없을 때가 있다(선택돼 있는 학기) — 앞뒤 번호로 맞춘다 (Spring 1080 → Fall 1075)
  const nextT = terms.find((t) => t.label === next); const curT = terms.find((t) => t.label === cur) ?? (nextT && /Spring/.test(nextT.label) ? { code: String(Number(nextT.code) - 5), label: cur } : undefined);
  const out: CatalogCourse[] = [];
  for (const t of [curT, nextT].filter((x): x is { code: string; label: string } => !!x)) {
    await get(`/SelectTerm!selectTerm.action?selectedTermCode=${t.code}`); const before = out.length;
    for (const sub of subjects) {
      const first = await get(`/SearchClassesExecute!search.action?searchCriteria.subjectAreaCodes=${encodeURIComponent(sub)}`);
      const total = Number(/totalRecords: (\d+)/.exec(first)?.[1] ?? 0); let html = first;
      for (let p = 2; p <= Math.ceil(total / 50); p++) { await new Promise((r) => setTimeout(r, 200)); html += await get(`/SearchClassesExecute!switchPage.action?pageNum=${p}`); }
      out.push(...vanderbiltToCourses(html, t.code, t.label)); await new Promise((r) => setTimeout(r, 200));
    }
    console.log(`  s_vanderbilt ${t.code} (${t.label}): ${subjects.length} subjects → ${out.length - before} classes`);
  }
  return out;
}

// ─── Harvard: my.harvard.edu 공개 과목 검색 (키 불필요) ─────────────────────
// 검색 결과는 JSON 안에 이스케이프된 HTML 로 오고 15개씩 page=N 으로 넘어간다. term=2026+Fall · school=FAS 필터가 된다.
// 과목마다 /course/sections/<id>/<offer>/<strm>/<session> 조각에 섹션별 요일(aria-label "Tuesday, selected")·시간·장소·교수가 있다.
const HV = 'https://my.harvard.edu';
const hvUnescape = (s: string) => s.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\\//g, '/').replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
const hvText = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#039;|&#39;/g, "'").replace(/\s+/g, ' ').trim();
const HV_DAYS: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
async function hvGet(url: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try { const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 AroundU-importer' } }); if (r.ok) return hvUnescape(await r.text()); if (r.status < 500 || attempt >= 3) throw new Error(`${url} → ${r.status}`); }
    catch (e) { if (attempt >= 3) throw e; }
    await new Promise((res) => setTimeout(res, 2000 * 2 ** attempt));
  }
}
/** 검색 필터 값 "2026 Fall" — 진행 중인 학기 (@core/lib/terms) */
/** 지금 학기 + 다음 학기 ("2026 Fall", "2027 Spring"). HARVARD_TERM="2026 Fall|2027 Spring" 로 지정 가능 */
function hvTermLabels(): string[] { if (process.env.HARVARD_TERM) return process.env.HARVARD_TERM.split('|').map((x) => x.trim()).filter(Boolean); const c = currentTerm(); const n = nextTerm(c); return [`${c.year} ${c.season}`, `${n.year} ${n.season}`]; }
interface HvCard { key: string; code: string; title: string; sectionsUrl?: string; inline: string; dept: string }
function hvCards(html: string): HvCard[] {
  const out: HvCard[] = [];
  for (const card of html.split(/data-course-id="/).slice(1)) {
    const code = hvText(/badge badge-light relative md:-top-0\.5">([\s\S]*?)<\/span>/.exec(card)?.[1] ?? '').replace(/\s+/g, ' ');
    const title = hvText(/<h2[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/.exec(card)?.[1] ?? '');
    const sectionsUrl = /data-url="(\/course\/sections\/[^"]+)"/.exec(card)?.[1];
    const dept = hvText(/href="\/school\/[A-Z]+"[\s\S]*?<\/a>[\s\S]*?·[\s\S]*?>([^<]{2,60})</.exec(card)?.[1] ?? '') || code.replace(/\s?\d.*$/, '');
    const key = `${/^(\d+)"/.exec(card)?.[1] ?? code}-${/data-crse-offer-nbr="(\d+)"/.exec(card.slice(0, 200))?.[1] ?? '1'}`;
    if (code && title) out.push({ key, code, title, sectionsUrl, inline: card, dept });
  }
  return out;
}
function hvSections(html: string): { no: string; location?: string; instructor?: string; meetings: Meeting[] }[] {
  const out: { no: string; location?: string; instructor?: string; meetings: Meeting[] }[] = [];
  // 섹션이 여럿이면 "Section 001" 으로 나뉘고, 하나면 카드에 요일·시간이 바로 있다
  const parts = /Section \d{3,4}\b/.test(html) ? html.split(/Section (?=\d{3,4}\b)/).slice(1) : [`001 ${html}`];
  for (const sec of parts) {
    const no = /^(\d{3,4})/.exec(sec)?.[1] ?? '';
    const location = hvText(/class="pt-1 font-normal">([\s\S]*?)<\/div>/.exec(sec)?.[1] ?? '');
    const instructor = hvText(/class="link-body">([\s\S]*?)<\/span>/.exec(sec)?.[1] ?? '') || undefined;
    const days = [...sec.matchAll(/aria-label="(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), selected"/g)].map((m) => HV_DAYS[m[1]]);
    const t = /(\d{1,2}:\d{2}\s*[ap]m)\s*-\s*(\d{1,2}:\d{2}\s*[ap]m)/i.exec(sec);
    const meetings: Meeting[] = [];
    if (t && days.length) { try { const st = parseTime(t[1].replace(/\s+/g, '')), en = parseTime(t[2].replace(/\s+/g, '')); for (const d of days) meetings.push({ day: d, start: st, end: en }); } catch { /* odd time */ } }
    out.push({ no, location: location && !/^TBA$/i.test(location) ? location : undefined, instructor, meetings: uniq(meetings) });
  }
  return out;
}
async function harvardCourses(cards: HvCard[], term: string): Promise<CatalogCourse[]> {
  const out: CatalogCourse[] = [];
  for (const card of cards) {
    const html = card.sectionsUrl ? await hvGet(`${HV}${card.sectionsUrl}`) : card.inline;
    const secs = hvSections(html).filter((x) => x.meetings.length);
    const baseId = courseId('s_harvard', card.code);
    const taken = new Set(out.map((c) => c.id));
    const url = `${HV}/search/?q=${encodeURIComponent(card.code)}&term=${encodeURIComponent(term)}`;
    secs.forEach((sec, i) => out.push({ id: i === 0 && !taken.has(baseId) ? baseId : `${baseId}_${sec.no}${taken.has(`${baseId}_${sec.no}`) ? `_${card.key}` : ''}`, schoolId: 's_harvard', code: card.code, title: secs.length > 1 ? `${card.title} (Sec ${sec.no})` : card.title, department: card.dept, instructor: sec.instructor, location: sec.location, meetings: sec.meetings, term: normalizeTermLabel(term), termCode: term, url }));
    if (card.sectionsUrl) await new Promise((r) => setTimeout(r, 120));
  }
  return out;
}
async function harvard(): Promise<CatalogCourse[]> {
  const all: CatalogCourse[] = [];
  for (const term of hvTermLabels()) {
    const got = await harvardTerm(term);
    // 다음 학기가 아직 안 올라왔으면 비어 있다 — 건너뛴다. 지금 학기가 비면 아래 규칙 검사가 거부한다
    all.push(...tagTerm(got, normalizeTermLabel(term)));
  }
  return all;
}
async function harvardTerm(term: string): Promise<CatalogCourse[]> {
  const school = process.env.HARVARD_SCHOOL ?? 'FAS';
  // 전체 검색은 페이지마다 정렬이 흔들려 빠지는 과목이 생긴다 — 전체를 훑어 학과 접두어를 모으고, 학과별 검색(작고 안정적)으로 다시 받는다
  const cards: HvCard[] = []; const seen = new Set<string>(); const subjects = new Set<string>();
  const take = (list: HvCard[]) => { for (const c of list) { subjects.add(c.code.split(' ')[0]); if (!seen.has(c.key)) { seen.add(c.key); cards.push(c); } } };
  const q = (query: string, page: number) => `${HV}/search/?q=${encodeURIComponent(query)}&term=${encodeURIComponent(term)}&school=${school}&page=${page}`;
  let empty = 0;
  for (let page = 1; page < 600 && empty < 2; page++) {
    const pageCards = hvCards(await hvGet(q('', page)));
    if (!pageCards.length) { empty++; continue; }
    empty = 0; take(pageCards);
    await new Promise((r) => setTimeout(r, 100));
  }
  for (const subj of subjects) {
    for (let page = 1; page < 60; page++) {
      const pageCards = hvCards(await hvGet(q(subj, page))).filter((c) => c.code.split(' ')[0] === subj);
      if (!pageCards.length) break;
      const before = seen.size; take(pageCards);
      if (seen.size === before && page > 1) break;
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  const out = await harvardCourses(cards, term);
  console.log(`  harvard ${term} ${school}: ${subjects.size} subjects, ${cards.length} courses → ${out.length} sections with times`);
  return out;
}
async function harvardLookup(c: CatalogCourse): Promise<CatalogCourse | null> {
  const term = c.termCode ?? c.term;
  const cards = hvCards(await hvGet(`${HV}/search/?q=${encodeURIComponent(c.code)}&term=${encodeURIComponent(term)}`)).filter((x) => x.code === c.code);
  return tagTerm(await harvardCourses(cards, term), normalizeTermLabel(term)).find((x) => x.id === c.id) ?? null;
}

// ─── 표본 재확인 (agent) ───────────────────────────────────────────────────
export interface CourseSource { schoolId: string; fetch(): Promise<CatalogCourse[]>; lookup?(course: CatalogCourse): Promise<CatalogCourse | null> }

async function stanfordLookup(c: CatalogCourse): Promise<CatalogCourse | null> {
  const subj = c.code.split(' ')[0];
  const prevEnv = process.env.STANFORD_SUBJECTS; process.env.STANFORD_SUBJECTS = subj;
  try { const all = await stanford(); return all.find((x) => x.id === c.id) ?? all.find((x) => x.code === c.code) ?? null; } finally { if (prevEnv === undefined) delete process.env.STANFORD_SUBJECTS; else process.env.STANFORD_SUBJECTS = prevEnv; }
}
async function mitLookup(c: CatalogCourse): Promise<CatalogCourse | null> {
  const res = await fetch(`https://fireroad.mit.edu/courses/lookup/${encodeURIComponent(c.code)}?full=true`, { headers: { 'user-agent': 'AroundU-importer' } });
  if (!res.ok) return null;
  const x = (await res.json()) as { subject_id: string; title: string; schedule?: string; instructors?: string[]; total_units?: number };
  if (!x.schedule) return null;
  const { meetings, location } = mitSchedule(x.schedule);
  return { id: c.id, schoolId: 's_mit', code: x.subject_id, title: x.title, department: x.subject_id.split('.')[0], instructor: x.instructors?.[0], location, meetings, term: c.term, units: x.total_units, url: c.url };
}
async function berkeleyLookup(c: CatalogCourse): Promise<CatalogCourse | null> {
  // 공개 시간표 어댑터가 department 에 학과 이름("offered through")을 넣는다 — 학과 필터 이름과 다르면 찾지 못해 '확인 불가'로 센다
  const idx = await berkeleyIndex();
  if (!idx.subjects.has(c.department) || !idx.terms.has(c.term)) return null;
  return tagTerm(await berkeleyTerm(idx, c.term, [c.department]), c.term).find((x) => x.id === c.id) ?? null;
}

export const COURSE_SOURCES: Record<string, CourseSource> = {
  stanford: { schoolId: 's_stanford', fetch: stanford, lookup: stanfordLookup },
  mit: { schoolId: 's_mit', fetch: mit, lookup: mitLookup },
  berkeley: { schoolId: 's_berkeley', fetch: berkeley, lookup: berkeleyLookup },
  cornell: { schoolId: 's_cornell', fetch: cornell, lookup: cornellLookup },
  umd: { schoolId: 's_umd', fetch: umd, lookup: umdLookup },
  harvard: { schoolId: 's_harvard', fetch: harvard, lookup: harvardLookup },
  usc: { schoolId: 's_usc', fetch: usc, lookup: uscLookup },
  rice: { schoolId: 's_rice', fetch: rice, lookup: riceLookup },
  uw: { schoolId: 's_uw', fetch: uw, lookup: uwLookup },
  caltech: { schoolId: 's_caltech', fetch: caltech, lookup: caltechLookup },
  cmu: { schoolId: 's_cmu', fetch: cmu, lookup: cmuLookup },
  wustl: { schoolId: 's_wustl', fetch: wustl },
  vanderbilt: { schoolId: 's_vanderbilt', fetch: vanderbilt },
  sfsu: { schoolId: 's_sfsu', fetch: sfsu },
};
export const adapters: Record<string, () => Promise<CatalogCourse[]>> = Object.fromEntries(Object.entries(COURSE_SOURCES).map(([k, v]) => [k, v.fetch]));

/** courses_source 문자열 → 소스. 이름(stanford/mit/…) 이거나 "fose:<host>" / "banner9:<host>" / "hcx:<PeopleSoft base>|<institution>" */
export function resolveCourseSource(schoolId: string, spec: string): CourseSource | undefined {
  if (COURSE_SOURCES[spec]) return COURSE_SOURCES[spec];
  const h = /^hcx:(https?:\/\/\S+?)\/?\|([A-Z0-9]+)$/.exec(spec.trim()); if (h) return hcxSource(schoolId, h[1], h[2]);
  const m = /^(fose|banner9):(https?:\/\/[^/\s]+)\/?$/.exec(spec.trim()); if (!m) return undefined;
  return m[1] === 'fose' ? foseSource(schoolId, m[2]) : banner9Source(schoolId, m[2]);
}
