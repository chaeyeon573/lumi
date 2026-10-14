/**
 * Chat message push for the iPhone app — 1:1 rooms, meetup/group rooms, ride chats and study-group chats
 * (they are all ChatRooms written by engine chats.send). Driven by server/push.ts onPatch (the one hook in
 * broadcast()); push.ts turns each ChatPush into one Expo message per device of the recipient.
 *
 * Who gets a push for a new message
 *   - every room member except the sender, who
 *   - can get pushes at all (push.ts canReceive: has a device token, not suspended, not a sample/demo account,
 *     Settings → Notifications not off),
 *   - is not in a block with the sender (either direction),
 *   - can see that message (server/moderation.ts — suspended sender, room of a suspended host → no),
 *   - has not read it already (room.lastReadAt) and is not looking at that room right now (setViewing below).
 *   Messages from sample profiles and rooms of sample meetups/rides never push (only demo accounts see those, and
 *   demo accounts never get push). System lines ("Lily joined", ride updates) don't push — those already create
 *   in-app notifications where they matter.
 *
 * What it looks like
 *   1:1     title "Lily"                    body "are you still coming?"
 *   group   title "<room / meetup title>"   body "Lily: are you still coming?"
 *   tap → /chats/<roomId>. threadId groups a room's pushes in Notification Center; collapseId makes a newer push
 *   for the same room replace the older one on the phone.
 *
 * Rate limit (per recipient per room): the first message pushes at once; anything else in the next WINDOW_MS is
 * held, then ONE summary goes out ("3 new messages" + the latest line) — only if still unread and not being viewed.
 *
 * Viewing: the open chat screen reports POST /api/chats/viewing { roomId } on open, every ~15 s while visible, and
 * { roomId: null } when it closes or the app goes to the background. An entry lives VIEWING_TTL_MS, so a phone that
 * went to sleep without saying so is back to getting pushes within that time.
 */
import type { Patch, Snapshot } from '@core/api/types';
import type { ChatMessage, ChatRoom, ID, User } from '@core/types';
import { isBlocked } from '@core/lib/relations';
import { moderateView } from './moderation';
import { SAMPLE_ORG_IDS } from './samples';

export const CHAT_WINDOW_MS = 30_000;
export const VIEWING_TTL_MS = 40_000;
/** characters of the message shown on the lock screen */
export const PREVIEW_CHARS = 100;
/** a room this server has not seen before (created after start-up): only messages this recent are "new" */
const NEW_ROOM_FRESH_MS = 2 * 60 * 1000;
/** apns-collapse-id is limited to 64 bytes */
const collapseKey = (roomId: ID) => `chat-${roomId}`.slice(0, 64);

export interface ChatPush {
  userId: ID;
  roomId: ID;
  title: string;
  body: string;
  path: string;
  threadId: string;
  collapseId: string;
  /** true = the "N new messages" summary after the rate-limit window */
  summary: boolean;
}

type Timer = unknown;
export interface ChatPushDeps {
  db: () => Snapshot;
  /** can this person get any push right now (device token, not suspended/sample/demo, notifications on) */
  canReceive: (u: User) => boolean;
  /** summaries are sent later, from a timer — push.ts sends them like any other message */
  deliver: (pushes: ChatPush[]) => Promise<unknown>;
  now?: () => number;
  windowMs?: number;
  setTimer?: (fn: () => Promise<unknown>, ms: number) => Timer;
  clearTimer?: (t: Timer) => void;
}

export const firstName = (u?: Pick<User, 'nickname'>) => (u?.nickname ?? '').trim().split(/\s+/)[0] || 'Someone';
export function preview(text: string, max = PREVIEW_CHARS) {
  const one = text.replace(/\s+/g, ' ').trim();
  return one.length > max ? `${one.slice(0, max - 1).trimEnd()}…` : one;
}

