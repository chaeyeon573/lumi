/**
 * Lumi for iPhone — a native shell around the live web app (https://heetz.up.railway.app).
 *
 * Everything that can change between environments comes from env vars, so the same code builds for the
 * Railway URL today and a custom domain later. Set them in eas.json (`build.<profile>.env`) or on expo.dev
 * (Project → Environment variables). See docs/app-store/IOS_RELEASE.md.
 *
 *   EXPO_PUBLIC_WEB_URL   web app the shell loads             default https://heetz.up.railway.app
 *   ASSOCIATED_DOMAINS    universal-link hosts, comma list    default: the host of EXPO_PUBLIC_WEB_URL
 *                         (each one must serve /.well-known/apple-app-site-association — server/app-links.ts)
 *   IOS_BUNDLE_ID         iOS bundle identifier               default app.lumi.campus  ← NOT CONFIRMED BY OWNER
 *   APP_ENV               development | preview | production (set per profile in eas.json)
 *
 * app.json only holds what `eas init` writes (extra.eas.projectId) — this file spreads it in.
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

const WEB_URL: string = (process.env.EXPO_PUBLIC_WEB_URL || 'https://heetz.up.railway.app').replace(/\/+$/, '');
const WEB_HOST = WEB_URL.replace(/^https?:\/\//, '').split('/')[0];
const ASSOCIATED: string[] = String(process.env.ASSOCIATED_DOMAINS || WEB_HOST).split(',').map((s: string) => s.trim()).filter(Boolean);

// ⚠️ BUNDLE IDENTIFIER — becomes PERMANENT the moment the first build is uploaded to App Store Connect
// (it cannot be renamed later; a new id = a new app with no reviews/testers). `app.lumi.campus` is a
// placeholder the owner has NOT confirmed. Pick one you control (reverse-DNS of a domain you own is
// customary, e.g. com.yourname.lumi) and set IOS_BUNDLE_ID before the first `eas build`.
const BUNDLE_ID: string = process.env.IOS_BUNDLE_ID || 'app.lumi.campus';

const APP_ENV: string = process.env.APP_ENV || 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Lumi',
  slug: 'lumi',
  scheme: 'lumi',
  version: '1.0.0', // marketing version — the build number is auto-incremented by EAS (eas.json: appVersionSource remote)
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#08070C',
  platforms: ['ios'],
  ios: {
    bundleIdentifier: BUNDLE_ID,
    supportsTablet: false,
    associatedDomains: ASSOCIATED.map((h: string) => `applinks:${h}`),
    // Usage strings only for features that use them. Post photos (2026-11-02): the web app's <input type="file" accept="image/*">
    // makes WKWebView offer "Photo Library" and "Take Photo" — without these two strings iOS kills the app on tap.
    // No location/mic/contacts strings: the photo is redrawn on the device (location data removed) before upload.
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
      NSPhotoLibraryUsageDescription: 'Lumi uses the photos you pick to add them to your post. Only the photos you choose are uploaded.',
      NSCameraUsageDescription: 'Lumi uses the camera when you choose to take a photo for your post.',
    },
  },
  plugins: [
    ['expo-splash-screen', { image: './assets/splash-icon.png', imageWidth: 200, resizeMode: 'contain', backgroundColor: '#08070C' }],
    // all distributed builds (TestFlight, ad hoc) use the production APNs environment
    ['expo-notifications', { mode: 'production' }],
    // Keychain copy of the session token only — no Face ID, so no NSFaceIDUsageDescription
    ['expo-secure-store', { faceIDPermission: false }],
    'expo-web-browser',
  ],
  extra: {
    ...config.extra,
    webUrl: WEB_URL,
    /** hosts that stay inside the app; every other http(s) link opens in an in-app Safari view */
    appHosts: [...new Set([WEB_HOST, ...ASSOCIATED])],
    appEnv: APP_ENV,
  },
});
