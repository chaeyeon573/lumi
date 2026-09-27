import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { X, Clock, UserPlus, CalendarPlus, Search, Bell, ChevronRight, Lock, Pencil, Sparkles, Bookmark, ChevronDown, Star, Trash2, BellOff, Plus } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { AppHeader } from '@/components/layout/AppHeader';
import { LAST_SEEN_KEY } from '@/components/layout/BottomNav';
import { CardSkeleton, EmptyState, ErrorState, Button, BottomSheet, Chip, Segmented, Input, Select, Avatar, Tag } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { INTEREST_LABELS, ALL_INTERESTS } from '@core/lib/labels';
import { commonInterests, friendsOf } from '@core/lib/relations';
import { statusNow, freeBlocks, todayIdx, nowMin, fmtBlock } from '@core/lib/timetable';
import { personLine, cityOf } from '@core/lib/network';
import { recommendPeople, emptySearch, SEARCH_GROUPS, groupsUsed, isAdvancedSearch, searchPresets, searchOptions, searchLabel, isEmptySearch, type SearchGroup } from '@core/lib/people';
import { matchReasons, shareableReasons, type Reason } from '@core/lib/recommend';
import { localeContext } from '@core/lib/locale-context';
import { wantsLine, hasWants } from '@core/lib/wants';
import { swipesLeft, isPlus, FREE_SWIPES_PER_DAY } from '@core/lib/monetization';
import { assetUrl } from '@/lib/assets';
import { cn } from '@core/lib/cn';
import type { User, Interest, Stage, PeopleSearch, SavedSearch } from '@core/types';
import type { Patch, Snapshot } from '@core/api/types';
import { PaywallSheet, type PaywallReason } from '@/components/social/PaywallSheet';
import { ProposeSheet } from '@/components/people_ProposeSheet';
import { ReasonChips, ReasonList } from '@/components/people_ReasonChips';
import { SchoolBadge } from '@/components/people_SchoolBadge';
import { PersonRow } from '@/components/cards/PersonRow';

type Tab = 'recommend' | 'search' | 'connections';
const TABS: Tab[] = ['recommend', 'search', 'connections'];
const tog = <T,>(arr: T[], x: T) => (arr.includes(x) ? arr.filter((y) => y !== x) : [...arr, x]);

/** URL 의 c=<JSON> → PeopleSearch (없거나 깨졌으면 빈 조건) */
export function parseCriteria(raw: string | null): PeopleSearch {
  const base = emptySearch();
  if (!raw) return base;
  try { const j = JSON.parse(raw) as Partial<PeopleSearch>; return { ...base, ...j }; } catch { return base; }
}
export const criteriaParam = (c: PeopleSearch) => encodeURIComponent(JSON.stringify(c));

/**
 * People — 추천 | 찾기 | 연결. 사람 → 관계 → 필요하면 모임.
 * 학교로 나누지 않는다: 다른 학교 사람·동문도 무료로 보인다. 유료는 "더 빠르고 정확하게 찾는 기능"뿐.
 */
export function PeoplePage() {
  const [params, setParams] = useSearchParams();
  const raw = params.get('tab');
  const tab: Tab = TABS.includes(raw as Tab) ? (raw as Tab) : 'recommend';
  const setTab = (next: Tab) => setParams(next === 'recommend' ? {} : { tab: next }, { replace: true });
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const run = useAppStore((s) => s.run);
  const v = useViewer();
  const me = v.me;
  const [paywall, setPaywall] = useState<PaywallReason | 'open' | null>(null);
  const [proposeFor, setProposeFor] = useState<User | null>(null);

  /** 연결 요청 — 하루 한도(무료 30회)는 API 가 강제한다. 한도 초과면 페이월. 성공 여부를 돌려준다 */
  const connect = async (u: User): Promise<boolean> => {
    if (v.isFriend(u.id) || v.pendingOut(u.id)) return true;
    if (!isPlus(me) && swipesLeft(me) <= 0) { setPaywall('limit'); return false; }
    try { await run(() => api.relationships.sendFriendRequest(me.id, u.id), `${u.nickname}${t('님에게 연결 요청을 보냈어요.')}`); return true; }
    catch { if (!isPlus(me) && swipesLeft(useAppStore.getState().users.find((x) => x.id === me.id) ?? me) <= 0) setPaywall('limit'); return false; }
  };

  return (
    <div className="h-full flex flex-col bg-bg">
      <AppHeader search />
      <div className="shrink-0 px-4 pb-2.5"><Segmented value={tab} onChange={setTab} options={[{ value: 'recommend', label: t('추천') }, { value: 'search', label: t('찾기') }, { value: 'connections', label: t('연결') }]} /></div>
      {status === 'loading' && <CardSkeleton />}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && tab === 'recommend' && <RecommendDeck connect={connect} invite={setProposeFor} openPaywall={() => setPaywall('open')} freeFirst={params.get('free') === '1'} />}
      {status === 'ready' && tab === 'search' && <SearchTab openPaywall={(r) => setPaywall(r)} initial={parseCriteria(params.get('c'))} />}
      {status === 'ready' && tab === 'connections' && <ConnectionsTab />}
      <PaywallSheet open={!!paywall} onClose={() => setPaywall(null)} reason={paywall && paywall !== 'open' ? paywall : undefined} />
      <ProposeSheet user={proposeFor} open={!!proposeFor} onClose={() => setProposeFor(null)} />
    </div>
  );
}

