import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Users, BadgeCheck, MapPin, Clock, ChevronRight } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { AppHeader } from '@/components/layout/AppHeader';
import { Chip, CardSkeleton, EmptyState, ErrorState, Button, Avatar, Tag, Segmented, Cover } from '@/components/ui';
import { OpenSlotSheet } from '@/components/social/OpenSlotSheet';
import { JoinButton } from '@/components/cards/JoinButton';
import { SchoolBadge } from '@/components/people_SchoolBadge';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { nowActivities } from '@core/lib/discover';
import { freeBlocks, todayIdx, fmtBlock, nowMin } from '@core/lib/timetable';
import { todayISO, formatTime, formatDate } from '@core/lib/format';
import { recommendMeets, recommendGroups, myGroups, mySchedule, joinStateOf, GROUP_SCOPE_LABELS, GROUP_SCOPE_EMOJI, scopeOf } from '@core/lib/meet';
import { cityOf, sameSchool } from '@core/lib/network';
import type { Activity, Organization, GroupScope } from '@core/types';
import { MeetExtraRows } from './MeetExtras';

type Tab = 'recommend' | 'groups' | 'schedule';
/** 이전 주소(?tab=foryou|events|now)는 추천으로 */
const LEGACY_TABS: Record<string, Tab> = { foryou: 'recommend', events: 'recommend', now: 'recommend', recommend: 'recommend', groups: 'groups', schedule: 'schedule' };

/** 모임 — 추천 | 그룹 | 일정. 모임은 목적이 아니라 연결을 행동으로 잇는 수단이라 People 보다 가볍게 */
export function MeetPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab: Tab = LEGACY_TABS[params.get('tab') ?? 'recommend'] ?? 'recommend';
  const setTab = (tb: Tab) => setParams(tb === 'recommend' ? {} : { tab: tb }, { replace: true });
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const options: { value: Tab; label: string }[] = [{ value: 'recommend', label: t('추천') }, { value: 'groups', label: t('그룹') }, { value: 'schedule', label: t('일정') }];

  return (
    <div className="min-h-full pb-8 bg-bg">
      <AppHeader right={<button onClick={() => nav('/meet/create')} className="h-9 pl-3 pr-4 rounded-full bg-primary text-white text-[13px] font-semibold flex items-center gap-1 press shrink-0"><Plus size={16} />{t('만들기')}</button>} />
      {status === 'loading' && <CardSkeleton />}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && (
        <div className="px-4">
          <Segmented value={tab} onChange={setTab} options={options} />
          <div className="pt-4">
            {tab === 'recommend' && <RecommendTab />}
            {tab === 'groups' && <GroupsTab />}
            {tab === 'schedule' && <ScheduleTab go={setTab} />}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 공용 ──────────────────────────────────────────────────────────────────

function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <span className="text-[13px] font-semibold text-ink-3">{children}</span>
      {right}
    </div>
  );
}

const members = (o: Organization) => o.memberIds.length + o.adminIds.filter((a) => !o.memberIds.includes(a)).length;
const memberLabel = (n: number) => (lang === 'en' ? `${n} member${n === 1 ? '' : 's'}` : `${n}명`);

/** 그룹 성격 알약 — 학교 / 지역 · 도시 / 관심사 / 직업 */
function ScopePill({ org }: { org: Organization }) {
  const schools = useAppStore((s) => s.schools);
  const scope = scopeOf(org);
  const extra = scope === 'city' ? org.city : scope === 'school' ? schools.find((s) => s.id === org.schoolId)?.name : undefined;
  return <Tag tone="primary" className="h-5 text-[11px] shrink-0 max-w-[160px]"><span>{GROUP_SCOPE_EMOJI[scope]}</span><span className="truncate">{GROUP_SCOPE_LABELS[scope]}{extra ? ` · ${extra}` : ''}</span></Tag>;
}

