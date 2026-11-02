# ux-sim summary — 2026-11-02

> **AI simulation — hypotheses, not measured user behaviour.** AI personas drove a real browser. Counts are simulated personas, never rates; every risk below is a hypothesis to check with real students.

14 run(s) · 52 finding(s) (4 seen by ≥ 2 personas, 42 single events) · max severity **4** · severity 1/2/3/4: 30 / 29 / 6 / 1 · 0 environment-limited event(s) kept out of findings.

_These clusters are mechanical (screen + type + element). The curated problem list is `analysis.json` next to this file, written by the orchestrating session — see docs/ux-sim/ORCHESTRATE.md._

## Runs

| persona | scenario | auth | outcome | goal check | actions | friction (max sev) | drop-off risk (hypothesis) | report |
|---|---|---|---|---|---|---|---|---|
| minji-freshman-17 | cold-start-hangout | none | abandoned | not met | 24 | 4 (3) | high — Long 9-step onboarding (major, birth year) before seeing anything, then an empty People feed whose only action is inviting friends she doesn | [report](../../runs/cmp1-base-cold-start-hangout-minji/report.md) |
| aisha-firstgen-anxious | find-a-club | fresh | success | met (4 actions) | 15 | 11 (3) | medium — I did find a club I like, but every club page said Unverified, Not recruiting, no events and 0 followers, and nothing explains what 'Ask to  | [report](../../runs/cmp1-base-find-a-club-aisha/report.md) |
| marcus-senior-lowtech | first-open-decide | none | abandoned | not met | 6 | 4 (4) | high — The welcome screen sells 'who's free right now' and the setup reads like a personality/dating quiz; the internship promise was only a moving | [report](../../runs/cmp1-base-first-open-decide-marcus/report.md) |
| priya-phd-desktop | internship-near-berkeley | fresh | success | met (5 actions) | 6 | 4 (2) | medium — The Browse/Internships list with a Bay Area filter and PhD roles is genuinely useful and better than the career site, but I only found it by | [report](../../runs/cmp1-base-internship-near-berkeley-priya/report.md) |
| diego-transfer-commuter | lunch-today | fresh | success | met (1 actions) | 5 | 3 (2) | medium — Lunch was fast, but the only lunch was a freshman's and it's just me and her; if it keeps feeling like freshman stuff and I can't find study | [report](../../runs/cmp1-base-lunch-today-diego/report.md) |
| seoyeon-exchange-korean | ride-sfo-thanksgiving | fresh | success | met (8 actions) | 10 | 3 (2) | low — Found and joined a matching SFO ride in ~10 actions with no phone number asked; the Korean toggle worked, though English-only Rides screens  | [report](../../runs/cmp1-base-ride-sfo-thanksgiving-seoyeon/report.md) |
| minji-freshman-17 | timetable-add-classes | fresh | success | met (7 actions) | 7 | 3 (2) | medium — Timetable was easy and felt private, but the home People screen was empty and nothing showed anyone free when I am, so no reason yet to come | [report](../../runs/cmp1-base-timetable-add-classes-minji/report.md) |
| minji-freshman-17 | cold-start-hangout | none | success | met (26 actions) | 28 | 6 (3) | medium — Sign-up was 9 steps of quizzes before email, and the People tab had zero people — just events. If nobody joins my Thursday plan or shows up  | [report](../../runs/cmp1-fix-cold-start-hangout-minji/report.md) |
| aisha-firstgen-anxious | find-a-club | fresh | abandoned | met (9 actions) | 9 | 7 (3) | medium — The club list itself was good and had friendly options, but it took three tabs to find it, nothing says which clubs are open vs application- | [report](../../runs/cmp1-fix-find-a-club-aisha/report.md) |
| marcus-senior-lowtech | first-open-decide | none | abandoned ⚠ overrode patience | met (13 actions) | 15 | 7 (2) | high — Picked 'Land an internship' in setup, then home, Discover and Campus all showed social/event content with no visible path to jobs; the app r | [report](../../runs/cmp1-fix-first-open-decide-marcus/report.md) |
| priya-phd-desktop | internship-near-berkeley | fresh | success | met (7 actions) | 8 | 5 (2) | medium — The opportunities board is genuinely useful for a PhD (PhD-level roles, fellowships, Bay Area filter), but it's hidden behind Campus > Brows | [report](../../runs/cmp1-fix-internship-near-berkeley-priya/report.md) |
| diego-transfer-commuter | lunch-today | fresh | success | met (1 actions) | 5 | 2 (2) | medium — The lunch flow was fast, which is what I need, but I came for study partners and rides too and haven't seen that yet; if those aren't there  | [report](../../runs/cmp1-fix-lunch-today-diego/report.md) |
| seoyeon-exchange-korean | ride-sfo-thanksgiving | fresh | success | met (9 actions) | 11 | 3 (1) | low — Korean language setting was easy to find and the ride flow was clear and safe-feeling; she'd come back to coordinate in the chat and for fut | [report](../../runs/cmp1-fix-ride-sfo-thanksgiving-seoyeon/report.md) |
| minji-freshman-17 | timetable-add-classes | fresh | success | met (7 actions) | 7 | 4 (2) | medium — Adding the class was easy and the privacy line reassured me, but nothing showed me people my age or from my dorm yet — '0 free · 0 nearby' — | [report](../../runs/cmp1-fix-timetable-add-classes-minji/report.md) |

## Findings

_Clustered by screen + friction type + key element. Sorted by number of personas, then severity._

### 1. Missing / empty content on / — “Invite friends”

