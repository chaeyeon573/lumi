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

test('noEmojiView: no emoji in what the app receives — posts, names, avatars, covers; ids and reaction keys untouched', async () => {
  const { noEmojiView } = await import('./noemoji');
  const snap = {
    posts: [{ id: 'p1', body: 'New café on Telegraph. The flat white is legit. Hosting a coffee meetup here tonight ☕', reactions: { '❤️': ['u1'] } }],
    users: [{ id: 'u_seoyeon', nickname: 'Sofia', bio: 'Guitar 🎸 and coffee', avatar: { emoji: '🎸', hue: 290 } }],
    opportunities: [{ id: 'op1', title: 'Hackathon 🚀', cover: { emoji: '📅', hue: 200 }, sourceUrl: 'https://x.org/?a=1' }],
    chatRooms: [{ id: 'c1', lastMessage: 'see you 😊' }],
  };
  const out = noEmojiView(snap);
  assert.equal(out.posts[0].body, 'New café on Telegraph. The flat white is legit. Hosting a coffee meetup here tonight');
  assert.deepEqual(out.posts[0].reactions, { '❤️': ['u1'] });
  assert.equal(out.users[0].bio, 'Guitar and coffee');
  assert.equal(out.users[0].avatar.emoji, 'S');
  assert.equal(out.opportunities[0].title, 'Hackathon');
  assert.equal(out.opportunities[0].cover.emoji, '');
  assert.equal(out.chatRooms[0].lastMessage, 'see you');
  assert.equal(noEmojiView({ a: 'x' }).a, 'x');
  assert.equal(snap.users[0].avatar.emoji, '🎸'); // input not changed
});
