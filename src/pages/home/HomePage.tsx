import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SlidersHorizontal, X, Clock, Zap, Bookmark, BadgeCheck, Hand, RotateCcw, CalendarDays, Users } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { AppHeader } from '@/components/layout/AppHeader';
import { LAST_SEEN_KEY } from '@/components/layout/BottomNav';
import { CardSkeleton, EmptyState, ErrorState, Button, BottomSheet, Chip } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { INTEREST_LABELS, GOAL_LABELS, ALL_INTERESTS, ALL_GOALS } from '@core/lib/labels';
import { commonInterests } from '@core/lib/relations';
import { matchScore, shareableReasons, type Reason } from '@core/lib/recommend';
import { sharedClassWith } from '@core/lib/classmates';
import { statusNow, freeBlocks, todayIdx, nowMin, fmtBlock, toMin } from '@core/lib/timetable';
import { formatDate, formatTime, todayISO } from '@core/lib/format';
import { JoinButton } from '@/components/cards/JoinButton';
import { assetUrl } from '@/lib/assets';
import { cn } from '@core/lib/cn';
import { useInvite } from '@/components/together/FeedExtras';
import type { Activity, User, Interest, Goal } from '@core/types';

interface Filters { years: number[]; sameDept: boolean; sameClass: boolean; freeNow: boolean; interests: Interest[]; goals: Goal[] }
const EMPTY: Filters = { years: [], sameDept: false, sameClass: false, freeNow: false, interests: [], goals: [] };
/** 몇 학년인지 — 학년은 가을(8월)에 바뀐다. 달력 연도로 세면 1~7월에 한 학년 높게 나왔다 */
const academicYear = (d = new Date()) => (d.getMonth() >= 7 ? d.getFullYear() : d.getFullYear() - 1);
const yearOf = (u: User) => (u.affiliation.type === 'university' ? Math.min(4, Math.max(1, academicYear() - u.affiliation.year + 1)) : 0);
const gradYear = (u: User) => (u.affiliation.type === 'university' ? `'${String(u.affiliation.year + 4).slice(2)}` : '');

