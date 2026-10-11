/**
 * 수업 시간표 가져오기 CLI — 소스 구현은 server/sources/courses.ts
 *
 *   npm run fetch:courses -- stanford      # ExploreCourses XML, 키 불필요
 *   npm run fetch:courses -- mit           # FireRoad API, 키 불필요
 *   npm run fetch:courses -- berkeley      # SIS 키 없으면 공개 시간표(classes.berkeley.edu)
 *   FETCH_DRY=1 → DB 에 넣지 않고 server/.data/courses-<school>.csv 만 만든다
 *
 * UCLA·SFSU 는 공개 API 가 없어서 CSV → import:courses 로 넣는다.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStore } from '../store';
import { adapters } from '../sources/courses';

// ─── 실행 ───────────────────────────────────────────────────────────────────
const which = process.argv[2];
if (!which || !adapters[which]) { console.error(`usage: npm run fetch:courses -- <${Object.keys(adapters).join('|')}>   (UCLA·SFSU 는 CSV → import:courses)`); process.exit(1); }

console.log(`${which} 가져오는 중…`);
const courses = await adapters[which]();
const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.data');
mkdirSync(dataDir, { recursive: true });
const rows = courses.flatMap((c) => c.meetings.map((m) => [c.schoolId, c.code, c.title, c.department, c.instructor ?? '', c.location ?? '', ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'][m.day], m.start, m.end, c.term, c.units ?? ''].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')));
writeFileSync(path.join(dataDir, `courses-${which}.csv`), ['school_id,code,title,department,instructor,location,days,start,end,term,units', ...rows].join('\n'));
console.log(`${courses.length}개 과목 (${rows.length} meeting rows) → ${dataDir}/courses-${which}.csv`);
if (process.env.FETCH_DRY !== '1') { const store = createStore(); await store.init(); await store.replaceCatalog(courses[0]?.schoolId ?? `s_${which}`, courses); console.log('DB 반영 완료 (학교 목록 교체)'); }
process.exit(0);
