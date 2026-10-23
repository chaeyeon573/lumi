# PM agent 실행 기록

최신이 위.

## 2026-10-23 15:18 UTC (버클리 금 08:18) · 초점: 처음 온 사람 — /welcome → /start
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- ⚠️ 발견·고침: 내 화면 찍기 스크립트 중 18개(fresh.mjs·st.mjs 등, 작업 폴더)와 저장소의 docs/pm-agent/shoot.mjs 에 /api/rpc/ 막기가 빠져 있었다 — 10/20 사고 뒤 “전부 막음” 이라고 적었지만 일부만 막았던 것. 이번 실행에서 막기 없는 스크립트로 쓰기 화면을 누른 적은 없다(오늘은 /welcome·/start 만, 누르기 없음). 전부 막기를 넣고 shoot.mjs 로 채팅방을 열어 읽음 표시 요청 2건이 “BLOCKED WRITE” 로 막히는 것 확인.
- 찍어 봄: /welcome, /start (처음 온 사람, v2·classic). 첫 화면 “Who's free on campus right now?”·점심 카드·무료 음식·마감 순 정상.
- 물어봄: 1단계 학교 고르기에 UC Merced 가 나온다 — 출시 동안 숨길지 (QUESTIONS.md).

## 2026-10-23 12:23 UTC (버클리 금 05:23) · 초점: 식당 — 내일 탭·식단 필터
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /dining (v2·classic). 새벽이라 Café 3 “Opens 7 AM”, 아침 메뉴. Vegan 필터 — 비건 표시 메뉴만 남음. No nuts — 아몬드 등 견과 들어간 메뉴 빠짐. 알레르기 문구 “Diet and allergen tags come from Cal Dining” 정상.
- 확인만: “Tomorrow” 탭은 Cal Dining 이 내일 메뉴를 올렸을 때만 나온다(DiningPage `data.dates`) — 지금은 없어서 안 보임, 의도대로.
- 고친 것 없음.

## 2026-10-23 09:17 UTC (버클리 금 02:17) · 초점: 채팅방 안 (예시 사람·동아리 단톡)
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음(메시지 안 보냄, 읽음 표시 요청도 막힘).
- 찍어 봄: /chats/cr_junho, /chats/cr_band, /chats/cr_a7txlmqtfn (v2·classic). “Bringing Hannah” 는 배포 대기 수정(245882c)으로 사라질 것. 빈 1:1 방 안내(“Say hello. Block and report…”) 정상.
- 고침: 동아리 단톡 공지 “[Notice] Fall show rehearsal Thursday 7pm” 이 목 21:17 에 와 있다 — 예시 시각은 계속 옮겨지는데 요일이 박혀 있어 이미 지난 리허설을 알리는 꼴. 공연 날짜(토)도 옮겨지므로 “the night before the show, 7pm” 으로, 동아리 공지 본문도 같게 (seed.en.ts, seed.ts — 채팅 문구는 다음 옮길 때 시드 문구로 바뀜). 시드의 다른 요일·tonight 문구도 훑음 — 라이브에 들어간 것은 시각이 함께 움직여 맞다.
- 확인: tsc, 테스트 224 통과.

## 2026-10-23 06:21 UTC (버클리 목 23:21) · 초점: People 카드
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating·예시 할인 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: / (People 덱), /users/u_jimin (v2·classic). 계획 있는 사람(Jordan·Maya)이 먼저, 계획 카드·“In your class” 공통점 한 줄 정상. 나이(“Maya 24”)는 10/13 질문 그대로.
- 고침: 지어낸 예시 프로필(Sample profile)에 학교 인증 배지(카드 오른쪽 위 체크)와 프로필의 “School verified · ID verified” 가 붙어 있었다 — 어제 고친 예시 동아리 ‘Officially verified’ 와 같은 문제. 예시 사람에게는 인증 표시를 안 단다 (PersonCard, HomePage, PersonPage, ProfileListPage). Rides 는 원래 이렇게 하고 있었다(StudentMark).
- 확인: tsc, 테스트 224 통과, v2·classic.

## 2026-10-23 03:17 UTC (버클리 목 20:17) · 초점: 예시 데이터에 남은 실제 기관·‘공식’ 표현
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 셈: 라이브에 들어간 시드 — 공고 2(op_intern “Stripe…”, op_contest “California Civic Data Challenge”, 둘 다 마감 지나 숨겨짐), 동아리 4(모두 이제 SAMPLE, 인증 배지 없음), 활동 17(모두 SAMPLE). 시드의 실제 이름 공고(SkyDeck × Google 해커톤, Cal Alumni 장학금, Kappa Delta Chi·Theta Tau 모집, ASUC 홈커밍)는 라이브엔 없고 오프라인 데모(mock)에만 있다.
- 물어봄: 예시 할인 “BOGO lattes” 가 실제 카페(Café Milano) 이름을 쓴다 — 없앨지 (QUESTIONS.md).
- 고친 것 없음.

## 2026-10-23 00:17 UTC (버클리 목 17:17) · 초점: 동아리 글·검색
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /orgs/o_band?tab=posts, /search, /activities/a_festival (v2·classic). 프로필·동아리 글 카드(PostCard)는 종류를 둘째 줄에 써서 이름 잘림 없음.
- 고침: 예시 활동 “Homecoming kickoff” 가 검색·지도·카드·상세에서 금색 “Official / 학교 공식” 표시를 달고 소개도 “Official campus event…” — 지어낸 행사를 학교 공식처럼 보인다. 예시 활동에는 공식 표시를 안 달고(ActivityCard, ActivityDetailPage, MapPage), 시드 소개에서 “Official/학교 공식” 을 뺌(seed.en.ts, seed.ts — 라이브 문구는 다음 예시 날짜 옮길 때 바뀜).
- 메모: 라이브 DB 에 시드로 만든 공고 2개가 남아 있다 — “Stripe summer internship”(Stripe, example.com), “California Civic Data Challenge”(State of California, example.com). 둘 다 마감이 지나 화면엔 안 나온다. 실제 회사·기관 이름을 단 지어낸 공고라 사장님이 관리 화면에서 지우면 깔끔(PM agent 는 라이브 DB 를 안 건드림).
- 확인: tsc, 테스트 224 통과.

## 2026-10-22 21:17 UTC (버클리 목 14:17) · 초점: Feed 와 글쓰기 화면
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음(글 안 올림).
- 찍어 봄: /community(Feed), /create/post (v2·classic). 예시 글 시각·“Fall show in 2 days” 는 활동 날짜(토 10/24)와 맞음. 글쓰기의 샘플 사진 안내는 10/16 질문 그대로. 글 주제에 #Dating 이 있다 — 10/16 Dating 질문과 같이 정하면 됨.
- 고침: Feed 줄에서 긴 종류 태그 “Looking for people to join” 이 작성자 이름을 “Et…” 로 잘랐다 → 이름이 먼저 자리를 잡고 태그가 줄어든다(“Looking for people to…”) (CommunityPage.tsx).
- 확인: tsc, 테스트 224 통과, v2·classic 스크린샷.

## 2026-10-22 18:17 UTC (버클리 목 11:17) · 초점: 다른 지역 대면 해커톤 세기 + 약속·체육관
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 셈: 팀원 모집 칸이 있는 마감 전 해커톤 75개 — 마감 가까운 15개는 모두 온라인, 온라인도 베이 지역도 아닌 대면은 2개(H.A.R.D. Hack 2027 “University of California - Jacobs Hall” 등). 10/18 질문에 “지금은 급하지 않음” 추가.
- 찍어 봄: /plans, /plans/new, /gym (v2). 약속 화면의 “Fri, Sep 25 · Algorithms session Thursday evening?” 은 배포 대기 중인 수정(245882c·4b3e832)으로 사라질 것. 체육관 CMS Fitness Center 가 이제 41/55 로 실제 숫자를 읽는다 → “CMS 0명” 메모 닫음.
- 고친 것 없음.

## 2026-10-22 15:17 UTC (버클리 목 08:17) · 초점: 해커톤 — Teams 탭과 Campus › 해커톤
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /discover?tab=teams, Campus › Hackathons (v2·classic).
- 고침: Teams 의 “See all 75 hackathons & competitions” 를 누르면 “102 listings” — 숫자가 안 맞는다. Teams 는 팀원 모집 칸이 있는 공고(해커톤·스타트업·연구)만 세고, 가는 곳은 해커톤 전체를 센다. 버튼에서 숫자를 뺌 → “See all hackathons & competitions” (DiscoverPage.tsx).
- 라이브: 고등학생 전용 “Girls Who Code HHS Hackathon 2026” 이 아직 목록에 있다 — 거르는 코드(30ade64)는 배포 대기라서. 배포되면 다음 Devpost 가져오기에서 빠진다.
- 확인: tsc, 테스트 224 통과.

## 2026-10-22 12:19 UTC (버클리 목 05:19) · 초점: 동아리 추천 이유
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 원인 찾음: “Similar to Cal Indie Collective (band club)” 가 경영 컨설팅(Beta Corporate Solutions)·IBD 환자회(UnifIBD)에 붙었다. 주제 사전의 예술 단어 ‘improv’(즉흥연기)가 **improve·improving** 에 걸려 이 동아리들이 ‘예술’로 분류됐다.
- 고침: `\bimprov\b` 로 (foryou.ts), 테스트 추가. 라이브 데이터로 다시 돌리면 밴드 동아리를 이유로 드는 137개가 전부 예술 쪽(댄스·사진·음악·잡지·디자인). 라이브 동아리 42곳의 소개에 improve 류 단어가 있어 모두 ‘예술’ 점수를 잘못 받고 있었다.
- 확인: 테스트 224 통과.

## 2026-10-22 09:17 UTC (버클리 목 02:17) · 초점: 동아리 탭·동아리 상세
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: Campus › Clubs(1562개), /orgs/o_band, /orgs/o_startup (v2·classic).
- 고침: 지어낸 예시 동아리(Cal Indie Collective, Stats Undergrad Association, Vision & Language Lab)가 SAMPLE 표시 없이 금색 체크 + “Officially verified” 를 달고 나왔다 — “데이터를 지어내지 않는다”와 정면 충돌. 이제 예시 동아리(시드 id)는 SAMPLE 표시 + “Sample club — made up to show how Lumi works.” 이고, 상세·동아리 카드·글·활동 카드 어디에도 인증 배지를 안 단다 (sampleorgs.ts 새 파일, OrgPage, OrgCard, PostCard, ActivityCard). 진짜 동아리(학교 목록에서 가져온 oc_·og_ 1558개)는 그대로.
- 메모: 예시 동아리의 Instagram·Website 버튼은 example.com 으로 간다(가짜 주소라 해는 없음). 추천 이유 “Similar to Cal Indie Collective (band club)” 가 Beta Corporate Solutions 같은 무관한 동아리에 붙는다 — 다음에 본다.
- 확인: tsc, 테스트 223 통과.

## 2026-10-22 06:19 UTC (버클리 수 23:19) · 초점: 연구·RA·장학금 목록 — 마감·대상
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 확인: 라이브 연구·장학 92개를 마감·대상으로 훑음. 마감 지난 것은 NSF GRFP(10/20) 1개 — 화면에선 이미 빠짐(BrowseTab 마감 필터). UC Merced 전용 18개·대학원 전용은 버클리 학부생 화면에 안 나옴. 장학금 25·연구 40 모두 마감 전이거나 미정.
- 고침: 마감이 아직 안 나온 공고(URAP Spring 2027, CMU REUSE, USC ICT REU 등)의 영어 배지가 “No deadline” — ‘마감 없음(상시)’으로 읽힌다. 한국어는 원래 “마감 미정” → 영어도 “Deadline TBA” (listings.ts `badgeOf`).
- 확인: tsc, 테스트 223 통과, v2·classic.

## 2026-10-22 03:17 UTC (버클리 수 20:17) · 초점: 인턴 공고 — 다른 학교 전용·학생용이 아닌 것
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 라이브 인턴 304개(자동 가져오기 302) 제목을 셈: 다른 학교·학기 이름은 “(IAP)” 1개뿐(지난번 메모, 그대로 둠). Toronto 2개는 근무지. Winter 2027 co-op 19개는 학기를 쉬고 가는 학생용이라 둠. PhD 68개는 학부생 화면에서 이미 따로 거름.
- 고침: 정규직 “Staff Credit Policy Analyst – Condo, Co-op & Project Review”(주택 ‘co-op’)가 ‘co-op’ 글자 때문에 인턴으로 들어왔다 → 제목에 intern 이 없고 co-op 만 있을 때 condo·housing·staff·senior·manager 등이 있으면 뺀다 (external.ts `isInternTitle`, 테스트 추가). 지금 라이브 302개에 돌려 보면 정확히 이 1개만 빠진다. 다음 가져오기부터 반영(배포 후).
- 확인: 서버 타입, 테스트 223 통과.

## 2026-10-22 00:17 UTC (버클리 수 17:17) · 초점: Campus › Browse (장학금·인턴·무료 음식)
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /opportunities, Scholarships·Internships·Free food 칩 (v2). 장학금 25개 모두 D-9 이상(마감 지난 것 없음), 무료 음식 8개 모두 오늘 이후, 인턴 306개.
- 확인만: 장학금 칩에 연구 펠로십(SURF·REU 등)이 같이 나오는 건 의도(돈 받는 연구 = 펀딩, listings.ts `categoriesOf`).
- 메모: 인턴 “For you” 맨 위 “Micro-Intern: Research Technology Developer (IAP)”(Point72/Cubist, 뉴욕, 1월 근무). 공고 본문을 직접 읽음 — 학교 제한은 적혀 있지 않지만 IAP 는 MIT 1월 학기 이름이고 버클리 봄 학기와 겹친다. 대상이 MIT 학생일 가능성이 크지만 확인할 수 없어 빼지 않음. 같은 회사가 학교별 공고(IIT Hyderabad 등)를 따로 낸다 — 제목에 다른 학교 이름·학기 이름이 있으면 거르는 규칙은 다음에 본다.
- 고친 것 없음.

## 2026-10-21 21:17 UTC (버클리 수 14:17) · 초점: Discover › Activities 와 활동 상세
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음(참여 요청 안 누름).
- 찍어 봄: /discover?tab=activities, /activities/a_band_show, /activities/a_startup_chat (v2·classic). 날짜 묶음·참가 수·주최 표시·댓글 정상.
- 고침: 수업 중(14:17, 다음 공강 15:00)인데 Discover 맨 위 줄이 초록 점 + “Free 3 PM–9 PM” 이라 지금 비어 있는 것처럼 읽혔다 → 지금 수업 중이면 회색 점 + “Next free 3 PM–9 PM” / “다음 공강 15:00–21:00” (DiscoverPage.tsx).
- 확인: tsc, 테스트 222 통과, v2·classic·한국어.

## 2026-10-21 18:17 UTC (버클리 수 11:17) · 초점: 시간표 — 친구와 겹치는 공강
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /timetable 아래 “Friends free when you are today” (v2·classic·한국어).
- 고침: 길이 표기 “(0.5h)”·“(6.0h)” → “(30 min)”·“(6h)” / “(30분)”·“(6시간)” — 수업이 :59 에 끝나 361분이 6.0h 로 보였다, 30분 단위로 (timetable.ts `fmtHours`). 만들기 버튼 “3 PM–4:29 PM Create activity” → “3 PM–4:30 PM” — 화면에 보이는 시작(5분 올림)부터 90분 (TimetablePage.tsx).
- 확인: tsc, 테스트 222 통과.

## 2026-10-21 15:18 UTC (버클리 수 08:18) · 초점: 프로필 편집
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /profile/edit (v2·classic). 키·Dating 은 10/16 질문 그대로.
- 고침: 사진이 있는 사람(데모 Alex)도 편집 화면 미리보기는 이모지(🧑‍💻)였다 — 다른 화면은 다 사진 → 미리보기를 앱 공통 아바타로(사진, 안 열리면 이모지). 사진이 없는 사람(가입한 학생은 지금 모두 이모지)에게는 ‘Face / Masked / From behind’(사진 위에 붙는 표시라 이모지엔 뜻 없음)를 숨기고 색 막대에 “Background color” 이름을 붙임 (EditProfilePage.tsx).
- 메모: 사진이 있는 사람에게 이모지 고르기·색 막대는 보이는 데가 없다(사진이 안 열릴 때만 쓰임). 진짜 사진 올리기를 정할 때(10/16 질문) 같이.
- 확인: tsc, 테스트 222 통과.

