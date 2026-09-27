# AroundU Product Requirements Document

> 원문: 제품 오너가 2026-09-27에 확정. 구현 상태는 `README.md`, 작업 규칙은 `CLAUDE.md` 참고.

## 1. Product Overview
**Product name:** AroundU
**Core concept:** Start with your university. Expand your circle. (학교에서 시작하지만, 학교에 갇히지 않는 네트워크.)

AroundU는 대학생용 커뮤니티 앱도, 데이팅 앱도, 취업 플랫폼도 아니다. 학교라는 신뢰 가능한 네트워크를 출발점으로 사용자가 사람을 발견하고, 실제로 만나고, 그룹/모임에 참여하고, 자유롭게 글을 공유하고, 학교와 주변에서 일어나는 정보와 기회를 발견하고, 졸업 후에도 자신의 네트워크를 계속 확장할 수 있게 하는 social discovery network다.

핵심 질문: Who is around me? · What can I join? · What is happening around me? · How can I expand beyond my current network?

## 2. Product Identity
Instagram(기존 관계·콘텐츠), Tinder(romantic intent), LinkedIn(professional identity), Meetup(group/event), Everytime(campus info/anonymous)과 달리 AroundU = **People + Meet + Feed + Campus Utility + Network Expansion**.
Core loop: Discover people → Do something together → Stay connected → Expand your circle.

## 3. User Lifecycle
Undergraduate → Master's → PhD → Alumni → Professional. 같은 계정을 계속 쓴다. **Graduation ≠ churn.** 졸업하면 `Yonsei Student` → `Yonsei Alumni`로 identity가 바뀌고 관심사·네트워크는 유지된다.

## 4. Core Navigation
Bottom navigation 5개: **Home**(Today dashboard) · **People**(발견/swipe/search/expansion) · **Meet**(Groups + Meetups + Events + Quick Meet) · **Feed**(자유 게시물/질문/사진/sponsored) · **Profile**. DM은 탭이 아니라 주요 화면 오른쪽 상단 Message icon.

## 5. Home
Home은 social feed가 아니라 Today dashboard다. "오늘 나한테 뭐가 있지?"
- Header: AroundU · 학교 ▼ · 우측 Search · Messages
- Today's Schedule (공강이 있으면 "You have 3 hours free / 4 people are also free / [Find someone]")
- Happening Today (Club Fair, Festival, Hackathon, Student Council Event, Basketball Game, Startup Seminar; 미국은 Fraternity Rush, Sorority Recruitment, Greek Life Event, Club Fair, Football Game, Campus Party)
- Meet Around You (2~3개, [See all] → Meet)
- People You May Want to Meet (2~4 카드: 사진·기본정보·Why you might connect·[View profile])
- Opportunities (Internship, RA, Hackathon, Scholarship, Competition, Startup Program, Exchange Program; 2~3개)
길고 무거운 infinite feed로 만들지 않는다.

