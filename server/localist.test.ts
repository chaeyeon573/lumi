import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { localistToOpportunities } from './sources/opportunities';
import { normalizeTermLabel } from '@core/lib/terms';
import { createRequire } from 'node:module';

const here = path.dirname(fileURLToPath(import.meta.url));
const events = (JSON.parse(readFileSync(path.join(here, 'fixtures', 'stanford-localist-events.json'), 'utf8')) as { events: { event: never }[] }).events.map((x) => x.event);
const stanford = { id: 's_stanford', name: 'Stanford University', center: { lat: 37.43, lng: -122.17 }, tz: 'America/Los_Angeles' };
const NOW = new Date('2026-10-19T07:00:00Z');

test('Localist: talks/seminars and free food only; online-only and plain notices dropped', () => {
  const ops = localistToOpportunities(events, stanford, NOW);
  const titles = ops.map((o) => o.title);
  assert.ok(titles.some((t) => /Seminar/.test(t)), 'seminars come in');
  assert.ok(!titles.some((t) => /FusionGO|Open Enrollment|Lectio Divina/.test(t)), 'app notices and virtual-only sessions stay out');
  assert.ok(ops.every((o) => o.id.startsWith('op_stanford_lc_') && o.sourceUrl.startsWith('https://events.stanford.edu/event/') && o.sourceLabel === 'Stanford University Events'));
  assert.ok(ops.every((o) => !o.startTime || /^\d{2}:\d{2}$/.test(o.startTime)));
});

test('East Coast school: event start time is the Boston wall clock, not Pacific', () => {
  const e = { id: 1, title: 'Physics Colloquium', localist_url: 'https://calendar.mit.edu/event/x', experience: 'inperson', status: 'live', event_instances: [{ event_instance: { start: '2026-10-20T16:00:00-04:00' } }] };
  const [op] = localistToOpportunities([e], { id: 's_mit', name: 'MIT', center: { lat: 42.36, lng: -71.09 }, tz: 'America/New_York' }, NOW);
  assert.equal(op.startTime, '16:00');
  const [pacific] = localistToOpportunities([e], { id: 's_mit', name: 'MIT', center: { lat: 42.36, lng: -71.09 } }, NOW);
  assert.equal(pacific.startTime, '13:00', 'what it showed before schools had a time zone');
});

test('the app counts "today" in the viewer’s school time zone', () => {
  // core 는 CommonJS 로 읽힌다 — 같은 인스턴스를 쓰려고 require 로 (import 로 읽으면 테스트만 따로 한 벌이 생긴다)
  const req = createRequire(import.meta.url);
  const { campusDate } = req('../packages/core/src/lib/listings.ts') as typeof import('@core/lib/listings');
  const { setSchoolTz } = req('../packages/core/src/lib/campusclock.ts') as typeof import('@core/lib/campusclock');
  // 밤 10시 30분 보스턴 = 아직 같은 날, 그런데 UTC 로는 다음 날
  const iso = '2026-10-21T02:30:00Z';
  setSchoolTz('America/New_York');
  assert.equal(campusDate(iso), '2026-10-20');
  setSchoolTz('Asia/Tokyo');
  assert.equal(campusDate(iso), '2026-10-21');
  setSchoolTz(undefined);
  assert.equal(campusDate(iso), '2026-10-20', 'default stays Pacific');
  assert.equal(normalizeTermLabel('Autumn 2026'), 'Autumn 2026');
});

test('“No … Seminar Today” and cancelled notices are not events; &#160; is decoded', async () => {
  const { isNoticeNotEvent } = await import('./sources/opportunities');
  assert.ok(isNoticeNotEvent('No Bioengineering Seminar Today'));
  assert.ok(isNoticeNotEvent('CANCELLED: Topology Seminar'));
  assert.ok(!isNoticeNotEvent('Spectral Theory Seminar: If it looks like a duck…'));
  assert.ok(!isNoticeNotEvent('Nobel Laureate Talk'));
  const talk = localistToOpportunities(events, stanford, NOW).find((o) => /Seminar/.test(o.title))!;
  const src = events.find((e: { title: string }) => e.title === talk.title) as unknown as { title: string; description_text?: string };
  const copies = [{ ...src, id: 1, title: 'No Bioengineering Seminar Today' }, { ...src, id: 2, description_text: 'Honors those who served.&#160;Join us.' }];
  const ops = localistToOpportunities(copies as never[], stanford, NOW);
  assert.ok(!ops.some((o) => /^No /.test(o.title)));
  assert.ok(ops.some((o) => o.description.includes('served. Join us.')));
});

test('a broken numeric entity (&#551899002633743;) no longer stops the whole events import', async () => {
  const { decodeNumericEntities, charFromCode } = await import('./sources/entities');
  assert.equal(decodeNumericEntities('A&#8211;B &#x2019; &#551899002633743; &#160;C'), 'A–B ’   C'.replace(' C', ' C'));
  assert.equal(charFromCode(0x110000), '');
  assert.equal(charFromCode(0xd800), '');
  const talk = localistToOpportunities(events, stanford, NOW).find((o) => /Seminar/.test(o.title))!;
  const src = events.find((e: { title: string }) => e.title === talk.title) as unknown as { title: string; description_text?: string };
  assert.doesNotThrow(() => localistToOpportunities([{ ...src, description_text: 'Broken &#551899002633743; char' }] as never[], stanford, NOW));
});
