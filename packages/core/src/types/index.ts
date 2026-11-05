// ─── 공통 ────────────────────────────────────────────────────────────────
export type ID = string;

/** 항목별 공개 범위. 'group' = 특정 그룹 멤버만 (Post.groupId / Activity.orgId) */
export type Visibility = 'public' | 'school' | 'department' | 'friends' | 'followers' | 'selected' | 'private' | 'group';

/** 활동 가능한 시간 (완전한 시간표 대신 사용) */
export type Availability = 'now' | 'afternoon' | 'after18' | 'weekend' | 'in_class' | 'hidden';

export type Interest =
  | 'coffee' | 'meal' | 'study' | 'exercise' | 'walk' | 'cycling' | 'shopping'
  | 'exhibition' | 'club' | 'research' | 'startup' | 'networking' | 'etc'
  // v2 온보딩 관심사 (AI · 디자인 · 금융 · 여행 · 음악 · 영화 · 독서 · 사진 · 요리 · 봉사 · 투자 · 예술 · 게임 · 패션 · 러닝)
  | 'ai' | 'design' | 'finance' | 'travel' | 'music' | 'film' | 'reading' | 'photo' | 'cooking' | 'volunteer' | 'invest' | 'art' | 'game' | 'fashion' | 'running';

export type Purpose = 'friend' | 'dating' | 'study' | 'hobby' | 'club' | 'networking' | 'any';

export type Gender = 'female' | 'male' | 'other' | 'private';

// ─── 사용자 ───────────────────────────────────────────────────────────────
/** 소속 유형 — 현재 MVP는 university만 사용, 향후 company(직장인 모드) 확장 */
export type AffiliationType = 'university' | 'company';
export type UniversityRole = 'undergraduate' | 'graduate' | 'alumni';

export interface UniversityAffiliation {
  type: 'university';
  schoolId: ID;
  schoolName: string;
  role: UniversityRole;
  department: string;
  /** 입학 또는 졸업 연도 */
  year: number;
  emailVerified: boolean;
  /** 학교명 / 학과 공개 여부 */
  showSchool: boolean;
  showDepartment: boolean;
}

export interface CompanyAffiliation {
  type: 'company';
  companyName: string;
  jobTitle?: string;
  emailVerified: boolean;
}

export type Affiliation = UniversityAffiliation | CompanyAffiliation;

export type ProfileField = 'bio' | 'likes' | 'freeTime' | 'height' | 'availability' | 'preferredPartner' | 'purposes' | 'interests' | 'posts' | 'prompts' | 'timetable' | 'goals' | 'living';

/** 시간표 수업. 요일 0=월 … 6=일 */
export interface Course {
  id: ID;
  name: string;
  day: number;
  start: string;
  end: string;
  /** 강의실 — 본인에게만 보이며 절대 공개되지 않는다 */
  room?: string;
  professor?: string;
  hue: number;
}

/** 프로필 질문(텍스트) — 질문 풀에서 골라 짧게 답한다 */
export interface ProfilePrompt {
  questionId: string;
  answer: string;
}
/** 음성 질문 — 데모에서는 녹음 길이만 저장 */
export interface VoicePrompt {
  questionId: string;
  durationSec: number;
  recordedAt: string;
}
/** 투표형 질문 — 방문자가 한 표씩 던질 수 있다 */
export interface PollPrompt {
  questionId: string;
  options: string[];
  /** 본인이 고른 답 */
  ownChoice: number;
  votes: Record<ID, number>;
}

