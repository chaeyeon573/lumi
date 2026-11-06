import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { NavLink } from 'react-router-dom';
import { Search } from 'lucide-react';
import { cn } from '@core/lib/cn';

/* ─────────────────────────── Buttons ─────────────────────────── */

type BtnVariant = 'primary' | 'outline' | 'link' | 'danger';
type BtnSize = 'lg' | 'md' | 'sm';

/**
 * 버튼 — PDF 의 남색 큰 버튼 = primary(라임 + 검은 글자), 흰 테두리 알약 = outline, 파란 글자 = link(핑크).
 * 한 화면에 primary 는 하나만 (아래 CTA 줄 또는 빈 상태의 버튼).
 */
export function Btn({ variant = 'primary', size = 'md', full, loading, icon, className, children, disabled, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BtnVariant; size?: BtnSize; full?: boolean; loading?: boolean; icon?: ReactNode;
}) {
  const v: Record<BtnVariant, string> = {
    primary: 'bg-primary text-on-primary font-bold',
    outline: 'bg-surface border border-line text-ink font-semibold',
    link: 'bg-transparent text-sel-fg font-semibold !px-1',
    danger: 'bg-danger-soft text-danger font-semibold',
  };
  const s: Record<BtnSize, string> = { lg: 'h-[52px] px-6 text-[16px]', md: 'h-11 px-5 text-[15px]', sm: 'h-9 px-4 text-[13px]' };
  return (
    <button className={cn('inline-flex items-center justify-center gap-2 rounded-full whitespace-nowrap press disabled:opacity-40 disabled:pointer-events-none', v[variant], s[size], full && 'w-full', className)}
      disabled={disabled || loading} {...rest}>
      {loading ? <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : icon}
      {children}
    </button>
  );
}

/** 둥근 아이콘 버튼 (PDF S020 아래 줄의 책갈피) */
export function RoundIconBtn({ label, active, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return (
    <button aria-label={label} aria-pressed={active} className={cn('h-[52px] w-[52px] shrink-0 rounded-full border border-line bg-surface grid place-items-center press', active ? 'text-sel-fg' : 'text-ink', className)} {...rest}>{children}</button>
  );
}

/**
 * 아래 고정 CTA 줄 (PDF: Continue · Going · Create Meetup …).
 * 화면 맨 아래에 붙어 스크롤과 함께 움직이지 않는다. leading 에는 책갈피 같은 둥근 버튼.
 * data-bottom-cta: 이 줄이 있는 화면에서는 토스트가 위로 간다 (Toast.tsx).
 */
export function BottomCTA({ children, leading, note }: { children: ReactNode; leading?: ReactNode; note?: ReactNode }) {
  return (
    <div data-bottom-cta className="sticky bottom-0 z-20 mt-auto bg-bg/95 backdrop-blur border-t border-line px-4 pt-3 pb-4 safe-bottom">
      {note && <div className="mb-2">{note}</div>}
      <div className="flex items-center gap-3">{leading}<div className="flex-1 min-w-0">{children}</div></div>
    </div>
  );
}

/* ─────────────────────────── Chips ─────────────────────────── */

/** 필터·선택 칩 (PDF: Recommended / Newest / Ending soon, Coffee / Study …). 고른 것 = 핑크 틴트 + 핑크 테두리 */
export function Chip({ active, onClick, children, className, size = 'md', icon }: { active?: boolean; onClick?: () => void; children: ReactNode; className?: string; size?: 'md' | 'sm'; icon?: ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={onClick ? !!active : undefined}
      className={cn('inline-flex items-center gap-1.5 rounded-full border whitespace-nowrap font-semibold press shrink-0',
        size === 'md' ? 'h-9 px-4 text-[13px]' : 'h-8 px-3 text-[12px]',
        active ? 'bg-sel-soft border-sel-line text-sel-fg' : 'bg-surface border-line text-ink',
        !onClick && 'pointer-events-none', className)}>
      {icon}{children}
    </button>
  );
}

/** 칩 한 줄 — 넘치면 옆으로 민다 (wrap 이면 여러 줄) */
export function ChipRow({ children, wrap, className }: { children: ReactNode; wrap?: boolean; className?: string }) {
  return <div className={cn('flex gap-2', wrap ? 'flex-wrap' : 'overflow-x-auto hide-scrollbar -mx-4 px-4', className)}>{children}</div>;
}

/** 하나만 고르는 칩 묶음 */
export function ChoiceChips<T extends string>({ value, onChange, options, wrap = true, className }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; wrap?: boolean; className?: string }) {
  return <ChipRow wrap={wrap} className={className}>{options.map((o) => <Chip key={o.value} active={value === o.value} onClick={() => onChange(o.value)}>{o.label}</Chip>)}</ChipRow>;
}

