import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { AppHeader } from '@/components/layout/AppHeader';
import { Chip, CardSkeleton, EmptyState, ErrorState, Button, Avatar } from '@/components/ui';
import { SampleTag } from '@/components/ui/SampleTag';
import { OrgCard } from '@/components/cards/OrgCard';
import { OpenSlotSheet } from '@/components/social/OpenSlotSheet';
import { JoinButton } from '@/components/cards/JoinButton';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { nowActivities, ACTIVITY_CHIPS, TEAM_PURPOSE_CHIPS, teamItems, isTeamActivity } from '@core/lib/discover';
import { freeBlocks, todayIdx, fmtBlock, nowMin, toHHMM, toMin, statusNow, statusLabel } from '@core/lib/timetable';
import { whosFree } from '@core/lib/social';
import { isTogetherType, daysUntil } from '@core/lib/recommend';
import { todayISO, formatTime, formatDate } from '@core/lib/format';
import { CATEGORY_LABELS, PERSON_ROLE_LABELS, CREW_TYPE_LABELS, OPP_TYPE_LABELS } from '@core/lib/labels';
import { dday } from '@core/lib/recommend';
import { cn } from '@core/lib/cn';
import { RidesEntry } from '@/components/rides/RideBits';
import type { Activity, Opportunity } from '@core/types';
import { PeopleLine } from '@/components/together/PeopleLine';
import { LiveCards } from '@/components/campus/LiveCards';
import { AskFriendsCard } from '@/components/plans/AskFriendsCard';
import { campusDate } from '@core/lib/listings';

type Tab = 'now' | 'activities' | 'teams';

/** 발견 — Free Right Now + Spontaneous Hangouts (Pastel Breeze) */
export function DiscoverPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') ?? 'now') as Tab;
  const setTab = (tb: Tab) => setParams(tb === 'now' ? {} : { tab: tb }, { replace: true });
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const v = useViewer();
  const me = v.me;
  const [slot, setSlot] = useState<{ start: number; end: number } | null>(null);
  const today = todayIdx();
  const myFree = freeBlocks(me.timetable, today).filter((b) => b.end > nowMin());
  // 지금 수업 중이면 다음 공강 — 초록 점 + “Free 3 PM–9 PM” 은 지금 비어 있는 것처럼 읽혔다.
  // 아침 첫 수업 전(시간표 칸은 9시부터)은 수업 중이 아니다 — 시간표 화면처럼 “Free until 10 AM”
  const inClassNow = me.timetable.some((c) => c.day === today && toMin(c.start) <= nowMin() && nowMin() < toMin(c.end));
  const freeLater = !!myFree[0] && myFree[0].start > nowMin() && inClassNow;
  const nextFree = myFree[0] ? { start: freeLater ? myFree[0].start : nowMin(), end: myFree[0].end } : null;
  // 다음 수업이 있는 공강이면 시간표와 같은 말 — “Free until 12 PM” (Discover 만 “Free 11:20 AM–12 PM” 이던 것)
  const nowStatus = statusNow(me.timetable);
  // 오늘 수업이 하나도 없으면(주말 등) “Next free 9 AM–9 PM” 대신 “No classes today” — 시간표 화면과 같은 말
  const noClassToday = me.timetable.length > 0 && !me.timetable.some((c) => c.day === today);
  const tabs: [Tab, string][] = [['now', lang === 'en' ? 'Now' : 'Now'], ['activities', t('활동')], ['teams', t('팀')]];

  return (
    <div className="min-h-full pb-8 bg-bg">
      <AppHeader />
      {status === 'loading' && <CardSkeleton />}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && (
        <div className="px-4 pt-3">
          <div className="h-12 rounded-full bg-surface-2 flex items-center pl-4 pr-1.5 gap-2">
            <span className={cn('h-2 w-2 rounded-full', freeLater && !noClassToday ? 'bg-ink-3' : 'bg-primary')} />
            <span className="flex-1 text-[14px] text-primary font-medium truncate">{me.timetable.length === 0 ? t('시간표를 추가해보세요') : noClassToday && nextFree ? t('오늘 수업 없음') : nextFree && !freeLater && nowStatus.kind === 'free' && nowStatus.until ? statusLabel(nowStatus) : nextFree ? `${lang === 'en' ? (freeLater ? 'Next free' : 'Free') : (freeLater ? '다음 공강' : '공강')} ${fmtBlock(nextFree)}` : t('오늘 수업 끝')}</span>
            {/* 시간표가 없으면 '하루 종일 빔'으로 계산돼 "열기"가 떴다 — 문구("시간표를 추가해보세요")와 맞게 시간표로 */}
            <button onClick={() => (me.timetable.length && nextFree ? setSlot(nextFree) : nav('/timetable'))} className="h-9 px-4 rounded-full bg-primary text-white text-[13px] font-semibold flex items-center gap-1 press"><Plus size={14} />{me.timetable.length === 0 ? (lang === 'en' ? 'Add' : '추가') : nextFree ? t('열기') : t('시간표')}</button>
          </div>
          <RidesEntry className="mt-3" />
          <AskFriendsCard className="mt-3" />
          <div className="mt-3 flex bg-surface-2 rounded-full p-1">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={cn('flex-1 h-9 rounded-full text-[13px] font-semibold transition', tab === k ? 'bg-surface text-primary shadow-sm' : 'text-ink-3')}>{l}</button>)}</div>
          <div className="pt-5">
            {tab === 'now' && <NowTab />}
            {tab === 'activities' && <ActivitiesTab />}
            {tab === 'teams' && <TeamsTab />}
          </div>
        </div>
      )}
      <OpenSlotSheet open={!!slot} onClose={() => setSlot(null)} day={today} block={slot} />
    </div>
  );
}

