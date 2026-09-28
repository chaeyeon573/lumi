import type {
  Activity, ActivityProposal, ChatRoom, ID, Notification, Organization, Participation, Post, Relationships, Report, School, User,
  ActivityCategory, Visibility, JoinPolicy, ActivityKind, Place, ReportTargetType, Availability, Opportunity, OpportunityIntentRecord, OpportunityIntent, Role, TimePoll, TimeOption, Plan, Stage, Career, OpenTo, BoostTier,
  SavedSearch, PeopleSearch, Wants, VerificationMethod, GroupScope, Interest, NetworkRequest, RequestReach, StatusKind, StatusWhen, UserStatus, PrivacySettings, Trip, IntroRequest, ShareField, Research } from '@core/types';

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
  /** 저장한 사람 검색 (본인 것만 내려온다) */
  savedSearches: SavedSearch[];
  /** 네트워크 요청 (응답·추천 목록은 요청자와 당사자에게만 내려온다) */
  networkRequests: NetworkRequest[];
  /** "연결해줄 수 있나요?" (당사자에게만) */
  introRequests: IntroRequest[];
}

/** 변경된 엔티티만 담아 돌려주는 부분 응답. 스토어가 id 기준으로 병합한다. */
export type Patch = Partial<Omit<Snapshot, 'relationships'>> & {
  relationships?: Relationships;
  removed?: Partial<Record<'activities' | 'posts' | 'chatRooms' | 'participations' | 'proposals' | 'opportunityIntents' | 'timePolls' | 'organizations' | 'opportunities' | 'savedSearches' | 'networkRequests' | 'introRequests', ID[]>>;
};

export interface RegisterInput {
  /** 학교 이메일 — 실제 서버에서는 로그인 식별자로 쓴다 (프로필에는 노출되지 않음) */
  email?: string;
  /** 대학원생 연구 정보 (선택) */
  research?: Research;
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
  stage?: Stage;
  openTo?: OpenTo[];
  career?: Career;
  /** 거주 도시 (도시 단위). 없으면 학교 지역 */
  homeCity?: string;
  activityCity?: string;
  gradYear?: number;
  /** 학교 인증 방법 (온보딩에서 하나 이상 완료) */
  verification?: VerificationMethod;
  /** 무엇을 찾고 있나 (어떤 사람 · 어떤 활동) */
  wants?: Wants;
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

/** 네트워크 요청 만들기 — "이런 분을 찾고 있어요" */
export interface NetworkRequestInput {
  text: string;
  city?: string;
  field?: string;
  interests: Interest[];
  reach: RequestReach;
}

/** 자유 그룹 만들기 — 성격(scope)은 만든 사람이 고른다 */
export interface GroupInput {
  name: string;
  description: string;
  scope: GroupScope;
  city?: string;
  schoolId?: ID;
  joinPolicy: 'open' | 'approval';
  logo: Organization['logo'];
  interests?: Interest[];
}

export interface PostInput {
  text: string;
  media: Post['media'];
  tags: string[];
  visibility: Visibility;
  /** visibility === 'group' 일 때 */
  groupId?: ID;
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
    /** 연결 요청 1회 기록 — 무료 플랜 하루 한도(FREE_SWIPES_PER_DAY)를 넘기면 throw. sendFriendRequest 가 내부에서 호출 */
    recordSwipe(id: ID): Promise<Patch>;
    /** 요금제 변경 (모의 결제) */
    setPlan(id: ID, plan: Plan): Promise<Patch>;
    /** 생애 단계 변경 (재학생 → 졸업생 등). 온보딩 재요구 없음. 연결·글·그룹·인증·활동 기록은 모두 유지 */
    setStage(id: ID, stage: Stage, career?: Career, homeCity?: string, activityCity?: string): Promise<Patch>;
    setResearch(id: ID, research: Research | null): Promise<Patch>;
    /** 무엇을 찾고 있나 수정 (프로필 › 추천 설정) */
    updateWants(id: ID, wants: Wants): Promise<Patch>;
    /** 학교 인증 완료 (데모: 즉시) */
    verify(id: ID, method: VerificationMethod): Promise<Patch>;
    /** 저장 — 가장 가벼운 행동. 상대에게 알리지 않는다 */
    toggleSavePerson(id: ID, targetId: ID): Promise<Patch>;
    /** 가벼운 상태 켜기/끄기 (null = 끄기). 기간이 지나면 자동으로 꺼진다 */
    setStatus(id: ID, kind: StatusKind | null, when?: StatusWhen): Promise<Patch>;
    /** Open To 전체 저장 (여러 항목 · 항목별 기간 · 공개 대상) */
    setOpenStatuses(id: ID, statuses: UserStatus[]): Promise<Patch>;
    setPrivacy(id: ID, privacy: PrivacySettings): Promise<Patch>;
    /** 방문 예정 (도시·기간만) */
    setTrips(id: ID, trips: Trip[]): Promise<Patch>;
    /** 추천 카드·모임 숨기기 (다시 보이게 하려면 unhide) */
    hide(id: ID, kind: 'person' | 'activity', targetId: ID, unhide?: boolean): Promise<Patch>;
    pushRecentSearch(id: ID, q: string): Promise<Patch>;
    /** 저장 목록 — 만들기·이름 바꾸기·삭제·알림 */
    createSavedList(id: ID, name: string): Promise<Patch>;
    updateSavedList(id: ID, listId: ID, patch: { name?: string; notify?: boolean }): Promise<Patch>;
    deleteSavedList(id: ID, listId: ID): Promise<Patch>;
    /** 저장한 사람을 목록으로 옮기기 (null = 기본 목록만) */
    moveSaved(id: ID, targetId: ID, listId: ID | null): Promise<Patch>;
  };

