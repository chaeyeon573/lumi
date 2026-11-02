import { t, lang } from '@core/i18n';
import type {
  ActivityCategory, Availability, Interest, JoinPolicy, Purpose, UniversityRole, Visibility, OrganizationType, ActivityKind, Gender, Goal, Role, Residence, OpportunityType, MeetPreference,
} from '@core/types';

export const INTEREST_LABELS: Record<Interest, string> = {
  coffee: t('커피'), meal: t('식사'), study: t('공부'), exercise: t('운동'), walk: t('산책'), cycling: t('사이클'),
  shopping: t('쇼핑'), exhibition: t('전시·공연'), club: t('동아리'), research: t('연구·논문'), startup: t('창업'),
  networking: t('네트워킹'), etc: t('기타'),
};
export const INTEREST_EMOJI: Record<Interest, string> = {
  coffee: '☕', meal: '🍜', study: '📚', exercise: '🏃', walk: '🚶', cycling: '🚴', shopping: '🛍️',
  exhibition: '🎨', club: '🎸', research: '🔬', startup: '🚀', networking: '🤝', etc: '✨',
};

export const PURPOSE_LABELS: Record<Purpose, string> = {
  friend: t('친구'), dating: t('연애'), study: t('스터디'), hobby: t('취미'), club: t('동아리'), networking: t('네트워킹'), any: t('상관없음'),
};

export const AVAILABILITY_LABELS: Record<Availability, string> = {
  now: t('지금 가능'), afternoon: t('오늘 오후 가능'), after18: t('오후 6시 이후 가능'), weekend: t('주말 가능'),
  in_class: t('현재 수업 중'), hidden: t('공개하지 않음'),
};

export const VISIBILITY_LABELS: Record<Visibility, string> = {
  public: t('전체 공개'), school: t('같은 학교'), department: t('특정 학과·조직'), friends: t('친구'), followers: t('팔로워'), selected: t('선택한 사람만'), private: t('비공개'),
};

export const VISIBILITY_ORDER: Visibility[] = ['public', 'school', 'department', 'friends', 'followers', 'selected', 'private'];

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  coffee: t('커피'), meal: t('식사'), study: t('공부'), exercise: t('운동'), club: t('동아리'), performance: t('공연'),
  school_event: t('학교 행사'), seminar: t('연구·세미나'), networking: t('네트워킹'), store_deal: t('매장 혜택'), etc: t('기타'),
};
export const CATEGORY_EMOJI: Record<ActivityCategory, string> = {
  coffee: '☕', meal: '🍽️', study: '📖', exercise: '🏃', club: '🎸', performance: '🎤', school_event: '🎓',
  seminar: '🧪', networking: '🤝', store_deal: '🏷️', etc: '✨',
};
/** 지도 마커·칩 색상 (hex) */
export const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  coffee: '#C98A3B', meal: '#F0752B', study: '#3D5AFE', exercise: '#22A06B', club: '#8B5CF6', performance: '#D946A6',
  school_event: '#E5484D', seminar: '#0EA5A5', networking: '#4F46E5', store_deal: '#EAB308', etc: '#6B7280',
};

export const JOIN_POLICY_LABELS: Record<JoinPolicy, string> = {
  open: t('누구나 바로 참가'), approval: t('주최자 승인 후 참가'), invite: t('초대받은 사람만 참가'),
};

export const ROLE_LABELS: Record<UniversityRole, string> = { undergraduate: t('학부생'), graduate: t('대학원생'), alumni: t('졸업생') };
export const ORG_TYPE_LABELS: Record<OrganizationType, string> = { club: t('동아리'), department: t('학과'), lab: t('연구실·RA'), council: t('학생회'), greek: t('소셜 조직 (Greek)'), coop: lang === 'en' ? 'Co-op housing' : '협동조합 하우스' };
export const KIND_LABELS: Record<ActivityKind, string> = { personal: t('개인 활동'), group: t('그룹 모임'), org_event: t('동아리·학교 행사') };
export const GENDER_LABELS: Record<Gender, string> = { female: t('여성'), male: t('남성'), other: t('기타'), private: t('비공개') };

