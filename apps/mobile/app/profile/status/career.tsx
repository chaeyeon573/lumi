import { useState, type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { GraduationCap, Briefcase, MapPin, BadgeCheck } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { localeContext } from '@core/lib/locale-context';
import { schoolBadge } from '@core/lib/network';
import type { Career } from '@core/types';
import { tw } from '@/tw';
import { replace } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Button, Field, Input, C } from '@/ui';
import { ChipsWithText, Row } from '@/v2/Forms';

/**
 * 졸업 후 정보 (웹 StatusCareerPage) — 거주 도시 · 활동 지역 · 하는 일. 전부 선택.
 * 저장하면 stage=alumni, 홈과 추천이 졸업생 기준으로 바뀐다. 연결·글·그룹·인증은 그대로.
 */
export default function StatusCareerScreen() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const ctx = localeContext();
  const [homeCity, setHomeCity] = useState(me.homeCity ?? me.career?.city ?? me.region ?? '');
  const [activityCity, setActivityCity] = useState(me.activityCity ?? '');
  const [career, setCareer] = useState<Career>(() => ({ ...me.career }));
  const [busy, setBusy] = useState(false);
  const setC = (k: keyof Career, val: string) => setCareer((c) => ({ ...c, [k]: val.trim() ? val : undefined }));
  const alumniBadge = schoolBadge({ ...me, stage: 'alumni' }, lang);

  const finish = async () => {
    setBusy(true);
    try {
      const c: Career = { ...career, city: homeCity.trim() || career.city };
      await run(() => api.users.setStage(me.id, 'alumni', c, homeCity.trim() || undefined, activityCity), t('홈과 추천이 졸업생 기준으로 바뀌었어요'));
      replace('/');
    } catch { setBusy(false); }
  };
  const H = ({ icon, title }: { icon: ReactNode; title: string }) => <View style={tw`mt-2 mb-3 px-1 flex-row items-center`}>{icon}<Text style={tw`ml-2 text-[14px] font-bold text-primary`}>{title}</Text></View>;

  return (
    <Screen title={t('졸업 후 정보')} footer={<Row><Button full size="lg" loading={busy} icon={<GraduationCap size={17} color={C.onPrimary} />} onPress={finish}>{t('졸업생으로 시작하기')}</Button></Row>}>
      <View style={tw`py-4`}>
        <View style={tw`mb-4 rounded-[24px] border border-line bg-primary-soft p-4 flex-row items-center`}>
          <View style={tw`h-11 w-11 rounded-full bg-white items-center justify-center`}><GraduationCap size={22} color={C.primary} /></View>
          <View style={tw`flex-1 min-w-0 ml-3`}>
            <View style={tw`flex-row items-center`}><Text numberOfLines={1} style={tw`shrink text-[14px] font-bold text-primary`}>{alumniBadge}</Text><BadgeCheck size={14} color={C.verify} style={tw`ml-1`} /></View>
            <Text style={tw`text-[12px] text-ink-2`}>{t('모두 선택 사항이에요. 적을수록 같은 도시·분야의 동문과 더 정확하게 연결돼요.')}</Text>
          </View>
        </View>

        <H icon={<MapPin size={15} color={C.primary} />} title={t('어디에 있나요?')} />
        <ChipsWithText label={t('현재 거주 도시')} hint={ctx.cityHint} options={ctx.cities} value={homeCity} placeholder={t('도시 이름')} onChange={setHomeCity} />
        <ChipsWithText label={t('활동 지역 (선택)')} hint={t('거주지와 다를 수 있어요 — 예: 거주 성남 · 활동 서울')} options={ctx.cities} value={activityCity} placeholder={t('주로 활동하는 도시')} onChange={setActivityCity} />

        <H icon={<Briefcase size={15} color={C.primary} />} title={t('하는 일')} />
        <Field label={t('회사 (선택)')}><Input placeholder={t('예: 토스')} value={career.company ?? ''} onChangeText={(s) => setC('company', s)} /></Field>
        <ChipsWithText label={t('업종')} options={ctx.industries} value={career.industry ?? ''} placeholder={t('예: 핀테크')} onChange={(s) => setC('industry', s)} />
        <ChipsWithText label={t('직무')} options={ctx.roles} value={career.role ?? ''} placeholder={t('예: PM')} onChange={(s) => setC('role', s)} />
        <Text style={tw`text-[12px] text-ink-3`}>{t('직함이 아니라 "같은 분야 사람"을 찾는 기준으로만 쓰여요.')}</Text>
      </View>
    </Screen>
  );
}
