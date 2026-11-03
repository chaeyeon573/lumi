# ux-sim summary — 2026-11-03

> **AI simulation — hypotheses, not measured user behaviour.** AI personas drove a real browser. Counts are simulated personas, never rates; every risk below is a hypothesis to check with real students.

## Curated problems (analysis.json)

_Written by Scheduled orchestrating Claude session (https://claude.ai/code/session_01VX4jQF3M6doYf7VDXmTdrm). Heuristic clusters are below._

| sev | problem | personas | env-limited | fingerprints |
|---|---|---|---|---|
| 3 | **"Get in" goes straight into a 7-screen sign-up with no look around first; interests are asked twice** — The new onboarding (merged 2026-11-03) kept all earlier screens around the mockup's four steps, so it is still 7 screens before any content, with two overlappin | 4 | no | `97dda824b2fb` `4b8a0b8abefa` `8a0bf61f729f` `e53f5b5080fe` |
| 3 | **Welcome teasers and first "For you" cards are grad/career items for undergrads** — Teaser and For-you ranking ignore the role (undergrad) and the goals just picked; recent live events happen to be grad/career-heavy. | 3 | no | `b275c9c6f849` `8bb560735e71` `ed377ed9aef6` |
| 3 | **A brand-new account finds nobody to meet: Meetups and "Who's free right now" are empty** — Same as 2026-11-02: no fallback for an empty campus except "start one". | 2 | no | `e0347062be08` `6f0858be8842` `9c8f7a48cd72` |
| 3 | **Club says "Not recruiting right now" under a big "Ask to join"; nothing says what happens next** — CTA ignores recruiting state; no next-step copy. | 1 | no | `5b407b25b343` |
| 3 | **The club list opens with professional/Greek fraternities ("matches your interest in careers") before casual clubs** — Interest matching maps onboarding picks (e.g. "Discover opportunities") to careers, and the list leads with professional orgs. | 1 | no | `23547d742182` |
| 2 | **Sign-up says birth year is "never shown on your profile", but profiles show age and the privacy policy says so** — The hint was added in the 2026-11-03 onboarding change (claude/onboarding-4step) without checking the profile pages; it is factually wrong. | 1 | no | `4381a718da05` |
| 2 | **No Korean option on the welcome or sign-up screens; "Get in" does not read as sign-up** — Language switch only in Settings. | 1 | no | `a3cc6dcb6d19` |
| 2 | **Rides is never mentioned in the welcome or sign-up screens, and lives at the bottom of Meetups** — Goals and explainer cards list opportunities/classes/communities only. | 1 | no | `7f821b62f6e8` |
| 1 | **The floating Design pill covers real buttons ("My rides")** — Fixed pill over the top-right tab. | 1 | no | `39327c8d79c3` |

4 run(s) · 18 finding(s) (3 seen by ≥ 2 personas, 15 single events) · max severity **3** · severity 1/2/3/4: 8 / 12 / 6 / 0 · 0 environment-limited event(s) kept out of findings.

_These clusters are mechanical (screen + type + element). The curated problem list is `analysis.json` next to this file, written by the orchestrating session — see docs/ux-sim/ORCHESTRATE.md._

## Runs

| persona | scenario | auth | outcome | goal check | actions | friction (max sev) | drop-off risk (hypothesis) | report |
|---|---|---|---|---|---|---|---|---|
| aisha-firstgen-anxious | first-open-decide | none | abandoned | met (25 actions) | 31 | 8 (3) | medium — Sign-up was gentle and the school badge and privacy short version reassured her, but the first club experience felt résumé-first and the joi | [report](../../runs/sched-20261103-1915-aisha-first-open-decide/report.md) |
| jordan-sophomore-impatient | first-open-decide | none | abandoned | not met | 6 | 3 (3) | high — Never saw real content; the welcome teasers were grad-school research and a quantum talk, then a multi-step setup with a brochure screen. Ma | [report](../../runs/sched-20261103-1915-jordan-first-open-decide/report.md) |
| minji-freshman-17 | first-open-decide | none | abandoned | met (20 actions) | 22 | 7 (3) | high — Signed up for 'find someone for lunch', but after ~8 setup screens Home showed a grad party, Meetups said 'No meetups yet', and Who's free s | [report](../../runs/sched-20261103-1915-minji-first-open-decide/report.md) |
| seoyeon-exchange-korean | first-open-decide | none | success | met (19 actions) | 22 | 8 (2) | medium — Rides to SFO is exactly what I need so I'd come back near Thanksgiving, but no Korean, long onboarding and empty meetups/rides lists could m | [report](../../runs/sched-20261103-1915-seoyeon-first-open-decide/report.md) |

## Findings

_Clustered by screen + friction type + key element. Sorted by number of personas, then severity._

### 1. Onboarding friction on /start — “2005”

- **Type** Onboarding friction · **severity** max 2, median 2 · **4 persona(s)**: aisha-firstgen-anxious, jordan-sophomore-impatient, minji-freshman-17, seoyeon-exchange-korean · scenarios: first-open-decide · fingerprint `97dda824b2fb`
- aisha-firstgen-anxious (step 7, sev 2): “Wait, I haven't even seen any clubs yet and I'm already making a profile? I still don't really know what this app does. Also the privacy page I just read said my age shows on my profile, and this says it's never shown. Which one is true?” — [screenshot](../../runs/sched-20261103-1915-aisha-first-open-decide/shots/007-click.jpg) · [marked](../../runs/sched-20261103-1915-aisha-first-open-decide/shots/007-click-som.jpg)
- aisha-firstgen-anxious (step 25, sev 2): “Didn't I just answer this? I already said clubs and meeting people. This is the fifth screen and I still haven't seen a single club.” — [screenshot](../../runs/sched-20261103-1915-aisha-first-open-decide/shots/025-click.jpg) · [marked](../../runs/sched-20261103-1915-aisha-first-open-decide/shots/025-click-som.jpg)
- jordan-sophomore-impatient (step 2, sev 2): “wait I didn't even get to look around. 7 steps?? ugh.” — [screenshot](../../runs/sched-20261103-1915-jordan-first-open-decide/shots/002-click.jpg) · [marked](../../runs/sched-20261103-1915-jordan-first-open-decide/shots/002-click-som.jpg)
- minji-freshman-17 (step 2, sev 2): “아 바로 가입이네... I wanted to peek first. 7 steps?? birth year ok, says never shown, I'm 17 so fine” — [screenshot](../../runs/sched-20261103-1915-minji-first-open-decide/shots/002-click.jpg) · [marked](../../runs/sched-20261103-1915-minji-first-open-decide/shots/002-click-som.jpg)
- … 2 more
- **Suggested improvement (hypothesis):** Shorten or explain this sign-up step (/start); ask only what is needed now and let the rest wait until it is useful. Personas said they wanted: “let me peek at the clubs before signing up, and make the privacy page match what the form says about age”; “don't ask what I'm interested in twice; show me some clubs sooner”; “let me peek at clubs before making me sign up, or say how long setup is”; “let me look around before signing up”; “fewer setup screens before I see anything real”; “see what the app does (rides?) before signing up”.

### 2. No reason to stay on /welcome

- **Type** No reason to stay · **severity** max 1, median 1 · **3 persona(s)**: aisha-firstgen-anxious, jordan-sophomore-impatient, minji-freshman-17 · scenarios: first-open-decide · fingerprint `b275c9c6f849`
- aisha-firstgen-anxious (step 0, sev 1): “OK, '94 clubs' in the scrolling banner catches my eye, that's what I want. But the big headline is 'Who's free on campus right now?' and 'Find someone for lunch'... wait, is this a meetup app where strangers see when I'm free? The quantum colloquium and DOE grad research cards are not for a first-year like me.” — [screenshot](../../runs/sched-20261103-1915-aisha-first-open-decide/shots/000-start.jpg) · [marked](../../runs/sched-20261103-1915-aisha-first-open-decide/shots/000-start-som.jpg)
- jordan-sophomore-impatient (step 0, sev 1): “ok looks less dead than the other campus apps. 94 clubs, free food. but a DOE grad research thing as a teaser card? not me.” — [screenshot](../../runs/sched-20261103-1915-jordan-first-open-decide/shots/000-start.jpg) · [marked](../../runs/sched-20261103-1915-jordan-first-open-decide/shots/000-start-som.jpg)
- minji-freshman-17 (step 0, sev 1): “오 'Find someone for lunch' — that's literally what I want. but the other cards are grad research + quantum colloquium... 뭐지, is this for grad students?” — [screenshot](../../runs/sched-20261103-1915-minji-first-open-decide/shots/000-start.jpg) · [marked](../../runs/sched-20261103-1915-minji-first-open-decide/shots/000-start-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /welcome: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “show something for first-years looking for a club, not grad research deadlines”; “teaser cards that fit an undergrad, like a club or hackathon”; “show freshman-ish stuff on the welcome cards, not grad fellowships”.

### 3. Unclear wording on /start

- **Type** Unclear wording · **severity** max 2, median 2 · **2 persona(s)**: minji-freshman-17, seoyeon-exchange-korean · scenarios: first-open-decide · fingerprint `e53f5b5080fe`
- minji-freshman-17 (step 9, sev 2): “I picked 'Meet new people' and it shows internships first?? too much English text, 안 읽을래. skimming. also no 한국어 option anywhere” — [screenshot](../../runs/sched-20261103-1915-minji-first-open-decide/shots/009-click.jpg) · [marked](../../runs/sched-20261103-1915-minji-first-open-decide/shots/009-click-som.jpg)
- seoyeon-exchange-korean (step 9, sev 2): “영어가 너무 많아... 대충 읽으면 학교 이벤트, 수업, 동아리 앱이네. 공항 얘기는 여전히 없어.” — [screenshot](../../runs/sched-20261103-1915-seoyeon-first-open-decide/shots/009-click.jpg) · [marked](../../runs/sched-20261103-1915-seoyeon-first-open-decide/shots/009-click-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite the wording on /start in plain language (and check the Korean UI). Personas said they wanted: “show what I picked (meeting people / eating together) in 1 line, and a language switch”; “shorter text or Korean; mention rides/travel if it exists”.

### 4. No reason to stay on /explore/clubs — “KT Kappa Theta Pi ΚΘΠ · Professional co-”

- **Type** No reason to stay · **severity** max 3, median 3 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: first-open-decide · fingerprint `23547d742182`
- aisha-firstgen-anxious (step 42, sev 3): “Wait, 'matches your interest in careers'? I never said careers, I said clubs and meeting people. The first thing I see is professional fraternities and pre-law — that's exactly the résumé-club stuff I was scared of. Do you have to rush or apply for all of these?” — [screenshot](../../runs/sched-20261103-1915-aisha-first-open-decide/shots/042-click.jpg) · [marked](../../runs/sched-20261103-1915-aisha-first-open-decide/shots/042-click-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /explore/clubs: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “recommend based on what I actually picked, and show low-pressure, open-to-everyone clubs first; say if a club needs an application”.

### 5. Confusing UI on /orgs/:id?tab=recruit — “Ask to join”

- **Type** Confusing UI · **severity** max 3, median 3 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: first-open-decide · fingerprint `5b407b25b343`
- aisha-firstgen-anxious (step 51, sev 3): “Wait, does 'not recruiting' mean I can't join a hiking club right now? Then what does 'Ask to join' do — send them a message with my profile? I don't want to accidentally ask for something I'm not allowed to. This is exactly the unwritten-rules thing I don't know.” — [screenshot](../../runs/sched-20261103-1915-aisha-first-open-decide/shots/051-click.jpg) · [marked](../../runs/sched-20261103-1915-aisha-first-open-decide/shots/051-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Ask to join” on /orgs/:id?tab=recruit does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “tell me plainly: open to anyone / just show up / needs an application, and what 'Ask to join' sends and who sees it”.

### 6. Onboarding friction on /start — “Continue”

- **Type** Onboarding friction · **severity** max 3, median 3 · **1 persona(s)**: jordan-sophomore-impatient · scenarios: first-open-decide · fingerprint `4b8a0b8abefa`
- jordan-sophomore-impatient (step 9, sev 3): “ok and? I picked clubs and you show me a wall of text about clubs. 4 more dashes to go. boring.” — [screenshot](../../runs/sched-20261103-1915-jordan-first-open-decide/shots/009-click.jpg) · [marked](../../runs/sched-20261103-1915-jordan-first-open-decide/shots/009-click-som.jpg)
- **Suggested improvement (hypothesis):** Shorten or explain this sign-up step (/start); ask only what is needed now and let the rest wait until it is useful. Personas said they wanted: “after I pick clubs, show me actual clubs. skip the brochure”.

### 7. No reason to stay on / — “Campus event Grad Student Appreciation P”

- **Type** No reason to stay · **severity** max 3, median 3 · **1 persona(s)**: minji-freshman-17 · scenarios: first-open-decide · fingerprint `8bb560735e71`
- minji-freshman-17 (step 30, sev 3): “뭐지... where's the lunch thing I saw at the start? 'For you' = grad student party?? I'm 17 lol. not for me” — [screenshot](../../runs/sched-20261103-1915-minji-first-open-decide/shots/030-click.jpg) · [marked](../../runs/sched-20261103-1915-minji-first-open-decide/shots/030-click-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “show the 'find someone for lunch' / who's free thing from the welcome page right on home, and things for freshmen”.

### 8. Missing / empty content on /meet/meetups — “Create a Meetup”

- **Type** Missing / empty content · **severity** max 3, median 3 · **1 persona(s)**: minji-freshman-17 · scenarios: first-open-decide · fingerprint `e0347062be08`
- minji-freshman-17 (step 32, sev 3): “헐 nobody's here. I'm not gonna be the first one to make a meetup, I'm 17 and new, that's so awkward” — [screenshot](../../runs/sched-20261103-1915-minji-first-open-decide/shots/032-click.jpg) · [marked](../../runs/sched-20261103-1915-minji-first-open-decide/shots/032-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /meet/meetups is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “show some people / meetups from my dorm or year, even small ones”.

### 9. Missing / empty content on /meet/more

- **Type** Missing / empty content · **severity** max 3, median 3 · **1 persona(s)**: minji-freshman-17 · scenarios: first-open-decide · fingerprint `6f0858be8842`
- minji-freshman-17 (step 34, sev 3): “아 again empty. 'Who's free' but no one is shown, it just wants me to add my timetable or start something myself. rides to Tahoe?? 뭐야” — [screenshot](../../runs/sched-20261103-1915-minji-first-open-decide/shots/034-click.jpg) · [marked](../../runs/sched-20261103-1915-minji-first-open-decide/shots/034-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /meet/more is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “when I tap 'who's free', show actual students free now (ideally my dorm/year), not another menu”.

### 10. Trust / privacy worry on /privacy

- **Type** Trust / privacy worry · **severity** max 2, median 2 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: first-open-decide · fingerprint `4381a718da05`
- aisha-firstgen-anxious (step 2, sev 2): “The short version is actually reassuring, other users never see my email. But wait... who runs this? It literally says 'operator name — to be set'. Is this a real thing or someone's class project? That makes me nervous about giving my school email.” — [screenshot](../../runs/sched-20261103-1915-aisha-first-open-decide/shots/002-click.jpg) · [marked](../../runs/sched-20261103-1915-aisha-first-open-decide/shots/002-click-som.jpg)
- **Suggested improvement (hypothesis):** Explain who will see what on /privacy before asking for it. Personas said they wanted: “say who actually runs Lumi and a real contact email”.

### 11. Unclear wording on /welcome — “Get in →”

- **Type** Unclear wording · **severity** max 2, median 2 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: first-open-decide · fingerprint `a3cc6dcb6d19`
- seoyeon-exchange-korean (step 0, sev 2): “어... 'Who's free on campus right now?' 친구 찾는 앱인가? 한국어 설정은 안 보이네. 'Get in'... 가입하는 건가?” — [screenshot](../../runs/sched-20261103-1915-seoyeon-first-open-decide/shots/000-start.jpg) · [marked](../../runs/sched-20261103-1915-seoyeon-first-open-decide/shots/000-start-som.jpg)
- **Suggested improvement (hypothesis):** Rewrite “Get in →” on /welcome in plain language (and check the Korean UI). Personas said they wanted: “Korean language option on the first screen, and a clearer button like 'Sign up'”.

### 12. Missing / empty content on /start — “Meet new people Study, hang out, and mak”

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: first-open-decide · fingerprint `7f821b62f6e8`
- seoyeon-exchange-korean (step 6, sev 2): “음... 공항 가는 거, 같이 우버 타는 건 없네. 'Meet new people... make plans'가 제일 가까운 것 같아. RSF는 뭐지?” — [screenshot](../../runs/sched-20261103-1915-seoyeon-first-open-decide/shots/006-click.jpg) · [marked](../../runs/sched-20261103-1915-seoyeon-first-open-decide/shots/006-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /start is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “an option like 'Rides / travel together' for students going home or to the airport”.

### 13. Onboarding friction on /start — “Skip”

- **Type** Onboarding friction · **severity** max 2, median 2 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: first-open-decide · fingerprint `8a0bf61f729f`
- seoyeon-exchange-korean (step 17, sev 2): “또 질문... 이메일은 언제 해? 그냥 Skip 할래.” — [screenshot](../../runs/sched-20261103-1915-seoyeon-first-open-decide/shots/017-click.jpg) · [marked](../../runs/sched-20261103-1915-seoyeon-first-open-decide/shots/017-click-som.jpg)
- **Suggested improvement (hypothesis):** Shorten or explain this sign-up step (/start); ask only what is needed now and let the rest wait until it is useful. Personas said they wanted: “fewer questions before I can see the app”.

### 14. Missing / empty content on /meet/meetups

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: first-open-decide · fingerprint `9c8f7a48cd72`
- seoyeon-exchange-korean (step 32, sev 2): “아무도 없네... 근데 'Rides' 보인다! 이거다.” — [screenshot](../../runs/sched-20261103-1915-seoyeon-first-open-decide/shots/032-click.jpg) · [marked](../../runs/sched-20261103-1915-seoyeon-first-open-decide/shots/032-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /meet/meetups is really missing (or only missing in the test environment); avoid showing empty sections. Personas said they wanted: “see some existing meetups so it feels alive”.

### 15. Trust / privacy worry on /start — “Cultural / Identity”

- **Type** Trust / privacy worry · **severity** max 1, median 1 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: first-open-decide · fingerprint `c1f6ce01874e`
- aisha-firstgen-anxious (step 29, sev 1): “Hmm, I'm not part of any club yet, that's the whole reason I'm here. I do live in a dorm though. I won't tick 'Cultural / Identity' because I don't know who would see that on my profile.” — [screenshot](../../runs/sched-20261103-1915-aisha-first-open-decide/shots/029-click.jpg) · [marked](../../runs/sched-20261103-1915-aisha-first-open-decide/shots/029-click-som.jpg)
- **Suggested improvement (hypothesis):** Explain who will see what when tapping “Cultural / Identity” on /start before asking for it. Personas said they wanted: “say whether these show on my profile”.

### 16. No reason to stay on / — “Campus event Careers in Consumer Protect”

- **Type** No reason to stay · **severity** max 1, median 1 · **1 persona(s)**: aisha-firstgen-anxious · scenarios: first-open-decide · fingerprint `ed377ed9aef6`
- aisha-firstgen-anxious (step 40, sev 1): “Clubs & Groups is right there, good. But 'For you' is a law job panel? I said clubs and campus events, not careers. And the Design/Feedback buttons are sitting on top of the card.” — [screenshot](../../runs/sched-20261103-1915-aisha-first-open-decide/shots/040-click.jpg) · [marked](../../runs/sched-20261103-1915-aisha-first-open-decide/shots/040-click-som.jpg)
- **Suggested improvement (hypothesis):** Give a reason to stay on /: show real people or things happening now (or a clear next step) instead of empty or generic content. Personas said they wanted: “'For you' should reflect what I picked: clubs and welcoming events”.

### 17. Confusing UI on /start — “Undergraduate Bachelor’s student”

- **Type** Confusing UI · **severity** max 1, median 1 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: first-open-decide · fingerprint `99d3b468357d`
- seoyeon-exchange-korean (step 14, sev 1): “교환학생은 어디 골라야 하지? Undergraduate 맞겠지... 'Exchange student' 같은 건 없네.” — [screenshot](../../runs/sched-20261103-1915-seoyeon-first-open-decide/shots/014-click.jpg) · [marked](../../runs/sched-20261103-1915-seoyeon-first-open-decide/shots/014-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Undergraduate Bachelor’s student” on /start does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “an 'Exchange / visiting student' role”.

### 18. Bug on /rides — “My rides”

- **Type** Bug · **severity** max 1, median 1 · **1 persona(s)**: seoyeon-exchange-korean · scenarios: first-open-decide · fingerprint `39327c8d79c3`
- seoyeon-exchange-korean (step 35, sev 1): “위에 'Design' 버튼이 'My rides'를 가려서 잘 안 보여.” — [screenshot](../../runs/sched-20261103-1915-seoyeon-first-open-decide/shots/035-click.jpg) · [marked](../../runs/sched-20261103-1915-seoyeon-first-open-decide/shots/035-click-som.jpg)
- **Suggested improvement (hypothesis):** Reproduce from the evidence steps on /rides (around “My rides”) and fix it; add a regression check for that screen. Personas said they wanted: “the Design pill should not cover the My rides tab”.

## Automatic checks (harness)

| screen | device | tap targets < 44px (max) | sideways overflow | broken images |
|---|---|---|---|---|
| `/meet/more` | phone | 13 — e.g. Create 40×40, Notifications 40×40, Messages 40×40 | — | — |
| `/rides` | phone | 13 — e.g. Back 40×40, Find a ride 173×36, My rides 173×36 | — | — |
| `/meet/meetups` | phone | 10 — e.g. Create 36×36, Notifications 40×40, Messages 40×40 | — | — |
| `/explore/clubs` | phone | 9 — e.g. Back 40×40, All 37×28, Clubs 55×28 | — | — |
| `/orgs/:id` | phone | 8 — e.g. Back 40×40, Messages 40×40, About 56×28 | — | — |
| `/orgs/:id?tab=recruit` | phone | 8 — e.g. Back 40×40, Messages 40×40, About 56×28 | — | — |
| `/welcome` | phone | 4 — e.g. Sign in 46×21, Terms of Use 76×15, Privacy Policy 180×33 | — | — |
| `/start` | phone | 4 — e.g. Back 40×40, Switch to the classic design 158×32 | — | — |
| `/` | phone | 3 — e.g. See all 62×21, Feedback 93×32, Switch to the classic design 158×32 | — | — |
| `/privacy` | phone | 2 — e.g. Back 40×40, Switch to the classic design 158×32 | — | — |
