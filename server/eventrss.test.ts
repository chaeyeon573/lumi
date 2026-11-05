import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseEventRss } from './sources/opportunities';

test('event RSS (Caltech events.caltech.edu/calendar/rss): pubDate is the start, exhibits left out, entities decoded, no emoji', () => {
  const xml = readFileSync(new URL('./fixtures/caltech-events.rss', import.meta.url), 'utf8');
  const school = { id: 's_caltech', name: 'Caltech', tz: 'America/Los_Angeles', center: { lat: 34.1377, lng: -118.1253 } };
  const out = parseEventRss(xml, school, new Date('2026-11-03T20:00:00Z'), 30);
  const w = out.find((e) => e.title.startsWith('Watson Lecture - Katie Bouman'));
  assert.equal(w?.date, '2026-11-05T03:30:00.000Z'); // Wed Nov 4 7:30 PM Pacific
  assert.equal(w?.startTime, '19:30');
  assert.equal(w?.sourceUrl, 'https://events.caltech.edu/calendar/watson-lecture-katie-bouman');
  assert.ok(!out.some((e) => /Exhibition/.test(e.title)));
  assert.ok(out.some((e) => e.title === 'CALTECH GLEE CLUB & CHAMBER SINGERS CONCERTS'));
  assert.ok(!out.some((e) => /&amp;/.test(e.title + e.description)));
  assert.ok(!out.some((e) => Date.parse(e.date!) > Date.parse('2026-12-03T20:00:00Z')));
});

test('Tribe events (UCSC events.ucsc.edu wp-json): utc_start_date is UTC, exhibits and Zoom-only left out, entities decoded', async () => {
  const { parseTribeEvents } = await import('./sources/opportunities');
  const j = JSON.parse(readFileSync(new URL('./fixtures/ucsc-tribe.json', import.meta.url), 'utf8'));
  const school = { id: 's_ucsc', name: 'UC Santa Cruz', tz: 'America/Los_Angeles', center: { lat: 36.9916, lng: -122.0583 } };
  const out = parseTribeEvents(j.events, school, new Date('2026-11-05T02:00:00Z'), 30);
  const s = out.find((e) => e.title.startsWith('BME 280B Seminar: Dr. Jeff Hasty'));
  assert.equal(s?.date, '2026-11-05T19:40:00.000Z');
  assert.equal(s?.startTime, '11:40');
  assert.equal(s?.place?.name, 'Physical Sciences Building');
  assert.ok(s?.tags?.includes('talk'));
  assert.ok(/events\.ucsc\.edu\/event\//.test(s!.sourceUrl));
  assert.ok(!out.some((e) => /Carlos Motta/.test(e.title)), 'exhibit left out');
  assert.ok(!out.some((e) => /Virtual Open House/.test(e.title)), 'Zoom-only left out');
  assert.ok(!out.some((e) => /&amp;|&#8211;/.test(e.title + e.description)));
});
