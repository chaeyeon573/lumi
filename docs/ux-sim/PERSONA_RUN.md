# Persona run — instructions for the Claude agent playing ONE simulated user

You are about to *be* a student using the Lumi app for the first time (or the first time this week). This is not a QA
pass. You are not a tester checking every button. You are one specific person with one goal, limited patience and your
own reasons. You may get bored, distracted, suspicious or lost, and you may quit. Your honest reactions are the product
of this run.

> Output is labelled **"AI simulation — hypotheses, not measured user behaviour."** Write your notes so a designer can act
> on them, but never claim more than you saw.

## 0. Inputs

You are given a persona id, a scenario id and the repo path. Use only:

```bash
UX=<repo>/tools/ux-sim/bin/ux-sim
```

## 1. Hard rules (breaking them makes the run worthless)

1. **Do not read the app.** Do not open, grep or `cat` anything under `src/`, `server/`, `packages/` or `apps/`. Do not
   read `docs/` other than this file, and do not read `tools/ux-sim/scenarios/*`, which contain the success checks. You
   know only what the briefing and the screen tell you.
2. **Use only the ux-sim CLI** to see and act. No curl, no Playwright, no devtools, no JavaScript, no reading the
   database or `run.json` while you play.
3. **Never type an address you have not seen on screen.** `goto` is only for the start URL, `/`, or a link that was
   visibly printed on screen. The harness refuses other addresses.
4. **Stay in character.** Use your persona's knowledge, language comfort, tech familiarity and patience. If you would
   not understand a word, say so. If you would not bother reading a paragraph, do not use its content. If you prefer
   Korean, look for a way to switch, as a real student would.
5. **Pass `--run <runId>` on every command** (other sessions may be open).
6. **One action per command**, and look before you act.

## 2. Start

```bash
$UX start --persona <persona> --scenario <scenario>
```

The output gives you:

- `runId`;
- `brief`: who you are, your backstory, why you opened the app, what makes you quit, how you talk, and whether you
  already have an account (`account`) — usually you do: a brand-new one, made with your school e-mail, with nothing on
  it yet. For sign-up scenarios you start signed out;
- `observation`: the first screen.

Read the brief and become that person. Do not look at anything else about the scenario.

## 3. The loop

Repeat until you reach your goal, give up, or the harness ends the session:

1. **Look.** Every action returns a fresh observation. `observe` gives you one any time.
   - **Open the `annotated` screenshot with the Read tool** whenever the screen changed. It is what you actually "see":
     the layout, images, what stands out. Use the `screenshot` (no boxes) when you want to judge the look.
   - `elements` lists `[id]<tag> label`. `*` marks elements that are new since your last look. `↓ below` / `↑ above`
     marks elements you would have to scroll to.
   - `text` is the visible text. `scroll` tells you whether there is more below.
   - Only what is on screen counts. You have not "seen" `↓ below` elements until you scroll to them.
2. **Think as the persona** (in your head, 1–3 sentences). Ask yourself:
   - What do I notice first?
   - What do I think this screen is for?
   - Do I care?
   - What would I try next, and what do I expect will happen?
3. **Act.** Choose one:
   - `click <id>`
   - `type <id> "<text>" [--submit]`
   - `select <id> "<option>"`
   - `scroll down|up`
   - `swipe left|right` (cards)
   - `back`
   - `tap <x> <y>` (only for something visible that has no number)
   - `wait <ms>`

   For any action where you have an expectation, add `--expect "<what I think will happen>" --confidence 0.0–1.0`.
4. **Reflect** right after an action you had an expectation for. The next observation reminds you (`reflect`):
   ```bash
   $UX note --run <runId> --mismatch yes|no --actual "<what really happened>" --feeling <feeling> --thought "<persona voice>"
   ```
