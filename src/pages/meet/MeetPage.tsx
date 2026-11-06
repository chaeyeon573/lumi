import { ClubItem } from '@/pages/explore/ExploreItems';
import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Coffee, BookOpen, Dumbbell, Sparkles, Plus, MapPin, Clock, CalendarDays, UtensilsCrossed, Search } from 'lucide-react';
import { TONE, Btn, Chip, ChipRow, EmptyState, EmptyCard, RowCard, SectionHeader } from '@/components/ha';
import { lang } from '@core/i18n';
import { SocialShell } from '@/pages/social/SocialPage';
import { Cover, Avatar } from '@/components/ui';
import { isUploadedPhoto } from '@core/lib/assets';
import { SampleTag } from '@/components/ui/SampleTag';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { formatDate, formatTime } from '@core/lib/format';
import { ORG_TYPE_LABELS } from '@core/lib/labels';
import { myGroups } from '@core/lib/meetups';
import { MeetupItem, studentMeetups } from '@/components/social/MeetupBits';
import { CampusStart } from '@/components/people/CampusStart';
import type { Activity, ActivityCategory, ID, Place } from '@core/types';

const en = lang === 'en';

/** 모임 종류 — 예전 만들기 양식(CreateActivityPage)이 쓴다. 새 화면은 @/components/social/meetupKinds */
export const MEET_KINDS = [
  { key: 'coffee', cats: ['coffee', 'meal'] as ActivityCategory[], title: en ? 'Coffee' : '커피·밥', Icon: Coffee, tone: TONE.peach },
  { key: 'study', cats: ['study', 'seminar'] as ActivityCategory[], title: en ? 'Study' : '스터디', Icon: BookOpen, tone: TONE.ice },
  { key: 'workout', cats: ['exercise'] as ActivityCategory[], title: en ? 'Workout' : '운동', Icon: Dumbbell, tone: TONE.mint },
  { key: 'hangout', cats: ['etc', 'performance', 'club', 'networking'] as ActivityCategory[], title: en ? 'Hangout' : '같이 놀기', Icon: Sparkles, tone: TONE.rose },
] as const;
export type MeetKind = typeof MEET_KINDS[number]['key'];
/** 모임 만들기에서 고른 종류 → 활동 분류 */
export const MEET_KIND_CATEGORY: Record<MeetKind, ActivityCategory> = { coffee: 'coffee', study: 'study', workout: 'exercise', hangout: 'etc' };

type Filter = 'all' | 'groups' | 'classes' | 'nearby';
/** "Nearby" — 실시간 위치는 쓰지 않는다. 모임 장소가 캠퍼스 중심에서 이 거리 안이면 가까운 순으로 */
const NEARBY_KM = 1.5;
const km = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const r = Math.PI / 180; const x = (b.lng - a.lng) * r * Math.cos(((a.lat + b.lat) / 2) * r); const y = (b.lat - a.lat) * r;
  return Math.sqrt(x * x + y * y) * 6371;
};
const physical = (p?: Place) => !!p && !!p.lat && !!p.lng && !/online|zoom/i.test(p.name);

/** 내 그룹·내 수업에 묶인 모임인지 (공개 범위 'org:<id>' / 'course:<수업>', 동아리가 연 것, Study Crew, Lumi 스터디 그룹) */
export function meetupScope(a: Activity, groupIds: Set<ID>, courses: Set<string>) {
  const tg = a.visibilityTargets ?? [];
  return {
    group: (!!a.orgId && groupIds.has(a.orgId)) || tg.some((x) => x.startsWith('org:') && groupIds.has(x.slice(4))),
    cls: !!a.studyGroup || (!!a.courseName && courses.has(a.courseName)) || tg.some((x) => x.startsWith('course:') && courses.has(x.slice(7))),
  };
}

