/**
 * 학교별 수업 시간표 소스 — fetch:courses CLI 와 agent 가 같이 쓴다.
 *   stanford  ExploreCourses XML (키 불필요)
 *   mit       FireRoad API (키 불필요)
 *   berkeley  SIS Class API (키 있으면) → 없으면 공개 Class Schedule(classes.berkeley.edu)
 *   cornell   Class Roster 공개 JSON API (classes.cornell.edu/api/2.0, 키 불필요)
 * lookup(course) 는 한 과목을 원본에서 다시 읽어 온다 — agent 의 표본 검증용. 없으면 null.
 */
import type { CatalogCourse } from '@core/api/types';
import { parseDays, parseTime } from '../scripts/csv';

type Meeting = { day: number; start: string; end: string };
const courseId = (schoolId: string, code: string) => `cc_${schoolId.replace('s_', '')}_${code.toLowerCase().replace(/[^a-z0-9]+/g, '')}`;
const uniq = (ms: Meeting[]) => ms.filter((m, i) => ms.findIndex((x) => x.day === m.day && x.start === m.start && x.end === m.end) === i);

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
      out.push({ id: courseId('s_stanford', code), schoolId: 's_stanford', code, title: g('title'), department: g('subject'), instructor: instructor || undefined, location: location || undefined, meetings: uniq(meetings), term: `${term} ${g('year') || ''}`.trim(), units: Number(g('unitsMax')) || undefined });
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
    return { id: courseId('s_mit', c.subject_id), schoolId: 's_mit', code: c.subject_id, title: c.title, department: c.subject_id.split('.')[0], instructor: c.instructors?.[0], location, meetings, term: `${term === 'fall' ? 'Fall' : 'Spring'} ${new Date().getFullYear()}`, units: c.total_units };
  }).filter((c) => c.meetings.length > 0);
}

// ─── Berkeley: 공개 수업 시간표 classes.berkeley.edu (키 불필요) ────────────────
/**
 * 학교가 공개로 운영하는 Class Schedule 사이트를 읽는다. 서버 렌더링이라 검색 결과 HTML 을 그대로 파싱한다.
 *   - term id 는 홈페이지 term 필터에서 "Fall 2026" 같은 라벨로 찾는다 (BERKELEY_TERM, 기본 = 다가오는 학기)
 *   - subject 는 필터의 학과 이름으로 고른다 (BERKELEY_PUBLIC_SUBJECTS, 이름에 쉼표가 있어 | 로 구분)
 *   - 한 과목에 강의(LEC)·토론(DIS)·랩(LAB) 섹션이 여럿이면 강의만 시간표에 넣는다
 *   - 코드는 학생들이 부르는 약칭으로 (COMPSCI 61A → CS 61A) — 내장 예시 목록의 id 와 같아져 그대로 덮어쓴다
 */
const BERKELEY_PUBLIC = 'https://classes.berkeley.edu';
const BERKELEY_ABBR: Record<string, string> = { COMPSCI: 'CS', 'POL SCI': 'POLSCI', 'MCELLBI': 'MCB', 'INTEGBI': 'IB', 'PB HLTH': 'PBHLTH', 'IND ENG': 'IEOR', 'MEC ENG': 'ME', 'CIV ENG': 'CE', 'BIO ENG': 'BIOE', 'COG SCI': 'COGSCI', 'ART': 'ART', 'L & S': 'LS' };
const BERKELEY_DEFAULT_SUBJECTS = ['Computer Science', 'Electrical Engineering and Computer Sciences', 'Data Science, Undergraduate', 'Mathematics', 'Statistics', 'Economics', 'Business Administration, Undergraduate', 'Psychology', 'Biology', 'Molecular and Cell Biology', 'Integrative Biology', 'Chemistry', 'Physics', 'Political Science', 'History', 'English', 'Sociology', 'Art Practice', 'Music', 'Public Health', 'Cognitive Science', 'Industrial Engineering and Operations Research', 'Mechanical Engineering', 'Bioengineering', 'Civil and Environmental Engineering', 'Philosophy', 'Linguistics', 'Film & Media', 'Environmental Science, Policy, and Management', 'Legal Studies', 'Architecture', 'Korean', 'Information Management and Systems'];
const decode = (x: string) => x.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'").replace(/&nbsp;/g, ' ');
const text = (html: string) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
/** 학교 사이트가 가끔 504 를 돌려준다 — 5xx·네트워크 오류는 2s·4s·8s 간격으로 3번 더 시도하고, 요청 사이에 잠깐 쉰다 */
const berkeleyGet = async (url: string): Promise<string> => {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 AroundU-importer' } });
      if (r.ok) { await new Promise((res) => setTimeout(res, 250)); return await r.text(); }
      if (r.status < 500 || attempt >= 3) throw new Error(`${url} → ${r.status}`);
    } catch (e) { if (attempt >= 3) throw e; }
    await new Promise((res) => setTimeout(res, 2000 * 2 ** attempt));
  }
};
function nextTermLabel(): string { const d = new Date(); const y = d.getFullYear(); const m = d.getMonth() + 1; return m >= 10 ? `Spring ${y + 1}` : m >= 3 ? `Fall ${y}` : `Spring ${y}`; }

