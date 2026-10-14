# App Store Connect — App Privacy answers and App Review notes

Derived from a code audit on 2026-10-14 (branch `claude/friendly-euler-emuo1f`). The public pages are
`/privacy` and `/terms` (`src/pages/legal/LegalPages.tsx`, served by `server/legal.ts`). If a feature
changes what Lumi collects or who receives it, update the page, this file, and the App Store answers together.

> Not legal advice. Have a lawyer review the Privacy Policy, Terms of Use and these answers before public launch.

- **Privacy Policy URL:** `https://<production host>/privacy` (today: https://heetz.up.railway.app/privacy)
- **Terms of Use (EULA) URL:** `https://<production host>/terms` — paste into App Store Connect → App Information → License Agreement (custom EULA) or link it from the description.
- **Operator name and contact email** come from Railway env `LEGAL_NAME` and `PRIVACY_CONTACT_EMAIL`. Until both are set, the pages show a highlighted `[… — to be set]` placeholder.

---

## 1. Audit — what the app collects (with code references)

| Data | Where it comes from | Where it is stored | Who else receives it |
|---|---|---|---|
| School email | Sign-up "email" step / sign-in sheet → `POST /api/schools/send-code`, `/api/auth/register`, `/api/auth/attach-email` (`server/index.ts`) | Postgres `accounts` (email ↔ user id), `email_codes` (6-digit code, 10-min TTL) — `server/store.ts` | **Resend** (sends the code, `server/mail.ts`). Never sent to other users (not on the `User` object). Optional: "Skip for now" creates an account with no email. |
| Session token | `issueSession()` — 32 random bytes | Postgres `sessions` (no expiry today); browser `localStorage` `aroundu.remote.token.v1` (`packages/core/src/api/remote/index.ts`) | — |
| Profile | `RegisterInput` / `users.update` (`packages/core/src/types/index.ts` `User`) — nickname, birth year (age is shown on profile cards: `PersonPage.tsx`, `HomePage.tsx`), school, role, major, year, emoji avatar + color, bio, likes, free time, interests, purposes, goals, looking-for / can-offer roles, prompt answers, icebreaker answers, "now want", daily answer, housing type + zone, optional height, `gender` (sign-up sets `'private'`; no production screen asks for it) | Postgres `docs` (`users`) | Other signed-in users (see §4 gap 1). OpenAI for AI features (below). |
| Photos | **None uploaded.** Avatars are emoji + hue. `avatar.url`/`photos` are only bundled stock images on sample profiles (`apps/mobile/src/photos.ts`, `public/photos`). No `<input type=file>`, camera or photo-library code exists. | — | — |
| Voice prompt | UI timer only — stores `durationSec`, no audio (`src/components/prompts/PromptComponents.tsx`) | `users` | — |
| Timetable | Courses added by the student (name, days/times, room, instructor, section, term) | `users.timetable` | Others get busy blocks only, and only within `fieldVisibility.timetable` — names/rooms stripped (`packages/core/src/lib/privacy.ts` `profileFor`, applied in `server/view.ts`). Class rosters show "takes this class" to verified classmates unless `showToClassmates` is off. |
| Location | **No device location.** No `navigator.geolocation`, no expo-location. `settings.locationPermission` is just a stored preference toggle (`SettingsPage.tsx`). Event/ride places are picked from presets or typed. | — | Map tiles from CARTO (`src/pages/map/MapPage.tsx` `TILE_URL`) — CARTO sees IP + map area viewed. |
| Posts, comments, meetups, participations, proposals, plans/votes, rides (preset pickup, destination, time, seats, optional cost + note), chats/messages, friend requests, follows, likes, saves, RSVPs, icebreaker games | RPC `POST /api/rpc/:group/:method` | Postgres `docs` | Other users per feature. Messages are stored in plain text (not end-to-end encrypted). |
| Anonymous posts | `post.anonymous` | `posts.authorId` is stored | Server removes `authorId` (and commenters' ids) for everyone but the author — `privacy.ts` `postFor`. Only the school name is sent. |
| Blocks, reports | `relationships.block`, `reports.create` (`packages/core/src/api/engine.ts`) | `docs` | Reports go to the DB only (see §4 gap 2). |
| Seat alerts, dining favorites, gym alerts | `server/seats.ts`, `server/dining.ts`, `server/gym.ts` | `docs` (`seatWatches`, `diningFavorites`, `gymAlerts`) | — (delivered as in-app notifications) |
| Link-plan guests (`/p/<id>`) | First name typed by a person without an account + random device token, stored hashed (`packages/core/src/types` `PlanResponse.tokenHash`, `server/plans.ts`) | `timePolls` | Host and Lumi responders (never the hash). |
| Ask Lumi | Question + last 8 turns (`/api/ai/ask`) | Postgres `ai_logs` (input, output, user id, school) | **OpenAI**: system prompt with school, major, year, interests, goals (`server/ai.ts` `viewerContext`) + conversation + tool results (public listings, clubs, courses, meetups). |
| "Fill in my profile" | Free text or pasted résumé at sign-up (`/api/ai/profile-draft`, no account yet, IP rate-limited) | `ai_logs` (no user id) | **OpenAI** (the text). |
| Conversation starters | `/api/ai/starters` | `ai_logs` (input = target user id) | **OpenAI**: facts about the *other* person that they let the viewer see (`starterFacts`: nickname, department, shared classes/interests/goals/clubs, bio, likes, free time, prompt answers, now-want). |
| Feedback | Feedback button → `POST /api/feedback` (message + current path) | Postgres `feedback` | **Resend** → `FEEDBACK_EMAIL` (includes nickname + user id). |
| Notifications | In-app (`notifications` collection, SSE `/api/events`). **iPhone app only, opt-in:** push via the Expo Push API → APNs (`server/push.ts`) — the device's Expo push token is stored per user, the push carries the notification title/body and an in-app path. Token deleted on sign-out on that device, on DeviceNotRegistered, and on account deletion. Email is used only for sign-in codes. | `docs` (`notifications`, `pushTokens`) | **Expo** (push service) and **Apple** (APNs): push token + notification title/text. |
| Analytics / ads | **None.** No analytics, crash-reporting or ad SDK in `src/`, `packages/core`, `apps/mobile`. No tracking cookies. | — | — |
| Server logs | `console.log/error` → Railway logs. Errors and Resend failures; no request logger. `[mail] (not configured) code for <email>` is printed only when Resend is not configured. | Railway | Railway |
| Browser storage | `localStorage`: session token, design, language, dining filters, last-seen card, plan guest token + name; `sessionStorage`: sign-up draft, Ask Lumi conversation, return path | Device | — |
| Fonts | `index.html` loads Google Fonts | — | Google sees IP. |
| Public data the server reads | Cal Dining (`server/sources/cal-dining.ts`), Density RSF crowd meter (`server/sources/density.ts`), Berkeley classes / SIS, academic calendar ICS, Devpost, Greenhouse/Lever boards | — | Nothing about users is sent to these. |

**Account deletion** — "Settings → Delete account" (commit 8103874, `POST /api/auth/delete-account`):
`packages/core/src/lib/account.ts` `eraseUser` erases the profile and content (1:1 chats deleted for both sides,
their group-chat messages deleted, hosted meetups/plans/rides cancelled with an unnamed notice, reports they filed
kept as `u_deleted`), and `server/store.ts` `forgetUser` deletes login email, sessions, codes, AI logs and feedback.
`/privacy` §5 matches this. Shared demo accounts and sample profiles cannot be deleted (403).

**Age** — Lumi is 16+ (Terms §1, Privacy §7), owner decision 2026-10-14: some freshmen start college at 16.
Sign-up (`src/pages/onboarding/StartPage.tsx`) rejects birth years later than `currentYear − 16` (birth year
only, so a floor, not proof). Ride sharing stays 18+ (`rideEligibility` in `packages/core/src/lib/rides.ts`,
checked on the server when posting or joining). No federal parental-consent requirement applies at 13+ (COPPA is
under 13), but state minor/social-media laws (incl. California) change often — have a lawyer confirm before
public launch. App Store age rating questionnaire: answer for user-generated content, messaging and in-person
meetings; the resulting rating may be higher than 16+, which limits downloads on phones with parental controls.

---

## 2. App Privacy questionnaire answers

**Do you or your third-party partners collect data from this app?** Yes.

**Tracking:** No data type is used for tracking. Lumi has no ads, no ad networks, no data brokers and no IDFA.
Answer **"No"** to "used to track you" for every type below.

| Apple data type | Collected? | Linked to identity? | Tracking? | Purposes |
|---|---|---|---|---|
| Contact Info → **Name** | Yes (nickname/first name; link-plan guest first names) | Yes | No | App Functionality |
| Contact Info → **Email Address** | Yes (school email) | Yes | No | App Functionality (sign-in, school verification) |
| Contact Info → Phone, Physical Address, Other | No | — | — | — |
| Health & Fitness | No (gym crowd alerts are about the gym, not the user's body) | — | — | — |
| Financial Info | No | — | — | — |
| Location → Precise / Coarse | No (no device location is read; places are chosen from presets) | — | — | — |
| Sensitive Info | No (no field asks for race, religion, orientation, etc.; `gender` is fixed to "private" in production) | — | — | — |
| Contacts | No | — | — | — |
| User Content → **Emails or Text Messages** | Yes (in-app chat messages) | Yes | No | App Functionality |
| User Content → Photos or Videos | No | — | — | — |
| User Content → Audio Data | No | — | — | — |
| User Content → Gameplay Content | No (icebreaker answers declared under Other User Content) | — | — | — |
| User Content → **Customer Support** | Yes (Feedback button) | Yes (when signed in) | No | App Functionality, Analytics (product improvement) |
| User Content → **Other User Content** | Yes (profile text, prompt/icebreaker answers, timetable, posts, comments, meetups, plans, rides, reports, AI profile text) | Yes | No | App Functionality, Product Personalization (recommendations, classmates, free-time matching) |
| Browsing History | No | — | — | — |
| **Search History** | Yes (Ask Lumi questions are logged) | Yes | No | App Functionality, Analytics (we read logs to improve answers) |
| Identifiers → **User ID** | Yes (account id, session token) | Yes | No | App Functionality |
| Identifiers → Device ID | **Yes, conservatively** — iPhone app, only after the person turns on push: the Expo push token (a per-install device token). No advertising id. (The link-plan guest token is random per plan and stored hashed.) Many apps don't declare push tokens; declaring it is the safe answer. | Yes | No | App Functionality |
| Purchases | No | — | — | — |
| Usage Data → Product Interaction | No (saves/RSVPs are user content; no interaction analytics) | — | — | — |
| Usage Data → Advertising Data, Other | No | — | — | — |
| Diagnostics (Crash, Performance, Other) | No (no crash/performance SDK; hosting logs are operational) | — | — | — |
| **Other Data** | Yes (birth year/age, optional height, housing type + zone, goals/interests, alert preferences) | Yes | No | App Functionality, Product Personalization |

Third-party processors to keep in mind when answering "third-party partners": Railway (hosting/DB), Resend
(email), OpenAI (AI features). Google Fonts and CARTO receive IP addresses only when loading fonts/tiles.

The iPhone app is `apps/shell` (Expo): the live web app in a WebView plus native push (expo-notifications → Expo
Push → APNs), share sheet, haptics and an in-app Safari view for other sites. It asks for **one** permission —
notifications, only after the person's first action or from Settings → Notifications — and declares no other
usage strings (no camera/photos/location/contacts/mic/Face ID). It keeps a copy of the session token in the iOS
Keychain so people stay signed in. No analytics or crash SDK. (`apps/mobile` is the old mock-data prototype and
is not what ships.) Any added SDK (crash reporting, analytics) changes these answers.

---

## 3. Notes for App Review (paste into App Store Connect → App Review Information → Notes)

> Lumi is a campus app for UC Berkeley students to find events, clubs, classmates and people to do things with.
>
> **Sign-in:** Lumi normally signs students in with a one-time code sent to their school (@berkeley.edu) email.
> For review: [DEMO LOGIN — to be set, see open items]. You can also create an account without a school email:
> tap **Get in**, answer the short questions, and on the last step tap **Skip for now**.
>
> **Report and block:** On any person's profile, tap ⋯ → **Report user** or **Block**. Posts, meetups,
> listings and rides have a ⋯/flag menu with **Report**. In a chat, tap ⋯ → Report / Block. Blocked users can't
> see or message each other. Reports go to our moderation team, who review them within 24 hours and remove
> content / ban users under our zero-tolerance Terms of Use (https://<host>/terms).
>
> **Delete account:** Settings (profile → gear) → **Delete account** → type DELETE to confirm. The account,
> sign-in email, profile, posts and messages are deleted immediately. (The shared demo account can't be
> deleted — to try deletion, create an account with Get in → Skip for now.)
>
> **Terms:** Users agree to the Terms of Use and Privacy Policy when they start sign-up (links on the welcome
> screen and the last sign-up step), and can read them any time in Settings.
>
> Lumi does not use location, camera, photos or contacts. Push notifications are optional: the app offers them
> after your first action (e.g. joining a meetup) or from Settings → Notifications → Push notifications.
> It is for users 16+; ride sharing is 18+.
>
> **iPhone features:** besides the shared web content, the app uses native push notifications (tapping one opens
> the right screen), the iOS share sheet for class/plan/ride links, universal links (lumi links shared in group
> chats open in the app), haptics, swipe-back navigation, pull-to-refresh and an offline screen.

---

## 4. Gaps found in the audit (fix before launch)

1. ~~**Visibility is enforced only in the UI.**~~ Fixed: `server/view.ts` now applies
   `packages/core/src/lib/privacy.ts` to every snapshot and patch — profile sections outside `fieldVisibility`
   aren't sent (key absent), nor gender, saved clubs, meet preferences or settings; hidden school/major are
   dropped; relationships are only the viewer's own (received likes only when mutual, blocks only the viewer's,
   people who blocked the viewer aren't sent); anonymous posts lose `authorId`; likes/saves are the viewer's own
   plus a count; posts/meetups outside their visibility, other people's pending requests, club applicants,
   others' saved listings and other people's time polls aren't sent. Tests: `server/privacy.test.ts`.
   Still always visible by design: nickname, avatar, age (birth year), year, region, looking-for/can-offer
   roles, "now want", and club member/follower lists.
2. **Reports reach nobody.** `reports.create` only writes to the DB; there is no alert email and no admin
   list/action endpoint on this branch, so the "review within 24 hours" promise (Terms, review notes) can't be
   kept. Needed: report alert (e.g. Resend to an ops address), an admin view, and remove-content / suspend-user.
3. **Reviewer login.** Sign-in needs a code sent to a school inbox; Apple can't receive one. Needed: a review
   account (e.g. env-configured review email + fixed code) — then fill the review notes above.
4. **Sessions never expire** (`sessions` table has no TTL). Consider expiry and a "sign out everywhere".
5. **Retention periods** for AI logs, feedback and server logs are not defined — the policy says "kept to fix
   problems" and "for a limited time"; set real numbers and automate deletion.
6. Pages are English only (US release). The app also has a Korean UI.
