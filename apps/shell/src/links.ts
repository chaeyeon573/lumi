/**
 * Which URL goes where — pure functions (no React Native imports) so `npm test` can run them in Node.
 * React Native's URL class is incomplete, so URLs are split with a regex here.
 */

/** Share links the web app hands out — universal links open these in the app (server/app-links.ts APP_LINK_PATHS) */
export const APP_LINK_PATHS = ['/c/', '/r/', '/p/', '/welcome'];
export const SCHEME = 'lumi';

export interface ParsedUrl { scheme: string; host: string; path: string; query: string; hash: string }

export function parseUrl(url: string): ParsedUrl | null {
  const m = /^([a-z][a-z0-9+.-]*):(?:\/\/([^/?#]*))?([^?#]*)(\?[^#]*)?(#.*)?$/i.exec(url.trim());
  if (!m) return null;
  return { scheme: m[1].toLowerCase(), host: (m[2] ?? '').toLowerCase().replace(/:\d+$/, '').replace(/^[^@]*@/, ''), path: m[3] ?? '', query: m[4] ?? '', hash: m[5] ?? '' };
}

/** A path the web app may navigate to: starts with one "/", no scheme tricks, no control characters */
export function safePath(p: string | null | undefined): string | null {
  if (!p || typeof p !== 'string' || !p.startsWith('/') || p.startsWith('//') || p.startsWith('/\\')) return null;
  if (/[\u0000-\u001f\u007f]/.test(p) || p.length > 2048) return null;
  return p;
}

export type LinkAction =
  | { kind: 'load' }                       // stay in the WebView
  | { kind: 'navigate'; path: string }     // lumi:// link inside the page → in-app path
  | { kind: 'browser'; url: string }       // other website → in-app Safari view (expo-web-browser)
  | { kind: 'system'; url: string }        // mailto:, tel:, sms:, App Store … → iOS
  | { kind: 'block' };

const SYSTEM_SCHEMES = new Set(['mailto', 'tel', 'sms', 'facetime', 'facetime-audio', 'maps', 'itms-apps', 'itms-appss']);
const INERT = new Set(['about', 'data', 'blob']);

/** onShouldStartLoadWithRequest / onOpenWindow */
export function classify(url: string, appHosts: readonly string[], isTopFrame = true): LinkAction {
  const u = parseUrl(url);
  if (!u) return { kind: 'block' };
  if (INERT.has(u.scheme)) return { kind: 'load' };
  if (u.scheme === 'http' || u.scheme === 'https') {
    // our API files (e.g. /api/plans/<id>/ics calendar files) → Safari view, which knows "Add to Calendar"
    if (appHosts.includes(u.host)) return isTopFrame && u.path.startsWith('/api/') ? { kind: 'browser', url } : { kind: 'load' };
    // embedded frames (a video, a map) load where they are; only a top-level navigation leaves the app
    return isTopFrame ? { kind: 'browser', url } : { kind: 'load' };
  }
  if (u.scheme === SCHEME) { const path = deepLinkPath(url, appHosts); return path ? { kind: 'navigate', path } : { kind: 'block' }; }
  if (SYSTEM_SCHEMES.has(u.scheme)) return { kind: 'system', url };
  return { kind: 'block' }; // javascript:, file:, unknown app schemes
}

/**
 * An incoming link (custom scheme, universal link, push tap) → the in-app path, or null if it is not ours.
 *   lumi://c/s_berkeley/CS61A        → /c/s_berkeley/CS61A
 *   lumi:///r/abc?x=1                → /r/abc?x=1
 *   https://<app host>/p/xyz         → /p/xyz
 */
export function deepLinkPath(url: string | null | undefined, appHosts: readonly string[]): string | null {
  if (!url) return null;
  const u = parseUrl(url);
  if (!u) return null;
  if (u.scheme === SCHEME) {
    const path = (u.host ? `/${u.host}${u.path}` : u.path || '/');
    return safePath(`${path}${u.query}${u.hash}`);
  }
  if ((u.scheme === 'https' || u.scheme === 'http') && appHosts.includes(u.host)) return safePath(`${u.path || '/'}${u.query}${u.hash}`);
  return null;
}

/** Full URL the WebView loads for an in-app path */
export const webUrlFor = (webUrl: string, path: string | null | undefined) => `${webUrl.replace(/\/+$/, '')}${safePath(path) ?? '/'}`;

/** Hex color → is it dark? (status bar text goes light on dark backgrounds) */
export function isDark(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return true;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 140;
}
