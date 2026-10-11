/**
 * 데이터 에이전트 — 24시간 돌며 수업 시간표·동아리·Greek 명단을 원본에서 다시 가져와 검증하고 반영한다.
 *
 *   npm run agent                         # 오늘 할 일 전부 (매일: 수업 / 일요일: 동아리·Greek)
 *   npm run agent -- courses:stanford     # 한 가지만
 *   npm run agent -- orgs:s_mit greeks:s_mit
 *   AGENT_DRY=1 npm run agent             # 검증까지만 하고 반영·메일은 하지 않는다
 *
 * 수업: fetch → 규칙 검사 → 지난 목록 대비 변화량 → 원본 표본 재확인 → 통과하면 replaceCatalog, 아니면 반영 안 함
 * 동아리·Greek: 기존 수집기를 자식 프로세스로 돌리고 종료 코드·요약 줄을 기록한다 (upsert 라 위험이 낮다)
 * 결과는 agent_runs 에 남고(/api/agent/status), 거부·오류는 AGENT_NOTIFY_EMAIL 로 메일을 보낸다.
 * Railway 에서는 cron 서비스로 매일 한 번 실행된다 (Start Command: npm run agent). 실행이 끝나면 프로세스가 종료돼야 한다.
 */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createStore, type AgentRun } from '../store';
import { sendMail } from '../mail';
import { COURSE_SOURCES } from '../sources/courses';
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

function runScript(task: string, script: string, schoolId: string): Promise<AgentRun> {
  const startedAt = new Date().toISOString();
  const env = { ...process.env, ...(DRY ? { FETCH_DRY: '1' } : {}) };
  const r = spawnSync('npm', ['run', '-s', script, '--', schoolId], { encoding: 'utf8', env, timeout: 20 * 60_000 });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const lines = out.split('\n').filter((l) => /개|chapters|merge|실패|Error|error/.test(l)).slice(-8);
  const failed = r.status !== 0 || /실패:|Error:/.test(out);
  return record({ task, schoolId, status: failed ? 'error' : 'applied', startedAt, summary: { exit: r.status, lines, dry: DRY } });
}

const tasks = process.argv.slice(2).length ? process.argv.slice(2) : todaysTasks();
console.log(`[agent] ${DRY ? 'DRY ' : ''}tasks: ${tasks.join(', ')}`);
const results: AgentRun[] = [];
for (const t of tasks) {
  const [kind, arg] = t.split(':');
  if (kind === 'courses') results.push(await runCourses(arg));
  else if (kind === 'orgs') results.push(await runScript(t, 'fetch:orgs', arg));
  else if (kind === 'greeks') results.push(await runScript(t, 'fetch:greeks', arg));
  else results.push(await record({ task: t, status: 'skipped', startedAt: new Date().toISOString(), summary: { error: 'unknown task' } }));
}

const bad = results.filter((r) => r.status === 'rejected' || r.status === 'error');
const line = (r: AgentRun) => `${r.status.toUpperCase().padEnd(8)} ${r.task.padEnd(20)} ${JSON.stringify(r.summary).slice(0, 400)}`;
const report = results.map(line).join('\n');
console.log(`[agent] done: ${results.length} tasks, ${bad.length} need attention\n${report}`);
if (NOTIFY && !DRY && bad.length) await sendMail(NOTIFY, `[AroundU agent] ${bad.length} task(s) need attention`, `${bad.map(line).join('\n')}\n\nAll tasks:\n${report}`);
process.exit(0);
