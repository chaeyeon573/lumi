import { useState } from 'react';
import { Lock } from 'lucide-react';
import { t, lang } from '@core/i18n';
import type { Research } from '@core/types';
import { Chip, Field, Input, Toggle } from '@/components/ui';

const FIELDS = { ko: ['NLP', 'AI', '컴퓨터비전', '로봇', '바이오', '경제', 'HCI', '재료'], en: ['NLP', 'AI', 'Computer Vision', 'Robotics', 'Bioinformatics', 'Economics', 'HCI', 'Materials'] };

/**
 * 대학원생 연구 정보 입력 — 분야(필수) · 연구실 · N년차 · 세부 주제 · 지도교수(기본 비공개).
 * 온보딩과 프로필 편집이 같이 쓴다. 분야는 "같은 연구 분야" 추천에만 쓰인다.
 */
export function ResearchFields({ value, onChange }: { value: Partial<Research>; onChange: (r: Partial<Research>) => void }) {
  const [kw, setKw] = useState((value.keywords ?? []).join(', '));
  const set = (p: Partial<Research>) => onChange({ ...value, ...p });
  const fields = FIELDS[lang];
  return (
    <div className="space-y-4">
      <Field label={t('연구 분야')} required hint={t('같은 분야 사람을 다른 학교 연구실까지 찾아드려요.')}>
        <div className="flex flex-wrap gap-1.5 mb-2">{fields.map((f) => <Chip key={f} size="sm" active={value.field === f} onClick={() => set({ field: value.field === f ? '' : f })}>{f}</Chip>)}</div>
        <Input placeholder={t('직접 입력 (예: 강화학습)')} value={value.field ?? ''} onChange={(e) => set({ field: e.target.value })} maxLength={40} />
      </Field>
      <Field label={t('연구실 (선택)')}><Input placeholder={lang === 'en' ? 'e.g. NLP Lab' : '예: 자연어처리 연구실'} value={value.lab ?? ''} onChange={(e) => set({ lab: e.target.value })} maxLength={40} /></Field>
      <Field label={t('몇 년차인가요? (선택)')}>
        <div className="flex flex-wrap gap-1.5">{[1, 2, 3, 4, 5, 6].map((y) => <Chip key={y} size="sm" active={value.year === y} onClick={() => set({ year: value.year === y ? undefined : y })}>{lang === 'en' ? `Year ${y}` : `${y}년차`}</Chip>)}</div>
      </Field>
      <Field label={t('세부 주제 (선택, 쉼표로 구분)')}>
        <Input placeholder={lang === 'en' ? 'e.g. LLM, Evaluation' : '예: LLM, 평가'} value={kw} onChange={(e) => { setKw(e.target.value); set({ keywords: e.target.value.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 5) }); }} />
      </Field>
      <div className="rounded-2xl bg-surface-2 px-4 py-3 space-y-2">
        <Field label={t('지도교수 (선택)')}><Input placeholder={t('이름')} value={value.advisor ?? ''} onChange={(e) => set({ advisor: e.target.value })} maxLength={40} /></Field>
        <Toggle label={t('지도교수 공개')} description={t('끄면 나만 봐요. 기본은 꺼져 있어요.')} checked={!!value.showAdvisor} onChange={(v) => set({ showAdvisor: v })} />
        <p className="text-[11px] text-ink-3 flex items-center gap-1"><Lock size={11} />{t('연구실·지도교수는 추천 이유로 드러나지 않아요.')}</p>
      </div>
    </div>
  );
}
