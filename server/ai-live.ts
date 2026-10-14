/**
 * Ask Lumi 도구 — 오늘의 학식(dining_today) · 체육관 혼잡도(gym_crowd).
 * 서버가 가져와 둔 데이터만 돌려준다 (server/campus-live.ts). 없으면 없다고 — 모델이 메뉴·숫자를 지어내지 않게 note 를 붙인다.
 */
import type { User } from '@core/types';
import { campusClock, addDaysISO, fmtClock, fmtRange } from '@core/lib/campusclock';
import { ALLERGEN_LABELS, DIET_LABELS, dishMatches, hoursOf, isDietFilter, isMainStation, openState, sortLocations, currentMeal, type DietFilter, type DiningDay, type DiningLocation, type MealKey, type MealPeriod, type OpenState } from '@core/lib/dining';
import { CROWD_LABELS, crowdLevel, type GymSpaceView } from '@core/lib/gym';
import { liveServices } from './campus-live';

export interface LiveTool { name: string; description: string; parameters: Record<string, unknown>; run: (input: Record<string, unknown>) => string }

const MEALS: (MealKey | 'now')[] = ['now', 'breakfast', 'brunch', 'lunch', 'dinner', 'late_night', 'all_day'];
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const schoolOf = (u: User) => (u.affiliation.type === 'university' ? u.affiliation.schoolId ?? '' : '');

/** "crossroads" · "cafe 3" · "café 3" · "ckc" → 장소 */
export function findLocation(day: DiningDay, q: string): DiningLocation | undefined {
  const n = norm(q).replace(/\b(the|dining|hall|commons)\b/g, '').trim();
  if (!n) return undefined;
  const alias: Record<string, string> = { ckc: 'clark kerr', c3: 'cafe 3', gbc: 'golden bear', mlk: 'student union', lxd: 'local x design' };
  const want = alias[n] ?? n;
  return day.locations.find((l) => norm(l.name) === want || norm(l.id.replace(/-/g, ' ')) === want) ?? day.locations.find((l) => norm(l.name).includes(want) || want.includes(norm(l.name)));
}

const dishOut = (d: { name: string; diets: string[]; allergens: string[] }) => {
  const tags = [...d.diets.map((x) => DIET_LABELS[x as keyof typeof DIET_LABELS]), ...(d.allergens.length ? [`contains ${d.allergens.map((a) => ALLERGEN_LABELS[a as keyof typeof ALLERGEN_LABELS].toLowerCase()).join(', ')}`] : [])];
  return tags.length ? `${d.name} (${tags.join('; ')})` : d.name;
};

function mealOut(m: MealPeriod, filters: DietFilter[], query: string, perStation: number) {
  const stations = [...m.stations].sort((x, y) => Number(!isMainStation(x.name)) - Number(!isMainStation(y.name))).map((s) => ({ station: s.name, dishes: s.dishes.filter((d) => dishMatches(d, filters) && (!query || norm(d.name).includes(query))) }))
    .filter((s) => s.dishes.length)
    .map((s) => ({ station: s.station, dishes: s.dishes.slice(0, perStation).map(dishOut), ...(s.dishes.length > perStation ? { more: s.dishes.length - perStation } : {}) }));
  return { meal: m.label, time: m.start && m.end ? fmtRange({ start: m.start, end: m.end }) : 'time not listed', stations };
}

export function diningAnswer(day: DiningDay | undefined, input: { location?: string; meal?: string; diet?: DietFilter[]; query?: string; isToday: boolean; nowMin: number; date: string; sourceUrl: string }) {
  const source = `Cal Dining menus (${input.sourceUrl}) — menus may change`;
  if (!day) return { date: input.date, results: [], note: `Lumi doesn't have the ${input.isToday ? "today's" : 'menu for that day'} yet. Say so; don't guess dishes. Students can check ${input.sourceUrl}.`, source };
  const filters = input.diet ?? [];
  const query = input.query ? norm(input.query) : '';
  let locs = sortLocations(day.locations);
  if (input.location) {
    const hit = findLocation(day, input.location);
    if (!hit) return { date: day.date, results: [], note: `No dining location called "${input.location}" on this day. Places with menus: ${locs.map((l) => l.name).join(', ')}.`, source };
    locs = [hit];
  }
  const many = locs.length > 1;
  const results = locs.map((l) => {
    const st: OpenState = input.isToday ? openState(l, input.nowMin) : { open: null };
    const hours = hoursOf(l);
    let meals = l.meals;
    if (input.meal && input.meal !== 'now') meals = meals.filter((m) => m.key === input.meal);
    else if (input.meal === 'now' && input.isToday) { const m = currentMeal(l, input.nowMin); meals = m ? [m] : []; }
    else if (many && !query && input.isToday) { const m = currentMeal(l, input.nowMin); meals = m ? [m] : meals; }
    const out = meals.map((m) => mealOut(m, filters, query, many ? 4 : 30)).filter((m) => m.stations.length);
    return {
      location: l.name, kind: l.kind,
      hours: hours ? (hours.length ? hours.map(fmtRange).join(', ') : 'closed') : 'hours not listed',
      ...(input.isToday ? { open_now: st.open, ...(st.closesAt ? { closes: fmtClock(st.closesAt) } : {}), ...(st.opensAt ? { opens: fmtClock(st.opensAt) } : {}) } : {}),
      ...(l.about ? { about: l.about } : {}),
      meals: out,
    };
  }).filter((r) => r.meals.length || (!query && !filters.length));
  const note = !results.length ? 'Nothing on the menus matches. Say so plainly; suggest other filters.' : many ? 'Showing the current/next meal and a few dishes per station for each place. Ask for one location (and meal) to get its full menu.' : undefined;
  return { date: day.date, results, note, source };
}

