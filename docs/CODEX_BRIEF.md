# Codex brief: what data exists and what you decide to show

Written by Claude (data side), 2026-11-05. Numbers are from today's files.
The owner (사장님) splits the work this way:
- **Codex:** screens, copy, design, and what is shown or hidden.
- **Claude:** collecting and serving the data.

Rules for both sides are in `AGENTS.md`. Running requests go in `docs/HANDOFF.md`.

---

## 0. Starter prompt (owner: paste this into Codex on day one)

```
너는 이 저장소(AroundU, 캠퍼스 앱 Lumi — 라이브 https://heetz.up.railway.app)의 프론트엔드 담당이다.
화면·문구·디자인, 그리고 "어떤 데이터를 화면에 보여주고 어떤 걸 숨길지"를 정한다. 데이터 수집·서버 데이터는 Claude 담당이다.

시작 전에 이 순서로 읽어라:
1. AGENTS.md (역할 나눔, 브랜치, 배포 전 검사, 사장님 규칙)
2. docs/CODEX_BRIEF.md (지금 있는 데이터, API, 네가 정할 것 목록)
3. docs/HANDOFF.md (Claude 가 너에게 남긴 요청 — 처리하면 [x])
4. docs/PRODUCT_TASTE.md (사장님 취향)

일하는 방식:
- 네 파일만 고친다: src/, index.html, 스타일, packages/core/src 의 화면용 부분(라벨, i18n, 컴포넌트 데이터).
  server/sources, server/agent, server/scripts, server/data, server/preview.ts, docs/pm-agent 는 건드리지 않는다.
  공유 파일(server/index.ts 라우트, server/view.ts, packages/core/src/types/, packages/core/src/lib/orglinks.ts)은 커밋 메시지에 이유를 적을 때만.
- 데이터가 더 필요하거나 빼야 하면 직접 고치지 말고 docs/HANDOFF.md 맨 위에 "날짜 Codex → Claude: 무엇 (왜)" 로 적는다. Claude 가 매시간 읽는다.
- 브랜치: codex/<주제> 에서 작업 → 검사 4개 통과 → claude/friendly-euler-emuo1f 에 merge(라이브 배포 브랜치).
  검사: npx tsc -b · npm run -s typecheck:server · npm test · VITE_API_MODE=remote npx vite build
- force-push·rebase 금지. 남의 커밋 다시 쓰지 않는다.
- 이모지 금지(화면 어디에도). 모은 데이터 지우지 않는다(숨기기만). 학교 로그인 뒤 링크는 보여주지 않는다(publicLinks()).
- Railway 비용이 늘 변경(상시 프로세스, 요청 증가, 큰 DB 적재)은 사장님께 먼저 묻는다.

첫 작업: docs/CODEX_BRIEF.md 의 "3. 네가 정할 것" 을 하나씩 정해서 그 답을 docs/HANDOFF.md 에 적고,
"4. 이미 열린 화면 일" 중 위에서부터 처리해라. 바꾼 화면은 실제로 띄워 보고 콘솔 에러 0 을 확인한 뒤 배포해라.
```

---

## 1. Data that exists now

### Schools
- 63 schools have club files. 2 are open in the live app (Berkeley, Merced); the rest live only in files.
- The school list is `server/data/schools-collect.csv`. Use its `tz` column to show times.
- To open a school, Claude runs `npm run agent -- import-collected:<id>` after the owner says yes.

### Clubs: `server/data/collected/<id>.orgs.json` → `Organization[]`
- 47,244 in total:
  - club: 41,957
  - greek: 2,175
  - council (student government): 1,384
  - department (school office, **hide**): 1,728
- 26,870 have at least one public link besides the directory page.
- **Link labels and counts**:

  | Label | Count | Meaning |
  |---|---|---|
  | Directory | 44,924 | the school's club page |
  | Instagram | 18,849 | |
  | Website | 15,984 | |
  | Facebook | 8,846 | |
  | LinkedIn | 3,420 | |
  | YouTube | 2,105 | |
  | X | 1,834 | |
  | Cardinal Engage | 733 | Stanford directory |
  | Presence | 640 | WashU directory |
  | Penn Clubs | 514 | Penn directory |
  | MIT Engage | 426 | MIT directory |
  | Group chat | 276 | WhatsApp / GroupMe / Slack / Telegram invite |
  | Discord | 243 | |
  | Sign-up form | 46 | Google Form / Typeform / MS Forms the club used as its website |
  | Mailing list | 17 | |
  | Document | 14 | Google Doc / Drive / Canva file |
  | TikTok | 1 | |

  `publicLinks()` in `packages/core/src/lib/orglinks.ts` already removes login-only links (CalLink, Canvas, Blackboard, …).
- `recruitment` = `{ mode, deadline?, how?, source }`. Turn it into text with `recruitmentLabel()`. Counts by mode:
  - rolling: 17,337
  - closed: 2,703
  - cycle: 95
  - deadline: 1

  Most directories don't state a deadline, so the data has almost none, and Claude never guesses one.

