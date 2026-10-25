import { useState } from 'react';
import { ArrowLeft, Check } from 'lucide-react';
import { lang } from '@core/i18n';
import type { Course } from '@core/types';
import type { CatalogCourse, CatalogSection } from '@core/api/types';
import { Button, Input } from '@/components/ui';
import { meetingsLabel, toMin } from '@core/lib/timetable';
import { cn } from '@core/lib/cn';

const en = lang === 'en';
const KIND: Record<string, [string, string]> = { DIS: ['Discussion', '디스커션'], LAB: ['Lab', '랩'], REC: ['Recitation', '리시테이션'], SEM: ['Seminar', '세미나'] };
const kindName = (k: string) => (KIND[k] ? KIND[k][en ? 0 : 1] : k);
const when = meetingsLabel;

/**
 * 수업 목록에서 고른 강의에 딸린 토론·랩 고르기 — 종류마다 하나씩 (모르면 비워 두고 강의만 넣는다).
 * 내 시간표나 이 강의와 겹치는 섹션은 무엇과 겹치는지 적어 준다 (고르지 못하게 막지는 않는다 — 학생이 이미 등록했을 수 있다).
 */
export function SectionPicker({ course, sections, timetable, busy, onBack, onAdd }: {
  course: CatalogCourse;
  /** null = 읽는 중 */
  sections: CatalogSection[] | null;
  timetable: Course[];
  busy: boolean;
  onBack: () => void;
  onAdd: (chosen: CatalogSection[]) => void;
}) {
  const [chosen, setChosen] = useState<Record<string, string>>({});
  // 섹션이 많으면(CS 61A 디스커션 46개) 번호로 찾는다 — 학생은 자기 섹션 번호를 안다
  const [q, setQ] = useState('');
  const many = (sections?.length ?? 0) > 8;
  const match = (x: CatalogSection) => !q.trim() || chosen[x.kind] === x.label || `${x.label} ${x.location ?? ''} ${when(x.meetings)}`.toLowerCase().includes(q.trim().toLowerCase());
  const kinds = [...new Set((sections ?? []).map((s) => s.kind))];
  const picked = (sections ?? []).filter((s) => chosen[s.kind] === s.label);
  const clash = (s: CatalogSection) => {
    const busyTimes = [...timetable.map((c) => ({ ...c, label: c.name.split(' ').slice(0, 2).join(' ') })), ...course.meetings.map((m) => ({ ...m, label: course.code }))];
    return busyTimes.find((b) => s.meetings.some((m) => m.day === b.day && toMin(m.start) < toMin(b.end) && toMin(b.start) < toMin(m.end)))?.label;
  };
  return (
    <div className="space-y-3">
      <div>
        <div className="text-[15px] font-bold">{course.code} <span className="font-semibold text-ink-2">{course.title}</span></div>
        <div className="text-[12px] text-ink-3">{en ? 'Lecture' : '강의'} · {when(course.meetings)}{course.location ? ` · ${course.location}` : ''}</div>
      </div>
      {sections === null ? (
        <div className="rounded-xl bg-surface-2 px-3 py-4 text-[13px] text-ink-3">{en ? 'Finding discussion and lab sections…' : '디스커션·랩 섹션을 찾는 중…'}</div>
      ) : (
        <>
          <p className="text-[12px] text-ink-3">{en ? 'Pick yours so your free time is right and you can see who’s in your section. Not sure yet? Leave it empty.' : '내 섹션을 고르면 공강이 정확해지고, 같은 섹션 친구가 보여요. 아직 모르면 비워 두세요.'}</p>
          {many && <Input placeholder={en ? 'Your section number (e.g. 118)' : '섹션 번호로 찾기 (예: 118)'} value={q} onChange={(e) => setQ(e.target.value)} inputMode="search" />}
          {kinds.filter((k) => sections.some((x) => x.kind === k && match(x))).map((k) => (
            <div key={k}>
              <div className="text-[12px] font-bold text-ink-2 mb-1">{kindName(k)}</div>
              <div className="max-h-56 overflow-y-auto divide-y divide-line rounded-xl bg-white v2:bg-surface-2">
                {sections.filter((s) => s.kind === k && match(s)).map((s) => {
                  const on = chosen[k] === s.label; const c = clash(s);
                  return (
                    <button key={s.label} type="button" onClick={() => setChosen({ ...chosen, [k]: on ? '' : s.label })} className={cn('w-full flex items-center gap-2 px-3 py-2 text-left press', on && 'bg-primary-soft')}>
                      <span className={cn('h-5 w-5 rounded-full border grid place-items-center shrink-0', on ? 'bg-primary border-primary text-white v2:text-night' : 'border-line')}>{on && <Check size={12} />}</span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13px] font-semibold">{s.label}</span>
                        <span className="block text-[11px] text-ink-3">{when(s.meetings)}{s.location ? ` · ${s.location}` : ''}</span>
                        {c && <span className="block text-[11px] text-danger">{en ? `Overlaps ${c}` : `${c}와 겹쳐요`}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </>
      )}
      <div className="flex gap-2">
        <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={onBack} disabled={busy}>{en ? 'Back' : '뒤로'}</Button>
        <Button full loading={busy} disabled={sections === null} onClick={() => onAdd(picked)}>
          {picked.length ? (en ? `Add with ${picked.map((s) => s.label).join(' + ')}` : `${picked.map((s) => s.label).join(' + ')} 같이 추가`) : (en ? 'Add lecture only' : '강의만 추가')}
        </Button>
      </div>
    </div>
  );
}
