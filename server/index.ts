/**
 * AroundU API 서버 — Railway 에 배포하는 단일 서비스 (API + 빌드된 프론트엔드 정적 파일).
 *
 *   POST /api/auth/{demo,login,register,logout,me}
 *   POST /api/bootstrap
 *   POST /api/schools/{search,send-code,verify-code}
 *   POST /api/catalog/courses
 *   POST /api/rpc/:group/:method        body: { args: [...] }  → 엔진 메서드 호출, Patch 반환
 *   GET  /api/events?token=…            SSE: 다른 사용자의 변경을 Patch 로 푸시
 *   POST /api/system/reset              ALLOW_RESET=1 일 때만
 *   POST /api/feedback                  써 본 사람의 의견 → DB + FEEDBACK_EMAIL 로 메일
 *   GET  /api/feedback                  x-admin-key: ADMIN_KEY 일 때만 목록
 *   GET  /api/ai/status                 AI 켜짐 여부 (ANTHROPIC_API_KEY)
 *   POST /api/ai/{ask,profile-draft,starters}   server/ai.ts — 질문 답변·대화형 가입·첫마디 제안
 *   GET  /api/ai/logs                   x-admin-key 일 때만 — 학생들이 무엇을 물었는지
 *
 * 환경변수: PORT, DATABASE_URL, AROUNDU_LANG(ko|en), DEMO_AUTOREPLY(1이면 데모 자동응답), ALLOW_DEMO_LOGIN(0이면 비활성),
 *          ALLOW_RESET, RESEND_API_KEY, MAIL_FROM, HIDE_DEV_CODE, CORS_ORIGIN, VERIFY_EMAIL_DOMAIN(0이면 학교 도메인 검사 생략)
 */
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { randomBytes, randomInt } from 'node:crypto';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { t, lang } from '@core/i18n';
import type { Patch, Snapshot, RegisterInput } from '@core/api/types';
import type { ID } from '@core/types';
import { createEngine } from '@core/api/engine';
import { searchCatalog, catalogCourses as builtInCatalog } from '@core/data/catalog/courses';
import { createStore } from './store';
import { snapshotFor, patchFor } from './view';
import { sendCodeMail, sendMail } from './mail';
import { migrateDemo, demoUserIdFor, rollSampleActivities } from './demo';
import { aiEnabled, ask, profileDraft, starters, rateLimit, AiError } from './ai';
import type { AiLog } from './store';
import { loadSeed } from './seed';

const PORT = Number(process.env.PORT ?? 8787);
const store = createStore();
await store.init();

// ─── 데이터 로드 (비어 있으면 시드) ─────────────────────────────────────────
let db: Snapshot = (await store.loadSnapshot()) ?? await (async () => {
  const seed = await loadSeed();
  await store.replaceAll(seed);
  console.log(`[seed] loaded ${seed.users.length} users, ${seed.organizations.length} orgs (${lang})`);
  return seed;
})();
let catalog = await store.loadCatalog();
if (catalog.length === 0) { catalog = builtInCatalog; await store.upsertCatalog(catalog); console.log(`[seed] ${catalog.length} catalog courses`); }

{ const p = migrateDemo(db); if (p) { await store.applyPatch(p); console.log(`[demo] updated ${p.users?.length ?? 0} sample users, hid ${p.removed?.schools?.length ?? 0} schools`); } }
// 예시 모임 날짜를 오늘 기준으로 — 켜질 때 한 번, 그 뒤 15분마다 (지난 것은 곧 시작하는 시간으로 민다)
async function rollSamples() { const p = rollSampleActivities(db); if (p) { await store.applyPatch(p); broadcast(p); console.log(`[demo] rolled ${p.activities?.length ?? 0} sample activities`); } }
const clients = new Map<ID, Set<Response>>();
await rollSamples();

function broadcast(patch: Patch) {
  for (const [userId, set] of clients) {
    const p = patchFor(patch, userId, db);
    if (!p) continue;
    const line = `event: patch\ndata: ${JSON.stringify(p)}\n\n`;
    for (const res of set) res.write(line);
  }
}

