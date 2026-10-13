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
import type { CatalogCourse } from '@core/api/types';
import { parseDays, parseTime } from '../scripts/csv';
import { catalogTermLabels, currentTerm, normalizeTermLabel, termLabel, termSlug } from '@core/lib/terms';

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
async function stanford(): Promise<CatalogCourse[]> {
  const term = process.env.STANFORD_TERM ?? 'Autumn'; // Autumn | Winter | Spring | Summer
  const subjects = (process.env.STANFORD_SUBJECTS ?? 'CS,MATH,STATS,ECON,PSYCH,BIO,CHEM,PHYSICS,EE,ME,MS&E,ENGR,POLISCI,HISTORY,ENGLISH,MUSIC,ARTSTUDI,SYMSYS,PWR,KORLANG').split(',');
  const out: CatalogCourse[] = [];
  for (const subj of subjects) {
    const url = `https://explorecourses.stanford.edu/search?view=xml-20200810&filter-coursestatus-Active=on&filter-term-${term}=on&q=${encodeURIComponent(subj)}`;
    const xml = await (await fetch(url, { headers: { 'user-agent': 'AroundU-importer' } })).text();
    for (const c of xml.matchAll(/<course>([\s\S]*?)<\/course>/g)) {
      const b = c[1];
      const unesc = (x: string) => x.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
      const g = (tag: string, src = b) => unesc(src.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1]?.trim() ?? '');
      const subject = g('subject'); if (subject !== subj) continue;
      const code = `${subject} ${g('code')}`;
      const meetings: Meeting[] = []; let location = ''; let instructor = '';
      // 섹션이 여러 개(강의 + 토론·랩)면 강의(LEC) 섹션 하나만 시간표에 넣는다. 강의가 없으면 첫 섹션.
      const sections = [...b.matchAll(/<section>([\s\S]*?)<\/section>/g)].map((m) => m[1]);
      const lecture = sections.find((sec) => /<component>LEC<\/component>/.test(sec)) ?? sections[0] ?? b;
      for (const s of lecture.matchAll(/<schedule>([\s\S]*?)<\/schedule>/g)) {
        const days = g('days', s[1]); const st = g('startTime', s[1]); const en = g('endTime', s[1]);
        if (!days || !st || !en) continue;
        location ||= g('location', s[1]);
        instructor ||= g('name', s[1]);
        for (const day of parseDays(days)) meetings.push({ day, start: parseTime(st.replace(/:00 /, ' ')), end: parseTime(en.replace(/:00 /, ' ')) });
      }
      if (!meetings.length) continue;
      out.push({ id: courseId('s_stanford', code), schoolId: 's_stanford', code, title: g('title'), department: g('subject'), instructor: instructor || undefined, location: location || undefined, meetings: uniq(meetings), term: `${term} ${g('year') || ''}`.trim(), units: Number(g('unitsMax')) || undefined, url: `https://explorecourses.stanford.edu/search?view=catalog&q=${encodeURIComponent(code)}` });
    }
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
  const term = process.env.MIT_TERM ?? 'fall';
  return all.filter((c) => c.schedule && (term === 'fall' ? c.offered_fall !== false : c.offered_spring !== false)).map((c) => {
    const { meetings, location } = mitSchedule(c.schedule!);
    return { id: courseId('s_mit', c.subject_id), schoolId: 's_mit', code: c.subject_id, title: c.title, department: c.subject_id.split('.')[0], instructor: c.instructors?.[0], location, meetings, term: `${term === 'fall' ? 'Fall' : 'Spring'} ${new Date().getFullYear()}`, units: c.total_units, url: `https://student.mit.edu/catalog/search.cgi?search=${encodeURIComponent(c.subject_id)}` };
  }).filter((c) => c.meetings.length > 0);
}

