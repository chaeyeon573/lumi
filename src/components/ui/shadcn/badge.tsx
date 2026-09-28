import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

/** shadcn/ui Badge — 태그·상태 표시. 알약 모양, 옅은 면 + 진한 글자 */
export const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 h-6 text-[12px] font-semibold whitespace-nowrap', {
  variants: {
    variant: {
      default: 'bg-secondary text-secondary-foreground',
      neutral: 'bg-muted text-ink-2',
      outline: 'border border-border text-ink-2',
      success: 'bg-mint-soft text-mint',
      warning: 'bg-gold-soft text-gold',
      destructive: 'bg-danger-soft text-destructive',
      solid: 'bg-primary text-primary-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