## 2026-10-21 12:21 UTC (버클리 수 05:21) · 초점: 설정·공개 범위·계정 안전, 개인정보처리방침
- 사장님 답: 아직 없음 (데모 계정 A/B/C 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 사장님 질문(채팅) “메인에 다 커밋?” → 아니요, claude/lumi-pm 에만. 배포 대기 커밋 121개. 배포 브랜치 push 는 사장님 허락이 있어야 한다고 답함.
- 찍어 봄: /settings, /settings/privacy, /settings/safety (v2·classic·한국어). 공개 범위·차단·신고 목록 정상(테스트 신고는 10/18 질문 그대로).
- 고침: 설정 › 언어 아래 “Switching language also switches the demo campus and sample data.” 는 예시 데이터(mock)에서만 맞다 — 라이브 서버에선 글자만 바뀌고 학교는 그대로(한국어로 찍어도 버클리 데이터 확인). 이제 mock 일 때만 보임 (SettingsPage.tsx).
- 물어봄: 개인정보처리방침에 Ask Lumi 설명 4곳 + 서버 Ask 주소가 살아 있음 (QUESTIONS.md). 법 문서라 혼자 안 고침.
- 메모: 한국어 설정 화면에 “Privacy Policy · Terms of Use” 가 영어. 출시는 영어라 나중.
- 확인: tsc, 테스트 222 통과.

## 2026-10-21 09:17 UTC (버클리 수 02:17) · 초점: 알림 화면과 알림을 눌렀을 때
- 사장님 답: 아직 없음 (데모 계정 A/B/C 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /notifications (v2·classic·한국어), 알림 4개를 하나씩 눌러 도착 화면 확인 — 제안→요청 탭, 팔로워→프로필, 근처 추천→활동, 동아리 새 행사→활동. 모두 맞는 곳으로 간다.
- 라이브(아직 배포 전 코드): 요청 탭의 예시 제안이 “📖 Study · Fri, Sep 25 · 7pm” (지난 날짜). 245882c(배포 대기)가 이미 고친 것 — 배포되면 사라진다.
- 고침: 그 예시 제안 문구 “Algorithms session Thursday evening?” 은 날짜가 매번 옮겨지는데 요일을 박아 둬서 날짜와 어긋난다 → “Algorithms study session that evening?” / “그날 저녁에 알고리즘 같이 풀어요!”, 그리고 다시 살릴 때 문구도 시드 것으로 바꿈 (seed.en.ts, seed.ts, server/demo.ts, 테스트 추가).
- 메모: 한국어 화면에서도 알림 제목·내용은 영어(라이브 DB 에 영어 시드로 저장됨). 출시는 버클리·영어라 지금은 그대로.
- 확인: tsc, 서버 타입, 테스트 222 통과.

## 2026-10-21 06:18 UTC (버클리 화 23:18) · 초점: Rides
- 사장님 답: 아직 없음 (데모 계정 A/B/C 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /rides, /rides/new, 카풀 상세 3개(운전·태워 줄 사람 찾기·Uber 나누기) (v2·classic). 목록·글쓰기·가격 안내 정상. 상단 알약이 “My rides” 를 가리는 건 기존 질문(10/17).
- 고침: “태워 줄 사람 찾는” 글 상세의 Seats 줄이 “1 person needs a ride · 1 person” 으로 같은 말을 두 번 → “1 person needs a ride”. 빈 자리 칸이 없는 글에 “Riders' names show once you join.” 이 붙던 것도 뺌 (RideDetailPage.tsx).
- 확인: tsc, 테스트 222 통과.

## 2026-10-21 03:18 UTC (버클리 화 20:18) · 초점: 오래 안 본 화면 — 식당·좌석 알림·학사력·지도
- 사장님 답: 아직 없음 (데모 계정 A/B/C 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /dining, /seats, /academic-calendar, /map (v2·classic). 식당 메뉴·학사력 D-day 정상, 좌석 알림 빈 화면 안내 정상.
- 고침: 인원 제한 없는 활동(예: BOGO 라떼)이 지도 목록·작은 활동 카드에 “0/∞” → “0 joined” / “0명 참가” (ActivityCard.tsx, MapPage.tsx, en.ts). 큰 카드·상세는 원래 “joined · no limit”.
- 메모(지난번 것): 수업 방 시간 “9:30am–10:59am” 은 수업 화면 공통 짧은 표기(clockLabel)라 그대로 둠.
- 확인: tsc, 테스트 222 통과.

## 2026-10-21 00:17 UTC · 초점: 수업 공간 — 겹친 버튼
- 사장님 답: 아직 없음 (데모 계정 A/B/C 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /classes/CS 61A…, /c/berkeley/cs-186 (v2·classic).
- 고침: 수업 공간·수업 방에 “Copy class link”·“QR for slides”가 위 버튼 줄과 아래 카드에 두 번씩 나오던 것 → 위 줄만 남김(ClassRoom.tsx 의 아래쪽 3곳 삭제). 두 화면 모두 위 줄을 이미 갖고 있다. 복사 후 안내(“paste it in your class Discord or GroupMe”)는 토스트에 그대로.
- 메모: 수업 방 머리의 시간이 “Mon/Wed 9:30am–10:59am” — 학교 목록 표기 그대로라 틀린 건 아니지만 다른 화면(“11 AM”)과 모양이 다르다. 다음에 맞출지 본다.
- 확인: tsc, 테스트 통과.

## 2026-10-20 21:17 UTC · 초점: 수업을 넣은 뒤 — 수업 공간(같은 수업 친구)
- 사장님 답: 아직 없음 (데모 계정 실수 기록 A/B/C 포함) → 데모 시간표는 그대로 둠. 라이브에 쓴 것 없음(스크립트가 /api/rpc/ 를 모두 막음).
- 찍어 봄: /classes/CS 61A…, /classes/CS 186… (v2·classic).
- 고침: 수업 공간 제목 아래 시간이 “Mon/Wed/Fri/Thu 12 PM · DIS 118” — 디스커션 요일(목)이 강의 요일에 섞이고 시각은 강의 것만 → “Mon/Wed/Fri 12 PM · DIS 118 Thu 12:30 PM”. 요일도 월→금 순서로 (ClassPage.tsx).
- 메모: 수업 공간에 “Copy class link”·“QR for slides”가 위 버튼 줄과 아래 카드에 두 번씩 나온다. 수업 방(/c/…)과 같은 부품을 써서 생긴 것 — 다음에 위쪽 줄을 줄일지 본다.
- 확인: tsc, 서버 타입, 테스트 222 통과.

## 2026-10-20 18:18 UTC (버클리 화 11:18) · 초점: 첫 수업 넣은 직후 — ⚠️ 라이브 쓰기 사고

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로.
- 고침: 수업 추가 알림이 "4 meeting times added" — 무엇을 넣었는지 안 보임 → "CS 61A added with DIS 118" / "CS 61A · DIS 118 추가했어요"(TimetablePage). 화면에서 확인.
- ⚠️ 사고: 위 확인을 위해 추가 흐름을 끝까지 돌릴 때 저장 요청을 가짜로 받으려던 필터가 틀린 주소(/api/users)를 봐서, 실제 요청(/api/rpc/users/update)이 라이브로 나감 → 공용 데모 계정 u_me 시간표에 CS 61A 3칸 + DIS 118 1칸 추가(11→15, 라이브 bootstrap 으로 확인). 규칙 위반. 되돌리기도 라이브 쓰기라 하지 않고 QUESTIONS 에 올림(추천: 허락받고 원래 11칸으로 한 번 되돌리기).
- 재발 방지: scratchpad 의 모든 화면 스크립트(full·ko·clk·clkl·deck·empty·pick 등 9개)가 /api/rpc/ 요청을 전부 막도록 바꿈. 브라우저 안에서 쓰기 요청을 보내 "BLOCKED WRITE" 로 막히는 것 확인. 앞으로 저장 흐름은 이 가드가 있는 스크립트로만 돌린다.
- 검증: `npx tsc -b`, `npm test` 222/222.
- 다음 초점: 사장님 답 기다림(되돌리기). 그 외 같은 수업 친구 안내 화면.

## 2026-10-20 15:17 UTC (버클리 화 08:17) · 초점: 시간표가 빈 새 사용자

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로.
- 방법: 테스트 브라우저에서만 서버 응답의 내 시간표를 비워(저장 안 함) 처음 가입한 사람이 보는 화면을 봄.
- 본 것: 시간표 빈 화면("Your timetable is empty · Add first class") 좋음. People 카드 위 "free 10 AM–9 PM" 은 상대(Jordan)의 빈 시간이라 맞음.
- 고침 1: Discover 맨 위 줄이 "Add your timetable" 인데 버튼은 "Open"(시간표가 없으면 하루 종일 비었다고 계산돼 즉석 모임 열기로 감) → 시간표가 없으면 "Add" → 시간표 화면(DiscoverPage). 시간표가 있으면 그대로 "Free 9 AM–3 PM · Open".
- 고침 2: 시간표 화면 "Next: 15:00 UGBA 105" → 영어 "Next: 3 PM UGBA 105", 한국어 "다음 수업 15:00" 그대로(TimetablePage). 앞서 맞춘 12시간 표기와 같게.
- 검증: `npx tsc -b`, `npm test` 222/222. v2·classic 빈 시간표/있는 시간표 둘 다, 한국어 확인.
- 다음 초점: 시간표에 첫 수업을 넣은 직후 화면(추가 완료 알림·같은 수업 친구 안내).

## 2026-10-20 12:20 UTC (버클리 화 05:20) · 초점: Me 화면

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로.
- 본 것(v2·classic): 학사 일정(D-6 Phase 1 · D-10 성적 옵션 마감 · D-55 기말), 시간표, 다음 빈 시간, 프로필 100%, 좌석 알림. 문구·배치 이상 없음.
- 고침: 바로 위아래가 "Free until 15:00" / "Next free window 9 AM–3 PM" 으로 시간 표기가 달랐다 — 지금 상태 문구(statusLabel: 공강·수업 중 ~까지)도 영어는 12시간("Free until 3 PM"), 한국어는 그대로("공강 · 15:00까지"). 어제 고친 빈 시간 표기와 같은 규칙(core/lib/timetable).
- 검증: `npx tsc -b`, `npm test` 222/222. v2·classic Me·시간표, 한국어 Me 확인.
- 다음 초점: 시간표 화면 처음 쓰는 사람 흐름(수업 0개일 때 빈 화면·첫 수업 넣기).

## 2026-10-20 09:18 UTC (버클리 화 02:18) · 초점: "Invite friends" 가 보내는 문구

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로.
- 고침: 초대 문구가 사실과 달랐다 — 수업판 "Our CS 186 Databases section is on Lumi"(내가 있다는 것만으로 우리 수업 사람들이 있다고 말함), 기본판 "people on our floor"(기숙사라고 가정). → "I'm on Lumi — it shows who in CS 186 is free between classes. Join so we can find each other: …/welcome" / "I'm on Lumi — see who's free between classes and where the free food is on campus. Join me: …". 한국어도 같은 뜻으로. 과목 코드만 씀(FeedExtras useInvite — People 끝 화면·피드 조용할 때 카드가 같이 씀).
- 검증: `npx tsc -b`, `npm test` 222/222. People 끝 화면에서 Invite friends 를 눌러 복사된 문구 확인(브라우저 클립보드를 가로채서 읽음, 아무것도 안 보냄).
- 다음 초점: Me 화면 첫 채우기(프로필 완성도·시간표 넣기 안내).

## 2026-10-20 06:19 UTC (버클리 월 23:19) · 초점: People 카드 넘기기

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로.
- 본 것(v2·classic): 카드(사진·Sample profile·학과·같이 갈 모임·같은 수업·관심사), ✕ 로 8장 끝까지 넘김(✕ 는 화면에서만 — 오른쪽(연결)은 친구 요청을 보내므로 안 누름).
- 고침: 끝까지 넘기면 "You've seen everyone for now · Start over" 뿐인 막다른 화면. 사람이 적은 첫 주엔 여기가 제일 자주 보이는 화면 → "Lumi gets better with every friend who joins." + "Invite friends"(이미 있는 초대 기능) + "Start over" (HomePage).
- 검증: `npx tsc -b`, `npm test` 222/222. v2·classic 끝 화면 확인.
- 다음 초점: Me 화면(30명이 자기 프로필·시간표를 처음 채우는 곳)과 "Invite friends" 가 보내는 문구.

## 2026-10-20 03:17 UTC (버클리 월 20:17) · 초점: 빈 시간 표기

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로.
- 고침: 빈 시간(공강) 표기가 영어 화면에서도 24시간이고("Free 11:22–13:00", "Free together today 14:59–21:00"), 지금부터 시작하는 블록은 시작 분이 매분 바뀌었다. 공용 fmtBlock 하나를 고쳐 9곳(Discover·시간표·프로필·People·추천 이유) 같이: 영어는 "8:20 PM–9 PM" 처럼 앱의 다른 시각과 같은 12시간, 한국어는 24시간 그대로, 시작은 5분 단위로 올림.
- 검증: `npx tsc -b`·typecheck:server, `npm test` 222/222. v2·classic 영어 "Free 8:20 PM–9 PM", "Free together today 3 PM–9 PM", 한국어 "공강 20:20–21:00" 확인.
- 다음 초점: People 카드 넘기기(30명이 첫 주에 제일 많이 볼 화면).

## 2026-10-20 00:18 UTC (버클리 월 17:18) · 초점: 친구 추가 흐름·프로필 편집

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로.
- 본 것(v2·classic): 친구 아닌 사람(Ethan) "Add friend", 요청 보낸 사람(Daniel) "Cancel request", 친구(Jordan) "Friends" 프로필, 프로필 편집 화면. 버튼은 안 누름(라이브 DB).
- 고침: 프로필 아래 버튼 줄에서 하트·Follow·친구 버튼이 왼쪽에 몰리고 오른쪽이 비었다(메시지 버튼은 아래 줄로 넘어감) → Follow·친구 버튼이 남은 폭을 나눠 채움(PersonPage).
- 검증: `npx tsc -b`, `npm test` 222/222. v2·classic 세 프로필 스크린샷 확인.
- 메모(안 고침): 친구 프로필 "Free together today 14:59–21:00" — 24시간 표기 + 지금 시각부터라 14:59 같은 애매한 분. 다른 곳은 "2:59 PM" 식. 다음에 맞추기. 프로필 편집 화면은 이상 없음.
- 다음 초점: "Free together" 시간 표기, 그리고 30명 첫 주에 많이 볼 People 카드 넘기기.

## 2026-10-19 21:17 UTC (버클리 월 14:17) · 초점: 채팅방 안·요청 탭

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로.
- 본 것(v2·classic): 빈 채팅방(Maya) "Say hello. Block and report are in the top-right menu." + 입력칸 — 문제 없음. 요청 탭: 받은 제안 1·보낸 친구 요청 2.
- 고침 1: 받은 1:1 제안 시각이 "📖 Study · 2026-09-25 19:00" 날것 그대로 → "Fri, Sep 25 · 7pm" / "9월 25일 (금) · 오후 7시" (core/lib/plans proposalWhen, 채팅 요청 탭·Plans 화면). 자유 문구는 그대로.
- 고침 2: 예시 제안이 "19h ago" 인데 제안 날짜는 3주 전(9/25) — 다시 살릴 때 보낸 시각만 옮기고 제안 날짜는 그대로였다. 이제 시드의 "보낸 날 + 며칠"을 지켜 날짜도 옮기고, 기다림인데 날짜가 지난 것도 다시 맞춘다(server/demo.ts). 테스트 추가(고치기 전 실패).
- 고침 3: 예시 채팅 "Thank you!! Bringing Hannah" — 숨긴 예시 사람 이름. 시드 문구를 "Bringing a friend" 로, 그리고 라이브 예시 대화 문구도 시드를 따르게(시간이 이미 맞아도 문구가 다르면 고침, 실제 사람이 끼어든 대화는 그대로). 테스트 추가(고치기 전 실패).
- 검증: tsc·typecheck:server, `npm test` 222/222. 요청 탭 v2·classic·한국어 확인 (날짜 이동은 서버 변경이라 배포 뒤).
- 다음 초점: 친구 추가 흐름(프로필에서 친구 요청 → 요청 탭), 프로필 편집 화면.

## 2026-10-19 18:18 UTC (버클리 월 11:18) · 초점: 채팅 목록·친구

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로.
- 고침: 채팅 목록 위 "지금 시간 되는 사람"(Lily·Sofia·Maya…) 줄과 Discover "Free Right Now" 줄에 예시 표시가 없었다 — 다른 목록은 다 붙어 있음(PRODUCT_TASTE). 이름 아래 작은 SAMPLE 표시(사진 위에 얹으니 잘 안 읽혀서 이름 아래로). ChatInboxPage·DiscoverPage.
- 검증: `npx tsc -b`, `npm test` 219/219. v2·classic 스크린샷 확인.
- 메모(안 고침): 예시 채팅 Jordan 미리보기 "Thank you!! Bringing Hannah" — 숨긴 예시 사람 이름이 채팅 본문에 남음(알림은 55회차에 걸렀지만 채팅 메시지는 아님). 데이터 문구 문제라 다음에.
- 다음 초점: 채팅방 안(첫 메시지 보내기 화면·빈 채팅방 "Say hello"), 요청(Requests) 탭.

## 2026-10-19 15:18 UTC (버클리 월 08:18) · 초점: 아침 라이브 — 식당·체육관

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로.
- 라이브 확인(오전 8:18): Discover 식당 "Café 3, Clark Kerr +9 open · Scrambled Eggs · Café 3, breakfast", 체육관 "RSF 60% · Moderate", 체육관 화면 "Today 7 AM–11 PM", 식당 화면 아침 메뉴 정상. (어젯밤 "Closed · Opens 7 AM" → 아침 "열림" 으로 바뀌는 것까지 확인)
- 고침: 체육관 화면이 "평소 선은 일주일 기록이 쌓이면 나와요 (7/7 days)" 라고 하는데 선이 없었다 — 일수에 오늘까지 세서. 평소 선은 오늘 빼고 7일이 필요 → 지난 날만 세게(core/lib/gym.ts). 오늘은 6/7, 내일 선이 나온다. gym.test 에 "6일+오늘 = 6/7, 선 없음" 추가(고치기 전 실패 확인). 서버 값이라 배포 뒤에 화면에 보임.
- 메모(안 고침): CMS Fitness Center 가 밤 11시에도 아침 8시에도 0/55, 오늘 그래프도 거의 0 — 원본(Density API)이 0 을 준다. 센서가 안 세는 것 같지만 확인할 방법이 없음. 계속 0 이면 CMS 칸을 숨길지 사장님께 물어볼 것.
- 검증: tsc·typecheck:server, `npm test` 219/219.
- 다음 초점: 채팅 목록·채팅방 첫 메시지 흐름, 친구 추가 화면.

## 2026-10-19 12:26 UTC (버클리 월 05:26) · 초점: 30명 출시 흐름 — 약속 잡기·+ 메뉴

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로 (lumi-pm 의 섹션 고르기·Ask Lumi 빼기 등은 아직 배포 안 됨).
- 본 것(v2·classic): People 첫 화면, /plans/new("Ask friends" 링크로 묻기), /together/new("Plan Together"). 문구·레이아웃 이상 없음. 저장 버튼은 안 누름.
- 큰 것 → QUESTIONS: 약속 잡기가 두 갈래(링크로 묻기 vs Plan Together)이고, Plan Together 는 시간표를 모아 시간을 추천 — PRODUCT_TASTE "원하지 않은 것"과 부딪힘. 추천 A(출시용으로 Plan Together 입구 감추기).
- 고친 것 없음 (결정이 필요한 것이라).
- 다음 초점: 채팅 목록·채팅방 첫 메시지 흐름, 친구 추가 화면.

## 2026-10-19 (사장님 지시) · 다른 학교는 보류 — 버클리만

- 사장님: "지금 그냥 버클리만 해보자". 새 학교는 열지 않음 (schools.csv 그대로: Berkeley·Merced).
- 그 전에 해 둔 밑작업은 버클리 동작을 바꾸지 않아 저장해 둠: 학교별 시간대(School.tz, 없으면 태평양 — 앱은 로그인한 학교 시간대로 "오늘"을 셈), 행사 가져오기의 학교 이름·시간대(BU 행사가 "CalLink"·태평양 시간으로 찍히지 않게), Localist 캘린더 어댑터(Stanford·MIT·Northeastern 용, 지금은 아무 학교도 안 씀).
- 나중에 다른 학교를 열 때 할 일: schools.csv 에 줄 추가(tz 열 포함, 예 America/New_York), events_source=localist:<주소>. 조사 결과는 위 Stanford 기록에.
- 검증: tsc·typecheck:server, `npm test` 219/219. 버클리 Discover·시간표·라이드 화면 그대로.

## 2026-10-19 (사장님 지시) · Stanford 수업·섹션, 학기 라벨

- 사장님: "스탠포드도 구현해보고, 하버드처럼 동부에 여러 학교 붙어 있는 곳도 해보자".
- Stanford 수업 가져오기 고침: 예전엔 학기 구분 없이 첫 강의 섹션을 골라 가을 목록에 겨울 강의 시간이 섞일 수 있었고, 학기 라벨이 "Autumn 2026-2027" 이라 지금 학기를 못 찾았다. 이제 쿼터(Autumn·Winter·Spring)마다 한 줄, 그 쿼터 강의 시간 + 같은 쿼터의 토론·랩을 sections 로 같이 저장(실제 CS 106A Autumn 2026: MWF 11:30–12:20 Hewlett 200, 토론 61개). 강의 섹션이 여럿이면 섹션마다 한 줄.
- 학기 라벨: "2026-2027 Autumn"→"Autumn 2026", "Winter"→뒤 해, UMD "202608"→"Fall 2026" (저장된 옛 줄도 읽을 때 바뀜). 쿼터제는 Autumn 을 지금 학기로 봄.
- 섹션 API: 가져올 때 섹션이 같이 온 학교는 저장된 것을 그대로, Berkeley 는 고를 때 읽어 옴. 수업 검색 결과에서는 섹션을 빼고 보냄(학과 목록 400줄이 커지지 않게).
- 검증: tsc·typecheck:server, `npm test` 216/216 (Stanford 실제 응답을 줄인 fixture 테스트 추가).
- 조사: 동아리 목록 — Stanford(CampusGroups 777)·MIT(514)·Northeastern(938)·BU(Engage 432)·BC(428)·Tufts(423) 찾음, Harvard 못 찾음. 학교 캘린더 Localist API — Stanford·MIT·Northeastern 됨, Tufts·Harvard 안 됨.
- 막힌 것: 앱 곳곳(약 15곳)이 캠퍼스 시간을 태평양 시간으로 고정 — 동부 학교는 행사 시간이 3시간 틀린다. 다음: 학교별 시간대.

## 2026-10-19 (사장님 지시) · 시간표 디스커션·랩 섹션 (2단계)

- 사장님 결정: "2단계로 하자" — 버클리 공개 시간표에서 실제 섹션을 읽어 고르게.
- 원본: 수업 페이지의 "Associated Sections" 칸이 부르는 classes.berkeley.edu/sections/associated/<node id>. 섹션마다 번호·종류(DIS/LAB)·요일·시간·장소. 자리 채우기용 999 섹션(일요일 0시 1분)과 시간 없는 섹션은 뺌.
- 전체 가져오기에 넣지 않음(수업마다 요청 +1 → 하루 가져오기 두 배). 학생이 수업을 넣을 때 그 수업 것만 서버가 읽고 6시간 기억(실패는 10분). 가져오기는 목록 줄의 node id 를 sourceId 로 저장, 옛 목록은 수업 페이지에서 id 를 읽음.
- 화면: 수업 목록에서 강의를 고르면 디스커션·랩 목록 → 종류마다 하나 고르기(모르면 비워 두고 "강의만 추가"). 섹션이 8개 넘으면 번호로 찾기. 내 시간표·강의와 겹치면 "Overlaps CS 169". 고른 섹션은 같은 수업 이름에 section "DIS 118" 로 저장 → 공강 계산·같은 섹션 친구가 그대로 씀. 시간표 칸에 "DIS 118 · Dwinelle 189".
- 섹션이 없거나 못 읽으면 예전처럼 바로 강의만 추가. 다른 학교는 아직 빈 목록.
- 검증: tsc·typecheck:server 통과, `npm test` 214/214(새 sections.test.ts 4개, 실제 CS 61A 응답을 줄인 fixture). 실제 CS 61A Fall 2026 응답(디스커션 46·랩 43)으로 v2·classic 화면 확인 — 라이브 서버엔 아직 새 주소가 없어 브라우저에서 그 응답을 대신 넣었고, "추가"는 누르지 않음(라이브 DB 안 건드림).
- 배포 뒤 확인: 라이브에서 CS 61A 를 고르면 섹션 목록이 뜨는지.

## 2026-10-19 (사장님 지시) · Ask Lumi 빼기

- 사장님 결정: "Ask Lumi는 걍 빼라". Discover·Browse 위의 Ask Lumi 입구(AskBar)와 /ask 화면(AskPage)을 지움. /ask 로 들어오면 Discover 로 보냄(예전 링크가 깨지지 않게). PRODUCT_TASTE "원하지 않은 것"에 적음.
- 남긴 것: 서버의 /api/ai/ask 와 가입 때 "프로필 채우기"·대화 첫마디(Starters)는 그대로 — 같은 AI 를 쓰지만 Ask Lumi 화면이 아님. 개인정보처리방침의 Ask Lumi 문장은 그대로(다음에 정리).
- Discover 맨 위 카드가 헤더에 붙지 않게 위 여백 pt-3.
- 검증: `npx tsc -b` 통과, `npm test` 210/210. v2·classic 에서 Discover·Browse 에 Ask Lumi 없음, /ask → Discover 확인.

## 2026-10-19 09:17 UTC (버클리 월 02:17) · 97회차 · 초점: 로그인 전 첫 화면(/welcome·/start) v2

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로(95·96회차는 아직 안 올라감). 버클리 새벽 2시라 아침 식당·체육관 확인은 다음으로.
- 본 것: /welcome(v2 "Who's free on campus right now?" / classic "at Cal"), 카드 3장(점심 친구 · 무료 음식 Mon 8AM · 오늘 마감 NSF GRFP Oct 19) 정상. /start 1~8단계 v2·classic 문구·버튼 정상(9단계 실제 이메일 전에서 멈춤).
- 고침: 7단계 "Here's your profile" 카드에서 학교 이름이 "Computer Science · Junior · UC Berk…" 로 잘림 — 카드에 자리가 있는데 한 줄로 자르고 있었음 → 두 줄까지 보이게(StartPage.tsx, truncate → line-clamp-2).
- 검증: `npx tsc -b` 통과, `npm test` 210/210. v2·classic 7단계 스크린샷에서 "Computer Science · Junior · UC Berkeley" 전부 보임.
- 메모(안 고침): /welcome 에서 디자인 전환 버튼이 위쪽 띠(1,558 CLUBS…)를 가림 — 이미 QUESTIONS 에 있는 '디자인 버튼이 내용 가림' 건과 같음.
- 다음 초점: 버클리 오전(다음 실행 12:17 UTC = 05:17 PT 는 아직 이름, 그 다음 15:17 UTC = 08:17 PT)에 식당·체육관 카드 "opens" 표시.

## 2026-10-19 06:19 UTC (버클리 일 23:19) · 96회차 · 초점: 배포 뒤 라이브 확인 + Discover 식당 카드

- 새 사장님 답 없음. 배포 브랜치에 lumi-pm 작업이 거의 다 올라감(4415c92 까지 — 51~94회차). 95회차(Saved 숫자)만 아직 안 올라감.
- 라이브에서 확인(v2, https://heetz.up.railway.app): 알림 시간이 "1h ago·3h ago·10h ago·2d ago" 로 바뀜, 숨긴 예시 사람(Hannah)·없는 장학금 마감 알림 사라짐. 관리 화면 참가 요청 "37m ago". 공연 모임 댓글 "2h ago". RSF 체육관 "Closed · Today 8 AM–11 PM"(밤 11:19), Discover 체육관 카드 "Closed". 전부 기대대로.
- 고침: Discover '식당 지금' 카드가 "Closed for today" 아래에 "Jasmine Rice · Café 3, dinner" — 이미 끝난 저녁 메뉴가 아직 먹을 수 있는 것처럼 보임 → 연 곳도 다음에 열 곳도 없으면 메뉴 줄을 숨김(LiveCards.tsx).
- 검증: `npx tsc -b` 통과, `npm test` 210/210. 로컬 v2·classic 에서 "DINING NOW | Closed for today" 만 나오는 것 확인.
- 메모(안 고침): 체육관 카드가 닫힌 시간에 "Closed" + "Closed for today" 두 번. CMS Fitness Center 는 운영 시간 자료가 없어 밤 11시에도 "Quiet 0%".
- 다음 초점: 아침(버클리 오전)에 식당·체육관 카드가 "opens 7 AM" 처럼 맞게 나오는지, 그리고 /welcome·/start 첫 화면 v2.

## 2026-10-19 03:17 UTC (버클리 일 20:17) · 95회차 · 초점: 저장(Saved) 목록

- 새 사장님 답 없음. 배포 브랜치가 8bfd353 "New design (v2) is the default" 로 움직임(사장님 결정, design.ts 기본값 v2·저장 키 lumi.design.2). 병합함. lumi-pm 수정들은 여전히 배포 안 됨. 실행 이름이 "3시간마다"로 바뀜.
- 고침: Browse 의 "☆ Saved 1" 칩을 누르면 "0 listings · Tap ☆ …" 빈 목록. 데모 계정이 저장한 공고가 마감됐거나 라이브에 없어서 목록에선 빠지는데 칩 숫자는 저장 기록을 그대로 셌다 → 칩 숫자를 목록에 실제로 뜨는 것만 세게(BrowseTab). Me 화면 "Saved & applications 1" 도 같은 이유로 빈 목록을 열었다 → 같은 규칙(활동·동아리 제외, 마감/날짜 지난 것·없는 공고 제외)으로 센다(ProfilePage).
- 검증: `npx tsc -b` 통과, `npm test` 210/210. v2·classic 에서 칩 "Saved"(숫자 없음) + 빈 목록 안내, Me "Saved & applications 0", 한국어 "저장·지원 내역 0개" 확인.
- 메모: index.html 의 apple-mobile-web-app-status-bar-style 이 "default"(흰 상태바)인데 기본 디자인이 어두운 v2 가 됨 — 홈 화면에 추가한 아이폰에서 상단이 흰 띠로 보일 수 있음. 배포 파일이라 다음에 확인.
- 다음 초점: v2 가 기본이 됐으니 처음 들어오는 사람(로그인 전 /welcome·/start) 화면을 v2 로 다시 보기.

## 2026-10-19 02:17 UTC (버클리 일 19:17) · 94회차 · 초점: 알림 목록

- 새 사장님 답 없음. 배포 브랜치 295a5f2 그대로.
- 고침: 알림 목록 카드가 화면 양옆에 딱 붙어 있었다(`px-4 py-3 card` — 여백이 카드 안쪽에 들어감). 바깥에 여백 div 를 두고 그 안에 카드 → 양옆 16px 띄우고 모서리 둥글게. NotificationsPage 1개 파일.
- 검증: `npx tsc -b` 통과, `npm test` 210/210. v2·classic 스크린샷에서 카드 양옆 여백·둥근 모서리 확인.
- 라이브에서 본 것(이미 lumi-pm 에 고쳐 둠, 배포 대기): 모든 알림이 "Sep 23"(rollSampleContent 의 알림 다시 맞추기, 배포본에 없음), "Deadline in 4 days" 가 라이브에 없는 op_scholarship 을 가리킴(54회차 view.ts 필터가 지움), 숨긴 예시 사람 Hannah 이름(55회차 namesHidden 이 지움).
- 메모(안 고침): 한국어 화면에서도 알림 제목·본문이 영어 — 시드가 영어로 저장돼 있어서. 서버 데이터 문제라 작은 수정 아님.
- 다음 초점: 최근에 안 본 화면 — 저장한 것(Saved) 목록과 마감 지난 항목 처리.

## 2026-10-19 01:17 UTC (버클리 일 18:17) · 93회차 · 초점: 모임 관리 화면(92회차 이어서)

- 새 사장님 답 없음. 배포 브랜치 295a5f2 그대로. 컨테이너 재시작 → vite 다시 띄움.
- 고침 1: 관리 화면 요약이 인원 제한 없는 모임에서 "Approved 0 / cap no limit · pending 0" → 제한 없으면 "/ cap" 부분을 빼서 "Approved 0 · pending 0". 정원 있는 모임은 그대로.
- 고침 2: 관리 화면 참가 요청 날짜가 "Sep 23"(시드는 '20분 전'). 예시 참가 요청(participations)은 rollSampleContent 가 다시 맞추지 않았다 → 알림과 같은 방식으로 시드의 '몇 분/시간 전'을 지금 기준으로 다시 맞춘다(server/demo.ts). 실제 사람 요청은 시드 id 가 아니라 안 건드림. samples.test.ts 에 테스트 추가(고치기 전 실패 확인).
- 확인: 92회차 메모의 '모임 댓글 날짜 Sep 23' 은 이미 d40fd4d(lumi-pm, 미배포)가 고쳐 둠.
- 검증: `npx tsc -b`, `typecheck:server` 통과, `npm test` 210/210. v2·classic·한국어로 a_mine 관리 화면 "Approved 1 / cap 4 · pending 1" / "승인됨 1 / 모집 4 · 대기 1" 그대로인 것 확인. 데모 계정이 여는 제한 없는 모임이 없어 그 경우는 화면으로 못 봄. 참가 요청 날짜는 서버 변경이라 배포 뒤 라이브에서 봐야 함.
- 다음 초점: 최근에 안 본 화면 — 알림 목록의 시간 표시와 빈 상태.

## 2026-10-19 00:17 UTC (버클리 일 17:17) · 92회차 · 초점: 모임 상세·참가 인원 표시

- 새 사장님 답 없음(QUESTIONS 답: 7개 그대로). 배포 브랜치 295a5f2 그대로.
- 고침: 인원 제한 없는 모임(정원 999 이상)이 영어로 "0 joined · cap no limit" 으로 읽혀 어색했다 → "0 joined · no limit" / "0명 참가 중 · 인원 제한 없음". 상세(ActivityDetailPage)와 카드(ActivityCard 두 곳) 같이. 정원 있는 모임은 그대로("1 joined · cap 200").
- 검증: `npx tsc -b` 통과, `npm test` 209/209. v2·classic 영어로 a_festival 상세 "0 joined · no limit", 한국어 v2 a_festival "0명 참가 중 · 인원 제한 없음", a_band_show "1명 참가 중 · 모집 200명" 확인.
- 메모(데이터, 안 고침): 학교 공식 행사 'Homecoming kickoff' 주최자가 학생(Jordan)으로 나옴. a_band_show 댓글 날짜가 Sep 23(행사 날짜만 다시 맞춰지고 댓글 날짜는 그대로). 관리 화면(ManageActivityPage) "/ cap no limit" 문구는 다음에.
- 다음 초점: 관리 화면 인원 문구와 행사 댓글 날짜(rollSampleContent 가 댓글도 다시 맞추는지).

## 2026-10-18 23:17 UTC (버클리 일 16:17) · 91회차 · 초점: 남은 사람 목록의 예시 표시

- 고침: 시간표 '공강 겹치는 친구'(TimetablePage), 동아리 회원 목록(OrgPage), 사람 카드(PersonCard — 검색 '사람' 결과가 이걸 씀)에 예시 프로필이면 SAMPLE 표시. PRODUCT_TASTE "예시 프로필은 sample 표시를 단다".
- 검증: `npx tsc -b` 통과, `npm test` 209/209. 스크린샷(v2·classic): 시간표 "SAMPLE Sofia · SAMPLE Jordan", /orgs/o_band 회원 탭 "SAMPLE Jordan · Admin" 확인.
- 못 본 것: 검색 '사람' 결과는 `?q=` 로 검색이 안 걸려 스크린샷 못 찍음. PersonCard 를 고쳤으니 같이 적용될 것.
- 배포 브랜치는 그대로 295a5f2 — lumi-pm 수정은 아직 라이브에 없음.
- 다음 초점: 다른 화면(최근에 안 본 곳) — 행사 상세·참가자 수 표시.

## 2026-10-18 22:20 UTC (버클리 일 15:20) · 90회차 · 초점: 사람 목록의 예시 표시(89회차 이어서)
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- PRODUCT_TASTE “예시 프로필은 sample 표시를 단다” 기준으로, 사람 이름이 나오는데 sample 확인이 없는 화면을 찾음.
- 고침 ①: 활동 상세의 참가자 칩(“Ethan host · Maya”)과 참가자 관리 화면(대기 요청·참가자)에 SAMPLE 표시 (ActivityDetailPage.tsx·ManageActivityPage.tsx).
- 고침 ②: 참가자 관리 맨 위 요약이 “Approve 1 / cap 4 · pending 1” — 버튼 말(Approve)을 상태로 씀 → “Approved 1 / cap 4” / “승인됨 1 / 모집 4” (ManageActivityPage.tsx, en.ts 한 줄).
- 남은 후보(다음): 시간표의 ‘공강 겹치는 친구’, 동아리 회원 목록, 검색 결과.
- 검증: tsc, npm test 209 통과, 로컬 v2·classic·한국어 확인.

## 2026-10-18 21:20 UTC (버클리 일 14:20) · 89회차 · 초점: 프로필 › 친구 목록
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 다시 켬)
- /profile/friends(친구 3명)를 v2·classic 로 봄.
- 고침: 세 명 모두 예시 프로필인데, 홈·같이 타기·채팅과 달리 이 목록에만 ‘SAMPLE’ 표시가 없었다 → 이름 앞에 SampleTag (ProfileListPage.tsx — 팔로워·팔로잉·좋아요 목록도 같은 화면이라 같이 적용).
- 메모: Sofia 는 학과 없이 “UC Berkeley · Undergrad”(데이터).
- 검증: tsc, npm test 209 통과, 로컬 v2·classic 전후 확인.

## 2026-10-18 20:20 UTC (버클리 일 13:20) · 88회차 · 초점: Ask Lumi 추천(recommendFor)이 같은 엔진 변경을 잘 따르는지
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 라이브 스냅샷으로 server/ai-search recommendFor 를 node 에서 직접 돌림(AI 호출 없음). 87회차에 행사에서 research 주제를 뺀 뒤에도 “research talks / research seminars” 질문은 단어 일치(“Mentions “seminars””)로 세미나를 잘 찾음 — 회귀 없음.
- 고침: “research seminars this week” 에 이유 “Mentions “this”” — ‘this·week’ 가 검색어로 들어가 미술 강연 같은 엉뚱한 행사가 섞임. → 질문의 시간·채움말(this·that·today·tonight·tomorrow·week·weekend·month·now·soon·upcoming·next·anything·fun…)을 검색어에서 뺌 (foryou.ts ASK_STOP). 테스트 추가(고치기 전 실패/후 통과). 이제 결과가 전부 세미나.
- 검증: tsc, 서버 타입체크, npm test 209 통과. (Ask 화면은 서버 계산이라 배포 뒤 라이브에서 확인)

## 2026-10-18 19:20 UTC (버클리 일 12:20) · 87회차 · 초점: 86회차 남은 것 — ‘연구’ 로만 맞는 행사
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 남아 있던 “Zonian Archaeology”(주최 Archaeological Research Facility)·“Graduate Research Seminar”(화학과)가 CS 학생에게 “Similar to Vision & Language Lab”. 주제 벡터를 찍어 보니 고고학은 research 하나뿐, 화학은 research+생물·화학.
- 먼저 행사 주최 이름 가중치를 낮춰 봤는데 안 빠져서 되돌림. 고침: 행사는 ‘연구’ 라는 말만으로 맞추지 않고(research 주제를 행사 벡터에서 뺌) 분야(소프트웨어·AI·생물…)로 맞춘다 (foryou.ts itemVecRaw). 86회차 테스트에 두 경우 추가(고치기 전 실패/후 통과).
- 결과(라이브 스냅샷): 고고학·화학 세미나 빠짐, EECS 강연·AI·예술·음악 행사는 남음.
- 검증: tsc, 서버 타입체크, npm test 208 통과. (화면은 86회차와 같은 For you 목록 — 로컬 확인은 node 계산으로 대신)

## 2026-10-18 18:20 UTC (버클리 일 11:20) · 86회차 · 초점: For you 의 “This week” 줄
- 질문 새 답 없음, 배포 브랜치 변화 없음. (컨테이너 재시작 뒤 vite 다시 켬)
- 85회차에 동아리에 붙은 줄 알았던 “This week” 는 실제로는 학과 세미나·행사(라이브 스냅샷을 node 로 돌려 확인). CS 학생 For you 에 식물 면역·미토콘드리아·인구학·고고학 세미나가 이유 “This week” 하나로 들어와 있었다.
- 원인: 연구 주제 단어에 ‘seminar·colloquium’ 이 들어 있어서 모든 학과 세미나가 ‘연구’(이 학생의 가장 큰 관심, Vision & Language Lab)로 맞음 → 이유 줄은 반복 제한으로 숨고 “This week” 만 남음.
- 고침 (foryou.ts): ‘seminar·colloquium’ 을 연구 단어에서 뺌(형식이지 분야가 아님 — 세미나 주제는 제목·주최로 따로 맞는다). 그리고 신호가 있는 사람에게 행사는 주제 이유가 하나도 없으면 For you 에서 뺌(Events 탭엔 그대로). 테스트 추가(고치기 전 실패/후 통과).
- 결과(라이브 데이터): 식물·미토콘드리아·인구학·음악 세미나 빠짐, EECS·AI 정렬·예술 행사는 남음. 메모: “Archaeological Research Facility” 는 주최 이름의 Research 로 아직 남음 — 다음에.
- 검증: tsc, 서버 타입체크, npm test 208 통과, 로컬 v2·classic 확인.

## 2026-10-18 17:20 UTC (버클리 일 10:20) · 85회차 · 초점: For you 이유 줄 전체 점검
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- For you 목록의 ✨ 이유 줄을 항목과 짝지어 전부 봄(라이브 스냅샷을 받아 node 로도 같은 계산).
- 고침: “Berkeley Lab Computing Sciences summer student positions” 의 이유가 “Similar to Alpha Kappa Psi”(경영 동아리). AKP 의 상위 분류 “Academic Student Organizations” 가 research 를 조금(0.4) 주는데, 그게 research 주제의 출처가 됨. → 동아리·저장한 것은 그 주된 주제(가장 강한 주제의 3/4 이상)에서만 이유의 출처가 되고, 점수 계산은 그대로 (foryou.ts interestProfile feed). 테스트 추가(고치기 전 실패/후 통과). 이제 research 이유는 Vision & Language Lab 에서만.
- 그대로 둔 것: Research Experience Pathways·PASAE 의 “Similar to Alpha Kappa Psi” — ‘career’ 주제로 이어진 것이라 말이 됨.
- 검증: tsc, 서버 타입체크, npm test 207 통과, 로컬 v2·classic 확인.

## 2026-10-18 16:20 UTC (버클리 일 09:20) · 84회차 · 초점: Startups·Study abroad 탭
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 꺼져 다시 켬)
- 두 탭 모두 1개씩(SkyDeck Batch 24, Berkeley Study Abroad). 
- 고침 ①: “1 listings” → “1 listing” (BrowseTab.tsx).
- 고침 ②: Study abroad 이유가 “✨ Matches your interest in sports & fitness” — 설명의 “info sessions are running now” 의 running 을 달리기로 읽음. → 운동 규칙의 running 은 뒤에 now·until·for… 가 오면 안 셈 (foryou.ts), 테스트 추가(고치기 전 실패/후 통과). 이제 그 이유 줄 없음.
- 메모: 두 탭이 한 개뿐 — 데이터가 얇음(지어내지 않음). 창업·교환학생 공식 출처를 더 붙일지는 나중 후보.
- 검증: tsc, npm test 206 통과, 로컬 v2·classic 확인.

## 2026-10-18 15:20 UTC (버클리 일 08:20) · 83회차 · 초점: Events·Free food 탭 (+ 82회차 수정 점검)
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- Events(199개)·Free food(7개): 날짜·시간 “Tomorrow · 8 AM”, “Oct 21 · 4 PM” 이상 없음.
- 고침(82회차 내 수정의 부작용): ‘For you’ 에서 “DOE SULI — U.S. Department of Energy Office of Science” 에 “From your department” — 연방 부처 이름의 ‘Science’ 가 Computer Science 와 겹쳐서. → 학과 규칙은 우리 학교 공고(schoolId 같음)에만, 흔한 말(science·studies·engineering·arts)은 비교에서 뺌 (foryou.ts). 테스트에 DOE 경우 추가, 고치기 전 실패/후 통과. 장학금 순서(Goldwater·Caltech SURF·Penn REU)는 그대로.
- 검증: tsc, 서버 타입체크, npm test 206 통과, 로컬 v2·classic 확인.

## 2026-10-18 14:20 UTC (버클리 일 07:20) · 82회차 · 초점: 장학금·연구 탭 ‘For you’ 순서
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 다시 켬)
- Scholarships·Research & RA 를 봄. 마감 D-n 표시 이상 없음.
- 고침: CS 학생의 Scholarships ‘For you’ 1·2위가 “Swan Award … (Psychology)”(심리학과)·“Mellon Mays”(인문학부) — 다른 학과 전용에 가까운 상이 맨 위. → 주최가 “Department of X / Division of X” 이고 내 전공과 겹치는 단어가 없으면 점수 -3(숨기진 않음), 겹치면 +1.5 와 이유 “From your department / 내 학과” (packages/core/src/lib/foryou.ts). 테스트(server/foryou.test.ts) 추가, 고치기 전 실패/후 통과. 이제 1위부터 Goldwater·Caltech SURF·Penn REU·NOAA.
- 검증: tsc, 서버 타입체크, npm test 206 통과, 로컬 v2·classic 전후 확인.

## 2026-10-18 13:20 UTC (버클리 일 06:20) · 81회차 · 초점: 인턴십 분야 필터
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 꺼져 다시 켬)
- 분야별 목록을 훑음. 잘못 분류된 것: “Flight Test Engineer Intern”(Anduril) → Software, “User Research Intern”(Coinbase) → Research & Science, “Software Engineer – Production Infrastructure”(Palantir) → Product & Design(‘Production’ 안의 product), “Campus UI Software Engineer”(Jump) → Product & Design(‘UI’).
- 고침 (packages/core/src/lib/listings.ts FIELD_RULES): 항공·비행(aerospace·flight·propulsion·avionics·spacecraft)은 Hardware, user/UX/design research 는 Product & Design(연구 규칙보다 먼저), Product 는 단어 그대로(“product(s)”)만, ‘UI’ 단독 규칙 뺌. 테스트(server/categories.test.ts) 추가, 고치기 전 실패/후 통과.
- 반영 시점: 분야는 서버가 공고를 모을 때마다(server/sources/external.ts) 새로 계산해 넣으므로 배포 뒤 첫 수집부터 화면에 반영. 로컬(라이브 데이터)에선 아직 옛 분야.
- 검증: tsc, npm test 205 통과.

## 2026-10-18 12:20 UTC (버클리 일 05:20) · 80회차 · 초점: 인턴십 지역 필터
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- Internships ?region=Bay Area / Remote 를 확인. Bay Area(SF·Emeryville·Mountain View·San Mateo)는 맞음, 회사가 겹쳐 보이는 건 서로 다른 직무라 정상.
- 고침: Remote 에 “Perplexity · Berlin · Remote”, “Belgrade · Remote” — 그 나라 원격이라 버클리 학생은 못 하는 자리. → ‘Remote’ 는 원격만 적혀 있거나, 같이 적힌 곳이 미국(지역 규칙·US/USA/United States·“, CA” 같은 주 약자)일 때만 (packages/core/src/lib/listings.ts regionsOf). 테스트 추가(server/categories.test.ts: Berlin·Belgrade·London 은 빠지고 Remote/US·Foster City·New York·Denver, CO·Portland, United States 는 남음, 고치기 전 실패/후 통과). Remote 12 → 10개.
- 검증: tsc, 서버 타입체크, npm test 204 통과, 로컬 v2·classic 확인.

## 2026-10-18 11:20 UTC (버클리 일 04:20) · 79회차 · 초점: 공고 상세(인턴십)
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 꺼져 다시 켬)
- Internships 목록 → Coinbase “User Research Intern” 상세를 v2·classic 로 봄 (저장·지원 버튼은 안 누름). 위치·분야·마감(“Not posted — companies usually close once roles fill”)·공식 출처·확인 날짜 이상 없음.
- 고침: 아무도 저장 안 한 공고에 “0 interested · 0 applied · See who” + 바로 아래 “Nobody has saved this yet…” + 탭 “People 0” — 같은 ‘아무도 없음’을 세 번. 둘 다 0 이면 숫자 줄을 숨김 (OpportunityDetailPage.tsx). 한 명이라도 있으면 그대로.
- 검증: tsc, npm test 203 통과, 로컬 v2·classic 전후 확인.

## 2026-10-18 10:20 UTC (버클리 일 03:20) · 78회차 · 초점: 한국어 글쓰기·피드
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 한국어 /create/post·/community: 문구 이상 없음(사진 칸·#연애 는 기존 질문 건, 예시 글 날짜 “9월 23일”은 배포 대기 중인 c986455 로 해결).
- 고침: 글쓰기 ‘관련 기회’ 드롭다운에 공고·행사 전체 수백 개가 정렬 없이 — 같은 제목(“Gathering” ×4, “Prayer Night” ×2)이 여러 개라 골라도 뭔지 알 수 없음. → ‘참여한 활동’ 칸처럼 내가 저장·표시한 기회만, 하나도 없으면 칸을 숨김 (CreatePostPage.tsx). 데모 계정은 저장한 것이 이미 없어진 예시 장학금뿐이라 칸이 안 보임.
- 검증: tsc, npm test 203 통과, 로컬 v2·classic 확인.

## 2026-10-18 09:20 UTC (버클리 일 02:20) · 77회차 · 초점: 한국어 Discover·Teams·찾기
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 다시 켬)
- 고침: 추천 이유 줄이 한국어로 “✨ Vision & Language L…와 비슷해요”(이름이 20자에서 잘리고 영어 이름에 ‘와’) — 그리고 영어 “Like X, which you're in” 은 가입 안 하고 팔로우·관심만 한 단체에도 붙어 틀린 말이 될 수 있었다(데모 계정은 Vision & Language Lab 을 팔로우만 함). → “Similar to X” / “X 같은 곳”, 저장한 것은 “저장한 “X” 같은 곳” (packages/core/src/lib/foryou.ts).
- 질문 추가: Teams 의 해커톤 3칸에 다른 지역 대면 행사(UC Irvine·USC)가 섞임 → 온라인+베이 지역만 보일지.
- 검증: tsc, npm test 203 통과, 로컬 한국어·영어(v2·classic) 확인.

## 2026-10-18 08:20 UTC (버클리 일 01:20) · 76회차 · 초점: 자정 넘긴 직후 홈·Discover·시간표
- 질문 새 답 없음, 배포 브랜치 변화 없음. 코드 변경 없음.
- 일요일 새벽 1:17 에 홈·Discover·시간표를 봄: 공강 “09:00–21:00”(오늘 남은 시간이라 맞음), Discover 오늘 활동 7:20 AM~6 PM, 시간표 “Sun · No classes today”, 친구 공강 09:00–21:00 — 날짜 넘어간 직후에도 어긋난 곳 없음.
- 그대로 보이는 것(이미 고쳐 둠, 배포 대기): 예시 “Hate eating alone — lunch at Crossroads? · 7:20 AM”(시드 제목은 “grab a bite”), 헬스장 “0% · Quiet”(새벽 1시 — 73~75회차 운영 시간 작업이 배포되면 “Closed · Opens 8 AM”).

## 2026-10-18 07:20 UTC (버클리 일 00:20) · 75회차 · 초점: /gym 화면에 운영 시간
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- /api/gym/now 는 이미 views() 전체를 보내서 open·hours 가 따라옴 → 화면만 (GymPage.tsx 한 파일): 닫힌 시간엔 태그 “Closed”(Quiet 대신), 갱신 줄 앞에 “Today 8 AM–11 PM”(휴관일은 “Closed today”). 운영 시간 출처 없는 CMS 는 그대로.
- 확인: 응답에 open/hours 를 넣은 스텁으로 닫힘·열림 두 경우 v2·classic. 메모: RSF 카드의 ‘Closed’ 태그가 Design 알약에 가림(기존 질문 건).
- 검증: tsc, npm test 203 통과.

## 2026-10-18 06:20 UTC (버클리 토 23:20) · 74회차 · 초점: RSF 운영 시간 붙이기 ②(화면)
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 다시 켬)
- 73회차 서버 작업에 이어: /api/campus/now 의 헬스장 공간에 open·hours 를 싣고(server/campus-live.ts), client 타입(src/lib/campusLive.ts), Discover ‘GYM NOW’ 카드가 닫힌 시간엔 “Closed · Opens 8 AM”(오늘 열 시간이 남았을 때) 또는 “Closed · Closed for today” (LiveCards.tsx). 열려 있을 땐 그대로 “0% · Quiet · 3 min ago”.
- 확인: 라이브 서버는 아직 hours 를 안 보내므로, 스크린샷 스크립트에서 /api/campus/now 응답에 open/hours 를 넣어(닫힘·열림 두 경우) v2·classic 확인. 실제로는 배포 뒤 라이브에서 다시 확인.
- 검증: 서버 타입체크, tsc, npm test 203 통과.

