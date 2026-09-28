# AroundU UX 스펙 v2 — 검증된 대학 관계망에서 시작해, 졸업 후에도 확장되는 네트워크

> 개발자가 그대로 구현할 수 있는 수준의 화면 계층·내비게이션·카드·버튼·필터·상태 변화·흐름 정의. 제품 정의는 `docs/PRD.md`(v2 보완 절), 작업 규칙은 `CLAUDE.md`, 색·타이포는 `design/stitch/DESIGN.md`(Pastel Breeze).
> 웹 데모(`src/`, 400×820 모바일 레이아웃)가 이 스펙의 프로토타입이다. 로직은 전부 `packages/core/src`에 있어 모바일(Expo)에서도 같은 함수를 쓴다.
> 게시물 예시 문안은 이 문서에 넣지 않는다. 사용자가 무엇을 쓸지는 사용자에게 맡기고, 앱은 **어떤 환경에서 글이 보이는가**만 설계한다.

## 0. 정체성 — 5초 테스트

사용자는 어느 화면을 열어도 이렇게 느껴야 한다.

> "검증된 대학 관계망에서 시작해서, 지금 나와 관련 있는 사람을 발견하고, 졸업 후에도 그 관계를 계속 확장하는 서비스구나."

| 화면 | 5초 안에 보이는 것 |
| --- | --- |
| 시작 | "같은 대학에서, 더 넓은 세상으로." + 내 학교 → 관심사·활동 → 직업·지역 → 더 넓은 관계 (4개 알약) |
| 홈 | 상단에 **연세대학교 ✓** (졸업생은 **연세대학교 동문 ✓ · 2018 졸업 · 서울 · AI / Product**) |
| 사람 | 사진 위에 **이유 칩**(같은 학교 · 같은 전공 · 같은 지역) — 사진보다 맥락이 먼저 |
| 모임 | 추천 이유 한 줄("하고 싶은 활동 · 내 학교") — 모임은 사람 사이의 연결을 행동으로 잇는 수단 |
| 피드 | 세그먼트 **추천 | 내 학교 | 팔로잉** — 인증된 학교 구성원의 글이 따로 있다 |
| 프로필 | **연세대학교 ✓** 배지 + "현재" 카드(거주·활동 지역·하는 일) + 추천 설정 |

우선순위: **사람 → 맥락 → 신뢰 → 연결**. 금지: 하트·좋아요·매칭 % (데이팅), 직함·이력이 먼저 나오는 카드(LinkedIn), 익명 게시판 톤(커뮤니티 앱). 30대 졸업생이 써도 어색하지 않은 톤.

Meetup(모임 → 사람)과 달리 AroundU는 **사람 → 관계 → 필요하면 모임**. 그래서 하단 탭 순서도 홈 · **사람** · 모임 · 피드 · 프로필이고, 홈의 첫 섹션(일정 다음)이 "지금 연결할 수 있는 사람"이다.

## 0-1. 부담 없는 앱 — 관리하게 하지 말고, 알아서 가볍게 발견시킨다 (v2.1)

AroundU 가 주는 느낌은 "인맥을 만들어야 한다"가 아니라 **"어? 내가 몰랐던 괜찮은 사람이 생각보다 가까이 있었네."** 앱은 관계를 관리하는 도구가 아니라 관계가 우연히 생기기 쉬운 환경이다. 아무것도 안 해도 되는 앱이어야 한다.

| 하지 않는 것 | 대신 |
| --- | --- |
| "네트워크를 확장하세요", "이번 주 목표: 5명 연결", "프로필이 70%밖에…" | 홈 **오늘 주변에서** — 아는 사람을 통해 이어진 사람 3명 · 이번 주 서울에 있는 사람 2명 · 지금 커피에 열려 있는 사람 1명 (`lib/around.ts aroundToday`) |
| 카드를 보면 연결·팔로우해야 할 것 같은 압박, 스와이프 | **보기 → 저장 → 나중에 연결**. 행동 3단계: 저장(가장 가벼움, 나만 봄, 알림 없음) · 관심(팔로우) · 연결(실제 관계). 팔로워 수는 프로필 전면에 없다 |
| "네트워크에 요청을 게시하세요" | 사람 탭 "혹시 찾는 사람이 있나요?" 한 줄 → AroundU 가 조용히 "가까운 네트워크에서 4명을 찾았어요" → 부족할 때만 "건너건너 물어볼까요?" |
| 받은 요청에 응답 압박·읽음 표시 | "혹시 여기에 해당되나요?" [저요] [아는 사람 있어요] [넘기기]. 응답 안 해도 불이익 없음, 읽음 표시 없음 |
| Open to networking / mentorship / business opportunities | 상태 한 줄 "☕ 이번 주 커피 가능", "🏃 주말 러닝 가능" — 기간이 지나면 자동으로 꺼짐 (`lib/status.ts`) |
| Mutual Room 을 회의실처럼 (관계 강화·미팅 예약) | 그냥 DM 이 열리고 위에 작은 카드 "둘이 겹치는 것 · 연세대 · AI · 서울 · 공통 연결 2명" |
| "이 사람과 단둘이 커피챗 하세요" | **작은 모임**(4~6명) — "둘 다 참여할 수 있는 작은 모임이 있어요" (`sharedSmallTables`) |

어휘: 네트워크 확장 → **새로운 사람** · 네트워크 요청 → **사람 찾아보기** · 네트워킹 이벤트 → **작은 모임** · 소개 요청 → **연결해줄 수 있나요?** (화면 문구에서 '네트워킹'을 쓰지 않는다)

## 1. 가입 구조 · 학교 인증

가입 조건: 현재 대학생·대학원생 또는 특정 대학 졸업생. **최소 한 개의 학교 소속 확인**을 완료해야 앱에 들어온다(건너뛰기 없음). 다른 대학 사람을 보는 것은 무료 — 가입은 대학 기반, 관계 형성은 대학을 초월.

### 1.1 온보딩 화면 (9단계, 진행바 n/9)

| # | 라우트 | 화면 | 입력 | 저장 필드 (`RegisterInput`) | 다음 |
| --- | --- | --- | --- | --- | --- |
| 1 | `/welcome` | 시작 | — | — | [시작하기] → 2 · "이미 계정이 있나요? 로그인" · 데모 로그인 |
| 2 | `/onboarding/school` | 학교 선택 | 검색 + 학교 리스트 | `schoolId` | 선택 즉시 3 |
| 3 | `/onboarding/verify` | 학교 인증 | 인증 방법 카드 (§1.2) | `verification`, `emailVerified` | 1개 완료 시 [다음] 활성 |
| 4 | `/onboarding/stage` | 현재 상태 | 학부생 / 대학원생(석사·박사) / 졸업생 | `stage`, `role` | 5 |
| 5 | `/onboarding/basic` | 기본 프로필 | 사진 · 이름 · 전공(권장) · 졸업(예정)연도 · 생년 · 이메일 | `avatar, nickname, department, gradYear, birthYear, email` | 6 |
| 6 | `/onboarding/interests` | 관심사 | 칩 최대 5개 (AI 창업 러닝 디자인 금융 여행 …) | `interests` | 7 |
| 7 | `/onboarding/region` | 지역 | 거주 도시 칩/검색 + 활동 지역(선택) | `homeCity, activityCity` | 7b |
| 7b | `/onboarding/wants` | 무엇을 찾고 있나요? | 어떤 사람 (≥1) · 어떤 활동 (≥1) | `wants` (→ `openTo` 파생) | 학생 8 / 졸업생 9 |
| 8 | `/onboarding/schedule` | 시간표 (학생만) | 수업 추가 / 샘플 / 불러오기(포털·캘린더·이미지) / 나중에 | `timetable` | [시작하기] |
| 9 | `/onboarding/career` | 현재 직업 (졸업생만) | 회사(선택) · 업종 칩 · 직무 칩 | `career{company,industry,role}` | [시작하기] |

