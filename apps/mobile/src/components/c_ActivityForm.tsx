import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import type { ActivityInput } from '@core/api';
import type { ActivityCategory, ActivityKind, JoinPolicy, Visibility, CrewType, Role } from '@core/types';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { ALL_CATEGORIES, CATEGORY_EMOJI, CATEGORY_LABELS, JOIN_POLICY_LABELS, KIND_LABELS, ALL_CREW_TYPES, CREW_TYPE_LABELS, CREW_TYPE_EMOJI, MODE_LABELS, LOOKING_FOR_ROLES, OFFER_ROLES, PERSON_ROLE_LABELS } from '@core/lib/labels';
import { nowMin, toHHMM, todayIdx, toMin } from '@core/lib/timetable';
import { addDaysISO, todayISO } from '@core/lib/format';
import { PLACE_PRESETS } from '@core/data/places';
import { friendsOf } from '@core/lib/relations';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { replace } from '@/nav';
import { Screen, Button, Chip, Field, Input, Textarea, Empty, C } from '@/ui';
import { VisibilityList } from '@/components/c_VisibilityList';
import { ChipWrap, WrapItem, FriendChips, RadioRow, HuePicker, SelectChips } from '@/components/c_Form';

const COVER_HUES = [30, 220, 135, 285, 15, 175, 355, 100, 50, 235];

type Params = { kind?: string; now?: string; invite?: string; team?: string; crew?: string; opportunity?: string; org?: string; cat?: string; date?: string; start?: string; end?: string };

