import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageCircle, CalendarDays, Trophy, Users, Coffee, Dumbbell, Utensils, ChevronRight, Bookmark, MapPin } from 'lucide-react';
import { lang } from '@core/i18n';
import { CardSkeleton, ErrorState, Cover } from '@/components/ui';
import { useUnreadCounts } from '@/components/layout/TopBar';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { forYou } from '@core/lib/foryou';
import { badgeOf, locationOf } from '@core/lib/listings';
import { OPP_TYPE_LABELS } from '@core/lib/labels';
import { daysUntil } from '@core/lib/recommend';
import { formatDate } from '@core/lib/format';
import { fmtClock } from '@core/lib/campusclock';
import { api } from '@core/api';
import { cn } from '@core/lib/cn';
import { campusLive, type CampusNow } from '@/lib/campusLive';
import type { Opportunity, User } from '@core/types';

const en = lang === 'en';

/** 학교 이름 — 인증된 소속에서만 (지어내지 않는다. 없으면 null) */
export function schoolLabel(u: Pick<User, 'affiliation'>): string | null {
  return u.affiliation.type === 'university' && u.affiliation.schoolName ? u.affiliation.schoolName : null;
}

/** 학년·대학원·동문에 맞는 첫 문장 */
export function homeIntro(u: Pick<User, 'affiliation'>): { title: string; sub: string } {
  const role = u.affiliation.type === 'university' ? u.affiliation.role : 'alumni';
  const school = schoolLabel(u);
  if (role === 'graduate') return en ? { title: 'Explore what’s next in your field.', sub: 'Research, events, and connections that move you forward.' } : { title: '내 분야의 다음을 찾아보세요', sub: '연구·행사·사람 — 앞으로 나아가게 하는 것들' };
  if (role === 'alumni') return en ? { title: 'Your next connection starts here.', sub: 'Discover opportunities, events, and people beyond campus.' } : { title: '다음 만남이 여기서 시작돼요', sub: '캠퍼스 밖의 기회·행사·사람' };
  return en ? { title: school ? `What’s happening at ${school}?` : 'What’s happening on campus?', sub: 'Discover events, opportunities, and people around you.' } : { title: school ? `${school}에서 지금 무슨 일이?` : '캠퍼스에서 지금 무슨 일이?', sub: '행사·기회·사람을 찾아보세요' };
}

const CATEGORIES = [
  { key: 'events', path: '/explore/events', Icon: CalendarDays, title: en ? 'Events' : '행사', tone: 'bg-[#EEF2FF] text-[#4B63D8] v2:bg-[#1D2140] v2:text-[#9DB0FF]' },
  { key: 'opps', path: '/explore/opportunities', Icon: Trophy, title: en ? 'Opportunities' : '기회', tone: 'bg-[#FFF4E5] text-[#D98A12] v2:bg-[#2E2416] v2:text-[#FFC266]' },
  { key: 'clubs', path: '/explore/clubs', Icon: Users, title: en ? 'Clubs & Groups' : '동아리·그룹', tone: 'bg-[#E9F6F4] text-[#1F9A86] v2:bg-[#14292A] v2:text-[#6FE0CB]' },
  { key: 'meet', path: '/meet', Icon: Coffee, title: en ? 'Meetups' : '모임', tone: 'bg-[#FDEEF2] text-[#D2476B] v2:bg-[#2D1820] v2:text-[#FF9AB5]' },
] as const;

/** 홈 — 캠퍼스 정보로 들어가는 입구 (2026-11-02 사장님 시안: 카테고리 4칸 · Campus Life · For you) */
export function HomeDashboard() {
  const nav = useNavigate();
  const v = useViewer();
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const counts = useUnreadCounts();
  const intro = homeIntro(v.me);
  const school = schoolLabel(v.me);
  return (
    <div className="min-h-full pb-8 bg-bg">
      <header className="sticky top-0 z-30 bg-surface/85 backdrop-blur-xl pl-4 pr-3 pt-2 pb-2 flex items-center gap-1.5">
        <div className="flex-1 min-w-0">
          <div className="font-display text-[24px] font-extrabold tracking-tight leading-tight">AroundU</div>
          {school && <div className="text-[13px] text-ink-2 truncate">{school}</div>}
        </div>
        <button onClick={() => nav('/search')} aria-label={en ? 'Search' : '검색'} className="h-11 w-11 rounded-full grid place-items-center text-ink-2 press"><Search size={23} /></button>
        <button onClick={() => nav('/chats')} aria-label={en ? 'Messages' : '메시지'} className="relative h-11 w-11 rounded-full grid place-items-center text-ink-2 press"><MessageCircle size={23} />{counts.chats ? <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-danger" /> : null}</button>
      </header>
      {status === 'loading' && <CardSkeleton />}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && (
        <div className="px-4">
          <h1 className="font-display text-[25px] font-extrabold tracking-tight leading-tight mt-3">{intro.title}</h1>
          <p className="text-[14px] text-ink-3 mt-1.5">{intro.sub}</p>

          <div className="grid grid-cols-2 gap-2.5 mt-5">
            {CATEGORIES.map((c) => (
              <button key={c.key} onClick={() => nav(c.path)} className={cn('rounded-[20px] h-[104px] flex flex-col items-center justify-center gap-2 press', c.tone)}>
                <c.Icon size={28} strokeWidth={2} />
                <span className="text-[15px] font-bold text-ink">{c.title}</span>
              </button>
            ))}
          </div>

          <CampusLife />
          <ForYouPreview />
        </div>
      )}
    </div>
  );
}

