import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { t, lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { legalUrl } from '@core/lib/legal';
import { BottomSheet, Button, Input } from '@/components/ui';

/** 데모 계정 — 실제 서버에서도 지울 수 없다 */
const DEMO_ID = 'u_me';

/**
 * 계정 삭제 확인 (App Store 5.1.1(v)) — 무엇이 지워지는지 · 되돌릴 수 없음 · "삭제" 입력 후 빨간 버튼.
 * 성공하면 로그아웃 → 시작 화면.
 */
export function DeleteAccountSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate();
  const me = useAppStore((s) => s.currentUserId);
  const logout = useAppStore((s) => s.logout);
  const showToast = useAppStore((s) => s.showToast);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setTyped(''); setBusy(false); } }, [open]);
  if (!me) return null;
  const demo = me === DEMO_ID;
  const word = t('삭제');
  const ok = typed.trim().toLowerCase() === word.toLowerCase();

  const submit = async () => {
    if (!ok || busy) return;
    setBusy(true);
    try {
      // 패치를 스토어에 반영하지 않는다 — 곧바로 로그아웃하면서 스토어를 비우고, 익명화된 "나"로 화면을 다시 그리면 설정 화면이 깨진다
      await api.users.deleteAccount(me);
    } catch (e) {
      showToast((e as Error).message || t('계정을 삭제하지 못했어요. 잠시 후 다시 시도해주세요.'), 'error');
      setBusy(false);
      return;
    }
    await logout();
    nav('/welcome', { replace: true });
    showToast(t('계정을 삭제했어요. 그동안 함께해줘서 고마워요.'), 'success');
  };

  return (
    <BottomSheet open={open} onClose={() => !busy && onClose()} title={t('계정 삭제')}>
      {demo ? (
        <div className="space-y-4">
          <p className="text-[14px] text-ink-2 leading-relaxed">{t('지금은 데모 계정으로 둘러보는 중이라 삭제할 수 없어요. 직접 가입한 계정은 여기서 바로 삭제할 수 있어요.')}</p>
          <Button full size="lg" variant="outline" onClick={onClose}>{t('닫기')}</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-[14px] font-semibold text-ink">{t('삭제하면 아래 정보가 모두 지워져요')}</p>
            <ul className="mt-2 space-y-1 text-[13px] text-ink-2 list-disc pl-5">
              <li>{t('프로필 · 사진 · 질문 답변')}</li>
              <li>{t('내가 쓴 글 · 댓글 · 만든 모임')}</li>
              <li>{t('연결 · 팔로우')}</li>
              <li>{t('로그인 이메일')}</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-surface-2 px-3.5 py-3 text-[12px] text-ink-2 leading-relaxed space-y-1">
            <p>{t('이미 주고받은 메시지는 상대방 대화방에 "탈퇴한 사용자"로 남을 수 있어요.')}</p>
            <p className="font-semibold text-danger">{t('삭제한 계정은 되돌릴 수 없어요.')}</p>
          </div>
          <div>
            <label htmlFor="delete-confirm" className="block text-[13px] font-semibold text-ink-2 mb-1.5">
              {lang === 'en' ? `Type "${word}" to confirm` : `확인을 위해 "${word}"를 입력해주세요`}
            </label>
            <Input id="delete-confirm" autoComplete="off" placeholder={word} value={typed} onChange={(e) => setTyped(e.target.value)} disabled={busy} />
          </div>
          <Button full size="lg" variant="danger" className="bg-danger text-white" disabled={!ok} loading={busy} onClick={submit}>{t('계정 영구 삭제')}</Button>
          <p className="text-center text-[11px] text-ink-3">
            <a href={legalUrl('delete-account')} target="_blank" rel="noreferrer" className="underline underline-offset-2">{t('계정 삭제 안내')}</a>
          </p>
        </div>
      )}
    </BottomSheet>
  );
}
