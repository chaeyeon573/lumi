import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Btn, InfoNote } from '@/components/ha';
import { SignInEmailFields } from '@/components/settings/SignInEmailCard';
import { ID_PRIVACY_LINE, IdPhotoPicker, idWhat } from '@/components/verify/StudentId';
import { NameBirthFields, nameBirthOk } from './AboutStep';
import { StepFrame, en, type StepProps } from './shared';

/**
 * S011b Verify with your student ID — reached from S011 "Can't use your school email?" (/start/student-id).
 * Owner 2026-11-06: e-mail first; if that doesn't work, a photo of the student ID (alumni: alumni card or diploma).
 * Send for review creates the account without an e-mail (the server starts it as pending — server/idverify.ts) and
 * sends the photo. Name and birth year come from S011; they're asked here only when still missing.
 */
export function StudentIdStep({ d, patch, finish }: Pick<StepProps, 'd' | 'patch'> & { finish: (idPhoto: string, signIn?: { email: string; code: string }) => Promise<void> }) {
  const [photo, setPhoto] = useState('');
  // optional: an e-mail just for signing in on another phone (server/signin-email.ts) — confirmed right after the account exists
  const [withEmail, setWithEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const alumni = d.role === 'alumni';
  // asked once at mount: fields that were already fine on S011 stay out of the way while the student fixes nothing
  const [askBasics] = useState(() => !nameBirthOk(d));
  const ready = !!photo && nameBirthOk(d) && (!withEmail || !email.trim() || code.length === 6);

  const send = async () => {
    setBusy(true); setErr('');
    try { await finish(photo, withEmail && email.trim() && code.length === 6 ? { email: email.trim(), code } : undefined); } catch (e) { setErr((e as Error).message); setBusy(false); }
  };

  return (
    <StepFrame title={en ? (alumni ? 'Use your alumni card' : 'Use your student ID') : (alumni ? '졸업생 카드로 인증' : '학생증으로 인증')}
      sub={ID_PRIVACY_LINE}
      cta={{ label: en ? 'Send for review' : '확인 요청 보내기', onClick: send, disabled: !ready || busy, loading: busy }}
      note={<p className="text-center text-[11.5px] text-ink-3 leading-snug">{en ? 'By starting Lumi you confirm you’re 16 or older and agree to the ' : 'Lumi를 시작하면 만 16세 이상이며 다음에 동의하는 것으로 봐요: '}<Link to="/terms" className="text-sel-fg font-semibold">{en ? 'Terms' : '이용약관'}</Link>{en ? ' and ' : ', '}<Link to="/privacy" className="text-sel-fg font-semibold">{en ? 'Privacy Policy' : '개인정보처리방침'}</Link>.</p>}>
      <div className="space-y-5">
        {askBasics && <NameBirthFields d={d} patch={patch} />}
        <IdPhotoPicker alumni={alumni} value={photo} onChange={(v) => { setPhoto(v); setErr(''); }} />
        {withEmail
          ? <SignInEmailFields email={email} code={code} onEmail={setEmail} onCode={setCode} />
          : <Btn variant="link" size="sm" className="!px-0" onClick={() => setWithEmail(true)}>{en ? 'Add an email for signing in · optional' : '로그인용 이메일 추가 · 선택'}</Btn>}
        <InfoNote>{en ? `Usually checked within a day. Until then you can look around, but people won’t see you yet.` : `보통 하루 안에 확인해요. 그동안 둘러볼 수는 있지만 다른 사람에게는 아직 안 보여요.`}</InfoNote>
        {err && <p role="alert" className="text-[13px] text-danger leading-snug">{err}</p>}
      </div>
    </StepFrame>
  );
}

/** for the alumni hint on S008 */
export const alumniIdHint = en ? `No school email anymore? You can verify with your ${idWhat(true)} instead.` : `학교 이메일이 없어도 ${idWhat(true)}으로 인증할 수 있어요.`;