  /** 네트워크 요청 — 사람 찾기 › 네트워크에 물어보기 */
  requests: {
    /** 요청을 만들고 관련 네트워크에 전달한다. 데모: 일부 사람이 잠시 후 '저예요' / 지인 추천으로 응답 */
    create(authorId: ID, input: NetworkRequestInput): Promise<{ request: NetworkRequest; matched: number; delivered: number; patch: Patch }>;
    close(id: ID): Promise<Patch>;
    /** "저예요" */
    respond(requestId: ID, userId: ID, note?: string, matched?: string[], shared?: ShareField[]): Promise<Patch>;
    /** 신고 (요청 숨김 포함) */
    report(requestId: ID, userId: ID, reason: string): Promise<Patch>;
    /** 요청자가 응답을 수락 → 서로 연결 + Mutual Room, 또는 거절 */
    decide(requestId: ID, responseId: ID, accept: boolean): Promise<{ roomId?: ID; patch: Patch }>;
    /** "제가 아는 사람이 있어요" — 후보에게 먼저 전달, 본인이 관심 있어요 해야 요청자에게 보인다 */
    refer(requestId: ID, referrerId: ID, candidateId: ID): Promise<Patch>;
    /** 추천받은 본인의 결정 — interested 면 응답(저예요)으로 전환 */
    referralDecide(requestId: ID, referralId: ID, interested: boolean): Promise<Patch>;
    /** "관심 없어요" — 이 요청을 다시 보지 않는다 */
    dismiss(requestId: ID, userId: ID): Promise<Patch>;
  };

  /** "연결해줄 수 있나요?" — 2촌에게 공통 연결을 통해 */
  intros: {
    create(fromId: ID, viaId: ID, toId: ID, note?: string): Promise<Patch>;
    /** 공통 연결이 전달 / 넘기기 */
    forward(introId: ID, viaId: ID, pass?: boolean): Promise<Patch>;
    /** 대상이 수락 → 연결 + 대화 / 거절 */
    respond(introId: ID, toId: ID, accept: boolean): Promise<{ roomId?: ID; patch: Patch }>;
  };

  /** 저장한 사람 검색 + 새 사람 알림 (AroundU+) */
  searches: {
    save(userId: ID, name: string, criteria: PeopleSearch, alert: boolean): Promise<Patch>;
    remove(id: ID): Promise<Patch>;
    setAlert(id: ID, alert: boolean): Promise<Patch>;
    /** 조건을 다시 실행해 매칭 수를 갱신하고, 알림이 켜져 있고 새 사람이 있으면 알림을 만든다 */
    run(userId: ID, id: ID): Promise<Patch>;
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
    /** Post Boost (모의 결제) */
    boost(postId: ID, tier: BoostTier, audiences: string[]): Promise<Patch>;
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
    /** 가입 — joinPolicy 'open' 이면 즉시 멤버, 아니면 지원 목록에 */
    apply(orgId: ID, userId: ID): Promise<Patch>;
    leave(orgId: ID, userId: ID): Promise<Patch>;
    /** 자유 그룹 만들기 (무료) */
    create(userId: ID, input: GroupInput): Promise<{ org: Organization; patch: Patch }>;
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
