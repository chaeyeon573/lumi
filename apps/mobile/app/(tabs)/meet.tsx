import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Plus, Users, BadgeCheck, MapPin, Clock, ChevronRight, Vote, BookOpen, Zap, School, Map as MapIcon } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { nowActivities } from '@core/lib/discover';
import { freeBlocks, todayIdx, fmtBlock, nowMin } from '@core/lib/timetable';
import { todayISO, formatTime, formatDate } from '@core/lib/format';
import { recommendMeets, recommendGroups, myGroups, mySchedule, joinStateOf, GROUP_SCOPE_LABELS, GROUP_SCOPE_EMOJI, scopeOf } from '@core/lib/meet';
import { cityOf, sameSchool } from '@core/lib/network';
import { stageKind, stageCopy } from '@core/lib/stage';
import type { Activity, Organization, GroupScope } from '@core/types';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { TabScreen, AppHeader, Segmented, Chip, ChipRow, Button, Avatar, Cover, Tag, Empty, C } from '@/ui';
import { JoinButton } from '@/components/JoinButton';
import { OpenSlotSheet } from '@/components/OpenSlotSheet';
import { SchoolBadge } from '@/v2/SchoolBadge';

type Tab = 'recommend' | 'groups' | 'schedule';
/** 이전 주소(?tab=foryou|events|now)는 추천으로 */
const LEGACY_TABS: Record<string, Tab> = { foryou: 'recommend', events: 'recommend', now: 'recommend', recommend: 'recommend', groups: 'groups', schedule: 'schedule' };

/** 모임 — 추천 | 그룹 | 일정 (웹 MeetPage). 모임은 목적이 아니라 연결을 행동으로 잇는 수단이라 People 보다 가볍게 */
export default function MeetScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab: Tab = LEGACY_TABS[params.tab ?? 'recommend'] ?? 'recommend';
  const setTab = (tb: Tab) => router.setParams({ tab: tb === 'recommend' ? '' : tb } as never);
  return (
    <TabScreen header={<AppHeader right={<Pressable onPress={() => nav('/meet/create')} accessibilityLabel={t('만들기')} style={tw`mr-1 h-9 w-9 rounded-full bg-primary items-center justify-center`}><Plus size={18} color={C.onPrimary} /></Pressable>} />}>
      <Segmented<Tab> value={tab} onChange={setTab} options={[['recommend', t('추천')], ['groups', t('그룹')], ['schedule', t('일정')]]} />
      <View style={tw`pt-4`}>
        {tab === 'recommend' && <RecommendTab />}
        {tab === 'groups' && <GroupsTab />}
        {tab === 'schedule' && <ScheduleTab go={setTab} />}
      </View>
    </TabScreen>
  );
}

// ─── 공용 ──────────────────────────────────────────────────────────────────
function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return <View style={tw`flex-row items-center justify-between mb-2.5`}><Text style={tw`text-[13px] font-semibold text-ink-3`}>{children}</Text>{right}</View>;
}
const members = (o: Organization) => o.memberIds.length + o.adminIds.filter((a) => !o.memberIds.includes(a)).length;
const memberLabel = (n: number) => (lang === 'en' ? `${n} member${n === 1 ? '' : 's'}` : `${n}명`);

/** 그룹 성격 알약 — 학교 / 지역 · 도시 / 관심사 / 직업 */
function ScopePill({ org }: { org: Organization }) {
  const schools = useAppStore((s) => s.schools);
  const scope = scopeOf(org);
  const extra = scope === 'city' ? org.city : scope === 'school' ? schools.find((s) => s.id === org.schoolId)?.name : undefined;
  return <View style={tw`h-5 px-2 rounded-full bg-accent-soft justify-center max-w-[170px]`}><Text numberOfLines={1} style={tw`text-[11px] font-semibold text-primary`}>{GROUP_SCOPE_EMOJI[scope]} {GROUP_SCOPE_LABELS[scope]}{extra ? ` · ${extra}` : ''}</Text></View>;
}

