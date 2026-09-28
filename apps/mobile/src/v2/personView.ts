/**
 * 사람을 보여줄 때 공개 범위를 적용하는 모바일 헬퍼 (웹 people_view.ts + people_Network.tsx 의 표시 부분).
 * 규칙 자체는 core(`@core/lib/privacy`, `@core/lib/graph`)에 있고, 여기서는 표시 문자열만 만든다.
 */
import { useMemo } from 'react';
import type { Snapshot } from '@core/api/types';
import type { User, UserStatus } from '@core/types';
import { t } from '@core/i18n';
import { type ProfileView, inAudience } from '@core/lib/privacy';
import { activeStatuses } from '@core/lib/status';
import { degreesFrom } from '@core/lib/graph';
import { mutualFriends } from '@core/lib/relations';
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

/** viewer 에게 보여도 되는 Open To — 항목별 audience 를 지킨다 */
export function visibleStatuses(s: Rel, viewer: User, owner: User): UserStatus[] {
  return activeStatuses(owner).filter((x) => inAudience(s, viewer, owner, x.audience ?? 'everyone'));
}

/** 문장 템플릿 — t('{name}님에게 물어봤어요') 처럼 영어 어순이 다른 문장에 */
export const fmt = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));

export interface Closeness { degree?: number; mutual: number }

/** 나로부터 모든 사람까지의 촌수 + 서로 아는 사람 수 */
export function useCloseness(snap: Snapshot, meId: string) {
  return useMemo(() => {
    const deg = degreesFrom(snap, meId, 3);
    return (id: string): Closeness => ({ degree: deg.get(id), mutual: mutualFriends(snap, meId, id).length });
  }, [snap, meId]);
}

/** "2촌 · 서로 아는 사람 2명" / "1촌" / "새로운 사람" */
export function closenessText(c: Closeness): string {
  const parts: string[] = [];
  if (c.degree === 1) parts.push(t('1촌'));
  else if (c.degree === 2) parts.push(t('2촌'));
  else if (c.degree === 3) parts.push(t('3촌'));
  if (c.mutual > 0) parts.push(fmt(t('서로 아는 사람 {n}명'), { n: c.mutual }));
  return parts.length ? parts.join(' · ') : t('새로운 사람');
}
