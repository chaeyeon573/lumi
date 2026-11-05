import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Trophy, Users, Coffee, Dumbbell, Utensils, Sun, Moon, Sunset } from 'lucide-react';
import { lang } from '@core/i18n';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { forYou } from '@core/lib/foryou';
import { badgeOf, locationOf } from '@core/lib/listings';
import { OPP_TYPE_LABELS, ORG_TYPE_LABELS } from '@core/lib/labels';
import { daysUntil } from '@core/lib/recommend';
import { formatDate } from '@core/lib/format';
import { campusClock, fmtClock, schoolTz } from '@core/lib/campusclock';
import { crowdLevel, CROWD_LABELS } from '@core/lib/gym';
import { statusNow, statusLabel, coursesOn, todayIdx } from '@core/lib/timetable';
import { api } from '@core/api';
import { campusLive, type CampusNow } from '@/lib/campusLive';
import {
  BrandHeader, Screen, CategoryGrid, CategoryTile, SectionHeader, ListingCard, RowCard, EmptyCard, ErrorScreen, LoadingCards, IconTile, cardCls, CATEGORY_TONE,
} from '@/components/ha';
import { cn } from '@core/lib/cn';
import type { Opportunity, User } from '@core/types';

const en = lang === 'en';

/** 학교 이름 — 인증된 소속에서만 (지어내지 않는다. 없으면 null) */
export function schoolLabel(u: Pick<User, 'affiliation'>): string | null {
  return u.affiliation.type === 'university' && u.affiliation.schoolName ? u.affiliation.schoolName : null;
}

/** 캠퍼스 시각으로 인사 (PDF S012 "Good morning! ☀") — 이모지 대신 아이콘 */
export function greeting(min = campusClock(new Date(), schoolTz()).min): { text: string; Icon: typeof Sun } {
  const h = Math.floor(min / 60);
  if (h >= 5 && h < 12) return { text: en ? 'Good morning!' : '좋은 아침이에요!', Icon: Sun };
  if (h >= 12 && h < 17) return { text: en ? 'Good afternoon!' : '좋은 오후예요!', Icon: Sun };
  if (h >= 17 && h < 21) return { text: en ? 'Good evening!' : '좋은 저녁이에요!', Icon: Sunset };
  return { text: en ? 'Good night!' : '좋은 밤이에요!', Icon: Moon };
}

const CATEGORIES = [
  { key: 'events', path: '/explore/events', Icon: CalendarDays, title: en ? 'Events' : '행사' },
  { key: 'opportunities', path: '/explore/opportunities', Icon: Trophy, title: en ? 'Opportunities' : '기회' },
  { key: 'clubs', path: '/explore/clubs', Icon: Users, title: en ? 'Clubs' : '동아리' },
  { key: 'meetups', path: '/social/meetups', Icon: Coffee, title: en ? 'Meetups' : '모임' },
] as const;

/**
 * Home (PDF S012 · S013 첫 사용자 · S014 콘텐츠는 있고 사람은 없음).
 * 인사 → 카테고리 4칸 → 오늘 캠퍼스(RSF·식당, 사장님 2026-11-05 "꼭 넣어야") → For you → Your week → My Communities.
 */
export function HomeDashboard() {
  const nav = useNavigate();
  const v = useViewer();
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const school = schoolLabel(v.me);
  const g = greeting();
  return (
    <Screen>
      <BrandHeader />
      {status === 'error' && <ErrorScreen message={error ?? undefined} onRetry={init} />}
      {status !== 'error' && (
        <div className="px-4">
          <h1 className="ha-title flex items-center gap-2 mt-2">{g.text}<g.Icon size={26} className="text-t-peach-fg" /></h1>
          <p className="text-[14px] text-ink-2 mt-1.5">{en ? `What’s happening ${school ? `at ${school}` : 'on campus'}` : `${school ?? '캠퍼스'}에서 지금 무슨 일이`}</p>

          <CategoryGrid className="mt-5">
            {CATEGORIES.map((c) => <CategoryTile key={c.key} tone={CATEGORY_TONE[c.key]} icon={<c.Icon size={28} strokeWidth={2} />} label={c.title} onClick={() => nav(c.path)} />)}
          </CategoryGrid>

          <CampusToday />
          {status === 'loading' ? <LoadingCards count={2} className="mt-8" /> : <><ForYou /><YourWeek /><MyCommunities /></>}
        </div>
      )}
    </Screen>
  );
}

