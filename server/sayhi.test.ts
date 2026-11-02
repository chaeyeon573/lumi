/**
 * 사람 카드의 "Say hi" 초안과 학년·전공 줄 (@core/lib/sayhi) — 함께 가진 것만으로, 나이 없이.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ClassRoster, User } from '@core/types';
import * as seed from '@core/data/seed.en';
import { hiContext, yearMajor } from '@core/lib/sayhi';

const person = (id: string, nickname: string, extra: Partial<User> = {}, dept = 'Economics'): User => {
  const base = structuredClone(seed.users.find((u) => u.id === 'u_jimin')!);
  return { ...base, id, nickname, timetable: [], interests: [], ...extra, affiliation: { ...base.affiliation, department: dept, showDepartment: true, role: 'undergraduate', year: 2024 } as User['affiliation'] };
};
const roster = (userId: string): ClassRoster => ({ id: 'k', schoolId: 's_berkeley', code: 'UGBA 105', term: 'Fall 2026', name: 'UGBA 105', members: [{ userId }], count: 2, partners: [] });

test('a shared class leads: card line "Both in UGBA 105" and a first message that names the class', () => {
  const me = person('me', 'Alex'); const maya = person('maya', 'Maya Lee');
  const hi = hiContext(me, maya, { rosters: [roster('maya')], canSeeTimetable: false }, true);
  assert.equal(hi.kind, 'class');
  assert.equal(hi.line, 'Both in UGBA 105');
  assert.match(hi.message, /^Hi Maya! .*UGBA 105/);
  assert.equal(hi.category, 'study');
});

test('no class, same department → department; nothing shared → no card line, a plain hello', () => {
  const me = person('me', 'Alex'); const sam = person('sam', 'Sam');
  assert.equal(hiContext(me, sam, { canSeeTimetable: false }, true).line, 'Both in Economics');
  const other = person('jo', 'Jo', {}, 'Physics');
  const none = hiContext(me, other, { canSeeTimetable: false }, true);
  assert.equal(none.kind, 'none'); assert.equal(none.line, '');
  assert.match(none.message, /I'm Alex/);
});

test('free time only counts what is still ahead today, and only with the timetable visible', () => {
  const tt = [{ id: 'c', name: 'X', day: 0, start: '09:00', end: '10:00', hue: 1 }];
  const me = person('me', 'Alex', { timetable: tt }, 'A'); const b = person('b', 'B', { timetable: tt }, 'B');
  assert.equal(hiContext(me, b, { canSeeTimetable: false, day: 0, now: 600 }, true).kind, 'none');
  const hi = hiContext(me, b, { canSeeTimetable: true, day: 0, now: 600 }, true);
  assert.equal(hi.kind, 'time'); assert.match(hi.line, /^Both free .* today$/);
  assert.equal(hiContext(me, b, { canSeeTimetable: true, day: 0, now: 20 * 60 + 50 }, true).kind, 'none');
});

test('year · major instead of age', () => {
  const u = person('u', 'U', {}, 'Business (Haas)');
  assert.equal(yearMajor(u, true, new Date('2026-11-02T12:00:00Z')), 'Junior · Business (Haas)');
  assert.equal(yearMajor(u, true, new Date('2027-03-02T12:00:00Z')), 'Junior · Business (Haas)');
  const grad = { ...u, affiliation: { ...u.affiliation, role: 'graduate' } } as User;
  assert.equal(yearMajor(grad, true), 'Grad student · Business (Haas)');
});
