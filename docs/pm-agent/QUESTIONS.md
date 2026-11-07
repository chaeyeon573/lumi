# PM agent 질문함

> 2026-11-02 사장님: **디자인 비교 알약(Classic ⇄ New)은 그대로 둔다**(10/30 ‘알약 없애기’ 취소) — 되살림. 그 밖의 대기 변경은 배포 허락(1회).

사장님께 결정을 받아야 하는 것. 최신이 위. 답은 각 항목 아래에 `**답:** …` 으로 적어 주시면 다음 실행이 따른다.

## 2026-11-06 — AI 기능을 더 넣는다면 무엇부터? (사장님 질문에 답한 것)
**지금 있는 것:** Ask Lumi(질문 답), 가입 때 프로필 초안, 대화 시작 문장 (OpenAI).
**제안 (순서대로):**
1. 시간표 빈 시간 × 그 시간 행사·동아리 모임 추천 — 맞추기는 규칙으로, AI 는 이유 한 줄·순서만 (비용 적음). 데이터: 수업 시간 + 행사 파일.
2. 말로 시간표 짜기 ("월수 오전 비우고 CS 입문 넣어줘" → 실제 분반 조합). 실험·토론 분반(`sections`)이 있으면 더 좋다.
3. 동아리 찾기 질문 — 설명·링크·모집 상태를 근거로, 출처 링크 필수, 없으면 "없음".
4. 일자리 맞춤 요약 — 전공·학년에 맞는 공고 + 왜 맞는지 한 줄 + 마감.
**넣지 않을 것:** AI 가 사람 매칭을 판단하는 것(상대 정보가 AI 로 감), AI 가 마감일을 추측해 채우는 것.
**정할 것:** 할지, 하면 몇 번부터. AI 호출은 요청마다 비용. 정해 주시면 Claude 는 서버 API(예: 빈 시간 × 행사), Codex 는 화면.
**답:**

## 2026-11-07 — Rutgers 는 Newark 캠퍼스만 공개 목록이 있습니다. 파일로 둘까요?
**상황:** rutgers.campusgroups.com 의 공개 단체 231개 중 229개가 Rutgers–Newark 단체(raiderlink.newark)입니다. 본 캠퍼스(New Brunswick)는 getinvolved.rutgers.edu 가 안내 페이지로만 넘어가 공개 목록이 없습니다. 그래서 학교 이름을 "Rutgers University–Newark"(s_rutgersnewark)로 정확히 적어 파일로 넣었습니다(단체 231, 행사 59).
**제안:** A) Newark 캠퍼스로 그대로 둔다(추천 — 공개·공식 자료이고 이름이 정확함) B) 본 캠퍼스가 아니니 목록에서 뺀다(파일은 지우지 않고 학교 목록 줄만 뺀다).
**답:**

## 2026-11-05 — '명문대' 경계에 있는 학교도 파일로 넣을까요?
**상황:** 동아리 목록이 공개라 바로 넣을 수 있는 학교 중, 상위권 기준에 걸칠까 말까 한 곳들입니다: Arizona(공개 행사 피드 있음), Pepperdine, SUNY Buffalo(Engage 675개), UCF, Iowa. 11-07 추가 확인: Utah(Engage 503개), Baylor(Engage 380개)도 공개 목록이 열립니다. Penn State·NC State 는 상위 주립이라 이미 넣었습니다(11-05).
**제안:** A) 다 넣는다(파일만, 비용 없음). B) 이번에는 넣지 않고 기준 안 학교만 계속.
**추천:** A — 파일만 늘고 앱에 올릴 학교는 나중에 정하시니 손해가 없습니다.
**답:**

## 2026-11-02 · Explore 의 Co-ops 칸
**무엇:** 시안에 Events·Clubs·Greek·Co-ops 가 있는데, 지금 동아리 명단에 Co-op(학생 협동조합 하우스, 예: Berkeley Student Cooperative) 분류가 없다. **제안:** A) BSC 공식 하우스 목록을 확인해 Co-op 조직으로 넣고 칸 만들기 B) 칸 없이 두기.