/** 주최 한 줄 — 그룹 이름 또는 사람 + 학교 배지 */
function HostLine({ a }: { a: Activity }) {
  const v = useViewer();
  const host = v.userById(a.hostId);
  const org = a.orgId ? v.orgById(a.orgId) : undefined;
  if (a.official) return <Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{t('학교 공식')}</Text>;
  if (org) return <View style={tw`flex-row items-center`}><Avatar emoji={org.logo.emoji} hue={org.logo.hue} url={org.logo.url} size={16} /><Text numberOfLines={1} style={tw`ml-1 text-[12px] text-ink-3 shrink`}>{org.name}</Text></View>;
  if (!host) return null;
  return <View style={tw`flex-row items-center`}><Text numberOfLines={1} style={tw`text-[12px] text-ink-3 shrink`}>{host.nickname} · </Text><SchoolBadge user={host} size="sm" muted /></View>;
}

/** 추천 모임 카드 — cover · 제목 · 주최 · 일시 · 장소 · n/m · 이유 · [참여] */
function MeetCard({ a, reason }: { a: Activity; reason: string }) {
  const v = useViewer();
  const count = v.approvedCount(a.id);
  const open = () => nav(`/activities/${a.id}`);
  const place = [a.place.name, a.place.area].filter(Boolean).join(' · ');
  return (
    <View style={tw`mb-3 rounded-[24px] border border-line bg-white p-3 flex-row`}>
      <Pressable onPress={open}><Cover emoji={a.cover.emoji} hue={a.cover.hue} url={a.cover.url} size={76} radius={16} /></Pressable>
      <View style={tw`flex-1 min-w-0 ml-3`}>
        <Pressable onPress={open}>
          <Text numberOfLines={1} style={tw`text-[15px] font-bold text-primary`}>{a.title}</Text>
          <HostLine a={a} />
          <View style={tw`flex-row items-center mt-0.5`}><Clock size={11} color={C.ink3} /><Text numberOfLines={1} style={tw`ml-1 text-[12px] text-ink-2`}>{formatDate(a.date)} · {formatTime(a.startTime)}</Text></View>
          <View style={tw`flex-row items-center`}><MapPin size={11} color={C.ink3} /><Text numberOfLines={1} style={tw`ml-1 text-[12px] text-ink-2 shrink`}>{place}</Text></View>
        </Pressable>
        <View style={tw`mt-1.5 flex-row items-center`}>
          <Users size={11} color={C.ink3} />
          <Text numberOfLines={1} style={tw`flex-1 ml-1 mr-2 text-[12px] text-ink-3`}>{count}/{a.capacity >= 999 ? '∞' : a.capacity} {t('참여')} · <Text style={tw`text-primary font-medium`}>{reason}</Text></Text>
          <JoinButton activity={a} size="sm" label={lang === 'en' ? 'Join' : t('참여')} />
        </View>
      </View>
    </View>
  );
}

/** 그룹 카드 — 로고 · 이름 · 성격 알약 · 인원 · 한 줄 소개 · 이유 · [가입] */
function GroupCard({ org, reason }: { org: Organization; reason?: string }) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [busy, setBusy] = useState(false);
  const member = org.memberIds.includes(v.me.id) || org.adminIds.includes(v.me.id);
  const applied = org.applicantIds.includes(v.me.id);
  const open = () => nav(`/orgs/${org.id}`);
  const join = async () => {
    setBusy(true);
    try { await run(() => api.orgs.apply(org.id, v.me.id), org.joinPolicy === 'open' ? t('그룹에 가입했어요.') : t('가입 신청을 보냈어요.')); } catch { /* toast */ } finally { setBusy(false); }
  };
  return (
    <View style={tw`mb-3 rounded-[24px] border border-line bg-white p-3 flex-row items-start`}>
      <Pressable onPress={open}><Cover emoji={org.logo.emoji} hue={org.logo.hue} url={org.logo.url} size={52} radius={16} /></Pressable>
      <Pressable onPress={open} style={tw`flex-1 min-w-0 mx-3`}>
        <View style={tw`flex-row items-center`}><Text numberOfLines={1} style={tw`text-[15px] font-bold text-primary shrink`}>{org.name}</Text>{org.verified ? <BadgeCheck size={14} color={C.gold} style={tw`ml-1`} /> : null}</View>
        <View style={tw`flex-row items-center mt-0.5`}><ScopePill org={org} /><Text style={tw`ml-1.5 text-[12px] text-ink-3`}>{memberLabel(members(org))}</Text></View>
        <Text numberOfLines={1} style={tw`text-[13px] text-ink-2 mt-1`}>{org.description}</Text>
        {reason ? <Text numberOfLines={1} style={tw`text-[12px] text-primary font-medium mt-0.5`}>{reason}</Text> : null}
      </Pressable>
      {member ? <View style={tw`mt-1`}><Tag tone="mint">{t('가입됨')}</Tag></View>
        : applied ? <Button size="sm" variant="outline" disabled>{t('신청됨')}</Button>
        : <Button size="sm" loading={busy} onPress={join}>{t('가입')}</Button>}
    </View>
  );
}

