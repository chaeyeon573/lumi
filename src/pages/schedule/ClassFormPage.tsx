import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, BookOpen, Check, Clock, Layers, MapPin, Trash2, User as UserIcon } from 'lucide-react';
import { lang } from '@core/i18n';
import type { Course } from '@core/types';
import type { CatalogCourse, CatalogSection } from '@core/api/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { BottomSheet } from '@/components/ui';
import {
  BackHeader, PageTitle, BottomCTA, Btn, Chip, ChipRow, ChoiceChips, FormField, TextInput, SearchField, SelectField, InfoNote, SectionHeader, IconTile, Badge, cardCls,
} from '@/components/ha';
import { DAY_LABELS, COURSE_HUES, catalogCourseName, clashesWith, coursesFromCatalog, hasCatalogCourse, meetingsLabel, toMin } from '@core/lib/timetable';
import { uid } from '@core/lib/format';
import { cn } from '@core/lib/cn';

const en = lang === 'en';
const KIND: Record<string, [string, string]> = { DIS: ['Discussion', '디스커션'], LAB: ['Lab', '랩'], REC: ['Recitation', '리시테이션'], SEM: ['Seminar', '세미나'] };
const kindName = (k: string) => (KIND[k] ? KIND[k][en ? 0 : 1] : k);
/** 섹션을 기다리는 최대 시간 — 넘으면 강의만 넣게 한다 (서버도 8초에 끊는다) */
const SECTIONS_WAIT_MS = 9_000;

/** 수업 하나 = 같은 이름·분반·시각의 요일 줄들 (Mon/Wed 10:00 → 줄 두 개) */
const sameGroup = (a: Course, b: Course) => a.name === b.name && (a.section ?? '') === (b.section ?? '') && a.start === b.start && a.end === b.end;

interface Draft { name: string; days: number[]; start: string; end: string; room: string; professor: string }
const blank = (): Draft => ({ name: '', days: [], start: '10:00', end: '11:00', room: '', professor: '' });

/**
 * 수업 추가·수정 (PDF S029 "Add / edit a class").
 *   /schedule/classes       학교 수업 목록 검색이 먼저(옛 번호 "formerly MATH 1A" 로도 찾는다), 그 아래 직접 입력 폼
 *   /schedule/classes/:id   그 수업(같은 이름·시각의 요일 줄들) 수정 · 삭제
 * 목록에서 고르면 바로 "Add Class" 를 누를 수 있다 — 디스커션·랩 섹션은 뒤에서 읽어 와 고를 수 있게만 한다
 * (예전에는 섹션을 다 읽을 때까지 기다리게 했고, 섹션이 없으면 누르지도 않았는데 들어갔다).
 */