## 2026-11-02 · 홈·탐색 개편 뒤 남은 것 3가지
**무엇:** 사장님 시안대로 Home·People·Meet·Explore·Profile 로 바꿔 배포했다(6d9c8fb).
1) **Feed(학생 글)** 가 하단 탭에서 빠졌다(시안에 없음). 지금은 /community 주소로만 들어간다. → A) Meet 안 탭으로 B) Explore 에 한 줄 C) 그대로. **→ 답 (2026-11-02): Social 탭 안 Feed 칸 (/feed).**
2) **기본 디자인** — 시안은 밝은 파스텔, 지금 기본은 어두운 New(10/30 결정). 밝은 Classic 도 시안에 맞게 해 두었다. → A) 기본을 밝게 B) 그대로.
3) **이름** — 헤더·시작 화면은 AroundU. 개인정보처리방침·이용약관·공유 링크 화면엔 아직 “Lumi”. 법 문서라 확인 필요. → A) 전부 AroundU B) 그대로.

## 2026-11-02 · 문과·사회과학 인턴이 아직 적다 — 공식 출처를 더 열려면
**지금:** 회사 채용 페이지(Greenhouse·Lever 등)는 대부분 기술 회사라, 분야를 나눠도 언론 16·정책 4·비영리 1 정도다.
**제안:** A) **USAJobs**(연방정부 인턴·Pathways, 공식 API) — 무료 API 키가 필요하다(developer.usajobs.gov 에서 사장님 이메일로 신청 → Railway 에 `USAJOBS_API_KEY`). 정책·법·보건 인턴이 많이 생긴다. B) 버클리 공식 프로그램을 손으로 확인해 넣기 — UCDC(워싱턴 학기 인턴), UC Center Sacramento, Public Service Center 등 마감이 공개된 것만. C) 둘 다(추천).

## 2026-10-31 · 사진 올리기를 만들었는데 — 개인정보처리방침 문장 하나를 바꿔야 배포할 수 있어요
**무엇:** 사장님 답(B, 진짜 사진 올리기)대로 만들었다(배포 대기). 글쓰기 ＋ → 휴대폰 사진첩 → 올리기 전에 긴 변 1600px로 줄이고 위치정보(EXIF) 제거 → 서버 Postgres 의 사진 표(스냅샷과 따로)에 저장. 한 장 1.2MB, 하루 40장, JPEG·PNG·WebP 만(파일 내용으로 확인), 계정 삭제 때 같이 지움. 로컬 서버로 끝까지 확인(올리기·보이기·가짜 파일 거절).
**걸리는 것:** 개인정보처리방침(src/pages/legal/LegalPages.tsx) “What we don't collect” 에 “Lumi doesn't read your device's … photos, camera …” 가 있다 — 사진 올리기가 배포되면 사실과 다르다. 법 문서라 제가 혼자 고치지 않았다.
**제안 문구:** ① “What you create and do” 에 “Photos you choose to attach to a post. We shrink them and remove location data (EXIF) on your device before upload.” 추가 ② “What we don't collect” 의 “photos, camera” 를 “your photo library (only the photos you pick are uploaded), camera” 로 ③ 계정 삭제 문단에 “and photos you uploaded” 추가 ④ Last updated 날짜.
**선택:** A) 이 문구로 고치고 사진 올리기와 같이 배포(추천) B) 문구를 사장님이 직접 C) 사진 올리기는 배포에서 빼고 나중에.
**답(11/2):** A. → 방침 4곳 고침(Last updated November 2, 2026) + 배포. 단 iPhone 앱은 사진·카메라 권한 문구가 없어 사진 고르기에서 앱이 꺼질 수 있으므로, 앱을 문구와 함께 다시 빌드하기 전까지 사진 칸은 웹에서만.

## 2026-10-25 · 내일 수강신청 시작인데 Discover 에는 안 보인다
**무엇이 어색한가:** 내일(10/26 월) 버클리 Spring 2027 **Phase 1 수강신청 시작**(D-1)이다. 학사 일정은 Me 화면 ‘Key dates’ 와 /academic-calendar 에만 있고, 학생이 가장 자주 여는 Discover·People 에는 안 보인다. 수강신청은 Lumi 의 좌석 알림(/seats)·같은 수업 친구와 바로 이어지는 순간이다.
**제안:** A) 중요한 학사 일정이 2일 안에 있으면 Discover 맨 위 줄 아래에 한 줄 띠(“Phase 1 enrollment opens tomorrow · Watch seats →”, 좌석 알림으로) — 화면 하나, 작은 변경. B) 알림(푸시·알림함)으로만. C) 그대로(Me 에만). — 추천: A, 출시 직후 학생들이 앱을 열 이유가 되는 날이다.

