# ux-sim summary — 2026-11-06

> **AI simulation — hypotheses, not measured user behaviour.** AI personas drove a real browser. Counts are simulated personas, never rates; every risk below is a hypothesis to check with real students.

## Curated problems (analysis.json)

_Written by Orchestrating Claude session (https://claude.ai/code/session_01Fy5mmf17fdkKuHwrxbkNpM) — also played the 14 persona runs (single agent, no subagents, on request). Heuristic clusters are below._

| sev | problem | personas | env-limited | fingerprints |
|---|---|---|---|---|
| 4 | **A brand-new account finds nobody: Meetups and People are empty, People says "invite friends"** — Cold start is real (no other students locally or for a new campus); NEW mitigates it by filling the empty state with real campus events. | 1 | no | `d56357a742fa` `9c8f7a48cd72` `437a7795dcb2` `f499ce6cb47f` |
| 4 | **Removed by design: a student looking for a shared SFO ride finds no trace of rides on NEW** — Deliberate scope cut; no empty-state or search fallback for ride/airport intents. | 1 | no | `673d175397b9` `5cea59c4df99` `bd87967c28f4` |
| 3 | **Club pages still don't say how to join (BASE: Ask to join vs Not recruiting; NEW: "Not taking requests on Lumi")** — The club page describes Lumi's membership feature state instead of the club's real joining route (show up / their own form / recruiting season). | 1 | no | `d80495a57f74` `b671f45c6bb2` `8151a7027a56` |
| 2 | **Sign-up step "What Lumi can do": Continue flips through four sample tabs while the counter stays at 2 of 6** — /start/what uses the primary Continue button to advance the tab strip (?p=events → clubs → social) instead of the step; the header counter "2 of 6" does not mov | 2 | no | `e4346cedfac4` `3cac57534b9b` |
| 2 | **BASE sign-up asks name and birth year on screen 1 and runs 7 screens before you see anything** — BASE /start asks identity first. | 2 | no | `e2f05b7465c0` `d3b01943595d` `8a0bf61f729f` |
| 2 | **Opportunities lost the Location (Bay Area) and PhD/MS filters; you read every truncated card line instead** — The redesigned /explore/opportunities kept type chips (?type=internship) but dropped the region select (?region=) and the sub-filters from /explore/opportunitie | 1 | no | `df7b2a2fea8f` |
| 2 | **On an internship page the big button says "I applied"; the real "Apply at Source" sits half-hidden under it** — The sticky action bar on /opportunities/:id puts the tracking action (I applied) as primary and the outbound link as a secondary row above it that the bar overl | 1 | no | `efe3a99b03a1` |
| 2 | **Guest "Look around first": the first internships are in Bakersfield and Washington DC, all marked "D-Day"** — The guest Opportunities list sorts "Recommended" without a profile, so national federal listings closing today float to the top; "D-Day" is unexplained shorthan | 1 | no | `6a8b724870e4` |
| 2 | **Club Events tab has no dated events — "Weekend hikes" with no next date** — Org listings carry free-text "regular activities" but no dated events in the snapshot; the tab promises more than the data has. | 1 | no | `919841c6195c` |
| 2 | **"Go together" on an event makes you host of a one-person group in one tap** — One tap both RSVPs and creates the group; the sheet says "1 person is going" without saying that person is you. | 1 | no | `3b0baf47bb8b` |
| 2 | **Internship pages never say if it is paid; BASE also puts "Start a prep crew" above the job facts** — The listing schema has no compensation field; BASE's layout ranked social features first. | 1 | no | `6346e7cbb6c1` `efe3a99b03a1` |
| 2 | **A 17-year-old's first home screen leads with a "Grad Student Appreciation Party"** — For-you ranking ignores year/level for a brand-new undergrad. | 1 | no | `8bb560735e71` |
| 2 | **BASE: Korean only in Settings, and Rides stays English after switching** — Untranslated Rides strings; no language switch before sign-in. | 1 | no | `b94b701b00c1` `c839eaceb32e` |
| 1 | **Club list cards lost the one-line description; the list offers an "Ending soon" sort for clubs** — One generic list card + sort row is reused across Events / Opportunities / Clubs. | 1 | no | `2da294b75311` |
| 1 | **NEW welcome ("Your college life, all in one place") doesn't say what you can do here** — The hero copy is a brand line; the three floating chips ("Your week", "Good company", "Your communities") are abstract. | 1 | no | `e8f92cdd453e` |
| 1 | **After joining a meetup, "Join to get the group chat" still shows and the toast covers the question box** — The hint is static copy on /activities/:id; the toast is positioned over the inline input. | 1 | no | `3d5404e260fd` |
| 1 | **On a laptop the app is a phone-width column** — Mobile-only layout. | 1 | no | `4d28c4b04f0f` |
| 1 | **BASE plan page: "Going / Interested" and the count disagrees ("1 going" vs "0 joined")** — List counts the host, detail does not. | 1 | no | `78bb102ba0f1` |
| 1 | **BASE Schedule tab opens "My Plans"; the timetable is behind a second button** — Schedule = plans first. | 1 | no | `f44b69218f53` |
| 1 | **Adding a class asks for a discussion section from a long list** — Section picker always shown. | 1 | no | `a104f66ab71e` |
| 1 | **BASE timetable header says "2 classes" for one course** — Counts meetings. | 1 | no | `a0f2ea5c4667` |
| 1 | **BASE club list has no search and runs into a long Greek-life block** — One mixed list. | 1 | no | `abbbb40d845c` |

14 run(s) · 33 finding(s) (0 seen by ≥ 2 personas, 32 single events) · max severity **4** · severity 1/2/3/4: 11 / 16 / 5 / 2 · 0 environment-limited event(s) kept out of findings.

_These clusters are mechanical (screen + type + element). The curated problem list is `analysis.json` next to this file, written by the orchestrating session — see docs/ux-sim/ORCHESTRATE.md._

## Runs

| persona | scenario | auth | outcome | goal check | actions | friction (max sev) | drop-off risk (hypothesis) | report |
|---|---|---|---|---|---|---|---|---|
| minji-freshman-17 | cold-start-hangout | none | abandoned | not met | 22 | 4 (4) | high — Signed up through 7 screens and then found nobody — no meetups, no people, just 'invite friends' | [report](../../runs/cmp2ha-base-cold-start-hangout-minji/report.md) |
| aisha-firstgen-anxious | find-a-club | fresh | success | met (2 actions) | 3 | 3 (3) | medium — Found a club fast, but Unverified + Not recruiting + Ask to join leaves me scared to tap anything | [report](../../runs/cmp2ha-base-find-a-club-aisha/report.md) |
| marcus-senior-lowtech | first-open-decide | none | success | met (20 actions) | 20 | 2 (2) | medium — Sign-up asked my name and birth year before showing anything and ran 7 screens; the first job card was CS, not History | [report](../../runs/cmp2ha-base-first-open-decide-marcus/report.md) |
| priya-phd-desktop | internship-near-berkeley | fresh | success | met (4 actions) | 4 | 2 (2) | medium — The board is useful, but the layout is a phone column on my laptop and it pushes social features over job facts | [report](../../runs/cmp2ha-base-internship-near-berkeley-priya/report.md) |
| diego-transfer-commuter | lunch-today | fresh | success | met (3 actions) | 5 | 1 (1) | medium — Fast for lunch, but I still haven't seen anything about study partners or rides for my commute | [report](../../runs/cmp2ha-base-lunch-today-diego/report.md) |
| seoyeon-exchange-korean | ride-sfo-thanksgiving | fresh | success | met (9 actions) | 9 | 2 (2) | low — Found and joined a matching SFO ride, no phone number asked; Rides screens stay English | [report](../../runs/cmp2ha-base-ride-sfo-thanksgiving-seoyeon/report.md) |
| minji-freshman-17 | timetable-add-classes | fresh | success | met (6 actions) | 6 | 3 (1) | medium — Adding was easy but nothing shows people my age or my dorm yet | [report](../../runs/cmp2ha-base-timetable-add-classes-minji/report.md) |
| minji-freshman-17 | cold-start-hangout | none | success | met (25 actions) | 25 | 4 (3) | medium — Korean switch and a way to go to something this week were easy, but I'm still the only one — no people anywhere | [report](../../runs/cmp2ha-new-cold-start-hangout-minji/report.md) |
| aisha-firstgen-anxious | find-a-club | fresh | success | met (2 actions) | 3 | 3 (2) | medium — Calmer than before, but I still don't know how to actually join or when the next hike is | [report](../../runs/cmp2ha-new-find-a-club-aisha/report.md) |
| marcus-senior-lowtech | first-open-decide | none | success | met (24 actions) | 24 | 3 (2) | medium — Look-around-first earned trust, but the welcome never mentions internships, the preview step looped, and the first internships were in DC/Ba | [report](../../runs/cmp2ha-new-first-open-decide-marcus/report.md) |
| priya-phd-desktop | internship-near-berkeley | fresh | success | met (3 actions) | 3 | 3 (2) | medium — Details page is cleaner, but no location/PhD filter and the main button is 'I applied' instead of Apply | [report](../../runs/cmp2ha-new-internship-near-berkeley-priya/report.md) |
| diego-transfer-commuter | lunch-today | fresh | success | met (3 actions) | 5 | 1 (1) | medium — Lunch was quick; still no sign of study partners or rides for my commute | [report](../../runs/cmp2ha-new-lunch-today-diego/report.md) |
| seoyeon-exchange-korean | ride-sfo-thanksgiving | fresh | abandoned | not met | 14 | 3 (4) | high — The one thing I came for (sharing a ride to SFO) does not exist anywhere I looked | [report](../../runs/cmp2ha-new-ride-sfo-thanksgiving-seoyeon/report.md) |
| minji-freshman-17 | timetable-add-classes | fresh | success | met (5 actions) | 5 | 0 (—) | medium — Adding was easy, but nothing shows people my age or my dorm yet | [report](../../runs/cmp2ha-new-timetable-add-classes-minji/report.md) |

## Findings

_Clustered by screen + friction type + key element. Sorted by number of personas, then severity._

### 1. Missing / empty content on /people/explore — “Invite friends”

- **Type** Missing / empty content · **severity** max 4, median 4 · **1 persona(s)**: minji-freshman-17 · scenarios: cold-start-hangout · fingerprint `d56357a742fa`
- minji-freshman-17 (step 29, sev 4): “헐 아무도 없어?? 친구 초대하라고... 친구가 없어서 깐 건데 ㅠ” — [screenshot](../../runs/cmp2ha-base-cold-start-hangout-minji/shots/029-click.jpg) · [marked](../../runs/cmp2ha-base-cold-start-hangout-minji/shots/029-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /people/explore is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “show me at least some people or plans this week”.

### 2. Missing / empty content on /meetups/new — “모임 만들기”

- **Type** Missing / empty content · **severity** max 4, median 4 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: ride-sfo-thanksgiving · fingerprint `673d175397b9`
- seoyeon-exchange-korean (step 23, sev 4): “커피, 공부, 운동, 점심... 공항 가는 건 없네. 이걸로 올리면 이상하게 보일 것 같아. 이 앱엔 라이드가 없나 봐. 그냥 우버 탈래” — [screenshot](../../runs/cmp2ha-new-ride-sfo-thanksgiving-seoyeon/shots/023-click.jpg) · [marked](../../runs/cmp2ha-new-ride-sfo-thanksgiving-seoyeon/shots/023-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /meetups/new is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “a way to find or post a shared ride to SFO”.

### 3. Trust / privacy worry on /orgs/:id — “Ask to join”

- **Type** Trust / privacy worry · **severity** max 3, median 3 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `d80495a57f74`
- aisha-firstgen-anxious (step 4, sev 3): “Wait, 'Unverified' — is this even the real club? And 'Ask to join'... who am I asking, does it send my profile? Maybe 'Recruiting' tells me if they're taking people.” — [screenshot](../../runs/cmp2ha-base-find-a-club-aisha/shots/004-click.jpg) · [marked](../../runs/cmp2ha-base-find-a-club-aisha/shots/004-click-som.jpg)
- **Suggested improvement (hypothesis):** Explain who will see what when tapping “Ask to join” on /orgs/:id before asking for it. Personas said they wanted: “say plainly what Ask to join does and whether I can just show up to a hike”.

### 4. Confusing UI on /orgs/:id?tab=recruit — “Recruiting”

- **Type** Confusing UI · **severity** max 3, median 3 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `b671f45c6bb2`
- aisha-firstgen-anxious (step 6, sev 3): “So they're not recruiting... but I can still ask to join? Did I miss a window? I don't want to send a request that's wrong. I'll follow them for now so I don't lose it, that seems safe.” — [screenshot](../../runs/cmp2ha-base-find-a-club-aisha/shots/006-click.jpg) · [marked](../../runs/cmp2ha-base-find-a-club-aisha/shots/006-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Recruiting” on /orgs/:id?tab=recruit does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “tell me whether I can just show up to hikes and when they take new people”.

### 5. Missing / empty content on /social/people — “친구 초대”

- **Type** Missing / empty content · **severity** max 3, median 3 · **1 persona(s)**: minji-freshman-17 · scenarios: cold-start-hangout · fingerprint `437a7795dcb2`
- minji-freshman-17 (step 35, sev 3): “사람도 없네.. 친구 초대하래. 근데 밑에 보드게임 나이트 토요일 — '같이 가기' 누르면 같이 갈 사람 찾아주나?” — [screenshot](../../runs/cmp2ha-new-cold-start-hangout-minji/shots/035-click.jpg) · [marked](../../runs/cmp2ha-new-cold-start-hangout-minji/shots/035-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /social/people is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “show me some people or plans this week, not invite friends”.

### 6. Hard to find on /social/meetups

- **Type** Hard to find · **severity** max 3, median 3 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: ride-sfo-thanksgiving · fingerprint `5cea59c4df99`
- seoyeon-exchange-korean (step 11, sev 3): “라이드나 공항 같은 게 없어... 검색해볼까? SFO” — [screenshot](../../runs/cmp2ha-new-ride-sfo-thanksgiving-seoyeon/shots/011-click.jpg) · [marked](../../runs/cmp2ha-new-ride-sfo-thanksgiving-seoyeon/shots/011-click-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for where they looked (/social/meetups); label icon-only controls. Personas said they wanted: “a place to find/share rides to the airport”.

### 7. Missing / empty content on /search — “행사, 사람, 동아리 검색…”

- **Type** Missing / empty content · **severity** max 3, median 3 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: ride-sfo-thanksgiving · fingerprint `bd87967c28f4`
- seoyeon-exchange-korean (step 19, sev 3): “결과 없음... 라이드 기능이 없나? 그럼 내가 '모임 만들기'로 공항 같이 갈 사람 구해볼까” — [screenshot](../../runs/cmp2ha-new-ride-sfo-thanksgiving-seoyeon/shots/019-type.jpg) · [marked](../../runs/cmp2ha-new-ride-sfo-thanksgiving-seoyeon/shots/019-type-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /search is really missing (or only missing in the test environment); avoid showing empty sections.

### 8. Onboarding friction on /start — “Skip”

- **Type** Onboarding friction · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: cold-start-hangout · fingerprint `8a0bf61f729f`
- minji-freshman-17 (step 14, sev 2): “아 귀찮아.. 또 고르래. 이메일은 언제 해? Skip” — [screenshot](../../runs/cmp2ha-base-cold-start-hangout-minji/shots/014-click.jpg) · [marked](../../runs/cmp2ha-base-cold-start-hangout-minji/shots/014-click-som.jpg)
- **Suggested improvement (hypothesis):** Shorten or explain this sign-up step (/start); ask only what is needed now and let the rest wait until it is useful. Personas said they wanted: “fewer steps, email sooner”.

### 9. No reason to stay on / — “Campus event Grad Student Appreciation P”

- **Type** No reason to stay · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: cold-start-hangout · fingerprint `8bb560735e71`
- minji-freshman-17 (step 24, sev 2): “Grad student party?? 나 17살인데.. 사람은 어디 있어? Meetups 눌러보자” — [screenshot](../../runs/cmp2ha-base-cold-start-hangout-minji/shots/024-click.jpg) · [marked](../../runs/cmp2ha-base-cold-start-hangout-minji/shots/024-click-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /: show real people or things happening now (or a clear next step) instead of empty or generic content.

### 10. Missing / empty content on /meet/meetups

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: cold-start-hangout · fingerprint `9c8f7a48cd72`
- minji-freshman-17 (step 26, sev 2): “아무것도 없네.. People 탭은?” — [screenshot](../../runs/cmp2ha-base-cold-start-hangout-minji/shots/026-click.jpg) · [marked](../../runs/cmp2ha-base-cold-start-hangout-minji/shots/026-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /meet/meetups is really missing (or only missing in the test environment); avoid showing empty sections.

### 11. Trust / privacy worry on /start — “2005”

- **Type** Trust / privacy worry · **severity** max 2, median 2 · **1 persona(s)**: marcus-senior-lowtech · scenarios: first-open-decide · fingerprint `e2f05b7465c0`
- marcus-senior-lowtech (step 2, sev 2): “Name and birth year right away. I haven't even seen an internship. At least it says why it wants the year. First name only, fine.” — [screenshot](../../runs/cmp2ha-base-first-open-decide-marcus/shots/002-click.jpg) · [marked](../../runs/cmp2ha-base-first-open-decide-marcus/shots/002-click-som.jpg)
- **Suggested improvement (hypothesis):** Explain who will see what when tapping “2005” on /start before asking for it. Personas said they wanted: “let me look around before asking who I am”.

### 12. Onboarding friction on /start — “None for now”

- **Type** Onboarding friction · **severity** max 2, median 2 · **1 persona(s)**: marcus-senior-lowtech · scenarios: first-open-decide · fingerprint `d3b01943595d`
- marcus-senior-lowtech (step 18, sev 2): “Another list. 'None for now.' This is the sixth screen, getting long.” — [screenshot](../../runs/cmp2ha-base-first-open-decide-marcus/shots/018-click.jpg) · [marked](../../runs/cmp2ha-base-first-open-decide-marcus/shots/018-click-som.jpg)
- **Suggested improvement (hypothesis):** Shorten or explain this sign-up step (/start); ask only what is needed now and let the rest wait until it is useful.

### 13. Missing / empty content on /opportunities/:id — “Start a prep crew e.g. Interview prep · ”

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: priya-phd-desktop · scenarios: internship-near-berkeley · fingerprint `6346e7cbb6c1`
- priya-phd-desktop (step 9, sev 2): “Good enough — Mountain View, MS/PhD, Apply on Waymo. Why is 'Start a prep crew' above the actual details? And nothing about pay.” — [screenshot](../../runs/cmp2ha-base-internship-near-berkeley-priya/shots/009-click.jpg) · [marked](../../runs/cmp2ha-base-internship-near-berkeley-priya/shots/009-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /opportunities/:id is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “pay, dates and eligibility first; social extras below”.

### 14. Unclear wording on /rides — “Find a ride”

- **Type** Unclear wording · **severity** max 2, median 2 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: ride-sfo-thanksgiving · fingerprint `c839eaceb32e`
- seoyeon-exchange-korean (step 11, sev 2): “어... 다 영어네. 내 라이드는 없고. 'Find a ride' 누르면 다른 사람 것 보이겠지” — [screenshot](../../runs/cmp2ha-base-ride-sfo-thanksgiving-seoyeon/shots/011-click.jpg) · [marked](../../runs/cmp2ha-base-ride-sfo-thanksgiving-seoyeon/shots/011-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “Find a ride” on /rides in plain language (and check the Korean UI).

### 15. Onboarding friction on /start/what — “계속”

- **Type** Onboarding friction · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: cold-start-hangout · fingerprint `e4346cedfac4`
- minji-freshman-17 (step 9, sev 2): “뭐지, 계속 눌렀는데 아직 2/6? 탭 4개 다 봐야 돼? 아 귀찮아” — [screenshot](../../runs/cmp2ha-new-cold-start-hangout-minji/shots/009-click.jpg) · [marked](../../runs/cmp2ha-new-cold-start-hangout-minji/shots/009-click-som.jpg)
- **Suggested improvement (hypothesis):** Shorten or explain this sign-up step (/start/what); ask only what is needed now and let the rest wait until it is useful. Personas said they wanted: “let me skip the tour”.

### 16. Missing / empty content on /social/meetups

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: cold-start-hangout · fingerprint `f499ce6cb47f`
- minji-freshman-17 (step 33, sev 2): “모임은 없고 첫 약속 만들래. 밑에 게임나이트 있네. 사람 탭은?” — [screenshot](../../runs/cmp2ha-new-cold-start-hangout-minji/shots/033-click.jpg) · [marked](../../runs/cmp2ha-new-cold-start-hangout-minji/shots/033-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /social/meetups is really missing (or only missing in the test environment); avoid showing empty sections.

### 17. Confusing UI on /social/people — “갈래요”

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: cold-start-hangout · fingerprint `3b0baf47bb8b`
- minji-freshman-17 (step 37, sev 2): “어? 바로 들어가졌네. '1명이 가요' — 나 혼자잖아 ㅋㅋ. 그래도 토요일 보드게임, 그룹 채팅 있으니까 누가 오면 얘기하면 되겠다” — [screenshot](../../runs/cmp2ha-new-cold-start-hangout-minji/shots/037-click.jpg) · [marked](../../runs/cmp2ha-new-cold-start-hangout-minji/shots/037-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “갈래요” on /social/people does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “ask before joining, and say nobody else is in yet”.

### 18. Unclear wording on /orgs/:id

- **Type** Unclear wording · **severity** max 2, median 2 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `8151a7027a56`
- aisha-firstgen-anxious (step 4, sev 2): “OK, at least nothing scary to tap — Follow just gets updates. But 'Not taking requests on Lumi'... so how DO I join? And 'never grants private access' — private access to what? Maybe Events shows a hike I can go to.” — [screenshot](../../runs/cmp2ha-new-find-a-club-aisha/shots/004-click.jpg) · [marked](../../runs/cmp2ha-new-find-a-club-aisha/shots/004-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite the wording on /orgs/:id in plain language (and check the Korean UI). Personas said they wanted: “say plainly how to join (show up / their own sign-up) instead of what Lumi doesn't do”.

### 19. Missing / empty content on /orgs/:id?tab=events — “Events”

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `919841c6195c`
- aisha-firstgen-anxious (step 6, sev 2): “No actual hike dates. I'll follow them so I hear about the next one — it says that's all following does, which feels safe.” — [screenshot](../../runs/cmp2ha-new-find-a-club-aisha/shots/006-click.jpg) · [marked](../../runs/cmp2ha-new-find-a-club-aisha/shots/006-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /orgs/:id?tab=events is really missing (or only missing in the test environment); avoid showing empty sections.

### 20. Missing / empty content on /guest/explore/opportunities — “Internship Oil and Gas Bond Reviews and ”

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: marcus-senior-lowtech · scenarios: first-open-decide · fingerprint `6a8b724870e4`
- marcus-senior-lowtech (step 5, sev 2): “So it does have real internships — Bureau of Land Management, Park Service. But Bakersfield and DC, not near Berkeley, and what's 'D-Day'? Still, it's real stuff, not a party app. I'll join.” — [screenshot](../../runs/cmp2ha-new-first-open-decide-marcus/shots/005-click.jpg) · [marked](../../runs/cmp2ha-new-first-open-decide-marcus/shots/005-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /guest/explore/opportunities is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “show Bay Area ones first and say 'closes today' in words”.

### 21. Onboarding friction on /start/what — “Continue”

- **Type** Onboarding friction · **severity** max 2, median 2 · **1 persona(s)**: marcus-senior-lowtech · scenarios: first-open-decide · fingerprint `3cac57534b9b`
- marcus-senior-lowtech (step 10, sev 2): “I pressed Continue and it's still '2 of 6'? It just flipped to another sample. How many of these are there?” — [screenshot](../../runs/cmp2ha-new-first-open-decide-marcus/shots/010-click.jpg) · [marked](../../runs/cmp2ha-new-first-open-decide-marcus/shots/010-click-som.jpg)
- **Suggested improvement (hypothesis):** Shorten or explain this sign-up step (/start/what); ask only what is needed now and let the rest wait until it is useful. Personas said they wanted: “Continue should go to the next step, or let me skip the preview”.

### 22. Hard to find on /explore/opportunities — “Internships”

- **Type** Hard to find · **severity** max 2, median 2 · **1 persona(s)**: priya-phd-desktop · scenarios: internship-near-berkeley · fingerprint `df7b2a2fea8f`
- priya-phd-desktop (step 4, sev 2): “No location filter, no PhD/MS filter. I have to read each truncated 'Mountain Vie…' line. The top ones happen to be Bay Area, so fine.” — [screenshot](../../runs/cmp2ha-new-internship-near-berkeley-priya/shots/004-click.jpg) · [marked](../../runs/cmp2ha-new-internship-near-berkeley-priya/shots/004-click-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“Internships”) where they looked (/explore/opportunities); label icon-only controls. Personas said they wanted: “a Bay Area / near Berkeley location filter and a PhD/MS filter”.

### 23. Confusing UI on /opportunities/:id — “I applied”

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: priya-phd-desktop · scenarios: internship-near-berkeley · fingerprint `efe3a99b03a1`
- priya-phd-desktop (step 6, sev 2): “Better: facts first, source verified, last checked Nov 1. But the big lavender button says 'I applied' — I haven't. The real 'Apply at Source' is half under it. Still no pay.” — [screenshot](../../runs/cmp2ha-new-internship-near-berkeley-priya/shots/006-click.jpg) · [marked](../../runs/cmp2ha-new-internship-near-berkeley-priya/shots/006-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “I applied” on /opportunities/:id does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “make 'Apply at source' the main button; 'I applied' secondary”.

### 24. No reason to stay on /

- **Type** No reason to stay · **severity** max 1, median 1 · **1 persona(s)**: priya-phd-desktop · scenarios: internship-near-berkeley · fingerprint `4d28c4b04f0f`
- priya-phd-desktop (step 0, sev 1): “Phone-width column in the middle of a 1440 screen again. At least 'Opportunities' is on the first screen now. I want a list I can filter, not one card.” — [screenshot](../../runs/cmp2ha-base-internship-near-berkeley-priya/shots/000-start.jpg) · [marked](../../runs/cmp2ha-base-internship-near-berkeley-priya/shots/000-start-som.jpg)
- priya-phd-desktop (step 0, sev 1): “Still a phone column, but at least it says so and the side isn't just black. 'Opportunities' up top. I want a list I can filter.” — [screenshot](../../runs/cmp2ha-new-internship-near-berkeley-priya/shots/000-start.jpg) · [marked](../../runs/cmp2ha-new-internship-near-berkeley-priya/shots/000-start-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /: show real people or things happening now (or a clear next step) instead of empty or generic content.

### 25. Hard to find on /explore/clubs

- **Type** Hard to find · **severity** max 1, median 1 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `abbbb40d845c`
- aisha-firstgen-anxious (step 2, sev 1): “Pre-Med Society feels like a résumé club. Hiking club sounds friendly and low-pressure. There are a lot of sororities further down... no search box though.” — [screenshot](../../runs/cmp2ha-base-find-a-club-aisha/shots/002-click.jpg) · [marked](../../runs/cmp2ha-base-find-a-club-aisha/shots/002-click-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for where they looked (/explore/clubs); label icon-only controls. Personas said they wanted: “search clubs by interest”.

### 26. Unclear wording on /chats/:id

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: diego-transfer-commuter · scenarios: lunch-today · fingerprint `78bb102ba0f1`
- diego-transfer-commuter (step 9, sev 1): “Sent. Took a minute. Only thing: it's called lunch but it's 6pm, and the list said 1 going while the page said 0 joined.” — [screenshot](../../runs/cmp2ha-base-lunch-today-diego/shots/009-type.jpg) · [marked](../../runs/cmp2ha-base-lunch-today-diego/shots/009-type-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite the wording on /chats/:id in plain language (and check the Korean UI).

### 27. Unclear wording on /profile — “My rides Airports, groceries, SF, Tahoe”

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: ride-sfo-thanksgiving · fingerprint `b94b701b00c1`
- seoyeon-exchange-korean (step 9, sev 1): “'My rides — Airports' 이거 영어로 남아있네. 그래도 공항이라 써있어서 이거다” — [screenshot](../../runs/cmp2ha-base-ride-sfo-thanksgiving-seoyeon/shots/009-scroll.jpg) · [marked](../../runs/cmp2ha-base-ride-sfo-thanksgiving-seoyeon/shots/009-scroll-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “My rides Airports, groceries, SF, Tahoe” on /profile in plain language (and check the Korean UI).

### 28. Hard to find on /schedule — “My timetable”

- **Type** Hard to find · **severity** max 1, median 1 · **1 persona(s)**: minji-freshman-17 · scenarios: timetable-add-classes · fingerprint `f44b69218f53`
- minji-freshman-17 (step 2, sev 1): “My Plans? 시간표 아니네. 아 밑에 My timetable 있다” — [screenshot](../../runs/cmp2ha-base-timetable-add-classes-minji/shots/002-click.jpg) · [marked](../../runs/cmp2ha-base-timetable-add-classes-minji/shots/002-click-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“My timetable”) where they looked (/schedule); label icon-only controls.

### 29. Confusing UI on /timetable — “Add lecture only”

- **Type** Confusing UI · **severity** max 1, median 1 · **1 persona(s)**: minji-freshman-17 · scenarios: timetable-add-classes · fingerprint `a104f66ab71e`
- minji-freshman-17 (step 10, sev 1): “디스커션 섹션?? 몰라.. 'Add lecture only' 누르면 되겠지” — [screenshot](../../runs/cmp2ha-base-timetable-add-classes-minji/shots/010-click.jpg) · [marked](../../runs/cmp2ha-base-timetable-add-classes-minji/shots/010-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Add lecture only” on /timetable does before people tap it — plain-word label, visible result, or a one-line hint.

### 30. Unclear wording on /timetable

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: minji-freshman-17 · scenarios: timetable-add-classes · fingerprint `a0f2ea5c4667`
- minji-freshman-17 (step 12, sev 1): “들어갔다! 근데 '2 classes'? 하나인데..” — [screenshot](../../runs/cmp2ha-base-timetable-add-classes-minji/shots/012-click.jpg) · [marked](../../runs/cmp2ha-base-timetable-add-classes-minji/shots/012-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite the wording on /timetable in plain language (and check the Korean UI).

### 31. Unclear wording on /explore/clubs — “Ending soon”

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `2da294b75311`
- aisha-firstgen-anxious (step 2, sev 1): “Nice, there's a search and Greek life is separate. But the cards only say 'Outdoors · Public organization' — I can't tell what they do. 'Ending soon' for clubs? Hiking sounds friendly though.” — [screenshot](../../runs/cmp2ha-new-find-a-club-aisha/shots/002-click.jpg) · [marked](../../runs/cmp2ha-new-find-a-club-aisha/shots/002-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “Ending soon” on /explore/clubs in plain language (and check the Korean UI). Personas said they wanted: “one line about what the club does on each card”.

### 32. Unclear wording on /welcome

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: marcus-senior-lowtech · scenarios: first-open-decide · fingerprint `e8f92cdd453e`
- marcus-senior-lowtech (step 0, sev 1): “'Your college life, all in one place.' Pretty vague — nothing about internships. But 'Look around first' — good, I want to see it before giving my info.” — [screenshot](../../runs/cmp2ha-new-first-open-decide-marcus/shots/000-start.jpg) · [marked](../../runs/cmp2ha-new-first-open-decide-marcus/shots/000-start-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite the wording on /welcome in plain language (and check the Korean UI).

### 33. Unclear wording on /activities/:id — “Group chat”

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: diego-transfer-commuter · scenarios: lunch-today · fingerprint `3d5404e260fd`
- diego-transfer-commuter (step 5, sev 1): “Done. Big 'Open Group Chat' button. Still says 'Join to get the group chat' under it though — I already joined.” — [screenshot](../../runs/cmp2ha-new-lunch-today-diego/shots/005-click.jpg) · [marked](../../runs/cmp2ha-new-lunch-today-diego/shots/005-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “Group chat” on /activities/:id in plain language (and check the Korean UI).

## Automatic checks (harness)

| screen | device | tap targets < 44px (max) | sideways overflow | broken images |
|---|---|---|---|---|
| `/guest/explore/opportunities` | phone | 14 — e.g. Back 40×40, Search opportunities 295×23, Recommended 131×36 | — | — |
| `/meetups/new` | phone | 14 — e.g. 뒤로 40×40, 커피 81×36, 공부 81×36 | — | — |
| `/guest/explore/events` | phone | 13 — e.g. Back 40×40, Search events 295×23, Recommended 131×36 | — | — |
| `/social` | phone | 13 — e.g. 알림 40×40, 메시지 40×40, 커피 60×36 | — | — |
| `/explore/clubs` | phone | 12 — e.g. Back 40×40, All 37×28, Clubs 55×28 | — | — |
| `/profile` | phone | 12 — e.g. Notifications 40×40, Messages 40×40, Me 32×32 | — | — |
| `/rides` | phone | 12 — e.g. 뒤로 40×40, Find a ride 173×36, My rides 173×36 | — | — |
| `/start/communities` | phone | 12 — e.g. 뒤로 40×40, 건너뛰기 80×40, 동아리 73×36 | — | — |
| `/people/explore` | phone | 11 — e.g. Filters 40×40, Notifications 40×40, Messages 40×40 | — | — |
| `/meet/meetups` | phone | 10 — e.g. Create 36×36, Notifications 40×40, Messages 40×40 | — | — |
| `/people` | phone | 10 — e.g. Create 36×36, Notifications 40×40, Messages 40×40 | — | — |
| `/social/people` | phone | 10 — e.g. 알림 40×40, 메시지 40×40, 모두 보기 69×20 | — | — |
| `/start/university` | phone | 9 — e.g. 뒤로 40×40, 학교 검색 287×23, 학부생 73×36 | — | — |
| `/schedule/classes` | phone | 9 — e.g. Back 40×40, Fall 2026 90×36, Spring 2027 109×36 | — | — |
| `/orgs/:id` | phone | 8 — e.g. Back 40×40, Messages 40×40, About 56×28 | — | — |
| `/orgs/:id?tab=recruit` | phone | 8 — e.g. Back 40×40, Messages 40×40, About 56×28 | — | — |
| `/timetable` | phone | 7 — e.g. Back 40×40, Friends 92×28, Class 88×36 | — | — |
| `/social/meetups` | phone | 7 — e.g. 알림 40×40, 메시지 40×40, 모두 보기 69×20 | — | — |
| `/` | phone | 6 — e.g. See all 62×21, Feedback 93×32, Switch to the classic design 158×32 | — | — |
| `/activities/:id` | phone | 6 — e.g. Back 40×40, More 40×40, Switch to the classic design 158×32 | — | — |
| `/settings` | phone | 6 — e.g. Back 40×40, Allow 69×36, Open 66×36 | — | — |
| `/welcome` | phone | 5 — e.g. Sign in 46×21, Terms of Use 76×15, Privacy Policy 180×33 | — | — |
| `/schedule` | phone | 5 — e.g. Back 40×40, Messages 40×40, + Plan Together 92×18 | — | — |
| `/start/what` | phone | 5 — e.g. 뒤로 40×40 | — | — |
| `/start` | phone | 4 — e.g. Back 40×40, Switch to the classic design 158×32 | — | — |
| `/start/about` | phone | 4 — e.g. 뒤로 40×40, 학생증으로 인증 93×18, 이용약관 234×31 | — | — |
| `/chats/:id` | phone | 3 — e.g. Back 40×40, Menu 40×40, Switch to the classic design 158×32 | — | — |
| `/rides/:id` | phone | 3 — e.g. 뒤로 40×40, More 40×40, Switch to the classic design 158×32 | — | — |
| `/orgs/:id?tab=events` | phone | 3 — e.g. Back 40×40, More 40×40, Follow 76×36 | — | — |
| `/start/discover` | phone | 2 — e.g. 뒤로 40×40, 건너뛰기 80×40 | — | — |
| `/notifications` | phone | 2 — e.g. 뒤로 40×40, 더 보기 40×40 | — | — |
| `/search` | phone | 2 — e.g. 뒤로 40×40, 행사, 사람, 동아리 검색… 295×23 | — | — |
| `/start/goals` | phone | 1 — e.g. 뒤로 40×40 | — | — |
