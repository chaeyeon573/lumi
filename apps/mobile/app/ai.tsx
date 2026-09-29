import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, ArrowUp, Sparkles, Users, ShieldCheck, Lock, MessageCircleQuestion } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { answerQuery, aiQuestionExamples, type AiAnswer } from '@core/lib/ai-answer';
import { stageKind, type StageKind } from '@core/lib/stage';
import { isPlus } from '@core/lib/monetization';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Avatar, C } from '@/ui';
import { PaywallSheet } from '@/components/PaywallSheet';
import { useSnapshot } from '@/v2/useSnapshot';
import { AiPersonCard, AiMeetRow } from '@/v2/AiParts';

/** 모든 상황 예시 — 단계별 예시 3개를 먼저, 나머지는 뒤에 */
function allExamples(kind: StageKind): string[] {
  return [...new Set([...aiQuestionExamples(kind), ...aiQuestionExamples('alumni'), ...aiQuestionExamples('grad'), ...aiQuestionExamples('undergrad')])];
}

/**
 * /ai?q= — AI에게 묻기 (웹 AiChatPage). 검색 결과 목록이 아니라 대화로 답한다:
 * 사람 추천 → 왜 이 사람인지 → 공통점·서로 아는 사람 → 관련 모임 → 다음 행동.
 * "누구를 만나야 할지 모를 때"는 사람 유형부터 제안하고 유형마다 실제 사람을 붙인다.
 */
