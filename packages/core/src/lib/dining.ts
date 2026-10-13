/**
 * 오늘의 학식 (Dining today) — 서버(server/dining.ts)와 화면이 같이 쓰는 모양과 순수 함수.
 * 메뉴는 학교 식당 공식 페이지에서 읽은 것만 담는다. 지어내지 않는다.
 */
import { toMin, type CampusClock } from './campusclock';

export type DietTag = 'vegan' | 'vegetarian' | 'halal' | 'kosher';
export type Allergen = 'milk' | 'egg' | 'fish' | 'shellfish' | 'tree_nuts' | 'peanuts' | 'wheat' | 'gluten' | 'soy' | 'sesame' | 'pork' | 'alcohol';
export type MealKey = 'breakfast' | 'brunch' | 'lunch' | 'dinner' | 'late_night' | 'all_day' | 'other';
export type LocationKind = 'hall' | 'cafe' | 'market';
export interface TimeRange { start: string; end: string }

export interface Dish { name: string; diets: DietTag[]; allergens: Allergen[] }
export interface Station { name: string; dishes: Dish[] }
export interface MealPeriod { key: MealKey; label: string; start?: string; end?: string; stations: Station[] }
export interface DiningLocation {
  /** "crossroads" */
  id: string;
  name: string;
  kind: LocationKind;
  /** 영업시간 — 모르면 null ("미확인"). 빈 배열 = 오늘 문 닫음 */
  hours: TimeRange[] | null;
  meals: MealPeriod[];
  /** 메뉴 대신 소개 한 줄 (편의점·마켓) */
  about?: string;
}
export interface DiningDay {
  id: string;
  schoolId: string;
  /** YYYY-MM-DD (캠퍼스 날짜) */
  date: string;
  fetchedAt: string;
  sourceUrl: string;
  locations: DiningLocation[];
}

export const DIET_LABELS: Record<DietTag, string> = { vegan: 'Vegan', vegetarian: 'Vegetarian', halal: 'Halal', kosher: 'Kosher' };
export const ALLERGEN_LABELS: Record<Allergen, string> = { milk: 'Milk', egg: 'Egg', fish: 'Fish', shellfish: 'Shellfish', tree_nuts: 'Tree nuts', peanuts: 'Peanuts', wheat: 'Wheat', gluten: 'Gluten', soy: 'Soy', sesame: 'Sesame', pork: 'Pork', alcohol: 'Alcohol' };
export const MEAL_LABELS: Record<MealKey, string> = { breakfast: 'Breakfast', brunch: 'Brunch', lunch: 'Lunch', dinner: 'Dinner', late_night: 'Late night', all_day: 'All day', other: 'Menu' };

/** 화면 필터 — 원본 표시(Vegan Option 등)와 알레르기 표시로만 거른다 */
export type DietFilter = 'vegetarian' | 'vegan' | 'halal' | 'no_pork' | 'no_nuts';
export const DIET_FILTERS: { key: DietFilter; label: string }[] = [
  { key: 'vegetarian', label: 'Vegetarian' }, { key: 'vegan', label: 'Vegan' }, { key: 'halal', label: 'Halal' }, { key: 'no_pork', label: 'No pork' }, { key: 'no_nuts', label: 'No nuts' },
];
export const isDietFilter = (x: unknown): x is DietFilter => DIET_FILTERS.some((f) => f.key === x);

export function dishMatches(d: Dish, filters: DietFilter[]): boolean {
  return filters.every((f) => {
    switch (f) {
      // 원본은 비건 메뉴에 Vegetarian 표시를 따로 달지 않는다 — 비건이면 채식에도 넣는다
      case 'vegetarian': return d.diets.includes('vegetarian') || d.diets.includes('vegan');
      case 'vegan': return d.diets.includes('vegan');
      case 'halal': return d.diets.includes('halal');
      case 'no_pork': return !d.allergens.includes('pork');
      case 'no_nuts': return !d.allergens.includes('tree_nuts') && !d.allergens.includes('peanuts');
    }
  });
}

