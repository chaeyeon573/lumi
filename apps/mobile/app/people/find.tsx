import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Search, ArrowRight, X, Clock, Star, Lock, Sparkles, SlidersHorizontal, Send, ShieldCheck } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { getPlatform } from '@core/platform';
import { parseQuery, removeChip, relaxations, FREE_NL_SEARCHES_PER_DAY, EXAMPLE_QUERIES, type QueryChip } from '@core/lib/nlsearch';
import { searchPeople, isAdvancedSearch } from '@core/lib/people';
import { matchScore, shareableReasons } from '@core/lib/recommend';
import { profileView } from '@core/lib/privacy';
import { majorOf } from '@core/lib/network';
import { isPlus } from '@core/lib/monetization';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Button, C } from '@/ui';
import { PaywallSheet, type PaywallReason } from '@/components/PaywallSheet';
import { useSnapshot } from '@/v2/useSnapshot';
import { useSectionState } from '@/v2/useSectionState';
import { Section, SectionEmpty, SectionSkeleton, PrivacyNote } from '@/v2/SectionState';
import { MaskedPersonRow } from '@/v2/Network';
import { Row } from '@/v2/Forms';

// ─── 하루 무료 한도 (모바일: platform 저장소) ───────────────────────────────
const DAILY_KEY = 'aroundu.nlsearch.daily';
const today = () => new Date().toISOString().slice(0, 10);
function usedToday(): number {
  try { const j = JSON.parse(getPlatform().getItem(DAILY_KEY) ?? 'null') as { date: string; n: number } | null; return j && j.date === today() ? j.n : 0; } catch { return 0; }
}
function bumpToday() { try { getPlatform().setItem(DAILY_KEY, JSON.stringify({ date: today(), n: usedToday() + 1 })); } catch { /* 저장소를 못 쓰면 세지 않는다 */ } }
/** 같은 문장은 한 번만 센다 (뒤로 가기·재방문) */
const counted = new Set<string>();
const chipKey = (c: QueryChip) => `${c.kind}:${c.value}`;
/** 의미 있는 조건인가 — "??" 같은 기호뿐인 키워드는 조건으로 치지 않는다 */
const meaningful = (c: QueryChip) => c.kind !== 'keyword' || /[\p{L}\p{N}]{2,}/u.test(c.label);

/**
 * /people/find?q= — 자연어 사람 찾기 (웹 NaturalSearchPage). 한 줄 → 조건 칩(✕로 빼기) → 가까운 네트워크 결과(공개 범위 적용).
 * 민감한 조건(성별·나이·종교 등)은 쓰지 않는다. 결과가 없으면 조건을 하나씩 빼 보거나 건너건너 물어본다. 무료 하루 5번.
 */
