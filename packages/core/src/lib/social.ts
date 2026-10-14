import type { Snapshot } from '@core/api/types';
import type { Activity, ID, User, ActivityCategory, TimePoll } from '@core/types';
import { t } from '@core/i18n';
import { statusNow, todayIdx, nowMin, toHHMM } from './timetable';
import { friendsOf } from './relations';
import { AVAILABILITY_LABELS, CATEGORY_LABELS, DAILY_QUESTIONS } from './labels';
import { todayISO } from './format';

type Snap = Pick<Snapshot, 'users' | 'relationships' | 'participations' | 'proposals' | 'activities' | 'opportunities' | 'opportunityIntents' | 'organizations'> & { timePolls?: TimePoll[] };

/** Who's free 노출 조건: 친구 / 같은 기회 관심 / 같은 조직 / 새로운 사람에게 공개 */
export function whosFreeEligible(snap: Snap, me: User, u: User): { ok: boolean; why: string } {
  if (friendsOf(snap, me.id).includes(u.id)) return { ok: true, why: t('친구') };
  const myOpps = new Set(snap.opportunityIntents.filter((i) => i.userId === me.id).map((i) => i.opportunityId));
  const shared = snap.opportunityIntents.find((i) => i.userId === u.id && myOpps.has(i.opportunityId));
  if (shared) { const o = snap.opportunities.find((x) => x.id === shared.opportunityId); return { ok: true, why: o ? `${o.title}` : t('같은 행사') }; }
  const sameOrg = snap.organizations.find((o) => (o.memberIds.includes(me.id) || o.followerIds.includes(me.id)) && (o.memberIds.includes(u.id) || o.followerIds.includes(u.id)));
  if (sameOrg) return { ok: true, why: sameOrg.name };
  if (u.openToNew) return { ok: true, why: t('새로운 사람에게 공개') };
  return { ok: false, why: '' };
}

export interface FreePerson { u: User; why: string; status: string; until: number | null; want?: string; category?: ActivityCategory; minutes: number }

/** 지금 공강이거나 곧 자유로운 사람 — 정확한 시간표는 노출하지 않고 남은 공강 시간만 */
export function whosFree(snap: Snap, me: User, canSeeTimetable: (u: User) => boolean): FreePerson[] {
  const out: FreePerson[] = [];
  const now = nowMin();
  for (const u of snap.users) {
    if (u.id === me.id) continue;
    const e = whosFreeEligible(snap, me, u);
    if (!e.ok) continue;
    let status = ''; let until: number | null = null; let minutes = 0;
    if (u.timetable?.length && canSeeTimetable(u)) {
      const s = statusNow(u.timetable ?? []);
      if (s.kind === 'in_class') continue;
      if (s.kind === 'free') { until = s.until; minutes = s.until ? s.until - now : 240; status = s.until ? `${Math.floor(minutes / 60) ? `${Math.floor(minutes / 60)}${t('시간')} ` : ''}${minutes % 60 ? `${minutes % 60}${t('분')}` : ''} ${t('공강')}`.trim() : t('오늘 수업 없음'); }
      else if (s.kind === 'done') { status = t('오늘 수업 끝'); minutes = 300; }
      else continue;
    } else {
      if (u.availability === 'in_class' || u.availability === 'hidden') continue;
      if (u.availability === 'now') { status = t('지금 가능'); minutes = 120; }
      else if (u.availability === 'afternoon' || u.availability === 'after18') { status = AVAILABILITY_LABELS[u.availability]; minutes = 60; }
      else continue;
    }
    const daily = u.dailyAnswer && u.dailyAnswer.date === todayISO() ? u.dailyAnswer : undefined;
    const want = daily ? (DAILY_QUESTIONS.find((q) => q.id === daily.questionId)?.options.find((o) => o.key === daily.answer)?.label ?? daily.answer) : u.nowWant;
    const cat = daily ? ({ lunch: 'meal', coffee: 'coffee', exercise: 'exercise', new_people: 'coffee' } as Record<string, ActivityCategory>)[daily.answer] : undefined;
    out.push({ u, why: e.why, status, until, want, category: cat, minutes });
  }
  return out.sort((a, b) => b.minutes - a.minutes);
}

export type PlanItem =
  | { kind: 'rsvp'; id: string; user: User; oppId: ID; title: string; intent: string; when: string }
  | { kind: 'open_slot'; id: string; user: User; activity: Activity; joined: number; when: string }
  | { kind: 'goal'; id: string; user: User; text: string; when: string }
  | { kind: 'saved'; id: string; user: User; oppId: ID; title: string; when: string }
  | { kind: 'poll'; id: string; user: User; poll: TimePoll; voted: boolean; when: string };

