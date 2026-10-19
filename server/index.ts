/**
 * Lumi API 서버 — Railway 에 배포하는 단일 서비스 (API + 빌드된 프론트엔드 정적 파일).
 *
 *   POST /api/auth/{demo,login,register,logout,me}
 *   POST /api/auth/delete-account      본인 계정 영구 삭제 { confirm: 'DELETE' } (server/account.ts) — 데모·예시 계정은 거절
 *   POST /api/bootstrap
 *   POST /api/schools/{search,send-code,verify-code}
 *   POST /api/catalog/{courses,departments,terms,sections}   term 생략 = 지금 학기 (Fall 2026 …)
 *   POST /api/rpc/:group/:method        body: { args: [...] }  → 엔진 메서드 호출, Patch 반환
 *   GET  /api/events?token=…            SSE: 다른 사용자의 변경을 Patch 로 푸시
 *   POST /api/system/reset              ALLOW_RESET=1 일 때만
 *   POST /api/feedback                  써 본 사람의 의견 → DB + FEEDBACK_EMAIL 로 메일
 *   GET  /api/feedback                  x-admin-key: ADMIN_KEY 일 때만 목록
 *   GET  /api/ai/status                 AI 켜짐 여부 (OPENAI_API_KEY 또는 API_KEY)
 *   POST /api/ai/{ask,profile-draft,starters}   server/ai.ts — 질문 답변·대화형 가입·첫마디 제안
 *   GET  /api/ai/logs                   x-admin-key 일 때만 — 학생들이 무엇을 물었는지
 *   GET  /api/legal, /privacy, /terms   공개 법적 페이지 (server/legal.ts) — LEGAL_NAME · PRIVACY_CONTACT_EMAIL
 *   POST /api/push/{register,unregister}  iPhone 앱 푸시 토큰 (server/push.ts) — EXPO_ACCESS_TOKEN(선택), PUSH_DISABLED=1
 *   GET  /.well-known/apple-app-site-association  유니버설 링크 (server/app-links.ts) — APPLE_TEAM_ID + IOS_BUNDLE_ID 없으면 404
 *
 * 환경변수: PORT, DATABASE_URL, AROUNDU_LANG(ko|en), DEMO_AUTOREPLY(1이면 데모 자동응답), ALLOW_DEMO_LOGIN(0이면 비활성),
 *          ALLOW_RESET, RESEND_API_KEY, MAIL_FROM, HIDE_DEV_CODE, CORS_ORIGIN, VERIFY_EMAIL_DOMAIN(0이면 학교 도메인 검사 생략)
 *          REVIEW_LOGIN_EMAIL + REVIEW_LOGIN_CODE(6자리) — App Review 로그인 (server/review-login.ts). 없으면 그 주소도 평범한 주소
 *   POST /api/chats/viewing            지금 열려 있는 채팅방 → 그 방의 새 메시지 푸시를 보내지 않는다 (server/chat-push.ts)
 *
 * 신고·운영 (server/moderation.ts): POST /api/rpc/reports/create → 저장 + FEEDBACK_EMAIL 알림 + 3명 신고 시 자동 숨김,
 *   GET /admin/reports (관리 화면, ADMIN_KEY 입력), /api/admin/reports·/api/admin/users/:id/… (x-admin-key) — 기각·삭제·정지·정지 해제
 */
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { randomBytes, randomInt } from 'node:crypto';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { t, lang } from '@core/i18n';
import type { Patch, Snapshot, RegisterInput, CatalogCourse } from '@core/api/types';
import type { Game, ID, User } from '@core/types';
import { sanitizeSelfUpdate } from '@core/lib/selfupdate';
import { createEngine } from '@core/api/engine';
import { createSectionReader } from './sections';
import { searchCatalog, catalogDepartments, catalogTerms, resolveCatalogTerm, catalogCourses as builtInCatalog } from '@core/data/catalog/courses';
import { createStore } from './store';
import { snapshotFor, patchFor } from './view';
import { TOGETHER_RULES, ruleAllows } from './together-rules';
import { gameFor } from '@core/lib/icebreakers';
import { sendCodeMail, sendMail } from './mail';
import { registerRideRoutes } from './rides';
import { migrateDemo, demoUserIdFor, rollSampleActivities, rollSampleContent } from './demo';
import { hiddenSamplesFor, SAMPLE_OPPORTUNITY_IDS, SAMPLE_ORG_IDS } from './samples';
import { aiEnabled, ask, profileDraft, starters, rateLimit, AiError, campusToday, forgetStarters } from './ai';
import { registerAccountRoutes } from './account';
import type { AiLog } from './store';
import { loadSeed } from './seed';
import { startCampusLive, liveServices } from './campus-live';
import { registerPlanRoutes } from './plans';
import { createCampusData, mountCampusRoutes, mergeWorkerNotifications } from './campus-api';
import { createClassesEngine } from '@core/api/classes';
import { CLASSES_RULES, registerClassRoutes, startStudyGroupJob } from './classes';
import { registerLegalRoutes } from './legal';
import { aiViewFor, isSuspended, registerModerationRoutes, sessionAuth, signInBlock, suspendedMessage } from './moderation';
import { createPush, registerPushRoutes } from './push';
import { registerAppLinkRoutes } from './app-links';
import { PROTECTED_IDS } from './account';
import { createReviewLogin, reviewConfig, ReviewLoginError } from './review-login';

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
// 학교별로 나눠 둔다 — 검색할 때마다 전체(수만 개)를 훑지 않게
const bySchool = (list: CatalogCourse[]) => { const m = new Map<string, CatalogCourse[]>(); for (const c of list) (m.get(c.schoolId) ?? m.set(c.schoolId, []).get(c.schoolId)!).push(c); return m; };
let catalogBySchool = bySchool(catalog);
let catalogVersion = await store.catalogVersion();

