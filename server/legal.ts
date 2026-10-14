/**
 * Public legal pages — /privacy and /terms (App Store Connect needs a public Privacy Policy URL).
 *
 *   GET /api/legal     { operator, contactEmail } — from env, null when unset (the page shows a visible placeholder)
 *   GET /privacy       index.html with the page's own title/description (link previews, browser tab)
 *   GET /terms         same
 *
 * The page text lives in src/pages/legal/ (one copy, rendered by the web app for signed-in and signed-out visitors).
 * Env: LEGAL_NAME (who runs Lumi — a person or company), PRIVACY_CONTACT_EMAIL (where privacy/safety requests go).
 * Never fill these with a guess: an unset value shows "[… — to be set]" on the page so it can't ship unnoticed.
 */
import type { Express, NextFunction, Request, Response } from 'express';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface LegalConfig { operator: string | null; contactEmail: string | null }

export function legalConfig(env: NodeJS.ProcessEnv = process.env): LegalConfig {
  const operator = env.LEGAL_NAME?.trim() || null;
  const email = env.PRIVACY_CONTACT_EMAIL?.trim() || null;
  return { operator, contactEmail: email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email : null };
}

export const LEGAL_META = {
  privacy: { title: 'Privacy Policy · Lumi', description: 'What Lumi collects, why, who it is shared with, and how to delete your account.' },
  terms: { title: 'Terms of Use · Lumi', description: 'The rules for using Lumi, including zero tolerance for objectionable content and abusive users.' },
} as const;

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** index.html with this page's title and description (og: tags too) */
export function legalPageHtml(html: string, page: keyof typeof LEGAL_META, url: string): string {
  const m = LEGAL_META[page];
  const tags = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Lumi" />',
    `<meta property="og:url" content="${esc(url)}" />`,
  ].join('\n    ');
  const stripped = html
    .replace(/<title>[\s\S]*?<\/title>\s*/i, '')
    .replace(/<meta\s+(?:name|property)="(?:description|og:[^"]+|twitter:[^"]+)"[^>]*>\s*/gi, '');
  return stripped.replace(/<\/head>/i, `    ${tags}\n  </head>`);
}

/** Register before the static files / SPA fallback */
export function registerLegalRoutes(app: Express, deps: { dist: string }) {
  app.get('/api/legal', (_req, res) => { res.set('cache-control', 'public, max-age=300'); res.json(legalConfig()); });

  const indexFile = path.join(deps.dist, 'index.html');
  let cached: string | null = null;
  const template = () => (cached ??= existsSync(indexFile) ? readFileSync(indexFile, 'utf8') : null);
  for (const page of ['privacy', 'terms'] as const) {
    app.get(`/${page}`, (req: Request, res: Response, next: NextFunction) => {
      const html = template();
      if (!html) { next(); return; }
      res.set('cache-control', 'public, max-age=300');
      res.type('html').send(legalPageHtml(html, page, `${req.protocol}://${req.get('host')}/${page}`));
    });
  }
}