const engine = createEngine({
  get db() { return db; },
  t,
  demo: process.env.DEMO_AUTOREPLY === '1',
  push(patch) { void store.applyPatch(patch); broadcast(patch); },
});

// ─── 데이터 에이전트와 동기화 ────────────────────────────────────────────────
// 워커(별도 Railway 서비스)는 Postgres 에 동아리·공고·학교·수업 목록을 쓴다. 웹 서버는 켜질 때 한 번만 읽으므로
// DATA_SYNC_SECONDS(기본 120초)마다 그 컬렉션만 다시 읽고, 바뀐 것은 접속 중인 화면에도 Patch 로 보낸다.
const WORKER_COLLECTIONS = ['organizations', 'opportunities', 'schools'] as const;
async function syncFromWorker() {
  const snap = await store.loadSnapshot(); if (!snap) return;
  const patch: Patch = {}; const removed: NonNullable<Patch['removed']> = {};
  for (const c of WORKER_COLLECTIONS) {
    const before = new Map((db[c] as { id: ID }[]).map((x) => [x.id, JSON.stringify(x)]));
    const after = snap[c] as { id: ID }[]; const afterIds = new Set(after.map((x) => x.id));
    const changed = after.filter((x) => before.get(x.id) !== JSON.stringify(x));
    const gone = [...before.keys()].filter((id) => !afterIds.has(id));
    if (!changed.length && !gone.length) continue;
    (db as unknown as Record<string, unknown>)[c] = after;
    (patch as Record<string, unknown>)[c] = changed;
    if (gone.length) (removed as Record<string, ID[]>)[c] = gone;
  }
  if (Object.keys(removed).length) patch.removed = removed;
  if (Object.keys(patch).length) { broadcast(patch); console.log(`[sync] ${WORKER_COLLECTIONS.map((c) => `${c} ${((patch as Record<string, unknown[]>)[c] ?? []).length}`).join(', ')}`); }
  const nextCatalog = await store.loadCatalog(); if (nextCatalog.length) catalog = nextCatalog;
}
setInterval(() => { rollSamples().catch((e) => console.error('[demo] roll failed', e)); }, 15 * 60 * 1000);
setInterval(() => { syncFromWorker().catch((e) => console.error('[sync] failed', e)); }, Number(process.env.DATA_SYNC_SECONDS ?? 120) * 1000);

// ─── 앱 ─────────────────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) ?? true, credentials: false }));
app.use(express.json({ limit: '2mb' }));

class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
const bad = (msg: string, status = 400) => new HttpError(status, msg);

type Req = Request & { userId?: ID };
async function auth(req: Req, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : (req.query.token as string | undefined);
    if (token) {
      const s = await store.findSession(token);
      if (s && db.users.some((u) => u.id === s.userId)) req.userId = s.userId;
    }
    next();
  } catch (e) { next(e); }
}
const requireUser = (req: Req): ID => { if (!req.userId) throw bad(t('로그인이 필요해요.'), 401); return req.userId; };
const wrap = (fn: (req: Req, res: Response) => Promise<unknown> | unknown) => async (req: Req, res: Response, next: NextFunction) => {
  try { const out = await fn(req, res); if (!res.headersSent) res.json(out ?? {}); } catch (e) { next(e); }
};

async function issueSession(userId: ID) {
  const token = randomBytes(32).toString('hex');
  await store.createSession({ token, userId, createdAt: new Date().toISOString() });
  return token;
}
const norm = (email: unknown) => String(email ?? '').trim().toLowerCase();
const CODE_TTL_MS = 10 * 60 * 1000;

// ─── 인증 ────────────────────────────────────────────────────────────────
app.post('/api/auth/demo', wrap(async (req) => {
  if (process.env.ALLOW_DEMO_LOGIN === '0') throw bad(t('데모 계정이 없어요. 회원가입을 이용해주세요.'), 403);
  const user = db.users.find((u) => u.id === demoUserIdFor(String(req.body?.schoolId ?? '')));
  if (!user) throw bad(t('데모 계정이 없어요. 회원가입을 이용해주세요.'), 404);
  return { token: await issueSession(user.id), user };
}));

