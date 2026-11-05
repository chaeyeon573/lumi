# Lumi v3 review

Implemented against the supplied CODEX_START_HERE.md and PRODUCT_UX_SPEC.md. UI is rendered with React / React Native components. The reference PNGs are not used as screen backgrounds. Proposed code colors follow the approved visual direction without claiming sampled official brand values.

## What changed

- Web and native use Home / Explore / Schedule / Social / Profile. Social contains For You / Meetups / People / Feed; legacy root URLs redirect and detail URLs remain available.
- Six-step onboarding introduces goals and one interactive feature preview before university/status, optional content interests, optional organization follows and account creation. Undergraduate year and graduate degree are explicit; housing and Q&A are not required.
- Home works without other users. Explore has three categories, search/sort, original source links, bookmarks, expiry and deduplication. No verified source means a clear empty state.
- Schedule keeps all five weekdays visible, retains course editing and class spaces. Classmate discovery requires explicit consent and timetable visibility.
- Social offers real action-oriented empty states, meetup starters, year/status filters across academic roles, existing AI/network search and permission-aware posts.
- Own and visitor native profiles use compact avatar/name layouts, real Groups/Friends, optional Q&A, saved content, privacy and existing friendship/message/moderation APIs. The detailed legacy visitor/proposal flow remains at `/users/detail/:id`.
- Default local and fresh server data no longer seed invented people, organization memberships, posts or opportunities. Demo login is explicit; sample screens carry a demo label. Demo and local datasets are separate and survive reload.
- Private group meetup creation/join is checked in the engine; institutional organization self-selection cannot grant membership. Admin membership review API, optional audience restrictions and actual waitlist state are implemented. Waitlisted users do not consume seats; approval cannot overfill.
- Server snapshots filter private activities/posts, chats, housing, timetable details and private memberships. Interests in organizations are not exposed as verified affiliations.
- Production app IDs, GitHub identity, server URLs and database names were not renamed. No deployment or merge was performed.

## Verified

| Check                                        | Result                                                                                                                                                                    |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test:lumi`                          | 11 passed, 0 failed, 0 skipped                                                                                                                                            |
| Web app / Vite config TypeScript             | Passed using ignored build-info paths                                                                                                                                     |
| `npm run typecheck:server`                   | Passed                                                                                                                                                                    |
| Mobile workspace TypeScript                  | Passed                                                                                                                                                                    |
| Vite production build                        | Passed; existing large-chunk warning remains                                                                                                                              |
| Expo `export --platform all --max-workers 2` | Web, iOS and Android Hermes bundles generated                                                                                                                             |
| Native web onboarding                        | Real local registration, refresh/session restoration and all five tabs passed; no page errors                                                                             |
| Native web interactions                      | Save persistence, sample schedule/class detail, optional Q&A save and legacy redirects passed                                                                             |
| Web + Express integration                    | Email-code verification, registration, refresh/session restoration, five tabs and old URL redirects passed; no page errors                                                |
| Fresh Express API                            | Empty real seed, anonymous public content, disabled demo login, verified registration, authenticated bootstrap and privacy update passed using a separate `/tmp` database |
| Responsive checks                            | 375 / 390 / 430px; no horizontal document overflow on checked main screens                                                                                                |

No lint command existed in the repository; no lint pass is claimed. Native bundle generation is not an iOS/Android device run, signing test or App Store validation.

## Reproduce

Use the existing isolated checkout `/workspace/AroundU`; no second clone or worktree is needed.

```bash
npm ci --no-audit --no-fund
npm run test:lumi
node_modules/.bin/tsc -p tsconfig.app.json --incremental --tsBuildInfoFile node_modules/.cache/aroundu-app.tsbuildinfo
node_modules/.bin/tsc -p tsconfig.node.json --incremental --tsBuildInfoFile node_modules/.cache/aroundu-node.tsbuildinfo
npm run typecheck:server
npm run typecheck --workspace @aroundu/mobile -- --incremental --tsBuildInfoFile ../../node_modules/.cache/aroundu-mobile.tsbuildinfo
VITE_API_MODE=remote node_modules/.bin/vite build
```

For native browser tests, start `CI=1 EXPO_OFFLINE=1 npm --prefix apps/mobile run web -- --port 8091` in default local/mock mode. Browser dependencies can be installed outside the repository:

```bash
npm install --prefix /tmp/lumi-review-tools --no-audit --no-fund playwright
NODE_PATH=/tmp/lumi-review-tools/node_modules LUMI_TEST_URL=http://127.0.0.1:8091 node tests/lumi-browser.cjs
NODE_PATH=/tmp/lumi-review-tools/node_modules LUMI_TEST_URL=http://127.0.0.1:8091 node tests/lumi-demo-browser.cjs
NODE_PATH=/tmp/lumi-review-tools/node_modules LUMI_TEST_URL=http://127.0.0.1:8091 node tests/lumi-interactions.cjs
```

These tests use `/usr/bin/chromium`, create only local test accounts and explicitly opt into demo data. Screenshots default to `/tmp/lumi-review`; use `LUMI_SCREENSHOT_DIR` to select another folder. Allow the normal execution-tool network/binding permissions when needed; do not bypass the cloud proxy or TLS verification.

## Data and remaining limitations

- No live job/event/campus facility provider is configured. A read-only public-content adapter and reviewed CSV ingestion are available. Use `VERIFIED_SOURCE_IMPORT=1` only after verifying original HTTPS sources and dates. Ordinary user-shared links are not promoted as verified opportunities.
- Existing full-seeded remote databases are preserved. Changing the default seed does not remove pre-existing sample rows. Operators must review those datasets before a real launch. Fresh real instances start empty.
- Legacy `aroundu.mockdb.v16.*` local data remains untouched; automatic migration of old mixed demo/real local data is not performed. New local/demo data uses separate namespaces.
- Existing built-in course catalog meeting times are examples, not a live registrar feed. Native physical-device behavior, push notifications and real email delivery need their configured services/device checks.
- Waitlist membership is persisted, but there is no automatic promotion/notification workflow when a seat opens. Hosts can review participants without exceeding capacity.
- Organization membership review is available through the admin-authorized API; a dedicated reviewer dashboard is not added in this pass.
- Existing secondary editors/detail screens retain their existing localization and some legacy visual components. Native main screens and onboarding received the main design pass; the web visitor detail still preserves its existing richer profile/proposal flow.
- GitHub Git access works. The GitHub repository API returned `Forbidden`, so creating a PR requires enabling `api.github.com` in environment settings. That host addition was saved as a draft, not applied or published. No new token was requested.

## Screenshots

See [the screenshot gallery](SCREENSHOTS.md). All populated social scenarios are explicitly labeled demos; the zero-social/content scenario is a browser-only demo fixture, not a production feed. Test accounts shown in empty-state screenshots are local QA accounts.