/** 주최 한 줄 — 그룹 이름 또는 사람 + 학교 배지 */
function HostLine({ a }: { a: Activity }) {
  const v = useViewer();
  const host = v.userById(a.hostId);
  const org = a.orgId ? v.orgById(a.orgId) : undefined;
  if (a.official) return <span className="text-[12px] text-ink-3 truncate">{t('학교 공식')}</span>;
  if (org) return <span className="text-[12px] text-ink-3 truncate flex items-center gap-1"><Avatar emoji={org.logo.emoji} hue={org.logo.hue} url={org.logo.url} size={16} /><span className="truncate">{org.name}</span></span>;
  if (!host) return null;
  return <span className="text-[12px] text-ink-3 truncate flex items-center gap-1.5"><span className="truncate">{host.nickname}</span><span className="text-line">·</span><SchoolBadge user={host} size="sm" className="text-[11px]" /></span>;
}

/** 추천 모임 카드 — cover · 제목 · 주최 · 일시 · 장소 · n/m · 이유 · [참여] */
function MeetCard({ a, reason }: { a: Activity; reason: string }) {
  const v = useViewer();
  const nav = useNavigate();
  const count = v.approvedCount(a.id);
  const open = () => nav(`/activities/${a.id}`);
  const place = [a.place.name, a.place.area].filter(Boolean).join(' · ');
  return (
    <div className="card p-3 flex gap-3">
      <button onClick={open} className="shrink-0"><Cover emoji={a.cover.emoji} hue={a.cover.hue} url={a.cover.url} className="h-[76px] w-[76px] rounded-2xl" size={30} /></button>
      <div className="flex-1 min-w-0">
        <button onClick={open} className="block w-full text-left">
          <span className="block text-[15px] font-bold text-primary truncate">{a.title}</span>
          <HostLine a={a} />
          <span className="block text-[12px] text-ink-2 truncate mt-0.5"><Clock size={11} className="inline mr-1 -mt-0.5 text-ink-3" />{formatDate(a.date)} · {formatTime(a.startTime)}</span>
          <span className="block text-[12px] text-ink-2 truncate"><MapPin size={11} className="inline mr-1 -mt-0.5 text-ink-3" />{place}</span>
        </button>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-[12px] text-ink-3 truncate flex items-center gap-1 min-w-0"><Users size={11} className="shrink-0" />{count}/{a.capacity >= 999 ? '∞' : a.capacity} {t('참여')}<span className="text-line">·</span><span className="truncate text-primary font-medium">{reason}</span></span>
          <JoinButton activity={a} size="sm" label={t('참여')} className="shrink-0" />
        </div>
      </div>
    </div>
  );
}

/** 그룹 카드 — 로고 · 이름 · 성격 알약 · 인원 · 한 줄 소개 · 이유 · [가입] */
function GroupCard({ org, reason }: { org: Organization; reason?: string }) {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [busy, setBusy] = useState(false);
  const member = org.memberIds.includes(v.me.id) || org.adminIds.includes(v.me.id);
  const applied = org.applicantIds.includes(v.me.id);
  const open = () => nav(`/orgs/${org.id}`);
  const join = async () => {
    setBusy(true);
    try { await run(() => api.orgs.apply(org.id, v.me.id), org.joinPolicy === 'open' ? t('그룹에 가입했어요.') : t('가입 신청을 보냈어요.')); } catch { /* toast */ } finally { setBusy(false); }
  };
  return (
    <div className="card p-3 flex items-start gap-3">
      <button onClick={open} className="shrink-0"><Avatar emoji={org.logo.emoji} hue={org.logo.hue} url={org.logo.url} size={52} className="!rounded-2xl" /></button>
      <button onClick={open} className="flex-1 min-w-0 text-left">
        <span className="flex items-center gap-1.5"><span className="text-[15px] font-bold text-primary truncate">{org.name}</span>{org.verified && <BadgeCheck size={14} className="text-gold shrink-0" />}</span>
        <span className="flex items-center gap-1.5 mt-0.5"><ScopePill org={org} /><span className="text-[12px] text-ink-3 shrink-0">{memberLabel(members(org))}</span></span>
        <span className="block text-[13px] text-ink-2 truncate mt-1">{org.description}</span>
        {reason && <span className="block text-[12px] text-primary font-medium truncate mt-0.5">{reason}</span>}
      </button>
      {member ? <Tag tone="mint" className="shrink-0 mt-1">{t('가입됨')}</Tag>
        : applied ? <Button size="sm" variant="outline" className="shrink-0 mt-1" disabled>{t('신청됨')}</Button>
        : <Button size="sm" className="shrink-0 mt-1" loading={busy} onClick={join}>{t('가입')}</Button>}
    </div>
  );
}

