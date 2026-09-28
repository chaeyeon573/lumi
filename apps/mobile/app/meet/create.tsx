import { useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Vote, BookOpen, Users, ChevronRight } from 'lucide-react-native';
import { t } from '@core/i18n';
import type { ActivityInput } from '@core/api';
import type { ActivityCategory, Visibility } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { ALL_CATEGORIES, CATEGORY_EMOJI, CATEGORY_LABELS } from '@core/lib/labels';
import { myGroups } from '@core/lib/meet';
import { localeContext } from '@core/lib/locale-context';
import { cityOf } from '@core/lib/network';
import { todayISO } from '@core/lib/format';
import { tw } from '@/tw';
import { nav, replace } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Button, Field, Input, Segmented, Textarea, Toggle, C } from '@/ui';
import { MoreRow } from '@/v2/Network';
import { Row, Wrap, WChip } from '@/v2/Forms';

/** 모임이 다루는 공개 범위 4종 — 전체 / 내 학교 / 그룹 멤버 / 연결된 사람 */
type MeetVis = Extract<Visibility, 'public' | 'school' | 'group' | 'friends'>;
const CATS = ALL_CATEGORIES.filter((c) => c !== 'store_deal' && c !== 'school_event');
const HUE_OF: Record<ActivityCategory, number> = { coffee: 30, meal: 15, study: 220, exercise: 135, club: 285, performance: 320, school_event: 355, seminar: 175, networking: 235, store_deal: 50, etc: 200 };
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * /meet/create (웹 CreateMeetPage) — 한 화면 폼. 모임은 시간 · 장소 · 최대 인원 · 공개 범위만 다룬다 (활동 종류는 선택).
 * ?title= &category= &org= &date= &start= &end= 로 미리 채운다.
 */
