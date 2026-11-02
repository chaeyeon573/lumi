# Bay Area schools — where each kind of data comes from (checked 2026-11-02)

Rule (owner, 2026-11-02): focus on Bay Area. **Clubs, student government, events and their links are loaded now** (unstructured, need to be gathered one by one).
**Class timetables are NOT loaded for schools that aren't open yet** (storage cost). For those the agent only reads a small sample every week
(`probe:<school>` in /api/agent/status, `stored: false`) to prove the recipe still works. Opening a school = move its row from
`server/data/schools-collect.csv` to `server/data/schools.csv`; the same recipe then loads everything.

| School | Clubs (loaded) | Club links | Student government | Events | Classes (recipe, sample only) |
|---|---|---|---|---|---|
| Stanford | Cardinal Engage (CampusGroups) `cardinalengage.stanford.edu` | each club's own site | ASSU — assu.stanford.edu (hand-checked) | events.stanford.edu (Localist API) | ExploreCourses XML (`stanford` adapter) — Autumn/Winter/Spring with times |
| SF State | CampusLabs Engage `sfsu.campuslabs.com/engage` — 290 | website · Instagram · Facebook · LinkedIn · X · YouTube (Engage detail) | Associated Students (in directory) | Engage events — 17 upcoming in test | bulletin.sfsu.edu (CourseLeaf) — codes/titles, no times. Test: 181 courses from 6 subjects |
| San José State | CampusGroups `sammyapp.sjsu.edu` — 440 | each club's own site | Associated Students (in directory) | — | candidate: sjsu.edu/classes/schedules/<term>.php (public per-term table; unreachable from the dev container — test on the server next) |
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
