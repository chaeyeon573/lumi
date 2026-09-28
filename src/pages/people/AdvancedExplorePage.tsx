import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, Check, Lock, Play, Search, Sparkles, Trash2, X } from 'lucide-react';
import { t, lang } from '@core/i18n';
import type { PeopleSearch, SavedSearch, Stage } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { isPlus, PLUS_OPEN_REQUESTS } from '@core/lib/monetization';
import { SEARCH_GROUPS, emptySearch, groupsUsed, isEmptySearch, searchLabel, searchOptions, searchPeople, type SearchGroup } from '@core/lib/people';
import { degreesFrom } from '@core/lib/graph';
import { INTEREST_LABELS } from '@core/lib/labels';
import { shortSchool } from '@core/lib/network';
import { cn } from '@core/lib/cn';
import { TopBar } from '@/components/layout/TopBar';
import { Button, Chip, Input, Segmented, Section, SectionEmpty, SectionSkeleton, PrivacyNote, Skeleton, Tag } from '@/components/ui';
import { PLUS_PERKS } from '@/components/social/PaywallSheet';
import { MaskedPersonCard, DegreePill, degreeLine, StatusPill } from '@/components/around_PersonCard';
import { useSectionState } from '@/hooks/useSectionState';
import { useSnapshot } from '@/hooks/useSnapshot';
import { useViewer } from '@/hooks/useViewer';

type DegreeFilter = 'all' | '2' | '3';
type ListKey = Exclude<SearchGroup, 'gradYear'>;
const STAGE_OPTIONS: Stage[] = ['undergrad', 'masters', 'alumni'];

/**
 * /people/advanced — AroundU+ 고급 탐색. 검색력(복수 조건 · 촌수 필터 · 저장 · 자동 알림 · 더 많은 동시 찾기)만 늘어나고,
 * 비공개 정보는 유료여도 보이지 않는다(결과 카드는 공개 범위를 그대로 따른다).
 */
export function AdvancedExplorePage() {
  const nav = useNavigate();
  const v = useViewer();
  const snap = useSnapshot();
  const sub = useSectionState('plus-subscription', 450);
  const plus = isPlus(v.me);
  const mySaved = snap.savedSearches.filter((s) => s.userId === v.me.id);

  return (
    <div className="min-h-full bg-bg pb-10">
      <TopBar back title={t('고급 탐색')} right={plus && !sub.loading ? <Tag tone="primary" className="mr-2"><Sparkles size={11} />AroundU+</Tag> : undefined} />
      <div className="px-4 pt-3 space-y-4">
        {sub.loading ? (
          <div className="space-y-3" aria-busy="true" aria-label={t('구독 정보를 불러오는 중')}>
            <Skeleton className="h-24 w-full rounded-[24px]" />
            <SectionSkeleton count={2} />
          </div>
        ) : sub.error ? (
          <Section loading={false} error={sub.error} onRetry={sub.retry}>{null}</Section>
        ) : plus ? (
          <Explorer saved={mySaved} />
        ) : (
          <>
            {mySaved.length > 0 && (
              <div className="rounded-2xl bg-gold-soft px-4 py-3">
                <div className="text-[14px] font-bold">{t('구독이 끝났어요 · 저장한 검색은 그대로 있어요')}</div>
                <div className="text-[12px] text-ink-2 mt-0.5">{t('다시 시작하면 저장한 검색과 알림을 이어서 쓸 수 있어요')}</div>
                <ul className="mt-2 space-y-1">{mySaved.map((s) => <li key={s.id} className="text-[12px] text-ink-2 flex items-center gap-1.5"><BellOff size={12} className="text-ink-3" />{s.name}</li>)}</ul>
              </div>
            )}
            <div className="rounded-[24px] bg-[linear-gradient(135deg,var(--tint),var(--tint))] p-5">
              <div className="flex items-center gap-2"><Sparkles size={18} className="text-primary" /><span className="font-display text-[20px] font-bold text-ink leading-tight">{t('원하는 사람을 더 정확하게')}</span></div>
              <ul className="mt-3 space-y-2">{PLUS_PERKS().map((p) => (
                <li key={p.title} className="flex items-start gap-2.5"><span className="h-5 w-5 rounded-full bg-white grid place-items-center text-primary shrink-0 mt-0.5"><Check size={12} /></span><div><div className="text-[13px] font-semibold">{p.title}</div><div className="text-[12px] text-ink-2">{p.desc}</div></div></li>
              ))}</ul>
              <div className="mt-3 rounded-2xl bg-white/80 px-3 py-2 text-[12px] text-ink-2 flex items-center gap-1.5"><Lock size={12} className="text-primary shrink-0" />{t('유료여도 비공개 정보는 볼 수 없어요')}</div>
            </div>
            <Button full size="lg" icon={<Sparkles size={16} />} onClick={() => nav('/plus/checkout')}>{t('시작하기')}</Button>
            <button onClick={() => nav('/plus')} className="w-full text-center text-[13px] font-semibold text-primary underline underline-offset-2 press">{t('자세히 보기')}</button>
          </>
        )}
      </div>
    </div>
  );
}

