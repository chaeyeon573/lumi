/**
 * 학교별 기회(연구·RA·행사) 자동 수집 — Community › Opportunities 에 들어간다.
 *   urap       UC Berkeley URAP 프로젝트 목록 (지금은 쓰지 않음 — URAP 은 마감 달력에 한 줄로만 안내)
 *   presence   Presence 공개 행사 (api.presence.io/<sub>/v1/events) — UC Merced
 *   engage     CampusLabs Engage 학생 단체 행사 (/api/discovery/event/search) — Berkeley CalLink. 단체가 "Free Food" 를 표시한다
 *   livewhale  학교 전체 캘린더 LiveWhale JSON (/live/json/events/…) — events.berkeley.edu. 2주치 중 무료 음식 · 강연/포럼/패널 · 추천 행사만, 온라인 전용 제외
 *   localist   학교 전체 캘린더 Localist (/api/2/events) — Stanford·MIT·Northeastern. LiveWhale 과 같은 규칙
 * 무료 음식은 표시(benefitNames) 또는 제목·설명의 키워드로 찾아 benefit 에 "🍕 Free food" 를 단다 — 카드에 그대로 보인다
 * 본문을 옮기지 않고 제목·주최·한 줄 요약·원문 링크만 넣는다.
 */
import { decodeNumericEntities } from './entities';
import type { Opportunity, School } from '@core/types';

const UA = { 'user-agent': 'Mozilla/5.0 AroundU-importer' };
const text = (raw: unknown) => (Array.isArray(raw) ? raw.join(', ') : raw == null ? '' : String(raw)).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#039;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&#(x[0-9a-f]+|\d+);/gi, (m) => decodeNumericEntities(m)).replace(/\s+/g, ' ').trim();
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);
async function get(url: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try { const r = await fetch(url, { headers: UA }); if (r.ok) return await r.text(); if (r.status < 500 || attempt >= 3) throw new Error(`${url} → ${r.status}`); }
    catch (e) { if (attempt >= 3) throw e; }
    await new Promise((res) => setTimeout(res, 2000 * 2 ** attempt));
  }
}
const FOOD_RE = /free (food|lunch|dinner|breakfast|pizza|snacks?|boba|coffee|donuts?|tacos?|meal)|food (will be|is) (provided|served)|refreshments|light (snacks|bites|lunch)|pizza|boba|donuts?|bagels?|snacks (provided|served)|lunch (provided|served)|dinner (provided|served)|reception to follow|\bbites\b/i;
export const hasFreeFood = (...texts: (string | undefined)[]) => FOOD_RE.test(texts.filter(Boolean).join(' '));
const TALK_RE = /lecture|talk|forum|panel|seminar|symposium|colloquium|discussion|conversation|keynote|book (talk|launch)|q&a|town hall/i;
/** 행사 시작 시각을 그 학교 벽시계로 ("18:30") — 동부 학교는 America/New_York */
const localTime = (d: Date, tz = 'America/Los_Angeles') => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
type EventSchool = Pick<School, 'id' | 'center'> & Partial<Pick<School, 'name' | 'tz'>>;
const base = (o: Partial<Opportunity> & Pick<Opportunity, 'id' | 'type' | 'title' | 'host' | 'sourceUrl' | 'sourceLabel' | 'schoolId'>, now: string): Opportunity => ({
  description: '', cover: { emoji: o.type === 'lab' ? '🔬' : '📅', hue: o.type === 'lab' ? 175 : 200 }, eligibility: '', tags: [], interests: [], goals: [],
  official: true, lastVerified: now, qna: [], reviews: [], createdAt: now, ...o,
} as Opportunity);

