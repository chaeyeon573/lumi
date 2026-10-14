/** Runs the injected script in a fake page (node:vm) — the same script the WebView gets */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { injectedBridge, navigateScript, parseBridgeMessage, resolveScript, SESSION_KEYS } from './bridge.ts';

function page(restore: { token: string; user: string } | null, existing: Record<string, string> = {}) {
  const sent: { lumi: 1; id?: number; type: string; payload?: Record<string, unknown> }[] = [];
  class Storage {
    data = new Map<string, string>(Object.entries(existing));
    getItem(k: string) { return this.data.has(k) ? this.data.get(k)! : null; }
    setItem(k: string, v: string) { this.data.set(k, String(v)); }
    removeItem(k: string) { this.data.delete(k); }
    clear() { this.data.clear(); }
  }
  const localStorage = new Storage();
  const assigned: string[] = [];
  const window: Record<string, unknown> = {
    ReactNativeWebView: { postMessage: (s: string) => sent.push(JSON.parse(s)) },
    Storage, localStorage, location: { assign: (p: string) => assigned.push(p) },
  };
  const ctx = vm.createContext({ window, document: { readyState: 'loading' }, setTimeout, Promise, JSON, Object, String, Error });
  vm.runInContext(injectedBridge({ platform: 'ios', appVersion: '1.0.0', buildNumber: '7', restore }), ctx);
  const api = window.LumiNative as Record<string, any>;
  const run = (code: string) => vm.runInContext(code, ctx);
  return { sent, api, localStorage, assigned, run, ctx };
}

test('window.LumiNative: calls post a message and resolve when the shell answers', async () => {
  const { sent, api, run } = page(null);
  assert.equal(api.isNative, true);
  assert.equal(api.appVersion, '1.0.0');
  assert.equal(api.buildNumber, '7');
  const p = api.share({ title: 'Ride', url: 'https://x/r/1' });
  const msg = sent.find((m) => m.type === 'share')!;
  assert.deepEqual(msg.payload, { title: 'Ride', url: 'https://x/r/1' });
  assert.ok(parseBridgeMessage(JSON.stringify(msg)), 'the shell accepts what the page sends');
  run(resolveScript(msg.id!, true, { shared: true }));
  assert.deepEqual(JSON.parse(JSON.stringify(await p)), { shared: true }); // (vm realm → plain object)
  const q = api.push.request();
  const m2 = sent.find((m) => m.type === 'push.request')!;
  run(resolveScript(m2.id!, false, { message: 'nope   </script>' }));
  await assert.rejects(q, /nope/);
});

test('navigation from the shell: queued until the web app registers, then SPA navigation', () => {
  const { api, run, assigned } = page(null);
  run(navigateScript('/chats/r1'));
  const seen: string[] = [];
  api.onNavigate((p: string) => seen.push(p));
  run(navigateScript('/p/x'));
  assert.deepEqual(seen, ['/chats/r1', '/p/x']);
  assert.deepEqual(assigned, []);
});

test('session: restored from the Keychain copy only when WebKit lost it, and every change is reported', () => {
  const lost = page({ token: 'tok123', user: 'u1' });
  assert.equal(lost.localStorage.getItem(SESSION_KEYS.token), 'tok123');
  const kept = page({ token: 'old', user: 'u1' }, { [SESSION_KEYS.token]: 'current' });
  assert.equal(kept.localStorage.getItem(SESSION_KEYS.token), 'current', 'never overwrites a live session');

  const { sent, localStorage } = page(null);
  localStorage.setItem(SESSION_KEYS.token, 'new');
  localStorage.setItem('unrelated', 'x');
  localStorage.removeItem(SESSION_KEYS.token);
  const sessions = sent.filter((m) => m.type === 'session').map((m) => m.payload);
  assert.deepEqual(sessions, [{}, { token: 'new', user: '' }, {}]);
});

test('the shell ignores anything that is not a bridge message', () => {
  assert.equal(parseBridgeMessage('hello'), null);
  assert.equal(parseBridgeMessage(JSON.stringify({ lumi: 1, type: 'rm -rf' })), null);
  assert.equal(parseBridgeMessage(JSON.stringify({ lumi: 2, type: 'share' })), null);
  assert.equal(parseBridgeMessage(JSON.stringify({ lumi: 1, type: 'share', id: 'x' })), null);
  assert.deepEqual(parseBridgeMessage(JSON.stringify({ lumi: 1, type: 'ready' })), { lumi: 1, id: undefined, type: 'ready', payload: {} });
});
