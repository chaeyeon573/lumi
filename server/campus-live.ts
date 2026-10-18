/**
 * 캠퍼스 실시간 — 오늘의 학식(server/dining.ts) · 체육관 혼잡도(server/gym.ts) 를 웹 서버에 붙인다.
 *
 *   POST /api/dining/day        { date? }            → 그날 장소·영업시간·메뉴 + 내 즐겨찾기 (date 생략 = 오늘, 캠퍼스 날짜)
 *   POST /api/dining/favorite   { name, on }         → 즐겨찾기 켜기/끄기
 *   POST /api/gym/now                                → 공간별 지금 % · 오늘 시간대별 · 평소 + 내 알림
 *   POST /api/gym/alert         { displayId, below, days, start, end, enabled }   → 알림 저장 (공간당 하나)
 *   POST /api/gym/alert/remove  { displayId }
 *   POST /api/campus/now                             → Discover 카드용 요약 (지금 연 식당 + 메뉴 하나, 체육관 %)
 *   GET  /api/campus/live/status                     → 마지막 가져오기 결과 (토큰·사용자 정보 없음)
 *
 * 가져오기는 웹 서버 한 곳에서만 (사용자 수와 무관): 학식은 하루 세 번, 체육관은 5분마다. CAMPUS_LIVE=0 이면 끈다.
 * 알림은 메모리 스냅샷(db.notifications)에 넣고 접속 중인 사람에게 보낸다 (deps.notify).
 */
import type { Express, Request, Response, NextFunction } from 'express';
import type { ID, Notification, User } from '@core/types';
import { campusClock } from '@core/lib/campusclock';
import type { Store } from './store';
import { createDining, type DiningService } from './dining';
import { createGym, type GymService } from './gym';

type Req = Request & { userId?: ID };
export interface CampusLiveDeps {
  store: Store;
  auth: (req: Req, res: Response, next: NextFunction) => unknown;
  wrap: (fn: (req: Req, res: Response) => Promise<unknown> | unknown) => (req: Req, res: Response, next: NextFunction) => unknown;
  requireUser: (req: Req) => ID;
  bad: (msg: string, status?: number) => Error;
  user: (id: ID) => User | undefined;
  /** 알림을 스냅샷에 넣고 저장·전송 */
  notify(notes: Notification[]): void;
}

let services: { dining: DiningService; gym: GymService } | null = null;
/** Ask Lumi 도구가 같은 데이터를 본다 (server/ai-live.ts) */
export const liveServices = () => services;

const schoolOf = (u?: User) => (u?.affiliation.type === 'university' ? u.affiliation.schoolId ?? '' : '');
const hits = new Map<string, number[]>();
function limited(key: string, max: number, windowMs = 3_600_000) {
  const t = Date.now(); const xs = (hits.get(key) ?? []).filter((x) => t - x < windowMs);
  if (xs.length >= max) return true;
  xs.push(t); hits.set(key, xs); return false;
}

