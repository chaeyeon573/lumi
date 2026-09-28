import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { MessageCircle, Users, ArrowRight, XCircle } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { matchesForRequest, audienceForRequest, relevanceToRequest, requestContextLine, degreeLabel, REACH_LABELS_KO, REACH_LABELS_EN, type IncomingRequest } from '@core/lib/requests';
import { degreeOf, pathBetween } from '@core/lib/graph';
import { mutualFriends } from '@core/lib/relations';
import { canShowInPath } from '@core/lib/privacy';
import { personLine, contextLine } from '@core/lib/network';
import type { Reason } from '@core/lib/recommend';
import type { Patch } from '@core/api/types';
import type { NetworkRequest, RequestResponse, User } from '@core/types';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Avatar, Button, Tag, C } from '@/ui';
import { useSnapshot } from '@/v2/useSnapshot';
import { useSectionState } from '@/v2/useSectionState';
import { Section, SectionEmpty, SectionSkeleton, PrivacyNote } from '@/v2/SectionState';
import { PersonRow } from '@/v2/PersonRow';
import { SchoolBadge } from '@/v2/SchoolBadge';
import { PlainReasonChips } from '@/v2/ReasonChips';
import { IncomingRequestCard } from '@/v2/IncomingRequestCard';
import { SharedProfileMini, DEFAULT_SHARED, directRoomWith } from '@/v2/RequestParts';
import { Row } from '@/v2/Forms';

const asReasons = (rs: string[]): Reason[] => rs.map((text) => ({ text, weight: 1, kind: 'interest' as const }));

/** 사람 찾아보기 › 한 건 (웹 RequestDetailPage) — 내가 찾는 것(찾은 사람 · 손 든 사람) 또는 나에게 온 것 */
export default function RequestDetailScreen() {
  const { id, referral } = useLocalSearchParams<{ id: string; referral?: string }>();
  const v = useViewer();
  const req = useAppStore((s) => s.networkRequests).find((r) => r.id === id);
  if (!req) return <Screen title={t('사람 찾아보기')}><View style={tw`pt-6`}><SectionEmpty emoji="🍃" title={t('찾을 수 없는 요청이에요')} description={t('이미 마감됐거나 지워졌을 수 있어요.')} action={<Button size="sm" variant="outline" onPress={() => nav('/people/requests')}>{t('받은 요청으로')}</Button>} /></View></Screen>;
  return req.authorId === v.me.id ? <RequesterView req={req} /> : <ReceiverView req={req} referral={referral} />;
}

