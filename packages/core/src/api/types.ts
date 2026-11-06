import type { AccountExport } from '@core/lib/exportdata';
import type {
  Activity, ActivityProposal, ChatRoom, ID, Notification, Organization, Participation, Post, Relationships, Report, School, User, Self,
  ActivityCategory, Visibility, JoinPolicy, ActivityKind, Place, ReportTargetType, Availability, Opportunity, OpportunityIntentRecord, OpportunityIntent, Role, TimePoll, TimeOption, Game, GameInput,
  ClassRoster, StudyGroupResponse,
} from '@core/types';
import type { AcademicDate } from '@core/lib/academic';
import type { SeatWatchView } from '@core/lib/seats';
import type { Ride, RideInput, RideTeaser } from '@core/lib/rides';
import type { OrgHit } from '@core/lib/signup';
import type { PlansApi } from './plans';
import type { TimePollWindow } from '@core/types';
import type { ClassQuestionView } from '@core/lib/classqa';
import type { CourseReviewsView, ExamInfoView, ExamInput, ReviewInput, TermPromptView } from '@core/lib/coursereviews';
import type { PublicExplore } from '@core/lib/publicexplore';
import type { OrgJoinPolicy } from '@core/types';
import type { AdvancedPeopleFilter, CheckoutPlatform, CheckoutResult, PlusStatus } from '@core/lib/plus';
import type { ClubSetupView, HowToJoinInput, RequestStatus } from '@core/lib/clubjoin';
import type { SavedEntryInput, SavedPeopleView } from '@core/lib/savedpeople';

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
  /** Rides (ride share) — server sends my school's rides, riders and chat only to the people in each ride (server/view.ts) */
  rides?: Ride[];
}

/** 변경된 엔티티만 담아 돌려주는 부분 응답. 스토어가 id 기준으로 병합한다. */
export type Patch = Partial<Omit<Snapshot, 'relationships'>> & {
  relationships?: Relationships;
  /** users · games · notifications: only when an account is deleted (lib/account) */
  removed?: Partial<Record<'activities' | 'posts' | 'chatRooms' | 'participations' | 'proposals' | 'opportunityIntents' | 'timePolls' | 'organizations' | 'opportunities' | 'schools' | 'rides' | 'users' | 'games' | 'notifications', ID[]>>;
};

export interface RegisterInput {
  /** 학교 이메일 — 실제 서버에서는 로그인 식별자로 쓴다 (프로필에는 노출되지 않음) */
  email?: string;
  nickname: string;
  birthYear: number;
  gender: Self['gender'];
  avatar: User['avatar'];
  schoolId: ID;
  role: 'undergraduate' | 'graduate' | 'alumni';
  department: string;
  year: number;
  emailVerified: boolean;
  showSchool: boolean;
  showDepartment: boolean;
  interests: Self['interests'];
  purposes: Self['purposes'];
  bio: string;
  likes: string;
  freeTime: string;
  height?: number;
  availability: Availability;
  preferredPartner?: string;
  fieldVisibility: User['fieldVisibility'];
  prompts: Self['prompts'];
  voicePrompt?: User['voicePrompt'];
  poll?: User['poll'];
  timetable?: Self['timetable'];
  goals: Self['goals'];
  lookingFor?: User['lookingFor'];
  canOffer?: User['canOffer'];
  living?: User['living'];
  meetPreference?: Self['meetPreference'];
  /** 가입하면서 저장한 동아리 */
  interestedOrgIds?: ID[];
  locationPermission: Self['settings']['locationPermission'];
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
  audience?: Activity['audience'];
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

/** 그룹 만들기 (S026) — 만든 사람이 운영진이 되고, 가입 방식(승인제·열림)을 고른다. 학교는 만든 사람의 학교 */
export interface OrgInput {
  name: string;
  description: string;
  type: Extract<Organization['type'], 'club' | 'lab' | 'coop' | 'council'>;
  joinPolicy: OrgJoinPolicy;
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
  /** 원본 사이트의 수업 번호 (Berkeley: classes.berkeley.edu 의 node id) — 딸린 토론·랩 섹션을 찾을 때 쓴다 */
  sourceId?: string;
  /** 가져올 때 원본에 같이 있던 딸린 섹션 (Stanford·MIT) — 없으면 Berkeley 처럼 고를 때 읽어 온다. 검색 결과로는 내려보내지 않는다 */
  sections?: CatalogSection[];
}

/** 강의에 딸린 토론·랩 섹션 하나 (Berkeley "DIS 118" · "LAB 119L") — 학교 공개 시간표에 있는 것만, 지어내지 않는다 */
export interface CatalogSection {
  /** "DIS 118" — 시간표 수업의 section 으로 그대로 저장한다 */
  label: string;
  /** DIS · LAB · REC … */
  kind: string;
  meetings: { day: number; start: string; end: string }[];
  location?: string;
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
  /** 장소 후보 이름들 (S033 Location Ideas, 최대 6개) */
  placeOptions?: string[];
  /** 한 주 격자 투표 (S032) — options 는 그 주의 칸들 */
  window?: TimePollWindow;
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
  | { kind: 'activity'; id: ID; title: string; date: string; startTime: string; place: string; category: Activity['category']; sample?: boolean };

/** 대화형 가입이 채워 주는 프로필 */
export interface AiProfileDraft {
  department: string; role: 'undergraduate' | 'graduate' | 'alumni' | 'unknown'; yearInSchool: number;
  goals: Self['goals']; interests: Self['interests']; purposes: Self['purposes']; lookingFor: User['lookingFor']; canOffer: User['canOffer'];
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
    /**
     * Student-ID accounts only: any e-mail just for signing in (the code comes from `schools.sendVerificationCode(email, '')`,
     * the login path). Never school verification, never the badge (server/signin-email.ts). Returns me
     */
    addSignInEmail(email: string, code: string): Promise<User>;
    /** Permanently delete my account and personal data (App Store 5.1.1(v)). `confirm` must be "DELETE". Signs out. Demo/sample accounts are refused */
    deleteAccount(confirm: string): Promise<void>;
    /** Download your data (S086): my own records as JSON (@core/lib/exportdata). Only ever the signed-in caller */
    exportData(): Promise<AccountExport>;
  };
  bootstrap(viewerId: ID): Promise<Snapshot>;