export default function CreateMeetScreen() {
  const p = useLocalSearchParams<{ title?: string; category?: string; org?: string; date?: string; start?: string; end?: string }>();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const orgs = useAppStore((s) => s.organizations);
  const schools = useAppStore((s) => s.schools);
  const groups = myGroups(orgs, v.me);
  const schoolId = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : '';
  const center = schools.find((s) => s.id === schoolId)?.center ?? { lat: 0, lng: 0 };
  const ctx = localeContext();
  const cities = ctx.cities;
  const myCity = cityOf(v.me);
  const initialOrg = p.org && groups.some((o) => o.id === p.org) ? p.org : '';
  const initialCat = (p.category && (ALL_CATEGORIES as string[]).includes(p.category) ? p.category : 'etc') as ActivityCategory;

  const [title, setTitle] = useState(p.title ?? '');
  const [orgId, setOrgId] = useState<string>(initialOrg);
  const [date, setDate] = useState(p.date ?? todayISO());
  const [startTime, setStart] = useState(p.start ?? '18:00');
  const [endTime, setEnd] = useState(p.end ?? '19:30');
  const [city, setCity] = useState(myCity && cities.includes(myCity) ? myCity : cities[0]);
  const [placeName, setPlaceName] = useState('');
  const [capacity, setCapacity] = useState(4);
  const [vis, setVis] = useState<MeetVis>(initialOrg ? 'group' : 'school');
  const [approval, setApproval] = useState(false);
  const [category, setCategory] = useState<ActivityCategory>(initialCat);
  const [description, setDescription] = useState('');
  const [more, setMore] = useState(initialCat !== 'etc');
  const [busy, setBusy] = useState(false);

  const visOptions: [MeetVis, string][] = [['public', t('전체')], ['school', t('내 학교')], ...(orgId ? [['group', t('그룹 멤버')] as [MeetVis, string]] : []), ['friends', t('연결된 사람')]];
  const pickGroup = (id: string) => { setOrgId(id); if (!id && vis === 'group') setVis('school'); if (id && vis === 'school') setVis('group'); };
  const valid = title.trim().length >= 2 && placeName.trim().length > 0 && capacity > 0 && ISO.test(date) && HHMM.test(startTime) && HHMM.test(endTime) && startTime < endTime;

  const submit = async () => {
    setBusy(true);
    try {
      const input: ActivityInput = {
        kind: orgId ? 'group' : 'personal', category, title: title.trim(), description: description.trim(),
        cover: { emoji: CATEGORY_EMOJI[category], hue: HUE_OF[category] },
        date, startTime, endTime, place: { name: placeName.trim(), area: city, lat: center.lat, lng: center.lng },
        capacity, fee: 0, joinPolicy: approval ? 'approval' : 'open', visibility: vis, visibilityTargets: [], invitedIds: [],
        orgId: orgId || undefined,
      };
      const res = await run(() => api.activities.create(v.me.id, input), t('모임을 만들었어요.'));
      replace(`/activities/${res.activity.id}`);
    } catch { setBusy(false); }
  };

  return (
    <Screen title={t('모임 만들기')} footer={<Row><Button full size="lg" disabled={!valid} loading={busy} onPress={submit}>{t('모임 만들기')}</Button></Row>}>
      <View style={tw`py-4`}>
        {/* 1. 무엇을 · 어느 그룹에서 */}
        <Field label={`${t('제목')} *`}><Input placeholder={t('예: 목요일 저녁 러닝 같이 해요')} value={title} onChangeText={setTitle} maxLength={60} /></Field>
        {groups.length > 0 ? (
          <Field label={t('그룹')}>
            <Wrap><WChip active={!orgId} onPress={() => pickGroup('')}>{t('없음')}</WChip>{groups.map((o) => <WChip key={o.id} active={orgId === o.id} onPress={() => pickGroup(o.id)}>{o.logo.emoji} {o.name}</WChip>)}</Wrap>
          </Field>
        ) : null}

        {/* 2. 언제 · 어디서 */}
        <Field label={`${t('날짜')} *`}><Input placeholder="YYYY-MM-DD" value={date} onChangeText={setDate} /></Field>
        <View style={tw`flex-row`}>
          <View style={tw`flex-1 mr-1.5`}><Field label={`${t('시작')} *`}><Input placeholder="18:00" value={startTime} onChangeText={setStart} /></Field></View>
          <View style={tw`flex-1 ml-1.5`}><Field label={`${t('종료')} *`}><Input placeholder="19:30" value={endTime} onChangeText={setEnd} /></Field></View>
        </View>
        <Field label={`${t('장소')} *`} hint={ctx.cityHint}>
          <Wrap>{cities.map((c) => <WChip key={c} active={city === c} onPress={() => setCity(c)}>{c}</WChip>)}</Wrap>
          <Input style={tw`mt-1`} placeholder={t('장소 이름 (예: 학생회관 카페)')} value={placeName} onChangeText={setPlaceName} maxLength={60} />
        </Field>

        {/* 3. 몇 명 · 누구에게 */}
        <Field label={`${t('최대 인원')} *`}>
          <View style={tw`flex-row items-center`}>
            <Stepper onPress={() => setCapacity((n) => Math.max(1, n - 1))}>−</Stepper>
            <Input style={tw`mx-2 w-20 text-center`} keyboardType="number-pad" value={String(capacity)} onChangeText={(s) => setCapacity(Math.max(1, Math.min(999, Number(s.replace(/\D/g, '')) || 1)))} />
            <Stepper onPress={() => setCapacity((n) => Math.min(999, n + 1))}>+</Stepper>
          </View>
        </Field>
        <Field label={`${t('공개 범위')} *`}><Segmented<MeetVis> value={vis} onChange={setVis} options={visOptions} /></Field>

        {/* 더 보기 — 참가 승인 · 종류 · 설명 · 다른 방법으로 모으기 */}
        <MoreRow open={more} onToggle={() => setMore((x) => !x)} />
        {more ? (
          <View style={tw`mt-2`}>
            <View style={tw`mb-4 rounded-[24px] border border-line bg-white px-4`}><Toggle label={t('참가 승인')} description={t('켜면 신청을 확인한 뒤 참가가 확정돼요.')} checked={approval} onChange={setApproval} /></View>
            <Field label={t('종류 (선택)')}><Wrap>{CATS.map((c) => <WChip key={c} active={category === c} onPress={() => setCategory(c)}>{CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}</WChip>)}</Wrap></Field>
            <Field label={t('설명 (선택)')}><Textarea placeholder={t('어떤 사람과 무엇을 하고 싶은지 한두 줄이면 충분해요.')} value={description} onChangeText={setDescription} maxLength={500} /></Field>
            <Text style={tw`mb-2 text-[13px] font-semibold text-ink-3`}>{t('다른 방법으로 모으기')}</Text>
            <View style={tw`rounded-[24px] border border-line bg-white`}>
              <ExtraRow first icon={<Vote size={18} color={C.primary} />} title={t('같이 계획하기')} sub={t('시간 투표로 정하기')} to="/together/new" />
              <ExtraRow icon={<BookOpen size={18} color={C.primary} />} title={t('수업 Study Crew')} sub={t('시간표에서 수업을 골라요')} to="/timetable" />
              <ExtraRow icon={<Users size={18} color={C.primary} />} title={t('팀원 모집하기')} sub={t('역할별로 팀원을 모아요')} to="/create/activity?kind=group&team=1" />
            </View>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}

const Stepper = ({ onPress, children }: { onPress: () => void; children: string }) => (
  <Pressable onPress={onPress} style={tw`h-11 w-11 rounded-full bg-surface-2 items-center justify-center`}><Text style={tw`text-[18px] font-bold text-primary`}>{children}</Text></Pressable>
);

function ExtraRow({ icon, title, sub, to, first }: { icon: ReactNode; title: string; sub: string; to: string; first?: boolean }) {
  return (
    <Pressable onPress={() => nav(to)} style={tw`px-3.5 py-3 flex-row items-center ${first ? '' : 'border-t border-line'}`}>
      <View style={tw`h-9 w-9 rounded-full bg-primary-soft items-center justify-center`}>{icon}</View>
      <View style={tw`flex-1 min-w-0 mx-3`}><Text numberOfLines={1} style={tw`text-[14px] font-semibold text-primary`}>{title}</Text><Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{sub}</Text></View>
      <ChevronRight size={16} color={C.ink3} />
    </Pressable>
  );
}
