/**
 * The iPhone app (apps/shell) — this web app running inside a native WebView.
 *
 * The shell injects `window.LumiNative` before the page loads (apps/shell/src/bridge.ts). Everything here
 * checks for it and falls back to what the browser does today, so the same code runs on the web unchanged.
 *
 *   isNativeShell()             inside the iPhone app?
 *   shareOrCopy(data, opts)     native share sheet → navigator.share → copy to clipboard
 *   haptic(kind)                Taptic Engine (no-op on the web)
 *   openExternal(url)           in-app Safari view (web: new tab)
 *   pushStatus() / askForPush() notification permission + Expo push token
 */

export type HapticKind = 'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
export type PushStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';
export interface ShareInput { title?: string; text?: string; url?: string }

/** What apps/shell/src/bridge.ts puts on window — keep the two in sync (bridgeVersion) */
export interface LumiNativeApi {
  isNative: true;
  platform: 'ios' | 'android';
  bridgeVersion: number;
  appVersion: string;
  buildNumber: string;
  share(data: ShareInput): Promise<{ shared: boolean }>;
  haptic(kind: HapticKind): Promise<void>;
  openExternal(url: string): Promise<void>;
  openSettings(): Promise<void>;
  push: {
    status(): Promise<{ status: PushStatus; canAskAgain: boolean }>;
    /** Shows the iOS permission prompt (once per install), then returns the Expo push token */
    request(): Promise<{ status: PushStatus; token?: string; error?: string }>;
    /** Token without prompting — only when already granted */
    token(): Promise<{ token?: string; error?: string }>;
  };
  setTheme(theme: { design: string; background: string; statusBar: 'light' | 'dark' }): Promise<void>;
  /** First real screen is up — the shell hides its splash */
  ready(): Promise<void>;
  /** Deep links / push taps → the shell asks the web app to navigate (SPA, no reload) */
  onNavigate(fn: (path: string) => void): void;
}

declare global {
  interface Window { LumiNative?: LumiNativeApi }
}

export const native = (): LumiNativeApi | undefined => (typeof window !== 'undefined' && window.LumiNative?.isNative ? window.LumiNative : undefined);
export const isNativeShell = () => !!native();
/** 사진 고르기를 보여 줘도 되나 — 웹은 언제나. iPhone 앱은 사진·카메라 권한 문구가 든 빌드(bridgeVersion 2)부터: 그 전 앱은 누르면 꺼진다 */
export const canPickPhotos = () => { const n = native(); return !n || n.bridgeVersion >= 2; };

/** Share sheet available here? (iPhone app always; browsers that have navigator.share) */
export const canShareSheet = () => isNativeShell() || (typeof navigator !== 'undefined' && !!navigator.share);

export type ShareResult = 'shared' | 'copied' | 'dismissed' | 'failed';

/**
 * Share a link. In the iPhone app: the iOS share sheet. On the web: navigator.share when `webSheet` allows it,
 * otherwise copy `copy` (default: url, then text) to the clipboard. The caller shows its own toast for 'copied'.
 *   webSheet 'auto'   — use navigator.share whenever the browser has it (default)
 *   webSheet 'mobile' — only on phones (desktop Chrome's share dialog is worse than a copied link)
 *   webSheet 'never'  — always copy on the web
 */
export async function shareOrCopy(data: ShareInput & { copy?: string }, opts: { webSheet?: 'auto' | 'mobile' | 'never' } = {}): Promise<ShareResult> {
  const { copy, ...share } = data;
  const n = native();
  if (n) {
    try { return (await n.share(share)).shared ? 'shared' : 'dismissed'; } catch { /* old shell / bridge error → copy below */ }
  } else {
    const mode = opts.webSheet ?? 'auto';
    const sheetOk = mode === 'auto' || (mode === 'mobile' && /Mobi|Android|iPhone/i.test(navigator.userAgent));
    if (sheetOk && navigator.share) {
      try { await navigator.share(share); return 'shared'; } catch (e) { if ((e as Error)?.name === 'AbortError') return 'dismissed'; }
    }
  }
  try { await navigator.clipboard.writeText(copy ?? share.url ?? share.text ?? ''); return 'copied'; } catch { return 'failed'; }
}

export function haptic(kind: HapticKind = 'light') {
  void native()?.haptic(kind).catch(() => {});
}

export function openExternal(url: string) {
  const n = native();
  if (n) { void n.openExternal(url).catch(() => { window.location.href = url; }); return; }
  window.open(url, '_blank', 'noopener');
}

export async function pushStatus(): Promise<{ status: PushStatus; canAskAgain: boolean }> {
  const n = native();
  if (!n) return { status: 'unavailable', canAskAgain: false };
  try { return await n.push.status(); } catch { return { status: 'unavailable', canAskAgain: false }; }
}

/** iOS permission prompt → token. Only call from a user gesture or a soft prompt the user said yes to. */
export async function askForPush(): Promise<{ status: PushStatus; token?: string }> {
  const n = native();
  if (!n) return { status: 'unavailable' };
  try { return await n.push.request(); } catch { return { status: 'unavailable' }; }
}

export async function pushToken(): Promise<string | undefined> {
  try { return (await native()?.push.token())?.token; } catch { return undefined; }
}

export function openAppSettings() { void native()?.openSettings().catch(() => {}); }

/** "1.0.0 (12)" — shown in Settings inside the app */
export const appVersionLabel = () => { const n = native(); return n ? `${n.appVersion} (${n.buildNumber})` : undefined; };
