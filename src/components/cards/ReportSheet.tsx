import { useState } from 'react';
import { t } from '@core/i18n';
import type { ReportTargetType } from '@core/types';
import { BottomSheet, Button, Textarea } from '@/components/ui';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';
import { cn } from '@core/lib/cn';

const REASONS: Record<ReportTargetType, string[]> = {
  user: [t('사칭 또는 허위 프로필'), t('괴롭힘·혐오 발언'), t('성적으로 부적절한 행동'), t('스팸·광고'), t('기타')],
  activity: [t('허위·사기성 활동'), t('부적절한 내용'), t('유료 광고·영업'), t('안전이 우려되는 활동'), t('기타')],
  post: [t('부적절한 콘텐츠'), t('혐오·차별 표현'), t('스팸·광고'), t('개인정보 노출'), t('기타')],
  message: [t('괴롭힘·위협'), t('성적 메시지'), t('스팸·사기'), t('기타')],
  ride: ['Unsafe driving or behavior', 'Asked for money up front or scam', 'Not a student / fake post', 'Harassment', 'Other'],
};

export function ReportSheet({ open, onClose, targetType, targetId }: { open: boolean; onClose: () => void; targetType: ReportTargetType; targetId: string }) {
  const me = useAppStore((s) => s.currentUserId)!;
  const run = useAppStore((s) => s.run);
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!reason) return;
    setBusy(true);
    try {
      await run(() => api.reports.create(me, targetType, targetId, detail ? `${reason} — ${detail}` : reason), t('신고가 접수되었어요. 검토 후 조치할게요.'));
      onClose(); setReason(null); setDetail('');
    } catch { /* */ } finally { setBusy(false); }
  };
  return (
    <BottomSheet open={open} onClose={onClose} title={t('신고하기')}>
      <p className="text-[13px] text-ink-3">{t('신고 내용은 상대에게 공개되지 않아요.')}</p>
      <div className="mt-3 space-y-1.5">
        {REASONS[targetType].map((r) => (
          <button key={r} onClick={() => setReason(r)} className={cn('w-full text-left rounded-xl px-3.5 h-11 text-[14px] font-medium border', reason === r ? 'border-primary bg-primary-soft' : 'border-line')}>{r}</button>
        ))}
      </div>
      <Textarea className="mt-3" placeholder={t('추가 설명 (선택)')} value={detail} onChange={(e) => setDetail(e.target.value)} />
      <Button full size="lg" variant="danger" className="mt-4" disabled={!reason} loading={busy} onClick={submit}>{t('신고 제출')}</Button>
    </BottomSheet>
  );
}
