import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Clock, UserPlus, Search, Bell, BellOff, ChevronRight, ChevronDown, Lock, Pencil, Sparkles, Bookmark, Star, Trash2, Plus, List, GalleryHorizontal, EyeOff } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { api } from '@core/api';
import type { Patch } from '@core/api/types';
import { useAppStore } from '@core/store/useAppStore';
import { getPlatform } from '@core/platform';
import { INTEREST_LABELS, ALL_INTERESTS } from '@core/lib/labels';
import { friendsOf } from '@core/lib/relations';
import { personLine, cityOf, sameCity, sameField } from '@core/lib/network';
import { recommendPeople, unexpectedConnections, emptySearch, SEARCH_GROUPS, groupsUsed, isAdvancedSearch, searchPresets, searchOptions, searchLabel, isEmptySearch, type SearchGroup, type RecommendedPerson } from '@core/lib/people';
import { matchReasons, shareableReasons, type Reason } from '@core/lib/recommend';
import { localeContext } from '@core/lib/locale-context';
import { wantsLine, hasWants } from '@core/lib/wants';
import { swipesLeft, isPlus, FREE_SWIPES_PER_DAY } from '@core/lib/monetization';
import { requestsForMe } from '@core/lib/requests';
import { aroundToday } from '@core/lib/around';
import { activeStatuses } from '@core/lib/status';
import { stageKind, stageCopy } from '@core/lib/stage';
import type { User, Interest, Stage, PeopleSearch, SavedSearch } from '@core/types';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { MoreSections } from '@/v2/HomeParts';
import { AppHeader, Segmented, Button, BottomSheet, Chip, Input, Avatar, Tag, Empty, C } from '@/ui';
import { PaywallSheet } from '@/components/PaywallSheet';
import { useSnapshot } from '@/v2/useSnapshot';
import { useSectionState } from '@/v2/useSectionState';
import { Section, SectionEmpty, SectionSkeleton, PrivacyNote } from '@/v2/SectionState';
import { ReasonChips } from '@/v2/ReasonChips';
import { PersonRow } from '@/v2/PersonRow';
import { StatusPill } from '@/v2/StatusPill';
import { SaveButton } from '@/v2/PersonActions';
import { PeopleDeck } from '@/v2/PeopleDeck';
import { useCloseness, closenessText, fmt, type Closeness } from '@/v2/personView';
import { NoteBubble } from '@/v2/PromptParts';
import { AiAskBar } from '@/v2/AiParts';

type Tab = 'recommend' | 'search' | 'connections';
const TABS: Tab[] = ['recommend', 'search', 'connections'];
const tog = <T,>(arr: T[], x: T) => (arr.includes(x) ? arr.filter((y) => y !== x) : [...arr, x]);
const criteriaParam =(c: PeopleSearch) => encodeURIComponent(JSON.stringify(c));

/**
 * People — 추천 | 찾기 | 연결 (웹 PeoplePage). 사람 → 관계 → 필요하면 모임.
 * 학교로 나누지 않는다: 다른 학교 사람·동문도 무료로 보인다. 유료는 "더 빠르고 정확하게 찾는 기능"뿐.
 */
export default function PeopleScreen() {
  const params = useLocalSearchParams<{ tab?: string; free?: string; q?: string; c?: string }>();
  const tab: Tab = TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'recommend';
  const setTab = (next: Tab) => router.setParams({ tab: next === 'recommend' ? '' : next, free: '' } as never);
  const [paywall, setPaywall] = useState<'limit' | 'open' | null>(null);
  return (
    <SafeAreaView edges={['top']} style={tw`flex-1 bg-white`}>
      <AppHeader search />
      <AiAskBar />
      <View style={tw`px-4 pb-2.5`}><Segmented<Tab> value={tab} onChange={setTab} options={[['recommend', t('추천')], ['search', t('찾기')], ['connections', t('연결')]]} /></View>
      {tab === 'recommend' && <RecommendTab openPaywall={() => setPaywall('open')} freeFirst={params.free === '1'} />}
      {tab === 'search' && <SearchTab key={`${params.q ?? ''}|${params.c ?? ''}`} openPaywall={() => setPaywall('open')} initialQ={params.q} initialC={params.c} />}
      {tab === 'connections' && <ConnectionsTab />}
      <PaywallSheet open={!!paywall} onClose={() => setPaywall(null)} reason={paywall === 'limit' ? 'limit' : undefined} />
    </SafeAreaView>
  );
}

// ─── 추천 — 조용한 허브(기본) · 한 장씩 보기(덱) ─────────────────────────────
const VIEW_KEY = 'aroundu.people.recommendView';
type RecView = 'hub' | 'deck';
const readView = (): RecView => { try { return getPlatform().getItem(VIEW_KEY) === 'deck' ? 'deck' : 'hub'; } catch { return 'hub'; } };