## 2026-10-18 05:20 UTC (버클리 토 22:20) · 73회차 · 초점: RSF 운영 시간 붙이기 ①(서버)
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 72회차에 찾은 공식 출처(events.berkeley.edu LiveWhale JSON, “Building Hours - RSF”)를 서버에 붙임. 화면까지 한 번에 하면 5파일이라 둘로 나눔(README: 작은 수정 1~3파일).
  - server/gym.ts: parseBuildingHours + fetchRsfHours, 6시간 캐시(실패 시 30분 뒤 재시도, 못 받아도 혼잡도는 그대로), views() 가 RSF 공간에 hours·open 을 붙임. 받아 둔 기간 안인데 그날 항목이 없으면 휴관(open=false), 출처 없는 공간(CMS)은 모름(undefined).
  - packages/core/src/lib/gym.ts: GymSpaceView 에 hours·open. alertDue — 문 닫은 시간엔 “지금 한산해요(0%)” 알림을 안 보냄(지금은 사용자가 고른 시간대면 닫힌 시간에도 0% 로 울릴 수 있었다).
  - 테스트(gym.test.ts): JSON 파싱, 토 19:18 닫힘·알림 없음, 일 10:00 열림, 목록 안 빠진 날=휴관, 캐시. 기존 서비스 테스트는 네트워크를 안 타게 hours 를 끔.
