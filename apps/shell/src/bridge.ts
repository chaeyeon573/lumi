/**
 * The JS bridge between the web app and the shell.
 *
 * Page → shell: window.ReactNativeWebView.postMessage(JSON.stringify({ lumi: 1, id, type, payload }))
 * Shell → page: webView.injectJavaScript(`window.LumiNative._resolve(id, ok, value)`) — see resolveScript()
 *
 * `window.LumiNative` is injected before any page script runs (injectedJavaScriptBeforeContentLoaded), main
 * frame only. The web side's types and fallbacks live in src/lib/native.ts (LumiNativeApi) — bump
 * BRIDGE_VERSION here and there together when the shape changes.
 *
 * The same script keeps a copy of the web app's session token in the iOS Keychain (expo-secure-store) and puts
 * it back if WebKit ever cleared the page's localStorage, so people stay signed in across relaunches.
 */
/** 1 = first release · 2 = the app declares photo/camera usage strings, so the web app may show its photo picker */
export const BRIDGE_VERSION = 2;
/** localStorage keys the web app uses for its session (packages/core/src/api/remote/index.ts) */
export const SESSION_KEYS = { token: 'aroundu.remote.token.v1', user: 'aroundu.remote.user.v1' } as const;

export type BridgeType =
  | 'share' | 'haptic' | 'openExternal' | 'openSettings'
  | 'push.status' | 'push.request' | 'push.token'
  | 'theme' | 'ready' | 'session';

export interface BridgeMessage { lumi: 1; id?: number; type: BridgeType; payload?: Record<string, unknown> }
export interface SessionCopy { token: string; user: string }

const TYPES: ReadonlySet<string> = new Set(['share', 'haptic', 'openExternal', 'openSettings', 'push.status', 'push.request', 'push.token', 'theme', 'ready', 'session']);

export function parseBridgeMessage(data: string): BridgeMessage | null {
  if (typeof data !== 'string' || data.length > 20000) return null;
  try {
    const m = JSON.parse(data) as Partial<BridgeMessage>;
    if (!m || m.lumi !== 1 || typeof m.type !== 'string' || !TYPES.has(m.type)) return null;
    if (m.id !== undefined && (typeof m.id !== 'number' || !Number.isInteger(m.id))) return null;
    const payload = m.payload && typeof m.payload === 'object' && !Array.isArray(m.payload) ? m.payload : {};
    return { lumi: 1, id: m.id, type: m.type, payload };
  } catch { return null; }
}

/** JSON is valid JS; U+2028/2029 are too since ES2019, but escape anyway for older WebKit */
const js = (v: unknown) => JSON.stringify(v ?? null).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029').replace(/<\/script/gi, '<\\/script');

export const resolveScript = (id: number, ok: boolean, value: unknown) => `window.LumiNative&&window.LumiNative._resolve(${js(id)},${ok ? 'true' : 'false'},${js(value)});true;`;
export const navigateScript = (path: string) => `window.LumiNative&&window.LumiNative._go(${js(path)});true;`;

export interface BridgeInit { platform: 'ios' | 'android'; appVersion: string; buildNumber: string; restore: SessionCopy | null }

/** The script injected before the web app loads */
export function injectedBridge(init: BridgeInit): string {
  return `(function () {
  if (window.LumiNative) return;
  var post = function (m) {
    var tries = 0;
    (function send() {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m));
      else if (tries++ < 50) setTimeout(send, 20);
    })();
  };
  var seq = 0, pending = {}, navHandler = null, queuedPath = null;
  function call(type, payload) {
    return new Promise(function (resolve, reject) {
      var id = ++seq;
      pending[id] = { resolve: resolve, reject: reject };
      post({ lumi: 1, id: id, type: type, payload: payload || {} });
    });
  }
  var api = {
    isNative: true, platform: ${js(init.platform)}, bridgeVersion: ${BRIDGE_VERSION},
    appVersion: ${js(init.appVersion)}, buildNumber: ${js(init.buildNumber)},
    share: function (d) { return call('share', d); },
    haptic: function (kind) { return call('haptic', { kind: kind }); },
    openExternal: function (url) { return call('openExternal', { url: url }); },
    openSettings: function () { return call('openSettings'); },
    push: {
      status: function () { return call('push.status'); },
      request: function () { return call('push.request'); },
      token: function () { return call('push.token'); }
    },
    setTheme: function (t) { return call('theme', t); },
    ready: function () { return call('ready'); },
    onNavigate: function (fn) { navHandler = fn; if (queuedPath) { var p = queuedPath; queuedPath = null; fn(p); } },
    _go: function (path) {
      if (navHandler) navHandler(path);
      else if (document.readyState === 'complete') window.location.assign(path);
      else queuedPath = path;
    },
    _resolve: function (id, ok, value) {
      var p = pending[id]; if (!p) return; delete pending[id];
      if (ok) p.resolve(value); else p.reject(new Error(value && value.message ? value.message : String(value)));
    }
  };
  Object.defineProperty(window, 'LumiNative', { value: api, writable: false, configurable: false });

  // ── session: restore if WebKit dropped it, then mirror every change to the Keychain ──
  var TOKEN = ${js(SESSION_KEYS.token)}, USER = ${js(SESSION_KEYS.user)}, restore = ${js(init.restore)};
  try {
    if (restore && restore.token && !window.localStorage.getItem(TOKEN)) {
      window.localStorage.setItem(TOKEN, restore.token);
      window.localStorage.setItem(USER, restore.user || '');
    }
  } catch (e) {}
  var report = function () {
    try { var t = window.localStorage.getItem(TOKEN); post({ lumi: 1, type: 'session', payload: t ? { token: t, user: window.localStorage.getItem(USER) || '' } : {} }); } catch (e) {}
  };
  try {
    var S = window.Storage && window.Storage.prototype, set = S.setItem, rem = S.removeItem, clr = S.clear;
    S.setItem = function (k) { var r = set.apply(this, arguments); if (k === TOKEN || k === USER) report(); return r; };
    S.removeItem = function (k) { var r = rem.apply(this, arguments); if (k === TOKEN) report(); return r; };
    S.clear = function () { var r = clr.apply(this, arguments); report(); return r; };
  } catch (e) {}
  report();
})();
true;`;
}
