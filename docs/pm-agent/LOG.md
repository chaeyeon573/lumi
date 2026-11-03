# PM agent 실행 기록

최신이 위.

## 2026-11-02 · 사장님 답 — Co-ops 칸 (BSC 하우스 목록)
- Berkeley Student Cooperative 공식 사이트(bsc.coop/housing/our-houses-apartments)에서 하우스·아파트 20곳과 각 집 소개 첫 문장을 확인 → server/data/coops-berkeley.csv(확인일 포함). 사이트가 서버 자동 요청(Node)을 503 으로 막아서 우회하지 않고 확인한 목록을 저장소에 둠. 워커가 일주일마다 CSV → 조직(type: coop, 공식). 테스트 2개.
- 조직 분류에 Co-op housing 추가, Explore › Clubs & Groups 칩 Co-ops, Explore › Events 조직 행사 칸 Co-ops 필터.
- 266 통과, 빌드 정상.

## 2026-11-02 · 사장님 시안 3단계 — 조직 행사로 시작하는 유입
- 운영진: Profile › My Organizations(운영 중·회원) → Create Event(사진·행사 이름·조직(운영진인 조직만)·설명·일시·장소·공개 범위 Public(Explore)/Members only(그 조직 회원만)) → “Event Created!” Share Link · View Event · View Organization (+ 인스타·단톡방 안내). 조직 페이지 Events 칸에 운영진용 Create Event.
- 학생: Explore › Events 맨 위 “From clubs & Greek life”(All·Clubs·Greek, 실제 조직 행사만, 없으면 숨김). 행사 상세 RSVP → “You’re going! Added to your Schedule.” · View Organization. 참석한 행사는 Schedule(내 약속)에 보인다.
- Co-ops 칸은 넣지 않음 — 지금 데이터에 Co-op 조직 분류가 없다(만들면 지어내기). 질문함.
- 264 통과, 빌드·화면(v2) 오류 0.

## 2026-11-02 · 사장님 시안 2단계 — 모임 만들기·참석
- Meet › Create a Meetup: 사진 올리기(웹) · 제목 · 종류 4개(Coffee/Study/Workout/Hangout) · 설명 · 일시 · 장소 · 인원 · 공개 범위 3개(Public=우리 학교 / My Network=친구 / Invite Only=초대한 친구). 참가비·조건·승인 방식은 이 모드에서 숨김(바로 참여). 만든 뒤 “Meetup Created!” — View Meetup · Share Link.
- 모임 상세: 참석 전 Going · Interested(새로 만듦: 관심 — 인원에 안 듦, 본인 것만 보임, 계정 삭제 때 지움) → 참석 뒤 You’re going! · Chat. 참석 취소는 한 번 더 묻고. 공유 버튼이 실제로 링크를 복사·공유(예전엔 토스트만).
- 모임 사진: 사진 주소가 모임에 붙어 있으면 계속 보이고, 모임이 지워지거나 주최자가 정지되면 닫힘(server/media.ts). 테스트 2개 추가, 264 통과.

