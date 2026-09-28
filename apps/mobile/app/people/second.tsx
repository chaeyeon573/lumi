import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowRight, ChevronRight, Handshake, MessageCircle, Quote, Search, UserPlus } from 'lucide-react-native';
import { t } from '@core/i18n';
import type { IntroRequest, User } from '@core/types';
import { secondDegree, type SecondDegree } from '@core/lib/graph';
import { canShowInPath, containsContact, profileView } from '@core/lib/privacy';
import { matchReasons, shareableReasons } from '@core/lib/recommend';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Avatar, BottomSheet, Button, Segmented, Tag, Textarea, C } from '@/ui';
import { useSnapshot } from '@/v2/useSnapshot';
import { useSectionState } from '@/v2/useSectionState';
import { Section, SectionEmpty, SectionSkeleton, PrivacyNote } from '@/v2/SectionState';
import { ReasonChips } from '@/v2/ReasonChips';
import { SchoolBadge } from '@/v2/SchoolBadge';
import { SaveButton } from '@/v2/PersonActions';
import { StatusPill } from '@/v2/StatusPill';
import { fmt, maskedCity } from '@/v2/personView';
import { ConnectStatusButton, maskedLine } from '@/v2/Network';
import { Row } from '@/v2/Forms';

type Tab = 'people' | 'asks';

/**
 * 아는 사람의 아는 사람 (웹 SecondDegreePage) — 2촌 탐색.
 *   사람: 경로(나 → 공통 연결 → 상대) · 겹치는 것 → 이름·프로필 → "연결해줄 수 있나요?" · 저장 · 연결
 *   연결 부탁(?tab=asks): 내가 이어줄 수 있는 부탁 · 나에게 전달된 소개 · 내가 한 부탁
 */
export default function SecondDegreeScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const tab: Tab = params.tab === 'asks' ? 'asks' : 'people';
  const setTab = (next: Tab) => router.setParams({ tab: next === 'people' ? '' : next } as never);
  const v = useViewer();
  const intros = useAppStore((s) => s.introRequests);
  const waiting = intros.filter((i) => (i.viaId === v.me.id && i.status === 'pending') || (i.toId === v.me.id && i.status === 'forwarded')).length;
  return (
    <Screen title={t('아는 사람의 아는 사람')} sub={<View style={tw`px-4 pb-3`}><Segmented<Tab> value={tab} onChange={setTab} options={[['people', t('사람')], ['asks', waiting ? `${t('연결 부탁')} ${waiting}` : t('연결 부탁')]]} /></View>}>
      {tab === 'people' ? <PeopleTab onAsks={() => setTab('asks')} /> : <AsksTab onPeople={() => setTab('people')} />}
    </Screen>
  );
}

// ─── 사람 — 2촌 카드 ─────────────────────────────────────────────────────────
function PeopleTab({ onAsks }: { onAsks: () => void }) {
  const v = useViewer();
  const snap = useSnapshot();
  const sec = useSectionState('second');
  const intros = useAppStore((s) => s.introRequests);
  const list = useMemo(() => secondDegree(snap, v.me.id, canShowInPath).filter((x) => !v.isBlocked(x.user.id) && !v.hasBlocked(x.user.id)), [snap, v]);
  const [mutualOf, setMutualOf] = useState<SecondDegree | null>(null);
  const [askFor, setAskFor] = useState<SecondDegree | null>(null);
  const myAsk = (toId: string) => intros.find((i) => i.fromId === v.me.id && i.toId === toId && (i.status === 'pending' || i.status === 'forwarded'));

  return (
    <View>
      <Text style={tw`px-1 pb-3 text-[12px] text-ink-3`}>{t('내 연결이 알고 있는 사람이에요. 공통 연결에게 먼저 물어볼 수 있어요.')}</Text>
      <Section loading={sec.loading} error={sec.error} onRetry={sec.retry} skeleton={<SectionSkeleton count={3} />}
        empty={list.length === 0 && (
          <SectionEmpty emoji="🌱" title={t('아직 2촌이 없어요')} description={t('연결이 생기면 그 사람들이 아는 사람이 여기에 보여요.')}
            action={<View style={tw`flex-row`}><Button size="sm" icon={<UserPlus size={14} color={C.onPrimary} />} onPress={() => nav('/people')}>{t('연결 늘리기')}</Button><View style={tw`w-2`} /><Button size="sm" variant="outline" icon={<Search size={14} color={C.ink2} />} onPress={() => nav('/people/find')}>{t('사람 찾아보기')}</Button></View>} />
        )}>
        {list.map((sd) => <SecondCard key={sd.user.id} sd={sd} asked={myAsk(sd.user.id)} onMutual={() => setMutualOf(sd)} onAsk={() => setAskFor(sd)} onAsks={onAsks} />)}
      </Section>
      <MutualSheet sd={mutualOf} onClose={() => setMutualOf(null)} />
      <AskSheet sd={askFor} onClose={() => setAskFor(null)} onDone={onAsks} />
    </View>
  );
}

