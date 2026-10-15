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

test('CalLink (Engage) events co-hosted by two orgs come once', async () => {
  const { fetchEngageEvents } = await import('./sources/opportunities');
  const soon = new Date(Date.now() + 86_400_000).toISOString();
  const ev = (id: string, org: string) => ({ id, name: 'Real Talk Buddies Kick-Off', organizationName: org, location: 'Mulford Hall', startsOn: soon, endsOn: soon, benefitNames: ['Free Food'] });
  const real = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ value: [ev('1', 'Real Talk Buddies'), ev('2', 'ASUC'), { ...ev('3', 'X'), name: 'Other event' }] }))) as typeof fetch;
  try {
    const out = await fetchEngageEvents('https://callink.berkeley.edu', { id: 's_berkeley', center: { lat: 0, lng: 0 } });
    assert.deepEqual(out.map((o) => o.title).sort(), ['Other event', 'Real Talk Buddies Kick-Off']);
  } finally { globalThis.fetch = real; }
});
