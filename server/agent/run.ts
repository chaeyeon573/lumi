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
 *   4. 학사 일정: academic_calendar(ics:…) 가 있으면 매일 ICS + server/data/academic-calendar-<short>.csv 를 academicDates 로 (academic:<id>)
 *   좌석 알림(seats): 워커 안에서 따로 도는 루프 — 학생이 걸어 둔 수업 페이지만 15분/60분마다 (server/seats.ts). 한 번만: npm run agent -- seats
 *   큐가 비면 AGENT_IDLE_SECONDS(기본 60초) 쉬고 다시 목록을 읽는다 — 학교를 한 줄 추가하면 1분 안에 집어 든다
 *
 * 수업: fetch → 규칙 검사 → 지난 목록 대비 변화량 → 원본 표본 재확인 → 통과하면 replaceCatalog, 아니면 반영 안 함
 * 동아리·Greek: 기존 수집기를 자식 프로세스로 돌리고 종료 코드·요약 줄을 기록한다 (upsert 라 위험이 낮다)
 * 결과는 agent_runs 에 남고(/api/agent/status), 거부·오류는 AGENT_NOTIFY_EMAIL 로 메일을 보낸다.
 * Railway 에서는 cron 서비스로 매일 한 번 실행된다 (Start Command: npm run agent). 실행이 끝나면 프로세스가 종료돼야 한다.
 */
import { fetchOursScholarships } from '../sources/ours';
import { fetchStudyAbroad } from '../sources/studyabroad';
import { findStudentOrgSites, knownSites } from '../sources/orgsites';
import { fetchResearchUnits, mergeResearchUnits } from '../sources/researchunits';
import { coopsFromCsv, COOP_PREFIX } from '../sources/coops';
import { fetchUsaJobs } from '../sources/usajobs';
import { studentGovToOrg, type StudentGovRow } from '../sources/orglinks';
import { mkdirSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Organization, School } from '@core/types';
import type { CatalogCourse } from '@core/api/types';
import { parseCSV } from '../scripts/csv';
import { detectOrgsPlatform } from './detect';
import { randomUUID } from 'node:crypto';
import { createStore, type AgentRun } from '../store';
import { sendMail } from '../mail';
import { MAIL_LOG, logEntries, pickToMail, type MailLogDoc } from './notify-throttle';
import { COURSE_SOURCES, resolveCourseSource, useImportCheckpoint } from '../sources/courses';
import { fetchCourseLeaf } from '../sources/catalog';
import { fetchPresenceEvents, fetchEngageEvents, fetchLiveWhale, fetchLocalist } from '../sources/opportunities';
import { dropDuplicateTitles, fetchDevpost, fetchInternships } from '../sources/external';
import { existsSync } from 'node:fs';
import { applyRules, checkDrift, spotCheck } from './validate';
import { fetchAcademicCalendar, icsUrlOf } from '../sources/academic-calendar';
import { DATES, pollSeats, seatWatchLoop } from '../seats';
import { campusDate, type AcademicDate } from '@core/lib/academic';

const DRY = process.env.AGENT_DRY === '1';
const NOTIFY = process.env.AGENT_NOTIFY_EMAIL;
const ORG_SCHOOLS = (process.env.AGENT_ORG_SCHOOLS ?? 's_berkeley,s_sfsu,s_stanford,s_mit').split(',');
const GREEK_SCHOOLS = (process.env.AGENT_GREEK_SCHOOLS ?? 's_berkeley,s_stanford,s_mit').split(',');

const store = createStore();
await store.init();

// 수업 가져오기 중간 저장 (Berkeley 처럼 한 시간 넘게 걸리는 것) — 배포로 워커가 다시 떠도 12시간 안에 읽은 묶음은 다시 읽지 않는다
{
  type Saved = { id: string; at: string; value: unknown };
  let saved: Map<string, Saved> | undefined;
  useImportCheckpoint({
    async load(key) {
      saved ??= new Map((await store.listDocs<Saved>('importCheckpoints')).map((d) => [d.id, d]));
      const d = saved.get(key);
      return d && Date.now() - new Date(d.at).getTime() < 12 * 3_600_000 ? d.value : undefined;
    },
    async save(key, value) {
      if (DRY) return;
      const d: Saved = { id: key, at: new Date().toISOString(), value };
      (saved ??= new Map()).set(key, d);
      await store.putDocs('importCheckpoints', [d]);
    },
  });
}

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

