# ux-sim summary — 2026-11-02

> **AI simulation — hypotheses, not measured user behaviour.** AI personas drove a real browser. Counts are simulated personas, never rates; every risk below is a hypothesis to check with real students.

1 run(s) · 4 finding(s) · 0 environment-limited event(s) kept out of findings.

## Runs

| persona | scenario | outcome | goal check | actions | drop-off risk (hypothesis) | report |
|---|---|---|---|---|---|---|
| minji-freshman-17 | lunch-today | success | met (1 actions) | 5 | medium — Harness heuristic, not a measurement: 1 severity≥3 event(s), objective frustration 0.50/4.5, 2 confused note(s). | [report](../../runs/smoke-minji-lunch-today/report.md) |

## Findings

_Clustered by screen + friction type + key element. Sorted by number of personas, then severity._

### 1. Confusing UI on / — “I'm in”

- **Type** Confusing UI · **severity** max 3, median 3 · **1 persona(s)**: minji-freshman-17 · scenarios: lunch-today · fingerprint `0ad866e92107`
- minji-freshman-17 (step 0, sev 3): “헐 big face photo… is this a dating app? And 'I'm in' — in what, coffee with Maya or matching with her?” — [screenshot](../../runs/smoke-minji-lunch-today/shots/000-start.jpg) · [marked](../../runs/smoke-minji-lunch-today/shots/000-start-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “I'm in” on / does before people tap it — plain-word label, visible result, or a one-line hint. Personas said they wanted: “say what I'm joining, like 'Join coffee'”.

### 2. Confusing UI on / — “Joined · Leave”

- **Type** Confusing UI · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: lunch-today · fingerprint `7550a9defad6`
- minji-freshman-17 (step 2, sev 2): “뭐지… where is the group chat? and the button now says 'Joined · Leave' — if I tap it again do I leave??” — [screenshot](../../runs/smoke-minji-lunch-today/shots/002-click.jpg) · [marked](../../runs/smoke-minji-lunch-today/shots/002-click-som.jpg)
- **Suggested improvement (hypothesis):** Make it obvious what “Joined · Leave” on / does before people tap it — plain-word label, visible result, or a one-line hint.

### 3. Hard to find on /chats?tab=activity — “Activities”

- **Type** Hard to find · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: lunch-today · fingerprint `6a00d05d782f`
- minji-freshman-17 (step 6, sev 2): “oh there it is, under Activities. took me a while” — [screenshot](../../runs/smoke-minji-lunch-today/shots/006-click.jpg) · [marked](../../runs/smoke-minji-lunch-today/shots/006-click-som.jpg)
- **Suggested improvement (hypothesis):** Surface the path personas were looking for (“Activities”) where they looked (/chats?tab=activity); label icon-only controls.

### 4. Missing / empty content on /chats/:id

- **Type** Missing / empty content · **severity** max 2, median 2 · **1 persona(s)**: minji-freshman-17 · scenarios: lunch-today · fingerprint `35bbfcd3c5af`
- minji-freshman-17 (step 8, sev 2): “ok I'm in the chat. but it's coffee tomorrow, not lunch today… nobody for lunch today?” — [screenshot](../../runs/smoke-minji-lunch-today/shots/008-click.jpg) · [marked](../../runs/smoke-minji-lunch-today/shots/008-click-som.jpg)
- **Suggested improvement (hypothesis):** Check whether the data on /chats/:id is really missing (or only missing in the test environment); avoid showing empty sections.

## Automatic checks (harness)

| screen | device | tap targets < 44px (max) | sideways overflow | broken images |
|---|---|---|---|---|
| `/chats` | phone | 7 — e.g. Back 40×40, Notifications 40×40, Direct 56×28 | — | — |
| `/chats?tab=activity` | phone | 7 — e.g. Back 40×40, Notifications 40×40, Direct 56×28 | — | — |
| `/` | phone | 6 — e.g. Filters 40×40, Notifications 40×40, Messages 40×40 | — | — |
| `/chats/:id` | phone | 3 — e.g. Back 40×40, Menu 40×40, Switch to the classic design 158×32 | — | — |
