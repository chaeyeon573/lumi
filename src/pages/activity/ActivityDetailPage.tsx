import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CalendarDays, MapPin, Users, Pencil, Trash2, Share2, Flag, UserCog, Lock, Send, UserCheck } from 'lucide-react';
import { lang } from '@core/i18n';
import type { Activity, Participation, User } from '@core/types';
import { api, type Patch } from '@core/api';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { Avatar, BottomSheet, Cover, Dialog } from '@/components/ui';
import { SheetItem } from '@/components/cards/PostCard';
import { ReportSheet } from '@/components/cards/ReportSheet';
import {
  BackHeader, PageTitle, HeroBanner, InfoRows, TextCard, Chip, ChipRow, InfoNote, BottomCTA, Btn, AvatarStack, PersonCard, EmptyState, TextArea, TextInput, type InfoRow,
} from '@/components/ha';
import { formatDate, formatTime, relativeTime } from '@core/lib/format';
import { placeLabel } from '@core/lib/relations';
import { approvedOf, audienceFits, hasLimit, isFull, reachOf } from '@core/lib/meetups';
import { kindOf } from '@/components/social/meetupKinds';
import { goingPeople, notOver } from '@/components/social/MeetupBits';
import { personMeta } from '@/components/people/PeopleBits';
import { shareOrCopy } from '@/lib/native';

const en = lang === 'en';
export const ROLE_PLURAL = en ? { undergraduate: 'Undergraduates', graduate: 'Graduate students', alumni: 'Alumni' } : { undergraduate: '학부생', graduate: '대학원생', alumni: '졸업생' };

/** 내 참가 기록 — 대기 명단 포함 (useViewer 의 myParticipation 은 승인·요청만) */
export const myPart = (parts: Participation[], activityId: string, me: string) =>
  parts.find((p) => p.activityId === activityId && p.userId === me && (p.status === 'approved' || p.status === 'pending' || p.status === 'waitlisted'));

/** 누가 볼 수 있는지 한 줄 (Who can join) */
function reachText(a: Activity, orgName: (id: string) => string | undefined): string {
  const r = reachOf(a);
  const course = (a.visibilityTargets ?? [])[0]?.slice(7);
  if (r === 'campus') return a.visibility === 'public' ? (en ? 'Anyone' : '누구나') : (en ? 'Campus-wide' : '캠퍼스 전체');
  if (r === 'invite') return en ? 'Invite only' : '초대한 사람만';
  if (r === 'class') return en ? `${course} classmates` : `${course} 수강생`;
  if (r === 'groups') { const names = (a.visibilityTargets ?? []).map((x) => orgName(x.slice(4))).filter(Boolean); return names.length ? names.join(', ') : (en ? 'Group members' : '그룹 회원'); }
  if (a.visibility === 'friends') return en ? 'Friends' : '친구';
  return en ? 'People the host chose' : '주최자가 고른 사람';
}

/**
 * 모임 상세 (PDF S046) — 종류 색 배너, 큰 제목, "Hosted by …", When / Where / Who can join (+ Going), 설명, Details · Group chat · Time poll,
 * 아래 버튼 하나: Join Meetup · Request to Join · Join Waitlist (가득 차면) · 이미 들어갔으면 그룹 채팅.
 * 승인제는 승인 전까지 대략적인 장소만 (placeLabel). 참가할 수 없으면 버튼 대신 이유 한 줄.
 */
