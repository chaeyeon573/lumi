import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { traceSuccess, evalRecord, baselineOf, matchWhere, evidenceProblems, branches, collectionOf } from '../lib/success.mjs';
import { scenarios } from '../lib/util.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

test('every scenario check needs run-produced evidence in every branch', () => {
  for (const s of scenarios()) assert.deepEqual(evidenceProblems(s), [], s.id);
});

test('the pilot lunch-today check (text only) is rejected — seed content could satisfy it', () => {
  const pilot = { id: 'lunch-today', startUrl: '/', success: { any: [{ textMatches: "You're in|Joined|Going" }, { urlMatches: '^/chats/' }] } };
  const errs = evidenceProblems(pilot);
  assert.equal(errs.length, 1);
  assert.match(errs[0], /branch 1 \(textMatches\)/);
  // a URL the start URL already matches is not evidence either
  assert.equal(evidenceProblems({ startUrl: '/', success: { all: [{ urlMatches: '^/' }] } }).length, 1);
});

test('the committed pilot scenario file at HEAD~ is flagged (regression guard for the loosened check)', (t) => {
  let old;
  try { old = JSON.parse(execFileSync('git', ['-C', HERE, 'show', '931b47f:tools/ux-sim/scenarios/lunch-today.json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); } catch { t.skip('pilot commit not in this checkout'); return; }
  assert.ok(evidenceProblems(old).length > 0);
});

test('branches() expands all/any into DNF', () => {
  const b = branches({ all: [{ urlMatches: 'a' }], any: [{ textMatches: 'b' }, { all: [{ textMatches: 'c' }, { textMatches: 'd' }] }] });
  assert.deepEqual(b.map((x) => x.map((l) => Object.values(l)[0])), [['a', 'b'], ['a', 'c', 'd']]);
});

const snap = (extra = {}) => ({
  users: [{ id: 'u_me', timetable: [] }, { id: 'u_peer' }],
  activities: [{ id: 'a_peer', hostId: 'u_peer', category: 'meal', date: '2026-11-02' }],
  participations: [{ id: 'p_seed', activityId: 'a_peer', userId: 'u_other' }],
  rides: [{ id: 'rd_peer', hostId: 'u_peer', to: 'sfo', memberIds: [] }],
  chatRooms: [{ id: 'cr1', memberIds: ['u_me', 'u_peer'], messages: [{ id: 'm1', senderId: 'u_peer', text: 'hi', system: true }] }],
  relationships: { friendRequests: [] },
  ...extra,
});
const vars = { me: 'u_me', peers: ['u_peer'], peerActivities: ['a_peer'], today: '2026-11-02' };
const COLS = ['users', 'participations', 'activities', 'rides', 'chatRooms', 'relationships.friendRequests'];

test('record leaves count only what changed after the persona started', () => {
  const baseline = baselineOf(snap(), COLS);
  const joined = { collection: 'participations', where: { userId: '$me', activityId: { in: '$peerActivities' } } };
  assert.equal(evalRecord(joined, { snapshot: snap(), baseline, vars }), false, 'seed participation of someone else does not count');
  const after = snap({ participations: [...snap().participations, { id: 'p_new', activityId: 'a_peer', userId: 'u_me' }] });
  assert.equal(evalRecord(joined, { snapshot: after, baseline, vars }), true);
  // a pre-existing record of mine is not new
  const base2 = baselineOf(after, COLS);
  assert.equal(evalRecord(joined, { snapshot: after, baseline: base2, vars }), false);
});

test('fresh: "changed" sees edits to an existing record (timetable, ride members, chat messages)', () => {
  const baseline = baselineOf(snap(), COLS);
  const tt = { collection: 'users', where: { id: '$me', timetable: { re: 'MATH ?(1A|51)\\b' } }, fresh: 'changed' };
  assert.equal(evalRecord(tt, { snapshot: snap(), baseline, vars }), false);
  const s2 = snap({ users: [{ id: 'u_me', timetable: [{ id: 'c1', name: 'MATH 51 Calculus I', code: 'MATH 51' }] }, { id: 'u_peer' }] });
  assert.equal(evalRecord(tt, { snapshot: s2, baseline, vars }), true);
  const ride = { collection: 'rides', where: { to: 'sfo', memberIds: { has: '$me' } }, fresh: 'changed' };
  assert.equal(evalRecord(ride, { snapshot: snap({ rides: [{ id: 'rd_peer', hostId: 'u_peer', to: 'sfo', memberIds: ['u_me'] }] }), baseline, vars }), true);
  const msg = { collection: 'chatRooms', where: { memberIds: { has: '$me' }, messages: { some: { senderId: '$me', system: { exists: false } } } }, fresh: 'changed' };
  assert.equal(evalRecord(msg, { snapshot: snap(), baseline, vars }), false);
  const s3 = snap({ chatRooms: [{ id: 'cr1', memberIds: ['u_me', 'u_peer'], messages: [{ id: 'm1', senderId: 'u_peer', text: 'hi', system: true }, { id: 'm2', senderId: 'u_me', text: 'yo' }] }] });
  assert.equal(evalRecord(msg, { snapshot: s3, baseline, vars }), true);
});

test('dotted collections and unresolved variables', () => {
  assert.equal(collectionOf({ relationships: { friendRequests: [{ id: 'f' }] } }, 'relationships.friendRequests').length, 1);
  assert.equal(matchWhere({ userId: 'x' }, { userId: '$me' }, {}), false, '$me unknown (signed out) never matches');
  assert.equal(matchWhere({ date: '2026-11-25' }, { date: { re: '-11-25$' } }, {}), true);
});

test('traceSuccess reports matched leaves and undecidable record checks', () => {
  const success = { any: [{ record: { collection: 'activities', where: { hostId: '$me' }, description: 'posted' } }, { urlMatches: '^/chats/' }] };
  const t1 = traceSuccess(success, { url: 'http://x/chats/cr1', text: '', record: () => null });
  assert.equal(t1.met, true); assert.equal(t1.undecidable, true); assert.deepEqual(t1.matched, [{ urlMatches: '^/chats/' }]);
  const t2 = traceSuccess(success, { url: 'http://x/', text: '', record: () => true });
  assert.equal(t2.met, true); assert.equal(t2.matched[0].description, 'posted');
});

test('scenario files parse and default to fresh accounts', () => {
  for (const s of scenarios()) {
    const auth = s.setup?.auth ?? 'fresh';
    assert.ok(['fresh', 'none'].includes(auth), `${s.id}: ${auth} (demo needs a demoReason)`);
  }
  assert.ok(JSON.parse(readFileSync(path.join(HERE, '..', 'scenarios', 'lunch-today.json'), 'utf8')).setup.peers.length >= 1);
});
