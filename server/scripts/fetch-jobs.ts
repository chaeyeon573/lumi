/**
 * 미국 전역 학생 채용 파일 만들기 — server/data/job-boards.csv(회사 → 공개 채용 게시판)를 한 회사에 한 번씩 읽어
 * server/data/collected/jobs-us.json 에 저장한다. DB 에 넣지 않는다 (Railway 비용 없음).
 *   npm run -s jobs   (= tsx server/scripts/fetch-jobs.ts)
 * 한 게시판이 실패해도 지난번 그 회사 공고는 지우지 않는다 (owner 2026-11-03: 모은 데이터는 지우지 않는다 — 단, 게시판이 정상 응답했는데 빠진 공고는 마감된 것이라 뺀다).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { boardUrl, parseBoard, toStudentJobs, fetchWorkday, fetchAmazon, splitRepeatJobs, type JobPlatform, type StudentJob } from '../sources/jobboards';

const dataDir = path.join(import.meta.dirname, '..', 'data');
const OUT = path.join(dataDir, 'collected', 'jobs-us.json');

function readBoards(): { platform: JobPlatform; token: string; company: string; sector?: string }[] {
  const lines = readFileSync(path.join(dataDir, 'job-boards.csv'), 'utf8').trim().split('\n');
  const head = lines[0].split(',');
  return lines.slice(1).map((l) => { const v = l.split(','); const r = Object.fromEntries(head.map((h, i) => [h, (v[i] ?? '').trim()])); return { platform: r.platform as JobPlatform, token: r.token, company: r.company, sector: r.sector }; })
    .filter((b) => ['greenhouse', 'lever', 'ashby', 'workday', 'amazon'].includes(b.platform) && b.token);
}

const prev: StudentJob[] = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')).jobs ?? [] : [];
const boards = readBoards();
const jobs: StudentJob[] = []; let ok = 0; const failed: string[] = [];
for (const b of boards) {
  try {
    if (b.platform === 'workday') { jobs.push(...toStudentJobs(await fetchWorkday(b.token), b)); ok++; }
    else if (b.platform === 'amazon') { jobs.push(...toStudentJobs(await fetchAmazon(), b)); ok++; }
    else {
      const r = await fetch(boardUrl(b.platform, b.token), { headers: { 'user-agent': 'AroundU-student-jobs', accept: 'application/json' } });
      if (!r.ok) throw new Error(String(r.status));
      jobs.push(...toStudentJobs(parseBoard(b.platform, await r.json()), b)); ok++;
    }
  } catch (e) {
    failed.push(`${b.platform}:${b.token} (${(e as Error).message})`);
    jobs.push(...prev.filter((j) => j.source === b.platform && j.id.startsWith(`job_${b.platform}_${b.token}_`.toLowerCase().replace(/[^a-z0-9_]+/g, '_'))));
  }
  await new Promise((res) => setTimeout(res, 300));
}
const sorted = [...new Map(jobs.map((j) => [j.id, j])).values()].sort((a, b) => a.company.localeCompare(b.company) || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
// 채용 번호만 다른 같은 자리는 하나만 — 나머지는 지우지 않고 jobs-us.dropped.json 에
const { keep: uniq, repeats } = splitRepeatJobs(sorted);
if (repeats.length) {
  const DROP = path.join(dataDir, 'collected', 'jobs-us.dropped.json'); const at = new Date().toISOString().slice(0, 10);
  const old: { id: string }[] = existsSync(DROP) ? JSON.parse(readFileSync(DROP, 'utf8')) : [];
  writeFileSync(DROP, `${JSON.stringify([...new Map([...old, ...repeats.map((j) => ({ ...j, droppedAt: at }))].map((j) => [j.id, j])).values()], null, 1)}\n`);
}
writeFileSync(OUT, `${JSON.stringify({ collectedAt: new Date().toISOString(), boards: boards.length, boardsOk: ok, jobs: uniq }, null, 1)}\n`);
const by = (k: string) => uniq.filter((j) => j.audience.includes(k as never)).length;
console.log(`jobs-us: ${uniq.length} postings (${repeats.length} repeats set aside) from ${ok}/${boards.length} boards — internships ${uniq.filter((j) => j.kind === 'internship').length}, PhD ${by('phd')}, master's ${by('masters')}, new grad ${by('newgrad')}, postdoc ${by('postdoc')}`);
if (failed.length) console.log(`failed: ${failed.join(', ')}`);
