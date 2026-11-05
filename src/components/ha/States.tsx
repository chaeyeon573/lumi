import type { ReactNode } from 'react';
import { Info, Globe } from 'lucide-react';
import { lang } from '@core/i18n';
import { cn } from '@core/lib/cn';
import { TONE, type Tone } from './tones';
import { Btn } from './Controls';
import { cardCls } from './Cards';

const en = lang === 'en';

/** (i) 한 줄 각주 (PDF: "You can change this later.", "Followed is different from verified membership.") */
export function InfoNote({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn('flex items-start gap-2 text-[12.5px] text-ink-3 leading-snug', className)}>
      <Info size={15} className="shrink-0 mt-px" />
      <span>{children}</span>
    </p>
  );
}

/**
 * 카드 모양 빈 칸 (PDF S013: "Your campus starts here." + 두 버튼).
 * 섹션 안에서 내용 대신 들어간다 — 화면 전체가 빌 때는 EmptyState.
 */
export function EmptyCard({ title, sub, primary, secondary, className }: {
  title: string; sub?: string; primary?: { label: string; onClick: () => void }; secondary?: { label: string; onClick: () => void }; className?: string;
}) {
  return (
    <div className={cn(cardCls, 'p-4', className)}>
      <div className="text-[16px] font-bold leading-snug">{title}</div>
      {sub && <div className="text-[13.5px] text-ink-3 mt-1 leading-snug">{sub}</div>}
      {(primary || secondary) && (
        <div className="grid grid-cols-2 gap-2.5 mt-4">
          {primary && <Btn size="md" onClick={primary.onClick} className="px-3">{primary.label}</Btn>}
          {secondary && <Btn size="md" variant="outline" onClick={secondary.onClick} className="px-3">{secondary.label}</Btn>}
        </div>
      )}
    </div>
  );
}

/**
 * 화면(탭) 전체가 빌 때 (PDF S041~S044, S028, S095, S096): 동그란 아이콘, 제목, 한 줄, 작은 버튼, 그 밑에 덧붙일 것.
 */
export function EmptyState({ icon, tone = 'ice', title, sub, action, children, className }: {
  icon: ReactNode; tone?: Tone; title: string; sub?: string; action?: { label: string; onClick: () => void }; children?: ReactNode; className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center text-center px-6 pt-10 pb-6', className)}>
      <span className={cn('h-[72px] w-[72px] rounded-full grid place-items-center', TONE[tone])}>{icon}</span>
      <h2 className="text-[20px] font-extrabold tracking-[-0.02em] mt-5">{title}</h2>
      {sub && <p className="text-[14px] text-ink-2 mt-2 max-w-[300px] leading-snug">{sub}</p>}
      {action && <Btn size="md" className="mt-6" onClick={action.onClick}>{action.label}</Btn>}
      {children && <div className="mt-6 w-full">{children}</div>}
    </div>
  );
}

/** 불러오기 실패 (PDF S094 "Let's try that again") */
export function ErrorScreen({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <EmptyState icon={<Globe size={30} />} title={en ? 'Let’s try that again' : '다시 해 볼게요'}
      sub={message ?? (en ? 'We couldn’t load this screen. Your saved information is still there.' : '이 화면을 불러오지 못했어요. 저장한 정보는 그대로 있어요.')}
      action={onRetry ? { label: en ? 'Retry' : '다시 시도', onClick: onRetry } : undefined} />
  );
}

/** 불러오는 동안 — 같은 화면 모양을 유지하는 회색 칸 (PDF S094 각주: "Loading states keep the same screen structure") */
export function LoadingCards({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)} aria-busy>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn(cardCls, 'p-3 flex gap-3.5')}>
          <div className="skeleton h-[72px] w-[72px] !rounded-2xl" />
          <div className="flex-1 space-y-2 pt-1"><div className="skeleton h-4 w-1/3" /><div className="skeleton h-4 w-3/4" /><div className="skeleton h-3 w-1/2" /></div>
        </div>
      ))}
    </div>
  );
}
