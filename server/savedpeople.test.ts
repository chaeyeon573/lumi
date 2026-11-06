/**
 * Saved people folders + private notes (S077, Lumi+ extra) — private to the owner.
 *   - each person sees only their own folders and notes; nothing about it is in anyone's snapshot or patches
 *   - only people you saved get an entry; blocked people (either way) drop out of the view
 *   - removing a folder keeps the people saved; limits on folders and note length
 *   - account deletion removes the book and every note about that person
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Snapshot } from '@core/api/types';
import * as seed from '@core/data/seed.en';
import { SAVED_PEOPLE_LIMITS, SavedPeopleError } from '@core/lib/savedpeople';
import { createSavedPeopleService, SAVED_PEOPLE } from './savedpeople';
import { snapshotFor } from './view';

const ME = 'u_me', MAYA = 'u_jimin', EMMA = 'u_yuna', HANNAH = 'u_hana';

function setup() {
  const db = structuredClone({
    users: seed.users, schools: seed.schools, organizations: [], activities: [], participations: [], posts: [], relationships: seed.relationships, proposals: [],
    chatRooms: [], notifications: [], reports: [], opportunities: [], opportunityIntents: [], timePolls: [], games: [], rides: [],
  }) as Snapshot;
  // seed: u_me saved Emma; Maya and Hannah saved u_me
  db.relationships.blocks = [];
  const docs = new Map<string, { id: string }>();
  const writes: string[] = [];
  const store = {
    async listDocs<T>() { return [...docs.values()] as T[]; },
    async putDocs(c: string, items: { id: string }[]) { writes.push(c); for (const i of items) docs.set(i.id, structuredClone(i)); },
    async removeDocs(c: string, ids: string[]) { writes.push(c); for (const i of ids) docs.delete(i); },
  };
  return { db, docs, writes, svc: createSavedPeopleService({ db: () => db, store }) };
}
const refused = (fn: () => unknown, status: number) => assert.throws(fn, (e: unknown) => e instanceof SavedPeopleError && e.status === status);

test('saved people: folders and notes belong to their owner only', async () => {
  const { svc, db, docs, writes } = setup();
  const study = svc.createFolder(ME, '  Study   partners ').folders[0];
  assert.equal(study.name, 'Study partners');
  const v = svc.setEntry(ME, EMMA, { folderId: study.id, note: 'Met at CS 61A review — ask about the midterm' });
  assert.equal(v.entries[EMMA].note, 'Met at CS 61A review — ask about the midterm');
  assert.equal(v.folders[0].count, 1);
  // Emma (the person the note is about) and anyone else see nothing of it
  assert.deepEqual(svc.view(EMMA), { folders: [], entries: {} });
  assert.deepEqual(svc.view(MAYA), { folders: [], entries: {} });
  // it is stored only in the owner's own document, and never in anyone's snapshot
  assert.deepEqual([...docs.keys()], [ME]);
  assert.ok(writes.every((c) => c === SAVED_PEOPLE));
  for (const viewer of [ME, EMMA, MAYA]) assert.doesNotMatch(JSON.stringify(snapshotFor(db, viewer)), /Met at CS 61A review/);
  // reload from the store keeps it
  await svc.load();
  assert.equal(svc.view(ME).entries[EMMA].folderId, study.id);
});

test('saved people: only people you saved, never yourself, and blocks hide the entry both ways', () => {
  const { svc, db } = setup();
  refused(() => svc.setEntry(ME, MAYA, { note: 'not saved' }), 404); // Maya saved me, I didn't save her
  refused(() => svc.setEntry(ME, ME, { note: 'me' }), 404);
  refused(() => svc.setEntry(ME, 'u_nobody', { note: 'x' }), 404);
  svc.setEntry(ME, EMMA, { note: 'coffee next week' });
  db.relationships.blocks.push({ fromId: EMMA, toId: ME });
  assert.deepEqual(svc.view(ME).entries, {});
  refused(() => svc.setEntry(ME, EMMA, { note: 'again' }), 404);
  db.relationships.blocks = [{ fromId: ME, toId: EMMA }];
  assert.deepEqual(svc.view(ME).entries, {});
  db.relationships.blocks = [];
  assert.equal(svc.view(ME).entries[EMMA].note, 'coffee next week');
  // unsaving hides it too
  db.relationships.likes = db.relationships.likes.filter((l) => !(l.fromId === ME && l.toId === EMMA));
  assert.deepEqual(svc.view(ME).entries, {});
});

test('saved people: folder rules — names, duplicates, limits; removing a folder keeps the people', () => {
  const { svc } = setup();
  refused(() => svc.createFolder(ME, '   '), 400);
  const f = svc.createFolder(ME, 'Clubs').folders[0];
  refused(() => svc.createFolder(ME, 'clubs'), 409);
  assert.equal(svc.renameFolder(ME, f.id, 'Club friends').folders[0].name, 'Club friends');
  refused(() => svc.renameFolder(ME, 'sf_nope', 'x'), 404);
  refused(() => svc.renameFolder(MAYA, f.id, 'mine now'), 404); // someone else's folder id is not theirs
  svc.setEntry(ME, EMMA, { folderId: f.id });
  refused(() => svc.setEntry(ME, EMMA, { folderId: 'sf_nope' }), 404);
  const after = svc.removeFolder(ME, f.id);
  assert.deepEqual(after.folders, []);
  assert.equal(after.entries[EMMA], undefined); // no folder and no note → nothing left, Emma is still saved
  for (let i = 1; i < SAVED_PEOPLE_LIMITS.folders + 1; i++) svc.createFolder(ME, `F${i}`);
  refused(() => svc.createFolder(ME, 'one too many'), 400);
  const long = svc.setEntry(ME, EMMA, { note: 'x'.repeat(SAVED_PEOPLE_LIMITS.note + 10) });
  assert.equal(long.entries[EMMA].note!.length, SAVED_PEOPLE_LIMITS.note);
  // clearing the note and folder removes the entry
  assert.equal(svc.setEntry(ME, EMMA, { note: null, folderId: null }).entries[EMMA], undefined);
});

test('saved people: account deletion removes the book and every note about that person', () => {
  const { svc, db, docs } = setup();
  db.relationships.likes.push({ fromId: HANNAH, toId: EMMA, createdAt: '2026-11-01T00:00:00Z' });
  svc.setEntry(ME, EMMA, { note: 'from me' });
  svc.setEntry(HANNAH, ME, { note: 'about me' });
  svc.setEntry(HANNAH, EMMA, { note: 'about Emma' });
  svc.forgetUser(ME);
  assert.equal(docs.has(ME), false);
  assert.equal(svc.raw(HANNAH)?.entries[ME], undefined);
  assert.equal(svc.raw(HANNAH)?.entries[EMMA]?.note, 'about Emma');
});
