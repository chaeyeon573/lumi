import { listingIcon } from '@/lib/icons';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, CalendarClock, CalendarDays, Coffee, Dumbbell, Plus, Sparkles } from 'lucide-react';
import { lang } from '@core/i18n';
import type { Activity, Opportunity, User } from '@core/types';
import { api } from '@core/api';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { CATEGORY_LABELS, OPP_TYPE_LABELS } from '@core/lib/labels';
import { formatDate, formatTime, todayISO } from '@core/lib/format';
import { campusDate } from '@core/lib/listings';
import { BackHeader, PageTitle, SegTabs, SectionHeader, MeetupCard, ListingCard, RowCard, InfoNote, EmptyState, Btn, HeaderIcon, ErrorScreen, LoadingCards, CATEGORY_TONE, type Tone } from '@/components/ha';
import { pollSummary } from '@/pages/together/TogetherPage';

const en = lang === 'en';
type Tab = 'upcoming' | 'past' | 'created';
/** 약속 종류 → 색·아이콘 */
const LOOK: Record<string, { tone: Tone; Icon: typeof Coffee }> = {
  study: { tone: 'ice', Icon: BookOpen }, coffee: { tone: 'peach', Icon: Coffee }, meal: { tone: 'peach', Icon: Coffee }, exercise: { tone: 'mint', Icon: Dumbbell },
};
const GOING = new Set(['going', 'solo', 'company']);

/**
 * My Plans (PDF S031) — Upcoming · Past · Created (주소 ?tab=).
 *   Upcoming  시간을 정하는 중인 투표 · 확정된 약속(내가 열었거나 승인된 것) · 간다고 한 행사
 *   Past      지난 약속 · 다녀온 행사
 *   Created   내가 만든 투표와 약속
 * 관심(Interested)·대기(waitlist/pending)는 확정된 약속이 아니라 넣지 않는다 (PDF 각주).
 */
export function PlansPage() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const v = useViewer();
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const participations = useAppStore((s) => s.participations);
  const polls = useAppStore((s) => s.timePolls);
  const opps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const me = v.me;
  const today = todayISO();
  const tab = (['upcoming', 'past', 'created'].includes(params.get('tab') ?? '') ? params.get('tab') : 'upcoming') as Tab;

  const confirmed = useMemo(() => v.visibleActivities.filter((a) => a.hostId === me.id || participations.some((p) => p.activityId === a.id && p.userId === me.id && p.status === 'approved'))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime)), [v.visibleActivities, participations, me.id]);
  const upcoming = confirmed.filter((a) => a.date >= today);
  const past = confirmed.filter((a) => a.date < today).reverse().slice(0, 30);
  const openPolls = polls.filter((p) => !p.link && p.status === 'open' && (p.hostId === me.id || p.inviteeIds.includes(me.id)));
  const going = intents.filter((i) => i.userId === me.id && GOING.has(i.intent)).map((i) => opps.find((o) => o.id === i.opportunityId)).filter((o): o is Opportunity => !!o && !!o.date);
  const goingNext = going.filter((o) => campusDate(o.date!) >= today).sort((a, b) => a.date!.localeCompare(b.date!));
  const goingPast = going.filter((o) => campusDate(o.date!) < today);
  const myPolls = polls.filter((p) => !p.link && p.hostId === me.id && p.status !== 'cancelled');
  const hosted = confirmed.filter((a) => a.hostId === me.id && a.date >= today);

  const head = (
    <>
      <BackHeader title={en ? 'My Plans' : '내 약속'} right={<HeaderIcon label={en ? 'Plan a meeting' : '약속 만들기'} onClick={() => nav('/schedule/meeting/new')}><Plus size={22} /></HeaderIcon>} />
      <PageTitle title={en ? 'My Plans' : '내 약속'} className="pb-2" />
      <div className="px-4">
        <SegTabs value={tab} onChange={(k) => setParams(k === 'upcoming' ? {} : { tab: k }, { replace: true })} tabs={[
          { key: 'upcoming', label: en ? 'Upcoming' : '다가오는' }, { key: 'past', label: en ? 'Past' : '지난' }, { key: 'created', label: en ? 'Created' : '만든 것' },
        ]} />
      </div>
    </>
  );
  if (status === 'loading') return <div className="min-h-full bg-bg">{head}<LoadingCards className="px-4 pt-4" /></div>;
  if (status === 'error') return <div className="min-h-full bg-bg">{head}<ErrorScreen message={error ?? undefined} onRetry={init} /></div>;

  const pollRows = (list: typeof polls) => list.map((p) => {
    const mineAnswered = (p.votes[me.id] ?? []).length > 0;
    return (
      <RowCard key={p.id} tone="lav" icon={<CalendarClock size={21} />} title={p.title}
        sub={`${p.status === 'decided' ? (en ? 'Confirmed' : '확정') : p.hostId === me.id ? (en ? 'You’re hosting' : '내가 주최') : mineAnswered ? (en ? 'You answered' : '답했어요') : (en ? 'Your turn' : '내 답을 기다려요')} · ${pollSummary(p)}`}
        onClick={() => nav(p.status === 'open' && p.hostId === me.id && mineAnswered ? `/together/${p.id}/find` : `/together/${p.id}`)} />
    );
  });

  return (
    <div className="min-h-full bg-bg pb-10">
      {head}
      <div className="px-4 pt-5 space-y-7">
        {tab === 'upcoming' && (
          !openPolls.length && !upcoming.length && !goingNext.length ? (
            <EmptyState icon={<CalendarDays size={28} />} title={en ? 'Nothing planned yet' : '아직 약속이 없어요'} sub={en ? 'Pick a time with your group, or join a meetup.' : '그룹과 시간을 정하거나 모임에 들어가 보세요.'}
              action={{ label: en ? 'Plan a meeting' : '약속 만들기', onClick: () => nav('/schedule/meeting/new') }} className="pt-4">
              <Btn variant="link" onClick={() => nav('/social/meetups')}>{en ? 'Find a meetup' : '모임 찾기'}</Btn>
            </EmptyState>
          ) : (
            <>
              {openPolls.length > 0 && <section><SectionHeader title={en ? 'Picking a time' : '시간 정하는 중'} /><div className="space-y-3">{pollRows(openPolls)}</div></section>}
              {upcoming.length > 0 && <section><SectionHeader title={en ? 'Your confirmed plans' : '확정된 약속'} /><div className="space-y-3">{upcoming.map((a) => <PlanItem key={a.id} a={a} />)}</div></section>}
              {goingNext.length > 0 && <section><SectionHeader title={en ? 'Going events' : '갈 행사'} /><div className="space-y-3">{goingNext.map((o) => <EventItem key={o.id} o={o} />)}</div></section>}
            </>
          )
        )}
        {tab === 'past' && (
          !past.length && !goingPast.length ? <EmptyState icon={<CalendarDays size={28} />} title={en ? 'No past plans yet' : '지난 약속이 없어요'} sub={en ? 'Plans you went to show up here.' : '다녀온 약속이 여기에 보여요.'} className="pt-4" /> : (
            <>
              {past.length > 0 && <section><SectionHeader title={en ? 'Past plans' : '지난 약속'} /><div className="space-y-3">{past.map((a) => <PlanItem key={a.id} a={a} />)}</div></section>}
              {goingPast.length > 0 && <section><SectionHeader title={en ? 'Events you went to' : '다녀온 행사'} /><div className="space-y-3">{goingPast.map((o) => <EventItem key={o.id} o={o} />)}</div></section>}
            </>
          )
        )}
        {tab === 'created' && (
          !myPolls.length && !hosted.length ? (
            <EmptyState icon={<CalendarClock size={28} />} title={en ? 'Plan something with your group' : '그룹과 약속을 잡아 보세요'} sub={en ? 'Everyone marks the times that work. You confirm.' : '각자 되는 시간을 고르고, 내가 확정해요.'}
              action={{ label: en ? 'Plan a meeting' : '약속 만들기', onClick: () => nav('/schedule/meeting/new') }} className="pt-4" />
          ) : (
            <>
              {myPolls.length > 0 && <section><SectionHeader title={en ? 'Your polls' : '내 투표'} /><div className="space-y-3">{pollRows(myPolls)}</div></section>}
              {hosted.length > 0 && <section><SectionHeader title={en ? 'Plans you host' : '내가 연 약속'} /><div className="space-y-3">{hosted.map((a) => <PlanItem key={a.id} a={a} />)}</div></section>}
              <Btn variant="outline" icon={<Plus size={18} />} onClick={() => nav('/schedule/meeting/new')}>{en ? 'Plan a meeting' : '약속 만들기'}</Btn>
            </>
          )
        )}
        <InfoNote>{en ? 'Interested and waitlisted items are not confirmed plans.' : '관심·대기 중인 것은 확정된 약속이 아니에요.'}</InfoNote>
      </div>
    </div>
  );
}

