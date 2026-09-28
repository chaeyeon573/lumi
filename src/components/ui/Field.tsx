import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input as ShadInput, Textarea as ShadTextarea, inputBase } from './shadcn/input';
import { Switch } from './shadcn/switch';
import { Tabs, TabsList, TabsTrigger } from './shadcn/tabs';

export function Field({ label, hint, children, right, required }: { label: string; hint?: string; children: ReactNode; right?: ReactNode; required?: boolean }) {
  return (
    <div className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-semibold text-ink-2">{label}{required && <span className="text-primary ml-0.5">*</span>}</span>
        {right}
      </div>
      {children}
      {hint && <p className="mt-1 text-[12px] text-ink-3">{hint}</p>}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <ShadInput {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <ShadTextarea {...props} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(inputBase, 'h-11 appearance-none pr-9', className)} {...rest}>{children}</select>
      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
    </div>
  );
}

/** 켜고 끄기 한 줄 — 라벨 + 설명 + shadcn/ui Switch (줄 전체를 눌러도 바뀐다) */
export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div role="button" tabIndex={-1} onClick={() => onChange(!checked)} className="w-full flex items-center justify-between gap-3 py-3 text-left cursor-pointer">
      <div>
        <div className="text-[14px] font-medium text-ink">{label}</div>
        {description && <div className="text-[12px] text-ink-3 mt-0.5">{description}</div>}
      </div>
      <Switch checked={checked} aria-label={label} onClick={(e) => e.stopPropagation()} onCheckedChange={(v) => onChange(v)} />
    </div>
  );
}

/** 구간 선택 — shadcn/ui Tabs (옅은 레일 + 흰 알약) */
export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as T)}>
      <TabsList className={className}>
        {options.map((o) => <TabsTrigger key={o.value} value={o.value}>{o.label}</TabsTrigger>)}
      </TabsList>
    </Tabs>
  );
}
