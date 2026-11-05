import { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Coffee, Users, MessageCircle, Plus, SlidersHorizontal, Sparkles, UserPlus } from 'lucide-react';
import { lang } from '@core/i18n';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { Avatar } from '@/components/ui';
import {
  BrandHeader, SegTabs, Btn, Chip, ChipRow, EmptyState, EmptyCard, ErrorScreen, LoadingCards, SectionHeader, SearchField, InfoNote, cardCls,
} from '@/components/ha';
import type { Activity, Post, User } from '@core/types';
import { CHIP_KINDS, kindByKey, kindOf } from '@/components/social/meetupKinds';
import { MeetupItem, studentMeetups } from '@/components/social/MeetupBits';
import { FeedPost } from '@/components/social/FeedPost';
import { CampusStart } from '@/components/people/CampusStart';
import { PersonItem, YEAR_CHIPS, yearKey, commonGround, type YearKey } from '@/components/people/PeopleBits';
import { useInvite } from '@/components/together/FeedExtras';
import { myGroups } from '@core/lib/meetups';

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

/** 네 탭이 같이 쓰는 틀 — 머리 + 불러오는 중 / 실패 / 내용 */
export function SocialShell({ children }: { children: React.ReactNode }) {
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

/** 예전 이름 (다른 화면이 쓰던 것) */
export const meetKindOf = (a: Pick<Activity, 'category'>) => kindOf(a);
export { MeetupItem };

/** 함께 가진 것이 있는 실제 사람들 — 많이 겹치는 순 (S037 · S039 · S061) */
export function usePeopleInCommon() {
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  return useMemo(() => v.visibleUsers
    .filter((u) => u.affiliation.type === 'university')
    .map((u) => ({ u, common: commonGround(v.me, u, { rosters: v.snap.classRosters, orgs }) }))
    .sort((a, b) => b.common.length - a.common.length || Number(!!b.u.bio) - Number(!!a.u.bio)), [v, orgs]);
}

/** For You (PDF S037 · 비었을 때 S041) — 바로 할 수 있는 두 가지 + 종류 칩 + 곧 열리는 모임 + 함께 가진 사람 + 최근 글 */
export function SocialForYouPage() {
  const nav = useNavigate();
  const v = useViewer();
  const parts = useAppStore((s) => s.participations);
  const [kind, setKind] = useState<string | null>(null);
  const all = useMemo(() => studentMeetups(v.visibleActivities, v.me, parts), [v, parts]);
  const k = kindByKey(kind);
  const soon = all.filter((a) => !k || k.cats.includes(a.category)).slice(0, 3);
  const post = v.visiblePosts.filter((p) => p.showOnFeed !== false && p.authorId !== v.me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const people = usePeopleInCommon().filter((x) => x.common.length > 0).slice(0, 2);

  if (!all.length && !post && !people.length) return (
    <SocialShell>
      <EmptyState icon={<Coffee size={30} />} tone="rose" title={en ? 'Start something small' : '작게 시작해요'} sub={en ? 'A coffee, a walk, a study session.' : '커피 한 잔, 산책, 같이 공부.'}
        action={{ label: en ? 'Start a Meetup' : '모임 만들기', onClick: () => nav('/meetups/new') }}>
        <ChipRow wrap className="justify-center">{CHIP_KINDS.map((x) => <Chip key={x.key} onClick={() => nav(`/meetups/new?kind=${x.key}`)}>{x.label}</Chip>)}</ChipRow>
      </EmptyState>
      <CampusStart className="mt-4" />
    </SocialShell>
  );
  return (
    <SocialShell>
      <h2 className="ha-h2">{en ? 'Good plans. Your people.' : '좋은 약속, 나의 사람들.'}</h2>
      <p className="text-[14px] text-ink-2 mt-1">{en ? 'Make a little time for something new.' : '새로운 일에 잠깐 시간을 내 봐요.'}</p>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Btn onClick={() => nav('/meetups/new')}>{en ? 'Start a Meetup' : '모임 만들기'}</Btn>
        <Btn variant="outline" onClick={() => nav('/social/people')}>{en ? 'Find People' : '사람 찾기'}</Btn>
      </div>
      <ChipRow className="mt-4">{CHIP_KINDS.map((x) => <Chip key={x.key} active={kind === x.key} onClick={() => setKind(kind === x.key ? null : x.key)}>{x.label}</Chip>)}</ChipRow>
      <section className="mt-5">
        {soon.length > 0
          ? <div className="space-y-3">{soon.map((a) => <MeetupItem key={a.id} a={a} />)}</div>
          : <EmptyCard title={k ? (en ? `No ${k.label.toLowerCase()} plans on the calendar` : `예정된 ${k.label} 모임이 없어요`) : (en ? 'No meetups on the calendar' : '예정된 모임이 없어요')}
              sub={en ? 'Open one — people on campus can join.' : '하나 열어 보세요 — 캠퍼스 사람들이 참여할 수 있어요.'}
              secondary={{ label: en ? `Start ${k ? k.label.toLowerCase() : 'one'}` : '열기', onClick: () => nav(`/meetups/new${k ? `?kind=${k.key}` : ''}`) }} />}
        {all.length > soon.length && <div className="mt-3 text-center"><Btn variant="link" size="sm" onClick={() => nav('/social/meetups')}>{en ? 'See all meetups' : '모임 모두 보기'}</Btn></div>}
      </section>
      {people.length > 0 && (
        <section className="mt-7">
          <SectionHeader title={en ? 'Something in common' : '함께 가진 것'} action={en ? 'See all' : '모두 보기'} onAction={() => nav('/social/people/common')} />
          <div className="space-y-3">{people.map(({ u, common }) => <PersonItem key={u.id} user={u} line={common[0]?.text} lead="common" />)}</div>
        </section>
      )}
      {post && <section className="mt-7"><SectionHeader title={en ? 'From your campus' : '우리 캠퍼스 이야기'} action={en ? 'Feed' : '피드'} onAction={() => nav('/social/feed')} /><FeedPost post={post} /></section>}
      {all.length < 2 && <CampusStart parts={['week']} limit={2} className="mt-7" />}
    </SocialShell>
  );
}

/** People (PDF S039 · 비었을 때 S043) — 검색, 학년 칩, 더 많은 조건, 함께 가진 것, 사람 카드 (Add Friend) */
export function SocialPeoplePage() {
  const nav = useNavigate();
  const invite = useInvite();
  const ranked = usePeopleInCommon();
  const [q, setQ] = useState('');
  const [year, setYear] = useState<YearKey | 'all'>('all');
  const norm = q.trim().toLowerCase();
  const list = ranked.filter(({ u }) => (year === 'all' || yearKey(u) === year) && (!norm || matchesPerson(u, norm)));

  if (!ranked.length) return (
    <SocialShell>
      <EmptyState icon={<Users size={30} />} tone="rose" title={en ? 'Good company starts somewhere' : '좋은 사람은 어딘가에서 시작돼요'} sub={en ? 'Invite a friend or explore your classes.' : '친구를 초대하거나 내 수업을 둘러보세요.'}
        action={{ label: en ? 'Invite Friends' : '친구 초대', onClick: () => invite('class') }}>
        <div className="grid grid-cols-2 gap-3">
          <Btn variant="outline" onClick={() => nav('/schedule/classes')}>{en ? 'My Classes' : '내 수업'}</Btn>
          <Btn variant="outline" onClick={() => nav('/profile/communities')}>{en ? 'My Communities' : '내 커뮤니티'}</Btn>
        </div>
      </EmptyState>
      <CampusStart parts={['week', 'invite']} className="mt-4" />
    </SocialShell>
  );
  return (
    <SocialShell>
      <SearchField placeholder={en ? 'Search people' : '사람 검색'} value={q} onChange={setQ} />
      <ChipRow wrap className="mt-4">
        <Chip active={year === 'all'} onClick={() => setYear('all')}>{en ? 'All' : '전체'}</Chip>
        {YEAR_CHIPS.map((c) => <Chip key={c.key} active={year === c.key} onClick={() => setYear(year === c.key ? 'all' : c.key)}>{c.label}</Chip>)}
      </ChipRow>
      <div className="flex items-center justify-around mt-3">
        <Btn variant="link" size="sm" icon={<SlidersHorizontal size={16} />} onClick={() => nav('/social/people/filters')}>{en ? 'More Filters' : '조건 더 보기'}</Btn>
        <Btn variant="link" size="sm" icon={<Sparkles size={16} />} onClick={() => nav('/social/people/common')}>{en ? 'Something in common' : '함께 가진 것'}</Btn>
      </div>
      <div className="space-y-3 mt-3">
        {list.slice(0, 20).map(({ u, common }) => <PersonItem key={u.id} user={u} line={common[0]?.text} />)}
        {!list.length && <EmptyCard title={en ? 'No one matches that yet' : '아직 맞는 사람이 없어요'} sub={en ? 'Try another year or fewer words.' : '다른 학년이나 짧은 검색어로 찾아보세요.'}
          secondary={{ label: en ? 'Clear' : '지우기', onClick: () => { setQ(''); setYear('all'); } }} />}
      </div>
      {list.length > 20 && <div className="mt-3 text-center"><Btn variant="link" size="sm" onClick={() => nav(`/social/people/results${norm ? `?q=${encodeURIComponent(q.trim())}` : ''}`)}>{en ? 'See all' : '모두 보기'}</Btn></div>}
      <InfoNote className="mt-5">{en ? 'Suggestions reflect registered people, not school rosters.' : '학교 명단이 아니라 Lumi 에 가입한 사람만 보여요.'}</InfoNote>
      <div className="mt-6 flex justify-center"><Btn variant="outline" size="sm" icon={<UserPlus size={15} />} onClick={() => invite('class')}>{en ? 'Invite Friends' : '친구 초대'}</Btn></div>
    </SocialShell>
  );
}

/** 이름·학과·관심사·한 줄 소개 — 보이는 것만 (서버가 공개 범위 밖은 보내지 않는다) */
export function matchesPerson(u: User, norm: string): boolean {
  const dept = u.affiliation.type === 'university' && u.affiliation.showDepartment ? u.affiliation.department ?? '' : '';
  return [u.nickname, dept, u.bio ?? '', ...(u.interests ?? [])].some((s) => s.toLowerCase().includes(norm));
}

type FeedFilter = 'all' | 'school' | 'groups';

/** Feed (PDF S040 · 비었을 때 S044) — 사람이 쓴 글만 (공고는 Explore). All · My School · My Groups, 글쓰기 칸, 글 카드 */
export function SocialFeedPage() {
  const nav = useNavigate();
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const [f, setF] = useState<FeedFilter>('all');
  const feed = useMemo(() => v.visiblePosts.filter((p) => p.showOnFeed !== false).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [v]);
  const mine = useMemo(() => myGroups(orgs, v.me.id), [orgs, v.me.id]);
  const school = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolId : '';
  const schoolName = v.me.affiliation.type === 'university' ? v.me.affiliation.schoolName : '';
  const inSchool = (p: Post) => { const a = v.userById(p.authorId); return p.anonymous ? p.anonSchool === schoolName || p.authorId === v.me.id : a?.affiliation.type === 'university' && a.affiliation.schoolId === school; };
  const inGroups = (p: Post) => (!!p.orgId && mine.some((o) => o.id === p.orgId)) || (!!p.authorId && !p.anonymous && mine.some((o) => o.memberIds.includes(p.authorId!) || o.adminIds.includes(p.authorId!)));
  const shown = feed.filter((p) => f === 'all' || (f === 'school' ? inSchool(p) : inGroups(p)));

  if (!feed.length) return (
    <SocialShell>
      <EmptyState icon={<MessageCircle size={30} />} tone="lav" title={en ? 'Share something small' : '작은 이야기부터'} sub={en ? 'A question, an update, a campus moment.' : '질문, 소식, 캠퍼스의 한 순간.'}
        action={{ label: en ? 'Share Something' : '글쓰기', onClick: () => nav('/create/post') }}>
        <div className="flex justify-center"><Btn variant="outline" onClick={() => nav('/create/post?type=question')}>{en ? 'Ask a Question' : '질문하기'}</Btn></div>
      </EmptyState>
      <CampusStart parts={['week']} limit={2} className="mt-4" />
    </SocialShell>
  );
  return (
    <SocialShell>
      <ChipRow>
        {([['all', en ? 'All' : '전체'], ['school', en ? 'My School' : '우리 학교'], ['groups', en ? 'My Groups' : '내 그룹']] as const).map(([key, label]) => <Chip key={key} active={f === key} onClick={() => setF(key)}>{label}</Chip>)}
      </ChipRow>
      <button onClick={() => nav('/create/post')} className={`${cardCls} w-full mt-4 p-3.5 flex items-center gap-3 text-left press`}>
        <Avatar emoji={v.me.avatar.emoji} hue={v.me.avatar.hue} url={v.me.avatar.url} size={40} />
        <span className="flex-1 text-[15px] text-ink-3">{en ? 'What’s on your mind?' : '무슨 생각 하고 있어요?'}</span>
        <Plus size={22} className="text-ink-2" />
      </button>
      <div className="space-y-3 mt-3">
        {shown.map((p) => <FeedPost key={p.id} post={p} />)}
        {!shown.length && <EmptyCard title={f === 'groups' ? (en ? 'Nothing from your groups yet' : '내 그룹 글이 아직 없어요') : (en ? 'Nothing from your school yet' : '우리 학교 글이 아직 없어요')}
          sub={f === 'groups' && !mine.length ? (en ? 'Join a club to see its members here.' : '동아리에 들면 회원 글이 여기 보여요.') : undefined}
          secondary={f === 'groups' && !mine.length ? { label: en ? 'Explore clubs' : '동아리 보기', onClick: () => nav('/explore/clubs') } : { label: en ? 'Show all' : '전체 보기', onClick: () => setF('all') }} />}
      </div>
    </SocialShell>
  );
}
