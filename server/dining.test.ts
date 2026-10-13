/**
 * 오늘의 학식 — Cal Dining 실제 페이지(2026-10-13 사본)로 장소·영업시간·메뉴·식단 표시를 읽는지,
 * 필터·지금 열린 곳·즐겨찾기 알림·가져오기 일정·Ask Lumi 도구가 지어내지 않는지.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { parseMenusPage, parseMenuXml, parseRange, tagsFromTokens, fetchCalDining, setRequestGap } from './sources/cal-dining';
import { dishMatches, dishKey, mealOf, openState, currentMeal, diningNow, favoriteHits, whereLine, sortLocations, type DiningDay, type Dish } from '@core/lib/dining';
import { diningRefreshDue, favoriteNotifications, createDining, DINING_SOURCES, type FavoriteDoc } from './dining';
import { diningAnswer, findLocation } from './ai-live';
import { FileStore } from './store';

const FIX = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');
const gz = (f: string) => gunzipSync(readFileSync(path.join(FIX, f))).toString('utf8');
const PAGE = gz('cal-dining-menus-2026-10-13.html.gz');
const XML = gz('cal-dining-crossroads-2026-10-13.xml.gz');
setRequestGap(0);

/** 페이지 사본으로 만든 하루 (XML 없이) */
async function dayFromPage(): Promise<DiningDay> {
  const real = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL) => (String(url).endsWith('/menus/') ? new Response(PAGE, { status: 200 }) : String(url).includes('Crossroads_20261013') ? new Response(XML, { status: 200 }) : new Response('nope', { status: 404 }))) as typeof fetch;
  try { return (await fetchCalDining('s_berkeley', ['2026-10-13'])).days[0]; } finally { globalThis.fetch = real; }
}

test('menus page: every location with its date, hours, XML path and menu', () => {
  const p = parseMenusPage(PAGE);
  assert.equal(p.date, '2026-10-13');
  assert.deepEqual(p.locations.map((l) => l.title), ['Café 3', 'Clark Kerr', 'Crossroads', 'Foothill', 'The Eateries at Student Union', 'The Golden Bear Café', 'Bear Market', 'Cub Market', 'Local x Design', 'The Den', 'Qualcomm Café', 'Gateway Café']);
  const xr = p.locations.find((l) => l.sourceName === 'Crossroads')!;
  assert.deepEqual(xr.hours, [{ start: '07:00', end: '10:00' }, { start: '11:00', end: '16:00' }, { start: '16:30', end: '21:00' }]);
  assert.equal(xr.statusText, 'Now Closed');
  assert.equal(xr.xmlPath, '/wp-content/uploads/menus-exportimport/Crossroads_20261013.xml');
  assert.deepEqual(xr.meals.map((m) => m.key), ['breakfast', 'lunch', 'dinner']);
  const eggs = xr.meals[0].stations.find((s) => s.name === 'Center Plate')!.dishes.find((d) => d.name === 'Scrambled Eggs')!;
  assert.deepEqual(eggs, { name: 'Scrambled Eggs', diets: ['vegetarian'], allergens: ['egg'] });
  // 마켓은 메뉴 대신 안내문
  const bm = p.locations.find((l) => l.sourceName === 'Bear Market')!;
  assert.match(bm.about ?? '', /convenience store/);
  assert.equal(bm.meals.length, 0);
  assert.match(p.locations.find((l) => l.sourceName === 'Den')!.about ?? '', /Peet/);
  // Golden Bear: 아침이 10:59 까지
  assert.deepEqual(p.locations.find((l) => l.sourceName === 'Golden Bear Cafe')!.hours?.[0], { start: '07:30', end: '10:59' });
});

test('menu XML: meal times and the same dishes and tags as the page', () => {
  const x = parseMenuXml(XML);
  assert.equal(x.location, 'Crossroads'); assert.equal(x.date, '2026-10-13');
  assert.deepEqual(x.meals.map((m) => [m.key, m.start, m.end]), [['breakfast', '07:00', '10:00'], ['lunch', '11:00', '16:00'], ['dinner', '16:30', '21:00']]);
  const page = parseMenusPage(PAGE).locations.find((l) => l.sourceName === 'Crossroads')!;
  const flat = (meals: typeof x.meals) => meals.flatMap((m) => m.stations.flatMap((s) => s.dishes.map((d) => `${m.key}|${s.name}|${d.name}|${d.diets.join()}|${d.allergens.join()}`))).sort();
  assert.deepEqual(flat(x.meals), flat(page.meals));
  assert.ok(flat(x.meals).length > 100);
});

