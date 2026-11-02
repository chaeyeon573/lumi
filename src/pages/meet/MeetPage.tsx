import { useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Coffee, BookOpen, Dumbbell, Sparkles, Plus, ChevronRight, MapPin, Clock, Car, Link2, Zap, Users } from 'lucide-react';
import { lang } from '@core/i18n';
import { AppHeader } from '@/components/layout/AppHeader';
import { CardSkeleton, ErrorState, Cover, Avatar, EmptyState } from '@/components/ui';
import { SampleTag } from '@/components/ui/SampleTag';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { todayISO, formatDate, formatTime } from '@core/lib/format';
import { nowMin, toMin } from '@core/lib/timetable';
import { cn } from '@core/lib/cn';
import type { Activity, ActivityCategory } from '@core/types';

const en = lang === 'en';

/** 모임 종류 — 시안: Coffee · Study · Workout · Hangout (Hangout = 그 밖의 가벼운 만남) */
export const MEET_KINDS = [
  { key: 'coffee', cats: ['coffee', 'meal'] as ActivityCategory[], title: en ? 'Coffee' : '커피·밥', Icon: Coffee, tone: 'bg-[#FFF4E5] text-[#D98A12] v2:bg-[#2E2416] v2:text-[#FFC266]' },
  { key: 'study', cats: ['study', 'seminar'] as ActivityCategory[], title: en ? 'Study' : '스터디', Icon: BookOpen, tone: 'bg-[#EEF2FF] text-[#4B63D8] v2:bg-[#1D2140] v2:text-[#9DB0FF]' },
  { key: 'workout', cats: ['exercise'] as ActivityCategory[], title: en ? 'Workout' : '운동', Icon: Dumbbell, tone: 'bg-[#E9F6F4] text-[#1F9A86] v2:bg-[#14292A] v2:text-[#6FE0CB]' },
  { key: 'hangout', cats: ['etc', 'performance', 'club', 'networking'] as ActivityCategory[], title: en ? 'Hangout' : '같이 놀기', Icon: Sparkles, tone: 'bg-[#FDEEF2] text-[#D2476B] v2:bg-[#2D1820] v2:text-[#FF9AB5]' },
] as const;
export type MeetKind = typeof MEET_KINDS[number]['key'];
/** 모임 만들기에서 고른 종류 → 활동 분류 */
export const MEET_KIND_CATEGORY: Record<MeetKind, ActivityCategory> = { coffee: 'coffee', study: 'study', workout: 'exercise', hangout: 'etc' };

/** Meet 위의 Activities | People — 두 화면이 같은 줄을 쓴다 */
export function MeetSegment() {
  const nav = useNavigate();
  const loc = useLocation();
  const people = loc.pathname.startsWith('/people');
  const Seg = ({ on, label, to }: { on: boolean; label: string; to: string }) => (
    <button onClick={() => nav(to, { replace: true })} className={cn('flex-1 h-10 rounded-full text-[14px] font-semibold transition', on ? 'bg-primary text-white v2:bg-surface v2:text-ink' : 'text-ink-3')}>{label}</button>
  );
  return (
    <div className="mx-4 mb-3 p-1 rounded-full bg-surface-2 flex gap-1 shrink-0">
      <Seg on={!people} label={en ? 'Activities' : '모임'} to="/meet" />
      <Seg on={people} label={en ? 'People' : '사람'} to="/people" />
    </div>
  );
}