/** 홈 활동 필터 → 카테고리 매핑 */
export const HOME_ACTIVITY_FILTERS: { key: string; label: string; categories: ActivityCategory[] | null }[] = [
  { key: 'all', label: t('전체'), categories: null },
  { key: 'coffee_meal', label: t('커피·식사'), categories: ['coffee', 'meal'] },
  { key: 'study', label: t('공부'), categories: ['study', 'seminar'] },
  { key: 'exercise', label: t('운동'), categories: ['exercise'] },
  { key: 'club', label: t('동아리'), categories: ['club', 'performance'] },
  { key: 'event', label: t('행사'), categories: ['school_event', 'performance'] },
  { key: 'networking', label: t('네트워킹'), categories: ['networking'] },
  { key: 'etc', label: t('기타'), categories: ['store_deal', 'etc'] },
];

export const ALL_CATEGORIES = Object.keys(CATEGORY_LABELS) as ActivityCategory[];
export const ALL_INTERESTS = Object.keys(INTEREST_LABELS) as Interest[];
export const ALL_PURPOSES = Object.keys(PURPOSE_LABELS) as Purpose[];
export const ALL_AVAILABILITY = Object.keys(AVAILABILITY_LABELS) as Availability[];

export const GOAL_LABELS: Record<Goal, string> = {
  friends: t('친구 만들기'), lunch: t('같이 점심 먹을 사람'), join_club: t('동아리 가입'), start_club: t('동아리 만들기'), startup: t('창업하기'), cofounder: t('공동창업자 찾기'),
  lab: t('연구실 지원'), internship: t('인턴 지원'), scholarship: t('장학금 신청'), hackathon: t('해커톤·공모전'), hobby: t('운동·취미 시작'), dating: t('데이팅'),
};
export const GOAL_EMOJI: Record<Goal, string> = {
  friends: '🙌', lunch: '🍱', join_club: '🎸', start_club: '🚩', startup: '🚀', cofounder: '🤝', lab: '🔬', internship: '💼', scholarship: '🎓', hackathon: '💡', hobby: '🏃', dating: '💘',
};
export const PERSON_ROLE_LABELS: Record<Role, string> = {
  friend: t('친구'), teammate: t('팀원'), cofounder: t('공동창업자'), developer: t('개발'), designer: t('디자인'), data: t('데이터 분석'), marketing: t('마케팅'), planning: t('기획'),
  presentation: t('발표'), video: t('영상 제작'), research: t('연구 경험'), club_ops: t('동아리 운영'), study_partner: t('스터디 파트너'), application_partner: t('지원 준비 파트너'), senior: t('경험 있는 선배'), mentor: t('멘토'), date: t('데이트 상대'),
};
/** 찾는 사람 선택지 / 제공할 수 있는 것 선택지 */
export const LOOKING_FOR_ROLES: Role[] = ['friend', 'teammate', 'cofounder', 'developer', 'designer', 'study_partner', 'application_partner', 'senior', 'mentor', 'date'];
export const OFFER_ROLES: Role[] = ['developer', 'designer', 'data', 'marketing', 'planning', 'presentation', 'video', 'research', 'club_ops'];
export const RESIDENCE_LABELS: Record<Residence, string> = { dorm: t('기숙사'), offcampus: t('학교 근처 자취'), commute: t('통학') };
export const OPP_TYPE_LABELS: Record<OpportunityType, string> = {
  event: t('학교 행사'), club: t('동아리'), lab: t('연구실·RA'), internship: t('인턴'), scholarship: t('장학금'), hackathon: t('해커톤·공모전'), startup: t('창업'), activity: t('활동'), exchange: t('교환학생'),
};
export const OPP_TYPE_EMOJI: Record<OpportunityType, string> = { event: '🎪', club: '🎸', lab: '🔬', internship: '💼', scholarship: '🎓', hackathon: '💡', startup: '🚀', activity: '☕', exchange: '✈️' };
export const OPP_TYPE_COLORS: Record<OpportunityType, string> = { event: '#E5484D', club: '#8B5CF6', lab: '#0EA5A5', internship: '#4F46E5', scholarship: '#F5A524', hackathon: '#3D5AFE', startup: '#F0752B', activity: '#C98A3B', exchange: '#5A8FD6' };
export const ALL_GOALS = Object.keys(GOAL_LABELS) as Goal[];
export const ALL_OPP_TYPES = Object.keys(OPP_TYPE_LABELS) as OpportunityType[];
export const MEET_PREF_LABELS: Record<MeetPreference, string> = {
  same_hobby: t('취미·관심사가 같은 사람'), same_class: t('같은 수업을 듣는 사람'), same_goal: t('같은 목표를 준비하는 사람'), same_living: t('생활권이 가까운 사람'), new_people: t('나와 다른 분야의 새로운 사람'),
};
export const MEET_PREF_EMOJI: Record<MeetPreference, string> = { same_hobby: '🎨', same_class: '📚', same_goal: '🎯', same_living: '🏠', new_people: '🌍' };
export const ALL_MEET_PREFS = Object.keys(MEET_PREF_LABELS) as MeetPreference[];

