# Orchestrating a ux-sim batch

> **AI simulation — hypotheses, not measured user behaviour.** A batch tells you where simulated students got stuck.
> Every problem it produces is a hypothesis to confirm with real students. Never quote rates or percentages.

This is the playbook for the **orchestrating** Claude session: the one that picks cells, starts one persona subagent per
cell, and then turns the results into a curated problem list and issue candidates. The persona subagents follow
[PERSONA_RUN.md](PERSONA_RUN.md); the orchestrator never plays a persona and never coaches one mid-run.

```
batch-plan ──> N subagents (PERSONA_RUN.md, one cell each) ──> report ──> analysis.json (you) ──> issues --analysis ──> compare
```

All commands below run from the harness checkout (the `claude/ux-sim` worktree). `UX=tools/ux-sim/bin/ux-sim`.

## 0. Before the first batch (once per checkout)

```bash
cd tools/ux-sim && npm ci && npm test && cd ../..   # harness deps + unit tests (incl. a Chromium hit-point check)
tools/ux-sim/bin/local-stack catalog fetch           # ~5 min: real Berkeley catalog, same adapter as the live worker
tools/ux-sim/bin/local-stack catalog status          # cache present + not stale → templates use it
tools/ux-sim/bin/local-stack events fetch            # ~10 s, read-only on live: real events / free food / listings (refresh weekly)
(cd tools/ux-sim && npm run smoke)                   # one scripted fresh-account run end to end (~1–3 min)
```

Run lunch/time-of-day scenarios in **daytime Pacific** (the local stack and browser use the real Pacific clock — the
pilot ran at 23:00 and every "today" plan was over).

## 1. Pick the cells

```bash
tools/ux-sim/bin/batch-plan --all                        # every persona × scenario cell (21 today)
tools/ux-sim/bin/batch-plan --scenario lunch-today,ride-sfo-thanksgiving
tools/ux-sim/bin/batch-plan --persona minji-freshman-17
tools/ux-sim/bin/batch-plan --rotate 4                   # the 4 cells run least recently (never-run first) — scheduled runs
tools/ux-sim/bin/batch-plan --scenario lunch-today --repeat 3   # one run of a cell is an anecdote; repeat before trusting it
tools/ux-sim/bin/batch-plan … --batch 2026-11-03-am --json      # stable batch id; JSON has a ready subagent prompt per run
```

Run history comes from `ux-sim/runs/*/run.json` (finished runs; setup errors ignored). Every planned run has a run id
`<batch>-<persona>-<scenario>[-rK]` and a `start` command line.

## 2. Run one subagent per cell

For each planned run, start a subagent with the `subagentPrompt` from `batch-plan --json` (replace `<repo>`):

> Follow docs/ux-sim/PERSONA_RUN.md exactly. Persona: `minji-freshman-17`. Scenario: `lunch-today`. Run id:
> `2026-11-03-am-minji-lunch-today`. Repo: `/home/user/aroundu-ux-sim`.

and tell it to use that run id: `ux-sim start --persona … --scenario … --run-id <id>`.

- Each run gets its own local stack (free port, fresh copy of the template, fresh account, seeded peers), so subagents
  can run side by side. Four at a time is comfortable; the first one builds the web app and template, the rest wait.
- Do not read the scenario files to the subagent and do not hint at the path. Do not answer its questions about the app.
- A subagent reports back runId, outcome, top frictions and one thing that worked. Collect these; they are *not* the
  analysis.
- Check every run finished: `$UX sessions` should be empty; a run left open closes itself after 30 idle minutes as
  `timeout` (`endedBy: harness:idle`) — note it as a harness issue, do not count it as a persona timeout.

## 3. Report

```bash
D=$(date -u +%F)
$UX report ux-sim/runs/2026-11-03-am-* --out ux-sim/reports/$D     # just this batch (or --all for every run)
```

