import { test } from 'node:test';
import assert from 'node:assert/strict';
import { socialLinks, engageLinks, campusGroupsWebsite, pennClubToOrg, COUNCIL_RE, notCouncil, studentGovToOrg } from './sources/orglinks';

test('engageLinks: real Notre Dame socialMedia shape → labeled links, empties dropped', () => {
  const l = engageLinks({ ExternalWebsite: 'https://asce.nd.edu/', InstagramUrl: 'https://www.instagram.com/notredame_asce/', FacebookUrl: 'https://www.facebook.com/NotreDameASCE', LinkedInUrl: '', TwitterUrl: null, YoutubeUrl: '' });
  assert.deepEqual(l.map((x) => x.label), ['Website', 'Instagram', 'Facebook']);
});

test('socialLinks: adds https, rejects wrong-site values and "Hidden"', () => {
  const l = socialLinks({ website: 'asce.nd.edu', instagram: 'https://facebook.com/oops', facebook: 'Hidden' });
  assert.deepEqual(l, [{ label: 'Website', url: 'https://asce.nd.edu/' }]);
});

test('campusGroupsWebsite: first outside link, not the directory itself', () => {
  const html = '<a href="https://engage.mit.edu/ASAP/">x</a><a href="http://skiing.mit.edu/">y</a>';
  assert.equal(campusGroupsWebsite(html, 'https://engage.mit.edu'), 'http://skiing.mit.edu/');
  assert.equal(campusGroupsWebsite('<a href="https://engage.mit.edu/ADC/">x</a>', 'https://engage.mit.edu'), undefined);
});

test('pennClubToOrg: Penn Clubs record → club with directory + Instagram', () => {
  const o = pennClubToOrg({ code: 'future-black-men-in-white-coats', name: 'Future Black Men in White Coats at Penn', description: '<p>Healthcare club</p>', tags: [{ name: 'Cultural' }], instagram: 'https://instagram.com/Upenn_fbmwc/' });
  assert.equal(o.type, 'club');
  assert.equal(o.schoolId, 's_upenn');
  assert.equal(o.description, 'Healthcare club');
  assert.deepEqual(o.links?.map((l) => l.label), ['Penn Clubs', 'Instagram']);
  assert.equal(pennClubToOrg({ code: 'ua', name: 'Undergraduate Assembly (UA)' }).type, 'council');
});

test('council: student government yes; COSO group type and grad department associations no', () => {
  assert.ok(COUNCIL_RE.test('Student Government / Senate'));
  assert.ok(COUNCIL_RE.test('Graduate Student Government'));
  assert.ok(!COUNCIL_RE.test('Anthropology Graduate Student Association'));
  assert.ok(!COUNCIL_RE.test(notCouncil('Council on Student Organizations Pre-Professional Arab Student Association')));
});

test('studentGovToOrg: verified council with official links', () => {
  const o = studentGovToOrg({ school_id: 's_dartmouth', name: 'Dartmouth Student Government', website: 'https://sg.dartmouth.edu/', instagram: 'http://instagram.com/dartmouthstudentgovernment' });
  assert.equal(o.type, 'council'); assert.equal(o.verified, true);
  assert.deepEqual(o.links?.map((l) => l.label), ['Website', 'Instagram']);
});
