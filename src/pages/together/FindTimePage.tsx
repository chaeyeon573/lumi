import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import { lang } from '@core/i18n';
import type { User } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { tally, optionLabel } from '@core/lib/together';
import { mondayOf, placeTally } from '@core/lib/pollgrid';
import { PollGrid, HeatLegend } from '@/components/timetable/PollGrid';
import { BackHeader, PageTitle, BottomCTA, Btn, RowCard, Chip, ChipRow, InfoNote, SectionHeader, AvatarStack, cardCls } from '@/components/ha';
import { rangeLabel } from '@/pages/schedule/ScheduleTab';
import { PollGone, groupTitle, longWhen, pollPeople, usePoll } from './TogetherPage';
import { cn } from '@core/lib/cn';

const en = lang === 'en';

/**
 * Find a Time (PDF S034, /together/:id/find) — 주최자만. 사람들이 고른 표를 한 주 격자에 겹쳐 보여 준다
 * (몇 명 = 하늘, 가장 많이 겹친 칸 = 민트). "Best match" 는 표가 가장 많은 칸 — 시간표로 자동으로 고르지 않는다.
 * 주최자가 다른 칸·다른 장소를 눌러 바꿀 수 있고, Confirm Plan 을 누르면 약속 + 그룹 채팅방이 생긴다 (together.decide).
 */
export function FindTimePage() {
  const { id } = useParams();
  const nav = useNavigate();
  const { poll, missing, v } = usePoll(id);
  const run = useAppStore((s) => s.run);
  const t = useMemo(() => (poll ? tally(poll) : null), [poll]);
  const pt = useMemo(() => (poll ? placeTally(poll) : null), [poll]);
  const [pick, setPick] = useState<string | null>(null);
  const [placePick, setPlacePick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!poll || !t || !pt) return <PollGone title={en ? 'Find a Time' : '시간 정하기'} missing={missing} />;
  if (poll.hostId !== v.me.id || poll.status !== 'open') return <Navigate to={`/together/${poll.id}`} replace />;
  const people = pollPeople(poll, v.userById);
  const counts = new Map(t.rows.map((r) => [r.option.id, r.count]));
  const top = Math.max(0, ...t.rows.map((r) => r.count));
  const chosen = t.rows.find((r) => r.option.id === (pick ?? t.best?.option.id));
  const place = pt.rows.find((r) => r.place.id === (placePick ?? pt.best?.place.id));
  const weekStart = poll.window?.weekStart ?? (poll.options[0] ? mondayOf(poll.options[0].date) : '');
  const can = (ids: string[]) => ids.map(v.userById).filter((u): u is User => !!u);
  const confirm = async () => {
    if (!chosen) return;
    setBusy(true);
    try {
      await run(() => api.together.decide(poll.id, chosen.option.id, place?.place.id), en ? 'Plan confirmed — group chat is open' : '약속을 확정했어요. 그룹 채팅방이 열렸어요');
      nav(`/together/${poll.id}`, { replace: true });
    } catch { setBusy(false); }
  };
  return (
    <div className="min-h-full flex flex-col bg-bg">
      <BackHeader title={en ? 'Find a Time' : '시간 정하기'} />
      <PageTitle title={en ? 'Find a Time' : '시간 정하기'} />
      <div className="px-4 pb-6 flex-1 space-y-4">
        <RowCard tone="ice" icon={<Users size={22} />} title={groupTitle(poll, people, v.me.id)}
          sub={place ? `${en ? 'Suggested place' : '추천 장소'}: ${place.place.name}` : `${t.voted} ${en ? `of ${t.total} answered` : `/ ${t.total}명 답함`}`} onClick={() => nav(`/together/${poll.id}`)} />
        {poll.window ? (
          <>
            <div className="text-center text-[14px] font-bold">{rangeLabel(weekStart)}</div>
            <div className={cn(cardCls, 'overflow-hidden px-1 pb-1')}>
              <PollGrid weekStart={weekStart} options={poll.options} mode="heat" picked={new Set(chosen ? [chosen.option.id] : [])} counts={counts} top={top} onPick={(x) => setPick(x)} />
            </div>
            <HeatLegend />
          </>
        ) : (
          <div className={cn(cardCls, 'divide-y divide-line')}>
            {t.rows.map((r) => (
              <button key={r.option.id} onClick={() => setPick(r.option.id)} aria-pressed={chosen?.option.id === r.option.id} className={cn('w-full flex items-center gap-3 px-4 py-3 text-left press', chosen?.option.id === r.option.id && 'bg-sel-soft')}>
                <span className={cn('flex-1 text-[14.5px] font-semibold', chosen?.option.id === r.option.id && 'text-sel-fg')}>{optionLabel(r.option)}</span>
                <span className="text-[12.5px] text-ink-3">{r.count}/{t.total}</span>
              </button>
            ))}
          </div>
        )}

        {t.voted === 0 ? (
          <InfoNote>{en ? 'No one has answered yet. Share the poll and check back — you confirm once people pick their times.' : '아직 아무도 답하지 않았어요. 사람들이 시간을 고르면 확정할 수 있어요.'}</InfoNote>
        ) : chosen && (
          <div className="rounded-[20px] bg-t-mint border border-line p-4">
            <div className="text-[16px] font-extrabold text-t-mint-fg">{chosen.option.id === t.best?.option.id ? (en ? 'Best match' : '가장 잘 맞는 시간') : (en ? 'Your pick' : '고른 시간')}</div>
            <div className="text-[15px] font-bold text-t-mint-fg mt-0.5">{longWhen(chosen.option.date, chosen.option.startTime, chosen.option.endTime)}</div>
            <div className="text-[13px] text-ink-2 mt-1">{[place ? place.place.name : (en ? 'Place to be agreed' : '장소 미정'), en ? `${chosen.count} of ${t.total} can make it` : `${t.total}명 중 ${chosen.count}명 가능`].join(' · ')}</div>
            {chosen.count > 0 && <div className="flex items-center gap-2 mt-3"><AvatarStack people={can(chosen.voterIds).map((u) => ({ id: u.id, avatar: u.avatar }))} size={26} max={5} /><span className="text-[12.5px] text-ink-2 truncate">{can(chosen.voterIds).map((u) => (u.id === v.me.id ? (en ? 'You' : '나') : u.nickname)).join(', ')}</span></div>}
          </div>
        )}

        {pt.rows.length > 1 && (
          <section>
            <SectionHeader title={en ? 'Place' : '장소'} />
            <ChipRow wrap>{pt.rows.map((r) => <Chip key={r.place.id} size="sm" active={place?.place.id === r.place.id} onClick={() => setPlacePick(r.place.id)}>{r.place.name}{r.count ? ` · ${r.count}` : ''}</Chip>)}</ChipRow>
          </section>
        )}
        <InfoNote>{en ? 'Only people who picked the confirmed time are added. Everyone invited can still ask to join.' : '확정한 시간을 고른 사람만 들어가요. 초대받은 사람은 나중에 참가를 요청할 수 있어요.'}</InfoNote>
      </div>
      <BottomCTA><Btn full size="lg" loading={busy} disabled={!chosen || t.voted === 0} onClick={confirm}>{en ? 'Confirm Plan' : '약속 확정'}</Btn></BottomCTA>
    </div>
  );
}
