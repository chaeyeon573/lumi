import { useState } from 'react';
import { Text, View } from 'react-native';
import { Check, Clock, Settings2, Plus } from 'lucide-react-native';
import { t } from '@core/i18n';
import type { Activity } from '@core/types';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { tw } from '@/tw';
import { useViewer } from '@/viewer';
import { nav } from '@/nav';
import { Button, BottomSheet, Textarea, C } from '@/ui';

/** 참가 신청 버튼 — 참가 방식(바로/승인/초대)에 따라 상태가 달라진다 (웹 JoinButton 과 동일) */
export function JoinButton({ activity: a, size = 'sm', label }: { activity: Activity; size?: 'sm' | 'md' | 'lg'; label?: string }) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const mine = v.myParticipation(a.id);
  const full = v.approvedCount(a.id) >= a.capacity;
  const isHost = a.hostId === v.me.id;
  const invited = (a.invitedIds ?? []).includes(v.me.id);

  const submit = async (message?: string) => {
    setBusy(true);
    try { await run(() => api.activities.join(a.id, v.me.id, message), full ? 'Added to the waitlist. No seat reserved yet.' : a.joinPolicy === 'open' ? t('참가했어요! 그룹 채팅방이 열렸어요.') : t('참가 신청을 보냈어요. 승인되면 알려드릴게요.')); setOpen(false); setMsg(''); } catch { /* */ } finally { setBusy(false); }
  };
  const cancel = async () => { setBusy(true); try { await run(() => api.activities.cancel(a.id, v.me.id), t('참가를 취소했어요.')); } catch { /* */ } finally { setBusy(false); } };

  if (isHost) return <Button size={size} variant="secondary" icon={<Settings2 size={15} color={C.primary} />} onPress={() => nav(`/activities/${a.id}/manage`)}>{t('참가자 관리')}</Button>;
  if (mine?.status === 'approved') return <Button size={size} variant="secondary" icon={<Check size={15} color={C.primary} />} onPress={cancel} loading={busy}>{t('참가 중 · 취소')}</Button>;
  if (mine?.status === 'waitlisted') return <Button size={size} variant="outline" onPress={cancel} loading={busy}>Waitlisted · Cancel</Button>;
  if (mine?.status === 'pending') return <Button size={size} variant="outline" icon={<Clock size={15} color={C.ink2} />} onPress={cancel} loading={busy}>{t('승인 대기 중')}</Button>;
  if (a.joinPolicy === 'invite' && !invited) return <Button size={size} variant="outline" disabled>{t('초대받은 사람만')}</Button>;
  if (full) return <Button size={size} variant="outline" onPress={() => submit()} loading={busy}>Join Waitlist</Button>;
  if (a.joinPolicy === 'approval') {
    return (
      <>
        <Button size={size} variant="accent" icon={<Plus size={15} color={C.primary} />} onPress={() => setOpen(true)}>{label ?? 'Request to Join'}</Button>
        <BottomSheet open={open} onClose={() => setOpen(false)} title={t('참가 신청')}>
          <Text style={tw`text-[13px] text-ink-2`}>{t('주최자가 승인하면 참가가 확정되고 그룹 채팅방에 입장할 수 있어요.')}</Text>
          {a.conditions ? <View style={tw`mt-3 rounded-xl bg-gold-soft px-3 py-2`}><Text style={tw`text-[13px]`}><Text style={tw`font-bold`}>{t('참가 조건')}</Text> · {a.conditions}</Text></View> : null}
          <Textarea style={tw`mt-3`} placeholder={t('주최자에게 남길 메시지 (선택)')} value={msg} onChangeText={setMsg} />
          <Button size="lg" style={tw`mt-4`} loading={busy} onPress={() => submit(msg || undefined)}>{t('신청 보내기')}</Button>
        </BottomSheet>
      </>
    );
  }
  return <Button size={size} variant="accent" icon={<Plus size={15} color={C.primary} />} onPress={() => submit()} loading={busy}>{label ?? 'Join Meetup'}</Button>;
}