function Explorer({ saved }: { saved: SavedSearch[] }) {
  const nav = useNavigate();
  const v = useViewer();
  const snap = useSnapshot();
  const run = useAppStore((s) => s.run);
  const schools = useAppStore((s) => s.schools);
  const [c, setC] = useState<PeopleSearch>(emptySearch);
  const [openGroup, setOpenGroup] = useState<SearchGroup | null>(null);
  const [degree, setDegree] = useState<DegreeFilter>('all');
  const [busy, setBusy] = useState(false);
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
  const toggle = (g: ListKey, value: string) => setC((prev) => {
    const cur = prev[g] as string[];
    return { ...prev, [g]: cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value] };
  });
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
    <>
      {/* 조건 */}
      <section className="card p-4">
        <div className="flex items-center justify-between"><b className="text-[14px]">{t('조건 겹치기')}</b>{used.length > 0 && <button onClick={() => setC(emptySearch())} className="text-[12px] font-semibold text-ink-3 press">{t('모두 지우기')}</button>}</div>
        <div className="relative mt-2.5">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input className="pl-9" placeholder={t('키워드 (선택)')} value={c.q ?? ''} onChange={(e) => setC({ ...c, q: e.target.value })} />
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {SEARCH_GROUPS.map((g) => { const n = countOf(g.key); return (
            <Chip key={g.key} size="sm" active={openGroup === g.key || n > 0} onClick={() => setOpenGroup(openGroup === g.key ? null : g.key)}>{g.label}{n > 0 ? ` ${n}` : ''}</Chip>
          ); })}
        </div>
        {openGroup && (
          <div className="mt-3 rounded-2xl bg-surface-2 p-3">
            <div className="flex items-center justify-between mb-2"><span className="text-[12px] font-semibold text-ink-2">{SEARCH_GROUPS.find((g) => g.key === openGroup)?.label}</span>
              <span className="flex gap-2">{countOf(openGroup) > 0 && <button onClick={() => clearGroup(openGroup)} className="text-[12px] text-ink-3 press">{t('지우기')}</button>}<button onClick={() => setOpenGroup(null)} aria-label={t('닫기')} className="press"><X size={15} className="text-ink-3" /></button></span>
            </div>
            {openGroup === 'gradYear' ? (
              <div className="grid grid-cols-2 gap-2">
                {(['gradYearFrom', 'gradYearTo'] as const).map((k) => (
                  <select key={k} className="h-10 rounded-2xl border border-line bg-white px-3 text-[13px]" value={c[k] ?? ''} onChange={(e) => setC({ ...c, [k]: e.target.value ? Number(e.target.value) : undefined })} aria-label={k === 'gradYearFrom' ? t('부터') : t('까지')}>
                    <option value="">{k === 'gradYearFrom' ? t('부터') : t('까지')}</option>
                    {opts.gradYears.map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 max-h-[160px] overflow-y-auto">
                {optionsFor(openGroup).map((o) => { const on = (c[openGroup as ListKey] as string[]).includes(o.value); return (
                  <Chip key={o.value} size="sm" active={on} onClick={() => toggle(openGroup as ListKey, o.value)} className={on ? '' : 'bg-white'}>{o.label}</Chip>
                ); })}
                {optionsFor(openGroup).length === 0 && <span className="text-[12px] text-ink-3">{t('선택할 수 있는 값이 아직 없어요')}</span>}
              </div>
            )}
          </div>
        )}
        <div className="mt-3 text-[12px] font-semibold text-ink-2">{t('관계 거리')}</div>
        <Segmented className="mt-1.5" value={degree} onChange={setDegree} options={[{ value: 'all', label: t('전체') }, { value: '2', label: t('2촌 이내') }, { value: '3', label: t('3촌 이내') }]} />
      </section>

      {/* 결과 */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-[13px] font-semibold text-ink-3">{isEmptySearch(c) ? t('결과') : `${t('결과')} ${results.length}`}</h2>
          <Button size="sm" variant="secondary" disabled={isEmptySearch(c)} loading={busy} icon={<Bell size={13} />} onClick={save}>{t('검색 저장')}</Button>
        </div>
        {isEmptySearch(c)
          ? <SectionEmpty emoji="🔎" title={t('조건을 골라 겹쳐 보세요')} description={lang === 'en' ? 'e.g. Seoul + AI + alumni, within 2nd degree' : '예: 서울 + AI + 졸업생, 2촌 이내'} />
          : results.length === 0
            ? <SectionEmpty emoji="🌙" title={t('이 조건에 맞는 사람이 아직 없어요')} description={t('저장해 두면 새 사람이 들어올 때 알려드려요')} action={degree !== 'all' ? <Button size="sm" variant="outline" onClick={() => setDegree('all')}>{t('관계 거리 넓히기')}</Button> : undefined} />
            : <div className="space-y-2.5">{results.slice(0, 30).map((u) => (
              <MaskedPersonCard key={u.id} user={u} top={<><DegreePill text={degreeLine(snap, v.me, u, deg.get(u.id))} /><StatusPill user={u} size="sm" /></>} />
            ))}</div>}
        <PrivacyNote className="mt-2 justify-center" text={t('유료여도 비공개 정보는 볼 수 없어요')} />
      </section>

      {/* 저장한 검색 */}
      <section>
        <h2 className="text-[13px] font-semibold text-ink-3 mb-2">{t('저장한 검색')} {saved.length}</h2>
        {saved.length === 0
          ? <p className="text-[12px] text-ink-3">{t('조건을 저장하면 새 사람이 들어올 때 알려드려요')}</p>
          : <div className="space-y-2">{saved.map((s) => (
            <div key={s.id} className="rounded-[20px] border border-line bg-white px-3.5 py-2.5 flex items-center gap-2">
              <button onClick={() => setC(structuredClone(s.criteria))} className="flex-1 min-w-0 text-left press">
                <span className="block text-[13px] font-semibold truncate">{s.name}</span>
                <span className="block text-[11px] text-ink-3">{s.lastMatched}{t('명')} · {s.alert ? t('알림 켜짐') : t('알림 꺼짐')}</span>
              </button>
              <button onClick={() => setAlert(s)} aria-pressed={s.alert} aria-label={s.alert ? t('알림 끄기') : t('알림 켜기')}
                className={cn('h-8 w-8 rounded-full grid place-items-center press', s.alert ? 'bg-primary text-white' : 'bg-surface-2 text-ink-3')}>{s.alert ? <Bell size={14} /> : <BellOff size={14} />}</button>
              <button onClick={() => runSaved(s)} aria-label={t('다시 확인')} className="h-8 w-8 rounded-full grid place-items-center bg-primary-soft text-primary press"><Play size={13} /></button>
              <button onClick={() => remove(s)} aria-label={t('삭제')} className="h-8 w-8 rounded-full grid place-items-center text-ink-3 hover:bg-surface-2 press"><Trash2 size={14} /></button>
            </div>
          ))}</div>}
      </section>

      {/* 동시에 찾기 한도 */}
      <button onClick={() => nav('/people/ask')} className="w-full rounded-[20px] bg-surface-2 px-4 py-3 flex items-center gap-3 text-left press">
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] font-semibold">{t('동시에 찾기')} {openReq}/{PLUS_OPEN_REQUESTS}</span>
          <span className="block text-[11px] text-ink-3">{t('사람 찾아보기를 한 번에 더 많이 열어 둘 수 있어요')}</span>
        </span>
        <span className="h-1.5 w-20 rounded-full bg-white overflow-hidden shrink-0"><span className="block h-full bg-primary" style={{ width: `${Math.min(100, (openReq / PLUS_OPEN_REQUESTS) * 100)}%` }} /></span>
      </button>
    </>
  );
}
