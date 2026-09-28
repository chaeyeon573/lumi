import { useState } from 'react';
import { Text, View } from 'react-native';
import { Target, Sparkles } from 'lucide-react-native';
import { t } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import type { PeopleWant, ActivityWant, Wants } from '@core/types';
import { PEOPLE_WANT_LABELS, PEOPLE_WANT_EMOJI, ACTIVITY_WANT_LABELS, ACTIVITY_WANT_EMOJI, emptyWants, peopleWantOptions, activityWantOptions } from '@core/lib/wants';
import { stageKind } from '@core/lib/stage';
import { tw } from '@/tw';
import { back } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Button, Field, C } from '@/ui';
import { Row, WantGrid } from '@/v2/Forms';

/** 프로필 › 추천 설정 (웹 WantsPage) — "AroundU가 나를 이해하는 기준". 온보딩과 같은 두 질문, 각각 1개 이상. 단계별로 먼저 보여줄 답 순서가 다르다 */
export default function WantsScreen() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const kind = stageKind(me);
  const [wants, setWants] = useState<Wants>(() => (me.wants ? { people: [...me.wants.people], activities: [...me.wants.activities] } : emptyWants()));
  const [busy, setBusy] = useState(false);
  const togglePeople = (k: PeopleWant) => setWants((w) => ({ ...w, people: w.people.includes(k) ? w.people.filter((x) => x !== k) : [...w.people, k] }));
  const toggleActivity = (k: ActivityWant) => setWants((w) => ({ ...w, activities: w.activities.includes(k) ? w.activities.filter((x) => x !== k) : [...w.activities, k] }));
  const valid = wants.people.length > 0 && wants.activities.length > 0;
  const save = async () => {
    setBusy(true);
    try { await run(() => api.users.updateWants(me.id, wants), t('추천 설정을 저장했어요. 추천이 바로 바뀌어요.')); back(); } catch { setBusy(false); }
  };

  return (
    <Screen title={t('추천 설정')} footer={<Row><Button full size="lg" loading={busy} disabled={!valid} onPress={save}>{valid ? t('저장') : t('각각 1개 이상 골라주세요')}</Button></Row>}>
      <View style={tw`py-4`}>
        <View style={tw`mb-5 rounded-[20px] border border-line bg-primary-soft p-4`}>
          <View style={tw`flex-row items-center`}><Target size={16} color={C.primary} /><Text style={tw`ml-2 text-[14px] font-bold text-ink`}>{t('AroundU가 나를 이해하는 기준')}</Text></View>
          <Text style={tw`mt-1.5 text-[12px] text-ink-2`}>{t('추천·홈·모임 추천의 우선순위에 바로 반영돼요. 언제든 바꿀 수 있고, 다른 사람에게는 보이지 않아요.')}</Text>
        </View>
        <Field label={t('어떤 사람을 만나고 싶어요?')} hint={t('1개 이상 골라주세요. 사람 추천과 홈의 "오늘의 사람"에 쓰여요.')}>
          <WantGrid all={peopleWantOptions(kind)} value={wants.people} labels={PEOPLE_WANT_LABELS} emoji={PEOPLE_WANT_EMOJI} onToggle={togglePeople} />
        </Field>
        <Field label={t('어떤 활동을 하고 싶어요?')} hint={t('1개 이상 골라주세요. 모임 추천과 프로필의 "열려 있어요"에 쓰여요.')}>
          <WantGrid all={activityWantOptions(kind)} value={wants.activities} labels={ACTIVITY_WANT_LABELS} emoji={ACTIVITY_WANT_EMOJI} onToggle={toggleActivity} />
        </Field>
        <View style={tw`flex-row items-start`}><Sparkles size={13} color={C.ink3} style={tw`mt-0.5`} /><Text style={tw`ml-1.5 flex-1 text-[12px] text-ink-3`}>{t('고른 기준은 추천 카드의 "왜 연결될 수 있나"에도 그대로 나타나요.')}</Text></View>
      </View>
    </Screen>
  );
}
