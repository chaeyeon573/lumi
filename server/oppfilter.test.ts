import { test } from 'node:test';
import assert from 'node:assert/strict';
import { opportunityFilter } from './view';
import type { Snapshot } from '@core/api/types';

const user = (id: string, schoolId?: string) => ({ id, affiliation: schoolId ? { type: 'university', schoolId } : { type: 'company' } });
const db = {
  users: [user('u1', 's_berkeley'), user('u2')],
  opportunityIntents: [{ id: 'i1', opportunityId: 'op_stanford_saved', userId: 'u1', intent: 'interested' }],
} as unknown as Snapshot;

test('opportunityFilter: national + my school + ones I saved; other schools hidden', () => {
  const f = opportunityFilter(db, 'u1');
  assert.equal(f({ id: 'op_ext_job_1' }), true);
  assert.equal(f({ id: 'op_berkeley_1', schoolId: 's_berkeley' }), true);
  assert.equal(f({ id: 'op_stanford_lc_1', schoolId: 's_stanford' }), false);
  assert.equal(f({ id: 'op_stanford_saved', schoolId: 's_stanford' }), true);
});

test('opportunityFilter: viewer without a school sees everything (unchanged behavior)', () => {
  const f = opportunityFilter(db, 'u2');
  assert.equal(f({ id: 'op_stanford_lc_1', schoolId: 's_stanford' }), true);
});
