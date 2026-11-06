import { useState } from 'react';
import { lang } from '@core/i18n';
import type { ReportTargetType } from '@core/types';
import { BottomSheet } from '@/components/ui';
import { Btn, ChipRow, Chip, FormField, InfoNote, TextArea } from '@/components/ha';
import { useAppStore } from '@core/store/useAppStore';
import { api } from '@core/api';

const en = lang === 'en';

/** PDF S092 의 네 가지 + 대상마다 꼭 필요한 하나 (사칭·안전·성적 메시지·부적절한 내용) */
const BASE = en ? ['Spam', 'Harassment', 'False information'] : ['스팸', '괴롭힘', '거짓 정보'];
const EXTRA: Partial<Record<ReportTargetType, string>> = en
  ? { user: 'Impersonation', activity: 'Safety concern', message: 'Sexual content', post: 'Inappropriate content', comment: 'Inappropriate content', ride: 'Safety concern', review: 'Names a student', exam: 'Real exam questions' }
  : { user: '사칭', activity: '안전 우려', message: '성적인 메시지', post: '부적절한 내용', comment: '부적절한 내용', ride: '안전 우려', review: '학생 이름이 있어요', exam: '실제 시험 문제' };
export const reportReasons = (type: ReportTargetType) => [...BASE, ...(EXTRA[type] ? [EXTRA[type]!] : []), en ? 'Other' : '기타'];

/**
 * Report a concern (PDF S092) 본문 (훅) — 칩 하나 + What happened? + "Reports are not shared with the person you report." + Submit Report.
 * 시트(ReportSheet)와 화면(/report/:type/:id) 이 같이 쓴다. 저장은 server/moderation.ts (같은 사람·같은 대상은 한 번만).
 */
export function useReportForm({ targetType, targetId, onDone }: { targetType: ReportTargetType; targetId: string; onDone: () => void }) {
  const me = useAppStore((s) => s.currentUserId)!;
  const run = useAppStore((s) => s.run);
  const [reason, setReason] = useState<string | null>(null);
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (!reason) return;
    setBusy(true);
    try {
      await run(() => api.reports.create(me, targetType, targetId, detail.trim() ? `${reason} — ${detail.trim()}` : reason), en ? 'Report sent. We’ll review it.' : '신고가 접수되었어요. 검토 후 조치할게요.');
      setReason(null); setDetail(''); onDone();
    } catch { /* toast */ } finally { setBusy(false); }
  };
  return {
    body: (
      <>
        <ChipRow wrap>{reportReasons(targetType).map((r) => <Chip key={r} active={reason === r} onClick={() => setReason(r)}>{r}</Chip>)}</ChipRow>
        <FormField className="mt-5" label={en ? 'What happened?' : '무슨 일이 있었나요?'}>
          <TextArea value={detail} maxLength={500} onChange={(e) => setDetail(e.target.value)} placeholder={en ? 'Share details that help us review this report.' : '검토에 도움이 되는 내용을 적어 주세요.'} />
        </FormField>
        <InfoNote className="mt-3">{targetType === 'message' ? (en ? 'People in the chat aren’t told you reported it.' : '채팅방 사람들은 신고한 걸 알 수 없어요.') : (en ? 'Reports are not shared with the person you report.' : '신고한 사실은 상대에게 알리지 않아요.')}</InfoNote>
      </>
    ),
    button: <Btn full size="lg" disabled={!reason} loading={busy} onClick={submit}>{en ? 'Submit Report' : '신고 제출'}</Btn>,
  };
}

/** 시트로 여는 신고 (글·모임·사람 화면의 ··· 메뉴에서) */
export function ReportSheet({ open, onClose, targetType, targetId }: { open: boolean; onClose: () => void; targetType: ReportTargetType; targetId: string }) {
  const form = useReportForm({ targetType, targetId, onDone: onClose });
  return (
    <BottomSheet open={open} onClose={onClose} title={en ? 'Report a concern' : '신고하기'}>
      {form.body}
      <div className="mt-5 pb-2">{form.button}</div>
    </BottomSheet>
  );
}