/** 경로 한 줄 — "나 → 서연 외 1명 → 지민" */
function PathLine({ sd }: { sd: SecondDegree }) {
  const names = sd.via.slice(0, 2).map((u) => u.nickname).join(', ');
  const extra = sd.via.length > 2 ? sd.via.length - 2 + sd.hiddenVia : sd.hiddenVia;
  return (
    <View accessibilityLabel={t('연결 경로')} style={tw`flex-row items-center`}>
      <Text style={tw`text-[13px] font-semibold text-ink-3`}>{t('나')}</Text>
      <ArrowRight size={13} color={C.ink3} style={tw`mx-1`} />
      {sd.via.slice(0, 2).map((u) => <Avatar key={u.id} emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={20} style={tw`mr-0.5`} />)}
      <Text numberOfLines={1} style={tw`ml-0.5 shrink text-[13px] font-semibold text-primary`}>{names || fmt(t('공통 연결 {n}명'), { n: sd.hiddenVia })}{names && extra > 0 ? ` ${fmt(t('외 {n}명'), { n: extra })}` : ''}</Text>
      <ArrowRight size={13} color={C.ink3} style={tw`mx-1`} />
      <Text numberOfLines={1} style={tw`text-[13px] font-semibold text-ink`}>{sd.user.nickname}</Text>
    </View>
  );
}

