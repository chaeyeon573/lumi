import { useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X, Clock, BadgeCheck, UserPlus, CalendarPlus, Sparkles, Search, Bookmark } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { AppHeader } from '@/components/layout/AppHeader';
import { LAST_SEEN_KEY } from '@/components/layout/BottomNav';
import { CardSkeleton, EmptyState, ErrorState, Button, BottomSheet, Chip, Segmented, Toggle } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { INTEREST_LABELS, GOAL_LABELS, ALL_INTERESTS, ALL_GOALS } from '@core/lib/labels';
import { commonInterests } from '@core/lib/relations';
import { matchScore, shareableReasons, type Reason } from '@core/lib/recommend';
import { statusNow, freeBlocks, todayIdx, nowMin, fmtBlock } from '@core/lib/timetable';
import { myNetwork, beyondNetwork, networkLabel } from '@core/lib/network';
import { swipesLeft, isPlus, FREE_SWIPES_PER_DAY, BEYOND_FREE_PREVIEW } from '@core/lib/monetization';
import { assetUrl } from '@/lib/assets';
import { cn } from '@core/lib/cn';
import type { User, Interest, Goal, Stage } from '@core/types';
import { PaywallSheet } from '@/components/social/PaywallSheet';
import { ProposeSheet } from '@/components/people_ProposeSheet';
import { BeyondCard, cityOf } from '@/components/people_BeyondCard';
import { BeyondFilterRow, BeyondFilterGroups, STAGE_CHIPS, matchesStages, passesBeyond, beyondPresets, beyondLabel, isEmptyBeyond, EMPTY_BEYOND, type BeyondFilter } from '@/components/people_BeyondFilters';

type Tab = 'network' | 'beyond';
interface Filters { years: number[]; sameDept: boolean; sameClass: boolean; freeNow: boolean; interests: Interest[]; goals: Goal[] }
const EMPTY: Filters = { years: [], sameDept: false, sameClass: false, freeNow: false, interests: [], goals: [] };
const yearOf = (u: User) => (u.affiliation.type === 'university' ? Math.min(4, Math.max(1, new Date().getFullYear() - u.affiliation.year + 1)) : 0);
const tog = <T,>(arr: T[], x: T) => (arr.includes(x) ? arr.filter((y) => y !== x) : [...arr, x]);

/** People — My Network (내 학교, 한 장씩 넘겨 보는 덱) | Beyond (다른 학교·도시, 미리보기 3명 + AroundU+) */
export function PeoplePage({ tab: forcedTab }: { tab?: Tab } = {}) {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = forcedTab ?? (params.get('tab') === 'beyond' ? 'beyond' : 'network');
  const setTab = (next: Tab) => {
    if (forcedTab) { nav(next === 'beyond' ? '/people/beyond' : '/people'); return; }
    setParams(next === 'beyond' ? { tab: 'beyond' } : {}, { replace: true });
  };
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const run = useAppStore((s) => s.run);
  const v = useViewer();
  const me = v.me;
  const [paywall, setPaywall] = useState<'limit' | 'open' | null>(null);
  const [proposeFor, setProposeFor] = useState<User | null>(null);

  /** Connect = 무료 플랜 하루 한도(30) 먼저 차감 → 친구 요청. 한도를 다 썼으면 페이월. 성공 여부를 돌려준다 */
  const connect = async (u: User): Promise<boolean> => {
    try { useAppStore.getState().applyPatch(await api.users.recordSwipe(me.id)); } catch { setPaywall('limit'); return false; }
    if (!(v.isFriend(u.id) || v.pendingOut(u.id))) {
      try { await run(() => api.relationships.sendFriendRequest(me.id, u.id), `${u.nickname}${t('님에게 친구 요청을 보냈어요.')}`); } catch { return false; }
    }
    return true;
  };

  return (
    <div className="h-full flex flex-col bg-bg">
      <AppHeader search />
      <div className="shrink-0 px-4 pb-2.5"><Segmented value={tab} onChange={setTab} options={[{ value: 'network', label: t('내 네트워크') }, { value: 'beyond', label: t('바깥') }]} /></div>
      {status === 'loading' && <CardSkeleton />}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && (tab === 'network'
        ? <NetworkDeck connect={connect} invite={setProposeFor} openPaywall={() => setPaywall('open')} initialFree={params.get('free') === '1'} />
        : <BeyondList connect={connect} openPaywall={() => setPaywall('open')} />)}
      <PaywallSheet open={!!paywall} onClose={() => setPaywall(null)} reason={paywall === 'limit' ? 'limit' : undefined} />
      <ProposeSheet user={proposeFor} open={!!proposeFor} onClose={() => setProposeFor(null)} />
    </div>
  );
}

