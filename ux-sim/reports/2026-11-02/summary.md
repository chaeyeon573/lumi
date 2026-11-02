# ux-sim summary — 2026-11-02

> **AI simulation — hypotheses, not measured user behaviour.** AI personas drove a real browser. Counts are simulated personas, never rates; every risk below is a hypothesis to check with real students.

## Curated problems (analysis.json)

_Written by orchestrating Claude session (harness-improvement pass, https://claude.ai/code/session_01Fy5mmf17fdkKuHwrxbkNpM) — curated from the pilot's findings.json and run reports. Heuristic clusters are below._

| sev | problem | personas | env-limited | fingerprints |
|---|---|---|---|---|
| 4 | **A brand-new account finds nobody to meet and is pushed to create plans itself** — Sample profiles are (correctly) hidden from real accounts, and there is no fallback content for an empty campus: no public campus events, no 'people who also wa | 2 | no | `835a3b1ce765` `67ca16898d6c` `05ee6a888ab7` `0ba11b71e564` |
| 3 | **The first screen looks like a dating app: one big face photo and an "I'm in" button** — The signed-in home is a single swipe card centred on a person (photo, name, age) rather than on the plan; the plan title is secondary text. Nothing on the scree | 6 | no | `0ad866e92107` `b4fb9cc452bd` `518c68aff2a6` |
| 3 | **Shared demo account shows someone else's timetable, major, saved items and tags own posts 'Sample'** — The pilot signed signed-in scenarios into the shared sample account (auth: demo). | 3 | yes | `42a356712fc4` `05a4cd303317` `16221f83094a` `95e8f1e4f9d1` `19b334efe1e1` `678d90435f16` |
| 3 | **Sign-up asks nine personal questions (hobbies, birth year) before showing anything** — The quiz front-loads recommendation inputs; the value (people, plans) is shown only after the last step, and visibility of each answer is not stated. | 2 | no | `97dda824b2fb` `94527b529e80` `e2f05b7465c0` |
| 3 | **After "I'm in" it is unclear what you joined and where its chat is** — The button names an attitude, not an action on a thing; the success toast points to a chat that is not on screen and has no direct link. | 1 | no | `7550a9defad6` `6a00d05d782f` |
| 3 | **"Instant meetup" opens a full event form** — Instant meetup reuses the generic create-activity form with every field visible. | 1 | no | `19ddc8a230f0` |
| 3 | **Tapping a club in the list did nothing visible** — Either the card's tap handler did not navigate, or the tap landed on a nested control (save/bookmark) inside the card that changed state without feedback — the  | 1 | no | `629b9d57dee9` |
| 3 | **Club pages don't say plainly whether and how you can join** — Recruiting status, join policy and the empty-state copy are written for club officers, not for prospective members. | 1 | no | `7a02ada3f324` `f8d64b1d499a` `919841c6195c` `52228e162ff2` `046dd034f3ea` |
| 3 | **Internship list looked thin and the Bay Area filter returned nothing** — Local stack has only the CSV deadline calendar (no worker-fetched Greenhouse/Lever/Ashby internships), many without a location. | 1 | yes | `3cd806167637` `c4d7ce393786` |
| 2 | **The floating Design/Feedback pills cover real buttons** — Fixed-position pills without reserved space at the bottom of screens that end with a button. | 2 | no | `804158f27f39` `39327c8d79c3` |
| 2 | **Career content is hard to find and 'Campus' / back navigation mislead** — Opportunities live under Campus → Browse → Internships with no entry point named for careers; Back pops the section instead of the filter. | 1 | no | `b9d1ee526d80` `c95418137653` `47e37bf98fc5` |
| 2 | **On a laptop the app is a phone-width column floating in black** — The web app renders the mobile shell at all widths. | 1 | no | `4d28c4b04f0f` |
| 2 | **There is no way to search clubs by interest or major** — The club list is browse-only (category chips + recommendations); recommendations used the demo account's CS major. | 1 | no | `70dba2bfe887` |
| 2 | **Korean is hard to find and parts of the app stay in English** — Language lives in Settings only; the Rides screens are missing translations. | 1 | no | `3767af082cbb` `54cd78cb05b4` `b0c7ae9a3276` |
| 1 | **Welcome screen advertises '0 free food events this week'** — The highlight card renders even when the count is zero; locally there are no worker-fetched events. | 2 | yes | `2535ac3580a9` |

8 run(s) · 45 finding(s) (2 seen by ≥ 2 personas, 42 single events) · max severity **4** · severity 1/2/3/4: 10 / 28 / 11 / 2 · 0 environment-limited event(s) kept out of findings.

_These clusters are mechanical (screen + type + element). The curated problem list is `analysis.json` next to this file, written by the orchestrating session — see docs/ux-sim/ORCHESTRATE.md._

## Runs

| persona | scenario | auth | outcome | goal check | actions | friction (max sev) | drop-off risk (hypothesis) | report |
|---|---|---|---|---|---|---|---|---|
| aisha-firstgen-anxious | find-a-club | demo | success | met (16 actions) | 18 | 11 (3) | high — The app first showed me a stranger's face and fraternity rush, picked clubs for a 'Computer Science' major I'm not, a club tap did nothing,  | [report](../../runs/baseline-aisha-find-a-club/report.md) |
| diego-transfer-commuter | lunch-today | demo | abandoned | met (2 actions) | 6 | 5 (4) | high — Opened it between classes for lunch today; got a face card for tomorrow's coffee, an all-tomorrow list, an empty hangouts section and a long | [report](../../runs/baseline-diego-lunch-today/report.md) |
| marcus-senior-lowtech | first-open-decide | none | abandoned | not met | 4 | 3 (3) | high — Never saw any internship content before being walked through personal-taste questions; front page pitches lunch buddies and shows '0 free fo | [report](../../runs/baseline-marcus-first-open-decide/report.md) |
| minji-freshman-17 | cold-start-hangout | none | abandoned | not met | 27 | 8 (4) | high — The promise on the welcome screen ('Find someone for lunch') was what got her through a 9-step quiz; the payoff was three empty screens and  | [report](../../runs/baseline-minji-cold-start-hangout/report.md) |
| minji-freshman-17 | timetable-add-classes | demo | success | met (5 actions) | 5 | 3 (2) | medium — Adding the class was fast and the privacy line reassured her, but the first screen felt like a dating app (big face, age) and her timetable  | [report](../../runs/baseline-minji-timetable-add-classes/report.md) |
| priya-phd-desktop | internship-near-berkeley | demo | abandoned | not met | 7 | 7 (3) | high — First screen is a dating-style swipe card in a phone column on my laptop; the career content is hidden and thin, and the location filter is  | [report](../../runs/baseline-priya-internship-near-berkeley/report.md) |
| seoyeon-exchange-korean | ride-sfo-thanksgiving | demo | success | met (8 actions) | 16 | 10 (3) | medium — Korean switch and the Thanksgiving airport banner made posting easy, but the Rides screens fall back to English, every visible ride is fake, | [report](../../runs/baseline-seoyeon-ride-sfo-thanksgiving/report.md) |
| minji-freshman-17 | lunch-today | demo | success | met (1 actions) | 5 | 4 (3) | medium — Harness heuristic, not a measurement: 1 severity≥3 event(s), objective frustration 0.50/4.5, 2 confused note(s). | [report](../../runs/smoke-minji-lunch-today/report.md) |

## Findings

_Clustered by screen + friction type + key element. Sorted by number of personas, then severity._

### 1. Confusing UI on / — “I'm in”

- **Type** Confusing UI · **severity** max 3, median 2 · **5 persona(s)**: aisha-firstgen-anxious, diego-transfer-commuter, priya-phd-desktop, seoyeon-exchange-korean, minji-freshman-17 · scenarios: find-a-club, lunch-today, internship-near-berkeley, ride-sfo-thanksgiving · fingerprint `0ad866e92107`
- aisha-firstgen-anxious (step 0, sev 2): “Wait, the first thing I see is a big photo of a stranger named Maya and an 'I'm in' button. I came to find a club… is this a dating thing? I don't want to accidentally tap 'I'm in' and sign up for coffee with someone I don't know.” — [screenshot](../../runs/baseline-aisha-find-a-club/shots/000-start.jpg) · [marked](../../runs/baseline-aisha-find-a-club/shots/000-start-som.jpg)
- diego-transfer-commuter (step 0, sev 2): “OK, a big face photo first thing. Coffee tomorrow at 6 isn't lunch today. Is this a dating thing or a plans thing? I just want lunch people.” — [screenshot](../../runs/baseline-diego-lunch-today/shots/000-start.jpg) · [marked](../../runs/baseline-diego-lunch-today/shots/000-start-som.jpg)
- priya-phd-desktop (step 0, sev 2): “I'm on a 1440px laptop and I get a phone-width column with a giant face photo and an 'I'm in' button. Is this a dating app? I came for internships.” — [screenshot](../../runs/baseline-priya-internship-near-berkeley/shots/000-start.jpg) · [marked](../../runs/baseline-priya-internship-near-berkeley/shots/000-start-som.jpg)
- seoyeon-exchange-korean (step 0, sev 2): “어... 큰 얼굴 사진? 데이트 앱인가? 공항 가는 차 찾으려고 왔는데 커피 약속이 나와요. 영어만 있고... 한국어 설정 어디 있지?” — [screenshot](../../runs/baseline-seoyeon-ride-sfo-thanksgiving/shots/000-start.jpg) · [marked](../../runs/baseline-seoyeon-ride-sfo-thanksgiving/shots/000-start-som.jpg)
- … 1 more
- **Suggested improvement (hypothesis):** Make it obvious what “I'm in” on / does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “Tell me what this home screen is for, and that 'I'm in' joins a coffee meetup, not something public”; “show me what's happening today, not one person's face”; “A desktop layout and a home screen that tells me what this app is for, not a swipe card”; “첫 화면에 '무엇을 찾나요?' 같은 선택이나 라이드 쉐어 바로가기”; “say what I'm joining, like 'Join coffee'”.

### 2. Missing / empty content on /welcome

- **Type** Missing / empty content · **severity** max 1, median 1 · **2 persona(s)**: marcus-senior-lowtech, minji-freshman-17 · scenarios: first-open-decide, cold-start-hangout · fingerprint `2535ac3580a9`
- marcus-senior-lowtech (step 0, sev 1): “0 free food events this week. Why show me a zero? Makes it look like nobody uses it.” — [screenshot](../../runs/baseline-marcus-first-open-decide/shots/000-start.jpg) · [marked](../../runs/baseline-marcus-first-open-decide/shots/000-start-som.jpg)
- minji-freshman-17 (step 0, sev 1): “오 'Find someone for lunch' — 딱 내가 원하는 거. but '0 free food events' 좀 썰렁하고, 'Closes today' 인데 Nov 1? 뭐지. 한국어 옵션은 안 보임.” — [screenshot](../../runs/baseline-minji-cold-start-hangout/shots/000-start.jpg) · [marked](../../runs/baseline-minji-cold-start-hangout/shots/000-start-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /welcome is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “hide the free-food card when it's 0, not advertise emptiness”.

### 3. Onboarding friction on /create/activity — “Open now”

- **Type** Onboarding friction · **severity** max 4, median 4 · **1 persona(s)**: diego-transfer-commuter · scenarios: lunch-today · fingerprint `19ddc8a230f0`
- diego-transfer-commuter (step 12, sev 4): “'Instant'? This is a whole event form. Title, description, color, capacity... and it says 11 PM? I want lunch in 20 minutes. I don't have time for this, and nobody's even on here to see it.” — [screenshot](../../runs/baseline-diego-lunch-today/shots/012-click.jpg) · [marked](../../runs/baseline-diego-lunch-today/shots/012-click-som.jpg)
- **Suggested improvement (hypothesis):** Shorten or explain this sign-up step (/create/activity); ask only what is needed now and let the rest wait until it is useful. Personas said they wanted: “one tap: 'Lunch now near me' with time and place prefilled, and show me who sees it”.

### 4. Missing / empty content on /discover?tab=activities — “Create activity”

- **Type** Missing / empty content · **severity** max 4, median 4 · **1 persona(s)**: minji-freshman-17 · scenarios: cold-start-hangout · fingerprint `835a3b1ce765`
- minji-freshman-17 (step 43, sev 4): “역시 없음. 내가 만들라고? 17살 신입이 모르는 사람들한테 먼저 밥 먹자고 하는 거 너무 어색해. 그만할래” — [screenshot](../../runs/baseline-minji-cold-start-hangout/shots/043-click.jpg) · [marked](../../runs/baseline-minji-cold-start-hangout/shots/043-click-som.jpg)
- ⚠ environment caveat: Local stack has only CSV opportunities; live also has worker-fetched internships, hackathons and campus events — check on live before acting.
- **Suggested improvement (hypothesis):** Check whether the data on /discover?tab=activities is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “at least one real plan from someone in my dorm/class I could say 'I'm in' to”.

### 5. Bug on /community?tab=opportunities — “🏃 Berkeley Running Club Casual and comp”

- **Type** Bug · **severity** max 3, median 3 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `629b9d57dee9`
- aisha-firstgen-anxious (step 23, sev 3): “Wait, did that do something? Nothing opened. Did I just join it by accident?? There's no message either way. That's exactly what makes me nervous.” — [screenshot](../../runs/baseline-aisha-find-a-club/shots/023-wait.jpg) · [marked](../../runs/baseline-aisha-find-a-club/shots/023-wait-som.jpg)
- **Suggested improvement (hypothesis):** Reproduce from the evidence steps on /community?tab=opportunities (around “🏃 Berkeley Running Club Casual and comp”) and fix it; add a regression check for that screen. Personas said they wanted: “Tapping a club should open its page, or at least show something happened”.

### 6. Unclear wording on /orgs/:id?tab=recruit — “Recruiting”

- **Type** Unclear wording · **severity** max 3, median 3 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `7a02ada3f324`
- aisha-firstgen-anxious (step 28, sev 3): “Wait, so they're not recruiting… but I can ask to join? Does that mean I'm too late for this year? Or that it's open anyway? I really don't want to send a request to a club that's closed and look dumb.” — [screenshot](../../runs/baseline-aisha-find-a-club/shots/028-click.jpg) · [marked](../../runs/baseline-aisha-find-a-club/shots/028-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “Recruiting” on /orgs/:id?tab=recruit in plain language (and check the Korean UI). Personas said they wanted: “Explain what 'not recruiting' means for a casual running club — can I still just come to a group run?”.

### 7. Missing / empty content on /discover — “Instant meetup”

- **Type** Missing / empty content · **severity** max 3, median 3 · **1 persona(s)**: diego-transfer-commuter · scenarios: lunch-today · fingerprint `0ba11b71e564`
- diego-transfer-commuter (step 10, sev 3): “Empty. And '7 friends'? I don't have friends on here, those are sample people. Nobody's actually around. Fine, Instant meetup is right there, I'll give it one shot.” — [screenshot](../../runs/baseline-diego-lunch-today/shots/010-scroll.jpg) · [marked](../../runs/baseline-diego-lunch-today/shots/010-scroll-som.jpg)
- ⚠ environment caveat: Local stack has only CSV opportunities; live also has worker-fetched internships, hackathons and campus events — check on live before acting.
- **Suggested improvement (hypothesis):** Check whether the data on /discover is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “real people free for lunch near me today, or at least other transfers”.

### 8. Trust / privacy worry on /start — “Next”

- **Type** Trust / privacy worry · **severity** max 3, median 3 · **1 persona(s)**: marcus-senior-lowtech · scenarios: first-open-decide · fingerprint `94527b529e80`
- marcus-senior-lowtech (step 9, sev 3): “Your perfect free afternoon? Long walks? This is a dating profile question. I said I want an internship, why does it need my hobbies? And I can't skip it, Next is grayed out.” — [screenshot](../../runs/baseline-marcus-first-open-decide/shots/009-click.jpg) · [marked](../../runs/baseline-marcus-first-open-decide/shots/009-click-som.jpg)
- **Suggested improvement (hypothesis):** Explain who will see what when tapping “Next” on /start before asking for it. Personas said they wanted: “Let me skip this, or tell me why you need it for internships”.

### 9. Missing / empty content on / — “Invite friends”

- **Type** Missing / empty content · **severity** max 3, median 3 · **1 persona(s)**: minji-freshman-17 · scenarios: cold-start-hangout · fingerprint `67ca16898d6c`
- minji-freshman-17 (step 37, sev 3): “헐 아무도 없어. 9단계 다 했는데 빈 화면... 초대할 친구가 없어서 이 앱 깐 건데” — [screenshot](../../runs/baseline-minji-cold-start-hangout/shots/037-click.jpg) · [marked](../../runs/baseline-minji-cold-start-hangout/shots/037-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on / is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “show plans or anyone at all, not ask me to bring friends I don't have”.

### 10. No reason to stay on /discover?tab=activities — “💡 ARC Prize 2026 D-1”

- **Type** No reason to stay · **severity** max 3, median 3 · **1 persona(s)**: minji-freshman-17 · scenarios: cold-start-hangout · fingerprint `05ee6a888ab7`
- minji-freshman-17 (step 41, sev 3): “해커톤...? 난 밥 같이 먹을 사람 찾는 건데. 'Food & café' 하나만 더 눌러보고 없으면 끝” — [screenshot](../../runs/baseline-minji-cold-start-hangout/shots/041-click.jpg) · [marked](../../runs/baseline-minji-cold-start-hangout/shots/041-click-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /discover?tab=activities: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “show casual plans from real students (lunch, café) first, not competitions”.

### 11. Missing / empty content on /community?tab=opportunities — “Software 0”

- **Type** Missing / empty content · **severity** max 3, median 3 · **1 persona(s)**: priya-phd-desktop · scenarios: internship-near-berkeley · fingerprint `3cd806167637`
- priya-phd-desktop (step 9, sev 3): “Eight listings, zero software, zero research — for an EECS PhD at Berkeley. And why is a Bundestag exchange the top 'internship'? It's tagged Scholarships.” — [screenshot](../../runs/baseline-priya-internship-near-berkeley/shots/009-click.jpg) · [marked](../../runs/baseline-priya-internship-near-berkeley/shots/009-click-som.jpg)
- ⚠ environment caveat: Local stack has only CSV opportunities; live also has worker-fetched internships, hackathons and campus events — check on live before acting.
- **Suggested improvement (hypothesis):** Check whether the data on /community?tab=opportunities is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “Real software/research internships, and category filters that match what's in the list”.

### 12. Bug on /community?tab=opportunities — “Location”

- **Type** Bug · **severity** max 3, median 3 · **1 persona(s)**: priya-phd-desktop · scenarios: internship-near-berkeley · fingerprint `c4d7ce393786`
- priya-phd-desktop (step 14, sev 3): “Zero in the Bay Area? Stripe is literally in SF. Either the filter is broken or nothing has a location. Either way I can't trust it.” — [screenshot](../../runs/baseline-priya-internship-near-berkeley/shots/014-select.jpg) · [marked](../../runs/baseline-priya-internship-near-berkeley/shots/014-select-som.jpg)
- **Suggested improvement (hypothesis):** Reproduce from the evidence steps on /community?tab=opportunities (around “Location”) and fix it; add a regression check for that screen. Personas said they wanted: “Listings tagged with real locations so the Bay Area filter actually returns Bay Area roles”.

### 13. Bug on /rides/:id

- **Type** Bug · **severity** max 3, median 3 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: ride-sfo-thanksgiving · fingerprint `22e5ff1db700`
- seoyeon-exchange-korean (step 29, sev 3): “어?! 메모 쓰고 있었는데 'Post ride' 안 눌렀는데 벌써 올라갔어요. 그리고 제 메모(비행기 11시, 짐 하나)가 화면에 안 보여요. 저장 안 된 건가?” — [screenshot](../../runs/baseline-seoyeon-ride-sfo-thanksgiving/shots/029-type.jpg) · [marked](../../runs/baseline-seoyeon-ride-sfo-thanksgiving/shots/029-type-som.jpg)
- **Suggested improvement (hypothesis):** Reproduce from the evidence steps on /rides/:id and fix it; add a regression check for that screen. Personas said they wanted: “메모 입력 중에는 제출되지 않고, 'Post ride'를 눌러야 올라가게”.

### 14. Bug on /rides/:id — “You Host”

- **Type** Bug · **severity** max 3, median 3 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: ride-sfo-thanksgiving · fingerprint `95e8f1e4f9d1`
- seoyeon-exchange-korean (step 29, sev 3): “그리고 내 라이드인데 '예시'랑 'Sample ride — made up to show how rides work'라고 써 있어요. 내 게 진짜로 올라간 거 맞아요? 다른 사람들도 가짜라고 생각할 것 같아요.” — [screenshot](../../runs/baseline-seoyeon-ride-sfo-thanksgiving/shots/029-type.jpg) · [marked](../../runs/baseline-seoyeon-ride-sfo-thanksgiving/shots/029-type-som.jpg)
- **Suggested improvement (hypothesis):** Reproduce from the evidence steps on /rides/:id (around “You Host”) and fix it; add a regression check for that screen. Personas said they wanted: “내가 올린 라이드에는 '예시/Sample' 표시가 없어야 함”.

### 15. Onboarding friction on /start

- **Type** Onboarding friction · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: cold-start-hangout · fingerprint `97dda824b2fb`
- minji-freshman-17 (step 2, sev 2): “학교 고르기 ok, 근데 1/9?? 9단계나... 아 귀찮아” — [screenshot](../../runs/baseline-minji-cold-start-hangout/shots/002-click.jpg) · [marked](../../runs/baseline-minji-cold-start-hangout/shots/002-click-som.jpg)
- minji-freshman-17 (step 12, sev 2): “4/9... 성격 테스트야 뭐야. 친구 찾으려고 왔는데 아직 아무 사람도 못 봄” — [screenshot](../../runs/baseline-minji-cold-start-hangout/shots/012-click.jpg) · [marked](../../runs/baseline-minji-cold-start-hangout/shots/012-click-som.jpg)
- **Suggested improvement (hypothesis):** Shorten or explain this sign-up step (/start); ask only what is needed now and let the rest wait until it is useful. Personas said they wanted: “fewer steps before I see anything”; “show me people/plans before the personality quiz”.

### 16. No reason to stay on /discover?tab=activities — “🌸 Kappa Delta Chi fall formal recruitme”

- **Type** No reason to stay · **severity** max 2, median 2 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `046dd034f3ea`
- aisha-firstgen-anxious (step 6, sev 2): “Fraternity rush, sorority 'formal recruitment', and below it 'fall recruiting' for the indie music club… Wait, does that mean every club makes you try out or apply? That's exactly what I was scared of. And 'Go together' with 'Maya going' — would that message Maya?” — [screenshot](../../runs/baseline-aisha-find-a-club/shots/006-scroll.jpg) · [marked](../../runs/baseline-aisha-find-a-club/shots/006-scroll-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /discover?tab=activities: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “Show me clubs that are open to anyone, and say clearly which ones need an application”.

### 17. Trust / privacy worry on /community?tab=opportunities — “💻 Codebase Software consulting club shi”

- **Type** Trust / privacy worry · **severity** max 2, median 2 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `05a4cd303317`
- aisha-firstgen-anxious (step 15, sev 2): “Okay, a club list, good. But wait — 'Fits your major (Computer Science)'? I'm Public Health. Where did it get that? And the 'For you' picks are all fraternities and résumé clubs. That's literally the opposite of what I want.” — [screenshot](../../runs/baseline-aisha-find-a-club/shots/015-click.jpg) · [marked](../../runs/baseline-aisha-find-a-club/shots/015-click-som.jpg)
- **Suggested improvement (hypothesis):** Explain who will see what when tapping “💻 Codebase Software consulting club shi” on /community?tab=opportunities before asking for it. Personas said they wanted: “Use my real major, or ask me what I'm into, instead of guessing wrong”.

### 18. Hard to find on /community?tab=opportunities — “🏃 Berkeley Running Club Casual and comp”

- **Type** Hard to find · **severity** max 2, median 2 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `70dba2bfe887`
- aisha-firstgen-anxious (step 20, sev 2): “Nothing for Public Health or health equity, which is what I'd have searched for if there was a search box. But 'Berkeley Running Club — casual runners, group runs from Sather Gate' sounds low-pressure. 'Casual' is the word I needed. Let me just open it — I hope tapping the row only opens the page and doesn't join me.” — [screenshot](../../runs/baseline-aisha-find-a-club/shots/020-scroll.jpg) · [marked](../../runs/baseline-aisha-find-a-club/shots/020-scroll-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“🏃 Berkeley Running Club Casual and comp”) where they looked (/community?tab=opportunities); label icon-only controls. Personas said they wanted: “A search box or interest filter (like health, volunteering, beginner-friendly / no application) instead of scrolling 39 clubs”.

### 19. Confusing UI on /orgs/:id — “Ask to join”

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `f8d64b1d499a`
- aisha-firstgen-anxious (step 26, sev 2): “Oh good, this is the page. Group runs Tue/Thu at 5pm — that sounds like I could just show up? But then why is it 'Ask to join'… does that mean I have to apply? Would it message someone? And 'Unverified' — is this even the real club?” — [screenshot](../../runs/baseline-aisha-find-a-club/shots/026-tap.jpg) · [marked](../../runs/baseline-aisha-find-a-club/shots/026-tap-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Ask to join” on /orgs/:id does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “Say plainly: 'Open to everyone — just show up to a group run' or 'Requires application', and what 'Ask to join' sends and to whom”.

### 20. Missing / empty content on /orgs/:id?tab=events — “Events”

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `919841c6195c`
- aisha-firstgen-anxious (step 30, sev 2): “No events, but they run twice a week? And 'events you post' — I'm not in charge of this club, why is it talking to me like I am? Members says 3 on Lumi… it feels kind of empty.” — [screenshot](../../runs/baseline-aisha-find-a-club/shots/030-click.jpg) · [marked](../../runs/baseline-aisha-find-a-club/shots/030-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /orgs/:id?tab=events is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “Show the regular Tue/Thu group runs as events I can see, and who's going”.

### 21. Missing / empty content on /discover?tab=activities — “Join”

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: diego-transfer-commuter · scenarios: lunch-today · fingerprint `8b511219f08e`
- diego-transfer-commuter (step 4, sev 2): “Tomorrow, tomorrow, tomorrow. I need lunch TODAY. 'Hate eating alone' is literally me, but it's tomorrow.” — [screenshot](../../runs/baseline-diego-lunch-today/shots/004-click.jpg) · [marked](../../runs/baseline-diego-lunch-today/shots/004-click-som.jpg)
- ⚠ environment caveat: Local stack has only CSV opportunities; live also has worker-fetched internships, hackathons and campus events — check on live before acting.
- **Suggested improvement (hypothesis):** Check whether the data on /discover?tab=activities is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “a Today section first, or tell me nothing is on today and let me start one”.

### 22. Confusing UI on /create/activity

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: diego-transfer-commuter · scenarios: lunch-today · fingerprint `7608eb4350f5`
- diego-transfer-commuter (step 12, sev 2): “Why's the start 11:00 PM on 11/01? It's lunchtime. Is this even today's date?” — [screenshot](../../runs/baseline-diego-lunch-today/shots/012-click.jpg) · [marked](../../runs/baseline-diego-lunch-today/shots/012-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what the main control on /create/activity does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “prefill the next half hour, today”.

### 23. Confusing UI on /welcome

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: marcus-senior-lowtech · scenarios: first-open-decide · fingerprint `518c68aff2a6`
- marcus-senior-lowtech (step 0, sev 2): “Who's free on campus right now? Find someone for lunch? Pink and black... this looks more like a hangout or dating thing than an internship app. I saw '4 internships' scroll by in that yellow strip, that's all.” — [screenshot](../../runs/baseline-marcus-first-open-decide/shots/000-start.jpg) · [marked](../../runs/baseline-marcus-first-open-decide/shots/000-start-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what the main control on /welcome does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “Tell me plainly what this app is for before asking me to get in”.

### 24. Trust / privacy worry on /start — “2005”

- **Type** Trust / privacy worry · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: cold-start-hangout · fingerprint `e2f05b7465c0`
- minji-freshman-17 (step 25, sev 2): “birth year 왜 필요해? 내가 17살인 거 다른 사람이 보면 좀... 누가 보는 건지 안 써있음” — [screenshot](../../runs/baseline-minji-cold-start-hangout/shots/025-click.jpg) · [marked](../../runs/baseline-minji-cold-start-hangout/shots/025-click-som.jpg)
- **Suggested improvement (hypothesis):** Explain who will see what when tapping “2005” on /start before asking for it. Personas said they wanted: “say who sees my age / why it's needed”.

### 25. Trust / privacy worry on / — “I'm in”

- **Type** Trust / privacy worry · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: timetable-add-classes · fingerprint `b4fb9cc452bd`
- minji-freshman-17 (step 0, sev 2): “헐 첫 화면이 큰 얼굴 사진에 'Maya 24'... 데이팅앱이야? 나 시간표 넣으러 온 건데 어디서 하지” — [screenshot](../../runs/baseline-minji-timetable-add-classes/shots/000-start.jpg) · [marked](../../runs/baseline-minji-timetable-add-classes/shots/000-start-som.jpg)
- **Suggested improvement (hypothesis):** Explain who will see what when tapping “I'm in” on / before asking for it. Personas said they wanted: “first screen should not feel like a dating app; show where my schedule goes”.

### 26. Confusing UI on /profile — “CS 186 Databases Soda 306”

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: timetable-add-classes · fingerprint `42a356712fc4`
- minji-freshman-17 (step 2, sev 2): “뭐지? 이거 내 시간표 아닌데... CS 169 Capstone? 나 1학년인데. 누구 시간표야” — [screenshot](../../runs/baseline-minji-timetable-add-classes/shots/002-click.jpg) · [marked](../../runs/baseline-minji-timetable-add-classes/shots/002-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “CS 186 Databases Soda 306” on /profile does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “start me with an empty timetable or tell me these are sample classes”.

### 27. Bug on /profile — “Edit timetable”

- **Type** Bug · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: timetable-add-classes · fingerprint `804158f27f39`
- minji-freshman-17 (step 2, sev 2): “아래 'Edit timetable' 버튼이 Design/Feedback 버튼에 가려져서 글자가 'timetable'만 보여” — [screenshot](../../runs/baseline-minji-timetable-add-classes/shots/002-click.jpg) · [marked](../../runs/baseline-minji-timetable-add-classes/shots/002-click-som.jpg)
- **Suggested improvement (hypothesis):** Reproduce from the evidence steps on /profile (around “Edit timetable”) and fix it; add a regression check for that screen. Personas said they wanted: “floating Design/Feedback pills should not cover the Edit timetable button”.

### 28. No reason to stay on /

- **Type** No reason to stay · **severity** max 2, median 2 · **1 persona(s)**: priya-phd-desktop · scenarios: internship-near-berkeley · fingerprint `4d28c4b04f0f`
- priya-phd-desktop (step 0, sev 2): “Phone layout floating in black on my laptop. Not a great sign, but I'll give it a minute.” — [screenshot](../../runs/baseline-priya-internship-near-berkeley/shots/000-start.jpg) · [marked](../../runs/baseline-priya-internship-near-berkeley/shots/000-start-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /: show real people or things happening now (or a clear next step) instead of empty or generic content.

### 29. Hard to find on /discover — “Discover”

- **Type** Hard to find · **severity** max 2, median 2 · **1 persona(s)**: priya-phd-desktop · scenarios: internship-near-berkeley · fingerprint `b9d1ee526d80`
- priya-phd-desktop (step 3, sev 2): “'Done with classes', Costco rides, spontaneous hangouts. This is an undergrad social app. Where would career stuff even live?” — [screenshot](../../runs/baseline-priya-internship-near-berkeley/shots/003-click.jpg) · [marked](../../runs/baseline-priya-internship-near-berkeley/shots/003-click-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“Discover”) where they looked (/discover); label icon-only controls. Personas said they wanted: “Discover should surface opportunities (internships, fellowships), not just hangouts”.

### 30. Unclear wording on /community — “Campus”

- **Type** Unclear wording · **severity** max 2, median 2 · **1 persona(s)**: priya-phd-desktop · scenarios: internship-near-berkeley · fingerprint `c95418137653`
- priya-phd-desktop (step 5, sev 2): “'Campus' is a gossip feed, not campus resources. Label is misleading. Maybe 'Browse' has the actual directory.” — [screenshot](../../runs/baseline-priya-internship-near-berkeley/shots/005-click.jpg) · [marked](../../runs/baseline-priya-internship-near-berkeley/shots/005-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “Campus” on /community in plain language (and check the Korean UI). Personas said they wanted: “Call it Feed/Community if it's a feed; put career resources somewhere labelled”.

### 31. Bug on /discover

- **Type** Bug · **severity** max 2, median 2 · **1 persona(s)**: priya-phd-desktop · scenarios: internship-near-berkeley · fingerprint `47e37bf98fc5`
- priya-phd-desktop (step 16, sev 2): “Back took me out of the whole section. Now I have to click through Campus, Browse, Internships again. Sloppy.” — [screenshot](../../runs/baseline-priya-internship-near-berkeley/shots/016-back.jpg) · [marked](../../runs/baseline-priya-internship-near-berkeley/shots/016-back-som.jpg)
- **Suggested improvement (hypothesis):** Reproduce from the evidence steps on /discover and fix it; add a regression check for that screen. Personas said they wanted: “Back should return to the previous filter state, not two sections ago”.

### 32. Unclear wording on /rides — “Post my ride”

- **Type** Unclear wording · **severity** max 2, median 2 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: ride-sfo-thanksgiving · fingerprint `3767af082cbb`
- seoyeon-exchange-korean (step 12, sev 2): “어... 한국어로 바꿨는데 여기는 다 영어예요. 'Thanksgiving break... Split a ride to the airport' 이건 알겠어요. 바로 내 상황! 근데 '±90 min'... 90분 앞뒤로 매칭해준다는 뜻인가?” — [screenshot](../../runs/baseline-seoyeon-ride-sfo-thanksgiving/shots/012-click.jpg) · [marked](../../runs/baseline-seoyeon-ride-sfo-thanksgiving/shots/012-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “Post my ride” on /rides in plain language (and check the Korean UI). Personas said they wanted: “라이드 화면도 한국어로”.

### 33. Trust / privacy worry on /rides — “🚕 Lily → SFO 예시Wed 9:30am · from Unit 2”

- **Type** Trust / privacy worry · **severity** max 2, median 2 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: ride-sfo-thanksgiving · fingerprint `19b334efe1e1`
- seoyeon-exchange-korean (step 15, sev 2): “오! 수요일 11월 25일, SFO 두 개 있어요. Lily 9:30am, 30달러씩. 근데 '예시'라고 써 있는데... 진짜 사람이 아니고 예시라는 건가요? 헷갈려요.” — [screenshot](../../runs/baseline-seoyeon-ride-sfo-thanksgiving/shots/015-click.jpg) · [marked](../../runs/baseline-seoyeon-ride-sfo-thanksgiving/shots/015-click-som.jpg)
- **Suggested improvement (hypothesis):** Explain who will see what when tapping “🚕 Lily → SFO 예시Wed 9:30am · from Unit 2” on /rides before asking for it. Personas said they wanted: “'예시'가 무슨 뜻인지 (샘플 게시물인지) 설명”.

### 34. Missing / empty content on /rides/:id — “Lily Host”

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: ride-sfo-thanksgiving · fingerprint `678d90435f16`
- seoyeon-exchange-korean (step 17, sev 2): “아... 'made up'? 가짜 예시였어요. 정보는 깔끔한데 진짜 사람이 아니면 같이 못 가요. 진짜 수요일 SFO 가는 사람은 아무도 없는 거네요. 그럼 내가 올려야겠어요.” — [screenshot](../../runs/baseline-seoyeon-ride-sfo-thanksgiving/shots/017-click.jpg) · [marked](../../runs/baseline-seoyeon-ride-sfo-thanksgiving/shots/017-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /rides/:id is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “진짜 학생 라이드, 아니면 처음부터 '예시'임을 목록에서 분명히”.

### 35. Confusing UI on / — “Joined · Leave”

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: lunch-today · fingerprint `7550a9defad6`
- minji-freshman-17 (step 2, sev 2): “뭐지… where is the group chat? and the button now says 'Joined · Leave' — if I tap it again do I leave??” — [screenshot](../../runs/smoke-minji-lunch-today/shots/002-click.jpg) · [marked](../../runs/smoke-minji-lunch-today/shots/002-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Joined · Leave” on / does before people tap it — plain-word label, visible result, or a one-line hint.

### 36. Hard to find on /chats?tab=activity — “Activities”

- **Type** Hard to find · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: lunch-today · fingerprint `6a00d05d782f`
- minji-freshman-17 (step 6, sev 2): “oh there it is, under Activities. took me a while” — [screenshot](../../runs/smoke-minji-lunch-today/shots/006-click.jpg) · [marked](../../runs/smoke-minji-lunch-today/shots/006-click-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“Activities”) where they looked (/chats?tab=activity); label icon-only controls.

### 37. Missing / empty content on /chats/:id

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: lunch-today · fingerprint `35bbfcd3c5af`
- minji-freshman-17 (step 8, sev 2): “ok I'm in the chat. but it's coffee tomorrow, not lunch today… nobody for lunch today?” — [screenshot](../../runs/smoke-minji-lunch-today/shots/008-click.jpg) · [marked](../../runs/smoke-minji-lunch-today/shots/008-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /chats/:id is really missing (or only missing in the test environment); avoid showing empty sections.

### 38. Bug on /community — “Campus”

- **Type** Bug · **severity** max 1, median 1 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `170d7ebbd91e`
- aisha-firstgen-anxious (step 9, sev 1): “Oh, this is like a feed. And I'm somehow at the bottom already? I don't see a title or anything. There's a club post from Cal Indie Collective though. Let me scroll up and see what's on top.” — [screenshot](../../runs/baseline-aisha-find-a-club/shots/009-click.jpg) · [marked](../../runs/baseline-aisha-find-a-club/shots/009-click-som.jpg)
- **Suggested improvement (hypothesis):** Reproduce from the evidence steps on /community (around “Campus”) and fix it; add a regression check for that screen. Personas said they wanted: “Open Campus at the top so I can see what the page is”.

### 39. Trust / privacy worry on /community?tab=opportunities — “D-5 Cal Alumni Leadership Scholarship Ca”

- **Type** Trust / privacy worry · **severity** max 1, median 1 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `16221f83094a`
- aisha-firstgen-anxious (step 13, sev 1): “There's a 'Clubs' button, okay good. But wait — 'Your saved'? I didn't save a scholarship or a lab. Did someone set this up for me? Weird, but I'll ignore it and tap Clubs.” — [screenshot](../../runs/baseline-aisha-find-a-club/shots/013-click.jpg) · [marked](../../runs/baseline-aisha-find-a-club/shots/013-click-som.jpg)
- **Suggested improvement (hypothesis):** Explain who will see what when tapping “D-5 Cal Alumni Leadership Scholarship Ca” on /community?tab=opportunities before asking for it. Personas said they wanted: “Don't show me saved things I never saved”.

### 40. Unclear wording on /community?tab=opportunities — “Clubs”

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `52228e162ff2`
- aisha-firstgen-anxious (step 17, sev 1): “Okay, that worked — though there are two buttons both called 'Clubs' right on top of each other, which threw me for a second. Still mostly consulting and VC stuff at the top. Let me scroll.” — [screenshot](../../runs/baseline-aisha-find-a-club/shots/017-click.jpg) · [marked](../../runs/baseline-aisha-find-a-club/shots/017-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “Clubs” on /community?tab=opportunities in plain language (and check the Korean UI). Personas said they wanted: “Call the second one something different, like 'Student clubs (not Greek)'”.

### 41. Unclear wording on /start

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: minji-freshman-17 · scenarios: cold-start-hangout · fingerprint `e53f5b5080fe`
- minji-freshman-17 (step 22, sev 1): “오 얼굴사진 대신 이모지! 이건 좋다, 데이팅앱 느낌 없음. 근데 'Freshman in Undeclared' 문장 좀 이상함ㅋ” — [screenshot](../../runs/baseline-minji-cold-start-hangout/shots/022-click.jpg) · [marked](../../runs/baseline-minji-cold-start-hangout/shots/022-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite the wording on /start in plain language (and check the Korean UI). Personas said they wanted: “say 'Undeclared freshman'”.

### 42. Hard to find on /settings — “한국어”

- **Type** Hard to find · **severity** max 1, median 1 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: ride-sfo-thanksgiving · fingerprint `b0c7ae9a3276`
- seoyeon-exchange-korean (step 6, sev 1): “한국어로 바뀌었어요! 이제 훨씬 편해요. 근데 언어 설정이 설정 안쪽 깊이 있어서 처음엔 몰랐을 거예요.” — [screenshot](../../runs/baseline-seoyeon-ride-sfo-thanksgiving/shots/006-click.jpg) · [marked](../../runs/baseline-seoyeon-ride-sfo-thanksgiving/shots/006-click-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“한국어”) where they looked (/settings); label icon-only controls. Personas said they wanted: “첫 화면이나 가입할 때 언어 선택”.

### 43. Unclear wording on /discover — “Rides 5 open · Costco Richmond, Trader J”

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: ride-sfo-thanksgiving · fingerprint `54cd78cb05b4`
- seoyeon-exchange-korean (step 10, sev 1): “Rides! 자동차 아이콘. 이거다! 근데 'Rides'만 영어로 남아 있네요. OAK는... 오클랜드 공항?” — [screenshot](../../runs/baseline-seoyeon-ride-sfo-thanksgiving/shots/010-click.jpg) · [marked](../../runs/baseline-seoyeon-ride-sfo-thanksgiving/shots/010-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “Rides 5 open · Costco Richmond, Trader J” on /discover in plain language (and check the Korean UI). Personas said they wanted: “'라이드/카풀'로 번역”.

### 44. Bug on /rides — “My rides”

- **Type** Bug · **severity** max 1, median 1 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: ride-sfo-thanksgiving · fingerprint `39327c8d79c3`
- seoyeon-exchange-korean (step 12, sev 1): “'My rides' 버튼 위에 'Design: Classic New' 같은 게 겹쳐서 가려져 있어요.” — [screenshot](../../runs/baseline-seoyeon-ride-sfo-thanksgiving/shots/012-click.jpg) · [marked](../../runs/baseline-seoyeon-ride-sfo-thanksgiving/shots/012-click-som.jpg)
- **Suggested improvement (hypothesis):** Reproduce from the evidence steps on /rides (around “My rides”) and fix it; add a regression check for that screen. Personas said they wanted: “겹치지 않게”.

### 45. Unclear wording on /rides/new — “Fewer”

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: ride-sfo-thanksgiving · fingerprint `207925697696`
- seoyeon-exchange-korean (step 27, sev 1): “좋아요. 'People to split with 3'... 나 빼고 3명? 나 포함? 잘 모르겠지만 그냥 둘게요. 가격은 모르니까 비워요 — 'We never guess prices' 좋네요.” — [screenshot](../../runs/baseline-seoyeon-ride-sfo-thanksgiving/shots/027-type.jpg) · [marked](../../runs/baseline-seoyeon-ride-sfo-thanksgiving/shots/027-type-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “Fewer” on /rides/new in plain language (and check the Korean UI). Personas said they wanted: “'나를 포함해서 몇 명'인지 명확하게”.

## Automatic checks (harness)

| screen | device | tap targets < 44px (max) | sideways overflow | broken images |
|---|---|---|---|---|
| `/create/activity` | phone | 27 — e.g. Back 40×40, 🏃 Workout 102×36, 🎸 Clubs 85×36 | — | — |
| `/rides/new` | phone | 21 — e.g. 뒤로 40×40, Unit 1 64×36, Unit 2 67×36 | — | — |
| `/discover?tab=activities` | phone | 18 — e.g. Notifications 40×40, Messages 40×40, Me 32×32 | — | — |
| `/community?tab=opportunities` | phone | 17 — e.g. Notifications 40×40, Messages 40×40, Me 32×32 | — | — |
| `/community` | phone | 16 — e.g. Notifications 40×40, Messages 40×40, Me 32×32 | — | — |
| `/rides` | phone | 13 — e.g. 뒤로 40×40, Find a ride 173×36, My rides 173×36 | — | — |
| `/discover` | phone | 12 — e.g. Notifications 40×40, Messages 40×40, Me 32×32 | — | — |
| `/orgs/:id` | phone | 8 — e.g. Back 40×40, Messages 40×40, About 56×28 | — | — |
| `/orgs/:id?tab=recruit` | phone | 8 — e.g. Back 40×40, Messages 40×40, About 56×28 | — | — |
| `/orgs/:id?tab=events` | phone | 8 — e.g. Back 40×40, Messages 40×40, About 56×28 | — | — |
| `/start` | phone | 8 — e.g. Back 40×40, Stanford University 148×36, UCLA 62×36 | — | — |
| `/` | phone | 7 — e.g. Filters 40×40, Notifications 40×40, Messages 40×40 | — | — |
| `/chats` | phone | 7 — e.g. Back 40×40, Notifications 40×40, Direct 56×28 | — | — |
| `/chats?tab=activity` | phone | 7 — e.g. Back 40×40, Notifications 40×40, Direct 56×28 | — | — |
| `/profile` | phone | 6 — e.g. Notifications 40×40, Messages 40×40, Me 32×32 | — | — |
| `/settings` | phone | 6 — e.g. Back 40×40, Turn off 84×36, Open 66×36 | — | — |
| `/welcome` | phone | 4 — e.g. Sign in 46×21, Terms of Use 76×15, Privacy Policy 180×33 | — | — |
| `/timetable` | phone | 4 — e.g. Back 40×40, Friends 92×28, Class 88×36 | — | — |
| `/rides/:id` | phone | 3 — e.g. 뒤로 40×40, More 40×40, Switch to the classic design 158×32 | — | — |
| `/chats/:id` | phone | 3 — e.g. Back 40×40, Menu 40×40, Switch to the classic design 158×32 | — | — |