- 다음(②): /api/campus/live 응답·client 타입에 open·hours 를 싣고 Discover 카드에 “Closed · opens 8 AM”.
- 검증: 서버 타입체크, tsc, npm test 203 통과. 화면 변화 없음(서버만).

## 2026-10-18 04:20 UTC (버클리 토 21:20) · 72회차 · 초점: (조사만) RSF 운영 시간 출처
- 질문 새 답 없음, 배포 브랜치 변화 없음. 코드 변경 없음.
- 지금 쓰는 Density 데이터(server/sources/density)에는 운영 시간이 없다(time_zone 뿐).
- 찾은 출처: RecWell 의 공식 “RSF Hours” 페이지는 Berkeley 이벤트 캘린더(LiveWhale) 위젯으로 시간을 그린다 → 같은 데이터가 JSON 으로 있음:
  `https://events.berkeley.edu/live/json/events/tag/RSF` — 하루 한 건 “Building Hours - RSF”, `date_iso`(열림)·`date2_iso`(닫힘), 앞으로 20일치. 예: 일 10/18 08:00–23:00, 토 10/24 08:00–18:00. 휴관일(추수감사절·성탄·새해)은 그날 항목이 없는 식으로 보임(확인 필요).
- 확인된 문제: 어제(토) 저녁 7:18 Discover 헬스장 카드 “RSF Weight Rooms 0% · Quiet” — 토요일은 오후 6시 마감이라 실제로는 문 닫은 시간.
- 다음 할 일(작은 작업으로 가능해 보임): 서버가 이 JSON 을 하루 몇 번 받아 캐시 → 카드·/gym 에 “Closed · opens 8 AM” / “Open until 11 PM”. Memorial Stadium Fitness Center 도 같은 방식인지 확인(tag 다를 수 있음).

