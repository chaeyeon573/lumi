# Lumi for iPhone — release steps (Windows, no Mac)

The iPhone app is **`apps/shell`**: an Expo app that shows the live web app (https://heetz.up.railway.app) in a
full-screen WebView and adds what a website can't do — push notifications, the iOS share sheet, universal
links / `lumi://` deep links, haptics, swipe-back, pull-to-refresh, an offline screen, an in-app Safari view for
other sites and a Keychain copy of the login. It is built **in the cloud with EAS** (Expo's build service runs
the Mac part), so everything below works from Windows PowerShell.

Web changes go live in the app as soon as Railway deploys — **no new build needed**. A new build is only needed
when something in `apps/shell` changes (native code, icon, config).

`apps/mobile` (the old "AroundU" React Native prototype on mock data) is **not** what ships; it can be deleted
later.

---

## 0. Decide first (permanent or visible)

| Decision | Where | Why it matters |
|---|---|---|
| **Bundle ID** — placeholder `app.lumi.campus` | `apps/shell/eas.json` → `build.base.env.IOS_BUNDLE_ID` **and** Railway `IOS_BUNDLE_ID` | **Permanent once the first build is uploaded.** A different id later = a different app (new testers, no history). Use reverse-DNS of a domain you control, e.g. `com.yourname.lumi`. |
| **App Store name** | App Store Connect app record | Must be unique across the whole App Store. "Lumi" is very likely taken — have backups ("Lumi – Campus Friends", "Lumi: Berkeley", …). The name under the icon stays "Lumi" (`app.config.ts` `name`). |
| **Domain** | `eas.json` `EXPO_PUBLIC_WEB_URL`, optional `ASSOCIATED_DOMAINS` | Universal links and the in-app host list are baked into each build. Moving to a custom domain later = set both (keep the Railway host in `ASSOCIATED_DOMAINS` so old links keep opening the app) + new build. |
| **Apple account type** | Apple Developer enrollment | *Individual*: your legal name is shown as the seller. *Organization*: needs a D-U-N-S number (can take 1–2 weeks). For a 2-week TestFlight goal, Individual is the fast path. |

---

## 1. One-time setup on your PC

1. Install **Node.js 20 or 22 LTS** (https://nodejs.org) and **Git**.
2. Create a free **Expo account**: https://expo.dev/signup
3. In PowerShell:
   ```powershell
   npm i -g eas-cli
   eas login
   git clone -b claude/friendly-euler-emuo1f https://github.com/chaeyeon573/aroundu.git Lumi
   cd Lumi\apps\shell
   npm install            # apps/shell has its own package-lock.json (it is NOT part of the root workspace)
   ```
4. Link the folder to an Expo project:
   ```powershell
   eas init
   ```
   This creates the project on expo.dev and writes `extra.eas.projectId` into `apps/shell/app.json`.
   **Commit that change** (`git add apps/shell/app.json; git commit -m "EAS project id"; git push`) — push
   notifications need the project id inside the build.
5. Set the bundle id: edit `apps/shell/eas.json` → `"IOS_BUNDLE_ID": "com.yourname.lumi"` (see §0). Commit.

## 2. Apple Developer Program

1. Enroll at https://developer.apple.com/programs/enroll/ ($99/year) with your Apple ID (2-factor auth on).
   On Windows, use the website; the **Apple Developer app on an iPhone** also works and is often faster.
2. Wait for the "Welcome to the Apple Developer Program" email (usually 24–48 h for individuals).
3. Note your **Team ID**: https://developer.apple.com/account → Membership details (10 characters, e.g. `AB12CD34EF`).

## 3. Railway (do this before installing the first build)

Railway → the web service → **Variables**:

| Variable | Value | What it does |
|---|---|---|
| `APPLE_TEAM_ID` | your Team ID | `/.well-known/apple-app-site-association` (universal links). Without it the URL answers 404 and links open in Safari instead of the app. |
| `IOS_BUNDLE_ID` | the same bundle id as `eas.json` | same |
| `EXPO_ACCESS_TOKEN` | *(optional)* | Only if you turn on "Enhanced push security" for the project on expo.dev (expo.dev → Account → Access tokens). Leave empty otherwise. |
| `PUSH_DISABLED` | *(leave empty)* | `1` stops sending pushes (emergency switch). |
| `REVIEW_LOGIN_EMAIL` | an address you control, e.g. `appreview@yourdomain.com` | App Review sign-in (`server/review-login.ts`). This address never gets mail; it signs in with the code below. |
| `REVIEW_LOGIN_CODE` | **exactly 6 digits**, not guessable | The fixed code for that address. Paste both only into App Store Connect → App Review Information (notes in `APP_PRIVACY.md` §3 use the placeholders). Remove both after approval if you like — the address then behaves like any other. |

Redeploy, then check:
```powershell
curl.exe -i https://heetz.up.railway.app/.well-known/apple-app-site-association
```
Expect `HTTP/1.1 200` and `Content-Type: application/json` with `"appIDs":["<TEAMID>.<bundle id>"]`. (Before
the variables are set it is `404` — that is expected.) Apple fetches this file through its CDN when the app is
installed; to see what Apple has cached: `https://app-site-association.cdn-apple.com/a/v1/heetz.up.railway.app`.

## 4. First build (EAS creates certificates and the push key)

From `apps\shell`:
```powershell
eas build -p ios --profile production
```
Answer the prompts:
- **Log in to your Apple account?** → Yes (Apple ID + 2FA code). EAS registers the bundle id, turns on the
  *Push Notifications* and *Associated Domains* capabilities, and creates the distribution certificate and
  provisioning profile.
- **Generate a new Apple Push Notifications service key?** → **Yes.** EAS keeps it; the Expo push service uses
  it to deliver to APNs. (If you skipped it: `eas credentials -p ios` → Push Notifications → set up.)
- The build number is incremented automatically on every production build (`appVersionSource: remote`,
  `autoIncrement`). The marketing version is `version` in `app.config.ts` (1.0.0).

The build runs on Expo's Macs (10–30 min; the free plan queues longer and has a monthly build allowance — see
https://expo.dev/pricing). You get a link to the `.ipa`.

## 5. App Store Connect app record

https://appstoreconnect.apple.com → **Apps → + → New App**
- Platform **iOS**, Name (see §0), Primary language **English (U.S.)**, Bundle ID: pick yours from the list
  (it appears after step 4), SKU: anything, e.g. `lumi-ios-1`, User access: Full.
- **App Information** → copy the numeric **Apple ID** of the app into `apps/shell/eas.json` →
  `submit.production.ios.ascAppId` (replace `REPLACE_WITH_APP_STORE_CONNECT_APP_ID`). Commit.
- **Pricing and Availability** → Price: Free → Availability: **only United States** (deselect all other
  countries/regions).
- **App Privacy** → answer with `docs/app-store/APP_PRIVACY.md` §2 (note the push-token row) and set the
  Privacy Policy URL `https://heetz.up.railway.app/privacy`.
- Age rating questionnaire: user-generated content + unrestricted web access → follow the questions honestly
  (Lumi is 16+, rides 18+).

## 6. Upload to TestFlight

```powershell
eas submit -p ios --latest
```
The first time, let EAS **generate an App Store Connect API key** (it asks) — after that submits need no
Apple login. Processing in App Store Connect takes 5–30 min; you get an email.

Export compliance is answered by the build (`ITSAppUsesNonExemptEncryption = false`, HTTPS only), so there is no
encryption question on each build.

## 7. TestFlight — internal first, then a public link for friends

1. **Internal testing** (no review, up to 100 people who are users of your App Store Connect team):
   TestFlight tab → Internal Testing → **+** group → add yourself → the build. Install the **TestFlight** app
   on your iPhone, accept the invite, run the device checklist in §9.
2. **External testing** (friends, up to 10,000, needs Beta App Review — usually < 24–48 h):
   TestFlight → External Testing → **+** group "Friends" → add the build → fill **Test Information**:
   - *Beta App Description* / *What to Test*: e.g. "Find people at Berkeley to do campus things with. Please try
     signing up, joining a meetup, sharing a class link, and turning on notifications."
   - *Feedback email*, *Privacy Policy URL* (`/privacy`)
   - **Beta App Review Information** → sign-in required: **Yes** → demo account + **Notes**: paste
     `docs/app-store/APP_PRIVACY.md` §3 "Notes for App Review" (it covers sign-in, report/block, account
     deletion and the iPhone-specific features).
     Sign-in: set `REVIEW_LOGIN_EMAIL` / `REVIEW_LOGIN_CODE` on Railway (§3) and replace `[REVIEW_LOGIN_EMAIL]` /
     `[REVIEW_LOGIN_CODE]` in the pasted notes with the real values (only in App Store Connect). Before submitting,
     try it once on the phone: Sign in → the address → Send code → the code → you land on People.
   - Submit for review. When approved: **Enable Public Link** → share the link with friends. They install
     TestFlight, open the link, done. Builds expire after 90 days.
3. Next builds: `eas build -p ios --profile production` then `eas submit -p ios --latest`, add the build to the
   group. Later builds of the same version usually don't need a full review again.

Optional — test on your own phone before TestFlight (ad hoc, no review): `eas device:create` (open the link on
the iPhone to register it), then `eas build -p ios --profile preview` and install from the build page.

## 8. Push notifications — how they flow

The app asks for permission **after the person's first action** (joining something, sending a message, …) with
a short in-app sheet, or from **Settings → Notifications → Push notifications** — never at first launch. The
token goes to `POST /api/push/register`; every new in-app notification for that person is then also sent through
the Expo Push API (`server/push.ts`), unless they switched notifications off in Settings. Tapping a push opens
the notification's screen. Signing out unregisters the device; account deletion deletes all their tokens.
Shared demo accounts never get push.

To test: sign in on the iPhone with account A, allow notifications, then from another phone/browser with
account B follow A or approve A's join request — A's phone should buzz within seconds. Railway logs show
`[push] …` lines (tokens are always shortened).

**Chat messages** push too (`server/chat-push.ts`) — 1:1, meetup/group, ride and study-group chats: "Lily" /
"are you still coming?" (group chats: room title / "Lily: …"), tap opens that chat. At most one push per chat per
30 s per person, then one "N new messages" push that replaces it on the lock screen (`collapseId`), stacked per
chat (`threadId`). No push while that chat is open on any of the person's screens, for messages already read, to
blocked pairs, suspended accounts or demo accounts. There is no per-chat mute yet — Settings → Notifications off
stops all pushes.

## 9. Device checklist (things that cannot be verified without an iPhone)

- [ ] Splash (dark, "lumi.") goes straight into the app — no white flash, both designs.
- [ ] Sign in, force-quit, reopen (and after a reboot): still signed in.
- [ ] Swipe from the left edge goes back; pull down at the top of a page refreshes.
- [ ] Share a class / plan / ride link → iOS share sheet; the link opens the app from Messages (long-press shows
      "Open in Lumi"); a `lumi://p/<id>` link from Notes opens the app.
- [ ] Links to other sites open in a Safari sheet; email/phone links open Mail/Phone; "Add to calendar" on a plan
      opens the calendar file.
- [ ] Airplane mode → "You're offline" screen → back online → Try again.
- [ ] Chat: the text field stays right above the keyboard (if it jumps or leaves a gap, tell the developer —
      `KeyboardAvoidingView` in `apps/shell/App.tsx` can be switched off to get Safari's behaviour).
- [ ] Status bar readable in Classic (dark text) and New design (light text).
- [ ] Push: prompt appears after the first action (not at launch), arrives, tap opens the right screen.
- [ ] Chat push: B sends A three quick messages while A's app is in the background → one push, ~30 s later it is
      replaced by "3 new messages"; tap opens the chat. With the chat open on A's phone → no push. Lock A's phone
      with the chat open, wait ~40 s, send again → push arrives (the app's "I'm viewing" signal expired).
- [ ] Sign in with the review account (§7): code entry stays in the app; switching to Mail and back keeps the
      typed e-mail and the code field.
- [ ] No "Design: Classic ⇄ New" or "Feedback" pills, no "Demo tools", location row or "mock API" text anywhere;
      Settings → Send feedback works.
- [ ] Settings → Delete account works and the app returns to the welcome screen.

## 10. If App Review cites guideline 4.2 (Minimum Functionality)

4.2 rejects apps that are "a repackaged website". Lumi's shell already ships native push, share sheet, universal
links, haptics, offline handling, Keychain login and in-app browser — the reviewer has to *see* them.

1. **Reply in the Resolution Center** (don't just resubmit): list the native features and where to find them
   (Settings → Notifications → Push notifications; share a plan → iOS share sheet; tap a push → opens that
   screen; airplane mode → offline screen), and say the content is personalized, real-time campus data for
   signed-in students, not a website mirror. Make sure the demo account works and has activity.
2. **Make the app look finished for review**: done inside the app (`isNativeShell()`), unchanged in browsers —
   no floating "Design: Classic ⇄ New" pill, no floating Feedback pill (Settings → **Send feedback** instead),
   no "Demo tools", no location-permission row (the app reads no location), no "demo" hints (language note,
   cover/photo hints, instant school-email verify, ID-verified toggle, the voice prompt that doesn't record),
   footer shows "Lumi for iPhone <version>". ⚠ Still open: **pick one design as the default** — in the app
   people stay on whatever design the device last had (default Classic) since the pill is gone.
3. If rejected again, add native features that matter for the use case, in this order of effort:
   native "Add to Calendar" for plans/meetups (expo-calendar), local reminders before a meetup starts
   (scheduled local notifications), a home-screen quick action ("Ask Lumi", "My plans"), a native tab bar.
   Each is a small `apps/shell` + bridge change; ask a developer to add the one App Review points at.
4. Other guidelines reviewers check on this kind of app, already covered: 5.1.1(v) account deletion in the app,
   1.2 report + block (the "review within 24 h" promise needs the moderation tooling — see APP_PRIVACY.md §4),
   no third-party login so Sign in with Apple is not required.

## Reference

| File | What |
|---|---|
| `apps/shell/app.config.ts` | name, scheme `lumi`, bundle id, associated domains, plugins (all env-driven) |
| `apps/shell/eas.json` | build profiles (development / preview = internal ad hoc, production = App Store) and submit |
| `apps/shell/App.tsx` | the WebView shell, link routing, offline screen, push tap handling |
| `apps/shell/src/bridge.ts` | `window.LumiNative` injected script + message protocol |
| `src/lib/native.ts`, `src/components/native/*` | web side: share/haptics/push helpers, soft push prompt, pull-to-refresh |
| `server/push.ts` | token storage (`pushTokens` docs), Expo Push sending, receipts |
| `server/chat-push.ts` | chat message push: who gets it, wording, 30 s per-chat limit + summary, "viewing this chat" |
| `server/review-login.ts` | App Review sign-in (`REVIEW_LOGIN_EMAIL` / `REVIEW_LOGIN_CODE`) |
| `server/app-links.ts` | apple-app-site-association |
| `apps/shell/scripts/render-icons.mjs` | regenerates the icon and splash images |

Local checks (any OS): in `apps/shell` run `npx tsc --noEmit`, `npm test`, `npx expo-doctor`,
`npx expo export --platform ios`.