Read `ux-sim/reports/$D/summary.md` first: runs table (auth, outcome, goal evidence, max severity, ⚠ overrode
patience), then the heuristic findings. Those are clustered mechanically by screen + friction type + element text, so
most are singletons with generic titles ("Confusing UI on /"). That is expected — the next step is yours.

## 4. Write `analysis.json` (the curated layer)

```bash
$UX analysis init ux-sim/reports/$D/findings.json      # → analysis.draft.json listing every fingerprint in `notes`
# … curate (below), save as ux-sim/reports/$D/analysis.json …
$UX analysis check ux-sim/reports/$D/analysis.json     # schema, evidence refs, coverage
$UX report ux-sim/runs/2026-11-03-am-* --out ux-sim/reports/$D   # re-run: summary.md now opens with the curated table
```

Schema: [`tools/ux-sim/schema/analysis.schema.json`](../../tools/ux-sim/schema/analysis.schema.json). Example:
[`ux-sim/reports/2026-11-02/analysis.json`](../../ux-sim/reports/2026-11-02/analysis.json) (the pilot).

How to curate:

1. **Read the evidence, not just the quotes.** For each finding open the run's `report.md` and the screenshots of the
   evidence steps (Read tool on `shots/NNN-*.jpg`). Look at what the persona did before and after.
2. **Group fingerprints into problems.** One problem = one thing a designer would fix once. Different screens, types or
   wording can be the same problem ("big face photo + I'm in" on `/` for five personas who came for five different
   things). One fingerprint may support two problems; say so.
3. **Write each problem** (all fields required):
   - `key` — a stable slug. **Reuse the key from earlier analyses** (`ux-sim/reports/*/analysis.json`) when it is the
     same problem: issue dedupe and before/after tracking depend on it.
   - `title` — plain language, what a student experiences: *"The first screen looks like a dating app: one big face
     photo and an "I'm in" button"*, never *"Confusing UI on /"*.
   - `summary`, `rootCauseHypothesis` (why — name the screen, copy, flow; it is a hypothesis), `suggestedFix` (the
     smallest change worth trying), `severity` 1–4 (your judgement for the personas who hit it), `confidence`.
   - `personas`, `scenarios`, `evidence` (`runId` + `step`, verbatim `quote` and/or your `note`; the screenshot is filled
     from run.json).
   - `environmentLimited` + `environmentNote` — true when it only happens because of the test setup: the local stack's
     limits (README table), the live guard, the demo account, the clock. These are never filed. If it *may* be real
     ("Bay Area filter returned nothing" with only CSV data), say what to check on live.
   - `fingerprints` — every heuristic cluster it groups.
4. **Dismiss the rest with a reason** (`dismissed[]`): persona over-reading, a single sev-1 nit, a clock artefact.
   `analysis check` lists anything neither grouped nor dismissed — finish with an empty `unassigned`.
5. **Record harness problems** in `harnessIssues[]` (a loose success check, a persona that broke a rule or overrode its
   patience, a tap that hit the wrong thing). Fix the harness before the next batch; do not file these against the app.
6. **Check false and unnoticed successes** in the runs table: `false_success` means the persona thought it was done and
   the server-side check disagrees — often a real problem with no friction note (add it with `fingerprints: []`).

## 5. Issue candidates

```bash
$UX issues --analysis ux-sim/reports/$D/analysis.json   # → issue-candidates.json (curated; nothing is posted)
```

One candidate per problem that is not environment-limited and has severity ≥ 3 or ≥ 2 personas (`file: true|false` on a
problem overrides). Each body has the summary, root-cause hypothesis, evidence with screenshot links, who, the suggested
fix, and markers `<!-- ux-sim:problem=<key> -->` + `<!-- ux-sim:fp=<fingerprint> -->`. Posting is a separate, explicit
decision: search existing issues for the problem marker and any fingerprint marker first and update instead of
duplicating. The heuristic `ux-sim issues findings.json` still works but makes one candidate per cluster.

