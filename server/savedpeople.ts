/**
 * Saved people folders + private notes (S077, Lumi+ extra) — storage and routes. Rules: @core/lib/savedpeople.
 *
 *   POST /api/saved-people/view                                → SavedPeopleView (mine)
 *   POST /api/saved-people/folder        { name }              → create a folder
 *   POST /api/saved-people/folder/rename { folderId, name }    → rename
 *   POST /api/saved-people/folder/remove { folderId }          → remove (people stay saved)
 *   POST /api/saved-people/entry         { personId, folderId?, note? }  → put a saved person in a folder / write a note
 *
 * The owner is always the session's user — there is no parameter for anyone else. Nothing here goes into a Patch,
 * the SSE stream or another person's bootstrap. With LUMI_PLUS on, only Lumi+ members may use it (403 otherwise);
 * with it off (default) everyone can. Stored in the document collection `savedPeople`; forgetUser runs on account deletion.
 */
import type { Express, Request, Response, NextFunction } from 'express';
import type { Snapshot } from '@core/api/types';
import type { ID } from '@core/types';
import { uid } from '@core/lib/format';
import { PLUS_REQUIRED } from '@core/lib/plus';
import { createSavedPeople, SavedPeopleError, type SavedPeopleBook } from '@core/lib/savedpeople';
import type { Store } from './store';
import { plusAllowed } from './plus';

export const SAVED_PEOPLE = 'savedPeople';

export interface SavedPeopleServiceDeps {
  db: () => Pick<Snapshot, 'users' | 'relationships'>;
  store: Pick<Store, 'listDocs' | 'putDocs' | 'removeDocs'>;
}

export function createSavedPeopleService(deps: SavedPeopleServiceDeps) {
  const books = new Map<ID, SavedPeopleBook>();
  const engine = createSavedPeople({
    get: (owner) => books.get(owner),
    put(b) { books.set(b.id, b); void deps.store.putDocs(SAVED_PEOPLE, [b]).catch((e) => console.error('[saved-people] save failed', e)); },
    drop(owner) { if (!books.delete(owner)) return; void deps.store.removeDocs(SAVED_PEOPLE, [owner]).catch((e) => console.error('[saved-people] delete failed', e)); },
    all: () => [...books.values()],
    relationships: () => deps.db().relationships,
    userExists: (id) => deps.db().users.some((u) => u.id === id),
    uid,
  });
  return {
    ...engine,
    async load() {
      books.clear();
      for (const b of await deps.store.listDocs<SavedPeopleBook>(SAVED_PEOPLE)) books.set(b.id, b);
      console.log(`[saved-people] ${books.size} books`);
    },
    /** tests */
    raw: (owner: ID) => books.get(owner),
  };
}
export type SavedPeopleService = ReturnType<typeof createSavedPeopleService>;

type Req = Request & { userId?: ID };
type Handler = (req: Req, res: Response) => Promise<unknown> | unknown;

export function registerSavedPeopleRoutes(app: Express, svc: SavedPeopleService, deps: {
  db: () => Pick<Snapshot, 'users'>;
  auth: (req: Request, res: Response, next: NextFunction) => unknown;
  wrap: (fn: Handler) => (req: Request, res: Response, next: NextFunction) => unknown;
  requireUser: (req: Req) => ID;
  bad: (msg: string, status?: number) => Error;
  env?: () => NodeJS.ProcessEnv;
}) {
  const route = (path: string, fn: (me: ID, body: Record<string, unknown>) => unknown) =>
    app.post(`/api/saved-people/${path}`, deps.auth, deps.wrap((req) => {
      const me = deps.requireUser(req);
      if (!plusAllowed(deps.db().users.find((u) => u.id === me), deps.env?.() ?? process.env)) throw deps.bad(PLUS_REQUIRED.saved_folders, 403);
      try { return fn(me, (req.body ?? {}) as Record<string, unknown>); } catch (e) { throw e instanceof SavedPeopleError ? deps.bad(e.message, e.status) : e; }
    }));
  route('view', (me) => svc.view(me));
  route('folder', (me, b) => svc.createFolder(me, b.name));
  route('folder/rename', (me, b) => svc.renameFolder(me, String(b.folderId ?? ''), b.name));
  route('folder/remove', (me, b) => svc.removeFolder(me, String(b.folderId ?? '')));
  route('entry', (me, b) => {
    const input: { folderId?: ID | null; note?: string | null } = {};
    if ('folderId' in b) input.folderId = b.folderId == null ? null : String(b.folderId);
    if ('note' in b) input.note = b.note == null ? null : String(b.note);
    return svc.setEntry(me, String(b.personId ?? ''), input);
  });
}
