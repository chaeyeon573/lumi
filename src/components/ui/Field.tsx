import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@core/lib/cn';

export function Field({ label, hint, children, right, required }: { label: string; hint?: string; children: ReactNode; right?: ReactNode; required?: boolean }) {
  return (
    <div className="block">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-semibold text-ink-2">{label}{required && <span className="text-accent ml-0.5">*</span>}</span>
        {right}
      </div>
      {children}
      {hint && <p className="mt-1 text-[12px] text-ink-3">{hint}</p>}
    </div>
  );
}

const base = 'w-full bg-surface border border-[#B1E5FF] v2:border-line rounded-2xl px-3.5 text-[14px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-primary focus:bg-surface transition';

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, 'h-11', className)} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, 'py-2.5 min-h-[88px] resize-none leading-relaxed', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(base, 'h-11 appearance-none pr-9', className)} {...rest}>{children}</select>
      <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="w-full flex items-center justify-between gap-3 py-3 text-left">
      <div>
        <div className="text-[14px] font-medium">{label}</div>
        {description && <div className="text-[12px] text-ink-3 mt-0.5">{description}</div>}
      </div>
      <span className={cn('relative h-7 w-12 rounded-full transition shrink-0', checked ? 'bg-primary' : 'bg-line')}>
        <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow transition', checked ? 'left-6' : 'left-1')} />
      </span>
    </button>
  );
}

export function Segmented<T extends string>({ value, onChange, options, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; className?: string }) {
  return (
    <div className={cn('flex bg-surface-2 rounded-full p-1 gap-1', className)}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)}
          className={cn('flex-1 h-9 rounded-full text-[13px] font-semibold transition', value === o.value ? 'bg-primary text-white v2:bg-lime-900 v2:text-lime-400' : 'text-ink-2')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
