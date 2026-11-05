import { useEffect, useRef, useState } from 'react';
import { t, lang, setLang } from '@core/i18n';
import { CalendarDays, Coffee, Users } from 'lucide-react';
import { Btn, Wordmark, TONE } from '@/components/ha';
import { cn } from '@core/lib/cn';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, BottomSheet, Field, Input } from '@/components/ui';
import { useAppStore } from '@core/store/useAppStore';
import { api, apiMode } from '@core/api';
import { takeReturnTo } from '@/lib/returnTo';

/**
 * Sign-in sheet state survives leaving the app to read the code in Mail: iOS may unload the iPhone app's WebView
 * in the background (apps/shell reloads it), which would otherwise drop the typed e-mail and the code field.
 * Kept for the code's lifetime (10 min), cleared on sign-in.
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
const saveSignIn = (v: { email: string; sent: boolean } | null) => { try { if (v) localStorage.setItem(SIGNIN_KEY, JSON.stringify({ ...v, at: Date.now() })); else localStorage.removeItem(SIGNIN_KEY); } catch { /* */ } };

export function WelcomePage() {
  const nav = useNavigate();
  const setCurrentUser = useAppStore((s) => s.setCurrentUser);
  const showToast = useAppStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);
  const [restored] = useState(savedSignIn);
  const [emailOpen, setEmailOpen] = useState(!!restored?.sent);
  const [email, setEmail] = useState(restored?.email ?? '');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(!!restored?.sent);
  const [hint, setHint] = useState('');

  const login = async (schoolId?: string) => {
    setBusy(true);
    try {
      const user = await api.auth.loginDemo(schoolId);
      await setCurrentUser(user);
      nav(takeReturnTo(), { replace: true });
    } catch (e) { showToast((e as Error).message, 'error'); setBusy(false); }
  };

  // 친구에게 보내는 링크: /welcome?demo=berkeley | ucmerced → 그 학교 데모 계정으로 바로 들어간다
  const [params] = useSearchParams();
  const autoDemo = useRef(false);
  useEffect(() => {
    const d = params.get('demo');
    if (autoDemo.current || !d) return;
    autoDemo.current = true;
    void login(d === 'ucmerced' || d === 'merced' ? 's_ucmerced' : 's_berkeley');
  }, [params]); // eslint-disable-line react-hooks/exhaustive-deps

  const sendCode = async () => {
    setBusy(true);
    try {
      const r = await api.schools.sendVerificationCode(email.trim(), '');
      setHint(r.hint);
      if (r.ok) { setSent(true); saveSignIn({ email: email.trim(), sent: true }); } else showToast(r.hint, 'error');
    } catch (e) { showToast((e as Error).message, 'error'); } finally { setBusy(false); }
  };

  const loginWithCode = async () => {
    setBusy(true);
    try {
      const user = await api.auth.loginWithCode(email.trim(), code.trim());
      saveSignIn(null);
      await setCurrentUser(user);
      nav(takeReturnTo(), { replace: true });
    } catch (e) { showToast((e as Error).message, 'error'); setBusy(false); }
  };

  // /login (S002) → 이메일 시트를 바로 연다
  useEffect(() => { if (params.get('signin') === '1') setEmailOpen(true); }, [params]);
  const start = () => nav(apiMode === 'remote' ? '/start' : '/onboarding/basic');

  /* S001 Welcome (PDF p.4) — 말 한 줄 + 떠 있는 칩 세 개 + Get Started / Sign In */
  return (
    <div className="min-h-full flex flex-col bg-bg px-6">
      <div className="h-14 flex items-center justify-end">
        <button onClick={() => setLang(lang === 'en' ? 'ko' : 'en')} className="text-[13px] text-ink-2 font-medium press">{lang === 'en' ? 'English' : '한국어'}</button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center text-center pt-6">
        <Wordmark size={52} dot />
        <h1 className="mt-8 text-[30px] font-extrabold leading-[1.15] tracking-[-0.03em]">{lang === 'en' ? <>Your college life,<br />all in one place.</> : <>대학 생활을<br />한곳에서.</>}</h1>
        <p className="mt-4 text-[15px] text-ink-2 leading-relaxed">{lang === 'en' ? <>Discover your campus.<br />Make a plan. Find your people.</> : <>캠퍼스를 알아가고,<br />약속을 잡고, 나의 사람들을 찾아요.</>}</p>
        {/* PDF 의 떠 있는 칩 세 개 — 앱이 하는 일(주간 일정 · 좋은 만남 · 커뮤니티) */}
        <div className="relative w-full max-w-[320px] h-[190px] mt-8" aria-hidden>
          <span className={cn('absolute left-2 top-2 -rotate-[4deg] h-12 px-4 rounded-2xl flex items-center gap-2 text-[14px] font-semibold border border-line', TONE.ice)}><CalendarDays size={18} />{lang === 'en' ? 'Your week' : '나의 한 주'}</span>
          <span className={cn('absolute right-0 top-[56px] rotate-[5deg] h-12 px-4 rounded-2xl flex items-center gap-2 text-[14px] font-semibold border border-line', TONE.peach)}><Coffee size={18} />{lang === 'en' ? 'Good company' : '좋은 사람들'}</span>
          <span className={cn('absolute left-6 top-[122px] -rotate-[2deg] h-12 px-4 rounded-2xl flex items-center gap-2 text-[14px] font-semibold border border-line', TONE.rose)}><Users size={18} />{lang === 'en' ? 'Your communities' : '나의 커뮤니티'}</span>
        </div>
      </div>
      <div className="pb-8 pt-4 safe-bottom">
        <Btn full size="lg" onClick={start} disabled={busy}>{lang === 'en' ? 'Get Started' : '시작하기'}</Btn>
        <button onClick={() => setEmailOpen(true)} className="block mx-auto mt-4 h-10 px-4 text-[15px] font-semibold text-sel-fg press">{lang === 'en' ? 'Sign In' : '로그인'}</button>
        {apiMode !== 'remote' && <button onClick={() => login()} className="block mx-auto text-[12px] text-ink-3 underline">{t('로그인 (데모 계정)')}</button>}
        <p className="text-center text-[12px] text-ink-3 mt-3"><Link to="/terms" className="press">Terms</Link> · <Link to="/privacy" className="press">Privacy</Link></p>
      </div>

      <BottomSheet open={emailOpen} onClose={() => setEmailOpen(false)} title={t('이메일로 로그인')}>
        <div className="space-y-4">
          <Field label={t('학교 이메일')} hint={hint || t('가입할 때 쓴 학교 이메일로 코드를 보내드려요.')}>
            <div className="flex gap-2">
              <Input type="email" inputMode="email" autoComplete="email" autoCapitalize="off" autoCorrect="off" spellCheck={false} autoFocus={!sent} placeholder="you@school.edu" value={email} onChange={(e) => { setEmail(e.target.value); setSent(false); saveSignIn(null); }} />
              <Button variant="secondary" onClick={sendCode} loading={busy} disabled={!email.includes('@')}>{t('코드 받기')}</Button>
            </div>
          </Field>
          {sent && (
            <Field label={t('인증 코드')} hint={apiMode === 'mock' ? t('데모 인증 코드: 123456') : undefined}>
              {/* one-time-code: iOS offers the code from Mail/Messages above the keyboard — no need to leave the app */}
              <Input inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} onKeyDown={(e) => { if (e.key === 'Enter' && code.length === 6 && !busy) void loginWithCode(); }} />
            </Field>
          )}
          <Button full size="lg" onClick={loginWithCode} loading={busy} disabled={!sent || code.length !== 6}>{t('로그인')}</Button>
        </div>
      </BottomSheet>
    </div>
  );
}
