# Harness A — work plan after the foundation

Branch: `claude/harness-a` (from `claude/ux-fix-1` + merged `claude/friendly-euler-emuo1f`). **Never push to the live
branch.** Each package works on its own branch off `claude/harness-a` (`claude/harness-a-wpN`) and merges back into
`claude/harness-a`. Read first: `SCREENS.md` (what each screen is and what backs it), `COMPONENTS.md` (tokens +
components), `docs/PRODUCT_TASTE.md`.

## What the foundation already did

- One dark theme (`src/index.css`); `?design=` / Classic removed. Selected = pink `sel*`, primary = lavender (was lime), category tints `t-*`.
- `src/components/ha` kit: TabBar, BrandHeader / TitleHeader / BackHeader / OnboardingHeader / PageTitle, Btn, BottomCTA,
  Chip(Row), SegTabs, SearchField, form fields, Switch, IconTile, Badge, CategoryTile, RowCard, ListingCard, MeetupCard,
  PersonCard, InfoRows, TextCard, HeroBanner, SectionHeader, InfoNote, EmptyCard, EmptyState, ErrorScreen, LoadingCards.
- Five tabs and the route map (`src/routes/*`), redirects for every old address, dropped features without entry points.
- Rebuilt: Home (S012–S014, with Campus today), Welcome (S001), Schedule tab root (S027/S028), Social header + For You
  (S037/S041), Profile (S071), Explore header/tabs (S017–S019 bodies still legacy), Recreation/Dining header + source card
  (S015/S016 bodies still legacy), OnboardingHeader on `/start`.
- Screenshots of all of the above: `/tmp/claude-0/-home-user-seller-copilot/6500056d-9959-56e4-895e-254f0649b631/scratchpad/ha/`.

## Rules that keep five packages from colliding

1. **Own your directories.** Only edit files your package owns (table below). If you need a change in someone else's
   file, ask that package (or the coordinator) — don't edit it.