/** 사람 — 한 번에 한 명. 카드를 끌어 왼쪽=넘기기, 오른쪽=친구로 연결 (Pastel Breeze) */
export function HomePage() {
  const nav = useNavigate();
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const run = useAppStore((s) => s.run);
  const opps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const v = useViewer();
  const me = v.me;
  const [f, setF] = useState<Filters>(EMPTY);
  const [filterOpen, setFilterOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [saved, setSaved] = useState<string[]>([]);
  const [returning, setReturning] = useState(false);
  const myDept = me.affiliation.type === 'university' ? me.affiliation.department : '';

  // 그 사람이 이미 열어 둔 계획 — 카드에서 '같이 하자'고 먼저 청하는 대신 열린 자리에 '나도 갈래' 하고 끼게 한다
  const planOf = useMemo(() => {
    const today = todayISO(); const now = nowMin();
    const open = v.visibleActivities
      .filter((a) => (a.date > today || (a.date === today && toMin(a.endTime) > now)) && v.approvedCount(a.id) < a.capacity && (a.joinPolicy !== 'invite' || (a.invitedIds ?? []).includes(me.id)))
      .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime));
    return (u: User) => open.find((a) => a.hostId === u.id);
  }, [v, me.id]);
  const scored = useMemo(() => v.visibleUsers
    .map((u) => ({ u, plan: planOf(u), ...matchScore(me, u, { opportunities: opps, opportunityIntents: intents, classRosters: v.snap.classRosters }, v.canSeeField(u, 'timetable')) }))
    .map((x) => ({ ...x, score: x.score + commonInterests(me, x.u).length * 0.5 + (x.plan ? 3 : 0) })), [v, me, opps, intents, planOf]);
  const passes = (u: User) => {
    if (f.years.length && !f.years.includes(yearOf(u))) return false;
    if (f.sameDept && !(u.affiliation.type === 'university' && u.affiliation.department === myDept)) return false;
    if (f.sameClass && !sharedClassWith(v.snap.classRosters, u.id)) return false;
    if (f.freeNow && !((u.timetable?.length && v.canSeeField(u, 'timetable')) ? statusNow(u.timetable ?? []).kind === 'free' : u.availability === 'now')) return false;
    if (f.interests.length && !f.interests.some((i) => u.interests?.includes(i))) return false;
    if (f.goals.length && !f.goals.some((g) => u.goals?.includes(g))) return false;
    return true;
  };
  const cards = scored.filter((x) => passes(x.u)).sort((a, b) => b.score - a.score).slice(0, 20);
  const current = cards[idx];
  try { if (current) localStorage.setItem(LAST_SEEN_KEY, current.u.id); } catch { /* */ }

  const connect = async (u: User, openIfConnected = true) => {
    if (v.isFriend(u.id) || v.pendingOut(u.id)) { if (openIfConnected) nav(`/users/${u.id}`); return; }
    try { await run(() => api.relationships.sendFriendRequest(me.id, u.id), `${u.nickname}${t('님에게 친구 요청을 보냈어요.')}`); } catch { /* */ }
  };
  const reset = () => { setIdx(0); setReturning(false); };
  const onSwipe = (dir: Dir) => {
    if (!current) return;
    if (dir === 'right') void connect(current.u, false);
    setReturning(false); setIdx((i) => i + 1);
  };
  const undo = () => { if (idx > 0) { setReturning(true); setIdx((i) => i - 1); } };
  const deck = useRef<DeckHandle>(null);
  const invite = useInvite();
  const chips: { key: string; label: string; clear: () => void }[] = [
    ...f.years.map((y) => ({ key: `y${y}`, label: yearLabel(y), clear: () => setF({ ...f, years: f.years.filter((x) => x !== y) }) })),
    ...(f.sameDept ? [{ key: 'dept', label: t('같은 학과'), clear: () => setF({ ...f, sameDept: false }) }] : []),
    ...(f.sameClass ? [{ key: 'class', label: t('같은 수업'), clear: () => setF({ ...f, sameClass: false }) }] : []),
    ...(f.freeNow ? [{ key: 'free', label: t('지금 공강'), clear: () => setF({ ...f, freeNow: false }) }] : []),
    ...f.interests.map((i) => ({ key: `i${i}`, label: INTEREST_LABELS[i], clear: () => setF({ ...f, interests: f.interests.filter((x) => x !== i) }) })),
    ...f.goals.map((g) => ({ key: `g${g}`, label: GOAL_LABELS[g], clear: () => setF({ ...f, goals: f.goals.filter((x) => x !== g) }) })),
  ];
  const tog = <T,>(arr: T[], x: T) => (arr.includes(x) ? arr.filter((y) => y !== x) : [...arr, x]);

  return (
    <div className="h-full flex flex-col bg-bg">
      <AppHeader right={<button onClick={() => setFilterOpen(true)} aria-label={t('조건')} className={cn('h-10 w-10 rounded-full grid place-items-center press', chips.length ? 'bg-primary text-white' : 'text-ink-2')}><SlidersHorizontal size={20} /></button>} />
      <div className="h-2 shrink-0" />
      {chips.length > 0 && <div className="shrink-0 flex gap-1.5 overflow-x-auto hide-scrollbar px-4 pb-3">{chips.map((c) => <button key={c.key} onClick={() => { c.clear(); reset(); }} className="h-8 pl-2.5 pr-3 rounded-full bg-accent-soft text-primary text-[12px] font-semibold flex items-center gap-1 shrink-0"><X size={12} />{c.label}</button>)}</div>}
      {status === 'loading' && <CardSkeleton />}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && (v.visibleUsers.length === 0 ? (
        // 학교에 아직 다른 학생이 없다 — 지어낸 사람을 채우지 않고, 사람을 데려오는 버튼 하나
        <EmptyState emoji="👋" title={lang === 'en' ? 'Students from your campus show up here' : '같은 학교 학생들이 여기에 보여요'} description={lang === 'en' ? 'Bring your floor or your class along.' : '같은 층이나 수업 사람들을 불러오세요.'}
          action={<Button size="sm" onClick={() => void invite(me.timetable.length ? 'class' : 'floor')}>{lang === 'en' ? 'Invite friends' : '친구 초대'}</Button>} />
      ) : cards.length === 0 ? (
        <EmptyState emoji="" title={t('이 조건에 맞는 사람이 아직 없어요')} action={<Button size="sm" variant="outline" onClick={() => { setF(EMPTY); reset(); }}>{t('조건 지우기')}</Button>} />
      ) : !current ? (
        // 끝까지 넘겼을 때 막다른 길이 되지 않게 — 사람이 적은 첫 주엔 여기가 제일 자주 보인다. 친구를 부르는 게 다음 할 일
        <EmptyState emoji="" title={lang === 'en' ? "You've seen everyone for now" : '오늘 추천은 여기까지예요'} description={lang === 'en' ? 'Lumi gets better with every friend who joins.' : '친구가 들어올수록 볼 사람이 늘어요.'}
          action={<div className="flex gap-2 justify-center"><Button size="sm" onClick={() => void invite(me.timetable.length ? 'class' : 'floor')}>{lang === 'en' ? 'Invite friends' : '친구 초대'}</Button><Button size="sm" variant="outline" onClick={reset}>{lang === 'en' ? 'Start over' : '처음부터 다시 보기'}</Button></div>} />
      ) : (
        <div className="flex-1 min-h-0 flex flex-col">
          <SwipeDeck ref={deck} key={`${idx}`} top={current} next={cards[idx + 1]} returning={returning} onSwipe={onSwipe} onOpen={(u) => nav(`/users/${u.id}`)} />
          <div className="shrink-0 pt-4 pb-7 flex flex-col items-center gap-3">
            <div className="flex items-center gap-5">
              <button onClick={undo} disabled={idx === 0} aria-label={lang === 'en' ? 'Previous' : '이전 카드'} className="h-11 w-11 rounded-full grid place-items-center press bg-surface-2 text-ink-2 disabled:opacity-40"><RotateCcw size={18} /></button>
              <button onClick={() => deck.current?.fly('left')} aria-label={t('넘기기')} className="h-[68px] w-[68px] rounded-full grid place-items-center press bg-surface-2 text-ink-2"><X size={28} /></button>
              {current.plan && current.plan.hostId !== me.id ? <JoinButton activity={current.plan} size="lg" label={lang === 'en' ? "I'm in" : '나도 갈래'} className="h-[68px] px-7 rounded-full text-[16px]" />
              : <button onClick={() => (v.isFriend(current.u.id) || v.pendingOut(current.u.id) ? nav(`/users/${current.u.id}`) : deck.current?.fly('right'))} aria-label={t('친구로 연결')} className={cn('h-[84px] w-[84px] rounded-full grid place-items-center press shadow-[0_12px_28px_-6px_rgba(15,43,72,.35)]', v.isFriend(current.u.id) || v.pendingOut(current.u.id) ? 'bg-primary text-white' : 'bg-accent text-primary v2:bg-lime-400 v2:text-night v2:shadow-[0_12px_28px_-8px_rgba(212,255,58,.35)]')}><Hand size={32} /></button>}
              <button onClick={() => setSaved((s) => tog(s, current.u.id))} aria-label={t('나중에 보기')} className={cn('h-11 w-11 rounded-full grid place-items-center press', saved.includes(current.u.id) ? 'bg-primary text-white' : 'bg-surface-2 text-primary')}><Bookmark size={18} fill={saved.includes(current.u.id) ? 'currentColor' : 'none'} /></button>
            </div>
            <p className="text-[12px] text-ink-3">{idx + 1} / {cards.length}</p>
          </div>
        </div>
      ))}

      <BottomSheet open={filterOpen} onClose={() => setFilterOpen(false)} title={t('조건')} tall>
        <div className="space-y-4">
          <div><div className="text-[12px] font-bold text-ink-3 mb-1.5">{lang === 'en' ? 'Year' : '학년'}</div><div className="flex flex-wrap gap-1.5">{[1, 2, 3, 4].map((y) => <Chip key={y} size="sm" active={f.years.includes(y)} onClick={() => setF({ ...f, years: tog(f.years, y) })}>{yearLabel(y)}</Chip>)}</div></div>
          <div><div className="text-[12px] font-bold text-ink-3 mb-1.5">{t('관계')}</div><div className="flex flex-wrap gap-1.5"><Chip size="sm" active={f.sameDept} onClick={() => setF({ ...f, sameDept: !f.sameDept })}>{t('같은 학과')}</Chip><Chip size="sm" active={f.sameClass} onClick={() => setF({ ...f, sameClass: !f.sameClass })}>{t('같은 수업')}</Chip><Chip size="sm" active={f.freeNow} onClick={() => setF({ ...f, freeNow: !f.freeNow })}>{t('지금 공강')}</Chip></div></div>
          <div><div className="text-[12px] font-bold text-ink-3 mb-1.5">{t('관심사')}</div><div className="flex flex-wrap gap-1.5">{ALL_INTERESTS.map((i) => <Chip key={i} size="sm" active={f.interests.includes(i)} onClick={() => setF({ ...f, interests: tog(f.interests, i) })}>{INTEREST_LABELS[i]}</Chip>)}</div></div>
          <div><div className="text-[12px] font-bold text-ink-3 mb-1.5">{t('이번 학기 목표')}</div><div className="flex flex-wrap gap-1.5">{ALL_GOALS.map((g) => <Chip key={g} size="sm" active={f.goals.includes(g)} onClick={() => setF({ ...f, goals: tog(f.goals, g) })}>{GOAL_LABELS[g]}</Chip>)}</div></div>
          <div className="flex gap-2 pt-1"><Button variant="outline" onClick={() => setF(EMPTY)}>{t('초기화')}</Button><Button full onClick={() => { setFilterOpen(false); reset(); }}>{lang === 'en' ? `Show ${scored.filter((x) => passes(x.u)).length}` : `${scored.filter((x) => passes(x.u)).length}명 보기`}</Button></div>
        </div>
      </BottomSheet>
    </div>
  );
}

