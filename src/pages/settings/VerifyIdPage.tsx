import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BadgeCheck, Hourglass } from 'lucide-react';
import { api } from '@core/api';
import { lang } from '@core/i18n';
import { verificationStep } from '@core/lib/verification';
import { useAppStore, useCurrentUser } from '@core/store/useAppStore';
import { BackHeader, BottomCTA, Btn, EmptyState, InfoNote, PageTitle } from '@/components/ha';
import { ID_PRIVACY_LINE, IdPhotoPicker } from '@/components/verify/StudentId';
import { SignInEmailCard } from '@/components/settings/SignInEmailCard';

const en = lang === 'en';

/**
 * /verify-id — send (or re-send) the student ID photo after sign-up: when the first upload didn't make it, or the
 * Lumi team couldn't verify it (the reason is shown). Reached from the banner (VerificationBanner) and the
 * "We couldn't verify" notification. The server decides everything (server/idverify.ts).
 */
export function VerifyIdPage() {
  const me = useCurrentUser();
  const nav = useNavigate();
  const applyPatch = useAppStore((s) => s.applyPatch);
  const showToast = useAppStore((s) => s.showToast);
  const [photo, setPhoto] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [replace, setReplace] = useState(false);
  const step = verificationStep(me);
  const alumni = me?.affiliation.type === 'university' && me.affiliation.role === 'alumni';

  const send = async () => {
    setBusy(true); setErr('');
    try {
      const user = await api.verification.submitStudentId(photo);
      applyPatch({ users: [user] });
      showToast(en ? 'Sent — we’ll let you know here.' : '보냈어요 — 확인되면 알려 드릴게요.', 'success');
      nav('/', { replace: true });
    } catch (e) { setErr((e as Error).message); setBusy(false); }
  };

  if (step === 'none' || (step === 'review' && !replace)) {
    return (
      <div className="min-h-full flex flex-col bg-bg">
        <BackHeader />
        {step === 'none'
          ? <EmptyState icon={<BadgeCheck size={30} />} tone="mint" title={en ? 'You’re verified' : '인증됐어요'} sub={en ? 'Nothing to send.' : '보낼 것이 없어요.'} action={{ label: en ? 'Go home' : '홈으로', onClick: () => nav('/', { replace: true }) }} />
          : (
            <EmptyState icon={<Hourglass size={30} />} tone="lav" title={en ? 'We’re checking your photo' : '사진을 확인하고 있어요'}
              sub={en ? 'Usually within a day. We’ll tell you here when it’s done.' : '보통 하루 안에 끝나요. 끝나면 여기서 알려 드릴게요.'}>
              <Btn variant="link" size="sm" onClick={() => setReplace(true)}>{en ? 'Send a clearer photo instead' : '더 선명한 사진으로 바꾸기'}</Btn>
              {!me?.signInEmail && <div className="mt-6 text-left"><SignInEmailCard /></div>}
            </EmptyState>
          )}
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col bg-bg">
      <BackHeader />
      <PageTitle title={en ? (alumni ? 'Your alumni card' : 'Your student ID') : (alumni ? '졸업생 카드' : '학생증')} sub={ID_PRIVACY_LINE} />
      <main className="flex-1 px-4 pb-8 space-y-4">
        {step === 'retake' && me?.verification?.reason && (
          <p role="status" className="text-[14px] text-ink leading-snug"><b className="font-semibold">{en ? 'Last time: ' : '지난번: '}</b>{me.verification.reason}</p>
        )}
        <IdPhotoPicker alumni={alumni} value={photo} onChange={(v) => { setPhoto(v); setErr(''); }} />
        <InfoNote>{en ? 'Usually checked within a day.' : '보통 하루 안에 확인해요.'}</InfoNote>
        <SignInEmailCard />
        {err && <p role="alert" className="text-[13px] text-danger leading-snug">{err}</p>}
      </main>
      <BottomCTA><Btn full size="lg" onClick={send} disabled={!photo || busy} loading={busy}>{en ? 'Send for review' : '확인 요청 보내기'}</Btn></BottomCTA>
    </div>
  );
}
