/**
 * Push notifications for the iPhone app (apps/shell) — Expo Push API.
 *
 *   POST /api/push/register     { token, platform, appVersion }   signed in   → { ok, registered }
 *   POST /api/push/unregister   { token }                         no sign-in needed (holding the token is the proof) → { ok }
 *   POST /api/chats/viewing     { roomId | null }                 signed in — the chat screen that is open (no push for it)
 *
 * Storage (store docs)
 *   pushTokens   pt_<sha256(token)[:32]>   { userId, token, platform, appVersion, createdAt, updatedAt }
 *                One device = one doc: signing in as someone else on the same phone moves the token to them.
 *
 * When does a push go out?
 *   Every Patch the server broadcasts passes through onPatch(). A notification id it has not seen before (unread,
 *   created in the last 15 minutes) is new → one push per device of that user, unless the user turned
 *   Settings → Notifications off (user.settings.notifications === false). Shared demo / sample accounts never
 *   get tokens (several testers sign into the same one).
 *   Suspended accounts never get a push and can't register a token (their sessions don't resolve either).
 *   New chat messages push too — server/chat-push.ts (sender first name + preview, one per room per 30 s then a
 *   summary, never to the sender, blocked pairs, suspended or sample accounts, or someone looking at that room).
 *   Sent in batches of 100. A ticket or receipt saying DeviceNotRegistered drops that token.
 *   Tokens are never logged in full (mask()).
 *
 * Env: EXPO_ACCESS_TOKEN (only if "enhanced push security" is turned on for the Expo project), PUSH_DISABLED=1 to stop sending.
 */
import { createHash } from 'node:crypto';
import type { Express, Request, Response, NextFunction } from 'express';
import type { Patch, Snapshot } from '@core/api/types';
import type { ID, Notification, User } from '@core/types';
import type { Store } from './store';
import { createChatPush, type ChatPush, type ChatPushDeps } from './chat-push';

export const PUSH_TOKENS = 'pushTokens';
export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
export const EXPO_RECEIPTS_URL = 'https://exp.host/--/api/v2/push/getReceipts';
const BATCH = 100;
const FRESH_MS = 15 * 60 * 1000;
const RECEIPT_DELAY_MS = 15 * 60 * 1000;
const MAX_TOKENS_PER_USER = 10;

export interface PushTokenDoc { id: string; userId: ID; token: string; platform: 'ios' | 'android'; appVersion?: string; createdAt: string; updatedAt: string }
export interface ExpoMessage {
  to: string; title: string; body: string; sound: 'default';
  data: { path: string; notificationId?: ID; roomId?: ID };
  channelId?: string;
  /** iOS: groups notifications in Notification Center (aps.thread-id) */
  threadId?: string;
  /** replaces an earlier push with the same id on the phone (apns-collapse-id) */
  collapseId?: string;
}
type Ticket = { status: 'ok'; id: string } | { status: 'error'; message?: string; details?: { error?: string } };

export const isExpoPushToken = (t: unknown): t is string => typeof t === 'string' && t.length <= 200 && /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{8,}\]$/.test(t);
/** "ExponentPushToken[abcd…]" — enough to tell devices apart in logs, not enough to send to */
export const mask = (t: string) => { const m = /^(\w+)\[(.*)\]$/.exec(t); return m ? `${m[1]}[${m[2].slice(0, 4)}…]` : `${t.slice(0, 6)}…`; };
export const tokenDocId = (t: string) => `pt_${createHash('sha256').update(t).digest('hex').slice(0, 32)}`;
/** Where a tap on the push opens — only in-app paths */
export const pushPath = (link?: string) => (link && link.startsWith('/') && !link.startsWith('//') ? link : '/notifications');

export interface PushDeps {
  store: Store;
  db: () => Snapshot;
  /** false = never store a token for / push to this user (shared demo account, sample profiles). Suspended and
   *  sample accounts are refused here even without it. */
  allow?: (userId: ID) => boolean;
  /** chat push rate limit window and timers (tests) — server/chat-push.ts */
  chat?: Pick<ChatPushDeps, 'windowMs' | 'setTimer' | 'clearTimer'>;
  fetch?: typeof fetch;
  now?: () => number;
  accessToken?: string;
  disabled?: boolean;
  log?: (msg: string) => void;
}

