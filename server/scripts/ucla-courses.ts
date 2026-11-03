/**
 * UCLA 수업 시간 파일 — sa.ucla.edu/ro/Public/SOC (공개, 로그인 없음). 과목마다 요청이 하나라 한 번에 다 읽지 않고 하루 조금씩:
 *   npm run -s ucla-courses -- [요청 수=300]
 * 진행 상황은 server/data/collected/s_ucla.courses-progress.json (학기별로 끝낸 전공). 수업 파일 s_ucla.courses.json 에는
 * 끝낸 전공의 그 학기 수업만 바꿔 넣고 나머지는 그대로 둔다(모은 데이터는 지우지 않는다). 요청 사이 0.7초.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { uclaSummaryToCourses, type UclaCourseRef } from '../sources/courses';
import type { CatalogCourse } from '@core/api/types';

const DIR = path.join(import.meta.dirname, '..', 'data', 'collected');
const OUT = path.join(DIR, 's_ucla.courses.json'); const PROG = path.join(DIR, 's_ucla.courses-progress.json');
const SOC = 'https://sa.ucla.edu/ro/Public/SOC';
const TERMS: { code: string; label: string }[] = [{ code: '26F', label: 'Fall 2026' }, { code: '27W', label: 'Winter 2027' }];
const FLAGS = JSON.stringify({ enrollment_status: 'O,W,C,X,T,S', advanced: 'y', meet_days: 'M,T,W,R,F,S,U', start_time: '1:00 am', end_time: '11:00 pm', meet_locations: null, meet_units: null, instructor: null, class_career: null, impacted: null, enrollment_restrictions: null, enforced_requisites: null, individual_studies: null, summer_session: null });
let budget = Number(process.argv[2] ?? 300);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function get(url: string): Promise<string> {
  budget--;
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url, { headers: { 'user-agent': 'AroundU-class-times', 'x-requested-with': 'XMLHttpRequest' }, signal: AbortSignal.timeout(45000) }); if (r.ok) { await sleep(700); return await r.text(); } if (r.status < 500) throw new Error(`${r.status}`); } catch (e) { if (i === 2) throw e; }
    await sleep(3000);
  }
  throw new Error('unreachable');
}
const q = (o: Record<string, string>) => new URLSearchParams(o).toString();
interface Ref extends UclaCourseRef { model: string }
function refsOf(html: string): Ref[] {
  const out: Ref[] = [];
  for (const m of html.matchAll(/AddToCourseData\("([A-Z0-9]+)",(\{[^)]*\})\)/g)) {
    const model = m[2]; const d = JSON.parse(model) as { SubjectAreaCode: string; CatalogNumber: string; Path: string };
    const title = /-title"[^>]*>([^<]*)<\/button>/.exec(html.slice(html.indexOf(`id="${m[1]}-title"`)))?.[1]?.replace(/^\s*\S+\s+-\s+/, '').trim() ?? '';
    if (!out.some((r) => r.path === d.Path)) out.push({ subject: d.SubjectAreaCode.trim(), catalog: d.CatalogNumber.trim(), title: title.replace(/&amp;/g, '&'), path: d.Path, model });
  }
  return out;
}
async function subjects(): Promise<string[]> {
  const html = await get(`${SOC}`);
  const m = /SearchPanelSetup\('(\[\{&quot;label&quot;[\s\S]*?\}\])'/.exec(html); if (!m) throw new Error('UCLA subject list not found');
  return (JSON.parse(m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&')) as { value: string }[]).map((s) => s.value.replace(/\\u0026/g, '&').trim());
}
async function subjectCourses(term: string, label: string, subj: string): Promise<CatalogCourse[]> {
  const first = await get(`${SOC}/Results?${q({ t: term, sBy: 'subject', subj, catlg: '', cls_no: '', btnIsInIndex: 'btn_inIndex' })}`);
  const refs = refsOf(first); const pages = Number(/id="pageCount" value="(\d+)"/.exec(first)?.[1] ?? 1);
  const model = JSON.stringify({ subj_area_cd: subj, search_by: 'Subject', term_cd: term, ActiveEnrollmentFlag: 'n', HasData: 'True' });
  for (let p = 2; p <= pages; p++) refs.push(...refsOf(await get(`${SOC}/Results/CourseTitlesView?${q({ search_by: 'subject', model, pageNumber: String(p), filterFlags: FLAGS })}`)).filter((r) => !refs.some((x) => x.path === r.path)));
  const out: CatalogCourse[] = [];
  for (const r of refs) out.push(...uclaSummaryToCourses(await get(`${SOC}/Results/GetCourseSummary?${q({ model: r.model, FilterFlags: FLAGS })}`), r, term, label));
  return out;
}

const prog: Record<string, string[]> = existsSync(PROG) ? JSON.parse(readFileSync(PROG, 'utf8')) : {};
let all: CatalogCourse[] = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : [];
const subs = await subjects(); let did = 0;
for (const t of TERMS) {
  const done = new Set(prog[t.code] ?? []);
  for (const subj of subs) {
    if (done.has(subj)) continue;
    if (budget < 60) break; // 큰 전공 하나(과목 50개 정도)를 끝낼 만큼 남았을 때만 시작
    const got = await subjectCourses(t.code, t.label, subj);
    all = [...all.filter((c) => !(c.termCode === t.code && c.department === subj)), ...got];
    done.add(subj); prog[t.code] = [...done]; did++;
    writeFileSync(OUT, `${JSON.stringify(all, null, 1)}\n`); writeFileSync(PROG, `${JSON.stringify(prog, null, 1)}\n`);
    console.log(`  ${t.code} ${subj}: ${got.length} lectures (budget left ${budget})`);
  }
}
console.log(`ucla-courses: ${did} subjects this run, ${all.length} classes in file; progress ${TERMS.map((t) => `${t.code} ${(prog[t.code] ?? []).length}/${subs.length}`).join(', ')}`);
