import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from './shadcn/badge';

interface ChipProps {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  className?: string;
  color?: string;
  size?: 'sm' | 'md';
}

/**
 * 선택 칩 — 기본은 흰 면 + 선, 선택되면 옅은 하늘 면 + 파랑 글자 + 파랑 선 (채워진 파랑은 버튼에만).
 */
export function Chip({ active, onClick, children, className, color, size = 'md' }: ChipProps) {
  const style = color && active ? { backgroundColor: color, color: '#fff', borderColor: color } : color ? { color, borderColor: `color-mix(in srgb, ${color} 35%, transparent)`, backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)` } : undefined;
  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      aria-pressed={onClick ? !!active : undefined}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium whitespace-nowrap transition-colors active:scale-[0.98]',
        size === 'md' ? 'h-9 px-3.5 text-[13px]' : 'h-7 px-2.5 text-[12px]',
        active ? 'bg-secondary text-primary border-primary/40 font-semibold' : 'bg-card text-ink-2 border-border hover:bg-muted',
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

/** 태그 — shadcn/ui Badge */
export function Tag({ children, tone = 'neutral', className }: { children: ReactNode; tone?: 'neutral' | 'primary' | 'mint' | 'gold' | 'danger' | 'accent' | 'heart'; className?: string }) {
  const map = { neutral: 'neutral', primary: 'default', accent: 'default', heart: 'default', mint: 'success', gold: 'warning', danger: 'destructive' } as const;
  return <Badge variant={map[tone]} className={className}>{children}</Badge>;
}