export interface User {
  /** Explicit consent for classmate discovery; absent means private. */
  classmateOptIn?: boolean;
  /** Membership display defaults to private, independently of interests. */
  membershipVisibility?: Visibility;
  spokenLanguages?: string[];
  countryOfOrigin?: string;
  academicYear?: 1 | 2 | 3 | 4;
  dataOrigin?: "demo" | "registered";
  id: ID;
  nickname: string;
  birthYear: number;
  gender: Gender;
  avatar: { emoji: string; hue: number; photoType: 'face' | 'masked' | 'back'; url?: string };
  /** 프로필 사진 여러 장 (첫 장은 avatar.url) */
  photos?: string[];
  identityVerified: boolean;
  affiliation: Affiliation;
  bio: string;
  likes: string;
  freeTime: string;
  height?: number;
  availability: Availability;
  interests: Interest[];
  purposes: Purpose[];
  preferredPartner?: string;
  /** 정확한 위치 대신 대략적인 지역 */
  region: string;
  /** 지금 하고 싶은 활동 (한 줄) */
  nowWant?: string;
  /** 프로필 질문 답변 (텍스트 3개 필수) */
  prompts: ProfilePrompt[];
  voicePrompt?: VoicePrompt;
  poll?: PollPrompt;
  /** 시간표 — 다른 사용자에게는 공강 여부만 공개된다 */
  timetable: Course[];
  /** 이번 학기 목표 */
  goals: Goal[];
  /** 찾는 사람 */
  lookingFor: Role[];
  /** 내가 제공할 수 있는 것 */
  canOffer: Role[];
  /** 생활권 — 정확한 주소·방은 저장하지 않는다 */
  living?: { residence: Residence; zone: string };
  /** 관심 있는 연구실·조직 */
  interestedOrgIds: ID[];
  meetPreference: MeetPreference[];
  /** Who's free에서 친구가 아닌 사람에게도 보이기 */
  openToNew?: boolean;
  /** 오늘의 질문 답변 */
  dailyAnswer?: { questionId: string; answer: string; date: string };
  fieldVisibility: Record<ProfileField, Visibility>;
  settings: {
    messagePolicy: 'connected' | 'friends_only' | 'none';
    notifications: boolean;
    locationPermission: 'granted' | 'denied' | 'undecided';
  };
  /** 요금제 — free(기본) / plus(AroundU+: 다른 학교·도시 탐색, 고급 필터, 광고 없음) */
  plan?: Plan;
  /** 생애 단계 — Home 변형·People 필터·프로필 표시에 쓴다. alumni/professional 은 affiliation.role 'alumni' 와 동기화 */
  stage?: Stage;
  /** 졸업 후 정보 (Alumni 전환 시 입력) */
  career?: Career;
  /** 대학원생 연구 정보 — 분야는 추천에 쓰이고, 연구실·지도교수는 본인이 켤 때만 보인다 */
  research?: Research;
  /** 지금 열려 있는 것 (PRD "Open To") */
  openTo?: OpenTo[];
  /** 오늘 보낸 연결 요청 수 — 무료 플랜 일일 한도 계산용 */
  swipes?: { date: string; count: number };
  /** 거주 도시 (도시·생활권 단위, 상세 주소 없음). 없으면 region */
  homeCity?: string;
  /** 주 활동 지역 (선택) — 거주지와 다를 수 있다 (예: 거주 성남 · 활동 서울) */
  activityCity?: string;
  /** 졸업연도 또는 졸업 예정연도 */
  gradYear?: number;
  /** 학교 소속 인증 — 방법과 시각. 있으면 affiliation.emailVerified 도 true */
  verification?: { method: VerificationMethod; at: string };
  /** 무엇을 찾고 있나 — 온보딩에서 묻고 추천 가중치에 쓴다. 프로필 › 추천 설정에서 언제든 수정 */
  wants?: Wants;
  /** 저장한 사람 — 가장 가벼운 행동(보기 → 저장 → 나중에 연결). 본인에게만 보인다 */
  savedPeople?: ID[];
  /** 지금 열려 있는 것 — "☕ 이번 주 커피 가능"처럼 기간이 지나면 자동으로 꺼지는 상태 (레거시 단일) */
  status?: UserStatus;
  /** Open To — 여러 개 켤 수 있고 항목마다 기간·공개 대상이 있다 */
  openStatuses?: UserStatus[];
  /** 저장 목록 (기본 목록 외 사용자 지정). 본인에게만 보인다 */
  savedLists?: SavedList[];
  /** 숨긴 추천 카드 / 숨긴 모임 */
  hiddenPeople?: ID[];
  /** 탈퇴한 사용자 — 목록·추천·검색에서 빠지고, 대화 기록에는 "탈퇴한 사용자"로 남는다 */
  deleted?: boolean;
  deletedAt?: string;
  /** 운영자가 이용 정지한 사용자 — 목록에서 빠진다 */
  suspended?: boolean;
  hiddenActivities?: ID[];
  /** 최근 자연어 검색 (본인만) */
  recentSearches?: string[];
  /** 방문 예정 — 도시 단위, 기간만 (Who's around this week) */
  trips?: Trip[];
  /** 프로필·네트워크 공개 범위 */
  privacy?: PrivacySettings;
  /** 도와줄 수 있어요 — 짧은 태그 (예: 창업, 뉴욕 생활, 대학원 준비). 최대 5개 */
  helpWith?: string[];
  /** 찾고 있어요 — 짧은 태그 (예: AI 창업자, 테니스 칠 사람). 최대 5개 */
  seeking?: string[];
  /** 새 소식 — 이사·입사처럼 관계망에 알릴 만한 변화 (최근 것 먼저). 도시·회사를 바꾸면 엔진이 자동으로 남긴다 */
  updates?: LifeUpdate[];
  createdAt: string;
}