// ─── 추천 — 한 장씩 넘겨 보는 덱 (모든 학교) ────────────────────────────────
function RecommendDeck({ connect, invite, openPaywall, freeFirst }: { connect: (u: User) => Promise<boolean>; invite: (u: User) => void; openPaywall: () => void; freeFirst: boolean }) {
  const nav = useNavigate();
  const v = useViewer();
  const me = v.me;
  const [idx, setIdx] = useState(0);
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const left = swipesLeft(me);
  const plus = isPlus(me);
  const used = plus ? 0 : FREE_SWIPES_PER_DAY - left;

  const schools = useAppStore((s) => s.schools);
  const posts = useAppStore((s) => s.posts);
  const chatRooms = useAppStore((s) => s.chatRooms);
  const notifications = useAppStore((s) => s.notifications);
  const reports = useAppStore((s) => s.reports);
  const savedSearches = useAppStore((s) => s.savedSearches);
  const cards = useMemo(() => {
    const snap: Snapshot = { ...v.snap, schools, posts, chatRooms, notifications, reports, savedSearches };
    return recommendPeople(snap, me, v.visibleUsers, (u) => v.canSeeField(u, 'timetable'), 20);
  }, [v, me, schools, posts, chatRooms, notifications, reports, savedSearches]);
  const current = idx < cards.length ? cards[idx] : null;
  useEffect(() => { try { if (current) localStorage.setItem(LAST_SEEN_KEY, current.user.id); } catch { /* */ } }, [current]);

  const advance = () => { const el = scroller.current; if (el) el.scrollBy({ left: el.clientWidth, behavior: 'smooth' }); };
  const onConnect = async (u: User) => { setBusy(true); const ok = await connect(u); setBusy(false); if (ok) advance(); };
  const connected = current ? v.isFriend(current.user.id) : false;
  const requested = current ? !!v.pendingOut(current.user.id) : false;
  const wants = wantsLine(me.wants);

  return (
    <>
      <div className="shrink-0 px-4 pb-2 flex items-center gap-2">
        <button onClick={() => nav('/profile/wants')} className="flex-1 min-w-0 h-8 pl-3 pr-2 rounded-full bg-surface-2 text-[12px] font-semibold text-ink-2 flex items-center gap-1.5 press">
          {hasWants(me.wants)
            ? <><span className="text-ink-3 shrink-0">{t('찾는 사람')}:</span><span className="truncate text-primary">{wants}</span><span className="text-ink-3">·</span><span className="text-primary shrink-0 flex items-center gap-0.5"><Pencil size={11} />{t('편집')}</span></>
            : <><span className="truncate">{t('찾는 사람을 설정하면 추천이 정확해져요')}</span><span className="text-primary shrink-0 flex items-center">{t('설정')}<ChevronRight size={13} /></span></>}
        </button>
        <button onClick={openPaywall} aria-label="AroundU+" title={t('오늘 연결 요청')} className={cn('h-8 px-3 rounded-full text-[12px] font-bold flex items-center gap-1 shrink-0 press', plus ? 'bg-primary text-white' : left <= 2 ? 'bg-gold-soft text-[#B57A0E]' : 'bg-accent-soft text-primary')}>
          <UserPlus size={12} />{plus ? '∞' : `${used}/${FREE_SWIPES_PER_DAY}`}
        </button>
      </div>
      {freeFirst && <div className="shrink-0 mx-4 mb-2 h-8 px-3 rounded-full bg-mint-soft text-mint text-[12px] font-semibold flex items-center gap-1.5"><Clock size={13} />{t('지금 공강인 사람 우선')}</div>}

      {cards.length === 0 ? (
        <DeckEnd onWants={() => nav('/profile/wants')} onSearch={() => nav('/people?tab=search')} />
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <div ref={scroller} className="flex-1 min-h-0 flex overflow-x-auto snap-x snap-mandatory hide-scrollbar" onScroll={(e) => { const el = e.currentTarget; setIdx(Math.round(el.scrollLeft / el.clientWidth)); }}>
            {cards.map((c) => <RecommendSlide key={c.user.id} user={c.user} reasons={c.reasons} onOpen={() => nav(`/users/${c.user.id}`)} />)}
            <div className="h-full shrink-0 snap-center w-full px-4"><div className="h-full rounded-[32px] bg-surface-2 grid place-items-center"><DeckEnd onWants={() => nav('/profile/wants')} onSearch={() => nav('/people?tab=search')} /></div></div>
          </div>
          <div className={cn('shrink-0 pt-3 pb-1 flex flex-col items-center gap-2 transition-opacity', !current && 'opacity-0 pointer-events-none')}>
            <div className="flex items-center gap-3">
              <button onClick={advance} aria-label={t('패스')} className="h-12 w-12 rounded-full bg-surface-2 text-ink-2 grid place-items-center press"><X size={22} /></button>
              <Button size="lg" className="px-9 shadow-[0_12px_28px_-8px_rgba(15,43,72,.35)]" icon={<UserPlus size={18} />} loading={busy} disabled={connected || requested} variant={connected || requested ? 'secondary' : 'primary'} onClick={() => current && onConnect(current.user)}>{connected ? t('연결됨') : requested ? t('요청됨') : t('연결')}</Button>
              <button onClick={() => current && invite(current.user)} aria-label={t('만남에 초대')} className="h-12 w-12 rounded-full bg-primary-soft text-primary grid place-items-center press"><CalendarPlus size={20} /></button>
            </div>
            <span className="text-[11px] text-ink-3">{t('패스')} · {t('연결')} · {t('만남에 초대')}</span>
          </div>
        </div>
      )}
    </>
  );
}

