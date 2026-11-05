import { useEffect, useRef, useState } from 'react';
import { t } from '@core/i18n';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, BottomSheet, Field, Input } from '@/components/ui';
import { useAppStore } from '@core/store/useAppStore';
import { api, apiMode } from '@core/api';
import type { Highlights } from '@core/api/types';
import { takeReturnTo } from '@/lib/returnTo';
import { todayISO } from '@core/lib/format';

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

  // 첫 화면 카드 — 실제 이번 주 데이터 (데모 링크로 들어온 학교, 기본은 Berkeley)
  const [hl, setHl] = useState<Highlights | null>(null);
  useEffect(() => { api.schools.highlights(params.get('demo') === 'ucmerced' ? 's_ucmerced' : 's_berkeley').then(setHl).catch(() => setHl(null)); }, [params]);
  const day = (iso?: string) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase() : '');
  const time = (hhmm?: string) => { if (!hhmm) return ''; const [h, m] = hhmm.split(':').map(Number); return `${((h + 11) % 12) + 1}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'AM' : 'PM'}`; };
  const daysLeft = hl?.deadline ? Math.max(0, Math.round((Date.parse(`${hl.deadline.deadline}T12:00:00`) - Date.parse(`${todayISO()}T12:00:00`)) / 86400000)) : 0;
  const school = hl?.schoolShort ?? 'Cal';
  const v2 = true;
  const band = `👋 WHO'S FREE NOW ✦ 🍕 FREE FOOD ✦ ⏰ DEADLINES ✦ 🎸 ${hl ? hl.clubs.toLocaleString('en-US') : '1,500+'} CLUBS ✦ 💼 ${hl?.internships ?? 300} INTERNSHIPS ✦ `;

  return (
    <div className={`min-h-full flex flex-col relative overflow-hidden ${v2 ? 'bg-[#08070C]' : 'bg-[#0C0A14]'} text-[#F4F1FF]`}>
      {v2 ? <>
      {/* Lumi v2 "z1" — 핑크 글로우, 라임 띠, 카드 순서: 지금 시간 되는 사람(핑크) → 무료 음식(어두움) → 마감(종이). 사람이 먼저 — 같이 할 사람을 찾는 앱 */}
      <div className="pointer-events-none absolute -top-56 -left-48 h-[600px] w-[600px] rounded-full bg-[#FF3DA8] opacity-40 blur-[90px]" />
      <div className="pointer-events-none absolute top-[420px] -right-64 h-[420px] w-[420px] rounded-full bg-[#D4FF3A] opacity-[.14] blur-[80px]" />

      <div className="relative px-6 pt-12 flex items-center">
        <span className="font-['Unbounded'] font-extrabold text-[26px] tracking-tight">lumi<span className="text-[#FF3DA8]">.</span></span>
      </div>

      <div className="relative mt-5 -mx-5 -rotate-3 bg-[#D4FF3A] text-[#0C0A14] py-2 overflow-hidden whitespace-nowrap">
        <div className="inline-block animate-[marquee_22s_linear_infinite] font-['Unbounded'] font-extrabold text-[13px] tracking-wide">{band.repeat(4)}</div>
      </div>

      <h1 className="relative font-['Unbounded'] font-extrabold text-[38px] leading-[1.05] px-6 pt-7">Who's free<br />on <span className="text-[#D4FF3A]">campus</span><br />right now?</h1>

      <div className="relative h-[306px] mt-6 mx-7">
        <div className="absolute inset-x-0 top-0 rounded-[26px] bg-[#FF3DA8] text-white px-5 py-4 -rotate-[4deg] shadow-[0_18px_40px_-12px_rgba(255,61,168,.55)]">
          <div className="text-[11px] font-extrabold tracking-[1.2px] uppercase opacity-80">👋 Free between classes</div>
          <div className="font-['Unbounded'] font-semibold text-[17px] leading-tight mt-1.5 truncate">Find someone for lunch</div>
          <div className="text-[12.5px] opacity-90 mt-1.5">Add your timetable · see who's free</div>
        </div>
        <div className="absolute inset-x-0 top-[100px] rounded-[26px] bg-[#16131F] border border-[#2A2433] px-5 py-4 rotate-[2deg]">
          <div className="text-[11px] font-extrabold tracking-[1.2px] uppercase opacity-65">🍕 Free food{hl?.food ? ` · ${day(hl.food.date)} ${time(hl.food.startTime)}` : ''}</div>
          <div className="font-['Unbounded'] font-semibold text-[17px] leading-tight mt-1.5 truncate">{hl?.food?.title ?? (hl ? `${hl.freeFoodThisWeek} free food events this week` : 'Free food near you')}</div>
          <div className="text-[12.5px] opacity-70 mt-1.5 truncate">{hl?.food?.place ? `${hl.food.place} · ` : ''}{hl ? `${hl.freeFoodThisWeek} this week` : 'updated daily'}</div>
        </div>
        <div className="absolute inset-x-0 top-[200px] rounded-[26px] bg-[#F4F1FF] text-[#0C0A14] px-5 py-4 -rotate-[2deg]">
          <div className="text-[11px] font-extrabold tracking-[1.2px] uppercase opacity-65">🔥 {hl?.deadline ? (daysLeft === 0 ? 'Closes today' : `Closes in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`) : 'Deadlines'}</div>
          <div className="font-['Unbounded'] font-semibold text-[17px] leading-tight mt-1.5 truncate">{hl?.deadline?.title ?? 'Scholarships, fellowships & internships'}</div>
          <div className="text-[12.5px] opacity-70 mt-1.5 truncate">{hl?.deadline ? `${new Date(`${hl.deadline.deadline}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · tap to save` : 'never miss one'}</div>
        </div>
      </div>
      </> : <>
      <div className="pointer-events-none absolute -top-32 -left-36 h-[420px] w-[420px] rounded-full bg-[#7B3FF2] opacity-50 blur-[80px]" />
      <div className="pointer-events-none absolute top-[360px] -right-64 h-[420px] w-[420px] rounded-full bg-[#D4FF3A] opacity-25 blur-[80px]" />

      <div className="relative px-6 pt-12 flex items-center">
        <span className="font-['Unbounded'] font-extrabold text-[26px] tracking-tight">AroundU</span>
      </div>

      <div className="relative mt-5 -mx-5 -rotate-3 bg-[#D4FF3A] text-[#0C0A14] py-2 overflow-hidden whitespace-nowrap">
        <div className="inline-block animate-[marquee_22s_linear_infinite] font-['Unbounded'] font-extrabold text-[13px] tracking-wide">{band.repeat(4)}</div>
      </div>

      <h1 className="relative font-['Unbounded'] font-extrabold text-[38px] leading-[1.05] px-6 pt-7">Who's free<br />at <span className="text-[#D4FF3A]">{school}</span><br />right now?</h1>

      <div className="relative h-[306px] mt-6 mx-7">
        <div className="absolute inset-x-0 top-0 rounded-[26px] bg-[#F4F1FF] text-[#0C0A14] px-5 py-4 -rotate-[4deg]">
          <div className="text-[11px] font-extrabold tracking-[1.2px] uppercase opacity-65">👋 Free between classes</div>
          <div className="font-['Unbounded'] font-semibold text-[17px] leading-tight mt-1.5 truncate">Find someone for lunch</div>
          <div className="text-[12.5px] opacity-70 mt-1.5">Add your timetable · see who's free</div>
        </div>
        <div className="absolute inset-x-0 top-[100px] rounded-[26px] bg-[#1E1830] border border-[#2E2648] px-5 py-4 rotate-[3deg]">
          <div className="text-[11px] font-extrabold tracking-[1.2px] uppercase opacity-65">🍕 Free food{hl?.food ? ` · ${day(hl.food.date)} ${time(hl.food.startTime)}` : ''}</div>
          <div className="font-['Unbounded'] font-semibold text-[17px] leading-tight mt-1.5 truncate">{hl?.food?.title ?? (hl ? `${hl.freeFoodThisWeek} free food events this week` : 'Free food near you')}</div>
          <div className="text-[12.5px] opacity-70 mt-1.5 truncate">{hl?.food?.place ? `${hl.food.place} · ` : ''}{hl ? `${hl.freeFoodThisWeek} this week` : 'updated daily'}</div>
        </div>
        <div className="absolute inset-x-0 top-[200px] rounded-[26px] bg-[#D4FF3A] text-[#0C0A14] px-5 py-4 -rotate-[2deg]">
          <div className="text-[11px] font-extrabold tracking-[1.2px] uppercase opacity-65">🔥 {hl?.deadline ? (daysLeft === 0 ? 'Closes today' : `Closes in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`) : 'Deadlines'}</div>
          <div className="font-['Unbounded'] font-semibold text-[17px] leading-tight mt-1.5 truncate">{hl?.deadline?.title ?? 'Scholarships, fellowships & internships'}</div>
          <div className="text-[12.5px] opacity-70 mt-1.5 truncate">{hl?.deadline ? `${new Date(`${hl.deadline.deadline}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · tap to save` : 'never miss one'}</div>
        </div>
      </div>

      </>}

      <div className="relative mt-auto px-5 pb-10 pt-6 safe-bottom">
        <button onClick={() => nav(apiMode === 'remote' ? '/start' : '/onboarding/basic')} className="w-full h-[58px] rounded-full bg-[#D4FF3A] text-[#0C0A14] font-['Unbounded'] font-extrabold text-[17px] press">Get in →</button>
        <p className="text-center text-[14px] text-[#A79FC4] mt-4">Have an account? <button onClick={() => setEmailOpen(true)} className="font-bold text-[#F4F1FF]">Sign in</button></p>
        {apiMode !== 'remote' && <button onClick={() => login()} className="block mx-auto mt-2 text-[12px] text-[#A79FC4] underline">{t('로그인 (데모 계정)')}</button>}
        <p className="text-center text-[12px] text-[#A79FC4] mt-4">By continuing you agree to the <Link to="/terms" className="underline text-[#F4F1FF]">Terms of Use</Link> and <Link to="/privacy" className="underline text-[#F4F1FF]">Privacy Policy</Link>.</p>
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