## 2026-11-02 · 사장님 결정 — 이름 Lumi, 탭 Home·Explore·Schedule·Meet·Profile, 밝은 디자인 시안
- 사장님: 앱 이름은 Lumi, 첫 화면 = 정보 대시보드, 어두운 v2 기본 + Classic(밝은 파스텔) 함께, 배포는 바로.
- 이름 되돌림(헤더·홈·시작 화면). Classic 색을 사장님 밝은 시안대로(흰 바탕·인디고 #4F55E3·파스텔 카드).
- 탭: Home · Explore · Schedule(/schedule = 내 약속) · Meet(Activities | People — People 은 Meet 안, /people 도 Meet 탭으로 표시) · Profile.
- Meet(시안 1단계): Coffee·Study·Workout·Hangout 4칸(누르면 그 종류만), Create a Meetup, Upcoming Meetups(실제 모임·참여 인원), 다른 방법(지금 공강·팀원·같이 타기·링크로 묻기 → 예전 Discover 는 /meet/more).
- 다음: 모임 만들기·Going/Interested·채팅 흐름, 조직 행사(운영진 등록·RSVP·조직 페이지).

## 2026-11-02 09:20 UTC (버클리 월 01:20 PST) · 초점: 방금 배포한 새 홈·탐색이 라이브에서 도는지
- 사장님 새 답 없음. 라이브 번들 6d9c8fb 확인. 라이브 주소로 직접 찍음: 홈(AroundU · UC Berkeley · Campus Life: RSF Closed 7 AM–11 PM, Dining Café 3 opens 7 AM · For you) · Explore › Opportunities 오류 0.
- calendar:s_berkeley 마지막 기록 04:22 error — 고친 코드 배포 뒤 아직 6시간 주기가 안 돌았다(10:22 예정). 인턴 가져오기(유학생 표시 포함)도 10:21 예정.
- 물어봄: Feed 자리·기본 디자인·법 문서 이름(QUESTIONS.md). 고친 코드 없음.

## 2026-11-02 · 사장님 시안 — 홈·탐색 개편 (AroundU)
- 하단 탭: Home · People · Meet · Explore · Profile (가운데 + 는 Meet 화면 위 + 로). / = 새 홈, /people = 예전 사람 카드, /meet = 예전 Discover(/discover 는 /meet 로), /explore(+ /explore/events·opportunities·clubs).
- 홈: AroundU + 학교 이름(인증된 소속에서, 없으면 숨김), “What’s happening at UC Berkeley?”(손 이모지 없음, 대학원·동문 문구 따로), Events·Opportunities·Clubs & Groups·Meetups 4칸, Campus Life(RSF 운영·시간·혼잡도 → /gym, Dining Halls 지금 연 곳 → /dining, 지원하는 학교만), For you(실제 추천 1~2개, 저장 버튼, 없으면 칸 숨김).
- Explore: 제목·검색·Events/Opportunities/Clubs & Groups 세 줄 — 시안의 Discover 칸은 사장님 요청대로 뺌. 하위 화면은 캠퍼스 › 찾기 목록을 그 칸 칩만 남겨 재사용.
- 이름: 헤더·시작 화면 로고 Lumi → AroundU. 법 문서·공유 링크 화면의 “Lumi” 는 그대로(법 문서는 사장님 확인 뒤).
- 262 통과, 빌드 정상, 화면 12개(v2·classic) 오류 0.

## 2026-11-02 · 사장님 요청 — 인턴도 유학생 가능 여부
- 공고 본문을 읽어 회사가 적은 문장만으로 표시(server/sources/workauth.ts): 유학생 가능(CPT/OPT 받음·international students welcome·sponsor) / 미국 시민만(citizenship required·보안 인가·must be a U.S. person) / 비자 스폰서 없음 / 안 적힘(표시 없음).
- 본문 가져오기: Greenhouse(?content=true), Lever·Ashby(목록에 본문), Workday·SmartRecruiters(인턴 공고만 상세 한 번 더), USAJobs(자격 요건의 시민권).
- 실제 456개로 돌려 봄: 유학생 가능 13(Jump Trading·Akuna), 미국 시민만 59(Anduril·Palantir), 스폰서 없음 13(Humana·AlixPartners 등), 안 적힘 371. 잘못 읽은 것 2가지 고침 — “스폰서 없음 (예: STEM OPT)” 목록의 OPT, ServiceNow 수출 통제 안내문. 실제 문장으로 테스트.
- 화면: 인턴 카드 배지, 상세 “International students” 줄(안 적혀 있으면 “공고에 없음 — 지원 전 확인”), 인턴 칸 “Int’l students OK N” 칩(분야 개수도 따라감). 262 통과, 빌드·화면 오류 0. 라이브 데이터는 다음 인턴 가져오기(12시간마다)부터.

## 2026-11-02 · 사장님 요청 — 유학생 대학원생도 지원 가능한 것
- 추가: Jane Street Graduate Research Fellowship(2026/11/13 AoE, 박사 $50k+등록금, “International students are eligible” 공식 명시), P.E.O. International Peace Scholarship(유학생 여성 대학원생, 최대 $12,500, “12월 15일까지” — 연도 표기 없어 날짜 미정).
- 버클리 펠로십 중 페이지에 ‘모든 대학원생’/유학생 대상이 분명한 것만 ‘international students’ 태그: Chowdhury, Philip Brett, Guru Gobind Singh, Soong. (명시 없는 것은 짐작해 달지 않음; Lurcy·Mentored Research Award 는 시민·영주권자 전용으로 페이지에 적혀 있음)
- 장학금·연구 탭에 “유학생 가능 N” 칩(해당 태그가 있을 때만 보임). 259 통과, 빌드·화면 오류 0.
- 넣지 않음: Google PhD Fellowship(학교 추천, 2027 일정 공식 없음), Microsoft PhD Fellowship(중단), Two Sigma(페이지 비공개), AAUW International(2027 일정 없음).

## 2026-11-02 · 사장님 요청 — 대학원생 연구 기회
- 공식 페이지 확인 후 추가(연구 칸): LLNL Data Science Summer Institute(2027/1/15, 대학원·학부 고학년), Los Alamos Dynamics Summer School(1차 11/14, 최종 2027/1/2 5PM MST, 3·4학년·대학원 1년차), LANL Remote Sensing Summer School(2027/1/10, 대학원생만, 유급).
- 이미 있는 NASA OSTEM(3/1)·Berkeley Lab Computing Sciences 는 대학원생에게도 보임(대상 ‘모두’ 확인).
- 넣지 않음: 스미소니언(10/15 마감), LANL 다른 여름학교(페이지가 2026 날짜 그대로), 2027 날짜가 제3자 사이트에만 있는 것.
- 259 통과.

## 2026-11-02 06:20 UTC (버클리 일 22:20 PST) · 초점: 오늘 배포한 연구소·USAJobs·장학금이 라이브 화면에 맞게 보이는지
- 사장님 새 답 없음. 라이브: 연구실 126(연구소 125 + 예시 1), 인턴 457(Policy & Law 76), 장학금 25.
- 고침: 연방 일자리를 제목으로 못 고르면 전부 Policy & Law 로 넣었다(“Inpainting at the WWII Memorial”, “Student Trainee (Contracting)”) → “Student Trainee (…)” 괄호 안을 먼저 보고, 기관으로 고를 때는 정책·법 기관만 Policy & Law, 국립공원·박물관은 Nonprofit & Education, 그 밖은 Other. 계약·예산·인사·물류는 Business. “Law Student”·MBA 공고는 대학원생 대상으로. 테스트 2개, 259 통과, 빌드·화면 오류 0.
- 결과(라이브 데이터, 새 화면 코드): Policy & Law 76→62, Nonprofit & Education 7→13, Business 34→42.
- 배포: 상시 허락 규칙대로 검사 통과 후 배포.

## 2026-11-02 · 사장님 요청 — 대학원생 장학금 더
- 버클리 Graduate Division 펠로십 18개 추가(STEM Diversity $20k, Rosenfeld $10k, Lindheim $10k, Mentored Research Award, Lurcy $30k, Brett, CEND, Chowdhury, GIAS, Trujillo, Luce Indigenous $50k, Greater Good, Alexander, Fahey, Bancroft, Private Law, Singh $36k, Soong). 페이지마다 열어 확인 — 마감은 “1월 15일”처럼 연도가 없어서 날짜 미정으로 두고 설명에 페이지 표기를 그대로 적음(NDSEG 처럼 지난 정보가 섞여 있어 연도를 짐작하지 않음).
- 전국: Boren Fellowship(대학원) 2027/1/20 — 공식 borenawards.org 확인.
- 넣지 않음: AAUW(9/30 마감), HSF(2027 일정 아직 없음), D&C Fellows(페이지 날짜가 지난 해).
- 대학원생 공고: 장학금 25 + 연구 겸 장학금 6 + 연구 2 (로컬 가져오기). 257 통과.

## 2026-11-02 · 사장님 요청 — 대학원생 공고
- USAJobs 첫 실행: 129개(06:03), 연구소 125곳 반영(05:49).
- 대학원생: 공식 페이지에서 확인한 것만 — DOE SCGSR(11/4 5PM ET, 박사과정 국립연구소 연구), DOE CSGF·NNSA SSGF 2027(지금 접수 중, 마감은 신청 사이트에만 → 날짜 미정), AAAS Mass Media(1/4, 대학원·학부 고학년, 인턴 › Media & Writing), 버클리 대학원 Conference Travel Grant 가을 마감 12/1(페이지 기준으로 고침).
- 넣지 않음: NDSEG(10/30 마감 — 버클리 페이지의 11/15 는 지난 정보), PMF(행정명령으로 종료), CSGF·SSGF FAQ 는 자동 접근 403 → 우회 안 함.
- 가져오기가 마감 시각을 받게(YYYY-MM-DDTHH:MM 버클리 시각). 지난번 CSV 에 섞인 CRLF 정리. 257 통과.

## 2026-11-02 · 사장님 요청 — USAJobs(연방정부 학생 채용) 연결
- 배포: 0fe6400(UCDC·Cal in Local Government) — 사장님 허락.
- 사장님이 Railway 에 키를 넣음(저는 값을 보지 않음). server/sources/usajobs.ts: 공식 API(GET data.usajobs.gov/api/Search, HiringPath=student)에서 Pathways 학생 채용 → 인턴. 캘리포니아·D.C.·원격·여러 지역만, 마감 지난 것 제외, 급여 표시, 분야는 제목 → 없으면 기관(보건·교육·그 밖은 Policy & Law). 키(USAJOBS_API_KEY·USAJOBS_EMAIL)가 있는 서비스에서만 12시간마다. 키 없이 부르면 401 확인(주소 맞음). 테스트 2개, 257 통과.
- 배포 뒤 /api/agent/status 의 external:usajobs 로 실제 개수 확인할 것.

## 2026-11-02 06:00 UTC · 사장님 요청 — 버클리 공식 프로그램(문과·공공) 넣기
- 배포: 51332a6(연구소 125곳, 인턴 문과 분야) — 사장님 허락.
- 공식 페이지를 직접 열어 확인: IGS/Matsui(Cal-in-Sacramento·Pathways·Gardner·Schaeffer·Democracy Camp), Public Service Center 17개 프로그램, UCDC. 대부분 가을 마감이 이미 지남(Gardner 10/20, Democracy Camp 11/1, CITC 닫힘) → 넣지 않음.
- 넣음(마감 날짜가 아직 안 올라와 ‘날짜 미정’으로, 페이지에 적힌 사실만): UCDC 가을 2027(“late February”, 자격: 3·4학년, 3.0 권장), Cal in Local Government 여름 2027(12월에 신청 열림). 둘 다 인턴 › Policy & Law. 로컬 가져오기로 확인.
- 이 변경의 배포는 이 환경의 권한 검사에 막힘 → claude/lumi-pm 에만 올림, 배포는 사장님 확인 뒤.
- 다음: 12월에 Cal in Local Government 신청이 열리면 마감 날짜 넣기, UCDC 가을 마감 날짜가 올라오면 넣기, 가을에 다시 열리는 IGS 펠로십(Cal-in-Sacramento·Gardner 등)은 공지되면 넣기.

## 2026-11-02 05:30 UTC · 사장님 요청 — 연구실 칸, 인턴 분야(문과)
- 배포: 2e06318(대기 변경 전부, 디자인 알약 되살림), 48d86c1(사진 칸은 새 iPhone 앱 빌드에서만) — 사장님 허락. 라이브 번들 확인(11/2 방침 문구·디자인 알약·CalNet).
- 연구실: Lab 칸에 예시 1곳뿐이었다 → 버클리 연구 담당 부총장실 공식 Research Units 목록(125곳: 연구소·연구원·자연보호구역·식물원)을 일주일마다 가져옴(이름·책임자만, 이메일·전화 안 넣음. 상세 페이지는 자동 요청을 막아 열지 않음). server/sources/researchunits.ts, 테스트.
- 인턴 분야: 문과 칸이 없었다 → Policy & Law · Media & Writing · Nonprofit & Education · Health 추가, 개발·디자인 제목은 기술 분야 그대로. 분야 칩을 줄바꿈으로 한눈에 + 개수(0개는 흐리게). 채용 페이지 추가: Hearst(언론 인턴 13), Human Rights Watch, ACLU, ProPublica, Code for America, Sierra Club, Brookings. 지금 가져오면 언론 16·정책 4·비영리 1 — 여전히 적다(질문함).
- 255 통과.

## 2026-11-02 03:40 UTC · 사장님 배포 허락(1회) — 디자인 알약 되살림, 사진 문구 A
- 사장님: “디자인 버튼 놔두고, 다른 건 push 허락”. 사진 방침 문구는 A 로 답.
- 디자인 비교 알약(DesignToggle) 되살림. 개인정보처리방침 4곳(사진 수집·사진첩·계정 삭제 때 사진도 삭제·Last updated 11/2). iPhone 앱은 권한 문구가 없어 사진 칸을 웹에서만.
- 확인: tsc·서버 타입·테스트 252·프로덕션 빌드 통과, 화면 v2 5개 + classic 2개 오류 0, /privacy 새 문구 확인.

## 2026-11-02 03:17 UTC (버클리 일 19:17 PST) · 초점: Campus › For you
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로. 라이브에 쓴 것 없음.
- For you 목록: 동아리·해커톤·인턴 섞임 정상, 마감 지난 것 없음, 깨진 사진 0.
- 고침: 동아리 이름에 HTML 글자 코드가 그대로 — “Management, Entrepreneurship **&amp;** Technology Student Board”, “Food, Equity, Entrepreneurship, &amp; Development”, 소개 30곳에 “&#8212;”·“&#43;”(그리스 하우스 25곳 포함). 원인은 명단 가져오기(fetch-orgs)가 이름은 안 풀고 소개는 숫자 코드를 안 풂. 버클리 명단은 이제 로그인 뒤라 다시 가져와도 안 고쳐지므로 → 가져오기를 고치고 + 서버가 켜질 때 저장된 동아리 글자를 한 번 고침(server/orgtext.ts, 바뀐 것만, 테스트). 10/29 스냅샷으로 돌려 보니 32곳 고쳐지고 남은 코드 0. 252 통과. 배포 후 적용.

## 2026-11-02 00:17 UTC (버클리 일 16:17 PST) · 초점: 일요일 저녁 Rides·Plans
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로. 라이브에 쓴 것 없음. calendar:s_berkeley 여전히 error(22:21, 배포 전).
- Plans(투표 1·초대 1·확정 2·스터디 크루 1)·알림 4개 정상, 날짜 맞음.
- 고침: Rides 가 날짜만 봐서, 출발 시간 창이 끝난 차(예: Emma → Trader Joe's 4–5 PM)가 자정까지 ‘Today · Help/Join’ 으로 남았다 → 창이 끝나면 찾기 목록·Discover Rides 개수에서 빠지고, 내 차는 ‘지난 차’로, 상세는 “This ride has left”(core rides.ts `rideLeft`, 테스트 추가). 시계를 16:40 / 17:30 PST 로 두고 화면 확인 — 16:40 에는 보이고 17:30 에는 빠짐. 250 통과.

## 2026-11-01 21:17 UTC (버클리 일 13:17 PST) · 초점: 월요일 아침 Discover·People (겨울 시간 첫 수업일)
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로. 라이브에 쓴 것 없음. calendar:s_berkeley 여전히 error(배포 전).
- 브라우저 시계를 월 11/2 08:30 PST 로 두고 라이브 데이터로 봄: Discover “Free until 10 AM”, Activities Today 32 → Tomorrow 15 → Next 7 days(수요일부터) 정상. (식당·체육관 칸은 서버 시각이라 일요일 값 — 시뮬레이션 한계)
- 고침: People 카드의 공강 표시가 아침 9시 전에 “free 9 AM–11 AM”(시간표 칸 시작)으로 나오던 것 → “free 8:30 AM–11 AM”(지금 → 다음 수업). 30분 안 되는 틈에는 다음 큰 공강을 보여 주던 것도 같이(HomePage.tsx). 249 통과.

## 2026-11-01 18:17 UTC (버클리 일 10:17 PST) · 초점: 동아리 공식 사이트 더 (공학·학술)
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로. 라이브에 쓴 것 없음.
- 직접 열어 제목으로 확인한 4곳 추가(org-sites-berkeley.csv, 이제 15곳): BMUN(@berkeleymun), STAC(Facebook·LinkedIn), Formula SAE(@calformularacing·Facebook·LinkedIn), CalSol(@berkeleycalsol·Facebook).
- 넣지 않음: STAR·Formula Electric·Cal Animage Alpha·AAA(짐작 주소가 안 열림), VEX U(열리지만 제목이 비어 확인 못 함).

## 2026-11-01 15:17 UTC (버클리 일 07:17 PST) · 초점: 겨울 시간 첫날 — Rides·수업 공간·시간표
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로. 라이브에 쓴 것 없음.
- Rides: 날짜 묶음 Today(Emma → Trader Joe's, Sun 4pm)·Sat Nov 7·Tue Nov 24, 추수감사절 안내 정상. 수업 공간 CS 186 “Mon/Wed 10 AM · 수업 뒤 11 AM” 정상. 시간표 “Sun · No classes today”·11줄 정상. 고친 것 없음.

## 2026-11-01 12:20 UTC (버클리 일 04:20 PST) · 초점: 서머타임 끝(11/1 02:00) — 시간 계산
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로. 라이브에 쓴 것 없음.
- 고침: 직접 관리하는 공고 CSV 의 마감을 ‘그날 23:59 **-07:00**’ 로 고정해 넣고 있었다 — 오늘부터 겨울(UTC−8)이라 밤 10:59 에 닫힌다 → 날짜마다 버클리 시간대로(pacificToIso, import-opportunities.ts). 여름·겨울·3/14 서머타임 시작 테스트 추가. 249 통과. (다른 화면 계산은 Intl 시간대를 써서 문제 없음 — grep 확인)
- 확인(일 04:20 PST 라이브 데이터): The Den 7 AM 개점, Café 3 브런치 11 AM, RSF Opens 8 AM(일요일), 즉석 모임 8 AM 부터 — 시각 정상.

## 2026-11-01 09:17 UTC (버클리 일 01:17) · 초점: 새 화면들의 한국어
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로. 라이브에 쓴 것 없음.
- 라이브: calendar:s_berkeley 여전히 error(배포 전). 지금 라이브의 버클리 학교 행사(앞으로) 132개, 11/11 까지 — 새로 가져오면 176개라 날마다 줄어든다.
- 한국어: 글쓰기 사진 칸 안내(“사진 속 위치 정보는 지워서 올려요”), Activities “일주일 안”, 동아리 “CalNet 로그인” 정상.
- 고침: 동아리 링크 이름이 한국어 화면에서도 “Directory / Website” → “동아리 명부 / 웹사이트”(서비스 이름 Instagram 등은 그대로, OrgPage.tsx). 영어 화면은 그대로.

## 2026-11-01 06:17 UTC (버클리 토 23:17) · 초점: 행사 가져오기 수정이 실제 데이터로 도는지
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로. 라이브에 쓴 것 없음.
- 라이브 작업 기록: calendar:s_berkeley 여전히 error(04:20, 같은 code point 오류), detect:s_berkeley 1분마다 rejected — 둘 다 고친 코드는 배포 전.
- 확인: 고친 코드로 버클리 LiveWhale 캘린더(events.berkeley.edu, 14일치)를 실제로 끝까지 가져와 봄 — 176개, 8초, 오류 없음, ‘No … today’ 알림 0, 깨진 글자 0. 배포되면 다음 6시간 주기에 다시 돈다.

## 2026-11-01 03:17 UTC (버클리 토 20:17) · 초점: 데이터 에이전트 실행 기록 (/api/agent/status, 읽기 전용)
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로. 라이브에 쓴 것 없음.
- ⚠️ 찾음(내 잘못): `calendar:s_berkeley` 가 10/31 22:20 부터 error “Invalid code point 551899002633743” — 10/30 에 배포된 내 숫자 문자 코드 풀기(`String.fromCodePoint`)가 깨진 큰 숫자에서 RangeError 를 던져 **버클리 학교 행사 가져오기 전체가 멈춤**(그 전 행사는 남아 있음). 같은 코드가 OURS·식당 메뉴·**그리스 가져오기**에도 있었다.
- 고침: 안전한 `decodeNumericEntities`/`charFromCode`(범위 밖은 버림) 하나로 4곳 교체(server/sources/entities.ts). 테스트(그 숫자 그대로) 추가.
- 찾음: `detect:s_berkeley` 가 1분마다 rejected — CalLink 가 로그인으로 닫혀 동아리 명부를 못 찾으면 조건 `!host || …` 때문에 ‘하루 뒤’ 가 아니라 바퀴마다(30초) 다시 탐지. → 기록이 없을 때만 바로, 못 찾았으면 24시간 뒤.
- 찾음: 그리스 명단은 `npm run agent`(일요일 한 번 실행) 에만 있고 상시 워커 루프에는 없었다 — 그래서 10/25 뒤로 안 바뀜. → 워커 루프에 7일마다 추가. 지금 사이트로 미리 돌려 봄(로컬 파일 DB): 62곳, 깨진 글자 0.
- ⛔ 배포 필요: 행사 가져오기는 배포 전까지 계속 멈춰 있다.

## 2026-11-01 00:17 UTC (버클리 토 17:17) · 초점: 토요일 저녁 Discover + 일요일 가져오기 대기
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로. 라이브에 쓴 것 없음.
- 그리스: UTC 일요일이 막 시작 — 주간 가져오기 아직 전(&# 25곳, Panhellenic 을 fraternity 로 쓴 설명 5곳 그대로). 다음 실행에서 다시 셈. Girls Who Code HHS 해커톤은 수정이 배포 전이라 그대로.
- Discover(토 17:17): 식당 6곳 운영·저녁 메뉴, 체육관 79% Busy, 즉석 모임 5개 모두 SAMPLE·지난 시각 없음. 고친 것 없음.
- README: 화면 보기를 v2 기준으로(Classic 은 10/30 사장님 결정으로 학생에게 안 보임 — 비교할 때만).

## 2026-10-31 21:17 UTC (버클리 토 14:17) · 초점: 동아리 공식 사이트 더 넣기
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로. 라이브에 쓴 것 없음.
- 직접 열어 제목으로 확인한 4곳 추가(org-sites-berkeley.csv, 이제 11곳): Data Science Society(dssberkeley.org → @dssberkeley·LinkedIn), Engineers Without Borders(ewb.berkeley.edu), SWE(swe.berkeley.edu → @ucb_swe·TikTok·LinkedIn·Facebook), Hackathons at Berkeley(hackberkeley.org → @calhacks·Facebook).
- 넣지 않음: Daily Cal(Cloudflare 확인 화면 — 우회 안 함), CSUA·WiCSE·KASA·Cal in the Capital(주소가 안 열림 — 짐작 주소는 안 넣음).

## 2026-10-31 18:18 UTC (버클리 토 11:18) · 초점: 동아리 링크 2단계 — studentorg 주소를 안 쓰는 인기 동아리
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로. 라이브에 쓴 것 없음.
- 추가: 확인한 공식 사이트 목록 server/data/org-sites-berkeley.csv (org_id,site,checked,evidence) — 주간 동아리 링크 작업이 이 사이트도 열어 동아리가 걸어 둔 소셜만 가져온다. 7곳: CHAOS(chaosberkeley.org → Discord·Facebook·@chaosberkeley), Blueprint(@calblueprint), Codeology, Berkeley Consulting(@berkeleyconsulting), ML@B(@mlberkeley), UPE, Berkeley Forum(@berkeleyforum). 각 사이트는 직접 열어 제목·내용으로 그 동아리임을 확인.
- ⚠️ 걸러냄: 검색이 Berkeley Investment Group 사이트라던 berkeleyinvestment.com 은 열어 보니 부동산·투자 블로그(/realestate/ 등)로 동아리 사이트가 아님 → 넣지 않음.
- 고침: 페이지 코드 안의 `facebook.com/2008/fbml`(기술 주소)이 Facebook 링크로 잡히던 것 → 거름. 테스트 247 통과.

## 2026-10-31 15:17 UTC (버클리 토 08:17) · 초점: 채팅 목록 (10/27 뒤로 처음)
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로. 라이브에 쓴 것 없음.
- /chats v2·classic: “Free right now” 6명·대화 3개 모두 SAMPLE, “2h ago / 1d ago” 시간, 탭(Direct·Activities·Groups·Requests 1) 정상. 고친 것 없음.

## 2026-10-31 12:18 UTC (버클리 토 05:18) · 초점: Me 화면 (10/20 뒤로 처음)
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로. 라이브에 쓴 것 없음.
- v2·classic: Key dates(D-15 Phase 1 끝·기말·드롭 마감, 학교 공식 달력), 주간 시간표(데모 시간표 11줄 — 10/30 복구 확인), 프로필 카드·좌석 알림·Friends·My Plans 정상.
- 고침: “Upcoming Hangouts” 의 예시 모임 3개에 SAMPLE 표시가 없던 것 → 붙임(ProfilePage.tsx, My Plans 와 같은 규칙). 테스트 통과.

## 2026-10-31 09:17 UTC (버클리 토 02:17, 핼러윈) · 초점: 주말 Discover › Activities
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로. 라이브에 쓴 것 없음.
- 찾음: 토요일에 보면 “This week” 묶음에 다음 주 월요일(11/2) 행사 109개가 들어 있다 — 묶음 규칙이 ‘오늘부터 6일 안’이라 주말엔 다음 주 평일이 된다.
- 고침: 묶음 이름을 뜻대로 “Next 7 days / 일주일 안” (DiscoverPage.tsx). v2·classic·한국어 확인(Today 13 · Tomorrow 7 · Next 7 days 109 · Coming up 100). 테스트 통과.

## 2026-10-31 06:17 UTC (버클리 금 23:17) · 초점: 배포 전 전체 점검 (배포 대기 9커밋)
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로. 라이브에 쓴 것 없음(쓰기 막고 라이브 데이터 읽기만).
- 앱·서버 타입, 테스트 246, 프로덕션 빌드 통과.
- 로그인 화면 21개(/, Discover 3탭, Campus 피드·For you·인턴·동아리, 시간표, Me, Plans, 알림, 채팅, Rides, 설정, 지도, 글쓰기, 활동 만들기, 좌석, 식당, 체육관) + 로그인 전 4개(/welcome, /start, /privacy, /terms) — 화면 오류 0, 깨진 사진 0. 디자인 알약 사라짐 확인.
- 고친 것 없음. 배포해도 되는 상태(사진 올리기만 개인정보처리방침 문구 결정 필요).

## 2026-10-31 03:17 UTC (버클리 금 20:17) · 초점: 사진 올리기 — 지운·신고된 글의 사진
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로. 라이브에 쓴 것 없음(로컬 서버·파일 DB 로만).
- 찾음(어제 만든 것의 구멍): 사진 주소(/api/media/<id>)는 로그인 없이 열리고 1년 캐시라, 글이 지워지거나 신고 3건으로 숨겨지거나 작성자가 정지돼도 주소만 알면 계속 보였다.
- 고침: 사진은 붙은 글이 살아 있고 숨김·정지가 아닐 때만 보여 준다. 아직 글에 안 붙은 사진(쓰는 중 미리보기)은 올린 지 2시간까지만. 캐시는 1시간(`mediaVisible`, server/media.ts). 테스트 추가.
- 확인(로컬 끝까지): 사진 붙여 글 올리기 → 피드에 사진 800×600 표시 → 글 지우기. 지운 직후는 2시간 창 안이라 열림(의도), 창 밖·숨김·정지 경우는 테스트로 404 확인. 테스트 246 통과.

## 2026-10-31 00:17 UTC (버클리 금 17:17) · 초점: 사장님 결정 — 진짜 사진 올리기
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로. 라이브에 쓴 것 없음(로컬 서버·로컬 파일 DB 로만 시험).
- 만듦: 서버 media 표(Postgres, 로컬은 파일) + POST /api/media(로그인, 하루 40장, 1.2MB, JPEG·PNG·WebP 를 파일 앞부분으로 확인) + GET /api/media/:id(긴 무작위 id, 1년 캐시, nosniff), 계정 삭제 때 사진도 지움. 앱: 글쓰기 ＋ 가 사진첩을 열고, 올리기 전 긴 변 1600px·WebP 로 줄여 위치정보 제거(src/lib/photoUpload.ts). 샘플 사진 고르기 줄은 뺌. 목업 모드는 기기 안 data: URL.
- 확인: 로컬 서버로 401(로그인 없이)·200 올리기·같은 바이트로 내려줌·SVG 거절 400·이상한 id 404, 화면에서 실제 파일 골라 미리보기 800×600. 테스트 245 통과.
- 물어봄: 개인정보처리방침 “photos 를 읽지 않는다” 문장 — 배포 전에 고쳐야(QUESTIONS 10/31).

## 2026-10-30 21:17 UTC (버클리 금 14:17) · 초점: 사장님 큰 작업 ③ 동아리 웹사이트·인스타
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로. 라이브에 쓴 것 없음.
- 방법: 검색으로 비슷한 계정을 고르면 틀리기 쉽다 → 버클리 동아리 공식 사이트 `<CalLink 이름>.studentorg.berkeley.edu` 가 열리면 웹사이트로 넣고, **동아리가 그 사이트에 직접 걸어 둔** 인스타·페이스북·디스코드·링크드인·TikTok·Linktree 만 가져온다(게시물·공유 버튼 링크는 계정 주소로 줄이거나 뺌). 서버가 일주일에 한 번 다시 확인(server/sources/orgsites.ts, agent run.ts).
- 실제로 1,472개 전부 확인(평범한 요청): 82곳에 웹사이트, 46곳은 소셜까지 (예: Noteworthy → 웹사이트·Facebook·Instagram·TikTok, Blockchain at Berkeley → @calblockchain·LinkedIn·Facebook).
- 화면: 링크 칩 순서 웹사이트·소셜 먼저, CalLink(“Directory”) 는 맨 뒤 + “· CalNet login” 표시(OrgPage.tsx). 동아리 일요일 가져오기(fetch-orgs)는 기존 링크를 앞에 두고 덧붙이므로 지워지지 않음(확인).
- 한계: 나머지 ~1,390곳은 studentorg 사이트가 없거나 다른 주소 — 다음 단계는 검색 + 사이트 안 링크 확인(사람이 볼 것은 QUESTIONS 로).
- 테스트 243 통과. 로컬에 끼워 넣어 Noteworthy·Haas Consulting 화면 확인.

## 2026-10-30 18:17 UTC (버클리 금 11:17) · 초점: 사장님 큰 작업 ① 인턴 다양화 — 2단계
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로. 라이브에 쓴 것 없음.
- ⛔ 막힘(우회 안 함): Workday 기본 채용 주소를 회사 이름만으로 알아내려고 브라우저처럼 꾸민 요청(User-Agent·Accept)을 보내려 했더니 실행 권한 판정이 “봇 확인 우회”로 거부. 그 방법은 쓰지 않는다. 웹 검색으로도 Workday 주소는 안 나옴(구인 사이트·블로그만).
- 대신: SmartRecruiters 공개 API(로그인 없음, 평범한 요청) 를 붙임 — Bosch(물류·품질 29), Equinox(피트니스 트레이너 10), Western Digital(영업·마케팅 10), ServiceNow(디자인·글쓰기 5). 공고 링크 jobs.smartrecruiters.com 열림(200) 확인.
- 실제로 전체 인턴 가져오기를 돌려 봄: 311 → **461**. Business & Marketing 20→61, Finance & Consulting 18→31, Software+Data 비중 53%→43%. (Fidelity 는 지금 0)
- 테스트 242 통과. 배포 + 다음 인턴 가져오기 뒤 라이브.
- 다음: 회사 목록을 늘리는 건 주소(slug)를 아는 게 관건 — 사장님이 원하는 회사·분야 목록을 주시면 하나씩 확인해 넣을 수 있다.

## 2026-10-30 15:22 UTC (버클리 금 08:22) · 초점: 배포 전 점검 — 새 장학금·교환 데이터를 화면에 넣어 보기
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로. 라이브에 쓴 것 없음(가져온 데이터는 로컬 화면에만 끼워 넣음).
- ⚠️ 정정: 지난 실행에 “OURS 장학금 9 → 17” 이라 적었는데 틀렸다. 늘어난 8개는 이미 전국 CSV(op_all_…)에 있던 것이라 화면에 **두 줄**로 나왔다(CBYX·Hollings·Lafayette·Princeton in Asia·FAO Schwarz·Huntington·Hertz·CLS·Goldwater 여름 인턴).
- 고침: OURS 가져오기는 버클리 CSV 에서 옮긴 8개(Goldwater·Truman·Boren·Gaither·Yenching·Udall·Strauss·David-Weill)만 이어받아 마감을 공식 페이지대로 매일 맞추고, 전국 CSV 가 가진 것은 건드리지 않는다(`mergeWithExisting`, 테스트). 실제 효과 = 새 장학금 0개, 8개 마감 정확도(Goldwater 12/14·Truman 12/16).
- 고침: 교환 목록에서 “Find an Independent Program, Planned Leave of Absence”(휴학 신청 안내) 줄을 뺌.
- 확인: Study abroad 탭 319개 표시·D-day·후원 기관 정상. 테스트 241 통과.

## 2026-10-30 12:28 UTC (버클리 금 05:28) · 초점: 사장님 큰 작업 ② — 교환학생(Study abroad) 채우기
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로(aa70712 이후 4커밋 배포 대기). 라이브에 쓴 것 없음.
- 추가: Berkeley Study Abroad 공식 목록(studyabroad.berkeley.edu/explore/programs, 로그인 없음, 12쪽) 가져오기 — server/sources/studyabroad.ts, 하루 1번. 줄 하나 = 프로그램 한 학기: 마감(그날 23:59 PT)·지원 시작일·지역·언어·학년·GPA·후원 기관, 링크는 그 프로그램 공식 페이지(UCEAP 는 uceap.universityofcalifornia.edu). 마감 없는·지난 줄은 뺀다.
- 실제 사이트로 돌려 봄: 318개(UCEAP 299 · Berkeley Global Internships 15 · Independent 3 · Summer Abroad 1). Study abroad 탭이 1 → 318 (배포 + 첫 가져오기 뒤).
- 발견: 사이트가 한 줄에 마감을 두 번 쓰고 하루씩 다르다(표 01/13, 설명 01/14) → 더 이른 날을 쓴다(놓치지 않게).
- 확인: 테스트(실제 줄 3개로 만든 fixture) 추가, 240 통과.

## 2026-10-30 09:19 UTC (버클리 금 02:19) · 초점: 사장님 큰 작업 ② 장학금·연구·교환 채우기 — 1단계(출처 찾기 + 장학금)
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로(aa70712·03642e2 배포 대기). 라이브에 쓴 것 없음.
- 로그인 없이 읽히는 버클리 공식 목록 확인: ① OURS 장학금 scholarships.berkeley.edu (WordPress 공개 API, 장학금 페이지 ~38개, 본문에 “Next Campus Deadline: …”) ② URAP 연구 견습 urapprojects.berkeley.edu/list.php (공개, 지금은 Fall 마감이라 0개 — Spring 목록 올라오면 가져올 수 있음) ③ 교환 studyabroad.berkeley.edu/explore/programs (공개 목록, 프로그램 페이지마다 마감).
- 추가: OURS 장학금 가져오기(server/sources/ours.ts, 하루 1번) — 마감을 읽은 것·안 지난 것만, 17개(지금 손으로 넣은 9개 → 17). 손으로 넣은 CSV 9줄은 빼고, 같은 페이지 항목은 id 를 이어받아 저장·Q&A 유지.
- 발견(데이터 틀림): 손으로 넣은 Goldwater 마감 12/7 → 공식 12/14 정오, Truman 12/14 → 12/16 정오. 가져오기가 고친다.
- 확인: 실제 사이트로 가져와 봄 17개, 마감 꼴 5가지 테스트, 239 통과. 배포 뒤 라이브 반영.
- 다음: URAP Spring 목록(올라오면) → 연구 탭, 교환 프로그램 목록 → Study abroad 탭.

## 2026-10-30 06:19 UTC (버클리 목 23:19) · 초점: 사장님 큰 작업 ① 인턴 분야 다양화 — 1단계
- 사장님 새 답 없음. 배포 브랜치 b158d1d 그대로(10/30 작업분 aa70712 은 배포 대기). 라이브에 쓴 것 없음.
- 조사: 지금 인턴 출처 79곳은 Greenhouse·Lever·Ashby 게시판 — 테크·퀀트 위주. 테크 아닌 회사 49곳을 같은 방식으로 찔러 봄 → 대부분 404 거나 인턴 0 (Ogilvy 9개는 전부 해외). 테크 아닌 큰 회사는 **Workday** 를 쓰고, Workday 공개 검색 API 는 로그인 없이 열림(확인).
- 추가: Workday 가져오기(`workdayJobs`, ‘intern’ 검색 → 인턴 제목만 → “N Locations” 는 상세로 나라 확인) + 실제로 지금 미국 인턴이 있는 8곳: Disney(24: 방송·엔터·세무), Target(29: 매장 리더십), Fidelity, Pfizer, Gilead(14), Clorox(7: 브랜드·R&D·재무), Humana(6), Adobe. 분야 규칙에 brand·merchandis·retail·store leadership → Business & Marketing, R&D → Research.
- 확인: 실제 API 로 4곳 가져와 봄(Disney 24·Target 29·Clorox 7·Humana 6). 테스트 추가, 238 통과. 배포 + 다음 인턴 가져오기(12시간) 뒤 라이브에 보임.
- 다음 단계(에이전트): Workday 주소(host·tenant·site)를 회사 채용 페이지에서 자동으로 찾아 분야별(금융·컨설팅·광고·미디어·소비재·헬스케어·비영리·정부) 목록을 늘린다. 이번에 site 이름을 짐작해 본 30곳 중 20곳이 422/404 — 짐작 말고 찾기가 필요.

## 2026-10-30 · 사장님과 대화 — 배포 + 질문 답 + 작업
- 🚀 배포(사장님 “push허락함요”): lumi-pm → friendly-euler-emuo1f fast-forward 1542420..b158d1d (17커밋). 3분 뒤 새 번들 index-mNnWVo_n.js 라이브. 라이브 화면(쓰기 막고) My Plans·알림·활동 상세·예시 동아리 확인.
- 데모 시간표 복구(사장님 B 허락, 라이브 쓰기 1회): CS 61A 4줄만 빼서 15→11줄, 확인.
- 디자인 알약 삭제(New 하나로), 키 칸 화면에서 숨김, 예시 할인(Café Milano) 시드·라이브 삭제(서버 시작 때), 시작 화면 “Another school?” 45개 학교 대기 명단. 앱·서버 타입, 테스트 237 통과. 로컬에서 /start 학교 고르기→이메일→Notify me(요청은 막음) 확인.
- 사장님 피드백(큰 일, 다음 작업): ① 인턴이 테크 회사 35곳 위주(Software 98·Data 66) — 분야 다양화 에이전트 ② 장학금 49·연구 43·창업 1·교환 1 — 분야별 채우기 에이전트 ③ 동아리 링크(CalLink)가 CalNet 로그인 필요, CalLink 공개 검색 API 도 이제 로그인으로 넘어감(10/30 확인 — 일요일 동아리 가져오기는 실패하지만 기존 동아리는 안 지워짐) → 동아리 인스타·웹사이트 찾기 에이전트 ④ 동아리(CHAOS 등) 운영 기능 조사 — CHAOS 메일은 사장님이 다른 Gmail 연결 뒤 새 세션에서.
- 진짜 사진 올리기(사장님 B) — 큰 작업, 따로.

## 2026-10-30 03:17 UTC (버클리 목 20:17) · 초점: 목요일 저녁 Discover (Now·Activities)
- 사장님 답: 아직 없음. 배포 브랜치 1542420 그대로. 라이브에 쓴 것 없음.
- v2·classic: 식당 “Café 3, Clark Kerr +3 open · dinner”, 체육관 47%, 즉석 모임 8:30·9:30 PM(지난 것 없음), 예시 전부 SAMPLE. Activities 날짜 묶음(Today 4·Tomorrow 21·This week 82) 정상.
- 확인만: “CSC Winter Sparkathon · Today · D-32” — 제출 기간이 오늘(10/29 05:00 PT) 시작해서 맞는 표기. 내일부터는 D-day 만.
- 그대로: 맨 위 “Free 8:20 PM–9 PM” 는 데모 시간표(10/20 실수 줄 포함) 때문 — 10/20 질문 답 기다림.
- 고친 것 없음.

## 2026-10-30 00:18 UTC (버클리 목 17:18) · 초점: 새로 들어온 공고·행사 훑기 (10/29 가져오기 뒤)
- 사장님 답: 아직 없음. 배포 브랜치 1542420 그대로. 라이브에 쓴 것 없음(읽기만).
- 라이브 셈: 인턴 311(같은 회사·제목·장소 중복 0), 행사 347, 해커톤 109, 장학금 49, 연구 43. 30시간 안에 새로 들어온 것 20개.
- 고침(가져오기): 버클리 행사에 “No Bioengineering Seminar Today”(11/4·11/11) — 세미나가 **없다는** 알림이 행사로 2개 들어옴 → ‘No … today/this week/tonight’·‘Cancelled/Postponed’ 제목은 행사로 안 넣음(`isNoticeNotEvent`, LiveWhale·Localist 둘 다). 설명에 “&#160;” 가 그대로 남던 것(Veterans Day) → 숫자 문자 코드 풀기. 테스트 추가(고치기 전 실패/후 통과). 배포 + 다음 행사 가져오기 뒤 반영.
- 확인(화면): 버클리 사용자 Events·Scholarships·Hackathons·Activities 에 UC Merced 행사(데이터엔 s_ucmerced 165개)·마감 지난 5개(Princeton in Africa, NSF GRFP, Micro Mouse, 예시 Stripe·Civic Data) 안 보임.
- 확인: 앱·서버 타입, 테스트 236 통과.

## 2026-10-29 21:17 UTC (버클리 목 14:17) · 초점: 좌석 알림·수업 공간(CS 186)
- 사장님 답: 아직 없음. 배포 브랜치 1542420 그대로. 라이브에 쓴 것 없음.
- /seats(빈 상태 “Watch a Spring 2027 class…”·Find a class), /classes/CS 186 Databases v2·classic 정상. 예시 Will·예시 Study Crew 에 SAMPLE, “Free after CS 186 · Mon/Wed 11 AM” 수업 시각과 맞음.
- 작은 메모: v2 Study Crew 줄은 버튼이 넓어 “4 spots / left” 가 두 줄 — 읽는 데 문제 없어 그대로.
- 고친 것 없음.

## 2026-10-29 18:18 UTC (버클리 목 11:18) · 초점: 활동 만들기·글쓰기 화면 (10/22 뒤로 처음, 제출은 안 함)
- 사장님 답: 아직 없음. 배포 브랜치 1542420 그대로. 라이브에 쓴 것 없음.
- /create/activity, /create/post v2·classic: 항목·기본값(오늘 6–7:30 PM, Doe Library)·공개 범위 설명 정상.
- 고침: 글쓰기 “함께한 사람” 칩(Sofia·Jordan·Lily)과 “참여한 활동” 목록이 예시 사람·예시 모임인데 표시가 없어 진짜 친구를 태그하는 것처럼 보였다 → 칩에 SAMPLE, 목록 항목 끝에 “(sample)/(예시)” (CreatePostPage.tsx).
- 그대로: 사진 칸 “The demo uses sample photos” — 10/16 질문 그대로.
- 확인: 앱·서버 타입, 테스트 235 통과. (스크린샷 스크립트에 SCROLL=문구 로 그 위치까지 내려 찍는 판 추가 — scratchpad scroll.mjs, 쓰기 차단 그대로)

## 2026-10-29 15:20 UTC (버클리 목 08:20) · 초점: 다른 사람 프로필(Maya)·예시 동아리 상세(Cal Indie)
- 사장님 답: 아직 없음. 배포 브랜치 1542420 그대로. 라이브에 쓴 것 없음.
- 프로필·동아리 상세 v2·classic 정상(SAMPLE 표시, 공통 수업·관심사, 활동 카드).
- 고침: 예시 동아리 4곳의 바깥 링크가 instagram.com/example · discord.gg/example · notion.so/example · example.com — 누르면 우리와 상관없는 남의 실제 계정·페이지로 간다 → 예시 동아리에는 링크 칩을 안 보임 (OrgPage.tsx). 진짜 동아리(예: Ai Robotics @ Berkeley 의 Directory)는 그대로.
- 메모: 예시 동아리 공지 날짜가 9/22 — 예시라 그대로.
- 확인: 앱·서버 타입, 테스트 235 통과.

## 2026-10-29 12:37 UTC (버클리 목 05:37) · 초점: 목요일 이른 아침 Discover·식당
- 사장님 답: 아직 없음. 배포 브랜치 1542420 그대로. 라이브에 쓴 것 없음. (실행이 예정 12:17 보다 20분 늦게 시작)
- v2·classic /discover, /dining: 식당 카드 “Café 3 opens 7 AM · Scrambled Eggs, breakfast from 7 AM”, 체육관 “Closed · Opens 7 AM”, /dining 은 아침 메뉴부터. 즉석 모임은 8 AM 부터(새벽 시각 없음), 전부 SAMPLE. 어제 고친 날짜 계산 이후 표기 어긋남 없음.
- 고친 것 없음.

## 2026-10-29 09:17 UTC (버클리 목 02:17) · 초점: Campus › Startups·Study abroad·Scholarships (10/18 뒤로 처음)
- 사장님 답: 아직 없음. 배포 브랜치 1542420 그대로. 라이브에 쓴 것 없음.
- Startups·Study abroad: 여전히 1개씩(SkyDeck, Berkeley Study Abroad). 지어내지 않음.
- 고침: Scholarships 에서 Swan Award 가 “D-1” 인데 이유 줄은 “✨ Closes in 2 days”. 마감 10/30 23:59 PDT(=UTC 10/31 06:59). 배지는 버클리 달력으로 세는데 For you 이유(foryou.ts `daysTo`)는 UTC 날짜로 세서, 버클리 저녁 5시~자정에 하루 어긋났다 → 버클리 달력으로 (campusDate). 테스트 추가(고치기 전 실패/후 통과). 같은 함수를 쓰는 “Today/Tomorrow” 이유도 같이 맞음.
- 확인: v2·classic Scholarships·Hackathons 의 D-n 과 “Closes in n days” 전부 일치. 앱·서버 타입, 테스트 235 통과.
- 라이브: Girls Who Code HHS 해커톤 아직 있음 — 10/28 수정이 배포 전이라 예상대로.

## 2026-10-29 06:18 UTC (버클리 수 23:18) · 초점: 설정·공개 범위·계정 안전 (10/21 뒤로 처음)
- 사장님 답: 아직 없음. 배포 브랜치 1542420 그대로. 라이브에 쓴 것 없음.
- /settings, /settings/privacy, /settings/safety 를 v2·classic 으로 봄. 목록·공개 범위 칩·메시지 제한·차단 목록 정상, 글자 잘림 없음.
- 그대로 남은 것: 데모 계정 My reports 의 “TEST report filed by Claude…” 줄 — 10/18 질문(사장님 손 필요, 라이브 DB) 그대로. Height “Only me” 는 10/16 키·데이팅 질문과 같은 건.
- 고친 것 없음.

## 2026-10-29 03:18 UTC (버클리 수 20:18) · 초점: 알림 화면 (10/21 뒤로 처음)
- 사장님 답: 아직 없음. 배포 브랜치 1542420 그대로. 라이브에 쓴 것 없음.
- 고침: 데모 계정 알림 4개(Lily 제안, Maya 팔로우, Blue Bottle 모임, Cal Indie 공연)가 전부 예시 사람·모임 이야기인데 SAMPLE 표시가 없어 진짜 알림처럼 보였다 → 시드 알림 id(nt1…nt9)면 SAMPLE/예시 (sampleorgs.ts `isSampleNotification`, NotificationsPage.tsx). 진짜 알림 id 는 uid('nt') = ‘nt_…’ 또는 ‘n_seat_…’ 라 겹치지 않음 — 테스트 추가.
- 확인: v2·classic·한국어 다시 찍어 봄. 앱·서버 타입, 테스트 234 통과.
- 메모: 한국어 화면에서도 알림 문장은 영어(라이브 시드가 영어). 버클리 데모라 그대로 둠.

## 2026-10-29 00:18 UTC (버클리 수 17:18) · 초점: 그리스 표기 라이브 확인 + Rides (10/21 뒤로 처음)
- 사장님 답: 아직 없음. 배포 브랜치 1542420 그대로. 라이브에 쓴 것 없음(읽기만).
- 그리스: 86곳 중 &# 표기 아직 25곳. 원인 아님 — 그리스·동아리 가져오기는 **UTC 일요일에만** 돈다(run.ts `getUTCDay() === 0`). 마지막이 10/25(배포 전), 다음은 11/1. 11/1 이후 실행에서 다시 센다.
- Rides: 목록·상세(v2·classic) 정상. 날짜 묶음, SAMPLE 표시, 좌석 수, “Thanksgiving break” 안내 맞음. 데모 계정의 취소된 SFO 같이 타기도 데이터에 sample:true 라 SAMPLE 표시가 맞다.
- 다시 보인 것: Design 알약이 Rides 의 “My rides” 탭과 상세 제목을 가린다 — 이미 QUESTIONS.md 의 ‘Design 알약’ 질문에 있다.
- 고친 것 없음.

## 2026-10-28 21:18 UTC (버클리 수 14:18) · 초점: 활동 상세 — 지금 진행 중·이미 지난·큰 행사
- 사장님 답: 아직 없음. 배포 브랜치 1542420 그대로. 라이브에 쓴 것 없음.
- 본 것: Stats 스터디(14:00 시작, 진행 중), 동아리 리크루팅(11:00, 17:00까지), 점심(14:30), Homecoming(Sun Nov 1). 시간·“Today 2 PM – 5 PM” 표기 정상, 깨진 사진 0.
- 고침: 상세의 주최자 칸에서 예시 동아리(Statistics Undergraduate Association)·예시 사람(Jordan)에 **인증 체크**가 붙어 지어낸 주최자가 확인된 것처럼 보이던 것 → 예시면 체크 대신 SAMPLE (OrgCard·사람 카드와 같은 규칙, ActivityDetailPage.tsx). 긴 이름은 말줄임.
- 확인: v2·classic 다시 찍어 봄. 앱·서버 타입, 테스트 233 통과.
- 메모: Homecoming(예시) 사진이 사막의 티피 — 그리스 극장과 무관. 예시 데이터라 그대로 둠.

## 2026-10-28 18:18 UTC (버클리 수 11:18) · 초점: My Plans 예시 표시 (지난 실행 메모)
- 사장님 답: 아직 없음. 배포 브랜치 1542420 그대로. 라이브에 쓴 것 없음.
- 고침: My Plans 의 예시 항목에 SAMPLE 표시가 없어 진짜 약속처럼 보이던 것 → 예시 활동(a.sample), 예시 사람이 연 시간 투표·제안·친구 요청에 SAMPLE/예시 표시 (PlansPage.tsx). 다른 화면과 같은 SampleTag.
- 고침: Study Crew 줄에서 제목이 이미 “UGBA 105 …”로 시작하는데 오른쪽에 “UGBA 105 Entrepreneurship” 표시를 또 붙여 제목이 “UGBA 10…”로 잘리던 것 → 제목이 수업 번호로 시작하면 표시 생략.
- 확인: v2·classic 다시 찍어 봄. 앱·서버 타입, 테스트 233 통과.

## 2026-10-28 15:27 UTC (버클리 수 08:27) · 초점: 지도(/map)·My Plans — 10/17 뒤로 처음
- 사장님 답: 아직 없음. 배포 브랜치 1542420 그대로. 라이브에 쓴 것 없음.
- 고침: 지도 목록 카드에서 주최 이름이 길면(“Cal Indie Collective (band club)”) 인원 칸이 “0 / joined” 두 줄로 깨지던 것 → 인원은 한 줄 고정, 이름은 말줄임 (ActivityCard.tsx).
- 고침: My Plans 받은 제안 줄이 버튼 두 개에 밀려 날짜가 세 줄·메시지 “Algorith…”로 잘리던 것 → 버튼을 아래 줄로 (PlansPage.tsx). Study Crew 줄은 수업 이름 표시가 넓어서 제목이 “UGBA 105 …”로 잘리던 것 → 오른쪽 표시는 최대 40%, 넘치면 말줄임.
- 확인: v2·classic 둘 다 고친 뒤 다시 찍어 봄. 앱·서버 타입, 테스트 233 통과.
- 메모(다음에): My Plans 의 예시 항목(Sofia 타코 투표, Lily 제안, Cal Indie 공연)에는 SAMPLE 표시가 없다 — 다른 화면과 맞출지 다음 실행에서 본다.

## 2026-10-28 12:30 UTC (버클리 수 05:30) · 초점: 10:13 가져오기 뒤 라이브 데이터
- 사장님 답: 아직 없음. 배포 브랜치 1542420 그대로. 라이브에 쓴 것 없음.
- 확인(라이브): 인턴 309개, 같은 회사·제목·장소 중복 0, 주택 co-op 정규직 사라짐 → 지난 배포의 인턴 수정이 실제로 먹었다.
- 남은 것: 고등학생 해커톤(Girls Who Code HHS, “Ages 14 to 18 only”)이 10:13 Devpost 가져오기 뒤에도 그대로. 원인: `isYouthOnly` 가 ‘누가 참가 가능’ 상자가 없는 해커톤 페이지 하나만 만나도 Cloudflare 차단으로 보고 그 회차의 나머지 확인을 전부 멈췄다.
- 고침: 진짜 차단(응답 실패·Cloudflare 확인 화면 `isChallengePage`)일 때만 멈추고, 상자 없는 페이지는 그 하나만 ‘모름’으로 넘김 (server/sources/external.ts, 테스트 추가). 서버 타입·테스트 233 통과.
- ⚠️ 이 수정은 배포(사장님 허락) + 다음 Devpost 가져오기 뒤에야 라이브에 반영된다.

## 2026-10-28 09:17 UTC (버클리 수 02:17) · 초점: 배포된 데이터 수정이 들어왔는지
- 사장님 답: 아직 없음(배포 허락 외). 배포 브랜치 1542420. 라이브에 쓴 것 없음.
- 확인: 마지막 인턴·Devpost 가져오기가 10/27 22:13 UTC — 배포(10/28 03:40) **전**이다. 그래서 인턴 중복 5·co-op 정규직·고등학생 해커톤이 아직 남아 있는 게 맞다. 다음 가져오기는 10/28 10:13 UTC 무렵(12시간 주기) — 다음 실행(12:17)에서 빠졌는지 본다.
- 고친 것 없음.

## 2026-10-28 06:19 UTC (버클리 화 23:19) · 초점: 배포 뒤 데이터 + 행사 중복
- 사장님 답: 배포 허락(지난 실행에 반영). 그 외 질문은 아직. 배포 브랜치 1542420 (내가 올린 것 그대로). 이번엔 다시 claude/lumi-pm 에만. 라이브에 쓴 것 없음.
- 배포 2.5시간 뒤 라이브 데이터: 인턴 중복 5줄·주택 co-op 정규직·고등학생 해커톤·그리스 단체 표기(&# 25곳, Panhellenic ‘Fraternity’ 4곳)는 **아직 그대로** — 각각 다음 가져오기(인턴 12시간, Devpost, 그리스 주 1회) 때 바뀐다. 다음 실행들에서 다시 본다.
- 셈: 버클리 행사 213개 중 같은 제목·같은 날 중복 0 (CalLink·학교 달력 겹침 없음).
- 데모 계정 시간표 15줄 그대로(10/20 실수분 포함, 답 기다림).
- 고친 것 없음.

## 2026-10-28 03:40 UTC · 🚀 배포 — 사장님 허락으로 claude/lumi-pm → claude/friendly-euler-emuo1f
- 사장님 채팅 “push허락함요” (이번 한 번). 합친 상태에서 앱 타입·서버 타입·테스트 232·프로덕션 빌드 통과 확인 후 fast-forward push: 6fb846e..1542420 (175커밋, 강제 push 아님).
- Railway 가 4분 30초 뒤 새 번들(index-Chee_vtk.js, 로컬 빌드와 같은 이름)로 바뀜.
- 라이브 확인(쓰기 전부 막은 스크립트, v2): 예시 동아리 o_band “SAMPLE · Sample club”, 진짜 Tri Delta “Officially verified”(SAMPLE 아님), 채팅 “Bringing a friend”(예전 Hannah), 예시 제안 “Fri, Oct 30 · Algorithms study session that evening?”(예전 9/25), /ask → Discover, Teams “See all hackathons & competitions”. 오늘 밤 즉석 모임에 식당 마감 뒤 “Crossroads 9:05 PM” 없음.
- 아직 데이터 쪽은 다음 가져오기 때 바뀜: 그리스 단체 “Fraternity/&#8212;”(주 1회), 인턴 중복·주택 co-op(12시간), 고등학생 해커톤(Devpost 다음 회차).

## 2026-10-28 03:17 UTC (버클리 화 20:17) · 초점: 새로 들어온 공고·행사 훑기 (매일)
- 사장님 답: 아직 없음. 배포 브랜치 6fb846e 그대로. 라이브에 쓴 것 없음.
- 셈: 버클리 학생이 보는 공고 725개(인턴 317·행사 217·해커톤 110·장학 41·연구 38). 10/26 이후 새로 55개(행사 42·해커톤 6·인턴 6·연구 1). 새 것 중 다른 학교 전용·고등학생 대상·빈 제목 없음. 새 해커톤 6개 모두 온라인.
- 고침: 인턴 목록에 Samsara “Account Development Representative Intern - Phoenix” 4개, “- Atlanta” 3개 — 같은 회사·같은 제목·같은 도시인데 자리 번호만 달라 여러 줄로 보였다(인턴 315개 중 5줄이 중복). 가져올 때 회사·제목·근무지가 같으면 하나만 (external.ts `dedupeJobs`, 테스트 추가). 배포 뒤 다음 가져오기(12시간마다)에서 중복이 빠진다. 반복 행사(“Board Games Weekly Game Nights” 등)는 날짜가 달라 그대로.
- 확인: 서버 타입, 테스트 232 통과.

## 2026-10-28 00:17 UTC (버클리 화 17:17) · 초점: 배포 대기분이 실제로 배포될 수 있는지
- 사장님 답: 아직 없음. 배포 브랜치 6fb846e 그대로. 라이브에 쓴 것 없음.
- 확인: 배포 브랜치 대비 claude/lumi-pm 은 파일 80개(+3,687 / −321). 합친 상태에서 앱 타입(tsc)·서버 타입·테스트 231·프로덕션 빌드(vite build, remote 모드) 모두 통과. 메인 번들 1,229.9 kB(배포 브랜치 1,233.3 kB — 오히려 3 kB 작음, Ask Lumi 화면을 뺀 영향). 충돌·빌드 실패 없음 — 사장님이 합치면 그대로 배포 가능한 상태.
- 고친 것 없음.

## 2026-10-27 21:17 UTC (버클리 화 14:17) · 초점: 다시 로그인하는 화면
- 사장님 답: 아직 없음. 배포 브랜치 6fb846e 그대로. 라이브에 쓴 것 없음(코드 보내기 안 누름, send-code·login 은 막혀 있음).
- 찍어 봄(로그인 안 한 방문자, v2·classic): /welcome 아래 “Have an account? Sign in” → 아래에서 올라오는 창 “Sign in with email · School email (you@school.edu) · Send code · We'll send a code to the school email you signed up with · Sign in”. 정상. 첫 화면 카드도 지금 날짜에 맞음(무료 음식 수 4PM 1건 + 이번 주 6, 마감 2일 남은 장학금).
- 고친 것 없음.

## 2026-10-27 18:17 UTC (버클리 화 11:17) · 초점: 계정 삭제 창
- 사장님 답: 아직 없음. 배포 브랜치 6fb846e 그대로. 라이브에 쓴 것 없음(삭제 안 누름, DELETE 입력 안 함).
- 찍어 봄(v2·classic): Settings › Delete account → “Delete your account?” + 지워지는 것 목록(프로필·사진·시간표, 친구·팔로우, 글·댓글·메시지(1:1 은 양쪽), 내가 연 모임·약속·카풀은 취소되고 참가자에게 알림, 좌석·식당·체육관 알림, 로그인 이메일·세션·Ask Lumi 기록) + “Reports you filed stay… with your name removed” + “Type DELETE to confirm”. 개인정보처리방침과 같은 내용.
- 확인(코드): 공용 데모 계정·예시 프로필은 서버가 403 으로 막고(account.ts `PROTECTED_IDS`), 창 안에 “This is a shared demo account — it can’t be deleted…” 를 보여 준다.
- 고친 것 없음.

## 2026-10-27 15:22 UTC (버클리 화 08:22) · 초점: 신고가 들어간 뒤 — 관리자 쪽 (코드)
- 사장님 답: 아직 없음. 배포 브랜치 6fb846e 그대로. 라이브에 쓴 것 없음.
- 코드로 확인(server/moderation.ts): 신고 저장(내용 사본 포함) → FEEDBACK_EMAIL 로 알림 메일(Resend) → 실제 계정 3명이 같은 글·댓글을 신고하면 작성자 빼고 숨김 → /admin/reports 에서 ADMIN_KEY 로 무시·삭제·정지. 정지는 지우지 않고 숨김, 해제하면 돌아온다. App Store 1.2(24시간 안 처리)를 염두에 둔 구조라 출시용으로 충분.
- 막힘: 라이브 /admin/reports 페이지가 열리는지(GET) 확인하려 했으나 실행 권한 판정이 “운영 서버 읽기”로 거부했다. 우회하지 않음. 사장님 확인 필요한 것 — Railway 에 ADMIN_KEY·FEEDBACK_EMAIL 이 설정돼 있는지(10/13 테스트 신고 때 알림 메일이 왔다면 FEEDBACK_EMAIL 은 됨).
- 고친 것 없음.

## 2026-10-27 12:30 UTC (버클리 화 05:30) · 초점: 신고가 어디서 어떻게 들어가는지
- 사장님 답: 아직 없음. 배포 브랜치 6fb846e 그대로. 라이브에 쓴 것 없음.
- 코드로 훑음: 신고 창은 글·댓글·활동·공고·카풀·프로필·1:1·단톡에 있다. 공고(Campus 공고 상세)는 ‘activity’ 종류로 신고되지만 서버(moderation.ts `locate`)가 공고에서도 찾아 처리한다 — 의도된 것(주석 있음). 프로필·공고 상세의 신고는 ‘More(⋯)’ 메뉴 안.
- 고친 것 없음.

## 2026-10-27 09:17 UTC (버클리 화 02:17) · 초점: 신고 창
- 사장님 답: 아직 없음. 배포 브랜치 6fb846e 그대로. 라이브에 쓴 것 없음(Submit report 안 누름).
- 찍어 봄(v2·classic): 1:1 신고 — 사칭/괴롭힘·혐오/성적 행동/스팸/기타 + 자세히(선택) + Submit report. 단톡 신고 — 괴롭힘·위협/성적 메시지/스팸·사기/기타. 이유를 고르기 전엔 보내기가 꺼져 있음. 정상.
- 고침: 단톡방 신고 창 안내가 1:1 과 같은 “The person you report won’t see this.” — 단톡방엔 ‘그 사람’ 이 없다. 단톡방은 “No one in this chat will see that you reported it. / 채팅방 사람들은 신고한 걸 알 수 없어요.” (ReportSheet.tsx, en.ts).
- 확인: tsc, 테스트 231 통과.

## 2026-10-27 06:18 UTC (버클리 월 23:18) · 초점: 여러 명 채팅방 (동아리·활동)
- 사장님 답: 아직 없음. 배포 브랜치 6fb846e 그대로. 라이브에 쓴 것 없음(보내기·신고·나가기 안 누름).
- 찍어 봄(v2·classic): 동아리 단톡(cr_band) 메뉴 “Members Jordan, Sofia, Alex · Report chat”. 내가 연 활동 단톡(cr_mine) 메뉴는 멤버 목록뿐, 남이 연 활동 단톡(UGBA 105)은 멤버 + “Leave activity”.
- 고침(안전): 활동 단톡방에는 ‘채팅방 신고’가 없었다 — 모임 채팅에서 괴롭힘이 있어도 메뉴엔 나가기뿐. 1:1 이 아닌 모든 단톡방에 ‘Report chat’ (ChatRoomPage.tsx). 동아리 단톡과 같은 신고 창(message 신고)을 쓴다.
- 메모: 동아리 단톡 공지 “Thursday 7pm” 은 배포 대기 수정(b08716d)으로 바뀔 것.
- 확인: tsc, 테스트 231 통과.

## 2026-10-27 03:17 UTC (버클리 월 20:17) · 초점: 1:1 채팅방 — 입력칸·신고·차단 메뉴
- 사장님 답: 아직 없음. 배포 브랜치 6fb846e 그대로. 라이브에 쓴 것 없음(보내기·신고·차단 안 누름).
- 찍어 봄(v2·classic): /chats/cr_junho — SAMPLE Jordan, 메시지 2개, “Type a message…” + 보내기. 오른쪽 위 ⋮ 메뉴 → “Report user · Block user” 정상. 비교용 Design 알약이 시각 줄(“Sun, Oct 25 5:57 PM”)을 가린다 — 10/17 질문과 같은 문제. “Bringing Hannah” 는 배포 대기 수정으로 바뀔 것.
- 고친 것 없음.

## 2026-10-27 00:17 UTC (버클리 월 17:17) · 초점: 의견 보내기(Feedback) 창
- 사장님 답: 아직 없음. 배포 브랜치 6fb846e 그대로. 라이브에 쓴 것 없음(보내기 안 누름, /api/feedback 은 막혀 있음).
- 찍어 봄(v2·classic): Feedback 알약 → “Tell us what you think · What did you look for and not find? What would make you open this again next week? Anything confusing?” + 입력칸 + Send. 질문이 30명 출시 반응 모으기에 맞다. Discover 맨 위 “Free 5:20 PM–9 PM”(수업 끝난 뒤 긴 공강), 시간표 칸 안에는 시각이 없어 :59 문제 없음.
- 고친 것 없음.

## 2026-10-26 21:18 UTC (버클리 월 14:18) · 초점: 수업 중일 때
- 사장님 답: 아직 없음. 배포 브랜치 6fb846e 그대로. 라이브에 쓴 것 없음.
- 찍어 봄(v2·classic·한국어): Discover “Next free 3 PM–9 PM”(회색 점, 수업 중이라 맞음), 식당 점심, 체육관 68% Busy. 시간표 칸 창(CS 186) 정상.
- 고침: 같은 순간 시간표는 “In class until 2:59 PM” — 버클리 수업 끝 시각(:59)을 그대로 써서 Discover 의 “3 PM” 과 어긋났다. 수업 중 표시만 :59 를 정시로 → “In class until 3 PM / 수업 중 · 15:00까지” (timetable.ts `statusLabel`).
- 확인: tsc, 테스트 231 통과.

## 2026-10-26 18:17 UTC (버클리 월 11:17) · 초점: 수업 사이 공강의 맨 위 줄
- 사장님 답: 아직 없음. 배포 브랜치 6fb846e 그대로. 라이브에 쓴 것 없음.
- 찍어 봄(v2·classic·한국어): 시간표 “Mon · Free until 12 PM · Next: 12 PM CS 61A”, 식당 점심, 체육관 62%.
- 고침: 같은 순간 Discover 맨 위는 “Free 11:20 AM–12 PM” — 시간표와 말이 달랐다. 다음 수업이 있는 공강이면 시간표와 같은 “Free until 12 PM / 공강 · 12:00까지” (DiscoverPage.tsx). 오늘 수업이 끝난 뒤의 긴 공강은 지금처럼 “Free 3 PM–9 PM”.
- 확인: tsc, 테스트 231 통과.

## 2026-10-26 15:19 UTC (버클리 월 08:19) · 초점: 월요일 아침 Discover
- 사장님 답: 아직 없음. 배포 브랜치 6fb846e 그대로(내 작업 161개 대기). 라이브에 쓴 것 없음.
- 찍어 봄(v2·classic): 맨 위 “Free until 10 AM”(어제 수정 확인), 식당 “Café 3, Clark Kerr +8 open · Scrambled Eggs · breakfast”, 체육관 57% Moderate, “Free Right Now 6 friends”(남은 공강 “3h left”·“40m left”), 즉석 모임 10:35 AM 부터. 모두 정상.
- 고친 것 없음.

## 2026-10-26 12:23 UTC (버클리 월 05:23) · 초점: 수강신청 첫날 아침
- 사장님 답: 아직 없음. 배포 브랜치가 6fb846e 로 바뀜 — 다른 세션의 “Agent mail: 같은 실패는 하루 한 번” 커밋 1개뿐, 내 작업(claude/lumi-pm)은 여전히 배포 대기(160개). 그 커밋을 합침, 테스트 231 통과. 라이브에 쓴 것 없음.
- 찍어 봄(v2·classic): Me ‘Key dates’ 와 학사력 — “Phase 1 enrollment begins · Mon, Oct 26 · Today” 정상(D-Day 표시는 ‘Today’). 시간표 “Mon · Free until 10 AM · Next: 10 AM CS 186”.
- 고침: 같은 시각 Discover 맨 위는 “Next free 9 AM–10 AM”(회색 점) — 첫 수업 전 새벽인데 수업 중인 것처럼(9시는 시간표 칸 시작일 뿐). 지금 수업 중일 때만 ‘Next free’, 첫 수업 전이면 시간표와 같은 “Free until 10 AM” (DiscoverPage.tsx).
- 확인: tsc, 테스트 231 통과, v2·classic.

## 2026-10-26 09:17 UTC (버클리 월 02:17) · 초점: 최근 수정들을 진짜 데이터로 다시 확인
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 확인(v2·classic, 화면 요소를 셈): 검색 › Orgs — 금색 인증 배지 63개(라이브 인증 66곳 − 예시 3곳과 일치), SAMPLE 4개(라이브 예시 동아리 4곳). Discover Teams·Activities 의 SAMPLE 은 예시 모임에만. 지난밤 고친 예시 동아리 판정이 진짜 동아리를 건드리지 않음을 숫자로 확인.
- 다시 본 다른 최근 수정: 인턴 제목 거르기(10/22, 라이브 302개로 확인했던 것), 추천 ‘improv’(라이브 1,558개로 확인), 수업 시각 표기(실제 수업 목록으로 확인), 날짜 비교(실제 해커톤으로 확인) — 모두 진짜 데이터로 검증했던 것. 예시만 보고 넘어간 건 10/22 동아리 건 하나였다.
- 고친 것 없음.

## 2026-10-26 06:21 UTC (버클리 일 23:21) · 초점: 그리스 단체 상세 → ⚠️ 내 10/22 수정의 잘못 발견·수정
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로(그래서 라이브에는 영향 없었음). 라이브에 쓴 것 없음.
- 발견: 진짜 단체 Tri Delta(og_berkeley_delta_delta_delta) 상세가 “SAMPLE · Sample club — made up…” 이고 인증 배지가 빠져 있었다. 원인은 10/22 내가 만든 sampleorgs.ts — 시드의 organizations 목록에 학교 동아리 목록(catalog, 1,500여 개 oc_·og_)도 섞여 있는데 그걸 다 ‘예시’로 잡았다. 그때 o_band 만 확인하고 진짜 동아리를 확인하지 않았다. 배포 전이라 학생에게 보인 적은 없다.
- 고침: 서버(server/samples.ts)와 같은 규칙 — catalog 에 있는 id 는 뺀다. 이제 예시는 시드 7개(o_band·o_stat·o_ailab·o_startup·o_run·o_sorority·o_frat)뿐. 앱 목록이 서버 목록과 같고 oc_/og_ 가 없다는 테스트 추가. Tri Delta 는 다시 “Officially verified”, o_band 는 SAMPLE (v2·classic).
- 확인: tsc, 서버 타입, 테스트 227 통과.

## 2026-10-26 03:18 UTC (실행 05:57, 버클리 일 22:57) · 초점: Campus › Clubs › Greek
- 작업 프로세스가 재시작돼 이번 실행이 2시간 39분 늦게 시작됐다(그 사이 알림이 쌓였다가 한 건으로 옴). 저장소·스크립트는 그대로였다.
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: Greek 칩(84개, v2). 
- 고침(라이브 그리스 단체 86개 중): ① 25개 소개에 “Chapter house: &#8212;.” — 학교 표의 ‘주소 없음(—)’이 문자 참조 그대로 들어왔다. ② Panhellenic 챕터 12개 중 4개(Tri Delta 등)가 “Fraternity” — 표에는 women's fraternity 로 적혀 있지만 학생들에겐 소로리티. 가져오기 스크립트에서 숫자 문자 참조를 풀고 ‘—’ 주소는 비우며, Panhellenic 은 Sorority 로 (server/scripts/fetch-greeks.ts). 저장 없는 시험 모드(FETCH_DRY, 로컬 파일 저장소 — DATABASE_URL 없음)로 실제 학교 페이지를 다시 읽어 확인: 62개, 문자 참조 0, Panhellenic 12개 모두 Sorority. 라이브 데이터는 배포 뒤 매주 자동 가져오기(agent greeks:s_berkeley) 때 바뀐다.
- 확인: 서버 타입, 테스트 226 통과.

## 2026-10-26 00:18 UTC (버클리 일 17:18) · 초점: 앱 밖 사람이 받는 공유 링크 (/r/카풀, /p/약속)
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄(로그인 안 한 새 방문자, v2·classic): /r/rd_sample_sfo_lily — “UC BERKELEY · RIDE SHARE · SAMPLE Ride to SFO · Wed Nov 25 · 9:30am–10am · 3 seats left · Lily · Splitting an Uber/Lyft · Students only… Sign in to join”. 픽업 장소·비용은 로그인 뒤에만 — 안전 안내 정상. /p/(없는 약속) — “This plan isn’t here · Open Lumi” 정상.
- 메모: 카풀 시각만 “9:30am–10am” 소문자 표기(카풀 화면 전체가 같은 짧은 표기라 그대로).
- 고친 것 없음.

## 2026-10-25 21:17 UTC (버클리 일 14:17) · 초점: 좌석 알림 화면 (/seats)
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음(알림 안 걸음).
- 찍어 봄: /seats (v2·classic) — “No classes watched yet · Watch a Spring 2027 class from Timetable › Add class · Find a class”. Find a class 를 누르면 시간표 수업 추가가 열리고 Spring 2027 이 이미 골라져 있다. 목록 시각도 어제 수정대로 “Tue 2 PM–3:29 PM”. 수업마다 Watch seats 버튼. 흐름 정상.
- 고친 것 없음.

## 2026-10-25 18:17 UTC (버클리 일 11:17) · 초점: 수강신청 전날 — 수업 찾기·좌석 알림 직전까지
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음(Watch seats 안 누름).
- 찍어 봄: 시간표 › + Class › Spring 2027 › “CS 61B” 검색 (v2·classic). 결과 “CS 61B Data Structures · Dwinelle 155 · Manuel A Sabin · Course info · Watch seats” 정상.
- 고침: 수업 목록 줄의 시각이 영어 화면에서도 “Mon 15:00–15:59” (24시간) — 앱 다른 곳은 “3 PM”. 영어는 “Mon 3 PM–3:59 PM”, 한국어는 그대로 24시간 (timetable.ts `meetingsLabel` 새로, 시간표 수업 추가·Campus › Classes·섹션 고르기 세 곳이 같이 씀).
- 확인: tsc, 테스트 226 통과, v2·classic, 한국어 시간표 오류 없음.

## 2026-10-25 15:18 UTC (버클리 일 08:18) · 초점: 일요일 아침 식당 + 내일 수강신청
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /discover, /dining, /academic-calendar (v2·classic). 식당 “Bear Market, The Den open”, Café 3 “Opens 11 AM · Brunch”, 체육관 14% Quiet, 학사력 “Phase 1 enrollment begins · Mon, Oct 26 · D-1” 정상.
- 물어봄: 내일 수강신청 시작(D-1)이 Discover 에 안 보임 — 2일 안 학사 일정 띠를 넣을지 (QUESTIONS.md).
- 고친 것 없음.

## 2026-10-25 12:18 UTC (버클리 일 05:18) · 초점: 예시 없는 실제 학생 — 시간표·Me·채팅
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄(예시 뺀 응답, v2·classic): 시간표 “Sun · No classes today · The rest of today is yours”, 친구 공강 칸은 친구가 없으면 안 나옴. Me 는 학사 일정(D-1 수강신청 시작 등)·내 시간표로 채워져 비어 보이지 않음.
- 채팅 목록에 이름 없는 “🏛️ · Thank you!! Bringing Hannah” 줄 — 내 스크립트가 예시 사람만 빼고 그 사람과의 방은 남겨서 생긴 것(실제 서버는 실제 계정에게 예시 방 자체를 안 보냄, samples.test 로 확인돼 있음). 앱 문제 아님.
- 고친 것 없음.

## 2026-10-25 09:17 UTC (버클리 일 02:17) · 초점: 예시가 안 보이는 실제 학생의 주말 화면
- ⚠️ 지난 실행(06:17 UTC)은 시작 직후 명령 실행 권한 확인이 응답하지 않아(자동 판정 오류) 화면 찍기·테스트·커밋·push 를 못 했다. 그때 LOG 도 못 남겨 여기 적는다. 고친 것·라이브 쓰기 없음.
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 방법: 화면 찍기 스크립트가 /api/bootstrap 응답에서 예시 사람·예시 모임·예시 글·예시 카풀을 빼고 보여 준다(실제 학생 계정과 같은 모양, 작업 폴더 empty.mjs NO_SAMPLES).
- 찍어 봄(v2·classic): Discover Now — 식당·체육관 카드 + “Spontaneous Hangouts” 빈 칸. Activities — 오늘 1(해커톤)·내일 24(학교 행사). People — “Students from your campus show up here · Bring your floor or your class along · Invite friends”. 빈 화면들이 다 다음 행동(모임 열기·친구 초대)으로 이어져 괜찮다.
- 고침: 즉석 모임 빈 칸 문구 “Nothing open in this window” — ‘window’ 가 무슨 뜻인지 모호 → “No hangouts open right now — start one?” + Instant meetup (en.ts).
- 확인: tsc, 테스트 226 통과, v2·classic.

## 2026-10-25 03:17 UTC (버클리 토 20:17) · 초점: 토요일 저녁 Discover
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음. 테스트 226 통과(이 시각에도).
- 찍어 봄: /discover, Activities 탭 (v2·classic). 식당 “Café 3, Clark Kerr +4 open · Halal Beef Fajitas”, 체육관 “Closed · Today 8 AM–6 PM”(토 8–6 맞음), “No classes today”.
- 관찰(제품): 토요일 저녁 ‘Today’ 6개·‘Tomorrow’ 6개가 **전부 예시 모임**이다. 학교 행사 목록(LiveWhale·CalLink)에 주말 저녁 행사가 거의 없다 — 진짜 행사는 월요일부터(This week 119). 출시 뒤 예시를 숨긴 실제 학생에게는 주말 Discover 가 거의 빈다. 주말에는 사람(30명)이 여는 모임이 유일한 내용이라는 뜻 — 출시 첫 주말에 사장님·초기 멤버가 모임 2~3개를 미리 열어 두면 좋다(메모, 결정 필요 없음).
- 라이브: 예시 “Crossroads 9:05 PM”(식당 21시 마감 뒤) — 고친 서버 코드(d702fef·8f214a8) 배포 대기.
- 고친 것 없음.

## 2026-10-25 00:18 UTC (버클리 토 17:18) · 초점: “몇 시간 전”·오늘 날짜가 어느 시계 기준인지
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 확인: 테스트 226 통과(어제 고친 시각 테스트가 UTC 0시에도 통과). `relativeTime`(n시간 전)은 시각 차이라 시계와 무관. `todayISO` 는 기기 달력 — 앱(버클리 학생 폰)에서는 맞고, 서버에서 오늘을 쓰는 곳은 demo.ts 의 시드 차이 계산 하나뿐(양쪽 다 UTC 라 서로 맞음). 서버에서도 도는 공용 코드(api/*)는 rides 가 이미 캠퍼스 날짜(`campusToday`)를 쓴다.
- 고친 것 없음.

## 2026-10-24 21:17 UTC (버클리 토 14:17) · 초점: 날짜를 UTC 문자열로 비교하는 곳 훑기
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 훑음: `.date/.deadline >= today` 류 비교 전체. 카풀(날짜만 저장)·시험(날짜만)은 문제 없음. Teams 탭 공고의 “마감 전” 판정(discover.ts `teamItems`)이 같은 UTC 문자열 비교 → 캠퍼스 날짜로 고침.
- ⚠️ 내 어제 수정의 빈틈: 어제 넣은 예시 모임 테스트 2개가 지금 시각(UTC 21시)에 실패했다. 하나는 테스트 코드 실수(패치에 없는 모임을 찾음), 하나는 실제 버그 — 서버가 저녁(UTC)에 켜지면 “지금 바로” 예시의 시드 시각 자체가 밤(21:43)이라 끝나지 않은 채로 식당 마감(21시) 뒤에 남았다. 마감을 넘기면 아침 시각으로(오늘 그 시각이 지났으면 내일) 옮기게 함 (server/demo.ts). 이제 테스트 226 통과.
- 메모: 이 예시 시각 테스트들은 테스트를 돌리는 시각에 따라 시드 시각이 달라진다(시드가 ‘지금+25분’). 다른 시각에도 돌려 볼 방법이 없어 실행마다 다시 돌려 본다.
- 확인: tsc, 서버 타입, 테스트 226 통과, Teams 탭 v2·classic.

## 2026-10-24 18:18 UTC (버클리 토 11:18) · 초점: 주말 Discover › Activities
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /discover?tab=activities (v2·classic). 오늘 11·내일 4·이번 주 119·그 뒤 151, 학교 행사·게임 나이트·해커톤 섞여 정상.
- 고침: ‘Today’ 칸 맨 위에 “Cleantech Hackathon at Stanford · Fri, Oct 23” — 어제 오후 시작한 이틀짜리 행사가 오늘 칸에 어제 날짜로. 날짜가 “2026-10-24T06:59Z”(= 10/23 밤 PT)로 저장돼 있는데, 거르는 곳은 문자열(UTC 날짜)로, 보여 주는 곳은 캠퍼스 날짜로 읽어 서로 달랐다. 거르는 곳도 캠퍼스 날짜로 (DiscoverPage, 같은 패턴인 PlansPage·PersonPage 도).
- 확인: tsc, 테스트 226 통과, v2·classic.

## 2026-10-24 15:17 UTC (버클리 토 08:17) · 초점: 주말 아침 식당 — Discover 식당 카드
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /discover, /dining (v2·classic). “No classes today”(어제 수정), 식당 Café 3 “Opens 11 AM · Brunch”, 체육관 23% 정상. 즉석 모임이 이제 8:45 AM 부터 — 아침이라 자연스러움(새벽 문제는 배포 대기 수정으로 해결).
- 고침: Discover 식당 카드 “Bear Market, The Den open” 바로 아래 “Halal Chimichuri Grilled Tri Tip · Café 3, brunch” — Café 3 은 11시에 연다. 지금 먹을 수 있는 메뉴처럼 읽힌다. 대표 메뉴의 식당이 아직 안 열었으면 여는 시각을 붙인다 → “… · Café 3, brunch from 11 AM” (dining.ts `diningNow` 가 opensAt 를 넘기고 LiveCards 가 표시, 테스트 추가). 계산이 서버에서 되므로 라이브는 배포 후 반영.
- 확인: tsc, 서버 타입, 테스트 226 통과.

## 2026-10-24 12:17 UTC (버클리 토 05:17) · 초점: 주말 아침 Discover·시간표
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /discover, /timetable (v2·classic). 시간표 “Sat · No classes today · The rest of today is yours” 정상.
- 고침: 같은 토요일 Discover 맨 위는 “Next free 9 AM–9 PM” — 수업 없는 날에 ‘다음 공강’ 은 어색하고 9–9 는 시간표 칸의 범위일 뿐. 오늘 수업이 하나도 없으면 “No classes today / 오늘 수업 없음” + Open (DiscoverPage.tsx).
- 라이브: 즉석 모임 예시가 아직 “Crossroads 5:45 AM”, “Strada 6:05 AM” — 어제 고친 서버 코드(d702fef)가 배포 대기라서.
- 확인: tsc, 테스트 226 통과, v2·classic.

## 2026-10-24 09:17 UTC (버클리 토 02:17) · 초점: 새벽 — 문 여는 시각 표시
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /discover, /dining, /gym (v2·classic). 체육관 카드 “Closed · Opens 8 AM”(토요일 8–6 맞음), 식당 “The Den opens 7 AM”, Café 3 “Opens 11 AM · Brunch” 정상.
- 고침: Discover 즉석 모임에 예시 “Hate eating alone — grab a bite at Crossroads? · 2:55 AM”, “Coffee at Strada · 3:20 AM”. 예시 시각을 옮기는 코드가 ①끝난 모임을 ‘지금+15분’으로 밀고 ②“지금 바로” 예시는 서버가 켜진 시각(UTC)+몇 분을 그대로 써서 새벽 시각이 된다. 이제 예시 모임은 아침 8시 전에 두지 않고(학생식당 식사는 11:30 이후·21시 전), 늦으면 다음 날로 (server/demo.ts). 테스트: 하루 24시간 매 시각 굴려 봐도 새벽 시각·식당 마감 뒤가 없음 — 고친 코드를 빼면 실패하는 것 확인.
- 확인: 서버 타입, 테스트 226 통과.

## 2026-10-24 06:17 UTC (버클리 금 23:17) · 초점: 늦은 밤 — Discover·식당·체육관
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /discover, /dining, /gym (v2·classic). “Done with classes”, 식당 “Closed for today”(지난 저녁 메뉴 안 보임), 즉석 모임 “Nothing open in this window”, RSF “Closed · 0/150 · Today 7 AM–11 PM”, CMS 13/55 정상.
- 고침: Discover 체육관 카드가 큰 글씨 “Closed” 아래 작은 글씨로 “Closed for today” 를 또 썼다 → 오늘 운영 시간 “Today 7 AM–11 PM” (LiveCards.tsx). 열기 전(새벽)은 원래대로 “Opens 7 AM”.
- 확인: tsc, 테스트 225 통과, v2·classic.

## 2026-10-24 03:17 UTC (버클리 금 20:17) · 초점: 금요일 밤 — Discover·식당
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /discover, /dining (v2·classic). 식당 “Café 3 · Open until 9 PM”·저녁 메뉴, 체육관 43%, 지금 공강인 친구 6명 정상.
- 고침: Discover “Spontaneous Hangouts” 에 예시 “Hate eating alone — grab a bite at Crossroads? · 9:05 PM” — 학생식당이 9시에 닫은 뒤다. 예시 시각을 옮기는 서버 코드가 오늘 끝난 모임을 “지금부터 15분 뒤”로 밀면서 장소 영업시간을 안 봤다. 학생식당 식사 모임은 21시 전에 끝나야 하고, 늦으면 내일로 (server/demo.ts `rollSampleActivities`, 테스트 추가 — 고치기 전엔 실패, 후엔 통과 확인).
- 확인: 서버 타입, 테스트 225 통과.

## 2026-10-24 00:17 UTC (버클리 금 17:17) · 초점: 시간표 수업 칸을 눌렀을 때 뜨는 창
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /timetable → CS 61A, CS 186 칸 (v2·classic). 창 제목 아래 시간 “Mon/Wed/Fri 12 PM · DIS 118 Thu 12:30 PM”(10/20 수정 반영), 링크·QR 위 한 줄(10/21 수정 반영), 수업 끝나고 비는 친구(“1 free right after it, Mon/Wed 11 AM”)·스터디 그룹·파트너 정상. 친구 공강 길이 “(3.5h)”.
- 고친 것 없음.

## 2026-10-23 21:18 UTC (버클리 금 14:18) · 초점: 가입 흐름 — Classic·한국어
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음(가입 안 함, 쓰기 주소 모두 막힘).
- 찍어 봄: /start 1~8단계 Classic(영어), v2(한국어). 두 경우 모두 학교→목표→오후→금요일 밤→만날 사람→전공·학년→미리보기→이름까지 정상, 한국어 번역 빠진 곳 없음(비교용 Design 알약만 영어).
- 고친 것 없음.

## 2026-10-23 18:17 UTC (버클리 금 11:17) · 초점: 가입 2~8단계 (가입은 안 함)
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 막기 넓힘: /api/rpc/ 밖에도 쓰기·메일·비용이 드는 주소가 있다 — /api/auth/(register·login·logout·attach-email), /api/schools/(send-code·verify-code), /api/feedback, /api/ai/*, /api/system/*(초기화!). 작업 폴더 스크립트 35개와 docs/pm-agent/shoot.mjs 모두 이것도 막게 함. 읽기용 POST(/api/bootstrap, /api/schools/search·highlights, /api/catalog/*)는 그대로 통과.
- 찍어 봄(v2, 새 방문자): 1 학교 → 2 목표(3개까지) → 3 쉬는 오후 → 4 금요일 밤(고르면 바로 넘어감) → 5 만나고 싶은 사람 → 6 전공·학년(전공 비워도 진행) → 7 프로필 미리보기(“Freshman. Here to make new friends. Free time: café hopping.”) → 8 이름·출생 연도. 8단계에서 멈춤(이름을 넣지 않음). 다 정상 동작.
- 메모: 7단계 미리보기 카드에서 목표 칩은 연한색, 관심 칩은 진한색이라 하나만 골라진 것처럼 보인다(v2). 작음 — 디자인 질문(10/17)과 같이.
- 고친 것 없음(스크립트 안전장치만).

## 2026-10-23 15:18 UTC (버클리 금 08:18) · 초점: 처음 온 사람 — /welcome → /start
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- ⚠️ 발견·고침: 내 화면 찍기 스크립트 중 18개(fresh.mjs·st.mjs 등, 작업 폴더)와 저장소의 docs/pm-agent/shoot.mjs 에 /api/rpc/ 막기가 빠져 있었다 — 10/20 사고 뒤 “전부 막음” 이라고 적었지만 일부만 막았던 것. 이번 실행에서 막기 없는 스크립트로 쓰기 화면을 누른 적은 없다(오늘은 /welcome·/start 만, 누르기 없음). 전부 막기를 넣고 shoot.mjs 로 채팅방을 열어 읽음 표시 요청 2건이 “BLOCKED WRITE” 로 막히는 것 확인.
- 찍어 봄: /welcome, /start (처음 온 사람, v2·classic). 첫 화면 “Who's free on campus right now?”·점심 카드·무료 음식·마감 순 정상.
- 물어봄: 1단계 학교 고르기에 UC Merced 가 나온다 — 출시 동안 숨길지 (QUESTIONS.md).

## 2026-10-23 12:23 UTC (버클리 금 05:23) · 초점: 식당 — 내일 탭·식단 필터
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /dining (v2·classic). 새벽이라 Café 3 “Opens 7 AM”, 아침 메뉴. Vegan 필터 — 비건 표시 메뉴만 남음. No nuts — 아몬드 등 견과 들어간 메뉴 빠짐. 알레르기 문구 “Diet and allergen tags come from Cal Dining” 정상.
- 확인만: “Tomorrow” 탭은 Cal Dining 이 내일 메뉴를 올렸을 때만 나온다(DiningPage `data.dates`) — 지금은 없어서 안 보임, 의도대로.
- 고친 것 없음.

## 2026-10-23 09:17 UTC (버클리 금 02:17) · 초점: 채팅방 안 (예시 사람·동아리 단톡)
- 사장님 답: 아직 없음. 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음(메시지 안 보냄, 읽음 표시 요청도 막힘).
- 찍어 봄: /chats/cr_junho, /chats/cr_band, /chats/cr_a7txlmqtfn (v2·classic). “Bringing Hannah” 는 배포 대기 수정(245882c)으로 사라질 것. 빈 1:1 방 안내(“Say hello. Block and report…”) 정상.
- 고침: 동아리 단톡 공지 “[Notice] Fall show rehearsal Thursday 7pm” 이 목 21:17 에 와 있다 — 예시 시각은 계속 옮겨지는데 요일이 박혀 있어 이미 지난 리허설을 알리는 꼴. 공연 날짜(토)도 옮겨지므로 “the night before the show, 7pm” 으로, 동아리 공지 본문도 같게 (seed.en.ts, seed.ts — 채팅 문구는 다음 옮길 때 시드 문구로 바뀜). 시드의 다른 요일·tonight 문구도 훑음 — 라이브에 들어간 것은 시각이 함께 움직여 맞다.
- 확인: tsc, 테스트 224 통과.

## 2026-10-23 06:21 UTC (버클리 목 23:21) · 초점: People 카드
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating·예시 할인 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: / (People 덱), /users/u_jimin (v2·classic). 계획 있는 사람(Jordan·Maya)이 먼저, 계획 카드·“In your class” 공통점 한 줄 정상. 나이(“Maya 24”)는 10/13 질문 그대로.
- 고침: 지어낸 예시 프로필(Sample profile)에 학교 인증 배지(카드 오른쪽 위 체크)와 프로필의 “School verified · ID verified” 가 붙어 있었다 — 어제 고친 예시 동아리 ‘Officially verified’ 와 같은 문제. 예시 사람에게는 인증 표시를 안 단다 (PersonCard, HomePage, PersonPage, ProfileListPage). Rides 는 원래 이렇게 하고 있었다(StudentMark).
- 확인: tsc, 테스트 224 통과, v2·classic.

## 2026-10-23 03:17 UTC (버클리 목 20:17) · 초점: 예시 데이터에 남은 실제 기관·‘공식’ 표현
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 셈: 라이브에 들어간 시드 — 공고 2(op_intern “Stripe…”, op_contest “California Civic Data Challenge”, 둘 다 마감 지나 숨겨짐), 동아리 4(모두 이제 SAMPLE, 인증 배지 없음), 활동 17(모두 SAMPLE). 시드의 실제 이름 공고(SkyDeck × Google 해커톤, Cal Alumni 장학금, Kappa Delta Chi·Theta Tau 모집, ASUC 홈커밍)는 라이브엔 없고 오프라인 데모(mock)에만 있다.
- 물어봄: 예시 할인 “BOGO lattes” 가 실제 카페(Café Milano) 이름을 쓴다 — 없앨지 (QUESTIONS.md).
- 고친 것 없음.

## 2026-10-23 00:17 UTC (버클리 목 17:17) · 초점: 동아리 글·검색
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /orgs/o_band?tab=posts, /search, /activities/a_festival (v2·classic). 프로필·동아리 글 카드(PostCard)는 종류를 둘째 줄에 써서 이름 잘림 없음.
- 고침: 예시 활동 “Homecoming kickoff” 가 검색·지도·카드·상세에서 금색 “Official / 학교 공식” 표시를 달고 소개도 “Official campus event…” — 지어낸 행사를 학교 공식처럼 보인다. 예시 활동에는 공식 표시를 안 달고(ActivityCard, ActivityDetailPage, MapPage), 시드 소개에서 “Official/학교 공식” 을 뺌(seed.en.ts, seed.ts — 라이브 문구는 다음 예시 날짜 옮길 때 바뀜).
- 메모: 라이브 DB 에 시드로 만든 공고 2개가 남아 있다 — “Stripe summer internship”(Stripe, example.com), “California Civic Data Challenge”(State of California, example.com). 둘 다 마감이 지나 화면엔 안 나온다. 실제 회사·기관 이름을 단 지어낸 공고라 사장님이 관리 화면에서 지우면 깔끔(PM agent 는 라이브 DB 를 안 건드림).
- 확인: tsc, 테스트 224 통과.

## 2026-10-22 21:17 UTC (버클리 목 14:17) · 초점: Feed 와 글쓰기 화면
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음(글 안 올림).
- 찍어 봄: /community(Feed), /create/post (v2·classic). 예시 글 시각·“Fall show in 2 days” 는 활동 날짜(토 10/24)와 맞음. 글쓰기의 샘플 사진 안내는 10/16 질문 그대로. 글 주제에 #Dating 이 있다 — 10/16 Dating 질문과 같이 정하면 됨.
- 고침: Feed 줄에서 긴 종류 태그 “Looking for people to join” 이 작성자 이름을 “Et…” 로 잘랐다 → 이름이 먼저 자리를 잡고 태그가 줄어든다(“Looking for people to…”) (CommunityPage.tsx).
- 확인: tsc, 테스트 224 통과, v2·classic 스크린샷.

## 2026-10-22 18:17 UTC (버클리 목 11:17) · 초점: 다른 지역 대면 해커톤 세기 + 약속·체육관
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 셈: 팀원 모집 칸이 있는 마감 전 해커톤 75개 — 마감 가까운 15개는 모두 온라인, 온라인도 베이 지역도 아닌 대면은 2개(H.A.R.D. Hack 2027 “University of California - Jacobs Hall” 등). 10/18 질문에 “지금은 급하지 않음” 추가.
- 찍어 봄: /plans, /plans/new, /gym (v2). 약속 화면의 “Fri, Sep 25 · Algorithms session Thursday evening?” 은 배포 대기 중인 수정(245882c·4b3e832)으로 사라질 것. 체육관 CMS Fitness Center 가 이제 41/55 로 실제 숫자를 읽는다 → “CMS 0명” 메모 닫음.
- 고친 것 없음.

## 2026-10-22 15:17 UTC (버클리 목 08:17) · 초점: 해커톤 — Teams 탭과 Campus › 해커톤
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /discover?tab=teams, Campus › Hackathons (v2·classic).
- 고침: Teams 의 “See all 75 hackathons & competitions” 를 누르면 “102 listings” — 숫자가 안 맞는다. Teams 는 팀원 모집 칸이 있는 공고(해커톤·스타트업·연구)만 세고, 가는 곳은 해커톤 전체를 센다. 버튼에서 숫자를 뺌 → “See all hackathons & competitions” (DiscoverPage.tsx).
- 라이브: 고등학생 전용 “Girls Who Code HHS Hackathon 2026” 이 아직 목록에 있다 — 거르는 코드(30ade64)는 배포 대기라서. 배포되면 다음 Devpost 가져오기에서 빠진다.
- 확인: tsc, 테스트 224 통과.

## 2026-10-22 12:19 UTC (버클리 목 05:19) · 초점: 동아리 추천 이유
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 원인 찾음: “Similar to Cal Indie Collective (band club)” 가 경영 컨설팅(Beta Corporate Solutions)·IBD 환자회(UnifIBD)에 붙었다. 주제 사전의 예술 단어 ‘improv’(즉흥연기)가 **improve·improving** 에 걸려 이 동아리들이 ‘예술’로 분류됐다.
- 고침: `\bimprov\b` 로 (foryou.ts), 테스트 추가. 라이브 데이터로 다시 돌리면 밴드 동아리를 이유로 드는 137개가 전부 예술 쪽(댄스·사진·음악·잡지·디자인). 라이브 동아리 42곳의 소개에 improve 류 단어가 있어 모두 ‘예술’ 점수를 잘못 받고 있었다.
- 확인: 테스트 224 통과.

## 2026-10-22 09:17 UTC (버클리 목 02:17) · 초점: 동아리 탭·동아리 상세
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: Campus › Clubs(1562개), /orgs/o_band, /orgs/o_startup (v2·classic).
- 고침: 지어낸 예시 동아리(Cal Indie Collective, Stats Undergrad Association, Vision & Language Lab)가 SAMPLE 표시 없이 금색 체크 + “Officially verified” 를 달고 나왔다 — “데이터를 지어내지 않는다”와 정면 충돌. 이제 예시 동아리(시드 id)는 SAMPLE 표시 + “Sample club — made up to show how Lumi works.” 이고, 상세·동아리 카드·글·활동 카드 어디에도 인증 배지를 안 단다 (sampleorgs.ts 새 파일, OrgPage, OrgCard, PostCard, ActivityCard). 진짜 동아리(학교 목록에서 가져온 oc_·og_ 1558개)는 그대로.
- 메모: 예시 동아리의 Instagram·Website 버튼은 example.com 으로 간다(가짜 주소라 해는 없음). 추천 이유 “Similar to Cal Indie Collective (band club)” 가 Beta Corporate Solutions 같은 무관한 동아리에 붙는다 — 다음에 본다.
- 확인: tsc, 테스트 223 통과.

## 2026-10-22 06:19 UTC (버클리 수 23:19) · 초점: 연구·RA·장학금 목록 — 마감·대상
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 확인: 라이브 연구·장학 92개를 마감·대상으로 훑음. 마감 지난 것은 NSF GRFP(10/20) 1개 — 화면에선 이미 빠짐(BrowseTab 마감 필터). UC Merced 전용 18개·대학원 전용은 버클리 학부생 화면에 안 나옴. 장학금 25·연구 40 모두 마감 전이거나 미정.
- 고침: 마감이 아직 안 나온 공고(URAP Spring 2027, CMU REUSE, USC ICT REU 등)의 영어 배지가 “No deadline” — ‘마감 없음(상시)’으로 읽힌다. 한국어는 원래 “마감 미정” → 영어도 “Deadline TBA” (listings.ts `badgeOf`).
- 확인: tsc, 테스트 223 통과, v2·classic.

## 2026-10-22 03:17 UTC (버클리 수 20:17) · 초점: 인턴 공고 — 다른 학교 전용·학생용이 아닌 것
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 라이브 인턴 304개(자동 가져오기 302) 제목을 셈: 다른 학교·학기 이름은 “(IAP)” 1개뿐(지난번 메모, 그대로 둠). Toronto 2개는 근무지. Winter 2027 co-op 19개는 학기를 쉬고 가는 학생용이라 둠. PhD 68개는 학부생 화면에서 이미 따로 거름.
- 고침: 정규직 “Staff Credit Policy Analyst – Condo, Co-op & Project Review”(주택 ‘co-op’)가 ‘co-op’ 글자 때문에 인턴으로 들어왔다 → 제목에 intern 이 없고 co-op 만 있을 때 condo·housing·staff·senior·manager 등이 있으면 뺀다 (external.ts `isInternTitle`, 테스트 추가). 지금 라이브 302개에 돌려 보면 정확히 이 1개만 빠진다. 다음 가져오기부터 반영(배포 후).
- 확인: 서버 타입, 테스트 223 통과.

## 2026-10-22 00:17 UTC (버클리 수 17:17) · 초점: Campus › Browse (장학금·인턴·무료 음식)
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /opportunities, Scholarships·Internships·Free food 칩 (v2). 장학금 25개 모두 D-9 이상(마감 지난 것 없음), 무료 음식 8개 모두 오늘 이후, 인턴 306개.
- 확인만: 장학금 칩에 연구 펠로십(SURF·REU 등)이 같이 나오는 건 의도(돈 받는 연구 = 펀딩, listings.ts `categoriesOf`).
- 메모: 인턴 “For you” 맨 위 “Micro-Intern: Research Technology Developer (IAP)”(Point72/Cubist, 뉴욕, 1월 근무). 공고 본문을 직접 읽음 — 학교 제한은 적혀 있지 않지만 IAP 는 MIT 1월 학기 이름이고 버클리 봄 학기와 겹친다. 대상이 MIT 학생일 가능성이 크지만 확인할 수 없어 빼지 않음. 같은 회사가 학교별 공고(IIT Hyderabad 등)를 따로 낸다 — 제목에 다른 학교 이름·학기 이름이 있으면 거르는 규칙은 다음에 본다.
- 고친 것 없음.

## 2026-10-21 21:17 UTC (버클리 수 14:17) · 초점: Discover › Activities 와 활동 상세
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음(참여 요청 안 누름).
- 찍어 봄: /discover?tab=activities, /activities/a_band_show, /activities/a_startup_chat (v2·classic). 날짜 묶음·참가 수·주최 표시·댓글 정상.
- 고침: 수업 중(14:17, 다음 공강 15:00)인데 Discover 맨 위 줄이 초록 점 + “Free 3 PM–9 PM” 이라 지금 비어 있는 것처럼 읽혔다 → 지금 수업 중이면 회색 점 + “Next free 3 PM–9 PM” / “다음 공강 15:00–21:00” (DiscoverPage.tsx).
- 확인: tsc, 테스트 222 통과, v2·classic·한국어.

## 2026-10-21 18:17 UTC (버클리 수 11:17) · 초점: 시간표 — 친구와 겹치는 공강
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침·키/Dating 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /timetable 아래 “Friends free when you are today” (v2·classic·한국어).
- 고침: 길이 표기 “(0.5h)”·“(6.0h)” → “(30 min)”·“(6h)” / “(30분)”·“(6시간)” — 수업이 :59 에 끝나 361분이 6.0h 로 보였다, 30분 단위로 (timetable.ts `fmtHours`). 만들기 버튼 “3 PM–4:29 PM Create activity” → “3 PM–4:30 PM” — 화면에 보이는 시작(5분 올림)부터 90분 (TimetablePage.tsx).
- 확인: tsc, 테스트 222 통과.

## 2026-10-21 15:18 UTC (버클리 수 08:18) · 초점: 프로필 편집
- 사장님 답: 아직 없음 (데모 계정 A/B/C·개인정보처리방침 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /profile/edit (v2·classic). 키·Dating 은 10/16 질문 그대로.
- 고침: 사진이 있는 사람(데모 Alex)도 편집 화면 미리보기는 이모지(🧑‍💻)였다 — 다른 화면은 다 사진 → 미리보기를 앱 공통 아바타로(사진, 안 열리면 이모지). 사진이 없는 사람(가입한 학생은 지금 모두 이모지)에게는 ‘Face / Masked / From behind’(사진 위에 붙는 표시라 이모지엔 뜻 없음)를 숨기고 색 막대에 “Background color” 이름을 붙임 (EditProfilePage.tsx).
- 메모: 사진이 있는 사람에게 이모지 고르기·색 막대는 보이는 데가 없다(사진이 안 열릴 때만 쓰임). 진짜 사진 올리기를 정할 때(10/16 질문) 같이.
- 확인: tsc, 테스트 222 통과.

## 2026-10-21 12:21 UTC (버클리 수 05:21) · 초점: 설정·공개 범위·계정 안전, 개인정보처리방침
- 사장님 답: 아직 없음 (데모 계정 A/B/C 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 사장님 질문(채팅) “메인에 다 커밋?” → 아니요, claude/lumi-pm 에만. 배포 대기 커밋 121개. 배포 브랜치 push 는 사장님 허락이 있어야 한다고 답함.
- 찍어 봄: /settings, /settings/privacy, /settings/safety (v2·classic·한국어). 공개 범위·차단·신고 목록 정상(테스트 신고는 10/18 질문 그대로).
- 고침: 설정 › 언어 아래 “Switching language also switches the demo campus and sample data.” 는 예시 데이터(mock)에서만 맞다 — 라이브 서버에선 글자만 바뀌고 학교는 그대로(한국어로 찍어도 버클리 데이터 확인). 이제 mock 일 때만 보임 (SettingsPage.tsx).
- 물어봄: 개인정보처리방침에 Ask Lumi 설명 4곳 + 서버 Ask 주소가 살아 있음 (QUESTIONS.md). 법 문서라 혼자 안 고침.
- 메모: 한국어 설정 화면에 “Privacy Policy · Terms of Use” 가 영어. 출시는 영어라 나중.
- 확인: tsc, 테스트 222 통과.

## 2026-10-21 09:17 UTC (버클리 수 02:17) · 초점: 알림 화면과 알림을 눌렀을 때
- 사장님 답: 아직 없음 (데모 계정 A/B/C 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /notifications (v2·classic·한국어), 알림 4개를 하나씩 눌러 도착 화면 확인 — 제안→요청 탭, 팔로워→프로필, 근처 추천→활동, 동아리 새 행사→활동. 모두 맞는 곳으로 간다.
- 라이브(아직 배포 전 코드): 요청 탭의 예시 제안이 “📖 Study · Fri, Sep 25 · 7pm” (지난 날짜). 245882c(배포 대기)가 이미 고친 것 — 배포되면 사라진다.
- 고침: 그 예시 제안 문구 “Algorithms session Thursday evening?” 은 날짜가 매번 옮겨지는데 요일을 박아 둬서 날짜와 어긋난다 → “Algorithms study session that evening?” / “그날 저녁에 알고리즘 같이 풀어요!”, 그리고 다시 살릴 때 문구도 시드 것으로 바꿈 (seed.en.ts, seed.ts, server/demo.ts, 테스트 추가).
- 메모: 한국어 화면에서도 알림 제목·내용은 영어(라이브 DB 에 영어 시드로 저장됨). 출시는 버클리·영어라 지금은 그대로.
- 확인: tsc, 서버 타입, 테스트 222 통과.

## 2026-10-21 06:18 UTC (버클리 화 23:18) · 초점: Rides
- 사장님 답: 아직 없음 (데모 계정 A/B/C 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /rides, /rides/new, 카풀 상세 3개(운전·태워 줄 사람 찾기·Uber 나누기) (v2·classic). 목록·글쓰기·가격 안내 정상. 상단 알약이 “My rides” 를 가리는 건 기존 질문(10/17).
- 고침: “태워 줄 사람 찾는” 글 상세의 Seats 줄이 “1 person needs a ride · 1 person” 으로 같은 말을 두 번 → “1 person needs a ride”. 빈 자리 칸이 없는 글에 “Riders' names show once you join.” 이 붙던 것도 뺌 (RideDetailPage.tsx).
- 확인: tsc, 테스트 222 통과.

## 2026-10-21 03:18 UTC (버클리 화 20:18) · 초점: 오래 안 본 화면 — 식당·좌석 알림·학사력·지도
- 사장님 답: 아직 없음 (데모 계정 A/B/C 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /dining, /seats, /academic-calendar, /map (v2·classic). 식당 메뉴·학사력 D-day 정상, 좌석 알림 빈 화면 안내 정상.
- 고침: 인원 제한 없는 활동(예: BOGO 라떼)이 지도 목록·작은 활동 카드에 “0/∞” → “0 joined” / “0명 참가” (ActivityCard.tsx, MapPage.tsx, en.ts). 큰 카드·상세는 원래 “joined · no limit”.
- 메모(지난번 것): 수업 방 시간 “9:30am–10:59am” 은 수업 화면 공통 짧은 표기(clockLabel)라 그대로 둠.
- 확인: tsc, 테스트 222 통과.

## 2026-10-21 00:17 UTC · 초점: 수업 공간 — 겹친 버튼
- 사장님 답: 아직 없음 (데모 계정 A/B/C 포함). 배포 브랜치 8bfd353 그대로. 라이브에 쓴 것 없음.
- 찍어 봄: /classes/CS 61A…, /c/berkeley/cs-186 (v2·classic).
- 고침: 수업 공간·수업 방에 “Copy class link”·“QR for slides”가 위 버튼 줄과 아래 카드에 두 번씩 나오던 것 → 위 줄만 남김(ClassRoom.tsx 의 아래쪽 3곳 삭제). 두 화면 모두 위 줄을 이미 갖고 있다. 복사 후 안내(“paste it in your class Discord or GroupMe”)는 토스트에 그대로.
- 메모: 수업 방 머리의 시간이 “Mon/Wed 9:30am–10:59am” — 학교 목록 표기 그대로라 틀린 건 아니지만 다른 화면(“11 AM”)과 모양이 다르다. 다음에 맞출지 본다.
- 확인: tsc, 테스트 통과.

## 2026-10-20 21:17 UTC · 초점: 수업을 넣은 뒤 — 수업 공간(같은 수업 친구)
- 사장님 답: 아직 없음 (데모 계정 실수 기록 A/B/C 포함) → 데모 시간표는 그대로 둠. 라이브에 쓴 것 없음(스크립트가 /api/rpc/ 를 모두 막음).
- 찍어 봄: /classes/CS 61A…, /classes/CS 186… (v2·classic).
- 고침: 수업 공간 제목 아래 시간이 “Mon/Wed/Fri/Thu 12 PM · DIS 118” — 디스커션 요일(목)이 강의 요일에 섞이고 시각은 강의 것만 → “Mon/Wed/Fri 12 PM · DIS 118 Thu 12:30 PM”. 요일도 월→금 순서로 (ClassPage.tsx).
- 메모: 수업 공간에 “Copy class link”·“QR for slides”가 위 버튼 줄과 아래 카드에 두 번씩 나온다. 수업 방(/c/…)과 같은 부품을 써서 생긴 것 — 다음에 위쪽 줄을 줄일지 본다.
- 확인: tsc, 서버 타입, 테스트 222 통과.

## 2026-10-20 18:18 UTC (버클리 화 11:18) · 초점: 첫 수업 넣은 직후 — ⚠️ 라이브 쓰기 사고

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로.
- 고침: 수업 추가 알림이 "4 meeting times added" — 무엇을 넣었는지 안 보임 → "CS 61A added with DIS 118" / "CS 61A · DIS 118 추가했어요"(TimetablePage). 화면에서 확인.
- ⚠️ 사고: 위 확인을 위해 추가 흐름을 끝까지 돌릴 때 저장 요청을 가짜로 받으려던 필터가 틀린 주소(/api/users)를 봐서, 실제 요청(/api/rpc/users/update)이 라이브로 나감 → 공용 데모 계정 u_me 시간표에 CS 61A 3칸 + DIS 118 1칸 추가(11→15, 라이브 bootstrap 으로 확인). 규칙 위반. 되돌리기도 라이브 쓰기라 하지 않고 QUESTIONS 에 올림(추천: 허락받고 원래 11칸으로 한 번 되돌리기).
- 재발 방지: scratchpad 의 모든 화면 스크립트(full·ko·clk·clkl·deck·empty·pick 등 9개)가 /api/rpc/ 요청을 전부 막도록 바꿈. 브라우저 안에서 쓰기 요청을 보내 "BLOCKED WRITE" 로 막히는 것 확인. 앞으로 저장 흐름은 이 가드가 있는 스크립트로만 돌린다.
- 검증: `npx tsc -b`, `npm test` 222/222.
- 다음 초점: 사장님 답 기다림(되돌리기). 그 외 같은 수업 친구 안내 화면.

## 2026-10-20 15:17 UTC (버클리 화 08:17) · 초점: 시간표가 빈 새 사용자

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로.
- 방법: 테스트 브라우저에서만 서버 응답의 내 시간표를 비워(저장 안 함) 처음 가입한 사람이 보는 화면을 봄.
- 본 것: 시간표 빈 화면("Your timetable is empty · Add first class") 좋음. People 카드 위 "free 10 AM–9 PM" 은 상대(Jordan)의 빈 시간이라 맞음.
- 고침 1: Discover 맨 위 줄이 "Add your timetable" 인데 버튼은 "Open"(시간표가 없으면 하루 종일 비었다고 계산돼 즉석 모임 열기로 감) → 시간표가 없으면 "Add" → 시간표 화면(DiscoverPage). 시간표가 있으면 그대로 "Free 9 AM–3 PM · Open".
- 고침 2: 시간표 화면 "Next: 15:00 UGBA 105" → 영어 "Next: 3 PM UGBA 105", 한국어 "다음 수업 15:00" 그대로(TimetablePage). 앞서 맞춘 12시간 표기와 같게.
- 검증: `npx tsc -b`, `npm test` 222/222. v2·classic 빈 시간표/있는 시간표 둘 다, 한국어 확인.
- 다음 초점: 시간표에 첫 수업을 넣은 직후 화면(추가 완료 알림·같은 수업 친구 안내).

## 2026-10-20 12:20 UTC (버클리 화 05:20) · 초점: Me 화면

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로.
- 본 것(v2·classic): 학사 일정(D-6 Phase 1 · D-10 성적 옵션 마감 · D-55 기말), 시간표, 다음 빈 시간, 프로필 100%, 좌석 알림. 문구·배치 이상 없음.
- 고침: 바로 위아래가 "Free until 15:00" / "Next free window 9 AM–3 PM" 으로 시간 표기가 달랐다 — 지금 상태 문구(statusLabel: 공강·수업 중 ~까지)도 영어는 12시간("Free until 3 PM"), 한국어는 그대로("공강 · 15:00까지"). 어제 고친 빈 시간 표기와 같은 규칙(core/lib/timetable).
- 검증: `npx tsc -b`, `npm test` 222/222. v2·classic Me·시간표, 한국어 Me 확인.
- 다음 초점: 시간표 화면 처음 쓰는 사람 흐름(수업 0개일 때 빈 화면·첫 수업 넣기).

## 2026-10-20 09:18 UTC (버클리 화 02:18) · 초점: "Invite friends" 가 보내는 문구

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로.
- 고침: 초대 문구가 사실과 달랐다 — 수업판 "Our CS 186 Databases section is on Lumi"(내가 있다는 것만으로 우리 수업 사람들이 있다고 말함), 기본판 "people on our floor"(기숙사라고 가정). → "I'm on Lumi — it shows who in CS 186 is free between classes. Join so we can find each other: …/welcome" / "I'm on Lumi — see who's free between classes and where the free food is on campus. Join me: …". 한국어도 같은 뜻으로. 과목 코드만 씀(FeedExtras useInvite — People 끝 화면·피드 조용할 때 카드가 같이 씀).
- 검증: `npx tsc -b`, `npm test` 222/222. People 끝 화면에서 Invite friends 를 눌러 복사된 문구 확인(브라우저 클립보드를 가로채서 읽음, 아무것도 안 보냄).
- 다음 초점: Me 화면 첫 채우기(프로필 완성도·시간표 넣기 안내).

## 2026-10-20 06:19 UTC (버클리 월 23:19) · 초점: People 카드 넘기기

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로.
- 본 것(v2·classic): 카드(사진·Sample profile·학과·같이 갈 모임·같은 수업·관심사), ✕ 로 8장 끝까지 넘김(✕ 는 화면에서만 — 오른쪽(연결)은 친구 요청을 보내므로 안 누름).
- 고침: 끝까지 넘기면 "You've seen everyone for now · Start over" 뿐인 막다른 화면. 사람이 적은 첫 주엔 여기가 제일 자주 보이는 화면 → "Lumi gets better with every friend who joins." + "Invite friends"(이미 있는 초대 기능) + "Start over" (HomePage).
- 검증: `npx tsc -b`, `npm test` 222/222. v2·classic 끝 화면 확인.
- 다음 초점: Me 화면(30명이 자기 프로필·시간표를 처음 채우는 곳)과 "Invite friends" 가 보내는 문구.

## 2026-10-20 03:17 UTC (버클리 월 20:17) · 초점: 빈 시간 표기

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로.
- 고침: 빈 시간(공강) 표기가 영어 화면에서도 24시간이고("Free 11:22–13:00", "Free together today 14:59–21:00"), 지금부터 시작하는 블록은 시작 분이 매분 바뀌었다. 공용 fmtBlock 하나를 고쳐 9곳(Discover·시간표·프로필·People·추천 이유) 같이: 영어는 "8:20 PM–9 PM" 처럼 앱의 다른 시각과 같은 12시간, 한국어는 24시간 그대로, 시작은 5분 단위로 올림.
- 검증: `npx tsc -b`·typecheck:server, `npm test` 222/222. v2·classic 영어 "Free 8:20 PM–9 PM", "Free together today 3 PM–9 PM", 한국어 "공강 20:20–21:00" 확인.
- 다음 초점: People 카드 넘기기(30명이 첫 주에 제일 많이 볼 화면).

## 2026-10-20 00:18 UTC (버클리 월 17:18) · 초점: 친구 추가 흐름·프로필 편집

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로.
- 본 것(v2·classic): 친구 아닌 사람(Ethan) "Add friend", 요청 보낸 사람(Daniel) "Cancel request", 친구(Jordan) "Friends" 프로필, 프로필 편집 화면. 버튼은 안 누름(라이브 DB).
- 고침: 프로필 아래 버튼 줄에서 하트·Follow·친구 버튼이 왼쪽에 몰리고 오른쪽이 비었다(메시지 버튼은 아래 줄로 넘어감) → Follow·친구 버튼이 남은 폭을 나눠 채움(PersonPage).
- 검증: `npx tsc -b`, `npm test` 222/222. v2·classic 세 프로필 스크린샷 확인.
- 메모(안 고침): 친구 프로필 "Free together today 14:59–21:00" — 24시간 표기 + 지금 시각부터라 14:59 같은 애매한 분. 다른 곳은 "2:59 PM" 식. 다음에 맞추기. 프로필 편집 화면은 이상 없음.
- 다음 초점: "Free together" 시간 표기, 그리고 30명 첫 주에 많이 볼 People 카드 넘기기.

## 2026-10-19 21:17 UTC (버클리 월 14:17) · 초점: 채팅방 안·요청 탭

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로.
- 본 것(v2·classic): 빈 채팅방(Maya) "Say hello. Block and report are in the top-right menu." + 입력칸 — 문제 없음. 요청 탭: 받은 제안 1·보낸 친구 요청 2.
- 고침 1: 받은 1:1 제안 시각이 "📖 Study · 2026-09-25 19:00" 날것 그대로 → "Fri, Sep 25 · 7pm" / "9월 25일 (금) · 오후 7시" (core/lib/plans proposalWhen, 채팅 요청 탭·Plans 화면). 자유 문구는 그대로.
- 고침 2: 예시 제안이 "19h ago" 인데 제안 날짜는 3주 전(9/25) — 다시 살릴 때 보낸 시각만 옮기고 제안 날짜는 그대로였다. 이제 시드의 "보낸 날 + 며칠"을 지켜 날짜도 옮기고, 기다림인데 날짜가 지난 것도 다시 맞춘다(server/demo.ts). 테스트 추가(고치기 전 실패).
- 고침 3: 예시 채팅 "Thank you!! Bringing Hannah" — 숨긴 예시 사람 이름. 시드 문구를 "Bringing a friend" 로, 그리고 라이브 예시 대화 문구도 시드를 따르게(시간이 이미 맞아도 문구가 다르면 고침, 실제 사람이 끼어든 대화는 그대로). 테스트 추가(고치기 전 실패).
- 검증: tsc·typecheck:server, `npm test` 222/222. 요청 탭 v2·classic·한국어 확인 (날짜 이동은 서버 변경이라 배포 뒤).
- 다음 초점: 친구 추가 흐름(프로필에서 친구 요청 → 요청 탭), 프로필 편집 화면.

## 2026-10-19 18:18 UTC (버클리 월 11:18) · 초점: 채팅 목록·친구

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로.
- 고침: 채팅 목록 위 "지금 시간 되는 사람"(Lily·Sofia·Maya…) 줄과 Discover "Free Right Now" 줄에 예시 표시가 없었다 — 다른 목록은 다 붙어 있음(PRODUCT_TASTE). 이름 아래 작은 SAMPLE 표시(사진 위에 얹으니 잘 안 읽혀서 이름 아래로). ChatInboxPage·DiscoverPage.
- 검증: `npx tsc -b`, `npm test` 219/219. v2·classic 스크린샷 확인.
- 메모(안 고침): 예시 채팅 Jordan 미리보기 "Thank you!! Bringing Hannah" — 숨긴 예시 사람 이름이 채팅 본문에 남음(알림은 55회차에 걸렀지만 채팅 메시지는 아님). 데이터 문구 문제라 다음에.
- 다음 초점: 채팅방 안(첫 메시지 보내기 화면·빈 채팅방 "Say hello"), 요청(Requests) 탭.

## 2026-10-19 15:18 UTC (버클리 월 08:18) · 초점: 아침 라이브 — 식당·체육관

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로.
- 라이브 확인(오전 8:18): Discover 식당 "Café 3, Clark Kerr +9 open · Scrambled Eggs · Café 3, breakfast", 체육관 "RSF 60% · Moderate", 체육관 화면 "Today 7 AM–11 PM", 식당 화면 아침 메뉴 정상. (어젯밤 "Closed · Opens 7 AM" → 아침 "열림" 으로 바뀌는 것까지 확인)
- 고침: 체육관 화면이 "평소 선은 일주일 기록이 쌓이면 나와요 (7/7 days)" 라고 하는데 선이 없었다 — 일수에 오늘까지 세서. 평소 선은 오늘 빼고 7일이 필요 → 지난 날만 세게(core/lib/gym.ts). 오늘은 6/7, 내일 선이 나온다. gym.test 에 "6일+오늘 = 6/7, 선 없음" 추가(고치기 전 실패 확인). 서버 값이라 배포 뒤에 화면에 보임.
- 메모(안 고침): CMS Fitness Center 가 밤 11시에도 아침 8시에도 0/55, 오늘 그래프도 거의 0 — 원본(Density API)이 0 을 준다. 센서가 안 세는 것 같지만 확인할 방법이 없음. 계속 0 이면 CMS 칸을 숨길지 사장님께 물어볼 것.
- 검증: tsc·typecheck:server, `npm test` 219/219.
- 다음 초점: 채팅 목록·채팅방 첫 메시지 흐름, 친구 추가 화면.

## 2026-10-19 12:26 UTC (버클리 월 05:26) · 초점: 30명 출시 흐름 — 약속 잡기·+ 메뉴

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로 (lumi-pm 의 섹션 고르기·Ask Lumi 빼기 등은 아직 배포 안 됨).
- 본 것(v2·classic): People 첫 화면, /plans/new("Ask friends" 링크로 묻기), /together/new("Plan Together"). 문구·레이아웃 이상 없음. 저장 버튼은 안 누름.
- 큰 것 → QUESTIONS: 약속 잡기가 두 갈래(링크로 묻기 vs Plan Together)이고, Plan Together 는 시간표를 모아 시간을 추천 — PRODUCT_TASTE "원하지 않은 것"과 부딪힘. 추천 A(출시용으로 Plan Together 입구 감추기).
- 고친 것 없음 (결정이 필요한 것이라).
- 다음 초점: 채팅 목록·채팅방 첫 메시지 흐름, 친구 추가 화면.

## 2026-10-19 (사장님 지시) · 다른 학교는 보류 — 버클리만

- 사장님: "지금 그냥 버클리만 해보자". 새 학교는 열지 않음 (schools.csv 그대로: Berkeley·Merced).
- 그 전에 해 둔 밑작업은 버클리 동작을 바꾸지 않아 저장해 둠: 학교별 시간대(School.tz, 없으면 태평양 — 앱은 로그인한 학교 시간대로 "오늘"을 셈), 행사 가져오기의 학교 이름·시간대(BU 행사가 "CalLink"·태평양 시간으로 찍히지 않게), Localist 캘린더 어댑터(Stanford·MIT·Northeastern 용, 지금은 아무 학교도 안 씀).
- 나중에 다른 학교를 열 때 할 일: schools.csv 에 줄 추가(tz 열 포함, 예 America/New_York), events_source=localist:<주소>. 조사 결과는 위 Stanford 기록에.
- 검증: tsc·typecheck:server, `npm test` 219/219. 버클리 Discover·시간표·라이드 화면 그대로.

## 2026-10-19 (사장님 지시) · Stanford 수업·섹션, 학기 라벨

- 사장님: "스탠포드도 구현해보고, 하버드처럼 동부에 여러 학교 붙어 있는 곳도 해보자".
- Stanford 수업 가져오기 고침: 예전엔 학기 구분 없이 첫 강의 섹션을 골라 가을 목록에 겨울 강의 시간이 섞일 수 있었고, 학기 라벨이 "Autumn 2026-2027" 이라 지금 학기를 못 찾았다. 이제 쿼터(Autumn·Winter·Spring)마다 한 줄, 그 쿼터 강의 시간 + 같은 쿼터의 토론·랩을 sections 로 같이 저장(실제 CS 106A Autumn 2026: MWF 11:30–12:20 Hewlett 200, 토론 61개). 강의 섹션이 여럿이면 섹션마다 한 줄.
- 학기 라벨: "2026-2027 Autumn"→"Autumn 2026", "Winter"→뒤 해, UMD "202608"→"Fall 2026" (저장된 옛 줄도 읽을 때 바뀜). 쿼터제는 Autumn 을 지금 학기로 봄.
- 섹션 API: 가져올 때 섹션이 같이 온 학교는 저장된 것을 그대로, Berkeley 는 고를 때 읽어 옴. 수업 검색 결과에서는 섹션을 빼고 보냄(학과 목록 400줄이 커지지 않게).
- 검증: tsc·typecheck:server, `npm test` 216/216 (Stanford 실제 응답을 줄인 fixture 테스트 추가).
- 조사: 동아리 목록 — Stanford(CampusGroups 777)·MIT(514)·Northeastern(938)·BU(Engage 432)·BC(428)·Tufts(423) 찾음, Harvard 못 찾음. 학교 캘린더 Localist API — Stanford·MIT·Northeastern 됨, Tufts·Harvard 안 됨.
- 막힌 것: 앱 곳곳(약 15곳)이 캠퍼스 시간을 태평양 시간으로 고정 — 동부 학교는 행사 시간이 3시간 틀린다. 다음: 학교별 시간대.

## 2026-10-19 (사장님 지시) · 시간표 디스커션·랩 섹션 (2단계)

- 사장님 결정: "2단계로 하자" — 버클리 공개 시간표에서 실제 섹션을 읽어 고르게.
- 원본: 수업 페이지의 "Associated Sections" 칸이 부르는 classes.berkeley.edu/sections/associated/<node id>. 섹션마다 번호·종류(DIS/LAB)·요일·시간·장소. 자리 채우기용 999 섹션(일요일 0시 1분)과 시간 없는 섹션은 뺌.
- 전체 가져오기에 넣지 않음(수업마다 요청 +1 → 하루 가져오기 두 배). 학생이 수업을 넣을 때 그 수업 것만 서버가 읽고 6시간 기억(실패는 10분). 가져오기는 목록 줄의 node id 를 sourceId 로 저장, 옛 목록은 수업 페이지에서 id 를 읽음.
- 화면: 수업 목록에서 강의를 고르면 디스커션·랩 목록 → 종류마다 하나 고르기(모르면 비워 두고 "강의만 추가"). 섹션이 8개 넘으면 번호로 찾기. 내 시간표·강의와 겹치면 "Overlaps CS 169". 고른 섹션은 같은 수업 이름에 section "DIS 118" 로 저장 → 공강 계산·같은 섹션 친구가 그대로 씀. 시간표 칸에 "DIS 118 · Dwinelle 189".
- 섹션이 없거나 못 읽으면 예전처럼 바로 강의만 추가. 다른 학교는 아직 빈 목록.
- 검증: tsc·typecheck:server 통과, `npm test` 214/214(새 sections.test.ts 4개, 실제 CS 61A 응답을 줄인 fixture). 실제 CS 61A Fall 2026 응답(디스커션 46·랩 43)으로 v2·classic 화면 확인 — 라이브 서버엔 아직 새 주소가 없어 브라우저에서 그 응답을 대신 넣었고, "추가"는 누르지 않음(라이브 DB 안 건드림).
- 배포 뒤 확인: 라이브에서 CS 61A 를 고르면 섹션 목록이 뜨는지.

## 2026-10-19 (사장님 지시) · Ask Lumi 빼기

- 사장님 결정: "Ask Lumi는 걍 빼라". Discover·Browse 위의 Ask Lumi 입구(AskBar)와 /ask 화면(AskPage)을 지움. /ask 로 들어오면 Discover 로 보냄(예전 링크가 깨지지 않게). PRODUCT_TASTE "원하지 않은 것"에 적음.
- 남긴 것: 서버의 /api/ai/ask 와 가입 때 "프로필 채우기"·대화 첫마디(Starters)는 그대로 — 같은 AI 를 쓰지만 Ask Lumi 화면이 아님. 개인정보처리방침의 Ask Lumi 문장은 그대로(다음에 정리).
- Discover 맨 위 카드가 헤더에 붙지 않게 위 여백 pt-3.
- 검증: `npx tsc -b` 통과, `npm test` 210/210. v2·classic 에서 Discover·Browse 에 Ask Lumi 없음, /ask → Discover 확인.

## 2026-10-19 09:17 UTC (버클리 월 02:17) · 97회차 · 초점: 로그인 전 첫 화면(/welcome·/start) v2

- 새 사장님 답 없음. 배포 브랜치 8bfd353 그대로(95·96회차는 아직 안 올라감). 버클리 새벽 2시라 아침 식당·체육관 확인은 다음으로.
- 본 것: /welcome(v2 "Who's free on campus right now?" / classic "at Cal"), 카드 3장(점심 친구 · 무료 음식 Mon 8AM · 오늘 마감 NSF GRFP Oct 19) 정상. /start 1~8단계 v2·classic 문구·버튼 정상(9단계 실제 이메일 전에서 멈춤).
- 고침: 7단계 "Here's your profile" 카드에서 학교 이름이 "Computer Science · Junior · UC Berk…" 로 잘림 — 카드에 자리가 있는데 한 줄로 자르고 있었음 → 두 줄까지 보이게(StartPage.tsx, truncate → line-clamp-2).
- 검증: `npx tsc -b` 통과, `npm test` 210/210. v2·classic 7단계 스크린샷에서 "Computer Science · Junior · UC Berkeley" 전부 보임.
- 메모(안 고침): /welcome 에서 디자인 전환 버튼이 위쪽 띠(1,558 CLUBS…)를 가림 — 이미 QUESTIONS 에 있는 '디자인 버튼이 내용 가림' 건과 같음.
- 다음 초점: 버클리 오전(다음 실행 12:17 UTC = 05:17 PT 는 아직 이름, 그 다음 15:17 UTC = 08:17 PT)에 식당·체육관 카드 "opens" 표시.

## 2026-10-19 06:19 UTC (버클리 일 23:19) · 96회차 · 초점: 배포 뒤 라이브 확인 + Discover 식당 카드

- 새 사장님 답 없음. 배포 브랜치에 lumi-pm 작업이 거의 다 올라감(4415c92 까지 — 51~94회차). 95회차(Saved 숫자)만 아직 안 올라감.
- 라이브에서 확인(v2, https://heetz.up.railway.app): 알림 시간이 "1h ago·3h ago·10h ago·2d ago" 로 바뀜, 숨긴 예시 사람(Hannah)·없는 장학금 마감 알림 사라짐. 관리 화면 참가 요청 "37m ago". 공연 모임 댓글 "2h ago". RSF 체육관 "Closed · Today 8 AM–11 PM"(밤 11:19), Discover 체육관 카드 "Closed". 전부 기대대로.
- 고침: Discover '식당 지금' 카드가 "Closed for today" 아래에 "Jasmine Rice · Café 3, dinner" — 이미 끝난 저녁 메뉴가 아직 먹을 수 있는 것처럼 보임 → 연 곳도 다음에 열 곳도 없으면 메뉴 줄을 숨김(LiveCards.tsx).
- 검증: `npx tsc -b` 통과, `npm test` 210/210. 로컬 v2·classic 에서 "DINING NOW | Closed for today" 만 나오는 것 확인.
- 메모(안 고침): 체육관 카드가 닫힌 시간에 "Closed" + "Closed for today" 두 번. CMS Fitness Center 는 운영 시간 자료가 없어 밤 11시에도 "Quiet 0%".
- 다음 초점: 아침(버클리 오전)에 식당·체육관 카드가 "opens 7 AM" 처럼 맞게 나오는지, 그리고 /welcome·/start 첫 화면 v2.

## 2026-10-19 03:17 UTC (버클리 일 20:17) · 95회차 · 초점: 저장(Saved) 목록

- 새 사장님 답 없음. 배포 브랜치가 8bfd353 "New design (v2) is the default" 로 움직임(사장님 결정, design.ts 기본값 v2·저장 키 lumi.design.2). 병합함. lumi-pm 수정들은 여전히 배포 안 됨. 실행 이름이 "3시간마다"로 바뀜.
- 고침: Browse 의 "☆ Saved 1" 칩을 누르면 "0 listings · Tap ☆ …" 빈 목록. 데모 계정이 저장한 공고가 마감됐거나 라이브에 없어서 목록에선 빠지는데 칩 숫자는 저장 기록을 그대로 셌다 → 칩 숫자를 목록에 실제로 뜨는 것만 세게(BrowseTab). Me 화면 "Saved & applications 1" 도 같은 이유로 빈 목록을 열었다 → 같은 규칙(활동·동아리 제외, 마감/날짜 지난 것·없는 공고 제외)으로 센다(ProfilePage).
- 검증: `npx tsc -b` 통과, `npm test` 210/210. v2·classic 에서 칩 "Saved"(숫자 없음) + 빈 목록 안내, Me "Saved & applications 0", 한국어 "저장·지원 내역 0개" 확인.
- 메모: index.html 의 apple-mobile-web-app-status-bar-style 이 "default"(흰 상태바)인데 기본 디자인이 어두운 v2 가 됨 — 홈 화면에 추가한 아이폰에서 상단이 흰 띠로 보일 수 있음. 배포 파일이라 다음에 확인.
- 다음 초점: v2 가 기본이 됐으니 처음 들어오는 사람(로그인 전 /welcome·/start) 화면을 v2 로 다시 보기.

## 2026-10-19 02:17 UTC (버클리 일 19:17) · 94회차 · 초점: 알림 목록

- 새 사장님 답 없음. 배포 브랜치 295a5f2 그대로.
- 고침: 알림 목록 카드가 화면 양옆에 딱 붙어 있었다(`px-4 py-3 card` — 여백이 카드 안쪽에 들어감). 바깥에 여백 div 를 두고 그 안에 카드 → 양옆 16px 띄우고 모서리 둥글게. NotificationsPage 1개 파일.
- 검증: `npx tsc -b` 통과, `npm test` 210/210. v2·classic 스크린샷에서 카드 양옆 여백·둥근 모서리 확인.
- 라이브에서 본 것(이미 lumi-pm 에 고쳐 둠, 배포 대기): 모든 알림이 "Sep 23"(rollSampleContent 의 알림 다시 맞추기, 배포본에 없음), "Deadline in 4 days" 가 라이브에 없는 op_scholarship 을 가리킴(54회차 view.ts 필터가 지움), 숨긴 예시 사람 Hannah 이름(55회차 namesHidden 이 지움).
- 메모(안 고침): 한국어 화면에서도 알림 제목·본문이 영어 — 시드가 영어로 저장돼 있어서. 서버 데이터 문제라 작은 수정 아님.
- 다음 초점: 최근에 안 본 화면 — 저장한 것(Saved) 목록과 마감 지난 항목 처리.

## 2026-10-19 01:17 UTC (버클리 일 18:17) · 93회차 · 초점: 모임 관리 화면(92회차 이어서)

- 새 사장님 답 없음. 배포 브랜치 295a5f2 그대로. 컨테이너 재시작 → vite 다시 띄움.
- 고침 1: 관리 화면 요약이 인원 제한 없는 모임에서 "Approved 0 / cap no limit · pending 0" → 제한 없으면 "/ cap" 부분을 빼서 "Approved 0 · pending 0". 정원 있는 모임은 그대로.
- 고침 2: 관리 화면 참가 요청 날짜가 "Sep 23"(시드는 '20분 전'). 예시 참가 요청(participations)은 rollSampleContent 가 다시 맞추지 않았다 → 알림과 같은 방식으로 시드의 '몇 분/시간 전'을 지금 기준으로 다시 맞춘다(server/demo.ts). 실제 사람 요청은 시드 id 가 아니라 안 건드림. samples.test.ts 에 테스트 추가(고치기 전 실패 확인).
- 확인: 92회차 메모의 '모임 댓글 날짜 Sep 23' 은 이미 d40fd4d(lumi-pm, 미배포)가 고쳐 둠.
- 검증: `npx tsc -b`, `typecheck:server` 통과, `npm test` 210/210. v2·classic·한국어로 a_mine 관리 화면 "Approved 1 / cap 4 · pending 1" / "승인됨 1 / 모집 4 · 대기 1" 그대로인 것 확인. 데모 계정이 여는 제한 없는 모임이 없어 그 경우는 화면으로 못 봄. 참가 요청 날짜는 서버 변경이라 배포 뒤 라이브에서 봐야 함.
- 다음 초점: 최근에 안 본 화면 — 알림 목록의 시간 표시와 빈 상태.

## 2026-10-19 00:17 UTC (버클리 일 17:17) · 92회차 · 초점: 모임 상세·참가 인원 표시

- 새 사장님 답 없음(QUESTIONS 답: 7개 그대로). 배포 브랜치 295a5f2 그대로.
- 고침: 인원 제한 없는 모임(정원 999 이상)이 영어로 "0 joined · cap no limit" 으로 읽혀 어색했다 → "0 joined · no limit" / "0명 참가 중 · 인원 제한 없음". 상세(ActivityDetailPage)와 카드(ActivityCard 두 곳) 같이. 정원 있는 모임은 그대로("1 joined · cap 200").
- 검증: `npx tsc -b` 통과, `npm test` 209/209. v2·classic 영어로 a_festival 상세 "0 joined · no limit", 한국어 v2 a_festival "0명 참가 중 · 인원 제한 없음", a_band_show "1명 참가 중 · 모집 200명" 확인.
- 메모(데이터, 안 고침): 학교 공식 행사 'Homecoming kickoff' 주최자가 학생(Jordan)으로 나옴. a_band_show 댓글 날짜가 Sep 23(행사 날짜만 다시 맞춰지고 댓글 날짜는 그대로). 관리 화면(ManageActivityPage) "/ cap no limit" 문구는 다음에.
- 다음 초점: 관리 화면 인원 문구와 행사 댓글 날짜(rollSampleContent 가 댓글도 다시 맞추는지).

## 2026-10-18 23:17 UTC (버클리 일 16:17) · 91회차 · 초점: 남은 사람 목록의 예시 표시

- 고침: 시간표 '공강 겹치는 친구'(TimetablePage), 동아리 회원 목록(OrgPage), 사람 카드(PersonCard — 검색 '사람' 결과가 이걸 씀)에 예시 프로필이면 SAMPLE 표시. PRODUCT_TASTE "예시 프로필은 sample 표시를 단다".
- 검증: `npx tsc -b` 통과, `npm test` 209/209. 스크린샷(v2·classic): 시간표 "SAMPLE Sofia · SAMPLE Jordan", /orgs/o_band 회원 탭 "SAMPLE Jordan · Admin" 확인.
- 못 본 것: 검색 '사람' 결과는 `?q=` 로 검색이 안 걸려 스크린샷 못 찍음. PersonCard 를 고쳤으니 같이 적용될 것.
- 배포 브랜치는 그대로 295a5f2 — lumi-pm 수정은 아직 라이브에 없음.
- 다음 초점: 다른 화면(최근에 안 본 곳) — 행사 상세·참가자 수 표시.

## 2026-10-18 22:20 UTC (버클리 일 15:20) · 90회차 · 초점: 사람 목록의 예시 표시(89회차 이어서)
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- PRODUCT_TASTE “예시 프로필은 sample 표시를 단다” 기준으로, 사람 이름이 나오는데 sample 확인이 없는 화면을 찾음.
- 고침 ①: 활동 상세의 참가자 칩(“Ethan host · Maya”)과 참가자 관리 화면(대기 요청·참가자)에 SAMPLE 표시 (ActivityDetailPage.tsx·ManageActivityPage.tsx).
- 고침 ②: 참가자 관리 맨 위 요약이 “Approve 1 / cap 4 · pending 1” — 버튼 말(Approve)을 상태로 씀 → “Approved 1 / cap 4” / “승인됨 1 / 모집 4” (ManageActivityPage.tsx, en.ts 한 줄).
- 남은 후보(다음): 시간표의 ‘공강 겹치는 친구’, 동아리 회원 목록, 검색 결과.
- 검증: tsc, npm test 209 통과, 로컬 v2·classic·한국어 확인.

## 2026-10-18 21:20 UTC (버클리 일 14:20) · 89회차 · 초점: 프로필 › 친구 목록
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 다시 켬)
- /profile/friends(친구 3명)를 v2·classic 로 봄.
- 고침: 세 명 모두 예시 프로필인데, 홈·같이 타기·채팅과 달리 이 목록에만 ‘SAMPLE’ 표시가 없었다 → 이름 앞에 SampleTag (ProfileListPage.tsx — 팔로워·팔로잉·좋아요 목록도 같은 화면이라 같이 적용).
- 메모: Sofia 는 학과 없이 “UC Berkeley · Undergrad”(데이터).
- 검증: tsc, npm test 209 통과, 로컬 v2·classic 전후 확인.

## 2026-10-18 20:20 UTC (버클리 일 13:20) · 88회차 · 초점: Ask Lumi 추천(recommendFor)이 같은 엔진 변경을 잘 따르는지
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 라이브 스냅샷으로 server/ai-search recommendFor 를 node 에서 직접 돌림(AI 호출 없음). 87회차에 행사에서 research 주제를 뺀 뒤에도 “research talks / research seminars” 질문은 단어 일치(“Mentions “seminars””)로 세미나를 잘 찾음 — 회귀 없음.
- 고침: “research seminars this week” 에 이유 “Mentions “this”” — ‘this·week’ 가 검색어로 들어가 미술 강연 같은 엉뚱한 행사가 섞임. → 질문의 시간·채움말(this·that·today·tonight·tomorrow·week·weekend·month·now·soon·upcoming·next·anything·fun…)을 검색어에서 뺌 (foryou.ts ASK_STOP). 테스트 추가(고치기 전 실패/후 통과). 이제 결과가 전부 세미나.
- 검증: tsc, 서버 타입체크, npm test 209 통과. (Ask 화면은 서버 계산이라 배포 뒤 라이브에서 확인)

## 2026-10-18 19:20 UTC (버클리 일 12:20) · 87회차 · 초점: 86회차 남은 것 — ‘연구’ 로만 맞는 행사
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 남아 있던 “Zonian Archaeology”(주최 Archaeological Research Facility)·“Graduate Research Seminar”(화학과)가 CS 학생에게 “Similar to Vision & Language Lab”. 주제 벡터를 찍어 보니 고고학은 research 하나뿐, 화학은 research+생물·화학.
- 먼저 행사 주최 이름 가중치를 낮춰 봤는데 안 빠져서 되돌림. 고침: 행사는 ‘연구’ 라는 말만으로 맞추지 않고(research 주제를 행사 벡터에서 뺌) 분야(소프트웨어·AI·생물…)로 맞춘다 (foryou.ts itemVecRaw). 86회차 테스트에 두 경우 추가(고치기 전 실패/후 통과).
- 결과(라이브 스냅샷): 고고학·화학 세미나 빠짐, EECS 강연·AI·예술·음악 행사는 남음.
- 검증: tsc, 서버 타입체크, npm test 208 통과. (화면은 86회차와 같은 For you 목록 — 로컬 확인은 node 계산으로 대신)

## 2026-10-18 18:20 UTC (버클리 일 11:20) · 86회차 · 초점: For you 의 “This week” 줄
- 질문 새 답 없음, 배포 브랜치 변화 없음. (컨테이너 재시작 뒤 vite 다시 켬)
- 85회차에 동아리에 붙은 줄 알았던 “This week” 는 실제로는 학과 세미나·행사(라이브 스냅샷을 node 로 돌려 확인). CS 학생 For you 에 식물 면역·미토콘드리아·인구학·고고학 세미나가 이유 “This week” 하나로 들어와 있었다.
- 원인: 연구 주제 단어에 ‘seminar·colloquium’ 이 들어 있어서 모든 학과 세미나가 ‘연구’(이 학생의 가장 큰 관심, Vision & Language Lab)로 맞음 → 이유 줄은 반복 제한으로 숨고 “This week” 만 남음.
- 고침 (foryou.ts): ‘seminar·colloquium’ 을 연구 단어에서 뺌(형식이지 분야가 아님 — 세미나 주제는 제목·주최로 따로 맞는다). 그리고 신호가 있는 사람에게 행사는 주제 이유가 하나도 없으면 For you 에서 뺌(Events 탭엔 그대로). 테스트 추가(고치기 전 실패/후 통과).
- 결과(라이브 데이터): 식물·미토콘드리아·인구학·음악 세미나 빠짐, EECS·AI 정렬·예술 행사는 남음. 메모: “Archaeological Research Facility” 는 주최 이름의 Research 로 아직 남음 — 다음에.
- 검증: tsc, 서버 타입체크, npm test 208 통과, 로컬 v2·classic 확인.

## 2026-10-18 17:20 UTC (버클리 일 10:20) · 85회차 · 초점: For you 이유 줄 전체 점검
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- For you 목록의 ✨ 이유 줄을 항목과 짝지어 전부 봄(라이브 스냅샷을 받아 node 로도 같은 계산).
- 고침: “Berkeley Lab Computing Sciences summer student positions” 의 이유가 “Similar to Alpha Kappa Psi”(경영 동아리). AKP 의 상위 분류 “Academic Student Organizations” 가 research 를 조금(0.4) 주는데, 그게 research 주제의 출처가 됨. → 동아리·저장한 것은 그 주된 주제(가장 강한 주제의 3/4 이상)에서만 이유의 출처가 되고, 점수 계산은 그대로 (foryou.ts interestProfile feed). 테스트 추가(고치기 전 실패/후 통과). 이제 research 이유는 Vision & Language Lab 에서만.
- 그대로 둔 것: Research Experience Pathways·PASAE 의 “Similar to Alpha Kappa Psi” — ‘career’ 주제로 이어진 것이라 말이 됨.
- 검증: tsc, 서버 타입체크, npm test 207 통과, 로컬 v2·classic 확인.

## 2026-10-18 16:20 UTC (버클리 일 09:20) · 84회차 · 초점: Startups·Study abroad 탭
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 꺼져 다시 켬)
- 두 탭 모두 1개씩(SkyDeck Batch 24, Berkeley Study Abroad). 
- 고침 ①: “1 listings” → “1 listing” (BrowseTab.tsx).
- 고침 ②: Study abroad 이유가 “✨ Matches your interest in sports & fitness” — 설명의 “info sessions are running now” 의 running 을 달리기로 읽음. → 운동 규칙의 running 은 뒤에 now·until·for… 가 오면 안 셈 (foryou.ts), 테스트 추가(고치기 전 실패/후 통과). 이제 그 이유 줄 없음.
- 메모: 두 탭이 한 개뿐 — 데이터가 얇음(지어내지 않음). 창업·교환학생 공식 출처를 더 붙일지는 나중 후보.
- 검증: tsc, npm test 206 통과, 로컬 v2·classic 확인.

## 2026-10-18 15:20 UTC (버클리 일 08:20) · 83회차 · 초점: Events·Free food 탭 (+ 82회차 수정 점검)
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- Events(199개)·Free food(7개): 날짜·시간 “Tomorrow · 8 AM”, “Oct 21 · 4 PM” 이상 없음.
- 고침(82회차 내 수정의 부작용): ‘For you’ 에서 “DOE SULI — U.S. Department of Energy Office of Science” 에 “From your department” — 연방 부처 이름의 ‘Science’ 가 Computer Science 와 겹쳐서. → 학과 규칙은 우리 학교 공고(schoolId 같음)에만, 흔한 말(science·studies·engineering·arts)은 비교에서 뺌 (foryou.ts). 테스트에 DOE 경우 추가, 고치기 전 실패/후 통과. 장학금 순서(Goldwater·Caltech SURF·Penn REU)는 그대로.
- 검증: tsc, 서버 타입체크, npm test 206 통과, 로컬 v2·classic 확인.

## 2026-10-18 14:20 UTC (버클리 일 07:20) · 82회차 · 초점: 장학금·연구 탭 ‘For you’ 순서
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 다시 켬)
- Scholarships·Research & RA 를 봄. 마감 D-n 표시 이상 없음.
- 고침: CS 학생의 Scholarships ‘For you’ 1·2위가 “Swan Award … (Psychology)”(심리학과)·“Mellon Mays”(인문학부) — 다른 학과 전용에 가까운 상이 맨 위. → 주최가 “Department of X / Division of X” 이고 내 전공과 겹치는 단어가 없으면 점수 -3(숨기진 않음), 겹치면 +1.5 와 이유 “From your department / 내 학과” (packages/core/src/lib/foryou.ts). 테스트(server/foryou.test.ts) 추가, 고치기 전 실패/후 통과. 이제 1위부터 Goldwater·Caltech SURF·Penn REU·NOAA.
- 검증: tsc, 서버 타입체크, npm test 206 통과, 로컬 v2·classic 전후 확인.

## 2026-10-18 13:20 UTC (버클리 일 06:20) · 81회차 · 초점: 인턴십 분야 필터
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 꺼져 다시 켬)
- 분야별 목록을 훑음. 잘못 분류된 것: “Flight Test Engineer Intern”(Anduril) → Software, “User Research Intern”(Coinbase) → Research & Science, “Software Engineer – Production Infrastructure”(Palantir) → Product & Design(‘Production’ 안의 product), “Campus UI Software Engineer”(Jump) → Product & Design(‘UI’).
- 고침 (packages/core/src/lib/listings.ts FIELD_RULES): 항공·비행(aerospace·flight·propulsion·avionics·spacecraft)은 Hardware, user/UX/design research 는 Product & Design(연구 규칙보다 먼저), Product 는 단어 그대로(“product(s)”)만, ‘UI’ 단독 규칙 뺌. 테스트(server/categories.test.ts) 추가, 고치기 전 실패/후 통과.
- 반영 시점: 분야는 서버가 공고를 모을 때마다(server/sources/external.ts) 새로 계산해 넣으므로 배포 뒤 첫 수집부터 화면에 반영. 로컬(라이브 데이터)에선 아직 옛 분야.
- 검증: tsc, npm test 205 통과.

## 2026-10-18 12:20 UTC (버클리 일 05:20) · 80회차 · 초점: 인턴십 지역 필터
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- Internships ?region=Bay Area / Remote 를 확인. Bay Area(SF·Emeryville·Mountain View·San Mateo)는 맞음, 회사가 겹쳐 보이는 건 서로 다른 직무라 정상.
- 고침: Remote 에 “Perplexity · Berlin · Remote”, “Belgrade · Remote” — 그 나라 원격이라 버클리 학생은 못 하는 자리. → ‘Remote’ 는 원격만 적혀 있거나, 같이 적힌 곳이 미국(지역 규칙·US/USA/United States·“, CA” 같은 주 약자)일 때만 (packages/core/src/lib/listings.ts regionsOf). 테스트 추가(server/categories.test.ts: Berlin·Belgrade·London 은 빠지고 Remote/US·Foster City·New York·Denver, CO·Portland, United States 는 남음, 고치기 전 실패/후 통과). Remote 12 → 10개.
- 검증: tsc, 서버 타입체크, npm test 204 통과, 로컬 v2·classic 확인.

## 2026-10-18 11:20 UTC (버클리 일 04:20) · 79회차 · 초점: 공고 상세(인턴십)
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 꺼져 다시 켬)
- Internships 목록 → Coinbase “User Research Intern” 상세를 v2·classic 로 봄 (저장·지원 버튼은 안 누름). 위치·분야·마감(“Not posted — companies usually close once roles fill”)·공식 출처·확인 날짜 이상 없음.
- 고침: 아무도 저장 안 한 공고에 “0 interested · 0 applied · See who” + 바로 아래 “Nobody has saved this yet…” + 탭 “People 0” — 같은 ‘아무도 없음’을 세 번. 둘 다 0 이면 숫자 줄을 숨김 (OpportunityDetailPage.tsx). 한 명이라도 있으면 그대로.
- 검증: tsc, npm test 203 통과, 로컬 v2·classic 전후 확인.

## 2026-10-18 10:20 UTC (버클리 일 03:20) · 78회차 · 초점: 한국어 글쓰기·피드
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 한국어 /create/post·/community: 문구 이상 없음(사진 칸·#연애 는 기존 질문 건, 예시 글 날짜 “9월 23일”은 배포 대기 중인 c986455 로 해결).
- 고침: 글쓰기 ‘관련 기회’ 드롭다운에 공고·행사 전체 수백 개가 정렬 없이 — 같은 제목(“Gathering” ×4, “Prayer Night” ×2)이 여러 개라 골라도 뭔지 알 수 없음. → ‘참여한 활동’ 칸처럼 내가 저장·표시한 기회만, 하나도 없으면 칸을 숨김 (CreatePostPage.tsx). 데모 계정은 저장한 것이 이미 없어진 예시 장학금뿐이라 칸이 안 보임.
- 검증: tsc, npm test 203 통과, 로컬 v2·classic 확인.

## 2026-10-18 09:20 UTC (버클리 일 02:20) · 77회차 · 초점: 한국어 Discover·Teams·찾기
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 다시 켬)
- 고침: 추천 이유 줄이 한국어로 “✨ Vision & Language L…와 비슷해요”(이름이 20자에서 잘리고 영어 이름에 ‘와’) — 그리고 영어 “Like X, which you're in” 은 가입 안 하고 팔로우·관심만 한 단체에도 붙어 틀린 말이 될 수 있었다(데모 계정은 Vision & Language Lab 을 팔로우만 함). → “Similar to X” / “X 같은 곳”, 저장한 것은 “저장한 “X” 같은 곳” (packages/core/src/lib/foryou.ts).
- 질문 추가: Teams 의 해커톤 3칸에 다른 지역 대면 행사(UC Irvine·USC)가 섞임 → 온라인+베이 지역만 보일지.
- 검증: tsc, npm test 203 통과, 로컬 한국어·영어(v2·classic) 확인.

## 2026-10-18 08:20 UTC (버클리 일 01:20) · 76회차 · 초점: 자정 넘긴 직후 홈·Discover·시간표
- 질문 새 답 없음, 배포 브랜치 변화 없음. 코드 변경 없음.
- 일요일 새벽 1:17 에 홈·Discover·시간표를 봄: 공강 “09:00–21:00”(오늘 남은 시간이라 맞음), Discover 오늘 활동 7:20 AM~6 PM, 시간표 “Sun · No classes today”, 친구 공강 09:00–21:00 — 날짜 넘어간 직후에도 어긋난 곳 없음.
- 그대로 보이는 것(이미 고쳐 둠, 배포 대기): 예시 “Hate eating alone — lunch at Crossroads? · 7:20 AM”(시드 제목은 “grab a bite”), 헬스장 “0% · Quiet”(새벽 1시 — 73~75회차 운영 시간 작업이 배포되면 “Closed · Opens 8 AM”).

## 2026-10-18 07:20 UTC (버클리 일 00:20) · 75회차 · 초점: /gym 화면에 운영 시간
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- /api/gym/now 는 이미 views() 전체를 보내서 open·hours 가 따라옴 → 화면만 (GymPage.tsx 한 파일): 닫힌 시간엔 태그 “Closed”(Quiet 대신), 갱신 줄 앞에 “Today 8 AM–11 PM”(휴관일은 “Closed today”). 운영 시간 출처 없는 CMS 는 그대로.
- 확인: 응답에 open/hours 를 넣은 스텁으로 닫힘·열림 두 경우 v2·classic. 메모: RSF 카드의 ‘Closed’ 태그가 Design 알약에 가림(기존 질문 건).
- 검증: tsc, npm test 203 통과.

## 2026-10-18 06:20 UTC (버클리 토 23:20) · 74회차 · 초점: RSF 운영 시간 붙이기 ②(화면)
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 다시 켬)
- 73회차 서버 작업에 이어: /api/campus/now 의 헬스장 공간에 open·hours 를 싣고(server/campus-live.ts), client 타입(src/lib/campusLive.ts), Discover ‘GYM NOW’ 카드가 닫힌 시간엔 “Closed · Opens 8 AM”(오늘 열 시간이 남았을 때) 또는 “Closed · Closed for today” (LiveCards.tsx). 열려 있을 땐 그대로 “0% · Quiet · 3 min ago”.
- 확인: 라이브 서버는 아직 hours 를 안 보내므로, 스크린샷 스크립트에서 /api/campus/now 응답에 open/hours 를 넣어(닫힘·열림 두 경우) v2·classic 확인. 실제로는 배포 뒤 라이브에서 다시 확인.
- 검증: 서버 타입체크, tsc, npm test 203 통과.

## 2026-10-18 05:20 UTC (버클리 토 22:20) · 73회차 · 초점: RSF 운영 시간 붙이기 ①(서버)
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 72회차에 찾은 공식 출처(events.berkeley.edu LiveWhale JSON, “Building Hours - RSF”)를 서버에 붙임. 화면까지 한 번에 하면 5파일이라 둘로 나눔(README: 작은 수정 1~3파일).
  - server/gym.ts: parseBuildingHours + fetchRsfHours, 6시간 캐시(실패 시 30분 뒤 재시도, 못 받아도 혼잡도는 그대로), views() 가 RSF 공간에 hours·open 을 붙임. 받아 둔 기간 안인데 그날 항목이 없으면 휴관(open=false), 출처 없는 공간(CMS)은 모름(undefined).
  - packages/core/src/lib/gym.ts: GymSpaceView 에 hours·open. alertDue — 문 닫은 시간엔 “지금 한산해요(0%)” 알림을 안 보냄(지금은 사용자가 고른 시간대면 닫힌 시간에도 0% 로 울릴 수 있었다).
  - 테스트(gym.test.ts): JSON 파싱, 토 19:18 닫힘·알림 없음, 일 10:00 열림, 목록 안 빠진 날=휴관, 캐시. 기존 서비스 테스트는 네트워크를 안 타게 hours 를 끔.
- 다음(②): /api/campus/live 응답·client 타입에 open·hours 를 싣고 Discover 카드에 “Closed · opens 8 AM”.
- 검증: 서버 타입체크, tsc, npm test 203 통과. 화면 변화 없음(서버만).

## 2026-10-18 04:20 UTC (버클리 토 21:20) · 72회차 · 초점: (조사만) RSF 운영 시간 출처
- 질문 새 답 없음, 배포 브랜치 변화 없음. 코드 변경 없음.
- 지금 쓰는 Density 데이터(server/sources/density)에는 운영 시간이 없다(time_zone 뿐).
- 찾은 출처: RecWell 의 공식 “RSF Hours” 페이지는 Berkeley 이벤트 캘린더(LiveWhale) 위젯으로 시간을 그린다 → 같은 데이터가 JSON 으로 있음:
  `https://events.berkeley.edu/live/json/events/tag/RSF` — 하루 한 건 “Building Hours - RSF”, `date_iso`(열림)·`date2_iso`(닫힘), 앞으로 20일치. 예: 일 10/18 08:00–23:00, 토 10/24 08:00–18:00. 휴관일(추수감사절·성탄·새해)은 그날 항목이 없는 식으로 보임(확인 필요).
- 확인된 문제: 어제(토) 저녁 7:18 Discover 헬스장 카드 “RSF Weight Rooms 0% · Quiet” — 토요일은 오후 6시 마감이라 실제로는 문 닫은 시간.
- 다음 할 일(작은 작업으로 가능해 보임): 서버가 이 JSON 을 하루 몇 번 받아 캐시 → 카드·/gym 에 “Closed · opens 8 AM” / “Open until 11 PM”. Memorial Stadium Fitness Center 도 같은 방식인지 확인(tag 다를 수 있음).

## 2026-10-18 03:20 UTC (버클리 토 20:20) · 71회차 · 초점: Discover 헬스장·식당 카드 → /gym, /dining
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 꺼져 다시 켬)
- 헬스장 카드 “RSF Weight Rooms 0% · Quiet”(토요일 저녁): 데이터에 운영 시간이 없어 ‘문 닫음’과 ‘한산’을 구분 못 함. 운영 시간을 지어 넣을 수 없어 이번엔 손대지 않음 — 공식 운영 시간 출처를 붙이는 일은 작은 수정이 아님(다음 후보).
- 고침: /dining 코너 이름이 원본 그대로 “CENTER_PLATE”(밑줄) → “CENTER PLATE” (DiningPage.tsx; 제목은 원래 대문자 스타일이라 밑줄만).
- /gym: 이상 없음(실시간 0/150, 1분 전 갱신, ‘usually’ 안내).
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 확인.

## 2026-10-18 02:20 UTC (버클리 토 19:20) · 70회차 · 초점: 저녁 시간대 홈·Discover 시간 표시
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 홈(“free 19:18–21:00”)과 Discover 를 저녁에 비교.
- 고침: Discover ‘Free Right Now’ 얼굴 아래 “4h left / 1h left” 가 아침 7시에도 저녁 7시에도 똑같음 — 끝나는 시각을 모를 때(오늘 수업 없음·수업 끝·직접 설정) whosFree 의 minutes 는 정렬용 자리값(240·300·120·60)인데 그걸 남은 시간처럼 보여 줬다(지어낸 숫자). → 끝나는 시각을 알 때만 “Xh left”, 모르면 표시 안 함 (DiscoverPage.tsx). 처음엔 “Free” 로 바꿔 봤는데 ‘Free Right Now’ 제목 아래 6번 반복이라 뺌.
- 메모: GYM NOW “RSF Weight Rooms 0% · Quiet” — 토요일 저녁이라 문 닫은 시간일 수 있음(실데이터). 다음에 운영 시간 표시 확인.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 확인.

## 2026-10-18 01:20 UTC (버클리 토 18:20) · 69회차 · 초점: 시간표 ‘오늘 공강’ 카드의 지난 시간
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 꺼져 다시 켬)
- 고침: 저녁 6:18 에 시간표 ‘Fits into your free periods today’ 가 “09:00–21:00 · 6 free · 6 nearby” — 지난 아침·낮까지 포함(홈은 “free 18:18–21:00”, 바로 아래 친구 카드는 “18:30–21:00”). → 친구 카드와 같은 ahead() 로 지금부터 남은 시간만 (TimetablePage.tsx). 이제 “18:30–21:00 · 6 free · 4 nearby”(근처 활동 수도 남은 시간 기준으로 줄어듦). 눌렀을 때 여는 시트도 남은 시간 기준.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 확인.

## 2026-10-18 00:20 UTC (버클리 토 17:20) · 68회차 · 초점: 설정 › 계정·안전 / 공개 범위
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- /settings/safety, /settings/privacy 를 v2·classic 로 봄 (설정 바꾸는 버튼은 안 누름).
- 고침: “Blocked users 0” + 바로 아래 “No blocked users.” — 0 이면 숫자는 빼고 문장만 (신고 내역도 같게). 맨 아래 “Host and participant ratings are planned for a future version.” — 학생에게 미완성 앱처럼 읽히는 개발 메모라 뺌 (SafetySettingsPage.tsx).
- 발견(사장님 손 필요 → QUESTIONS.md): 공용 데모 계정 My reports 에 “TEST report filed by Claude to verify the alert e-mail; please dismiss” 가 남아 데모 보는 모든 사람에게 보임. 라이브 DB 라 PM agent 는 못 지움.
- 공개 범위 화면: 이상 없음(Height 는 기존 질문 건).
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 확인.

## 2026-10-17 23:20 UTC (버클리 토 16:20) · 67회차 · 초점: 66회차 메모 두 개
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 꺼져 다시 켬)
- 고침: 지도 맨 위 “📍 UC Berkeley Berkeley” — 학교 이름에 지역 이름이 이미 들어 있으면 지역은 안 붙임 (MapPage.tsx). 이제 “📍 UC Berkeley”. 다른 학교(지역이 이름에 없을 때)는 그대로.
- 확인만: 예시 “Hate eating alone — lunch at Crossroads?” 가 오후 3:30 에 있는 건 이미 고쳐 둔 것 — 시드 제목은 “grab a bite”(점심 아님)이고 예시 시간 굴리기가 제목을 시드로 맞춘다(c986455 계열). 라이브는 배포 전이라 옛 제목.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 확인.

## 2026-10-17 22:20 UTC (버클리 토 15:20) · 66회차 · 초점: 지도(/map)
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- /map(기본 ‘This week’ 목록)을 v2·classic 로 봄.
- 고침: 목록 순서가 뒤죽박죽(오늘 3:30 PM → 6 PM → 내일 4 PM → 수요일 → 다시 오늘 11 AM…) → 날짜·시작 시각 순 (MapPage.tsx). 같이: 이미 끝난 활동(오늘 종료 시각 지남·지난 날짜)은 Today·This week 에서도 빼도록(지금까지는 ‘Now’ 만 뺐다). 지금 목록의 오늘 10 AM·11 AM·2 PM 은 각각 9·5·5 PM 까지라 아직 진행 중 → 남는 게 맞음.
- 메모(작음): 맨 위 “UC Berkeley Berkeley”(학교 이름+도시) 겹침, 예시 “Hate eating alone — lunch at Crossroads?” 가 예시 시간 굴리기로 오후 3:30 에 있음(점심인데). 다음에.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 확인.

## 2026-10-17 21:20 UTC (버클리 토 14:20) · 65회차 · 초점: 프로필 › Propose(활동 제안) 시트
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 다시 켬)
- Maya 프로필에서 Propose 시트를 v2·classic 로 봄 (Send proposal 은 안 누름). 안내(읽음 표시 없음·48시간 뒤 만료)·종류 칩 이상 없음.
- 고침: ‘언제’ 칸 기본값이 “2026-10-17 18:00” — 이 글은 상대에게 그대로 가고, 수락되면 자동 메시지 “Coffee sounds great! See you 2026-10-17 18:00 :)” 에도 들어간다 → “Sat 6 PM” / “토요일 오후 6시” (PersonPage.tsx). ‘Today’ 는 하루 지나면 틀린 말이 돼서 요일로.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 확인.

## 2026-10-17 20:20 UTC (버클리 토 13:20) · 64회차 · 초점: 다른 사람 프로필(Maya, Daniel)
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 끝에 꺼짐 — 다음 실행에서 다시 켬)
- /users/u_jimin, u_dohyun 를 v2·classic 로 봄. 큰 얼굴 사진·나이·하트·Dating 은 사람 탭 질문(키·Dating 추가분)과 같은 건이라 손 안 댐.
- 고침: 공통점 목록에 “Coffee·Startup·Arts & shows in common”, 바로 아래 태그에 “Shared interests Coffee, Startup, Arts & shows, Workout” — 같은 말 두 번(위는 3개만). 태그가 보일 땐 목록에서 관심사 줄을 뺌 (PersonPage.tsx). 수업·목표 줄은 그대로.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 확인.

## 2026-10-17 19:20 UTC (버클리 토 12:20) · 63회차 · 초점: Ask Lumi
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 첫 화면(v2·classic) + 실제 질문 1개 “Anything fun to do this weekend with free food?” (41초). 답은 정직함 — 이번 주말 무료 음식 목록 없음 + “Try asking:” 질문 3개.
- 고침 ①: 답 끝의 “Try asking:” 따옴표 질문들이 그냥 글자라 눌러지지 않았다 → 따옴표로만 된 줄머리는 누르면 그 질문을 바로 보내는 버튼으로 (AskPage.tsx RichText). 확인은 AI 를 다시 부르지 않고 ask 응답을 같은 글로 바꿔 넣어서(스텁) — 눌러서 두 번째 질문이 가는 것까지 v2·classic.
- 고침 ②: 시작 질문 “Internships near Berkeley for a sophomore” 가 모든 학교·학년에 고정 → “Internships open to undergrads” / “학부생이 지원할 수 있는 인턴십”.
- 검증: tsc, npm test 202 통과.

## 2026-10-17 18:20 UTC (버클리 토 11:20) · 62회차 · 초점: 시간표 › 수업 시트(CS 186)
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 꺼져 다시 켬)
- 시간표에서 CS 186 을 눌러 수업 시트(같이 듣는 사람·수업 끝나고 비는 사람·스터디 그룹)를 v2·classic 로 봄. 내용·사생활 안내 이상 없음.
- 고침 ①: 시간표 화면 제목이 영어로 소문자 “timetable” — 번역 사전 ‘시간표’ 한 줄 → “Timetable” (en.ts; 프로필 완성 체크리스트 항목도 같이 대문자로).
- 고침 ②: 수업 시트 맨 위 “CS 186 Databases” 제목 바로 아래에 큰 “CS 186 / Databases” 가 또 나옴 → 시트 제목은 비우고 닫기 X 만 (TimetablePage.tsx).
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 확인.

## 2026-10-17 17:20 UTC (버클리 토 10:20) · 61회차 · 초점: 단체 페이지 커버
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 고침: 단체 페이지 커버가 로고 이미지를 가로로 늘려 써서, 디렉터리 동아리(대부분 작은 UC 문장 로고)는 흐릿하게 깨져 보였다. → 커버는 갤러리 첫 사진, 없으면 색 띠만 (OrgPage.tsx). 로고는 아래 동그란 자리에 그대로.
- 확인: Likelion at Berkeley(갤러리 없음) → 깨끗한 색 띠, Vision & Language Lab(갤러리 있음) → 사진 커버. v2·classic 둘 다.
- 검증: tsc, npm test 202 통과.

## 2026-10-17 16:20 UTC (버클리 토 09:20) · 60회차 · 초점: 동아리 목록·단체 페이지
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 꺼져 다시 켬)
- Campus › Clubs(1,562개), Mine, Likelion at Berkeley 페이지를 v2·classic 로 봄 (Follow·Ask to join 은 안 누름).
- 고침: 프로필 ‘My groups’ 줄은 0 인데 누르면 열리는 Clubs › Mine 에는 2개(팔로우한 Cal Indie Collective·Vision & Language Lab). 프로필은 가입·운영만, Mine 은 팔로우까지 셌다 → 프로필도 Mine 과 같은 기준으로 (ProfilePage.tsx). 한국어 이름도 ‘가입한 단체’ → ‘내 단체’(팔로우 포함이라) (en.ts 키 한 줄).
- 메모(작음, 다음에): 사진 없는 동아리 페이지 커버가 UC 문장(seal) 작은 이미지를 크게 늘려 흐릿하게 보임.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic·한국어 확인(My groups 2 / 내 단체 2개).

## 2026-10-17 15:20 UTC (버클리 토 08:20) · 59회차 · 초점: 같이 타기 상세·올리기
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- 상세(Maya → OAK, Daniel → Costco)와 /rides/new 를 v2·classic 로 봄 (Join·Post ride 는 안 누름).
- 고침: 상세 위쪽 “Leave Tue Nov 24 · 6–6:30pm” 과 아래 ‘Leaving’ 줄 “Tue Nov 24 · 6pm–6:30pm” 이 같은 시간을 다르게 씀 → 아래도 같은 whenLabel 로 (RideDetailPage.tsx, 안 쓰게 된 import 2개 정리).
- 이상 없음: 올리기 화면 날짜(한 줄)·시간(두 칸) 잘림 없음, 안전 안내·가격 안내 문구.
- 메모: Design 알약이 상세 제목(“Maya → OAK”)도 가림 — 기존 질문과 같은 건.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 확인.

## 2026-10-17 14:20 UTC (버클리 토 07:20) · 58회차 · 초점: Rides 목록·내 같이 타기
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 꺼져 다시 켬)
- /rides, /rides?mine=1 을 v2·classic 로 봄. 목록·날짜 묶음·가격 이상 없음.
- 고침: My rides 에 지난·취소된 것이 있는데 위에 “No rides yet” — 앞뒤가 안 맞음 → 지난 것이 있으면 “No upcoming rides” (RidesPage.tsx).
- 발견(질문에 추가): Design 알약이 Rides 상단의 **My rides** 탭을 덮어 누를 수 없음 → 기존 Design 알약 질문에 덧붙임.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 확인.

## 2026-10-17 13:20 UTC (버클리 토 06:20) · 57회차 · 초점: 글쓰기·Plan Together 만들기
- 질문 새 답 없음, 배포 브랜치 변화 없음.
- /create/post: 이상 없음(관련 기회는 기본 드롭다운이라 목록이 길어도 화면은 안 길어짐). 사진 칸·#Dating 은 이미 질문함.
- 고침: /together/new 에서 친구를 아직 안 골랐을 때 “Suggested from 1 timetables” + 시간마다 “Free overlap” — 복수형이 틀리고, 내 시간표 하나뿐이라 ‘겹침’도 아님. → 1개일 땐 “Free in your timetable”(‘내 시간표의 공강’), 겹침 표시는 2개 이상일 때만 (CreateTogetherPage.tsx). 친구를 고르면 “Suggested from 2 timetables · Free overlap” 그대로.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 확인.

## 2026-10-17 12:20 UTC (버클리 토 05:20) · 56회차 · 초점: 활동 만들기(+) 화면
- 질문 새 답 없음, 배포 브랜치 변화 없음. (vite 시간 한도로 꺼져 다시 켬)
- /create/activity 를 v2·classic 로 봄 (만들기 버튼은 안 누름 — 라이브 DB).
- 고침: 날짜·시작·끝 세 칸이 한 줄이라 날짜가 “10/17/2(” 로 잘리고, 시간의 AM/PM 이 가려져 기본값 오후 6시가 “06:00” 로 보였다(오전 6시로 읽힘). → 날짜는 한 줄, 시작·끝은 두 칸 (CreateActivityPage.tsx, 시간표 수정 6dc8201 과 같은 방식). 이제 “10/17/2026”, “06:00 PM · 07:30 PM”.
- 다른 화면에 같은 세 칸 날짜·시간 배치 없음 확인.
- 검증: tsc, npm test 202 통과, 로컬 v2·classic 전후 스크린샷.

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

## 2026-11-02 — Onboarding per owner mockup (/start)
- New order: Name first ("What should we call you?" + birth year 16+) → Your goals (5 + Skip) → Here's how Lumi helps you (4 cards; Communities = "Join clubs, Greek life, and other campus groups") → University & student status (school + Undergraduate/Graduate/Alumni, optional year/major, waitlist for other schools) → Your communities (8 + None for now) → school email (optional) + Get Started.
- No new schema: goals/communities map into existing goals/interests/purposes. "Make campus life easier" and "Residence Hall / Dorm" have no matching field, so they only steer interests (study) or are not stored. Avatar/bio quiz steps removed (bio starts empty, editable in Profile).
- Checks: tsc, server typecheck, npm test 266/266, vite build, click-through screenshots v2+classic, PAGE ERROR 0 (register/email writes blocked).
- Added "What would you like to discover?" topics step (8 topics, Skip) before Your communities, per owner mockup — saved into goals/interests. Checks re-run: tsc, server typecheck, tests, build, screenshots v2+classic PAGE ERROR 0.

## 2026-11-02 — Meet → Social tab (owner mockup: For You · Meetups · People · Feed)
- Bottom tab "Meet" renamed "Social" (still /meet; also lights up on /people and /feed). Header: Social + bell + create (+).
- For You (/meet): Let's get started, Start a Meetup / Find People, Popular to try (Coffee/Study/Workout/Hangout → Meetups filter), Ask a Question (→ question post), Happening soon (real upcoming meetups, only when any exist).
- Meetups (/meet/meetups): the former Meet page; empty state "No meetups yet — Create the first meetup on your campus!".
- People (/people): Find your people → My Classes (/timetable), My Groups (/orgs/mine), Explore People (/people/explore = the former people deck).
- Feed (/feed): Write a Post; when no posts, "Start a conversation" + Question / Tip / Discussion starters; otherwise the existing feed. Answers the open Feed-placement question.
- Links updated: Home Meetups card, Plans "find activities", chat empty state, Who's free sheet. Illustrations are icons (no made-up images).
- Checks: tsc, server typecheck, tests 266/266, build, screenshots classic+v2 of all 5 routes, PAGE ERROR 0.

## 2026-11-02 — Lighter onboarding text + Lumi header on Social
- Owner mockup: shorter onboarding. Goals = 5 one-line options (Discover opportunities / Plan my classes / Join communities / Campus life & wellness / Meet new people), no subtitles. "Here's what you get" = 4 icon+title cards (Classes & Schedule, Events & Opportunities, Communities, Meet & Connect). "Your university" + "Your status" as rows; year/major questions removed (editable later in Profile). Topics sub "Pick a few." Communities = compact checkbox list (Clubs, Fraternity/Sorority, Co-op Housing, Research Lab, Department/Major, Sports/Recreation, Other). Segmented progress bar; Skip under Continue (top right is the design toggle). Email step kept but one-line, optional.
- Social tab header now shows the app name (Lumi / lumi.) with bell, chats, profile and the + button, like other tabs.
- Checks: tsc, server typecheck, tests 266/266, build, click-through screenshots classic+v2, PAGE ERROR 0.

## 2026-11-02 — Collect data for 7 more schools (not open for signup) + next-term classes
- Owner: start with the 7 recommended schools; also the upcoming term, not just this one.
- New `server/data/schools-collect.csv` (moved from schools-paused.csv): Stanford, MIT, Harvard, Cornell, UPenn, Dartmouth, Notre Dame. Worker runs the same per-school jobs (club directory detect + import, events, classes) but does not register the school in the app's school list. Time zones added (East Coast / Indiana). Stanford events from events.stanford.edu (Localist API, checked 200 with live events).
- server/view.ts: opportunities now filtered per viewer like orgs (no-school items + my school + ones I saved), so other schools' events don't reach Berkeley students. Test: server/oppfilter.test.ts.
- Two terms of classes: Cornell (FA26 + SP27, roster published — CS 1110 SP27 read live), Harvard (2026 Fall + 2027 Spring, skipped if not posted), FOSE schools (current + next regular term in the site's list; Dartmouth = Winter). Stanford already gets the whole academic year (Autumn/Winter/Spring). Next-term rows get an id tag (_sp27) like Berkeley.
- MIT: fireroad only publishes the current term's times → Fall 2026 only (label fixed to follow the date, was hard-coded "fall"); Spring appears when MIT posts it. Not invented.
- Blocked here: from this container UPenn/Dartmouth/Notre Dame/Stanford/Harvard class sites fail TLS through the proxy, so those adapters could not be tried live from here; they run on Railway. Results show in /api/agent/status (courses:*, detect:*, orgs:*).
- Checks: tsc, server typecheck, tests 268/268, build; agent DRY lookup of a collect-school row OK.

## 2026-11-02 — Clubs, student government and their links for the 7 collect schools
- Owner: clubs too, student body orgs, and links (Instagram, Facebook, official site).
- Club directories per school (checked live here): Notre Dame = Engage nd.campuslabs.com (540), UPenn = Penn Clubs public JSON (511, new adapter), Dartmouth = CampusGroups dartmouthgroups.dartmouth.edu (255), MIT = engage.mit.edu (379), Stanford = cardinalengage, Cornell = cornell.campusgroups.com. Hosts set in schools-collect.csv. Harvard's directory (soco.college.harvard.edu) needs a Harvard login → no club list.
- Links (server/sources/orglinks.ts): Engage org detail socialMedia → Website/Instagram/Facebook/LinkedIn/X/YouTube (ND: 407 of 540 have at least one); Penn Clubs detail → website/instagram/facebook/linkedin/X/YouTube/TikTok; CampusGroups list gives each group's own website link (social icons on its club pages load by script, not available).
- Student government = type council. Rule widened (Undergraduate Assembly, Graduate Student Government, Student Assembly, Senate, class councils…); Dartmouth's "Council on Student Organizations" group type no longer turns every club into a council (was 189 → 7). Found in directories: ND Student Government/Senate + Graduate Student Government, Penn UA + GAPSA. MIT UA is not in engage.mit.edu → added by hand.
- Not in any directory → server/data/student-governments.csv, checked on the official sites: Harvard Undergraduate Association (thehua.org), Dartmouth Student Government (sg.dartmouth.edu + Instagram), MIT Undergraduate Association (ua.mit.edu + Instagram). Worker adds them weekly (studentgov:<id>).
- Tests: server/orglinks.test.ts. Checks: tsc, server typecheck, tests 274/274, build; FETCH_DRY runs for ND, UPenn, Dartmouth, MIT OK.

## 2026-11-02 — Bay Area first; load clubs, only sample-test timetables
- Owner: few schools, Bay Area first; clubs/groups (unstructured) load all now; timetables must not be bulk-loaded (storage cost) — prove the recipe with a few accurate samples so it can be pulled fast later.
- schools-collect.csv is now Bay Area: Stanford, SF State, SJSU (new row), UC Davis, UC Santa Cruz, Santa Clara (new), USF (new). East Coast six moved back to schools-paused.csv.
- Collect schools: classes are no longer stored. New `probe:<id>` job (weekly): reads a sample (Stanford CS/MATH/ECON; CourseLeaf 6 subjects), runs the rules + source re-check, records source, terms, sample rows, `stored: false`. Manual: `npm run agent -- probe:s_sfsu`.
- Fixes found by the tests: CampusGroups paging (UC Davis 265 → 531, SJSU 238 → 440 — pages are 8–10 rows there, we stepped 30; rows without links now read via cb_club_<id>); CourseLeaf titles with "&#8212;" (UC Davis); MIT course import failed on duplicate ids ("ON CONFLICT … second time") → dedupe before saving.
- Student governments hand-checked on official sites: ASSU, ASUCD, UCSC SUA, SCU ASG, ASUSF Senate (website only; no Instagram unless the official site links it).
- Already in the live DB before this change (worker ran the earlier list at ~12:20 UTC): Stanford classes 2,439 rows (Stanford had 744 before), MIT/Stanford clubs. Not deleted — live DB deletes need owner OK.
- Recipe table: docs/pm-agent/DATA_SOURCES.md.

## 2026-11-02 12:40 UTC — routine run
- Verified on live agent status: calendar:s_berkeley applied at 10:25 with the fixed code (182 events, 50 old removed — the 04:22 error is gone); external:internships applied 10:25 (453 postings, now with posting text for work-authorization labels); USAJobs 129 at 06:03.
- Focus this run = today's owner requests (onboarding, Social tab, Bay Area data); screens were checked in classic + v2 during those changes, PAGE ERROR 0.
- Open for owner: delete East Coast class rows already in the live DB (Cornell 9,518 · UPenn 7,492 · Harvard 2,764 · Dartmouth 1,346)? Home/Explore/Schedule to the latest mockup?
- 2026-11-02 사장님: 동부 수업 데이터 지우지 말 것 (그대로 둔다).

## 2026-11-02 — Bay Area clubs, one school at a time
- UC Santa Cruz: Get Involved list (getinvolved.ucsc.edu, FacetWP cards) → 109 orgs, 108 with Instagram; greek councils (Panhellenic, Inter-Greek Council) as council, chapters as greek.
- Santa Clara: CSI RSO directory (scu.edu/csi/organizations/directory) → 162 orgs in 10 categories (names only on that page).
- USF: myUSF undergraduate category pages (5) → 152 orgs, 138 with Instagram/website; ASUSF Senate is in the directory, so the hand-checked copy is skipped (dedupe by name).
- New readers in server/sources/orglinks.ts (facetwp / accordion / drupalcards), detected from orgs_host in schools-collect.csv; tests with real page excerpts in server/fixtures.
- SJSU classes: sjsu.edu not reachable from this container (TLS / 503) → next run, test on the server.
- Checks: tsc, server typecheck, tests 277/277, build; agent DRY runs for s_ucsc, s_scu, s_usf OK.
- SJSU events: events.sjsu.edu Localist API (checked: 211 items in 14 days; 9 kept after the student-event filter).

## 2026-11-02 — Closed schools collected to files, not the live DB (owner: Railway cost)
- `npm run agent -- collect:<id>` (run by the PM agent in its own container): club directory → server/data/collected/<id>.orgs.json (with links, members/followers empty), hand-checked student governments added only if the directory lacks them, class recipe sample → <id>.probe.json. No DB writes.
- Railway worker now does nothing for closed schools except jobs in the new `railway` column of schools-collect.csv (today: Stanford class probe — explorecourses fails TLS here). Records the result only.
- Opening a school: move its row to schools.csv, then `import-collected:<id>`.
- First collection: Stanford 733 · SFSU 290 · SJSU 440 · UC Davis 532 · UCSC 110 · Santa Clara 163 · USF 152 (≈2 MB of JSON in the repo).
- Note: between 12:20 and this change the worker already wrote some Bay Area/East Coast data to the live DB; left as is (owner: don't delete).

## 2026-11-02 — /preview: see collected schools without opening them (owner: option A)
- Server reads server/data/collected/<id>.orgs.json only when /api/preview(/:id) is called — nothing in the DB or the in-memory snapshot. Ids checked (s_[a-z0-9]+, only rows of schools-collect.csv).
- Pages /preview (school list: groups, with links, class recipe status) and /preview/:id (search, All/Clubs/Greek/Student government, description on tap, Directory/Instagram/Website links, class sample). Not linked from the app; the design toggle is hidden there.
- Checked locally with the real server (file store): list + UCSC + SFSU in v2 and classic, PAGE ERROR 0. Test: server/preview.test.ts.
- Next (owner): when a school looks right in preview → open it (option B: move row to schools.csv + import-collected).

## 2026-11-02 — Public links only (owner: "Directory needs a school login — not OK")
- Checked: CampusGroups club pages (Stanford Cardinal Engage, UC Davis AggieLife, SJSU SAMMY, MIT, Dartmouth) and Berkeley CalLink all redirect to a school login. Engage org pages (SF State) and the UCSC/SCU/USF list pages are public.
- packages/core/src/lib/orglinks.ts `publicLinks`: login-only links are hidden on the org page and in /preview (kept in data for import bookkeeping). Order Website → Instagram → Facebook.
- server/sources/sitesocial.ts: for clubs with their own website, read the site's first page and take its Instagram/Facebook profile links; a "Website" that is itself a Facebook/Instagram page is relabelled; accounts that appear on 3+ club sites of one school are treated as the school footer and dropped (SF State: sfstatecares, sanfranciscostate…). Part of `collect:<id>`.
- After: SF State 214/290 with a public link (IG 171, FB 48) · UC Davis 172/532 (IG 77, FB 49) · SJSU 107/440 · USF 138/152 · UCSC 109/110 · Santa Clara 1/163 · Stanford 0/733. Spot check of 12 random new links: all the club's own accounts (one is the national parent org's account).
- Stanford and Santa Clara have no public links in their directories → queued: small hand-checked batches per run via web search (DATA_SOURCES queue).

## 2026-11-02 — Course files for closed schools + data check
- collect:<id> now also saves all courses to server/data/collected/<id>.courses.json when the sample recipe passes (no DB): SF State 4,419, UC Davis 10,478 (catalog codes/titles; no times in that source). Catalog titles cleaned of "(Units: 3)" and a leading "—".
- /preview shows "Courses saved: N" with a search (`/api/preview/:id/courses?q=`).
- Berkeley live check (demo account, read-only): 1,707 groups (club 1,465 · lab 126 · greek 84 · co-op 20 · student gov 12), only 260 with a public link (CalLink pages need CalNet). 6,567 classes Fall 2026 + Spring 2027, 100 departments. Spot check CS 61A, DATA C8, ECON 1, MATH 51 against classes.berkeley.edu: times, instructor and room (Wheeler 150) match.
- Logos: Berkeley 1,181 real logos, 256 initials, 270 emoji — 202 of those are a generic 🎯 placeholder; 458 names end with 💙 as written in CalLink. Queued as a question.

## 2026-11-02 14:53 UTC — routine run (data queue + spot check)
- Queue item: public links for Stanford clubs. New hand-checked file server/data/org-links-stanford.csv (org_id,label,url,checked,source), merged by collect:<id>. First 7: ASSU, Solar Car, Taiko, Women in Business, Concert Network, Pre-Business Association, Stanford Daily — official sites from web search; Instagram/Facebook then read from those sites (Taiko, SWIB). Stanford Robotics Club skipped (two candidate sites, couldn't tell which is official).
- Spot check, 5 clubs: 2 OK; 1 dead link (UC Davis AACF wixsite → 404); 2 SJSU entries were school offices ("Alumni Engagement", "Leadership and Career Certificate Program"), not clubs. Fixes: Website links that return 404/410 (or Wix "404 Error" page) are dropped (UC Davis 7, SJSU 1); CampusGroups "College/Department/Program" groups skipped unless student government (SJSU 440 → 388, Associated Students kept). Facebook pages/<name>/<id> links keep the id.
- Spot check, 5 Berkeley classes (JOURN 219, RHETOR R1A, CDSS 198, FOLKLOR C262A, PHYSICS 153) against classes.berkeley.edu: time and room match 5/5.
- Checks: tsc, server typecheck, tests 283/283, build.

## 2026-11-02 16:04 UTC — routine run
- Queue: 5 more Stanford official sites (Marching Band lsjumb.stanford.edu, BASES, Ram's Head, Debate Society, Stanford Finance) → org-links-stanford.csv; Stanford now 12/733 with a public site. No official page found for Korean-American Student Association and Gospel Choir (skipped, not guessed).
- Spot check 5 clubs (UCSC KGD, SCU Sunrise, USF Society of Architecture Students, SFSU Journalism Club, UC Davis Imani Clinic): 4/4 found on their official public lists; UC Davis's list needs login, so only its links are checkable (none for this club).
- Spot check 5 courses (UC Davis ANS 099, GEO 200DN, NAS 110D; SFSU ITEC 711, ENGR 694): code and title match the official catalogs 5/5.

## 2026-11-02 17:03 UTC — routine run
- Queue (Stanford links): faster route — official Stanford pages that list student groups with links (engineering.stanford.edu, cs, me, msande, explore-energy). Exact-name match against our 733, then reviewed by hand: 20 added (SWE, Tau Beta Pi, TreeHacks, Student Space Initiative, Women in CS, Stanford in Government, Energy Club…). Rejected 5 matches that pointed at a center (nacc), a national body (asce.org), a general GSB page, a program page, and a duplicate. Stanford now 32/733 with a public site.
- Spot check clubs (5 new Stanford links): 2 confirmed on the page; 2 sites render only by script (Notion, WiCS) and 1 not reachable from the container — kept because the listing page is official.
- Spot check classes (Berkeley ARESEC 201, GWS 10, DEVP 230, UGBA 135, ECON C270A): time and room 5/5.

## 2026-11-02 17:35 UTC — routine run
- Queue (Stanford links): the official a cappella council site acappella.stanford.edu has a page per group with its site/Instagram/Facebook → 9 groups (Counterpoint, Everyday People, Fleet Street, Harmonics, Mixed Company, O-Tone, Raagapella, Talisman, Testimony). Stanford now 41/733 with a public link. Tried and not usable: GSB alumni club page (no club sites), arts.stanford.edu student groups (403), Wikipedia a cappella list (no group links).
- Spot check clubs: UCSC VSA, Leviathan; SCU Photography Club, Plant People Club; SFSU Mashouf Wellness — 5/5 on the official public lists.
- Spot check courses: UC Davis ATM 270D, FAP 430, ART 142D; SFSU PSY 697, PHIL 470 — code and title match 5/5.

## 2026-11-02 18:33 UTC — routine run
- Queue (Stanford links): checked community-center and religious-life pages (El Centro VSOs, BCSC BVSO, ORSL SAR, A3C) — names only, no per-group links. Official list route is used up at 41/733; remaining Stanford groups need one-by-one search. Next runs move to Berkeley.
- Spot check found a bug: USF/UCSC/SCU names showed HTML codes ("Hui O Hawai&#039;i", "Game Design &#038; Art", "Ballet Folkl&oacute;rico"). The school-list readers now decode numeric and named codes; test added; USF, UCSC and SCU files re-collected (0 codes left).
- Spot check otherwise: USF VSA, SFSU Lambda Theta Alpha, SCU Commuter Student Union on their official lists; USF Instagram links appear on the USF page; UCSC SUA is the hand-checked student government (not on the club list, expected). Courses UC Davis MGB 299, MDS 421C; SFSU PRSN 509, ACCT 845, SPED 675 — 5/5 match.

## 2026-11-02 19:33 UTC — routine run
- Queue moved to Berkeley (live): the official Engineering "teams and organizations" page and the EECS student organizations page list ~90 groups with their own sites. Exact-name match against our 1,707 Berkeley groups (ignoring "at Berkeley", trailing 💙): 52 matched, all reviewed; 19 not in our list under the same name (left alone). CalLink links on those pages skipped. Then each site's first page → 43 Instagram/Facebook links. Saved to server/data/org-links-berkeley.csv.
- New worker task links:<id> (open schools): merges org-links-<short>.csv into the live groups once a week, only groups that gain a link. One small patch per week — no Railway cost to speak of.
- Spot check clubs: 5 new Berkeley sites (Bike Builders, Space Enterprise, Formula Electric, Codebase, ASCE) — name on the page 5/5.
- Spot check classes: LS 198, MBN 210, LANPRO 380, JEWISH 175E, STS C200 — first pass failed because classes.berkeley.edu took ~35 s per page (my 20 s timeout); re-checked with 90 s: time and room 5/5. Not a data problem.

## 2026-11-02 20:33 UTC — routine run
- Live check: links:s_berkeley applied at 19:46 — 52 Berkeley groups gained public links in the app.
- Queue (Berkeley links): Cal RecWell sport club pages (recwell.berkeley.edu/essential_grid/<team>) are official public team pages; each links the team's CalLink slug, which equals our org id → 22 club sports matched exactly (Boxing, Fencing, Ice Hockey, Triathlon, Pie Queens, Club Volleyball…), with their own sites/Facebook where listed. Chemistry page → AIChE; Haas page → HBSA. Haas's 16 sponsored orgs and the Black RSO list (cejce) have names only. recsports.berkeley.edu is not allowed in this session's network (old host; recwell.berkeley.edu works).
- Worker: links:<id> now re-merges as soon as the CSV row count changes (not only weekly).
- Spot check clubs: Badminton (RecWell), Space Enterprise, Combat Robotics, Launchpad, AIChE — 5/5 OK. Courses: UC Davis PUL 475, ECS 289B, MGP 206; SFSU MATH 686, MUS 376 — 5/5.

## 2026-11-02 21:33 UTC — routine run
- Live: links:s_berkeley applied 20:40 — club sports + AIChE/HBSA (24 groups).
- Queue (Berkeley links): many Berkeley groups host their site at <CalLink id>.studentorg.berkeley.edu. Checked all 1,437 groups without a public link: kept a site only when it answers 200 and its page names the club (title/body words) → 48 sites (Berkeley Scientific Journal, Blue & Gold Yearbook, Codeology, DeCadence, Traders, ULAB, UC Rally Committee…). Their pages gave 53 Instagram/Facebook links.
- Spot check caught a personal Facebook profile on a club site (South Indian Society → a person) and a junk link (facebook.com/pg). New rule in sitesocial.ts `relatedHandle`: a social account must share a word, the acronym or the site's sub-name with the club; applied to the CSV — 7 dropped, 3 of those restored after hand review (PiE, ML@B, Underwater Robotics). Test added.
- Classes: GWS 210, MBN 98 OK; ARCH 207C, PHDBA 239FA, EUST 201 looked off only because the page writes "01:00 pm" with a leading zero — data correct (checked the page text).

## 2026-11-02 22:33 UTC — routine run
- Live: links:s_berkeley applied 21:48 — 48 more Berkeley groups gained public links.
- Queue (Berkeley links): same check on Berkeley's other student web hosting, ocf.berkeley.edu/~<CalLink id>: 14 answered, 6 were empty "Index of" folders (skipped) → 8 real sites (CURIE, Upsilon Pi Epsilon, WYSE, Mahjong Club, ASUC SUPERB, BSHA, CALICO, Poker at Berkeley) + 3 social links (UPE, SUPERB). Public Health student groups page → Public Health Advocate, Suitcase Clinic. CDSS student page lists EECS groups already covered.
- Spot check clubs: UCSC Pagkakaisa Dance Troupe, Slug Fund; SFSU AS Richard Oakes Multicultural Center, Basic Needs Center — on the official lists 4/4; Stanford GSB Coffee Club has no public link yet (expected, Stanford queue).
- Spot check classes blocked: classes.berkeley.edu now answers 403 to this container (after many reads today). Not a data problem; the Railway worker reads it from its own address. Will retry next run with fewer requests.

## 2026-11-02 23:33 UTC — routine run
- Re-collected the 7 Bay Area files with the new club-relevance rule for social links (personal profiles dropped): SF State 212/290 with a public link (5 dead sites removed), UC Davis 165/532, SJSU 84/392, USF 138/152, Stanford 41/733, UCSC 109/110, Santa Clara (names only).
- Spot check classes via web fetch (classes.berkeley.edu still 403 to this container): ANTHRO 127A, MONGOLN C117, MELC 157, CHEM 3A, MUSIC 143 — day, time, room and instructor match 5/5.

## 2026-11-02 — No emoji for clubs (owner: "Do not put emoji")
- packages/core/src/lib/orglinks.ts withoutEmoji/stripEmoji, applied in server/view.ts (every org sent to the app) and in /preview: emoji at the end of names removed (458 Berkeley names had 💙), emoji logos replaced by initials (202 🎯 + Greek council emblems). Real logo images and Greek letters (ΑΚΨ) stay. Event/listing host names lose emoji too. Stored data unchanged.
- Clubs & Groups list: removed the ✨ before recommendation reasons.
- Checked on a local server: Explore › Clubs in v2 and classic shows no emoji, PAGE ERROR 0. Tests 287/287 (server/noemoji.test.ts).

## 2026-11-03 — UCLA, East Coast, recruiting status, more famous schools
- Owner: famous schools only (SJSU / SF State / Santa Clara / USF dropped to paused, files removed), East Coast back, recruiting status matters, add Chicago / Columbia / NYU and similar.
- Collected to files (not in the Railway DB): UCLA 1,451 (1,101 with a public link) · UPenn 514 · Cornell 1,483 + 9,518 classes with times (Fall 2026 + Spring 2027) · MIT 427 + 1,712 classes with times · Dartmouth 406 · Notre Dame 540 · re-collected Stanford 733, UC Davis 532.
- Recruiting status: Penn 283 open anytime / 95 recruit in a set term / 135 not taking members / 1 live deadline (Student-Athlete Investment Club, Dec 20 2026). CampusGroups schools: open vs. "Membership is closed" (Cornell 1,270/198, Stanford 701/32, UC Davis 513/18, MIT 416/10, Dartmouth 385/20). UCLA, Notre Dame (Engage), UCSC: the directory has no recruiting field, shown as nothing.
- Spot check: UCLA 5 clubs vs. sa.ucla.edu RCO, Penn 5 clubs incl. the deadline vs. pennclubs.com API, Cornell 5 classes (day/time/title) vs. classes.cornell.edu API: all match.
- Blocked: engage.college.harvard.edu is refused by this session's network policy (agent proxy connect_rejected), so Harvard has only the hand-checked student government. Not worked around.
- Added to collect (owner 2026-11-03): UChicago (Blueprint, Engage, 446), NYU (NYU Engage, 951), Columbia (LionHub, CampusGroups), Yale (Yale Connect, CampusGroups; class probe on Railway since courses.yale.edu gives an empty answer from the container).
- Collected 2026-11-03: UChicago 446 (404 with a public link) · NYU 951 (630) · Columbia 357 (18; LionHub draws socials by script) · Yale 1,377 (397). Recruiting: Columbia 338 open / 19 closed, Yale 1,220 open / 143 closed; UChicago and NYU (Engage) have no recruiting field.
- Next: Yale class probe on Railway (fose), Columbia/NYU/UChicago class sources, public links for Columbia and Stanford clubs, Harvard directory (blocked here).

## 2026-11-03 (2) — owner: never drop data, collect many top schools
- Restored SJSU, SF State, Santa Clara, USF files and rows from git (commit f385006). Owner rule now: never remove collected data.
- Found the club platform for 36 paused top schools: 13 Engage, 14 CampusGroups (all with public club lists), WashU on Presence; moved those 28 to collect, collection running (USC first).
- New readers: Caltech (public approved-club list, 124 names; descriptions are behind Caltech login) + ASCIT; Brown (Student Activities list, 412 groups, Instagram/Facebook from each public club page, 331 with a link; 7,020 catalog courses).
- Spot check: Brown 2 club pages vs. collected links, match.
- Blocked: studentorg.ucsd.edu (TLS failure from the container, not bypassed); Princeton club list needs login (skipped by rule).

## 2026-11-03 01:00 run
- Routine prompt updated to the owner's 11-03 rules (never remove collected data; keep widening top schools to files without asking).
- Fixed: CampusGroups club pages on school hosts (lionhub.columbia.edu, yaleconnect.yale.edu, catsoncampus.northwestern.edu, …) were not recognized as login-only — now any `/student_community`, `/feeds`, `club_id=` link is hidden (test added). Discord invites in a club's website field are labeled Discord (25 links in 7 school files relabeled, test added).
- Spot check: NYU 2 + UChicago 2 clubs vs. Engage API (socials and website match), Columbia 1 (its club page needs login, which led to the fix above); MIT 5 classes vs. FireRoad (title, days, times match). Gap: only lectures are kept, labs/recitations are dropped (6.S950 Thu lab, MAD.701 Fri lab) — queued. student.mit.edu answered 503 to the web fetch.
- Screens: /community, /preview/s_columbia — no PAGE ERROR. Live feed shows demo posts with emoji → QUESTIONS.md.
- Collection of the 28 new schools still running (USC: 1,964 groups, reading club websites).
- 11-03: container restart stopped the 28-school run after UC Riverside. Saved: USC 1,964, UC Irvine 733 (+5,415 catalog courses), UC Santa Barbara 1,040 (0 links), UC Riverside 664 (507 with a link). Restarted for the 24 schools without a file (script skips schools that already have one).

## 2026-11-03 — grad courses, jobs, parallel agents (owner: grad students, US-wide jobs and internships, entry-level jobs for undergrads)
- Graduate courses were already in the catalog files (UC Davis 4,877, Cornell 3,556, UCI 2,600, Brown 2,205, SF State 1,228 by course number).
- Collection now runs 3 schools at a time (different sites). Two research agents mapped public class-schedule sources for 47 schools (DATA_SOURCES "Class schedules"); one agent verified 147 employer job boards.
- USF classes: banner9 → 2,429 sections with times. Georgia Tech switched to banner9.
- Jobs: new reader (server/sources/jobboards.ts, tests) → 967 US postings from 146 boards: internships 626, new grad/entry level 297, PhD 109, master's 55, postdoc 13. Entry level also catches "Engineer I", junior, APM, analyst/rotational programs; an intern's "2027 start" is not new grad (fixed after sample review). Spot check: 5 random postings open on the employer's page with the same title. Visible at /preview/jobs.
- Gap: big banks, consulting, pharma, retail mostly use Workday (not yet read) — queued.

## 2026-11-03 02:33 run
- Container restarts keep killing long runs. Collect now saves the courses the class check already fetched (one full fetch per school instead of two).
- New: PeopleSoft HCX class search reader (Duke DukeHub, BU; guest cookie, re-opens the guest session if it lapses). Duke: 6,291 sections with times (Fall 2026 + Spring 2027, graduate included). BU: only 452 Fall lectures at first — BU sends most regular classes as section type "IND" (CASEN 107 The Voice of Poetry); rule changed to drop only discussion/lab/recitation/tutorial/quiz; re-collect running.
- Fixed: HTML codes in Banner course titles ("Black Activists &amp; Visionaries") — reader decodes; 862 titles fixed in USF/Georgia Tech files.
- Spot check: Georgia Tech 5 sections re-fetched live (AE 6115, EAS 4803, MATH 1551, PSYC 4031, VIP 6602 — all match, 2 graduate). Clubs: 5 CampusGroups clubs' websites opened — 3 real student groups (Yale Arnold Air Society links the national site), 2 were school offices (Tufts "Orientation & Student Experience", JHU "Pava Center").
- Fixed: school offices listed in club directories are now type `department` (kept in files, hidden from club lists): clear non-student categories ("non student org", "Staff-Only", "University Committee") always; looser ones ("Department", "Administrative") only when the name is office-like and not club-like. 736 marked across 28 schools; tests cover real false positives (UCSB Amateur Radio Club, Lehigh Amaranth Literary Magazine, WashU Bears Bikes, Yale Black Seminarians stay clubs).
- Deployed 46dcbe2 (all checks passed).