async function berkeleyPublic(): Promise<CatalogCourse[]> {
  const termLabel = process.env.BERKELEY_TERM ?? nextTermLabel();
  const home = await berkeleyGet(`${BERKELEY_PUBLIC}/`);
  const termId = [...home.matchAll(/href="[^"]*term%3A(\d+)[^"]*"[^>]*>([\s\S]*?)<\/a>/g)].find((m) => text(m[2]).replace(/\s*\(\d+\)\s*$/, '') === termLabel)?.[1];
  if (!termId) throw new Error(`classes.berkeley.edu 에 "${termLabel}" 학기가 없어요 (BERKELEY_TERM 으로 지정)`);
  const subjectIds = new Map([...home.matchAll(/href="\/search\/class\?f%5B0%5D=subject_area%3A(\d+)"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => [text(m[2]).replace(/\s*\(\d+\)\s*$/, ''), m[1]] as const));
  const subjects = (process.env.BERKELEY_PUBLIC_SUBJECTS?.split('|').map((x) => x.trim()) ?? BERKELEY_DEFAULT_SUBJECTS).filter(Boolean);
  const out: CatalogCourse[] = [];
  const byId = new Map<string, CatalogCourse>();
  const sectionOf = new Map<string, string>();
  const field = (row: string, cls: string) => text(row.match(new RegExp(`class="${cls}"[^>]*>([\\s\\S]*?)</div>`))?.[1] ?? '');
  for (const subject of subjects) {
    const sid = subjectIds.get(subject);
    if (!sid) { console.warn(`  ${subject}: 학과 필터에 없음 (건너뜀)`); continue; }
    let added = 0;
    for (let page = 0; page < 60; page++) {
      const html = await berkeleyGet(`${BERKELEY_PUBLIC}/search/class?f%5B0%5D=subject_area%3A${sid}&f%5B1%5D=term%3A${termId}&page=${page}`);
      const rows = html.split(/<div class="views-row[^"]*">/).slice(1);
      if (!rows.length) break;
      for (const row of rows) {
        const component = text(row.match(/class="st--section-code"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '');
        if (component && component !== 'LEC') continue;
        const rawCode = text(row.match(/class="st--section-name"[^>]*>([\s\S]*?)<\/span>/)?.[1] ?? '');
        if (!rawCode) continue;
        const [subj, ...num] = rawCode.split(' ');
        const subjKey = rawCode.replace(/\s+\S+$/, '');
        const code = `${BERKELEY_ABBR[subjKey] ?? BERKELEY_ABBR[subj] ?? subjKey} ${num.length ? rawCode.slice(subjKey.length).trim() : ''}`.trim();
        const title = text(row.match(/class="st--title"[^>]*>\s*<h2>([\s\S]*?)<\/h2>/)?.[1] ?? '');
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
        const first = !byId.has(baseId);
        const id = first ? baseId : `${baseId}_${sectionNo}`;
        if (byId.has(id)) { const prev = byId.get(id)!; prev.meetings = uniq([...prev.meetings, ...meetings]); continue; }
        const course: CatalogCourse = { id, schoolId: 's_berkeley', code, title, department, instructor, location, meetings: uniq(meetings), term: termLabel, units };
        sectionOf.set(id, sectionNo);
        byId.set(id, course); out.push(course); added++;
      }
    }
    console.log(`  ${subject}: ${added}`);
  }
  // 같은 과목에 강의 섹션이 둘 이상이면 제목에 섹션 번호를 붙여 구분한다
  const siblings = new Map<string, number>();
  for (const c of out) { const base = c.id.replace(/_\d{3}$/, ''); siblings.set(base, (siblings.get(base) ?? 0) + 1); }
  for (const c of out) { const base = c.id.replace(/_\d{3}$/, ''); if ((siblings.get(base) ?? 0) > 1) c.title = `${c.title} (Lec ${sectionOf.get(c.id) ?? '001'})`; }
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
/** 학기 slug: FA26 / SP27. 지정이 없으면 다가오는 정규 학기 */
function cornellRoster(): string { const d = new Date(); const y = d.getFullYear() % 100; const m = d.getMonth() + 1; return process.env.CORNELL_ROSTER ?? (m >= 10 ? `SP${y + 1}` : m >= 3 ? `FA${y}` : `SP${y}`); }
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
      out.push({ id, schoolId: 's_cornell', code, title: seen.size > 1 && id !== baseId ? `${c.titleLong} (Lec ${sec.section})` : c.titleLong, department: c.subject, instructor, location, meetings: uniq(meetings), term: roster, units: g.unitsMinimum });
    }
  }
  // 섹션이 둘 이상인 과목은 첫 섹션 제목에도 번호를 붙인다
  for (const c of out) if (out.some((o) => o.id.startsWith(`${c.id}_`))) c.title = `${c.title} (Lec 001)`;
  return out;
}
async function cornell(): Promise<CatalogCourse[]> {
  const roster = cornellRoster();
  const res = await fetch(`https://classes.cornell.edu/api/2.0/config/subjects.json?roster=${roster}`, { headers: { 'user-agent': 'AroundU-importer' } });
  if (!res.ok) throw new Error(`cornell subjects ${roster} → ${res.status}`);
  const subjects = ((await res.json()) as { data?: { subjects?: { value: string }[] } }).data?.subjects?.map((s) => s.value) ?? [];
  const out: CatalogCourse[] = [];
  for (const subj of subjects) { out.push(...(await cornellSubject(roster, subj))); await new Promise((r) => setTimeout(r, 120)); }
  console.log(`  cornell ${roster}: ${subjects.length} subjects, ${out.length} lectures`);
  return out;
}
async function cornellLookup(c: CatalogCourse): Promise<CatalogCourse | null> {
  return (await cornellSubject(c.term, c.department)).find((x) => x.id === c.id) ?? null;
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
  return { id: c.id, schoolId: 's_mit', code: x.subject_id, title: x.title, department: x.subject_id.split('.')[0], instructor: x.instructors?.[0], location, meetings, term: c.term, units: x.total_units };
}
async function berkeleyLookup(c: CatalogCourse): Promise<CatalogCourse | null> {
  const subjectName = c.department; // 공개 시간표 어댑터가 department 에 학과 이름을 넣는다
  const prevEnv = process.env.BERKELEY_PUBLIC_SUBJECTS; process.env.BERKELEY_PUBLIC_SUBJECTS = subjectName;
  try { return (await berkeleyPublic()).find((x) => x.id === c.id) ?? null; } finally { if (prevEnv === undefined) delete process.env.BERKELEY_PUBLIC_SUBJECTS; else process.env.BERKELEY_PUBLIC_SUBJECTS = prevEnv; }
}

export const COURSE_SOURCES: Record<string, CourseSource> = {
  stanford: { schoolId: 's_stanford', fetch: stanford, lookup: stanfordLookup },
  mit: { schoolId: 's_mit', fetch: mit, lookup: mitLookup },
  berkeley: { schoolId: 's_berkeley', fetch: berkeley, lookup: berkeleyLookup },
  cornell: { schoolId: 's_cornell', fetch: cornell, lookup: cornellLookup },
};
export const adapters: Record<string, () => Promise<CatalogCourse[]>> = Object.fromEntries(Object.entries(COURSE_SOURCES).map(([k, v]) => [k, v.fetch]));
