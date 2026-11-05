import { useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, GraduationCap, Search, PenLine, Lightbulb, NotebookPen, Megaphone, MessagesSquare, Coffee, BookOpen, Dumbbell, Sparkles } from 'lucide-react';
import { lang } from '@core/i18n';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { todayISO } from '@core/lib/format';
import { nowMin, toMin } from '@core/lib/timetable';
import { formatDate, formatTime } from '@core/lib/format';
import { MEET_KINDS } from '@/pages/meet/MeetPage';
import { PostCard } from '@/components/cards/PostCard';
import { BrandHeader, SegTabs, Btn, Chip, ChipRow, MeetupCard, EmptyState, ErrorScreen, LoadingCards, SectionHeader, RowCard, type Tone } from '@/components/ha';
import type { Activity } from '@core/types';
import { FeedTab } from '@/pages/community/CommunityPage';

const en = lang === 'en';

/**
 * Social 탭 (PDF S037~S044) — 머리 "Lumi" + 알림·메시지, 큰 제목 "Social", 밑줄 탭 For You · Meetups · People · Feed.
 */
export const SOCIAL_TABS = [
  { to: '/social', label: en ? 'For You' : '추천' },
  { to: '/social/meetups', label: en ? 'Meetups' : '모임' },
  { to: '/social/people', label: en ? 'People' : '사람' },
  { to: '/social/feed', label: en ? 'Feed' : '피드' },
] as const;

/** 머리 — Lumi · 알림 · 메시지 + 큰 제목 Social + 밑줄 탭 (네 화면이 같은 것을 쓴다) */
export function SocialHeader() {
  const { pathname } = useLocation();
  const active = SOCIAL_TABS.slice(1).find((t) => pathname.startsWith(t.to))?.to ?? '/social';
  return (
    <BrandHeader actions={['bell', 'messages']} title={en ? 'Social' : '소셜'}>
      <SegTabs value={active} tabs={SOCIAL_TABS.map((t) => ({ key: t.to, label: t.label, to: t.to }))} className="-mx-4 px-2" />
    </BrandHeader>
  );
}
/** 예전 이름 — 탭 줄은 이제 SocialHeader 안에 있다 */
export function SocialSegment() { return null; }

/** 시안의 그림 자리 — 사진을 지어내지 않고 아이콘으로 */
function Hero({ Icon, title, sub }: { Icon: typeof Users; title: string; sub: string }) {
  return <EmptyState icon={<Icon size={30} />} tone="ice" title={title} sub={sub} className="pt-6" />;
}

function Shell({ children }: { children: React.ReactNode }) {
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  return (
    <div className="min-h-full pb-8 bg-bg">
      <SocialHeader />
      {status === 'loading' && <LoadingCards className="px-4 pt-4" />}
      {status === 'error' && <ErrorScreen message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && <div className="px-4 pt-5">{children}</div>}
    </div>
  );
}

/** 모임 종류 → 색·아이콘 (MEET_KINDS 와 같은 묶음) */
const KIND_LOOK: Record<string, { tone: Tone; Icon: typeof Coffee }> = { coffee: { tone: 'peach', Icon: Coffee }, study: { tone: 'ice', Icon: BookOpen }, workout: { tone: 'mint', Icon: Dumbbell }, hangout: { tone: 'rose', Icon: Sparkles } };
export function meetKindOf(a: Pick<Activity, 'category'>) { return MEET_KINDS.find((k) => (k.cats as readonly string[]).includes(a.category)) ?? MEET_KINDS[3]; }

