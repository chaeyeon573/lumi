import { t } from '@core/i18n';
import type { Career } from '@core/types';
import { Field, Input } from '@/components/ui';

/** 졸업 후 정보 입력 (도시·회사·업종·역할) — 온보딩 Stage·프로필 편집·설정 Alumni 전환 공용 */
export function CareerFields({ value, onChange }: { value: Career; onChange: (next: Career) => void }) {
  const set = (k: keyof Career, v: string) => onChange({ ...value, [k]: v || undefined });
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label={t('도시')}><Input placeholder={t('예: 서울')} value={value.city ?? ''} onChange={(e) => set('city', e.target.value)} /></Field>
      <Field label={t('회사')}><Input placeholder={t('예: 토스')} value={value.company ?? ''} onChange={(e) => set('company', e.target.value)} /></Field>
      <Field label={t('업종')}><Input placeholder={t('예: 핀테크')} value={value.industry ?? ''} onChange={(e) => set('industry', e.target.value)} /></Field>
      <Field label={t('역할')}><Input placeholder={t('예: PM')} value={value.role ?? ''} onChange={(e) => set('role', e.target.value)} /></Field>
    </div>
  );
}

/** "서울 · 토스 · 핀테크 · PM" 한 줄 */
export const careerLine = (c?: Career) => [c?.city, c?.company, c?.industry, c?.role].filter(Boolean).join(' · ');