function SecondCard({ sd, asked, onMutual, onAsk, onAsks }: { sd: SecondDegree; asked?: IntroRequest; onMutual: () => void; onAsk: () => void; onAsks: () => void }) {
  const v = useViewer();
  const u = sd.user;
  const view = profileView(v.snap, v.me, u);
  const reasons = shareableReasons(matchReasons(v.me, u, v.snap, v.canSeeField(u, 'timetable'))).filter((r) => r.kind !== 'mutual');
  const line = [maskedLine(u, view), maskedCity(u, view)].filter(Boolean).join(' · ');
  const total = sd.via.length + sd.hiddenVia;
  const canIntro = sd.via.length > 0;
  const open = () => nav(`/users/${u.id}`);
  return (
    <View style={tw`mb-3 rounded-[24px] border border-line bg-white overflow-hidden`}>
      {/* 1. 관계의 이유 · 연결 경로 */}
      <View style={tw`bg-sky-soft px-3.5 pt-3 pb-2.5`}>
        <View style={tw`flex-row items-center`}>
          <View style={tw`h-6 px-2.5 rounded-full bg-primary justify-center`}><Text style={tw`text-[11px] font-bold text-white`}>{t('2촌')}</Text></View>
          <Pressable onPress={onMutual} style={tw`ml-1.5 h-6 pl-2.5 pr-1.5 rounded-full bg-white border border-primary-soft flex-row items-center`}><Text style={tw`text-[11px] font-bold text-primary`}>{fmt(t('공통 연결 {n}명'), { n: total })}</Text><ChevronRight size={12} color={C.primary} /></Pressable>
          <View style={tw`flex-1`} />
          {canIntro ? <Tag tone="mint">{t('소개 가능')}</Tag> : null}
        </View>
        <View style={tw`mt-1.5`}><PathLine sd={sd} /></View>
        {reasons.length ? <View style={tw`mt-1.5`}><ReasonChips reasons={reasons} max={3} /></View> : null}
      </View>
      {/* 2. 사람 */}
      <Pressable onPress={open} style={tw`px-3.5 pt-3 flex-row items-center`}>
        <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={52} />
        <View style={tw`flex-1 min-w-0 ml-3`}>
          <View style={tw`flex-row items-center`}><Text numberOfLines={1} style={tw`text-[15px] font-bold text-ink shrink-0 max-w-[60%] mr-1.5`}>{u.nickname}</Text><SchoolBadge user={u} withYear={view.gradYear} size="sm" /></View>
          {line ? <Text numberOfLines={1} style={tw`text-[12px] text-ink-2`}>{line}</Text> : null}
          <View style={tw`mt-0.5`}><StatusPill user={u} size="sm" /></View>
          {!view.full && view.reason ? <PrivacyNote text={view.reason} /> : null}
        </View>
      </Pressable>
      {/* 3. 실제 연결 — 부탁 · 저장 · 연결 요청 */}
      <View style={tw`px-3.5 pt-2.5 pb-3 flex-row items-center`}>
        {asked ? (
          <Pressable onPress={onAsks} style={tw`h-9 px-3.5 rounded-full bg-surface-2 flex-row items-center`}>
            <Handshake size={14} color={C.ink2} /><Text style={tw`mx-1 text-[12px] font-semibold text-ink-2`}>{asked.status === 'forwarded' ? t('전달됨') : t('전달 대기')}</Text><ChevronRight size={13} color={C.ink2} />
          </Pressable>
        ) : canIntro ? (
          <Button size="sm" variant="secondary" icon={<Handshake size={14} color={C.primary} />} onPress={onAsk}>{t('연결해줄 수 있나요?')}</Button>
        ) : null}
        <View style={tw`w-1.5`} />
        <SaveButton user={u} />
        <View style={tw`flex-1`} />
        <ConnectStatusButton user={u} />
      </View>
    </View>
  );
}

/** 공통 연결 목록 — 경로에 보이지 않게 설정한 사람은 숫자로만 */
function MutualSheet({ sd, onClose }: { sd: SecondDegree | null; onClose: () => void }) {
  return (
    <BottomSheet open={!!sd} onClose={onClose} title={sd ? fmt(t('{name}님과의 공통 연결'), { name: sd.user.nickname }) : ''}>
      {sd ? (
        <View>
          {sd.via.map((u) => (
            <Pressable key={u.id} onPress={() => { onClose(); nav(`/users/${u.id}`); }} style={tw`mb-1.5 rounded-2xl bg-surface-2 px-3 py-2 flex-row items-center`}>
              <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={36} />
              <View style={tw`flex-1 min-w-0 ml-3`}><Text numberOfLines={1} style={tw`text-[14px] font-bold text-ink`}>{u.nickname}</Text><SchoolBadge user={u} size="sm" /></View>
              <ChevronRight size={16} color={C.ink3} />
            </Pressable>
          ))}
          {sd.hiddenVia > 0 ? <PrivacyNote text={fmt(t('외 {n}명은 경로에 보이지 않게 설정했어요'), { n: sd.hiddenVia })} /> : null}
        </View>
      ) : null}
    </BottomSheet>
  );
}

