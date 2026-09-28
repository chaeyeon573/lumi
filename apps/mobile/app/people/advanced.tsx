import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Bell, BellOff, Check, Lock, Play, Search, Sparkles, Trash2, X } from 'lucide-react-native';
import { t, lang } from '@core/i18n';
import type { PeopleSearch, SavedSearch, Stage } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { isPlus, PLUS_OPEN_REQUESTS } from '@core/lib/monetization';
import { SEARCH_GROUPS, emptySearch, groupsUsed, isEmptySearch, searchLabel, searchOptions, searchPeople, type SearchGroup } from '@core/lib/people';
import { degreesFrom } from '@core/lib/graph';
import { INTEREST_LABELS } from '@core/lib/labels';
import { shortSchool } from '@core/lib/network';
import { tw } from '@/tw';
import { nav } from '@/nav';
import { useViewer } from '@/viewer';
import { Screen, Button, Segmented, Tag, C } from '@/ui';
import { PLUS_PERKS } from '@/components/PaywallSheet';
import { useSnapshot } from '@/v2/useSnapshot';
import { useSectionState } from '@/v2/useSectionState';
import { Section, SectionEmpty, SectionSkeleton, PrivacyNote } from '@/v2/SectionState';
import { StatusPill } from '@/v2/StatusPill';
import { MaskedPersonCard, DegreePill, degreeLine, SubTitle, MoreRow } from '@/v2/Network';
import { Row, Wrap, WChip } from '@/v2/Forms';

type DegreeFilter = 'all' | '2' | '3';
type ListKey = Exclude<SearchGroup, 'gradYear'>;
const STAGE_OPTIONS: Stage[] = ['undergrad', 'masters', 'alumni'];

/**
 * /people/advanced — AroundU+ 고급 탐색 (웹 AdvancedExplorePage). 검색력(복수 조건 · 촌수 필터 · 저장 · 자동 알림 · 더 많은 동시 찾기)만 늘어나고,
 * 비공개 정보는 유료여도 보이지 않는다(결과 카드는 공개 범위를 그대로 따른다).
 */
export default function AdvancedExploreScreen() {
  const v = useViewer();
  const snap = useSnapshot();
  const sub = useSectionState('plus-subscription', 450);
  const plus = isPlus(v.me);
  const mySaved = snap.savedSearches.filter((s) => s.userId === v.me.id);

  return (
    <Screen title={t('고급 탐색')} right={plus && !sub.loading ? <Tag tone="primary">AroundU+</Tag> : undefined}>
      <View style={tw`pt-3`}>
        {sub.loading ? (
          <View accessibilityLabel={t('구독 정보를 불러오는 중')}><View style={tw`h-24 rounded-[20px] bg-surface-2 mb-3`} /><SectionSkeleton count={2} /></View>
        ) : sub.error ? (
          <Section loading={false} error={sub.error} onRetry={sub.retry}>{null}</Section>
        ) : plus ? (
          <Explorer saved={mySaved} />
        ) : (
          <>
            {mySaved.length > 0 ? (
              <View style={tw`mb-4 rounded-2xl bg-gold-soft px-4 py-3`}>
                <Text style={tw`text-[14px] font-bold text-ink`}>{t('구독이 끝났어요 · 저장한 검색은 그대로 있어요')}</Text>
                <Text style={tw`text-[12px] text-ink-2 mt-0.5`}>{t('다시 시작하면 저장한 검색과 알림을 이어서 쓸 수 있어요')}</Text>
                {mySaved.map((s) => <View key={s.id} style={tw`mt-1 flex-row items-center`}><BellOff size={12} color={C.ink3} /><Text style={tw`ml-1.5 text-[12px] text-ink-2`}>{s.name}</Text></View>)}
              </View>
            ) : null}
            <View style={tw`rounded-[20px] bg-primary-soft p-5`}>
              <View style={tw`flex-row items-center`}><Sparkles size={18} color={C.primary} /><Text style={tw`ml-2 flex-1 text-[20px] font-bold text-ink`}>{t('원하는 사람을 더 정확하게')}</Text></View>
              {PLUS_PERKS().map((p) => (
                <View key={p.title} style={tw`mt-2 flex-row items-start`}>
                  <View style={tw`h-5 w-5 rounded-full bg-white items-center justify-center mt-0.5`}><Check size={12} color={C.primary} /></View>
                  <View style={tw`ml-2.5 flex-1`}><Text style={tw`text-[13px] font-semibold text-ink`}>{p.title}</Text><Text style={tw`text-[12px] text-ink-2`}>{p.desc}</Text></View>
                </View>
              ))}
              <View style={[tw`mt-3 rounded-2xl px-3 py-2 flex-row items-center`, { backgroundColor: C.glass }]}><Lock size={12} color={C.primary} /><Text style={tw`ml-1.5 flex-1 text-[12px] text-ink-2`}>{t('유료여도 비공개 정보는 볼 수 없어요')}</Text></View>
            </View>
            <Row style={tw`mt-4`}><Button full size="lg" icon={<Sparkles size={16} color={C.onPrimary} />} onPress={() => nav('/plus/checkout')}>{t('시작하기')}</Button></Row>
            <Pressable onPress={() => nav('/plus')} style={tw`mt-3 items-center`}><Text style={tw`text-[13px] font-semibold text-primary underline`}>{t('자세히 보기')}</Text></Pressable>
          </>
        )}
      </View>
    </Screen>
  );
}

