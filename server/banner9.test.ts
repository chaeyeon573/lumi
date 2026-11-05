import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { b9Meetings, type B9Section } from './sources/courses';

test('Banner 9 meetings: the final exam (FINL, one date) is not a weekly class time (USF ADVT 320)', () => {
  const s = JSON.parse(readFileSync(new URL('./fixtures/usf-banner-advt320.json', import.meta.url), 'utf8')) as B9Section;
  const { meetings } = b9Meetings(s.meetingsFaculty);
  assert.deepEqual(meetings, [{ day: 4, start: '11:45', end: '15:25' }]);
});