// ─── 내가 찾는 것 ─────────────────────────────────────────────────────────────
function RequesterView({ req }: { req: NetworkRequest }) {
  const v = useViewer();
  const me = v.me;
  const snap = useSnapshot();
  const run = useAppStore((s) => s.run);
  const rooms = useAppStore((s) => s.chatRooms);
  const [busy, setBusy] = useState<string | null>(null);
  const secFound = useSectionState(`req-found-${req.id}`);
  const secRaised = useSectionState(`req-raised-${req.id}`, 420);
  const matches = useMemo(() => matchesForRequest(snap, req, 7), [snap, req]);
  const delivered = useMemo(() => audienceForRequest(snap, req).length, [snap, req]);
  const ctx = requestContextLine(req);
  const reachLabels = lang === 'en' ? REACH_LABELS_EN : REACH_LABELS_KO;
  const raised = req.responses.filter((r) => r.status !== 'declined');
  const asking = req.referrals.filter((r) => r.status === 'pending').length;

  const act = async <T extends Patch | { patch: Patch }>(key: string, fn: () => Promise<T>, msg?: string): Promise<T | undefined> => { setBusy(key); try { return await run(fn, msg); } catch { return undefined; } finally { setBusy(null); } };
  const close = () => act('close', () => api.requests.close(req.id), t('그만 찾기로 했어요.'));
  const decide = async (res: RequestResponse, accept: boolean) => {
    const r = await act(`${accept ? 'y' : 'n'}-${res.id}`, () => api.requests.decide(req.id, res.id, accept), accept ? t('대화가 열렸어요') : undefined);
    if (accept && r && 'roomId' in r && r.roomId) nav(`/chats/${r.roomId}`);
  };

  return (
    <Screen title={t('사람 찾아보기')}>
      <View style={tw`mt-1 rounded-[24px] bg-primary-soft border border-line p-4`}>
        <View style={tw`flex-row items-center`}>
          {req.status === 'open' ? <Tag tone="primary">{t('찾는 중')}</Tag> : <Tag>{t('그만 찾음')}</Tag>}
          <Text numberOfLines={1} style={tw`ml-2 flex-1 text-[11px] text-ink-3`}>{reachLabels[req.reach]}</Text>
          {req.status === 'open' ? <Pressable onPress={close} disabled={busy === 'close'} style={tw`flex-row items-center`}><XCircle size={13} color={C.ink3} /><Text style={tw`ml-1 text-[12px] font-semibold text-ink-3`}>{t('그만 찾기')}</Text></Pressable> : null}
        </View>
        <Text style={tw`mt-2 text-[16px] font-bold text-ink`}>{req.text}</Text>
        {ctx ? <Text style={tw`mt-1 text-[12px] text-ink-2`}>{ctx}</Text> : null}
      </View>

      <Text style={tw`mt-6 mb-2 text-[18px] font-bold text-primary`}>{t('AroundU가 찾은 사람')} <Text style={tw`text-[15px] text-ink-3`}>{matches.length}</Text></Text>
      <Section loading={secFound.loading} error={secFound.error} onRetry={secFound.retry} skeleton={<SectionSkeleton count={2} />}
        empty={matches.length === 0 && <SectionEmpty emoji="🔎" title={t('가까운 네트워크에서 바로 떠오르는 사람이 없어요')} action={<Button size="sm" variant="outline" onPress={() => nav('/people/find')}>{t('사람 찾아보기')}</Button>} />}>
        {matches.map((m) => <View key={m.user.id} style={tw`mb-2`}><PersonRow user={m.user} reasons={asReasons(m.reasons)} compact actions /></View>)}
      </Section>

      <Text style={tw`mt-6 mb-1 text-[18px] font-bold text-primary`}>{t('손 든 사람')} <Text style={tw`text-[15px] text-ink-3`}>{raised.length}</Text></Text>
      <View style={tw`mb-2`}><PrivacyNote text={t('손 든 사람이 고른 정보만 보여요 · 연락처는 공개되지 않아요')} /></View>
      <Section loading={secRaised.loading} error={secRaised.error} onRetry={secRaised.retry} skeleton={<SectionSkeleton count={1} />}
        empty={raised.length === 0 && <SectionEmpty emoji="✋" title={t('아직 손 든 사람이 없어요. 데모에서는 잠시 후 관련 있는 사람이 손을 들어요.')} />}>
        {raised.map((res) => <ResponseCard key={res.id} res={res} busy={busy} onDecide={decide} roomId={res.status === 'accepted' ? directRoomWith(rooms, me.id, res.userId)?.id : undefined} />)}
      </Section>
      <Text style={tw`mt-3 text-[11px] text-ink-3`}>{t('관련 있는')} {delivered}{t('명에게 조용히 전달됐어요')}{asking ? ` · ${lang === 'en' ? `${asking} more being asked via someone they know` : `아는 사람 통해 물어보는 중 ${asking}건`}` : ''}. {t('본인이 관심 있어요 하면 여기 나타나요.')}</Text>
    </Screen>
  );
}

/**
 * 손 든 사람 한 명 — 해당되는 부분 · 한 줄 → 촌수 · 공통 연결 · 누가 떠올렸나 → 본인이 고른 정보만.
 * 대화가 열리기 전에는 프로필로 들어가지 않는다.
 */
function ResponseCard({ res, busy, onDecide, roomId }: { res: RequestResponse; busy: string | null; onDecide: (r: RequestResponse, accept: boolean) => void; roomId?: string }) {
  const v = useViewer();
  const snap = useSnapshot();
  const u = v.userById(res.userId);
  if (!u) return null;
  const via = res.viaId ? v.userById(res.viaId) : undefined;
  const mutual = mutualFriends(snap, v.me.id, u.id).length;
  const degree = degreeOf(snap, v.me.id, u.id, 3);
  const connected = res.status === 'accepted';
  const shared = res.shared ?? DEFAULT_SHARED;
  return (
    <View style={[tw`mb-2 rounded-[24px] border bg-white p-3.5`, { borderColor: connected ? C.mint : C.line }]}>
      <View style={tw`flex-row items-center`}><Text style={tw`flex-1 text-[11px] font-bold text-primary`}>{t('손 들었어요')}</Text>{connected ? <Tag tone="mint">{t('연결됨')}</Tag> : null}</View>
      {res.matched && res.matched.length > 0 ? <View style={tw`mt-1.5`}><Text style={tw`text-[11px] text-ink-3 mb-1`}>{t('해당되는 부분')}</Text><PlainReasonChips reasons={res.matched} max={6} /></View> : null}
      {res.note ? <Text style={tw`mt-2 rounded-2xl bg-surface-2 px-3 py-2 text-[13px] text-ink`}>“{res.note}”</Text> : null}
      <View style={tw`mt-2 flex-row items-center flex-wrap`}>
        <Text style={tw`text-[11px] text-ink-3`}>{degreeLabel(degree, lang)} · </Text>
        <Users size={10} color={C.ink3} /><Text style={tw`ml-0.5 text-[11px] text-ink-3`}>{t('공통 연결')} {mutual}{t('명')}</Text>
        {via ? <Text style={tw`text-[11px] text-ink-3`}> · {via.nickname}{t('님이 떠올렸어요')}</Text> : null}
      </View>
      <Pressable disabled={!connected} onPress={() => nav(`/users/${u.id}`)} style={tw`mt-2`}><SharedProfileMini user={u} shared={shared} /></Pressable>
      <Row style={tw`mt-3`}>
        {connected ? (
          roomId ? <Button size="sm" full icon={<MessageCircle size={14} color={C.onPrimary} />} onPress={() => nav(`/chats/${roomId}`)}>{t('대화 열기')}</Button> : null
        ) : (
          <>
            <Button size="sm" full icon={<MessageCircle size={14} color={C.onPrimary} />} loading={busy === `y-${res.id}`} onPress={() => onDecide(res, true)}>{t('대화 시작')}</Button>
            <View style={tw`w-2`} />
            <Button size="sm" variant="outline" loading={busy === `n-${res.id}`} onPress={() => onDecide(res, false)}>{t('괜찮아요')}</Button>
          </>
        )}
      </Row>
    </View>
  );
}

