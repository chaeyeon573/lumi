import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withoutEmoji, stripEmoji } from '@core/lib/orglinks';

const org = (name: string, emoji: string, url?: string) => ({ name, logo: { emoji, hue: 1, ...(url ? { url } : {}) } });

test('no emoji on screen: trailing 💙 removed, emoji logos become initials', () => {
  assert.equal(stripEmoji('Haas Marketing Club 💙'), 'Haas Marketing Club');
  assert.deepEqual(withoutEmoji(org('DeTrash@Berkeley 💙', '🎯')), org('DeTrash@Berkeley', 'D'));
  assert.deepEqual(withoutEmoji(org('Theta Xi', '🏛️')).logo.emoji, 'TX');
  assert.deepEqual(withoutEmoji(org('Machine Learning at Berkeley', '🎯')).logo.emoji, 'ML');
});

test('kept: real logos, Greek letters, initials already there', () => {
  const a = org('Alpha Kappa Psi', 'ΑΚΨ'); assert.equal(withoutEmoji(a), a);
  const b = org('Cal Blueprint', '🎯', 'https://x/logo.png'); assert.equal(withoutEmoji(b).logo.emoji, '🎯');
  const c = org('Codebase', 'CB'); assert.equal(withoutEmoji(c), c);
});

test('cleanShareUrl / publicLinks: share-tracking tags are removed, real query kept', async () => {
  const { cleanShareUrl, publicLinks } = await import('@core/lib/orglinks');
  assert.equal(cleanShareUrl('https://www.instagram.com/uncvtt?igsh=MW5tNXFhcTdhMmJkOA=='), 'https://www.instagram.com/uncvtt');
  assert.equal(cleanShareUrl('https://www.instagram.com/nuchapterdst?igsh=YnNm&utm_source=qr'), 'https://www.instagram.com/nuchapterdst');
  assert.equal(cleanShareUrl('https://www.instagram.com/usac_tsr/?hl=en'), 'https://www.instagram.com/usac_tsr/');
  assert.equal(cleanShareUrl('https://example.org/page?id=5'), 'https://example.org/page?id=5');
  assert.equal(publicLinks([{ label: 'Instagram', url: 'https://www.instagram.com/x?igsh=abc' }])[0].url, 'https://www.instagram.com/x');
});