/** 확정된 약속 카드 (PDF: Study · Group project catch-up · Study room · faces · View meetup) */
function PlanItem({ a }: { a: Activity }) {
  const nav = useNavigate();
  const v = useViewer();
  const parts = useAppStore((s) => s.participations);
  const look = LOOK[a.courseName || a.studyGroup ? 'study' : a.category] ?? { tone: 'rose' as Tone, Icon: Sparkles };
  const people = [a.hostId, ...parts.filter((p) => p.activityId === a.id && p.status === 'approved').map((p) => p.userId)].map(v.userById).filter((u): u is User => !!u);
  return (
    <MeetupCard tone={look.tone} icon={<look.Icon size={21} />} badge={a.studyGroup ? (en ? 'Study group' : '스터디') : CATEGORY_LABELS[a.category]} title={a.title}
      meta={`${formatDate(a.date)} · ${formatTime(a.startTime)}${a.place?.name ? ` · ${a.place.name}` : ''}`}
      people={people.map((u) => ({ id: u.id, avatar: u.avatar }))} footnote={a.sample ? (en ? 'Sample meetup' : '예시 모임') : `${people.length} ${en ? 'going' : '명'}`}
      action={en ? 'View meetup' : '모임 보기'} onClick={() => nav(a.studyGroup ? `/study/${a.id}` : `/activities/${a.id}`)} />
  );
}

/** 간다고 한 행사 (PDF: Going events — ListingCard) */
function EventItem({ o }: { o: Opportunity }) {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const saved = !!useAppStore((s) => s.opportunityIntents).find((i) => i.opportunityId === o.id && i.userId === v.me.id)?.saved;
  return (
    <ListingCard cover={o.cover.url ? o.cover : undefined} icon={listingIcon(o.type)} badge={OPP_TYPE_LABELS[o.type]} badgeTone={o.type === 'event' ? CATEGORY_TONE.events : CATEGORY_TONE.opportunities} title={o.title}
      meta={[o.date ? formatDate(campusDate(o.date)) : '', o.place?.name].filter(Boolean).join(' · ')} sourceUrl={o.sourceUrl || undefined}
      saved={saved} onSave={() => run(() => api.opportunities.toggleSave(o.id, v.me.id))} onClick={() => nav(`/opportunities/${o.id}`)} />
  );
}
