/**
 * AI에게 묻기 공용 (웹 components/ai/AskAi + pages/ai/AiChatPage PersonCard · MeetRow 의 모바일판).
 * 답은 core `@core/lib/ai-answer` 가 만든다 — 사람 → 왜 → 서로 아는 사람 → 다음 행동. 공개 범위는 `profileView` + `maskUser` 로 가린다.
 */
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Sparkles, ArrowRight, UserPlus, Coffee } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import type { Activity, User } from '@core/types';
import type { StageKind } from '@core/lib/stage';
import { aiLine, aiQuestionExamples, type AiPerson } from '@core/lib/ai-answer';
import { profileView } from '@core/lib/privacy';
import { isPlus, swipesLeft } from '@core/lib/monetization';
import { CATEGORY_EMOJI, CATEGORY_COLORS } from '@core/lib/labels';
import { formatDate, formatTime } from '@core/lib/format';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { useViewer } from '@/viewer';
import { Avatar, Button, C } from '@/ui';
import { alpha } from '@/theme';
import { PaywallSheet } from '@/components/PaywallSheet';
import { JoinButton } from '@/components/JoinButton';
import { SchoolBadge } from './SchoolBadge';
import { ReasonChips } from './ReasonChips';
import { maskUser } from './Network';

/** AI에게 묻기 — 대화로 답하는 화면 (/ai). 조건 칩으로 보는 찾기는 /people/find */
export const aiUrl = (q?: string) => (q ? `/ai?q=${encodeURIComponent(q)}` : '/ai');