/** 즐겨찾기 키 — 대소문자·공백·기호 차이를 무시 ("Korean BBQ Bowl " = "korean bbq bowl") */
export const dishKey = (name: string) => name.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').trim();

/** "Fall - Breakfast (ends at 10:30)" → breakfast · 라벨 "Breakfast" */
export function mealOf(periodName: string): { key: MealKey; label: string } {
  const bare = periodName.replace(/^\s*(fall|spring|summer|winter)\s*[-–]\s*/i, '').trim();
  const s = bare.toLowerCase();
  const key: MealKey = /brunch/.test(s) ? 'brunch' : /breakfast/.test(s) ? 'breakfast' : /lunch/.test(s) ? 'lunch' : /dinner/.test(s) ? 'dinner' : /late/.test(s) ? 'late_night' : /all day/.test(s) ? 'all_day' : 'other';
  return { key, label: key === 'other' ? bare || 'Menu' : MEAL_LABELS[key] };
}

/** 영업시간 — 원본 시간표가 없으면 식사 시간들로 */
export function hoursOf(loc: DiningLocation): TimeRange[] | null {
  if (loc.hours) return loc.hours;
  const fromMeals = loc.meals.filter((m) => m.start && m.end).map((m) => ({ start: m.start!, end: m.end! }));
  return fromMeals.length ? fromMeals.sort((a, b) => a.start.localeCompare(b.start)) : null;
}

export interface OpenState {
  /** null = 시간을 모른다 */
  open: boolean | null;
  closesAt?: string;
  opensAt?: string;
  /** 오늘 더 열 일이 없다 */
  doneForToday?: boolean;
}
export function openState(loc: DiningLocation, min: number): OpenState {
  const hours = hoursOf(loc);
  if (!hours) return { open: null };
  if (!hours.length) return { open: false, doneForToday: true };
  const now = hours.find((r) => toMin(r.start) <= min && min < toMin(r.end));
  if (now) return { open: true, closesAt: now.end };
  const next = hours.filter((r) => toMin(r.start) > min).sort((a, b) => a.start.localeCompare(b.start))[0];
  return next ? { open: false, opensAt: next.start } : { open: false, doneForToday: true };
}

/** 지금 보여 줄 식사 — 진행 중 → 다음 → 마지막 */
export function currentMeal(loc: DiningLocation, min: number): MealPeriod | undefined {
  const timed = loc.meals.filter((m) => m.start && m.end);
  return timed.find((m) => toMin(m.start!) <= min && min < toMin(m.end!))
    ?? timed.filter((m) => toMin(m.start!) > min).sort((a, b) => a.start!.localeCompare(b.start!))[0]
    ?? loc.meals[loc.meals.length - 1];
}

const KIND_ORDER: Record<LocationKind, number> = { hall: 0, cafe: 1, market: 2 };
/** 식당 → 카페 → 마켓, 같은 종류 안에서는 원본 순서 */
export const sortLocations = (list: DiningLocation[]) => list.map((l, i) => ({ l, i })).sort((a, b) => KIND_ORDER[a.l.kind] - KIND_ORDER[b.l.kind] || a.i - b.i).map((x) => x.l);

/** 대표 메뉴를 고를 때 건너뛰는 상시 코너 (샐러드 바·음료 등) */
const SIDE_STATION = /salad|deli|soup|dessert|bakery|cereal|bagel|condiment|beverage|drink|fruit|yogurt|toast|waffle|cookie|bread|coffee|smoothie|grab|snack|sides?$/i;
export const isMainStation = (name: string) => !SIDE_STATION.test(name);

export interface DishHit { location: DiningLocation; meal: MealPeriod; station: string; dish: Dish }
/** 하루 메뉴 전체를 훑는다 */
export function* allDishes(day: DiningDay): Generator<DishHit> {
  for (const location of day.locations) for (const meal of location.meals) for (const st of meal.stations) for (const dish of st.dishes) yield { location, meal, station: st.name, dish };
}