db.games ??= []; // 게임 기능 이전에 저장된 스냅샷
{ const p = migrateDemo(db); if (p) { await store.applyPatch(p); console.log(`[demo] updated ${p.users?.length ?? 0} sample users, hid ${p.removed?.schools?.length ?? 0} schools`); } }
// 예시 모임 날짜를 오늘 기준으로 — 켜질 때 한 번, 그 뒤 15분마다 (지난 것은 곧 시작하는 시간으로 민다)
async function rollSamples() {
  const p = rollSampleActivities(db); if (p) { await store.applyPatch(p); broadcast(p); console.log(`[demo] rolled ${p.activities?.length ?? 0} sample activities`); }
  // 예시 글·대화 시각도 지금 기준으로 (3주 전 날짜에 "tonight" 이 붙어 보이지 않게)
  const c = rollSampleContent(db); if (c) { await store.applyPatch(c); broadcast(c); console.log(`[demo] rolled ${c.posts?.length ?? 0} sample posts, ${c.participations?.length ?? 0} sample join requests, ${c.chatRooms?.length ?? 0} sample chats, ${c.notifications?.length ?? 0} sample notifications`); }
}
const clients = new Map<ID, Set<Response>>();
// iPhone app push (server/push.ts) — every broadcast Patch with a new notification → Expo Push API
// suspended and sample accounts are refused inside push.ts too; the shared demo logins are in PROTECTED_IDS
const push = createPush({ store, db: () => db, allow: (id) => !PROTECTED_IDS.has(id) && !isSuspended(db.users.find((u) => u.id === id)), accessToken: process.env.EXPO_ACCESS_TOKEN, disabled: process.env.PUSH_DISABLED === '1' });
await push.load();
setInterval(() => { void push.checkReceipts(); }, 15 * 60 * 1000).unref();
await rollSamples();

