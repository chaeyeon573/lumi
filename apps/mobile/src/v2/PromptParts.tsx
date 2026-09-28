/**
 * 대화 거리 — AI 사람 찾기 입구 · 프로필 질문 카드 · 한마디 · 오늘의 질문 · 서로 아는 사람 (웹과 같은 core 헬퍼 `@core/lib/prompts-fun`).
 * 데이팅 앱이 아니다: 하트·좋아요 대신 "한마디", 서로 아는 사람 대신 "서로 아는 사람".
 */
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Sparkles, Search, ChevronRight, Quote, MessageCircle, Handshake, ArrowRight } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import type { FriendNote, ProfilePrompt, User } from '@core/types';
import type { StageKind } from '@core/lib/stage';
import { questionById, MAX_TEXT_PROMPTS } from '@core/data/prompts';
import { highlightPrompt, mutualPeople, namesLine, dailyPrompt, answersTo } from '@core/lib/prompts-fun';
import { canShowInPath, connectionStatus, containsContact, CONNECTION_LABELS } from '@core/lib/privacy';
import { mutualFriends } from '@core/lib/relations';
import { isPlus, swipesLeft } from '@core/lib/monetization';
import { todayISO } from '@core/lib/format';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { useViewer } from '@/viewer';
import { Avatar, BottomSheet, Button, Tag, Textarea, C } from '@/ui';
import { PaywallSheet } from '@/components/PaywallSheet';
import { SchoolBadge } from './SchoolBadge';
import { PrivacyNote } from './SectionState';
import { fmt } from './personView';

// ─── AI 사람 찾기 ────────────────────────────────────────────────────────────
/** 단계별 예시 문장 — 누르면 /people/find?q= 로 바로 찾는다 (언어별 데이터셋이라 문장 자체가 언어별) */
const AI_EXAMPLES: Record<'ko' | 'en', Record<StageKind, string[]>> = {
  ko: {
    undergrad: ['같이 클라이밍 갈 공대생', '러닝 좋아하는 같은 전공', '보드게임 같이 할 사람'],
    grad: ['다른 학교에서 NLP 연구하는 대학원생', '서울 AI 창업 관심 있는 대학원생', '같은 분야 박사과정 선배'],
    alumni: ['성수에서 일하는 핀테크 동문', '뉴욕 금융권 동문', '서울에서 창업한 동문'],
  },
  en: {
    undergrad: ['Climbing buddies in engineering', 'Runners in my major', 'Board game people'],
    grad: ['NLP grad students at other schools', 'Grad students into AI startups', 'PhD students ahead of me in my field'],
    alumni: ['Fintech alumni in New York', 'Alumni in NYC finance', 'Alumni founders in SF'],
  },
};
export const aiExamples = (kind: StageKind) => AI_EXAMPLES[lang === 'en' ? 'en' : 'ko'][kind];
const findWith = (q: string) => nav(`/people/find?q=${encodeURIComponent(q)}`);

