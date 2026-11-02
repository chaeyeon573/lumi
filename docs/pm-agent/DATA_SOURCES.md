# Bay Area schools — where each kind of data comes from (checked 2026-11-02)

**Where the data lives (owner, 2026-11-02 — Railway cost):** schools that aren't open are collected by the PM agent (this routine, not Railway) into
`server/data/collected/<school>.orgs.json` (clubs + student government + links) and `<school>.probe.json` (class recipe sample). Nothing goes into the live DB.
Run: `npm run agent -- collect:s_ucsc`. Only what the agent can't reach from its container runs on Railway — the `railway` column in schools-collect.csv
(today: Stanford class probe, because explorecourses.stanford.edu fails TLS from the container); Railway records only the probe result, no data.
Opening a school: move its row to schools.csv, then `npm run agent -- import-collected:<id>` loads the clubs in one go; the worker then loads classes with the same recipe.

Rule (owner, 2026-11-02): focus on Bay Area. **Clubs, student government, events and their links are loaded now** (unstructured, need to be gathered one by one).
**Class timetables are NOT loaded for schools that aren't open yet** (storage cost). For those the agent only reads a small sample every week
(`probe:<school>` in /api/agent/status, `stored: false`) to prove the recipe still works. Opening a school = move its row from
`server/data/schools-collect.csv` to `server/data/schools.csv`; the same recipe then loads everything.

| School | Clubs (loaded) | Club links | Student government | Events | Classes (recipe, sample only) |
|---|---|---|---|---|---|
| Stanford | Cardinal Engage (CampusGroups) `cardinalengage.stanford.edu` | each club's own site | ASSU — assu.stanford.edu (hand-checked) | events.stanford.edu (Localist API) | ExploreCourses XML (`stanford` adapter) — Autumn/Winter/Spring with times |
| SF State | CampusLabs Engage `sfsu.campuslabs.com/engage` — 290 | website · Instagram · Facebook · LinkedIn · X · YouTube (Engage detail) | Associated Students (in directory) | Engage events — 17 upcoming in test | bulletin.sfsu.edu (CourseLeaf) — codes/titles, no times. Test: 181 courses from 6 subjects |
| San José State | CampusGroups `sammyapp.sjsu.edu` — 440 | each club's own site | Associated Students (in directory) | events.sjsu.edu (Localist API) — 9 student events in the next 14 days after filters | candidate: sjsu.edu/classes/schedules/<term>.php (public per-term table; unreachable from the dev container — test on the server next) |
| UC Davis | CampusGroups `aggielife.ucdavis.edu` — 531 | each club's own site | ASUCD — asucd.ucdavis.edu (hand-checked) | — | catalog.ucdavis.edu (CourseLeaf) — codes/titles. Test: 107 courses from 6 subjects |
| UC Santa Cruz | Get Involved list `getinvolved.ucsc.edu/student-organizations/join/` (WordPress/FacetWP, one page) — 109 | Instagram · email on the card (108 of 109 have a link) | SUA — sua.ucsc.edu (hand-checked) | — | catalog.ucsc.edu is not CourseLeaf → probe rejected; next: pisa.ucsc.edu class search |
| Santa Clara | CSI RSO directory `scu.edu/csi/organizations/directory/` — 162 in 10 categories | names + category only (the page has no links/descriptions) | ASG — scu.edu/csi/asg (hand-checked) | — | none yet |
| USF | myUSF category pages `myusf.usfca.edu/sle/student-orgs/undergraduate/*` (5 pages) — 152 | description + Instagram / website (138 of 152) | ASUSF Senate — myusf.usfca.edu (hand-checked) | — | none yet |

Open (fully loaded): UC Berkeley, UC Merced.

Notes
- CampusGroups lists pages of 8–30 rows depending on the school; the reader steps by 10 and also reads rows without a link (`cb_club_<id>`) — UC Davis went 265 → 531.
- CampusGroups club pages draw their Instagram/Facebook icons by script, so only the club's own website is captured there. Engage and Penn Clubs give full social links.
- Hand-checked student governments: `server/data/student-governments.csv` (official site; Instagram only when the official site links it).
- East Coast schools (MIT, Harvard, Cornell, UPenn, Dartmouth, Notre Dame) moved back to `schools-paused.csv`. Their readers (incl. Penn Clubs, two-term classes) stay in the code.

## Data work queue (the PM agent picks the top open item itself every run — owner 2026-11-02: "don't make me ask, keep filling")
Order: Bay Area schools only. Never invent data; only official/public sources; verify with a real sample before wiring; never bulk-store timetables for schools that aren't open.
- [x] Collected to files 2026-11-02 13:28 UTC: Stanford 733 · SF State 290 (218 with social/site links) · SJSU 440 · UC Davis 532 · UCSC 110 · Santa Clara 163 · USF 152 (incl. hand-checked student governments where the directory lacks them)
- [ ] (in progress: Stanford 7/733 done 2026-11-02 — ASSU, Solar Car, Taiko, SWIB, SCN, SPBA, Stanford Daily; next batch from the top of the list, skip ones already in org-links-stanford.csv) Public links for clubs with none (owner 2026-11-02: no school-login pages; Website + Instagram + Facebook from public sources only). Stanford (directory gives no sites) and Santa Clara (names only): per run take ~25 clubs, web-search "<club> <school>" , keep only an official site/account that clearly names the club and school, add to a hand-checked CSV `server/data/org-links-<short>.csv` (club_id,label,url,checked), never guess
- [ ] UC Berkeley (open, live): many clubs only had a CalLink link, now hidden as login-only → find public Website/Instagram/Facebook the same way (worker job, small batches; Railway cost: a few hundred page reads per week)
- [x] Course files for closed schools when the recipe passes (`<id>.courses.json`): SF State 4,419 · UC Davis 10,478 (catalog: codes/titles, no meeting times). Visible in /preview
- [ ] Course times for closed schools: SF State / UC Davis class search (times), SJSU schedule, UCSC pisa — find a public timetable source per school
- [ ] QA sample every run (owner 2026-11-02): pick 5 clubs + 5 courses at random across schools, re-open the official source, compare name/links/times; log mismatches and fix the reader
- [ ] Logos: Berkeley 202 clubs show a generic 🎯 placeholder and 458 names end with 💙 (as written in CalLink) — propose to owner: show initials instead of 🎯 and hide the trailing 💙 in display
- [ ] Re-collect weekly (`collect:<id>` for each row) and commit only real changes
- [ ] Stanford class probe result on Railway (`probe:s_stanford` in /api/agent/status)
- [ ] SJSU class schedule recipe (sjsu.edu/classes/schedules/<term>.php) — test from the server via probe
- [ ] UCSC class schedule recipe (pisa.ucsc.edu class search)
- [ ] Event calendars: UC Davis, UC Santa Cruz, Santa Clara, USF
- [ ] Santa Clara club links (only names now) — look for each club's page/Instagram on official SCU pages
- [ ] Official Instagram for student governments where the official site links it (ASSU, ASUCD, SUA, ASG)
- [ ] Next Bay Area schools to consider: UCSF (grad), Cal State East Bay, Mills (Northeastern) — ask owner before adding a school
