import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Gift } from 'lucide-react-native';
import { t } from '@core/i18n';
import { profileCompletion } from '@core/data/prompts';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { ALL_GOALS, GOAL_EMOJI, GOAL_LABELS, LOOKING_FOR_ROLES, OFFER_ROLES, PERSON_ROLE_LABELS, RESIDENCE_LABELS, ALL_MEET_PREFS, MEET_PREF_LABELS, MEET_PREF_EMOJI } from '@core/lib/labels';
import type { Goal, Role, Residence, MeetPreference } from '@core/types';
import { tw } from '@/tw';
import { back } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Button, Chip, Input, Segmented, C } from '@/ui';
import { VisibilityPicker } from '@/components/b_VisibilityPicker';
import { CompletionMeter } from '@/components/b_PromptComponents';
import { isAlumniStage } from '@core/lib/network';

/** 라벨 + 오른쪽 슬롯 + 힌트 (웹 Field right 슬롯) — 렌더 밖에 정의해 입력 포커스 유지 */
function Field({ label, right, hint, children }: { label: string; right?: ReactNode; hint?: string; children: ReactNode }) {
  return (
    <View style={tw`mb-5`}>
      <View style={tw`flex-row items-center justify-between mb-1.5`}><Text style={tw`text-[12px] font-bold text-ink-3`}>{label}</Text>{right ?? null}</View>
      {children}
      {hint ? <Text style={tw`text-[11px] text-ink-3 mt-1`}>{hint}</Text> : null}
    </View>
  );
}
const Wrap = ({ children }: { children: ReactNode }) => <View style={tw`flex-row flex-wrap`}>{children}</View>;

