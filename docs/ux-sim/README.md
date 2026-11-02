# ux-sim — AI simulated user testing for Lumi

> **AI simulation — hypotheses, not measured user behaviour.** ux-sim tells you where *simulated* students got stuck,
> bored or confused. Every finding is a hypothesis to check with real students. It never produces rates or percentages.

## What it is

- **The brain is Claude.** A Claude Code session (or a subagent) plays one persona: a 17-year-old freshman, a commuting
  transfer student, a PhD student on a laptop, and so on. It follows [PERSONA_RUN.md](PERSONA_RUN.md).
- **The hands and eyes are this CLI.** `tools/ux-sim/bin/ux-sim` keeps a real headless Chromium open and gives the
  persona a numbered list of what is on screen, plus a screenshot and a "set-of-marks" screenshot with the numbers drawn on.
  The persona acts with `click 12`, `type 8 "…"`, `scroll down` and so on, and writes down how it feels with `note`.
- **No API key is needed.** Nothing in the harness calls an LLM.
- **The harness, not the model, keeps score.** It counts actions, measures latency, detects objective frustration
  (failed taps, taps with no visible effect, repeats, backtracking, expectation mismatches), runs the scenario's fixed
  success check, and ends the run when the persona's patience is spent.
- Reports cluster friction across personas into **findings**, then into **issue candidates**. Nothing is posted anywhere.

It is self-contained: `tools/ux-sim/` has its own `package.json` + lockfile. It is not part of the root workspaces,
so Railway builds ignore it. Results go to `ux-sim/` at the repo root.

```
tools/ux-sim/
  bin/ux-sim              CLI (start · observe · click · tap · type · select · scroll · swipe · back · goto · wait · note · finish
                          · list · brief · report · compare · issues · validate)
  bin/local-stack         run Lumi locally from any worktree on a free port with an isolated, freshly seeded data file
  lib/                    session-server (browser + run.json), dom (element list, set-of-marks, checks), stack, report, compare, issues
  personas/*.json         7 personas (age 17–26, phone/desktop, en/ko, patience)
  scenarios/*.json        7 scenarios: goal + fixed success check + start URL + which personas run it
  schema/                 run.schema.json, findings.schema.json (report validates against both)
  environment.json        known environment limits per target mode
  THIRD_PARTY_NOTICES.md  MIT notices for ideas adapted from autouser / browser-use / human-experience
docs/ux-sim/              this README, PERSONA_RUN.md (the persona agent's instructions), OSS_COMPARISON.md
ux-sim/runs/<run-id>/     run.json, report.md, shots/NNN-<kind>.jpg + -som.jpg, stack/ (data file + server log, git-ignored)
ux-sim/reports/<date>/    summary.md, findings.json, issue-candidates.json, compare-HHMM.{md,json}
```

## Setup (once per checkout)

```bash
cd tools/ux-sim && npm ci          # playwright-core + ajv only. Chromium: /opt/pw-browsers/chromium (UX_SIM_CHROMIUM to override)
```

Do **not** run `playwright install`. The harness uses the Chromium that is already on the machine.

## Run one persona against the local stack (default, safe)

```bash
UX=tools/ux-sim/bin/ux-sim
$UX list                                                     # personas, scenarios, matrix
$UX start --persona minji-freshman-17 --scenario lunch-today  # starts a fresh local stack + browser; prints runId, brief, first observation
$UX observe --run <runId>
$UX click 7 --run <runId> --expect "I join her coffee plan" --confidence 0.5
$UX note --run <runId> --mismatch no --feeling curious --thought "oh, it joined"
$UX note --run <runId> --feeling confused --thought "I'm in… in what?" --friction ux_confusion --severity 3 --element 7
$UX finish --run <runId> --outcome success --reason "I joined a coffee plan"   # closes the browser and stops that run's stack
$UX report ux-sim/runs/<runId>        # → ux-sim/runs/<runId>/report.md + ux-sim/reports/<date>/summary.md + findings.json
$UX report --all                      # every finished run
$UX issues ux-sim/reports/<date>/findings.json   # → issue-candidates.json (severity ≥ 3 or ≥ 2 personas)
$UX compare --before ux-sim/runs/A ux-sim/runs/B --after ux-sim/runs/C ux-sim/runs/D
```

