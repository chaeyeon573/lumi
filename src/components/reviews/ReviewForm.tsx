/**
 * 리뷰 쓰기 폼 — owner 2026-11-06 "글이 필수는 아니게!!": 필수는 별 하나. 10초 안에: 별 → 칩 몇 개 → Post.
 * 순서: Overall ★ · Tags · Hours per week · Difficulty · (Grading · Attendance · Recorded · Instructor) · "Anything else? (optional)" 글.
 * quick(학기 말 단계 화면): 별 · 태그 · 시간만 보이고 More details · Add a note 는 접혀 있다.
 * 글을 쓰면 10–2000자 + 서버 거르기 (거절 이유를 그대로 보여 준다).
 */
import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  GRADINGS, GRADING_LABEL, REVIEW_COPY, REVIEW_LIMITS, REVIEW_TAGS, TAG_LABEL, WORKLOADS, WORKLOAD_LABEL,
  type CourseReviewsView, type Grading, type MyReview, type ReviewTag, type Workload,
} from '@core/lib/coursereviews';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { BottomCTA, Btn, Chip, ChipRow, FormField, InfoNote, TextArea } from '@/components/ha';
import { cn } from '@core/lib/cn';
import { StarPicker } from './ReviewParts';

type YesNo = 'yes' | 'no';

export function ReviewForm({ code, term, existing, instructors, submitLabel, onSaved, extra, quick }: {
  code: string; term: string; existing?: MyReview; instructors: string[]; submitLabel?: string;
  onSaved: (v: CourseReviewsView) => void; extra?: ReactNode; quick?: boolean;
}) {
  const toast = useAppStore((s) => s.showToast);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [text, setText] = useState(existing?.text ?? '');
  const [difficulty, setDifficulty] = useState<number | undefined>(existing?.difficulty);
  const [workload, setWorkload] = useState<Workload | undefined>(existing?.workload);
  const [grading, setGrading] = useState<Grading | undefined>(existing?.grading);
  const [attendance, setAttendance] = useState<'taken' | 'not_taken' | undefined>(existing?.attendance);
  const [recorded, setRecorded] = useState<YesNo | undefined>(existing?.recorded === undefined ? undefined : existing.recorded ? 'yes' : 'no');
  const [tags, setTags] = useState<ReviewTag[]>(existing?.tags ?? []);
  const [instructor, setInstructor] = useState<string | undefined>(existing?.instructor);
  const [more, setMore] = useState(!quick);
  const [note, setNote] = useState(!quick || !!existing?.text);
  const [busy, setBusy] = useState(false);
  const len = text.trim().length;
  const textOk = len === 0 || (len >= REVIEW_LIMITS.textMin && len <= REVIEW_LIMITS.textMax);
  const ready = rating > 0 && textOk;

  const submit = async () => {
    setBusy(true);
    try {
      const v = await api.courseReviews.save({
        code, term, rating, text: text.trim() || null, difficulty: difficulty ?? null, workload: workload ?? null, grading: grading ?? null,
        attendance: attendance ?? null, recorded: recorded === undefined ? null : recorded === 'yes', tags, instructor: instructor ?? null,
      });
      toast(existing ? 'Review updated' : 'Review posted', 'success');
      onSaved(v);
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  };
  const toggleTag = (t: ReviewTag) => setTags((x) => (x.includes(t) ? x.filter((y) => y !== t) : x.length >= REVIEW_LIMITS.maxTags ? x : [...x, t]));

  return (
    <>
      <div className="px-4 space-y-6 pb-6">
        <FormField label="Overall">
          <StarPicker value={rating} onChange={setRating} />
        </FormField>
        <FormField label="What was it like?" hint={`Optional · up to ${REVIEW_LIMITS.maxTags}`}>
          <ChipRow wrap>{REVIEW_TAGS.map((t) => <Chip key={t} size="sm" active={tags.includes(t)} onClick={() => toggleTag(t)}>{TAG_LABEL[t]}</Chip>)}</ChipRow>
        </FormField>
        <Pick label="Hours per week" value={workload} onChange={setWorkload} options={WORKLOADS.map((w) => ({ value: w, label: WORKLOAD_LABEL[w] }))} />

        {more ? (
          <>
            <Pick label="Difficulty" value={difficulty} onChange={setDifficulty} options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: n === 1 ? '1 Easy' : n === 5 ? '5 Hard' : String(n) }))} />
            <Pick label="Grading" value={grading} onChange={setGrading} options={GRADINGS.map((g) => ({ value: g, label: GRADING_LABEL[g] }))} />
            <Pick label="Attendance" value={attendance} onChange={setAttendance} options={[{ value: 'taken' as const, label: 'Taken' }, { value: 'not_taken' as const, label: 'Not taken' }]} />
            <Pick label="Lectures recorded" value={recorded} onChange={setRecorded} options={[{ value: 'yes' as const, label: 'Yes' }, { value: 'no' as const, label: 'No' }]} />
            {instructors.length > 0 && <Pick label="Instructor" value={instructor} onChange={setInstructor} options={instructors.map((i) => ({ value: i, label: i }))} />}
          </>
        ) : <Expander label="More details" onClick={() => setMore(true)} />}

        {note ? (
          <>
            <FormField label={REVIEW_COPY.textLabel} hint={len > 0 && <span className={cn(len < REVIEW_LIMITS.textMin && 'text-sel-fg')}>{len < REVIEW_LIMITS.textMin ? `Add a few more words · ${len}` : `${len} / ${REVIEW_LIMITS.textMax}`}</span>}>
              <TextArea value={text} maxLength={REVIEW_LIMITS.textMax} onChange={(e) => setText(e.target.value)} placeholder={REVIEW_COPY.placeholder} className="min-h-[110px]" autoFocus={quick} />
            </FormField>
            <InfoNote className="-mt-3">{REVIEW_COPY.rules}</InfoNote>
          </>
        ) : <Expander label="Add a note" onClick={() => setNote(true)} />}
        {extra}
      </div>
      <BottomCTA>
        <Btn full size="lg" disabled={!ready} loading={busy} onClick={submit}>{submitLabel ?? (existing ? 'Save changes' : 'Post review')}</Btn>
      </BottomCTA>
    </>
  );
}

function Expander({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1.5 text-[14px] font-semibold text-sel-fg press">
      {label}<ChevronDown size={16} />
    </button>
  );
}

/** 하나 고르기 — 다시 누르면 비운다 (선택 항목) */
export function Pick<T extends string | number>({ label, value, onChange, options }: { label: string; value: T | undefined; onChange: (v: T | undefined) => void; options: { value: T; label: string }[] }) {
  return (
    <FormField label={label}>
      <ChipRow wrap>{options.map((o) => <Chip key={String(o.value)} size="sm" active={value === o.value} onClick={() => onChange(value === o.value ? undefined : o.value)}>{o.label}</Chip>)}</ChipRow>
    </FormField>
  );
}

/** 두 번 눌러 지우기 (확인 창 없이) */
export function DeleteLink({ label, onDelete }: { label: string; onDelete: () => Promise<void> }) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <button type="button" disabled={busy} onClick={async () => { if (!armed) { setArmed(true); return; } setBusy(true); try { await onDelete(); } finally { setBusy(false); setArmed(false); } }}
      className={cn('text-[13px] font-semibold press', armed ? 'text-danger' : 'text-ink-3')}>
      {armed ? 'Tap again to delete' : label}
    </button>
  );
}
