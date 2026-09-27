import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Vote, Users, BadgeCheck } from 'lucide-react';
import { t, lang } from '@core/i18n';
import { AppHeader } from '@/components/layout/AppHeader';
import { Chip, CardSkeleton, EmptyState, ErrorState, Button, Avatar, Tag, Segmented, Cover } from '@/components/ui';
import { OpenSlotSheet } from '@/components/social/OpenSlotSheet';
import { JoinButton } from '@/components/cards/JoinButton';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { nowActivities, ACTIVITY_CHIPS, isTeamActivity } from '@core/lib/discover';
import { freeBlocks, todayIdx, fmtBlock, nowMin } from '@core/lib/timetable';
import { todayISO, formatTime, formatDate } from '@core/lib/format';
import { ORG_TYPE_LABELS } from '@core/lib/labels';
import type { Activity, Organization, OrganizationType } from '@core/types';

type Tab = 'foryou' | 'groups' | 'events' | 'now';

/** Meet — For You | Groups | Events | Now (Pastel Breeze). 만들기는 헤더 오른쪽 + Create */
export function MeetPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') ?? 'foryou') as Tab;
  const setTab = (tb: Tab) => setParams(tb === 'foryou' ? {} : { tab: tb }, { replace: true });
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const options: { value: Tab; label: string }[] = [{ value: 'foryou', label: t('추천') }, { value: 'groups', label: t('그룹') }, { value: 'events', label: t('이벤트') }, { value: 'now', label: t('지금') }];

  return (
    <div className="min-h-full pb-8 bg-bg">
      <AppHeader right={<button onClick={() => nav('/meet/create')} className="h-9 pl-3 pr-4 rounded-full bg-primary text-white text-[13px] font-semibold flex items-center gap-1 press shrink-0"><Plus size={16} />{t('만들기')}</button>} />
      {status === 'loading' && <CardSkeleton />}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && (
        <div className="px-4">
          <Segmented value={tab} onChange={setTab} options={options} />
          <div className="pt-5">
            {tab === 'foryou' && <ForYouTab go={setTab} />}
            {tab === 'groups' && <GroupsTab />}
            {tab === 'events' && <EventsTab />}
            {tab === 'now' && <NowTab />}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 공용 ──────────────────────────────────────────────────────────────────

function useMeetData() {
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const mySchool = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : '';
  const today = todayISO();
  const inOrg = (o: Organization) => o.memberIds.includes(v.me.id) || o.adminIds.includes(v.me.id) || o.followerIds.includes(v.me.id);
  const byRecruiting = (a: Organization, b: Organization) => Number(!!b.recruitment?.open) - Number(!!a.recruitment?.open);
  const recommendedOrgs = useMemo(() => orgs.filter((o) => o.schoolId === mySchool && !inOrg(o) && !o.applicantIds.includes(v.me.id)).sort(byRecruiting), [orgs, mySchool, v]);
  const events = useMemo(() => v.visibleActivities.filter((a) => a.date >= today && !isTeamActivity(a) && a.category !== 'store_deal').sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)), [v, today]);
  const now = useMemo(() => nowActivities(v.visibleActivities, v.me.id).map((x) => x.a), [v]);
  const partner = v.visibleActivities.find((a) => a.category === 'store_deal' && a.partner && a.date === today);
  return { v, orgs, mySchool, inOrg, byRecruiting, recommendedOrgs, events, now, partner };
}

function SectionLabel({ children, onMore }: { children: React.ReactNode; onMore?: () => void }) {
  return (
    <div className="flex items-center justify-between mb-2.5">
      <span className="text-[13px] font-semibold text-ink-3">{children}</span>
      {onMore && <button onClick={onMore} className="text-[12px] font-semibold text-primary">{t('전체 보기')}</button>}
    </div>
  );
}

function PlanTogetherButton({ className }: { className?: string }) {
  const nav = useNavigate();
  return <Button size="sm" variant="outline" className={className} icon={<Vote size={14} />} onClick={() => nav('/together/new')}>{t('같이 계획하기')}</Button>;
}

/** 그룹 카드 — 로고·이름·종류·인원·한 줄 소개 + [가입] */
function GroupCard({ org }: { org: Organization }) {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [busy, setBusy] = useState(false);
  const member = org.memberIds.includes(v.me.id) || org.adminIds.includes(v.me.id);
  const applied = org.applicantIds.includes(v.me.id);
  const count = org.memberIds.length + org.followerIds.length;
  const open = () => nav(`/orgs/${org.id}`);
  const join = async () => {
    if (!org.recruitment?.open) return open();
    setBusy(true);
    try { await run(() => api.orgs.apply(org.id, v.me.id), t('지원서를 보냈어요.')); } catch { /* toast */ } finally { setBusy(false); }
  };
  return (
    <div className="card p-3 flex items-center gap-3">
      <button onClick={open} className="shrink-0"><Avatar emoji={org.logo.emoji} hue={org.logo.hue} url={org.logo.url} size={52} className="!rounded-2xl" /></button>
      <button onClick={open} className="flex-1 min-w-0 text-left">
        <span className="flex items-center gap-1.5"><span className="text-[15px] font-bold text-primary truncate">{org.name}</span>{org.verified && <BadgeCheck size={14} className="text-gold shrink-0" />}{org.recruitment?.open && <Tag tone="accent" className="h-5 shrink-0">{t('모집 중')}</Tag>}</span>
        <span className="block text-[12px] text-ink-3 mt-0.5">{ORG_TYPE_LABELS[org.type]} · {count}{lang === 'en' ? ' members' : '명'}</span>
        <span className="block text-[13px] text-ink-2 truncate mt-0.5">{org.description}</span>
      </button>
      {member ? <Tag tone="mint" className="shrink-0">{t('가입됨')}</Tag>
        : applied ? <Button size="sm" variant="outline" className="shrink-0" disabled>{t('신청됨')}</Button>
        : <Button size="sm" variant={org.recruitment?.open ? 'primary' : 'secondary'} className="shrink-0" loading={busy} onClick={join}>{t('가입')}</Button>}
    </div>
  );
}