  /** Student ID photo verification (server/idverify.ts) — the fallback when a school e-mail can't be used */
  verification: {
    /** Send (or re-send) a photo of the student ID — a JPEG data: URL already shrunk and redrawn on the device. Returns me */
    submitStudentId(dataUrl: string): Promise<User>;
  };

  schools: {
    search(query: string): Promise<School[]>;
    sendVerificationCode(email: string, schoolId: ID): Promise<{ ok: boolean; hint: string }>;
    verifyCode(email: string, code: string): Promise<{ ok: boolean }>;
    /** 첫 화면에 띄우는 이번 주 하이라이트 (로그인 전에도) — 없으면 null */
    highlights(schoolId: ID): Promise<Highlights | null>;
    /** Sign-up S010 "Search organizations" (signed out): clubs of an open school by name — public facts only (@core/lib/signup) */
    searchOrgs(schoolId: ID, query: string): Promise<OrgHit[]>;
  };

  catalog: {
    /** 학교 수업 검색 (과목 코드·이름·교수) */
    courses(schoolId: ID, query: string, department?: string, term?: string): Promise<CatalogCourse[]>;
    /** 학과(과목 분류) 목록 — term 을 안 주면 지금 학기 */
    departments(schoolId: ID, term?: string): Promise<{ name: string; count: number }[]>;
    /** 수업 목록이 있는 학기들과 기본(지금) 학기. current 가 '' 면 학기 구분 없이 본다 */
    terms(schoolId: ID): Promise<{ terms: string[]; current: string }>;
    /** 강의에 딸린 토론·랩 섹션 — 학교 시간표에서 그때 읽어 온다. 없거나 못 읽으면 빈 목록 */
    sections(schoolId: ID, courseId: ID): Promise<CatalogSection[]>;
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
    /** 자리가 찼을 때 대기 명단에 (S046). 자리가 있으면 join 과 같다 */
    joinWaitlist(activityId: ID, userId: ID): Promise<Patch>;
    /** Interested(관심) 켜기·끄기 — 참석(Going)과 따로 */
    toggleInterest(activityId: ID, userId: ID): Promise<Patch>;
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
    /** 열린 그룹에 가입 (S026 open). 가입 요청(동의 문구 포함)은 clubs.ask */
    apply(orgId: ID, userId: ID, consent?: string): Promise<Patch>;
    /** 내 가입 요청 거두기 — 그 동아리 운영진은 더 이상 메시지를 보낼 수 없다 */
    withdraw(orgId: ID, userId: ID): Promise<Patch>;
    /** S026 — 학생이 그룹을 만든다 (만든 사람 = 운영진) */
    create(creatorId: ID, input: OrgInput): Promise<{ org: Organization; patch: Patch }>;
    /** S091 — 운영진이 가입 요청을 승인(accept) / 거절한다 */
    respondApplication(orgId: ID, userId: ID, accept: boolean): Promise<Patch>;
    /** S022 — 회원·운영진이 그룹에서 나간다 (마지막 운영진은 못 나간다, 이유를 던진다) */
    leave(orgId: ID, userId: ID): Promise<Patch>;
  };

