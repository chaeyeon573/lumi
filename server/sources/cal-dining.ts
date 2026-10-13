/**
 * Cal Dining (UC Berkeley) 메뉴 — 공개 페이지 두 가지를 읽는다.
 *
 * 1) https://dining.berkeley.edu/menus/  (서버 렌더링, 오늘 하루만)
 *    li.location-name "<이름> <YYYYMMDD>" · span.status · .times span(영업시간) · .serve-date
 *    li.preiod-name(sic) "Fall - Lunch" · .cat-name(코너) · li.recip(메뉴, class 에 알레르기·식단 토큰) · data-location(base64 → XML 경로)
 * 2) 그 data-location 이 가리키는 메뉴 XML (EatecExchange) — /wp-content/uploads/menus-exportimport/<Location>_<YYYYMMDD>.xml
 *    식사마다 시작·끝 시각, 메뉴마다 알레르기(Yes/No)·식단(Vegan/Vegetarian Option, Halal, Kosher)이 구조화돼 있고
 *    날짜만 바꾸면 앞으로 약 일주일치가 있다 (없는 날은 404). ETag/Last-Modified 를 주므로 조건부 요청으로 다시 읽는다.
 *
 * 그래서: 장소 목록·오늘 영업시간은 페이지에서, 메뉴는 XML 에서. XML 을 못 읽으면 오늘 메뉴는 페이지의 것을 쓴다.
 * 정중하게: 요청은 하나씩, 사이 0.8초. 하루 몇 번만 (server/dining.ts 의 일정).
 */
import type { Allergen, DietTag, DiningDay, DiningLocation, MealPeriod, Station, TimeRange, LocationKind } from '@core/lib/dining';
import { mealOf } from '@core/lib/dining';

export const CAL_DINING_PAGE = 'https://dining.berkeley.edu/menus/';
const ORIGIN = 'https://dining.berkeley.edu';
const UA = 'Mozilla/5.0 (compatible; Lumi-campus-app; daily dining menu, a few requests a day)';

/** 기숙사 식당 (원본 class 이름 기준) — 나머지는 메뉴 모양으로 카페·마켓을 정한다 */
const HALLS = new Set(['Cafe 3', 'Clark Kerr Campus', 'Crossroads', 'Foothill']);