To have Claude play the persona, give a subagent this prompt:

> Follow docs/ux-sim/PERSONA_RUN.md exactly. Persona: `minji-freshman-17`. Scenario: `lunch-today`. Repo: `<path>`.

For a batch, run one subagent per matrix cell (`ux-sim list`). Each subagent passes its own `--run`, so sessions can run
side by side, and each gets its own local stack on a free port. Then run `report --all` and `issues`.

**Every step command must carry `--run <runId>`** when more than one session is open. With exactly one open session,
`--run` can be left out.

### What `start` does by default (the local stack)

The live site would show real sign-ups and posts to real students, so **the default target is a local full stack built
from this worktree, with a fresh store for every run.** `lib/stack.mjs` does this, and `bin/local-stack` exposes it on
its own:

1. In the worktree, it runs `npm ci` if `node_modules` is missing. Then `vite build` with `VITE_API_MODE=remote` into
   `<worktree>/dist` (the server serves that folder). The build is cached by HEAD plus a hash of uncommitted changes, so
   uncommitted UI changes are tested too.
2. **Template data** (made once per worktree state, kept in `ux-sim/stack/templates/`): it boots `server/index.ts` on an
   empty `DATA_FILE`. With no `DATABASE_URL` the server uses `FileStore`. The first boot seeds `seed.en`, the course
   catalog and the demo accounts (`server/demo.ts`). It then imports every `server/data/opportunities-*.csv` with
   `server/scripts/import-opportunities.ts`, which is the same step the live worker runs.
3. **Per run** it copies the template to `ux-sim/runs/<id>/stack/db.json` and starts the server on a free port with:
   `AROUNDU_LANG=en CAMPUS_LIVE=0 PUSH_DISABLED=1 ALLOW_DEMO_LOGIN=1 DEMO_AUTOREPLY=0`. It strips any
   `DATABASE_URL`/`OPENAI_API_KEY`/`RESEND_API_KEY`/`ADMIN_KEY` from the environment. Sample dates roll to "now" on boot.
4. Scenarios with `setup.auth: "demo"` sign in through `/welcome?demo=berkeley` before step 0. Scenarios with
   `"none"` start signed out. A new sign-up works locally: no mail is configured, so the 6-digit code is shown in the
   on-screen hint.

```bash
tools/ux-sim/bin/local-stack up [--worktree ../other-worktree] [--port 8800] [--data-file x.json] [--dev --web-port 5174] [--autoreply] [--rebuild] [--reseed]
tools/ux-sim/bin/local-stack status
tools/ux-sim/bin/local-stack down --port 8800 | --all
ux-sim start … --worktree ../other-worktree   # test another branch's code
ux-sim start … --base-url http://localhost:8800   # a stack you started yourself (mode "custom", nothing is reset)
```

`--dev` runs the Vite dev server against the local API instead of a build. It is quicker while you are editing UI.

### Live mode (read-mostly)

```bash
ux-sim start --persona marcus-senior-lowtech --scenario internship-near-berkeley --base-url https://heetz.up.railway.app --allow-live
```

Without `--allow-live`, any non-localhost URL is refused. With it, these protections apply:

- Every POST/PUT/PATCH/DELETE to `/api/*` is answered with **403** "Blocked by ux-sim (live mode)". Exceptions:
  `/api/auth/demo`, `/api/auth/me`, `/api/bootstrap`, `/api/schools/{search,highlights}`, `/api/catalog/*`,
  `/api/academic/dates`, `/api/seats/mine`, `/api/rides/teaser`, `/api/classes/room`.
- `/api/ai/*` is always blocked.
- SSE `/api/events` is aborted.
- The limitation is written into `run.json` (`target.liveGuard`).
- The observation shows a notice when a write was blocked. Friction on that step is auto-marked `environmentLimited`.

In practice this means sign-up, joining, posting, saving, RSVPs and timetable edits cannot complete on live. Use live
mode for discovery, content and first-impression scenarios. The shared demo account's data may have been changed by
other visitors.

