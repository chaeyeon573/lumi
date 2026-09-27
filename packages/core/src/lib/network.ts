import type { User, Stage, VerificationMethod } from '@core/types';
import { t } from '@core/i18n';

/** 사용자의 생애 단계 — stage 가 없으면 affiliation.role 로 추정 */
export function stageOf(u: Pick<User, 'stage' | 'affiliation'>): Stage {
  if (u.stage) return u.stage;
  if (u.affiliation.type === 'company') return 'professional';
  return u.affiliation.role === 'alumni' ? 'alumni' : u.affiliation.role === 'graduate' ? 'masters' : 'undergrad';
}
export const isAlumniStage = (u: Pick<User, 'stage' | 'affiliation'>) => { const s = stageOf(u); return s === 'alumni' || s === 'professional'; };
/** 재학생·대학원생 — 시간표가 의미 있는 단계 */
export const isStudentStage = (u: Pick<User, 'stage' | 'affiliation'>) => !isAlumniStage(u);
export const isGradStage = (u: Pick<User, 'stage' | 'affiliation'>) => { const s = stageOf(u); return s === 'masters' || s === 'phd'; };

export const schoolIdOf = (u: Pick<User, 'affiliation'>) => (u.affiliation.type === 'university' ? u.affiliation.schoolId : '');
export const sameSchool = (a: Pick<User, 'affiliation'>, b: Pick<User, 'affiliation'>) => !!schoolIdOf(a) && schoolIdOf(a) === schoolIdOf(b);
export const majorOf = (u: Pick<User, 'affiliation'>) => (u.affiliation.type === 'university' ? u.affiliation.department : '');

/** 거주 도시 — homeCity → career.city → region 순 */
export const cityOf = (u: Pick<User, 'homeCity' | 'career' | 'region'>) => u.homeCity ?? u.career?.city ?? u.region;
/** 거주·활동 도시 집합 (같은 지역 판단용) */
export const citiesOf = (u: Pick<User, 'homeCity' | 'career' | 'region' | 'activityCity'>) => [cityOf(u), u.activityCity].filter((c): c is string => !!c);
export const sameCity = (a: Pick<User, 'homeCity' | 'career' | 'region' | 'activityCity'>, b: Pick<User, 'homeCity' | 'career' | 'region' | 'activityCity'>) => {
  const A = citiesOf(a).map((c) => c.toLowerCase()); return citiesOf(b).some((c) => A.includes(c.toLowerCase()));
};
/** 같은 분야 — 업종 또는 직무가 같다 */
export const sameField = (a: Pick<User, 'career'>, b: Pick<User, 'career'>) => {
  const ai = a.career?.industry?.toLowerCase(); const ar = a.career?.role?.toLowerCase();
  const bi = b.career?.industry?.toLowerCase(); const br = b.career?.role?.toLowerCase();
  return (!!ai && ai === bi) || (!!ar && ar === br);
};
/** 졸업(예정)연도 */
export const gradYearOf = (u: Pick<User, 'gradYear' | 'affiliation' | 'stage'>) => u.gradYear ?? (u.affiliation.type === 'university' && isAlumniStage(u) ? u.affiliation.year : undefined);

/** 같은 학교 사람 (재학생·대학원생·졸업생 모두). v2: 사람 탭은 학교로 나누지 않지만 홈·피드 '내 학교'에 쓴다 */
export const myNetwork = (users: User[], me: User) => users.filter((u) => u.id !== me.id && sameSchool(u, me));
/** 다른 학교 사람 — v2 부터 무료로 본다 */
export const beyondNetwork = (users: User[], me: User) => users.filter((u) => u.id !== me.id && !sameSchool(u, me));

export const STAGE_LABELS_KO: Record<Stage, string> = { undergrad: '학부생', masters: '석사', phd: '박사', alumni: '졸업생', professional: '직장인' };
export const STAGE_LABELS_EN: Record<Stage, string> = { undergrad: 'Undergrad', masters: "Master's", phd: 'PhD', alumni: 'Alumni', professional: 'Professional' };
export const stageLabel = (s: Stage, lang: 'ko' | 'en') => (lang === 'en' ? STAGE_LABELS_EN : STAGE_LABELS_KO)[s];

export const VERIFICATION_LABELS_KO: Record<VerificationMethod, string> = {
  school_email: '학교 이메일 인증', sso: '학교 SSO 인증', student_id: '학생증 인증', alumni_email: '졸업생 이메일 인증', diploma: '졸업증명 인증', alumni_association: '동문회 연동 인증', prior_student: '재학생 인증 이력', vouch: '동문 보증 인증',
};
export const VERIFICATION_LABELS_EN: Record<VerificationMethod, string> = {
  school_email: 'School email verified', sso: 'Campus SSO verified', student_id: 'Student ID verified', alumni_email: 'Alumni email verified', diploma: 'Diploma verified', alumni_association: 'Alumni association verified', prior_student: 'Verified as a student before', vouch: 'Vouched by verified alumni',
};
export const verificationLabel = (m: VerificationMethod, lang: 'ko' | 'en') => (lang === 'en' ? VERIFICATION_LABELS_EN : VERIFICATION_LABELS_KO)[m];
export const isVerified = (u: Pick<User, 'affiliation' | 'verification'>) => !!u.verification || (u.affiliation.type === 'university' && u.affiliation.emailVerified);

