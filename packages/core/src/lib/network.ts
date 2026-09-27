import type { User, Stage } from '@core/types';

/** 사용자의 생애 단계 — stage 가 없으면 affiliation.role 로 추정 */
export function stageOf(u: Pick<User, 'stage' | 'affiliation'>): Stage {
  if (u.stage) return u.stage;
  if (u.affiliation.type === 'company') return 'professional';
  return u.affiliation.role === 'alumni' ? 'alumni' : u.affiliation.role === 'graduate' ? 'masters' : 'undergrad';
}
export const isAlumniStage = (u: Pick<User, 'stage' | 'affiliation'>) => { const s = stageOf(u); return s === 'alumni' || s === 'professional'; };
/** 재학생·대학원생 — 시간표가 의미 있는 단계 */
export const isStudentStage = (u: Pick<User, 'stage' | 'affiliation'>) => !isAlumniStage(u);

export const schoolIdOf = (u: Pick<User, 'affiliation'>) => (u.affiliation.type === 'university' ? u.affiliation.schoolId : '');
export const sameSchool = (a: Pick<User, 'affiliation'>, b: Pick<User, 'affiliation'>) => !!schoolIdOf(a) && schoolIdOf(a) === schoolIdOf(b);

/** My Network — 내 학교 사람(재학생·대학원생·졸업생 모두). 무료 */
export const myNetwork = (users: User[], me: User) => users.filter((u) => u.id !== me.id && sameSchool(u, me));
/** Beyond — 내 학교 밖 사람 (다른 학교·회사·도시). 무료는 미리보기, 전체는 AroundU+ */
export const beyondNetwork = (users: User[], me: User) => users.filter((u) => u.id !== me.id && !sameSchool(u, me));

export const STAGE_LABELS_KO: Record<Stage, string> = { undergrad: '학부', masters: '석사', phd: '박사', alumni: '졸업생', professional: '직장인' };
export const STAGE_LABELS_EN: Record<Stage, string> = { undergrad: 'Undergrad', masters: "Master's", phd: 'PhD', alumni: 'Alumni', professional: 'Professional' };

/** "Yonsei Student" → "Yonsei Alumni" 같은 짧은 소속 표시 */
export function networkLabel(u: Pick<User, 'stage' | 'affiliation' | 'career'>, lang: 'ko' | 'en'): string {
  if (u.affiliation.type === 'company') return u.affiliation.companyName;
  const short = u.affiliation.schoolName.replace(/대학교|University of California,?|University|UC /g, '').trim();
  const st = stageOf(u);
  if (lang === 'en') return `${short} ${st === 'alumni' || st === 'professional' ? 'Alumni' : st === 'phd' ? 'PhD' : st === 'masters' ? "Master's" : 'Student'}`;
  return `${short} ${st === 'alumni' || st === 'professional' ? '졸업생' : st === 'phd' ? '박사' : st === 'masters' ? '석사' : '재학생'}`;
}
