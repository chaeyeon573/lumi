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

export interface AroundUApi {
  auth: {
    loginDemo(): Promise<User>;
    /** 가입한 학교 이메일로 받은 코드로 로그인 (mock: 123456) */
    loginWithCode(email: string, code: string): Promise<User>;
    register(input: RegisterInput): Promise<User>;
    logout(): Promise<void>;
    session(): Promise<ID | null>;
  };
  bootstrap(viewerId: ID): Promise<Snapshot>;

  schools: {
    search(query: string): Promise<School[]>;
    sendVerificationCode(email: string, schoolId: ID): Promise<{ ok: boolean; hint: string }>;
    verifyCode(email: string, code: string): Promise<{ ok: boolean }>;
  };

  catalog: {
    /** 학교 수업 검색 (과목 코드·이름·교수) */
    courses(schoolId: ID, query: string): Promise<CatalogCourse[]>;
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
  };

  /** 서버 푸시(웹소켓 등)를 흉내내는 구독. 실제 API로 교체 시 SSE/WebSocket으로 대체 */
  subscribe(listener: (patch: Patch) => void): () => void;
}