/** 이벤트 카드 — 제목·주최·날짜·시간·장소·n/m 참여 + JoinButton(승인제면 "참가 신청") */
function EventCard({ a }: { a: Activity }) {
  const v = useViewer();
  const nav = useNavigate();
  const host = v.userById(a.hostId);
  const org = a.orgId ? v.orgById(a.orgId) : undefined;
  const hostName = a.official ? t('학교 공식') : org?.name ?? host?.nickname ?? '';
  const count = v.approvedCount(a.id);
  const open = () => nav(`/activities/${a.id}`);
  return (
    <div className="card p-3 flex gap-3">
      <button onClick={open} className="shrink-0"><Cover emoji={a.cover.emoji} hue={a.cover.hue} url={a.cover.url} className="h-[72px] w-[72px] rounded-2xl" size={30} /></button>
      <div className="flex-1 min-w-0">
        <button onClick={open} className="block w-full text-left">
          <span className="block text-[15px] font-bold text-primary truncate">{a.title}</span>
          <span className="block text-[12px] text-ink-3 truncate">{hostName}</span>
          <span className="block text-[12px] text-ink-2 truncate mt-0.5">{formatDate(a.date)} · {formatTime(a.startTime)} · {a.place.name}</span>
        </button>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <span className="text-[12px] text-ink-3 flex items-center gap-1"><Users size={11} />{count}/{a.capacity >= 999 ? '∞' : a.capacity} {t('참여')}</span>
          <JoinButton activity={a} size="sm" className="shrink-0" />
        </div>
      </div>
    </div>
  );
}

/** Now 한 줄 — 제목·장소·n명 참여 중 + 같이 가기 */
function NowRow({ a }: { a: Activity }) {
  const v = useViewer();
  const nav = useNavigate();
  const host = v.userById(a.hostId);
  const n = v.approvedCount(a.id) + 1;
  const open = () => nav(`/activities/${a.id}`);
  return (
    <div className="card rounded-full pl-2.5 pr-2.5 py-2 flex items-center gap-3">
      <button onClick={open} className="shrink-0"><Avatar emoji={host?.avatar.emoji ?? '👤'} hue={host?.avatar.hue ?? 200} url={host?.avatar.url} size={44} /></button>
      <button onClick={open} className="flex-1 min-w-0 text-left">
        <span className="block text-[15px] font-semibold text-primary truncate">{a.title}</span>
        <span className="block text-[13px] text-ink-2 truncate">{formatTime(a.startTime)} · {a.place.name} · {n}{t('명 참여 중')}</span>
      </button>
      <JoinButton activity={a} size="sm" label={t('같이 가기')} className="bg-accent text-primary shadow-none shrink-0" />
    </div>
  );
}

// ─── 탭 ────────────────────────────────────────────────────────────────────

function ForYouTab({ go }: { go: (tb: Tab) => void }) {
  const nav = useNavigate();
  const d = useMeetData();
  const groups = d.recommendedOrgs.slice(0, 2);
  const events = d.events.slice(0, 3);
  const now = d.now.slice(0, 2);
  if (groups.length === 0 && events.length === 0 && now.length === 0) {
    return <EmptyState emoji="" title={t('예정된 활동이 없어요')} action={<Button size="sm" icon={<Plus size={14} />} onClick={() => nav('/meet/create')}>{t('만들기')}</Button>} />;
  }
  return (
    <div className="space-y-7">
      {groups.length > 0 && (
        <section>
          <SectionLabel onMore={() => go('groups')}>{t('추천 그룹')}</SectionLabel>
          <div className="space-y-3">{groups.map((o) => <GroupCard key={o.id} org={o} />)}</div>
        </section>
      )}
      {events.length > 0 && (
        <section>
          <SectionLabel onMore={() => go('events')}>{t('다가오는 이벤트')}</SectionLabel>
          <div className="space-y-3">{events.map((a) => <EventCard key={a.id} a={a} />)}</div>
          <PlanTogetherButton className="mt-3" />
        </section>
      )}
      {now.length > 0 && (
        <section>
          <SectionLabel onMore={() => go('now')}>{t('지금 열린 만남')}</SectionLabel>
          <div className="space-y-3">{now.map((a) => <NowRow key={a.id} a={a} />)}</div>
        </section>
      )}
    </div>
  );
}

