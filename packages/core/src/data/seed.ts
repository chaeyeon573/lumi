import type {
  Activity, ActivityProposal, ChatRoom, Notification, Organization, Participation, Post, Relationships, School, User, Visibility, ProfileField, Opportunity, OpportunityIntentRecord, TimePoll, Course, SavedSearch, NetworkRequest, IntroRequest } from '@core/types';
import { addDaysISO, isoHoursAgo, isoMinutesAgo, todayISO } from '@core/lib/format';
import { photo } from '@core/lib/assets';

const T = todayISO();
const T1 = addDaysISO(1);
const T2 = addDaysISO(2);
const T4 = addDaysISO(4);
const T9 = addDaysISO(9);
/** 지금부터 n분 뒤 (HH:MM) — Now 피드용 예시 활동은 항상 '곧' 시작한다 */
const nowPlus = (n: number) => { const d = new Date(Date.now() + n * 60000); const h = Math.min(23, d.getHours()); return `${String(h).padStart(2, '0')}:${String(h === 23 ? 0 : Math.floor(d.getMinutes() / 5) * 5).padStart(2, '0')}`; };

export const DEMO_USER_ID = 'u_me';

const defaultVisibility = (v: Visibility = 'school'): Record<ProfileField, Visibility> => ({
  bio: v, likes: v, freeTime: v, height: 'private', availability: v, preferredPartner: 'private', purposes: v, interests: 'public', posts: v, prompts: 'public', timetable: 'friends', goals: 'school', living: 'friends',
});

export const schools: School[] = [
  { id: 's_yonsei', name: '연세대학교', emailDomain: 'yonsei.ac.kr', region: '신촌', center: { lat: 37.5636, lng: 126.9376 } },
  { id: 's_ewha', name: '이화여자대학교', emailDomain: 'ewhain.net', region: '신촌', center: { lat: 37.5618, lng: 126.9466 } },
  { id: 's_sogang', name: '서강대학교', emailDomain: 'sogang.ac.kr', region: '신촌', center: { lat: 37.5511, lng: 126.9410 } },
  { id: 's_hongik', name: '홍익대학교', emailDomain: 'hongik.ac.kr', region: '홍대', center: { lat: 37.5511, lng: 126.9250 } },
  { id: 's_snu', name: '서울대학교', emailDomain: 'snu.ac.kr', region: '관악', center: { lat: 37.4602, lng: 126.9527 } },
  { id: 's_korea', name: '고려대학교', emailDomain: 'korea.ac.kr', region: '안암', center: { lat: 37.5895, lng: 127.0323 } },
  { id: 's_kaist', name: 'KAIST', emailDomain: 'kaist.ac.kr', region: '대전 유성', center: { lat: 36.3721, lng: 127.3604 } },
];

const mk = (u: Partial<User> & Pick<User, 'id' | 'nickname'>): User => ({
  birthYear: 2002,
  gender: 'private',
  avatar: { emoji: '🙂', hue: 210, photoType: 'face' },
  identityVerified: false,
  affiliation: {
    type: 'university', schoolId: 's_yonsei', schoolName: '연세대학교', role: 'undergraduate', department: '경영학과', year: 2021,
    emailVerified: true, showSchool: true, showDepartment: true,
  },
  bio: '',
  likes: '',
  freeTime: '',
  availability: 'after18',
  interests: [],
  purposes: ['friend'],
  region: '신촌',
  prompts: [],
  timetable: [],
  goals: [],
  lookingFor: [],
  canOffer: [],
  interestedOrgIds: [],
  meetPreference: ['same_hobby', 'same_goal'],
  openTo: ['coffee', 'activities'],
  fieldVisibility: defaultVisibility(),
  settings: { messagePolicy: 'connected', notifications: true, locationPermission: 'granted' },
  createdAt: isoHoursAgo(24 * 30),
  ...u,
});

/** 데모 계정의 예시 시간표 — 처음엔 비어 있고, 시간표 화면에서 한 번에 불러올 수 있다 */
export const DEMO_TIMETABLE: Course[] = [{ id: 'c1', name: '데이터베이스', day: 0, start: '10:00', end: '11:15', room: '공학관 B103', hue: 220 }, { id: 'c2', name: '운영체제', day: 0, start: '13:00', end: '14:15', room: '공학관 A201', hue: 160 }, { id: 'c3', name: '데이터베이스', day: 2, start: '10:00', end: '11:15', room: '공학관 B103', hue: 220 }, { id: 'c4', name: '운영체제', day: 2, start: '13:00', end: '14:15', room: '공학관 A201', hue: 160 }, { id: 'c5', name: '창업과 혁신', day: 1, start: '15:00', end: '17:45', room: '경영관 201', hue: 15 }, { id: 'c6', name: '캡스톤 디자인', day: 3, start: '14:00', end: '16:45', room: '공학관 세미나실', hue: 280 }, { id: 'c7', name: '영어 회화', day: 4, start: '11:00', end: '12:15', room: '외솔관 302', hue: 45 }];