/** 새 소식 — moved: 도시를 옮김, joined: 회사에 합류, started: 새 과정·일을 시작 */
export interface LifeUpdate { kind: 'moved' | 'joined' | 'started'; value: string; at: string }

export type Plan = 'free' | 'plus';
export type Stage = 'undergrad' | 'masters' | 'phd' | 'alumni' | 'professional';
export interface Career { city?: string; company?: string; industry?: string; role?: string }
/** 대학원생 연구 — field(연구 분야, 예: NLP) · lab(연구실) · advisor(지도교수, 기본 비공개) · year(N년차) · keywords(세부 주제) */
export interface Research { field: string; lab?: string; advisor?: string; showAdvisor?: boolean; year?: number; keywords?: string[] }
export type OpenTo = 'coffee' | 'activities' | 'research' | 'networking' | 'mentoring' | 'cofounding';
export const STAGE_ROLE: Record<Stage, UniversityRole> = { undergrad: 'undergraduate', masters: 'graduate', phd: 'graduate', alumni: 'alumni', professional: 'alumni' };

/** 학교 인증 방법 — 재학생: school_email · sso · student_id / 졸업생: alumni_email · diploma · alumni_association · prior_student · vouch(동문 보증: 인증된 같은 학교 사람 2명) */
export type VerificationMethod = 'school_email' | 'sso' | 'student_id' | 'alumni_email' | 'diploma' | 'alumni_association' | 'prior_student' | 'vouch';
export const STUDENT_VERIFICATIONS: VerificationMethod[] = ['school_email', 'sso', 'student_id'];
export const ALUMNI_VERIFICATIONS: VerificationMethod[] = ['alumni_email', 'prior_student', 'vouch', 'alumni_association', 'diploma'];

// ─── 네트워크 요청 ("사람 찾기 › 지인들에게 물어보기") ─────────────────────
/** 요청이 퍼지는 범위 — 1촌(연결) · 2촌(연결의 연결) · 3촌 + 관련 학교·업종·관심사 */
export type RequestReach = 1 | 2 | 3;
export interface NetworkRequest {
  id: ID;
  authorId: ID;
  /** "이런 분을 찾고 있어요" 본문 */
  text: string;
  /** 맥락 — 도시 · 업종/분야 · 관심사 (선택). 전달 대상 관련성 계산에 쓴다 */
  city?: string;
  field?: string;
  interests: Interest[];
  reach: RequestReach;
  status: 'open' | 'closed';
  /** 요청자가 '관심 없어요' 한 사람은 다시 보지 않는다 */
  dismissedIds: ID[];
  responses: RequestResponse[];
  referrals: RequestReferral[];
  createdAt: string;
  expiresAt: string;
}
export type ShareField = 'school' | 'major' | 'city' | 'career' | 'interests' | 'groups';
/** "저예요" — 본인이 손 든 응답. 요청자가 수락하면 서로 연결 + Mutual Room */
export interface RequestResponse {
  id: ID;
  userId: ID;
  note?: string;
  /** 본인이 체크한 일치 조건 */
  matched?: string[];
  /** 요청자에게 공개하기로 고른 프로필 항목 (연락처는 항상 비공개) */
  shared?: ShareField[];
  /** 지인 추천을 거쳐 온 응답이면 추천한 사람 */
  viaId?: ID;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}
/** "제가 아는 사람이 있어요" — 후보 본인이 '관심 있어요' 하기 전까지 요청자에게 공개되지 않는다 */
export interface RequestReferral {
  id: ID;
  referrerId: ID;
  candidateId: ID;
  status: 'pending' | 'interested' | 'declined';
  createdAt: string;
}

