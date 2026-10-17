import type { ReactNode } from 'react';
import { cn } from '@core/lib/cn';

interface ChipProps {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  color?: string;
  size?: 'sm' | 'md';
}

export function Chip({ active, onClick, children, className, color, size = 'md' }: ChipProps) {
  const style = color && active ? { backgroundColor: color, color: '#fff', borderColor: color } : color ? { color, borderColor: `${color}55`, backgroundColor: `${color}12` } : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap press',
        size === 'md' ? 'h-9 px-3.5 text-[13px]' : 'h-7 px-2.5 text-[12px]',
        active ? 'bg-primary text-white border-primary v2:bg-lime-900 v2:text-lime-400 v2:border-lime-800' : 'bg-surface-2 text-ink border-transparent v2:text-ink-2',
        !onClick && 'pointer-events-none',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function ChipRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex gap-2 overflow-x-auto hide-scrollbar px-4 py-2 -mx-4', className)}>{children}</div>;
}

export function Tag({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'primary' | 'mint' | 'gold' | 'danger' | 'accent' | 'heart'; className?: string }) {
  const tones = {
    neutral: 'bg-surface-2 text-ink-2',
    primary: 'bg-primary-soft text-primary v2:text-pink-300',
    mint: 'bg-mint-soft text-mint',
    gold: 'bg-gold-soft text-[#B57A0E]',
    danger: 'bg-danger-soft text-danger v2:bg-lime-400 v2:text-night', // D-day(마감 임박) 배지 — v2에서는 라임
    // classic 의 accent 는 연한 하늘색(#A3D5FF) — 같은 계열 바탕(#BFF4FF) 위 글자로는 안 보인다. 글자는 남색, v2 는 그대로 핑크
    accent: 'bg-accent-soft text-primary v2:text-accent',
    heart: 'bg-heart-soft text-heart',
  };
  return <span className={cn('inline-flex items-center gap-1 rounded-lg px-2 h-6 text-[12px] font-semibold', tones[tone], className)}>{children}</span>;
}
