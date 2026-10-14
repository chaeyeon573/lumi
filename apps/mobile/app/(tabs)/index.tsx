import { useMemo, useRef, useState } from 'react';
import { tw } from '@/tw';
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { SlidersHorizontal, Clock, Zap, Bookmark, Heart, BadgeCheck, Hand, X, Coffee, Utensils, BookOpen, MessageCircle } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { getPlatform } from '@core/platform';
import { LAST_SEEN_KEY } from '@/components/CreateSheet';
import { INTEREST_LABELS, GOAL_LABELS, ALL_INTERESTS, ALL_GOALS, AVAILABILITY_LABELS } from '@core/lib/labels';
import { commonInterests } from '@core/lib/relations';
import { matchScore, shareableReasons, type Reason } from '@core/lib/recommend';
import { statusNow, freeBlocks, todayIdx, nowMin, fmtBlock } from '@core/lib/timetable';
import type { User, Interest, Goal, ActivityCategory } from '@core/types';
import { ProposeSheet } from '@/components/a_ProposeSheet';
import { Deck, justDragged } from '@/components/Deck';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { AppHeader, C, BottomSheet, Chip, Button } from '@/ui';

const W = Dimensions.get('window').width;
const CARD_W = W - 32;
interface Filters { years: number[]; sameDept: boolean; sameClass: boolean; freeNow: boolean; interests: Interest[]; goals: Goal[] }
const EMPTY: Filters = { years: [], sameDept: false, sameClass: false, freeNow: false, interests: [], goals: [] };
const yearOf = (u: User) => (u.affiliation.type === 'university' ? Math.min(4, Math.max(1, new Date().getFullYear() - u.affiliation.year + 1)) : 0);
const gradYear = (u: User) => (u.affiliation.type === 'university' ? `'${String(u.affiliation.year + 4).slice(2)}` : '');