/**
 * 오늘 캠퍼스 — RSF 혼잡도 · 학식. 학교가 지원하고 읽을 수 있을 때만 (server/campus-live.ts).
 * 지어낸 숫자는 없다: 읽지 못하면 "unavailable" 로 쓰고, 지원하지 않는 학교면 칸을 숨긴다.
 */
function CampusToday() {
  const nav = useNavigate();
  const me = useViewer().me;
  const [now, setNow] = useState<CampusNow | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => campusLive.now().then((r) => { if (alive) setNow(r); }).catch(() => { /* 없으면 숨긴다 */ });
    load(); const h = setInterval(load, 120_000);
    return () => { alive = false; clearInterval(h); };
  }, []);
  if (!now || (!now.dining && !now.gym)) return null;
  const gs = now.gym?.spaces.find((s) => /rsf|weight/i.test(s.name)) ?? now.gym?.spaces[0];
  const gymName = me.affiliation.type === 'university' && me.affiliation.schoolId === 's_berkeley' ? 'RSF' : (en ? 'Recreation' : '체육관');
  const live = !!gs && gs.status === 'live' && gs.percent != null && gs.open !== false;
  const gymLine = !gs ? (en ? 'Crowd meter unavailable' : '혼잡도를 읽을 수 없어요')
    : gs.open === false ? (en ? 'Closed now' : '지금 닫힘')
    : live ? `${gs.percent}% · ${CROWD_LABELS[crowdLevel(gs.percent!)].toLowerCase()}`
    : (en ? 'Crowd meter unavailable' : '혼잡도를 읽을 수 없어요');
  const d = now.dining;
  const open = d?.open ?? [];
  const diningTitle = open[0]?.name ?? (en ? 'Dining' : '학식');
  const diningLine = !d?.available ? (en ? 'Menus unavailable' : '메뉴를 읽을 수 없어요')
    : open.length ? [en ? 'Open' : '운영 중', open[0].meal?.toLowerCase()].filter(Boolean).join(' · ') + (open.length > 1 ? (en ? ` · +${open.length - 1}` : ` 외 ${open.length - 1}곳`) : '')
    : d.next ? (en ? `Opens ${fmtClock(d.next.opensAt)}` : `${fmtClock(d.next.opensAt)} 오픈`) : (en ? 'Closed for today' : '오늘은 닫았어요');
  const Card = ({ onClick, Icon, tone, title, line, dot }: { onClick: () => void; Icon: typeof Dumbbell; tone: 'mint' | 'peach'; title: string; line: string; dot?: boolean }) => (
    <button onClick={onClick} className={cn(cardCls, 'p-3.5 flex items-center gap-3 text-left press min-w-0')}>
      <IconTile tone={tone} size={40}><Icon size={20} /></IconTile>
      <span className="min-w-0">
        <span className="block text-[14px] font-bold truncate">{title}</span>
        <span className="flex items-center gap-1.5 text-[12.5px] text-ink-2 min-w-0">{dot && <span className="h-1.5 w-1.5 rounded-full bg-ok shrink-0" />}<span className="truncate">{line}</span></span>
      </span>
    </button>
  );
  return (
    <section className="mt-8">
      <SectionHeader title={en ? 'Campus today' : '오늘 캠퍼스'} />
      <div className="grid grid-cols-2 gap-3">
        {now.gym && <Card onClick={() => nav('/recreation')} Icon={Dumbbell} tone="mint" title={gymName} line={gymLine} dot={live} />}
        {d && <Card onClick={() => nav('/dining')} Icon={Utensils} tone="peach" title={diningTitle} line={diningLine} dot={open.length > 0} />}
      </div>
    </section>
  );
}

