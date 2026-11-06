# Harness A — screen map (S001–S096)

Source: `Lumi_Harness_A_All_96_Screens.pdf` (35 pages, owner 2026-11-05: "이 PDF가 앱 구성을 잘했어. 깔끔하게.
불필요한 거 빼고. 이거 따라서 앱 만들어봐. 대신 앱 화면은 검정색으로"). We follow the PDF's **structure, screens,
layout and components**, rendered in our dark theme (`src/index.css`, see COMPONENTS.md). Reference renders of a few
PDF pages are in `ref/`.

**Owner addendum (2026-11-05): "RSF, 학식 정보는 꼭 넣어야 해!"** — gym crowd and dining are **kept**: S015
Recreation = the live RSF crowd meter, S016 Dining = Cal Dining menus, both reachable from Home ("Campus today").

Status (2026-11-06): **built** = routed and rebuilt with `src/components/ha`; **HELD** = not built, no route, waiting for
an owner decision (Ask AI, network). Lumi+ (S087/S088) was decided 2026-11-06 and is built without payments (`docs/LUMI_PLUS.md`). The per-screen planning notes from the build (`exists-restyle`,
`needs-backend`, …) are in git history (PLAN.md has the packages).

Route column = the final address in `src/routes/*.tsx` (the comments there carry the S-numbers). "→ here" lists old
addresses that redirect (`src/routes/redirects.tsx`).

Common PDF patterns used below (all in `src/components/ha`): **BrandHeader** ("Lumi" + icons), **TitleHeader**
(big title + icons), **BackHeader** ("‹ Title ···"), **PageTitle**, **SegTabs** (underline), **Chip/ChipRow**,
**SearchField**, **ListingCard**, **MeetupCard**, **PersonCard**, **RowCard**, **InfoRows**, **EmptyState**,
**EmptyCard**, **InfoNote** ((i) footnote), **BottomCTA**, **OnboardingHeader** ("‹ Lumi · n of 6   Skip").

---

## Onboarding (S001–S011) — WP1

| ID | Screen | Route | What it shows (PDF) | Backed by | Status |
|---|---|---|---|---|---|
| S001 | Welcome | `/welcome` | "English" (language) top-right; **Lumi** wordmark with dot; "Your college life, all in one place."; "Discover your campus. Make a plan. Find your people."; three tilted chips (Your week · Good company · Your communities); **Get Started**; "Sign In" link; Terms · Privacy | `WelcomePage.tsx` (demo login `?demo=`, e-mail sign-in sheet, `setLang`) | built |
| S002 | Email login | `/login` (old `/welcome?signin=1` → here) | OnboardingHeader "6 of 6"; title; "A little more campus. A little more you."; School email (mail icon); Verification code (lock icon); BottomCTA **Sign In** | `api.schools.sendVerificationCode`, `api.auth.loginWithCode` (WelcomePage sheet) | built |
| S003 | Your goals | `/start/goals` (`/start` → here) | "1 of 6"; "What would you like to get out of Lumi?"; 5 selectable rows with tinted icon tiles (Find events & opportunities · Plan my classes · Explore clubs & groups · Meet new people · Campus life), check circle; InfoNote "You can change this later."; **Continue** | `StartPage.tsx` step `goals` (`GOAL_OPTS` → `goals/interests/purposes`) | built |
| S004 | What Lumi can do · Classes & Schedule | `/start/what` | "2 of 6"; 2×2 pill selector (Classes & Schedule · Events & Opportunities · Clubs & Groups · Social); "Sample preview" card: example week grid Mon–Fri 9–5 | `StartPage` step `how` (3 static cards today); `WeekGrid` for the preview | built |
| S005 | What Lumi can do · Events & Opportunities | `/start/what?p=events` | same selector; two sample ListingCards (badge, title, "Example listing", View source, bookmark) | static sample content (must say "Sample preview", PRODUCT_TASTE: no fake data presented as real) | built |
| S006 | What Lumi can do · Clubs & Groups | `/start/what?p=clubs` | same selector; three RowCards (Photography Club "Creative · Followed" …) | static sample | built |
| S007 | What Lumi can do · Social | `/start/what?p=social` | mini Social: underline tabs, "Good plans. Your people.", Start a Meetup / Find People, chips, a MeetupCard, a post card | static sample | built |
| S008 | Your university | `/start/university` | "3 of 6"; "Find your campus. Make it yours."; University SearchField; selected school card; "Student status" chips Undergraduate/Graduate/Alumni; "Year · optional" chips 1st/2nd/3rd/4th+; InfoNote "Master's / PhD and graduation year are editable later." | `StartPage` step `school` (`api.schools.search`, `ROLES`), `ComingSoonSchools` | built |
| S009 | Make it yours | `/start/discover` | "4 of 6", **Skip**; "Choose the content you'd like to discover. This step is optional."; 2-col tinted tiles with check: Internships · Research · Hackathons · Scholarships · Campus events · Communities · Recreation · Dining | `StartPage` step `topics` (`TOPICS` → goals/interests) | built |
| S010 | Your communities | `/start/communities` | "5 of 6", **Skip**; hero card "Connect through shared communities" ("Illustrative profiles · not a membership roster"); chips Student Clubs · Greek Life · Research Labs · Major/Department · Sports · Cultural Groups · Residence · Co-op · + Add your own; "Search organizations"; InfoNote "Membership is verified separately…"; **Next** | `StartPage` step `communities` (`COMMUNITIES` → goals/interests). Org search before sign-up has no API (orgs come with bootstrap after login) | built |
| S011 | A little about you | `/start/about` | "6 of 6"; "Your timetable, housing and memberships start private."; Your name; Birth year ("Private to you"); School email; Verification code; **Get Started** | `StartPage` steps `name` + `email` (`api.auth.register`, school-email code, 16+ check) | built |
| S011b | Use your student ID (not in the PDF) | `/start/student-id` (from S011 "Can't use your school email? **Use your student ID**"; alumni: "No school email anymore? **Use your alumni card**") | "6 of 6"; title "Use your student ID" / "Use your alumni card"; one line "Only the Lumi team sees this photo, and we delete it as soon as we've checked it."; dashed card "Take a photo of your student ID" (camera) + link "Choose from photos"; preview with Retake · Choose another; link "Add an email for signing in · optional" (any e-mail + code, sign-in only); InfoNote "Usually checked within a day…"; **Send for review**. S008 shows an alumni InfoNote pointing here | `StudentIdStep.tsx`, `IdPhotoPicker`; `auth.register` without e-mail → pending, `verification.submitStudentId`, `auth.addSignInEmail` (server/idverify.ts, server/signin-email.ts — owner 2026-11-06: e-mail first, then a photo) | built |

## Home (S012–S016) — WP2

| ID | Screen | Route | What it shows (PDF) | Backed by | Status |
|---|---|---|---|---|---|
| S012 | Home | `/` | BrandHeader (search · bell · messages); "Good morning! ☀" + "What's happening on campus"; 2×2 CategoryTiles Events (ice) · Opportunities (peach) · Clubs (mint) · Meetups (rose); **Campus today** (owner: RSF % · dining open/meal → S015/S016); "For you" + See all › (ListingCards); "Your week" RowCard; "My Communities" + Explore › RowCards; tab bar | `HomeDashboard.tsx`: `forYou()`, `campusLive.now()`, `me.timetable` (`statusNow`), orgs followed/member | built |
| S013 | Home · first user | `/` (no recommendations yet) | same, For you = EmptyCard "Your campus starts here." [Explore Campus][Create Meetup] | same component, empty branch | built |
| S014 | Home · content, no social users | `/` (content, no social users) | For you card present, My Communities "Find your communities" | same | built |
| S015 | Recreation | `/recreation` (old `/gym` → here) | BackHeader "Recreation"; big title; "UC Berkeley · Recreation"; **real data**: crowd % / people–capacity / hourly chart / "tell me when under X%" alert (owner); "Check the official source" card [↗ RecWell]; InfoNote "No live occupancy is shown without a verified feed." **only when the feed is unavailable/stale** | `GymPage.tsx`, `campusLive.gym/setGymAlert`, `server/gym.ts`, `server/campus-live.ts` | built |
| S016 | Dining | `/dining` | BackHeader "Dining"; "UC Berkeley · Dining"; **real data**: open/closed per hall, meal tabs, stations, diet filters, favorites (owner); official-source card; note only when menus unavailable | `DiningPage.tsx`, `campusLive.dining/favorite`, `server/dining.ts` | built |

## Explore (S017–S026, S089–S091) — WP2

| ID | Screen | Route | What it shows (PDF) | Backed by | Status |
|---|---|---|---|---|---|
| S017 | Explore · Events | `/explore/events` (`/explore` → here) | TitleHeader "Explore" + icons; SegTabs Events · Opportunities · Clubs; SearchField "Search events"; one filter row (FilterBar: [Filters (n)] + applied × chips, sort quietly on the right) → FilterSheet Sort (Recommended · Newest · Soonest) · When (Today · This week · This weekend, `?when=`) · Kind (free food · talks · career · social — the kinds the list has, `?type=`); ListingCards (image, "Campus event" badge, title, date · place, View source ↗, bookmark) | `ExplorePage.tsx` (header + tabs done) → body is still `BrowseTab only={['event']}` + `OrgEvents`; data: `opportunities` type `event`, org events (`activities.kind=org_event`) | built |
| S018 | Explore · Opportunities | `/explore/opportunities` | same; badges Internship / Research / Hackathon …; meta "listing · source" + its own location line; FilterSheet Sort (Recommended · Newest · Closing soon) · Type (`?type=`) · Location (`?region=`, only places that have listings, Bay Area first, Remote last) · Deadline (Any · Closes this week · This month, `?due=week|month` = within 7 / 30 days) · For (PhD/MS, `?kind=phd`, grad students only) · Saved (`?saved=1`, once something is saved; old `?type=saved` / `?sub=saved` still open it) | `BrowseTab` chips foryou/internship/research/scholarship/hackathon/startup/exchange; `forYou`, `badgeOf`, `toggleSave` | built |
| S019 | Explore · Clubs | `/explore/clubs` | "Search clubs"; FilterSheet Sort (Recommended · Newest — no "Closing soon" for clubs) · Type (Student Clubs · Greek Life · Research Labs · Co-op, `?type=`; no type = every kind, old `?type=all` = the same); text-only rows — a real logo only when the club uploaded one, no tinted icon (owner 2026-11-06): name, the club's one-line description, "Creative · Followed" / "Recreation · Public organization", ›); InfoNote "Followed is different from verified membership." | `BrowseTab only={['clubs']}` (CLUB_KINDS, follow) | built |
| S020 | Campus event (detail) | `/opportunities/:id` (type event) | BackHeader (no title, ···); badges "Campus event" + "Source verified"; chip "📅 deadline · View source"; big title; "host · office"; SegTabs Details · Q&A n; description TextCard; InfoRows Who it's for / Benefits / Original source; outline "↗ Register at Source"; BottomCTA [bookmark] **Going** | `OpportunityDetailPage.tsx` (`setIntent('going')`, `toggleSave`, `qna`) | built |
| S021 | Opportunity details | `/opportunities/:id` | same; badge type ("Exchange"); BottomCTA [bookmark] **Apply at Source ↗** (ux-sim 2026-11-06 — the PDF's "I applied" read as a claim and hid the link); coming back from the source asks "Did you apply?" → `setIntent('applied')`; no source link → **I applied** | same | built |
| S022 | Community · About | `/orgs/:id` | BackHeader "Community — About"; **no placeholder block** (owner 2026-11-06): real cover banner and real logo only when uploaded, else the big name first; category badge + one meta line ("Outdoors · 24 students follow"); action row **Ask to join** (primary, every club incl. directory clubs with no organizers) + Follow (outline); people line "7 students asked to join · 2 friends follow" with faces; SegTabs. Ask → consent sheet "We'll tell {Club} you want to join" / "{Club} organizers will see your name, year and major and can message you." [Ask to join] [Cancel]. After: own status ("You asked · waiting for {Club}" / "Sent to {Club}"), request card (Saved / Sent / We told — only what really happened), How to join (sign-up link · who can join · next info session), Go together for the next event, Membership "N students asked to join"; quiet "Are you an organizer? Manage this page"; ··· Withdraw | `OrgPage.tsx` (`orgJoinState`, `@core/lib/clubjoin`, `api.clubs.ask/manageLink`, `api.orgs.withdraw`, `toggleFollow`, `publicLinks`) | built |
| S023 | Community · Feed | `/orgs/:id?tab=feed` | post cards; InfoNote "Only posts you are allowed to view appear here." | `OrgPage` posts tab (`PostCard`, `canViewPost`) | built |
| S024 | Community · Events | `/orgs/:id?tab=events` | ListingCard + MeetupCard, each dated; none → "No dated events yet" + what the club lists ("Weekend hikes") + **Their page ↗** when it has a public one — never an undated activity shown as an event | `OrgPage` events tab (org activities + listed events) | built |
| S025 | Community · Members | `/orgs/:id?tab=members` | PersonCards with "View"; InfoNote "Member visibility follows each person's privacy settings." | `OrgPage` members tab (`memberIds`, `canViewField`) | built |
| S026 | Create a group | `/orgs/new` | Group name · About · Group type (select) · Join policy (select); InfoNote; **Create Group** | **no `orgs.create` API** (orgs come from imports / admins) | built |
| S089 | Explore without an account | `/guest/explore`, `/guest/explore/:section` | BackHeader "Explore without an account"; Explore tabs/search/FilterBar + FilterSheet/cards read-only (same sheets minus For and Saved); BottomCTA **Join Lumi**. No profile to rank by: listings closing today are left out and Recommended puts campus / Bay Area ones first (`lib/publicexplore`, ux-sim 2026-11-06) | **no public listings endpoint** (`/api/bootstrap` needs a session; `/preview` reads files for schools not open yet) | built |
| S090 | Opportunity Q&A | `/opportunities/:id?tab=qna` | SegTabs Details · Q&A; TextCard "Questions & answers"; "Your question" TextArea; InfoNote; BottomCTA **Post Question** | `api.opportunities.ask/review`, `o.qna`, `o.reviews` | built |
| S091 | Membership requests ("who asked") | `/orgs/:id/requests` | PersonCards: name · year · major of students who consented (blocks excluded) + Message / Approve; **Message all N waiting** (one sheet, sent as "{Club} (organizer)" into each 1:1 chat); outline "Decline Selected Request" | `org.requesters` (server/view.ts, organizers only), `api.orgs.respondApplication`, `api.clubs.message` (server/clubs.ts, rate-limited) | built |
| S097 | Club setup (organizer) | `/club-setup/:token` (no account, link sent only to the club's directory e-mail) · `/orgs/:id/setup` (organizer account) | PageTitle club name + "N students are waiting…"; Sign-up link (https) · Who can join chips (Open to all / Application / Tryouts / Dues) + note · Next info session date/time/place · Logo + cover (optional, real photos only); card "See who asked" → sign in/up → **organizer of that club**; BottomCTA **Publish how to join** (notifies every waiting student) | `api.clubs.setup/saveSetup/setupPhoto/claim/saveHowToJoin/photo` (server/clubs.ts — hashed, club-scoped, expiring tokens) | built |
| S098 | Club outreach e-mail (admin preview) | `GET /api/admin/clubs/:id/outreach-preview?format=html` (x-admin-key) · opt-out `/club-optout/:orgId/:token` | "{N} Berkeley students asked to join {Club} on Lumi" — Add how to join → · See who asked → · Don't e-mail us again. No student names. Sent only with `CLUB_OUTREACH=1`, ≥3 waiting, ≤1 per club per 30 days | `server/clubs.ts` (`clubOutreach` log, opt-out) | built (off) |

## Schedule + Planning (S027–S036) — WP3

| ID | Screen | Route | What it shows (PDF) | Backed by | Status |
|---|---|---|---|---|---|
| S027 | Schedule | `/schedule` | TitleHeader "Schedule" + calendar (edit) icon; "‹ Your week ›"; WeekGrid Mon–Fri with tinted class blocks; RowCard "A free afternoon / Find a plan between classes"; outline "+ Add Class" + link "My Plans" | `ScheduleTab.tsx` (new), `WeekGrid`, `freeBlocks` | built |
| S028 | Schedule · empty | `/schedule` (no classes) | empty grid + EmptyState "Make the week yours" [Add Classes] | same | built |
| S029 | Add / edit a class | `/schedule/classes` (add; old `/timetable` → here), `/schedule/classes/:id` (edit) | Course name; day chips Mon–Fri; Start/End time (clock icon); Classroom "Optional · private"; Instructor Optional; **Save Class** | `TimetablePage.tsx` (catalog search, sections, manual entry), `api.users.update({timetable})` | built |
| S030 | Class space | `/classes/:courseName` | BackHeader; hero card "Your class space / Calculus"; SegTabs Class · Questions · Study; InfoRows class time / classroom (private); "Study together" + Create › MeetupCard; InfoNote "Classmates appear only when they opt in…" | `ClassPage.tsx`, `StudyGroupPage.tsx`, `classRosters`, `api.classes.respond/setPartner` | built |
| S031 | My Plans | `/schedule/plans` (old `/plans` → here) | SegTabs Upcoming · Past · Created; "Your confirmed plans" MeetupCards; "Going events" ListingCards; InfoNote "Interested and waitlisted items are not confirmed plans." | `PlansPage.tsx` (`planFeed`), participations, opportunity intents `going` | built |
| S032 | Create a meeting | `/schedule/meeting/new` (also `/together/new`) | Title; Group (select); Date range ("Choose a week"); Duration chips 30 min / 1 h / 1.5 h / 2 h; "Location ideas" chips with ×; "+ Add Ideas"; **Set Up Poll** | `CreateTogetherPage.tsx`, `api.together.create` (TimePoll) | built |
| S033 | Location Ideas | `/schedule/meeting/new/places` | "Where would you like to meet?"; place field; "Quick ideas" 2×2 tiles Café / Library / Study room / Online; "Your suggestions" rows with ×; "+ Add Another Place"; **Save Ideas** | place options exist only on link plans (`PlanInput.placeOptions`, `plans.ts`); TimePoll has one `place` | built |
| S034 | Find a Time | `/together/:id/find` | group RowCard "Suggested place: Café"; week heatmap (some / best overlap); "Best match" mint card; **Confirm Plan** | `TogetherPage.tsx` votes → overlap; `api.together.decide` | built |
| S035 | Plan Confirmed | `/together/:id` (decided) | big check; "Plan Confirmed"; InfoRows When / Where; "Your group" avatars; outline "Send Group Message"; **Add to My Schedule** | `together.decide` → activity + chat room | built |
| S036 | Time poll | `/together/:id` | title + big poll name; group RowCard "1 hour · Example week"; SegTabs Availability · Places; "Which times work for you?" selectable grid; InfoNote; **Submit My Availability** | `TogetherPage.tsx`, `api.together.vote/addOption` | built |

## Social · Meetups · Feed · People (S037–S067) — WP4

| ID | Screen | Route | What it shows (PDF) | Backed by | Status |
|---|---|---|---|---|---|
| S037 | Social · For You | `/social` (old `/meet` → here) | BrandHeader (bell · messages) + big "Social"; SegTabs For You · Meetups · People · Feed; "Good plans. Your people." [Start a Meetup][Find People]; chips Coffee/Study/Workout/Lunch; MeetupCards; post card | `SocialPage.tsx` `SocialForYouPage` (`visibleActivities`, `visiblePosts`, `MEET_KINDS`) | built |
| S038 | Social · Meetups | `/social/meetups` | "Better together" + "+ Create" pill; chips All · My Groups · My Classes · Nearby; MeetupCards; "Your groups" RowCards | `MeetPage.tsx` (kind tiles + list today) | built |
| S039 | Social · People | `/social/people` (old `/people` → here) | "Search people"; chips All · 1st · 2nd · 3rd · 4th+ · Graduate · Alumni; links "More Filters" / "Ask Network"; PersonCards with **Add Friend**; "✦ Ask AI" pill | `SocialPeoplePage` (hub rows today) + `HomePage.tsx` people browse (`/social/people/explore`), `sendFriendRequest` | built |
| S040 | Social · Feed | `/social/feed` | chips All · My School · My Groups; composer "What's on your mind? +"; post cards (image optional) | `SocialFeedPage` → `FeedTab` (`CommunityPage.tsx`), `posts.*` | built |
| S041 | For You empty | `/social` (empty) | EmptyState coffee "Start something small" [Start a Meetup] + chips | `SocialForYouPage` empty branch | built |
| S042 | Meetups empty | `/social/meetups` (empty) | EmptyState "Make the first plan" [Create Meetup] | `MeetPage` | built |
| S043 | People empty | `/social/people` (empty) | EmptyState "Good company starts somewhere" [Invite Friends] + My Classes / My Communities | `SocialPeoplePage`, invite = `shareOrCopy` | built |
| S044 | Feed empty | `/social/feed` (empty) | EmptyState "Be the first to share" [Share Something] + "Ask a Question" | `SocialFeedPage` empty branch | built |
| S045 | Create a Meetup | `/meetups/new` | Title; Date; Starts/Ends; Location; visibility chips Campus-wide / My verified groups / Class / Invite only; Capacity; status chips All statuses / Undergraduate / Graduate / Alumni; InfoNote; **Create Meetup** | `CreateActivityPage.tsx` (meetup mode: photo, 4 kinds, 3 visibilities), `QuickMeetup.tsx`, `api.activities.create` | built |
| S046 | Meetup details | `/activities/:id` | BackHeader; "Meetup details"; HeroBanner tinted by kind; big title; "Hosted by …"; InfoRows When / Where / Who can join; description; chips Details · Group chat · Time poll; InfoNote "Approval required → Request to Join. Full → Join Waitlist."; **Join Meetup** | `ActivityDetailPage.tsx`, `JoinButton`, chat room per activity | built |
| S047 | Edit meetup | `/activities/:id/edit` | same form as S045; **Save Changes** | `CreateActivityPage` edit mode, `activities.update` | built |
| S048 | Manage participants | `/activities/:id/manage` | SegTabs Joined · Requests · Waitlist; PersonCards Joined / Approve / Review; InfoNote | `ManageActivityPage.tsx` (`approve/reject`) | built |
| S049 | Small Tables | `/social/small-tables` | "Small plans, good company."; chips All/Coffee/Study/Lunch; MeetupCards; RowCard "+ Create a small table" | activities filtered by category + small capacity | built |
| S050 | Create an activity | `/activities/new` | same form; **Publish Activity** | `CreateActivityPage` | built |
| S051 | Share something | `/create/post` (`/posts/new` → here) | author row; type chips Post/Question/Photo; textarea; Add photo tile; Visibility select; Post to select; InfoNote; **Share Post** | `CreatePostPage.tsx`, `posts.create`, `system.uploadPhoto` | built |
| S052 | Post & replies | `/posts/:id` | post card; "Replies"; reply composer pill | `post.comments`, `api.posts.comment` (comments open inline today) | built |
| S053 | Meetup location | `/activities/:id/location` | stylised map with general area pin; RowCard "General area · venue agreed by the group"; InfoNote "People's precise locations are never displayed." | `activity.place` (lat/lng when set). The campus **Map tab stays dropped**; this is a per-meetup view only | built |
| S054 | Public profile | `/users/:id` | BackHeader; avatar + big name + school + "Design · Second-year"; bio; [Add Friend][Message]; "n Groups n Friends"; Get to know me card; My Communities; My Events & Meetups chips; "Visible, confirmed plans only." | `PersonPage.tsx` (`canViewField`, friend requests, `chats.openDirect`) | built |
| S055 | Suggest a meetup | `/users/:id/suggest` | To (person); kind chips; Your message; When; InfoNote; **Send Suggestion** | `api.proposals.create(fromId, toId, {category, message, when})` + `respond` | built |
| S056 | Search Lumi | `/search` | SearchField "Search events, people, clubs…"; SegTabs All · People · Events · Clubs; "Recent searches" RowCards; "Explore more" 2×2 CategoryTiles | `SearchPage.tsx` (activities/people/orgs) | built |
| S057 | Find people naturally | — (none) | "Tell us the kind of company you're looking for."; textarea; starter chips; InfoNote; **Find People** | `server/ai-search.ts` / `api.ai.ask` exist but Ask AI was **removed by the owner 2026-10-19** (PRODUCT_TASTE) | **HELD — Ask AI / natural-language people search (Ask AI removed 2026-10-19; owner decision first)** |
| S058 | People results | `/social/people/results` | SearchField; chips All statuses / Same campus / Shared interests; PersonCards Add Friend; InfoNote "Suggestions reflect registered people, not school rosters." | `HomePage.tsx` people browse, `matchReasons` | built |
| S059 | People filters | `/social/people/filters` | Year & status chips; Spoken language; Interests; Communities; University; **Show Results** | `PeopleFiltersPage`; spoken language · interests · communities are Lumi+ (lock + "Lumi+" when `LUMI_PLUS` is on; `POST /api/plus/people-match` refuses non-members) | built |
| S060 | People around your network | — (none) | as S058 | friends-of-friends — must not expose private relationships | **HELD — network (2nd-degree suggestions)** |
| S061 | Something in common | `/social/people/common` | as S058 | shared classes/orgs/interests (`matchReasons`) | built |
| S062 | Your extended network | — (none) | chips Second degree / Shared communities; path card (3 avatars); PersonCard View; RowCard "Ask for an introduction"; InfoNote | no intro/2nd-degree API | **HELD — network** |
| S063 | Ask your network | — (none) | What are you looking for?; Interests; Reach select; InfoNote; **Share Request** | none | **HELD — network requests** |
| S064 | Network requests | — (none) | SegTabs For you · My requests · Responses; RowCards | none | **HELD — network requests** |
| S065 | Network request | — (none) | author row; big question; detail card; chips; RowCard "Shared reach"; outline "Suggest Someone"; **I Can Help** | none | **HELD — network requests** |
| S066 | Respond to a request | — (none) | chips I've tried this / I know someone; short response; "Details to share" toggle rows; **Send Response** | none | **HELD — network requests** |
| S067 | Ask AI | — (none; old `/ask` → `/social`) | sparkle tile; "A little help finding your people."; chat bubbles; PersonCard; input pill; InfoNote | `api.ai.ask` exists; **owner removed Ask AI 2026-10-19 — confirm before building** | **HELD — Ask AI (removed 2026-10-19)** |

## Messages · Profile · Settings · System (S068–S088, S092–S096) — WP5

| ID | Screen | Route | What it shows (PDF) | Backed by | Status |
|---|---|---|---|---|---|
| S068 | Messages | `/chats` | BackHeader; SearchField "Search messages"; SegTabs All · Direct · Groups; rows avatar · name · last message · time | `ChatInboxPage.tsx`, `chatRooms` (`direct` / `activity` / `org`) | built |
| S069 | Conversation | `/chats/:roomId` | BackHeader (name); bubbles (others surface left, me tinted right); "Make it a plan" card [📅 Create a Time Poll]; composer pill (+, Message…, send) | `ChatRoomPage.tsx`, `chats.send/markRead`; poll → `/schedule/meeting/new` | built |
| S070 | Notifications | `/notifications` | BackHeader; SegTabs All · Unread; RowCards with tinted icons (friend request, plan confirmed, reply, opportunity reminder) | `NotificationsPage.tsx`, `notifications.markRead/markAllRead` | built |
| S071 | Your profile | `/profile` | BrandHeader (settings · messages); avatar + name + school + dept · role; bio; [Edit Profile][Share Profile]; n Groups n Friends; Get to know me; My Communities; My Events & Meetups (Upcoming/Past/Created); footer Saved · My Posts · Settings | `ProfilePage.tsx` (rebuilt) | built |
| S072 | Edit Profile | `/profile/edit` | Name · Bio · University · Student status · Academic year · Spoken languages · Country of origin; **Save Profile** | `EditProfilePage.tsx`, `users.update` | built |
| S073 | Get to know me | `/profile/prompts` | "Optional. A few short answers…"; 3 textareas (I'm always down for… / My ideal weekend… / I'm looking for people to…); **Save Answers** | `EditPromptsPage.tsx`, `me.prompts` + `questionById` | built |
| S074 | My Communities | `/profile/communities` (old `/orgs/mine` → here) | SegTabs Followed · Member; RowCards; InfoNote; outline "Explore Communities" | orgs `followerIds` / `memberIds` / `adminIds` | built |
| S075 | Friends & followers | `/profile/friends` · `/profile/followers` · `/profile/following` (`/profile/:list`) | SegTabs Friends · Followers · Following; SearchField; PersonCards with Message; InfoNote "Friends are mutually confirmed…" | `ProfileListPage.tsx` (`friendsOf/followersOf/followingOf`) | built |
| S076 | Saved | `/profile/saved` | SegTabs Opportunities · Events · Clubs; ListingCards; club RowCards | `opportunityIntents.saved`, followed orgs | built |
| S077 | Saved people | `/profile/saved-people` | SearchField; chips; PersonCards; folder chips (All folders · … · New folder) and a private-note line under each card (sheet: Folder · Private note) | `relationships.likes` (private "관심 목록") + folders/notes `server/savedpeople.ts` (`/api/saved-people/*`, owner-only; Lumi+ when `LUMI_PLUS` is on) | built |
| S078 | Recommendation preferences | `/profile/preferences` | "Your goals" chips; "What you'd like to discover" chips; Interests; InfoNote; **Save Preferences** | `me.goals`, `me.interests`, `users.update` | built |
| S079 | What you're looking for | `/profile/looking-for` | "People you'd like to meet" chips; "Things you'd like to do" chips; context textarea; **Save Preferences** | `me.lookingFor`, `me.purposes`, `me.likes` | built |
| S080 | Open to | `/profile/open-to` | chips Coffee/Study/Advice/A walk/Lunch; When; Visible to; InfoNote "temporary, optional status…"; **Save** | `users.setAvailability`, `openSlot` activities (`OpenSlotSheet`) | built |
| S081 | Your student status | `/profile/status` | option RowCards Undergraduate / Graduate / Alumni; InfoNote; **Update Status** | `affiliation.role` via `users.update` | built |
| S082 | Your next chapter | `/profile/next-chapter` | Graduation year · City · Company · Role · Industry; **Save** | only `affiliation.year`; no city/company/role/industry | built |
| S083 | Discovery & privacy | `/settings/discovery` | toggle card "Classmate discovery / Off by default"; Membership display chips; Spoken languages; Country of origin; Academic year; **Save Privacy** | partial: `settings` visibility; classmate roster opt-in lives in classes; membership display / languages / country not stored | built |
| S084 | Settings | `/settings` | sections "Your account" (Edit Profile · Discovery & privacy · Visibility settings · Privacy & safety) and "App" (Notifications · Language · Lumi+) as RowCards; "⇥ Sign Out" link | `SettingsPage.tsx` (design switch removed in foundation), `logout`, `setLang`, push row, feedback, delete account | built |
| S085 | Visibility settings | `/settings/privacy` | "Who can see your profile?" chips Friends / My school / Everyone; toggle rows University · Prompt answers · Group memberships · Housing · Class timetable; **Save Privacy** | `PrivacySettingsPage.tsx`, `VisibilityPicker`, `user.privacy` | built |
| S086 | Privacy & safety | `/settings/safety` | RowCards Blocked accounts · Report a concern · Messaging permissions · Account security · Download your data · Delete account | `SafetySettingsPage.tsx`, `DeleteAccountCard`, block list | built |
| S086b | Your student ID (not in the PDF) | `/verify-id` (from the top banner "Add photo" / "New photo" and the "We couldn't verify" notification) | BackHeader; PageTitle "Your student ID" + the same one-line privacy note; "Last time: <reason>" after a rejection; photo card; Sign-in email RowCard; **Send for review**. While in review: EmptyState "We're checking your photo" + link "Send a clearer photo instead". App-wide banner while pending (`VerificationBanner` in AppShell). Admin side: `/admin/verifications` (ADMIN_KEY) | `VerifyIdPage.tsx`, `SignInEmailCard` (also in Account security), server/idverify.ts | built |
| S087 | Lumi+ | `/settings/plus` (Settings → App → Lumi+) | sparkle tile; "Lumi+" · "A few extras, on your terms." · US$2.99 / month; RowCards More ways to discover · Save what matters · Make more plans · Your privacy stays yours ("Safety never depends on a paid plan"); InfoNote "Pricing and terms are shown before any purchase."; **Explore Lumi+** (flag on) / disabled **Coming soon** + "Payments aren't open yet" (flag off) | `PlusPages.tsx` `PlusPage`, `usePlus`, `@core/lib/plus` (price, limits — owner 2026-11-06), `server/plus.ts` (`LUMI_PLUS`, default off = nothing gated) | built — payments not open |
| S088 | Checkout | `/settings/plus/checkout` | "Selected plan" card (Lumi+ · US$2.99 / month · renews monthly); InfoRows Payment "Choose a secure payment method" / Your control "Cancel according to the shown terms" → See refund policy (`/terms` §7); InfoNote "Lumi+ starts only after your payment is confirmed."; **Continue Securely** → server says payments aren't open, nothing charged (never a fake success) | `PlusPages.tsx` `CheckoutPage`, `POST /api/plus/checkout` | built (screens) — payment provider not wired (Stripe web / Apple IAP in iOS, `docs/LUMI_PLUS.md`) |
| S092 | Report a concern | `/report/:type/:id` | chips Spam/Harassment/False information/Other; What happened?; InfoNote; **Submit Report** | `api.reports.create` | built |
| S093 | Block account | `/users/:id/block` | card "Block this account?"; outline "Keep Account Unblocked"; **Block Account** | `api.relationships.block/unblock` | built |
| S094 | Connection error & retry | any screen (`ErrorScreen`, app-wide error boundary) | globe icon; "Let's try that again"; [Retry]; InfoNote "Loading states keep the same screen structure…" | `ha/States.tsx` `ErrorScreen`, `LoadingCards` | built |
| S095 | Notifications · empty | `/notifications` (empty) | bell EmptyState "You're all caught up" | `NotificationsPage` | built |
| S096 | Saved · empty | `/profile/saved` (empty) | SegTabs; bookmark EmptyState "Keep something for later" [Explore] | S076 | built |

---

## What left the navigation (server code and data kept)

| Feature | Old entry points | Now |
|---|---|---|
| Rides / ride share | `/rides`, `/rides/new`, `/rides/:id`, `/r/:id` share links, "Rides" row on Meetups, "My rides" on Profile | no entry point; addresses → `/` |
| Seat alerts | `/seats`, Seat watch card on Profile | → `/schedule` |
| Campus map | `/map` | → `/explore/events` (S053 per-meetup location view is separate) |
| Plan-invite links | `/p/:id`, "Ask friends with a link" in the create sheet and Meetups, `/plans/new` (`CreatePlanPage`) | `/p/:id` → `/schedule/plans`; `/plans/new` → `/schedule/meeting/new` (time poll) |
| Academic calendar / key dates | `/academic-calendar`, `KeyDatesCard` on Profile | → `/schedule` |
| "Who's free" page and the `+` create sheet | `/social/more`, `/meet/more`, Home swipe deck | → `/social` (deleted 2026-11-06) |
| Design switch | `?design=`, Settings → Design row, `src/lib/design.ts` | removed — one dark theme |
| Demo tools pills / stage tools | floating pills (already gone), Settings "데모 도구" (mock mode only) | floating pills gone; the mock-only Settings block stays until WP5 rebuilds Settings (it never shows on the real server) |
| Old tab names | `/meet`, `/meet/meetups`, `/people`, `/feed`, `/discover`, `/ask`, `/community`, `/opportunities`, `/timetable`, `/plans`, `/orgs/mine`, `/gym` | redirect to `/social…`, `/explore…`, `/schedule…`, `/profile/communities`, `/recreation` (query kept) |

Kept although not a tab: **Recreation (RSF)** and **Dining** (owner), class links `/c/:school/:code` (+ `/qr`, slide QR),
`/preview` (unopened schools, address only), `/privacy`, `/terms`.

## Held screens (no route)

- **Ask AI / natural-language search** — S057, S067. Ask AI was removed 2026-10-19 (PRODUCT_TASTE); don't rebuild without the owner.
- **Network** — S060, S062 (people around your network, extended network), S063–S066 (network requests).
