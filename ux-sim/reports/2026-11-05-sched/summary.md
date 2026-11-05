# ux-sim summary — 2026-11-05

> **AI simulation — hypotheses, not measured user behaviour.** AI personas drove a real browser. Counts are simulated personas, never rates; every risk below is a hypothesis to check with real students.

## Curated problems (analysis.json)

_Written by Scheduled orchestrating Claude session (https://claude.ai/code/session_01VX4jQF3M6doYf7VDXmTdrm). Heuristic clusters are below._

| sev | problem | personas | env-limited | fingerprints |
|---|---|---|---|---|
| 2 | **On a plan, "Going" looks like a status, joins instantly, and the count disagrees ("1 going" vs "0 joined")** — Same label for state and action; the list counts the host, the detail page does not. | 1 | no | `afdbc3f2e8da` |
| 2 | **On a laptop the app is a phone-width column floating in black** — No desktop layout. | 1 | no | `ca00bd1ad3db` |
| 1 | **The floating Design pill covers real buttons and chat messages (4th day in a row)** — Fixed top-right pill over page content; owner already chose "New only". | 2 | no | `ed2dd86233eb` `44271af15761` |
| 1 | **The Schedule tab opens "My Plans"; the class timetable is behind a second button** — Tab name vs content. | 2 | no | `bacb0bd4468f` `902be6e4513e` |
| 1 | **Adding a class asks for a discussion section from a long list before saving** — Section choice is required before save. | 2 | no | `a104f66ab71e` `7959ca402a91` `f634db6cc171` |
| 1 | **Timetable header says "2 classes" for one course that meets twice a week** — Counts meetings, not courses. | 2 | no | `a0f2ea5c4667` |
| 1 | **Rides is not on Home or in onboarding; students find it only at the bottom of Social › Meetups** — Rides filed under social. | 1 | no | `7d8e0b863e51` |

4 run(s) · 13 finding(s) (1 seen by ≥ 2 personas, 12 single events) · max severity **2** · severity 1/2/3/4: 12 / 2 / 0 / 0 · 0 environment-limited event(s) kept out of findings.

_These clusters are mechanical (screen + type + element). The curated problem list is `analysis.json` next to this file, written by the orchestrating session — see docs/ux-sim/ORCHESTRATE.md._

## Runs

| persona | scenario | auth | outcome | goal check | actions | friction (max sev) | drop-off risk (hypothesis) | report |
|---|---|---|---|---|---|---|---|---|
| diego-transfer-commuter | timetable-add-classes | fresh | success | met (6 actions) | 6 | 3 (1) | medium — Adding the class was fast, but I still haven't seen any actual study partners or 'who's free' yet — if that's empty next time, I'm out. | [report](../../runs/sched-20261105-1915-diego-timetable-add-classes/report.md) |
| marcus-senior-lowtech | timetable-add-classes | fresh | success | met (6 actions) | 6 | 4 (1) | medium — Adding the class was smooth, but I came for internships and the 'Schedule' tab was about meeting friends; I'd only come back if the internsh | [report](../../runs/sched-20261105-1915-marcus-timetable-add-classes/report.md) |
| minji-freshman-17 | lunch-today | fresh | success | met (3 actions) | 5 | 3 (2) | low — Found a same-day lunch fast with no face photos or profile quiz; would come back if Hana actually shows up / replies | [report](../../runs/sched-20261105-1915-minji-lunch-today/report.md) |
| priya-phd-desktop | ride-sfo-thanksgiving | fresh | success | met (5 actions) | 7 | 4 (2) | medium — The rides flow was fast and to the point, but the whole app is a phone column on my laptop, and meetups were empty. I'd come back for rides, | [report](../../runs/sched-20261105-1915-priya-ride-sfo-thanksgiving/report.md) |

## Findings

_Clustered by screen + friction type + key element. Sorted by number of personas, then severity._

### 1. Unclear wording on /timetable

- **Type** Unclear wording · **severity** max 1, median 1 · **2 persona(s)**: diego-transfer-commuter, marcus-senior-lowtech · scenarios: timetable-add-classes · fingerprint `a0f2ea5c4667`
- diego-transfer-commuter (step 11, sev 1): “Done, under a minute. It's there Tue/Thu. Though the banner says '2 classes' — it's one class, twice a week.” — [screenshot](../../runs/sched-20261105-1915-diego-timetable-add-classes/shots/011-click.jpg) · [marked](../../runs/sched-20261105-1915-diego-timetable-add-classes/shots/011-click-som.jpg)
- marcus-senior-lowtech (step 12, sev 1): “It says '2 classes' up top but I only added one. I guess it means two meetings. Small thing.” — [screenshot](../../runs/sched-20261105-1915-marcus-timetable-add-classes/shots/012-click.jpg) · [marked](../../runs/sched-20261105-1915-marcus-timetable-add-classes/shots/012-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite the wording on /timetable in plain language (and check the Korean UI). Personas said they wanted: “count meetings vs. courses clearly, e.g. '1 class today' or '2 sessions'”; “say '1 class, 2 meetings' or just count the course once”.

### 2. Confusing UI on /activities/:id — “Going”

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: lunch-today · fingerprint `afdbc3f2e8da`
- minji-freshman-17 (step 3, sev 2): “뭐지, list said '1 going' but here it says '0 joined · cap 4'. is anyone actually coming? and the big lime 'Going' — did I already press it?” — [screenshot](../../runs/sched-20261105-1915-minji-lunch-today/shots/003-click.jpg) · [marked](../../runs/sched-20261105-1915-minji-lunch-today/shots/003-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Going” on /activities/:id does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “say 'Join lunch' and show the same count everywhere”.

### 3. Confusing UI on /

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: priya-phd-desktop · scenarios: ride-sfo-thanksgiving · fingerprint `ca00bd1ad3db`
- priya-phd-desktop (step 0, sev 2): “A 430px phone column in the middle of my 1440 screen, with black bars on both sides. This is a mobile app stretched onto my laptop. Not a great start.” — [screenshot](../../runs/sched-20261105-1915-priya-ride-sfo-thanksgiving/shots/000-start.jpg) · [marked](../../runs/sched-20261105-1915-priya-ride-sfo-thanksgiving/shots/000-start-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what the main control on / does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “a real desktop layout that uses the width”.

### 4. Confusing UI on /schedule — “My timetable”

- **Type** Confusing UI · **severity** max 1, median 1 · **1 persona(s)**: diego-transfer-commuter · scenarios: timetable-add-classes · fingerprint `bacb0bd4468f`
- diego-transfer-commuter (step 1, sev 1): “OK, it's plans, not my classes. There's a 'My timetable' button though, fine.” — [screenshot](../../runs/sched-20261105-1915-diego-timetable-add-classes/shots/001-click.jpg) · [marked](../../runs/sched-20261105-1915-diego-timetable-add-classes/shots/001-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “My timetable” on /schedule does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “Schedule tab should show my class timetable first”.

### 5. Confusing UI on /timetable — “Add lecture only”

- **Type** Confusing UI · **severity** max 1, median 1 · **1 persona(s)**: diego-transfer-commuter · scenarios: timetable-add-classes · fingerprint `a104f66ab71e`
- diego-transfer-commuter (step 9, sev 1): “Extra step, but it says I can leave it empty. I don't remember my DIS number off the top of my head — lecture only, done.” — [screenshot](../../runs/sched-20261105-1915-diego-timetable-add-classes/shots/009-click.jpg) · [marked](../../runs/sched-20261105-1915-diego-timetable-add-classes/shots/009-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Add lecture only” on /timetable does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “let me add the lecture in one tap and pick my section later”.

### 6. Unclear wording on /schedule — “Schedule”

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: marcus-senior-lowtech · scenarios: timetable-add-classes · fingerprint `902be6e4513e`
- marcus-senior-lowtech (step 1, sev 1): “Says Schedule but it's about plans with friends. There's a 'My timetable' button though, that's probably it.” — [screenshot](../../runs/sched-20261105-1915-marcus-timetable-add-classes/shots/001-click.jpg) · [marked](../../runs/sched-20261105-1915-marcus-timetable-add-classes/shots/001-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “Schedule” on /schedule in plain language (and check the Korean UI). Personas said they wanted: “Schedule tab should open my class timetable or say 'Plans'”.

### 7. Confusing UI on /timetable — “MATH 51 Calculus I (formerly MATH 1A) (L”

- **Type** Confusing UI · **severity** max 1, median 1 · **1 persona(s)**: marcus-senior-lowtech · scenarios: timetable-add-classes · fingerprint `f634db6cc171`
- marcus-senior-lowtech (step 7, sev 1): “Two of them, Lec 001 and Lec 002. Same professor. I guess the 9:30 one, I'm not getting up for 8 AM. Hope picking one doesn't sign me up for anything official.” — [screenshot](../../runs/sched-20261105-1915-marcus-timetable-add-classes/shots/007-type.jpg) · [marked](../../runs/sched-20261105-1915-marcus-timetable-add-classes/shots/007-type-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “MATH 51 Calculus I (formerly MATH 1A) (L” on /timetable does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “a plain hint like 'pick the section/time you're in'”.

### 8. Confusing UI on /timetable — “Your section number (e.g. 118)”

- **Type** Confusing UI · **severity** max 1, median 1 · **1 persona(s)**: marcus-senior-lowtech · scenarios: timetable-add-classes · fingerprint `7959ca402a91`
- marcus-senior-lowtech (step 10, sev 1): “A whole wall of DIS sections. I don't remember my section number offhand. Good that it says 'Not sure yet? Leave it empty' — I'll just add the lecture.” — [screenshot](../../runs/sched-20261105-1915-marcus-timetable-add-classes/shots/010-click.jpg) · [marked](../../runs/sched-20261105-1915-marcus-timetable-add-classes/shots/010-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Your section number (e.g. 118)” on /timetable does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “ask about the section after the class is saved, not before”.

### 9. Confusing UI on /chats/:id — “Switch to the classic design”

- **Type** Confusing UI · **severity** max 1, median 1 · **1 persona(s)**: minji-freshman-17 · scenarios: lunch-today · fingerprint `ed2dd86233eb`
- minji-freshman-17 (step 8, sev 1): “ok chat is here. kinda empty and dark, Hana didn't say anything yet. I'll just say hi” — [screenshot](../../runs/sched-20261105-1915-minji-lunch-today/shots/008-click.jpg) · [marked](../../runs/sched-20261105-1915-minji-lunch-today/shots/008-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Switch to the classic design” on /chats/:id does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “Design pill shouldn't sit on top of the event card”.

### 10. Bug on /chats/:id — “Type a message…”

- **Type** Bug · **severity** max 1, median 1 · **1 persona(s)**: minji-freshman-17 · scenarios: lunch-today · fingerprint `8d68fe5c0aae`
- minji-freshman-17 (step 10, sev 1): “sent! 근데 my smiley disappeared? weird but whatever. no read receipt so idk if Hana saw” — [screenshot](../../runs/sched-20261105-1915-minji-lunch-today/shots/010-type.jpg) · [marked](../../runs/sched-20261105-1915-minji-lunch-today/shots/010-type-som.jpg)
- **Suggested improvement (hypothesis):** Reproduce from the evidence steps on /chats/:id (around “Type a message…”) and fix it; add a regression check for that screen. Personas said they wanted: “keep emoji, show if host has seen it”.

### 11. Hard to find on /meet/meetups — “Rides”

- **Type** Hard to find · **severity** max 1, median 1 · **1 persona(s)**: priya-phd-desktop · scenarios: ride-sfo-thanksgiving · fingerprint `7d8e0b863e51`
- priya-phd-desktop (step 2, sev 1): “No meetups at all on campus. But there's a 'Rides' entry half hidden behind that floating Design toggle. That's what I want.” — [screenshot](../../runs/sched-20261105-1915-priya-ride-sfo-thanksgiving/shots/002-click.jpg) · [marked](../../runs/sched-20261105-1915-priya-ride-sfo-thanksgiving/shots/002-click-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“Rides”) where they looked (/meet/meetups); label icon-only controls. Personas said they wanted: “Rides not covered by the floating pill”.

### 12. Unclear wording on /rides/:id

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: priya-phd-desktop · scenarios: ride-sfo-thanksgiving · fingerprint `afdf99517f07`
- priya-phd-desktop (step 7, sev 1): “This is what I needed. Noon flight, 8:30 departure, matches my morning flight. 'Pickup (public spot): Unit 2' — Unit 2 is a dorm complex, which corner exactly? Minor, the chat can sort it.” — [screenshot](../../runs/sched-20261105-1915-priya-ride-sfo-thanksgiving/shots/007-click.jpg) · [marked](../../runs/sched-20261105-1915-priya-ride-sfo-thanksgiving/shots/007-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite the wording on /rides/:id in plain language (and check the Korean UI). Personas said they wanted: “an actual pickup point, e.g. 'Unit 2, Channing Way entrance'”.

### 13. Bug on /chats/:id — “Switch to the classic design”

- **Type** Bug · **severity** max 1, median 1 · **1 persona(s)**: priya-phd-desktop · scenarios: ride-sfo-thanksgiving · fingerprint `44271af15761`
- priya-phd-desktop (step 11, sev 1): “Works. The floating Design pill is now covering the first system message, third screen in a row it sits on top of content. Sloppy.” — [screenshot](../../runs/sched-20261105-1915-priya-ride-sfo-thanksgiving/shots/011-click.jpg) · [marked](../../runs/sched-20261105-1915-priya-ride-sfo-thanksgiving/shots/011-click-som.jpg)
- **Suggested improvement (hypothesis):** Reproduce from the evidence steps on /chats/:id (around “Switch to the classic design”) and fix it; add a regression check for that screen. Personas said they wanted: “the design toggle not overlapping page content”.

## Automatic checks (harness)

| screen | device | tap targets < 44px (max) | sideways overflow | broken images |
|---|---|---|---|---|
| `/meet/meetups` | phone | 10 — e.g. Create 36×36, Notifications 40×40, Messages 40×40 | — | — |
| `/timetable` | phone | 7 — e.g. Back 40×40, Friends 92×28, Class 88×36 | — | — |
| `/` | phone | 5 — e.g. See all 62×21, Save 36×36, Save 36×36 | — | — |
| `/schedule` | phone | 5 — e.g. Back 40×40, Messages 40×40, + Plan Together 92×18 | — | — |
| `/activities/:id` | phone | 3 — e.g. Back 40×40, More 40×40, Switch to the classic design 158×32 | — | — |
| `/chats/:id` | phone | 3 — e.g. Back 40×40, Menu 40×40, Switch to the classic design 158×32 | — | — |
