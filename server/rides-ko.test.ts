/**
 * 같이 타기 화면 문구 — 한국어로 바꾸면 라이드 문구(종류·자리·요금·시간·검사 메시지)도 한국어, 영어는 그대로.
 * lang 은 모듈을 읽을 때 정해지므로 AROUNDU_LANG=ko 로 따로 띄운 프로세스에서 확인한다.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');

// 자식 프로세스: 이 파일을 AROUNDU_LANG 을 바꿔 다시 띄우면 결과만 찍고 끝난다
if (process.env.RIDES_LANG_CHILD) {
  const { clock, whenLabel, seatsText, fareText, validateRideInput, RIDE_KIND_LABELS, RIDE_FILTERS, SAFETY_NOTE, rideEligibility } = await import('@core/lib/rides');
  console.log(JSON.stringify({
    clock: [clock('09:00'), clock('13:30')],
    when: whenLabel({ date: '2026-11-25', start: '11:00', end: '13:00' }),
    seats: seatsText({ kind: 'driving', seats: 3, memberCount: 1 }),
    fare: fareText({ estTotal: 60, memberCount: 1 }),
    kind: RIDE_KIND_LABELS.splitting, filter: RIDE_FILTERS[1].label, safety: SAFETY_NOTE,
    problem: validateRideInput({ kind: 'splitting', from: 'sproul', to: 'sfo', date: '2026-11-25', start: '09:00', end: '10:00', seats: 3, note: 'call 510-555-1234' }, 's_berkeley', '2026-11-02'),
    minor: rideEligibility({ affiliation: { type: 'university', schoolId: 's_berkeley', schoolName: '', role: 'undergraduate', department: '', year: 2026, emailVerified: true, showSchool: true, showDepartment: true }, birthYear: 2015 }).reason,
  }));
  process.exit(0);
}
const run = (lang: string) => JSON.parse(execFileSync(path.join(root, 'node_modules', '.bin', 'tsx'), ['--tsconfig', 'server/tsconfig.json', 'server/rides-ko.test.ts'], { cwd: root, env: { ...process.env, AROUNDU_LANG: lang, RIDES_LANG_CHILD: '1' }, encoding: 'utf8' }).trim().split('\n').pop()!);

test('rides text follows the UI language (Korean), English unchanged', () => {
  const ko = run('ko');
  assert.deepEqual(ko.clock, ['오전 9시', '오후 1:30']);
  assert.equal(ko.when, '11월 25일 (수) · 오전 11시–오후 1시');
  assert.equal(ko.seats, '2자리 남음');
  assert.equal(ko.fare, '2명이면 1인당 ≈ $30');
  assert.equal(ko.kind, 'Uber/Lyft 나눠 타기');
  assert.equal(ko.filter, '✈️ 공항');
  assert.match(ko.safety, /공개된 탑승 장소/);
  assert.match(ko.problem, /전화번호/);
  assert.match(ko.minor, /만 18세/);
  const en = run('en');
  assert.deepEqual(en.clock, ['9am', '1:30pm']);
  assert.equal(en.when, 'Wed Nov 25 · 11am–1pm');
  assert.equal(en.seats, '2 seats left');
  assert.equal(en.fare, '≈ $30 each with 2 people');
  assert.equal(en.kind, 'Splitting an Uber/Lyft');
  assert.equal(en.problem, 'Share phone numbers in the ride chat, not the public note.');
});