function RecommendTab({ openPaywall, freeFirst }: { openPaywall: () => void; freeFirst: boolean }) {
  const v = useViewer();
  const me = v.me;
  const snap = useSnapshot();
  const [view, setViewState] = useState<RecView>(() => (freeFirst ? 'deck' : readView()));
  useEffect(() => { if (freeFirst) setViewState('deck'); }, [freeFirst]);
  const setView = (x: RecView) => { setViewState(x); try { getPlatform().setItem(VIEW_KEY, x); } catch { /* */ } };
  const left = swipesLeft(me);
  const plus = isPlus(me);
  const used = plus ? 0 : FREE_SWIPES_PER_DAY - left;
  const incoming = useMemo(() => requestsForMe(snap, me), [snap, me]);

  return (
    <View style={tw`flex-1`}>
      {incoming.length > 0 && (
        <Pressable onPress={() => nav('/people/requests')} style={tw`mx-4 mb-2 h-9 pl-3.5 pr-2.5 rounded-full bg-accent-soft flex-row items-center`}>
          <Text numberOfLines={1} style={tw`flex-1 text-[12px] font-semibold text-primary`}>{t('혹시 여기에 해당되나요?')} · {incoming.length}{t('건')}</Text>
          <Text style={tw`text-[12px] font-semibold text-primary`}>{t('보기')}</Text><ChevronRight size={13} color={C.primary} />
        </Pressable>
      )}
      <View style={tw`px-4 pb-2 flex-row items-center`}>
        <Pressable onPress={() => nav('/profile/wants')} style={tw`flex-1 min-w-0 h-8 pl-3 pr-2 rounded-full bg-surface-2 flex-row items-center`}>
          {hasWants(me.wants)
            ? <><Text style={tw`text-[12px] font-semibold text-ink-3`}>{t('찾는 사람')}: </Text><Text numberOfLines={1} style={tw`flex-1 text-[12px] font-semibold text-primary`}>{wantsLine(me.wants)}</Text><Pencil size={11} color={C.primary} /><Text style={tw`ml-0.5 text-[12px] font-semibold text-primary`}>{t('편집')}</Text></>
            : <><Text numberOfLines={1} style={tw`flex-1 text-[12px] font-semibold text-ink-2`}>{t('찾는 사람을 설정하면 추천이 정확해져요')}</Text><Text style={tw`text-[12px] font-semibold text-primary`}>{t('설정')}</Text><ChevronRight size={13} color={C.primary} /></>}
        </Pressable>
        <Pressable onPress={openPaywall} accessibilityLabel="AroundU+" style={tw`ml-2 h-8 px-3 rounded-full flex-row items-center ${plus ? 'bg-primary' : left <= 2 ? 'bg-gold-soft' : 'bg-accent-soft'}`}>
          <UserPlus size={12} color={plus ? C.onPrimary : left <= 2 ? C.goldInk : C.primary} />
          <Text style={tw`ml-1 text-[12px] font-bold ${plus ? 'text-white' : left <= 2 ? 'text-gold' : 'text-primary'}`}>{plus ? '∞' : `${used}/${FREE_SWIPES_PER_DAY}`}</Text>
        </Pressable>
      </View>
      {freeFirst && <View style={tw`mx-4 mb-2 h-8 px-3 rounded-full bg-mint-soft flex-row items-center`}><Clock size={13} color={C.mint} /><Text style={tw`ml-1.5 text-[12px] font-semibold text-mint`}>{t('지금 공강인 사람 우선')}</Text></View>}
      {view === 'deck' ? (
        <>
          <View style={tw`px-4 pb-2 flex-row justify-end`}>
            <Pressable onPress={() => setView('hub')} style={tw`h-7 px-3 rounded-full border border-line bg-white flex-row items-center`}><List size={13} color={C.ink2} /><Text style={tw`ml-1 text-[12px] font-semibold text-ink-2`}>{t('목록으로 보기')}</Text></Pressable>
          </View>
          <PeopleDeck freeFirst={freeFirst} />
        </>
      ) : <QuietHub onDeck={() => setView('deck')} />}
    </View>
  );
}

/** 숨기기 + 5초 되돌리기 (웹 useHideWithUndo) */
function useHideWithUndo() {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [undo, setUndo] = useState<{ user: User; key: number } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const hide = async (user: User) => {
    try { await run(() => api.users.hide(v.me.id, 'person', user.id)); } catch { return; }
    if (timer.current) clearTimeout(timer.current);
    const key = Date.now();
    setUndo({ user, key });
    timer.current = setTimeout(() => setUndo((u) => (u?.key === key ? null : u)), 5000);
  };
  const restore = async () => {
    if (!undo) return;
    const u = undo.user; setUndo(null);
    try { await run(() => api.users.hide(v.me.id, 'person', u.id, true), t('다시 보이게 했어요')); } catch { /* toast */ }
  };
  const bar = undo ? (
    <View style={tw`absolute left-4 right-4 bottom-4 items-center`}>
      <View style={tw`h-11 pl-4 pr-1.5 rounded-full bg-ink flex-row items-center max-w-full`}>
        <Text numberOfLines={1} style={tw`text-[13px] font-semibold text-white shrink`}>{fmt(t('{name}님을 숨겼어요 · 상대는 몰라요'), { name: undo.user.nickname })}</Text>
        <Pressable onPress={restore} style={[tw`ml-3 h-8 px-3 rounded-full justify-center`, { backgroundColor: C.onDarkBtn }]}><Text style={tw`text-[13px] font-bold text-accent-soft`}>{t('되돌리기')}</Text></Pressable>
      </View>
    </View>
  ) : null;
  return { hide, bar };
}

function HubTitle({ title, right, sub }: { title: string; right?: ReactNode; sub?: string }) {
  return (
    <View style={tw`px-1 mb-2`}>
      <View style={tw`flex-row items-center`}><Text numberOfLines={1} style={tw`flex-1 text-[15px] font-bold text-ink`}>{title}</Text>{right}</View>
      {sub ? <Text style={tw`text-[12px] text-ink-3 mt-0.5`}>{sub}</Text> : null}
    </View>
  );
}
const LinkBtn = ({ label, onPress }: { label: string; onPress: () => void }) => <Pressable onPress={onPress} hitSlop={6} style={tw`flex-row items-center`}><Text style={tw`text-[12px] font-semibold text-verify`}>{label}</Text><ChevronRight size={13} color={C.verify} /></Pressable>;

/**
 * 조용한 허브 — 관리할 것 없이 둘러보기만 해도 되는 세로 스크롤.
 * (a) 단계별 첫 섹션(학부생: 지금 가까운 사람 · 대학원생: 같은 연구 분야 · 졸업생: 가까운 동문) (b) 이번 주 주변 (c) 시간 되는 사람 (d) 다른 학교, 비슷한 사람 (e) 저장한 사람 · 혹시 찾는 사람이 있나요?
 */
