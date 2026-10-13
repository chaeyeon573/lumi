import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@core/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'accent' | 'heart';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-white v2:text-on-primary hover:bg-primary-deep v2:font-bold',
  accent: 'bg-accent text-primary hover:brightness-95 v2:bg-surface-2 v2:text-ink v2:border v2:border-line',
  secondary: 'bg-accent text-primary hover:brightness-95 v2:bg-surface-2 v2:text-ink v2:border v2:border-line',
  outline: 'bg-surface border border-line text-ink hover:bg-surface-2',
  ghost: 'bg-transparent text-ink-2 hover:bg-surface-2',
  danger: 'bg-danger-soft text-danger hover:brightness-95',
  heart: 'bg-heart-soft text-heart hover:brightness-95',
};
const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px] rounded-full gap-1.5',
  md: 'h-11 px-5 text-[14px] rounded-full gap-2',
  lg: 'h-[52px] px-6 text-[15px] rounded-full gap-2',
};

export function Button({ variant = 'primary', size = 'md', full, loading, icon, className, children, disabled, ...rest }: Props) {
  return (
    <button
      className={cn('inline-flex items-center justify-center font-semibold press disabled:opacity-45 disabled:pointer-events-none whitespace-nowrap',
        variants[variant], sizes[size], full && 'w-full', className)}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : icon}
      {children}
    </button>
  );
}

export function IconButton({ className, children, badge, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { badge?: number }) {
  return (
    <button className={cn('relative h-10 w-10 rounded-full grid place-items-center text-ink press hover:bg-surface-2', className)} {...rest}>
      {children}
      {badge ? (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-bold grid place-items-center">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </button>
  );
}