function DeckEnd({ onWants, onSearch }: { onWants: () => void; onSearch: () => void }) {
  return (
    <EmptyState emoji="" title={t('오늘 추천은 여기까지')} description={t('찾기에서 조건으로 직접 찾거나, 찾는 사람을 바꾸면 새 추천이 와요.')}
      action={<div className="flex flex-col gap-2"><Button size="sm" icon={<Search size={14} />} onClick={onSearch}>{t('찾기에서 직접 찾기')}</Button><Button size="sm" variant="outline" onClick={onWants}>{t('찾는 사람 바꾸기')}</Button></div>} />
  );
}

/** 추천 카드: 사진 위에 이유 칩 · 아래에 이름·학교 'YY ✓·한 줄·도시·관심사·"왜 추천되었나요" */
function RecommendSlide({ user, reasons, onOpen }: { user: User; reasons: Reason[]; onOpen: () => void }) {
  const v = useViewer();
  const [pi, setPi] = useState(0);
  const photos = user.photos?.length ? user.photos : user.avatar.url ? [user.avatar.url] : [];
  const common = commonInterests(v.me, user);
  const canSeeTT = user.timetable.length > 0 && v.canSeeField(user, 'timetable');
  const st = canSeeTT ? statusNow(user.timetable) : null;
  const block = canSeeTT ? freeBlocks(user.timetable, todayIdx()).find((b) => b.end > nowMin()) : null;
  const freeLabel = st?.kind === 'free' && block ? `${t('공강')} ${fmtBlock({ start: Math.max(block.start, nowMin()), end: block.end })}` : user.availability === 'now' ? t('지금 가능') : null;
  const city = cityOf(user);
  const tap = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect(); const x = e.clientX - r.left;
    if (photos.length > 1 && x < r.width * 0.3) setPi((p) => (p - 1 + photos.length) % photos.length);
    else if (photos.length > 1 && x > r.width * 0.7) setPi((p) => (p + 1) % photos.length);
    else onOpen();
  };
  return (
    <article className="relative h-full shrink-0 snap-center w-full px-4"><div className="h-full rounded-[32px] overflow-hidden bg-white border border-line flex flex-col select-none shadow-[0_16px_36px_-6px_rgba(15,43,72,.12)]">
      <div className="relative shrink-0 h-[46%] bg-primary" onClick={tap}>
        {photos.length > 0 ? <img src={assetUrl(photos[pi])} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} /> : <span className="absolute inset-0 grid place-items-center text-[96px]" style={{ background: `linear-gradient(135deg, hsl(${user.avatar.hue} 60% 78%), hsl(${(user.avatar.hue + 40) % 360} 55% 62%))` }}>{user.avatar.emoji}</span>}
        {photos.length > 1 && <div className="absolute top-3 inset-x-4 flex gap-1">{photos.map((_, i) => <span key={i} className={cn('h-[3px] flex-1 rounded-full', i === pi ? 'bg-white' : 'bg-white/40')} />)}</div>}
        {reasons.length > 0 && <div className="absolute top-6 left-4 right-4 pointer-events-none"><div className="inline-flex max-w-full rounded-full bg-white/85 backdrop-blur p-1"><ReasonChips reasons={reasons} max={3} tone="solid" className="flex-nowrap overflow-hidden" /></div></div>}
        {freeLabel && <span className="absolute bottom-3 left-4 h-8 pl-3 pr-3.5 rounded-full bg-white/85 backdrop-blur text-primary text-[12px] font-semibold flex items-center gap-1.5 pointer-events-none"><Clock size={14} className="text-verify" />{freeLabel}</span>}
        {user.avatar.photoType !== 'face' && <span className="absolute bottom-3 right-4 rounded-full bg-black/35 backdrop-blur text-white text-[11px] px-2.5 py-1 pointer-events-none">{user.avatar.photoType === 'masked' ? t('얼굴 비공개') : t('뒷모습')}</span>}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar px-5 pt-4 pb-4">
        <button onClick={onOpen} className="text-left block w-full">
          <h2 className="font-display text-[26px] leading-tight font-bold text-ink">{user.nickname}</h2>
          <SchoolBadge user={user} withYear className="mt-1" />
          <div className="text-[13px] text-ink-2 mt-0.5 truncate">{personLine(user, lang)}</div>
          {city && <div className="text-[12px] text-ink-3 mt-0.5 truncate">{city}{user.activityCity && user.activityCity !== city ? ` · ${t('활동')} ${user.activityCity}` : ''}</div>}
        </button>
        {user.interests.length > 0 && <div className="mt-2.5 flex flex-wrap gap-1.5">{[...common, ...user.interests.filter((i) => !common.includes(i))].slice(0, 4).map((i) => <span key={i} className={cn('h-7 px-3 rounded-full text-[12px] font-semibold flex items-center', common.includes(i) ? 'bg-primary-soft text-primary' : 'bg-surface-2 text-ink-2')}>{INTEREST_LABELS[i]}</span>)}</div>}
        <ReasonList reasons={reasons} title={t('왜 추천되었나요')} max={3} className="mt-3" />
      </div>
    </div></article>
  );
}

