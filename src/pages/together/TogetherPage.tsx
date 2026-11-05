import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, CalendarPlus, Check, Clock, MapPin, MessageCircle, Sparkles, Users } from 'lucide-react';
import { lang } from '@core/i18n';
import type { TimePoll, User } from '@core/types';
import { api } from '@core/api';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { tally, optionLabel } from '@core/lib/together';
import { mondayOf, placeTally, votersOf } from '@core/lib/pollgrid';
import { planIcs } from '@core/lib/plans';
import { courseTermOf, nowTermLabel } from '@core/lib/classmates';
import { jsDayToIdx, toMin } from '@core/lib/timetable';
import { formatDate, formatTime, todayISO } from '@core/lib/format';
import { BottomSheet, Avatar } from '@/components/ui';
import { PollGrid } from '@/components/timetable/PollGrid';
import { BackHeader, PageTitle, BottomCTA, Btn, RowCard, SegTabs, InfoNote, InfoRows, EmptyState, SectionHeader, AvatarStack, cardCls } from '@/components/ha';
import { rangeLabel } from '@/pages/schedule/ScheduleTab';
import { cn } from '@core/lib/cn';

const en = lang === 'en';
export const durationText = (m: number) => (en ? (m === 30 ? '30 min' : m === 60 ? '1 hour' : `${m / 60} hours`) : m === 30 ? '30분' : `${m / 60}시간`);
/** "Wednesday · 2:00–3:00 PM" */
export const longWhen = (date: string, start: string, end: string) => {
  const day = new Date(`${date}T12:00:00`).toLocaleDateString(en ? 'en-US' : 'ko-KR', { weekday: 'long', month: 'short', day: 'numeric' });
  return `${day} · ${formatTime(start)}–${formatTime(end)}`;
};

/** 투표에 든 사람 (주최자 먼저) */
export function pollPeople(poll: TimePoll, userById: (id: string) => User | undefined): User[] {
  return [poll.hostId, ...poll.inviteeIds].map(userById).filter((u): u is User => !!u);
}
/** "You, Ana +2" / "Hosted by Ana · 4 people" */
export function groupTitle(poll: TimePoll, people: User[], meId: string): string {
  const host = people.find((u) => u.id === poll.hostId);
  if (poll.hostId === meId) return en ? `You + ${people.length - 1} ${people.length === 2 ? 'person' : 'people'}` : `나 + ${people.length - 1}명`;
  return en ? `${host?.nickname ?? 'Someone'}’s group · ${people.length}` : `${host?.nickname ?? ''}님의 그룹 · ${people.length}명`;
}

/** 이 투표를 볼 수 있는지 + 공통 머리 (못 보면 빈 화면) */
export function usePoll(id: string | undefined) {
  const v = useViewer();
  const poll = useAppStore((s) => s.timePolls.find((p) => p.id === id));
  const allowed = !!poll && (poll.hostId === v.me.id || poll.inviteeIds.includes(v.me.id));
  return { poll: allowed ? poll : undefined, missing: !poll, v };
}

export function PollGone({ title, missing }: { title: string; missing: boolean }) {
  const nav = useNavigate();
  return (
    <div className="min-h-full bg-bg">
      <BackHeader title={title} />
      <EmptyState icon={<CalendarDays size={28} />} title={missing ? (en ? 'This poll is gone' : '없는 투표예요') : (en ? 'Only invited people can see this' : '초대받은 사람만 볼 수 있어요')}
        action={{ label: en ? 'My Plans' : '내 약속', onClick: () => nav('/schedule/plans') }} />
    </div>
  );
}

/**
 * /together/:id — 시간 투표.
 *   열려 있으면 Time poll (PDF S036): 그룹 줄, Availability · Places 밑줄 탭, 되는 칸 고르기 → Submit My Availability.
 *   주최자에게는 Find a Time(S034)으로 가는 줄이 하나 더 있다.
 *   확정되면 Plan Confirmed (PDF S035).
 */