function Explorer({ saved }: { saved: SavedSearch[] }) {
  const v = useViewer();
  const snap = useSnapshot();
  const run = useAppStore((s) => s.run);
  const schools = useAppStore((s) => s.schools);
  const [c, setC] = useState<PeopleSearch>(emptySearch);
  const [openGroup, setOpenGroup] = useState<SearchGroup | null>(null);
  const [degree, setDegree] = useState<DegreeFilter>('all');
  const [busy, setBusy] = useState(false);
  const [more, setMore] = useState(false);
  const opts = useMemo(() => searchOptions(v.visibleUsers), [v.visibleUsers]);
  const deg = useMemo(() => degreesFrom(snap, v.me.id, 3), [snap, v.me.id]);
  const schoolName = (id: string) => schools.find((s) => s.id === id)?.name ?? id;
  const used = groupsUsed(c);
  const openReq = snap.networkRequests.filter((r) => r.authorId === v.me.id && r.status === 'open').length;

  const results = useMemo(() => {
    if (isEmptySearch(c)) return [];
    const hidden = new Set(v.me.hiddenPeople ?? []);
    const max = degree === 'all' ? Infinity : Number(degree);
    return searchPeople(v.visibleUsers, v.me, c)
      .filter((u) => !hidden.has(u.id) && (degree === 'all' || (deg.get(u.id) ?? 99) <= max))
      .sort((a, b) => (deg.get(a.id) ?? 9) - (deg.get(b.id) ?? 9));
  }, [c, degree, deg, v.visibleUsers, v.me]);

  const optionsFor = (g: SearchGroup): { value: string; label: string }[] => {
    switch (g) {
      case 'schools': return schools.map((s) => ({ value: s.id, label: shortSchool(s.name) || s.name }));
      case 'interests': return opts.interests.map((i) => ({ value: i, label: INTEREST_LABELS[i] }));
      case 'stages': return STAGE_OPTIONS.map((s) => ({ value: s, label: s === 'alumni' ? t('졸업생') : s === 'masters' ? t('대학원') : t('학생') }));
      case 'gradYear': return [];
      default: return (opts[g as Exclude<ListKey, 'schools' | 'interests' | 'stages'>] ?? []).map((x) => ({ value: x, label: x }));
    }
  };
  const toggle = (g: ListKey, value: string) => setC((prev) => { const cur = prev[g] as string[]; return { ...prev, [g]: cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value] }; });
  const clearGroup = (g: SearchGroup) => setC((prev) => (g === 'gradYear' ? { ...prev, gradYearFrom: undefined, gradYearTo: undefined } : { ...prev, [g]: [] }));
  const countOf = (g: SearchGroup) => (g === 'gradYear' ? (c.gradYearFrom || c.gradYearTo ? 1 : 0) : (c[g] as string[]).length);

  const save = async () => {
    setBusy(true);
    try { await run(() => api.searches.save(v.me.id, searchLabel(c, schoolName), c, true), t('검색을 저장했어요 · 새 사람이 들어오면 알려드릴게요')); }
    catch { /* toast */ } finally { setBusy(false); }
  };
  const setAlert = (s: SavedSearch) => run(() => api.searches.setAlert(s.id, !s.alert), s.alert ? t('알림을 껐어요') : t('새 사람이 들어오면 알려드릴게요')).catch(() => undefined);
  const runSaved = (s: SavedSearch) => run(() => api.searches.run(v.me.id, s.id), t('조건을 다시 확인했어요')).catch(() => undefined);
  const remove = (s: SavedSearch) => run(() => api.searches.remove(s.id), t('저장한 검색을 지웠어요')).catch(() => undefined);

  return (
    <View>
      {/* 1. 조건 */}
      <View style={tw`card p-4`}>
        <View style={tw`flex-row items-center`}><Text style={tw`flex-1 text-[14px] font-bold text-ink`}>{t('조건 겹치기')}</Text>{used.length > 0 ? <Pressable onPress={() => setC(emptySearch())}><Text style={tw`text-[12px] font-semibold text-ink-3`}>{t('모두 지우기')}</Text></Pressable> : null}</View>
        <View style={tw`mt-2.5 h-11 px-3.5 rounded-2xl border border-input-line flex-row items-center`}>
          <Search size={15} color={C.ink3} />
          <TextInput style={tw`flex-1 ml-2 text-[14px] text-ink`} placeholderTextColor={C.ink3} placeholder={t('키워드 (선택)')} value={c.q ?? ''} onChangeText={(q) => setC({ ...c, q })} />
        </View>
        <View style={tw`mt-2.5`}><Wrap>{SEARCH_GROUPS.map((g) => { const n = countOf(g.key); return <WChip key={g.key} active={openGroup === g.key || n > 0} onPress={() => setOpenGroup(openGroup === g.key ? null : g.key)}>{g.label}{n > 0 ? ` ${n}` : ''}</WChip>; })}</Wrap></View>
        {openGroup ? (
          <View style={tw`mt-2 rounded-2xl bg-surface-2 p-3`}>
            <View style={tw`flex-row items-center mb-2`}>
              <Text style={tw`flex-1 text-[12px] font-semibold text-ink-2`}>{SEARCH_GROUPS.find((g) => g.key === openGroup)?.label}</Text>
              {countOf(openGroup) > 0 ? <Pressable onPress={() => clearGroup(openGroup)} style={tw`mr-3`}><Text style={tw`text-[12px] text-ink-3`}>{t('지우기')}</Text></Pressable> : null}
              <Pressable onPress={() => setOpenGroup(null)} accessibilityLabel={t('닫기')}><X size={15} color={C.ink3} /></Pressable>
            </View>
            {openGroup === 'gradYear' ? (
              <View>
                <Text style={tw`text-[11px] font-bold text-ink-3 mb-1`}>{t('부터')}</Text>
                <Wrap>{opts.gradYears.map((y) => <WChip key={`f${y}`} active={c.gradYearFrom === y} onPress={() => setC({ ...c, gradYearFrom: c.gradYearFrom === y ? undefined : y })}>{y}</WChip>)}</Wrap>
                <Text style={tw`mt-1 text-[11px] font-bold text-ink-3 mb-1`}>{t('까지')}</Text>
                <Wrap>{opts.gradYears.map((y) => <WChip key={`t${y}`} active={c.gradYearTo === y} onPress={() => setC({ ...c, gradYearTo: c.gradYearTo === y ? undefined : y })}>{y}</WChip>)}</Wrap>
              </View>
            ) : (
              <Wrap>
                {optionsFor(openGroup).map((o) => <WChip key={o.value} active={(c[openGroup as ListKey] as string[]).includes(o.value)} onPress={() => toggle(openGroup as ListKey, o.value)}>{o.label}</WChip>)}
                {optionsFor(openGroup).length === 0 ? <Text style={tw`text-[12px] text-ink-3`}>{t('선택할 수 있는 값이 아직 없어요')}</Text> : null}
              </Wrap>
            )}
          </View>
        ) : null}
        <Text style={tw`mt-3 mb-1.5 text-[12px] font-semibold text-ink-2`}>{t('관계 거리')}</Text>
        <Segmented<DegreeFilter> value={degree} onChange={setDegree} options={[['all', t('전체')], ['2', t('2촌 이내')], ['3', t('3촌 이내')]]} />
      </View>

      {/* 2. 결과 */}
      <View style={tw`mt-4`}>
        <SubTitle right={<Button size="sm" variant="secondary" disabled={isEmptySearch(c)} loading={busy} icon={<Bell size={13} color={C.primary} />} onPress={save}>{t('검색 저장')}</Button>}>{isEmptySearch(c) ? t('결과') : `${t('결과')} ${results.length}`}</SubTitle>
        {isEmptySearch(c)
          ? <SectionEmpty emoji="🔎" title={t('조건을 골라 겹쳐 보세요')} description={lang === 'en' ? 'e.g. Seoul + AI + alumni, within 2nd degree' : '예: 서울 + AI + 졸업생, 2촌 이내'} />
          : results.length === 0
            ? <SectionEmpty emoji="🌙" title={t('이 조건에 맞는 사람이 아직 없어요')} description={t('저장해 두면 새 사람이 들어올 때 알려드려요')} action={degree !== 'all' ? <Button size="sm" variant="outline" onPress={() => setDegree('all')}>{t('관계 거리 넓히기')}</Button> : undefined} />
            : results.slice(0, 30).map((u) => <MaskedPersonCard key={u.id} user={u} top={<><DegreePill text={degreeLine(snap, v.me, u, deg.get(u.id))} /><StatusPill user={u} size="sm" /></>} />)}
        <View style={tw`items-center`}><PrivacyNote text={t('유료여도 비공개 정보는 볼 수 없어요')} /></View>
      </View>

      {/* 3. 저장한 검색 */}
      <View style={tw`mt-5`}>
        <SubTitle>{`${t('저장한 검색')} ${saved.length}`}</SubTitle>
        {saved.length === 0
          ? <Text style={tw`px-1 text-[12px] text-ink-3`}>{t('조건을 저장하면 새 사람이 들어올 때 알려드려요')}</Text>
          : saved.map((s) => (
            <View key={s.id} style={tw`mb-2 rounded-[20px] border border-line bg-white px-3.5 py-2.5 flex-row items-center`}>
              <Pressable onPress={() => setC(JSON.parse(JSON.stringify(s.criteria)) as PeopleSearch)} style={tw`flex-1 min-w-0`}>
                <Text numberOfLines={1} style={tw`text-[13px] font-semibold text-ink`}>{s.name}</Text>
                <Text style={tw`text-[11px] text-ink-3`}>{s.lastMatched}{t('명')} · {s.alert ? t('알림 켜짐') : t('알림 꺼짐')}</Text>
              </Pressable>
              <Pressable onPress={() => setAlert(s)} accessibilityLabel={s.alert ? t('알림 끄기') : t('알림 켜기')} style={tw`ml-1.5 h-8 w-8 rounded-full items-center justify-center ${s.alert ? 'bg-primary' : 'bg-surface-2'}`}>{s.alert ? <Bell size={14} color={C.onPrimary} /> : <BellOff size={14} color={C.ink3} />}</Pressable>
              <Pressable onPress={() => runSaved(s)} accessibilityLabel={t('다시 확인')} style={tw`ml-1.5 h-8 w-8 rounded-full items-center justify-center bg-primary-soft`}><Play size={13} color={C.primary} /></Pressable>
              <Pressable onPress={() => remove(s)} accessibilityLabel={t('삭제')} style={tw`ml-1 h-8 w-8 rounded-full items-center justify-center`}><Trash2 size={14} color={C.ink3} /></Pressable>
            </View>
          ))}
      </View>

      {/* 더 보기 — 동시에 찾기 한도 */}
      <MoreRow open={more} onToggle={() => setMore((x) => !x)} />
      {more ? (
        <Pressable onPress={() => nav('/people/ask')} style={tw`rounded-[20px] bg-surface-2 px-4 py-3 flex-row items-center`}>
          <View style={tw`flex-1 min-w-0`}>
            <Text style={tw`text-[13px] font-semibold text-ink`}>{t('동시에 찾기')} {openReq}/{PLUS_OPEN_REQUESTS}</Text>
            <Text style={tw`text-[11px] text-ink-3`}>{t('사람 찾아보기를 한 번에 더 많이 열어 둘 수 있어요')}</Text>
          </View>
          <View style={tw`h-1.5 w-20 rounded-full bg-white overflow-hidden`}><View style={[tw`h-full bg-primary`, { width: `${Math.min(100, (openReq / PLUS_OPEN_REQUESTS) * 100)}%` }]} /></View>
        </Pressable>
      ) : null}
    </View>
  );
}
