import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Search, ArrowRight, ChevronDown, Send, Lock, X, Save } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { getPlatform } from '@core/platform';
import { matchesForRequest, audienceForRequest, degreeLabel, requestContextLine, REACH_LABELS_KO, REACH_LABELS_EN } from '@core/lib/requests';
import { parseQuery, type QueryChip } from '@core/lib/nlsearch';
import { containsContact } from '@core/lib/privacy';
import { cityOf } from '@core/lib/network';
import { localeContext } from '@core/lib/locale-context';
import { isPlus, FREE_OPEN_REQUESTS, PLUS_OPEN_REQUESTS } from '@core/lib/monetization';
import type { Reason } from '@core/lib/recommend';
import type { Interest, RequestReach } from '@core/types';
import { tw } from '@/tw';
import { nav, replace } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Button, Segmented, C } from '@/ui';
import { useSnapshot } from '@/v2/useSnapshot';
import { useSectionState } from '@/v2/useSectionState';
import { Section, SectionEmpty, SectionSkeleton } from '@/v2/SectionState';
import { MaskedPersonRow } from '@/v2/Network';
import { RequestPreviewCard, CheckPill } from '@/v2/RequestParts';
import { Row, Wrap, WChip } from '@/v2/Forms';

const merge = (...lists: (string | undefined)[][]) => [...new Set(lists.flat().filter((x): x is string => !!x))];
/** 문자열 이유 → Reason (도시 이유는 공개 범위에 따라 가려질 수 있게 kind 를 붙인다) */
const asReasons = (rs: string[]): Reason[] => rs.map((text) => ({ text, weight: 1, kind: text.startsWith(t('같은 지역')) ? 'city' as const : 'interest' as const }));
const chipKey = (c: QueryChip) => `${c.kind}:${c.value}`;

const DRAFT_KEY = 'aroundu.ask.draft';
interface Draft { text: string; city?: string; field?: string; reach: RequestReach; removed: string[]; find: boolean; ask: boolean }
function readDraft(): Draft | null {
  try { const j = JSON.parse(getPlatform().getItem(DRAFT_KEY) ?? 'null') as Draft | null; return j && typeof j.text === 'string' && j.text.trim() ? j : null; } catch { return null; }
}
const writeDraft = (d: Draft) => { try { getPlatform().setItem(DRAFT_KEY, JSON.stringify(d)); return true; } catch { return false; } };
const clearDraft = () => { try { getPlatform().removeItem(DRAFT_KEY); } catch { /* */ } };

/**
 * 사람 찾아보기 (웹 AskNetworkPage) — 한 줄 입력 → 먼저 가까운 네트워크에서 조용히 찾아 보여주고,
 * 그 아래에서 "건너건너 물어볼까요?" (아는 사람들의 네트워크에 조용히 전달, 해당되는 사람만 답한다).
 * 전달 방식 두 가지(찾아보기 / 물어보기)는 따로 끌 수 있고, 찾아보기만 켜면 요청은 만들지 않는다.
 */
