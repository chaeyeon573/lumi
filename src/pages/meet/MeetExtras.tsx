import { useNavigate } from 'react-router-dom';
import { Vote, BookOpen, Users, ChevronRight } from 'lucide-react';
import { t } from '@core/i18n';
import { cn } from '@core/lib/cn';
import type { StageKind } from '@core/lib/stage';
import type { Activity } from '@core/types';
import { isStudentOnlyActivity } from '@core/lib/meet';

/** 졸업생에게는 수업·Study Crew·팀원 모집·스터디를 보여주지 않는다 (대학원생은 연구·스터디를 그대로) */
export const hideForAlumni = (a: Activity) => isStudentOnlyActivity(a);

/** 모임 탭 하단·모임 만들기 폼 아래의 조용한 확장 행 — 같이 계획하기 / Study Crew / 팀원 모집 (기존 기능 유지). 졸업생에게는 없다 */
export function MeetExtraRows({ className, kind }: { className?: string; kind?: StageKind }) {
  const nav = useNavigate();
  if (kind === 'alumni') return null;
  const rows: { key: string; icon: React.ReactNode; title: string; sub: string; to: string }[] = [
    { key: 'together', icon: <Vote size={18} />, title: t('같이 계획하기'), sub: t('시간 투표로 정하기'), to: '/together/new' },
    { key: 'crew', icon: <BookOpen size={18} />, title: t('수업 스터디'), sub: t('시간표에서 수업을 골라요'), to: '/timetable' },
    { key: 'team', icon: <Users size={18} />, title: t('팀원 모집하기'), sub: t('역할별로 팀원을 모아요'), to: '/create/activity?kind=group&team=1' },
  ];
  return (
    <div className={cn('card divide-y divide-line', className)}>
      {rows.map((m) => (
        <button key={m.key} onClick={() => nav(m.to)} className="w-full px-3.5 py-3 flex items-center gap-3 text-left press">
          <span className="h-9 w-9 rounded-full bg-primary-soft text-primary grid place-items-center shrink-0">{m.icon}</span>
          <span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold text-ink truncate">{m.title}</span><span className="block text-[12px] text-ink-3 truncate">{m.sub}</span></span>
          <ChevronRight size={16} className="text-ink-3 shrink-0" />
        </button>
      ))}
    </div>
  );
}
