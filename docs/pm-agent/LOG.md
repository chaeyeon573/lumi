# PM agent 실행 기록

최신이 위.

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