/** Meet — 학생끼리 만드는 가벼운 모임 (2026-11-02 사장님 시안) */
export function MeetPage() {
  const nav = useNavigate();
  const v = useViewer();
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const [params, setParams] = useSearchParams();
  const kind = (params.get('kind') ?? '') as MeetKind | '';
  const sel = MEET_KINDS.find((k) => k.key === kind);
  const today = todayISO();
  // 다가오는 모임 — 학생이 만든 것(조직 행사·Study Crew·할인 제외), 지난 것 제외, 시간순
  const upcoming = useMemo(() => v.visibleActivities
    .filter((a) => a.kind !== 'org_event' && !a.studyGroup && a.category !== 'store_deal' && a.category !== 'school_event')
    .filter((a) => a.date > today || (a.date === today && toMin(a.endTime || a.startTime) > nowMin()))
    .filter((a) => !sel || sel.cats.includes(a.category))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)), [v, today, sel]);
  const create = () => nav(`/create/activity?kind=group&meetup=1${kind ? `&cat=${MEET_KIND_CATEGORY[kind]}` : ''}`);
  return (
    <div className="min-h-full pb-8 bg-bg">
      <AppHeader />
      <h1 className="px-4 pt-1 pb-3 font-display text-[28px] font-extrabold tracking-tight">{en ? 'Meet' : '모임'}</h1>
      <MeetSegment />
      {status === 'loading' && <CardSkeleton />}
      {status === 'error' && <ErrorState message={error ?? undefined} onRetry={init} />}
      {status === 'ready' && (
        <div className="px-4">
          <div className="grid grid-cols-2 gap-2.5">
            {MEET_KINDS.map((k) => (
              <button key={k.key} onClick={() => setParams(kind === k.key ? {} : { kind: k.key }, { replace: true })} aria-pressed={kind === k.key}
                className={cn('rounded-[20px] h-[92px] flex flex-col items-center justify-center gap-1.5 press border-2', k.tone, kind === k.key ? 'border-primary v2:border-lime-400' : 'border-transparent')}>
                <k.Icon size={26} /><span className="text-[15px] font-bold text-ink">{k.title}</span>
              </button>
            ))}
          </div>
          <button onClick={create} className="mt-3 w-full h-12 rounded-2xl bg-primary text-white v2:text-on-primary font-semibold flex items-center justify-center gap-2 press">
            <Plus size={19} />{en ? 'Create a Meetup' : '모임 만들기'}{sel ? ` · ${sel.title}` : ''}
          </button>

          <section className="mt-6">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-[18px] font-bold">{en ? 'Upcoming Meetups' : '다가오는 모임'}{sel ? ` · ${sel.title}` : ''}</h2>
              {upcoming.length > 3 && <button onClick={() => nav('/meet/more?tab=activities')} className="text-[14px] text-primary font-semibold flex items-center gap-0.5">{en ? 'See all' : '모두 보기'}<ChevronRight size={16} /></button>}
            </div>
            {upcoming.length === 0
              ? <EmptyState emoji="" title={en ? 'No meetups yet' : '아직 모임이 없어요'} description={en ? 'Start one — coffee, study or a walk. Students nearby can join.' : '커피·스터디·산책 — 먼저 만들어 보세요. 근처 학생이 참여할 수 있어요.'} />
              : <div className="space-y-2.5">{upcoming.slice(0, 3).map((a) => <MeetupRow key={a.id} a={a} />)}</div>}
          </section>

          <section className="mt-6">
            <h2 className="text-[18px] font-bold mb-2.5">{en ? 'More ways to meet' : '다른 방법으로 만나기'}</h2>
            <div className="card rounded-[20px] divide-y divide-line">
              {[
                { Icon: Zap, label: en ? 'Who’s free right now' : '지금 공강인 사람', to: '/meet/more' },
                { Icon: Users, label: en ? 'Find teammates' : '팀원 찾기', to: '/meet/more?tab=teams' },
                { Icon: Car, label: en ? 'Rides' : '같이 타기', to: '/rides' },
                { Icon: Link2, label: en ? 'Ask friends with one link' : '링크로 친구에게 묻기', to: '/plans/new' },
              ].map((r) => (
                <button key={r.label} onClick={() => nav(r.to)} className="w-full flex items-center gap-3 px-4 h-14 text-left press">
                  <r.Icon size={19} className="text-ink-2" /><span className="flex-1 text-[15px] font-medium">{r.label}</span><ChevronRight size={17} className="text-ink-3" />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

/** 다가오는 모임 한 줄 — 사진·제목·시간·장소·실제 참여 인원 */
export function MeetupRow({ a }: { a: Activity }) {
  const nav = useNavigate();
  const v = useViewer();
  const going = v.approvedCount(a.id) + 1; // 주최자 포함
  const host = v.userById(a.hostId);
  const parts = useAppStore((s) => s.participations);
  const people = [host, ...parts.filter((p) => p.activityId === a.id && p.status === 'approved').map((p) => v.userById(p.userId))].filter(Boolean).slice(0, 4);
  return (
    <button onClick={() => nav(`/activities/${a.id}`)} className="w-full card rounded-[20px] p-3 flex gap-3 text-left press">
      <Cover emoji={a.cover.emoji} hue={a.cover.hue} url={a.cover.url} className="h-[76px] w-[76px] rounded-2xl shrink-0" size={28} />
      <span className="flex-1 min-w-0">
        <span className="block text-[15px] font-bold leading-snug line-clamp-2">{a.sample && <SampleTag />}{a.title}</span>
        <span className="flex items-center gap-1 text-[12px] text-ink-3 mt-1"><Clock size={12} />{formatDate(a.date)} · {formatTime(a.startTime)}</span>
        {a.place?.name && <span className="flex items-center gap-1 text-[12px] text-ink-3 mt-0.5 min-w-0"><MapPin size={12} className="shrink-0" /><span className="truncate">{a.place.name}</span></span>}
        <span className="flex items-center gap-1.5 mt-1.5">
          <span className="flex -space-x-1.5">{people.map((u) => u && <Avatar key={u.id} emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={20} />)}</span>
          <span className="text-[12px] text-ink-2 font-medium">{going} {en ? 'going' : '명 참여'}{a.capacity ? ` · ${en ? 'up to' : '최대'} ${a.capacity}` : ''}</span>
        </span>
      </span>
    </button>
  );
}
