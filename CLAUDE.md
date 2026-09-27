# AroundU — 작업 규칙 (Claude Code / 협업자용)

## 제품 한 줄
**Start with your university. Expand your circle.** 대학생 커뮤니티·데이팅·취업 앱이 아니라 *social discovery network*. 학교라는 신뢰 네트워크에서 시작해 사람을 발견하고 → 실제로 만나고 → 연결을 유지하고 → 졸업 후에도 서클을 넓힌다. 전체 PRD: `docs/PRD.md`.

## 저장소 구조 (npm workspaces)
| 위치 | 역할 | import |
| --- | --- | --- |
| `packages/core/src` | 타입 · API 계약 · **엔진(도메인 로직)** · mock/remote API · 스토어 · i18n · 시드 · 순수 헬퍼(`lib/*`) | `@core/...` |
| `src/` | 웹 앱 (React 19 + Vite + Tailwind v4, react-router v7) — 화면만 | `@/...` |
| `apps/mobile` | Expo(React Native) 앱 — 화면만, core 공유. **PRD 5탭 구조는 아직 웹만 반영**(모바일은 이전 구조) | `@/...` = `apps/mobile/src` |
| `server/` | Express + Postgres(Railway). 같은 엔진을 서버에서 실행 | — |

### 반드시 지킬 것
- 공유 로직은 `packages/core/src`에, import는 `@core/...`. 웹 전용은 `src/`와 `@/...`. `src/lib/icons.tsx`, `src/lib/assets.ts`는 웹 전용이라 `@/lib` 유지.
- **API 메서드 추가·수정은 `packages/core/src/api/engine.ts`** (mock과 서버가 같이 씀). `api/mock/index.ts`, `api/remote/index.ts`에 도메인 로직을 쓰지 않는다. 서버 권한 규칙은 `server/index.ts`의 `RULES`에 메서드마다 한 줄 추가.
- 타입은 `packages/core/src/types/index.ts`, API 계약은 `packages/core/src/api/types.ts`.
- core는 브라우저·RN API를 직접 쓰지 않는다. 저장소·환경변수·자산은 `@core/platform`(`getPlatform()`) 어댑터로. (`import.meta`, `localStorage`, `window` 금지)
- 시드 스키마가 바뀌면 `api/mock/db.ts`의 `DB_VERSION` 을 올린다 (현재 v12).
- 문구는 한국어 원문을 키로 `t('한국어')`, 영어는 `packages/core/src/i18n/en.ts`(또는 화면 영역별 `i18n/v2/*.ts`)에 추가. 미번역 키 점검: 스크래치패드 `missing.mjs` 패턴(`t()` 키 ↔ `en.ts` 비교).
- **커밋 전** `npm run typecheck && npm run typecheck:server && npm run build` 모두 통과. 모바일을 건드렸으면 `cd apps/mobile && npx tsc --noEmit && npx expo export --platform ios`.
- 브랜치는 새로 파지 않고 지정된 작업 브랜치에서 계속. 배포 브랜치(`claude/friendly-euler-emuo1f`, Railway)로는 제품 오너가 합친다.

