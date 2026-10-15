/**
 * 학교별 기회(연구·RA·행사) 자동 수집 — Community › Opportunities 에 들어간다.
 *   urap       UC Berkeley URAP 프로젝트 목록 (지금은 쓰지 않음 — URAP 은 마감 달력에 한 줄로만 안내)
 *   presence   Presence 공개 행사 (api.presence.io/<sub>/v1/events) — UC Merced
 *   engage     CampusLabs Engage 학생 단체 행사 (/api/discovery/event/search) — Berkeley CalLink. 단체가 "Free Food" 를 표시한다
 *   livewhale  학교 전체 캘린더 LiveWhale JSON (/live/json/events/…) — events.berkeley.edu. 2주치 중 무료 음식 · 강연/포럼/패널 · 추천 행사만, 온라인 전용 제외
 * 무료 음식은 표시(benefitNames) 또는 제목·설명의 키워드로 찾아 benefit 에 "🍕 Free food" 를 단다 — 카드에 그대로 보인다
 * 본문을 옮기지 않고 제목·주최·한 줄 요약·원문 링크만 넣는다.
 */
import type { Opportunity, School } from '@core/types';

const UA = { 'user-agent': 'Mozilla/5.0 AroundU-importer' };
const text = (raw: unknown) => (Array.isArray(raw) ? raw.join(', ') : raw == null ? '' : String(raw)).replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#039;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
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
const laTime = (d: Date) => new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
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
export async function fetchPresenceEvents(sub: string, school: Pick<School, 'id' | 'center'>, horizonDays = 45): Promise<Opportunity[]> {
  const now = new Date(); const nowIso = now.toISOString(); const until = now.getTime() + horizonDays * 86_400_000;
  const events = JSON.parse(await get(`https://api.presence.io/${sub}/v1/events`)) as PresenceEvent[];
  return events
    .filter((e) => !e.hasEventEnded && e.startDateTimeUtc && new Date(e.startDateTimeUtc).getTime() >= now.getTime() - 3_600_000 && new Date(e.startDateTimeUtc).getTime() <= until)
    .map((e) => {
      const start = new Date(e.startDateTimeUtc);
      const local = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hour12: false }).format(start);
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
export async function fetchEngageEvents(host: string, school: Pick<School, 'id' | 'center'>, horizonDays = 30): Promise<Opportunity[]> {
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
      description: desc.slice(0, 280), date: start.toISOString(), startTime: laTime(start),
      place: e.location && !/^TBA$/i.test(e.location) ? { name: e.location, lat: school.center.lat, lng: school.center.lng } : undefined,
      eligibility: 'Open to students', benefit: food ? '🍕 Free food' : stuff ? '🎁 Free stuff' : undefined,
      cover: food ? { emoji: '🍕', hue: 25 } : { emoji: TALK_RE.test(e.name) ? '🎤' : '📅', hue: 200 },
      tags: ['event', ...(food ? ['free food'] : []), ...(stuff ? ['free stuff'] : []), ...(TALK_RE.test(e.name) ? ['talk'] : []), ...(e.theme ? [e.theme.toLowerCase()] : [])],
      interests: ['club'], goals: [], sourceUrl: `${host}/event/${e.id}`, sourceLabel: 'CalLink',
    }, nowIso);
  });
}

interface LwEvent { id: number; title: string; url: string; date_iso: string; is_canceled?: number | boolean; is_all_day?: number | boolean; is_starred?: number | boolean; is_online?: number | boolean; location?: string; summary?: string; event_types?: string[]; group_title?: string; cost?: string }
export async function fetchLiveWhale(base_: string, school: Pick<School, 'id' | 'center'>, horizonDays = 14): Promise<Opportunity[]> {
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
      if (seen.has(e.id) || e.is_canceled || /^exhibit\b/i.test(e.title)) continue; seen.add(e.id);
      const title = text(e.title); const summary = text(e.summary ?? ''); const types = (Array.isArray(e.event_types) ? e.event_types : []).map((t) => String(t));
      const food = hasFreeFood(title, summary); const talk = TALK_RE.test(title) || types.some((t) => /lecture|seminar|panel|colloquium|talk/i.test(t));
      // 학생에게 의미 있는 것만: 무료 음식 · 강연/포럼/패널 · 학교가 추천한 대표 행사. 온라인 전용과 같은 날 같은 제목의 반복은 뺀다
      if (!food && !talk && !e.is_starred) continue;
      const loc = text(e.location ?? '');
      if ((e.is_online && !loc) || /zoom|on-?line|remote|virtual/i.test(loc)) continue;
      const titleDay = `${title.toLowerCase()}#${day}`; if (seenTitleDay.has(titleDay)) continue; seenTitleDay.add(titleDay);
      const start = new Date(e.date_iso);
      out.push(base({
        id: `op_${school.id.replace('s_', '')}_lw_${e.id}`, type: 'event', title, host: e.group_title ? text(e.group_title) : 'UC Berkeley', schoolId: school.id,
        description: summary.slice(0, 280), date: start.toISOString(), startTime: e.is_all_day ? undefined : laTime(start),
        place: e.location ? { name: text(e.location), lat: school.center.lat, lng: school.center.lng } : undefined,
        eligibility: e.cost && !/free/i.test(e.cost) ? `Cost: ${text(e.cost)}` : 'Open to the campus community',
        benefit: food ? '🍕 Free food' : undefined,
        cover: food ? { emoji: '🍕', hue: 25 } : { emoji: talk ? '🎤' : '📅', hue: 200 },
        tags: ['event', ...(food ? ['free food'] : []), ...(talk ? ['talk'] : []), ...types.slice(0, 3).map((t) => t.toLowerCase())],
        interests: talk ? ['research', 'study'] : ['club'], goals: [], sourceUrl: e.url, sourceLabel: 'UC Berkeley Events',
      }, nowIso));
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  return out;
}
