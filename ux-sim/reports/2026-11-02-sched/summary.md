# ux-sim summary — 2026-11-02

> **AI simulation — hypotheses, not measured user behaviour.** AI personas drove a real browser. Counts are simulated personas, never rates; every risk below is a hypothesis to check with real students.

## Curated problems (analysis.json)

_Written by Scheduled orchestrating Claude session (https://claude.ai/code/session_01VX4jQF3M6doYf7VDXmTdrm). Heuristic clusters are below._

| sev | problem | personas | env-limited | fingerprints |
|---|---|---|---|---|
| 4 | **Sign-up asks 5+ question screens (birth year, tour, two interest pickers) before an account or a person** — /start front-loads profiling (two overlapping interest pickers plus a tour with nothing to do) and puts the school e-mail — the one step that creates the accoun | 2 | no | `4b8a0b8abefa` `e2f05b7465c0` |
| 3 | **A brand-new account finds nobody to meet: Meetups and "Who's free right now" are empty** — Same as the pilot: no fallback for an empty campus besides "host it yourself". The welcome promise ("Who's free on campus right now?") sets an expectation of pe | 1 | no | `9c8f7a48cd72` `779192749ab1` `e8a18a957944` |
| 3 | **"Go together" marks you as going in one tap and says "together" when you are the only one** — "Go together" is both the preview and the commit action: there is no step between "show me who's going" and "I'm in", and the copy says "together" even when the | 1 | no | `d5bb5e7aa5b0` |
| 2 | **Club says "Not recruiting right now" under a big "Ask to join"; after tapping, nothing says what happens next** — The primary CTA is always "Ask to join" regardless of the club's recruiting state, and the success state has no next-step copy. | 2 | no | `b671f45c6bb2` `5b407b25b343` `128764b1d764` |
| 2 | **Club pages look empty and unofficial: an "Unverified" badge, a two-line About, no events, 0 followers** — Clubs imported from official lists have little content until officers claim them; the page shows the gaps (and admin-facing copy) to visitors instead of a visit | 2 | no | `68c8e67b425d` `919841c6195c` `6de492d10b73` `66b726f72e19` |
| 2 | **The club list opens with a long run of sororities; friendly social clubs only appear after scrolling** — Default ordering looks alphabetical/by source list rather than by the user's interests or by "welcoming / social" category. | 1 | no | `637f00dc9f90` |

4 run(s) · 14 finding(s) (2 seen by ≥ 2 personas, 12 single events) · max severity **4** · severity 1/2/3/4: 4 / 10 / 4 / 1 · 0 environment-limited event(s) kept out of findings.

_These clusters are mechanical (screen + type + element). The curated problem list is `analysis.json` next to this file, written by the orchestrating session — see docs/ux-sim/ORCHESTRATE.md._

## Runs

| persona | scenario | auth | outcome | goal check | actions | friction (max sev) | drop-off risk (hypothesis) | report |
|---|---|---|---|---|---|---|---|---|
| diego-transfer-commuter | cold-start-hangout | none | abandoned | met (21 actions) | 21 | 6 (3) | high — Promised 'who's free now' but showed no people; meetups and hangouts were empty and the only joinable things were faculty seminars with nobo | [report](../../runs/sched-20261102-1925-diego-cold-start-hangout/report.md) |
| jordan-sophomore-impatient | cold-start-hangout | none | abandoned | not met | 10 | 4 (4) | high — Promised 'who's free right now' on the welcome screen but buried it behind a long onboarding; Jordan quits on >2 setup screens | [report](../../runs/sched-20261102-1925-jordan-cold-start-hangout/report.md) |
| jordan-sophomore-impatient | find-a-club | fresh | success | met (2 actions) | 5 | 4 (2) | medium — Getting to a club was fast and the 'fits your major' tags were nice, but the club page was empty (no events, not recruiting, unverified) so  | [report](../../runs/sched-20261102-1925-jordan-find-a-club/report.md) |
| minji-freshman-17 | find-a-club | fresh | success | met (4 actions) | 7 | 5 (2) | medium — Finding a club was fast and didn't ask for personal info, but the club looks empty (0 followers) and there's no sign of people my age or wha | [report](../../runs/sched-20261102-1925-minji-find-a-club/report.md) |

## Findings

_Clustered by screen + friction type + key element. Sorted by number of personas, then severity._

### 1. Onboarding friction on /start — “Continue”

- **Type** Onboarding friction · **severity** max 4, median 3 · **2 persona(s)**: diego-transfer-commuter, jordan-sophomore-impatient · scenarios: cold-start-hangout · fingerprint `4b8a0b8abefa`
- diego-transfer-commuter (step 8, sev 2): “A feature tour screen, and that progress bar says I'm only like 3 of 8 steps in. I haven't even given my email yet. Hurry up.” — [screenshot](../../runs/sched-20261102-1925-diego-cold-start-hangout/shots/008-click.jpg) · [marked](../../runs/sched-20261102-1925-diego-cold-start-hangout/shots/008-click-som.jpg)
- diego-transfer-commuter (step 15, sev 3): “Seriously, another one? I'm 11 taps in and still no email, no people. I'm a transfer, I'm not part of any of these yet. This is eating my break.” — [screenshot](../../runs/sched-20261102-1925-diego-cold-start-hangout/shots/015-click.jpg) · [marked](../../runs/sched-20261102-1925-diego-cold-start-hangout/shots/015-click-som.jpg)
- jordan-sophomore-impatient (step 5, sev 2): “second setup screen. clock's ticking.” — [screenshot](../../runs/sched-20261102-1925-jordan-cold-start-hangout/shots/005-click.jpg) · [marked](../../runs/sched-20261102-1925-jordan-cold-start-hangout/shots/005-click-som.jpg)
- jordan-sophomore-impatient (step 8, sev 3): “a feature list? I don't care. third screen and I still don't have an account.” — [screenshot](../../runs/sched-20261102-1925-jordan-cold-start-hangout/shots/008-click.jpg) · [marked](../../runs/sched-20261102-1925-jordan-cold-start-hangout/shots/008-click-som.jpg)
- … 1 more
- **Suggested improvement (hypothesis):** Shorten or explain this sign-up step (/start); ask only what is needed now and let the rest wait until it is useful. Personas said they wanted: “let me sign up first, skip the tour”; “ask the school email up front, and let me see who's free before all these questionnaires”; “let me in first, ask later”; “skip the tour”; “one interests screen max, then show me who's free”.

### 2. Confusing UI on /orgs/:id?tab=recruit — “Applied”

- **Type** Confusing UI · **severity** max 1, median 1 · **2 persona(s)**: jordan-sophomore-impatient, minji-freshman-17 · scenarios: find-a-club · fingerprint `128764b1d764`
- jordan-sophomore-impatient (step 10, sev 1): “ok, fast, I like that. but applied to who? will anyone answer? they're 'not recruiting'.” — [screenshot](../../runs/sched-20261102-1925-jordan-find-a-club/shots/010-click.jpg) · [marked](../../runs/sched-20261102-1925-jordan-find-a-club/shots/010-click-som.jpg)
- minji-freshman-17 (step 16, sev 1): “오 바로 됐네, 개인정보 안 물어봐서 좋아. 근데 언제 연락 와? 누가 봐?” — [screenshot](../../runs/sched-20261102-1925-minji-find-a-club/shots/016-click.jpg) · [marked](../../runs/sched-20261102-1925-minji-find-a-club/shots/016-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Applied” on /orgs/:id?tab=recruit does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “say who gets it and when I'd hear back”; “say what happens next, e.g. 'KSA officers will message you'”.

### 3. Missing / empty content on /meet/meetups

- **Type** Missing / empty content · **severity** max 3, median 3 · **1 persona(s)**: diego-transfer-commuter · scenarios: cold-start-hangout · fingerprint `9c8f7a48cd72`
- diego-transfer-commuter (step 24, sev 3): “No meetups yet. Great, nobody's here. I don't want to host, I want to join something. 'Who's free right now' is down there, last shot.” — [screenshot](../../runs/sched-20261102-1925-diego-cold-start-hangout/shots/024-click.jpg) · [marked](../../runs/sched-20261102-1925-diego-cold-start-hangout/shots/024-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /meet/meetups is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “at least one plan this week I could just join”.

### 4. Confusing UI on /meet/more?tab=activities — “🙂 You going”

- **Type** Confusing UI · **severity** max 3, median 3 · **1 persona(s)**: diego-transfer-commuter · scenarios: cold-start-hangout · fingerprint `d5bb5e7aa5b0`
- diego-transfer-commuter (step 29, sev 3): “Together with who? It's just me. And it already put me as going without asking — I only wanted to look. A study abroad week isn't hanging out, and nobody else is here. I'm out.” — [screenshot](../../runs/sched-20261102-1925-diego-cold-start-hangout/shots/029-click.jpg) · [marked](../../runs/sched-20261102-1925-diego-cold-start-hangout/shots/029-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “🙂 You going” on /meet/more?tab=activities does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “show who else is going before signing me up; don't say 'together' when it's only me”.

### 5. Confusing UI on / — “Meetups”

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: diego-transfer-commuter · scenarios: cold-start-hangout · fingerprint `779192749ab1`
- diego-transfer-commuter (step 22, sev 2): “The welcome page promised who's free right now, this is an events directory. Meetups sounds closest to hanging out, I'll try that.” — [screenshot](../../runs/sched-20261102-1925-diego-cold-start-hangout/shots/022-click.jpg) · [marked](../../runs/sched-20261102-1925-diego-cold-start-hangout/shots/022-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Meetups” on / does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “show the 'who's free now' thing the welcome screen sold me”.

### 6. No reason to stay on /meet/more?tab=activities — “Go together”

- **Type** No reason to stay · **severity** max 2, median 2 · **1 persona(s)**: diego-transfer-commuter · scenarios: cold-start-hangout · fingerprint `e8a18a957944`
- diego-transfer-commuter (step 27, sev 2): “These are faculty seminars, not hangouts. 'Go together' with who? Nobody's attached to them. I'd be starting a plan alone again.” — [screenshot](../../runs/sched-20261102-1925-diego-cold-start-hangout/shots/027-click.jpg) · [marked](../../runs/sched-20261102-1925-diego-cold-start-hangout/shots/027-click-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /meet/more?tab=activities: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “show me which students are going, so I can say I'm in”.

### 7. Missing / empty content on /orgs/:id — “About”

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: jordan-sophomore-impatient · scenarios: find-a-club · fingerprint `68c8e67b425d`
- jordan-sophomore-impatient (step 4, sev 2): “ok and? when are community nights? 'unverified' — is this even real?” — [screenshot](../../runs/sched-20261102-1925-jordan-find-a-club/shots/004-click.jpg) · [marked](../../runs/sched-20261102-1925-jordan-find-a-club/shots/004-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /orgs/:id is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “show when they meet next and how many people are in it”.

### 8. Missing / empty content on /orgs/:id?tab=events — “Events”

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: jordan-sophomore-impatient · scenarios: find-a-club · fingerprint `919841c6195c`
- jordan-sophomore-impatient (step 6, sev 2): “nothing. and why is it telling me about events I post? I'm not running this club.” — [screenshot](../../runs/sched-20261102-1925-jordan-find-a-club/shots/006-click.jpg) · [marked](../../runs/sched-20261102-1925-jordan-find-a-club/shots/006-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /orgs/:id?tab=events is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “show past/recurring meetups so it doesn't look dead”.

### 9. Confusing UI on /orgs/:id?tab=recruit — “Recruiting”

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: jordan-sophomore-impatient · scenarios: find-a-club · fingerprint `b671f45c6bb2`
- jordan-sophomore-impatient (step 8, sev 2): “wait. not recruiting but ask to join? which is it.” — [screenshot](../../runs/sched-20261102-1925-jordan-find-a-club/shots/008-click.jpg) · [marked](../../runs/sched-20261102-1925-jordan-find-a-club/shots/008-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Recruiting” on /orgs/:id?tab=recruit does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “tell me if Ask to join still works when they're not recruiting”.

### 10. No reason to stay on /explore/clubs — “All”

- **Type** No reason to stay · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: find-a-club · fingerprint `637f00dc9f90`
- minji-freshman-17 (step 4, sev 2): “All 눌렀는데 sorority만 계속 나와. 그리스 문자 너무 많아... I'm 17, I don't want rush stuff” — [screenshot](../../runs/sched-20261102-1925-minji-find-a-club/shots/004-observe.jpg) · [marked](../../runs/sched-20261102-1925-minji-find-a-club/shots/004-observe-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /explore/clubs: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “show regular clubs / interests first, not a wall of Greek life”.

### 11. Missing / empty content on /orgs/:id?tab=members — “Members”

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: find-a-club · fingerprint `6de492d10b73`
- minji-freshman-17 (step 12, sev 2): “헐 0명... 아무도 없어? 이거 진짜 활동하는 거 맞나” — [screenshot](../../runs/sched-20261102-1925-minji-find-a-club/shots/012-click.jpg) · [marked](../../runs/sched-20261102-1925-minji-find-a-club/shots/012-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /orgs/:id?tab=members is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “see roughly how many people / some freshmen are in it”.

### 12. Confusing UI on /orgs/:id?tab=recruit — “Ask to join”

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: find-a-club · fingerprint `5b407b25b343`
- minji-freshman-17 (step 14, sev 2): “뭐지? recruiting 안 한다면서 Ask to join은 왜 있어? 눌러도 되는 거야?” — [screenshot](../../runs/sched-20261102-1925-minji-find-a-club/shots/014-click.jpg) · [marked](../../runs/sched-20261102-1925-minji-find-a-club/shots/014-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Ask to join” on /orgs/:id?tab=recruit does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “tell me if I can still join now, or when the next intake is”.

### 13. Trust / privacy worry on /start — “2005”

- **Type** Trust / privacy worry · **severity** max 1, median 1 · **1 persona(s)**: jordan-sophomore-impatient · scenarios: cold-start-hangout · fingerprint `e2f05b7465c0`
- jordan-sophomore-impatient (step 1, sev 1): “birth year? why. whatever, fast enough.” — [screenshot](../../runs/sched-20261102-1925-jordan-cold-start-hangout/shots/001-click.jpg) · [marked](../../runs/sched-20261102-1925-jordan-cold-start-hangout/shots/001-click-som.jpg)
- **Suggested improvement (hypothesis):** Explain who will see what when tapping “2005” on /start before asking for it. Personas said they wanted: “say why you need my birth year”.

### 14. Trust / privacy worry on /orgs/:id

- **Type** Trust / privacy worry · **severity** max 1, median 1 · **1 persona(s)**: minji-freshman-17 · scenarios: find-a-club · fingerprint `66b726f72e19`
- minji-freshman-17 (step 10, sev 1): “깔끔하다, 글 짧아서 좋아. 근데 'Unverified'... 뭐지? 진짜 KSA 맞아?” — [screenshot](../../runs/sched-20261102-1925-minji-find-a-club/shots/010-click.jpg) · [marked](../../runs/sched-20261102-1925-minji-find-a-club/shots/010-click-som.jpg)
- **Suggested improvement (hypothesis):** Explain who will see what on /orgs/:id before asking for it. Personas said they wanted: “explain what Unverified means or show it's the real club”.

## Automatic checks (harness)

| screen | device | tap targets < 44px (max) | sideways overflow | broken images |
|---|---|---|---|---|
| `/meet/more?tab=activities` | phone | 18 — e.g. Create 40×40, Notifications 40×40, Messages 40×40 | — | — |
| `/meet/more` | phone | 13 — e.g. Create 40×40, Notifications 40×40, Messages 40×40 | — | — |
| `/meet/meetups` | phone | 10 — e.g. Create 36×36, Notifications 40×40, Messages 40×40 | — | — |
| `/explore/clubs` | phone | 9 — e.g. See all 62×21, Feedback 93×32, Switch to the classic design 158×32 | — | — |
| `/start` | phone | 8 — e.g. Back 40×40, Switch to the classic design 158×32 | — | — |
| `/orgs/:id` | phone | 8 — e.g. Back 40×40, Messages 40×40, About 56×28 | — | — |
| `/orgs/:id?tab=events` | phone | 8 — e.g. Back 40×40, Messages 40×40, About 56×28 | — | — |
| `/orgs/:id?tab=recruit` | phone | 8 — e.g. Back 40×40, Messages 40×40, About 56×28 | — | — |
| `/orgs/:id?tab=members` | phone | 8 — e.g. Back 40×40, Messages 40×40, About 56×28 | — | — |
| `/welcome` | phone | 4 — e.g. Sign in 46×21, Terms of Use 76×15, Privacy Policy 180×33 | — | — |
| `/` | phone | 3 — e.g. See all 62×21, Feedback 93×32, Switch to the classic design 158×32 | — | — |
