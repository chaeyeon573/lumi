# AroundU 앱 출시 가이드 (App Store · Google Play)

실제 서버(Railway + Postgres)에 붙은 Expo 앱을 두 스토어에 올리는 순서입니다. 코드 쪽 준비(계정 삭제, 약관 동의, 신고·차단, 심사용 로그인, 약관 페이지, 아이콘, EAS 설정)는 끝나 있고, **계정이 필요한 단계만 직접** 하면 됩니다.

| 단계 | 누가 | 시간 |
| --- | --- | --- |
| 0. 계정 만들기 (Apple 99달러/년, Google 25달러) | 직접 | Apple 승인 1~2일 |
| 1. 서버 배포 (Railway) | 직접 (변수 입력) | 20분 |
| 2. 앱에 서버 주소 넣기 · EAS 연결 | 직접 (명령 3개) | 10분 |
| 3. 빌드 (iOS · Android) | EAS 클라우드 | 각 15~30분 |
| 4. 스토어 정보 입력 · 심사 제출 | 직접 (이 문서의 문구 복사) | 1~2시간 |
| 5. 심사 | Apple 1~3일 · Google 1~7일 | — |

---

## 0. 계정

- **Expo** (있음) — https://expo.dev
- **Apple Developer Program** — https://developer.apple.com/programs/enroll/ · 연 99달러. 개인으로 가입하면 스토어 판매자 이름이 본인 이름으로 보여요. 팀·학교 이름으로 내려면 조직(D-U-N-S 번호 필요)으로 가입.
- **Google Play Console** — https://play.google.com/console · 1회 25달러.
  - ⚠️ **2023년 11월 이후 만든 개인 계정은 정식 출시 전에 "비공개 테스트"를 12명 이상, 14일 이상** 돌려야 프로덕션 신청이 열려요. 팀원·친구 12명 이메일을 미리 모아 두세요. (조직 계정은 면제)
- **메일 발송 (Resend)** — https://resend.com · 무료. 학교 이메일 인증 코드를 보내려면 도메인 인증이 필요해요(도메인이 없으면 가비아 등에서 1만 원대로 구입).

## 1. 서버 배포 (Railway)

배포 브랜치는 `claude/friendly-euler-emuo1f` 입니다. 이 작업 브랜치(`claude/brave-galileo-23tdq1`)를 그 브랜치로 합치면 Railway가 자동으로 배포해요.

Railway › 서비스 › **Variables**:

| 변수 | 값 | 설명 |
| --- | --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Postgres 플러그인 연결 |
| `AROUNDU_LANG` | `ko` | 한국 대학 데이터·문구 (미국이면 `en`) |
| `SEED` | `base` | **실제 출시용** — 예시 사람·글 없이 학교·조직 목록만. (`full`은 데모용) |
| `DEMO_AUTOREPLY` | `0` | 가짜 자동 응답 끄기 |
| `ALLOW_DEMO_LOGIN` | `0` | 앱의 데모 로그인 끄기 (심사는 아래 REVIEW 계정으로) |
| `REVIEW_EMAIL` | 예: `review@<내 도메인>` | 앱 심사관이 쓸 로그인 이메일 (메일 없이 고정 코드) |
| `REVIEW_CODE` | 예: `246810` | 위 계정의 고정 인증 코드 |
| `RESEND_API_KEY` · `MAIL_FROM` | Resend 키 · `AroundU <login@내도메인>` | 인증 코드 메일 |
| `HIDE_DEV_CODE` | `1` | 메일 설정이 없을 때 화면에 코드를 보여주지 않기 |
| `SUPPORT_EMAIL` | 문의 받을 이메일 | 약관·개인정보처리방침·신고 알림에 표시 |
| `OPERATOR_NAME` | 예: `AroundU 팀` | 약관의 운영자 이름 |
| `ADMIN_TOKEN` | 긴 무작위 문자열 | 신고 처리 API 비밀번호 |
| `VITE_API_MODE` | `remote` | 같은 서버의 웹 버전도 실제 서버 사용 |

> 이미 데모 데이터(`full`)로 운영 중인 DB라면, 예시 사람이 섞이지 않게 **새 Postgres를 붙이거나** 한 번만 `ALLOW_RESET=1` 로 초기화한 뒤 다시 비워 두세요.

확인:
- `https://<도메인>/api/health` → `{"ok":true,...,"store":"postgres"}`
- `https://<도메인>/privacy`, `/terms`, `/support`, `/delete-account` → 페이지가 보이면 스토어에 이 주소를 그대로 넣어요.

신고 처리 (24시간 안에 — Apple 요구사항):
```bash
curl https://<도메인>/api/admin/reports -H "x-admin-token: $ADMIN_TOKEN"
curl -X POST https://<도메인>/api/admin/action -H "x-admin-token: $ADMIN_TOKEN" -H 'content-type: application/json' -d '{"action":"removePost","id":"<글 id>"}'
curl -X POST https://<도메인>/api/admin/action -H "x-admin-token: $ADMIN_TOKEN" -H 'content-type: application/json' -d '{"action":"suspendUser","id":"<사용자 id>"}'
```
신고가 들어오면 `SUPPORT_EMAIL` 로 메일이 와요(Resend 설정 시).

## 2. 앱 설정 · EAS 연결