export function gymAnswer(views: GymSpaceView[], space: string | undefined, attribution: string, nowMs: number) {
  let list = views;
  if (space) { const n = norm(space); const hit = views.filter((v) => norm(v.name).includes(n) || (n.includes('rsf') && /rsf/i.test(v.name)) || (n.includes('cms') && /cms/i.test(v.name)) || (/weight/.test(n) && /weight/i.test(v.name))); if (hit.length) list = hit; }
  if (!list.length) return { results: [], note: 'Gym crowd data is not available right now. Say so; never guess a number.', source: attribution };
  return {
    source: attribution,
    results: list.map((v) => v.status === 'live'
      ? { space: v.name, status: 'live', percent_full: v.percent, people: v.count, capacity: v.capacity, level: CROWD_LABELS[crowdLevel(v.percent!)], updated_minutes_ago: v.updatedAt ? Math.max(0, Math.round((nowMs - Date.parse(v.updatedAt)) / 60_000)) : null, usually_at_this_hour_percent: v.usualNow, ...(v.usualNow == null ? { usual_note: `Not enough history yet for a "usually" comparison (${v.historyDays} of 7 days)` } : {}), today_by_hour: v.today.filter((h) => h.percent != null).map((h) => `${h.hour}:00 ${h.percent}%`) }
      : { space: v.name, status: 'unavailable', note: 'The crowd meter could not be read recently — say the live count is unavailable right now; do not give a number.', last_reading_at: v.updatedAt ?? null }),
  };
}

export function liveTools(viewer: User): LiveTool[] {
  const svc = liveServices();
  if (!svc) return [];
  const schoolId = schoolOf(viewer);
  const tools: LiveTool[] = [];
  const dSrc = svc.dining.source(schoolId);
  if (dSrc) tools.push({
    name: 'dining_today',
    description: "Campus dining hall menus and hours from the official dining site (today or tomorrow): which places are open now, each meal's time, dishes by station with diet tags (Vegan, Vegetarian, Halal, Kosher) and allergens (contains pork, tree nuts, peanuts, milk…). Use for 'what's for lunch at Crossroads', 'vegan options tonight', 'is Café 3 open', 'where is Korean BBQ today'.",
    parameters: {
      type: 'object',
      properties: {
        location: { type: 'string', description: 'Dining hall or café name as the student said it, e.g. "Crossroads", "Cafe 3", "Clark Kerr", "Foothill". Omit for all places.' },
        meal: { type: 'string', enum: MEALS, description: '"now" = the meal being served now (or next today)' },
        diet: { type: 'array', items: { type: 'string', enum: ['vegetarian', 'vegan', 'halal', 'no_pork', 'no_nuts'] } },
        query: { type: 'string', description: 'Find a dish by name, e.g. "pizza", "korean bbq", "tofu"' },
        day: { type: 'string', enum: ['today', 'tomorrow'] },
      },
      additionalProperties: false,
    },
    run: (input) => {
      const clock = campusClock();
      const date = input.day === 'tomorrow' ? addDaysISO(clock.date, 1) : clock.date;
      const meal = typeof input.meal === 'string' && (MEALS as string[]).includes(input.meal) ? input.meal : undefined;
      const diet = Array.isArray(input.diet) ? input.diet.filter(isDietFilter) : [];
      const r = diningAnswer(svc.dining.day(schoolId, date), { location: typeof input.location === 'string' ? input.location.slice(0, 60) : undefined, meal, diet, query: typeof input.query === 'string' ? input.query.slice(0, 60) : undefined, isToday: date === clock.date, nowMin: clock.min, date, sourceUrl: dSrc.url });
      const s = JSON.stringify(r);
      return s.length > 14_000 ? JSON.stringify({ ...r, results: r.results.slice(0, 4), note: 'Trimmed — ask for one location for its full menu.' }) : s;
    },
  });
  const gSrc = svc.gym.source(schoolId);
  if (gSrc) tools.push({
    name: 'gym_crowd',
    description: 'Live crowd level at the campus gym (RSF weight rooms, CMS fitness center) from the official RecWell crowd meter: percent full, people/capacity, minutes since the reading, today by hour, and the usual level at this hour once a week of history exists. Use for "is the RSF busy?", "how packed is the gym", "good time to lift".',
    parameters: { type: 'object', properties: { space: { type: 'string', description: 'e.g. "RSF", "weight room", "CMS". Omit for all.' } }, additionalProperties: false },
    run: (input) => JSON.stringify(gymAnswer(svc.gym.views(schoolId), typeof input.space === 'string' ? input.space.slice(0, 40) : undefined, gSrc.attribution, Date.now())),
  });
  return tools;
}

/** 시스템 프롬프트 한 줄 */
export const LIVE_PROMPT = "- Dining menus/hours (\"what's for lunch at Crossroads\", vegan options) → dining_today; gym crowd (\"is the RSF busy?\") → gym_crowd. Only name dishes, hours and numbers those tools return, say menus are from Cal Dining and may change, and if the gym count is unavailable say so — never guess.";

