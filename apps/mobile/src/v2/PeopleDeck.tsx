import { useMemo, useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Clock, X, UserPlus, CalendarPlus, Search } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { getPlatform } from '@core/platform';
import { INTEREST_LABELS } from '@core/lib/labels';
import { commonInterests } from '@core/lib/relations';
import { recommendPeople } from '@core/lib/people';
import { personLine, cityOf } from '@core/lib/network';
import { statusNow, freeBlocks, todayIdx, nowMin, fmtBlock } from '@core/lib/timetable';
import type { Reason } from '@core/lib/recommend';
import type { User, ActivityCategory } from '@core/types';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { Button, Empty, C } from '@/ui';
import { Deck, justDragged } from '@/components/Deck';
import { ProposeSheet } from '@/components/a_ProposeSheet';
import { LAST_SEEN_KEY } from '@/components/CreateSheet';
import { useSnapshot } from './useSnapshot';
import { useConnect } from './PersonActions';
import { ReasonChips, ReasonList } from './ReasonChips';
import { SchoolBadge } from './SchoolBadge';

const W = Dimensions.get('window').width;
const CARD_W = W - 32;
type Card = { user: User; reasons: Reason[] };

/**
 * 한 장씩 보기 (웹 PeoplePage RecommendDeck) — 사람 탭 추천의 덱 모드. 이전 모바일 "사람" 탭의 스와이프 덱을 그대로 쓴다.
 * 오른쪽으로 밀면 연결 요청, 왼쪽은 패스. 카드에는 사진 위에 이유 칩이 먼저 보인다. freeFirst 면 지금 공강인 사람 먼저.
 */
export function PeopleDeck({ freeFirst }: { freeFirst?: boolean }) {
  const v = useViewer();
  const me = v.me;
  const snap = useSnapshot();
  const [idx, setIdx] = useState(0);
  const [propose, setPropose] = useState<{ u: User; cat: ActivityCategory } | null>(null);
  const { busy, connect, sheet } = useConnect();
  const swipe = useRef<((dir: 'right' | 'left') => void) | null>(null);
  const hidden = useMemo(() => new Set(me.hiddenPeople ?? []), [me.hiddenPeople]);
  const cards: Card[] = useMemo(() => {
    const list = recommendPeople(snap, me, v.visibleUsers.filter((u) => !hidden.has(u.id)), (u) => v.canSeeField(u, 'timetable'), 20);
    if (!freeFirst) return list;
    const free = (u: User) => u.timetable.length > 0 && v.canSeeField(u, 'timetable') && statusNow(u.timetable).kind === 'free';
    return [...list.filter((x) => free(x.user)), ...list.filter((x) => !free(x.user))];
  }, [snap, me, v, hidden, freeFirst]);
  const current = cards[idx];
  if (current) getPlatform().setItem(LAST_SEEN_KEY, current.user.id);
  const connected = current ? v.isFriend(current.user.id) : false;
  const requested = current ? !!v.pendingOut(current.user.id) : false;

  const onSwipe = async (c: Card, dir: 'right' | 'left') => {
    if (dir === 'right') { const ok = await connect(c.user); if (!ok) return; }
    setIdx((i) => i + 1);
  };

  if (!current) {
    return (
      <View style={tw`flex-1 items-center justify-center px-6`}>
        <Empty title={t('오늘 추천은 여기까지')} description={t('찾기에서 조건으로 직접 찾거나, 찾는 사람을 바꾸면 새 추천이 와요.')}
          action={<View style={tw`items-center`}><Button size="sm" icon={<Search size={14} color={C.onPrimary} />} onPress={() => nav('/people?tab=search')}>{t('찾기에서 직접 찾기')}</Button><View style={tw`h-2`} /><Button size="sm" variant="outline" onPress={() => nav('/profile/wants')}>{t('찾는 사람 바꾸기')}</Button>{idx > 0 ? <><View style={tw`h-2`} /><Button size="sm" variant="outline" onPress={() => setIdx(0)}>{lang === 'en' ? 'Start over' : '처음부터'}</Button></> : null}</View>} />
      </View>
    );
  }

  return (
    <View style={tw`flex-1`}>
      <View style={tw`flex-1 px-4`}>
        <Deck<Card> items={cards} index={idx} width={CARD_W} controlRef={swipe} labels={{ right: t('연결'), left: t('패스') }}
          renderCard={(c, isTop) => <RecommendSlide user={c.user} reasons={c.reasons} interactive={isTop} />} onSwipe={onSwipe} />
      </View>
      <View style={tw`pt-3 pb-2 items-center`}>
        <View style={tw`flex-row items-center`}>
          <Pressable onPress={() => swipe.current?.('left')} accessibilityLabel={t('패스')} style={tw`h-12 w-12 rounded-full bg-surface-2 items-center justify-center`}><X size={22} color={C.ink2} /></Pressable>
          <View style={tw`w-3`} />
          <Button size="lg" loading={busy} disabled={connected || requested} variant={connected || requested ? 'secondary' : 'primary'} icon={<UserPlus size={18} color={connected || requested ? C.primary : C.onPrimary} />} style={tw`px-9`} onPress={() => swipe.current?.('right')}>{connected ? t('연결됨') : requested ? t('요청됨') : t('연결')}</Button>
          <View style={tw`w-3`} />
          <Pressable onPress={() => setPropose({ u: current.user, cat: 'coffee' })} accessibilityLabel={t('만남에 초대')} style={tw`h-12 w-12 rounded-full bg-primary-soft items-center justify-center`}><CalendarPlus size={20} color={C.primary} /></Pressable>
        </View>
        <Text style={tw`mt-2 text-[11px] text-ink-3`}>{t('패스')} · {t('연결')} · {t('만남에 초대')}</Text>
      </View>
      {sheet}
      {propose && <ProposeSheet open onClose={() => setPropose(null)} user={propose.u} category={propose.cat} onCategory={(c) => setPropose({ ...propose, cat: c })} />}
    </View>
  );
}

