# Harness A — dark tokens and components

Everything a Harness A screen needs lives in **`src/components/ha`** (`import { … } from '@/components/ha'`).
New screens use only these plus `Avatar` / `Cover` / `BottomSheet` from `src/components/ui`. Colours come only from
the tokens below — no hex values in screen files.

## 1. Palette (src/index.css `@theme`) — the only theme

The app has one dark theme. The old Classic/v2 switch (`?design=`, Settings → Design, `src/lib/design.ts`) is gone.
The legacy `v2:` variant is now always on so older screens keep their dark overrides until they are rebuilt; **do not
use `v2:` in new code**.

| PDF role | PDF value | Token(s) | Dark value | Use |
|---|---|---|---|---|
| Background | `#F9F9FF` | `bg` | `#08070C` | page background |
| Surface | `#FFFFFF` | `surface` / `surface-2` / `line` | `#16131F` / `#1F1B2B` / `#2A2433` | cards / inputs, pressed / 1px borders |
| Text | navy | `ink` / `ink-2` / `ink-3` | `#F4F1FF` / `#A79FC4` / `#8A84A6` | titles / body, meta / captions, placeholders |
| **Primary** (navy CTA) | `#333E72` | `primary` + `on-primary` | lavender `#C4B5FD` + ink `#140F24` | the one big button per screen (BottomCTA, empty-state button, Get Started) |
| **Selected** (bright blue) | `#4D61FF` | `sel` / `sel-fg` / `sel-soft` / `sel-line` | `#FF3DA8` / `#FF7AC0` / `#2A0E20` / `#6B1A4C` | underline tab bar, selected chip, active tab-bar item, links ("View source ↗", "Sign In", "View meetup"), switches, focus ring |
| Ice blue (Events) | `#EDF0FF` | `t-ice` / `t-ice-fg` | `#171C36` / `#9DB0FF` | events, classes, calendar icons |
| Peach (Opportunities) | `#FFF2E7` | `t-peach` / `t-peach-fg` | `#2A2015` / `#FFC27A` | opportunities, dining, coffee |
| Mint (Clubs) | `#EAF5F1` | `t-mint` / `t-mint-fg` | `#11261F` / `#6FE0B9` | clubs, recreation, free time |
| Rose (Meetups) | `#FCEEF4` | `t-rose` / `t-rose-fg` | `#2B1522` / `#FF9AC8` | meetups, people, communities row |
| Lavender (PDF icon tiles) | — | `t-lav` / `t-lav-fg` | `#1F1934` / `#B9A6FF` | campus life, research, AI, online |
| status | — | `ok`, `danger`, `gold` | `#6FE0B9`, `#FF5C7A`, `#FFC94D` | live dot, errors, warnings |

Decisions:
- **One primary: lavender-on-ink** (was neon lime `#D4FF3A` until 2026-11-06 — the owner found it hard on the eyes; the `lime-*` token names stay for old screens). Pink is
  never a filled button — it only marks *selection* and *links*, exactly where the PDF uses bright blue.
- **Category tints** are deep, low-saturation versions of the PDF pastels with a light icon colour; the tile label
  stays `ink`, so the four Home tiles keep their colour coding on black. `tones.ts` maps
  `events→ice, opportunities→peach, clubs→mint, meetups→rose` — use `CATEGORY_TONE`, don't pick by hand.
- Contrast (WCAG AA, small text ≥ 4.5:1): `ink` 17:1, `ink-2` 7.3:1, `ink-3` 5.1:1 on `surface` (4.8:1 on
  `surface-2`; it was `#6E6889` = 3.5:1 and was lifted), `sel-fg` 7.8:1, `t-*-fg` on their tint ≥ 6:1.

## 2. Type

