import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCampusGroupsRss } from './sources/opportunities';

test('CampusGroups rss_events: open upcoming events only; private and past left out; sign-in locations hidden; no emoji', () => {
  const xml = readFileSync(new URL('./fixtures/campusgroups-rss.xml', import.meta.url), 'utf8');
  const school = { id: 's_cornell', center: { lat: 42.45, lng: -76.47 }, tz: 'America/New_York' };
  const out = parseCampusGroupsRss(xml, 'https://cornell.campusgroups.com', school, new Date('2026-11-03T12:00:00Z'));
  assert.deepEqual(out.map((o) => o.title), ['Weekly Coffee Hour']);
  assert.equal(out[0].date, '2026-11-10T15:30:00.000Z');
  assert.equal(out[0].startTime, '10:30');
  assert.equal(out[0].place, undefined);
  assert.match(out[0].sourceUrl, /^https:\/\/cornell\.campusgroups\.com\/.+rsvp\?id=\d+/);
  assert.equal(out[0].cover.emoji, '');
});
