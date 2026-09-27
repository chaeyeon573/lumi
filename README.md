# AroundU

대학생을 위한 모바일 우선 소셜 네트워킹 앱 MVP. 학교와 주변에서 열리는 활동을 발견하고 사람·동아리·모임과 연결됩니다.

- **사람** — 누구와 함께할 것인가
- **활동** — 무엇을 함께할 것인가
- **장소** — 어디에서 일어나는가

## 실행 방법

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # 타입체크 + 프로덕션 빌드
npm run preview    # 빌드 결과 미리보기
```

시작 화면에서 **로그인 (데모 계정)** 을 누르면 예시 데이터가 채워진 계정(하늘 · 연세대 컴퓨터과학과)으로 들어갑니다.
**회원가입**을 누르면 6단계 온보딩을 거쳐 새 계정을 만듭니다. 학교 이메일 인증 코드는 `123456` 입니다.

기본값은 `localStorage`에 저장되는 mock API 입니다. `VITE_API_MODE=remote` 로 빌드하면 `server/` 의 실제 서버(Railway + Postgres)를 사용합니다. 아래 **백엔드 연동** 참고.

## 모바일 앱 (Expo) — `apps/mobile`

웹과 같은 도메인 코드(`packages/core`: 타입·API·mock DB·스토어·i18n·추천 로직)를 그대로 쓰는 React Native 앱입니다. **v2 UX(홈 | 사람(추천·찾기·연결) | 모임(추천·그룹·일정) | 피드 | 프로필, `docs/UX-SPEC.md`)는 아직 웹에만 반영됐고, 모바일은 이전 구조(사람 | 발견 | + | 캠퍼스 | 나)입니다 — core 로직(추천·검색·시드)은 공유되며 화면 이식은 다음 라운드.** 화면은 RN으로 다시 그렸고, 웹의 모든 화면(사람·발견·캠퍼스·나 탭, `+` 시트, 사람/활동/조직/공고 상세, 채팅, 알림, 설정, 시간표, 수업 공간, Plan Together, 활동·게시물 만들기, 프로필 편집)이 `apps/mobile/app/**` 에 같은 경로 이름으로 있습니다. 온보딩·지도는 아직 없고 데모 계정으로 바로 들어갑니다.

**폰에서 보기 (Windows PowerShell)** — 다른 작업 세션이 브랜치를 바꿔도 안 깨지도록 `~/AroundU-mobile` 에 따로 클론해서 실행합니다.

```powershell
.\start-mobile.ps1      # 클론/갱신 → npm install → apps/mobile 에서 expo start --tunnel
```

QR이 뜨면 폰의 **Expo Go**(App Store / Play 스토어)로 스캔합니다. tunnel 모드라 같은 Wi-Fi가 아니어도 됩니다.

**브라우저에서 보기** — 같은 RN 코드가 react-native-web으로 돌아갑니다.

```bash
cd apps/mobile
npx expo start --web                   # http://localhost:8081
npx expo export --platform web         # 정적 파일 → apps/mobile/dist
npx expo export --platform ios,android # 네이티브 번들 (CI 검증용)
```

- Expo SDK 57 (Expo Go 최신 버전과 호환). 헤더의 학교 알약을 누르면 **한국어 · 한국 대학 / English · US campus** 버전을 바꿀 수 있어요.
- 앱스토어 제출은 `npx eas build --platform ios|android` (EAS 계정 필요), 스토어 등록 전에 `app.json`의 번들 ID·아이콘을 바꿉니다.
- 스타일은 `twrnc`(런타임 Tailwind)로 웹과 같은 클래스 이름·토큰(`apps/mobile/tailwind.config.js`)을 씁니다. 사진은 `apps/mobile/assets/photos` + `src/photos.ts`의 `require` 맵으로 들어갑니다.
- 저장소는 AsyncStorage를 앱 시작 시 메모리로 올려(`src/platform.ts`의 `hydrate`) core의 동기 저장소 인터페이스에 맞춥니다.
- 루트(웹)와 모바일의 React 버전이 달라서 `metro.config.js`가 react/react-dom을 항상 `apps/mobile/node_modules` 것으로 고정합니다.

## 기술 스택

| 영역 | 선택 |
| --- | --- |
| 프레임워크 | React 19 + TypeScript + Vite 6 |
| 스타일 | Tailwind CSS v4 (`src/index.css`의 `@theme` 디자인 토큰) |
| 라우팅 | react-router v7 |
| 상태 관리 | zustand (`src/store/useAppStore.ts`) |
| 지도 | Leaflet + react-leaflet (CARTO Voyager 타일) |
| 아이콘 | lucide-react |

## 폴더 구조

```
src/
  types/            사용자·조직·활동·게시물·관계·참가·제안·채팅·알림·신고 모델
  api/
    types.ts        AroundUApi 인터페이스 + Snapshot/Patch 타입
    engine.ts       도메인 로직 (브라우저 mock 과 서버가 공유)
    index.ts        api 진입점 (VITE_API_MODE 로 mock ↔ remote 전환)
    mock/           localStorage 위에서 엔진을 돌리는 mock
    remote/         서버 호출 구현 (fetch + SSE)
  data/             seed.ts (예시 데이터), places.ts (장소 프리셋)
    catalog/        courses.ts (미국 대학 수업 목록), orgs.ts (동아리·그리스 조직)
server/             Express API (Railway) — index.ts 라우팅·권한, store.ts Postgres/파일, scripts/ CSV 가져오기
  store/            zustand 앱 스토어 (스냅샷 + Patch 병합 + 토스트)
  hooks/useViewer   현재 사용자 관점의 가시성·관계 헬퍼
  lib/              labels(라벨·색상), relations(공개 범위·연결 규칙), format
  components/
    ui/             Button, Chip, Avatar, Sheet, Field, States, VisibilityPicker, Toast
    layout/         AppShell(모바일 프레임), AppHeader(학교 ✓ 알약), BottomNav(5탭), TopBar(메시지 아이콘)
    cards/          PersonCard, ActivityCard, JoinButton, PostCard, OrgCard, ReportSheet
  pages/
    onboarding/     시작 화면 + 6단계 가입
    home/           홈 (학생·졸업생 대시보드)
    discover/       Discover (Now | Activities | Teams)
    classes/        수업 공간 (같은 수업 학생 · Study Crew)
    plans/          My Plans
    together/       Plan Together (시간 투표 만들기·투표·확정)
    timetable/      시간표 (수업 탭 → 수업 공간, 공강 탭 → Open Slot)
    map/            지도(활동 카드·상세에서 진입)
    activity/       활동 상세, 참가자 관리(승인·거절)
    create/         활동 만들기/수정, 게시물 작성
    community/      Community (Feed | Opportunities | Clubs)
    people/         사람 상세(관심·팔로우·친구 요청·활동 제안)
    org/            동아리·조직 페이지
    chat/           채팅함(개인/활동/조직/요청), 채팅방(차단·신고)
    notifications/  알림
    profile/        프로필, 편집, 친구·팔로워·관심 목록
    settings/       설정, 공개 범위, 계정 및 안전
```

## 백엔드 연동 (Railway)

`src/api/engine.ts` 에 있는 도메인 로직을 브라우저(mock)와 서버가 공유한다. 서버는 `server/` 에 있고, 빌드된 프론트엔드(`dist/`)와 API 를 **한 서비스**로 서빙한다.

```
브라우저 ──POST /api/rpc/<group>/<method>──▶ server/index.ts ──▶ engine ──▶ Postgres(docs jsonb)
        ◀──SSE /api/events (Patch 푸시)────┘
```

### Railway 에 올리기

1. Railway 프로젝트에 **GitHub 리포 서비스**를 추가한다 (기존 프로젝트에 서비스만 추가하면 된다).
2. 같은 프로젝트에 **Postgres** 플러그인을 추가하고, 리포 서비스의 Variables 에서 `DATABASE_URL` 을 `${{Postgres.DATABASE_URL}}` 로 참조한다.
3. Variables 에 아래를 넣는다 (`.env.example` 참고).

   | 변수 | 값 |
   | --- | --- |
   | `VITE_API_MODE` | `remote` (빌드 시 프론트가 서버를 쓰도록) |
   | `AROUNDU_LANG` | `en` (미국 캠퍼스 데모·수업 목록) 또는 `ko` |
   | `DEMO_AUTOREPLY` | `0` (실사용) / `1` (데모 자동 응답) |
   | `RESEND_API_KEY`, `MAIL_FROM` | 학교 이메일 인증 코드 발송. 없으면 코드가 화면 힌트에 그대로 표시된다 |
   | `ALLOW_RESET` | 비워두기 (1이면 설정 화면에서 DB 를 시드로 되돌릴 수 있다) |

4. 빌드·시작 명령은 `railway.json` 에 있다 (`npm ci && npm run build` → `npm start`). 헬스체크는 `/api/health`.
5. 첫 부팅 때 DB 가 비어 있으면 `src/data/seed(.en).ts` + 수업 목록 + 동아리·그리스 조직 목록을 자동으로 넣는다.

로컬에서 서버까지 같이 돌려보려면:

```bash
cp .env.example .env            # VITE_API_MODE=remote
npm run build                   # dist/ 생성
DATABASE_URL=postgres://... npm run server   # 없으면 server/.data/db.json 에 저장
# http://localhost:8787
```

프론트만 개발 서버로 띄우면서 API 는 로컬 서버를 쓰려면 `VITE_API_MODE=remote VITE_API_URL=http://localhost:8787 npm run dev`.

### 인증

- 가입: 6단계 온보딩. 학교 이메일로 6자리 코드가 발송되고(10분 유효), 서버가 검증한 이메일만 `emailVerified` 가 된다. 같은 이메일로 두 번 가입할 수 없다.
- 로그인: 시작 화면 → **이메일로 로그인** → 코드 입력. 토큰은 `localStorage` 에 저장되고 `Authorization: Bearer` 로 전송된다.
- 데모 계정 로그인은 `ALLOW_DEMO_LOGIN=0` 으로 끌 수 있다.
- 모든 RPC 는 서버에서 호출자 검사를 한다 (`server/index.ts` 의 `RULES`): 자기 id 로만 쓰기, 주최자만 승인/거절, 요청 받은 사람만 응답 등.
- 다른 사용자의 시간표 강의실(`room`)과 남의 알림·신고는 절대 내려보내지 않는다 (`server/view.ts`).

### 실제 데이터 채우기

**수업 목록** — `src/data/catalog/courses.ts` 에 UC Berkeley · Stanford · UCLA · MIT · SF State 의 주요 과목 210개가 들어 있다 (과목 코드·이름·학과는 공개 카탈로그 기준, 요일·시간·강의실은 *전형적인 패턴의 예시값*). 시간표에서 **수업 추가 → 학교 수업 목록에서 찾기** 로 검색해 요일별 수업으로 한 번에 추가한다.
학기별 실제 registrar 데이터는 CSV 로 덮어쓴다:

```bash
# school_id,code,title,department,instructor,location,days,start,end,term,units
DATABASE_URL=... npm run import:courses -- fall2026-berkeley.csv
```

공개 소스에서 바로 가져오는 스크립트도 있다 (인터넷이 열린 환경에서 실행):

```bash
npm run fetch:courses -- stanford      # ExploreCourses XML, 키 불필요
npm run fetch:courses -- mit           # FireRoad API, 키 불필요
npm run fetch:courses -- berkeley     # 키 없으면 공개 Class Schedule(classes.berkeley.edu) 을 읽는다 — 33개 학과, 강의(LEC)만
BERKELEY_TERM="Spring 2027" BERKELEY_PUBLIC_SUBJECTS="Computer Science|Mathematics" npm run fetch:courses -- berkeley   # 학기·학과 지정 (| 구분)
BERKELEY_APP_ID=… BERKELEY_APP_KEY=… BERKELEY_TERM_ID=2268 npm run fetch:courses -- berkeley   # SIS Class API 키가 있으면 그쪽을 쓴다 (api-central.berkeley.edu)
```

UCLA 와 SF State 는 공개 API 가 없어서 학교 스케줄 페이지에서 받은 표를 위 CSV 헤더로 맞춰 `import:courses` 로 넣는다.

**동아리·소로리티·프래터니티** — `src/data/catalog/orgs.ts` 에 5개 캠퍼스 338개 조직이 있다. 그리스 조직은 IFC / Panhellenic / NPHC(Divine Nine) / MGC / Professional / Service 계열별로 전국 조직 사전(`NATIONAL_GREEK`)에서 골라 넣었고, 동아리는 CalLink 등 각 학교 학생단체 디렉터리 기준이다. 이 목록은 외부에서 가져온 것이 아니라 직접 정리한 **시작용 목록**이라 캠퍼스별 챕터 존재 여부가 검증되지 않았고, **모두 `verified: false`** 로 시작한다.

실제 디렉터리에서 통째로 가져오려면 (Berkeley CalLink 1,550개 · SF State 289개 — CampusLabs Engage 공개 API, 실제 확인됨):

```bash
npm run fetch:orgs                      # Berkeley + SF State → DB 반영 + server/.data/orgs-<school>.csv
npm run fetch:orgs -- s_berkeley        # 한 학교만
FETCH_DRY=1 npm run fetch:orgs          # CSV 만 만들고 DB 는 건드리지 않음
```

**Berkeley Greek 공식 명단** — 학교 LEAD Center 의 Find A Chapter 페이지(IFC · MCGC · NPHC · PHC 4개 카운슬, 62개 챕터)를 읽어
CalLink 로 들어온 같은 조직에 카운슬·하우스 주소·주류/하우징 정책·SVSH 교육 이수 여부를 합치고 `verified: true` 로 표시한다.
공식 명단에 없고 링크·멤버도 없는 손으로 넣은 추정 챕터는 지운다.

```bash
npm run fetch:greeks                    # lead.berkeley.edu → DB 반영 + server/.data/greeks-berkeley.csv
FETCH_DRY=1 npm run fetch:greeks        # CSV 만
```

카테고리 이름에 fraternity/sorority/Panhellenic/IFC/NPHC 가 있으면 `greek` 으로, 학생회는 `council` 로 분류된다. UCLA(SOLE) · MIT(CampusGroups) · Stanford 는 Engage 가 아니라서 이 API 가 없다. 학교 디렉터리에서 받은 표를 CSV 로 넣고, Engage 를 쓰는 학교를 더 붙일 땐 `ENGAGE_HOSTS=s_xxx=https://xxx.campuslabs.com/engage` 로 지정한다. 손으로 고칠 때는 CSV 로:

```bash
# school_id,name,type,category,description,emoji,hue,website,instagram,dues,join_process
DATABASE_URL=... npm run import:orgs -- berkeley-orgs.csv
```

**지원 마감 달력(기회)** — 인턴·연구·장학금·교환·행사는 본문을 옮기지 않고 **무엇을 · 언제까지 · 어디서(원문 링크)** 만 넣는다.
학교별 CSV(`server/data/opportunities-<school>.csv`)를 손보고 넣으면 Community › Opportunities 에 마감 순으로 보이고, 저장·마감 알림·"지원하러 가기" 링크가 붙는다.
마감일을 모르면 비워 두고 설명에 "보통 3월" 처럼 적는다 — 지어내지 않는다. Berkeley 초안은 학교 공개 페이지에서 확인한 날짜만 넣었다 (2026-09-24 기준).

```bash
npm run import:opportunities -- server/data/opportunities-berkeley.csv
```

**사용자** — 실제 사용자는 온보딩으로 들어온다. 초기에 비어 보이지 않도록 시드 사용자가 함께 들어가 있으며, 운영 전에 `src/data/seed.en.ts` 의 `users`/`posts` 를 비우거나 줄이면 된다.

### 남은 일 (운영 전)

- `bootstrap()` 이 전체 스냅샷을 내려보낸다. 사용자가 수천 명이 되면 학교·친구 단위로 나눠 내려보내야 한다.
- 인증 코드 요청에 rate limit 이 없다 (Railway 앞단 또는 `express-rate-limit` 추가).
- 세션 토큰 만료·기기 목록, 이미지 업로드(현재 `public/photos` 정적 파일).

## 앱 구조 — 홈 | 사람 | 모임 | 피드 | 프로필 (v2, `docs/UX-SPEC.md`)

정체성: **검증된 대학 관계망에서 시작해, 지금 나와 관련 있는 사람을 발견하고, 졸업 후에도 그 관계를 계속 확장한다.** 하단 5탭, 가운데 + 없음, DM은 헤더 오른쪽. 작업 규칙은 `CLAUDE.md`, 화면 계층·추천 가중치·필터·공개 범위·36화면 표는 `docs/UX-SPEC.md`.

| 탭 | 질문 | 내용 |
| --- | --- | --- |
| **홈** (`src/pages/home/HomePage.tsx`, `@core/lib/home`) | 오늘 나에게 뭐가 있나 | 상단 **연세대학교 ✓**(졸업생 **연세대학교 동문 ✓ · 2018 졸업 · 서울 · AI / Product**). 학생: 오늘 일정(공강 → 같이할 사람 찾기) → 지금 연결할 수 있는 사람 → 학교에서 일어나는 것 → 나에게 맞는 모임 → 지금 열린 만남 → 새로운 사람 → 추천 기회. 졸업생: 새롭게 연결할 사람 → 내 지역 사람 → 내 분야 사람 → 이번 주 모임 → 내 관계망 소식 → 내 그룹 → 기회. 섹션당 2~4개 + 전체보기 |
| **사람** (`src/pages/people/*`, `@core/lib/people`, `recommend`) | 누구를 만날까 | **추천**(한 장 카드 덱, 사진 위 **이유 칩** 같은 학교·같은 전공·같은 지역…, 학교 구분 없이 타학교·동문 무료, Pass / 연결 / 만남에 초대, "찾는 사람" 칩, 오늘 연결 요청 n/30) · **찾기**(키워드 + 학교·전공·졸업연도·거주 지역·활동 지역·회사/업종·직무·관심사·상태, 프리셋 "뉴욕 + 금융" "연세대 + 서울 + AI", 무료는 필터 1그룹, 2그룹 이상·상세 조건은 AroundU+, 검색 저장·새 사람 알림) · **연결**(요청함·연결·팔로잉). 사람 상세: 학교 'YY ✓ · 우리의 공통점 · 찾고 있어요 · [연결하기][메시지][만남에 초대]. **네트워크에 물어보기**(`/people/ask`): "이런 분을 찾고 있어요" 요청을 1촌→2촌→3촌→관련 네트워크로 전달, 받은 사람은 저예요 / 제가 아는 사람이 있어요 / 관심 없어요, 지인 추천 후보는 본인이 관심 있어요 해야 공개, 수락 시 연결 + Mutual Room (`@core/lib/requests`, `graph`) |
| **모임** (`src/pages/meet/*`, `@core/lib/meet`) | 무엇을 같이 할까 | **추천**("지금" 스트립: 공강 열기·제휴·지금 열린 만남 + 추천 모임 카드에 이유 한 줄) · **그룹**(내 그룹 · + 그룹 만들기(학교/지역/관심사/직업 자유 성격, 공개/승인) · 그룹 찾기) · **일정**(오늘/이번 주/이후 · + 모임 만들기(시간·장소·인원·공개 범위 전체/내 학교/그룹 멤버/연결된 사람) · Plan Together · Study Crew · 팀원 모집). 그룹 상세 소개 \| 일정 \| 멤버 \| 피드 |
| **피드** (`src/pages/feed/*`, `@core/lib/feed`) | 무슨 이야기가 오가나 | 컴포저(텍스트·사진·**공개 범위** 전체/내 학교/특정 그룹/팔로워, 나머지는 더 보기) · **추천** · **내 학교**(재학생만 \| 학교 전체) · **팔로잉**(팔로우·연결·가입 그룹). 스폰서 글 4개마다 1개(Plus 광고 없음), 내 글 Boost |
| **프로필** (`src/pages/profile/*`) | 나는 지금 어떤 사람인가 | 사진·이름·**학교 ✓**(인증 방법 툴팁)·전공·'25 졸업 예정/2018 졸업 → **현재**(거주 도시·활동 지역·졸업생은 회사·업종·직무) → 관심사 → **추천 설정**(찾는 사람·하고 싶은 활동) → 시간표(학생) → 그룹·연결·모임·글 → **현재 상태가 바뀌었나요?** → 더 알려주기(프로필 질문·목표·생활권) |

**네트워크 16화면** (`docs/UX-SPEC.md` 6.7): 사람 탭 추천 허브(가까운 사람·이번 주 주변·Open To·의외의 연결·저장·사람 찾아보기, 기존 한 장씩 보기 유지) · `/people/unexpected` · `/people/second`(2촌 + 연결해줄 수 있나요?) · `/users/:id` Overlap · `/people/find` 자연어 · `/people/ask` · `/people/requests` · `/people/requests/:id/respond` · `/people/around` · `/profile/open-to` · `/meet/tables` · `/activities/:id` · `/profile/saved` · 1:1 대화 Mutual Room · `/settings/privacy` · `/people/advanced`. 모든 화면에 로딩·빈·부분 오류·연결 상태·공개 범위 상태가 있다.

**온보딩 9단계** (`src/pages/onboarding/*`): 시작 → 학교 선택 → 학교 인증(재학생: 학교 이메일·SSO·학생증 / 졸업생: 졸업생 이메일·졸업증명·동문회 연동·이전 인증 이력, 데모 코드 `123456` 또는 즉시 인증) → 현재 상태(학부·석사·박사·졸업) → 기본 프로필(사진·이름·전공·졸업연도) → 관심사(≤5) → 지역(거주 도시 + 활동 지역) → **무엇을 찾고 있나요?**(어떤 사람 · 어떤 활동 → 추천 가중치) → 시간표(학생) 또는 현재 직업(졸업생).

**졸업 전환** (프로필 › 현재 상태가 바뀌었나요? → `/profile/status` → `/profile/status/career`, `api.users.setStage`): 새 계정 없이 연결·글·그룹·인증·활동 기록 유지, 거주 도시·하는 일만 입력 → 헤더 "동문 ✓", 홈·추천 우선순위가 졸업생 기준으로.

**한국/미국 맥락** (`@core/lib/locale-context`): 언어 전환이 데이터셋(연세·서울대·KAIST ↔ Berkeley·Stanford·NYU)과 함께 인증 방법·도시·업종·직무·학년 표기·검색 프리셋·그룹 예시를 바꾼다.

**검색** (`src/pages/search/SearchPage.tsx`): People · Groups · Events · Posts · Opportunities. Explore 탭은 없다.

시간표는 Profile › Schedule(`/timetable`)에서 편집하고 Home·Meet 추천에 쓴다. 수업을 탭하면 **수업 공간**(`src/pages/classes/ClassPage.tsx`)이 열려 같은 수업 학생과 Study Crew를 본다. **Plan Together**(`src/pages/together/*`, `api.together`)는 모임 › 일정에서: 후보 시간 투표 → 확정 → 활동 + 그룹 채팅.

## 수익 모델 (`/pricing` 페이지에 근거와 함께 상세, `@core/lib/monetization`)

**사람을 만나는 데 돈을 받지 않는다** (PRD 7·22절 v2): 추천 사람·타학교 사람·동문 보기, 기본 검색(키워드 + 필터 1개), 연결 요청 30/일, DM, Feed 읽기/쓰기, Group·Meet 생성/참여, 기본 프로필. 유료는 "원하는 사람을 더 빠르고 정확하게 찾는 것"만.

| 상품 | 가격(KR / US) | 무엇을 사나 |
| --- | --- | --- |
| **A. AroundU+** | ₩7,900/월 · ₩64,900/년 · 학기권(4개월) ₩24,900 / $5.99 · $49.99 · $19.99, 7일 무료 | 복수 조건 검색, 상세 조건(업종·직무·회사·졸업연도·활동 지역), 검색 저장, 새 사람 알림, 연결 요청 무제한, 고급 추천, 광고 없음 |
| **B. Boost** | Profile 24h ₩2,900 · Meet 24h ₩4,900 · Post Community ₩10,000–30,000 · Post Cross-network ₩50,000–150,000 · Group 주 ₩30,000 | 추천 덱·모임·피드에서 추가 노출 |
| **C. Promoted Opportunity** | 1학교 1주 ₩100,000 · 3학교 ₩250,000 · 전국 2주 ₩500,000 (+타겟팅 20%) | 기업·연구실·프로그램이 홈 › 기회와 피드에 노출 (CPM ≈ ₩950) |
| **D. Sponsored Experience** | 오피스아워·회사 방문 ₩500,000 · 워크숍 ₩1,000,000–1,500,000 · 리서치 나이트·해커톤 ₩2,000,000–3,000,000 | 기업이 모임을 직접 운영, RSVP·opt-in 연락처·리포트 |
| **E. Sponsored Post · Partner Deal** | 캠퍼스당 주 ₩150,000 · 제휴 딜 카드 주 ₩50,000 | 4개 글마다 1개, 하루 최대 3광고주, 배너 없음 |

모두 **모의 결제**(실제 과금 없음). 앱에서는 사람 › 찾기의 자물쇠(조건 2개 이상·상세 조건), 연결 요청 30회 초과, 검색 저장·알림, 설정, `/plus` → `/plus/checkout`, Feed › 내 글 Boost, `/pricing`에서 진입.

## Open Slot · 소셜 RSVP (`src/pages/plans`, `src/components/social`, `src/lib/social.ts`)

- Who's free right now?(친구·같은 행사·같은 조직·"새로운 사람에게 공개"만 노출, 남은 공강 시간만 표시), 오늘의 질문, 친구들의 계획 피드(의도 기반, 사진 없음), Campus Pulse(집계값만)는 Discover › Now 하단에. 지도는 활동 카드의 "지도" 버튼과 활동 상세에서만 열림
- Open Slot: 시간표에서 공강을 탭하면 "이 시간에 무엇을 하고 싶어요?" → 공개 범위 → 활동 생성. 그 시간에 시간이 맞는 사람과 근처 활동을 함께 보여줌. `+` 메뉴의 "내 공강 열기"와 시간표 상단 "오늘 공강에 끼워 넣을 수 있는 것"에서도 진입
- 소셜 RSVP: 관심 / 갈 예정 / 혼자 가요 / 같이 갈 사람 찾아요 / 팀 찾는 중 / 이미 신청 / 참여 경험 있음. 혼자·같이 갈 사람 찾는 사람이 "함께할 사람" 탭 상단에 오고 "같이 가기 제안"으로 연결
- 사진: `public/photos/` (MIT 템플릿 저장소의 Unsplash 계열 인물·풍경 + ImageNet 샘플 몇 장). 공개 서비스 전에는 라이선스 확인된 사진으로 교체 필요

## 한국어 / English

- 시작 화면 오른쪽 위 또는 설정 → 언어에서 전환. `src/i18n/index.ts`의 `t('한국어')`가 `src/i18n/en.ts` 사전으로 번역합니다.
- 영어 모드는 미국 캠퍼스(UC Berkeley) 시드 `src/data/seed.en.ts`를 사용합니다. Greek life(소로리티·프래터니티) 조직, .edu 인증, 달러 표기가 포함됩니다.
- mock DB는 언어별로 분리 저장됩니다 (`aroundu.mockdb.v3.ko` / `.en`).

## 이번 주 뭐 하지? · 공고 (`src/pages/opportunities`, `src/lib/recommend.ts`)

- Community › Opportunities에 나에게 맞는 / 공고 / 저장·지원 / 유형별. 행사·동아리·해커톤·창업은 Discover › Activities·Teams에도 노출되고, 장학금·인턴·연구실 공고는 목록에만 가볍게 노출. 누구나 링크·제목만으로 기회 공유 가능(`api.opportunities.create`)
- 같이 가는 종류에만 관심 ♥ / 같이 갈래요 / 사람 찾기가 붙고, 공고류는 저장·마감 알림·지원 완료만 제공
- 관심 있음 / 지원 예정 / 지원 완료 / 저장, 마감 알림, Q&A와 후기(결과 공개 선택)
- "함께할 사람" 탭: 같은 기회에 관심 있는 사람과 왜 맞는지(역할·목표·공강·수업) 표시, 팀 제안 → 활동 생성으로 연결
- 홈 "나에게 맞는 기회"는 이번 학기 목표·관심사·제공 가능 역할·관심 조직 기준으로 점수화

## 개인 맥락과 추천 (`src/pages/profile/ProfileContextPage.tsx`)

- 온보딩에서는 이번 학기 목표와 "어떤 사람을 만나고 싶어요?"만 묻고, 찾는 사람·제공할 수 있는 것·생활권·관심 조직은 프로필에서 나중에 채움
- 프로필 완성도 11항목, 완성도가 높을수록 추천 노출 가중치(최대 1.5배)
- 사람 카드와 프로필에 구체적인 추천 이유 표시 (같은 기회, 역할 보완, 같은 수업, 공강 겹침, 같은 생활권, 공통 관심사)

## 시간표 (`src/pages/timetable`, `src/lib/timetable.ts`)

- 주간 시간표에 수업 추가·수정·삭제 (빈 칸 탭 또는 수업 추가 버튼), 색상·강의실·교수 입력
- 이번 주에 참가하는 활동을 점선 블록으로 함께 표시
- 지금 상태(수업 중·공강·오늘 수업 끝)를 자동 계산해 사람 카드와 프로필의 활동 가능 시간에 반영
- 오늘 공강이 겹치는 친구 목록과 가장 긴 겹침 시간으로 활동 만들기(시작·종료 시간 미리 채움)
- 공개 범위: 다른 사용자에게는 공강 여부만 보이고 전체 시간표와 강의실은 비공개

## 프로필 질문 (`src/data/prompts.ts`)

Hinge식 구조를 캠퍼스 맥락으로 옮겼습니다.

- 텍스트 질문 3개 필수, 최대 6개 (질문 풀 21개, 6개 카테고리)
- 음성 질문 1개 선택 (데모에서는 녹음 길이만 저장)
- 투표형 질문 1개 선택 (방문자가 한 표씩 투표)
- 첫 번째 답변은 홈 사람 카드에, 전체는 프로필 상세에 표시
- 프로필 완성도 7항목을 채우면 "프로필 완성" 배지
- 온보딩 5단계에서 입력, 프로필 → 질문 답변 편집에서 수정

## 핵심 규칙 (`src/lib/relations.ts`)

- **공개 범위**: 전체 / 같은 학교 / 특정 학과·조직 / 친구 / 선택한 사람만 / 비공개 — 활동·게시물·프로필 항목별 적용
- **메시지 조건**: 친구 · 상호 관심 · 활동 참가 승인 · 제안 수락 중 하나가 성립해야 대화 가능 + 차단·수신 설정 확인
- **관심 ♥**: 상대에게 공개되지 않으며 서로 표시했을 때만 매칭 안내
- **친구 요청 거절 / 제안 거절**: 요청자에게 알림·사유를 보내지 않음
- **지도**: 사용자 위치는 표시하지 않고 활동 장소만 표시

## 데모 편의 기능 (mock 전용)

- 지민·하나·유나·서연에게 보낸 친구 요청은 5초 후 자동 수락
- 지민·수아·서연에게 보낸 활동 제안은 5초 후 자동 수락
- 우진·하나가 주최한 승인제 활동은 참가 신청 5초 후 자동 승인
- 1:1 채팅에서 메시지를 보내면 2~3초 후 상대가 답장
- 설정 → 데모 도구 → **오류 상태 미리보기**로 오류 화면 확인

## 아직 구현되지 않은 것

- 실제 백엔드·인증·이메일 발송, 실제 사진 업로드(이모지 카드로 대체)
- 쇼츠/짧은 영상, 학교 수강편람 연동(시간표는 직접 입력), 유료 광고, 정교한 AI 추천, 직장인 모드(데이터 모델만 확장 가능하게 설계)
- 활동 시작 전 푸시 알림 스케줄링, 활동 주최자·참가자 평가/후기(구조만 예약)
- 조직 페이지 생성·편집 UI, 조직 가입 승인 처리
- 활동 후 "오늘 어땠어요?" 피드백(추천 가중치), 학교 LMS·캘린더 연동, Plan Together 마감 자동 처리·알림 스케줄링