/** 가벼운 상태 — Open To 를 프로필에 거창하게 붙이는 대신, 기간이 지나면 꺼진다 */
export type StatusKind = 'coffee' | 'meal' | 'running' | 'study' | 'walk' | 'chat';
export type StatusWhen = 'now' | 'today' | 'week' | 'weekend' | 'ongoing';
/** 공개 대상 — 전체 AroundU / 같은 학교 + 2촌 / 연결된 사람만 */
export type Audience = 'everyone' | 'school_2nd' | 'connections';
export interface UserStatus { kind: StatusKind; when: StatusWhen; until: string; setAt: string; audience?: Audience }

export interface SavedList { id: ID; name: string; memberIds: ID[]; notify: boolean }
export interface Trip { id: ID; city: string; from: string; to: string }
/** 공개 범위 — 전화번호·개인 이메일·정확한 위치·실시간 위치는 어떤 설정에서도 공개하지 않는다 */
export interface PrivacySettings {
  scope: Audience;
  showCompany: boolean;
  showCity: boolean;
  showGradYear: boolean;
  showGroups: boolean;
  /** 2촌 경로에 내 이름이 "서로 아는 사람"로 보이는 것 허용 */
  showInPaths: boolean;
  /** 방문 예정 도시를 보여줄지 */
  showTrips: boolean;
}
/** 연결 상태 */
export type ConnectionStatus = 'can_follow' | 'can_request' | 'requested' | 'connected' | 'blocked' | 'private';

/** "소개해 줄 수 있어요?" — 2촌에게 가기 위해 서로 아는 사람(via)에게 부탁. via 가 전달해야 상대가 알게 된다 */
export interface IntroRequest {
  id: ID;
  fromId: ID;
  viaId: ID;
  toId: ID;
  note?: string;
  status: 'pending' | 'forwarded' | 'accepted' | 'declined' | 'passed';
  createdAt: string;
}

/** 어떤 사람을 만나고 싶나 */
export type PeopleWant = 'same_major' | 'same_interest' | 'other_school' | 'senior_mentor' | 'alumni' | 'same_city' | 'same_field' | 'new_people' | 'same_research';
/** 어떤 활동을 하고 싶나 */
export type ActivityWant = 'coffee' | 'meal' | 'study' | 'exercise' | 'networking' | 'project' | 'research' | 'hobby';
export interface Wants { people: PeopleWant[]; activities: ActivityWant[] }
export const ALL_PEOPLE_WANTS: PeopleWant[] = ['same_major', 'same_interest', 'other_school', 'senior_mentor', 'alumni', 'same_city', 'same_field', 'new_people', 'same_research'];
export const ALL_ACTIVITY_WANTS: ActivityWant[] = ['coffee', 'meal', 'study', 'exercise', 'networking', 'project', 'research', 'hobby'];

/** 저장한 사람 검색 (AroundU+) — 조건을 저장하고 새 사람 알림을 받는다 */
export interface SavedSearch {
  id: ID;
  userId: ID;
  name: string;
  criteria: PeopleSearch;
  alert: boolean;
  /** 마지막 실행 시 조건에 맞은 사람 수 */
  lastMatched: number;
  createdAt: string;
}

/** 사람 찾기 조건 — 학교는 여러 조건 중 하나 */
export interface PeopleSearch {
  q?: string;
  schools: ID[];
  majors: string[];
  gradYearFrom?: number;
  gradYearTo?: number;
  homeCities: string[];
  activityCities: string[];
  companies: string[];
  industries: string[];
  roles: string[];
  interests: Interest[];
  stages: Stage[];
}

export interface School {
  id: ID;
  name: string;
  emailDomain: string;
  region: string;
  center: { lat: number; lng: number };
}

// ─── 기회 (행사·동아리 모집·연구실·인턴·장학금·해커톤·창업) ─────────────────
export type OpportunityType = 'event' | 'club' | 'lab' | 'internship' | 'scholarship' | 'hackathon' | 'startup' | 'activity' | 'exchange';
/** 소셜 RSVP: 관심 / 갈 예정 / 혼자 가요 / 같이 갈 사람 찾아요 / 팀 찾는 중 / 이미 신청 / 참여 경험 있음 */
export type OpportunityIntent = 'interested' | 'going' | 'solo' | 'company' | 'team' | 'applied' | 'done';

