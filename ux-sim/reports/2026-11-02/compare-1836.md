# ux-sim compare — 2026-11-02 18:36 UTC

> **AI simulation — hypotheses, not measured user behaviour.** One run per cell is an anecdote, not a trend — re-run a cell a few times before trusting a change.

Before (base): 7 run(s), app 7af1c8ef2cfd · After (fix): 7 run(s), app 1a1a69501453 · harness 6f174347960d

## Persona × scenario

| persona | scenario | before | after | actions to goal (before → after) | friction before → after | change |
|---|---|---|---|---|---|---|
| aisha-firstgen-anxious | find-a-club | success | abandoned | 4 → 9 | ux_confusion 2, discoverability 1, motivation 1, content_gap 4, trust_privacy 1, copy 2 → ux_confusion 3, discoverability 2, content_gap 1, trust_privacy 1 | worse (more actions to goal) |
| diego-transfer-commuter | lunch-today | success | success | 1 → 1 | bug 1, ux_confusion 1, motivation 1 → ux_confusion 2 | same |
| marcus-senior-lowtech | first-open-decide | abandoned | abandoned | — → 13 | onboarding 1, trust_privacy 3 → ux_confusion 1, onboarding 2, discoverability 2, motivation 1, trust_privacy 1 | better (goal reached more often) |
| minji-freshman-17 | cold-start-hangout | abandoned | success | — → 26 | onboarding 1, content_gap 1, trust_privacy 1, copy 1 → onboarding 4, content_gap 2 | better (goal reached more often) |
| minji-freshman-17 | timetable-add-classes | success | success | 7 → 7 | ux_confusion 1, performance 1, copy 1 → ux_confusion 2, discoverability 1, performance 1 | same |
| priya-phd-desktop | internship-near-berkeley | success | success | 5 → 7 | motivation 2, content_gap 2 → bug 1, discoverability 2, motivation 1, content_gap 1 | worse (more actions to goal) |
| seoyeon-exchange-korean | ride-sfo-thanksgiving | success | success | 8 → 9 | bug 1, copy 2 → copy 3 | worse (more actions to goal) |

## Resolved (not seen again in re-tested scenarios) — 23

