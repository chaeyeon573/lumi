import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * shadcn/ui Sheet(아래에서 올라오는 시트) · Dialog — Radix Dialog 기반.
 * 앱은 430px 폭 모바일 프레임(#shell) 안에서만 보이므로 포털을 #shell 에 붙인다.
 */
const shell = () => (typeof document !== 'undefined' ? document.getElementById('shell') ?? document.body : undefined);

export const Sheet = DialogPrimitive.Root;
export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;

export function SheetContent({ className, children, title, closeLabel, tall, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { title?: React.ReactNode; closeLabel: string; tall?: boolean }) {
  return (
    <DialogPrimitive.Portal container={shell()}>
      <DialogPrimitive.Overlay className="absolute inset-0 z-[1100] bg-[rgba(var(--shadow-rgb),0.38)] animate-fade-in" />
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className={cn('absolute inset-x-0 bottom-0 z-[1101] flex flex-col bg-card rounded-t-[28px] shadow-[var(--shadow-sheet)] animate-sheet-up focus:outline-none', tall ? 'max-h-[92%]' : 'max-h-[80%]', className)}
        {...props}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-11 rounded-full bg-line" />
        {title !== undefined ? (
          <div className="flex items-center justify-between px-5 pt-3 pb-1">
            <DialogPrimitive.Title className="text-headline text-ink">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close className="h-8 w-8 grid place-items-center rounded-full text-ink-3 hover:bg-muted" aria-label={closeLabel}><X size={18} /></DialogPrimitive.Close>
          </div>
        ) : <DialogPrimitive.Title className="sr-only">{closeLabel}</DialogPrimitive.Title>}
        <div className="overflow-y-auto px-5 pb-6 pt-2 safe-bottom">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogContent({ className, children, title, description, ...props }: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { title: React.ReactNode; description?: React.ReactNode }) {
  return (
    <DialogPrimitive.Portal container={shell()}>
      <DialogPrimitive.Overlay className="absolute inset-0 z-[1100] bg-[rgba(var(--shadow-rgb),0.38)] animate-fade-in" />
      <div className="absolute inset-0 z-[1101] grid place-items-center p-6 pointer-events-none">
        <DialogPrimitive.Content aria-describedby={description ? undefined : undefined} className={cn('pointer-events-auto w-full max-w-[320px] bg-card rounded-[20px] p-5 shadow-[var(--shadow-float)] animate-fade-in focus:outline-none', className)} {...props}>
          <DialogPrimitive.Title className="text-headline text-ink">{title}</DialogPrimitive.Title>
          {description && <DialogPrimitive.Description className="mt-1.5 text-[13px] text-ink-2 leading-relaxed">{description}</DialogPrimitive.Description>}
          {children}
        </DialogPrimitive.Content>
      </div>
    </DialogPrimitive.Portal>
  );
}
export const DialogRoot = DialogPrimitive.Root;
