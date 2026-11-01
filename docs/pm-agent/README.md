# Lumi PM agent — 3시간마다 도는 기획자

사장님 대신 앱을 직접 써 보고, 사장님 기준([../PRODUCT_TASTE.md](../PRODUCT_TASTE.md))으로 어색한 곳을
찾아 **작은 것은 고치고, 큰 것은 묻는다.** 배포는 사장님이 한다.

## 브랜치 규칙 (어기면 사고)

- 라이브 배포 브랜치: `claude/friendly-euler-emuo1f` — push 하면 바로 Railway 배포된다.
  ⛔ **이 브랜치에 절대 push 하지 않는다.**
- PM agent 작업 브랜치: **`claude/lumi-pm`** — 여기에만 push 한다.
- 매 실행 시작:
  ```bash
  git fetch origin claude/friendly-euler-emuo1f claude/lumi-pm || git fetch origin claude/friendly-euler-emuo1f
  # lumi-pm 이 있으면 그 위에, 없으면 배포 브랜치에서 새로 만든다
  git checkout -B claude/lumi-pm origin/claude/lumi-pm 2>/dev/null || git checkout -B claude/lumi-pm origin/claude/friendly-euler-emuo1f
  git merge --no-edit origin/claude/friendly-euler-emuo1f   # 최신 배포 위로 (rebase·force-push 금지)
  ```
- `git add` 는 고친 파일만 경로로. PR 은 만들지 않는다.

## 매 실행 순서

1. **이번 초점 고르기** — `docs/pm-agent/LOG.md` 의 마지막 기록을 보고, 아래 목록에서 최근에 안 본 것 1개.
   1. People (사람 카드·아이스브레이커)  2. Discover (Now / Activities / Teams)
   3. Campus › Browse (필터·공고 목록·동아리)  4. Ask Lumi — 실제 질문 8~10개
   5. 시간표·수업 페이지  6. 첫 화면·온보딩  7. Feed·채팅
   8. 데이터 신선도 — `server/data/opportunities-*.csv` 에서 마감 지났는데 열려 있는 행
2. **화면 보기** — 라이브, New(v2) 디자인 (2026-10-30 사장님 결정으로 Classic 과 비교 알약은 없앴다 — 학생에게는 v2 만 보인다. `classic` 은 예전 화면과 비교할 때만):
   ```bash
   npm ci && npm i --no-save --prefix /tmp/pw playwright-core@1.64
   mkdir -p /tmp/shots
   node docs/pm-agent/shoot.mjs /tmp/shots v2 "<paths>" https://heetz.up.railway.app
   # 필요할 때만: node docs/pm-agent/shoot.mjs /tmp/shots classic "<paths>" https://heetz.up.railway.app
   ```
   스크린샷을 Read 로 직접 본다. 텍스트 출력만 보고 판단하지 않는다.
3. **사장님처럼 평가** — PRODUCT_TASTE.md 기준으로 "이거 왜 이래?" 싶은 것을 찾는다.
   새 사용자(버클리 학부생)의 눈으로: 무엇을 하는 앱인지 3초 안에 알겠나? 같이 할 사람이 보이나?
   글자가 많나? 텅 비어 보이나? 마감된 게 보이나? 깨진 사진·반복 문구·영어/한국어 섞임은?
4. **작은 것만 고친다** — 한 파일~세 파일, 한 시간 안에 끝나고 되돌리기 쉬운 것:
   문구, 정렬, 빈 상태, 반복, 깨진 이미지, 마감 지난 데이터(`status=closed`, 출처 URL 로 마감 확인 후), Ask Lumi 프롬프트·검색 개선.
   고친 뒤 반드시:
   - `npx tsc -b` 와 `npm test` 통과
   - 로컬에서 확인: `VITE_API_MODE=remote npx vite --port 5173 &` (이 변수가 없으면 mock 데이터라 라이브와 다르게 보인다) 후 `node docs/pm-agent/shoot.mjs /tmp/after v2 "<paths>"` (base 기본값 = 로컬, /api 는 라이브)
   - 고치기 전/후 스크린샷을 둘 다 본다
5. **큰 것은 묻는다** — 새 기능, 화면 구조 변경, 앱 본질에 닿는 것, 데이터 소스 추가, 다른 세션이
   작업 중인 영역(아래). `docs/pm-agent/QUESTIONS.md` 맨 위에 추가한다:
   ```
   ## 2026-10-13 15:00 · Discover
   **무엇이 어색한가:** (한두 줄, 스크린샷에서 본 그대로)
   **제안:** A) … B) …  — 추천: A, 이유 한 줄
   ```
   ⛔ PRODUCT_TASTE.md 의 "원하지 않은 것" 은 다시 제안하지 않는다.
6. **기록** — `docs/pm-agent/LOG.md` 맨 위에 3~6줄: 시각, 초점, 본 것, 고친 것(커밋), 물어본 것.
7. **push** — `git push -u origin claude/lumi-pm` (네트워크 실패 시만 2/4/8/16초 재시도).
8. **마지막 답변** = 사장님께 보내는 짧은 한국어 보고: 고친 것 / 물어볼 것 / 다음 초점.
   고친 게 없고 물어볼 것도 없으면 "이번엔 이상 없음" 한 줄.

## 하지 말 것

- 라이브 데이터 쓰기(관리자 API 호출, DB 수정) ⛔ — 코드·CSV 변경만, 배포는 사장님.
- 데이터를 지어내기 ⛔ — 공고를 추가하려면 공식 페이지에서 직접 확인한 것만, 마감 전인 것만.
- 큰 리팩터·새 화면·새 기능 구현 ⛔ — 질문으로 남긴다.
- 비밀키(API_KEY, ADMIN_KEY 등)를 출력·커밋 ⛔.
- 같은 지적 반복 — QUESTIONS.md 에 이미 있는 것은 다시 쓰지 않는다 (답이 달렸으면 그대로 따른다).