  /**
   * 동아리 "Ask to join" (2026-11-06, server/clubs.ts · @core/lib/clubjoin) — 동의하고 요청, 운영진 확인 링크(동아리 공식 이메일로만),
   * 운영진 설정 (/club-setup/:token, 계정 없이) · 운영진 계정으로 가입 방법·사진·요청한 학생에게 메시지
   */
  clubs: {
    ask(orgId: ID, consent: string): Promise<{ patch: Patch; status: RequestStatus }>;
    manageLink(orgId: ID): Promise<{ sent: boolean; message: string }>;
    setup(token: string): Promise<ClubSetupView>;
    saveSetup(token: string, info: HowToJoinInput): Promise<ClubSetupView>;
    setupPhoto(token: string, kind: 'logo' | 'cover', dataUrl: string | null): Promise<{ url: string | null }>;
    claim(token: string): Promise<{ orgId: ID; patch: Patch }>;
    saveHowToJoin(orgId: ID, info: HowToJoinInput): Promise<Patch>;
    photo(orgId: ID, kind: 'logo' | 'cover', dataUrl: string | null): Promise<{ url: string | null; patch: Patch }>;
    message(orgId: ID, studentIds: ID[], text: string): Promise<{ sent: number; skipped: number; patch: Patch }>;
  };

  /** 로그인 없이 — 열린 학교의 공개 행사·공고·동아리 (사람 정보 없음, S089) */
  guest: {
    explore(schoolId: ID): Promise<PublicExplore>;
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
    /** 확정: 활동을 만들고 그 시간에 표를 던진 사람을 참가자로 초대한다. placeId 를 주면 그 장소 후보로 (S034) */
    decide(pollId: ID, optionId: ID, placeId?: ID): Promise<{ activity: Activity; patch: Patch }>;
    cancel(pollId: ID): Promise<Patch>;
    /** 장소 후보 중 괜찮은 곳들 (S036 Places) — 주최자·초대받은 사람만, 열린 투표만 */
    votePlace(pollId: ID, userId: ID, placeIds: ID[]): Promise<Patch>;
  };

  /** 링크로 묻는 약속 (/p/<id>) — Plan Together 를 그대로 쓰고 계정 없는 친구도 답한다 (@core/api/plans) */
  plans: PlansApi;

  /** 아이스브레이커 게임 ("Say hi" 대신). 보낼 수 있는 게임 목록은 @core/lib/icebreakers 의 offeredGames() */
  games: {
    /** 게임 보내기. this_or_that은 상대 답을 기다리고(pending), 나머지는 상대 프로필 답으로 바로 결과가 나와 1:1 채팅방이 열린다 */
    send(fromId: ID, toId: ID, input: GameInput): Promise<{ game: Game; patch: Patch }>;
    /** 받은 this_or_that에 답하기 → 결과 + 1:1 채팅방 */
    answer(gameId: ID, userId: ID, choice: 0 | 1): Promise<{ game: Game; patch: Patch }>;
    /** 받은 게임 넘기기 (보낸 사람에게 알리지 않는다) */
    decline(gameId: ID, userId: ID): Promise<Patch>;
  };