/** Campus Life — 체육관(RSF)·식당. 학교가 지원할 때만 (campus/now) */
function CampusLife() {
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
  const g = now.gym; const d = now.dining;
  const gym = g?.spaces.find((s) => /rsf|weight/i.test(s.name)) ?? g?.spaces[0];
  const clock = (iso: string) => new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Los_Angeles' });
  const gymName = me.affiliation.type === 'university' && me.affiliation.schoolId === 's_berkeley' ? 'RSF' : (en ? 'Gym' : '체육관');
  const gymOpen = gym ? gym.open !== false : false;
  const gymLine = !gym ? (en ? 'Crowd meter unavailable' : '혼잡도를 읽을 수 없어요')
    : gym.hours ? `${clock(gym.hours.open)} – ${clock(gym.hours.close)}${gymOpen && gym.status === 'live' && gym.percent != null ? ` · ${gym.percent}% ${en ? 'full' : '찼어요'}` : ''}`
    : (en ? 'Closed today' : '오늘 휴관');
  const openCount = d?.open?.length ?? 0;
  const diningLine = !d?.available ? (en ? 'Menus unavailable right now' : '지금 메뉴를 읽을 수 없어요')
    : openCount ? (en ? `Open now · ${openCount} open` : `지금 ${openCount}곳 운영`)
    : d.next ? (en ? `${d.next.name} opens ${fmtClock(d.next.opensAt)}` : `${d.next.name} ${fmtClock(d.next.opensAt)} 오픈`) : (en ? 'Closed for today' : '오늘은 문 닫았어요');
  const Row = ({ onClick, Icon, tone, title, pill, line }: { onClick: () => void; Icon: typeof Dumbbell; tone: string; title: string; pill?: boolean; line: string }) => (
    <button onClick={onClick} className="w-full card rounded-[20px] p-3.5 flex items-center gap-3.5 text-left press">
      <span className={cn('h-12 w-12 rounded-2xl grid place-items-center shrink-0', tone)}><Icon size={22} /></span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2"><span className="text-[16px] font-bold">{title}</span>{pill !== undefined && <span className={cn('h-5 px-2 rounded-full text-[11px] font-semibold inline-flex items-center', pill ? 'bg-[#E6F6EC] text-[#1E8E4E] v2:bg-lime-900/60 v2:text-lime-400' : 'bg-surface-2 text-ink-3')}>{pill ? (en ? 'Open' : '운영 중') : (en ? 'Closed' : '닫힘')}</span>}</span>
        <span className="block text-[13px] text-ink-3 truncate mt-0.5">{line}</span>
      </span>
      <ChevronRight size={18} className="text-ink-3 shrink-0" />
    </button>
  );
  return (
    <section className="mt-6">
      <h2 className="text-[18px] font-bold mb-2.5">{en ? 'Campus Life' : '캠퍼스 생활'}</h2>
      <div className="space-y-2.5">
        {g && <Row onClick={() => nav('/gym')} Icon={Dumbbell} tone="bg-[#EEF2FF] text-[#4B63D8] v2:bg-[#1D2140] v2:text-[#9DB0FF]" title={gymName} pill={gym ? gymOpen : undefined} line={gymLine} />}
        {d && <Row onClick={() => nav('/dining')} Icon={Utensils} tone="bg-[#FFF4E5] text-[#D98A12] v2:bg-[#2E2416] v2:text-[#FFC266]" title={en ? 'Dining Halls' : '학생 식당'} pill={d.available ? openCount > 0 : undefined} line={diningLine} />}
      </div>
    </section>
  );
}

/** For you — 실제 공고 추천 1~2개 (없으면 칸을 숨긴다) */
function ForYouPreview() {
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
  if (!items.length) return null;
  return (
    <section className="mt-6">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-[18px] font-bold">{en ? 'For you' : '추천'}</h2>
        <button onClick={() => nav('/explore/opportunities')} className="text-[14px] text-ink-2 font-medium flex items-center gap-0.5 press">{en ? 'See all' : '모두 보기'}<ChevronRight size={16} /></button>
      </div>
      <div className="space-y-2.5">
        {items.map((o) => {
          const b = badgeOf(o, en); const where = locationOf(o) || o.host; const isSaved = saved.has(o.id);
          return (
            <div key={o.id} className="card rounded-[20px] p-3 flex gap-3">
              <button onClick={() => nav(`/opportunities/${o.id}`)} className="shrink-0 press"><Cover emoji={o.cover.emoji} hue={o.cover.hue} url={o.cover.url} className="h-[88px] w-[88px] rounded-2xl" size={30} /></button>
              <button onClick={() => nav(`/opportunities/${o.id}`)} className="flex-1 min-w-0 text-left press">
                <span className="inline-flex h-5 px-2 rounded-full bg-[#EEF0FF] text-[#5257C9] v2:bg-[#1D2140] v2:text-[#9DB0FF] text-[11px] font-semibold items-center">{OPP_TYPE_LABELS[o.type]}</span>
                <span className="block text-[16px] font-bold leading-snug mt-1 line-clamp-2">{o.title}</span>
                <span className="flex items-center gap-3 text-[12px] text-ink-3 mt-1 min-w-0">
                  <span className="flex items-center gap-1 shrink-0"><CalendarDays size={13} />{o.date && !o.deadline ? formatDate(o.date) : b.text}</span>
                  {where && <span className="flex items-center gap-1 min-w-0"><MapPin size={13} className="shrink-0" /><span className="truncate">{where}</span></span>}
                </span>
              </button>
              <button onClick={() => run(() => api.opportunities.toggleSave(o.id, me.id), isSaved ? undefined : (en ? 'Saved' : '저장했어요'))} aria-label={en ? (isSaved ? 'Unsave' : 'Save') : '저장'} className="h-9 w-9 -mr-1 grid place-items-center text-ink-2 shrink-0 press">
                <Bookmark size={20} fill={isSaved ? 'currentColor' : 'none'} />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
