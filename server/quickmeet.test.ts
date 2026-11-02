/**
 * 즉석 만남 짧은 양식의 '언제' 기본값 (@core/lib/quickmeet) — 지난 시각·밤늦은 시각이 기본으로 들어가지 않는다.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { QUICK_EARLIEST, QUICK_LATEST, quickEnd, quickPickOk, quickWhen } from '@core/lib/quickmeet';

const at = (h: number, m = 0) => h * 60 + m;

test('midday: now and in 30 min, default in 30 min, rounded to 5 minutes', () => {
  const w = quickWhen(at(11, 52));
  assert.equal(w.now, at(11, 55));
  assert.equal(w.in30, at(12, 25));
  assert.equal(w.initial, 'in30');
  assert.deepEqual(w.pick, { dayOffset: 0, start: at(13) });
});

test('10:51 PM (the ux-sim run that defaulted to 11 PM): no now / in 30 min, pick tomorrow at noon', () => {
  const w = quickWhen(at(22, 51));
  assert.equal(w.now, null); assert.equal(w.in30, null);
  assert.equal(w.initial, 'pick');
  assert.deepEqual(w.pick, { dayOffset: 1, start: at(12) });
});

test('early morning: pick today at noon; 7:45 offers in 30 min (8:15) but not now', () => {
  assert.deepEqual(quickWhen(at(5, 10)).pick, { dayOffset: 0, start: at(12) });
  const w = quickWhen(at(7, 45));
  assert.equal(w.now, null); assert.equal(w.in30, at(8, 15)); assert.equal(w.initial, 'in30');
});

test('every default start, all day long, is within sensible hours and not in the past', () => {
  for (let m = 0; m < 24 * 60; m++) {
    const w = quickWhen(m);
    for (const s of [w.now, w.in30]) if (s != null) { assert.ok(s >= m && s >= QUICK_EARLIEST && s <= QUICK_LATEST, `${m}: ${s}`); }
    assert.ok(quickPickOk(w.pick.dayOffset, w.pick.start, m), `pick at ${m}`);
    assert.ok(w.pick.start >= QUICK_EARLIEST && w.pick.start <= QUICK_LATEST);
  }
});

test('picked times: not in the past today, not at night; end never passes midnight', () => {
  assert.equal(quickPickOk(0, at(14), at(15)), false);
  assert.equal(quickPickOk(1, at(14), at(15)), true);
  assert.equal(quickPickOk(1, at(2), at(15)), false);
  assert.equal(quickEnd(at(23, 30), 120), at(23, 59));
});
