import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Check, Lock, Sparkles } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { PLANS, FREE_SWIPES_PER_DAY } from '@core/lib/monetization';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { BottomSheet, Button, C } from '@/ui';

export type PaywallReason = 'limit' | 'search' | 'save' | 'alert';
export type PlanPeriod = 'monthly' | 'yearly';

/** AroundU+ 5가지 — 사람을 만나는 건 무료, "더 빠르고 정확하게 찾는 기능"만 유료 (웹 PLUS_PERKS) */
export const PLUS_PERKS: () => { title: string; desc: string }[] = () => [
  { title: t('복수 조건 검색'), desc: t('조건을 2개 이상 겹쳐서 찾아요') },
  { title: t('상세 조건'), desc: t('업종 · 직무 · 회사 · 졸업연도 · 활동 지역') },
  { title: t('검색 저장 + 새 사람 알림'), desc: t('조건을 저장해두면 새 사람이 들어올 때 알려드려요') },
  { title: `${t('연결 요청')} ${FREE_SWIPES_PER_DAY} → ${t('무제한')}`, desc: t('하루 한도 없이 연결 요청을 보내요') },
  { title: t('고급 추천'), desc: t('찾는 사람 조건을 더 정교하게 반영한 추천') },
];

/** 요금제 토글 (월 / 연) — 페이월·Plus 화면 공용 */
export function PlanToggle({ period, onChange }: { period: PlanPeriod; onChange: (p: PlanPeriod) => void }) {
  const plans = PLANS[lang === 'en' ? 'en' : 'ko'];
  return (
    <View style={tw`flex-row`}>
      {(['yearly', 'monthly'] as const).map((k) => { const p = plans[k]; const on = period === k; return (
        <Pressable key={k} onPress={() => onChange(k)} style={[tw`flex-1 rounded-2xl border-2 p-3.5 ${k === 'yearly' ? 'mr-2' : ''}`, { borderColor: on ? C.primary : C.line, backgroundColor: on ? C.soft : C.bg }]}>
          <View style={tw`flex-row items-center`}><Text style={tw`text-[12px] font-bold text-ink-3`}>{p.label}</Text>{'badge' in p ? <View style={tw`ml-2 h-5 px-2 rounded-full bg-primary justify-center`}><Text style={tw`text-[10px] font-bold text-white`}>{p.badge}</Text></View> : null}</View>
          <Text style={tw`mt-1 text-[20px] font-extrabold text-primary`}>{p.price}<Text style={tw`text-[12px] font-medium text-ink-3`}>{p.per}</Text></Text>
        </Pressable>
      ); })}
    </View>
  );
}

const BANNER: Record<PaywallReason, () => string> = {
  limit: () => (lang === 'en' ? `You've used all ${FREE_SWIPES_PER_DAY} connection requests for today` : `오늘 연결 요청 ${FREE_SWIPES_PER_DAY}회를 다 썼어요`),
  search: () => t('조건 2개 이상·상세 조건은 AroundU+'),
  save: () => t('검색 저장과 새 사람 알림은 AroundU+'),
  alert: () => t('검색 저장과 새 사람 알림은 AroundU+'),
};

/** AroundU+ 페이월 (웹 PaywallSheet) — 결제는 /plus/checkout 에서(모의). reason 별로 위에 한 줄 배너 */
export function PaywallSheet({ open, onClose, reason }: { open: boolean; onClose: () => void; reason?: PaywallReason }) {
  const [period, setPeriod] = useState<PlanPeriod>('yearly');
  const go = (path: string) => { onClose(); nav(path); };
  return (
    <BottomSheet open={open} onClose={onClose} title="AroundU+" tall>
      {reason ? (
        <View style={tw`rounded-2xl bg-gold-soft px-4 py-3 mb-4 flex-row items-start`}>
          <Lock size={15} color={C.goldInk} style={tw`mt-0.5`} />
          <View style={tw`flex-1 ml-2`}>
            <Text style={tw`text-[14px] font-bold text-ink`}>{BANNER[reason]()}</Text>
            {reason === 'limit' ? <Text style={tw`text-[12px] text-ink-2 mt-0.5`}>{lang === 'en' ? `You get ${FREE_SWIPES_PER_DAY} more tomorrow. AroundU+ has no limit.` : `내일 다시 ${FREE_SWIPES_PER_DAY}회가 채워져요. AroundU+ 는 무제한이에요.`}</Text> : null}
          </View>
        </View>
      ) : null}
      <View style={tw`flex-row items-center`}><Sparkles size={18} color={C.primary} /><Text style={tw`ml-2 flex-1 text-[20px] font-bold text-primary`}>{t('더 정확한 사람을 더 빠르게')}</Text></View>
      <Text style={tw`text-[13px] text-ink-2 mt-1`}>{t('사람을 만나는 데는 돈을 받지 않아요. 원하는 사람을 더 빠르고 정교하게 찾는 기능만 AroundU+ 예요.')}</Text>
      <View style={tw`mt-3`}>
        {PLUS_PERKS().map((p) => (
          <View key={p.title} style={tw`flex-row items-start py-1`}>
            <View style={tw`h-6 w-6 rounded-full bg-accent-soft items-center justify-center mt-0.5`}><Check size={14} color={C.primary} /></View>
            <View style={tw`ml-3 flex-1`}><Text style={tw`text-[14px] font-semibold text-ink`}>{p.title}</Text><Text style={tw`text-[12px] text-ink-3`}>{p.desc}</Text></View>
          </View>
        ))}
      </View>
      <View style={tw`mt-4`}><PlanToggle period={period} onChange={setPeriod} /></View>
      <View style={tw`mt-4 flex-row`}><Button full size="lg" icon={<Sparkles size={16} color={C.onPrimary} />} onPress={() => go(`/plus/checkout?period=${period}`)}>{t('구독 시작하기')}</Button></View>
      <Pressable onPress={() => go('/plus')} style={tw`mt-2.5 items-center`}><Text style={tw`text-[13px] font-semibold text-primary underline`}>{t('자세히 보기')}</Text></Pressable>
      <Text style={tw`mt-2 text-center text-[11px] text-ink-3`}>{t('데모 — 실제 결제는 일어나지 않아요')}</Text>
    </BottomSheet>
  );
}