export interface Opportunity {
  /** Set only by a trusted ingestion/review path, never inferred from the URL. */
  sourceVerified?: boolean;
  id: ID;
  type: OpportunityType;
  title: string;
  host: string;
  orgId?: ID;
  description: string;
  cover: { emoji: string; hue: number; url?: string };
  /** 마감일 (지원형) */
  deadline?: string;
  /** 행사 일시 */
  date?: string;
  startTime?: string;
  place?: Place;
  /** 누구에게 맞는지 */
  eligibility: string;
  benefit?: string;
  /** 필요한 역할 (팀 기반 기회) */
  rolesNeeded?: Role[];
  teamSize?: string;
  sourceUrl: string;
  sourceLabel: string;
  tags: string[];
  /** 추천 매칭용 관심사·목표 */
  interests: Interest[];
  goals: Goal[];
  schoolId?: ID;
  official?: boolean;
  lastVerified: string;
  qna: Comment[];
  reviews: { id: ID; authorId: ID; text: string; result?: 'accepted' | 'rejected' | 'attended'; createdAt: string }[];
  createdAt: string;
}

/** 사용자의 기회에 대한 의사 표시 */
export interface OpportunityIntentRecord {
  id: ID;
  opportunityId: ID;
  userId: ID;
  intent: OpportunityIntent;
  saved: boolean;
  createdAt: string;
}

/** 이번 학기 목표 */
export type Goal = 'friends' | 'lunch' | 'join_club' | 'start_club' | 'startup' | 'cofounder' | 'lab' | 'internship' | 'scholarship' | 'hackathon' | 'hobby' | 'dating';
/** 찾는 사람 / 제공할 수 있는 역할 */
export type Role = 'friend' | 'teammate' | 'cofounder' | 'developer' | 'designer' | 'data' | 'marketing' | 'planning' | 'presentation' | 'video' | 'research' | 'club_ops' | 'study_partner' | 'application_partner' | 'senior' | 'mentor' | 'date';
export type Residence = 'dorm' | 'offcampus' | 'commute';
/** 어떤 사람을 만나고 싶은지 — 추천 가중치에 반영 */
export type MeetPreference = 'same_hobby' | 'same_class' | 'same_goal' | 'same_living' | 'new_people';

// ─── 조직 (동아리·학과·연구실·학생회) ──────────────────────────────────────
/** 'community' = 사용자가 자유롭게 만든 그룹 (학교·지역·관심사·직업 어느 기반이든) */
export type OrganizationType = 'club' | 'department' | 'lab' | 'council' | 'greek' | 'community';
/** 그룹의 성격 — AroundU가 미리 규정하지 않고 만든 사람이 고른다 */
export type GroupScope = 'school' | 'city' | 'interest' | 'career';

export interface Organization {
  id: ID;
  name: string;
  logo: { emoji: string; hue: number; url?: string };
  type: OrganizationType;
  /** 학교 기반 그룹만 가진다. 지역·관심사·직업 그룹은 없음 */
  schoolId?: ID;
  scope?: GroupScope;
  /** 지역 기반 그룹의 도시 */
  city?: string;
  /** 가입 방식 — open 은 바로 멤버, approval 은 운영진 승인 */
  joinPolicy?: 'open' | 'approval';
  /** 관심사 태그 (추천용) */
  interests?: Interest[];
  parent?: string;
  verified: boolean;
  description: string;
  gallery: { emoji: string; hue: number; caption: string; url?: string }[];
  regularActivities: string[];
  recruitment?: { title: string; period: string; open: boolean };
  notices: { id: ID; title: string; body: string; createdAt: string }[];
  followerIds: ID[];
  memberIds: ID[];
  adminIds: ID[];
  applicantIds: ID[];
  /** 외부 링크 (인스타그램·페이스북·홈페이지·오픈채팅) */
  links?: { label: string; url: string }[];
  dues?: string;
  joinProcess?: string;
  /** Greek life 등 학교 정책 안내 */
  policyNote?: string;
}

// ─── 활동 ─────────────────────────────────────────────────────────────────
export type ActivityKind = 'personal' | 'group' | 'org_event';
export type ActivityCategory =
  | 'coffee' | 'meal' | 'study' | 'exercise' | 'club' | 'performance'
  | 'school_event' | 'seminar' | 'networking' | 'store_deal' | 'etc';