// ─── My Network — 한 장씩 넘겨 보는 덱 ───────────────────────────────────────
function NetworkDeck({ connect, invite, openPaywall, initialFree }: { connect: (u: User) => Promise<boolean>; invite: (u: User) => void; openPaywall: () => void; initialFree: boolean }) {
  const nav = useNavigate();
  const v = useViewer();
  const me = v.me;
  const opps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const [f, setF] = useState<Filters>({ ...EMPTY, freeNow: initialFree });
  const [stages, setStages] = useState<Stage[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const left = swipesLeft(me);
  const plus = isPlus(me);
  const myDept = me.affiliation.type === 'university' ? me.affiliation.department : '';

  const scored = useMemo(() => myNetwork(v.visibleUsers, me)
    .map((u) => ({ u, ...matchScore(me, u, { opportunities: opps, opportunityIntents: intents }, v.canSeeField(u, 'timetable')) }))
    .map((x) => ({ ...x, score: x.score + commonInterests(me, x.u).length * 0.5 })), [v, me, opps, intents]);
  const passes = (u: User) => {
    if (!matchesStages(u, stages)) return false;
    if (f.years.length && !f.years.includes(yearOf(u))) return false;
    if (f.sameDept && !(u.affiliation.type === 'university' && u.affiliation.department === myDept)) return false;
    if (f.sameClass && !u.timetable.some((c) => me.timetable.some((m) => m.name === c.name))) return false;
    if (f.freeNow && !((u.timetable.length && v.canSeeField(u, 'timetable')) ? statusNow(u.timetable).kind === 'free' : u.availability === 'now')) return false;
    if (f.interests.length && !f.interests.some((i) => u.interests.includes(i))) return false;
    if (f.goals.length && !f.goals.some((g) => u.goals.includes(g))) return false;
    return true;
  };
  const cards = scored.filter((x) => passes(x.u)).sort((a, b) => b.score - a.score).slice(0, 20);
  const current = cards[Math.min(idx, Math.max(0, cards.length - 1))];
  try { if (current) localStorage.setItem(LAST_SEEN_KEY, current.u.id); } catch { /* */ }

  const advance = () => { const el = scroller.current; if (el) el.scrollBy({ left: el.clientWidth, behavior: 'smooth' }); };
  const reset = () => { setIdx(0); scroller.current?.scrollTo({ left: 0 }); };
  const onConnect = async (u: User) => { setBusy(true); const ok = await connect(u); setBusy(false); if (ok) advance(); };
  const chips: { key: string; label: string; clear: () => void }[] = [
    ...f.years.map((y) => ({ key: `y${y}`, label: `${y}${t('학년')}`, clear: () => setF({ ...f, years: f.years.filter((x) => x !== y) }) })),
    ...(f.sameDept ? [{ key: 'dept', label: t('같은 학과'), clear: () => setF({ ...f, sameDept: false }) }] : []),
    ...(f.sameClass ? [{ key: 'class', label: t('같은 수업'), clear: () => setF({ ...f, sameClass: false }) }] : []),
    ...(f.freeNow ? [{ key: 'free', label: t('지금 공강'), clear: () => setF({ ...f, freeNow: false }) }] : []),
    ...f.interests.map((i) => ({ key: `i${i}`, label: INTEREST_LABELS[i], clear: () => setF({ ...f, interests: f.interests.filter((x) => x !== i) }) })),
    ...f.goals.map((g) => ({ key: `g${g}`, label: GOAL_LABELS[g], clear: () => setF({ ...f, goals: f.goals.filter((x) => x !== g) }) })),
  ];
  const connected = current ? v.isFriend(current.u.id) : false;
  const requested = current ? !!v.pendingOut(current.u.id) : false;

  return (
    <>
      <div className="shrink-0 px-4 pb-2.5 flex items-center gap-2">
        <button onClick={openPaywall} aria-label="AroundU+" className={cn('h-8 px-3 rounded-full text-[12px] font-bold flex items-center gap-1 shrink-0', plus ? 'bg-primary text-white' : left <= 2 ? 'bg-gold-soft text-primary' : 'bg-accent-soft text-primary')}><UserPlus size={12} />{plus ? '∞' : `${left}/${FREE_SWIPES_PER_DAY}`}</button>
        <div className="flex-1 min-w-0 flex gap-1.5 overflow-x-auto hide-scrollbar">{STAGE_CHIPS.map((c) => <Chip key={c.key} size="sm" active={stages.includes(c.key)} onClick={() => { setStages(tog(stages, c.key)); reset(); }}>{c.label}</Chip>)}</div>
        <button onClick={() => setFilterOpen(true)} aria-label={t('조건')} className={cn('h-9 w-9 rounded-full grid place-items-center press shrink-0', chips.length ? 'bg-primary text-white' : 'bg-surface-2 text-ink-2')}><SlidersHorizontal size={17} /></button>
      </div>
      {chips.length > 0 && <div className="shrink-0 flex gap-1.5 overflow-x-auto hide-scrollbar px-4 pb-2.5">{chips.map((c) => <button key={c.key} onClick={() => { c.clear(); reset(); }} className="h-8 pl-2.5 pr-3 rounded-full bg-accent-soft text-primary text-[12px] font-semibold flex items-center gap-1 shrink-0"><X size={12} />{c.label}</button>)}</div>}
      {!current ? (
        <EmptyState emoji="" title={t('이 조건에 맞는 사람이 아직 없어요')} action={<Button size="sm" variant="outline" onClick={() => { setF(EMPTY); setStages([]); reset(); }}>{t('조건 지우기')}</Button>} />
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <div ref={scroller} className="flex-1 min-h-0 flex overflow-x-auto snap-x snap-mandatory hide-scrollbar" onScroll={(e) => { const el = e.currentTarget; setIdx(Math.round(el.scrollLeft / el.clientWidth)); }}>
            {cards.map((c) => <NetworkSlide key={c.u.id} user={c.u} reasons={c.reasons} onOpen={() => nav(`/users/${c.u.id}`)} />)}
          </div>
          <div className="shrink-0 pt-3 pb-1 flex flex-col items-center gap-2">
            <div className="flex items-center gap-3">
              <button onClick={advance} aria-label={t('패스')} className="h-12 w-12 rounded-full bg-surface-2 text-ink-2 grid place-items-center press"><X size={22} /></button>
              <Button size="lg" className="px-9 shadow-[0_12px_28px_-8px_rgba(15,43,72,.35)]" icon={<UserPlus size={18} />} loading={busy} disabled={connected || requested} variant={connected || requested ? 'secondary' : 'primary'} onClick={() => onConnect(current.u)}>{connected ? t('친구') : requested ? t('요청됨') : t('연결')}</Button>
              <span className="h-12 w-12" aria-hidden />
            </div>
            <button onClick={() => invite(current.u)} className="h-8 px-3 rounded-full text-[12px] font-semibold text-primary flex items-center gap-1 press"><CalendarPlus size={13} />{t('만남에 초대')}</button>
          </div>
        </div>
      )}

      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title={t('조건')} tall>
        <div className="space-y-4">
          <div><div className="text-[12px] font-bold text-ink-3 mb-1.5">{t('학년')}</div><div className="flex gap-1.5">{[1, 2, 3, 4].map((y) => <Chip key={y} size="sm" active={f.years.includes(y)} onClick={() => setF({ ...f, years: tog(f.years, y) })}>{y}{t('학년')}</Chip>)}</div></div>
          <div><div className="text-[12px] font-bold text-ink-3 mb-1.5">{t('관계')}</div><div className="flex flex-wrap gap-1.5"><Chip size="sm" active={f.sameDept} onClick={() => setF({ ...f, sameDept: !f.sameDept })}>{t('같은 학과')}</Chip><Chip size="sm" active={f.sameClass} onClick={() => setF({ ...f, sameClass: !f.sameClass })}>{t('같은 수업')}</Chip><Chip size="sm" active={f.freeNow} onClick={() => setF({ ...f, freeNow: !f.freeNow })}>{t('지금 공강')}</Chip></div></div>
          <div><div className="text-[12px] font-bold text-ink-3 mb-1.5">{t('관심사')}</div><div className="flex flex-wrap gap-1.5">{ALL_INTERESTS.map((i) => <Chip key={i} size="sm" active={f.interests.includes(i)} onClick={() => setF({ ...f, interests: tog(f.interests, i) })}>{INTEREST_LABELS[i]}</Chip>)}</div></div>
          <div><div className="text-[12px] font-bold text-ink-3 mb-1.5">{t('이번 학기 목표')}</div><div className="flex flex-wrap gap-1.5">{ALL_GOALS.map((g) => <Chip key={g} size="sm" active={f.goals.includes(g)} onClick={() => setF({ ...f, goals: tog(f.goals, g) })}>{GOAL_LABELS[g]}</Chip>)}</div></div>
          <div className="flex gap-2 pt-1"><Button variant="outline" onClick={() => setF(EMPTY)}>{t('초기화')}</Button><Button full onClick={() => { setFilterOpen(false); reset(); }}>{lang === 'en' ? `Show ${scored.filter((x) => passes(x.u)).length}` : `${scored.filter((x) => passes(x.u)).length}명 보기`}</Button></div>
        </div>
      </BottomSheet>
    </>
  );
}

/** 덱 카드: 사진 전체 + 아래 그라데이션 위에 Context(이름·소속·학과·지역) · 관심사 3 · Why you might connect 2 */
function NetworkSlide({ user, reasons, onOpen }: { user: User; reasons: Reason[]; onOpen: () => void }) {
  const v = useViewer();
  const [pi, setPi] = useState(0);
  const photos = user.photos?.length ? user.photos : user.avatar.url ? [user.avatar.url] : [];
  const common = commonInterests(v.me, user);
  const why = shareableReasons(reasons).slice(0, 2);
  const dept = user.affiliation.type === 'university' && user.affiliation.showDepartment ? user.affiliation.department : '';
  const canSeeTT = user.timetable.length > 0 && v.canSeeField(user, 'timetable');
  const st = canSeeTT ? statusNow(user.timetable) : null;
  const block = canSeeTT ? freeBlocks(user.timetable, todayIdx()).find((b) => b.end > nowMin()) : null;
  const freeLabel = st?.kind === 'free' && block ? `${t('공강')} ${fmtBlock({ start: Math.max(block.start, nowMin()), end: block.end })}` : user.availability === 'now' ? t('지금 가능') : null;
  const tap = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect(); const x = e.clientX - r.left;
    if (photos.length > 1 && x < r.width * 0.3) setPi((p) => (p - 1 + photos.length) % photos.length);
    else if (photos.length > 1 && x > r.width * 0.7) setPi((p) => (p + 1) % photos.length);
    else onOpen();
  };
  return (
    <article className="relative h-full shrink-0 snap-center w-full px-4"><div className="relative h-full rounded-[32px] overflow-hidden bg-primary text-white select-none shadow-[0_16px_36px_-6px_rgba(15,43,72,.12)]">
      <div className="absolute inset-0" onClick={tap}>
        {photos.length > 0 ? <img src={assetUrl(photos[pi])} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} /> : <span className="absolute inset-0 grid place-items-center text-[96px]">{user.avatar.emoji}</span>}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(15,43,72,.92)_0%,rgba(15,43,72,.55)_38%,rgba(15,43,72,0)_65%)]" />
      </div>
      {photos.length > 1 && <div className="absolute top-3 inset-x-4 flex gap-1">{photos.map((_, i) => <span key={i} className={cn('h-[3px] flex-1 rounded-full', i === pi ? 'bg-white' : 'bg-white/40')} />)}</div>}
      {freeLabel && <span className="absolute top-6 left-4 h-8 pl-3 pr-3.5 rounded-full bg-white/85 backdrop-blur text-primary text-[12px] font-semibold flex items-center gap-1.5"><Clock size={14} className="text-verify" />{freeLabel}</span>}
      {user.affiliation.type === 'university' && user.affiliation.emailVerified && <span className="absolute top-6 right-4 h-8 w-8 rounded-full bg-white/85 backdrop-blur grid place-items-center"><BadgeCheck size={16} className="text-verify" /></span>}
      <div className="absolute inset-x-0 bottom-0 p-5 pointer-events-none">
        <h2 className="font-display text-[28px] leading-tight font-bold">{user.nickname}</h2>
        <div className="text-[14px] text-accent mt-0.5 truncate">{[networkLabel(user, lang), dept, user.region].filter(Boolean).join(' · ')}</div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">{(common.length ? [...common, ...user.interests.filter((i) => !common.includes(i))] : user.interests).slice(0, 3).map((i) => <span key={i} className="h-8 px-3.5 rounded-full bg-primary-soft text-primary text-[12px] font-semibold flex items-center">{INTEREST_LABELS[i]}</span>)}</div>
        {why.length > 0 && (
          <div className="mt-3 rounded-2xl bg-white/15 backdrop-blur px-3.5 py-2.5">
            <div className="text-[11px] font-bold text-accent">{t('이런 이유로 맞아요')}</div>
            <ul className="mt-0.5 space-y-0.5">{why.map((r) => <li key={r.text} className="text-[13px] font-medium flex items-start gap-1.5"><Sparkles size={13} className="text-accent shrink-0 mt-0.5" /><span className="line-clamp-1">{r.text}</span></li>)}</ul>
          </div>
        )}
      </div>
    </div></article>
  );
}

