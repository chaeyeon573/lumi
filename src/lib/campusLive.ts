/**
 * 오늘의 학식 · 체육관 혼잡도 — 서버(server/campus-live.ts) 호출.
 * 공용 AroundUApi 를 늘리지 않고 같은 세션 토큰으로 바로 부른다 (mock 모드에서는 서버가 없으니 '없음').
 */
import { apiMode } from '@core/api';
import type { DiningDay, DiningNow } from '@core/lib/dining';
import type { GymAlert, GymSpaceView } from '@core/lib/gym';

const TOKEN_KEY = 'aroundu.remote.token.v1'; // packages/core/src/api/remote 와 같은 키
const base = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function call<T>(path: string, body: unknown = {}): Promise<T> {
  if (apiMode !== 'remote') throw new Error('Live campus data needs the Lumi server.');
  let token: string | null = null;
  try { token = localStorage.getItem(TOKEN_KEY); } catch { /* private mode */ }
  let res: Response;
  try {
    res = await fetch(`${base}/api/${path}`, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  } catch { throw new Error('Network problem — try again in a moment.'); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Something went wrong.');
  return data as T;
}

export interface Favorite { key: string; name: string }
export interface DiningResponse {
  supported: boolean;
  today: string;
  nowMin?: number;
  date?: string;
  dates?: string[];
  day?: DiningDay | null;
  favorites: Favorite[];
  source?: { label: string; url: string; attribution: string };
  status?: 'ok' | 'unavailable';
}
export type GymAlertView = Omit<GymAlert, 'userId'>;
export interface GymResponse { supported: boolean; spaces: GymSpaceView[]; alerts: GymAlertView[]; source?: { label: string; url: string; attribution: string } }
export interface CampusNow {
  dining: (Partial<DiningNow> & { available: boolean; attribution: string }) | null;
  gym: { spaces: Pick<GymSpaceView, 'id' | 'name' | 'status' | 'percent' | 'updatedAt' | 'open' | 'hours'>[]; attribution: string } | null;
}

export const campusLive = {
  dining: (date?: string) => call<DiningResponse>('dining/day', date ? { date } : {}),
  favorite: (name: string, on: boolean) => call<{ favorites: Favorite[] }>('dining/favorite', { name, on }),
  gym: () => call<GymResponse>('gym/now'),
  setGymAlert: (a: { displayId: string; below: number; days: number[]; start: string; end: string; enabled: boolean }) => call<{ alerts: GymAlertView[] }>('gym/alert', a),
  removeGymAlert: (displayId: string) => call<{ alerts: GymAlertView[] }>('gym/alert/remove', { displayId }),
  now: () => call<CampusNow>('campus/now'),
};

/** "updated 3 min ago" */
export function agoLabel(iso: string | undefined, nowMs = Date.now()): string {
  if (!iso) return '';
  const m = Math.max(0, Math.round((nowMs - Date.parse(iso)) / 60_000));
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} hr ago` : `${Math.round(h / 24)} d ago`;
}
