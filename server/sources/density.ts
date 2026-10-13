/**
 * 체육관 혼잡도 — RecWell(UC Berkeley) 공식 페이지에 박힌 Density 표시판.
 *
 *   https://recwell.berkeley.edu/facilities/recreational-sports-facility-rsf/rsf-weight-room-crowd-meter/
 *     <iframe src="https://safe.density.io/#/displays/<dsp_id>?token=<shr_token>">
 *   GET https://api.density.io/v2/displays/<dsp_id>   Authorization: Bearer <shr_token>
 *     → { name, dedicated_space: { name, current_count, capacity, … } }
 *
 * 표시판 id·공유 토큰은 코드에 적지 않는다 — 공개 페이지에서 그때그때(하루 한 번, 401/403 이면 바로) 읽어 메모리에만 둔다.
 * 토큰은 로그·응답·DB 어디에도 내보내지 않는다.
 */
export const RECWELL_CROWD_PAGE = 'https://recwell.berkeley.edu/facilities/recreational-sports-facility-rsf/rsf-weight-room-crowd-meter/';
const UA = 'Mozilla/5.0 (compatible; Lumi-campus-app; gym crowd, one shared request per space every 5 min)';

export interface DensityDisplay { displayId: string; token: string; title?: string }

/** 페이지의 iframe 들 → 표시판 목록 (같은 id 는 한 번) */
export function parseCrowdMeterPage(html: string): DensityDisplay[] {
  const out: DensityDisplay[] = [];
  for (const m of html.matchAll(/<iframe\b[^>]*>/gi)) {
    const tag = m[0];
    const src = /\ssrc="([^"]+)"/i.exec(tag)?.[1]?.replace(/&amp;/g, '&') ?? '';
    const hit = /^https:\/\/safe\.density\.io\/#\/displays\/(dsp_[A-Za-z0-9]+)\?(?:[^"#]*&)?token=(shr_[A-Za-z0-9_-]+)/.exec(src);
    if (!hit || out.some((d) => d.displayId === hit[1])) continue;
    const title = /\stitle="([^"]*)"/i.exec(tag)?.[1];
    out.push({ displayId: hit[1], token: hit[2], title: title || undefined });
  }
  return out;
}

export interface DensityReading { displayId: string; spaceId: string; name: string; count: number; capacity: number }

/** "RSF - Weight Rooms" → "RSF Weight Rooms" */
const cleanName = (s: string) => s.replace(/\s+[-–]\s+/g, ' ').replace(/\s+/g, ' ').trim();

/** API 응답 → 인원·정원. 모양이 이상하면 던진다 (틀린 숫자를 보여 주느니 '알 수 없음') */
export function parseDensityDisplay(json: unknown, displayId: string): DensityReading {
  const d = json as { id?: unknown; name?: unknown; dedicated_space?: { id?: unknown; name?: unknown; current_count?: unknown; capacity?: unknown } | null };
  const sp = d?.dedicated_space;
  if (!sp || typeof sp !== 'object') throw new Error('density: no dedicated_space');
  const count = sp.current_count; const capacity = sp.capacity;
  if (typeof count !== 'number' || !Number.isFinite(count) || count < 0) throw new Error('density: bad current_count');
  if (typeof capacity !== 'number' || !Number.isFinite(capacity) || capacity <= 0) throw new Error('density: bad capacity');
  if (typeof d.id === 'string' && d.id !== displayId) throw new Error('density: display id mismatch');
  const name = cleanName(typeof d.name === 'string' && d.name ? d.name : typeof sp.name === 'string' ? sp.name : displayId);
  return { displayId, spaceId: typeof sp.id === 'string' ? sp.id : displayId, name, count: Math.round(count), capacity: Math.round(capacity) };
}

export class DensityError extends Error { constructor(public status: number, message: string) { super(message); } }

export async function fetchCrowdMeterPage(url = RECWELL_CROWD_PAGE): Promise<DensityDisplay[]> {
  const r = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new DensityError(r.status, `crowd meter page → HTTP ${r.status}`);
  const list = parseCrowdMeterPage(await r.text());
  if (!list.length) throw new DensityError(0, 'crowd meter page has no Density displays — layout changed?');
  return list;
}

export async function fetchDensityDisplay(d: DensityDisplay): Promise<DensityReading> {
  let r: Response;
  try {
    r = await fetch(`https://api.density.io/v2/displays/${encodeURIComponent(d.displayId)}`, { headers: { authorization: `Bearer ${d.token}`, 'user-agent': UA, accept: 'application/json' }, signal: AbortSignal.timeout(15_000) });
  } catch (e) { throw new DensityError(0, `density: ${(e as Error).name === 'TimeoutError' ? 'timeout' : 'network error'}`); }
  if (!r.ok) { await r.arrayBuffer().catch(() => {}); throw new DensityError(r.status, `density → HTTP ${r.status}`); }
  return parseDensityDisplay(await r.json(), d.displayId);
}
