import { useNavigate } from 'react-router-dom';
import { CalendarClock, ChevronRight } from 'lucide-react';
import { Tag } from '@/components/ui';
import { useAcademicDates } from '@/hooks/useCampusData';
import { campusDate, dDay, formatAcademicDate, keyDates, type AcademicDate } from '@core/lib/academic';

const tone = (d: AcademicDate, today: string) => {
  const s = dDay(d, today);
  if (s === 'Today' || s === 'Now') return 'danger' as const;
  const n = Number(s.slice(2));
  return n <= 7 ? 'danger' as const : n <= 30 ? 'gold' as const : 'neutral' as const;
};

/** Me · Key dates — 다가오는 중요한 학사 일정 2~3개 (D-day). 학사 일정이 없는 학교면 아무것도 그리지 않는다 */
export function KeyDatesCard({ schoolId }: { schoolId: string }) {
  const nav = useNavigate();
  const dates = useAcademicDates(schoolId);
  if (!Array.isArray(dates) || !dates.length) return null;
  const today = campusDate();
  const picks = keyDates(dates, today, 3);
  if (!picks.length) return null;
  return (
    <section className="card p-5" aria-label="Key dates">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display text-[20px] font-bold text-primary flex items-center gap-2"><CalendarClock size={18} />Key dates</h2>
        <button onClick={() => nav('/academic-calendar')} className="text-[13px] font-semibold text-verify flex items-center">All dates<ChevronRight size={15} /></button>
      </div>
      <div className="divide-y divide-line">
        {picks.map((d) => (
          <button key={d.id} onClick={() => nav('/academic-calendar')} className="w-full flex items-center gap-3 py-3 text-left press">
            <Tag tone={tone(d, today)} className="h-7 min-w-[64px] justify-center rounded-full shrink-0">{dDay(d, today)}</Tag>
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-semibold text-primary leading-snug">{d.label}</span>
              <span className="block text-[12px] text-ink-3">{formatAcademicDate(d)}{d.term ? ` · ${d.term}` : ''}</span>
            </span>
          </button>
        ))}
      </div>
      <p className="mt-1 text-[11px] text-ink-3">From the registrar’s official calendar</p>
    </section>
  );
}