## 2026-10-23 · 첫 화면 학교 고르기에 UC Merced 가 그대로
**무엇이 어색한가:** 처음 온 학생의 1단계 “Which school do you go to?” 에 **UC Berkeley 와 UC Merced** 두 개가 나온다. 출시는 “버클리만, 30명” 이고 PRODUCT_TASTE 에도 “지금은 버클리만” 이라 적혀 있다. Merced 는 그 결정 전에 열어 둔 학교(데이터·예시 계정 있음).
**제안:** A) 출시 동안 시작 화면에서 Merced 를 숨긴다(이미 Merced 로 가입한 사람·데이터는 그대로, 링크 `?school=` 로만 들어갈 수 있게 — 화면 작은 변경). B) 그대로 둔다. — 추천: A, 버클리 친구 30명에게 링크를 보낼 때 학교 고르기 단계 자체가 하나 줄어든다(버클리 하나면 자동 선택).
**답(10/30):** 미국 주요 대학을 “목록에만” 넣기. → 시작 화면 “Another school?” 검색 + 45개 학교, 고르면 이메일 대기 명단(의견 통로로 사장님께). Merced 는 그대로(이번 답에 없음).

## 2026-10-23 · 예시 ‘할인’ 이 실제 가게 이름을 쓴다 (Café Milano)
**무엇이 어색한가:** 라이브 예시 활동 “Buy-one-get-one lattes with student ID” 의 장소가 **Café Milano**(텔레그래프의 실제 카페)다. SAMPLE 표시는 있지만, 지도·검색·Discover 에서 “오늘 학생증 보여 주면 1+1” 로 보여서 학생이 실제 가게에 가서 요구할 수 있다. 지어낸 할인을 실제 가게 이름에 붙인 것 — “데이터를 지어내지 않는다”에 걸린다. (예시 모임 장소로 Caffe Strada·Blue Bottle 을 쓰는 건 장소일 뿐이라 문제 없음.)
**제안:** A) 예시 할인 활동을 아예 없앤다(시드에서 빼고, 서버가 예시 날짜를 옮길 때 이 한 건을 숨김 — 코드 작은 변경, 배포 후 라이브에서 사라짐). B) 장소를 “A café on Telegraph” 처럼 이름 없는 곳으로 바꾸고 날짜 옮길 때 장소도 시드 것으로 맞춤. C) 그대로. — 추천: A, 할인은 진짜 가게와 약속이 생기기 전까지 예시로도 안 보이는 게 안전하다.
**같이:** 라이브 DB 에 실제 회사·기관 이름을 단 시드 공고 2개(“Stripe summer internship”, “California Civic Data Challenge”, 둘 다 example.com 링크, 마감 지나 화면엔 안 보임)가 남아 있다 — 관리 화면에서 지워 주시면 깔끔.
**답(10/30):** A — 예시 할인 없애기. → 시드에서 a_deal·po8 삭제 + 서버 시작 때 라이브 DB 에서도 지움(migrateDemo, 테스트).

## 2026-10-21 · 개인정보처리방침에 아직 Ask Lumi 가 있음
**무엇이 어색한가:** Ask Lumi 화면은 뺐는데(9b9b41a, 배포 대기) 개인정보처리방침(/privacy) 4곳이 아직 Ask Lumi 를 설명한다 — “Questions you ask Ask Lumi…”, “OpenAI — powers Ask Lumi…”, “Ask Lumi logs… are kept”, “Ask Lumi and other AI suggestions can make mistakes”. 서버의 질문 받는 주소(`opportunities.ask`)도 아직 살아 있어 화면 없이도 부를 수는 있다. 지금까지 쌓인 Ask Lumi 기록도 서버에 남아 있다.
**제안:** A) 서버의 Ask 주소를 닫고, 방침에서 Ask Lumi 설명을 빼되 “예전에 쓴 Ask Lumi 기록은 계정 삭제 때 같이 지운다” 한 줄만 남기고 ‘Last updated’ 날짜 갱신(코드 작은 변경, 문구는 사장님 확인). B) 방침은 그대로(기능이 다시 올 수 있으니). — 추천: A, 없는 기능을 방침이 설명하면 학생이 헷갈리고, 법 문서는 실제와 같아야 한다. 법 문서라 제가 혼자 고치지 않았다.