원칙: 최초 가입은 **학교 인증 · 상태 · 지역 · 전공 또는 하는 일 · 관심사 몇 개 · 찾는 것**까지만. 프로필 질문·목표·생활권·시간표 상세 등은 프로필 "더 알려주기"에서 점진적으로.

### 1.2 인증 방법

| 대상 | 방법 (`VerificationMethod`) | KO 문구 | EN 문구 | 데모 동작 |
| --- | --- | --- | --- | --- |
| 재학생 | `school_email` | 학교 이메일 인증 (@yonsei.ac.kr) | School email (@berkeley.edu) | 코드 `123456` |
| 재학생 | `sso` | 학교 포털 SSO 로그인 | Campus SSO (CalNet, Shibboleth) | 즉시 인증 시트 |
| 재학생 | `student_id` | 학생증 인증 (모바일 학생증·사진) | Student ID upload | 즉시 |
| 졸업생 | `alumni_email` | 졸업생(평생) 이메일 인증 | Alumni (lifetime) email | 코드 `123456` |
| 졸업생 | `diploma` | 졸업증명서·학위증 | Diploma / transcript | 즉시 |
| 졸업생 | `alumni_association` | 학교·동문회 연동 | Alumni association account | 즉시 |
| 졸업생 | `prior_student` | 이전 AroundU 재학생 인증 이력 (가장 쉬움) | Verified as a student before | 즉시 |
| 졸업생 | `vouch` | 동문 보증 — 인증된 같은 학교 사람 2명 | Vouched by alumni | 즉시 |

저장: `User.verification = { method, at }`, `affiliation.emailVerified = true`. 표시: 프로필·카드·헤더에 **학교명 ✓** (툴팁 = 인증 방법, `verificationLabel`). 졸업생은 "학교명 동문 ✓". 프로필 편집 › 학교 카드에서 "다른 방법으로 인증"으로 추가 인증 가능.

## 2. 사용자 상태 모델

`Stage = undergrad | masters | phd | alumni | professional` (`stageOf(u)`; `professional`은 alumni 취급). 화면 분기는 **세 갈래** — `stageKind(u) = undergrad | grad(masters·phd) | alumni` (`lib/stage.ts`). 같은 5탭 구조, 같은 계정이지만 **무엇을 먼저 보여주고 무엇을 쓰기 쉽게 하는지가 다르다** (v2.3).

| | 학부생 (undergrad) | 대학원생 (masters · phd) | 졸업생 (alumni · professional) |
| --- | --- | --- | --- |
| 헤더 | 학교명 ✓ · 학부생 · 경영학과 3학년 | 학교명 ✓ · 석사 · 컴퓨터과학과 + 🔬 NLP · 자연어처리 연구실 · 2년차 | 학교명 동문 ✓ · 2018 졸업 · 서울 · AI / Product |
| 홈 (`lib/home.ts`) | `homeToday`: 오늘 일정(수업·공강) → 지금 가까운 사람 → 학교에서 일어나는 것 → 나에게 맞는 모임 → 지금 열린 만남 → 새로운 사람 → 기회 | `gradHome`: 이번 주 연구 일정(세미나·리딩 그룹·학회) → 같은 연구 분야(다른 학교 포함) → 먼저 간 사람(박사·그 분야 선배) → 모임 → 오늘 일정(있을 때만) → 같은 학교 사람 → 기회(연구실·인턴) | `alumniHome`: 새로운 사람 → 내 지역 → 내 분야 → 이번 주 모임 → 관계망 소식 → 내 그룹 → 기회 |
| 추천 가중치 (`REASON_WEIGHTS`) | 학교 3 · 전공 3 · 수업 3 · 공강 3 · 관심사 2 · 연구 2 | **연구 분야 5** · 학교 2 · 전공 2 · 다른 학교 2 · 공통 연결 2 · 공강 1 | 지역 4 · 분야 4 · 직무 3 · 학교 2 · 동문 2 · 연구 2 · 공강 0 |
| 이유 칩 순서 | 같은 학교 → 전공 → 수업 → 공강 | **같은 연구 분야** → 학교 → 전공 → 공통 연결 | 지역 → 분야 → 동문 |
| 사람 탭 추천 첫 섹션 | 지금 가까운 사람 (같은 학교·전공·공강) | 같은 연구 분야 · NLP (다른 학교 연구실까지) | 가까운 동문 (같은 도시·분야·학교) |
| 찾기 프리셋 (`searchPresets`) | 같은 전공 · 다른 학교+창업 · 동문 · AI+도시 | NLP 대학원생 · 다른 학교 연구실 · 박사과정 · AI 업계 선배 | 뉴욕+금융 · 학교+도시+AI · Product+도쿄 · 동문+도시 |
| 모임 탭 추천 | "지금" 스트립(공강 열기 · 제휴 · 지금 열린 만남) · 예시 점심 같이 / 시험 스터디 / 동아리 구경 | 공강 바 없음 · 칩 "연구·스터디" · 세미나·스터디 먼저 · 예시 논문 리딩 그룹 / 학회 같이 가기 / 대학원생 진로 커피 | 공강·제휴 없음 · 칩 지역·관심사·동문 · 커피·식사·작은 모임 먼저 · 예시 퇴근 후 커피 4명 / 주말 러닝 / 동문 저녁 |
| 피드 컴포저 (`composerPrompts`) | "무슨 일이 있나요?" · 수업·과제 질문 · 같이 밥·공부 · 동아리·행사 후기 · 장학금·공모전 정보 | "연구하면서 나누고 싶은 게 있나요?" · 연구 질문 · 리딩 그룹·세미나 · 학회 같이 가요 · 협업·공동연구 · 진로 고민 | "요즘 어떻게 지내요?" · 근황 · 이 도시에서 만나요 · 후배 질문 받아요 · 이번에 가요 · 채용·추천 정보 |
| 피드 "내 학교" 범위 (`campusScopes`) | 재학생만 / 학교 전체 | **대학원** / 재학생 / 학교 전체 (기본 대학원) | 탭 이름 "내 학교·동문" · **동문** / 학교 전체 (기본 동문) |
| 피드 추천 순서 (`feedForYou`) | 같은 단계 글 +1.5 · 선배의 "후배 질문 받아요"·채용 +1 | 같은 연구 분야·그 분야 선배의 글 +2 · 같은 단계 +1.5 | 같은 분야 +1.5 · 같은 단계 +1.5 · 학부 수업 질문 −1.5 |
| 프로필 | "이번 학기" 카드(전공 · 학년 · 거주·활동 도시) · 시간표 | **"연구" 카드**(분야 · 연구실 · N년차 · 세부 주제 · 지도교수는 켤 때만) · 시간표는 있을 때만 | "현재" 카드(도시 · 회사 · 업종 · 직무) · 시간표 없음 |
| 온보딩 마지막 | 9 시간표 | 9 **연구**(분야 필수, 나머지 선택 · 나중에 가능) → 10 시간표(선택) | 9 현재 직업 |
| "무엇을 찾고 있나요?" 순서 (`peopleWantOptions`) | 같은 전공 · 같은 관심사 · 다른 학교 · 선배 | **같은 연구 분야** · 다른 학교 · 선배·멘토 · 같은 분야 직장인 | 같은 지역 · 같은 분야 · 동문 |
| 상태 변경 | "현재 상태가 바뀌었나요?" 카드 | 같음 (학위 후 졸업생 전환) | "상태: 졸업생 · 변경" 링크 |

**연구 정보** `User.research = { field, lab?, advisor?, showAdvisor?, year?, keywords? }` — 분야만 필수, 엔진 `users.setResearch`로 검증. 지도교수는 기본 비공개(`showAdvisor`), 서버 `sanitizeUser`가 꺼져 있으면 지운다. 연구실·지도교수는 추천 이유로 쓰지 않는다. 분야 ↔ 업계 연결(`researchMatchesCareer`: NLP → AI·ML, 로봇 → Robotics·AI, 바이오 → 헬스케어, 경제 → 금융)로 대학원생에게 "내 연구 분야에서 일해요" 선배를, 졸업생에게 "내 분야를 연구해요" 대학원생을 보여준다.
**데모**: 설정 › 데모 도구 › **단계 미리보기** (학부생 / 대학원생 / 졸업생) — 같은 계정으로 세 화면을 바로 비교한다. 대학원생은 NLP 예시 연구 정보를, 졸업생은 하는 일 예시를 함께 넣는다.

