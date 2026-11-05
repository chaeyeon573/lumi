import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Lock, Mail } from 'lucide-react';
import { lang } from '@core/i18n';
import { api, apiMode } from '@core/api';
import { useAppStore } from '@core/store/useAppStore';
import { BottomCTA, Btn, FormField, TextInput } from '@/components/ha';
import { takeReturnTo } from '@/lib/returnTo';
import { StepTitle } from './steps/shared';

const en = lang === 'en';

/**
 * Sign-in state survives leaving the app to read the code in Mail: iOS may unload the iPhone app's WebView
 * in the background (apps/shell reloads it), which would otherwise drop the typed e-mail and the code field.
 * Kept for the code's lifetime (10 min), cleared on sign-in. (Same key as the old Welcome sheet, so nothing in flight is lost.)
 */
const SIGNIN_KEY = 'lumi.signin.v1';
const SIGNIN_TTL_MS = 10 * 60 * 1000;
function savedSignIn(): { email: string; sent: boolean } | null {
  try {
    const v = JSON.parse(localStorage.getItem(SIGNIN_KEY) ?? 'null') as { email?: unknown; sent?: unknown; at?: unknown } | null;
    if (!v || typeof v.email !== 'string' || typeof v.at !== 'number' || Date.now() - v.at > SIGNIN_TTL_MS) return null;
    return { email: v.email, sent: v.sent === true };
  } catch { return null; }
}
/**
 * A code was sent in the last 10 minutes when the app (re)loaded — Welcome sends the student back to /login once
 * (WebView reload). Cleared when /login opens, so going back to Welcome on purpose stays on Welcome.
 */
let resumeSignIn = !!savedSignIn()?.sent;
export const pendingSignIn = () => resumeSignIn;
const saveSignIn = (v: { email: string; sent: boolean } | null) => { try { if (v) localStorage.setItem(SIGNIN_KEY, JSON.stringify({ ...v, at: Date.now() })); else localStorage.removeItem(SIGNIN_KEY); } catch { /* */ } };

/**
 * S002 Email login (/login) — returning students: school e-mail → code → Sign In (`auth.loginWithCode`).
 * The PDF header says "Lumi · 6 of 6"; signing in is not a step of sign-up, so the header shows just "‹ Lumi".
 */
export function LoginPage() {
  const nav = useNavigate();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const [restored] = useState(() => { resumeSignIn = false; return savedSignIn(); });
  const [email, setEmail] = useState(restored?.email ?? '');
  const [sent, setSent] = useState(!!restored?.sent);
  const [code, setCode] = useState('');
  const [hint, setHint] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<'' | 'send' | 'login'>('');
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const sendCode = async () => {
    setBusy('send'); setErr(''); setHint('');
    try {
      const r = await api.schools.sendVerificationCode(email.trim(), '');
      if (r.ok) { setHint(r.hint); setSent(true); saveSignIn({ email: email.trim(), sent: true }); } else setErr(r.hint);
    } catch (e) { setErr((e as Error).message); } finally { setBusy(''); }
  };

  const signIn = async () => {
    setBusy('login'); setErr('');
    try {
      const user = await api.auth.loginWithCode(email.trim(), code.trim());
      saveSignIn(null);
      await setCurrentUser(user);
      nav(takeReturnTo(), { replace: true });
    } catch (e) { setErr((e as Error).message); setBusy(''); }
  };

  const noAccount = /no account|가입된 계정이 없/i.test(err);
  return (
    <div className="min-h-full flex flex-col bg-bg">
      <header className="h-14 px-2 flex items-center gap-1">
        <button onClick={() => (window.history.length > 1 ? nav(-1) : nav('/welcome', { replace: true }))} aria-label={en ? 'Back' : '뒤로'} className="h-10 w-10 rounded-full grid place-items-center text-ink press"><ChevronLeft size={24} /></button>
        <span className="flex-1 text-[13px] text-ink-3 font-medium">Lumi</span>
      </header>
      <main className="flex-1 px-5 pb-8 animate-fade-in">
        <StepTitle title={en ? 'Email login' : '이메일 로그인'} sub={en ? 'A little more campus. A little more you.' : '캠퍼스를 조금 더, 나를 조금 더.'} />
        <div className="space-y-5">
          <FormField label={en ? 'School email' : '학교 이메일'}>
            <div className="flex gap-2">
              <TextInput className="flex-1 min-w-0" icon={<Mail size={19} />} type="email" inputMode="email" autoComplete="email" autoCapitalize="off" autoCorrect="off" spellCheck={false} autoFocus={!sent}
                placeholder="you@university.edu" value={email} onChange={(e) => { setEmail(e.target.value); setSent(false); setCode(''); setHint(''); setErr(''); saveSignIn(null); }} />
              <Btn variant="outline" size="lg" className="!h-12 px-4" onClick={sendCode} loading={busy === 'send'} disabled={!valid || !!busy}>{sent ? (en ? 'Resend' : '다시 받기') : (en ? 'Send code' : '코드 받기')}</Btn>
            </div>
          </FormField>
          <FormField label={en ? 'Verification code' : '인증 코드'}
            hint={hint || (apiMode === 'mock' ? (en ? 'Demo code: 123456' : '데모 인증 코드: 123456') : sent ? undefined : (en ? 'We’ll email a code to the school address you signed up with.' : '가입할 때 쓴 학교 이메일로 코드를 보내 드려요.'))}>
            {/* one-time-code: iOS offers the code from Mail above the keyboard — no need to leave the app */}
            <TextInput icon={<Lock size={19} />} inputMode="numeric" autoComplete="one-time-code" maxLength={6} disabled={!sent} autoFocus={sent}
              placeholder={en ? 'Enter your code' : '코드 입력'} value={code} onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setErr(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6 && !busy) void signIn(); }} />
          </FormField>
          {err && (
            <p role="alert" className="text-[13px] text-danger leading-snug">
              {err}{noAccount && <> <Link to={apiMode === 'remote' ? '/start/goals' : '/onboarding/basic'} className="text-sel-fg font-semibold">{en ? 'Get started' : '가입하기'}</Link></>}
            </p>
          )}
        </div>
      </main>
      <BottomCTA><Btn full size="lg" onClick={signIn} loading={busy === 'login'} disabled={!sent || code.length !== 6 || !!busy}>{en ? 'Sign In' : '로그인'}</Btn></BottomCTA>
    </div>
  );
}
