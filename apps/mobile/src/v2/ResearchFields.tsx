import { useState } from 'react';
import { Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import type { Research } from '@core/types';
import { tw } from '@/tw';
import { Field, Input, Toggle, C } from '@/ui';
import { Wrap, WChip } from './Forms';

const FIELDS = { ko: ['NLP', 'AI', '컴퓨터비전', '로봇', '바이오', '경제', 'HCI', '재료'], en: ['NLP', 'AI', 'Computer Vision', 'Robotics', 'Bioinformatics', 'Economics', 'HCI', 'Materials'] };

/**
 * 대학원생 연구 정보 입력 (웹 profile_ResearchFields) — 분야(필수) · 연구실 · N년차 · 세부 주제 · 지도교수(기본 비공개).
 * 온보딩과 프로필 편집이 같이 쓴다. 분야는 "같은 연구 분야" 추천에만 쓰인다.
 */
export function ResearchFields({ value, onChange }: { value: Partial<Research>; onChange: (r: Partial<Research>) => void }) {
  const [kw, setKw] = useState((value.keywords ?? []).join(', '));
  const set = (p: Partial<Research>) => onChange({ ...value, ...p });
  const fields = FIELDS[lang === 'en' ? 'en' : 'ko'];
  return (
    <View>
      <Field label={`${t('연구 분야')} *`} hint={t('같은 분야 사람을 다른 학교 연구실까지 찾아드려요.')}>
        <Wrap>{fields.map((f) => <WChip key={f} active={value.field === f} onPress={() => set({ field: value.field === f ? '' : f })}>{f}</WChip>)}</Wrap>
        <Input style={tw`mt-1`} placeholder={t('직접 입력 (예: 강화학습)')} value={value.field ?? ''} onChangeText={(field) => set({ field })} maxLength={40} />
      </Field>
      <Field label={t('연구실 (선택)')}><Input placeholder={lang === 'en' ? 'e.g. NLP Lab' : '예: 자연어처리 연구실'} value={value.lab ?? ''} onChangeText={(lab) => set({ lab })} maxLength={40} /></Field>
      <Field label={t('몇 년차인가요? (선택)')}>
        <Wrap>{[1, 2, 3, 4, 5, 6].map((y) => <WChip key={y} active={value.year === y} onPress={() => set({ year: value.year === y ? undefined : y })}>{lang === 'en' ? `Year ${y}` : `${y}년차`}</WChip>)}</Wrap>
      </Field>
      <Field label={t('세부 주제 (선택, 쉼표로 구분)')}>
        <Input placeholder={lang === 'en' ? 'e.g. LLM, Evaluation' : '예: LLM, 평가'} value={kw} onChangeText={(s) => { setKw(s); set({ keywords: s.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 5) }); }} />
      </Field>
      <View style={tw`rounded-2xl bg-surface-2 px-4 pt-3 pb-2`}>
        <Field label={t('지도교수 (선택)')}><Input placeholder={t('이름')} value={value.advisor ?? ''} onChangeText={(advisor) => set({ advisor })} maxLength={40} /></Field>
        <Toggle label={t('지도교수 공개')} description={t('끄면 나만 봐요. 기본은 꺼져 있어요.')} checked={!!value.showAdvisor} onChange={(on) => set({ showAdvisor: on })} />
        <View style={tw`flex-row items-center pb-1`}><Lock size={11} color={C.ink3} /><Text style={tw`ml-1 flex-1 text-[11px] text-ink-3`}>{t('연구실·지도교수는 추천 이유로 드러나지 않아요.')}</Text></View>
      </View>
    </View>
  );
}