// ─── Berkeley: 공개 수업 시간표 classes.berkeley.edu (키 불필요) ────────────────
/**
 * 학교가 공개로 운영하는 Class Schedule 사이트를 읽는다. 서버 렌더링이라 검색 결과 HTML 을 그대로 파싱한다.
 *   - 학기: 지금 학기 + 다음 학기 (BERKELEY_TERM="Fall 2026|Spring 2027" 로 지정 가능). 다음 학기가 아직 안 올라왔으면 건너뛴다
 *   - subject: 그 학기 검색 결과의 학과 필터에 있는 학과 전부 (Fall 2026 기준 177개 · BERKELEY_PUBLIC_SUBJECTS 로 좁힐 수 있다, 이름에 쉼표가 있어 | 로 구분)
 *     필터에 적힌 줄 수만큼만 페이지를 읽는다 (한 페이지 18줄) — 수업 없는 학과·빈 마지막 페이지를 요청하지 않는다
 *   - 한 과목에 강의(LEC)·토론(DIS)·랩(LAB) 섹션이 여럿이면 강의만 시간표에 넣는다 (세미나 SEM 수업도 넣는다)
 *   - 코드는 학생들이 부르는 약칭으로 (COMPSCI 61A → CS 61A) — 내장 예시 목록의 id 와 같아져 그대로 덮어쓴다
 * 요청마다 250ms 쉬고 5xx·타임아웃은 다시 시도한다 — 두 학기 전부면 요청 900번 안팎 (워커가 하루 한 번).
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
const berkeleyTermSubjects = (termId: string) => remembered(`subjects:${termId}`, () => berkeleyTermSubjectsFresh(termId), (x) => x.size > 0);
async function berkeleyTermSubjectsFresh(termId: string): Promise<Map<string, { id: string; count: number }>> {
  const out = new Map<string, { id: string; count: number }>();
  // 학기 전체 검색 첫 페이지는 무거워서 사이트가 바쁘면 504 가 잦다 — 못 읽어도 실패로 보지 않고 홈페이지 학과 전부로 간다
  let html: string;
  try { html = await berkeleyGet(`${BERKELEY_PUBLIC}/search/class?f%5B0%5D=term%3A${termId}`); } catch (e) { console.warn(`  berkeley term ${termId} 학과 필터 못 읽음 (${(e as Error).message}) → 홈페이지 학과 전부`); return out; }
  for (const m of html.matchAll(/<a href="[^"]*subject_area%3A(\d+)"[^>]*data-drupal-facet-item-count="(\d+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    out.set(text(m[3]).replace(/\s*\(\d+\)\s*$/, ''), { id: m[1], count: Number(m[2]) });
  }
  return out;
}
const berkeleyTermLabels = () => process.env.BERKELEY_TERM?.split('|').map((x) => x.trim()).filter(Boolean) ?? catalogTermLabels();

/** 한 학기 · 주어진 학과들의 강의. id 는 학기 꼬리표 붙이기 전 */
async function berkeleyTerm(idx: BerkeleyIndex, termLabel: string, only?: string[]): Promise<CatalogCourse[]> {
  const termId = idx.terms.get(termLabel);
  if (!termId) throw new Error(`classes.berkeley.edu 에 "${termLabel}" 학기가 없어요 (BERKELEY_TERM 으로 지정)`);
  // 그 학기에 수업이 있는 학과와 줄 수. 필터를 못 읽으면 홈페이지 학과 전부를 빈 페이지가 나올 때까지 읽는다
  const termSubjects = await berkeleyTermSubjects(termId);
  const counted = termSubjects.size > 0;
  const lookupSubject = (name: string) => termSubjects.get(name) ?? (counted ? undefined : idx.subjects.has(name) ? { id: idx.subjects.get(name)!, count: Infinity } : undefined);
  const subjects = only ?? (counted ? [...termSubjects.keys()] : [...idx.subjects.keys()]);
  const out: CatalogCourse[] = [];
  const byId = new Map<string, CatalogCourse>();
  const sectionOf = new Map<string, string>();
  const field = (row: string, cls: string) => text(row.match(new RegExp(`class="${cls}"[^>]*>([\\s\\S]*?)</div>`))?.[1] ?? '');
  /** 교차 개설 과목이 두 학과 검색에 같은 코드·섹션으로 또 나오면 한 줄로 */
  const bySection = new Map<string, string>();
  let withClasses = 0;
  const readSubject = async (subject: string, sub: { id: string; count: number }) => {
    let added = 0; let read = 0;
    for (let page = 0; page < 200 && read < sub.count; page++) {
      const html = await berkeleyGet(`${BERKELEY_PUBLIC}/search/class?f%5B0%5D=subject_area%3A${sub.id}&f%5B1%5D=term%3A${termId}&page=${page}`);
      const rows = html.split(/<div class="views-row[^"]*">/).slice(1);
      if (!rows.length) break;
      read += rows.length;
      for (const row of rows) {
        const component = text(row.match(/class="st--section-code"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '');
        if (component && component !== 'LEC' && component !== 'SEM') continue; // 강의·세미나만 (토론·랩 섹션은 빼고)
        const rawCode = text(row.match(/class="st--section-name"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '');
        if (!rawCode) continue;
        const [subj, ...num] = rawCode.split(' ');
        const subjKey = rawCode.replace(/\s+\S+$/, '');
        const code = `${BERKELEY_ABBR[subjKey] ?? BERKELEY_ABBR[subj] ?? subjKey} ${num.length ? rawCode.slice(subjKey.length).trim() : ''}`.trim();
        const title0 = text(row.match(/class="st--title"[^>]*>\s*<h2>([\s\S]*?)<\/h2>/)?.[1] ?? '');
        const title = BERKELEY_FORMERLY[code] && title0 ? `${title0} (formerly ${BERKELEY_FORMERLY[code]})` : title0;
        const contentPath = /href="(\/content\/[^"]+)"/.exec(row)?.[1];
        const instructor = field(row, 'st--instructors') || undefined;
        const department = text(row.match(/offered through[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? '') || subject;
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
        // 강의 섹션이 여러 개인 과목(KOREAN 1A 001~007 등)은 섹션마다 한 줄 — 학생이 자기 섹션을 고른다. 첫 섹션은 기본 id 로 내장 예시를 덮어쓴다.
        const sectionNo = text(row.match(/class="st--section-count"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '') || '001';
        const baseId = courseId('s_berkeley', code);
        const same = bySection.get(`${baseId}#${sectionNo}`);
        if (same) { const prev = byId.get(same)!; prev.meetings = uniq([...prev.meetings, ...meetings]); continue; }
        const first = !byId.has(baseId);
        const id = first ? baseId : `${baseId}_${sectionNo}`;
        if (byId.has(id)) { const prev = byId.get(id)!; prev.meetings = uniq([...prev.meetings, ...meetings]); continue; }
        bySection.set(`${baseId}#${sectionNo}`, id);
        const course: CatalogCourse = { id, schoolId: 's_berkeley', code, title, department, instructor, location, meetings: uniq(meetings), term: termLabel, units, url: contentPath ? `${BERKELEY_PUBLIC}${contentPath}` : undefined };
        sectionOf.set(id, sectionNo);
        byId.set(id, course); out.push(course); added++;
      }
    }
    if (added) { withClasses++; console.log(`  ${termLabel} · ${subject}: ${added}`); }
  };
  const failed: string[] = [];
  for (const subject of subjects) {
    const sub = lookupSubject(subject);
    if (!sub) { if (only) console.warn(`  ${termLabel} · ${subject}: 이 학기 학과 필터에 없음 (건너뜀)`); continue; }
    try { await readSubject(subject, sub); } catch (e) { console.warn(`  ${termLabel} · ${subject}: ${(e as Error).message} — 끝에 한 번 더`); failed.push(subject); }
  }
  // 사이트가 잠깐 바빠(504) 못 읽은 학과는 1분 쉬었다가 한 번 더. 그래도 안 되면 이번 가져오기는 실패로 끝낸다 — 학과 하나가 통째로 빠진 목록을 반영하지 않는다
  if (failed.length) {
    await new Promise((res) => setTimeout(res, 60_000));
    for (const subject of failed) await readSubject(subject, lookupSubject(subject)!);
  }
  console.log(`  berkeley ${termLabel}: ${withClasses}/${subjects.length} subjects with lectures, ${out.length} lectures`);
  // 같은 과목에 강의 섹션이 둘 이상이면 제목에 섹션 번호를 붙여 구분한다
  const siblings = new Map<string, number>();
  for (const c of out) { const base = c.id.replace(/_\d{3}$/, ''); siblings.set(base, (siblings.get(base) ?? 0) + 1); }
  for (const c of out) { const base = c.id.replace(/_\d{3}$/, ''); if ((siblings.get(base) ?? 0) > 1) c.title = `${c.title} (Lec ${sectionOf.get(c.id) ?? '001'})`; }
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
/** 학기 slug(FA26 / SP27): 지정이 없으면 지금 학기(날짜 기준) 로스터, 아직 없으면 공개된 것 중 가장 최근 정규 학기(FA/SP) — 안 올라온 학기를 추측하지 않는다 */
async function cornellRoster(): Promise<string> {
  if (process.env.CORNELL_ROSTER) return process.env.CORNELL_ROSTER;
  const res = await fetch('https://classes.cornell.edu/api/2.0/config/rosters.json', { headers: { 'user-agent': 'AroundU-importer' } });
  if (!res.ok) throw new Error(`cornell rosters → ${res.status}`);
  const rosters = ((await res.json()) as { data?: { rosters?: { slug: string }[] } }).data?.rosters?.map((r) => r.slug) ?? [];
  const regular = rosters.filter((r) => /^(FA|SP)\d{2}$/.test(r));
  if (!regular.length) throw new Error('cornell: no FA/SP roster published');
  const cur = currentTerm(); const want = `${cur.season === 'Fall' ? 'FA' : 'SP'}${String(cur.year).slice(2)}`;
  return regular.includes(want) ? want : regular[regular.length - 1];
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
  const roster = await cornellRoster();
  const res = await fetch(`https://classes.cornell.edu/api/2.0/config/subjects.json?roster=${roster}`, { headers: { 'user-agent': 'AroundU-importer' } });
  if (!res.ok) throw new Error(`cornell subjects ${roster} → ${res.status}`);
  const subjects = ((await res.json()) as { data?: { subjects?: { value: string }[] } }).data?.subjects?.map((s) => s.value) ?? [];
  const out: CatalogCourse[] = [];
  for (const subj of subjects) { out.push(...(await cornellSubject(roster, subj))); await new Promise((r) => setTimeout(r, 120)); }
  console.log(`  cornell ${roster}: ${subjects.length} subjects, ${out.length} lectures`);
  return out;
}
async function cornellLookup(c: CatalogCourse): Promise<CatalogCourse | null> {
  return (await cornellSubject(c.termCode ?? c.term, c.department)).find((x) => x.id === c.id) ?? null;
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
  /** 지금 학기 (원본 코드 + "Fall 2026" 라벨) */
  async function term(): Promise<{ code: string; label: string }> {
    const html = await (await fetch(`${host}/`, { headers: UAH })).text();
    const opts = [...html.matchAll(/<option value="(\d{4,6})"[^>]*>([^<]+)<\/option>/g)].map((m) => ({ code: m[1], label: m[2].trim() }));
    if (process.env.FOSE_SRCDB) { const o = opts.find((x) => x.code === process.env.FOSE_SRCDB); return { code: process.env.FOSE_SRCDB, label: o ? labelOf(o.label) : process.env.FOSE_SRCDB }; }
    const t = pickTerm(opts, (o) => o.label); if (!t) throw new Error(`${host}: no term options on index page`); return { code: t.code, label: labelOf(t.label) };
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
      const { code: srcdb, label } = await term();
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
      return courses;
    },
    async lookup(c) { const srcdb = c.termCode ?? c.term; const rows = await search(srcdb, [{ field: 'keyword', value: c.code }]); return rowsToCourses(rows.filter((r) => r.code === c.code), srcdb, c.term).find((x) => x.id === c.id) ?? null; },
  };
}

// Banner 9 (Ellucian StudentRegistrationSsb 공개 검색: registrationssb.ucr.edu …)
const decodeEntities = (x: string) => x.replace(/&amp;/g, '&').replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"').trim();
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
      out.push({ id, schoolId, code, title: s.courseTitle, department: s.subjectDescription ? decodeEntities(s.subjectDescription) : s.subject, instructor: s.faculty?.[0]?.displayName, location, meetings: uniq(meetings), term: label, termCode, units: s.creditHours ?? s.creditHourLow, url: `${H}/classSearch/classSearch` });
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
function hvTermLabel(): string { if (process.env.HARVARD_TERM) return process.env.HARVARD_TERM; const c = currentTerm(); return `${c.year} ${c.season}`; }
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
  const term = hvTermLabel(); const school = process.env.HARVARD_SCHOOL ?? 'FAS';
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
  return (await harvardCourses(cards, term)).find((x) => x.id === c.id) ?? null;
}

// ─── 표본 재확인 (agent) ───────────────────────────────────────────────────
export interface CourseSource { schoolId: string; fetch(): Promise<CatalogCourse[]>; lookup?(course: CatalogCourse): Promise<CatalogCourse | null> }

async function stanfordLookup(c: CatalogCourse): Promise<CatalogCourse | null> {
  const subj = c.code.split(' ')[0];
  const prevEnv = process.env.STANFORD_SUBJECTS; process.env.STANFORD_SUBJECTS = subj;
  try { return (await stanford()).find((x) => x.code === c.code) ?? null; } finally { if (prevEnv === undefined) delete process.env.STANFORD_SUBJECTS; else process.env.STANFORD_SUBJECTS = prevEnv; }
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
};
export const adapters: Record<string, () => Promise<CatalogCourse[]>> = Object.fromEntries(Object.entries(COURSE_SOURCES).map(([k, v]) => [k, v.fetch]));

/** courses_source 문자열 → 소스. 이름(stanford/mit/…) 이거나 "fose:<host>" / "banner9:<host>" */
export function resolveCourseSource(schoolId: string, spec: string): CourseSource | undefined {
  if (COURSE_SOURCES[spec]) return COURSE_SOURCES[spec];
  const m = /^(fose|banner9):(https?:\/\/[^/\s]+)\/?$/.exec(spec.trim()); if (!m) return undefined;
  return m[1] === 'fose' ? foseSource(schoolId, m[2]) : banner9Source(schoolId, m[2]);
}
