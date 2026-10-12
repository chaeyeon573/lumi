// ─── 공통 ────────────────────────────────────────────────────────────────
export type ID = string;

/** 항목별 공개 범위 */
export type Visibility = 'public' | 'school' | 'department' | 'friends' | 'followers' | 'selected' | 'private';

/** 활동 가능한 시간 (완전한 시간표 대신 사용) */
export type Availability = 'now' | 'afternoon' | 'after18' | 'weekend' | 'in_class' | 'hidden';

export type Interest =
  | 'coffee' | 'meal' | 'study' | 'exercise' | 'walk' | 'cycling' | 'shopping'
  | 'exhibition' | 'club' | 'research' | 'startup' | 'networking' | 'etc';

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
  /** 학교 수업 목록에서 추가했으면 과목 상세·실라버스 링크 */
  url?: string;
  syllabusUrl?: string;
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
  id: ID;
  /** 예시로 넣어 둔 가상 프로필 — 화면에 '예시 프로필'로 표시한다 */
  sample?: boolean;
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
  createdAt: string;
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
  /** 근무지·장소 (인턴: "San Francisco, CA · New York, NY") */
  location?: string;
  remote?: boolean;
  /** 직무 분야 (인턴) — lib/listings.ts 의 FIELDS */
  field?: string;
  /** 회사가 공고를 올린·갱신한 시각 (마감일이 없는 상시 채용) */
  postedAt?: string;
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
export type OrganizationType = 'club' | 'department' | 'lab' | 'council' | 'greek';

export interface Organization {
  id: ID;
  name: string;
  logo: { emoji: string; hue: number; url?: string };
  type: OrganizationType;
  schoolId: ID;
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

export type ParticipationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

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

export interface Post {
  id: ID;
  authorId: ID;
  authorType: 'user' | 'org';
  orgId?: ID;
  media: { emoji: string; hue: number; url?: string }[];
  text: string;
  tags: string[];
  visibility: Visibility;
  likeIds: ID[];
  savedIds: ID[];
  comments: Comment[];
  relatedActivityId?: ID;
  relatedOpportunityId?: ID;
  /** 익명 게시 — 작성자는 서버에만 저장되고 화면에는 '익명'으로 표시. 익명 글은 텍스트만 가능 */
  anonymous?: boolean;
  postType?: PostType;
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
  createdAt: string;
}

// ─── 관계 ─────────────────────────────────────────────────────────────────
export interface Relationships {
  /** 관심 ♥ — 상대에게 공개되지 않음 */
  likes: { fromId: ID; toId: ID; createdAt: string }[];
  follows: { fromId: ID; toId: ID; targetType: 'user' | 'org' }[];
  friendRequests: { id: ID; fromId: ID; toId: ID; status: 'pending' | 'accepted' | 'declined'; createdAt: string }[];
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
  | 'org_event' | 'nearby_activity' | 'proposal' | 'proposal_result' | 'deadline' | 'opportunity_match' | 'plan_vote' | 'plan_decided';

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
