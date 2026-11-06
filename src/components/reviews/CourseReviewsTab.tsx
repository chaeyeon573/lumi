/**
 * 수업 페이지 › Reviews 탭 — 요약 카드 + 리뷰. 잠금 규칙·익명·3개 규칙은 서버가 정한다 (@core/lib/coursereviews, server/coursereviews.ts).
 * 이 탭이 하는 일: 보여 주기, 필터(강사·학기), 도움돼요, 신고, 쓰기·고치기로 보내기. 계산은 하지 않는다.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star } from 'lucide-react';
import type { CourseReviewsView } from '@core/lib/coursereviews';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { Btn, Chip, ChipRow, EmptyState, ErrorScreen, InfoNote, LoadingCards, SectionHeader, cardCls } from '@/components/ha';
import { ReportSheet } from '@/components/cards/ReportSheet';
import { cn } from '@core/lib/cn';
import { LockedCard, ReviewCard, StarRow, SummaryCard, writeLink } from './ReviewParts';

export function CourseReviewsTab({ code, onAsk }: { code: string; onAsk?: () => void }) {
  const nav = useNavigate();
  const toast = useAppStore((s) => s.showToast);
  const [v, setV] = useState<CourseReviewsView | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<{ instructor?: string; term?: string }>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const load = useCallback(() => {
    setError('');
    api.courseReviews.view(code, filter).then(setV).catch((e) => setError((e as Error).message));
  }, [code, filter]);
  useEffect(() => { load(); }, [load]);

  if (error && !v) return <ErrorScreen message={error} onRetry={load} />;
  if (!v) return <LoadingCards count={2} className="pt-2" />;

  const helpful = async (id: string) => {
    setBusy(id);
    try { setV(await api.courseReviews.helpful(id)); } catch (e) { toast((e as Error).message, 'error'); } finally { setBusy(null); }
  };
  const writeTerm = v.write.ok ? v.write.term : null;
  const mineNow = writeTerm ? v.mine.find((m) => m.term === writeTerm) : undefined;
  const pick = (k: 'instructor' | 'term', val?: string) => setFilter((f) => ({ ...f, [k]: f[k] === val ? undefined : val }));

  return (
    <div className="space-y-4">
      {v.total === 0 && !v.mine.length ? (
        <EmptyState icon={<Star size={28} />} tone="peach" className="pt-4" title={`No reviews for ${v.course.code} yet`}
          sub={v.write.ok ? 'Yours would be the first one classmates see.' : v.write.message} />
      ) : <SummaryCard s={v.summary} />}

      {/* 쓰기 — 지금 쓸 수 있으면 화면의 큰 버튼 하나, 이미 썼으면 고치기 */}
      {writeTerm && !mineNow && <Btn full size="lg" onClick={() => nav(writeLink(v.course.code, writeTerm))}>Write a review</Btn>}
      {v.mine.map((m) => (
        <button key={m.id} type="button" onClick={() => nav(writeLink(m.code, m.term))} className={cn(cardCls, 'w-full p-3.5 flex items-center gap-3 text-left press')}>
          <span className="flex-1 min-w-0">
            <span className="block text-[13.5px] font-semibold">Your review · {m.term}{m.status === 'checking' && <span className="text-ink-3 font-medium"> · Being checked</span>}</span>
            <StarRow value={m.rating} size={13} className="mt-1" />
          </span>
          <span className="text-[13px] font-semibold text-sel-fg">Edit</span>
        </button>
      ))}

      {v.locked && v.unlock && <LockedCard unlock={v.unlock} onAsk={onAsk} />}

      {!v.locked && (v.filters.instructors.length > 1 || v.filters.terms.length > 1) && (
        <div className="space-y-2">
          {v.filters.instructors.length > 1 && (
            <ChipRow>{v.filters.instructors.map((i) => <Chip key={i} size="sm" active={filter.instructor === i} onClick={() => pick('instructor', i)}>{i}</Chip>)}</ChipRow>
          )}
          {v.filters.terms.length > 1 && (
            <ChipRow>{v.filters.terms.map((t) => <Chip key={t} size="sm" active={filter.term === t} onClick={() => pick('term', t)}>{t}</Chip>)}</ChipRow>
          )}
        </div>
      )}

      {v.reviews.length > 0 && (
        <section>
          {v.locked && <SectionHeader title="One review" />}
          <div className="space-y-3">
            {v.reviews.map((r) => (
              <ReviewCard key={r.id} r={r} busy={busy === r.id}
                onHelpful={r.mine ? undefined : () => helpful(r.id)}
                onReport={r.mine ? undefined : () => setReport(r.id)} />
            ))}
          </div>
        </section>
      )}
      {!v.locked && v.reviews.length === 0 && v.total > 0 && <p className="text-[13.5px] text-ink-3 text-center py-4">No reviews match these filters.</p>}

      <InfoNote>Reviews are anonymous. Students see the term, never your name.</InfoNote>
      <ReportSheet open={!!report} onClose={() => { setReport(null); load(); }} targetType="review" targetId={report ?? ''} />
    </div>
  );
}
