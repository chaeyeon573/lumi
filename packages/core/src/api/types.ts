import type {
  Activity, ActivityProposal, ChatRoom, ID, Notification, Organization, Participation, Post, Relationships, Report, School, User,
  ActivityCategory, Visibility, JoinPolicy, ActivityKind, Place, ReportTargetType, Availability, Opportunity, OpportunityIntentRecord, OpportunityIntent, Role, TimePoll, TimeOption,
} from '@core/types';

/** 클라이언트가 보유하는 전체 데이터 스냅샷 (실제 API에서는 필요한 부분만 내려받도록 분리) */
export interface Snapshot {
  users: User[];
  schools: School[];
  organizations: Organization[];
  activities: Activity[];
  participations: Participation[];
  posts: Post[];
  relationships: Relationships;
  proposals: ActivityProposal[];
  chatRooms: ChatRoom[];
  notifications: Notification[];
  reports: Report[];
  opportunities: Opportunity[];
  opportunityIntents: OpportunityIntentRecord[];
  timePolls: TimePoll[];
}

/** 변경된 엔티티만 담아 돌려주는 부분 응답. 스토어가 id 기준으로 병합한다. */
export type Patch = Partial<Omit<Snapshot, 'relationships'>> & {
  relationships?: Relationships;
  removed?: Partial<Record<'activities' | 'posts' | 'chatRooms' | 'participations' | 'proposals' | 'opportunityIntents' | 'timePolls' | 'organizations' | 'opportunities' | 'schools', ID[]>>;
};

export interface RegisterInput {
  /** 학교 이메일 — 실제 서버에서는 로그인 식별자로 쓴다 (프로필에는 노출되지 않음) */
  email?: string;
  nickname: string;
  birthYear: number;
  gender: User['gender'];
  avatar: User['avatar'];
  schoolId: ID;
  role: 'undergraduate' | 'graduate' | 'alumni';
  department: string;
  year: number;
  emailVerified: boolean;
  showSchool: boolean;
  showDepartment: boolean;
  interests: User['interests'];
  purposes: User['purposes'];
  bio: string;
  likes: string;
  freeTime: string;
  height?: number;
  availability: Availability;
  preferredPartner?: string;
  fieldVisibility: User['fieldVisibility'];
  prompts: User['prompts'];
  voicePrompt?: User['voicePrompt'];
  poll?: User['poll'];
  timetable?: User['timetable'];
  goals: User['goals'];
  lookingFor?: User['lookingFor'];
  canOffer?: User['canOffer'];
  living?: User['living'];
  meetPreference?: User['meetPreference'];
  /** 가입하면서 저장한 동아리 */
  interestedOrgIds?: ID[];
  locationPermission: User['settings']['locationPermission'];
  notifications: boolean;
}

export interface ActivityInput {
  kind: ActivityKind;
  category: ActivityCategory;
  title: string;
  description: string;
  cover: Activity['cover'];
  date: string;
  startTime: string;
  endTime: string;
  place: Place;
  capacity: number;
  fee: number;
  conditions?: string;
  joinPolicy: JoinPolicy;
  visibility: Visibility;
  visibilityTargets?: string[];
  invitedIds?: ID[];
  orgId?: ID;
  opportunityId?: ID;
  rolesNeeded?: Role[];
  openSlot?: boolean;
  courseName?: string;
  crewType?: Activity['crewType'];
  mode?: Activity['mode'];
}

export interface PostInput {
  text: string;
  media: Post['media'];
  tags: string[];
  visibility: Visibility;
  relatedActivityId?: ID;
  relatedOpportunityId?: ID;
  orgId?: ID;
  anonymous?: boolean;
  postType?: Post['postType'];
  topics?: string[];
  courseTag?: string;
  taggedUserIds?: ID[];
  recruitNext?: boolean;
  showOnProfile?: boolean;
  showOnFeed?: boolean;
}

/** 기회 공유 — 링크와 제목만으로 등록하고 나머지는 나중에 채운다 */
export interface OpportunityInput {
  type: Opportunity['type'];
  title: string;
  host: string;
  description: string;
  sourceUrl: string;
  deadline?: string;
  date?: string;
  rolesNeeded?: Role[];
  orgId?: ID;
}

