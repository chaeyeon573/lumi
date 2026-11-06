/**
 * 시험 정보 폼 (수업·학기마다 하나) — 중간고사 수 · 기말 · 형식 칩 · 노트 · 짧은 팁(500자). 실제 문제는 받지 않는다.
 */
import { useState, type ReactNode } from 'react';
import { EXAM_FORMATS, EXAM_FORMAT_LABEL, EXAM_NOTES_LABEL, REVIEW_COPY, REVIEW_LIMITS, type ExamFormat, type ExamInfoView, type ExamNotes, type MyExamInfo } from '@core/lib/coursereviews';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { BottomCTA, Btn, Chip, ChipRow, FormField, InfoNote, TextArea } from '@/components/ha';
import { Pick } from './ReviewForm';

export function ExamForm({ code, term, existing, onSaved, extra }: { code: string; term: string; existing?: MyExamInfo; onSaved: (v: ExamInfoView) => void; extra?: ReactNode }) {
  const toast = useAppStore((s) => s.showToast);
  const [midterms, setMidterms] = useState<number | undefined>(existing?.midterms);
  const [final, setFinal] = useState<'yes' | 'no' | undefined>(existing ? (existing.final ? 'yes' : 'no') : undefined);
  const [formats, setFormats] = useState<ExamFormat[]>(existing?.formats ?? []);
  const [notes, setNotes] = useState<ExamNotes | undefined>(existing?.notes);
  const [tip, setTip] = useState(existing?.tip ?? '');
  const [busy, setBusy] = useState(false);
  const ready = midterms !== undefined && final !== undefined;
  const submit = async () => {
    if (midterms === undefined || !final) return;
    setBusy(true);
    try {
      const v = await api.courseReviews.saveExam({ code, term, midterms, final: final === 'yes', formats, notes: notes ?? null, tip: tip.trim() || null });
      toast(existing ? 'Exam info updated' : 'Thanks — exam info shared', 'success');
      onSaved(v);
    } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(false); }
  };
  return (
    <>
      <div className="px-4 space-y-6 pb-6">
        <Pick label="Midterms" value={midterms} onChange={setMidterms} options={[0, 1, 2, 3].map((n) => ({ value: n, label: n === 0 ? 'None' : n === 3 ? '3+' : String(n) }))} />
        <Pick label="Final exam" value={final} onChange={setFinal} options={[{ value: 'yes' as const, label: 'Yes' }, { value: 'no' as const, label: 'No' }]} />
        <FormField label="Format" hint="Pick all that apply">
          <ChipRow wrap>{EXAM_FORMATS.map((f) => <Chip key={f} size="sm" active={formats.includes(f)} onClick={() => setFormats((x) => (x.includes(f) ? x.filter((y) => y !== f) : [...x, f]))}>{EXAM_FORMAT_LABEL[f]}</Chip>)}</ChipRow>
        </FormField>
        <Pick label="Notes" value={notes} onChange={setNotes} options={(['open', 'closed'] as const).map((n) => ({ value: n, label: EXAM_NOTES_LABEL[n] }))} />
        <FormField label="Tip (optional)" hint={`${tip.trim().length} / ${REVIEW_LIMITS.tipMax}`}>
          <TextArea value={tip} maxLength={REVIEW_LIMITS.tipMax} onChange={(e) => setTip(e.target.value)} placeholder="How did you prepare? What helped?" />
        </FormField>
        <InfoNote className="-mt-3">{REVIEW_COPY.examRule}</InfoNote>
        {extra}
      </div>
      <BottomCTA>
        <Btn full size="lg" disabled={!ready} loading={busy} onClick={submit}>{existing ? 'Save changes' : 'Share exam info'}</Btn>
      </BottomCTA>
    </>
  );
}