export default function NaturalSearchScreen() {
  const params = useLocalSearchParams<{ q?: string }>();
  const q = (params.q ?? '').trim();
  const v = useViewer();
  const me = v.me;
  const plus = isPlus(me);
  const run = useAppStore((s) => s.run);
  const schools = useAppStore((s) => s.schools);
  const snap = useSnapshot();
  const [draft, setDraft] = useState(q);
  const [removed, setRemoved] = useState<string[]>([]);
  const [limited, setLimited] = useState(false);
  const [used, setUsed] = useState(usedToday);
  const [paywall, setPaywall] = useState<PaywallReason | null>(null);
  const [saving, setSaving] = useState(false);
  const sec = useSectionState(`nl:${q}`, 300);

  // 새 문장이 들어오면: 한도 확인 → 세기 → 최근 검색에 넣기
  useEffect(() => {
    setDraft(q); setRemoved([]);
    if (!q || counted.has(q)) { setLimited(false); return; }
    if (!parseQuery(q, schools, lang, { myMajor: majorOf(me) }).chips.some(meaningful)) { setLimited(false); return; }
    if (!plus && usedToday() >= FREE_NL_SEARCHES_PER_DAY) { setLimited(true); return; }
    counted.add(q); setLimited(false);
    if (!plus) { bumpToday(); setUsed(usedToday()); }
    run(() => api.users.pushRecentSearch(me.id, q)).catch(() => { /* 최근 검색은 실패해도 조용히 */ });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const parsed = useMemo(() => (q ? parseQuery(q, schools, lang, { myMajor: majorOf(me) }) : null), [q, schools, me]);
  const chips = useMemo(() => (parsed ? parsed.chips.filter((c) => !removed.includes(chipKey(c))) : []), [parsed, removed]);
  const criteria = useMemo(() => (parsed ? parsed.chips.filter((c) => removed.includes(chipKey(c))).reduce((acc, c) => removeChip(acc, c), parsed.criteria) : null), [parsed, removed]);
  // 가려진 항목으로는 찾히지 않게 — 도시·회사·졸업연도 조건은 그 항목을 볼 수 있는 사람에게만 적용
  const results = useMemo(() => (criteria && chips.length ? searchPeople(v.visibleUsers, me, criteria)
    .filter((u) => {
      const view = profileView(snap, me, u);
      if ((criteria.homeCities.length || criteria.activityCities.length) && !view.city) return false;
      if (criteria.companies.length && !view.company) return false;
      if ((criteria.gradYearFrom || criteria.gradYearTo) && !view.gradYear) return false;
      return true;
    })
    .map((u) => { const m = matchScore(me, u, v.snap, v.canSeeField(u, 'timetable')); return { u, score: m.score, reasons: shareableReasons(m.reasons) }; })
    .sort((a, b) => b.score - a.score) : []), [v, me, criteria, chips.length, snap]);
  const advancedLocked = !!criteria && isAdvancedSearch(criteria) && !plus;
  const shown = advancedLocked ? results.slice(0, 3) : results;
  const parseFailed = !!parsed && !parsed.chips.some(meaningful);
  const allRemoved = !!parsed && !parseFailed && chips.length === 0;
  const examples = EXAMPLE_QUERIES[lang === 'en' ? 'en' : 'ko'];
  const recent = me.recentSearches ?? [];

  const go = (text: string) => { const s = text.trim(); if (s) router.setParams({ q: s } as never); };
  const save = async () => {
    if (!plus || !criteria) { setPaywall('search'); return; }
    setSaving(true);
    try { await run(() => api.searches.save(me.id, q.slice(0, 40), criteria, false), t('검색을 저장했어요.')); } catch { /* toast */ } finally { setSaving(false); }
  };
  const askNetwork = () => nav(`/people/ask?q=${encodeURIComponent(q)}`);

  const exampleChips = (
    <View style={tw`flex-row flex-wrap`}>
      {examples.map((x) => <Pressable key={x} onPress={() => go(x)} style={tw`h-8 px-3 mr-1.5 mb-1.5 rounded-full bg-sky-soft border border-primary-soft justify-center`}><Text style={tw`text-[12px] font-semibold text-primary`}>{x}</Text></Pressable>)}
    </View>
  );
  const H = ({ icon, children }: { icon: ReactNode; children: ReactNode }) => <View style={tw`flex-row items-center mb-2`}>{icon}<Text style={tw`ml-1 text-[13px] font-bold text-ink-2`}>{children}</Text></View>;

  return (
    <Screen title={t('사람 찾기')}>
      <View style={tw`pt-2`}>
        <View style={tw`h-12 rounded-full bg-sky-soft border border-primary-soft flex-row items-center pl-3.5 pr-1.5`}>
          <Search size={17} color={C.ink3} />
          <TextInput style={tw`flex-1 mx-2 text-[14px] text-ink`} placeholderTextColor={C.ink3} autoFocus={!q} placeholder={t('혹시 찾는 사람이 있나요?')} value={draft} onChangeText={setDraft} onSubmitEditing={() => go(draft)} returnKeyType="search" />
          <Pressable onPress={() => go(draft)} disabled={!draft.trim()} accessibilityLabel={t('찾기')} style={tw`h-9 w-9 rounded-full bg-primary items-center justify-center ${draft.trim() ? '' : 'opacity-35'}`}><ArrowRight size={16} color={C.onPrimary} /></Pressable>
        </View>
        {!plus ? <Text style={tw`mt-1.5 ml-3 text-[11px] text-ink-3`}>{t('오늘 남은 자연어 찾기')} {Math.max(0, FREE_NL_SEARCHES_PER_DAY - used)}/{FREE_NL_SEARCHES_PER_DAY}</Text> : null}
      </View>

      {/* 아직 입력 전 — 예시 · 최근 검색 */}
      {!q && (
        <View style={tw`mt-5`}>
          <H icon={<Sparkles size={13} color={C.ink2} />}>{t('이렇게 찾아보세요')}</H>
          {exampleChips}
          <View style={tw`mt-4`}><H icon={<Clock size={13} color={C.ink2} />}>{t('최근 찾은 것')}</H></View>
          {recent.length === 0
            ? <Text style={tw`text-[12px] text-ink-3`}>{t('아직 없어요. 찾은 문장은 나만 볼 수 있게 여기 남아요.')}</Text>
            : recent.map((x, i) => (
              <Pressable key={x} onPress={() => go(x)} style={tw`h-11 flex-row items-center ${i < recent.length - 1 ? 'border-b border-line' : ''}`}>
                <Clock size={14} color={C.ink3} /><Text numberOfLines={1} style={tw`flex-1 ml-2.5 text-[14px] text-ink`}>{x}</Text><ArrowRight size={14} color={C.ink3} />
              </Pressable>
            ))}
          <View style={tw`mt-4`}><PrivacyNote text={t('공개 프로필만으로 찾아요. 성별·나이·종교 같은 민감한 조건은 쓰지 않아요.')} /></View>
        </View>
      )}

      {/* 하루 무료 한도 */}
      {q && limited ? (
        <View accessibilityRole="alert" style={[tw`mt-5 rounded-[20px] border border-line bg-surface-2 p-4`, { borderStyle: 'dashed' }]}>
          <Text style={tw`text-[15px] font-bold text-ink`}>{t('오늘 자연어 찾기를 다 썼어요 — 필터로 찾거나 내일 다시')}</Text>
          <Text style={tw`mt-1 text-[12px] text-ink-3`}>{t('무료는 하루')} {FREE_NL_SEARCHES_PER_DAY}{t('번까지예요. 필터 찾기는 계속 무료예요.')}</Text>
          <Row style={tw`mt-3`}>
            <Button size="sm" variant="outline" icon={<SlidersHorizontal size={14} color={C.ink2} />} onPress={() => nav('/people?tab=search')}>{t('필터로 찾기')}</Button>
            <View style={tw`w-2`} />
            <Button size="sm" icon={<Sparkles size={14} color={C.onPrimary} />} onPress={() => nav('/plus')}>{t('AroundU+ 보기')}</Button>
          </Row>
        </View>
      ) : null}

      {q && !limited ? (
        <View style={tw`mt-4`}>
          <Section loading={sec.loading} error={sec.error} onRetry={sec.retry}
            skeleton={<View><Text style={tw`text-[13px] font-semibold text-ink-3 mb-3`}>{t('조건을 읽는 중…')}</Text><SectionSkeleton count={2} /></View>}
            empty={parseFailed && (
              <View style={tw`rounded-[20px] bg-surface-2 p-4`}>
                <Text style={tw`text-[15px] font-bold text-ink`}>{t('무엇을 찾는지 조금만 더 적어주세요')}</Text>
                {parsed?.dropped.length ? <PrivacyNote text={t('성별·나이·종교 같은 민감한 조건은 쓰지 않아요')} /> : <Text style={tw`mt-1 text-[12px] text-ink-3`}>{t('도시 · 학교 · 분야 · 관심사 중 하나만 있어도 돼요.')}</Text>}
                <View style={tw`mt-3`}>{exampleChips}</View>
              </View>
            )}>
            {/* 읽어낸 조건 */}
            <View style={tw`flex-row flex-wrap items-center`}>
              <Text style={tw`mr-1.5 mb-1.5 text-[11px] font-bold text-ink-3`}>{t('읽어낸 조건')}</Text>
              {chips.map((c) => (
                <View key={chipKey(c)} style={tw`h-8 pl-3 pr-1 mr-1.5 mb-1.5 rounded-full bg-primary-soft flex-row items-center`}>
                  <Text style={tw`text-[12px] font-bold text-primary`}>{c.label}</Text>
                  <Pressable onPress={() => setRemoved((r) => [...r, chipKey(c)])} accessibilityLabel={`${c.label} ${t('빼기')}`} hitSlop={4} style={tw`h-6 w-6 rounded-full items-center justify-center`}><X size={12} color={C.primary} /></Pressable>
                </View>
              ))}
              {removed.length > 0 ? <Pressable onPress={() => setRemoved([])} style={tw`h-8 px-2 mb-1.5 justify-center`}><Text style={tw`text-[12px] font-semibold text-ink-3 underline`}>{t('처음 조건으로')}</Text></Pressable> : null}
            </View>
            {parsed && parsed.dropped.length > 0 ? <PrivacyNote text={t('성별·나이·종교 같은 민감한 조건은 쓰지 않아요')} /> : null}

            {allRemoved ? (
              <View style={tw`mt-4`}><SectionEmpty emoji="🧹" title={t('조건을 모두 뺐어요')} description={t('다시 적거나 처음 조건으로 돌아가요.')} action={<Button size="sm" variant="outline" onPress={() => setRemoved([])}>{t('처음 조건으로')}</Button>} /></View>
            ) : results.length === 0 ? (
              <View style={tw`mt-4 card p-4`}>
                <Text style={tw`text-[15px] font-bold text-ink`}>{t('가까운 네트워크에서 바로 떠오르는 사람이 없어요')}</Text>
                <Text style={tw`mt-0.5 text-[12px] text-ink-3`}>{t('조건을 하나 빼면 더 넓게 찾을 수 있어요.')}</Text>
                <View style={tw`mt-3`}>
                  {relaxations(chips).map((c) => (
                    <Pressable key={chipKey(c)} onPress={() => setRemoved((r) => [...r, chipKey(c)])} style={tw`h-10 px-3.5 mb-1.5 rounded-full bg-surface-2 flex-row items-center`}>
                      <X size={13} color={C.primary} /><Text numberOfLines={1} style={tw`ml-2 flex-1 text-[13px] font-semibold text-primary`}>{lang === 'en' ? `Try again without '${c.label}'` : `'${c.label}' 빼고 다시 찾기`}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={tw`mt-3 rounded-2xl bg-primary p-3.5`}>
                  <Text style={tw`text-[16px] font-bold text-white`}>{t('건너건너 물어볼까요?')}</Text>
                  <Text style={[tw`mt-0.5 text-[12px]`, { color: C.glassSoft }]}>{t('아는 사람들의 네트워크에 조용히 물어봐요. 해당되는 사람만 답해요.')}</Text>
                  <Row style={tw`mt-2.5`}><Button size="sm" variant="accent" icon={<Send size={14} color={C.primary} />} onPress={askNetwork}>{t('건너건너 물어보기')}</Button></Row>
                </View>
              </View>
            ) : (
              <>
                <View style={tw`mt-4 flex-row items-end`}>
                  <Text style={tw`flex-1 text-[18px] font-bold text-ink`}>{t('가까운 네트워크에서')} {results.length}{t('명을 찾았어요')}</Text>
                  <Pressable onPress={save} disabled={saving} style={tw`ml-2 h-8 px-3 rounded-full border border-line bg-white flex-row items-center`}>
                    {plus ? <Star size={13} color={C.primary} /> : <Lock size={12} color={C.primary} />}<Text style={tw`ml-1 text-[12px] font-bold text-primary`}>{t('검색 저장')}</Text>
                  </Pressable>
                </View>
                <View style={tw`mt-0.5 mb-3 flex-row items-center`}><ShieldCheck size={12} color={C.ink3} /><Text style={tw`ml-1 text-[12px] text-ink-3`}>{t('공개 범위 안에서만 보여요')}</Text></View>
                {shown.map((x) => <MaskedPersonRow key={x.u.id} user={x.u} reasons={x.reasons} />)}
                {advancedLocked && results.length > shown.length ? (
                  <View style={tw`rounded-[20px] bg-primary-soft p-4`}>
                    <Text style={tw`text-[14px] font-bold text-ink`}>{lang === 'en' ? `${results.length - shown.length} more match these combined conditions` : `조건을 겹친 결과 ${results.length - shown.length}명이 더 있어요`}</Text>
                    <Text style={tw`mt-0.5 text-[12px] text-ink-2`}>{t('조건 2개 이상은 AroundU+ 에서 모두 보여요. 조건 하나씩은 무료예요.')}</Text>
                    <Row style={tw`mt-2.5`}>
                      <Button size="sm" onPress={() => nav('/plus')}>{t('AroundU+ 보기')}</Button>
                      <View style={tw`w-2`} />
                      <Button size="sm" variant="outline" onPress={() => nav('/people?tab=search')}>{t('필터로 찾기')}</Button>
                    </Row>
                  </View>
                ) : null}
                <Pressable onPress={askNetwork} style={tw`mt-4 h-11 rounded-full border border-line bg-white flex-row items-center justify-center`}>
                  <Send size={14} color={C.primary} /><Text style={tw`ml-1.5 text-[13px] font-semibold text-primary`}>{t('건너건너 물어볼까요?')}</Text>
                </Pressable>
              </>
            )}
          </Section>
        </View>
      ) : null}

      <PaywallSheet open={!!paywall} onClose={() => setPaywall(null)} reason={paywall ?? undefined} />
    </Screen>
  );
}
