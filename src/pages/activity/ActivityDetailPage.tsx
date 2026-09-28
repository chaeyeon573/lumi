import { useState } from 'react';
import { t, lang } from '@core/i18n';
import { useNavigate, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import { TILES_ENABLED, TILE_URL, LandmarkLayer } from '@/pages/map/MapPage';
import { Clock, MapPin, Users, Ticket, Lock, Share2, Flag, MoreHorizontal, Pencil, Trash2, BadgeCheck, MessageCircle, ShieldCheck, CalendarPlus, Sparkles, XCircle, HelpCircle } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, Button, Cover, Tag, VisibilityTag, BottomSheet, Dialog, Input, EmptyState } from '@/components/ui';
import { JoinButton } from '@/components/cards/JoinButton';
import { SheetItem } from '@/components/cards/PostCard';
import { ReportSheet } from '@/components/cards/ReportSheet';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { CATEGORY_COLORS, CATEGORY_EMOJI, CATEGORY_LABELS, JOIN_POLICY_LABELS, KIND_LABELS } from '@core/lib/labels';
import { formatDate, formatTime, formatFee, relativeTime, todayISO } from '@core/lib/format';
import { isSmallTable } from '@core/lib/around';
import { recommendSmallTables } from '@core/lib/meet';
import { placeLabel } from '@core/lib/relations';
import type { Activity } from '@core/types';
import { ProposeSheet } from '@/components/people_ProposeSheet';

