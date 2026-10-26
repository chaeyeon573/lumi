/**
 * 에이전트 알림 메일 거르기 — 같은 실패는 하루 한 번, 메일은 한 시간에 한 통.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { logEntries, pickToMail } from './agent/notify-throttle';

const now = new Date('2026-10-26T16:03:00Z');
const at = (h: number) => new Date(now.getTime() - h * 3_600_000);
const fail = { task: 'deadlines:s_ucmerced', status: 'error' as const };

test('first failure is mailed', () => {
  assert.deepEqual(pickToMail([fail], [], now), [fail]);
});

test('the same failure is not mailed again within a day, even after a restart', () => {
  const log = logEntries([fail], at(2));
  assert.deepEqual(pickToMail([fail], log, now), []);
  assert.deepEqual(pickToMail([fail], log, new Date(at(-23).getTime())), [fail]);
});

test('at most one mail an hour — a new failure waits for the next mail', () => {
  const log = logEntries([fail], at(0.2));
  const other = { task: 'courses:berkeley', status: 'rejected' as const };
  assert.deepEqual(pickToMail([other], log, now), []);
  assert.deepEqual(pickToMail([other], log, new Date(now.getTime() + 3_600_000)), [other]);
});

test('a different status of the same task counts as a new failure', () => {
  const log = logEntries([fail], at(2));
  assert.deepEqual(pickToMail([{ ...fail, status: 'rejected' as const }], log, now).length, 1);
});
