/**
 * 사람을 보여줄 때 공개 범위를 적용하는 웹 헬퍼 — PersonRow · PersonPage · Mutual Room · 저장 목록이 같이 쓴다.
 * 규칙 자체는 core(`@core/lib/privacy`)에 있고, 여기서는 표시 문자열만 가린다.
 */
import type { Snapshot } from '@core/api/types';
import type { User, UserStatus } from '@core/types';
import { type ProfileView, inAudience } from '@core/lib/privacy';
import { activeStatuses } from '@core/lib/status';
import { cityOf, gradYearOf, isAlumniStage, majorOf, networkLabel, shortSchool, yy } from '@core/lib/network';

type Rel = Pick<Snapshot, 'relationships' | 'participations' | 'proposals' | 'users'>;

/** 공개 범위를 적용한 한 줄 소속 — 회사·졸업연도는 허용된 경우에만 */
export function maskedPersonLine(u: User, view: ProfileView, lang: 'ko' | 'en'): string {
  if (u.affiliation.type === 'company') return view.company ? [u.affiliation.companyName, u.affiliation.jobTitle].filter(Boolean).join(' · ') : (u.affiliation.jobTitle ?? '');
  const short = shortSchool(u.affiliation.schoolName);
  if (isAlumniStage(u)) {
    const year = view.gradYear ? yy(gradYearOf(u)) : '';
    const job = [u.career?.role, view.company ? u.career?.company : undefined].filter(Boolean).join(' @ ') || majorOf(u);
    return `${short}${year ? ` ${year}` : ''}${job ? ` · ${job}` : ''}`.trim();
  }
  const major = u.affiliation.showDepartment ? majorOf(u) : '';
  return `${networkLabel(u, lang)}${major ? ` · ${major}` : ''}`;
}

/** 공개 범위를 적용한 도시 (없으면 '') */
export const maskedCity = (u: User, view: ProfileView) => (view.city ? cityOf(u) ?? '' : '');

/** viewer 에게 보여도 되는 Open To — 항목별 audience 를 지킨다 (레거시 상태는 audience 없음 = 전체) */
export function visibleStatuses(s: Rel, viewer: User, owner: User): UserStatus[] {
  return activeStatuses(owner).filter((x) => inAudience(s, viewer, owner, x.audience ?? 'everyone'));
}
