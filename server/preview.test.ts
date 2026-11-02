import { test } from 'node:test';
import assert from 'node:assert/strict';
import { previewSchools, previewSchool } from './preview';

test('preview: lists collect schools from files, rejects odd ids', () => {
  const list = previewSchools();
  assert.ok(list.some((s) => s.id === 's_ucsc'));
  assert.equal(previewSchool('../etc'), null);
  assert.equal(previewSchool('s_berkeley'), null); // open school — not a preview
  const ucsc = previewSchool('s_ucsc');
  assert.ok(ucsc && ucsc.orgs.length > 50);
  assert.ok(ucsc!.orgs.every((o) => o.name && o.links));
});