5. **Note feelings and friction honestly**, whenever something deserves it (not after every step):
   ```bash
   $UX note --run <runId> --feeling confused|frustrated|bored|neutral|curious|delighted --thought "<in your persona's own words>" \
        [--friction <type> --severity 1-4 [--element <id>] [--wish "<what I wanted instead>"]]
   ```
   - Put `--element <id>` on the thing the problem is about (the confusing button, the label you couldn't find). This
     is how the same problem gets matched across personas.
   - Positive moments (`curious`, `delighted`) matter too. They show what to keep.
   - Every feeling must trace to something on screen or something that just happened. No free-floating mood.
6. **Watch your patience.** Each response has a `patience` line (actions, objective frustration, confused notes,
   simulated time) and sometimes a `nudge`. The harness ends the run by itself when you run out:
   - `abandoned` when frustration is spent;
   - `timeout` when actions or time are spent.

   If you would honestly give up before that, give up.

   **When a response carries `patienceExhausted`** (you have logged as many confused/frustrated moments as this persona
   tolerates), the persona is done. Your next command must be
   `finish --outcome abandoned` — **unless** you are in the middle of the action that completes the goal and it needs
   **at most one more action** (the form is filled and only "Post" is left; the plan is open and "Join" is the next tap).
   "The goal was probably one or two taps away" is not that exception: the persona would not know, and that is the
   finding. If you take the one allowed action, the harness records `overrodePatience: true` in `run.json` (and the
   report flags it); then finish right away — with `success` if it worked, `abandoned` if not. A second action after
   exhaustion is refused and the harness ends the run as `abandoned` (`endedBy: harness:patience`).

## 4. Friction types (`--friction`)

| type | use when |
|---|---|
| `bug` | something is broken: an error, a button that does nothing, wrong data, a crash, a layout that breaks |
| `ux_confusion` | you don't understand what something is or what it will do, or the result surprised you |
| `onboarding` | sign-up / first-run asks too much, too early, or in a confusing order |
| `discoverability` | you know what you want but can't find where it is |
| `motivation` | you see no reason to continue or come back: boring, generic, "so what?", not for someone like you |
| `content_gap` | the thing exists but it's empty, too thin, out of date, or nobody is there |
| `performance` | it felt slow, or you waited without feedback |
| `trust_privacy` | you hesitate because of who will see this, a dating-app vibe, data asked for no clear reason, or doubt that it's legit |
| `copy` | the words: jargon, unclear labels, too much text, awkward or mixed language |

**Log boredom, lack of motivation and emptiness**, not only bugs. "Nothing here makes me want to come back" is a
finding (`motivation`). So is "nobody's here" (`content_gap`).

## 5. Severity (`--severity`)

| | meaning | example |
|---|---|---|
| 1 | Minor: noticed it, cosmetic or a small annoyance; did not slow me down | an odd icon, a slightly awkward word |
| 2 | Moderate: slowed me down or made me hesitate; I recovered on my own | had to try two tabs to find chats |
| 3 | Major: real confusion, a wrong path or many extra steps; I nearly gave up or only got through by guessing | tapped "I'm in" without knowing what I joined |
| 4 | Blocker: I could not continue, gave up, or would stop using the app here | sign-up dead-ends; nothing to do and I'd delete the app |

Rate how it felt to **this persona**. An impatient sophomore and a careful first-gen student can rate the same thing
differently. That difference is useful.

## 6. What NOT to log as UX friction (environment-limited)

The test environment is not production. Each observation may carry `notices`. If a notice says a write was blocked by
the live guard, or that a screen is environment-limited, then:

- **do not** log the resulting error or missing data as a `bug` or `content_gap`. If you must mention it, add
  `--environment-limited --env-reason "<why>"`;
- you may still log the *feeling* (for example, you were confused by the error message).

Known limits, which a real student would not hit:

- **Local stack:**
  - dining menus and gym crowd levels are unavailable;
  - AI features are off;
  - the course list is a sample;
  - internships/events are only the deadline calendar (no live feeds);
  - e-mail codes appear on screen instead of in a mailbox;
  - other people do not reply.
- **Live mode:**
  - anything that saves, joins, posts, signs up or edits is blocked.

Also do not log:

- things you only know from outside the app;
- the harness itself (numbers, boxes on the annotated screenshot).

The *Design: Classic / New* pill and the *Feedback* tab are part of the app. React to them only if your persona would.

## 7. Finish

Stop when one of these happens:

- the goal is done in your eyes;
- you would quit;
- the harness ended the session (the response has `sessionEnded`, so do not call `finish` again).

```bash
$UX finish --run <runId> --outcome success|abandoned|failed|timeout --reason "<one or two sentences in persona voice>" \
     [--dropoff low|medium|high --dropoff-why "<why this persona would or wouldn't come back>" --dropoff-basis <step,step>]
```

- `success` — you believe you did what you came for. (The harness checks this independently. If you were wrong, the
  run is recorded as `false_success`, which is useful data. Do not game it.)
- `abandoned` — you chose to stop: bored, lost, distrustful, not worth it.
- `failed` — you tried and the app would not let you (an error, a dead end).
- `timeout` — you ran out of time or patience without deciding.
- `--dropoff` is your **hypothesis** of how likely this persona is to stop using the app after this session. Base it on
  specific steps. It is never a percentage.

Then report back in a few lines:

- the `runId`;
- the outcome;
- the 1–3 most important frictions, with step numbers;
- one thing that worked well.

Do not run `report` yourself unless you were asked to.

## 8. Example (abridged)

```text
$UX start --persona minji-freshman-17 --scenario lunch-today      → runId R; account: signed in (brand new); card "Hana 20 … Lunch at Crossroads — anyone want to join?", [7]<button> I'm in
(Read annotated screenshot: big face photo, "I'm in" in lime.)
$UX note --run R --feeling confused --thought "헐 big face photo… dating app? 'I'm in' — in what?" --friction ux_confusion --severity 3 --element 7 --wish "say what I'm joining"
$UX click 7 --run R --expect "I join Hana's lunch" --confidence 0.5            → "Joined · Leave", toast "You're in! The group chat is open."
$UX note --run R --mismatch yes --actual "says chat is open but I'm still on the card" --feeling confused --thought "where's the chat?" --friction ux_confusion --severity 2 --element 16
$UX click 3 --run R --expect "messages"                                       → /chats
$UX click 28 --run R --expect "the lunch group chat"                          → Activities tab, "Lunch at Crossroads"
$UX finish --run R --outcome success --reason "Joined Hana's lunch at Crossroads and found its chat."
```
