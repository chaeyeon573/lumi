import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ChevronDown, EyeOff, Sparkles } from 'lucide-react-native';
import { t } from '@core/i18n';
import type { User } from '@core/types';
import type { Reason } from '@core/lib/recommend';
import { unexpectedConnections } from '@core/lib/people';
import { profileView } from '@core/lib/privacy';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Avatar, Button, C } from '@/ui';
import { useSnapshot } from '@/v2/useSnapshot';
import { useSectionState } from '@/v2/useSectionState';
import { Section, SectionEmpty, SectionSkeleton, PrivacyNote } from '@/v2/SectionState';
import { ReasonChips, ReasonList } from '@/v2/ReasonChips';
import { SchoolBadge } from '@/v2/SchoolBadge';
import { SaveButton } from '@/v2/PersonActions';
import { StatusPill } from '@/v2/StatusPill';
import { useCloseness, maskedCity, type Closeness } from '@/v2/personView';
import { ClosenessTag, ConnectStatusButton, maskedLine, useHideWithUndo } from '@/v2/Network';

/**
 * 의외의 연결 (웹 UnexpectedPage) — 같은 학교·같은 전공처럼 뻔한 이유가 아니라,
 * 다른 학교·다른 분야인데 의미 있게 겹치는 사람. 카드 위쪽에 "왜 의외인지"가 먼저, 사람은 그다음.
 */
export default function UnexpectedScreen() {
  const v = useViewer();
  const snap = useSnapshot();
  const sec = useSectionState('unexpected');
  const closeness = useCloseness(snap, v.me.id);
  const { hide, bar } = useHideWithUndo();
  const list = useMemo(() => unexpectedConnections(snap, v.me, v.visibleUsers, (u) => v.canSeeField(u, 'timetable'), 20), [snap, v]);

  return (
    <View style={tw`flex-1 bg-white`}>
      <Screen title={t('의외의 연결')}>
        <View style={tw`pt-1 pb-3 flex-row items-start`}>
          <Sparkles size={14} color={C.primary} style={tw`mt-0.5`} />
          <Text style={tw`ml-1.5 flex-1 text-[13px] text-ink-2`}>{t('다른 학교·다른 분야인데 겹치는 게 있는 사람이에요. 둘러보기만 해도 괜찮아요.')}</Text>
        </View>
        <Section loading={sec.loading} error={sec.error} onRetry={sec.retry} skeleton={<SectionSkeleton count={3} />}
          empty={list.length === 0 && (
            <SectionEmpty emoji="🌿" title={t('새로운 추천이 없어요')} description={t('찾는 사람을 조정하거나 프로필을 채우면 새로운 사람이 보여요.')}
              action={<View style={tw`flex-row`}><Button size="sm" onPress={() => nav('/profile/wants')}>{t('찾는 사람 조정')}</Button><View style={tw`w-2`} /><Button size="sm" variant="outline" onPress={() => nav('/profile/edit')}>{t('프로필 보완')}</Button></View>} />
          )}>
          {list.map((c) => <UnexpectedCard key={c.user.id} user={c.user} reasons={c.reasons} closeness={closeness(c.user.id)} onHide={() => hide(c.user)} />)}
          <Text style={tw`pt-1 pb-16 text-center text-[11px] text-ink-3`}>{t('숨긴 사람은 상대에게 알리지 않아요')}</Text>
        </Section>
      </Screen>
      {bar}
    </View>
  );
}

/** 의외의 연결 카드 — 위: 왜 의외인지(이유 칩 · 거리 · 펼치면 이유 전부) → 아래: 사진·이름·학교(공개 범위 적용) → 행동 */
function UnexpectedCard({ user, reasons, closeness, onHide }: { user: User; reasons: Reason[]; closeness: Closeness; onHide: () => void }) {
  const v = useViewer();
  const [open, setOpen] = useState(false);
  const view = profileView(v.snap, v.me, user);
  const line = [maskedLine(user, view), maskedCity(user, view)].filter(Boolean).join(' · ');
  const openProfile = () => nav(`/users/${user.id}`);
  return (
    <View style={tw`mb-3 rounded-[24px] border border-line bg-white overflow-hidden`}>
      {/* 1. 왜 의외인지 — 사람보다 먼저 */}
      <View style={tw`bg-sky-soft px-3.5 pt-3 pb-2.5`}>
        <View style={tw`flex-row items-center mb-1.5`}><Text style={tw`flex-1 text-[11px] font-bold text-ink-3`}>{t('왜 의외인지')}</Text><ClosenessTag c={closeness} /></View>
        <ReasonChips reasons={reasons} max={3} />
        {reasons.length > 0 ? (
          <Pressable onPress={() => setOpen((x) => !x)} style={tw`mt-2 flex-row items-center`}>
            <Text style={tw`text-[11px] font-semibold text-primary`}>{open ? t('접기') : t('이유 전부 보기')}</Text>
            <ChevronDown size={12} color={C.primary} style={open ? { transform: [{ rotate: '180deg' }] } : undefined} />
          </Pressable>
        ) : null}
        {open ? <View style={tw`mt-2`}><ReasonList reasons={reasons} max={8} /></View> : null}
      </View>
      {/* 2. 사람 */}
      <Pressable onPress={openProfile} style={tw`px-3.5 pt-3 flex-row items-center`}>
        <Avatar emoji={user.avatar.emoji} hue={user.avatar.hue} url={user.avatar.url} size={52} />
        <View style={tw`flex-1 min-w-0 ml-3`}>
          <View style={tw`flex-row items-center`}><Text numberOfLines={1} style={tw`text-[15px] font-bold text-ink shrink-0 max-w-[60%] mr-1.5`}>{user.nickname}</Text><SchoolBadge user={user} withYear={view.gradYear} size="sm" /></View>
          {line ? <Text numberOfLines={1} style={tw`text-[12px] text-ink-2`}>{line}</Text> : null}
          <View style={tw`mt-0.5`}><StatusPill user={user} size="sm" /></View>
          {!view.full && view.reason ? <PrivacyNote text={view.reason} /> : null}
        </View>
      </Pressable>
      {/* 3. 행동 — 저장이 가장 가볍다 */}
      <View style={tw`px-3.5 pt-2.5 pb-3 flex-row items-center`}>
        <Button size="sm" variant="outline" onPress={openProfile}>{t('프로필 보기')}</Button>
        <View style={tw`w-1.5`} />
        <SaveButton user={user} />
        <View style={tw`flex-1`} />
        <Pressable onPress={onHide} accessibilityLabel={t('숨기기')} style={tw`h-9 w-9 rounded-full items-center justify-center`}><EyeOff size={16} color={C.ink3} /></Pressable>
        <ConnectStatusButton user={user} />
      </View>
    </View>
  );
}
