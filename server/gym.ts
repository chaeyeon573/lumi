/**
 * 체육관 혼잡도 — 웹 서버가 5분마다 공간당 한 번(사용자 수와 무관) 공식 크라우드 미터를 읽어 기록하고, 알림을 보낸다.
 *
 * 저장 (store docs)
 *   gymDays    gym_<displayId>_<YYYY-MM-DD>   그날 [unix 초, 인원] 기록 (5분마다 한 줄, 8주 보관)
 *   gymAlerts  ga_<userId>_<displayId>        "X% 미만이면 알려줘" — 요일·시간 창, 하루 한 번까지
 *
 * 폴링 규칙
 *   - GYM_POLL_MINUTES(기본 5)마다, 공간 하나씩 차례로. 표시판 id·토큰은 공개 페이지에서 하루 한 번 다시 읽는다 (401/403/404 면 다음 폴링 때 바로)
 *   - 실패한 공간은 5분 × 2^연속실패 (최대 60분) 동안 쉰다. 페이지 다시 읽기는 30분에 한 번까지
 *   - 마지막 성공이 15분보다 오래되면 화면·Ask Lumi 에 'unavailable' — 지난 숫자를 지금 것처럼 보이지 않는다
 * 알림 규칙 (alertDue)
 *   - 살아 있는 숫자일 때만, 고른 요일·시간 안에서 기준 미만이면, 그 알림은 하루 한 번. 한 사람 하루 최대 3개
 */
import type { ID, Notification } from '@core/types';
import { campusClock, fmtClock } from '@core/lib/campusclock';
import { GYM_ATTRIBUTION, MAX_GYM_ALERTS, alertDue, campusHourOf, gymKeepFrom, gymView, normalizeAlert, type GymAlert, type GymDayDoc, type GymSpaceView } from '@core/lib/gym';
import type { Store } from './store';
import { RECWELL_CROWD_PAGE, DensityError, fetchCrowdMeterPage, fetchDensityDisplay, type DensityDisplay, type DensityReading } from './sources/density';

export const GYM_DAYS = 'gymDays';
export const GYM_ALERTS = 'gymAlerts';

export interface GymSource { page: string; label: string; attribution: string; discover(): Promise<DensityDisplay[]>; read(d: DensityDisplay): Promise<DensityReading> }
export const GYM_SOURCES: Record<string, GymSource> = {
  s_berkeley: { page: RECWELL_CROWD_PAGE, label: 'RecWell crowd meter', attribution: GYM_ATTRIBUTION, discover: () => fetchCrowdMeterPage(RECWELL_CROWD_PAGE), read: fetchDensityDisplay },
};

const DAILY_ALERT_CAP = 3;
const hourOf = campusHourOf();

/** 실패 뒤 쉬는 시간 (분) */
export const backoffMinutes = (fails: number, base = 5) => (fails <= 0 ? 0 : Math.min(60, base * 2 ** (fails - 1)));

/** 같은 날 기록에 한 줄 더한다 (1분 안에 겹치면 바꿔 쓴다) */
export function addSample(doc: GymDayDoc, atSec: number, count: number): GymDayDoc {
  const samples = doc.samples.slice();
  const last = samples[samples.length - 1];
  if (last && atSec - last[0] < 60) samples[samples.length - 1] = [atSec, count];
  else samples.push([atSec, count]);
  return { ...doc, samples };
}

/** 알림 문구 */
export function gymAlertMessage(a: GymAlert, view: GymSpaceView): { title: string; body: string } {
  return {
    title: `${view.name} is at ${view.percent}% right now`,
    body: `Under your ${a.below}% alert (${view.count}/${view.capacity} people · ${fmtClock(a.start)}–${fmtClock(a.end)} window). ${GYM_ATTRIBUTION}.`,
  };
}

interface SpaceState { name: string; capacity: number; last?: { at: number; count: number }; fails: number; nextTryAt: number; lastError?: string }
interface SchoolState { displays: DensityDisplay[]; scrapedAt: number; lastScrapeAttempt: number; needRescrape: boolean; spaces: Map<string, SpaceState>; order: string[]; lastError?: string }

export interface GymDeps { store: Store; notify(notes: Notification[]): void; userExists(id: ID): boolean; now?: () => Date }

