import { useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, CalendarPlus } from 'lucide-react';
import { lang } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { audienceFits, campusDate } from '@core/lib/listings';
import { canGoTogether, campusToday, goingPeople } from '@core/lib/withpeople';
import { enrollments } from '@core/lib/classmates';
import { formatDate, formatTime } from '@core/lib/format';
import { OPP_TYPE_LABELS } from '@core/lib/labels';
import { cn } from '@core/lib/cn';
import { PeopleLine } from '@/components/together/PeopleLine';
import { CopyClassLink } from '@/components/classes/ClassLink';

const en = lang === 'en';
/** 처음에 보일 행사 수 — 나머지는 Discover 에 */
const WEEK_CAP = 5;

/**
 * 사람 탭에 보여줄 사람이 없을 때 (가입 첫날 — "맨처음에는 사람이 아무도 없는데", 사장님 2026-11-02).
 * 빈 화면 + 초대 버튼 대신, 이번 주에 다른 사람과 같이 갈 수 있는 실제 캠퍼스 일(행사·무료 음식 → Go together),
 * 내 수업 방, 그리고 사람이 어떻게 나타나는지 한 줄. 사람을 지어내지 않는다 (예시 프로필도 실제 계정엔 안 온다).
 * "Be the first" 같은 빈자리 문구는 쓰지 않는다 (PRODUCT_TASTE).
 */
export function ColdStart({ head, className }: { head?: ReactNode; className?: string }) {
  const nav = useNavigate();
  const v = useViewer();
  const me = v.me;
  const opps = useAppStore((s) => s.opportunities);
  const week = useMemo(() => {
    const school = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';
    const today = campusToday();
    const weekEnd = new Date(Date.parse(`${today}T12:00:00Z`) + 6 * 86400000).toISOString().slice(0, 10);
    const when = (o: (typeof opps)[number]) => `${campusDate(o.date!)}${o.startTime}`;
    // 누가 가는 것 먼저, 그다음 같이 가기 좋은 것(무료 음식·소셜), 그다음 빠른 순 — 강연만 줄줄이 나오지 않게
    const has = (o: (typeof opps)[number], tag: string) => o.tags.some((tg) => tg.toLowerCase() === tag);
    const score = (o: (typeof opps)[number]) => goingPeople(v.snap, me, o.id).length * 10 + (has(o, 'free food') || has(o, 'social') ? 3 : 0) + (has(o, 'free stuff') ? 1 : 0);
    return opps
      .filter((o) => (!o.schoolId || o.schoolId === school) && canGoTogether(o) && campusDate(o.date!) <= weekEnd && audienceFits(me, o))
      .sort((a, b) => score(b) - score(a) || when(a).localeCompare(when(b)));
  }, [opps, v.snap, me]);
  const classes = useMemo(() => enrollments(me), [me]);
  const firstClass = classes[0];

  return (
    <div className={cn('px-4 pb-8', className)}>
      {head}
      {week.length > 0 && (
        <section>
          <div className="flex items-end justify-between mb-1">
            <h2 className="font-display text-[22px] font-bold text-primary">{en ? 'This week on campus' : '이번 주 캠퍼스'}</h2>
            {week.length > WEEK_CAP && <button onClick={() => nav('/discover?tab=activities')} className="text-[13px] font-semibold text-primary">{en ? 'See all' : '모두 보기'}</button>}
          </div>
          <p className="text-[13px] text-ink-3 mb-3">{en ? 'Tap Go together — others going can join you.' : 'Go together 를 누르면 같이 갈 사람이 붙을 수 있어요.'}</p>
          <div className="space-y-2.5">
            {week.slice(0, WEEK_CAP).map((o) => {
              const free = o.tags.some((tg) => tg.toLowerCase() === 'free food');
              return (
                <div key={o.id} className="card rounded-[22px] px-3 py-2.5">
                  <button onClick={() => nav(`/opportunities/${o.id}`)} className="w-full flex items-center gap-3 text-left">
                    <span className="h-11 w-11 rounded-full bg-primary-soft text-primary grid place-items-center text-[20px] shrink-0">{o.cover?.emoji || (free ? '🍕' : '🎪')}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[11px] font-bold uppercase tracking-wide text-primary v2:text-lime-400">{free ? (en ? 'Free food' : '무료 음식') : OPP_TYPE_LABELS[o.type]}</span>
                      <span className="block text-[15px] font-semibold text-ink truncate">{o.title}</span>
                      <span className="block text-[12.5px] text-ink-2 truncate">{[`${formatDate(campusDate(o.date!))} ${formatTime(o.startTime!)}`, o.place?.name ?? ''].filter(Boolean).join(' · ')}</span>
                    </span>
                  </button>
                  <PeopleLine o={o} quiet={false} className="pl-[56px]" />
                </div>
              );
            })}
          </div>
        </section>
      )}

      {classes.length > 0 && (
        <section className="mt-6">
          <h2 className="font-display text-[20px] font-bold text-primary mb-2.5">{en ? 'Your classes' : '내 수업'}</h2>
          <div className="card divide-y divide-line">
            {classes.slice(0, 4).map((c) => (
              <button key={c.key} onClick={() => nav(`/classes/${encodeURIComponent(c.name)}`)} className="w-full flex items-center gap-3 px-4 py-3 text-left press">
                <span className="flex-1 min-w-0"><b className="block text-[15px] text-ink">{c.code}</b><span className="block text-[12.5px] text-ink-3 truncate">{c.name.startsWith(c.code) ? c.name.slice(c.code.length).trim() || c.name : c.name}</span></span>
                <span className="text-[12.5px] font-semibold text-primary shrink-0">{en ? 'Study together' : '같이 공부'}</span>
                <ChevronRight size={16} className="text-ink-3 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 사람이 어떻게 나타나는지 — 짧게, 조르지 않게 */}
      <section className="mt-6 rounded-2xl bg-surface-2 px-4 py-3.5">
        <p className="text-[13px] text-ink-2 leading-relaxed">
          {firstClass
            ? (en ? `Classmates show up here as they join Lumi. Dropping your ${firstClass.code} link in the class Discord helps.` : `같은 수업 사람들이 Lumi에 들어오면 여기에 보여요. ${firstClass.code} 링크를 수업 단톡방에 올려 두면 빨라요.`)
            : (en ? 'Classmates show up here as they join Lumi. Add your classes so they can find you.' : '같은 수업 사람들이 Lumi에 들어오면 여기에 보여요. 수업을 추가해 두면 서로 찾을 수 있어요.')}
        </p>
        <div className="mt-2.5">
          {firstClass
            ? <CopyClassLink schoolId={firstClass.schoolId} code={firstClass.code} compact />
            : <button onClick={() => nav('/timetable')} className="h-9 px-3.5 rounded-full bg-surface border border-line text-ink text-[13px] font-semibold inline-flex items-center gap-1.5 press"><CalendarPlus size={14} />{en ? 'Add classes' : '수업 추가'}</button>}
        </div>
      </section>
    </div>
  );
}
