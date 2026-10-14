import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { lang } from '@core/i18n';
import { useAppStore } from '@core/store/useAppStore';
import { DELETE_CONFIRM_WORD, deleteConfirmOk } from '@core/lib/account';
import { BottomSheet, Button, Field, Input } from '@/components/ui';

const en = lang === 'en';

const DELETED = en
  ? ['Your profile, photos, timetable, class lists and partner search', 'Friends, follows, likes and blocks', 'Your posts, comments and chat messages (1:1 chats are removed for both people)', 'Meetups, plans and rides you host — they’re cancelled and people who joined get a notice', 'Your RSVPs, saved listings, ice-breaker games and daily answers', 'Seat alerts, dining favorites and gym alerts', 'Your sign-in email, sessions and Ask Lumi history']
  : ['프로필·사진·시간표·같은 수업 정보·파트너 찾기', '친구·팔로우·관심·차단', '내 게시물·댓글·채팅 메시지 (1:1 채팅은 양쪽 모두에서 사라져요)', '내가 연 모임·약속·같이 타기 — 취소되고 참가자에게 알림이 가요', '참여 표시·저장한 공고·아이스브레이커 게임·오늘의 질문 답', '좌석 알림·학식 즐겨찾기·체육관 알림', '로그인 이메일·세션·Ask Lumi 기록'];

/** 설정 › 계정 삭제 — 무엇이 지워지는지 보여 주고, DELETE 를 입력해야 지운다. 지우면 로그아웃된다 (App Store 5.1.1(v)) */
export function DeleteAccountCard() {
  const nav = useNavigate();
  const deleteAccount = useAppStore((s) => s.deleteAccount);
  const showToast = useAppStore((s) => s.showToast);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const close = () => { if (!busy) { setOpen(false); setTyped(''); setError(''); } };
  const submit = async () => {
    setBusy(true); setError('');
    try {
      await deleteAccount(typed);
      setOpen(false);
      nav('/welcome', { replace: true });
      showToast(en ? 'Your account and data were deleted.' : '계정과 데이터를 삭제했어요.', 'success');
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };

  return (
    <div className="card">
      <button onClick={() => setOpen(true)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left press">
        <Trash2 size={18} className="text-danger" />
        <span className="flex-1"><span className="block text-[14px] font-semibold text-danger">{en ? 'Delete account' : '계정 삭제'}</span><span className="block text-[12px] text-ink-3">{en ? 'Permanently delete your account and data' : '계정과 데이터를 영구히 삭제해요'}</span></span>
      </button>
      <BottomSheet open={open} onClose={close} title={en ? 'Delete your account?' : '계정을 삭제할까요?'}>
        <div className="space-y-3">
          <p className="text-[13px] text-ink-2">{en ? 'This permanently deletes your Lumi account. It can’t be undone, and you’ll be signed out. What’s deleted:' : 'Lumi 계정이 영구히 삭제돼요. 되돌릴 수 없고, 바로 로그아웃돼요. 삭제되는 것:'}</p>
          <ul className="list-disc pl-5 space-y-1 text-[12.5px] text-ink-2">{DELETED.map((x) => <li key={x}>{x}</li>)}</ul>
          <p className="text-[12px] text-ink-3">{en ? 'Reports you filed stay for safety review, with your name removed.' : '내가 한 신고는 안전 검토를 위해 이름을 지운 채로 남아요.'}</p>
          <Field label={en ? `Type ${DELETE_CONFIRM_WORD} to confirm` : `확인하려면 ${DELETE_CONFIRM_WORD} 를 입력하세요`}>
            <Input autoCapitalize="characters" autoComplete="off" autoCorrect="off" spellCheck={false} placeholder={DELETE_CONFIRM_WORD} value={typed} onChange={(e) => setTyped(e.target.value)} />
          </Field>
          {error && <p className="text-[12px] text-danger" role="alert">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" full disabled={busy} onClick={close}>{en ? 'Cancel' : '취소'}</Button>
            <Button variant="danger" full loading={busy} disabled={!deleteConfirmOk(typed)} onClick={submit}>{en ? 'Delete forever' : '영구 삭제'}</Button>
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
