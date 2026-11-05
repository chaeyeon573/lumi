import { useNavigate } from 'react-router-dom';
import { lang } from '@core/i18n';
import type { Activity, ID, Participation, User } from '@core/types';
import { MeetupCard } from '@/components/ha';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { formatDate, formatTime, todayISO } from '@core/lib/format';
import { nowMin, toMin } from '@core/lib/timetable';
import { audienceFits } from '@core/lib/meetups';
import { kindOf } from './meetupKinds';

const en = lang === 'en';

/** 아직 끝나지 않았는지 */
export const notOver = (a: Pick<Activity, 'date' | 'startTime' | 'endTime'>, today = todayISO(), now = nowMin()) =>
  a.date > today || (a.date === today && toMin(a.endTime || a.startTime) > now);

/**
 * 학생끼리 여는 모임 목록 — 동아리 행사·학교 행사·할인은 빼고(Explore 에 있다), 끝난 것은 빼고, 시간순.
 * 참가할 수 없는 학적의 모임은 내가 이미 들어간 것이 아니면 숨긴다 (누를 수 없는 카드를 늘어놓지 않게).
 * Lumi 가 제안만 한 스터디 그룹은 useViewer 가 이미 뺐다 (모인 것은 My Classes 에).
 */
export function studentMeetups(list: Activity[], me: User, parts: Participation[]): Activity[] {
  const today = todayISO(); const now = nowMin();
  const mine = new Set(parts.filter((p) => p.userId === me.id && p.status !== 'cancelled' && p.status !== 'rejected').map((p) => p.activityId));
  return list
    .filter((a) => a.kind !== 'org_event' && a.category !== 'store_deal' && a.category !== 'school_event' && notOver(a, today, now))
    .filter((a) => a.hostId === me.id || mine.has(a.id) || audienceFits(a, me))
    .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`));
}

/** 함께하는 사람 — 연 사람 + 승인된 참가자 (실제 사람만) */
export function goingPeople(a: Activity, parts: Participation[], userById: (id?: ID) => User | undefined): User[] {
  return [a.hostId, ...parts.filter((p) => p.activityId === a.id && p.status === 'approved').map((p) => p.userId)]
    .map((id) => userById(id)).filter((u): u is User => !!u);
}

/** "Sat 3 PM" / "Today 3 PM" */
export const whenText = (a: Pick<Activity, 'date' | 'startTime'>) => `${formatDate(a.date)} · ${formatTime(a.startTime)}`;

/** 모임 카드 (PDF S037·S038·S049) — 종류 배지·색, 장소·시간, 함께하는 얼굴, View meetup */
export function MeetupItem({ a }: { a: Activity }) {
  const nav = useNavigate();
  const v = useViewer();
  const parts = useAppStore((s) => s.participations);
  const k = kindOf(a);
  const people = goingPeople(a, parts, v.userById);
  const foot = a.sample ? (en ? 'Sample meetup' : '예시 모임') : `${people.length} ${en ? 'going' : '명 참여'}`;
  return (
    <MeetupCard tone={k.tone} icon={<k.Icon size={22} />} badge={k.label} title={a.title}
      meta={[a.place?.name, whenText(a)].filter(Boolean).join(' · ')}
      people={people} footnote={foot} action={en ? 'View meetup' : '모임 보기'} onClick={() => nav(`/activities/${a.id}`)} />
  );
}