/** 학년 칩 — 영어는 'Freshman…' (예전엔 '1yr') */
const yearLabel = (y: number) => (lang === 'en' ? ['Freshman', 'Sophomore', 'Junior', 'Senior'][y - 1] ?? `Year ${y}` : `${y}학년`);

type Dir = 'left' | 'right';
interface DeckHandle { fly: (dir: Dir) => void }
type Card = { u: User; reasons: Reason[]; plan?: Activity };
const FLY_MS = 280;

/** 카드 덱 — 맨 위 카드를 끌면 기울며 따라오고, 임계값을 넘겨 놓으면 날아간다. 뒤 카드는 끄는 만큼 커진다. */
const SwipeDeck = forwardRef<DeckHandle, { top: Card; next?: Card; returning: boolean; onSwipe: (dir: Dir) => void; onOpen: (u: User) => void }>(function SwipeDeck({ top, next, returning, onSwipe, onOpen }, ref) {
  const box = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const moved = useRef(false);
  const [d, setDState] = useState({ x: 0, y: 0 });
  const dRef = useRef(d);
  const setD = (next: { x: number; y: number }) => { dRef.current = next; setDState(next); };
  const flown = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [flying, setFlying] = useState<Dir | null>(null);
  const width = () => box.current?.clientWidth ?? 360;
  const threshold = () => width() * 0.28;

  const fly = (dir: Dir) => {
    if (flown.current) return;
    flown.current = true;
    setFlying(dir); setDragging(false);
    setD({ x: (dir === 'right' ? 1 : -1) * width() * 1.5, y: dRef.current.y + 40 });
    window.setTimeout(() => onSwipe(dir), FLY_MS);
  };
  useImperativeHandle(ref, () => ({ fly }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement | null)?.closest('input,textarea,[contenteditable="true"]')) return;
      if (e.key === 'ArrowLeft') fly('left');
      if (e.key === 'ArrowRight') fly('right');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  useEffect(() => {
    if (!dragging) return;
    const move = (e: PointerEvent) => {
      if (!start.current) return;
      const x = e.clientX - start.current.x, y = e.clientY - start.current.y;
      if (Math.abs(x) > 6) moved.current = true;
      setD({ x, y });
    };
    const up = () => {
      setDragging(false); start.current = null;
      const { x } = dRef.current;
      if (Math.abs(x) > threshold()) fly(x > 0 ? 'right' : 'left');
      else setD({ x: 0, y: 0 });
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); };
  }, [dragging]); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = Math.min(1, Math.abs(d.x) / threshold());
  const stamp = d.x > 0 ? 'right' : d.x < 0 ? 'left' : null;
  return (
    <div ref={box} className="relative flex-1 min-h-0 mx-4">
      {next && (
        <div className="absolute inset-0" style={{ transform: `scale(${0.94 + 0.06 * (flying ? 1 : progress)}) translateY(${(1 - (flying ? 1 : progress)) * 14}px)`, transition: dragging ? 'none' : `transform ${FLY_MS}ms ease-out`, opacity: 0.6 + 0.4 * (flying ? 1 : progress) }}>
          <PersonSlide user={next.u} reasons={next.reasons} plan={next.plan} onOpen={() => {}} />
        </div>
      )}
      <div
        className={cn('absolute inset-0 touch-pan-y', returning && 'animate-card-return')}
        style={{ transform: `translate(${d.x}px, ${d.y * 0.25}px) rotate(${d.x / 18}deg)`, transition: dragging ? 'none' : `transform ${FLY_MS}ms cubic-bezier(.2,.8,.2,1)`, cursor: dragging ? 'grabbing' : 'grab' }}
        onPointerDown={(e) => { if (flying || e.button !== 0) return; start.current = { x: e.clientX - d.x, y: e.clientY - d.y }; moved.current = false; setDragging(true); }}
        onClickCapture={(e) => { if (moved.current) { e.stopPropagation(); moved.current = false; } }}
      >
        <PersonSlide user={top.u} reasons={top.reasons} plan={top.plan} onOpen={() => onOpen(top.u)} />
        {stamp && (
          <span className={cn('pointer-events-none absolute top-16 px-4 py-1.5 rounded-xl border-[3px] text-[22px] font-extrabold tracking-wide bg-white/10 backdrop-blur-sm', stamp === 'right' ? 'left-6 -rotate-12 border-accent text-accent' : 'right-6 rotate-12 border-white text-white')} style={{ opacity: progress }}>
            {stamp === 'right' ? (lang === 'en' ? 'CONNECT' : '연결') : (lang === 'en' ? 'PASS' : '넘기기')}
          </span>
        )}
      </div>
    </div>
  );
});

