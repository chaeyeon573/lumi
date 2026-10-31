import { test } from 'node:test';
import assert from 'node:assert/strict';
import { acceptUpload, sniffImage, MAX_MEDIA_BYTES, dayStart } from './media';
import { FileStore } from './store';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(100)]);
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(50)]);

test('only real JPEG/PNG/WebP bytes are accepted, whatever the name says', () => {
  assert.equal(sniffImage(jpeg), 'image/jpeg');
  assert.equal(sniffImage(webp), 'image/webp');
  assert.equal(sniffImage(Buffer.from('<svg onload=alert(1)>')), null);
  const ok = acceptUpload('u1', `data:image/webp;base64,${webp.toString('base64')}`);
  assert.ok('file' in ok && ok.file.mime === 'image/webp' && /^[a-f0-9]{24}$/.test(ok.file.id));
  assert.ok('error' in acceptUpload('u1', Buffer.from('<html>').toString('base64')));
  assert.ok('error' in acceptUpload('u1', Buffer.concat([jpeg, Buffer.alloc(MAX_MEDIA_BYTES)]).toString('base64')), 'too large');
  assert.ok('error' in acceptUpload('u1', 12));
});

test('photos are stored outside the snapshot, counted per day, and deleted with the account', async () => {
  const store = new FileStore(path.join(mkdtempSync(path.join(tmpdir(), 'media-')), 'db.json'));
  await store.init();
  const now = new Date('2026-10-31T10:00:00Z');
  const r = acceptUpload('u1', jpeg.toString('base64'), now);
  assert.ok('file' in r);
  await store.putMedia(r.file);
  assert.deepEqual((await store.getMedia(r.file.id))?.data, jpeg);
  assert.equal(await store.countMediaSince('u1', dayStart(now)), 1);
  assert.equal(await store.countMediaSince('u1', dayStart(new Date('2026-11-01T01:00:00Z'))), 0, 'new day');
  await store.forgetUser('u1');
  assert.equal(await store.getMedia(r.file.id), null);
});

test('a photo closes when its post is deleted, auto-hidden by reports, or its author is suspended', async () => {
  const { mediaVisible } = await import('./media');
  const now = new Date('2026-10-31T12:00:00Z');
  const post = { id: 'p1', authorId: 'u1', media: [{ url: 'api/media/abc' }] };
  const open = { hidden: new Map(), suspended: new Set<string>() };
  assert.equal(mediaVisible('abc', '2026-10-01T00:00:00Z', [post], open, now), true, 'on a live post');
  assert.equal(mediaVisible('abc', '2026-10-01T00:00:00Z', [], open, now), false, 'post deleted');
  assert.equal(mediaVisible('abc', '2026-10-31T11:00:00Z', [], open, now), true, 'just uploaded, still composing');
  assert.equal(mediaVisible('abc', '2026-10-31T09:00:00Z', [], open, now), false, 'unattached for over 2 hours');
  assert.equal(mediaVisible('abc', '2026-10-01T00:00:00Z', [post], { hidden: new Map([['p1', 'u1']]), suspended: new Set() }, now), false, 'hidden by 3 reports');
  assert.equal(mediaVisible('abc', '2026-10-01T00:00:00Z', [post], { hidden: new Map(), suspended: new Set(['u1']) }, now), false, 'author suspended');
});
