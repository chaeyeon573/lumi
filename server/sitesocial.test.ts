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
  const org = (id: string): Organization => ({ id, name: id, logo: { emoji: 'X', hue: 1 }, type: 'club', schoolId: 's_x', verified: false, description: '', gallery: [], regularActivities: [], notices: [], followerIds: [], memberIds: [], adminIds: [], applicantIds: [], links: [{ label: 'Website', url: `https://${id}.example.edu/` }] });
  const pages: Record<string, string> = {
    'https://a.example.edu/': '<a href="https://instagram.com/club_a">x</a><a href="https://instagram.com/theschool">s</a>',
    'https://b.example.edu/': '<a href="https://instagram.com/theschool">s</a>',
    'https://c.example.edu/': '<a href="https://instagram.com/theschool">s</a>',
    'https://d.example.edu/': '',
  };
  const r = await enrichFromWebsites(['a', 'b', 'c', 'd'].map(org), async (u) => pages[u] ?? '');
  assert.equal(r.found, 1);
  assert.deepEqual(r.orgs[0].links?.map((l) => l.label), ['Website', 'Instagram']);
  assert.equal(r.orgs[0].links?.[1].url, 'https://www.instagram.com/club_a/');
  assert.deepEqual(r.droppedShared, ['theschool']);
});

test('relabelSocialWebsites: a Facebook/Instagram page given as "Website" becomes that label', async () => {
  const { relabelSocialWebsites } = await import('./sources/sitesocial');
  const o = { id: 'x', name: 'x', logo: { emoji: 'X', hue: 1 }, type: 'club', schoolId: 's_x', verified: false, description: '', gallery: [], regularActivities: [], notices: [], followerIds: [], memberIds: [], adminIds: [], applicantIds: [], links: [{ label: 'Website', url: 'https://www.facebook.com/groups/12345/' }] } as Organization;
  assert.deepEqual(relabelSocialWebsites(o).links, [{ label: 'Facebook', url: 'https://www.facebook.com/groups/12345' }]);
});