/** 카드: 사진 전체 + 아래 그라데이션 위에 이름·학과·찾는 것·칩 3개 */
export function PersonSlide({ user, reasons, plan, onOpen }: { user: User; reasons: Reason[]; plan?: Activity; onOpen: () => void }) {
  const v = useViewer();
  const [pi, setPi] = useState(0);
  const photos = user.photos?.length ? user.photos : user.avatar.url ? [user.avatar.url] : [];
  const common = commonInterests(v.me, user);
  const want = v.canSeeField(user, 'prompts') && user.prompts?.[0]?.answer ? user.prompts[0].answer : user.nowWant;
  // 말을 꺼낼 이유 한 줄 — 같은 수업·겹치는 공강·같은 생활권처럼 둘이 함께 가진 것 (관심사는 아래 칩에 이미 있다)
  const ground = shareableReasons(reasons).find((r) => r.kind !== 'interest' && r.kind !== 'new');
  const reason = shareableReasons(reasons)[0];
  const left = plan ? plan.capacity - v.approvedCount(plan.id) : 0;
  // 이미 시작한 계획(11시~5시 동아리 부스)은 'Today 11 AM' 이면 지난 것처럼 보인다 → '지금 · 5시까지'
  const started = !!plan && plan.date === todayISO() && toMin(plan.startTime) <= nowMin();
  const planWhen = !plan ? '' : started ? (lang === 'en' ? `Now · until ${formatTime(plan.endTime)}` : `지금 · ${formatTime(plan.endTime)}까지`) : `${formatDate(plan.date)} ${formatTime(plan.startTime)}`;
  const dept = user.affiliation.type === 'university' && user.affiliation.showDepartment ? user.affiliation.department : '';
  const canSeeTT = !!user.timetable?.length && v.canSeeField(user, 'timetable');
  const st = canSeeTT ? statusNow(user.timetable ?? []) : null;
  const block = canSeeTT ? freeBlocks(user.timetable ?? [], todayIdx()).find((b) => b.end > nowMin()) : null;
  // 지금 비어 있으면 ‘지금 → 다음 수업’ — 아침 9시 전에 “free 9 AM–11 AM”(시간표 칸 시작) 으로 보이거나,
  // 30분 안 되는 틈(10:50–11)에 다음 큰 공강(12–2 PM)이 나오던 것. Discover 의 “Free until …” 과 같은 시각
  const freeEnd = st?.kind === 'free' ? (st.until ?? block?.end ?? null) : null;
  const freeLabel = freeEnd && freeEnd > nowMin() ? `${t('공강')} ${fmtBlock({ start: nowMin(), end: freeEnd })}` : user.availability === 'now' ? t('지금 가능') : null;
  const tap = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect(); const x = e.clientX - r.left;
    if (photos.length > 1 && x < r.width * 0.3) setPi((p) => (p - 1 + photos.length) % photos.length);
    else if (photos.length > 1 && x > r.width * 0.7) setPi((p) => (p + 1) % photos.length);
    else onOpen();
  };
  return (
    <article className="relative h-full w-full rounded-[32px] overflow-hidden bg-primary text-[#fff] select-none shadow-[0_16px_36px_-6px_rgba(15,43,72,.12)] v2:bg-surface v2:border v2:border-line v2:shadow-none">
      <div className="absolute inset-0" onClick={tap}>
        {photos.length > 0 ? <img src={assetUrl(photos[pi])} alt="" className="absolute inset-0 h-full w-full object-cover" draggable={false} /> : <span className="absolute inset-0 grid place-items-center text-[96px]">{user.avatar.emoji}</span>}
        <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(15,43,72,.88)_0%,rgba(15,43,72,.25)_45%,rgba(15,43,72,0)_70%)] v2:bg-[linear-gradient(to_top,rgba(8,7,12,.95)_0%,rgba(8,7,12,.45)_45%,rgba(8,7,12,0)_70%)]" />
      </div>
      {photos.length > 1 && <div className="absolute top-3 inset-x-4 flex gap-1">{photos.map((_, i) => <span key={i} className={cn('h-[3px] flex-1 rounded-full', i === pi ? 'bg-white' : 'bg-white/40')} />)}</div>}
      {freeLabel && <span className="absolute top-6 left-4 h-8 pl-3 pr-3.5 rounded-full bg-[#fff]/85 backdrop-blur text-primary text-[12px] font-semibold flex items-center gap-1.5 v2:bg-lime-900/90 v2:text-lime-400 v2:border v2:border-lime-800"><Clock size={14} className="text-verify v2:text-lime-400" />{freeLabel}</span>}
      {!user.sample && user.affiliation.type === 'university' && user.affiliation.emailVerified && <span className="absolute top-6 right-4 h-8 w-8 rounded-full bg-[#fff]/85 backdrop-blur grid place-items-center v2:bg-surface/85"><BadgeCheck size={16} className="text-verify" /></span>}
      <div className="absolute inset-x-0 bottom-0 p-6 pointer-events-none">
        {user.sample && <span className="inline-flex mb-1.5 h-6 px-2.5 rounded-full bg-white/20 backdrop-blur text-[11px] font-semibold items-center">{lang === 'en' ? 'Sample profile' : '예시 프로필'}</span>}
        <div className="flex items-baseline gap-2"><h2 className="font-display text-[30px] leading-tight font-bold v2:font-extrabold v2:text-[28px]">{user.nickname}</h2><span className="text-[22px] opacity-90 v2:font-display v2:text-[20px] v2:opacity-60">{new Date().getFullYear() - user.birthYear + 1}</span></div>
        <div className="text-[15px] text-accent v2:text-ink-2 v2:text-[14px]">{dept}{gradYear(user) ? ` • ${user.affiliation.type === 'university' && user.affiliation.showSchool && user.affiliation.schoolName ? user.affiliation.schoolName.replace(/대학교|University|UC /g, '').trim() : ''} ${gradYear(user)}` : ''}</div>
        {plan ? (
          <div className="mt-2.5 rounded-2xl bg-white/15 backdrop-blur px-3.5 py-2.5 v2:bg-pink-900/90 v2:border v2:border-pink-800">
            <div className="flex items-center gap-2 text-[14px] font-semibold"><CalendarDays size={15} className="text-accent shrink-0 v2:text-pink-300" /><span className="truncate">{plan.title}</span></div>
            <div className="mt-0.5 pl-[23px] text-[12px] opacity-85 truncate">{[planWhen, plan.place.name, left > 0 && left <= 10 ? (lang === 'en' ? `${left} spot${left === 1 ? '' : 's'} left` : `${left}자리 남음`) : ''].filter(Boolean).join(' · ')}</div>
          </div>
        ) : (want || reason) && <div className="mt-2.5 inline-flex items-center gap-2 max-w-full h-9 px-3.5 rounded-full bg-white/15 backdrop-blur text-[13px] font-medium v2:bg-pink-900/90 v2:border v2:border-pink-800"><Zap size={15} className="text-accent shrink-0 v2:text-pink-300" /><span className="truncate">{want ?? reason?.text}</span></div>}
        {ground && (plan || want) && <div className="mt-2 flex items-center gap-1.5 text-[12.5px] font-medium opacity-90"><Users size={14} className="shrink-0 text-accent v2:text-lime-400" /><span className="truncate">{ground.text}</span></div>}
        <div className="mt-3 flex flex-wrap gap-1.5">{(common.length ? common : user.interests ?? []).slice(0, 3).map((i) => <span key={i} className="h-8 px-3.5 rounded-full bg-primary-soft text-primary text-[12px] font-semibold flex items-center v2:bg-surface-2/90 v2:text-ink v2:border v2:border-line">{INTEREST_LABELS[i]}</span>)}</div>
      </div>
    </article>
  );
}