/** 즐겨찾기한 메뉴가 그날 어디에 나오는지 — 메뉴(키)별로 묶는다 */
export function favoriteHits(day: DiningDay, keys: string[]): Map<string, DishHit[]> {
  const want = new Set(keys);
  const out = new Map<string, DishHit[]>();
  for (const h of allDishes(day)) {
    const k = dishKey(h.dish.name);
    if (!want.has(k)) continue;
    const list = out.get(k) ?? out.set(k, []).get(k)!;
    if (!list.some((x) => x.location.id === h.location.id && x.meal.key === h.meal.key)) list.push(h);
  }
  return out;
}

/** "Crossroads for lunch" · 여러 곳이면 "Crossroads for lunch and Café 3 for dinner" */
export function whereLine(hits: DishHit[], max = 3): string {
  const parts = hits.slice(0, max).map((h) => `${h.location.name}${h.meal.key === 'all_day' || h.meal.key === 'other' ? '' : ` for ${MEAL_LABELS[h.meal.key].toLowerCase()}`}`);
  const more = hits.length > max ? ` (+${hits.length - max} more)` : '';
  return parts.length <= 1 ? `${parts[0] ?? ''}${more}` : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}${more}`;
}

/** 지금 열린 곳과 대표 메뉴 하나 — Discover 카드 */
export interface DiningNow {
  date: string;
  open: { id: string; name: string; kind: LocationKind; closesAt?: string; meal?: string }[];
  next?: { id: string; name: string; opensAt: string };
  highlight?: { dish: string; location: string; locationId: string; meal: string; favorite: boolean };
  favoritesToday: { dish: string; where: string }[];
}
export function diningNow(day: DiningDay, clock: Pick<CampusClock, 'min'>, favoriteKeys: string[] = []): DiningNow {
  const locs = sortLocations(day.locations);
  const open = locs.map((l) => ({ l, s: openState(l, clock.min) })).filter((x) => x.s.open === true)
    .map(({ l, s }) => ({ id: l.id, name: l.name, kind: l.kind, closesAt: s.closesAt, meal: currentMeal(l, clock.min)?.label }));
  const next = open.length ? undefined : locs.map((l) => ({ l, s: openState(l, clock.min) })).filter((x) => x.s.opensAt).sort((a, b) => a.s.opensAt!.localeCompare(b.s.opensAt!))[0];
  const fav = favoriteHits(day, favoriteKeys);
  const favoritesToday = [...fav.values()].map((hits) => ({ dish: hits[0].dish.name, where: whereLine(hits) }));
  // 대표 메뉴: 즐겨찾기 중 지금/다음 식사에 나오는 것 → 열린(또는 다음에 여는) 식당의 지금 식사 메인 코너 첫 메뉴
  let highlight: DiningNow['highlight'];
  for (const hits of fav.values()) {
    const h = hits.find((x) => currentMeal(x.location, clock.min)?.key === x.meal.key);
    if (h) { highlight = { dish: h.dish.name, location: h.location.name, locationId: h.location.id, meal: h.meal.label, favorite: true }; break; }
  }
  if (!highlight) {
    const order = [...open.map((o) => locs.find((l) => l.id === o.id)!), ...(next ? [next.l] : []), ...locs].filter((l) => l.kind !== 'market');
    for (const l of order) {
      const meal = currentMeal(l, clock.min);
      const st = meal?.stations.find((s) => isMainStation(s.name) && s.dishes.length) ?? meal?.stations.find((s) => s.dishes.length);
      if (meal && st) { highlight = { dish: st.dishes[0].name, location: l.name, locationId: l.id, meal: meal.label, favorite: false }; break; }
    }
  }
  return { date: day.date, open, next: next ? { id: next.l.id, name: next.l.name, opensAt: next.s.opensAt! } : undefined, highlight, favoritesToday };
}

/** 원본 표시 */
export const DINING_ATTRIBUTION = 'Menus from Cal Dining · may change';
