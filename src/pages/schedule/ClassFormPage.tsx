import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, Trash2 } from 'lucide-react';
import { lang } from '@core/i18n';
import type { Course } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { BackHeader, PageTitle, BottomCTA, Btn, Chip, ChipRow, FormField, TextInput, InfoNote } from '@/components/ha';
import { DAY_LABELS, COURSE_HUES, toMin } from '@core/lib/timetable';
import { uid } from '@core/lib/format';

const en = lang === 'en';

/** 수업 하나 = 같은 이름·분반·시각의 요일 줄들 (Mon/Wed 10:00 → 줄 두 개) */
const sameGroup = (a: Course, b: Course) => a.name === b.name && (a.section ?? '') === (b.section ?? '') && a.start === b.start && a.end === b.end;

interface Draft { name: string; days: number[]; start: string; end: string; room: string; professor: string }
const blank = (): Draft => ({ name: '', days: [], start: '10:00', end: '11:00', room: '', professor: '' });

/**
 * 수업 직접 입력·수정 (PDF S029 "Add / edit a class" 의 폼).
 *   /schedule/classes/manual  직접 입력 — 수업 추가(S029, AddClassesPage)의 목록 맨 아래 "Can't find it? Add it yourself"
 *   /schedule/classes/:id     그 수업(같은 이름·시각의 요일 줄들) 수정 · 삭제
 * 학교 수업 목록에서 찾아 넣기는 AddClassesPage 가 주인공이다 (owner 2026-11-06: 직접 입력은 주된 길이 아니다).
 */
export function ClassFormPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const timetable = me.timetable ?? [];
  const editing = id ? timetable.find((c) => c.id === id) : undefined;
  const group = editing ? timetable.filter((c) => sameGroup(c, editing)) : [];
  const [draft, setDraft] = useState<Draft>(() => editing
    ? { name: editing.name, days: [...new Set(group.map((c) => c.day))].sort(), start: editing.start, end: editing.end, room: editing.room ?? '', professor: editing.professor ?? '' }
    : blank());
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="min-h-full flex flex-col bg-bg">
      <BackHeader title={editing ? (en ? 'Edit a class' : '수업 수정') : (en ? 'Add a class' : '수업 추가')} />
      <PageTitle title={editing ? (en ? 'Edit a class' : '수업 수정') : (en ? 'Add a class' : '수업 추가')} />
      <div className="px-4 pb-6 space-y-6 flex-1">
        <div className="space-y-4">
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
