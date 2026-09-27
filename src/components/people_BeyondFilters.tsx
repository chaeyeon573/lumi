import type { ReactNode } from 'react';
import { t } from '@core/i18n';
import type { Goal, Interest, School, Stage, User } from '@core/types';
import { Chip } from '@/components/ui';
import { ALL_INTERESTS, INTEREST_LABELS, GOAL_LABELS } from '@core/lib/labels';
import { stageOf, schoolIdOf } from '@core/lib/network';
import { cityOf } from '@/components/people_BeyondCard';
import { cn } from '@core/lib/cn';

/** Beyond · 고급 검색 조건 — 학교 여러 개, 단계, 관심사, 도시, 목표 */
export interface BeyondFilter { schools: string[]; stages: Stage[]; interests: Interest[]; cities: string[]; goals: Goal[] }
export const EMPTY_BEYOND: BeyondFilter = { schools: [], stages: [], interests: [], cities: [], goals: [] };
export const isEmptyBeyond = (f: BeyondFilter) => !f.schools.length && !f.stages.length && !f.interests.length && !f.cities.length && !f.goals.length;

/** 단계 칩 — Students / Master's / PhD / Alumni (alumni 는 professional 포함) */
export const STAGE_CHIPS: { key: Stage; label: string; match: Stage[] }[] = [
  { key: 'undergrad', label: t('학부 재학생'), match: ['undergrad'] },
  { key: 'masters', label: t('석사'), match: ['masters'] },
  { key: 'phd', label: t('박사'), match: ['phd'] },
  { key: 'alumni', label: t('졸업생·직장인'), match: ['alumni', 'professional'] },
];
export const matchesStages = (u: User, stages: Stage[]) => !stages.length || STAGE_CHIPS.filter((c) => stages.includes(c.key)).some((c) => c.match.includes(stageOf(u)));

export function passesBeyond(u: User, f: BeyondFilter): boolean {
  if (f.schools.length && !f.schools.includes(schoolIdOf(u))) return false;
  if (!matchesStages(u, f.stages)) return false;
  if (f.interests.length && !f.interests.some((i) => u.interests.includes(i))) return false;
  if (f.cities.length && !f.cities.includes(cityOf(u))) return false;
  if (f.goals.length && !f.goals.some((g) => u.goals.includes(g))) return false;
  return true;
}

export const shortSchool = (name: string) => name.replace(/대학교|University of California,?|University|UC /g, '').trim() || name;

/** 조건을 한 줄 라벨로 (저장한 검색 칩·프리셋 이름) */
export function beyondLabel(f: BeyondFilter, schools: School[]): string {
  const parts = [
    ...f.schools.map((id) => shortSchool(schools.find((s) => s.id === id)?.name ?? id)),
    ...f.stages.map((s) => STAGE_CHIPS.find((c) => c.key === s)?.label ?? s),
    ...f.interests.map((i) => INTEREST_LABELS[i]),
    ...f.cities,
    ...f.goals.map((g) => GOAL_LABELS[g]),
  ];
  return parts.join(' + ');
}

/** "SNU + AI + Founder" 식 프리셋 — 시드의 다른 학교 + 관심사 + 목표 */
export function beyondPresets(schools: School[], me: User): { label: string; f: BeyondFilter }[] {
  const others = schools.filter((s) => s.id !== schoolIdOf(me));
  const combos: [Interest, Goal][] = [['startup', 'cofounder'], ['research', 'lab'], ['networking', 'internship']];
  return others.slice(0, 3).map((s, i) => {
    const [interest, goal] = combos[i % combos.length];
    const f: BeyondFilter = { ...EMPTY_BEYOND, schools: [s.id], interests: [interest], goals: [goal] };
    return { label: `${shortSchool(s.name)} + ${INTEREST_LABELS[interest]} + ${GOAL_LABELS[goal]}`, f };
  });
}

const tog = <T,>(arr: T[], x: T) => (arr.includes(x) ? arr.filter((y) => y !== x) : [...arr, x]);

