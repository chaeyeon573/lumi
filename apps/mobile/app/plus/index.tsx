import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Sparkles, Check, Search, Layers, Bell, UserPlus, Wand2, GraduationCap, ChevronRight, Lock, Telescope } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { isPlus, FREE_SWIPES_PER_DAY } from '@core/lib/monetization';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Button, Tag, C } from '@/ui';
import { PlanToggle, PLUS_PERKS, type PlanPeriod } from '@/components/PaywallSheet';
import { MoreRow } from '@/v2/Network';
import { Row } from '@/v2/Forms';

const ICONS = [Layers, Search, Bell, UserPlus, Wand2];

/** /plus — AroundU+ 설명 (웹 PlusPage). 무료로 할 수 있는 것도 함께, 유료는 "찾는 기능"만 */
export default function PlusScreen() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const plus = isPlus(v.me);
  const [period, setPeriod] = useState<PlanPeriod>('yearly');
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const example = lang === 'en' ? 'e.g. San Francisco + AI + Founder + Berkeley/Stanford/MIT' : '예: 서울 + AI + Founder + 연세대/서울대/KAIST';
  const free = [t('추천 사람 보기'), t('타학교 사람 보기'), t('동문 보기'), t('기본 검색'), `${t('기본 연결 요청')} ${FREE_SWIPES_PER_DAY}/${t('일')}`, t('모임·그룹 참가'), t('피드'), t('메시지')];
  const cancel = async () => { setBusy(true); try { await run(() => api.users.setPlan(v.me.id, 'free'), t('AroundU+ 구독을 해지했어요.')); } catch { /* toast */ } finally { setBusy(false); } };

  const footer = plus
    ? <Row><Button full size="lg" variant="outline" loading={busy} onPress={cancel}>{`${t('구독 관리')} · ${t('해지')}`}</Button></Row>
    : <Row><Button full size="lg" icon={<Sparkles size={16} color={C.onPrimary} />} onPress={() => nav(`/plus/checkout?period=${period}`)}>{t('구독 시작하기')}</Button></Row>;

  return (
    <Screen title="AroundU+" footer={footer}>
      <View style={tw`pt-2`}>
        {/* 1. 한 줄 가치 */}
        <View style={tw`rounded-[28px] bg-primary-soft p-5`}>
          <View style={tw`flex-row items-center`}><Sparkles size={18} color={C.primary} /><Text style={tw`ml-2 flex-1 text-[22px] font-bold text-ink`}>{t('더 정확한 사람을 더 빠르게')}</Text></View>
          <Text style={tw`text-[13px] text-ink-2 mt-2`}>{t('사람을 만나는 데는 돈을 받지 않아요. 원하는 사람을 더 빠르고 정교하게 찾는 기능만 AroundU+ 예요.')}</Text>
          {plus ? <View style={tw`mt-3 self-start`}><Tag tone="primary">✓ {t('이용 중')}</Tag></View> : null}
        </View>

        {/* 2. 유료 기능 5가지 */}
        <View style={tw`mt-4`}>
          {PLUS_PERKS().map((p, i) => { const Icon = ICONS[i]; return (
            <View key={p.title} style={tw`mb-2 card p-4 flex-row items-start`}>
              <View style={tw`h-10 w-10 rounded-2xl bg-primary-soft items-center justify-center`}><Icon size={18} color={C.primary} /></View>
              <View style={tw`flex-1 min-w-0 ml-3`}>
                <Text style={tw`text-[15px] font-bold text-ink`}>{p.title}</Text>
                <Text style={tw`text-[12px] text-ink-2 mt-0.5`}>{p.desc}</Text>
                {i === 0 ? <Text style={tw`text-[11px] text-ink-3 mt-1`}>{example}</Text> : null}
              </View>
            </View>
          ); })}
        </View>

        {/* 3. 요금제 */}
        {!plus ? <View style={tw`mt-2`}><PlanToggle period={period} onChange={setPeriod} /></View> : null}
        <View style={tw`mt-3 flex-row items-center justify-center`}><GraduationCap size={14} color={C.primary} /><Text style={tw`ml-1.5 text-[12px] text-ink-2`}>{t('학생과 졸업생 모두 같은 기준 · 졸업했다고 유료가 되지 않아요')}</Text></View>

        {/* 더 보기 — 무료로 할 수 있는 것 · 고급 탐색 · 가격 */}
        <MoreRow open={more} onToggle={() => setMore((x) => !x)} />
        {more ? (
          <View>
            <View style={tw`card p-4`}>
              <Text style={tw`text-[14px] font-bold text-ink`}>{t('무료로 할 수 있는 것')}</Text>
              <View style={tw`mt-2 flex-row flex-wrap`}>{free.map((f) => <View key={f} style={tw`w-1/2 py-0.5 flex-row items-center`}><Check size={13} color={C.mint} /><Text numberOfLines={1} style={tw`ml-1.5 flex-1 text-[13px] text-ink-2`}>{f}</Text></View>)}</View>
            </View>
            <Pressable onPress={() => nav('/people/advanced')} style={tw`mt-2 card p-4 flex-row items-center`}>
              <View style={tw`h-10 w-10 rounded-2xl bg-accent-soft items-center justify-center`}><Telescope size={18} color={C.primary} /></View>
              <View style={tw`flex-1 min-w-0 mx-3`}><Text style={tw`text-[15px] font-bold text-ink`}>{t('고급 탐색 열기')}</Text><Text style={tw`text-[12px] text-ink-2 mt-0.5`}>{t('조건 겹치기 · 2촌/3촌 필터 · 검색 저장 · 새 사람 알림')}</Text></View>
              <ChevronRight size={18} color={C.ink3} />
            </Pressable>
            <View style={tw`mt-3 px-1 flex-row items-center`}><Lock size={12} color={C.primary} /><Text style={tw`ml-1.5 flex-1 text-[12px] text-ink-2`}>{t('유료여도 비공개 정보는 볼 수 없어요 · 찾는 힘만 커져요')}</Text></View>
            <Text style={tw`mt-3 text-center text-[11px] text-ink-3`}>{t('데모 — 실제 결제는 일어나지 않아요')}</Text>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