## 2026-10-20 · ⚠️ (사장님 손이 필요한 일) 제가 라이브 데모 계정 시간표에 실수로 수업을 넣었습니다
**무슨 일:** 18:18 UTC 실행에서 "수업 추가 후 알림 문구"를 확인하려고 테스트 브라우저로 수업 추가 흐름을 돌렸습니다. 저장 요청을 가로채는 필터가 틀린 주소(/api/users)를 보고 있어서 실제 저장 요청(/api/rpc/users/update)이 라이브로 나갔습니다. 그 결과 **공용 버클리 데모 계정(u_me) 시간표에 CS 61A 강의 3칸(월·수·금 12:00–12:59) + DIS 118(목 12:30–13:59) 4칸이 더해졌습니다** (11칸 → 15칸). 다른 데이터는 건드리지 않았습니다.
**재발 방지:** 테스트 스크립트 전부가 이제 /api/rpc/ 로 가는 요청을 모두 막습니다(시험으로 확인).
**되돌리기:** 되돌리는 것도 라이브 쓰기라 제가 임의로 하지 않았습니다. A) 사장님이 데모 계정으로 들어가 시간표에서 CS 61A 를 눌러 삭제(4칸). B) 제가 원래 11칸으로 한 번만 되돌리도록 허락. C) 그대로 둠(데모 시간표에 CS 61A 가 하나 더 있는 정도). — 추천: B (정확히 원래대로).
**답(10/30):** B — 제가 복구. → 10/30 데모 로그인 후 users.update 한 번: CS 61A 4줄(id 지정)만 빼서 15→11줄. ARCH 4줄(다른 방문자가 넣음)은 그대로.

## 2026-10-19 · 약속 잡기가 두 개 — "Ask friends with a link" 와 "Plan Together"
**무엇이 어색한가:** + 버튼 메뉴가 7개(즉석 만남·활동 만들기·링크로 묻기·Plan Together·Study Crew·팀원 모집·게시물)인데, "링크로 친구에게 묻기"(/plans/new)와 "같이 시간 정하기 (Plan Together)"(/together/new)가 거의 같은 일을 한다. 처음 쓰는 30명은 어느 걸 눌러야 할지 헷갈린다. 게다가 Plan Together 는 "친구를 고르면 공강이 겹치는 시간을 추천해 줄게요"(시간표를 모아 시간 추천) — PRODUCT_TASTE 의 "원하지 않은 것"(시간표를 모아 시간을 골라주는 기능, 계획은 링크로 간단히)과 부딪힌다. Plans 화면·스터디 그룹("Vote on a time with them")에서도 이쪽으로 간다.
**제안:** A) 출시용으로 Plan Together 입구를 감추고 "링크로 묻기" 하나로 (스터디 그룹 버튼도 링크로 묻기로). B) 둘 다 두되 Plan Together 의 시간표 추천만 끈다. C) 그대로. — 추천: A (Discover 첫 화면의 "Ask friends with one link" 와 같은 하나의 길).
**진행(10/30):** 사장님이 두 화면(/plans/new, /together/new)을 직접 보고 정하기로.

## 2026-10-18 · Teams — 다른 지역 대면 해커톤
**무엇이 어색한가:** Discover › Teams 의 해커톤 3칸(마감 가까운 순)에 버클리 학생이 갈 수 없는 대면 해커톤이 섞인다 — 오늘 기준 “ZotHacks 2026 · UC Irvine – Student Center”, “InnovateLA x Dual-Use Hackathon · USC” (둘 다 D-Day). Teams 는 ‘같이 나갈 사람 찾기’ 자리라, 6시간 거리 대면 행사는 팀을 꾸릴 일이 거의 없다.
**추가(10/22):** 오늘 다시 셈 — 팀원 모집 칸이 있는 해커톤 75개 중 온라인이 아니고 베이 지역도 아닌 것은 2개뿐이고, Teams 맨 위 3칸은 모두 온라인이다. 지금은 급하지 않다 — 대면 해커톤이 몰리는 봄에 다시 보면 된다.
**제안:** A) Teams 3칸은 온라인 + 베이 지역 대면만, 나머지는 “모두 보기”(Campus › 해커톤)에 그대로. B) 지역 표시만 더 눈에 띄게(“In person · Irvine”). C) 그대로.  — 추천: A.

