import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Lock, MessageCircle, Pencil, X } from 'lucide-react';
import { lang } from '@core/i18n';
import type { Participation, User } from '@core/types';
import { api, type Patch } from '@core/api';
import { BottomSheet } from '@/components/ui';
import { SheetItem } from '@/components/cards/PostCard';
import { BackHeader, PageTitle, SegTabs, PersonCard, Btn, InfoNote, EmptyCard, EmptyState, TextCard } from '@/components/ha';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { relativeTime } from '@core/lib/format';
import { approvedOf, hasLimit, isFull, waitlistOf } from '@core/lib/meetups';
import { personMeta } from '@/components/people/PeopleBits';

const en = lang === 'en';
type Tab = 'joined' | 'requests' | 'waitlist';

/**
 * 참가자 관리 (PDF S048) — 주최자만. Joined · Requests · Waitlist.
 * 요청은 Approve, 대기 명단은 Review(승인/거절). 승인은 정원을 넘지 못한다 (엔진도 막는다 — @core/lib/meetups).
 */
export function ManageActivityPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const parts = useAppStore((s) => s.participations);
  const rooms = useAppStore((s) => s.chatRooms);
  const [params, setParams] = useSearchParams();
  const [review, setReview] = useState<Participation | null>(null);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const a = v.visibleActivities.find((x) => x.id === id);
  if (!a || a.hostId !== v.me.id) return (
    <div className="min-h-full bg-bg"><BackHeader title={en ? 'Manage participants' : '참가자 관리'} />
      <EmptyState icon={<Lock size={30} />} title={en ? 'Only the host can manage this' : '주최자만 볼 수 있어요'} />
    </div>
  );
  const joined = approvedOf(parts, a.id);
  const requests = parts.filter((p) => p.activityId === a.id && p.status === 'pending').sort((x, y) => x.createdAt.localeCompare(y.createdAt));
  const waiting = waitlistOf(parts, a.id);
  const tab = (['requests', 'waitlist'].includes(params.get('tab') ?? '') ? params.get('tab') : requests.length && !params.get('tab') ? 'requests' : 'joined') as Tab;
  const full = isFull(a, parts);
  const room = rooms.find((r) => r.activityId === a.id);
  const act = async (key: string, fn: () => Promise<Patch>, ok: string) => { setBusy(key); try { await run(fn, ok); } catch { /* toast */ } finally { setBusy(null); } };
  const approve = (p: Participation, u?: User) => act(p.id, () => api.activities.approve(p.id), en ? `${u?.nickname ?? 'They'} joined — the group chat is open to them.` : `${u?.nickname ?? ''}님을 승인했어요.`);
  const decline = (p: Participation) => act(p.id, () => api.activities.reject(p.id), en ? 'Declined — they won’t see a reason.' : '거절했어요 — 사유는 보이지 않아요.');

  const card = (p: Participation, action: React.ReactNode) => {
    const u = v.userById(p.userId); if (!u) return null;
    return <PersonCard key={p.id} avatar={u.avatar} name={u.nickname} meta={[u.sample ? (en ? 'Sample' : '예시') : '', personMeta(u)].filter(Boolean).join(' · ')}
      bio={p.message ? `“${p.message}”` : (v.canSeeField(u, 'bio') ? u.bio : undefined)} action={action} onClick={() => nav(`/users/${u.id}`)} />;
  };
  const list = tab === 'joined' ? joined : tab === 'requests' ? requests : waiting;

  return (
    <div className="min-h-full bg-bg pb-8">
      <BackHeader title={en ? 'Manage participants' : '참가자 관리'} onMore={() => setMenu(true)} />
      <PageTitle title={en ? 'Manage participants' : '참가자 관리'} sub={`${a.title} · ${joined.length}${hasLimit(a) ? ` / ${a.capacity}` : ''} ${en ? 'joined' : '명 참가'}`} className="pb-2" />
      <SegTabs value={tab} onChange={(k) => setParams(k === 'joined' ? { tab: 'joined' } : { tab: k }, { replace: true })} className="mx-4"
        tabs={[{ key: 'joined', label: en ? 'Joined' : '참가', count: joined.length }, { key: 'requests', label: en ? 'Requests' : '요청', count: requests.length }, { key: 'waitlist', label: en ? 'Waitlist' : '대기', count: waiting.length }]} />
      <div className="px-4 pt-4 space-y-3">
        {list.map((p) => {
          const u = v.userById(p.userId);
          if (tab === 'joined') return card(p, <Btn size="sm" variant="outline" className="pointer-events-none">{en ? 'Joined' : '참가'}</Btn>);
          if (tab === 'requests') return card(p, <span className="flex items-center gap-1 shrink-0"><button aria-label={en ? `Decline ${u?.nickname ?? ''}` : '거절'} disabled={busy === p.id} onClick={() => decline(p)} className="h-9 w-9 grid place-items-center rounded-full text-ink-3 press disabled:opacity-40"><X size={18} /></button><Btn size="sm" variant="outline" loading={busy === p.id} disabled={full} onClick={() => approve(p, u)}>{en ? 'Approve' : '승인'}</Btn></span>);
          return card(p, <Btn size="sm" variant="outline" onClick={() => setReview(p)}>{en ? 'Review' : '보기'}</Btn>);
        })}
        {!list.length && <EmptyCard title={tab === 'joined' ? (en ? 'No one has joined yet' : '아직 참가한 사람이 없어요') : tab === 'requests' ? (en ? 'No requests right now' : '받은 요청이 없어요') : (en ? 'No waitlist' : '대기 명단이 없어요')}
          sub={tab === 'joined' ? (en ? 'Share the link in a group chat you’re already in.' : '이미 있는 단톡방에 링크를 올려 보세요.') : undefined}
          secondary={tab === 'joined' ? { label: en ? 'View meetup' : '모임 보기', onClick: () => nav(`/activities/${a.id}`) } : undefined} />}
        {tab === 'requests' && full && requests.length > 0 && <TextCard>{en ? 'You’re full. Raise the capacity to approve more.' : '자리가 다 찼어요. 인원을 늘리면 더 승인할 수 있어요.'}</TextCard>}
        <InfoNote className="pt-2">{en ? 'Interested does not reserve a seat. Approval cannot exceed capacity.' : '관심 표시는 자리를 잡지 않아요. 승인은 정원을 넘지 못해요.'}</InfoNote>
      </div>

      <BottomSheet open={!!review} onClose={() => setReview(null)} title={en ? 'Waitlist' : '대기 명단'}>
        {review && (() => { const u = v.userById(review.userId); return (<>
          <p className="text-[13.5px] text-ink-2">{en ? `${u?.nickname ?? 'They'} joined the waitlist ${relativeTime(review.createdAt)}.` : `${u?.nickname ?? ''}님이 ${relativeTime(review.createdAt)} 대기 명단에 올렸어요.`} {full ? (en ? 'The meetup is full — raise the capacity first.' : '자리가 다 찼어요 — 먼저 인원을 늘려 주세요.') : ''}</p>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Btn variant="outline" loading={busy === review.id} onClick={async () => { await decline(review); setReview(null); }}>{en ? 'Decline' : '거절'}</Btn>
            <Btn disabled={full} loading={busy === review.id} onClick={async () => { await approve(review, u); setReview(null); }}>{en ? 'Approve' : '승인'}</Btn>
          </div>
        </>); })()}
      </BottomSheet>
      <BottomSheet open={menu} onClose={() => setMenu(false)} title={a.title}>
        <div className="space-y-1">
          <SheetItem icon={<Pencil size={18} />} label={en ? 'Edit meetup' : '모임 수정'} onClick={() => { setMenu(false); nav(`/activities/${a.id}/edit`); }} />
          {room && <SheetItem icon={<MessageCircle size={18} />} label={en ? 'Open group chat' : '그룹 채팅'} onClick={() => { setMenu(false); nav(`/chats/${room.id}`); }} />}
        </div>
      </BottomSheet>
    </div>
  );
}
