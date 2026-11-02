# AI simulated-user testing: OSS comparison (for Lumi)

Researched 2026-11-02. Each repo was shallow-cloned (`--depth 1`) into a scratchpad. Only the
source was read; no install scripts or project code were run. Star counts are **not visible**:
the GitHub API was blocked from this session, and browser-use's README shows stars only as a
badge image. "Not found" means I looked in the repo and it is not there.

Our constraints: there is **no LLM API key**. The brain is Claude itself, running inside
scheduled Claude Code sessions and driving a browser through a CLI we provide
(observe → act). The stack is Node 22 + playwright-core + `/opt/pw-browsers/chromium`, and the
footprint must stay minimal.

## Comparison table

| | human-experience | autouser | user-testing-agent | browser-use |
|---|---|---|---|---|
| Last commit | 2026-03-10 (`aa6341f`) | 2026-06-18 (`551f164`) | 2026-04-08 (`3f1c433`) | 2026-10-29 (`b49a68e`) |
| License | MIT (LICENSE). Its `package.json` says ISC | MIT | README says MIT, but **no LICENSE file** | MIT |
| Language | Node ESM, 1 script (1312 lines) + 2 prompt docs | Python ≥3.11, about 7.7k lines, 36 test files, CI | Python 3.11 + Claude Code agent, hooks and skills | Python ≥3.11, large (v0.13.14) |
| Maturity | Prompt-pack plus capture script, no tests | "Alpha" v0.1.0, well tested, CI on ubuntu | v0.1.0, no tests, README says "macOS" | Production library, heavy dependency tree |
| Perception | Screenshots (Claude vision) + interactive-element inventory JSON | DOM summary (landmarks + interactive elements with copyable selectors), innerText, ARIA snapshot, screenshot; optional vision-only mode | Screenshots through Claude-in-Chrome (`read_page`) | CDP DOM + AX tree + DOMSnapshot serialized to `[index]<tag>` lines, plus screenshot |
| Action | Playwright (scripted: click every element, fill forms, follow CTAs, `--flow` JSON) | Playwright selectors or coordinates, with motor noise and typos for low-precision personas | Coordinate clicks through the Chrome extension, or browser-use `Agent` | CDP (`cdp-use`) by element index |
| Personas | Free-text `--persona`; default "busy professional" | 5 archetypes on 5 numeric/level dimensions + accessibility profile + seeded jitter | YAML with 7 research-named traits + `patience_budget` | None (generic agent) |
| Goal model | URL plus mode (onboard, qa, …); journey is inferred | `TaskSpec` (task, criteria, max_steps) + deterministic `SuccessPredicate`; `explore` mode | Task YAML: description, start_url, success_criteria | Free-text `task`; LLM `judge` |
| Evidence | `manifest.json` + about 36 PNGs (+ optional video) | `friction_log.json`, `step_NNN.png`, `journey.md`, `report.md`, `study.json`, `audit.json` | SQLite `run.db` (actions, findings), `report.md/json` | `AgentHistoryList` JSON, optional GIF, conversation log |
| Report | Self-contained HTML, 7-dimension 1-5 scorecard (/35) | Ranked issues (severity × category), per-step journey, multi-seed study clustering | Findings table with severity | Final result + judge verdict |
| LLM / keys | Claude Code (skill). Capture needs none (AgentMail key only for signup) | Anthropic or Gemini key, or local `claude` / `codex` CLI. `ScriptedEngine` is test-only | Claude subscription + Chrome extension, or browser-use + provider key | Provider key (OpenAI/Anthropic/…); QA skill needs `BROWSER_USE_API_KEY` + cloud browser |
| Headless Linux CI | Yes (`chromium.launch({headless:true})`) | Yes (CI installs chromium; `AUTOUSER_BROWSER_EXECUTABLE`), but still needs an LLM | **No** on the Chrome-extension path; browser-use path needs a key | Yes for the library, but needs a key; telemetry on by default |
| Confusion / abandon | LLM-judged friction (LOW to BLOCKER) + emotional arc + research thresholds | Objective frustration events vs patience, a simulated-time budget, dwell loop, skim when frustrated, `false_success` | Patience budget enforced by a **PreToolUse hook** that blocks at 0 and nudges at ≤30% and ≤15% | `ActionLoopDetector`: repetition and page-stagnation nudges (soft); `max_failures=5` |

## Per-project notes (evidence)

### andrew-shwetzer/human-experience
- **Architecture.** `README.md` describes `skill.md` (the brain) + `capture.mjs` (the eyes) +
  `ux-research.md` (cited thresholds). The `skill.md` frontmatter pins `model: claude-opus-4-6`.
