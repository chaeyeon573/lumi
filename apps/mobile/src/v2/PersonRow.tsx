import { Pressable, Text, View } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import type { User } from '@core/types';
import type { Reason } from '@core/lib/recommend';
import { INTEREST_LABELS } from '@core/lib/labels';
import { commonInterests, mutualFriends } from '@core/lib/relations';
import { profileView } from '@core/lib/privacy';
import { degreeOf } from '@core/lib/graph';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { Avatar, Tag, C } from '@/ui';
import { ReasonChips } from './ReasonChips';
import { SchoolBadge } from './SchoolBadge';
import { StatusPill } from './StatusPill';
import { SaveButton, ConnectTextButton } from './PersonActions';
import { maskedCity, maskedPersonLine } from './personView';
import { MutualLine, PromptQuote } from './PromptParts';

/**
 * 사람 행 (웹 cards/PersonRow) — 검색 결과·연결 목록·추천 허브에 공통.
 * 순서: 왜 추천됐나(이유 칩) → 얼마나 가까운가(서로 아는 사람 얼굴 · 이름) → 이름 · 학교 'YY ✓ · 상태 · 소속 · 도시 · 관심사 · 질문 답 한 줄 → [저장] (작은 '연결').
 * 회사·도시·졸업연도는 공개 범위(profileView)대로 가린다.
 */
export function PersonRow({ user, reasons = [], compact, actions, bare }: { user: User; reasons?: Reason[]; compact?: boolean; actions?: boolean; bare?: boolean }) {
  const v = useViewer();
  const common = commonInterests(v.me, user);
  const connected = v.isFriend(user.id);
  const view = profileView(v.snap, v.me, user);
  const city = maskedCity(user, view);
  const degree = connected ? 1 : degreeOf(v.snap, v.me.id, user.id, 2);
  const mutual = connected ? 0 : mutualFriends(v.snap, v.me.id, user.id).length;
  const open = () => nav(`/users/${user.id}`);
  return (
    <View style={[tw`flex-row items-start p-3 bg-white`, bare ? tw`pt-1.5` : tw`rounded-[20px] border border-line`]}>
      <Pressable onPress={open} accessibilityLabel={user.nickname}><Avatar emoji={user.avatar.emoji} hue={user.avatar.hue} url={user.avatar.url} size={compact ? 44 : 52} /></Pressable>
      <Pressable onPress={open} style={tw`flex-1 min-w-0 ml-3`}>
        {reasons.length > 0 ? <View style={tw`mb-1`}><ReasonChips reasons={reasons} max={2} nowrap /></View> : null}
        {!connected && mutual ? <View style={tw`mb-0.5`}><MutualLine user={user} /></View> : degree === 2 ? <Text style={tw`text-[11px] font-semibold text-verify`}>{t('2촌')}</Text> : null}
        <View style={tw`flex-row items-center min-w-0`}>
          <Text numberOfLines={1} style={tw`text-[15px] font-bold text-ink shrink-0 max-w-[60%] mr-1.5`}>{user.nickname}</Text>
          <SchoolBadge user={user} withYear={view.gradYear} size="sm" />
        </View>
        <View style={tw`mt-0.5`}><StatusPill user={user} size="sm" /></View>
        <Text numberOfLines={1} style={tw`text-[12px] text-ink-2`}>{maskedPersonLine(user, view, lang)}</Text>
        <PromptQuote user={user} />
        {!compact && (
          <View style={tw`mt-1 flex-row items-center flex-wrap`}>
            {city ? <View style={tw`flex-row items-center mr-1.5`}><MapPin size={11} color={C.ink3} /><Text numberOfLines={1} style={tw`ml-0.5 text-[12px] text-ink-3`}>{city}{view.city && user.activityCity && user.activityCity !== city ? ` · ${t('활동')} ${user.activityCity}` : ''}</Text></View> : null}
            {(common.length ? common : user.interests).slice(0, 2).map((i) => <View key={i} style={tw`mr-1`}><Tag tone={common.includes(i) ? 'primary' : 'neutral'}>{INTEREST_LABELS[i]}</Tag></View>)}
          </View>
        )}
      </Pressable>
      {actions ? (
        <View style={tw`ml-2 self-center items-center`}>
          <SaveButton user={user} />
          <ConnectTextButton user={user} />
        </View>
      ) : null}
    </View>
  );
}
