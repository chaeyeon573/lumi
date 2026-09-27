import { Globe, School, Users, UserCheck, Lock, Building2, ChevronRight, Heart, UsersRound } from 'lucide-react';
import { t } from '@core/i18n';
import type { Visibility } from '@core/types';
import { VISIBILITY_LABELS, VISIBILITY_ORDER } from '@core/lib/labels';
import { visibilityDescription } from '@core/lib/relations';
import { cn } from '@core/lib/cn';
import { useState } from 'react';
import { BottomSheet } from './Sheet';

export const VISIBILITY_ICONS: Record<Visibility, typeof Globe> = {
  public: Globe, school: School, department: Building2, friends: Users, followers: Heart, selected: UserCheck, private: Lock, group: UsersRound,
};

interface Props {
  value: Visibility;
  onChange: (v: Visibility) => void;
  options?: Visibility[];
  compact?: boolean;
  label?: string;
}

/** 공개 범위 선택 — compact 모드는 한 줄 버튼, 기본은 라디오 리스트 */
export function VisibilityPicker({ value, onChange, options = VISIBILITY_ORDER, compact, label = t('공개 범위') }: Props) {
  const [open, setOpen] = useState(false);
  const Icon = VISIBILITY_ICONS[value];
  if (compact) {
    return (
      <>
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 h-7 px-2 rounded-lg bg-surface-2 text-[12px] font-semibold text-ink-2 press">
          <Icon size={13} /> {VISIBILITY_LABELS[value]} <ChevronRight size={12} className="text-ink-3" />
        </button>
        <BottomSheet open={open} onClose={() => setOpen(false)} title={label}>
          <VisibilityList value={value} options={options} onChange={(v) => { onChange(v); setOpen(false); }} />
        </BottomSheet>
      </>
    );
  }
  return <VisibilityList value={value} options={options} onChange={onChange} />;
}

export function VisibilityList({ value, options, onChange }: { value: Visibility; options: Visibility[]; onChange: (v: Visibility) => void }) {
  return (
    <div className="space-y-1.5">
      {options.map((v) => {
        const I = VISIBILITY_ICONS[v];
        const active = v === value;
        return (
          <button key={v} type="button" onClick={() => onChange(v)}
            className={cn('w-full flex items-center gap-3 rounded-xl px-3.5 py-3 border text-left transition', active ? 'border-primary bg-primary-soft' : 'border-line bg-surface')}>
            <span className={cn('h-9 w-9 rounded-xl grid place-items-center', active ? 'bg-primary text-white' : 'bg-surface-2 text-ink-2')}><I size={17} /></span>
            <span className="flex-1">
              <span className="block text-[14px] font-semibold">{VISIBILITY_LABELS[v]}</span>
              <span className="block text-[12px] text-ink-3">{visibilityDescription(v)}</span>
            </span>
            <span className={cn('h-5 w-5 rounded-full border-2 grid place-items-center', active ? 'border-primary' : 'border-line')}>{active && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}</span>
          </button>
        );
      })}
    </div>
  );
}

export function VisibilityTag({ value, className }: { value: Visibility; className?: string }) {
  const Icon = VISIBILITY_ICONS[value];
  return <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold text-ink-3', className)}><Icon size={12} />{VISIBILITY_LABELS[value]}</span>;
}