## 앱 구조 (PRD 4절)
하단 5탭 **Home | People | Meet | Feed | Profile**. 가운데 + 버튼 없음. DM은 헤더 오른쪽 메시지 아이콘.
| 탭 | 질문 | 웹 파일 |
| --- | --- | --- |
| Home — 오늘 대시보드 | 오늘 나에게 뭐가 있나 | `src/pages/home/HomePage.tsx` (`@core/lib/home`: `homeToday`, `alumniHome`) |
| People — **추천 \| 찾기 \| 연결** (학교로 나누지 않음, 타학교 무료) | 누구를 만날까 | `src/pages/people/{PeoplePage,PeopleResultsPage,PersonPage}.tsx` (`@core/lib/people`, `recommend`, `network`) |
| Meet — **추천 \| 그룹 \| 일정** (그룹은 자유 성격, 모임은 시간·장소·인원·공개 범위만) | 무엇을 같이 할까 | `src/pages/meet/{MeetPage,CreateMeetPage}.tsx`, `src/pages/groups/CreateGroupPage.tsx`, `src/pages/org/OrgPage.tsx` (`@core/lib/meet`) |
| Feed — **추천 \| 내 학교(재학생만/전체) \| 팔로잉**, 공개 범위 전체/내 학교/특정 그룹/팔로워 | 무슨 이야기가 오가나 | `src/pages/feed/{FeedPage,PostDetailPage}.tsx`, `src/pages/create/CreatePostPage.tsx` (`@core/lib/feed`) |
| Profile — 현재(거주·활동 지역·하는 일) · 추천 설정(wants) · "현재 상태가 바뀌었나요?" | 나는 지금 어떤 사람인가 | `src/pages/profile/{ProfilePage,WantsPage,StatusPage,StatusCareerPage,EditProfilePage}.tsx` |
온보딩 9단계 `src/pages/onboarding/*` (학교 → 인증(방법 여러 개) → 상태 → 기본 프로필 → 관심사 → 지역(거주·활동) → 무엇을 찾나 → 시간표/현재 직업). AroundU+ 설명·결제 `src/pages/plus/*` (`/plus`, `/plus/checkout`), 과금 상세 `src/pages/pricing/PricingPage.tsx` (`/pricing`). **개발자 스펙: `docs/UX-SPEC.md`** (화면 계층·추천 가중치·필터·공개 범위·전환·36화면 표).
- 추천은 `@core/lib/recommend` `matchReasons`(단계별 `REASON_WEIGHTS` + `wants` 부스트)와 `@core/lib/people` `recommendPeople` 로만 만든다. 카드에는 항상 이유 칩(`ReasonChips`)을 보여준다.
- 거주 지역 `homeCity` ≠ 활동 지역 `activityCity` ≠ GPS. 도시 단위만, 주소 금지. `cityOf(u)` 사용.
- 네트워크 요청(사람 찾기 › 네트워크에 물어보기)은 `@core/lib/requests`(전달 대상·추천·받은 요청) + `@core/lib/graph`(촌수) + 엔진 `requests.*`. 지인 추천 후보는 본인이 '관심 있어요' 하기 전까지 요청자에게 공개하지 않는다(`server/view.ts sanitizeRequest`).
- 네트워크 16화면(UX-SPEC 6.7): 사람을 보여줄 때 이유 → 촌수·공통 연결 → 경로 → 프로필 순. 공개 범위는 반드시 `@core/lib/privacy` `profileView`/`connectionStatus` 로 마스킹. 섹션마다 `useSectionState` + `Section/SectionSkeleton/SectionError/SectionEmpty` 로 로딩·부분 오류·빈 상태. 자연어 찾기 `@core/lib/nlsearch`, 2촌·소개 `graph.secondDegree` + 엔진 `intros.*`, 주변·방문 예정 `around.whoIsAround`, 작은 모임 `meet.recommendSmallTables`.
- 한국/미국 맥락 프리셋은 `@core/lib/locale-context` `localeContext()` (인증 방법·도시·업종·직무·전공·프리셋).

## Free vs Premium (PRD 7·22절 v2 — 절대 유료화 금지 목록)
**사람을 만나는 데 돈을 받지 않는다.** 무료: 추천 사람 보기, **타학교 사람 보기**, 동문 보기, 기본 검색(키워드 + 필터 1그룹), 기본 연결 요청(하루 30회, `FREE_SWIPES_PER_DAY`), 모임·그룹 참가·생성, Feed 읽기/쓰기, 메시지, 기본 프로필.
유료(**AroundU+**, 모의 결제): 복수 조건 검색(필터 2그룹 이상), 상세 조건(회사·업종·직무·졸업연도·활동 지역), 검색 저장, 새 사람 알림, 연결 요청 무제한, 고급 추천, 광고 없음. 판정은 `@core/lib/people` `isAdvancedSearch`. 학생·졸업생 같은 기준. 그 외 Boost·Promoted Opportunity·Sponsored Experience·Sponsored Post. 상수·가격은 `@core/lib/monetization`.

## 디자인
Stitch **Pastel Breeze** 유지 (`design/stitch/DESIGN.md`, 참고 화면 `design/stitch/*.png`): 흰 배경, 알약 모양, 슬레이트 코발트 `#0F2B48` 액션, 파스텔 블루 `#A3D5FF`/`#BFF4FF`/`#D2E4FF`, Plus Jakarta Sans. 글은 최소한으로.
용어: **Connect · Meet · Invite · Why you might connect**. 하트·"좋아요"·"매칭"·romantic 언어 금지(데이팅 앱 아님). 직함·이력으로 시작하지 않음(LinkedIn 아님).

## 데모 편의
mock API(localStorage/AsyncStorage). 데모 계정 자동 로그인, 언어 전환(KO 한국 대학 / EN 미국 대학 — 데이터셋이 바뀜), 설정 › 데모 도구(데이터 초기화·플랜 초기화·연결 요청 카운트 초기화·재학생으로 되돌리기·새 사람 알림 시뮬레이션). 이메일 인증 코드 `123456`.

## 검증·배포
- 웹 스모크: Playwright 스크립트는 스크래치패드(`e2e.mjs` 패턴, 400×820, KO/EN).
- 정적 데모: `npm run build:static` → `dist-static` → 아티팩트(웹 데모 `TEurmk2Jeu9rpZybr6f8xt`, 앱 미리보기 `5VY8rScEoAFjEQd1onvCQq`)에 재게시.
- 모바일: `apps/mobile` README 절 참고 (`start-mobile.ps1`, Expo Go, SDK 57).