function QuietHub({ onDeck }: { onDeck: () => void }) {
  const v = useViewer();
  const me = v.me;
  const snap = useSnapshot();
  const kind = stageKind(me);
  const copy = stageCopy(kind);
  const closeness = useCloseness(snap, me.id);
  const { hide, bar } = useHideWithUndo();
  const [more, setMore] = useState(false);
  const secNear = useSectionState('people.near');
  const secAround = useSectionState('people.around', 420);
  const secOpen = useSectionState('people.open', 480);
  const secUnexp = useSectionState('people.unexpected', 540);

  const hidden = useMemo(() => new Set(me.hiddenPeople ?? []), [me.hiddenPeople]);
  const pool = useMemo(() => v.visibleUsers.filter((u) => !hidden.has(u.id)), [v.visibleUsers, hidden]);
  const ranked = useMemo(() => recommendPeople(snap, me, pool, (u) => v.canSeeField(u, 'timetable'), 30), [snap, me, pool, v]);
  /** 단계별 첫 섹션 — 대학원생은 연구 이유가 있는 사람, 졸업생은 같은 도시·분야 먼저 */
  const near: RecommendedPerson[] = useMemo(() => {
    if (kind === 'grad') {
      const research = ranked.filter((p) => p.reasons.some((r) => r.kind === 'research'));
      return research.length ? research : ranked;
    }
    if (kind === 'alumni') {
      const first = ranked.filter((p) => sameCity(p.user, me) || sameField(p.user, me));
      return [...first, ...ranked.filter((p) => !first.includes(p))];
    }
    return ranked;
  }, [ranked, kind, me]);
  const noResearchField = kind === 'grad' && !me.research?.field;
  const around = useMemo(() => aroundToday(snap, me), [snap, me]);
  const visible = (u: User) => !v.isBlocked(u.id) && !hidden.has(u.id);
  const openPeople = around.openNow.filter(visible);
  const unexpected = useMemo(() => unexpectedConnections(snap, me, pool, (u) => v.canSeeField(u, 'timetable'), 2), [snap, me, pool, v]);
  const savedCount = (me.savedPeople ?? []).filter((id) => v.visibleUsers.some((u) => u.id === id)).length;
  const shown = near.slice(0, more ? 12 : 4);

  const nextActions = (
    <View style={tw`flex-row flex-wrap justify-center`}>
      <View style={tw`m-1`}><Button size="sm" onPress={() => nav('/profile/wants')}>{t('찾는 사람 설정')}</Button></View>
      <View style={tw`m-1`}><Button size="sm" variant="outline" onPress={() => nav('/profile/edit')}>{t('프로필 보완')}</Button></View>
      <View style={tw`m-1`}><Button size="sm" variant="ghost" icon={<Search size={14} color={C.ink2} />} onPress={() => nav('/people/find')}>{t('사람 찾아보기')}</Button></View>
    </View>
  );

  return (
    <View style={tw`flex-1`}>
      <ScrollView contentContainerStyle={tw`px-4 pb-24`} showsVerticalScrollIndicator={false}>
        {/* (a) 단계별 첫 섹션 */}
        <HubTitle title={copy.peopleTitle} sub={copy.peopleSub} right={<Pressable onPress={onDeck} style={tw`h-7 px-3 rounded-full border border-line bg-white flex-row items-center`}><GalleryHorizontal size={13} color={C.ink2} /><Text style={tw`ml-1 text-[12px] font-semibold text-ink-2`}>{t('한 장씩 보기')}</Text></Pressable>} />
        {noResearchField && (
          <Pressable onPress={() => nav('/profile/edit')} style={tw`mb-2 rounded-2xl bg-accent-soft px-3.5 py-2.5 flex-row items-center`}>
            <Text style={tw`flex-1 text-[12px] font-semibold text-primary`}>🔬 {t('연구 분야를 알려주세요')}</Text><ChevronRight size={14} color={C.primary} />
          </Pressable>
        )}
        <Section loading={secNear.loading} error={secNear.error} onRetry={secNear.retry} skeleton={<SectionSkeleton count={3} />}
          empty={near.length === 0 && <SectionEmpty emoji="🌱" title={t('지금은 새 추천이 없어요')} description={t('찾는 사람을 정하거나 프로필을 채우면 가까운 사람이 보여요.')} action={nextActions} />}>
          {shown.map((c) => <NearCard key={c.user.id} user={c.user} reasons={c.reasons} closeness={closeness(c.user.id)} onHide={() => hide(c.user)} />)}
          {near.length > 4 && (
            <Pressable onPress={() => setMore((x) => !x)} style={tw`h-9 flex-row items-center justify-center`}>
              <Text style={tw`text-[12px] font-semibold text-primary`}>{more ? t('접기') : t('더 보기')}</Text>
              <ChevronDown size={13} color={C.primary} style={more ? { transform: [{ rotate: '180deg' }] } : undefined} />
            </Pressable>
          )}
          <PrivacyNote text={t('저장은 나만 봐요 · 상대에게 알리지 않아요')} />
        </Section>

        {/* (b) 이번 주 주변 */}
        <View style={tw`mt-5`}>
          <HubTitle title={t('이번 주 주변')} />
          <Section loading={secAround.loading} error={secAround.error} onRetry={secAround.retry} skeleton={<SectionSkeleton count={1} />}
            empty={around.viaFriends.length + around.inCity.length + openPeople.length === 0 && (
              <SectionEmpty emoji="🌤️" title={t('이번 주는 조용해요')} description={t('아무것도 안 해도 괜찮아요. 새로운 사람이 생기면 여기에 보여요.')}
                action={<Button size="sm" variant="outline" icon={<Search size={14} color={C.ink2} />} onPress={() => nav('/people/find')}>{t('사람 찾아보기')}</Button>} />
            )}>
            <View style={tw`rounded-[20px] bg-primary-soft p-1.5`}>
              <View style={[tw`rounded-[20px]`, { backgroundColor: C.glassSoft }]}>
                <AroundRow emoji="🤝" label={t('건너 아는 사람')} n={around.viaFriends.length} onPress={() => nav('/people/second')} />
                <AroundRow emoji="📍" label={around.city ? fmt(t('이번 주 {city}에 있는 사람'), { city: around.city }) : t('이번 주 같은 도시에 있는 사람')} n={around.inCity.length} onPress={() => nav('/people/around')} border />
                <AroundRow emoji="☕" label={t('지금 시간 되는 사람')} n={openPeople.length} onPress={() => nav('/people/around?open=1')} border />
              </View>
            </View>
            <PrivacyNote text={t('도시 단위로만 보여요 · 정확한 위치는 공유하지 않아요')} />
          </Section>
        </View>

        {/* 섹션 줄이기 — (c) 시간 되는 사람 · (d) 다른 학교, 비슷한 사람 · (e) 저장·찾아보기는 "더 보기" 카드 하나로 (누르면 그 자리에서 펼친다) */}
        <MoreSections top={20} titles={[t('시간 되는 사람'), t('다른 학교, 비슷한 사람'), t('저장한 사람'), t('혹시 찾는 사람이 있나요?')]}>
        {/* (c) Open To — 상태가 켜진 사람 */}
        <View style={tw`mt-5`}>
          <HubTitle title={t('시간 되는 사람')} right={openPeople.length > 3 ? <LinkBtn label={t('모두 보기')} onPress={() => nav('/people/around?open=1')} /> : undefined} />
          <Section loading={secOpen.loading} error={secOpen.error} onRetry={secOpen.retry} skeleton={<SectionSkeleton count={2} />}
            empty={openPeople.length === 0 && (
              <SectionEmpty emoji="☕" title={t('지금 시간 되는 사람이 없어요')} description={t('내 상태를 켜 두면 가까운 사람에게 가볍게 보여요.')}
                action={<Button size="sm" variant="outline" onPress={() => nav('/profile/open-to')}>{t('내 상태 켜기')}</Button>} />
            )}>
            <View style={tw`card`}>
              {openPeople.slice(0, 3).map((u, i) => <OpenRow key={u.id} user={u} closeness={closeness(u.id)} border={i > 0} />)}
            </View>
          </Section>
        </View>

        {/* (d) 다른 학교, 비슷한 사람 미리보기 */}
        <View style={tw`mt-5`}>
          <HubTitle title={t('다른 학교, 비슷한 사람')} right={<LinkBtn label={t('모두 보기')} onPress={() => nav('/people/unexpected')} />} />
          <Section loading={secUnexp.loading} error={secUnexp.error} onRetry={secUnexp.retry} skeleton={<SectionSkeleton count={2} />}
            empty={unexpected.length === 0 && <SectionEmpty emoji="🌿" title={t('새로운 추천이 없어요')} description={t('찾는 사람을 조정하거나 프로필을 채우면 새로운 사람이 보여요.')} action={nextActions} />}>
            {unexpected.map((c) => (
              <View key={c.user.id} style={tw`mb-2 card overflow-hidden`}>
                <View style={tw`bg-sky-soft px-3.5 pt-3 pb-2.5`}>
                  <View style={tw`flex-row items-center mb-1.5`}><Text style={tw`flex-1 text-[11px] font-bold text-ink-3`}>{t('어떤 점이 비슷한지')}</Text><ClosenessTag c={closeness(c.user.id)} /></View>
                  <ReasonChips reasons={c.reasons} max={3} />
                </View>
                <PersonRow user={c.user} compact actions bare />
              </View>
            ))}
          </Section>
        </View>

        {/* (e) 들어가는 길 */}
        <View style={tw`mt-5 card`}>
          <Pressable onPress={() => nav('/profile/saved')} style={tw`min-h-[52px] px-4 flex-row items-center`}>
            <View style={tw`h-8 w-8 rounded-full bg-primary-soft items-center justify-center`}><Bookmark size={15} color={C.primary} /></View>
            <Text style={tw`flex-1 ml-3 text-[14px] font-semibold text-ink`}>{t('저장한 사람')} <Text style={tw`text-ink-3`}>{savedCount}</Text></Text>
            <ChevronRight size={16} color={C.ink3} />
          </Pressable>
          <Pressable onPress={() => nav('/people/find')} style={tw`min-h-[52px] px-4 flex-row items-center border-t border-line`}>
            <View style={tw`h-8 w-8 rounded-full bg-accent-soft items-center justify-center`}><Search size={15} color={C.primary} /></View>
            <Text style={tw`flex-1 ml-3 text-[14px] font-semibold text-ink`}>{t('혹시 찾는 사람이 있나요?')}</Text>
            <ChevronRight size={16} color={C.ink3} />
          </Pressable>
        </View>
        </MoreSections>
      </ScrollView>
      {bar}
    </View>
  );
}