/** 활동 만들기·수정 폼 (웹 CreateActivityPage 와 동일). editId 가 있으면 수정 모드 */
export function ActivityForm({ editId }: { editId?: string }) {
  const params = useLocalSearchParams<Params>();
  const id = editId;
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const orgs = useAppStore((s) => s.organizations);
  const editing = id ? v.visibleActivities.find((a) => a.id === id) : undefined;
  const kind = (editing?.kind ?? (params.kind as ActivityKind) ?? 'personal') as ActivityKind;
  const schoolId = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : 's_yonsei';
  const presets = PLACE_PRESETS[schoolId] ?? PLACE_PRESETS[lang === 'en' ? 's_berkeley' : 's_yonsei'];
  const myOrgs = orgs.filter((o) => o.adminIds.includes(v.me.id) || o.memberIds.includes(v.me.id));
  const friends = useMemo(() => friendsOf(v.snap, v.me.id).map((fid) => v.userById(fid)!).filter(Boolean), [v]);
  const opps = useAppStore((s) => s.opportunities);
  const oppId = editing?.opportunityId ?? params.opportunity ?? undefined;
  const opp = oppId ? opps.find((o) => o.id === oppId) : undefined;
  const isTeam = !!params.team || !!opp?.rolesNeeded || !!editing?.rolesNeeded;
  const inviteId = params.invite;
  // Study Crew 모드: 수업 이름으로 묶이고 같은 수업 학생에게만 보인다
  const crewCourse = editing?.courseName ?? (params.crew ? decodeURIComponent(params.crew) : '') ?? '';
  const isCrew = !!crewCourse;
  // 지금 만날 사람: 30분 뒤 시작, 90분
  const isNow = !!params.now;
  const orgParam = params.org;
  const crewDefaults = (() => {
    if (!crewCourse) return null;
    const mine = v.me.timetable.filter((c) => c.name === crewCourse);
    const today = todayIdx();
    const upcoming = mine.map((c) => ({ c, d: (c.day - today + 7) % 7 })).filter((x) => x.d > 0 || toMin(x.c.end) > nowMin()).sort((a, b) => a.d - b.d || toMin(a.c.start) - toMin(b.c.start))[0];
    const start = upcoming ? toMin(upcoming.c.end) + 15 : 18 * 60;
    return { date: upcoming ? addDaysISO(upcoming.d) : todayISO(), start: toHHMM(Math.min(start, 21 * 60)), end: toHHMM(Math.min(start + 90, 22 * 60)) };
  })();
  const nowStart = Math.ceil((nowMin() + 30) / 15) * 15;

  const [form, setForm] = useState<ActivityInput>(() => editing ? { ...editing } : isCrew ? {
    kind: 'group', category: 'study', title: `${crewCourse} ${CREW_TYPE_LABELS.exam} Study Crew`, description: lang === 'en' ? `Study crew for ${crewCourse}. Split the material, explain to each other.` : `${crewCourse} 같이 준비해요. 범위 나눠서 서로 설명하기.`, cover: { emoji: '📝', hue: 220 },
    courseName: crewCourse, crewType: 'exam', mode: 'offline', date: crewDefaults!.date, startTime: crewDefaults!.start, endTime: crewDefaults!.end, place: presets[0], capacity: 4, fee: 0, conditions: '',
    joinPolicy: 'open', visibility: 'department', visibilityTargets: [`course:${crewCourse}`], invitedIds: [],
  } : {
    kind, category: (params.cat as ActivityCategory | undefined) ?? (kind === 'org_event' ? 'club' : opp ? (opp.type === 'hackathon' || opp.type === 'startup' ? 'networking' : 'study') : isNow ? 'meal' : 'coffee'), title: opp ? `${opp.title}${t(' 같이 준비해요')}` : '', description: opp ? `${opp.title}${t('에 함께 지원·참가할 사람을 찾아요.')}` : '', cover: opp ? opp.cover : { emoji: isNow ? '🍱' : '☕', hue: 30 },
    opportunityId: oppId, rolesNeeded: opp?.rolesNeeded ?? (isTeam ? [] : undefined), openSlot: isNow || undefined, mode: isTeam ? 'offline' : undefined,
    date: params.date ?? todayISO(), startTime: params.start ?? (isNow ? toHHMM(Math.min(nowStart, 23 * 60)) : '18:00'), endTime: params.end ?? (isNow ? toHHMM(Math.min(nowStart + 90, 23 * 60 + 30)) : '19:30'), place: presets[0], capacity: kind === 'personal' ? 4 : 10, fee: 0, conditions: '',
    joinPolicy: kind === 'personal' ? 'open' : 'approval', visibility: 'school', visibilityTargets: [], invitedIds: inviteId ? [inviteId] : [], orgId: kind === 'org_event' ? (orgParam && myOrgs.some((o) => o.id === orgParam) ? orgParam : myOrgs[0]?.id) : undefined,
  });
  const patch = (p: Partial<ActivityInput>) => setForm((f) => ({ ...f, ...p }));
  const setCategory = (c: ActivityCategory) => patch({ category: c, cover: { emoji: CATEGORY_EMOJI[c], hue: form.cover.hue } });
  const [busy, setBusy] = useState(false);
  const [customPlace, setCustomPlace] = useState(false);
  const [capacityText, setCapacityText] = useState(String(form.capacity));
  const [feeText, setFeeText] = useState(String(form.fee));

  if (id && !editing) return <Screen title={t('활동 수정')}><Empty title={t('수정할 수 없는 활동이에요')} /></Screen>;
  if (editing && editing.hostId !== v.me.id) return <Screen title={t('활동 수정')}><Empty title={t('주최자만 수정할 수 있어요')} /></Screen>;

  const valid = form.title.trim().length >= 2 && form.description.trim().length > 0 && !!form.place.name && form.capacity > 0 && form.startTime < form.endTime;
  const preview = `${form.date === todayISO() ? t('오늘') : form.date} ${form.startTime} ${form.place.name}${t('에서 ')}${form.title || '…'}`;

  const submit = async () => {
    setBusy(true);
    try {
      const input: ActivityInput = { ...form, conditions: form.conditions?.trim() || undefined, visibilityTargets: form.visibility === 'department' && !form.visibilityTargets?.length ? [v.me.affiliation.type === 'university' ? v.me.affiliation.department : ''] : form.visibilityTargets };
      if (editing) {
        await run(() => api.activities.update(editing.id, input), t('활동을 수정했어요.'));
        replace(`/activities/${editing.id}`);
      } else {
        const res = await run(() => api.activities.create(v.me.id, input), t('활동을 만들었어요!'));
        replace(`/activities/${res.activity.id}`);
      }
    } catch { setBusy(false); }
  };

  const title = editing ? t('활동 수정') : isCrew ? t('스터디 만들기') : isNow ? t('지금 만날 사람 찾기') : isTeam ? t('팀·준비방 만들기') : `${KIND_LABELS[kind]}${t(' 만들기')}`;
  const teamRoles = [...new Set([...OFFER_ROLES, ...LOOKING_FOR_ROLES.filter((r) => ['teammate', 'cofounder', 'study_partner', 'application_partner'].includes(r))])];

  return (
    <Screen title={title} footer={<View style={tw`flex-row`}><Button full size="lg" disabled={!valid} loading={busy} onPress={submit}>{editing ? t('수정 완료') : isCrew ? t('스터디 열기') : isNow ? t('지금 열기') : t('활동 만들기')}</Button></View>}>
      <View style={tw`py-4`}>
        {isNow && <View style={tw`rounded-xl bg-accent-soft px-3 py-2.5 mb-5`}><Text style={tw`text-[13px] text-ink`}>⚡ {t('30분 뒤 시작으로 맞춰뒀어요. 시간이 맞는 사람의 발견 › Now에 바로 보여요.')}</Text></View>}
        {isCrew && (
          <View style={tw`card p-3.5 mb-5`}>
            <View style={tw`flex-row items-center mb-3`}>
              <Text style={tw`text-[20px]`}>📚</Text>
              <View style={tw`ml-2 flex-1`}><Text style={tw`text-[11px] text-ink-3`}>{t('수업')}</Text><Text style={tw`text-[13px] font-bold text-ink`}>{crewCourse}</Text></View>
              <Text style={tw`text-[11px] text-ink-3`}>{t('같은 수업 학생에게만 보여요')}</Text>
            </View>
            <Field label={t('유형')}><ChipWrap>{ALL_CREW_TYPES.map((ct) => <WrapItem key={ct}><Chip size="sm" active={form.crewType === ct} onPress={() => patch({ crewType: ct as CrewType, title: `${crewCourse} ${CREW_TYPE_LABELS[ct]} Study Crew`, cover: { ...form.cover, emoji: CREW_TYPE_EMOJI[ct] } })}>{CREW_TYPE_EMOJI[ct]} {CREW_TYPE_LABELS[ct]}</Chip></WrapItem>)}</ChipWrap></Field>
            <Field label={t('방식')}><View style={tw`flex-row`}>{(['offline', 'online'] as const).map((m) => <Chip key={m} size="sm" active={form.mode === m} onPress={() => patch({ mode: m, place: m === 'online' ? { name: lang === 'en' ? 'Online (Zoom)' : '온라인 (Zoom)', lat: presets[0].lat, lng: presets[0].lng } : presets[0] })}>{MODE_LABELS[m]}</Chip>)}</View></Field>
          </View>
        )}
        {kind === 'org_event' && (
          <Field label={t('주최 조직')} hint={myOrgs.length ? undefined : t('가입된 조직이 없어 개인 이름으로 등록돼요. 학생 동아리 행사 등록은 무료예요.')}>
            {myOrgs.length ? <SelectChips value={form.orgId ?? ''} emptyLabel={t('개인 이름으로')} options={myOrgs.map((o) => [o.id, o.name] as [string, string])} onChange={(val) => patch({ orgId: val || undefined })} /> : null}
          </Field>
        )}
        {opp && <View style={tw`card p-3 flex-row items-center mb-5`}><Text style={tw`text-[24px]`}>{opp.cover.emoji}</Text><View style={tw`flex-1 ml-3`}><Text style={tw`text-[11px] text-ink-3`}>{t('연결된 기회')}</Text><Text style={tw`text-[13px] font-bold text-ink`}>{opp.title}</Text></View></View>}
        {isTeam && (
          <Field label={t('필요한 역할')} hint={t('맞는 역할을 가진 사람에게 먼저 추천돼요')}>
            <ChipWrap>{teamRoles.map((r) => <WrapItem key={r}><Chip size="sm" active={form.rolesNeeded?.includes(r)} onPress={() => patch({ rolesNeeded: form.rolesNeeded?.includes(r) ? form.rolesNeeded.filter((x) => x !== r) : [...(form.rolesNeeded ?? []), r as Role] })}>{PERSON_ROLE_LABELS[r]}</Chip></WrapItem>)}</ChipWrap>
          </Field>
        )}
        {inviteId && form.invitedIds?.includes(inviteId) && <View style={tw`rounded-xl bg-mint-soft px-3 py-2 mb-5`}><Text style={tw`text-[13px] text-ink`}>✅ {v.userById(inviteId)?.nickname}{t('님을 바로 참가자로 초대해요.')}</Text></View>}
        {isTeam && !isCrew && <Field label={t('방식')}><View style={tw`flex-row`}>{(['offline', 'online'] as const).map((m) => <Chip key={m} size="sm" active={form.mode === m} onPress={() => patch({ mode: m })}>{MODE_LABELS[m]}</Chip>)}</View></Field>}
        {!isCrew && <Field label={t('활동 종류')}>
          <ChipWrap>{ALL_CATEGORIES.map((c) => <WrapItem key={c}><Chip active={form.category === c} onPress={() => setCategory(c)}>{CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}</Chip></WrapItem>)}</ChipWrap>
        </Field>}
        <Field label={t('제목')}><Input placeholder={t('예: 오늘 오후 6시 신촌에서 커피 마실 사람?')} value={form.title} onChangeText={(title) => patch({ title })} maxLength={60} /></Field>
        <Field label={t('설명')}><Textarea placeholder={t('예: 창업이나 AI에 관심 있는 분이면 좋아요. 최대 4명.')} value={form.description} onChangeText={(description) => patch({ description })} maxLength={500} /></Field>
        <Field label={t('대표 이미지')} hint={t('데모에서는 색상과 이모지로 대표 이미지를 만들어요.')}>
          <View style={tw`flex-row items-center`}>
            <View style={[tw`h-16 w-16 rounded-2xl items-center justify-center mr-3`, { backgroundColor: `hsl(${form.cover.hue}, 80%, 88%)` }]}><Text style={tw`text-[30px]`}>{form.cover.emoji}</Text></View>
            <View style={tw`flex-1`}><HuePicker hues={COVER_HUES} value={form.cover.hue} onChange={(h) => patch({ cover: { ...form.cover, hue: h } })} /></View>
          </View>
        </Field>
        <Field label={t('날짜')}><Input placeholder="YYYY-MM-DD" value={form.date} onChangeText={(date) => patch({ date })} /></Field>
        <View style={tw`flex-row`}>
          <View style={tw`flex-1 mr-2`}><Field label={t('시작')}><Input placeholder="HH:MM" value={form.startTime} onChangeText={(startTime) => patch({ startTime })} /></Field></View>
          <View style={tw`flex-1`}><Field label={t('종료')}><Input placeholder="HH:MM" value={form.endTime} onChangeText={(endTime) => patch({ endTime })} /></Field></View>
        </View>
        <Field label={t('장소')} hint={t('선택한 장소만 지도에 표시돼요. 내 위치는 공개되지 않아요.')}>
          <View style={tw`mb-2`}><ChipWrap>{presets.map((p) => <WrapItem key={p.name}><Chip size="sm" active={form.place.name === p.name} onPress={() => { patch({ place: p }); setCustomPlace(false); }}>{p.name}</Chip></WrapItem>)}<WrapItem><Chip size="sm" active={customPlace} onPress={() => setCustomPlace(true)}>📍 {t('지도에서 직접')}</Chip></WrapItem></ChipWrap></View>
          {customPlace && (
            <View>
              <Input placeholder={t('장소 이름')} value={form.place.name} onChangeText={(name) => patch({ place: { ...form.place, name } })} />
              <View style={tw`mt-2 rounded-xl bg-surface-2 px-3 py-2.5 flex-row items-center`}><MapPin size={14} color={C.ink3} /><Text style={tw`ml-1.5 text-[12px] text-ink-3`}>{form.place.name || t('장소 이름')} · {form.place.lat.toFixed(4)}, {form.place.lng.toFixed(4)}</Text></View>
            </View>
          )}
        </Field>
        <View style={tw`flex-row`}>
          <View style={tw`flex-1 mr-3`}><Field label={t('모집 인원')}><Input keyboardType="number-pad" value={capacityText} onChangeText={(s) => { setCapacityText(s); patch({ capacity: Math.max(1, Number(s) || 0) }); }} /></Field></View>
          <View style={tw`flex-1`}><Field label={t('참가비 (원)')}><Input keyboardType="number-pad" value={feeText} onChangeText={(s) => { setFeeText(s); patch({ fee: Math.max(0, Number(s) || 0) }); }} /></Field></View>
        </View>
        <Field label={t('참가 조건 (선택)')}><Input placeholder={t('예: 창업이나 AI에 관심 있는 분')} value={form.conditions ?? ''} onChangeText={(conditions) => patch({ conditions })} /></Field>
        <Field label={t('참가 승인 방식')}>
          {(Object.keys(JOIN_POLICY_LABELS) as JoinPolicy[]).map((j) => <RadioRow key={j} label={JOIN_POLICY_LABELS[j]} active={form.joinPolicy === j} onPress={() => patch({ joinPolicy: j })} />)}
          {form.joinPolicy === 'invite' && (
            <View style={tw`mt-2`}><Text style={tw`text-[12px] text-ink-3 mb-1.5`}>{t('초대할 친구')}</Text><FriendChips friends={friends} selected={form.invitedIds ?? []} onToggle={(fid) => patch({ invitedIds: form.invitedIds?.includes(fid) ? form.invitedIds.filter((x) => x !== fid) : [...(form.invitedIds ?? []), fid] })} /></View>
          )}
        </Field>
        {isCrew ? <View style={tw`rounded-xl bg-primary-soft px-3 py-2.5 mb-4`}><Text style={tw`text-[13px] text-ink`}>🔒 {t('공개 범위: 같은 수업을 듣는 사람만. 시간표에 이 수업이 있는 학생에게만 보여요.')}</Text></View> : <Field label={t('공개 범위')}>
          <VisibilityList value={form.visibility} options={['public', 'school', 'department', 'friends', 'selected']} onChange={(vis: Visibility) => patch({ visibility: vis })} />
          {form.visibility === 'department' && <Input style={tw`mt-2`} placeholder={t('학과·조직 이름 (예: 컴퓨터과학과)')} value={form.visibilityTargets?.[0] ?? ''} onChangeText={(s) => patch({ visibilityTargets: s ? [s] : [] })} />}
          {form.visibility === 'selected' && (
            <View style={tw`mt-2`}><FriendChips friends={friends} selected={form.visibilityTargets ?? []} onToggle={(fid) => patch({ visibilityTargets: form.visibilityTargets?.includes(fid) ? form.visibilityTargets.filter((x) => x !== fid) : [...(form.visibilityTargets ?? []), fid] })} /></View>
          )}
        </Field>}
        <View style={tw`rounded-xl bg-surface-2 px-3.5 py-3`}><Text style={tw`text-[12px] text-ink-2`}><Text style={tw`font-bold`}>{t('미리보기')}</Text> · {preview}</Text></View>
      </View>
    </Screen>
  );
}
