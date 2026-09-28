import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { t } from '@core/i18n';
import type { GroupInput } from '@core/api';
import type { GroupScope, Interest } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { GROUP_SCOPE_LABELS, GROUP_SCOPE_EMOJI } from '@core/lib/meet';
import { INTEREST_LABELS, INTEREST_EMOJI, ONBOARDING_INTERESTS } from '@core/lib/labels';
import { localeContext } from '@core/lib/locale-context';
import { cityOf } from '@core/lib/network';
import { tw } from '@/tw';
import { replace } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Avatar, Button, Field, Input, Segmented, Textarea } from '@/ui';
import { MoreRow } from '@/v2/Network';
import { Row, Wrap, WChip } from '@/v2/Forms';

const LOGO_EMOJIS = ['🌱', '☕', '🏃', '📚', '🎸', '🎨', '💻', '🚀', '🤝', '🎬', '🍜', '🌏'];
const LOGO_HUES = [30, 220, 135, 285, 15, 175, 355, 100, 50, 235];
const MAX_INTERESTS = 3;
const SCOPES = Object.keys(GROUP_SCOPE_LABELS) as GroupScope[];

/** /groups/new (웹 CreateGroupPage) — 그룹은 누구나 자유롭게. 성격(학교·지역·관심사·직업)은 만든 사람이 고르고 AroundU는 규정하지 않는다 */
export default function CreateGroupScreen() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const schools = useAppStore((s) => s.schools);
  const schoolId = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : undefined;
  const schoolName = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolName : schools.find((s) => s.id === schoolId)?.name;
  const cities = localeContext().cities;
  const myCity = cityOf(v.me);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [scope, setScope] = useState<GroupScope>(schoolId ? 'school' : 'interest');
  const [city, setCity] = useState(myCity && cities.includes(myCity) ? myCity : cities[0]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [joinPolicy, setJoinPolicy] = useState<GroupInput['joinPolicy']>('open');
  const [logo, setLogo] = useState<GroupInput['logo']>({ emoji: LOGO_EMOJIS[0], hue: LOGO_HUES[1] });
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const toggleInterest = (i: Interest) => setInterests((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : cur.length >= MAX_INTERESTS ? cur : [...cur, i]));
  const valid = name.trim().length >= 2 && description.trim().length > 0 && (scope !== 'school' || !!schoolId);

  const submit = async () => {
    setBusy(true);
    try {
      const input: GroupInput = { name: name.trim(), description: description.trim(), scope, city: scope === 'city' ? city : undefined, schoolId: scope === 'school' ? schoolId : undefined, joinPolicy, logo, interests };
      const res = await run(() => api.orgs.create(v.me.id, input), t('그룹을 만들었어요.'));
      replace(`/orgs/${res.org.id}`);
    } catch { setBusy(false); }
  };

  return (
    <Screen title={t('그룹 만들기')} footer={<Row><Button full size="lg" disabled={!valid} loading={busy} onPress={submit}>{t('그룹 만들기')}</Button></Row>}>
      <View style={tw`py-4`}>
        <View style={tw`flex-row items-center mb-4`}>
          <Avatar emoji={logo.emoji} hue={logo.hue} size={56} style={tw`rounded-2xl`} />
          <View style={tw`flex-1 ml-3`}><Field label={`${t('이름')} *`}><Input placeholder={t('예: 아침 러닝 크루')} value={name} onChangeText={setName} maxLength={40} /></Field></View>
        </View>
        <Field label={`${t('설명')} *`}><Textarea placeholder={t('어떤 사람들이 모이는 그룹인지 한두 줄로 적어주세요.')} value={description} onChangeText={setDescription} maxLength={300} /></Field>
        <Field label={`${t('성격')} *`} hint={t('그룹의 성격은 만든 사람이 정해요. 나중에 바꿀 수 있어요.')}>
          <Wrap>{SCOPES.map((s) => <WChip key={s} size="md" active={scope === s} onPress={() => setScope(s)}>{GROUP_SCOPE_EMOJI[s]} {GROUP_SCOPE_LABELS[s]}</WChip>)}</Wrap>
          {scope === 'city' ? <View style={tw`mt-1`}><Wrap>{cities.map((c) => <WChip key={c} active={city === c} onPress={() => setCity(c)}>{c}</WChip>)}</Wrap></View> : null}
          {scope === 'school' ? (schoolId
            ? <View style={tw`mt-1 h-11 rounded-2xl bg-surface-2 px-3.5 justify-center`}><Text numberOfLines={1} style={tw`text-[14px] text-ink-2`}>🏫 {schoolName}</Text></View>
            : <Text style={tw`mt-1 text-[12px] text-danger`}>{t('학교 인증 후 학교 기반 그룹을 만들 수 있어요.')}</Text>) : null}
        </Field>
        <Field label={`${t('가입 방식')} *`}>
          <Segmented<GroupInput['joinPolicy']> value={joinPolicy} onChange={setJoinPolicy} options={[['open', t('공개 (바로 가입)')], ['approval', t('승인')]]} />
        </Field>

        <MoreRow open={more} onToggle={() => setMore((x) => !x)} />
        {more ? (
          <View style={tw`mt-2`}>
            <Field label={`${t('관심사 (선택)')} ${interests.length}/${MAX_INTERESTS}`}>
              <Wrap>{ONBOARDING_INTERESTS.map((i) => <WChip key={i} active={interests.includes(i)} onPress={() => toggleInterest(i)}>{INTEREST_EMOJI[i]} {INTEREST_LABELS[i]}</WChip>)}</Wrap>
            </Field>
            <Field label={t('로고')}>
              <View style={tw`flex-row flex-wrap`}>{LOGO_EMOJIS.map((e) => <Pressable key={e} onPress={() => setLogo({ ...logo, emoji: e })} style={tw`h-9 w-9 mr-1.5 mb-1.5 rounded-xl items-center justify-center ${logo.emoji === e ? 'bg-primary-soft border-2 border-primary' : 'bg-surface-2'}`}><Text style={tw`text-[18px]`}>{e}</Text></Pressable>)}</View>
              <View style={tw`mt-1 flex-row flex-wrap`}>{LOGO_HUES.map((h) => <Pressable key={h} onPress={() => setLogo({ ...logo, hue: h })} accessibilityLabel={`${t('색상 ')}${h}`} style={tw`mr-1.5 mb-1.5 rounded-full ${logo.hue === h ? 'border-2 border-primary' : ''}`}><Avatar emoji="" hue={h} size={28} /></Pressable>)}</View>
            </Field>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
