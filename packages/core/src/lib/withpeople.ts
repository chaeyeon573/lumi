/**
 * "정보는 이유, 사람이 핵심" — 공고·행사마다 누가 함께하는지 보여주는 규칙.
 *
 * - 어떤 공고에 어떤 행동(같이 가기 / 같이 준비 / 팀원 찾기)을 붙일지 (withKindOf)
 * - 다른 사람의 의사 표시(OpportunityIntentRecord) 중 내가 볼 수 있는 것 (visibleIntents)
 *   → 상세 페이지의 "함께할 사람" 목록과 같은 규칙: 사용자 정보가 있고, 어느 쪽이든 차단 관계가 아닌 사람
 * - 목록 한 줄 요약 "Lily, Maya +1 going" (socialSummary)
 * - 오늘의 질문 집계 — 같은 학교에서 5명 이상 답해야 비율을 보여준다 (dailyTally)
 *
 * 화면(BrowseTab·Discover·상세·피드)과 엔진(같이 가기 모임 찾기)이 같은 함수를 쓴다.
 */
import type { Snapshot } from '@core/api/types';
import type { Activity, ID, Opportunity, OpportunityIntent, OpportunityIntentRecord, Participation, User } from '@core/types';
import { lang } from '@core/i18n';
import { categoriesOf, campusDate } from './listings';
import { canViewActivity, isBlocked, isFriend } from './relations';

/** go = 행사·무료 음식 (같이 가기) · prep = 인턴·장학금·연구 (같이 준비) · team = 해커톤·공모전 (팀원 찾기) */
export type WithKind = 'go' | 'prep' | 'team';

export function withKindOf(o: Pick<Opportunity, 'type' | 'title' | 'tags'>): WithKind {
  if (o.type === 'hackathon' || categoriesOf(o).includes('hackathon')) return 'team';
  if (o.type === 'event' || o.type === 'activity' || o.type === 'club') return 'go';
  if (o.type === 'startup') return 'team';
  return 'prep';
}

/** 같이 가기 모임을 만나는 시각 — 행사 시작 몇 분 전 */
export const MEET_BEFORE_MIN = 5;
/** 같이 가기 모임 정원 (작은 모임). 차면 다음 사람이 새 모임을 연다 */
export const MEETUP_CAPACITY = 8;
/** 오늘의 질문 — 같은 학교에서 이만큼 답해야 비율을 보여준다 (한두 명의 답이 드러나지 않게) */
export const DAILY_MIN_ANSWERS = 5;

export const GOING_INTENTS: OpportunityIntent[] = ['going', 'solo', 'company'];

const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const toHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
/** 행사 시작 시각 → 만나는 시각 (자정을 넘기지 않게) */
export const meetTimeFor = (startTime: string) => toHHMM(Math.max(0, toMin(startTime) - MEET_BEFORE_MIN));
/** 오늘 (캠퍼스 시간) */
export const campusToday = () => campusDate(new Date().toISOString());

/** 지금 캠퍼스 시각 (분) */
export function campusNowMin(): number {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const get = (k: string) => Number(parts.find((p) => p.type === k)?.value ?? 0);
  return get('hour') * 60 + get('minute');
}

/**
 * 같이 가기를 바로 열 수 있는 행사인지 — 날짜와 시작 시각이 있고 아직 시작하지 않았다.
 * 00:00 은 목록에서 '종일'로 들어온 시각이라 만날 시간을 정할 수 없다.
 */
export function canGoTogether(o: Pick<Opportunity, 'type' | 'title' | 'tags' | 'date' | 'startTime'>): boolean {
  if (withKindOf(o) !== 'go' || !o.date || !o.startTime || !/^\d{2}:\d{2}$/.test(o.startTime) || o.startTime === '00:00') return false;
  const day = campusDate(o.date); const today = campusToday();
  return day > today || (day === today && toMin(o.startTime) > campusNowMin());
}

type Snap = Pick<Snapshot, 'users' | 'relationships' | 'participations' | 'proposals' | 'activities' | 'opportunityIntents'>;

export interface SeenIntent { i: OpportunityIntentRecord; u: User }

/** 이 공고에 대한 다른 사람의 의사 표시 중 내가 볼 수 있는 것 (상세 페이지 목록과 같은 규칙) */
export function visibleIntents(snap: Snap, me: User, opportunityId: ID): SeenIntent[] {
  const out: SeenIntent[] = [];
  for (const i of snap.opportunityIntents) {
    if (i.opportunityId !== opportunityId || i.userId === me.id) continue;
    const u = snap.users.find((x) => x.id === i.userId);
    if (!u || isBlocked(snap, me.id, u.id)) continue;
    out.push({ i, u });
  }
  return out;
}