async function runCourses(key: string, schoolId?: string): Promise<AgentRun> {
  const startedAt = new Date().toISOString();
  const src = schoolId ? resolveCourseSource(schoolId, key) : COURSE_SOURCES[key];
  const taskName = `courses:${key.includes(':') ? schoolId : key}`;
  if (!src) return record({ task: taskName, status: 'error', startedAt, summary: { error: `unknown source ${key}` } });
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
    if (reasons.length) return record({ task: taskName, schoolId: src.schoolId, status: 'rejected', startedAt, summary });
    // 같은 id 가 두 번 오면(MIT fireroad 의 교차 개설 과목 등) DB upsert 가 한 번에 같은 줄을 두 번 고치려다 실패한다 — 첫 줄만
    const unique = [...new Map(rules.kept.map((c) => [c.id, c])).values()];
    if (!DRY) await store.replaceCatalog(src.schoolId, unique);
    return record({ task: taskName, schoolId: src.schoolId, status: 'applied', startedAt, summary: { ...summary, kept: unique.length, duplicateIds: rules.kept.length - unique.length } });
  } catch (e) {
    return record({ task: taskName, schoolId: src.schoolId, status: 'error', startedAt, summary: { error: (e as Error).message } });
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

/** 탐지한 동아리 플랫폼 → fetch:orgs 에 넘길 환경 변수 */
function orgsEnv(id: string, platform: string, host: string): Record<string, string> {
  return platform === 'pennclubs' ? { PENNCLUBS_HOSTS: `${id}=${host}` } : platform === 'facetwp' ? { FACETWP_HOSTS: `${id}=${host}` } : platform === 'accordion' ? { ACCORDION_HOSTS: `${id}=${host}` } : platform === 'drupalcards' ? { DRUPALCARDS_HOSTS: `${id}=${host}` } : platform === 'engage' ? { ENGAGE_HOSTS: `${id}=${host}` } : platform === 'presence' ? { PRESENCE_HOSTS: `${id}=${new URL(host).hostname.split('.')[0]}` } : { CAMPUSGROUPS_HOSTS: `${id}=${host}` };
}

// ─── 아직 안 연 학교: 파일로 모으기 (2026-11-02 사장님: Railway 비용 — 기본은 PM 에이전트가 파일로, 거기서 못 닿는 것만 Railway) ───
const DATA_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data');
const COLLECTED_DIR = path.join(DATA_DIR, 'collected');
const GOV_CSV = path.join(DATA_DIR, 'student-governments.csv');
const normName = (n: string) => n.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
/** collect:<id> — 동아리(+손으로 확인한 학생회)를 server/data/collected/<id>.orgs.json 에, 수업 표본 결과를 <id>.probe.json 에. DB 에는 쓰지 않는다 */
async function runCollect(row: SchoolRow): Promise<AgentRun[]> {
  const out: AgentRun[] = [];
  const d = await detectOrgsPlatform(row.short, row.email_domain, row.orgs_host || undefined);
  const file = path.join(COLLECTED_DIR, `${row.id}.orgs.json`);
  if (d) out.push(await runScript(`collect-orgs:${row.id}`, 'fetch:orgs', row.id, { ...orgsEnv(row.id, d.platform, d.host), FETCH_DRY: '1', ORGS_JSON_DIR: COLLECTED_DIR }));
  else out.push(await record({ task: `collect-orgs:${row.id}`, schoolId: row.id, status: 'rejected', startedAt: new Date().toISOString(), summary: { error: 'no public club directory found', tried: row.orgs_host || 'guessed hosts' } }));
  // 학생회: 디렉터리에 없을 때만 더한다
  const govRows = existsSync(GOV_CSV) ? (parseCSV(readFileSync(GOV_CSV, 'utf8')) as unknown as StudentGovRow[]).filter((r) => r.school_id === row.id) : [];
  if (govRows.length) {
    const list: Organization[] = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
    const names = new Set(list.map((o) => normName(o.name)));
    const add = govRows.map(studentGovToOrg).filter((o) => !names.has(normName(o.name)) && !list.some((x) => x.id === o.id));
    if (add.length) { mkdirSync(COLLECTED_DIR, { recursive: true }); writeFileSync(file, `${JSON.stringify([...list, ...add].sort((a, b) => a.name.localeCompare(b.name)), null, 1)}\n`); }
  }
  // railway 칸에 probe 가 있으면(이 컨테이너에서 원본에 못 닿음) 수업 표본은 Railway 가 한다
  if ((row.courses_source || row.catalog_url) && !(row.railway ?? '').split('|').includes('probe')) {
    const probe = await runCourseProbe(row);
    mkdirSync(COLLECTED_DIR, { recursive: true });
    writeFileSync(path.join(COLLECTED_DIR, `${row.id}.probe.json`), `${JSON.stringify({ checkedAt: probe.finishedAt, status: probe.status, ...probe.summary }, null, 1)}\n`);
    out.push(probe);
  }
  return out;
}
/** import-collected:<id> — 학교를 열 때 파일로 모아 둔 동아리를 DB 에 한 번에 */
async function importCollected(id: string): Promise<AgentRun> {
  const startedAt = new Date().toISOString(); const file = path.join(COLLECTED_DIR, `${id}.orgs.json`);
  if (!existsSync(file)) return record({ task: `import-collected:${id}`, schoolId: id, status: 'skipped', startedAt, summary: { error: `no ${file}` } });
  const organizations = JSON.parse(readFileSync(file, 'utf8')) as Organization[];
  if (!DRY) await store.applyPatch({ organizations });
  return record({ task: `import-collected:${id}`, schoolId: id, status: 'applied', startedAt, summary: { organizations: organizations.length, dry: DRY } });
}

// ─── 학교 단위 작업 (워커) ─────────────────────────────────────────────────
interface SchoolRow { id: string; name: string; short: string; email_domain: string; region: string; lat: string; lng: string; orgs_host?: string; courses_source?: string; catalog_url?: string; research_source?: string; events_source?: string; academic_calendar?: string; tz?: string; railway?: string }
const SCHOOLS_CSV = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data', 'schools.csv');
const loadSchools = () => parseCSV(readFileSync(SCHOOLS_CSV, 'utf8')) as unknown as SchoolRow[];
/**
 * 데이터만 모으는 학교 (2026-11-02 사장님: 다른 학교도 밤새 채우기, 가입 화면엔 아직 안 연다).
 * 동아리·행사·수업은 똑같이 모으지만 앱 학교 목록에는 올리지 않는다 — 열 때는 줄을 schools.csv 로 옮기면 데이터가 이미 차 있다.
 * 다른 학교 학생에게는 server/view.ts 의 학교 거르기 때문에 내려가지 않는다
 */
const COLLECT_CSV = path.join(path.dirname(SCHOOLS_CSV), 'schools-collect.csv');
const loadCollect = () => (existsSync(COLLECT_CSV) ? parseCSV(readFileSync(COLLECT_CSV, 'utf8')) as unknown as SchoolRow[] : []).filter((r) => !loadSchools().some((x) => x.id === r.id));
const findRow = (id: string) => loadSchools().find((r) => r.id === id) ?? loadCollect().find((r) => r.id === id);
const hoursSince = (iso?: string) => iso ? (Date.now() - new Date(iso).getTime()) / 3_600_000 : Infinity;
/** AGENT_FORCE="courses:harvard,courses:s_ucmerced" — 이 프로세스가 뜬 뒤 한 번은 최근 성공 여부와 상관없이 다시 돌린다 (어댑터를 고친 직후용) */
const forced = new Set((process.env.AGENT_FORCE ?? '').split(',').map((x) => x.trim()).filter(Boolean));
const due = (task: string, iso: string | undefined, hours: number) => { if (forced.delete(task)) return true; return hoursSince(iso) > hours; };

async function latestRuns(): Promise<Map<string, AgentRun>> {
  const m = new Map<string, AgentRun>();
  for (const r of await store.latestAgentRuns()) m.set(r.task, r);
  return m;
}

async function runOpportunities(task: string, schoolId: string, fetcher: () => Promise<import('@core/types').Opportunity[]>, idPrefix: string): Promise<AgentRun> {
  const startedAt = new Date().toISOString();
  try {
    const snap = await store.loadSnapshot();
    // 해커톤은 행사 이름이 곧 그 행사라 제목으로 겹침을 거른다 (인턴은 'Software Engineer Intern' 처럼 회사마다 같은 제목이라 하지 않는다)
    const fetched = await fetcher();
    const items = idPrefix === 'op_ext_devpost_' ? dropDuplicateTitles(fetched, snap?.opportunities ?? [], idPrefix) : fetched;
    const fresh = new Set(items.map((o) => o.id));
    const prev = (snap?.opportunities ?? []).filter((o) => (o.schoolId ?? '') === schoolId && o.id.startsWith(idPrefix));
    // 저장·Q&A·후기는 유지하고, 목록에서 사라진 것 중 아무도 손대지 않은 것만 지운다
    const merged = items.map((o) => { const p = prev.find((x) => x.id === o.id); return p ? { ...o, qna: p.qna, reviews: p.reviews, createdAt: p.createdAt } : o; });
    const gone = prev.filter((o) => !fresh.has(o.id) && !o.qna.length && !o.reviews.length).map((o) => o.id);
    if (prev.length >= 20 && items.length < prev.length * 0.2) return record({ task, schoolId, status: 'rejected', startedAt, summary: { fetched: items.length, before: prev.length, note: 'count fell by more than 80% — source probably broken, not applied' } });
    if (!DRY) await store.applyPatch({ opportunities: merged, removed: { opportunities: gone } });
    return record({ task, schoolId, status: 'applied', startedAt, summary: { fetched: items.length, removed: gone.length, sample: items.slice(0, 3).map((o) => o.title) } });
  } catch (e) { return record({ task, schoolId, status: 'error', startedAt, summary: { error: (e as Error).message } }); }
}

/** 학사 일정 — ICS + 보충 CSV 를 그 학교 academicDates 로 통째로 바꾼다. 너무 적거나 앞으로의 일정이 없으면 반영하지 않는다 */
async function runAcademic(row: SchoolRow): Promise<AgentRun> {
  const startedAt = new Date().toISOString(); const task = `academic:${row.id}`;
  const url = icsUrlOf(row.academic_calendar);
  if (!url) return record({ task, schoolId: row.id, status: 'skipped', startedAt, summary: { error: 'no academic_calendar (ics:…) in schools.csv' } });
  try {
    const supplement = path.join(path.dirname(SCHOOLS_CSV), `academic-calendar-${row.short}.csv`);
    const r = await fetchAcademicCalendar(row.id, url, supplement);
    const today = campusDate();
    const upcoming = r.dates.filter((d) => d.end >= today);
    const summary = { events: r.events, fillersSkipped: r.fillers, kept: r.dates.length, supplement: r.supplement, upcoming: upcoming.length, next: upcoming.slice(0, 4).map((d) => `${d.start} ${d.title}`), dry: DRY };
    if (r.dates.length < 10 || !upcoming.length) return record({ task, schoolId: row.id, status: 'rejected', startedAt, summary: { ...summary, note: 'too few dates or nothing upcoming — calendar probably moved, not applied' } });
    if (!DRY) {
      const before = (await store.listDocs<AcademicDate>(DATES)).filter((d) => d.schoolId === row.id);
      const fresh = new Set(r.dates.map((d) => d.id));
      await store.putDocs(DATES, r.dates);
      await store.removeDocs(DATES, before.filter((d) => !fresh.has(d.id)).map((d) => d.id));
    }
    return record({ task, schoolId: row.id, status: 'applied', startedAt, summary });
  } catch (e) { return record({ task, schoolId: row.id, status: 'error', startedAt, summary: { error: (e as Error).message } }); }
}

async function runSchool(row: SchoolRow, listed = true): Promise<AgentRun[]> {
  const out: AgentRun[] = [];
  const latest = await latestRuns();
  // 0. 아직 안 연 학교: Railway 는 railway 칸에 적힌 일만 (PM 에이전트가 못 닿는 원본) — 나머지는 에이전트가 파일로 모은다
  if (!listed) {
    const jobs = (row.railway ?? '').split('|').map((x) => x.trim()).filter(Boolean);
    const lastProbe = latest.get(`probe:${row.id}`);
    if (jobs.includes('probe') && (row.courses_source || row.catalog_url) && due(`probe:${row.id}`, lastProbe?.finishedAt, lastProbe?.status === 'applied' ? 24 * 7 : 24)) out.push(await runCourseProbe(row));
    return out;
  }
  // 1. 앱에 학교 등록
  const school: School = { id: row.id, name: row.name, emailDomain: row.email_domain, region: row.region, center: { lat: Number(row.lat), lng: Number(row.lng) }, ...(row.tz ? { tz: row.tz } : {}) };
  if (listed && !DRY) await store.applyPatch({ schools: [school] });
  // 2. 동아리 디렉터리: 탐지 결과는 detect:<id> 실행 기록에 남겨 재사용한다 (30일마다 다시 탐지)
  let host = latest.get(`detect:${row.id}`)?.summary.host as string | undefined;
  let platform = latest.get(`detect:${row.id}`)?.summary.platform as string | undefined;
  const lastDetect = latest.get(`detect:${row.id}`);
  // 못 찾았으면 하루 뒤 다시, 찾았으면 30일 뒤 다시 확인한다
  // `!host ||` 를 앞에 두면 못 찾은 학교(CalLink 가 로그인으로 닫힌 버클리)는 바퀴마다(30초) 다시 탐지했다 — 기록이 없을 때만 바로
  if (!lastDetect || hoursSince(lastDetect.finishedAt) > (lastDetect.status === 'applied' ? 24 * 30 : 24)) {
    const startedAt = new Date().toISOString();
    const d = await detectOrgsPlatform(row.short, row.email_domain, row.orgs_host || undefined);
    host = d?.host; platform = d?.platform;
    out.push(await record({ task: `detect:${row.id}`, schoolId: row.id, status: d ? 'applied' : 'rejected', startedAt, summary: d ? { ...d } : { error: 'no public club directory found (CampusLabs Engage / CampusGroups)', tried: row.orgs_host || 'guessed hosts' } }));
  }
  if (host && platform && due(`orgs:${row.id}`, latest.get(`orgs:${row.id}`)?.finishedAt, 24 * 7)) {
    const env = orgsEnv(row.id, platform, host);
    out.push(await runScript(`orgs:${row.id}`, 'fetch:orgs', row.id, env));
  }
  // 2a. 학생회 — 디렉터리에 없는 학교는 손으로 확인한 공식 학생회(server/data/student-governments.csv)를 7일마다 넣는다 (멤버·팔로워는 그대로)
  const govFile = path.join(path.dirname(SCHOOLS_CSV), 'student-governments.csv');
  const govRows = existsSync(govFile) ? (parseCSV(readFileSync(govFile, 'utf8')) as unknown as StudentGovRow[]).filter((r) => r.school_id === row.id) : [];
  if (govRows.length && due(`studentgov:${row.id}`, latest.get(`studentgov:${row.id}`)?.finishedAt, 24 * 7)) {
    const startedAt = new Date().toISOString();
    const snapOrgs = new Map(((await store.loadSnapshot())?.organizations ?? []).map((o) => [o.id, o]));
    // 디렉터리가 같은 학생회를 이미 넣었으면(USF “ASUSF Senate”) 두 번 넣지 않는다 — 이름(괄호 약칭 빼고)으로 비교
    const norm = (n: string) => n.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    const dirNames = new Set([...snapOrgs.values()].filter((o) => o.schoolId === row.id && !o.id.includes('_sg_')).map((o) => norm(o.name)));
    const organizations = govRows.map(studentGovToOrg).filter((o) => !dirNames.has(norm(o.name))).map((o) => { const prev = snapOrgs.get(o.id); return prev ? { ...prev, name: o.name, description: o.description, links: o.links, type: o.type, verified: true } : o; });
    if (!DRY) await store.applyPatch({ organizations });
    out.push(await record({ task: `studentgov:${row.id}`, schoolId: row.id, status: 'applied', startedAt, summary: { names: organizations.map((o) => o.name) } }));
  }
  // 2b. 기회: 연구(URAP 등, 7일마다) · 행사(Presence, 6시간마다) — 공고(opportunities)로 upsert, 지난 행사는 지운다
  // 학생 단체 행사 (Presence / Engage) — 6시간마다
  const sid = row.id.replace('s_', '');
  if (platform === 'presence' && host && due(`events:${row.id}`, latest.get(`events:${row.id}`)?.finishedAt, 6)) out.push(await runOpportunities(`events:${row.id}`, row.id, () => fetchPresenceEvents(new URL(host!).hostname.split('.')[0], school), `op_${sid}_ev_`));
  if (platform === 'engage' && host && due(`events:${row.id}`, latest.get(`events:${row.id}`)?.finishedAt, 6)) out.push(await runOpportunities(`events:${row.id}`, row.id, () => fetchEngageEvents(host!, school), `op_${sid}_eg_`));
  // 학교 전체 캘린더 (LiveWhale) — 강연·포럼·공연, 6시간마다
  const lw = /^livewhale:(https?:\/\/[^\s]+?)\/?$/.exec(row.events_source ?? '')?.[1];
  if (lw && due(`calendar:${row.id}`, latest.get(`calendar:${row.id}`)?.finishedAt, 6)) out.push(await runOpportunities(`calendar:${row.id}`, row.id, () => fetchLiveWhale(lw, school), `op_${sid}_lw_`));
  // 학교 전체 캘린더 (Localist) — Stanford·MIT·Northeastern
  const lc = /^localist:(https?:\/\/[^\s]+?)\/?$/.exec(row.events_source ?? '')?.[1];
  if (lc && due(`calendar:${row.id}`, latest.get(`calendar:${row.id}`)?.finishedAt, 6)) out.push(await runOpportunities(`calendar:${row.id}`, row.id, () => fetchLocalist(lc, school), `op_${sid}_lc_`));
  // 마감 달력 CSV (server/data/opportunities-<short>.csv) — 사람이 고친 파일을 매일 반영한다
  const calFile = path.join(path.dirname(SCHOOLS_CSV), `opportunities-${row.short}.csv`);
  if (existsSync(calFile) && due(`deadlines:${row.id}`, latest.get(`deadlines:${row.id}`)?.finishedAt, 24)) out.push(await runScript(`deadlines:${row.id}`, 'import:opportunities', calFile, { PRUNE_DEMO: '1' }));
  // 대학원생 펀딩 달력 (펠로우십·여행 지원금·TA/GSR) — server/data/opportunities-grad-<short>.csv
  const gradFile = path.join(path.dirname(SCHOOLS_CSV), `opportunities-grad-${row.short}.csv`);
  if (existsSync(gradFile) && due(`grad-deadlines:${row.id}`, latest.get(`grad-deadlines:${row.id}`)?.finishedAt, 24)) out.push(await runScript(`grad-deadlines:${row.id}`, 'import:opportunities', gradFile));
  // 학사 일정 (수강신청 단계·마감·휴일·기말) — 하루마다, 실패하면 2시간 뒤
  const lastAcademic = latest.get(`academic:${row.id}`);
  if (icsUrlOf(row.academic_calendar) && due(`academic:${row.id}`, lastAcademic?.finishedAt, lastAcademic?.status === 'applied' ? 24 : 2)) out.push(await runAcademic(row));
  // 3. 수업 — 데이터만 모으는 학교는 저장하지 않고 표본만 읽어 "이렇게 가져오면 맞다"를 확인한다 (2026-11-02 사장님: 시간표 전체 적재는 비용 — 방법만 검증)
  if (!listed) {
    const lastProbe = latest.get(`probe:${row.id}`);
    if ((row.courses_source || row.catalog_url) && due(`probe:${row.id}`, lastProbe?.finishedAt, lastProbe?.status === 'applied' ? 24 * 7 : 24)) out.push(await runCourseProbe(row));
  } else if (row.courses_source && resolveCourseSource(row.id, row.courses_source)) {
    const lastCourses = latest.get(`courses:${row.courses_source.includes(':') ? row.id : row.courses_source}`);
    // 성공하면 하루마다, 실패·거부면 2시간 뒤 다시 (어댑터를 고치면 곧 반영되도록)
    const coursesTask = `courses:${row.courses_source.includes(':') ? row.id : row.courses_source}`;
    if (due(coursesTask, lastCourses?.finishedAt, lastCourses?.status === 'applied' ? 24 : 2)) out.push(await runCourses(row.courses_source, row.id));
  } else {
    // 시간표 소스가 없는 학교: 공개 과목 카탈로그(코드·이름)라도 채운다 — 30일마다. 50개 미만이면 못 읽은 것으로 보고 반영하지 않는다
    const lastCatalog = latest.get(`catalog:${row.id}`);
    if (row.catalog_url && due(`catalog:${row.id}`, lastCatalog?.finishedAt, lastCatalog?.status === 'applied' ? 24 * 30 : 2)) {
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

/**
 * 수업 시험 읽기 — 표본 몇 학과만 가져와 규칙 검사 · 원본 재확인(어댑터가 있으면)까지 하고 DB 에는 넣지 않는다.
 * 기록(agent_runs probe:<id>)에 원본·학기·표본 줄을 남겨, 나중에 학교를 열 때 schools.csv 로 옮기기만 하면 같은 방법으로 전부 가져온다
 */
async function runCourseProbe(row: SchoolRow): Promise<AgentRun> {
  const startedAt = new Date().toISOString(); const task = `probe:${row.id}`;
  try {
    let courses: CatalogCourse[] = []; let source = ''; let spot: Awaited<ReturnType<typeof spotCheck>> | undefined;
    const src = row.courses_source ? resolveCourseSource(row.id, row.courses_source) : undefined;
    if (src) {
      source = `timetable:${row.courses_source}`;
      const prev = process.env.STANFORD_SUBJECTS;
      if (row.courses_source === 'stanford') process.env.STANFORD_SUBJECTS = 'CS,MATH,ECON';
      try { courses = applyRules(row.id, await src.fetch()).kept; } finally { if (row.courses_source === 'stanford') { if (prev === undefined) delete process.env.STANFORD_SUBJECTS; else process.env.STANFORD_SUBJECTS = prev; } }
      spot = await spotCheck(courses, src.lookup, 6);
    } else if (row.catalog_url) {
      source = `catalog:${row.catalog_url}`;
      courses = (await fetchCourseLeaf(row.id, row.catalog_url, 6)).courses;
    }
    const terms = [...new Set(courses.map((c) => c.term).filter(Boolean))];
    const withTimes = courses.filter((c) => c.meetings?.length).length;
    const sample = courses.filter((_, i) => i % Math.max(1, Math.floor(courses.length / 6)) === 0).slice(0, 6).map((c) => `${c.code} · ${c.title}${c.term ? ` · ${c.term}` : ''}${c.meetings?.length ? ` · ${c.meetings.map((m) => `${'MTWRFSU'[m.day]} ${m.start}-${m.end}`).join(' ')}` : ''}`);
    const ok = courses.length > 0 && (!spot || spot.ok);
    return record({ task, schoolId: row.id, status: ok ? 'applied' : 'rejected', startedAt, summary: { stored: false, source, sampled: courses.length, withTimes, terms, sample, spotCheck: spot ? { matched: spot.matched, mismatched: spot.mismatched.slice(0, 5), unavailable: spot.unavailable } : 'no lookup (catalog codes/titles only)' } });
  } catch (e) {
    return record({ task, schoolId: row.id, status: 'error', startedAt, summary: { stored: false, error: (e as Error).message } });
  }
}

async function notify(results: AgentRun[]) {
  const bad = results.filter((r) => r.status === 'rejected' || r.status === 'error' || r.task.startsWith('adapter:'));
  const line = (r: AgentRun) => `${r.status.toUpperCase().padEnd(8)} ${r.task.padEnd(22)} ${JSON.stringify(r.summary).slice(0, 400)}`;
  const report = results.map(line).join('\n');
  console.log(`[agent] done: ${results.length} tasks, ${bad.length} need attention\n${report}`);
  if (!NOTIFY || DRY || !bad.length) return;
  // 같은 실패는 하루 한 번, 메일은 한 시간에 한 통까지 (notify-throttle.ts)
  const send = pickToMail(bad, await store.listDocs<MailLogDoc>(MAIL_LOG));
  if (!send.length) { console.log(`[agent] mail skipped — ${bad.length} item(s) already reported or mailed within the hour`); return; }
  await sendMail(NOTIFY, `[AroundU agent] ${send.length} item(s) need attention`, `${send.map(line).join('\n')}\n\nAll tasks:\n${report}`);
  await store.putDocs(MAIL_LOG, logEntries(send));
}

async function runTask(t: string): Promise<AgentRun[]> {
  const [kind, arg] = t.split(':');
  if (kind === 'courses') { const row = findRow(arg); return [row?.courses_source ? await runCourses(row.courses_source, row.id) : await runCourses(arg)]; }
  if (kind === 'orgs') return [await runScript(t, 'fetch:orgs', arg)];
  if (kind === 'greeks') return [await runScript(t, 'fetch:greeks', arg)];
  if (kind === 'academic') { const row = findRow(arg); return [row ? await runAcademic(row) : await record({ task: t, status: 'skipped', startedAt: new Date().toISOString(), summary: { error: 'not in schools.csv' } })]; }
  if (kind === 'seats') { const startedAt = new Date().toISOString(); const s = await pollSeats(store, { dry: DRY, force: true }); return [await record({ task: 'seats', status: s.errors && !s.fetched ? 'error' : 'applied', startedAt, summary: { ...s } })]; }
  if (kind === 'collect') { const row = findRow(arg); return row ? runCollect(row) : [await record({ task: t, status: 'skipped', startedAt: new Date().toISOString(), summary: { error: 'not in schools.csv / schools-collect.csv' } })]; }
  if (kind === 'import-collected') return [await importCollected(arg)];
  if (kind === 'probe') { const row = findRow(arg); return [row ? await runCourseProbe(row) : await record({ task: t, status: 'skipped', startedAt: new Date().toISOString(), summary: { error: 'not in schools.csv / schools-collect.csv' } })]; }
  if (kind === 'school') { const row = findRow(arg); return row ? runSchool(row, loadSchools().some((x) => x.id === arg)) : [await record({ task: t, status: 'skipped', startedAt: new Date().toISOString(), summary: { error: 'not in schools.csv' } })]; }
  return [await record({ task: t, status: 'skipped', startedAt: new Date().toISOString(), summary: { error: 'unknown task' } })];
}

if (process.env.AGENT_MODE === 'worker') {
  const idle = Number(process.env.AGENT_IDLE_SECONDS ?? 60) * 1000;
  console.log(`[agent] worker started (${DRY ? 'DRY, ' : ''}idle ${idle / 1000}s)`);
  {
    // 앱의 학교 목록 = schools.csv. 목록에서 빠진 학교는 숨긴다 (데이터는 지우지 않는다 — 다시 넣으면 그대로 돌아온다). 사용자가 있는 학교는 남긴다
    const snap = await store.loadSnapshot();
    const keep = new Set([...loadSchools().map((r) => r.id), ...(snap?.users ?? []).map((u) => (u.affiliation as { schoolId?: string })?.schoolId).filter(Boolean) as string[]]);
    const hide = (snap?.schools ?? []).filter((x) => !keep.has(x.id)).map((x) => x.id);
    if (hide.length && !DRY) await store.applyPatch({ removed: { schools: hide } });
    console.log(`[agent] schools in app: ${keep.size} (hidden ${hide.length})`);
    // URAP 프로젝트를 하나하나 공고로 넣던 것은 접었다 (URAP 은 마감 달력의 한 줄로 안내) — 아무도 손대지 않은 것만 지운다
    const urap = (snap?.opportunities ?? []).filter((o) => o.id.startsWith('op_berkeley_urap_') && !o.qna.length && !o.reviews.length).map((o) => o.id);
    if (urap.length && !DRY) { await store.applyPatch({ removed: { opportunities: urap } }); console.log(`[agent] removed ${urap.length} URAP project listings`); }
  }
  // 좌석 알림 루프 — 학교 바퀴와 따로 1분마다 할 일이 있는지 본다 (AGENT_FORCE=seats 면 첫 바퀴는 전부 바로)
  void seatWatchLoop(store, { dry: DRY, force: () => forced.delete('seats'), record: (status, summary) => record({ task: 'seats', status, startedAt: new Date().toISOString(), summary }) });
  for (;;) {
    let did = 0;
    // 학교 밖 기회 (모든 학교 공통) — 12시간마다
    {
      const latest = await latestRuns();
      if (due('external:devpost', latest.get('external:devpost')?.finishedAt, 12)) { const r = [await runOpportunities('external:devpost', '', fetchDevpost, 'op_ext_devpost_')]; did += 1; await notify(r); }
      { // 전국 대상 펠로우십 (NSF GRFP 등) — 학교 구분 없이 모두에게
        const nat = path.join(path.dirname(SCHOOLS_CSV), 'opportunities-grad-national.csv');
        if (existsSync(nat) && due('grad-deadlines:national', latest.get('grad-deadlines:national')?.finishedAt, 24)) { const r = [await runScript('grad-deadlines:national', 'import:opportunities', nat)]; did += 1; await notify(r); }
      }
      { // 전국 대상 학부생 기회 (여름 연구·REU, 장학금, 대회) — 공식 페이지에서 마감을 확인한 것만 server/data/opportunities-national.csv 에 둔다
        const nat = path.join(path.dirname(SCHOOLS_CSV), 'opportunities-national.csv');
        if (existsSync(nat) && due('deadlines:national', latest.get('deadlines:national')?.finishedAt, 24)) { const r = [await runScript('deadlines:national', 'import:opportunities', nat)]; did += 1; await notify(r); }
      }
      // 버클리 OURS 장학금 — 공식 페이지의 ‘Next Campus Deadline’ 을 하루 한 번 읽는다 (server/sources/ours.ts)
      if (due('scholarships:ours', latest.get('scholarships:ours')?.finishedAt, 24)) { const opps = (await store.loadSnapshot())?.opportunities ?? []; const r = [await runOpportunities('scholarships:ours', 's_berkeley', () => fetchOursScholarships(new Date(), opps), 'op_ours_')]; did += 1; await notify(r); }
      // 버클리 교환·해외 프로그램 (UCEAP·Global Internships 등) — 공식 목록의 학기별 마감 (server/sources/studyabroad.ts)
      if (due('exchange:berkeley', latest.get('exchange:berkeley')?.finishedAt, 24)) { const r = [await runOpportunities('exchange:berkeley', 's_berkeley', () => fetchStudyAbroad(), 'op_sa_')]; did += 1; await notify(r); }
      // Greek 명단 — 일주일에 한 번. 예전엔 `npm run agent` 를 일요일에 따로 돌릴 때만 가져와서 상시 워커만 있으면 안 돌았다
      for (const g of GREEK_SCHOOLS) if (due(`greeks:${g}`, latest.get(`greeks:${g}`)?.finishedAt, 24 * 7)) { const r = [await runScript(`greeks:${g}`, 'fetch:greeks', g)]; did += 1; await notify(r); }
      // 버클리 동아리 공식 사이트(<이름>.studentorg.berkeley.edu)·소셜 링크 — 일주일에 한 번 (server/sources/orgsites.ts)
      if (due('orgsites:s_berkeley', latest.get('orgsites:s_berkeley')?.finishedAt, 24 * 7)) {
        const startedAt = new Date().toISOString();
        try {
          const listFile = path.join(path.dirname(SCHOOLS_CSV), 'org-sites-berkeley.csv');
          const changed = await findStudentOrgSites((await store.loadSnapshot())?.organizations ?? [], 12, existsSync(listFile) ? knownSites(readFileSync(listFile, 'utf8')) : new Map());
          if (!DRY && changed.length) await store.applyPatch({ organizations: changed });
          await notify([await record({ task: 'orgsites:s_berkeley', schoolId: 's_berkeley', status: 'applied', startedAt, summary: { fetched: changed.length, sample: changed.slice(0, 3).map((o) => o.name) } })]);
        } catch (e) { await notify([await record({ task: 'orgsites:s_berkeley', schoolId: 's_berkeley', status: 'error', startedAt, summary: { error: (e as Error).message } })]); }
        did += 1;
      }
      // 버클리 공식 연구소 목록(VCR Research Units) → Campus › 동아리 › 연구실 — 일주일에 한 번 (server/sources/researchunits.ts)
      if (due('labs:s_berkeley', latest.get('labs:s_berkeley')?.finishedAt, 24 * 7)) {
        const startedAt = new Date().toISOString();
        try {
          const fresh = await fetchResearchUnits();
          const { organizations, removed } = mergeResearchUnits(fresh, (await store.loadSnapshot())?.organizations ?? []);
          if (!DRY && (organizations.length || removed.length)) await store.applyPatch({ organizations, removed: { organizations: removed } });
          await notify([await record({ task: 'labs:s_berkeley', schoolId: 's_berkeley', status: 'applied', startedAt, summary: { fetched: fresh.length, changed: organizations.length, removed: removed.length, sample: fresh.slice(0, 3).map((o) => o.name) } })]);
        } catch (e) { await notify([await record({ task: 'labs:s_berkeley', schoolId: 's_berkeley', status: 'error', startedAt, summary: { error: (e as Error).message } })]); }
        did += 1;
      }
      // Berkeley Student Cooperative 하우스 — 공식 사이트에서 확인한 목록(server/data/coops-berkeley.csv)을 Co-op 조직으로. 일주일에 한 번
      if (due('coops:s_berkeley', latest.get('coops:s_berkeley')?.finishedAt, 24 * 7)) {
        const startedAt = new Date().toISOString();
        try {
          const file = path.join(path.dirname(SCHOOLS_CSV), 'coops-berkeley.csv');
          const fresh = existsSync(file) ? coopsFromCsv(readFileSync(file, 'utf8')) : [];
          const { organizations, removed } = mergeResearchUnits(fresh, (await store.loadSnapshot())?.organizations ?? [], COOP_PREFIX);
          if (!DRY && (organizations.length || removed.length)) await store.applyPatch({ organizations, removed: { organizations: removed } });
          await notify([await record({ task: 'coops:s_berkeley', schoolId: 's_berkeley', status: 'applied', startedAt, summary: { fetched: fresh.length, changed: organizations.length, removed: removed.length } })]);
        } catch (e) { await notify([await record({ task: 'coops:s_berkeley', schoolId: 's_berkeley', status: 'error', startedAt, summary: { error: (e as Error).message } })]); }
        did += 1;
      }
      // 연방정부 학생 채용(USAJOBS Pathways) — 키가 이 서비스에 있을 때만, 12시간마다 (server/sources/usajobs.ts)
      if (process.env.USAJOBS_API_KEY && due('external:usajobs', latest.get('external:usajobs')?.finishedAt, 12)) { const r = [await runOpportunities('external:usajobs', '', () => fetchUsaJobs(), 'op_usajobs_')]; did += 1; await notify(r); }
      if (due('external:internships', latest.get('external:internships')?.finishedAt, 12)) { const r = [await runOpportunities('external:internships', '', fetchInternships, 'op_ext_job_')]; did += 1; await notify(r); }
    }
    for (const [row, listed] of [...loadSchools().map((r) => [r, true] as const), ...loadCollect().map((r) => [r, false] as const)]) {
      const results = await runSchool(row, listed);
      if (results.length) { did += results.length; await notify(results); }
      if (process.env.AGENT_ONCE === '1') continue;
    }
    if (process.env.AGENT_ONCE === '1') break;
    // 할 일이 없으면 쉬고, 있었더라도 잠깐은 쉰다 — 실패한 작업이 곧바로 다시 '할 일'로 잡혀 쉬지 않고 도는 일이 없게
    await new Promise((r) => setTimeout(r, did ? Math.min(idle, 30_000) : idle));
  }
  process.exit(0);
}

const tasks = process.argv.slice(2).length ? process.argv.slice(2) : todaysTasks();
console.log(`[agent] ${DRY ? 'DRY ' : ''}tasks: ${tasks.join(', ')}`);
const results: AgentRun[] = [];
for (const t of tasks) results.push(...(await runTask(t)));
await notify(results);
process.exit(0);