- **`capture.mjs`.** It takes screenshots at 3 viewports (desktop 1440, tablet 768, mobile 375), plus scroll depth, animation-aware hover (`hoverAndWaitForAnimation` waits for
  `transitionend`), clicks on every element, form error states, a CTA funnel, and an `a11y` phase. It writes `manifest.json` with `interactiveElements[]` (rect, text, ariaLabel,
  `tapTargetOk` at 44×44), `metrics.loadTimeMs` and `ctaFunnel[]`.
- **It does not loop.** It is a one-shot crawler. Claude reads the PNGs afterwards. There is no per-step observe → act loop and no runtime abandonment logic.
- **`skill.md` report sections.** Walk-through blocks (`EXPECTS / ACTUALLY / SCREENSHOT / FEELS / FRICTION / EVIDENCE`), a friction inventory (BLOCKER/HIGH/MED/LOW), a verdict, and a 7-dimension scorecard. It also has a "SELF-CHECK" rule: every emotion must trace to an event.
- **Risks.** The funnel follows *every* CTA, which risks clicking destructive actions on a live app. AgentMail calls an external API.

### renjie-liu/autouser
- **Loop.** `README.md`: capture → plan → execute → reflect → repeat → report.
  `src/autouser/cognitive/protocol.py` defines an `EngineProtocol` (plan/reflect), so the brain can be swapped.
- **Intent and reflection model.** `cognitive/models.py`:
  - `ActionIntent{action, target, input_value, persona_thought, expected_outcome, confidence}` is recorded *before* acting.
  - `StepResult{actual_outcome, mismatch, emotion, mental_note, severity, category}` is recorded after.
  - Enums cover 8 action types, 5 emotions, 7 issue categories, and the terminal reasons success/abandoned/timed_out/error.
- **Success predicate.** `SuccessPredicate{url_pattern, selector_present, text_contains}`. The persona's belief can never mark success; a divergence is logged as `false_success` (`runner.py`).
- **Frustration.** `affect.py` derives frustration from objective events only:
  - weights: failed action 1.0, no effect 1.0, repeated 0.75, backtrack 0.5, mismatch 0.5;
  - the threshold is `patience`;
  - simulated time: reading at 25 chars/s × reading depth, with a budget of
    `patience × 90 s`.
  - Emotion labels "contribute nothing" to the score.
- **Perception filtering.** `perception.py` gives a screen-reader persona only the ARIA snapshot, and trims visible text to 1200 chars once frustration is ≥0.5 (skimming).
- **Browser layer.** `execution/browser.py` has the `_DOM_SUMMARY_JS` element describer (reports the real attribute names so selectors can be copied, plus field contents and a masked password), and gaussian click noise for low-motor personas.
- **Personas.** Defined in `persona/models.py` and `persona/registry.py` (maria, jake, priya, carlos, yuki); `persona/variance.py` adds seeded jitter.
- **Trust tooling.** `benchmark.py` scores precision and recall against a planted-issue YAML (`benchmarks/friction_page.yaml`). `audit.py` runs a persona-free reviewer that classifies each finding as real or simulation artifact.
- **`claude_code` provider.** It spawns `claude -p ... --tools ""` once per plan/reflect call (`cognitive/claude_code_provider.py`). It is usable without a key, but it means a subprocess on every step and a Python dependency.

### de6eling/user-testing-agent
- **The closest match to our runtime: Claude Code *is* the tester.**
  `.claude/agents/user-tester.md` is the persona prompt. It narrates Screenshot → Observe → Think → Act → React, forbids JS and console use and constructed URLs, and has the agent call `scripts/log-finding.py --type confusion|jargon|missing-affordance|misleading-ui|dead-end --severity critical|warning|suggestion`.
- **Hooks.** `.claude/settings.json` wires them up:
  - PreToolUse `scripts/patience-check.py` charges click, navigate and type at 1 (scroll and screenshot are free). It sends exit code 2 to *block* once patience is spent, and prints frustration text at ≤30% and ≤15%.
  - PostToolUse `log-action.py` writes to SQLite (`db/schema.sql`).
  - Stop `finalize-run.py` writes `report.md/json` and backfills reasoning from the transcript.
- **Persona YAML.** `personas/impatient-new-user.yaml` uses search_vs_browse, reading_depth, exploration_strategy, scent_threshold, cognitive_effort, error_recovery, persistence and
  `patience_budget`.
- **Limits.**
  - Its browser is the macOS Chrome extension, so it is not headless or CI-friendly.
  - The hook path does not save screenshots: the `log-action.py` INSERT has no screenshot column.
  - The alternative path (`ux_agent/orchestrator.py`) uses the browser-use `Agent` and needs a provider key (`config.py build_llm`).
  - **No LICENSE file**, so take ideas only and do not copy code.

