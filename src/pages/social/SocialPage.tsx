import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, CalendarPlus, Users, MessageSquareMore, ChevronRight, GraduationCap, Search, PenLine, Lightbulb, NotebookPen, Megaphone, MessagesSquare, CalendarDays } from 'lucide-react';
import { lang } from '@core/i18n';
import { CardSkeleton, ErrorState } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { AppHeader } from '@/components/layout/AppHeader';
import { useAppStore } from '@core/store/useAppStore';
import { todayISO } from '@core/lib/format';
import { nowMin, toMin } from '@core/lib/timetable';
import { cn } from '@core/lib/cn';
import { openCreate } from '@/components/layout/BottomNav';
import { MEET_KINDS, MeetupRow } from '@/pages/meet/MeetPage';
import { FeedTab } from '@/pages/community/CommunityPage';

const en = lang === 'en';

/**
 * Social 탭 (2026-11-02 사장님 시안) — For You · Meetups · People · Feed.
 * 처음 쓰는 사람도 바로 할 수 있는 행동을 먼저 보여주고, 모임·사람·피드는 각 칸으로 나눈다.
 */
export const SOCIAL_TABS = [
  { to: '/meet', label: en ? 'For You' : '추천' },
  { to: '/meet/meetups', label: en ? 'Meetups' : '모임' },
  { to: '/people', label: en ? 'People' : '사람' },
  { to: '/feed', label: en ? 'Feed' : '피드' },
] as const;

/** 위 머리 — 다른 탭과 같은 Lumi 머리(앱 이름·알림·채팅·프로필) + 만들기(+) (2026-11-02 사장님: 맨 위엔 앱 이름) */
export function SocialHeader() {
  return <AppHeader right={<button onClick={openCreate} aria-label={en ? 'Create' : '만들기'} className="h-9 w-9 rounded-xl bg-primary text-white v2:text-on-primary grid place-items-center press"><Plus size={19} /></button>} />;
}

/** For You · Meetups · People · Feed — 네 화면이 같은 줄을 쓴다 */
export function SocialSegment() {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const active = pathname.startsWith('/meet/meetups') ? '/meet/meetups' : pathname.startsWith('/people') ? '/people' : pathname.startsWith('/feed') ? '/feed' : '/meet';
  return (
    <div className="mx-4 mb-3 p-1 rounded-full bg-surface-2 flex gap-1 shrink-0">
      {SOCIAL_TABS.map((s) => (
        <button key={s.to} onClick={() => nav(s.to, { replace: true })} aria-pressed={active === s.to}
          className={cn('flex-1 h-10 rounded-full text-[14px] font-semibold transition', active === s.to ? 'bg-primary text-white v2:text-on-primary' : 'text-ink-3')}>{s.label}</button>
      ))}
    </div>
  );
}

/** 시안의 그림 자리 — 사진을 지어내지 않고 아이콘으로 */
function Hero({ Icon, title, sub }: { Icon: typeof Users; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center text-center pt-4 pb-5">
      <span className="h-24 w-24 rounded-[32px] bg-primary-soft text-primary grid place-items-center mb-4"><Icon size={44} strokeWidth={1.6} /></span>
      <h2 className="text-[24px] font-extrabold tracking-tight">{title}</h2>
      <p className="text-[15px] text-ink-2 mt-1.5 max-w-[280px]">{sub}</p>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  return (
    <div className="min-h-full pb-8 bg-bg">
      <SocialHeader />
      <SocialSegment />
      {status === 'loading' && <CardSkeleton />}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && <div className="px-4">{children}</div>}
    </div>
  );
}

const Row = ({ Icon, label, onClick }: { Icon: typeof Users; label: string; onClick: () => void }) => (
  <button onClick={onClick} className="w-full card rounded-2xl flex items-center gap-3 px-4 h-14 text-left press">
    <Icon size={20} className="text-primary" /><span className="flex-1 text-[15px] font-bold">{label}</span><ChevronRight size={18} className="text-ink-3" />
  </button>
);

