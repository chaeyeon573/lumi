import { Text, View } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';
import { t } from '@core/i18n';
import { reasonChip, type Reason } from '@core/lib/recommend';
import { tw } from '@/tw';
import { C } from '@/ui';

function ChipPill({ label, solid }: { label: string; solid?: boolean }) {
  return (
    <View style={tw`h-6 px-2 mr-1 mb-1 rounded-full flex-row items-center shrink-0 ${solid ? 'bg-primary' : 'bg-accent-soft'}`}>
      <CheckCircle2 size={11} color={solid ? C.onPrimary : C.primary} />
      <Text numberOfLines={1} style={tw`ml-1 text-[11px] font-bold ${solid ? 'text-white' : 'text-primary'}`}>{label}</Text>
    </View>
  );
}

/**
 * "왜 이 사람이 추천되었는지" — 카드 상단의 짧은 이유 칩 (같은 학교 · 같은 전공 · 같은 지역 …) (웹 people_ReasonChips).
 * nowrap 이면 한 줄로 두고 넘치는 칩은 잘라낸다.
 */
export function ReasonChips({ reasons, max = 3, tone = 'light', nowrap }: { reasons: Reason[]; max?: number; tone?: 'light' | 'solid'; nowrap?: boolean }) {
  const chips = [...new Set(reasons.slice(0, max).map(reasonChip))];
  if (!chips.length) return null;
  return <View accessibilityLabel={t('추천 이유')} style={tw`flex-row ${nowrap ? 'overflow-hidden' : 'flex-wrap'} -mb-1`}>{chips.map((c) => <ChipPill key={c} label={c} solid={tone === 'solid'} />)}</View>;
}

/** 문자열 이유 칩 — "같은 지역 · 서울" 처럼 전체 문장을 그대로 */
export function PlainReasonChips({ reasons, max = 3 }: { reasons: string[]; max?: number }) {
  if (!reasons.length) return null;
  return <View style={tw`flex-row flex-wrap -mb-1`}>{reasons.slice(0, max).map((r) => <ChipPill key={r} label={r} />)}</View>;
}

/** 이유 전체 목록 — "왜 추천되었나요" 박스 */
export function ReasonList({ reasons, title, max = 4 }: { reasons: Reason[]; title?: string; max?: number }) {
  if (!reasons.length) return null;
  return (
    <View style={tw`rounded-2xl bg-primary-soft px-3 py-2.5`}>
      {title ? <Text style={tw`text-[11px] font-bold text-ink-3 mb-1`}>{title}</Text> : null}
      {reasons.slice(0, max).map((r) => (
        <View key={r.text} style={tw`flex-row items-start py-0.5`}><CheckCircle2 size={14} color={C.primary} style={tw`mt-0.5`} /><Text style={tw`ml-1.5 flex-1 text-[13px] text-ink-2`}>{r.text}</Text></View>
      ))}
    </View>
  );
}
