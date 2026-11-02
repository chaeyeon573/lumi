import { useState } from 'react';
import { t, lang } from '@core/i18n';
import { useNavigate } from 'react-router-dom';
import { Check, Clock, Settings2 } from 'lucide-react';
import type { Activity } from '@core/types';
import { Button, BottomSheet, Textarea } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';

/** 참가 신청 버튼 — 참가 방식(바로/승인/초대)에 따라 상태가 달라진다 */
export function JoinButton({ activity: a, className, size = 'md', label }: { activity: Activity; className?: string; size?: 'sm' | 'md' | 'lg'; /** 바로 참가/참가 신청 대신 쓸 라벨 (예: 같이 가기) */ label?: string }) {
  const v = useViewer();
  const nav = useNavigate();
  const run = useAppStore((s) => s.run);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const mine = v.myParticipation(a.id);
  const count = v.approvedCount(a.id);
  const full = count >= a.capacity;
  const isHost = a.hostId === v.me.id;
  const invited = (a.invitedIds ?? []).includes(v.me.id);

  const submit = async (message?: string) => {
    setBusy(true);
    try {
      await run(() => api.activities.join(a.id, v.me.id, message), a.joinPolicy === 'open' ? t('참가했어요! 그룹 채팅방이 열렸어요.') : t('참가 신청을 보냈어요. 승인되면 알려드릴게요.'));
      setOpen(false); setMsg('');
    } catch { /* toast shown */ } finally { setBusy(false); }
  };
  const cancel = async () => {
    setBusy(true);
    try { await run(() => api.activities.cancel(a.id, v.me.id), t('참가를 취소했어요.')); } catch { /* */ } finally { setBusy(false); }
  };

  if (isHost) return <Button size={size} variant="secondary" className={className} icon={<Settings2 size={16} />} onClick={() => nav(`/activities/${a.id}/manage`)}>{t('참가자 관리')}</Button>;
  if (mine?.status === 'approved') return (
    <>
      <Button size={size} className={className} icon={<Check size={16} />} onClick={() => setOpen(true)}>{lang === 'en' ? 'You’re going!' : '참석해요!'}</Button>
      <BottomSheet open={open} onClose={() => setOpen(false)} title={lang === 'en' ? 'Can’t make it?' : '못 가게 됐나요?'}>
        <p className="text-[13px] text-ink-2">{lang === 'en' ? 'Leaving frees your spot and removes you from the group chat.' : '자리를 비우고 그룹 채팅에서 나가요.'}</p>
        <Button full size="lg" variant="outline" className="mt-4" loading={busy} onClick={async () => { await cancel(); setOpen(false); }}>{lang === 'en' ? 'Leave this meetup' : '참석 취소'}</Button>
      </BottomSheet>
    </>
  );
  if (mine?.status === 'pending') return <Button size={size} variant="outline" className={className} icon={<Clock size={16} />} onClick={cancel} loading={busy}>{t('승인 대기 중')}</Button>;
  if (a.joinPolicy === 'invite' && !invited) return <Button size={size} variant="outline" className={className} disabled>{t('초대받은 사람만')}</Button>;
  if (full) return <Button size={size} variant="outline" className={className} disabled>{t('마감')}</Button>;
  if (a.joinPolicy === 'approval') {
    return (
      <>
        <Button size={size} className={className} onClick={() => setOpen(true)}>{label ?? t('참가 신청')}</Button>
        <BottomSheet open={open} onClose={() => setOpen(false)} title={t('참가 신청')}>
          <p className="text-[13px] text-ink-2">{t('주최자가 승인하면 참가가 확정되고 그룹 채팅방에 입장할 수 있어요.')}</p>
          {a.conditions && <div className="mt-3 rounded-xl bg-gold-soft text-[13px] px-3 py-2"><b>{t('참가 조건')}</b> · {a.conditions}</div>}
          <Textarea className="mt-3" placeholder={t('주최자에게 남길 메시지 (선택)')} value={msg} onChange={(e) => setMsg(e.target.value)} />
          <Button full size="lg" className="mt-4" loading={busy} onClick={() => submit(msg || undefined)}>{t('신청 보내기')}</Button>
        </BottomSheet>
      </>
    );
  }
  return <Button size={size} className={className} onClick={() => submit()} loading={busy}>{label ?? t('바로 참가')}</Button>;
}