/** 모임 카드 (PDF S037) — 실제 장소·시간·참여한 사람 */
export function MeetupItem({ a }: { a: Activity }) {
  const nav = useNavigate();
  const v = useViewer();
  const parts = useAppStore((s) => s.participations);
  const k = meetKindOf(a); const look = KIND_LOOK[k.key];
  const host = v.userById(a.hostId);
  const people = [host, ...parts.filter((p) => p.activityId === a.id && p.status === 'approved').map((p) => v.userById(p.userId))].filter((u): u is NonNullable<typeof u> => !!u);
  return (
    <MeetupCard tone={look.tone} icon={<look.Icon size={22} />} badge={k.title} title={a.title}
      meta={[a.place?.name, `${formatDate(a.date)} · ${formatTime(a.startTime)}`].filter(Boolean).join(' · ')}
      people={people} footnote={`${people.length} ${en ? 'going' : '명 참여'}`} action={en ? 'View meetup' : '모임 보기'} onClick={() => nav(`/activities/${a.id}`)} />
  );
}

const Row = ({ Icon, label, onClick, tone = 'ice' }: { Icon: typeof Users; label: string; onClick: () => void; tone?: Tone }) => (
  <RowCard tone={tone} icon={<Icon size={21} />} title={label} onClick={onClick} />
);

/** For You (PDF S037 · 비었을 때 S041) — 바로 할 수 있는 두 가지 + 종류 칩 + 곧 열리는 모임 + 최근 글 */
export function SocialForYouPage() {
  const nav = useNavigate();
  const v = useViewer();
  const today = todayISO();
  const soon = useMemo(() => v.visibleActivities
    .filter((a) => a.kind !== 'org_event' && !a.studyGroup && a.category !== 'store_deal' && a.category !== 'school_event')
    .filter((a) => a.date > today || (a.date === today && toMin(a.endTime || a.startTime) > nowMin()))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)).slice(0, 2), [v, today]);
  const post = v.visiblePosts.find((p) => p.showOnFeed !== false);
  const chips = <ChipRow>{MEET_KINDS.map((k) => <Chip key={k.key} onClick={() => nav(`/social/meetups?kind=${k.key}`)}>{k.title}</Chip>)}</ChipRow>;
  if (!soon.length && !post) return (
    <Shell>
      <EmptyState icon={<Coffee size={30} />} tone="ice" title={en ? 'Start something small' : '작게 시작해요'} sub={en ? 'A coffee, a walk, a study session.' : '커피 한 잔, 산책, 같이 공부.'}
        action={{ label: en ? 'Start a Meetup' : '모임 만들기', onClick: () => nav('/meetups/new') }}>{chips}</EmptyState>
    </Shell>
  );
  return (
    <Shell>
      <h2 className="ha-h2">{en ? 'Good plans. Your people.' : '좋은 약속, 나의 사람들.'}</h2>
      <p className="text-[14px] text-ink-2 mt-1">{en ? 'Make a little time for something new.' : '새로운 일에 잠깐 시간을 내 봐요.'}</p>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Btn onClick={() => nav('/meetups/new')}>{en ? 'Start a Meetup' : '모임 만들기'}</Btn>
        <Btn variant="outline" onClick={() => nav('/social/people')}>{en ? 'Find People' : '사람 찾기'}</Btn>
      </div>
      <div className="mt-4">{chips}</div>
      {soon.length > 0 && (
        <section className="mt-6">
          <SectionHeader title={en ? 'Happening soon' : '곧 열리는 모임'} action={en ? 'See all' : '모두 보기'} onAction={() => nav('/social/meetups')} />
          <div className="space-y-3">{soon.map((a) => <MeetupItem key={a.id} a={a} />)}</div>
        </section>
      )}
      {post && <section className="mt-6"><SectionHeader title={en ? 'From your campus' : '우리 캠퍼스 이야기'} action={en ? 'Feed' : '피드'} onAction={() => nav('/social/feed')} /><PostCard post={post} /></section>}
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
        <Row Icon={GraduationCap} tone="ice" label={en ? 'My Classes' : '내 수업'} onClick={() => nav('/schedule')} />
        <Row Icon={Users} tone="mint" label={en ? 'My Groups' : '내 그룹'} onClick={() => nav('/profile/communities')} />
        <Row Icon={Search} tone="rose" label={en ? 'Explore People' : '사람 둘러보기'} onClick={() => nav('/social/people/explore')} />
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