export async function startCampusLive(app: Express, deps: CampusLiveDeps) {
  const common = { store: deps.store, notify: deps.notify, userExists: (id: ID) => !!deps.user(id) };
  const dining = createDining(common);
  const gym = createGym(common);
  services = { dining, gym };
  try { await dining.load(); await gym.load(); } catch (e) { console.error('[campus-live] load failed', e); }

  const me = (req: Req) => { const id = deps.requireUser(req); const u = deps.user(id); if (!u) throw deps.bad('Not found', 404); return { id, user: u, schoolId: schoolOf(u) }; };

  app.post('/api/dining/day', deps.auth, deps.wrap(async (req) => {
    const { id, schoolId } = me(req);
    const clock = campusClock();
    const src = dining.source(schoolId);
    if (!src) return { supported: false, today: clock.date, favorites: [] };
    const date = typeof req.body?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.body.date) ? req.body.date : clock.date;
    const day = dining.day(schoolId, date) ?? null;
    if (!dining.day(schoolId, clock.date)) dining.kick(schoolId);
    return { supported: true, today: clock.date, nowMin: clock.min, date, dates: dining.dates(schoolId).filter((d) => d >= clock.date), day, favorites: dining.favoritesOf(id), source: { label: src.label, url: src.url, attribution: src.attribution }, status: day ? 'ok' : 'unavailable' };
  }));

  app.post('/api/dining/favorite', deps.auth, deps.wrap(async (req) => {
    const { id, schoolId } = me(req);
    if (!dining.supported(schoolId)) throw deps.bad('Dining menus aren’t available for your school yet.', 404);
    if (limited(`fav:${id}`, 120)) throw deps.bad('Too many changes — try again in a bit.', 429);
    const r = await dining.setFavorite(id, schoolId, String(req.body?.name ?? ''), req.body?.on !== false);
    if ('error' in r) throw deps.bad(r.error);
    return { favorites: r };
  }));

  app.post('/api/gym/now', deps.auth, deps.wrap(async (req) => {
    const { id, schoolId } = me(req);
    const src = gym.source(schoolId);
    if (!src) return { supported: false, spaces: [], alerts: [] };
    return { supported: true, spaces: gym.views(schoolId), alerts: gym.alertsOf(id).map(({ userId: _u, ...a }) => a), source: { label: src.label, url: src.page, attribution: src.attribution } };
  }));

  app.post('/api/gym/alert', deps.auth, deps.wrap(async (req) => {
    const { id, schoolId } = me(req);
    if (!gym.supported(schoolId)) throw deps.bad('Gym crowd isn’t available for your school yet.', 404);
    if (limited(`gymalert:${id}`, 40)) throw deps.bad('Too many changes — try again in a bit.', 429);
    const r = await gym.setAlert(id, schoolId, (req.body ?? {}) as Record<string, unknown>);
    if ('error' in r) throw deps.bad(r.error);
    return { alerts: r.map(({ userId: _u, ...a }) => a) };
  }));

  app.post('/api/gym/alert/remove', deps.auth, deps.wrap(async (req) => {
    const { id } = me(req);
    return { alerts: (await gym.removeAlert(id, String(req.body?.displayId ?? ''))).map(({ userId: _u, ...a }) => a) };
  }));

  app.post('/api/campus/now', deps.auth, deps.wrap(async (req) => {
    const { id, schoolId } = me(req);
    const dSrc = dining.source(schoolId); const gSrc = gym.source(schoolId);
    if (dSrc && !dining.day(schoolId, campusClock().date)) dining.kick(schoolId);
    const d = dSrc ? dining.now(schoolId, id) : null;
    return {
      dining: dSrc ? { available: !!d, ...(d ?? {}), attribution: dSrc.attribution } : null,
      gym: gSrc ? { spaces: gym.views(schoolId).map((v) => ({ id: v.id, name: v.name, status: v.status, percent: v.percent, updatedAt: v.updatedAt, open: v.open, hours: v.hours })), attribution: gSrc.attribution } : null,
    };
  }));

  app.get('/api/campus/live/status', deps.wrap(async () => ({ dining: { s_berkeley: dining.status('s_berkeley') ?? null, dates: dining.dates('s_berkeley') }, gym: { s_berkeley: gym.status('s_berkeley') } })));

  if (process.env.CAMPUS_LIVE === '0') { console.log('[campus-live] polling off (CAMPUS_LIVE=0)'); return; }
  // 학식: 10분마다 회차 확인 (실제 요청은 하루 몇 번) · 체육관: 5분마다
  const diningTick = () => { dining.tick().catch((e) => console.error('[dining] tick failed', e)); };
  const gymTick = () => { gym.poll().catch((e) => console.error('[gym] poll failed', e)); };
  setTimeout(diningTick, 20_000); setInterval(diningTick, 10 * 60_000);
  setTimeout(gymTick, 10_000); setInterval(gymTick, Math.max(1, Number(process.env.GYM_POLL_MINUTES ?? 5)) * 60_000);
}