/** For you — 실제 공고·행사 추천 2개. 없으면 PDF S013 의 빈 카드 */
function ForYou() {
  const nav = useNavigate();
  const me = useViewer().me;
  const opps = useAppStore((s) => s.opportunities);
  const intents = useAppStore((s) => s.opportunityIntents);
  const orgs = useAppStore((s) => s.organizations);
  const relationships = useAppStore((s) => s.relationships);
  const schools = useAppStore((s) => s.schools);
  const run = useAppStore((s) => s.run);
  const mySchool = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  const items = useMemo(() => forYou({ opportunities: opps, opportunityIntents: intents, organizations: orgs, relationships, schools }, me)
    .filter((r) => r.kind !== 'club')
    .map((r) => r.item as Opportunity)
    .filter((o) => o.type !== 'activity' && (!o.schoolId || o.schoolId === mySchool) && (o.deadline ? daysUntil(o.deadline) >= 0 : !o.date || daysUntil(o.date) >= 0))
    .slice(0, 2), [opps, intents, orgs, relationships, schools, me, mySchool]);
  const saved = useMemo(() => new Set(intents.filter((i) => i.userId === me.id && (i.saved || i.intent !== 'interested')).map((i) => i.opportunityId)), [intents, me.id]);
  return (
    <section className="mt-8">
      <SectionHeader title={en ? 'For you' : '추천'} action={items.length ? (en ? 'See all' : '모두 보기') : undefined} onAction={() => nav('/explore/opportunities')} />
      {items.length === 0 ? (
        <EmptyCard title={en ? 'Your campus starts here.' : '캠퍼스가 여기서 시작돼요.'} sub={en ? 'Explore opportunities while your community grows.' : '커뮤니티가 자라는 동안 기회부터 둘러보세요.'}
          primary={{ label: en ? 'Explore Campus' : '캠퍼스 둘러보기', onClick: () => nav('/explore/events') }}
          secondary={{ label: en ? 'Create Meetup' : '모임 만들기', onClick: () => nav('/meetups/new') }} />
      ) : (
        <div className="space-y-3">
          {items.map((o) => {
            const b = badgeOf(o, en); const where = locationOf(o) || o.host;
            const when = o.date && !o.deadline ? formatDate(o.date) : b.text;
            return (
              <ListingCard key={o.id} cover={o.cover} badge={OPP_TYPE_LABELS[o.type]} badgeTone={o.type === 'event' ? 'ice' : 'peach'} title={o.title}
                meta={[when, where].filter(Boolean).join(' · ')} sourceUrl={o.sourceUrl || undefined} saved={saved.has(o.id)}
                onClick={() => nav(`/opportunities/${o.id}`)}
                onSave={() => run(() => api.opportunities.toggleSave(o.id, me.id), saved.has(o.id) ? undefined : (en ? 'Saved' : '저장했어요'))} />
            );
          })}
        </div>
      )}
    </section>
  );
}

/** Your week — 시간표가 있으면 오늘 상태, 없으면 PDF 의 "Make room for a good plan" */
function YourWeek() {
  const nav = useNavigate();
  const me = useViewer().me;
  const courses = me.timetable ?? [];
  const today = coursesOn(courses, todayIdx());
  const s = statusNow(courses);
  const title = !courses.length ? (en ? 'Make room for a good plan' : '좋은 약속을 위한 자리')
    : today.length ? (en ? `${today.length} class${today.length > 1 ? 'es' : ''} today` : `오늘 수업 ${today.length}개`) : (en ? 'No classes today' : '오늘은 수업이 없어요');
  const sub = !courses.length ? (en ? 'Add classes and find your free time' : '수업을 넣고 빈 시간을 찾아요') : statusLabel(s) || (en ? 'Find a plan between classes' : '수업 사이에 약속 잡기');
  return (
    <section className="mt-8">
      <SectionHeader title={en ? 'Your week' : '이번 주'} />
      <RowCard tone="ice" icon={<CalendarDays size={22} />} title={title} sub={sub} onClick={() => nav('/schedule')} />
    </section>
  );
}

/** My Communities — 팔로우·회원인 조직 3개까지, 없으면 PDF 의 "Find your communities" */
function MyCommunities() {
  const nav = useNavigate();
  const v = useViewer();
  const orgs = useAppStore((s) => s.organizations);
  const mine = useMemo(() => orgs.filter((o) => o.memberIds.includes(v.me.id) || v.isFollowing(o.id)).slice(0, 3), [orgs, v]);
  return (
    <section className="mt-8">
      <SectionHeader title={en ? 'My Communities' : '내 커뮤니티'} action={en ? 'Explore' : '둘러보기'} onAction={() => nav('/explore/clubs')} />
      <div className="space-y-3">
        {mine.length === 0
          ? <RowCard tone="rose" icon={<Users size={22} />} title={en ? 'Find your communities' : '내 커뮤니티 찾기'} sub={en ? 'Follow interests. Verify membership separately.' : '관심사를 팔로우하세요. 회원 인증은 따로 해요.'} onClick={() => nav('/explore/clubs')} />
          : mine.map((o) => (
            <RowCard key={o.id} tone="mint" icon={<Users size={22} />} title={o.name}
              sub={[ORG_TYPE_LABELS[o.type], o.memberIds.includes(v.me.id) ? (en ? 'Member' : '회원') : (en ? 'Followed' : '팔로우')].join(' · ')} onClick={() => nav(`/orgs/${o.id}`)} />
          ))}
      </div>
    </section>
  );
}
