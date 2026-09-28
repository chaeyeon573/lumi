import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Plus } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { nowActivities, ACTIVITY_CHIPS, TEAM_PURPOSE_CHIPS, teamItems, isTeamActivity } from '@core/lib/discover';
import { freeBlocks, todayIdx, fmtBlock, nowMin } from '@core/lib/timetable';
import { whosFree } from '@core/lib/social';
import { isTogetherType, daysUntil, dday } from '@core/lib/recommend';
import { todayISO, formatTime, formatDate } from '@core/lib/format';
import { CATEGORY_LABELS, PERSON_ROLE_LABELS, CREW_TYPE_LABELS, OPP_TYPE_LABELS } from '@core/lib/labels';
import type { Activity, Opportunity } from '@core/types';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { Tag as UiTag } from '@/ui';
import { Screen, Chip, ChipRow, PillRow, Avatar, Button, Empty, H1, Muted, C } from '@/ui';
import { JoinButton } from '@/components/JoinButton';
import { OpenSlotSheet } from '@/components/OpenSlotSheet';

/** 발견 — Free Right Now + Spontaneous Hangouts (Pastel Breeze). v2 부터 탭이 아니라 모임 탭에서 들어오는 화면 */
export default function DiscoverScreen() {
  const v = useViewer();
  const me = v.me;
  const [slot, setSlot] = useState<{ start: number; end: number } | null>(null);
  const today = todayIdx();
  const myFree = freeBlocks(me.timetable, today).filter((b) => b.end > nowMin());
  const nextFree = myFree[0] ? { start: Math.max(myFree[0].start, nowMin()), end: myFree[0].end } : null;

  return (
    <Screen title={t('지금 열린 만남')}>
      <View style={tw`mt-2 h-12 rounded-full bg-surface-2 flex-row items-center pl-4 pr-1.5`}>
        <View style={tw`h-2 w-2 rounded-full bg-primary mr-2`} />
        <Text numberOfLines={1} style={tw`flex-1 text-[14px] text-ink font-medium`}>{me.timetable.length === 0 ? t('시간표를 추가해보세요') : nextFree ? `${lang === 'en' ? 'Free' : '공강'} ${fmtBlock(nextFree)}` : t('오늘 수업 끝')}</Text>
        <Pressable onPress={() => (nextFree ? setSlot(nextFree) : nav('/timetable'))} style={tw`h-9 px-4 rounded-full bg-primary flex-row items-center`}><Plus size={14} color={C.onPrimary} /><Text style={tw`ml-1 text-white text-[13px] font-semibold`}>{nextFree ? t('열기') : t('시간표')}</Text></Pressable>
      </View>
      <View style={tw`pt-6`}><NowTab /></View>
      <View style={tw`pt-8`}><ActivitiesTab /></View>
      <View style={tw`pt-8`}><TeamsTab /></View>
      <OpenSlotSheet open={!!slot} onClose={() => setSlot(null)} day={today} block={slot} />
    </Screen>
  );
}

const NOW_CHIPS = [{ key: 'all', label: t('전체'), cats: null }, { key: 'coffee', label: t('커피'), cats: ['coffee'] }, { key: 'meal', label: t('점심'), cats: ['meal'] }, { key: 'study', label: t('공부'), cats: ['study', 'seminar'] }, { key: 'etc', label: t('기타'), cats: ['exercise', 'etc', 'club', 'performance', 'networking', 'school_event'] }] as const;