function Row({ avatar, title, sub, action, sample }: { avatar: React.ReactNode; title: string; sub: string; action: React.ReactNode; sample?: boolean }) {
  return (
    <div className="card rounded-full pl-2.5 pr-2.5 py-2 flex items-center gap-3">
      {avatar}
      <span className="flex-1 min-w-0"><span className="block text-[15px] font-semibold text-primary truncate">{sample && <SampleTag />}{title}</span><span className="block text-[13px] text-ink-2 truncate">{sub}</span></span>
      {action}
    </div>
  );
}

const NOW_CHIPS = [{ key: 'all', label: t('전체'), cats: null }, { key: 'coffee', label: t('커피'), cats: ['coffee'] }, { key: 'meal', label: t('점심'), cats: ['meal'] }, { key: 'study', label: t('공부'), cats: ['study', 'seminar'] }, { key: 'etc', label: t('기타'), cats: ['exercise', 'etc', 'club', 'performance', 'networking', 'school_event'] }] as const;

function NowTab() {
  const v = useViewer();
  const nav = useNavigate();
  const orgs = useAppStore((s) => s.organizations);
  const [chip, setChip] = useState<string>('all');
  const list = useMemo(() => nowActivities(v.visibleActivities, v.me.id), [v]);
  const cats = NOW_CHIPS.find((c) => c.key === chip)!.cats as readonly string[] | null;
  const shown = list.filter((x) => !cats || cats.includes(x.a.category));
  const snap = useMemo(() => ({ ...v.snap, organizations: orgs }), [v.snap, orgs]);
  const free = useMemo(() => whosFree(snap, v.me, (u) => v.canSeeField(u, 'timetable')), [snap, v]);
  const left = (m: number) => (lang === 'en' ? (m >= 60 ? `${Math.round(m / 60)}h` : `${m}m`) + ' left' : (m >= 60 ? `${Math.round(m / 60)}시간` : `${m}분`) + ' 남음');
  return (
    <div>
      <LiveCards className="mb-6" />
      {/* 사람이 실제로 있을 때만 사람 줄 (PRODUCT_TASTE — "0 friends · No one is free" 빈자리 줄을 두지 않는다) */}
      {free.length > 0 && <>
        <div className="flex items-end justify-between mb-3"><h2 className="font-display text-[24px] font-bold text-primary">{lang === 'en' ? 'Free Right Now' : '지금 시간 되는 사람'}</h2><span className="text-[13px] text-ink-3">{free.length}{lang === 'en' ? (free.length === 1 ? ' friend' : ' friends') : '명'}</span></div>
        <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-7">
          {free.slice(0, 10).map((p) => (
            <button key={p.u.id} onClick={() => nav(`/users/${p.u.id}?propose=1&cat=${p.category ?? 'coffee'}`)} className="flex flex-col items-center gap-1.5 shrink-0 w-[68px]">
              <Avatar emoji={p.u.avatar.emoji} hue={p.u.avatar.hue} url={p.u.avatar.url} size={64} className="ring-2 ring-accent ring-offset-2" />
              <span className="text-[13px] font-semibold text-primary truncate max-w-full">{p.u.nickname}</span>
              {p.u.sample && <SampleTag className="h-4 mr-0 px-1 text-[9px] -mt-1" />}
              {/* 끝나는 시각을 알 때만 ‘4h left’ — 모를 때 minutes 는 정렬용 자리값(240·300·60)이라 그대로 쓰면 지어낸 숫자가 된다 */}
              {p.until ? <span className="text-[11px] text-ink-3 -mt-1">{left(p.minutes)}</span> : null}
            </button>
          ))}
        </div>
      </>}
      <h2 className="font-display text-[24px] font-bold text-primary mb-3">{lang === 'en' ? 'Spontaneous Hangouts' : '지금 열린 활동'}</h2>
      {/* 하나도 없으면 "All (0)" 칩 줄 없이 문장 하나 + 버튼 */}
      {list.length > 0 && <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-4">{NOW_CHIPS.map((c) => <Chip key={c.key} active={chip === c.key} onClick={() => setChip(c.key)}>{c.label}{c.key === 'all' ? ` (${list.length})` : ''}</Chip>)}</div>}
      {shown.length === 0 ? (
        <EmptyState emoji="" className="py-8" title={t('이 시간에 열린 활동이 없어요')} action={<Button size="sm" onClick={() => nav('/create/activity?kind=personal&now=1')}>{t('즉석 만남')}</Button>} />
      ) : <div className="space-y-3">{shown.map(({ a }) => { const host = v.userById(a.hostId); return (
        <Row key={a.id} sample={a.sample} avatar={<button onClick={() => nav(`/activities/${a.id}`)}><Avatar emoji={host?.avatar.emoji ?? '👤'} hue={host?.avatar.hue ?? 200} url={host?.avatar.url} size={44} /></button>} title={a.title} sub={`${formatTime(a.startTime)} · ${a.place.name}`} action={<JoinButton activity={a} size="sm" label={t('참여')} className="bg-accent text-primary shadow-none" />} />
      ); })}</div>}
    </div>
  );
}

/** 날짜 묶음 — 오늘 · 내일 · 이번 주 · 그 뒤 */
type Bucket = 'today' | 'tomorrow' | 'week' | 'later';
const BUCKETS: [Bucket, string, string][] = [['today', 'Today', '오늘'], ['tomorrow', 'Tomorrow', '내일'], ['week', 'This week', '이번 주'], ['later', 'Coming up', '그 뒤']];
/** 묶음마다 처음에 보여줄 개수 — 나머지는 "모두 보기" */
const BUCKET_CAP = 4;
/** 맨 위 몇 개만 아무도 없어도 버튼을 남긴다 (줄마다 버튼이 붙으면 목록이 시끄럽다) */
const CTA_ROWS = 3;
const dayDiff = (iso: string, today: string) => Math.round((Date.parse(`${iso}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000);
const bucketOf = (d: number): Bucket => (d <= 0 ? 'today' : d === 1 ? 'tomorrow' : d <= 6 ? 'week' : 'later');

function ActivitiesTab() {
  const v = useViewer();
  const nav = useNavigate();
  const opps = useAppStore((s) => s.opportunities);
  const [chip, setChip] = useState('all');
  const [open, setOpen] = useState<Partial<Record<Bucket, boolean>>>({});
  const f = ACTIVITY_CHIPS.find((c) => c.key === chip)!;
  const today = todayISO();
  const mySchool = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : '';
  const acts = v.visibleActivities.filter((a) => a.date >= today && !isTeamActivity(a) && a.category !== 'store_deal' && (!f.cats || f.cats.includes(a.category)));
  // 날짜는 캠퍼스 날짜로 비교 — “2026-10-24T06:59Z”(= 10/23 밤 PT)를 문자열로 비교하면 어제 행사가 ‘Today’ 칸에 “Fri, Oct 23” 으로 남았다
  const together = opps.filter((o) => isTogetherType(o.type) && o.type !== 'activity' && (!o.schoolId || o.schoolId === mySchool) && (!o.date || campusDate(o.date) >= today) && (!o.deadline || daysUntil(o.deadline) >= 0) && (chip === 'all' || f.oppTypes?.includes(o.type)));
  // 시간이 정해진 것이 먼저 — 하루 종일·시간 미정은 그날 묶음 맨 뒤로
  const timed = (t?: string) => !!t && t !== '00:00';
  type Item = { key: string; day: string; timed: boolean; time: string; a?: Activity; o?: Opportunity };
  const items: Item[] = [
    ...acts.map((a): Item => ({ key: `a_${a.id}`, day: a.date, timed: timed(a.startTime), time: a.startTime, a })),
    ...together.map((o): Item => ({ key: `o_${o.id}`, day: o.date ? campusDate(o.date) : (o.deadline ? campusDate(o.deadline) : '9999'), timed: timed(o.startTime), time: o.startTime ?? '', o })),
  ]
    // 오늘 이미 시작한 지 한 시간이 넘은 것은 뺀다 — 저녁에 '오늘' 맨 위에 아침 8:30 행사가 남아 있으면 이상하다
    .filter((i) => !(i.day === today && i.timed && toMin(i.time) < nowMin() - 60))
    .sort((x, y) => x.day.localeCompare(y.day) || Number(y.timed) - Number(x.timed) || x.time.localeCompare(y.time));
  const groups = BUCKETS.map(([b, en, ko]) => ({ b, label: lang === 'en' ? en : ko, list: items.filter((i) => bucketOf(dayDiff(i.day, today)) === b) })).filter((g) => g.list.length);
  let ctaLeft = CTA_ROWS;
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-2">{ACTIVITY_CHIPS.map((c) => <Chip key={c.key} active={chip === c.key} onClick={() => setChip(c.key)}>{c.label}</Chip>)}</div>
      {groups.length === 0 ? <EmptyState emoji="" title={t('예정된 활동이 없어요')} action={<Button size="sm" onClick={() => nav('/create/activity?kind=group')}>{t('활동 만들기')}</Button>} /> : groups.map((g) => {
        const shown = open[g.b] ? g.list : g.list.slice(0, BUCKET_CAP);
        return (
          <section key={g.b} className="mt-4">
            <div className="flex items-end justify-between mb-2.5">
              <h2 className="font-display text-[20px] font-bold text-primary">{g.label}</h2>
              <span className="text-[12px] text-ink-3">{g.list.length}</span>
            </div>
            <div className="space-y-3">{shown.map((i) => i.a ? <ActivityRow key={i.key} a={i.a} /> : <OppRow key={i.key} o={i.o!} quiet={!(g.b === 'today' || g.b === 'tomorrow') || ctaLeft-- <= 0} />)}</div>
            {g.list.length > BUCKET_CAP && (
              <button onClick={() => setOpen((s) => ({ ...s, [g.b]: !s[g.b] }))} className="mt-2.5 w-full h-10 rounded-full bg-surface-2 text-[13px] font-semibold text-ink-2 press">
                {open[g.b] ? (lang === 'en' ? 'Show less' : '접기') : (lang === 'en' ? `See all ${g.list.length}` : `${g.list.length}개 모두 보기`)}
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}

function ActivityRow({ a }: { a: Activity }) {
  const v = useViewer(); const nav = useNavigate();
  const host = v.userById(a.hostId); const org = a.orgId ? v.orgById(a.orgId) : undefined;
  const av = org ? org.logo : host?.avatar ?? { emoji: '👤', hue: 200 };
  return <Row sample={a.sample} avatar={<button onClick={() => nav(`/activities/${a.id}`)}><Avatar emoji={av.emoji} hue={av.hue} url={av.url} size={44} /></button>} title={a.title} sub={`${formatDate(a.date)} ${formatTime(a.startTime)} · ${CATEGORY_LABELS[a.category]}`} action={<JoinButton activity={a} size="sm" label={t('참여')} className="bg-accent text-primary shadow-none" />} />;
}
/** 공고 카드 — 제목 아래에 누가 함께하는지와 버튼 하나 (같이 가기·같이 준비·팀원 찾기) */
function OppRow({ o, quiet = true }: { o: Opportunity; quiet?: boolean }) {
  const nav = useNavigate();
  // 이미 시작한 기간(해커톤 제출 기간 등)의 시작일은 지난 날짜라 헷갈린다 — 마감이 있으면 D-day 만 보인다
  const day = o.date ? campusDate(o.date) : '';
  const showDate = day && !(o.deadline && day < todayISO());
  return (
    <div className="card rounded-[24px] px-3 py-2.5">
      <button onClick={() => nav(`/opportunities/${o.id}`)} className="w-full flex items-center gap-3 text-left">
        {/* 종류 이름 앞 두 글자('Ca', 'Ha')는 뜻이 없다 — 공고마다 붙은 이모지(🎪 행사, 💡 해커톤…)를 쓴다 */}
        <span className={cn('h-11 w-11 rounded-full bg-primary-soft text-primary grid place-items-center font-bold shrink-0', o.cover?.emoji ? 'text-[20px]' : 'text-[13px]')}>{o.cover?.emoji || OPP_TYPE_LABELS[o.type].slice(0, 2)}</span>
        <span className="flex-1 min-w-0"><span className="block text-[15px] font-semibold text-primary truncate">{o.title}</span><span className="block text-[13px] text-ink-2 truncate">{[showDate ? `${formatDate(day)}${o.startTime && o.startTime !== '00:00' ? ` ${formatTime(o.startTime)}` : ''}` : '', o.deadline ? dday(o.deadline) : '', o.place?.name ?? ''].filter(Boolean).join(' · ')}</span></span>
      </button>
      <PeopleLine o={o} quiet={quiet} className="pl-[56px]" />
    </div>
  );
}

const OPP_CAP = 3;
function TeamsTab() {
  const v = useViewer();
  const nav = useNavigate();
  const orgs = useAppStore((s) => s.organizations);
  const opps = useAppStore((s) => s.opportunities);
  const [purpose, setPurpose] = useState('all');
  const mySchool = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : '';
  const items = useMemo(() => teamItems(v.visibleActivities, opps.filter((o) => !o.schoolId || o.schoolId === mySchool), orgs.filter((o) => o.schoolId === mySchool), v.me.id, v.approvedCount), [v, opps, orgs, mySchool]);
  // 사람(팀원 모집·크루·동아리)이 먼저, 공고(해커톤 등)는 마감 가까운 순 — '전체'에서는 3개만 보이고 나머지는 Campus 로
  const deadlineOf = (i: (typeof items)[number]) => (i.kind === 'opp' ? i.opp.deadline ?? '9999' : '');
  const filtered = items.filter((i) => purpose === 'all' || i.purpose === purpose);
  const people = filtered.filter((i) => i.kind !== 'opp');
  const listings = filtered.filter((i) => i.kind === 'opp' && i.open).sort((x, y) => deadlineOf(x).localeCompare(deadlineOf(y)));
  const shown = [...people, ...(purpose === 'all' ? listings.slice(0, OPP_CAP) : listings)];
  const more = purpose === 'all' ? listings.length - OPP_CAP : 0;
  return (
    <div>
      <h2 className="font-display text-[24px] font-bold text-primary mb-3">{lang === 'en' ? 'Teams & Crews' : '팀 · Study Crew'}</h2>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-4">{TEAM_PURPOSE_CHIPS.map((c) => <Chip key={c.key} active={purpose === c.key} onClick={() => setPurpose(c.key)}>{c.label}</Chip>)}</div>
      {shown.length === 0 ? <EmptyState emoji="" title={t('조건에 맞는 팀이 없어요')} action={<Button size="sm" onClick={() => nav('/create/activity?kind=group&team=1')}>{t('팀원 모집하기')}</Button>} />
        : <div className="space-y-3">{shown.map((i) => {
          if (i.kind === 'org') return <OrgCard key={i.id} org={i.org} />;
          if (i.kind === 'opp') return <OppRow key={i.id} o={i.opp} />;
          const a = i.activity; const host = v.userById(a.hostId);
          const sub = a.courseName ? `${a.courseName} · ${a.crewType ? CREW_TYPE_LABELS[a.crewType] : ''}` : (a.rolesNeeded ?? []).map((r) => PERSON_ROLE_LABELS[r]).join(' · ');
          return <Row key={i.id} avatar={<button onClick={() => nav(`/activities/${a.id}`)}><Avatar emoji={host?.avatar.emoji ?? '👤'} hue={host?.avatar.hue ?? 200} url={host?.avatar.url} size={44} /></button>} title={a.title} sub={`${formatDate(a.date)} ${formatTime(a.startTime)} · ${sub}`} action={<JoinButton activity={a} size="sm" label={t('참여')} className="bg-accent text-primary shadow-none" />} />;
        })}</div>}
      {more > 0 && <button onClick={() => nav('/community?tab=opportunities&sub=hackathon')} className="mt-3 w-full h-10 rounded-full bg-surface-2 text-[13px] font-semibold text-ink-2 press">{/* 숫자는 빼 둔다 — 여기는 팀원 모집 칸이 있는 공고만 세고(75), 가는 곳(Campus › 해커톤)은 해커톤을 다 센다(102) */}{lang === 'en' ? 'See all hackathons & competitions' : '해커톤·공모전 모두 보기'}</button>}
      <span className="hidden">{toHHMM(0)}</span>
    </div>
  );
}