/** 사람 — 전체 화면 사진 카드, 옆으로 넘겨 보기 (Pastel Breeze) */
export default function PeopleScreen() {
  const run = useAppStore((s) => s.run);
  const opps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const v = useViewer();
  const me = v.me;
  const [idx, setIdx] = useState(0);
  const [saved, setSaved] = useState<string[]>([]);
  const [f, setF] = useState<Filters>(EMPTY);
  const [filterOpen, setFilterOpen] = useState(false);
  const [propose, setPropose] = useState<{ u: User; cat: ActivityCategory } | null>(null);
  const swipe = useRef<((dir: 'right' | 'left') => void) | null>(null);
  const myDept = me.affiliation.type === 'university' ? me.affiliation.department : '';

  type Card = { u: User; reasons: Reason[]; score: number };
  const scored: Card[] = useMemo(() => v.visibleUsers
    .map((u) => ({ u, ...matchScore(me, u, { opportunities: opps, opportunityIntents: intents }, v.canSeeField(u, 'timetable')) }))
    .map((x) => ({ ...x, score: x.score + commonInterests(me, x.u).length * 0.5 })), [v, me, opps, intents]);
  const passes = (u: User) => {
    if (f.years.length && !f.years.includes(yearOf(u))) return false;
    if (f.sameDept && !(u.affiliation.type === 'university' && u.affiliation.department === myDept)) return false;
    if (f.sameClass && !(u.timetable ?? []).some((c) => me.timetable.some((m) => m.name === c.name))) return false;
    if (f.freeNow && !((u.timetable?.length && v.canSeeField(u, 'timetable')) ? statusNow(u.timetable ?? []).kind === 'free' : u.availability === 'now')) return false;
    if (f.interests.length && !f.interests.some((i) => (u.interests ?? []).includes(i))) return false;
    if (f.goals.length && !f.goals.some((g) => (u.goals ?? []).includes(g))) return false;
    return true;
  };
  const cards = scored.filter((x) => passes(x.u)).sort((a, b) => b.score - a.score).slice(0, 20);
  const reset = () => setIdx(0);
  const tog = <T,>(arr: T[], x: T) => (arr.includes(x) ? arr.filter((y) => y !== x) : [...arr, x]);
  const chips: { key: string; label: string; clear: () => void }[] = [
    ...f.years.map((y) => ({ key: `y${y}`, label: `${y}${t('학년')}`, clear: () => setF({ ...f, years: f.years.filter((x) => x !== y) }) })),
    ...(f.sameDept ? [{ key: 'dept', label: t('같은 학과'), clear: () => setF({ ...f, sameDept: false }) }] : []),
    ...(f.sameClass ? [{ key: 'class', label: t('같은 수업'), clear: () => setF({ ...f, sameClass: false }) }] : []),
    ...(f.freeNow ? [{ key: 'free', label: t('지금 공강'), clear: () => setF({ ...f, freeNow: false }) }] : []),
    ...f.interests.map((i) => ({ key: `i${i}`, label: INTEREST_LABELS[i], clear: () => setF({ ...f, interests: f.interests.filter((x) => x !== i) }) })),
    ...f.goals.map((g) => ({ key: `g${g}`, label: GOAL_LABELS[g], clear: () => setF({ ...f, goals: f.goals.filter((x) => x !== g) }) })),
  ];
  const current = cards[idx];
  if (current) getPlatform().setItem(LAST_SEEN_KEY, current.u.id);
  const exhausted = !current && cards.length > 0;
  const onCampus = v.visibleUsers.filter((u) => u.timetable?.length ? statusNow(u.timetable ?? []).kind !== 'none' : u.availability !== 'hidden').length * 3 + 6;

  const message = async (u: User) => {
    if (!v.canMessage(u.id).ok) { nav(`/users/${u.id}`); return; }
    try { const res = await run(() => api.chats.openDirect(me.id, u.id)); nav(`/chats/${res.room.id}`); } catch { /* toast */ }
  };
  const connect = async (u: User) => {
    if (v.isFriend(u.id) || v.pendingOut(u.id)) { nav(`/users/${u.id}`); return; }
    try { await run(() => api.relationships.sendFriendRequest(me.id, u.id), `${u.nickname}${t('님에게 친구 요청을 보냈어요.')}`); } catch { /* */ }
  };
  const onSwipe = (c: Card, dir: 'right' | 'left') => {
    if (dir === 'right' && !(v.isFriend(c.u.id) || v.pendingOut(c.u.id))) run(() => api.relationships.sendFriendRequest(me.id, c.u.id), `${c.u.nickname}${t('님에게 친구 요청을 보냈어요.')}`).catch(() => {});
    setIdx((i) => i + 1);
  };
  const connected = current ? !!(v.isFriend(current.u.id) || v.pendingOut(current.u.id)) : false;
  const isSaved = current ? saved.includes(current.u.id) : false;

  return (
    <SafeAreaView edges={['top']} style={tw`flex-1 bg-white`}>
      <AppHeader people />
      <View style={tw`px-4 pt-1 pb-3 flex-row items-center`}>
        <View style={tw`h-9 px-3.5 rounded-full bg-surface-2 flex-row items-center`}>
          <View style={tw`h-2 w-2 rounded-full bg-primary mr-2`} />
          <Text style={tw`text-[13px] font-medium text-primary`}>{lang === 'en' ? `${onCampus} students on campus now` : `지금 캠퍼스에 ${onCampus}명`}</Text>
        </View>
        <View style={tw`flex-1`} />
        <Pressable onPress={() => setFilterOpen(true)} style={tw`h-10 w-10 rounded-full ${chips.length ? 'bg-primary' : 'bg-surface-2'} items-center justify-center`}><SlidersHorizontal size={18} color={C.ink2} /></Pressable>
      </View>

      {chips.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`shrink-0 max-h-10 -mt-1`} contentContainerStyle={tw`px-4 pb-2`}>{chips.map((c) => <Pressable key={c.key} onPress={() => { c.clear(); reset(); }} style={tw`h-8 pl-2.5 pr-3 mr-1.5 rounded-full bg-accent-soft flex-row items-center`}><X size={12} color={C.primary} /><Text style={tw`ml-1 text-[12px] font-semibold text-primary`}>{c.label}</Text></Pressable>)}</ScrollView>}
      {!current ? (
        <View style={tw`flex-1 items-center justify-center`}><Text style={tw`text-[15px] text-ink-3`}>{exhausted ? (lang === 'en' ? "You've seen everyone for now" : '지금은 여기까지 봤어요') : t('이 조건에 맞는 사람이 아직 없어요')}</Text><View style={tw`mt-3`}><Button size="sm" variant="outline" onPress={() => { if (!exhausted) setF(EMPTY); reset(); }}>{exhausted ? (lang === 'en' ? 'Start over' : '처음부터') : t('조건 지우기')}</Button></View></View>
      ) : (
        <View style={tw`flex-1`}>
          <View style={tw`flex-1 px-4`}>
            <Deck<Card> items={cards} index={idx} width={CARD_W} controlRef={swipe} labels={{ right: lang === 'en' ? 'Connect' : '친구', left: lang === 'en' ? 'Later' : '나중에' }}
              renderCard={(c, isTop) => <PersonSlide user={c.u} reasons={c.reasons} interactive={isTop} />} onSwipe={onSwipe} />
          </View>
          <View style={tw`pt-3 pb-1 items-center`}>
            <View style={[tw`flex-row items-center`, { gap: 32 }]}>
              <Pressable onPress={() => setSaved((s) => (isSaved ? s.filter((x) => x !== current.u.id) : [...s, current.u.id]))} style={tw`h-[60px] w-[60px] rounded-full items-center justify-center ${isSaved ? 'bg-primary' : 'bg-surface-2'}`}>
                <Bookmark size={26} color={isSaved ? '#fff' : C.primary} fill={isSaved ? '#fff' : 'none'} />
              </Pressable>
              <Pressable onPress={() => (connected ? connect(current.u) : swipe.current?.('right'))} style={[tw`h-[72px] w-[72px] rounded-full items-center justify-center ${connected ? 'bg-primary' : 'bg-accent'}`, { shadowColor: C.primary, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 10 }, elevation: 8 }]}>
                {connected ? <Hand size={32} color="#fff" /> : <Heart size={34} color={C.primary} />}
              </Pressable>
            </View>
            <View style={tw`mt-4 flex-row items-center`}>
              {([['coffee', t('커피'), Coffee], ['meal', t('점심'), Utensils], ['study', t('공부'), BookOpen]] as [ActivityCategory, string, typeof Coffee][]).map(([cat, label, Icon]) => (
                <Pressable key={cat} onPress={() => setPropose({ u: current.u, cat })} style={tw`h-9 pl-3 pr-3.5 mr-2 rounded-full bg-white border border-line flex-row items-center`}><Icon size={17} color={C.verify} /><Text style={tw`ml-1.5 text-[13px] font-medium text-ink`}>{label}</Text></Pressable>
              ))}
              <Pressable onPress={() => message(current.u)} style={tw`h-10 w-10 ml-1 rounded-full bg-primary items-center justify-center`}><MessageCircle size={18} color="#fff" /></Pressable>
            </View>
            <Text style={tw`mt-3 text-[12px] text-ink-3`}>{lang === 'en' ? 'Swipe card to connect · Tap card for details' : '카드를 밀면 친구 요청 · 누르면 프로필'}</Text>
          </View>
        </View>
      )}
      {propose && <ProposeSheet open onClose={() => setPropose(null)} user={propose.u} category={propose.cat} onCategory={(c) => setPropose({ ...propose, cat: c })} />}
      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title={t('조건')} tall>
        <FilterGroup label={t('학년')}>{[1, 2, 3, 4].map((y) => <Chip key={y} size="sm" active={f.years.includes(y)} onPress={() => setF({ ...f, years: tog(f.years, y) })}>{y}{t('학년')}</Chip>)}</FilterGroup>
        <FilterGroup label={t('관계')}><Chip size="sm" active={f.sameDept} onPress={() => setF({ ...f, sameDept: !f.sameDept })}>{t('같은 학과')}</Chip><Chip size="sm" active={f.sameClass} onPress={() => setF({ ...f, sameClass: !f.sameClass })}>{t('같은 수업')}</Chip><Chip size="sm" active={f.freeNow} onPress={() => setF({ ...f, freeNow: !f.freeNow })}>{t('지금 공강')}</Chip></FilterGroup>
        <FilterGroup label={t('관심사')}>{ALL_INTERESTS.map((i) => <Chip key={i} size="sm" active={f.interests.includes(i)} onPress={() => setF({ ...f, interests: tog(f.interests, i) })}>{INTEREST_LABELS[i]}</Chip>)}</FilterGroup>
        <FilterGroup label={t('이번 학기 목표')}>{ALL_GOALS.map((g) => <Chip key={g} size="sm" active={f.goals.includes(g)} onPress={() => setF({ ...f, goals: tog(f.goals, g) })}>{GOAL_LABELS[g]}</Chip>)}</FilterGroup>
        <View style={tw`flex-row pt-1`}><Button variant="outline" onPress={() => setF(EMPTY)}>{t('초기화')}</Button><View style={tw`w-2`} /><Button full onPress={() => { setFilterOpen(false); reset(); }}>{lang === 'en' ? `Show ${scored.filter((x) => passes(x.u)).length}` : `${scored.filter((x) => passes(x.u)).length}명 보기`}</Button></View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={tw`mb-4`}><Text style={tw`text-[12px] font-bold text-ink-3 mb-1.5`}>{label}</Text><View style={tw`flex-row flex-wrap gap-y-1.5`}>{children}</View></View>;
}

