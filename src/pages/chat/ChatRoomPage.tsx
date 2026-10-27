import { useEffect, useRef, useState } from 'react';
import { t } from '@core/i18n';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Send, MoreVertical, Flag, Ban, Users, CalendarDays, LogOut } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { SampleTag } from '@/components/ui/SampleTag';
import { Avatar, Button, BottomSheet, Dialog, EmptyState } from '@/components/ui';
import { SheetItem } from '@/components/cards/PostCard';
import { ReportSheet } from '@/components/cards/ReportSheet';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { cn } from '@core/lib/cn';
import { formatDate, formatDateTime, formatTime } from '@core/lib/format';

/** 메시지 사이 시각 줄 — 날이 바뀌거나 한 시간 넘게 비었을 때만 ("Today 6:42 PM") */
const HOUR = 3600000;
function stamp(iso: string) {
  const d = new Date(iso);
  const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { day, label: formatDateTime(day, `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`) };
}

export function ChatRoomPage() {
  const { roomId } = useParams();
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const rooms = useAppStore((s) => s.chatRooms);
  const room = rooms.find((r) => r.id === roomId);
  const [params] = useSearchParams();
  // 사람 프로필의 '첫마디 추천'에서 고른 문장을 입력창에 넣어 둔다 (보내기는 본인이 누른다)
  const [text, setText] = useState(() => params.get('draft') ?? '');
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const count = room?.messages.length ?? 0;

  useEffect(() => { if (room) api.chats.markRead(room.id, v.me.id).then((p) => useAppStore.getState().applyPatch(p)); }, [room?.id, count]); // eslint-disable-line react-hooks/exhaustive-deps
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

  if (!room || !room.memberIds.includes(v.me.id)) return <div className="min-h-full"><TopBar back title={t('채팅')} /><EmptyState emoji="🔒" title={t('입장할 수 없는 채팅방이에요')} description={t('참가 승인이 완료되면 그룹 채팅방에 입장할 수 있어요.')} /></div>;

  const other = room.type === 'direct' ? v.userById(room.memberIds.find((m) => m !== v.me.id)!) : undefined;
  const activity = room.activityId ? v.visibleActivities.find((a) => a.id === room.activityId) : undefined;
  const title = other?.nickname ?? room.title ?? t('채팅');
  const blocked = other ? v.isBlocked(other.id) : false;

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setText('');
    await run(() => api.chats.send(room.id, v.me.id, t));
  };

  return (
    <div className="h-full flex flex-col">
      <TopBar back title={<button className="text-left" onClick={() => (other ? nav(`/users/${other.id}`) : activity ? nav(`/activities/${activity.id}`) : room.rideId ? nav(`/rides/${room.rideId}`) : undefined)}><span className="block truncate">{other?.sample && <SampleTag />}{title}</span>{room.type !== 'direct' && <span className="block text-[11px] text-ink-3 font-medium">{t('멤버')} {room.memberIds.length}{t('명')}</span>}</button>}
        right={<button onClick={() => setMenu(true)} className="h-10 w-10 grid place-items-center rounded-full" aria-label={t('메뉴')}><MoreVertical size={20} /></button>} />
      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-3 space-y-2">
        {activity && <button onClick={() => nav(`/activities/${activity.id}`)} className="w-full card p-3 flex items-center gap-3 text-left press mb-2"><span className="h-9 w-9 rounded-xl bg-primary-soft text-primary grid place-items-center"><CalendarDays size={18} /></span><span className="flex-1 min-w-0"><b className="text-[13px] block truncate">{activity.title}</b><span className="text-[11px] text-ink-3">{activity.place.name} · {formatDate(activity.date)} {formatTime(activity.startTime)}</span></span></button>}
        {room.messages.length === 0 && <div className="text-center text-[12px] text-ink-3 py-8">{t('대화를 시작해보세요. 차단·신고는 오른쪽 위 메뉴에서 할 수 있어요.')}</div>}
        {room.messages.map((m, i) => {
          if (m.system) return <div key={m.id} className="text-center text-[11px] text-ink-3 py-1">{m.text}</div>;
          const mine = m.senderId === v.me.id;
          const u = v.userById(m.senderId);
          const showName = !mine && room.type !== 'direct' && room.messages[i - 1]?.senderId !== m.senderId;
          const prev = room.messages[i - 1];
          const at = stamp(m.createdAt);
          const showStamp = !prev || stamp(prev.createdAt).day !== at.day || Date.parse(m.createdAt) - Date.parse(prev.createdAt) > HOUR;
          return (
            <div key={m.id}>
            {showStamp && <div className="text-center text-[11px] text-ink-3 pt-2 pb-1">{at.label}</div>}
            <div className={cn('flex gap-2 items-end', mine ? 'justify-end' : 'justify-start')}>
              {!mine && <Avatar emoji={u?.avatar.emoji ?? '👤'} hue={u?.avatar.hue ?? 200} url={u?.avatar.url} size={28} className={cn(room.messages[i + 1]?.senderId === m.senderId && 'invisible')} />}
              <div className={cn('max-w-[72%]', mine && 'text-right')}>
                {showName && <div className="text-[11px] text-ink-3 mb-0.5 ml-1">{u?.nickname}</div>}
                <div className={cn('inline-block px-3.5 py-2 rounded-2xl text-[14px] leading-relaxed text-left', mine ? 'bg-primary text-white rounded-br-md' : 'bg-surface border border-line rounded-bl-md')}>{m.text}</div>
              </div>
            </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form className="shrink-0 border-t border-line bg-surface p-2.5 flex gap-2 safe-bottom" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input className="flex-1 h-11 rounded-2xl bg-surface-2 px-4 text-[14px] outline-none focus:bg-surface focus:ring-1 ring-primary" placeholder={blocked ? t('차단된 사용자와는 대화할 수 없어요') : t('메시지 입력…')} value={text} onChange={(e) => setText(e.target.value)} disabled={blocked} />
        <Button type="submit" className="h-11 w-11 !px-0 rounded-2xl" disabled={!text.trim() || blocked} aria-label={t('보내기')}><Send size={18} /></Button>
      </form>

      <BottomSheet open={menu} onClose={() => setMenu(false)} title={title}>
        <div className="space-y-1">
          {room.type !== 'direct' && <div className="px-3 py-2 text-[12px] text-ink-3 flex items-center gap-1"><Users size={13} />{t('멤버')} {room.memberIds.map((id) => v.userById(id)?.nickname ?? (id === v.me.id ? t('나') : '')).filter(Boolean).join(', ')}</div>}
          {other && <SheetItem icon={<Flag size={18} />} label={t('사용자 신고')} danger onClick={() => { setMenu(false); setReport(true); }} />}
          {other && <SheetItem icon={<Ban size={18} />} label={blocked ? t('차단 해제') : t('사용자 차단')} danger onClick={() => { setMenu(false); blocked ? run(() => api.relationships.unblock(v.me.id, other.id), t('차단을 해제했어요.')) : setBlockOpen(true); }} />}
          {activity && activity.hostId !== v.me.id && <SheetItem icon={<LogOut size={18} />} label={t('활동 나가기')} danger onClick={async () => { setMenu(false); await run(() => api.activities.cancel(activity.id, v.me.id), t('활동에서 나갔어요.')); nav('/chats?tab=activity'); }} />}
          {/* 활동 단톡방에도 신고 — 모임 채팅에서 괴롭힘이 있어도 이 메뉴엔 ‘나가기’ 뿐이었다 */}
          {!other && <SheetItem icon={<Flag size={18} />} label={t('채팅방 신고')} danger onClick={() => { setMenu(false); setReport(true); }} />}
        </div>
      </BottomSheet>
      {other && <ReportSheet open={report} onClose={() => setReport(false)} targetType="user" targetId={other.id} />}
      {!other && <ReportSheet open={report} onClose={() => setReport(false)} targetType="message" targetId={room.id} />}
      {other && (
        <Dialog open={blockOpen} onClose={() => setBlockOpen(false)} title={`${other.nickname}${t('님을 차단할까요?')}`} description={t('차단하면 서로 메시지를 보낼 수 없고 프로필과 활동이 보이지 않아요.')}>
          <Button variant="outline" full onClick={() => setBlockOpen(false)}>{t('취소')}</Button>
          <Button variant="danger" full onClick={async () => { setBlockOpen(false); await run(() => api.relationships.block(v.me.id, other.id), t('차단했어요.')); nav('/chats'); }}>{t('차단')}</Button>
        </Dialog>
      )}
    </div>
  );
}