test('diet and allergen tokens map, filters use only what the source marks', () => {
  assert.deepEqual(tagsFromTokens(['wheat', 'gluten', 'vegan-option']), { diets: ['vegan'], allergens: ['wheat', 'gluten'] });
  assert.deepEqual(tagsFromTokens(['tree-nuts', 'soybeans', 'pork', 'halal', 'kosher', 'co2']), { diets: ['halal', 'kosher'], allergens: ['tree_nuts', 'soy', 'pork'] });
  const vegan: Dish = { name: 'Brown Rice', diets: ['vegan'], allergens: [] };
  const pork: Dish = { name: 'Pork Adobo', diets: ['halal'], allergens: ['pork'] };
  const nuts: Dish = { name: 'Pad Thai', diets: ['vegetarian'], allergens: ['peanuts'] };
  assert.equal(dishMatches(vegan, ['vegetarian']), true, 'vegan counts as vegetarian');
  assert.equal(dishMatches(nuts, ['vegan']), false);
  assert.equal(dishMatches(pork, ['no_pork']), false);
  assert.equal(dishMatches(nuts, ['no_nuts']), false);
  assert.equal(dishMatches(vegan, ['vegan', 'no_nuts', 'no_pork']), true);
  assert.equal(dishMatches(pork, []), true);
});

test('hours text and meal names', () => {
  assert.deepEqual(parseRange('7:00 a.m. - 10:00 a.m.'), { start: '07:00', end: '10:00' });
  assert.deepEqual(parseRange('11:00 a.m. - 12:00 a.m.'), { start: '11:00', end: '24:00' });
  assert.deepEqual(parseRange('Noon – 2 p.m.'), { start: '12:00', end: '14:00' });
  assert.equal(parseRange('Closed'), null);
  assert.deepEqual(mealOf('Fall - Breakfast (ends at 10:30)'), { key: 'breakfast', label: 'Breakfast' });
  assert.deepEqual(mealOf('Spring - Late Night'), { key: 'late_night', label: 'Late night' });
  assert.equal(dishKey(' Korean  BBQ Bowl '), dishKey('korean bbq bowl'));
});

test('open now, current meal, and the Discover highlight (a main dish, not the salad bar)', async () => {
  const day = await dayFromPage();
  assert.equal(day.locations.length, 12);
  assert.deepEqual(sortLocations(day.locations).slice(0, 4).map((l) => l.kind), ['hall', 'hall', 'hall', 'hall']);
  assert.deepEqual(day.locations.filter((l) => l.kind === 'market').map((l) => l.name), ['Bear Market', 'Cub Market', 'The Den']);
  const xr = findLocation(day, 'crossroads')!;
  assert.deepEqual(openState(xr, 12 * 60), { open: true, closesAt: '16:00' });
  assert.deepEqual(openState(xr, 16 * 60 + 10), { open: false, opensAt: '16:30' });
  assert.deepEqual(openState(xr, 22 * 60), { open: false, doneForToday: true });
  assert.equal(currentMeal(xr, 12 * 60)?.key, 'lunch');
  assert.equal(currentMeal(xr, 16 * 60 + 10)?.key, 'dinner');
  const now = diningNow(day, { min: 12 * 60 });
  assert.ok(now.open.some((o) => o.name === 'Crossroads' && o.meal === 'Lunch'));
  assert.ok(now.highlight && !/salad|deli|soup|dessert/i.test(now.highlight.dish), `highlight ${now.highlight?.dish}`);
  const early = diningNow(day, { min: 4 * 60 });
  assert.equal(early.open.length, 0);
  assert.equal(early.next?.opensAt, '07:00');
  assert.equal(findLocation(day, 'ckc')?.name, 'Clark Kerr');
  assert.equal(findLocation(day, 'cafe 3')?.name, 'Café 3');
});