/** "연결해줄 수 있나요?" — 공통 연결 고르기 + 한 줄(선택). 연락처는 적을 수 없다 */
function AskSheet({ sd, onClose, onDone }: { sd: SecondDegree | null; onClose: () => void; onDone: () => void }) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [viaId, setViaId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(null);
  if (sd && key !== sd.user.id) { setKey(sd.user.id); setViaId(sd.via[0]?.id ?? null); setNote(''); setErr(null); }
  const contact = containsContact(note);
  const via = sd?.via.find((u) => u.id === viaId);
  const submit = async () => {
    if (!sd || !via) return;
    if (contact) { setErr(t('연락처(전화번호·이메일·메신저 ID)는 적을 수 없어요. 연결되면 대화에서 주고받아요.')); return; }
    setBusy(true); setErr(null);
    try {
      await run(() => api.intros.create(v.me.id, via.id, sd.user.id, note.trim() || undefined), fmt(t('{name}님에게 물어봤어요'), { name: via.nickname }));
      onClose(); setKey(null); onDone();
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <BottomSheet open={!!sd} onClose={() => { onClose(); setKey(null); }} title={t('연결해줄 수 있나요?')} tall>
      {sd ? (
        <View>
          <Text style={tw`text-[13px] text-ink-2`}>{fmt(t('{name}님은 공통 연결이 전달하기 전까지 이 부탁을 몰라요. 넘겨도 괜찮은 가벼운 부탁이에요.'), { name: sd.user.nickname })}</Text>
          <Text style={tw`mt-3 mb-1.5 text-[12px] font-bold text-ink-3`}>{t('누구에게 물어볼까요?')}</Text>
          {sd.via.map((u) => { const on = viaId === u.id; return (
            <Pressable key={u.id} accessibilityRole="radio" accessibilityState={{ selected: on }} onPress={() => setViaId(u.id)} style={tw`mb-1.5 rounded-2xl border px-3 py-2 flex-row items-center ${on ? 'border-primary bg-primary-soft' : 'border-line bg-white'}`}>
              <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={34} />
              <Text numberOfLines={1} style={tw`flex-1 ml-3 text-[14px] font-bold text-ink`}>{u.nickname}</Text>
              <View style={tw`h-5 w-5 rounded-full border-2 items-center justify-center ${on ? 'border-primary' : 'border-line'}`}>{on ? <View style={tw`h-2.5 w-2.5 rounded-full bg-primary`} /> : null}</View>
            </Pressable>
          ); })}
          {sd.hiddenVia > 0 ? <PrivacyNote text={fmt(t('외 {n}명은 경로에 보이지 않게 설정했어요'), { n: sd.hiddenVia })} /> : null}
          <Text style={tw`mt-3 mb-1.5 text-[12px] font-bold text-ink-3`}>{t('한 줄 (선택)')}</Text>
          <Textarea maxLength={200} value={note} onChangeText={(s) => { setNote(s); setErr(null); }} placeholder={t('어떤 이야기를 나누고 싶은지 짧게 적어주세요')} style={contact || err ? { borderColor: C.danger } : undefined} />
          {contact || err ? <Text accessibilityRole="alert" style={tw`mt-1 text-[12px] text-danger`}>{err ?? t('연락처(전화번호·이메일·메신저 ID)는 적을 수 없어요. 연결되면 대화에서 주고받아요.')}</Text> : null}
          <Row style={tw`mt-4`}><Button full size="lg" loading={busy} disabled={!via || contact} icon={<Handshake size={16} color={C.onPrimary} />} onPress={submit}>{via ? fmt(t('{name}님에게 물어보기'), { name: via.nickname }) : t('물어보기')}</Button></Row>
        </View>
      ) : null}
    </BottomSheet>
  );
}

// ─── 연결 부탁 ───────────────────────────────────────────────────────────────
const MY_STATUS: Record<IntroRequest['status'], { label: string; tone: 'neutral' | 'primary' }> = {
  pending: { label: t('전달 대기'), tone: 'neutral' },
  forwarded: { label: t('전달됨'), tone: 'primary' },
  accepted: { label: t('이어짐'), tone: 'primary' },
  passed: { label: t('이번엔 어려웠어요'), tone: 'neutral' },
  declined: { label: t('이번엔 어려웠어요'), tone: 'neutral' },
};

function AsksTab({ onPeople }: { onPeople: () => void }) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const intros = useAppStore((s) => s.introRequests);
  const rooms = useAppStore((s) => s.chatRooms);
  const sec = useSectionState('asks');
  const [busy, setBusy] = useState<string | null>(null);
  const me = v.me.id;
  const byDate = (a: IntroRequest, b: IntroRequest) => b.createdAt.localeCompare(a.createdAt);
  const viaMe = intros.filter((i) => i.viaId === me && i.status === 'pending').sort(byDate);
  const toMe = intros.filter((i) => i.toId === me && i.status === 'forwarded').sort(byDate);
  const mine = intros.filter((i) => i.fromId === me).sort(byDate);
  const name = (id: string) => v.userById(id)?.nickname ?? t('알 수 없음');
  const empty = viaMe.length + toMe.length + mine.length === 0;
  const act = async (id: string, fn: () => Promise<unknown>) => { setBusy(id); try { await fn(); } catch { /* toast by run */ } finally { setBusy(null); } };
  const forward = (it: IntroRequest, pass: boolean) => act(`${it.id}${pass ? 'p' : 'f'}`, () => run(() => api.intros.forward(it.id, me, pass), pass ? t('넘겼어요 · 아무에게도 알리지 않아요') : fmt(t('{name}님에게 전달했어요'), { name: name(it.toId) })));
  const respond = (it: IntroRequest, accept: boolean) => act(`${it.id}${accept ? 'a' : 'd'}`, async () => {
    const r = await run(() => api.intros.respond(it.id, me, accept), accept ? fmt(t('{name}님과 대화가 열렸어요'), { name: name(it.fromId) }) : t('알겠어요 · 상대에게 따로 알리지 않아요'));
    if (accept && r.roomId) nav(`/chats/${r.roomId}`);
  });
  const roomWith = (other: string) => rooms.find((r) => r.type === 'direct' && r.memberIds.includes(me) && r.memberIds.includes(other));
  const H = ({ children }: { children: ReactNode }) => <Text style={tw`mt-2 mb-2 px-1 text-[14px] font-bold text-ink`}>{children}</Text>;

  return (
    <Section loading={sec.loading} error={sec.error} onRetry={sec.retry} skeleton={<SectionSkeleton count={2} />}
      empty={empty && <SectionEmpty emoji="🤝" title={t('아직 연결 부탁이 없어요')} description={t('2촌 카드에서 “연결해줄 수 있나요?”로 공통 연결에게 물어볼 수 있어요.')} action={<Button size="sm" onPress={onPeople}>{t('2촌 보기')}</Button>} />}>
      {viaMe.length > 0 ? (
        <View>
          <H>{t('이어줄 수 있을까요?')}</H>
          {viaMe.map((it) => (
            <AskCard key={it.id} a={v.userById(it.fromId)} b={v.userById(it.toId)} note={it.note} title={fmt(t('{a}님이 {b}님과 연결되고 싶어해요'), { a: name(it.fromId), b: name(it.toId) })} foot={t('넘겨도 아무에게도 알리지 않아요')}
              actions={<><Button size="sm" variant="outline" loading={busy === `${it.id}p`} onPress={() => forward(it, true)}>{t('넘기기')}</Button><View style={tw`w-1.5`} /><Button size="sm" loading={busy === `${it.id}f`} onPress={() => forward(it, false)}>{t('전달하기')}</Button></>} />
          ))}
        </View>
      ) : null}
      {toMe.length > 0 ? (
        <View>
          <H>{t('나에게 온 소개')}</H>
          {toMe.map((it) => (
            <AskCard key={it.id} a={v.userById(it.viaId)} b={v.userById(it.fromId)} note={it.note} title={fmt(t('{a}님이 {b}님을 이어주고 싶어해요'), { a: name(it.viaId), b: name(it.fromId) })} foot={t('괜찮아요를 눌러도 상대에게 따로 알리지 않아요')} onPerson={() => nav(`/users/${it.fromId}`)}
              actions={<><Button size="sm" variant="outline" loading={busy === `${it.id}d`} onPress={() => respond(it, false)}>{t('괜찮아요')}</Button><View style={tw`w-1.5`} /><Button size="sm" icon={<MessageCircle size={14} color={C.onPrimary} />} loading={busy === `${it.id}a`} onPress={() => respond(it, true)}>{t('대화 시작')}</Button></>} />
          ))}
        </View>
      ) : null}
      {mine.length > 0 ? (
        <View>
          <H>{t('내가 한 부탁')}</H>
          {mine.map((it) => {
            const st = MY_STATUS[it.status];
            const room = it.status === 'accepted' ? roomWith(it.toId) : undefined;
            const u = v.userById(it.toId);
            return (
              <View key={it.id} style={tw`mb-2 rounded-[20px] border border-line bg-white px-3.5 py-3 flex-row items-center`}>
                <Pressable onPress={() => nav(`/users/${it.toId}`)}>{u ? <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={40} /> : null}</Pressable>
                <View style={tw`flex-1 min-w-0 mx-3`}>
                  <Text numberOfLines={1} style={tw`text-[13px] font-semibold text-ink`}>{`${name(it.viaId)} → ${name(it.toId)}`}</Text>
                  {it.note ? <Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>"{it.note}"</Text> : null}
                </View>
                {room ? <View style={tw`mr-1.5`}><Button size="sm" variant="secondary" icon={<MessageCircle size={13} color={C.primary} />} onPress={() => nav(`/chats/${room.id}`)}>{t('대화')}</Button></View> : null}
                <Tag tone={st.tone}>{st.label}</Tag>
              </View>
            );
          })}
        </View>
      ) : null}
    </Section>
  );
}