## 2026-10-18 · (사장님 손이 필요한 일) 데모 계정에 남은 테스트 신고
**무엇이 어색한가:** 공용 버클리 데모 계정(Alex)의 설정 › Account & safety › My reports 에 “Post · Other — TEST report filed by Claude to verify the alert e-mail; please dismiss · reviewed” 가 보인다. 신고 알림 메일을 시험하려고 넣은 것으로 보이는데, 데모를 둘러보는 모든 사람이 이 줄을 본다.
**제안:** 관리자 화면(또는 DB)에서 이 신고 한 건을 지워 주세요. PM agent 는 라이브 DB·관리자 API 를 건드리지 않는 규칙이라 직접 못 지운다.

## 2026-10-17 · ‘Design: Classic ⇄ New’ 알약이 화면 내용을 가림
**무엇이 어색한가:** 하단 탭이 없는 화면(채팅방·DM 목록·상세 화면 등)에서 비교용 알약이 상단 바 바로 아래 오른쪽(top 62px)에 떠서, 그 자리의 내용을 가린다 — 채팅방 첫 날짜 줄(“Wed, Sep 23 1:4…”), DM 검색창 오른쪽 등. 가입 단계에서는 제목을 가려서 어제 상단 바 안으로 옮겼다(52회차). 실제 학생도 라이브에서 이 알약을 본다.
**추가(10/17 14:20):** Rides 화면에선 상단 ‘Find a ride | My rides’ 전환의 **My rides** 버튼을 통째로 덮는다 — 누를 수가 없다.
**제안:** A) 둘 중 하나로 정하고 알약을 없애기(가장 깔끔). B) 알약은 두되 설정 화면 한 줄(‘디자인: Classic / New’)로만 옮기기. C) 위치만 화면마다 피해 가며 조정. D) 그대로.  — 추천: 비교가 끝났으면 A, 아직이면 B.
**답(10/30):** New 로 정하고 알약 없애기. → 알약 삭제, 저장 키 lumi.design.3 (예전에 classic 고른 브라우저도 v2). ?design=classic 은 내부용으로만.

## 2026-10-16 · Feed 글쓰기 — 사진 칸이 내 사진이 아니라 샘플 사진을 붙인다
**무엇이 어색한가:** 라이브 웹의 “Write a post”에서 사진 칸 + 를 누르면 사진첩이 열리는 게 아니라 **미리 정해 둔 샘플 사진**(카페·도서관·노을…)이 붙는다(CreatePostPage.tsx SAMPLE_PHOTOS). 안내도 “The demo uses sample photos or emoji cards.” 실제 학생이 글을 올리면 자기 사진이 아닌 남의 사진이 자기 글에 붙어 나간다 — ‘지어낸 데이터 금지’ 기준과도 어긋난다.
**제안:** A) 진짜 업로드가 생길 때까지 웹(실제 서버)에서는 사진 칸을 숨기고 글만(작은 변경, 1파일). B) 진짜 사진 올리기 만들기(저장소·용량·신고 처리 — 큰 작업). C) 그대로.  — 추천: A 먼저, B 는 따로.
**답(10/30):** B — 진짜 사진 올리기 만들기 (큰 작업, 따로 계획).

## 2026-10-16 · People — 모르는 사람에게 먼저 말 거는 부담 (1번 답에 대한 제안)
**무엇이 어색한가:** 카드의 주인공을 “지금 같이 할 것”으로 바꾸면, 처음 보는 사람에게 “같이 하자”고 먼저 말해야 한다. 거절당할까 봐, 이상하게 보일까 봐 안 누르게 된다.
**제안 (같이 써도 된다):**
1) **초대가 아니라 ‘끼기’** — 카드에는 그 사람이 *이미 열어 둔* 계획만(“6시 Telegraph 커피, 2명 더 OK”). 버튼은 “같이 가요” 대신 “나도 갈래”. 내가 부탁하는 게 아니라 이미 열린 자리에 들어가는 것.
2) **서로 눌렀을 때만 열림** — “관심 있어요”는 상대에게 바로 안 보인다. 둘 다 누르면 그때 대화가 열린다 → 거절당하는 순간이 없다.
3) **공통점 한 줄** — “둘 다 CS 186”, “같은 동아리”, “친구 Jordan 도 감” 처럼 말을 꺼낼 이유를 카드에 보여 준다.
4) **1:1 보다 여럿** — 3명 이상 모임·공공장소(학생식당·도서관)를 먼저 보여 줘 부담을 낮춘다.
5) **첫 마디 버튼** — “저도 그 수업 들어요!” 같은 한 번 누르는 인사말.
**추천:** 1 + 3 먼저(화면·문구만, 작다) → 반응 보고 2(서버 작업). 사진 줄이기·나이 빼기·Dating 선택지는 이 방향과 같이 정하면 된다.
**답:** 1 + 3 (10/16). → 카드에 그 사람이 열어 둔 계획(제목·시각·장소·남은 자리)과 “나도 갈래” 버튼, 그 아래 공통점 한 줄(같은 수업·겹치는 공강·같은 생활권). 계획이 있는 사람이 먼저 나온다. 2(서로 눌렀을 때만)는 반응 보고.