/** 학교 짧은 이름 ("연세" / "Berkeley") */
export const shortSchool = (name: string) => name.replace(/대학교|University of California,?|University|UC /g, '').trim();

/** "Yonsei Student" → "Yonsei Alumni" 같은 짧은 소속 표시 */
export function networkLabel(u: Pick<User, 'stage' | 'affiliation' | 'career'>, lang: 'ko' | 'en'): string {
  if (u.affiliation.type === 'company') return u.affiliation.companyName;
  const short = shortSchool(u.affiliation.schoolName);
  const st = stageOf(u);
  if (lang === 'en') return `${short} ${st === 'alumni' || st === 'professional' ? 'Alumni' : st === 'phd' ? 'PhD' : st === 'masters' ? "Master's" : 'Student'}`;
  return `${short} ${st === 'alumni' || st === 'professional' ? '졸업생' : st === 'phd' ? '박사' : st === 'masters' ? '석사' : '재학생'}`;
}

/** 학교 + 인증 ("연세대학교 ✓") — 졸업생은 "연세대학교 동문 ✓" */
export function schoolBadge(u: Pick<User, 'stage' | 'affiliation' | 'verification'>, lang: 'ko' | 'en'): string {
  if (u.affiliation.type === 'company') return u.affiliation.companyName;
  const name = u.affiliation.schoolName;
  if (isAlumniStage(u)) return lang === 'en' ? `${name} Alumni` : `${name} 동문`;
  return name;
}

/** "'25" 식 졸업연도 축약 */
export const yy = (year?: number) => (year ? `'${String(year).slice(2)}` : '');

/** 학년 — 입학연도 기준 (KO "3학년" / EN "Junior") */
export function classYearLabel(u: Pick<User, 'affiliation' | 'gradYear' | 'stage'>, lang: 'ko' | 'en'): string {
  if (u.affiliation.type !== 'university' || isAlumniStage(u)) return '';
  const s = stageOf(u);
  if (s === 'masters') return lang === 'en' ? "Master's" : '석사 과정';
  if (s === 'phd') return lang === 'en' ? 'PhD' : '박사 과정';
  const yearsLeft = u.gradYear ? u.gradYear - new Date().getFullYear() : 4 - Math.min(3, Math.max(0, new Date().getFullYear() - u.affiliation.year));
  const y = Math.min(4, Math.max(1, 4 - Math.max(0, yearsLeft)));
  if (lang === 'en') return ['Freshman', 'Sophomore', 'Junior', 'Senior'][y - 1];
  return `${y}학년`;
}

/**
 * 헤더·프로필 컨텍스트 한 줄.
 * 학생: "학부생 · 경영학과 3학년" / 졸업생: "2018 졸업 · 서울 · AI / Product"
 */
export function contextLine(u: User, lang: 'ko' | 'en'): string {
  const parts: string[] = [];
  if (isAlumniStage(u)) {
    const gy = gradYearOf(u);
    if (gy) parts.push(lang === 'en' ? `Class of ${gy}` : `${gy} 졸업`);
    const city = cityOf(u); if (city) parts.push(city);
    const field = [u.career?.industry, u.career?.role].filter(Boolean).join(' / '); if (field) parts.push(field);
  } else {
    parts.push(stageLabel(stageOf(u), lang));
    const major = majorOf(u); const cy = classYearLabel(u, lang);
    if (major || cy) parts.push([major, cy].filter(Boolean).join(' '));
  }
  return parts.join(' · ');
}

/** 카드·목록의 두 번째 줄: "연세 '18 · Product Manager" / "연세 재학생 · 컴퓨터과학과" */
export function personLine(u: User, lang: 'ko' | 'en'): string {
  if (u.affiliation.type === 'company') return [u.affiliation.companyName, u.affiliation.jobTitle].filter(Boolean).join(' · ');
  const short = shortSchool(u.affiliation.schoolName);
  if (isAlumniStage(u)) {
    const gy = gradYearOf(u);
    const job = [u.career?.role, u.career?.company].filter(Boolean).join(' @ ') || majorOf(u);
    return `${short} ${yy(gy)}${job ? ` · ${job}` : ''}`.trim();
  }
  const major = u.affiliation.showDepartment ? majorOf(u) : '';
  return `${networkLabel(u, lang)}${major ? ` · ${major}` : ''}`;
}

/** 졸업 예정연도가 지났거나 올해면 "현재 상태가 바뀌었나요?" 를 강조한다 */
export const shouldSuggestStatusUpdate = (u: Pick<User, 'gradYear' | 'stage' | 'affiliation'>) => isStudentStage(u) && !!u.gradYear && u.gradYear <= new Date().getFullYear();

export const tVerified = () => t('인증됨');