export function ActivityDetailPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const showToast = useAppStore((s) => s.showToast);
  const participations = useAppStore((s) => s.participations);
  const rooms = useAppStore((s) => s.chatRooms);
  const a = v.visibleActivities.find((x) => x.id === id);
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [text, setText] = useState('');
  const [propose, setPropose] = useState(false);

  if (!a) return <div className="min-h-full"><TopBar back title={t('활동')} /><EmptyState emoji="🔒" title={t('활동을 볼 수 없어요')} description={t('삭제되었거나 공개 범위에 포함되지 않은 활동이에요.')} action={<Button onClick={() => nav('/')}>{t('홈으로')}</Button>} /></div>;

  const host = v.userById(a.hostId);
  const org = a.orgId ? v.orgById(a.orgId) : undefined;
  const approved = participations.filter((p) => p.activityId === a.id && p.status === 'approved');
  const isHost = a.hostId === v.me.id;
  const mine = v.myParticipation(a.id);
  const room = rooms.find((r) => r.activityId === a.id);
  const canChat = room && (isHost || mine?.status === 'approved');
  const color = CATEGORY_COLORS[a.category];
  // Small Table (4~6명) — 승인 전에는 대략적인 장소·참가자 수만
  const small = isSmallTable(a);
  const approvedMe = isHost || mine?.status === 'approved';
  const place = placeLabel(a, v.me, approvedMe);
  const hidePlace = small && place.approximate;
  const past = a.date < todayISO();
  const full = approved.length >= a.capacity;
  const rec = small ? recommendSmallTables([a], { ...v.me, hiddenActivities: [] }, v.users, participations, 1)[0] : undefined;
  const people = [a.hostId, ...approved.map((p) => p.userId)].map((uid) => v.userById(uid)).filter((u): u is NonNullable<typeof u> => !!u);
  const sharedCount = people.filter((u) => u.id !== v.me.id && u.interests.some((i) => v.me.interests.includes(i))).length;
  const contactHost = async () => {
    if (!host) return;
    if (v.canMessage(host.id).ok) {
      try { const res = await run(() => api.chats.openDirect(v.me.id, host.id)); nav(`/chats/${res.room.id}`); } catch { /* toast */ }
    } else setPropose(true);
  };
  const cancelJoin = async () => { try { await run(() => api.activities.cancel(a.id, v.me.id), t('참가를 취소했어요.')); } catch { /* toast */ } };

  return (
    <div className="min-h-full pb-28">
      <TopBar back title="" transparent className="absolute left-0 right-0" right={<button onClick={() => setMenu(true)} className="h-10 w-10 grid place-items-center rounded-full bg-white/80 backdrop-blur" aria-label={t('더보기')}><MoreHorizontal size={20} /></button>} />
      <Cover emoji={a.cover.emoji} hue={a.cover.hue} url={a.cover.url} className="h-[240px]" size={96} />
      <div className="px-4 -mt-6 relative">
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-lg px-2 h-6 inline-flex items-center text-[11px] font-bold text-white" style={{ background: color }}>{CATEGORY_EMOJI[a.category]} {CATEGORY_LABELS[a.category]}</span>
            <Tag>{KIND_LABELS[a.kind]}</Tag>
            {a.official && <Tag tone="gold"><BadgeCheck size={11} /> {t('학교 공식')}</Tag>}
            <VisibilityTag value={a.visibility} className="ml-auto" />
          </div>
          <h1 className="text-[20px] font-extrabold leading-snug mt-2">{a.title}</h1>
          <p className="text-[14px] text-ink-2 leading-relaxed mt-2 whitespace-pre-wrap">{a.description}</p>
        </div>

        <button onClick={() => nav(org ? `/orgs/${org.id}` : `/users/${a.hostId}`)} className="card mt-3 p-3 w-full flex items-center gap-3 text-left press">
          {org ? <Avatar emoji={org.logo.emoji} hue={org.logo.hue} url={org.logo.url} size={44} className="!rounded-xl" /> : host && <Avatar emoji={host.avatar.emoji} hue={host.avatar.hue} url={host.avatar.url} size={44} />}
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-ink-3">{t('주최자')}</div>
            <div className="text-[14px] font-bold flex items-center gap-1 truncate">{org?.name ?? host?.nickname}{(org?.verified || (host?.affiliation.type === 'university' && host.affiliation.emailVerified)) && <BadgeCheck size={13} className="text-verify" />}</div>
            {!org && host && host.affiliation.type === 'university' && <div className="text-[12px] text-ink-3 truncate">{host.affiliation.showSchool ? host.affiliation.schoolName : ''} {host.affiliation.showDepartment ? host.affiliation.department : ''}</div>}
          </div>
        </button>

        <div className="card mt-3 divide-y divide-line">
          <Row icon={<Clock size={16} />} label={t('날짜와 시간')} value={`${formatDate(a.date)} ${formatTime(a.startTime)} – ${formatTime(a.endTime)}`} />
          {hidePlace
            ? <Row icon={<MapPin size={16} />} label={t('장소')} value={place.name} sub={t('승인 후 정확한 장소가 보여요')} />
            : <Row icon={<MapPin size={16} />} label={t('장소')} value={a.place.name} sub={a.place.address} />}
          <Row icon={<Users size={16} />} label={t('모집 인원')} value={`${approved.length}${t('명 참가 중 · 모집 ')}${a.capacity >= 999 ? t('제한 없음') : `${a.capacity}${t('명')}`}`} />
          <Row icon={<Ticket size={16} />} label={t('참가 비용')} value={formatFee(a.fee)} />
          <Row icon={<Lock size={16} />} label={t('참가 방식')} value={JOIN_POLICY_LABELS[a.joinPolicy]} />
          {a.conditions && <Row icon={<ShieldCheck size={16} />} label={t('참가 조건')} value={a.conditions} />}
        </div>

        {!hidePlace && <div className="card mt-3 overflow-hidden">
          <div className="h-[160px]">
            <MapContainer center={[a.place.lat, a.place.lng]} zoom={16} className={`h-full w-full z-0 ${TILES_ENABLED ? '' : 'no-tiles'}`} zoomControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} attributionControl={false}>
              {TILES_ENABLED ? <TileLayer url={TILE_URL} /> : <LandmarkLayer schoolId={host?.affiliation.type === 'university' ? host.affiliation.schoolId : (lang === 'en' ? 's_berkeley' : 's_yonsei')} />}
              <Marker position={[a.place.lat, a.place.lng]} icon={L.divIcon({ className: 'leaflet-div-icon', html: `<div class="au-marker" style="background:${color}"><span>${CATEGORY_EMOJI[a.category]}</span></div>`, iconSize: [36, 36], iconAnchor: [18, 34] })} />
            </MapContainer>
          </div>
          <button onClick={() => nav(`/map?focus=${a.id}`)} className="w-full h-11 text-[13px] font-semibold text-primary flex items-center justify-center gap-1"><MapPin size={14} />{t('지도에서 보기')}</button>
        </div>}

        {small && <SmallTableBlocks a={a} reasons={rec?.reasons ?? []} filled={people.length} sharedCount={sharedCount} approvedMe={approvedMe} past={past} full={full}
          mine={!!mine && !isHost} isHost={isHost} onContact={contactHost} onCancel={cancelJoin} onReport={() => setReport(true)} people={people} placeName={place.name} />}

        {!(small && !approvedMe) && <div className="card mt-3 p-4">
          <div className="flex items-center justify-between"><b className="text-[14px]">{t('현재 참가자')} {approved.length}</b>{isHost && <button onClick={() => nav(`/activities/${a.id}/manage`)} className="text-[12px] font-semibold text-primary">{t('참가자 관리')}</button>}</div>
          <div className="flex flex-wrap gap-2 mt-3">
            {host && <PersonPill id={host.id} label={t('주최')} />}
            {approved.map((p) => <PersonPill key={p.id} id={p.userId} />)}
            {approved.length === 0 && <span className="text-[12px] text-ink-3">{t('아직 참가자가 없어요. 첫 참가자가 되어보세요!')}</span>}
          </div>
        </div>}

        <div className="card mt-3 p-4">
          <b className="text-[14px]">{t('댓글 또는 질문')} {a.comments.length}</b>
          <div className="mt-3 space-y-3">
            {a.comments.map((c) => { const u = v.userById(c.authorId); return (
              <div key={c.id} className="flex gap-2.5"><Avatar emoji={u?.avatar.emoji ?? '👤'} hue={u?.avatar.hue ?? 200} url={u?.avatar.url} size={30} /><div className="flex-1"><div className="text-[12px]"><b>{u?.nickname}</b>{c.authorId === a.hostId && <Tag tone="primary" className="ml-1 h-5">{t('주최자')}</Tag>}<span className="text-ink-3 ml-1.5">{relativeTime(c.createdAt)}</span></div><p className="text-[13px] text-ink-2 mt-0.5">{c.text}</p></div></div>
            ); })}
            {a.comments.length === 0 && <p className="text-[12px] text-ink-3">{t('궁금한 점을 주최자에게 물어보세요.')}</p>}
          </div>
          <form className="flex gap-2 mt-3" onSubmit={async (e) => { e.preventDefault(); if (!text.trim()) return; await run(() => api.activities.comment(a.id, v.me.id, text.trim())); setText(''); }}>
            <Input className="h-10" placeholder={t('질문이나 댓글 남기기')} value={text} onChange={(e) => setText(e.target.value)} /><Button size="sm" className="h-10" type="submit" disabled={!text.trim()}>{t('등록')}</Button>
          </form>
        </div>
      </div>

      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-surface/95 backdrop-blur border-t border-line p-3 flex gap-2 safe-bottom z-20">
        <button onClick={() => showToast(t('링크를 복사했어요.'))} className="h-[52px] w-[52px] rounded-2xl bg-surface-2 grid place-items-center text-ink-2 press" aria-label={t('공유')}><Share2 size={20} /></button>
        {canChat ? <Button size="lg" variant="secondary" onClick={() => nav(`/chats/${room!.id}`)} icon={<MessageCircle size={18} />}>{t('그룹 채팅')}</Button> : null}
        {past && !isHost
          ? <Button size="lg" variant="outline" className="flex-1" disabled>{t('지난 모임이에요')}</Button>
          : <JoinButton activity={a} size="lg" className="flex-1" label={small && a.joinPolicy === 'approval' ? t('참여 요청') : undefined} />}
      </div>

      <BottomSheet open={menu} onClose={() => setMenu(false)} title={t('활동')}>
        <div className="space-y-1">
          {isHost && <SheetItem icon={<Pencil size={18} />} label={t('활동 수정')} onClick={() => { setMenu(false); nav(`/activities/${a.id}/edit`); }} />}
          {isHost && <SheetItem icon={<Trash2 size={18} />} label={t('활동 삭제')} danger onClick={() => { setMenu(false); setConfirmDelete(true); }} />}
          <SheetItem icon={<Share2 size={18} />} label={t('공유')} onClick={() => { setMenu(false); showToast(t('링크를 복사했어요.')); }} />
          {!isHost && <SheetItem icon={<Flag size={18} />} label={t('활동 신고')} danger onClick={() => { setMenu(false); setReport(true); }} />}
        </div>
      </BottomSheet>
      <ProposeSheet user={propose ? host ?? null : null} open={propose} onClose={() => setPropose(false)} />
      <ReportSheet open={report} onClose={() => setReport(false)} targetType="activity" targetId={a.id} />
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} title={t('활동을 삭제할까요?')} description={t('참가자와 그룹 채팅방도 함께 사라져요. 되돌릴 수 없어요.')}>
        <Button variant="outline" full onClick={() => setConfirmDelete(false)}>{t('취소')}</Button>
        <Button variant="danger" full onClick={async () => { await run(() => api.activities.remove(a.id), t('활동을 삭제했어요.')); nav('/', { replace: true }); }}>{t('삭제')}</Button>
      </Dialog>
    </div>
  );
}