/** 홈 상단 카드 — "AI에게 물어보세요" + 가짜 입력칸 + 단계별 예시 질문 (웹 AskAiCard) */
export function AiAskCard({ kind }: { kind: StageKind }) {
  const examples = aiQuestionExamples(kind);
  return (
    <View style={tw`mt-3 rounded-[24px] bg-primary-soft p-4`}>
      <View style={tw`flex-row items-start`}>
        <View style={tw`h-9 w-9 rounded-full bg-surface items-center justify-center`}><Sparkles size={17} color={C.primary} /></View>
        <View style={tw`flex-1 min-w-0 ml-2.5`}>
          <Text style={tw`text-[16px] font-bold text-ink`}>{t('AI에게 물어보세요')}</Text>
          <Text style={tw`text-[12px] text-ink-2`}>{t('필요한 걸 말하면 사람과 모임을 찾아 이유와 함께 답해줘요')}</Text>
        </View>
      </View>
      <Pressable onPress={() => nav(aiUrl())} accessibilityRole="search" accessibilityLabel={t('AI에게 물어보기')} style={tw`mt-3 h-11 rounded-full bg-surface border border-line flex-row items-center pl-4 pr-1.5`}>
        <Text numberOfLines={1} style={tw`flex-1 text-[14px] text-ink-3`}>{t('무엇이 필요한지 말해 주세요')}</Text>
        <View style={tw`h-8 w-8 rounded-full bg-accent-soft items-center justify-center`}><ArrowRight size={15} color={C.primary} /></View>
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`-mx-4 mt-2.5`} contentContainerStyle={tw`px-4`}>
        {examples.map((x) => (
          <Pressable key={x} onPress={() => nav(aiUrl(x))} style={tw`h-8 px-3 mr-1.5 rounded-full bg-surface border border-line justify-center max-w-[280px]`}>
            <Text numberOfLines={1} style={tw`text-[12px] font-semibold text-primary`}>{x}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/** 사람 탭 맨 위 — 입구 한 줄 (웹 AskAiBar) */
export function AiAskBar() {
  return (
    <Pressable onPress={() => nav(aiUrl())} accessibilityRole="search" style={tw`mx-4 mb-2.5 h-12 rounded-full bg-surface border border-line pl-2 pr-3 flex-row items-center`}>
      <View style={tw`h-8 w-8 rounded-full bg-primary-soft items-center justify-center`}><Sparkles size={15} color={C.primary} /></View>
      <View style={tw`flex-1 min-w-0 mx-2.5`}>
        <Text numberOfLines={1} style={tw`text-[14px] font-semibold text-ink`}>{t('AI에게 물어보기')}</Text>
        <Text numberOfLines={1} style={tw`text-[11px] text-ink-3`}>{t('예: 다음 달 도쿄로 이사하는데 아는 사람이 없어')}</Text>
      </View>
      <ArrowRight size={16} color={C.ink3} />
    </Pressable>
  );
}

/** 사람 한 명 — 누구 → 왜 → 공통점·서로 아는 사람 → 다음 행동 (공개 범위 안에서만) */
export function AiPersonCard({ p, compact, research }: { p: AiPerson; compact?: boolean; research?: boolean }) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [busy, setBusy] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const view = profileView(v.snap, v.me, p.user);
  const u: User = maskUser(p.user, view);
  const sent = !!v.pendingOut(u.id);
  const friend = v.isFriend(u.id);
  const open = () => nav(`/users/${u.id}`);
  const connect = async () => {
    if (!isPlus(v.me) && swipesLeft(v.me) <= 0) { setPaywall(true); return; }
    setBusy(true);
    try { await run(() => api.relationships.sendFriendRequest(v.me.id, u.id), `${u.nickname}${t('님에게 연결 요청을 보냈어요.')}`); }
    catch { const fresh = useAppStore.getState().users.find((x) => x.id === v.me.id) ?? v.me; if (!isPlus(fresh) && swipesLeft(fresh) <= 0) setPaywall(true); }
    finally { setBusy(false); }
  };
  const viaText = p.via ? `${lang === 'en' ? `You can get an intro through ${p.via.nickname}` : `${p.via.nickname}님을 통해 소개받을 수 있어요`}${p.mutualCount > 1 ? (lang === 'en' ? ` +${p.mutualCount - 1}` : ` 외 ${p.mutualCount - 1}명`) : ''}` : '';
  return (
    <View style={tw`mb-2.5 rounded-[20px] bg-surface border border-line p-3.5`}>
      <Pressable onPress={open} style={tw`flex-row items-center`}>
        <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={compact ? 42 : 48} />
        <View style={tw`flex-1 min-w-0 ml-3`}>
          <View style={tw`flex-row items-center min-w-0`}>
            <Text numberOfLines={1} style={tw`text-[15px] font-bold text-ink shrink-0 max-w-[55%] mr-1.5`}>{u.nickname}</Text>
            <SchoolBadge user={u} withYear size="sm" />
          </View>
          <Text numberOfLines={1} style={tw`mt-0.5 text-[12px] text-ink-2`}>{aiLine(u, false)}</Text>
          {p.open ? (
            <View style={tw`mt-0.5 flex-row items-center`}>
              <View style={tw`h-1.5 w-1.5 rounded-full bg-mint`} />
              <Text numberOfLines={1} style={tw`ml-1 text-[11px] font-semibold text-mint`}>{p.open}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
      {p.why ? (
        <Text style={tw`mt-2.5 text-[13px] text-ink leading-5`}>
          <Text style={tw`font-semibold text-primary`}>✦ </Text><Text style={tw`font-semibold`}>{t('추천 이유')}</Text> · {p.why}
        </Text>
      ) : null}
      {p.keywords.length > 0 ? (
        <View style={tw`mt-1.5 flex-row flex-wrap`}>
          {p.keywords.map((k) => <View key={k} style={tw`h-6 px-2 mr-1 mb-1 rounded-full bg-primary-soft justify-center`}><Text style={tw`text-[11px] font-bold text-primary`}>{research ? `# ${k}` : k}</Text></View>)}
        </View>
      ) : null}
      {!compact ? <View style={tw`mt-2`}><ReasonChips reasons={p.reasons} max={3} /></View> : null}
      {p.via ? (
        <View style={tw`mt-2.5 rounded-xl bg-surface-2 px-2.5 py-2 flex-row items-center`}>
          <Avatar emoji={p.via.avatar.emoji} hue={p.via.avatar.hue} url={p.via.avatar.url} size={22} />
          <Text numberOfLines={1} style={tw`flex-1 min-w-0 mx-2 text-[12px] text-ink-2`}>{viaText}</Text>
          <Pressable onPress={() => nav('/people/second')} hitSlop={6}><Text style={tw`text-[12px] font-bold text-primary`}>{lang === 'en' ? 'Ask for intro' : '소개 부탁'}</Text></Pressable>
        </View>
      ) : null}
      <View style={tw`mt-2.5 flex-row`}>
        <Button size="sm" variant="outline" full onPress={open}>{t('프로필 보기')}</Button>
        <View style={tw`w-2`} />
        {friend
          ? <Button size="sm" variant="secondary" full onPress={open}>{t('이미 연결됨')}</Button>
          : <Button size="sm" variant="secondary" full loading={busy} disabled={sent} icon={sent ? undefined : research ? <Coffee size={14} color={C.primary} /> : <UserPlus size={14} color={C.primary} />} onPress={connect}>{sent ? t('요청 보냄') : research ? t('커피 한잔 요청') : t('연결 요청')}</Button>}
      </View>
      <PaywallSheet open={paywall} onClose={() => setPaywall(false)} reason="limit" />
    </View>
  );
}

/** 관련 모임 한 줄 — 제목 · 언제·어디·인원 · [참여] (웹 AiChatPage MeetRow) */
export function AiMeetRow({ a, last }: { a: Activity; last?: boolean }) {
  const v = useViewer();
  const open = () => nav(`/activities/${a.id}`);
  return (
    <View style={tw`flex-row items-center px-3.5 py-3 ${last ? '' : 'border-b border-line'}`}>
      <Pressable onPress={open} style={[tw`h-10 w-10 rounded-xl items-center justify-center`, { backgroundColor: alpha(CATEGORY_COLORS[a.category], 0.1) }]}><Text style={tw`text-[18px]`}>{CATEGORY_EMOJI[a.category]}</Text></Pressable>
      <Pressable onPress={open} style={tw`flex-1 min-w-0 mx-3`}>
        <Text numberOfLines={1} style={tw`text-[14px] font-bold text-ink`}>{a.title}</Text>
        <Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{formatDate(a.date)} {formatTime(a.startTime)} · {a.place.area ?? a.place.name} · {v.approvedCount(a.id)}/{a.capacity >= 999 ? '∞' : a.capacity}</Text>
        {a.newcomers ? <View style={tw`mt-0.5 self-start rounded-full bg-primary-soft px-1.5`}><Text style={tw`text-[10px] font-bold text-primary`}>{t('새로 온 사람 환영')}</Text></View> : null}
      </Pressable>
      <JoinButton activity={a} size="sm" label={t('참여')} />
    </View>
  );
}