app.post('/api/auth/login', wrap(async (req) => {
  const email = norm(req.body.email);
  const code = String(req.body.code ?? '').trim();
  const saved = await store.takeCode(email);
  if (!saved || saved.code !== code || new Date(saved.expiresAt).getTime() < Date.now()) throw bad(t('인증 코드가 만료되었거나 올바르지 않아요.'));
  const account = await store.findAccount(email);
  const user = account ? db.users.find((u) => u.id === account.userId) : undefined;
  if (!user) throw bad(t('이 이메일로 가입된 계정이 없어요.'), 404);
  return { token: await issueSession(user.id), user };
}));

app.post('/api/auth/register', wrap(async (req) => {
  const input = req.body.input as RegisterInput;
  if (!input || typeof input.nickname !== 'string' || !input.schoolId) throw bad(t('입력값을 확인해주세요.'));
  const email = norm(input.email);
  if (email && await store.findAccount(email)) throw bad(t('이미 가입된 이메일이에요. 이메일로 로그인해주세요.'), 409);
  // 서버가 검증하지 않은 인증 상태는 믿지 않는다
  const verified = email ? verifiedEmails.has(email) : false;
  const user = engine.register({ ...input, emailVerified: verified });
  if (email) { await store.createAccount({ email, userId: user.id, createdAt: new Date().toISOString() }); verifiedEmails.delete(email); }
  await store.applyPatch({ users: [user], notifications: db.notifications.filter((n) => n.userId === user.id) });
  return { token: await issueSession(user.id), user };
}));

app.post('/api/auth/logout', auth, wrap(async (req: Req) => {
  const header = req.headers.authorization ?? '';
  if (header.startsWith('Bearer ')) await store.deleteSession(header.slice(7));
  return {};
}));

app.post('/api/auth/me', auth, wrap(async (req: Req) => ({ user: req.userId ? db.users.find((u) => u.id === req.userId) ?? null : null })));

// ─── 부트스트랩 ──────────────────────────────────────────────────────────
app.post('/api/bootstrap', auth, wrap(async (req: Req) => {
  const me = requireUser(req);
  const hk = engine.housekeeping();
  if (hk.proposals?.length) void store.applyPatch(hk);
  return snapshotFor(db, me);
}));

// ─── 학교·이메일 인증 ─────────────────────────────────────────────────────
/** 인증을 통과한 이메일 (가입 완료 전까지 메모리에만 둔다) */
const verifiedEmails = new Set<string>();

app.post('/api/schools/search', wrap(async (req) => engine.schools.search(String(req.body.query ?? ''))));

app.post('/api/schools/send-code', wrap(async (req) => {
  const email = norm(req.body.email);
  const school = db.schools.find((s) => s.id === req.body.schoolId);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, hint: t('이메일 형식을 확인해주세요.') };
  if (school && process.env.VERIFY_EMAIL_DOMAIN !== '0' && !email.endsWith(`@${school.emailDomain}`) && !email.endsWith(`.${school.emailDomain}`)) {
    return { ok: false, hint: `@${school.emailDomain}${t(' 이메일만 사용할 수 있어요.')}` };
  }
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await store.setCode({ email, code, expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString() });
  const mail = await sendCodeMail(email, code, lang);
  const hint = mail.sent ? t('인증 코드를 보냈어요. 메일함을 확인해주세요.') : mail.devCode ? `${t('메일 발송이 설정되지 않아 코드를 바로 보여드려요: ')}${mail.devCode}` : t('메일을 보내지 못했어요. 잠시 후 다시 시도해주세요.');
  return { ok: mail.sent || !!mail.devCode, hint };
}));