2. **Routes:** add/change routes only in *your* `src/routes/<area>.tsx`. `src/App.tsx` is frozen. Old addresses you retire
   go into `src/routes/redirects.tsx` as **appended lines only** (it is shared; never reorder or delete others' lines).
3. **`src/components/ha` is shared and additive.** You may add a new component in a **new file** (`ha/<Name>.tsx`) and
   export it from `ha/index.ts` (append one line). Don't change existing props or looks — if a component is wrong,
   say so and the foundation owner fixes it once for everyone.
4. **`src/index.css` tokens are frozen.** No new colours in screen files (no hex). Need a token → ask.
5. **Legacy `src/components/ui`, `src/components/cards` (except the files assigned below), `src/components/layout`**:
   no visual changes — many screens still use them. Replace usages in your screens with `ha` instead.
6. **`packages/core` and `server`:** additive. New API = new namespace or new methods, new types appended, new server
   module + `server/<thing>.test.ts`. Don't rename existing fields. Mock API (`packages/core/src/api/mock`) gets the same
   method. Run `npx tsc -b && npm run typecheck:server && npm test` before every push.
7. **i18n** (`packages/core/src/i18n/en.ts`): append-only. Prefer `lang === 'en' ? … : …` inline like the rebuilt screens.
8. Commit in small logical commits, rebase on `claude/harness-a` before merging, no force-push to shared branches.
9. Product rules: real data only (no stock photos, no fake people/counts), one sentence per card, no "Be the first" on
   every row, one primary button per screen, sample content labelled "Sample preview" (PRODUCT_TASTE.md).

## Ownership

| Package | Owns (edit freely) | Shared (append-only) |
|---|---|---|
| WP1 Onboarding | `src/pages/onboarding/*`, `src/routes/onboarding.tsx`, `src/lib/returnTo.ts` | redirects.tsx, ha/index.ts |
| WP2 Home + Explore + details | `src/pages/home/HomeDashboard.tsx`, `src/pages/explore/*`, `src/pages/community/BrowseTab.tsx`, `src/pages/opportunities/*`, `src/pages/org/OrgPage.tsx`, `src/pages/campus/*`, `src/components/cards/{OpportunityCard,OrgCard}.tsx`, `src/components/discover/*`, `src/routes/homeExplore.tsx`, `src/lib/campusLive.ts` | same |
| WP3 Schedule + Planning | `src/pages/schedule/*`, `src/pages/timetable/*`, `src/pages/classes/*`, `src/pages/plans/PlansPage.tsx`, `src/pages/together/*`, `src/components/timetable/*`, `src/components/classes/*`, `src/routes/schedule.tsx` | same |
| WP4 Social / Meetups / Feed / People | `src/pages/social/*`, `src/pages/meet/*`, `src/pages/activity/*`, `src/pages/create/*`, `src/pages/people/*`, `src/pages/home/HomePage.tsx`, `src/pages/home/SearchPage.tsx`, `src/pages/discover/*`, `src/pages/community/CommunityPage.tsx` (FeedTab), `src/components/cards/{ActivityCard,JoinButton,PersonCard,PostCard,TeamCard,NowActivityRow}.tsx`, `src/components/{social,together,people,plans}/*`, `src/components/layout/BottomNav.tsx` (create sheet), `src/routes/social.tsx` | same |
| WP5 Messages + Profile + Settings | `src/pages/chat/*`, `src/pages/notifications/*`, `src/pages/profile/*`, `src/pages/settings/*`, `src/pages/org/MyOrgsPage.tsx`, `src/components/settings/*`, `src/components/prompts/*`, `src/components/cards/ReportSheet.tsx`, `src/routes/me.tsx` | same |

`src/App.tsx`, `src/index.css`, `src/components/ha/*` (existing files), `src/components/layout/{AppShell,TopBar,AppHeader}.tsx`,
`src/routes/redirects.tsx` (existing lines) = foundation; change only through the coordinator.

Note: dead code from dropped features (`src/pages/rides`, `seats`, `map`, `academic`, `plans/PlanPage|CreatePlanPage`,
`components/rides|seats`) is not routed. Leave it (or delete it in a separate, coordinator-approved commit) — the server
keeps those APIs.

---

## WP1 — Onboarding (S001–S011)

**Screens:** S001 Welcome (done, polish), S002 Email login, S003 Your goals, S004–S007 What Lumi can do (4 previews),
S008 Your university, S009 Make it yours, S010 Your communities, S011 A little about you.

**Files:** `WelcomePage.tsx`, `StartPage.tsx` (split into one component per step under `src/pages/onboarding/steps/`),
`ComingSoonSchools.tsx`, `OnboardingPage.tsx` (mock-mode flow — keep working), `src/routes/onboarding.tsx`
(`/login`, `/start/:step` with steps `goals · what · university · discover · communities · about`).

**Order (PDF):** goals (1 of 6) → what Lumi can do (2) → university + status + year (3) → make it yours (4, Skip) →
communities (5, Skip) → about you: name, birth year, school e-mail + code (6) → Home. The draft stays in sessionStorage
(`lumi.start.draft.v3`) so iOS reloads don't lose it; the URL step must survive reload.

**Backend:** none required. Optional: public `orgs.search(schoolId, q)` for S010 "Search organizations" — otherwise keep
the category chips only and offer clubs after sign-up.

**Acceptance:** a new user can sign up on the local stack end to end in remote mode and lands on Home with goals /
interests / role / year / school set (check `/api/bootstrap`); back and Skip work on every step; S004–S007 previews
say "Sample preview" and never show real people; 16+ rule and the "Only you see this" birth-year note stay; S002 works
as a full screen (`/login`) and the old `?signin=1` sheet path still works; 390×844 screenshots of all 11 screens next to
the PDF pages 4–7.

## WP2 — Home + Explore + details (S012–S026, S089–S091; owner: S015/S016 real data)

**Screens:** S012–S014 (done — polish only), S015 Recreation body (space cards, crowd %, people/capacity, hourly chart,
"tell me when under X%" alert sheet) and S016 Dining body (hall open/closed, meal tabs, stations, diet filters,
favorites) in `ha` cards; S017–S019 Explore bodies (SearchField + Recommended / Newest / Ending soon + ListingCards;
Clubs = RowCards + Student Clubs / Greek / Research Labs / Co-op chips); S020/S021 detail (badges, InfoRows, Register at
Source, BottomCTA bookmark + Going / I applied); S090 Q&A tab; S022–S025 Community (SegTabs About · Feed · Events ·
Members, HeroBanner, Follow, Request Membership); S026 Create a group; S089 Explore without an account; S091
Membership requests.

**Files:** see ownership. Replace `BrowseTab` usage in Explore with a new `src/pages/explore/*List.tsx` per section
(keep `BrowseTab` until nothing imports it). Org tabs via `?tab=` on `/orgs/:id`.

**Backend:** `orgs.create` (S026, with admin = creator, join policy), `orgs.respondApplication` (S091),
read-only public explore endpoint for S089 (`GET /api/public/explore?school=` — events/opportunities/clubs only, no
people) — each with tests and mock implementations.

**Acceptance:** Explore tabs keep their state in the URL (back returns to the same tab/chip); "View source" only with a
real `sourceUrl`; saved state round-trips (`toggleSave` → Saved list); Recreation shows live % when the feed is live and
the "No live occupancy" note only when it isn't (test both by stubbing `/api/gym/now`); Home → Campus today cards open
S015/S016; no `v2:` or hex colours in owned files; screenshots S012–S026, S089–S091 at 390×844.

## WP3 — Schedule + Planning (S027–S036)

**Screens:** S027/S028 (done — add week arrows only if they mean something: activities of that week on the grid),
S029 Add/edit a class (manual form per PDF; catalog search stays as the first way in), S030 Class space (SegTabs
Class · Questions · Study; Study together = existing study groups), S031 My Plans (Upcoming · Past · Created),
S032 Create a meeting, S033 Location Ideas, S034 Find a Time, S035 Plan Confirmed, S036 Time poll.

**Files:** see ownership. Routes `/schedule/classes/:id`, `/schedule/meeting/new/places`, `/together/:id/find`.

**Backend:** place options on `TimePoll` (`together.create` input `placeOptions`, `together.votePlace`) — reuse the
link-plan engine (`packages/core/src/api/plans.ts`) logic, not the `/p` pages; class Questions (S030) = new small store
(`classes.ask/answer`) or postpone with the tab hidden. Check S034 with the owner: PRODUCT_TASTE says "don't auto-pick a
time everyone is free" — the PDF's "Best match" must come from the votes people gave, with the host confirming.

**Acceptance:** add a class manually and from the catalog, see it on the grid with a tint; free-afternoon row opens a
prefilled meetup; full poll flow on the local stack with two accounts (create → vote → host confirms → both see Plan
Confirmed + it appears on Schedule + group chat exists); screenshots S027–S036.

## WP4 — Social · Meetups · Feed · People (S037–S067)

**Screens:** S037/S041 (done — polish), S038/S042 Meetups (Better together, + Create, All / My Groups / My Classes /
Nearby, Your groups), S039/S043 People (search, year chips, More Filters, Ask Network, PersonCards Add Friend), S040/S044
Feed (All / My School / My Groups, composer), S045 Create a Meetup, S046 Meetup details, S047 Edit, S048 Manage
participants, S049 Small Tables, S050 Create an activity, S051 Share something, S052 Post & replies, S053 Meetup
location, S054 Public profile, S055 Suggest a meetup, S056 Search, S057–S061 people finding, S062–S066 network, S067
Ask AI.

**Files:** see ownership. Split `CreateActivityPage` into meetup / activity forms behind `/meetups/new`,
`/activities/new` (replace the `CreateRedirect` lines in `routes/social.tsx`); `/posts/:id`, `/users/:id/suggest`,
`/social/people/*`, `/network/*`.

**Backend (largest):** network requests model (S063–S066: request, reach, responses with per-field share consent,
notifications); privacy-safe 2nd-degree suggestions + intro requests (S060, S062); meetup audience (class-scoped
visibility, academic-status filter) and `waitlisted` participations (S045/S046/S048); spoken language / country
opt-in fields for filters (S059 — coordinate with WP5, which owns the profile form). **S057 and S067 (Ask AI) need an
owner decision first** — Ask AI was removed 2026-10-19; build S039's "Ask AI" pill only after a yes.

**Acceptance:** create → join (open and approval) → manage → chat → edit works on the local stack with two accounts;
Requests/Waitlist tabs reflect real participations; Suggest a meetup creates a proposal the other account can accept;
no sample people counted in real numbers; screenshots for every screen built.

## WP5 — Messages · Profile · Settings · System (S068–S088, S092–S096)

**Screens:** S068 Messages (All / Direct / Groups), S069 Conversation (Make it a plan → `/schedule/meeting/new`), S070 /
S095 Notifications, S071 Profile (done — polish), S072 Edit Profile, S073 Get to know me, S074 My Communities, S075
Friends & followers (one tabbed screen), S076 / S096 Saved, S077 Saved people, S078 Recommendation preferences, S079
What you're looking for, S080 Open to, S081 Student status, S082 Next chapter, S083 Discovery & privacy, S084 Settings,
S085 Visibility, S086 Privacy & safety, S087 Lumi+, S088 Checkout, S092 Report, S093 Block, S094 error pattern rollout.

**Files:** see ownership. Routes in `routes/me.tsx`: `/profile/saved` (replace the temporary redirect), `/profile/posts`
(real My Posts list), `/profile/saved-people`, `/profile/preferences`, `/profile/looking-for`, `/profile/open-to`,
`/profile/status`, `/profile/next-chapter`, `/settings/discovery`, `/settings/plus(/checkout)`, `/users/:id/block` (coordinate
with WP4 who owns `/users/:id`), report sheet → screen.

**Backend:** profile fields (spoken languages, country of origin, alumni city/company/role/industry, membership display,
classmate-discovery opt-in) with privacy rules in `@core/lib/privacy` (owner-only / visibility per field) + tests;
download-your-data export; Lumi+ / checkout needs an owner product decision (and App Store IAP rules) — build S087/S088
as informational only until then, never imply a purchase.

**Acceptance:** every settings toggle persists (reload shows the saved value; another account sees the change where the
visibility allows); Settings has no design switch and no demo tools on the real server; Sign Out → Welcome; report and
block round-trip; screenshots S068–S088, S092–S096.

---

## Verification for every package

```
cd <worktree> && npx tsc -b && npm run typecheck:server && npm test
/home/user/aroundu-ux-sim/tools/ux-sim/bin/local-stack up --worktree <worktree> --port 0
```
Screenshots at 390×844 (Playwright: `/home/user/aroundu-ux-sim/tools/ux-sim/node_modules/playwright-core`, chromium
`/opt/pw-browsers/chromium`, sign in with `/welcome?demo=berkeley`; the app scrolls inside `#scroll-root`). Put them next
to the matching PDF page and check: header pattern, title size, card shape, chip/tab selection colour (pink), one lavender
button, footnote line, empty state.
