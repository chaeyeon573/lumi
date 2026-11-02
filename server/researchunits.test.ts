import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseResearchUnits, researchUnitToOrg, mergeResearchUnits, RU_PREFIX } from './sources/researchunits';

const html = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'research-units.html'), 'utf8');

test('research units: name + director from the official VCR list, never the email or phone', () => {
  const rows = parseResearchUnits(html);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows[0], { slug: 'angelo-coast-range-reserve', name: 'Angelo Coast Range Reserve', director: 'Mary Power', url: 'https://vcresearch.berkeley.edu/research-unit/angelo-coast-range-reserve' });
  const o = researchUnitToOrg(rows[0]);
  assert.equal(o.type, 'lab'); assert.equal(o.schoolId, 's_berkeley'); assert.ok(o.id.startsWith(RU_PREFIX));
  assert.equal(o.description, 'Official UC Berkeley research unit (VCR list). Director: Mary Power.');
  assert.ok(!JSON.stringify(rows.map(researchUnitToOrg)).match(/@|\(510\)/));
});

test('research units: keep followers on re-import, drop units gone from the list only if nobody follows them', () => {
  const [a, b] = parseResearchUnits(html).map(researchUnitToOrg);
  const followed = { ...b, followerIds: ['u_1'] };
  const gone = { ...a, id: `${RU_PREFIX}old_center` };
  const r = mergeResearchUnits([a, { ...b, name: 'Renamed' }], [a, followed, gone, { ...gone, id: `${RU_PREFIX}old_followed`, followerIds: ['u_2'] }]);
  assert.deepEqual(r.organizations.map((o) => [o.id, o.name, o.followerIds]), [[b.id, 'Renamed', ['u_1']]]);
  assert.deepEqual(r.removed, [`${RU_PREFIX}old_center`]);
});
