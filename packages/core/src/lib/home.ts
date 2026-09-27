import type { Activity, Opportunity, User, Organization, Post } from '@core/types';
import type { Snapshot } from '@core/api/types';
import { todayISO } from './format';
import { freeBlocks, todayIdx, nowMin, coursesOn, statusNow, type Block } from './timetable';
import { nowActivities } from './discover';
import { matchScore, shareableReasons, opportunityScore, daysUntil, type Reason } from './recommend';
import { commonInterests } from './relations';
import { myNetwork, isAlumniStage } from './network';

export interface HomeToday {
  /** 오늘 수업 (시간순) */
  classes: ReturnType<typeof coursesOn>;
  /** 지금 이후 첫 공강 */
  nextFree: Block | null;
  /** 그 공강에 같이 비는 내 학교 사람 수 */
  freeTogether: number;
  /** 오늘 학교에서 일어나는 것 — 행사·동아리·공고 */
  happening: { kind: 'activity'; a: Activity }[] | { kind: 'opportunity'; o: Opportunity }[] | ({ kind: 'activity'; a: Activity } | { kind: 'opportunity'; o: Opportunity })[];
  /** 지금 주변 Meet 2~3개 */
  meets: Activity[];
  /** 만나볼 사람 2~4명 + 이유 */
  people: { u: User; reasons: Reason[] }[];
  /** 기회 3개 */
  opportunities: Opportunity[];
}

const CAMPUS_CATS = new Set(['school_event', 'club', 'performance', 'seminar', 'networking']);

/** Home(오늘 대시보드) 데이터 — 재학생·대학원생용 */
export function homeToday(snap: Snapshot, me: User, visibleActivities: Activity[], canSeeTimetable: (u: User) => boolean): HomeToday {
  const today = todayISO(); const day = todayIdx(); const now = nowMin();
  const classes = coursesOn(me.timetable, day);
  const myFree = freeBlocks(me.timetable, day).filter((b) => b.end > now);
  const nextFree = myFree[0] ? { start: Math.max(myFree[0].start, now), end: myFree[0].end } : null;
  const network = myNetwork(snap.users, me);
  const freeTogether = nextFree ? network.filter((u) => u.timetable.length && canSeeTimetable(u) && freeBlocks(u.timetable, day).some((b) => b.start <= nextFree.start + 30 && b.end >= nextFree.start + 60)).length : 0;
  const mySchool = me.affiliation.type === 'university' ? me.affiliation.schoolId : '';
  const happening: ({ kind: 'activity'; a: Activity } | { kind: 'opportunity'; o: Opportunity })[] = [
    ...visibleActivities.filter((a) => a.date === today && a.category !== 'store_deal' && (CAMPUS_CATS.has(a.category) || a.kind === 'org_event')).map((a) => ({ kind: 'activity' as const, a })),
    ...snap.opportunities.filter((o) => o.date === today && (!o.schoolId || o.schoolId === mySchool)).map((o) => ({ kind: 'opportunity' as const, o })),
  ].slice(0, 3);
  const meets = nowActivities(visibleActivities, me.id).slice(0, 3).map((x) => x.a);
  const people = network.map((u) => ({ u, ...matchScore(me, u, snap, canSeeTimetable(u)) }))
    .map((x) => ({ ...x, score: x.score + commonInterests(me, x.u).length * 0.5, reasons: shareableReasons(x.reasons) }))
    .sort((a, b) => b.score - a.score).slice(0, 4).map(({ u, reasons }) => ({ u, reasons }));
  const opportunities = snap.opportunities.filter((o) => (!o.schoolId || o.schoolId === mySchool) && (!o.deadline || daysUntil(o.deadline) >= 0))
    .map((o) => ({ o, ...opportunityScore(me, o, snap.opportunityIntents) })).sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.o);
  return { classes, nextFree, freeTogether, happening, meets, people, opportunities };
}

export interface AlumniHome {
  nearby: { u: User; reasons: Reason[] }[];
  groups: Organization[];
  upcoming: Activity[];
  posts: Post[];
  opportunities: Opportunity[];
}

/** Alumni / Professional Home — 시간표 대신 도시·직업 중심 */
export function alumniHome(snap: Snapshot, me: User, visibleActivities: Activity[], visiblePosts: Post[], canSeeTimetable: (u: User) => boolean): AlumniHome {
  const city = me.career?.city ?? me.region;
  const today = todayISO();
  const pool = snap.users.filter((u) => u.id !== me.id);
  const nearby = pool.map((u) => ({ u, ...matchScore(me, u, snap, canSeeTimetable(u)), near: (u.career?.city ?? u.region) === city || u.region === city }))
    .map((x) => ({ ...x, score: x.score + (x.near ? 2 : 0) + (isAlumniStage(x.u) ? 1 : 0) + commonInterests(me, x.u).length * 0.5, reasons: shareableReasons(x.reasons) }))
    .sort((a, b) => b.score - a.score).slice(0, 4).map(({ u, reasons }) => ({ u, reasons }));
  const groups = snap.organizations.filter((o) => o.memberIds.includes(me.id) || o.followerIds.includes(me.id)).slice(0, 3);
  const upcoming = visibleActivities.filter((a) => a.date >= today && (a.hostId === me.id || snap.participations.some((p) => p.activityId === a.id && p.userId === me.id && p.status === 'approved'))).slice(0, 3);
  const posts = visiblePosts.filter((p) => !p.sponsored).slice(0, 3);
  const opportunities = snap.opportunities.filter((o) => ['internship', 'startup', 'lab', 'event'].includes(o.type) && (!o.deadline || daysUntil(o.deadline) >= 0)).slice(0, 3);
  return { nearby, groups, upcoming, posts, opportunities };
}

export const isInClass = (me: User) => statusNow(me.timetable).kind === 'in_class';
