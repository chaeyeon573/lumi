import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button as ShadButton } from './shadcn/button';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'accent' | 'heart';
type Size = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

/** 앱 공용 버튼 — shadcn/ui Button 위의 얇은 래퍼 (기존 variant 이름 유지) */
const VARIANT = { primary: 'default', secondary: 'secondary', accent: 'secondary', heart: 'secondary', outline: 'outline', ghost: 'ghost', danger: 'destructive' } as const;
const SIZE = { sm: 'sm', md: 'default', lg: 'lg' } as const;

export function Button({ variant = 'primary', size = 'md', full, loading, icon, className, children, disabled, ...rest }: Props) {
  return (
    <ShadButton variant={VARIANT[variant]} size={SIZE[size]} className={cn(full && 'w-full', className)} disabled={disabled || loading} {...rest}>
      {loading ? <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : icon}
      {children}
    </ShadButton>
  );
}

export function IconButton({ className, children, badge, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { badge?: number }) {
  return (
    <ShadButton variant="ghost" size="icon" className={cn('relative text-ink', className)} {...rest}>
      {children}
      {badge ? (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </ShadButton>
  );
}
