# Outbound course links (per school)

Course rows (S029) and the class page (S030 "Elsewhere") link out to sites students already use. **Links only** — we
never fetch, copy or show their data (grade distributions, ratings, enrollment numbers): that breaks their terms, and we
don't show numbers we can't vouch for. The links open with `openExternal` (system browser in the iOS shell, `noopener` on the web).

Everything lives in `packages/core/src/lib/courseLinks.ts` → `COURSE_LINKS: schoolId → { rmpSchoolId?, courseSites? }`.
The UI draws whatever that gives for the course's school; a school with no entry shows no "Elsewhere" group and no
Berkeleytime-style link — no placeholder.

| School | Rate My Professors | Course site | Verified |
|---|---|---|---|
| UC Berkeley (`s_berkeley`) | school id 1072 | Berkeleytime `https://berkeleytime.com/catalog/{year}/{Term}/{SUBJECT}/{NUMBER}/{section}/1`, falling back to `…/catalog/{year}/{Term}` | 2026-11-06 in a real browser: COMPSCI 61A 001, DATA C100 001, MATH 51 002 (Fall 2026), STAT 134 001 (Spring 2027) |

Berkeleytime details: SUBJECT is the official subject (`CS` → `COMPSCI`, from `BERKELEY_ABBR`); Term is capitalised;
the section is the lecture's 3 digits from the class page address (`…-lec-002`), `001` when we have no address. Two-word
subjects (`POL SCI`, `L & S`) and lettered sections (`061A`) were not checked, so they get the term catalog page instead.
Rate My Professors: one link per real instructor name (not "Staff"/"TBA"), `…/search/professors/{rmpSchoolId}?q=<name>`.
No `rmpSchoolId` → no RMP link (a search without a school id mixes in people from other schools).

## Opening a new school — checklist

1. **Rate My Professors id.** Search `https://www.ratemyprofessors.com/search/schools?q=<school name>`, open the school,
   and copy the number from its URL (`/school/1072`). Open `/search/professors/<id>?q=<a real instructor>` and check the
   instructor at that school comes up.
2. **Student-run grade / course site, if there is one.** Find the deep-link shape, then open it **in a real browser** for
   at least three courses (different subjects, a non-001 section, next term if listed). If any doesn't land on the right
   course, use the site's catalog page as the link, or leave the site out. Never guess a URL.
3. **Add the entry** to `COURSE_LINKS` with a comment saying what you checked and when, and a row to the table above.
4. **Add a unit test** in `server/coursefinder.test.ts`: the school builds exactly the links you verified (and a school
   with only `rmpSchoolId` builds only RMP).
