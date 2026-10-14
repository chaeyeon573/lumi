/**
 * Universal links for the iPhone app (apps/shell).
 *
 *   GET /.well-known/apple-app-site-association   (also /apple-app-site-association)
 *     200 application/json — built from APPLE_TEAM_ID + IOS_BUNDLE_ID
 *     404 when either is unset or malformed (iOS then just opens links in Safari, as today)
 *
 * Must be registered before express.static / the SPA catch-all (static ignores dot-folders and the catch-all
 * would answer with index.html). Apple fetches it through its CDN without following redirects, so it is served
 * directly on every host this server answers for (Railway domain and any custom domain).
 *
 * The paths here are the share links the web app hands out — keep in sync with apps/shell/src/links.ts
 * (APP_LINK_PATHS) and src/lib/native.ts.
 */
import type { Express, Request, Response } from 'express';

export const APP_LINK_PATHS = ['/c/*', '/r/*', '/p/*', '/welcome'] as const;

export function appSiteAssociation(env: NodeJS.ProcessEnv = process.env): object | null {
  const team = env.APPLE_TEAM_ID?.trim();
  const bundle = env.IOS_BUNDLE_ID?.trim();
  if (!team || !bundle || !/^[A-Z0-9]{10}$/.test(team) || !/^[A-Za-z0-9.-]+$/.test(bundle)) return null;
  const appID = `${team}.${bundle}`;
  return {
    applinks: {
      // iOS 13+ reads `components`; `paths` is kept for older iOS
      details: [{ appIDs: [appID], appID, components: APP_LINK_PATHS.map((p) => ({ '/': p })), paths: [...APP_LINK_PATHS] }],
    },
  };
}

export function registerAppLinkRoutes(app: Express) {
  const handler = (_req: Request, res: Response) => {
    const body = appSiteAssociation();
    if (!body) { res.status(404).type('text/plain').send('Not configured — set APPLE_TEAM_ID and IOS_BUNDLE_ID'); return; }
    res.set('cache-control', 'public, max-age=3600').type('application/json').send(JSON.stringify(body));
  };
  app.get('/.well-known/apple-app-site-association', handler);
  app.get('/apple-app-site-association', handler);
}
