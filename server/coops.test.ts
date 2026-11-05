import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseHouseList, houseSummary, coopsFromCsv, COOP_PREFIX } from './sources/coops';

const dir = path.dirname(fileURLToPath(import.meta.url));

test('BSC houses: list names (not “Read More”) and the first lines of a house page', () => {
  const list = parseHouseList(readFileSync(path.join(dir, 'fixtures', 'bsc-houses.html'), 'utf8'));
  assert.ok(list.length >= 3); assert.ok(list.every((h) => !/read more/i.test(h.name)));
  const s = houseSummary(readFileSync(path.join(dir, 'fixtures', 'bsc-casa-zimbabwe.html'), 'utf8'), 'Casa Zimbabwe');
  assert.match(s, /^Casa Zimbabwe \(known to many as CZ\)/); assert.ok(s.length <= 280);
});

test('BSC co-ops CSV → verified co-op organizations at Berkeley', () => {
  const orgs = coopsFromCsv(readFileSync(path.join(dir, 'data', 'coops-berkeley.csv'), 'utf8'));
  assert.equal(orgs.length, 20);
  assert.ok(orgs.every((o) => o.type === 'coop' && o.schoolId === 's_berkeley' && o.id.startsWith(COOP_PREFIX) && o.links?.[0].url.startsWith('https://www.bsc.coop/')));
  assert.ok(orgs.find((o) => o.name === 'Lothlorien')!.description.includes('vegetarian'));
});
