/**
 * Rides — posting validation, join/leave seat counting, matching window, blocks, per-viewer filtering,
 * the signed-out teaser and the RPC permission table.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Snapshot } from '@core/api/types';
import type { User } from '@core/types';
import * as seed from '@core/data/seed.en';
import { t } from '@core/i18n';
import { createRidesEngine, RideError } from '@core/api/rides';
import { rideEligibility,
  bannerSeason, fareText, matchRides, rideSeasons, rideTitle, ridesMatch, seatsLeft, upcomingSeason, validateRideInput, type Ride, type RideInput,
  rideLeft,
} from '@core/lib/rides';
import { snapshotFor, patchFor } from './view';
import { ensureSampleRides, rideMeta, ridesRules, ruleAllows, withRideMeta } from './rides';

const TODAY = '2026-10-13';
const ME = 'u_me';        // Alex — Berkeley, verified
const MAYA = 'u_jimin';   // Berkeley
const LILY = 'u_sua';     // Berkeley
const EMMA = 'u_yuna';    // Berkeley
const DANIEL = 'u_dohyun';// Berkeley
const HANNAH = 'u_hana';  // Stanford in the seed — another school

function setup() {
  const db: Snapshot = structuredClone({
    users: seed.users, schools: seed.schools, organizations: seed.organizations, activities: seed.activities,
    participations: seed.participations, posts: seed.posts, relationships: seed.relationships, proposals: seed.proposals,
    chatRooms: seed.chatRooms, notifications: seed.notifications, reports: [], opportunities: seed.opportunities,
    opportunityIntents: seed.opportunityIntents, timePolls: seed.timePolls, games: [], rides: [],
  });
  const rides = createRidesEngine({ db, t, demo: false, push: () => {} }, { today: () => TODAY });
  const user = (id: string) => db.users.find((u) => u.id === id)!;
  return { db, rides, user };
}
const SFO: RideInput = { kind: 'splitting', from: 'unit2', to: 'sfo', date: '2026-11-25', start: '09:30', end: '10:00', seats: 3, estTotal: 60 };

test('posting: validation keeps pickups to public presets and rejects bad input', () => {
  const v = (x: Partial<RideInput>) => validateRideInput({ ...SFO, ...x }, 's_berkeley', TODAY);
  assert.equal(v({}), null);
  assert.match(v({ from: '2650 Durant Ave' })!, /pickup spot/);
  assert.match(v({ to: 'nowhere' })!, /destination/);
  assert.equal(v({ to: 'custom', toCustom: 'Napa' }), null);
  assert.match(v({ to: 'custom', toCustom: '1234 Haste St' })!, /not a street address/);
  assert.match(v({ date: '2026-10-01' })!, /passed/);
  assert.match(v({ date: '2027-09-01' })!, /6 months/);
  assert.match(v({ start: '10:00', end: '09:00' })!, /end after/);
  assert.match(v({ start: '06:00', end: '13:30' })!, /6 hours/);
  assert.match(v({ seats: 0 })!, /Seats/);
  assert.match(v({ seats: 9 })!, /Seats/);
  assert.match(v({ kind: 'looking', seats: 5 })!, /1–4/);
  assert.match(v({ estTotal: -5 })!, /Estimated total/);
  assert.match(v({ note: 'pick me up at 2400 Durant Ave' })!, /addresses/);
  assert.match(v({ note: 'text me 510-555-1234' })!, /phone/);
  assert.equal(v({ note: "It's a 45 min drive, leaving 10 min early by the way" }), null);
  assert.match(v({ kind: 'flying' as RideInput['kind'] })!, /ride type/);
});

test('posting: only students with a verified school email (sample profiles allowed, labelled)', () => {
  const { rides, user } = setup();
  const { ride } = rides.create(ME, SFO);
  assert.equal(ride.schoolId, 's_berkeley');
  assert.equal(ride.status, 'open');
  assert.equal(ride.sample, undefined);
  user(MAYA).affiliation = { ...user(MAYA).affiliation, emailVerified: false } as User['affiliation'];
  assert.throws(() => rides.create(MAYA, SFO), /Verify your school email/);
  user(MAYA).sample = true; // demo profile: allowed, labelled Sample
  assert.equal(rides.create(MAYA, SFO).ride.sample, true);
  assert.throws(() => rides.create(ME, { ...SFO, from: 'my place' }), RideError);
});

test('join/leave: seats count down and back up, chat opens for the riders only, full rides refuse', () => {
  const { db, rides } = setup();
  const { ride } = rides.create(ME, { ...SFO, seats: 2 });
  assert.equal(seatsLeft(ride), 2);
  const j1 = rides.join(ride.id, MAYA);
  assert.equal(j1.ride.memberCount, 1);
  assert.equal(seatsLeft(j1.ride), 1);
  const room = db.chatRooms.find((r) => r.id === j1.roomId)!;
  assert.equal(room.rideId, ride.id);
  assert.deepEqual(room.memberIds, [ME, MAYA]);
  assert.ok(db.notifications.some((n) => n.userId === ME && /Maya joined/.test(n.title)));
  assert.deepEqual(rides.join(ride.id, MAYA).patch, {}); // joining twice is a no-op
  rides.join(ride.id, LILY);
  assert.equal(seatsLeft(ride), 0);
  assert.throws(() => rides.join(ride.id, EMMA), /full/);
  rides.leave(ride.id, LILY);
  assert.equal(ride.memberCount, 1);
  assert.ok(!room.memberIds.includes(LILY));
  rides.join(ride.id, EMMA);
  assert.deepEqual(ride.memberIds, [MAYA, EMMA]);
  assert.throws(() => rides.leave(ride.id, ME), /cancel/); // host cancels instead
  assert.throws(() => rides.join(ride.id, ME), /your ride/);
});

test('host can close, reopen, edit (not below riders) and cancel; riders are told', () => {
  const { db, rides } = setup();
  const { ride } = rides.create(ME, SFO);
  rides.join(ride.id, MAYA);
  rides.close(ride.id, ME);
  assert.throws(() => rides.join(ride.id, LILY), /closed/);
  rides.reopen(ride.id, ME);
  rides.join(ride.id, LILY);
  assert.throws(() => rides.update(ride.id, ME, { seats: 1 }), /below/);
  rides.update(ride.id, ME, { estTotal: 90, start: '09:45', end: '10:15' });
  assert.equal(fareText(ride), '≈ $30 each with 3 people');
  assert.throws(() => rides.close(ride.id, MAYA), /Only the host/);
  rides.cancel(ride.id, ME);
  assert.equal(ride.status, 'cancelled');
  assert.ok(db.notifications.some((n) => n.userId === LILY && /cancelled/.test(n.title)));
  assert.throws(() => rides.join(ride.id, EMMA), /cancelled/);
});

test('other schools can neither see nor join', () => {
  const { db, rides } = setup();
  const { ride } = rides.create(ME, SFO);
  assert.throws(() => rides.join(ride.id, HANNAH), /same school/);
  assert.ok(!snapshotFor(db, HANNAH).rides!.some((r) => r.id === ride.id));
  assert.equal(patchFor({ rides: [ride] }, HANNAH, db), null);
});

test('matching: same destination group, leaving within ±90 minutes', () => {
  const { db, rides } = setup();
  const base = rides.create(MAYA, SFO).ride;                                                   // SFO 9:30
  const close = rides.create(LILY, { ...SFO, start: '10:55', end: '11:30' }).ride;             // +85 min
  const far = rides.create(EMMA, { ...SFO, start: '11:15', end: '11:30' }).ride;               // +105 min
  const oak = rides.create(DANIEL, { ...SFO, to: 'oak' }).ride;                                // other airport
  assert.ok(ridesMatch(base, close));
  assert.ok(!ridesMatch(base, far));
  assert.ok(!ridesMatch(base, oak));
  assert.ok(ridesMatch({ ...SFO, schoolId: 's_berkeley', to: 'tj' }, { ...SFO, schoolId: 's_berkeley', to: 'costco' }), 'errands group together');
  assert.ok(ridesMatch({ ...SFO, schoolId: 's_berkeley', to: 'custom', toCustom: 'Napa ' }, { ...SFO, schoolId: 's_berkeley', to: 'custom', toCustom: 'napa' }));
  assert.ok(!ridesMatch(base, { ...base, date: '2026-11-26' }));
  // a draft at 9:00 for me: Maya's 9:30 and Lily's 10:55 are… 30 and 115 min away → only Maya's
  const m = matchRides(db, { schoolId: 's_berkeley', to: 'sfo', date: '2026-11-25', start: '09:00' }, ME, TODAY);
  assert.deepEqual(m.map((r) => r.id), [base.id]);
  // full and closed rides don't match
  rides.close(base.id, MAYA);
  assert.deepEqual(matchRides(db, { schoolId: 's_berkeley', to: 'sfo', date: '2026-11-25', start: '09:00' }, ME, TODAY), []);
});

test('blocks: hidden from lists, matches and joining — both directions, and when a rider is blocked', () => {
  const { db, rides } = setup();
  const mayas = rides.create(MAYA, SFO).ride;
  const lilys = rides.create(LILY, { ...SFO, start: '10:00' }).ride;
  rides.join(lilys.id, EMMA);
  db.relationships.blocks.push({ fromId: MAYA, toId: ME }); // Maya blocked me
  db.relationships.blocks.push({ fromId: ME, toId: EMMA }); // I blocked Emma, who rides with Lily
  const seen = snapshotFor(db, ME).rides!.map((r) => r.id);
  assert.ok(!seen.includes(mayas.id), 'blocked host hidden');
  assert.ok(!seen.includes(lilys.id), 'ride with a blocked rider hidden');
  assert.deepEqual(matchRides(db, { schoolId: 's_berkeley', to: 'sfo', date: '2026-11-25', start: '09:30' }, ME, TODAY), []);
  assert.throws(() => rides.join(mayas.id, ME), /no longer available/);
  assert.throws(() => rides.join(lilys.id, ME), /no longer available/);
  // a block after the fact turns a patch into a removal for me
  assert.deepEqual(patchFor({ rides: [mayas] }, ME, db)?.removed?.rides, [mayas.id]);
  // others still see both
  assert.ok(snapshotFor(db, DANIEL).rides!.some((r) => r.id === mayas.id));
});

test('per-viewer copy: riders and chat only for the people in the ride', () => {
  const { db, rides } = setup();
  const { ride } = rides.create(ME, SFO);
  const { roomId } = rides.join(ride.id, MAYA);
  const outsider = snapshotFor(db, LILY).rides!.find((r) => r.id === ride.id)!;
  assert.deepEqual(outsider.memberIds, []);
  assert.equal(outsider.memberCount, 1);
  assert.equal(outsider.roomId, undefined);
  assert.ok(!snapshotFor(db, LILY).chatRooms.some((r) => r.id === roomId));
  const rider = snapshotFor(db, MAYA).rides!.find((r) => r.id === ride.id)!;
  assert.deepEqual(rider.memberIds, [MAYA]);
  assert.equal(rider.roomId, roomId);
  assert.ok(snapshotFor(db, MAYA).chatRooms.some((r) => r.id === roomId));
  // cancelled: gone for outsiders (removal), still there for the people in it
  rides.cancel(ride.id, ME);
  assert.deepEqual(patchFor({ rides: [ride] }, LILY, db)?.removed?.rides, [ride.id]);
  assert.equal(patchFor({ rides: [ride] }, MAYA, db)?.rides?.[0].status, 'cancelled');
});

test('signed-out teaser: destination, time, seats, host first name — nothing private', () => {
  const { db, rides, user } = setup();
  user(ME).nickname = 'Alex Kim';
  const { ride } = rides.create(ME, { ...SFO, note: 'Flight at 1:30, big suitcase' });
  rides.join(ride.id, MAYA);
  const teaser = rides.teaser(ride.id)!;
  assert.deepEqual(Object.keys(teaser).sort(), ['date', 'end', 'hostFirstName', 'id', 'kind', 'sample', 'schoolName', 'seatsLeft', 'start', 'status', 'to'].sort());
  assert.equal(teaser.hostFirstName, 'Alex');
  assert.equal(teaser.to, 'SFO');
  assert.equal(teaser.seatsLeft, 2);
  const json = JSON.stringify(teaser);
  for (const secret of [MAYA, ME, 'Unit 2', 'unit2', 'Flight at 1:30', ride.roomId!, 'Kim']) assert.ok(!json.includes(secret), `teaser leaks ${secret}`);
  rides.cancel(ride.id, ME);
  assert.equal(rides.teaser(ride.id), null);
  assert.equal(rides.teaser('rd_nope'), null);
  // link preview
  const r2 = rides.create(ME, { ...SFO, kind: 'driving', seats: 2, estTotal: undefined }).ride;
  assert.equal(rideTitle(r2), 'Ride to SFO · Wed Nov 25 9:30am · 2 seats left');
  const html = withRideMeta('<html><head><title>Lumi</title><meta property="og:title" content="Lumi" /></head><body></body></html>', { ...rideMeta(r2, 'UC Berkeley'), url: 'https://x/r/1', image: 'https://x/og-ride.png' });
  assert.match(html, /<meta property="og:title" content="Ride to SFO · Wed Nov 25 9:30am · 2 seats left" \/>/);
  assert.equal((html.match(/og:title/g) ?? []).length, 1);
  assert.ok(!html.includes('Unit 2'));
  void db;
});

test('RPC permissions: as yourself, host-only actions for the host', () => {
  const { db, rides } = setup();
  const { ride } = rides.create(ME, SFO);
  const rules = ridesRules(() => db);
  assert.ok(ruleAllows(rules.create, ME, [ME, SFO]));
  assert.ok(!ruleAllows(rules.create, ME, [MAYA, SFO]));
  assert.ok(ruleAllows(rules.join, MAYA, [ride.id, MAYA]));
  assert.ok(!ruleAllows(rules.join, MAYA, [ride.id, LILY]));
  assert.ok(!ruleAllows(rules.leave, MAYA, [ride.id, LILY]));
  for (const m of ['close', 'reopen', 'cancel', 'update']) {
    assert.ok(ruleAllows(rules[m], ME, [ride.id, ME]), m);
    assert.ok(!ruleAllows(rules[m], MAYA, [ride.id, MAYA]), m);
    assert.ok(!ruleAllows(rules[m], MAYA, [ride.id, ME]), m);
  }
  assert.ok(!('teaser' in rules));
});

test('money: never invented', () => {
  const r = { estTotal: undefined, memberCount: 0 };
  assert.equal(fareText(r), 'Split evenly');
  assert.equal(fareText({ estTotal: 42, memberCount: 0 }), '≈ $21 each with 2 people');
  assert.equal(fareText({ estTotal: 42, memberCount: 2 }), '≈ $14 each with 3 people');
});

test('Thanksgiving banner: Nov 10–25 from the calendar, or the dated fallback', () => {
  assert.equal(bannerSeason('s_berkeley', '2026-11-09'), null);
  assert.equal(bannerSeason('s_berkeley', '2026-11-10')?.breakStart, '2026-11-25');
  assert.ok(bannerSeason('s_berkeley', '2026-11-25'));
  assert.equal(bannerSeason('s_berkeley', '2026-11-26'), null);
  assert.equal(bannerSeason('s_ucmerced', '2026-11-12'), null);
  assert.ok(upcomingSeason('s_berkeley', TODAY));
  // derived from academic-calendar rows (server/data/academic-calendar-berkeley.csv shape)
  const cal = [
    { schoolId: 's_berkeley', start: '2027-11-24', end: '2027-11-24', title: 'Non-instructional day (no classes)', kind: 'holiday' },
    { schoolId: 's_berkeley', start: '2027-11-25', end: '2027-11-26', title: 'Thanksgiving — academic & administrative holiday (no classes)', kind: 'holiday' },
  ];
  const s = rideSeasons('s_berkeley', cal)[0];
  assert.deepEqual([s.breakStart, s.breakEnd, s.showFrom, s.showTo], ['2027-11-24', '2027-11-28', '2027-11-09', '2027-11-24']);
});

test('sample rides: added once, labelled, weekly ones roll forward', () => {
  const { db } = setup();
  const first = ensureSampleRides(db, TODAY)!;
  assert.ok(first.rides!.length >= 3);
  assert.ok(first.rides!.every((r: Ride) => r.sample && r.schoolId === 's_berkeley'));
  assert.equal(ensureSampleRides(db, TODAY), null);
  const later = ensureSampleRides(db, '2026-10-30');
  assert.ok(later?.rides?.every((r) => r.date >= '2026-10-30'));
});

test('rides stay 18+ even though Lumi is 16+', () => {
  const now = new Date();
  const base = { affiliation: { type: 'university', schoolId: 's_berkeley', schoolName: 'UC Berkeley', emailVerified: true } } as unknown as Parameters<typeof rideEligibility>[0] & object;
  assert.equal(rideEligibility({ ...base, birthYear: now.getFullYear() - 16 }).ok, false);
  assert.equal(rideEligibility({ ...base, birthYear: now.getFullYear() - 16 }).minor, true);
  assert.equal(rideEligibility({ ...base, birthYear: now.getFullYear() - 20 }).ok, true);
});

test('rideLeft: a ride is gone once its leaving window ends (campus clock), not at midnight', () => {
  const r = { date: '2026-11-01', end: '17:00' };
  assert.equal(rideLeft(r, new Date('2026-11-02T00:17:00Z')), false); // Sun 4:17 PM PST — still in the 4–5 PM window
  assert.equal(rideLeft(r, new Date('2026-11-02T01:05:00Z')), true); // Sun 5:05 PM PST — left
  assert.equal(rideLeft({ date: '2026-11-02', end: '09:00' }, new Date('2026-11-02T07:00:00Z')), false); // Sun 11 PM PST — tomorrow's ride
  assert.equal(rideLeft({ date: '2026-10-31', end: '23:00' }, new Date('2026-11-01T20:00:00Z')), true);
});