export type JoinPolicy = 'open' | 'approval' | 'invite';

export interface Place {
  name: string;
  address?: string;
  /** 대략적인 위치 — 승인제 활동은 승인 전까지 이 값만 보여준다 (예: "학생회관 근처") */
  area?: string;
  lat: number;
  lng: number;
}

export interface Comment {
  id: ID;
  authorId: ID;
  text: string;
  createdAt: string;
}

export interface Activity {
  /** Optional, deliberately chosen restrictions. Empty means all student statuses/years. */
  attendeeRoles?: UniversityRole[];
  attendeeYears?: number[];
  id: ID;
  kind: ActivityKind;
  category: ActivityCategory;
  title: string;
  description: string;
  cover: { emoji: string; hue: number; url?: string };
  hostId: ID;
  hostType: 'user' | 'org';
  orgId?: ID;
  /** ISO date (YYYY-MM-DD) */
  date: string;
  startTime: string;
  endTime: string;
  place: Place;
  capacity: number;
  visibility: Visibility;
  /** visibility === 'selected' | 'department' 일 때 대상 */
  visibilityTargets?: string[];
  joinPolicy: JoinPolicy;
  fee: number;
  conditions?: string;
  invitedIds?: ID[];
  /** 기회에서 시작된 활동 (같이 지원·팀 모집) */
  opportunityId?: ID;
  /** 시간표 공강에서 열린 활동 */
  openSlot?: boolean;
  /** 이 도시에 새로 온 사람 환영 모임 (New in town) */
  newcomers?: boolean;
  /** 제휴 딜(store_deal) — 발견 탭 '참여할 수 있는 모임' 맨 위 제휴 카드 */
  partner?: { name: string; deal: string };
  rolesNeeded?: Role[];
  /** Study Crew — 수업 이름으로 묶인다. visibilityTargets: ['course:<이름>']로 같은 수업 학생에게만 보인다 */
  courseName?: string;
  crewType?: CrewType;
  mode?: 'offline' | 'online';
  comments: Comment[];
  /** 학교 공식 행사 여부 */
  official?: boolean;
  createdAt: string;
}

export type CrewType = 'exam' | 'assignment' | 'review' | 'project';

export type ParticipationStatus = 'waitlisted' | 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface Participation {
  id: ID;
  activityId: ID;
  userId: ID;
  status: ParticipationStatus;
  message?: string;
  createdAt: string;
}

// ─── 게시물 ───────────────────────────────────────────────────────────────
export type PostCategory = 'friend' | 'school' | 'club' | 'public';
/** 게시물 종류: 그냥 이야기 / 질문 / 정보 / 후기 / 같이할 사람 / 소식 */
export type PostType = 'story' | 'question' | 'info' | 'review' | 'together' | 'news';
/** 피드 공간 — 재학생 글이 동문 피드에, 동문 근황이 학부생 피드에 섞이지 않게 */
/** 연결 요청에 붙이는 한마디 — 프로필 답변에 대한 한마디면 promptId·quote 가 붙는다 (Hinge 식) */
export interface FriendNote { text: string; promptId?: string; quote?: string }
export type PostAudience = 'students' | 'alumni' | 'all';
export type BoostTier = 'community' | 'cross';

export interface Post {
  id: ID;
  authorId: ID;
  authorType: 'user' | 'org';
  orgId?: ID;
  media: { emoji: string; hue: number; url?: string }[];
  text: string;
  tags: string[];
  visibility: Visibility;
  /** visibility === 'group' 일 때 대상 그룹 */
  groupId?: ID;
  likeIds: ID[];
  savedIds: ID[];
  comments: Comment[];
  relatedActivityId?: ID;
  relatedOpportunityId?: ID;
  /** 익명 게시 — 작성자는 서버에만 저장되고 화면에는 '익명'으로 표시. 익명 글은 텍스트만 가능 */
  anonymous?: boolean;
  postType?: PostType;
  /** 누구에게 보이는 글인지 — 재학생 · 동문 · 모두. 없으면 작성자 단계로 정한다 (lib/feed postAudienceOf) */
  audience?: PostAudience;
  /** 주제 태그 키 (일상·수업·진로 …) */
  topics?: string[];
  courseTag?: string;
  /** 함께한 사람 — 상대가 승인해야 상대 프로필에 표시된다 */
  taggedUserIds?: ID[];
  tagApprovedIds?: ID[];
  /** 다음 활동 같이할 사람 모집 */
  recruitNext?: boolean;
  /** 내 프로필 게시물 탭에 표시 (기본 true) */
  showOnProfile?: boolean;
  /** Community Feed에도 공개 (기본 true) */
  showOnFeed?: boolean;
  /** 스폰서 글(광고) — 피드에 '광고' 표시와 CTA로 나간다. 좋아요·댓글 없음 */
  sponsored?: { advertiser: string; cta: string; url?: string; deal?: string };
  /** 부스트(모의 결제) — 관련 audience 에 추가 노출, 피드에 'Boosted' 표시 */
  boost?: { tier: BoostTier; audiences: string[]; until: string };
  createdAt: string;
}

