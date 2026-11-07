# ux-sim summary — 2026-11-07

> **AI simulation — hypotheses, not measured user behaviour.** AI personas drove a real browser. Counts are simulated personas, never rates; every risk below is a hypothesis to check with real students.

## Curated problems (analysis.json)

_Written by Scheduled orchestrating Claude session (https://claude.ai/code/session_01VX4jQF3M6doYf7VDXmTdrm). Heuristic clusters are below._

| sev | problem | personas | env-limited | fingerprints |
|---|---|---|---|---|
| 4 | **"Join Lumi" opens a "1 of 6" goals quiz instead of an e-mail field** — Profiling before the account; "1 of 6" makes the length explicit right after the student chose to join. | 3 | no | `e5e1110b21e7` `7f81788d3988` `b3c7023ed06b` `2049e44e7166` |
| 3 | **Guest club sheet repeats the one-line description and offers only "Follow"** — Guest club sheet shows only list fields; imported clubs carry little more. | 4 | no | `80e5f387dd6f` `23685972f161` `b29e1c7c6485` |
| 2 | **Club list "Recommended" is A–Z, opening on sororities and fraternities** — "Recommended" has no signal for guests and falls back to alphabetical. | 3 | no | `9c2019fa59ce` `5c97e2699a4f` |
| 2 | **Guest Explore and first "For you" items are faculty talks and career fairs, not student life** — Ranking ignores role and picked goals; live events are faculty/career-heavy. | 3 | no | `fd5df2b461e7` `2008ea54a771` `b72bcf16403c` `934acb5cdeb3` `b275c9c6f849` `5eec1dd9082d` |
| 2 | **Search misses: "public health"/"first-gen" find no clubs, "SFO" returns yoga and a talk** — Fuzzy search with loose matching; no tag/major index; no "showing results for" hint. | 2 | no | `9630cf170545` `54170e674d7d` `c1d73ff77b3c` |
| 2 | **The Social preview in sign-up never says who can see your profile or message you** — Privacy copy only appears on the final form. | 1 | no | `045610ef15b3` |
| 1 | **Language toggle is a tiny "English" label (44×20) — easy to miss, but switching works** — Small text button. | 2 | no | `88c73a7bb2af` |

4 run(s) · 21 finding(s) (5 seen by ≥ 2 personas, 15 single events) · max severity **4** · severity 1/2/3/4: 9 / 15 / 2 / 1 · 0 environment-limited event(s) kept out of findings.

_These clusters are mechanical (screen + type + element). The curated problem list is `analysis.json` next to this file, written by the orchestrating session — see docs/ux-sim/ORCHESTRATE.md._

## Runs

| persona | scenario | auth | outcome | goal check | actions | friction (max sev) | drop-off risk (hypothesis) | report |
|---|---|---|---|---|---|---|---|---|
| aisha-firstgen-anxious | first-open-decide | none | success | met (33 actions) | 33 | 10 (3) | medium — The small coffee-after-class meetups appeal to me, but club pages were thin (no how-to-join), searches for public health and first-gen found | [report](../../runs/sched-20261107-1915-aisha-first-open-decide/report.md) |
| jordan-sophomore-impatient | first-open-decide | none | abandoned | not met | 6 | 6 (4) | high — Guest preview showed a bulletin board (emeriti talks, A-Z Greek list, empty club sheet) and sign-up announced 6 screens of setup; nothing ga | [report](../../runs/sched-20261107-1915-jordan-first-open-decide/report.md) |
| minji-freshman-17 | first-open-decide | none | success | met (25 actions) | 25 | 7 (2) | medium — Signed up because the social preview promised lunch plans, but every real screen so far (guest explore, home) was English event lists; if So | [report](../../runs/sched-20261107-1915-minji-first-open-decide/report.md) |
| seoyeon-exchange-korean | first-open-decide | none | success | met (27 actions) | 27 | 4 (2) | medium — Korean UI and KSA kept me, but I never saw anything about rides/travel, and the guest preview and club sheet showed no people — if 모임 has no | [report](../../runs/sched-20261107-1915-seoyeon-first-open-decide/report.md) |

## Findings

_Clustered by screen + friction type + key element. Sorted by number of personas, then severity._

### 1. Onboarding friction on /start/goals — “Continue”

- **Type** Onboarding friction · **severity** max 4, median 2.5 · **2 persona(s)**: aisha-firstgen-anxious, jordan-sophomore-impatient · scenarios: first-open-decide · fingerprint `e5e1110b21e7`
- aisha-firstgen-anxious (step 23, sev 1): “Oh, 6 steps before I even make the account? That's a lot, but 'You can change this later' makes me feel okay picking. Clubs and meeting people — that's exactly me.” — [screenshot](../../runs/sched-20261107-1915-aisha-first-open-decide/shots/023-click.jpg) · [marked](../../runs/sched-20261107-1915-aisha-first-open-decide/shots/023-click-som.jpg)
- jordan-sophomore-impatient (step 13, sev 4): “1 of 6?? i tapped join, not take a survey. six screens before i even see a person. nope” — [screenshot](../../runs/sched-20261107-1915-jordan-first-open-decide/shots/013-click.jpg) · [marked](../../runs/sched-20261107-1915-jordan-first-open-decide/shots/013-click-som.jpg)
- **Suggested improvement (hypothesis):** Shorten or explain this sign-up step (/start/goals); ask only what is needed now and let the rest wait until it is useful. Personas said they wanted: “tell me upfront what the 6 steps are and that nothing is public yet”; “email first, one screen, ask goals later or never”.

### 2. Missing / empty content on /guest/explore/clubs — “Follow”

- **Type** Missing / empty content · **severity** max 3, median 3 · **2 persona(s)**: aisha-firstgen-anxious, jordan-sophomore-impatient · scenarios: first-open-decide · fingerprint `80e5f387dd6f`
- aisha-firstgen-anxious (step 11, sev 3): “That's it? Same sentence again. It doesn't tell me if I have to apply or if it's open, or when they meet. And 'Follow' — wait, does following mean they see me, or that I'm signing up for the fraternity? I don't want to accidentally look like I'm rushing.” — [screenshot](../../runs/sched-20261107-1915-aisha-first-open-decide/shots/011-click.jpg) · [marked](../../runs/sched-20261107-1915-aisha-first-open-decide/shots/011-click-som.jpg)
- jordan-sophomore-impatient (step 9, sev 3): “that's it? same sentence again. no people, no next hackathon date, nothing. ok and?” — [screenshot](../../runs/sched-20261107-1915-jordan-first-open-decide/shots/009-click.jpg) · [marked](../../runs/sched-20261107-1915-jordan-first-open-decide/shots/009-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /guest/explore/clubs is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “tell me how to join (open vs. application), when they meet, and what Follow does / who sees it”; “show upcoming events, how many people from Lumi follow it, people looking for teammates”.

### 3. No reason to stay on /guest/explore/events — “Campus event Today · 11 AM UC Berkeley E”

- **Type** No reason to stay · **severity** max 2, median 1.5 · **2 persona(s)**: aisha-firstgen-anxious, jordan-sophomore-impatient · scenarios: first-open-decide · fingerprint `fd5df2b461e7`
- aisha-firstgen-anxious (step 2, sev 1): “Wait, it's mostly faculty speaker series and seminars on top. Retirement Center talk first? That's not really for me. I came for clubs.” — [screenshot](../../runs/sched-20261107-1915-aisha-first-open-decide/shots/002-click.jpg) · [marked](../../runs/sched-20261107-1915-aisha-first-open-decide/shots/002-click-som.jpg)
- jordan-sophomore-impatient (step 2, sev 2): “list of event cards with 'view source' links. this is giving bulletin board. where are the people” — [screenshot](../../runs/sched-20261107-1915-jordan-first-open-decide/shots/002-click.jpg) · [marked](../../runs/sched-20261107-1915-jordan-first-open-decide/shots/002-click-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /guest/explore/events: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “show student-friendly social stuff first for a new student”; “show who's going / something social, not a calendar dump”.

### 4. Confusing UI on /guest/explore/clubs — “Sort: Recommended”

- **Type** Confusing UI · **severity** max 2, median 2 · **2 persona(s)**: aisha-firstgen-anxious, jordan-sophomore-impatient · scenarios: first-open-decide · fingerprint `9c2019fa59ce`
- aisha-firstgen-anxious (step 5, sev 2): “It says 'Recommended' but it's just sororities and frats A to Z? Wait, do I have to rush to join anything here? I don't really know how Greek life works and this is kind of intimidating as the first thing.” — [screenshot](../../runs/sched-20261107-1915-aisha-first-open-decide/shots/005-click.jpg) · [marked](../../runs/sched-20261107-1915-aisha-first-open-decide/shots/005-click-som.jpg)
- jordan-sophomore-impatient (step 5, sev 2): “lol 'recommended' is just A to Z. four sororities in a row. not what i'm here for” — [screenshot](../../runs/sched-20261107-1915-jordan-first-open-decide/shots/005-click.jpg) · [marked](../../runs/sched-20261107-1915-jordan-first-open-decide/shots/005-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Sort: Recommended” on /guest/explore/clubs does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “if it's 'Recommended', show me something that fits a new student, not the alphabet starting with Greek letters”; “actually recommend stuff, or say it's A-Z”.

### 5. Hard to find on /welcome — “한국어”

- **Type** Hard to find · **severity** max 1, median 1 · **2 persona(s)**: minji-freshman-17, seoyeon-exchange-korean · scenarios: first-open-decide · fingerprint `88c73a7bb2af`
- minji-freshman-17 (step 1, sev 1): “오 바로 한국어 됐다! 좋아. 근데 tiny 'English' 글씨라 거의 못 볼 뻔” — [screenshot](../../runs/sched-20261107-1915-minji-first-open-decide/shots/001-click.jpg) · [marked](../../runs/sched-20261107-1915-minji-first-open-decide/shots/001-click-som.jpg)
- seoyeon-exchange-korean (step 1, sev 1): “와 한국어! 바로 바뀌네. 리스트는 안 나왔지만 더 좋아요. 근데 버튼이 너무 작아서 잘 안 보였어요.” — [screenshot](../../runs/sched-20261107-1915-seoyeon-first-open-decide/shots/001-click.jpg) · [marked](../../runs/sched-20261107-1915-seoyeon-first-open-decide/shots/001-click-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“한국어”) where they looked (/welcome); label icon-only controls. Personas said they wanted: “bigger language toggle, like 🌐 icon”; “make the language toggle bigger, like a 🌐 icon”.

### 6. Missing / empty content on /guest/explore/clubs — “Search clubs”

- **Type** Missing / empty content · **severity** max 2, median 1.5 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: first-open-decide · fingerprint `9630cf170545`
- aisha-firstgen-anxious (step 7, sev 2): “Nothing for public health? At Berkeley? That's literally my major. Maybe I typed it wrong… let me try just 'health'.” — [screenshot](../../runs/sched-20261107-1915-aisha-first-open-decide/shots/007-type.jpg) · [marked](../../runs/sched-20261107-1915-aisha-first-open-decide/shots/007-type-som.jpg)
- aisha-firstgen-anxious (step 21, sev 1): “Okay, no first-gen group. Not shocking, but a little sad. Still, the board game nights and the community clubs looked friendly. The bottom keeps saying people and meetups are only for students who join — that's the part I actually want, finding people to go with.” — [screenshot](../../runs/sched-20261107-1915-aisha-first-open-decide/shots/021-type.jpg) · [marked](../../runs/sched-20261107-1915-aisha-first-open-decide/shots/021-type-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /guest/explore/clubs is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “find related clubs (pre-health, health, community service) even if the exact phrase doesn't match”; “a first-gen / transfer support group, or suggest the closest matches”.

### 7. Trust / privacy worry on /start/what — “Social”

- **Type** Trust / privacy worry · **severity** max 2, median 2 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: first-open-decide · fingerprint `045610ef15b3`
- aisha-firstgen-anxious (step 29, sev 2): “Oh, 'coffee after class' with people from my classes — that's small and not scary. That's honestly what I want. I still don't know who can see me or message me though.” — [screenshot](../../runs/sched-20261107-1915-aisha-first-open-decide/shots/029-click.jpg) · [marked](../../runs/sched-20261107-1915-aisha-first-open-decide/shots/029-click-som.jpg)
- **Suggested improvement (hypothesis):** Explain who will see what when tapping “Social” on /start/what before asking for it. Personas said they wanted: “one line here: who can see my profile and who can message me”.

### 8. Onboarding friction on /start/communities — “Add your own”

- **Type** Onboarding friction · **severity** max 2, median 2 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: first-open-decide · fingerprint `b3c7023ed06b`
- aisha-firstgen-anxious (step 43, sev 2): “Still no e-mail — this is a long sign-up. 'Membership is verified separately'… I don't belong to anything yet and I don't want to look like I'm claiming to be in a club. I'll skip this one.” — [screenshot](../../runs/sched-20261107-1915-aisha-first-open-decide/shots/043-click.jpg) · [marked](../../runs/sched-20261107-1915-aisha-first-open-decide/shots/043-click-som.jpg)
- **Suggested improvement (hypothesis):** Shorten or explain this sign-up step (/start/communities); ask only what is needed now and let the rest wait until it is useful. Personas said they wanted: “fewer steps before the account, and make clear that picking here is just 'interested', not claiming membership”.

### 9. No reason to stay on / — “Campus event Berkeley Career Engagement ”

- **Type** No reason to stay · **severity** max 2, median 2 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: first-open-decide · fingerprint `b72bcf16403c`
- aisha-firstgen-anxious (step 53, sev 2): “I'm in! But the first 'For you' thing is career fairs — I picked clubs and meeting people, not résumé stuff. Hopefully the Clubs and Meetups tiles are where my people are.” — [screenshot](../../runs/sched-20261107-1915-aisha-first-open-decide/shots/053-click.jpg) · [marked](../../runs/sched-20261107-1915-aisha-first-open-decide/shots/053-click-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “'For you' should start with the communities/social things I picked during sign-up”.

### 10. No reason to stay on /guest/explore/events — “학교 행사 오늘 · 오전 11시 UC Berkeley Emeriti As”

- **Type** No reason to stay · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: first-open-decide · fingerprint `2008ea54a771`
- minji-freshman-17 (step 3, sev 2): “음… 그냥 학교 행사 리스트네. 첫번째가 은퇴 교수 강연ㅋㅋ 나랑 상관없음. 사람은 가입해야 보인대” — [screenshot](../../runs/sched-20261107-1915-minji-first-open-decide/shots/003-click.jpg) · [marked](../../runs/sched-20261107-1915-minji-first-open-decide/shots/003-click-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /guest/explore/events: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “show me a peek of plans/people like lunch groups, even blurred”.

### 11. No reason to stay on /guest/explore/clubs — “Alpha Chi Omega ΑΧΩ · Panhellenic sorori”

- **Type** No reason to stay · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: first-open-decide · fingerprint `5c97e2699a4f`
- minji-freshman-17 (step 5, sev 2): “헐 frat sorority만… 이건 내 스타일 아님. '추천'이라면서 그냥 알파벳순?” — [screenshot](../../runs/sched-20261107-1915-minji-first-open-decide/shots/005-click.jpg) · [marked](../../runs/sched-20261107-1915-minji-first-open-decide/shots/005-click-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /guest/explore/clubs: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “recommend clubs for freshmen / international students first”.

### 12. Missing / empty content on /guest/explore/clubs — “팔로우”

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: first-open-decide · fingerprint `23685972f161`
- minji-freshman-17 (step 9, sev 2): “이게 다야? 아까 본 거랑 똑같은 한 줄. 몇 명 있는지라도 알려주지” — [screenshot](../../runs/sched-20261107-1915-minji-first-open-decide/shots/009-click.jpg) · [marked](../../runs/sched-20261107-1915-minji-first-open-decide/shots/009-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /guest/explore/clubs is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “show how many students / freshmen follow it or upcoming KSA events”.

### 13. Onboarding friction on /start/goals — “계속”

- **Type** Onboarding friction · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: first-open-decide · fingerprint `7f81788d3988`
- minji-freshman-17 (step 13, sev 2): “1/6?? 6단계나… 아 귀찮아. 그래도 목표 고르는 건 쉬우니까” — [screenshot](../../runs/sched-20261107-1915-minji-first-open-decide/shots/013-click.jpg) · [marked](../../runs/sched-20261107-1915-minji-first-open-decide/shots/013-click-som.jpg)
- **Suggested improvement (hypothesis):** Shorten or explain this sign-up step (/start/goals); ask only what is needed now and let the rest wait until it is useful. Personas said they wanted: “tell me upfront how long, or email first”.

### 14. Confusing UI on /start/communities — “기숙사”

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: first-open-decide · fingerprint `2049e44e7166`
- minji-freshman-17 (step 26, sev 2): “뭐지? 그냥 '기숙사' 체크만 됨. 내 기숙사는 어디서 고르는 거야?” — [screenshot](../../runs/sched-20261107-1915-minji-first-open-decide/shots/026-click.jpg) · [marked](../../runs/sched-20261107-1915-minji-first-open-decide/shots/026-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “기숙사” on /start/communities does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “after tapping 기숙사, show the dorm list so I pick mine”.

### 15. No reason to stay on / — “소셜”

- **Type** No reason to stay · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: first-open-decide · fingerprint `934acb5cdeb3`
- minji-freshman-17 (step 36, sev 2): “가입은 됐는데… '새 사람 만나기' 골랐는데 또 행사 리스트네. 점심 모임은 소셜 탭 가야 하나 봐” — [screenshot](../../runs/sched-20261107-1915-minji-first-open-decide/shots/036-click.jpg) · [marked](../../runs/sched-20261107-1915-minji-first-open-decide/shots/036-click-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “since I picked 'meet new people', open on lunch plans / people in my year”.

### 16. Confusing UI on /guest/explore/events — “행사 검색”

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: first-open-decide · fingerprint `54170e674d7d`
- seoyeon-exchange-korean (step 5, sev 2): “어... SFO 검색했는데 요가? 왜 이게 나오지? 공항이랑 상관없는데.” — [screenshot](../../runs/sched-20261107-1915-seoyeon-first-open-decide/shots/005-type.jpg) · [marked](../../runs/sched-20261107-1915-seoyeon-first-open-decide/shots/005-type-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “행사 검색” on /guest/explore/events does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “if nothing matches, say 'no results' instead of random events”.

### 17. No reason to stay on /guest/explore/clubs — “팔로우”

- **Type** No reason to stay · **severity** max 2, median 2 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: first-open-decide · fingerprint `b29e1c7c6485`
- seoyeon-exchange-korean (step 11, sev 2): “설명 한 줄이랑 팔로우 버튼만... 사람이 있는지, 공항 가는 사람이 있는지 모르겠어요. 아무것도 안 보여서 가입해야 알 수 있나봐요.” — [screenshot](../../runs/sched-20261107-1915-seoyeon-first-open-decide/shots/011-click.jpg) · [marked](../../runs/sched-20261107-1915-seoyeon-first-open-decide/shots/011-click-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /guest/explore/clubs: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “show a peek of what's inside (how many students, recent plans) so I know it's worth signing up”.

### 18. Confusing UI on /guest/explore/clubs — “No results”

- **Type** Confusing UI · **severity** max 1, median 1 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: first-open-decide · fingerprint `c1d73ff77b3c`
- aisha-firstgen-anxious (step 16, sev 1): “No results?? Oh — probably because 'health' is still in the search box. It would help if it said that. I'll close this and clear the search.” — [screenshot](../../runs/sched-20261107-1915-aisha-first-open-decide/shots/016-click.jpg) · [marked](../../runs/sched-20261107-1915-aisha-first-open-decide/shots/016-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “No results” on /guest/explore/clubs does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “say 'No results for "health" in Student Clubs — clear search?'”.

### 19. No reason to stay on /welcome

- **Type** No reason to stay · **severity** max 1, median 1 · **1 persona(s)**: jordan-sophomore-impatient · scenarios: first-open-decide · fingerprint `b275c9c6f849`
- jordan-sophomore-impatient (step 0, sev 1): “'your college life all in one place'. every app says that. ok and? not signing up blind” — [screenshot](../../runs/sched-20261107-1915-jordan-first-open-decide/shots/000-start.jpg) · [marked](../../runs/sched-20261107-1915-jordan-first-open-decide/shots/000-start-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /welcome: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “show me something real happening on campus right on the first screen”.

### 20. Confusing UI on /guest/explore/events — “Campus event Today · 11 AM UC Berkeley E”

- **Type** Confusing UI · **severity** max 1, median 1 · **1 persona(s)**: jordan-sophomore-impatient · scenarios: first-open-decide · fingerprint `5eec1dd9082d`
- jordan-sophomore-impatient (step 2, sev 1): “ok it's a feed. first thing 'recommended' to me is a retired professors speaker series?? lol. game night is kinda fun tho” — [screenshot](../../runs/sched-20261107-1915-jordan-first-open-decide/shots/002-click.jpg) · [marked](../../runs/sched-20261107-1915-jordan-first-open-decide/shots/002-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Campus event Today · 11 AM UC Berkeley E” on /guest/explore/events does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “recommended should be stuff for students, not emeriti talks”.

### 21. Unclear wording on /start/university — “학부생”

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: first-open-decide · fingerprint `7e179d753fdd`
- seoyeon-exchange-korean (step 25, sev 1): “저는 교환학생인데 '교환학생' 선택이 없네요. 그냥 학부생 할게요. 학년은 선택이라 건너뛰어요.” — [screenshot](../../runs/sched-20261107-1915-seoyeon-first-open-decide/shots/025-observe.jpg) · [marked](../../runs/sched-20261107-1915-seoyeon-first-open-decide/shots/025-observe-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “학부생” on /start/university in plain language (and check the Korean UI). Personas said they wanted: “an 'exchange / visiting student' option”.

## Automatic checks (harness)

| screen | device | tap targets < 44px (max) | sideways overflow | broken images |
|---|---|---|---|---|
| `/start/communities` | phone | 13 — e.g. Back 40×40, Skip 54×40, Student Clubs 123×36 | — | — |
| `/guest/explore/events` | phone | 9 — e.g. Back 40×40, Search events 295×23, Filters 87×36 | — | — |
| `/start/university` | phone | 9 — e.g. Back 40×40, Search universities 287×23, Undergraduate 130×36 | — | — |
| `/guest/explore/clubs` | phone | 8 — e.g. Back 40×40, Search clubs 295×23, Filters 87×36 | — | — |
| `/` | phone | 7 — e.g. Search 40×40, Notifications 40×40, Messages 40×40 | — | — |
| `/welcome` | phone | 5 — e.g. English 44×20, Sign In 80×40, Look around first 136×36 | — | — |
| `/start/what` | phone | 5 — e.g. Back 40×40 | — | — |
| `/start/about` | phone | 4 — e.g. Back 40×40, Use your student ID 121×18, Terms 33×15 | — | — |
| `/start/discover` | phone | 2 — e.g. Back 40×40, Skip 54×40 | — | — |
| `/start/goals` | phone | 1 — e.g. Back 40×40 | — | — |