function broadcast(patch: Patch) {
  void push.onPatch(patch);
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

// 같은 수업 — 스터디 그룹 제안·파트너 목록 (server/classes.ts)
const pushPatch = (patch: Patch) => { void store.applyPatch(patch); broadcast(patch); };
const classes = createClassesEngine({ get db() { return db; }, t, demo: false, push: pushPatch }, { catalog: (schoolId) => catalogBySchool.get(schoolId) ?? [] });

// ─── 데이터 에이전트와 동기화 ────────────────────────────────────────────────
// 워커(별도 Railway 서비스)는 Postgres 에 동아리·공고·학교·수업 목록을 쓴다. 웹 서버는 켜질 때 한 번만 읽으므로
// DATA_SYNC_SECONDS(기본 120초)마다 그 컬렉션만 다시 읽고, 바뀐 것은 접속 중인 화면에도 Patch 로 보낸다.
const WORKER_COLLECTIONS = ['organizations', 'opportunities', 'schools'] as const;
async function syncFromWorker() {
  const snap = await store.loadSnapshot(); if (!snap) return;
  // 워커가 보낸 좌석 알림 · 학사 일정 · 좌석 수 (server/campus-api.ts)
  { const p = mergeWorkerNotifications(db, snap.notifications ?? []); if (p) { broadcast(p); console.log(`[sync] seat alerts ${p.notifications!.length}`); } }
  await campus.refresh();
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
  // 수업 목록은 크다 (학교 × 2학기) — 바뀌었을 때만 다시 읽는다
  const v = await store.catalogVersion();
  if (v !== catalogVersion) { const nextCatalog = await store.loadCatalog(); if (nextCatalog.length) { catalog = nextCatalog; catalogBySchool = bySchool(catalog); catalogVersion = v; console.log(`[sync] catalog ${catalog.length} courses`); } }
}
setInterval(() => { rollSamples().catch((e) => console.error('[demo] roll failed', e)); }, 15 * 60 * 1000);
// 학사 일정 · 좌석 알림 (워커가 쓰고 웹은 읽는다)
const campus = createCampusData(store);
await campus.load();
setInterval(() => { syncFromWorker().catch((e) => console.error('[sync] failed', e)); }, Number(process.env.DATA_SYNC_SECONDS ?? 120) * 1000);

// ─── 앱 ─────────────────────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) ?? true, credentials: false }));
app.use(express.json({ limit: '2mb' }));
// /.well-known/apple-app-site-association — before static files and the SPA catch-all (server/app-links.ts)
registerAppLinkRoutes(app);

class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
const bad = (msg: string, status = 400) => new HttpError(status, msg);

type Req = Request & { userId?: ID; suspended?: boolean };
/** 세션 토큰 → req.userId. 정지된 계정의 토큰은 사용자로 풀리지 않는다 (req.suspended) — server/moderation.ts */
const auth = sessionAuth({ db: () => db, findSession: (token) => store.findSession(token) });
const requireUser = (req: Req): ID => {
  if (req.suspended) throw bad(suspendedMessage(), 403);
  if (!req.userId) throw bad(t('로그인이 필요해요.'), 401);
  return req.userId;
};
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

// App Review sign-in — REVIEW_LOGIN_EMAIL + REVIEW_LOGIN_CODE (server/review-login.ts). Unset → that address is ordinary.
const reviewLogin = createReviewLogin({
  config: reviewConfig(), db: () => db,
  findAccount: (email) => store.findAccount(email), createAccount: (a) => store.createAccount(a),
  register: (input) => engine.register(input),
  async saved(user) { const p: Patch = { users: [user], notifications: db.notifications.filter((n) => n.userId === user.id) }; await store.applyPatch(p); broadcast(p); },
  wrongCode: t('인증 코드가 만료되었거나 올바르지 않아요.'),
});
const reviewErr = (e: unknown) => (e instanceof ReviewLoginError ? bad(e.message, e.status) : e);

// ─── 인증 ────────────────────────────────────────────────────────────────
app.post('/api/auth/demo', wrap(async (req) => {
  if (process.env.ALLOW_DEMO_LOGIN === '0') throw bad(t('데모 계정이 없어요. 회원가입을 이용해주세요.'), 403);
  const user = db.users.find((u) => u.id === demoUserIdFor(String(req.body?.schoolId ?? '')));
  if (!user) throw bad(t('데모 계정이 없어요. 회원가입을 이용해주세요.'), 404);
  { const blocked = signInBlock(user); if (blocked) throw bad(blocked, 403); }
  return { token: await issueSession(user.id), user };
}));

app.post('/api/auth/login', wrap(async (req) => {
  const email = norm(req.body.email);
  const code = String(req.body.code ?? '').trim();
  if (reviewLogin.matches(email)) {
    const user = await reviewLogin.signIn(code, req.ip ?? '-').catch((e) => { throw reviewErr(e); });
    { const blocked = signInBlock(user); if (blocked) throw bad(blocked, 403); }
    return { token: await issueSession(user.id), user };
  }
  const saved = await store.takeCode(email);
  if (!saved || saved.code !== code || new Date(saved.expiresAt).getTime() < Date.now()) throw bad(t('인증 코드가 만료되었거나 올바르지 않아요.'));
  const account = await store.findAccount(email);
  const user = account ? db.users.find((u) => u.id === account.userId) : undefined;
  if (!user) throw bad(t('이 이메일로 가입된 계정이 없어요.'), 404);
  { const blocked = signInBlock(user); if (blocked) throw bad(blocked, 403); }
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

// 가입 후에 학교 이메일을 붙인다 (빠른 가입에서 건너뛴 사람) — 코드로 확인한 이메일만
app.post('/api/auth/attach-email', auth, wrap(async (req: Req) => {
  const me = requireUser(req);
  const email = norm(req.body.email);
  if (!verifiedEmails.has(email)) throw bad(t('인증 코드가 만료되었거나 올바르지 않아요.'));
  const owner = await store.findAccount(email);
  if (owner && owner.userId !== me) throw bad(t('이미 가입된 이메일이에요. 이메일로 로그인해주세요.'), 409);
  if (!owner) await store.createAccount({ email, userId: me, createdAt: new Date().toISOString() });
  verifiedEmails.delete(email);
  const user = db.users.find((u) => u.id === me)!;
  if (user.affiliation.type === 'university' && !user.affiliation.emailVerified) {
    const patch = engine.users.update(me, { affiliation: { ...user.affiliation, emailVerified: true } });
    await store.applyPatch(patch); broadcast(patch);
  }
  return { user: db.users.find((u) => u.id === me) };
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

// ─── 같이 타기 (rides) — /api/rpc/rides/*, /api/rides/teaser, /r/:id 공유 링크 (server/rides.ts) ─────────
registerRideRoutes(app, { db: () => db, auth, push(patch) { void store.applyPatch(patch); broadcast(patch); } });

// ─── 학교·이메일 인증 ─────────────────────────────────────────────────────
/** 인증을 통과한 이메일 (가입 완료 전까지 메모리에만 둔다) */
const verifiedEmails = new Set<string>();

// 첫 화면 카드 — 이번 주 무료 음식, 가장 가까운 마감, 동아리 수 (로그인 전에도 보인다)
const SHORT: Record<string, string> = { s_berkeley: 'Cal', s_ucmerced: 'Merced' };
app.post('/api/schools/highlights', wrap(async (req) => {
  const sid = String(req.body.schoolId ?? 's_berkeley');
  const school = db.schools.find((s) => s.id === sid);
  if (!school) return null;
  const tz = school.tz ?? 'America/Los_Angeles';
  const { date: today } = campusToday(tz);
  const weekEnd = new Date(Date.parse(`${today}T12:00:00Z`) + 7 * 86400000).toISOString().slice(0, 10);
  // 로그인 전 첫 화면 — 데모용 시드 공고·동아리는 숫자에도 넣지 않는다 (server/samples.ts)
  const mine = db.opportunities.filter((o) => (!o.schoolId || o.schoolId === sid) && !SAMPLE_OPPORTUNITY_IDS.has(o.id));
  // 저장된 시각은 UTC — 그 학교 시간대 날짜로 바꿔야 '10/19 23:59 마감'이 10/20 으로 보이지 않는다
  const pt = (iso: string) => (/T/.test(iso) ? new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso)) : iso.slice(0, 10));
  const nowHHMM = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date());
  const food = mine.filter((o) => o.tags.includes('free food') && o.date && pt(o.date) >= today && pt(o.date) <= weekEnd)
    .filter((o) => pt(o.date!) > today || !o.startTime || o.startTime >= nowHHMM) // 오늘 이미 시작한 건 빼고
    .sort((a, b) => (a.date! + (a.startTime ?? '')).localeCompare(b.date! + (b.startTime ?? '')));
  const open = mine.filter((o) => o.deadline && pt(o.deadline) >= today).sort((a, b) => a.deadline!.localeCompare(b.deadline!));
  const dl = open.find((o) => o.type === 'scholarship' || o.type === 'lab') ?? open[0];
  return {
    schoolShort: SHORT[sid] ?? db.schools.find((s) => s.id === sid)!.name,
    freeFoodThisWeek: food.length,
    food: food[0] ? { title: food[0].title, date: pt(food[0].date!), startTime: food[0].startTime, place: food[0].place?.name } : undefined,
    deadline: dl ? { title: dl.title, deadline: pt(dl.deadline!), host: dl.host } : undefined,
    clubs: db.organizations.filter((o) => o.schoolId === sid && !SAMPLE_ORG_IDS.has(o.id)).length,
    internships: mine.filter((o) => o.type === 'internship').length,
  };
}));

app.post('/api/schools/search', wrap(async (req) => engine.schools.search(String(req.body.query ?? ''))));

app.post('/api/schools/send-code', wrap(async (req) => {
  const email = norm(req.body.email);
  const school = db.schools.find((s) => s.id === req.body.schoolId);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, hint: t('이메일 형식을 확인해주세요.') };
  // App Review 주소 — 메일을 보내지 않는다. 코드는 리뷰 노트에 있다 (server/review-login.ts)
  if (reviewLogin.matches(email)) return { ok: true, hint: t('인증 코드를 보냈어요. 메일함을 확인해주세요.') };
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
  if (reviewLogin.matches(email)) {
    let ok: boolean;
    try { ok = reviewLogin.verify(code, req.ip ?? '-'); } catch (e) { throw reviewErr(e); }
    if (ok) verifiedEmails.add(email);
    return { ok };
  }
  const saved = await store.takeCode(email);
  const ok = !!saved && saved.code === code && new Date(saved.expiresAt).getTime() >= Date.now();
  if (ok) {
    verifiedEmails.add(email);
    // 로그인 코드로도 계속 쓸 수 있게 다시 저장
    await store.setCode({ email, code, expiresAt: new Date(Date.now() + CODE_TTL_MS).toISOString() });
  }
  return { ok };
}));

// ─── 계정 삭제 — POST /api/auth/delete-account (server/account.ts) ──────────────
registerAccountRoutes(app, {
  db: () => db, store, auth,
  broadcast(patch) { broadcast(patch); },
  disconnect(userId) { for (const res of clients.get(userId) ?? []) res.end(); clients.delete(userId); },
  forget: [
    (id) => campus.forgetUser(id),
    (id) => liveServices()?.dining.forgetUser(id),
    (id) => liveServices()?.gym.forgetUser(id),
    (id, emails) => { emails.forEach((e) => verifiedEmails.delete(e)); forgetStarters(id); },
    (id) => push.forgetUser(id),
  ],
});

// ─── 푸시 토큰 — POST /api/push/{register,unregister} (server/push.ts) ─────────────
registerPushRoutes(app, push, { auth });

// ─── 수업 목록 ───────────────────────────────────────────────────────────
// term 을 안 주면 지금 학기 (그 학교에 지금 학기 수업이 없으면 학기 구분 없이)
const schoolCatalog = (schoolId: string) => catalogBySchool.get(schoolId) ?? [];
const readSections = createSectionReader();
// 딸린 섹션(c.sections)은 빼고 보낸다 — 학과 목록 400줄에 섹션 수십 개씩이면 너무 크다. 고를 때 /api/catalog/sections 로
app.post('/api/catalog/courses', wrap(async (req) => { const s = String(req.body.schoolId ?? ''); const list = schoolCatalog(s); return searchCatalog(list, s, String(req.body.query ?? ''), 30, String(req.body.department ?? ''), resolveCatalogTerm(list, s, String(req.body.term ?? ''))).map(({ sections: _sections, ...c }) => c); }));
app.post('/api/catalog/departments', wrap(async (req) => { const s = String(req.body.schoolId ?? ''); const list = schoolCatalog(s); return catalogDepartments(list, s, resolveCatalogTerm(list, s, String(req.body.term ?? ''))); }));
app.post('/api/catalog/terms', wrap(async (req) => { const s = String(req.body.schoolId ?? ''); const list = schoolCatalog(s); return { terms: catalogTerms(list, s), current: resolveCatalogTerm(list, s) }; }));
// 강의에 딸린 토론·랩 — 학생이 그 수업을 넣을 때 학교 시간표에서 읽어 온다 (6시간 기억)
app.post('/api/catalog/sections', wrap(async (req) => { const s = String(req.body.schoolId ?? ''); const c = schoolCatalog(s).find((x) => x.id === String(req.body.courseId ?? '')); return c ? readSections(c) : []; }));

// ─── 학사 일정 · 좌석 알림 ── /api/academic/dates, /api/seats/{mine,watch,unwatch}
mountCampusRoutes(app, campus, { auth, wrap, requireUser, bad, user: (id) => db.users.find((u) => u.id === id), catalog: schoolCatalog });

// ─── 링크로 묻는 약속 /p/<id> ─────────────────────────────────────────────
// 공개 페이지(OG)·손님 답·.ics·RPC plans.* (server/plans.ts) — 일반 RPC·정적 파일보다 먼저 등록한다
registerPlanRoutes(app, {
  db: () => db, auth, push: (p) => { void store.applyPatch(p); broadcast(p); }, patchFor: (p, me) => patchFor(p, me, db),
  dist: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist'),
});

// ─── 신고·운영 — /api/rpc/reports/create (일반 RPC보다 먼저), /admin/reports, /api/admin/* (server/moderation.ts) ─────
registerModerationRoutes(app, {
  db: () => db, auth, push: pushPatch, patchFor: (p, me) => patchFor(p, me, db), sendMail,
  disconnect(userId) { for (const res of clients.get(userId) ?? []) res.end(); clients.delete(userId); },
});

// ─── RPC (엔진 메서드) ────────────────────────────────────────────────────
type Group = 'users' | 'activities' | 'posts' | 'relationships' | 'orgs' | 'opportunities' | 'proposals' | 'together' | 'games' | 'chats' | 'notifications' | 'reports' | 'classes';
const GROUPS: Group[] = ['users', 'activities', 'posts', 'relationships', 'orgs', 'opportunities', 'proposals', 'together', 'games', 'chats', 'notifications', 'reports', 'classes'];

/** 호출자가 해당 작업을 할 권한이 있는지. 숫자면 그 위치의 인자가 본인 id 여야 한다 */
type Rule = number | ((me: ID, args: unknown[]) => boolean);
const owner = <T extends { id: ID }>(list: () => T[], pick: (x: T) => ID | undefined) => (me: ID, args: unknown[]) => { const x = list().find((i) => i.id === args[0]); return !!x && pick(x) === me; };
const activityHost = (me: ID, activityId: unknown) => db.activities.find((a) => a.id === activityId)?.hostId === me;
const RULES: Record<Group, Record<string, Rule>> = {
  users: { update: 0, setAvailability: 0, votePoll: 1, ...TOGETHER_RULES.users },
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
  opportunities: { create: 0, setIntent: 1, toggleSave: 1, ask: 1, review: 1, ...TOGETHER_RULES.opportunities },
  proposals: { create: 0, respond: owner(() => db.proposals, (p) => p.toId) },
  together: { create: 0, vote: 1, addOption: 1, decide: owner(() => db.timePolls, (p) => p.hostId), cancel: owner(() => db.timePolls, (p) => p.hostId) },
  // 보내는 사람 = 본인, 답하기·넘기기 = 받은 사람 본인 (엔진도 한 번 더 확인한다)
  games: { send: 0, answer: (me, args) => args[1] === me && owner(() => db.games, (g) => g.toId)(me, args), decline: (me, args) => args[1] === me && owner(() => db.games, (g) => g.toId)(me, args) },
  chats: { send: 1, markRead: 1, openDirect: 0 },
  notifications: { markRead: owner(() => db.notifications, (n) => n.userId), markAllRead: 0 },
  reports: { create: 0 },
  ...CLASSES_RULES,
};

app.post('/api/rpc/:group/:method', auth, wrap(async (req: Req) => {
  const me = requireUser(req);
  const group = req.params.group as Group;
  const method = String(req.params.method);
  const args: unknown[] = Array.isArray(req.body.args) ? req.body.args : [];
  if (!GROUPS.includes(group) || !(method in RULES[group])) throw bad('Unknown method', 404);
  const rule = RULES[group][method];
  const allowed = ruleAllows(rule, me, args);
  if (!allowed) throw bad(t('권한이 없어요.'), 403);
  // 자기 프로필 수정으로 서버 전용 값(인증·예시·정지)을 바꾸지 못하게
  if (group === 'users' && method === 'update') { const u = db.users.find((x) => x.id === me); if (u) args[1] = sanitizeSelfUpdate(u, args[1] as Partial<User>); }
  const fn = ((group === 'classes' ? classes : engine[group]) as Record<string, (...a: unknown[]) => unknown>)[method];
  const result = fn(...args) as Patch | { patch: Patch } | undefined;
  const patch: Patch = result && 'patch' in result ? result.patch : (result ?? {});
  void store.applyPatch(patch);
  broadcast(patch);
  // 호출한 사람에게 돌려주는 응답도 그 사람 관점으로 거른다 (다른 사람 프로필의 게임 정답·다른 사람 알림이 새지 않게)
  const mine = patchFor(patch, me, db) ?? {};
  if (result && 'patch' in result) {
    const out: Record<string, unknown> = { ...result, patch: mine };
    if ('game' in result) out.game = gameFor((result as { game: Game }).game, me);
    return out;
  }
  return mine;
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
  db.games ??= [];
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
  if (to) void sendMail(to, `[Lumi feedback] ${user?.nickname ?? 'guest'} · ${schoolId ?? '-'}`, `${message}\n\n— ${user ? `${user.nickname} (${user.id})` : 'guest'} · ${schoolId ?? '-'} · ${page}`).catch(() => {});
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
  return runAi('ask', { userId: me.id, schoolId: schoolIdOf(me), input: question }, () => ask(aiViewFor(db, me), schoolCatalog(schoolIdOf(me) ?? ''), me, history, campus.dates(schoolIdOf(me) ?? '')), (r) => `${r.answer}\n[cards: ${r.cards.map((c) => c.id).join(', ')}]`);
}));

app.post('/api/ai/profile-draft', wrap(async (req) => {
  const text = String(req.body.text ?? '').trim().slice(0, 6000);
  const schoolId = String(req.body.schoolId ?? '');
  if (text.length < 10) throw bad('Write a sentence or two about yourself first.');
  if (!db.schools.some((s) => s.id === schoolId)) throw bad(t('입력값을 확인해주세요.'));
  rateLimit(`profile:${req.ip}`, 15);
  // 가입 중인 실제 학생 — 예시 동아리·공고를 추천하지 않는다
  return runAi('profile', { schoolId, input: text }, () => profileDraft(aiViewFor(db), schoolId, text), (r) => JSON.stringify(r.draft));
}));

app.post('/api/ai/starters', auth, wrap(async (req: Req) => {
  const me = db.users.find((u) => u.id === requireUser(req))!;
  const target = db.users.find((u) => u.id === String(req.body.userId ?? ''));
  if (!target || target.id === me.id) throw bad(t('입력값을 확인해주세요.'), 404);
  // 실제 계정은 예시 프로필을 볼 수 없다 (데모 계정은 자기 학교 예시만)
  if (hiddenSamplesFor(db, me).users.has(target.id)) throw bad(t('입력값을 확인해주세요.'), 404);
  // 정지된 사람은 다른 사람에게 보이지 않는다 (server/moderation.ts) — 첫마디 제안도 없다
  if (isSuspended(target)) throw bad(t('입력값을 확인해주세요.'), 404);
  rateLimit(`starters:${me.id}`, 30);
  const language = req.body.lang === 'ko' ? 'ko' : 'en';
  const r = await runAi('starters', { userId: me.id, schoolId: schoolIdOf(me), input: target.id }, () => starters(aiViewFor(db, me), me, target, language), (x) => x.starters.join(' | '));
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

// ─── 오늘의 학식 · 체육관 혼잡도 (server/campus-live.ts) — 웹 서버 한 곳에서 가져오고 알림을 보낸다 ─────
await startCampusLive(app, { store, auth, wrap, requireUser, bad, user: (id) => db.users.find((u) => u.id === id), notify: (notes) => { db.notifications.push(...notes); const p: Patch = { notifications: notes }; void store.applyPatch(p); broadcast(p); } });

// ─── 정적 파일 (빌드된 프론트엔드) ─────────────────────────────────────────
const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
// /c/<학교>/<과목> 공유 링크 — 정적 파일보다 먼저 (미리보기용 OG 태그를 넣는다)
registerClassRoutes(app, { classes, dist, push: pushPatch });
// /privacy · /terms — public, no sign-in (server/legal.ts)
registerLegalRoutes(app, { dist });
startStudyGroupJob({ classes, dist, push: pushPatch });
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