app.post('/api/schools/verify-code', wrap(async (req) => {
  const email = norm(req.body.email);
  const code = String(req.body.code ?? '').trim();
  const saved = await store.takeCode(email);
  const ok = !!saved && saved.code === code && new Date(saved.expiresAt).getTime() >= Date.now();
  if (ok) {
    verifiedEmails.add(email);
    // 로그인 코드로도 계속 쓸 수 있게 다시 저장
    await store.setCode({ email, code, expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString() });
  }
  return { ok };
}));

// ─── 수업 목록 ───────────────────────────────────────────────────────────
app.post('/api/catalog/courses', wrap(async (req) => searchCatalog(catalog, String(req.body.schoolId ?? ''), String(req.body.query ?? ''))));

// ─── RPC (엔진 메서드) ────────────────────────────────────────────────────
type Group = 'users' | 'activities' | 'posts' | 'relationships' | 'orgs' | 'opportunities' | 'proposals' | 'together' | 'chats' | 'notifications' | 'reports';
const GROUPS: Group[] = ['users', 'activities', 'posts', 'relationships', 'orgs', 'opportunities', 'proposals', 'together', 'chats', 'notifications', 'reports'];

/** 호출자가 해당 작업을 할 권한이 있는지. 숫자면 그 위치의 인자가 본인 id 여야 한다 */
type Rule = number | ((me: ID, args: unknown[]) => boolean);
const owner = <T extends { id: ID }>(list: () => T[], pick: (x: T) => ID | undefined) => (me: ID, args: unknown[]) => { const x = list().find((i) => i.id === args[0]); return !!x && pick(x) === me; };
const activityHost = (me: ID, activityId: unknown) => db.activities.find((a) => a.id === activityId)?.hostId === me;
const RULES: Record<Group, Record<string, Rule>> = {
  users: { update: 0, setAvailability: 0, votePoll: 1 },
  activities: {
    create: 0, update: owner(() => db.activities, (a) => a.hostId), remove: owner(() => db.activities, (a) => a.hostId), join: 1, cancel: 1,
    approve: (me, args) => { const p = db.participations.find((x) => x.id === args[0]); return !!p && activityHost(me, p.activityId); },
    reject: (me, args) => { const p = db.participations.find((x) => x.id === args[0]); return !!p && activityHost(me, p.activityId); },
    comment: 1,
  },
  posts: { create: 0, remove: owner(() => db.posts, (p) => p.authorId), toggleLike: 1, toggleSave: 1, comment: 1, approveTag: 1 },
  relationships: {
    toggleLike: 0, toggleFollow: 0, sendFriendRequest: 0, block: 0, unblock: 0,
    cancelFriendRequest: owner(() => db.relationships.friendRequests, (r) => r.fromId),
    respondFriendRequest: owner(() => db.relationships.friendRequests, (r) => r.toId),
    unfriend: (me, args) => args[0] === me || args[1] === me,
  },
  orgs: { apply: 1 },
  opportunities: { create: 0, setIntent: 1, toggleSave: 1, ask: 1, review: 1 },
  proposals: { create: 0, respond: owner(() => db.proposals, (p) => p.toId) },
  together: { create: 0, vote: 1, addOption: 1, decide: owner(() => db.timePolls, (p) => p.hostId), cancel: owner(() => db.timePolls, (p) => p.hostId) },
  chats: { send: 1, markRead: 1, openDirect: 0 },
  notifications: { markRead: owner(() => db.notifications, (n) => n.userId), markAllRead: 0 },
  reports: { create: 0 },
};

app.post('/api/rpc/:group/:method', auth, wrap(async (req: Req) => {
  const me = requireUser(req);
  const group = req.params.group as Group;
  const method = String(req.params.method);
  const args: unknown[] = Array.isArray(req.body.args) ? req.body.args : [];
  if (!GROUPS.includes(group) || !(method in RULES[group])) throw bad('Unknown method', 404);
  const rule = RULES[group][method];
  const allowed = typeof rule === 'number' ? args[rule] === me : rule(me, args);
  if (!allowed) throw bad(t('권한이 없어요.'), 403);
  const fn = (engine[group] as Record<string, (...a: unknown[]) => unknown>)[method];
  const result = fn(...args) as Patch | { patch: Patch } | undefined;
  const patch: Patch = result && 'patch' in result ? result.patch : (result ?? {});
  void store.applyPatch(patch);
  broadcast(patch);
  return result ?? {};
}));