export default function AskNetworkScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const v = useViewer();
  const me = v.me;
  const snap = useSnapshot();
  const applyPatch = useAppStore((s) => s.applyPatch);
  const showToast = useAppStore((s) => s.showToast);
  const schools = useAppStore((s) => s.schools);
  const ctx = localeContext();
  const initial = params.q ?? '';
  const [restored] = useState<Draft | null>(() => { const d = readDraft(); return d && (!initial.trim() || initial.trim() === d.text.trim()) ? d : null; });
  const [draft, setDraft] = useState(restored?.text ?? initial);
  const q = (initial || restored?.text || '').trim();
  const [more, setMore] = useState(!!restored && (!!restored.city || !!restored.field || restored.reach !== 2));
  const [city, setCity] = useState<string | undefined>(restored?.city);
  const [field, setField] = useState<string | undefined>(restored?.field);
  const [reach, setReach] = useState<RequestReach>(restored?.reach ?? 2);
  const [removed, setRemoved] = useState<string[]>(restored?.removed ?? []);
  const [modeFind, setModeFind] = useState(restored?.find ?? true);
  const [modeAsk, setModeAsk] = useState(restored?.ask ?? true);
  const [busy, setBusy] = useState(false);
  const [emptyErr, setEmptyErr] = useState(false);
  const [capErr, setCapErr] = useState(false);
  const sec = useSectionState(`ask:${q}`);
  const toasted = useRef(false);

  useEffect(() => {
    if (!restored || toasted.current) return;
    toasted.current = true;
    showToast(t('임시 저장한 내용을 불러왔어요'));
    if (!initial.trim()) router.setParams({ q: restored.text } as never);
  }, [restored, initial, showToast]);

  const parsed = useMemo(() => parseQuery(draft, schools, lang), [draft, schools]);
  const chips = parsed.chips.filter((c) => !removed.includes(chipKey(c)));
  const cityEff = city ?? chips.find((c) => c.kind === 'city')?.value;
  const fieldEff = field ?? chips.find((c) => c.kind === 'industry' || c.kind === 'role')?.value;
  const interestKey = chips.filter((c) => c.kind === 'interest').map((c) => c.value).join(',');

  const temp = useMemo(() => ({ authorId: me.id, text: q, city: cityEff, field: fieldEff, interests: interestKey ? (interestKey.split(',') as Interest[]) : [], reach }), [me.id, q, cityEff, fieldEff, interestKey, reach]);
  const matches = useMemo(() => (q && modeFind ? matchesForRequest(snap, temp, 7) : []), [snap, temp, q, modeFind]);
  const delivered = useMemo(() => (q ? audienceForRequest(snap, temp).length : 0), [snap, temp, q]);
  const cities = merge([cityOf(me)], ctx.cities).slice(0, 8);
  const fields = merge([me.career?.industry], ctx.industries).slice(0, 8);
  const reachLabels = lang === 'en' ? REACH_LABELS_EN : REACH_LABELS_KO;
  const cap = isPlus(me) ? PLUS_OPEN_REQUESTS : FREE_OPEN_REQUESTS;
  const openCount = snap.networkRequests.filter((r) => r.authorId === me.id && r.status === 'open').length;
  const hasContact = containsContact(draft);
  const text = draft.trim() || q;

  const dropChips = (kinds: QueryChip['kind'][]) => setRemoved((r) => [...new Set([...r, ...parsed.chips.filter((c) => kinds.includes(c.kind)).map(chipKey)])]);
  const pickCity = (c: string) => { if (cityEff === c) { setCity(''); dropChips(['city']); } else setCity(c); };
  const pickField = (f: string) => { if (fieldEff === f) { setField(''); dropChips(['industry', 'role']); } else setField(f); };

  const submit = () => {
    const s = draft.trim();
    if (!s) { setEmptyErr(true); return; }
    setEmptyErr(false);
    router.setParams({ q: s } as never);
  };
  const saveDraft = () => {
    if (!draft.trim()) { setEmptyErr(true); return; }
    if (writeDraft({ text: draft.trim(), city, field, reach, removed, find: modeFind, ask: modeAsk })) showToast(t('임시 저장했어요. 다음에 열면 이어서 쓸 수 있어요.'), 'success');
    else showToast(t('임시 저장하지 못했어요.'), 'error');
  };
  const ask = async () => {
    if (!text) { setEmptyErr(true); return; }
    if (hasContact) return;
    if (openCount >= cap) { setCapErr(true); return; }
    setBusy(true); setCapErr(false);
    try {
      const r = await api.requests.create(me.id, { text, city: cityEff, field: fieldEff, interests: temp.interests, reach });
      applyPatch(r.patch);
      clearDraft();
      showToast(t('조용히 물어봤어요. 해당되는 사람이 손 들면 알려드려요.'), 'success');
      replace(`/people/requests/${r.request.id}`);
    } catch (e) {
      const msg = (e as Error)?.message ?? '';
      setBusy(false);
      if (msg.startsWith(t('동시에 찾을 수 있는 건 '))) setCapErr(true);
      else if (containsContact(text) || msg === t('연락처(전화번호·이메일·메신저 ID)는 적을 수 없어요. 연결되면 대화에서 주고받아요.')) { /* 입력 아래 안내가 이미 보인다 */ }
      else showToast(t('보내지 못했어요. 잠시 후 다시 시도해주세요.'), 'error');
    }
  };

  const few = matches.length < 5 || !modeFind;
  const sub = few ? { color: C.glassSoft } : undefined;

  return (
    <Screen title={t('사람 찾아보기')}>
      <View style={tw`pt-2`}>
        <View style={[tw`h-12 rounded-full border bg-white flex-row items-center pl-3.5 pr-1.5`, { borderColor: hasContact || emptyErr ? C.danger : C.inputLine }]}>
          <Search size={17} color={C.ink3} />
          <TextInput style={tw`flex-1 mx-2 text-[14px] text-ink`} placeholderTextColor={C.ink3} autoFocus={!q} placeholder={t('혹시 찾는 사람이 있나요? 예: 일본 식품 유통 아는 사람')} value={draft} onChangeText={(s) => { setDraft(s); if (s.trim()) setEmptyErr(false); }} onSubmitEditing={submit} returnKeyType="search" />
          <Pressable onPress={submit} accessibilityLabel={t('찾기')} style={tw`h-9 w-9 rounded-full bg-primary items-center justify-center`}><ArrowRight size={16} color={C.onPrimary} /></Pressable>
        </View>
        {emptyErr ? <Text accessibilityRole="alert" style={tw`mt-1.5 ml-3 text-[12px] text-danger`}>{t("예: '일본 식품 유통 아는 사람'처럼 한 줄이면 돼요")}</Text> : null}
        {hasContact ? <Text accessibilityRole="alert" style={tw`mt-1.5 ml-3 text-[12px] text-danger`}>{t('연락처(전화번호·이메일·메신저 ID)는 적을 수 없어요. 연결되면 대화에서 주고받아요.')}</Text> : null}

        {!hasContact && (chips.length > 0 || removed.length > 0) ? (
          <View style={tw`mt-2.5 flex-row flex-wrap items-center`}>
            <Text style={tw`mr-1.5 mb-1.5 text-[11px] font-bold text-ink-3`}>{t('읽어낸 조건')}</Text>
            {chips.map((c) => (
              <View key={chipKey(c)} style={tw`h-7 pl-2.5 pr-0.5 mr-1.5 mb-1.5 rounded-full bg-primary-soft flex-row items-center`}>
                <Text style={tw`text-[12px] font-bold text-primary`}>{c.label}</Text>
                <Pressable onPress={() => setRemoved((r) => [...r, chipKey(c)])} accessibilityLabel={`${c.label} ${t('빼기')}`} hitSlop={4} style={tw`h-6 w-6 items-center justify-center`}><X size={11} color={C.primary} /></Pressable>
              </View>
            ))}
            {removed.length > 0 ? <Pressable onPress={() => setRemoved([])} style={tw`h-7 px-1.5 mb-1.5 justify-center`}><Text style={tw`text-[11px] font-semibold text-ink-3 underline`}>{t('처음 조건으로')}</Text></Pressable> : null}
          </View>
        ) : null}
        {parsed.dropped.length > 0 ? <View style={tw`mt-1.5 ml-1 flex-row items-center`}><Lock size={10} color={C.ink3} /><Text style={tw`ml-1 text-[11px] text-ink-3`}>{t('성별·나이·종교 같은 민감한 조건은 쓰지 않아요')}</Text></View> : null}

        {/* 전달 방식 */}
        <View style={tw`mt-3 flex-row flex-wrap`}>
          <CheckPill on={modeFind} label={t('AroundU가 찾아보기')} onPress={() => setModeFind((x) => !x)} />
          <CheckPill on={modeAsk} label={t('건너건너 물어보기')} onPress={() => setModeAsk((x) => !x)} />
        </View>
      </View>

      {!q ? (
        <View style={tw`mt-6`}><SectionEmpty emoji="🔎" title={t('어떤 사람을 찾고 있나요?')} description={t('한 줄이면 돼요. 먼저 가까운 네트워크에서 찾아보고, 없으면 건너건너 물어볼 수 있어요.')} /></View>
      ) : !modeFind && !modeAsk ? (
        <View style={tw`mt-6`}><SectionEmpty emoji="🍃" title={t('둘 중 하나는 켜주세요')} description={t('AroundU가 찾아보거나, 건너건너 물어보거나 — 둘 다도 괜찮아요.')} /></View>
      ) : (
        <>
          {modeFind ? (
            <View style={tw`mt-5`}>
              <Section loading={sec.loading} error={sec.error} onRetry={sec.retry} skeleton={<SectionSkeleton count={2} />}>
                <Text style={tw`text-[18px] font-bold text-primary`}>{matches.length > 0 ? `${t('가까운 네트워크에서')} ${matches.length}${t('명을 찾았어요')}` : t('가까운 네트워크에서 바로 떠오르는 사람이 없어요')}</Text>
                {matches.length > 0 ? <Text style={tw`mt-0.5 mb-3 text-[12px] text-ink-3`}>{t('프로필과 연결을 바탕으로 골랐어요')}</Text> : null}
                {matches.map((m) => <MaskedPersonRow key={m.user.id} user={m.user} reasons={asReasons(m.reasons)} />)}
              </Section>
            </View>
          ) : null}

          {modeAsk ? (
            <View style={tw`mt-5 rounded-[24px] p-4 ${few ? 'bg-primary' : 'bg-white border border-line'}`}>
              <Text style={tw`text-[17px] font-bold ${few ? 'text-white' : 'text-primary'}`}>{t('건너건너 물어볼까요?')}</Text>
              <Text style={[tw`mt-1 text-[13px] ${few ? '' : 'text-ink-2'}`, sub]}>{t('아는 사람들의 네트워크에 조용히 물어봐요. 해당되는 사람만 답해요.')}</Text>

              <Pressable onPress={() => setMore((x) => !x)} style={tw`mt-3 h-8 self-start flex-row items-center`}>
                <Text style={tw`text-[12px] font-semibold ${few ? 'text-white' : 'text-primary'}`}>{t('더 알려주기')}</Text>
                <ChevronDown size={14} color={few ? C.onPrimary : C.primary} style={more ? { transform: [{ rotate: '180deg' }] } : undefined} />
              </Pressable>
              {more ? (
                <View style={tw`mt-2 rounded-2xl p-3 bg-white`}>
                  <Text style={tw`text-[11px] font-bold text-ink-3 mb-1.5`}>{t('도시')}</Text>
                  <Wrap>{cities.map((c) => <WChip key={c} active={cityEff === c} onPress={() => pickCity(c)}>{c}</WChip>)}</Wrap>
                  <Text style={tw`mt-2 text-[11px] font-bold text-ink-3 mb-1.5`}>{t('분야')}</Text>
                  <Wrap>{fields.map((f) => <WChip key={f} active={fieldEff === f} onPress={() => pickField(f)}>{f}</WChip>)}</Wrap>
                  <Text style={tw`mt-2 text-[11px] font-bold text-ink-3 mb-1.5`}>{t('어디까지')}</Text>
                  <Segmented<'1' | '2' | '3'> value={String(reach) as '1' | '2' | '3'} onChange={(x) => setReach(Number(x) as RequestReach)} options={[['1', t('1촌')], ['2', t('2촌')], ['3', t('3촌')]]} />
                  <Text style={tw`mt-1.5 text-[11px] text-ink-3`}>{reachLabels[reach]}</Text>
                </View>
              ) : null}

              <Text style={[tw`mt-4 mb-1.5 text-[11px] font-bold ${few ? '' : 'text-ink-3'}`, sub]}>{t('받는 사람에게 이렇게 보여요')}</Text>
              <RequestPreviewCard author={me} text={text} context={requestContextLine({ city: cityEff || undefined, field: fieldEff || undefined, interests: temp.interests })} degreeText={degreeLabel(2, lang)} />

              <Text style={tw`mt-4 text-[12px] font-semibold ${few ? 'text-white' : 'text-ink-2'}`}>{t('관련 있는')} {delivered}{t('명에게 조용히 전달돼요')}</Text>
              {capErr ? (
                <View accessibilityRole="alert" style={tw`mt-2 rounded-2xl px-3 py-2.5 ${few ? 'bg-white' : 'bg-danger-soft'}`}>
                  <Text style={tw`text-[12px] text-ink`}>{lang === 'en' ? `You can look for up to ${cap} at a time. Finish one, or get more with AroundU+.` : `동시에 찾을 수 있는 건 ${cap}개까지예요. 하나를 마치거나 AroundU+ 에서 늘릴 수 있어요.`}</Text>
                  <Row style={tw`mt-1.5`}>
                    <Pressable onPress={() => nav('/people/requests?tab=mine')}><Text style={tw`text-[12px] font-bold text-primary`}>{t('내가 찾는 것 보기')}</Text></Pressable>
                    {!isPlus(me) ? <Pressable onPress={() => nav('/plus')} style={tw`ml-3`}><Text style={tw`text-[12px] font-bold text-primary`}>{t('AroundU+ 보기')}</Text></Pressable> : null}
                  </Row>
                </View>
              ) : null}
              <Row style={tw`mt-2`}>
                <Button full size="lg" variant={few ? 'accent' : 'primary'} icon={<Send size={16} color={few ? C.primary : C.onPrimary} />} loading={busy} disabled={delivered === 0 || hasContact} onPress={ask}>{t('물어보기')}</Button>
                <View style={tw`w-2`} />
                <Button size="lg" variant={few ? 'secondary' : 'outline'} icon={<Save size={16} color={few ? C.primary : C.ink2} />} onPress={saveDraft}>{t('임시 저장')}</Button>
              </Row>
              <View style={tw`mt-2 flex-row items-start`}><Lock size={11} color={few ? C.glassSoft : C.ink3} style={tw`mt-0.5`} /><Text style={[tw`ml-1.5 flex-1 text-[11px] ${few ? '' : 'text-ink-3'}`, sub]}>{t('이름·학교만 함께 보여요. 연락처는 적지 마세요.')}</Text></View>
            </View>
          ) : (
            <View style={tw`mt-5 rounded-[24px] bg-surface-2 p-4`}>
              <Text style={tw`text-[13px] text-ink-2`}>{t('건너건너 물어보기가 꺼져 있어요. 요청은 만들지 않고 찾은 사람만 보여드려요.')}</Text>
              <Row style={tw`mt-2.5`}>
                <Button size="sm" variant="outline" icon={<Send size={14} color={C.ink2} />} onPress={() => setModeAsk(true)}>{t('건너건너 물어보기 켜기')}</Button>
                <View style={tw`w-2`} />
                <Button size="sm" variant="outline" icon={<Save size={14} color={C.ink2} />} onPress={saveDraft}>{t('임시 저장')}</Button>
              </Row>
            </View>
          )}
        </>
      )}
    </Screen>
  );
}