export function ActivityDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const showToast = useAppStore((s) => s.showToast);
  const parts = useAppStore((s) => s.participations);
  const rooms = useAppStore((s) => s.chatRooms);
  const polls = useAppStore((s) => s.timePolls);
  const a = v.visibleActivities.find((x) => x.id === id);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [goingOpen, setGoingOpen] = useState(false);
  const [leave, setLeave] = useState(false);
  const [ask, setAsk] = useState(false);
  const [msg, setMsg] = useState('');
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);

  if (!a) return (
    <div className="min-h-full bg-bg"><BackHeader />
      <EmptyState icon={<Lock size={30} />} title={en ? 'This meetup isn’t available' : '볼 수 없는 모임이에요'} sub={en ? 'It was deleted, or it’s shared with a smaller group.' : '삭제됐거나 일부에게만 공개된 모임이에요.'} action={{ label: en ? 'Back to Meetups' : '모임으로', onClick: () => nav('/social/meetups') }} />
    </div>
  );

  const k = kindOf(a);
  const host = v.userById(a.hostId);
  const org = a.orgId ? v.orgById(a.orgId) : undefined;
  const isHost = a.hostId === v.me.id;
  const mine = myPart(parts, a.id, v.me.id);
  const approved = approvedOf(parts, a.id);
  const going = goingPeople(a, parts, v.userById);
  const full = isFull(a, parts);
  const room = rooms.find((r) => r.activityId === a.id);
  const canChat = !!room && (isHost || mine?.status === 'approved');
  const poll = polls.find((p) => p.activityId === a.id);
  const open = notOver(a);
  const invited = (a.invitedIds ?? []).includes(v.me.id);
  const fits = audienceFits(a, v.me);
  const where = placeLabel(a, v.me, isHost || mine?.status === 'approved');

  const act = async (fn: () => Promise<Patch>, ok?: string) => {
    setBusy(true);
    try { await run(fn, ok); return true; } catch { return false; } finally { setBusy(false); }
  };
  const join = async (message?: string) => {
    const done = await act(() => api.activities.join(a.id, v.me.id, message), a.joinPolicy === 'open' ? (en ? 'You’re going! It’s on your Schedule.' : '참석해요! 일정에 추가했어요.') : (en ? 'Request sent — you’ll hear back from the host.' : '참가 요청을 보냈어요.'));
    if (done) { setAsk(false); setMsg(''); }
  };
  const waitlist = () => act(() => api.activities.joinWaitlist(a.id, v.me.id), en ? 'You’re on the waitlist — you’ll hear if a spot opens.' : '대기 명단에 올렸어요 — 자리가 나면 알려 드릴게요.');
  const cancel = async () => { if (await act(() => api.activities.cancel(a.id, v.me.id), en ? 'Done — your spot is free for someone else.' : '취소했어요.')) setLeave(false); };
  const share = async () => { setMenu(false); if (await shareOrCopy({ title: a.title, url: `${window.location.origin}/activities/${a.id}` }) === 'copied') showToast(en ? 'Link copied.' : '링크를 복사했어요.'); };

  const rows: InfoRow[] = [
    { tone: 'ice', icon: <CalendarDays size={20} />, label: en ? 'When' : '언제', value: `${formatDate(a.date)} · ${formatTime(a.startTime)}–${formatTime(a.endTime)}`, caption: open ? undefined : (en ? 'This meetup has ended' : '끝난 모임이에요') },
    { tone: 'peach', icon: <MapPin size={20} />, label: en ? 'Where' : '어디', value: where.approximate ? (a.place.area ?? (en ? 'Near campus' : '캠퍼스 근처')) : where.name, caption: where.approximate ? (en ? 'General area · exact spot once you’re in' : '대략적인 곳 · 참가하면 정확한 곳') : (en ? 'Agree on the exact spot in the chat' : '정확한 곳은 채팅에서'), onClick: () => nav(`/activities/${a.id}/location`) },
    { tone: 'mint', icon: <Users size={20} />, label: en ? 'Who can join' : '누가 참가', value: reachText(a, (oid) => v.orgById(oid)?.name),
      caption: [a.audience ? (en ? `${ROLE_PLURAL[a.audience]} only` : `${ROLE_PLURAL[a.audience]}만`) : (en ? 'All academic statuses welcome' : '모든 학적 환영'), a.joinPolicy === 'approval' ? (en ? 'host approves' : '주최자 승인') : ''].filter(Boolean).join(' · ') },
    { tone: 'rose', icon: <UserCheck size={20} />, label: en ? 'Going' : '참가', value: `${going.length} ${en ? 'going' : '명'}${hasLimit(a) ? (en ? ` · ${a.capacity} spots` : ` · 자리 ${a.capacity}`) : ''}`,
      caption: full && hasLimit(a) ? (en ? 'Full — waitlist open' : '가득 참 — 대기 명단') : undefined, right: <AvatarStack people={going} />, onClick: () => setGoingOpen(true) },
  ];

  // 아래 버튼 — 한 화면에 primary 하나
  let cta: React.ReactNode = null; let note: string | undefined;
  if (!open) note = en ? 'This meetup has ended.' : '끝난 모임이에요.';
  else if (isHost) cta = <Btn full size="lg" icon={<UserCog size={18} />} onClick={() => nav(`/activities/${a.id}/manage`)}>{en ? 'Manage participants' : '참가자 관리'}</Btn>;
  else if (mine?.status === 'approved') { note = en ? 'You’re going.' : '참석해요.'; cta = canChat ? <Btn full size="lg" onClick={() => nav(`/chats/${room!.id}`)}>{en ? 'Open Group Chat' : '그룹 채팅'}</Btn> : <Btn full size="lg" variant="outline" onClick={() => setLeave(true)}>{en ? 'Can’t make it?' : '못 가요'}</Btn>; }
  else if (mine?.status === 'pending') cta = <Btn full size="lg" variant="outline" onClick={() => setLeave(true)}>{en ? 'Requested · waiting for the host' : '요청함 · 주최자 승인 대기'}</Btn>;
  else if (mine?.status === 'waitlisted') cta = <Btn full size="lg" variant="outline" onClick={() => setLeave(true)}>{en ? 'On the waitlist' : '대기 중'}</Btn>;
  else if (a.joinPolicy === 'invite' && !invited) note = en ? 'Invite only — the host adds people.' : '초대한 사람만 참가해요.';
  else if (!fits && a.audience) note = en ? `Open to ${ROLE_PLURAL[a.audience].toLowerCase()} only.` : `${ROLE_PLURAL[a.audience]}만 참가할 수 있어요.`;
  else if (full) cta = <Btn full size="lg" loading={busy} onClick={waitlist}>{en ? 'Join Waitlist' : '대기 명단에 올리기'}</Btn>;
  else if (a.joinPolicy === 'approval') cta = <Btn full size="lg" onClick={() => setAsk(true)}>{en ? 'Request to Join' : '참가 요청'}</Btn>;
  else cta = <Btn full size="lg" loading={busy} onClick={() => join()}>{a.kind === 'org_event' ? 'RSVP' : en ? 'Join Meetup' : '모임 참가'}</Btn>;
  const leaveText = mine?.status === 'approved' ? (en ? 'Leave this meetup' : '참석 취소') : mine?.status === 'waitlisted' ? (en ? 'Leave the waitlist' : '대기 취소') : (en ? 'Cancel request' : '요청 취소');

  return (
    <div className="min-h-full flex flex-col bg-bg">
      <BackHeader onMore={() => setMenu(true)} />
      <PageTitle title={en ? 'Meetup details' : '모임 상세'} className="pb-3" />
      <div className="px-4 pb-6">
        {a.cover.url ? <Cover emoji={a.cover.emoji} hue={a.cover.hue} url={a.cover.url} className="h-[100px] w-full rounded-[20px]" size={40} /> : <HeroBanner tone={k.tone} icon={<k.Icon size={40} />} />}
        <h1 className="text-[30px] font-extrabold tracking-[-0.03em] leading-tight mt-5">{a.title}</h1>
        <button onClick={() => nav(org ? `/orgs/${org.id}` : isHost ? '/profile' : `/users/${a.hostId}`)} className="text-[14.5px] text-ink-2 mt-1.5 text-left press">
          {en ? 'Hosted by ' : '주최 '}<span className="font-semibold text-ink">{isHost ? (en ? 'you' : '나') : org?.name ?? host?.nickname ?? ''}</span>{a.sample ? (en ? ' · Sample meetup' : ' · 예시 모임') : ` · ${k.label}`}
        </button>
        <InfoRows rows={rows} className="mt-5" />
        {a.description.trim() && <TextCard className="mt-3"><p className="whitespace-pre-wrap">{a.description}</p></TextCard>}
        <ChipRow className="mt-4">
          <Chip active>{en ? 'Details' : '상세'}</Chip>
          {canChat && <Chip onClick={() => nav(`/chats/${room!.id}`)}>{en ? 'Group chat' : '그룹 채팅'}</Chip>}
          {poll && <Chip onClick={() => nav(`/together/${poll.id}`)}>{en ? 'Time poll' : '시간 투표'}</Chip>}
        </ChipRow>
        {/* how joining works — only while you can still join (ux-sim 2026-11-06: it still said "Join to get the group chat" after joining) */}
        {open && !isHost && !mine && <InfoNote className="mt-4">{a.joinPolicy === 'approval' ? (en ? 'Approval required → Request to Join. Full → Join Waitlist.' : '승인제 → 참가 요청. 가득 차면 → 대기 명단.') : (en ? 'Join to get the group chat. Full → Join Waitlist.' : '참가하면 그룹 채팅이 열려요. 가득 차면 → 대기 명단.')}</InfoNote>}

        {(a.comments.length > 0 || (!isHost && open)) && (
          <section className="mt-7">
            <h2 className="ha-h2 mb-3">{en ? 'Questions' : '질문'}</h2>
            <div className="space-y-3">
              {a.comments.map((c) => { const u = v.userById(c.authorId); return (
                <div key={c.id} className="flex gap-2.5"><Avatar emoji={u?.avatar.emoji ?? ''} hue={u?.avatar.hue ?? 200} url={u?.avatar.url} size={30} />
                  <div className="flex-1 min-w-0"><div className="text-[12.5px] text-ink-3"><b className="text-ink font-semibold">{u?.nickname ?? (en ? 'Someone' : '누군가')}</b>{c.authorId === a.hostId && (en ? ' · host' : ' · 주최')} · {relativeTime(c.createdAt)}</div><p className="text-[14px] text-ink-2 mt-0.5">{c.text}</p></div></div>
              ); })}
            </div>
            <form className="mt-3 flex items-center gap-2" onSubmit={async (e) => { e.preventDefault(); if (q.trim() && await act(() => api.activities.comment(a.id, v.me.id, q.trim()))) setQ(''); }}>
              <TextInput className="flex-1 !rounded-full" value={q} maxLength={300} onChange={(e) => setQ(e.target.value)} placeholder={en ? 'Ask the host…' : '주최자에게 묻기…'} />
              <button type="submit" disabled={!q.trim()} aria-label={en ? 'Send' : '보내기'} className="h-12 w-12 rounded-full grid place-items-center text-sel-fg press disabled:opacity-40"><Send size={20} /></button>
            </form>
          </section>
        )}
      </div>
      {(cta || note) && (
        <BottomCTA note={note && cta ? <p className="text-[13px] text-ink-2 text-center">{note}{mine?.status === 'approved' && canChat && <> <button onClick={() => setLeave(true)} className="text-sel-fg font-semibold">{en ? 'Can’t make it?' : '못 가요'}</button></>}</p> : undefined}>
          {cta ?? <p className="text-[14px] text-ink-2 text-center py-3">{note}</p>}
        </BottomCTA>
      )}

      <BottomSheet open={goingOpen} onClose={() => setGoingOpen(false)} title={en ? `${going.length} going` : `${going.length}명 참가`}>
        <div className="space-y-2.5">{going.map((u: User) => <PersonCard key={u.id} avatar={u.avatar} name={u.id === a.hostId ? `${u.nickname} · ${en ? 'host' : '주최'}` : u.nickname} meta={personMeta(u)} onClick={() => { setGoingOpen(false); nav(u.id === v.me.id ? '/profile' : `/users/${u.id}`); }} />)}</div>
        {approved.length === 0 && <p className="text-[13px] text-ink-3 mt-3">{en ? 'Just the host so far.' : '지금은 주최자만 있어요.'}</p>}
      </BottomSheet>
      <BottomSheet open={ask} onClose={() => setAsk(false)} title={en ? 'Request to join' : '참가 요청'}>
        <p className="text-[13.5px] text-ink-2">{en ? 'Once the host says yes, the group chat opens for you.' : '주최자가 승인하면 그룹 채팅이 열려요.'}</p>
        <TextArea className="mt-3" value={msg} maxLength={200} onChange={(e) => setMsg(e.target.value)} placeholder={en ? 'A note for the host (optional)' : '주최자에게 한마디 (선택)'} />
        <Btn full size="lg" className="mt-4" loading={busy} onClick={() => join(msg.trim() || undefined)}>{en ? 'Send Request' : '요청 보내기'}</Btn>
      </BottomSheet>
      <BottomSheet open={leave} onClose={() => setLeave(false)} title={leaveText}>
        <p className="text-[13.5px] text-ink-2">{mine?.status === 'approved' ? (en ? 'Your spot goes to the next person waiting, and you leave the group chat.' : '자리는 다음 대기자에게 가고, 그룹 채팅에서 나가요.') : (en ? 'You can join again later if there’s room.' : '자리가 있으면 나중에 다시 참가할 수 있어요.')}</p>
        <Btn full size="lg" variant="danger" className="mt-4" loading={busy} onClick={cancel}>{leaveText}</Btn>
      </BottomSheet>
      <BottomSheet open={menu} onClose={() => setMenu(false)} title={en ? 'Meetup' : '모임'}>
        <div className="space-y-1">
          {isHost && <SheetItem icon={<Pencil size={18} />} label={en ? 'Edit meetup' : '모임 수정'} onClick={() => { setMenu(false); nav(`/activities/${a.id}/edit`); }} />}
          {isHost && <SheetItem icon={<UserCog size={18} />} label={en ? 'Manage participants' : '참가자 관리'} onClick={() => { setMenu(false); nav(`/activities/${a.id}/manage`); }} />}
          <SheetItem icon={<Share2 size={18} />} label={en ? 'Share link' : '링크 공유'} onClick={share} />
          {isHost && <SheetItem icon={<Trash2 size={18} />} label={en ? 'Delete meetup' : '모임 삭제'} danger onClick={() => { setMenu(false); setConfirmDelete(true); }} />}
          {!isHost && <SheetItem icon={<Flag size={18} />} label={en ? 'Report meetup' : '모임 신고'} danger onClick={() => { setMenu(false); setReport(true); }} />}
        </div>
      </BottomSheet>
      <ReportSheet open={report} onClose={() => setReport(false)} targetType="activity" targetId={a.id} />
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title={en ? 'Delete this meetup?' : '모임을 삭제할까요?'} description={en ? 'People who joined and the group chat go too. This can’t be undone.' : '참가자와 그룹 채팅도 함께 사라져요. 되돌릴 수 없어요.'}>
        <Btn variant="outline" full onClick={() => setConfirmDelete(false)}>{en ? 'Cancel' : '취소'}</Btn>
        <Btn variant="danger" full onClick={async () => { setConfirmDelete(false); if (await act(() => api.activities.remove(a.id), en ? 'Meetup deleted.' : '모임을 삭제했어요.')) nav('/social/meetups', { replace: true }); }}>{en ? 'Delete' : '삭제'}</Btn>
      </Dialog>
    </div>
  );
}