function NowTab() {
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const [chip, setChip] = useState<string>('all');
  const list = useMemo(() => nowActivities(v.visibleActivities, v.me.id), [v]);
  // 제휴 딜(store_deal)은 오늘 것 하나를 맨 위 카드로
  const partner = v.visibleActivities.find((a) => a.category === 'store_deal' && a.partner && a.date === todayISO());
  const cats = NOW_CHIPS.find((c) => c.key === chip)!.cats as readonly string[] | null;
  const shown = list.filter((x) => !cats || cats.includes(x.a.category));
  const snap = useMemo(() => ({ ...v.snap, organizations: orgs }), [v.snap, orgs]);
  const free = useMemo(() => whosFree(snap, v.me, (u) => v.canSeeField(u, 'timetable')), [snap, v]);
  const left = (m: number) => (m >= 60 ? `${Math.round(m / 60)}h` : `${m}m`) + (lang === 'en' ? ' left' : ' 남음');
  return (
    <View>
      <View style={tw`flex-row items-end justify-between mb-3`}><H1>{lang === 'en' ? 'Free Right Now' : '지금 시간 되는 사람'}</H1><Muted>{free.length}{lang === 'en' ? ' friends' : '명'}</Muted></View>
      {free.length === 0 ? <Muted style={tw`mb-6`}>{t('지금 시간이 비는 사람이 없어요.')}</Muted> : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`-mx-4 mb-7`} contentContainerStyle={tw`px-4`}>
          {free.slice(0, 10).map((p) => (
            <Pressable key={p.u.id} onPress={() => nav(`/users/${p.u.id}?propose=1&cat=${p.category ?? 'coffee'}`)} style={tw`items-center w-[68px] mr-4`}>
              <View style={tw`rounded-full border-2 border-accent p-0.5`}><Avatar emoji={p.u.avatar.emoji} hue={p.u.avatar.hue} url={p.u.avatar.url} size={60} /></View>
              <Text numberOfLines={1} style={tw`mt-1.5 text-[13px] font-semibold text-primary`}>{p.u.nickname}</Text>
              <Text style={tw`text-[11px] text-ink-3`}>{left(p.minutes)}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      <H1 style={tw`mb-3`}>{lang === 'en' ? 'Spontaneous Hangouts' : '지금 열린 활동'}</H1>
      <View style={tw`mb-4`}><ChipRow>{NOW_CHIPS.map((c) => <Chip key={c.key} active={chip === c.key} onPress={() => setChip(c.key)}>{c.label}{c.key === 'all' ? ` (${list.length})` : ''}</Chip>)}</ChipRow></View>
      {partner && (
        <Pressable onPress={() => nav(`/activities/${partner.id}`)} style={tw`rounded-full border border-line bg-gold-soft pl-2.5 pr-2.5 py-2 flex-row items-center mb-3`}>
          <View style={tw`h-11 w-11 rounded-full bg-white items-center justify-center`}><Text style={tw`text-[20px]`}>🏷️</Text></View>
          <View style={tw`flex-1 min-w-0 mx-3`}><View style={tw`flex-row items-center`}><Text numberOfLines={1} style={tw`text-[15px] font-semibold text-ink shrink`}>{partner.partner!.name}</Text><View style={tw`ml-2`}><UiTag tone="gold">{t('제휴')}</UiTag></View></View><Text numberOfLines={1} style={tw`text-[13px] text-ink-2`}>{partner.partner!.deal}</Text></View>
          <Button size="sm" onPress={() => nav(`/activities/${partner.id}`)}>{t('쿠폰 보기')}</Button>
        </Pressable>
      )}
      {shown.length === 0 ? <Empty title={t('이 시간에 열린 활동이 없어요')} action={<Button size="sm" onPress={() => nav('/create/activity?kind=personal&now=1')}>{t('즉석 만남')}</Button>} />
        : shown.map(({ a }) => { const host = v.userById(a.hostId); return (
          <PillRow key={a.id} onPress={() => nav(`/activities/${a.id}`)} avatar={<Avatar emoji={host?.avatar.emoji ?? '👤'} hue={host?.avatar.hue ?? 200} url={host?.avatar.url} size={44} />} title={a.title} sub={`${formatTime(a.startTime)} · ${a.place.name}`} action={<JoinButton activity={a} label={t('참여')} />} />
        ); })}
    </View>
  );
}

function ActivitiesTab() {
  const v = useViewer();
  const opps = useAppStore((s) => s.opportunities);
  const [chip, setChip] = useState('all');
  const f = ACTIVITY_CHIPS.find((c) => c.key === chip)!;
  const today = todayISO();
  const mySchool = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : '';
  const acts = v.visibleActivities.filter((a) => a.date >= today && !isTeamActivity(a) && a.category !== 'store_deal' && (!f.cats || f.cats.includes(a.category)));
  const together = opps.filter((o) => isTogetherType(o.type) && o.type !== 'activity' && (!o.schoolId || o.schoolId === mySchool) && (!o.date || o.date >= today) && (!o.deadline || daysUntil(o.deadline) >= 0) && (chip === 'all' || f.oppTypes?.includes(o.type)));
  type Item = { when: string; node: React.ReactNode };
  const items: Item[] = [
    ...acts.map((a): Item => ({ when: a.date + a.startTime, node: <ActivityRow key={`a_${a.id}`} a={a} /> })),
    ...together.map((o): Item => ({ when: (o.date ?? o.deadline ?? '9') + (o.startTime ?? ''), node: <OppRow key={`o_${o.id}`} o={o} /> })),
  ].sort((a, b) => a.when.localeCompare(b.when));
  return (
    <View>
      <H1 style={tw`mb-3`}>{lang === 'en' ? 'This Week' : '이번 주'}</H1>
      <View style={tw`mb-4`}><ChipRow>{ACTIVITY_CHIPS.map((c) => <Chip key={c.key} active={chip === c.key} onPress={() => setChip(c.key)}>{c.label}</Chip>)}</ChipRow></View>
      {items.length === 0 ? <Empty title={t('예정된 활동이 없어요')} action={<Button size="sm" onPress={() => nav('/create/activity?kind=group')}>{t('활동 만들기')}</Button>} /> : items.map((i) => i.node)}
    </View>
  );
}

function ActivityRow({ a }: { a: Activity }) {
  const v = useViewer();
  const host = v.userById(a.hostId); const org = a.orgId ? v.orgById(a.orgId) : undefined;
  const av = org ? org.logo : host?.avatar ?? { emoji: '👤', hue: 200 };
  return <PillRow onPress={() => nav(`/activities/${a.id}`)} avatar={<Avatar emoji={av.emoji} hue={av.hue} url={av.url} size={44} />} title={a.title} sub={`${formatDate(a.date)} ${formatTime(a.startTime)} · ${CATEGORY_LABELS[a.category]}`} action={<JoinButton activity={a} label={t('참여')} />} />;
}
function OppRow({ o }: { o: Opportunity }) {
  return <PillRow onPress={() => nav(`/opportunities/${o.id}`)} avatar={<View style={tw`h-11 w-11 rounded-full bg-primary-soft items-center justify-center`}><Text style={tw`text-[13px] font-bold text-primary`}>{OPP_TYPE_LABELS[o.type].slice(0, 2)}</Text></View>} title={o.title} sub={`${o.date ? formatDate(o.date) : ''}${o.deadline ? ` · ${dday(o.deadline)}` : ''}`} action={<Button size="sm" variant="secondary" onPress={() => nav(`/opportunities/${o.id}`)}>{t('보기')}</Button>} />;
}

function TeamsTab() {
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const opps = useAppStore((s) => s.opportunities);
  const [purpose, setPurpose] = useState('all');
  const mySchool = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : '';
  const items = useMemo(() => teamItems(v.visibleActivities, opps.filter((o) => !o.schoolId || o.schoolId === mySchool), orgs.filter((o) => o.schoolId === mySchool), v.me.id, v.approvedCount), [v, opps, orgs, mySchool]);
  const shown = items.filter((i) => purpose === 'all' || i.purpose === purpose);
  return (
    <View>
      <H1 style={tw`mb-3`}>{lang === 'en' ? 'Teams & Crews' : '팀 · Study Crew'}</H1>
      <View style={tw`mb-4`}><ChipRow>{TEAM_PURPOSE_CHIPS.map((c) => <Chip key={c.key} active={purpose === c.key} onPress={() => setPurpose(c.key)}>{c.label}</Chip>)}</ChipRow></View>
      {shown.length === 0 ? <Empty title={t('조건에 맞는 팀이 없어요')} action={<Button size="sm" onPress={() => nav('/create/activity?kind=group&team=1')}>{t('팀원 모집하기')}</Button>} />
        : shown.map((i) => {
          if (i.kind === 'org') return <PillRow key={i.id} onPress={() => nav(`/orgs/${i.org.id}`)} avatar={<Avatar emoji={i.org.logo.emoji} hue={i.org.logo.hue} url={i.org.logo.url} size={44} />} title={i.org.name} sub={`${i.org.memberIds.length}${lang === 'en' ? ' members' : '명'} · ${t('모집 중')}`} action={<Button size="sm" variant="secondary" onPress={() => nav(`/orgs/${i.org.id}`)}>{t('보기')}</Button>} />;
          if (i.kind === 'opp') return <OppRow key={i.id} o={i.opp} />;
          const a = i.activity; const host = v.userById(a.hostId);
          const sub = a.courseName ? `${a.courseName} · ${a.crewType ? CREW_TYPE_LABELS[a.crewType] : ''}` : (a.rolesNeeded ?? []).map((r) => PERSON_ROLE_LABELS[r]).join(' · ');
          return <PillRow key={i.id} onPress={() => nav(`/activities/${a.id}`)} avatar={<Avatar emoji={host?.avatar.emoji ?? '👤'} hue={host?.avatar.hue ?? 200} url={host?.avatar.url} size={44} />} title={a.title} sub={`${formatDate(a.date)} ${formatTime(a.startTime)} · ${sub}`} action={<JoinButton activity={a} label={t('참여')} />} />;
        })}
      <Text style={{ color: C.ink3, display: 'none' }} />
    </View>
  );
}
