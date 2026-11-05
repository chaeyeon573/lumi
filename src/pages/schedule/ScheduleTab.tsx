import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock, Plus } from 'lucide-react';
import { lang } from '@core/i18n';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { WeekGrid } from '@/components/timetable/WeekGrid';
import { freeBlocks, fmtBlock, todayIdx, toHHMM } from '@core/lib/timetable';
import { todayISO } from '@core/lib/format';
import { Screen, TitleHeader, RowCard, Btn, EmptyState, ErrorScreen, LoadingCards, cardCls } from '@/components/ha';
import { cn } from '@core/lib/cn';

const en = lang === 'en';
const WEEKDAYS = [0, 1, 2, 3, 4];

/** "Nov 3 – 7" — 이번 주 월~금 */
function weekLabel(): string {
  const d = new Date(`${todayISO()}T12:00:00`);
  const mon = new Date(d); mon.setDate(d.getDate() - todayIdx());
  const fri = new Date(mon); fri.setDate(mon.getDate() + 4);
  const f = (x: Date, withMonth: boolean) => x.toLocaleDateString(en ? 'en-US' : 'ko-KR', withMonth ? { month: 'short', day: 'numeric' } : { day: 'numeric' });
  return `${f(mon, true)} – ${f(fri, mon.getMonth() !== fri.getMonth())}`;
}

/**
 * Schedule 탭 (PDF S027 · 비었을 때 S028) — 큰 제목 + 시간표 편집, 이번 주 격자, 빈 오후, 수업 추가 · My Plans.
 * 격자는 내 시간표(user.timetable). 수업 칸을 누르면 Class space(S030, /classes/:name).
 */
export function ScheduleTab() {
  const nav = useNavigate();
  const v = useViewer();
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const courses = v.me.timetable ?? [];
  const day = todayIdx();
  // 오늘 정오 이후 2시간 넘게 비는 때 (정오 전에 시작하는 빈 칸은 정오부터 센다)
  const afternoon = courses.length ? freeBlocks(courses, day).map((b) => ({ start: Math.max(b.start, 12 * 60), end: b.end })).find((b) => b.end - b.start >= 120) : undefined;
  return (
    <Screen>
      <TitleHeader title={en ? 'Schedule' : '일정'} actions={[{ key: 'edit', label: en ? 'Edit classes' : '수업 편집', icon: <CalendarDays size={22} />, onClick: () => nav('/schedule/classes') }]} />
      {status === 'loading' && <LoadingCards className="px-4 pt-2" />}
      {status === 'error' && <ErrorScreen message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && (
        <div className="px-4">
          <div className="text-center text-[14px] font-bold py-2">{en ? 'This week' : '이번 주'} <span className="text-ink-3 font-medium">· {weekLabel()}</span></div>
          <div className={cn(cardCls, 'overflow-hidden px-1 pb-1', !courses.length && 'opacity-60')}>
            <WeekGrid courses={courses} days={WEEKDAYS} today={day} onCourse={(c) => nav(`/classes/${encodeURIComponent(c.name)}`)} onCell={() => nav('/schedule/classes')} />
          </div>
          {!courses.length ? (
            <EmptyState icon={<CalendarDays size={30} />} title={en ? 'Make the week yours' : '이번 주를 내 것으로'} sub={en ? 'Add a class to see your week at a glance.' : '수업을 넣으면 한 주가 한눈에 보여요.'}
              action={{ label: en ? 'Add Classes' : '수업 추가', onClick: () => nav('/schedule/classes') }} className="pt-8" />
          ) : (
            <>
              <RowCard className="mt-4" tone="mint" icon={<Clock size={22} />}
                title={afternoon ? (en ? 'A free afternoon' : '빈 오후') : (en ? 'Between classes' : '수업 사이')}
                sub={afternoon ? `${en ? 'Free' : '비어 있어요'} ${fmtBlock(afternoon)} — ${en ? 'find a plan' : '약속 잡기'}` : (en ? 'Find a plan between classes' : '수업 사이에 약속 잡기')}
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