export function ClassFormPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const timetable = me.timetable ?? [];
  const editing = id ? timetable.find((c) => c.id === id) : undefined;
  const group = editing ? timetable.filter((c) => sameGroup(c, editing)) : [];
  const schoolId = me.affiliation.type === 'university' ? me.affiliation.schoolId ?? '' : '';
  const [draft, setDraft] = useState<Draft>(() => editing
    ? { name: editing.name, days: [...new Set(group.map((c) => c.day))].sort(), start: editing.start, end: editing.end, room: editing.room ?? '', professor: editing.professor ?? '' }
    : blank());
  const [busy, setBusy] = useState(false);
  const [picked, setPicked] = useState<CatalogCourse | null>(null);

  if (id && !editing) return (
    <div className="min-h-full bg-bg">
      <BackHeader title={en ? 'Edit a class' : '수업 수정'} />
      <PageTitle title={en ? 'This class is gone' : '없는 수업이에요'} sub={en ? 'It may have been removed from your schedule.' : '시간표에서 지운 수업일 수 있어요.'} />
    </div>
  );

  const valid = draft.name.trim().length > 0 && draft.days.length > 0 && toMin(draft.start) < toMin(draft.end);
  const save = async () => {
    if (!valid) return;
    setBusy(true);
    const name = draft.name.trim().slice(0, 60);
    const base: Omit<Course, 'id' | 'day'> = { ...(editing ?? { hue: COURSE_HUES[Math.floor(Math.random() * COURSE_HUES.length)] }), name, start: draft.start, end: draft.end, room: draft.room.trim() || undefined, professor: draft.professor.trim() || undefined };
    const rows: Course[] = draft.days.map((day) => ({ ...base, id: group.find((c) => c.day === day)?.id ?? uid('c'), day }));
    // 이름을 바꾸면 같은 수업의 다른 줄(디스커션 등)도 같이 — 수업 공간이 한 이름으로 묶인다
    const others = timetable.filter((c) => !group.some((g) => g.id === c.id)).map((c) => (editing && c.name === editing.name ? { ...c, name } : c));
    try {
      await run(() => api.users.update(me.id, { timetable: [...others, ...rows] }), editing ? (en ? 'Class saved' : '수업을 저장했어요') : (en ? `${name} added to your schedule` : `${name} 추가했어요`));
      if (editing) nav(-1); else nav('/schedule', { replace: true });
    } catch { setBusy(false); }
  };
  const remove = async () => {
    if (!editing) return;
    setBusy(true);
    try {
      await run(() => api.users.update(me.id, { timetable: timetable.filter((c) => c.name !== editing.name) }), en ? 'Class removed' : '수업을 지웠어요');
      nav('/schedule', { replace: true });
    } catch { setBusy(false); }
  };

  if (picked) return <CatalogPick course={picked} schoolId={schoolId} timetable={timetable} onBack={() => setPicked(null)} />;

  return (
    <div className="min-h-full flex flex-col bg-bg">
      <BackHeader title={editing ? (en ? 'Edit a class' : '수업 수정') : (en ? 'Add a class' : '수업 추가')} />
      <PageTitle title={editing ? (en ? 'Edit a class' : '수업 수정') : (en ? 'Add a class' : '수업 추가')} />
      <div className="px-4 pb-6 space-y-6 flex-1">
        {!editing && schoolId && <CatalogSearch schoolId={schoolId} wantTerm={params.get('term') ?? ''} onPick={setPicked} />}
        <div className="space-y-4">
          {!editing && schoolId && <SectionHeader title={en ? 'Or enter it yourself' : '직접 입력'} className="mb-0" />}
          <FormField label={en ? 'Course name' : '과목명'}>
            <TextInput value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={en ? 'Calculus' : '예: 미적분'} maxLength={60} />
          </FormField>
          <div>
            <div className="text-[13px] font-semibold text-ink mb-2">{en ? 'Days' : '요일'}</div>
            <ChipRow wrap>
              {[0, 1, 2, 3, 4, 5, 6].filter((d) => d < 5 || draft.days.includes(d) || group.some((c) => c.day === d)).map((d) => (
                <Chip key={d} size="sm" active={draft.days.includes(d)} onClick={() => setDraft({ ...draft, days: draft.days.includes(d) ? draft.days.filter((x) => x !== d) : [...draft.days, d].sort() })}>{DAY_LABELS[d]}</Chip>
              ))}
            </ChipRow>
          </div>
          <FormField label={en ? 'Start time' : '시작'}><TextInput type="time" className="[&_input::-webkit-calendar-picker-indicator]:hidden" icon={<Clock size={18} />} value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></FormField>
          <FormField label={en ? 'End time' : '끝'} hint={toMin(draft.start) >= toMin(draft.end) ? <span className="text-danger">{en ? 'End after it starts.' : '끝나는 시간이 시작보다 뒤여야 해요.'}</span> : undefined}>
            <TextInput type="time" className="[&_input::-webkit-calendar-picker-indicator]:hidden" icon={<Clock size={18} />} value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
          </FormField>
          <FormField label={en ? 'Classroom' : '강의실'}><TextInput value={draft.room} onChange={(e) => setDraft({ ...draft, room: e.target.value })} placeholder={en ? 'Optional · private' : '선택 · 나만 보기'} maxLength={60} /></FormField>
          <FormField label={en ? 'Instructor' : '교수'}><TextInput value={draft.professor} onChange={(e) => setDraft({ ...draft, professor: e.target.value })} placeholder={en ? 'Optional' : '선택'} maxLength={60} /></FormField>
          <InfoNote>{en ? 'Classmates only see that you take the same class — never your classroom or full timetable.' : '같은 수업 학생에게는 같은 수업을 듣는다는 것만 보여요. 강의실·전체 시간표는 보이지 않아요.'}</InfoNote>
          {editing && <Btn variant="link" icon={<Trash2 size={16} />} className="!text-danger" disabled={busy} onClick={remove}>{en ? 'Remove this class' : '이 수업 지우기'}</Btn>}
        </div>
      </div>
      <BottomCTA><Btn full size="lg" disabled={!valid} loading={busy} onClick={save}>{en ? 'Save Class' : '수업 저장'}</Btn></BottomCTA>
    </div>
  );
}