## 2026-10-18 03:20 UTC (버클리 토 20:20) · 71회차 · 초점: Discover 헬스장·식당 카드 → /gym, /dining
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 꺼져 다시 켬)
- 헬스장 카드 “RSF Weight Rooms 0% · Quiet”(토요일 저녁): 데이터에 운영 시간이 없어 ‘문 닫음’과 ‘한산’을 구분 못 함. 운영 시간을 지어 넣을 수 없어 이번엔 손대지 않음 — 공식 운영 시간 출처를 붙이는 일은 작은 수정이 아님(다음 후보).
- 고침: /dining 코너 이름이 원본 그대로 “CENTER_PLATE”(밑줄) → “CENTER PLATE” (DiningPage.tsx; 제목은 원래 대문자 스타일이라 밑줄만).
- /gym: 이상 없음(실시간 0/150, 1분 전 갱신, ‘usually’ 안내).
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 확인.

## 2026-10-18 02:20 UTC (버클리 토 19:20) · 70회차 · 초점: 저녁 시간대 홈·Discover 시간 표시
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 홈(“free 19:18–21:00”)과 Discover 를 저녁에 비교.
- 고침: Discover ‘Free Right Now’ 얼굴 아래 “4h left / 1h left” 가 아침 7시에도 저녁 7시에도 똑같음 — 끝나는 시각을 모를 때(오늘 수업 없음·수업 끝·직접 설정) whosFree 의 minutes 는 정렬용 자리값(240·300·120·60)인데 그걸 남은 시간처럼 보여 줬다(지어낸 숫자). → 끝나는 시각을 알 때만 “Xh left”, 모르면 표시 안 함 (DiscoverPage.tsx). 처음엔 “Free” 로 바꿔 봤는데 ‘Free Right Now’ 제목 아래 6번 반복이라 뺌.
- 메모: GYM NOW “RSF Weight Rooms 0% · Quiet” — 토요일 저녁이라 문 닫은 시간일 수 있음(실데이터). 다음에 운영 시간 표시 확인.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 확인.

## 2026-10-18 01:20 UTC (버클리 토 18:20) · 69회차 · 초점: 시간표 ‘오늘 공강’ 카드의 지난 시간
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 꺼져 다시 켬)
- 고침: 저녁 6:18 에 시간표 ‘Fits into your free periods today’ 가 “09:00–21:00 · 6 free · 6 nearby” — 지난 아침·낮까지 포함(홈은 “free 18:18–21:00”, 바로 아래 친구 카드는 “18:30–21:00”). → 친구 카드와 같은 ahead() 로 지금부터 남은 시간만 (TimetablePage.tsx). 이제 “18:30–21:00 · 6 free · 4 nearby”(근처 활동 수도 남은 시간 기준으로 줄어듦). 눌렀을 때 여는 시트도 남은 시간 기준.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 확인.

## 2026-10-18 00:20 UTC (버클리 토 17:20) · 68회차 · 초점: 설정 › 계정·안전 / 공개 범위
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- /settings/safety, /settings/privacy 를 v2·classic 로 봄 (설정 바꾸는 버튼은 안 누름).
- 고침: “Blocked users 0” + 바로 아래 “No blocked users.” — 0 이면 숫자는 빼고 문장만 (신고 내역도 같게). 맨 아래 “Host and participant ratings are planned for a future version.” — 학생에게 미완성 앱처럼 읽히는 개발 메모라 뺌 (SafetySettingsPage.tsx).
- 발견(사장님 손 필요 → QUESTIONS.md): 공용 데모 계정 My reports 에 “TEST report filed by Claude to verify the alert e-mail; please dismiss” 가 남아 데모 보는 모든 사람에게 보임. 라이브 DB 라 PM agent 는 못 지움.
- 공개 범위 화면: 이상 없음(Height 는 기존 질문 건).
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 확인.

## 2026-10-17 23:20 UTC (버클리 토 16:20) · 67회차 · 초점: 66회차 메모 두 개
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 꺼져 다시 켬)
- 고침: 지도 맨 위 “📍 UC Berkeley Berkeley” — 학교 이름에 지역 이름이 이미 들어 있으면 지역은 안 붙임 (MapPage.tsx). 이제 “📍 UC Berkeley”. 다른 학교(지역이 이름에 없을 때)는 그대로.
- 확인만: 예시 “Hate eating alone — lunch at Crossroads?” 가 오후 3:30 에 있는 건 이미 고쳐 둔 것 — 시드 제목은 “grab a bite”(점심 아님)이고 예시 시간 굴리기가 제목을 시드로 맞춘다(c986455 계열). 라이브는 배포 전이라 옛 제목.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 확인.

## 2026-10-17 22:20 UTC (버클리 토 15:20) · 66회차 · 초점: 지도(/map)
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- /map(기본 ‘This week’ 목록)을 v2·classic 로 봄.
- 고침: 목록 순서가 뒤죽박죽(오늘 3:30 PM → 6 PM → 내일 4 PM → 수요일 → 다시 오늘 11 AM…) → 날짜·시작 시각 순 (MapPage.tsx). 같이: 이미 끝난 활동(오늘 종료 시각 지남·지난 날짜)은 Today·This week 에서도 빼도록(지금까지는 ‘Now’ 만 뺐다). 지금 목록의 오늘 10 AM·11 AM·2 PM 은 각각 9·5·5 PM 까지라 아직 진행 중 → 남는 게 맞음.
- 메모(작음): 맨 위 “UC Berkeley Berkeley”(학교 이름+도시) 겹침, 예시 “Hate eating alone — lunch at Crossroads?” 가 예시 시간 굴리기로 오후 3:30 에 있음(점심인데). 다음에.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 확인.

## 2026-10-17 21:20 UTC (버클리 토 14:20) · 65회차 · 초점: 프로필 › Propose(활동 제안) 시트
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 다시 켬)
- Maya 프로필에서 Propose 시트를 v2·classic 로 봄 (Send proposal 은 안 누름). 안내(읽음 표시 없음·48시간 뒤 만료)·종류 칩 이상 없음.
- 고침: ‘언제’ 칸 기본값이 “2026-10-17 18:00” — 이 글은 상대에게 그대로 가고, 수락되면 자동 메시지 “Coffee sounds great! See you 2026-10-17 18:00 :)” 에도 들어간다 → “Sat 6 PM” / “토요일 오후 6시” (PersonPage.tsx). ‘Today’ 는 하루 지나면 틀린 말이 돼서 요일로.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 확인.

## 2026-10-17 20:20 UTC (버클리 토 13:20) · 64회차 · 초점: 다른 사람 프로필(Maya, Daniel)
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 끝에 꺼짐 — 다음 실행에서 다시 켬)
- /users/u_jimin, u_dohyun 를 v2·classic 로 봄. 큰 얼굴 사진·나이·하트·Dating 은 사람 탭 질문(키·Dating 추가분)과 같은 건이라 손 안 댐.
- 고침: 공통점 목록에 “Coffee·Startup·Arts & shows in common”, 바로 아래 태그에 “Shared interests Coffee, Startup, Arts & shows, Workout” — 같은 말 두 번(위는 3개만). 태그가 보일 땐 목록에서 관심사 줄을 뺌 (PersonPage.tsx). 수업·목표 줄은 그대로.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 확인.

## 2026-10-17 19:20 UTC (버클리 토 12:20) · 63회차 · 초점: Ask Lumi
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 첫 화면(v2·classic) + 실제 질문 1개 “Anything fun to do this weekend with free food?” (41초). 답은 정직함 — 이번 주말 무료 음식 목록 없음 + “Try asking:” 질문 3개.
- 고침 ①: 답 끝의 “Try asking:” 따옴표 질문들이 그냥 글자라 눌러지지 않았다 → 따옴표로만 된 줄머리는 누르면 그 질문을 바로 보내는 버튼으로 (AskPage.tsx RichText). 확인은 AI 를 다시 부르지 않고 ask 응답을 같은 글로 바꿔 넣어서(스텁) — 눌러서 두 번째 질문이 가는 것까지 v2·classic.
- 고침 ②: 시작 질문 “Internships near Berkeley for a sophomore” 가 모든 학교·학년에 고정 → “Internships open to undergrads” / “학부생이 지원할 수 있는 인턴십”.
- 검증: tsc, npm test 202 통과.

## 2026-10-17 18:20 UTC (버클리 토 11:20) · 62회차 · 초점: 시간표 › 수업 시트(CS 186)
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 꺼져 다시 켬)
- 시간표에서 CS 186 을 눌러 수업 시트(같이 듣는 사람·수업 끝나고 비는 사람·스터디 그룹)를 v2·classic 로 봄. 내용·사생활 안내 이상 없음.
- 고침 ①: 시간표 화면 제목이 영어로 소문자 “timetable” — 번역 사전 ‘시간표’ 한 줄 → “Timetable” (en.ts; 프로필 완성 체크리스트 항목도 같이 대문자로).
- 고침 ②: 수업 시트 맨 위 “CS 186 Databases” 제목 바로 아래에 큰 “CS 186 / Databases” 가 또 나옴 → 시트 제목은 비우고 닫기 X 만 (TimetablePage.tsx).
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 확인.

## 2026-10-17 17:20 UTC (버클리 토 10:20) · 61회차 · 초점: 단체 페이지 커버
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 고침: 단체 페이지 커버가 로고 이미지를 가로로 늘려 써서, 디렉터리 동아리(대부분 작은 UC 문장 로고)는 흐릿하게 깨져 보였다. → 커버는 갤러리 첫 사진, 없으면 색 띠만 (OrgPage.tsx). 로고는 아래 동그란 자리에 그대로.
- 확인: Likelion at Berkeley(갤러리 없음) → 깨끗한 색 띠, Vision & Language Lab(갤러리 있음) → 사진 커버. v2·classic 둘 다.
- 검증: tsc, npm test 202 통과.

## 2026-10-17 16:20 UTC (버클리 토 09:20) · 60회차 · 초점: 동아리 목록·단체 페이지
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 꺼져 다시 켬)
- Campus › Clubs(1,562개), Mine, Likelion at Berkeley 페이지를 v2·classic 로 봄 (Follow·Ask to join 은 안 누름).
- 고침: 프로필 ‘My groups’ 줄은 0 인데 누르면 열리는 Clubs › Mine 에는 2개(팔로우한 Cal Indie Collective·Vision & Language Lab). 프로필은 가입·운영만, Mine 은 팔로우까지 셌다 → 프로필도 Mine 과 같은 기준으로 (ProfilePage.tsx). 한국어 이름도 ‘가입한 단체’ → ‘내 단체’(팔로우 포함이라) (en.ts 키 한 줄).
- 메모(작음, 다음에): 사진 없는 동아리 페이지 커버가 UC 문장(seal) 작은 이미지를 크게 늘려 흐릿하게 보임.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic·한국어 확인(My groups 2 / 내 단체 2개).

## 2026-10-17 15:20 UTC (버클리 토 08:20) · 59회차 · 초점: 같이 타기 상세·올리기
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 상세(Maya → OAK, Daniel → Costco)와 /rides/new 를 v2·classic 로 봄 (Join·Post ride 는 안 누름).
- 고침: 상세 위쪽 “Leave Tue Nov 24 · 6–6:30pm” 과 아래 ‘Leaving’ 줄 “Tue Nov 24 · 6pm–6:30pm” 이 같은 시간을 다르게 씀 → 아래도 같은 whenLabel 로 (RideDetailPage.tsx, 안 쓰게 된 import 2개 정리).
- 이상 없음: 올리기 화면 날짜(한 줄)·시간(두 칸) 잘림 없음, 안전 안내·가격 안내 문구.
- 메모: Design 알약이 상세 제목(“Maya → OAK”)도 가림 — 기존 질문과 같은 건.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 확인.

## 2026-10-17 14:20 UTC (버클리 토 07:20) · 58회차 · 초점: Rides 목록·내 같이 타기
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 꺼져 다시 켬)
- /rides, /rides?mine=1 을 v2·classic 로 봄. 목록·날짜 묶음·가격 이상 없음.
- 고침: My rides 에 지난·취소된 것이 있는데 위에 “No rides yet” — 앞뒤가 안 맞음 → 지난 것이 있으면 “No upcoming rides” (RidesPage.tsx).
- 발견(질문에 추가): Design 알약이 Rides 상단의 **My rides** 탭을 덮어 누를 수 없음 → 기존 Design 알약 질문에 덧붙임.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 확인.

## 2026-10-17 13:20 UTC (버클리 토 06:20) · 57회차 · 초점: 글쓰기·Plan Together 만들기
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- /create/post: 이상 없음(관련 기회는 기본 드롭다운이라 목록이 길어도 화면은 안 길어짐). 사진 칸·#Dating 은 이미 질문함.
- 고침: /together/new 에서 친구를 아직 안 골랐을 때 “Suggested from 1 timetables” + 시간마다 “Free overlap” — 복수형이 틀리고, 내 시간표 하나뿐이라 ‘겹침’도 아님. → 1개일 땐 “Free in your timetable”(‘내 시간표의 공강’), 겹침 표시는 2개 이상일 때만 (CreateTogetherPage.tsx). 친구를 고르면 “Suggested from 2 timetables · Free overlap” 그대로.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 확인.

