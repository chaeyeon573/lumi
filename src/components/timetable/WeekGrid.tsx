import type { Activity, User } from '@core/types';
import { DAY_LABELS, GRID_START, GRID_END, toMin, nowMin } from '@core/lib/timetable';
import { CATEGORY_COLORS, CATEGORY_EMOJI } from '@core/lib/labels';
import { cn } from '@core/lib/cn';
import { useDesign } from '@/lib/design';

type Course = User['timetable'][number];
/** 한 시간 높이 — 에브리타임처럼 크게 (수업 이름·강의실·시간이 한눈에) */
const HOUR_PX = 62;

/** Lumi v2 — 핑크·라임 스케일로 칠한 블록 (같은 수업은 늘 같은 색) */
const V2_BLOCKS = [
  { bg: '#C42683', code: '#FFFFFF', sub: '#FFE0F0' },  // pink 600
  { bg: '#D4FF3A', code: '#0C0A14', sub: '#3A4410' },  // lime 400
  { bg: '#5C1640', code: '#FFE0F0', sub: '#FFB3D9' },  // pink 800
  { bg: '#FF7AC0', code: '#0C0A14', sub: '#3D0F2A' },  // pink 300
  { bg: '#2E2940', code: '#F4F1FF', sub: '#A79FC4' },  // neutral
  { bg: '#A9CC1F', code: '#0C0A14', sub: '#2A320A' },  // lime 600
];
const v2Block = (name: string) => V2_BLOCKS[[...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % V2_BLOCKS.length];

/**
 * 주간 시간표 격자 — 시간표 화면과 Me 탭이 같은 것을 쓴다.
 * 보이는 시간 범위는 기본 9~18시, 수업·활동이 더 이르거나 늦으면 늘린다.
 */
export function WeekGrid({ courses, acts = [], days, today, onCourse, onActivity, onCell }: {
  courses: Course[]; acts?: { a: Activity; day: number }[]; days: number[]; today: number;
  onCourse: (c: Course) => void; onActivity?: (a: Activity) => void; onCell: (day: number, minute: number) => void;
}) {
  // 이번 주 활동(저녁 7시 달리기 등)도 범위에 넣는다 — 안 그러면 격자 밖으로 잘려 안 보인다
  const spans = [...courses.map((c) => [c.start, c.end]), ...acts.map(({ a }) => [a.startTime, a.endTime])];
  const gStart = Math.max(GRID_START, Math.min(9, ...spans.map(([s]) => Math.floor(toMin(s) / 60))));
  const gEnd = Math.min(GRID_END, Math.max(18, ...spans.map(([, e]) => Math.ceil(toMin(e) / 60))));
  const hours = Array.from({ length: gEnd - gStart }, (_, i) => gStart + i);
  const v2 = useDesign() === 'v2';
  const now = nowMin();
  const nowTop = now >= gStart * 60 && now <= gEnd * 60 ? (now - gStart * 60) / 60 * HOUR_PX : null;
  return (
    <>
            <div className="grid" style={{ gridTemplateColumns: `28px repeat(${days.length}, 1fr)` }}>
              <div />
              {days.map((d) => <div key={d} className={cn('text-center text-[14px] font-bold py-2.5', d === today ? 'text-primary v2:text-lime-400' : 'text-ink-3 v2:text-ink-2')}>{DAY_LABELS[d]}</div>)}
            </div>
            <div className="grid border-t border-line" style={{ gridTemplateColumns: `28px repeat(${days.length}, 1fr)`, height: hours.length * HOUR_PX }}>
              <div className="relative">{hours.map((h, i) => <div key={h} className="absolute right-1 text-[11px] text-ink-3 tabular-nums" style={{ top: i * HOUR_PX + 3 }}>{h}</div>)}</div>
              {days.map((d) => (
                <div key={d} className={cn('relative border-l border-line overflow-hidden', d === today && 'bg-primary-soft/30 v2:bg-transparent')} onClick={(e) => onCell(d, gStart * 60 + Math.floor(e.nativeEvent.offsetY / HOUR_PX) * 60)}>
                  {hours.map((h, i) => <div key={h} className="absolute left-0 right-0 border-t border-line/70" style={{ top: i * HOUR_PX }} />)}
                  {d === today && nowTop !== null && <div className="hidden v2:block absolute left-0 right-0 z-[1] h-[2px] bg-lime-400 pointer-events-none" style={{ top: nowTop }}><span className="absolute -left-[3px] -top-[3px] h-2 w-2 rounded-full bg-lime-400" /></div>}
                  {courses.filter((c) => c.day === d).map((c) => { const k = v2 ? v2Block(c.name) : null; const code = k ? k.code : `hsl(${c.hue} 55% 25%)`; const sub = k ? k.sub : `hsl(${c.hue} 50% 28%)`; return (
                    <button key={c.id} onClick={(e) => { e.stopPropagation(); onCourse(c); }} className="absolute left-[1px] right-[1px] rounded-md px-1.5 py-1.5 text-left overflow-hidden press v2:rounded-[4px] v2:px-2"
                      style={{ top: (toMin(c.start) - gStart * 60) / 60 * HOUR_PX, height: (toMin(c.end) - toMin(c.start)) / 60 * HOUR_PX - 2, background: k ? k.bg : `hsl(${c.hue} 75% 86%)` }}>
                      {(() => { const m = /^([A-Z][A-Z&.]*\s*\d+[A-Z]{0,3})\s*(.*)$/.exec(c.name); return m ? <>
                        <div className="text-[12px] font-extrabold leading-tight [overflow-wrap:anywhere] hyphens-auto v2:text-[13px]" style={{ color: code }}>{m[1]}</div>
                        {m[2] && <div className="text-[10.5px] font-semibold leading-tight line-clamp-3 mt-0.5 [overflow-wrap:anywhere] hyphens-auto" style={{ color: sub }}>{m[2]}</div>}
                      </> : <div className="text-[12px] font-extrabold leading-tight line-clamp-3 v2:text-[13px]" style={{ color: code }}>{c.name}</div>; })()}
                      {c.room && <div className="text-[10.5px] font-medium mt-0.5 leading-tight line-clamp-2 v2:text-[11px]" style={{ color: k ? k.sub : `hsl(${c.hue} 35% 35%)` }}>{c.room}</div>}
                    </button>
                  ); })}
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