// ─── 작은 도구 ────────────────────────────────────────────────────────────────
const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', eacute: 'é', egrave: 'è', ntilde: 'ñ', reg: '®', trade: '™' };
export const decode = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
  if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
  return ENT[e.toLowerCase()] ?? m;
}).replace(/\s+/g, ' ').trim();
const strip = (s: string) => decode(s.replace(/<[^>]*>/g, ' '));
export const slug = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ymd = (compact: string) => `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
const compact = (date: string) => date.replace(/-/g, '');

/** "7:00 a.m." · "12 p.m." · "Noon" → "HH:MM" (못 읽으면 null) */
export function parseClock(s: string): string | null {
  const t = s.trim().toLowerCase();
  if (/^noon$/.test(t)) return '12:00';
  if (/^midnight$/.test(t)) return '24:00';
  const m = /^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?\s*m\.?$/.exec(t);
  if (!m) return null;
  let h = Number(m[1]) % 12; if (m[3] === 'p') h += 12;
  return `${String(h).padStart(2, '0')}:${m[2] ?? '00'}`;
}
/** "7:00 a.m. - 10:00 a.m." → { start, end }. 끝이 자정을 넘으면 24:00 으로 */
export function parseRange(s: string): TimeRange | null {
  const [a, b] = s.split(/\s*[-–—]\s*|\s+to\s+/);
  const start = a ? parseClock(a) : null; let end = b ? parseClock(b) : null;
  if (!start || !end) return null;
  if (end === '00:00' || end <= start) end = '24:00';
  return { start, end };
}

/** 메뉴 class 토큰 → 식단·알레르기 */
const TOKEN_DIET: Record<string, DietTag> = { 'vegan-option': 'vegan', 'vegetarian-option': 'vegetarian', halal: 'halal', kosher: 'kosher' };
const TOKEN_ALLERGEN: Record<string, Allergen> = { milk: 'milk', egg: 'egg', fish: 'fish', shellfish: 'shellfish', 'tree-nuts': 'tree_nuts', peanuts: 'peanuts', wheat: 'wheat', gluten: 'gluten', soybeans: 'soy', sesame: 'sesame', pork: 'pork', alcohol: 'alcohol' };
export function tagsFromTokens(tokens: string[]): { diets: DietTag[]; allergens: Allergen[] } {
  const diets = [...new Set(tokens.map((t) => TOKEN_DIET[t]).filter(Boolean))];
  const allergens = [...new Set(tokens.map((t) => TOKEN_ALLERGEN[t]).filter(Boolean))];
  return { diets, allergens };
}
/** XML 의 이름 ("Tree Nuts", "Vegan Option") → 같은 토큰 */
const xmlToken = (id: string) => id.toLowerCase().replace(/\s+option$/, '-option').replace(/\s+/g, '-');

/** 메뉴 대신 안내문 한 줄만 있는 곳 (마켓 — "Next to Cafe 3, this campus convenience store offers …") */
const isMessage = (name: string, description = '') => /\bmessage\b/i.test(description) || (name.length > 45 && /[.!]\s*$/.test(name));

function pushDish(stations: Station[], station: string, name: string, tags: { diets: DietTag[]; allergens: Allergen[] }) {
  if (!name) return;
  const st = stations.find((s) => s.name === station) ?? (stations.push({ name: station, dishes: [] }), stations[stations.length - 1]);
  if (!st.dishes.some((d) => d.name === name)) st.dishes.push({ name, ...tags });
}

// ─── 1) 메뉴 페이지 ───────────────────────────────────────────────────────────
export interface PageLocation {
  /** 원본 이름 ("Cafe 3" — class·XML 파일 이름과 같다). id 는 이것으로 만든다 */
  sourceName: string;
  /** 화면 제목 ("Café 3", "The Den") */
  title: string;
  date: string;
  statusText?: string;
  hours: TimeRange[] | null;
  /** /wp-content/uploads/menus-exportimport/Crossroads_20261013.xml */
  xmlPath?: string;
  meals: MealPeriod[];
  about?: string;
}

export function parseMenusPage(html: string): { date: string | null; locations: PageLocation[] } {
  const chunks = html.split(/<li class="location-name /).slice(1);
  const locations: PageLocation[] = [];
  for (const chunk of chunks) {
    const head = /^([^"]*?)\s+(\d{8})"/.exec(chunk);
    if (!head) continue;
    const sourceName = decode(head[1]);
    const title = strip(/<span class="cafe-title">([\s\S]*?)<\/span>/.exec(chunk)?.[1] ?? '') || sourceName;
    const statusText = strip(/<span class="status[^"]*">([\s\S]*?)<\/span>/.exec(chunk)?.[1] ?? '') || undefined;
    const timesHtml = /<div class="times">([\s\S]*?)<\/div>/.exec(chunk)?.[1];
    const ranges = timesHtml ? [...timesHtml.matchAll(/<span>([\s\S]*?)<\/span>/g)].map((m) => parseRange(strip(m[1]))).filter((r): r is TimeRange => !!r) : [];
    const b64 = /data-location="([A-Za-z0-9+/=]+)"/.exec(chunk)?.[1];
    let xmlPath: string | undefined;
    if (b64) {
      const p = Buffer.from(b64, 'base64').toString('utf8').replace(/^\/code(?=\/wp-content\/)/, '');
      if (/^\/wp-content\/uploads\/menus-exportimport\/[\w.'%-]+_\d{8}\.xml$/.test(p)) xmlPath = p;
    }
    const meals: MealPeriod[] = []; let about: string | undefined;
    for (const per of chunk.split(/<li class="preiod-name /).slice(1)) {
      const { key, label } = mealOf(decode(/^([^"]*)"/.exec(per)?.[1] ?? ''));
      const stations: Station[] = [];
      for (const cat of per.split(/<div class="cat-name">/).slice(1)) {
        const station = strip(/<span>([\s\S]*?)<\/span>/.exec(cat)?.[1] ?? '') || 'Menu';
        for (const m of cat.matchAll(/<li class="recip([^"]*)"[^>]*>\s*<span>([\s\S]*?)<\/span>/g)) {
          const name = strip(m[2]);
          if (isMessage(name)) { about ??= name; continue; }
          pushDish(stations, station, name, tagsFromTokens(m[1].trim().split(/\s+/).filter(Boolean)));
        }
      }
      if (stations.length) meals.push({ key, label, stations });
    }
    locations.push({ sourceName, title, date: ymd(head[2]), statusText, hours: timesHtml == null ? null : ranges.length ? ranges : null, xmlPath, meals, about });
  }
  const date = locations[0]?.date ?? null;
  return { date, locations };
}

// ─── 2) 메뉴 XML ──────────────────────────────────────────────────────────────
const attr = (tag: string, name: string) => { const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag); return m ? decode(m[1]) : undefined; };
const hhmm = (s?: string) => (s && /^\d{1,2}:\d{2}$/.test(s) ? s.padStart(5, '0') : undefined);

export function parseMenuXml(xml: string): { location?: string; date?: string; meals: MealPeriod[]; about?: string } {
  const meals: MealPeriod[] = []; let location: string | undefined; let date: string | undefined; let about: string | undefined;
  for (const part of xml.split(/<menu\s/).slice(1)) {
    const tag = `<menu ${part.slice(0, part.indexOf('>') + 1)}`;
    location ??= attr(tag, 'location');
    const sd = attr(tag, 'servedate'); if (sd && /^\d{8}$/.test(sd)) date ??= ymd(sd);
    const { key, label } = mealOf(attr(tag, 'mealperiodname') ?? '');
    const stations: Station[] = [];
    for (const rec of part.split(/<recipe\s/).slice(1)) {
      const rtag = `<recipe ${rec.slice(0, rec.indexOf('>') + 1)}`;
      const station = attr(rtag, 'category') || 'Menu';
      const description = attr(rtag, 'description') ?? '';
      const name = attr(rtag, 'shortName') || description;
      if (!name) continue;
      if (isMessage(name, description)) { about ??= name; continue; }
      const yes = [...rec.matchAll(/<(?:allergen|dietaryChoice) id="([^"]+)">\s*Yes\s*</g)].map((m) => xmlToken(decode(m[1])));
      pushDish(stations, station, name, tagsFromTokens(yes));
    }
    const start = hhmm(attr(tag, 'mealstarttime')); const end = hhmm(attr(tag, 'mealendtime'));
    const existing = meals.find((m) => m.key === key && m.label === label);
    if (existing) { for (const s of stations) for (const d of s.dishes) pushDish(existing.stations, s.name, d.name, d); continue; }
    if (stations.length || (start && end)) meals.push({ key, label, start, end: end && start && end <= start ? '24:00' : end, stations });
  }
  meals.sort((a, b) => (a.start ?? '99').localeCompare(b.start ?? '99'));
  return { location, date, meals, about };
}

// ─── 가져오기 ─────────────────────────────────────────────────────────────────
interface Cached { etag?: string; lastModified?: string; body: string }
const httpCache = new Map<string, Cached>();
let lastRequest = 0;
let gapMs = 800;
/** 테스트용 — 요청 간격 */
export const setRequestGap = (ms: number) => { gapMs = ms; };
async function politeGet(url: string): Promise<{ status: number; body?: string }> {
  const wait = lastRequest + gapMs - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
  const c = httpCache.get(url);
  const headers: Record<string, string> = { 'user-agent': UA, accept: 'text/html,application/xml;q=0.9,*/*;q=0.8' };
  if (c?.etag) headers['if-none-match'] = c.etag;
  if (c?.lastModified) headers['if-modified-since'] = c.lastModified;
  const r = await fetch(url, { headers, signal: AbortSignal.timeout(25_000) });
  if (r.status === 304 && c) return { status: 200, body: c.body };
  if (!r.ok) { await r.arrayBuffer().catch(() => {}); return { status: r.status }; }
  const body = await r.text();
  const etag = r.headers.get('etag') ?? undefined; const lastModified = r.headers.get('last-modified') ?? undefined;
  if (etag || lastModified) { httpCache.set(url, { etag, lastModified, body }); if (httpCache.size > 200) httpCache.delete(httpCache.keys().next().value!); }
  return { status: r.status, body };
}

const kindOf = (sourceName: string, meals: MealPeriod[], about?: string): LocationKind => (HALLS.has(sourceName) ? 'hall' : about && !meals.some((m) => m.stations.length) ? 'market' : 'cafe');
const toLocation = (pl: PageLocation, hours: TimeRange[] | null, meals: MealPeriod[], about?: string): DiningLocation => ({ id: slug(pl.sourceName), name: pl.title, kind: kindOf(pl.sourceName, meals, about), hours, meals, about });

export interface CalDiningResult { days: DiningDay[]; notes: string[]; requests: number }

/**
 * 오늘(+ 다음 날들) 메뉴. dates[0] 은 오늘이어야 한다 — 페이지의 날짜가 다르면(자정 직후 캐시 등) 페이지 영업시간은 쓰지 않는다.
 */
export async function fetchCalDining(schoolId: string, dates: string[]): Promise<CalDiningResult> {
  const notes: string[] = []; let requests = 1;
  const page = await politeGet(CAL_DINING_PAGE);
  if (!page.body) throw new Error(`menus page → HTTP ${page.status}`);
  const parsed = parseMenusPage(page.body);
  if (!parsed.locations.length) throw new Error('menus page had no locations — layout changed?');
  if (parsed.date !== dates[0]) notes.push(`menus page is for ${parsed.date}, wanted ${dates[0]}`);
  const fetchedAt = new Date().toISOString();
  const days: DiningDay[] = [];
  for (const date of dates) {
    const pageIsThisDay = parsed.date === date;
    const locations: DiningLocation[] = [];
    for (const pl of parsed.locations) {
      let meals: MealPeriod[] = pageIsThisDay ? pl.meals : [];
      let about = pl.about;
      let gotXml = false;
      if (pl.xmlPath) {
        const path = pl.xmlPath.replace(/_\d{8}\.xml$/, `_${compact(date)}.xml`);
        try {
          requests++;
          const r = await politeGet(`${ORIGIN}${path}`);
          if (r.body) {
            const x = parseMenuXml(r.body);
            if (x.date && x.date !== date) notes.push(`${pl.sourceName} ${date}: XML says ${x.date}`);
            else if (x.meals.length) {
              // XML 의 식사 시간 + 메뉴. 페이지에만 있는 식사(드물다)는 덧붙인다
              const extra = pageIsThisDay ? pl.meals.filter((m) => !x.meals.some((y) => y.key === m.key)) : [];
              meals = [...x.meals, ...extra]; about = x.about ?? about; gotXml = true;
            }
          } else if (r.status !== 404) notes.push(`${pl.sourceName} ${date}: HTTP ${r.status}`);
        } catch (e) { notes.push(`${pl.sourceName} ${date}: ${(e as Error).message}`); }
      }
      if (!pageIsThisDay && !gotXml) continue; // 그날 메뉴가 아직 안 올라온 곳은 뺀다
      // 페이지에서 읽은 식사에는 시각이 없다 — 같은 이름의 XML 식사가 없으면 비워 둔다 (지어내지 않는다)
      locations.push(toLocation(pl, pageIsThisDay ? pl.hours : null, meals, about));
    }
    days.push({ id: `dining_${schoolId}_${date}`, schoolId, date, fetchedAt, sourceUrl: CAL_DINING_PAGE, locations });
  }
  return { days, notes, requests };
}
