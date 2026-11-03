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