/** 이 공고에 연결된 같이 가기 모임 / 준비 모임 중 내가 볼 수 있는 것 */
export function crewsFor(snap: Snap, me: User, opportunityId: ID, crew: 'go' | 'prep'): Activity[] {
  return snap.activities.filter((a) => a.opportunityId === opportunityId
    && (crew === 'go' ? a.listingCrew === 'go' : a.listingCrew !== 'go')
    && !isBlocked(snap, me.id, a.hostId) && canViewActivity(snap, me, a));
}

const approvedIn = (parts: Participation[], activityId: ID) => parts.filter((p) => p.activityId === activityId && p.status === 'approved').map((p) => p.userId);
/** 모임에 들어와 있는 사람 (주최자 + 승인된 참가자) */
export const crewMembers = (snap: Pick<Snapshot, 'participations'>, a: Activity): ID[] => [...new Set([a.hostId, ...approvedIn(snap.participations, a.id)])];

/** 내가 들어가 있는 같이 가기 모임 */
export function myGoCrew(snap: Snap, me: User, opportunityId: ID): Activity | undefined {
  return crewsFor(snap, me, opportunityId, 'go').find((a) => crewMembers(snap, a).includes(me.id));
}

/** 같이 가는 사람 — 의사 표시(going·solo·company) + 같이 가기 모임에 들어간 사람. 나는 빼고 */
export function goingPeople(snap: Snap, me: User, opportunityId: ID): User[] {
  const seen = visibleIntents(snap, me, opportunityId);
  const ids = new Set(seen.filter((x) => GOING_INTENTS.includes(x.i.intent)).map((x) => x.u.id));
  for (const a of crewsFor(snap, me, opportunityId, 'go')) for (const id of crewMembers(snap, a)) if (id !== me.id) ids.add(id);
  return [...ids].map((id) => snap.users.find((u) => u.id === id)).filter((u): u is User => !!u && !isBlocked(snap, me.id, u.id));
}

/** 학과 짧은 이름 — "Computer Science" → "CS", "Electrical Engineering and Computer Sciences" → "EECS" */
export function deptShort(dept: string): string {
  const words = dept.split(/[\s&,/-]+/).filter(Boolean);
  if (words.length <= 1) return dept;
  const caps = words.filter((w) => /^[A-Z]/.test(w));
  return caps.length >= 2 ? caps.map((w) => w[0]).join('') : dept;
}

const deptOf = (u: User) => (u.affiliation.type === 'university' && u.affiliation.showDepartment ? u.affiliation.department : '');

export interface SocialSummary {
  kind: WithKind;
  /** 얼굴로 보여줄 사람 (최대 3) — 친구 먼저 */
  faces: User[];
  /** "Lily, Maya +1 going" · "2 CS students saved this" · "3 looking for a team". 아무도 없으면 '' */
  text: string;
  /** 얼굴·이름 중에 예시 프로필이 있다 — 화면은 'Sample' 표시를 붙인다 */
  sample: boolean;
  /** 버튼 문구 */
  cta: string;
  /** 아무도 없을 때 — 목록은 사람 줄을 아예 숨긴다 ("Be the first"를 줄마다 붙이면 앱이 비어 보인다) */
  first: boolean;
}

const CTA: Record<WithKind, [string, string]> = { go: ['Go together', '같이 가기'], prep: ['Prep together', '같이 준비'], team: ['Find teammates', '팀원 찾기'] };

/** 이름 두 개 + 나머지 숫자: "Lily, Maya +1" (내가 들어 있으면 "You + Lily") */
function names(people: User[], withMe: boolean, en: boolean): string {
  const you = en ? 'You' : '나';
  const shown = people.slice(0, withMe ? 1 : 2).map((u) => u.nickname);
  const rest = people.length - shown.length;
  const head = withMe ? [you, ...shown].join(' + ') : shown.join(', ');
  return rest > 0 ? `${head} +${rest}` : head;
}