export async function fetchUrap(schoolId = 's_berkeley'): Promise<Opportunity[]> {
  const now = new Date().toISOString(); const out: Opportunity[] = []; const seen = new Set<string>();
  for (let skip = 0; skip < 5000; skip += 50) {
    const html = await get(`https://urapprojects.berkeley.edu/list.php?keywords=&category=&status=&faculty_department=&hours=&site=&sort=&max=50&skip=${skip}`);
    const term = /Project Descriptions\s*<[^>]*>?\s*([A-Z][a-z]+ \d{4})/.exec(html)?.[1] ?? /(Fall|Spring|Summer) \d{4}/.exec(html)?.[0] ?? '';
    const items = html.split('<div class="mt-3 h5 ">').slice(1);
    if (!items.length) break;
    for (const it of items) {
      const link = /href="(detail\.php\?id=[^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(it); if (!link) continue;
      const id = link[1].split('=')[1]; if (seen.has(id)) continue; seen.add(id);
      const title = text(link[2]);
      const faculty = text(/<strong>([\s\S]*?)<\/strong>/.exec(it)?.[1] ?? '');
      const status = text(/Status:\s*([^&<]+)/.exec(it)?.[1] ?? '');
      const hours = text(/Weekly Hours:\s*([^<&]+)/.exec(it)?.[1] ?? '');
      const where = text(/Location:\s*([^<&]+)/.exec(it)?.[1] ?? '');
      // 상태·시간·장소 줄 다음 단락이 요약이다
      const summary = text(/Location:[\s\S]*?<\/p>\s*<p>([\s\S]*?)<\/p>/.exec(it)?.[1] ?? '').slice(0, 280);
      const tags = [...it.matchAll(/category=[^"]+">([^<]+)<\/a>/g)].map((m) => text(m[1]));
      const open = /open|accepting/i.test(status) && !/closed|full/i.test(status);
      out.push(base({
        id: `op_berkeley_urap_${slug(id)}`, type: 'lab', title, host: faculty || 'URAP', schoolId,
        description: `${summary}${summary ? ' ' : ''}(${term ? `${term} · ` : ''}${status || 'status unknown'})`,
        eligibility: 'UC Berkeley undergraduates — apply through URAP (applications open at the start of each term)',
        benefit: [hours && `${hours}/week`, where, 'research units'].filter(Boolean).join(' · '),
        rolesNeeded: ['research'], tags: ['URAP', 'research', ...(open ? ['open'] : ['closed']), ...tags],
        interests: ['research', 'study'], goals: ['lab'],
        sourceUrl: `https://urapprojects.berkeley.edu/${link[1]}`, sourceLabel: 'URAP project listing',
      }, now));
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  return out;
}

interface PresenceEvent { uri: string; eventName: string; organizationName?: string; description?: string; location?: string; startDateTimeUtc: string; endDateTimeUtc?: string; hasEventEnded?: boolean }
export async function fetchPresenceEvents(sub: string, school: EventSchool, horizonDays = 45): Promise<Opportunity[]> {
  const now = new Date(); const nowIso = now.toISOString(); const until = now.getTime() + horizonDays * 86_400_000;
  const events = JSON.parse(await get(`https://api.presence.io/${sub}/v1/events`)) as PresenceEvent[];
  return events
    .filter((e) => !e.hasEventEnded && e.startDateTimeUtc && new Date(e.startDateTimeUtc).getTime() >= now.getTime() - 3_600_000 && new Date(e.startDateTimeUtc).getTime() <= until)
    .map((e) => {
      const start = new Date(e.startDateTimeUtc);
      const local = localTime(start, school.tz);
      return base({
        id: `op_${school.id.replace('s_', '')}_ev_${slug(e.uri)}`, type: 'event', title: e.eventName, host: e.organizationName ?? 'Campus event', schoolId: school.id,
        description: text(e.description ?? '').slice(0, 280), date: start.toISOString(), startTime: local,
        place: e.location ? { name: e.location, lat: school.center.lat, lng: school.center.lng } : undefined,
        eligibility: 'Open to students', tags: ['event', ...(hasFreeFood(e.eventName, e.description) ? ['free food'] : [])], interests: ['club'], goals: [],
        benefit: hasFreeFood(e.eventName, e.description) ? '🍕 Free food' : undefined,
        cover: hasFreeFood(e.eventName, e.description) ? { emoji: '🍕', hue: 25 } : { emoji: '📅', hue: 200 },
        sourceUrl: `https://${sub}.presence.io/event/${e.uri}`, sourceLabel: 'Presence',
      }, nowIso);
    });
}

interface EngageEvent { id: string; name: string; organizationName?: string; description?: string; location?: string; startsOn: string; endsOn?: string; benefitNames?: string[]; theme?: string }
export async function fetchEngageEvents(host: string, school: EventSchool, horizonDays = 30): Promise<Opportunity[]> {
  const nowIso = new Date().toISOString(); const until = Date.now() + horizonDays * 86_400_000;
  const all: EngageEvent[] = [];
  for (let skip = 0; skip < 3000; skip += 100) {
    const d = JSON.parse(await get(`${host}/api/discovery/event/search?endsAfter=${encodeURIComponent(nowIso)}&orderByField=endsOn&orderByDirection=ascending&status=Approved&take=100&skip=${skip}&query=`)) as { value?: EngageEvent[] };
    const v = d.value ?? []; all.push(...v); if (v.length < 100) break;
    await new Promise((r) => setTimeout(r, 150));
  }
  // 여러 단체가 함께 여는 행사는 id 만 다르고 같은 것이 두 번 온다 (Real Talk Buddies Kick-Off) — 이름·시작 시각·장소가 같으면 하나만
  const seen = new Set<string>();
  const once = (e: EngageEvent) => { const k = `${e.name.trim().toLowerCase()}#${e.startsOn}#${(e.location ?? '').trim().toLowerCase()}`; if (seen.has(k)) return false; seen.add(k); return true; };
  return all.filter((e) => new Date(e.startsOn).getTime() <= until).filter(once).map((e) => {
    const start = new Date(e.startsOn); const desc = text(e.description ?? '');
    const food = (e.benefitNames ?? []).includes('Free Food') || hasFreeFood(e.name, desc);
    const stuff = (e.benefitNames ?? []).includes('Free Stuff');
    return base({
      id: `op_${school.id.replace('s_', '')}_eg_${e.id}`, type: 'event', title: e.name.trim(), host: (e.organizationName ?? 'Student organization').replace(/^Campus Dept \| /, ''), schoolId: school.id,
      description: desc.slice(0, 280), date: start.toISOString(), startTime: localTime(start, school.tz),
      place: e.location && !/^TBA$/i.test(e.location) ? { name: e.location, lat: school.center.lat, lng: school.center.lng } : undefined,
      eligibility: 'Open to students', benefit: food ? '🍕 Free food' : stuff ? '🎁 Free stuff' : undefined,
      cover: food ? { emoji: '🍕', hue: 25 } : { emoji: TALK_RE.test(e.name) ? '🎤' : '📅', hue: 200 },
      tags: ['event', ...(food ? ['free food'] : []), ...(stuff ? ['free stuff'] : []), ...(TALK_RE.test(e.name) ? ['talk'] : []), ...(e.theme ? [e.theme.toLowerCase()] : [])],
      interests: ['club'], goals: [], sourceUrl: `${host}/event/${e.id}`, sourceLabel: school.id === 's_berkeley' ? 'CalLink' : 'Student org events',
    }, nowIso);
  });
}

/**
 * CampusGroups 공개 행사 RSS (<host>/rss_events) — Cornell·Yale·Columbia·Duke·USC… CampusGroups 학교들. 로그인 없이 열린다.
 * 공개 행사만(privacyLevel 0, "Private …" 분류 제외), 30일 안에 시작하는 것만, 장소가 "sign in to display" 면 장소 없이. 이모지 없음.
 */
export function parseCampusGroupsRss(xml: string, host: string, school: EventSchool, now = new Date(), horizonDays = 30): Opportunity[] {
  const nowIso = now.toISOString(); const until = now.getTime() + horizonDays * 86_400_000;
  const tag = (it: string, t: string) => text((new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`).exec(it)?.[1] ?? '').replace(/^<!\[CDATA\[|\]\]>$/g, '')).trim();
  const out: Opportunity[] = []; const seen = new Set<string>();
  for (const it of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
    // 공개 = privacyLevel 0 (모든 학교 같은 칸). 분류는 학교마다 다르다(Cornell "Open/Private …", Yale "Group Meeting") — "Private …" 는 빼고
    if (tag(it, 'privacyLevel') !== '0' || /^Private\b/i.test(tag(it, 'category'))) continue;
    const id = tag(it, 'eventId'); const title = tag(it, 'title'); const startRaw = tag(it, 'eventStartDateTime');
    const start = new Date(startRaw.replace(/\.\d+(?=[+-]\d{2}:\d{2}$)/, '')); if (!id || !title || Number.isNaN(start.getTime())) continue;
    if (start.getTime() < now.getTime() || start.getTime() > until || isNoticeNotEvent(title)) continue;
    const key = `${title.toLowerCase()}#${start.toISOString()}`; if (seen.has(key)) continue; seen.add(key);
    const loc = tag(it, 'eventLocation'); const desc = tag(it, 'description');
    const food = /^yes|true|1$/i.test(tag(it, 'foodProvided')) || hasFreeFood(title, desc);
    out.push(base({
      id: `op_${school.id.replace('s_', '')}_cg_${id}`, type: 'event', title, host: tag(it, 'group') || 'Student organization', schoolId: school.id,
      description: desc.slice(0, 280), date: start.toISOString(), startTime: localTime(start, school.tz),
      place: loc && !/sign in|^TBA$|^private/i.test(loc) ? { name: loc, lat: school.center.lat, lng: school.center.lng } : undefined,
      eligibility: 'Open to students', benefit: food ? 'Free food' : undefined, cover: { emoji: '', hue: 200 },
      tags: ['event', ...(food ? ['free food'] : [])], interests: ['club'], goals: [], sourceUrl: tag(it, 'link') || `${host}/events`, sourceLabel: 'Student org events',
    }, nowIso));
  }
  return out;
}
/**
 * 학교 행사 RSS 중 pubDate 가 행사 시작 시각인 것 — Caltech events.caltech.edu/calendar/rss (학교 공식 공개 행사, 로그인 없음).
 * 학교가 고른 공개 행사라 전부 넣는다. 지난 것·horizon 밖·전시(Exhibit/Exhibition)·알림은 뺀다. 글자 코드가 두 번 감싸여 온다(&amp;amp;) → 두 번 푼다.
 */
export function parseEventRss(xml: string, school: EventSchool, now = new Date(), horizonDays = 30, prefix = 'rss', label = 'Events'): Opportunity[] {
  const nowIso = now.toISOString(); const until = now.getTime() + horizonDays * 86_400_000;
  const tag = (it: string, t: string) => text(text((new RegExp(`<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`).exec(it)?.[1] ?? '').replace(/^<!\[CDATA\[|\]\]>$/g, '')));
  const out: Opportunity[] = []; const seen = new Set<string>();
  for (const it of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
    const title = tag(it, 'title'); const link = tag(it, 'link'); const start = new Date(tag(it, 'pubDate'));
    if (!title || !link || Number.isNaN(start.getTime())) continue;
    if (start.getTime() < now.getTime() || start.getTime() > until || isNoticeNotEvent(title) || /\bexhibit(ion)?\b/i.test(title)) continue;
    const key = `${title.toLowerCase()}#${start.toISOString()}`; if (seen.has(key)) continue; seen.add(key);
    const desc = tag(it, 'description'); const food = hasFreeFood(title, desc); const talk = TALK_RE.test(title);
    const slug = (/\/([^/?#]+)\/?$/.exec(link)?.[1] ?? title).toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 60);
    out.push(base({
      id: `op_${school.id.replace('s_', '')}_${prefix}_${slug}`, type: 'event', title, host: school.name ?? 'Campus', schoolId: school.id,
      description: desc.slice(0, 280), date: start.toISOString(), startTime: localTime(start, school.tz),
      eligibility: /free and open to the public|admission is free|free/i.test(desc) ? 'Free, open to the public' : 'Open to the campus community', benefit: food ? 'Free food' : undefined, cover: { emoji: '', hue: 200 },
      tags: ['event', ...(food ? ['free food'] : []), ...(talk ? ['talk'] : [])], interests: talk ? ['research', 'study'] : ['club'], goals: [], sourceUrl: link, sourceLabel: school.name ? `${school.name} ${label}` : label,
    }, nowIso));
  }
  return out;
}
export async function fetchEventRss(url: string, school: EventSchool, horizonDays = 30): Promise<Opportunity[]> { return parseEventRss(await get(url), school, new Date(), horizonDays); }

interface TribeEvent { id: number; title: string; url: string; description?: string; excerpt?: string; all_day?: boolean; utc_start_date?: string; cost?: string; hide_from_listings?: boolean; is_virtual?: boolean; status?: string; venue?: { venue?: string } | unknown[]; categories?: { name?: string }[] }
/** WordPress "The Events Calendar" 공개 REST (/wp-json/tribe/events/v1/events) — UCSC events.ucsc.edu. utc_start_date 는 UTC */
export function parseTribeEvents(events: TribeEvent[], school: EventSchool, now = new Date(), horizonDays = 30): Opportunity[] {
  const nowIso = now.toISOString(); const until = now.getTime() + horizonDays * 86_400_000;
  const out: Opportunity[] = []; const seen = new Set<string>();
  for (const e of events) {
    const title = text(text(e.title ?? '')); const start = new Date(`${(e.utc_start_date ?? '').replace(' ', 'T')}Z`);
    if (!title || !e.url || Number.isNaN(start.getTime()) || e.hide_from_listings || (e.status && e.status !== 'publish')) continue;
    if (start.getTime() < now.getTime() || start.getTime() > until || isNoticeNotEvent(title)) continue;
    const cats = (e.categories ?? []).map((c) => text(c.name ?? ''));
    if (cats.some((c) => /^exhibit/i.test(c)) || /\bexhibit(ion)?\b/i.test(title)) continue;
    const venue = e.venue && !Array.isArray(e.venue) ? text(e.venue.venue ?? '') : '';
    if (e.is_virtual || /zoom|on-?line|remote|virtual/i.test(venue)) continue;
    const key = `${title.toLowerCase()}#${start.toISOString().slice(0, 10)}`; if (seen.has(key)) continue; seen.add(key);
    const desc = text(text(e.excerpt || e.description || '')); const food = hasFreeFood(title, desc);
    const talk = TALK_RE.test(title) || cats.some((c) => /lecture|seminar|panel|colloquium|talk|presentation/i.test(c));
    out.push(base({
      id: `op_${school.id.replace('s_', '')}_tribe_${e.id}`, type: 'event', title, host: school.name ?? 'Campus', schoolId: school.id,
      description: desc.slice(0, 280), date: start.toISOString(), startTime: e.all_day ? undefined : localTime(start, school.tz),
      place: venue ? { name: venue, lat: school.center.lat, lng: school.center.lng } : undefined,
      eligibility: e.cost && !/free/i.test(e.cost) ? `Cost: ${text(e.cost)}` : 'Open to the campus community', benefit: food ? 'Free food' : undefined, cover: { emoji: '', hue: 200 },
      tags: ['event', ...(food ? ['free food'] : []), ...(talk ? ['talk'] : []), ...cats.slice(0, 3).map((c) => c.toLowerCase())], interests: talk ? ['research', 'study'] : ['club'], goals: [], sourceUrl: e.url, sourceLabel: school.name ? `${school.name} Events` : 'Events',
    }, nowIso));
  }
  return out;
}
export async function fetchTribeEvents(site: string, school: EventSchool, horizonDays = 30): Promise<Opportunity[]> {
  const from = new Date().toISOString().slice(0, 10); const to = new Date(Date.now() + horizonDays * 86_400_000).toISOString().slice(0, 10);
  const all: TribeEvent[] = [];
  for (let page = 1; page <= 20; page++) {
    const j = JSON.parse(await get(`${site.replace(/\/+$/, '')}/wp-json/tribe/events/v1/events?per_page=50&page=${page}&start_date=${from}&end_date=${to}`)) as { events?: TribeEvent[]; total_pages?: number };
    all.push(...(j.events ?? [])); if (!j.total_pages || page >= j.total_pages) break;
  }
  return parseTribeEvents(all, school, new Date(), horizonDays);
}

/** UCLA Community calendar (community.ucla.edu, 학교 공식) — 피드가 없어 주(week) 페이지의 event-card 를 읽는다. data-event-start 는 UTC */
export function parseUclaCommunityWeek(html: string, school: EventSchool, now = new Date(), horizonDays = 30, origin = 'https://community.ucla.edu'): Opportunity[] {
  const nowIso = now.toISOString(); const until = now.getTime() + horizonDays * 86_400_000;
  const out: Opportunity[] = []; const seen = new Set<string>();
  const cards = html.split(/<div\s+id="event-/).slice(1);
  for (const c of cards) {
    const id = /^([0-9a-f-]+)"/.exec(c)?.[1]; const startRaw = /data-event-start="([^"]+Z)"/.exec(c)?.[1]; const stopRaw = /data-event-stop="([^"]+Z)"/.exec(c)?.[1];
    const a = /<a\s+href="(\/event\/[^"]+)"\s+aria-label="([^"]*)"\s*>([\s\S]*?)<\/a/.exec(c);
    if (!id || !startRaw || !a) continue;
    const title = text(a[3]); const start = new Date(startRaw); const stop = stopRaw ? new Date(stopRaw) : start;
    if (!title || Number.isNaN(start.getTime()) || start.getTime() < now.getTime() || start.getTime() > until || isNoticeNotEvent(title)) continue;
    // 여러 날 이어지는 전시·상시 프로그램은 '그 시간에 가는 행사'가 아니다
    if (stop.getTime() - start.getTime() > 86_400_000 || /\bexhibit(ion)?\b/i.test(title)) continue;
    const allDay = /data-event-allday="true"/.test(c);
    const loc = text(/<p class="event-card-location">([\s\S]*?)<\/p>/.exec(c)?.[1] ?? '');
    if (/zoom|on-?line|remote|virtual/i.test(loc) || /\bwebinar\b/i.test(title)) continue;
    const key = `${title.toLowerCase()}#${start.toISOString().slice(0, 10)}`; if (seen.has(key)) continue; seen.add(key);
    const desc = text(/<p class="event-card-description">([\s\S]*?)<\/p>/.exec(c)?.[1] ?? '');
    const host = text(/ by ([^"]+)$/.exec(text(a[2]))?.[1] ?? '') || school.name || 'Campus';
    const cats = [...c.matchAll(/class="label label-(?:sub)?category"\s*>#([^<]+)</g)].map((m) => text(m[1]));
    const food = hasFreeFood(title, desc); const talk = TALK_RE.test(title) || cats.some((x) => /lecture|seminar|panel|talk|research/i.test(x));
    out.push(base({
      id: `op_${school.id.replace('s_', '')}_ucom_${id.slice(0, 18)}`, type: 'event', title, host, schoolId: school.id,
      description: desc.slice(0, 280), date: start.toISOString(), startTime: allDay ? undefined : localTime(start, school.tz),
      place: loc ? { name: loc, lat: school.center.lat, lng: school.center.lng } : undefined,
      eligibility: 'Open to the campus community', benefit: food ? 'Free food' : undefined, cover: { emoji: '', hue: 200 },
      tags: ['event', ...(food ? ['free food'] : []), ...(talk ? ['talk'] : []), ...cats.slice(0, 3).map((x) => x.toLowerCase())], interests: talk ? ['research', 'study'] : ['club'], goals: [], sourceUrl: `${origin}${a[1]}`, sourceLabel: school.name ? `${school.name} Community Calendar` : 'Community Calendar',
    }, nowIso));
  }
  return out;
}
/** /calendars 에서 주 링크("Mon 11/9 - Sun 11/15")를 읽어 앞으로 horizonDays 안에 걸친 주만 받는다 (보통 5페이지) */
export function uclaCommunityWeeks(html: string, now = new Date(), horizonDays = 30): string[] {
  const flat = html.replace(/\s+/g, ' '); const until = now.getTime() + horizonDays * 86_400_000; const out: string[] = [];
  for (const m of flat.matchAll(/<a href="(\/term\/[a-z]+-(\d{4})\/[^"]+)"\s*>[^<]*<span class="button-aside">\w{3} (\d{1,2})\/(\d{1,2}) - \w{3} (\d{1,2})\/(\d{1,2})<\/span>/g)) {
    const y = Number(m[2]); const sm = Number(m[3]); const em = Number(m[5]);
    // 가을 학기 링크의 연도는 학기 연도. 겨울방학처럼 1월로 넘어가면 다음 해
    const sy = y; const from = Date.UTC(sy, sm - 1, Number(m[4])); const to = Date.UTC(em < sm ? sy + 1 : sy, em - 1, Number(m[6]) + 1);
    if (to >= now.getTime() && from <= until) out.push(m[1]);
  }
  return [...new Set(out)];
}
export async function fetchUclaCommunity(origin: string, school: EventSchool, horizonDays = 30): Promise<Opportunity[]> {
  const o = origin.replace(/\/+$/, ''); const weeks = uclaCommunityWeeks(await get(`${o}/calendars`), new Date(), horizonDays);
  const out: Opportunity[] = []; const ids = new Set<string>();
  for (const w of weeks) for (const e of parseUclaCommunityWeek(await get(`${o}${w}`), school, new Date(), horizonDays, o)) if (!ids.has(e.id)) { ids.add(e.id); out.push(e); }
  return out;
}

export async function fetchCampusGroupsEvents(host: string, school: EventSchool, horizonDays = 30): Promise<Opportunity[]> {
  return parseCampusGroupsRss(await get(`${host.replace(/\/+$/, '')}/rss_events`), host, school, new Date(), horizonDays);
}

/** 행사가 아니라 ‘오늘 세미나 없음’·‘취소’ 같은 알림 — 행사 목록에 넣으면 그날 뭔가 있는 것처럼 보인다 */
export const isNoticeNotEvent = (title: string) => /^no\b.*\b(today|this week|tonight)\b|\b(cancell?ed|postponed)\b/i.test(title);
interface LwEvent { id: number; title: string; url: string; date_iso: string; is_canceled?: number | boolean; is_all_day?: number | boolean; is_starred?: number | boolean; is_online?: number | boolean; location?: string; summary?: string; event_types?: string[]; group_title?: string; cost?: string }
export async function fetchLiveWhale(base_: string, school: EventSchool, horizonDays = 14): Promise<Opportunity[]> {
  const nowIso = new Date().toISOString(); const out: Opportunity[] = []; const seen = new Set<number>(); const seenTitleDay = new Set<string>();
  const fields = 'response_fields/location,summary,event_types,group_title,cost';
  // 날짜 범위는 끝 날짜가 다음 날이어야 그날 행사가 다 온다 (같은 날이면 일부만). 하루 100개가 넘으니 ?page=N 으로 넘긴다
  for (let d = 0; d < horizonDays; d++) {
    const day = new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);
    const next = new Date(Date.now() + (d + 1) * 86_400_000).toISOString().slice(0, 10);
    const items: LwEvent[] = [];
    for (let page = 1; page <= 10; page++) {
      const raw = JSON.parse(await get(`${base_}/live/json/events/start_date/${day}/end_date/${next}/${fields}/max/500/?page=${page}`)) as { data?: LwEvent[]; meta?: { total_pages?: number } } | LwEvent[];
      items.push(...(Array.isArray(raw) ? raw : raw.data ?? []));
      if (Array.isArray(raw) || !raw.meta?.total_pages || page >= raw.meta.total_pages) break;
    }
    for (const e of items) {
      if (!e.date_iso?.startsWith(day)) continue; // 다음 날 0시 행사는 다음 반복에서
      if (seen.has(e.id) || e.is_canceled || /^exhibit\b/i.test(e.title) || isNoticeNotEvent(text(e.title))) continue; seen.add(e.id);
      const title = text(e.title); const summary = text(e.summary ?? ''); const types = (Array.isArray(e.event_types) ? e.event_types : []).map((t) => String(t));
      const food = hasFreeFood(title, summary); const talk = TALK_RE.test(title) || types.some((t) => /lecture|seminar|panel|colloquium|talk/i.test(t));
      // 학생에게 의미 있는 것만: 무료 음식 · 강연/포럼/패널 · 학교가 추천한 대표 행사. 온라인 전용과 같은 날 같은 제목의 반복은 뺀다
      if (!food && !talk && !e.is_starred) continue;
      const loc = text(e.location ?? '');
      if ((e.is_online && !loc) || /zoom|on-?line|remote|virtual/i.test(loc)) continue;
      const titleDay = `${title.toLowerCase()}#${day}`; if (seenTitleDay.has(titleDay)) continue; seenTitleDay.add(titleDay);
      const start = new Date(e.date_iso);
      out.push(base({
        id: `op_${school.id.replace('s_', '')}_lw_${e.id}`, type: 'event', title, host: e.group_title ? text(e.group_title) : school.name ?? 'Campus', schoolId: school.id,
        description: summary.slice(0, 280), date: start.toISOString(), startTime: e.is_all_day ? undefined : localTime(start, school.tz),
        place: e.location ? { name: text(e.location), lat: school.center.lat, lng: school.center.lng } : undefined,
        eligibility: e.cost && !/free/i.test(e.cost) ? `Cost: ${text(e.cost)}` : 'Open to the campus community',
        benefit: food ? '🍕 Free food' : undefined,
        cover: food ? { emoji: '🍕', hue: 25 } : { emoji: talk ? '🎤' : '📅', hue: 200 },
        tags: ['event', ...(food ? ['free food'] : []), ...(talk ? ['talk'] : []), ...types.slice(0, 3).map((t) => t.toLowerCase())],
        interests: talk ? ['research', 'study'] : ['club'], goals: [], sourceUrl: e.url, sourceLabel: school.name ? `${school.name} Events` : 'Campus events',
      }, nowIso));
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  return out;
}

interface LcInstance { event_instance: { start: string; end?: string | null; all_day?: boolean } }
interface LcEvent { id: number; title: string; url?: string; localist_url: string; location_name?: string; room_number?: string | null; experience?: string; free?: boolean; featured?: boolean; status?: string; ticket_cost?: string | null; event_instances?: LcInstance[]; filters?: { event_types?: { name: string }[] }; departments?: { name: string }[]; description_text?: string }
/**
 * 학교 전체 캘린더 Localist (/api/2/events) — Stanford·MIT·Northeastern 이 쓴다. LiveWhale 과 같은 규칙:
 * 2주치 중 무료 음식 · 강연/세미나/패널 · 학교가 추천한 행사만, 온라인 전용 제외. 반복 행사는 다음 한 번만
 */
export function localistToOpportunities(events: LcEvent[], school: EventSchool, now = new Date(), horizonDays = 14): Opportunity[] {
  const nowIso = now.toISOString(); const until = now.getTime() + horizonDays * 86_400_000;
  const out: Opportunity[] = []; const seenTitleDay = new Set<string>();
  for (const e of events) {
    if (e.status && e.status !== 'live') continue;
    if (e.experience === 'virtual' || /^exhibit\b/i.test(e.title) || isNoticeNotEvent(text(e.title))) continue;
    const next = (e.event_instances ?? []).map((x) => x.event_instance).filter((x) => Date.parse(x.end ?? x.start) >= now.getTime() && Date.parse(x.start) <= until).sort((a, b) => Date.parse(a.start) - Date.parse(b.start))[0];
    if (!next) continue;
    const title = text(e.title); const summary = text(e.description_text ?? '');
    const types = (e.filters?.event_types ?? []).map((t) => t.name);
    const food = hasFreeFood(title, summary); const talk = TALK_RE.test(title) || types.some((t) => /lecture|seminar|panel|colloquium|talk/i.test(t));
    if (!food && !talk && !e.featured) continue;
    const start = new Date(next.start);
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: school.tz ?? 'America/Los_Angeles' }).format(start);
    const titleDay = `${title.toLowerCase()}#${day}`; if (seenTitleDay.has(titleDay)) continue; seenTitleDay.add(titleDay);
    const place = [text(e.location_name ?? ''), text(e.room_number ?? '')].filter(Boolean).join(', ');
    out.push(base({
      id: `op_${school.id.replace('s_', '')}_lc_${e.id}`, type: 'event', title, host: e.departments?.[0]?.name ? text(e.departments[0].name) : school.name ?? 'Campus', schoolId: school.id,
      description: summary.slice(0, 280), date: start.toISOString(), startTime: next.all_day ? undefined : localTime(start, school.tz),
      place: place ? { name: place, lat: school.center.lat, lng: school.center.lng } : undefined,
      eligibility: e.ticket_cost && !/free/i.test(e.ticket_cost) ? `Cost: ${text(e.ticket_cost)}` : 'Open to the campus community',
      benefit: food ? '🍕 Free food' : undefined,
      cover: food ? { emoji: '🍕', hue: 25 } : { emoji: talk ? '🎤' : '📅', hue: 200 },
      tags: ['event', ...(food ? ['free food'] : []), ...(talk ? ['talk'] : []), ...types.slice(0, 3).map((t) => t.toLowerCase())],
      interests: talk ? ['research', 'study'] : ['club'], goals: [], sourceUrl: e.localist_url, sourceLabel: school.name ? `${school.name} Events` : 'Campus events',
    }, nowIso));
  }
  return out;
}
export async function fetchLocalist(base_: string, school: EventSchool, horizonDays = 14): Promise<Opportunity[]> {
  const all: LcEvent[] = [];
  for (let page = 1; page <= 20; page++) {
    const d = JSON.parse(await get(`${base_}/api/2/events?days=${horizonDays}&pp=100&page=${page}`)) as { events?: { event: LcEvent }[]; page?: { total?: number } };
    all.push(...(d.events ?? []).map((x) => x.event));
    if (!d.page?.total || page >= d.page.total) break;
    await new Promise((r) => setTimeout(r, 150));
  }
  return localistToOpportunities(all, school, new Date(), horizonDays);
}
