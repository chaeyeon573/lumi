import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Chip, ChipRow, EmptyState, CardSkeleton, ErrorState, Tag } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAcademicDates, useCampusStore } from '@/hooks/useCampusData';
import { KIND_LABELS, campusDate, dDay, formatAcademicDate, upcomingDates, type AcademicDateKind } from '@core/lib/academic';
import { cn } from '@core/lib/cn';

const FILTERS: (AcademicDateKind | 'all')[] = ['all', 'enrollment', 'deadline', 'holiday', 'finals', 'instruction'];
const DOT: Record<AcademicDateKind, string> = { enrollment: 'bg-primary', deadline: 'bg-danger', holiday: 'bg-mint', finals: 'bg-gold', instruction: 'bg-verify', other: 'bg-ink-3' };

/** 학사 일정 전체 — 다가오는 날짜순, 달별로 */
export function AcademicCalendarPage() {
  const me = useViewer().me;
  const schoolId = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  const dates = useAcademicDates(schoolId);
  const reload = useCampusStore((s) => s.loadDates);
  const [kind, setKind] = useState<AcademicDateKind | 'all'>('all');
  const [minor, setMinor] = useState(false);
  const today = campusDate();
  const list = Array.isArray(dates) ? upcomingDates(dates, today).filter((d) => (kind === 'all' ? minor || d.priority <= 2 : d.kind === kind)) : [];
  const months = new Map<string, typeof list>();
  for (const d of list) { const k = d.start < today ? today.slice(0, 7) : d.start.slice(0, 7); (months.get(k) ?? months.set(k, []).get(k)!).push(d); }
  const monthName = (ym: string) => new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(`${ym}-15T12:00:00Z`));
  const sources = Array.isArray(dates) ? [...new Set(dates.map((d) => d.source).filter(Boolean))] : [];

  return (
    <div className="min-h-full pb-10">
      <TopBar back title="Academic calendar" />
      <ChipRow className="px-4 mx-0">
        {FILTERS.map((f) => <Chip key={f} active={kind === f} onClick={() => setKind(f)}>{f === 'all' ? 'All' : KIND_LABELS[f]}</Chip>)}
      </ChipRow>
      {dates === 'loading' && <CardSkeleton count={3} />}
      {dates === 'error' && <ErrorState onRetry={() => reload(schoolId, true)} />}
      {Array.isArray(dates) && (list.length === 0 ? <EmptyState emoji="🗓️" title={dates.length ? 'Nothing coming up here' : 'No academic calendar for your school yet'} description={dates.length ? undefined : 'Lumi reads it from the registrar’s public calendar when one is published.'} /> : (
        <div className="px-4 space-y-5 mt-1">
          {[...months].map(([ym, items]) => (
            <section key={ym}>
              <h2 className="text-[13px] font-bold text-ink-3 uppercase tracking-wide mb-1">{monthName(ym)}</h2>
              <div className="card divide-y divide-line">
                {items.map((d) => (
                  <div key={d.id} className="flex items-start gap-3 px-4 py-3">
                    <span className={cn('mt-1.5 h-2.5 w-2.5 rounded-full shrink-0', DOT[d.kind])} aria-hidden />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-semibold text-primary leading-snug">{d.label}</span>
                      <span className="block text-[12px] text-ink-3">{formatAcademicDate(d)}{d.term ? ` · ${d.term}` : ''} · {KIND_LABELS[d.kind]}</span>
                    </span>
                    <Tag tone={d.start <= today ? 'danger' : 'neutral'} className="shrink-0 rounded-full">{dDay(d, today)}</Tag>
                  </div>
                ))}
              </div>
            </section>
          ))}
          {kind === 'all' && <button onClick={() => setMinor(!minor)} className="w-full h-10 rounded-xl bg-surface-2 text-[13px] font-semibold text-primary press">{minor ? 'Hide minor dates' : 'Show all dates (incl. minor ones)'}</button>}
          <div className="text-[11px] text-ink-3 space-y-1">
            <p>From the registrar’s official calendars. Always double-check deadlines on the registrar site or CalCentral.</p>
            {sources.map((s) => <a key={s} href={s.includes('calendar.google.com') ? 'https://registrar.berkeley.edu/calendars/enrollment-calendar/' : s} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary underline"><ExternalLink size={11} />{s.includes('calendar.google.com') ? 'Student enrollment calendar' : s.endsWith('.pdf') ? 'Academic calendar (PDF)' : s}</a>)}
          </div>
        </div>
      ))}
    </div>
  );
}