// ─── 추천 ──────────────────────────────────────────────────────────────────

/** "지금" 스트립 — 공강 바(OpenSlotSheet) · 제휴 카드 · 지금 열린 만남. 있을 때만 */
function NowStrip() {
  const v = useViewer();
  const nav = useNavigate();
  const me = v.me;
  const [slot, setSlot] = useState<{ start: number; end: number } | null>(null);
  const today = todayIdx();
  const todayDate = todayISO();
  const myFree = freeBlocks(me.timetable, today).filter((b) => b.end > nowMin());
  const nextFree = myFree[0] ? { start: Math.max(myFree[0].start, nowMin()), end: myFree[0].end } : null;
  const partner = v.visibleActivities.find((a) => a.category === 'store_deal' && a.partner && a.date === todayDate);
  const now = useMemo(() => nowActivities(v.visibleActivities, me.id).slice(0, 3), [v, me.id]);
  if (!nextFree && !partner && now.length === 0) return null;
  return (
    <section className="mb-5">
      <SectionLabel>{t('지금')}</SectionLabel>
      <div className="space-y-2">
        {nextFree && (
          <div className="h-12 rounded-full bg-surface-2 flex items-center pl-4 pr-1.5 gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            <span className="flex-1 text-[14px] text-primary font-medium truncate">{`${lang === 'en' ? 'Free' : '공강'} ${fmtBlock(nextFree)}`}</span>
            <button onClick={() => setSlot(nextFree)} className="h-9 px-4 rounded-full bg-primary text-white text-[13px] font-semibold flex items-center gap-1 press"><Plus size={14} />{t('열기')}</button>
          </div>
        )}
        {partner && (
          <button onClick={() => nav(`/activities/${partner.id}`)} className="w-full card rounded-full bg-gold-soft pl-2.5 pr-2.5 py-2 flex items-center gap-3 text-left press">
            <span className="h-11 w-11 rounded-full bg-white grid place-items-center text-[20px] shrink-0">🏷️</span>
            <span className="flex-1 min-w-0"><span className="flex items-center gap-2"><span className="text-[15px] font-semibold text-primary truncate">{partner.partner!.name}</span><Tag tone="gold">{t('제휴')}</Tag></span><span className="block text-[13px] text-ink-2 truncate">{partner.partner!.deal}</span></span>
            <span className="h-9 px-4 rounded-full bg-primary text-white text-[13px] font-semibold grid place-items-center shrink-0">{t('쿠폰 보기')}</span>
          </button>
        )}
        {now.map(({ a, inMin }) => <NowRow key={a.id} a={a} inMin={inMin} />)}
      </div>
      <OpenSlotSheet open={!!slot} onClose={() => setSlot(null)} day={today} block={slot} />
    </section>
  );
}

/** 지금 열린 만남 한 줄 — 제목·시간·장소·n명 참여 중 + 같이 가기 */
function NowRow({ a, inMin }: { a: Activity; inMin: number }) {
  const v = useViewer();
  const nav = useNavigate();
  const host = v.userById(a.hostId);
  const n = v.approvedCount(a.id) + 1;
  const when = inMin <= 0 ? t('진행 중') : inMin < 60 ? (lang === 'en' ? `in ${inMin} min` : `${inMin}분 후`) : formatTime(a.startTime);
  const open = () => nav(`/activities/${a.id}`);
  return (
    <div className="card rounded-full pl-2.5 pr-2.5 py-2 flex items-center gap-3">
      <button onClick={open} className="shrink-0"><Avatar emoji={host?.avatar.emoji ?? '👤'} hue={host?.avatar.hue ?? 200} url={host?.avatar.url} size={44} /></button>
      <button onClick={open} className="flex-1 min-w-0 text-left">
        <span className="block text-[15px] font-semibold text-primary truncate">{a.title}</span>
        <span className="block text-[13px] text-ink-2 truncate">{when} · {a.place.name} · {n}{t('명 참여 중')}</span>
      </button>
      <JoinButton activity={a} size="sm" label={t('같이 가기')} className="bg-accent text-primary shadow-none shrink-0" />
    </div>
  );
}

