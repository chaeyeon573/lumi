# PM agent 실행 기록

최신이 위.

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