- `67ca16898d6c` Missing / empty content on / — “Invite friends” — sev 3, minji-freshman-17, aisha-firstgen-anxious
- `37ba6e6b85d0` Trust / privacy worry on /start — “🎉 Out with people” — sev 4, marcus-senior-lowtech
- `d80495a57f74` Trust / privacy worry on /orgs/:id — “Ask to join” — sev 3, aisha-firstgen-anxious
- `b671f45c6bb2` Confusing UI on /orgs/:id?tab=recruit — “Recruiting” — sev 3, aisha-firstgen-anxious
- `94527b529e80` Trust / privacy worry on /start — “Next” — sev 3, marcus-senior-lowtech
- `fe75fc995a42` Onboarding friction on /start — “e.g. Computer Science” — sev 2, minji-freshman-17
- `919841c6195c` Missing / empty content on /orgs/:id?tab=events — “Events” — sev 2, aisha-firstgen-anxious
- `6de492d10b73` Missing / empty content on /orgs/:id?tab=members — “Members” — sev 2, aisha-firstgen-anxious
- `bbab628dceb5` Hard to find on /community?tab=opportunities — “Show more (7)” — sev 2, aisha-firstgen-anxious
- `68c8e67b425d` Missing / empty content on /orgs/:id — “About” — sev 2, aisha-firstgen-anxious
- `c001ec879684` Trust / privacy worry on /welcome — sev 2, marcus-senior-lowtech
- `c839eaceb32e` Unclear wording on /rides — “Find a ride” — sev 2, seoyeon-exchange-korean
- `e53f5b5080fe` Unclear wording on /start — sev 1, minji-freshman-17
- `f4cafbbabf74` No reason to stay on /community?tab=opportunities — “For you” — sev 1, aisha-firstgen-anxious
- `52228e162ff2` Unclear wording on /community?tab=opportunities — “Clubs” — sev 1, aisha-firstgen-anxious
- `892104e2a76a` Unclear wording on /community?tab=opportunities — “Associations” — sev 1, aisha-firstgen-anxious
- `bc1b938d7552` Missing / empty content on /community?tab=opportunities — “🔬 Syracuse iSchool ASSURE-REU: Text Ana” — sev 1, priya-phd-desktop
- `5a069545d718` No reason to stay on /opportunities/:id — “Start a prep crew e.g. Interview prep · ” — sev 1, priya-phd-desktop
- `0f09a767aea4` Missing / empty content on /opportunities/:id — “Official source Lyft careers Last verifi” — sev 1, priya-phd-desktop
- `5b3363c14dd9` No reason to stay on / — “I'm in” — sev 1, diego-transfer-commuter
- `44271af15761` Bug on /chats/:id — “Switch to the classic design” — sev 1, diego-transfer-commuter
- `39327c8d79c3` Bug on /rides — “My rides” — sev 1, seoyeon-exchange-korean
- `1ffc6e246d69` Unclear wording on /timetable — “MATH 51 Calculus I (formerly MATH 1A) (L” — sev 1, minji-freshman-17

## Still present — 8

- `97dda824b2fb` Onboarding friction on /start — sev 2 → 2, minji-freshman-17, marcus-senior-lowtech
- `f634db6cc171` Confusing UI on /timetable — “MATH 51 Calculus I (formerly MATH 1A) (L” — sev 1 → 2, minji-freshman-17
- `e2f05b7465c0` Trust / privacy worry on /start — sev 2 → 2, marcus-senior-lowtech
- `51aeaa92565b` Confusing UI on /chats — “Direct” — sev 2 → 2, diego-transfer-commuter
- `e8b25109cb47` Confusing UI on /community?tab=opportunities — “🤖 Machine Learning at Berkeley Undergra” — sev 1 → 1, aisha-firstgen-anxious
- `4d28c4b04f0f` No reason to stay on / — sev 2 → 1, priya-phd-desktop
- `f21a384a224b` Unclear wording on /profile — “Find a class to watch” — sev 1 → 1, seoyeon-exchange-korean
- `a8499911c15f` Slow on /timetable — “Add lecture only” — sev 2 → 1, minji-freshman-17

## New — 21

- `f0b0e987903d` Hard to find on /community — “Campus” — sev 2, aisha-firstgen-anxious, priya-phd-desktop
- `30bfb5a984ca` Missing / empty content on / — “People” — sev 3, minji-freshman-17
- `ab8767625de9` Confusing UI on /orgs/:id — “Get updates” — sev 3, aisha-firstgen-anxious
- `8a0bf61f729f` Onboarding friction on /start — “Skip” — sev 2, minji-freshman-17
- `acb4cc579834` Missing / empty content on / — “🐱 You going” — sev 2, minji-freshman-17
- `706b176473be` Hard to find on /discover — “Teams” — sev 2, aisha-firstgen-anxious
- `3b5ac628f93c` Missing / empty content on /community?tab=opportunities — “📊 Berkeley Consulting Undergraduate man” — sev 2, aisha-firstgen-anxious
- `518c68aff2a6` Confusing UI on /welcome — sev 2, marcus-senior-lowtech
- `d9636172c04a` Hard to find on / — “Discover” — sev 2, marcus-senior-lowtech
- `b9d1ee526d80` Hard to find on /discover — “Discover” — sev 2, marcus-senior-lowtech
- `43ed8165cecc` Hard to find on /community?tab=opportunities — “Browse” — sev 2, priya-phd-desktop
- `6d922472ea26` Missing / empty content on /opportunities/:id — “Details” — sev 2, priya-phd-desktop
- `8551c6209604` Confusing UI on / — “Go together” — sev 1, aisha-firstgen-anxious
- `942b79d6055c` Trust / privacy worry on /community?tab=opportunities — “🥾 Cal Hiking and Outdoor Society (CHAOS” — sev 1, aisha-firstgen-anxious
- `f3a9ac15eb35` Onboarding friction on /start — “Back” — sev 1, marcus-senior-lowtech
- `f98a48434400` No reason to stay on /start — “🧭 Upperclassmen who’ve been there” — sev 1, marcus-senior-lowtech
- `c4d7ce393786` Bug on /community?tab=opportunities — “Location” — sev 1, priya-phd-desktop
- `ca00bd1ad3db` Confusing UI on / — sev 1, diego-transfer-commuter
- `b94b701b00c1` Unclear wording on /profile — “My rides Airports, groceries, SF, Tahoe” — sev 1, seoyeon-exchange-korean
- `dcaa93c37b46` Unclear wording on /chats/:id — “🚕 SFO · Wed Nov 25 8:30am 멤버 2명” — sev 1, seoyeon-exchange-korean
- `a3de046c1163` Hard to find on / — “Add classes” — sev 1, minji-freshman-17

## Not re-tested (scenario not in the after set) — 0