1. `apps/mobile/eas.json` 의 `EXPO_PUBLIC_API_URL` 을 Railway 주소로 바꿔요 (`https://REPLACE-WITH-YOUR-RAILWAY-DOMAIN` → `https://aroundu-production.up.railway.app` 같은 값).
2. 번들 ID `app.aroundu.mobile` (iOS·Android 공통, `apps/mobile/app.json`)이 이미 누가 쓰고 있으면 `com.<팀이름>.aroundu` 처럼 바꿔요.
3. 터미널 (PC, Node 20+):
```bash
cd AroundU/apps/mobile
npm i -g eas-cli
eas login                 # Expo 계정
eas init                  # 프로젝트 연결 — app.json 에 projectId 가 들어가요 (커밋해 주세요)
eas update:configure      # 이후 JS만 바뀐 수정은 스토어 심사 없이 바로 배포 가능
```

## 3. 빌드

```bash
# 먼저 안드로이드 테스트 APK — 폰에 바로 설치해서 실제 서버로 가입·로그인·메시지까지 확인
eas build -p android --profile preview

# 스토어용
eas build -p ios --profile production       # Apple ID 로그인 · 인증서는 EAS가 자동으로 만들어요
eas build -p android --profile production   # .aab (업로드 키는 EAS가 만들어 보관)
```
빌드 번호는 EAS가 자동으로 올려요(`autoIncrement`). 데모 데이터로 된 설치 파일이 필요하면 `--profile demo`.

## 4. 제출

**iOS**
1. App Store Connect › 앱 › **＋ 새로운 앱**: 플랫폼 iOS, 이름 `AroundU`, 기본 언어 한국어, 번들 ID 선택, SKU `aroundu-ios`.
2. `eas submit -p ios --latest` → 몇 분 뒤 TestFlight에 올라와요. 팀원 폰에 TestFlight로 먼저 설치해 확인.
3. 앱 정보·가격(무료)·**앱 개인정보**·연령 등급·심사 정보 입력 (아래 문구) → 스크린샷 업로드 → **심사에 제출**.

**Android**
1. Play Console › **앱 만들기**: 이름 AroundU, 기본 언어 한국어, 앱, 무료.
2. 첫 업로드는 직접: 테스트 › 비공개 테스트 › 새 버전 → EAS 빌드 페이지에서 받은 `.aab` 업로드. (다음부터는 서비스 계정 키를 만들어 `eas submit -p android` 로 자동 업로드)
3. 앱 콘텐츠: 개인정보처리방침 URL, 앱 액세스(심사용 로그인), 광고 없음, 콘텐츠 등급 설문, 타겟층, **데이터 보안**, **계정 삭제 URL** (아래 문구).
4. 개인 계정이면 비공개 테스트 12명 × 14일 → 프로덕션 신청.

## 5. 스토어 입력값

소개 글·키워드·스크린샷은 [`docs/store/listing.md`](store/listing.md), 스크린샷 파일은 `docs/store/screenshots/`.

**Apple 앱 개인정보 (App Privacy)** — "데이터를 수집함", 모두 **사용자와 연결됨 · 추적에 사용 안 함**
- 연락처 정보 › 이메일 주소 — 앱 기능(로그인·학교 인증)
- 사용자 콘텐츠 › 사진, 기타 사용자 콘텐츠(글·질문 답변), 메시지(이메일 또는 문자 메시지 아님 → "기타 사용자 콘텐츠"로) — 앱 기능
- 식별자 › 사용자 ID — 앱 기능
- 기타 데이터 › 학교·전공·졸업연도·도시 — 앱 기능, 제품 개인화(추천)
- 위치: 수집 안 함 (도시는 사용자가 입력)

**Google 데이터 보안** — 수집: 이메일, 이름, 사진, 기타 사용자 콘텐츠, 메시지(앱 내), 사용자 ID. 공유: 없음. 전송 중 암호화: 예. 삭제 요청: 가능(앱 내 + `https://<도메인>/delete-account`).

**연령 등급** — 사용자 간 무제한 메시지 가능·사용자 생성 콘텐츠 있음 → Apple 설문에서 해당 항목 "예" (보통 12+ 또는 17+로 나와요, 설문 그대로 답하세요). Google IARC: 소셜 기능·사용자 간 소통 "예". 타겟층: 18세 이상 (대학생·졸업생).

**심사 정보 (Apple App Review / Google 앱 액세스)**
```
로그인 방법: 시작 화면 › 이메일로 로그인 › 이메일 REVIEW_EMAIL 입력 › 인증 코드 REVIEW_CODE 입력
(학교 이메일 인증이 필요한 앱이라 심사용 계정은 메일 없이 고정 코드로 로그인돼요.)

AroundU는 학교 인증을 한 대학생·졸업생이 사람을 발견하고 연결하고 모임을 만드는 소셜 앱입니다(데이팅 앱 아님).
- 신고/차단: 사람·글·모임 화면의 ⋯ 메뉴
- 계정 삭제: 프로필 › 설정 › 계정 삭제
- 가입 시 이용약관(무관용 정책) 동의가 필요하며, 신고는 24시간 안에 검토합니다.
```

## 6. 출시 후 업데이트

- 화면·문구·로직만 바뀐 경우: `eas update --channel production -m "설명"` → 사용자 앱이 다음 실행 때 받아요 (심사 없음).
- 네이티브 설정(권한, 새 네이티브 라이브러리, 아이콘, 버전)이 바뀐 경우: `app.json` 의 `version` 을 올리고 다시 `eas build` + `eas submit`.