/** 학교 수업 목록 항목 (registrar 데이터). 시간표에 추가하면 요일별 Course로 펼쳐진다 */
export interface CatalogCourse {
  id: ID;
  schoolId: ID;
  /** 예: "CS 61A" */
  code: string;
  title: string;
  department: string;
  instructor?: string;
  location?: string;
  /** 요일 0=월 … 6=일 */
  meetings: { day: number; start: string; end: string }[];
  term: string;
  units?: number;
  /** 과목 공식 상세 페이지 (설명·선수과목·담당). 학교가 공개했으면 실라버스 링크 */
  url?: string;
  syllabusUrl?: string;
}

/** Plan Together 생성 입력 */
export interface TimePollInput {
  title: string;
  category: ActivityCategory;
  place?: Place;
  inviteeIds: ID[];
  options: Omit<TimeOption, 'id'>[];
  closesAt: string;
}

/** 첫 화면 카드 — 실제 데이터 */
export interface Highlights {
  schoolShort: string;
  freeFoodThisWeek: number;
  food?: { title: string; date: string; startTime?: string; place?: string };
  deadline?: { title: string; deadline: string; host: string };
  clubs: number;
  internships: number;
}

/** AI 답변에 붙는 근거 카드 — 서버가 실제로 검색한 항목만 */
export type AiCard =
  | { kind: 'listing'; id: ID; type: Opportunity['type']; title: string; host: string; date?: string; startTime?: string; deadline?: string; place?: string; benefit?: string; url?: string }
  | { kind: 'club'; id: ID; name: string; type: Organization['type']; recruiting: boolean; summary: string; url?: string }
  | { kind: 'course'; id: ID; code: string; title: string; instructor?: string; location?: string; when: string; term: string; url?: string; syllabusUrl?: string }
  | { kind: 'activity'; id: ID; title: string; date: string; startTime: string; place: string; category: Activity['category'] };

/** 대화형 가입이 채워 주는 프로필 */
export interface AiProfileDraft {
  department: string; role: 'undergraduate' | 'graduate' | 'alumni' | 'unknown'; yearInSchool: number;
  goals: User['goals']; interests: User['interests']; purposes: User['purposes']; lookingFor: User['lookingFor']; canOffer: User['canOffer'];
  bio: string; likes: string; freeTime: string;
}

export interface AroundUApi {
  auth: {
    /** 데모 계정으로 로그인. schoolId 를 주면 그 학교 데모 계정 (서버에 있을 때만) */
    loginDemo(schoolId?: ID): Promise<User>;
    /** 가입한 학교 이메일로 받은 코드로 로그인 (mock: 123456) */
    loginWithCode(email: string, code: string): Promise<User>;
    register(input: RegisterInput): Promise<User>;
    logout(): Promise<void>;
    session(): Promise<ID | null>;
    /** 이미 가입한 계정에 (코드로 확인한) 학교 이메일을 붙인다 — 다른 기기에서 이메일로 로그인할 수 있게 */
    attachEmail(email: string): Promise<User>;
  };
  bootstrap(viewerId: ID): Promise<Snapshot>;

  schools: {
    search(query: string): Promise<School[]>;
    sendVerificationCode(email: string, schoolId: ID): Promise<{ ok: boolean; hint: string }>;
    verifyCode(email: string, code: string): Promise<{ ok: boolean }>;
    /** 첫 화면에 띄우는 이번 주 하이라이트 (로그인 전에도) — 없으면 null */
    highlights(schoolId: ID): Promise<Highlights | null>;
  };

  catalog: {
    /** 학교 수업 검색 (과목 코드·이름·교수) */
    courses(schoolId: ID, query: string, department?: string): Promise<CatalogCourse[]>;
    /** 학과(과목 분류) 목록 */
    departments(schoolId: ID): Promise<{ name: string; count: number }[]>;
  };

  users: {
    update(id: ID, patch: Partial<User>): Promise<Patch>;
    setAvailability(id: ID, availability: Availability): Promise<Patch>;
    /** 다른 사용자의 투표형 질문에 한 표 */
    votePoll(ownerId: ID, voterId: ID, optionIndex: number): Promise<Patch>;
  };

  activities: {
    create(hostId: ID, input: ActivityInput): Promise<{ activity: Activity; patch: Patch }>;
    update(id: ID, input: Partial<ActivityInput>): Promise<Patch>;
    remove(id: ID): Promise<Patch>;
    join(activityId: ID, userId: ID, message?: string): Promise<Patch>;
    cancel(activityId: ID, userId: ID): Promise<Patch>;
    approve(participationId: ID): Promise<Patch>;
    reject(participationId: ID): Promise<Patch>;
    comment(activityId: ID, authorId: ID, text: string): Promise<Patch>;
  };

