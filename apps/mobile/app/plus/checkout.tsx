import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Sparkles, CreditCard, Check, Search, Lock, CheckCircle2 } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { PLANS } from '@core/lib/monetization';
import { tw } from '@/tw';
import { replace } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Button, Field, Input, C } from '@/ui';
import type { PlanPeriod } from '@/components/PaywallSheet';
import { Row } from '@/v2/Forms';

const fmtCard = (s: string) => s.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
const fmtExpiry = (s: string) => { const d = s.replace(/\D/g, '').slice(0, 4); return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d; };

/** /plus/checkout?period=monthly|yearly (웹 CheckoutPage) — 모의 결제. 완료하면 plan='plus' */
export default function CheckoutScreen() {
  const params = useLocalSearchParams<{ period?: string }>();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const period: PlanPeriod = params.period === 'monthly' ? 'monthly' : 'yearly';
  const plan = PLANS[lang === 'en' ? 'en' : 'ko'][period];
  const [name, setName] = useState(v.me.nickname);
  const [number, setNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/29');
  const [cvc, setCvc] = useState('123');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const ready = !!name.trim() && number.replace(/\s/g, '').length >= 12 && expiry.length >= 4 && cvc.length >= 3;
  const pay = async () => {
    setBusy(true);
    try { await run(() => api.users.setPlan(v.me.id, 'plus')); setDone(true); } catch { /* toast */ } finally { setBusy(false); }
  };

  if (done) {
    return (
      <Screen title="AroundU+">
        <View style={tw`pt-10 items-center`}>
          <View style={tw`h-16 w-16 rounded-full bg-accent-soft items-center justify-center`}><CheckCircle2 size={30} color={C.primary} /></View>
          <Text style={tw`mt-4 text-[20px] font-bold text-ink text-center`}>{t('이제 복수 조건 검색을 쓸 수 있어요')}</Text>
          <Text style={tw`mt-1 text-[13px] text-ink-2 text-center`}>{t('상세 조건 · 검색 저장 · 새 사람 알림 · 무제한 연결 요청도 함께 열렸어요.')}</Text>
          <View style={tw`mt-5 items-center`}>
            <Button icon={<Search size={16} color={C.onPrimary} />} onPress={() => replace('/people?tab=search')}>{t('찾기로 가기')}</Button>
            <Pressable onPress={() => replace('/people')} style={tw`mt-3`}><Text style={tw`text-[13px] font-semibold text-primary`}>{t('추천 보기')}</Text></Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen title={t('결제')} footer={
      <View>
        <Row><Button full size="lg" loading={busy} disabled={!ready} onPress={pay} icon={<Lock size={16} color={C.onPrimary} />}>{`${t('결제하기')} · ${plan.price}${plan.per}`}</Button></Row>
        <View style={tw`mt-1.5 flex-row items-center justify-center`}><Check size={11} color={C.ink3} /><Text style={tw`ml-1 text-[11px] text-ink-3`}>{t('데모 — 실제 결제는 일어나지 않아요')}</Text></View>
      </View>
    }>
      <View style={tw`pt-2`}>
        {/* 1. 요금제 */}
        <View style={tw`rounded-[20px] bg-primary p-4 flex-row items-center`}>
          <View style={[tw`h-10 w-10 rounded-2xl items-center justify-center`, { backgroundColor: C.onDarkBtn }]}><Sparkles size={18} color={C.onPrimary} /></View>
          <View style={tw`flex-1 min-w-0 ml-3`}>
            <Text style={tw`text-[12px] font-semibold text-accent`}>AroundU+ · {plan.label}</Text>
            <Text style={tw`text-[22px] font-extrabold text-white`}>{plan.price}<Text style={[tw`text-[12px] font-medium`, { color: C.glassSoft }]}>{plan.per}</Text></Text>
          </View>
          <Pressable onPress={() => router.setParams({ period: period === 'yearly' ? 'monthly' : 'yearly' } as never)} style={[tw`h-8 px-3 rounded-full justify-center`, { backgroundColor: C.onDarkBtn }]}><Text style={tw`text-[12px] font-semibold text-white`}>{t('변경')}</Text></Pressable>
        </View>

        {/* 2. 카드 정보 */}
        <View style={tw`mt-4 card p-4`}>
          <View style={tw`flex-row items-center mb-3`}><CreditCard size={16} color={C.primary} /><Text style={tw`ml-2 text-[14px] font-bold text-ink`}>{t('카드 정보')}</Text></View>
          <Field label={t('이름')}><Input value={name} onChangeText={setName} autoComplete="cc-name" /></Field>
          <Field label={t('카드 번호')}><Input keyboardType="number-pad" value={number} onChangeText={(s) => setNumber(fmtCard(s))} placeholder="0000 0000 0000 0000" autoComplete="cc-number" /></Field>
          <View style={tw`flex-row`}>
            <View style={tw`flex-1 mr-1`}><Field label={t('유효기간')}><Input keyboardType="number-pad" value={expiry} onChangeText={(s) => setExpiry(fmtExpiry(s))} placeholder="MM/YY" autoComplete="cc-exp" /></Field></View>
            <View style={tw`flex-1 ml-1`}><Field label="CVC"><Input keyboardType="number-pad" value={cvc} onChangeText={(s) => setCvc(s.replace(/\D/g, '').slice(0, 4))} placeholder="123" autoComplete="cc-csc" /></Field></View>
          </View>
        </View>
      </View>
    </Screen>
  );
}