// ─── SSE ─────────────────────────────────────────────────────────────────
app.get('/api/events', auth, (req: Req, res) => {
  if (!req.userId) { res.status(401).end(); return; }
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'x-accel-buffering': 'no' });
  res.write(': connected\n\n');
  const set = clients.get(req.userId) ?? new Set<Response>();
  set.add(res); clients.set(req.userId, set);
  const ping = setInterval(() => res.write(': ping\n\n'), 25_000);
  req.on('close', () => { clearInterval(ping); set.delete(res); if (set.size === 0) clients.delete(req.userId!); });
});

// ─── 시스템 ──────────────────────────────────────────────────────────────
app.post('/api/system/reset', auth, wrap(async (req: Req) => {
  requireUser(req);
  if (process.env.ALLOW_RESET !== '1') throw bad(t('이 서버에서는 초기화할 수 없어요.'), 403);
  db = await loadSeed();
  await store.replaceAll(db);
  return {};
}));

/** 데이터 에이전트 최근 실행 — 학교별 마지막 결과와 최근 기록 (읽기 전용) */
// ─── 의견 ──────────────────────────────────────────────────────────────────
app.post('/api/feedback', auth, wrap(async (req: Req) => {
  const message = String(req.body.message ?? '').trim().slice(0, 4000);
  const page = String(req.body.page ?? '').slice(0, 200);
  if (!message) throw bad(t('입력값을 확인해주세요.'));
  const user = req.userId ? db.users.find((u) => u.id === req.userId) : undefined;
  const schoolId = user?.affiliation.type === 'university' ? user.affiliation.schoolId : undefined;
  await store.addFeedback({ id: randomBytes(8).toString('hex'), userId: user?.id, schoolId, page, message, createdAt: new Date().toISOString() });
  const to = process.env.FEEDBACK_EMAIL;
  if (to) void sendMail(to, `[AroundU feedback] ${user?.nickname ?? 'guest'} · ${schoolId ?? '-'}`, `${message}\n\n— ${user ? `${user.nickname} (${user.id})` : 'guest'} · ${schoolId ?? '-'} · ${page}`).catch(() => {});
  return { ok: true };
}));
app.get('/api/feedback', wrap(async (req) => {
  if (!process.env.ADMIN_KEY || req.headers['x-admin-key'] !== process.env.ADMIN_KEY) throw bad('forbidden', 403);
  return { feedback: await store.listFeedback(500) };
}));

// ─── AI ───────────────────────────────────────────────────────────────────
const isAdmin = (req: Request) => !!process.env.ADMIN_KEY && req.headers['x-admin-key'] === process.env.ADMIN_KEY;
async function logAi(l: Omit<AiLog, 'id' | 'createdAt'>) {
  try { await store.addAiLog({ ...l, input: l.input.slice(0, 4000), output: l.output.slice(0, 4000), id: randomBytes(8).toString('hex'), createdAt: new Date().toISOString() }); } catch (e) { console.error('[ai] log failed', e); }
}
/** AI 호출 오류를 사용자에게 읽히는 문장으로 바꾼다 */
async function runAi<T>(kind: AiLog['kind'], ctx: { userId?: ID; schoolId?: ID; input: string }, fn: () => Promise<T>, summarize: (r: T) => string): Promise<T> {
  if (!aiEnabled()) throw bad('AI is not set up yet.', 503);
  try {
    const r = await fn();
    void logAi({ kind, ...ctx, output: summarize(r), ok: true });
    return r;
  } catch (e) {
    void logAi({ kind, ...ctx, output: String((e as Error).message), ok: false });
    if (e instanceof AiError) throw bad(e.message, e.status);
    console.error(`[ai] ${kind} failed`, e);
    throw bad('The assistant is having trouble right now — please try again in a minute.', 502);
  }
}
const schoolIdOf = (u?: { affiliation: { type: string; schoolId?: string } }) => (u?.affiliation.type === 'university' ? u.affiliation.schoolId : undefined);

