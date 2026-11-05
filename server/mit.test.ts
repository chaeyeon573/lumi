import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mitLectureOptions } from './sources/courses';

test('MIT FireRoad: each lecture slot is a separate option (catalog: "R9.30-11 or R11-12.30 or ..."), not one merged schedule', () => {
  const s6_1010 = 'Lecture,34-501/R/0/9.30-11,34-501/R/0/11-12.30,34-501/R/0/1-2.30,34-501/R/0/2.30-4;Lab,34-501/T/0/9.30-11,34-501/T/0/11-12.30';
  const o = mitLectureOptions(s6_1010);
  assert.equal(o.length, 4);
  assert.deepEqual(o[0].meetings, [{ day: 3, start: '09:30', end: '11:00' }]);
  assert.deepEqual(o[2].meetings, [{ day: 3, start: '13:00', end: '14:30' }]);
  const c57 = mitLectureOptions('Lecture,E51-345/TR/0/8.30-10,E25-111/TR/0/2.30-4,E25-111/MW/0/10-11.30');
  assert.deepEqual(c57.map((x) => x.meetings.map((m) => `${m.day}@${m.start}`).join(' ')), ['1@08:30 3@08:30', '1@14:30 3@14:30', '0@10:00 2@10:00']);
  assert.equal(mitLectureOptions('Lecture,4-163/MW/0/9.30-11;Recitation,33-319/F/0/10').length, 1);
});