/** 부탁 카드 — 두 사람(아바타) · 한 문장 · 한 줄 메모 · 행동 */
function AskCard({ a, b, title, note, foot, actions, onPerson }: { a?: User; b?: User; title: string; note?: string; foot: string; actions: ReactNode; onPerson?: () => void }) {
  return (
    <View style={tw`mb-2 rounded-[24px] border border-line bg-white p-3.5`}>
      <View style={tw`flex-row items-start`}>
        <Pressable onPress={onPerson} disabled={!onPerson} style={tw`h-11 w-14`}>
          {a ? <Avatar emoji={a.avatar.emoji} hue={a.avatar.hue} url={a.avatar.url} size={36} style={tw`absolute left-0 top-0`} /> : null}
          {b ? <Avatar emoji={b.avatar.emoji} hue={b.avatar.hue} url={b.avatar.url} size={36} style={[tw`absolute right-0 bottom-0 border-2 border-white`]} /> : null}
        </Pressable>
        <View style={tw`flex-1 min-w-0 ml-3`}>
          <Text style={tw`text-[14px] font-semibold text-ink`}>{title}</Text>
          {note ? <View style={tw`mt-1.5 rounded-2xl bg-sky-soft px-3 py-2 flex-row`}><Quote size={12} color={C.primary} style={tw`mt-0.5`} /><Text style={tw`ml-1.5 flex-1 text-[13px] text-ink-2`}>{note}</Text></View> : null}
        </View>
      </View>
      <View style={tw`mt-2.5 flex-row items-center`}>
        <Text style={tw`flex-1 mr-2 text-[11px] text-ink-3`}>{foot}</Text>
        {actions}
      </View>
    </View>
  );
}