/** 카드: 사진 전체 + 아래 그라데이션 위에 이름·학과·찾는 것·칩 3개 */
function PersonSlide({ user, reasons, interactive = true }: { user: User; reasons: Reason[]; interactive?: boolean }) {
  const v = useViewer();
  const [pi, setPi] = useState(0);
  const photos = user.photos?.length ? user.photos : user.avatar.url ? [user.avatar.url] : [];
  const common = commonInterests(v.me, user);
  const want = v.canSeeField(user, 'prompts') && user.prompts?.[0]?.answer ? user.prompts[0].answer : user.nowWant;
  const reason = shareableReasons(reasons)[0];
  const dept = user.affiliation.type === 'university' && user.affiliation.showDepartment ? user.affiliation.department : '';
  const school = user.affiliation.type === 'university' && user.affiliation.showSchool && user.affiliation.schoolName ? user.affiliation.schoolName.replace(/대학교|University|UC /g, '').trim() : '';
  const canSeeTT = !!user.timetable?.length && v.canSeeField(user, 'timetable');
  const st = canSeeTT ? statusNow(user.timetable ?? []) : null;
  const block = canSeeTT ? freeBlocks(user.timetable ?? [], todayIdx()).find((b) => b.end > nowMin()) : null;
  const freeLabel = block ? `${t('공강')} ${fmtBlock({ start: st?.kind === 'free' ? Math.max(block.start, nowMin()) : block.start, end: block.end })}` : user.availability && user.availability !== 'hidden' ? AVAILABILITY_LABELS[user.availability] : null;
  const tap = (x: number) => {
    if (justDragged()) return;
    if (photos.length > 1 && x < CARD_W * 0.3) setPi((p) => (p - 1 + photos.length) % photos.length);
    else if (photos.length > 1 && x > CARD_W * 0.7) setPi((p) => (p + 1) % photos.length);
    else nav(`/users/${user.id}`);
  };
  return (
    <View style={[tw`flex-1 rounded-[32px] overflow-hidden bg-primary`, { width: CARD_W }]}>
      <Pressable style={{ flex: 1 }} disabled={!interactive} onPress={(e) => tap(e.nativeEvent.locationX)}>
        {photos.length > 0
          ? <Image source={getPlatform().asset(photos[pi]) as number} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" transition={150} />
          : <View style={tw`absolute inset-0 items-center justify-center`}><Text style={{ fontSize: 96 }}>{user.avatar.emoji}</Text></View>}
        <LinearGradient colors={['rgba(15,43,72,0)', 'rgba(15,43,72,0.25)', 'rgba(15,43,72,0.88)']} locations={[0.3, 0.55, 1]} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
      </Pressable>
      {photos.length > 1 && (
        <View style={[tw`absolute top-3 left-4 right-4 flex-row`, { gap: 4 }]}>
          {photos.map((_, i) => <View key={i} style={[tw`h-[3px] flex-1 rounded-full`, { backgroundColor: i === pi ? '#fff' : 'rgba(255,255,255,0.4)' }]} />)}
        </View>
      )}
      {freeLabel && (
        <View style={[tw`absolute top-6 left-4 h-8 pl-3 pr-3.5 rounded-full flex-row items-center`, { backgroundColor: 'rgba(255,255,255,0.88)' }]}>
          <Clock size={14} color={C.verify} /><Text style={tw`ml-1.5 text-[12px] font-semibold text-primary`}>{freeLabel}</Text>
        </View>
      )}
      {user.affiliation.type === 'university' && user.affiliation.emailVerified && (
        <View style={[tw`absolute top-6 right-4 h-8 w-8 rounded-full items-center justify-center`, { backgroundColor: 'rgba(255,255,255,0.88)' }]}><BadgeCheck size={16} color={C.verify} /></View>
      )}
      <View pointerEvents="none" style={tw`absolute left-0 right-0 bottom-0 p-6`}>
        <View style={[tw`flex-row items-baseline`, { gap: 8 }]}>
          <Text style={tw`text-[30px] font-bold text-white`}>{user.nickname}</Text>
          <Text style={tw`text-[22px] text-white opacity-90`}>{new Date().getFullYear() - user.birthYear + 1}</Text>
        </View>
        <Text style={tw`text-[15px] text-accent`}>{dept}{gradYear(user) ? ` • ${school} ${gradYear(user)}` : ''}</Text>
        {(want || reason) && (
          <View style={[tw`mt-2.5 self-start h-9 px-3.5 rounded-full flex-row items-center`, { backgroundColor: 'rgba(255,255,255,0.15)', maxWidth: '100%' }]}>
            <Zap size={15} color={C.accent} /><Text numberOfLines={1} style={tw`ml-2 text-[13px] font-medium text-white shrink`}>{want ?? reason?.text}</Text>
          </View>
        )}
        <View style={[tw`mt-3 flex-row flex-wrap`, { gap: 6 }]}>
          {(common.length ? common : user.interests ?? []).slice(0, 3).map((i) => (
            <View key={i} style={tw`h-8 px-3.5 rounded-full bg-primary-soft items-center justify-center`}><Text style={tw`text-[12px] font-semibold text-primary`}>{INTEREST_LABELS[i]}</Text></View>
          ))}
        </View>
      </View>
    </View>
  );
}
