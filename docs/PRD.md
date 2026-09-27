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

## 6. People (v2)
"누구를 만나고 싶지?" 상단: **추천 | 찾기 | 연결** — 학교 기준으로 나누지 않는다. 다른 학교 사람·동문을 보는 것은 **무료**.
- 추천: 현재 맥락(학교·전공·지역·분야·관심사·그룹·모임·연결 + 찾는 것)으로 순위. 카드에는 **왜 추천되었는지**(같은 학교 · 같은 전공 · 같은 지역…)를 사진보다 먼저 보여준다. Buttons: Pass / 연결 / 만남에 초대.
- 찾기: 학교 · 전공 · 졸업연도 · 거주 지역 · 활동 지역 · 회사 · 업종 · 직무 · 관심사 · 상태. 학교는 여러 조건 중 하나("뉴욕 + 금융", "연세대 + 서울 + AI", "Product + 도쿄").
- 연결: 요청함 · 연결된 사람 · 팔로잉.

## 7. AroundU+ (v2 — 유료는 "더 빠르고 정확하게 찾기")
사람을 만나는 데 돈을 받지 않는다. 무료: 추천 사람 보기 · 타학교 사람 보기 · 동문 보기 · 기본 검색(키워드 + 필터 1개) · 기본 연결 요청(30/일) · 모임·그룹 참가 · 피드 · 메시지.
**AroundU+** ($5.99/월 · $49.99/년, KR ₩7,900 · ₩64,900): 복수 조건 검색 · 상세 조건(직무·업종·회사·졸업연도·거주지·활동지역) · 검색 저장("뉴욕 금융권 연세대 동문") · 새 사람 알림 · 연결 요청 확대(무제한) · 고급 추천. 학생과 졸업생에게 같은 기준 — 졸업했다고 유료가 되지 않는다.
Paywall copy: **더 정확한 사람을 더 빠르게** — 사람을 만나는 데는 돈을 받지 않아요. [구독 시작하기]

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

## 22. What Should Remain Free (v2)
추천 사람 보기 · **타학교 사람 보기** · 동문 보기 · 기본 검색 · 기본 연결 요청(30/일) · 모임 참가 · 그룹 참가·생성 · Feed 읽기/쓰기 · Campus information · basic profile · 메시지. 핵심 social graph를 paywall 뒤에 넣지 않는다. 유료는 §7 의 "찾기" 기능만.

## 23. Core Product Loops
1 Social: People → Connect → DM → Meet → Stay connected. 2 Activity: Meet → Join → Meet people → Connect → Join Group. 3 Content: Feed → post → profile/group → Connect or Meet. 4 Expansion: My Network → value → Beyond preview → AroundU+ → Expanded network.

## 24. UX Principles
Not a dating app(하트·romantic 언어·match 집착 금지 → Connect · Meet · Invite · Shared interests · Why you might connect). Not LinkedIn(직함·이력 대신 관심사·의도·Open To·shared context). Not just a campus app. 5초 안에 이해: People 누구를 만날까 · Meet 무엇을 같이 할까 · Feed 무슨 이야기 · Home 오늘 나에게 뭐가.

## 25. Visual Direction
Modern · Premium · Warm · Social · International · Trustworthy. 한국식 커뮤니티 게시판, 데이팅 핑크/레드, LinkedIn 블루 지양. (구현은 Stitch **Pastel Breeze** 디자인 시스템을 유지: `design/stitch/DESIGN.md`.)

## 26. Screens (v2 — 36화면, 상세는 `docs/UX-SPEC.md` 14절)
가입 9(시작 · 학교 선택 · 학교 인증 · 현재 상태 · 기본 프로필 · 관심사 · 지역 · 무엇을 찾고 있나요 · 시간표(학생)/현재 직업(졸업생)) · 학생 10(홈 · 사람 추천 · 사람 검색 · 사람 상세 · 모임 · 그룹 · 피드 · 학교 피드 · 프로필 · 시간표) · 졸업생 9(홈 · 추천 · 지역 탐색 · 직업/업종 탐색 · 동문 탐색 · 상세 검색 · 모임 · 피드 · 프로필) · 전환 2(졸업 상태 업데이트 · 학생 → Alumni) · 유료 6(고급 검색 · 복수 조건 · 검색 저장 · 새 사람 알림 · AroundU+ 설명 · 결제).

