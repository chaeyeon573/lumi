/**
 * 오늘의 학식 — 웹 서버 안에서 하루 몇 번 메뉴를 읽어 store docs 에 두고, 즐겨찾기한 메뉴가 나오는 날 알린다.
 *
 * 저장 (store docs — 화면 스냅샷 밖)
 *   diningDays       dining_<school>_<YYYY-MM-DD>   그날 장소·영업시간·식사·코너·메뉴 (오늘 + 내일. 어제 이전은 지운다)
 *   diningFavorites  df_<userId>                    즐겨찾기 메뉴 (이름 키) + 날짜별로 이미 알린 메뉴
 *
 * 가져오기 규칙 (정중하게 — 하루 몇 번만)
 *   - 캠퍼스 시간 05:45 · 10:30 · 16:00 이 지나면 그 회차를 한 번 (오늘 + 내일). XML 은 조건부 요청이라 대개 304
 *   - 오늘 메뉴가 없을 때만 실패 후 60분마다 다시. 있으면 회차 사이에 다시 읽지 않는다 (재시작해도 저장된 fetchedAt 을 본다)
 * 즐겨찾기 알림
 *   - 캠퍼스 시간 7시~21시, 그날 메뉴에 처음 보이면 한 번. 한 사람 하루 최대 3개 (넘치면 마지막 하나로 묶는다)
 *   - 즐겨찾기를 누른 그날 메뉴에 이미 있으면 그날은 알리지 않는다 (보고 있으니까)
 */
import type { ID, Notification } from '@core/types';
import type { DiningDay } from '@core/lib/dining';
import { DINING_ATTRIBUTION, dishKey, favoriteHits, whereLine, diningNow, type DiningNow } from '@core/lib/dining';
import { addDaysISO, campusClock, fmtRange, type CampusClock } from '@core/lib/campusclock';
import type { Store } from './store';
import { fetchCalDining, CAL_DINING_PAGE, type CalDiningResult } from './sources/cal-dining';

export const DAYS = 'diningDays';
export const FAVORITES = 'diningFavorites';

export interface DiningSource { label: string; url: string; attribution: string; fetch(schoolId: string, dates: string[]): Promise<CalDiningResult> }
export const DINING_SOURCES: Record<string, DiningSource> = {
  s_berkeley: { label: 'Cal Dining', url: CAL_DINING_PAGE, attribution: DINING_ATTRIBUTION, fetch: fetchCalDining },
};

export interface FavoriteDoc { id: string; userId: ID; schoolId: ID; dishes: { key: string; name: string; addedAt: string }[]; notified: Record<string, string[]> }
export const MAX_FAVORITES = 60;
const favId = (userId: ID) => `df_${userId}`;

/** 회차 (캠퍼스 시각, 분) */
export const DINING_SLOTS = [5 * 60 + 45, 10 * 60 + 30, 16 * 60];

/** 지금 다시 읽어야 하나 */
export function diningRefreshDue(o: { hasToday: boolean; lastFetchedMs?: number; lastAttemptMs?: number; clock: CampusClock; nowMs: number }): boolean {
  const sinceAttempt = o.lastAttemptMs == null ? Infinity : o.nowMs - o.lastAttemptMs;
  if (!o.hasToday) return sinceAttempt >= 60 * 60_000;
  if (sinceAttempt < 30 * 60_000) return false;
  const slot = [...DINING_SLOTS].reverse().find((s) => s <= o.clock.min);
  if (slot == null) return false;
  const slotMs = o.nowMs - (o.clock.min - slot) * 60_000;
  return (o.lastFetchedMs ?? 0) < slotMs;
}