학년 표기: KO "3학년" / EN "Junior · Class of '26" (`classYearLabel`). 졸업연도는 KO "2018 졸업" / EN "Class of 2018".

## 3. 정보 모델 — 무엇을 받고 무엇을 받지 않나

| 구분 | 필드 | 필수/권장/선택 | 비고 |
| --- | --- | --- | --- |
| 공통 | 학교 `affiliation.schoolId` + 인증 `verification` | **필수** | 입장 자격 |
| 공통 | 전공 `affiliation.department` | 권장 | 추천 신호(같은 전공) |
| 공통 | 현재 상태 `stage` | 필수 | 학부 / 석사 / 박사 / 졸업 |
| 공통 | 관심사 `interests` (≤5 권장) | 권장 | 추천·모임·피드 신호 |
| 공통 | 거주 지역 `homeCity` | 필수 (기본값 = 학교 지역) | **도시·생활권 단위만**, 주소 없음 |
| 공통 | 활동 지역 `activityCity` | 선택 | 거주 성남 · 활동 서울 |
| 공통 | 찾는 것 `wants{people, activities}` | 권장 (≥1씩) | 추천 가중치 ×2 |
| 학생 | 학년/과정, 졸업 예정연도 `gradYear`, 시간표 `timetable` | 선택 | 공강 겹침 추천 |
| 졸업생 | 졸업연도 `gradYear`, 업종·직무·회사 `career` | 선택 | 분야 추천 |
| 별도 | GPS `settings.locationPermission` | 선택 | 거주 지역과 **분리**. 지도·즉석 만남에만 사용 |

"현재 GPS 위치 ≠ 거주 지역 ≠ 활동 지역" 세 가지를 절대 섞지 않는다. `cityOf(u) = homeCity ?? career.city ?? region`, `citiesOf(u) = [homeCity, activityCity]`.

## 4. 내비게이션 · 화면 계층

하단 5탭 **홈 · 사람 · 모임 · 피드 · 프로필** (EN Home · People · Meet · Feed · Profile). 가운데 + 없음. 메시지는 우측 상단 아이콘. 알림 종, 검색 돋보기도 헤더.

```
/ (홈)                    학생 홈 · 졸업생 홈 (같은 라우트, stage로 분기)
/people?tab=recommend     사람 › 추천 (한 장 카드 덱)
/people?tab=search        사람 › 찾기 (필터 8종 · 프리셋 · 저장한 검색)
/people/results?c=…       검색 결과 · [검색 저장]
/people/ask               네트워크에 물어보기 (요청 작성 · 두 엔진 미리보기)
/people/requests          받은 요청 | 내 요청 · /people/requests/:id 요청 상세 (요청자: 추천·응답·수락 / 받는 사람: 저예요·아는 사람·관심 없어요)
/people?tab=connections   사람 › 연결 (요청함 · 연결 · 팔로잉)
/users/:id                사람 상세 (우리의 공통점 · 찾고 있어요)
/meet?tab=recommend       모임 › 추천 ("지금" 스트립 + 추천 모임)
/meet?tab=groups          모임 › 그룹 (내 그룹 · 그룹 찾기)
/meet?tab=schedule        모임 › 일정 (오늘·이번 주·이후 + Plan Together·Study Crew·팀원 모집)
/meet/create?org=         모임 만들기 (단일 폼)
/groups/new               그룹 만들기
/orgs/:id                 그룹 상세 (소개 | 일정 | 멤버 | 피드)
/activities/:id           모임 상세 · /activities/:id/manage 주최자 관리
/feed?tab=foryou|campus|following   피드 · /feed/:id 글 상세 · /create/post 글쓰기
/profile                  프로필 · /profile/edit 편집 · /profile/wants 추천 설정
/profile/status           현재 상태가 바뀌었나요? → /profile/status/career
/profile/friends · /profile/groups · /plans · /timetable · /profile/prompts · /profile/context
/plus · /plus/checkout    AroundU+ 설명 · 결제 (모의)
/pricing                  과금 구조 상세 (투자자용)
/search?tab=people|groups|events|posts|opportunities   전역 검색
/chats · /chats/:roomId · /notifications · /settings
이전 구조 호환: /people/beyond, /people/search → /people?tab=search · /discover → /meet · /community → /feed
```

화면 간 이동 규칙
- 리스트 → 상세는 push, 상세의 주 행동(연결·참여·가입)은 그 자리에서 상태만 바뀐다(토스트).
- 홈의 모든 섹션은 2~4개 + "전체보기 →" 해당 탭(쿼리로 세그먼트 지정).
- 페이월은 시트로 뜨고, 결제는 `/plus/checkout` 풀스크린. 결제 완료 후 원래 하려던 곳(찾기)으로 돌아간다.
- 유료 기능이 잠긴 곳에는 자물쇠 배지를 미리 보여주고, 실행 버튼을 눌렀을 때만 시트를 띄운다(입력을 막지 않는다).

## 5. 홈 — 상황 압축 대시보드

홈은 피드가 아니다. "지금 나의 상황에서 볼 가치가 높은 것"을 섹션당 2~4개만.

### 5.1 학생 홈 (`homeToday`)
1. **정체성 블록** — 학교명 ✓ + `contextLine` (학부생 · 경영학과 3학년). 첫 이용이면 3단계 카드(추천 사람 보기 → 연결 요청 → 모임 참여).
2. **오늘 일정** — 오늘 수업 + 공강 카드 "3시간 비어요 · 같이 비는 사람 4명 · [같이할 사람 찾기]" (→ `/people?free=1`). 시간표 없음 → "시간표 추가" 카드.
3. **지금 연결할 수 있는 사람** (2~4) — `connectNow`: 공강 겹침·같은 학교 우선. 미니 카드: 사진 · 이름 · 학교 ✓ · 전공 · 이유 칩 2.
4. **학교에서 일어나는 것** (3) — 오늘의 학교 행사·동아리·공고(KO 동아리 박람회·축제·학회 / EN Club Fair·Rush·Football).
5. **나에게 맞는 모임** (3) — `recommendMeets`: 하고 싶은 활동 · 내 그룹 · 내 학교 · 지역. 타학교 공개 모임 포함.
6. **지금 열린 만남** — 있을 때만(기존 Now).
7. **새로운 사람** (3) — 다른 학교이거나 관심사가 겹치는 사람 → "찾기에서 더 보기".
8. **추천 기회** (3) — 기존 공고.

### 5.2 졸업생 홈 (`alumniHome`) — "내 관계망에 지금 어떤 변화가 있는가"
1. 정체성 블록 — 학교명 동문 ✓ · 2018 졸업 · 서울 · AI / Product
2. **새롭게 연결할 만한 사람** (4)
3. **내 지역에서 활동하는 사람 · 서울** (3) — `sameCity` (거주 또는 활동). 비어 있으면 "활동 지역 추가".
4. **현재 분야와 관련 있는 사람** (3) — `sameField` (업종 또는 직무). 비어 있으면 "직무·업종 추가".
5. **이번 주 참여 가능한 모임** (3)
6. **내 관계망 소식** (3) — 연결된 사람·가입 그룹의 새 글·새 모임
7. 내 그룹 · 추천 기회

빈 상태는 항상 행동 하나: 시간표 추가 / 찾는 사람 설정 / 활동 지역 추가 / 모임 만들기.

## 6. 사람 탭 — AroundU의 핵심

세그먼트 **추천 | 찾기 | 연결**. 학교 기준으로 나누지 않는다.