// ─── Beyond — 다른 학교·도시 사람 (무료는 3명 미리보기, 나머지는 흐리게) ───────
function BeyondList({ connect, openPaywall }: { connect: (u: User) => Promise<boolean>; openPaywall: () => void }) {
  const nav = useNavigate();
  const v = useViewer();
  const me = v.me;
  const opps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const schools = useAppStore((s) => s.schools);
  const showToast = useAppStore((s) => s.showToast);
  const plus = isPlus(me);
  const [bf, setBf] = useState<BeyondFilter>(EMPTY_BEYOND);
  const [sheet, setSheet] = useState(false);
  const [saved, setSaved] = useState<{ label: string; f: BeyondFilter }[]>([]);
  const [alerts, setAlerts] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const all = useMemo(() => beyondNetwork(v.visibleUsers, me)
    .map((u) => { const m = matchScore(me, u, { opportunities: opps, opportunityIntents: intents }, v.canSeeField(u, 'timetable')); return { u, score: m.score + commonInterests(me, u).length * 0.5, reasons: shareableReasons(m.reasons) }; })
    .sort((a, b) => b.score - a.score), [v, me, opps, intents]);
  const cities = useMemo(() => [...new Set(all.map((x) => cityOf(x.u)))], [all]);
  const presets = useMemo(() => beyondPresets(schools, me), [schools, me]);
  const list = plus ? all.filter((x) => passesBeyond(x.u, bf)) : all;
  const onConnect = async (u: User) => { setBusyId(u.id); await connect(u); setBusyId(null); };
  const saveSearch = () => {
    if (isEmptyBeyond(bf)) return;
    const label = beyondLabel(bf, schools);
    if (!saved.some((s) => s.label === label)) setSaved([...saved, { label, f: bf }]);
    showToast(t('검색을 저장했어요.'), 'success');
  };
  const countText = lang === 'en' ? `${all.length} people outside your network today` : `${t('오늘 내 네트워크 밖 사람')} ${all.length}${t('명')}`;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar pb-24">
      <div className="px-4 pb-2.5 flex items-center gap-2">
        <span className="h-8 px-3 rounded-full bg-surface-2 text-[12px] font-semibold text-primary flex items-center gap-1.5 min-w-0"><span className="h-2 w-2 rounded-full bg-primary shrink-0" /><span className="truncate">{countText}</span></span>
        <span className="flex-1" />
        {plus && <button onClick={() => nav('/people/search')} className="h-8 px-3 rounded-full bg-primary-soft text-primary text-[12px] font-bold flex items-center gap-1 shrink-0 press"><Search size={13} />{t('고급 검색')}</button>}
      </div>

      {!plus && (
        <div className="mx-4 rounded-[24px] bg-primary-soft p-4">
          <div className="flex items-center gap-2"><Sparkles size={16} className="text-primary" /><span className="font-display text-[18px] font-bold text-primary">{t('서클을 넓히세요')}</span></div>
          <p className="text-[13px] text-ink-2 mt-1">{t('대학·도시·커뮤니티를 넘어 사람을 발견하세요.')}</p>
          <Button size="sm" className="mt-3" onClick={openPaywall}>{t('AroundU+ 써보기')}</Button>
        </div>
      )}

      {plus && (
        <>
          <div className="flex items-center gap-1.5 pl-4 pb-2">
            <button onClick={() => setSheet(true)} aria-label={t('조건')} className={cn('h-7 w-7 rounded-full grid place-items-center press shrink-0', isEmptyBeyond(bf) ? 'bg-surface-2 text-ink-2' : 'bg-primary text-white')}><SlidersHorizontal size={14} /></button>
            <BeyondFilterRow f={bf} onChange={setBf} schools={schools} cities={cities} me={me} className="pl-0 pr-4 flex-1 min-w-0" />
          </div>
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar px-4 pb-2 items-center">
            <span className="text-[11px] font-bold text-ink-3 shrink-0">{t('프리셋')}</span>
            {presets.map((p) => <Chip key={p.label} size="sm" active={beyondLabel(bf, schools) === p.label} onClick={() => setBf(p.f)}>{p.label}</Chip>)}
          </div>
          <div className="flex gap-1.5 overflow-x-auto hide-scrollbar px-4 pb-2.5 items-center">
            <span className="text-[11px] font-bold text-ink-3 shrink-0 flex items-center gap-1"><Bookmark size={11} />{t('저장한 검색')}</span>
            {saved.length === 0 && isEmptyBeyond(bf) && <span className="text-[11px] text-ink-3">{t('저장한 검색이 없어요')}</span>}
            {saved.map((s) => <Chip key={s.label} size="sm" active={beyondLabel(bf, schools) === s.label} onClick={() => setBf(s.f)}>{s.label}</Chip>)}
            {!isEmptyBeyond(bf) && !saved.some((s) => s.label === beyondLabel(bf, schools)) && <button onClick={saveSearch} className="h-7 px-2.5 rounded-full border border-dashed border-primary text-primary text-[12px] font-semibold shrink-0 press">+ {t('이 조건을 저장')}</button>}
          </div>
          <div className="mx-4 card px-4"><Toggle label={t('발견 알림')} description={t('새 사람이 조건에 맞으면 알려드려요')} checked={alerts} onChange={(x) => { setAlerts(x); showToast(x ? t('발견 알림을 켰어요.') : t('발견 알림을 껐어요.')); }} /></div>
        </>
      )}

      <div className="px-4 pt-3 space-y-3">
        {list.length === 0 ? (
          <EmptyState emoji="" title={t('조건에 맞는 사람이 없어요')} action={!isEmptyBeyond(bf) ? <Button size="sm" variant="outline" onClick={() => setBf(EMPTY_BEYOND)}>{t('조건 지우기')}</Button> : undefined} />
        ) : list.map((x, i) => (
          <BeyondCard key={x.u.id} user={x.u} reasons={x.reasons} locked={!plus && i >= BEYOND_FREE_PREVIEW} busy={busyId === x.u.id} onConnect={onConnect} />
        ))}
        {!plus && list.length > BEYOND_FREE_PREVIEW && <Button full size="lg" onClick={openPaywall} icon={<Sparkles size={16} />}>{t('AroundU+ 써보기')}</Button>}
      </div>

      <BottomSheet open={sheet} onClose={() => setSheet(false)} title={t('조건')} tall>
        <BeyondFilterGroups f={bf} onChange={setBf} schools={schools.filter((s) => s.id !== (me.affiliation.type === 'university' ? me.affiliation.schoolId : ''))} cities={cities} me={me} />
        <div className="flex gap-2 pt-4"><Button variant="outline" onClick={() => setBf(EMPTY_BEYOND)}>{t('초기화')}</Button><Button full onClick={() => setSheet(false)}>{lang === 'en' ? `Show ${list.length}` : `${list.length}명 보기`}</Button></div>
      </BottomSheet>
    </div>
  );
}