type RecChip = 'all' | 'school' | 'interest' | 'city';

function RecommendTab() {
  const nav = useNavigate();
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const participations = useAppStore((s) => s.participations);
  const [chip, setChip] = useState<RecChip>('all');
  const recs = useMemo(() => recommendMeets(v.visibleActivities, v.me, v.users, orgs, participations, 30), [v, orgs, participations]);
  const myCity = cityOf(v.me) ?? '';
  const interestWords = [t('하고 싶은 활동'), t('관심사')];
  const list = recs.filter((r) => {
    if (chip === 'school') { const h = v.userById(r.a.hostId); return !!h && sameSchool(h, v.me); }
    if (chip === 'interest') return interestWords.some((w) => r.reason.includes(w));
    if (chip === 'city') return !!myCity && r.reason.includes(myCity);
    return true;
  });
  const chips: { key: RecChip; label: string }[] = [{ key: 'all', label: t('전체') }, { key: 'school', label: t('내 학교') }, { key: 'interest', label: t('관심사') }, { key: 'city', label: myCity || t('지역') }];
  return (
    <div>
      <NowStrip />
      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-3">{chips.map((c) => <Chip key={c.key} active={chip === c.key} onClick={() => setChip(c.key)}>{c.label}</Chip>)}</div>
      {list.length === 0
        ? <EmptyState emoji="" title={t('찾는 활동을 설정하면 더 잘 맞아요')} description={recs.length > 0 ? t('이 조건에 맞는 모임이 아직 없어요.') : undefined} action={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => nav('/profile/wants')}>{t('설정')}</Button><Button size="sm" icon={<Plus size={14} />} onClick={() => nav('/meet/create')}>{t('모임 만들기')}</Button></div>} />
        : <div className="space-y-3">{list.map((r) => <MeetCard key={r.a.id} a={r.a} reason={r.reason} />)}</div>}
    </div>
  );
}

// ─── 그룹 ──────────────────────────────────────────────────────────────────

type GroupChip = 'all' | GroupScope;

function GroupsTab() {
  const nav = useNavigate();
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const [chip, setChip] = useState<GroupChip>('all');
  const mine = useMemo(() => myGroups(orgs, v.me), [orgs, v.me]);
  const recs = useMemo(() => recommendGroups(orgs, v.me, 8), [orgs, v.me]);
  const list = useMemo(() => {
    const recIds = new Set(recs.map((r) => r.o.id));
    const mineIds = new Set(mine.map((o) => o.id));
    const rest = orgs.filter((o) => !recIds.has(o.id) && !mineIds.has(o.id)).map((o) => ({ o, reason: undefined as string | undefined }));
    return [...recs.map((r) => ({ o: r.o, reason: r.reason as string | undefined })), ...rest].filter((x) => chip === 'all' || scopeOf(x.o) === chip);
  }, [orgs, recs, mine, chip]);
  const chips: { key: GroupChip; label: string }[] = [{ key: 'all', label: t('전체') }, ...(Object.keys(GROUP_SCOPE_LABELS) as GroupScope[]).map((k) => ({ key: k, label: GROUP_SCOPE_LABELS[k] }))];
  return (
    <div className="space-y-6">
      <section>
        <SectionLabel right={mine.length > 0 ? <button onClick={() => nav('/profile/groups')} className="text-[12px] font-semibold text-primary">{t('전체 보기')}</button> : undefined}>{t('내 그룹')}</SectionLabel>
        {mine.length === 0
          ? <div className="card px-4 py-3 text-[13px] text-ink-3">{t('아직 가입한 그룹이 없어요')}</div>
          : (
            <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4">
              {mine.map((o) => (
                <button key={o.id} onClick={() => nav(`/orgs/${o.id}`)} className="w-[92px] shrink-0 flex flex-col items-center text-center press">
                  <Avatar emoji={o.logo.emoji} hue={o.logo.hue} url={o.logo.url} size={56} className="!rounded-2xl" />
                  <span className="mt-1.5 text-[12px] font-semibold text-primary truncate w-full">{o.name}</span>
                  <span className="text-[11px] text-ink-3">{memberLabel(members(o))}</span>
                </button>
              ))}
            </div>
          )}
        <Button size="sm" variant="outline" className="mt-3" icon={<Plus size={14} />} onClick={() => nav('/groups/new')}>{t('그룹 만들기')}</Button>
      </section>
      <section>
        <SectionLabel>{t('그룹 찾기')}</SectionLabel>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-3">{chips.map((c) => <Chip key={c.key} active={chip === c.key} onClick={() => setChip(c.key)}>{c.label}</Chip>)}</div>
        {list.length === 0
          ? <EmptyState emoji="" title={t('그룹이 없어요')} description={t('원하는 그룹이 없다면 직접 만들어보세요.')} action={<Button size="sm" icon={<Plus size={14} />} onClick={() => nav('/groups/new')}>{t('그룹 만들기')}</Button>} />
          : <div className="space-y-3">{list.map((x) => <GroupCard key={x.o.id} org={x.o} reason={x.reason} />)}</div>}
      </section>
    </div>
  );
}