// ─── 추천 ──────────────────────────────────────────────────────────────────

/** "지금" 스트립 (학부생만) — 공강 바(OpenSlotSheet) · 제휴 카드 · 지금 열린 만남. 있을 때만 */
function NowStrip() {
  const v = useViewer();
  const me = v.me;
  const [slot, setSlot] = useState<{ start: number; end: number } | null>(null);
  const today = todayIdx();
  const todayDate = todayISO();
  // 시간표가 없으면 "공강"이 의미 없으니 공강 바는 숨긴다 (제휴·지금 열린 만남은 그대로)
  const myFree = me.timetable.length ? freeBlocks(me.timetable, today).filter((b) => b.end > nowMin()) : [];
  const nextFree = myFree[0] ? { start: Math.max(myFree[0].start, nowMin()), end: myFree[0].end } : null;
  const partner = v.visibleActivities.find((a) => a.category === 'store_deal' && a.partner && a.date === todayDate);
  const now = useMemo(() => nowActivities(v.visibleActivities, me.id).slice(0, 3), [v, me.id]);
  if (!nextFree && !partner && now.length === 0) return null;
  return (
    <View style={tw`mb-5`}>
      <SectionLabel right={now.length ? <Pressable onPress={() => nav('/discover')} style={tw`flex-row items-center`}><Text style={tw`text-[12px] font-semibold text-primary`}>{t('전체보기')}</Text><ChevronRight size={13} color={C.primary} /></Pressable> : undefined}>{t('지금')}</SectionLabel>
      {nextFree && (
        <View style={tw`mb-2 h-12 rounded-full bg-surface-2 flex-row items-center pl-4 pr-1.5`}>
          <View style={tw`h-2 w-2 rounded-full bg-primary`} />
          <Text numberOfLines={1} style={tw`flex-1 ml-2 text-[14px] text-primary font-medium`}>{`${lang === 'en' ? 'Free' : '공강'} ${fmtBlock(nextFree)}`}</Text>
          <Pressable onPress={() => setSlot(nextFree)} style={tw`h-9 px-4 rounded-full bg-primary flex-row items-center`}><Plus size={14} color={C.onPrimary} /><Text style={tw`ml-1 text-[13px] font-semibold text-white`}>{t('열기')}</Text></Pressable>
        </View>
      )}
      {partner && (
        <Pressable onPress={() => nav(`/activities/${partner.id}`)} style={tw`mb-2 rounded-full bg-gold-soft border border-line pl-2.5 pr-2.5 py-2 flex-row items-center`}>
          <View style={tw`h-11 w-11 rounded-full bg-white items-center justify-center`}><Text style={tw`text-[20px]`}>🏷️</Text></View>
          <View style={tw`flex-1 min-w-0 mx-3`}>
            <View style={tw`flex-row items-center`}><Text numberOfLines={1} style={tw`text-[15px] font-semibold text-primary shrink`}>{partner.partner!.name}</Text><View style={tw`ml-2`}><Tag tone="gold">{t('제휴')}</Tag></View></View>
            <Text numberOfLines={1} style={tw`text-[13px] text-ink-2`}>{partner.partner!.deal}</Text>
          </View>
          <View style={tw`h-9 px-4 rounded-full bg-primary justify-center`}><Text style={tw`text-[13px] font-semibold text-white`}>{t('쿠폰 보기')}</Text></View>
        </Pressable>
      )}
      {now.map(({ a, inMin }) => <NowRow key={a.id} a={a} inMin={inMin} />)}
      <OpenSlotSheet open={!!slot} onClose={() => setSlot(null)} day={today} block={slot} />
    </View>
  );
}

