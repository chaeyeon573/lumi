import type {
  Activity, ActivityProposal, ChatRoom, ID, Notification, Organization, Participation, Post, Relationships, Report, School, User,
  ActivityCategory, Visibility, JoinPolicy, ActivityKind, Place, ReportTargetType, Availability, Opportunity, OpportunityIntentRecord, OpportunityIntent, Role, TimePoll, TimeOption, Game, GameInput,
  ClassRoster, StudyGroupResponse,
} from '@core/types';
import type { AcademicDate } from '@core/lib/academic';
import type { SeatWatchView } from '@core/lib/seats';

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
  /** 아이스브레이커 게임 — 서버는 내가 보냈거나 받은 것만, 비밀을 지운 채로 내려준다 */
  games: Game[];
  /** 내가 듣는 수업별 같은 수업 학생 — 저장하지 않고 보는 사람마다 서버가 계산한다 (server/view.ts). 패치에 오면 통째로 바꾼다 */
  classRosters?: ClassRoster[];
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
  listingCrew?: Activity['listingCrew'];
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

/** 같이 가기 결과 — created: 내가 새로 열었는지 (아니면 있던 모임에 들어감) */
export interface GoTogetherResult { activity: Activity; created: boolean; roomId: ID; patch: Patch }
/** 오늘의 질문 집계 — counts 는 total >= min 일 때만 */
export interface DailyResults { questionId: string; date: string; total: number; min: number; counts: Record<string, number> | null; patch: Patch }

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
  /** 학기 라벨 "Fall 2026" (옛 행은 원본 코드일 수 있다 — 읽을 때 normalizeTermLabel) */
  term: string;
  /** 원본 사이트의 학기 코드 (FA26 · 202608 · 202630 …) — 표본 재확인용. 라벨과 같으면 생략 */
  termCode?: string;
  units?: number;
  /** 과목 공식 상세 페이지 (설명·선수과목·담당). 학교가 공개했으면 실라버스 링크 */
  url?: string;
  syllabusUrl?: string;
  /** 학교가 공개한 시험 일정만 (없으면 비워 둔다 — 지어내지 않는다). 스터디 그룹 제안을 시험 주에 앞당긴다 */
  exams?: { label: string; date: string }[];
}

/** 수업 방 공개 정보 (/c/<학교>/<코드>) — 로그인 전에도 보이므로 인원 수만, 사람은 없다 */
export interface ClassRoomInfo {
  schoolId: ID;
  schoolName: string;
  /** URL 의 학교 부분 ("berkeley") */
  schoolSlug: string;
  /** URL 의 과목 부분 ("cs61a") */
  codeSlug: string;
  code: string;
  term: string;
  title?: string;
  instructor?: string;
  meetings: { day: number; start: string; end: string }[];
  url?: string;
  /** 지금 학기 수업 목록에 있는지 */
  inCatalog: boolean;
  /** 같은 수업 Lumi 학생 수 (보이기를 켠 실제 학생만, 예시 프로필 제외) */
  count: number;
  /** 수업 목록 원본 (내 시간표에 추가할 때) */
  catalogCourse?: CatalogCourse;
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
    courses(schoolId: ID, query: string, department?: string, term?: string): Promise<CatalogCourse[]>;
    /** 학과(과목 분류) 목록 — term 을 안 주면 지금 학기 */
    departments(schoolId: ID, term?: string): Promise<{ name: string; count: number }[]>;
    /** 수업 목록이 있는 학기들과 기본(지금) 학기. current 가 '' 면 학기 구분 없이 본다 */
    terms(schoolId: ID): Promise<{ terms: string[]; current: string }>;
  };

  /** 학사 일정 (registrar 캘린더) — 지난 30일부터. 일정이 없는 학교는 빈 목록 */
  academic: {
    dates(schoolId: ID): Promise<{ dates: AcademicDate[] }>;
  };

  /** 좌석 알림 — 다음 학기 수업의 빈자리를 공개 시간표에서 지켜보고 알림 (수강신청은 학생이 CalCentral 에서) */
  seats: {
    mine(): Promise<SeatWatchView>;
    /** 카탈로그 수업 id 로 건다 */
    watch(courseId: ID): Promise<SeatWatchView>;
    unwatch(watchId: ID): Promise<SeatWatchView>;
  };

  users: {
    update(id: ID, patch: Partial<User>): Promise<Patch>;
    setAvailability(id: ID, availability: Availability): Promise<Patch>;
    /** 다른 사용자의 투표형 질문에 한 표 */
    votePoll(ownerId: ID, voterId: ID, optionIndex: number): Promise<Patch>;
    /** 오늘의 질문 — 같은 학교 답 집계. 5명 미만이면 counts 없이 total 만 (개인의 답은 내려가지 않는다) */
    dailyResults(viewerId: ID, questionId: string, date: string): Promise<DailyResults>;
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
    /** 같이 가기 — 이 행사에 연결된 작은 모임에 들어가거나(있으면) 새로 연다. 내 상태는 '갈 예정', 모임 그룹 채팅방을 돌려준다 */
    goTogether(opportunityId: ID, userId: ID): Promise<GoTogetherResult>;
    /** 같이 가기 → "아마도": 모임에서 빠지고 상태를 '관심'으로 */
    leaveTogether(opportunityId: ID, userId: ID): Promise<Patch>;
    /** 팀원 찾기 목록에 나를 올린다 (intent team + 이 공고에서 찾는 역할) */
    lookForTeam(opportunityId: ID, userId: ID, roles: Role[]): Promise<Patch>;
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

  /** 아이스브레이커 게임 ("Say hi" 대신). 보낼 수 있는 게임 목록은 @core/lib/icebreakers 의 offeredGames() */
  games: {
    /** 게임 보내기. this_or_that은 상대 답을 기다리고(pending), 나머지는 상대 프로필 답으로 바로 결과가 나와 1:1 채팅방이 열린다 */
    send(fromId: ID, toId: ID, input: GameInput): Promise<{ game: Game; patch: Patch }>;
    /** 받은 this_or_that에 답하기 → 결과 + 1:1 채팅방 */
    answer(gameId: ID, userId: ID, choice: 0 | 1): Promise<{ game: Game; patch: Patch }>;
    /** 받은 게임 넘기기 (보낸 사람에게 알리지 않는다) */
    decline(gameId: ID, userId: ID): Promise<Patch>;
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

  /** 같은 수업 (classmates) — 목록은 snapshot.classRosters 로 온다 */
  classes: {
    /** 수업 방 공개 정보 — 로그인 없이도 된다 */
    room(schoolSlug: string, codeSlug: string): Promise<ClassRoomInfo | null>;
    /** Lumi 가 제안한 스터디 그룹에 답하기 (in · other · no). other 면 preferred 에 원하는 시간 */
    respond(activityId: ID, userId: ID, response: StudyGroupResponse, preferred?: { day: number; start: string; end: string }): Promise<Patch>;
    /** 파트너 찾기 목록에 올리기(note 는 한 줄) · null 이면 내리기 (짝을 찾았어요) */
    setPartner(userId: ID, classKey: string, note: string | null): Promise<Patch>;
  };

  /** 서버 푸시(웹소켓 등)를 흉내내는 구독. 실제 API로 교체 시 SSE/WebSocket으로 대체 */
  subscribe(listener: (patch: Patch) => void): () => void;
}
