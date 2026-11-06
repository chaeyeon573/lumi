/**
 * 수업 리뷰 · 시험 정보 공용 부품 — 별, 요약 카드, 리뷰 카드, 잠금 카드, 목록 줄 별점.
 * 규칙·문구: @core/lib/coursereviews. 별은 따뜻한 토큰 gold (hex 없음). 고른 것은 핑크(sel), 큰 버튼은 라벤더(primary) 하나.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Star, ThumbsUp } from 'lucide-react';
import {
  GRADING_LABEL, TAG_LABEL, WORKLOADS, WORKLOAD_LABEL, REVIEW_COPY, EXAM_FORMAT_LABEL, EXAM_NOTES_LABEL, midtermLabel,
  type ExamSummary, type ExamTipView, type ReviewCardView, type ReviewSummary, type UnlockInfo,
} from '@core/lib/coursereviews';
import { codeSlug } from '@core/lib/classmates';
import { api } from '@core/api';
import { cn } from '@core/lib/cn';
import { Chip, ChipRow, cardCls } from '@/components/ha';

/** ★★★★☆ — 채운 별은 gold, 빈 별은 선 색 */
export function StarRow({ value, size = 16, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} strokeWidth={1.8} className={i <= Math.round(value) ? 'text-gold' : 'text-line'} fill="currentColor" />
      ))}
    </span>
  );
}

