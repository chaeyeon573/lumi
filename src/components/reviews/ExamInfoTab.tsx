/**
 * 수업 페이지 › Exam info 탭 — 학생들이 남긴 시험 형식 모음 + 준비 팁. 리뷰와 같은 잠금 규칙 (요약 + 1개는 누구나).
 * 실제 시험 문제는 받지 않는다 — 형식과 준비 방법만 (폼에 한 줄로 적혀 있다).
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import type { ExamInfoView } from '@core/lib/coursereviews';
import { REVIEW_COPY } from '@core/lib/coursereviews';
import { api } from '@core/api';
import { Btn, EmptyState, ErrorScreen, InfoNote, LoadingCards, cardCls } from '@/components/ha';
import { ReportSheet } from '@/components/cards/ReportSheet';
import { cn } from '@core/lib/cn';
import { ExamSummaryCard, ExamTipCard, InviteCard, LockedCard, examLink } from './ReviewParts';

export function ExamInfoTab({ code, onAsk }: { code: string; onAsk?: () => void }) {
  const nav = useNavigate();
  const [v, setV] = useState<ExamInfoView | null>(null);
  const [error, setError] = useState('');
  const [report, setReport] = useState<string | null>(null);
  const load = useCallback(() => {
    setError('');
    api.courseReviews.exam(code).then(setV).catch((e) => setError((e as Error).message));
  }, [code]);
  useEffect(() => { load(); }, [load]);

  if (error && !v) return <ErrorScreen message={error} onRetry={load} />;
  if (!v) return <LoadingCards count={2} className="pt-2" />;
  const writeTerm = v.write.ok ? v.write.term : null;
  const mineNow = writeTerm ? v.mine.find((m) => m.term === writeTerm) : undefined;

  return (
    <div className="space-y-4">
      {v.total === 0 && !v.mine.length && !(v.invite && (writeTerm || (!v.write.ok && v.write.reason === 'not_enrolled')))
        ? <EmptyState icon={<ClipboardList size={28} />} tone="peach" className="pt-4" title="No exam info yet" sub={v.write.ok || v.write.reason === 'not_enrolled' ? undefined : v.write.message} />
        : v.total > 0 ? <ExamSummaryCard s={v.summary} /> : null}

      {writeTerm && !mineNow && !v.invite && !(v.locked && v.unlock?.reviewable.length) && <Btn full variant="outline" icon={<ClipboardList size={17} />} onClick={() => nav(examLink(v.course.code, writeTerm))}>Add exam info</Btn>}
      {v.mine.map((m) => (
        <button key={m.id} type="button" onClick={() => nav(examLink(m.code, m.term))} className={cn(cardCls, 'w-full p-3.5 flex items-center gap-3 text-left press')}>
          <span className="flex-1 min-w-0 text-[13.5px] font-semibold">Your exam info · {m.term}{m.status === 'checking' && <span className="text-ink-3 font-medium"> · Being checked</span>}</span>
          <span className="text-[13px] font-semibold text-sel-fg">Edit</span>
        </button>
      ))}

      {v.invite && <InviteCard title={`Be one of the first to share ${v.course.code} exam info`} code={v.course.code} label="Add" writeTerm={writeTerm && !mineNow ? writeTerm : null}
        canAddPast={!v.write.ok && v.write.reason === 'not_enrolled'} onWrite={(t) => nav(examLink(v.course.code, t))} />}
      {v.locked && v.unlock && <LockedCard unlock={v.unlock} onAsk={onAsk} title="Write one review to unlock all exam info" />}

      {v.tips.length > 0 && (
        <div className="space-y-3">
          {v.tips.map((x) => <ExamTipCard key={x.id} x={x} onReport={x.mine ? undefined : () => setReport(x.id)} />)}
        </div>
      )}
      <InfoNote>{REVIEW_COPY.examRule}</InfoNote>
      <ReportSheet open={!!report} onClose={() => { setReport(null); load(); }} targetType="exam" targetId={report ?? ''} />
    </div>
  );
}
