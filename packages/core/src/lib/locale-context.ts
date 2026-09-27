/**
 * 한국 / 미국 맥락 프리셋 — 화면 구조는 같고 문구·칩·예시만 언어(데이터셋)에 따라 바뀐다.
 * 인증 방법 설명, 도시 칩, 업종·직무 칩, 학교에서 일어나는 것, 검색 프리셋 예시.
 */
import type { VerificationMethod } from '@core/types';
import { lang } from '@core/i18n';

export interface VerificationOption { method: VerificationMethod; title: string; desc: string; for: 'student' | 'alumni'; demo: 'code' | 'instant' }

export interface LocaleContext {
  /** 시작 화면 */
  tagline: string;
  subtitle: string;
  /** 인증 방법 카드 (재학생 / 졸업생) */
  verifications: (domain: string) => VerificationOption[];
  /** 거주·활동 도시 칩 */
  cities: string[];
  /** 업종 · 직무 칩 */
  industries: string[];
  roles: string[];
  /** 전공 예시 (자동완성) */
  majors: string[];
  /** 학교에서 일어나는 것 예시 라벨 (빈 상태 설명용) */
  campusHappenings: string[];
  /** 지역 설명 */
  cityHint: string;
  /** 시간표 연동 예시 */
  scheduleImport: string[];
}

const KO: LocaleContext = {
  tagline: '같은 대학에서, 더 넓은 세상으로.',
  subtitle: '검증된 대학 관계망에서 시작하는 사람, 모임, 그리고 더 넓은 기회.',
  verifications: (domain) => [
    { method: 'school_email', title: '학교 이메일 인증', desc: `@${domain} 메일로 받은 코드를 입력해요`, for: 'student', demo: 'code' },
    { method: 'sso', title: '학교 포털 SSO 로그인', desc: '학교 포털 계정으로 바로 확인해요', for: 'student', demo: 'instant' },
    { method: 'student_id', title: '학생증 인증', desc: '모바일 학생증 또는 사진을 올려요', for: 'student', demo: 'instant' },
    { method: 'alumni_email', title: '졸업생 이메일 인증', desc: '평생 이메일(@' + domain + ')로 받은 코드', for: 'alumni', demo: 'code' },
    { method: 'diploma', title: '졸업증명 인증', desc: '졸업증명서·학위증 사진을 올려요', for: 'alumni', demo: 'instant' },
    { method: 'alumni_association', title: '학교·동문회 연동', desc: '총동문회 회원 정보로 확인해요', for: 'alumni', demo: 'instant' },
    { method: 'prior_student', title: '이전 재학생 인증 이력', desc: '재학 시절 AroundU 인증 기록을 이어요 (가장 쉬움)', for: 'alumni', demo: 'instant' },
    { method: 'vouch', title: '동문 보증', desc: '이미 인증된 같은 학교 사람 2명이 보증해요. 졸업증명서 없이도 가능', for: 'alumni', demo: 'instant' },
  ],
  cities: ['서울', '성남', '부산', '인천', '대전', '대구', '광주', '수원', '뉴욕', '도쿄', '샌프란시스코', '해외'],
  industries: ['IT', 'AI', '금융', '스타트업', '컨설팅', '제조', '공공', '미디어', '교육', '의료', '디자인', '연구'],
  roles: ['Product', '개발', '데이터', '디자인', '마케팅', '영업', '기획', '투자', '연구원', '컨설턴트', '창업자', '교사'],
  majors: ['경영학과', '컴퓨터과학과', '전자공학과', '경제학과', '심리학과', '건축학과', '디자인학과', '기계공학과', '화학과', '국어국문학과', '정치외교학과', '의학과'],
  campusHappenings: ['동아리 박람회', '축제', '학회 세미나', '공모전 설명회', '취업 박람회'],
  cityHint: '정확한 주소는 받지 않아요. 도시나 생활권만 골라요.',
  scheduleImport: ['학교 포털에서 불러오기', '에브리타임 시간표 이미지', '직접 입력'],
};

const EN: LocaleContext = {
  tagline: 'Start with your university. Expand your circle.',
  subtitle: 'People, meetups and opportunities, starting from a verified university network.',
  verifications: (domain) => [
    { method: 'school_email', title: 'School email', desc: `Enter the code sent to your @${domain} address`, for: 'student', demo: 'code' },
    { method: 'sso', title: 'Campus SSO', desc: 'Sign in with your campus account (CalNet, Shibboleth…)', for: 'student', demo: 'instant' },
    { method: 'student_id', title: 'Student ID', desc: 'Upload your student ID card', for: 'student', demo: 'instant' },
    { method: 'alumni_email', title: 'Alumni email', desc: `Code sent to your lifetime @${domain} address`, for: 'alumni', demo: 'code' },
    { method: 'diploma', title: 'Diploma', desc: 'Upload your diploma or transcript', for: 'alumni', demo: 'instant' },
    { method: 'alumni_association', title: 'Alumni association', desc: 'Verify through your alumni association account', for: 'alumni', demo: 'instant' },
    { method: 'prior_student', title: 'Verified as a student before', desc: 'Carry over your earlier AroundU verification (easiest)', for: 'alumni', demo: 'instant' },
    { method: 'vouch', title: 'Vouched by alumni', desc: 'Two verified people from your school vouch for you. No diploma needed', for: 'alumni', demo: 'instant' },
  ],
  cities: ['New York', 'San Francisco', 'Los Angeles', 'Boston', 'Berkeley', 'Seattle', 'Chicago', 'Austin', 'Seoul', 'Tokyo', 'London', 'International'],
  industries: ['Tech', 'AI', 'Finance', 'Startup', 'Consulting', 'Healthcare', 'Media', 'Education', 'Public sector', 'Design', 'Research', 'Law'],
  roles: ['Product', 'Engineer', 'Data', 'Designer', 'Marketing', 'Sales', 'Analyst', 'Investor', 'Researcher', 'Consultant', 'Founder', 'Teacher'],
  majors: ['Economics', 'Computer Science', 'EECS', 'Business', 'Psychology', 'Architecture', 'Design', 'Mechanical Engineering', 'Chemistry', 'English', 'Political Science', 'Biology'],
  campusHappenings: ['Club Fair', 'Rush week', 'Football game', 'Hackathon', 'Career fair'],
  cityHint: 'We never ask for an address. Pick a city or an area.',
  scheduleImport: ['Import from campus portal', 'Google Calendar', 'Add manually'],
};

export const LOCALE_CONTEXT: Record<'ko' | 'en', LocaleContext> = { ko: KO, en: EN };
export const localeContext = () => LOCALE_CONTEXT[lang];