/** 별 고르기 (필수 항목) — 누른 만큼 gold */
export function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div role="radiogroup" aria-label="Overall rating" className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} star${i > 1 ? 's' : ''}`} onClick={() => onChange(i)} className="press p-0.5">
          <Star size={36} strokeWidth={1.6} className={i <= value ? 'text-gold' : 'text-line'} fill="currentColor" />
        </button>
      ))}
    </div>
  );
}

/** 4.33 — 소수 둘째 자리 */
export const fmtAvg = (n: number) => n.toFixed(2);

/** 요약 카드: 평균 ★ · 리뷰 수 · 추천 비율 · 난이도 · 주당 시간 분포 · 많이 나온 태그 */
export function SummaryCard({ s }: { s: ReviewSummary }) {
  const maxW = Math.max(1, ...WORKLOADS.map((w) => s.workload[w]));
  const anyW = WORKLOADS.some((w) => s.workload[w] > 0);
  return (
    <div className={cn(cardCls, 'p-4')}>
      <div className="flex items-end gap-3">
        <div className="text-[40px] font-extrabold leading-none tracking-[-0.03em]">{s.avg !== null ? fmtAvg(s.avg) : '—'}</div>
        <div className="pb-0.5">
          {s.avg !== null && <StarRow value={s.avg} size={17} />}
          <div className="text-[12.5px] text-ink-3 mt-1">{s.count === 1 ? '1 review' : `${s.count} reviews`}</div>
        </div>
      </div>
      {s.count > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-4">
          <Stat label="Recommend" value={s.recommendedPct !== null ? `${s.recommendedPct}%` : '—'} />
          <Stat label="Difficulty" value={s.difficulty !== null ? `${s.difficulty.toFixed(1)} / 5` : '—'} />
        </div>
      )}
      {anyW && (
        <div className="mt-4">
          <div className="text-[12.5px] text-ink-3 mb-2">Hours per week</div>
          <div className="space-y-1.5">
            {WORKLOADS.map((w) => (
              <div key={w} className="flex items-center gap-2.5 text-[12.5px]">
                <span className="w-[62px] shrink-0 text-ink-2">{WORKLOAD_LABEL[w]}</span>
                <span className="flex-1 h-2 rounded-full bg-surface-2 overflow-hidden"><span className="block h-full rounded-full bg-ink-3" style={{ width: `${(s.workload[w] / maxW) * 100}%` }} /></span>
                <span className="w-5 text-right text-ink-3">{s.workload[w]}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {s.topTags.length > 0 && (
        <ChipRow wrap className="mt-4">{s.topTags.map((t) => <Chip key={t.tag} size="sm">{TAG_LABEL[t.tag]}</Chip>)}</ChipRow>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-2.5">
      <div className="text-[12px] text-ink-3">{label}</div>
      <div className="text-[16px] font-bold mt-0.5">{value}</div>
    </div>
  );
}

/** "Fall 2026 student" — 같은 수업·학기 리뷰가 3개 미만이면 학기 없이 "Student". 이름은 없다 */
export const byline = (term: string | null, mine: boolean) => (mine ? 'You' : term ? `${term} student` : 'Student');

/** 리뷰 카드 — 이름 없음, 학기, 별, 글, 칩, 도움돼요(수), 신고 */
export function ReviewCard({ r, onHelpful, onReport, busy }: { r: ReviewCardView; onHelpful?: () => void; onReport?: () => void; busy?: boolean }) {
  const chips = [
    r.workload && `${WORKLOAD_LABEL[r.workload]} / week`,
    r.difficulty && `Difficulty ${r.difficulty}/5`,
    r.grading && GRADING_LABEL[r.grading],
    r.attendance && (r.attendance === 'taken' ? 'Attendance taken' : 'No attendance'),
    r.recorded !== undefined && (r.recorded ? 'Recorded lectures' : 'Not recorded'),
    ...r.tags.map((t) => TAG_LABEL[t]),
  ].filter(Boolean) as string[];
  return (
    <div className={cn(cardCls, 'p-4')}>
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-semibold text-ink-2 flex-1 min-w-0 truncate">{byline(r.term, r.mine)}{r.status === 'checking' && <span className="text-ink-3 font-medium"> · Being checked</span>}</span>
        <StarRow value={r.rating} size={14} />
      </div>
      <p className="text-[14.5px] text-ink mt-2 leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{r.text}</p>
      {r.instructor && <div className="text-[12.5px] text-ink-3 mt-2">Instructor · {r.instructor}</div>}
      {chips.length > 0 && <ChipRow wrap className="mt-3 gap-1.5">{chips.map((c) => <Chip key={c} size="sm">{c}</Chip>)}</ChipRow>}
      {(onHelpful || onReport) && (
        <div className="mt-3 flex items-center gap-3">
          <button type="button" disabled={!onHelpful || busy} onClick={onHelpful} aria-pressed={r.helpedByMe}
            className={cn('inline-flex items-center gap-1.5 h-8 px-3 rounded-full border text-[12.5px] font-semibold press disabled:opacity-60',
              r.helpedByMe ? 'bg-sel-soft border-sel-line text-sel-fg' : 'bg-surface border-line text-ink-2')}>
            <ThumbsUp size={14} />Helpful{r.helpful > 0 && <span>{r.helpful}</span>}
          </button>
          {onReport && <button type="button" onClick={onReport} className="ml-auto text-[12.5px] font-medium text-ink-3 press">Report</button>}
        </div>
      )}
    </div>
  );
}

/** 시험 정보 요약 — 중간고사 수 · 기말 · 형식 칩 · 노트 */
export function ExamSummaryCard({ s }: { s: ExamSummary }) {
  if (!s.count) return null;
  const notes = s.notes.open + s.notes.closed > 0 ? (s.notes.closed >= s.notes.open ? EXAM_NOTES_LABEL.closed : EXAM_NOTES_LABEL.open) : null;
  return (
    <div className={cn(cardCls, 'p-4')}>
      <div className="text-[12.5px] text-ink-3">{s.count === 1 ? 'From 1 student' : `From ${s.count} students`}</div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="rounded-2xl bg-surface-2 px-3 py-2.5"><div className="text-[12px] text-ink-3">Midterms</div><div className="text-[16px] font-bold mt-0.5">{s.midterms !== null ? midtermLabel(s.midterms) : '—'}</div></div>
        <div className="rounded-2xl bg-surface-2 px-3 py-2.5"><div className="text-[12px] text-ink-3">Final exam</div><div className="text-[16px] font-bold mt-0.5">{s.finalPct === null ? '—' : s.finalPct >= 50 ? `Yes · ${s.finalPct}%` : `No · ${100 - s.finalPct}%`}</div></div>
      </div>
      {(s.formats.length > 0 || notes) && (
        <ChipRow wrap className="mt-3 gap-1.5">
          {s.formats.map((f) => <Chip key={f.format} size="sm">{EXAM_FORMAT_LABEL[f.format]} · {f.count}</Chip>)}
          {notes && <Chip size="sm">{notes}</Chip>}
        </ChipRow>
      )}
    </div>
  );
}

export function ExamTipCard({ x, onReport }: { x: ExamTipView; onReport?: () => void }) {
  const chips = [midtermLabel(x.midterms), x.final ? 'Final' : 'No final', ...x.formats.map((f) => EXAM_FORMAT_LABEL[f]), x.notes && EXAM_NOTES_LABEL[x.notes]].filter(Boolean) as string[];
  return (
    <div className={cn(cardCls, 'p-4')}>
      <div className="text-[13px] font-semibold text-ink-2">{byline(x.term, x.mine)}{x.status === 'checking' && <span className="text-ink-3 font-medium"> · Being checked</span>}</div>
      {x.tip && <p className="text-[14.5px] text-ink mt-2 leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]">{x.tip}</p>}
      <ChipRow wrap className="mt-3 gap-1.5">{chips.map((c) => <Chip key={c} size="sm">{c}</Chip>)}</ChipRow>
      {onReport && <div className="mt-2 flex"><button type="button" onClick={onReport} className="ml-auto text-[12.5px] font-medium text-ink-3 press">Report</button></div>}
    </div>
  );
}

/** 잠금 카드 — "Write one review to unlock all reviews" + 지금 쓸 수 있는 내 수업, 없으면 언제부터인지 */
export function LockedCard({ unlock, onAsk }: { unlock: UnlockInfo; onAsk?: () => void }) {
  const nav = useNavigate();
  return (
    <div className={cn(cardCls, 'p-4')}>
      <div className="flex items-center gap-2 text-[15px] font-bold"><Lock size={16} className="shrink-0" />{REVIEW_COPY.lockedTitle}</div>
      {unlock.reviewable.length > 0 ? (
        <div className="mt-3 divide-y divide-line">
          {unlock.reviewable.map((c) => (
            <button key={`${c.slug}|${c.term}`} type="button" onClick={() => nav(writeLink(c.code, c.term))} className="w-full flex items-center gap-3 py-2.5 text-left press">
              <span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold truncate">{c.code}</span><span className="block text-[12px] text-ink-3 truncate">{c.term}</span></span>
              <span className="text-[13px] font-semibold text-sel-fg">Review</span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[13.5px] text-ink-2 mt-1.5">{unlock.message}{onAsk && <> Questions are open now.</>}</p>
      )}
      {onAsk && unlock.reviewable.length === 0 && <button type="button" onClick={onAsk} className="mt-2 text-[13px] font-semibold text-sel-fg press">Ask in Questions</button>}
    </div>
  );
}

export const writeLink = (code: string, term: string) => `/reviews/write?${new URLSearchParams({ code, term })}`;
export const examLink = (code: string, term: string) => `/reviews/exam?${new URLSearchParams({ code, term })}`;

// ─── 목록 줄 별점 (S029 Add classes · 수업 목록) ───────────────────────────────
const starCache = new Map<string, { avg: number; count: number } | null>();

/** 과목 코드들의 별점 — 리뷰 3개 이상인 수업만 돌아온다. 같은 코드는 한 번만 묻는다 */
export function useCourseStars(codes: string[]): Record<string, { avg: number; count: number }> {
  const key = [...new Set(codes.map(codeSlug))].sort().join(',');
  const [, bump] = useState(0);
  useEffect(() => {
    const want = key ? key.split(',').filter((s) => !starCache.has(s)) : [];
    if (!want.length) return;
    let live = true;
    api.courseReviews.stars(want).then(({ stars }) => {
      for (const s of want) starCache.set(s, stars[s] ?? null);
      if (live) bump((n) => n + 1);
    }).catch(() => { /* 별점이 없으면 아무것도 그리지 않는다 */ });
    return () => { live = false; };
  }, [key]);
  const out: Record<string, { avg: number; count: number }> = {};
  for (const s of key ? key.split(',') : []) { const v = starCache.get(s); if (v) out[s] = v; }
  return out;
}

/** "★ 4.33 (12)" — 리뷰 3개 이상일 때만. 없으면 아무것도 (자리 표시 별 없음) */
export function CourseStars({ stars, className }: { stars?: { avg: number; count: number } | null; className?: string }) {
  if (!stars || stars.count < 3) return null;
  return (
    <span className={cn('inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-2', className)} aria-label={`${fmtAvg(stars.avg)} stars from ${stars.count} reviews`}>
      <Star size={13} className="text-gold" fill="currentColor" strokeWidth={1.8} />{fmtAvg(stars.avg)}<span className="text-ink-3 font-medium">({stars.count})</span>
    </span>
  );
}
