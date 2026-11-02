import test from 'node:test';
import assert from 'node:assert/strict';
import { validateConfig } from '../lib/validate.mjs';

test('personas and scenarios validate (incl. the evidence rule and auth defaults)', () => {
  const r = validateConfig();
  assert.deepEqual(r.errors, []);
  assert.equal(r.ok, true);
});
