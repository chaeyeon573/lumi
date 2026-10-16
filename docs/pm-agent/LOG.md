# PM agent 실행 기록

최신이 위.

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
