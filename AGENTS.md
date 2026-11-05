# Working in this repo (Codex + Claude)

Two agents work here. Split by area so we never edit the same files.

| Area | Owner | Paths |
|---|---|---|
| Screens, copy, design, what is shown or hidden | **Codex** (with the owner) | `src/`, UI parts of `packages/core/src/` (labels, i18n, components' data), `index.html`, styles |
| Data: collecting, readers, files, agent, API that serves data | **Claude** (Lumi PM agent, runs hourly) | `server/sources/`, `server/agent/`, `server/scripts/`, `server/data/`, `server/preview.ts`, `server/noemoji.ts`, `docs/pm-agent/` |
| Shared — change only with a note in the commit message | both | `server/index.ts` routes, `server/view.ts`, `packages/core/src/types/`, `packages/core/src/lib/orglinks.ts` |

If you need something from the other side, write it in `docs/HANDOFF.md` (who → who, what, why). Claude reads it every run.

## Branches and deploy
- Live app: https://heetz.up.railway.app — deploys from **`claude/friendly-euler-emuo1f`**.
- Codex: work on your own branch (e.g. `codex/<topic>`), run the checks below, then merge into `claude/friendly-euler-emuo1f`.
- Claude works on `claude/lumi-pm` and merges the deploy branch in before each deploy.
- Never force-push, never rebase a shared branch, never rewrite someone else's commits.
- Checks before any push to the deploy branch: `npx tsc -b` · `npm run -s typecheck:server` · `npm test` · `VITE_API_MODE=remote npx vite build`.

## Owner rules (apply to both)
- **No emoji** anywhere on screen or in data. The server already strips emoji from everything it sends (`server/noemoji.ts`); do not add emoji in UI code.
- **Never delete collected data.** To stop showing something, hide it in the UI (or ask Claude to filter it in `server/view.ts` / `server/preview.ts`). Files in `server/data/collected/` stay.
- Only public, official sources; never a page behind a school login. Login-only links are hidden by `publicLinks()` in `packages/core/src/lib/orglinks.ts`.
- Don't invent data. Don't add Railway cost (always-on processes, big DB loads, more requests) without asking the owner.
- Schools that aren't open live only in files; `npm run agent -- import-collected:<id>` loads one school's clubs + courses + events into the DB in one step when the owner opens it.

## Data the UI can use
Files (`server/data/collected/`), one set per school id (`s_cornell`, `s_usc`, …):
- `<id>.orgs.json` — `Organization[]` (types `club` | `greek` | `council` | `department`; `department` = school office, hide it). `recruitment` = `{ mode: rolling|deadline|cycle|closed, deadline?, how?, source }` → use `recruitmentLabel()`.
- `<id>.courses.json` — `CatalogCourse[]` with `meetings: { day 0=Mon…6=Sun, start "HH:MM", end }`, `term`, graduate courses included.
- `<id>.events.json` — `{ collectedAt, events: Opportunity[] }` upcoming only, times in UTC (show in the school's `tz` from `server/data/schools-collect.csv`).
- `jobs-us.json` — `{ collectedAt, jobs: StudentJob[] }` US internships / new grad & entry level / PhD / master's / postdoc (`server/sources/jobboards.ts`).

API:
- `GET /api/preview` — schools not open yet with counts · `GET /api/preview/:id` — clubs, upcoming events, class check · `GET /api/preview/:id/courses?q=` — course search
- `GET /api/jobs?q=&audience=phd|masters|newgrad|postdoc|undergrad&kind=internship|job|fellowship` — US student jobs (file only, no DB)
- Live app data (Berkeley, Merced) comes through the usual snapshot/patch; already emoji-free.

## Open frontend items (for Codex)
- Remove hard-coded emoji in `src/` and `packages/core/src` UI constants (≈325 lines in 56 files: ride places, icebreakers, welcome banner, chips). `Avatar`, `Portrait`, `Cover`, `EmptyState` already draw no emoji.
- Show jobs in the app from `/api/jobs` (a page exists only in preview: `src/pages/preview/PreviewPage.tsx` `PreviewJobsPage`).
- Decide which collected fields to show; tell Claude in `docs/HANDOFF.md` if a field should stop being collected.