  posts: {
    create(authorId: ID, input: PostInput): Promise<{ post: Post; patch: Patch }>;
    remove(id: ID): Promise<Patch>;
    toggleLike(postId: ID, userId: ID): Promise<Patch>;
    toggleSave(postId: ID, userId: ID): Promise<Patch>;
    comment(postId: ID, authorId: ID, text: string): Promise<Patch>;
    /** 태그된 사람이 자기 프로필 노출을 승인 */
    approveTag(postId: ID, userId: ID, approve: boolean): Promise<Patch>;
  };

  relationships: {
    toggleLike(fromId: ID, toId: ID): Promise<{ patch: Patch; mutual: boolean }>;
    toggleFollow(fromId: ID, toId: ID, targetType: 'user' | 'org'): Promise<Patch>;
    sendFriendRequest(fromId: ID, toId: ID): Promise<Patch>;
    cancelFriendRequest(requestId: ID): Promise<Patch>;
    respondFriendRequest(requestId: ID, accept: boolean): Promise<Patch>;
    unfriend(a: ID, b: ID): Promise<Patch>;
    block(fromId: ID, toId: ID): Promise<Patch>;
    unblock(fromId: ID, toId: ID): Promise<Patch>;
  };

  orgs: {
    apply(orgId: ID, userId: ID): Promise<Patch>;
  };

  opportunities: {
    create(authorId: ID, input: OpportunityInput): Promise<{ opportunity: Opportunity; patch: Patch }>;
    /** 관심·지원 예정·지원 완료 설정 (null이면 해제) */
    setIntent(opportunityId: ID, userId: ID, intent: OpportunityIntent | null): Promise<Patch>;
    toggleSave(opportunityId: ID, userId: ID): Promise<Patch>;
    ask(opportunityId: ID, authorId: ID, text: string): Promise<Patch>;
    review(opportunityId: ID, authorId: ID, text: string, result?: 'accepted' | 'rejected' | 'attended'): Promise<Patch>;
  };

  proposals: {
    create(fromId: ID, toId: ID, input: Pick<ActivityProposal, 'category' | 'message' | 'when'>): Promise<Patch>;
    respond(id: ID, accept: boolean): Promise<Patch>;
  };

  /** Plan Together — 단체 약속 시간 투표 */
  together: {
    create(hostId: ID, input: TimePollInput): Promise<{ poll: TimePoll; patch: Patch }>;
    vote(pollId: ID, userId: ID, optionIds: ID[]): Promise<Patch>;
    addOption(pollId: ID, userId: ID, option: Omit<TimeOption, 'id'>): Promise<Patch>;
    /** 확정: 활동을 만들고 그 시간에 표를 던진 사람을 참가자로 초대한다 */
    decide(pollId: ID, optionId: ID): Promise<{ activity: Activity; patch: Patch }>;
    cancel(pollId: ID): Promise<Patch>;
  };

  chats: {
    send(roomId: ID, senderId: ID, text: string): Promise<Patch>;
    markRead(roomId: ID, userId: ID): Promise<Patch>;
    openDirect(a: ID, b: ID): Promise<{ room: ChatRoom; patch: Patch }>;
  };

  notifications: {
    markRead(id: ID): Promise<Patch>;
    markAllRead(userId: ID): Promise<Patch>;
  };

  reports: {
    create(reporterId: ID, targetType: ReportTargetType, targetId: ID, reason: string): Promise<Patch>;
  };

  system: {
    reset(): Promise<void>;
    /** 데모: 다음 요청 1회를 실패시킨다 (오류 상태 확인용) */
    failNext(): void;
    /** 써 본 사람이 남기는 의견 — 운영자에게 메일로 간다 */
    feedback(message: string, page: string): Promise<void>;
  };

  /** AI 기능 — 서버에 OpenAI 키(OPENAI_API_KEY 또는 API_KEY)가 있을 때만 enabled */
  ai: {
    status(): Promise<{ enabled: boolean }>;
    ask(messages: { role: 'user' | 'assistant'; content: string }[]): Promise<{ answer: string; cards: AiCard[] }>;
    profileDraft(text: string, schoolId: ID): Promise<{ draft: AiProfileDraft; suggestions: { clubs: AiCard[]; listings: AiCard[] } }>;
    starters(userId: ID, lang: 'en' | 'ko'): Promise<{ starters: string[] }>;
  };

  /** 서버 푸시(웹소켓 등)를 흉내내는 구독. 실제 API로 교체 시 SSE/WebSocket으로 대체 */
  subscribe(listener: (patch: Patch) => void): () => void;
}
