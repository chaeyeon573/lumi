/**
 * Lumi for iPhone — one full-screen WebView on the live web app, plus the native parts a browser can't do:
 * push notifications, the iOS share sheet, haptics, universal links / lumi:// deep links, swipe-back,
 * in-app Safari for other sites, an offline screen, and a splash that stays up until the first screen is drawn.
 *
 * The web side of the bridge: src/lib/native.ts and src/components/native/* in the repo root.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import type { ShouldStartLoadRequest, WebViewErrorEvent, WebViewHttpErrorEvent, WebViewOpenWindowEvent } from 'react-native-webview/lib/WebViewTypes';
import { injectedBridge, navigateScript, parseBridgeMessage, resolveScript, type BridgeMessage, type SessionCopy } from './src/bridge';
import { classify, deepLinkPath, isDark, parseUrl, safePath, webUrlFor } from './src/links';
import * as N from './src/native';

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ fade: true, duration: 250 });
N.configureNotifications();

const extra = (Constants.expoConfig?.extra ?? {}) as { webUrl?: string; appHosts?: string[]; appEnv?: string };
const WEB_URL = (extra.webUrl ?? 'https://heetz.up.railway.app').replace(/\/+$/, '');
const APP_HOSTS = extra.appHosts?.length ? extra.appHosts : [parseUrl(WEB_URL)?.host ?? ''];
const DEBUG = extra.appEnv !== 'production';
/** splash never stays longer than this, even if the page never says it's ready */
const SPLASH_MAX_MS = 8000;

interface Boot { url: string; theme: N.Theme; session: SessionCopy | null }
type Failure = { offline: boolean; detail: string };

export default function App() {
  const [boot, setBoot] = useState<Boot | null>(null);
  useEffect(() => {
    void (async () => {
      const [theme, session, initialUrl, lastPush] = await Promise.all([
        N.loadTheme(), N.loadSession(), Linking.getInitialURL().catch(() => null), Notifications.getLastNotificationResponseAsync().catch(() => null),
      ]);
      // cold start from a push tap or a link → open straight on that screen
      const path = safePath(N.pushPathOf(lastPush)) ?? deepLinkPath(initialUrl, APP_HOSTS);
      if (lastPush) void Notifications.clearLastNotificationResponseAsync().catch(() => {});
      void SystemUI.setBackgroundColorAsync(theme.background).catch(() => {});
      setBoot({ url: webUrlFor(WEB_URL, path), theme, session });
    })();
  }, []);
  if (!boot) return null; // native splash still up
  return <SafeAreaProvider><Shell boot={boot} /></SafeAreaProvider>;
}

