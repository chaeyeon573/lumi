import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

/** shadcn/ui Tabs — 옅은 회청 레일 위에 흰 알약이 선택을 표시한다 (채워진 파랑을 아낀다) */
export const Tabs = TabsPrimitive.Root;

export const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(({ className, ...props }, ref) => (
  <TabsPrimitive.List ref={ref} className={cn('flex items-center rounded-full bg-muted p-1 gap-1', className)} {...props} />
));
TabsList.displayName = TabsPrimitive.List.displayName;

export const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'flex-1 inline-flex items-center justify-center h-9 px-3 rounded-full text-[13px] font-semibold text-ink-3 transition-all whitespace-nowrap',
      'data-[state=active]:bg-card data-[state=active]:text-ink data-[state=active]:shadow-[0_1px_3px_rgba(var(--shadow-rgb),0.12)]',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40',
      className,
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

export const TabsContent = TabsPrimitive.Content;
