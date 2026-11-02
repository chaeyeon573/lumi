import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Clock, MapPin, Users, StickyNote, Share2, MoreHorizontal, Flag, Ban, MessageCircle, ShieldCheck, Lock, Unlock, XCircle, Pencil, LogOut } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, Button, BottomSheet, Dialog, EmptyState, Input, Textarea, Field } from '@/components/ui';
import { SampleTag } from '@/components/ui/SampleTag';
import { SheetItem } from '@/components/cards/PostCard';
import { ReportSheet } from '@/components/cards/ReportSheet';
import { RideCard, StudentMark, firstName, useRides } from '@/components/rides/RideBits';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { cn } from '@core/lib/cn';
import { shareOrCopy } from '@/lib/native';
import { lang } from '@core/i18n';
import {
  campusToday, destLabel, fareText, isFull, matchRides, pickupLabel, rideEligibility, rideTitle, seatsLeft, seatsText, whenLabel,
  MAX_NOTE, RIDE_KIND_EMOJI, RIDE_KIND_LABELS, SAFETY_NOTE, type Ride,
  rideLeft,
} from '@core/lib/rides';

export const rideLink = (id: string) => `${window.location.origin}/r/${id}`;
const L = (en: string, ko: string) => (lang === 'en' ? en : ko);