## 2026-10-15 15:40 UTC · Teams/해커톤 — 고등학생 대회가 섞임
**무엇이 어색한가:** Devpost 자동 가져오기로 **고등학생 전용** 해커톤이 또 들어왔다: “Girls Who Code HHS Hackathon 2026”(참가 자격 “Ages 14 to 18 only… enrolled in high school”), 지난번 “WarriorHacks 2.0”(Westwood High School). 제목·주최명에 ‘high school’이 없으면 지금 거름망을 통과한다. Devpost 목록 API 에는 나이·자격 칸이 없다(확인함).
**제안:** A) 가져올 때 해커톤 페이지를 하나씩 열어 “Who can participate”에 18세 이하·high school 이 있으면 뺀다(12시간마다 ~100쪽, 서버 작업). B) 지금처럼 두고 보일 때마다 손으로 거른다. C) Devpost 가져오기를 끄고 직접 확인한 목록만.  — 추천: A, 학부생에게 고등학생 대회가 보이는 건 기준(대상 안 맞는 공고 금지)에 어긋난다.
**답:** A (10/16). → 30ade64: 새 해커톤마다 페이지를 한 번 열어 “Ages 14 to 18 only”·고등학생 전용이면 뺀다. 페이지가 막히면(Cloudflare) 그때는 지금처럼 두고 다음에 다시 본다.

## 2026-10-14 06:40 UTC · Feed·채팅 — 예시 글이 3주째 그대로
**무엇이 어색한가:** Feed 글이 전부 “Sep 23 / Sep 22”(3주 전)인데 내용은 “Hosting a coffee meetup here **tonight**”, “BOGO lattes **today**”, “Fall show **in 2 days**!”, “Open seminar **tomorrow** 4pm”이다. DM 목록도 마지막 메시지가 Sep 22~23. 예시 활동은 서버가 켜질 때마다 오늘 날짜로 옮기는데(server/demo.ts), 예시 글·대화는 안 옮겨서 앱이 3주 동안 아무도 안 쓴 것처럼 보인다.
**제안:** A) 예시 활동처럼 예시 글·예시 대화 시각도 서버 시작 때 “최근 며칠”로 옮기기(라이브 DB 의 예시 데이터만 바뀜, server/demo.ts). B) 시간에 묶인 문구(tonight/today/in 2 days)만 시간 없는 문장으로 고치기. C) 그대로.  — 추천: A, 활동과 같은 방식이라 일관되고 Feed 가 살아 보인다.
**답:** A (10/16). → c986455: 예시 글·댓글·대화 시각을 서버가 15분마다 “지금 기준 몇 시간 전”으로 다시 맞춘다. 실제 사람이 쓴 글·사람이 메시지를 보탠 대화는 그대로.

## 2026-10-14 03:40 UTC · 첫 화면·온보딩
**무엇이 어색한가:** 처음 들어온 학생이 보는 첫 화면 제목이 “What’s on campus this week?”이고, 카드 3장 중 2장이 정보(무료 음식, 장학금 마감)다. “같이 할 사람을 찾는 앱”이라는 게 3초 안에 안 보인다(사람은 가운데 분홍 카드 한 장). 그다음 온보딩이 **9단계**(학교·목표·공강 오후·금요일 밤·만나고 싶은 사람·전공·미리보기·이름·이메일)라 앱 안을 보기 전에 꽤 길다.
**제안:** A) 첫 화면 제목을 사람 중심으로(예: “Who’s free on campus right now?”) 바꾸고 맨 위 카드를 ‘지금 공강인 사람’으로 — 문구·순서만, 작은 변경. B) A + 온보딩을 학교·목표·전공 3단계로 줄이고 나머지(공강 오후·금요일 밤·만나고 싶은 사람)는 앱 안에서 나중에 묻기. C) 그대로.  — 추천: A 먼저(바로 할 수 있음), B 는 데이터가 쌓이면.
**답:** A (10/16). → f41a432: 제목 “Who’s free on campus right now?”, 맨 위 카드 “Find someone for lunch”. 온보딩 단계 줄이기(B)는 나중.