export function createGym(deps: GymDeps) {
  const now = deps.now ?? (() => new Date());
  const ms = () => now().getTime();
  const history = new Map<string, GymDayDoc>();
  const alerts = new Map<string, GymAlert>();
  const schools = new Map<string, SchoolState>();
  const firedToday = new Map<string, number>(); // `${userId}_${date}` → 개수
  const st = (schoolId: string): SchoolState => schools.get(schoolId) ?? schools.set(schoolId, { displays: [], scrapedAt: 0, lastScrapeAttempt: 0, needRescrape: true, spaces: new Map(), order: [] }).get(schoolId)!;
  let polling = false;

  async function load() {
    for (const d of await deps.store.listDocs<GymDayDoc>(GYM_DAYS)) history.set(d.id, d);
    for (const a of await deps.store.listDocs<GymAlert>(GYM_ALERTS)) alerts.set(a.id, a);
    // 재시작 직후에도 방금 읽은 숫자는 그대로 (15분 안이면 live) — 이름·정원·마지막 줄을 기록에서 되살린다
    const latest = new Map<string, GymDayDoc>();
    for (const d of history.values()) { const p = latest.get(d.displayId); if (!p || d.date > p.date) latest.set(d.displayId, d); }
    for (const d of latest.values()) {
      const s = st(d.schoolId); const last = d.samples[d.samples.length - 1];
      s.spaces.set(d.displayId, { name: d.name, capacity: d.capacity, last: last ? { at: last[0] * 1000, count: last[1] } : undefined, fails: 0, nextTryAt: 0 });
      if (!s.order.includes(d.displayId)) s.order.push(d.displayId);
    }
    console.log(`[gym] loaded ${history.size} day records, ${alerts.size} alerts`);
  }

  async function discover(schoolId: string, src: GymSource) {
    const s = st(schoolId); const t = ms();
    if (s.lastScrapeAttempt && t - s.lastScrapeAttempt < 30 * 60_000) return;
    s.lastScrapeAttempt = t;
    try {
      s.displays = await src.discover(); s.scrapedAt = t; s.needRescrape = false; s.lastError = undefined;
      s.order = s.displays.map((d) => d.displayId);
    } catch (e) { s.lastError = (e as Error).message; console.error(`[gym] ${schoolId} crowd page:`, s.lastError); }
  }

  async function pollSchool(schoolId: string, src: GymSource) {
    const s = st(schoolId);
    if (!s.displays.length || s.needRescrape || ms() - s.scrapedAt > 24 * 3_600_000) await discover(schoolId, src);
    const n = now(); const clock = campusClock(n); const changed: GymDayDoc[] = [];
    for (const d of s.displays) {
      const sp = s.spaces.get(d.displayId) ?? { name: d.title ?? d.displayId, capacity: 0, fails: 0, nextTryAt: 0 };
      s.spaces.set(d.displayId, sp);
      if (ms() < sp.nextTryAt) continue;
      try {
        const r = await src.read(d);
        sp.name = r.name; sp.capacity = r.capacity; sp.last = { at: ms(), count: r.count }; sp.fails = 0; sp.nextTryAt = 0; sp.lastError = undefined;
        const id = `gym_${d.displayId}_${clock.date}`;
        const doc = history.get(id) ?? { id, schoolId, displayId: d.displayId, name: r.name, date: clock.date, capacity: r.capacity, samples: [] };
        const next = addSample({ ...doc, name: r.name, capacity: r.capacity }, Math.floor(ms() / 1000), r.count);
        history.set(id, next); changed.push(next);
      } catch (e) {
        sp.fails++; sp.lastError = (e as Error).message;
        sp.nextTryAt = ms() + backoffMinutes(sp.fails) * 60_000;
        if (e instanceof DensityError && [401, 403, 404].includes(e.status)) s.needRescrape = true; // 토큰이 바뀌었을 수 있다
        console.error(`[gym] ${d.displayId} failed (${sp.fails}x):`, sp.lastError);
      }
    }
    if (changed.length) await deps.store.putDocs(GYM_DAYS, changed);
    // 8주보다 오래된 기록 정리
    const keep = gymKeepFrom(clock.date);
    const old = [...history.values()].filter((d) => d.date < keep).map((d) => d.id);
    if (old.length) { old.forEach((id) => history.delete(id)); await deps.store.removeDocs(GYM_DAYS, old); }
    await runAlerts(schoolId);
  }

  function views(schoolId: string): GymSpaceView[] {
    const s = schools.get(schoolId); if (!s) return [];
    const n = now(); const clock = campusClock(n);
    const ids = [...s.order, ...[...s.spaces.keys()].filter((id) => !s.order.includes(id))];
    return ids.map((id) => {
      const sp = s.spaces.get(id);
      if (!sp || !sp.capacity) return null;
      const hist = [...history.values()].filter((d) => d.displayId === id);
      return gymView({ displayId: id, name: sp.name, capacity: sp.capacity, last: sp.last, history: hist, clock, nowMs: n.getTime(), hourOf });
    }).filter((v): v is GymSpaceView => !!v);
  }

  async function runAlerts(schoolId: string) {
    const n = now(); const clock = campusClock(n);
    const byId = new Map(views(schoolId).map((v) => [v.id, v]));
    const notes: Notification[] = []; const changed: GymAlert[] = [];
    for (const a of alerts.values()) {
      if (a.schoolId !== schoolId) continue;
      const v = byId.get(a.displayId);
      if (!v || !alertDue(a, clock, v) || !deps.userExists(a.userId)) continue;
      const capKey = `${a.userId}_${clock.date}`;
      if ((firedToday.get(capKey) ?? 0) >= DAILY_ALERT_CAP) continue;
      firedToday.set(capKey, (firedToday.get(capKey) ?? 0) + 1);
      const msg = gymAlertMessage(a, v);
      notes.push({ id: `n_gym_${a.userId}_${a.displayId}_${clock.date}`, userId: a.userId, type: 'gym_alert', title: msg.title, body: msg.body, link: '/gym', read: false, createdAt: n.toISOString() });
      const next = { ...a, lastFiredAt: n.toISOString(), lastFiredDate: clock.date };
      alerts.set(a.id, next); changed.push(next);
    }
    for (const k of firedToday.keys()) if (!k.endsWith(clock.date)) firedToday.delete(k);
    if (!changed.length) return;
    await deps.store.putDocs(GYM_ALERTS, changed);
    deps.notify(notes);
    console.log(`[gym] ${notes.length} crowd alerts sent`);
  }

  async function poll() {
    if (polling) return; polling = true;
    try { for (const [schoolId, src] of Object.entries(GYM_SOURCES)) await pollSchool(schoolId, src); }
    catch (e) { console.error('[gym] poll failed', e); }
    finally { polling = false; }
  }

  const mine = (userId: ID) => [...alerts.values()].filter((a) => a.userId === userId);

  async function setAlert(userId: ID, schoolId: ID, input: Record<string, unknown>): Promise<GymAlert[] | { error: string }> {
    const displayId = String(input.displayId ?? '');
    if (!views(schoolId).some((v) => v.id === displayId)) return { error: 'That space isn’t on the crowd meter.' };
    const norm = normalizeAlert(input);
    if ('error' in norm) return norm;
    const id = `ga_${userId}_${displayId}`;
    const prev = alerts.get(id);
    if (!prev && mine(userId).length >= MAX_GYM_ALERTS) return { error: `You can keep up to ${MAX_GYM_ALERTS} gym alerts.` };
    // 설정을 바꾸면 오늘 다시 울릴 수 있다 (기준을 낮췄는데 오늘 이미 울렸다고 막히지 않게) — 하루 3개 상한은 그대로
    const next: GymAlert = { id, userId, schoolId, displayId, ...norm, createdAt: prev?.createdAt ?? now().toISOString(), lastFiredAt: prev?.lastFiredAt, lastFiredDate: prev && prev.below === norm.below && prev.start === norm.start && prev.end === norm.end ? prev.lastFiredDate : undefined };
    alerts.set(id, next);
    await deps.store.putDocs(GYM_ALERTS, [next]);
    return mine(userId);
  }
  async function removeAlert(userId: ID, displayId: string) {
    const id = `ga_${userId}_${displayId}`;
    if (alerts.delete(id)) await deps.store.removeDocs(GYM_ALERTS, [id]);
    return mine(userId);
  }

  /** 계정 삭제 — 이 사람의 혼잡도 알림을 모두 지운다 */
  async function forgetUser(userId: ID) {
    const ids = mine(userId).map((a) => a.id);
    ids.forEach((id) => alerts.delete(id));
    for (const k of [...firedToday.keys()]) if (k.startsWith(`${userId}_`)) firedToday.delete(k);
    await deps.store.removeDocs(GYM_ALERTS, ids);
    return { gymAlerts: ids.length };
  }

  return {
    load, poll, views, setAlert, removeAlert, alertsOf: mine, forgetUser,
    supported: (schoolId: string) => !!GYM_SOURCES[schoolId],
    source: (schoolId: string) => GYM_SOURCES[schoolId],
    /** 운영 확인용 — 토큰은 넣지 않는다 */
    status: (schoolId: string) => { const s = schools.get(schoolId); return s ? { displays: s.order.length, scrapedAt: s.scrapedAt ? new Date(s.scrapedAt).toISOString() : null, error: s.lastError, spaces: [...s.spaces].map(([id, sp]) => ({ id, name: sp.name, fails: sp.fails, lastError: sp.lastError, lastAt: sp.last ? new Date(sp.last.at).toISOString() : null })) } : null; },
  };
}
export type GymService = ReturnType<typeof createGym>;