function Shell({ boot }: { boot: Boot }) {
  const insets = useSafeAreaInsets();
  const web = useRef<WebView>(null);
  const [theme, setTheme] = useState<N.Theme>(boot.theme);
  const [source, setSource] = useState({ uri: boot.url });
  const [webKey, setWebKey] = useState(0);
  const [failure, setFailure] = useState<Failure | null>(null);
  const loaded = useRef(false);
  const currentUrl = useRef(boot.url);
  const splashDown = useRef(false);
  /** latest Keychain copy of the login — a remounted WebView (retry, link while offline) restores from this */
  const sessionRef = useRef<SessionCopy | null>(boot.session);
  const dark = theme.statusBar === 'light';

  const hideSplash = useCallback(() => {
    if (splashDown.current) return;
    splashDown.current = true;
    SplashScreen.hide();
  }, []);
  useEffect(() => { const t = setTimeout(hideSplash, SPLASH_MAX_MS); return () => clearTimeout(t); }, [hideSplash]);

  /** In-app path → SPA navigation if the page is up, else load it */
  const go = useCallback((path: string | null) => {
    const p = safePath(path);
    if (!p) return;
    if (loaded.current && !failure) web.current?.injectJavaScript(navigateScript(p));
    else { setFailure(null); setSource({ uri: webUrlFor(WEB_URL, p) }); setWebKey((k) => k + 1); }
  }, [failure]);

  // links while running: lumi://…, universal links, push taps
  useEffect(() => {
    const a = Linking.addEventListener('url', ({ url }) => go(deepLinkPath(url, APP_HOSTS)));
    const b = Notifications.addNotificationResponseReceivedListener((r) => { go(N.pushPathOf(r)); void Notifications.clearLastNotificationResponseAsync().catch(() => {}); });
    return () => { a.remove(); b.remove(); };
  }, [go]);

  const retry = useCallback(() => {
    setFailure(null);
    loaded.current = false;
    setSource({ uri: currentUrl.current.startsWith(WEB_URL) ? currentUrl.current : WEB_URL });
    setWebKey((k) => k + 1);
  }, []);

  // back from the background while the offline screen is showing → try again
  useEffect(() => {
    const s = AppState.addEventListener('change', (st) => { if (st === 'active' && failure) retry(); });
    return () => s.remove();
  }, [failure, retry]);

  const reply = (id: number | undefined, ok: boolean, value: unknown) => { if (id !== undefined) web.current?.injectJavaScript(resolveScript(id, ok, value)); };

  const onMessage = async (e: WebViewMessageEvent) => {
    // only our own pages may talk to the bridge
    const from = parseUrl(e.nativeEvent.url);
    if (!from || !APP_HOSTS.includes(from.host)) return;
    const m = parseBridgeMessage(e.nativeEvent.data);
    if (!m) return;
    try { reply(m.id, true, await handle(m)); }
    catch (err) { reply(m.id, false, { message: (err as Error).message || 'Something went wrong' }); }
  };

  const handle = async (m: BridgeMessage): Promise<unknown> => {
    const p = m.payload ?? {};
    switch (m.type) {
      case 'share': return N.share(p);
      case 'haptic': await N.haptic(p.kind); return null;
      case 'openExternal': await N.openInAppBrowser(String(p.url ?? ''), dark); return null;
      case 'openSettings': await Linking.openSettings(); return null;
      case 'push.status': return N.pushStatus();
      case 'push.request': return N.requestPush();
      case 'push.token': return N.pushToken();
      case 'theme': {
        const bg = typeof p.background === 'string' && /^#[0-9a-f]{6}$/i.test(p.background) ? p.background : theme.background;
        const next: N.Theme = { background: bg, statusBar: p.statusBar === 'dark' || p.statusBar === 'light' ? p.statusBar : (isDark(bg) ? 'light' : 'dark') };
        setTheme(next);
        void SystemUI.setBackgroundColorAsync(next.background).catch(() => {});
        void N.saveTheme(next);
        return null;
      }
      case 'ready': hideSplash(); return null;
      case 'session': {
        sessionRef.current = typeof p.token === 'string' ? { token: p.token, user: String(p.user ?? '') } : null;
        void N.saveSession(sessionRef.current);
        return null;
      }
    }
  };

  /** Our host stays in the WebView; everything else goes to Safari view / iOS */
  const route = (url: string, isTopFrame: boolean): boolean => {
    const a = classify(url, APP_HOSTS, isTopFrame);
    switch (a.kind) {
      case 'load': return true;
      case 'navigate': go(a.path); return false;
      case 'browser': void N.openInAppBrowser(a.url, dark).catch(() => {}); return false;
      case 'system': void N.openSystem(a.url).catch(() => {}); return false;
      default: return false;
    }
  };
  const onShouldStart = (r: ShouldStartLoadRequest) => route(r.url, r.isTopFrame !== false);
  const onOpenWindow = (e: WebViewOpenWindowEvent) => { if (route(e.nativeEvent.targetUrl, true)) go(deepLinkPath(e.nativeEvent.targetUrl, APP_HOSTS)); };

  const onError = (e: WebViewErrorEvent) => {
    const { code, description, domain } = e.nativeEvent;
    if (code === -999) return; // NSURLErrorCancelled — a navigation replaced by another
    // NSURLErrorNotConnectedToInternet, NetworkConnectionLost, TimedOut, CannotFindHost, CannotConnectToHost, DNS
    const offline = domain === 'NSURLErrorDomain' && [-1009, -1005, -1001, -1003, -1004, -1006, -1020].includes(code);
    setFailure({ offline, detail: description });
    hideSplash();
  };
  const onHttpError = (e: WebViewHttpErrorEvent) => {
    // main frame only: the server is down / deploying (Railway answers 502/503) — the SPA answers 200 for every page
    if (e.nativeEvent.statusCode >= 500) {
      setFailure({ offline: false, detail: `HTTP ${e.nativeEvent.statusCode}` });
      hideSplash();
    }
  };
  const onNav = (n: WebViewNavigation) => { if (n.url.startsWith('http')) currentUrl.current = n.url; };

  // rebuilt only when the WebView is remounted (webKey) — reads the latest session copy at that moment
  const injected = useMemo(() => injectedBridge({ ...N.appInfo, restore: sessionRef.current }), [webKey]);

  return (
    <View style={[styles.root, { backgroundColor: theme.background }]}>
      <StatusBar style={theme.statusBar} animated />
      <View style={{ height: insets.top, backgroundColor: theme.background }} />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <WebView
          key={webKey}
          ref={web}
          source={source}
          style={[styles.fill, { backgroundColor: theme.background }]}
          containerStyle={{ backgroundColor: theme.background }}
          originWhitelist={['*']}
          injectedJavaScriptBeforeContentLoaded={injected}
          injectedJavaScriptForMainFrameOnly
          onMessage={onMessage}
          onShouldStartLoadWithRequest={onShouldStart}
          onOpenWindow={onOpenWindow}
          javaScriptCanOpenWindowsAutomatically
          onLoadEnd={() => { loaded.current = true; setTimeout(hideSplash, 2500); /* web app older than the bridge never says ready */ }}
          onLoadStart={() => { loaded.current = false; }}
          onNavigationStateChange={onNav}
          onError={onError}
          onHttpError={onHttpError}
          onContentProcessDidTerminate={() => web.current?.reload()}
          // feel like an app, not a page
          allowsBackForwardNavigationGestures
          bounces={false}
          allowsLinkPreview={false}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          hideKeyboardAccessoryView
          keyboardDisplayRequiresUserAction={false}
          dataDetectorTypes="none"
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction
          applicationNameForUserAgent={`LumiApp/${N.appInfo.appVersion}`}
          webviewDebuggingEnabled={DEBUG}
          // the app paints itself; never show the white "loading" page
          startInLoadingState={false}
          cacheEnabled
        />
      </KeyboardAvoidingView>
      {failure && <Offline failure={failure} dark={dark} background={theme.background} onRetry={retry} />}
    </View>
  );
}