Plus Jakarta Sans (already loaded in `index.html`; it is the PDF's geometric sans) for everything — Unbounded and
Inter are no longer used by the theme.

| Level | Class | Size / weight | PDF example |
|---|---|---|---|
| Page title | `ha-title` | 28 / 800, tracking −0.03em | "Explore", "Social", "Good morning!", "Recreation" |
| Section | `ha-h2` | 19 / 700 | "For you", "Your week", "My Communities" |
| Back-header title | (BackHeader) | 17 / 700 | "‹ Recreation" |
| Card title | — | 15 / 700 | "Campus design showcase" |
| Body | — | 14–15 / 400–500 `ink`/`ink-2` | descriptions |
| Meta / caption | — | 12.5–13 `ink-3` | "Example date · On campus" |
| Tab bar label | (TabBar) | 11 / 600 | "Home" |

Radii: cards 20px, icon tiles 14px, chips / buttons fully round. Cards are `surface` + 1px `line`, no shadow.

## 3. Components

### Shell (`Shell.tsx`)
| Component | PDF | Notes |
|---|---|---|
| `TabBar` | bottom bar Home · Explore · Schedule · Social · Profile | rendered by `AppShell` (via `BottomNav`) on tab roots only. Active item = `sel-fg`. `TABS[].also` lists the paths that light each tab. |
| `BrandHeader({actions, title?, children?})` | S012 "Lumi ⌕ 🔔 💬", S037 + big "Social", S071 "Lumi ⚙ 💬" | `actions`: `'search' | 'bell' | 'messages' | 'settings'` or a custom `{key,label,icon,onClick}`. Unread dots come from `useUnreadCounts`. `children` = SegTabs under the title. Sticky. |
| `TitleHeader({title, actions, children})` | S017 "Explore ⌕ 🔔 💬", S027 "Schedule 📅" | big title is the header. |
| `BackHeader({title?, onBack?, onMore?, right?})` | "‹ Title ···" | `···` only appears when `onMore` is given (no dead dots). Title may be empty (S020, S046). |
| `PageTitle({title, sub})` | big title + one grey line under a BackHeader | "Recreation / UC Berkeley · Recreation". |
| `OnboardingHeader({step, total, onBack?, onSkip?})` | "‹ Lumi · 1 of 6      Skip" | |
| `Wordmark({size, dot})` | "Lumi" (dot on Welcome) | |
| `Screen` | page wrapper (`bg`, bottom padding) | |

### Controls (`Controls.tsx`)
| Component | PDF | Notes |
|---|---|---|
| `Btn({variant, size, full, loading, icon})` | navy pill / white outline pill / blue text | `primary` (lavender), `outline`, `link` (pink text), `danger`. Sizes `lg` 52 · `md` 44 · `sm` 36. |
| `BottomCTA({leading?, note?})` | sticky bottom button bar (Continue, Going, Create Meetup …) | put a `Btn full size="lg"` inside; `leading` for `RoundIconBtn` (bookmark). |
| `RoundIconBtn` | round bookmark button left of "Going" | |
| `Chip({active, onClick, icon, size})`, `ChipRow({wrap})`, `ChoiceChips` | Coffee / Study …, the chips inside FilterSheet | selected = `sel-soft` + `sel-line` border + `sel-fg` text. `ChipRow` scrolls sideways unless `wrap`. |
| `SegTabs({tabs, value?, onChange?})` | underline tabs | each tab `{key, label, to?, count?}`. With `to` they are links (replace) — the URL owns the tab. |
| `SearchField({placeholder, value, onChange \| onOpen})` | "Search events" | `onOpen` turns it into a button that opens `/search`. |
| `FormField({label, hint})`, `TextInput({icon})`, `TextArea`, `SelectField({icon, value, placeholder, onClick})` | form rows (School email ✉, Verification code 🔒, Group type ▾) | `SelectField` opens a sheet you provide. |
| `Switch` | toggle rows (S066, S085) | |

### Filters (`Filters.tsx` + `filterModel.ts`) — owner 2026-11-06 (reference board: entry B, panel 1)
| Component | Use | Notes |
|---|---|---|
| `FilterBar({groups, values, onApply, count})` | the one row under a list's search box (Explore S017–S019, S089) | `[sliders Filters (n)]` + only the applied filters as pink × chips (× clears that one). Nothing applied → just the button, plus the sort quietly on the right ("Recommended ▾", opens the sheet at Sort); a non-default sort stays on the right next to chips. Owns the sheet's open state; values live with the caller (Explore: the URL). |
| `FilterSheet({open, groups, values, count, onApply, onClose, focus?})` | bottom sheet over the current screen | ✕ · "Filters" · **Reset** (back to defaults, draft only); sections of wrap chips (selected = pink, one per group, tap again to clear); sticky lavender **Show N results** — `count(draft)` live, disabled "No results" at 0. Picks are a draft until Show; Esc, swipe down on the handle/header, ✕ or the backdrop close without applying. Focus is trapped inside and returns to the opener; chips are buttons with `aria-pressed`; the count is announced (`aria-live`). |
| `FilterGroup` / `FilterValues`, `appliedChips`, `toggleValue`, `resetValues`, `sortLabel`, `pickValues` | `filterModel.ts` — pure, no React | group `{key, title, options: {value, label, chip?}[], required?}`; `required` = the sort (always one on, not a chip). `chip` = shorter name for the applied chip ("Only saved (2)" → "Saved"). |

`renderGroup(g, value, set)` (FilterBar → FilterSheet) draws one section in place of its chips — S029 uses it for the
Department section (search + ★ list, favourites first, `orderDepartments`). Return `null` for the default chips. A group
option with value `''` is a real choice that is never a chip (S029 Term: `''` = the current term).

The caller passes a `count` that runs **the same filter function as the list** (Explore: `src/pages/explore/exploreFilters.ts`
`filterOpportunities` / `filterEvents` / `filterClubs`) — never a second copy of the rules. Tested in `server/explorefilters.test.ts`.

### Cards (`Cards.tsx`)
| Component | PDF | Notes |
|---|---|---|
| `SectionHeader({title, action?, onAction?})` | "For you        See all ›" | |
| `IconTile({tone, size})` | 40–44px tinted rounded square | |
| `Badge({tone})` | "Campus event", "Source verified", "Coffee" | |
| `CategoryTile` + `CategoryGrid` | Home 2×2 | use `CATEGORY_TONE`. |
| `RowCard({tone, icon, title, sub, right?, badge?, onClick?})` | "Make room for a good plan ›" | chevron appears when clickable. For settings/actions/status rows — **not** for content items (clubs, events, meetups), which are text-first cards. |
| `ListingCard({cover, badge, badgeTone, time, urgent, title, line, meta, where?, sourceUrl, saved, onSave, onClick})` | S017 event/opportunity card | **Option A** (owner 2026-11-06; the colour stripe was tried and removed): top row = type chip (`badgeTone`) + time chip (`time`: event "Thu, Nov 6 · 5 PM", deadline "D-13" / "D-Day" — never "13 days left" or "Closes today"; `urgent` = D-3 or less → pink `sel`, else neutral), bold title, one-line description (`line`), host · place (`meta`), `where` = the location on its own line. 88px image **only when a user uploaded it** (`isUploadedPhoto` — `api/media/…`; source/scraped images and demo photos are never drawn) — no icon block, emoji block or initials square anywhere (`icon` is ignored). Type tints (`exploreData.badgeTone`): events + hackathons ice, internships + startups peach, research + study abroad lav, scholarships mint. "View source ↗" only with a real URL. |
| `MeetupCard({tone, badge, time, title, meta, cover?, people, footnote, action, onClick})` | S037 "Coffee after class … View meetup", club events in Explore | **Option A**: type chip + time chip, bold title, host · place, footer people + action; a small photo only when the host uploaded one (`isUploadedPhoto`; `icon` ignored). `people` are real participants only. |
| `ClubItem` (`src/pages/explore/ExploreItems.tsx`) | Explore › Clubs, Home My Communities, Social Your groups, Search | name, one-line description, kind · relation; a logo only when an organizer uploaded it. |
| `AvatarStack` | overlapping faces | |
| `PersonCard({avatar, name, meta, bio, action})` | S039 "Jordan · Second-year · Design   [Add Friend]" | `action` = a `Btn size="sm" variant="outline"`. |
| `InfoRows({rows})` | S020 Who it's for / Benefits / Original source; S035 When / Where | rows `{tone, icon, label, value, caption, onClick?, right?}`. |
| `TextCard({title?})` | description / About cards | |
| `HeroBanner({tone, icon})` | S022 / S046 tinted banner with an icon | instead of stock photos. |
| `cardCls` | the card surface classes | for one-off cards. |

### States (`States.tsx`)
| Component | PDF | Notes |
|---|---|---|
| `InfoNote` | "(i) You can change this later." | the PDF puts one under most lists/forms — keep them short, one line. |
| `EmptyCard({title, sub, primary, secondary})` | S013 "Your campus starts here." [Explore Campus][Create Meetup] | inside a section. |
| `EmptyState({icon, tone, title, sub, action, children})` | S041–S044, S028, S095, S096 | whole tab/screen empty; `children` for extra chips/buttons. |
| `ErrorScreen({message, onRetry})` | S094 "Let's try that again" | use instead of the old `ErrorState` in new screens. |
| `LoadingCards({count})` | — | keeps the card layout while loading. |

### Timetable (`src/components/timetable/WeekGrid.tsx`)
| Prop | Use |
|---|---|
| `hourPx` | hour height; S029's compact grid uses 26 (labels shrink to the code only below 40) |
| `ghosts` | `{day,start,end,label}[]` — a course being previewed: pink outline (`sel`) on `sel-soft`. A ghost that hits one of my classes takes the right half so both stay visible |
| (always) | my own classes that overlap each other sit side by side (they used to cover each other) |

### Course list rules (`@core/lib/coursefinder`, `@core/lib/courseLinks`) — pure, tested in `server/coursefinder.test.ts`
- `findCourses(courses, {q, dept, level, sort, undergrad})` — the S029 list and its sheet's "Show N results" both call it.
  Search scoring is `scoreCourse` in `@core/data/catalog/courses` (the server's `searchCatalog` uses it too).
- `findOverlap` / `overlapLine`, `isCourseAdded`, `meetingLine`, `courseLevel` (Berkeley numbering: <100 lower, 100–199 upper, 200+ graduate).
- `lumiCounts` / `lumiCountLabel` — counts only, same people as classmate rosters (opted in + verified), never samples.
- `courseLinks(c)` — outbound links from the per-school `COURSE_LINKS` map; empty for schools without a verified entry (see `docs/course-links.md`).

### Screen-specific helpers outside `ha`
- `src/pages/campus/CampusSource.tsx` — `CampusHead` (S015/S016 back header + title + "UC Berkeley · …") and
  `CampusSource` (official-source card; footnote only when the feed is unavailable).
- `src/pages/social/SocialPage.tsx` — `SocialHeader` (BrandHeader + "Social" + SegTabs), `MeetupItem` (MeetupCard from
  an `Activity`), `meetKindOf`.

## 4. Rules
- One `primary` button per screen. Everything else is `outline` or `link`.
- Selection is always pink (`sel*`); category colour is always a tint (`t-*`). Don't use the primary lavender for selection.
- Data that isn't there is not drawn: no sample people mixed into real counts, no stock photos, no "Be the first" lines
  on every row (PRODUCT_TASTE). Sample content in onboarding (S004–S007) carries "Sample preview".
- Headers: tab roots use `BrandHeader`/`TitleHeader`; every other screen uses `BackHeader` (+ `PageTitle` when the PDF
  shows the big title again).
- Copy follows the PDF in English; Korean strings follow `lang` like the rest of the app.
