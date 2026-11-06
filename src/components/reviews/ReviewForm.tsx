/**
 * 리뷰 쓰기 폼 — 필수: 별(1–5) + 글(50–2000자). 선택: 난이도 · 주당 시간 · 성적 · 출석 · 녹화 · 태그 · 강사(그 학기 강사 중에서).
 * 쓰기 화면(/reviews/write)과 학기 말 단계 화면(/reviews/term)이 같이 쓴다. 검사·거르기는 서버가 한다 — 거절 이유를 그대로 보여 준다.
 */
import { useState, type ReactNode } from 'react';
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

export function ReviewForm({ code, term, existing, instructors, submitLabel, onSaved, extra }: {
  code: string; term: string; existing?: MyReview; instructors: string[]; submitLabel?: string;
  onSaved: (v: CourseReviewsView) => void; extra?: ReactNode;
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
  const [busy, setBusy] = useState(false);
  const len = text.trim().length;
  const ready = rating > 0 && len >= REVIEW_LIMITS.textMin && len <= REVIEW_LIMITS.textMax;

  const submit = async () => {
    setBusy(true);
    try {
      const v = await api.courseReviews.save({
        code, term, rating, text, difficulty: difficulty ?? null, workload: workload ?? null, grading: grading ?? null,
        attendance: attendance ?? null, recorded: recorded === undefined ? null : recorded === 'yes', tags, instructor: instructor ?? null,
      });
      toast(existing ? 'Review updated' : 'Review posted — all reviews are unlocked', 'success');
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
        <FormField label="Your review" hint={<span className={cn(len > 0 && len < REVIEW_LIMITS.textMin && 'text-sel-fg')}>{len < REVIEW_LIMITS.textMin ? `At least ${REVIEW_LIMITS.textMin} characters · ${len}` : `${len} / ${REVIEW_LIMITS.textMax}`}</span>}>
          <TextArea value={text} maxLength={REVIEW_LIMITS.textMax} onChange={(e) => setText(e.target.value)} placeholder={REVIEW_COPY.placeholder} className="min-h-[150px]" />
        </FormField>
        <InfoNote className="-mt-3">{REVIEW_COPY.rules}</InfoNote>

        <div className="pt-1">
          <div className="text-[15px] font-bold">More details</div>
          <div className="text-[12.5px] text-ink-3 mt-0.5">Optional</div>
        </div>
        <Pick label="Difficulty" value={difficulty} onChange={setDifficulty} options={[1, 2, 3, 4, 5].map((n) => ({ value: n, label: n === 1 ? '1 Easy' : n === 5 ? '5 Hard' : String(n) }))} />
        <Pick label="Hours per week" value={workload} onChange={setWorkload} options={WORKLOADS.map((w) => ({ value: w, label: WORKLOAD_LABEL[w] }))} />
        <Pick label="Grading" value={grading} onChange={setGrading} options={GRADINGS.map((g) => ({ value: g, label: GRADING_LABEL[g] }))} />
        <Pick label="Attendance" value={attendance} onChange={setAttendance} options={[{ value: 'taken' as const, label: 'Taken' }, { value: 'not_taken' as const, label: 'Not taken' }]} />
        <Pick label="Lectures recorded" value={recorded} onChange={setRecorded} options={[{ value: 'yes' as const, label: 'Yes' }, { value: 'no' as const, label: 'No' }]} />
        <FormField label="Tags" hint={`Up to ${REVIEW_LIMITS.maxTags}`}>
          <ChipRow wrap>{REVIEW_TAGS.map((t) => <Chip key={t} size="sm" active={tags.includes(t)} onClick={() => toggleTag(t)}>{TAG_LABEL[t]}</Chip>)}</ChipRow>
        </FormField>
        {instructors.length > 0 && <Pick label="Instructor" value={instructor} onChange={setInstructor} options={instructors.map((i) => ({ value: i, label: i }))} />}
        {extra}
      </div>
      <BottomCTA>
        <Btn full size="lg" disabled={!ready} loading={busy} onClick={submit}>{submitLabel ?? (existing ? 'Save changes' : 'Post review')}</Btn>
      </BottomCTA>
    </>
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