/** 즐겨찾기 알림 — 이미 알린 것은 빼고, 사람마다 하루 최대 3개 */
export function favoriteNotifications(day: DiningDay, fav: FavoriteDoc, makeId: (k: string) => string, at: string, max = 3): { notes: Notification[]; notifiedKeys: string[] } {
  const already = new Set(fav.notified[day.date] ?? []);
  const hits = favoriteHits(day, fav.dishes.map((d) => d.key));
  const fresh = [...hits].filter(([k]) => !already.has(k));
  if (!fresh.length) return { notes: [], notifiedKeys: [] };
  const notes: Notification[] = [];
  const single = fresh.length <= max ? fresh : fresh.slice(0, max - 1);
  for (const [k, list] of single) {
    const h = list[0];
    const time = h.meal.start && h.meal.end ? ` (${fmtRange({ start: h.meal.start, end: h.meal.end })})` : '';
    notes.push({ id: makeId(k), userId: fav.userId, type: 'dining_favorite', title: `${h.dish.name} is at ${whereLine(list)} today`, body: `${h.location.name} ${h.meal.label.toLowerCase()}${time} · ${DINING_ATTRIBUTION}`, link: `/dining?loc=${encodeURIComponent(h.location.id)}&meal=${h.meal.key}`, read: false, createdAt: at });
  }
  if (fresh.length > single.length) {
    const rest = fresh.slice(single.length);
    notes.push({ id: makeId(`more_${rest.length}`), userId: fav.userId, type: 'dining_favorite', title: `${rest.length} more of your favorites are on today's menus`, body: `${rest.slice(0, 3).map(([, l]) => `${l[0].dish.name} (${l[0].location.name})`).join(', ')}${rest.length > 3 ? '…' : ''} · ${DINING_ATTRIBUTION}`, link: '/dining?fav=1', read: false, createdAt: at });
  }
  return { notes, notifiedKeys: fresh.map(([k]) => k) };
}

export interface DiningDeps { store: Store; notify(notes: Notification[]): void; userExists(id: ID): boolean; now?: () => Date }