/** 홈 상단 카드 — "찾는 사람을 말로 설명해 보세요" + 가짜 입력칸 + 단계별 예시 칩 */
export function AiSearchCard({ kind }: { kind: StageKind }) {
  const examples = aiExamples(kind);
  return (
    <View style={tw`mt-3 rounded-[24px] bg-primary-soft p-4`}>
      <View style={tw`flex-row items-center`}>
        <View style={tw`h-9 w-9 rounded-full bg-white items-center justify-center`}><Sparkles size={17} color={C.primary} /></View>
        <View style={tw`flex-1 min-w-0 ml-2.5`}>
          <Text style={tw`text-[15px] font-bold text-ink`}>{t('찾는 사람을 말로 설명해 보세요')}</Text>
          <Text style={tw`text-[12px] text-ink-2`}>{t('AI가 조건을 알아듣고 찾아줘요')}</Text>
        </View>
      </View>
      <Pressable onPress={() => nav('/people/find')} accessibilityRole="search" accessibilityLabel={t('AI에게 찾아달라고 하기')} style={tw`mt-3 h-12 rounded-full bg-white border border-line flex-row items-center pl-4 pr-1.5`}>
        <Search size={16} color={C.ink3} />
        <Text numberOfLines={1} style={tw`flex-1 ml-2 text-[14px] text-ink-3`}>{examples[0]}</Text>
        <View style={tw`h-9 w-9 rounded-full bg-accent-soft items-center justify-center`}><ArrowRight size={16} color={C.primary} /></View>
      </Pressable>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`-mx-4 mt-2.5`} contentContainerStyle={tw`px-4`}>
        {examples.slice(1).map((x) => (
          <Pressable key={x} onPress={() => findWith(x)} style={tw`h-8 px-3 mr-1.5 rounded-full bg-white justify-center`}>
            <Text numberOfLines={1} style={tw`text-[12px] font-semibold text-primary`}>{x}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

/** 사람 탭 맨 위 — 검색창 모양 입구 */
export function AiSearchEntry() {
  return (
    <Pressable onPress={() => nav('/people/find')} accessibilityRole="search" style={tw`mx-4 mb-2.5 h-11 rounded-full bg-accent-soft pl-3.5 pr-3 flex-row items-center`}>
      <Sparkles size={16} color={C.primary} />
      <Text numberOfLines={1} style={tw`flex-1 ml-2 text-[14px] font-semibold text-primary`}>{t('AI에게 찾아달라고 하기')}</Text>
      <Search size={16} color={C.primary} />
    </Pressable>
  );
}

// ─── 카드에 한 줄 — 이 사람의 답 하나 ───────────────────────────────────────
/** 사람 카드용 인용 한 줄 (내 답과 겹치는 답을 먼저). 질문 답변을 볼 수 없으면 아무것도 안 그린다 */
export function PromptQuote({ user, lines = 1 }: { user: User; lines?: number }) {
  const v = useViewer();
  const h = useMemo(() => (v.canSeeField(user, 'prompts') ? highlightPrompt(v.me, user) : undefined), [v, user]);
  if (!h) return null;
  return (
    <View style={tw`mt-1 flex-row items-start`}>
      <Quote size={11} color={C.ink3} style={{ marginTop: 3 }} />
      <Text numberOfLines={lines} style={tw`ml-1 flex-1 text-[12px] text-ink-2 italic`}>{h.answer}</Text>
    </View>
  );
}

// ─── 서로 아는 사람 ──────────────────────────────────────────────────────────
/** 둘 다와 연결된 사람 — 경로 공개를 끈 사람은 이름 없이 숫자로만 */
export function useMutual(user: User) {
  const v = useViewer();
  return useMemo(() => {
    const total = mutualFriends(v.snap, v.me.id, user.id).length;
    const shown = mutualPeople(v.snap, v.me.id, user.id, canShowInPath);
    return { total, shown, hidden: total - shown.length };
  }, [v, user.id]);
}

/** 겹친 얼굴 최대 3개 */
function AvatarStack({ people, size = 22 }: { people: User[]; size?: number }) {
  return (
    <View style={tw`flex-row`}>
      {people.slice(0, 3).map((u, i) => (
        <View key={u.id} style={[{ marginLeft: i ? -size / 3 : 0, borderRadius: size, borderWidth: 2, borderColor: C.surface }]}>
          <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={size} />
        </View>
      ))}
    </View>
  );
}

/** "👥 서로 아는 사람 2명 · 지민, 서연" — 누르면 목록 시트 */
export function MutualLine({ user, onPress, big }: { user: User; onPress?: () => void; big?: boolean }) {
  const { total, shown } = useMutual(user);
  if (!total) return null;
  const label = fmt(t('서로 아는 사람 {n}명'), { n: total });
  const names = shown.length ? namesLine(shown, 2, lang === 'en' ? 'en' : 'ko') : '';
  const body = (
    <>
      {shown.length ? <AvatarStack people={shown} size={big ? 26 : 20} /> : null}
      <Text numberOfLines={1} style={tw`${shown.length ? 'ml-1.5' : ''} shrink ${big ? 'text-[13px]' : 'text-[11px]'} font-semibold text-verify`}>
        {label}{names ? <Text style={tw`font-medium text-ink-2`}> · {names}</Text> : null}
      </Text>
      {onPress ? <ChevronRight size={big ? 15 : 12} color={C.verify} /> : null}
    </>
  );
  if (!onPress) return <View style={tw`flex-row items-center`}>{body}</View>;
  return <Pressable onPress={onPress} accessibilityRole="button" hitSlop={4} style={tw`flex-row items-center ${big ? 'self-start rounded-full bg-accent-soft pl-1.5 pr-2.5 py-1' : ''}`}>{body}</Pressable>;
}

/** 서로 아는 사람 목록 — 아직 연결 전이면 그 사람에게 소개를 부탁할 수 있다 (2촌 소개 흐름 api.intros) */
export function MutualSheet({ user, open, onClose }: { user: User; open: boolean; onClose: () => void }) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const intros = useAppStore((s) => s.introRequests);
  const { shown, hidden } = useMutual(user);
  const [busy, setBusy] = useState<string | null>(null);
  // 이미 연결됐거나 연결 요청을 보낸 뒤면 소개를 부탁할 필요가 없다
  const connected = v.isFriend(user.id) || !!v.pendingOut(user.id);
  const asked = intros.find((i) => i.fromId === v.me.id && i.toId === user.id && (i.status === 'pending' || i.status === 'forwarded'));
  const ask = async (via: User) => {
    setBusy(via.id);
    try { await run(() => api.intros.create(v.me.id, via.id, user.id), fmt(t('{name}님에게 물어봤어요'), { name: via.nickname })); } catch { /* toast */ } finally { setBusy(null); }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={fmt(t('{name}님과 서로 아는 사람'), { name: user.nickname })}>
      {shown.map((u) => (
        <View key={u.id} style={tw`mb-1.5 rounded-2xl bg-surface-2 px-3 py-2 flex-row items-center`}>
          <Pressable onPress={() => { onClose(); nav(`/users/${u.id}`); }} style={tw`flex-1 min-w-0 flex-row items-center`}>
            <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={36} />
            <View style={tw`flex-1 min-w-0 ml-3`}><Text numberOfLines={1} style={tw`text-[14px] font-bold text-ink`}>{u.nickname}</Text><SchoolBadge user={u} size="sm" /></View>
          </Pressable>
          {connected ? <ChevronRight size={16} color={C.ink3} />
            : asked ? (asked.viaId === u.id ? <Tag>{asked.status === 'forwarded' ? t('전달됨') : t('전달 대기')}</Tag> : null)
            : <Button size="sm" variant="outline" loading={busy === u.id} icon={<Handshake size={14} color={C.ink2} />} onPress={() => ask(u)}>{t('소개 부탁')}</Button>}
        </View>
      ))}
      {hidden > 0 ? <PrivacyNote text={fmt(t('외 {n}명은 경로에 보이지 않게 설정했어요'), { n: hidden })} /> : null}
      {!connected && !asked && shown.length > 0 ? <Text style={tw`mt-2 text-[12px] text-ink-3`}>{t('소개를 부탁하면 그 사람이 먼저 물어봐 줘요. 넘겨도 괜찮은 가벼운 부탁이에요.')}</Text> : null}
    </BottomSheet>
  );
}

// ─── 질문 카드 · 한마디 ──────────────────────────────────────────────────────
/** 프로필 질문 큰 카드 — 질문은 작게, 답은 크게. onNote 가 있으면 "한마디" 버튼 */
export function BigPromptCard({ prompt, onNote }: { prompt: ProfilePrompt; onNote?: () => void }) {
  const q = questionById(prompt.questionId);
  return (
    <View style={tw`rounded-[24px] border border-line bg-white px-5 pt-4 pb-4`}>
      <Text style={tw`text-[13px] font-semibold text-ink-2`}>{q?.text}</Text>
      <Text style={[tw`mt-1.5 text-[22px] font-bold text-ink`, { lineHeight: 30, letterSpacing: -0.3 }]}>{prompt.answer}</Text>
      {onNote ? (
        <View style={tw`mt-3 flex-row justify-end`}>
          <Pressable onPress={onNote} accessibilityLabel={`${t('한마디')} · ${q?.text ?? ''}`} style={tw`h-9 pl-3 pr-3.5 rounded-full bg-accent-soft flex-row items-center`}>
            <MessageCircle size={15} color={C.primary} /><Text style={tw`ml-1.5 text-[13px] font-semibold text-primary`}>{t('한마디')}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

/** 받은 요청에 붙은 한마디 — 인용한 답 + 한 줄 */
export function NoteBubble({ note }: { note?: FriendNote }) {
  if (!note?.text) return null;
  return (
    <View style={tw`mt-1.5 rounded-2xl bg-surface-2 px-3 py-2`}>
      {note.quote ? <View style={tw`flex-row items-start`}><Quote size={10} color={C.ink3} style={{ marginTop: 3 }} /><Text numberOfLines={2} style={tw`ml-1 flex-1 text-[11px] text-ink-3 italic`}>{note.quote}</Text></View> : null}
      <Text style={tw`${note.quote ? 'mt-0.5' : ''} text-[13px] text-ink`}>{note.text}</Text>
    </View>
  );
}

const NOTE_MAX = 140;

/**
 * 한마디 시트 — 답을 인용하고 한 줄을 붙여 연결 요청. 이미 연결됐으면 대화방에 "“답” — 한마디"로 보낸다. 요청을 보낸 뒤면 비활성.
 * 연락처는 적을 수 없다 (엔진도 막는다).
 */
export function NoteSheet({ user, prompt, onClose }: { user: User; prompt: ProfilePrompt | null; onClose: () => void }) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [paywall, setPaywall] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  if (prompt && key !== prompt.questionId) { setKey(prompt.questionId); setText(''); }
  const status = connectionStatus(v.snap, v.me, user);
  const connected = v.isFriend(user.id);
  const requested = !connected && (status === 'requested' || !!v.pendingOut(user.id));
  const canSend = connected || status === 'can_request';
  const contact = containsContact(text);
  const q = prompt ? questionById(prompt.questionId) : undefined;
  const close = () => { setKey(null); onClose(); };

  const send = async () => {
    if (!prompt || !text.trim() || contact) return;
    setBusy(true);
    try {
      if (connected) {
        const res = await run(() => api.chats.openDirect(v.me.id, user.id));
        await run(() => api.chats.send(res.room.id, v.me.id, `“${prompt.answer.slice(0, 80)}” — ${text.trim()}`));
        close(); nav(`/chats/${res.room.id}`);
        return;
      }
      if (!isPlus(v.me) && swipesLeft(v.me) <= 0) { setPaywall(true); return; }
      await run(() => api.relationships.sendFriendRequest(v.me.id, user.id, { text: text.trim(), promptId: prompt.questionId, quote: prompt.answer }), fmt(t('{name}님에게 한마디를 보냈어요'), { name: user.nickname }));
      close();
    } catch {
      const fresh = useAppStore.getState().users.find((x) => x.id === v.me.id) ?? v.me;
      if (!connected && !isPlus(fresh) && swipesLeft(fresh) <= 0) setPaywall(true);
    } finally { setBusy(false); }
  };

  const label = connected ? t('한마디 보내기') : requested ? t('요청 보냄') : canSend ? t('한마디와 함께 연결 요청') : CONNECTION_LABELS[status];
  return (
    <>
      <BottomSheet open={!!prompt} onClose={close} title={fmt(t('{name}님에게 한마디'), { name: user.nickname })} tall>
        {prompt ? (
          <View>
            <View style={tw`rounded-[20px] bg-primary-soft px-4 py-3`}>
              <Text style={tw`text-[12px] font-semibold text-ink-2`}>{q?.text}</Text>
              <Text style={tw`mt-1 text-[17px] font-bold text-ink`}>“{prompt.answer}”</Text>
            </View>
            <View style={tw`mt-3`}>
              <Textarea value={text} onChangeText={(s) => setText(s.slice(0, NOTE_MAX))} maxLength={NOTE_MAX} editable={!requested && canSend} placeholder={t('이 답에 한마디 남겨 보세요')} style={contact ? { borderColor: C.danger } : undefined} />
              <View style={tw`mt-1 flex-row`}>
                <Text accessibilityRole={contact ? 'alert' : undefined} style={tw`flex-1 text-[12px] ${contact ? 'text-danger' : 'text-ink-3'}`}>{contact ? t('연락처는 한마디에 적을 수 없어요.') : connected ? t('대화방으로 바로 보내요') : t('수락하면 대화가 열려요')}</Text>
                <Text style={tw`text-[12px] text-ink-3`}>{text.length}/{NOTE_MAX}</Text>
              </View>
            </View>
            <View style={tw`mt-4 flex-row`}>
              <Button full size="lg" loading={busy} disabled={requested || !canSend || !text.trim() || contact} icon={<MessageCircle size={16} color={C.onPrimary} />} onPress={send}>{label}</Button>
            </View>
          </View>
        ) : null}
      </BottomSheet>
      <PaywallSheet open={paywall} onClose={() => setPaywall(false)} reason="limit" />
    </>
  );
}

// ─── 오늘의 질문 ─────────────────────────────────────────────────────────────
/** 오늘의 질문 — 답하면 내 프로필 질문에 더해진다(최대 6개). 가까운 사람들의 답 2~3개를 같이 보여준다 */
export function DailyPromptCard() {
  const v = useViewer();
  const me = v.me;
  const run = useAppStore((s) => s.run);
  const q = useMemo(() => dailyPrompt(me, todayISO()), [me]);
  const mine = me.prompts.find((p) => p.questionId === q.id && p.answer.trim());
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const full = me.prompts.length >= MAX_TEXT_PROMPTS;
  const others = useMemo(() => {
    const rank = (u: User) => (v.isFriend(u.id) ? 2 : mutualFriends(v.snap, me.id, u.id).length ? 1 : 0);
    const pool = v.visibleUsers.filter((u) => v.canSeeField(u, 'prompts'));
    return answersTo(pool, q.id, me.id, rank).slice(0, 3);
  }, [v, me.id, q.id]);
  const save = async () => {
    const answer = draft.trim();
    if (!answer || full) return;
    setBusy(true);
    try { await run(() => api.users.update(me.id, { prompts: [...me.prompts, { questionId: q.id, answer }] }), t('내 프로필 질문에 더했어요')); setDraft(''); } catch { /* toast */ } finally { setBusy(false); }
  };

  return (
    <View style={tw`mt-4 rounded-[24px] bg-accent-soft p-4`}>
      <View style={tw`flex-row items-center`}><Sparkles size={13} color={C.primary} /><Text style={tw`ml-1 text-[12px] font-bold text-primary`}>{t('오늘의 질문')}</Text></View>
      <Text style={[tw`mt-1 text-[18px] font-bold text-ink`, { letterSpacing: -0.3 }]}>{q.text}</Text>
      {mine ? (
        <View style={tw`mt-2 rounded-2xl bg-white px-3.5 py-2.5`}><Text style={tw`text-[14px] text-ink`}>“{mine.answer}”</Text></View>
      ) : full ? (
        <Pressable onPress={() => nav('/profile/prompts')} style={tw`mt-2 rounded-2xl bg-white px-3.5 py-2.5 flex-row items-center`}>
          <Text style={tw`flex-1 text-[13px] text-ink-2`}>{t('질문은 6개까지예요 · 하나를 바꾸면 답할 수 있어요')}</Text><ChevronRight size={15} color={C.ink3} />
        </Pressable>
      ) : (
        <View style={tw`mt-2`}>
          <Textarea value={draft} onChangeText={setDraft} maxLength={80} placeholder={q.placeholder ?? t('2줄 이내로 짧게')} style={{ minHeight: 64 }} />
          <View style={tw`mt-2 flex-row items-center`}>
            <Text style={tw`flex-1 text-[11px] text-ink-3`}>{t('답하면 내 프로필 질문에 더해져요')}</Text>
            <Button size="sm" variant="secondary" loading={busy} disabled={!draft.trim()} onPress={save}>{t('답하기')}</Button>
          </View>
        </View>
      )}
      {others.length > 0 ? (
        <View style={tw`mt-3`}>
          {others.map((a) => (
            <Pressable key={a.user.id} onPress={() => nav(`/users/${a.user.id}`)} style={tw`mt-1.5 flex-row items-start`}>
              <Avatar emoji={a.user.avatar.emoji} hue={a.user.avatar.hue} url={a.user.avatar.url} size={28} />
              <Text numberOfLines={2} style={tw`ml-2 flex-1 text-[13px] text-ink-2`}><Text style={tw`font-bold text-ink`}>{a.user.nickname}</Text>  {a.answer}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
