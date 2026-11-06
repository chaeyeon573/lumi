import { useState } from 'react';
import { Check, KeyRound, Lock, Mail } from 'lucide-react';
import { lang } from '@core/i18n';
import { api } from '@core/api';
import { useAppStore, useCurrentUser } from '@core/store/useAppStore';
import { BottomSheet } from '@/components/ui';
import { Btn, FormField, InfoNote, RowCard, TextInput } from '@/components/ha';

const en = lang === 'en';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** what a sign-in e-mail is for — said once wherever it can be added */
export const SIGNIN_EMAIL_LINE = en
  ? 'Any email you check — only for signing in on another phone. It doesn’t verify your school.'
  : '자주 보는 아무 이메일 — 다른 폰에서 로그인할 때만 써요. 학교 인증은 아니에요.';

/**
 * E-mail + "Send code" + code. The code goes out on the sign-in path (`schools.sendVerificationCode(email, '')`);
 * the caller confirms it with `auth.addSignInEmail` (now, or right after the account exists on sign-up).
 */
export function SignInEmailFields({ email, code, onEmail, onCode }: { email: string; code: string; onEmail: (v: string) => void; onCode: (v: string) => void }) {
  const [sent, setSent] = useState(false);
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const send = async () => {
    setBusy(true); setHint('');
    try { const r = await api.schools.sendVerificationCode(email.trim(), ''); setHint(r.hint); setSent(r.ok); } catch (e) { setHint((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <FormField label={en ? 'Sign-in email' : '로그인 이메일'} hint={sent ? undefined : SIGNIN_EMAIL_LINE}>
        <div className="flex gap-2">
          <TextInput className="flex-1 min-w-0" icon={<Mail size={18} />} type="email" inputMode="email" autoComplete="email" autoCapitalize="off" autoCorrect="off" spellCheck={false}
            placeholder="you@example.com" value={email} onChange={(e) => { onEmail(e.target.value); setSent(false); onCode(''); setHint(''); }} />
          <Btn variant="outline" size="lg" className="!h-12 px-4" loading={busy} disabled={!EMAIL_RE.test(email.trim())} onClick={send}>{sent ? (en ? 'Resend' : '다시') : (en ? 'Send code' : '코드 받기')}</Btn>
        </div>
      </FormField>
      {sent && (
        <FormField label={en ? 'Code' : '인증 코드'} hint={hint || undefined}>
          <TextInput icon={<Lock size={18} />} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder={en ? 'Enter your code' : '코드 입력'} value={code} onChange={(e) => onCode(e.target.value.replace(/\D/g, '').slice(0, 6))} />
        </FormField>
      )}
      {!sent && hint && <p role="alert" className="text-[13px] text-danger leading-snug">{hint}</p>}
    </div>
  );
}

/** Settings › Account security and /verify-id — student-ID accounts only (they have no school address to sign in with) */
export function SignInEmailCard() {
  const me = useCurrentUser();
  const applyPatch = useAppStore((s) => s.applyPatch);
  const showToast = useAppStore((s) => s.showToast);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (!me?.verification) return null;
  const save = async () => {
    setBusy(true); setErr('');
    try {
      const user = await api.auth.addSignInEmail(email.trim(), code);
      applyPatch({ users: [user] });
      setOpen(false); setEmail(''); setCode('');
      showToast(en ? 'Saved — sign in with this email on any phone.' : '저장했어요 — 어느 폰에서든 이 이메일로 로그인하세요.', 'success');
    } catch (e) { setErr((e as Error).message); } finally { setBusy(false); }
  };
  return (
    <>
      <RowCard tone="lav" icon={<KeyRound size={21} />} title={en ? 'Sign-in email' : '로그인 이메일'}
        sub={me.signInEmail ?? (en ? 'Add one so you can sign back in on a new phone' : '추가하면 폰을 바꿔도 다시 로그인할 수 있어요')}
        right={me.signInEmail ? <Check size={18} className="text-ok shrink-0" /> : undefined}
        onClick={() => setOpen(true)} />
      <BottomSheet open={open} onClose={() => setOpen(false)} title={me.signInEmail ? (en ? 'Change sign-in email' : '로그인 이메일 바꾸기') : (en ? 'Add a sign-in email' : '로그인 이메일 추가')}>
        <div className="space-y-4 pb-2">
          <SignInEmailFields email={email} code={code} onEmail={setEmail} onCode={setCode} />
          {me.signInEmail && <InfoNote>{en ? `${me.signInEmail} will stop working for sign-in.` : `${me.signInEmail} 로는 더 이상 로그인할 수 없어요.`}</InfoNote>}
          {err && <p role="alert" className="text-[13px] text-danger leading-snug">{err}</p>}
          <Btn full size="lg" loading={busy} disabled={code.length !== 6} onClick={save}>{en ? 'Save' : '저장'}</Btn>
        </div>
      </BottomSheet>
    </>
  );
}