export function createDining(deps: DiningDeps) {
  const now = deps.now ?? (() => new Date());
  const days = new Map<string, DiningDay>();
  const favs = new Map<ID, FavoriteDoc>();
  const lastAttempt = new Map<string, number>();
  const lastRun = new Map<string, { at: string; ok: boolean; notes: string[]; requests?: number; error?: string }>();
  const running = new Set<string>();
  const dayId = (schoolId: string, date: string) => `dining_${schoolId}_${date}`;

  async function load() {
    for (const d of await deps.store.listDocs<DiningDay>(DAYS)) days.set(d.id, d);
    for (const f of await deps.store.listDocs<FavoriteDoc>(FAVORITES)) favs.set(f.userId, f);
    console.log(`[dining] loaded ${days.size} menu days, ${favs.size} favorite lists`);
  }

  async function refresh(schoolId: string) {
    const src = DINING_SOURCES[schoolId];
    if (!src || running.has(schoolId)) return;
    running.add(schoolId); lastAttempt.set(schoolId, now().getTime());
    const clock = campusClock(now());
    try {
      const r = await src.fetch(schoolId, [clock.date, addDaysISO(clock.date, 1)]);
      const good = r.days.filter((d) => d.locations.length);
      // 오늘 것이 비면(원본 고장) 지난 것을 지우지 않는다
      if (!good.some((d) => d.date === clock.date)) throw new Error(`no locations for ${clock.date}${r.notes.length ? ` (${r.notes.slice(0, 3).join('; ')})` : ''}`);
      good.forEach((d) => days.set(d.id, d));
      await deps.store.putDocs(DAYS, good);
      const old = [...days.values()].filter((d) => d.schoolId === schoolId && d.date < addDaysISO(clock.date, -1)).map((d) => d.id);
      old.forEach((id) => days.delete(id));
      await deps.store.removeDocs(DAYS, old);
      lastRun.set(schoolId, { at: new Date().toISOString(), ok: true, notes: r.notes.slice(0, 10), requests: r.requests });
      console.log(`[dining] ${schoolId}: ${good.map((d) => `${d.date} ${d.locations.length} places`).join(', ')} (${r.requests} requests${r.notes.length ? `, ${r.notes.length} notes` : ''})`);
    } catch (e) {
      lastRun.set(schoolId, { at: new Date().toISOString(), ok: false, notes: [], error: (e as Error).message });
      console.error(`[dining] ${schoolId} refresh failed:`, (e as Error).message);
    } finally { running.delete(schoolId); }
  }

  async function notifyFavorites(schoolId: string, clock: CampusClock) {
    if (clock.min < 7 * 60 || clock.min >= 21 * 60) return;
    const day = days.get(dayId(schoolId, clock.date));
    if (!day) return;
    const at = now().toISOString(); const changed: FavoriteDoc[] = []; const all: Notification[] = [];
    for (const fav of favs.values()) {
      if (fav.schoolId !== schoolId || !fav.dishes.length || !deps.userExists(fav.userId)) continue;
      const { notes, notifiedKeys } = favoriteNotifications(day, fav, (k) => `n_dish_${fav.userId}_${day.date}_${k.replace(/\s+/g, '-').slice(0, 40)}`, at);
      if (!notifiedKeys.length) continue;
      fav.notified = { ...Object.fromEntries(Object.entries(fav.notified).filter(([d]) => d >= addDaysISO(clock.date, -3))), [day.date]: [...(fav.notified[day.date] ?? []), ...notifiedKeys] };
      changed.push(fav); all.push(...notes);
    }
    if (!changed.length) return;
    await deps.store.putDocs(FAVORITES, changed);
    deps.notify(all);
    console.log(`[dining] ${all.length} favorite notifications for ${changed.length} students`);
  }

  async function tick() {
    const n = now(); const clock = campusClock(n);
    for (const schoolId of Object.keys(DINING_SOURCES)) {
      const today = days.get(dayId(schoolId, clock.date));
      if (diningRefreshDue({ hasToday: !!today, lastFetchedMs: today ? Date.parse(today.fetchedAt) : undefined, lastAttemptMs: lastAttempt.get(schoolId), clock, nowMs: n.getTime() })) await refresh(schoolId);
      await notifyFavorites(schoolId, clock);
    }
  }

  function favoritesOf(userId: ID) { return favs.get(userId)?.dishes.map((d) => ({ key: d.key, name: d.name })) ?? []; }

  async function setFavorite(userId: ID, schoolId: ID, name: string, on: boolean): Promise<{ key: string; name: string }[] | { error: string }> {
    const clean = name.replace(/\s+/g, ' ').trim().slice(0, 120); const key = dishKey(clean);
    if (!key) return { error: 'Pick a dish first.' };
    const clock = campusClock(now());
    const fav: FavoriteDoc = favs.get(userId) ?? { id: favId(userId), userId, schoolId, dishes: [], notified: {} };
    fav.schoolId = schoolId;
    if (on) {
      if (!fav.dishes.some((d) => d.key === key)) {
        if (fav.dishes.length >= MAX_FAVORITES) return { error: `You can keep up to ${MAX_FAVORITES} favorite dishes — remove one first.` };
        fav.dishes = [...fav.dishes, { key, name: clean, addedAt: now().toISOString() }];
      }
      // 오늘 메뉴에 이미 있으면 오늘은 알리지 않는다
      const today = days.get(dayId(schoolId, clock.date));
      if (today && favoriteHits(today, [key]).size) fav.notified = { ...fav.notified, [clock.date]: [...new Set([...(fav.notified[clock.date] ?? []), key])] };
    } else fav.dishes = fav.dishes.filter((d) => d.key !== key);
    favs.set(userId, fav);
    await deps.store.putDocs(FAVORITES, [fav]);
    return favoritesOf(userId);
  }

  return {
    load, refresh, tick, setFavorite, favoritesOf,
    supported: (schoolId: string) => !!DINING_SOURCES[schoolId],
    source: (schoolId: string) => DINING_SOURCES[schoolId],
    day: (schoolId: string, date: string) => days.get(dayId(schoolId, date)),
    dates: (schoolId: string) => [...days.values()].filter((d) => d.schoolId === schoolId).map((d) => d.date).sort(),
    status: (schoolId: string) => lastRun.get(schoolId),
    /** 오늘 메뉴가 없고 최근에 시도하지 않았으면 뒤에서 한 번 (화면을 기다리게 하지 않는다) */
    kick(schoolId: string) {
      const clock = campusClock(now());
      if (!days.has(dayId(schoolId, clock.date)) && now().getTime() - (lastAttempt.get(schoolId) ?? 0) > 10 * 60_000) void refresh(schoolId);
    },
    now: (schoolId: string, userId?: ID): DiningNow | null => {
      const clock = campusClock(now());
      const day = days.get(dayId(schoolId, clock.date));
      return day ? diningNow(day, clock, userId ? favoritesOf(userId).map((f) => f.key) : []) : null;
    },
  };
}
export type DiningService = ReturnType<typeof createDining>;
