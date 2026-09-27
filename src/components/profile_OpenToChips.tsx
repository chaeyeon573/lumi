import { t } from '@core/i18n';
import type { OpenTo, Purpose } from '@core/types';
import { Chip } from '@/components/ui';
import { cn } from '@core/lib/cn';

/** PRD "Open To" — 지금 열려 있는 것 */
export const ALL_OPEN_TO: OpenTo[] = ['coffee', 'activities', 'research', 'networking', 'mentoring', 'cofounding'];
export const OPEN_TO_EMOJI: Record<OpenTo, string> = { coffee: '☕', activities: '🎯', research: '🔬', networking: '🤝', mentoring: '🧭', cofounding: '🚀' };
export const openToLabel = (k: OpenTo): string =>
  ({ coffee: t('커피'), activities: t('활동'), research: t('연구 협업'), networking: t('새로운 사람'), mentoring: t('멘토링'), cofounding: t('공동창업') })[k];

/** Open To → 기존 purposes 로직 호환용 매핑 (coffee/activities→friend, research→study, networking/mentoring/cofounding→networking) */
export function purposesFromOpenTo(openTo: OpenTo[]): Purpose[] {
  const out = new Set<Purpose>();
  openTo.forEach((o) => out.add(o === 'coffee' || o === 'activities' ? 'friend' : o === 'research' ? 'study' : 'networking'));
  return out.size ? [...out] : ['any'];
}

/** 읽기 전용 Open To 알약 */
export function OpenToPills({ value, className }: { value: OpenTo[]; className?: string }) {
  if (!value.length) return null;
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {value.map((o) => <span key={o} className="h-7 px-3 rounded-full bg-primary-soft text-primary text-[12px] font-semibold flex items-center gap-1">{OPEN_TO_EMOJI[o]} {openToLabel(o)}</span>)}
    </div>
  );
}

/** 다중 선택 Open To 칩 — 온보딩(big)·프로필 편집(md) */
export function OpenToChips({ value, onChange, big }: { value: OpenTo[]; onChange: (next: OpenTo[]) => void; big?: boolean }) {
  const toggle = (o: OpenTo) => onChange(value.includes(o) ? value.filter((x) => x !== o) : [...value, o]);
  if (big) {
    return (
      <div className="grid grid-cols-2 gap-2.5">
        {ALL_OPEN_TO.map((o) => {
          const active = value.includes(o);
          return (
            <button key={o} type="button" onClick={() => toggle(o)} aria-pressed={active}
              className={cn('h-[76px] rounded-[22px] border px-4 flex items-center gap-3 text-left press transition', active ? 'bg-primary text-white border-primary' : 'bg-white border-line text-ink')}>
              <span className="text-2xl">{OPEN_TO_EMOJI[o]}</span>
              <span className="text-[15px] font-bold leading-tight">{openToLabel(o)}</span>
            </button>
          );
        })}
      </div>
    );
  }
  return <div className="flex flex-wrap gap-2">{ALL_OPEN_TO.map((o) => <Chip key={o} active={value.includes(o)} onClick={() => toggle(o)}>{OPEN_TO_EMOJI[o]} {openToLabel(o)}</Chip>)}</div>;
}
