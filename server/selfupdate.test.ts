/**
 * 자기 프로필 수정(users.update RPC)으로 서버 전용 값을 바꿀 수 없다 — 인증·예시·정지.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { User } from '@core/types';
import * as seed from '@core/data/seed.en';
import { sanitizeSelfUpdate } from '@core/lib/selfupdate';

const real = (): User => ({ ...structuredClone(seed.users.find((u) => u.id === 'u_jimin')!), sample: false, identityVerified: false, affiliation: { type: 'university', schoolId: 's_berkeley', schoolName: 'UC Berkeley', role: 'undergraduate', department: 'CS', year: 2024, emailVerified: false, showSchool: true, showDepartment: true } as User['affiliation'] });

test('a real user cannot verify themselves, mark themselves sample, or lift a suspension', () => {
  const u = real();
  const out = sanitizeSelfUpdate(u, { sample: true, identityVerified: true, suspended: undefined, createdAt: 'x', id: 'u_other', bio: 'hi', affiliation: { ...u.affiliation, emailVerified: true } as User['affiliation'] });
  assert.equal('sample' in out, false);
  assert.equal('identityVerified' in out, false);
  assert.equal('suspended' in out, false);
  assert.equal('id' in out, false);
  assert.equal(out.affiliation!.emailVerified, false);
  assert.equal(out.bio, 'hi');
});

test('moving to another school drops email verification; same school keeps it', () => {
  const u = real(); (u.affiliation as { emailVerified: boolean }).emailVerified = true;
  assert.equal(sanitizeSelfUpdate(u, { affiliation: { ...u.affiliation, department: 'Math' } as User['affiliation'] }).affiliation!.emailVerified, true);
  assert.equal(sanitizeSelfUpdate(u, { affiliation: { ...u.affiliation, schoolId: 's_ucmerced', emailVerified: true } as User['affiliation'] }).affiliation!.emailVerified, false);
});

test('demo (sample) accounts keep the instant-verify demo toggles but still cannot change sample/suspended', () => {
  const u = { ...real(), sample: true };
  const out = sanitizeSelfUpdate(u, { sample: false, identityVerified: true, affiliation: { ...u.affiliation, emailVerified: true } as User['affiliation'] });
  assert.equal('sample' in out, false);
  assert.equal(out.identityVerified, true);
  assert.equal(out.affiliation!.emailVerified, true);
});
