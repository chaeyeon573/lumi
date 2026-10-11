/**
 * 학교 밖 대학생 대상 기회 — schoolId 없이 넣어 모든 학교 학생에게 보인다.
 *   devpost  Devpost 공개 API (devpost.com/api/hackathons) — 진행 중·예정 해커톤. 온라인 또는 캘리포니아 대면만, 초대제 제외
 * MLH 해커톤 대부분이 Devpost 에도 올라온다.
 */
import type { Opportunity } from '@core/types';

const UA = { 'user-agent': 'Mozilla/5.0 AroundU-importer', accept: 'application/json' };
const text = (raw: unknown) => (raw == null ? '' : String(raw)).replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const MONTHS: Record<string, number> = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
/** "Oct 10 - 11, 2026" / "Sep 01 - Dec 01, 2026" / "Dec 28, 2026 - Jan 03, 2027" → 시작·끝 */
export function parseDevpostDates(s: string): { start?: Date; end?: Date } {
  const m = /^([A-Z][a-z]{2}) (\d{1,2})(?:, (\d{4}))? - (?:([A-Z][a-z]{2}) )?(\d{1,2}), (\d{4})$/.exec(s.trim());
  if (!m) return {};
  const endYear = Number(m[6]); const startYear = m[3] ? Number(m[3]) : endYear;
  const start = new Date(Date.UTC(startYear, MONTHS[m[1]], Number(m[2]), 12));
  const end = new Date(Date.UTC(endYear, MONTHS[m[4] ?? m[1]], Number(m[5]), 23, 59));
  return { start, end };
}
interface DevpostHackathon { id: number; title: string; url: string; open_state: string; invite_only?: boolean; displayed_location?: { location?: string }; submission_period_dates?: string; prize_amount?: string; themes?: { name: string }[]; organization_name?: string; registrations_count?: number }
const CA_RE = /online|california|\bca\b|berkeley|san francisco|stanford|palo alto|san jose|merced|los angeles|san diego|oakland|bay area|santa clara|irvine|davis|santa cruz|sacramento/i;

export async function fetchDevpost(maxPages = 40): Promise<Opportunity[]> {
  const now = new Date().toISOString(); const out: Opportunity[] = []; const seen = new Set<number>();
  for (let page = 1; page <= maxPages; page++) {
    const r = await fetch(`https://devpost.com/api/hackathons?status[]=upcoming&status[]=open&order_by=deadline&page=${page}`, { headers: UA });
    if (!r.ok) throw new Error(`devpost page ${page} → ${r.status}`);
    const d = (await r.json()) as { hackathons?: DevpostHackathon[] };
    const list = d.hackathons ?? []; if (!list.length) break;
    for (const h of list) {
      if (seen.has(h.id)) continue; seen.add(h.id);
      const where = text(h.displayed_location?.location ?? '');
      if (h.invite_only || !CA_RE.test(where)) continue;
      // 대학생 대상이 아닌 고등학생·청소년 대회는 뺀다
      if (/high school|middle school|k-12|\bhs\b|secondary school|teen|youth|kids/i.test(`${h.title} ${h.organization_name ?? ''}`)) continue;
      const { start, end } = parseDevpostDates(h.submission_period_dates ?? '');
      const online = /online/i.test(where);
      const prize = text(h.prize_amount ?? '');
      out.push({
        id: `op_ext_devpost_${h.id}`, type: 'hackathon', title: text(h.title), host: text(h.organization_name ?? 'Devpost'),
        description: `${online ? 'Online' : where} hackathon · ${h.submission_period_dates ?? ''}${h.registrations_count ? ` · ${h.registrations_count} registered` : ''}`,
        cover: { emoji: '💡', hue: 230 }, deadline: end?.toISOString(), date: start?.toISOString(),
        place: online ? undefined : { name: where, lat: 37.8719, lng: -122.2585 },
        eligibility: 'Check eligibility on the hackathon page', benefit: prize && prize !== '$0' ? `Prizes ${prize}` : undefined,
        rolesNeeded: ['developer', 'designer'], teamSize: undefined,
        sourceUrl: h.url, sourceLabel: 'Devpost', tags: ['hackathon', online ? 'online' : 'in person', ...(h.themes ?? []).map((t) => t.name).slice(0, 3)],
        interests: ['startup', 'study'], goals: ['hackathon'], official: false, lastVerified: now, qna: [], reviews: [], createdAt: now,
      });
    }
    await new Promise((res) => setTimeout(res, 200));
  }
  return out;
}
