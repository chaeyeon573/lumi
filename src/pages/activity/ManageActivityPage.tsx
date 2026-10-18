import { useNavigate, useParams } from 'react-router-dom';
import { t } from '@core/i18n';
import { Check, X, MessageCircle, Pencil } from 'lucide-react';
import { TopBar } from '@/components/layout/TopBar';
import { Avatar, Button, EmptyState, SampleTag, Tag } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { relativeTime } from '@core/lib/format';
import { affiliationText } from '@/components/cards/PersonCard';

/** 주최자용 참가 승인·거절 화면 */
export function ManageActivityPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const participations = useAppStore((s) => s.participations);
  const rooms = useAppStore((s) => s.chatRooms);
  const a = v.visibleActivities.find((x) => x.id === id);
  if (!a || a.hostId !== v.me.id) return <div className="min-h-full"><TopBar back title={t('참가자 관리')} /><EmptyState emoji="🔒" title={t('주최자만 볼 수 있어요')} /></div>;
  const pending = participations.filter((p) => p.activityId === a.id && p.status === 'pending');
  const approved = participations.filter((p) => p.activityId === a.id && p.status === 'approved');
  const rejected = participations.filter((p) => p.activityId === a.id && p.status === 'rejected');
  const room = rooms.find((r) => r.activityId === a.id);

  return (
    <div className="min-h-full pb-8">
      <TopBar back title={t('참가자 관리')} right={<Button size="sm" variant="ghost" icon={<Pencil size={14} />} onClick={() => nav(`/activities/${a.id}/edit`)}>{t('수정')}</Button>} />
      <div className="px-4 pt-2">
        <div className="card p-4"><b className="text-[15px]">{a.title}</b><div className="text-[12px] text-ink-3 mt-1">{t('승인됨')} {approved.length} {t('/ 모집')} {a.capacity >= 999 ? t('제한 없음') : a.capacity} {t('· 대기')} {pending.length}</div>
          {room && <Button size="sm" variant="secondary" className="mt-3" icon={<MessageCircle size={14} />} onClick={() => nav(`/chats/${room.id}`)}>{t('그룹 채팅 열기')}</Button>}</div>

        <h2 className="text-[15px] font-bold mt-5 mb-2">{t('참가 요청')} {pending.length}</h2>
        {pending.length === 0 && <div className="card p-4 text-[13px] text-ink-3">{t('대기 중인 요청이 없어요.')}</div>}
        <div className="space-y-2">
          {pending.map((p) => { const u = v.userById(p.userId); if (!u) return null; return (
            <div key={p.id} className="card p-3.5">
              <button onClick={() => nav(`/users/${u.id}`)} className="flex items-center gap-3 text-left w-full">
                <Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={44} />
                <div className="flex-1 min-w-0"><b className="text-[14px]">{u.sample && <SampleTag />}{u.nickname}</b><div className="text-[12px] text-ink-3 truncate">{affiliationText(u)}</div></div>
                <span className="text-[11px] text-ink-3">{relativeTime(p.createdAt)}</span>
              </button>
              {p.message && <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-[13px]">“{p.message}”</p>}
              <div className="flex gap-2 mt-3">
                <Button full variant="outline" icon={<X size={16} />} onClick={() => run(() => api.activities.reject(p.id), t('요청을 거절했어요.'))}>{t('거절')}</Button>
                <Button full icon={<Check size={16} />} disabled={approved.length >= a.capacity} onClick={() => run(() => api.activities.approve(p.id), `${u.nickname}${t('님을 승인했어요. 그룹 채팅방에 입장해요.')}`)}>{t('승인')}</Button>
              </div>
            </div>
          ); })}
        </div>

        <h2 className="text-[15px] font-bold mt-5 mb-2">{t('참가자')} {approved.length}</h2>
        <div className="card divide-y divide-line">
          {approved.length === 0 && <div className="p-4 text-[13px] text-ink-3">{t('아직 승인된 참가자가 없어요.')}</div>}
          {approved.map((p) => { const u = v.userById(p.userId); if (!u) return null; return (
            <div key={p.id} className="flex items-center gap-3 px-3.5 py-3"><Avatar emoji={u.avatar.emoji} hue={u.avatar.hue} url={u.avatar.url} size={36} /><div className="flex-1 min-w-0"><b className="text-[14px]">{u.sample && <SampleTag />}{u.nickname}</b><div className="text-[12px] text-ink-3 truncate">{affiliationText(u)}</div></div><Tag tone="mint">{t('참가 확정')}</Tag></div>
          ); })}
        </div>
        {rejected.length > 0 && <p className="text-[12px] text-ink-3 mt-3">{t('거절')} {rejected.length}{t('건 — 거절 사유는 요청자에게 표시되지 않아요.')}</p>}
      </div>
    </div>
  );
}