## 2026-10-17 12:20 UTC (버클리 토 05:20) · 56회차 · 초점: 활동 만들기(+) 화면
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 꺼져 다시 켬)
- /create/activity 를 v2·classic 로 봄 (만들기 버튼은 안 누름 — 라이브 DB).
- 고침: 날짜·시작·끝 세 칸이 한 줄이라 날짜가 “10/17/2(” 로 잘리고, 시간의 AM/PM 이 가려져 기본값 오후 6시가 “06:00” 로 보였다(오전 6시로 읽힘). → 날짜는 한 줄, 시작·끝은 두 칸 (CreateActivityPage.tsx, 시간표 수정 6dc8201 과 같은 방식). 이제 “10/17/2026”, “06:00 PM · 07:30 PM”.
- 다른 화면에 같은 세 칸 날짜·시간 배치 없음 확인.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 스크린샷.

## 2026-10-17 11:20 UTC (버클리 토 04:20) · 55회차 · 초점: 54회차 남은 것 — 예시 알림이 거짓말하는 두 곳
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 원인 ①: 예시 알림 3개(“2 join requests — Hannah and Lily…”, “Hannah commented…”, “Lily and Hannah liked your post”)에 나오는 Hannah 는 다른 학교(UC Merced) 예시 프로필이라 버클리 데모 계정에선 숨겨진다 → 알림 말과 눌러서 보이는 화면이 다르다(대기 1명, 댓글 0개, 좋아요 1개).
  고침: 데모 계정에게 보낼 때, 숨긴 예시 프로필 이름이 들어간 예시 알림은 뺀다 (server/samples.ts namesHidden). 실제 계정 알림은 건드리지 않음(실제 사람 이름이 겹칠 수 있어서).
- 원인 ②: 예시 1:1 제안(Lily → 알고리즘 스터디)이 시드 후 47시간에 만료 → “New proposal” 알림을 누르면 Requests 가 빔.
  고침: 다른 예시 글·대화처럼 시간을 다시 맞춘다 — 만료된 예시 제안만 다시 ‘기다림’으로, 방문자가 이미 답한 것은 그대로 (server/demo.ts rollSampleContent).
- 테스트 2개 추가(samples.test.ts), 고치기 전 실패/후 통과. 서버 타입체크, npm test 202 통과. 서버 쪽이라 배포 뒤 라이브 알림 화면에서 확인.

## 2026-10-17 10:20 UTC (버클리 토 03:20) · 54회차 · 초점: 알림 화면 — 눌렀을 때 가는 곳
- 질문 새 답 없음, 배포 브랜치 변화 없음. (컨테이너 재시작으로 로컬 vite 다시 켬)
- 예시 계정 알림 9개를 v2·classic 로 보고 하나씩 눌러 봄.
- 발견·고침: “Deadline in 4 days”(Cal Alumni Leadership Scholarship)·“People to team up with”(AI Campus Hackathon) 두 알림이 눌러 보면 “Opportunity not found” — 라이브 데이터에 그 공고가 없다(예시로 지어낸 공고라 없는 게 맞음). → 서버가 알림을 내려줄 때 가리키는 공고(/opportunities/:id)가 없으면 뺀다 (server/view.ts goneOpportunity + view.test.ts, 고치기 전 실패/후 통과). 실제 사용자의 마감·삭제된 공고 알림도 같이 정리됨. 배포 뒤 반영.
- 남은 것: “New proposal — Lily proposed an algorithms study session.” 을 누르면 Requests 가 비어 있음(예시 제안이 시드 후 47시간에 만료). “2 join requests (Hannah and Lily)” 는 관리 화면에 대기 1명(Lily). 둘 다 예시 데이터 시간 문제 — 다음에 rollSampleContent 로 같이 맞출지 본다.
- 검증: 서버 타입체크, tsc, npm test 200 통과.

## 2026-10-17 09:20 UTC (버클리 토 02:20) · 53회차 · 초점: 채팅 목록·1:1 대화방
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- DM 목록(Direct·Groups·Requests)과 Sofia 대화방을 v2·classic 로 봄. 예시 대화 날짜 “Sep 23”은 c986455(예시 대화 시간 다시 맞추기) 배포 전이라 그대로 — 배포 뒤 확인.
- 고침: Requests 탭에 받은 게 없으면 “Proposals received 0 / No proposals yet.” + “Friend requests 0 / No friend requests.” 빈 상자 두 개가 위를 차지 → 받은 게 없으면 “No requests waiting for you.” 한 줄, 있는 쪽만 제목+개수로 (ChatInboxPage.tsx, en.ts 한 줄).
- 질문 추가: Design 비교 알약이 채팅방 날짜 줄·검색창을 가림 → 없애기/설정으로 옮기기 중 정해 달라고 QUESTIONS.md.
- 검증: tsc, npm test 199 통과, 로컬 v2·classic 전후 스크린샷.

## 2026-10-17 08:20 UTC (버클리 토 01:20) · 52회차 · 초점: 처음 온 사람 — Welcome → 가입 단계
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 로그아웃 상태 Welcome·가입 1~8단계를 v2·classic 로 찍어 봄 (9단계 학교 메일 인증은 실제 메일이 가서 안 들어감).
- 고침: 가입 단계마다 ‘Design: Classic ⇄ New’ 알약이 제목 끝을 가림 (예: 8/9 “Almost done — what” 의 what). 알약 자리가 상단 바 바로 아래 오른쪽(top 62px)인데 가입 화면은 거기가 제목. → /start 에서만 오른쪽이 빈 상단 바(← 8/9) 안으로 (DesignToggle.tsx). 다른 화면은 그대로.
- 확인만: 이름 입력·출생 연도 넣으면 Next 켜짐 정상. Welcome 카드·문구 이상 없음.
- 검증: tsc, npm test 199 통과, 로컬 v2·classic 전후 스크린샷.

## 2026-10-17 07:20 UTC (버클리 토 00:20) · 51회차 · 초점: 한국어 화면 전체
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 언어를 한국어로 두고(localStorage aroundu.lang=ko) 사람·발견·활동·캠퍼스·약속·시간표·프로필·설정을 v2·classic 로 찍어 봄.
- 고침 ①: 발견 ‘지금 시간 되는 사람’ 남은 시간이 “4h 남음” → “4시간 남음”/“30분 남음” (DiscoverPage.tsx). 영어는 그대로 “4h left”.
- 고침 ②: 약속 화면 제목 “My Plans”·“+ Plan Together”, 프로필 메뉴 “My Plans” 가 한국어에서도 영어 → “내 약속”·“+ 시간 정하기” (PlansPage.tsx, ProfilePage.tsx; 시간 정하기 화면 제목과 같은 말). 영어는 그대로.
- 일부러 둔 것: Rides·Seat alerts·Key dates·Dining/Gym Now 는 버클리(미국) 실데이터 기능이라 화면 전체가 영어 — 입구 문구만 한국어로 바꾸면 들어가서 영어라 더 어색. 한국어 사용자가 늘면 기능 단위로 번역.
- 검증: tsc, npm test 199 통과, 로컬 한국어 v2·classic 전후 확인.

## 2026-10-17 06:20 UTC (버클리 금 23:20) · 50회차 · 초점: 영어 번역 — 버튼·라벨 뜻 뒤집힘
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 버튼·라벨로 쓰이는 번역 160여 개를 다 뽑아 봄(‘참여’→‘Joined’ 같은 것 찾기). 이상한 것 없음: ‘마감’→Full 은 정원 찬 모임 버튼에만, ‘좋아요’→Sounds good 은 제안 수락, ‘학교 이메일 인증하기 (데모…)’는 예시 계정에만. 이번엔 고칠 것 없음.

## 2026-10-17 05:20 UTC (버클리 금 22:20) · 49회차 · 초점: 활동 상세 → Discover 버튼
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 발견·고침 ①: Discover(Activities·Now·Teams)·수업 화면의 활동 줄 버튼이 영어로 전부 “Joined” — 안 들어간 활동인데도. 버튼 이름 t('참여')의 영어 번역이 ‘Joined’ 였다(상세 화면은 “Join now”). → ‘Join’ (i18n/en.ts, t('참여')는 이 버튼에만 쓰임). 로컬 확인: Activities 버튼 Join 5 · Invite only 1.
- 발견·고침 ②: 예시 모임 상세의 댓글이 “Sep 23” — 예시 글·알림처럼 시드의 ‘몇 시간 전’으로 다시 맞춤 (server/demo.ts rollSampleActivities + 테스트, 고치기 전 실패/후 통과). 배포 뒤 반영.
- 검증: tsc(앱·서버), npm test 199, 로컬(라이브 API) v2·classic.

## 2026-10-17 04:20 UTC (버클리 금 21:20) · 48회차 · 초점: 표시(Tag) 대비
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 고침 (Chip.tsx Tag): classic 의 accent 표시가 연한 하늘색 글자(#A3D5FF) on 연한 하늘색 바탕(#BFF4FF) — ‘Vote’, ‘Fall recruiting’, ‘모집 중’, ‘초대’, 활동 카드 배지가 거의 안 보였다 → classic 은 남색 글자, v2 는 그대로 핑크. 한 곳(공용 Tag)이라 모든 화면에 같이 적용.
- 검증: tsc, npm test 198, 로컬(라이브 API) v2·classic — My Plans·Teams 전/후.

## 2026-10-17 03:20 UTC (버클리 금 20:20) · 47회차 · 초점: My Plans
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 고침 (PlansPage.tsx): 6칸 중 5칸이 “0 · No invites.”, “No requests waiting for approval.”, “No events marked yet.” 등 빈 칸 채움 문구 — 비어 있는 칸은 숨기고, ‘확정된 약속’만 비어도 남겨 다음 할 일(발견 탭) 안내. 지금 데모 계정은 “시간 정하는 중 1 · 확정된 약속 1”만 보인다.
- 메모: classic 에서 ‘Vote’ 표시가 흰 바탕에 연한 하늘색이라 잘 안 보인다(Tag accent) — 다른 화면 표시와 같이 볼 것.
- 검증: tsc, npm test 198, 로컬(라이브 API) v2·classic 전/후.

## 2026-10-17 02:20 UTC (버클리 금 19:20) · 46회차 · 초점: Rides 공유 링크 (/r/…, 로그인 전)
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 행선지·시각·남은 자리·올린 사람 이름만, 탈 곳·같이 타는 사람·요금은 로그인 뒤 — 안내·예시 표시·안전 문구 v2·classic 정상. 이번엔 이상 없음.
- 메모: 예시 같이 타기도 링크로는 열린다(링크를 알아야만) — 그대로.

## 2026-10-17 01:20 UTC (버클리 금 18:20) · 45회차 · 초점: 수업 링크 공개 페이지 (/c/berkeley/cs186, 로그인 전)
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 고침 (ClassRoomPage.tsx): 수업 단톡방에 링크를 받은 학생이 처음 보는 화면에 큰 “0 · CS 186 students already on Lumi” — 빈 앱으로 읽힘 → 0명이면 숫자 대신 “The CS 186 class room”(한국어 “CS 186 수업 방”), 1명 이상이면 숫자 그대로. 같은 학교·아직 안 듣는 사람 화면도 같게.
- 메모: 수업 시간 “9:30am–10:59am”(학교 자료의 10:59 그대로).
- 검증: tsc, npm test 198, 로컬(라이브 API) v2·classic 전/후.

## 2026-10-17 00:20 UTC (버클리 금 17:20) · 44회차 · 초점: 동아리 상세 (SESE)
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 고침 (OrgPage.tsx): CalLink 에서 온 동아리 대부분은 사진·정기 활동·공지가 없는데 빈 카드 “Photos & videos”, “Regular activities”와 “Announcements — No announcements.”(빈 칸 채움 문구)가 그대로 → 내용이 있을 때만 보임. 내용 있는 동아리(Cal Indie Collective)는 그대로 셋 다 보임.
- 메모: 아무도 Lumi 에 없는 디렉터리 동아리에 “Ask to join” 버튼 — 눌러도 승인할 사람이 없다. “Unverified” 배지도 학생 눈엔 의심스러워 보일 수 있다. 크기 보고 다음에.
- 검증: tsc, npm test 198, 로컬(라이브 API) v2·classic.

## 2026-10-16 23:20 UTC (버클리 금 16:20) · 43회차 · 초점: Feed 글쓰기
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 물어봄(QUESTIONS 맨 위): 사진 칸 + 가 샘플 사진을 붙임 — 실제 학생 글에 남의 사진. 추천 A(웹에선 사진 칸 숨기기).
- 라이브 그대로(배포 대기): 종류 칩 “❓ Prompt”(d5dffaa 에서 “Question”).
- 메모: ‘관련 기회’ 선택이 공고 수천 개를 한 목록에(select) — 쓰기 어렵다. 주제 칩에 #Dating — People 1번 남은 부분과 같은 갈래.
- 검증: 화면만(코드 변경 없음).

## 2026-10-16 22:20 UTC (버클리 금 15:20) · 42회차 · 초점: People 첫 화면 (새 카드, 로컬)
- 질문 새 답 없음, 배포 브랜치 변화 없음(1+3 카드는 아직 라이브에 없음 — 로컬에서 봄).
- 고침 (HomePage.tsx): 오후 3시에 Jordan 카드의 계획이 “Club recruiting tables · Today 11 AM” — 11시~5시 진행 중인데 지난 것처럼 보임 → 시작한 계획은 “Now · until 5 PM”(한국어 “지금 · 오후 5시까지”).
- 확인: Maya 카드 “Today 6 PM · Caffe Strada · 2 spots left” + “In your class: UGBA 105” + “I'm in” — v2·classic 정상. 제목 “… at 6 today?” 는 seed 수정(de6a3af) 배포 뒤 바뀜.
- 검증: tsc, npm test 198, 로컬(라이브 API) v2·classic.

## 2026-10-16 21:20 UTC (버클리 금 14:20) · 41회차 · 초점: 데이터 신선도
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- CSV 전부: 마감 지난 열린 줄 없음, 마감 없이 날짜만 지난 줄도 없음. 이번 주 마감은 NSF GRFP(10/19, 대학원) 하나.
- 라이브: 인턴(D-16~)·연구(D-14~)·무료 음식 6개(10/21~10/29) — 지난 것 없음. 이번엔 이상 없음.
- 라이브 그대로(배포 대기): 행사 시각 “16:00” 꼴(186656d), Technica 두 줄(6b46658).

## 2026-10-16 20:20 UTC (버클리 금 13:20) · 40회차 · 초점: Rides(같이 타기)
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 목록: 5개(Costco·Trader Joe's·OAK·SFO 2) 모두 예시 표시, 추수감사절 띠, 안전 안내 — v2·classic 이상 없음.
- 고침 (RideBits.tsx): Discover 의 Rides 줄이 “5 open · airports, Trader Joe's, Costco, SF, Tahoe” 고정 문구라 없는 행선지(SF·Tahoe)도 열려 있는 것처럼 보였다 → 열린 차가 실제로 가는 곳 “5 open · Costco Richmond, Trader Joe's, OAK…”. 열린 차가 없을 때만 예시 행선지.
- 메모: Rides 안의 시각은 “11am” 꼴(자체 clock) — 다른 화면 “11 AM”과 다르지만 이 화면 안에서는 일관.
- 검증: tsc, npm test 198, 로컬(라이브 API) v2·classic.

## 2026-10-16 19:20 UTC (버클리 금 12:20) · 39회차 · 초점: Ask Lumi (한국어 4개)
- 질문 새 답 없음, 배포 브랜치 변화 없음. 속도 36~40초 그대로.
- 잘 됨: 이번 주말 해커톤 5개(날짜·장소·마감), 체육관 지금 RSF 54%·CMS 0%(5분 전), 오늘 저녁 밥 → 실제 없음 + 예시 하나.
- 고침 (server/ai.ts): 한국어 답이 질문마다 존댓말(“없어요”)·반말(“있어 — 아직 실제 모임은 없고…”)로 섞임 → 지시문에 “한국어는 항상 해요체”. 배포 뒤 확인.
- 메모: 예시를 ‘샘플’이라 부르기도 함(지시는 ‘예시’) — 같은 지시문에 이미 있음, 배포 뒤 같이 확인. 답 카드 “19:00”은 0db498b(11:30 AM 꼴) 배포 대기.
- 검증: tsc(서버), npm test 198.

## 2026-10-16 18:20 UTC (버클리 금 11:20) · 38회차 · 초점: 프로필 편집
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 고침: ‘지금 하고 싶은 활동’ 안내가 “Shown on your card on Home”(‘홈’ 탭은 없다) → “Shown on your card in People” / “사람 탭 카드에 표시돼요” (EditProfilePage.tsx, i18n/en.ts).
- 물어봄: 키(Height) 칸·Here for 의 Dating — People 질문(1번)에 추가로 적음(1+3 외에 남은 부분).
- 검증: tsc, npm test 198, 로컬(라이브 API) v2·classic.

## 2026-10-16 17:20 UTC (버클리 금 10:20) · 37회차 · 초점: 활동 만들기
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 고침 (CreateActivityPage.tsx): 미리보기가 한국어 어순 그대로 “Today 18:00 Doe Library at …” → “Today 6 PM · Doe Library · 제목”(한국어는 “오늘 오후 6시 Doe Library에서 …”). 대표 이미지 아래 “In this demo the cover is a color plus an emoji.” — 실제 서버에서는 숨김.
- 메모: 음성 답 아래 “데모에서는 실제 음성 대신 녹음 길이만 저장돼요” 같은 데모 안내가 프로필 편집 쪽에도 있다 — 실제 동작이 그런지 확인 못 해 그대로.
- 검증: tsc, npm test 198, 로컬(라이브 API) v2·classic 전/후.

## 2026-10-16 16:20 UTC (버클리 금 09:20) · 36회차 · 초점: 설정
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 고침 (SettingsPage.tsx): 라이브 설정 맨 아래에 “Demo tools — Preview error state / Reset demo data”와 “Lumi MVP · mock API (localStorage)”가 보였다. 라이브는 실제 서버라 초기화는 서버에서 막혀 있고(ALLOW_RESET) 누르면 오류만 난다 → 실제 서버 모드에서는 데모 도구를 숨기고 아래 글씨는 “Lumi”. (라이브에서 버튼은 누르지 않음.)
- 메모: “Switching language also switches the demo campus and sample data.” 도 데모용 문구 — 실제 계정에서도 맞는지 확인 못 함, 그대로.
- 검증: tsc, npm test 198, 로컬(라이브 API) v2·classic 전/후.

## 2026-10-16 15:20 UTC (버클리 금 08:20) · 35회차 · 초점: 알림
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 발견: 알림 9개가 전부 Sep 21~23 — “Deadline in 4 days”(장학금)도 3주 전. 예시 글·대화와 같은 문제(5번 답 A 와 같은 갈래).
- 고침 (server/demo.ts): 예시 글·대화 시각 맞추기(c986455)에 데모 계정의 예시 알림도 넣음 — 시드에 적힌 ‘몇 분/시간 전’으로. 읽음 표시는 그대로. 푸시는 데모·예시 계정이 막혀 있어 나가지 않음(server/push.ts). 테스트 추가(고치기 전 실패/후 통과). 배포 뒤 반영.
- 메모: 알림·대화에 나오는 “Hannah”는 화면의 예시 사람 목록에 없다(UC Merced 로 옮긴 예시 사용자) — 사소.
- 검증: tsc(앱·서버), npm test 198.

## 2026-10-16 14:20 UTC (버클리 금 07:20) · 34회차 · 초점: Discover › Now
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 학식 지금(Café 3·Clark Kerr +3, 아침), 체육관 39%, 지금 공강 친구 6, 즉석 모임 6 — v2·classic 이상 없음.
- 고침 (seed.en.ts): 예시 모임은 지난 시간이면 곧 시작하도록 시각이 굴러가는데 제목에 시각이 박혀 어긋남 — “Walk across the Glade right now”(오후 3:30), “7pm run (5k)”, “Coffee on Southside at 6” → 시각 없는 제목. 다음 롤 때 라이브 반영(배포 후). 라이브에는 아직 “lunch at Crossroads?” 오전 7:20 도 그대로(10회차 수정 배포 대기).
- 메모: 아침 7시대에 “Free 09:00–11:00” — 공강 계산이 9시부터라 그 전은 안 셈.
- 검증: tsc, npm test 198.

## 2026-10-16 13:25 UTC (버클리 금 06:25) · 33회차 · 초점: Campus › Browse › 동아리
- 질문 새 답 없음, 배포 브랜치 변화 없음(라이브 동아리 줄은 아직 “Clubs · Academic Student Organizations · Our mission is…” — 소개 먼저 수정은 배포 대기).
- 1562곳, 이유 줄 같은 말 최대 2번(기준 지킴), v2·classic 이상 없음.
- 고침 (BrowseTab.tsx): 소개가 사명문 꼴 “To provide full stack…” 로 시작 → “Provide full stack…”.
- 메모: “UnifIBD(염증성 장질환) — Like Vision & Language Lab” 같은 약한 이유는 그대로(지난 메모).
- 검증: tsc, npm test 198, 로컬(라이브 API) v2·classic.

## 2026-10-16 12:25 UTC (버클리 금 05:25) · 32회차 · 초점: 수업 페이지 (CS 186)
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 같은 수업 2명(나 포함)·수업 끝나고 공강 1명·스터디 그룹 1(예시 표시)·프로젝트 파트너 — 정상.
- 고침 (ClassRoom.tsx): 한 화면에 “Mon/Wed 10 AM”(위)과 “Mon/Wed 11am”, “Tomorrow 11:30am”(아래)이 섞임 → 아래도 “11 AM”, “11:30 AM”(앱 공통 formatTime).
- 메모: 수업 링크로 들어오는 공개 페이지·스터디 그룹 알림의 시간대 표기(“10am–11am”)는 범위라 그대로.
- 검증: tsc, npm test 198, 로컬(라이브 API) v2·classic 전/후.

## 2026-10-16 11:20 UTC (버클리 금 04:20) · 31회차 · 초점: 프로필 (내 프로필·다른 사람 프로필)
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 고침 (ProfilePage.tsx): 내 시간표 카드의 배지가 “free · 11:00” — 무엇이 11시인지 모름 → “Free until 11:00”(시간표 화면과 같은 말). 길어진 배지에 v2 에서 제목이 두 줄로 밀려 제목을 “Schedule”, 배지는 한 줄 고정.
- 라이브에 그대로: 다른 사람 프로필 아래 버튼줄이 화면 밖으로(“Messag…” 잘림) — 이미 고쳐 둔 것(PersonPage flex-wrap)이 배포 대기, 로컬에선 두 줄로 정상.
- 메모: 프로필의 좁은 시간표 칸에서 과목명이 “Databas/es”, “Speaki” 처럼 끊긴다(칸 너비) — 시간표 메모와 같은 문제.
- 검증: tsc, npm test 198, 로컬(라이브 API) v2·classic 전/후.

## 2026-10-16 10:20 UTC (버클리 금 03:20) · 30회차 · 초점: 공고 상세 화면 (장학금·행사)
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 고침: 상세 위쪽 마감 표시가 “D-10 · Tue, Oct 27 Full” — 마감은 10/26 오후 8:59 PT 인데 UTC 날짜(27일)를 썼고, ‘마감’이 영어로 ‘Full’(정원 찬 모임용 번역)로 나왔다 → “D-10 · due Mon, Oct 26” (OpportunityDetailPage.tsx). 마감 지난 D-day 도 영어로 ‘Full’ → ‘Closed’ (recommend.ts dday + 테스트, 고치기 전 실패/후 통과).
- 행사 상세(Book Launch, 오늘 11 AM, International House) 정상.
- 메모: 상세의 빈 칸 문구 “Nobody has saved this yet…”, “No one has said they’re going yet.”, “None yet. Open a prep room…” — PRODUCT_TASTE 의 ‘빈 칸 채움 문구’에 가깝다. 버튼 설명 역할도 해서 이번엔 그대로.
- 검증: tsc(앱·서버), npm test 198, 로컬(라이브 API) v2·classic 전/후.

## 2026-10-16 09:20 UTC (버클리 금 02:20) · 29회차 · 초점: Discover › Activities
- 질문 새 답 없음, 배포 브랜치 변화 없음(“Ca”/“Ha” 동그라미 등 lumi-pm 수정은 아직 라이브에 없음).
- Today 27 · Tomorrow 11 · This week 92 · Coming up 154 — 지난 시각 없음, 예시 표시 정상, v2·classic 이상 없음. 이번엔 고칠 것 없음.
- 메모: 공강 표시만 24시간제(“Free 09:00–11:00”, 카드 “Free 17:45–21:00”), 다른 시각은 “10 AM”. 시간표 화면(격자 9…19, 수업 13:00–13:59)이 통째로 24시간제라 공강만 바꾸면 거기서 섞인다 — fmtBlock 한 곳(웹·앱 공통)이라 바꾸기는 쉽다. 시간표까지 AM/PM 으로 갈지 정해지면 한 번에.

## 2026-10-16 08:20 UTC (버클리 금 01:20) · 28회차 · 초점: 첫 화면 → 온보딩
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 로컬(새 첫 화면 “Who’s free on campus right now?” 포함)에서 1~8단계를 v2·classic 으로 끝까지 — 학교·목표·공강 오후·금요일 밤·만나고 싶은 사람·전공·미리보기·이름. 글자 잘림·대비·번역 문제 없음. 이번엔 이상 없음.
- 도구: 온보딩 걷기 스크립트가 9단계(학교 이메일)에서 실제 주소로 인증 코드를 보내지 않도록 그 앞에서 멈추게 함.
- 메모(이미 질문 4번 B로 보류): 단계 수 9개 그대로.

## 2026-10-16 07:20 UTC (버클리 금 00:20) · 27회차 · 초점: Ask Lumi (영어 질문 5개)
- 질문 새 답 없음, 배포 브랜치 변화 없음. 속도 37~39초 그대로(AI_MODEL 아직).
- 잘 됨: 사진 동아리 5곳, 밤 12시 학식 → “지금 연 곳 없음, 아침 7시부터”(맞음), 테니스 → 없다고 하고 올려 보라고, 수강 변경 마감 → 9/16 지남(학사 일정).
- 고침: 영어 답에 “예시/sample listing” 처럼 한국어가 섞임 — 지시문이 두 말을 같이 줘서 → 영어 답은 sample, 한국어 답은 예시만 (server/ai.ts, 배포 뒤 확인). 답 카드 시각 “11:30” → “11:30 AM” (AiCards.tsx, 로컬 확인).
- 메모: 모든 답 밑에 같은 안내(“Answers come only from Lumi’s listings…”)가 입력창 아래에도 이미 있어 두 번 — 사소.
- 검증: tsc(앱·서버), npm test 197, 로컬(라이브 API) v2 전/후, 라이브 classic.

## 2026-10-16 06:20 UTC (버클리 목 23:20) · 26회차 · 초점: 데이터 신선도
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- CSV 전부: 마감 지난 열린 줄 없음. 이번 주 마감은 NSF GRFP(10/19, 대학원). 라이브 장학금·해커톤(마감순)·행사 — 지난 것 없음.
- 라이브에 그대로: 해커톤에 “Technica 2026” 두 줄(직접 넣은 것 + Devpost) — 6b46658(Devpost 제목 겹침 빼기)이 배포되면 하나로.
- 고침 (BrowseTab.tsx): 행사 목록 시각만 “Tomorrow · 10:00”(24시간) — 다른 화면처럼 “10 AM”. 자정(00:00)은 시각 없는 행사라 안 붙임.
- 검증: tsc, npm test 197, 로컬(라이브 API) v2·classic.

## 2026-10-16 05:20 UTC (버클리 목 22:20) · 25회차 · 초점: 시간표 (친구 공강·범례)
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 친구 공강 칸: 밤 10시라 “오늘 겹치는 공강 없음” — 맞다 (17:35 에는 3명 17:45–21:00 로 정상).
- 고침 (TimetablePage.tsx): 시간표 아래 범례의 ‘Class/Activity’ 글자가 색 표시 아래로 떨어지고 표시가 “(” 처럼 반쪽 → 표시와 글자를 한 줄로, 설명은 다음 줄, 표시는 꽉 찬 네모(수업)·점선 네모(활동).
- 메모: v2 글꼴에서 좁은 칸의 과목명이 “Operatin / g Systems” 로 끊긴다 — 칸 너비 문제라 그대로.
- 검증: tsc, npm test 197, 로컬(라이브 API) v2·classic 전/후.

## 2026-10-16 04:50 UTC (버클리 목 21:50) · 사장님 답: People 1 + 3
- 고침 (HomePage.tsx): 카드에 그 사람이 이미 열어 둔 계획(제목 · “Tomorrow 6 PM · Caffe Strada · 2 spots left”) + 가운데 큰 버튼 “I’m in / 나도 갈래”(초대가 아니라 열린 자리에 끼기, 승인제면 신청 창). 계획 없는 사람은 지금처럼 손 버튼. 공통점 한 줄(“In your class: UGBA 105”, 겹치는 공강, 같은 생활권 — 관심사는 칩에 이미 있어 뺌). 계획 있는 사람이 먼저.
- 정원 없는 모임(999)은 남은 자리를 안 씀. 예시 모임 제목 “Coffee on Southside at 6 today?” → “… at 6” (날짜가 굴러 내일이 되면 ‘today’ 가 틀린다, seed.en.ts — 다음 롤 때 라이브 반영).
- 라이브 DB 에 쓰지 않으려고 “I’m in” 은 누르지 않았다(기존 JoinButton 그대로라 동작은 같다).
- 검증: tsc, npm test 197, 로컬(라이브 API) v2·classic.

## 2026-10-16 04:20 UTC (버클리 목 21:20) · 23회차 · 초점: 채팅방
- 질문 새 답 없음(1번 People 제안 대기), 배포 브랜치 변화 없음.
- 고침 (ChatRoomPage.tsx): 대화방에 시각이 전혀 없어 언제 온 메시지인지 몰랐다 → 날이 바뀌거나 한 시간 넘게 비면 가운데에 “Today 6:42 PM”/“Wed, Sep 23 12:44 AM” 줄. 모임 대화방 위 카드가 “2026-10-17 18:00” 날 것 그대로 → “Sat, Oct 17 6 PM”.
- 메모: 지금 라이브 예시 대화는 Sep 23 으로 찍힌다 — c986455 와 같이 배포되면 “Today …”.
- 검증: tsc, npm test 197, 로컬(라이브 API) v2·classic.

## 2026-10-16 03:20 UTC (버클리 목 20:20) · 22회차 · 초점: Feed·채팅
- 질문 새 답 없음(직전에 받은 답은 반영 완료), 배포 브랜치 변화 없음.
- 고침: Feed 의 질문 글 표시가 영어로 “Prompt”(‘질문’ 번역) → “Question” (i18n/en.ts, 한 곳에서만 씀).
- 라이브 그대로: Feed·DM 날짜 Sep 22~23 — c986455(예시 글·대화 시각) 배포 뒤 풀림. DM 목록의 예시 표시도 배포 대기.
- 메모: 대화방에 보낸 시각·날짜 구분이 전혀 없어 언제 온 메시지인지 모른다 — 다음에 대화방을 볼 때 크기 보고 정하기.
- 검증: tsc, npm test 197, 로컬(라이브 API) v2·classic.

## 2026-10-16 02:30 UTC (버클리 목 19:30) · 사장님 답 반영 (2·3·4·5·6 = 추천대로, 1 = 부담 줄이는 방법 필요)
- 실행 간격: 3시간 → 1시간 (30분은 최소 간격 1시간이라 안 됨).
- 4 첫 화면 (f41a432): 제목 “Who’s free on campus right now?”, 사람 카드가 맨 위, 띠에 “WHO’S FREE NOW”.
- 5 예시 글·대화 (c986455): 서버가 시드 글·댓글·대화 시각을 지금 기준으로 다시 맞춤(실제 사람 것은 그대로) + 테스트.
- 2 Teams (693ea88): 사람(팀원 모집·크루·동아리) 먼저, 해커톤은 마감순 3개 + “See all”.
- 6 해커톤 (30ade64): 새 해커톤 페이지의 “Who can participate” 를 읽어 18세 이하·고등학생 전용은 뺌 + 테스트. 실험 중 Devpost 페이지를 몰아 열자 Cloudflare 가 막음 → 천천히·한 번씩·막히면 이번엔 건너뜀.
- 3 Ask Lumi 속도: 라이브 설정(AI_MODEL)이라 사장님 몫 — 방법을 QUESTIONS 에 적음.
- 1 People: 부담 줄이는 방법 5가지 제안을 QUESTIONS 맨 위에.
- 검증: tsc(앱·서버), npm test 197, 로컬(라이브 API) v2·classic 전/후.

## 2026-10-16 00:40 UTC (버클리 목 17:40) · 21회차 · 초점: 시간표 › 수업 추가 창
- 질문 답 없음, 배포 브랜치 변화 없음.
- 잘 됨: 과목 목록에서 찾기(학기·학과·검색), 과목 정보 링크, 색상.
- 고침 (TimetablePage.tsx): 직접 입력 칸 요일이 영어로 “ThuDay”(요일 번역이 붙음) → “Thu”(한국어는 그대로 “목요일”). 요일·시작·종료 3칸이 좁아 시간이 “10:00 ,” / “11:15 A”로 잘림 → 요일은 한 줄, 시작·종료는 두 칸.
- 검증: tsc, npm test 195, 로컬(라이브 API) v2·classic 전/후.
- 메모: 목록의 수업 시간이 “13:00–13:59”(학교 자료 그대로)·24시간제, 입력 칸은 AM/PM — 작지만 섞여 보임.

## 2026-10-15 21:40 UTC (버클리 목 14:40) · 20회차 · 초점: Ask Lumi (한국어 질문 6개)
- 질문 답 없음, 배포 브랜치 변화 없음.
- 잘 됨: 이번 주말 뭐 하지(보드게임 모임 + 예시는 *예시* 표시), 등산 동아리, 수강신청 날짜(학사 일정, “11일 뒤”), 크로스로드 저녁 메뉴(비건 표시). 속도 37~46초 그대로.
- 발견·고침: “오늘 공짜 음식 있어?” → “없어요” 오답 (Browse 무료 음식엔 오늘 15·16·17시 행사 4개). 검색이 시각 붙은 ISO(‘…T22:00Z’)를 ‘to: 2026-10-15’ 와 문자열로 비교해 그날 행사가 다 빠졌다 → 캠퍼스 날짜로 비교 (server/ai-search.ts + 테스트, 고치기 전 실패/후 통과). 배포 후 반영.
- 메모: “컴공 인턴 마감 임박” → 마감일 있는 인턴이 거의 없어(대부분 rolling) 없다고 답함 — 데이터 특성.

## 2026-10-15 18:40 UTC (버클리 목 11:40) · 19회차 · 초점: Campus › Browse › Events·Free food
- 질문 답 없음, 배포 브랜치 변화 없음.
- Events 198개·Free food 9개 v2·classic — 지난 행사 없음, 이모지·시간 정상.
- 발견·고침: Free food 에 “Real Talk Buddies Kick-Off (오늘 17:00 Mulford Hall)” 두 줄 — CalLink(Engage) 에서 공동 주최 행사가 id 만 다르게 두 번 옴. 이름·시작·장소가 같으면 하나만 (server/sources/opportunities.ts + 테스트, 고치기 전 실패/후 통과). 다음 가져오기부터 반영.

## 2026-10-15 15:40 UTC (버클리 목 08:40) · 18회차 · 초점: Discover › Activities
- 질문 답 없음, 배포 브랜치 변화 없음(10회차 ‘lunch at 8:45 AM’ 수정은 아직 미배포라 라이브에 그대로).
- 고침: Activities·Teams 공고 줄의 동그라미가 종류 이름 앞 두 글자(“Ca”, “Ha”)라 뜻이 없음 → 공고의 이모지(🎤 행사, 💡 해커톤…) (DiscoverPage.tsx).
- 발견·물어봄: 고등학생 전용 해커톤(“Girls Who Code HHS”, 14–18세)이 Devpost 로 또 들어옴 — 페이지를 열어야 알 수 있어 질문 (QUESTIONS.md).
- 검증: tsc, npm test 193, 로컬(라이브 API) v2·classic 전/후.

## 2026-10-15 12:40 UTC (버클리 목 05:40) · 17회차 · 초점: People 필터 창
- 질문 답 없음, 배포 브랜치 변화 없음.
- 고침 (HomePage.tsx): 필터 학년 칸이 영어로 제목 “yr”, 칩 “1yr 2yr 3yr 4yr”(‘학년’ 번역) → “Year / Freshman·Sophomore·Junior·Senior”(한국어는 그대로 1학년…). 학년 계산이 달력 연도라 1~7월에 한 학년 높게 걸러지던 것 → 8월에 바뀌는 학년도로.
- 검증: tsc, npm test 193, 로컬(라이브 API) v2·classic 전/후.
- 메모: 목표 칩에 ‘Dating’ — People 질문에 이미 있음.

## 2026-10-15 09:40 UTC (버클리 목 02:40) · 16회차 · 초점: 데이터 신선도
- 질문 답 없음, 배포 브랜치 변화 없음.
- CSV 전부 검사: 마감·날짜 지났는데 열린 줄 없음. 라이브 Browse(인턴·장학금·해커톤, 마감순) v2·classic — 마감 지난 것 없음. 어제 메모한 고등학교 해커톤(WarriorHacks)도 빠짐.
- 발견·고침: ‘Technica 2026’ 이 두 줄(직접 확인한 CSV + Devpost 자동 가져오기). Devpost 가져오기 때 이미 다른 출처에 같은 제목이 있는 해커톤은 빼게 함 (server/sources/external.ts, server/agent/run.ts + 새 테스트 server/external.test.ts). 인턴 가져오기에는 안 씀(회사마다 같은 직무명). 다음 Devpost 가져오기(12시간마다) 때 반영.

## 2026-10-15 06:40 UTC (버클리 수 23:40) · 15회차 · 초점: 채팅 (DM 목록·채팅방)
- 질문 답 없음, 배포 브랜치 변화 없음.
- 고침: 예시 프로필(Sofia·Jordan)과의 DM 이 목록·채팅방 머리에 SAMPLE 표시 없이 실제 친구처럼 보였다 → 둘 다 SAMPLE (ChatInboxPage.tsx, ChatRoomPage.tsx). 목록에서 표시 때문에 이름이 ‘Jor…’로 잘리던 것도 함께 정리.
- 검증: tsc, npm test 192, 로컬(라이브 API) v2·classic 전/후.
- 메모: 채팅방에 날짜 구분선이 없어 3주 전 “Tacos tomorrow, right?”가 언제 말인지 모름 — 예시 글 날짜 질문(5번)과 같은 문제.

## 2026-10-15 03:40 UTC (버클리 수 20:40) · 14회차 · 초점: 온보딩 뒷단계 (새 사용자로 1→8단계)
- 질문 답 없음, 배포 브랜치 변화 없음.
- 고침 (StartPage.tsx): v2 미리보기 카드에서 한 줄 소개가 라임 배경에 흰 글씨라 안 보임 → v2 는 어두운 글씨. 자동 한 줄 소개 “Ask me about library grind” → “Free time: library grind.” 8/9 단계 제목 “Last one —” 인데 9단계(이메일)가 남음 → “Almost done —”/“거의 다 왔어요!”.
- 검증: tsc, npm test 192, 로컬(라이브 API) v2·classic 전/후.
- 물어봄: People 질문에 ‘카드 나이 = 출생 연도에서’ 덧붙임.

## 2026-10-15 00:40 UTC (버클리 수 17:40) · 13회차 · 초점: 수업 페이지 (Class Space)
- 질문 답 없음, 배포 브랜치 변화 없음.
- 고침: 수업 직후 비는 사람이 없을 때 “Free after UGBA 105 — Nobody who shares their free time with you is free right after…” 빈자리 문구가 한 칸을 차지하던 것 → 그 칸과 맨 위 ‘Free after class’ 바로가기를 숨김(사람이 있을 때만) (ClassRoom.tsx). CS 186 처럼 사람이 있으면 그대로.
- 검증: tsc, npm test 192, 로컬(라이브 API) v2·classic 전/후.
- 메모: ‘Copy class link / QR for slides’ 가 위·아래 두 번 나온다(아래는 설명 문구와 함께) — 의도일 수 있어 그대로.

## 2026-10-14 21:40 UTC (버클리 수 14:40) · 12회차 · 초점: Ask Lumi (라이브 질문 6개)
- 질문 답 없음, 배포 브랜치 변화 없음. 4회차 Ask 수정(날짜·SAMPLE)은 라이브 반영 확인 — 예시 모임은 “Sample:/예시:”로 소개되고 카드에 SAMPLE.
- 질문: 오늘 밤 캠퍼스 / 이번 달 연구 마감 / AI 연구 어디서 시작 / 공부 같이 할 사람(한국어) / RSF 붐비나 / 오늘 학식 비건. AI 연구 질문은 수업·연구·동아리·해커톤으로 묶어 잘 답함(53초). 속도는 여전히 35~53초.
- 발견·고침: “vegan food at the dining halls today?” → “비건 메뉴가 없다”는 오답(실제 Café 3 점심에 비건 20개 이상). 모델이 장소에 ‘dining halls’를 넘기면 ‘hall’만 빼고 ‘halls’가 남아 없는 장소로 처리됐다 → ‘dining halls/campus/all cafes’ 같은 말은 모든 곳으로 (server/ai-live.ts + 테스트, 고치기 전 실패/후 통과). 서버 변경이라 배포 후 반영.

## 2026-10-14 18:40 UTC (버클리 수 11:40) · 11회차 · 초점: Campus › Browse › Clubs
- 질문 답 없음, 배포 브랜치 변화 없음.
- 고침: 동아리 줄 두 번째 줄이 “Clubs · Academic Student Organization…/ASUC Sponsored 2026-27-Stu…”(종류·학교 분류)라 무엇을 하는 곳인지 안 보임 → 소개 먼저, ‘Our mission is to’·‘The <동아리 이름> (ABC) program aims to’ 같은 머리말은 뺌 (“Hosts career fairs and research seminars…”). 소개가 없을 때만 종류·분류 (BrowseTab.tsx).
- 검증: tsc, npm test 192, 로컬(라이브 API) v2·classic 전/후.
- 메모: 추천 이유 “Like Vision & Language Lab, which you're in” 가 IBD 인식 동아리·공학 협회 등에 붙는다 — 닮음 근거가 약해 보임. 추천 로직이라 작은 수정 아님, 더 보이면 질문.

## 2026-10-14 15:40 UTC (버클리 수 08:40) · 10회차 · 초점: Discover (Now)
- 질문 답 없음, 배포 브랜치 변화 없음.
- 발견: 아침 8:40 에 “Hate eating alone — **lunch** at Crossroads? · 8:45 AM”. 이 예시 모임은 시각이 ‘서버가 켜진 뒤 25분’(nowPlus)이라 아침에 켜지면 아침 점심이 된다.
- 고침: 제목을 시간과 무관하게 “grab a bite at Crossroads?” (seed.en.ts), 라이브 DB 에도 닿도록 예시 모임을 굴릴 때 제목·설명을 시드에서 다시 가져옴 (server/demo.ts) + 테스트(고치기 전 실패/후 통과). 서버 변경이라 배포 후 보인다.
- 지난 메모 확인: Sofia 의 ‘Face hidden’ 은 예시 데이터의 photoType=masked 인데 사진은 얼굴이 보이는 것 — 예시 데이터 값 문제, 작아서 다음 예시 데이터 정리 때 함께. ‘14:59’ 는 이번엔 재현 안 됨(어제 날짜 버그 배포 전 화면).

## 2026-10-14 12:40 UTC (버클리 수 05:40) · 9회차 · 초점: People (두 바퀴째 — 프로필 화면)
- 질문 답은 아직 없음. 배포 브랜치 변화 없음.
- 고침: 프로필 아래 버튼 4개가 한 줄에 안 들어가 주 버튼(Propose/Messages)이 잘림 → 자리가 모자라면 주 버튼이 아랫줄 전체 (PersonPage.tsx). v2 에서 사진 위 이름이 어두운 글씨라 거의 안 보임(Sofia) → 흰 글씨 (v2 의 bg-ink.text-white 규칙 예외). 예시 학생 셋(Marcus·Jordan·Will)이 ‘25 졸업생인데 재학생으로 보임 → 서버 시작 때 졸업한 예시 학부생은 올해 4학년으로 (server/demo.ts + 테스트, 고치기 전 실패/후 통과).
- 확인: Hannah(Merced) 프로필이 ‘User not found’ 지만 People 덱에서도 빠져(사장님 프라이버시 수정) 깨진 링크 없음.
- 메모: Sofia 사진에 ‘Face hidden’ 표시인데 얼굴이 다 보임 · ‘Free together today 14:59–21:00’ 의 14:59. 다음에 확인.
- 물어봄: People 질문에 ‘💘 Dating 선택지’ 추가 (새 질문 아님).

## 2026-10-14 09:40 UTC (버클리 수 02:40) · 8회차 · 초점: 데이터 신선도
- 배포 브랜치 새 커밋(App Review 준비, 서버 전용 필드 보호) 머지. 질문 답은 아직 없음.
- opportunities-*.csv 전부 검사: 마감/날짜 지났는데 열린 줄은 NASA RASC-AL 하나 → NASA 공식 페이지에서 “notice of intent 필수, Oct 13 까지” 확인 후 status=closed.
- 라이브 확인: 어제 닫은 Gates/Churchill/Lunabotics 는 이미 첫 화면에서 빠짐(첫 화면 마감 카드는 NSF GRFP 10/19). Browse Scholarships·Hackathons v2·classic 스크린샷 — 마감 지난 것 없음.
- 메모(고치지 않음): Devpost 해커톤 ‘WarriorHacks 2.0’ 은 Westwood **High School** 동아리 주최(13세 이상) — 제목·주최명엔 high school 이 없어 거름망을 통과. 오늘 끝나 다음 가져오기 때 자동으로 빠짐. 막으려면 행사 페이지를 하나씩 읽어야 해 작은 수정이 아님.

## 2026-10-14 06:40 UTC (버클리 화 23:40) · 7회차 · 초점: Feed·채팅
- 배포 브랜치에 새 커밋(아이폰 셸, 신고·관리, 프로필 공개 범위 서버 강제) — 머지. 질문 답은 아직 없음.
- 고침: Feed 글에 예시(sample) 표시가 없었다 — 글쓴이가 예시 프로필이면 목록 줄과 펼친 글에 SAMPLE 표시 (CommunityPage.tsx, PostCard.tsx). 익명 글은 서버가 글쓴이를 숨겨서 표시 못 함(맞는 동작).
- 검증: tsc, npm test, 로컬(라이브 API) v2·classic 전/후.
- 물어봄: 예시 글·DM 이 3주 전 날짜인데 “tonight/today” 문구 (QUESTIONS.md).

## 2026-10-14 03:40 UTC (버클리 화 20:40) · 6회차 · 초점: 첫 화면·온보딩 (로그인 없이 새 사용자로)
- 사장님이 96355b3 까지 배포함(라이브 반영) + 새 커밋 52bc9ef(수업방 목록은 학교 이메일 인증자만). 질문 답은 아직 없음.
- 발견: 첫 화면 “🔥 Closes today · Gates Cambridge” — 마감은 오늘 4pm PT 로 이미 지남(공식 페이지 확인). CSV 마감이 날짜만이라 그날 밤까지 열린 것으로 보였다.
- 고침: 공식 페이지에서 마감 시각이 지난 것을 확인한 3개를 status=closed — Gates Cambridge U.S. round(10/13 4pm PT), Churchill 버클리 캠퍼스 마감(10/13 4pm PT), NASA Lunabotics PMP(10/13 noon ET). RASC-AL 은 마감 시각 미표기라 그대로(내일 날짜로 자동으로 빠짐). 첫 화면 ‘Closes in N days’ 도 UTC 날짜를 쓰던 것 → 기기 날짜 (WelcomePage.tsx).
- 메모: Design 알약이 하단 탭 없는 화면(온보딩·Ask)에서 제목을 가린다 — 비교용 도구라 그대로 둠.
- 물어봄: 첫 화면이 정보 중심 + 온보딩 9단계 (QUESTIONS.md).

## 2026-10-14 00:40 UTC (버클리 화 17:40) · 5회차 · 초점: 시간표·수업
- 사장님 답 없음, 배포 브랜치 변화 없음.
- 발견(큰 버그): 날짜를 UTC 로 셌다. 버클리 저녁(17시 이후)에는 ‘오늘’이 내일이 되어 오늘 밤 모임(7pm run 등)이 Activities 에서 빠지고, 날짜만 있는 값(‘2026-10-15’)은 하루 전 요일로 보였다(“Today” 묶음에 “Mon, Oct 12”). 지금까지 스크린샷이 UTC 브라우저라 못 봤다 → shoot.mjs 를 버클리 시간대로.
- 고침: todayISO/addDaysISO 를 기기 달력 날짜로, formatDate·요일 계산은 그날 정오로 읽기 (format.ts, together.ts, engine.ts, TimetablePage.tsx). 시간표 ‘공강 겹치는 친구’가 지난 시간(10:00–15:00)을 권하던 것 → 지금부터(15분 올림) 남은 시간만. 격자가 18시에서 끊겨 저녁 활동이 안 보이던 것 → 활동 시간도 범위에 (WeekGrid.tsx). Activities ‘Today’ 에서 1시간 넘게 지난 행사는 뺌. 수업 부제목 줄바꿈에 hyphens-auto(헤드리스 크롬엔 사전이 없어 여기선 확인 못 함).
- 검증: tsc, 서버 타입체크, npm test 를 UTC 와 TZ=America/Los_Angeles 둘 다 121 통과. 전/후 스크린샷(버클리 시간) v2·classic.
- 물어본 것 없음.

## 2026-10-13 21:40 · 4회차 · 초점: Ask Lumi (라이브에 실제 질문 10개)
- 사장님 답 없음, 배포 브랜치 변화 없음. 질문: free food today / internship near berkeley / 버클리 근처 인턴 / 이번 주말 해커톤 / 하이킹 동아리 / 오늘 저녁 같이 밥 / CS 61A 스터디 / 신경과학 학부 연구 / 유학생 장학금 / 오늘 밤 캠퍼스. 알아듣기는 모두 OK.
- 고침: 답 카드에 “Invalid Date” (해커톤·연구 카드) → 캠퍼스 날짜로, 이미 시작한 기간은 날짜 숨김 (AiCards.tsx). 모델에게 마감을 UTC 시각 그대로 줘서 “Jan 16”(실제 Jan 15 PT)처럼 하루 늦게 말하던 것 → 캠퍼스 날짜로 (ai-search.ts). 예시 활동(“Coffee on Southside at 6”)을 실제 모임처럼 답하던 것 → 카드에 SAMPLE 표시 + 모델에 “예시라고 말하라” (types.ts, ai-search.ts, ai.ts).
- 확인: 로컬(라이브 API)에서 v2·classic 카드 날짜 정상. SAMPLE 표시·날짜 문장은 서버 배포 후에야 보인다.
- 물어봄: 답이 매번 36~44초 (QUESTIONS.md).

## 2026-10-13 18:40 · 3회차 · 초점: Campus › Browse
- 사장님 답 없음, 배포 브랜치 변화 없음. 라이브 /community (Feed·Browse·Clubs) 를 v2·classic 으로 봄.
- 고침: For you 에서 이미 제출 기간이 시작된 해커톤이 “✨ This week” 이유를 달고(D-19 인데도) 점수까지 올라 맨 위를 차지하던 것 → 시작일이 오늘 이후일 때만 (foryou.ts, 테스트 추가 — 고치기 전 실패/후 통과 확인).
- 고침: Devpost 주최자 칸이 “nill” 같은 자리 채움 글자면 “Devpost” 로 (external.ts, 다음 가져오기부터 반영).
- 반복 이유 문장은 같은 문구 최대 2번 — 기준 안. 마감 지난 공고 안 보임.
- 물어본 것 없음. 메모: Browse 목록 어디에도 사람(같이 가는 친구)이 안 보인다 — 2회차 Teams 질문 답을 보고 같이 정리.

## 2026-10-13 15:40 · 2회차 · 초점: Discover (Now / Activities / Teams)
- 사장님 답 없음. 라이브 /discover 3개 탭을 v2·classic 으로 봄.
- 고침: D-day 가 하루 많게 나오던 것(내일 마감이 D-2) → 버클리 달력 기준으로 셈 (recommend.ts `daysUntil`). Teams 해커톤 줄에 이미 지난 시작일(“Mon, Oct 12 · D-2”)이 나오던 것 → 마감 있으면 D-day 만 (DiscoverPage.tsx).
- 확인: “깨진 사진 7” 은 아직 안 불러온 lazy 이미지였다(라이브에서 200) → shoot.mjs 가 그건 안 세게 고침.
- 물어봄: Teams 가 사람 없는 해커톤 게시판 + Discover 첫 화면에 탭 내용이 안 보임 (QUESTIONS.md).
- 메모: 예시 프로필 Hannah 의 “Merced” 는 server/demo.ts 에서 일부러 넣은 값 — 버클리 데모에도 보인다. 다음에 데모 데이터 볼 때 함께.

## 2026-10-13 · 첫 실행 · 초점: People
- 라이브 / 와 /discover 를 v2·classic 으로 찍어 봄. 깨진 사진 0.
- 고침: 연결 버튼 하트 → 손 흔들기 아이콘, “Swipe left to pass, right to connect” 문구 삭제(1 / 11 만), Design·Feedback 알약이 X 버튼을 가리던 겹침 해소(버튼 줄을 24px 올림). HomePage.tsx 한 파일.
- 발견: 로컬 vite 는 VITE_API_MODE=remote 없이 띄우면 mock 데이터 → README 수정.
- 물어봄: 첫 화면이 큰 얼굴 사진+나이+스와이프라 데이팅 앱처럼 보임 (QUESTIONS.md).
- 남은 것: 예시 프로필 Hannah 가 “Merced '27” — 버클리 덱에 UC Merced 학생. 다음에 확인.

## 2026-10-13 · 설치
- PM agent 설정 (3시간마다, 작업 브랜치 claude/lumi-pm, 배포는 사장님).
- 직전 수정: Discover 활동 날짜별 묶음 + "Be the first" 제거 (aacc152).
