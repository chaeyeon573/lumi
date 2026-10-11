/**
 * 데이터 에이전트 — 24시간 돌며 수업 시간표·동아리·Greek 명단을 원본에서 다시 가져와 검증하고 반영한다.
 *
 *   npm run agent:worker                  # 상시 실행 — 학교 목록(server/data/schools.csv)을 계속 돌며 빈 데이터를 채우고 오래된 것을 갱신한다
 *   npm run agent                         # 한 바퀴만 (수업 전부 + 일요일엔 동아리·Greek)
 *   npm run agent -- courses:stanford     # 한 가지만
 *   npm run agent -- orgs:s_mit greeks:s_mit school:s_uci
 *   AGENT_DRY=1 …                         # 검증까지만 하고 반영·메일은 하지 않는다
 *
 * 워커가 학교마다 하는 일 (school:<id>)
 *   1. 앱에 학교 등록 (schools 컬렉션 upsert — 가입 화면에서 고를 수 있게)
 *   2. 동아리 플랫폼 자동 탐지(detect.ts) → 찾으면 fetch:orgs 를 그 호스트로 실행 (7일마다 갱신)
 *   3. 수업: 어댑터가 있는 학교(courses_source)는 매일 갱신. 없으면 공개 카탈로그(catalog_url, CourseLeaf)에서 코드·이름을 30일마다 채우고
 *      'adapter needed' 를 한 번 기록해 운영자에게 알린다 — 시간은 학생이 넣는다
 *   큐가 비면 AGENT_IDLE_SECONDS(기본 60초) 쉬고 다시 목록을 읽는다 — 학교를 한 줄 추가하면 1분 안에 집어 든다
 *
 * 수업: fetch → 규칙 검사 → 지난 목록 대비 변화량 → 원본 표본 재확인 → 통과하면 replaceCatalog, 아니면 반영 안 함
 * 동아리·Greek: 기존 수집기를 자식 프로세스로 돌리고 종료 코드·요약 줄을 기록한다 (upsert 라 위험이 낮다)
 * 결과는 agent_runs 에 남고(/api/agent/status), 거부·오류는 AGENT_NOTIFY_EMAIL 로 메일을 보낸다.
 * Railway 에서는 cron 서비스로 매일 한 번 실행된다 (Start Command: npm run agent). 실행이 끝나면 프로세스가 종료돼야 한다.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { School } from '@core/types';
import { parseCSV } from '../scripts/csv';
import { detectOrgsPlatform } from './detect';
import { randomUUID } from 'node:crypto';
import { createStore, type AgentRun } from '../store';
import { sendMail } from '../mail';
import { COURSE_SOURCES } from '../sources/courses';
import { fetchCourseLeaf } from '../sources/catalog';
import { applyRules, checkDrift, spotCheck } from './validate';

const DRY = process.env.AGENT_DRY === '1';
const NOTIFY = process.env.AGENT_NOTIFY_EMAIL;
const ORG_SCHOOLS = (process.env.AGENT_ORG_SCHOOLS ?? 's_berkeley,s_sfsu,s_stanford,s_mit').split(',');
const GREEK_SCHOOLS = (process.env.AGENT_GREEK_SCHOOLS ?? 's_berkeley,s_stanford,s_mit').split(',');

const store = createStore();
await store.init();

function todaysTasks(): string[] {
  const tasks = Object.keys(COURSE_SOURCES).map((k) => `courses:${k}`);
  const weekly = new Date().getUTCDay() === 0 || process.env.AGENT_FORCE_WEEKLY === '1';
  if (weekly) tasks.push(...ORG_SCHOOLS.map((s) => `orgs:${s}`), ...GREEK_SCHOOLS.map((s) => `greeks:${s}`));
  return tasks;
}

async function record(run: Omit<AgentRun, 'id' | 'finishedAt'>): Promise<AgentRun> {
  const full: AgentRun = { ...run, id: randomUUID(), finishedAt: new Date().toISOString() };
  if (!DRY) await store.recordAgentRun(full);
  console.log(`[agent] ${full.task} → ${full.status}`, JSON.stringify(full.summary));
  return full;
}

async function runCourses(key: string): Promise<AgentRun> {
  const startedAt = new Date().toISOString();
  const src = COURSE_SOURCES[key];
  if (!src) return record({ task: `courses:${key}`, status: 'error', startedAt, summary: { error: `unknown source ${key}` } });
  try {
    const fetched = await src.fetch();
    const rules = applyRules(src.schoolId, fetched);
    const previous = (await store.loadCatalog()).filter((c) => c.schoolId === src.schoolId);
    const drift = checkDrift(previous, rules.kept);
    const spot = await spotCheck(rules.kept, src.lookup);
    const dropRate = fetched.length ? rules.dropped.length / fetched.length : 0;
    const reasons: string[] = [];
    if (!fetched.length) reasons.push('source returned nothing');
    if (dropRate > 0.1) reasons.push(`rules dropped ${(dropRate * 100).toFixed(1)}% of rows`);
    if (!drift.ok) reasons.push(drift.note!);
    if (!spot.ok) reasons.push(`spot-check matched ${spot.matched}/${spot.matched + spot.mismatched.length}`);
    const summary = { school: src.schoolId, fetched: fetched.length, kept: rules.kept.length, dropped: rules.dropped.slice(0, 10), dropRate, drift, spotCheck: { ...spot, mismatched: spot.mismatched.slice(0, 10) }, reasons, dry: DRY };
    if (reasons.length) return record({ task: `courses:${key}`, schoolId: src.schoolId, status: 'rejected', startedAt, summary });
    if (!DRY) await store.replaceCatalog(src.schoolId, rules.kept);
    return record({ task: `courses:${key}`, schoolId: src.schoolId, status: 'applied', startedAt, summary });
  } catch (e) {
    return record({ task: `courses:${key}`, schoolId: src.schoolId, status: 'error', startedAt, summary: { error: (e as Error).message } });
  }
}

function runScript(task: string, script: string, schoolId: string, extraEnv: Record<string, string> = {}): Promise<AgentRun> {
  const startedAt = new Date().toISOString();
  const env = { ...process.env, ...extraEnv, ...(DRY ? { FETCH_DRY: '1' } : {}) };
  const r = spawnSync('npm', ['run', '-s', script, '--', schoolId], { encoding: 'utf8', env, timeout: 20 * 60_000 });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const lines = out.split('\n').filter((l) => /개|chapters|merge|실패|Error|error/.test(l)).slice(-8);
  const failed = r.status !== 0 || /실패:|Error:/.test(out);
  return record({ task, schoolId, status: failed ? 'error' : 'applied', startedAt, summary: { exit: r.status, lines, dry: DRY } });
}

// ─── 학교 단위 작업 (워커) ─────────────────────────────────────────────────
interface SchoolRow { id: string; name: string; short: string; email_domain: string; region: string; lat: string; lng: string; orgs_host?: string; courses_source?: string; catalog_url?: string }
const SCHOOLS_CSV = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'schools.csv');
const loadSchools = () => parseCSV(readFileSync(SCHOOLS_CSV, 'utf8')) as unknown as SchoolRow[];
const hoursSince = (iso?: string) => iso ? (Date.now() - new Date(iso).getTime()) / 3_600_000 : Infinity;

async function latestRuns(): Promise<Map<string, AgentRun>> {
  const m = new Map<string, AgentRun>();
  for (const r of await store.listAgentRuns(500)) if (!m.has(r.task)) m.set(r.task, r);
  return m;
}

async function runSchool(row: SchoolRow): Promise<AgentRun[]> {
  const out: AgentRun[] = [];
  const latest = await latestRuns();
  // 1. 앱에 학교 등록
  const school: School = { id: row.id, name: row.name, emailDomain: row.email_domain, region: row.region, center: { lat: Number(row.lat), lng: Number(row.lng) } };
  if (!DRY) await store.applyPatch({ schools: [school] });
  // 2. 동아리 디렉터리: 탐지 결과는 detect:<id> 실행 기록에 남겨 재사용한다 (30일마다 다시 탐지)
  let host = latest.get(`detect:${row.id}`)?.summary.host as string | undefined;
  let platform = latest.get(`detect:${row.id}`)?.summary.platform as string | undefined;
  const lastDetect = latest.get(`detect:${row.id}`);
  // 못 찾았으면 하루 뒤 다시, 찾았으면 30일 뒤 다시 확인한다
  if (!host || hoursSince(lastDetect?.finishedAt) > (lastDetect?.status === 'applied' ? 24 * 30 : 24)) {
    const startedAt = new Date().toISOString();
    const d = await detectOrgsPlatform(row.short, row.email_domain, row.orgs_host || undefined);
    host = d?.host; platform = d?.platform;
    out.push(await record({ task: `detect:${row.id}`, schoolId: row.id, status: d ? 'applied' : 'rejected', startedAt, summary: d ? { ...d } : { error: 'no public club directory found (CampusLabs Engage / CampusGroups)', tried: row.orgs_host || 'guessed hosts' } }));
  }
  if (host && platform && hoursSince(latest.get(`orgs:${row.id}`)?.finishedAt) > 24 * 7) {
    const env: Record<string, string> = platform === 'engage' ? { ENGAGE_HOSTS: `${row.id}=${host}` } : { CAMPUSGROUPS_HOSTS: `${row.id}=${host}` };
    out.push(await runScript(`orgs:${row.id}`, 'fetch:orgs', row.id, env));
  }
  // 3. 수업
  if (row.courses_source && COURSE_SOURCES[row.courses_source]) {
    const lastCourses = latest.get(`courses:${row.courses_source}`);
    // 성공하면 하루마다, 실패·거부면 2시간 뒤 다시 (어댑터를 고치면 곧 반영되도록)
    if (hoursSince(lastCourses?.finishedAt) > (lastCourses?.status === 'applied' ? 24 : 2)) out.push(await runCourses(row.courses_source));
  } else {
    // 시간표 소스가 없는 학교: 공개 과목 카탈로그(코드·이름)라도 채운다 — 30일마다. 50개 미만이면 못 읽은 것으로 보고 반영하지 않는다
    const lastCatalog = latest.get(`catalog:${row.id}`);
    if (row.catalog_url && hoursSince(lastCatalog?.finishedAt) > (lastCatalog?.status === 'applied' ? 24 * 30 : 2)) {
      const startedAt = new Date().toISOString();
      try {
        const r = await fetchCourseLeaf(row.id, row.catalog_url);
        const ok = r.courses.length >= 50;
        if (ok && !DRY) await store.replaceCatalog(row.id, r.courses);
        out.push(await record({ task: `catalog:${row.id}`, schoolId: row.id, status: ok ? 'applied' : 'rejected', startedAt, summary: { root: r.root, subjects: r.subjects.length, subjectsWithCourses: r.subjectsWithCourses, courses: r.courses.length, sample: r.courses.slice(0, 3).map((c) => `${c.code} ${c.title}`), note: ok ? undefined : 'CourseLeaf ribbit API returned too little — not a CourseLeaf catalog or subject codes not found' } }));
      } catch (e) {
        out.push(await record({ task: `catalog:${row.id}`, schoolId: row.id, status: 'error', startedAt, summary: { error: (e as Error).message } }));
      }
    }
    if (!latest.has(`adapter:${row.id}`)) out.push(await record({ task: `adapter:${row.id}`, schoolId: row.id, status: 'skipped', startedAt: new Date().toISOString(), summary: { needed: 'course timetable adapter', note: `no known public timetable source for ${row.name} — catalog (codes/titles) is used meanwhile; students enter times` } }));
  }
  return out;
}

async function notify(results: AgentRun[]) {
  const bad = results.filter((r) => r.status === 'rejected' || r.status === 'error' || r.task.startsWith('adapter:'));
  const line = (r: AgentRun) => `${r.status.toUpperCase().padEnd(8)} ${r.task.padEnd(22)} ${JSON.stringify(r.summary).slice(0, 400)}`;
  const report = results.map(line).join('\n');
  console.log(`[agent] done: ${results.length} tasks, ${bad.length} need attention\n${report}`);
  if (NOTIFY && !DRY && bad.length) await sendMail(NOTIFY, `[AroundU agent] ${bad.length} item(s) need attention`, `${bad.map(line).join('\n')}\n\nAll tasks:\n${report}`);
}

async function runTask(t: string): Promise<AgentRun[]> {
  const [kind, arg] = t.split(':');
  if (kind === 'courses') return [await runCourses(arg)];
  if (kind === 'orgs') return [await runScript(t, 'fetch:orgs', arg)];
  if (kind === 'greeks') return [await runScript(t, 'fetch:greeks', arg)];
  if (kind === 'school') { const row = loadSchools().find((s) => s.id === arg); return row ? runSchool(row) : [await record({ task: t, status: 'skipped', startedAt: new Date().toISOString(), summary: { error: 'not in schools.csv' } })]; }
  return [await record({ task: t, status: 'skipped', startedAt: new Date().toISOString(), summary: { error: 'unknown task' } })];
}

if (process.env.AGENT_MODE === 'worker') {
  const idle = Number(process.env.AGENT_IDLE_SECONDS ?? 60) * 1000;
  console.log(`[agent] worker started (${DRY ? 'DRY, ' : ''}idle ${idle / 1000}s)`);
  for (;;) {
    let did = 0;
    for (const row of loadSchools()) {
      const results = await runSchool(row);
      if (results.length) { did += results.length; await notify(results); }
      if (process.env.AGENT_ONCE === '1') continue;
    }
    if (process.env.AGENT_ONCE === '1') break;
    if (!did) await new Promise((r) => setTimeout(r, idle));
  }
  process.exit(0);
}

const tasks = process.argv.slice(2).length ? process.argv.slice(2) : todaysTasks();
console.log(`[agent] ${DRY ? 'DRY ' : ''}tasks: ${tasks.join(', ')}`);
const results: AgentRun[] = [];
for (const t of tasks) results.push(...(await runTask(t)));
await notify(results);
process.exit(0);
