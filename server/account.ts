/**
 * Account deletion (App Store guideline 5.1.1(v)).
 *
 *   POST /api/auth/delete-account   { confirm: "DELETE" }   Authorization: Bearer <token>
 *     200 { ok: true, deleted: {...counts} }
 *     400 confirmation word missing · 401 not signed in · 403 shared demo account / sample profile
 *
 * Only ever deletes the signed-in caller — there is no user id in the request.
 *
 * Where a person's data lives, and what this does with it:
 * - Snapshot collections (users, relationships, activities, participations, posts, proposals, chatRooms,
 *   notifications, reports, opportunities, opportunityIntents, timePolls, games, rides) → @core/lib/account
 *   eraseUser() decides per item (deleted / cancelled with a notice / stripped / report anonymized) and
 *   returns one Patch. It is persisted with store.applyPatch (removed.* deletes the docs rows) and
 *   broadcast through server/view.ts so every open screen drops the person.
 * - Outside the snapshot, in the store: login email (accounts), every session token, pending email codes,
 *   AI question logs (and starter suggestions generated from their profile), feedback rows → store.forgetUser.
 * - Doc collections: seatWatches + their entries in seatStatus.notified (campus-api), diningFavorites (dining),
 *   gymAlerts (gym) → each service's forgetUser, which also clears its in-memory copy.
 * - In memory: verified-email set, AI starter cache, open SSE streams → `forget` hooks / disconnect.
 * - Kept: reports *about* them (opaque target id, reporter's own words — needed for safety review),
 *   reports they filed (reporter replaced with "u_deleted"). Photos are not uploaded anywhere — avatars are
 *   bundled stock images or a URL on the profile, which is deleted with it. Feedback already e-mailed to
 *   FEEDBACK_EMAIL cannot be recalled from the inbox.
 */
import type { Express, Request, Response, NextFunction } from 'express';
import type { Patch, Snapshot } from '@core/api/types';
import type { ID } from '@core/types';
import { eraseUser, isProtectedAccount, deleteConfirmOk, DELETE_CONFIRM_WORD, DEMO_DELETE_REFUSED } from '@core/lib/account';
import { users as seedUsersEn, DEMO_USER_ID } from '@core/data/seed.en';
import { users as seedUsersKo } from '@core/data/seed';
import type { Store } from './store';

type Req = Request & { userId?: ID };

/** Shared demo accounts (u_me, u_me_ucmerced) and every seed/sample profile */
export const PROTECTED_IDS: ReadonlySet<ID> = new Set([DEMO_USER_ID, `${DEMO_USER_ID}_ucmerced`, ...seedUsersEn.map((u) => u.id), ...seedUsersKo.map((u) => u.id)]);

export interface AccountDeps {
  db: () => Snapshot;
  store: Store;
  auth: (req: Req, res: Response, next: NextFunction) => unknown;
  /** send a Patch to every connected viewer (filtered per viewer by server/view.ts) */
  broadcast(patch: Patch): void;
  /** close this user's open event streams */
  disconnect(userId: ID): void;
  /** other places that keep something about a user (doc collections, in-memory caches). `emails` = their login emails */
  forget?: ((userId: ID, emails: string[]) => unknown)[];
}

class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }

export function registerAccountRoutes(app: Express, deps: AccountDeps) {
  app.post('/api/auth/delete-account', deps.auth, async (req: Req, res: Response) => {
    try {
      const me = req.userId;
      if (!me) throw new HttpError(401, 'Please sign in first.');
      const db = deps.db();
      const user = db.users.find((u) => u.id === me);
      if (!user) throw new HttpError(401, 'Please sign in first.');
      if (isProtectedAccount(user, PROTECTED_IDS)) throw new HttpError(403, DEMO_DELETE_REFUSED);
      if (!deleteConfirmOk(req.body?.confirm)) throw new HttpError(400, `Type ${DELETE_CONFIRM_WORD} to confirm.`);

      const { patch, summary } = eraseUser(db, me);
      deps.disconnect(me);
      await deps.store.applyPatch(patch);
      const { emails } = await deps.store.forgetUser(me);
      const extra: Record<string, unknown> = {};
      for (const f of deps.forget ?? []) {
        try { const r = await f(me, emails); if (r && typeof r === 'object') Object.assign(extra, r); }
        catch (e) { console.error('[account] cleanup step failed', e); }
      }
      deps.broadcast(patch);
      // re-check: the person is gone from memory and no session for them still works
      if (deps.db().users.some((u) => u.id === me)) throw new HttpError(500, 'Deletion did not finish — please try again.');
      console.log(`[account] deleted ${me}: ${JSON.stringify({ ...summary, ...extra, emails: emails.length })}`);
      res.json({ ok: true, deleted: { ...summary, ...extra, loginEmails: emails.length } });
    } catch (e) {
      const status = e instanceof HttpError ? e.status : 500;
      if (status === 500) console.error('[account] delete failed', e);
      res.status(status).json({ error: e instanceof Error ? e.message : 'error' });
    }
  });
}
