import { api } from '@core/api';
import { appVersionLabel, askForPush, native, pushStatus, pushToken, type PushStatus } from '@/lib/native';

/**
 * This iPhone's push token ↔ the signed-in account (server/push.ts).
 * The token is remembered so sign-out can unregister it (the server call needs no session).
 */
const KEY = 'lumi.push.token';
/** fired after the permission changed here (soft prompt ↔ Settings row stay in sync) */
export const PUSH_CHANGED = 'lumi:push-changed';
const remember = (t: string | null) => { try { if (t) localStorage.setItem(KEY, t); else localStorage.removeItem(KEY); } catch { /* */ } };
const remembered = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

async function register(token: string) {
  const n = native();
  await api.push.register(token, { platform: n?.platform ?? 'ios', appVersion: appVersionLabel() });
  remember(token);
}

/** Signed in and already allowed → make sure the server has this device (token can change after reinstall/restore) */
export async function syncPushToken() {
  if ((await pushStatus()).status !== 'granted') return;
  const token = await pushToken();
  if (token) await register(token);
}

/** Signed out → this phone stops getting the previous account's pushes */
export async function forgetPushToken() {
  const token = remembered();
  if (!token) return;
  remember(null);
  await api.push.unregister(token).catch(() => {});
}

/** The iOS prompt (once per install) → register. Returns the final status. */
export async function turnOnPush(): Promise<PushStatus> {
  const r = await askForPush();
  if (r.status === 'granted' && r.token) await register(r.token);
  window.dispatchEvent(new Event(PUSH_CHANGED));
  return r.status;
}

// ─── soft prompt: when to offer it ─────────────────────────────────────────
const ASKED_KEY = 'lumi.push.offered';
const AGAIN_AFTER_DAYS = 7;
const MAX_OFFERS = 3;
type Offered = { at: string; n: number };
const offered = (): Offered | null => { try { return JSON.parse(localStorage.getItem(ASKED_KEY) ?? 'null') as Offered | null; } catch { return null; } };

/** Not at first launch: only after the person did something, never more than 3 times, a week apart */
export async function shouldOfferPush(): Promise<boolean> {
  const o = offered();
  if (o && (o.n >= MAX_OFFERS || Date.now() - Date.parse(o.at) < AGAIN_AFTER_DAYS * 86400000)) return false;
  return (await pushStatus()).status === 'undetermined';
}
export function markPushOffered() {
  const o = offered();
  try { localStorage.setItem(ASKED_KEY, JSON.stringify({ at: new Date().toISOString(), n: (o?.n ?? 0) + 1 })); } catch { /* */ }
}
