import { useEffect, useRef, useState } from 'react';
import { t, lang } from '@core/i18n';
import { useNavigate, useParams } from 'react-router-dom';
import { Send, MoreVertical, Flag, Ban, Users, CalendarDays, LogOut, Coffee, Plus, ChevronRight, RotateCw, Lock, Bug, X } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, Button, BottomSheet, Dialog, EmptyState, Input, PrivacyNote, Section, SectionSkeleton, Textarea } from '@/components/ui';
import { SheetItem } from '@/components/cards/PostCard';
import { ReportSheet } from '@/components/cards/ReportSheet';
import { useViewer } from '@/hooks/useViewer';
import { useSectionState } from '@/hooks/useSectionState';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { cn } from '@core/lib/cn';
import { overlapChips, sharedSmallTables } from '@core/lib/around';
import { INTEREST_LABELS } from '@core/lib/labels';
import { profileView, canShowInPath } from '@core/lib/privacy';
import { mutualFriends, commonInterests } from '@core/lib/relations';
import { cityOf } from '@core/lib/network';
import { todayISO } from '@core/lib/format';
import type { ChatRoom, Interest, User } from '@core/types';
import { useSnapshot } from '@/hooks/useSnapshot';
import { SmallTables } from '@/components/people_SmallTables';
import { SchoolBadge } from '@/components/people_SchoolBadge';

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
  const [coffeeOpen, setCoffeeOpen] = useState(false);
  const [mutualOpen, setMutualOpen] = useState(false);
  const [failed, setFailed] = useState<{ id: string; text: string }[]>([]);
  const showToast = useAppStore((s) => s.showToast);
  const bottomRef = useRef<HTMLDivElement>(null);
  const count = room?.messages.length ?? 0;

  useEffect(() => { if (room) api.chats.markRead(room.id, v.me.id).then((p) => useAppStore.getState().applyPatch(p)); }, [room?.id, count]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }); }, [count, failed.length]);

  if (!room || !room.memberIds.includes(v.me.id)) return <div className="min-h-full"><TopBar back title={t('채팅')} /><EmptyState emoji="🔒" title={t('입장할 수 없는 채팅방이에요')} description={t('참가 승인이 완료되면 그룹 채팅방에 입장할 수 있어요.')} /></div>;

  const other = room.type === 'direct' ? v.userById(room.memberIds.find((m) => m !== v.me.id)!) : undefined;
  const activity = room.activityId ? v.visibleActivities.find((a) => a.id === room.activityId) : undefined;
  const title = other?.nickname ?? room.title ?? t('채팅');
  const blocked = other ? v.isBlocked(other.id) || v.hasBlocked(other.id) : false;
  const origin = other ? roomOrigin(room) : null;
  const msg = other ? v.canMessage(other.id) : { ok: true, reason: '' };
  /** 연결이 끊겼거나 상대가 수신을 막았을 때 — 소개·사람 찾아보기로 열린 방은 그대로 둔다 */
  const locked = !!other && !blocked && !msg.ok && !origin;
  const inputOff = blocked || locked;
  const mutualUsers = other ? mutualFriends(v.snap, v.me.id, other.id).map((id) => v.userById(id)).filter((u): u is User => !!u) : [];

  const send = async (body?: string, retryId?: string) => {
    const value = (body ?? text).trim();
    if (!value || inputOff) return;
    if (body === undefined) setText('');
    if (retryId) setFailed((f) => f.filter((x) => x.id !== retryId));
    try { await run(() => api.chats.send(room.id, v.me.id, value)); }
    catch { setFailed((f) => [...f, { id: `f${Date.now()}`, text: value }]); }
  };

  return (
    <div className="h-full flex flex-col">
      <TopBar back title={<button className="text-left" onClick={() => (other ? nav(`/users/${other.id}`) : activity ? nav(`/activities/${activity.id}`) : undefined)}><span className="block truncate">{title}</span>{room.type !== 'direct' && <span className="block text-[11px] text-ink-3 font-medium">{t('멤버')} {room.memberIds.length}{t('명')}</span>}</button>}
        right={<button onClick={() => setMenu(true)} className="h-10 w-10 grid place-items-center rounded-full" aria-label={t('메뉴')}><MoreVertical size={20} /></button>} />
      <div className="flex-1 overflow-y-auto hide-scrollbar px-4 py-3 space-y-2">
        {activity && <button onClick={() => nav(`/activities/${activity.id}`)} className="w-full card p-3 flex items-center gap-3 text-left press mb-2"><span className="h-9 w-9 rounded-xl bg-primary-soft text-primary grid place-items-center"><CalendarDays size={18} /></span><span className="flex-1 min-w-0"><b className="text-[13px] block truncate">{activity.title}</b><span className="text-[11px] text-ink-3">{activity.place.name} · {activity.date} {activity.startTime}</span></span></button>}
        {other && !blocked && <MutualHeader roomId={room.id} other={other} origin={origin} onCoffee={() => setCoffeeOpen(true)} onMutual={() => setMutualOpen(true)} mutualCount={mutualUsers.length} />}
        {room.messages.filter((m) => !m.system).length === 0 && failed.length === 0 && (
          other && !inputOff ? <Openers other={other} onPick={(s) => setText(s)} />
            : <div className="text-center text-[12px] text-ink-3 py-8">{t('대화를 시작해보세요. 차단·신고는 오른쪽 위 메뉴에서 할 수 있어요.')}</div>
        )}
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
        {failed.map((f) => (
          <div key={f.id} className="flex flex-col items-end gap-1">
            <div className="max-w-[72%] inline-block px-3.5 py-2 rounded-2xl rounded-br-md text-[14px] leading-relaxed bg-primary/50 text-white">{f.text}</div>
            <div className="flex items-center gap-2 text-[11px]">
              <span className="text-danger font-semibold">{t('전송 실패')}</span>
              <button type="button" onClick={() => send(f.text, f.id)} className="font-bold text-primary flex items-center gap-0.5 press"><RotateCw size={11} />{t('다시 보내기')}</button>
              <button type="button" onClick={() => setFailed((x) => x.filter((y) => y.id !== f.id))} className="text-ink-3 press" aria-label={t('삭제')}><X size={12} /></button>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      {other && inputOff && (
        <div className="shrink-0 border-t border-line bg-surface-2 px-4 py-2.5 flex items-center gap-2 text-[12px] text-ink-2">
          <Lock size={13} className="text-ink-3 shrink-0" />
          <span className="flex-1">{blocked ? (v.hasBlocked(other.id) ? t('차단한 사용자예요. 차단을 해제해야 대화할 수 있어요.') : t('지금은 이 사람과 대화할 수 없어요.')) : `${t('지금은 메시지를 보낼 수 없어요.')} ${msg.reason}`}</span>
          {blocked && v.hasBlocked(other.id) && <Button size="sm" variant="outline" onClick={() => run(() => api.relationships.unblock(v.me.id, other.id), t('차단을 해제했어요.')).catch(() => undefined)}>{t('차단 해제')}</Button>}
        </div>
      )}
      <form className="shrink-0 border-t border-line bg-surface p-2.5 flex gap-2 safe-bottom" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input className="flex-1 h-11 rounded-2xl bg-surface-2 px-4 text-[14px] outline-none focus:bg-surface focus:ring-1 ring-primary disabled:opacity-60" placeholder={blocked ? t('차단된 사용자와는 대화할 수 없어요') : locked ? t('메시지를 보낼 수 없어요') : t('메시지 입력…')} value={text} onChange={(e) => setText(e.target.value)} disabled={inputOff} />
        <Button type="submit" className="h-11 w-11 !px-0 rounded-2xl" disabled={!text.trim() || inputOff} aria-label={t('보내기')}><Send size={18} /></Button>
      </form>

      <BottomSheet open={menu} onClose={() => setMenu(false)} title={title}>
        <div className="space-y-1">
          {room.type !== 'direct' && <div className="px-3 py-2 text-[12px] text-ink-3 flex items-center gap-1"><Users size={13} />{t('멤버')} {room.memberIds.map((id) => v.userById(id)?.nickname ?? (id === v.me.id ? t('나') : '')).filter(Boolean).join(', ')}</div>}
          {other && <SheetItem icon={<Flag size={18} />} label={t('사용자 신고')} danger onClick={() => { setMenu(false); setReport(true); }} />}
          {other && <SheetItem icon={<Ban size={18} />} label={blocked ? t('차단 해제') : t('사용자 차단')} danger onClick={() => { setMenu(false); blocked ? run(() => api.relationships.unblock(v.me.id, other.id), t('차단을 해제했어요.')) : setBlockOpen(true); }} />}
          {activity && activity.hostId !== v.me.id && <SheetItem icon={<LogOut size={18} />} label={t('활동 나가기')} danger onClick={async () => { setMenu(false); await run(() => api.activities.cancel(activity.id, v.me.id), t('활동에서 나갔어요.')); nav('/chats?tab=activity'); }} />}
          {!other && !activity && <SheetItem icon={<Flag size={18} />} label={t('채팅방 신고')} danger onClick={() => { setMenu(false); setReport(true); }} />}
          <SheetItem icon={<Bug size={18} className="text-ink-3" />} label={t('전송 실패 미리보기 (데모)')} onClick={() => { setMenu(false); api.system.failNext(); showToast(t('다음 메시지 전송이 한 번 실패해요')); }} />
        </div>
      </BottomSheet>
      {other && <CoffeeSheet open={coffeeOpen} onClose={() => setCoffeeOpen(false)} other={other} />}
      {other && (
        <BottomSheet open={mutualOpen} onClose={() => setMutualOpen(false)} title={`${t('공통 연결')} ${mutualUsers.length}${t('명')}`}>
          <div className="space-y-1">
            {mutualUsers.filter(canShowInPath).map((m) => <button key={m.id} onClick={() => { setMutualOpen(false); nav(`/users/${m.id}`); }} className="w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left press hover:bg-surface-2"><Avatar emoji={m.avatar.emoji} hue={m.avatar.hue} url={m.avatar.url} size={36} /><span className="flex-1 min-w-0"><span className="block text-[14px] font-semibold truncate">{m.nickname}</span><SchoolBadge user={m} size="sm" /></span><ChevronRight size={16} className="text-ink-3" /></button>)}
            {mutualUsers.some((m) => !canShowInPath(m)) && <PrivacyNote text={`${t('외')} ${mutualUsers.filter((m) => !canShowInPath(m)).length}${t('명은 경로에 이름을 보이지 않게 설정했어요')}`} className="px-2 pt-2" />}
          </div>
        </BottomSheet>
      )}
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

/** 이 방이 어떻게 열렸나 — 시스템 메시지로 판단 */
function roomOrigin(room: ChatRoom): string | null {
  for (const m of room.messages) {
    if (!m.system) continue;
    if (m.text.startsWith(t('사람 찾아보기에서 이어졌어요: '))) return t('사람 찾아보기에서 이어졌어요');
    if (m.text.endsWith(t('님이 이어줬어요'))) return m.text;
    if (m.text === t('활동 제안을 수락했어요. 세부 일정 이야기해요!')) return t('모임 제안에서 이어졌어요');
  }
  return null;
}

/**
 * Mutual Room 머리 카드 — DM 위에 작게: 연결된 이유 · 둘이 겹치는 것(공통 연결·그룹·관심사…) · 둘 다 갈 수 있는 작은 모임 · 빠른 행동.
 * 공개 범위(profileView)가 허용한 것만. 그 아래는 그냥 대화.
 */
function MutualHeader({ roomId, other, origin, mutualCount, onCoffee, onMutual }: { roomId: string; other: User; origin: string | null; mutualCount: number; onCoffee: () => void; onMutual: () => void }) {
  const nav = useNavigate();
  const v = useViewer();
  const snap = useSnapshot();
  const sec = useSectionState(`room-${roomId}`);
  const orgs = useAppStore((s) => s.organizations);
  const view = profileView(v.snap, v.me, other);
  const city = cityOf(other);
  const chips = overlapChips(snap, v.me, other, (i) => INTEREST_LABELS[i as Interest] ?? i)
    .filter((c) => view.city || c !== city)
    .map((c) => (c.startsWith('__mutual:') ? `${t('공통 연결')} ${c.slice(9)}${t('명')}` : c));
  const groups = view.groups ? orgs.filter((o) => { const has = (id: string) => o.memberIds.includes(id) || o.adminIds.includes(id); return has(v.me.id) && has(other.id); }).slice(0, 2) : [];
  const why = origin ?? (v.isFriend(other.id) ? t('연결된 사이예요') : v.connection(other.id) === 'activity' ? t('같은 모임에서 만났어요') : null);
  return (
    <Section loading={sec.loading} error={sec.error} onRetry={sec.retry} skeleton={<SectionSkeleton count={1} className="mb-2" />}>
      <div className="rounded-[20px] border border-line bg-white p-3 mb-2">
        {why && <div className="text-[11px] text-ink-3 mb-1.5"><span className="font-bold">{t('연결된 이유')}</span> · {why}</div>}
        {(chips.length > 0 || groups.length > 0) && (
          <>
            <div className="text-[11px] font-bold text-ink-3">{t('둘이 겹치는 것')}</div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {chips.map((c) => <span key={c} className="h-7 px-3 rounded-full bg-accent-soft text-primary text-[12px] font-semibold inline-flex items-center">{c}</span>)}
              {groups.map((o) => <button key={o.id} onClick={() => nav(`/orgs/${o.id}`)} className="h-7 px-3 rounded-full bg-primary-soft text-primary text-[12px] font-semibold inline-flex items-center gap-1 press"><Users size={11} />{o.name}</button>)}
            </div>
          </>
        )}
        <SmallTables other={other} compact className="mt-3" />
        <div className="mt-3 flex gap-1.5 overflow-x-auto hide-scrollbar">
          <button type="button" onClick={onCoffee} className="h-8 px-3 rounded-full bg-surface-2 text-[12px] font-semibold text-primary inline-flex items-center gap-1 whitespace-nowrap press"><Coffee size={13} />{t('커피 일정 잡기')}</button>
          <button type="button" onClick={() => nav(`/meet/create?invite=${other.id}`)} className="h-8 px-3 rounded-full bg-surface-2 text-[12px] font-semibold text-primary inline-flex items-center gap-1 whitespace-nowrap press"><Plus size={13} />{t('작은 모임 만들기')}</button>
          {mutualCount > 0 && <button type="button" onClick={onMutual} className="h-8 px-3 rounded-full bg-surface-2 text-[12px] font-semibold text-primary inline-flex items-center gap-1 whitespace-nowrap press"><Users size={13} />{t('공통 연결 보기')}</button>}
        </div>
      </div>
    </Section>
  );
}

/** 빈 대화 — 겹치는 것에서 나온 첫 마디 2~3개. 누르면 입력창에 채워진다 */
function Openers({ other, onPick }: { other: User; onPick: (text: string) => void }) {
  const v = useViewer();
  const snap = useSnapshot();
  const en = lang === 'en';
  const out: string[] = [];
  const ci = commonInterests(v.me, other)[0];
  if (ci) out.push(en ? `We're both into ${INTEREST_LABELS[ci]} — what are you into lately?` : `둘 다 ${INTEREST_LABELS[ci]}에 관심 있으시네요 — 요즘 뭐 보세요?`);
  const table = sharedSmallTables(snap, v.me, other, v.visibleActivities, 1)[0];
  if (table) out.push(en ? `Want to check out "${table.title}" together?` : `"${table.title}" 같이 가볼래요?`);
  const via = mutualFriends(v.snap, v.me.id, other.id).map((id) => v.userById(id)).find((u): u is User => !!u && canShowInPath(u));
  if (via) out.push(en ? `Found you through ${via.nickname} — nice to meet you!` : `${via.nickname}님 통해 알게 됐어요. 반가워요!`);
  if (out.length < 2 && v.me.affiliation.type === 'university' && other.affiliation.type === 'university' && v.me.affiliation.schoolId === other.affiliation.schoolId) out.push(en ? 'Same school! Any favorite spot on campus?' : '같은 학교네요! 학교에서 자주 가는 곳 있어요?');
  if (out.length < 2) out.push(t('안녕하세요! 프로필 보고 반가워서 인사드려요 🙂'));
  return (
    <div className="py-4">
      <div className="text-center text-[12px] text-ink-3">{t('첫 마디가 고민되면 골라보세요')}</div>
      <div className="mt-2.5 flex flex-col items-center gap-1.5">
        {out.slice(0, 3).map((o) => <button key={o} type="button" onClick={() => onPick(o)} className="max-w-full px-3.5 py-2 rounded-2xl border border-line bg-white text-[13px] text-ink-2 text-left press hover:bg-surface-2">{o}</button>)}
      </div>
    </div>
  );
}

/** ☕ 커피 일정 잡기 — 언제 + 한마디 → 제안 (48시간 뒤 만료) */
function CoffeeSheet({ open, onClose, other }: { open: boolean; onClose: () => void; other: User }) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [when, setWhen] = useState(`${todayISO()} 18:00`);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setWhen(`${todayISO()} 18:00`); setMessage(t('커피 한 잔 어때요?')); } }, [open]);
  const submit = async () => {
    setBusy(true);
    try { await run(() => api.proposals.create(v.me.id, other.id, { category: 'coffee', message, when }), t('커피 일정을 제안했어요. 수락되면 알려드릴게요.')); onClose(); }
    catch { /* toast by run */ } finally { setBusy(false); }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={`☕ ${t('커피 일정 잡기')}`}>
      <p className="text-[12px] text-ink-3">{t('읽음 여부는 표시되지 않고, 48시간이 지나면 자동으로 만료돼요.')}</p>
      <Input className="mt-3" placeholder={t('언제? 예: 오늘 18:00')} value={when} onChange={(e) => setWhen(e.target.value)} />
      <Textarea className="mt-2" value={message} onChange={(e) => setMessage(e.target.value)} />
      <Button full size="lg" className="mt-4" loading={busy} disabled={!message.trim() || !when.trim()} onClick={submit}>{t('제안 보내기')}</Button>
    </BottomSheet>
  );
}