/* ─────────────────────────── Underline tabs ─────────────────────────── */

export interface SegTab { key: string; label: string; to?: string; count?: number }

/**
 * 밑줄 탭 (PDF: Explore = Events | Opportunities | Clubs, Social = For You | Meetups | People | Feed, 상세의 Details | Q&A).
 * to 가 있으면 링크(주소가 탭을 정한다, replace), 없으면 value/onChange.
 */
export function SegTabs({ tabs, value, onChange, className }: { tabs: SegTab[]; value?: string; onChange?: (key: string) => void; className?: string }) {
  const cls = (on: boolean) => cn('relative flex-1 h-11 grid place-items-center text-[14px] font-semibold transition-colors', on ? 'text-sel-fg' : 'text-ink-3');
  const bar = <span className="absolute left-2 right-2 bottom-0 h-[2px] rounded-full bg-sel" />;
  const label = (t: SegTab) => <span>{t.label}{t.count != null && <span className="ml-1 opacity-80">{t.count}</span>}</span>;
  return (
    <div role="tablist" className={cn('flex border-b border-line', className)}>
      {tabs.map((t) => t.to
        ? <NavLink key={t.key} to={t.to} replace role="tab" end className={({ isActive }) => cls(value ? value === t.key : isActive)}>
            {({ isActive }) => <>{label(t)}{(value ? value === t.key : isActive) && bar}</>}
          </NavLink>
        : <button key={t.key} type="button" role="tab" aria-selected={value === t.key} onClick={() => onChange?.(t.key)} className={cls(value === t.key)}>{label(t)}{value === t.key && bar}</button>)}
    </div>
  );
}

/* ─────────────────────────── Inputs ─────────────────────────── */

const fieldBase = 'w-full bg-surface border border-line rounded-2xl text-[15px] text-ink placeholder:text-ink-3 focus:outline-none focus:border-sel-line transition';

/** 검색 칸 (PDF: "Search events"). onOpen 을 주면 입력 대신 눌러서 검색 화면으로 가는 버튼이 된다 */
export function SearchField({ placeholder, value, onChange, onOpen, className, autoFocus }: { placeholder: string; value?: string; onChange?: (v: string) => void; onOpen?: () => void; className?: string; autoFocus?: boolean }) {
  if (onOpen) return (
    <button type="button" onClick={onOpen} className={cn(fieldBase, 'h-12 px-4 flex items-center gap-2.5 text-left text-ink-3 press', className)}><Search size={19} />{placeholder}</button>
  );
  return (
    <label className={cn(fieldBase, 'h-12 px-4 flex items-center gap-2.5 focus-within:border-sel-line', className)}>
      <Search size={19} className="text-ink-3 shrink-0" />
      <input type="search" value={value} onChange={(e) => onChange?.(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-ink-3" />
    </label>
  );
}

/** 칸 이름 + 칸 (PDF: "School email" 위 작은 굵은 글씨) */
export function FormField({ label, hint, children, className }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="text-[13px] font-semibold text-ink mb-2">{label}</div>
      {children}
      {hint && <div className="mt-1.5 text-[12px] text-ink-3">{hint}</div>}
    </div>
  );
}

/** 입력 칸 — 왼쪽 아이콘 선택 (메일·자물쇠·시계·핀) */
export function TextInput({ icon, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { icon?: ReactNode }) {
  return (
    <label className={cn(fieldBase, 'h-12 px-4 flex items-center gap-2.5 focus-within:border-sel-line', className)}>
      {icon && <span className="text-ink-3 shrink-0">{icon}</span>}
      <input className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-ink-3" {...rest} />
    </label>
  );
}

export function TextArea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(fieldBase, 'px-4 py-3 min-h-[96px] resize-none leading-relaxed', className)} {...rest} />;
}

/** 고르기 칸 (PDF: "Group type · School community") — 누르면 시트·목록을 연다 */
export function SelectField({ icon, value, placeholder, onClick, className }: { icon?: ReactNode; value?: string; placeholder: string; onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} className={cn(fieldBase, 'h-12 px-4 flex items-center gap-2.5 text-left press', className)}>
      {icon && <span className="text-ink-3 shrink-0">{icon}</span>}
      <span className={cn('flex-1 min-w-0 truncate', !value && 'text-ink-3')}>{value || placeholder}</span>
    </button>
  );
}

/** 켜고 끄기 스위치 */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={cn('relative h-7 w-12 rounded-full transition shrink-0', checked ? 'bg-sel' : 'bg-line')}>
      <span className={cn('absolute top-1 h-5 w-5 rounded-full bg-white transition-all', checked ? 'left-6' : 'left-1')} />
    </button>
  );
}