// ─── 나에게 온 것 ─────────────────────────────────────────────────────────────
function ReceiverView({ req, referral }: { req: NetworkRequest; referral?: string }) {
  const v = useViewer();
  const me = v.me;
  const snap = useSnapshot();
  const sec = useSectionState(`req-in-${req.id}`);
  const author = v.userById(req.authorId);
  const item = useMemo<IncomingRequest | null>(() => {
    if (!author) return null;
    const degree = degreeOf(snap, me.id, author.id, 3);
    return { req, author, degree, reasons: relevanceToRequest(req, me).reasons, myResponse: req.responses.find((r) => r.userId === me.id), myReferral: req.referrals.find((r) => r.candidateId === me.id && r.status !== 'declined') };
  }, [req, author, snap, me]);
  if (!author || !item) return <Screen title={t('사람 찾아보기')}><View style={tw`pt-6`}><SectionEmpty emoji="🍃" title={t('찾을 수 없는 요청이에요')} /></View></Screen>;
  const path = item.degree && item.degree >= 2 ? pathBetween(snap, me.id, author.id, 3).map((pid) => v.userById(pid)).filter((u): u is User => !!u && canShowInPath(u)) : [];
  const highlight = !!referral && item.myReferral?.id === referral;
  const dismissed = req.dismissedIds.includes(me.id) || req.status !== 'open';

  return (
    <Screen title={t('사람 찾아보기')}>
      <View style={tw`pt-1`}>
        <Section loading={sec.loading} error={sec.error} onRetry={sec.retry} skeleton={<SectionSkeleton count={1} />}
          empty={dismissed && !item.myResponse && <SectionEmpty emoji="🍃" title={req.status !== 'open' ? t('이제 찾지 않는대요.') : t('넘긴 요청이에요.')} action={<Button size="sm" variant="outline" onPress={() => nav('/people/requests')}>{t('받은 요청으로')}</Button>} />}>
          <IncomingRequestCard item={item} highlightReferral={highlight} />
        </Section>

        <View style={tw`mt-3 rounded-[24px] border border-line bg-white p-3.5`}>
          <Text style={tw`text-[11px] font-bold text-ink-3`}>{t('찾는 사람')}</Text>
          <Pressable onPress={() => nav(`/users/${author.id}`)} style={tw`mt-2 flex-row items-center`}>
            <Avatar emoji={author.avatar.emoji} hue={author.avatar.hue} url={author.avatar.url} size={44} />
            <View style={tw`flex-1 min-w-0 ml-3`}>
              <Text numberOfLines={1} style={tw`text-[15px] font-bold text-ink`}>{author.nickname}</Text>
              <SchoolBadge user={author} withYear size="sm" />
              <Text numberOfLines={1} style={tw`text-[12px] text-ink-3`}>{contextLine(author, lang) || personLine(author, lang)}</Text>
            </View>
          </Pressable>
          {path.length > 0 ? (
            <View style={tw`mt-3 flex-row items-center flex-wrap`}>
              <Text style={tw`text-[12px] font-semibold text-ink-2`}>{t('나')}</Text>
              {path.map((p) => (
                <View key={p.id} style={tw`flex-row items-center`}>
                  <ArrowRight size={12} color={C.ink3} style={tw`mx-1`} />
                  <Pressable onPress={() => nav(`/users/${p.id}`)} style={tw`h-6 pl-0.5 pr-2 rounded-full bg-surface-2 flex-row items-center`}><Avatar emoji={p.avatar.emoji} hue={p.avatar.hue} url={p.avatar.url} size={18} /><Text style={tw`ml-1 text-[12px] text-ink-2`}>{p.nickname}</Text></Pressable>
                </View>
              ))}
              <ArrowRight size={12} color={C.ink3} style={tw`mx-1`} /><Text style={tw`text-[12px] font-semibold text-ink-2`}>{author.nickname}</Text>
              <Text style={tw`text-[12px] text-ink-3`}> · {degreeLabel(item.degree, lang)}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Screen>
  );
}
