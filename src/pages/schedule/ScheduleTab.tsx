import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus } from 'lucide-react';
import { lang } from '@core/i18n';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { WeekGrid } from '@/components/timetable/WeekGrid';
import { freeBlocks, fmtBlock, todayIdx, toHHMM } from '@core/lib/timetable';
import { todayISO } from '@core/lib/format';
import { addDaysTo, mondayOf } from '@core/lib/pollgrid';
import { courseTermOf, nowTermLabel } from '@core/lib/classmates';
import { Screen, TitleHeader, RowCard, Btn, EmptyState, ErrorScreen, LoadingCards, cardCls } from '@/components/ha';
import { cn } from '@core/lib/cn';

const en = lang === 'en';
const WEEKDAYS = [0, 1, 2, 3, 4];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
/** 앞뒤로 넘길 수 있는 주 — 지난주부터 4주 뒤까지 (약속이 잡히는 범위) */
const MIN_WEEK = -1, MAX_WEEK = 4;

/** "Nov 10 – 14" */
export function rangeLabel(monday: string): string {
  const f = (iso: string, withMonth: boolean) => new Date(`${iso}T12:00:00`).toLocaleDateString(en ? 'en-US' : 'ko-KR', withMonth ? { month: 'short', day: 'numeric' } : { day: 'numeric' });
  const fri = addDaysTo(monday, 4);
  return `${f(monday, true)} – ${f(fri, monday.slice(5, 7) !== fri.slice(5, 7))}`;
}

/**
 * Schedule 탭 (PDF S027 · 비었을 때 S028) — 큰 제목 + 수업 편집, "‹ Your week ›" 격자(이번 학기 수업 + 그 주에 확정된 약속),
 * 빈 오후 줄, 수업 추가 · My Plans. 주 화살표는 그 주의 약속을 보여 줄 때만 의미가 있다 — 수업은 매주 같다.
 */
export function ScheduleTab() {
  const nav = useNavigate();
  const v = useViewer();
  const [params, setParams] = useSearchParams();
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const participations = useAppStore((s) => s.participations);
  const offset = Math.max(MIN_WEEK, Math.min(MAX_WEEK, Number(params.get('week') ?? 0) || 0));
  const monday = addDaysTo(mondayOf(todayISO()), offset * 7);
  const dates = ALL_DAYS.map((d) => addDaysTo(monday, d));
  // 이번 학기 수업만 — 다음 학기 미리 넣어 둔 수업(좌석 알림에서)은 격자에 섞지 않는다
  const term = nowTermLabel();
  const courses = (v.me.timetable ?? []).filter((c) => courseTermOf(c) === term);
  const acts = useMemo(() => v.visibleActivities
    .filter((a) => a.date >= dates[0] && a.date <= dates[6] && (a.hostId === v.me.id || participations.some((p) => p.activityId === a.id && p.userId === v.me.id && p.status === 'approved')))
    .map((a) => ({ a, day: dates.indexOf(a.date) })), [v.visibleActivities, participations, v.me.id, dates[0]]); // eslint-disable-line react-hooks/exhaustive-deps
  const weekend = courses.some((c) => c.day >= 5) || acts.some((x) => x.day >= 5);
  const days = weekend ? ALL_DAYS : WEEKDAYS;
  const day = offset === 0 ? todayIdx() : -1;
  // 오늘 정오 이후 2시간 넘게 비는 때 (정오 전에 시작하는 빈 칸은 정오부터 센다) — 이번 주 평일에만
  const afternoon = offset === 0 && courses.length && day < 5 ? freeBlocks(courses, day).map((b) => ({ start: Math.max(b.start, 12 * 60), end: b.end })).find((b) => b.end - b.start >= 120) : undefined;
  const go = (n: number) => setParams(n ? { week: String(n) } : {}, { replace: true });
  const empty = !courses.length && !acts.length;
  return (
    <Screen>
      <TitleHeader title={en ? 'Schedule' : '일정'} actions={[{ key: 'edit', label: en ? 'Add or edit classes' : '수업 추가·편집', icon: <CalendarDays size={22} />, onClick: () => nav('/schedule/classes') }]} />
      {status === 'loading' && <LoadingCards className="px-4 pt-2" />}
      {status === 'error' && <ErrorScreen message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && (
        <div className="px-4">
          <div className="flex items-center gap-1 py-1.5">
            <button onClick={() => go(offset - 1)} disabled={offset <= MIN_WEEK} aria-label={en ? 'Previous week' : '지난주'} className="h-9 w-9 grid place-items-center rounded-full text-ink press disabled:opacity-30"><ChevronLeft size={20} /></button>
            <div className="flex-1 text-center">
              <div className="text-[14px] font-bold">{offset === 0 ? (en ? 'Your week' : '이번 주') : offset === 1 ? (en ? 'Next week' : '다음 주') : rangeLabel(monday)}</div>
              {(offset === 0 || offset === 1) && <div className="text-[11.5px] text-ink-3">{rangeLabel(monday)}</div>}
            </div>
            <button onClick={() => go(offset + 1)} disabled={offset >= MAX_WEEK} aria-label={en ? 'Next week' : '다음 주'} className="h-9 w-9 grid place-items-center rounded-full text-ink press disabled:opacity-30"><ChevronRight size={20} /></button>
          </div>
          <div className={cn(cardCls, 'overflow-hidden px-1 pb-1')}>
            <WeekGrid courses={courses} acts={acts} days={days} today={day} dates={days.map((d) => dates[d])} dim={empty}
              onCourse={(c) => nav(`/classes/${encodeURIComponent(c.name)}`)} onActivity={(a) => nav(`/activities/${a.id}`)} />
          </div>
          {!courses.length ? (
            <EmptyState icon={<CalendarDays size={30} />} title={en ? 'Make the week yours' : '이번 주를 내 것으로'} sub={en ? 'Add a class to see your week at a glance.' : '수업을 넣으면 한 주가 한눈에 보여요.'}
              action={{ label: en ? 'Add Classes' : '수업 추가', onClick: () => nav('/schedule/classes') }} className="pt-8">
              {acts.length > 0 && <Btn variant="link" onClick={() => nav('/schedule/plans')}>{en ? 'My Plans' : '내 약속'}</Btn>}
            </EmptyState>
          ) : (
            <>
              <RowCard className="mt-4" tone="mint" icon={<Clock size={22} />}
                title={afternoon ? (en ? 'A free afternoon' : '빈 오후') : (en ? 'Between classes' : '수업 사이')}
                sub={afternoon ? `${en ? 'Free' : '비어 있어요'} ${fmtBlock(afternoon)} · ${en ? 'find a plan' : '약속 잡기'}` : (en ? 'Find a plan between classes' : '수업 사이에 약속 잡기')}
                onClick={() => nav(afternoon ? `/meetups/new?date=${todayISO()}&start=${toHHMM(Math.ceil(afternoon.start / 30) * 30)}` : '/social/meetups')} />
              <div className="flex items-center gap-3 mt-4">
                <Btn variant="outline" icon={<Plus size={18} />} className="flex-1" onClick={() => nav('/schedule/classes')}>{en ? 'Add Class' : '수업 추가'}</Btn>
                <Btn variant="link" className="flex-1" onClick={() => nav('/schedule/plans')}>{en ? 'My Plans' : '내 약속'}</Btn>
              </div>
            </>
          )}
        </div>
      )}
    </Screen>
  );
}
