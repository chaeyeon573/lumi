import { useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Hand, ArrowRight, Lock, Clock, Users, CheckCircle2 } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { degreeLabel, requestContextLine, relevanceToRequest } from '@core/lib/requests';
import { degreeOf, pathBetween } from '@core/lib/graph';
import { citiesOf, majorOf } from '@core/lib/network';
import { INTEREST_LABELS } from '@core/lib/labels';
import { containsContact, canShowInPath } from '@core/lib/privacy';
import type { NetworkRequest, ShareField, User } from '@core/types';
import { tw } from '@/tw';
import { nav, replace } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Avatar, Button, Textarea, C } from '@/ui';
import { useSnapshot } from '@/v2/useSnapshot';
import { useSectionState } from '@/v2/useSectionState';
import { Section, SectionEmpty, SectionSkeleton, PrivacyNote } from '@/v2/SectionState';
import { SchoolBadge } from '@/v2/SchoolBadge';
import { SharedProfileMini, SHARE_FIELDS, DEFAULT_SHARED, shareFieldLabel, isRequestExpired, CheckPill } from '@/v2/RequestParts';
import { Row } from '@/v2/Forms';

const lc = (s?: string) => (s ?? '').toLowerCase();

/** 요청에서 뽑은 "해당되는 부분" — 도시 · 분야 · 관심사 각각 · 본문 내용. hit = 내 프로필에 이미 있는 것 (기본 체크) */
function conditionsFor(req: NetworkRequest, me: User): { key: string; label: string; value: string; hit: boolean }[] {
  const out: { key: string; label: string; value: string; hit: boolean }[] = [];
  if (req.city) out.push({ key: 'city', label: `${t('도시')} · ${req.city}`, value: req.city, hit: citiesOf(me).some((c) => lc(c) === lc(req.city)) });
  if (req.field) {
    const f = lc(req.field);
    const hay = [me.career?.industry, me.career?.role, me.career?.company, majorOf(me)].map(lc).filter(Boolean);
    out.push({ key: 'field', label: `${t('분야')} · ${req.field}`, value: req.field, hit: hay.some((h) => h.includes(f) || f.includes(h)) });
  }
  req.interests.forEach((i) => out.push({ key: `i-${i}`, label: INTEREST_LABELS[i], value: INTEREST_LABELS[i], hit: me.interests.includes(i) }));
  out.push({ key: 'text', label: t('본문 내용'), value: t('본문 내용'), hit: relevanceToRequest({ text: req.text, interests: [] }, me).score > 0 });
  return out;
}

/** /people/requests/:id/respond — "저요" 응답 (웹 RespondPage). 해당되는 부분 · 한 줄 · 요청자에게 보여줄 정보(고른 것만) */
export default function RespondScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const v = useViewer();
  const req = useAppStore((s) => s.networkRequests).find((r) => r.id === id);
  const author = req ? v.userById(req.authorId) : undefined;
  if (!req || !author) return <Screen title={t('저요')}><View style={tw`pt-6`}><SectionEmpty emoji="🍃" title={t('찾을 수 없는 요청이에요')} description={t('이미 마감됐거나 지워졌을 수 있어요.')} action={<Button size="sm" variant="outline" onPress={() => replace('/people/requests')}>{t('받은 요청으로')}</Button>} /></View></Screen>;
  if (req.authorId === v.me.id) return <Screen title={t('저요')}><View style={tw`pt-6`}><SectionEmpty emoji="🔎" title={t('내가 올린 요청이에요')} action={<Button size="sm" onPress={() => replace(`/people/requests/${req.id}`)}>{t('요청 보기')}</Button>} /></View></Screen>;
  return <RespondForm key={req.id} req={req} author={author} />;
}

