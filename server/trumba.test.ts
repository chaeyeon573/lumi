import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseTrumbaRss } from './sources/opportunities';

test('Trumba RSS (Harvard Gazette calendar): pubDate is the start, Harvard Key events and ongoing exhibits left out, all-day has no time', () => {
  const xml = readFileSync(new URL('./fixtures/harvard-trumba.rss', import.meta.url), 'utf8');
  const school = { id: 's_harvard', name: 'Harvard', tz: 'America/New_York', center: { lat: 42.3744, lng: -71.1169 } };
  const out = parseTrumbaRss(xml, school, new Date('2026-11-05T05:00:00Z'), 30);
  const p = out.find((e) => e.title === 'Morning Prayers');
  assert.equal(p?.date, '2026-11-09T13:30:00.000Z');
  assert.equal(p?.startTime, '08:30');
  assert.ok(!out.some((e) => /^Harvard Pop Center Social Demography/.test(e.title)), 'Harvard Key required');
  assert.ok(!out.some((e) => /From Iran|^Exhibition/.test(e.title)));
  assert.ok(!out.some((e) => /&amp;|&lt;|&#8217;/.test(e.title + e.description + (e.place?.name ?? ''))));
});
