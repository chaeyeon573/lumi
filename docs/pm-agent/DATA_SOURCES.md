# Schools — where each kind of data comes from (checked 2026-11-03)

**Scope (owner, 2026-11-03):** collect as many good schools as possible to files (Ivy League, top private and public universities, every good Bay Area school). Files cost nothing on Railway; which schools go live is decided later. **Never remove data already collected** (owner 2026-11-03) — SJSU, SF State, Santa Clara, USF were restored after a mistaken drop.

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
| UC Davis | CampusGroups `aggielife.ucdavis.edu` — 531 | each club's own site | ASUCD — asucd.ucdavis.edu (hand-checked) | — | catalog.ucdavis.edu (CourseLeaf) — codes/titles. Test: 107 courses from 6 subjects |
| UCLA | RCO public search `sa.ucla.edu/RCO` (POST /Public/SearchOrganizations) — 1,451 | website + social links from the directory (1,101 with a public link) | USAC etc. — 48 student-government groups in the directory | — | not yet (schedule of classes: next) |
| UChicago | Blueprint (Engage) `uchicago.campuslabs.com/engage` — 446 | Engage detail socials (404 with a link) | in directory | — | not yet |
| NYU | NYU Engage `nyu.campuslabs.com/engage` — 951 | Engage detail socials (630) | in directory | — | not yet |
| Columbia | LionHub (CampusGroups) `lionhub.columbia.edu` — 357 | club's own site only (18) | in directory | — | not yet |
| Yale | Yale Connect (CampusGroups) `yaleconnect.yale.edu` — 1,377 | club's own site (397) | in directory | — | courses.yale.edu (FOSE) — probe on Railway |
| Cornell | CampusGroups — 1,483 | own site (644) | in directory | — | classes.cornell.edu — 9,518 with times, Fall 2026 + Spring 2027 |
| MIT | engage.mit.edu (CampusGroups) — 427 | own site (252) | hand-checked | — | MIT subject listing — 1,712 with times |
| UPenn | Penn Clubs — 514 (with recruiting cycle + deadlines) | full socials (472) | hand-checked | — | courses.upenn.edu (FOSE) — probe on Railway |
| Dartmouth | dartmouthgroups (CampusGroups) — 406 | own site (30) | hand-checked | — | FOSE — probe on Railway |
| Notre Dame | nd.campuslabs.com/engage — 540 | Engage socials (396) | in directory | — | classsearch.nd.edu (FOSE) — probe on Railway |
| Harvard | blocked here (engage.college.harvard.edu refused by session network) | — | hand-checked | — | probe on Railway |
| UC Santa Cruz | Get Involved list `getinvolved.ucsc.edu/student-organizations/join/` (WordPress/FacetWP, one page) — 109 | Instagram · email on the card (108 of 109 have a link) | SUA — sua.ucsc.edu (hand-checked) | — | catalog.ucsc.edu is not CourseLeaf → probe rejected; next: pisa.ucsc.edu class search |

Open (fully loaded): UC Berkeley, UC Merced.