/** 지금 열린 만남 한 줄 — 제목·시간·장소·n명 참여 중 + 같이 가기 */
function NowRow({ a, inMin }: { a: Activity; inMin: number }) {
  const v = useViewer();
  const host = v.userById(a.hostId);
  const n = v.approvedCount(a.id) + 1;
  const when = inMin <= 0 ? t('진행 중') : inMin < 60 ? (lang === 'en' ? `in ${inMin} min` : `${inMin}분 후`) : formatTime(a.startTime);
  const open = () => nav(`/activities/${a.id}`);
  return (
    <View style={tw`mb-2 rounded-full border border-line bg-white pl-2.5 pr-2.5 py-2 flex-row items-center`}>
      <Pressable onPress={open}><Avatar emoji={host?.avatar.emoji ?? '👤'} hue={host?.avatar.hue ?? 200} url={host?.avatar.url} size={44} /></Pressable>
      <Pressable onPress={open} style={tw`flex-1 min-w-0 mx-3`}>
        <Text numberOfLines={1} style={tw`text-[15px] font-semibold text-primary`}>{a.title}</Text>
        <Text numberOfLines={1} style={tw`text-[13px] text-ink-2`}>{when} · {a.place.name} · {n}{t('명 참여 중')}</Text>
      </Pressable>
      <JoinButton activity={a} size="sm" label={t('같이 가기')} />
    </View>
  );
}

type RecChip = 'all' | 'school' | 'interest' | 'city';

