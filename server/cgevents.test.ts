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

test('CampusGroups rss_events: public = privacyLevel 0 whatever the school calls its categories', () => {
  const item = (cat: string, level: string) => `<item><eventId>${cat.length}${level}</eventId><title>Meet ${cat}</title><category>${cat}</category><privacyLevel>${level}</privacyLevel><eventStartDateTime>2026-11-12T19:00:00.0000000-05:00</eventStartDateTime><link>https://x/rsvp?id=1</link></item>`;
  const school = { id: 's_yale', center: { lat: 41.3, lng: -72.9 }, tz: 'America/New_York' };
  const out = parseCampusGroupsRss(`<rss>${item('Group Meeting', '0')}${item('Rehearsal', '13')}${item('Private Meeting', '0')}</rss>`, 'https://x', school, new Date('2026-11-03T12:00:00Z'));
  assert.deepEqual(out.map((o) => o.title), ['Meet Group Meeting']);
});