import type { OpportunityIntent, PostType, CrewType } from '@core/types';
export const POST_TYPE_LABELS: Record<PostType, string> = { story: t('그냥 이야기'), question: t('질문'), info: t('정보'), review: t('후기'), together: t('같이할 사람'), news: t('소식') };
export const POST_TYPE_EMOJI: Record<PostType, string> = { story: '💬', question: '❓', info: '💡', review: '⭐', together: '🙋', news: '📣' };
export const ALL_POST_TYPES = Object.keys(POST_TYPE_LABELS) as PostType[];
/** 피드 주제 태그 */
export const TOPIC_TAGS: { key: string; label: string }[] = [
  { key: 'daily', label: t('일상') }, { key: 'class', label: t('수업') }, { key: 'career', label: t('진로') }, { key: 'friends', label: t('친구') }, { key: 'dating', label: t('연애') },
  { key: 'startup', label: t('창업') }, { key: 'exercise', label: t('운동') }, { key: 'hobby', label: t('취미') }, { key: 'campus', label: t('학교생활') },
];
export const topicLabel = (key: string) => TOPIC_TAGS.find((x) => x.key === key)?.label ?? key;
export const CREW_TYPE_LABELS: Record<CrewType, string> = { exam: t('시험 대비'), assignment: t('과제'), review: t('복습'), project: t('팀플') };
export const CREW_TYPE_EMOJI: Record<CrewType, string> = { exam: '📝', assignment: '📎', review: '🔁', project: '🧩' };
export const ALL_CREW_TYPES = Object.keys(CREW_TYPE_LABELS) as CrewType[];
export const MODE_LABELS = { offline: t('대면'), online: t('온라인') } as const;
export const RSVP_LABELS: Record<OpportunityIntent, string> = {
  interested: t('관심 있어요'), going: t('갈 예정이에요'), solo: t('혼자 가요'), company: t('같이 갈 사람 찾아요'), team: t('팀을 찾고 있어요'), applied: t('이미 신청했어요'), done: t('참여 경험이 있어요'),
};
export const RSVP_EMOJI: Record<OpportunityIntent, string> = { interested: '👀', going: '✅', solo: '🚶', company: '🙋', team: '🧩', applied: '📨', done: '🏅' };
export const DAILY_QUESTIONS: { id: string; text: string; options: { key: string; label: string; category?: import('@core/types').ActivityCategory }[] }[] = [
  { id: 'd_free2h', text: t('오늘 갑자기 두 시간이 생긴다면?'), options: [{ key: 'lunch', label: t('점심'), category: 'meal' }, { key: 'nap', label: t('낮잠') }, { key: 'coffee', label: t('카페'), category: 'coffee' }, { key: 'exercise', label: t('운동'), category: 'exercise' }, { key: 'new_people', label: t('새로운 사람 만나기'), category: 'coffee' }] },
];
