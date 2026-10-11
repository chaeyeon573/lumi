/**
 * 학교별 기회(연구·RA·행사) 자동 수집 — Community › Opportunities 에 들어간다.
 *   urap      UC Berkeley URAP 프로젝트 목록 (urapprojects.berkeley.edu, 공개) → type 'lab'
 *   presence  Presence 공개 행사 (api.presence.io/<sub>/v1/events) → 앞으로 열리는 것만 type 'event'
 * 본문을 옮기지 않고 제목·주최·한 줄 요약·원문 링크만 넣는다.
 */
import type { Opportunity, School } from '@core/types';

const UA = { 'user-agent': 'Mozilla/5.0 AroundU-importer' };
const text = (h: string) => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#039;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60);
async function get(url: string): Promise<string> {
  for (let attempt = 0; ; attempt++) {
    try { const r = await fetch(url, { headers: UA }); if (r.ok) return await r.text(); if (r.status < 500 || attempt >= 3) throw new Error(`${url} → ${r.status}`); }
    catch (e) { if (attempt >= 3) throw e; }
    await new Promise((res) => setTimeout(res, 2000 * 2 ** attempt));
  }
}
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
        eligibility: 'Open to students', tags: ['event'], interests: ['club'], goals: [],
        sourceUrl: `https://${sub}.presence.io/event/${e.uri}`, sourceLabel: 'Presence',
      }, nowIso);
    });
}
