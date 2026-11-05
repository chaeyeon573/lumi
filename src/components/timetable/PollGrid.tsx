import { Check } from 'lucide-react';
import type { TimeOption } from '@core/types';
import { lang } from '@core/i18n';
import { DAY_LABELS } from '@core/lib/timetable';
import { POLL_GRID, addDaysTo, optionCell } from '@core/lib/pollgrid';
import { cn } from '@core/lib/cn';
import { hourLabel } from './WeekGrid';

const en = lang === 'en';

/**
 * 한 주 격자 투표 칸 (PDF S034 Find a Time · S036 Time poll) — 월~금 × 9시~17시 시작 칸.
 *   mode 'vote' : 내가 되는 칸을 누른다 (고른 칸 = 핑크 선택). 다른 사람 표 수는 작은 숫자로만
 *   mode 'heat' : 표가 모인 정도 — 몇 명 = 하늘, 가장 많이 겹친 칸 = 민트. 주최자가 누른 칸 = 핑크 테두리
 * 후보가 없는 칸(지난 시간)은 비워 둔다.
 */
export function PollGrid({ weekStart, options, mode, picked, counts, top, busy, onPick, className }: {
  weekStart: string;
  options: TimeOption[];
  mode: 'vote' | 'heat';
  /** vote: 내가 고른 칸들 · heat: 주최자가 고른 칸 하나 */
  picked: Set<string>;
  /** option id → 표 수 (vote 모드에서는 나를 뺀 수) */
  counts: Map<string, number>;
  /** heat: 가장 많이 겹친 표 수 */
  top?: number;
  /** vote: 내 수업과 겹치는 칸 — 나에게만 "Class" 로 보인다 (고르는 건 자유) */
  busy?: Set<string>;
  onPick: (optionId: string) => void;
  className?: string;
}) {
  const byCell = new Map<string, TimeOption>();
  for (const o of options) { const c = optionCell(weekStart, o); byCell.set(`${c.day}:${c.hour}`, o); }
  // 칸이 하나도 없는 줄(2시간 모임의 17시 등)은 그리지 않는다
  const hours = Array.from({ length: POLL_GRID.toHour - POLL_GRID.fromHour }, (_, i) => POLL_GRID.fromHour + i).filter((h) => options.some((o) => Number(o.startTime.slice(0, 2)) === h));
  const days = Array.from({ length: POLL_GRID.days }, (_, i) => i);
  const cols = '34px repeat(5, minmax(0, 1fr))';
  return (
    <div className={className}>
      <div className="grid" style={{ gridTemplateColumns: cols }}>
        <div />
        {days.map((d) => (
          <div key={d} className="text-center py-2">
            <div className="text-[12.5px] font-bold text-ink">{DAY_LABELS[d]}</div>
            <div className="text-[11px] mt-0.5 text-ink-3 tabular-nums">{Number(addDaysTo(weekStart, d).slice(8, 10))}</div>
          </div>
        ))}
      </div>
      <div className="border-t border-line">
        {hours.map((h) => (
          <div key={h} className="grid border-b border-line/70 last:border-b-0" style={{ gridTemplateColumns: cols }}>
            <div className="text-[9.5px] text-ink-3 tabular-nums pt-1 pl-1 whitespace-nowrap">{hourLabel(h)}</div>
            {days.map((d) => {
              const o = byCell.get(`${d}:${h}`);
              if (!o) return <div key={d} className="h-11 border-l border-line" />;
              const n = counts.get(o.id) ?? 0;
              const on = picked.has(o.id);
              const best = mode === 'heat' && !!top && n === top;
              const label = `${DAY_LABELS[d]} ${hourLabel(h)}${n ? (en ? `, ${n} available` : `, ${n}명 가능`) : ''}`;
              return (
                <button key={d} type="button" onClick={() => onPick(o.id)} aria-pressed={on} aria-label={label}
                  className="h-11 border-l border-line p-[3px] press">
                  <span className={cn('h-full w-full rounded-[6px] grid place-items-center text-[11px] font-bold tabular-nums border',
                    mode === 'vote'
                      ? (on ? 'bg-sel-soft border-sel-line text-sel-fg' : 'bg-transparent border-transparent text-ink-3')
                      : cn(best ? 'bg-t-mint text-t-mint-fg' : n > 0 ? 'bg-t-ice text-t-ice-fg' : 'bg-transparent text-ink-3', on ? 'border-sel ring-1 ring-sel' : 'border-transparent'))}>
                    {mode === 'vote' ? (on ? <Check size={14} strokeWidth={3} /> : n > 0 ? n : busy?.has(o.id) ? <span className="text-[9.5px] font-semibold text-ink-3">{en ? 'Class' : '수업'}</span> : '') : n > 0 ? n : ''}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/** 격자 아래 범례 (S034) */
export function HeatLegend() {
  return (
    <div className="flex items-center gap-4 text-[11.5px] text-ink-3">
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[4px] bg-t-mint" />{en ? 'Best overlap' : '가장 많이 겹침'}</span>
      <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-[4px] bg-t-ice" />{en ? 'Some availability' : '일부 가능'}</span>
    </div>
  );
}
