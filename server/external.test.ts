/**
 * 자동으로 가져온 공고(Devpost 등) — 이미 다른 출처에 같은 제목이 있으면 두 번 보이지 않게 뺀다.
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dropDuplicateTitles } from './sources/external';

test('imported items that repeat a curated title are dropped; their own earlier copies are not counted', () => {
  const existing = [
    { id: 'op_nat_technica', title: 'Technica 2026' },
    { id: 'op_ext_devpost_1', title: 'Old Devpost Hack' },
  ];
  const fetched = [
    { id: 'op_ext_devpost_2', title: 'technica 2026' },
    { id: 'op_ext_devpost_1', title: 'Old Devpost Hack' },
    { id: 'op_ext_devpost_3', title: 'Brand New Hack' },
  ];
  assert.deepEqual(dropDuplicateTitles(fetched, existing, 'op_ext_devpost_').map((o) => o.id), ['op_ext_devpost_1', 'op_ext_devpost_3']);
});