// ─── 찾기 — 키워드 + 프리셋 + 저장한 검색 + 조건 행 ───────────────────────────
type SheetGroup = SearchGroup | 'company';
interface Row { key: SheetGroup; label: string; detailed: boolean; summary: (c: PeopleSearch) => string[] }
const stageLabel = (s: Stage) => (s === 'alumni' ? t('졸업생') : s === 'masters' ? t('대학원') : t('학생'));

function SearchTab({ openPaywall, initial }: { openPaywall: (r: PaywallReason) => void; initial: PeopleSearch }) {
  const nav = useNavigate();
  const v = useViewer();
  const me = v.me;
  const run = useAppStore((s) => s.run);
  const schools = useAppStore((s) => s.schools);
  const saved = useAppStore((s) => s.savedSearches).filter((s) => s.userId === me.id);
  const plus = isPlus(me);
  const [c, setC] = useState<PeopleSearch>(initial);
  const [sheet, setSheet] = useState<SheetGroup | null>(null);
  const [savedMenu, setSavedMenu] = useState<SavedSearch | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);
  const ctx = localeContext();
  const opts = useMemo(() => searchOptions(v.users), [v.users]);
  const presets = useMemo(() => searchPresets(me, lang), [me]);
  const schoolName = (id: string) => schools.find((s) => s.id === id)?.name ?? id;
  const used = groupsUsed(c);

  const rows: Row[] = [
    { key: 'schools', label: t('학교'), detailed: false, summary: (x) => x.schools.map(schoolName) },
    { key: 'majors', label: t('전공'), detailed: false, summary: (x) => x.majors },
    { key: 'gradYear', label: t('졸업연도'), detailed: true, summary: (x) => (x.gradYearFrom || x.gradYearTo ? [`${x.gradYearFrom ?? ''}–${x.gradYearTo ?? ''}`] : []) },
    { key: 'homeCities', label: t('거주 지역'), detailed: false, summary: (x) => x.homeCities },
    { key: 'activityCities', label: t('활동 지역'), detailed: true, summary: (x) => x.activityCities },
    { key: 'company', label: t('회사/업종'), detailed: true, summary: (x) => [...x.companies, ...x.industries] },
    { key: 'roles', label: t('직무'), detailed: true, summary: (x) => x.roles },
    { key: 'interests', label: t('관심사'), detailed: false, summary: (x) => x.interests.map((i) => INTEREST_LABELS[i]) },
    { key: 'stages', label: t('사용자 상태'), detailed: false, summary: (x) => x.stages.map(stageLabel) },
  ];

  const search = (criteria: PeopleSearch, savedId?: string) => {
    if (isAdvancedSearch(criteria) && !plus) { openPaywall('search'); return; }
    nav(`/people/results?c=${criteriaParam(criteria)}${savedId ? `&saved=${savedId}` : ''}`);
  };
  const runSaved = async (s: SavedSearch) => {
    setRunningId(s.id);
    try { await run(() => api.searches.run(me.id, s.id)); } catch { /* toast */ } finally { setRunningId(null); }
    nav(`/people/results?c=${criteriaParam(s.criteria)}&saved=${s.id}`);
  };
  const clear = () => setC(emptySearch());
  const presetActive = (p: { criteria: Partial<PeopleSearch> }) => searchLabel({ ...emptySearch(), ...p.criteria }, schoolName) === searchLabel(c, schoolName);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar pb-28">
      <div className="px-4">
        <div className="relative">
          <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <Input className="pl-10 h-12 rounded-full" placeholder={t('이름, 학교, 회사, 관심사')} value={c.q ?? ''} onChange={(e) => setC({ ...c, q: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') search(c); }} />
        </div>
      </div>
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar px-4 pt-3 pb-1 items-center">
        <span className="text-[11px] font-bold text-ink-3 shrink-0 flex items-center gap-1"><Sparkles size={11} />{t('추천 조건')}</span>
        {presets.map((p) => <Chip key={p.label} size="sm" active={presetActive(p)} onClick={() => setC({ ...emptySearch(), ...p.criteria })}>{p.label}</Chip>)}
      </div>
      {(saved.length > 0 || plus) && (
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar px-4 py-1 items-center">
          <span className="text-[11px] font-bold text-ink-3 shrink-0 flex items-center gap-1"><Bookmark size={11} />{t('저장한 검색')}</span>
          {saved.length === 0 && <span className="text-[11px] text-ink-3">{t('결과 화면에서 ☆ 로 저장해요')}</span>}
          {saved.map((s) => (
            <SavedChip key={s.id} s={s} busy={runningId === s.id} onOpen={() => runSaved(s)} onMenu={() => setSavedMenu(s)} />
          ))}
        </div>
      )}

      <div className="mx-4 mt-2 rounded-[24px] border border-line bg-white overflow-hidden">
        {rows.map((r, i) => { const vals = r.summary(c); return (
          <button key={r.key} onClick={() => setSheet(r.key)} className={cn('w-full flex items-center gap-2 px-4 h-12 text-left press', i > 0 && 'border-t border-line/70')}>
            <span className="text-[14px] font-semibold text-ink shrink-0">{r.label}</span>
            {r.detailed && !plus && <span className="h-5 px-1.5 rounded-full bg-gold-soft text-[#B57A0E] text-[10px] font-bold inline-flex items-center gap-0.5 shrink-0"><Lock size={9} />Plus</span>}
            <span className={cn('flex-1 min-w-0 truncate text-[13px] text-right', vals.length ? 'text-primary font-semibold' : 'text-ink-3')}>{vals.length ? vals.join(', ') : t('전체')}</span>
            <ChevronRight size={16} className="text-ink-3 shrink-0" />
          </button>
        ); })}
      </div>

      <div className="px-4 mt-3 flex items-center gap-2">
        <span className={cn('text-[12px] font-semibold flex-1', used.length >= 2 && !plus ? 'text-[#B57A0E]' : 'text-ink-2')}>
          {t('조건')} {used.length}{t('개')}{plus ? '' : ` · ${t('무료는 1개까지')}`}
          {!plus && used.length >= 1 && used.some((g) => SEARCH_GROUPS.find((x) => x.key === g)?.detailed) && <span className="ml-1 text-[#B57A0E]">· {t('상세 조건')}</span>}
        </span>
        {!isEmptySearch(c) && <button onClick={clear} className="text-[12px] font-semibold text-ink-3 underline underline-offset-2 press">{t('초기화')}</button>}
      </div>
      <div className="px-4 mt-3">
        <Button full size="lg" icon={isAdvancedSearch(c) && !plus ? <Lock size={16} /> : <Search size={16} />} onClick={() => search(c)}>{t('이 조건으로 검색하기')}</Button>
        {!plus && <p className="mt-2 text-center text-[11px] text-ink-3">{t('사람을 만나는 데는 돈을 받지 않아요 — 더 빠르고 정확하게 찾는 기능만 AroundU+')}</p>}
      </div>

      <FilterSheet group={sheet} onClose={() => setSheet(null)} c={c} setC={setC} opts={opts} ctx={ctx} schools={schools} />

      <BottomSheet open={!!savedMenu} onClose={() => setSavedMenu(null)} title={savedMenu?.name}>
        {savedMenu && (
          <div className="space-y-1">
            <p className="text-[12px] text-ink-3 px-3 pb-1">{searchLabel(savedMenu.criteria, schoolName)} · {t('마지막')} {savedMenu.lastMatched}{t('명')}</p>
            <button onClick={() => { const s = savedMenu; setSavedMenu(null); run(() => api.searches.setAlert(s.id, !s.alert), s.alert ? t('새 사람 알림을 껐어요.') : t('새 사람 알림을 켰어요.')); }} className="w-full flex items-center gap-3 rounded-xl px-3 h-12 text-[14px] font-semibold press hover:bg-surface-2">{savedMenu.alert ? <BellOff size={18} /> : <Bell size={18} />}{savedMenu.alert ? t('새 사람 알림 끄기') : t('새 사람 알림 켜기')}</button>
            <button onClick={() => { const s = savedMenu; setSavedMenu(null); setC(s.criteria); }} className="w-full flex items-center gap-3 rounded-xl px-3 h-12 text-[14px] font-semibold press hover:bg-surface-2"><Pencil size={18} />{t('조건 불러오기')}</button>
            <button onClick={() => { const s = savedMenu; setSavedMenu(null); run(() => api.searches.remove(s.id), t('저장한 검색을 지웠어요.')); }} className="w-full flex items-center gap-3 rounded-xl px-3 h-12 text-[14px] font-semibold press hover:bg-surface-2 text-danger"><Trash2 size={18} />{t('삭제')}</button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}

/** 저장한 검색 칩 — 탭: 실행 · 길게 누르기/우클릭: 메뉴 (알림·삭제) */
function SavedChip({ s, busy, onOpen, onMenu }: { s: SavedSearch; busy: boolean; onOpen: () => void; onMenu: () => void }) {
  const timer = useRef<number | null>(null);
  const fired = useRef(false);
  const down = () => { fired.current = false; timer.current = window.setTimeout(() => { fired.current = true; onMenu(); }, 550); };
  const up = () => { if (timer.current) window.clearTimeout(timer.current); timer.current = null; };
  return (
    <button onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up} onContextMenu={(e) => { e.preventDefault(); up(); onMenu(); }} onClick={() => { if (!fired.current) onOpen(); }}
      className={cn('h-7 pl-2.5 pr-1 rounded-full border text-[12px] font-medium whitespace-nowrap press inline-flex items-center gap-1 shrink-0', 'bg-accent-soft/60 border-accent-soft text-primary')}>
      {busy ? <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <Star size={11} fill="currentColor" />}{s.name}
      {s.alert && <Bell size={11} className="text-primary" />}
      <span role="button" aria-label={t('더보기')} onClick={(e) => { e.stopPropagation(); up(); fired.current = true; onMenu(); }} className="h-5 w-5 rounded-full grid place-items-center text-ink-3 hover:bg-white"><ChevronDown size={12} /></span>
    </button>
  );
}

/** 조건 시트 — 그룹별 칩 (시드 값 + 로케일 프리셋 + 자유 입력) */
function FilterSheet({ group, onClose, c, setC, opts, ctx, schools }: { group: SheetGroup | null; onClose: () => void; c: PeopleSearch; setC: (c: PeopleSearch) => void; opts: ReturnType<typeof searchOptions>; ctx: ReturnType<typeof localeContext>; schools: { id: string; name: string }[] }) {
  const [text, setText] = useState('');
  useEffect(() => { setText(''); }, [group]);
  const title: Record<SheetGroup, string> = { schools: t('학교'), majors: t('전공'), gradYear: t('졸업연도'), homeCities: t('거주 지역'), activityCities: t('활동 지역'), company: t('회사/업종'), companies: t('회사'), industries: t('업종'), roles: t('직무'), interests: t('관심사'), stages: t('사용자 상태') };
  const year = new Date().getFullYear();
  const minY = Math.min(year - 15, ...opts.gradYears);
  const years = Array.from({ length: year + 6 - minY + 1 }, (_, i) => minY + i);
  const detailed = group ? SEARCH_GROUPS.find((g) => g.key === group)?.detailed || group === 'company' : false;

  const chips = (field: StrField, options: string[], free?: boolean) => <StrChips field={field} options={options} free={free} c={c} setC={setC} text={text} setText={setText} />;

  return (
    <BottomSheet open={!!group} onClose={onClose} title={group ? title[group] : ''} tall>
      {detailed && <div className="mb-3 rounded-2xl bg-gold-soft px-3.5 py-2.5 text-[12px] text-ink-2 flex items-center gap-2"><Lock size={13} className="text-[#B57A0E] shrink-0" />{t('상세 조건은 AroundU+ 에서 검색할 수 있어요. 조건은 미리 골라둘 수 있어요.')}</div>}
      {group === 'schools' && <div className="flex flex-wrap gap-1.5">{schools.map((s) => <Chip key={s.id} size="sm" active={c.schools.includes(s.id)} onClick={() => setC({ ...c, schools: tog(c.schools, s.id) })}>{s.name}</Chip>)}</div>}
      {group === 'majors' && chips('majors', merge(opts.majors, ctx.majors), true)}
      {group === 'gradYear' && (
        <div className="grid grid-cols-2 gap-2">
          <div><Label>{t('부터')}</Label><Select value={c.gradYearFrom ?? ''} onChange={(e) => setC({ ...c, gradYearFrom: e.target.value ? Number(e.target.value) : undefined })}><option value="">{t('전체')}</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</Select></div>
          <div><Label>{t('까지')}</Label><Select value={c.gradYearTo ?? ''} onChange={(e) => setC({ ...c, gradYearTo: e.target.value ? Number(e.target.value) : undefined })}><option value="">{t('전체')}</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</Select></div>
          <div className="col-span-2 flex flex-wrap gap-1.5 pt-1">{opts.gradYears.map((y) => <Chip key={y} size="sm" active={c.gradYearFrom === y && c.gradYearTo === y} onClick={() => setC({ ...c, gradYearFrom: y, gradYearTo: y })}>{y}</Chip>)}</div>
        </div>
      )}
      {group === 'homeCities' && chips('homeCities', merge(opts.homeCities, ctx.cities))}
      {group === 'activityCities' && chips('activityCities', merge(opts.activityCities, ctx.cities))}
      {group === 'company' && (
        <div className="space-y-4">
          <div><Label>{t('회사')}</Label>{chips('companies', opts.companies, true)}</div>
          <div><Label>{t('업종')}</Label>{chips('industries', merge(opts.industries, ctx.industries))}</div>
        </div>
      )}
      {group === 'roles' && chips('roles', merge(opts.roles, ctx.roles), true)}
      {group === 'interests' && <div className="flex flex-wrap gap-1.5">{ALL_INTERESTS.map((i) => <Chip key={i} size="sm" active={c.interests.includes(i)} onClick={() => setC({ ...c, interests: tog<Interest>(c.interests, i) })}>{INTEREST_LABELS[i]}</Chip>)}</div>}
      {group === 'stages' && <div className="flex flex-wrap gap-1.5">{(['undergrad', 'masters', 'alumni'] as Stage[]).map((s) => <Chip key={s} size="sm" active={c.stages.includes(s)} onClick={() => setC({ ...c, stages: tog<Stage>(c.stages, s) })}>{stageLabel(s)}</Chip>)}</div>}
      <div className="flex gap-2 pt-5">
        <Button variant="outline" onClick={() => {
          if (group === 'gradYear') setC({ ...c, gradYearFrom: undefined, gradYearTo: undefined });
          else if (group === 'company') setC({ ...c, companies: [], industries: [] });
          else if (group) setC({ ...c, [group]: [] });
        }}>{t('초기화')}</Button>
        <Button full onClick={onClose}>{t('적용')}</Button>
      </div>
    </BottomSheet>
  );
}

type StrField = 'majors' | 'homeCities' | 'activityCities' | 'companies' | 'industries' | 'roles';
const merge = (...lists: string[][]) => [...new Set(lists.flat().filter(Boolean))];
const Label = ({ children }: { children: React.ReactNode }) => <div className="text-[12px] font-bold text-ink-3 mb-1.5">{children}</div>;

/** 문자열 칩 그룹 (+ 자유 입력) — 시트 밖에 두어 입력 포커스가 유지된다 */
function StrChips({ field, options, free, c, setC, text, setText }: { field: StrField; options: string[]; free?: boolean; c: PeopleSearch; setC: (c: PeopleSearch) => void; text: string; setText: (s: string) => void }) {
  const chosen = c[field];
  const all = merge(chosen, options);
  const add = () => { if (!text.trim()) return; setC({ ...c, [field]: merge(chosen, [text.trim()]) }); setText(''); };
  return (
    <div>
      {free && (
        <div className="flex gap-2 mb-2.5">
          <Input placeholder={t('직접 입력')} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') add(); }} />
          <Button variant="outline" icon={<Plus size={14} />} disabled={!text.trim()} onClick={add}>{t('추가')}</Button>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">{all.map((x) => <Chip key={x} size="sm" active={chosen.includes(x)} onClick={() => setC({ ...c, [field]: tog(chosen, x) })}>{x}</Chip>)}</div>
      {all.length === 0 && <p className="text-[12px] text-ink-3">{t('아직 선택지가 없어요. 직접 입력해보세요.')}</p>}
    </div>
  );
}

// ─── 연결 — 요청 · 연결 목록 · 팔로잉 ────────────────────────────────────────
function ConnectionsTab() {
  const nav = useNavigate();
  const v = useViewer();
  const me = v.me;
  const run = useAppStore((s) => s.run);
  const rel = useAppStore((s) => s.relationships);
  const [q, setQ] = useState('');
  const [followOpen, setFollowOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const incoming = rel.friendRequests.filter((r) => r.toId === me.id && r.status === 'pending').map((r) => ({ r, u: v.userById(r.fromId) })).filter((x): x is { r: typeof x.r; u: User } => !!x.u && !v.isBlocked(x.u.id));
  const outgoing = rel.friendRequests.filter((r) => r.fromId === me.id && r.status === 'pending').map((r) => ({ r, u: v.userById(r.toId) })).filter((x): x is { r: typeof x.r; u: User } => !!x.u);
  const friends = friendsOf(v.snap, me.id).map((id) => v.userById(id)).filter((u): u is User => !!u && !v.isBlocked(u.id));
  const following = rel.follows.filter((f) => f.fromId === me.id && f.targetType === 'user').map((f) => v.userById(f.toId)).filter((u): u is User => !!u);
  const lc = q.trim().toLowerCase();
  const list = friends.filter((u) => !lc || u.nickname.toLowerCase().includes(lc) || personLine(u, lang).toLowerCase().includes(lc) || cityOf(u).toLowerCase().includes(lc));
  const reasonsFor = (u: User) => shareableReasons(matchReasons(me, u, v.snap, v.canSeeField(u, 'timetable')));
  const act = async (id: string, fn: () => Promise<Patch>, msg?: string) => { setBusyId(id); try { await run(fn, msg); } catch { /* toast */ } finally { setBusyId(null); } };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto hide-scrollbar pb-24 px-4 space-y-3">
      {(incoming.length > 0 || outgoing.length > 0) && (
        <div className="rounded-[24px] bg-primary-soft/70 p-3">
          <div className="text-[13px] font-bold text-primary px-1">{t('받은 요청')} {incoming.length} · {t('보낸 요청')} {outgoing.length}</div>
          <div className="mt-2 space-y-1.5">
            {incoming.map(({ r, u }) => (
              <div key={r.id} className="flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2">
                <button onClick={() => nav(`/users/${u.id}`)}><Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={40} /></button>
                <div className="flex-1 min-w-0"><button onClick={() => nav(`/users/${u.id}`)} className="text-[14px] font-bold truncate block text-left">{u.nickname}</button><div className="text-[11px] text-ink-3 truncate">{personLine(u, lang)}</div></div>
                <Button size="sm" variant="outline" loading={busyId === `d${r.id}`} onClick={() => act(`d${r.id}`, () => api.relationships.respondFriendRequest(r.id, false))}>{t('거절')}</Button>
                <Button size="sm" loading={busyId === `a${r.id}`} onClick={() => act(`a${r.id}`, () => api.relationships.respondFriendRequest(r.id, true), `${u.nickname}${t('님과 연결되었어요.')}`)}>{t('수락')}</Button>
              </div>
            ))}
            {outgoing.map(({ r, u }) => (
              <div key={r.id} className="flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2">
                <button onClick={() => nav(`/users/${u.id}`)}><Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={40} /></button>
                <div className="flex-1 min-w-0"><button onClick={() => nav(`/users/${u.id}`)} className="text-[14px] font-bold truncate block text-left">{u.nickname}</button><div className="text-[11px] text-ink-3 truncate">{t('보낸 요청')} · {personLine(u, lang)}</div></div>
                <Button size="sm" variant="ghost" loading={busyId === `c${r.id}`} onClick={() => act(`c${r.id}`, () => api.relationships.cancelFriendRequest(r.id), t('요청을 취소했어요.'))}>{t('요청 취소')}</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {friends.length === 0 ? (
        <EmptyState emoji="" title={t('아직 연결이 없어요')} description={t('추천에서 마음에 드는 사람에게 연결 요청을 보내보세요.')} action={<Button size="sm" onClick={() => nav('/people')}>{t('추천 보기')}</Button>} />
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold">{t('연결')} <span className="text-ink-3 font-semibold">{friends.length}</span></span>
            <div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" /><Input className="h-9 pl-8 rounded-full text-[13px]" placeholder={t('연결 검색')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
          </div>
          {list.length === 0 ? <EmptyState emoji="" title={t('검색 결과가 없어요')} className="py-8" /> : (
            <div className="space-y-2">{list.map((u) => <PersonRow key={u.id} user={u} reasons={reasonsFor(u)} compact />)}</div>
          )}
        </>
      )}

      {following.length > 0 && (
        <div className="rounded-[24px] border border-line bg-white overflow-hidden">
          <button onClick={() => setFollowOpen((x) => !x)} className="w-full h-12 px-4 flex items-center gap-2 text-left press"><span className="text-[14px] font-bold flex-1">{t('팔로잉')} <span className="text-ink-3 font-semibold">{following.length}</span></span><ChevronDown size={16} className={cn('text-ink-3 transition-transform', followOpen && 'rotate-180')} /></button>
          {followOpen && <div className="px-3 pb-3 space-y-1.5">{following.map((u) => (
            <div key={u.id} className="flex items-center gap-2.5 rounded-2xl bg-surface-2 px-3 py-2">
              <button onClick={() => nav(`/users/${u.id}`)}><Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={36} /></button>
              <div className="flex-1 min-w-0"><button onClick={() => nav(`/users/${u.id}`)} className="text-[13px] font-bold truncate block text-left">{u.nickname}</button><div className="text-[11px] text-ink-3 truncate">{personLine(u, lang)}</div></div>
              {v.isFriend(u.id) ? <Tag tone="primary">{t('연결됨')}</Tag> : <Button size="sm" variant="ghost" onClick={() => run(() => api.relationships.toggleFollow(me.id, u.id, 'user'), t('팔로우를 취소했어요.'))}>{t('팔로우 취소')}</Button>}
            </div>
          ))}</div>}
        </div>
      )}
    </div>
  );
}
