# ux-sim run `cmp2ha-new-timetable-add-classes-minji`

> **AI simulation — hypotheses, not measured user behaviour.** One simulated persona; nothing here is a rate or a measurement of real students.

| | |
|---|---|
| Persona | **Minji**, 17 — First-year (started college a year early) · phone 390×844 · prefers ko · tech high (`minji-freshman-17`) |
| Scenario | **Put my classes into my timetable** — You want the app to know your schedule so it can show who's free when you are. Add your calculus class — Calculus I, which you know as MATH 1A — to your timetable in the app. (`timetable-add-classes`) |
| Target | local · http://localhost:40383 · worktree commit `a3f2ebed58f4` |
| Outcome | **success** · ended by persona |
| Account | fresh real account `minji.injizzcp@berkeley.edu` (Minji, Undeclared, born 2009; sample: false) |
| Goal check (fixed, by harness) | met at step 11 after 5 action(s) — evidence: Calculus I is in my saved timetable — _The persona's own timetable (server-side) gained Calculus I (MATH 51 / MATH 1A) during the run._ |
| Persona's reason | “MATH 51 (전 1A) 시간표에 넣었어. 바로 시간표 화면이라 쉬웠음.” |
| Effort | 5/40 actions · objective frustration 0.50/4.5 · 0 confused note(s) · ~22s simulated |
| Drop-off risk | **medium** _(AI hypothesis, persona agent)_ — Adding was easy, but nothing shows people my age or my dorm yet · basis: steps 11 |

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

_No friction events were logged._

## Timeline

| step | what | screen | ms | signals / notes | shot |
|---|---|---|---|---|---|
| 0 | start | `/` | 932 | _neutral_: “영어 많네.. 시간표는 Schedule 이겠지” | <a href="shots/000-start-som.jpg"><img src="shots/000-start.jpg" width="110"></a> |
| 2 | click “Schedule” | `/schedule` | 859 | expects: “my timetable where I can add classes” (0.7)<br>as expected<br>_delighted_: “오 바로 시간표다. Add Classes 누르면 되겠다” | <a href="shots/002-click-som.jpg"><img src="shots/002-click.jpg" width="110"></a> |
| 4 | click “Add Classes” | `/schedule/classes` | 840 | expects: “search for a class” (0.85)<br>as expected<br>_neutral_: “검색창. 'like MATH 51'? 내꺼 1A인데.. 일단 1A 쳐보자” | <a href="shots/004-click-som.jpg"><img src="shots/004-click.jpg" width="110"></a> |
| 6 | type “Course code or name, like MATH 51” ← “MATH 1A” | `/schedule/classes` | 845 | expects: “Calculus shows up” (0.7)<br>as expected<br>_curious_: “formerly 1A 써있다 ㅇㅋ. 9:30 거” | <a href="shots/006-type-som.jpg"><img src="shots/006-type.jpg" width="110"></a> |
| 8 | click “MATH 51 Calculus I (formerly MATH 1A) (L” | `/schedule/classes` | 2844 | expects: “it gets added or asks for section” (0.6)<br>**mismatch**: asks for discussion section, says optional, Add Class button<br>⚑ mismatch | <a href="shots/008-click-som.jpg"><img src="shots/008-click.jpg" width="110"></a> |
| 9 | observe | `/schedule/classes` |  | _neutral_: “섹션 optional 이라네. 그냥 Add Class” | <a href="shots/009-observe-som.jpg"><img src="shots/009-observe.jpg" width="110"></a> |
| 11 | click “Add Class” | `/schedule` | 825 | expects: “math class added to my timetable” (0.8)<br>as expected<br>_delighted_: “들어갔다! 깔끔하네” | <a href="shots/011-click-som.jpg"><img src="shots/011-click.jpg" width="110"></a> |
| 13 | finish | `/schedule` |  |  | <a href="shots/013-finish-som.jpg"><img src="shots/013-finish.jpg" width="110"></a> |

## Automatic checks (harness, not persona)

| screen | tap targets < 44px | sideways overflow | broken images |
|---|---|---|---|
| `/` | 6 (Search 40×40, Notifications 40×40, Messages 40×40, See all 55×20, View source 90×19) | — | — |
| `/schedule` | 3 (Add or edit classes 40×40, Previous week 36×36, Next week 36×36) | — | — |
| `/schedule/classes` | 9 (Back 40×40, Fall 2026 90×36, Spring 2027 109×36, Course code or name, like MATH 51 295×23, Mon 51×32) | — | — |

## Timing (harness)

- Full page load (navigation timing): 131 ms