/** 추천 카드 (웹 RecommendSlide): 사진 위에 이유 칩 · 아래에 이름 · 학교 'YY ✓ · 한 줄 · 도시 · 관심사 · "왜 추천되었나요" */
function RecommendSlide({ user, reasons, interactive = true }: { user: User; reasons: Reason[]; interactive?: boolean }) {
  const v = useViewer();
  const [pi, setPi] = useState(0);
  const photos = user.photos?.length ? user.photos : user.avatar.url ? [user.avatar.url] : [];
  const common = commonInterests(v.me, user);
  const canSeeTT = user.timetable.length > 0 && v.canSeeField(user, 'timetable');
  const st = canSeeTT ? statusNow(user.timetable) : null;
  const block = canSeeTT ? freeBlocks(user.timetable, todayIdx()).find((b) => b.end > nowMin()) : null;
  const freeLabel = st?.kind === 'free' && block ? `${t('공강')} ${fmtBlock({ start: Math.max(block.start, nowMin()), end: block.end })}` : user.availability === 'now' ? t('지금 가능') : null;
  const city = cityOf(user);
  const open = () => { if (!justDragged()) nav(`/users/${user.id}`); };
  const tap = (x: number) => {
    if (justDragged()) return;
    if (photos.length > 1 && x < CARD_W * 0.3) setPi((p) => (p - 1 + photos.length) % photos.length);
    else if (photos.length > 1 && x > CARD_W * 0.7) setPi((p) => (p + 1) % photos.length);
    else open();
  };
  return (
    <View style={[tw`flex-1 rounded-[32px] overflow-hidden bg-white border border-line`, { width: CARD_W }]}>
      <Pressable disabled={!interactive} onPress={(e) => tap(e.nativeEvent.locationX)} style={[tw`bg-primary`, { height: '46%' }]}>
        {photos.length > 0
          ? <Image source={getPlatform().asset(photos[pi]) as number} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} contentFit="cover" transition={150} />
          : <View style={[tw`absolute inset-0 items-center justify-center`, { backgroundColor: `hsl(${user.avatar.hue}, 60%, 78%)` }]}><Text style={{ fontSize: 88 }}>{user.avatar.emoji}</Text></View>}
        {photos.length > 1 && <View style={tw`absolute top-3 left-4 right-4 flex-row`}>{photos.map((_, i) => <View key={i} style={[tw`h-[3px] flex-1 rounded-full mx-0.5`, { backgroundColor: i === pi ? C.onPrimary : C.glassDim }]} />)}</View>}
        {reasons.length > 0 && <View pointerEvents="none" style={tw`absolute top-6 left-4 right-4 flex-row`}><View style={[tw`rounded-full p-1 pb-0 max-w-full`, { backgroundColor: C.glass }]}><ReasonChips reasons={reasons} max={3} tone="solid" nowrap /></View></View>}
        {freeLabel && <View pointerEvents="none" style={[tw`absolute bottom-3 left-4 h-8 pl-3 pr-3.5 rounded-full flex-row items-center`, { backgroundColor: C.glass }]}><Clock size={14} color={C.verify} /><Text style={tw`ml-1.5 text-[12px] font-semibold text-primary`}>{freeLabel}</Text></View>}
        {user.avatar.photoType && user.avatar.photoType !== 'face' ? <View pointerEvents="none" style={[tw`absolute bottom-3 right-4 rounded-full px-2.5 py-1`, { backgroundColor: C.scrim }]}><Text style={tw`text-[11px] text-white`}>{user.avatar.photoType === 'masked' ? t('얼굴 비공개') : t('뒷모습')}</Text></View> : null}
      </Pressable>
      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-5 pt-4 pb-4`} showsVerticalScrollIndicator={false} scrollEnabled={interactive}>
        <Pressable onPress={open} disabled={!interactive}>
          <Text numberOfLines={1} style={tw`text-[26px] font-bold text-ink`}>{user.nickname}</Text>
          <View style={tw`mt-1`}><SchoolBadge user={user} withYear /></View>
          <Text numberOfLines={1} style={tw`text-[13px] text-ink-2 mt-0.5`}>{personLine(user, lang)}</Text>
          {city ? <Text numberOfLines={1} style={tw`text-[12px] text-ink-3 mt-0.5`}>{city}{user.activityCity && user.activityCity !== city ? ` · ${t('활동')} ${user.activityCity}` : ''}</Text> : null}
        </Pressable>
        {user.interests.length > 0 && (
          <View style={tw`mt-2.5 flex-row flex-wrap`}>
            {[...common, ...user.interests.filter((i) => !common.includes(i))].slice(0, 4).map((i) => <View key={i} style={tw`h-7 px-3 mr-1.5 mb-1.5 rounded-full justify-center ${common.includes(i) ? 'bg-primary-soft' : 'bg-surface-2'}`}><Text style={tw`text-[12px] font-semibold ${common.includes(i) ? 'text-primary' : 'text-ink-2'}`}>{INTEREST_LABELS[i]}</Text></View>)}
          </View>
        )}
        <View style={tw`mt-2`}><ReasonList reasons={reasons} title={t('왜 추천되었나요')} max={3} /></View>
      </ScrollView>
    </View>
  );
}