## 6. Before / after: two app versions

`compare` compares sets of runs by persona × scenario. To compare **two app versions with the same harness**:

```bash
H=/home/user/aroundu-ux-sim            # the harness checkout (claude/ux-sim). Both sides are driven from HERE.
git -C $H worktree add ../lumi-base main          # version A (any commit / branch; or an existing worktree)
git -C $H worktree add ../lumi-fix  claude/ux-fix-1   # version B
cd $H
tools/ux-sim/bin/local-stack catalog status       # the catalog cache is shared → both sides get the same real catalog
tools/ux-sim/bin/local-stack events status        # same for the live events snapshot (fetch BEFORE the batch, not between sides)
tools/ux-sim/bin/batch-plan --scenario lunch-today --repeat 2 --worktree ../lumi-base --batch cmp1-base
tools/ux-sim/bin/batch-plan --scenario lunch-today --repeat 2 --worktree ../lumi-fix  --batch cmp1-fix
# run every planned line (one subagent each, PERSONA_RUN.md). Each `ux-sim start … --worktree <dir>`:
#   - runs `npm ci` there if needed, builds <dir>/dist (cached by HEAD + uncommitted diff), boots <dir>/server;
#   - seeds a template from <dir>'s own seed code, imports <dir>/server/data CSVs and the shared catalog cache;
#   - registers the fresh account and the scenario's peers with THIS harness — identical on both sides.
$UX report ux-sim/runs/cmp1-* --out ux-sim/reports/$(date -u +%F)
$UX compare --before ux-sim/runs/cmp1-base-* --after ux-sim/runs/cmp1-fix-* --before-label base --after-label fix
```

What makes the two sides comparable, and what `compare` checks (it prints warnings into `compare-*.md`):

| must match | how | compare warns when |
|---|---|---|
| harness (personas, scenarios, checks, patience) | run both sides from the same `tools/ux-sim` checkout; `run.json` → `harness.hash` | hashes differ or are unknown |
| accounts | `auth` from the scenario (fresh + same peers) | auth modes differ |
| course catalog | shared cache in `$H/ux-sim/stack/catalog` (`--catalog cached` to force it) | catalog kinds differ |
| events / listings | shared live snapshot in `$H/ux-sim/stack/events` — do not refetch between the two sides | snapshot stamps differ |
| target | local stacks on both sides (never `--base-url` for a compare: a stack you started is not reset) | modes differ |
| app version | that is the variable — `target.stack.stamp` per side | both sides have the same stamp |
| clock | run both sides in the same hour, ideally interleaved cell by cell | — (check `createdAt`) |

Seed data comes from each worktree's own `server/seed.ts`/`server/demo.ts` — if the fix changes seeds, that is part of
the fix. Uncommitted changes in a worktree are built and tested (`-dirty-<hash>` stamp). `local-stack up --worktree
<dir>` is for poking at one version by hand; for runs always let `ux-sim start --worktree` start its own stack.

Read compare as: outcome per cell (goal reached more/less often, fewer/more actions), friction by type, and findings
resolved / still present / new by fingerprint. With one or two runs per side a change is an anecdote — repeat the cell.
If a curated `analysis.json` exists for both dates, match problems by `key` as well.

## 7. Scheduled runs

A scheduled session does steps 1–5 on a small rotation and stops at issue candidates:

```bash
tools/ux-sim/bin/batch-plan --rotate 3 --batch sched-$(date -u +%Y%m%d-%H%M) --json
```

It writes `analysis.json` for the date (reusing problem keys from the newest earlier analysis) and leaves posting to a
person.

## 8. What to commit

Commit `ux-sim/reports/<date>/` (summary, findings, analysis, issue candidates, compare) and the run folders that are
evidence for a problem (`run.json`, `report.md`, `shots/`). `stack/`, `session*.json|log` are git-ignored. Stage paths
explicitly — several sessions share this checkout.