export function createChatPush(deps: ChatPushDeps) {
  const now = deps.now ?? Date.now;
  const windowMs = deps.windowMs ?? CHAT_WINDOW_MS;
  const setTimer = deps.setTimer ?? ((fn, ms) => { const h = setTimeout(() => { void fn(); }, ms); h.unref?.(); return h; });
  const clearTimer = deps.clearTimer ?? ((h) => clearTimeout(h as ReturnType<typeof setTimeout>));

  /** per room: newest message time already handled + the ids at exactly that time (two messages in one ms) */
  const marks = new Map<ID, { at: string; ids: Set<ID> }>();
  /** `${userId}|${roomId}` → last push time, messages held back since, pending summary timer */
  const slots = new Map<string, { lastAt: number; held: number; timer?: Timer }>();
  /** userId → client → room being viewed */
  const viewing = new Map<ID, Map<string, { roomId: ID; until: number }>>();

  function markRoom(room: ChatRoom) {
    let at = '';
    for (const m of room.messages) if (m.createdAt > at) at = m.createdAt;
    marks.set(room.id, { at, ids: new Set(room.messages.filter((m) => m.createdAt === at).map((m) => m.id)) });
  }

  function load() { for (const r of deps.db().chatRooms ?? []) markRoom(r); }

  /** messages in this room the server has not handled yet (and remembers them as handled) */
  function newMessages(room: ChatRoom): ChatMessage[] {
    const mark = marks.get(room.id);
    const t0 = now();
    const fresh = room.messages.filter((m) => (mark ? m.createdAt > mark.at || (m.createdAt === mark.at && !mark.ids.has(m.id)) : t0 - Date.parse(m.createdAt) < NEW_ROOM_FRESH_MS));
    markRoom(room);
    return fresh.filter((m) => !m.system).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  // ─── viewing ────────────────────────────────────────────────────────────
  function setViewing(userId: ID, client: string, roomId: ID | null) {
    const mine = viewing.get(userId) ?? new Map<string, { roomId: ID; until: number }>();
    if (roomId) mine.set(client, { roomId, until: now() + VIEWING_TTL_MS }); else mine.delete(client);
    if (mine.size) viewing.set(userId, mine); else viewing.delete(userId);
  }
  function isViewing(userId: ID, roomId: ID) {
    const mine = viewing.get(userId);
    if (!mine) return false;
    const t0 = now();
    for (const [client, v] of mine) {
      if (v.until <= t0) { mine.delete(client); continue; }
      if (v.roomId === roomId) return true;
    }
    if (!mine.size) viewing.delete(userId);
    return false;
  }

  // ─── who may get it ─────────────────────────────────────────────────────
  /** rooms of demo content — only demo accounts are in them, and they never get push */
  function sampleRoom(db: Snapshot, room: ChatRoom) {
    if (room.activityId && db.activities.find((a) => a.id === room.activityId)?.sample) return true;
    if (room.rideId && (db.rides ?? []).find((r) => r.id === room.rideId)?.sample) return true;
    return !!room.orgId && SAMPLE_ORG_IDS.has(room.orgId);
  }
  const readAt = (room: ChatRoom, userId: ID) => room.lastReadAt[userId] ?? '';

  /** this recipient can see message m in this room right now (blocks, moderation, sample senders) */
  function visibleTo(db: Snapshot, room: ChatRoom, m: ChatMessage, userId: ID) {
    if (m.system || m.senderId === userId) return false;
    const sender = db.users.find((u) => u.id === m.senderId);
    if (!sender || sender.sample || sender.suspended) return false;
    if (isBlocked(db, userId, sender.id)) return false;
    const seen = moderateView({ chatRooms: [room] }, userId, db).chatRooms?.[0];
    return !!seen && seen.messages.some((x) => x.id === m.id);
  }

  /** the recipient side — can get push, still in the room, not looking at it */
  function recipient(db: Snapshot, room: ChatRoom, userId: ID): User | undefined {
    if (!room.memberIds.includes(userId)) return undefined;
    const u = db.users.find((x) => x.id === userId);
    if (!u || u.sample || u.suspended || !deps.canReceive(u)) return undefined;
    if (isViewing(userId, room.id)) return undefined;
    return u;
  }

  // ─── what it says ───────────────────────────────────────────────────────
  function roomTitle(db: Snapshot, room: ChatRoom) {
    if (room.title) return room.title;
    if (room.activityId) { const a = db.activities.find((x) => x.id === room.activityId); if (a) return a.title; }
    if (room.orgId) { const o = db.organizations.find((x) => x.id === room.orgId); if (o) return o.name; }
    return 'Group chat';
  }
  function compose(db: Snapshot, room: ChatRoom, userId: ID, latest: ChatMessage, count: number): ChatPush {
    const name = firstName(db.users.find((u) => u.id === latest.senderId));
    const direct = room.type === 'direct';
    const line = direct ? preview(latest.text) : `${name}: ${preview(latest.text)}`;
    return {
      userId, roomId: room.id,
      title: direct ? name : preview(roomTitle(db, room), 60),
      body: count > 1 ? `${count} new messages\n${line}` : line,
      path: `/chats/${room.id}`, threadId: collapseKey(room.id), collapseId: collapseKey(room.id), summary: count > 1,
    };
  }

  // ─── rate limit ─────────────────────────────────────────────────────────
  async function flush(key: string, userId: ID, roomId: ID) {
    const slot = slots.get(key);
    if (!slot) return;
    slot.timer = undefined;
    if (!slot.held) return;
    slot.held = 0;
    const db = deps.db();
    const room = db.chatRooms.find((r) => r.id === roomId);
    if (!room || !recipient(db, room, userId)) return;
    const unread = room.messages.filter((m) => m.createdAt > readAt(room, userId) && visibleTo(db, room, m, userId));
    if (!unread.length) return;
    slot.lastAt = now();
    await deps.deliver([compose(db, room, userId, unread[unread.length - 1], unread.length)]);
  }

  /** New chat messages in this patch → pushes to send now (summaries are scheduled and delivered later) */
  function onPatch(patch: Patch): ChatPush[] {
    for (const id of patch.removed?.chatRooms ?? []) marks.delete(id);
    if (!patch.chatRooms?.length) return [];
    const db = deps.db();
    if (!db.chatRooms || !db.users) return [];
    const out: ChatPush[] = [];
    for (const room of patch.chatRooms) {
      const fresh = newMessages(room);
      if (!fresh.length || sampleRoom(db, room)) continue;
      for (const userId of room.memberIds) {
        const mine = fresh.filter((m) => m.createdAt > readAt(room, userId) && visibleTo(db, room, m, userId));
        if (!mine.length || !recipient(db, room, userId)) continue;
        const key = `${userId}|${room.id}`;
        const t0 = now();
        const slot = slots.get(key);
        if (!slot || t0 - slot.lastAt >= windowMs) {
          // first one now; more in the same patch wait for the summary
          out.push(compose(db, room, userId, mine[0], 1));
          const next = { lastAt: t0, held: mine.length - 1, timer: slot?.timer };
          slots.set(key, next);
          if (next.held && !next.timer) next.timer = setTimer(() => flush(key, userId, room.id), windowMs);
        } else {
          slot.held += mine.length;
          if (!slot.timer) slot.timer = setTimer(() => flush(key, userId, room.id), Math.max(0, slot.lastAt + windowMs - t0));
        }
      }
    }
    if (slots.size > 5000) for (const [k, s] of slots) if (!s.timer && now() - s.lastAt > windowMs) slots.delete(k);
    return out;
  }

  /** account deletion */
  function forgetUser(userId: ID) {
    viewing.delete(userId);
    for (const [k, s] of slots) if (k.startsWith(`${userId}|`)) { if (s.timer) clearTimer(s.timer); slots.delete(k); }
  }

  return { load, onPatch, setViewing, isViewing, forgetUser, pendingSummaries: () => [...slots.values()].filter((s) => s.timer).length };
}
export type ChatPushService = ReturnType<typeof createChatPush>;
