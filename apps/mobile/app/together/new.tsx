import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Plus, X, Sparkles, Users, Clock } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import type { ActivityCategory, TimeOption } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { ALL_CATEGORIES, CATEGORY_EMOJI, CATEGORY_LABELS } from '@core/lib/labels';
import { PLACE_PRESETS } from '@core/data/places';
import { friendsOf } from '@core/lib/relations';
import { suggestOptions, optionLabel } from '@core/lib/together';
import { addDaysISO } from '@core/lib/format';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { replace } from '@/nav';
import { Screen, Button, Chip, Field, Input, Tag, C } from '@/ui';
import { ChipWrap, WrapItem, FriendChips } from '@/components/c_Form';

type Opt = Omit<TimeOption, 'id'>;
const key = (o: Opt) => `${o.date}_${o.startTime}`;

/** Plan Together 만들기: 무엇 → 누구 → 언제(공강 겹침 자동 제안 + 직접 추가) → 마감 → 보내기 */
export default function CreateTogetherScreen() {
  const params = useLocalSearchParams<{ invite?: string; cat?: string }>();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const schoolId = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  const presets = PLACE_PRESETS[schoolId] ?? PLACE_PRESETS[lang === 'en' ? 's_berkeley' : 's_yonsei'];
  const friends = useMemo(() => friendsOf(v.snap, me.id).map((id) => v.userById(id)!).filter(Boolean), [v, me.id]);
  const inviteParam = params.invite;
  const [category, setCategory] = useState<ActivityCategory>((params.cat as ActivityCategory) || 'meal');
  const [title, setTitle] = useState('');
  const [placeName, setPlaceName] = useState('');
  const [invitees, setInvitees] = useState<string[]>(inviteParam && v.userById(inviteParam) ? [inviteParam] : []);
  const [options, setOptions] = useState<Opt[]>([]);
  const [custom, setCustom] = useState<Opt>({ date: addDaysISO(1), startTime: '18:00', endTime: '19:30' });
  const [hours, setHours] = useState(48);
  const [busy, setBusy] = useState(false);

  const people = [me, ...invitees.map((id) => v.userById(id)!).filter(Boolean)];
  const suggestions = useMemo(() => suggestOptions(people, (u) => u.id === me.id || v.canSeeField(u, 'timetable')), [people, v, me.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const withTT = people.filter((u) => u.timetable?.length && (u.id === me.id || v.canSeeField(u, 'timetable'))).length;
  const chosen = new Set(options.map(key));
  const toggleOpt = (o: Opt) => setOptions((os) => chosen.has(key(o)) ? os.filter((x) => key(x) !== key(o)) : [...os, o]);
  const valid = title.trim().length >= 2 && invitees.length > 0 && options.length >= 2;

  const submit = async () => {
    setBusy(true);
    try {
      const place = presets.find((p) => p.name === placeName);
      const res = await run(() => api.together.create(me.id, { title: title.trim(), category, place, inviteeIds: invitees, options: [...options].sort((a, b) => key(a).localeCompare(key(b))), closesAt: new Date(Date.now() + hours * 3600000).toISOString() }), t('시간 투표를 보냈어요. 친구들이 고르면 알려드릴게요.'));
      replace(`/together/${res.poll.id}`);
    } catch { setBusy(false); }
  };

  return (
    <Screen title="Plan Together" footer={<View style={tw`flex-row`}><Button full size="lg" disabled={!valid} loading={busy} onPress={submit}>{lang === 'en' ? `Send to ${invitees.length || '…'}` : `${invitees.length || '…'}명에게 투표 보내기`}</Button></View>}>
      <View style={tw`py-4`}>
        <View style={tw`rounded-xl bg-primary-soft px-3.5 py-2.5 mb-5`}><Text style={tw`text-[13px] text-ink-2`}>{t('시간을 못 정해서 못 만나는 일이 없게. 후보 시간을 보내면 각자 되는 시간에 표를 던지고, 가장 많이 겹치는 시간으로 확정해요.')}</Text></View>
        <Field label={lang === 'en' ? 'What' : t('무엇을')}>
          <View style={tw`mb-2`}><ChipWrap>{ALL_CATEGORIES.filter((c) => !['school_event', 'store_deal', 'seminar', 'club'].includes(c)).map((c) => <WrapItem key={c}><Chip size="sm" active={category === c} onPress={() => setCategory(c)}>{CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}</Chip></WrapItem>)}</ChipWrap></View>
          <Input placeholder={t('예: 시험 끝 기념 저녁')} value={title} onChangeText={setTitle} maxLength={60} />
        </Field>
        <Field label={t('장소 (선택)')}><ChipWrap>{presets.map((p) => <WrapItem key={p.name}><Chip size="sm" active={placeName === p.name} onPress={() => setPlaceName(placeName === p.name ? '' : p.name)}>{p.name}</Chip></WrapItem>)}</ChipWrap></Field>
        <Field label={lang === 'en' ? 'Who' : t('누구와')} hint={invitees.length ? `${invitees.length}${t('명 선택')}` : t('친구를 고르면 시간표 공강이 겹치는 시간을 제안해요.')}>
          <FriendChips friends={friends} selected={invitees} onToggle={(id) => setInvitees((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id])} />
        </Field>
        <Field label={t('언제 (후보 시간)')} hint={t('2개 이상 골라주세요. 초대받은 사람이 되는 시간에 모두 표를 던져요.')}>
          {suggestions.length > 0 && (
            <View style={tw`mb-2`}>
              <View style={tw`flex-row items-center mb-1.5`}><Sparkles size={11} color={C.mint} /><Text style={tw`ml-1 text-[11px] font-bold text-mint`}>{lang === 'en' ? `Suggested from ${withTT} timetables` : `시간표 ${withTT}개의 공강이 겹치는 시간`}</Text></View>
              {suggestions.map((o) => (
                <Pressable key={key(o)} onPress={() => toggleOpt(o)} style={tw`flex-row items-center rounded-xl px-3 h-11 border mb-1.5 ${chosen.has(key(o)) ? 'border-primary bg-primary-soft' : 'border-line bg-white'}`}>
                  <Clock size={14} color={C.ink3} /><Text style={tw`flex-1 mx-2 text-[13px] text-ink`}>{optionLabel(o)}</Text>
                  <Tag tone="mint">{t('공강 겹침')}</Tag>
                  <View style={tw`ml-2 h-4 w-4 rounded border-2 ${chosen.has(key(o)) ? 'border-primary bg-primary' : 'border-line'}`} />
                </Pressable>
              ))}
            </View>
          )}
          {options.filter((o) => !suggestions.some((s) => key(s) === key(o))).map((o) => (
            <View key={key(o)} style={tw`flex-row items-center rounded-xl px-3 h-11 border border-primary bg-primary-soft mb-1.5`}>
              <Clock size={14} color={C.ink3} /><Text style={tw`flex-1 mx-2 text-[13px] text-ink`}>{optionLabel(o)}</Text>
              <Pressable onPress={() => toggleOpt(o)} hitSlop={8}><X size={14} color={C.ink} /></Pressable>
            </View>
          ))}
          <View style={tw`mt-1`}>
            <Input placeholder="YYYY-MM-DD" value={custom.date} onChangeText={(date) => setCustom({ ...custom, date })} />
            <View style={tw`flex-row items-center mt-1.5`}>
              <Input placeholder="HH:MM" value={custom.startTime} onChangeText={(startTime) => setCustom({ ...custom, startTime })} style={tw`flex-1 px-3`} />
              <View style={tw`w-1.5`} />
              <Input placeholder="HH:MM" value={custom.endTime} onChangeText={(endTime) => setCustom({ ...custom, endTime })} style={tw`flex-1 px-3`} />
              <View style={tw`w-1.5`} />
              <Button variant="secondary" icon={<Plus size={15} color={C.primary} />} disabled={custom.startTime >= custom.endTime || chosen.has(key(custom))} onPress={() => { toggleOpt({ ...custom }); }}>{t('추가')}</Button>
            </View>
          </View>
        </Field>
        <Field label={t('투표 마감')}><View style={tw`flex-row`}>{[24, 48, 72].map((h) => <Chip key={h} size="sm" active={hours === h} onPress={() => setHours(h)}>{h}{t('시간')}</Chip>)}</View></Field>
        <View style={tw`h-4`} />
      </View>
    </Screen>
  );
}
