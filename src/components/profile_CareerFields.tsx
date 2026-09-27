import { t } from '@core/i18n';
import type { Career } from '@core/types';
import { Chip, Field, Input } from '@/components/ui';
import { localeContext } from '@core/lib/locale-context';

/**
 * 칩 + 자유 입력 — 도시·업종·직무·전공처럼 "흔한 값은 탭 한 번, 아니면 직접 쓰기".
 * 선택된 칩을 다시 누르면 비운다. 자유 입력이 칩과 같으면 그 칩이 켜진다.
 */
export function ChipsWithText({ options, value, onChange, placeholder, hint, label, right }: {
  options: string[]; value: string; onChange: (next: string) => void; placeholder?: string; hint?: string; label?: string; right?: React.ReactNode;
}) {
  const body = (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => <Chip key={o} size="sm" active={value.trim().toLowerCase() === o.toLowerCase()} onClick={() => onChange(value.trim().toLowerCase() === o.toLowerCase() ? '' : o)}>{o}</Chip>)}
      </div>
      <Input placeholder={placeholder ?? t('직접 입력')} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
  return label ? <Field label={label} hint={hint} right={right}>{body}</Field> : body;
}

/** 거주 도시 · 활동 지역 (선택) — 도시·생활권 단위. 정확한 주소는 받지 않는다 */
export function CityFields({ homeCity, activityCity, onChange, homeLabel, activityLabel }: {
  homeCity: string; activityCity: string; onChange: (next: { homeCity: string; activityCity: string }) => void; homeLabel?: string; activityLabel?: string;
}) {
  const ctx = localeContext();
  return (
    <div className="space-y-4">
      <ChipsWithText label={homeLabel ?? t('거주 도시')} hint={t('정확한 주소는 받지 않아요')} options={ctx.cities} value={homeCity} placeholder={t('도시 이름')} onChange={(v) => onChange({ homeCity: v, activityCity })} />
      <ChipsWithText label={activityLabel ?? t('활동 지역 (선택)')} hint={t('거주지와 다를 수 있어요 — 예: 거주 성남 · 활동 서울')} options={ctx.cities} value={activityCity} placeholder={t('주로 활동하는 도시')} onChange={(v) => onChange({ homeCity, activityCity: v })} />
    </div>
  );
}

/** 졸업 후 정보 입력 — 회사(자유) · 업종(칩+자유) · 직무(칩+자유). `city` 는 거주 도시(homeCity)로 옮겨져 기본 숨김 */
export function CareerFields({ value, onChange, withCity }: { value: Career; onChange: (next: Career) => void; withCity?: boolean }) {
  const ctx = localeContext();
  const set = (k: keyof Career, v: string) => onChange({ ...value, [k]: v.trim() ? v : undefined });
  return (
    <div className="space-y-4">
      {withCity && <ChipsWithText label={t('도시')} options={ctx.cities} value={value.city ?? ''} placeholder={t('예: 서울')} onChange={(v) => set('city', v)} />}
      <Field label={t('회사 (선택)')}><Input placeholder={t('예: 토스')} value={value.company ?? ''} onChange={(e) => set('company', e.target.value)} /></Field>
      <ChipsWithText label={t('업종')} options={ctx.industries} value={value.industry ?? ''} placeholder={t('예: 핀테크')} onChange={(v) => set('industry', v)} />
      <ChipsWithText label={t('직무')} options={ctx.roles} value={value.role ?? ''} placeholder={t('예: PM')} onChange={(v) => set('role', v)} />
    </div>
  );
}

/** "서울 · 토스 · 핀테크 · PM" 한 줄 */
export const careerLine = (c?: Career) => [c?.city, c?.company, c?.industry, c?.role].filter(Boolean).join(' · ');
