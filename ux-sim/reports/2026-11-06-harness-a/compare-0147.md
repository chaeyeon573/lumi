# ux-sim compare — 2026-11-06 01:47 UTC

> **AI simulation — hypotheses, not measured user behaviour.** One run per cell is an anecdote, not a trend — re-run a cell a few times before trusting a change.

Before (base): 7 run(s), app 2567ab7395d4 · After (harness-a): 7 run(s), app a3f2ebed58f4 · harness 6f174347960d

## Persona × scenario

| persona | scenario | before | after | actions to goal (before → after) | friction before → after | change |
|---|---|---|---|---|---|---|
| aisha-firstgen-anxious | find-a-club | success | success | 2 → 2 | ux_confusion 1, discoverability 1, trust_privacy 1 → content_gap 1, copy 2 | same |
| diego-transfer-commuter | lunch-today | success | success | 3 → 3 | copy 1 → copy 1 | same |
| marcus-senior-lowtech | first-open-decide | success | success | 20 → 24 | onboarding 1, trust_privacy 1 → onboarding 1, content_gap 1, copy 1 | worse (more actions to goal) |
| minji-freshman-17 | cold-start-hangout | abandoned | success | — → 25 | onboarding 1, motivation 1, content_gap 2 → ux_confusion 1, onboarding 1, content_gap 2 | better (goal reached more often) |
| minji-freshman-17 | timetable-add-classes | success | success | 6 → 5 | ux_confusion 1, discoverability 1, copy 1 → — | better (fewer actions to goal) |
| priya-phd-desktop | internship-near-berkeley | success | success | 4 → 3 | motivation 1, content_gap 1 → ux_confusion 1, discoverability 1, motivation 1 | better (fewer actions to goal) |
| seoyeon-exchange-korean | ride-sfo-thanksgiving | success | abandoned | 9 → — | copy 2 → discoverability 1, content_gap 2 | worse (goal reached less often) |

## Resolved (not seen again in re-tested scenarios) — 16

- `d56357a742fa` Missing / empty content on /people/explore — “Invite friends” — sev 4, minji-freshman-17
- `d80495a57f74` Trust / privacy worry on /orgs/:id — “Ask to join” — sev 3, aisha-firstgen-anxious
- `b671f45c6bb2` Confusing UI on /orgs/:id?tab=recruit — “Recruiting” — sev 3, aisha-firstgen-anxious
- `8a0bf61f729f` Onboarding friction on /start — “Skip” — sev 2, minji-freshman-17
- `8bb560735e71` No reason to stay on / — “Campus event Grad Student Appreciation P” — sev 2, minji-freshman-17
- `9c8f7a48cd72` Missing / empty content on /meet/meetups — sev 2, minji-freshman-17
- `e2f05b7465c0` Trust / privacy worry on /start — “2005” — sev 2, marcus-senior-lowtech
- `d3b01943595d` Onboarding friction on /start — “None for now” — sev 2, marcus-senior-lowtech
- `6346e7cbb6c1` Missing / empty content on /opportunities/:id — “Start a prep crew e.g. Interview prep · ” — sev 2, priya-phd-desktop
- `c839eaceb32e` Unclear wording on /rides — “Find a ride” — sev 2, seoyeon-exchange-korean
- `abbbb40d845c` Hard to find on /explore/clubs — sev 1, aisha-firstgen-anxious
- `78bb102ba0f1` Unclear wording on /chats/:id — sev 1, diego-transfer-commuter
- `b94b701b00c1` Unclear wording on /profile — “My rides Airports, groceries, SF, Tahoe” — sev 1, seoyeon-exchange-korean
- `f44b69218f53` Hard to find on /schedule — “My timetable” — sev 1, minji-freshman-17
- `a104f66ab71e` Confusing UI on /timetable — “Add lecture only” — sev 1, minji-freshman-17
- `a0f2ea5c4667` Unclear wording on /timetable — sev 1, minji-freshman-17

## Still present — 1

- `4d28c4b04f0f` No reason to stay on / — sev 1 → 1, priya-phd-desktop

## New — 16

- `673d175397b9` Missing / empty content on /meetups/new — “모임 만들기” — sev 4, seoyeon-exchange-korean
- `437a7795dcb2` Missing / empty content on /social/people — “친구 초대” — sev 3, minji-freshman-17
- `5cea59c4df99` Hard to find on /social/meetups — sev 3, seoyeon-exchange-korean
- `bd87967c28f4` Missing / empty content on /search — “행사, 사람, 동아리 검색…” — sev 3, seoyeon-exchange-korean
- `e4346cedfac4` Onboarding friction on /start/what — “계속” — sev 2, minji-freshman-17
- `f499ce6cb47f` Missing / empty content on /social/meetups — sev 2, minji-freshman-17
- `3b0baf47bb8b` Confusing UI on /social/people — “갈래요” — sev 2, minji-freshman-17
- `8151a7027a56` Unclear wording on /orgs/:id — sev 2, aisha-firstgen-anxious
- `919841c6195c` Missing / empty content on /orgs/:id?tab=events — “Events” — sev 2, aisha-firstgen-anxious
- `6a8b724870e4` Missing / empty content on /guest/explore/opportunities — “Internship Oil and Gas Bond Reviews and ” — sev 2, marcus-senior-lowtech
- `3cac57534b9b` Onboarding friction on /start/what — “Continue” — sev 2, marcus-senior-lowtech
- `df7b2a2fea8f` Hard to find on /explore/opportunities — “Internships” — sev 2, priya-phd-desktop
- `efe3a99b03a1` Confusing UI on /opportunities/:id — “I applied” — sev 2, priya-phd-desktop
- `2da294b75311` Unclear wording on /explore/clubs — “Ending soon” — sev 1, aisha-firstgen-anxious
- `e8f92cdd453e` Unclear wording on /welcome — sev 1, marcus-senior-lowtech
- `3d5404e260fd` Unclear wording on /activities/:id — “Group chat” — sev 1, diego-transfer-commuter

## Not re-tested (scenario not in the after set) — 0