## 2026-10-13 21:40 · Ask Lumi 속도
**무엇이 어색한가:** 라이브에서 질문 10개를 해 봤는데 답이 **매번 36~44초** 걸린다(“free food today?” 같은 한 줄 질문도). 답 내용은 대체로 좋다(“버클리 근처 인턴”, 하이킹 동아리, 이번 주말 해커톤 모두 맞게 찾음). 서버가 키로 쓸 수 있는 **가장 최신 플래그십 모델**을 자동으로 골라(reasoning low) 도구를 여러 번 부르기 때문으로 보인다(server/ai.ts `pickModel`).
**제안:** A) Railway 에 `AI_MODEL` 을 더 빠른 모델로 지정해 보고 답 품질 비교(코드 변경 없음, 사장님이 설정). B) 답을 글자 단위로 흘려 보내기(streaming) — 기다리는 느낌 줄이기, 코드 작업 큼. C) 그대로.  — 추천: A 먼저, 10초 안쪽이 아니면 B.
**답:** A (10/16). → 사장님이 Railway 에서 `AI_MODEL` 을 지정 (PM agent 는 라이브 설정을 못 건드린다). 지금 쓰는 모델과 후보는 서버 로그 `[ai] using model … (newest of: …)` 줄에 나온다 — 같은 계열의 작은(mini) 모델부터. 바꾼 뒤 다음 Ask Lumi 실행에서 속도·답을 비교해 적는다.

## 2026-10-13 15:40 · Discover › Teams
**무엇이 어색한가:** Teams 탭이 Devpost 해커톤 50여 개(대부분 온라인·전 세계)를 “Ha” 동그라미 + 제목 + D-n 으로 줄줄이 나열한다. 사람(팀원 찾는 사람, 같이 나갈 사람)은 한 명도 안 보이고, 정렬도 마감순이 아니라 가져온 순서라 D-1 다음에 D-10, D-5 가 온다. 또 Discover 위쪽에 Ask·Free·Rides·Ask friends 카드 4개가 쌓여서 첫 화면에는 Now/Activities/Teams 내용이 하나도 안 보인다.
**제안:** A) Teams 는 “팀원 구하는 사람/글”만 위에, 해커톤은 마감 임박 3개 + “모두 보기”(Campus 로)로 묶기. B) 해커톤은 Campus › Browse 로 옮기고 Teams 는 사람 글만. C) 그대로.  — 추천: A, “정보는 사람으로 이어진다”를 지키면서 해커톤도 버리지 않는다.
**답:** A (10/16). → 693ea88: 팀원 모집·크루·동아리가 먼저, 해커톤은 마감 가까운 3개 + “See all N hackathons & competitions”(Campus › 해커톤). Discover 위쪽 카드 4개는 그대로 — 따로 보자.

