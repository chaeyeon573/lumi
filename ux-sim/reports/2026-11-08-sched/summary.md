# ux-sim summary — 2026-11-08

> **AI simulation — hypotheses, not measured user behaviour.** AI personas drove a real browser. Counts are simulated personas, never rates; every risk below is a hypothesis to check with real students.

## Curated problems (analysis.json)

_Written by Scheduled orchestrating Claude session (https://claude.ai/code/session_01VX4jQF3M6doYf7VDXmTdrm). Heuristic clusters are below._

| sev | problem | personas | env-limited | fingerprints |
|---|---|---|---|---|
| 3 | **Rides is gone from the app (removed 2026-11-06); a student looking for an SFO ride finds no trace of it** — Product decision in the Harness A redesign; the server API still exists but nothing in the UI reaches it. | 1 | no | `dc8ff16e3045` `35e0a7871c95` `9ddf54c59b26` `7d5aa37f0937` `8318302be3f9` |
| 3 | **A leftover search word silently empties the filter results ("No results" for Bay Area internships)** — Filter sheet counts results with the hidden search query; sheet state is not kept on close. | 1 | no | `b2a4b9339dd4` `bc3cb011854f` `6d9bc9a532c9` |
| 2 | **Internship pages for Bay Area listings never say if it is paid or when it closes** — Imported Bay Area listings lack pay/deadline fields; filters only cover type/location/deadline. | 2 | no | `6d922472ea26` `df7b2a2fea8f` `abddf69cb236` `aa40a423e598` |
| 1 | **Internship cards: "D-4" is not explained** — D-day shorthand. | 1 | no | `604f559f1bdb` |

4 run(s) · 15 finding(s) (2 seen by ≥ 2 personas, 13 single events) · max severity **3** · severity 1/2/3/4: 7 / 8 / 3 / 0 · 1 environment-limited event(s) kept out of findings.

_These clusters are mechanical (screen + type + element). The curated problem list is `analysis.json` next to this file, written by the orchestrating session — see docs/ux-sim/ORCHESTRATE.md._

## Runs

| persona | scenario | auth | outcome | goal check | actions | friction (max sev) | drop-off risk (hypothesis) | report |
|---|---|---|---|---|---|---|---|---|
| aisha-firstgen-anxious | lunch-today | fresh | success | met (4 actions) | 6 | 2 (1) | low — Every step told me what would happen before I tapped, nothing was posted publicly without warning, and 'Can't make it?' plus report/block ma | [report](../../runs/sched-20261108-1915-aisha-lunch-today/report.md) |
| diego-transfer-commuter | internship-near-berkeley | fresh | success | met (8 actions) | 9 | 2 (2) | medium — Filters were fast and the listing felt legit, but no civil roles and no pay/deadline info means I'd still have to go elsewhere; prep groups  | [report](../../runs/sched-20261108-1915-diego-internship-near-berkeley/report.md) |
| diego-transfer-commuter | ride-sfo-thanksgiving | fresh | abandoned ⚠ overrode patience | not met | 8 | 5 (3) | high — Came with one concrete need (SFO ride); nav, meetup form and search gave no sign rides exist, and Explore is grad seminars — nothing tells a | [report](../../runs/sched-20261108-1915-diego-ride-sfo-thanksgiving/report.md) |
| marcus-senior-lowtech | internship-near-berkeley | fresh | success | met (12 actions) | 19 | 9 (3) | medium — Filters with plain words worked once I figured them out, but the 'No results' scare from my search word and no pay info anywhere make me thi | [report](../../runs/sched-20261108-1915-marcus-internship-near-berkeley/report.md) |

## Findings

_Clustered by screen + friction type + key element. Sorted by number of personas, then severity._

### 1. Missing / empty content on /opportunities/:id — “Details”

- **Type** Missing / empty content · **severity** max 2, median 2 · **2 persona(s)**: diego-transfer-commuter, marcus-senior-lowtech · scenarios: internship-near-berkeley · fingerprint `6d922472ea26`
- diego-transfer-commuter (step 13, sev 2): “OK, it's real and checked today, and I know how to apply. But is it paid? When does it close? Nothing up top says.” — [screenshot](../../runs/sched-20261108-1915-diego-internship-near-berkeley/shots/013-click.jpg) · [marked](../../runs/sched-20261108-1915-diego-internship-near-berkeley/shots/013-click-som.jpg)
- marcus-senior-lowtech (step 21, sev 2): “'Source verified' and 'Last checked Sun, Nov 8' — OK, that makes it feel legit. Apply at Source is clear. But is it paid? It doesn't say.” — [screenshot](../../runs/sched-20261108-1915-marcus-internship-near-berkeley/shots/021-click.jpg) · [marked](../../runs/sched-20261108-1915-marcus-internship-near-berkeley/shots/021-click-som.jpg)
- marcus-senior-lowtech (step 32, sev 2): “Pinterest, San Francisco, not engineering, and it says verified and checked today. A company like that pays interns, I'd guess, but the app never actually told me. I'll hit Apply at Source on the real site. Good enough for today.” — [screenshot](../../runs/sched-20261108-1915-marcus-internship-near-berkeley/shots/032-click.jpg) · [marked](../../runs/sched-20261108-1915-marcus-internship-near-berkeley/shots/032-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /opportunities/:id is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “show pay (or 'paid') and the application deadline right in the details”; “Show pay (or 'pay not stated') and whether it's still open”; “Pay and deadline right on the details page”.

### 2. Hard to find on /explore/opportunities — “Internships”

- **Type** Hard to find · **severity** max 1, median 1 · **2 persona(s)**: diego-transfer-commuter, marcus-senior-lowtech · scenarios: internship-near-berkeley · fingerprint `df7b2a2fea8f`
- diego-transfer-commuter (step 3, sev 1): “Bay Area chip, nice. But no 'paid' option and nothing for civil engineering — I'll have to check each one.” — [screenshot](../../runs/sched-20261108-1915-diego-internship-near-berkeley/shots/003-click.jpg) · [marked](../../runs/sched-20261108-1915-diego-internship-near-berkeley/shots/003-click-som.jpg)
- marcus-senior-lowtech (step 6, sev 1): “Now we're talking. Internships, Bay Area — plain words. I wish there was a 'paid only' button but this is close.” — [screenshot](../../runs/sched-20261108-1915-marcus-internship-near-berkeley/shots/006-click.jpg) · [marked](../../runs/sched-20261108-1915-marcus-internship-near-berkeley/shots/006-click-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“Internships”) where they looked (/explore/opportunities); label icon-only controls. Personas said they wanted: “a Paid filter and a major/field filter”; “A 'Paid only' filter”.

### 3. Hard to find on /explore/events — “Explore”

- **Type** Hard to find · **severity** max 3, median 3 · **1 persona(s)**: diego-transfer-commuter · scenarios: ride-sfo-thanksgiving · fingerprint `dc8ff16e3045`
- diego-transfer-commuter (step 8, sev 3): “Seminars. Not what I need. I'm burning my break. Let me just search 'ride'.” — [screenshot](../../runs/sched-20261108-1915-diego-ride-sfo-thanksgiving/shots/008-click.jpg) · [marked](../../runs/sched-20261108-1915-diego-ride-sfo-thanksgiving/shots/008-click-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“Explore”) where they looked (/explore/events); label icon-only controls. Personas said they wanted: “rides should be findable from the main nav”.

### 4. Hard to find on /search — “Search events, people, clubs…”

- **Type** Hard to find · **severity** max 3, median 3 · **1 persona(s)**: diego-transfer-commuter · scenarios: ride-sfo-thanksgiving · fingerprint `35e0a7871c95`
- diego-transfer-commuter (step 14, sev 3): “Search doesn't know rides exist. Does this app even do rides? Last try — Social, For You.” — [screenshot](../../runs/sched-20261108-1915-diego-ride-sfo-thanksgiving/shots/014-type.jpg) · [marked](../../runs/sched-20261108-1915-diego-ride-sfo-thanksgiving/shots/014-type-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“Search events, people, clubs…”) where they looked (/search); label icon-only controls. Personas said they wanted: “search for 'ride' should point me to rides/carpools or at least suggest posting one”.

### 5. Confusing UI on /explore/opportunities — “No results”

- **Type** Confusing UI · **severity** max 3, median 3 · **1 persona(s)**: marcus-senior-lowtech · scenarios: internship-near-berkeley · fingerprint `b2a4b9339dd4`
- marcus-senior-lowtech (step 9, sev 3): “No internships in the Bay Area? At Berkeley? That can't be right. Maybe it's because I typed 'Berkeley' up top earlier... I don't know. It doesn't tell me why.” — [screenshot](../../runs/sched-20261108-1915-marcus-internship-near-berkeley/shots/009-click.jpg) · [marked](../../runs/sched-20261108-1915-marcus-internship-near-berkeley/shots/009-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “No results” on /explore/opportunities does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “Tell me my search word is also being used, or offer to clear it”.

### 6. Hard to find on /

- **Type** Hard to find · **severity** max 2, median 2 · **1 persona(s)**: diego-transfer-commuter · scenarios: ride-sfo-thanksgiving · fingerprint `9ddf54c59b26`
- diego-transfer-commuter (step 0, sev 2): “OK, where's rides? Nothing says ride or carpool. Internship card isn't what I need. Meetups maybe?” — [screenshot](../../runs/sched-20261108-1915-diego-ride-sfo-thanksgiving/shots/000-start.jpg) · [marked](../../runs/sched-20261108-1915-diego-ride-sfo-thanksgiving/shots/000-start-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for where they looked (/); label icon-only controls. Personas said they wanted: “a Rides / carpool entry on home”.

### 7. Missing / empty content on /social/meetups — “Create Meetup”

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: diego-transfer-commuter · scenarios: ride-sfo-thanksgiving · fingerprint `7d5aa37f0937`
- diego-transfer-commuter (step 2, sev 2): “Empty. Nobody's posted a ride. Fine, I'll post mine — maybe Create Meetup lets me pick a ride.” — [screenshot](../../runs/sched-20261108-1915-diego-ride-sfo-thanksgiving/shots/002-click.jpg) · [marked](../../runs/sched-20261108-1915-diego-ride-sfo-thanksgiving/shots/002-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /social/meetups is really missing (or only missing in the test environment); avoid showing empty sections.

### 8. Hard to find on /meetups/new — “Coffee”

- **Type** Hard to find · **severity** max 2, median 2 · **1 persona(s)**: diego-transfer-commuter · scenarios: ride-sfo-thanksgiving · fingerprint `8318302be3f9`
- diego-transfer-commuter (step 4, sev 2): “Coffee, study, workout... no 'ride'. Locations are Doe and Sproul, not SFO. This isn't for carpools. Let me check Explore before I hack this.” — [screenshot](../../runs/sched-20261108-1915-diego-ride-sfo-thanksgiving/shots/004-click.jpg) · [marked](../../runs/sched-20261108-1915-diego-ride-sfo-thanksgiving/shots/004-click-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“Coffee”) where they looked (/meetups/new); label icon-only controls. Personas said they wanted: “a Ride / carpool type, or a separate rides section”.

### 9. Confusing UI on /explore/opportunities — “Search opportunities”

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: marcus-senior-lowtech · scenarios: internship-near-berkeley · fingerprint `bc3cb011854f`
- marcus-senior-lowtech (step 4, sev 2): “Hm. It just found anything with 'Berkeley' in it. Tokyo isn't near Berkeley. The first one, city government internship, might be local but doesn't say paid.” — [screenshot](../../runs/sched-20261108-1915-marcus-internship-near-berkeley/shots/004-type.jpg) · [marked](../../runs/sched-20261108-1915-marcus-internship-near-berkeley/shots/004-type-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Search opportunities” on /explore/opportunities does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “A way to say 'near me' / Bay Area and only internships”.

### 10. No reason to stay on /explore/opportunities — “Filters, 2 applied”

- **Type** No reason to stay · **severity** max 2, median 2 · **1 persona(s)**: marcus-senior-lowtech · scenarios: internship-near-berkeley · fingerprint `abddf69cb236`
- marcus-senior-lowtech (step 28, sev 2): “Software engineer, software engineer, software engineer... I'm a History major. There's no way to say 'non-tech' and none of the cards say if they pay.” — [screenshot](../../runs/sched-20261108-1915-marcus-internship-near-berkeley/shots/028-scroll.jpg) · [marked](../../runs/sched-20261108-1915-marcus-internship-near-berkeley/shots/028-scroll-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /explore/opportunities: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “Filter by field (like Policy, Business, Humanities) and show pay on the card”.

### 11. Unclear wording on /activities/:id — “Details”

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: lunch-today · fingerprint `4807d3262467`
- aisha-firstgen-anxious (step 3, sev 1): “This is really clear — today 12:30, Crossroads, and 'happy to meet new people' makes me feel less weird about it. Wait, 'Full → Join Waitlist' — is it full? It says 4 spots, so I think that's just explaining what happens if it fills? The arrow is a bit cryptic.” — [screenshot](../../runs/sched-20261108-1915-aisha-lunch-today/shots/003-click.jpg) · [marked](../../runs/sched-20261108-1915-aisha-lunch-today/shots/003-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “Details” on /activities/:id in plain language (and check the Korean UI). Personas said they wanted: “say 'If it fills up, you can join a waitlist' in words”.

### 12. Confusing UI on /chats/:id — “Message”

- **Type** Confusing UI · **severity** max 1, median 1 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: lunch-today · fingerprint `80df1efc7c08`
- aisha-firstgen-anxious (step 10, sev 1): “It's there. I can't tell if Hana's seen it or when I sent it, which makes me a little nervous, but it's fine — the chat says I joined and the plan is on my schedule.” — [screenshot](../../runs/sched-20261108-1915-aisha-lunch-today/shots/010-type.jpg) · [marked](../../runs/sched-20261108-1915-aisha-lunch-today/shots/010-type-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Message” on /chats/:id does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “a small 'sent' / time under my message so I know it went through”.

### 13. Unclear wording on /explore/opportunities — “Internship D-4 GENERAL STUDENT TRAINEE (”

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: marcus-senior-lowtech · scenarios: internship-near-berkeley · fingerprint `604f559f1bdb`
- marcus-senior-lowtech (step 2, sev 1): “OK, these are internships. But Department of Defense, Air Force, Rangeland... none of it says Berkeley. And what's D-4, D-1?” — [screenshot](../../runs/sched-20261108-1915-marcus-internship-near-berkeley/shots/002-click.jpg) · [marked](../../runs/sched-20261108-1915-marcus-internship-near-berkeley/shots/002-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “Internship D-4 GENERAL STUDENT TRAINEE (” on /explore/opportunities in plain language (and check the Korean UI). Personas said they wanted: “Say what D-4 means, like 'closes in 4 days'”.

### 14. Confusing UI on /explore/opportunities — “Filters”

- **Type** Confusing UI · **severity** max 1, median 1 · **1 persona(s)**: marcus-senior-lowtech · scenarios: internship-near-berkeley · fingerprint `6d9bc9a532c9`
- marcus-senior-lowtech (step 11, sev 1): “OK, I'll erase 'Berkeley' and try the filters again.” — [screenshot](../../runs/sched-20261108-1915-marcus-internship-near-berkeley/shots/011-click.jpg) · [marked](../../runs/sched-20261108-1915-marcus-internship-near-berkeley/shots/011-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Filters” on /explore/opportunities does before people tap it — plain-word label, visible result, or a one-line hint.

### 15. Missing / empty content on /explore/opportunities — “Internship Legal Intern Oakland, CA / Wa”

- **Type** Missing / empty content · **severity** max 1, median 1 · **1 persona(s)**: marcus-senior-lowtech · scenarios: internship-near-berkeley · fingerprint `aa40a423e598`
- marcus-senior-lowtech (step 19, sev 1): “Sierra Club, Oakland. That's a real organization and it's right next door. Most of these are engineering, but that one could fit a History guy. Doesn't say if it's paid though.” — [screenshot](../../runs/sched-20261108-1915-marcus-internship-near-berkeley/shots/019-click.jpg) · [marked](../../runs/sched-20261108-1915-marcus-internship-near-berkeley/shots/019-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /explore/opportunities is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “Show 'Paid' on every card, like the government ones do”.

## Environment-limited (not UX findings)

| run | step | type | persona says | why |
|---|---|---|---|---|
| sched-20261108-1915-diego-internship-near-berkeley | 9 | content_gap | “Zero civil internships in the whole Bay Area? Come on. Fine, I'll take any engineering one that pays.” | local stack listings are a sample/deadline calendar, not a live feed |

## Automatic checks (harness)

| screen | device | tap targets < 44px (max) | sideways overflow | broken images |
|---|---|---|---|---|
| `/explore/opportunities` | phone | 22 — e.g. Search 40×40, Notifications 40×40, Messages 40×40 | — | — |
| `/meetups/new` | phone | 13 — e.g. Back 40×40, Coffee 99×36, Study 92×36 | — | — |
| `/explore/events` | phone | 12 — e.g. Search 40×40, Notifications 40×40, Messages 40×40 | — | — |
| `/social/meetups` | phone | 7 — e.g. Notifications 40×40, Messages 40×40, Create 100×36 | — | — |
| `/` | phone | 6 — e.g. Search 40×40, Notifications 40×40, Messages 40×40 | — | — |
| `/activities/:id` | phone | 6 — e.g. Back 40×40, More 40×40, Hosted by Hana · Lunch 160×22 | — | — |
| `/opportunities/:id` | phone | 3 — e.g. Back 40×40, More 40×40, View source 77×20 | — | — |
| `/chats/:id` | phone | 2 — e.g. Back 40×40, More 40×40 | — | — |
| `/search` | phone | 2 — e.g. Back 40×40, Search events, people, clubs… 295×23 | — | — |