export const users: User[] = [
  mk({
    id: DEMO_USER_ID, nickname: '하늘', birthYear: 2001, gender: 'private',
    avatar: { emoji: '🧑‍💻', hue: 230, photoType: 'face' , url: photo('p_me') }, photos: [photo('p_me'), photo('c_cafe_laptop'), photo('c_espresso')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_yonsei', schoolName: '연세대학교', role: 'undergraduate', department: '컴퓨터과학과', year: 2020, emailVerified: true, showSchool: true, showDepartment: true },
    bio: '사이드 프로젝트와 커피를 좋아하는 4학년. 새로운 사람과 이야기하는 걸 좋아해요.',
    likes: '스페셜티 커피, 인디 음악, 전시 보기',
    freeTime: '카페에서 코딩하거나 백양로 산책',
    availability: 'after18',
    interests: ['coffee', 'study', 'startup', 'exhibition', 'exercise'],
    purposes: ['friend', 'study', 'networking'],
    nowWant: '오늘 저녁 신촌에서 커피 한 잔?',
    fieldVisibility: defaultVisibility('school'),
    prompts: [{ questionId: 'q_now', answer: '정문 카페에서 커피 마시면서 사이드 프로젝트 얘기' }, { questionId: 'q_spot', answer: '중도 4층 창가, 오후엔 햇빛이 딱 좋아요' }, { questionId: 'q_emoji', answer: '☕💻🖼️' }, { questionId: 'q_ask_me', answer: '리액트, 신촌 카페 지도, 전시 추천' }],
    voicePrompt: { questionId: 'v_now', durationSec: 18, recordedAt: isoHoursAgo(40) },
    poll: { questionId: 'p_gap', options: ['카페', '도서관', '산책'], ownChoice: 0, votes: { u_sua: 0, u_jimin: 2 } },
    timetable: [],
    goals: ['startup', 'hackathon', 'friends'], lookingFor: ['designer', 'teammate', 'cofounder'], canOffer: ['developer', 'planning'], living: { residence: 'offcampus', zone: '신촌 북쪽' }, interestedOrgIds: ['o_ailab', 'o_startup'], meetPreference: ['same_goal', 'same_class', 'same_hobby'], openToNew: true,
  }),
  mk({
    id: 'u_jimin', nickname: '지민', birthYear: 2002, gender: 'female',
    avatar: { emoji: '👩‍🎨', hue: 20, photoType: 'face' , url: photo('p_jimin') }, photos: [photo('p_jimin'), photo('p_x2'), photo('c_road_sunset'), photo('c_stage')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_yonsei', schoolName: '연세대학교', role: 'undergraduate', department: '경영학과', year: 2021, emailVerified: true, showSchool: true, showDepartment: true },
    bio: '카페, 전시회, 러닝을 좋아해요. 창업 동아리에서 마케팅을 맡고 있어요.',
    likes: '핸드드립, 미술관 데이트, 한강 러닝',
    freeTime: '전시 보러 가거나 새로 생긴 카페 탐방',
    availability: 'after18',
    interests: ['coffee', 'exhibition', 'exercise', 'startup', 'networking'],
    purposes: ['friend', 'networking', 'dating'],
    nowWant: '오늘 신촌에서 커피 마실 사람?',
    prompts: [{ questionId: 'q_now', answer: '오늘 6시 신촌에서 커피, 창업 얘기 환영' }, { questionId: 'q_cafe', answer: '커피리브레 신촌점 플랫화이트' }, { questionId: 'q_role', answer: '분위기 메이커 겸 일정 잡는 사람' }, { questionId: 'q_always', answer: '전시회. 특히 사진전' }],
    voicePrompt: { questionId: 'v_campus', durationSec: 24, recordedAt: isoHoursAgo(70) },
    poll: { questionId: 'p_first', options: ['커피', '밥', '같이 운동'], ownChoice: 0, votes: { u_sua: 0, u_taeho: 1, u_hana: 0 } },
    timetable: [{ id: 'c1', name: '마케팅 원론', day: 0, start: '10:30', end: '11:45', hue: 20 }, { id: 'c2', name: '마케팅 원론', day: 2, start: '10:30', end: '11:45', hue: 20 }, { id: 'c3', name: '창업과 혁신', day: 1, start: '15:00', end: '17:45', hue: 15 }, { id: 'c4', name: '회계 원리', day: 3, start: '13:00', end: '14:15', hue: 200 }],
    goals: ['startup', 'friends', 'dating'], lookingFor: ['developer', 'cofounder', 'friend'], canOffer: ['marketing', 'presentation', 'planning'], living: { residence: 'dorm', zone: '신촌 북쪽' }, interestedOrgIds: ['o_startup'],
    openToNew: true, dailyAnswer: { questionId: 'd_free2h', answer: 'coffee', date: T },
  }),
  mk({
    id: 'u_dohyun', nickname: '도현', birthYear: 2000, gender: 'male',
    avatar: { emoji: '🧑‍🔬', hue: 160, photoType: 'face' , url: photo('p_dohyun') }, photos: [photo('p_dohyun'), photo('c_desktop'), photo('c_abstract1')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_yonsei', schoolName: '연세대학교', role: 'graduate', department: '인공지능학과', year: 2024, emailVerified: true, showSchool: true, showDepartment: true },
    bio: 'AI 연구실 석사 1년차. 논문 스터디 같이 하실 분 환영합니다.',
    likes: '논문 읽기, 보드게임, 클라이밍',
    freeTime: '공학관 근처에서 클라이밍',
    availability: 'afternoon',
    interests: ['research', 'study', 'exercise', 'coffee'],
    purposes: ['study', 'networking'],
    nowWant: 'LLM 논문 같이 읽을 분',
    prompts: [{ questionId: 'q_now', answer: '클라이밍. 초보 같이 가요' }, { questionId: 'q_after_class', answer: '월·수 4시 이후, 연구실 근처' }, { questionId: 'q_study_type', answer: '조용히 각자 읽고 30분 토론' }, { questionId: 'q_project', answer: '멀티모달 LLM 논문 리뷰, 학부생 세미나 준비' }],
    poll: { questionId: 'p_study', options: ['중도 붙박이', '카페 노마드', '집에서 벼락치기'], ownChoice: 0, votes: { u_yuna: 0 } },
    timetable: [{ id: 'c1', name: '고급 기계학습', day: 1, start: '10:00', end: '12:45', hue: 170 }, { id: 'c2', name: '연구실 세미나', day: 2, start: '16:00', end: '17:30', hue: 190 }],
    goals: ['lab', 'hackathon'], lookingFor: ['teammate', 'study_partner'], canOffer: ['research', 'data', 'developer'], living: { residence: 'offcampus', zone: '공학관 근처' }, interestedOrgIds: ['o_ailab'],
  }),
  mk({
    id: 'u_seoyeon', nickname: '서연', birthYear: 2003, gender: 'female',
    avatar: { emoji: '🎸', hue: 290, photoType: 'masked' , url: photo('p_seoyeon') }, photos: [photo('p_seoyeon'), photo('p_x4'), photo('c_tabby'), photo('c_eguitar')], identityVerified: false,
    affiliation: { type: 'university', schoolId: 's_yonsei', schoolName: '연세대학교', role: 'undergraduate', department: '심리학과', year: 2022, emailVerified: true, showSchool: true, showDepartment: false },
    bio: '밴드 동아리 기타. 주말엔 홍대 공연 보러 다녀요.',
    likes: '록 음악, 떡볶이, 고양이',
    freeTime: '합주실에서 연습',
    availability: 'weekend',
    interests: ['club', 'exhibition', 'meal', 'walk'],
    purposes: ['friend', 'hobby', 'club'],
    nowWant: '주말에 공연 같이 볼 사람',
    prompts: [{ questionId: 'q_now', answer: '홍대 작은 공연 같이 보러 갈 사람' }, { questionId: 'q_free_day', answer: '토요일 오후. 공연 보러 가요' }, { questionId: 'q_emoji', answer: '🎸🐈🍜' }, { questionId: 'q_into', answer: '요즘 90년대 브릿팝 다시 파는 중' }],
    voicePrompt: { questionId: 'v_song', durationSec: 29, recordedAt: isoHoursAgo(100) },
    timetable: [{ id: 'c1', name: '심리통계', day: 0, start: '09:00', end: '10:15', hue: 200 }, { id: 'c2', name: '인지심리학', day: 0, start: '15:00', end: '16:15', hue: 300 }, { id: 'c3', name: '심리통계', day: 2, start: '09:00', end: '10:15', hue: 200 }, { id: 'c4', name: '발달심리학', day: 1, start: '13:00', end: '14:15', hue: 120 }, { id: 'c5', name: '음악의 이해', day: 3, start: '10:00', end: '11:15', hue: 280 }],
    goals: ['friends', 'hobby', 'join_club'], lookingFor: ['friend'], canOffer: ['video', 'club_ops'], living: { residence: 'dorm', zone: '신촌 북쪽' }, interestedOrgIds: ['o_band'],
  }),
  mk({
    id: 'u_minjun', nickname: '민준', birthYear: 2001, gender: 'male',
    avatar: { emoji: '🏃', hue: 120, photoType: 'back' , url: photo('p_minjun') }, photos: [photo('p_minjun'), photo('c_road_sunset'), photo('c_basketball')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_sogang', schoolName: '서강대학교', role: 'undergraduate', department: '경제학과', year: 2020, emailVerified: true, showSchool: true, showDepartment: true },
    bio: '매일 아침 러닝. 신촌 러닝 크루 운영 중입니다.',
    likes: '러닝, 단백질 쉐이크, 자전거',
    freeTime: '한강 자전거',
    availability: 'now',
    interests: ['exercise', 'cycling', 'walk', 'meal'],
    purposes: ['friend', 'hobby'],
    nowWant: '오후 7시 러닝 같이 뛰어요',
    prompts: [{ questionId: 'q_now', answer: '러닝. 페이스 맞춰드려요' }, { questionId: 'q_morning', answer: '아침형. 6시에 한강 뜁니다' }, { questionId: 'q_first_meet', answer: '가볍게 5km 뛰고 국밥' }],
    poll: { questionId: 'p_weekend', options: ['바로 나감', '집이 좋아', '전시·공연이면 나감'], ownChoice: 0, votes: {} },
    goals: ['hobby', 'friends', 'internship'], lookingFor: ['friend', 'senior'], canOffer: ['club_ops', 'presentation'], living: { residence: 'commute', zone: '서강대 근처' }, interestedOrgIds: [],
    openToNew: true, dailyAnswer: { questionId: 'd_free2h', answer: 'exercise', date: T },
  }),
  mk({
    id: 'u_yuna', nickname: '유나', birthYear: 2002, gender: 'female',
    avatar: { emoji: '📚', hue: 45, photoType: 'face' , url: photo('p_yuna') }, photos: [photo('p_yuna'), photo('p_x3'), photo('c_library')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_ewha', schoolName: '이화여자대학교', role: 'undergraduate', department: '통계학과', year: 2021, emailVerified: true, showSchool: true, showDepartment: true },
    bio: '통계 스터디 모집 중. 조용한 카페에서 공부하는 걸 좋아해요.',
    likes: 'R, 크로플, 산책',
    freeTime: '도서관 근처 카페',
    availability: 'afternoon',
    interests: ['study', 'coffee', 'walk', 'research'],
    purposes: ['study', 'friend'],
    nowWant: '중앙도서관에서 같이 공부해요',
    prompts: [{ questionId: 'q_now', answer: '통계 과제 같이 풀고 크로플 먹기' }, { questionId: 'q_spot', answer: '중도 4층 창가 (오후 2시 이후)' }, { questionId: 'q_study_type', answer: '카페에서 조용히, 질문은 쪽지로' }, { questionId: 'q_ask_me', answer: 'R, 통계 과제, 크로플 맛집' }],
    goals: ['scholarship', 'lab', 'friends'], lookingFor: ['study_partner', 'application_partner'], canOffer: ['data', 'research'], living: { residence: 'commute', zone: '이대 근처' }, interestedOrgIds: ['o_stat'],
    openToNew: true, dailyAnswer: { questionId: 'd_free2h', answer: 'lunch', date: T },
  }),
  mk({
    id: 'u_taeho', nickname: '태호', birthYear: 1999, gender: 'male',
    avatar: { emoji: '🚀', hue: 10, photoType: 'face' , url: photo('p_taeho') }, photos: [photo('p_taeho'), photo('p_x5'), photo('c_city')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_yonsei', schoolName: '연세대학교', role: 'alumni', department: '전기전자공학부', year: 2023, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'alumni', career: { city: '서울 성수', company: '스타트업 (창업)', industry: 'AI', role: '공동창업자' },
    bio: '졸업 후 스타트업 창업. 후배들과 커피챗 환영해요.',
    likes: '프로덕트, 등산, 위스키',
    freeTime: '정문 카페에서 커피챗',
    availability: 'after18',
    interests: ['startup', 'networking', 'coffee'],
    purposes: ['networking'],
    nowWant: '창업 관심 있는 분과 커피챗',
    prompts: [{ questionId: 'q_now', answer: '정문 카페에서 커피챗, 아이디어 피드백 환영' }, { questionId: 'q_3hours', answer: '정문 카페에서 후배들 커피챗' }, { questionId: 'q_role', answer: '일 벌이는 사람' }, { questionId: 'q_ask_me', answer: 'MVP 만들기, 팀빌딩, 투자 미팅 준비' }, { questionId: 'q_want_person', answer: '뭔가 만들고 있는 사람' }],
    voicePrompt: { questionId: 'v_hello', durationSec: 12, recordedAt: isoHoursAgo(200) },
    goals: ['startup', 'cofounder'], lookingFor: ['developer', 'designer', 'cofounder'], canOffer: ['planning', 'marketing', 'mentor'], living: { residence: 'offcampus', zone: '신촌 남쪽' }, interestedOrgIds: ['o_startup'],
  }),
  mk({
    id: 'u_hana', nickname: '하나', birthYear: 2003, gender: 'female',
    avatar: { emoji: '🎨', hue: 340, photoType: 'face' , url: photo('p_hana') }, photos: [photo('p_hana'), photo('p_x1'), photo('c_art'), photo('c_daisy')], identityVerified: false,
    affiliation: { type: 'university', schoolId: 's_hongik', schoolName: '홍익대학교', role: 'undergraduate', department: '시각디자인과', year: 2022, emailVerified: true, showSchool: true, showDepartment: true },
    bio: '전시랑 플리마켓 좋아해요. 같이 다닐 친구 찾는 중!',
    likes: '드로잉, 빈티지 샵, 아이스 라떼',
    freeTime: '홍대 골목 산책',
    availability: 'weekend',
    interests: ['exhibition', 'shopping', 'walk', 'coffee'],
    purposes: ['friend', 'hobby'],
    nowWant: '이번 주말 전시 같이 볼 사람',
    prompts: [{ questionId: 'q_now', answer: '전시 보고 플리마켓 구경' }, { questionId: 'q_not_yet', answer: '학교 뒤 예술관 옥상. 노을 보러 가고 싶어요' }, { questionId: 'q_new', answer: '필름 카메라 시작했어요' }, { questionId: 'q_emoji', answer: '🎨📷🧋' }],
    poll: { questionId: 'p_weekend', options: ['바로 나감', '집이 좋아', '전시·공연이면 나감'], ownChoice: 2, votes: { u_seoyeon: 2 } },
    goals: ['hackathon', 'friends', 'hobby'], lookingFor: ['developer', 'teammate', 'friend'], canOffer: ['designer', 'video'], living: { residence: 'commute', zone: '홍대 근처' }, interestedOrgIds: [],
  }),
  mk({
    id: 'u_junho', nickname: '준호', birthYear: 2000, gender: 'male',
    avatar: { emoji: '🎤', hue: 265, photoType: 'face' , url: photo('p_junho') }, photos: [photo('p_junho'), photo('p_x6'), photo('c_drum')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_yonsei', schoolName: '연세대학교', role: 'undergraduate', department: '컴퓨터과학과', year: 2019, emailVerified: true, showSchool: true, showDepartment: true },
    bio: '밴드 동아리 회장. 학생회관 공연 준비 중이에요.',
    likes: '기타, 라멘, 영화',
    freeTime: '합주 아니면 영화',
    availability: 'in_class',
    interests: ['club', 'exhibition', 'meal', 'coffee'],
    purposes: ['club', 'friend'],
    prompts: [{ questionId: 'q_now', answer: '합주 끝나고 라멘 한 그릇' }, { questionId: 'q_cafe', answer: '학생회관 지하 라멘집' }, { questionId: 'q_role', answer: '총무 겸 기타' }, { questionId: 'q_project', answer: '가을 정기공연 준비 중' }],
    timetable: [{ id: 'c1', name: '컴파일러', day: 0, start: '11:00', end: '12:15', hue: 240 }, { id: 'c2', name: '캡스톤 디자인', day: 3, start: '14:00', end: '16:45', hue: 280 }, { id: 'c3', name: '컴파일러', day: 2, start: '11:00', end: '12:15', hue: 240 }, { id: 'c4', name: '네트워크', day: 1, start: '09:00', end: '10:15', hue: 180 }, { id: 'c5', name: '네트워크', day: 3, start: '09:00', end: '10:15', hue: 180 }],
    goals: ['join_club', 'friends', 'internship'], lookingFor: ['teammate'], canOffer: ['developer', 'club_ops'], living: { residence: 'offcampus', zone: '신촌 남쪽' }, interestedOrgIds: ['o_band'],
  }),
  mk({
    id: 'u_sua', nickname: '수아', birthYear: 2004, gender: 'female',
    avatar: { emoji: '🌱', hue: 95, photoType: 'face' , url: photo('p_sua') }, photos: [photo('p_sua'), photo('c_meadow'), photo('c_bookshop')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_yonsei', schoolName: '연세대학교', role: 'undergraduate', department: '컴퓨터과학과', year: 2023, emailVerified: true, showSchool: true, showDepartment: true },
    bio: '2학년. 코딩 스터디랑 산책 친구 구해요.',
    likes: '알고리즘, 김밥, 산책',
    freeTime: '백양로 산책',
    availability: 'now',
    interests: ['study', 'walk', 'coffee', 'startup'],
    purposes: ['study', 'friend'],
    nowWant: '지금 백양로 산책 가실 분',
    prompts: [{ questionId: 'q_now', answer: '백양로 산책 30분' }, { questionId: 'q_gap', answer: '알고리즘 문제 하나 풀고 산책' }, { questionId: 'q_study_type', answer: '조용히 풀다가 막히면 같이 화이트보드' }, { questionId: 'q_want_person', answer: '코딩 같이 배울 사람' }],
    poll: { questionId: 'p_gap', options: ['카페', '도서관', '산책'], ownChoice: 2, votes: { u_me: 2 } },
    timetable: [{ id: 'c1', name: '자료구조', day: 0, start: '09:00', end: '10:15', hue: 220 }, { id: 'c2', name: '자료구조', day: 2, start: '09:00', end: '10:15', hue: 220 }, { id: 'c3', name: '이산수학', day: 1, start: '10:30', end: '11:45', hue: 60 }, { id: 'c4', name: '이산수학', day: 3, start: '10:30', end: '11:45', hue: 60 }, { id: 'c5', name: '글쓰기', day: 4, start: '13:00', end: '14:15', hue: 330 }],
    goals: ['friends', 'hackathon', 'lunch'], lookingFor: ['study_partner', 'teammate', 'senior'], canOffer: ['developer'], living: { residence: 'dorm', zone: '신촌 북쪽' }, interestedOrgIds: ['o_ailab', 'o_startup'],
    openToNew: true, dailyAnswer: { questionId: 'd_free2h', answer: 'new_people', date: T },
  }),
  mk({
    id: 'u_woojin', nickname: '우진', birthYear: 2001, gender: 'male',
    avatar: { emoji: '🧗', hue: 200, photoType: 'face' , url: photo('p_woojin') }, photos: [photo('p_woojin'), photo('c_cliffroad'), photo('c_beaker')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_yonsei', schoolName: '연세대학교', role: 'undergraduate', department: '통계학과', year: 2020, emailVerified: true, showSchool: true, showDepartment: true },
    bio: '통계학과 학생회. 스터디 운영 중.',
    likes: '수학, 클라이밍, 국밥',
    freeTime: '클라이밍장',
    availability: 'after18',
    interests: ['study', 'exercise', 'research'],
    purposes: ['study', 'club'],
    prompts: [{ questionId: 'q_now', answer: '클라이밍 가고 국밥' }, { questionId: 'q_cafe', answer: '신촌 국밥집 (이름 비밀)' }, { questionId: 'q_study_type', answer: '토론형. 문제 하나로 30분 싸움 가능' }],
    timetable: [{ id: 'c1', name: '데이터베이스', day: 0, start: '10:00', end: '11:15', hue: 220 }, { id: 'c2', name: '데이터베이스', day: 2, start: '10:00', end: '11:15', hue: 220 }, { id: 'c3', name: '심리통계', day: 1, start: '13:00', end: '14:15', hue: 200 }],
    fieldVisibility: { ...defaultVisibility('school'), timetable: 'school' },
    goals: ['scholarship', 'lab', 'internship'], lookingFor: ['application_partner', 'study_partner'], canOffer: ['data', 'research', 'club_ops'], living: { residence: 'commute', zone: '신촌 남쪽' }, interestedOrgIds: ['o_stat'],
  }),
  // ─── Beyond: 다른 학교·도시 사람 (무료 3명 미리보기, 전체는 AroundU+) ───
  mk({ id: 'u_b_snu1', nickname: '서준', birthYear: 2001, gender: 'male', avatar: { emoji: '🤖', hue: 250, photoType: 'face', url: photo('p_x5') }, photos: [photo('p_x5'), photo('c_desktop')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_snu', schoolName: '서울대학교', role: 'graduate', department: '컴퓨터공학부', year: 2024, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'masters', region: '관악',
    bio: 'LLM 에이전트 연구. 사이드로 창업 준비 중.', interests: ['research', 'startup', 'coffee'], purposes: ['networking', 'study'], goals: ['startup', 'lab'], lookingFor: ['cofounder', 'developer'], canOffer: ['developer', 'research'], openTo: ['coffee', 'research', 'cofounding'], fieldVisibility: defaultVisibility('public'), availability: 'afternoon', nowWant: '관악에서 AI 얘기할 사람' }),
  mk({ id: 'u_b_kaist1', nickname: '지우', birthYear: 2000, gender: 'female', avatar: { emoji: '🔬', hue: 190, photoType: 'face', url: photo('p_x3') }, photos: [photo('p_x3'), photo('c_beaker')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_kaist', schoolName: 'KAIST', role: 'graduate', department: '로봇공학', year: 2022, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'phd', region: '대전 유성',
    bio: '로봇 매니퓰레이션 박사과정. 서울 자주 올라와요.', interests: ['research', 'exercise', 'exhibition'], purposes: ['networking'], goals: ['lab', 'hackathon'], lookingFor: ['teammate'], canOffer: ['research', 'data'], openTo: ['research', 'networking', 'mentoring'], fieldVisibility: defaultVisibility('public'), availability: 'weekend' }),
  mk({ id: 'u_b_korea1', nickname: '민재', birthYear: 2002, gender: 'male', avatar: { emoji: '🚀', hue: 20, photoType: 'face', url: photo('p_x6') }, photos: [photo('p_x6'), photo('c_two_laptops')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_korea', schoolName: '고려대학교', role: 'undergraduate', department: '경영학과', year: 2021, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'undergrad', region: '안암',
    bio: '학생 창업팀 운영. 디자이너 찾는 중.', interests: ['startup', 'networking', 'coffee'], purposes: ['networking', 'friend'], goals: ['startup'], lookingFor: ['designer', 'cofounder'], canOffer: ['planning', 'marketing'], openTo: ['coffee', 'cofounding', 'networking'], fieldVisibility: defaultVisibility('public'), availability: 'after18', nowWant: '창업 얘기 커피' }),
  mk({ id: 'u_b_snu2', nickname: '하린', birthYear: 1998, gender: 'female', avatar: { emoji: '💼', hue: 330, photoType: 'face', url: photo('p_x2') }, photos: [photo('p_x2'), photo('c_city')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_snu', schoolName: '서울대학교', role: 'alumni', department: '산업공학과', year: 2021, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'alumni', career: { city: '서울 성수', company: '토스', industry: '핀테크', role: 'PM' }, region: '서울 성수',
    bio: '핀테크 PM 3년차. 학생 창업팀 멘토링 좋아해요.', interests: ['startup', 'networking', 'exercise'], purposes: ['networking'], goals: [], lookingFor: ['mentor'], canOffer: ['planning', 'presentation'], openTo: ['mentoring', 'coffee', 'networking'], fieldVisibility: defaultVisibility('public'), availability: 'after18' }),
  mk({ id: 'u_b_kaist2', nickname: '도윤', birthYear: 2003, gender: 'male', avatar: { emoji: '🎸', hue: 280, photoType: 'face', url: photo('p_x4') }, photos: [photo('p_x4'), photo('c_stage')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_kaist', schoolName: 'KAIST', role: 'undergraduate', department: '전산학부', year: 2022, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'undergrad', region: '대전 유성',
    bio: '해커톤 5회 수상. 밴드도 함.', interests: ['startup', 'club', 'coffee'], purposes: ['friend', 'networking'], goals: ['hackathon'], lookingFor: ['teammate', 'designer'], canOffer: ['developer'], openTo: ['activities', 'cofounding'], fieldVisibility: defaultVisibility('public'), availability: 'weekend' }),
];

export const organizations: Organization[] = [
  {
    id: 'o_band', name: '소리울림 (밴드 동아리)', logo: { emoji: '🎸', hue: 280 , url: photo('c_eguitar') }, type: 'club', schoolId: 's_yonsei', verified: true,
    description: '1987년부터 이어온 연세대 중앙 밴드 동아리. 매 학기 학생회관 정기공연을 엽니다.',
    gallery: [{ emoji: '🎤', hue: 280, caption: '봄 정기공연' , url: photo('c_stage') }, { emoji: '🥁', hue: 300, caption: '합주실' , url: photo('c_drum') }, { emoji: '🎹', hue: 260, caption: '신입생 환영회' , url: photo('c_piano') }],
    regularActivities: ['매주 화·목 합주 (학생회관 지하)', '학기별 정기공연', '방학 합숙'],
    recruitment: { title: '2학기 신입회원 모집', period: `${T} ~ ${T9}`, open: true },
    notices: [{ id: 'n1', title: '정기공연 리허설 안내', body: '이번 주 목요일 저녁 7시 학생회관 지하 합주실', createdAt: isoHoursAgo(5) }],
    followerIds: ['u_seoyeon', 'u_hana', DEMO_USER_ID], memberIds: ['u_junho', 'u_seoyeon'], adminIds: ['u_junho'], applicantIds: [],
  },
  {
    id: 'o_stat', name: '통계학과 학생회', logo: { emoji: '📊', hue: 210 , url: photo('c_abacus') }, type: 'council', schoolId: 's_yonsei', parent: '통계학과', verified: true,
    description: '통계학과 학생들의 학업과 교류를 돕습니다. 스터디·멘토링·학과 행사를 운영해요.',
    gallery: [{ emoji: '📈', hue: 210, caption: '멘토링 데이' , url: photo('c_cafe_laptop') }, { emoji: '🍕', hue: 30, caption: '개강총회' , url: photo('c_pizza') }],
    regularActivities: ['월간 스터디 매칭', '학기 초 개강총회'],
    notices: [{ id: 'n2', title: '중간고사 스터디 모집', body: '중앙도서관 그룹스터디룸에서 진행합니다.', createdAt: isoHoursAgo(30) }],
    followerIds: ['u_yuna', 'u_woojin'], memberIds: ['u_woojin'], adminIds: ['u_woojin'], applicantIds: [],
  },
  {
    id: 'o_ailab', name: 'AI 연구실 (Vision & Language Lab)', logo: { emoji: '🧠', hue: 170 , url: photo('c_abstract5') }, type: 'lab', schoolId: 's_yonsei', parent: '인공지능학과', verified: true,
    description: '멀티모달 AI를 연구합니다. 매주 공개 세미나를 열고 학부 인턴을 모집해요.',
    gallery: [{ emoji: '🖥️', hue: 170, caption: '연구실' , url: photo('c_desktop') }, { emoji: '📝', hue: 190, caption: '세미나' , url: photo('c_two_laptops') }],
    regularActivities: ['매주 수요일 공개 세미나 (공학관)', '학부 인턴 프로그램'],
    recruitment: { title: '학부 연구 인턴 모집', period: `${T} ~ ${addDaysISO(20)}`, open: true },
    notices: [],
    followerIds: ['u_dohyun', DEMO_USER_ID], memberIds: ['u_dohyun'], adminIds: ['u_dohyun'], applicantIds: [],
  },
  {
    id: 'o_startup', name: '연세 창업동아리 YSVC', logo: { emoji: '🚀', hue: 15 , url: photo('c_abstract3') }, type: 'club', schoolId: 's_yonsei', verified: false,
    description: '아이디어를 제품으로. 매주 커피챗과 데모데이를 운영합니다.',
    gallery: [{ emoji: '💡', hue: 15, caption: '데모데이' , url: photo('c_lounge') }],
    regularActivities: ['매주 금 커피챗', '학기 말 데모데이'],
    recruitment: { title: '가을 기수 모집', period: `${T} ~ ${addDaysISO(14)}`, open: true },
    notices: [],
    followerIds: ['u_jimin', 'u_taeho'], memberIds: ['u_jimin', 'u_taeho'], adminIds: ['u_taeho'], applicantIds: [],
  },
  {
    id: 'o_run', name: '신촌 러닝 크루', logo: { emoji: '🏃', hue: 130 , url: photo('c_road_sunset') }, type: 'club', schoolId: 's_sogang', verified: false,
    description: '신촌 일대 대학생 연합 러닝 크루. 초보 환영.',
    gallery: [{ emoji: '🌅', hue: 130, caption: '아침 러닝' , url: photo('c_road_sunset') }],
    regularActivities: ['매주 월·수·금 저녁 7시 러닝'],
    notices: [],
    followerIds: ['u_minjun', 'u_jimin'], memberIds: ['u_minjun'], adminIds: ['u_minjun'], applicantIds: [],
  },
];

export const activities: Activity[] = [
  {
    id: 'a_coffee_sinchon', kind: 'personal', category: 'coffee', title: '오늘 오후 6시 신촌에서 커피 마실 사람?',
    description: '창업이나 AI에 관심 있는 분이면 좋아요. 가볍게 이야기 나눠요. 최대 4명, 연세대학교 구성원에게 공개.',
    cover: { emoji: '☕', hue: 30 , url: photo('c_espresso') }, hostId: 'u_jimin', hostType: 'user', date: T, startTime: '18:00', endTime: '19:30',
    place: { name: '정문 카페 (커피리브레 신촌)', address: '서대문구 연세로', lat: 37.5589, lng: 126.9368 },
    capacity: 4, visibility: 'school', joinPolicy: 'open', fee: 0, comments: [
      { id: 'c1', authorId: 'u_sua', text: '창업 관심 많은데 초보도 괜찮을까요?', createdAt: isoMinutesAgo(40) },
      { id: 'c2', authorId: 'u_jimin', text: '당연하죠! 편하게 오세요 :)', createdAt: isoMinutesAgo(35) },
    ], createdAt: isoHoursAgo(2),
  },
  {
    id: 'a_stat_study', kind: 'group', category: 'study', title: '통계학 중간고사 스터디',
    description: '회귀분석·확률 파트 위주로 같이 문제 풀어요. 통계학과 아니어도 환영.',
    cover: { emoji: '📖', hue: 220 , url: photo('c_cafe_laptop') }, hostId: 'u_woojin', hostType: 'user', orgId: 'o_stat', date: T, startTime: '14:00', endTime: '17:00',
    place: { name: '중앙도서관 그룹스터디룸 3', lat: 37.5645, lng: 126.9375 },
    capacity: 6, visibility: 'public', joinPolicy: 'approval', fee: 0, conditions: '통계 기초 수강자', comments: [], createdAt: isoHoursAgo(20),
  },
  {
    id: 'a_band_show', kind: 'org_event', category: 'performance', title: '소리울림 가을 정기공연',
    description: '밴드 동아리 정기공연! 신입회원 무대도 있어요. 친구랑 같이 오세요.',
    cover: { emoji: '🎤', hue: 285 , url: photo('c_stage') }, hostId: 'u_junho', hostType: 'org', orgId: 'o_band', date: T2, startTime: '19:00', endTime: '21:00',
    place: { name: '학생회관 대강당', lat: 37.5637, lng: 126.9387 },
    capacity: 200, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [
      { id: 'c3', authorId: 'u_hana', text: '타교생도 갈 수 있나요?', createdAt: isoHoursAgo(3) },
      { id: 'c4', authorId: 'u_junho', text: '네! 누구나 환영입니다.', createdAt: isoHoursAgo(2) },
    ], createdAt: isoHoursAgo(48),
  },
  {
    id: 'a_running', kind: 'group', category: 'exercise', title: '오후 7시 러닝 모임 (5km)',
    description: '운동장에서 출발해 신촌 한 바퀴. 페이스 6분대, 초보 환영. 끝나고 국밥.',
    cover: { emoji: '🏃', hue: 135 , url: photo('c_road_sunset') }, hostId: 'u_minjun', hostType: 'user', orgId: 'o_run', date: T, startTime: '19:00', endTime: '20:00',
    place: { name: '대운동장', lat: 37.5662, lng: 126.9352 },
    capacity: 10, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(6),
  },
  {
    id: 'a_startup_chat', kind: 'personal', category: 'networking', title: '창업 커피챗 — 프로덕트 이야기',
    description: '졸업 후 창업한 선배가 후배들과 커피챗. MVP, 팀빌딩 뭐든 물어보세요.',
    cover: { emoji: '🚀', hue: 15 , url: photo('c_two_laptops') }, hostId: 'u_taeho', hostType: 'user', orgId: 'o_startup', date: T1, startTime: '18:30', endTime: '20:00',
    place: { name: '정문 카페 (스타벅스 연세점)', lat: 37.5594, lng: 126.9372 },
    capacity: 5, visibility: 'school', joinPolicy: 'approval', fee: 0, conditions: '창업에 관심 있는 연세대 구성원', comments: [], createdAt: isoHoursAgo(10),
  },
  {
    id: 'a_ai_seminar', kind: 'org_event', category: 'seminar', title: 'AI 연구실 공개 세미나: 멀티모달 LLM',
    description: '최신 멀티모달 모델 리뷰. 학부생 환영, 사전 지식 불필요. 세미나 후 인턴 Q&A.',
    cover: { emoji: '🧠', hue: 175 , url: photo('c_abstract1') }, hostId: 'u_dohyun', hostType: 'org', orgId: 'o_ailab', date: T1, startTime: '16:00', endTime: '17:30',
    place: { name: '제1공학관 B101', lat: 37.5617, lng: 126.9367 },
    capacity: 40, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(72),
  },
  {
    id: 'a_band_recruit', kind: 'org_event', category: 'club', title: '동아리 신입회원 모집 부스',
    description: '백양로에서 신입회원 모집 부스 운영. 기타 체험도 가능!',
    cover: { emoji: '🎸', hue: 270 , url: photo('c_eguitar') }, hostId: 'u_junho', hostType: 'org', orgId: 'o_band', date: T, startTime: '11:00', endTime: '17:00',
    place: { name: '백양로 삼거리', lat: 37.5625, lng: 126.9378 },
    capacity: 999, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(30),
  },
  {
    id: 'a_festival', kind: 'org_event', category: 'school_event', title: '2026 가을 아카라카 사전 행사',
    description: '학교 공식 행사. 노천극장에서 진행되는 사전 축제. 학생증 지참.',
    cover: { emoji: '🎓', hue: 355 , url: photo('c_tents') }, hostId: 'u_junho', hostType: 'org', official: true, date: T4, startTime: '17:00', endTime: '22:00',
    place: { name: '노천극장', lat: 37.5668, lng: 126.9385 },
    capacity: 3000, visibility: 'school', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(100),
  },
  {
    id: 'a_exhibit', kind: 'personal', category: 'etc', title: '주말 전시 같이 볼 사람 (홍대 → 성수)',
    description: '토요일 오후 홍대에서 만나 성수 전시까지. 사진 좋아하시는 분!',
    cover: { emoji: '🎨', hue: 335 , url: photo('c_hall') }, hostId: 'u_hana', hostType: 'user', date: addDaysISO(3), startTime: '14:00', endTime: '18:00',
    place: { name: '홍대입구역 3번 출구', lat: 37.5571, lng: 126.9245 },
    capacity: 3, visibility: 'public', joinPolicy: 'approval', fee: 15000, conditions: '전시 입장료 각자 부담', comments: [], createdAt: isoHoursAgo(9),
  },
  {
    id: 'a_walk', openSlot: true, kind: 'personal', category: 'etc', title: '지금 백양로 산책 30분',
    description: '수업 끝나고 머리 식힐 겸 산책. 가볍게 이야기해요.',
    cover: { emoji: '🚶', hue: 100 , url: photo('c_bench') }, hostId: 'u_sua', hostType: 'user', date: T, startTime: '15:30', endTime: '16:00',
    place: { name: '백양로 (언더우드관 앞)', lat: 37.5647, lng: 126.9380 },
    capacity: 2, visibility: 'department', visibilityTargets: ['컴퓨터과학과'], joinPolicy: 'open', fee: 0, comments: [], createdAt: isoMinutesAgo(25),
  },
  {
    id: 'a_deal_americano', kind: 'org_event', category: 'store_deal', title: '학생증 제시 시 아메리카노 1+1',
    description: '정문 앞 카페 오늘 하루 한정 혜택. AroundU 화면 제시.',
    cover: { emoji: '🏷️', hue: 50 , url: photo('c_mug') }, hostId: 'u_taeho', hostType: 'user', date: T, startTime: '10:00', endTime: '21:00',
    place: { name: '카페 온도 (연세로)', lat: 37.5580, lng: 126.9360 },
    capacity: 999, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(12),
  },
  {
    id: 'a_friends_dinner', kind: 'group', category: 'meal', title: '친구들끼리 저녁 (마라탕)',
    description: '친구 공개. 시험 끝난 기념 마라탕!',
    cover: { emoji: '🍜', hue: 10 , url: photo('c_hotpot') }, hostId: 'u_seoyeon', hostType: 'user', date: T1, startTime: '19:00', endTime: '20:30',
    place: { name: '신촌 마라공방', lat: 37.5563, lng: 126.9382 },
    capacity: 5, visibility: 'friends', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(4),
  },
  {
    id: 'a_invite_only', kind: 'group', category: 'study', title: '캡스톤 팀 회의',
    description: '초대된 팀원만 참가.',
    cover: { emoji: '🗂️', hue: 200 , url: photo('c_lounge') }, hostId: 'u_junho', hostType: 'user', date: T2, startTime: '13:00', endTime: '15:00',
    place: { name: '제3공학관 세미나실', lat: 37.5612, lng: 126.9360 },
    capacity: 4, visibility: 'public', joinPolicy: 'invite', invitedIds: ['u_sua'], fee: 0, comments: [], createdAt: isoHoursAgo(50),
  },
  {
    id: 'a_mine', kind: 'personal', category: 'study', title: '리액트 사이드 프로젝트 같이 하실 분',
    description: '주 1회 만나서 진행. 포트폴리오 목적. 디자이너 한 분 있으면 좋겠어요.',
    cover: { emoji: '💻', hue: 235 , url: photo('c_laptop') }, hostId: DEMO_USER_ID, hostType: 'user', date: T2, startTime: '18:00', endTime: '20:00',
    place: { name: '중앙도서관 1층 카페', lat: 37.5643, lng: 126.9372 },
    capacity: 4, visibility: 'school', joinPolicy: 'approval', fee: 0, rolesNeeded: ['designer', 'developer'], comments: [
      { id: 'c5', authorId: 'u_hana', text: '디자인 쪽인데 관심 있어요!', createdAt: isoHoursAgo(1) },
    ], createdAt: isoHoursAgo(26),
  },
  // ── Now 피드용: 곧 시작하는 가벼운 활동 (작은 프로필 + 무엇·언제·어디) ──
  {
    id: 'a_now_lunch', openSlot: true, kind: 'personal', category: 'meal', title: '혼밥 싫어요 — 학생회관 점심 같이',
    description: '공강이라 학생회관 식당 가요. 아무나 편하게 오세요. 4명까지.',
    cover: { emoji: '🍱', hue: 30 , url: photo('c_paella') }, hostId: 'u_sua', hostType: 'user', date: T, startTime: nowPlus(25), endTime: nowPlus(85),
    place: { name: '학생회관 식당', area: '학생회관 근처', lat: 37.5637, lng: 126.9387 },
    capacity: 4, visibility: 'school', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoMinutesAgo(8),
  },
  {
    id: 'a_now_coffee', openSlot: true, kind: 'personal', category: 'coffee', title: '중도 앞 커피 30분, 리포트 얘기나 해요',
    description: '통계 리포트 쓰다가 머리 식히러 나가요. 커피 한 잔.',
    cover: { emoji: '☕', hue: 25 , url: photo('c_mug') }, hostId: 'u_yuna', hostType: 'user', date: T, startTime: nowPlus(50), endTime: nowPlus(80),
    place: { name: '중앙도서관 1층 카페', area: '중앙도서관 근처', lat: 37.5643, lng: 126.9372 },
    capacity: 3, visibility: 'school', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoMinutesAgo(12),
  },
  {
    id: 'a_now_badminton', kind: 'personal', category: 'exercise', title: '배드민턴 2시간, 라켓 여분 있어요',
    description: '체육관 코트 잡아뒀어요. 초보 환영. 승인 후 코트 번호 알려드려요.',
    cover: { emoji: '🏸', hue: 140 , url: photo('c_volleyball') }, hostId: 'u_minjun', hostType: 'user', date: T, startTime: nowPlus(150), endTime: nowPlus(270),
    place: { name: '체육관 3번 코트', area: '체육관 근처', lat: 37.5660, lng: 126.9345 },
    capacity: 4, visibility: 'public', joinPolicy: 'approval', fee: 0, comments: [], createdAt: isoMinutesAgo(40),
  },
  // ── Study Crew: 수업 이름으로 묶이고 같은 수업 학생에게만 보인다 ──
  {
    id: 'a_crew_db', kind: 'group', category: 'study', title: '데이터베이스 중간고사 Study Crew', courseName: '데이터베이스', crewType: 'exam', mode: 'offline',
    description: '정규화·SQL 파트 같이 정리해요. 기출 나눠서 풀고 서로 설명하기.',
    cover: { emoji: '📝', hue: 220 , url: photo('c_library') }, hostId: 'u_woojin', hostType: 'user', date: T1, startTime: '11:30', endTime: '13:00',
    place: { name: '중앙도서관 그룹스터디룸 2', lat: 37.5645, lng: 126.9375 },
    capacity: 5, visibility: 'department', visibilityTargets: ['course:데이터베이스'], joinPolicy: 'approval', fee: 0, comments: [], createdAt: isoHoursAgo(7),
  },
  {
    id: 'a_crew_startup', kind: 'group', category: 'study', title: '창업과 혁신 팀플 크루 (아이디어 정리)', courseName: '창업과 혁신', crewType: 'project', mode: 'online',
    description: '수업 끝나고 온라인으로 30분. 팀플 아이디어 두 개로 좁히기.',
    cover: { emoji: '🧩', hue: 15 , url: photo('c_two_laptops') }, hostId: 'u_jimin', hostType: 'user', date: T1, startTime: '18:00', endTime: '18:30',
    place: { name: '온라인 (Zoom)', lat: 37.5605, lng: 126.9390 },
    capacity: 4, visibility: 'department', visibilityTargets: ['course:창업과 혁신'], joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(3),
  },
  // ── 팀원 모집: 기회에 연결된 팀 ──
  {
    id: 'a_hack_team', kind: 'group', category: 'networking', title: 'AI 해커톤 팀원 구해요 (디자인·기획)', opportunityId: 'op_hackathon', rolesNeeded: ['designer', 'planning'], mode: 'offline',
    description: '개발 2명 있어요. 디자이너 1명, 기획 1명 찾습니다. 주제는 캠퍼스 식당 혼잡도.',
    cover: { emoji: '💡', hue: 230 , url: photo('c_abstract2') }, hostId: 'u_dohyun', hostType: 'user', date: T4, startTime: '19:00', endTime: '21:00',
    place: { name: '제1공학관 라운지', lat: 37.5617, lng: 126.9367 },
    capacity: 4, visibility: 'school', joinPolicy: 'approval', fee: 0, comments: [], createdAt: isoHoursAgo(5),
  },
  {
    id: 'a_deal', kind: 'org_event', category: 'store_deal', title: '학생증 보여주면 라떼 1+1', description: '오늘만, 신촌 카페 온더코너. 이 화면을 보여주세요.',
    cover: { emoji: '🏷️', hue: 50, url: photo('c_mug') }, hostId: 'u_taeho', hostType: 'user', date: T, startTime: '10:00', endTime: '21:00',
    place: { name: '카페 온더코너 신촌점', address: '서대문구 연세로', lat: 37.5585, lng: 126.9370 }, capacity: 999, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(12),
    partner: { name: '카페 온더코너', deal: '라떼 1+1 · 오늘 21시까지' },
  },
  {
    id: 'a_clubfair', kind: 'org_event', category: 'school_event', title: '가을 동아리 박람회', description: '백양로에서 동아리 80개 부스. AroundU 부스에서 음료 무료.',
    cover: { emoji: '🎪', hue: 200, url: photo('c_tents') }, hostId: 'u_woojin', hostType: 'org', orgId: 'o_stat', date: T, startTime: '11:00', endTime: '15:00',
    place: { name: '백양로', lat: 37.5640, lng: 126.9380 }, capacity: 999, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(30),
  },
];

export const participations: Participation[] = [
  { id: 'p1', activityId: 'a_coffee_sinchon', userId: 'u_sua', status: 'approved', createdAt: isoMinutesAgo(30) },
  { id: 'p2', activityId: 'a_coffee_sinchon', userId: 'u_taeho', status: 'approved', createdAt: isoMinutesAgo(50) },
  { id: 'p3', activityId: 'a_stat_study', userId: 'u_yuna', status: 'approved', createdAt: isoHoursAgo(10) },
  { id: 'p4', activityId: 'a_stat_study', userId: 'u_dohyun', status: 'approved', createdAt: isoHoursAgo(8) },
  { id: 'p5', activityId: 'a_running', userId: 'u_jimin', status: 'approved', createdAt: isoHoursAgo(3) },
  { id: 'p6', activityId: 'a_running', userId: DEMO_USER_ID, status: 'approved', createdAt: isoHoursAgo(2) },
  { id: 'p7', activityId: 'a_band_show', userId: 'u_hana', status: 'approved', createdAt: isoHoursAgo(3) },
  { id: 'p8', activityId: 'a_band_show', userId: 'u_seoyeon', status: 'approved', createdAt: isoHoursAgo(40) },
  { id: 'p9', activityId: 'a_mine', userId: 'u_hana', status: 'pending', message: '디자이너예요. 피그마 잘 다뤄요!', createdAt: isoMinutesAgo(55) },
  { id: 'p10', activityId: 'a_mine', userId: 'u_sua', status: 'pending', message: '리액트 배우는 중인데 참여하고 싶어요.', createdAt: isoMinutesAgo(20) },
  { id: 'p11', activityId: 'a_mine', userId: 'u_dohyun', status: 'approved', createdAt: isoHoursAgo(5) },
  { id: 'p12', activityId: 'a_ai_seminar', userId: 'u_sua', status: 'approved', createdAt: isoHoursAgo(6) },
  { id: 'p13', activityId: 'a_ai_seminar', userId: 'u_woojin', status: 'approved', createdAt: isoHoursAgo(7) },
  { id: 'p14', activityId: 'a_startup_chat', userId: 'u_jimin', status: 'approved', createdAt: isoHoursAgo(9) },
  { id: 'p15', activityId: 'a_friends_dinner', userId: 'u_junho', status: 'approved', createdAt: isoHoursAgo(3) },
  { id: 'p16', activityId: 'a_now_lunch', userId: 'u_jimin', status: 'approved', createdAt: isoMinutesAgo(5) },
  { id: 'p17', activityId: 'a_crew_db', userId: 'u_junho', status: 'approved', createdAt: isoHoursAgo(6) },
  { id: 'p18', activityId: 'a_crew_startup', userId: 'u_taeho', status: 'approved', createdAt: isoHoursAgo(2) },
  { id: 'p19', activityId: 'a_hack_team', userId: 'u_sua', status: 'approved', createdAt: isoHoursAgo(4) },
  { id: 'p20', activityId: 'a_now_badminton', userId: 'u_woojin', status: 'approved', createdAt: isoMinutesAgo(30) },
];

export const posts: Post[] = [
  {
    id: 'po13', authorId: 'u_jimin', authorType: 'user', postType: 'review', media: [{ emoji: '🌅', hue: 130 , url: photo('c_road_sunset') }, { emoji: '🍲', hue: 20 , url: photo('c_hotpot') }],
    text: '러닝 끝나고 국밥. 5km 처음 완주했어요. 다음 주에도 같이 뛸 사람!', topics: ['exercise', 'friends'],
    tags: ['러닝', '신촌'], visibility: 'school', likeIds: ['u_minjun', DEMO_USER_ID, 'u_sua'], savedIds: [],
    comments: [], relatedActivityId: 'a_running', taggedUserIds: ['u_minjun', DEMO_USER_ID], tagApprovedIds: ['u_minjun'], recruitNext: true, showOnProfile: true, showOnFeed: true, createdAt: isoMinutesAgo(50),
  },
  {
    id: 'po14', authorId: DEMO_USER_ID, authorType: 'user', postType: 'story', media: [{ emoji: '🐈', hue: 290 , url: photo('c_tabby') }],
    text: '합주실 고양이 근황. 오늘도 출근했음.', topics: ['daily'],
    tags: ['고양이'], visibility: 'friends', likeIds: ['u_seoyeon'], savedIds: [], comments: [], taggedUserIds: ['u_seoyeon'], tagApprovedIds: ['u_seoyeon'], showOnProfile: true, showOnFeed: false, createdAt: isoHoursAgo(8),
  },
  {
    id: 'po15', authorId: 'u_taeho', authorType: 'user', postType: 'together', media: [],
    text: '해커톤 팀 아직 못 구한 사람? 저희 팀 기획 한 자리 남았어요. 프로필 보고 편하게 문의 주세요.', topics: ['startup', 'career'],
    tags: ['해커톤', '팀원모집'], visibility: 'school', likeIds: ['u_hana'], savedIds: [], comments: [], relatedActivityId: 'a_hack_team', relatedOpportunityId: 'op_hackathon', showOnProfile: true, showOnFeed: true, createdAt: isoHoursAgo(2),
  },
  {
    id: 'po10', authorId: 'u_woojin', authorType: 'user', postType: 'question', media: [], anonymous: true,
    text: '중도 3층 에어컨 너무 세지 않나요? 담요 필수… 다들 어디서 공부해요?',
    tags: ['중앙도서관', '익명'], visibility: 'school', likeIds: ['u_sua', 'u_yuna', 'u_jimin'], savedIds: [],
    comments: [{ id: 'pc10', authorId: 'u_yuna', text: '4층 창가 가세요. 거긴 괜찮아요', createdAt: isoMinutesAgo(30) }, { id: 'pc11', authorId: 'u_woojin', text: '오 감사합니다!', createdAt: isoMinutesAgo(20) }], createdAt: isoMinutesAgo(45),
  },
  {
    id: 'po11', authorId: 'u_seoyeon', authorType: 'user', postType: 'story', media: [], anonymous: true,
    text: '혼밥하는 사람 많나요? 학생회관에서 혼자 먹을 때마다 괜히 눈치 보여서… 저만 그런가요',
    tags: ['익명', '학생회관'], visibility: 'school', likeIds: ['u_sua', 'u_minjun', 'u_hana', 'u_dohyun', 'u_taeho'], savedIds: [],
    comments: [{ id: 'pc12', authorId: 'u_sua', text: '저도요!! 점심 같이 먹어요. 계획 탭에서 점심 열어둘게요', createdAt: isoHoursAgo(1) }], createdAt: isoHoursAgo(3),
  },
  {
    id: 'po12', authorId: 'u_hana', authorType: 'user', postType: 'question', media: [], anonymous: true,
    text: '동아리 면접 처음인데 뭐 물어보나요? 밴드 동아리 지원했어요 🎸',
    tags: ['동아리', '면접', '익명'], visibility: 'public', likeIds: ['u_junho'], savedIds: [],
    comments: [{ id: 'pc13', authorId: 'u_junho', text: '저희는 면접 없어요! 합주 체험만 하면 돼요 ㅎㅎ', createdAt: isoHoursAgo(5) }], createdAt: isoHoursAgo(6),
  },
  {
    id: 'po1', authorId: 'u_jimin', authorType: 'user', postType: 'together', media: [{ emoji: '☕', hue: 30 , url: photo('c_espresso') }, { emoji: '🍰', hue: 20 , url: photo('c_mug') }],
    text: '정문 앞 새로 생긴 카페. 플랫화이트 맛집 인정. 오늘 저녁 여기서 커피 모임 열었어요 ☕',
    tags: ['신촌카페', '커피'], visibility: 'public', likeIds: ['u_sua', 'u_taeho', 'u_hana'], savedIds: [],
    comments: [{ id: 'pc1', authorId: 'u_sua', text: '저 갈래요!!', createdAt: isoMinutesAgo(50) }],
    relatedActivityId: 'a_coffee_sinchon', createdAt: isoHoursAgo(2),
  },
  {
    id: 'po2', authorId: 'u_junho', authorType: 'org', postType: 'news', orgId: 'o_band', media: [{ emoji: '🎤', hue: 285 , url: photo('c_stage') }],
    text: '소리울림 가을 정기공연 D-2! 학생회관 대강당에서 만나요. 신입 무대 기대해주세요 🎸',
    tags: ['밴드', '정기공연', '동아리'], visibility: 'public', likeIds: ['u_seoyeon', 'u_hana', 'u_jimin', DEMO_USER_ID], savedIds: [DEMO_USER_ID],
    comments: [], relatedActivityId: 'a_band_show', createdAt: isoHoursAgo(5),
  },
  {
    id: 'po3', authorId: 'u_minjun', authorType: 'user', postType: 'together', media: [{ emoji: '🌅', hue: 130 , url: photo('c_road_sunset') }],
    text: '오늘 아침 한강 10km. 저녁엔 운동장에서 5km 같이 뛰어요. 초보 환영!',
    tags: ['러닝', '신촌러닝크루'], visibility: 'public', likeIds: ['u_jimin', 'u_woojin'], savedIds: [],
    comments: [{ id: 'pc2', authorId: 'u_jimin', text: '저녁에 봬요!', createdAt: isoHoursAgo(1) }],
    relatedActivityId: 'a_running', createdAt: isoHoursAgo(7),
  },
  {
    id: 'po4', authorId: 'u_seoyeon', authorType: 'user', postType: 'story', media: [{ emoji: '🐈', hue: 290 , url: photo('c_tabby') }, { emoji: '🎸', hue: 280 , url: photo('c_eguitar') }],
    text: '합주실 고양이 등장. 오늘 연습은 망했지만 행복함 😻 (친구 공개)',
    tags: ['고양이', '합주'], visibility: 'friends', likeIds: [DEMO_USER_ID], savedIds: [],
    comments: [], createdAt: isoHoursAgo(9),
  },
  {
    id: 'po5', authorId: 'u_dohyun', authorType: 'org', postType: 'news', orgId: 'o_ailab', media: [{ emoji: '🧠', hue: 175 , url: photo('c_abstract1') }],
    text: '내일 오후 4시 공학관 공개 세미나. 멀티모달 LLM 리뷰 + 학부 인턴 Q&A. 사전 지식 없어도 괜찮아요.',
    tags: ['AI', '세미나', '연구실'], visibility: 'public', likeIds: ['u_sua', DEMO_USER_ID], savedIds: ['u_sua'],
    comments: [], relatedActivityId: 'a_ai_seminar', createdAt: isoHoursAgo(12),
  },
  {
    id: 'po6', authorId: 'u_yuna', authorType: 'user', postType: 'info', media: [{ emoji: '📚', hue: 45 , url: photo('c_library') }],
    text: '중도 4층 창가 자리 꿀팁: 오후 2시 이후 햇빛 안 들어와서 노트북 하기 좋음. (같은 학교만)',
    tags: ['중앙도서관', '공부'], visibility: 'school', likeIds: ['u_woojin'], savedIds: [],
    comments: [], createdAt: isoHoursAgo(15),
  },
  {
    id: 'po7', authorId: 'u_hana', authorType: 'user', postType: 'review', media: [{ emoji: '🎨', hue: 335 , url: photo('c_art') }, { emoji: '📷', hue: 320 , url: photo('c_chair') }],
    text: '지난 주 성수 전시 후기. 이번 주말에 또 갈 건데 같이 가실 분 활동 열어뒀어요!',
    tags: ['전시', '성수', '후기'], visibility: 'public', likeIds: ['u_jimin', 'u_seoyeon'], savedIds: [],
    comments: [{ id: 'pc3', authorId: 'u_seoyeon', text: '사진 너무 예뻐요', createdAt: isoHoursAgo(20) }],
    relatedActivityId: 'a_exhibit', createdAt: isoHoursAgo(22),
  },
  {
    id: 'po8', authorId: 'u_taeho', authorType: 'user', postType: 'info', media: [{ emoji: '🏷️', hue: 50 , url: photo('c_mug') }],
    text: '연세로 카페 온도, 오늘 학생증 보여주면 아메리카노 1+1이래요. 학교 주변 정보 공유!',
    tags: ['학교주변', '혜택'], visibility: 'public', likeIds: ['u_sua', 'u_jimin', 'u_minjun', 'u_yuna'], savedIds: [],
    comments: [], relatedActivityId: 'a_deal', createdAt: isoHoursAgo(11),
  },
  {
    id: 'po9', authorId: DEMO_USER_ID, authorType: 'user', media: [{ emoji: '💻', hue: 235 , url: photo('c_laptop') }],
    text: '사이드 프로젝트 팀원 모집 중! 리액트로 캠퍼스 앱 만들어요.',
    tags: ['사이드프로젝트', '리액트'], visibility: 'school', likeIds: ['u_sua', 'u_hana'], savedIds: [],
    comments: [], relatedActivityId: 'a_mine', createdAt: isoHoursAgo(26),
  },
  // ─── 스폰서 글 (광고) — 피드에 4개마다 하나씩 끼워 넣는다 ───
  {
    id: 'ad_cafe', authorId: 'o_startup', authorType: 'org', orgId: 'o_startup', postType: 'info', media: [{ emoji: '☕', hue: 30, url: photo('c_espresso') }],
    text: '신촌 카페 라떼 1+1 — 학생증만 보여주면 끝. 이번 주 평일 오후 2–5시.', tags: ['신촌', '카페'], visibility: 'public', likeIds: [], savedIds: [], comments: [],
    sponsored: { advertiser: '카페 온더코너 신촌점', cta: '쿠폰 받기', deal: '라떼 1+1 · 평일 14–17시 · 학생증 제시' }, showOnProfile: false, showOnFeed: true, createdAt: isoHoursAgo(3),
  },
  {
    id: 'ad_toeic', authorId: 'o_startup', authorType: 'org', orgId: 'o_startup', postType: 'info', media: [{ emoji: '📚', hue: 220, url: photo('c_library') }],
    text: '토익 무료 레벨테스트 + 첫 달 30% — 연세대생 전용 코드 YONSEI30.', tags: ['토익', '어학'], visibility: 'public', likeIds: [], savedIds: [], comments: [],
    sponsored: { advertiser: '해커스어학원 신촌', cta: '레벨테스트 신청', deal: '무료 레벨테스트 · 첫 달 30% 할인' }, showOnProfile: false, showOnFeed: true, createdAt: isoHoursAgo(9),
  },
  {
    id: 'ad_delivery', authorId: 'o_startup', authorType: 'org', orgId: 'o_startup', postType: 'info', media: [{ emoji: '🍕', hue: 10, url: photo('c_pizza') }],
    text: '시험 기간 야식 5,000원 할인 — 대학생 인증하면 매주 쿠폰.', tags: ['배달', '야식'], visibility: 'public', likeIds: [], savedIds: [], comments: [],
    sponsored: { advertiser: '배달의민족 대학생 클럽', cta: '쿠폰 받기', deal: '매주 5,000원 쿠폰 · 대학생 인증' }, showOnProfile: false, showOnFeed: true, createdAt: isoHoursAgo(20),
  },
];

export const relationships: Relationships = {
  likes: [
    { fromId: 'u_jimin', toId: DEMO_USER_ID, createdAt: isoHoursAgo(3) },
    { fromId: 'u_hana', toId: DEMO_USER_ID, createdAt: isoHoursAgo(8) },
    { fromId: DEMO_USER_ID, toId: 'u_yuna', createdAt: isoHoursAgo(30) },
  ],
  follows: [
    { fromId: DEMO_USER_ID, toId: 'u_taeho', targetType: 'user' },
    { fromId: DEMO_USER_ID, toId: 'o_band', targetType: 'org' },
    { fromId: DEMO_USER_ID, toId: 'o_ailab', targetType: 'org' },
    { fromId: 'u_sua', toId: DEMO_USER_ID, targetType: 'user' },
    { fromId: 'u_jimin', toId: DEMO_USER_ID, targetType: 'user' },
  ],
  friendRequests: [
    { id: 'fr1', fromId: 'u_minjun', toId: DEMO_USER_ID, status: 'pending', createdAt: isoHoursAgo(2) },
    { id: 'fr2', fromId: DEMO_USER_ID, toId: 'u_dohyun', status: 'pending', createdAt: isoHoursAgo(20) },
  ],
  friends: [
    { a: DEMO_USER_ID, b: 'u_seoyeon', since: isoHoursAgo(24 * 20) },
    { a: DEMO_USER_ID, b: 'u_junho', since: isoHoursAgo(24 * 60) },
    { a: DEMO_USER_ID, b: 'u_sua', since: isoHoursAgo(24 * 5) },
    { a: 'u_seoyeon', b: 'u_junho', since: isoHoursAgo(24 * 90) },
    { a: 'u_jimin', b: 'u_seoyeon', since: isoHoursAgo(24 * 30) },
  ],
  blocks: [],
};

export const proposals: ActivityProposal[] = [
  {
    id: 'pr1', fromId: 'u_sua', toId: DEMO_USER_ID, category: 'study', message: '이번 주 목요일 저녁에 알고리즘 같이 풀어요!', when: `${T2} 19:00`,
    status: 'pending', createdAt: isoHoursAgo(1), expiresAt: new Date(Date.now() + 47 * 3600000).toISOString(),
  },
];

export const chatRooms: ChatRoom[] = [
  {
    id: 'cr_seoyeon', type: 'direct', memberIds: [DEMO_USER_ID, 'u_seoyeon'], createdAt: isoHoursAgo(24 * 20),
    messages: [
      { id: 'm1', senderId: 'u_seoyeon', text: '내일 마라탕 올 거지?', createdAt: isoHoursAgo(3) },
      { id: 'm2', senderId: DEMO_USER_ID, text: '당연하지 ㅋㅋ 7시 맞지?', createdAt: isoHoursAgo(2.5) },
      { id: 'm3', senderId: 'u_seoyeon', text: 'ㅇㅇ 준호도 온대', createdAt: isoHoursAgo(2) },
    ],
    lastReadAt: { [DEMO_USER_ID]: isoHoursAgo(2.4), u_seoyeon: isoHoursAgo(2) },
  },
  {
    id: 'cr_junho', type: 'direct', memberIds: [DEMO_USER_ID, 'u_junho'], createdAt: isoHoursAgo(24 * 60),
    messages: [
      { id: 'm4', senderId: 'u_junho', text: '공연 티켓 두 장 빼놨어', createdAt: isoHoursAgo(26) },
      { id: 'm5', senderId: DEMO_USER_ID, text: '고마워!! 하나랑 같이 갈게', createdAt: isoHoursAgo(25) },
    ],
    lastReadAt: { [DEMO_USER_ID]: isoHoursAgo(25), u_junho: isoHoursAgo(25) },
  },
  {
    id: 'cr_running', type: 'activity', activityId: 'a_running', memberIds: ['u_minjun', 'u_jimin', DEMO_USER_ID], title: '오후 7시 러닝 모임 (5km)', createdAt: isoHoursAgo(6),
    messages: [
      { id: 'm6', senderId: 'u_minjun', text: '오늘 운동장 정문 쪽 트랙에서 6시 50분 집합!', createdAt: isoHoursAgo(1.5), },
      { id: 'm7', senderId: 'u_jimin', text: '넵 물 챙겨갈게요', createdAt: isoHoursAgo(1) },
    ],
    lastReadAt: { [DEMO_USER_ID]: isoHoursAgo(3) },
  },
  {
    id: 'cr_mine', type: 'activity', activityId: 'a_mine', memberIds: [DEMO_USER_ID, 'u_dohyun'], title: '리액트 사이드 프로젝트 같이 하실 분', createdAt: isoHoursAgo(5),
    messages: [
      { id: 'm8', senderId: 'u_dohyun', text: '백엔드는 제가 볼게요. 파이썬 괜찮죠?', createdAt: isoHoursAgo(4) },
    ],
    lastReadAt: { [DEMO_USER_ID]: isoHoursAgo(4) },
  },
  {
    id: 'cr_band', type: 'org', orgId: 'o_band', memberIds: ['u_junho', 'u_seoyeon', 'u_hana', DEMO_USER_ID], title: '소리울림 팔로워 채널', createdAt: isoHoursAgo(24 * 10),
    messages: [
      { id: 'm9', senderId: 'u_junho', text: '[공지] 정기공연 리허설 목요일 7시. 팔로워분들 관람 환영!', createdAt: isoHoursAgo(5) },
    ],
    lastReadAt: { [DEMO_USER_ID]: isoHoursAgo(6) },
  },
];

export const notifications: Notification[] = [
  { id: 'nt1', userId: DEMO_USER_ID, type: 'participation_request', title: '참가 요청 2건', body: '하나, 수아님이 "리액트 사이드 프로젝트"에 참가를 신청했어요.', link: '/activities/a_mine/manage', read: false, createdAt: isoMinutesAgo(20) },
  { id: 'nt2', userId: DEMO_USER_ID, type: 'proposal', title: '활동 제안이 도착했어요', body: '수아님이 알고리즘 스터디를 제안했어요.', link: '/chats?tab=requests', read: false, createdAt: isoHoursAgo(1) },
  { id: 'nt3', userId: DEMO_USER_ID, type: 'activity_reminder', title: '활동 시작 1시간 전', body: '"오후 7시 러닝 모임"이 곧 시작해요. 대운동장으로 가세요.', link: '/activities/a_running', read: false, createdAt: isoHoursAgo(1.2) },
  { id: 'nt4', userId: DEMO_USER_ID, type: 'comment', title: '새 댓글', body: '하나님이 "리액트 사이드 프로젝트"에 댓글을 남겼어요.', link: '/activities/a_mine', read: true, createdAt: isoHoursAgo(1) },
  { id: 'nt5', userId: DEMO_USER_ID, type: 'follow', title: '새 팔로워', body: '지민님이 회원님을 팔로우하기 시작했어요.', link: '/users/u_jimin', read: true, createdAt: isoHoursAgo(3) },
  { id: 'nt6', userId: DEMO_USER_ID, type: 'org_event', title: '소리울림 새 행사', body: '가을 정기공연이 등록되었어요.', link: '/activities/a_band_show', read: true, createdAt: isoHoursAgo(48) },
  { id: 'nt7', userId: DEMO_USER_ID, type: 'nearby_activity', title: '가까운 곳에서 관심 활동 시작', body: '정문 카페에서 창업 커피챗이 열려요.', link: '/activities/a_startup_chat', read: true, createdAt: isoHoursAgo(10) },
  { id: 'nt9', userId: DEMO_USER_ID, type: 'deadline', title: '마감 4일 전', body: '저장한 "2학기 우리사랑 장학금" 신청이 곧 마감돼요.', link: '/opportunities/op_scholarship', read: false, createdAt: isoMinutesAgo(10) },
  { id: 'nt10', userId: DEMO_USER_ID, type: 'opportunity_match', title: '같이 준비할 사람이 있어요', body: 'AI Campus Hackathon에 지원 예정인 학생 2명이 개발자를 찾고 있어요.', link: '/opportunities/op_hackathon', read: false, createdAt: isoHoursAgo(2) },
  { id: 'nt8', userId: DEMO_USER_ID, type: 'like', title: '좋아요', body: '수아, 하나님이 회원님의 게시물을 좋아해요.', link: '/community', read: true, createdAt: isoHoursAgo(24) },
];

export const opportunities: Opportunity[] = [
  {
    id: 'op_exchange', type: 'exchange', title: '2027 봄 교환학생 모집 (UC Berkeley 외 40개교)', host: '연세대 국제처', description: '1학기 또는 1년. 평점 3.0 이상, 어학 성적 제출. 설명회 다음 주 백양누리.',
    cover: { emoji: '✈️', hue: 210 }, deadline: addDaysISO(18), eligibility: '재학생, 평점 3.0 이상, 어학 성적', benefit: '등록금 본교 납부, 교환 장학금 지원 가능',
    sourceUrl: 'https://example.com/exchange', sourceLabel: '국제처 공지', tags: ['교환학생', '해외'], interests: ['networking'], goals: ['friends'], schoolId: 's_yonsei', official: true, lastVerified: T, qna: [], reviews: [], createdAt: isoHoursAgo(36),
  },
  {
    id: 'op_hackathon', type: 'hackathon', title: 'AI Campus Hackathon 2026', host: '연세대 창업지원단 × 네이버', description: '48시간 동안 캠퍼스 문제를 AI로 푸는 해커톤. 2~4인 팀, 전공 무관. 우승팀 상금 500만원과 인턴 면접 기회.',
    cover: { emoji: '💡', hue: 230 , url: photo('c_abstract2') }, deadline: addDaysISO(7), date: addDaysISO(14), startTime: '09:00', place: { name: '공학관 대강당', lat: 37.5617, lng: 126.9367 },
    eligibility: '연세대 재학생·대학원생, 전공 무관', benefit: '상금 500만원, 인턴 면접 기회', rolesNeeded: ['developer', 'designer', 'planning'], teamSize: '2~4명',
    sourceUrl: 'https://example.com/hackathon', sourceLabel: '창업지원단 공지', tags: ['AI', '해커톤', '팀빌딩'], interests: ['startup', 'study', 'research'], goals: ['hackathon', 'startup'],
    schoolId: 's_yonsei', official: true, lastVerified: T, qna: [{ id: 'oq1', authorId: 'u_sua', text: '1학년도 참가 가능한가요?', createdAt: isoHoursAgo(5) }, { id: 'oq2', authorId: 'u_taeho', text: '작년에 1학년 팀도 본선 갔어요. 괜찮아요!', createdAt: isoHoursAgo(4) }],
    reviews: [{ id: 'or1', authorId: 'u_taeho', text: '작년 참가. 심사위원이 데모 완성도를 제일 봐요. 발표 연습 필수.', result: 'attended', createdAt: isoHoursAgo(24 * 200) }], createdAt: isoHoursAgo(72),
  },
  {
    id: 'op_scholarship', type: 'scholarship', title: '2학기 우리사랑 장학금', host: '연세대 장학팀', description: '성적 3.0 이상, 소득 분위 무관. 학기당 200만원. 학교 장학 포털에서 신청서와 자기소개서 제출.',
    cover: { emoji: '🎓', hue: 45 , url: photo('c_grads') }, deadline: addDaysISO(4), eligibility: '재학생, 직전 학기 평점 3.0 이상', benefit: '학기당 200만원, 중복 수혜 가능',
    sourceUrl: 'https://example.com/scholarship', sourceLabel: '연세 장학 포털', tags: ['장학금', '마감임박'], interests: [], goals: ['scholarship'],
    schoolId: 's_yonsei', official: true, lastVerified: T, qna: [], reviews: [{ id: 'or2', authorId: 'u_woojin', text: '자기소개서에 활동 계획을 구체적으로 쓰면 유리해요. 지난 학기 수혜.', result: 'accepted', createdAt: isoHoursAgo(24 * 120) }], createdAt: isoHoursAgo(48),
  },
  {
    id: 'op_lab', type: 'lab', title: 'AI 연구실 학부 인턴 모집', host: 'Vision & Language Lab', orgId: 'o_ailab', description: '멀티모달 모델 연구 보조. 주 10시간, 학점 인정 또는 연구비. 파이썬 기본, 관심과 성실함이 더 중요.',
    cover: { emoji: '🔬', hue: 175 , url: photo('c_beaker') }, deadline: addDaysISO(20), eligibility: '3학년 이상 또는 파이썬 경험자', benefit: '연구비 월 50만원 또는 연구학점', rolesNeeded: ['research', 'developer'],
    sourceUrl: 'https://example.com/lab', sourceLabel: '연구실 홈페이지', tags: ['연구실', 'AI', '인턴'], interests: ['research', 'study'], goals: ['lab'],
    schoolId: 's_yonsei', lastVerified: T, qna: [], reviews: [], createdAt: isoHoursAgo(100),
  },
  {
    id: 'op_intern', type: 'internship', title: '토스 여름 인턴 (프로덕트 디자인·개발)', host: '토스', description: '8주 유급 인턴. 서류 → 과제 → 면접. 캠퍼스 리크루팅 설명회 다음 주 학생회관.',
    cover: { emoji: '💼', hue: 250 , url: photo('c_city') }, deadline: addDaysISO(12), date: addDaysISO(5), startTime: '17:00', place: { name: '학생회관 소강당', lat: 37.5637, lng: 126.9387 },
    eligibility: '졸업 예정자 또는 휴학 가능자', benefit: '월 300만원, 정규직 전환 기회', sourceUrl: 'https://example.com/toss', sourceLabel: '토스 채용',
    tags: ['인턴', '설명회', '개발', '디자인'], interests: ['startup', 'networking'], goals: ['internship'], lastVerified: addDaysISO(-1), qna: [], reviews: [], createdAt: isoHoursAgo(60),
  },
  {
    id: 'op_band', type: 'club', title: '소리울림 2학기 신입회원 모집', host: '소리울림 (밴드 동아리)', orgId: 'o_band', description: '악기 경험 없어도 환영. 오디션 대신 합주 체험 후 가입. 백양로 부스에서 신청.',
    cover: { emoji: '🎸', hue: 285 , url: photo('c_aguitar') }, deadline: T9, eligibility: '연세대 재학생', benefit: '합주실 사용, 정기공연 무대', sourceUrl: 'https://instagram.com/example', sourceLabel: '인스타그램',
    tags: ['동아리', '밴드', '모집'], interests: ['club', 'exhibition'], goals: ['join_club', 'hobby'], schoolId: 's_yonsei', lastVerified: T, qna: [], reviews: [{ id: 'or3', authorId: 'u_seoyeon', text: '작년에 가입. 초보였는데 선배들이 잘 알려줘요.', result: 'accepted', createdAt: isoHoursAgo(24 * 300) }], createdAt: isoHoursAgo(30),
  },
  {
    id: 'op_festival', type: 'event', title: '가을 아카라카 사전 행사', host: '연세대 총학생회', description: '노천극장 사전 축제. 학생증 지참. 동아리 부스와 푸드트럭.',
    cover: { emoji: '🎪', hue: 355 , url: photo('c_tents') }, date: T4, startTime: '17:00', place: { name: '노천극장', lat: 37.5668, lng: 126.9385 }, eligibility: '연세대 구성원',
    sourceUrl: 'https://example.com/festival', sourceLabel: '총학생회 공지', tags: ['축제', '학교행사'], interests: ['exhibition', 'club', 'meal'], goals: ['friends', 'hobby'], schoolId: 's_yonsei', official: true, lastVerified: T, qna: [], reviews: [], createdAt: isoHoursAgo(100),
  },
  {
    id: 'op_startup', type: 'startup', title: 'YSVC 가을 기수 · 공동창업자 매칭 데이', host: '연세 창업동아리 YSVC', orgId: 'o_startup', description: '아이디어 발표 3분 + 팀빌딩. 개발자·디자이너·기획자 골고루 모집.',
    cover: { emoji: '🚀', hue: 15 , url: photo('c_abstract3') }, deadline: addDaysISO(10), date: addDaysISO(11), startTime: '19:00', place: { name: '경영관 201', lat: 37.5605, lng: 126.9390 },
    eligibility: '창업에 관심 있는 누구나', rolesNeeded: ['developer', 'designer', 'planning', 'marketing'], teamSize: '2~5명', sourceUrl: 'https://example.com/ysvc', sourceLabel: 'YSVC 노션',
    tags: ['창업', '팀빌딩', '공동창업자'], interests: ['startup', 'networking'], goals: ['startup', 'cofounder'], schoolId: 's_yonsei', lastVerified: T, qna: [], reviews: [], createdAt: isoHoursAgo(40),
  },
  {
    id: 'op_contest', type: 'hackathon', title: '서울시 대학생 공공데이터 공모전', host: '서울특별시', description: '공공데이터 활용 서비스 기획·개발. 개인 또는 팀. 1차 서류, 2차 발표.',
    cover: { emoji: '📊', hue: 200 , url: photo('c_abstract4') }, deadline: addDaysISO(25), eligibility: '서울 소재 대학 재학생', benefit: '대상 300만원', rolesNeeded: ['data', 'developer', 'planning'], teamSize: '1~4명',
    sourceUrl: 'https://example.com/seoul', sourceLabel: '서울시 공고', tags: ['공모전', '데이터', '대외활동'], interests: ['research', 'study', 'startup'], goals: ['hackathon'], lastVerified: addDaysISO(-2), qna: [], reviews: [], createdAt: isoHoursAgo(80),
  },
  {
    id: 'op_lunch', type: 'activity', title: '점심 같이 먹기 — 학생회관 12시', host: '수아', description: '오늘 12시~13시 공강인 사람 학생회관 식당에서 같이 점심!',
    cover: { emoji: '🍱', hue: 30 , url: photo('c_paella') }, date: T, startTime: '12:00', place: { name: '학생회관 식당', lat: 37.5637, lng: 126.9387 }, eligibility: '누구나',
    sourceUrl: '', sourceLabel: '', tags: ['점심', '공강'], interests: ['meal', 'coffee'], goals: ['lunch', 'friends'], schoolId: 's_yonsei', lastVerified: T, qna: [], reviews: [], createdAt: isoHoursAgo(1),
  },
];

export const opportunityIntents: OpportunityIntentRecord[] = [
  { id: 'oi1', opportunityId: 'op_hackathon', userId: 'u_sua', intent: 'going', saved: true, createdAt: isoHoursAgo(5) },
  { id: 'oi2', opportunityId: 'op_hackathon', userId: 'u_hana', intent: 'going', saved: true, createdAt: isoHoursAgo(9) },
  { id: 'oi3', opportunityId: 'op_hackathon', userId: 'u_dohyun', intent: 'team', saved: false, createdAt: isoHoursAgo(20) },
  { id: 'oi4', opportunityId: 'op_hackathon', userId: 'u_jimin', intent: 'company', saved: true, createdAt: isoHoursAgo(30) },
  { id: 'oi5', opportunityId: 'op_scholarship', userId: 'u_yuna', intent: 'going', saved: true, createdAt: isoHoursAgo(10) },
  { id: 'oi6', opportunityId: 'op_scholarship', userId: 'u_woojin', intent: 'done', saved: false, createdAt: isoHoursAgo(24 * 120) },
  { id: 'oi7', opportunityId: 'op_lab', userId: 'u_sua', intent: 'interested', saved: true, createdAt: isoHoursAgo(12) },
  { id: 'oi8', opportunityId: 'op_lab', userId: DEMO_USER_ID, intent: 'interested', saved: true, createdAt: isoHoursAgo(40) },
  { id: 'oi9', opportunityId: 'op_startup', userId: 'u_jimin', intent: 'solo', saved: true, createdAt: isoHoursAgo(15) },
  { id: 'oi10', opportunityId: 'op_startup', userId: 'u_taeho', intent: 'going', saved: false, createdAt: isoHoursAgo(35) },
  { id: 'oi11', opportunityId: 'op_band', userId: 'u_hana', intent: 'company', saved: true, createdAt: isoHoursAgo(8) },
  { id: 'oi20', opportunityId: 'op_festival', userId: 'u_seoyeon', intent: 'company', saved: false, createdAt: isoHoursAgo(4) },
  { id: 'oi21', opportunityId: 'op_festival', userId: 'u_sua', intent: 'solo', saved: false, createdAt: isoHoursAgo(6) },
  { id: 'oi22', opportunityId: 'op_festival', userId: 'u_junho', intent: 'going', saved: false, createdAt: isoHoursAgo(9) },
  { id: 'oi23', opportunityId: 'op_band', userId: 'u_taeho', intent: 'done', saved: false, createdAt: isoHoursAgo(24 * 300) },
  { id: 'oi12', opportunityId: 'op_intern', userId: 'u_junho', intent: 'going', saved: true, createdAt: isoHoursAgo(50) },
  { id: 'oi13', opportunityId: 'op_intern', userId: 'u_minjun', intent: 'interested', saved: false, createdAt: isoHoursAgo(45) },
  { id: 'oi14', opportunityId: 'op_scholarship', userId: DEMO_USER_ID, intent: 'interested', saved: true, createdAt: isoHoursAgo(20) },
  { id: 'oi15', opportunityId: 'op_lunch', userId: 'u_jimin', intent: 'interested', saved: false, createdAt: isoMinutesAgo(30) },
];

/** Plan Together — 서연이 마라탕 시간을 정하는 중. 준호는 이미 투표했고 나는 아직 */
export const timePolls: TimePoll[] = [
  {
    id: 'tp_dinner', hostId: 'u_seoyeon', title: '시험 끝 기념 마라탕', category: 'meal', place: { name: '신촌 마라공방', lat: 37.5563, lng: 126.9382 },
    inviteeIds: [DEMO_USER_ID, 'u_junho', 'u_jimin'],
    options: [
      { id: 'to1', date: T1, startTime: '18:30', endTime: '20:00', suggested: true },
      { id: 'to2', date: T2, startTime: '19:00', endTime: '20:30', suggested: true },
      { id: 'to3', date: addDaysISO(3), startTime: '12:00', endTime: '13:30' },
    ],
    votes: { u_seoyeon: ['to1', 'to2', 'to3'], u_junho: ['to2', 'to3'], u_jimin: ['to1', 'to2'] },
    status: 'open', closesAt: new Date(Date.now() + 36 * 3600000).toISOString(), createdAt: isoHoursAgo(2),
  },
];

// ─── v2 (2026-09 UX 재설계): 거주·활동 도시 · 졸업연도 · 인증 방법 · 찾는 것 · 직업 ────────────────
// 모든 사용자는 학교 인증 하나 이상. 지역은 도시 단위, 거주지와 활동 지역이 다를 수 있다.
const Y = new Date().getFullYear();
const V2: Record<string, Partial<User>> = {
  u_me: { homeCity: '서울', gradYear: Y + 1, verification: { method: 'school_email', at: isoHoursAgo(24 * 30) }, wants: { people: ['same_interest', 'other_school', 'senior_mentor'], activities: ['coffee', 'project', 'study'] } },
  u_jimin: { homeCity: '서울', gradYear: Y + 1, verification: { method: 'sso', at: isoHoursAgo(24 * 40) }, interests: ['coffee', 'exhibition', 'running', 'startup', 'networking'], wants: { people: ['same_interest', 'new_people'], activities: ['coffee', 'exercise', 'networking'] } },
  u_dohyun: { stage: 'masters', research: { field: 'AI', lab: '인공지능 연구실', year: 1, keywords: ['LLM', '추천 시스템'], showAdvisor: false }, homeCity: '서울', gradYear: Y + 2, verification: { method: 'school_email', at: isoHoursAgo(24 * 100) }, interests: ['research', 'ai', 'exercise', 'coffee'], wants: { people: ['same_research', 'same_major', 'same_interest'], activities: ['study', 'research', 'exercise'] } },
  u_seoyeon: { homeCity: '서울', gradYear: Y + 2, verification: { method: 'student_id', at: isoHoursAgo(24 * 12) }, interests: ['club', 'music', 'meal', 'walk'], wants: { people: ['same_interest', 'new_people'], activities: ['hobby', 'meal'] } },
  u_minjun: { homeCity: '서울', activityCity: '서울', gradYear: Y, verification: { method: 'school_email', at: isoHoursAgo(24 * 60) }, interests: ['running', 'exercise', 'cycling', 'meal'], wants: { people: ['same_city', 'same_interest'], activities: ['exercise', 'meal'] } },
  u_yuna: { homeCity: '인천', activityCity: '서울', gradYear: Y + 1, verification: { method: 'school_email', at: isoHoursAgo(24 * 50) }, interests: ['study', 'coffee', 'reading', 'research'], wants: { people: ['same_major', 'senior_mentor'], activities: ['study', 'coffee'] } },
  u_taeho: { homeCity: '서울', gradYear: 2023, verification: { method: 'alumni_email', at: isoHoursAgo(24 * 200) }, career: { city: '서울', company: '스타트업 (창업)', industry: '스타트업', role: '창업자' }, interests: ['startup', 'networking', 'coffee', 'ai'], wants: { people: ['alumni', 'same_field', 'same_city'], activities: ['coffee', 'networking', 'project'] } },
  u_hana: { homeCity: '서울', gradYear: Y + 2, verification: { method: 'student_id', at: isoHoursAgo(24 * 20) }, interests: ['exhibition', 'design', 'photo', 'coffee'], wants: { people: ['other_school', 'same_interest'], activities: ['hobby', 'coffee'] } },
  u_junho: { homeCity: '서울', gradYear: Y, verification: { method: 'sso', at: isoHoursAgo(24 * 90) }, interests: ['club', 'music', 'film', 'coffee'], wants: { people: ['same_interest'], activities: ['hobby', 'meal'] } },
  u_sua: { homeCity: '서울', gradYear: Y + 3, verification: { method: 'school_email', at: isoHoursAgo(24 * 10) }, interests: ['study', 'walk', 'coffee', 'startup'], wants: { people: ['same_major', 'senior_mentor'], activities: ['study', 'coffee'] } },
  u_woojin: { homeCity: '성남', activityCity: '서울', gradYear: Y + 1, verification: { method: 'school_email', at: isoHoursAgo(24 * 70) }, interests: ['study', 'exercise', 'research', 'finance'], wants: { people: ['same_major', 'same_field'], activities: ['study', 'exercise'] } },
  u_b_snu1: { homeCity: '서울', gradYear: Y + 1, verification: { method: 'school_email', at: isoHoursAgo(24 * 30) }, interests: ['research', 'ai', 'startup', 'coffee'], wants: { people: ['other_school', 'same_interest'], activities: ['coffee', 'project', 'research'] } },
  u_b_kaist1: { homeCity: '대전', activityCity: '서울', gradYear: Y + 2, verification: { method: 'sso', at: isoHoursAgo(24 * 30) }, interests: ['research', 'ai', 'exercise', 'exhibition'], wants: { people: ['same_field', 'other_school'], activities: ['research', 'networking'] } },
  u_b_korea1: { homeCity: '서울', gradYear: Y + 1, verification: { method: 'school_email', at: isoHoursAgo(24 * 30) }, interests: ['startup', 'networking', 'coffee', 'design'], wants: { people: ['other_school', 'same_interest'], activities: ['coffee', 'project'] } },
  u_b_snu2: { homeCity: '서울', gradYear: 2021, verification: { method: 'diploma', at: isoHoursAgo(24 * 30) }, career: { city: '서울', company: '토스', industry: '금융', role: 'Product' }, interests: ['startup', 'networking', 'exercise', 'finance'], wants: { people: ['same_field', 'same_city', 'alumni'], activities: ['coffee', 'networking'] } },
  u_b_kaist2: { homeCity: '대전', gradYear: Y + 2, verification: { method: 'student_id', at: isoHoursAgo(24 * 30) }, interests: ['startup', 'club', 'coffee', 'game'], wants: { people: ['other_school', 'new_people'], activities: ['project', 'hobby'] } },
};
users.forEach((u) => Object.assign(u, V2[u.id]));

/** v2 추가 사용자 — 다른 학교·다른 도시 졸업생 (뉴욕+금융 · Product+도쿄 · 서울+AI 검색 예시가 걸리도록). 타학교·동문 보기는 무료 */
users.push(
  mk({ id: 'u_a_ny_fin', nickname: '예린', birthYear: 1995, gender: 'female', avatar: { emoji: '🗽', hue: 205, photoType: 'face', url: photo('p_x1') }, photos: [photo('p_x1'), photo('c_city')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_yonsei', schoolName: '연세대학교', role: 'alumni', department: '경영학과', year: 2017, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'alumni',
    homeCity: '뉴욕', gradYear: 2017, verification: { method: 'alumni_association', at: isoHoursAgo(24 * 15) }, career: { city: '뉴욕', company: '골드만삭스', industry: '금융', role: 'IB Associate' }, region: '뉴욕',
    bio: '뉴욕 IB 5년차. 미국 금융권 준비하는 후배들 커피챗 환영.', interests: ['finance', 'invest', 'running', 'travel'], purposes: ['networking'], goals: [], lookingFor: [], canOffer: ['mentor'], openTo: ['mentoring', 'coffee', 'networking'], fieldVisibility: defaultVisibility('public'), availability: 'weekend',
    wants: { people: ['alumni', 'same_city', 'same_field'], activities: ['coffee', 'networking'] }, createdAt: isoHoursAgo(24 * 3) }),
  mk({ id: 'u_a_tokyo_pm', nickname: '현우', birthYear: 1994, gender: 'male', avatar: { emoji: '🗼', hue: 350, photoType: 'face', url: photo('p_x5') }, photos: [photo('p_x5'), photo('c_desktop')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_korea', schoolName: '고려대학교', role: 'alumni', department: '산업공학과', year: 2016, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'alumni',
    homeCity: '도쿄', gradYear: 2016, verification: { method: 'alumni_email', at: isoHoursAgo(24 * 25) }, career: { city: '도쿄', company: '메루카리', industry: 'IT', role: 'Product' }, region: '도쿄',
    bio: '도쿄에서 프로덕트 매니저. 일본 취업·이직 이야기 나눠요.', interests: ['design', 'travel', 'coffee', 'startup'], purposes: ['networking'], goals: [], lookingFor: [], canOffer: ['mentor', 'planning'], openTo: ['mentoring', 'coffee'], fieldVisibility: defaultVisibility('public'), availability: 'after18',
    wants: { people: ['same_field', 'same_city', 'new_people'], activities: ['coffee', 'networking'] }, createdAt: isoHoursAgo(24 * 5) }),
  mk({ id: 'u_a_seoul_ai', nickname: '소영', birthYear: 1997, gender: 'female', avatar: { emoji: '🤖', hue: 160, photoType: 'face', url: photo('p_x3') }, photos: [photo('p_x3'), photo('c_road_sunset')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_kaist', schoolName: 'KAIST', role: 'alumni', department: '전산학부', year: 2019, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'alumni',
    homeCity: '서울', gradYear: 2019, verification: { method: 'diploma', at: isoHoursAgo(24 * 8) }, career: { city: '서울', company: '네이버', industry: 'AI', role: 'ML Engineer' }, region: '서울',
    bio: 'ML 엔지니어. 주말엔 한강 러닝. 서울 AI 러닝 크루 운영해요.', interests: ['ai', 'running', 'research', 'coffee'], purposes: ['networking', 'hobby'], goals: [], lookingFor: [], canOffer: ['mentor', 'developer'], openTo: ['activities', 'networking', 'mentoring'], fieldVisibility: defaultVisibility('public'), availability: 'weekend',
    wants: { people: ['same_field', 'same_city', 'same_interest'], activities: ['exercise', 'networking', 'research'] }, createdAt: isoHoursAgo(24 * 2) }),
  mk({ id: 'u_a_yonsei_seoul', nickname: '재민', birthYear: 1996, gender: 'male', avatar: { emoji: '💼', hue: 30, photoType: 'face', url: photo('p_x6') }, photos: [photo('p_x6'), photo('c_lounge')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_yonsei', schoolName: '연세대학교', role: 'alumni', department: '컴퓨터과학과', year: 2018, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'alumni',
    homeCity: '성남', activityCity: '서울', gradYear: 2018, verification: { method: 'prior_student', at: isoHoursAgo(24 * 400) }, career: { city: '서울', company: '스타트업 (창업)', industry: '스타트업', role: '창업자' }, region: '성남',
    bio: '판교 거주, 서울에서 주로 활동. B2B SaaS 창업 2년차. 같은 과 후배 환영.', interests: ['startup', 'ai', 'coffee', 'invest'], purposes: ['networking'], goals: [], lookingFor: [], canOffer: ['mentor', 'planning'], openTo: ['coffee', 'cofounding', 'mentoring'], fieldVisibility: defaultVisibility('public'), availability: 'after18',
    wants: { people: ['alumni', 'same_major', 'same_field'], activities: ['coffee', 'project', 'networking'] }, createdAt: isoHoursAgo(24 * 6) }),
);

/** v2 자유 그룹 — 학교·지역·관심사·직업 어느 기반이든 사용자가 만든다. 생성·가입 무료 */
organizations.push(
  { id: 'o_seoul_ai_run', name: '서울 AI 러닝 크루', logo: { emoji: '🏃', hue: 160, url: photo('c_road_sunset') }, type: 'community', scope: 'city', city: '서울', joinPolicy: 'open', interests: ['ai', 'running'], verified: false,
    description: 'AI 일 하면서 뛰는 사람들. 학교 상관없이 서울이면 누구나. 매주 토요일 한강.', gallery: [{ emoji: '🌅', hue: 160, caption: '토요일 한강', url: photo('c_road_sunset') }], regularActivities: ['매주 토 08:00 뚝섬'], notices: [],
    followerIds: ['u_jimin', 'u_dohyun'], memberIds: ['u_a_seoul_ai', 'u_minjun', 'u_taeho', 'u_b_kaist1'], adminIds: ['u_a_seoul_ai'], applicantIds: [] },
  { id: 'o_product_study', name: '프로덕트 스터디', logo: { emoji: '🧩', hue: 260, url: photo('c_two_laptops') }, type: 'community', scope: 'career', joinPolicy: 'approval', interests: ['startup', 'design'], verified: false,
    description: 'PM·창업자·디자이너가 2주에 한 번 케이스 토론. 학생도 환영 (직무 관심 있으면).', gallery: [], regularActivities: ['격주 목 20:00 온라인·성수'], notices: [],
    followerIds: ['u_b_korea1'], memberIds: ['u_b_snu2', 'u_a_tokyo_pm', 'u_a_yonsei_seoul'], adminIds: ['u_b_snu2'], applicantIds: [] },
  { id: 'o_yonsei_alumni_seoul', name: '연세 동문 서울 커피챗', logo: { emoji: '🎓', hue: 215, url: photo('c_cafe_laptop') }, type: 'community', scope: 'school', schoolId: 's_yonsei', joinPolicy: 'open', interests: ['coffee', 'networking'], verified: false,
    description: '서울에 있는 연세 동문·재학생 커피챗 모임. 기수·전공 상관없음.', gallery: [], regularActivities: ['월 1회 강남·신촌'], notices: [],
    followerIds: ['u_jimin'], memberIds: ['u_taeho', 'u_a_yonsei_seoul', 'u_a_ny_fin'], adminIds: ['u_taeho'], applicantIds: [] },
);

/** v2 그룹 안 모임 — 모임은 시간·장소·인원·공개 범위만 관리한다 */
activities.push(
  { id: 'a_g_run', kind: 'group', category: 'exercise', title: '토요일 한강 러닝 8km', description: '뚝섬에서 잠실 왕복. 페이스 6분대. 끝나고 커피.', cover: { emoji: '🏃', hue: 160, url: photo('c_road_sunset') },
    hostId: 'u_a_seoul_ai', hostType: 'user', orgId: 'o_seoul_ai_run', date: addDaysISO(2), startTime: '08:00', endTime: '09:30', place: { name: '뚝섬 한강공원', address: '서울 광진구', area: '서울 뚝섬', lat: 37.5310, lng: 127.0665 },
    capacity: 12, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(20) },
  { id: 'a_g_product', kind: 'group', category: 'study', title: '프로덕트 케이스 토론 — 온보딩 개선', description: '그룹 멤버만. 각자 사례 하나씩 가져와요.', cover: { emoji: '🧩', hue: 260, url: photo('c_two_laptops') },
    hostId: 'u_b_snu2', hostType: 'user', orgId: 'o_product_study', date: T4, startTime: '20:00', endTime: '21:30', place: { name: '성수 코워킹 라운지', address: '서울 성동구', area: '서울 성수', lat: 37.5445, lng: 127.0560 },
    capacity: 8, visibility: 'group', joinPolicy: 'approval', fee: 0, comments: [], createdAt: isoHoursAgo(26) },
  { id: 'a_g_alumni_coffee', kind: 'group', category: 'networking', title: '연세 동문 커피챗 (강남)', description: '재학생·동문 누구나. 커리어 이야기 편하게.', cover: { emoji: '☕', hue: 215, url: photo('c_cafe_laptop') },
    hostId: 'u_taeho', hostType: 'user', orgId: 'o_yonsei_alumni_seoul', date: T1, startTime: '19:30', endTime: '21:00', place: { name: '강남역 카페', address: '서울 강남구', area: '서울 강남', lat: 37.4979, lng: 127.0276 },
    capacity: 6, visibility: 'school', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(9) },
);

/** v2.1 가벼운 상태 — 기간이 지나면 꺼진다 */
const soon = (h: number) => new Date(Date.now() + h * 3600000).toISOString();
const STATUS: Record<string, User['status']> = {
  u_jimin: { kind: 'coffee', when: 'week', until: soon(24 * 4), setAt: isoHoursAgo(3) },
  u_minjun: { kind: 'running', when: 'weekend', until: soon(24 * 3), setAt: isoHoursAgo(20) },
  u_a_seoul_ai: { kind: 'running', when: 'weekend', until: soon(24 * 3), setAt: isoHoursAgo(8) },
  u_a_sf_ai: { kind: 'running', when: 'weekend', until: soon(24 * 3), setAt: isoHoursAgo(8) },
  u_b_snu1: { kind: 'coffee', when: 'today', until: soon(8), setAt: isoHoursAgo(1) },
  u_b_stan1: { kind: 'coffee', when: 'today', until: soon(8), setAt: isoHoursAgo(1) },
  u_taeho: { kind: 'coffee', when: 'week', until: soon(24 * 4), setAt: isoHoursAgo(30) },
  u_sua: { kind: 'walk', when: 'now', until: soon(2), setAt: isoMinutesAgo(20) },
};
users.forEach((u) => { if (STATUS[u.id]) u.status = STATUS[u.id]; });

export const savedSearches: SavedSearch[] = [];

/** v2 네트워크 요청 — "이런 분을 찾고 있어요" (다른 사람이 올린 요청이 데모 사용자에게 2촌·관련 네트워크로 온다) */
export const networkRequests: NetworkRequest[] = [
  { id: 'nr_taeho_japan', authorId: 'u_taeho', text: '일본 식품 유통 경험이 있고, 서울에서 한 번 이야기 나눌 수 있는 분', city: '서울', field: '유통', interests: ['startup', 'travel'], reach: 3, status: 'open', dismissedIds: [], responses: [], referrals: [], createdAt: isoHoursAgo(5), expiresAt: addDaysISO(13) },
  { id: 'nr_harin_pm', authorId: 'u_b_snu2', text: 'B2C 앱을 직접 만들어본 경험이 있는 분 (직무 상관없음). 온보딩 개선 사례 30분만 들려주실 수 있으면 좋겠어요', city: '서울', field: 'Product', interests: ['startup', 'design'], reach: 2, status: 'open', dismissedIds: [], responses: [], referrals: [], createdAt: isoHoursAgo(26), expiresAt: addDaysISO(12) },
  { id: 'nr_yerin_ny', authorId: 'u_a_ny_fin', text: '뉴욕에서 대학원 준비 중인 연세 후배. 추천서·에세이 이야기 편하게 해드릴게요', city: '뉴욕', field: '금융', interests: ['finance', 'study'], reach: 3, status: 'open', dismissedIds: [], responses: [], referrals: [], createdAt: isoHoursAgo(50), expiresAt: addDaysISO(10) },
];

/** v2.2 방문 예정 · 저장 목록 · 연결 부탁 (Who's around · Saved lists · 2촌) */
const wk = (d: number) => addDaysISO(d);
const TRIPS: Record<string, User['trips']> = {
  u_a_ny_fin: [{ id: 'tr1', city: '서울', from: wk(1), to: wk(6) }],
  u_a_tokyo_pm: [{ id: 'tr2', city: '서울', from: wk(8), to: wk(11) }],
  u_b_kaist1: [{ id: 'tr3', city: '서울', from: wk(0), to: wk(3) }],
  u_me: [{ id: 'tr4', city: '부산', from: wk(9), to: wk(11) }],
};
users.forEach((u) => { if (TRIPS[u.id]) u.trips = TRIPS[u.id]; });
const me0 = users.find((u) => u.id === DEMO_USER_ID)!;
me0.savedPeople = ['u_a_seoul_ai', 'u_b_korea1'];
me0.savedLists = [{ id: 'sl_startup', name: '창업 이야기 나눌 사람', memberIds: ['u_b_korea1'], notify: true }];
me0.privacy = { scope: 'school_2nd', showCompany: true, showCity: true, showGradYear: true, showGroups: true, showInPaths: true, showTrips: true };
export const introRequests: IntroRequest[] = [
  { id: 'ir_seed1', fromId: 'u_hana', viaId: DEMO_USER_ID, toId: 'u_junho', note: '밴드 공연 포스터 디자인 도와드리고 싶어요', status: 'pending', createdAt: isoHoursAgo(6) },
];

// ─── v2.3 단계별 콘텐츠 — 대학원생(연구·리딩 그룹·학회·진로) · 졸업생(근황·도시 모임·질문 받기·방문·채용) ─────
/** 기존 대학원생의 연구 정보. 분야는 추천(같은 연구 분야 · 내 분야에서 일해요)에 쓰이고 지도교수는 기본 비공개 */
const RESEARCH: Record<string, User['research']> = {
  u_b_snu1: { field: 'NLP', lab: '자연어처리 연구실', advisor: '박성우 교수', showAdvisor: false, year: 2, keywords: ['LLM', '에이전트', '도구 사용'] },
  u_b_kaist1: { field: '로봇', lab: '로봇 학습 연구실', advisor: '정민호 교수', showAdvisor: false, year: 5, keywords: ['매니퓰레이션', '강화학습', 'sim2real'] },
};
users.forEach((u) => { if (RESEARCH[u.id]) u.research = RESEARCH[u.id]; });

/** 대학원생 3명 — 같은 학교(연세) NLP 석사 · 고려대 바이오 박사 · 서울대 경제 석사 */
users.push(
  mk({ id: 'u_g_yonsei_nlp', nickname: '채원', birthYear: 2000, gender: 'female', avatar: { emoji: '📝', hue: 200, photoType: 'face', url: photo('p_x2') }, photos: [photo('p_x2'), photo('c_library')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_yonsei', schoolName: '연세대학교', role: 'graduate', department: '컴퓨터과학과', year: 2025, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'masters', region: '신촌',
    homeCity: '서울', gradYear: Y + 1, verification: { method: 'school_email', at: isoHoursAgo(24 * 20) },
    bio: '한국어 LLM 평가를 연구하는 석사 2년차. 매주 논문 리딩 그룹 열어요.', likes: '논문 읽기, 필사, 산책', freeTime: '공학관 근처 카페에서 논문 정리',
    interests: ['research', 'ai', 'reading', 'coffee'], purposes: ['study', 'networking'], goals: ['lab'], lookingFor: ['study_partner', 'teammate'], canOffer: ['research', 'data'], openTo: ['research', 'coffee', 'activities'], fieldVisibility: defaultVisibility('public'), availability: 'afternoon',
    nowWant: 'LLM 평가 이야기 나눌 분',
    wants: { people: ['same_field', 'other_school', 'senior_mentor'], activities: ['research', 'study', 'coffee'] },
    research: { field: 'NLP', lab: '자연어처리 연구실', advisor: '한지수 교수', showAdvisor: false, year: 2, keywords: ['LLM', '평가', '한국어'] }, createdAt: isoHoursAgo(24 * 10) }),
  mk({ id: 'u_g_korea_bio', nickname: '승민', birthYear: 1997, gender: 'male', avatar: { emoji: '🧬', hue: 140, photoType: 'face', url: photo('p_x4') }, photos: [photo('p_x4'), photo('c_beaker')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_korea', schoolName: '고려대학교', role: 'graduate', department: '생명정보학과', year: 2023, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'phd', region: '안암',
    homeCity: '서울', gradYear: Y + 2, verification: { method: 'sso', at: isoHoursAgo(24 * 45) },
    bio: '단일세포 데이터로 질병 경로를 보는 박사 4년차. 다른 학교 연구실과 같이 일해보고 싶어요.', likes: '러닝, SF 소설, 드립 커피', freeTime: '안암 근처 러닝',
    interests: ['research', 'ai', 'reading', 'running'], purposes: ['networking', 'study'], goals: ['lab'], lookingFor: ['teammate'], canOffer: ['research', 'data'], openTo: ['research', 'coffee', 'networking'], fieldVisibility: defaultVisibility('public'), availability: 'weekend',
    wants: { people: ['same_field', 'other_school', 'senior_mentor'], activities: ['research', 'study', 'coffee'] },
    research: { field: '바이오', lab: '계산생물학 연구실', advisor: '오현석 교수', showAdvisor: false, year: 4, keywords: ['단일세포', '유전체', 'ML'] }, createdAt: isoHoursAgo(24 * 12) }),
  mk({ id: 'u_g_snu_econ', nickname: '다은', birthYear: 2000, gender: 'female', avatar: { emoji: '📊', hue: 40, photoType: 'face', url: photo('p_x1') }, photos: [photo('p_x1'), photo('c_bookshop')], identityVerified: true,
    affiliation: { type: 'university', schoolId: 's_snu', schoolName: '서울대학교', role: 'graduate', department: '경제학부', year: 2025, emailVerified: true, showSchool: true, showDepartment: true }, stage: 'masters', region: '관악',
    homeCity: '서울', gradYear: Y + 1, verification: { method: 'school_email', at: isoHoursAgo(24 * 25) },
    bio: '노동경제 석사. 졸업 앞두고 박사 진학과 취업 사이에서 고민 중이에요.', likes: '서점 구경, 통계 소프트웨어, 떡볶이', freeTime: '관악 근처 독립서점',
    interests: ['research', 'finance', 'reading', 'coffee'], purposes: ['study', 'networking'], goals: ['lab', 'internship'], lookingFor: ['senior', 'study_partner'], canOffer: ['research', 'data'], openTo: ['research', 'coffee', 'mentoring'], fieldVisibility: defaultVisibility('public'), availability: 'after18',
    wants: { people: ['same_field', 'senior_mentor', 'other_school'], activities: ['research', 'study', 'coffee'] },
    research: { field: '경제', lab: '노동경제 워크숍', advisor: '윤재형 교수', showAdvisor: false, year: 2, keywords: ['노동경제', '인과추론', '정책 평가'] }, createdAt: isoHoursAgo(24 * 8) }),
);

/** 대학원생 모임 3개 + 졸업생 모임 2개 */
activities.push(
  { id: 'a_gr_reading', kind: 'group', category: 'study', title: 'NLP 논문 리딩 그룹 — LLM 평가 편', description: '이번 주는 LLM 평가·에이전트 논문 2편. 각자 읽어오고 한 편당 30분 토론. 학교 상관없이 대학원생, 관심 있는 학부생 환영.', cover: { emoji: '📚', hue: 200, url: photo('c_library') },
    hostId: 'u_g_yonsei_nlp', hostType: 'user', date: T2, startTime: '19:00', endTime: '21:00', place: { name: '제1공학관 세미나실', area: '연세대 공학관 근처', lat: 37.5617, lng: 126.9367 },
    capacity: 8, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [{ id: 'c20', authorId: 'u_dohyun', text: '두 번째 논문 발제 제가 할게요', createdAt: isoHoursAgo(6) }], createdAt: isoHoursAgo(10) },
  { id: 'a_gr_conf', kind: 'group', category: 'networking', title: 'EMNLP 가는 사람들 — 포스터 리허설 · 일정 맞추기', description: '올해 EMNLP 가는 대학원생끼리 포스터 한 번씩 발표해보고 숙소·동선 같이 봐요. 발표 없이 참석만 하는 분도 환영.', cover: { emoji: '🎤', hue: 250, url: photo('c_hall') },
    hostId: 'u_b_snu1', hostType: 'user', date: addDaysISO(6), startTime: '18:30', endTime: '20:30', place: { name: '서울대 302동 세미나실', area: '서울 관악', lat: 37.4488, lng: 126.9526 },
    capacity: 10, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(15) },
  { id: 'a_gr_career', kind: 'personal', category: 'coffee', title: '박사 진학 vs 취업 — 대학원생 커피챗', description: '석사 졸업 앞둔 분, 박사 중에 업계를 고민하는 분. 업계로 간 선배도 한 명 와요. 결론 내는 자리가 아니라 경험 나누는 자리예요.', cover: { emoji: '🧭', hue: 25, url: photo('c_cafe_laptop') },
    hostId: 'u_b_kaist1', hostType: 'user', date: addDaysISO(3), startTime: '14:00', endTime: '15:30', place: { name: '강남역 카페', address: '서울 강남구', area: '서울 강남', lat: 37.4979, lng: 127.0276 },
    capacity: 6, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(27) },
  { id: 'a_al_seongsu', kind: 'personal', category: 'networking', title: '퇴근 후 성수 커피 (4명)', description: '일 끝나고 가볍게 커피 한 잔. 졸업생이면 학교·분야 상관없어요. 한 시간만.', cover: { emoji: '☕', hue: 30, url: photo('c_espresso') },
    hostId: 'u_b_snu2', hostType: 'user', date: T2, startTime: '19:00', endTime: '20:00', place: { name: '성수 카페', address: '서울 성동구', area: '서울 성수', lat: 37.5445, lng: 127.0560 },
    capacity: 4, visibility: 'public', joinPolicy: 'open', fee: 0, comments: [], createdAt: isoHoursAgo(4) },
  { id: 'a_al_visit', kind: 'personal', category: 'networking', title: '서울 온 김에 — 뉴욕 금융·유학 커피챗', description: '일주일 서울에 있어요. 뉴욕 금융권이나 미국 대학원 준비하는 연세 후배·동문이면 편하게 오세요.', cover: { emoji: '✈️', hue: 205, url: photo('c_city') },
    hostId: 'u_a_ny_fin', hostType: 'user', date: T4, startTime: '11:00', endTime: '12:30', place: { name: '광화문 카페', address: '서울 종로구', area: '서울 광화문', lat: 37.5714, lng: 126.9768 },
    capacity: 5, visibility: 'school', joinPolicy: 'approval', fee: 0, comments: [], createdAt: isoHoursAgo(8) },
);

participations.push(
  { id: 'p30', activityId: 'a_gr_reading', userId: 'u_b_snu1', status: 'approved', createdAt: isoHoursAgo(8) },
  { id: 'p31', activityId: 'a_gr_reading', userId: 'u_dohyun', status: 'approved', createdAt: isoHoursAgo(7) },
  { id: 'p32', activityId: 'a_gr_reading', userId: 'u_g_korea_bio', status: 'approved', createdAt: isoHoursAgo(5) },
  { id: 'p33', activityId: 'a_gr_conf', userId: 'u_g_yonsei_nlp', status: 'approved', createdAt: isoHoursAgo(12) },
  { id: 'p34', activityId: 'a_gr_conf', userId: 'u_b_kaist1', status: 'approved', createdAt: isoHoursAgo(11) },
  { id: 'p35', activityId: 'a_gr_career', userId: 'u_g_snu_econ', status: 'approved', createdAt: isoHoursAgo(20) },
  { id: 'p36', activityId: 'a_gr_career', userId: 'u_g_yonsei_nlp', status: 'approved', createdAt: isoHoursAgo(18) },
  { id: 'p37', activityId: 'a_gr_career', userId: 'u_a_seoul_ai', status: 'approved', createdAt: isoHoursAgo(16) },
  { id: 'p38', activityId: 'a_al_seongsu', userId: 'u_a_seoul_ai', status: 'approved', createdAt: isoHoursAgo(3) },
  { id: 'p39', activityId: 'a_al_seongsu', userId: 'u_a_yonsei_seoul', status: 'approved', createdAt: isoHoursAgo(2) },
  { id: 'p40', activityId: 'a_al_visit', userId: 'u_woojin', status: 'approved', createdAt: isoHoursAgo(6) },
  { id: 'p41', activityId: 'a_al_visit', userId: 'u_taeho', status: 'approved', createdAt: isoHoursAgo(5) },
);

/** 대학원생 글 (research_q · reading · conference · collab · path) + 졸업생 글 (update · city_meet · ama · visit · hiring) */
posts.push(
  { id: 'pg1', authorId: 'u_g_yonsei_nlp', authorType: 'user', postType: 'question', media: [],
    text: '한국어 LLM 평가할 때 요즘 뭐 쓰세요? 객관식 벤치마크는 점수가 다 비슷하게 나와서, 실제 태스크 기반 평가셋을 만들까 고민 중이에요. 직접 만들어본 분 경험 듣고 싶어요.', topics: ['research_q', 'ai'],
    tags: ['LLM', '평가', 'NLP'], visibility: 'public', likeIds: ['u_b_snu1', 'u_dohyun'], savedIds: [],
    comments: [{ id: 'pc20', authorId: 'u_b_snu1', text: '저희는 에이전트 로그에서 실패 사례 뽑아서 평가셋 만들었어요. 라벨링 가이드 공유드릴게요', createdAt: isoHoursAgo(3) }], createdAt: isoHoursAgo(5) },
  { id: 'pg2', authorId: 'u_g_yonsei_nlp', authorType: 'user', postType: 'together', media: [{ emoji: '📚', hue: 200, url: photo('c_library') }],
    text: '이번 주 NLP 리딩 그룹은 LLM 평가 논문 2편. 공학관 세미나실이고, 대학원생 아니어도 한 편 읽어올 수 있으면 환영해요.', topics: ['reading', 'ai'],
    tags: ['리딩그룹', '논문'], visibility: 'school', likeIds: ['u_dohyun', 'u_sua'], savedIds: [], comments: [], relatedActivityId: 'a_gr_reading', createdAt: isoHoursAgo(9) },
  { id: 'pg3', authorId: 'u_b_snu1', authorType: 'user', postType: 'together', media: [],
    text: 'EMNLP 가시는 분 있나요? 포스터 리허설 겸 한 번 모여서 숙소·동선 같이 봐요. 첫 학회라 막막한 분도 환영.', topics: ['conference', 'ai'],
    tags: ['EMNLP', '학회'], visibility: 'public', likeIds: ['u_g_yonsei_nlp', 'u_b_kaist1'], savedIds: [],
    comments: [{ id: 'pc21', authorId: 'u_g_yonsei_nlp', text: '저 가요! 포스터 초안 들고 갈게요', createdAt: isoHoursAgo(12) }], relatedActivityId: 'a_gr_conf', createdAt: isoHoursAgo(14) },
  { id: 'pg4', authorId: 'u_g_korea_bio', authorType: 'user', postType: 'together', media: [],
    text: '단일세포 데이터 전처리 파이프라인을 같이 정리할 연구실 찾아요. 데이터는 충분한데 모델링 쪽 손이 부족해요. 다른 학교도 좋고, 한 달에 한 번 온라인으로 맞춰봐요.', topics: ['collab', 'research'],
    tags: ['공동연구', '바이오인포매틱스'], visibility: 'public', likeIds: ['u_b_kaist1'], savedIds: [], comments: [], createdAt: isoHoursAgo(20) },
  { id: 'pg5', authorId: 'u_g_snu_econ', authorType: 'user', postType: 'question', media: [],
    text: '석사 졸업 앞두고 박사 진학이냐 취업이냐 고민 중이에요. 경제학은 박사면 유학이 거의 기본이라 더 고민되네요. 먼저 고민해본 분들 이야기 듣고 싶어요.', topics: ['path', 'finance'],
    tags: ['진로', '박사'], visibility: 'public', likeIds: ['u_g_yonsei_nlp', 'u_b_snu1', 'u_woojin'], savedIds: [],
    comments: [
      { id: 'pc22', authorId: 'u_b_snu2', text: '저는 석사 마치고 바로 일했어요. 기준 하나만 꼽으면 "평소 하루가 어떤 모습이었으면 하나"였어요. 커피챗 가능해요', createdAt: isoHoursAgo(22) },
      { id: 'pc23', authorId: 'u_b_kaist1', text: '강남 커피챗에 오세요. 같이 이야기해요!', createdAt: isoHoursAgo(21) },
    ], relatedActivityId: 'a_gr_career', createdAt: isoHoursAgo(28) },
  { id: 'pa1', authorId: 'u_a_tokyo_pm', authorType: 'user', postType: 'story', media: [{ emoji: '🗼', hue: 350, url: photo('c_city') }],
    text: '도쿄 온 지 1년. 회의 일본어는 아직 반만 들리지만 동네 단골 카페가 생겼어요. 곧 서울 들어가요. 일본 이직 궁금한 분 그때 봬요.', topics: ['update', 'travel'],
    tags: ['도쿄', '근황'], visibility: 'public', likeIds: ['u_a_ny_fin', 'u_b_snu2'], savedIds: [], comments: [], createdAt: isoHoursAgo(6) },
  { id: 'pa2', authorId: 'u_b_snu2', authorType: 'user', postType: 'together', media: [{ emoji: '☕', hue: 30, url: photo('c_espresso') }],
    text: '모레 퇴근 후 성수에서 커피 한 잔 하실 분. 학교·분야 상관없이 4명까지, 한 시간만. 모임 열어뒀어요.', topics: ['city_meet', 'coffee'],
    tags: ['성수', '퇴근후'], visibility: 'public', likeIds: ['u_a_seoul_ai'], savedIds: [], comments: [], relatedActivityId: 'a_al_seongsu', createdAt: isoHoursAgo(4) },
  { id: 'pa3', authorId: 'u_a_seoul_ai', authorType: 'user', postType: 'question', media: [],
    text: '대학원 갈지 바로 일할지 묻는 후배가 요즘 많아서, 이번 주는 질문 받아요. ML 면접 준비, 회사에서 연구하는 방식, 모델 서빙 같은 거 편하게 댓글로 남겨주세요.', topics: ['ama', 'ai'],
    tags: ['질문받아요', 'ML'], visibility: 'public', likeIds: ['u_dohyun', 'u_g_yonsei_nlp', 'u_b_snu1'], savedIds: [],
    comments: [
      { id: 'pc24', authorId: 'u_g_yonsei_nlp', text: '석사 때 1저자 논문이 없어도 리서치 직군 지원할 수 있을까요?', createdAt: isoHoursAgo(9) },
      { id: 'pc25', authorId: 'u_a_seoul_ai', text: '가능해요. 대신 다른 사람이 재현할 수 있는 프로젝트 하나를 깊게 보여주는 게 더 중요했어요', createdAt: isoHoursAgo(8) },
    ], createdAt: isoHoursAgo(11) },
  { id: 'pa4', authorId: 'u_a_ny_fin', authorType: 'user', postType: 'together', media: [],
    text: '내일부터 일주일 서울에 있어요. 뉴욕 금융권이나 미국 대학원 준비하는 연세 후배들, 광화문에서 커피해요. 모임 열어뒀어요.', topics: ['visit', 'finance'],
    tags: ['서울방문', '커피챗'], visibility: 'school', likeIds: ['u_woojin', 'u_taeho'], savedIds: [], comments: [], relatedActivityId: 'a_al_visit', createdAt: isoHoursAgo(8) },
  { id: 'pa5', authorId: 'u_a_yonsei_seoul', authorType: 'user', postType: 'info', media: [],
    text: '저희 팀에서 백엔드 한 분 찾아요. 연세 동문 추천 환영이고, 궁금하면 편하게 메시지 주세요.', topics: ['hiring', 'startup'],
    tags: ['채용', '동문추천'], visibility: 'school', likeIds: ['u_taeho'], savedIds: [], comments: [], createdAt: isoHoursAgo(30) },
  { id: 'pa6', authorId: 'u_taeho', authorType: 'user', postType: 'story', media: [],
    text: '창업하고 처음으로 일주일 쉬었어요. 쉬어보니 다음에 뭘 만들고 싶은지 오히려 잘 보이네요. 다음 주부터 정문 카페 커피챗 다시 엽니다.', topics: ['update', 'startup'],
    tags: ['근황'], visibility: 'school', likeIds: ['u_jimin', DEMO_USER_ID], savedIds: [], comments: [], createdAt: isoHoursAgo(36) },
);