function Offline({ failure, dark, background, onRetry }: { failure: Failure; dark: boolean; background: string; onRetry: () => void }) {
  const ink = dark ? '#F4F1FF' : '#1A1C18';
  const sub = dark ? '#A79FC4' : '#43474D';
  return (
    <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: background }]} accessibilityRole="alert">
      <Text style={[styles.mark, { color: ink }]}>lumi<Text style={{ color: '#FF3DA8' }}>.</Text></Text>
      <Text style={[styles.title, { color: ink }]}>{failure.offline ? "You're offline" : "Lumi can't be reached"}</Text>
      <Text style={[styles.body, { color: sub }]}>{failure.offline ? 'Check your Wi-Fi or cellular connection, then try again.' : 'The server is not answering right now. Give it a moment and try again.'}</Text>
      <Pressable onPress={onRetry} style={({ pressed }) => [styles.button, { backgroundColor: dark ? '#D4FF3A' : '#0F2B48', opacity: pressed ? 0.8 : 1 }]} accessibilityRole="button">
        <Text style={[styles.buttonText, { color: dark ? '#0C0A14' : '#FFFFFF' }]}>Try again</Text>
      </Pressable>
      {DEBUG && <Text style={[styles.detail, { color: sub }]}>{failure.detail}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  mark: { fontSize: 34, fontWeight: '800', letterSpacing: -1, marginBottom: 28 },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  body: { fontSize: 15, lineHeight: 21, textAlign: 'center', marginTop: 8, maxWidth: 300 },
  button: { marginTop: 24, height: 48, paddingHorizontal: 28, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700' },
  detail: { fontSize: 11, marginTop: 16, opacity: 0.7 },
});
