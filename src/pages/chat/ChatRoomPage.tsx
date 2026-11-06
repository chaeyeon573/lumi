import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Ban, CalendarDays, Flag, LogOut, Lock, SendHorizontal, User as UserIcon, Users } from 'lucide-react';
import { lang } from '@core/i18n';
import { orgSenderLabel } from '@core/lib/clubjoin';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { formatDate, formatDateTime, formatTime } from '@core/lib/format';
import { Avatar, BottomSheet } from '@/components/ui';
import { BackHeader, Btn, EmptyState, ErrorScreen, LoadingCards, RowCard, cardCls } from '@/components/ha';
import { useViewer } from '@/hooks/useViewer';
import { cn } from '@core/lib/cn';

const en = lang === 'en';

/** 메시지 사이 시각 줄 — 날이 바뀌거나 한 시간 넘게 비었을 때만 ("Today 6:42 PM") */
const HOUR = 3600000;
function stamp(iso: string) {
  const d = new Date(iso);
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { day, label: formatDateTime(day, `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`) };
}

function SheetRow({ icon, label, danger, onClick }: { icon: ReactNode; label: string; danger?: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={cn(cardCls, 'w-full h-12 px-4 flex items-center gap-3 text-left text-[15px] font-semibold press', danger && 'text-danger')}>{icon}{label}</button>;
}

/**
 * Conversation (PDF S069) — ‹ 이름 ···, 말풍선 (상대 = 카드색 왼쪽, 나 = 핑크 틴트 오른쪽), "Make it a plan" 카드
 * [Create a Time Poll → /schedule/meeting/new, 이 방 사람들을 초대 후보로], 알약 입력칸 (Message… ➤).
 * ··· = 프로필·모임 보기, 신고 (/report/…), 차단 (/users/:id/block), 모임 나가기. PDF 의 + 버튼은 붙일 것이 없어 두지 않았다.
 */
export function ChatRoomPage() {
  const { roomId } = useParams();
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const status = useAppStore((s) => s.status);
  const error = useAppStore((s) => s.error);
  const init = useAppStore((s) => s.init);
  const rooms = useAppStore((s) => s.chatRooms);
  const room = rooms.find((r) => r.id === roomId);
  const [params] = useSearchParams();
  // 사람 프로필의 '첫마디 추천'에서 고른 문장을 입력창에 넣어 둔다 (보내기는 본인이 누른다)
  const [text, setText] = useState(() => params.get('draft') ?? '');
  const [menu, setMenu] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const count = room?.messages.length ?? 0;

  useEffect(() => { if (room) api.chats.markRead(room.id, v.me.id).then((p) => useAppStore.getState().applyPatch(p)).catch(() => {}); }, [room?.id, count]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }); }, [count]);
  // 이 방을 보고 있는 동안에는 이 방의 새 메시지 푸시를 보내지 않는다 (server/chat-push.ts) — 화면이 숨으면(앱이 백그라운드로) 바로 끈다
  const openId = room?.id;
  useEffect(() => {
    if (!openId) return;
    const say = () => { void api.push.viewing(document.visibilityState === 'hidden' ? null : openId); };
    const off = () => { void api.push.viewing(null); };
    say();
    const beat = window.setInterval(() => { if (document.visibilityState !== 'hidden') say(); }, 15_000);
    document.addEventListener('visibilitychange', say);
    window.addEventListener('pagehide', off);
    return () => { window.clearInterval(beat); document.removeEventListener('visibilitychange', say); window.removeEventListener('pagehide', off); off(); };
  }, [openId]);

  if (status === 'error') return <div className="min-h-full bg-bg"><BackHeader title={en ? 'Messages' : '메시지'} /><ErrorScreen message={error ?? undefined} onRetry={init} /></div>;
  if (status !== 'ready') return <div className="min-h-full bg-bg"><BackHeader /><LoadingCards className="px-4 pt-4" /></div>;
  if (!room || !room.memberIds.includes(v.me.id)) return (
    <div className="min-h-full bg-bg"><BackHeader title={en ? 'Messages' : '메시지'} />
      <EmptyState icon={<Lock size={28} />} tone="neutral" title={en ? 'You can’t open this chat' : '들어갈 수 없는 채팅방이에요'} sub={en ? 'A meetup’s group chat opens once the host approves you.' : '모임 그룹 채팅은 참가가 승인되면 열려요.'} action={{ label: en ? 'Back to Messages' : '메시지로', onClick: () => nav('/chats', { replace: true }) }} />
    </div>
  );

  const other = room.type === 'direct' ? v.userById(room.memberIds.find((m) => m !== v.me.id) ?? '') : undefined;
  const activity = room.activityId ? v.visibleActivities.find((a) => a.id === room.activityId) : undefined;
  const title = other?.nickname ?? room.title ?? (en ? 'Group chat' : '그룹 채팅');
  const blocked = other ? v.isBlocked(other.id) : false;
  const talked = room.messages.some((m) => !m.system);
  const invite = room.memberIds.filter((m) => m !== v.me.id).slice(0, 12).join(',');
  const showPlan = !room.activityId && !room.rideId && talked && !blocked;

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    await run(() => api.chats.send(room.id, v.me.id, body)).catch(() => setText(body));
  };

  return (
    <div className="h-full flex flex-col bg-bg">
      <BackHeader title={title} onMore={() => setMenu(true)} />
      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 pb-3 space-y-2">
        {other?.sample && <p className="text-center text-[12px] text-ink-3 pb-1">{en ? 'Sample profile — a demo conversation' : '예시 프로필 — 데모 대화'}</p>}
        {room.type !== 'direct' && <p className="text-center text-[12px] text-ink-3 pb-1">{en ? `${room.memberIds.length} members` : `${room.memberIds.length}명`}</p>}
        {activity && <RowCard className="mb-2" tone="ice" icon={<CalendarDays size={20} />} title={activity.title} sub={`${activity.place.name} · ${formatDate(activity.date)} ${formatTime(activity.startTime)}`} onClick={() => nav(`/activities/${activity.id}`)} />}
        {!talked && <p className="text-center text-[13px] text-ink-3 py-8">{en ? 'Say hi. Report or block from ··· anytime.' : '인사해 보세요. 신고·차단은 ··· 에서 언제든.'}</p>}
        {room.messages.map((m, i) => {
          if (m.system) return <p key={m.id} className="text-center text-[12px] text-ink-3 py-1">{m.text}</p>;
          const mine = m.senderId === v.me.id;
          const u = v.userById(m.senderId);
          const prev = room.messages[i - 1];
          // a club organizer writing as the club ("CHAOS (organizer)", @core/lib/clubjoin) is always labeled, also in a 1:1 chat
          const asOrg = m.asOrg && prev?.asOrg?.id !== m.asOrg.id ? orgSenderLabel(m.asOrg.name) : undefined;
          const showName = !!asOrg || (!mine && room.type !== 'direct' && prev?.senderId !== m.senderId);
          const at = stamp(m.createdAt);
          const showStamp = !prev || stamp(prev.createdAt).day !== at.day || Date.parse(m.createdAt) - Date.parse(prev.createdAt) > HOUR;
          return (
            <div key={m.id}>
              {showStamp && <p className="text-center text-[11.5px] text-ink-3 pt-3 pb-1">{at.label}</p>}
              <div className={cn('flex gap-2 items-end', mine ? 'justify-end' : 'justify-start')}>
                {!mine && room.type !== 'direct' && <Avatar emoji={u?.avatar.emoji ?? ''} hue={u?.avatar.hue ?? 200} url={u?.avatar.url} size={28} className={cn(room.messages[i + 1]?.senderId === m.senderId && 'invisible')} />}
                <div className={cn('max-w-[78%]', mine && 'text-right')}>
                  {showName && <div className={cn('text-[11.5px] text-ink-3 mb-1', mine ? 'mr-1' : 'ml-1')}>{asOrg ?? u?.nickname}</div>}
                  <div className={cn('inline-block px-4 py-2.5 rounded-[20px] border text-[15px] leading-snug text-left whitespace-pre-wrap break-words', mine ? 'bg-sel-soft border-sel-line text-ink' : 'bg-surface border-line text-ink')}>{m.text}</div>
                </div>
              </div>
            </div>
          );
        })}
        {showPlan && (
          <div className={cn(cardCls, 'p-4 mt-3')}>
            <div className="text-[16px] font-bold">{en ? 'Make it a plan' : '약속으로 만들기'}</div>
            <div className="text-[13.5px] text-ink-3 mt-0.5">{en ? 'Find a time and place together.' : '시간과 장소를 같이 정해요.'}</div>
            <Btn variant="outline" size="sm" className="mt-3" icon={<CalendarDays size={16} />} onClick={() => nav(`/schedule/meeting/new${room.type === 'direct' ? `?invite=${invite}` : ''}`)}>{en ? 'Create a Time Poll' : '시간 투표 만들기'}</Btn>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form className="shrink-0 px-4 pt-2 pb-3 safe-bottom bg-bg" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <label className="h-12 rounded-full bg-surface border border-line flex items-center gap-2 pl-5 pr-1.5 focus-within:border-sel-line">
          <input className="flex-1 min-w-0 bg-transparent outline-none text-[15px] placeholder:text-ink-3 disabled:opacity-50" placeholder={blocked ? (en ? 'You can’t message a blocked account' : '차단된 사람과는 대화할 수 없어요') : (en ? 'Message…' : '메시지…')}
            value={text} onChange={(e) => setText(e.target.value)} disabled={blocked} aria-label={en ? 'Message' : '메시지'} />
          <button type="submit" disabled={!text.trim() || blocked} aria-label={en ? 'Send' : '보내기'} className="h-10 w-10 rounded-full grid place-items-center text-sel-fg disabled:text-ink-3 press"><SendHorizontal size={21} /></button>
        </label>
      </form>

      <BottomSheet open={menu} onClose={() => setMenu(false)} title={title}>
        <div className="space-y-2 pb-2">
          {room.type !== 'direct' && <p className="text-[13px] text-ink-3 flex items-center gap-1.5 pb-1"><Users size={14} />{room.memberIds.map((id) => (id === v.me.id ? (en ? 'You' : '나') : v.userById(id)?.nickname)).filter(Boolean).join(', ')}</p>}
          {other && <SheetRow icon={<UserIcon size={19} />} label={en ? 'View profile' : '프로필 보기'} onClick={() => { setMenu(false); nav(`/users/${other.id}`); }} />}
          {activity && <SheetRow icon={<CalendarDays size={19} />} label={en ? 'View meetup' : '모임 보기'} onClick={() => { setMenu(false); nav(`/activities/${activity.id}`); }} />}
          <SheetRow icon={<Flag size={19} />} danger label={en ? 'Report' : '신고'} onClick={() => { setMenu(false); nav(other ? `/report/user/${other.id}` : `/report/message/${room.id}`); }} />
          {other && <SheetRow icon={<Ban size={19} />} danger label={v.hasBlocked(other.id) ? (en ? 'Unblock' : '차단 해제') : (en ? 'Block' : '차단')} onClick={() => { setMenu(false); nav(`/users/${other.id}/block`); }} />}
          {activity && activity.hostId !== v.me.id && <SheetRow icon={<LogOut size={19} />} danger label={en ? 'Leave meetup' : '모임 나가기'}
            onClick={async () => { setMenu(false); try { await run(() => api.activities.cancel(activity.id, v.me.id), en ? 'You left the meetup' : '모임에서 나갔어요'); nav('/chats?tab=groups', { replace: true }); } catch { /* toast */ } }} />}
        </div>
      </BottomSheet>
    </div>
  );
}
