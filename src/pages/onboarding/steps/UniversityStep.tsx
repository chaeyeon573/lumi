import { useState } from 'react';
import { Check, Ellipsis, GraduationCap } from 'lucide-react';
import type { School, UniversityRole } from '@core/types';
import { cn } from '@core/lib/cn';
import { Chip, ChipRow, FormField, IconTile, InfoNote, SearchField, cardCls } from '@/components/ha';
import { ComingSoonSchools } from '../ComingSoonSchools';
import { SectionTitle, StepFrame, en, type StepProps } from './shared';

/** The line under a school's name — its full name when we know it, otherwise the region */
export const FULL_NAME: Record<string, string> = { 'UC Berkeley': 'University of California, Berkeley' };

const ROLES: { v: UniversityRole; label: string }[] = [
  { v: 'undergraduate', label: en ? 'Undergraduate' : '학부생' },
  { v: 'graduate', label: en ? 'Graduate' : '대학원생' },
  { v: 'alumni', label: en ? 'Alumni' : '졸업생' },
];
const YEARS = [1, 2, 3, 4].map((y) => ({ y, label: en ? ['1st', '2nd', '3rd', '4th+'][y - 1] : y === 4 ? '4학년+' : `${y}학년` }));

/**
 * S008 Your university — search (no list until the student types; owner 2026-11-03), the picked school as a card,
 * student status, optional year (1st–4th+ → affiliation.year as the entry year). Schools that aren't open take a
 * waitlist e-mail instead (ComingSoonSchools).
 */
export function UniversityStep({ d, patch, next, schools }: StepProps & { schools: School[] }) {
  const [q, setQ] = useState('');
  const [other, setOther] = useState(false);
  const picked = schools.find((s) => s.id === d.schoolId);
  const query = q.trim().toLowerCase();
  const hits = query ? schools.filter((s) => `${s.name} ${FULL_NAME[s.name] ?? ''} ${s.region}`.toLowerCase().includes(query)) : [];
  const ok = !!picked && !!d.role && !other;

  return (
    <StepFrame title={en ? 'Your university' : '나의 학교'} sub={en ? 'Find your campus. Make it yours.' : '캠퍼스를 찾고, 나의 것으로.'}
      cta={{ label: en ? 'Continue' : '계속', onClick: next, disabled: !ok }}>
      <FormField label={en ? 'University' : '학교'}>
        <SearchField placeholder={en ? 'Search universities' : '학교 검색'} value={q} onChange={setQ} />
      </FormField>

      {query && (
        <div className="mt-2.5 space-y-2">
          {hits.map((s) => (
            <button key={s.id} type="button" onClick={() => { patch({ schoolId: s.id }); setQ(''); setOther(false); }} className={cn(cardCls, 'w-full p-3.5 flex items-center gap-3 text-left press')}>
              <IconTile tone="peach" size={40}><GraduationCap size={20} /></IconTile>
              <span className="flex-1 min-w-0"><b className="block text-[15px] font-bold truncate">{s.name}</b><span className="block text-[12.5px] text-ink-3 truncate">{FULL_NAME[s.name] ?? s.region}</span></span>
            </button>
          ))}
          <button type="button" onClick={() => { setOther(true); setQ(''); patch({ schoolId: '' }); }} className={cn(cardCls, 'w-full p-3.5 flex items-center gap-3 text-left press')}>
            <IconTile tone="neutral" size={40}><Ellipsis size={20} /></IconTile>
            <span className="flex-1 min-w-0"><b className="block text-[15px] font-bold">{en ? 'My school isn’t here' : '우리 학교가 없어요'}</b><span className="block text-[12.5px] text-ink-3">{en ? 'Join the waitlist' : '대기 명단에 넣어 드려요'}</span></span>
          </button>
        </div>
      )}

      {!query && picked && (
        <div className={cn(cardCls, 'mt-3 p-4 flex items-center gap-3.5')}>
          <IconTile tone="peach" size={44}><GraduationCap size={22} /></IconTile>
          <span className="flex-1 min-w-0"><b className="block text-[15px] font-bold truncate">{picked.name}</b><span className="block text-[12.5px] text-ink-3 truncate">{FULL_NAME[picked.name] ?? picked.region}</span></span>
          <Check size={18} className="text-sel-fg shrink-0" aria-label={en ? 'Selected' : '선택됨'} />
        </div>
      )}

      {other && !query && <ComingSoonSchools openNames={schools.map((s) => s.name)} />}

      {!other && (
        <>
          <SectionTitle className="mt-7">{en ? 'Student status' : '신분'}</SectionTitle>
          <ChipRow wrap>
            {ROLES.map((r) => <Chip key={r.v} active={d.role === r.v} onClick={() => patch({ role: r.v, ...(r.v === 'alumni' ? { yearInSchool: 0 } : {}) })}>{r.label}</Chip>)}
          </ChipRow>
          {d.role !== 'alumni' && (
            <>
              <SectionTitle className="mt-7">{en ? 'Year · optional' : '학년 · 선택'}</SectionTitle>
              <ChipRow wrap>
                {YEARS.map(({ y, label }) => <Chip key={y} active={d.yearInSchool === y} onClick={() => patch({ yearInSchool: d.yearInSchool === y ? 0 : y })}>{label}</Chip>)}
              </ChipRow>
            </>
          )}
          <InfoNote className="mt-5">{en ? 'Master’s / PhD and graduation year are editable later.' : '석사·박사 과정과 졸업 연도는 나중에 고칠 수 있어요.'}</InfoNote>
        </>
      )}
    </StepFrame>
  );
}