// ─── 관계 ─────────────────────────────────────────────────────────────────
export interface Relationships {
  /** 관심 ♥ — 상대에게 공개되지 않음 */
  likes: { fromId: ID; toId: ID; createdAt: string }[];
  follows: { fromId: ID; toId: ID; targetType: 'user' | 'org' }[];
  friendRequests: { id: ID; fromId: ID; toId: ID; status: 'pending' | 'accepted' | 'declined'; createdAt: string; note?: FriendNote }[];
  friends: { a: ID; b: ID; since: string }[];
  blocks: { fromId: ID; toId: ID }[];
}

export type ProposalStatus = 'pending' | 'accepted' | 'declined' | 'expired';

/** 개인 활동 제안 */
export interface ActivityProposal {
  id: ID;
  fromId: ID;
  toId: ID;
  category: ActivityCategory;
  message: string;
  when: string;
  status: ProposalStatus;
  createdAt: string;
  expiresAt: string;
}

// ─── Plan Together (단체 약속 시간 투표) ──────────────────────────────────
export interface TimeOption {
  id: ID;
  date: string;
  startTime: string;
  endTime: string;
  /** 공강 겹침으로 자동 제안된 시간 */
  suggested?: boolean;
}

export interface TimePoll {
  id: ID;
  hostId: ID;
  title: string;
  category: ActivityCategory;
  place?: Place;
  /** 투표 요청 받은 사람 (주최자 제외) */
  inviteeIds: ID[];
  options: TimeOption[];
  /** userId → 가능한 optionId 목록 */
  votes: Record<ID, ID[]>;
  status: 'open' | 'decided' | 'cancelled';
  decidedOptionId?: ID;
  /** 확정되면 생성된 활동 */
  activityId?: ID;
  closesAt: string;
  createdAt: string;
}

// ─── 채팅 ─────────────────────────────────────────────────────────────────
export type ChatRoomType = 'direct' | 'activity' | 'org';

export interface ChatMessage {
  id: ID;
  senderId: ID;
  text: string;
  createdAt: string;
  system?: boolean;
}

export interface ChatRoom {
  id: ID;
  type: ChatRoomType;
  memberIds: ID[];
  activityId?: ID;
  orgId?: ID;
  title?: string;
  messages: ChatMessage[];
  lastReadAt: Record<ID, string>;
  createdAt: string;
}

// ─── 알림 ─────────────────────────────────────────────────────────────────
export type NotificationType =
  | 'friend_accepted' | 'mutual_like' | 'participation_approved' | 'participation_rejected'
  | 'participation_request' | 'activity_reminder' | 'comment' | 'like' | 'follow'
  | 'org_event' | 'nearby_activity' | 'proposal' | 'proposal_result' | 'deadline' | 'opportunity_match' | 'plan_vote' | 'plan_decided'
  | 'new_people' | 'group_joined'
  | 'request_received' | 'request_response' | 'request_referral' | 'request_accepted'
  | 'intro_request' | 'intro_forwarded' | 'intro_accepted' | 'saved_update' | 'trip_nearby';

export interface Notification {
  id: ID;
  userId: ID;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

// ─── 신고 ─────────────────────────────────────────────────────────────────
export type ReportTargetType = 'user' | 'activity' | 'post' | 'message';

export interface Report {
  id: ID;
  reporterId: ID;
  targetType: ReportTargetType;
  targetId: ID;
  reason: string;
  createdAt: string;
}
