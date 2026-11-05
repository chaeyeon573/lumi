import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import type { ReportTargetType } from '@core/types';
import { Btn, TextCard } from '@/components/ha';
import { useReportForm } from '@/components/cards/ReportSheet';
import { useViewer } from '@/hooks/useViewer';
import { SubScreen, en } from '@/pages/profile/shared';

const TYPES: ReportTargetType[] = ['user', 'activity', 'post', 'comment', 'message', 'ride'];

/** Report a concern (PDF S092) — 화면으로: /report/:type/:id (채팅 ··· 등). 보내면 뒤로 */
export function ReportPage() {
  const { type = '', id = '' } = useParams();
  const nav = useNavigate();
  const targetType = (TYPES.includes(type as ReportTargetType) ? type : 'user') as ReportTargetType;
  const form = useReportForm({ targetType, targetId: id, onDone: () => nav(-1) });
  return <SubScreen title={en ? 'Report a concern' : '신고하기'} cta={form.button}>{form.body}</SubScreen>;
}

/**
 * Block account (PDF S093) — /users/:id/block. "Block this account?" 카드, outline Keep Account Unblocked, Block Account.
 * 차단하면 서로 메시지를 못 보내고 그 사람에게 내 프로필이 안 간다 (server/view.ts — 상대는 차단된 걸 모른다).
 * 이미 차단했으면 같은 자리에서 차단 해제.
 */
export function BlockPage() {
  const { id = '' } = useParams();
  const nav = useNavigate();
  const v = useViewer();
  const run = useAppStore((s) => s.run);
  const [busy, setBusy] = useState(false);
  const user = v.userById(id);
  const blocked = v.hasBlocked(id);
  const name = user?.nickname ?? (en ? 'this person' : '이 사람');
  const act = async () => {
    setBusy(true);
    try {
      if (blocked) { await run(() => api.relationships.unblock(v.me.id, id), en ? `Unblocked ${name}` : `${name}님 차단을 풀었어요`); nav(-1); }
      else { await run(() => api.relationships.block(v.me.id, id), en ? `Blocked ${name}` : `${name}님을 차단했어요`); nav('/chats', { replace: true }); }
    } catch { setBusy(false); }
  };
  return (
    <SubScreen title={en ? 'Block account' : '계정 차단'}
      cta={<Btn full size="lg" variant={blocked ? 'outline' : 'primary'} loading={busy} disabled={!id || id === v.me.id} onClick={act}>{blocked ? (en ? 'Unblock Account' : '차단 해제') : (en ? 'Block Account' : '차단하기')}</Btn>}>
      <TextCard title={blocked ? (en ? `${name} is blocked` : `${name}님을 차단했어요`) : (en ? `Block ${name}?` : `${name}님을 차단할까요?`)}>
        {blocked ? (en ? 'Unblocking lets them find your profile and message you again if you’re connected.' : '차단을 풀면 다시 프로필을 보고, 연결돼 있으면 메시지를 보낼 수 있어요.')
          : (en ? 'This person will no longer be able to contact you through Lumi. They aren’t told. You can manage blocked accounts in settings.' : '이 사람은 더 이상 Lumi 에서 연락할 수 없어요. 상대에게 알리지 않아요. 차단 목록은 설정에서 관리해요.')}
      </TextCard>
      {!blocked && <Btn variant="outline" className="mt-4" onClick={() => nav(-1)}>{en ? 'Keep Account Unblocked' : '차단하지 않기'}</Btn>}
    </SubScreen>
  );
}