/** 목록 한 줄 — 얼굴 + 문장 + 버튼 */
export function socialSummary(snap: Snap, me: User, o: Opportunity, en = lang === 'en'): SocialSummary {
  const kind = withKindOf(o);
  const seen = visibleIntents(snap, me, o.id);
  const mine = snap.opportunityIntents.find((i) => i.opportunityId === o.id && i.userId === me.id);
  const friendFirst = (xs: User[]) => [...xs].sort((a, b) => Number(isFriend(snap, me.id, b.id)) - Number(isFriend(snap, me.id, a.id)));
  const pick = (pred: (i: OpportunityIntentRecord) => boolean) => friendFirst(seen.filter((x) => pred(x.i)).map((x) => x.u));
  let group: User[] = []; let text = ''; let meIn = false;

  if (kind === 'go') {
    group = friendFirst(goingPeople(snap, me, o.id));
    meIn = !!mine && GOING_INTENTS.includes(mine.intent) || !!myGoCrew(snap, me, o.id);
    if (group.length) text = `${names(group, meIn, en)} ${en ? 'going' : '갈 예정'}`;
  } else if (kind === 'team') {
    group = pick((i) => i.intent === 'team');
    meIn = mine?.intent === 'team';
    if (group.length) text = en ? `${group.length} looking for a team` : `${group.length}명이 팀을 찾는 중`;
    else { group = pick((i) => GOING_INTENTS.includes(i.intent)); if (group.length) text = `${names(group, false, en)} ${en ? 'going' : '참가 예정'}`; }
  } else {
    group = pick((i) => i.intent === 'applied');
    meIn = mine?.intent === 'applied';
    if (group.length) text = `${names(group, meIn, en)} ${en ? 'applied' : '지원함'}`;
  }
  if (!group.length && meIn) {
    // 나만 — 아직 아무도 없지만 나는 표시했다
    const mineText: Record<WithKind, [string, string]> = { go: ["You're going", '나 갈 예정'], team: ["You're looking for a team", '나 팀 찾는 중'], prep: ['You applied', '나 지원함'] };
    return { kind, faces: [], text: mineText[kind][en ? 0 : 1], sample: false, cta: kind === 'go' ? (en ? "You're in" : '참여 중') : CTA[kind][en ? 0 : 1], first: false };
  }
  if (!group.length) {
    // 아직 가거나 지원한 사람은 없지만 저장·관심 표시한 사람
    group = pick((i) => i.saved || i.intent === 'interested' || GOING_INTENTS.includes(i.intent) || i.intent === 'applied');
    meIn = false;
    if (group.length) {
      const d = deptOf(me);
      const sameDept = !!d && group.every((u) => deptOf(u) === d && u.affiliation.type === 'university' && me.affiliation.type === 'university' && u.affiliation.schoolId === me.affiliation.schoolId);
      const verb = kind === 'go' ? (en ? 'interested' : '관심') : (en ? 'saved this' : '저장함');
      if (group.length === 1) text = `${group[0].nickname} ${verb}`;
      else if (sameDept) text = en ? `${group.length} ${deptShort(d)} students ${verb}` : `${deptShort(d)} 학생 ${group.length}명 ${verb}`;
      else text = en ? `${group.length} ${kind === 'go' ? 'interested' : 'students saved this'}` : `${group.length}명 ${verb}`;
    }
  }
  const faces = group.slice(0, 3);
  // 이름이 드러나는 사람 중에 예시 프로필이 있으면 표시한다 (얼굴 3명 = 이름이 나오는 사람 포함)
  const sample = faces.some((u) => u.sample);
  const first = group.length === 0;
  const cta = meIn && kind === 'go' ? (en ? "You're in" : '참여 중') : meIn && kind === 'team' ? (en ? 'Your team list' : '팀 찾기 목록') : CTA[kind][en ? 0 : 1];
  return { kind, faces, text, sample, cta, first };
}

// ─── 오늘의 질문 집계 ──────────────────────────────────────────────────────
export interface DailyTally { total: number; counts: Record<string, number> }

/**
 * 같은 학교 사람들의 오늘 답을 센다. 예시 프로필은 세지 않는다 (가짜 답이 실제 비율인 척하지 않게) — 단, 본인은 센다.
 * 개인의 답은 돌려주지 않는다. 비율을 보여줄지는 DAILY_MIN_ANSWERS 로 부르는 쪽이 정한다.
 */
export function dailyTally(users: User[], schoolId: ID, questionId: string, date: string, viewerId?: ID): DailyTally {
  const counts: Record<string, number> = {};
  let total = 0;
  for (const u of users) {
    if (u.affiliation.type !== 'university' || u.affiliation.schoolId !== schoolId) continue;
    if (u.sample && u.id !== viewerId) continue;
    const a = u.dailyAnswer;
    if (!a || a.questionId !== questionId || a.date !== date) continue;
    counts[a.answer] = (counts[a.answer] ?? 0) + 1;
    total++;
  }
  return { total, counts };
}

/** 퍼센트 (합이 100이 되게 가장 큰 나머지 방식) */
export function percentages(counts: Record<string, number>, keys: string[]): Record<string, number> {
  const total = keys.reduce((s, k) => s + (counts[k] ?? 0), 0);
  if (!total) return Object.fromEntries(keys.map((k) => [k, 0]));
  const raw = keys.map((k) => ({ k, v: ((counts[k] ?? 0) * 100) / total }));
  const out = Object.fromEntries(raw.map((r) => [r.k, Math.floor(r.v)]));
  let left = 100 - Object.values(out).reduce((s, v) => s + v, 0);
  for (const r of [...raw].sort((a, b) => (b.v % 1) - (a.v % 1))) { if (left <= 0) break; if (r.v > 0) { out[r.k]++; left--; } }
  return out;
}
