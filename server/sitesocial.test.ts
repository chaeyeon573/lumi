import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractSocial, enrichFromWebsites } from './sources/sitesocial';
import type { Organization } from '@core/types';

test('extractSocial: profile links only, share/post links skipped', () => {
  const html = `<a href="https://www.facebook.com/sharer/sharer.php?u=x">share</a><a href="https://www.instagram.com/p/ABC123/">post</a>
    <a href="https://instagram.com/EMSlugs_UCSC?hl=en">ig</a><a href='https://www.facebook.com/NotreDameASCE/'>fb</a>`;
  assert.deepEqual(extractSocial(html), { instagram: 'https://www.instagram.com/emslugs_ucsc/', facebook: 'https://www.facebook.com/NotreDameASCE' });
});

test('enrichFromWebsites: adds found accounts, drops a school footer account seen on 3+ club sites', async () => {
  const org = (id: string): Organization => ({ id, name: `Rocketry ${id}`, logo: { emoji: 'X', hue: 1 }, type: 'club', schoolId: 's_x', verified: false, description: '', gallery: [], regularActivities: [], notices: [], followerIds: [], memberIds: [], adminIds: [], applicantIds: [], links: [{ label: 'Website', url: `https://${id}.example.edu/` }] });
  const pages: Record<string, string> = {
    'https://a.example.edu/': '<a href="https://instagram.com/rocketry_a">x</a><a href="https://instagram.com/theschool">s</a>',
    'https://b.example.edu/': '<a href="https://instagram.com/theschool">s</a>',
    'https://c.example.edu/': '<a href="https://instagram.com/theschool">s</a>',
    'https://d.example.edu/': '',
  };
  const r = await enrichFromWebsites(['a', 'b', 'c', 'd'].map(org), async (u) => pages[u] ?? '');
  assert.equal(r.found, 1);
  assert.deepEqual(r.orgs[0].links?.map((l) => l.label), ['Website', 'Instagram']);
  assert.equal(r.orgs[0].links?.[1].url, 'https://www.instagram.com/rocketry_a/');
  assert.deepEqual(r.droppedShared, ['theschool']);
});

test('relabelSocialWebsites: a Facebook/Instagram page given as "Website" becomes that label', async () => {
  const { relabelSocialWebsites } = await import('./sources/sitesocial');
  const o = { id: 'x', name: 'x', logo: { emoji: 'X', hue: 1 }, type: 'club', schoolId: 's_x', verified: false, description: '', gallery: [], regularActivities: [], notices: [], followerIds: [], memberIds: [], adminIds: [], applicantIds: [], links: [{ label: 'Website', url: 'https://www.facebook.com/groups/12345/' }] } as Organization;
  assert.deepEqual(relabelSocialWebsites(o).links, [{ label: 'Facebook', url: 'https://www.facebook.com/groups/12345' }]);
});

test('enrichFromWebsites: a dead website (404) link is removed', async () => {
  const { DEAD } = await import('./sources/sitesocial');
  const o = { id: 'x', name: 'x', logo: { emoji: 'X', hue: 1 }, type: 'club', schoolId: 's_x', verified: false, description: '', gallery: [], regularActivities: [], notices: [], followerIds: [], memberIds: [], adminIds: [], applicantIds: [], links: [{ label: 'Website', url: 'https://gone.example.com/' }, { label: 'Instagram', url: 'https://www.instagram.com/x/' }] } as Organization;
  const r = await enrichFromWebsites([o], async () => DEAD);
  assert.equal(r.deadLinks, 1);
  assert.deepEqual(r.orgs[0].links?.map((l) => l.label), ['Instagram']);
});

test('extractSocial: facebook pages/<name>/<id> keeps the id', () => {
  assert.equal(extractSocial('<a href="https://www.facebook.com/pages/Stanford-Women-in-Business/123456789">f</a>').facebook, 'https://www.facebook.com/pages/Stanford-Women-in-Business/123456789');
});

test('relatedHandle: club accounts pass, a personal profile does not', async () => {
  const { relatedHandle } = await import('./sources/sitesocial');
  assert.ok(relatedHandle('https://www.instagram.com/tradersatberkeley/', 'Traders at Berkeley'));
  assert.ok(relatedHandle('https://www.instagram.com/calbeeps/', 'Berkeley Environmental Economics and Policy Students', 'https://beeps.studentorg.berkeley.edu/'));
  assert.ok(relatedHandle('https://www.facebook.com/berkeleyphichi', 'Phi Chi Pre-Health Fraternity', 'https://phichi.studentorg.berkeley.edu/'));
  assert.ok(!relatedHandle('https://www.facebook.com/Sitara.Bellam', 'South Indian Society', 'https://southindiansociety.studentorg.berkeley.edu/'));
});

test('relabelSocialWebsites: a Discord invite in the website field is labeled Discord', async () => {
  const { relabelSocialWebsites } = await import('./sources/sitesocial');
  const o = { id: 'x', name: 'Mahjong', links: [{ label: 'Directory', url: 'https://uchicago.campuslabs.com/engage/organization/mahjong' }, { label: 'Website', url: 'https://discord.gg/H8kzC6jmGF' }] } as never;
  assert.deepEqual((relabelSocialWebsites(o) as { links: unknown[] }).links, [{ label: 'Directory', url: 'https://uchicago.campuslabs.com/engage/organization/mahjong' }, { label: 'Discord', url: 'https://discord.gg/H8kzC6jmGF' }]);
});