export default function AiChatScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const q = (params.q ?? '').trim();
  const v = useViewer();
  const me = v.me;
  const snap = useSnapshot();
  const kind = stageKind(me);
  const run = useAppStore((s) => s.run);
  const [draft, setDraft] = useState('');
  const [thinking, setThinking] = useState(false);
  const [paywall, setPaywall] = useState(false);

  // 답을 내기 전 잠깐 "찾는 중" — 사람을 찾고 있다는 느낌
  useEffect(() => {
    if (!q) return;
    setThinking(true);
    const id = setTimeout(() => setThinking(false), 650);
    run(() => api.users.pushRecentSearch(me.id, q)).catch(() => { /* 최근 검색은 실패해도 조용히 */ });
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const answer = useMemo(() => (q ? answerQuery(snap, me, v.visibleUsers, v.visibleActivities, q, lang, (u) => v.canSeeField(u, 'timetable')) : null), [q, snap, me, v]);
  const ask = (text: string) => { const s = text.trim(); if (!s) return; setDraft(''); router.setParams({ q: s } as never); };

  const footer = (
    <View style={tw`h-12 rounded-full bg-surface border border-line flex-row items-center pl-3.5 pr-1.5`}>
      <Sparkles size={16} color={C.primary} />
      <TextInput style={tw`flex-1 mx-2 text-[14px] text-ink`} placeholderTextColor={C.ink3} placeholder={q ? t('이어서 물어보세요') : t('무엇이 필요한지 말해 주세요')}
        value={draft} onChangeText={setDraft} onSubmitEditing={() => ask(draft)} returnKeyType="send" />
      <Pressable onPress={() => ask(draft)} disabled={!draft.trim()} accessibilityLabel={t('보내기')} style={tw`h-9 w-9 rounded-full bg-primary items-center justify-center ${draft.trim() ? '' : 'opacity-35'}`}>
        <ArrowUp size={17} color={C.onPrimary} />
      </Pressable>
    </View>
  );

  return (
    <KeyboardAvoidingView style={tw`flex-1 bg-bg`} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen title={t('AI에게 묻기')} footer={footer}>
        <View style={tw`pt-1`}>
          {!q && <Intro kind={kind} onAsk={ask} />}
          {q ? (
            <>
              <View style={tw`items-end mb-4`}>
                <View style={tw`max-w-[85%] rounded-[20px] rounded-br-md bg-primary px-4 py-2.5`}><Text style={tw`text-[14px] leading-5 text-on-primary`}>{q}</Text></View>
              </View>
              {thinking || !answer
                ? <AiBubble><Text style={tw`text-[14px] text-ink-2`}>{t('네트워크에서 찾는 중…')}</Text></AiBubble>
                : <Answer a={answer} q={q} onAsk={ask} onPaywall={() => setPaywall(true)} />}
            </>
          ) : null}
        </View>
      </Screen>
      <PaywallSheet open={paywall} onClose={() => setPaywall(false)} reason="search" />
    </KeyboardAvoidingView>
  );
}

function AiBubble({ children }: { children: ReactNode }) {
  return (
    <View style={tw`flex-row items-start`}>
      <View style={tw`h-8 w-8 mt-0.5 rounded-full bg-primary-soft items-center justify-center`}><Sparkles size={15} color={C.primary} /></View>
      <View style={tw`flex-1 min-w-0 ml-2.5`}>{children}</View>
    </View>
  );
}

function Intro({ kind, onAsk }: { kind: StageKind; onAsk: (q: string) => void }) {
  return (
    <AiBubble>
      <View style={tw`rounded-[20px] rounded-tl-md bg-surface border border-line p-4`}>
        <Text style={tw`text-[15px] font-bold text-ink`}>{t('무엇이 필요한지 말해 주세요')}</Text>
        <Text style={tw`mt-1 text-[13px] text-ink-2 leading-5`}>{t('실제 AroundU 사람들 중에서 찾아, 왜 이 사람인지와 서로 아는 사람, 같이 갈 만한 모임까지 알려드려요. 누구를 찾아야 할지 모르겠다면 그것부터 물어봐도 돼요.')}</Text>
      </View>
      <View style={tw`mt-3`}>
        {allExamples(kind).map((x) => (
          <Pressable key={x} onPress={() => onAsk(x)} style={tw`mb-2 rounded-2xl bg-primary-soft px-3.5 py-2.5 flex-row items-start`}>
            <MessageCircleQuestion size={15} color={C.primary} style={{ marginTop: 2 }} />
            <Text style={tw`flex-1 ml-2 text-[13px] font-semibold text-ink`}>{x}</Text>
          </Pressable>
        ))}
      </View>
      <View style={tw`mt-1 flex-row items-center`}>
        <ShieldCheck size={12} color={C.ink3} />
        <Text style={tw`flex-1 ml-1 text-[11px] text-ink-3`}>{t('공개 프로필만으로 찾아요. 성별·나이·종교 같은 민감한 조건은 쓰지 않아요.')}</Text>
      </View>
    </AiBubble>
  );
}

/** 웹 경로 중 모바일에 있는 화면만 다음 행동으로 보여준다 */
const MOBILE_ROUTES = ['/people/ask', '/people/find', '/people/around', '/people/second', '/meet/create', '/profile/open-to', '/users/', '/activities/', '/orgs/'];
const reachable = (to: string) => MOBILE_ROUTES.some((r) => to.startsWith(r));

function Answer({ a, q, onAsk, onPaywall }: { a: AiAnswer; q: string; onAsk: (q: string) => void; onPaywall: () => void }) {
  const v = useViewer();
  const plus = isPlus(v.me);
  const FREE = 3;
  const shown = plus ? a.people : a.people.slice(0, FREE);
  const more = a.total - shown.length;
  const followups = a.followups.filter((f) => f.q || (f.to && reachable(f.to)));
  return (
    <AiBubble>
      <View style={tw`rounded-[20px] rounded-tl-md bg-surface border border-line p-3.5`}>
        <Text style={tw`text-[14px] text-ink leading-5`}>{a.lead}</Text>
        {a.understood.length > 0 ? (
          <View style={tw`mt-2.5 flex-row flex-wrap items-center`}>
            <Text style={tw`mr-1.5 mb-1 text-[11px] text-ink-3`}>{t('이렇게 이해했어요')}</Text>
            {a.understood.map((u) => <View key={u} style={tw`h-6 px-2.5 mr-1 mb-1 rounded-full bg-primary-soft justify-center`}><Text style={tw`text-[11px] font-bold text-primary`}>{u}</Text></View>)}
          </View>
        ) : null}
      </View>

      {/* 누구를 만나야 할지 모를 때 — 사람 유형 → 실제 사람 */}
      {a.kinds.map((k, i) => (
        <View key={k.title} style={tw`mt-3 rounded-[20px] bg-primary-soft p-3`}>
          <View style={tw`flex-row items-start px-0.5`}>
            <View style={tw`h-6 w-6 rounded-full bg-primary items-center justify-center`}><Text style={tw`text-[12px] font-bold text-on-primary`}>{i + 1}</Text></View>
            <View style={tw`flex-1 min-w-0 ml-2`}>
              <Text style={tw`text-[15px] font-bold text-ink`}>{k.title}</Text>
              <Text style={tw`mt-0.5 text-[12px] text-ink-2 leading-4`}>{k.why}</Text>
            </View>
          </View>
          <View style={tw`mt-2.5`}>
            {k.people.length
              ? k.people.map((p) => <AiPersonCard key={p.user.id} p={p} compact />)
              : <Text style={tw`px-1 mb-1 text-[12px] text-ink-3`}>{t('아직 AroundU에 이런 분이 없어요. 지인들에게 물어볼 수 있어요.')}</Text>}
          </View>
        </View>
      ))}

      {shown.length > 0 ? <View style={tw`mt-3`}>{shown.map((p) => <AiPersonCard key={p.user.id} p={p} research={a.intent === 'research'} />)}</View> : null}
      {!plus && more > 0 && a.intent !== 'advice' ? (
        <Pressable onPress={onPaywall} style={[tw`rounded-2xl bg-surface border border-line p-3`, { borderStyle: 'dashed' }]}>
          <View style={tw`flex-row items-center`}><Lock size={12} color={C.primary} /><Text style={tw`ml-1 text-[13px] font-bold text-primary`}>{lang === 'en' ? `${more} more` : `${more}명 더 있어요`}</Text></View>
          <Text style={tw`mt-0.5 text-[12px] text-ink-3`}>{t('여러 조건을 겹친 결과는 AroundU+ 에서 모두 보여요.')}</Text>
        </Pressable>
      ) : null}

      {/* 관련 모임 · 그룹 */}
      {a.meets.length > 0 || a.groups.length > 0 ? (
        <View style={tw`mt-3 rounded-[20px] bg-surface border border-line overflow-hidden`}>
          <View style={tw`px-3.5 pt-3 flex-row items-center`}>
            <Users size={14} color={C.primary} />
            <Text style={tw`ml-1.5 text-[13px] font-bold text-ink`}>{a.intent === 'moving' ? t('그 도시 모임도 있어요') : a.intent === 'meal' ? t('이미 열린 모임') : t('같이 가 볼 만한 모임')}</Text>
          </View>
          {a.meets.map((m, i) => <AiMeetRow key={m.id} a={m} last={i === a.meets.length - 1 && a.groups.length === 0} />)}
          {a.groups.map((g, i) => (
            <Pressable key={g.id} onPress={() => nav(`/orgs/${g.id}`)} style={tw`flex-row items-center px-3.5 py-3 ${i === a.groups.length - 1 ? '' : 'border-b border-line'}`}>
              <Avatar emoji={g.logo.emoji} hue={g.logo.hue} url={g.logo.url} size={40} />
              <View style={tw`flex-1 min-w-0 mx-3`}>
                <Text numberOfLines={1} style={tw`text-[14px] font-bold text-ink`}>{g.name}</Text>
                <Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{g.description}</Text>
              </View>
              <ArrowRight size={15} color={C.ink3} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* 다음 행동 */}
      <View style={tw`mt-3 flex-row flex-wrap`}>
        {followups.map((f) => (
          <Pressable key={f.label} onPress={() => (f.q ? onAsk(f.q) : f.to && nav(f.to))} style={tw`h-9 px-3.5 mr-1.5 mb-1.5 rounded-full bg-surface border border-line justify-center`}>
            <Text style={tw`text-[12px] font-semibold text-primary`}>{f.label}</Text>
          </Pressable>
        ))}
        <Pressable onPress={() => nav(`/people/find?q=${encodeURIComponent(q)}`)} style={tw`h-9 px-3.5 mb-1.5 rounded-full justify-center`}>
          <Text style={tw`text-[12px] font-semibold text-ink-3`}>{t('조건 칩으로 보기')}</Text>
        </Pressable>
      </View>
    </AiBubble>
  );
}
