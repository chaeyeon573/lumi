import * as React from 'react';
import { cn } from '@/lib/utils';

/** shadcn/ui Input · Textarea — 반경 14, 흰 면, 1px 선, 포커스는 파랑 선 */
export const inputBase = 'w-full bg-card border border-input rounded-[14px] px-3.5 text-[15px] text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/15 disabled:opacity-50';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(inputBase, 'h-11', className)} {...props} />
));
Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(inputBase, 'py-2.5 min-h-[88px] resize-none leading-relaxed', className)} {...props} />
));
Textarea.displayName = 'Textarea';
