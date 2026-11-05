import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Download, Flag, MessageCircle, ShieldCheck, Trash2, UserX } from 'lucide-react';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { BottomSheet } from '@/components/ui';
import { RowCard, cardCls } from '@/components/ha';
import { DeleteAccountSheet } from '@/components/settings/DeleteAccountCard';
import { isNativeShell, shareOrCopy } from '@/lib/native';
import { cn } from '@core/lib/cn';
import { SubScreen, en, useSaveSelf } from '@/pages/profile/shared';

type Policy = 'connected' | 'friends_only' | 'none';
export const POLICY_LABEL: Record<Policy, string> = {
  connected: en ? 'Friends and approved connections' : '친구와 연결된 사람',
  friends_only: en ? 'Friends only' : '친구만',
  none: en ? 'No one' : '받지 않음',
};

/** 내 데이터를 파일로 — 웹은 .json 내려받기, iPhone 앱은 공유 시트(파일에 저장·메일) */
async function downloadMyData(showToast: (t: string, tone?: 'info' | 'success' | 'error') => void) {
  const data = await api.auth.exportData();
  const json = JSON.stringify(data, null, 2);
  const name = `lumi-data-${data.exportedAt.slice(0, 10)}.json`;
  if (isNativeShell()) { await shareOrCopy({ title: name, text: json }); return; }
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  showToast(en ? 'Your data was downloaded' : '내 데이터를 내려받았어요', 'success');
}

/**
 * Privacy & safety (PDF S086): Blocked accounts · Report a concern · Messaging permissions · Account security ·
 * Download your data (서버 POST /api/auth/export-data — 내 기록만) · Delete account (DELETE 입력, App Store 5.1.1(v)).
 */
export function SafetySettingsPage() {
  const nav = useNavigate();
  const showToast = useAppStore((s) => s.showToast);
  const { me, save } = useSaveSelf();
  const [sheet, setSheet] = useState<'messages' | 'delete' | null>(null);
  const [exporting, setExporting] = useState(false);
  const policy = me.settings.messagePolicy;
  const exportData = async () => {
    if (exporting) return;
    setExporting(true);
    try { await downloadMyData(showToast); } catch (e) { showToast((e as Error).message, 'error'); } finally { setExporting(false); }
  };
  return (
    <SubScreen title={en ? 'Privacy & safety' : '개인정보와 안전'}>
      <div className="space-y-3">
        <RowCard tone="ice" icon={<UserX size={21} />} title={en ? 'Blocked accounts' : '차단한 계정'} sub={en ? 'Manage who can reach you' : '나에게 닿을 수 없는 사람'} onClick={() => nav('/settings/blocked')} />
        <RowCard tone="rose" icon={<Flag size={21} />} title={en ? 'Report a concern' : '신고하기'} sub={en ? 'Get help with a person, post or meetup' : '사람·글·모임 문제 알리기'} onClick={() => nav('/settings/reports')} />
        <RowCard tone="lav" icon={<MessageCircle size={21} />} title={en ? 'Messaging permissions' : '메시지 받기'} sub={POLICY_LABEL[policy]} onClick={() => setSheet('messages')} />
        <RowCard tone="mint" icon={<ShieldCheck size={21} />} title={en ? 'Account security' : '계정 보안'} sub={en ? 'Your sign-in and verification' : '로그인과 인증'} onClick={() => nav('/settings/security')} />
        <RowCard tone="ice" icon={<Download size={21} />} title={en ? 'Download your data' : '내 데이터 받기'} sub={exporting ? (en ? 'Preparing your file…' : '파일을 만드는 중…') : (en ? 'Your information, in your hands' : '내 정보를 파일로')} onClick={exportData} />
        <RowCard tone="rose" icon={<Trash2 size={21} />} title={en ? 'Delete account' : '계정 삭제'} sub={en ? 'Review before continuing' : '무엇이 지워지는지 먼저 봐요'} onClick={() => setSheet('delete')} />
      </div>
      <BottomSheet open={sheet === 'messages'} onClose={() => setSheet(null)} title={en ? 'Who can message you' : '메시지를 보낼 수 있는 사람'}>
        <p className="text-[13px] text-ink-3 mb-3">{en ? 'People you aren’t connected to can never message you.' : '연결되지 않은 사람은 어떤 설정에서도 메시지를 보낼 수 없어요.'}</p>
        <div className="space-y-2 pb-2">
          {(Object.keys(POLICY_LABEL) as Policy[]).map((p) => (
            <button key={p} onClick={() => { setSheet(null); if (p !== policy) void save({ settings: { ...me.settings, messagePolicy: p } }, en ? 'Saved' : '저장했어요', false); }}
              className={cn(cardCls, 'w-full h-12 px-4 flex items-center justify-between text-left text-[15px] press', policy === p && 'border-sel-line text-sel-fg')}>
              {POLICY_LABEL[p]}{policy === p && <Check size={18} />}
            </button>
          ))}
        </div>
      </BottomSheet>
      <DeleteAccountSheet open={sheet === 'delete'} onClose={() => setSheet(null)} />
    </SubScreen>
  );
}
