import type { ReactNode } from 'react';
import { RotateCw, Lock } from 'lucide-react';
import { t } from '@core/i18n';
import { Skeleton } from './States';
import { cn } from '@core/lib/cn';

/** 섹션 스켈레톤 — 카드 n개 (가로 스트립이면 horizontal) */
export function SectionSkeleton({ count = 2, horizontal, className }: { count?: number; horizontal?: boolean; className?: string }) {
  return (
    <div className={cn(horizontal ? 'flex gap-3 overflow-hidden' : 'space-y-2.5', className)} aria-busy="true" aria-label={t('불러오는 중')}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn('rounded-[20px] border border-line bg-white p-3 flex gap-3', horizontal && 'w-[260px] shrink-0')}>
          <Skeleton className="h-12 w-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2 py-1"><Skeleton className="h-3.5 w-2/3" /><Skeleton className="h-3 w-1/2" /><Skeleton className="h-5 w-3/4 rounded-full" /></div>
        </div>
      ))}
    </div>
  );
}

/** 부분 오류 — 이 섹션만 실패했을 때. 나머지 화면은 그대로 쓴다 */
export function SectionError({ onRetry, message, className }: { onRetry: () => void; message?: string; className?: string }) {
  return (
    <div className={cn('rounded-[20px] border border-dashed border-line bg-surface-2/60 px-4 py-3 flex items-center gap-3', className)} role="alert">
      <span className="flex-1 text-[13px] text-ink-2">{message ?? t('이 부분을 불러오지 못했어요.')}</span>
      <button type="button" onClick={onRetry} className="h-8 px-3 rounded-full bg-white border border-line text-[12px] font-semibold text-primary flex items-center gap-1 press"><RotateCw size={13} />{t('다시 시도')}</button>
    </div>
  );
}

/** 빈 섹션 — 단순한 빈 화면 대신 다음 행동 하나 */
export function SectionEmpty({ title, description, action, emoji = '🌱', className }: { title: string; description?: string; action?: ReactNode; emoji?: string; className?: string }) {
  return (
    <div className={cn('rounded-[20px] bg-surface-2/60 px-4 py-4 text-center', className)}>
      <div className="text-[22px]">{emoji}</div>
      <div className="mt-1 text-[14px] font-semibold">{title}</div>
      {description && <div className="mt-0.5 text-[12px] text-ink-3">{description}</div>}
      {action && <div className="mt-2.5 flex justify-center">{action}</div>}
    </div>
  );
}

/** 섹션 한 줄 래퍼 — loading/error/empty/content 를 순서대로 */
export function Section({ loading, error, onRetry, empty, skeleton, children }: { loading: boolean; error: string | null; onRetry: () => void; empty?: ReactNode | false; skeleton?: ReactNode; children: ReactNode }) {
  if (loading) return <>{skeleton ?? <SectionSkeleton />}</>;
  if (error) return <SectionError onRetry={onRetry} />;
  if (empty) return <>{empty}</>;
  return <>{children}</>;
}

/** 비공개 안내 — 공개 범위 때문에 가려진 정보 */
export function PrivacyNote({ text, className }: { text: string; className?: string }) {
  return <div className={cn('flex items-center gap-1.5 text-[11px] text-ink-3', className)}><Lock size={11} />{text}</div>;
}