### 6.1 추천 (`recommendPeople`)
- 한 장씩 보는 카드 덱(가로 스냅). 카드 구성(위→아래): **이유 칩 1~3** (사진 위, 예: 같은 학교 · 같은 전공 · 같은 지역) → 사진 → 이름 · **학교 'YY ✓** → 전공 또는 직무·회사 → 거주 도시 → 관심사(공통 먼저) → "왜 추천되었나요" 2~3줄.
- 버튼: **Pass** (비용 없음) · **연결** (요청 카운트 소모) · **만남에 초대** (활동 제안 시트).
- 덱 위: "찾는 사람: 같은 관심사 · 동문 · [편집]" → `/profile/wants`. 우측 상단: "오늘 연결 요청 12/30" (Plus ∞).
- 소진 시: "오늘 추천은 여기까지" + [찾기에서 직접 찾기] [찾는 사람 바꾸기].

### 6.2 추천이 만들어지는 방식 (`lib/recommend.ts`)
`score = Σ(이유 가중치) × (1 + 프로필 완성도/200)`. 이유(`Reason.kind`)와 단계별 기본 가중치:

| 이유 | 신호 | 학생 | 졸업생 | 카드 문구 |
| --- | --- | --- | --- | --- |
| school | 같은 학교 | 3 | 2 | 같은 학교 |
| alumni | 같은 학교 동문 / 선배 | 1 | 2 | 연세 동문 · 같은 학교 선배 |
| major | 같은 전공 | 3 | 1 | 같은 전공 · 경영학과 |
| city | 거주 또는 활동 도시 겹침 | 1 | 4 | 같은 지역 · 서울 |
| field | 업종 또는 직무 같음 | 1 | 4 | 같은 분야 · AI |
| group | 같은 그룹 멤버 | 2 | 2 | 같은 그룹 · 서울 AI 러닝 크루 |
| meet | 같은 모임 참여 이력 | 2 | 2 | 같은 모임에 참여했어요 |
| mutual | 공통 연결 | 2 | 2 | 공통 연결 2명 |
| interest | 관심사 겹침 (개수 비례) | 2 | 2 | 같은 관심사 · AI·러닝 |
| class / time | 같은 수업 / 오늘 공강 겹침 (재학생끼리만) | 3 / 3 | 0 / 0 | 오늘 14:00–16:00 공강이 겹쳐요 |
| new | 다른 학교 / 다른 분야 | 1 | 1 | 다른 학교 · 서울대 |

- **wants 부스트**: `wants.people`에 해당하는 이유 ×2 (same_major→major, same_interest→interest, other_school·new_people→new, alumni→alumni, same_city→city, same_field→field), `senior_mentor`는 상대가 상위 단계면 +3 ("선배·멘토가 될 수 있어요").
- 표시 순서: 학생은 학교 → 전공 → 수업 → 공강 → 관심사 → 그룹…, 졸업생은 지역 → 분야 → 동문 → 학교 → 공통 연결 → 그룹…
- 역할 매칭·기회 이유는 점수에만 쓰고 카드에는 숨긴다(`shareableReasons`).
- Plus "고급 추천"은 같은 함수에 검색·행동 신호(저장한 검색 조건 일치, 최근 본 프로필)를 추가하는 확장 지점 — 데모에서는 wants 부스트까지.