/** Social › Meetups (PDF S038 · 비었을 때 S042) — Better together + Create, 칩 All · My Groups · My Classes · Nearby, 모임 카드, Your groups */
export function MeetPage() {
  const nav = useNavigate();
  const v = useViewer();
  const parts = useAppStore((s) => s.participations);
  const orgs = useAppStore((s) => s.organizations);
  const schools = useAppStore((s) => s.schools);
  const [params, setParams] = useSearchParams();
  const f = (['groups', 'classes', 'nearby'].includes(params.get('f') ?? '') ? params.get('f') : 'all') as Filter;
  const setF = (x: Filter) => setParams(x === 'all' ? {} : { f: x }, { replace: true });
  const groups = useMemo(() => myGroups(orgs, v.me.id), [orgs, v.me.id]);
  const all = useMemo(() => studentMeetups(v.visibleActivities, v.me, parts), [v, parts]);
  const center = schools.find((s) => v.me.affiliation.type === 'university' && s.id === v.me.affiliation.schoolId)?.center;
  const shown = useMemo(() => {
    const gIds = new Set(groups.map((o) => o.id)); const courses = new Set(v.me.timetable.map((c) => c.name));
    if (f === 'groups') return all.filter((a) => meetupScope(a, gIds, courses).group);
    if (f === 'classes') return all.filter((a) => meetupScope(a, gIds, courses).cls);
    if (f === 'nearby') return center ? all.filter((a) => physical(a.place) && km(center, a.place) <= NEARBY_KM).sort((a, b) => km(center, a.place) - km(center, b.place)) : [];
    return all;
  }, [all, f, groups, v.me.timetable, center]);
  const create = () => nav('/meetups/new');

  const yourGroups = (
    <section className="mt-7">
      <SectionHeader title={en ? 'Your groups' : '내 그룹'} />
      <div className="space-y-3">
        {groups.slice(0, 4).map((o) => (
          // text only unless the club has a real logo (owner 2026-11-06 — no icon block)
          <ClubItem key={o.id} o={o} sub={[ORG_TYPE_LABELS[o.type], o.adminIds.includes(v.me.id) ? (en ? 'Officer' : '운영진') : (en ? 'Member' : '회원')].join(' · ')} onClick={() => nav(`/orgs/${o.id}`)} />
        ))}
        {!groups.length && <RowCard tone="mint" icon={<Search size={20} />} title={en ? 'Find your groups' : '내 그룹 찾기'} sub={en ? 'Clubs, labs and communities on campus' : '동아리·연구실·커뮤니티'} onClick={() => nav('/explore/clubs')} />}
        <RowCard tone="rose" icon={<UtensilsCrossed size={20} />} title={en ? 'Small Tables' : '작은 테이블'} sub={en ? 'Small plans, good company' : '작은 약속, 좋은 사람들'} onClick={() => nav('/social/small-tables')} />
      </div>
    </section>
  );

  if (!all.length) return (
    <SocialShell>
      <EmptyState icon={<CalendarDays size={30} />} tone="rose" title={en ? 'Make the first plan' : '첫 약속을 만들어요'} sub={en ? 'A little company goes a long way.' : '작은 만남이 큰 힘이 돼요.'}
        action={{ label: en ? 'Create Meetup' : '모임 만들기', onClick: create }} />
      {yourGroups}
      <CampusStart parts={['week', 'classes']} className="mt-7" />
    </SocialShell>
  );
  return (
    <SocialShell>
      <div className="flex items-center justify-between gap-3">
        <h2 className="ha-h2">{en ? 'Better together' : '함께하면 더 좋아요'}</h2>
        <Btn size="sm" icon={<Plus size={16} />} onClick={create}>{en ? 'Create' : '만들기'}</Btn>
      </div>
      <ChipRow className="mt-4">
        {([['all', en ? 'All' : '전체'], ['groups', en ? 'My Groups' : '내 그룹'], ['classes', en ? 'My Classes' : '내 수업'], ['nearby', en ? 'Nearby' : '가까운']] as const)
          .map(([key, label]) => <Chip key={key} active={f === key} onClick={() => setF(key)}>{label}</Chip>)}
      </ChipRow>
      <div className="space-y-3 mt-4">
        {shown.slice(0, 12).map((a) => <MeetupItem key={a.id} a={a} />)}
        {!shown.length && <EmptyCard
          title={f === 'groups' ? (en ? 'No group meetups yet' : '그룹 모임이 아직 없어요') : f === 'classes' ? (en ? 'No class meetups yet' : '수업 모임이 아직 없어요') : (en ? 'Nothing near campus right now' : '캠퍼스 근처 모임이 없어요')}
          sub={f === 'groups' ? (en ? 'Plan one just for your group.' : '그룹만 보는 모임을 열어 보세요.') : f === 'classes' ? (en ? 'Plan one just for your classmates.' : '같은 수업 사람만 보는 모임을 열어 보세요.') : (en ? 'Meetups show here by where they happen.' : '모임 장소 기준으로 보여요.')}
          secondary={{ label: en ? 'Create Meetup' : '모임 만들기', onClick: () => nav(f === 'groups' ? '/meetups/new?reach=groups' : f === 'classes' ? '/meetups/new?reach=class' : '/meetups/new') }} />}
      </div>
      {yourGroups}
    </SocialShell>
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
      {isUploadedPhoto(a.cover.url) && <Cover emoji="" hue={0} url={a.cover.url} className="h-[76px] w-[76px] rounded-2xl shrink-0" size={28} />}
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