// ─── 일정 ──────────────────────────────────────────────────────────────────

function ScheduleRow({ a }: { a: Activity }) {
  const nav = useNavigate();
  const v = useViewer();
  const participations = useAppStore((s) => s.participations);
  const state = joinStateOf(a, v.me, participations);
  const label = state === 'host' ? t('주최') : state === 'pending' ? t('대기 중') : t('참여');
  return (
    <button onClick={() => nav(`/activities/${a.id}`)} className="w-full px-3.5 py-3 flex items-center gap-3 text-left press">
      <span className="w-[64px] shrink-0"><span className="block text-[12px] font-semibold text-primary truncate">{formatDate(a.date)}</span><span className="block text-[11px] text-ink-3">{formatTime(a.startTime)}</span></span>
      <span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold text-primary truncate">{a.title}</span><span className="block text-[12px] text-ink-3 truncate">{a.place.name}</span></span>
      <Tag tone={state === 'host' ? 'primary' : state === 'pending' ? 'neutral' : 'mint'} className="h-5 shrink-0">{label}</Tag>
      <ChevronRight size={16} className="text-ink-3 shrink-0" />
    </button>
  );
}

function ScheduleTab({ go }: { go: (tb: Tab) => void }) {
  const nav = useNavigate();
  const v = useViewer();
  const participations = useAppStore((s) => s.participations);
  const buckets = useMemo(() => mySchedule(v.visibleActivities, v.me, participations), [v, participations]);
  const total = buckets.reduce((n, b) => n + b.items.length, 0);
  return (
    <div className="space-y-6">
      {total === 0
        ? <EmptyState emoji="" title={t('아직 일정이 없어요')} action={<div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => go('recommend')}>{t('추천 모임 보기')}</Button><Button size="sm" icon={<Plus size={14} />} onClick={() => nav('/meet/create')}>{t('모임 만들기')}</Button></div>} />
        : (
          <div className="space-y-5">
            {buckets.filter((b) => b.items.length > 0).map((b) => (
              <section key={b.key}>
                <SectionLabel>{b.label} <span className="text-ink-3 font-normal">{b.items.length}</span></SectionLabel>
                <div className="card divide-y divide-line">{b.items.map((a) => <ScheduleRow key={a.id} a={a} />)}</div>
              </section>
            ))}
            <Button size="sm" variant="outline" icon={<Plus size={14} />} onClick={() => nav('/meet/create')}>{t('모임 만들기')}</Button>
          </div>
        )}
      <section>
        <SectionLabel>{t('더 할 수 있는 것')}</SectionLabel>
        <MeetExtraRows />
      </section>
    </div>
  );
}