## 2026-10-13 · People (첫 화면)
**무엇이 어색한가:** 첫 화면이 화면 2/3를 채우는 얼굴 사진 한 장 + 이름 옆 큰 나이(“Maya 24”) + 넘기기(X)/연결 버튼이다. PRODUCT_TASTE 의 “데이팅 앱처럼 보이면 안 된다 — 큰 얼굴 사진 + 스와이프 느낌 금지”와 정면으로 겹친다. 같이 할 거리(“Coffee at 6 on Telegraph…”)는 사진 아래 한 줄로 밀려 잘린다. (이번에 하트 아이콘·“Swipe left to pass, right to connect” 문구는 뺐다.)
**추가(10/14):** 프로필 화면도 같은 느낌 — 얼굴 사진이 화면 반, 이름 옆 나이, 하트(관심) 버튼, 그리고 목표·‘Here for’에 **💘 Dating** 이 선택지로 있다(예시 Maya 는 두 곳 다 Dating). 앱 본질이 ‘같이 할 사람’이면 Dating 선택지를 뺄지도 같이 정해 주세요.
**추가(10/15):** 카드의 나이는 온보딩 8단계에서 **출생 연도**를 받아 만든다(16세 미만 거르기 용도도 있음). 나이를 카드에서 빼더라도 연도는 받을 수 있다 — 카드 표시만 정하시면 된다.
**제안:** A) 카드는 그대로 두되 사진을 위쪽 절반으로 줄이고, 카드의 주인공을 “지금 같이 할 것”(시간·장소·한 문장)으로 바꾸고, 나이는 빼고 학과·학년만. B) 스와이프 덱을 접고 “지금 같이 할 수 있는 사람” 목록(작은 아바타 + 할 거리 한 줄)으로. C) 지금 그대로.  — 추천: A, 10/11 에 고른 한 장씩 보기는 살리면서 데이팅 느낌만 걷어낸다.
**답(10/16):** “지금 같이 할 것”을 주인공으로 하면 처음 보는 사람에게 “같이 하자”고 먼저 말하는 게 부담될 수 있다 — 그걸 풀어야 한다.
**추가(10/16, 아직 안 정해진 부분):** 프로필 편집에 **키(Height, cm)** 칸과 ‘Here for’의 **Dating** 이 그대로 있다 — 둘 다 데이팅 앱 쪽 신호. 1+3 은 반영했고, 이 둘을 뺄지(또는 숨길지)만 정해 주시면 된다. 추천: 둘 다 빼기(기존 값은 남겨 두고 화면·카드에서만 안 보이게).
**답(10/30, 키·Dating):** 키만 빼기. → 프로필 편집·가입·공개 범위·다른 사람 프로필에서 키 칸 숨김(값은 남김). Dating 은 그대로.

### (11/03) Emoji in the live Berkeley feed and profiles
The live feed shows example posts with emoji ("coffee meetup tonight ☕", "New member sets 🎸", "day made 😻"), and example profiles use emoji avatars. They come from our demo content (packages/core/src/data/seed.en.ts, 74 lines) and are already in the live DB. Clubs are already cleaned on display.
**Options:** A) Hide emoji when showing posts, comments and profile text, the same way clubs are handled now (real users' emoji would be hidden too). B) Clean only our demo text and avatars; real users can still write emoji (needs a live DB update, so your OK). C) Leave as is.
**Recommended:** B. Stripping what real users write feels like censoring them.
**Answer (11/03, chat):** "이모지는 그냥 없애셈" → done: server strips emoji from everything it sends (server/noemoji.ts), shared Avatar/Cover/EmptyState draw none; remaining hard-coded UI emoji handed to Codex (docs/HANDOFF.md).

### (11/03) Put grad / new-grad jobs into the live app?
The live app already shows internships from 98 company job boards (refreshed every 12 hours on Railway, internships only). The new US jobs file has 146 boards (88 not in the live list) and adds new-grad / entry-level, PhD, master's and postdoc roles (967 postings now). It is a file only and visible at /preview/jobs.
**Options:** A) Add the 88 boards and the new-grad/PhD/master's roles to the live feed (about 90 more API calls every 12 hours on Railway; small cost increase). B) Keep it as a file and refresh it from the agent; put it live later together with schools. C) Live feed for internships stays as is; only new-grad jobs go live.
**Recommended:** A. The calls are light JSON and this is the content grad students and graduating seniors asked for.
**Answer (11/03, chat):** "돈이 안드는 방식으로 하면 올려도 돼" → /api/jobs reads the jobs file shipped with the deploy (no DB, no Railway fetching); agent refreshes it daily. App screen: Codex.

## 2026-11-04 — 이 컨테이너에서 막힌 학교들의 수업 시간을 Railway 에서 한 번 받을까요?
**상황:** Stanford, Northwestern, Notre Dame, UVA, Minnesota, SJSU, UC Santa Cruz 등의 공개 수업 검색은 이 작업 컨테이너에서 TLS 인증서 오류로 열리지 않습니다(학교 쪽은 공개, 막힌 건 이쪽 네트워크). 우회는 하지 않았습니다.
**제안:** A) Railway 서버에서 학교마다 일주일에 한 번만 수업 표본·전체를 받아 파일로 남기기 — 상시 프로세스는 늘지 않고, 학교당 주 1회 수백 번 요청(작은 비용). B) 지금처럼 두고 다른 학교부터 채우기.
**답:**
