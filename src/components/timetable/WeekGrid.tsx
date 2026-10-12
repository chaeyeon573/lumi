import type { Activity, User } from '@core/types';
import { DAY_LABELS, GRID_START, GRID_END, toMin } from '@core/lib/timetable';
import { CATEGORY_COLORS, CATEGORY_EMOJI } from '@core/lib/labels';
import { cn } from '@core/lib/cn';

type Course = User['timetable'][number];
/** 한 시간 높이 — 에브리타임처럼 크게 (수업 이름·강의실·시간이 한눈에) */
const HOUR_PX = 62;

/**
 * 주간 시간표 격자 — 시간표 화면과 Me 탭이 같은 것을 쓴다.
 * 보이는 시간 범위는 기본 9~18시, 수업이 더 이르거나 늦으면 늘린다.
 */
export function WeekGrid({ courses, acts = [], days, today, onCourse, onActivity, onCell }: {
  courses: Course[]; acts?: { a: Activity; day: number }[]; days: number[]; today: number;
  onCourse: (c: Course) => void; onActivity?: (a: Activity) => void; onCell: (day: number, minute: number) => void;
}) {
  const gStart = Math.max(GRID_START, Math.min(9, ...courses.map((c) => Math.floor(toMin(c.start) / 60))));
  const gEnd = Math.min(GRID_END, Math.max(18, ...courses.map((c) => Math.ceil(toMin(c.end) / 60))));
  const hours = Array.from({ length: gEnd - gStart }, (_, i) => gStart + i);
  return (
    <>
            <div className="grid" style={{ gridTemplateColumns: `28px repeat(${days.length}, 1fr)` }}>
              <div />
              {days.map((d) => <div key={d} className={cn('text-center text-[14px] font-bold py-2.5', d === today ? 'text-primary' : 'text-ink-3')}>{DAY_LABELS[d]}</div>)}
            </div>
            <div className="grid border-t border-line" style={{ gridTemplateColumns: `28px repeat(${days.length}, 1fr)`, height: hours.length * HOUR_PX }}>
              <div className="relative">{hours.map((h, i) => <div key={h} className="absolute right-1 text-[11px] text-ink-3 tabular-nums" style={{ top: i * HOUR_PX + 3 }}>{h}</div>)}</div>
              {days.map((d) => (
                <div key={d} className={cn('relative border-l border-line overflow-hidden', d === today && 'bg-primary-soft/30')} onClick={(e) => onCell(d, gStart * 60 + Math.floor(e.nativeEvent.offsetY / HOUR_PX) * 60)}>
                  {hours.map((h, i) => <div key={h} className="absolute left-0 right-0 border-t border-line/70" style={{ top: i * HOUR_PX }} />)}
                  {courses.filter((c) => c.day === d).map((c) => (
                    <button key={c.id} onClick={(e) => { e.stopPropagation(); onCourse(c); }} className="absolute left-[1px] right-[1px] rounded-md px-1.5 py-1.5 text-left overflow-hidden press"
                      style={{ top: (toMin(c.start) - gStart * 60) / 60 * HOUR_PX, height: (toMin(c.end) - toMin(c.start)) / 60 * HOUR_PX - 2, background: `hsl(${c.hue} 75% 86%)` }}>
                      {(() => { const m = /^([A-Z][A-Z&.]*\s*\d+[A-Z]{0,3})\s*(.*)$/.exec(c.name); return m ? <>
                        <div className="text-[12px] font-extrabold leading-tight [overflow-wrap:anywhere]" style={{ color: `hsl(${c.hue} 55% 25%)` }}>{m[1]}</div>
                        {m[2] && <div className="text-[10.5px] font-semibold leading-tight line-clamp-3 mt-0.5 [overflow-wrap:anywhere]" style={{ color: `hsl(${c.hue} 50% 28%)` }}>{m[2]}</div>}
                      </> : <div className="text-[12px] font-extrabold leading-tight line-clamp-3" style={{ color: `hsl(${c.hue} 55% 25%)` }}>{c.name}</div>; })()}
                      {c.room && <div className="text-[10.5px] font-medium mt-0.5 leading-tight line-clamp-2" style={{ color: `hsl(${c.hue} 35% 35%)` }}>{c.room}</div>}
                    </button>
                  ))}
                  {acts.filter((x) => x.day === d).map(({ a }) => (
                    <button key={a.id} onClick={(e) => { e.stopPropagation(); onActivity?.(a); }} className="absolute left-0.5 right-0.5 rounded-lg px-1.5 py-1 text-left overflow-hidden press border-2 border-dashed"
                      style={{ top: Math.max(0, (toMin(a.startTime) - gStart * 60) / 60 * HOUR_PX), height: Math.max(22, (toMin(a.endTime) - toMin(a.startTime)) / 60 * HOUR_PX - 2), borderColor: CATEGORY_COLORS[a.category], background: `${CATEGORY_COLORS[a.category]}18` }}>
                      <div className="text-[11.5px] font-bold leading-tight line-clamp-3" style={{ color: CATEGORY_COLORS[a.category] }}>{CATEGORY_EMOJI[a.category]} {a.title}</div>
                    </button>
                  ))}
                </div>
              ))}
            </div>
    </>
  );
}