- **Type** Missing / empty content · **severity** max 3, median 2.5 · **2 persona(s)**: minji-freshman-17, aisha-firstgen-anxious · scenarios: cold-start-hangout, find-a-club · fingerprint `67ca16898d6c`
- minji-freshman-17 (step 32, sev 3): “헐 9단계 다 했는데 아무도 없어?? 친구 초대하라고... 친구가 없어서 깔았는데 ㅠ 뭐지 이거.” — [screenshot](../../runs/cmp1-base-cold-start-hangout-minji/shots/032-click.jpg) · [marked](../../runs/cmp1-base-cold-start-hangout-minji/shots/032-click-som.jpg)
- aisha-firstgen-anxious (step 0, sev 2): “Wait, it's just empty? 'Students from your campus show up here'... so nobody's here yet? I don't know anyone to invite, I'm literally trying to find people.” — [screenshot](../../runs/cmp1-base-find-a-club-aisha/shots/000-start.jpg) · [marked](../../runs/cmp1-base-find-a-club-aisha/shots/000-start-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on / is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “show me at least some plans or people this week, or let me start a lunch plan right here instead of inviting friends I don't have”; “show me something to do even if I have no friends on here yet”.

### 2. Onboarding friction on /start

- **Type** Onboarding friction · **severity** max 2, median 2 · **2 persona(s)**: marcus-senior-lowtech, minji-freshman-17 · scenarios: first-open-decide, cold-start-hangout · fingerprint `97dda824b2fb`
- marcus-senior-lowtech (step 2, sev 2): “OK, just picking my school, that's fine. But 1 of 9? Nine screens before I even see what's in here? I still haven't seen an internship.” — [screenshot](../../runs/cmp1-base-first-open-decide-marcus/shots/002-click.jpg) · [marked](../../runs/cmp1-base-first-open-decide-marcus/shots/002-click-som.jpg)
- minji-freshman-17 (step 2, sev 1): “school pick, ok easy. but 1/7?? 7 steps... 아 귀찮아 a bit” — [screenshot](../../runs/cmp1-fix-cold-start-hangout-minji/shots/002-click.jpg) · [marked](../../runs/cmp1-fix-cold-start-hangout-minji/shots/002-click-som.jpg)
- minji-freshman-17 (step 8, sev 2): “뭐지, it was 7 steps and now 9?? the more I pick the longer it gets... still no email yet” — [screenshot](../../runs/cmp1-fix-cold-start-hangout-minji/shots/008-click.jpg) · [marked](../../runs/cmp1-fix-cold-start-hangout-minji/shots/008-click-som.jpg)
- minji-freshman-17 (step 18, sev 1): “ok this one is useful at least. new friends. but I already said 'make new friends' on step 2...” — [screenshot](../../runs/cmp1-fix-cold-start-hangout-minji/shots/018-click.jpg) · [marked](../../runs/cmp1-fix-cold-start-hangout-minji/shots/018-click-som.jpg)
- … 1 more
- **Suggested improvement (hypothesis):** Shorten or explain this sign-up step (/start); ask only what is needed now and let the rest wait until it is useful. Personas said they wanted: “Let me look around before a 9-step setup”; “fewer steps, or tell me why 7”; “don't grow the step count, or say why”; “don't ask the same thing twice”; “Let me peek at the internships before asking my name and age”.

### 3. Trust / privacy worry on /start — “2005”

- **Type** Trust / privacy worry · **severity** max 2, median 2 · **2 persona(s)**: minji-freshman-17, marcus-senior-lowtech · scenarios: cold-start-hangout, first-open-decide · fingerprint `e2f05b7465c0`
- minji-freshman-17 (step 22, sev 2): “생년? 나 2009년생인데... 이거 다른 사람들한테 보여? 나만 17살인 거 티 나면 싫은데. 왜 필요한지 안 써있음.” — [screenshot](../../runs/cmp1-base-cold-start-hangout-minji/shots/022-click.jpg) · [marked](../../runs/cmp1-base-cold-start-hangout-minji/shots/022-click-som.jpg)
- marcus-senior-lowtech (step 14, sev 2): “Wait, it's already making a profile card that other people see? I haven't even seen what's in here. At least it's just an emoji and not my photo. 'Here to land an internship' — fine, that's true.” — [screenshot](../../runs/cmp1-fix-first-open-decide-marcus/shots/014-click.jpg) · [marked](../../runs/cmp1-fix-first-open-decide-marcus/shots/014-click-som.jpg)
- **Suggested improvement (hypothesis):** Explain who will see what when tapping “2005” on /start before asking for it. Personas said they wanted: “say why birth year is needed and whether classmates see it”; “Show me the internships first, then ask me to make a public profile”.

### 4. Hard to find on /community — “Campus”

- **Type** Hard to find · **severity** max 2, median 2 · **2 persona(s)**: aisha-firstgen-anxious, priya-phd-desktop · scenarios: find-a-club, internship-near-berkeley · fingerprint `f0b0e987903d`
- aisha-firstgen-anxious (step 4, sev 2): “Wait, this is like a posting feed. No clubs here either. There's a 'Browse' tab at the top though — maybe that's where the groups are?” — [screenshot](../../runs/cmp1-fix-find-a-club-aisha/shots/004-click.jpg) · [marked](../../runs/cmp1-fix-find-a-club-aisha/shots/004-click-som.jpg)
- priya-phd-desktop (step 4, sev 2): “'Invite your floor' — I don't have a floor, I have a lab. This is a dorm app. Maybe 'Browse' hides something useful.” — [screenshot](../../runs/cmp1-fix-internship-near-berkeley-priya/shots/004-click.jpg) · [marked](../../runs/cmp1-fix-internship-near-berkeley-priya/shots/004-click-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“Campus”) where they looked (/community); label icon-only controls. Personas said they wanted: “Campus tab to show clubs/orgs up front”; “a visible Jobs/Internships or Opportunities entry point”.

### 5. Trust / privacy worry on /start — “🎉 Out with people”

- **Type** Trust / privacy worry · **severity** max 4, median 4 · **1 persona(s)**: marcus-senior-lowtech · scenarios: first-open-decide · fingerprint `37ba6e6b85d0`
- marcus-senior-lowtech (step 11, sev 4): “'Friday night, be honest'? Come on. This is a dating or party app quiz. I picked 'Land an internship' two screens ago and it's asking about my Friday nights. Five more of these and I still haven't seen a single job.” — [screenshot](../../runs/cmp1-base-first-open-decide-marcus/shots/011-click.jpg) · [marked](../../runs/cmp1-base-first-open-decide-marcus/shots/011-click-som.jpg)
- **Suggested improvement (hypothesis):** Explain who will see what when tapping “🎉 Out with people” on /start before asking for it. Personas said they wanted: “After I pick internships, show me internships, not a personality quiz”.

### 6. Trust / privacy worry on /orgs/:id — “Ask to join”

- **Type** Trust / privacy worry · **severity** max 3, median 3 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `d80495a57f74`
- aisha-firstgen-anxious (step 9, sev 3): “Wait, 'Unverified' — does that mean it's not a real club? Or that Lumi hasn't checked it? And 'Ask to join'... who am I asking? Does it send them my profile? Is there an application? I don't want to accidentally send something before I know what it does.” — [screenshot](../../runs/cmp1-base-find-a-club-aisha/shots/009-click.jpg) · [marked](../../runs/cmp1-base-find-a-club-aisha/shots/009-click-som.jpg)
- **Suggested improvement (hypothesis):** Explain who will see what when tapping “Ask to join” on /orgs/:id before asking for it. Personas said they wanted: “Tell me what 'Ask to join' does (who sees it, is it an application, can I undo it) and what 'Unverified' means”.

### 7. Confusing UI on /orgs/:id?tab=recruit — “Recruiting”

- **Type** Confusing UI · **severity** max 3, median 3 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `b671f45c6bb2`
- aisha-firstgen-anxious (step 11, sev 3): “Wait, so they're not taking members... but I can still ask to join? Does that mean I missed the window? Is this one of those clubs where you have to apply during a certain week? Nobody told me about that.” — [screenshot](../../runs/cmp1-base-find-a-club-aisha/shots/011-click.jpg) · [marked](../../runs/cmp1-base-find-a-club-aisha/shots/011-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Recruiting” on /orgs/:id?tab=recruit does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “If they're not recruiting, tell me whether I can still just show up to hikes, and when the next chance to join is”.

### 8. Trust / privacy worry on /start — “Next”

- **Type** Trust / privacy worry · **severity** max 3, median 3 · **1 persona(s)**: marcus-senior-lowtech · scenarios: first-open-decide · fingerprint `94527b529e80`
- marcus-senior-lowtech (step 8, sev 3): “Wait, 'perfect free afternoon', 'long walks'... this is starting to read like a dating profile. What does my afternoon have to do with internships? Is this legit?” — [screenshot](../../runs/cmp1-base-first-open-decide-marcus/shots/008-click.jpg) · [marked](../../runs/cmp1-base-first-open-decide-marcus/shots/008-click-som.jpg)
- **Suggested improvement (hypothesis):** Explain who will see what when tapping “Next” on /start before asking for it. Personas said they wanted: “Explain why you're asking, or let me skip the personal stuff if I'm here for jobs”.

### 9. Missing / empty content on / — “People”

- **Type** Missing / empty content · **severity** max 3, median 3 · **1 persona(s)**: minji-freshman-17 · scenarios: cold-start-hangout · fingerprint `30bfb5a984ca`
- minji-freshman-17 (step 36, sev 3): “뭐지... it says People but it's all events. where are the people? nobody's here?” — [screenshot](../../runs/cmp1-fix-cold-start-hangout-minji/shots/036-click.jpg) · [marked](../../runs/cmp1-fix-cold-start-hangout-minji/shots/036-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on / is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “show me at least a few people or open plans this week”.

### 10. Confusing UI on /orgs/:id — “Get updates”

- **Type** Confusing UI · **severity** max 3, median 3 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `ab8767625de9`
- aisha-firstgen-anxious (step 16, sev 3): “Wait, does 'not taking join requests on Lumi' mean they aren't accepting new people at all, or just that I join some other way? And 'Unverified' — is this even the real club? It doesn't tell me if I can just show up to game night Thursday, or where.” — [screenshot](../../runs/cmp1-fix-find-a-club-aisha/shots/016-click.jpg) · [marked](../../runs/cmp1-fix-find-a-club-aisha/shots/016-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Get updates” on /orgs/:id does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “tell me plainly how to join: e.g. 'Open to everyone — just show up Thu 7pm at X' or a link to their real sign-up”.

### 11. Confusing UI on /timetable — “MATH 51 Calculus I (formerly MATH 1A) (L”

- **Type** Confusing UI · **severity** max 2, median 1 · **1 persona(s)**: minji-freshman-17 · scenarios: timetable-add-classes · fingerprint `f634db6cc171`
- minji-freshman-17 (step 14, sev 1): “오 들어갔다! 화·목 MATH 51 보이네. 근데 나 아무것도 안 눌렀는데 혼자 추가됨? 그리고 '2 classes'… 수학 하나인데” — [screenshot](../../runs/cmp1-base-timetable-add-classes-minji/shots/014-wait.jpg) · [marked](../../runs/cmp1-base-timetable-add-classes-minji/shots/014-wait-som.jpg)
- minji-freshman-17 (step 7, sev 1): “헐 MATH 51로 바뀌었구나, 'formerly MATH 1A'라고 써줘서 다행. 근데 Lec 001이랑 002 중에 뭐였지… 8시는 절대 아님, 9:30 거 같음” — [screenshot](../../runs/cmp1-fix-timetable-add-classes-minji/shots/007-type.jpg) · [marked](../../runs/cmp1-fix-timetable-add-classes-minji/shots/007-type-som.jpg)
- minji-freshman-17 (step 12, sev 2): “어? 나 Add 안 눌렀는데 그냥 들어갔네. 화/목 9:30 MATH 51 보임, 좋아. 근데 '2 classes'라고 하네… 한 과목인데? 그리고 거의 20초 기다림” — [screenshot](../../runs/cmp1-fix-timetable-add-classes-minji/shots/012-wait.jpg) · [marked](../../runs/cmp1-fix-timetable-add-classes-minji/shots/012-wait-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “MATH 51 Calculus I (formerly MATH 1A) (L” on /timetable does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “tell me it'll add automatically if there are no sections; count it as 1 class”; “tell me which section is which / let me change it later easily”; “a clear 'Added Calculus I ✓' message, and count it as 1 class (2 meetings)”.

### 12. No reason to stay on /

- **Type** No reason to stay · **severity** max 2, median 1.5 · **1 persona(s)**: priya-phd-desktop · scenarios: internship-near-berkeley · fingerprint `4d28c4b04f0f`
- priya-phd-desktop (step 0, sev 2): “A phone-width column in the middle of my 1440 screen with black bars on both sides. And the first thing it asks is to invite my floor. I don't have a floor. Not promising.” — [screenshot](../../runs/cmp1-base-internship-near-berkeley-priya/shots/000-start.jpg) · [marked](../../runs/cmp1-base-internship-near-berkeley-priya/shots/000-start-som.jpg)
- priya-phd-desktop (step 0, sev 1): “A phone-sized column in the middle of my 1440px screen, with a note telling me to go use my phone. At least it's not stretched. Free food feed is very undergrad, but fine, I'm here for internships.” — [screenshot](../../runs/cmp1-fix-internship-near-berkeley-priya/shots/000-start.jpg) · [marked](../../runs/cmp1-fix-internship-near-berkeley-priya/shots/000-start-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “a proper desktop layout and something useful on the first screen instead of an empty invite prompt”; “a real desktop layout, or at least don't tell me to switch devices”.

### 13. Confusing UI on /chats — “Direct”

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: diego-transfer-commuter · scenarios: lunch-today · fingerprint `51aeaa92565b`
- diego-transfer-commuter (step 4, sev 2): “Wait, it says chats open when you join an activity — I just did. Where is it? Probably that Activities tab. Should've opened there.” — [screenshot](../../runs/cmp1-base-lunch-today-diego/shots/004-click.jpg) · [marked](../../runs/cmp1-base-lunch-today-diego/shots/004-click-som.jpg)
- diego-transfer-commuter (step 6, sev 2): “Wait, I just joined an activity. It's probably under Activities, there's a tab right there.” — [screenshot](../../runs/cmp1-fix-lunch-today-diego/shots/006-click.jpg) · [marked](../../runs/cmp1-fix-lunch-today-diego/shots/006-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Direct” on /chats does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “after joining, open straight on the Activities tab or the lunch chat itself”; “open Messages on the tab with my newest chat, or show the lunch chat first”.

### 14. Slow on /timetable — “Add lecture only”

- **Type** Slow · **severity** max 2, median 1.5 · **1 persona(s)**: minji-freshman-17 · scenarios: timetable-add-classes · fingerprint `a8499911c15f`
- minji-freshman-17 (step 12, sev 2): “아직도 Finding…? 버튼도 회색이라 'lecture only'도 못 누름. 아 귀찮아” — [screenshot](../../runs/cmp1-base-timetable-add-classes-minji/shots/012-wait.jpg) · [marked](../../runs/cmp1-base-timetable-add-classes-minji/shots/012-wait-som.jpg)
- minji-freshman-17 (step 9, sev 1): “아 discussion도 고르라는 거구나. 근데 로딩 좀 느림, 버튼도 회색이라 기다려야 함” — [screenshot](../../runs/cmp1-fix-timetable-add-classes-minji/shots/009-click.jpg) · [marked](../../runs/cmp1-fix-timetable-add-classes-minji/shots/009-click-som.jpg)
- **Suggested improvement (hypothesis):** Measure load/action latency on /timetable and show progress feedback while waiting. Personas said they wanted: “let me add the lecture now while it loads sections”.

### 15. Onboarding friction on /start — “e.g. Computer Science”

- **Type** Onboarding friction · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: cold-start-hangout · fingerprint `fe75fc995a42`
- minji-freshman-17 (step 15, sev 2): “6단계째인데 아직 아무것도 못 봤어. 전공까지? 난 아직 undeclared인데...” — [screenshot](../../runs/cmp1-base-cold-start-hangout-minji/shots/015-click.jpg) · [marked](../../runs/cmp1-base-cold-start-hangout-minji/shots/015-click-som.jpg)
- **Suggested improvement (hypothesis):** Shorten or explain this sign-up step (/start); ask only what is needed now and let the rest wait until it is useful. Personas said they wanted: “show me who's around first, ask about me later”.

### 16. Missing / empty content on /orgs/:id?tab=events — “Events”

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `919841c6195c`
- aisha-firstgen-anxious (step 13, sev 2): “No events either. And 'events you post'? I'm not posting events, I'm a first-year. Not recruiting, no events, unverified... is this club even active? Let me see if anyone's actually in it.” — [screenshot](../../runs/cmp1-base-find-a-club-aisha/shots/013-click.jpg) · [marked](../../runs/cmp1-base-find-a-club-aisha/shots/013-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /orgs/:id?tab=events is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “show the club's real meeting times or a 'newcomers welcome' event so I know it's alive”.

### 17. Missing / empty content on /orgs/:id?tab=members — “Members”

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `6de492d10b73`
- aisha-firstgen-anxious (step 15, sev 2): “Zero followers. So nobody from this club is actually on here? If I tap 'Ask to join' would anyone even see it? I'd rather look for a group that feels more like people like me.” — [screenshot](../../runs/cmp1-base-find-a-club-aisha/shots/015-click.jpg) · [marked](../../runs/cmp1-base-find-a-club-aisha/shots/015-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /orgs/:id?tab=members is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “some sign real students are in this club on Lumi”.

### 18. Hard to find on /community?tab=opportunities — “Show more (7)”

- **Type** Hard to find · **severity** max 2, median 2 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `bbab628dceb5`
- aisha-firstgen-anxious (step 25, sev 2): “So many of these are consulting, VC, debate... résumé clubs. I was hoping for a first-gen students group, but there's no search box to look for one. The Board Game Club says 'every week' — that sounds low-pressure, like I could just show up.” — [screenshot](../../runs/cmp1-base-find-a-club-aisha/shots/025-scroll.jpg) · [marked](../../runs/cmp1-base-find-a-club-aisha/shots/025-scroll-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“Show more (7)”) where they looked (/community?tab=opportunities); label icon-only controls. Personas said they wanted: “a search box or a 'beginner-friendly / no application' filter, and first-gen / community groups”.

### 19. Missing / empty content on /orgs/:id — “About”

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `68c8e67b425d`
- aisha-firstgen-anxious (step 27, sev 2): “Okay, this one I'd actually go to. Game night Thursday! But... Thursday when? Where? It doesn't say a time or a room. Let me check if they're taking people right now.” — [screenshot](../../runs/cmp1-base-find-a-club-aisha/shots/027-click.jpg) · [marked](../../runs/cmp1-base-find-a-club-aisha/shots/027-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /orgs/:id is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “time and place for game night, and 'newcomers welcome — just show up' if that's true”.

### 20. Trust / privacy worry on /welcome

- **Type** Trust / privacy worry · **severity** max 2, median 2 · **1 persona(s)**: marcus-senior-lowtech · scenarios: first-open-decide · fingerprint `c001ec879684`
- marcus-senior-lowtech (step 0, sev 2): “Big headline is 'Who's free on campus right now?' and 'Find someone for lunch' — kind of sounds like a meet-people app. I only caught '457 internships' in that scrolling banner. That's the part I care about but it's tiny and moving.” — [screenshot](../../runs/cmp1-base-first-open-decide-marcus/shots/000-start.jpg) · [marked](../../runs/cmp1-base-first-open-decide-marcus/shots/000-start-som.jpg)
- **Suggested improvement (hypothesis):** Explain who will see what on /welcome before asking for it. Personas said they wanted: “Tell me plainly up front that it has internships and jobs, not just a moving ticker”.

### 21. Unclear wording on /rides — “Find a ride”

- **Type** Unclear wording · **severity** max 2, median 2 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: ride-sfo-thanksgiving · fingerprint `c839eaceb32e`
- seoyeon-exchange-korean (step 12, sev 2): “어... 한국어로 바꿨는데 여기는 전부 영어네. 천천히 읽어보니 Jun이라는 사람이 수요일 8:30에 SFO 간대. 내 날짜랑 같아!” — [screenshot](../../runs/cmp1-base-ride-sfo-thanksgiving-seoyeon/shots/012-click.jpg) · [marked](../../runs/cmp1-base-ride-sfo-thanksgiving-seoyeon/shots/012-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “Find a ride” on /rides in plain language (and check the Korean UI). Personas said they wanted: “Rides 화면도 한국어로 보여줬으면”.

### 22. Onboarding friction on /start — “Skip”

- **Type** Onboarding friction · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: cold-start-hangout · fingerprint `8a0bf61f729f`
- minji-freshman-17 (step 16, sev 2): “아 귀찮아... friday night quiz? I just wanna find someone to eat with. skip” — [screenshot](../../runs/cmp1-fix-cold-start-hangout-minji/shots/016-click.jpg) · [marked](../../runs/cmp1-fix-cold-start-hangout-minji/shots/016-click-som.jpg)
- **Suggested improvement (hypothesis):** Shorten or explain this sign-up step (/start); ask only what is needed now and let the rest wait until it is useful. Personas said they wanted: “let me see people first, ask this later”.

### 23. Missing / empty content on / — “🐱 You going”

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: cold-start-hangout · fingerprint `acb4cc579834`
- minji-freshman-17 (step 39, sev 2): “ok I'm in for thursday lunch music. but 'together' with... just me? ㅋㅋ 좀 쓸쓸하다. hope someone joins” — [screenshot](../../runs/cmp1-fix-cold-start-hangout-minji/shots/039-click.jpg) · [marked](../../runs/cmp1-fix-cold-start-hangout-minji/shots/039-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on / is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “show me someone else going, or someone from my dorm/year”.

### 24. Hard to find on /discover — “Teams”

- **Type** Hard to find · **severity** max 2, median 2 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `706b176473be`
- aisha-firstgen-anxious (step 2, sev 2): “Hmm, 'Teams' — is that sports teams? Or like study teams? I don't see the word 'club' anywhere. Maybe 'Campus' is where student orgs live.” — [screenshot](../../runs/cmp1-fix-find-a-club-aisha/shots/002-click.jpg) · [marked](../../runs/cmp1-fix-find-a-club-aisha/shots/002-click-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“Teams”) where they looked (/discover); label icon-only controls. Personas said they wanted: “a clear 'Clubs' entry”.

### 25. Missing / empty content on /community?tab=opportunities — “📊 Berkeley Consulting Undergraduate man”

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `3b5ac628f93c`
- aisha-firstgen-anxious (step 13, sev 2): “Wait, how do I know which of these I can just show up to and which ones you have to apply for? Consulting, Codebase, Venture Capital sound like the scary application ones, but nothing in the list actually says. I'm guessing from the descriptions.” — [screenshot](../../runs/cmp1-fix-find-a-club-aisha/shots/013-scroll.jpg) · [marked](../../runs/cmp1-fix-find-a-club-aisha/shots/013-scroll-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /community?tab=opportunities is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “a tag like 'open to all / no application' vs 'applications required' on each card”.

### 26. Confusing UI on /welcome

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: marcus-senior-lowtech · scenarios: first-open-decide · fingerprint `518c68aff2a6`
- marcus-senior-lowtech (step 0, sev 2): “Who's free on campus right now? Find someone for lunch? Sounds kind of like a meetup or dating thing. I did catch '457 internships' scrolling past in that yellow strip, but it moves too fast to read. Is this legit, and where's the job stuff?” — [screenshot](../../runs/cmp1-fix-first-open-decide-marcus/shots/000-start.jpg) · [marked](../../runs/cmp1-fix-first-open-decide-marcus/shots/000-start-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what the main control on /welcome does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “Tell me plainly up top what the app is for, including internships, not just a moving ticker”.

### 27. Hard to find on / — “Discover”

- **Type** Hard to find · **severity** max 2, median 2 · **1 persona(s)**: marcus-senior-lowtech · scenarios: first-open-decide · fingerprint `d9636172c04a`
- marcus-senior-lowtech (step 22, sev 2): “I told it I'm here for internships and the first thing I see is a pizza workshop and a quantum physics talk. Those four icons at the top, no idea what they do. The bottom ones have words at least. Where are the 457 internships?” — [screenshot](../../runs/cmp1-fix-first-open-decide-marcus/shots/022-click.jpg) · [marked](../../runs/cmp1-fix-first-open-decide-marcus/shots/022-click-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“Discover”) where they looked (/); label icon-only controls. Personas said they wanted: “Since I picked internships, show internships first on home”.

### 28. Hard to find on /discover — “Discover”

- **Type** Hard to find · **severity** max 2, median 2 · **1 persona(s)**: marcus-senior-lowtech · scenarios: first-open-decide · fingerprint `b9d1ee526d80`
- marcus-senior-lowtech (step 24, sev 2): “Rides to Costco, spontaneous hangouts... this is a social app. Still no internships. One more place to try, 'Campus', then I'm done.” — [screenshot](../../runs/cmp1-fix-first-open-decide-marcus/shots/024-click.jpg) · [marked](../../runs/cmp1-fix-first-open-decide-marcus/shots/024-click-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“Discover”) where they looked (/discover); label icon-only controls. Personas said they wanted: “A tab that just says Internships or Jobs”.

### 29. Hard to find on /community?tab=opportunities — “Browse”

- **Type** Hard to find · **severity** max 2, median 2 · **1 persona(s)**: priya-phd-desktop · scenarios: internship-near-berkeley · fingerprint `43ed8165cecc`
- priya-phd-desktop (step 7, sev 2): “Okay, this is actually relevant — 'PhD' intern roles, a Jane Street grad fellowship. Should not be buried under a tab labelled 'Browse' inside 'Campus' though. And the old feed lingered for a moment after I clicked.” — [screenshot](../../runs/cmp1-fix-internship-near-berkeley-priya/shots/007-wait.jpg) · [marked](../../runs/cmp1-fix-internship-near-berkeley-priya/shots/007-wait-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“Browse”) where they looked (/community?tab=opportunities); label icon-only controls. Personas said they wanted: “label it Opportunities, or surface it from the home screen”.

### 30. Missing / empty content on /opportunities/:id — “Details”

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: priya-phd-desktop · scenarios: internship-near-berkeley · fingerprint `6d922472ea26`
- priya-phd-desktop (step 13, sev 2): “Why is 'Prep crews' above the job details? I wanted location/pay/deadline first. No compensation listed at all — I'll assume Waymo pays its PhD interns, but the app should say so. The deadline note is at least honest.” — [screenshot](../../runs/cmp1-fix-internship-near-berkeley-priya/shots/013-click.jpg) · [marked](../../runs/cmp1-fix-internship-near-berkeley-priya/shots/013-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /opportunities/:id is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “show compensation (or 'paid') and put details above the social stuff”.

### 31. Confusing UI on /community?tab=opportunities — “🤖 Machine Learning at Berkeley Undergra”

- **Type** Confusing UI · **severity** max 1, median 1 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `e8b25109cb47`
- aisha-firstgen-anxious (step 21, sev 1): “Better. Wait, Machine Learning fits Public Health? That's weird — makes me trust the 'fits your major' tags less. Let me scroll and actually read the names.” — [screenshot](../../runs/cmp1-base-find-a-club-aisha/shots/021-click.jpg) · [marked](../../runs/cmp1-base-find-a-club-aisha/shots/021-click-som.jpg)
- aisha-firstgen-anxious (step 10, sev 1): “Good. But wait — 'Machine Learning at Berkeley — Fits your major (Public Health)'? That doesn't make sense, it's an ML club. Makes me trust the 'fits you' tags less. Let me scroll and actually read the list.” — [screenshot](../../runs/cmp1-fix-find-a-club-aisha/shots/010-click.jpg) · [marked](../../runs/cmp1-fix-find-a-club-aisha/shots/010-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “🤖 Machine Learning at Berkeley Undergra” on /community?tab=opportunities does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “only say 'fits your major' when it actually does”.

### 32. Unclear wording on /profile — “Find a class to watch”

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: ride-sfo-thanksgiving · fingerprint `f21a384a224b`
- seoyeon-exchange-korean (step 8, sev 1): “대부분 한국어인데 'Seat alerts' 부분은 영어 그대로네. 뭐 괜찮아.” — [screenshot](../../runs/cmp1-base-ride-sfo-thanksgiving-seoyeon/shots/008-click.jpg) · [marked](../../runs/cmp1-base-ride-sfo-thanksgiving-seoyeon/shots/008-click-som.jpg)
- seoyeon-exchange-korean (step 8, sev 1): “대부분 한국어인데 Seat alerts는 영어 그대로네. 뭐 수업 얘기라 상관없어.” — [screenshot](../../runs/cmp1-fix-ride-sfo-thanksgiving-seoyeon/shots/008-click.jpg) · [marked](../../runs/cmp1-fix-ride-sfo-thanksgiving-seoyeon/shots/008-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “Find a class to watch” on /profile in plain language (and check the Korean UI). Personas said they wanted: “translate everything when I pick 한국어”; “translate the whole page”.

### 33. Unclear wording on /start

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: minji-freshman-17 · scenarios: cold-start-hangout · fingerprint `e53f5b5080fe`
- minji-freshman-17 (step 19, sev 1): “오 얼굴 사진 말고 이모지! 이거 좋다. 프로필 자동으로 써줬네. 'Freshman in Undeclared'는 좀 어색하지만 ㅋㅋ” — [screenshot](../../runs/cmp1-base-cold-start-hangout-minji/shots/019-click.jpg) · [marked](../../runs/cmp1-base-cold-start-hangout-minji/shots/019-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite the wording on /start in plain language (and check the Korean UI). Personas said they wanted: “'Undeclared freshman' reads more natural”.

### 34. No reason to stay on /community?tab=opportunities — “For you”

- **Type** No reason to stay · **severity** max 1, median 1 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `f4cafbbabf74`
- aisha-firstgen-anxious (step 5, sev 1): “Okay, there IS a Clubs tab, phew. But 'For you' is all fellowships with deadlines... D-93? That's a lot of résumé stuff. I'm a first-year, I just want a group. Let me tap Clubs.” — [screenshot](../../runs/cmp1-base-find-a-club-aisha/shots/005-observe.jpg) · [marked](../../runs/cmp1-base-find-a-club-aisha/shots/005-observe-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /community?tab=opportunities: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “For a first-year, show welcoming clubs first, not summer research fellowships”.

### 35. Unclear wording on /community?tab=opportunities — “Clubs”

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `52228e162ff2`
- aisha-firstgen-anxious (step 7, sev 1): “Okay this is the list. Wait, there's 'Clubs' and then another 'Clubs' under it? Which one am I in? Also it's a lot of Greek life, which I don't know the rules for. The hiking one sounds friendly — weekend hikes, gear rentals, I don't need my own gear.” — [screenshot](../../runs/cmp1-base-find-a-club-aisha/shots/007-click.jpg) · [marked](../../runs/cmp1-base-find-a-club-aisha/shots/007-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “Clubs” on /community?tab=opportunities in plain language (and check the Korean UI). Personas said they wanted: “don't repeat 'Clubs' in both rows; make it clear what 'All' vs 'Clubs' means”.

### 36. Unclear wording on /community?tab=opportunities — “Associations”

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `892104e2a76a`
- aisha-firstgen-anxious (step 19, sev 1): “Oh, it's just student government. Not what I meant. I'll filter to only Clubs so I don't have to scroll past all the sororities.” — [screenshot](../../runs/cmp1-base-find-a-club-aisha/shots/019-click.jpg) · [marked](../../runs/cmp1-base-find-a-club-aisha/shots/019-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “Associations” on /community?tab=opportunities in plain language (and check the Korean UI). Personas said they wanted: “a label that says what 'Associations' means; also '1 groups' is a typo”.

### 37. Missing / empty content on /community?tab=opportunities — “🔬 Syracuse iSchool ASSURE-REU: Text Ana”

- **Type** Missing / empty content · **severity** max 1, median 1 · **1 persona(s)**: priya-phd-desktop · scenarios: internship-near-berkeley · fingerprint `bc1b938d7552`
- priya-phd-desktop (step 6, sev 1): “Mixed bag. Lyft and Waymo PhD interns are great, but why is a Syracuse REU — an undergrad program — 'matching my interest in research'? Same feed has free-food chips. I'll filter to Internships.” — [screenshot](../../runs/cmp1-base-internship-near-berkeley-priya/shots/006-observe.jpg) · [marked](../../runs/cmp1-base-internship-near-berkeley-priya/shots/006-observe-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /community?tab=opportunities is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “don't recommend undergrad-only REUs to a PhD student”.

### 38. No reason to stay on /opportunities/:id — “Start a prep crew e.g. Interview prep · ”

- **Type** No reason to stay · **severity** max 1, median 1 · **1 persona(s)**: priya-phd-desktop · scenarios: internship-near-berkeley · fingerprint `5a069545d718`
- priya-phd-desktop (step 12, sev 1): “Apply link and an honest 'deadline not posted' — fine. But nothing about pay, which is the one thing I asked for, and 'Start a prep crew' sits above the actual details. I don't need a crew to apply to Lyft.” — [screenshot](../../runs/cmp1-base-internship-near-berkeley-priya/shots/012-click.jpg) · [marked](../../runs/cmp1-base-internship-near-berkeley-priya/shots/012-click-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /opportunities/:id: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “put the job facts (pay, deadline, location) first; social stuff below”.

### 39. Missing / empty content on /opportunities/:id — “Official source Lyft careers Last verifi”

- **Type** Missing / empty content · **severity** max 1, median 1 · **1 persona(s)**: priya-phd-desktop · scenarios: internship-near-berkeley · fingerprint `0f09a767aea4`
- priya-phd-desktop (step 14, sev 1): “'Last verified yesterday' with a link to Lyft's own careers page — that's what I need to trust it's open. No pay stated; I know Lyft PhD interns are paid, but an undergrad wouldn't. Thin, but enough to apply.” — [screenshot](../../runs/cmp1-base-internship-near-berkeley-priya/shots/014-scroll.jpg) · [marked](../../runs/cmp1-base-internship-near-berkeley-priya/shots/014-scroll-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /opportunities/:id is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “show pay range and a short description when the posting has them”.

### 40. No reason to stay on / — “I'm in”

- **Type** No reason to stay · **severity** max 1, median 1 · **1 persona(s)**: diego-transfer-commuter · scenarios: lunch-today · fingerprint `5b3363c14dd9`
- diego-transfer-commuter (step 0, sev 1): “OK, lunch at Crossroads today 12:30 — that's literally what I need. Kind of a big emoji face like a dating card though, and '29 means she's a freshman. Whatever, it's lunch.” — [screenshot](../../runs/cmp1-base-lunch-today-diego/shots/000-start.jpg) · [marked](../../runs/cmp1-base-lunch-today-diego/shots/000-start-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “show it's a group lunch, not a one-on-one profile card”.

### 41. Bug on /chats/:id — “Switch to the classic design”

- **Type** Bug · **severity** max 1, median 1 · **1 persona(s)**: diego-transfer-commuter · scenarios: lunch-today · fingerprint `44271af15761`
- diego-transfer-commuter (step 8, sev 1): “OK, chat's here. That Design pill is sitting on top of the lunch card title, kind of sloppy. I'll just say I'm coming.” — [screenshot](../../runs/cmp1-base-lunch-today-diego/shots/008-click.jpg) · [marked](../../runs/cmp1-base-lunch-today-diego/shots/008-click-som.jpg)
- **Suggested improvement (hypothesis):** Reproduce from the evidence steps on /chats/:id (around “Switch to the classic design”) and fix it; add a regression check for that screen. Personas said they wanted: “pill shouldn't cover the activity card”.

### 42. Bug on /rides — “My rides”

- **Type** Bug · **severity** max 1, median 1 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: ride-sfo-thanksgiving · fingerprint `39327c8d79c3`
- seoyeon-exchange-korean (step 12, sev 1): “'Design: Classic New' 버튼이 'My rides' 탭 위에 겹쳐 있어서 탭 글씨가 안 보여.” — [screenshot](../../runs/cmp1-base-ride-sfo-thanksgiving-seoyeon/shots/012-click.jpg) · [marked](../../runs/cmp1-base-ride-sfo-thanksgiving-seoyeon/shots/012-click-som.jpg)
- **Suggested improvement (hypothesis):** Reproduce from the evidence steps on /rides (around “My rides”) and fix it; add a regression check for that screen.

### 43. Unclear wording on /timetable — “MATH 51 Calculus I (formerly MATH 1A) (L”

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: minji-freshman-17 · scenarios: timetable-add-classes · fingerprint `1ffc6e246d69`
- minji-freshman-17 (step 8, sev 1): “MATH 51? 뭐지… 아 formerly MATH 1A 써있네 다행. 근데 Lec 001/002 두 개… 나 화목 9:30 거 맞지?” — [screenshot](../../runs/cmp1-base-timetable-add-classes-minji/shots/008-type.jpg) · [marked](../../runs/cmp1-base-timetable-add-classes-minji/shots/008-type-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “MATH 51 Calculus I (formerly MATH 1A) (L” on /timetable in plain language (and check the Korean UI). Personas said they wanted: “say 'same class, two time slots — pick yours'”.

### 44. Confusing UI on / — “Go together”

- **Type** Confusing UI · **severity** max 1, median 1 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `8551c6209604`
- aisha-firstgen-anxious (step 0, sev 1): “These are all events, not clubs. And 'Go together' — wait, would tapping that tell people I'm going? I don't want to accidentally sign up for something. I'll look for clubs somewhere else.” — [screenshot](../../runs/cmp1-fix-find-a-club-aisha/shots/000-start.jpg) · [marked](../../runs/cmp1-fix-find-a-club-aisha/shots/000-start-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Go together” on / does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “say what Go together actually does before I tap it”.

### 45. Trust / privacy worry on /community?tab=opportunities — “🥾 Cal Hiking and Outdoor Society (CHAOS”

- **Type** Trust / privacy worry · **severity** max 1, median 1 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: find-a-club · fingerprint `942b79d6055c`
- aisha-firstgen-anxious (step 8, sev 1): “Okay this is what I wanted. Hiking club sounds friendly. But wait — 'Matches your interest in outdoors'? I never told it I like the outdoors. Where did it get that? Also there are tons of sororities mixed in; I'll narrow to 'Student clubs'.” — [screenshot](../../runs/cmp1-fix-find-a-club-aisha/shots/008-click.jpg) · [marked](../../runs/cmp1-fix-find-a-club-aisha/shots/008-click-som.jpg)
- **Suggested improvement (hypothesis):** Explain who will see what when tapping “🥾 Cal Hiking and Outdoor Society (CHAOS” on /community?tab=opportunities before asking for it. Personas said they wanted: “tell me why it thinks I like outdoors / let me set interests”.

### 46. Onboarding friction on /start — “Back”

- **Type** Onboarding friction · **severity** max 1, median 1 · **1 persona(s)**: marcus-senior-lowtech · scenarios: first-open-decide · fingerprint `f3a9ac15eb35`
- marcus-senior-lowtech (step 2, sev 1): “OK, picking my school is harmless. Seven steps though, that's a lot before I even know what this is.” — [screenshot](../../runs/cmp1-fix-first-open-decide-marcus/shots/002-click.jpg) · [marked](../../runs/cmp1-fix-first-open-decide-marcus/shots/002-click-som.jpg)
- **Suggested improvement (hypothesis):** Shorten or explain this sign-up step (/start); ask only what is needed now and let the rest wait until it is useful. Personas said they wanted: “Let me look around before a 7-step setup”.

### 47. No reason to stay on /start — “🧭 Upperclassmen who’ve been there”

- **Type** No reason to stay · **severity** max 1, median 1 · **1 persona(s)**: marcus-senior-lowtech · scenarios: first-open-decide · fingerprint `f98a48434400`
- marcus-senior-lowtech (step 12, sev 1): “I'm a senior, I'm not looking to meet people, I want a job. Nothing here like 'recruiters' or 'alumni'. Glad there's a Skip.” — [screenshot](../../runs/cmp1-fix-first-open-decide-marcus/shots/012-click.jpg) · [marked](../../runs/cmp1-fix-first-open-decide-marcus/shots/012-click-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /start: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “An option like alumni or people hiring, for seniors job hunting”.

### 48. Bug on /community?tab=opportunities — “Location”

- **Type** Bug · **severity** max 1, median 1 · **1 persona(s)**: priya-phd-desktop · scenarios: internship-near-berkeley · fingerprint `c4d7ce393786`
- priya-phd-desktop (step 9, sev 1): “Wall of chips — 'Health 0' is a chip for nothing. But there's a location filter, which is exactly what I need. The dropdown hanging off the edge of the column is sloppy.” — [screenshot](../../runs/cmp1-fix-internship-near-berkeley-priya/shots/009-click.jpg) · [marked](../../runs/cmp1-fix-internship-near-berkeley-priya/shots/009-click-som.jpg)
- **Suggested improvement (hypothesis):** Reproduce from the evidence steps on /community?tab=opportunities (around “Location”) and fix it; add a regression check for that screen. Personas said they wanted: “keep the dropdown inside the layout; hide zero-count chips”.

### 49. Confusing UI on /

- **Type** Confusing UI · **severity** max 1, median 1 · **1 persona(s)**: diego-transfer-commuter · scenarios: lunch-today · fingerprint `ca00bd1ad3db`
- diego-transfer-commuter (step 4, sev 1): “The Open chat thing disappeared before I could tap it. Whatever, the messages icon had a dot.” — [screenshot](../../runs/cmp1-fix-lunch-today-diego/shots/004-observe.jpg) · [marked](../../runs/cmp1-fix-lunch-today-diego/shots/004-observe-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what the main control on / does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “keep the Open chat shortcut on the card after joining, not just in a toast”.

### 50. Unclear wording on /profile — “My rides Airports, groceries, SF, Tahoe”

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: ride-sfo-thanksgiving · fingerprint `b94b701b00c1`
- seoyeon-exchange-korean (step 10, sev 1): “My rides... Airports! 공항 같이 가는 거 여기 있나봐. 근데 이것만 영어네.” — [screenshot](../../runs/cmp1-fix-ride-sfo-thanksgiving-seoyeon/shots/010-scroll.jpg) · [marked](../../runs/cmp1-fix-ride-sfo-thanksgiving-seoyeon/shots/010-scroll-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “My rides Airports, groceries, SF, Tahoe” on /profile in plain language (and check the Korean UI). Personas said they wanted: “라이드 메뉴도 한국어로”.

### 51. Unclear wording on /chats/:id — “🚕 SFO · Wed Nov 25 8:30am 멤버 2명”

- **Type** Unclear wording · **severity** max 1, median 1 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: ride-sfo-thanksgiving · fingerprint `dcaa93c37b46`
- seoyeon-exchange-korean (step 20, sev 1): “채팅방 맞아. 근데 여기 안내 문구는 다시 영어네... 짧아서 읽을 수는 있어.” — [screenshot](../../runs/cmp1-fix-ride-sfo-thanksgiving-seoyeon/shots/020-click.jpg) · [marked](../../runs/cmp1-fix-ride-sfo-thanksgiving-seoyeon/shots/020-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “🚕 SFO · Wed Nov 25 8:30am 멤버 2명” on /chats/:id in plain language (and check the Korean UI). Personas said they wanted: “시스템 메시지도 한국어로”.

### 52. Hard to find on / — “Add classes”

- **Type** Hard to find · **severity** max 1, median 1 · **1 persona(s)**: minji-freshman-17 · scenarios: timetable-add-classes · fingerprint `a3de046c1163`
- minji-freshman-17 (step 1, sev 1): “오 여기 있네. 'Add your classes so they can find you' — 좀 아래 숨어있긴 한데 ok” — [screenshot](../../runs/cmp1-fix-timetable-add-classes-minji/shots/001-scroll.jpg) · [marked](../../runs/cmp1-fix-timetable-add-classes-minji/shots/001-scroll-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“Add classes”) where they looked (/); label icon-only controls. Personas said they wanted: “show Add classes near the top, not under all the free food cards”.

## Automatic checks (harness)

| screen | device | tap targets < 44px (max) | sideways overflow | broken images |
|---|---|---|---|---|
| `/community?tab=opportunities` | phone | 17 — e.g. Notifications 40×40, Messages 40×40, Me 32×32 | — | — |
| `/community` | phone | 15 — e.g. Notifications 40×40, Messages 40×40, Me 32×32 | — | — |
| `/discover` | phone | 12 — e.g. 알림 40×40, 메시지 40×40, 프로필 32×32 | — | — |
| `/rides` | phone | 12 — e.g. 뒤로 40×40, Find a ride 173×36, My rides 173×36 | — | — |
| `/` | phone | 10 — e.g. Filters 40×40, Notifications 40×40, Messages 40×40 | — | — |
| `/start` | phone | 8 — e.g. Back 40×40, Stanford University 148×36, UCLA 62×36 | — | — |
| `/orgs/:id` | phone | 8 — e.g. Back 40×40, Messages 40×40, About 56×28 | — | — |
| `/orgs/:id?tab=recruit` | phone | 8 — e.g. Back 40×40, Messages 40×40, About 56×28 | — | — |
| `/orgs/:id?tab=events` | phone | 8 — e.g. Back 40×40, Messages 40×40, About 56×28 | — | — |
| `/orgs/:id?tab=members` | phone | 8 — e.g. Back 40×40, Messages 40×40, About 56×28 | — | — |
| `/chats` | phone | 7 — e.g. Back 40×40, Notifications 40×40, Direct 56×28 | — | — |
| `/chats?tab=activity` | phone | 7 — e.g. Back 40×40, Notifications 40×40, Direct 56×28 | — | — |
| `/settings` | phone | 7 — e.g. Back 40×40, Allow 69×36, Open 66×36 | — | — |
| `/timetable` | phone | 7 — e.g. Back 40×40, Friends 92×28, Class 88×36 | — | — |
| `/profile` | phone | 6 — e.g. Notifications 40×40, Messages 40×40, Me 32×32 | — | — |
| `/welcome` | phone | 4 — e.g. Sign in 46×21, Terms of Use 76×15, Privacy Policy 180×33 | — | — |
| `/chats/:id` | phone | 3 — e.g. Back 40×40, Menu 40×40, Switch to the classic design 158×32 | — | — |
| `/rides/:id` | phone | 3 — e.g. 뒤로 40×40, More 40×40, Switch to the classic design 158×32 | — | — |
