# PM agent 실행 기록

최신이 위.

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