/** 친구들의 계획 피드: 사진 대신 의도와 계획 */
export function planFeed(snap: Snap, me: User, visibleActivities: Activity[]): PlanItem[] {
  const friends = new Set(friendsOf(snap, me.id));
  const eligible = (u: User) => friends.has(u.id) || whosFreeEligible(snap, me, u).ok;
  const items: PlanItem[] = [];
  for (const i of snap.opportunityIntents) {
    if (i.userId === me.id) continue;
    const u = snap.users.find((x) => x.id === i.userId); const o = snap.opportunities.find((x) => x.id === i.opportunityId);
    if (!u || !o || !eligible(u)) continue;
    if (i.intent === 'interested' && !i.saved) continue;
    if (i.intent === 'interested' && i.saved) items.push({ kind: 'saved', id: i.id, user: u, oppId: o.id, title: o.title, when: i.createdAt });
    else items.push({ kind: 'rsvp', id: i.id, user: u, oppId: o.id, title: o.title, intent: i.intent, when: i.createdAt });
  }
  for (const a of visibleActivities) {
    if (a.hostId === me.id) continue;
    const u = snap.users.find((x) => x.id === a.hostId);
    if (!u || !eligible(u) || a.date < todayISO()) continue;
    if (a.kind === 'personal' || a.openSlot) items.push({ kind: 'open_slot', id: a.id, user: u, activity: a, joined: snap.participations.filter((p) => p.activityId === a.id && p.status === 'approved').length, when: a.createdAt });
  }
  for (const p of snap.timePolls ?? []) {
    if (p.status !== 'open' || p.hostId === me.id || !p.inviteeIds.includes(me.id)) continue;
    const u = snap.users.find((x) => x.id === p.hostId); if (!u) continue;
    items.push({ kind: 'poll', id: p.id, user: u, poll: p, voted: !!p.votes[me.id], when: p.createdAt });
  }
  for (const u of snap.users) {
    if (u.id === me.id || !friends.has(u.id)) continue;
    const g = (u.goals ?? []).find((x) => ['hobby', 'start_club', 'startup', 'hackathon'].includes(x));
    if (g) items.push({ kind: 'goal', id: `g_${u.id}`, user: u, text: g, when: u.createdAt });
  }
  return items.sort((a, b) => b.when.localeCompare(a.when));
}

/** 집계된 캠퍼스 움직임 — 개인 위치는 절대 노출하지 않는다 */
export function campusPulse(snap: Snap, schoolId: string, visibleActivities: Activity[]) {
  const students = snap.users.filter((u) => u.affiliation.type === 'university' && u.affiliation.schoolId === schoolId);
  const freeNow = students.filter((u) => u.timetable?.length ? statusNow(u.timetable ?? []).kind === 'free' : u.availability === 'now').length;
  const today = todayISO();
  const lunch = visibleActivities.filter((a) => a.date === today && (a.category === 'meal' || a.category === 'coffee')).length;
  const teams = visibleActivities.filter((a) => a.rolesNeeded && a.rolesNeeded.length > 0 && a.date >= today).length;
  const byOpp = new Map<ID, number>();
  snap.opportunityIntents.forEach((i) => byOpp.set(i.opportunityId, (byOpp.get(i.opportunityId) ?? 0) + 1));
  const top = [...byOpp.entries()].sort((a, b) => b[1] - a[1])[0];
  const topOpp = top ? snap.opportunities.find((o) => o.id === top[0]) : undefined;
  const companySeeking = snap.opportunityIntents.filter((i) => i.intent === 'company' || i.intent === 'solo').length;
  // 데모 배율: 실제 서비스에서는 서버 집계값
  const scale = 17;
  return { freeNow: freeNow * scale + 3, lunch: lunch * 2 + 4, topOpp, topCount: (top?.[1] ?? 0) * 8 + 6, teams: teams * 3, companySeeking: companySeeking * 4 };
}

/** 공강 블록에 끼워 넣을 추천: 그 시간에 열려 있는 활동, 점심 찾는 사람 */
export function slotSuggestions(snap: Snap, me: User, visibleActivities: Activity[], block: { start: number; end: number }, day = todayIdx(), canSeeTimetable?: (u: User) => boolean) {
  const today = todayISO();
  const inBlock = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); const v = h * 60 + m; return v >= block.start - 15 && v < block.end; };
  const acts = day === todayIdx() ? visibleActivities.filter((a) => a.date === today && inBlock(a.startTime) && a.hostId !== me.id) : [];
  const people = day === todayIdx() ? whosFree(snap, me, canSeeTimetable ?? (() => true)).filter((p) => p.until === null || p.until > block.start) : [];
  return { acts, people, label: `${toHHMM(block.start)}–${toHHMM(block.end)}` };
}

export const categoryLabel = (c: ActivityCategory) => CATEGORY_LABELS[c];