### Classes: `<id>.courses.json` → `CatalogCourse[]`
- 177,992 entries in total.
- 105,906 have real meeting times, across 19 schools. Examples:
  - UCLA 6,480
  - Illinois 9,811
  - USC 11,430
  - Duke, BU, CMU, Vanderbilt, GWU, Rochester, SF State, W&M, UW, Rice, Caltech, Cornell, USF, Georgia Tech
- The other entries are catalog-only (`term: 'catalog'`, no `meetings`). They are fine for search, but they have no times to put on a timetable.
- Fields:
  - `code`, `title`, `department`, `instructor?`, `location?`, `term`, `termCode`, `url`
  - `meetings: { day 0=Mon … 6=Sun, start "HH:MM", end }[]`
- Graduate courses are included.
- One course with several lecture sections becomes several entries, with "(Sec B)" in the title.
- Only lectures are kept today (see the `sections` proposal in HANDOFF).

### Events: `<id>.events.json` → `{ collectedAt, events: Opportunity[] }`
- 16,650 upcoming events (next 30 days), 58 schools, refreshed daily.
- Times are in UTC. Show them in the school's `tz`.
- `place.lat/lng` is always the school centre, not the venue (only `place.name` is real). Some events are off campus.
- Fields: `title`, `host`, `date`, `startTime`, `place?`, `description`, `tags`, `sourceUrl`, `sourceLabel`, `benefit?`.
- `tags` include `free food` and `talk`.
- Exhibits, cancelled events and online-only events are already left out.

### Jobs: `jobs-us.json` → `{ collectedAt, jobs: StudentJob[] }`
- 1,293 US postings from 166 employer boards, refreshed daily. By type:
  - internships: 842
  - new grad: 404
  - PhD: 172
  - master's: 70
  - postdoc: 13
- Fields: `company`, `sector`, `title`, `location`, `url`, `kind` (internship|job|fellowship), `audience`, `source`.

### Side files (not for screens)
These exist so nothing collected is ever deleted. Do not read them for screens.
- `<id>.deadlinks.json`: dead club websites.
- `<id>.courses-dropped.json`: cancelled or removed classes.
- `<id>.orgs-dropped.json`: groups that left the school directory.
- `*.probe.json`, `*.courses-progress.json`: Claude's work files.

## 2. API

| Endpoint | Returns |
|---|---|
| `GET /api/preview` | schools not open yet, with counts |
| `GET /api/preview/:id` | one school: clubs, upcoming events, class check |
| `GET /api/preview/:id/courses?q=` | class search for one school |
| `GET /api/jobs?q=&audience=phd\|masters\|newgrad\|postdoc\|undergrad&kind=internship\|job\|fellowship` | US student jobs (file only, no DB cost) |

- The live schools (Berkeley, Merced) use the app's usual snapshot/patch.
- Everything the server sends has emoji stripped (`server/noemoji.ts`).

## 3. What you decide (write the answers in docs/HANDOFF.md)

1. **Club types.**
   - Hide `department`.
   - Show `council` and `greek` as their own groups, mixed in with clubs, or not at all?
2. **Link buttons.**
   - Which labels get a button, and in what order?
   - Should `Directory`, `Cardinal Engage`, `Presence`, `Penn Clubs` and `MIT Engage` show? They are public school pages, but some ask to log in for details.
   - `Sign-up form`, `Group chat`, `Mailing list` and `Document` are actions, not websites. How should they look?
3. **Recruitment.**
   - Show a label for every club, or only when it isn't `rolling`?
   - What should `closed` look like?
4. **Catalog-only classes.**
   - Show them in search with a "no times yet" note, or hide them?
5. **Labs and recitations** (the `sections` proposal in HANDOFF).
   - Write "OK sections" and Claude fills them in.
   - Or say no.
6. **Events.**
   - Show all of them, or a filtered list (free food / talks / featured)?
   - How many per day?
7. **Jobs.**
   - Where in the app do they go?
   - Which filters?
   - A page already exists in preview: `src/pages/preview/PreviewPage.tsx` `PreviewJobsPage`.
8. **Not-yet-open schools.**
   - Show the preview to users at all, or keep it as an owner tool?
9. **Data you won't use.** List any field Claude can stop collecting.

## 4. Screen work already open (from docs/HANDOFF.md)

1. **Remove hard-coded emoji** in `src/` and `packages/core/src` UI constants. That is about 325 lines in 56 files: ride places, icebreakers, welcome banner, chips. Owner: "이모지는 그냥 없애셈".
2. **Jobs screen** in the app from `/api/jobs`.
3. **New link labels** (Sign-up form / Group chat / Mailing list / Document): show each as what it is, not as "Website".
4. **Reply on `sections`** (OK or no).

## 5. How to ask Claude for something

Add a line at the top of `docs/HANDOFF.md`:
`- [ ] YYYY-MM-DD Codex → Claude: <what> (<why>)`.

Claude reads it every hour, does it, and marks it `[x]`. Examples:
- "stop sending X"
- "add field Y to /api/preview/:id"
- "filter Z out in server/view.ts"