### 6.3 찾기 (`searchPeople`)
- 검색창 "이름, 학교, 회사, 관심사" + **프리셋 칩** (졸업생: 뉴욕 + 금융 / 연세대 + 서울 + AI / Product + 도쿄 / 동문 + 서울, 학생: 같은 전공 / 다른 학교 + 창업 / 서울 동문 / AI + 서울; EN은 NYC + Finance 등) + **저장한 검색 칩**(종 = 알림 on).
- 필터 8행 (`SEARCH_GROUPS`): 학교(다중) · 전공 · 졸업연도(범위, **상세**) · 거주 지역 · 활동 지역(**상세**) · 회사/업종(**상세**) · 직무(**상세**) · 관심사 · 사용자 상태(학생/대학원/졸업생). 각 행은 바텀시트 칩 선택(+ 자유 입력).
- 학교는 여러 조건 중 하나일 뿐이다. 매칭 규칙은 `matchesSearch` (AND 결합, 그룹 안은 OR, 문자열은 부분 일치, 도시는 거주/활동 모두 검사).
- **무료/유료 판정** (`isAdvancedSearch`): 비어 있지 않은 필터 그룹 2개 이상 **또는** 상세 그룹 사용 → AroundU+. 무료 = 키워드 + 필터 1그룹. 행 옆 자물쇠 배지, "조건 n개 · 무료는 1개까지" 안내, [이 조건으로 검색하기]에서만 페이월.
- 결과 `/people/results`: "N명의 사람을 찾았어요" + 행(사진 · 이름 · 학교 'YY ✓ · 직무/전공 · 도시 · 관심사 · 이유 칩 · [+연결]) + [검색 저장 ☆] (Plus: 이름 + 새 사람 알림 토글 → `searches.save`).
- **새 사람 알림**: 저장한 검색의 `alert=true`면 조건에 맞는 사용자가 새로 들어올 때 `new_people` 알림 → 알림 탭 → 결과 화면. 데모: 설정 › 데모 도구 "새 사람 알림 시뮬레이션"(`searches.run`).

### 6.4 연결
요청함(받은 n / 보낸 n, 수락·거절·취소) → 연결된 사람(검색) → 팔로잉. 빈 상태 "아직 연결이 없어요 → 추천 보기". 연결 요청 한도: 무료 30/일(추천·찾기·프로필 어디서 보내든 같은 카운트, 엔진 `sendFriendRequest`가 강제), Plus 무제한.

### 6.5 사람 상세 `/users/:id`
사진 → 이름 · 학교 'YY ✓ → 전공 · 직무 · 회사 → 거주/활동 도시 → 관심사 → **우리의 공통점**(이유 전부) → **찾고 있어요**(상대 wants) → 소개·프로필 질문 → 그룹 · 참여한 모임 · 글. 하단 고정 [연결하기] [메시지] [만남에 초대]. 하트·팔로우 버튼은 하단에서 제거(팔로우는 ⋯ 메뉴).

### 6.6 네트워크에 물어보기 (Network Request) — 검색으로 잡히지 않는 사람까지

친구의 친구가 멋진 사람이면 나도 연결되고 싶다. 플랫폼이 몰래 골라 주는 것만이 아니라, **내 네트워크 건너건너에 공개적으로 요청을 던지고 해당되는 사람이 직접 손드는 구조**. 화면 이름은 그냥 **사람 찾기**.

```
사람 › 찾기 상단  "어떻게 찾을까요?"
  🔎 AroundU가 찾아보기   프로필과 네트워크를 바탕으로 적합한 사람 추천 (= 기존 찾기 필터)
  📣 네트워크에 물어보기   내 주변과 건너건너 네트워크에 요청 전달 (→ /people/ask)   둘 다 선택 가능
```

**요청 작성 `/people/ask`**: "이런 분을 찾고 있어요" 본문 + 맥락(도시 · 분야 · 관심사, 선택) + 전달 범위(1촌 / 2촌 / 3촌 + 관련 학교·업종·관심사). 작성하는 동안 두 엔진이 미리 답한다.
- 🔎 "조건과 가까운 사람 7명을 찾았어요" — `matchesForRequest`(프로필 관련성: 같은 지역 +3 · 같은 분야 +4 · 관심사 +1.5/개 · 본문 키워드가 소개·직무·회사·전공에 등장 +1/개, 촌수 안이면 +0.5).
- 📣 "관련 있는 2촌 네트워크 86명에게 요청을 전달할까요?" — `audienceForRequest`(촌수 안 사람 전부 + 범위 밖이어도 같은 학교·같은 분야·같은 도시·관심사 겹치는 사람).

**받는 사람 화면** (`/people/requests` 받은 요청 · 홈 "내 네트워크에서 찾는 사람" · 알림):
```
내 네트워크에서 이런 사람을 찾고 있어요
일본 식품 유통 경험이 있는 분
서울 · 유통 · 창업
김채연님의 네트워크에서 온 요청 · 2촌 거리
[저예요]  [제가 아는 사람이 있어요]  [관심 없어요]
```
| 행동 | 무엇이 일어나나 | 공개 범위 |
| --- | --- | --- |
| 저예요 (`requests.respond`) | 요청자에게 "박민수님이 이 요청에 응답했습니다 · 일본 식품 유통 5년 · 서울 · 공통 연결 2명". 요청자가 [수락]하면 서로 연결 + **Mutual Room**(DM) 생성 (`requests.decide`) | 손 든 본인만 요청자에게 보인다 |
| 제가 아는 사람이 있어요 (`requests.refer`) | 내 연결 중 관련성 높은 후보를 골라 전달. 후보에게 먼저 "지훈님이 이 요청이 당신과 잘 맞는다고 생각해 전달했습니다" | **후보 프로필은 본인이 [관심 있어요](`referralDecide`) 하기 전까지 요청자에게 넘어가지 않는다** |
| 관심 없어요 (`requests.dismiss`) | 이 요청을 다시 보지 않는다 | — |

**요청자 화면 `/people/requests/:id`**: 🔎 AroundU 추천 n명(연결 버튼) · 📣 응답 n(사람 · 한 줄 · 관련성 · 공통 연결 · "OO님 추천" · [수락]/[거절]) · 전달됨(n명에게 전달 · 지인 추천 진행 중 m건은 본인이 관심 있어요 하면 여기 나타남) · [마감].

왜 두 엔진인가: 직업은 PM인데 실제로 앱을 직접 만들어본 사람은 데이터로는 못 찾지만 요청을 보고 "어? 이거 나 할 수 있는데" 하고 손 들 수 있다. 검색 + 자발적 응답 + 지인 추천이 한꺼번에 돌아가 LinkedIn 검색보다 살아 있는 네트워크가 된다.

**촌수** (`lib/graph.ts`): 연결(친구) 그래프 BFS. 1촌 = 연결, 2촌 = 연결의 연결, 3촌까지. 카드에 "2촌 거리"와 경로(나 → 공통 연결 → 요청자)를 보여준다. 촌수는 연결 요청·팔로우와 별개로 계산되며, 요청 전달 범위 외에 추천 이유 "공통 연결 n명"에도 쓴다.

**서버 공개 규칙** (`server/view.ts sanitizeRequest`): 요청 본문·요청자는 전달 대상 모두에게, 응답 목록은 요청자와 응답자 본인에게만, 지인 추천은 후보 본인·추천한 사람에게만(요청자는 '관심 있어요' 뒤에 응답으로 본다). 데모: 요청을 올리면 관련 있는 시드 사용자 1~2명이 몇 초 뒤 손 들고, 1명은 지인을 추천한다.

**스와이프 vs 팔로우에 대한 결정**: 추천 카드 덱(한 장씩)은 "지금 나와 관련 있는 사람을 한 명씩 이유와 함께 보는" 용도로 유지하되, 연결 요청은 카드·검색 결과·프로필 어디서든 같은 버튼이고 팔로우는 별도(⋯ 메뉴)로 남긴다. 네트워크 요청이 붙으면서 "친구의 친구"는 촌수·공통 연결·요청 전달로 자연스럽게 드러나므로, 덱을 없애고 팔로우+추천 목록으로 갈지는 다음 라운드에 사용 데이터로 판단한다(덱은 `PeoplePage` 추천 탭 한 컴포넌트라 교체 비용이 작다).

**졸업생 인증 부담**: 졸업증명서는 실제로 떼기 힘드니 순서를 쉬운 것부터 둔다 — ① 이전 재학생 인증 이력(가장 쉬움) ② 졸업생 이메일 ③ **동문 보증**(이미 인증된 같은 학교 사람 2명이 보증, `vouch`) ④ 동문회 연동 ⑤ 졸업증명. 인증 전에는 검색·추천에 뜨지 않고 보기만 가능하게 두는 것이 원칙(데모는 즉시 인증).

## 6.7 네트워크 기능 16화면 (v2.2 — 사람 → 관계의 이유 → 연결 경로 → 실제 연결)

공통 원칙: 모든 화면은 내비게이션 · 카드 · 버튼 · 로딩(섹션 스켈레톤) · 빈 상태(다음 행동 1개) · 오류(부분 오류 + 재시도) · 알림(토스트) · 연결 상태 · 개인정보 상태를 가진다. 사람을 보여줄 때는 이름보다 먼저 **왜 추천됐는지 → 얼마나 가까운지(촌수·공통 연결) → 어떤 경로로 이어지는지**. 전화번호·개인 이메일·정확한 위치·실시간 위치는 데이터 모델에 없다(항상 비공개). 섹션 상태 헬퍼: `useSectionState` + `Section/SectionSkeleton/SectionError/SectionEmpty/PrivacyNote`. 데모: 설정 › 데모 도구 "부분 오류 미리보기"로 섹션 하나를 실패시킨다.

**연결 상태** (`lib/privacy.ts connectionStatus`): 팔로우 가능 `can_follow`(공개 범위 밖) · 연결 요청 가능 `can_request` · 요청 보냄 `requested` · 연결됨 `connected` · 차단됨 `blocked` · 비공개 `private`.
**공개 범위** (`profileView`): 전체 AroundU / 같은 학교 + 2촌(기본) / 연결된 사람만. 범위 밖이면 이름·학교·관심사만, 회사·도시·졸업연도·그룹·방문 예정은 항목별 토글. 2촌 경로에 내 이름 표시 여부(`showInPaths`)도 끌 수 있다.

| # | 화면 | 라우트 | 핵심 | 로딩 / 빈 / 오류 | 개인정보 |
| --- | --- | --- | --- | --- | --- |
| 1 | People 메인 | `/people` (추천 탭) | 가까운 사람(저장이 기본 행동, "한 장씩 보기" 토글로 기존 덱 유지) · 이번 주 주변 카드 · Open To · 의외의 연결 미리보기 · 저장 목록 · 사람 찾아보기 진입. 찾기·연결 탭은 그대로 | 섹션별 스켈레톤 / 찾는 사람 설정·프로필 보완 / 섹션 부분 오류 | 카드 필드 마스킹, 위치는 도시만 |
| 2 | 의외의 연결 | `/people/unexpected` | 같은 학교·전공 같은 뻔한 이유 없이 의미 있는 공통점 2개 이상 (`unexpectedConnections`). 이유 펼치기 · 저장 · 연결 · 숨기기(되돌리기) | 카드 스켈레톤 / 추천 조건 조정·프로필 보완 / 재시도 | 공개 정보만 |
| 3 | 2촌 탐색 | `/people/second` (사람 · 연결 부탁) | 친구의 친구 + 경로 "나 → 공통 연결 → 상대" (`secondDegree`, 경로 비공개 설정한 사람은 "외 n명"), 공통 연결 목록, **연결해줄 수 있나요?** (`intros.create` → 공통 연결이 전달/넘기기 → 상대가 대화 시작/괜찮아요). 넘겨도 아무에게 알리지 않는다 | 카드·경로 스켈레톤 / 연결 늘리기·사람 찾아보기 / 재시도 | 공통 연결의 공개 설정 준수 |
| 4 | Person Detail + Overlap | `/users/:id` | 연결 상태 배지 · 촌수·경로 → Overlap(공통 연결·그룹·관심사·같은 모임) → Open To → 저장·관심·연결 / 신고·차단 | 스켈레톤 / 공개 정보 부족 안내 / 없는·비활성 계정 | 회사·도시·졸업연도·그룹 마스킹 |
| 5 | 자연어 사람 찾기 | `/people/find?q=` | "혹시 찾는 사람이 있나요?" → 조건 칩(`parseQuery`: 학교·도시·업종·직무·관심사·상태·졸업연도, 민감 조건은 버리고 고지) → 결과 → 검색 저장(Plus). 최근 검색 | 분석 중 인라인 / 조건 완화 제안(`relaxations`)·건너건너 물어보기 / 무료 하루 5회 초과·분석 실패 | 공개 프로필만 검색 |
| 6 | 사람 찾아보기 작성 | `/people/ask?q=` | 한 줄 → AroundU가 찾은 사람 먼저 → "건너건너 물어볼까요?" (조건 칩 · 1/2/3촌 · 전달 방식 2개 · 받는 쪽 미리보기 · 임시 저장) | 후보 계산 로딩 / 작성 가이드 / 연락처 입력·동시 요청 한도(무료 3·Plus 20)·게시 실패 | 이름·학교만 함께 보임, 연락처 차단(`containsContact`) |
| 7 | 받은 요청 | `/people/requests` | "혹시 여기에 해당되나요?" 저요 · 아는 사람 있어요 · 넘기기, ⋯ 숨기기·신고, 마감된 요청은 흐리게 | 스켈레톤 / 아직 온 게 없어요 / 불러오기 실패·만료 | 응답 시 무엇이 공개되는지 사전 고지 |
| 8 | "저요" 응답 | `/people/requests/:id/respond` | 해당 조건 체크 · 한 줄 · **요청자에게 보여줄 정보 선택**(학교·전공·도시·하는 일·관심사·그룹) + 미리보기 | 전송 로딩 / 딱 맞지 않아도 "아는 사람 있어요" 안내 / 만료·중복·전송 실패 | 연락처·정확한 위치 항상 비공개 |
| 9 | Who's Around This Week | `/people/around` | 도시 칩 · 이번 주/다음 주 · "지금 열려 있는 사람만" · 여기 있는 사람 / 방문 예정(`trips`) · 내 방문 예정 편집 | 스켈레톤 / 다음 주·인접 도시 제안 / 위치 권한 거부 안내 | 도시·권역만, 지도 핀 없음, 방문 예정은 `showTrips` |
| 10 | Open To 설정 | `/profile/open-to` | 항목별 On/Off · 오늘/이번 주/계속 · 공개 대상 · 미리보기 · 만료된 항목 다시 켜기 (`openStatuses`) | 저장 로딩 / 기본 선택지 / 저장 실패 | 공개 대상 기본값 같은 학교 + 2촌 |
| 11 | Small Table 추천 | `/meet/tables` | 4~6명 작은 모임 (`recommendSmallTables`) · 인원·공통점·시간·지역·이유 · 관심 · 참여 · 숨기기 · 새 추천 | 스켈레톤 / 작은 모임 만들기 / 모집 종료 | 참여 전 참가자는 얼굴·인원만 |
| 12 | Small Table 상세 | `/activities/:id` | 왜 나와 맞는지 · 참가자 미리보기 · 참여 요청/취소 · 주최자 문의 · 일정 추가(.ics) · 신고 | 스켈레톤 / 참가자 부족·취소 / 정원 초과·일정 변경 | 정확한 장소는 승인 후 |
| 13 | 저장 목록 | `/profile/saved` | 전체 + 사용자 지정 목록 · 검색·정렬 · 옮기기 · 저장 해제 · 목록 알림 | 스켈레톤 / 저장 방법·추천으로 / 동기화 실패·삭제된 프로필 | 저장은 나만 봄, 상대에게 알림 없음 |
| 14 | Mutual Room | `/chats/:roomId` (1:1) | 위 작은 카드: 연결된 이유 · 둘이 겹치는 것 · 둘 다 갈 수 있는 작은 모임 · 커피 일정 잡기 · 작은 모임 만들기 · 공통 연결 보기 · 차단·신고, 첫 대화 문장 제안 | 메시지 로딩·전송 중 / 대화 시작 맥락 / 전송 실패·연결 해제·차단 | 연결된 범위 정보만, 비공개 전환 즉시 반영 |
| 15 | Privacy 설정 | `/settings/privacy` | 전체 공개 범위 3단계 · 항목 토글(회사·도시·졸업연도·그룹·방문 예정·2촌 경로) · 고정 비공개 행 · 미리보기 · 기존 항목별 공개 범위 목록 유지 | 로딩 / 기본 정책 안내 / 저장 실패 | 연락처·정확한 위치·실시간 위치는 변경 불가 비공개 |
| 16 | AroundU+ 고급 탐색 | `/people/advanced` | 복합 조건 · 2촌·3촌 필터 · 검색 저장 · 후보 알림 · 요청 한도 표시 · 구독 관리 | 구독 상태 로딩 / 저장·알림 설정 유도 / 구독 만료·접근 제한 | 유료여도 비공개 정보는 못 본다 |

진입 경로: 사람 탭 추천 허브(1) → 의외의 연결(2)·2촌(3)·주변(9)·저장(13)·찾아보기(5→6). 홈 "오늘 주변에서" → 2촌·주변. 모임 탭 추천 → 작은 모임(11). 프로필 → Open To(10)·저장(13)·공개 범위(15). Plus → 고급 탐색(16). 기존 화면(찾기 필터·검색 결과·저장한 검색·페이월·결제·스와이프 덱)은 모두 유지된다.

## 7. 모임 — 그룹과 모임의 관계

- **그룹**(`Organization`, `type:'community'`): 사용자가 자유롭게 만든다. 성격 `scope = school | city | interest | career`는 만든 사람이 고른다(AroundU가 규정하지 않음). `joinPolicy open`이면 즉시 가입, `approval`이면 운영진 승인. 생성·가입 무료. 기존 동아리·학과·연구실·학생회·Greek은 학교 기반 그룹으로 그대로 노출.
- **모임**(`Activity`): 그룹 안에서(`orgId`) 또는 개인이 독립적으로 만든다. 관리 항목은 **시간 · 장소 · 참여자 · 최대 인원 · 공개 범위**뿐. 종류(커피·운동…)는 선택 칩. 공개 범위: 전체 `public` / 내 학교 `school` / 그룹 멤버 `group`(orgId 필수) / 연결된 사람 `friends`.
- 그룹 상세 탭 **소개 | 일정 | 멤버 | 피드**. 일정 탭에 [이 그룹에서 모임 만들기] (`/meet/create?org=`), 피드 탭에 [이 그룹에 글쓰기] (`/create/post?group=`).
- 모임 탭 세그먼트: **추천**("지금" 스트립: 공강 열기·제휴 카드·지금 열린 만남 → 추천 카드: 커버 · 제목 · 주최(그룹/사람 ✓) · 일시 · 장소(도시) · n/m · 이유 · [참여]; 칩 전체·내 학교·관심사·지역) · **그룹**(내 그룹 스트립 · [+ 그룹 만들기] · 그룹 찾기 칩 전체·학교·지역·관심사·직업) · **일정**(오늘 / 이번 주 / 이후 · [+ 모임 만들기] · 같이 계획하기(Plan Together) · Study Crew · 팀원 모집).
- 모임 추천(`recommendMeets`): 하고 싶은 활동 +4 · 내 그룹 +3 · 내 학교 +2(졸업생 +1) · 내 도시 +1(졸업생 +3) · 주최자 관심사 +1 · 오늘 +1. 그룹 추천(`recommendGroups`): 관심사 겹침 +2/개 · 내 도시 · 내 학교 · 같은 분야 · 팔로우.

## 8. 피드 — 공개 범위 매트릭스

세그먼트 **추천 | 내 학교 | 팔로잉**. 컴포저: 텍스트 · 사진 · **공개 범위** (전체 / 내 학교 / 특정 그룹 / 팔로워). 나머지(종류·주제·태그·함께한 사람·익명…)는 "더 보기"에.

| 작성 시 공개 범위 | 저장 | 누가 보나 (`canViewPost`) | 어느 탭 |
| --- | --- | --- | --- |
| 전체 | `public` | 모든 인증 사용자 | 추천, (작성자 학교) 내 학교, 팔로잉 |
| 내 학교 | `school` | 같은 학교 인증 사용자 (재학생·졸업생) | 내 학교, 추천, 팔로잉 |
| 특정 그룹 | `group` + `groupId` | 그 그룹 멤버 | 팔로잉(가입 그룹), 그룹 상세 › 피드, 추천(멤버에게) |
| 팔로워 | `followers` | 나를 팔로우하는 사람 + 연결된 사람 | 팔로잉, 추천 |
| (익명, 더 보기) | `school` + `anonymous` | 같은 학교 | 내 학교 |

- **내 학교** 안 토글 "재학생만 | 학교 전체" (`feedCampus(scope)`): 재학생만 = 작성자가 학생 단계인 글만.
- **추천** 점수(`feedForYou`): 관심사 주제 +2 · 팔로잉 +3 · 내 학교 +1.5 · 내 그룹 글 +2 · 같은 도시 작성자 +1 · 관심사 겹치는 작성자 +1 · 질문/같이할 사람 +0.5 · 반응 · 시간 감쇠.
- 스폰서 글은 4개마다 1개(Plus 광고 없음), 내 글 Boost 유지.

## 9. 프로필 정보 구조

| 구역 | 내용 | 편집 위치 |
| --- | --- | --- |
| 헤더 | 사진 · 이름 · **학교명 ✓**(인증 방법 툴팁) · 전공 · '25 졸업 예정 / 석사 과정 / 2018 졸업 | `/profile/edit` |
| 현재 | 거주 도시 · 활동 지역 · (졸업생) 회사 · 업종 · 직무 | `/profile/edit` |
| 관심사 | 칩 | `/profile/edit` |
| **추천 설정** | "AroundU가 나를 이해하는 기준": 찾는 사람 · 하고 싶은 활동 | `/profile/wants` |
| 시간표 (학생) | 이번 주 미니 그리드 | `/timetable` |
| 카운트 | 그룹 · 연결 · 모임 · 글 | 각 리스트 |
| **현재 상태가 바뀌었나요?** (학생) | 졸업 예정연도 ≤ 올해면 강조 | `/profile/status` |
| 더 알려주기 | 프로필 질문·음성·투표, 이번 학기 목표, 생활권, 찾는 역할, 완성도 % | `/profile/prompts`, `/profile/context` |

프로필은 "남이 나를 보는 화면"이자 "AroundU가 나를 이해하는 설정 화면" — 추천 설정 카드가 그 둘을 잇는다.

## 10. 학생 → 졸업생 전환

```
프로필 "현재 상태가 바뀌었나요?"  ──▶  /profile/status "졸업하셨나요?"
   · 기존 연결·그룹·활동 기록 유지          [졸업으로 변경하기] ──▶ /profile/status/career
   · 프로필을 졸업생으로 업데이트                                    거주 도시 · 활동 지역 · 회사 · 업종 · 직무 (모두 선택)
   · 새로운 사람들과의 연결                                          [완료] ──▶ users.setStage('alumni', career, homeCity, activityCity)
   [아직 아니에요] / [대학원에 진학했어요]                                    ──▶ 홈으로 · 토스트 "홈과 추천이 졸업생 기준으로 바뀌었어요"
```

`setStage`가 하는 일: `stage`, `affiliation.role`, `career`, `homeCity/region`, `activityCity`, `gradYear`(없으면 올해) 갱신. **삭제하는 것은 없다** — 친구·연결·글·그룹·학교 인증·활동 기록 그대로. 그 즉시 헤더는 "학교명 동문 ✓", 홈은 졸업생 홈, 추천 가중치는 졸업생 표로 바뀐다. 데모 되돌리기: 설정 › 재학생으로 되돌리기.

## 11. 무료 / 유료 경계

| 무료 (사람을 만나는 데 돈을 받지 않는다) | AroundU+ (원하는 사람을 더 빠르고 정확하게) |
| --- | --- |
| 추천 사람 보기 · **타학교 사람 보기** · 동문 보기 | 복수 조건 검색 (필터 2그룹 이상) |
| 기본 검색 (키워드 + 필터 1그룹) | 상세 조건 (업종 · 직무 · 회사 · 졸업연도 · 활동 지역) |
| 기본 연결 요청 30/일 | 검색 저장 ("뉴욕 금융권 연세대 동문") |
| 모임·그룹 참가·생성, 피드, 메시지 | 새 사람 알림 |
| | 연결 요청 무제한 · 고급 추천 · 광고 없는 피드 |

학생과 졸업생 모두 같은 기준. 졸업했다고 유료가 되는 구조는 없다. 가격 `PLANS` (₩7,900/월 · ₩64,900/년 · $5.99 · $49.99, 모의 결제). 페이월 진입점: 찾기의 자물쇠 → [이 조건으로 검색하기], 30회 초과, 검색 저장/알림, 설정, `/plus`.

## 12. 빈 상태 · 첫 이용

| 화면 | 빈 상태 | 행동 |
| --- | --- | --- |
| 홈 › 오늘 일정 | 시간표 없음 | 시간표 추가 |
| 홈 › 지금 연결할 사람 / 사람 › 추천 소진 | 추천 없음 | 찾는 사람 설정 · 찾기에서 직접 찾기 |
| 홈(졸업생) › 내 지역 / 내 분야 | 도시·직무 없음 | 활동 지역 추가 / 직무·업종 추가 |
| 사람 › 찾기 결과 | 0명 | 조건 줄이기 · (Plus) 알림 켜두기 |
| 사람 › 연결 | 연결 없음 | 추천 보기 |
| 모임 › 추천 | 없음 | 찾는 활동 설정 · 모임 만들기 |
| 모임 › 그룹 (내 그룹) | 없음 | 그룹 찾기 · 그룹 만들기 |
| 모임 › 일정 | 없음 | 추천 모임 보기 |
| 피드 › 팔로잉 | 없음 | 사람 추천 보기 · 그룹 찾기 |
| 그룹 상세 › 일정 | 없음 | 이 그룹에서 모임 만들기 |

첫 이용(가입 직후 1회): 홈 상단 3단계 카드 — ① 추천 사람 보기 → ② 연결 요청 보내기 → ③ 모임 하나 참여. 완료·닫기 시 사라진다(`aroundu.firstrun`).

## 13. 모바일 레이아웃 규칙 (Pastel Breeze)

- 뷰포트 400px 기준(360~430). 헤더 64px(워드마크 22px · 학교 알약 36px), 세그먼트 40px, 하단 탭 64px + safe area. 가로 여백 16px, 카드 간격 12px.
- 카드 반경 24px(사람 카드 32px), 칩·버튼·입력은 알약(9999px). 카드 배경 흰색, 테두리 `#B1E5FF` 30%.
- 색: 주 액션 `#0F2B48`, 보조 `#A3D5FF`, 배지·이유 칩 `#BFF4FF`, 강조 배경 `#D2E4FF`, 워드마크 `#00162D`. 골드는 한도 경고에만.
- 타이포 Plus Jakarta Sans: 제목 22/600, 카드 이름 17/700, 본문 15/400, 보조 13/400, 칩 11~12/600.
- 사람 카드: 사진은 카드 폭 100% × 높이 60%. 이유 칩은 사진 위 좌상단(반투명 흰 알약). 이름 줄에 학교 ✓. 버튼 3개는 하단 고정 행(Pass 48px 원형, 연결 알약 primary, 만남에 초대 알약 outline).
- 세그먼트는 헤더 바로 아래 고정(스크롤 시 유지). 필터 행은 56px, 선택값은 오른쪽 회색 요약 + chevron.
- 빈 상태: 이모지 1 · 제목 15/700 · 설명 13 · 버튼 1개. 스켈레톤은 카드 3개.

## 14. 36화면 매핑 (데모 진입)

| # | 화면 | 라우트 | 파일 | 데모 진입 |
| --- | --- | --- | --- | --- |
| 1 | 시작 | `/welcome` | `pages/onboarding/WelcomePage.tsx` | 로그아웃 |
| 2 | 학교 선택 | `/onboarding/school` | `pages/onboarding/OnboardingPage.tsx` | 시작하기 |
| 3 | 학교 인증 | `/onboarding/verify` | 〃 | 학교 선택 후 |
| 4 | 현재 상태 | `/onboarding/stage` | 〃 | |
| 5 | 기본 프로필 | `/onboarding/basic` | 〃 | |
| 6 | 관심사 | `/onboarding/interests` | 〃 | |
| 7 | 지역 | `/onboarding/region` | 〃 | |
| 7b | 무엇을 찾고 있나요 | `/onboarding/wants` | 〃 | |
| 8 | 시간표 (학생) | `/onboarding/schedule` | 〃 | 상태 = 학부/대학원 |
| 9 | 현재 직업 (졸업생) | `/onboarding/career` | 〃 | 상태 = 졸업생 |
| 10 | 학생 홈 | `/` | `pages/home/HomePage.tsx` | 데모 로그인 |
| 11 | 사람 추천 | `/people?tab=recommend` | `pages/people/PeoplePage.tsx` | |
| 12 | 사람 검색 | `/people?tab=search` | 〃 | |
| 13 | 사람 상세 | `/users/:id` | `pages/people/PersonPage.tsx` | 카드 탭 |
| 14 | 모임 | `/meet?tab=recommend` | `pages/meet/MeetPage.tsx` | |
| 15 | 그룹 | `/meet?tab=groups` · `/orgs/:id` · `/groups/new` | 〃 · `pages/org/OrgPage.tsx` · `pages/groups/CreateGroupPage.tsx` | |
| 16 | 피드 | `/feed?tab=foryou` | `pages/feed/FeedPage.tsx` | |
| 17 | 학교 피드 | `/feed?tab=campus` (재학생만 | 학교 전체) | 〃 | |
| 18 | 프로필 | `/profile` | `pages/profile/ProfilePage.tsx` | |
| 19 | 시간표 | `/timetable` | `pages/timetable/TimetablePage.tsx` | 프로필 › 시간표 |
| 20 | 졸업생 홈 | `/` (stage alumni) | `pages/home/HomePage.tsx` | 설정 › 졸업생으로 전환 |
| 21 | 졸업생 사람 추천 | `/people?tab=recommend` | 〃 | 지역·분야 이유가 먼저 |
| 22 | 지역 기반 탐색 | `/people/results?c={homeCities:[서울]}` | `pages/people/PeopleResultsPage.tsx` | 프리셋 "동문 + 서울" |
| 23 | 직업/업종 기반 탐색 | `/people/results?c={industries:[금융]}` | 〃 | 프리셋 "뉴욕 + 금융" |
| 24 | 동문 탐색 | `/people/results?c={schools:[내 학교], stages:[alumni]}` | 〃 | 프리셋 "동문 + 서울" |
| 25 | 상세 사람 검색 | `/people?tab=search` (상세 행) | `pages/people/PeoplePage.tsx` | |
| 26 | 졸업생 모임 | `/meet?tab=recommend` | 〃 | 지역 가중 |
| 27 | 졸업생 피드 | `/feed` | 〃 | |
| 28 | 졸업생 프로필 | `/profile` | 〃 | 현재 카드에 회사·업종·직무 |
| 29 | 졸업 상태 업데이트 | `/profile/status` | `pages/profile/StatusPage.tsx` | 프로필 카드 |
| 30 | 학생 → Alumni 전환 | `/profile/status/career` | `pages/profile/StatusCareerPage.tsx` | 졸업으로 변경하기 |
| 31 | 고급 사람 검색 | `/people?tab=search` (자물쇠) | | 상세 행 선택 |
| 32 | 복수 조건 설정 | `/people?tab=search` (2그룹) | | 프리셋 "연세대 + 서울 + AI" |
| 33 | 검색 저장 | `/people/results` › ☆ | `pages/people/PeopleResultsPage.tsx` | Plus |
| 34 | 새 사람 알림 | `/notifications` (`new_people`) | `pages/notifications/NotificationsPage.tsx` | 설정 › 새 사람 알림 시뮬레이션 |
| 35 | AroundU+ 설명 | `/plus` | `pages/plus/PlusPage.tsx` | 설정 · 페이월 "자세히" |
| 36 | 결제 | `/plus/checkout` | `pages/plus/CheckoutPage.tsx` | 구독 시작하기 |
| 37 | 사람 찾기 (어떻게 찾을까요) | `/people?tab=search` 상단 | `pages/people/PeoplePage.tsx` | |
| 38 | 네트워크에 물어보기 | `/people/ask` | `pages/people/AskNetworkPage.tsx` | 찾기 › 📣 |
| 39 | 받은 요청 (저예요 · 아는 사람 · 관심 없어요) | `/people/requests` | `pages/people/RequestsPage.tsx` | 홈 · 알림 |
| 40 | 요청 상세 (추천 · 응답 · 수락 → Mutual Room) | `/people/requests/:id` | `pages/people/RequestDetailPage.tsx` | 내 요청 |

## 15. 한국 / 미국 맥락 (`lib/locale-context.ts`)

화면 구조는 같고, 언어(데이터셋)에 따라 문구·칩·시드만 바뀐다.

| 항목 | KO | EN |
| --- | --- | --- |
| 인증 | 학교 이메일(@yonsei.ac.kr) · 학교 포털 SSO · 학생증 / 졸업생 이메일 · 졸업증명 · 동문회 연동 · 이전 인증 이력 | .edu email · Campus SSO (CalNet) · Student ID / Alumni email · Diploma · Alumni association · Verified before |
| 도시 칩 | 서울 성남 부산 인천 대전 대구 광주 수원 뉴욕 도쿄 샌프란시스코 해외 | New York, San Francisco, Los Angeles, Boston, Berkeley, Seattle, Chicago, Austin, Seoul, Tokyo, London, International |
| 업종 / 직무 | IT AI 금융 스타트업 컨설팅 … / Product 개발 데이터 디자인 … | Tech AI Finance Startup Consulting … / Product Engineer Data Designer … |
| 학년 · 졸업 | 3학년 · 2018 졸업 · 동문 | Junior · Class of 2018 · Alumni |
| 학교에서 일어나는 것 | 동아리 박람회 · 축제 · 학회 세미나 · 공모전 | Club Fair · Rush · Football game · Hackathon · Career fair |
| 검색 프리셋 | 뉴욕 + 금융 · 연세대 + 서울 + AI · Product + 도쿄 | NYC + Finance · Berkeley + SF + AI · Product + New York |
| 그룹 예시 | 서울 AI 러닝 크루 · 프로덕트 스터디 · 연세 동문 서울 커피챗 | New to NYC · AI Builders Bay Area · Cal Alumni SF Coffee |

## 16. 데이터 계약 요약 (개발자용)

- 타입: `packages/core/src/types/index.ts` — `User.homeCity/activityCity/gradYear/verification/wants`, `VerificationMethod`, `PeopleWant`, `ActivityWant`, `Wants`, `PeopleSearch`, `SavedSearch`, `Organization.scope/city/joinPolicy/interests`, `Visibility 'group'`, `Post.groupId`, `NotificationType 'new_people'`.
- API(`api/types.ts`, 엔진 `api/engine.ts`, 서버 권한 `server/index.ts` RULES): `auth.register(RegisterInput)`, `users.setStage(id, stage, career?, homeCity?, activityCity?)`, `users.updateWants`, `users.verify(id, method)`, `relationships.sendFriendRequest`(한도 강제), `searches.save/remove/setAlert/run`, `requests.create/respond/decide/refer/referralDecide/dismiss/close`, `orgs.create/apply/leave`, `activities.create`(orgId + visibility group), `posts.create`(visibility group + groupId).
- 순수 로직(`lib/`): `requests.ts`(matchesForRequest · audienceForRequest · requestsForMe · referralCandidates), `graph.ts`(degreeOf · pathBetween), `people.ts`(recommendPeople · searchPeople · isAdvancedSearch · searchPresets), `recommend.ts`(matchReasons · REASON_WEIGHTS), `meet.ts`(recommendMeets · recommendGroups · mySchedule), `home.ts`(homeToday · alumniHome), `feed.ts`(feedForYou · feedCampus(scope) · feedFollowing), `network.ts`(stageOf · cityOf · contextLine · schoolBadge · personLine), `wants.ts`, `locale-context.ts`.
- 시드: `data/seed.ts`(KO) · `data/seed.en.ts`(EN) 끝의 `V2` 맵과 추가 사용자·그룹·모임. mock DB 키 `aroundu.mockdb.v9.<lang>`.