const GROUP_CHIPS: { key: OrganizationType | 'all' | 'mine'; label: string }[] = [
  { key: 'all', label: t('전체') }, { key: 'mine', label: t('내 그룹') }, { key: 'club', label: t('동아리') }, { key: 'council', label: t('학회·학생회') }, { key: 'lab', label: t('연구실') }, { key: 'greek', label: 'Greek' },
];

function GroupsTab() {
  const d = useMeetData();
  const [chip, setChip] = useState<typeof GROUP_CHIPS[number]['key']>('all');
  const list = d.orgs.filter((o) => chip === 'mine' ? d.inOrg(o) : (o.schoolId === d.mySchool || d.inOrg(o)) && (chip === 'all' || o.type === chip)).sort(d.byRecruiting);
  return (
    <div>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-4">{GROUP_CHIPS.map((c) => <Chip key={c.key} active={chip === c.key} onClick={() => setChip(c.key)}>{c.label}</Chip>)}</div>
      {list.length === 0 ? <EmptyState emoji="" title={t('그룹이 없어요')} /> : <div className="space-y-3">{list.map((o) => <GroupCard key={o.id} org={o} />)}</div>}
    </div>
  );
}

function EventsTab() {
  const nav = useNavigate();
  const d = useMeetData();
  const [chip, setChip] = useState('all');
  const f = ACTIVITY_CHIPS.find((c) => c.key === chip)!;
  const list = d.events.filter((a) => !f.cats || f.cats.includes(a.category));
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-[24px] font-bold text-primary">{t('다가오는 이벤트')}</h2>
        <PlanTogetherButton />
      </div>
      <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-4 px-4 mb-4">{ACTIVITY_CHIPS.map((c) => <Chip key={c.key} active={chip === c.key} onClick={() => setChip(c.key)}>{c.label}</Chip>)}</div>
      {list.length === 0 ? <EmptyState emoji="" title={t('이벤트가 없어요')} action={<Button size="sm" onClick={() => nav('/meet/create')}>{t('만들기')}</Button>} /> : <div className="space-y-3">{list.map((a) => <EventCard key={a.id} a={a} />)}</div>}
    </div>
  );
}

function NowTab() {
  const nav = useNavigate();
  const d = useMeetData();
  const me = d.v.me;
  const [slot, setSlot] = useState<{ start: number; end: number } | null>(null);
  const today = todayIdx();
  const myFree = freeBlocks(me.timetable, today).filter((b) => b.end > nowMin());
  const nextFree = myFree[0] ? { start: Math.max(myFree[0].start, nowMin()), end: myFree[0].end } : null;
  const partner = d.partner;
  return (
    <div>
      {/* 공강 바 — 지금 비는 시간이 있으면 바로 열기 */}
      <div className="h-12 rounded-full bg-surface-2 flex items-center pl-4 pr-1.5 gap-2 mb-4">
        <span className="h-2 w-2 rounded-full bg-primary" />
        <span className="flex-1 text-[14px] text-primary font-medium truncate">{me.timetable.length === 0 ? t('시간표를 추가해보세요') : nextFree ? `${lang === 'en' ? 'Free' : '공강'} ${fmtBlock(nextFree)}` : t('오늘 수업 끝')}</span>
        <button onClick={() => (nextFree ? setSlot(nextFree) : nav('/timetable'))} className="h-9 px-4 rounded-full bg-primary text-white text-[13px] font-semibold flex items-center gap-1 press"><Plus size={14} />{nextFree ? t('열기') : t('시간표')}</button>
      </div>
      {partner && (
        <button onClick={() => nav(`/activities/${partner.id}`)} className="w-full card rounded-full bg-gold-soft pl-2.5 pr-2.5 py-2 flex items-center gap-3 text-left mb-3 press">
          <span className="h-11 w-11 rounded-full bg-white grid place-items-center text-[20px] shrink-0">🏷️</span>
          <span className="flex-1 min-w-0"><span className="flex items-center gap-2"><span className="text-[15px] font-semibold text-primary truncate">{partner.partner!.name}</span><Tag tone="gold">{t('제휴')}</Tag></span><span className="block text-[13px] text-ink-2 truncate">{partner.partner!.deal}</span></span>
          <span className="h-9 px-4 rounded-full bg-primary text-white text-[13px] font-semibold grid place-items-center shrink-0">{t('쿠폰 보기')}</span>
        </button>
      )}
      {d.now.length === 0
        ? <EmptyState emoji="" title={t('지금 열린 만남이 없어요')} action={<Button size="sm" onClick={() => nav('/create/activity?kind=personal&now=1')}>{t('즉석 만남')}</Button>} />
        : <div className="space-y-3">{d.now.map((a) => <NowRow key={a.id} a={a} />)}</div>}
      <OpenSlotSheet open={!!slot} onClose={() => setSlot(null)} day={today} block={slot} />
    </div>
  );
}
