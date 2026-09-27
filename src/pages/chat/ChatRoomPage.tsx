import { useEffect, useRef, useState } from 'react';
import { t } from '@core/i18n';
import { useNavigate, useParams } from 'react-router-dom';
import { Send, MoreVertical, Flag, Ban, Users, CalendarDays, LogOut } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, Button, BottomSheet, Dialog, EmptyState } from '@/components/ui';
import { SheetItem } from '@/components/cards/PostCard';
import { ReportSheet } from '@/components/cards/ReportSheet';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { cn } from '@core/lib/cn';
import { overlapChips } from '@core/lib/around';
import { INTEREST_LABELS } from '@core/lib/labels';
import type { Interest, User } from '@core/types';
import { useSnapshot } from '@/hooks/useSnapshot';
import { SmallTables } from '@/components/people_SmallTables';

export function ChatRoomPage() {
  const { roomId } = useParams();
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const rooms = useAppStore((s) => s.chatRooms);
  const room = rooms.find((r) => r.id === roomId);
  const [text, setText] = useState('');
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const count = room?.messages.length ?? 0;

  useEffect(() => { if (room) api.chats.markRead(room.id, v.me.id).then((p) => useAppStore.getState().applyPatch(p)); }, [room?.id, count]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }); }, [count]);

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
      <TopBar back title={<button className="text-left" onClick={() => (other ? nav(`/users/${other.id}`) : activity ? nav(`/activities/${activity.id}`) : undefined)}><span className="block truncate">{title}</span>{room.type !== 'direct' && <span className="block text-[11px] text-ink-3 font-medium">{t('멤버')} {room.memberIds.length}{t('명')}</span>}</button>}
        right={<button onClick={() => setMenu(true)} className="h-10 w-10 grid place-items-center rounded-full" aria-label={t('메뉴')}><MoreVertical size={20} /></button>} />
      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-3 space-y-2">
        {activity && <button onClick={() => nav(`/activities/${activity.id}`)} className="w-full card p-3 flex items-center gap-3 text-left press mb-2"><span className="h-9 w-9 rounded-xl bg-primary-soft text-primary grid place-items-center"><CalendarDays size={18} /></span><span className="flex-1 min-w-0"><b className="text-[13px] block truncate">{activity.title}</b><span className="text-[11px] text-ink-3">{activity.place.name} · {activity.date} {activity.startTime}</span></span></button>}
        {other && !blocked && <OverlapCard other={other} />}
        {room.messages.length === 0 && <div className="text-center text-[12px] text-ink-3 py-8">{t('대화를 시작해보세요. 차단·신고는 오른쪽 위 메뉴에서 할 수 있어요.')}</div>}
        {room.messages.map((m, i) => {
          if (m.system) return <div key={m.id} className="text-center text-[11px] text-ink-3 py-1">{m.text}</div>;
          const mine = m.senderId === v.me.id;
          const u = v.userById(m.senderId);
          const showName = !mine && room.type !== 'direct' && room.messages[i - 1]?.senderId !== m.senderId;
          return (
            <div key={m.id} className={cn('flex gap-2 items-end', mine ? 'justify-end' : 'justify-start')}>
              {!mine && <Avatar emoji={u?.avatar.emoji ?? '👤'} hue={u?.avatar.hue ?? 200} url={u?.avatar.url} size={28} className={cn(room.messages[i + 1]?.senderId === m.senderId && 'invisible')} />}
              <div className={cn('max-w-[72%]', mine && 'text-right')}>
                {showName && <div className="text-[11px] text-ink-3 mb-0.5 ml-1">{u?.nickname}</div>}
                <div className={cn('inline-block px-3.5 py-2 rounded-2xl text-[14px] leading-relaxed text-left', mine ? 'bg-primary text-white rounded-br-md' : 'bg-surface border border-line rounded-bl-md')}>{m.text}</div>
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
          {!other && !activity && <SheetItem icon={<Flag size={18} />} label={t('채팅방 신고')} danger onClick={() => { setMenu(false); setReport(true); }} />}
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

/** DM 위 작은 카드 — 둘이 겹치는 것 (학교 · 관심사 · 도시 · 공통 연결) + 둘 다 갈 수 있는 작은 모임. 그 아래는 그냥 대화 */
function OverlapCard({ other }: { other: User }) {
  const v = useViewer();
  const snap = useSnapshot();
  const chips = overlapChips(snap, v.me, other, (i) => INTEREST_LABELS[i as Interest] ?? i)
    .map((c) => (c.startsWith('__mutual:') ? `${t('공통 연결')} ${c.slice(9)}${t('명')}` : c));
  if (chips.length === 0) return <SmallTables other={other} compact className="rounded-[20px] border border-line bg-white p-3 mb-2" />;
  return (
    <div className="rounded-[20px] border border-line bg-white p-3 mb-2">
      <div className="text-[11px] font-bold text-ink-3">{t('둘이 겹치는 것')}</div>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{chips.map((c) => <span key={c} className="h-7 px-3 rounded-full bg-accent-soft text-primary text-[12px] font-semibold inline-flex items-center">{c}</span>)}</div>
      <SmallTables other={other} compact className="mt-3" />
    </div>
  );
}