Notes
- CampusGroups lists pages of 8–30 rows depending on the school; the reader steps by 10 and also reads rows without a link (`cb_club_<id>`) — UC Davis went 265 → 531.
- CampusGroups club pages draw their Instagram/Facebook icons by script, so only the club's own website is captured there. Engage and Penn Clubs give full social links.
- Hand-checked student governments: `server/data/student-governments.csv` (official site; Instagram only when the official site links it).
- East Coast schools (MIT, Harvard, Cornell, UPenn, Dartmouth, Notre Dame) are back in `schools-collect.csv` (owner 2026-11-02), collected to files like the rest.
- Recruiting status (owner 2026-11-02: very important — year-round or deadline, and which deadline): stored as `recruitment.mode` = rolling | deadline (+ `deadline` date) | cycle (Fall/Spring) | closed, with `source`. Sources: Penn Clubs (recruiting cycle, application required, accepting members, and each club's application end date), CampusGroups ("Membership is closed" vs. a join button = open anytime). Engage, UCLA RCO, UCSC have no recruiting fields — shown as nothing rather than guessed. Past deadlines show "Applications closed".

## Data work queue
- [ ] (top, owner 2026-11-03) Collect every school in schools-collect.csv that has no `<id>.orgs.json` yet, one per run in file order (`npm run agent -- collect:<id>`), commit after each. Started 2026-11-03: USC, UCI, UCSB, UCR, Duke, JHU, Northwestern, Georgetown, CMU, Emory, Tufts, WashU, Rice, Vanderbilt, Michigan, UVA, UNC, Georgia Tech, UT Austin, BU, BC, UMD, Purdue, Florida, Wisconsin, UW, Minnesota, Lehigh
- [ ] Schools still paused, need a reader or are blocked: Princeton (club list is behind Princeton login — skip unless a public list appears), UCSD (studentorg.ucsd.edu fails TLS from the container; try from Railway), Illinois, Rutgers, Ohio State, Texas A&M (public directory not found yet), Harvard clubs (engage.college.harvard.edu refused by session network)
- [ ] Recruiting deadlines for schools whose directory lacks them (Berkeley CalLink is login-only; Engage schools): only from a public club page that states a date — never guess (the PM agent picks the top open item itself every run — owner 2026-11-02: "don't make me ask, keep filling")
Order: Bay Area schools only. Never invent data; only official/public sources; verify with a real sample before wiring; never bulk-store timetables for schools that aren't open.
- [x] Collected to files 2026-11-02 13:28 UTC: Stanford 733 · SF State 290 (218 with social/site links) · SJSU 440 · UC Davis 532 · UCSC 110 · Santa Clara 163 · USF 152 (incl. hand-checked student governments where the directory lacks them)
- [ ] (in progress: Stanford 41/733 done 2026-11-02 (+ a cappella council acappella.stanford.edu group pages); official listing pages with per-group links are now used up — El Centro, BCSC, ORSL, GSB pages list names only; remaining Stanford groups need per-club search (low yield, ~5/run), so move on to Berkeley and come back later — faster source: official Stanford department pages that list student groups with links (engineering, CS, ME, MS&E, energy); script-matched by exact name then reviewed by hand; — ASSU, Solar Car, Taiko, SWIB, SCN, SPBA, Stanford Daily, LSJUMB, BASES, Ram's Head, Debate, Stanford Finance; not found yet: KASA, Gospel Choir, Robotics Club; next batch from the top of the list, skip ones already in org-links-stanford.csv) Public links for clubs with none (owner 2026-11-02: no school-login pages; Website + Instagram + Facebook from public sources only). Stanford (directory gives no sites) and Santa Clara (names only): per run take ~25 clubs, web-search "<club> <school>" , keep only an official site/account that clearly names the club and school, add to a hand-checked CSV `server/data/org-links-<short>.csv` (club_id,label,url,checked), never guess
- [ ] (in progress 2026-11-02: 52 clubs from engineering + eecs lists, 22 club sports via recwell.berkeley.edu team pages (matched by CalLink slug = our id), AIChE + HBSA, 48 <slug>.studentorg.berkeley.edu sites + 8 ocf.berkeley.edu/~<slug> sites (page must name the club; empty "Index of" folders skipped), Public Health page (2) (pages 403 to curl, read via web fetch), + 43 Instagram/Facebook read from their sites → server/data/org-links-berkeley.csv; worker task links:s_berkeley merges weekly. Next lists: Haas orgs, cejce Black RSOs, ASUC/club sports, chemistry, LEAD) UC Berkeley (open, live): many clubs only had a CalLink link, now hidden as login-only → find public Website/Instagram/Facebook the same way (worker job, small batches; Railway cost: a few hundred page reads per week)
- [x] Course files for closed schools when the recipe passes (`<id>.courses.json`): SF State 4,419 · UC Davis 10,478 (catalog: codes/titles, no meeting times). Visible in /preview
- [ ] Course times for closed schools: SF State / UC Davis class search (times), SJSU schedule, UCSC pisa — find a public timetable source per school
- [ ] QA sample every run (owner 2026-11-02): pick 5 clubs + 5 courses at random across schools, re-open the official source, compare name/links/times; log mismatches and fix the reader
- [x] (owner 2026-11-02 "Do not put emoji": done in server/view.ts + preview — names lose trailing emoji, emoji logos become initials) Logos: Berkeley 202 clubs show a generic 🎯 placeholder and 458 names end with 💙 (as written in CalLink) — propose to owner: show initials instead of 🎯 and hide the trailing 💙 in display
- [ ] Re-collect weekly (`collect:<id>` for each row) and commit only real changes
- [ ] Stanford class probe result on Railway (`probe:s_stanford` in /api/agent/status)
- [ ] SJSU class schedule recipe (sjsu.edu/classes/schedules/<term>.php) — test from the server via probe
- [ ] UCSC class schedule recipe (pisa.ucsc.edu class search)
- [ ] Event calendars: UC Davis, UC Santa Cruz, Santa Clara, USF
- [ ] Santa Clara club links (only names now) — look for each club's page/Instagram on official SCU pages
- [ ] Official Instagram for student governments where the official site links it (ASSU, ASUCD, SUA, ASG)
- [ ] Next Bay Area schools to consider: UCSF (grad), Cal State East Bay, Mills (Northeastern) — ask owner before adding a school