/** 학교 수업 목록 검색 — 학기 · 학과 · 이름/코드(옛 코드 포함) */
function CatalogSearch({ schoolId, wantTerm, onPick }: { schoolId: string; wantTerm: string; onPick: (c: CatalogCourse) => void }) {
  const [q, setQ] = useState('');
  const [terms, setTerms] = useState<{ terms: string[]; current: string } | null>(null);
  const [term, setTerm] = useState('');
  const [dept, setDept] = useState('');
  const [depts, setDepts] = useState<{ name: string; count: number }[]>([]);
  const [deptOpen, setDeptOpen] = useState(false);
  const [results, setResults] = useState<CatalogCourse[] | null>(null);
  useEffect(() => {
    api.catalog.terms(schoolId).then((r) => { setTerms(r); setTerm(wantTerm && r.terms.includes(wantTerm) ? wantTerm : r.current); }).catch(() => setTerms({ terms: [], current: '' }));
  }, [schoolId, wantTerm]);
  useEffect(() => {
    if (!terms) return;
    api.catalog.departments(schoolId, term || undefined).then((r) => { setDepts(r); setDept((d) => (d && !r.some((x) => x.name === d) ? '' : d)); }).catch(() => setDepts([]));
  }, [schoolId, term, terms]);
  useEffect(() => {
    if (!terms || (!q.trim() && !dept)) { setResults(null); return; }
    let alive = true;
    const h = setTimeout(() => { api.catalog.courses(schoolId, q, dept, term || undefined).then((r) => { if (alive) setResults(r); }).catch(() => { if (alive) setResults([]); }); }, 200);
    return () => { alive = false; clearTimeout(h); };
  }, [schoolId, q, dept, term, terms]);
  // 지금 학기와 그다음 학기만 ("Fall 2026 | Spring 2027")
  const termOptions = useMemo(() => {
    if (!terms?.current) return [];
    const i = terms.terms.indexOf(terms.current);
    return i < 0 ? [] : terms.terms.slice(i, i + 2).filter((x) => /^(Spring|Summer|Fall|Winter|Autumn) \d{4}$/.test(x));
  }, [terms]);
  return (
    <div className="space-y-3">
      <SectionHeader title={en ? 'Find it in your school’s class list' : '학교 수업 목록에서 찾기'} className="mb-0" />
      {termOptions.length > 1 && <ChoiceChips value={term} onChange={setTerm} options={termOptions.map((x) => ({ value: x, label: x }))} wrap={false} />}
      <SearchField placeholder={en ? 'Course code or name, like MATH 51' : '과목 코드나 이름 (예: CS 61A)'} value={q} onChange={setQ} />
      {depts.length > 1 && <SelectField icon={<Layers size={18} />} value={dept} placeholder={en ? `All departments (${depts.length})` : `전체 학과 (${depts.length})`} onClick={() => setDeptOpen(true)} />}
      {results && results.length > 0 && (
        <div className={cn(cardCls, 'divide-y divide-line overflow-hidden')}>
          {results.slice(0, dept && !q.trim() ? 200 : 20).map((c) => (
            <button key={c.id} type="button" onClick={() => onPick(c)} className="w-full px-4 py-3 text-left press">
              <span className="block text-[14.5px] font-bold leading-snug">{c.code} <span className="font-medium text-ink-2">{c.title}</span></span>
              <span className="block text-[12.5px] text-ink-3 mt-0.5 truncate">{c.meetings.length ? meetingsLabel(c.meetings) : (en ? 'Time not set' : '시간 미정')}{c.instructor ? ` · ${c.instructor}` : ''}</span>
            </button>
          ))}
        </div>
      )}
      {results && results.length === 0 && <p className="text-[13px] text-ink-3">{en ? 'No class found. You can enter it yourself below.' : '찾는 수업이 없어요. 아래에 직접 입력할 수 있어요.'}</p>}
      <BottomSheet open={deptOpen} onClose={() => setDeptOpen(false)} title={en ? 'Department' : '학과'} tall>
        <div className="divide-y divide-line">
          {[{ name: '', count: 0 }, ...depts].map((d) => (
            <button key={d.name || 'all'} onClick={() => { setDept(d.name); setDeptOpen(false); }} className="w-full flex items-center gap-3 py-3 text-left press">
              <span className={cn('flex-1 text-[14.5px]', dept === d.name ? 'text-sel-fg font-semibold' : 'text-ink')}>{d.name || (en ? 'All departments' : '전체 학과')}</span>
              {d.count > 0 && <span className="text-[12px] text-ink-3">{d.count}</span>}
              {dept === d.name && <Check size={16} className="text-sel-fg" />}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}

/**
 * 목록에서 고른 수업 — 강의 시간·교수·강의실을 보여 주고 바로 Add Class.
 * 디스커션·랩은 뒤에서 읽어 와 고를 수 있게만 한다 (기다리지 않아도 된다, 고르지 않아도 된다).
 */
function CatalogPick({ course: c, schoolId, timetable, onBack }: { course: CatalogCourse; schoolId: string; timetable: Course[]; onBack: () => void }) {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [sections, setSections] = useState<CatalogSection[] | null>(null);
  const [slow, setSlow] = useState(false);
  const [chosen, setChosen] = useState<Record<string, string>>({});
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const timer = setTimeout(() => { if (alive.current) setSlow(true); }, SECTIONS_WAIT_MS);
    api.catalog.sections(schoolId, c.id).then((s) => { if (alive.current) setSections(s); }).catch(() => { if (alive.current) setSections([]); }).finally(() => clearTimeout(timer));
    return () => { alive.current = false; clearTimeout(timer); };
  }, [schoolId, c.id]);
  const already = hasCatalogCourse(timetable, c);
  const clash = clashesWith(timetable, c).map((x) => x.name.split(' ').slice(0, 2).join(' '));
  const kinds = [...new Set((sections ?? []).map((s) => s.kind))];
  const picked = (sections ?? []).filter((s) => chosen[s.kind] === s.label);
  const many = (sections?.length ?? 0) > 8;
  const match = (s: CatalogSection) => !q.trim() || chosen[s.kind] === s.label || `${s.label} ${s.location ?? ''}`.toLowerCase().includes(q.trim().toLowerCase());
  const clashOf = (s: CatalogSection) => {
    const busy = [...timetable.map((x) => ({ ...x, label: x.name.split(' ').slice(0, 2).join(' ') })), ...c.meetings.map((m) => ({ ...m, label: c.code }))];
    return busy.find((b) => s.meetings.some((m) => m.day === b.day && toMin(m.start) < toMin(b.end) && toMin(b.start) < toMin(m.end)))?.label;
  };
  const add = async () => {
    setBusy(true);
    const hue = COURSE_HUES[Math.floor(Math.random() * COURSE_HUES.length)];
    const lecture = coursesFromCatalog(c, hue);
    const meta = lecture[0] ? { code: lecture[0].code, term: lecture[0].term } : {};
    const extra: Course[] = picked.flatMap((s) => s.meetings.map((m) => ({ id: uid('c'), name: catalogCourseName(c), day: m.day, start: m.start, end: m.end, room: s.location, url: c.url, syllabusUrl: c.syllabusUrl, section: s.label, hue, ...meta })));
    const label = [c.code, ...picked.map((s) => s.label)].join(' + ');
    try {
      await run(() => api.users.update(v.me.id, { timetable: [...timetable, ...lecture, ...extra] }), en ? `${label} added to your schedule` : `${label} 추가했어요`);
      nav('/schedule', { replace: true });
    } catch { setBusy(false); }
  };
  return (
    <div className="min-h-full flex flex-col bg-bg">
      <BackHeader title={en ? 'Add a class' : '수업 추가'} onBack={onBack} />
      <div className="px-4 pb-6 space-y-5 flex-1">
        <div className={cn(cardCls, 'p-4')}>
          <div className="flex items-start gap-3.5">
            <IconTile tone="ice"><BookOpen size={20} /></IconTile>
            <div className="flex-1 min-w-0">
              {c.term && <Badge tone="ice" className="h-5 text-[11px] px-2">{c.term}</Badge>}
              <div className="text-[20px] font-extrabold tracking-[-0.02em] leading-tight mt-1">{c.code}</div>
              <div className="text-[14px] text-ink-2 mt-0.5 leading-snug">{c.title}</div>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-[13.5px]">
            <div className="flex items-center gap-2.5 text-ink"><Clock size={16} className="text-ink-3 shrink-0" />{en ? 'Lecture' : '강의'} · {c.meetings.length ? meetingsLabel(c.meetings) : (en ? 'time not set' : '시간 미정')}</div>
            {c.location && <div className="flex items-center gap-2.5 text-ink-2"><MapPin size={16} className="text-ink-3 shrink-0" />{c.location}</div>}
            {c.instructor && <div className="flex items-center gap-2.5 text-ink-2"><UserIcon size={16} className="text-ink-3 shrink-0" />{c.instructor}</div>}
          </div>
          {(c.syllabusUrl || c.url) && <a href={c.syllabusUrl ?? c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 mt-3 text-[13px] font-semibold text-sel-fg">{c.syllabusUrl ? (en ? 'Syllabus' : '실라버스') : (en ? 'Course page' : '과목 정보')}<ArrowUpRight size={14} /></a>}
        </div>
        {already && <InfoNote>{en ? 'This class is already in your schedule.' : '이미 시간표에 있는 수업이에요.'}</InfoNote>}
        {!already && clash.length > 0 && <InfoNote>{en ? `Overlaps ${[...new Set(clash)].join(', ')} in your schedule.` : `시간표의 ${[...new Set(clash)].join(', ')}와 겹쳐요.`}</InfoNote>}

        <div>
          <SectionHeader title={en ? 'Your discussion or lab' : '디스커션 · 랩'} className="mb-2" />
          {sections === null ? (
            <div className={cn(cardCls, 'px-4 py-3.5 flex items-center gap-3 text-[13px] text-ink-3')}>
              {slow ? (en ? 'Sections are taking a while. You can add the lecture now.' : '섹션을 읽는 데 오래 걸려요. 강의부터 넣어도 돼요.') : <><span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />{en ? 'Looking up sections. You can add the lecture now.' : '섹션을 찾는 중이에요. 강의부터 넣어도 돼요.'}</>}
            </div>
          ) : sections.length === 0 ? (
            <p className="text-[13px] text-ink-3">{en ? 'No discussion or lab sections listed for this class.' : '이 수업에는 따로 등록된 디스커션·랩이 없어요.'}</p>
          ) : (
            <div className="space-y-3">
              <p className="text-[13px] text-ink-3">{en ? 'Optional. Pick yours to see who’s in your section.' : '선택이에요. 고르면 같은 섹션 친구가 보여요.'}</p>
              {many && <SearchField placeholder={en ? 'Your section number, like 118' : '섹션 번호 (예: 118)'} value={q} onChange={setQ} />}
              {kinds.filter((k) => sections.some((s) => s.kind === k && match(s))).map((k) => (
                <div key={k}>
                  <div className="text-[12.5px] font-bold text-ink-2 mb-1.5">{kindName(k)}</div>
                  <div className={cn(cardCls, 'max-h-64 overflow-y-auto divide-y divide-line')}>
                    {sections.filter((s) => s.kind === k && match(s)).map((s) => {
                      const on = chosen[k] === s.label; const x = clashOf(s);
                      return (
                        <button key={s.label} type="button" aria-pressed={on} onClick={() => setChosen({ ...chosen, [k]: on ? '' : s.label })} className={cn('w-full flex items-center gap-3 px-4 py-2.5 text-left press', on && 'bg-sel-soft')}>
                          <span className={cn('h-5 w-5 rounded-full border grid place-items-center shrink-0', on ? 'bg-sel border-sel text-on-primary' : 'border-line')}>{on && <Check size={12} strokeWidth={3} />}</span>
                          <span className="flex-1 min-w-0">
                            <span className={cn('block text-[13.5px] font-semibold', on && 'text-sel-fg')}>{s.label}</span>
                            <span className="block text-[12px] text-ink-3">{meetingsLabel(s.meetings)}{s.location ? ` · ${s.location}` : ''}</span>
                            {x && <span className="block text-[12px] text-danger">{en ? `Overlaps ${x}` : `${x}와 겹쳐요`}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <BottomCTA note={<button onClick={onBack} className="w-full text-center text-[13px] font-semibold text-ink-2 press">{en ? 'Choose a different class' : '다른 수업 고르기'}</button>}>
        <Btn full size="lg" loading={busy} disabled={already} onClick={add}>
          {picked.length ? (en ? `Add with ${picked.map((s) => s.label).join(' + ')}` : `${picked.map((s) => s.label).join(' + ')} 같이 추가`) : (en ? 'Add Class' : '수업 추가')}
        </Btn>
      </BottomCTA>
    </div>
  );
}