## 27. Key User Flows
A Home → free time → Find someone → People → Connect → DM → Coffee Meet. B People → Beyond → preview → AroundU+ paywall. C Meet → Join Group → Join Event → Group Chat → Connect. D Feed → post → profile → Connect → Invite to Meet. E Campus Home → Club/Event → Group → Join → Event.

## 27-1. v2 보완 (2026-09-27, `docs/UX-SPEC.md`)
제품 오너의 "제품 정체성 및 UX 재설계" 스펙을 반영했다.
- **정체성**: 검증된 대학 관계망에서 시작 → 지금 나와 관련 있는 사람 발견 → 졸업 후에도 관계망 확장. 학교는 입장 자격이자 첫 번째 신뢰·맥락일 뿐, 평생 가두는 범위가 아니다.
- **가입·인증**: 재학생(학교 이메일 · SSO · 학생증) / 졸업생(졸업생 이메일 · 졸업증명 · 동문회 연동 · 이전 인증 이력) 중 하나 이상. 최초 가입 정보는 학교 인증 · 상태 · 지역 · 전공/하는 일 · 관심사 · 무엇을 찾나(어떤 사람 · 어떤 활동)까지만.
- **상태**: 학부 / 석사 / 박사 / 졸업. 같은 앱, 추천 우선순위와 홈 구성만 다르다(학생: 학교·전공·시간표·공강·관심사 / 졸업생: 거주 지역·하는 일·업종·직무·학교·관심사).
- **지역**: 거주 지역과 활동 지역을 분리(도시 단위, 주소 없음). GPS 는 별도.
- **탭**: 홈 · 사람(추천 | 찾기 | 연결) · 모임(추천 | 그룹 | 일정) · 피드(추천 | 내 학교 | 팔로잉) · 프로필. 그룹은 자유 성격(학교·지역·관심사·직업), 모임은 시간·장소·참여자·인원·공개 범위만.
- **전환**: "현재 상태가 바뀌었나요?" → 졸업 → 거주 도시·하는 일만 입력. 연결·글·그룹·인증·활동 기록 유지.
- **과금**: 타학교 보기 무료. 유료는 복수 조건·상세 조건 검색 · 검색 저장 · 새 사람 알림 · 연결 요청 확대 · 고급 추천.
- **맥락**: KO(한국 대학·도시·업종) / EN(미국 대학·도시·업종) 두 프리셋을 같은 구조에 얹는다.
- **네트워크에 물어보기** (v2.1): 사람 찾기에서 🔎 AroundU가 찾아보기 + 📣 네트워크에 물어보기. 요청은 1촌 → 2촌 → 3촌 → 관련 학교·업종·관심사로 전달되고, 받은 사람은 저예요 / 제가 아는 사람이 있어요 / 관심 없어요. 지인 추천 후보는 본인이 '관심 있어요' 하기 전까지 요청자에게 공개되지 않는다. 수락하면 연결 + Mutual Room. 졸업생 인증에 동문 보증(vouch) 추가.

## 27-2. 네트워크 기능 16화면 (v2.2, 상세 `docs/UX-SPEC.md` 6.7)
People 메인(추천 허브) · 의외의 연결 · 2촌 탐색(연결해줄 수 있나요?) · Person Detail + Overlap · 자연어 사람 찾기 · 사람 찾아보기 작성 · 받은 요청 · "저요" 응답(공개할 정보 선택) · Who's Around This Week(방문 예정, 도시 단위) · Open To 설정(여러 항목·기간·공개 대상) · Small Table 추천·상세 · 저장 목록(사용자 목록·알림) · Mutual Room(연결된 이유·겹치는 것·커피 일정) · Privacy(전체 AroundU / 같은 학교+2촌 / 연결된 사람만) · AroundU+ 고급 탐색(2·3촌 필터, 자동 알림, 요청 한도). 흐름: 사람 → 관계의 이유 → 연결 경로 → 실제 연결. 전화번호·개인 이메일·정확한/실시간 위치는 항상 비공개. AroundU+ 는 사람을 볼 권한이 아니라 탐색 도구다.

## 28–29. Principle · Brand
Your university gives you your first trusted network. But users are never trapped inside it: My university → My interests → My city → My profession → My wider network.
Primary: **Start with your university. Expand your circle.** Secondary: Find opportunities. Meet people. Make friends.
