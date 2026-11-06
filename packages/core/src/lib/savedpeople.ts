/**
 * Saved people — folders and private notes (S077 extension, a Lumi+ extra; open to everyone while LUMI_PLUS is off).
 *
 * Rules
 *   - One book per owner: their folders and, per saved person, a folder and/or a note. Only the owner reads or writes
 *     it — every call takes the owner from the session, there is no way to name another owner, and nothing here is
 *     ever put in a Patch or sent to the person a note is about.
 *   - Only people the owner has saved (relationships.likes from the owner) get an entry. Blocked people (either way)
 *     and deleted accounts drop out of the view; account deletion removes the book and every entry about that person
 *     (server/savedpeople.ts forgetUser).
 *   - Short: up to 20 folders, folder names 40 characters, notes 500.
 * Storage: store document collection `savedPeople` (outside the snapshot, never in anyone's bootstrap).
 */
import type { ID, Relationships } from '@core/types';

export interface SavedFolder { id: ID; name: string; createdAt: string }
export interface SavedEntry { folderId?: ID; note?: string; updatedAt: string }
/** id = the owner's user id */
export interface SavedPeopleBook { id: ID; folders: SavedFolder[]; entries: Record<ID, SavedEntry> }
export interface SavedPeopleView { folders: (SavedFolder & { count: number })[]; entries: Record<ID, SavedEntry> }
export interface SavedEntryInput { folderId?: ID | null; note?: string | null }

export const SAVED_PEOPLE_LIMITS = { folders: 20, folderName: 40, note: 500 } as const;

export class SavedPeopleError extends Error { constructor(public status: number, message: string) { super(message); } }

export interface SavedPeopleDeps {
  get(owner: ID): SavedPeopleBook | undefined;
  put(book: SavedPeopleBook): void;
  drop(owner: ID): void;
  all(): SavedPeopleBook[];
  relationships(): Pick<Relationships, 'likes' | 'blocks'>;
  userExists(id: ID): boolean;
  uid(prefix: string): ID;
  now?(): Date;
}

const clean = (s: unknown, max: number) => (typeof s === 'string' ? s.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, max) : '');
const oneLine = (s: unknown, max: number) => clean(typeof s === 'string' ? s.replace(/\s+/g, ' ') : s, max);

export function createSavedPeople(deps: SavedPeopleDeps) {
  const now = () => (deps.now?.() ?? new Date()).toISOString();
  const book = (owner: ID): SavedPeopleBook => structuredClone(deps.get(owner) ?? { id: owner, folders: [], entries: {} });
  const saved = (owner: ID, person: ID) => deps.relationships().likes.some((l) => l.fromId === owner && l.toId === person);
  const blocked = (a: ID, b: ID) => deps.relationships().blocks.some((x) => (x.fromId === a && x.toId === b) || (x.fromId === b && x.toId === a));
  const shown = (owner: ID, person: ID) => deps.userExists(person) && saved(owner, person) && !blocked(owner, person);

  function view(owner: ID): SavedPeopleView {
    const b = book(owner);
    const entries = Object.fromEntries(Object.entries(b.entries).filter(([id]) => shown(owner, id)));
    const folders = b.folders.map((f) => ({ ...f, count: Object.values(entries).filter((e) => e.folderId === f.id).length }));
    return { folders, entries };
  }
  const save = (b: SavedPeopleBook) => {
    if (!b.folders.length && !Object.keys(b.entries).length) deps.drop(b.id); else deps.put(b);
  };
  const folderName = (b: SavedPeopleBook, raw: unknown, except?: ID) => {
    const name = oneLine(raw, SAVED_PEOPLE_LIMITS.folderName);
    if (!name) throw new SavedPeopleError(400, 'Give the folder a name.');
    if (b.folders.some((f) => f.id !== except && f.name.toLowerCase() === name.toLowerCase())) throw new SavedPeopleError(409, 'You already have a folder with that name.');
    return name;
  };

  return {
    view,
    createFolder(owner: ID, name: unknown): SavedPeopleView {
      const b = book(owner);
      if (b.folders.length >= SAVED_PEOPLE_LIMITS.folders) throw new SavedPeopleError(400, `You can have up to ${SAVED_PEOPLE_LIMITS.folders} folders.`);
      b.folders.push({ id: deps.uid('sf'), name: folderName(b, name), createdAt: now() });
      save(b);
      return view(owner);
    },
    renameFolder(owner: ID, folderId: ID, name: unknown): SavedPeopleView {
      const b = book(owner);
      const f = b.folders.find((x) => x.id === folderId);
      if (!f) throw new SavedPeopleError(404, 'That folder is gone.');
      f.name = folderName(b, name, folderId);
      save(b);
      return view(owner);
    },
    /** the people in it stay saved — they just leave the folder */
    removeFolder(owner: ID, folderId: ID): SavedPeopleView {
      const b = book(owner);
      if (!b.folders.some((x) => x.id === folderId)) throw new SavedPeopleError(404, 'That folder is gone.');
      b.folders = b.folders.filter((x) => x.id !== folderId);
      for (const [id, e] of Object.entries(b.entries)) {
        if (e.folderId !== folderId) continue;
        delete e.folderId;
        if (!e.note) delete b.entries[id];
      }
      save(b);
      return view(owner);
    },
    /** folderId: null removes from the folder · note: null or '' removes the note. Fields left out stay as they are */
    setEntry(owner: ID, person: ID, input: SavedEntryInput): SavedPeopleView {
      if (person === owner || !shown(owner, person)) throw new SavedPeopleError(404, 'Save this person first.');
      const b = book(owner);
      const e: SavedEntry = { ...(b.entries[person] ?? {}), updatedAt: now() };
      if (input && 'folderId' in input) {
        if (input.folderId == null || input.folderId === '') delete e.folderId;
        else if (!b.folders.some((f) => f.id === input.folderId)) throw new SavedPeopleError(404, 'That folder is gone.');
        else e.folderId = input.folderId;
      }
      if (input && 'note' in input) {
        if (typeof input.note === 'string' && input.note.length > SAVED_PEOPLE_LIMITS.note * 2) throw new SavedPeopleError(400, `Notes can be up to ${SAVED_PEOPLE_LIMITS.note} characters.`);
        const note = clean(input.note, SAVED_PEOPLE_LIMITS.note);
        if (note) e.note = note; else delete e.note;
      }
      if (e.folderId || e.note) b.entries[person] = e; else delete b.entries[person];
      save(b);
      return view(owner);
    },
    /** account deletion: the person's own book, and every entry anyone wrote about them */
    forgetUser(id: ID) {
      deps.drop(id);
      for (const b of deps.all()) {
        if (!(id in b.entries)) continue;
        const next = structuredClone(b);
        delete next.entries[id];
        save(next);
      }
    },
  };
}
export type SavedPeople = ReturnType<typeof createSavedPeople>;