export function createPush(deps: PushDeps) {
  const http = deps.fetch ?? fetch;
  const now = deps.now ?? Date.now;
  const log = deps.log ?? ((m: string) => console.log(`[push] ${m}`));
  const tokens = new Map<string, PushTokenDoc>();
  /** notification ids already present — a push goes out only for ids we have not seen */
  const seen = new Set<ID>();
  /** ticket id → token doc id, checked for receipts after RECEIPT_DELAY_MS */
  const pendingReceipts = new Map<string, { docId: string; at: number }>();

  const of = (userId: ID) => [...tokens.values()].filter((d) => d.userId === userId);
  const userOf = (userId: ID) => deps.db().users.find((u) => u.id === userId);
  /** may this account have push at all — not suspended, not a sample/demo profile, not refused by allow() */
  const allowed = (userId: ID, u = userOf(userId)) => !u?.suspended && !u?.sample && (deps.allow ? deps.allow(userId) : true);
  /** may a push go to this person now */
  const canReceive = (u: User) => allowed(u.id, u) && u.settings?.notifications !== false && of(u.id).length > 0;

  const chat = createChatPush({
    db: deps.db, now, canReceive, ...deps.chat,
    deliver: (pushes) => (deps.disabled ? Promise.resolve() : send(pushes.flatMap(chatMessages)).catch((e) => log(`chat summary failed: ${(e as Error).message}`))),
  });

  async function load() {
    for (const d of await deps.store.listDocs<PushTokenDoc>(PUSH_TOKENS)) tokens.set(d.id, d);
    for (const n of deps.db().notifications) seen.add(n.id);
    chat.load();
  }

  async function register(userId: ID, token: unknown, platform: unknown, appVersion: unknown): Promise<{ ok: boolean; registered: boolean; reason?: string }> {
    if (!isExpoPushToken(token)) return { ok: false, registered: false, reason: 'invalid token' };
    const u = userOf(userId);
    if (u?.suspended) return { ok: true, registered: false, reason: 'suspended' };
    if (!allowed(userId, u)) return { ok: true, registered: false, reason: 'shared account' };
    const id = tokenDocId(token);
    const at = new Date(now()).toISOString();
    const prev = tokens.get(id);
    const doc: PushTokenDoc = {
      id, userId, token, platform: platform === 'android' ? 'android' : 'ios',
      appVersion: typeof appVersion === 'string' ? appVersion.slice(0, 40) : undefined,
      createdAt: prev && prev.userId === userId ? prev.createdAt : at, updatedAt: at,
    };
    tokens.set(id, doc);
    await deps.store.putDocs(PUSH_TOKENS, [doc]);
    // a person with many reinstalls — keep the newest few
    const extra = of(userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(MAX_TOKENS_PER_USER).map((d) => d.id);
    if (extra.length) await drop(extra, 'over limit');
    if (!prev || prev.userId !== userId) log(`registered ${mask(token)} for ${userId}`);
    return { ok: true, registered: true };
  }

  async function unregister(token: unknown) {
    if (typeof token !== 'string') return { ok: true };
    const id = tokenDocId(token);
    if (tokens.has(id)) await drop([id], 'unregistered');
    return { ok: true };
  }

  async function drop(ids: string[], why: string) {
    const gone = ids.filter((id) => tokens.has(id));
    if (!gone.length) return;
    for (const id of gone) { log(`dropped ${mask(tokens.get(id)!.token)} (${why})`); tokens.delete(id); }
    await deps.store.removeDocs(PUSH_TOKENS, gone);
  }

  /** Account deletion — every device token of this person */
  async function forgetUser(userId: ID) {
    const ids = of(userId).map((d) => d.id);
    ids.forEach((id) => tokens.delete(id));
    chat.forgetUser(userId);
    await deps.store.removeDocs(PUSH_TOKENS, ids);
    return { pushTokens: ids.length };
  }

  /** New notifications in this patch → messages (one per device) */
  function messagesFor(patch: Patch): ExpoMessage[] {
    const out: ExpoMessage[] = [];
    const db = deps.db();
    for (const n of patch.notifications ?? []) {
      if (seen.has(n.id)) continue;
      seen.add(n.id);
      if (n.read || now() - Date.parse(n.createdAt) > FRESH_MS) continue;
      const user = db.users.find((u) => u.id === n.userId);
      if (!user || !canReceive(user)) continue;
      for (const d of of(n.userId)) out.push(message(d, n));
    }
    return out;
  }

  const message = (d: PushTokenDoc, n: Notification): ExpoMessage => ({
    to: d.token, title: n.title.slice(0, 120), body: n.body.slice(0, 300), sound: 'default',
    data: { path: pushPath(n.link), notificationId: n.id },
  });
  /** one chat push → one message per device of the recipient */
  const chatMessages = (c: ChatPush): ExpoMessage[] => of(c.userId).map((d) => ({
    to: d.token, title: c.title.slice(0, 120), body: c.body.slice(0, 300), sound: 'default',
    data: { path: pushPath(c.path), roomId: c.roomId }, threadId: c.threadId, collapseId: c.collapseId,
  }));

  const headers = () => ({ 'content-type': 'application/json', accept: 'application/json', ...(deps.accessToken ? { authorization: `Bearer ${deps.accessToken}` } : {}) });

  async function send(messages: ExpoMessage[]) {
    let sent = 0; const dead: string[] = [];
    for (let i = 0; i < messages.length; i += BATCH) {
      const chunk = messages.slice(i, i + BATCH);
      try {
        const res = await http(EXPO_PUSH_URL, { method: 'POST', headers: headers(), body: JSON.stringify(chunk) });
        const json = await res.json().catch(() => ({})) as { data?: Ticket[]; errors?: unknown[] };
        if (!res.ok || !Array.isArray(json.data)) { log(`send failed: HTTP ${res.status}${json.errors ? ` ${JSON.stringify(json.errors).slice(0, 200)}` : ''}`); continue; }
        json.data.forEach((t, k) => {
          const docId = tokenDocId(chunk[k].to);
          if (t.status === 'ok') { sent++; pendingReceipts.set(t.id, { docId, at: now() }); }
          else if (t.details?.error === 'DeviceNotRegistered') dead.push(docId);
          else log(`ticket error for ${mask(chunk[k].to)}: ${t.details?.error ?? t.message ?? 'unknown'}`);
        });
      } catch (e) { log(`send failed: ${(e as Error).message}`); }
    }
    if (dead.length) await drop(dead, 'DeviceNotRegistered');
    return { sent, dropped: dead.length };
  }

  /** Receipts (Apple's answer) arrive later — a DeviceNotRegistered there also drops the token */
  async function checkReceipts(force = false) {
    const due = [...pendingReceipts].filter(([, v]) => force || now() - v.at >= RECEIPT_DELAY_MS);
    const dead: string[] = [];
    for (let i = 0; i < due.length; i += 300) {
      const chunk = due.slice(i, i + 300);
      try {
        const res = await http(EXPO_RECEIPTS_URL, { method: 'POST', headers: headers(), body: JSON.stringify({ ids: chunk.map(([id]) => id) }) });
        const json = await res.json().catch(() => ({})) as { data?: Record<string, Ticket> };
        if (!res.ok || !json.data) continue;
        for (const [id, v] of chunk) {
          pendingReceipts.delete(id);
          const r = json.data[id];
          if (r?.status === 'error' && r.details?.error === 'DeviceNotRegistered') dead.push(v.docId);
          else if (r?.status === 'error') log(`receipt error: ${r.details?.error ?? r.message ?? 'unknown'}`);
        }
      } catch (e) { log(`receipts failed: ${(e as Error).message}`); }
    }
    // tickets older than a day without a receipt — Expo keeps receipts ~24h
    for (const [id, v] of pendingReceipts) if (now() - v.at > 86400000) pendingReceipts.delete(id);
    if (dead.length) await drop([...new Set(dead)], 'DeviceNotRegistered (receipt)');
    return { checked: due.length, dropped: dead.length };
  }

  /** Called for every broadcast Patch. Never throws, never blocks the caller. */
  function onPatch(patch: Patch): Promise<{ sent: number; dropped: number }> {
    if (!patch.notifications?.length && !patch.chatRooms?.length && !patch.removed?.chatRooms?.length) return Promise.resolve({ sent: 0, dropped: 0 });
    let messages: ExpoMessage[];
    try { messages = [...messagesFor(patch), ...chat.onPatch(patch).flatMap(chatMessages)]; } catch (e) { log(`failed: ${(e as Error).message}`); return Promise.resolve({ sent: 0, dropped: 0 }); }
    if (!messages.length || deps.disabled) return Promise.resolve({ sent: 0, dropped: 0 });
    return send(messages).catch((e) => { log(`failed: ${(e as Error).message}`); return { sent: 0, dropped: 0 }; });
  }

  return {
    load, register, unregister, forgetUser, onPatch, checkReceipts, tokensOf: of, count: () => tokens.size,
    /** the chat screen this client has open (no push for that room while it is) */
    setViewing: chat.setViewing, isViewing: chat.isViewing,
  };
}
export type PushService = ReturnType<typeof createPush>;

type Req = Request & { userId?: ID };
export function registerPushRoutes(app: Express, push: PushService, deps: { auth: (req: Req, res: Response, next: NextFunction) => unknown }) {
  app.post('/api/push/register', deps.auth, async (req: Req, res: Response) => {
    if (!req.userId) { res.status(401).json({ error: 'Please sign in first.' }); return; }
    try {
      const r = await push.register(req.userId, req.body?.token, req.body?.platform, req.body?.appVersion);
      res.status(r.ok ? 200 : 400).json(r.ok ? r : { error: r.reason });
    } catch (e) { console.error('[push] register failed', (e as Error).message); res.status(500).json({ error: 'Could not turn on notifications — try again.' }); }
  });
  app.post('/api/push/unregister', async (req: Request, res: Response) => {
    try { res.json(await push.unregister(req.body?.token)); } catch (e) { console.error('[push] unregister failed', (e as Error).message); res.status(500).json({ error: 'error' }); }
  });
  // which chat room this client has open — one entry per session token, so a laptop and a phone don't overwrite each other
  app.post('/api/chats/viewing', deps.auth, (req: Req, res: Response) => {
    if (!req.userId) { res.status(401).json({ error: 'Please sign in first.' }); return; }
    const roomId = typeof req.body?.roomId === 'string' && req.body.roomId.length <= 100 ? req.body.roomId : null;
    const header = req.headers.authorization ?? '';
    push.setViewing(req.userId, createHash('sha256').update(header).digest('hex').slice(0, 16), roomId);
    res.json({ ok: true });
  });
}
