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

test('UCLA Community calendar (community.ucla.edu week pages): weeks in range, UTC start, host from the card, multi-day and webinars left out', async () => {
  const { parseUclaCommunityWeek, uclaCommunityWeeks } = await import('./sources/opportunities');
  const now = new Date('2026-11-05T03:00:00Z');
  const weeks = uclaCommunityWeeks(readFileSync(new URL('./fixtures/ucla-community-calendars.html', import.meta.url), 'utf8'), now, 30);
  assert.deepEqual(weeks, ['/term/fall-2026/week-6', '/term/fall-2026/week-7', '/term/fall-2026/week-8', '/term/fall-2026/week-9', '/term/fall-2026/week-10']);
  const school = { id: 's_ucla', name: 'UCLA', tz: 'America/Los_Angeles', center: { lat: 34.0689, lng: -118.4452 } };
  const out = parseUclaCommunityWeek(readFileSync(new URL('./fixtures/ucla-community-week.html', import.meta.url), 'utf8'), school, now, 30);
  const b = out.find((e) => e.title.startsWith('One Bead at a Time'));
  assert.equal(b?.date, '2026-11-09T21:00:00.000Z');
  assert.equal(b?.startTime, '13:00');
  assert.equal(b?.host, 'Institute of American Cultures');
  assert.equal(b?.place?.name, 'AISC Library, Campbell Hall Room 3214');
  assert.equal(b?.sourceUrl, 'https://community.ucla.edu/event/49e4a42f-684e-440d-9cbf-b0917bffceaa');
  assert.ok(!out.some((e) => /^At Eye Level/.test(e.title)) && out.some((e) => /^Opening Reception for Self Portraits/.test(e.title)), 'multi-day exhibit left out');
  assert.ok(!out.some((e) => /webinar/i.test(e.title)));
  assert.ok(!out.some((e) => /&amp;/.test(e.title + e.description)));
});

test('JSON-LD event page (USF usfca.edu): local start without zone read in the school time zone, trailing commas tolerated', async () => {
  const { parseJsonLdEvent, zonedToDate } = await import('./sources/opportunities');
  assert.equal(zonedToDate('2026-11-06T20:00:00', 'America/Los_Angeles').toISOString(), '2026-11-07T04:00:00.000Z');
  assert.equal(zonedToDate('2026-07-06T20:00:00', 'America/New_York').toISOString(), '2026-07-07T00:00:00.000Z');
  const html = readFileSync(new URL('./fixtures/usf-event-jsonld.html', import.meta.url), 'utf8');
  const school = { id: 's_usf', name: 'USF', tz: 'America/Los_Angeles', center: { lat: 37.7766, lng: -122.4506 } };
  const e = parseJsonLdEvent(html, 'https://www.usfca.edu/event/pasj-presents-lost-ballad-our-mechanical-ancestor/13570341', school, new Date('2026-11-05T12:00:00Z'), 7);
  assert.equal(e?.title, 'PASJ Presents: The Lost Ballad of our Mechanical Ancestor');
  assert.equal(e?.date, '2026-11-07T04:00:00.000Z');
  assert.equal(e?.startTime, '20:00');
  assert.equal(e?.place?.name, 'Lone Mountain Main 148 - Studio Theatre');
  assert.equal(parseJsonLdEvent(html, 'https://x', school, new Date('2026-11-08T00:00:00Z'), 7), null, 'past event');
});
