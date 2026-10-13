/**
 * Rides engine — post, join, leave, close/reopen, edit, cancel.
 * Same contract as engine.ts: mutate ctx.db and return only what changed as a Patch.
 * Permission (caller = host / caller = rider) is checked by the server's RIDES_RULES first; this checks again.
 * Rules (school, blocks, verified email, seats) live in @core/lib/rides.
 */
import type { Patch } from './types';
import type { ChatRoom, ID, Notification, User } from '@core/types';
import type { EngineContext } from './engine';
import { uid } from '@core/lib/format';
import {
  blockedInRide, campusToday, cleanRideInput, destLabel, dayLabel, clock, fareText, isFull, isInRide, pickupLabel, rideEligibility, rideTeaser, schoolOf,
  validateRideInput, MAX_OPEN_RIDES, MAX_NOTE, RIDE_KIND_EMOJI, type Ride, type RideInput, type RideTeaser,
} from '@core/lib/rides';

/** A rule broken by the caller — the server answers 400 with this message */
export class RideError extends Error {}

export function createRidesEngine(ctx: EngineContext, opts: { today?: () => string } = {}) {
  const db = () => ctx.db;
  const rides = (): Ride[] => (db().rides ??= []);
  const now = () => new Date().toISOString();
  const today = () => opts.today?.() ?? campusToday();
  const fail = (msg: string): never => { throw new RideError(msg); };

  const user = (id: ID): User => db().users.find((u) => u.id === id) ?? fail('Sign in to use rides.');
  const ride = (id: ID): Ride => rides().find((r) => r.id === id) ?? fail('This ride is no longer available.');
  const first = (u?: User) => (u?.nickname ?? 'Someone').trim().split(/\s+/)[0];
  const sync = (r: Ride) => { r.memberCount = r.memberIds.length; r.updatedAt = now(); };

  function notify(userId: ID, n: Omit<Notification, 'id' | 'userId' | 'read' | 'createdAt'>): Notification {
    const nt: Notification = { id: uid('nt'), userId, read: false, createdAt: now(), ...n };
    db().notifications.unshift(nt);
    return nt;
  }
  const say = (room: ChatRoom, senderId: ID, text: string) => room.messages.push({ id: uid('m'), senderId, text, createdAt: now(), system: true });
  const roomTitle = (r: Ride) => `${RIDE_KIND_EMOJI[r.kind]} ${destLabel(r)} · ${dayLabel(r.date)} ${clock(r.start)}`;

  /** The ride's group chat — reuses the app's group chat rooms. Opens with the first rider */
  function ensureRoom(r: Ride): ChatRoom {
    let room = r.roomId ? db().chatRooms.find((c) => c.id === r.roomId) : undefined;
    if (!room) {
      room = { id: uid('cr'), type: 'activity', rideId: r.id, memberIds: [r.hostId], title: roomTitle(r), messages: [], lastReadAt: {}, createdAt: now() };
      say(room, r.hostId, `Ride chat opened. Meet at ${pickupLabel(r)} — a public spot. ${fareText(r)}. Settle the split here before you go.`);
      db().chatRooms.push(room);
      r.roomId = room.id;
    }
    return room;
  }

  function mustBeEligible(u: User) {
    const e = rideEligibility(u);
    if (!e.ok) fail(e.reason!);
  }

  const api = {
    create(hostId: ID, input: RideInput): { ride: Ride; patch: Patch } {
      const host = user(hostId);
      mustBeEligible(host);
      const schoolId = schoolOf(host);
      const problem = validateRideInput(input, schoolId, today());
      if (problem) fail(problem);
      const open = rides().filter((r) => r.hostId === hostId && r.status !== 'cancelled' && r.date >= today()).length;
      if (open >= MAX_OPEN_RIDES) fail(`You already have ${MAX_OPEN_RIDES} upcoming rides — cancel one first.`);
      const clean = cleanRideInput(input);
      const r: Ride = { id: uid('rd'), schoolId, hostId, ...clean, memberIds: [], memberCount: 0, status: 'open', createdAt: now(), updatedAt: now() };
      if (host.sample) r.sample = true;
      rides().push(r);
      return { ride: r, patch: { rides: [r] } };
    },

    join(rideId: ID, userId: ID): { ride: Ride; roomId: ID; patch: Patch } {
      const r = ride(rideId);
      const me = user(userId);
      if (isInRide(r, userId)) {
        if (r.hostId === userId) fail('This is your ride.');
        return { ride: r, roomId: r.roomId!, patch: {} };
      }
      mustBeEligible(me);
      if (schoolOf(me) !== r.schoolId) fail('Rides are only shared with students from the same school.');
      if (r.status === 'cancelled') fail('This ride was cancelled.');
      if (r.status === 'closed') fail('The host closed this ride to new riders.');
      if (r.date < today()) fail('This ride has already left.');
      if (blockedInRide(db(), r, userId)) fail('This ride is no longer available.');
      if (isFull(r)) fail('This ride is full.');
      r.memberIds.push(userId);
      sync(r);
      const room = ensureRoom(r);
      if (!room.memberIds.includes(userId)) room.memberIds.push(userId);
      say(room, userId, `${first(me)} joined the ride.`);
      const nt = notify(r.hostId, { type: 'participation_request', title: `${first(me)} joined your ride`, body: `${destLabel(r)} · ${dayLabel(r.date)} ${clock(r.start)} — say hi in the ride chat.`, link: `/rides/${r.id}` });
      return { ride: r, roomId: room.id, patch: { rides: [r], chatRooms: [room], notifications: [nt] } };
    },

    leave(rideId: ID, userId: ID): Patch {
      const r = ride(rideId);
      if (r.hostId === userId) fail('You are the host — cancel the ride instead.');
      if (!r.memberIds.includes(userId)) return {};
      r.memberIds = r.memberIds.filter((id) => id !== userId);
      sync(r);
      const patch: Patch = { rides: [r] };
      const room = r.roomId ? db().chatRooms.find((c) => c.id === r.roomId) : undefined;
      if (room) {
        room.memberIds = room.memberIds.filter((id) => id !== userId);
        say(room, userId, `${first(db().users.find((u) => u.id === userId))} left the ride.`);
        patch.chatRooms = [room];
      }
      if (r.status !== 'cancelled') patch.notifications = [notify(r.hostId, { type: 'participation_request', title: `${first(db().users.find((u) => u.id === userId))} left your ride`, body: `${destLabel(r)} · ${dayLabel(r.date)} — a seat opened up.`, link: `/rides/${r.id}` })];
      return patch;
    },

    /** Stop new riders (people already in stay) */
    close(rideId: ID, hostId: ID): Patch {
      const r = ride(rideId);
      if (r.hostId !== hostId) fail('Only the host can do that.');
      if (r.status === 'open') { r.status = 'closed'; sync(r); }
      return { rides: [r] };
    },

    reopen(rideId: ID, hostId: ID): Patch {
      const r = ride(rideId);
      if (r.hostId !== hostId) fail('Only the host can do that.');
      if (r.status === 'cancelled') fail('This ride was cancelled — post a new one.');
      if (r.status === 'closed') { r.status = 'open'; sync(r); }
      return { rides: [r] };
    },

    cancel(rideId: ID, hostId: ID): Patch {
      const r = ride(rideId);
      if (r.hostId !== hostId) fail('Only the host can do that.');
      if (r.status === 'cancelled') return { rides: [r] };
      r.status = 'cancelled';
      sync(r);
      const patch: Patch = { rides: [r] };
      const room = r.roomId ? db().chatRooms.find((c) => c.id === r.roomId) : undefined;
      if (room) { say(room, hostId, `${first(db().users.find((u) => u.id === hostId))} cancelled this ride.`); patch.chatRooms = [room]; }
      patch.notifications = r.memberIds.map((id) => notify(id, { type: 'activity_reminder', title: 'A ride you joined was cancelled', body: `${destLabel(r)} · ${dayLabel(r.date)} ${clock(r.start)} — look for another ride going the same way.`, link: `/rides?to=${encodeURIComponent(r.to)}` }));
      return patch;
    },

    /** Host edits: seats (not below riders already in), estimate, note, time window */
    update(rideId: ID, hostId: ID, changes: Partial<Pick<RideInput, 'seats' | 'estTotal' | 'note' | 'start' | 'end'>>): Patch {
      const r = ride(rideId);
      if (r.hostId !== hostId) fail('Only the host can do that.');
      if (r.status === 'cancelled') fail('This ride was cancelled.');
      const next: RideInput = { kind: r.kind, from: r.from, to: r.to, toCustom: r.toCustom, date: r.date, start: r.start, end: r.end, seats: r.seats, estTotal: r.estTotal, note: r.note };
      if (changes.seats !== undefined) next.seats = Number(changes.seats);
      if ('estTotal' in changes) next.estTotal = changes.estTotal || undefined;
      if (changes.note !== undefined) next.note = String(changes.note).slice(0, MAX_NOTE + 1);
      if (changes.start !== undefined) next.start = changes.start;
      if (changes.end !== undefined) next.end = changes.end;
      // the date may be today already — validate against the ride's own date so editing a same-day ride works
      const problem = validateRideInput(next, r.schoolId, r.date < today() ? r.date : today());
      if (problem) fail(problem);
      if (r.kind !== 'looking' && next.seats < r.memberCount) fail(`${r.memberCount} people already joined — seats can't go below that.`);
      const clean = cleanRideInput(next);
      r.seats = clean.seats; r.start = clean.start; r.end = clean.end;
      if (clean.estTotal) r.estTotal = clean.estTotal; else delete r.estTotal;
      if (clean.note) r.note = clean.note; else delete r.note;
      sync(r);
      const patch: Patch = { rides: [r] };
      const room = r.roomId ? db().chatRooms.find((c) => c.id === r.roomId) : undefined;
      if (room && (changes.start !== undefined || changes.end !== undefined)) { room.title = roomTitle(r); say(room, hostId, `Time updated: ${clock(r.start)}–${clock(r.end)}.`); patch.chatRooms = [room]; }
      return patch;
    },

    /** Signed-out preview of /r/<id> — null when the ride doesn't exist or was cancelled */
    teaser(rideId: ID): RideTeaser | null {
      const r = rides().find((x) => x.id === rideId);
      if (!r || r.status === 'cancelled') return null;
      const school = db().schools.find((s) => s.id === r.schoolId);
      return rideTeaser(r, db().users.find((u) => u.id === r.hostId), school?.name ?? '');
    },
  };
  return api;
}

export type RidesEngine = ReturnType<typeof createRidesEngine>;