const Group = ({ label, children }: { label: string; children: ReactNode }) => (
  <div><div className="text-[12px] font-bold text-ink-3 mb-1.5">{label}</div><div className="flex flex-wrap gap-1.5">{children}</div></div>
);

/** 조건 그룹 (전체 화면·시트용) — 학교 / 단계 / 관심사 / 도시 / 목표 */
export function BeyondFilterGroups({ f, onChange, schools, cities, me, showGoals = true }: { f: BeyondFilter; onChange: (f: BeyondFilter) => void; schools: School[]; cities: string[]; me: User; showGoals?: boolean }) {
  const mine = schoolIdOf(me);
  return (
    <div className="space-y-4">
      <Group label={t('학교')}>{schools.map((s) => <Chip key={s.id} size="sm" active={f.schools.includes(s.id)} onClick={() => onChange({ ...f, schools: tog(f.schools, s.id) })}>{shortSchool(s.name)}{s.id === mine ? ` · ${t('내 학교')}` : ''}</Chip>)}</Group>
      <Group label={t('단계')}>{STAGE_CHIPS.map((c) => <Chip key={c.key} size="sm" active={f.stages.includes(c.key)} onClick={() => onChange({ ...f, stages: tog(f.stages, c.key) })}>{c.label}</Chip>)}</Group>
      <Group label={t('관심사')}>{ALL_INTERESTS.map((i) => <Chip key={i} size="sm" active={f.interests.includes(i)} onClick={() => onChange({ ...f, interests: tog(f.interests, i) })}>{INTEREST_LABELS[i]}</Chip>)}</Group>
      {cities.length > 0 && <Group label={t('도시')}>{cities.map((c) => <Chip key={c} size="sm" active={f.cities.includes(c)} onClick={() => onChange({ ...f, cities: tog(f.cities, c) })}>{c}</Chip>)}</Group>}
      {showGoals && <Group label={t('이번 학기 목표')}>{(Object.keys(GOAL_LABELS) as Goal[]).map((g) => <Chip key={g} size="sm" active={f.goals.includes(g)} onClick={() => onChange({ ...f, goals: tog(f.goals, g) })}>{GOAL_LABELS[g]}</Chip>)}</Group>}
    </div>
  );
}

/** 한 줄 가로 스크롤 조건 칩 (Beyond 탭 상단) — 학교 · 단계 · 관심사 · 도시 */
export function BeyondFilterRow({ f, onChange, schools, cities, me, className }: { f: BeyondFilter; onChange: (f: BeyondFilter) => void; schools: School[]; cities: string[]; me: User; className?: string }) {
  const mine = schoolIdOf(me);
  const sep = <span className="w-px h-5 bg-line shrink-0 self-center" />;
  return (
    <div className={cn('flex gap-1.5 overflow-x-auto hide-scrollbar px-4', className)}>
      {schools.filter((s) => s.id !== mine).map((s) => <Chip key={s.id} size="sm" active={f.schools.includes(s.id)} onClick={() => onChange({ ...f, schools: tog(f.schools, s.id) })}>{shortSchool(s.name)}</Chip>)}
      {sep}
      {STAGE_CHIPS.map((c) => <Chip key={c.key} size="sm" active={f.stages.includes(c.key)} onClick={() => onChange({ ...f, stages: tog(f.stages, c.key) })}>{c.label}</Chip>)}
      {sep}
      {(['startup', 'research', 'networking', 'study', 'exercise', 'exhibition'] as Interest[]).map((i) => <Chip key={i} size="sm" active={f.interests.includes(i)} onClick={() => onChange({ ...f, interests: tog(f.interests, i) })}>{INTEREST_LABELS[i]}</Chip>)}
      {cities.length > 0 && sep}
      {cities.slice(0, 6).map((c) => <Chip key={c} size="sm" active={f.cities.includes(c)} onClick={() => onChange({ ...f, cities: tog(f.cities, c) })}>{c}</Chip>)}
    </div>
  );
}