function ClosenessTag({ c }: { c: Closeness }) {
  return <View style={tw`h-6 px-2.5 rounded-full bg-white border border-primary-soft justify-center`}><Text numberOfLines={1} style={tw`text-[11px] font-bold text-primary`}>{closenessText(c)}</Text></View>;
}

/** 첫 섹션 카드 — 위: 거리·이유 / 아래: PersonRow(저장이 기본, 작은 연결) */
function NearCard({ user, reasons, closeness, onHide }: { user: User; reasons: Reason[]; closeness: Closeness; onHide: () => void }) {
  return (
    <View style={tw`mb-2 rounded-[20px] border border-line bg-white overflow-hidden`}>
      <View style={tw`px-3 pt-2.5 flex-row items-center`}>
        <ClosenessTag c={closeness} />
        <View style={tw`flex-1 min-w-0 ml-1.5`}><ReasonChips reasons={reasons} max={lang === 'en' ? 1 : 2} nowrap /></View>
        <Pressable onPress={onHide} accessibilityLabel={t('숨기기')} hitSlop={6} style={tw`h-7 w-7 rounded-full items-center justify-center`}><EyeOff size={14} color={C.ink3} /></Pressable>
      </View>
      <PersonRow user={user} actions bare />
    </View>
  );
}

function AroundRow({ emoji, label, n, onPress, border }: { emoji: string; label: string; n: number; onPress: () => void; border?: boolean }) {
  return (
    <Pressable onPress={onPress} style={tw`min-h-[48px] px-3.5 flex-row items-center ${border ? 'border-t border-line' : ''}`}>
      <Text style={tw`text-[16px]`}>{emoji}</Text>
      <Text numberOfLines={1} style={tw`flex-1 ml-2.5 text-[13px] font-semibold text-ink`}>{label}</Text>
      <Text style={tw`text-[15px] font-bold ${n > 0 ? 'text-ink' : 'text-ink-3'}`}>{n}{t('명')}</Text>
      <ChevronRight size={15} color={C.ink3} />
    </Pressable>
  );
}

/** 시간 되는 사람 한 줄 — 상태가 먼저, 그다음 사람 */
function OpenRow({ user, closeness, border }: { user: User; closeness: Closeness; border?: boolean }) {
  const statuses = activeStatuses(user);
  return (
    <View style={tw`px-3 py-2.5 flex-row items-center ${border ? 'border-t border-line' : ''}`}>
      <Pressable onPress={() => nav(`/users/${user.id}`)}><Avatar emoji={user.avatar.emoji} hue={user.avatar.hue} url={user.avatar.url} size={40} /></Pressable>
      <Pressable onPress={() => nav(`/users/${user.id}`)} style={tw`flex-1 min-w-0 mx-2.5`}>
        <View style={tw`flex-row items-center`}><StatusPill user={user} size="sm" />{statuses.length > 1 ? <Text style={tw`ml-1 text-[11px] text-ink-3`}>+{statuses.length - 1}</Text> : null}</View>
        <Text numberOfLines={1} style={tw`mt-0.5 text-[13px] font-bold text-ink`}>{user.nickname} <Text style={tw`text-[11px] font-semibold text-ink-3`}>· {closenessText(closeness)}</Text></Text>
      </Pressable>
      <SaveButton user={user} />
    </View>
  );
}

