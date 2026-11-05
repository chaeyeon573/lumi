# Lumi v3 implementation audit

The attached CODEX_START_HERE.md and PRODUCT_UX_SPEC.md are the requested product requirements. Reference PNG content is illustrative, not production data or enrollment evidence. Proposed token values below are implementation choices, not measured brand colors.

## Existing capabilities and gaps

- Vite/React web and Expo Router native share `packages/core`: Zustand snapshots, engine, API contracts, privacy and relationship checks. Express supports file/Postgres persistence, email authentication and SSE.
- Native tabs were Home/People/Meet/Feed/Profile. Existing detail routes cover activity creation/join, chat, notifications, map, class spaces, polls, organizations, profile editing and safety. Preserve these as subordinate flows.
- Reuse `TabScreen`, `AppHeader`, `Button`, `PostCard`, `JoinButton`, `WeekGrid`, timetable editor and viewer permission helpers.
- Legacy mock mode auto-seeded fictional users and auto-logged in. New local use must be empty; sample datasets require explicit demo entry and an ongoing label. Existing persistent production data must not be deleted or reset.
- Organization selection is an interest/follow, never a membership grant. Existing organization application and approval remain separate. Classmates need explicit discoverability consent.
- Opportunities have source URLs/verification dates; a source URL alone is not verification. No authenticated external jobs/events feed is configured. Add filtering adapters and show clear empty states rather than fabricate listings.
- Waitlist and audience restriction contracts need explicit backend support; do not label a failed join as a successful waitlist request.

## Visual implementation

Existing shared palette/token architecture remains. Default mist uses white surfaces, navy primary action (#303858), cool blue selection/link (#4464C8), pale lavender/ice-blue highlights, thin borders, 16px cards and compact typography. These are proposed code tokens informed by the reference, not sampled approved hex values.

## Entry paths

Home / Explore / Schedule / Social / Profile; Social = For You / Meetups / People / Feed. Legacy root People/Meet/Feed links redirect to Social tabs; detail routes remain reachable. Messages and notifications stay in header; classes and polls in Schedule; saved and privacy in Profile; map in activity detail; AI and network search in Social/People.

## Review boundaries

No production deployment or merge. Native app IDs, backend URLs, database keys and repository identity remain unchanged. Screenshot fixtures must be clearly labeled and never enter production persistence. Real mobile device testing, upstream provider credentials and publishing are distinct from browser validation.

## Verified content ingestion

`VERIFIED_SOURCE_IMPORT=1 npm run import:opportunities -- <reviewed.csv>` is a trusted operator path: set this only after reviewing original HTTPS source links, eligibility and dates. Ordinary user-shared links are not marked verified and are not promoted as verified discovery. The existing importer updates canonical IDs and preserves bookmarks/Q&A. `publicContent()` provides a read-only adapter for guest discovery without user/membership data. No external provider is configured in this handoff.

## Local data compatibility

Legacy `aroundu.mockdb.v16.*` and session keys are retained untouched. New real-local and explicit demo sessions use separate `lumi.local.v1.*` / `lumi.demo.v1.*` datasets; this prevents old generated demo people from leaking into a real local session. Existing remote data is not reset or migrated. Operators with a previously full-seeded remote database must review existing sample records before launch; changing the default seed does not delete existing data.