export function RideDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const showToast = useAppStore((s) => s.showToast);
  const rooms = useAppStore((s) => s.chatRooms);
  const relationships = useAppStore((s) => s.relationships);
  const rides = useRides();
  const r = rides.find((x) => x.id === id);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [block, setBlock] = useState(false);
  const [cancel, setCancel] = useState(false);
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const today = campusToday();
  const matches = useMemo(() => (r ? matchRides({ rides, relationships }, r, v.me.id, today) : []), [r, rides, relationships, v.me.id, today]);

  if (!r) return <div className="min-h-full"><TopBar back title={L('Ride', '라이드')} /><EmptyState emoji="🚗" title={L("This ride isn't available", '볼 수 없는 라이드예요')} description={L("It was cancelled, it's from another school, or it's no longer visible to you.", '취소됐거나, 다른 학교 라이드이거나, 더 이상 볼 수 없어요.')} action={<Button onClick={() => nav('/rides')}>{L('See rides', '라이드 보기')}</Button>} /></div>;

  const host = v.userById(r.hostId);
  const isHost = r.hostId === v.me.id;
  const joined = r.memberIds.includes(v.me.id);
  const inRide = isHost || joined;
  const room = r.roomId ? rooms.find((c) => c.id === r.roomId) : undefined;
  const left = seatsLeft(r);
  const past = rideLeft(r);
  const eligible = rideEligibility(v.me);
  const people = [r.hostId, ...r.memberIds];
  const you = L('You', '나');
  const headline = inRide && r.memberIds.length
    ? people.map((pid) => (pid === v.me.id ? you : firstName(v.userById(pid)))).sort((a, b) => (a === you ? -1 : b === you ? 1 : 0)).join(' + ')
    : `${isHost ? you : firstName(host)} → ${destLabel(r)}`;
  const lastMsg = room?.messages.filter((m) => !m.system).slice(-1)[0];

  const share = async () => {
    const url = rideLink(r.id);
    // share sheet (iPhone app / phone browsers), else copy — src/lib/native.ts
    if (await shareOrCopy({ title: rideTitle(r), url }) === 'copied') showToast(L('Link copied — paste it in your group chat.', '링크를 복사했어요 — 단톡방에 붙여 넣으세요.'), 'success');
  };
  const act = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); } catch { /* toast shown */ } finally { setBusy(false); } };
  const join = () => act(async () => { await run(() => api.rides.join(r.id, v.me.id), L("You're in — the ride chat is open.", '함께 타요 — 라이드 채팅이 열렸어요.')); });

  return (
    <div className="min-h-full pb-28 bg-bg">
      <TopBar back title="" right={<button onClick={() => setMenu(true)} className="h-10 w-10 grid place-items-center rounded-full text-ink" aria-label={L('More', '더 보기')}><MoreHorizontal size={20} /></button>} />
      <div className="px-4">
        <div className="text-[11.5px] font-extrabold tracking-[0.12em] uppercase text-primary v2:text-pink-300">
          {RIDE_KIND_EMOJI[r.kind]} {RIDE_KIND_LABELS[r.kind]} · {destLabel(r)}
        </div>
        <h1 className="font-display text-[28px] leading-[1.1] font-extrabold text-ink mt-1.5">{r.sample && <SampleTag />}{headline}</h1>
        <p className="text-[14px] text-ink-2 mt-1.5">{L(`Leave ${whenLabel(r)} · from ${pickupLabel(r)}`, `${whenLabel(r)} 출발 · ${pickupLabel(r)}에서`)}</p>
        {r.sample && <p className="text-[12px] text-ink-3 mt-1">{L('Sample ride — made up to show how rides work.', '예시 라이드 — 사용법을 보여 주려고 만든 거예요.')}</p>}
        {r.status !== 'open' && <p className={cn('mt-2 inline-flex h-7 px-3 rounded-full items-center text-[12px] font-bold', r.status === 'cancelled' ? 'bg-danger-soft text-danger' : 'bg-surface-2 text-ink-2')}>{r.status === 'cancelled' ? L('Cancelled', '취소됨') : L('Closed to new riders', '새로 타는 사람 마감')}</p>}

        {/* who's in */}
        <div className="card mt-4 p-4">
          <div className="flex flex-wrap gap-x-4 gap-y-3">
            {(inRide ? people : [r.hostId]).map((pid) => { const u = v.userById(pid); return (
              <button key={pid} onClick={() => pid !== v.me.id && nav(`/users/${pid}`)} className="flex flex-col items-center w-[64px]">
                <Avatar emoji={u?.avatar.emoji ?? '🙂'} hue={u?.avatar.hue ?? 210} url={u?.avatar.url} size={54} />
                <span className="mt-1 text-[13px] font-bold text-ink flex items-center gap-0.5 max-w-full"><span className="truncate">{pid === v.me.id ? you : firstName(u)}</span>{pid !== v.me.id && !u?.sample && <StudentMark user={u} />}</span>
                <span className="text-[11px] text-ink-3">{pid === r.hostId ? (r.kind === 'driving' ? L('Driver', '운전') : L('Host', '올린 사람')) : L('Rider', '탑승')}</span>
              </button>
            ); })}
            {!inRide && r.memberCount > 0 && <div className="flex flex-col items-center w-[64px]"><span className="h-[54px] w-[54px] rounded-full bg-surface-2 grid place-items-center text-[15px] font-bold text-ink-2">+{r.memberCount}</span><span className="mt-1 text-[12px] text-ink-3">{L('joined', '함께 탐')}</span></div>}
            {left !== null && Array.from({ length: Math.min(left, 4) }).map((_, i) => (
              <div key={i} className="flex flex-col items-center w-[64px]"><span className="h-[54px] w-[54px] rounded-full border-2 border-dashed border-line grid place-items-center text-ink-3 text-[18px]">+</span><span className="mt-1 text-[12px] text-ink-3">{L('Open', '빈자리')}</span></div>
            ))}
          </div>
          {!inRide && (left !== null || r.memberCount > 0) && <p className="text-[12px] text-ink-3 mt-3">{L("Riders' names show once you join.", '함께 타면 다른 사람 이름이 보여요.')}</p>}
        </div>

        {/* split */}
        <div className="mt-3 rounded-[22px] p-4 bg-primary-soft v2:bg-[#2a0e20] v2:border v2:border-pink-800">
          <div className="text-[11px] font-extrabold tracking-[0.12em] uppercase text-primary v2:text-pink-300">{r.estTotal ? L('Estimated split', '예상 나눔') : L('Cost', '비용')}</div>
          <div className="font-display text-[24px] font-extrabold text-ink mt-0.5">{fareText(r)}</div>
          <p className="text-[12.5px] text-ink-2 mt-1">{r.estTotal ? L(`Host's estimate for the whole trip: $${r.estTotal}. `, `올린 사람이 적은 전체 예상 비용: $${r.estTotal}. `) : ''}{L("Lumi doesn't set prices or take payments — settle the split in the ride chat.", 'Lumi는 가격을 정하거나 돈을 받지 않아요 — 나누는 건 라이드 채팅에서 정하세요.')}</p>
        </div>

        <div className="card mt-3 divide-y divide-line">
          <Row icon={<Clock size={16} />} label={L('Leaving', '출발')} value={whenLabel(r)} />
          <Row icon={<MapPin size={16} />} label={L('Pickup (public spot)', '탑승 장소 (공개된 곳)')} value={pickupLabel(r)} />
          <Row icon={<Users size={16} />} label={L('Seats', '자리')} value={r.kind === 'looking' ? L(`${r.seats} ${r.seats === 1 ? 'person needs' : 'people need'} a ride`, `${r.seats}명이 타야 해요`) : L(`${r.seats} total · ${seatsText(r)}`, `모두 ${r.seats}자리 · ${seatsText(r)}`)} />
          {r.note && <Row icon={<StickyNote size={16} />} label={L('Note', '메모')} value={`“${r.note}”`} />}
        </div>

        {inRide && r.status !== 'cancelled' && (
          <button onClick={() => room && nav(`/chats/${room.id}`)} disabled={!room} className="card mt-3 p-3.5 w-full flex items-center gap-3 text-left press disabled:opacity-60">
            <span className="h-10 w-10 rounded-full bg-primary text-on-primary grid place-items-center shrink-0"><MessageCircle size={18} /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-bold text-ink">{room ? L('Ride chat', '라이드 채팅') : L('Ride chat opens when someone joins', '누가 함께 타면 라이드 채팅이 열려요')}</span>
              <span className="block text-[12.5px] text-ink-2 truncate">{lastMsg ? `“${lastMsg.text}”` : room ? L('Agree on the exact meeting point and the split', '정확한 만날 곳과 나눌 금액을 정하세요') : L('Share the link to fill seats faster', '링크를 공유하면 자리가 더 빨리 차요')}</span>
            </span>
          </button>
        )}

        <p className="mt-3 flex gap-2 text-[12px] text-ink-3 leading-snug"><ShieldCheck size={15} className="shrink-0 text-mint" />{SAFETY_NOTE}</p>

        {matches.length > 0 && r.status !== 'cancelled' && (
          <section className="mt-5">
            <h2 className="text-[15px] font-bold text-ink">{L('Also going around then', '비슷한 시간에 가는 차')}</h2>
            <p className="text-[12px] text-ink-3 mb-2">{L(`Same destination, leaving within 90 minutes${isHost ? ' — invite them to merge in the chat' : ''}.`, `같은 목적지, 90분 안에 출발${isHost ? ' — 채팅에서 합치자고 해 보세요' : ''}.`)}</p>
            <div className="space-y-2">{matches.slice(0, 4).map((m: Ride) => <RideCard key={m.id} ride={m} />)}</div>
          </section>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 flex gap-2 safe-bottom z-20">
        <button onClick={share} className="h-[52px] w-[52px] rounded-2xl bg-surface-2 grid place-items-center text-ink-2 press" aria-label={L('Share link', '링크 공유')}><Share2 size={20} /></button>
        {isHost ? (
          r.status === 'cancelled' ? <Button size="lg" className="flex-1" variant="outline" onClick={() => nav(`/rides/new?to=${r.to}&date=${r.date}`)}>{L('Post a new ride', '새로 올리기')}</Button>
            : r.status === 'open' ? <Button size="lg" className="flex-1" variant="secondary" loading={busy} icon={<Lock size={17} />} onClick={() => act(() => run(() => api.rides.close(r.id, v.me.id), L('Closed to new riders.', '새로 타는 사람을 마감했어요.')))}>{L('Close to new riders', '새로 타는 사람 마감')}</Button>
              : <Button size="lg" className="flex-1" variant="secondary" loading={busy} icon={<Unlock size={17} />} onClick={() => act(() => run(() => api.rides.reopen(r.id, v.me.id), L('Open for riders again.', '다시 받아요.')))}>{L('Reopen', '다시 열기')}</Button>
        ) : joined ? (
          room && r.status !== 'cancelled' ? <Button size="lg" className="flex-1" icon={<MessageCircle size={18} />} onClick={() => nav(`/chats/${room.id}`)}>{L('Open ride chat', '라이드 채팅 열기')}</Button> : <Button size="lg" className="flex-1" variant="outline" onClick={() => nav('/rides')}>{L('Find another ride', '다른 차 찾기')}</Button>
        ) : (
          <Button size="lg" className="flex-1" loading={busy} disabled={!eligible.ok || r.status !== 'open' || isFull(r) || past} onClick={join}>
            {!eligible.ok ? (eligible.minor ? L('Rides are 18+', '만 18세 이상') : L('Verify your school email to join', '학교 이메일을 인증하면 탈 수 있어요')) : past ? L('This ride has left', '이미 떠난 차예요') : r.status !== 'open' ? L('Closed', '모집 마감') : isFull(r) ? L('Full', '마감') : r.kind === 'looking' ? L(`Team up with ${firstName(host)}`, `${firstName(host)}님과 같이 가기`) : L(`Join · ${seatsText(r)}`, `같이 타기 · ${seatsText(r)}`)}
          </Button>
        )}
      </div>

      <BottomSheet open={menu} onClose={() => setMenu(false)} title={L('Ride', '라이드')}>
        <div className="space-y-1">
          <SheetItem icon={<Share2 size={18} />} label={L('Share link', '링크 공유')} onClick={() => { setMenu(false); void share(); }} />
          {isHost && r.status !== 'cancelled' && <SheetItem icon={<Pencil size={18} />} label={L('Edit seats, estimate or note', '자리·예상 비용·메모 고치기')} onClick={() => { setMenu(false); setEdit(true); }} />}
          {isHost && r.status !== 'cancelled' && <SheetItem icon={<XCircle size={18} />} label={L('Cancel ride', '라이드 취소')} danger onClick={() => { setMenu(false); setCancel(true); }} />}
          {joined && <SheetItem icon={<LogOut size={18} />} label={L('Leave this ride', '이 라이드에서 빠지기')} danger onClick={() => { setMenu(false); void act(() => run(() => api.rides.leave(r.id, v.me.id), L('You left the ride.', '라이드에서 빠졌어요.'))); }} />}
          {!isHost && <SheetItem icon={<Flag size={18} />} label={L('Report ride', '라이드 신고')} danger onClick={() => { setMenu(false); setReport(true); }} />}
          {!isHost && host && <SheetItem icon={<Ban size={18} />} label={L(`Block ${firstName(host)}`, `${firstName(host)} 차단`)} danger onClick={() => { setMenu(false); setBlock(true); }} />}
        </div>
      </BottomSheet>
      <ReportSheet open={report} onClose={() => setReport(false)} targetType="ride" targetId={r.id} />
      <Dialog open={block} onClose={() => setBlock(false)} title={L(`Block ${firstName(host)}?`, `${firstName(host)}님을 차단할까요?`)} description={L("You won't see each other's rides, profiles or posts, and you can't message each other. They aren't notified.", '서로의 라이드·프로필·글이 안 보이고 메시지도 못 보내요. 상대에게 알리지 않아요.')}>
        <Button variant="outline" full onClick={() => setBlock(false)}>{L('Cancel', '취소')}</Button>
        <Button variant="danger" full onClick={async () => { setBlock(false); if (joined) await run(() => api.rides.leave(r.id, v.me.id)).catch(() => {}); await run(() => api.relationships.block(v.me.id, r.hostId), L('Blocked.', '차단했어요.')); nav('/rides', { replace: true }); }}>{L('Block', '차단')}</Button>
      </Dialog>
      <Dialog open={cancel} onClose={() => setCancel(false)} title={L('Cancel this ride?', '이 라이드를 취소할까요?')} description={r.memberIds.length ? L(`${r.memberIds.length} rider${r.memberIds.length === 1 ? '' : 's'} will be told so they can find another ride.`, `함께 타는 ${r.memberIds.length}명에게 알려서 다른 차를 찾게 해요.`) : L('It disappears from the list.', '목록에서 사라져요.')}>
        <Button variant="outline" full onClick={() => setCancel(false)}>{L('Keep it', '그대로 두기')}</Button>
        <Button variant="danger" full onClick={async () => { setCancel(false); await act(() => run(() => api.rides.cancel(r.id, v.me.id), L('Ride cancelled.', '라이드를 취소했어요.'))); }}>{L('Cancel ride', '라이드 취소')}</Button>
      </Dialog>
      {isHost && <EditSheet open={edit} onClose={() => setEdit(false)} ride={r} />}
    </div>
  );
}

function EditSheet({ open, onClose, ride }: { open: boolean; onClose: () => void; ride: Ride }) {
  const run = useAppStore((s) => s.run);
  const me = useAppStore((s) => s.currentUserId)!;
  const [seats, setSeats] = useState(ride.seats);
  const [est, setEst] = useState(ride.estTotal ? String(ride.estTotal) : '');
  const [note, setNote] = useState(ride.note ?? '');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await run(() => api.rides.update(ride.id, me, { seats, estTotal: est ? Number(est) : undefined, note }), L('Ride updated.', '고쳤어요.')); onClose(); } catch { /* toast */ } finally { setBusy(false); }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={L('Edit ride', '라이드 고치기')}>
      <div className="space-y-4">
        <Field label={ride.kind === 'looking' ? L('People who need a ride', '타야 하는 사람 수') : L('Seats', '자리')}><Input type="number" min={Math.max(1, ride.memberCount)} max={ride.kind === 'looking' ? 4 : 5} value={seats} onChange={(e) => setSeats(Number(e.target.value))} /></Field>
        <Field label={L('Estimated total ($, optional)', '예상 총액 ($, 선택)')} hint={L('Leave blank to split evenly.', '비워 두면 똑같이 나눠요.')}><Input inputMode="numeric" value={est} onChange={(e) => setEst(e.target.value.replace(/[^\d]/g, '').slice(0, 4))} /></Field>
        <Field label={L('Note', '메모')}><Textarea rows={2} maxLength={MAX_NOTE} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <Button full size="lg" loading={busy} onClick={save}>{L('Save', '저장')}</Button>
      </div>
    </BottomSheet>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="mt-0.5 text-ink-3">{icon}</span>
      <span className="flex-1 min-w-0"><span className="block text-[11.5px] text-ink-3">{label}</span><span className="block text-[14px] font-semibold text-ink">{value}</span></span>
    </div>
  );
}
