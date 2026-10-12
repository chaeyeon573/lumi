import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { AppHeader } from '@/components/layout/AppHeader';
import { AskBar } from '@/components/ai/AskBar';
import { Chip, CardSkeleton, EmptyState, ErrorState, Button, Avatar } from '@/components/ui';
import { SampleTag } from '@/components/ui/SampleTag';
import { OrgCard } from '@/components/cards/OrgCard';
import { OpenSlotSheet } from '@/components/social/OpenSlotSheet';
import { JoinButton } from '@/components/cards/JoinButton';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { nowActivities, ACTIVITY_CHIPS, TEAM_PURPOSE_CHIPS, teamItems, isTeamActivity } from '@core/lib/discover';
import { freeBlocks, todayIdx, fmtBlock, nowMin, toHHMM } from '@core/lib/timetable';
import { whosFree } from '@core/lib/social';
import { isTogetherType, daysUntil } from '@core/lib/recommend';
import { todayISO, formatTime, formatDate } from '@core/lib/format';
import { CATEGORY_LABELS, PERSON_ROLE_LABELS, CREW_TYPE_LABELS, OPP_TYPE_LABELS } from '@core/lib/labels';
import { dday } from '@core/lib/recommend';
import { cn } from '@core/lib/cn';
import type { Activity, Opportunity } from '@core/types';

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
  const nextFree = myFree[0] ? { start: Math.max(myFree[0].start, nowMin()), end: myFree[0].end } : null;
  const tabs: [Tab, string][] = [['now', lang === 'en' ? 'Now' : 'Now'], ['activities', t('활동')], ['teams', t('팀')]];

  return (
    <div className="min-h-full pb-8 bg-bg">
      <AppHeader />
      {status === 'loading' && <CardSkeleton />}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && (
        <div className="px-4">
          <AskBar className="mb-3" />
          <div className="h-12 rounded-full bg-surface-2 flex items-center pl-4 pr-1.5 gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="flex-1 text-[14px] text-primary font-medium truncate">{me.timetable.length === 0 ? t('시간표를 추가해보세요') : nextFree ? `${lang === 'en' ? 'Free' : '공강'} ${fmtBlock(nextFree)}` : t('오늘 수업 끝')}</span>
            <button onClick={() => (nextFree ? setSlot(nextFree) : nav('/timetable'))} className="h-9 px-4 rounded-full bg-primary text-white text-[13px] font-semibold flex items-center gap-1 press"><Plus size={14} />{nextFree ? t('열기') : t('시간표')}</button>
          </div>
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
  const left = (m: number) => (m >= 60 ? `${Math.round(m / 60)}h` : `${m}m`) + (lang === 'en' ? ' left' : ' 남음');
  return (
    <div>
      <div className="flex items-end justify-between mb-3"><h2 className="font-display text-[24px] font-bold text-primary">{lang === 'en' ? 'Free Right Now' : '지금 시간 되는 사람'}</h2><span className="text-[13px] text-ink-3">{free.length}{lang === 'en' ? ' friends' : '명'}</span></div>
      {free.length === 0 ? <p className="text-[13px] text-ink-3 mb-6">{t('지금 시간이 비는 사람이 없어요.')}</p> : (
        <div className="flex gap-4 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-7">
          {free.slice(0, 10).map((p) => (
            <button key={p.u.id} onClick={() => nav(`/users/${p.u.id}?propose=1&cat=${p.category ?? 'coffee'}`)} className="flex flex-col items-center gap-1.5 shrink-0 w-[68px]">
              <Avatar emoji={p.u.avatar.emoji} hue={p.u.avatar.hue} url={p.u.avatar.url} size={64} className="ring-2 ring-accent ring-offset-2" />
              <span className="text-[13px] font-semibold text-primary truncate max-w-full">{p.u.nickname}</span>
              <span className="text-[11px] text-ink-3 -mt-1">{left(p.minutes)}</span>
            </button>
          ))}
        </div>
      )}
      <h2 className="font-display text-[24px] font-bold text-primary mb-3">{lang === 'en' ? 'Spontaneous Hangouts' : '지금 열린 활동'}</h2>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-4">{NOW_CHIPS.map((c) => <Chip key={c.key} active={chip === c.key} onClick={() => setChip(c.key)}>{c.label}{c.key === 'all' ? ` (${list.length})` : ''}</Chip>)}</div>
      {shown.length === 0 ? (
        <EmptyState emoji="" title={t('이 시간에 열린 활동이 없어요')} action={<Button size="sm" onClick={() => nav('/create/activity?kind=personal&now=1')}>{t('즉석 만남')}</Button>} />
      ) : <div className="space-y-3">{shown.map(({ a }) => { const host = v.userById(a.hostId); return (
        <Row key={a.id} sample={a.sample} avatar={<button onClick={() => nav(`/activities/${a.id}`)}><Avatar emoji={host?.avatar.emoji ?? '👤'} hue={host?.avatar.hue ?? 200} url={host?.avatar.url} size={44} /></button>} title={a.title} sub={`${formatTime(a.startTime)} · ${a.place.name}`} action={<JoinButton activity={a} size="sm" label={t('참여')} className="bg-accent text-primary shadow-none" />} />
      ); })}</div>}
    </div>
  );
}

function ActivitiesTab() {
  const v = useViewer();
  const nav = useNavigate();
  const opps = useAppStore((s) => s.opportunities);
  const [chip, setChip] = useState('all');
  const f = ACTIVITY_CHIPS.find((c) => c.key === chip)!;
  const today = todayISO();
  const mySchool = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : '';
  const acts = v.visibleActivities.filter((a) => a.date >= today && !isTeamActivity(a) && a.category !== 'store_deal' && (!f.cats || f.cats.includes(a.category)));
  const together = opps.filter((o) => isTogetherType(o.type) && o.type !== 'activity' && (!o.schoolId || o.schoolId === mySchool) && (!o.date || o.date >= today) && (!o.deadline || daysUntil(o.deadline) >= 0) && (chip === 'all' || f.oppTypes?.includes(o.type)));
  type Item = { when: string; node: React.ReactNode };
  const items: Item[] = [
    ...acts.map((a): Item => ({ when: a.date + a.startTime, node: <ActivityRow key={`a_${a.id}`} a={a} /> })),
    ...together.map((o): Item => ({ when: (o.date ?? o.deadline ?? '9') + (o.startTime ?? ''), node: <OppRow key={`o_${o.id}`} o={o} /> })),
  ].sort((a, b) => a.when.localeCompare(b.when));
  return (
    <div>
      <h2 className="font-display text-[24px] font-bold text-primary mb-3">{lang === 'en' ? 'This Week' : '이번 주'}</h2>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-4">{ACTIVITY_CHIPS.map((c) => <Chip key={c.key} active={chip === c.key} onClick={() => setChip(c.key)}>{c.label}</Chip>)}</div>
      {items.length === 0 ? <EmptyState emoji="" title={t('예정된 활동이 없어요')} action={<Button size="sm" onClick={() => nav('/create/activity?kind=group')}>{t('활동 만들기')}</Button>} /> : <div className="space-y-3">{items.map((i) => i.node)}</div>}
    </div>
  );
}

function ActivityRow({ a }: { a: Activity }) {
  const v = useViewer(); const nav = useNavigate();
  const host = v.userById(a.hostId); const org = a.orgId ? v.orgById(a.orgId) : undefined;
  const av = org ? org.logo : host?.avatar ?? { emoji: '👤', hue: 200 };
  return <Row sample={a.sample} avatar={<button onClick={() => nav(`/activities/${a.id}`)}><Avatar emoji={av.emoji} hue={av.hue} url={av.url} size={44} /></button>} title={a.title} sub={`${formatDate(a.date)} ${formatTime(a.startTime)} · ${CATEGORY_LABELS[a.category]}`} action={<JoinButton activity={a} size="sm" label={t('참여')} className="bg-accent text-primary shadow-none" />} />;
}
function OppRow({ o }: { o: Opportunity }) {
  const nav = useNavigate();
  return <Row avatar={<span className="h-11 w-11 rounded-full bg-primary-soft text-primary grid place-items-center text-[13px] font-bold">{OPP_TYPE_LABELS[o.type].slice(0, 2)}</span>} title={o.title} sub={`${o.date ? formatDate(o.date) : ''}${o.deadline ? ` · ${dday(o.deadline)}` : ''}`} action={<Button size="sm" variant="secondary" onClick={() => nav(`/opportunities/${o.id}`)}>{t('보기')}</Button>} />;
}

function TeamsTab() {
  const v = useViewer();
  const nav = useNavigate();
  const orgs = useAppStore((s) => s.organizations);
  const opps = useAppStore((s) => s.opportunities);
  const [purpose, setPurpose] = useState('all');
  const mySchool = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : '';
  const items = useMemo(() => teamItems(v.visibleActivities, opps.filter((o) => !o.schoolId || o.schoolId === mySchool), orgs.filter((o) => o.schoolId === mySchool), v.me.id, v.approvedCount), [v, opps, orgs, mySchool]);
  const shown = items.filter((i) => purpose === 'all' || i.purpose === purpose);
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
      <span className="hidden">{toHHMM(0)}</span>
    </div>
  );
}