## 6. People
"누구를 만나고 싶지?" 상단: **My Network | Beyond**.
My Network = 기본 학교 네트워크(필터 Students / Master's / PhD / Alumni), 무료, swipe 또는 card discovery.
Person Card: 큰 사진을 쓸 수 있으나 Tinder처럼 보이지 않게. 사진 아래 반드시 Context(이름·학교·기수·소속·도시) · Interests · Why You Might Connect. Buttons: Pass / Connect / Invite to Meet.

## 7. Beyond
주요 Premium conversion point. 기본 네트워크를 넘어 사람을 찾는 공간(다른 학교, 도시, 커뮤니티: "AI researchers in Seoul", "Founders in NYC"…).
Free: 다른 학교 사람도 일부 preview("3 people outside your network today"). 완전 차단 금지.
**AroundU+**: $5.99/month 또는 $49.99/year. 다른 학교 사람 무제한 discovery · 다른 학교 Alumni 탐색 · Cross-school people search · Advanced filters · 여러 학교 동시 검색 · 다른 도시 network · Extended discovery · 더 많은 introduction requests · saved search · discovery alerts.
Paywall copy: **Expand your circle** — Discover people across universities, cities and communities. [Try AroundU+]

## 8–12. Meet
Community와 Meetup을 분리하지 않는다. 상단: **For You | Groups | Events | Now**.
- Groups: 지속적인 집단(AI Builders Seoul, Yonsei Running Crew…). Group card: 이미지·이름·카테고리·멤버수·설명·[Join]. Group Detail 탭: Overview · Posts · People · Events.
- Events: 특정 시간의 activity. Event Detail: Title · Host · Date/time · Location · Description · Participants · Mutual connections · Capacity · Join / Request to Join · Invite friend.
- Now / Quick Meet: 즉석 만남(Coffee now, Lunch, Study, Walk, Running, Workout). compact 카드(제목·장소·거리·n joining·[Join]).
- Create Meet: prominent **+ Create**. 종류 Coffee / Lunch / Study / Sports / Dinner / Networking / Party / Other. 입력: title · description · date · time · location · max participants · public/approval · who can join · free/paid.

## 13–15. Feed
자유로운 social conversation. 상단: **For You | Campus | Following**. Create Post: "What's happening?" (Text · Photo · Question · Poll, tags, visibility Everyone / My university / My groups / Connections). Campus는 Everytime적 utility를 일부 가지되 완전 익명 중심은 아님(게시물별 익명 옵션).
Monetization: 일반 post 무료. **Post Boost** Community ₩10,000–30,000 · Cross-network ₩50,000–150,000. **Sponsored Post**(기업/기관, context relevant, banner 지양).

## 16–17. Information · Search
Explore 탭은 두지 않는다. 정보는 Home + Feed + Search. Global Search: People · Groups · Events · Posts · Opportunities.

## 18–20. Profile · Alumni
Profile은 resume가 아니다. Header(사진·이름·학교·단계·전공·도시) · Interests · Open To(Coffee, Activities, Research Collaboration, Networking) · Schedule(재학생/대학원생만 prominent, Profile → My Schedule) · My Groups · My Meets · Connections · My Posts.
Alumni Transition: 졸업 시 온보딩 재요구 없음. `Yonsei Student → Yonsei Alumni` + Current city · Company · Industry · Current role. 관심사·그룹 유지. Alumni Home은 시간표 대신 People nearby · Groups · Upcoming Meets · Relevant Posts · Professional/city opportunities.

## 21. Monetization Overview
A. AroundU+ $5.99/월 · $49.99/년 — 내 학교 밖 network 탐색.
B. Boost — Profile / Meet / Post / Group, 약 ₩5,000–50,000.
C. Promoted Opportunity — 기업/기관, 초기 ₩100,000–500,000 / campaign.
D. Sponsored Experience — Meetup · Workshop · Research night · Company visit · Office hours, 초기 ₩500,000–3,000,000.
(구체 가격표와 근거는 앱 `/pricing` 페이지와 `README.md` 수익 모델 절.)

## 22. What Should Remain Free
같은 학교 People discovery · 같은 학교 alumni discovery · basic swipe · basic DM · Feed 읽기/쓰기 · Group 생성/가입 · Meet 생성/참여 · Campus information · basic profile. 핵심 social graph를 paywall 뒤에 넣지 않는다.

## 23. Core Product Loops
1 Social: People → Connect → DM → Meet → Stay connected. 2 Activity: Meet → Join → Meet people → Connect → Join Group. 3 Content: Feed → post → profile/group → Connect or Meet. 4 Expansion: My Network → value → Beyond preview → AroundU+ → Expanded network.

## 24. UX Principles
Not a dating app(하트·romantic 언어·match 집착 금지 → Connect · Meet · Invite · Shared interests · Why you might connect). Not LinkedIn(직함·이력 대신 관심사·의도·Open To·shared context). Not just a campus app. 5초 안에 이해: People 누구를 만날까 · Meet 무엇을 같이 할까 · Feed 무슨 이야기 · Home 오늘 나에게 뭐가.

## 25. Visual Direction
Modern · Premium · Warm · Social · International · Trustworthy. 한국식 커뮤니티 게시판, 데이팅 핑크/레드, LinkedIn 블루 지양. (구현은 Stitch **Pastel Breeze** 디자인 시스템을 유지: `design/stitch/DESIGN.md`.)

## 26. Screens
Onboarding 8(Splash · Login/Sign up · School selection · School verification · Current stage · Interests · What are you looking for? · Schedule setup) · Home 3(Student · Graduate/PhD · Alumni) · People 6(My Network · Swipe · Profile · Beyond · Advanced Search · Paywall) · Meet 7 · Feed 7(For You · Campus · Following · Post Detail · Create · Sponsored · Boost) · Profile 6 · Messaging 3.

## 27. Key User Flows
A Home → free time → Find someone → People → Connect → DM → Coffee Meet. B People → Beyond → preview → AroundU+ paywall. C Meet → Join Group → Join Event → Group Chat → Connect. D Feed → post → profile → Connect → Invite to Meet. E Campus Home → Club/Event → Group → Join → Event.

## 28–29. Principle · Brand
Your university gives you your first trusted network. But users are never trapped inside it: My university → My interests → My city → My profession → My wider network.
Primary: **Start with your university. Expand your circle.** Secondary: Find opportunities. Meet people. Make friends.