/** For You — 처음 쓰는 사람도 바로 할 수 있는 핵심 행동 + (있으면) 곧 열리는 모임 */
export function SocialForYouPage() {
  const nav = useNavigate();
  const v = useViewer();
  const today = todayISO();
  const soon = useMemo(() => v.visibleActivities
    .filter((a) => a.kind !== 'org_event' && !a.studyGroup && a.category !== 'store_deal' && a.category !== 'school_event')
    .filter((a) => a.date > today || (a.date === today && toMin(a.endTime || a.startTime) > nowMin()))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)).slice(0, 2), [v, today]);
  return (
    <Shell>
      <Hero Icon={CalendarDays} title={en ? 'Let’s get started' : '시작해 볼까요'} sub={en ? 'Meet people, join activities, and share with your campus.' : '사람을 만나고, 모임에 참여하고, 캠퍼스와 나눠요.'} />
      <div className="grid grid-cols-2 gap-2.5">
        <button onClick={() => nav('/create/activity?kind=group&meetup=1')} className="card rounded-[20px] h-[112px] flex flex-col items-center justify-center gap-2 press">
          <CalendarPlus size={28} className="text-primary" /><span className="text-[15px] font-bold">{en ? 'Start a Meetup' : '모임 만들기'}</span>
        </button>
        <button onClick={() => nav('/people/explore')} className="card rounded-[20px] h-[112px] flex flex-col items-center justify-center gap-2 press">
          <Users size={28} className="text-primary" /><span className="text-[15px] font-bold">{en ? 'Find People' : '사람 찾기'}</span>
        </button>
      </div>
      <h3 className="text-[17px] font-bold mt-6 mb-2.5">{en ? 'Popular to try' : '많이 하는 것'}</h3>
      <div className="grid grid-cols-4 gap-2">
        {MEET_KINDS.map((k) => (
          <button key={k.key} onClick={() => nav(`/meet/meetups?kind=${k.key}`)} className={cn('rounded-2xl h-[78px] flex flex-col items-center justify-center gap-1.5 press', k.tone)}>
            <k.Icon size={22} /><span className="text-[12px] font-bold text-ink">{k.title}</span>
          </button>
        ))}
      </div>
      <div className="mt-3"><Row Icon={MessageSquareMore} label={en ? 'Ask a Question' : '질문하기'} onClick={() => nav('/create/post?type=question')} /></div>
      {soon.length > 0 && (
        <section className="mt-6">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[17px] font-bold">{en ? 'Happening soon' : '곧 열리는 모임'}</h3>
            <button onClick={() => nav('/meet/meetups')} className="text-[14px] text-primary font-semibold flex items-center gap-0.5">{en ? 'See all' : '모두 보기'}<ChevronRight size={16} /></button>
          </div>
          <div className="space-y-2.5">{soon.map((a) => <MeetupRow key={a.id} a={a} />)}</div>
        </section>
      )}
    </Shell>
  );
}

/** People — 수업·그룹을 바탕으로 사람을 찾는다 */
export function SocialPeoplePage() {
  const nav = useNavigate();
  return (
    <Shell>
      <Hero Icon={Users} title={en ? 'Find your people' : '나와 맞는 사람 찾기'} sub={en ? 'Discover classmates and campus peers.' : '같은 수업 친구와 캠퍼스 사람들을 만나요.'} />
      <div className="space-y-2.5">
        <Row Icon={GraduationCap} label={en ? 'My Classes' : '내 수업'} onClick={() => nav('/timetable')} />
        <Row Icon={Users} label={en ? 'My Groups' : '내 그룹'} onClick={() => nav('/orgs/mine')} />
        <Row Icon={Search} label={en ? 'Explore People' : '사람 둘러보기'} onClick={() => nav('/people/explore')} />
      </div>
    </Shell>
  );
}

/** Feed — 질문·정보·공지를 가볍게. 글이 없어도 쓰는 법이 바로 보이게 */
export function SocialFeedPage() {
  const nav = useNavigate();
  const v = useViewer();
  const empty = v.visiblePosts.filter((p) => p.showOnFeed !== false).length === 0;
  const starters = [
    { Icon: Lightbulb, type: 'question', label: en ? 'Question' : '질문', eg: en ? 'e.g. “Good lunch spots?”' : '예: “점심 맛집 어디?”' },
    { Icon: NotebookPen, type: 'info', label: en ? 'Tip' : '팁', eg: en ? 'e.g. “Best study spots on campus?”' : '예: “캠퍼스 공부 명당”' },
    { Icon: Megaphone, type: 'together', label: en ? 'Discussion' : '이야기', eg: en ? 'e.g. “Who’s going to the hackathon?”' : '예: “해커톤 가는 사람?”' },
  ];
  return (
    <Shell>
      {empty && <Hero Icon={MessagesSquare} title={en ? 'Start a conversation' : '대화를 시작해요'} sub={en ? 'Ask a question, share a tip, or start a discussion.' : '질문하고, 팁을 나누고, 이야기를 시작해요.'} />}
      <button onClick={() => nav('/create/post')} className="w-full h-12 rounded-2xl bg-primary text-white v2:text-on-primary font-semibold flex items-center justify-center gap-2 press"><PenLine size={18} />{en ? 'Write a Post' : '글쓰기'}</button>
      {empty && (
        <div className="mt-3 space-y-2">
          {starters.map((s) => (
            <button key={s.type} onClick={() => nav(`/create/post?type=${s.type}`)} className="w-full card rounded-2xl flex items-center gap-3 px-4 h-12 text-left press">
              <s.Icon size={17} className="text-primary shrink-0" /><b className="text-[14px] w-[84px] shrink-0">{s.label}</b><span className="text-[12px] text-ink-3 truncate">{s.eg}</span>
            </button>
          ))}
        </div>
      )}
      {!empty && <div className="mt-4"><FeedTab /></div>}
    </Shell>
  );
}