  /** Ride share — post, join, leave; the host can close, reopen, edit or cancel. teaser() works signed out */
  rides: {
    create(hostId: ID, input: RideInput): Promise<{ ride: Ride; patch: Patch }>;
    join(rideId: ID, userId: ID): Promise<{ ride: Ride; roomId: ID; patch: Patch }>;
    leave(rideId: ID, userId: ID): Promise<Patch>;
    close(rideId: ID, hostId: ID): Promise<Patch>;
    reopen(rideId: ID, hostId: ID): Promise<Patch>;
    cancel(rideId: ID, hostId: ID): Promise<Patch>;
    update(rideId: ID, hostId: ID, changes: Partial<Pick<RideInput, 'seats' | 'estTotal' | 'note' | 'start' | 'end'>>): Promise<Patch>;
    teaser(rideId: ID): Promise<RideTeaser | null>;
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

  /** iPhone app push token (apps/shell → server/push.ts). unregister works signed out (sign-out, logout on a shared phone) */
  push: {
    register(token: string, device: { platform: 'ios' | 'android'; appVersion?: string }): Promise<{ registered: boolean }>;
    unregister(token: string): Promise<void>;
    /** the chat room open on this screen (null = none) — no chat push for it while open (server/chat-push.ts). Never throws */
    viewing(roomId: ID | null): Promise<void>;
  };

  system: {
    reset(): Promise<void>;
    /** 데모: 다음 요청 1회를 실패시킨다 (오류 상태 확인용) */
    failNext(): void;
    /** 써 본 사람이 남기는 의견 — 운영자에게 메일로 간다 */
    feedback(message: string, page: string): Promise<void>;
    /** 사진 한 장 올리기 — 줄인 사진의 data: URL 을 받아 글에 붙일 주소를 돌려준다 (server/media.ts) */
    uploadPhoto(dataUrl: string): Promise<{ url: string }>;
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

  /** 수업 질문 (S030 Questions) — 그 수업을 듣는, 학교 이메일을 인증한 학생끼리만. 스냅샷 밖 (server/classqa.ts) */
  classQA: {
    /** key = 수업 키 (@core/lib/classmates classKey) */
    list(key: string): Promise<ClassQuestionView[]>;
    ask(key: string, text: string): Promise<ClassQuestionView[]>;
    answer(questionId: ID, text: string): Promise<ClassQuestionView[]>;
    /** 내가 쓴 질문·답 지우기 (answerId 없으면 질문 통째로) */
    remove(questionId: ID, answerId?: ID): Promise<ClassQuestionView[]>;
  };

  /** 수업 리뷰 · 시험 정보 (course page › Reviews · Exam info) — 규칙 @core/lib/coursereviews, 저장 server/coursereviews.ts. 글쓴이 id 는 내려오지 않는다 */
  courseReviews: {
    /** code = 과목 코드 ("CS 61A"), 학교는 보는 사람의 학교 */
    view(code: string, filter?: { instructor?: string; term?: string }): Promise<CourseReviewsView>;
    save(input: ReviewInput): Promise<CourseReviewsView>;
    remove(id: ID): Promise<CourseReviewsView>;
    /** 도움돼요 누르기·취소 */
    helpful(id: ID): Promise<CourseReviewsView>;
    exam(code: string): Promise<ExamInfoView>;
    saveExam(input: ExamInput): Promise<ExamInfoView>;
    removeExam(id: ID): Promise<ExamInfoView>;
    instructors(code: string, term: string): Promise<{ instructors: string[] }>;
    /** 학기 말 안내의 단계 화면 */
    term(term: string): Promise<TermPromptView>;
    /** 목록 줄 별점 — 과목 slug → ★ (리뷰 3개 이상인 수업만) */
    stars(codes?: string[]): Promise<{ stars: Record<string, { avg: number; count: number }> }>;
  };

  /** Lumi+ (S087·S088) — 무엇인지는 @core/lib/plus, 막는 건 서버 (server/plus.ts). 오프라인 데모는 늘 꺼짐 */
  plus: {
    status(): Promise<PlusStatus>;
    /** S088 Continue Securely — 결제사가 붙기 전에는 늘 { status: 'unavailable' } (성공을 흉내내지 않는다) */
    checkout(platform: CheckoutPlatform): Promise<CheckoutResult>;
    /** S059 언어·관심사·커뮤니티 조건에 맞는 사람 id (플래그가 켜지면 Lumi+ 만) */
    matchPeople(filter: AdvancedPeopleFilter): Promise<{ ids: ID[] }>;
  };

  /** 저장한 사람 폴더·비공개 메모 (S077) — 본인만. 스냅샷 밖 (server/savedpeople.ts) */
  savedPeople: {
    view(): Promise<SavedPeopleView>;
    createFolder(name: string): Promise<SavedPeopleView>;
    renameFolder(folderId: ID, name: string): Promise<SavedPeopleView>;
    removeFolder(folderId: ID): Promise<SavedPeopleView>;
    setEntry(personId: ID, input: SavedEntryInput): Promise<SavedPeopleView>;
  };

  /** 서버 푸시(웹소켓 등)를 흉내내는 구독. 실제 API로 교체 시 SSE/WebSocket으로 대체 */
  subscribe(listener: (patch: Patch) => void): () => void;
}