/** 이번 학기 목표·찾는 사람·제공할 수 있는 것·생활권·관심 조직 — 추천의 핵심 입력 (웹 ProfileContextPage) */
export default function ProfileContextScreen() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const orgs = useAppStore((s) => s.organizations);
  const me = v.me;
  const [goals, setGoals] = useState<Goal[]>(me.goals);
  const [lookingFor, setLookingFor] = useState<Role[]>(me.lookingFor);
  const [canOffer, setCanOffer] = useState<Role[]>(me.canOffer);
  const [residence, setResidence] = useState<Residence>(me.living?.residence ?? 'dorm');
  const [zone, setZone] = useState(me.living?.zone ?? '');
  const [orgIds, setOrgIds] = useState<string[]>(me.interestedOrgIds);
  const [pref, setPref] = useState<MeetPreference[]>(me.meetPreference);
  const [busy, setBusy] = useState(false);
  const toggle = <T,>(arr: T[], x: T) => (arr.includes(x) ? arr.filter((i) => i !== x) : [...arr, x]);
  const preview = profileCompletion({ ...me, goals, lookingFor, canOffer, living: zone ? { residence, zone } : undefined });
  const mySchool = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  /** 졸업생에게는 이번 학기 목표 · 생활권을 묻지 않는다 */
  const alumni = isAlumniStage(me);

  const save = async () => {
    setBusy(true);
    try {
      await run(() => api.users.update(me.id, { goals, lookingFor, canOffer, living: zone.trim() ? { residence, zone: zone.trim() } : undefined, interestedOrgIds: orgIds, meetPreference: pref }), t('저장했어요. 추천이 더 정확해져요.'));
      back();
    } catch { setBusy(false); }
  };

  return (
    <Screen title={t('목표와 역할')} footer={<View style={tw`flex-row`}><Button full size="lg" loading={busy} onPress={save}>{t('저장')}</Button></View>}>
      <View style={tw`py-4`}>
        <LinearGradient colors={[C.tint, C.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0.4 }} style={tw`rounded-[20px] border border-line p-4 mb-5`}>
          <View style={tw`flex-row items-center mb-2`}><Gift size={16} color={C.primary} /><Text style={tw`ml-2 text-[14px] font-bold text-ink`}>{t('채울수록 더 잘 연결돼요')}</Text></View>
          <CompletionMeter {...preview} />
          <Text style={tw`text-[12px] text-ink-2 mt-2`}>{t('완성도가 높을수록 추천에 더 자주 노출되고(100%면 1.5배), 상대 카드에 "왜 잘 맞는지"가 구체적으로 표시돼요.')}</Text>
        </LinearGradient>

        <Field label={t('어떤 사람을 만나고 싶어요?')} hint={t('여러 개 골라도 돼요. 추천 순서에 바로 반영돼요.')}>
          {ALL_MEET_PREFS.map((p) => (
            <Pressable key={p} onPress={() => setPref(toggle(pref, p))} style={tw`rounded-xl px-3.5 h-11 border flex-row items-center mb-1.5 ${pref.includes(p) ? 'border-primary bg-primary-soft' : 'border-line'}`}>
              <Text style={tw`text-[14px]`}>{MEET_PREF_EMOJI[p]}</Text><Text style={tw`ml-2 text-[14px] font-medium text-ink`}>{MEET_PREF_LABELS[p]}</Text>
            </Pressable>
          ))}
        </Field>
        {alumni ? null : <Field label={t('이번 학기에 하고 싶은 것')} right={<VisibilityPicker compact value={me.fieldVisibility.goals} onChange={(vis) => run(() => api.users.update(me.id, { fieldVisibility: { ...me.fieldVisibility, goals: vis } }))} />}>
          <Wrap>{ALL_GOALS.map((g) => <View key={g} style={tw`mb-2`}><Chip active={goals.includes(g)} onPress={() => setGoals(toggle(goals, g))}>{GOAL_EMOJI[g]} {GOAL_LABELS[g]}</Chip></View>)}</Wrap>
        </Field>}
        <Field label={t('찾는 사람')}><Wrap>{LOOKING_FOR_ROLES.map((r) => <View key={r} style={tw`mb-2`}><Chip active={lookingFor.includes(r)} onPress={() => setLookingFor(toggle(lookingFor, r))}>{PERSON_ROLE_LABELS[r]}</Chip></View>)}</Wrap></Field>
        <Field label={t('내가 제공할 수 있는 것')} hint={t('팀원·공동창업자 추천의 핵심 데이터예요.')}><Wrap>{OFFER_ROLES.map((r) => <View key={r} style={tw`mb-2`}><Chip active={canOffer.includes(r)} onPress={() => setCanOffer(toggle(canOffer, r))}>{PERSON_ROLE_LABELS[r]}</Chip></View>)}</Wrap></Field>
        {alumni ? null : <Field label={t('생활권')} hint={t('정확한 기숙사 방·주소·실시간 위치는 저장하지 않아요. \'같은 생활권이에요\' 정도만 보여요.')} right={<VisibilityPicker compact value={me.fieldVisibility.living} onChange={(vis) => run(() => api.users.update(me.id, { fieldVisibility: { ...me.fieldVisibility, living: vis } }))} />}>
          <Segmented<Residence> value={residence} onChange={setResidence} options={(Object.keys(RESIDENCE_LABELS) as Residence[]).map((r) => [r, RESIDENCE_LABELS[r]] as [Residence, string])} />
          <Input style={tw`mt-2`} placeholder={t('주로 활동하는 구역 (예: 신촌 북쪽, 공학관 근처)')} value={zone} onChangeText={setZone} />
        </Field>}
        <Field label={t('관심 있는 연구실·동아리')} hint={t('관심 조직의 모집·행사가 먼저 추천돼요.')}>
          <Wrap>{orgs.filter((o) => o.schoolId === mySchool).map((o) => <View key={o.id} style={tw`mb-2`}><Chip active={orgIds.includes(o.id)} onPress={() => setOrgIds(toggle(orgIds, o.id))}>{o.logo.emoji} {o.name}</Chip></View>)}</Wrap>
        </Field>
      </View>
    </Screen>
  );
}
