import { useState } from 'react';
import { t } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { BottomSheet, Button, Chip, Input, Textarea } from '@/components/ui';
import { useViewer } from '@/hooks/useViewer';
import { ALL_CATEGORIES, CATEGORY_COLORS, CATEGORY_EMOJI, CATEGORY_LABELS } from '@core/lib/labels';
import { todayISO } from '@core/lib/format';
import type { ActivityCategory, User } from '@core/types';

/** Invite to Meet — 활동 제안 시트 (PersonPage 의 제안 흐름과 동일) */
export function ProposeSheet({ user, open, onClose }: { user: User | null; open: boolean; onClose: () => void }) {
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [cat, setCat] = useState<ActivityCategory>('coffee');
  const [msg, setMsg] = useState('');
  const [when, setWhen] = useState(`${todayISO()} 18:00`);
  const [busy, setBusy] = useState(false);
  const send = async () => {
    if (!user) return;
    setBusy(true);
    try {
      await run(() => api.proposals.create(v.me.id, user.id, { category: cat, message: msg, when }), t('활동을 제안했어요. 수락되면 알려드릴게요.'));
      setMsg(''); onClose();
    } catch { /* toast */ } finally { setBusy(false); }
  };
  return (
    <BottomSheet open={open && !!user} onClose={onClose} title={user ? `${user.nickname}${t('님에게 활동 제안')}` : ''}>
      <p className="text-[12px] text-ink-3">{t('읽음 여부는 표시되지 않고, 48시간이 지나면 자동으로 만료돼요.')}</p>
      <div className="flex flex-wrap gap-1.5 mt-3">{ALL_CATEGORIES.filter((c) => !['school_event', 'store_deal'].includes(c)).map((c) => <Chip key={c} size="sm" color={CATEGORY_COLORS[c]} active={cat === c} onClick={() => setCat(c)}>{CATEGORY_EMOJI[c]} {CATEGORY_LABELS[c]}</Chip>)}</div>
      <Input className="mt-3" placeholder={t('언제? 예: 오늘 18:00')} value={when} onChange={(e) => setWhen(e.target.value)} />
      <Textarea className="mt-2" placeholder={t('예: 신촌에서 커피 한 잔 어때요?')} value={msg} onChange={(e) => setMsg(e.target.value)} />
      <Button full size="lg" className="mt-4" loading={busy} disabled={!msg.trim()} onClick={send}>{t('제안 보내기')}</Button>
    </BottomSheet>
  );
}
