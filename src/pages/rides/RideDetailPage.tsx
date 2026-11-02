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
import {
  campusToday, destLabel, fareText, isFull, matchRides, pickupLabel, rideEligibility, rideTitle, seatsLeft, seatsText, whenLabel,
  MAX_NOTE, RIDE_KIND_EMOJI, RIDE_KIND_LABELS, SAFETY_NOTE, type Ride,
  rideLeft,
} from '@core/lib/rides';

export const rideLink = (id: string) => `${window.location.origin}/r/${id}`;

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

  if (!r) return <div className="min-h-full"><TopBar back title="Ride" /><EmptyState emoji="🚗" title="This ride isn't available" description="It was cancelled, it's from another school, or it's no longer visible to you." action={<Button onClick={() => nav('/rides')}>See rides</Button>} /></div>;

  const host = v.userById(r.hostId);
  const isHost = r.hostId === v.me.id;
  const joined = r.memberIds.includes(v.me.id);
  const inRide = isHost || joined;
  const room = r.roomId ? rooms.find((c) => c.id === r.roomId) : undefined;
  const left = seatsLeft(r);
  const past = rideLeft(r);
  const eligible = rideEligibility(v.me);
  const people = [r.hostId, ...r.memberIds];
  const headline = inRide && r.memberIds.length
    ? people.map((pid) => (pid === v.me.id ? 'You' : firstName(v.userById(pid)))).sort((a, b) => (a === 'You' ? -1 : b === 'You' ? 1 : 0)).join(' + ')
    : `${isHost ? 'You' : firstName(host)} → ${destLabel(r)}`;
  const lastMsg = room?.messages.filter((m) => !m.system).slice(-1)[0];

  const share = async () => {
    const url = rideLink(r.id);
    // share sheet (iPhone app / phone browsers), else copy — src/lib/native.ts
    if (await shareOrCopy({ title: rideTitle(r), url }) === 'copied') showToast('Link copied — paste it in your group chat.', 'success');
  };
  const act = async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); } catch { /* toast shown */ } finally { setBusy(false); } };
  const join = () => act(async () => { await run(() => api.rides.join(r.id, v.me.id), `You're in — the ride chat is open.`); });

  return (
    <div className="min-h-full pb-28 bg-bg">
      <TopBar back title="" right={<button onClick={() => setMenu(true)} className="h-10 w-10 grid place-items-center rounded-full text-ink" aria-label="More"><MoreHorizontal size={20} /></button>} />
      <div className="px-4">
        <div className="text-[11.5px] font-extrabold tracking-[0.12em] uppercase text-primary v2:text-pink-300">
          {RIDE_KIND_EMOJI[r.kind]} {RIDE_KIND_LABELS[r.kind]} · {destLabel(r)}
        </div>
        <h1 className="font-display text-[28px] leading-[1.1] font-extrabold text-ink mt-1.5">{r.sample && <SampleTag />}{headline}</h1>
        <p className="text-[14px] text-ink-2 mt-1.5">Leave {whenLabel(r)} · from {pickupLabel(r)}</p>
        {r.sample && <p className="text-[12px] text-ink-3 mt-1">Sample ride — made up to show how rides work.</p>}
        {r.status !== 'open' && <p className={cn('mt-2 inline-flex h-7 px-3 rounded-full items-center text-[12px] font-bold', r.status === 'cancelled' ? 'bg-danger-soft text-danger' : 'bg-surface-2 text-ink-2')}>{r.status === 'cancelled' ? 'Cancelled' : 'Closed to new riders'}</p>}

        {/* who's in */}
        <div className="card mt-4 p-4">
          <div className="flex flex-wrap gap-x-4 gap-y-3">
            {(inRide ? people : [r.hostId]).map((pid) => { const u = v.userById(pid); return (
              <button key={pid} onClick={() => pid !== v.me.id && nav(`/users/${pid}`)} className="flex flex-col items-center w-[64px]">
                <Avatar emoji={u?.avatar.emoji ?? '🙂'} hue={u?.avatar.hue ?? 210} url={u?.avatar.url} size={54} />
                <span className="mt-1 text-[13px] font-bold text-ink flex items-center gap-0.5 max-w-full"><span className="truncate">{pid === v.me.id ? 'You' : firstName(u)}</span>{pid !== v.me.id && !u?.sample && <StudentMark user={u} />}</span>
                <span className="text-[11px] text-ink-3">{pid === r.hostId ? (r.kind === 'driving' ? 'Driver' : 'Host') : 'Rider'}</span>
              </button>
            ); })}
            {!inRide && r.memberCount > 0 && <div className="flex flex-col items-center w-[64px]"><span className="h-[54px] w-[54px] rounded-full bg-surface-2 grid place-items-center text-[15px] font-bold text-ink-2">+{r.memberCount}</span><span className="mt-1 text-[12px] text-ink-3">joined</span></div>}
            {left !== null && Array.from({ length: Math.min(left, 4) }).map((_, i) => (
              <div key={i} className="flex flex-col items-center w-[64px]"><span className="h-[54px] w-[54px] rounded-full border-2 border-dashed border-line grid place-items-center text-ink-3 text-[18px]">+</span><span className="mt-1 text-[12px] text-ink-3">Open</span></div>
            ))}
          </div>
          {!inRide && (left !== null || r.memberCount > 0) && <p className="text-[12px] text-ink-3 mt-3">Riders' names show once you join.</p>}
        </div>

        {/* split */}
        <div className="mt-3 rounded-[22px] p-4 bg-primary-soft v2:bg-[#2a0e20] v2:border v2:border-pink-800">
          <div className="text-[11px] font-extrabold tracking-[0.12em] uppercase text-primary v2:text-pink-300">{r.estTotal ? 'Estimated split' : 'Cost'}</div>
          <div className="font-display text-[24px] font-extrabold text-ink mt-0.5">{fareText(r)}</div>
          <p className="text-[12.5px] text-ink-2 mt-1">{r.estTotal ? `Host's estimate for the whole trip: $${r.estTotal}. ` : ''}Lumi doesn't set prices or take payments — settle the split in the ride chat.</p>
        </div>

        <div className="card mt-3 divide-y divide-line">
          <Row icon={<Clock size={16} />} label="Leaving" value={whenLabel(r)} />
          <Row icon={<MapPin size={16} />} label="Pickup (public spot)" value={pickupLabel(r)} />
          <Row icon={<Users size={16} />} label="Seats" value={r.kind === 'looking' ? `${r.seats} ${r.seats === 1 ? 'person needs' : 'people need'} a ride` : `${r.seats} total · ${seatsText(r)}`} />
          {r.note && <Row icon={<StickyNote size={16} />} label="Note" value={`“${r.note}”`} />}
        </div>

        {inRide && r.status !== 'cancelled' && (
          <button onClick={() => room && nav(`/chats/${room.id}`)} disabled={!room} className="card mt-3 p-3.5 w-full flex items-center gap-3 text-left press disabled:opacity-60">
            <span className="h-10 w-10 rounded-full bg-primary text-on-primary grid place-items-center shrink-0"><MessageCircle size={18} /></span>
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-bold text-ink">{room ? 'Ride chat' : 'Ride chat opens when someone joins'}</span>
              <span className="block text-[12.5px] text-ink-2 truncate">{lastMsg ? `“${lastMsg.text}”` : room ? 'Agree on the exact meeting point and the split' : 'Share the link to fill seats faster'}</span>
            </span>
          </button>
        )}

        <p className="mt-3 flex gap-2 text-[12px] text-ink-3 leading-snug"><ShieldCheck size={15} className="shrink-0 text-mint" />{SAFETY_NOTE}</p>

        {matches.length > 0 && r.status !== 'cancelled' && (
          <section className="mt-5">
            <h2 className="text-[15px] font-bold text-ink">Also going around then</h2>
            <p className="text-[12px] text-ink-3 mb-2">Same destination, leaving within 90 minutes{isHost ? ' — invite them to merge in the chat' : ''}.</p>
            <div className="space-y-2">{matches.slice(0, 4).map((m: Ride) => <RideCard key={m.id} ride={m} />)}</div>
          </section>
        )}
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 flex gap-2 safe-bottom z-20">
        <button onClick={share} className="h-[52px] w-[52px] rounded-2xl bg-surface-2 grid place-items-center text-ink-2 press" aria-label="Share link"><Share2 size={20} /></button>
        {isHost ? (
          r.status === 'cancelled' ? <Button size="lg" className="flex-1" variant="outline" onClick={() => nav(`/rides/new?to=${r.to}&date=${r.date}`)}>Post a new ride</Button>
            : r.status === 'open' ? <Button size="lg" className="flex-1" variant="secondary" loading={busy} icon={<Lock size={17} />} onClick={() => act(() => run(() => api.rides.close(r.id, v.me.id), 'Closed to new riders.'))}>Close to new riders</Button>
              : <Button size="lg" className="flex-1" variant="secondary" loading={busy} icon={<Unlock size={17} />} onClick={() => act(() => run(() => api.rides.reopen(r.id, v.me.id), 'Open for riders again.'))}>Reopen</Button>
        ) : joined ? (
          room && r.status !== 'cancelled' ? <Button size="lg" className="flex-1" icon={<MessageCircle size={18} />} onClick={() => nav(`/chats/${room.id}`)}>Open ride chat</Button> : <Button size="lg" className="flex-1" variant="outline" onClick={() => nav('/rides')}>Find another ride</Button>
        ) : (
          <Button size="lg" className="flex-1" loading={busy} disabled={!eligible.ok || r.status !== 'open' || isFull(r) || past} onClick={join}>
            {!eligible.ok ? (eligible.minor ? 'Rides are 18+' : 'Verify your school email to join') : past ? 'This ride has left' : r.status !== 'open' ? 'Closed' : isFull(r) ? 'Full' : r.kind === 'looking' ? `Team up with ${firstName(host)}` : `Join · ${seatsText(r)}`}
          </Button>
        )}
      </div>

      <BottomSheet open={menu} onClose={() => setMenu(false)} title="Ride">
        <div className="space-y-1">
          <SheetItem icon={<Share2 size={18} />} label="Share link" onClick={() => { setMenu(false); void share(); }} />
          {isHost && r.status !== 'cancelled' && <SheetItem icon={<Pencil size={18} />} label="Edit seats, estimate or note" onClick={() => { setMenu(false); setEdit(true); }} />}
          {isHost && r.status !== 'cancelled' && <SheetItem icon={<XCircle size={18} />} label="Cancel ride" danger onClick={() => { setMenu(false); setCancel(true); }} />}
          {joined && <SheetItem icon={<LogOut size={18} />} label="Leave this ride" danger onClick={() => { setMenu(false); void act(() => run(() => api.rides.leave(r.id, v.me.id), 'You left the ride.')); }} />}
          {!isHost && <SheetItem icon={<Flag size={18} />} label="Report ride" danger onClick={() => { setMenu(false); setReport(true); }} />}
          {!isHost && host && <SheetItem icon={<Ban size={18} />} label={`Block ${firstName(host)}`} danger onClick={() => { setMenu(false); setBlock(true); }} />}
        </div>
      </BottomSheet>
      <ReportSheet open={report} onClose={() => setReport(false)} targetType="ride" targetId={r.id} />
      <Dialog open={block} onClose={() => setBlock(false)} title={`Block ${firstName(host)}?`} description="You won't see each other's rides, profiles or posts, and you can't message each other. They aren't notified.">
        <Button variant="outline" full onClick={() => setBlock(false)}>Cancel</Button>
        <Button variant="danger" full onClick={async () => { setBlock(false); if (joined) await run(() => api.rides.leave(r.id, v.me.id)).catch(() => {}); await run(() => api.relationships.block(v.me.id, r.hostId), 'Blocked.'); nav('/rides', { replace: true }); }}>Block</Button>
      </Dialog>
      <Dialog open={cancel} onClose={() => setCancel(false)} title="Cancel this ride?" description={r.memberIds.length ? `${r.memberIds.length} rider${r.memberIds.length === 1 ? '' : 's'} will be told so they can find another ride.` : 'It disappears from the list.'}>
        <Button variant="outline" full onClick={() => setCancel(false)}>Keep it</Button>
        <Button variant="danger" full onClick={async () => { setCancel(false); await act(() => run(() => api.rides.cancel(r.id, v.me.id), 'Ride cancelled.')); }}>Cancel ride</Button>
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
    try { await run(() => api.rides.update(ride.id, me, { seats, estTotal: est ? Number(est) : undefined, note }), 'Ride updated.'); onClose(); } catch { /* toast */ } finally { setBusy(false); }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title="Edit ride">
      <div className="space-y-4">
        <Field label={ride.kind === 'looking' ? 'People who need a ride' : 'Seats'}><Input type="number" min={Math.max(1, ride.memberCount)} max={ride.kind === 'looking' ? 4 : 5} value={seats} onChange={(e) => setSeats(Number(e.target.value))} /></Field>
        <Field label="Estimated total ($, optional)" hint="Leave blank to split evenly."><Input inputMode="numeric" value={est} onChange={(e) => setEst(e.target.value.replace(/[^\d]/g, '').slice(0, 4))} /></Field>
        <Field label="Note"><Textarea rows={2} maxLength={MAX_NOTE} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <Button full size="lg" loading={busy} onClick={save}>Save</Button>
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
