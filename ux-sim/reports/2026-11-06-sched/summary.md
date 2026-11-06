# ux-sim summary — 2026-11-06

> **AI simulation — hypotheses, not measured user behaviour.** AI personas drove a real browser. Counts are simulated personas, never rates; every risk below is a hypothesis to check with real students.

## Curated problems (analysis.json)

_Written by Scheduled orchestrating Claude session (https://claude.ai/code/session_01VX4jQF3M6doYf7VDXmTdrm). Heuristic clusters are below._

| sev | problem | personas | env-limited | fingerprints |
|---|---|---|---|---|
| 4 | **Sign-up shows "1 of 6" up front and puts the account last; both cold-start personas quit or nearly quit in setup** — Profiling before value; "1 of 6" makes the length explicit; the discover picker repeats the goals screen; the tour opens on Classes even after "Meet new people" | 2 | no | `7cca98e6be77` `79be2378ff4a` `41e0f0d87a46` `b9f72b5ec8d6` |
| 3 | **Club pages are empty past the join button: no dated events, no members, organizers "not on Lumi yet"** — Clubs come from official lists without officers; the page shows empty tabs instead of the club's own links and meeting times. | 2 | no | `919841c6195c` `d417653a9f04` `6de492d10b73` |
| 3 | **A brand-new account finds nobody to meet: Meetups says "Make the first plan"** — No fallback for an empty campus except hosting. | 1 | no | `7d5aa37f0937` |
| 2 | **Club list "Recommended" is effectively alphabetical: sororities and consulting clubs first, no photos or what's on** — Recommended ignores the student's picks; list rows have no activity signal. | 2 | no | `3419c6f0e368` `fa9ec7d60ba3` |

4 run(s) · 11 finding(s) (3 seen by ≥ 2 personas, 8 single events) · max severity **4** · severity 1/2/3/4: 2 / 8 / 3 / 1 · 0 environment-limited event(s) kept out of findings.

_These clusters are mechanical (screen + type + element). The curated problem list is `analysis.json` next to this file, written by the orchestrating session — see docs/ux-sim/ORCHESTRATE.md._

## Runs

| persona | scenario | auth | outcome | goal check | actions | friction (max sev) | drop-off risk (hypothesis) | report |
|---|---|---|---|---|---|---|---|---|
| diego-transfer-commuter | cold-start-hangout | none | abandoned ⚠ overrode patience | not met | 19 | 3 (3) | high — Spent ~19 taps mostly on onboarding, and the one place to find people this week was empty; as a commuter with minutes between classes he has | [report](../../runs/sched-20261106-1915-diego-cold-start-hangout/report.md) |
| jordan-sophomore-impatient | cold-start-hangout | none | abandoned | not met | 9 | 3 (4) | high — Quit-trigger is >2 setup screens; the app showed 4 of 6 with no people or plans visible and no account yet, so Jordan never reached any valu | [report](../../runs/sched-20261106-1915-jordan-cold-start-hangout/report.md) |
| jordan-sophomore-impatient | find-a-club | fresh | success | met (3 actions) | 4 | 3 (3) | high — Getting to the club was fast, but the page is empty: no events, organizers not on the app. Nothing pulls me back. | [report](../../runs/sched-20261106-1915-jordan-find-a-club/report.md) |
| minji-freshman-17 | find-a-club | fresh | success | met (3 actions) | 6 | 5 (2) | medium — Found the club fast and the request felt safe, but members/events were empty and organizers aren't on Lumi, so she'd come back only if the N | [report](../../runs/sched-20261106-1915-minji-find-a-club/report.md) |

## Findings

_Clustered by screen + friction type + key element. Sorted by number of personas, then severity._

### 1. Onboarding friction on /start/goals

- **Type** Onboarding friction · **severity** max 3, median 2 · **2 persona(s)**: diego-transfer-commuter, jordan-sophomore-impatient · scenarios: cold-start-hangout · fingerprint `7cca98e6be77`
- diego-transfer-commuter (step 1, sev 1): “1 of 6? OK, six screens before I even make the account. Fine, quick taps, but don't drag it out.” — [screenshot](../../runs/sched-20261106-1915-diego-cold-start-hangout/shots/001-click.jpg) · [marked](../../runs/sched-20261106-1915-diego-cold-start-hangout/shots/001-click-som.jpg)
- jordan-sophomore-impatient (step 1, sev 3): “1 of 6?? six screens before I even see anything. ugh.” — [screenshot](../../runs/sched-20261106-1915-jordan-cold-start-hangout/shots/001-click.jpg) · [marked](../../runs/sched-20261106-1915-jordan-cold-start-hangout/shots/001-click-som.jpg)
- **Suggested improvement (hypothesis):** Shorten or explain this sign-up step (/start/goals); ask only what is needed now and let the rest wait until it is useful. Personas said they wanted: “let me make the account first, or keep it to 2-3 screens”; “let me sign up with my email and see people right away”.

### 2. Missing / empty content on /orgs/:id?tab=events — “Events”

- **Type** Missing / empty content · **severity** max 3, median 2.5 · **2 persona(s)**: jordan-sophomore-impatient, minji-freshman-17 · scenarios: find-a-club · fingerprint `919841c6195c`
- jordan-sophomore-impatient (step 7, sev 3): “no events. for the biggest hackathon club. so nothing happening. this is the bulletin board thing” — [screenshot](../../runs/sched-20261106-1915-jordan-find-a-club/shots/007-click.jpg) · [marked](../../runs/sched-20261106-1915-jordan-find-a-club/shots/007-click-som.jpg)
- minji-freshman-17 (step 10, sev 2): “3 tabs, 다 비었어. so the only real thing here is the Ask to join button” — [screenshot](../../runs/sched-20261106-1915-minji-find-a-club/shots/010-click.jpg) · [marked](../../runs/sched-20261106-1915-minji-find-a-club/shots/010-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /orgs/:id?tab=events is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “show the next build night or when the fall hackathon is”; “a next date, even 'every Thurs 7pm' or a link to their Instagram”.

### 3. Missing / empty content on /orgs/:id — “Ask to join”

- **Type** Missing / empty content · **severity** max 2, median 2 · **2 persona(s)**: jordan-sophomore-impatient, minji-freshman-17 · scenarios: find-a-club · fingerprint `d417653a9f04`
- jordan-sophomore-impatient (step 5, sev 2): “ok there's a join button. but organizers aren't even here? so I'm asking... nobody? 'saved and passed on' to who” — [screenshot](../../runs/sched-20261106-1915-jordan-find-a-club/shots/005-click.jpg) · [marked](../../runs/sched-20261106-1915-jordan-find-a-club/shots/005-click-som.jpg)
- minji-freshman-17 (step 6, sev 2): “Ask to join 있긴 한데... organizers aren't on Lumi? so who gets my request? and 'General meetings' — when? where?” — [screenshot](../../runs/sched-20261106-1915-minji-find-a-club/shots/006-click.jpg) · [marked](../../runs/sched-20261106-1915-minji-find-a-club/shots/006-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /orgs/:id is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “tell me where the request actually goes or link their real signup/Discord”; “when/where the next general meeting is, or their insta/link so I can just show up”.

### 4. Onboarding friction on /start/discover — “Continue”

- **Type** Onboarding friction · **severity** max 4, median 4 · **1 persona(s)**: jordan-sophomore-impatient · scenarios: cold-start-hangout · fingerprint `79be2378ff4a`
- jordan-sophomore-impatient (step 12, sev 4): “four screens in and I haven't seen a single human. this is the part where I delete it.” — [screenshot](../../runs/sched-20261106-1915-jordan-cold-start-hangout/shots/012-click.jpg) · [marked](../../runs/sched-20261106-1915-jordan-cold-start-hangout/shots/012-click-som.jpg)
- **Suggested improvement (hypothesis):** Shorten or explain this sign-up step (/start/discover); ask only what is needed now and let the rest wait until it is useful. Personas said they wanted: “show me who's around / what's happening this week before asking me to configure stuff”.

### 5. Missing / empty content on /social/meetups — “Create Meetup”

- **Type** Missing / empty content · **severity** max 3, median 3 · **1 persona(s)**: diego-transfer-commuter · scenarios: cold-start-hangout · fingerprint `7d5aa37f0937`
- diego-transfer-commuter (step 27, sev 3): “Nobody's made a plan. I'm new, I'm not gonna be the first to host. There's a 'This week on campus' thing below, let me see.” — [screenshot](../../runs/sched-20261106-1915-diego-cold-start-hangout/shots/027-click.jpg) · [marked](../../runs/sched-20261106-1915-diego-cold-start-hangout/shots/027-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /social/meetups is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “show me at least a couple of plans by real students this week I could just join”.

### 6. Onboarding friction on /start/discover — “Skip”

- **Type** Onboarding friction · **severity** max 2, median 2 · **1 persona(s)**: diego-transfer-commuter · scenarios: cold-start-hangout · fingerprint `41e0f0d87a46`
- diego-transfer-commuter (step 13, sev 2): “Still no account. I'm hitting Skip. Nine taps in and I haven't seen a single person.” — [screenshot](../../runs/sched-20261106-1915-diego-cold-start-hangout/shots/013-click.jpg) · [marked](../../runs/sched-20261106-1915-diego-cold-start-hangout/shots/013-click-som.jpg)
- **Suggested improvement (hypothesis):** Shorten or explain this sign-up step (/start/discover); ask only what is needed now and let the rest wait until it is useful. Personas said they wanted: “make the account and show me people first, ask interests later”.

### 7. No reason to stay on /start/what — “Classes & Schedule”

- **Type** No reason to stay · **severity** max 2, median 2 · **1 persona(s)**: jordan-sophomore-impatient · scenarios: cold-start-hangout · fingerprint `b9f72b5ec8d6`
- jordan-sophomore-impatient (step 4, sev 2): “I said meet people. why are you showing me calculus. skip.” — [screenshot](../../runs/sched-20261106-1915-jordan-cold-start-hangout/shots/004-click.jpg) · [marked](../../runs/sched-20261106-1915-jordan-cold-start-hangout/shots/004-click-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /start/what: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “open on the Social preview since that's what I picked, or let me skip the tour”.

### 8. No reason to stay on /explore/clubs — “Blueprint Builds software for nonprofits”

- **Type** No reason to stay · **severity** max 2, median 2 · **1 persona(s)**: jordan-sophomore-impatient · scenarios: find-a-club · fingerprint `fa9ec7d60ba3`
- jordan-sophomore-impatient (step 1, sev 2): “ok it's a list. 94 groups. no pics, no 'meeting tonight'. kinda bulletin board. resume-padding consulting clubs on top.” — [screenshot](../../runs/sched-20261106-1915-jordan-find-a-club/shots/001-click.jpg) · [marked](../../runs/sched-20261106-1915-jordan-find-a-club/shots/001-click-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /explore/clubs: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “show what's happening this week or a photo/vibe so I can tell which are fun”.

### 9. Confusing UI on /explore/clubs — “Sort: Recommended”

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: find-a-club · fingerprint `3419c6f0e368`
- minji-freshman-17 (step 2, sev 2): “ok it's a list... but 'Recommended' is just alphabet sororities? 뭐지. I'm not rushing a sorority at 17” — [screenshot](../../runs/sched-20261106-1915-minji-find-a-club/shots/002-click.jpg) · [marked](../../runs/sched-20261106-1915-minji-find-a-club/shots/002-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Sort: Recommended” on /explore/clubs does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “recommended should use something about me, or show friendly casual clubs first”.

### 10. Missing / empty content on /orgs/:id?tab=members — “Members”

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: find-a-club · fingerprint `6de492d10b73`
- minji-freshman-17 (step 8, sev 2): “아 아무도 없네. kinda expected. can't tell if anyone's my age” — [screenshot](../../runs/sched-20261106-1915-minji-find-a-club/shots/008-click.jpg) · [marked](../../runs/sched-20261106-1915-minji-find-a-club/shots/008-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /orgs/:id?tab=members is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “show at least how many people / that freshmen are welcome”.

### 11. Unclear wording on /explore/clubs

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: minji-freshman-17 · scenarios: find-a-club · fingerprint `92201442c279`
- minji-freshman-17 (step 4, sev 1): “KSA! socials + mentoring, 딱이다. 'Followed is different from verified membership' 이건 뭔 소리지 though” — [screenshot](../../runs/sched-20261106-1915-minji-find-a-club/shots/004-type.jpg) · [marked](../../runs/sched-20261106-1915-minji-find-a-club/shots/004-type-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite the wording on /explore/clubs in plain language (and check the Korean UI). Personas said they wanted: “plain words, or explain only when I follow”.

## Automatic checks (harness)

| screen | device | tap targets < 44px (max) | sideways overflow | broken images |
|---|---|---|---|---|
| `/start/communities` | phone | 12 — e.g. Back 40×40, Skip 54×40, Student Clubs 123×36 | — | — |
| `/social/meetups` | phone | 12 — e.g. Notifications 40×40, Messages 40×40, See all 55×20 | — | — |
| `/start/university` | phone | 9 — e.g. Back 40×40, Search universities 287×23, Undergraduate 130×36 | — | — |
| `/explore/clubs` | phone | 7 — e.g. Search 40×40, Notifications 40×40, Messages 40×40 | — | — |
| `/` | phone | 6 — e.g. Search 40×40, Notifications 40×40, Messages 40×40 | — | — |
| `/welcome` | phone | 5 — e.g. English 44×20, Sign In 80×40, Look around first 136×36 | — | — |
| `/start/about` | phone | 4 — e.g. Back 40×40, Use your student ID 121×18, Terms 33×15 | — | — |
| `/orgs/:id` | phone | 3 — e.g. Back 40×40, More 40×40, Are you an organizer? Manage this page 358×32 | — | — |
| `/orgs/:id?tab=events` | phone | 3 — e.g. Back 40×40, More 40×40 | — | — |
| `/start/discover` | phone | 2 — e.g. Back 40×40, Skip 54×40 | — | — |
| `/orgs/:id?tab=members` | phone | 2 — e.g. Back 40×40, More 40×40 | — | — |
| `/start/goals` | phone | 1 — e.g. Back 40×40 | — | — |
| `/start/what` | phone | 1 — e.g. Back 40×40 | — | — |