### browser-use/browser-use
- **Core.**
  - It speaks CDP directly (`cdp-use`; Playwright is not a runtime dependency).
  - `dom/service.py` merges `DOMSnapshot.captureSnapshot` with `Accessibility.getFullAXTree`.
  - `dom/serializer/serializer.py` emits `[index]<tag attrs>` lines, with a `*` prefix for elements that are new since the last step.
  - `clickable_elements.py` holds the interactivity heuristics (JS click listeners, label/span wrappers, search icons). `paint_order.py` filters elements that are covered by others.
- **Loop detection.** `agent/views.py` `ActionLoopDetector`:
  - it hashes normalized actions over a window of 20;
  - it nudges at 5, 8 and 12 repeats, and after 5 consecutive identical page fingerprints (url + element count + text hash);
  - "never blocks actions".
- **Keys and heavy deps.** The `Agent` needs an LLM (`pyproject.toml` pulls openai, anthropic, groq, ollama, google, posthog and more). Telemetry is on unless `ANONYMIZED_TELEMETRY=false`.
  `skills/qa/SKILL.md` requires `browser-harness` + a cloud browser + `BROWSER_USE_API_KEY` ("Never fall back to the user's local Chrome").
- **TypeScript.** The README mentions a TypeScript version, but none is in this repo (not found).

## Recommendation

**Build our own small TypeScript harness and borrow ideas, not dependencies.** None of the four
can run as-is under "Claude is the brain, no key, headless Linux":
- autouser and browser-use own the LLM loop;
- user-testing-agent needs macOS Chrome;
- human-experience is a crawler with no loop.

What to borrow, from where:
1. **The loop contract and the Claude-Code-as-tester shape, from user-testing-agent.**
   - A persona prompt that forbids dev-tools, JS and URL guessing.
   - Findings logged by the agent mid-run with a fixed type × severity vocabulary.
   - Hook-style enforcement outside the model: our CLI subtracts patience and refuses actions at 0.
2. **The data model and the abandonment mechanics, from autouser** (MIT, credit it if we port code).
   - Record `expected_outcome` + `confidence` before each act; record `mismatch` + emotion +
     `mental_note` after.
   - Frustration from *objective* events only (fail, no effect, repeat, backtrack) against a patience threshold, plus a simulated-time budget.
   - A deterministic success predicate, with `false_success` logged when belief and predicate disagree.
   - Persona dimensions (tech literacy, patience, reading depth, accessibility) and screen-reader perception (an ARIA snapshot only).
   - Later: planted-issue benchmark scoring to measure precision.
3. **Element indexing and stagnation detection, from browser-use** (MIT). Number the interactive elements (`[12]<button "Join">`, with `*` for new ones) so the act step is
   `click 12` and needs no selectors. Fingerprint pages (url + element count + text hash) and count repeated action hashes to detect "nothing changed" and loops.
4. **Evidence and report polish, from human-experience** (MIT).
   - Check the mobile viewport and 44 px tap targets (Lumi is mobile-first: 390×844).
   - Record `loadTimeMs`.
   - A self-contained HTML report with inline screenshots, a walk-through table (EXPECTS/ACTUALLY/FEELS/FRICTION), and the rule "every emotion traces to an event".
   - **Do not** copy its "click every CTA" crawl against the live app.

What we build ourselves:
- **`ux-sim` CLI** (Node 22, playwright-core, `/opt/pw-browsers/chromium`, headless). One persistent session per run, stored under `runs/<id>/`.
  - **Commands:** `start <persona> <task>` (logs in via `/welcome?demo=berkeley`), `observe` (indexed element list + trimmed text + screenshot path), `act click|type|scroll|back <idx> [text]`,
    `note <type> <severity> <text>`, `end`.
  - **Every command appends** to `runs/<id>/steps.jsonl` and returns the patience and frustration line.
  - **Proxy workaround:** reuse the Node-fetch routing and the SSE abort from
    `docs/pm-agent/shoot.mjs`, because the container proxy blocks direct Chromium HTTPS.
- **Lumi personas** as YAML, for example: a new transfer student, a commuter who checks the timetable between classes, a club officer posting an event, a non-native English speaker, a screen-reader user. Use autouser-style numeric traits plus a narrative.
- **Tasks** with deterministic predicates, for example: URL matches `/timetable`, or the text "Joined" is visible.
- **Report:** `report.json` (schema close to autouser's `FrictionLog`) plus `report.md`/HTML, with a cross-persona rollup that clusters issues by (category, route).
- **Guardrails:** the demo account only, a denylist for destructive or outbound actions (delete, report, DM send), and a step cap.