test('isLoginOnlyLink: CampusGroups club pages on school hosts are login-only, Engage pages are public', async () => {
  const { isLoginOnlyLink } = await import('@core/lib/orglinks');
  assert.equal(isLoginOnlyLink('https://lionhub.columbia.edu/student_community?club_id=35599'), true);
  assert.equal(isLoginOnlyLink('https://yaleconnect.yale.edu/feeds?type=club&type_id=74501'), true);
  assert.equal(isLoginOnlyLink('https://nyu.campuslabs.com/engage/organization/pre-soma'), false);
  assert.equal(isLoginOnlyLink('https://synapsecolumbia.wixsite.com/synapse'), false);
});

test('relabelSocialWebsites: a Google Form given as "Website" is a sign-up form (Lehigh 2026-11-04)', async () => {
  const { relabelSocialWebsites } = await import('./sources/sitesocial');
  const o = relabelSocialWebsites({ id: 'x', name: 'Inspire Her', links: [{ label: 'Website', url: 'https://docs.google.com/forms/d/e/abc/viewform' }, { label: 'Website', url: 'https://inspireher.org/' }] } as never);
  assert.deepEqual(o.links, [{ label: 'Sign-up form', url: 'https://docs.google.com/forms/d/e/abc/viewform' }, { label: 'Website', url: 'https://inspireher.org/' }]);
});

test('relabelSocialWebsites: a WhatsApp/Slack invite given as "Website" is a group chat (2026-11-04)', async () => {
  const { relabelSocialWebsites } = await import('./sources/sitesocial');
  const o = relabelSocialWebsites({ id: 'x', name: 'Bird Buddies', links: [{ label: 'Website', url: 'https://chat.whatsapp.com/FtJm6iB0tvgJDGNV3bns8V' }] } as never);
  assert.deepEqual(o.links, [{ label: 'Group chat', url: 'https://chat.whatsapp.com/FtJm6iB0tvgJDGNV3bns8V' }]);
});

test('isPlaceholderSite: "I do not have a website" placeholders are not websites (Cornell 2026-11-04)', async () => {
  const { isPlaceholderSite } = await import('./sources/sitesocial');
  assert.equal(isPlaceholderSite('https://www.idonothaveawebsite.com/'), true);
  assert.equal(isPlaceholderSite('https://example.com/'), true);
  assert.equal(isPlaceholderSite('https://www.cornelldiabeteslink.org/'), false);
});

test('relabelSocialWebsites: mailing-list sign-ups given as "Website" are mailing lists (2026-11-04)', async () => {
  const { relabelSocialWebsites } = await import('./sources/sitesocial');
  const o = relabelSocialWebsites({ id: 'x', name: 'DIG', links: [{ label: 'Website', url: 'https://mailchi.mp/abc/join' }, { label: 'Website', url: 'https://outlook.office365.com/groups/groupsubscription?action=join&smtp=dig%40gowustl.onmicrosoft.com' }] } as never);
  assert.deepEqual(o.links?.map((l) => l.label), ['Mailing list', 'Mailing list']);
});

test('relabelSocialWebsites: a Google Doc given as "Website" is a document (2026-11-04)', async () => {
  const { relabelSocialWebsites } = await import('./sources/sitesocial');
  const o = relabelSocialWebsites({ id: 'x', name: 'Y', links: [{ label: 'Website', url: 'https://docs.google.com/document/d/abc/edit' }] } as never);
  assert.equal(o.links?.[0].label, 'Document');
});

test('relabelSocialWebsites: GroupMe / LinkedIn / YouTube given as "Website" get their own labels (2026-11-04)', async () => {
  const { relabelSocialWebsites } = await import('./sources/sitesocial');
  const o = relabelSocialWebsites({ id: 'x', name: 'Y', links: [{ label: 'Website', url: 'https://groupme.com/join_group/123/abc' }, { label: 'Website', url: 'https://www.linkedin.com/company/y-club' }, { label: 'Website', url: 'https://www.youtube.com/@yclub' }] } as never);
  assert.deepEqual(o.links?.map((l) => l.label), ['Group chat', 'LinkedIn', 'YouTube']);
});

test('isSignInPage: an old school Google Site that now asks for Google sign-in is not a public link', async () => {
  const { isSignInPage } = await import('./sources/sitesocial');
  const { readFileSync } = await import('node:fs');
  // fixture: the head of the real page sites.google.com/a/uw.edu/uwspike/ returned on 2026-11-05 (scripts and per-request nonces removed)
  assert.equal(isSignInPage(readFileSync(new URL('./fixtures/google-signin.html', import.meta.url), 'utf8')), true);
  assert.equal(isSignInPage('<html><head><title>BLiSS at The University of Michigan</title></head><body>Sign in to see more</body></html>'), false);
});

test('isHijackedPage: an expired club domain now showing a gambling spam page is not the club', async () => {
  const { isHijackedPage } = await import('./sources/sitesocial');
  assert.equal(isHijackedPage('<html><head><title>Slot Pulsa Indosat 5000: Pilihan Deposit Minimum Serta Gampang Menang</title></head></html>'), true);
  assert.equal(isHijackedPage('<html><head><title>Stanford Poker Club</title></head></html>'), false);
  assert.equal(isHijackedPage('<html><head><title>Student Veterinary Emergency & Critical Care Society</title></head></html>'), false);
  assert.equal(isHijackedPage('<html><head><title>小小影视 - 院线级高清影视免费畅享 | 最新电影热播剧集综艺动漫漫画</title></head></html>'), true);
  assert.equal(isHijackedPage('<html><head><title>Chinese Film Club 中国电影社</title></head></html>'), false);
});