function RecommendTab() {
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const participations = useAppStore((s) => s.participations);
  const [chip, setChip] = useState<RecChip>('all');
  const kind = stageKind(v.me);
  const copy = stageCopy(kind);
  const recs = useMemo(() => recommendMeets(v.visibleActivities, v.me, v.users, orgs, participations, 30), [v, orgs, participations]);
  const myCity = cityOf(v.me) ?? '';
  const interestWords = [t('하고 싶은 활동'), t('관심사')];
  const list = recs.filter((r) => {
    if (chip === 'school') { const h = v.userById(r.a.hostId); return !!h && sameSchool(h, v.me); }
    if (chip === 'interest') return interestWords.some((w) => r.reason.includes(w));
    if (chip === 'city') return !!myCity && r.reason.includes(myCity);
    return true;
  });
  const chips: { key: RecChip; label: string }[] = [{ key: 'all', label: t('전체') }, { key: 'school', label: t('내 학교') }, { key: 'interest', label: t('관심사') }, { key: 'city', label: myCity || t('지역') }];
  return (
    <View>
      {kind === 'undergrad' && <NowStrip />}
      {/* 단계별 한 줄 + 만들기 예시 — 학부생: 공강·밥·스터디 / 대학원생: 리딩 그룹·학회 / 졸업생: 퇴근 후 작은 모임 */}
      <View style={tw`mb-4 rounded-[24px] bg-primary-soft p-3.5`}>
        <Text style={tw`text-[13px] font-semibold text-primary`}>{copy.meetHint}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`-mx-3.5 mt-2`} contentContainerStyle={tw`px-3.5`}>
          {copy.meetExamples.map((ex) => (
            <Pressable key={ex} onPress={() => nav(`/meet/create?title=${encodeURIComponent(ex)}`)} style={tw`h-8 pl-2.5 pr-3 mr-2 rounded-full bg-white flex-row items-center`}>
              <Plus size={13} color={C.primary} /><Text style={tw`ml-1 text-[12px] font-semibold text-primary`}>{ex}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <Pressable onPress={() => nav('/meet/tables')} style={tw`mb-4 h-12 rounded-full bg-accent-soft pl-4 pr-2 flex-row items-center`}>
        <Users size={16} color={C.primary} />
        <Text numberOfLines={1} style={tw`flex-1 ml-2 text-[14px] font-semibold text-primary`}>{t('작은 모임 · 4~6명')}</Text>
        <ChevronRight size={16} color={C.primary} />
      </Pressable>
      <View style={tw`mb-3`}><ChipRow>{chips.map((c) => <Chip key={c.key} active={chip === c.key} onPress={() => setChip(c.key)}>{c.label}</Chip>)}</ChipRow></View>
      {list.length === 0
        ? <Empty title={t('찾는 활동을 설정하면 더 잘 맞아요')} description={recs.length > 0 ? t('이 조건에 맞는 모임이 아직 없어요.') : undefined} action={<View style={tw`flex-row`}><Button size="sm" variant="outline" onPress={() => nav('/profile/wants')}>{t('설정')}</Button><View style={tw`w-2`} /><Button size="sm" icon={<Plus size={14} color={C.onPrimary} />} onPress={() => nav('/meet/create')}>{t('모임 만들기')}</Button></View>} />
        : list.map((r) => <MeetCard key={r.a.id} a={r.a} reason={r.reason} />)}
    </View>
  );
}

// ─── 그룹 ──────────────────────────────────────────────────────────────────
type GroupChip = 'all' | GroupScope;

function GroupsTab() {
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const [chip, setChip] = useState<GroupChip>('all');
  const mine = useMemo(() => myGroups(orgs, v.me), [orgs, v.me]);
  const recs = useMemo(() => recommendGroups(orgs, v.me, 8), [orgs, v.me]);
  const list = useMemo(() => {
    const recIds = new Set(recs.map((r) => r.o.id));
    const mineIds = new Set(mine.map((o) => o.id));
    const rest = orgs.filter((o) => !recIds.has(o.id) && !mineIds.has(o.id)).map((o) => ({ o, reason: undefined as string | undefined }));
    return [...recs.map((r) => ({ o: r.o, reason: r.reason as string | undefined })), ...rest].filter((x) => chip === 'all' || scopeOf(x.o) === chip);
  }, [orgs, recs, mine, chip]);
  const chips: { key: GroupChip; label: string }[] = [{ key: 'all', label: t('전체') }, ...(Object.keys(GROUP_SCOPE_LABELS) as GroupScope[]).map((k) => ({ key: k, label: GROUP_SCOPE_LABELS[k] }))];
  return (
    <View>
      <SectionLabel right={mine.length > 0 ? <Pressable onPress={() => nav('/community?tab=clubs&mine=1')}><Text style={tw`text-[12px] font-semibold text-primary`}>{t('전체 보기')}</Text></Pressable> : undefined}>{t('내 그룹')}</SectionLabel>
      {mine.length === 0
        ? <View style={tw`rounded-[24px] border border-line bg-white px-4 py-3`}><Text style={tw`text-[13px] text-ink-3`}>{t('아직 가입한 그룹이 없어요')}</Text></View>
        : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`-mx-4`} contentContainerStyle={tw`px-4`}>
            {mine.map((o) => (
              <Pressable key={o.id} onPress={() => nav(`/orgs/${o.id}`)} style={tw`w-[92px] mr-3 items-center`}>
                <Cover emoji={o.logo.emoji} hue={o.logo.hue} url={o.logo.url} size={56} radius={16} />
                <Text numberOfLines={1} style={tw`mt-1.5 text-[12px] font-semibold text-primary`}>{o.name}</Text>
                <Text style={tw`text-[11px] text-ink-3`}>{memberLabel(members(o))}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}
      <View style={tw`mt-3 flex-row`}><Button size="sm" variant="outline" icon={<Plus size={14} color={C.ink2} />} onPress={() => nav('/groups/new')}>{t('그룹 만들기')}</Button></View>
      <View style={tw`mt-6`}>
        <SectionLabel>{t('그룹 찾기')}</SectionLabel>
        <View style={tw`mb-3`}><ChipRow>{chips.map((c) => <Chip key={c.key} active={chip === c.key} onPress={() => setChip(c.key)}>{c.label}</Chip>)}</ChipRow></View>
        {list.length === 0
          ? <Empty title={t('그룹이 없어요')} description={t('원하는 그룹이 없다면 직접 만들어보세요.')} action={<Button size="sm" icon={<Plus size={14} color={C.onPrimary} />} onPress={() => nav('/groups/new')}>{t('그룹 만들기')}</Button>} />
          : list.map((x) => <GroupCard key={x.o.id} org={x.o} reason={x.reason} />)}
      </View>
    </View>
  );
}

// ─── 일정 ──────────────────────────────────────────────────────────────────
function ScheduleRow({ a, last }: { a: Activity; last?: boolean }) {
  const v = useViewer();
  const participations = useAppStore((s) => s.participations);
  const state = joinStateOf(a, v.me, participations);
  const label = state === 'host' ? t('주최') : state === 'pending' ? t('대기 중') : t('참여');
  return (
    <Pressable onPress={() => nav(`/activities/${a.id}`)} style={tw`px-3.5 py-3 flex-row items-center ${last ? '' : 'border-b border-line'}`}>
      <View style={tw`w-[64px]`}><Text numberOfLines={1} style={tw`text-[12px] font-semibold text-primary`}>{formatDate(a.date)}</Text><Text style={tw`text-[11px] text-ink-3`}>{formatTime(a.startTime)}</Text></View>
      <View style={tw`flex-1 min-w-0 mx-2`}><Text numberOfLines={1} style={tw`text-[14px] font-semibold text-primary`}>{a.title}</Text><Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{a.place.name}</Text></View>
      <Tag tone={state === 'host' ? 'primary' : state === 'pending' ? 'neutral' : 'mint'}>{label}</Tag>
      <ChevronRight size={16} color={C.ink3} />
    </Pressable>
  );
}

/** 모임 탭 하단의 조용한 확장 행 (웹 MeetExtraRows) + 모바일에서 탭이 아니게 된 기존 화면 입구 */
function MeetExtraRows() {
  const kind = stageKind(useViewer().me);
  const rows: { key: string; icon: ReactNode; title: string; sub: string; to: string }[] = [
    { key: 'together', icon: <Vote size={18} color={C.primary} />, title: t('같이 계획하기'), sub: t('시간 투표로 정하기'), to: '/together/new' },
    ...(kind === 'undergrad' ? [{ key: 'crew', icon: <BookOpen size={18} color={C.primary} />, title: t('수업 Study Crew'), sub: t('시간표에서 수업을 골라요'), to: '/timetable' }] : []),
    { key: 'team', icon: <Users size={18} color={C.primary} />, title: t('팀원 모집하기'), sub: t('역할별로 팀원을 모아요'), to: '/create/activity?kind=group&team=1' },
    { key: 'now', icon: <Zap size={18} color={C.primary} />, title: t('지금 열린 만남'), sub: t('즉석 만남 · 팀 모집'), to: '/discover' },
    { key: 'campus', icon: <School size={18} color={C.primary} />, title: t('캠퍼스'), sub: `${t('공고')} · ${t('단체')}`, to: '/community?tab=opportunities' },
    { key: 'map', icon: <MapIcon size={18} color={C.primary} />, title: t('지도'), sub: t('주변 활동'), to: '/map' },
  ];
  return (
    <View style={tw`rounded-[24px] border border-line bg-white overflow-hidden`}>
      {rows.map((m, i) => (
        <Pressable key={m.key} onPress={() => nav(m.to)} style={tw`px-3.5 py-3 flex-row items-center ${i ? 'border-t border-line' : ''}`}>
          <View style={tw`h-9 w-9 rounded-full bg-primary-soft items-center justify-center`}>{m.icon}</View>
          <View style={tw`flex-1 min-w-0 mx-3`}><Text numberOfLines={1} style={tw`text-[14px] font-semibold text-primary`}>{m.title}</Text><Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{m.sub}</Text></View>
          <ChevronRight size={16} color={C.ink3} />
        </Pressable>
      ))}
    </View>
  );
}

function ScheduleTab({ go }: { go: (tb: Tab) => void }) {
  const v = useViewer();
  const participations = useAppStore((s) => s.participations);
  const buckets = useMemo(() => mySchedule(v.visibleActivities, v.me, participations), [v, participations]);
  const total = buckets.reduce((n, b) => n + b.items.length, 0);
  return (
    <View>
      {total === 0
        ? <Empty title={t('아직 일정이 없어요')} action={<View style={tw`flex-row`}><Button size="sm" variant="outline" onPress={() => go('recommend')}>{t('추천 모임 보기')}</Button><View style={tw`w-2`} /><Button size="sm" icon={<Plus size={14} color={C.onPrimary} />} onPress={() => nav('/meet/create')}>{t('모임 만들기')}</Button></View>} />
        : (
          <View>
            {buckets.filter((b) => b.items.length > 0).map((b) => (
              <View key={b.key} style={tw`mb-5`}>
                <SectionLabel>{b.label} <Text style={tw`font-normal`}>{b.items.length}</Text></SectionLabel>
                <View style={tw`rounded-[24px] border border-line bg-white overflow-hidden`}>{b.items.map((a, i) => <ScheduleRow key={a.id} a={a} last={i === b.items.length - 1} />)}</View>
              </View>
            ))}
            <View style={tw`flex-row`}><Button size="sm" variant="outline" icon={<Plus size={14} color={C.ink2} />} onPress={() => nav('/meet/create')}>{t('모임 만들기')}</Button><View style={tw`w-2`} /><Button size="sm" variant="outline" onPress={() => nav('/plans')}>My Plans</Button></View>
          </View>
        )}
      <View style={tw`mt-6`}>
        <SectionLabel>{t('더 할 수 있는 것')}</SectionLabel>
        <MeetExtraRows />
      </View>
    </View>
  );
}