function Row({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="h-8 w-8 rounded-lg bg-surface-2 text-ink-2 grid place-items-center shrink-0">{icon}</span>
      <div className="flex-1 min-w-0"><div className="text-[11px] text-ink-3">{label}</div><div className="text-[14px] font-semibold">{value}</div>{sub && <div className="text-[12px] text-ink-3">{sub}</div>}</div>
    </div>
  );
}

function PersonPill({ id, label }: { id: string; label?: string }) {
  const v = useViewer();
  const nav = useNavigate();
  const u = v.userById(id);
  if (!u) return null;
  return (
    <button onClick={() => nav(`/users/${id}`)} className="flex items-center gap-1.5 rounded-full bg-surface-2 pl-1 pr-3 h-8 text-[12px] font-semibold press">
      <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={24} />{u.nickname}{label && <span className="text-primary">{label}</span>}
    </button>
  );
}

/** .ics — 제목 · 날짜 · 시간 (장소는 승인 후에만 정확한 이름) */
function downloadIcs(a: Activity, placeName: string) {
  const d = a.date.replace(/-/g, '');
  const tm = (hhmm: string) => `${hhmm.replace(':', '').padEnd(4, '0')}00`;
  const esc = (x: string) => x.replace(/\\/g, '\\\\').replace(/[,;]/g, (m) => `\\${m}`).replace(/\n/g, '\\n');
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const body = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AroundU//Small Table//EN', 'BEGIN:VEVENT',
    `UID:${a.id}@aroundu`, `DTSTAMP:${stamp}`, `DTSTART:${d}T${tm(a.startTime)}`, `DTEND:${d}T${tm(a.endTime || a.startTime)}`,
    `SUMMARY:${esc(a.title)}`, `LOCATION:${esc(placeName)}`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([body], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = `aroundu-${a.id}.ics`;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Small Table 전용 블록 — 상태 배너 · 왜 나와 맞는지 · 참가자 미리보기 · 행동 */
function SmallTableBlocks({ a, reasons, filled, sharedCount, approvedMe, past, full, mine, isHost, onContact, onCancel, onReport, people, placeName }: {
  a: Activity; reasons: string[]; filled: number; sharedCount: number; approvedMe: boolean; past: boolean; full: boolean; mine: boolean; isHost: boolean;
  onContact: () => void; onCancel: () => void; onReport: () => void; people: { id: string; avatar: { emoji: string; hue: number; url?: string } }[]; placeName: string;
}) {
  const showToast = useAppStore((s) => s.showToast);
  const addToCalendar = () => {
    try { downloadIcs(a, placeName); showToast(t('캘린더 파일을 받았어요'), 'success'); }
    catch { showToast(t('캘린더 파일을 만들지 못했어요'), 'error'); }
  };
  return (
    <>
      {past && <div className="mt-3 rounded-2xl bg-surface-2 px-4 py-3 text-[13px] font-semibold text-ink-2 flex items-center gap-2"><XCircle size={15} />{t('지난 모임이에요')}</div>}
      {!past && full && !approvedMe && <div className="mt-3 rounded-2xl bg-gold-soft px-4 py-3 text-[13px] font-semibold flex items-center gap-2"><Users size={15} />{t('자리가 다 찼어요')}</div>}

      {reasons.length > 0 && (
        <div className="card mt-3 p-4">
          <div className="text-[14px] font-bold flex items-center gap-1.5"><Sparkles size={15} className="text-primary" />{t('왜 나와 맞는지')}</div>
          <div className="mt-2 flex flex-wrap gap-1">{reasons.map((r) => <span key={r} className="h-6 px-2 rounded-full bg-accent-soft text-primary text-[11px] font-bold inline-flex items-center">{r}</span>)}</div>
        </div>
      )}

      {!approvedMe && (
        <div className="card mt-3 p-4">
          <div className="flex items-center justify-between"><b className="text-[14px]">{t('참가자 미리보기')}</b><span className="text-[12px] font-bold text-primary">{filled}/{a.capacity}{t('명')}</span></div>
          <div className="mt-2.5 flex items-center gap-2.5">
            <div className="flex -space-x-2">{people.slice(0, 6).map((u) => <Avatar key={u.id} emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={30} className="ring-2 ring-white" />)}</div>
            {sharedCount > 0 && <span className="text-[12px] text-ink-2">{t('관심사 겹침')} {sharedCount}{t('명')}</span>}
          </div>
          <p className="mt-2 text-[11px] text-ink-3 flex items-center gap-1"><Lock size={11} />{t('승인되면 이름과 정확한 장소가 보여요')}</p>
        </div>
      )}

      {!isHost && (
        <div className="card mt-3 p-2 grid grid-cols-2 gap-1">
          {mine && !past && <SmallAction icon={<XCircle size={16} />} label={t('참가 취소')} onClick={onCancel} />}
          <SmallAction icon={<HelpCircle size={16} />} label={t('주최자에게 문의')} onClick={onContact} />
          <SmallAction icon={<CalendarPlus size={16} />} label={t('일정 추가')} onClick={addToCalendar} disabled={past} />
          <SmallAction icon={<Flag size={16} />} label={t('신고')} onClick={onReport} danger />
        </div>
      )}
    </>
  );
}

function SmallAction({ icon, label, onClick, danger, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`h-11 rounded-2xl flex items-center justify-center gap-1.5 text-[13px] font-semibold press hover:bg-surface-2 disabled:opacity-40 ${danger ? 'text-danger' : 'text-primary'}`}>
      {icon}{label}
    </button>
  );
}