// ─── 찾기 — 한 줄로 물어보기 + 키워드 + 프리셋 + 저장한 검색 + 조건 행 ───────────────────
type SheetGroup = SearchGroup | 'company';
interface FRow { key: SheetGroup; label: string; detailed: boolean; summary: (c: PeopleSearch) => string[] }
const stageLabelOf = (s: Stage) => (s === 'alumni' ? t('졸업생') : s === 'masters' ? t('대학원') : t('학생'));

function SearchTab({ openPaywall, initialQ, initialC }: { openPaywall: () => void; initialQ?: string; initialC?: string }) {
  const v = useViewer();
  const me = v.me;
  const run = useAppStore((s) => s.run);
  const schools = useAppStore((s) => s.schools);
  const saved = useAppStore((s) => s.savedSearches).filter((s) => s.userId === me.id);
  const openAsks = useAppStore((s) => s.networkRequests).filter((r) => r.authorId === me.id && r.status === 'open').length;
  const plus = isPlus(me);
  const [c, setC] = useState<PeopleSearch>(() => {
    let from: Partial<PeopleSearch> = {};
    try { if (initialC) from = JSON.parse(initialC) as Partial<PeopleSearch>; } catch { /* 잘못된 조건은 무시 */ }
    return { ...emptySearch(), ...from, q: initialQ ?? from.q ?? '' };
  });
  const [sheet, setSheet] = useState<SheetGroup | null>(null);
  const [savedMenu, setSavedMenu] = useState<SavedSearch | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [ask, setAsk] = useState('');
  const ctx = localeContext();
  const opts = useMemo(() => searchOptions(v.users), [v.users]);
  const presets = useMemo(() => searchPresets(me, lang), [me]);
  const schoolName = (id: string) => schools.find((s) => s.id === id)?.name ?? id;
  const used = groupsUsed(c);
  const submitAsk = () => { const s = ask.trim(); if (s) nav(`/people/ask?q=${encodeURIComponent(s)}`); };

  const rows: FRow[] = [
    { key: 'schools', label: t('학교'), detailed: false, summary: (x) => x.schools.map(schoolName) },
    { key: 'majors', label: t('전공'), detailed: false, summary: (x) => x.majors },
    { key: 'gradYear', label: t('졸업연도'), detailed: true, summary: (x) => (x.gradYearFrom || x.gradYearTo ? [`${x.gradYearFrom ?? ''}–${x.gradYearTo ?? ''}`] : []) },
    { key: 'homeCities', label: t('거주 지역'), detailed: false, summary: (x) => x.homeCities },
    { key: 'activityCities', label: t('활동 지역'), detailed: true, summary: (x) => x.activityCities },
    { key: 'company', label: t('회사/업종'), detailed: true, summary: (x) => [...x.companies, ...x.industries] },
    { key: 'roles', label: t('직무'), detailed: true, summary: (x) => x.roles },
    { key: 'interests', label: t('관심사'), detailed: false, summary: (x) => x.interests.map((i) => INTEREST_LABELS[i]) },
    { key: 'stages', label: t('사용자 상태'), detailed: false, summary: (x) => x.stages.map(stageLabelOf) },
  ];

  /** 무료: 키워드 + 조건 1그룹. 2그룹 이상·상세 조건은 AroundU+ (isAdvancedSearch) */
  const search = (criteria: PeopleSearch, savedId?: string) => {
    if (isAdvancedSearch(criteria) && !plus) { openPaywall(); return; }
    nav(`/people/results?c=${criteriaParam(criteria)}${savedId ? `&saved=${savedId}` : ''}`);
  };
  const runSaved = async (s: SavedSearch) => {
    setRunningId(s.id);
    try { await run(() => api.searches.run(me.id, s.id)); } catch { /* toast */ } finally { setRunningId(null); }
    nav(`/people/results?c=${criteriaParam(s.criteria)}&saved=${s.id}`);
  };
  const presetActive = (p: { criteria: Partial<PeopleSearch> }) => searchLabel({ ...emptySearch(), ...p.criteria }, schoolName) === searchLabel(c, schoolName);

  return (
    <ScrollView contentContainerStyle={tw`pb-24`} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <View style={tw`px-4 pb-3`}>
        <View style={tw`h-12 rounded-full bg-sky-soft border border-primary-soft flex-row items-center pl-3.5 pr-1.5`}>
          <Text style={tw`text-[15px]`}>💬</Text>
          <TextInput style={tw`flex-1 mx-2 text-[14px] text-ink`} placeholderTextColor={C.ink3} placeholder={t('혹시 찾는 사람이 있나요? 예: 일본 식품 유통 아는 사람')} value={ask} onChangeText={setAsk} onSubmitEditing={submitAsk} returnKeyType="send" />
          <Pressable onPress={submitAsk} disabled={!ask.trim()} accessibilityLabel={t('사람 찾아보기')} style={tw`h-9 w-9 rounded-full bg-primary items-center justify-center ${ask.trim() ? '' : 'opacity-35'}`}><ChevronRight size={18} color={C.onPrimary} /></Pressable>
        </View>
        {openAsks > 0 && <Pressable onPress={() => nav('/people/requests?tab=mine')} style={tw`mt-1.5 ml-3 flex-row items-center`}><Text style={tw`text-[11px] font-semibold text-primary`}>{t('내가 찾는 것')} {openAsks}</Text><ChevronRight size={12} color={C.primary} /></Pressable>}
      </View>
      <View style={tw`px-4`}>
        <View style={tw`h-12 rounded-full border border-input-line bg-white flex-row items-center pl-3.5 pr-3`}>
          <Search size={17} color={C.ink3} />
          <TextInput style={tw`flex-1 ml-2 text-[15px] text-ink`} placeholderTextColor={C.ink3} placeholder={t('이름, 학교, 회사, 관심사')} value={c.q ?? ''} onChangeText={(q) => setC({ ...c, q })} onSubmitEditing={() => search(c)} returnKeyType="search" />
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`px-4 pt-3 pb-1 items-center`}>
        <Sparkles size={11} color={C.ink3} /><Text style={tw`ml-1 mr-2 text-[11px] font-bold text-ink-3`}>{t('추천 조건')}</Text>
        {presets.map((p) => <Chip key={p.label} size="sm" active={presetActive(p)} onPress={() => setC({ ...emptySearch(), ...p.criteria })}>{p.label}</Chip>)}
      </ScrollView>
      {(saved.length > 0 || plus) && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`px-4 py-1 items-center`}>
          <Bookmark size={11} color={C.ink3} /><Text style={tw`ml-1 mr-2 text-[11px] font-bold text-ink-3`}>{t('저장한 검색')}</Text>
          {saved.length === 0 && <Text style={tw`text-[11px] text-ink-3`}>{t('결과 화면에서 ☆ 로 저장해요')}</Text>}
          {saved.map((s) => (
            <Pressable key={s.id} onPress={() => runSaved(s)} onLongPress={() => setSavedMenu(s)} style={tw`h-7 pl-2.5 pr-1 mr-1.5 rounded-full border border-accent-soft bg-accent-soft flex-row items-center`}>
              {runningId === s.id ? <Clock size={11} color={C.primary} /> : <Star size={11} color={C.primary} fill={C.primary} />}
              <Text style={tw`ml-1 text-[12px] font-medium text-primary`}>{s.name}</Text>
              {s.alert ? <Bell size={11} color={C.primary} style={tw`ml-1`} /> : null}
              <Pressable onPress={() => setSavedMenu(s)} hitSlop={6} style={tw`h-5 w-5 items-center justify-center`}><ChevronDown size={12} color={C.ink3} /></Pressable>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={tw`mx-4 mt-2 card overflow-hidden`}>
        {rows.map((r, i) => { const vals = r.summary(c); return (
          <Pressable key={r.key} onPress={() => setSheet(r.key)} style={tw`h-12 px-4 flex-row items-center ${i > 0 ? 'border-t border-line' : ''}`}>
            <Text style={tw`text-[14px] font-semibold text-ink`}>{r.label}</Text>
            {r.detailed && !plus ? <View style={tw`ml-1.5 h-5 px-1.5 rounded-full bg-gold-soft flex-row items-center`}><Lock size={9} color={C.goldInk} /><Text style={tw`ml-0.5 text-[10px] font-bold text-gold`}>Plus</Text></View> : null}
            <Text numberOfLines={1} style={tw`flex-1 ml-2 text-right text-[13px] ${vals.length ? 'text-primary font-semibold' : 'text-ink-3'}`}>{vals.length ? vals.join(', ') : t('전체')}</Text>
            <ChevronRight size={16} color={C.ink3} />
          </Pressable>
        ); })}
      </View>

      <View style={tw`px-4 mt-3 flex-row items-center`}>
        <Text style={tw`flex-1 text-[12px] font-semibold ${used.length >= 2 && !plus ? 'text-gold' : 'text-ink-2'}`}>
          {t('조건')} {used.length}{t('개')}{plus ? '' : ` · ${t('무료는 1개까지')}`}
          {!plus && used.some((g) => SEARCH_GROUPS.find((x) => x.key === g)?.detailed) ? ` · ${t('상세 조건')}` : ''}
        </Text>
        {!isEmptySearch(c) && <Pressable onPress={() => setC(emptySearch())}><Text style={tw`text-[12px] font-semibold text-ink-3 underline`}>{t('초기화')}</Text></Pressable>}
      </View>
      <View style={tw`px-4 mt-3`}>
        <Button size="lg" icon={isAdvancedSearch(c) && !plus ? <Lock size={16} color={C.onPrimary} /> : <Search size={16} color={C.onPrimary} />} onPress={() => search(c)}>{t('이 조건으로 검색하기')}</Button>
        {!plus && <Text style={tw`mt-2 text-center text-[11px] text-ink-3`}>{t('사람을 만나는 데는 돈을 받지 않아요 — 더 빠르고 정확하게 찾는 기능만 AroundU+')}</Text>}
      </View>

      <FilterSheet group={sheet} onClose={() => setSheet(null)} c={c} setC={setC} opts={opts} ctx={ctx} schools={schools} />

      <BottomSheet open={!!savedMenu} onClose={() => setSavedMenu(null)} title={savedMenu?.name}>
        {savedMenu && (
          <View>
            <Text style={tw`text-[12px] text-ink-3 px-3 pb-1`}>{searchLabel(savedMenu.criteria, schoolName)} · {t('마지막')} {savedMenu.lastMatched}{t('명')}</Text>
            <MenuItem icon={savedMenu.alert ? <BellOff size={18} color={C.ink} /> : <Bell size={18} color={C.ink} />} label={savedMenu.alert ? t('새 사람 알림 끄기') : t('새 사람 알림 켜기')} onPress={() => { const s = savedMenu; setSavedMenu(null); run(() => api.searches.setAlert(s.id, !s.alert), s.alert ? t('새 사람 알림을 껐어요.') : t('새 사람 알림을 켰어요.')).catch(() => undefined); }} />
            <MenuItem icon={<Pencil size={18} color={C.ink} />} label={t('조건 불러오기')} onPress={() => { const s = savedMenu; setSavedMenu(null); setC(s.criteria); }} />
            <MenuItem danger icon={<Trash2 size={18} color={C.danger} />} label={t('삭제')} onPress={() => { const s = savedMenu; setSavedMenu(null); run(() => api.searches.remove(s.id), t('저장한 검색을 지웠어요.')).catch(() => undefined); }} />
          </View>
        )}
      </BottomSheet>
    </ScrollView>
  );
}

const MenuItem = ({ icon, label, onPress, danger }: { icon: ReactNode; label: string; onPress: () => void; danger?: boolean }) => (
  <Pressable onPress={onPress} style={tw`h-12 px-3 rounded-xl flex-row items-center`}>{icon}<Text style={tw`ml-3 text-[14px] font-semibold ${danger ? 'text-danger' : 'text-ink'}`}>{label}</Text></Pressable>
);

type StrField = 'majors' | 'homeCities' | 'activityCities' | 'companies' | 'industries' | 'roles';
const merge = (...lists: string[][]) => [...new Set(lists.flat().filter(Boolean))];
const Label = ({ children }: { children: ReactNode }) => <Text style={tw`text-[12px] font-bold text-ink-3 mb-1.5`}>{children}</Text>;
const Wrap = ({ children }: { children: ReactNode }) => <View style={tw`flex-row flex-wrap`}>{children}</View>;
const WChip = ({ active, onPress, children }: { active: boolean; onPress: () => void; children: ReactNode }) => <View style={tw`mb-1.5`}><Chip size="sm" active={active} onPress={onPress}>{children}</Chip></View>;

/** 조건 시트 — 그룹별 칩 (시드 값 + 로케일 프리셋 + 자유 입력) */
function FilterSheet({ group, onClose, c, setC, opts, ctx, schools }: { group: SheetGroup | null; onClose: () => void; c: PeopleSearch; setC: (c: PeopleSearch) => void; opts: ReturnType<typeof searchOptions>; ctx: ReturnType<typeof localeContext>; schools: { id: string; name: string }[] }) {
  const [text, setText] = useState('');
  useEffect(() => { setText(''); }, [group]);
  const title: Record<SheetGroup, string> = { schools: t('학교'), majors: t('전공'), gradYear: t('졸업연도'), homeCities: t('거주 지역'), activityCities: t('활동 지역'), company: t('회사/업종'), companies: t('회사'), industries: t('업종'), roles: t('직무'), interests: t('관심사'), stages: t('사용자 상태') };
  const year = new Date().getFullYear();
  const years = merge(opts.gradYears.map(String), Array.from({ length: 12 }, (_, i) => String(year - 8 + i))).map(Number).sort((a, b) => a - b);
  const detailed = group ? SEARCH_GROUPS.find((g) => g.key === group)?.detailed || group === 'company' : false;
  const chips = (field: StrField, options: string[], free?: boolean) => {
    const chosen = c[field];
    const all = merge(chosen, options);
    const add = () => { if (!text.trim()) return; setC({ ...c, [field]: merge(chosen, [text.trim()]) }); setText(''); };
    return (
      <View>
        {free && (
          <View style={tw`flex-row mb-2.5`}>
            <Input style={tw`flex-1`} placeholder={t('직접 입력')} value={text} onChangeText={setText} onSubmitEditing={add} />
            <View style={tw`w-2`} />
            <Button variant="outline" icon={<Plus size={14} color={C.ink2} />} disabled={!text.trim()} onPress={add}>{t('추가')}</Button>
          </View>
        )}
        <Wrap>{all.map((x) => <WChip key={x} active={chosen.includes(x)} onPress={() => setC({ ...c, [field]: tog(chosen, x) })}>{x}</WChip>)}</Wrap>
        {all.length === 0 && <Text style={tw`text-[12px] text-ink-3`}>{t('아직 선택지가 없어요. 직접 입력해보세요.')}</Text>}
      </View>
    );
  };
  return (
    <BottomSheet open={!!group} onClose={onClose} title={group ? title[group] : ''} tall>
      {detailed && <View style={tw`mb-3 rounded-2xl bg-gold-soft px-3.5 py-2.5 flex-row items-center`}><Lock size={13} color={C.goldInk} /><Text style={tw`ml-2 flex-1 text-[12px] text-ink-2`}>{t('상세 조건은 AroundU+ 에서 검색할 수 있어요. 조건은 미리 골라둘 수 있어요.')}</Text></View>}
      {group === 'schools' && <Wrap>{schools.map((s) => <WChip key={s.id} active={c.schools.includes(s.id)} onPress={() => setC({ ...c, schools: tog(c.schools, s.id) })}>{s.name}</WChip>)}</Wrap>}
      {group === 'majors' && chips('majors', merge(opts.majors, ctx.majors), true)}
      {group === 'gradYear' && (
        <View>
          <Label>{t('부터')}</Label>
          <Wrap>{years.map((y) => <WChip key={y} active={c.gradYearFrom === y} onPress={() => setC({ ...c, gradYearFrom: c.gradYearFrom === y ? undefined : y })}>{y}</WChip>)}</Wrap>
          <View style={tw`h-3`} />
          <Label>{t('까지')}</Label>
          <Wrap>{years.map((y) => <WChip key={y} active={c.gradYearTo === y} onPress={() => setC({ ...c, gradYearTo: c.gradYearTo === y ? undefined : y })}>{y}</WChip>)}</Wrap>
        </View>
      )}
      {group === 'homeCities' && chips('homeCities', merge(opts.homeCities, ctx.cities))}
      {group === 'activityCities' && chips('activityCities', merge(opts.activityCities, ctx.cities))}
      {group === 'company' && (
        <View>
          <Label>{t('회사')}</Label>{chips('companies', opts.companies, true)}
          <View style={tw`h-4`} />
          <Label>{t('업종')}</Label>{chips('industries', merge(opts.industries, ctx.industries))}
        </View>
      )}
      {group === 'roles' && chips('roles', merge(opts.roles, ctx.roles), true)}
      {group === 'interests' && <Wrap>{ALL_INTERESTS.map((i) => <WChip key={i} active={c.interests.includes(i)} onPress={() => setC({ ...c, interests: tog<Interest>(c.interests, i) })}>{INTEREST_LABELS[i]}</WChip>)}</Wrap>}
      {group === 'stages' && <Wrap>{(['undergrad', 'masters', 'alumni'] as Stage[]).map((s) => <WChip key={s} active={c.stages.includes(s)} onPress={() => setC({ ...c, stages: tog<Stage>(c.stages, s) })}>{stageLabelOf(s)}</WChip>)}</Wrap>}
      <View style={tw`flex-row pt-5`}>
        <Button variant="outline" onPress={() => {
          if (group === 'gradYear') setC({ ...c, gradYearFrom: undefined, gradYearTo: undefined });
          else if (group === 'company') setC({ ...c, companies: [], industries: [] });
          else if (group) setC({ ...c, [group]: [] });
        }}>{t('초기화')}</Button>
        <View style={tw`w-2`} />
        <Button full onPress={onClose}>{t('적용')}</Button>
      </View>
    </BottomSheet>
  );
}

// ─── 연결 — 요청 · 연결 목록 · 팔로잉 ────────────────────────────────────────
function ConnectionsTab() {
  const v = useViewer();
  const me = v.me;
  const run = useAppStore((s) => s.run);
  const rel = useAppStore((s) => s.relationships);
  const [q, setQ] = useState('');
  const [followOpen, setFollowOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const incoming = rel.friendRequests.filter((r) => r.toId === me.id && r.status === 'pending').map((r) => ({ r, u: v.userById(r.fromId) })).filter((x): x is { r: typeof x.r; u: User } => !!x.u && !v.isBlocked(x.u.id));
  const outgoing = rel.friendRequests.filter((r) => r.fromId === me.id && r.status === 'pending').map((r) => ({ r, u: v.userById(r.toId) })).filter((x): x is { r: typeof x.r; u: User } => !!x.u);
  const friends = friendsOf(v.snap, me.id).map((id) => v.userById(id)).filter((u): u is User => !!u && !v.isBlocked(u.id));
  const following = rel.follows.filter((f) => f.fromId === me.id && f.targetType === 'user').map((f) => v.userById(f.toId)).filter((u): u is User => !!u);
  const lc = q.trim().toLowerCase();
  const list = friends.filter((u) => !lc || u.nickname.toLowerCase().includes(lc) || personLine(u, lang).toLowerCase().includes(lc) || (cityOf(u) ?? '').toLowerCase().includes(lc));
  const reasonsFor = (u: User) => shareableReasons(matchReasons(me, u, v.snap, v.canSeeField(u, 'timetable')));
  const act = async (id: string, fn: () => Promise<Patch>, msg?: string) => { setBusyId(id); try { await run(fn, msg); } catch { /* toast */ } finally { setBusyId(null); } };

  return (
    <ScrollView contentContainerStyle={tw`px-4 pb-24`} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {(incoming.length > 0 || outgoing.length > 0) && (
        <View style={tw`mb-3 rounded-[20px] bg-primary-soft p-3`}>
          <Text style={tw`px-1 text-[13px] font-bold text-primary`}>{t('받은 요청')} {incoming.length} · {t('보낸 요청')} {outgoing.length}</Text>
          {incoming.map(({ r, u }) => (
            <View key={r.id} style={tw`mt-1.5 rounded-2xl bg-white px-3 py-2`}>
              <View style={tw`flex-row items-center`}>
                <Pressable onPress={() => nav(`/users/${u.id}`)}><Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={40} /></Pressable>
                <View style={tw`flex-1 min-w-0 mx-2.5`}><Text numberOfLines={1} style={tw`text-[14px] font-bold text-ink`}>{u.nickname}</Text><Text numberOfLines={1} style={tw`text-[11px] text-ink-3`}>{personLine(u, lang)}</Text></View>
                <Button size="sm" variant="outline" loading={busyId === `d${r.id}`} onPress={() => act(`d${r.id}`, () => api.relationships.respondFriendRequest(r.id, false))}>{t('거절')}</Button>
                <View style={tw`w-1.5`} />
                <Button size="sm" loading={busyId === `a${r.id}`} onPress={() => act(`a${r.id}`, () => api.relationships.respondFriendRequest(r.id, true), `${u.nickname}${t('님과 연결되었어요.')}`)}>{t('수락')}</Button>
              </View>
              <NoteBubble note={r.note} />
            </View>
          ))}
          {outgoing.map(({ r, u }) => (
            <View key={r.id} style={tw`mt-1.5 rounded-2xl bg-white px-3 py-2 flex-row items-center`}>
              <Pressable onPress={() => nav(`/users/${u.id}`)}><Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={40} /></Pressable>
              <View style={tw`flex-1 min-w-0 mx-2.5`}><Text numberOfLines={1} style={tw`text-[14px] font-bold text-ink`}>{u.nickname}</Text><Text numberOfLines={1} style={tw`text-[11px] text-ink-3`}>{t('보낸 요청')} · {personLine(u, lang)}</Text></View>
              <Button size="sm" variant="outline" loading={busyId === `c${r.id}`} onPress={() => act(`c${r.id}`, () => api.relationships.cancelFriendRequest(r.id), t('요청을 취소했어요.'))}>{t('요청 취소')}</Button>
            </View>
          ))}
        </View>
      )}

      {friends.length === 0 ? (
        <Empty title={t('아직 연결이 없어요')} description={t('추천에서 마음에 드는 사람에게 연결 요청을 보내보세요.')} action={<Button size="sm" onPress={() => router.setParams({ tab: '' } as never)}>{t('추천 보기')}</Button>} />
      ) : (
        <>
          <View style={tw`flex-row items-center mb-2`}>
            <Text style={tw`text-[14px] font-bold text-ink`}>{t('연결')} <Text style={tw`text-ink-3`}>{friends.length}</Text></Text>
            <View style={tw`flex-1 ml-2 h-9 rounded-full border border-input-line flex-row items-center px-3`}><Search size={14} color={C.ink3} /><TextInput style={tw`flex-1 ml-1.5 text-[13px] text-ink`} placeholderTextColor={C.ink3} placeholder={t('연결 검색')} value={q} onChangeText={setQ} /></View>
          </View>
          {list.length === 0 ? <Empty title={t('검색 결과가 없어요')} /> : list.map((u) => <View key={u.id} style={tw`mb-2`}><PersonRow user={u} reasons={reasonsFor(u)} compact /></View>)}
        </>
      )}

      {following.length > 0 && (
        <View style={tw`mt-1 card overflow-hidden`}>
          <Pressable onPress={() => setFollowOpen((x) => !x)} style={tw`h-12 px-4 flex-row items-center`}>
            <Text style={tw`flex-1 text-[14px] font-bold text-ink`}>{t('팔로잉')} <Text style={tw`text-ink-3`}>{following.length}</Text></Text>
            <ChevronDown size={16} color={C.ink3} style={followOpen ? { transform: [{ rotate: '180deg' }] } : undefined} />
          </Pressable>
          {followOpen && <View style={tw`px-3 pb-3`}>{following.map((u) => (
            <View key={u.id} style={tw`mb-1.5 rounded-2xl bg-surface-2 px-3 py-2 flex-row items-center`}>
              <Pressable onPress={() => nav(`/users/${u.id}`)}><Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={36} /></Pressable>
              <View style={tw`flex-1 min-w-0 mx-2.5`}><Text numberOfLines={1} style={tw`text-[13px] font-bold text-ink`}>{u.nickname}</Text><Text numberOfLines={1} style={tw`text-[11px] text-ink-3`}>{personLine(u, lang)}</Text></View>
              {v.isFriend(u.id) ? <Tag tone="primary">{t('연결됨')}</Tag> : <Button size="sm" variant="outline" onPress={() => run(() => api.relationships.toggleFollow(me.id, u.id, 'user'), t('팔로우를 취소했어요.')).catch(() => undefined)}>{t('팔로우 취소')}</Button>}
            </View>
          ))}</View>}
        </View>
      )}
    </ScrollView>
  );
}
