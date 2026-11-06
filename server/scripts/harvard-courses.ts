/**
 * Harvard 수업 시간 파일 — my.harvard.edu 공개 과목 검색 (로그인 없음). 학기당 FAS 과목이 3천 개 가까이라
 * 한 번에 다 읽으면 한 사이트에 수천 번 요청이 간다 → 실행마다 정해진 요청 수만큼만 (UCLA 배치와 같은 방식).
 *   npm run -s harvard-courses -- [요청 수=400]
 * 진행 상황: server/data/collected/s_harvard.courses-progress.json
 *   { "<학기>": { "subjects": [...전체 검색에서 모은 학과 접두어], "scanned": true, "done": [...끝낸 학과] } }
 * 1) 학기마다 처음 한 번: 전체 검색을 넘겨 학과 접두어를 모은다(쪽마다 1번).
 * 2) 그다음 학과마다: 학과 검색(쪽마다 1번) + 과목마다 분반 조각 1번. 끝낸 학과의 그 학기 수업만 파일에서 바꿔 넣는다.
 * 모은 데이터는 지우지 않는다(다른 학과·학기는 그대로). 요청 사이 0.15초 이상.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { HV, hvGet, hvCards, harvardCourses, hvTermLabels, tagTerm, type HvCard } from '../sources/courses';
import { normalizeTermLabel } from '@core/lib/terms';
import type { CatalogCourse } from '@core/api/types';

const DIR = path.join(import.meta.dirname, '..', 'data', 'collected');
const OUT = path.join(DIR, 's_harvard.courses.json'); const PROG = path.join(DIR, 's_harvard.courses-progress.json');
const SCHOOL = process.env.HARVARD_SCHOOL ?? 'FAS';
let budget = Number(process.argv[2] ?? 400);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const get = async (url: string) => { budget--; const h = await hvGet(url); await sleep(150); return h; };
const q = (term: string, query: string, page: number) => `${HV}/search/?q=${encodeURIComponent(query)}&term=${encodeURIComponent(term)}&school=${SCHOOL}&page=${page}`;

type Prog = Record<string, { subjects: string[]; scanned: boolean; done: string[]; scanPage?: number }>;
const prog: Prog = existsSync(PROG) ? JSON.parse(readFileSync(PROG, 'utf8')) : {};
let all: CatalogCourse[] = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : [];
const save = () => { writeFileSync(OUT, `[\n${all.map((c) => JSON.stringify(c)).join(',\n')}\n]\n`); writeFileSync(PROG, `${JSON.stringify(prog, null, 1)}\n`); };
let did = 0;

for (const term of hvTermLabels()) {
  const label = normalizeTermLabel(term);
  const p = (prog[term] ??= { subjects: [], scanned: false, done: [] });
  // 1) 학과 접두어 모으기 — 쪽 번호를 기억해 두고 다음 실행에서 이어 간다
  let empty = 0;
  for (let page = p.scanPage ?? 1; !p.scanned && budget > 0; page++) {
    const cards = hvCards(await get(q(term, '', page)));
    if (!cards.length) { if (++empty >= 2 || page > 600) { p.scanned = true; break; } continue; }
    empty = 0; for (const c of cards) { const s = c.code.split(' ')[0]; if (!p.subjects.includes(s)) p.subjects.push(s); }
    p.scanPage = page + 1; save();
  }
  if (!p.scanned) break;
  if (!p.subjects.length) { console.log(`  harvard ${term}: no courses listed yet`); continue; }
  // 2) 학과마다
  for (const subj of p.subjects) {
    if (p.done.includes(subj)) continue;
    if (budget < 60) break; // 큰 학과 하나를 끝낼 만큼 남았을 때만 시작
    const cards: HvCard[] = []; const seen = new Set<string>();
    for (let page = 1; page < 60; page++) {
      const got = hvCards(await get(q(term, subj, page))).filter((c) => c.code.split(' ')[0] === subj);
      const before = seen.size; for (const c of got) if (!seen.has(c.key)) { seen.add(c.key); cards.push(c); }
      if (!got.length || (seen.size === before && page > 1)) break;
    }
    budget -= cards.filter((c) => c.sectionsUrl).length;
    const fresh = tagTerm(await harvardCourses(cards, term), label);
    all = [...all.filter((c) => !(c.term === label && c.code.split(' ')[0] === subj)), ...fresh];
    p.done.push(subj); did++; save();
    console.log(`  ${term} ${subj}: ${cards.length} courses → ${fresh.length} sections with times (budget left ${budget})`);
  }
  if (budget < 60) break;
}
console.log(`harvard-courses: ${did} subjects this run, ${all.length} classes in file; ${hvTermLabels().map((t) => `${t} ${prog[t]?.scanned ? `${prog[t].done.length}/${prog[t].subjects.length}` : `scanning (page ${prog[t]?.scanPage ?? 1})`}`).join(', ')}`);