Chromium cannot reach external HTTPS through the sandbox proxy, so the harness proxies every non-localhost request
through Node `fetch`. This is the same trick as `docs/pm-agent/shoot.mjs`.

## What does not work locally (environment-limited — not UX bugs)

These limits are listed in `tools/ux-sim/environment.json` and copied into every `run.json`:

| Feature | Local stack | Why |
|---|---|---|
| Dining menus, RSF gym crowd (`/dining`, `/gym`, "Dining now", "Gym now") | empty / "unavailable" | needs live campus sources (`CAMPUS_LIVE=0`) |
| Ask Lumi, AI profile draft on `/start`, conversation starters | off | needs an OpenAI key |
| Course catalog | ~210 built-in sample courses, typical times | live has the real Berkeley schedule from the worker |
| Internships / hackathons / campus events / free food | only the CSV deadline calendar | live also has worker-fetched Greenhouse/Lever/Ashby internships, Devpost, CalLink and campus events |
| E-mail codes | shown on screen | no mail provider |
| Other people replying | nobody, unless `--autoreply` | production runs with `DEMO_AUTOREPLY=0` |

Friction notes that fall into these cases are marked `environmentLimited: true` in three ways:

- automatically, by route or by a failed request to a known endpoint;
- automatically, by a blocked live write;
- by the persona, with `--environment-limited`.

Reports list these events separately and never turn them into findings or issues. A `content_gap` on the
Campus/Discover or timetable screens gets an `environmentCaveat` instead: it may be real, so confirm it on live.

Not limited, and real: a brand-new account sees **no other students** on People. Sample profiles are shown only to the
demo accounts, on both local and live. That is the cold-start experience, and `cold-start-hangout` measures it.

## Outputs

**`run.json`** (schema: `tools/ux-sim/schema/run.schema.json`) contains:

- **Persona and scenario snapshot**, the target (mode, base URL, worktree commit, live guard), known limits, and patience limits.
- **`steps[]`** — one entry per command: index, timestamp, command + args, target element descriptor (role, name, box),
  URL before/after, latency, screenshot + set-of-marks screenshot, the element list and visible text seen, console
  errors, failed requests (≥ 400), blocked requests, objective `signals`, `intent` (`--expect`/`--confidence`) and
  `reflection` (`mismatch`), and per-screen `checks`.
- **`frictionEvents[]`** — step reference, type, severity 1–4, persona quote, element, wish, evidence screenshots,
  `environmentLimited` + reason, `environmentCaveat`.
- **Outcome fields:**
  - `outcome` is `success`, `false_success`, `abandoned`, `failed` or `timeout`.
  - `reportedOutcome` is what the persona said.
  - `endedBy` is `persona`, `harness:frustration`, `harness:max_steps`, `harness:time_budget` or `harness:idle`.
  - `goalAchieved` and `goalFirstMetAtStep` come from the **fixed** scenario check, never from the persona.
  - `stepsToGoal`, `unnoticedSuccess`.
- **`abandonPoint`** — step plus screenshot.
- **`autoChecks[]`** — tap targets under 44 px (phone), sideways overflow, broken images.
- **`dropoffRisk`** is always `{"kind":"hypothesis","level":"low|medium|high","rationale","basis":[steps],"source"}`.
  It is never a number or a rate. The persona agent can set it with `finish --dropoff …`. Otherwise a stated harness
  heuristic fills it in.

**Reports:**

- **`report.md` per run** — a summary table, the friction table, where the run ended, a timeline with thumbnails
  (click a thumbnail for the marked screenshot), automatic checks and timing.
- **`summary.md` + `findings.json` per date** — friction is clustered by fingerprint (normalized route + friction type +
  key element text). Each finding shows:
  - distinct personas and scenarios;
  - max and median severity;
  - quotes and evidence links;
  - a suggested improvement, labelled as a hypothesis.

  Environment-limited events and aggregated automatic checks are listed in separate sections.
