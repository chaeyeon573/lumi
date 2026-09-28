import { CheckCircle2 } from 'lucide-react';
import { t } from '@core/i18n';
import type { Reason } from '@core/lib/recommend';
import { reasonChip } from '@core/lib/recommend';
import { cn } from '@core/lib/cn';

/**
 * "왜 이 사람이 추천되었는지" — 카드 상단의 짧은 이유 칩 (같은 학교 · 같은 전공 · 같은 지역 …).
 * 사진보다 연결 맥락이 먼저 보이도록 항상 사진 위/이름 옆에 둔다.
 */
export function ReasonChips({ reasons, max = 3, className, tone = 'light' }: { reasons: Reason[]; max?: number; className?: string; tone?: 'light' | 'solid' }) {
  const chips = [...new Set(reasons.slice(0, max).map(reasonChip))];
  if (!chips.length) return null;
  return (
    <div className={cn('flex flex-wrap gap-1', className)} aria-label={t('추천 이유')}>
      {chips.map((c) => (
        <span key={c} className={cn('h-6 px-2 rounded-full text-[11px] font-bold inline-flex items-center gap-1', tone === 'solid' ? 'bg-primary text-white' : 'bg-accent-soft text-ink-2')}>
          <CheckCircle2 size={11} className={tone === 'solid' ? '' : 'text-primary'} />{c}
        </span>
      ))}
    </div>
  );
}

/** 이유 전체 목록 — "우리의 공통점" / "왜 추천되었나요" 박스 */
export function ReasonList({ reasons, title, max = 4, className }: { reasons: Reason[]; title?: string; max?: number; className?: string }) {
  if (!reasons.length) return null;
  return (
    <div className={cn('rounded-2xl bg-primary-soft/60 p-3', className)}>
      {title && <div className="text-[11px] font-bold text-ink-3">{title}</div>}
      <ul className={cn('space-y-1', title && 'mt-1')}>
        {reasons.slice(0, max).map((r) => (
          <li key={r.text} className="text-[13px] text-ink-2 flex items-start gap-1.5"><CheckCircle2 size={14} className="text-primary shrink-0 mt-0.5" /><span>{r.text}</span></li>
        ))}
      </ul>
    </div>
  );
}
