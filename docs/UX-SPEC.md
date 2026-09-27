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
| 졸업생 | `prior_student` | 이전 AroundU 재학생 인증 이력 | Verified as a student before | 즉시 |

저장: `User.verification = { method, at }`, `affiliation.emailVerified = true`. 표시: 프로필·카드·헤더에 **학교명 ✓** (툴팁 = 인증 방법, `verificationLabel`). 졸업생은 "학교명 동문 ✓". 프로필 편집 › 학교 카드에서 "다른 방법으로 인증"으로 추가 인증 가능.

## 2. 사용자 상태 모델

`Stage = undergrad | masters | phd | alumni | professional` (`stageOf(u)`; `professional`은 alumni 취급). 같은 앱, 같은 계정 — **추천 우선순위와 홈 구성만 달라진다**.

| | 학생 (undergrad · masters · phd) | 졸업생 (alumni · professional) |
| --- | --- | --- |
| 헤더 | 학교명 ✓ · 학부생 · 경영학과 3학년 | 학교명 동문 ✓ · 2018 졸업 · 서울 · AI / Product |
| 홈 | 오늘 일정이 먼저 | 새롭게 연결할 사람이 먼저, 시간표 없음 |
| 추천 가중치 | 학교 3 · 전공 3 · 수업 3 · 공강 3 · 관심사 2 · 그룹 2 · 지역 1 · 분야 1 | 지역 4 · 분야 4 · 직무 3 · 학교 2 · 동문 2 · 관심사 2 · 그룹 2 · 공통 연결 2 · 공강 0 |
| 프로필 "현재" | 거주 도시 · 활동 지역 | + 회사 · 업종 · 직무 |
| 상태 변경 | "현재 상태가 바뀌었나요?" 카드 | "상태: 졸업생 · 변경" 링크 |

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
- API(`api/types.ts`, 엔진 `api/engine.ts`, 서버 권한 `server/index.ts` RULES): `auth.register(RegisterInput)`, `users.setStage(id, stage, career?, homeCity?, activityCity?)`, `users.updateWants`, `users.verify(id, method)`, `relationships.sendFriendRequest`(한도 강제), `searches.save/remove/setAlert/run`, `orgs.create/apply/leave`, `activities.create`(orgId + visibility group), `posts.create`(visibility group + groupId).
- 순수 로직(`lib/`): `people.ts`(recommendPeople · searchPeople · isAdvancedSearch · searchPresets), `recommend.ts`(matchReasons · REASON_WEIGHTS), `meet.ts`(recommendMeets · recommendGroups · mySchedule), `home.ts`(homeToday · alumniHome), `feed.ts`(feedForYou · feedCampus(scope) · feedFollowing), `network.ts`(stageOf · cityOf · contextLine · schoolBadge · personLine), `wants.ts`, `locale-context.ts`.
- 시드: `data/seed.ts`(KO) · `data/seed.en.ts`(EN) 끝의 `V2` 맵과 추가 사용자·그룹·모임. mock DB 키 `aroundu.mockdb.v9.<lang>`.
