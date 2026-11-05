import type { Activity, User } from '@core/types';
import { lang } from '@core/i18n';
import { DAY_LABELS, GRID_START, GRID_END, toMin, nowMin } from '@core/lib/timetable';
import { TONE, type Tone } from '@/components/ha';
import { cn } from '@core/lib/cn';

type Course = NonNullable<User['timetable']>[number];
/** 한 시간 높이 — 에브리타임처럼 크게 (수업 이름·강의실·시간이 한눈에) */
const HOUR_PX = 56;

/** Harness A — PDF 시간표의 파스텔 블록을 어두운 틴트로 (src/index.css --color-t-*). 같은 수업은 늘 같은 색 */
const BLOCK_TONES: Tone[] = ['ice', 'peach', 'mint', 'lav', 'rose'];
export const courseTone = (name: string): Tone => BLOCK_TONES[[...name].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7) % BLOCK_TONES.length];

/** "9 AM" · "9시" — 격자 왼쪽 시각 */
export const hourLabel = (h: number) => (lang === 'en' ? `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}` : `${h}시`);
const clock = (hhmm: string) => (lang === 'en' ? (() => { const m = toMin(hhmm); const hr = Math.floor(m / 60) % 12 || 12; return `${hr}:${String(m % 60).padStart(2, '0')}`; })() : hhmm);

/**
 * 주간 시간표 격자 (PDF S027) — 요일 머리(날짜 숫자 포함), 왼쪽 시각, 수업 블록(틴트), 이번 주 약속(점선 테두리).
 * 보이는 시간 범위는 기본 9~18시, 수업·약속이 더 이르거나 늦으면 늘린다.
 */
export function WeekGrid({ courses, acts = [], days, today, dates, onCourse, onActivity, onCell, dim }: {
  courses: Course[]; acts?: { a: Activity; day: number }[]; days: number[];
  /** 오늘 요일 (0=월) — 이번 주가 아니면 -1 */
  today: number;
  /** 요일마다 날짜 ('YYYY-MM-DD') — 주면 머리에 날짜 숫자 */
  dates?: string[];
  onCourse: (c: Course) => void; onActivity?: (a: Activity) => void; onCell?: (day: number, minute: number) => void;
  /** 빈 시간표 (S028) — 칸만 */
  dim?: boolean;
}) {
  // 이번 주 약속(저녁 7시 달리기 등)도 범위에 넣는다 — 안 그러면 격자 밖으로 잘려 안 보인다
  const spans = [...courses.map((c) => [c.start, c.end]), ...acts.map(({ a }) => [a.startTime, a.endTime])];
  const gStart = Math.max(GRID_START - 2, Math.min(9, ...spans.map(([s]) => Math.floor(toMin(s) / 60))));
  const gEnd = Math.min(GRID_END + 2, Math.max(18, ...spans.map(([, e]) => Math.ceil(toMin(e) / 60))));
  const hours = Array.from({ length: gEnd - gStart }, (_, i) => gStart + i);
  // 빈 시간표(S028)는 낮게 — 아래 "Make the week yours" 가 첫 화면에 보이게 (PDF)
  const hourPx = dim ? 38 : HOUR_PX;
  const now = nowMin();
  const nowTop = now >= gStart * 60 && now <= gEnd * 60 ? (now - gStart * 60) / 60 * hourPx : null;
  const cols = `34px repeat(${days.length}, minmax(0, 1fr))`;
  return (
    <div className={cn(dim && 'opacity-70')}>
      <div className="grid" style={{ gridTemplateColumns: cols }}>
        <div />
        {days.map((d, i) => (
          <div key={d} className="text-center py-2">
            <div className={cn('text-[12.5px] font-bold', d === today ? 'text-sel-fg' : 'text-ink')}>{DAY_LABELS[d]}</div>
            {dates?.[i] && <div className={cn('text-[11px] mt-0.5 tabular-nums', d === today ? 'text-sel-fg font-semibold' : 'text-ink-3')}>{Number(dates[i].slice(8, 10))}</div>}
          </div>
        ))}
      </div>
      <div className="grid border-t border-line" style={{ gridTemplateColumns: cols, height: hours.length * hourPx }}>
        <div className="relative">{hours.map((h, i) => <div key={h} className="absolute left-1 text-[9.5px] text-ink-3 tabular-nums whitespace-nowrap" style={{ top: i * hourPx + 3 }}>{hourLabel(h)}</div>)}</div>
        {days.map((d) => (
          <div key={d} className="relative border-l border-line overflow-hidden" onClick={onCell ? (e) => onCell(d, gStart * 60 + Math.floor(e.nativeEvent.offsetY / hourPx) * 60) : undefined}>
            {hours.map((h, i) => <div key={h} className="absolute left-0 right-0 border-t border-line/70" style={{ top: i * hourPx }} />)}
            {d === today && nowTop !== null && <div className="absolute left-0 right-0 z-[1] h-[2px] bg-sel pointer-events-none" style={{ top: nowTop }}><span className="absolute -left-[3px] -top-[3px] h-2 w-2 rounded-full bg-sel" /></div>}
            {courses.filter((c) => c.day === d).map((c) => {
              const m = /^([A-Z][A-Z&.]*\s*\d+[A-Z]{0,3})\s*(.*)$/.exec(c.name);
              const shared = acts.some((x) => x.day === d && toMin(c.start) < toMin(x.a.endTime) && toMin(x.a.startTime) < toMin(c.end));
              return (
                <button key={c.id} onClick={(e) => { e.stopPropagation(); onCourse(c); }} className={cn('absolute left-[2px] rounded-[6px] px-1.5 py-1 text-left overflow-hidden press', shared ? 'right-1/2' : 'right-[2px]', TONE[courseTone(c.name)])}
                  style={{ top: (toMin(c.start) - gStart * 60) / 60 * hourPx + 1, height: (toMin(c.end) - toMin(c.start)) / 60 * hourPx - 2 }}>
                  <div className="text-[11px] font-extrabold leading-tight text-ink [overflow-wrap:anywhere] line-clamp-2">{m ? m[1] : c.name}</div>
                  <div className="text-[10px] font-medium leading-tight mt-0.5 opacity-90">{clock(c.start)}</div>
                  {c.section && <div className="text-[9.5px] font-medium leading-tight mt-0.5 opacity-80 truncate">{c.section}</div>}
                </button>
              );
            })}
            {acts.filter((x) => x.day === d).map(({ a }) => {
              // 수업과 겹치면 오른쪽 절반에 — 수업 블록을 가리지 않게
              const clash = courses.some((c) => c.day === d && toMin(c.start) < toMin(a.endTime) && toMin(a.startTime) < toMin(c.end));
              return (
              <button key={a.id} onClick={(e) => { e.stopPropagation(); onActivity?.(a); }} className={cn('absolute right-[2px] rounded-[6px] px-1.5 py-1 text-left overflow-hidden press border border-dashed bg-t-rose text-t-rose-fg', clash ? 'left-1/2' : 'left-[2px]')}
                style={{ borderColor: 'var(--color-t-rose-fg)', top: Math.max(0, (toMin(a.startTime) - gStart * 60) / 60 * hourPx + 1), height: Math.max(24, (toMin(a.endTime) - toMin(a.startTime)) / 60 * hourPx - 2) }}>
                <div className="text-[11px] font-bold leading-tight line-clamp-2 text-ink">{a.title}</div>
                <div className="text-[10px] font-medium leading-tight mt-0.5">{clock(a.startTime)}</div>
              </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