function RespondForm({ req, author }: { req: NetworkRequest; author: User }) {
  const v = useViewer();
  const me = v.me;
  const snap = useSnapshot();
  const applyPatch = useAppStore((s) => s.applyPatch);
  const showToast = useAppStore((s) => s.showToast);
  const sec = useSectionState(`respond-${req.id}`, 300);
  const conditions = useMemo(() => conditionsFor(req, me), [req, me]);
  const [checked, setChecked] = useState<Set<string>>(() => new Set(conditions.filter((c) => c.hit).map((c) => c.key)));
  const [note, setNote] = useState('');
  const [shared, setShared] = useState<ShareField[]>(DEFAULT_SHARED);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [err, setErr] = useState<'expired' | 'duplicate' | null>(null);
  const [done, setDone] = useState(false);

  const degree = degreeOf(snap, me.id, author.id, 3);
  const pathUsers = (degree && degree >= 2 ? pathBetween(snap, me.id, author.id, 3) : []).map((pid) => v.userById(pid)).filter((u): u is User => !!u);
  const shownPath = pathUsers.filter(canShowInPath);
  const hiddenInPath = pathUsers.length - shownPath.length;
  const ctx = requestContextLine(req);
  const expired = err === 'expired' || isRequestExpired(req) || req.status !== 'open';
  const already = !done && (err === 'duplicate' || req.responses.some((r) => r.userId === me.id));
  const noHit = conditions.every((c) => !c.hit);
  const noteHasContact = containsContact(note);

  const toggleCond = (k: string) => setChecked((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const toggleShare = (f: ShareField) => setShared((s) => (s.includes(f) ? s.filter((x) => x !== f) : SHARE_FIELDS.filter((x) => x === f || s.includes(x))));

  const send = async () => {
    if (noteHasContact) return;
    if (isRequestExpired(req) || req.status !== 'open') { setErr('expired'); return; }
    setSending(true); setErr(null); setFailed(false);
    try {
      const matched = conditions.filter((c) => checked.has(c.key)).map((c) => c.value);
      applyPatch(await api.requests.respond(req.id, me.id, note.trim() || undefined, matched, shared));
      setDone(true);
    } catch (e) {
      const msg = (e as Error)?.message ?? '';
      if (msg === t('마감된 요청이에요.')) setErr('expired');
      else if (msg === t('이미 손을 들었어요.')) setErr('duplicate');
      else { setFailed(true); showToast(t('보내지 못했어요. 연결을 확인하고 다시 보내주세요.'), 'error'); }
    } finally { setSending(false); }
  };

  const H = ({ title, sub }: { title: string; sub?: string }) => <View style={tw`mt-6 mb-2.5`}><Text style={tw`text-[15px] font-bold text-ink`}>{title}</Text>{sub ? <Text style={tw`mt-0.5 text-[12px] text-ink-3`}>{sub}</Text> : null}</View>;

  if (done) {
    return (
      <Screen title={t('저요')} footer={<Row><Button full size="lg" onPress={() => replace('/people/requests')}>{t('받은 요청으로')}</Button></Row>}>
        <View style={tw`pt-6 items-center`}>
          <View style={tw`h-16 w-16 rounded-full bg-accent-soft items-center justify-center`}><CheckCircle2 size={30} color={C.primary} /></View>
          <Text style={tw`mt-4 text-[20px] font-bold text-ink`}>{t('손을 들었어요')}</Text>
          <Text style={tw`mt-1 text-[13px] text-ink-2 text-center`}>{t('상대가 대화를 시작하면 알려드려요.')}</Text>
        </View>
        <Text style={tw`mt-6 mb-1.5 text-[11px] font-bold text-ink-3`}>{t('요청자에게 이렇게 보여요')}</Text>
        <SharedProfileMini user={me} shared={shared} />
        <View style={tw`mt-2`}><PrivacyNote text={t('답하지 않아도 괜찮아요 — 상대가 대화를 시작하지 않으면 아무 일도 없어요.')} /></View>
      </Screen>
    );
  }

  const footer = !expired && !already ? (
    <View>
      <Row><Button full size="lg" icon={<Hand size={16} color={C.onPrimary} />} loading={sending} disabled={noteHasContact || sec.loading} onPress={send}>{failed ? t('다시 보내기') : t('보내기')}</Button></Row>
      <Text style={tw`mt-1.5 text-center text-[11px] text-ink-3`}>{t('답하지 않아도 불이익은 없어요 · 읽음 표시도 없어요')}</Text>
    </View>
  ) : undefined;

  return (
    <Screen title={t('저요')} footer={footer}>
      <View style={tw`pt-1`}>
        {/* 요청 요약 — 왜 → 얼마나 가까운지 → 경로 */}
        <Section loading={sec.loading} error={sec.error} onRetry={sec.retry} skeleton={<SectionSkeleton count={1} />}>
          <View style={tw`rounded-[20px] border border-line p-4 ${expired ? 'bg-surface-2' : 'bg-primary-soft'}`}>
            {expired
              ? <View style={tw`flex-row items-center`}><Clock size={12} color={C.ink3} /><Text style={tw`ml-1 text-[12px] font-bold text-ink-3`}>{t('마감된 요청이에요')}</Text></View>
              : <Text style={tw`text-[12px] font-bold text-primary`}>{t('혹시 여기에 해당되나요?')}</Text>}
            <Text style={tw`mt-1 text-[16px] font-bold ${expired ? 'text-ink-3' : 'text-ink'}`}>{req.text}</Text>
            {ctx ? <Text style={tw`mt-1 text-[12px] text-ink-2`}>{ctx}</Text> : null}
            <View style={tw`mt-3 flex-row items-center`}>
              <Avatar emoji={author.avatar.emoji} hue={author.avatar.hue} url={author.avatar.url} size={28} />
              <View style={tw`flex-1 min-w-0 ml-2`}>
                <View style={tw`flex-row items-center`}><Text numberOfLines={1} style={tw`text-[13px] font-bold text-ink shrink-0 max-w-[55%] mr-1.5`}>{author.nickname}{t('님')}</Text><SchoolBadge user={author} size="sm" /></View>
                <Text style={tw`text-[11px] text-ink-3`}>{degreeLabel(degree, lang)}</Text>
              </View>
            </View>
            {shownPath.length > 0 || hiddenInPath > 0 ? (
              <View style={tw`mt-2 flex-row items-center flex-wrap`}>
                <Text style={tw`text-[11px] font-semibold text-ink-2`}>{t('나')}</Text>
                {shownPath.map((p) => <View key={p.id} style={tw`flex-row items-center`}><ArrowRight size={11} color={C.ink3} style={tw`mx-1`} /><View style={[tw`h-6 pl-0.5 pr-2 rounded-full flex-row items-center`, { backgroundColor: C.glass }]}><Avatar emoji={p.avatar.emoji} hue={p.avatar.hue} url={p.avatar.url} size={18} /><Text style={tw`ml-1 text-[11px] text-ink-2`}>{p.nickname}</Text></View></View>)}
                {hiddenInPath > 0 ? <View style={tw`flex-row items-center`}><ArrowRight size={11} color={C.ink3} style={tw`mx-1`} /><View style={[tw`h-6 px-2 rounded-full justify-center`, { backgroundColor: C.glass }]}><Text style={tw`text-[11px] text-ink-3`}>{t('비공개 연결')} {hiddenInPath}</Text></View></View> : null}
                <ArrowRight size={11} color={C.ink3} style={tw`mx-1`} /><Text style={tw`text-[11px] font-semibold text-ink-2`}>{author.nickname}</Text>
              </View>
            ) : null}
          </View>
        </Section>

        {expired ? (
          <View style={tw`mt-5`}><SectionEmpty emoji="🍂" title={t('마감된 요청이에요')} description={t('기간이 지났거나 요청자가 그만 찾기로 했어요.')} action={<Button size="sm" variant="outline" onPress={() => replace('/people/requests')}>{t('받은 요청으로')}</Button>} /></View>
        ) : already ? (
          <View style={tw`mt-5`}><SectionEmpty emoji="✋" title={t('이미 손을 들었어요')} description={t('상대가 대화를 시작하면 알려드려요.')} action={<Button size="sm" variant="outline" onPress={() => replace('/people/requests')}>{t('받은 요청으로')}</Button>} /></View>
        ) : !sec.loading && !sec.error ? (
          <>
            <H title={t('해당되는 부분')} sub={t('맞는 것만 골라주세요. 요청자에게 그대로 보여요.')} />
            <View style={tw`flex-row flex-wrap`}>{conditions.map((c) => <CheckPill key={c.key} on={checked.has(c.key)} label={c.label} onPress={() => toggleCond(c.key)} />)}</View>
            {noHit ? (
              <View style={tw`mt-2 rounded-2xl bg-surface-2 px-3.5 py-3`}>
                <Text style={tw`text-[12px] text-ink-2`}>{t("딱 맞지 않아도 괜찮아요 — 아는 사람이 있다면 '아는 사람 있어요'로 연결해줄 수도 있어요")}</Text>
                <Pressable onPress={() => nav(`/people/requests/${req.id}`)} style={tw`mt-1.5 flex-row items-center`}><Users size={13} color={C.primary} /><Text style={tw`mx-1 text-[12px] font-bold text-primary`}>{t('아는 사람 있어요로 가기')}</Text><ArrowRight size={12} color={C.primary} /></Pressable>
              </View>
            ) : null}

            <H title={`${t('한 줄')} ${t('(선택)')}`} />
            <Textarea style={[tw`min-h-[72px]`, noteHasContact ? { borderColor: C.danger } : null]} placeholder={t('한 줄이면 충분해요 (예: 일본 식품 유통 5년)')} value={note} onChangeText={setNote} maxLength={120} />
            <View style={tw`mt-1 flex-row items-start`}>
              {noteHasContact ? <Text accessibilityRole="alert" style={tw`flex-1 text-[12px] text-danger`}>{t('연락처(전화번호·이메일·메신저 ID)는 적을 수 없어요. 연결되면 대화에서 주고받아요.')}</Text> : <View style={tw`flex-1`} />}
              <Text style={tw`text-[11px] text-ink-3`}>{note.length}/120</Text>
            </View>

            <H title={t('요청자에게 보여줄 정보')} sub={t('이름과 사진은 함께 보여요. 나머지는 고른 것만.')} />
            <View style={tw`flex-row flex-wrap`}>{SHARE_FIELDS.map((f) => <CheckPill key={f} soft on={shared.includes(f)} label={shareFieldLabel(f)} onPress={() => toggleShare(f)} />)}</View>
            <View style={tw`mt-1 h-9 px-3 self-start rounded-full bg-surface-2 flex-row items-center`}><Lock size={12} color={C.ink3} /><Text style={tw`ml-1.5 text-[12px] text-ink-3`}>{t('연락처 · 정확한 위치 — 항상 비공개')}</Text></View>
            <Text style={tw`mt-3 mb-1.5 text-[11px] font-bold text-ink-3`}>{t('요청자에게 이렇게 보여요')}</Text>
            <SharedProfileMini user={me} shared={shared} preview lockedRow={false} />
          </>
        ) : null}
      </View>
    </Screen>
  );
}