- **`issue-candidates.json`** — only findings with severity ≥ 3 or seen by ≥ 2 personas. Each candidate has a title,
  a Markdown body (screenshots as GitHub blob URLs on `claude/ux-sim`), labels
  `["ux-sim","severity:N","<type>"]`, and a hidden `<!-- ux-sim:fp=<hash> -->` marker for dedupe. **ux-sim never
  creates issues.** Before posting, search existing issues for the marker.
- **`compare-*.md/json`** — per persona × scenario it shows the outcome before → after, actions to goal and friction
  by type. Findings are split into resolved, still present, new and not re-tested, matched by fingerprint.

Severity, used everywhere:

| | |
|---|---|
| 1 | Minor: noticed it, cosmetic, did not slow me down |
| 2 | Moderate: slowed me down or made me hesitate; I recovered on my own |
| 3 | Major: real confusion, wrong path or many extra steps; nearly gave up or got through by guessing |
| 4 | Blocker: could not continue, gave up, or would stop using the app here |

## Personas and scenarios

`ux-sim list` prints the current matrix. The source is `tools/ux-sim/scenarios/*.json` → `personas`.

| scenario | goal | personas |
|---|---|---|
| `first-open-decide` | first open from a friend's link: what is this, sign up? | Minji 17 (ko), Jordan, Marcus (low-tech), Aisha, Seoyeon (ko) |
| `cold-start-hangout` | brand-new account: find someone to hang out with this week (People is empty) | Minji, Diego, Jordan |
| `lunch-today` | find someone to get lunch with today (People card **"I'm in"** flow) | Minji, Diego, Aisha |
| `timetable-add-classes` | add MATH 1A to the timetable | Diego, Minji, Marcus |
| `internship-near-berkeley` | find an open internship near Berkeley | Marcus, Priya (desktop), Diego |
| `ride-sfo-thanksgiving` | share a ride to SFO on Nov 25 | Seoyeon, Diego, Priya |
| `find-a-club` | find a club I'd feel welcome in | Aisha, Jordan, Minji |

Each persona has `patience`:

- `maxSteps`: the action budget.
- `frustrationThreshold`: objective frustration points. Weights: failed action 1, no visible effect 1, repeat 0.75,
  backtrack 0.5, mismatch 0.5.
- `confusionTolerance`: self-reported confused/frustrated notes. This only produces a nudge.
- `timeBudgetSec`: simulated reading time plus waiting. New on-screen text ÷ `readingCharsPerSec` × `readingDepth`.

The harness ends the run when any hard limit is reached. Sign-up takes about 22 actions when nothing goes wrong, which is
why the sign-up scenarios record `expectedMinActions`.

To add a scenario, write a JSON file with:

- `goal`, in user words and with no internal names;
- `startUrl`;
- `setup.auth` (`demo`|`none`);
- `success`, with `all`/`any` of `urlMatches` / `textMatches` / `textAbsent`. Patterns are regexes, tested against
  path+query and the page's `innerText`.
- `personas`.

Then run `ux-sim validate-config`.

## Limits

- **Simulated personas are not users.** They are one model with different instructions. Treat a finding from a single
  persona as a lead, not evidence. Repeat cells before trusting a compare.
- The element list is heuristic:
  - native controls, ARIA roles, `cursor:pointer` elements, and labels wrapping hidden inputs;
  - covered elements are dropped;
  - visible text excludes text painted under another layer (z-index / DOM order approximation).
  - Things that only exist visually (canvas, a bare grid cell) can be reached with `tap x y`.
- "No visible effect" needs both the DOM fingerprint and the screenshot pixels to be unchanged. Animated screens (the
  marquee on `/welcome`) therefore never count as no-effect.
- Swipe gestures are emulated with mouse drags. Pinch and long-press are not supported.
- Only `en-US` / `ko-KR` locales are set on the browser. The app's own language stays English until the persona changes
  it in Settings, as a real Korean student would have to.
- Live mode cannot test any flow that writes.

Sizes: a ~10-step run is about 0.4 MB of screenshots (JPEG q60, CSS pixels). The per-run `stack/` folder holds the data
file and server log (~0.5 MB) and is git-ignored. Commit runs only when they are evidence for an issue.
