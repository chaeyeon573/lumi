/**
 * Lumi 가 제안한 스터디 그룹 (/study/:id) — 알림에서 연다. 한 번에: 갈게요 / 다른 시간 / 이번엔 패스.
 * 2명 이상 '갈게요'면 실제 모임 + 그룹 채팅방. 초대받은 사람에게만 내려오는 활동이다 (server/view.ts).
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BookOpen, Check, MessageCircle } from 'lucide-react';
import { lang } from '@core/i18n';
import type { StudyGroupResponse } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { useViewer } from '@/hooks/useViewer';
import { BottomSheet } from '@/components/ui';
import { BackHeader, Badge, Btn, EmptyState, InfoNote, AvatarStack, cardCls } from '@/components/ha';
import { slotLabel } from '@core/api/classes';
import { classPath, campusDateOf, parseClassKey } from '@core/lib/classmates';
import { formatDate } from '@core/lib/format';
import { cn } from '@core/lib/cn';

const en = lang === 'en';
const dayOf = (iso: string) => (new Date(`${iso}T12:00:00Z`).getUTCDay() + 6) % 7;

export function StudyGroupPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const a = useAppStore((s) => s.activities.find((x) => x.id === id));
  const room = useAppStore((s) => s.chatRooms.find((r) => r.activityId === id));
  const [other, setOther] = useState(false);
  const [busy, setBusy] = useState<StudyGroupResponse | null>(null);
  const sg = a?.studyGroup;
  if (!a || !sg || !sg.invitedIds.includes(v.me.id)) return (
    <div className="min-h-full bg-bg"><BackHeader title={en ? 'Study group' : '스터디 그룹'} />
      <EmptyState icon={<BookOpen size={28} />} title={en ? 'This study group is gone' : '없는 스터디 그룹이에요'} sub={en ? 'It may have passed, or it was for other people.' : '이미 지났거나 다른 사람들의 그룹이에요.'} /></div>
  );
  const mine = sg.responses[v.me.id];
  const people = sg.invitedIds.map((uid) => v.userById(uid)).filter((u): u is NonNullable<typeof u> => !!u);
  const others = people.filter((u) => u.id !== v.me.id);
  const yes = sg.invitedIds.filter((uid) => sg.responses[uid] === 'in');
  const slot = { day: dayOf(a.date), start: a.startTime, end: a.endTime };
  const past = a.date < campusDateOf(new Date()) || sg.status === 'expired';
  const key = parseClassKey(sg.key);
  const respond = async (r: StudyGroupResponse, preferred?: { day: number; start: string; end: string }) => {
    setBusy(r);
    try {
      await run(() => api.classes.respond(a.id, v.me.id, r, preferred), r === 'in' ? (en ? "You're in" : '함께해요') : r === 'other' ? (en ? 'Sent — the group sees the time you picked' : '원하는 시간을 알렸어요') : (en ? 'No problem — maybe next time' : '이번엔 패스'));
      setOther(false);
    } catch { /* toast */ } finally { setBusy(null); }
  };
  const waiting = sg.status === 'formed' ? (en ? `${yes.length} going` : `${yes.length}명 참여`) : `${yes.length} ${en ? 'said yes' : '명 수락'}${!mine ? (en ? ' · waiting on you' : ' · 내 답을 기다려요') : ''}`;

  return (
    <div className="min-h-full bg-bg pb-10">
      <BackHeader title={en ? 'Study group' : '스터디 그룹'} />
      <div className="px-4 pt-2 space-y-5">
        <div className={cn(cardCls, 'p-5')}>
          <Badge tone={sg.status === 'formed' ? 'mint' : 'ice'}>{sg.status === 'formed' ? (en ? 'It’s on' : '성사됐어요') : (en ? 'Suggested by Lumi' : 'Lumi의 제안')}{sg.exam ? ` · ${sg.exam.label} ${formatDate(sg.exam.date.slice(0, 10))}` : ''}</Badge>
          <h1 className="mt-3 text-[24px] font-extrabold tracking-[-0.02em] leading-tight">{sg.code} · {slotLabel(slot, en)}</h1>
          <div className="mt-1 text-[14px] text-ink-2">{formatDate(a.date)} · {a.place.name}</div>
          <div className="mt-4 flex items-center gap-3">
            <AvatarStack people={people.map((u) => ({ id: u.id, avatar: u.avatar }))} size={34} max={5} />
            <span className="text-[13.5px] text-ink-2">{waiting}</span>
          </div>
          <div className="mt-2 text-[13.5px] text-ink">{en ? 'With ' : '함께: '}{others.map((u, i) => <span key={u.id}>{i > 0 && ', '}<button onClick={() => nav(`/users/${u.id}`)} className="font-semibold">{u.nickname}{u.sample && <span className="ml-1 text-[11px] font-medium text-ink-3">{en ? 'Sample' : '예시'}</span>}</button>{sg.responses[u.id] === 'in' && <Check size={12} className="inline ml-0.5 text-ok" />}</span>)}</div>
          {past ? <p className="mt-4 text-[13px] text-ink-3">{en ? 'This time has passed.' : '지난 시간이에요.'}</p> : (
            <div className="mt-4 flex flex-wrap gap-2">
              <Btn size="sm" loading={busy === 'in'} className={cn(mine === 'in' && 'pointer-events-none')} icon={<Check size={14} />} onClick={() => respond('in')}>{mine === 'in' ? (en ? 'You’re in' : '함께해요') : (en ? 'Join' : '갈게요')}</Btn>
              <Btn size="sm" variant="outline" onClick={() => setOther(true)}>{en ? 'Other time' : '다른 시간'}</Btn>
              <Btn size="sm" variant="link" loading={busy === 'no'} onClick={() => respond('no')}>{mine === 'no' ? (en ? 'Passed' : '패스함') : (en ? 'Not now' : '이번엔 패스')}</Btn>
            </div>
          )}
          {sg.status === 'formed' && mine === 'in' && room && <Btn className="mt-3" full variant="outline" icon={<MessageCircle size={16} />} onClick={() => nav(`/chats/${room.id}`)}>{en ? 'Open group chat' : '그룹 채팅방'}</Btn>}
        </div>

        {sg.preferred && Object.keys(sg.preferred).length > 0 && (
          <div className="space-y-1">
            {Object.entries(sg.preferred).map(([uid, s]) => { const u = v.userById(uid); return u ? <div key={uid} className="text-[13px] text-ink-2">{uid === v.me.id ? (en ? 'You' : '나') : u.nickname} {en ? 'would rather' : '→'} {slotLabel(s, en)}</div> : null; })}
          </div>
        )}

        <InfoNote>{en ? `Only the ${people.length} people invited see this. Lumi picked a time you’re all free — nobody saw your timetable. At most one suggestion a week per class.` : '초대받은 사람만 볼 수 있어요. 서로의 시간표는 보이지 않아요.'}</InfoNote>
        {key && <Btn variant="link" onClick={() => nav(classPath(key.schoolId, sg.code))}>{en ? `Open the ${sg.code} class room` : `${sg.code} 수업 방`} ›</Btn>}
      </div>

      <BottomSheet open={other} onClose={() => setOther(false)} title={en ? 'When works for you?' : '언제가 좋아요?'}>
        <div className="space-y-2">
          {sg.alternatives.length ? sg.alternatives.map((s) => (
            <button key={`${s.day}${s.start}`} onClick={() => respond('other', s)} className="w-full rounded-2xl bg-surface-2 border border-line px-4 py-3 text-left text-[14.5px] font-semibold text-ink press">{slotLabel(s, en)} <span className="text-[12px] font-normal text-ink-3">{en ? '· everyone is free' : '· 모두 비는 시간'}</span></button>
          )) : <p className="text-[13px] text-ink-3">{en ? 'No other time this week works for everyone.' : '이번 주에 모두 비는 다른 시간이 없어요.'}</p>}
          <Btn full variant="outline" onClick={() => nav(`/schedule/meeting/new?cat=study&title=${encodeURIComponent(`${sg.code} study`)}&invite=${others.map((u) => u.id).join(',')}`)}>{en ? 'Vote on a time with them' : '같이 시간 투표하기'}</Btn>
        </div>
      </BottomSheet>
    </div>
  );
}
