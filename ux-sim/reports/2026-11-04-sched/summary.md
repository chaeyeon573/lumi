# ux-sim summary — 2026-11-04

> **AI simulation — hypotheses, not measured user behaviour.** AI personas drove a real browser. Counts are simulated personas, never rates; every risk below is a hypothesis to check with real students.

## Curated problems (analysis.json)

_Written by Scheduled orchestrating Claude session (https://claude.ai/code/session_01VX4jQF3M6doYf7VDXmTdrm). Heuristic clusters are below._

| sev | problem | personas | env-limited | fingerprints |
|---|---|---|---|---|
| 2 | **Internship pages never say if it is paid, what the job is or who can apply; prep-crew features sit above the job facts** — Imported listings carry only title, place, field and a link; the page leads with social features instead of the facts students check first. | 2 | no | `6d922472ea26` `98145c4f47a4` `03b9cc604cb5` |
| 2 | **Rides is not on Home or in onboarding; students find it only at the bottom of Social › Meetups** — Rides is filed as a social feature; Home tiles and onboarding goals never mention it. | 1 | no | `cc0f68d6c010` `7d8e0b863e51` |
| 2 | **On a plan, "Going" looks like a status, joins instantly and does not say others will see you** — Same button label for state and action; list counts the host, detail does not. | 1 | no | `afdbc3f2e8da` `7e9ffeaa7d87` `e2bf4efd0409` |
| 2 | **"Fits your major" appears on unrelated internships (Civil Engineering → robotics; History → oil and gas)** — Major matching is too broad (engineering ↔ any engineering; humanities ↔ anything). | 1 | no | `e767a4c35cfe` |
| 2 | **Internship list: red "D-1 / D-82" tags are not explained and ~20 filter chips crowd the top** — D-day shorthand is a Korean convention; filters are all shown at once. | 1 | no | `8b9f87525e26` `257f14871bc1` |
| 2 | **Bay Area internships are almost all software/hardware/research; nothing for civil or public works** — Sources are tech-heavy job boards. | 1 | no | `268a55d5e687` |
| 1 | **The floating Design pill covers real buttons ("My rides", chat header)** — Fixed top-right pill over page controls. | 2 | no | `39327c8d79c3` `44271af15761` |

4 run(s) · 15 finding(s) (0 seen by ≥ 2 personas, 15 single events) · max severity **2** · severity 1/2/3/4: 6 / 9 / 0 / 0 · 0 environment-limited event(s) kept out of findings.

_These clusters are mechanical (screen + type + element). The curated problem list is `analysis.json` next to this file, written by the orchestrating session — see docs/ux-sim/ORCHESTRATE.md._

## Runs

| persona | scenario | auth | outcome | goal check | actions | friction (max sev) | drop-off risk (hypothesis) | report |
|---|---|---|---|---|---|---|---|---|
| aisha-firstgen-anxious | lunch-today | fresh | success | met (4 actions) | 6 | 4 (2) | low — It took me straight to a real lunch today with no application, and the chat made it feel safe; I'd come back if Hana actually shows up and r | [report](../../runs/sched-20261104-1915-aisha-lunch-today/report.md) |
| diego-transfer-commuter | internship-near-berkeley | fresh | success | met (8 actions) | 10 | 3 (2) | medium — The Bay Area filter and the Apply button saved me time, but nothing was civil engineering, pay was never shown and 'fits your major' was wro | [report](../../runs/sched-20261104-1915-diego-internship-near-berkeley/report.md) |
| diego-transfer-commuter | ride-sfo-thanksgiving | fresh | success | met (5 actions) | 6 | 4 (2) | low — It actually solved a real commuter problem fast; the Thanksgiving banner shows it gets my situation. Only the buried Rides entry would slow  | [report](../../runs/sched-20261104-1915-diego-ride-sfo-thanksgiving/report.md) |
| marcus-senior-lowtech | internship-near-berkeley | fresh | success | met (5 actions) | 8 | 4 (2) | medium — Location filter and 'Official / Apply on X' made it feel legit and fast, but no pay or job description on any listing means I'd still go to  | [report](../../runs/sched-20261104-1915-marcus-internship-near-berkeley/report.md) |

## Findings

_Clustered by screen + friction type + key element. Sorted by number of personas, then severity._

### 1. Confusing UI on /activities/:id — “Going”

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: lunch-today · fingerprint `afdbc3f2e8da`
- aisha-firstgen-anxious (step 3, sev 2): “Wait, does 'Going' mean I'm already marked as going, or is it the button to say I'm going? And what's the difference with 'Interested'? I don't want to accidentally tell Hana I'm coming and then flake... but that IS what I want, I think. Does it message her?” — [screenshot](../../runs/sched-20261104-1915-aisha-lunch-today/shots/003-click.jpg) · [marked](../../runs/sched-20261104-1915-aisha-lunch-today/shots/003-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Going” on /activities/:id does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “a button that says 'Join lunch' and a line telling me what happens (Hana is notified / group chat opens)”.

### 2. Confusing UI on /explore/opportunities — “💼 2027 Electrical Engineer Intern Andur”

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: diego-transfer-commuter · scenarios: internship-near-berkeley · fingerprint `e767a4c35cfe`
- diego-transfer-commuter (step 2, sev 2): “Says 'Fits your major (Civil Engineering)' on Electrical Engineer and Robotics interns. That's not civil. Makes me trust the 'For you' less.” — [screenshot](../../runs/sched-20261104-1915-diego-internship-near-berkeley/shots/002-observe.jpg) · [marked](../../runs/sched-20261104-1915-diego-internship-near-berkeley/shots/002-observe-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “💼 2027 Electrical Engineer Intern Andur” on /explore/opportunities does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “Only say it fits my major when it actually matches civil engineering”.

### 3. Missing / empty content on /explore/opportunities

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: diego-transfer-commuter · scenarios: internship-near-berkeley · fingerprint `268a55d5e687`
- diego-transfer-commuter (step 13, sev 2): “It's all software, hardware, research. Nothing civil — no construction, no transportation, no city/public works. There isn't even a civil or engineering field chip. Emeryville is right by me though.” — [screenshot](../../runs/sched-20261104-1915-diego-internship-near-berkeley/shots/013-scroll.jpg) · [marked](../../runs/sched-20261104-1915-diego-internship-near-berkeley/shots/013-scroll-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /explore/opportunities is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “A civil/structural/transportation category, or local firms and public agencies”.

### 4. Missing / empty content on /opportunities/:id — “Details”

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: diego-transfer-commuter · scenarios: internship-near-berkeley · fingerprint `6d922472ea26`
- diego-transfer-commuter (step 17, sev 2): “Wait, 'Software Graduate Intern' — that's probably for grad students, I'm an undergrad. And still no pay anywhere. There was a plain 'Software Intern' from the same lab right below it, I'll check that one.” — [screenshot](../../runs/sched-20261104-1915-diego-internship-near-berkeley/shots/017-scroll.jpg) · [marked](../../runs/sched-20261104-1915-diego-internship-near-berkeley/shots/017-scroll-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /opportunities/:id is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “Show pay/paid vs unpaid and who's eligible (undergrad/grad) on the card”.

### 5. Hard to find on / — “Meetups”

- **Type** Hard to find · **severity** max 2, median 2 · **1 persona(s)**: diego-transfer-commuter · scenarios: ride-sfo-thanksgiving · fingerprint `cc0f68d6c010`
- diego-transfer-commuter (step 0, sev 2): “OK, where's rides? Events, opportunities, clubs, meetups... nothing says ride or carpool. Meetups maybe?” — [screenshot](../../runs/sched-20261104-1915-diego-ride-sfo-thanksgiving/shots/000-start.jpg) · [marked](../../runs/sched-20261104-1915-diego-ride-sfo-thanksgiving/shots/000-start-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“Meetups”) where they looked (/); label icon-only controls. Personas said they wanted: “a Rides / carpool entry on home”.

### 6. Hard to find on /meet/meetups — “Rides”

- **Type** Hard to find · **severity** max 2, median 2 · **1 persona(s)**: diego-transfer-commuter · scenarios: ride-sfo-thanksgiving · fingerprint `7d8e0b863e51`
- diego-transfer-commuter (step 4, sev 2): “There it is — Rides. Buried at the bottom of Social > Meetups though.” — [screenshot](../../runs/sched-20261104-1915-diego-ride-sfo-thanksgiving/shots/004-scroll.jpg) · [marked](../../runs/sched-20261104-1915-diego-ride-sfo-thanksgiving/shots/004-scroll-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“Rides”) where they looked (/meet/meetups); label icon-only controls. Personas said they wanted: “Rides should be on home, not the last row of Social”.

### 7. Unclear wording on /explore/opportunities — “💼 Oil and Gas Bond Reviews and Maintena”

- **Type** Unclear wording · **severity** max 2, median 2 · **1 persona(s)**: marcus-senior-lowtech · scenarios: internship-near-berkeley · fingerprint `8b9f87525e26`
- marcus-senior-lowtech (step 2, sev 2): “Red 'D-1', 'D-8', 'D-82' tags on every job. Is that a deadline? A grade level? Doesn't say.” — [screenshot](../../runs/sched-20261104-1915-marcus-internship-near-berkeley/shots/002-observe.jpg) · [marked](../../runs/sched-20261104-1915-marcus-internship-near-berkeley/shots/002-observe-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “💼 Oil and Gas Bond Reviews and Maintena” on /explore/opportunities in plain language (and check the Korean UI). Personas said they wanted: “Write 'Due in 1 day' instead of D-1”.

### 8. Confusing UI on /opportunities/:id — “Start a prep crew e.g. Interview prep · ”

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: marcus-senior-lowtech · scenarios: internship-near-berkeley · fingerprint `03b9cc604cb5`
- marcus-senior-lowtech (step 10, sev 2): “'Official' and 'Apply on Sierra Club' — OK, that looks legit. But I don't need a 'prep crew', I need to know if it pays. Why is that stuff above the actual job info?” — [screenshot](../../runs/sched-20261104-1915-marcus-internship-near-berkeley/shots/010-click.jpg) · [marked](../../runs/sched-20261104-1915-marcus-internship-near-berkeley/shots/010-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Start a prep crew e.g. Interview prep · ” on /opportunities/:id does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “Put pay, dates and job description at the top; social extras lower”.

### 9. Missing / empty content on /opportunities/:id — “Official source Sierra Club careers Last”

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: marcus-senior-lowtech · scenarios: internship-near-berkeley · fingerprint `98145c4f47a4`
- marcus-senior-lowtech (step 12, sev 2): “'Last verified Nov 4' and a link to Sierra Club careers — fine, I believe it's real. But nothing says if it's paid or what I'd actually do. I'd have to leave the app to find out. Kind of the whole point.” — [screenshot](../../runs/sched-20261104-1915-marcus-internship-near-berkeley/shots/012-scroll.jpg) · [marked](../../runs/sched-20261104-1915-marcus-internship-near-berkeley/shots/012-scroll-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /opportunities/:id is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “Show pay (paid/unpaid, hourly rate) and a short description of the job”.

### 10. Confusing UI on /activities/:id

- **Type** Confusing UI · **severity** max 1, median 1 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: lunch-today · fingerprint `e2bf4efd0409`
- aisha-firstgen-anxious (step 3, sev 1): “Okay, this is reassuring — Hana seems real, it's free, 'happy to meet new people'. But wait, the list said '1 going' and here it says '0 joined'... which is it? Am I going to be alone with a stranger?” — [screenshot](../../runs/sched-20261104-1915-aisha-lunch-today/shots/003-click.jpg) · [marked](../../runs/sched-20261104-1915-aisha-lunch-today/shots/003-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what the main control on /activities/:id does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “the going count matches between list and detail, and say whether the host counts”.

### 11. Confusing UI on /activities/:id — “You’re going!”

- **Type** Confusing UI · **severity** max 1, median 1 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: lunch-today · fingerprint `7e9ffeaa7d87`
- aisha-firstgen-anxious (step 8, sev 1): “Oh — it just did it, no 'are you sure?'. That's kind of okay since it's what I wanted, and seeing my name next to Hana's is reassuring. But I didn't know tapping 'Going' would publicly list me. Does Hana get told? I'm guessing the Chat is how I say hi.” — [screenshot](../../runs/sched-20261104-1915-aisha-lunch-today/shots/008-click.jpg) · [marked](../../runs/sched-20261104-1915-aisha-lunch-today/shots/008-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “You’re going!” on /activities/:id does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “one line before or after joining saying who can see I joined and whether Hana is notified”.

### 12. Bug on /chats/:id — “Switch to the classic design”

- **Type** Bug · **severity** max 1, median 1 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: lunch-today · fingerprint `44271af15761`
- aisha-firstgen-anxious (step 12, sev 1): “Sent. No 'delivered' or 'seen' marker, so I'll probably keep checking until Hana answers... but at least she knows I'm coming. Also that little Design pill is sitting on top of the lunch title in the chat, kind of covering it.” — [screenshot](../../runs/sched-20261104-1915-aisha-lunch-today/shots/012-type.jpg) · [marked](../../runs/sched-20261104-1915-aisha-lunch-today/shots/012-type-som.jpg)
- **Suggested improvement (hypothesis):** Reproduce from the evidence steps on /chats/:id (around “Switch to the classic design”) and fix it; add a regression check for that screen. Personas said they wanted: “the floating Design pill doesn't cover the header/event card”.

### 13. Bug on /rides — “My rides”

- **Type** Bug · **severity** max 1, median 1 · **1 persona(s)**: diego-transfer-commuter · scenarios: ride-sfo-thanksgiving · fingerprint `39327c8d79c3`
- diego-transfer-commuter (step 6, sev 1): “The Design Classic/New pill is sitting on top of the My rides tab, can't even read it.” — [screenshot](../../runs/sched-20261104-1915-diego-ride-sfo-thanksgiving/shots/006-click.jpg) · [marked](../../runs/sched-20261104-1915-diego-ride-sfo-thanksgiving/shots/006-click-som.jpg)
- **Suggested improvement (hypothesis):** Reproduce from the evidence steps on /rides (around “My rides”) and fix it; add a regression check for that screen. Personas said they wanted: “don't cover the tab”.

### 14. Unclear wording on /rides/:id — “Open ride chat”

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: diego-transfer-commuter · scenarios: ride-sfo-thanksgiving · fingerprint `5bd02d4d3f24`
- diego-transfer-commuter (step 11, sev 1): “I'm in. Toast says chat is open but it isn't — minor, the button's right there.” — [screenshot](../../runs/sched-20261104-1915-diego-ride-sfo-thanksgiving/shots/011-click.jpg) · [marked](../../runs/sched-20261104-1915-diego-ride-sfo-thanksgiving/shots/011-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “Open ride chat” on /rides/:id in plain language (and check the Korean UI). Personas said they wanted: “say 'ride chat is ready' not 'open'”.

### 15. Confusing UI on /explore/opportunities — “For you”

- **Type** Confusing UI · **severity** max 1, median 1 · **1 persona(s)**: marcus-senior-lowtech · scenarios: internship-near-berkeley · fingerprint `257f14871bc1`
- marcus-senior-lowtech (step 5, sev 1): “567 internships, fine. That's a lot of little buttons though. I see 'Any location' — that's what I want, near Berkeley.” — [screenshot](../../runs/sched-20261104-1915-marcus-internship-near-berkeley/shots/005-click.jpg) · [marked](../../runs/sched-20261104-1915-marcus-internship-near-berkeley/shots/005-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “For you” on /explore/opportunities does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “Fewer chips; why are there two 'For you' buttons?”.

## Automatic checks (harness)

| screen | device | tap targets < 44px (max) | sideways overflow | broken images |
|---|---|---|---|---|
| `/explore/opportunities` | phone | 31 — e.g. See all 62×21, Feedback 93×32, Switch to the classic design 158×32 | — | — |
| `/rides` | phone | 12 — e.g. Back 40×40, Find a ride 173×36, My rides 173×36 | — | — |
| `/meet/meetups` | phone | 10 — e.g. Create 36×36, Notifications 40×40, Messages 40×40 | — | — |
| `/opportunities/:id` | phone | 8 — e.g. Back 40×40, More 40×40, Details 114×36 | — | — |
| `/activities/:id` | phone | 6 — e.g. Back 40×40, More 40×40, Switch to the classic design 158×32 | — | — |
| `/` | phone | 5 — e.g. See all 62×21, Save 36×36, Save 36×36 | — | — |
| `/chats/:id` | phone | 3 — e.g. Back 40×40, Menu 40×40, Switch to the classic design 158×32 | — | — |
| `/rides/:id` | phone | 3 — e.g. Back 40×40, More 40×40, Switch to the classic design 158×32 | — | — |
