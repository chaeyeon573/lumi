/**
 * What each bridge message does on the iPhone (bridge.ts lists the messages).
 * Every handler resolves with a plain JSON value or throws an Error whose message the web side can show.
 */
import { Linking, Platform, Share } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
import type { SessionCopy } from './bridge';
import { parseUrl } from './links';

export const appInfo = {
  platform: (Platform.OS === 'android' ? 'android' : 'ios') as 'ios' | 'android',
  appVersion: Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0.0.0',
  buildNumber: Application.nativeBuildVersion ?? '0',
};

// ─── share sheet ──────────────────────────────────────────────────────────
export async function share(p: Record<string, unknown>): Promise<{ shared: boolean }> {
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.slice(0, 2000) : undefined);
  const url = str(p.url), text = str(p.text), title = str(p.title);
  // iOS shows message + url together; when the text already contains the link, send the text alone
  const message = text ?? title;
  const content = url && !(message ?? '').includes(url) ? { message, url } : { message: message ?? url ?? '' };
  const r = await Share.share({ ...content, title });
  return { shared: r.action === Share.sharedAction };
}

// ─── haptics ──────────────────────────────────────────────────────────────
export async function haptic(kind: unknown) {
  switch (kind) {
    case 'selection': return Haptics.selectionAsync();
    case 'medium': return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    case 'heavy': return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    case 'success': return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    case 'warning': return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    case 'error': return Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    default: return Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
}

// ─── links ────────────────────────────────────────────────────────────────
/** Other websites: an in-app Safari view (SFSafariViewController), tinted to the current theme */
export async function openInAppBrowser(url: string, dark: boolean) {
  const u = parseUrl(url);
  if (!u || (u.scheme !== 'https' && u.scheme !== 'http')) throw new Error('Only web links can be opened.');
  await WebBrowser.openBrowserAsync(url, {
    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    dismissButtonStyle: 'close',
    controlsColor: dark ? '#FF7AC0' : '#0F2B48',
    toolbarColor: dark ? '#08070C' : '#FFFFFF',
  });
}

/** mailto:, tel:, sms:, App Store links → iOS */
export async function openSystem(url: string) {
  await Linking.openURL(url);
}

// ─── push ─────────────────────────────────────────────────────────────────
type Status = 'granted' | 'denied' | 'undetermined' | 'unavailable';
const statusOf = (p: Notifications.NotificationPermissionsStatus): Status => {
  const ios = p.ios?.status;
  if (ios !== undefined) {
    if (ios === Notifications.IosAuthorizationStatus.AUTHORIZED || ios === Notifications.IosAuthorizationStatus.PROVISIONAL || ios === Notifications.IosAuthorizationStatus.EPHEMERAL) return 'granted';
    if (ios === Notifications.IosAuthorizationStatus.DENIED) return 'denied';
    return 'undetermined';
  }
  return p.granted ? 'granted' : p.status === 'denied' ? 'denied' : 'undetermined';
};

export async function pushStatus(): Promise<{ status: Status; canAskAgain: boolean }> {
  if (!Device.isDevice) return { status: 'unavailable', canAskAgain: false };
  const p = await Notifications.getPermissionsAsync();
  return { status: statusOf(p), canAskAgain: p.canAskAgain };
}

const projectId = (): string | undefined => {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
};

export async function pushToken(): Promise<{ token?: string; error?: string }> {
  if (!Device.isDevice) return { error: 'Push needs a real iPhone.' };
  const id = projectId();
  if (!id) return { error: 'Push is not set up in this build (no EAS project id — run `eas init`).' };
  const p = await Notifications.getPermissionsAsync();
  if (statusOf(p) !== 'granted') return { error: 'Notifications are off.' };
  try { return { token: (await Notifications.getExpoPushTokenAsync({ projectId: id })).data }; }
  catch (e) { return { error: (e as Error).message }; }
}

/** The iOS permission prompt (iOS shows it only once per install), then the token */
export async function requestPush(): Promise<{ status: Status; token?: string; error?: string }> {
  if (!Device.isDevice) return { status: 'unavailable', error: 'Push needs a real iPhone.' };
  const p = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
  const status = statusOf(p);
  if (status !== 'granted') return { status };
  return { status, ...(await pushToken()) };
}

export function configureNotifications() {
  // a push that arrives while the app is open still shows as a banner
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

/** Where a push tap should go (server/push.ts puts `path` in data) */
export const pushPathOf = (r: Notifications.NotificationResponse | null | undefined): string | null => {
  const data = r?.notification.request.content.data as { path?: unknown } | undefined;
  return typeof data?.path === 'string' ? data.path : null;
};

// ─── small persisted state (Keychain) ─────────────────────────────────────
const K_SESSION = 'lumi.session';
const K_THEME = 'lumi.theme';
export interface Theme { background: string; statusBar: 'light' | 'dark' }
export const DEFAULT_THEME: Theme = { background: '#08070C', statusBar: 'light' };

async function read<T>(key: string): Promise<T | null> {
  try { const v = await SecureStore.getItemAsync(key); return v ? JSON.parse(v) as T : null; } catch { return null; }
}
async function write(key: string, v: unknown) {
  try { if (v == null) await SecureStore.deleteItemAsync(key); else await SecureStore.setItemAsync(key, JSON.stringify(v)); } catch { /* keychain unavailable — the WebView's own storage still works */ }
}
export const loadSession = () => read<SessionCopy>(K_SESSION);
export const saveSession = (s: SessionCopy | null) => write(K_SESSION, s && s.token ? s : null);
export const loadTheme = async (): Promise<Theme> => ({ ...DEFAULT_THEME, ...(await read<Theme>(K_THEME)) });
export const saveTheme = (t: Theme) => write(K_THEME, t);
