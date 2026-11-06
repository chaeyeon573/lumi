# ux-sim run `cmp2ha-new-lunch-today-diego`

> **AI simulation — hypotheses, not measured user behaviour.** One simulated persona; nothing here is a rate or a measurement of real students.

| | |
|---|---|
| Persona | **Diego**, 21 — Junior (transfer from Laney College) · phone 390×844 · prefers en · tech medium (`diego-transfer-commuter`) |
| Scenario | **Find someone to get lunch with today** — It's a weekday and you'd rather not eat lunch alone again. Use the app to find someone (or a group) to get lunch with today, and let them know you're in. (`lunch-today`) |
| Target | local · http://localhost:44295 · worktree commit `a3f2ebed58f4` |
| Outcome | **success** · ended by persona |
| Account | fresh real account `diego.iegoye2z@berkeley.edu` (Diego, Civil Engineering, born 2005; sample: false) · peers seeded: Hana, Leo |
| Goal check (fixed, by harness) | met at step 5 after 3 action(s) — evidence: joined or asked to join a peer's lunch plan; joined or asked to join a plan — _During the run the persona's own account joined/requested one of today's lunch plans, posted its own meal plan for today, or messaged in a lunch plan's chat._ |
| Persona's reason | “Joined Hana's Crossroads lunch from Meetups with a clear Join button and messaged her in the group chat.” |
| Effort | 5/32 actions · objective frustration 0.00/4 · 0 confused note(s) · ~33s simulated |
| Drop-off risk | **medium** _(AI hypothesis, persona agent)_ — Lunch was quick; still no sign of study partners or rides for my commute · basis: steps 1, 5 |

<details><summary>Known environment limits (not UX findings)</summary>

- Dining menus and RSF gym crowd levels need live campus sources (the local stack runs with CAMPUS_LIVE=0) — empty or missing data there is not a UX bug.
- AI features (Ask Lumi, AI profile draft on /start, conversation starters) need an OpenAI key; none is configured locally.
- Course catalog is the real Berkeley Class Schedule (6588 courses, Fall 2026 + Spring 2027), fetched 2026-11-02 with the worker's adapter. Seat counts and very recent changes may differ from live.
- Campus events, free food, internships, hackathons and scholarships are a read-only snapshot of live (1119 real items, 103 events this week, taken 2026-11-02 07:25 UTC) plus the CSV calendar. Nothing new appears during the run; Q&A and reviews are empty.
- No e-mail is sent: the sign-up / sign-in code is shown on screen in the hint (live sends a real e-mail).
- Real-time updates (SSE) work locally; other people never reply unless the stack was started with --autoreply.
- Signed in as a brand-new real (non-sample, e-mail-verified) account made for this run. Other students exist only if the scenario seeds peers (local fixtures); sample profiles are hidden from real accounts, as on live.

</details>

## Friction

| # | step | type | sev | persona says | screen | element | env-limited | evidence |
|---|---|---|---|---|---|---|---|---|
| f1 | 5 | Unclear wording | 1 | “Done. Big 'Open Group Chat' button. Still says 'Join to get the group chat' under it though — I already joined.” | `/activities/:id` | Group chat | no | [shot](shots/005-click.jpg) [marked](shots/005-click-som.jpg) |

<sub>Severity: 1 = Minor — noticed it, cosmetic or a small annoyance; did not slow me down. · 2 = Moderate — slowed me down or made me hesitate; I recovered on my own. · 3 = Major — real confusion, a wrong path or many extra steps; I nearly gave up or only got through by guessing. · 4 = Blocker — I could not continue, gave up, or would stop using the app here.</sub>

## Timeline

| step | what | screen | ms | signals / notes | shot |
|---|---|---|---|---|---|
| 0 | start | `/` | 932 |  | <a href="shots/000-start-som.jpg"><img src="shots/000-start.jpg" width="110"></a> |
| 1 | click “Meetups” | `/social/meetups` | 866 | expects: “people doing meetups, maybe a lunch” (0.6)<br>as expected<br>_curious_: “Two lunches. 'Lunch' tag right on them, nice and clear. 6:20 PM though.” | <a href="shots/001-click-som.jpg"><img src="shots/001-click.jpg" width="110"></a> |
| 3 | click “Lunch Lunch at Crossroads — anyone want ” | `/activities/:id` | 831 | expects: “details of the Crossroads lunch and a join button” (0.7)<br>as expected<br>_curious_: “Join Meetup — obvious. 1 going, 4 spots, campus-wide. Good.” | <a href="shots/003-click-som.jpg"><img src="shots/003-click.jpg" width="110"></a> |
| 5 | click “Join Meetup” | `/activities/:id` | 826 | expects: “I'm added to her lunch and can message her” (0.8)<br>as expected<br>_delighted_: “Done. Big 'Open Group Chat' button. Still says 'Join to get the group chat' under it though — I already joined.” → f1 | <a href="shots/005-click-som.jpg"><img src="shots/005-click.jpg" width="110"></a> |
| 7 | click “Open Group Chat” | `/chats/:id` | 826 | expects: “the group chat for this lunch” (0.85)<br>as expected<br>_neutral_: “Chat's open. I'll say I'm coming.” | <a href="shots/007-click-som.jpg"><img src="shots/007-click.jpg" width="110"></a> |
| 9 | type “Message” ← “Hey Hana, I'm in — see you at Crossroads” | `/chats/:id` | 859 | expects: “message sent in the chat” (0.8)<br>as expected<br>_neutral_: “Sent. Clean and quick. Still lunch at 6pm, whatever.” | <a href="shots/009-type-som.jpg"><img src="shots/009-type.jpg" width="110"></a> |
| 11 | finish | `/chats/:id` |  |  | <a href="shots/011-finish-som.jpg"><img src="shots/011-finish.jpg" width="110"></a> |

## Automatic checks (harness, not persona)

| screen | tap targets < 44px | sideways overflow | broken images |
|---|---|---|---|
| `/` | 6 (Search 40×40, Notifications 40×40, Messages 40×40, See all 55×20, View source 90×19) | — | — |
| `/social/meetups` | 7 (Notifications 40×40, Messages 40×40, Create 100×36, All 49×36, My Groups 102×36) | — | — |
| `/activities/:id` | 6 (Back 40×40, More 40×40, Hosted by Hana · Lunch 160×22) | — | — |
| `/chats/:id` | 2 (Back 40×40, More 40×40) | — | — |

## Timing (harness)

- Full page load (navigation timing): 125 ms
