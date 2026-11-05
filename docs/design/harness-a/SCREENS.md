# Harness A — screen map (S001–S096)

Source: `Lumi_Harness_A_All_96_Screens.pdf` (35 pages, owner 2026-11-05: "이 PDF가 앱 구성을 잘했어. 깔끔하게.
불필요한 거 빼고. 이거 따라서 앱 만들어봐. 대신 앱 화면은 검정색으로"). We follow the PDF's **structure, screens,
layout and components**, rendered in our dark theme (`src/index.css`, see COMPONENTS.md). Reference renders of a few
PDF pages are in `ref/`.

**Owner addendum (2026-11-05): "RSF, 학식 정보는 꼭 넣어야 해!"** — gym crowd and dining are **kept**: S015
Recreation = the live RSF crowd meter, S016 Dining = Cal Dining menus, both reachable from Home ("Campus today").

Status legend

| status | meaning |
|---|---|
| `exists-restyle` | the screen exists with roughly this content; rebuild it with `src/components/ha` |
| `exists-restructure` | the data and most behaviour exist, but the screen must be reorganised (sections, tabs, flow) |
| `new-ui-only` | no screen yet, but the data/API already exists — UI work only |
| `needs-backend` | no data or API yet — needs server + `packages/core` work before (or alongside) the UI |
| `done (foundation)` | rebuilt in the foundation commit; packages may polish it |

Route column = the address assigned in `src/App.tsx` (comments there carry the S-numbers). Routes marked *(planned)*
are not wired yet — the package that builds the screen adds them.

Common PDF patterns used below (all in `src/components/ha`): **BrandHeader** ("Lumi" + icons), **TitleHeader**
(big title + icons), **BackHeader** ("‹ Title ···"), **PageTitle**, **SegTabs** (underline), **Chip/ChipRow**,
**SearchField**, **ListingCard**, **MeetupCard**, **PersonCard**, **RowCard**, **InfoRows**, **EmptyState**,
**EmptyCard**, **InfoNote** ((i) footnote), **BottomCTA**, **OnboardingHeader** ("‹ Lumi · n of 6   Skip").

---

## Onboarding (S001–S011) — WP1

| ID | Screen | Route | What it shows (PDF) | Backed by | Status |
|---|---|---|---|---|---|
| S001 | Welcome | `/welcome` | "English" (language) top-right; **Lumi** wordmark with dot; "Your college life, all in one place."; "Discover your campus. Make a plan. Find your people."; three tilted chips (Your week · Good company · Your communities); **Get Started**; "Sign In" link; Terms · Privacy | `WelcomePage.tsx` (demo login `?demo=`, e-mail sign-in sheet, `setLang`) | done (foundation) |
| S002 | Email login | `/login` → today `/welcome?signin=1` (sheet) | OnboardingHeader "6 of 6"; title; "A little more campus. A little more you."; School email (mail icon); Verification code (lock icon); BottomCTA **Sign In** | `api.schools.sendVerificationCode`, `api.auth.loginWithCode` (WelcomePage sheet) | exists-restructure (sheet → full screen) |
| S003 | Your goals | `/start/goals` *(planned; `/start` today)* | "1 of 6"; "What would you like to get out of Lumi?"; 5 selectable rows with tinted icon tiles (Find events & opportunities · Plan my classes · Explore clubs & groups · Meet new people · Campus life), check circle; InfoNote "You can change this later."; **Continue** | `StartPage.tsx` step `goals` (`GOAL_OPTS` → `goals/interests/purposes`) | exists-restyle |
| S004 | What Lumi can do · Classes & Schedule | `/start/what` | "2 of 6"; 2×2 pill selector (Classes & Schedule · Events & Opportunities · Clubs & Groups · Social); "Sample preview" card: example week grid Mon–Fri 9–5 | `StartPage` step `how` (3 static cards today); `WeekGrid` for the preview | exists-restructure (selector + one preview per pill; label "Sample preview") |
| S005 | What Lumi can do · Events & Opportunities | `/start/what?p=events` | same selector; two sample ListingCards (badge, title, "Example listing", View source, bookmark) | static sample content (must say "Sample preview", PRODUCT_TASTE: no fake data presented as real) | exists-restructure |
| S006 | What Lumi can do · Clubs & Groups | `/start/what?p=clubs` | same selector; three RowCards (Photography Club "Creative · Followed" …) | static sample | exists-restructure |
| S007 | What Lumi can do · Social | `/start/what?p=social` | mini Social: underline tabs, "Good plans. Your people.", Start a Meetup / Find People, chips, a MeetupCard, a post card | static sample | exists-restructure |
| S008 | Your university | `/start/university` | "3 of 6"; "Find your campus. Make it yours."; University SearchField; selected school card; "Student status" chips Undergraduate/Graduate/Alumni; "Year · optional" chips 1st/2nd/3rd/4th+; InfoNote "Master's / PhD and graduation year are editable later." | `StartPage` step `school` (`api.schools.search`, `ROLES`), `ComingSoonSchools` | exists-restyle (add Year chips → `affiliation.year`) |
| S009 | Make it yours | `/start/discover` | "4 of 6", **Skip**; "Choose the content you'd like to discover. This step is optional."; 2-col tinted tiles with check: Internships · Research · Hackathons · Scholarships · Campus events · Communities · Recreation · Dining | `StartPage` step `topics` (`TOPICS` → goals/interests) | exists-restyle (tiles instead of rows; add Recreation, Dining) |
| S010 | Your communities | `/start/communities` | "5 of 6", **Skip**; hero card "Connect through shared communities" ("Illustrative profiles · not a membership roster"); chips Student Clubs · Greek Life · Research Labs · Major/Department · Sports · Cultural Groups · Residence · Co-op · + Add your own; "Search organizations"; InfoNote "Membership is verified separately…"; **Next** | `StartPage` step `communities` (`COMMUNITIES` → goals/interests). Org search before sign-up has no API (orgs come with bootstrap after login) | exists-restructure; org search = `needs-backend` (public `orgs.search(schoolId, q)`) or defer to after sign-up |
| S011 | A little about you | `/start/about` | "6 of 6"; "Your timetable, housing and memberships start private."; Your name; Birth year ("Private to you"); School email; Verification code; **Get Started** | `StartPage` steps `name` + `email` (`api.auth.register`, school-email code, 16+ check) | exists-restructure (merge name/birth + e-mail into one step at the end) |

## Home (S012–S016) — WP2

| ID | Screen | Route | What it shows (PDF) | Backed by | Status |
|---|---|---|---|---|---|
| S012 | Home | `/` | BrandHeader (search · bell · messages); "Good morning! ☀" + "What's happening on campus"; 2×2 CategoryTiles Events (ice) · Opportunities (peach) · Clubs (mint) · Meetups (rose); **Campus today** (owner: RSF % · dining open/meal → S015/S016); "For you" + See all › (ListingCards); "Your week" RowCard; "My Communities" + Explore › RowCards; tab bar | `HomeDashboard.tsx`: `forYou()`, `campusLive.now()`, `me.timetable` (`statusNow`), orgs followed/member | done (foundation) |
| S013 | Home · first user | `/` (no recommendations) | same, For you = EmptyCard "Your campus starts here." [Explore Campus][Create Meetup] | same component, empty branch | done (foundation) |
| S014 | Home · content, no social users | `/` | For you card present, My Communities "Find your communities" | same | done (foundation) |
| S015 | Recreation | `/recreation` (old `/gym` redirects) | BackHeader "Recreation"; big title; "UC Berkeley · Recreation"; **real data**: crowd % / people–capacity / hourly chart / "tell me when under X%" alert (owner); "Check the official source" card [↗ RecWell]; InfoNote "No live occupancy is shown without a verified feed." **only when the feed is unavailable/stale** | `GymPage.tsx`, `campusLive.gym/setGymAlert`, `server/gym.ts`, `server/campus-live.ts` | exists-restructure (header + source card done in foundation; space cards → `ha` cards in WP2) |
| S016 | Dining | `/dining` | BackHeader "Dining"; "UC Berkeley · Dining"; **real data**: open/closed per hall, meal tabs, stations, diet filters, favorites (owner); official-source card; note only when menus unavailable | `DiningPage.tsx`, `campusLive.dining/favorite`, `server/dining.ts` | exists-restructure (header + source card done; body → `ha` in WP2) |

## Explore (S017–S026, S089–S091) — WP2

| ID | Screen | Route | What it shows (PDF) | Backed by | Status |
|---|---|---|---|---|---|
| S017 | Explore · Events | `/explore/events` (`/explore` → here) | TitleHeader "Explore" + icons; SegTabs Events · Opportunities · Clubs; SearchField "Search events"; chips Recommended · Newest · Ending soon; ListingCards (image, "Campus event" badge, title, date · place, View source ↗, bookmark) | `ExplorePage.tsx` (header + tabs done) → body is still `BrowseTab only={['event']}` + `OrgEvents`; data: `opportunities` type `event`, org events (`activities.kind=org_event`) | exists-restructure (body → ha ListingCards + 3 sort chips) |
| S018 | Explore · Opportunities | `/explore/opportunities` | same; badges Internship / Research / Hackathon …; meta "listing · source" | `BrowseTab` chips foryou/internship/research/scholarship/hackathon/startup/exchange; `forYou`, `badgeOf`, `toggleSave` | exists-restructure (keep the type filter as a 2nd chip row or sheet) |
| S019 | Explore · Clubs | `/explore/clubs` | "Search clubs"; sort chips; 2nd chip row Student Clubs · Greek Life · Research Labs · Co-op; RowCards (tinted icon, name, "Creative · Followed" / "Recreation · Public organization", ›); InfoNote "Followed is different from verified membership." | `BrowseTab only={['clubs']}` (CLUB_KINDS, follow) | exists-restructure |
| S020 | Campus event (detail) | `/opportunities/:id` (type event) | BackHeader (no title, ···); badges "Campus event" + "Source verified"; chip "📅 deadline · View source"; big title; "host · office"; SegTabs Details · Q&A n; description TextCard; InfoRows Who it's for / Benefits / Original source; outline "↗ Register at Source"; BottomCTA [bookmark] **Going** | `OpportunityDetailPage.tsx` (`setIntent('going')`, `toggleSave`, `qna`) | exists-restyle |
| S021 | Opportunity details | `/opportunities/:id` | same; badge type ("Exchange"); BottomCTA [bookmark] **I applied** | same (`setIntent('applied')`) | exists-restyle |
| S022 | Community · About | `/orgs/:id` (`?tab=about`) | BackHeader "Community — About"; HeroBanner (tinted, people icon); big org name; badge "Student club"; **Follow** pill; SegTabs About · Feed · Events · Members; About TextCard; InfoRows "Public page / Visit organization website", "Membership / Approval required / Following never grants private access"; outline **Request Membership** | `OrgPage.tsx` (`orgJoinState`, `api.orgs.apply`, `toggleFollow`, `publicLinks`) | exists-restructure (chips → SegTabs; recruit tab folds into About) |
| S023 | Community · Feed | `/orgs/:id?tab=feed` | post cards; InfoNote "Only posts you are allowed to view appear here." | `OrgPage` posts tab (`PostCard`, `canViewPost`) | exists-restyle |
| S024 | Community · Events | `/orgs/:id?tab=events` | ListingCard + MeetupCard | `OrgPage` events tab (org activities + listed events) | exists-restyle |
| S025 | Community · Members | `/orgs/:id?tab=members` | PersonCards with "View"; InfoNote "Member visibility follows each person's privacy settings." | `OrgPage` members tab (`memberIds`, `canViewField`) | exists-restyle |
| S026 | Create a group | `/orgs/new` *(planned)* | Group name · About · Group type (select) · Join policy (select); InfoNote; **Create Group** | **no `orgs.create` API** (orgs come from imports / admins) | needs-backend |
| S089 | Explore without an account | `/guest/explore` *(planned)* | BackHeader "Explore without an account"; Explore tabs/search/chips/cards read-only; BottomCTA **Join Lumi** | **no public listings endpoint** (`/api/bootstrap` needs a session; `/preview` reads files for schools not open yet) | needs-backend (read-only `GET /api/public/explore?school=`) |
| S090 | Opportunity Q&A | `/opportunities/:id?tab=qna` | SegTabs Details · Q&A; TextCard "Questions & answers"; "Your question" TextArea; InfoNote; BottomCTA **Post Question** | `api.opportunities.ask/review`, `o.qna`, `o.reviews` | exists-restyle |
| S091 | Membership requests | `/orgs/:id/requests` *(planned)* | InfoNote "Only authorized group admins can approve membership."; PersonCards Approve / Review; outline "Decline Selected Request" | `org.applicantIds` exists; **no approve/decline API** | needs-backend (`orgs.respondApplication(orgId, userId, accept)`) |

## Schedule + Planning (S027–S036) — WP3

| ID | Screen | Route | What it shows (PDF) | Backed by | Status |
|---|---|---|---|---|---|
| S027 | Schedule | `/schedule` | TitleHeader "Schedule" + calendar (edit) icon; "‹ Your week ›"; WeekGrid Mon–Fri with tinted class blocks; RowCard "A free afternoon / Find a plan between classes"; outline "+ Add Class" + link "My Plans" | `ScheduleTab.tsx` (new), `WeekGrid`, `freeBlocks` | done (foundation) |
| S028 | Schedule · empty | `/schedule` (no classes) | empty grid + EmptyState "Make the week yours" [Add Classes] | same | done (foundation) |
| S029 | Add / edit a class | `/schedule/classes` (old `/timetable`); single class edit *(planned)* `/schedule/classes/:id` | Course name; day chips Mon–Fri; Start/End time (clock icon); Classroom "Optional · private"; Instructor Optional; **Save Class** | `TimetablePage.tsx` (catalog search, sections, manual entry), `api.users.update({timetable})` | exists-restructure (catalog search stays; manual form = PDF form) |
| S030 | Class space | `/classes/:courseName` | BackHeader; hero card "Your class space / Calculus"; SegTabs Class · Questions · Study; InfoRows class time / classroom (private); "Study together" + Create › MeetupCard; InfoNote "Classmates appear only when they opt in…" | `ClassPage.tsx`, `StudyGroupPage.tsx`, `classRosters`, `api.classes.respond/setPartner` | exists-restructure; **Questions tab = needs-backend** (no class Q&A store) |
| S031 | My Plans | `/schedule/plans` (old `/plans`) | SegTabs Upcoming · Past · Created; "Your confirmed plans" MeetupCards; "Going events" ListingCards; InfoNote "Interested and waitlisted items are not confirmed plans." | `PlansPage.tsx` (`planFeed`), participations, opportunity intents `going` | exists-restructure |
| S032 | Create a meeting | `/schedule/meeting/new` (also `/together/new`) | Title; Group (select); Date range ("Choose a week"); Duration chips 30 min / 1 h / 1.5 h / 2 h; "Location ideas" chips with ×; "+ Add Ideas"; **Set Up Poll** | `CreateTogetherPage.tsx`, `api.together.create` (TimePoll) | exists-restructure (PDF: duration + week; today: explicit candidate times) |
| S033 | Location Ideas | `/schedule/meeting/new/places` *(planned)* | "Where would you like to meet?"; place field; "Quick ideas" 2×2 tiles Café / Library / Study room / Online; "Your suggestions" rows with ×; "+ Add Another Place"; **Save Ideas** | place options exist only on link plans (`PlanInput.placeOptions`, `plans.ts`); TimePoll has one `place` | needs-backend (place options on TimePoll) |
| S034 | Find a Time | `/together/:id/find` *(planned)* | group RowCard "Suggested place: Café"; week heatmap (some / best overlap); "Best match" mint card; **Confirm Plan** | `TogetherPage.tsx` votes → overlap; `api.together.decide` | exists-restructure — ⚠ PRODUCT_TASTE lists "auto-pick the time everyone is free" as unwanted; here the host confirms from the votes people gave, which is the existing poll flow |
| S035 | Plan Confirmed | `/together/:id` (decided) | big check; "Plan Confirmed"; InfoRows When / Where; "Your group" avatars; outline "Send Group Message"; **Add to My Schedule** | `together.decide` → activity + chat room | exists-restructure |
| S036 | Time poll | `/together/:id` | title + big poll name; group RowCard "1 hour · Example week"; SegTabs Availability · Places; "Which times work for you?" selectable grid; InfoNote; **Submit My Availability** | `TogetherPage.tsx`, `api.together.vote/addOption` | exists-restructure (Places tab needs S033 backend) |

## Social · Meetups · Feed · People (S037–S067) — WP4

| ID | Screen | Route | What it shows (PDF) | Backed by | Status |
|---|---|---|---|---|---|
| S037 | Social · For You | `/social` (old `/meet`) | BrandHeader (bell · messages) + big "Social"; SegTabs For You · Meetups · People · Feed; "Good plans. Your people." [Start a Meetup][Find People]; chips Coffee/Study/Workout/Lunch; MeetupCards; post card | `SocialPage.tsx` `SocialForYouPage` (`visibleActivities`, `visiblePosts`, `MEET_KINDS`) | done (foundation) |
| S038 | Social · Meetups | `/social/meetups` | "Better together" + "+ Create" pill; chips All · My Groups · My Classes · Nearby; MeetupCards; "Your groups" RowCards | `MeetPage.tsx` (kind tiles + list today) | exists-restructure (Nearby = place distance — use place only, no live location) |
| S039 | Social · People | `/social/people` (old `/people`) | "Search people"; chips All · 1st · 2nd · 3rd · 4th+ · Graduate · Alumni; links "More Filters" / "Ask Network"; PersonCards with **Add Friend**; "✦ Ask AI" pill | `SocialPeoplePage` (hub rows today) + `HomePage.tsx` people browse (`/social/people/explore`), `sendFriendRequest` | exists-restructure (Ask AI: see S067) |
| S040 | Social · Feed | `/social/feed` | chips All · My School · My Groups; composer "What's on your mind? +"; post cards (image optional) | `SocialFeedPage` → `FeedTab` (`CommunityPage.tsx`), `posts.*` | exists-restructure |
| S041 | For You empty | `/social` | EmptyState coffee "Start something small" [Start a Meetup] + chips | `SocialForYouPage` empty branch | done (foundation) |
| S042 | Meetups empty | `/social/meetups` | EmptyState "Make the first plan" [Create Meetup] | `MeetPage` | exists-restyle |
| S043 | People empty | `/social/people` | EmptyState "Good company starts somewhere" [Invite Friends] + My Classes / My Communities | `SocialPeoplePage`, invite = `shareOrCopy` | exists-restyle |
| S044 | Feed empty | `/social/feed` | EmptyState "Be the first to share" [Share Something] + "Ask a Question" | `SocialFeedPage` empty branch | exists-restyle |
| S045 | Create a Meetup | `/meetups/new` → `/create/activity?meetup=1` | Title; Date; Starts/Ends; Location; visibility chips Campus-wide / My verified groups / Class / Invite only; Capacity; status chips All statuses / Undergraduate / Graduate / Alumni; InfoNote; **Create Meetup** | `CreateActivityPage.tsx` (meetup mode: photo, 4 kinds, 3 visibilities), `QuickMeetup.tsx`, `api.activities.create` | exists-restructure; **"Class" visibility + academic-status audience = needs-backend** (`Visibility` has no class scope; activities have no role filter) |
| S046 | Meetup details | `/activities/:id` | BackHeader; "Meetup details"; HeroBanner tinted by kind; big title; "Hosted by …"; InfoRows When / Where / Who can join; description; chips Details · Group chat · Time poll; InfoNote "Approval required → Request to Join. Full → Join Waitlist."; **Join Meetup** | `ActivityDetailPage.tsx`, `JoinButton`, chat room per activity | exists-restructure; **waitlist = needs-backend** (`ParticipationStatus` has no `waitlisted`) |
| S047 | Edit meetup | `/activities/:id/edit` | same form as S045; **Save Changes** | `CreateActivityPage` edit mode, `activities.update` | exists-restyle |
| S048 | Manage participants | `/activities/:id/manage` | SegTabs Joined · Requests · Waitlist; PersonCards Joined / Approve / Review; InfoNote | `ManageActivityPage.tsx` (`approve/reject`) | exists-restructure (Waitlist tab needs S046 backend) |
| S049 | Small Tables | `/social/small-tables` *(planned)* | "Small plans, good company."; chips All/Coffee/Study/Lunch; MeetupCards; RowCard "+ Create a small table" | activities filtered by category + small capacity | new-ui-only |
| S050 | Create an activity | `/activities/new` → `/create/activity` | same form; **Publish Activity** | `CreateActivityPage` | exists-restyle |
| S051 | Share something | `/create/post` (`/posts/new`) | author row; type chips Post/Question/Photo; textarea; Add photo tile; Visibility select; Post to select; InfoNote; **Share Post** | `CreatePostPage.tsx`, `posts.create`, `system.uploadPhoto` | exists-restyle |
| S052 | Post & replies | `/posts/:id` *(planned)* | post card; "Replies"; reply composer pill | `post.comments`, `api.posts.comment` (comments open inline today) | new-ui-only |
| S053 | Meetup location | `/activities/:id/location` *(planned)* | stylised map with general area pin; RowCard "General area · venue agreed by the group"; InfoNote "People's precise locations are never displayed." | `activity.place` (lat/lng when set). The campus **Map tab stays dropped**; this is a per-meetup view only | new-ui-only |
| S054 | Public profile | `/users/:id` | BackHeader; avatar + big name + school + "Design · Second-year"; bio; [Add Friend][Message]; "n Groups n Friends"; Get to know me card; My Communities; My Events & Meetups chips; "Visible, confirmed plans only." | `PersonPage.tsx` (`canViewField`, friend requests, `chats.openDirect`) | exists-restructure |
| S055 | Suggest a meetup | `/users/:id/suggest` *(planned)* | To (person); kind chips; Your message; When; InfoNote; **Send Suggestion** | `api.proposals.create(fromId, toId, {category, message, when})` + `respond` | new-ui-only |
| S056 | Search Lumi | `/search` | SearchField "Search events, people, clubs…"; SegTabs All · People · Events · Clubs; "Recent searches" RowCards; "Explore more" 2×2 CategoryTiles | `SearchPage.tsx` (activities/people/orgs) | exists-restructure (recent searches = localStorage, per-viewer convenience) |
| S057 | Find people naturally | `/social/people/find` *(planned)* | "Tell us the kind of company you're looking for."; textarea; starter chips; InfoNote; **Find People** | `server/ai-search.ts` / `api.ai.ask` exist but Ask AI was **removed by the owner 2026-10-19** (PRODUCT_TASTE) | needs owner decision; else a non-AI keyword match over `matchReasons` = new-ui-only |
| S058 | People results | `/social/people/explore` (temp) → `/social/people/results` | SearchField; chips All statuses / Same campus / Shared interests; PersonCards Add Friend; InfoNote "Suggestions reflect registered people, not school rosters." | `HomePage.tsx` people browse, `matchReasons` | exists-restructure |
| S059 | People filters | `/social/people/filters` *(planned)* | Year & status chips; Spoken language; Interests; Communities; University; **Show Results** | year/status/interests/orgs exist; **spoken language not stored** | needs-backend (language + country opt-in fields) |
| S060 | People around your network | `/social/people/network` *(planned)* | as S058 | friends-of-friends — must not expose private relationships | needs-backend (server-side, privacy-aware 2nd degree) |
| S061 | Something in common | `/social/people/common` *(planned)* | as S058 | shared classes/orgs/interests (`matchReasons`) | new-ui-only |
| S062 | Your extended network | `/social/people/extended` *(planned)* | chips Second degree / Shared communities; path card (3 avatars); PersonCard View; RowCard "Ask for an introduction"; InfoNote | no intro/2nd-degree API | needs-backend |
| S063 | Ask your network | `/network/ask` *(planned)* | What are you looking for?; Interests; Reach select; InfoNote; **Share Request** | none | needs-backend (network requests model) |
| S064 | Network requests | `/network` *(planned)* | SegTabs For you · My requests · Responses; RowCards | none | needs-backend |
| S065 | Network request | `/network/:id` *(planned)* | author row; big question; detail card; chips; RowCard "Shared reach"; outline "Suggest Someone"; **I Can Help** | none | needs-backend |
| S066 | Respond to a request | `/network/:id/respond` *(planned)* | chips I've tried this / I know someone; short response; "Details to share" toggle rows; **Send Response** | none | needs-backend |
| S067 | Ask AI | `/ask-ai` *(planned)* | sparkle tile; "A little help finding your people."; chat bubbles; PersonCard; input pill; InfoNote | `api.ai.ask` exists; **owner removed Ask AI 2026-10-19 — confirm before building** | needs owner decision (old `/ask` redirects to `/social`) |

## Messages · Profile · Settings · System (S068–S088, S092–S096) — WP5

| ID | Screen | Route | What it shows (PDF) | Backed by | Status |
|---|---|---|---|---|---|
| S068 | Messages | `/chats` | BackHeader; SearchField "Search messages"; SegTabs All · Direct · Groups; rows avatar · name · last message · time | `ChatInboxPage.tsx`, `chatRooms` (`direct` / `activity` / `org`) | exists-restyle |
| S069 | Conversation | `/chats/:roomId` | BackHeader (name); bubbles (others surface left, me tinted right); "Make it a plan" card [📅 Create a Time Poll]; composer pill (+, Message…, send) | `ChatRoomPage.tsx`, `chats.send/markRead`; poll → `/schedule/meeting/new` | exists-restyle |
| S070 | Notifications | `/notifications` | BackHeader; SegTabs All · Unread; RowCards with tinted icons (friend request, plan confirmed, reply, opportunity reminder) | `NotificationsPage.tsx`, `notifications.markRead/markAllRead` | exists-restyle |
| S071 | Your profile | `/profile` | BrandHeader (settings · messages); avatar + name + school + dept · role; bio; [Edit Profile][Share Profile]; n Groups n Friends; Get to know me; My Communities; My Events & Meetups (Upcoming/Past/Created); footer Saved · My Posts · Settings | `ProfilePage.tsx` (rebuilt) | done (foundation) |
| S072 | Edit Profile | `/profile/edit` | Name · Bio · University · Student status · Academic year · Spoken languages · Country of origin; **Save Profile** | `EditProfilePage.tsx`, `users.update` | exists-restyle; languages/country = needs-backend fields |
| S073 | Get to know me | `/profile/prompts` | "Optional. A few short answers…"; 3 textareas (I'm always down for… / My ideal weekend… / I'm looking for people to…); **Save Answers** | `EditPromptsPage.tsx`, `me.prompts` + `questionById` | exists-restyle (map the 3 PDF prompts to question ids) |
| S074 | My Communities | `/profile/communities` (old `/orgs/mine`; temp = `MyOrgsPage`) | SegTabs Followed · Member; RowCards; InfoNote; outline "Explore Communities" | orgs `followerIds` / `memberIds` / `adminIds` | exists-restructure |
| S075 | Friends & followers | `/profile/friends` · `/profile/followers` · `/profile/following` | SegTabs Friends · Followers · Following; SearchField; PersonCards with Message; InfoNote "Friends are mutually confirmed…" | `ProfileListPage.tsx` (`friendsOf/followersOf/followingOf`) | exists-restructure (3 routes → one tabbed screen) |
| S076 | Saved | `/profile/saved` (temp → `/explore/opportunities?sub=saved`) | SegTabs Opportunities · Events · Clubs; ListingCards; club RowCards | `opportunityIntents.saved`, followed orgs | new-ui-only |
| S077 | Saved people | `/profile/saved-people` *(planned)* | SearchField; chips; PersonCards | `relationships.likes` (private "관심 목록", `/profile/likes` today) | exists-restructure |
| S078 | Recommendation preferences | `/profile/preferences` *(planned)* | "Your goals" chips; "What you'd like to discover" chips; Interests; InfoNote; **Save Preferences** | `me.goals`, `me.interests`, `users.update` | new-ui-only |
| S079 | What you're looking for | `/profile/looking-for` *(planned)* | "People you'd like to meet" chips; "Things you'd like to do" chips; context textarea; **Save Preferences** | `me.lookingFor`, `me.purposes`, `me.likes` | new-ui-only |
| S080 | Open to | `/profile/open-to` *(planned)* | chips Coffee/Study/Advice/A walk/Lunch; When; Visible to; InfoNote "temporary, optional status…"; **Save** | `users.setAvailability`, `openSlot` activities (`OpenSlotSheet`) | exists-restructure |
| S081 | Your student status | `/profile/status` *(planned)* | option RowCards Undergraduate / Graduate / Alumni; InfoNote; **Update Status** | `affiliation.role` via `users.update` | new-ui-only |
| S082 | Your next chapter | `/profile/next-chapter` *(planned)* | Graduation year · City · Company · Role · Industry; **Save** | only `affiliation.year`; no city/company/role/industry | needs-backend (alumni fields) |
| S083 | Discovery & privacy | `/settings/discovery` *(planned)* | toggle card "Classmate discovery / Off by default"; Membership display chips; Spoken languages; Country of origin; Academic year; **Save Privacy** | partial: `settings` visibility; classmate roster opt-in lives in classes; membership display / languages / country not stored | needs-backend (settings fields) |
| S084 | Settings | `/settings` | sections "Your account" (Edit Profile · Discovery & privacy · Visibility settings · Privacy & safety) and "App" (Notifications · Language · Lumi+) as RowCards; "⇥ Sign Out" link | `SettingsPage.tsx` (design switch removed in foundation), `logout`, `setLang`, push row, feedback, delete account | exists-restructure |
| S085 | Visibility settings | `/settings/privacy` | "Who can see your profile?" chips Friends / My school / Everyone; toggle rows University · Prompt answers · Group memberships · Housing · Class timetable; **Save Privacy** | `PrivacySettingsPage.tsx`, `VisibilityPicker`, `user.privacy` | exists-restructure |
| S086 | Privacy & safety | `/settings/safety` | RowCards Blocked accounts · Report a concern · Messaging permissions · Account security · Download your data · Delete account | `SafetySettingsPage.tsx`, `DeleteAccountCard`, block list | exists-restructure; **Download your data = needs-backend** |
| S087 | Lumi+ | `/settings/plus` *(planned)* | sparkle tile; "Lumi+"; 3 RowCards; InfoNote "Pricing and terms are shown before any purchase."; **Explore Lumi+** | none | needs-backend (product/pricing decision; App Store IAP) |
| S088 | Checkout | `/settings/plus/checkout` *(planned)* | "Selected plan" card; InfoRows Payment / Your control; InfoNote "Never imply a purchase has completed without payment confirmation."; **Continue Securely** | none | needs-backend (payments) |
| S092 | Report a concern | sheet from ··· (`ReportSheet.tsx`) → `/report/:type/:id` *(planned)* | chips Spam/Harassment/False information/Other; What happened?; InfoNote; **Submit Report** | `api.reports.create` | exists-restyle |
| S093 | Block account | `/users/:id/block` *(planned)* | card "Block this account?"; outline "Keep Account Unblocked"; **Block Account** | `api.relationships.block/unblock` | exists-restyle |
| S094 | Connection error & retry | any screen (`ErrorScreen`) | globe icon; "Let's try that again"; [Retry]; InfoNote "Loading states keep the same screen structure…" | `ha/States.tsx` `ErrorScreen`, `LoadingCards` | done (foundation component) |
| S095 | Notifications · empty | `/notifications` | bell EmptyState "You're all caught up" | `NotificationsPage` | exists-restyle |
| S096 | Saved · empty | `/profile/saved` | SegTabs; bookmark EmptyState "Keep something for later" [Explore] | S076 | new-ui-only |

---

## What left the navigation (server code and data kept)

| Feature | Old entry points | Now |
|---|---|---|
| Rides / ride share | `/rides`, `/rides/new`, `/rides/:id`, `/r/:id` share links, "Rides" row on Meetups, "My rides" on Profile | no entry point; addresses → `/` |
| Seat alerts | `/seats`, Seat watch card on Profile | → `/schedule` |
| Campus map | `/map` | → `/explore/events` (S053 per-meetup location view is separate) |
| Plan-invite links | `/p/:id`, "Ask friends with a link" in the create sheet and Meetups, `/plans/new` (`CreatePlanPage`) | `/p/:id` → `/schedule/plans`; `/plans/new` → `/schedule/meeting/new` (time poll) |
| Academic calendar / key dates | `/academic-calendar`, `KeyDatesCard` on Profile | → `/schedule` |
| Design switch | `?design=`, Settings → Design row, `src/lib/design.ts` | removed — one dark theme |
| Demo tools pills / stage tools | floating pills (already gone), Settings "데모 도구" (mock mode only) | floating pills gone; the mock-only Settings block stays until WP5 rebuilds Settings (it never shows on the real server) |
| Old tab names | `/meet`, `/meet/meetups`, `/people`, `/feed`, `/discover`, `/ask`, `/community`, `/opportunities`, `/timetable`, `/plans`, `/orgs/mine`, `/gym` | redirect to `/social…`, `/explore…`, `/schedule…`, `/profile/communities`, `/recreation` (query kept) |

Kept although not a tab: **Recreation (RSF)** and **Dining** (owner), class links `/c/:school/:code` (+ `/qr`, slide QR),
`/preview` (unopened schools, address only), `/privacy`, `/terms`.

## needs-backend summary

1. **Network requests** — S063–S066 (ask/answer model, reach, per-field share consent, notifications).
2. **Extended network / people around your network** — S060, S062 (server-side 2nd degree that never exposes private ties; intro requests).
3. **Lumi+ and checkout** — S087, S088 (product + payment; App Store rules).
4. **Groups created by students** — S026 (`orgs.create`) and **membership approval** — S091 (`orgs.respondApplication`).
5. **Meetup audience & waitlist** — S045/S046/S048 (class-scoped visibility, academic-status audience, `waitlisted` participation).
6. **Profile fields** — spoken languages, country of origin (S059, S072, S083), alumni "next chapter" (S082), membership display (S083), download your data (S086).
7. **Poll places** — S033/S036 Places tab (place options on TimePoll).
8. **Class Questions tab** — S030.
9. **Public explore** — S089 (read-only listings without a session).
10. **Owner decisions first** — S057 / S067 (Ask AI was removed 2026-10-19), S034 (auto overlap vs. "don't auto-pick times").