test('favorites: where a dish is today, at most 3 notifications a day, never twice', async () => {
  const day = await dayFromPage();
  const keys = ['scrambled eggs', 'brown rice', 'fried tater tots', 'vegetable medley', 'not on the menu'].map(dishKey);
  const hits = favoriteHits(day, keys);
  assert.ok(hits.get(dishKey('Scrambled Eggs'))!.some((h) => h.location.name === 'Crossroads' && h.meal.key === 'breakfast'));
  assert.equal(hits.has('not on the menu'), false);
  assert.match(whereLine(hits.get(dishKey('Scrambled Eggs'))!), /Crossroads for breakfast/);
  const fav: FavoriteDoc = { id: 'df_u1', userId: 'u1', schoolId: 's_berkeley', dishes: keys.map((k) => ({ key: k, name: k, addedAt: '' })), notified: {} };
  const r = favoriteNotifications(day, fav, (k) => `n_${k}`, '2026-10-13T15:00:00Z');
  assert.equal(r.notes.length, 3);
  assert.equal(r.notifiedKeys.length, 4);
  assert.match(r.notes[2].title, /2 more of your favorites/);
  assert.ok(r.notes.every((n) => n.type === 'dining_favorite' && n.userId === 'u1' && /Cal Dining/.test(n.body)));
  assert.match(r.notes[0].title, /^Scrambled Eggs is at .*Crossroads for breakfast.* today$/);
  fav.notified['2026-10-13'] = r.notifiedKeys;
  assert.equal(favoriteNotifications(day, fav, (k) => k, '').notes.length, 0);
});

test('fetch schedule: a few times a day, retry hourly only while today is missing', () => {
  const at = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return { date: '2026-10-13', min: h * 60 + m, weekday: 2 }; };
  const base = Date.parse('2026-10-13T19:00:00Z'); // 12:00 PT
  const msAt = (hhmm: string) => base + (at(hhmm).min - 12 * 60) * 60_000;
  assert.equal(diningRefreshDue({ hasToday: false, clock: at('12:00'), nowMs: base }), true);
  assert.equal(diningRefreshDue({ hasToday: false, lastAttemptMs: base - 20 * 60_000, clock: at('12:00'), nowMs: base }), false);
  // 10:30 회차 뒤에 이미 읽었다 → 다음은 16:00
  assert.equal(diningRefreshDue({ hasToday: true, lastFetchedMs: msAt('10:31'), lastAttemptMs: msAt('10:31'), clock: at('12:00'), nowMs: base }), false);
  // 05:45 에 읽고 10:30 이 지났다
  assert.equal(diningRefreshDue({ hasToday: true, lastFetchedMs: msAt('05:46'), lastAttemptMs: msAt('05:46'), clock: at('12:00'), nowMs: base }), true);
  assert.equal(diningRefreshDue({ hasToday: true, lastFetchedMs: msAt('10:31'), clock: at('16:05'), nowMs: msAt('16:05') }), true);
});

test('fetch: page + XML combine; a day without a posted menu leaves the place out', async () => {
  const real = globalThis.fetch; const asked: string[] = [];
  globalThis.fetch = (async (url: string | URL) => { asked.push(String(url)); return String(url).endsWith('/menus/') ? new Response(PAGE) : String(url).includes('Crossroads_2026101') ? new Response(XML.replace(/servedate="20261013"/g, String(url).includes('20261014') ? 'servedate="20261014"' : 'servedate="20261013"')) : new Response('', { status: 404 }); }) as typeof fetch;
  try {
    const r = await fetchCalDining('s_berkeley', ['2026-10-13', '2026-10-14']);
    const [today, tomorrow] = r.days;
    assert.equal(today.locations.length, 12);
    assert.equal(today.locations.find((l) => l.id === 'crossroads')!.meals[1].start, '11:00', 'XML times');
    assert.ok(today.locations.find((l) => l.id === 'cafe-3')!.meals.length, 'page menu when XML is missing');
    assert.deepEqual(tomorrow.locations.map((l) => l.id), ['crossroads']);
    assert.equal(tomorrow.locations[0].hours, null, 'no page hours for another day');
    assert.ok(asked.every((u) => u.startsWith('https://dining.berkeley.edu/')));
  } finally { globalThis.fetch = real; }
});