export function TogetherPage() {
  const { id } = useParams();
  const { poll, missing } = usePoll(id);
  if (!poll) return <PollGone title={en ? 'Time poll' : '시간 투표'} missing={missing} />;
  if (poll.link) return (
    <div className="min-h-full bg-bg"><BackHeader title={poll.title} />
      <EmptyState icon={<CalendarDays size={28} />} title={en ? 'This plan was shared with a link' : '링크로 묻는 약속이에요'} sub={en ? 'Answers for link plans come in through the invite link.' : '링크로 답을 받는 약속이에요.'} /></div>
  );
  if (poll.status === 'decided') return <PlanConfirmed poll={poll} />;
  return <TimePollView poll={poll} />;
}

function TimePollView({ poll }: { poll: TimePoll }) {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const me = v.me;
  const isHost = poll.hostId === me.id;
  const people = pollPeople(poll, v.userById);
  const [tab, setTab] = useState<'times' | 'places'>('times');
  const [sel, setSel] = useState<Set<string>>(new Set(poll.votes[me.id] ?? []));
  const [places, setPlaces] = useState<Set<string>>(new Set(poll.placeVotes?.[me.id] ?? []));
  const [who, setWho] = useState(false);
  const [busy, setBusy] = useState(false);
  // 다른 기기에서 바꾼 내 표가 들어오면 따라간다
  const myVotesKey = (poll.votes[me.id] ?? []).join(',');
  const myPlacesKey = (poll.placeVotes?.[me.id] ?? []).join(',');
  useEffect(() => { setSel(new Set(poll.votes[me.id] ?? [])); }, [myVotesKey]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setPlaces(new Set(poll.placeVotes?.[me.id] ?? [])); }, [myPlacesKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const others = useMemo(() => {
    const m = new Map<string, number>();
    for (const [uid, ids] of Object.entries(poll.votes)) if (uid !== me.id) for (const x of ids) m.set(x, (m.get(x) ?? 0) + 1);
    return m;
  }, [poll.votes, me.id]);
  const same = (a: Set<string>, b: string[]) => a.size === b.length && b.every((x) => a.has(x));
  const timesDirty = !same(sel, poll.votes[me.id] ?? []);
  const placesDirty = !same(places, poll.placeVotes?.[me.id] ?? []);
  const answered = (poll.votes[me.id] ?? []).length > 0;
  const weekStart = poll.window?.weekStart ?? (poll.options[0] ? mondayOf(poll.options[0].date) : todayISO());
  const minutes = poll.window?.minutes ?? 0;
  const pt = placeTally(poll);
  // 내 이번 학기 수업과 겹치는 칸 — 나에게만 보이는 표시 (다른 사람 시간표는 쓰지 않는다)
  const classCells = useMemo(() => {
    const term = nowTermLabel();
    const mine = (me.timetable ?? []).filter((c) => courseTermOf(c) === term);
    return new Set(poll.options.filter((o) => { const day = jsDayToIdx(new Date(`${o.date}T12:00:00`).getDay()); return mine.some((c) => c.day === day && toMin(c.start) < toMin(o.endTime) && toMin(o.startTime) < toMin(c.end)); }).map((o) => o.id));
  }, [poll.options, me.timetable]);
  const toggle = (set: Set<string>, x: string) => { const n = new Set(set); if (n.has(x)) n.delete(x); else n.add(x); return n; };
  const submit = async () => {
    setBusy(true);
    try {
      await run(async () => {
        let patch = timesDirty || !answered ? await api.together.vote(poll.id, me.id, [...sel]) : {};
        if (placesDirty && poll.placeOptions?.length) patch = { ...patch, ...(await api.together.votePlace(poll.id, me.id, [...places])) };
        return patch;
      }, en ? 'Saved — the group sees your times' : '저장했어요');
    } catch { /* toast */ } finally { setBusy(false); }
  };
  const t = tally(poll);
  return (
    <div className="min-h-full flex flex-col bg-bg">
      <BackHeader title={en ? 'Time poll' : '시간 투표'} />
      <PageTitle title={en ? 'Time poll' : '시간 투표'} className="pb-1" />
      <div className="px-4 pb-6 flex-1">
        <h2 className="text-[24px] font-extrabold tracking-[-0.02em] leading-tight mb-3 [overflow-wrap:anywhere]">{poll.title}</h2>
        <RowCard tone="ice" icon={<Users size={22} />} title={groupTitle(poll, people, me.id)}
          sub={[minutes ? durationText(minutes) : '', poll.window ? rangeLabel(weekStart) : `${poll.options.length} ${en ? 'times' : '개 시간'}`, en ? `${t.voted} of ${t.total} answered` : `${t.total}명 중 ${t.voted}명 답함`].filter(Boolean).join(' · ')}
          onClick={() => setWho(true)} />
        {isHost && (
          <RowCard className="mt-3" tone="mint" icon={<Sparkles size={22} />} title={en ? 'Find a Time' : '시간 정하기'}
            sub={t.voted > 0 ? (en ? 'See where answers overlap and confirm' : '겹치는 시간을 보고 확정해요') : (en ? 'Waiting for answers' : '답을 기다리는 중')} onClick={() => nav(`/together/${poll.id}/find`)} />
        )}
        {poll.placeOptions?.length ? (
          <SegTabs className="mt-4" value={tab} onChange={(k) => setTab(k as 'times' | 'places')} tabs={[{ key: 'times', label: en ? 'Availability' : '시간' }, { key: 'places', label: en ? 'Places' : '장소' }]} />
        ) : null}
        {tab === 'times' ? (
          <div className="pt-4">
            <SectionHeader title={en ? 'Which times work for you?' : '언제 되나요?'} />
            {poll.window ? (
              <div className={cn(cardCls, 'overflow-hidden px-1 pb-1')}>
                <PollGrid weekStart={weekStart} options={poll.options} mode="vote" picked={sel} counts={others} busy={classCells} onPick={(x) => setSel(toggle(sel, x))} />
              </div>
            ) : (
              <div className={cn(cardCls, 'divide-y divide-line')}>
                {poll.options.map((o) => {
                  const on = sel.has(o.id); const n = others.get(o.id) ?? 0;
                  return (
                    <button key={o.id} onClick={() => setSel(toggle(sel, o.id))} aria-pressed={on} className={cn('w-full flex items-center gap-3 px-4 py-3 text-left press', on && 'bg-sel-soft')}>
                      <Clock size={17} className={on ? 'text-sel-fg' : 'text-ink-3'} />
                      <span className={cn('flex-1 text-[14.5px] font-semibold', on && 'text-sel-fg')}>{optionLabel(o)}</span>
                      {n > 0 && <span className="text-[12px] text-ink-3">{en ? `${n} others` : `${n}명`}</span>}
                      <span className={cn('h-5 w-5 rounded-full border grid place-items-center', on ? 'bg-sel border-sel text-on-primary' : 'border-line')}>{on && <Check size={12} strokeWidth={3} />}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <InfoNote className="mt-3">{en ? 'Only information shared for this poll is used. Numbers show how many others picked a time.' : '이 투표에 고른 것만 쓰여요. 숫자는 그 시간을 고른 다른 사람 수예요.'}</InfoNote>
          </div>
        ) : (
          <div className="pt-4">
            <SectionHeader title={en ? 'Which places work for you?' : '어디가 좋아요?'} />
            <div className={cn(cardCls, 'divide-y divide-line')}>
              {pt.rows.map(({ place, count }) => {
                const on = places.has(place.id);
                const mineCounted = (poll.placeVotes?.[me.id] ?? []).includes(place.id);
                const shown = count - (mineCounted ? 1 : 0) + (on ? 1 : 0);
                return (
                  <button key={place.id} onClick={() => setPlaces(toggle(places, place.id))} aria-pressed={on} className={cn('w-full flex items-center gap-3 px-4 py-3.5 text-left press', on && 'bg-sel-soft')}>
                    <MapPin size={17} className={on ? 'text-sel-fg' : 'text-ink-3'} />
                    <span className={cn('flex-1 text-[14.5px] font-semibold truncate', on && 'text-sel-fg')}>{place.name}</span>
                    {shown > 0 && <span className="text-[12px] text-ink-3">{shown}</span>}
                    <span className={cn('h-5 w-5 rounded-full border grid place-items-center', on ? 'bg-sel border-sel text-on-primary' : 'border-line')}>{on && <Check size={12} strokeWidth={3} />}</span>
                  </button>
                );
              })}
            </div>
            <InfoNote className="mt-3">{en ? 'Pick every place that works. The host confirms one.' : '괜찮은 곳을 모두 고르세요. 주최자가 하나로 정해요.'}</InfoNote>
          </div>
        )}
      </div>
      <BottomCTA>
        <Btn full size="lg" loading={busy} disabled={(!timesDirty && !placesDirty && answered) || sel.size === 0} onClick={submit}>
          {answered && !timesDirty && !placesDirty ? (en ? 'Availability saved' : '저장했어요') : (en ? 'Submit My Availability' : '내 시간 보내기')}
        </Btn>
      </BottomCTA>
      <BottomSheet open={who} onClose={() => setWho(false)} title={en ? 'Who’s in this poll' : '투표에 든 사람'}>
        <div className="divide-y divide-line">
          {people.map((u) => {
            const voted = (poll.votes[u.id] ?? []).length > 0;
            return (
              <button key={u.id} onClick={() => { setWho(false); nav(u.id === me.id ? '/profile' : `/users/${u.id}`); }} className="w-full flex items-center gap-3 py-3 text-left press">
                <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={36} />
                <span className="flex-1 min-w-0 text-[14.5px] font-semibold truncate">{u.id === me.id ? (en ? 'You' : '나') : u.nickname}{u.id === poll.hostId && <span className="ml-1.5 text-[12px] font-medium text-ink-3">{en ? 'Host' : '주최'}</span>}</span>
                <span className={cn('text-[12.5px]', voted ? 'text-ok' : 'text-ink-3')}>{voted ? (en ? 'Answered' : '답함') : (en ? 'Not yet' : '아직')}</span>
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </div>
  );
}

/** Plan Confirmed (PDF S035) — 언제·어디, 우리 그룹, 그룹 메시지, 내 일정에 넣기 · 휴대폰 캘린더(.ics) */
function PlanConfirmed({ poll }: { poll: TimePoll }) {
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const activity = useAppStore((s) => s.activities.find((a) => a.id === poll.activityId));
  const room = useAppStore((s) => s.chatRooms.find((r) => r.activityId === poll.activityId && r.memberIds.includes(v.me.id)));
  const parts = useAppStore((s) => s.participations);
  const [busy, setBusy] = useState(false);
  const opt = poll.options.find((o) => o.id === poll.decidedOptionId);
  const placeName = activity?.place.name ?? poll.placeOptions?.find((p) => p.id === poll.decidedPlaceId)?.name ?? poll.place?.name;
  const going = activity ? [activity.hostId, ...parts.filter((p) => p.activityId === activity.id && p.status === 'approved').map((p) => p.userId)] : [poll.hostId];
  const group = [...new Set(going)].map(v.userById).filter((u): u is User => !!u);
  const mine = activity && (activity.hostId === v.me.id || parts.some((p) => p.activityId === activity.id && p.userId === v.me.id && p.status === 'approved'));
  const pending = activity && parts.some((p) => p.activityId === activity.id && p.userId === v.me.id && p.status === 'pending');
  const weekOffset = opt ? Math.round((Date.parse(`${mondayOf(opt.date)}T12:00:00Z`) - Date.parse(`${mondayOf(todayISO())}T12:00:00Z`)) / (7 * 86_400_000)) : 0;
  const downloadIcs = () => {
    if (!opt) return;
    const ics = planIcs({ id: poll.id, title: poll.title, emoji: '', note: undefined, place: placeName, final: { optionId: opt.id, date: opt.date, startTime: opt.startTime, endTime: opt.endTime }, status: 'locked' }, `${window.location.origin}/together/${poll.id}`);
    if (!ics) return;
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
    const a = document.createElement('a'); a.href = url; a.download = `${poll.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'plan'}.ics`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const primary = async () => {
    if (mine || !activity) { nav(weekOffset > 0 ? `/schedule?week=${Math.min(weekOffset, 4)}` : '/schedule'); return; }
    setBusy(true);
    try { await run(() => api.activities.join(activity.id, v.me.id), en ? 'Asked the host to add you' : '주최자에게 참가를 요청했어요'); } catch { /* toast */ } finally { setBusy(false); }
  };
  return (
    <div className="min-h-full flex flex-col bg-bg">
      <BackHeader />
      <div className="px-4 pb-6 flex-1">
        <div className="flex flex-col items-center text-center pt-4 pb-6">
          <span className="h-16 w-16 rounded-full bg-t-mint text-t-mint-fg grid place-items-center"><Check size={32} strokeWidth={2.6} /></span>
          <h1 className="ha-title mt-5">{en ? 'Plan Confirmed' : '약속 확정'}</h1>
          <p className="text-[15px] text-ink-2 mt-2">{poll.title}</p>
        </div>
        <InfoRows rows={[
          { tone: 'ice', icon: <CalendarDays size={20} />, label: en ? 'When' : '언제', value: opt ? longWhen(opt.date, opt.startTime, opt.endTime) : '—', caption: mine ? (en ? 'On your schedule' : '내 일정에 있어요') : opt ? formatDate(opt.date) : undefined },
          { tone: 'peach', icon: <MapPin size={20} />, label: en ? 'Where' : '어디서', value: placeName ?? (en ? 'Place to be agreed' : '장소 미정'), caption: en ? 'Share the exact place in your group' : '정확한 곳은 그룹 채팅에서' },
        ]} />
        <SectionHeader title={en ? 'Your group' : '우리 그룹'} className="mt-6" />
        <div className={cn(cardCls, 'p-4 flex items-center gap-3')}>
          <AvatarStack people={group.map((u) => ({ id: u.id, avatar: u.avatar }))} size={34} max={5} />
          <span className="flex-1 min-w-0 text-[13.5px] text-ink-2 truncate">{group.map((u) => (u.id === v.me.id ? (en ? 'You' : '나') : u.nickname)).join(', ')}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-4">
          {room && <Btn variant="outline" size="sm" icon={<MessageCircle size={16} />} onClick={() => nav(`/chats/${room.id}`)}>{en ? 'Send Group Message' : '그룹 메시지'}</Btn>}
          {opt && <Btn variant="link" size="sm" icon={<CalendarPlus size={16} />} onClick={downloadIcs}>{en ? 'Add to phone calendar' : '휴대폰 캘린더에 넣기'}</Btn>}
        </div>
        {pending && <InfoNote className="mt-4">{en ? 'You asked to join — the host will add you.' : '참가를 요청했어요. 주최자가 넣어 줄 거예요.'}</InfoNote>}
        {activity && <button onClick={() => nav(`/activities/${activity.id}`)} className="mt-4 text-[13px] font-semibold text-ink-2 press">{en ? 'Plan details' : '약속 자세히'} ›</button>}
      </div>
      <BottomCTA>
        <Btn full size="lg" loading={busy} disabled={!!pending} onClick={primary}>{mine ? (en ? 'See it on My Schedule' : '내 일정에서 보기') : (en ? 'Add to My Schedule' : '내 일정에 넣기')}</Btn>
      </BottomCTA>
    </div>
  );
}

/** 다른 화면이 쓰는 짧은 요약 — "3 of 4 answered · Nov 10 – 14" */
export function pollSummary(poll: TimePoll): string {
  const voted = votersOf(poll);
  const total = poll.inviteeIds.length + 1;
  return [en ? `${voted} of ${total} answered` : `${total}명 중 ${voted}명`, poll.window ? rangeLabel(poll.window.weekStart) : poll.options[0] ? formatDate(poll.options[0].date) : ''].filter(Boolean).join(' · ');
}