app.get('/api/ai/status', (_req, res) => { res.json({ enabled: aiEnabled() }); });

app.post('/api/ai/ask', auth, wrap(async (req: Req) => {
  const me = db.users.find((u) => u.id === requireUser(req))!;
  const raw = Array.isArray(req.body.messages) ? req.body.messages : [];
  const history = raw.filter((m: { role?: unknown; content?: unknown }) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m: { role: 'user' | 'assistant'; content: string }) => ({ role: m.role, content: m.content.slice(0, 2000) }));
  if (!history.length || history[history.length - 1].role !== 'user') throw bad(t('입력값을 확인해주세요.'));
  rateLimit(`ask:${me.id}`, 40);
  const question = history[history.length - 1].content;
  return runAi('ask', { userId: me.id, schoolId: schoolIdOf(me), input: question }, () => ask(db, catalog, me, history), (r) => `${r.answer}\n[cards: ${r.cards.map((c) => c.id).join(', ')}]`);
}));

app.post('/api/ai/profile-draft', wrap(async (req) => {
  const text = String(req.body.text ?? '').trim().slice(0, 6000);
  const schoolId = String(req.body.schoolId ?? '');
  if (text.length < 10) throw bad('Write a sentence or two about yourself first.');
  if (!db.schools.some((s) => s.id === schoolId)) throw bad(t('입력값을 확인해주세요.'));
  rateLimit(`profile:${req.ip}`, 15);
  return runAi('profile', { schoolId, input: text }, () => profileDraft(db, schoolId, text), (r) => JSON.stringify(r.draft));
}));

app.post('/api/ai/starters', auth, wrap(async (req: Req) => {
  const me = db.users.find((u) => u.id === requireUser(req))!;
  const target = db.users.find((u) => u.id === String(req.body.userId ?? ''));
  if (!target || target.id === me.id) throw bad(t('입력값을 확인해주세요.'), 404);
  rateLimit(`starters:${me.id}`, 30);
  const language = req.body.lang === 'ko' ? 'ko' : 'en';
  const r = await runAi('starters', { userId: me.id, schoolId: schoolIdOf(me), input: target.id }, () => starters(db, me, target, language), (x) => x.starters.join(' | '));
  return { starters: r.starters };
}));

app.get('/api/ai/logs', wrap(async (req) => {
  if (!isAdmin(req)) throw bad('forbidden', 403);
  return { logs: await store.listAiLogs(500) };
}));

app.get('/api/agent/status', wrap(async () => {
  const runs = await store.listAgentRuns(2000);
  const latest: Record<string, { status: string; finishedAt: string; summary: Record<string, unknown> }> = {};
  for (const r of runs) if (!latest[r.task]) latest[r.task] = { status: r.status, finishedAt: r.finishedAt, summary: r.summary };
  return { latest, recent: runs.slice(0, 30) };
}));
app.get('/api/health', (_req, res) => { res.json({ ok: true, users: db.users.length, lang, store: process.env.DATABASE_URL ? 'postgres' : 'file' }); });

// ─── 정적 파일 (빌드된 프론트엔드) ─────────────────────────────────────────
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist, { index: 'index.html', maxAge: '1h' }));
  app.get(/^(?!\/api\/).*/, (_req, res) => { res.sendFile(path.join(dist, 'index.html')); });
  console.log('[static] serving', dist);
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = err instanceof HttpError || err instanceof AiError ? err.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: err instanceof Error ? err.message : 'error' });
});

app.listen(PORT, () => console.log(`[aroundu] listening on :${PORT} (lang=${lang}, demo=${process.env.DEMO_AUTOREPLY === '1'})`));