test('Ask Lumi dining_today answers only from the menu, says when it has none', async () => {
  const day = await dayFromPage();
  const lunch = diningAnswer(day, { location: 'Crossroads', meal: 'lunch', isToday: true, nowMin: 11 * 60 + 30, date: day.date, sourceUrl: DINING_SOURCES.s_berkeley.url });
  assert.equal(lunch.results.length, 1);
  assert.equal(lunch.results[0].location, 'Crossroads');
  assert.equal(lunch.results[0].open_now, true);
  const names = lunch.results[0].meals[0].stations.flatMap((s) => s.dishes).join(' | ');
  const real = parseMenuXml(XML).meals.find((m) => m.key === 'lunch')!.stations.flatMap((s) => s.dishes.map((d) => d.name));
  for (const n of names.split(' | ')) assert.ok(real.some((r) => n.startsWith(r)), `${n} is on the real menu`);
  assert.match(lunch.source, /Cal Dining/);
  const vegan = diningAnswer(day, { location: 'Crossroads', meal: 'dinner', diet: ['vegan'], isToday: true, nowMin: 17 * 60, date: day.date, sourceUrl: '' });
  assert.ok(vegan.results[0].meals[0].stations.every((s) => s.dishes.every((d) => /Vegan/.test(d))));
  assert.match(diningAnswer(day, { location: 'Hogwarts', isToday: true, nowMin: 0, date: day.date, sourceUrl: '' }).note ?? '', /No dining location/);
  assert.match(diningAnswer(undefined, { isToday: true, nowMin: 0, date: '2026-10-13', sourceUrl: 'https://dining.berkeley.edu/menus/' }).note ?? '', /don't guess/);
});

test('service: favorite on today’s menu waits for the next day; saved across restarts', async () => {
  const file = path.join(mkdtempSync(path.join(os.tmpdir(), 'lumi-dining-')), 'db.json');
  const store = new FileStore(file); await store.init();
  const day = await dayFromPage();
  const noon = new Date('2026-10-13T19:00:00Z'); // 12:00 PT
  const docs: DiningDay[] = [{ ...day, fetchedAt: noon.toISOString() }, { ...day, id: 'dining_s_berkeley_2026-10-14', date: '2026-10-14', fetchedAt: '2026-10-14T13:00:00Z' }];
  await store.putDocs('diningDays', docs);
  let now = noon;
  const real = globalThis.fetch; let calls = 0;
  globalThis.fetch = (async () => { calls++; throw new Error('no network in tests'); }) as typeof fetch;
  const sent: { userId: string; title: string }[] = [];
  const svc = createDining({ store, notify: (n) => sent.push(...n), userExists: () => true, now: () => now });
  await svc.load();
  const r = await svc.setFavorite('u1', 's_berkeley', 'Scrambled Eggs', true);
  assert.deepEqual(r, [{ key: 'scrambled eggs', name: 'Scrambled Eggs' }]);
  await svc.tick();
  assert.equal(sent.length, 0, 'already on the menu they are looking at');
  // 다음 날 아침 8시 — 같은 메뉴가 또 나오면 한 번 알린다 (재시작 뒤에도)
  now = new Date('2026-10-14T15:00:00Z');
  const again = createDining({ store, notify: (n) => sent.push(...n), userExists: () => true, now: () => now });
  await again.load();
  assert.deepEqual(again.favoritesOf('u1').map((f) => f.name), ['Scrambled Eggs']);
  await again.tick(); await again.tick();
  assert.equal(sent.length, 1);
  assert.match(sent[0].title, /^Scrambled Eggs is at .*Crossroads for breakfast/);
  assert.equal((await svc.setFavorite('u1', 's_berkeley', '   ', true) as { error: string }).error, 'Pick a dish first.');
  assert.deepEqual(await svc.setFavorite('u1', 's_berkeley', 'scrambled eggs', false), []);
  globalThis.fetch = real;
  assert.equal(calls, 0, 'nothing to fetch — menus are fresh for this slot');
});
