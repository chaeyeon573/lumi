/**
 * Where to go after signing in — a shared link (/r/<ride>) opened signed out sends the student
 * back to it once they have signed in with their school account. Only same-site paths are kept.
 */
const KEY = 'lumi.returnTo';

export function setReturnTo(path: string) {
  try { if (path.startsWith('/') && !path.startsWith('//')) sessionStorage.setItem(KEY, path); } catch { /* private mode */ }
}

/** The saved path (once — it is cleared), or `fallback` */
export function takeReturnTo(fallback = '/'): string {
  try {
    const p = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return p && p.startsWith('/') && !p.startsWith('//') ? p : fallback;
  } catch { return fallback; }
}
